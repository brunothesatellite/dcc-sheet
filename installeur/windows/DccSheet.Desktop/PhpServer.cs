using System.Diagnostics;
using System.Text;

namespace DccSheet;

public enum StartOutcome
{
    Started,          // PHP lancé et le serveur répond
    AlreadyRunning,   // un serveur répond déjà sur /dcc-sheet (instance précédente)
    PortBusy,         // le port 8089 est pris par un autre programme
    MissingPhp,       // php.exe absent
    Failed,           // PHP a planté ou n'a pas répondu à temps
}

public readonly record struct StartResult(StartOutcome Outcome, string Error = "");

/// <summary>
/// Gère le serveur PHP embarqué : php.exe -S 127.0.0.1:8089 -t public
/// (working directory = racine de l'application, donc chemins relatifs,
/// compatible version portable).
/// </summary>
public sealed class PhpServer : IDisposable
{
    public const int Port = 8089;
    // Slash final OBLIGATOIRE : php -S sert l'index d'un dossier en 200 sans
    // redirection, donc « /dcc-sheet » (sans slash) chargerait index.html avec
    // une URL de base « / » -> toutes les references relatives (style.css,
    // *.js, favicon.svg) resoudraient a la racine du docroot et renverraient 404.
    public const string AppUrl = "http://127.0.0.1:8089/dcc-sheet/";

    private static readonly TimeSpan StartupTimeout = TimeSpan.FromSeconds(20);

    private readonly string _root;
    private readonly string _phpDir;
    private readonly string _publicDir;
    private readonly string _logFile;
    private readonly List<string> _tail = new();
    private readonly object _gate = new();
    private Process? _process;

    public PhpServer(string root)
    {
        _root = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        _phpDir = Path.Combine(_root, "php");
        _publicDir = Path.Combine(_root, "public");
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        _logFile = Path.Combine(local, "DCCSheet", "php.log");
    }

    public string LogFile => _logFile;
    public string Root => _root;
    public bool IsRunning
    {
        get { lock (_gate) { return _process is { HasExited: false }; } }
    }

    // ---------------------------------------------------------------- contrôles

    /// <summary>
    /// data\ doit être inscriptible : dans la version portable, le zip peut avoir
    /// été extrait dans un dossier en lecture seule (Program Files, clé USB…).
    /// Mieux vaut un message clair qu'un échec SQLite obscur.
    /// </summary>
    public static bool IsDataWritable(string root, out string detail)
    {
        var dataDir = Path.Combine(root.TrimEnd(Path.DirectorySeparatorChar), "public", "dcc-sheet", "data");
        try
        {
            Directory.CreateDirectory(dataDir);
            var probe = Path.Combine(dataDir, ".write-probe");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            detail = "";
            return true;
        }
        catch (Exception ex)
        {
            detail = dataDir + "\n\n" + ex.Message;
            return false;
        }
    }

    /// <summary>PHP x64 (VC19) réclame le Visual C++ Redistributable.</summary>
    public static bool VCRedistMissing()
    {
        var sys = Environment.GetFolderPath(Environment.SpecialFolder.System);
        return !File.Exists(Path.Combine(sys, "msvcp140.dll"))
            || !File.Exists(Path.Combine(sys, "vcruntime140.dll"))
            || !File.Exists(Path.Combine(sys, "vcruntime140_1.dll"));
    }

    // -------------------------------------------------------------- démarrage

