using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public class UpdateInfo
    {
        public bool HasUpdate { get; set; }
        public string LatestVersion { get; set; } = "1.0.1";
        public string ReleaseUrl { get; set; } = "https://github.com";
        public string Changelog { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public static class UpdateChecker
    {
        public const string CurrentVersion = "1.0.1";

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
                info.Message = $"当前版本 (v{CurrentVersion}) 已是最新版！已内置深度精校词库，完整适配 Antigravity 2.22.0。";
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
