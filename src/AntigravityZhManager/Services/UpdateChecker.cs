using System;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public class UpdateInfo
    {
        public bool HasUpdate { get; set; }
        public string LatestVersion { get; set; } = UpdateChecker.CurrentVersion;
        public string ReleaseUrl { get; set; } = UpdateChecker.ProjectReleasesUrl;
        public string ReleaseTitle { get; set; } = string.Empty;
        public string Changelog { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public string DownloadFileName { get; set; } = string.Empty;
        public long DownloadSize { get; set; }
        public string DownloadSha256 { get; set; } = string.Empty;
    }

    public static class UpdateChecker
    {
        public const string CurrentVersion = "1.2.0";
        public const string ProjectReleasesUrl = "https://github.com/iMankoppai/Antigravity-ZH-Patch/releases";
        private const string GitHubApiUrl = "https://api.github.com/repos/iMankoppai/Antigravity-ZH-Patch/releases/latest";
        private const string FallbackMetadataUrl = "https://raw.githubusercontent.com/iMankoppai/Antigravity-ZH-Patch/main/dist/release-metadata.json";
        private const string JsdelivrFallbackUrl = "https://cdn.jsdelivr.net/gh/iMankoppai/Antigravity-ZH-Patch@main/dist/release-metadata.json";

        public static async Task<UpdateInfo> CheckUpdateAsync(Action<string>? log = null)
        {
            var info = new UpdateInfo();
            try
            {
                log?.Invoke("🌐 正在连接服务器检查最新版本与更新...");
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(6) };
                client.DefaultRequestHeaders.Add("User-Agent", $"AntigravityZhManager/{CurrentVersion}");
                client.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");

                bool fetched = false;

                // 1. 优先尝试从 GitHub Releases 官方接口获取最新发布
                try
                {
                    using var response = await client.GetAsync(GitHubApiUrl);
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(json);
                        var root = doc.RootElement;

                        string rawTag = root.TryGetProperty("tag_name", out var tagElem) ? tagElem.GetString() ?? "" : "";
                        string name = root.TryGetProperty("name", out var nameElem) ? nameElem.GetString() ?? "" : "";
                        string htmlUrl = root.TryGetProperty("html_url", out var urlElem) ? urlElem.GetString() ?? "" : "";
                        string body = root.TryGetProperty("body", out var bodyElem) ? bodyElem.GetString() ?? "" : "";

                        ApplyReleaseInfo(info, rawTag, name, htmlUrl, body, root);
                        fetched = true;
                    }
                }
                catch (Exception ex)
                {
                    log?.Invoke($"ℹ️ GitHub API 连接受限 ({ex.Message})，正在尝试备用元数据通道...");
                }

                // 2. 备用通道：若 GitHub API 受限，尝试读取仓库发布的元数据清单
                if (!fetched)
                {
                    string[] fallbacks = { FallbackMetadataUrl, JsdelivrFallbackUrl };
                    foreach (var url in fallbacks)
                    {
                        try
                        {
                            using var response = await client.GetAsync(url);
                            if (response.IsSuccessStatusCode)
                            {
                                var json = await response.Content.ReadAsStringAsync();
                                using var doc = JsonDocument.Parse(json);
                                var root = doc.RootElement;

                                string ver = root.TryGetProperty("version", out var vElem) ? vElem.GetString() ?? "" : "";
                                if (!string.IsNullOrEmpty(ver))
                                {
                                    string htmlUrl = $"{ProjectReleasesUrl}/tag/v{ver}";
                                    string zipName = root.TryGetProperty("zip", out var zElem) ? zElem.GetString() ?? "" : $"Antigravity-ZH-{ver}-Windows-x64.zip";
                                    long zipBytes = root.TryGetProperty("zipBytes", out var zbElem) ? zbElem.GetInt64() : 0;
                                    string zipSha = root.TryGetProperty("zipSha256", out var zsElem) ? zsElem.GetString() ?? "" : "";

                                    ApplyReleaseInfo(info, ver, $"Antigravity 汉化管理器 v{ver}", htmlUrl, "详情请查看 GitHub Release 发布页面。");
                                    info.DownloadUrl = $"{ProjectReleasesUrl}/download/v{ver}/{zipName}";
                                    info.DownloadFileName = zipName;
                                    info.DownloadSize = zipBytes;
                                    info.DownloadSha256 = zipSha;

                                    fetched = true;
                                    break;
                                }
                            }
                        }
                        catch
                        {
                            // 继续尝试下一备用源
                        }
                    }
                }

                if (!fetched)
                {
                    info.HasUpdate = false;
                    info.Message = "检查更新失败：无法连接到版本服务器。请检查网络，或直接前往 GitHub Releases 页面查看。";
                    info.ReleaseUrl = ProjectReleasesUrl;
                    log?.Invoke("⚠️ " + info.Message);
                    return info;
                }

                if (info.HasUpdate)
                {
                    log?.Invoke($"🎉 发现新版本：v{info.LatestVersion}！");
                }
                else
                {
                    info.Message = $"当前版本 (v{CurrentVersion}) 已是最新版！已适配 Antigravity 2.24.0。";
                    log?.Invoke("✅ " + info.Message);
                }

                return info;
            }
            catch (Exception ex)
            {
                info.HasUpdate = false;
                info.Message = "检查更新异常 (网络超时或未连接): " + ex.Message;
                info.ReleaseUrl = ProjectReleasesUrl;
                log?.Invoke("⚠️ " + info.Message);
                return info;
            }
        }

        private static void ApplyReleaseInfo(UpdateInfo info, string rawTag, string name, string htmlUrl, string body, JsonElement? rootElem = null)
        {
            string cleanTag = rawTag.TrimStart('v', 'V').Trim();
            info.LatestVersion = cleanTag;
            info.ReleaseTitle = name;
            info.ReleaseUrl = !string.IsNullOrWhiteSpace(htmlUrl) ? htmlUrl : $"{ProjectReleasesUrl}/tag/v{cleanTag}";
            info.Changelog = body;

            info.HasUpdate = CompareVersions(cleanTag, CurrentVersion) > 0;

            if (rootElem.HasValue && rootElem.Value.TryGetProperty("assets", out var assetsElem) && assetsElem.ValueKind == JsonValueKind.Array)
            {
                string? exeUrl = null, exeName = null;
                long exeSize = 0;
                string? zipUrl = null, zipName = null;
                long zipSize = 0;

                foreach (var asset in assetsElem.EnumerateArray())
                {
                    string aName = asset.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                    string aUrl = asset.TryGetProperty("browser_download_url", out var u) ? u.GetString() ?? "" : "";
                    long aSize = asset.TryGetProperty("size", out var s) ? s.GetInt64() : 0;

                    if (aName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    {
                        exeUrl = aUrl;
                        exeName = aName;
                        exeSize = aSize;
                    }
                    else if (aName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        zipUrl = aUrl;
                        zipName = aName;
                        zipSize = aSize;
                    }
                }

                if (!string.IsNullOrEmpty(exeUrl))
                {
                    info.DownloadUrl = exeUrl;
                    info.DownloadFileName = exeName ?? "Antigravity汉化管理器.exe";
                    info.DownloadSize = exeSize;
                }
                else if (!string.IsNullOrEmpty(zipUrl))
                {
                    info.DownloadUrl = zipUrl;
                    info.DownloadFileName = zipName ?? $"Antigravity-ZH-{cleanTag}-Windows-x64.zip";
                    info.DownloadSize = zipSize;
                }
            }

            if (string.IsNullOrEmpty(info.DownloadUrl))
            {
                info.DownloadUrl = $"{ProjectReleasesUrl}/download/v{cleanTag}/Antigravity-ZH-{cleanTag}-Windows-x64.zip";
                info.DownloadFileName = $"Antigravity-ZH-{cleanTag}-Windows-x64.zip";
            }

            if (info.HasUpdate)
            {
                var changelogPreview = body;
                if (!string.IsNullOrWhiteSpace(changelogPreview) && changelogPreview.Length > 250)
                {
                    changelogPreview = changelogPreview.Substring(0, 250) + "...";
                }

                info.Message = $"🎉 发现新版本：v{cleanTag}！（当前本地版本: v{CurrentVersion}）\n\n" +
                               (!string.IsNullOrWhiteSpace(name) ? $"【标题】{name}\n\n" : "") +
                               (!string.IsNullOrWhiteSpace(changelogPreview) ? $"【更新说明】\n{changelogPreview}\n" : "");
            }
        }

        public static int CompareVersions(string vA, string vB)
        {
            if (string.IsNullOrWhiteSpace(vA) && string.IsNullOrWhiteSpace(vB)) return 0;
            if (string.IsNullOrWhiteSpace(vA)) return -1;
            if (string.IsNullOrWhiteSpace(vB)) return 1;

            string cleanA = Regex.Match(vA, @"\d+(\.\d+)+").Value;
            string cleanB = Regex.Match(vB, @"\d+(\.\d+)+").Value;

            if (Version.TryParse(cleanA, out var verA) && Version.TryParse(cleanB, out var verB))
            {
                return verA.CompareTo(verB);
            }

            return string.Compare(vA, vB, StringComparison.OrdinalIgnoreCase);
        }
    }
}
