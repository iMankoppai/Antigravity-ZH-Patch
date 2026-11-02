using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services;

public sealed record StatsMetrics(
    int Turns,
    int Steps,
    long InputTokens,
    long CacheTokens,
    long OutputTokens,
    double CacheHitPct,
    double TokPerSec,
    long ContextTokens,
    string Status,
    DateTimeOffset LastRequestAt,
    double AvgGrowthPerStep)
{
    public long TotalTokens => InputTokens + CacheTokens + OutputTokens;
}

// 统计状态条：只读解析本机会话日志 transcript.jsonl，算出 轮/步/tok/s/总token/缓存命中/上下文占用，
// 再通过 CDP 注入一个底部 HUD。全程只读日志、不改客户端文件，随时可移除。
public static class StatsHudService
{
    private static CancellationTokenSource? _cts;
    private static Task? _loop;
    private static readonly object Gate = new();

    private static string LoadResource(string name)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("AntigravityZhManager.Assets." + name)
            ?? throw new InvalidDataException("内嵌资源缺失：" + name);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
    private static readonly Lazy<string> StatsRenderScript = new(() => LoadResource("stats-hud.js"));

    public static bool IsActive { get { lock (Gate) { return _cts != null; } } }

    // 常驻开关：写入 %APPDATA%\Antigravity\zh-stats.json；永久安装后由 zh-bundle.attach() 启动时读取并自动显示。
    public static string StatsConfigPath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Antigravity", "zh-stats.json");

    public static bool GetEnabled()
    {
        try
        {
            if (!File.Exists(StatsConfigPath)) return false;
            using var doc = JsonDocument.Parse(File.ReadAllText(StatsConfigPath));
            return doc.RootElement.TryGetProperty("enabled", out var v) && v.ValueKind == JsonValueKind.True;
        }
        catch { return false; }
    }

