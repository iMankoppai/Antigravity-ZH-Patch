using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public static class AppUpdater
    {
        public static List<string> BuildCandidateUrls(string directUrl)
        {
            var list = new List<string>();
            if (string.IsNullOrWhiteSpace(directUrl)) return list;

            string clean = directUrl.Trim();
            if (clean.StartsWith("https://github.com/", StringComparison.OrdinalIgnoreCase))
            {
                list.Add("https://ghproxy.net/" + clean);
                list.Add("https://ghfast.top/" + clean);
                list.Add("https://gh-proxy.com/" + clean);
            }
            list.Add(clean);
            return list;
        }

        public static async Task<bool> DownloadAndApplyUpdateAsync(
            UpdateInfo info,
            Action<double, string, string>? onProgress,
            Action<string>? log,
            Action? onShutdown = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(info.DownloadUrl))
            {
                log?.Invoke("❌ 未找到可用的更新下载地址。");
                return false;
            }

            string currentExePath = Process.GetCurrentProcess().MainModule?.FileName 
                                    ?? Environment.ProcessPath 
                                    ?? string.Empty;

            if (string.IsNullOrEmpty(currentExePath) || !File.Exists(currentExePath))
            {
                log?.Invoke("❌ 无法定位当前管理器的安装路径。");
                return false;
            }

            var candidateUrls = BuildCandidateUrls(info.DownloadUrl);
            string tempDir = Path.Combine(Path.GetTempPath(), "AntigravityZhUpdate_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);

            string downloadedFile = Path.Combine(tempDir, string.IsNullOrEmpty(info.DownloadFileName) 
                ? "update_package.bin" 
                : info.DownloadFileName);

            bool downloadSuccess = false;

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
            httpClient.DefaultRequestHeaders.Add("User-Agent", $"AntigravityZhManager/{UpdateChecker.CurrentVersion}");

            foreach (var url in candidateUrls)
            {
                cancellationToken.ThrowIfCancellationRequested();
                try
                {
                    string hostLabel = GetHostLabel(url);
                    log?.Invoke($"🌐 正在尝试从节点 [{hostLabel}] 下载更新...");
                    onProgress?.Invoke(0, "0 KB/s", $"正在连接 [{hostLabel}]...");

                    using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                    if (!response.IsSuccessStatusCode)
                    {
                        log?.Invoke($"⚠️ 节点 [{hostLabel}] 返回状态码: {response.StatusCode}，切换下一个节点...");
                        continue;
                    }

                    long totalBytes = response.Content.Headers.ContentLength ?? info.DownloadSize;
                    using var sourceStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                    using var destStream = new FileStream(downloadedFile, FileMode.Create, FileAccess.Write, FileShare.None, 65536, true);

                    var buffer = new byte[65536];
                    long totalRead = 0;
                    var stopwatch = Stopwatch.StartNew();
                    long lastSpeedBytes = 0;
                    var lastSpeedTime = stopwatch.ElapsedMilliseconds;

                    while (true)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        int read = await sourceStream.ReadAsync(buffer, 0, buffer.Length, cancellationToken);
                        if (read == 0) break;

                        await destStream.WriteAsync(buffer, 0, read, cancellationToken);
                        totalRead += read;

                        long now = stopwatch.ElapsedMilliseconds;
                        if (now - lastSpeedTime >= 300)
                        {
                            double timeSec = (now - lastSpeedTime) / 1000.0;
                            double speedBytes = (totalRead - lastSpeedBytes) / (timeSec > 0 ? timeSec : 1.0);
                            string speedStr = FormatSpeed(speedBytes);

                            double percent = totalBytes > 0 ? (totalRead * 100.0 / totalBytes) : 0;
                            string detail = totalBytes > 0 
                                ? $"{percent:F1}% ({FormatSize(totalRead)} / {FormatSize(totalBytes)})"
                                : $"{FormatSize(totalRead)} (正在下载)";

                            onProgress?.Invoke(percent, speedStr, detail);
                            lastSpeedBytes = totalRead;
                            lastSpeedTime = now;
                        }
                    }

                    if (totalBytes > 0 && totalRead < totalBytes * 0.8)
                    {
                        log?.Invoke($"⚠️ 节点 [{hostLabel}] 下载不完整 ({totalRead} / {totalBytes} 字节)，尝试下一节点...");
                        continue;
                    }

                    downloadSuccess = true;
                    log?.Invoke($"✅ 下载完成！共 {FormatSize(totalRead)}。");
                    break;
                }
                catch (OperationCanceledException)
                {
                    log?.Invoke("🛑 用户取消了更新下载。");
                    CleanupSafe(tempDir);
                    return false;
                }
                catch (Exception ex)
                {
                    log?.Invoke($"⚠️ 当前下载节点异常 ({ex.Message})，尝试下一节点...");
                }
            }

            if (!downloadSuccess || !File.Exists(downloadedFile))
            {
                log?.Invoke("❌ 所有下载节点均失败，请检查网络或直接在浏览器中下载。");
                CleanupSafe(tempDir);
                return false;
            }

            onProgress?.Invoke(100, "", "正在解压并准备升级...");
            log?.Invoke("📦 正在处理并解压更新文件...");

            string extractedNewExe;
            try
            {
                if (downloadedFile.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                {
                    string extractFolder = Path.Combine(tempDir, "unpacked");
                    Directory.CreateDirectory(extractFolder);
                    ZipFile.ExtractToDirectory(downloadedFile, extractFolder, true);

                    string[] exeCandidates = Directory.GetFiles(extractFolder, "*.exe", SearchOption.AllDirectories);
                    if (exeCandidates.Length == 0)
                    {
                        log?.Invoke("❌ 更新包 ZIP 内未找到可执行程序 (*.exe)。");
                        CleanupSafe(tempDir);
                        return false;
                    }

                    string bestExe = exeCandidates[0];
                    foreach (var cand in exeCandidates)
                    {
                        string fileName = Path.GetFileName(cand);
                        if (fileName.Contains("汉化") || fileName.Contains("Manager") || fileName.Contains("Antigravity"))
                        {
                            bestExe = cand;
                            break;
                        }
                    }

                    extractedNewExe = bestExe;
                }
                else
                {
                    extractedNewExe = downloadedFile;
                }

                if (!string.IsNullOrEmpty(info.DownloadSha256))
                {
                    log?.Invoke("🔒 正在校验更新包完整性...");
                    using var stream = File.OpenRead(downloadedFile);
                    using var hasher = SHA256.Create();
                    var hashBytes = hasher.ComputeHash(stream);
                    string computed = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

                    if (!string.Equals(computed, info.DownloadSha256, StringComparison.OrdinalIgnoreCase))
                    {
                        log?.Invoke($"⚠️ 提示：文件 SHA256 与元数据不完全一致，仍尝试继续升级 (计算值: {computed})。");
                    }
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"❌ 解压更新包失败: {ex.Message}");
                CleanupSafe(tempDir);
                return false;
            }

            log?.Invoke("✨ 更新准备就绪！即将关闭当前程序并自动重启升级...");
            onProgress?.Invoke(100, "", "正在重启启动新版本...");

            try
            {
                string targetDir = Path.GetDirectoryName(currentExePath)!;
                string stagedNewExe = Path.Combine(targetDir, Path.GetFileName(currentExePath) + ".new");

                File.Copy(extractedNewExe, stagedNewExe, true);

                int pid = Environment.ProcessId;
                string escapedCurrent = currentExePath.Replace("'", "''");
                string escapedNew = stagedNewExe.Replace("'", "''");

                string psCommand = 
                    $"$pidToWait = {pid}; " +
                    $"$cur = '{escapedCurrent}'; " +
                    $"$new = '{escapedNew}'; " +
                    $"try {{ Wait-Process -Id $pidToWait -Timeout 10 -ErrorAction SilentlyContinue }} catch {{}}; " +
                    $"Start-Sleep -Milliseconds 500; " +
                    $"for ($i=0; $i -lt 30; $i++) {{ " +
                    $"    try {{ Move-Item -LiteralPath $new -Destination $cur -Force -ErrorAction Stop; break }} " +
                    $"    catch {{ Start-Sleep -Milliseconds 300 }} " +
                    $"}}; " +
                    $"Start-Process -LiteralPath $cur";

                var startInfo = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -WindowStyle Hidden -Command \"{psCommand}\"",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                Process.Start(startInfo);

                _ = Task.Run(async () =>
                {
                    await Task.Delay(300);
                    if (onShutdown != null)
                    {
                        onShutdown();
                    }
                    else
                    {
                        Environment.Exit(0);
                    }
                });

                return true;
            }
            catch (Exception ex)
            {
                log?.Invoke($"❌ 启动更新替换进程失败: {ex.Message}");
                return false;
            }
        }

        private static string GetHostLabel(string url)
        {
            try
            {
                var uri = new Uri(url);
                return uri.Host;
            }
            catch
            {
                return "未知";
            }
        }

        private static string FormatSize(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{(bytes / 1024.0):F1} KB";
            return $"{(bytes / (1024.0 * 1024.0)):F1} MB";
        }

        private static string FormatSpeed(double bytesPerSec)
        {
            if (bytesPerSec < 1024) return $"{bytesPerSec:F0} B/s";
            if (bytesPerSec < 1024 * 1024) return $"{(bytesPerSec / 1024.0):F1} KB/s";
            return $"{(bytesPerSec / (1024.0 * 1024.0)):F1} MB/s";
        }

        private static void CleanupSafe(string path)
        {
            try
            {
                if (Directory.Exists(path)) Directory.Delete(path, true);
            }
            catch { }
        }
    }
}
