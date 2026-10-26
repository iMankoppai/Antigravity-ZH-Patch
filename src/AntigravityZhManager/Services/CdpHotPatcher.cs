using System.IO;
using System.Net.Http;
using System.Net.WebSockets;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AntigravityZhManager.Services;

public sealed class HotInjectResult
{
    public bool Success { get; set; }
    public int TermCount { get; set; }
    public string Message { get; set; } = "";
}

public static class CdpHotPatcher
{
    private static string Resource(string name)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("AntigravityZhManager.Assets." + name)
            ?? throw new InvalidDataException("内嵌资源缺失：" + name);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
    private static readonly Lazy<(string Dictionary, string Runtime, string SkillDetails, int DetailCount, int Version, int Count)> Resources = new(() =>
    {
        string dictionary = Resource("dictionaries.json"), runtime = Resource("translate.js");
        using var parsed = JsonDocument.Parse(dictionary);
        string details = Resource("skill-details.json");
        using var validatedDetails = JsonDocument.Parse(details);
        int detailCount = validatedDetails.RootElement.GetProperty("documents").GetArrayLength();
        return (dictionary, runtime, details, detailCount, int.Parse(Regex.Match(runtime, @"const patchVersion = (\d+)").Groups[1].Value), parsed.RootElement.EnumerateObject().Count());
    });

    public static (int Version, int TermCount) EmbeddedKernelInfo => (Resources.Value.Version, Resources.Value.Count);

