using System.Threading;

namespace DccSheet;

internal static class Program
{
    private static Mutex? _mutex;

    /// <summary>
    /// Instance unique : une deuxième ouverture (même depuis un autre dossier,
    /// version portable) ne doit pas tenter de relancer PHP sur le port 8089.
    /// </summary>
    [STAThread]
    private static void Main()
    {
        _mutex = new Mutex(initiallyOwned: true, name: @"Local\DccSheet.SingleInstance", out bool createdNew);
        if (!createdNew)
        {
            MessageBox.Show(
                "DCC Sheet est déjà ouvert (serveur local sur le port 8089).\n\n" +
                "Fermez la fenêtre en cours avant de relancer l'application.",
                "DCC Sheet", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        ApplicationConfiguration.Initialize();

        var form = new MainForm();

        // Filet de sécurité : quel que soit le chemin de sortie, PHP doit mourir
        // avec l'application (fermeture normale, exception fatale, fin de processus).
        AppDomain.CurrentDomain.ProcessExit += (_, _) => form.StopServer();
        Application.ApplicationExit += (_, _) => form.StopServer();

        Application.Run(form);

        GC.KeepAlive(_mutex);
    }
}
