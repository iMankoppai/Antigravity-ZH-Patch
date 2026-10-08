using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public class HealthCheckItem
    {
        public string Title { get; set; } = string.Empty;
        public bool IsOk { get; set; }
        public bool IsWarning { get; set; }
        public string Details { get; set; } = string.Empty;
        public string FixSuggestion { get; set; } = string.Empty;
    }

    public class HealthReport
    {
        public bool OverallHealthy { get; set; }
        public int PassCount { get; set; }
        public int WarnCount { get; set; }
        public int FailCount { get; set; }
        public List<HealthCheckItem> Items { get; set; } = new();
    }

    public static class HealthChecker
    {
        public const string OfficialAsarHash = "d075e5d9ff01f8806016aa88c39bf1429f068a941fdbe46147d8409843e62113";

        public static async Task<HealthReport> RunDiagnosticsAsync(AntigravityInfo appInfo, Action<string>? log = null)
        {
            var report = new HealthReport();
            log?.Invoke("🩺 正在启动 Antigravity 运行环境全方位健康诊断...");

            // 1. 软件安装目录与主程序检测
            var itemInstall = new HealthCheckItem { Title = "主程序与目录检测" };
            if (!string.IsNullOrEmpty(appInfo.InstallDir) && Directory.Exists(appInfo.InstallDir) && File.Exists(appInfo.ExePath))
            {
                itemInstall.IsOk = true;
                itemInstall.Details = $"目录正常：{appInfo.InstallDir} (检测来源: {appInfo.DetectSource})";
                log?.Invoke($"  ✅ [主程序] {itemInstall.Details}");
            }
            else
            {
                itemInstall.IsOk = false;
                itemInstall.Details = "未能定位到有效的 Antigravity.exe 主程序。";
                itemInstall.FixSuggestion = "请在主界面点击【手动选择...】重新定位软件安装路径。";
                log?.Invoke($"  ❌ [主程序] {itemInstall.Details}");
            }
            report.Items.Add(itemInstall);

            // 2. ASAR 内核完整性检测
            var itemAsar = new HealthCheckItem { Title = "ASAR 内核完整性" };
            if (File.Exists(appInfo.AsarPath))
            {
                try
                {
                    var fi = new FileInfo(appInfo.AsarPath);
                    string hash = await ComputeFileHashAsync(appInfo.AsarPath);
                    if (hash.Equals(OfficialAsarHash, StringComparison.OrdinalIgnoreCase))
                    {
                        itemAsar.IsOk = true;
                        itemAsar.Details = $"官方英文原版 (哈希校验通过，文件大小: {fi.Length / 1024 / 1024}MB)";
                    }
                    else if (appInfo.IsCleanPatched)
                    {
                        itemAsar.IsOk = true;
                        itemAsar.Details = $"已内嵌洁癖汉化内核 (文件大小: {fi.Length / 1024 / 1024}MB)";
                    }
                    else
                    {
                        itemAsar.IsWarning = true;
                        itemAsar.Details = $"检测到自定义或第三方修改版 ASAR (SHA256: {hash.Substring(0, 12)}...)";
                        itemAsar.FixSuggestion = "若汉化异常，可点击【恢复官方英文默认状态】重置后重新安装。";
                    }
                    log?.Invoke($"  {(itemAsar.IsOk ? "✅" : "⚠️")} [内核] {itemAsar.Details}");
                }
                catch (Exception ex)
                {
                    itemAsar.IsOk = false;
                    itemAsar.Details = "ASAR 文件无法读取: " + ex.Message;
                    log?.Invoke($"  ❌ [内核] {itemAsar.Details}");
                }
            }
            else
            {
                itemAsar.IsOk = false;
                itemAsar.Details = "未找到 resources\\app.asar 文件！";
                itemAsar.FixSuggestion = "请检查安装目录是否完整，或重新安装 Antigravity。";
                log?.Invoke($"  ❌ [内核] {itemAsar.Details}");
            }
            report.Items.Add(itemAsar);

            // 3. 官方原版备份就绪检测
            var itemBackup = new HealthCheckItem { Title = "官方原版备份保障" };
            if (File.Exists(appInfo.AsarBakPath))
            {
                try
                {
                    string bakHash = await ComputeFileHashAsync(appInfo.AsarBakPath);
                    if (bakHash.Equals(OfficialAsarHash, StringComparison.OrdinalIgnoreCase))
                    {
                        itemBackup.IsOk = true;
                        itemBackup.Details = "官方原版备份已就绪 (app.asar.bak 哈希匹配官方原版，随时可无损还原)";
                    }
                    else
                    {
                        itemBackup.IsOk = true;
                        itemBackup.Details = $"备份文件已就绪 (SHA256: {bakHash.Substring(0, 12)}...)";
                    }
                    log?.Invoke($"  ✅ [备份] {itemBackup.Details}");
                }
                catch (Exception ex)
                {
                    itemBackup.IsWarning = true;
                    itemBackup.Details = "备份文件读取异常: " + ex.Message;
                    log?.Invoke($"  ⚠️ [备份] {itemBackup.Details}");
                }
            }
            else
            {
                // 备份不存在：如果当前 app.asar 是官方原版，可以自动补齐！
                if (itemAsar.IsOk && !appInfo.IsCleanPatched)
                {
                    try
                    {
                        File.Copy(appInfo.AsarPath, appInfo.AsarBakPath, true);
                        itemBackup.IsOk = true;
                        itemBackup.Details = "未发现备份，已自动抓取当前官方原版建立 app.asar.bak 守护备份！";
                        log?.Invoke($"  ✅ [备份] {itemBackup.Details}");
                    }
                    catch (Exception ex)
                    {
                        itemBackup.IsWarning = true;
                        itemBackup.Details = "未找到备份且自动建立失败: " + ex.Message;
                        log?.Invoke($"  ⚠️ [备份] {itemBackup.Details}");
                    }
                }
                else
                {
                    itemBackup.IsWarning = true;
                    itemBackup.Details = "尚未创建官方原版备份 (首次点击【永久固化安装】时将自动备份)";
                    itemBackup.FixSuggestion = "首次安装汉化时系统会自动为您创建官方备份。";
                    log?.Invoke($"  ℹ️ [备份] {itemBackup.Details}");
                }
            }
            report.Items.Add(itemBackup);

            // 4. 目录写入与只读权限检测
            var itemPerm = new HealthCheckItem { Title = "系统权限与目录可写性" };
            string resourcesDir = !string.IsNullOrEmpty(appInfo.AsarPath) ? Path.GetDirectoryName(appInfo.AsarPath)! : string.Empty;
            if (!string.IsNullOrEmpty(resourcesDir) && Directory.Exists(resourcesDir))
            {
                try
                {
                    string testFile = Path.Combine(resourcesDir, ".health_test_" + Guid.NewGuid().ToString("N"));
                    await File.WriteAllTextAsync(testFile, "test");
                    File.Delete(testFile);
                    itemPerm.IsOk = true;
                    itemPerm.Details = "resources 目录读写权限完全正常，无杀软只读锁定。";
                    log?.Invoke($"  ✅ [权限] {itemPerm.Details}");
                }
                catch (Exception ex)
                {
                    itemPerm.IsOk = false;
                    itemPerm.Details = "写入测试失败 (可能受权限限制或杀毒软件保护锁定): " + ex.Message;
                    itemPerm.FixSuggestion = "请尝试以管理员身份运行本管理器，或在杀软中添加信任。";
                    log?.Invoke($"  ❌ [权限] {itemPerm.Details}");
                }
            }
            else
            {
                itemPerm.IsOk = false;
                itemPerm.Details = "resources 目录不存在。";
                log?.Invoke($"  ❌ [权限] {itemPerm.Details}");
            }
            report.Items.Add(itemPerm);

            // 5. 调试通信通道与前台响应检测
            var itemCdp = new HealthCheckItem { Title = "CDP 实时调试链路" };
            if (appInfo.IsRunning)
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string portFile = Path.Combine(appData, "Antigravity", "DevToolsActivePort");
                if (File.Exists(portFile))
                {
                    try
                    {
                        string[] lines = await File.ReadAllLinesAsync(portFile);
                        if (lines.Length > 0 && int.TryParse(lines[0].Trim(), out int port))
                        {
                            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
                            string json = await client.GetStringAsync($"http://127.0.0.1:{port}/json/version");
                            itemCdp.IsOk = true;
                            itemCdp.Details = $"实时调试通道畅通无阻 (端口 {port}，支持免重启热切换语言)";
                            log?.Invoke($"  ✅ [通道] {itemCdp.Details}");
                        }
                        else
                        {
                            itemCdp.IsWarning = true;
                            itemCdp.Details = "调试端口文件内容格式异常。";
                            log?.Invoke($"  ⚠️ [通道] {itemCdp.Details}");
                        }
                    }
                    catch (Exception ex)
                    {
                        itemCdp.IsWarning = true;
                        itemCdp.Details = "调试端口暂时无响应 (" + ex.Message + ")";
                        itemCdp.FixSuggestion = "若需使用【实时中文开关】，请确保 Antigravity 正常启动。";
                        log?.Invoke($"  ⚠️ [通道] {itemCdp.Details}");
                    }
                }
                else
                {
                    itemCdp.IsWarning = true;
                    itemCdp.Details = "DevToolsActivePort 未生成 (仅影响免重启热开关，不影响永久固化汉化)";
                    log?.Invoke($"  ℹ️ [通道] {itemCdp.Details}");
                }
            }
            else
            {
                itemCdp.IsOk = true;
                itemCdp.Details = "Antigravity 当前未运行（静态文件与永久汉化不受影响）";
                log?.Invoke($"  ℹ️ [通道] {itemCdp.Details}");
            }
            report.Items.Add(itemCdp);

            // 汇总统计
            foreach (var it in report.Items)
            {
                if (it.IsOk) report.PassCount++;
                else if (it.IsWarning) report.WarnCount++;
                else report.FailCount++;
            }

            report.OverallHealthy = (report.FailCount == 0);
            log?.Invoke($"🎉 体检完毕：通过={report.PassCount}，提示={report.WarnCount}，异常={report.FailCount}，整体状态=[{(report.OverallHealthy ? "优秀健康" : "存在待处理项")}]");
            return report;
        }

        private static async Task<string> ComputeFileHashAsync(string filePath)
        {
            using var sha = SHA256.Create();
            using var stream = File.OpenRead(filePath);
            byte[] hashBytes = await sha.ComputeHashAsync(stream);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }
    }
}