    public async Task<StartResult> StartAsync(CancellationToken ct = default)
    {
        var phpExe = Path.Combine(_phpDir, "php.exe");
        if (!File.Exists(phpExe))
            return new StartResult(StartOutcome.MissingPhp, "php.exe introuvable :\n" + phpExe);

        // Le port répond-il déjà ?
        switch (await ProbeAsync(ct))
        {
            case Probe.App:
                return new StartResult(StartOutcome.AlreadyRunning);
            case Probe.Foreign:
                return new StartResult(StartOutcome.PortBusy,
                    $"Le port {Port} est utilisé par un autre programme.\n\n" +
                    "Fermez ce programme ou changez son port, puis relancez DCC Sheet.");
        }

        var psi = new ProcessStartInfo
        {
            FileName = phpExe,
            // Commande du cahier des charges, inchangée : le working directory
            // (racine de l'app) rend « -t public » correct quel que soit le dossier.
            Arguments = $"-S 127.0.0.1:{Port} -t public",
            WorkingDirectory = _root,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        // PHPRC : php.ini livré avec l'application (extensions gd, zip, sqlite3…)
        psi.Environment["PHPRC"] = _phpDir;

        Directory.CreateDirectory(Path.GetDirectoryName(_logFile)!);
        try
        {
            _process = Process.Start(psi);
        }
        catch (Exception ex)
        {
            return new StartResult(StartOutcome.Failed,
                "Impossible de démarrer php.exe.\n\n" + ex.Message +
                (VCRedistMissing() ? "\n\nVisual C++ Redistributable manquant (msvcp140.dll)." : ""));
        }

        if (_process is null)
            return new StartResult(StartOutcome.Failed, "Impossible de démarrer php.exe.");

        _process.OutputDataReceived += (_, e) => Log(e.Data);
        _process.ErrorDataReceived += (_, e) => Log(e.Data);
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();

        if (!await WaitUntilReadyAsync(ct))
        {
            var reason = IsAlive ? "" : LogTail();
            Stop();
            return new StartResult(StartOutcome.Failed,
                "Le serveur PHP n'a pas répondu dans les " + (int)StartupTimeout.TotalSeconds + " secondes." +
                (string.IsNullOrWhiteSpace(reason) ? "" : "\n\n" + reason));
        }

        return new StartResult(StartOutcome.Started);
    }

    /// <summary>Attend que /dcc-sheet réponde (200 ms entre deux essais, 20 s max).</summary>
    public async Task<bool> WaitUntilReadyAsync(CancellationToken ct = default)
    {
        using var http = NewClient();
        var sw = Stopwatch.StartNew();
        while (sw.Elapsed < StartupTimeout)
        {
            ct.ThrowIfCancellationRequested();
            if (!IsAlive && !await IsAppServingAsync(http, ct)) return false;   // PHP a plante
            try
            {
                using var resp = await http.GetAsync(AppUrl, HttpCompletionOption.ResponseHeadersRead, ct);
                if ((int)resp.StatusCode < 500) return true;
            }
            catch (OperationCanceledException) { /* timeout de l'essai */ }
            catch (HttpRequestException) { /* pas encore pret */ }
            await Task.Delay(200, ct);
        }
        return false;
    }

    // ------------------------------------------------------------------ arrêt

    /// <summary>Arrête PHP (arbre de processus). Idempotent : appelable plusieurs fois.</summary>
    public void Stop()
    {
        Process? p;
        lock (_gate)
        {
            p = _process;
            _process = null;
        }
        if (p is null) return;
        try
        {
            if (!p.HasExited)
            {
                p.Kill(entireProcessTree: true);
                p.WaitForExit(2000);
            }
        }
        catch { /* déjà mort */ }
        finally
        {
            p.Dispose();
        }
        Log("-- php arrêté --");
    }

    public void Dispose() => Stop();

    // ----------------------------------------------------------------- internes

    private bool IsAlive
    {
        get { lock (_gate) { return _process is { HasExited: false }; } }
    }

    private static HttpClient NewClient()
        => new(new HttpClientHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(2) };

    private enum Probe { Free, App, Foreign }

    /// <summary>Port libre, occupé par notre app, ou occupé par un autre programme ?</summary>
    private async Task<Probe> ProbeAsync(CancellationToken ct)
    {
        try
        {
            using var http = NewClient();
            using var resp = await http.GetAsync(AppUrl, HttpCompletionOption.ResponseHeadersRead, ct);
            return resp.StatusCode == System.Net.HttpStatusCode.NotFound ? Probe.Foreign : Probe.App;
        }
        catch (HttpRequestException) { return Probe.Free; }        // connexion refusée
        catch (OperationCanceledException) { return Probe.Free; }  // rien qui réponde
    }

    private static async Task<bool> IsAppServingAsync(HttpClient http, CancellationToken ct)
    {
        try
        {
            using var resp = await http.GetAsync(AppUrl, HttpCompletionOption.ResponseHeadersRead, ct);
            return (int)resp.StatusCode < 500;
        }
        catch { return false; }
    }

    private void Log(string? line)
    {
        if (string.IsNullOrEmpty(line)) return;
        lock (_gate)
        {
            _tail.Add(line);
            if (_tail.Count > 60) _tail.RemoveAt(0);
            try { File.AppendAllText(_logFile, line + Environment.NewLine); } catch { /* journalisation best effort */ }
        }
    }

    public string LogTail()
    {
        lock (_gate)
        {
            return _tail.Count == 0
                ? "(aucune sortie PHP)"
                : string.Join(Environment.NewLine, _tail.TakeLast(15));
        }
    }
}
