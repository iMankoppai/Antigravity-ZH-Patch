using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;

namespace AntigravityZhManager.Services;

// Read-only inspection shared by the watcher, installer and restore path.
public sealed class ArchiveSnapshot
{
    public required byte[] Bytes { get; init; }
    public required JsonObject Header { get; init; }
    public required JsonObject Package { get; init; }
    public required Dictionary<string, byte[]> Files { get; init; }
    public required string Version { get; init; }
    public required string Sha256 { get; init; }
    public bool IsPatched => Files.ContainsKey("dist/zh-bundle.js") &&
        Text("dist/main.js").Contains("require('./zh-bundle.js').attach") &&
        Text("dist/utils.js").Contains("require('./zh-bundle.js').attach");
    public JsonObject? Receipt => Header["antigravityZh"] as JsonObject;
    public string Text(string name) => Files.TryGetValue(name, out var bytes) ? Encoding.UTF8.GetString(bytes) : "";
    public static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    public static ArchiveSnapshot Read(byte[] bytes)
    {
        if (bytes.Length < 16) throw new InvalidDataException("ASAR 文件不完整。");
        uint total = BitConverter.ToUInt32(bytes, 4), length = BitConverter.ToUInt32(bytes, 12);
        if (BitConverter.ToUInt32(bytes, 0) != 4 || total < 8 || total > bytes.Length - 8 ||
            BitConverter.ToUInt32(bytes, 8) != total - 4 || length > total - 8)
            throw new InvalidDataException("ASAR 文件头无效。");
        var header = JsonNode.Parse(Encoding.UTF8.GetString(bytes, 16, checked((int)length))) as JsonObject
            ?? throw new InvalidDataException("ASAR 缺少头部。");
        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        int start = checked(8 + (int)total);
        var ranges = new List<(long Start, long End)>();
        void Walk(JsonObject directory, string prefix)
        {
            foreach (var pair in directory)
            {
                if (pair.Key is "." or ".." || pair.Key.Contains('/') || pair.Key.Contains('\\'))
                    throw new InvalidDataException("ASAR 条目名无效。");
                var node = pair.Value as JsonObject ?? throw new InvalidDataException("ASAR 条目无效。");
                string name = prefix + pair.Key;
                if (node["files"] is JsonObject children) { Walk(children, name + "/"); continue; }
                if (node["unpacked"]?.GetValue<bool>() == true || node.ContainsKey("link")) continue;
                if (!long.TryParse(node["offset"]?.ToString(), out long offset) ||
                    !int.TryParse(node["size"]?.ToString(), out int size) ||
                    offset < 0 || size < 0 || offset > bytes.Length - start || size > bytes.Length - start - offset)
                    throw new InvalidDataException("ASAR 条目边界无效：" + name);
                var data = bytes.AsSpan(checked(start + (int)offset), size).ToArray();
                if (node["integrity"] is JsonObject integrity && integrity["hash"]?.ToString() is string hash &&
                    !string.Equals(hash, Hash(data), StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("ASAR 条目校验失败：" + name);
                ranges.Add((offset, offset + size));
                files.Add(name, data);
            }
        }
        Walk(header["files"] as JsonObject ?? throw new InvalidDataException("ASAR 缺少 files。"), "");
        long previous = 0;
        foreach (var range in ranges.OrderBy(r => r.Start).ThenBy(r => r.End))
        {
            if (range.Start < previous) throw new InvalidDataException("ASAR 条目重叠。");
            previous = range.End;
        }
        if (!files.TryGetValue("package.json", out var packageBytes)) throw new InvalidDataException("ASAR 缺少 package.json。");
        var package = JsonNode.Parse(Encoding.UTF8.GetString(packageBytes).TrimStart('\uFEFF')) as JsonObject
            ?? throw new InvalidDataException("package.json 无效。");
        string version = package["version"]?.ToString() ?? "";
        if (!System.Version.TryParse(version, out var parsed) || parsed.Build < 0 || parsed.Revision >= 0)
            throw new InvalidDataException("客户端版本号不是稳定的三段版本。");
        return new ArchiveSnapshot { Bytes = bytes, Header = header, Package = package, Files = files, Version = version, Sha256 = Hash(bytes) };
    }
}

public sealed record CompatibilityReference(string Version, string PackageSignature, IReadOnlyDictionary<string, string> Targets);
public sealed record CompatibilityDecision(bool Allowed, string ReferenceVersion, string Reason);

public static class ArchiveCompatibility
{
    public static readonly string[] Targets = { "dist/ipcHandlers.js", "dist/main.js", "dist/utils.js", "dist/tray.js", "dist/ideInstall/wizard.js" };
    private static readonly Lazy<List<CompatibilityReference>> References = new(LoadReferences);

    public static string PackageSignature(JsonObject package)
    {
        var dependencies = package["dependencies"] as JsonObject ?? new JsonObject();
        string text = package["name"] + "\n" + package["main"] + "\n" +
            string.Join("\n", dependencies.OrderBy(p => p.Key, StringComparer.Ordinal).Select(p => p.Key + "=" + p.Value));
        return ArchiveSnapshot.Hash(Encoding.UTF8.GetBytes(text));
    }

    private static List<CompatibilityReference> LoadReferences()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(BaselineManifest.ResourceName)
            ?? throw new InvalidDataException("基线清单缺失。");
        using var reader = new StreamReader(stream);
        var root = JsonNode.Parse(reader.ReadToEnd())!;
        var result = new List<CompatibilityReference>();
        foreach (var entry in root["baselines"]!.AsArray())
        {
            if (entry?["compatibility"] is not JsonObject compatibility || compatibility["targetSha256"] is not JsonObject targets) continue;
            result.Add(new(entry["productVersion"]!.ToString(), compatibility["packageSignatureSha256"]!.ToString(),
                targets.ToDictionary(t => t.Key, t => t.Value!.ToString(), StringComparer.Ordinal)));
        }
        return result;
    }

    public static CompatibilityDecision CheckPristine(ArchiveSnapshot archive, bool allowCompatibleUpdates,
        IEnumerable<CompatibilityReference>? references = null)
    {
        if (archive.Files.ContainsKey("dist/zh-bundle.js") || archive.Header.ContainsKey("antigravityZh"))
            return new(false, "", "当前文件带有补丁标记，不能作为新版原件。");
        if (archive.Package["name"]?.ToString() != "antigravity" || archive.Package["main"]?.ToString() != "dist/main.js")
            return new(false, "", "不是预期的 Antigravity 归档。");
        string? known = BaselineManifest.PristineForVersion(archive.Version);
        if (known != null)
            return known == archive.Sha256 ? new(true, archive.Version, "已验证的官方原版") : new(false, "", "已登记版本的归档哈希不匹配，停止自动修复。");
        if (!allowCompatibleUpdates) return new(false, "", "该版本未登记；自动兼容模式未开启。");
        var version = System.Version.Parse(archive.Version);
        foreach (var reference in references ?? References.Value)
        {
            var supported = System.Version.Parse(reference.Version);
            if (version.Major != supported.Major || version.Minor != supported.Minor || version.Build <= supported.Build) continue;
            if (PackageSignature(archive.Package) != reference.PackageSignature) continue;
            if (Targets.All(t => archive.Files.TryGetValue(t, out var content) &&
                reference.Targets.TryGetValue(t, out string? hash) && ArchiveSnapshot.Hash(content) == hash))
                return new(true, reference.Version, "与 " + reference.Version + " 原生模块完全一致的兼容小版本");
        }
        return new(false, "", "新版原生模块或依赖已变化，需要重新适配；原文件保持不变。");
    }

    public static CompatibilityDecision CheckInstalled(ArchiveSnapshot current, ArchiveSnapshot? backup, bool allowCompatibleUpdates)
    {
        if (!current.IsPatched) return CheckPristine(current, allowCompatibleUpdates);
        if (backup == null || backup.Version != current.Version) return new(false, "", "已安装补丁缺少同版本原件备份。");
        var decision = CheckPristine(backup, allowCompatibleUpdates);
        if (!decision.Allowed) return decision;
        if (current.Receipt is JsonObject receipt)
        {
            if (receipt["schema"]?.GetValue<int>() != 1 || receipt["version"]?.ToString() != current.Version || receipt["pristineSha256"]?.ToString() != backup.Sha256)
                return new(false, "", "备份与安装时记录的版本/哈希不匹配。");
        }
        else if (!BaselineManifest.HasVersion(current.Version)) return new(false, "", "未知补丁版缺少安装记录，无法核对备份。");
        return decision;
    }
}
