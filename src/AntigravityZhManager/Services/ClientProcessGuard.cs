using System.IO;
using System.Diagnostics;

namespace AntigravityZhManager.Services;

public static class ClientProcessGuard
{
    // Isolated test archives do not belong to the running client installation.
    public static bool IsRunningForArchive(string asarPath)
    {
        string expected = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(Path.GetFullPath(asarPath))!, "..", "Antigravity.exe"));
        foreach (var process in Process.GetProcessesByName("Antigravity"))
        {
            using (process)
            {
                try
                {
                    if (string.Equals(process.MainModule?.FileName, expected, StringComparison.OrdinalIgnoreCase)) return true;
                }
                catch { if (!process.HasExited) return true; }
            }
        }
        return false;
    }
}
