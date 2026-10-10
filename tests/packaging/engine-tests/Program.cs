using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using AntigravityZhManager.Services;

// 引擎侧回归：
//   A. 基线清单判定（安装允许/拒绝、还原允许/拒绝）
//   B. ASAR 临时归档回读校验（合法通过、各类损坏拒绝）
int failures = 0;
void Check(string name, bool ok, string detail = "")
{
    Console.WriteLine($"[{(ok ? "PASS" : "FAIL")}] {name}{(detail.Length > 0 ? " - " + detail : "")}");
    if (!ok) failures++;
}

// ---------- A. 基线清单判定 ----------
var knownVersions = BaselineManifest.KnownVersions();
Check("清单已加载", knownVersions.Count > 0, string.Join(", ", knownVersions));

string pristineSha = "", patchedSha = "";
string version = knownVersions.Count > 0 ? knownVersions[0] : "";
var dir = new DirectoryInfo(AppContext.BaseDirectory);
string? manifestPath = null;
while (dir != null)
{
    var candidate = Path.Combine(dir.FullName, "localization", "client-baselines.json");
    if (File.Exists(candidate)) { manifestPath = candidate; break; }
    dir = dir.Parent;
}
if (manifestPath != null)
{
    using var doc = JsonDocument.Parse(File.ReadAllText(manifestPath));
    foreach (var b in doc.RootElement.GetProperty("baselines").EnumerateArray())
    {
        if (b.GetProperty("productVersion").GetString() != version) continue;
        pristineSha = b.GetProperty("pristine").GetProperty("sha256").GetString() ?? "";
        foreach (var p in b.GetProperty("knownPatchedSha256").EnumerateArray())
            patchedSha = p.GetProperty("sha256").GetString() ?? "";
    }
}
Check("取得官方原版向量", pristineSha.Length == 64, pristineSha[..Math.Min(12, pristineSha.Length)]);
Check("取得已知补丁版向量", patchedSha.Length == 64, patchedSha[..Math.Min(12, patchedSha.Length)]);
Check("官方原版被识别为 Pristine", BaselineManifest.Classify(pristineSha) == ArchiveKind.Pristine);
Check("已知补丁版被识别为 Patched", BaselineManifest.Classify(patchedSha) == ArchiveKind.Patched);
Check("随机哈希被识别为 Unknown", BaselineManifest.Classify(new string('a', 64)) == ArchiveKind.Unknown);
Check("已知版本 + 官方原版 + 有备份 -> 允许", BaselineManifest.VerifyInstallable(version, pristineSha, true) == null);
Check("已知版本 + 已知补丁版 + 有备份 -> 允许", BaselineManifest.VerifyInstallable(version, patchedSha, true) == null);
Check("未知版本 -> 拒绝", BaselineManifest.VerifyInstallable("9.9.9", pristineSha, true) != null);
Check("未知归档哈希 -> 拒绝", BaselineManifest.VerifyInstallable(version, new string('b', 64), true) != null);
Check("补丁版但无备份 -> 拒绝", BaselineManifest.VerifyInstallable(version, patchedSha, false) != null);
Check("未登记哈希但带本项目内核标记 -> 允许", BaselineManifest.VerifyInstallable(version, new string('c', 64), true, true) == null);
Check("未登记哈希且无本项目标记 -> 拒绝", BaselineManifest.VerifyInstallable(version, new string('c', 64), true, false) != null);
Check("未登记哈希 + 带标记但无备份 -> 拒绝", BaselineManifest.VerifyInstallable(version, new string('c', 64), false, true) != null);
Check("错版备份（用已安装哈希冒充备份）-> 拒绝", BaselineManifest.VerifyBackup(version, patchedSha) != null);
Check("正确版本的官方原版备份 -> 允许", BaselineManifest.VerifyBackup(version, pristineSha) == null);
Check("未知客户端版本 -> 拒绝还原", BaselineManifest.VerifyBackup("9.9.9", pristineSha) != null);
Check("无版本信息 -> 拒绝还原", BaselineManifest.VerifyBackup(null, pristineSha) != null);

