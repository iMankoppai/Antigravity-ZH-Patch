using System.Configuration;
using System.Data;
using System.Windows;

namespace AntigravityZhManager;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            LogAndShowException(args.ExceptionObject as Exception, "AppDomain UnhandledException");
        };

        DispatcherUnhandledException += (s, args) =>
        {
            LogAndShowException(args.Exception, "Dispatcher UnhandledException");
            args.Handled = true;
        };

        TaskScheduler.UnobservedTaskException += (s, args) =>
        {
            LogAndShowException(args.Exception, "TaskScheduler UnobservedTaskException");
            args.SetObserved();
        };
    }

    private static void LogAndShowException(Exception? ex, string source)
    {
        if (ex == null) return;
        string msg = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{source}] {ex}\n\n";
        try
        {
            System.IO.File.AppendAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "crash.log"), msg);
        }
        catch { }
        MessageBox.Show($"软件运行发生异常：\n\n{ex.Message}\n\n若权限受限，请尝试以管理员身份运行。", "运行提示", MessageBoxButton.OK, MessageBoxImage.Warning);
    }
}

