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

    public static async Task<bool> CloseProcessesForArchiveAsync(string asarPath, int timeoutMs = 6000)
    {
        string expected = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(Path.GetFullPath(asarPath))!, "..", "Antigravity.exe"));
        var matched = new List<Process>();
        foreach (var process in Process.GetProcessesByName("Antigravity"))
        {
            try
            {
                if (string.Equals(process.MainModule?.FileName, expected, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(process.ProcessName, "Antigravity", StringComparison.OrdinalIgnoreCase))
                {
                    matched.Add(process);
                    continue;
                }
            }
            catch { matched.Add(process); continue; }
            process.Dispose();
        }

        if (matched.Count == 0) return true;

        try
        {
            foreach (var p in matched)
            {
                try { p.CloseMainWindow(); } catch { }
            }

            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 2000)
            {
                if (matched.All(p => { try { return p.HasExited; } catch { return true; } }))
                    return true;
                await Task.Delay(150);
            }

            foreach (var p in matched)
            {
                try { if (!p.HasExited) p.Kill(true); } catch { }
            }

            while (sw.ElapsedMilliseconds < timeoutMs)
            {
                if (matched.All(p => { try { return p.HasExited; } catch { return true; } }))
                    return true;
                await Task.Delay(150);
            }

            return !IsRunningForArchive(asarPath);
        }
        finally
        {
            foreach (var p in matched)
            {
                try { p.Dispose(); } catch { }
            }
        }
    }
}