    public static void SetEnabled(bool enabled)
    {
        string dir = Path.GetDirectoryName(StatsConfigPath)!;
        Directory.CreateDirectory(dir);
        string tmp = StatsConfigPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(tmp, JsonSerializer.Serialize(new { enabled }, new JsonSerializerOptions { WriteIndented = true }));
            File.Move(tmp, StatsConfigPath, true);
        }
        finally { if (File.Exists(tmp)) File.Delete(tmp); }
    }

    public static string BrainDir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".gemini", "antigravity", "brain");

    public static string? TranscriptPathFor(string? conversationId)
    {
        if (!string.IsNullOrWhiteSpace(conversationId))
        {
            var p = Path.Combine(BrainDir, conversationId!, ".system_generated", "logs", "transcript.jsonl");
            if (File.Exists(p)) return p;
        }
        try
        {
            if (!Directory.Exists(BrainDir)) return null;
            return Directory.EnumerateFiles(BrainDir, "transcript.jsonl", SearchOption.AllDirectories)
                .Select(p => new FileInfo(p))
                .OrderByDescending(f => f.LastWriteTimeUtc)
                .FirstOrDefault()?.FullName;
        }
        catch { return null; }
    }

    public static StatsMetrics? ComputeMetrics(string transcriptPath)
    {
        if (!File.Exists(transcriptPath)) return null;
        int turns = 0;
        var t = new List<(long In, long Cache, long Out, DateTimeOffset When, string Status)>();
        foreach (var line in File.ReadLines(transcriptPath))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            try
            {
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;
                string type = root.TryGetProperty("type", out var ty) && ty.ValueKind == JsonValueKind.String ? ty.GetString() ?? "" : "";
                if (type == "USER_INPUT") turns++;
                if (!root.TryGetProperty("output_tokens", out var ot) || ot.ValueKind != JsonValueKind.Number) continue;
                long i = root.TryGetProperty("input_tokens", out var iv) && iv.ValueKind == JsonValueKind.Number ? iv.GetInt64() : 0;
                long c = root.TryGetProperty("cache_read_tokens", out var cv) && cv.ValueKind == JsonValueKind.Number ? cv.GetInt64() : 0;
                long o = ot.GetInt64();
                DateTimeOffset when = default;
                if (root.TryGetProperty("created_at", out var ca) && ca.ValueKind == JsonValueKind.String)
                    DateTimeOffset.TryParse(ca.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out when);
                string status = root.TryGetProperty("status", out var st) && st.ValueKind == JsonValueKind.String ? st.GetString() ?? "" : "";
                t.Add((i, c, o, when, status));
            }
            catch { /* 跳过坏行，不影响其余统计 */ }
        }
        if (t.Count == 0) return new StatsMetrics(turns, 0, 0, 0, 0, 0, 0, 0, "", default, 0);
        long inTok = t.Sum(x => x.In), cacheTok = t.Sum(x => x.Cache), outTok = t.Sum(x => x.Out);
        long inputSide = inTok + cacheTok;
        double cacheHit = inputSide > 0 ? cacheTok * 100.0 / inputSide : 0;
        var recent = t.Skip(Math.Max(0, t.Count - 5)).ToList();
        double tokPerSec = 0;
        if (recent.Count >= 2)
        {
            var first = recent[0].When; var last = recent[recent.Count - 1].When;
            double dt = (last - first).TotalSeconds;
            long outRecent = recent.Sum(x => x.Out);
            if (dt > 0) tokPerSec = outRecent / dt;
        }
        var lastRec = t[t.Count - 1];
        long ctx = lastRec.In + lastRec.Cache;
        // 平均每步上下文增长（只取正向增量，忽略压缩造成的回落），用于估算“还有几步到压缩”。
        var growth = new List<double>();
        for (int i = Math.Max(1, t.Count - 20); i < t.Count; i++)
        {
            double delta = (t[i].In + t[i].Cache) - (t[i - 1].In + t[i - 1].Cache);
            if (delta > 0) growth.Add(delta);
        }
        double avgGrowth = growth.Count > 0 ? growth.Average() : 0;
        return new StatsMetrics(turns, t.Count, inTok, cacheTok, outTok, cacheHit, tokPerSec, ctx, lastRec.Status, lastRec.When, avgGrowth);
    }

    // 上下文的“可实际用窗口”以 Antigravity 的自动压缩上限为准（到线即压缩，历史被摘要）。
    // 实测 Gemini 3.8 Flash 在 ~256k 触发压缩（峰值 255,947）；模型理论窗口 1M 并不等于可用窗口。
    public static int ModelCompactionLimit(string? modelName)
    {
        var n = (modelName ?? "").ToLowerInvariant();
        if (Regex.IsMatch(n, "gpt-oss|gpt oss")) return 80000;   // GPT-OSS 120B：压缩上限约 80k
        if (n.Contains("claude")) return n.Contains("4.6") ? 160000 : 256000; // Claude 4.6 约 160k；5.5 系约 256k
        return 256000; // Gemini 3.8 Flash / 4 Argon 等：压缩上限 256k
    }

    // API 等价单价（USD / 1M tokens，输入/输出/缓存读）。仅作估算，非 Antigravity 订阅实际扣费。
    private static (double In, double Out, double Cache)? ModelPricing(string? modelName)
    {
        var n = (modelName ?? "").ToLowerInvariant();
        if (n.Contains("gpt-oss")) return null;                 // 无公开单价，显示 —
        if (n.Contains("gemini") && n.Contains("3.8")) return (0.75, 3.75, 0.075);
        if (n.Contains("gemini") && n.Contains("argon")) return (2.0, 10.0, 0.10);
        if (n.Contains("claude")) return n.Contains("opus") ? (4.0, 20.0, 0.20) : (2.0, 10.0, 0.20);
        return null;
    }

    internal static double? EstimateCost(StatsMetrics m, string? modelName)
    {
        var p = ModelPricing(modelName);
        if (p == null) return null;
        return (m.InputTokens * p.Value.In + m.OutputTokens * p.Value.Out + m.CacheTokens * p.Value.Cache) / 1_000_000.0;
    }

    private static string FormatCost(double? c)
    {
        if (c == null) return "—";
        if (c.Value <= 0) return "$0.00";
        if (c.Value < 0.001) return "<$0.001";
        return "$" + c.Value.ToString("0.000");
    }

    private static string FormatTokens(long n) => n >= 1_000_000_000 ? (n / 1_000_000_000.0).ToString("0.00") + "B"
        : n >= 1_000_000 ? (n / 1_000_000.0).ToString("0.0") + "M"
        : n >= 1_000 ? (n / 1_000.0).ToString("0.0") + "k"
        : n.ToString();

    private const string HudCss = """position:fixed;left:16px;bottom:56px;z-index:2147483000;display:flex;gap:16px;align-items:center;padding:6px 16px;border-radius:999px;background:rgba(15,18,26,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#cbd5e1;font:12px/1.4 "Microsoft YaHei UI",system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);pointer-events:none;flex-wrap:wrap;max-width:calc(100vw - 32px);row-gap:4px;""";

    private const string HudJs = """
(() => {
  var d = __DATA__;
  var css = __CSS__;
  var id = 'ag-stats-hud';
  var el = document.getElementById(id);
  if (!el) { el = document.createElement('div'); el.id = id; el.style.cssText = css; (document.body||document.documentElement).appendChild(el); }
  var b = function(t,c){ return '<b style="color:'+(c||'#fff')+';font-weight:600">'+t+'</b>'; };
  // 一次性挂钩 fetch，捕获 App 自己的 GetUserStatus 响应（用于配额/积分），不额外发请求。
  if (!window.__agUserStatusHook) {
    try {
      var _f = window.fetch;
      window.fetch = function() {
        var p = _f.apply(this, arguments);
        try {
          var a0 = arguments[0], url = typeof a0 === 'string' ? a0 : (a0 && a0.url) || '';
          if (url && url.indexOf('GetUserStatus') >= 0 && p && p.then) {
            p.then(function(r){ try { r.clone().arrayBuffer().then(function(ab){ try { var bb=new Uint8Array(ab); var ln=(bb[1]<<24)|(bb[2]<<16)|(bb[3]<<8)|bb[4]; var tx=new TextDecoder().decode(bb.slice(5,5+ln)); var o=JSON.parse(tx); window.__agUserStatus = o.userStatus || o; } catch(e){} }); } catch(e){} });
          }
        } catch(e){}
        return p;
      };
      window.__agUserStatusHook = true;
    } catch(e){}
  }
  var ttlMs = 5 * 60 * 1000, cacheTxt = '—', cacheColor = '#94a3b8';
  if (d.lastAt > 0) {
    var rem = ttlMs - (Date.now() - d.lastAt);
    if (rem > 0) { var mm = Math.floor(rem/60000), ss = Math.floor((rem%60000)/1000); cacheTxt = 'HOT ' + mm + ':' + (ss<10?'0':'') + ss; cacheColor = '#34d399'; }
    else cacheTxt = 'COLD';
  }
  var stepsTxt = '—';
  if (d.avgGrowth > 0 && d.ctx < d.ctxLimit) stepsTxt = '≈' + Math.max(0, Math.floor((d.ctxLimit - d.ctx) / d.avgGrowth)) + ' 步';
  var us = window.__agUserStatus, quotaTxt = '—';
  if (us) {
    var plan = (us.userTier && us.userTier.planName) || (us.planStatus && us.planStatus.planInfo && us.planStatus.planInfo.planName) || '';
    var credit = null;
    try { if (us.userTier && us.userTier.availableCredits && us.userTier.availableCredits.length) credit = us.userTier.availableCredits[0].creditAmount; } catch(e){}
    if (credit == null && us.planStatus) credit = us.planStatus.availablePromptCredits;
    if (credit != null) quotaTxt = (plan ? plan + ' ' : '') + '积分 ' + Number(credit).toLocaleString();
    else if (plan) quotaTxt = plan;
  }
  el.innerHTML = '<span>⟳ '+b(d.turns)+' 轮 · '+b(d.steps)+' 步</span>'+
    '<span>⚡ '+b(d.tokPerSec,'#38bdf8')+' tok/s</span>'+
    '<span>Σ '+b(d.totalTok)+' tok</span>'+
    '<span>命中 '+b(d.cacheHit,'#34d399')+'</span>'+
    '<span>缓存 '+b(cacheTxt,cacheColor)+'</span>'+
    '<span>上下文 '+b(d.ctx,'#fbbf24')+'/'+d.ctxLimit+' · '+d.ctxPct+'</span>'+
    '<span>距压缩 '+b(stepsTxt,'#f472b6')+'</span>'+
    '<span>成本 '+b(d.cost,'#a78bfa')+'</span>'+
    '<span>配额 '+b(quotaTxt,'#93c5fd')+'</span>'+
    '<span style="opacity:.55">'+d.status+'</span>';
  return true;
})()
""";

    private const string RemoveJs = "(() => { if (window.__agStatsRemove) { window.__agStatsRemove(); } else { var e = document.getElementById('ag-stats-hud'); if (e) e.remove(); } return true; })()";

    private static string BuildRenderJs(StatsMetrics m, int ctxLimit, double? cost)
    {
        var payload = new
        {
            cost = FormatCost(cost),
            turns = m.Turns.ToString(),
            steps = m.Steps.ToString(),
            tokPerSec = m.TokPerSec.ToString("0"),
            totalTok = FormatTokens(m.TotalTokens),
            cacheHit = m.CacheHitPct.ToString("0.0") + "%",
            ctx = FormatTokens(m.ContextTokens),
            ctxLimit = FormatTokens(ctxLimit),
            ctxPct = (ctxLimit > 0 ? m.ContextTokens * 100.0 / ctxLimit : 0).ToString("0.0") + "%",
            lastAt = m.LastRequestAt == default ? 0 : m.LastRequestAt.ToUnixTimeMilliseconds(),
            avgGrowth = Math.Round(m.AvgGrowthPerStep, 1),
            status = m.Status ?? ""
        };
        string json = JsonSerializer.Serialize(payload);
        return HudJs.Replace("__DATA__", json).Replace("__CSS__", JsonSerializer.Serialize(HudCss));
    }

    private static async Task<string> ReadModelNameAsync(Uri ws, CancellationToken token)
    {
        try
        {
            var v = await CdpHotPatcher.EvaluateAsync(ws,
                "(() => { const e = document.querySelector('[data-testid=\\\"model-selector-trigger\\\"]'); return e ? ((e.innerText||e.textContent||'').trim().split('\\n')[0]) : ''; })()",
                token);
            return v.TryGetProperty("value", out var s) && s.ValueKind == JsonValueKind.String ? s.GetString() ?? "" : "";
        }
        catch { return ""; }
    }

    private static string? ConversationIdFromUrl(string url)
    {
        var m = Regex.Match(url ?? "", "/c/([0-9a-fA-F-]{36})");
        return m.Success ? m.Groups[1].Value : null;
    }

    private static async Task RenderOnceAsync(CancellationToken token)
    {
        var pages = await CdpHotPatcher.PageTargetsAsync(token);
        var convId = pages.Count > 0 ? ConversationIdFromUrl(pages[0].Url) : null;
        var path = TranscriptPathFor(convId);
        if (path == null) return;
        var metrics = ComputeMetrics(path);
        if (metrics == null) return;
        string data = JsonSerializer.Serialize(new
        {
            turns = metrics.Turns,
            steps = metrics.Steps,
            tokPerSec = Math.Round(metrics.TokPerSec, 1),
            inTok = metrics.InputTokens,
            cacheTok = metrics.CacheTokens,
            outTok = metrics.OutputTokens,
            ctx = metrics.ContextTokens,
            avgGrowth = Math.Round(metrics.AvgGrowthPerStep, 1),
            lastAtMs = metrics.LastRequestAt == default ? 0 : metrics.LastRequestAt.ToUnixTimeMilliseconds(),
            status = metrics.Status ?? ""
        });
        string script = "if(typeof window.__agStatsRender!=='function'){" + StatsRenderScript.Value + "} if(window.__agStatsRender){window.__agStatsRender(" + data + ");}";
        foreach (var p in pages)
        {
            try { await CdpHotPatcher.EvaluateAsync(p.WebSocket, script, token); } catch { }
        }
    }

    private static async Task RunLoopAsync(CancellationToken outer)
    {
        while (!outer.IsCancellationRequested)
        {
            try
            {
                using var tick = CancellationTokenSource.CreateLinkedTokenSource(outer);
                tick.CancelAfter(TimeSpan.FromSeconds(8));
                await RenderOnceAsync(tick.Token);
            }
            catch { /* 单次失败不终止循环 */ }
            try { await Task.Delay(2000, outer); } catch { break; }
        }
    }

    public static async Task<bool> StartAsync(Action<string>? log = null)
    {
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            var pages = await CdpHotPatcher.PageTargetsAsync(timeout.Token);
            var convId = ConversationIdFromUrl(pages[0].Url);
            var path = TranscriptPathFor(convId);
            if (path == null)
            {
                log?.Invoke("📊 未找到当前会话的 transcript.jsonl，暂无法统计。");
                return false;
            }
            await RenderOnceAsync(timeout.Token);
            lock (Gate)
            {
                _cts?.Cancel();
                _cts = new CancellationTokenSource();
                _loop = Task.Run(() => RunLoopAsync(_cts.Token));
            }
            log?.Invoke($"📊 统计状态条已开启（数据源：{Path.GetFileName(Path.GetDirectoryName(Path.GetDirectoryName(Path.GetDirectoryName(path))))}）。");
            return true;
        }
        catch (Exception ex)
        {
            log?.Invoke("📊 统计状态条启动失败：" + ex.Message);
            return false;
        }
    }

    public static async Task StopAsync(Action<string>? log = null)
    {
        CancellationTokenSource? cts;
        lock (Gate) { cts = _cts; _cts = null; _loop = null; }
        cts?.Cancel();
        cts?.Dispose();
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(6));
            foreach (var p in await CdpHotPatcher.PageTargetsAsync(timeout.Token))
            {
                try { await CdpHotPatcher.EvaluateAsync(p.WebSocket, RemoveJs, timeout.Token); } catch { }
            }
        }
        catch { }
        log?.Invoke("📊 统计状态条已关闭。");
    }
}
