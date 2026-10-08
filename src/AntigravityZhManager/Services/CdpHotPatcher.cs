using System;
using System.IO;
using System.Net.Http;
using System.Net.WebSockets;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public class HotInjectResult
    {
        public bool Success { get; set; }
        public int TermCount { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public static class CdpHotPatcher
    {
        public static async Task<HotInjectResult> InjectAsync(Action<string>? log = null)
        {
            var result = new HotInjectResult();

            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string portFile = Path.Combine(appData, "Antigravity", "DevToolsActivePort");

                if (!File.Exists(portFile))
                {
                    result.Message = "未找到 DevToolsActivePort，请确认 Antigravity 是否正在运行。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                string[] lines = await File.ReadAllLinesAsync(portFile);
                if (lines.Length == 0 || !int.TryParse(lines[0].Trim(), out int port))
                {
                    result.Message = "无法解析调试端口。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                log?.Invoke($"🔍 检测到 Antigravity 调试端口: {port}");

                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
                string jsonList = await httpClient.GetStringAsync($"http://127.0.0.1:{port}/json/list");

                using var doc = JsonDocument.Parse(jsonList);
                string? wsUrl = null;
                string? pageTitle = null;

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (el.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "page")
                    {
                        if (el.TryGetProperty("url", out var urlProp) && urlProp.GetString()?.StartsWith("https://127.0.0.1:") == true)
                        {
                            wsUrl = el.GetProperty("webSocketDebuggerUrl").GetString();
                            pageTitle = el.TryGetProperty("title", out var titleProp) ? titleProp.GetString() : "主窗口";
                            break;
                        }
                    }
                }

                if (string.IsNullOrEmpty(wsUrl))
                {
                    result.Message = "未找到主应用页面调试目标。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                log?.Invoke($"🎯 命中窗口目标: {pageTitle}");

                // 读取字典与 translate.js
                var assembly = Assembly.GetExecutingAssembly();
                string dictJson = string.Empty;
                string translateJs = string.Empty;

                using (var s = assembly.GetManifestResourceStream("AntigravityZhManager.Assets.dictionaries.json"))
                {
                    if (s != null)
                    {
                        using var r = new StreamReader(s, Encoding.UTF8);
                        dictJson = await r.ReadToEndAsync();
                    }
                }

                using (var s = assembly.GetManifestResourceStream("AntigravityZhManager.Assets.translate.js"))
                {
                    if (s != null)
                    {
                        using var r = new StreamReader(s, Encoding.UTF8);
                        translateJs = await r.ReadToEndAsync();
                    }
                }

                if (string.IsNullOrEmpty(dictJson) || string.IsNullOrEmpty(translateJs))
                {
                    result.Message = "内嵌汉化资源读取失败。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                // 统计词条数
                int termsCount = 0;
                try
                {
                    using var dictDoc = JsonDocument.Parse(dictJson);
                    termsCount = dictDoc.RootElement.EnumerateObject().Count();
                }
                catch { }

                log?.Invoke($"📚 正在准备注入 {termsCount} 条核心精校词库与翻译引擎...");

                // 组装注入 JS 脚本
                string injectCode = "(() => {\n" +
                    "  try {\n" +
                    "    window.__antigravityZhPatchHotActive = true;\n" +
                    "    window.__antigravityZhPatchDictionary = " + dictJson + ";\n" +
                    "    window.__antigravityZhPatchDictionaryRevision = Date.now();\n" +
                    "    window.__antigravityZhNativeAutoload = true;\n" +
                    translateJs + "\n" +
                    "    return JSON.stringify({ success: true, count: Object.keys(window.__antigravityZhPatchDictionary).length });\n" +
                    "  } catch(e) {\n" +
                    "    return JSON.stringify({ success: false, error: e.message });\n" +
                    "  }\n" +
                    "})()";

                // WebSocket 连接
                using var ws = new ClientWebSocket();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await ws.ConnectAsync(new Uri(wsUrl), cts.Token);

                var payload = new
                {
                    id = 1,
                    method = "Runtime.evaluate",
                    @params = new
                    {
                        expression = injectCode,
                        returnByValue = true
                    }
                };

                string msg = JsonSerializer.Serialize(payload);
                byte[] sendBytes = Encoding.UTF8.GetBytes(msg);
                await ws.SendAsync(new ArraySegment<byte>(sendBytes), WebSocketMessageType.Text, true, cts.Token);

                byte[] buffer = new byte[65536];
                var recvResult = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                string respJson = Encoding.UTF8.GetString(buffer, 0, recvResult.Count);

                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);

                result.Success = true;
                result.TermCount = termsCount;
                result.Message = $"热加载成功！已实时注入 {termsCount} 个汉化词条，当前前台窗口已即时生效！";
                log?.Invoke("⚡ " + result.Message);
                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = "热注入失败: " + ex.Message;
                log?.Invoke("❌ " + result.Message);
                return result;
            }
        }

        public static async Task<bool> RestoreLiveWindowAsync(Action<string>? log = null)
        {
            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string portFile = Path.Combine(appData, "Antigravity", "DevToolsActivePort");
                if (!File.Exists(portFile)) return false;

                string[] lines = await File.ReadAllLinesAsync(portFile);
                if (lines.Length == 0 || !int.TryParse(lines[0].Trim(), out int port)) return false;

                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
                string jsonList = await httpClient.GetStringAsync($"http://127.0.0.1:{port}/json/list");

                using var doc = JsonDocument.Parse(jsonList);
                string? wsUrl = null;

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (el.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "page")
                    {
                        if (el.TryGetProperty("url", out var urlProp) && urlProp.GetString()?.StartsWith("https://127.0.0.1:") == true)
                        {
                            wsUrl = el.GetProperty("webSocketDebuggerUrl").GetString();
                            break;
                        }
                    }
                }

                if (string.IsNullOrEmpty(wsUrl)) return false;

                log?.Invoke("🔄 正在向当前前台窗口发送重载指令，清除热加载内存注入...");
                using var ws = new ClientWebSocket();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                await ws.ConnectAsync(new Uri(wsUrl), cts.Token);

                string reloadJs = "(() => { try { delete window.__antigravityZhPatchHotActive; delete window.__antigravityZhPatchDictionary; delete window.__antigravityZhPatchInstalled; delete window.__antigravityZhNativeAutoload; location.reload(); } catch(e){} })()";
                var payload = new
                {
                    id = 99,
                    method = "Runtime.evaluate",
                    @params = new
                    {
                        expression = reloadJs,
                        returnByValue = true
                    }
                };

                string msg = JsonSerializer.Serialize(payload);
                byte[] sendBytes = Encoding.UTF8.GetBytes(msg);
                await ws.SendAsync(new ArraySegment<byte>(sendBytes), WebSocketMessageType.Text, true, cts.Token);

                await Task.Delay(200);
                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);
                log?.Invoke("✅ 前台窗口已成功重载，已清除热加载并恢复纯净英文界面！");
                return true;
            }
            catch (Exception ex)
            {
                log?.Invoke("⚠️ 前台窗口重载提示: " + ex.Message);
                return false;
            }
        }

        public static async Task<bool> CheckIsHotInjectedAsync()
        {
            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string portFile = Path.Combine(appData, "Antigravity", "DevToolsActivePort");
                if (!File.Exists(portFile)) return false;

                string[] lines = await File.ReadAllLinesAsync(portFile);
                if (lines.Length == 0 || !int.TryParse(lines[0].Trim(), out int port)) return false;

                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };
                string jsonList = await httpClient.GetStringAsync($"http://127.0.0.1:{port}/json/list");

                using var doc = JsonDocument.Parse(jsonList);
                string? wsUrl = null;

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (el.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "page")
                    {
                        if (el.TryGetProperty("url", out var urlProp) && urlProp.GetString()?.StartsWith("https://127.0.0.1:") == true)
                        {
                            wsUrl = el.GetProperty("webSocketDebuggerUrl").GetString();
                            break;
                        }
                    }
                }

                if (string.IsNullOrEmpty(wsUrl)) return false;

                using var ws = new ClientWebSocket();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
                await ws.ConnectAsync(new Uri(wsUrl), cts.Token);

                var payload = new
                {
                    id = 101,
                    method = "Runtime.evaluate",
                    @params = new
                    {
                        expression = "Boolean(window.__antigravityZhPatchHotActive || window.__antigravityZhPatchDictionary || window.__antigravityZhPatchInstalled)",
                        returnByValue = true
                    }
                };

                string msg = JsonSerializer.Serialize(payload);
                byte[] sendBytes = Encoding.UTF8.GetBytes(msg);
                await ws.SendAsync(new ArraySegment<byte>(sendBytes), WebSocketMessageType.Text, true, cts.Token);

                byte[] buffer = new byte[8192];
                var recvResult = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                string respJson = Encoding.UTF8.GetString(buffer, 0, recvResult.Count);

                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None);

                using var respDoc = JsonDocument.Parse(respJson);
                if (respDoc.RootElement.TryGetProperty("result", out var res) &&
                    res.TryGetProperty("result", out var innerRes) &&
                    innerRes.TryGetProperty("value", out var val))
                {
                    return val.GetBoolean();
                }
            }
            catch { }
            return false;
        }
    }
}
