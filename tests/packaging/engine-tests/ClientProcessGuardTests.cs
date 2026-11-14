using System.Diagnostics;
using AntigravityZhManager.Services;

static class ClientProcessGuardTests
{
    private static void CopyTestHostFiles(string destDir)
    {
        Directory.CreateDirectory(destDir);
        string srcDir = AppContext.BaseDirectory;
        foreach (string file in Directory.GetFiles(srcDir, "BaselineManifestTests.*"))
        {
            string name = Path.GetFileName(file);
            File.Copy(file, Path.Combine(destDir, name), overwrite: true);
        }
    }

    private static Process StartSleepWorker(string hostDir)
    {
        string exePath = Path.Combine(hostDir, "BaselineManifestTests.exe");
        var psi = new ProcessStartInfo
        {
            FileName = exePath,
            Arguments = "--sleep-worker",
            UseShellExecute = false,
            CreateNoWindow = true
        };
        return Process.Start(psi) ?? throw new InvalidOperationException("无法启动测试子进程: " + exePath);
    }

    public static async Task<int> RunAsync()
    {
        int failures = 0;
        void Check(string name, bool ok, string detail = "")
        {
            Console.WriteLine($"[{(ok ? "PASS" : "FAIL")}] {name}{(detail.Length > 0 ? " - " + detail : "")}");
            if (!ok) failures++;
        }

        const string installDir = @"C:\Apps\Antigravity";
        const int selfPid = 9999;
        const string selfPath = @"C:\Tools\AntigravityZhManager.exe";

        // 1. 纯逻辑防误杀与匹配规则校验
        Check(
            "进程筛选：永远排除当前进程自身 PID",
            !ClientProcessGuard.ShouldTargetProcess(
                selfPid, "Antigravity", @"C:\Apps\Antigravity\Antigravity.exe",
                installDir, selfPid, includeAllAntigravityNamed: true, includeAccessDeniedMainName: true, currentProcessPath: selfPath));

        Check(
            "进程筛选：排除管理器进程名与自身路径",
            !ClientProcessGuard.ShouldTargetProcess(
                1001, "AntigravityZhManager", @"C:\Apps\Antigravity\AntigravityZhManager.exe",
                installDir, selfPid, includeAllAntigravityNamed: true, includeAccessDeniedMainName: true, currentProcessPath: selfPath));

        Check(
            "进程筛选：命中安装目录下的 Antigravity.exe",
            ClientProcessGuard.ShouldTargetProcess(
                1002, "Antigravity", @"C:\Apps\Antigravity\Antigravity.exe",
                installDir, selfPid, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false, currentProcessPath: selfPath));

        Check(
            "进程筛选：命中安装目录子路径下的 language_server.exe",
            ClientProcessGuard.ShouldTargetProcess(
                1003, "language_server", @"C:\Apps\Antigravity\resources\bin\language_server.exe",
                installDir, selfPid, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false, currentProcessPath: selfPath));

        Check(
            "进程筛选：前缀相近目录 antigravity-other 不会误命中",
            !ClientProcessGuard.ShouldTargetProcess(
                1004, "language_server", @"C:\Apps\Antigravity-other\language_server.exe",
                installDir, selfPid, includeAllAntigravityNamed: true, includeAccessDeniedMainName: false, currentProcessPath: selfPath));

        Check(
            "进程筛选：隔离模式下不跨目录命中其他 Antigravity",
            !ClientProcessGuard.ShouldTargetProcess(
                1005, "Antigravity", @"D:\Portable\Antigravity.exe",
                installDir, selfPid, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false, currentProcessPath: selfPath));

        Check(
            "进程筛选：全量清理模式下命中其他目录的 Antigravity 主名",
            ClientProcessGuard.ShouldTargetProcess(
                1006, "Antigravity", @"D:\Portable\Antigravity.exe",
                installDir, selfPid, includeAllAntigravityNamed: true, includeAccessDeniedMainName: true, currentProcessPath: selfPath));

        Check(
            "进程筛选：全量清理模式下不误杀其他目录的 language_server",
            !ClientProcessGuard.ShouldTargetProcess(
                1007, "language_server", @"D:\OtherIde\bin\language_server.exe",
                installDir, selfPid, includeAllAntigravityNamed: true, includeAccessDeniedMainName: true, currentProcessPath: selfPath));

        Check(
            "进程筛选：无路径访问权限时按策略决定是否兜底命中 Antigravity",
            !ClientProcessGuard.ShouldTargetProcess(
                1008, "Antigravity", null,
                installDir, selfPid, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false, currentProcessPath: selfPath)
            && ClientProcessGuard.ShouldTargetProcess(
                1008, "Antigravity", null,
                installDir, selfPid, includeAllAntigravityNamed: true, includeAccessDeniedMainName: true, currentProcessPath: selfPath));

        // 2. 真实可控隔离进程清理与防误杀验证（绝不触碰真实客户端进程）
        string tempRoot = Path.Combine(Path.GetTempPath(), "agy-proc-guard-" + Guid.NewGuid().ToString("N"));
        string targetInstallDir = Path.Combine(tempRoot, "client");
        string targetSubDir = Path.Combine(targetInstallDir, "resources", "bin");
        string unrelatedDir = Path.Combine(tempRoot, "unrelated");

        Process? p1 = null;
        Process? p2 = null;
        Process? unrelated = null;

        try
        {
            CopyTestHostFiles(targetSubDir);
            CopyTestHostFiles(unrelatedDir);

            p1 = StartSleepWorker(targetSubDir);
            p2 = StartSleepWorker(targetSubDir);
            unrelated = StartSleepWorker(unrelatedDir);

            await Task.Delay(250);

            int counted = ClientProcessGuard.CountRunningClientProcesses(
                targetInstallDir, includeAllAntigravityNamed: false, includeAccessDeniedMainName: false);
            Check("进程守卫：精准统计隔离目录中的子进程数", counted == 2, $"counted={counted}");

            var killRes = await ClientProcessGuard.ForceKillClientAsync(
                targetInstallDir, timeoutMs: 5000, includeAllAntigravityNamed: false);
            Check("进程守卫：ForceKillClientAsync 返回成功", killRes.Success, killRes.Message);
            Check("进程守卫：发现与终止计数准确", killRes.FoundCount == 2 && killRes.KilledCount == 2 && killRes.RemainingCount == 0,
                $"found={killRes.FoundCount}, killed={killRes.KilledCount}, rem={killRes.RemainingCount}");
            Check("进程守卫：目标测试进程确已退出", p1.HasExited && p2.HasExited);
            Check("进程守卫：无关目录同类进程完好无损", !unrelated.HasExited);

            var emptyRes = await ClientProcessGuard.ForceKillClientAsync(
                targetInstallDir, timeoutMs: 1000, includeAllAntigravityNamed: false);
            Check("进程守卫：无残留进程时安全返回成功且计数为 0", emptyRes.Success && emptyRes.FoundCount == 0);
        }
        finally
        {
            foreach (var p in new[] { p1, p2, unrelated })
            {
                if (p == null) continue;
                try { if (!p.HasExited) p.Kill(true); } catch { }
                try { p.WaitForExit(1000); } catch { }
                try { p.Dispose(); } catch { }
            }
            try { if (Directory.Exists(tempRoot)) Directory.Delete(tempRoot, true); } catch { }
        }

        return failures;
    }
}
