using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace AntigravityZhManager.Services
{
    public class AntigravityInfo
    {
        public bool IsRunning { get; set; }
        public int ProcessId { get; set; }
        public string ExePath { get; set; } = string.Empty;
        public string InstallDir { get; set; } = string.Empty;
        public string AsarPath { get; set; } = string.Empty;
        public string AsarBakPath { get; set; } = string.Empty;
        public bool HasAsar { get; set; }
        public bool HasBackup { get; set; }
        public bool IsCleanPatched { get; set; }
        public bool IsOfficialOriginal { get; set; }
        public bool HasLegacyFolder { get; set; }
        public string LegacyFolderPath { get; set; } = string.Empty;
        public string Version { get; set; } = "2.22.0";
        public string DetectSource { get; set; } = string.Empty;
    }

    public static class AntigravityDetector
    {
        // 官方原版 SHA256（按已适配版本记录）
        public const string OFFICIAL_2_21_1_HASH = "d075e5d9ff01f8806016aa88c39bf1429f068a941fdbe46147d8409843e62113";
        public const string OFFICIAL_2_22_0_HASH = "259c83ffa266088dda6ede520a601bbf06cc5c34985cdf56c5d68549c98dbb0e";

        /// <summary>
        /// 把卸载记录的 DisplayIcon 值规范成可用的可执行文件路径：
        /// 去掉外层引号，并去掉形如 “,0” 的资源序号后缀。
        /// </summary>
        public static string NormalizeDisplayIcon(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
            string value = raw.Trim().Trim('"').Trim();
            int comma = value.LastIndexOf(',');
            if (comma > 0 && value[(comma + 1)..].All(char.IsDigit)) value = value[..comma].Trim().Trim('"').Trim();
            return value;
        }

        private static string CalcFileHash(string path)
        {
            if (!File.Exists(path)) return string.Empty;
            try
            {
                using var sha = SHA256.Create();
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                byte[] hash = sha.ComputeHash(stream);
                var sb = new StringBuilder();
                foreach (byte b in hash) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
            catch
            {
                return string.Empty;
            }
        }

        public static AntigravityInfo Detect(string? customPath = null, Action<string>? log = null)
        {
            var info = new AntigravityInfo();

            // 1. 优先检查运行中的进程
            try
            {
                var processes = Process.GetProcessesByName("Antigravity");
                if (processes.Length > 0)
                {
                    var p = processes[0];
                    info.IsRunning = true;
                    info.ProcessId = p.Id;
                    try
                    {
                        info.ExePath = p.MainModule?.FileName ?? string.Empty;
                        if (!string.IsNullOrEmpty(info.ExePath) && File.Exists(info.ExePath))
                        {
                            info.DetectSource = "运行中的前台进程 (PID: " + p.Id + ")";
                        }
                    }
                    catch { }
                }
            }
            catch { }

            // 2. 用户手动指定路径
            if (!string.IsNullOrEmpty(customPath) && File.Exists(customPath))
            {
                info.ExePath = customPath;
                info.DetectSource = "手动指定路径";
            }

            // 3. 自动扫描常见与标准路径
            if (string.IsNullOrEmpty(info.ExePath) || !File.Exists(info.ExePath))
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string defaultPath = Path.Combine(localApp, "Programs", "antigravity", "Antigravity.exe");

                if (File.Exists(defaultPath))
                {
                    info.ExePath = defaultPath;
                    info.DetectSource = "默认用户安装目录 (LocalAppData)";
                }
                else
                {
                    // 扫描注册表
                    info.ExePath = ScanRegistry() ?? string.Empty;
                    if (!string.IsNullOrEmpty(info.ExePath))
                    {
                        info.DetectSource = "系统注册表安装记录";
                    }
                    else
                    {
                        // 扫描 Program Files
                        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                        string pfPath = Path.Combine(pf, "Antigravity", "Antigravity.exe");
                        if (File.Exists(pfPath))
                        {
                            info.ExePath = pfPath;
                            info.DetectSource = "系统 Program Files 目录";
                        }
                    }
                }
            }

            // 4. 解析目标文件与备份
            if (!string.IsNullOrEmpty(info.ExePath) && File.Exists(info.ExePath))
            {
                info.InstallDir = Path.GetDirectoryName(info.ExePath) ?? string.Empty;
                info.AsarPath = Path.Combine(info.InstallDir, "resources", "app.asar");
                info.HasAsar = File.Exists(info.AsarPath);

                // 探测多源备份
                string resDir = Path.Combine(info.InstallDir, "resources");
                string defaultBak = Path.Combine(resDir, "app.asar.bak");
                string legacyBak1 = Path.Combine(resDir, "app-2.21.1-native-original.asar");
                string legacyBak2 = Path.Combine(resDir, "app-original.asar");

                if (File.Exists(defaultBak))
                {
                    info.AsarBakPath = defaultBak;
                    info.HasBackup = true;
                }
                else if (File.Exists(legacyBak1))
                {
                    info.AsarBakPath = legacyBak1;
                    info.HasBackup = true;
                }
                else if (File.Exists(legacyBak2))
                {
                    info.AsarBakPath = legacyBak2;
                    info.HasBackup = true;
                }

                // 探测旧版“中文补丁”外部文件夹
                info.LegacyFolderPath = Path.Combine(info.InstallDir, "中文补丁");
                info.HasLegacyFolder = Directory.Exists(info.LegacyFolderPath);

                // 探测 ASAR 状态
                if (info.HasAsar)
                {
                    string currentHash = CalcFileHash(info.AsarPath);
                    if (currentHash.Equals(OFFICIAL_2_21_1_HASH, StringComparison.OrdinalIgnoreCase) ||
                        currentHash.Equals(OFFICIAL_2_22_0_HASH, StringComparison.OrdinalIgnoreCase))
                    {
                        info.IsOfficialOriginal = true;
                    }

                    try
                    {
                        using var fs = new FileStream(info.AsarPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                        using var reader = new BinaryReader(fs);
                        reader.ReadUInt32(); // 4
                        uint headerSize = reader.ReadUInt32();
                        reader.ReadUInt32();
                        uint jsonLen = reader.ReadUInt32();
                        if (jsonLen > 0 && jsonLen < 10 * 1024 * 1024)
                        {
                            byte[] jsonBytes = reader.ReadBytes((int)jsonLen);
                            string json = Encoding.UTF8.GetString(jsonBytes);
                            if (json.Contains("zh-bundle.js"))
                            {
                                info.IsCleanPatched = true;
                            }
                        }
                    }
                    catch { }
                }

                // 探测应用版本
                try
                {
                    var versionInfo = FileVersionInfo.GetVersionInfo(info.ExePath);
                    if (!string.IsNullOrEmpty(versionInfo.ProductVersion))
                    {
                        info.Version = versionInfo.ProductVersion;
                    }
                }
                catch { }
            }

            return info;
        }

        private static string? ScanRegistry()
        {
            string[] registryKeys = {
                @"Software\Microsoft\Windows\CurrentVersion\Uninstall",
                @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            };

            foreach (var root in new[] { Registry.CurrentUser, Registry.LocalMachine })
            {
                foreach (var regKey in registryKeys)
                {
                    try
                    {
                        using var key = root.OpenSubKey(regKey);
                        if (key == null) continue;

                        foreach (var subKeyName in key.GetSubKeyNames())
                        {
                            using var subKey = key.OpenSubKey(subKeyName);
                            if (subKey == null) continue;

                            string? displayName = subKey.GetValue("DisplayName")?.ToString();
                            if (displayName != null && displayName.Contains("Antigravity", StringComparison.OrdinalIgnoreCase))
                            {
                                string? installLocation = subKey.GetValue("InstallLocation")?.ToString();
                                if (!string.IsNullOrEmpty(installLocation))
                                {
                                    string exe = Path.Combine(installLocation, "Antigravity.exe");
                                    if (File.Exists(exe)) return exe;
                                }

                                string? displayIcon = subKey.GetValue("DisplayIcon")?.ToString();
                                if (!string.IsNullOrEmpty(displayIcon))
                                {
                                    string cleanIcon = NormalizeDisplayIcon(displayIcon);
                                    if (cleanIcon.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && File.Exists(cleanIcon))
                                    {
                                        return cleanIcon;
                                    }
                                }
                            }
                        }
                    }
                    catch { }
                }
            }

            return null;
        }
    }
}
