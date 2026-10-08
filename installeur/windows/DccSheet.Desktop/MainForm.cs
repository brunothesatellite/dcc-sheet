using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace DccSheet;

/// <summary>
/// Fenêtre principale : écran d'attente → démarrage de PHP → WebView2 sur
/// http://127.0.0.1:8089/dcc-sheet/ (slash final : voir PhpServer.AppUrl).
/// Fermeture = arrêt de PHP.
/// </summary>
public partial class MainForm : Form
{
    private readonly string _root = AppContext.BaseDirectory;
    private readonly Label _status;
    private readonly Label _hint;
    private PhpServer? _server;
    private WebView2? _web;

    public MainForm()
    {
        Text = "DCC Sheet";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1280, 800);
        MinimumSize = new Size(900, 600);
        BackColor = Color.FromArgb(26, 26, 46);          // #1a1a2e (favicon)

        try
        {
            var exe = Environment.ProcessPath;
            if (exe is not null) Icon = Icon.ExtractAssociatedIcon(exe) ?? Icon;
        }
        catch { /* icône par défaut */ }

        _status = new Label
        {
            Dock = DockStyle.Top,
            Height = 120,
            Text = "Démarrage de DCC Sheet…",
            ForeColor = Color.FromArgb(242, 189, 61),     // #f2bd3d
            Font = new Font("Segoe UI", 16F, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleCenter,
            BackColor = Color.FromArgb(26, 26, 46),
        };
        _hint = new Label
        {
            Dock = DockStyle.Fill,
            Text = "",
            ForeColor = Color.Gainsboro,
            Font = new Font("Segoe UI", 10F),
            TextAlign = ContentAlignment.MiddleCenter,
            BackColor = Color.FromArgb(26, 26, 46),
        };
        Controls.Add(_hint);
        Controls.Add(_status);

        Load += MainForm_Load;
        FormClosing += (_, _) => StopServer();
    }

    /// <summary>Arrête PHP — appelée par la fermeture et par les hooks de fin de processus.</summary>
    public void StopServer() => _server?.Stop();

    // ------------------------------------------------------------------ démarrage

    private async void MainForm_Load(object? sender, EventArgs e)
    {
        try
        {
            // 1. Contrôle d'écriture des données (zip extrait en lecture seule…)
            if (!PhpServer.IsDataWritable(_root, out var werr))
            {
                Fatal("Dossier en lecture seule",
                    "Le dossier de l'application n'accepte pas l'écriture :\n" + werr +
                    "\n\nDéplacez le dossier dans un emplacement inscriptible " +
                    "(Bureau, Documents…) ou réinstallez l'application.");
                return;
            }

            // 2. WebView2 (fail fast avant de lancer PHP)
            if (!await EnsureWebView2Async()) return;

            // 3. Serveur PHP
            _server = new PhpServer(_root);
            _status.Text = "Démarrage du serveur PHP…";
            _hint.Text = "http://127.0.0.1:8089/dcc-sheet/";

            var result = await _server.StartAsync();
            switch (result.Outcome)
            {
                case StartOutcome.PortBusy:
                case StartOutcome.MissingPhp:
                case StartOutcome.Failed:
                    Fatal("Démarrage impossible", result.Error + "\n\nJournal : " + _server.LogFile);
                    return;
            }

            // 4. WebView2 + navigation
            _status.Text = "Chargement de l'application…";
            await OpenAppAsync();
        }
        catch (Exception ex)
        {
            Fatal("Erreur de démarrage", ex.ToString());
        }
    }

    private async Task<bool> EnsureWebView2Async()
    {
        try
        {
            var version = CoreWebView2Environment.GetAvailableBrowserVersionString(null);
            if (!string.IsNullOrEmpty(version)) return true;
        }
        catch { /* considéré comme absent */ }

        var answer = MessageBox.Show(
            "Le composant Microsoft WebView2 n'est pas installé sur ce PC.\n\n" +
            "C'est le navigateur embarqué de l'application (gratuit, ~2 Mo, " +
            "nécessite une connexion Internet pour l'installation).\n\n" +
            "L'installer maintenant ?",
            "WebView2 requis", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

        if (answer == DialogResult.Yes)
        {
            try
            {
                Process.Start(new ProcessStartInfo(
                    "https://developer.microsoft.com/fr-fr/microsoft-edge/webview2/")
                { UseShellExecute = true });
            }
            catch { /* navigateur par défaut indisponible */ }
        }

        Fatal("WebView2 requis",
            "L'application ne peut pas s'ouvrir sans WebView2.\n\n" +
            "Installez le composant puis relancez DCC Sheet :\n" +
            "https://developer.microsoft.com/microsoft-edge/webview2/");
        return false;
    }

    private async Task OpenAppAsync()
    {
        _web = new WebView2 { Dock = DockStyle.Fill, Visible = false };
        Controls.Add(_web);
        _web.BringToFront();

        try
        {
            // Données du navigateur hors du dossier de l'app (portable = déplaçable)
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "DCCSheet", "WebView2");
            var env = await CoreWebView2Environment.CreateAsync(null, userData);
            await _web.EnsureCoreWebView2Async(env);

            var core = _web.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;   // F5, Ctrl+F, etc.

            core.NavigationCompleted += (_, args) =>
            {
                if (args.IsSuccess)
                {
                    // Retirer l'ecran d'attente : docked en haut (120 px), il resterait
                    // visible comme un enorme bandeau au-dessus de la page.
                    Controls.Remove(_status);
                    Controls.Remove(_hint);
                    _status.Text = "";
                    _hint.Text = "";
                    _web!.Visible = true;   // le Fill s'etend alors sur toute la fenetre
                    _web.Focus();
                }
                else
                {
                    _status.Text = "Chargement impossible";
                    _hint.Text = $"Le serveur répond mais la page n'a pas pu être chargée " +
                                 $"(status {args.WebErrorStatus}).\nRelancez l'application.";
                }
            };

            core.Navigate(PhpServer.AppUrl);
        }
        catch (Exception ex)
        {
            _status.Text = "WebView2 indisponible";
            _hint.Text = ex.Message;
        }
    }

    private void Fatal(string title, string message)
    {
        MessageBox.Show(message, "DCC Sheet — " + title, MessageBoxButtons.OK, MessageBoxIcon.Error);
        Close();
    }
}