// ---------- B. ASAR 临时归档回读校验 ----------
static byte[] BuildArchive(Dictionary<string, byte[]> files, List<string> order)
{
    var headerFiles = new JsonObject();
    long cur = 0;
    var payload = new List<byte>();
    foreach (var name in order)
    {
        var data = files[name];
        var hash = AsarArchiveVerifier.Sha256(data);
        headerFiles[name] = new JsonObject
        {
            ["size"] = data.Length,
            ["offset"] = cur.ToString(),
            ["integrity"] = new JsonObject
            {
                ["algorithm"] = "SHA256",
                ["hash"] = hash,
                ["blockSize"] = 4194304,
                ["blocks"] = new JsonArray { hash }
            }
        };
        payload.AddRange(data);
        cur += data.Length;
    }
    var root = new JsonObject { ["files"] = headerFiles };
    var json = Encoding.UTF8.GetBytes(root.ToJsonString());
    int headerSize = ((4 + json.Length + 3) / 4) * 4;
    var header = new byte[4 + headerSize];
    BitConverter.GetBytes((uint)headerSize).CopyTo(header, 0);
    BitConverter.GetBytes((uint)json.Length).CopyTo(header, 4);
    json.CopyTo(header, 8);
    var prefix = new byte[8];
    BitConverter.GetBytes(4u).CopyTo(prefix, 0);
    BitConverter.GetBytes((uint)header.Length).CopyTo(prefix, 4);
    var outBytes = new List<byte>();
    outBytes.AddRange(prefix); outBytes.AddRange(header); outBytes.AddRange(payload);
    return outBytes.ToArray();
}

var orderList = new List<string> { "a.js", "b.js" };
var contents = new Dictionary<string, byte[]>
{
    ["a.js"] = Encoding.UTF8.GetBytes("alpha"),
    ["b.js"] = Encoding.UTF8.GetBytes("beta"),
};
var tempDir = Path.Combine(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location)!, "verify-tmp-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(tempDir);
async Task<(bool ok, string err)> TryVerify(string name, byte[] bytes, Dictionary<string, byte[]> plan, List<string> order, Dictionary<string, byte[]>? original = null)
{
    var tmp = Path.Combine(tempDir, name);
    await File.WriteAllBytesAsync(tmp, bytes);
    try { await AsarArchiveVerifier.VerifyAsync(tmp, plan, order, original ?? plan, null); return (true, ""); }
    catch (Exception ex) { return (false, ex.Message); }
}

var good = BuildArchive(contents, orderList);
var r1 = await TryVerify("good.asar", good, contents, orderList);
Check("合法临时归档通过", r1.ok, r1.err);
var r2 = await TryVerify("trunc.asar", good.AsSpan(0, good.Length - 3).ToArray(), contents, orderList);
Check("截断归档被拒绝", !r2.ok, r2.err);
var wrongPlan = new Dictionary<string, byte[]> { ["a.js"] = Encoding.UTF8.GetBytes("ALPHA"), ["b.js"] = contents["b.js"] };
var r3 = await TryVerify("wrongcontent.asar", good, wrongPlan, orderList);
Check("内容与计划不符被拒绝", !r3.ok, r3.err);
var r4 = await TryVerify("missingentry.asar", good, contents, new List<string> { "a.js" });
Check("条目集合不一致被拒绝", !r4.ok, r4.err);
var r5 = await TryVerify("partialplan.asar", good, new Dictionary<string, byte[]> { ["a.js"] = contents["a.js"], ["z-missing.js"] = Encoding.UTF8.GetBytes("x") }, orderList, contents);
Check("计划改动数不符被拒绝", !r5.ok, r5.err);
var badIntegrity = BuildArchive(contents, orderList);
badIntegrity[badIntegrity.Length - 1] ^= 0xFF;
var r6 = await TryVerify("badhash.asar", badIntegrity, contents, orderList);
Check("完整性块不匹配被拒绝", !r6.ok, r6.err);
try { Directory.Delete(tempDir, true); } catch { /* 清理失败不影响校验结论 */ }

// ---------- C. 旧文件清理的归属校验 ----------
// CleanLegacyFiles 只删除“能证明归本项目所有”的对象，未知内容必须保留。
var cleanRoot = Path.Combine(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location)!, "clean-tmp-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(cleanRoot);

// 1) 无法确认归属的脚本必须保留
var foreignScript = Path.Combine(cleanRoot, "install.ps1");
await File.WriteAllTextAsync(foreignScript, "# 用户自己的脚本，与本项目无关\nWrite-Host hello\n");
// 2) 可确认归属的脚本应被清理（内容含项目标记）
var ownedScript = Path.Combine(cleanRoot, "restore.ps1");
await File.WriteAllTextAsync(ownedScript, "# AntigravityZhManager 恢复脚本\nRestore-Item app.asar.bak\n");
// 3) 带项目标记的旧目录应被清理
var markedDir = Path.Combine(cleanRoot, "中文补丁");
Directory.CreateDirectory(markedDir);
await File.WriteAllTextAsync(Path.Combine(markedDir, "README-中文补丁.txt"), "本项目旧版外部补丁目录");
// 4) 无关目录不得被触碰
var foreignDir = Path.Combine(cleanRoot, "unknown-extra");
Directory.CreateDirectory(foreignDir);

