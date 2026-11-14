using System.Diagnostics;
using System.IO;

namespace AntigravityZhManager.Services;

public sealed record ForceKillResult(
    bool Success,
    int FoundCount,
    int KilledCount,
    int RemainingCount,
    IReadOnlyList<string> KilledDescriptions,
    IReadOnlyList<string> Errors,
    string Message);

public static class ClientProcessGuard
{
    private static string? NormalizeDir(string? dir)
    {
        if (string.IsNullOrWhiteSpace(dir)) return null;
        try
        {
            return Path.GetFullPath(dir.Trim()).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }
        catch
        {
            return dir.Trim().TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        }
    }

    private static string TryGetFullPath(string path)
    {
        try { return Path.GetFullPath(path.Trim()); }
        catch { return path.Trim(); }
    }

    private static bool IsSelfOrManagerProcess(int pid, string? processName, string? mainModulePath, int currentPid, string? currentProcessPath)
    {
        if (pid == currentPid) return true;
        if (!string.IsNullOrWhiteSpace(processName) &&
            (string.Equals(processName, "AntigravityZhManager", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(processName, "Antigravity汉化管理器", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }
        if (!string.IsNullOrWhiteSpace(mainModulePath) && !string.IsNullOrWhiteSpace(currentProcessPath) &&
            string.Equals(TryGetFullPath(mainModulePath), TryGetFullPath(currentProcessPath), StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        return false;
    }

    private static bool IsPathUnderDirectory(string filePath, string normalizedDir)
    {
        string fullFile = TryGetFullPath(filePath);
        string dirPrefix = normalizedDir + Path.DirectorySeparatorChar;
        return fullFile.StartsWith(dirPrefix, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// 纯逻辑判定指定进程是否属于需要清理的 Antigravity 目标进程。
    /// 始终排除当前管理器进程，避免任何场景下误杀自身。
    /// </summary>
    public static bool ShouldTargetProcess(
        int pid,
        string? processName,
        string? mainModulePath,
        string? installDir,
        int currentPid,
        bool includeAllAntigravityNamed = false,
        bool includeAccessDeniedMainName = false,
        string? currentProcessPath = null)
    {
        if (IsSelfOrManagerProcess(pid, processName, mainModulePath, currentPid, currentProcessPath))
            return false;

        string? normalizedDir = NormalizeDir(installDir);
        bool isMainProcessName = string.Equals(processName, "Antigravity", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(mainModulePath))
        {
            if (normalizedDir != null && IsPathUnderDirectory(mainModulePath, normalizedDir))
                return true;

            if (isMainProcessName && (normalizedDir == null || includeAllAntigravityNamed))
                return true;

            return false;
        }

        // 某些受限或半退出进程无法读取 MainModule：仅在允许兜底且进程名为 Antigravity 时匹配
        return isMainProcessName && (includeAccessDeniedMainName || includeAllAntigravityNamed || normalizedDir == null);
    }

    private static string? TryGetMainModulePath(Process process)
    {
        try { return process.MainModule?.FileName; }
        catch { return null; }
    }

    private static List<Process> FindTargetProcesses(
        string? installDir,
        bool includeAllAntigravityNamed,
        bool includeAccessDeniedMainName)
    {
        int currentPid = Environment.ProcessId;
        string? currentPath = Environment.ProcessPath;
        var matched = new List<Process>();

        foreach (var process in Process.GetProcesses())
        {
            bool keep = false;
            try
            {
                if (process.HasExited) continue;
                string? procName = process.ProcessName;
                string? modulePath = TryGetMainModulePath(process);
                keep = ShouldTargetProcess(
                    process.Id,
                    procName,
                    modulePath,
                    installDir,
                    currentPid,
                    includeAllAntigravityNamed,
                    includeAccessDeniedMainName,
                    currentPath);
            }
            catch
            {
                keep = false;
            }
            finally
            {
                if (!keep)
                {
                    try { process.Dispose(); } catch { }
                }
            }

            if (keep) matched.Add(process);
        }

        return matched;
    }

    public static int CountRunningClientProcesses(
        string? installDir,
        bool includeAllAntigravityNamed = true,
        bool includeAccessDeniedMainName = true)
    {
        var matched = FindTargetProcesses(installDir, includeAllAntigravityNamed, includeAccessDeniedMainName);
        try
        {
            return matched.Count;
        }
        finally
        {
            foreach (var p in matched)
            {
                try { p.Dispose(); } catch { }
            }
        }
    }

    // Isolated test archives do not belong to the running client installation.
    public static bool IsRunningForArchive(string asarPath)
    {
        string installDir = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(Path.GetFullPath(asarPath))!, ".."));
        return CountRunningClientProcesses(installDir, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false) > 0;
    }

    public static async Task<bool> CloseProcessesForArchiveAsync(string asarPath, int timeoutMs = 6000)
    {
        string installDir = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(Path.GetFullPath(asarPath))!, ".."));
        var matched = FindTargetProcesses(installDir, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false);
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

    /// <summary>
    /// 强制结束所有正在运行或退出托盘后残留的 Antigravity 进程（包含安装目录下的 language_server 等附属进程）。
    /// </summary>
    public static async Task<ForceKillResult> ForceKillClientAsync(
        string? installDir,
        int timeoutMs = 5000,
        bool includeAllAntigravityNamed = false,
        Action<string>? log = null)
    {
        var matched = FindTargetProcesses(installDir, includeAllAntigravityNamed, includeAccessDeniedMainName: includeAllAntigravityNamed);
        if (matched.Count == 0)
        {
            return new ForceKillResult(
                Success: true,
                FoundCount: 0,
                KilledCount: 0,
                RemainingCount: 0,
                KilledDescriptions: Array.Empty<string>(),
                Errors: Array.Empty<string>(),
                Message: "当前未检测到正在运行或后台残留的 Antigravity 进程。");
        }

        var descriptions = new List<string>(matched.Count);
        var errors = new List<string>();
        int foundCount = matched.Count;
        int killedRequests = 0;

        try
        {
            log?.Invoke($"🛑 发现 {foundCount} 个 Antigravity 相关进程，准备强制结束...");

            foreach (var p in matched)
            {
                string label = $"PID {p.Id}";
                try { label = $"{p.ProcessName} (PID: {p.Id})"; } catch { }

                try
                {
                    if (!p.HasExited)
                    {
                        p.Kill(entireProcessTree: true);
                        killedRequests++;
                        descriptions.Add(label);
                        log?.Invoke($"  ⚡ 已发送结束指令: {label}");
                    }
                    else
                    {
                        descriptions.Add(label);
                    }
                }
                catch (Exception ex)
                {
                    bool exited = false;
                    try { exited = p.HasExited; } catch { }
                    if (!exited)
                    {
                        string err = $"{label}: {ex.Message}";
                        errors.Add(err);
                        log?.Invoke($"  ⚠️ 结束进程失败: {err}");
                    }
                    else
                    {
                        descriptions.Add(label);
                    }
                }
            }

            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < timeoutMs)
            {
                bool allTargetExited = matched.All(p => { try { return p.HasExited; } catch { return true; } });
                if (allTargetExited && CountRunningClientProcesses(installDir, includeAllAntigravityNamed, includeAccessDeniedMainName: includeAllAntigravityNamed) == 0)
                    break;
                await Task.Delay(120);
            }

            int remaining = CountRunningClientProcesses(installDir, includeAllAntigravityNamed, includeAccessDeniedMainName: includeAllAntigravityNamed);
            int exitedCount = matched.Count(p => { try { return p.HasExited; } catch { return true; } });
            bool success = remaining == 0;

            string message = success
                ? $"已强制结束全部 {foundCount} 个 Antigravity 相关进程。"
                : $"已尝试结束 {exitedCount}/{foundCount} 个进程，仍有 {remaining} 个进程未退出（可能需要以管理员权限运行或手动关闭）。";

            return new ForceKillResult(
                Success: success,
                FoundCount: foundCount,
                KilledCount: exitedCount,
                RemainingCount: remaining,
                KilledDescriptions: descriptions,
                Errors: errors,
                Message: message);
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
