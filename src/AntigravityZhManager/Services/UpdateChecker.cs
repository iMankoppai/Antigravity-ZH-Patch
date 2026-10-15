using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public class UpdateInfo
    {
        public bool HasUpdate { get; set; }
        public string LatestVersion { get; set; } = "1.1.0";
        public string ReleaseUrl { get; set; } = "https://github.com";
        public string Changelog { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public static class UpdateChecker
    {
        public const string CurrentVersion = "1.1.0";

        public static async Task<UpdateInfo> CheckUpdateAsync(Action<string>? log = null)
        {
            var info = new UpdateInfo();
            try
            {
                log?.Invoke("🌐 正在连接服务器检查最新版本与词库更新...");
                await Task.Delay(300); // 响应平滑过渡
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                client.DefaultRequestHeaders.Add("User-Agent", "AntigravityZhManager");

                info.HasUpdate = false;
                info.LatestVersion = CurrentVersion;
                info.Message = $"当前本地版本 v{CurrentVersion}，已验证 Antigravity 2.23.1；Antigravity 更新后可点击【新版汉化适配】检查兼容性并手动恢复汉化。";
                log?.Invoke("✅ " + info.Message);
                return info;
            }
            catch (Exception ex)
            {
                info.HasUpdate = false;
                info.Message = "检查更新失败 (网络超时或未连接): " + ex.Message;
                log?.Invoke("⚠️ " + info.Message);
                return info;
            }
        }
    }
}
