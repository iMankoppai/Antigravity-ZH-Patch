using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.Json;

namespace AntigravityZhManager.Services
{
    public enum ArchiveKind
    {
        Unknown,
        Pristine,
        Patched
    }

    /// <summary>
    /// 只读的官方基线清单。数据来自 localization/client-baselines.json，
    /// 以 EmbeddedResource 形式随程序发布，用于识别：
    ///   - 当前归档是官方原版、本项目已知补丁版，还是未知版本；
    ///   - 备份是否确实是该客户端版本的官方原版。
    /// 清单缺失或无法解析时不抛异常，一律按“未知”处理，由调用方决定是否拒绝。
    /// </summary>
    public static class BaselineManifest
    {
        public const string ResourceName = "AntigravityZhManager.localization.client-baselines.json";

        private sealed class Entry
        {
            public string ProductVersion = string.Empty;
            public string? PristineSha256;
            public readonly List<string> KnownPatched = new();
            public readonly Dictionary<string, bool> RequiredEntries = new(StringComparer.OrdinalIgnoreCase);
            public readonly List<(string Target, string Text, int Count)> RequiredAnchors = new();
            public readonly List<string> MissingTargets = new();
        }

        private static readonly Lazy<List<Entry>> Cached = new(LoadEntries, isThreadSafe: true);