    private static async Task<List<Uri>> TargetsAsync(CancellationToken token)
    {
        string file = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Antigravity", "DevToolsActivePort");
        var lines = await File.ReadAllLinesAsync(file, token);
        if (lines.Length == 0 || !int.TryParse(lines[0], out int port) || port < 1 || port > 65535)
            throw new InvalidDataException("调试端口暂不可用。");
        using var handler = new HttpClientHandler { AllowAutoRedirect = false, UseProxy = false };
        using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(3) };
        using var document = JsonDocument.Parse(await client.GetStringAsync($"http://127.0.0.1:{port}/json/list", token));
        var result = new List<Uri>();
        foreach (var page in document.RootElement.EnumerateArray())
        {
            if (page.GetProperty("type").GetString() != "page" ||
                !Uri.TryCreate(page.GetProperty("url").GetString(), UriKind.Absolute, out var origin) ||
                origin.Scheme != "https" || origin.Host != "127.0.0.1") continue;
            if (page.TryGetProperty("webSocketDebuggerUrl", out var endpoint) &&
                Uri.TryCreate(endpoint.GetString(), UriKind.Absolute, out var uri) &&
                uri.Scheme == "ws" && uri.Host == "127.0.0.1" && uri.Port == port) result.Add(uri);
        }
        if (result.Count == 0) throw new IOException("主应用窗口尚未就绪。");
        return result;
    }

    // CDP can interleave events and fragment a reply across WebSocket frames.
    internal static async Task<JsonElement> ReceiveResultAsync(WebSocket socket, int id, CancellationToken token)
    {
        var buffer = new byte[16384];
        while (true)
        {
            using var message = new MemoryStream();
            WebSocketReceiveResult frame;
            do
            {
                frame = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);
                if (frame.MessageType == WebSocketMessageType.Close) throw new IOException("调试连接已关闭。");
                message.Write(buffer, 0, frame.Count);
                if (message.Length > 2 * 1024 * 1024) throw new IOException("调试响应过大。");
            } while (!frame.EndOfMessage);
            using var document = JsonDocument.Parse(message.ToArray());
            var response = document.RootElement;
            if (!response.TryGetProperty("id", out var responseId) || responseId.GetInt32() != id) continue;
            if (response.TryGetProperty("error", out var error)) throw new IOException("CDP 错误：" + error);
            var result = response.GetProperty("result");
            if (result.TryGetProperty("exceptionDetails", out var exception)) throw new IOException("页面执行失败：" + exception);
            return result.GetProperty("result").Clone();
        }
    }

    private static async Task<JsonElement> EvaluateAsync(Uri target, string expression, CancellationToken token)
    {
        using var socket = new ClientWebSocket();
        await socket.ConnectAsync(target, token);
        var payload = JsonSerializer.SerializeToUtf8Bytes(new { id = 1, method = "Runtime.evaluate", @params = new { expression, returnByValue = true, awaitPromise = true } });
        await socket.SendAsync(new ArraySegment<byte>(payload), WebSocketMessageType.Text, true, token);
        return await ReceiveResultAsync(socket, 1, token);
    }

    private static string HealthExpression => $"Boolean(window.__antigravityZhPatchInstalled && window.__antigravityZhPatchVersion === {Resources.Value.Version} && window.__antigravityZhPatchDictionarySize === {Resources.Value.Count} && window.__antigravityZhSkillDetails?.documents?.length === {Resources.Value.DetailCount} && document.documentElement.lang === 'zh-CN')";

    public static async Task<bool> CheckIsHotInjectedAsync()
    {
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            foreach (var page in await TargetsAsync(timeout.Token))
            {
                var value = await EvaluateAsync(page, HealthExpression, timeout.Token);
                if (!value.TryGetProperty("value", out var healthy) || healthy.ValueKind != JsonValueKind.True) return false;
            }
            return true;
        }
        catch { return false; }
    }

    public static async Task<HotInjectResult> InjectAsync(Action<string>? log = null)
    {
        try
        {
            var resources = Resources.Value;
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var pages = await TargetsAsync(timeout.Token);
            string script = "(async () => {" +
                "if (!document.body || (document.body.childElementCount === 0 && !document.getElementById('root') && !document.querySelector('[data-testid], main, nav, header'))) throw new Error('主界面尚未就绪或结构已变化');" +
                "window.__antigravityZhPatchHotActive = true; window.__antigravityZhNativeAutoload = true;" +
                "window.__antigravityZhPatchDictionary = " + resources.Dictionary + "; window.__antigravityZhPatchDictionaryRevision = Date.now();\n" +
                "window.__antigravityZhSkillDetails = " + resources.SkillDetails + ";\n" +
                resources.Runtime + "\nfor (let i=0;i<100;i++) {if (" + HealthExpression + ") return true; await new Promise(r=>setTimeout(r,20));} throw new Error('汉化内核未完成初始化');})()";
            foreach (var page in pages)
            {
                var value = await EvaluateAsync(page, script, timeout.Token);
                if (!value.TryGetProperty("value", out var success) || success.ValueKind != JsonValueKind.True)
                    throw new IOException("页面未确认汉化成功。");
            }
            string message = $"已验证 {pages.Count} 个窗口实时汉化生效（v{resources.Version} / {resources.Count} 条，含 {resources.DetailCount} 份完整技能正文）。";
            log?.Invoke("⚡ " + message);
            return new() { Success = true, TermCount = resources.Count, Message = message };
        }
        catch (Exception ex)
        {
            string message = "热加载暂未完成：" + ex.Message;
            log?.Invoke(message);
            return new() { Message = message };
        }
    }

    public static async Task<bool> RestoreLiveWindowAsync(Action<string>? log = null)
    {
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(6));
            foreach (var page in await TargetsAsync(timeout.Token))
            {
                // Use saved originals: no conversation reload or draft loss.
                var result = await EvaluateAsync(page, "(() => { if (window.__antigravityZhPatchInstalled && typeof window.__antigravityZhPatchRestore !== 'function') throw new Error('缺少英文恢复接口'); window.__antigravityZhPatchRestore?.(); delete window.__antigravityZhPatchHotActive; delete window.__antigravityZhPatchDictionary; delete window.__antigravityZhSkillDetails; delete window.__antigravityZhNativeAutoload; return !window.__antigravityZhPatchInstalled; })()", timeout.Token);
                if (!result.TryGetProperty("value", out var ok) || ok.ValueKind != JsonValueKind.True) return false;
            }
            log?.Invoke("已恢复窗口英文，保留当前会话与输入内容。");
            return true;
        }
        catch (Exception ex) { log?.Invoke("窗口英文恢复失败：" + ex.Message); return false; }
    }
}