var cleanResult = LegacyCleaner.Clean(cleanRoot, null);
Check("清理返回成功", cleanResult.Success, cleanResult.Message);
Check("无法确认归属的脚本被保留", File.Exists(foreignScript));
Check("可确认归属的脚本被清理", !File.Exists(ownedScript));
Check("带项目标记的旧目录被清理", !Directory.Exists(markedDir));
Check("无关目录未受影响", Directory.Exists(foreignDir));

// 5) 无效目录必须被拒绝而不是抛异常
var invalidResult = LegacyCleaner.Clean(Path.Combine(cleanRoot, "does-not-exist"), null);
Check("无效安装目录被拒绝", !invalidResult.Success, invalidResult.Message);
try { Directory.Delete(cleanRoot, true); } catch { }

// ---------- C. 真实补丁器安装演习 ----------
// 回归目标：回读校验曾用“改写后的新偏移”去读旧归档字节，导致任何真实安装都在
// 校验阶段误报越界（icon.png）而无法安装。该缺陷只在完整安装路径上暴露，
// 因此这里用官方原版归档的副本执行一次真实安装。
{
    string pristine = Environment.GetEnvironmentVariable("ZH_PRISTINE_ASAR") ?? "";
    if (string.IsNullOrEmpty(pristine))
    {
        foreach (var candidate in new[]
        {
            @"D:\Antigravity\resources\app.asar.bak",
            @"D:\Antigravity\resources\app.asar",
            @"C:\Users\24844\AppData\Local\Programs\antigravity\resources\app.asar.bak",
        })
        {
            if (File.Exists(candidate)) { pristine = candidate; break; }
        }
    }
    bool clientRunning = System.Diagnostics.Process.GetProcessesByName("Antigravity").Length > 0;
    if (!File.Exists(pristine))
    {
        Console.WriteLine("[SKIP] 安装演习 - 未找到官方原版归档（设 ZH_PRISTINE_ASAR 可指定）");
    }
    else if (clientRunning)
    {
        Console.WriteLine("[SKIP] 安装演习 - Antigravity 正在运行，补丁器按设计拒绝写入");
    }
    else
    {
        string rehearsalBase = manifestPath != null
            ? Path.Combine(Path.GetDirectoryName(Path.GetDirectoryName(manifestPath))!, "work")
            : Path.GetTempPath();
        Directory.CreateDirectory(rehearsalBase);
        string rehearsal = Path.Combine(rehearsalBase, "engine-rehearsal-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(rehearsal);
        string target = Path.Combine(rehearsal, "app.asar");
        File.Copy(pristine, target);
        File.Copy(pristine, Path.Combine(rehearsal, "app.asar.bak"));
        long before = new FileInfo(target).Length;
        var install = await AsarCleanPatcher.InstallCleanPatchAsync(target, true, true, null);
        Check("安装演习：临时归档回读校验通过并提交", install.Success, install.Message);
        if (install.Success)
        {
            long after = new FileInfo(target).Length;
            Check("安装演习：目标归档已按计划增大", after > before, $"{before} -> {after}");
            Check("安装演习：不残留 .tmp", !File.Exists(target + ".tmp"));
        }
        try { Directory.Delete(rehearsal, true); } catch { }
    }
}

// ---------- D. 客户端检测：卸载记录 DisplayIcon 规范化 ----------
// 官方更新器会把程序装到别的盘，并按卸载记录指向新位置。DisplayIcon 形如
// "D:\Antigravity\Antigravity.exe,0"，若不去掉 “,0” 就会误判客户端不存在。
Check("DisplayIcon 去掉资源序号", AntigravityDetector.NormalizeDisplayIcon(@"D:\Antigravity\Antigravity.exe,0") == @"D:\Antigravity\Antigravity.exe");
Check("DisplayIcon 去掉引号", AntigravityDetector.NormalizeDisplayIcon("\"D:\\Antigravity\\Antigravity.exe\"") == @"D:\Antigravity\Antigravity.exe");
Check("DisplayIcon 无序号原样返回", AntigravityDetector.NormalizeDisplayIcon(@"C:\Apps\Antigravity.exe") == @"C:\Apps\Antigravity.exe");
Check("DisplayIcon 空值返回空串", AntigravityDetector.NormalizeDisplayIcon(null) == "" && AntigravityDetector.NormalizeDisplayIcon("   ") == "");
Check("DisplayIcon 目录型取值不误伤", AntigravityDetector.NormalizeDisplayIcon(@"D:\Antigravity,1") == @"D:\Antigravity");

Console.WriteLine();
Console.WriteLine(failures == 0 ? "engine tests: PASS" : $"engine tests: {failures} FAILED");
return failures == 0 ? 0 : 1;