        private static List<Entry> LoadEntries()
        {
            var entries = new List<Entry>();
            try
            {
                using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName);
                if (stream == null) return entries;
                using var reader = new StreamReader(stream);
                using var doc = JsonDocument.Parse(reader.ReadToEnd());
                if (!doc.RootElement.TryGetProperty("baselines", out var baselines)) return entries;
                foreach (var item in baselines.EnumerateArray())
                {
                    var entry = new Entry
                    {
                        ProductVersion = item.TryGetProperty("productVersion", out var v) ? (v.GetString() ?? string.Empty) : string.Empty,
                    };
                    if (item.TryGetProperty("pristine", out var pristine) && pristine.TryGetProperty("sha256", out var ph))
                        entry.PristineSha256 = ph.GetString();
                    if (item.TryGetProperty("knownPatchedSha256", out var patched) && patched.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var p in patched.EnumerateArray())
                            if (p.TryGetProperty("sha256", out var ps) && ps.GetString() is string s) entry.KnownPatched.Add(s);
                    }
                    if (item.TryGetProperty("requiredEntries", out var req) && req.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var prop in req.EnumerateObject())
                            entry.RequiredEntries[prop.Name] = prop.Value.ValueKind == JsonValueKind.True;
                    }
                    if (item.TryGetProperty("requiredAnchors", out var anchors) && anchors.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var a in anchors.EnumerateArray())
                        {
                            entry.RequiredAnchors.Add((
                                a.TryGetProperty("target", out var t) ? (t.GetString() ?? string.Empty) : string.Empty,
                                a.TryGetProperty("text", out var tx) ? (tx.GetString() ?? string.Empty) : string.Empty,
                                a.TryGetProperty("count", out var c) && c.TryGetInt32(out var ci) ? ci : -1));
                        }
                    }
                    if (item.TryGetProperty("missingTargets", out var mt) && mt.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var m in mt.EnumerateArray()) if (m.GetString() is string ms) entry.MissingTargets.Add(ms);
                    }
                    entries.Add(entry);
                }
            }
            catch
            {
                // 清单损坏时按“无基线”处理，绝不因清单问题误判为可安装。
            }
            return entries;
        }

        public static IReadOnlyList<string> KnownVersions()
        {
            var list = new List<string>();
            foreach (var e in Cached.Value) list.Add(e.ProductVersion);
            return list;
        }

        private static Entry? FindByVersion(string? version)
        {
            if (string.IsNullOrEmpty(version)) return null;
            foreach (var e in Cached.Value)
                if (string.Equals(e.ProductVersion, version, StringComparison.OrdinalIgnoreCase)) return e;
            return null;
        }

        private static Entry? FindBySha(string sha256)
        {
            foreach (var e in Cached.Value)
            {
                if (e.PristineSha256 == sha256) return e;
                if (e.KnownPatched.Contains(sha256)) return e;
            }
            return null;
        }

        /// <summary>判断归档哈希属于哪一类；无法识别时返回 Unknown。</summary>
        public static ArchiveKind Classify(string sha256)
        {
            foreach (var e in Cached.Value)
            {
                if (e.PristineSha256 == sha256) return ArchiveKind.Pristine;
                if (e.KnownPatched.Contains(sha256)) return ArchiveKind.Patched;
            }
            return ArchiveKind.Unknown;
        }

        public static bool TryGetVersionForSha(string sha256, out string version)
        {
            var e = FindBySha(sha256);
            version = e?.ProductVersion ?? string.Empty;
            return e != null;
        }

        public static bool IsKnownPristine(string sha256) => Classify(sha256) == ArchiveKind.Pristine;

        /// <summary>该客户端版本是否已登记基线。</summary>
        public static bool HasVersion(string? version) => FindByVersion(version) != null;

        /// <summary>该客户端版本登记的官方原版哈希；未登记时返回 null。</summary>
        public static string? PristineForVersion(string? version) => FindByVersion(version)?.PristineSha256;

        /// <summary>
        /// 校验备份是否属于指定客户端版本的官方原版。
        /// 返回 null 表示通过，否则返回拒绝原因。
        /// </summary>
        public static string? VerifyBackup(string? clientVersion, string backupSha256)
        {
            var entry = FindByVersion(clientVersion);
            if (entry == null)
                return $"基线清单中没有客户端版本 {clientVersion ?? "（未知）"}；拒绝使用无法核对的备份。";
            if (string.IsNullOrEmpty(entry.PristineSha256))
                return $"基线清单缺少 {clientVersion} 的官方原版哈希；无法核对备份，拒绝继续。";
            if (!string.Equals(entry.PristineSha256, backupSha256, StringComparison.OrdinalIgnoreCase))
                return $"备份哈希与 {clientVersion} 登记的官方原版不一致（可能来自其他版本）。已拒绝覆盖，未修改任何文件。";
            return null;
        }

        /// <summary>
        /// 安装前判定当前归档是否可安全改写。返回 null 表示通过。
        /// </summary>
        public static string? VerifyInstallable(string? clientVersion, string currentSha256, bool backupExists, bool isProjectOutput = false)
        {
            var entry = FindByVersion(clientVersion);
            if (entry == null)
                return $"当前客户端版本 {clientVersion ?? "（未知）"} 不在适配清单中（已知版本：{string.Join(", ", KnownVersions())}）。请先完成该版本的适配，已停止写入。";

            var kind = Classify(currentSha256);
            // 同一版内核会因安装开关组合产出不同哈希，无法逐一登记；带本项目内核
            // 注入标记的归档按“已知识别的补丁版”处理，避免切换开关后被误拒。
            if (kind == ArchiveKind.Unknown && isProjectOutput)
                kind = ArchiveKind.Patched;
            if (kind == ArchiveKind.Unknown)
            {
                var shortSha = currentSha256.Length > 12 ? currentSha256[..12] : currentSha256;
                return $"当前 app.asar 既不是 {clientVersion} 的官方原版，也不是本项目已知的补丁版（哈希 {shortSha}…）。可能已被其他工具修改，已停止写入。";
            }

            if (entry.MissingTargets.Count > 0)
                return $"基线清单显示 {clientVersion} 缺少注入目标：{string.Join(", ", entry.MissingTargets)}。已停止写入。";

            if (!backupExists && kind == ArchiveKind.Patched)
                return "缺少官方原版备份，而当前归档已是补丁版，无法重建官方基线。请先取得对应版本的原始 app.asar，已停止写入。";

            return null;
        }
    }
}
