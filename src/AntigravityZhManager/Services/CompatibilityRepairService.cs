using System.IO;
using System.Text.Json;

namespace AntigravityZhManager.Services;

public sealed record ManagerOptions
{
    public string PreferredExePath { get; init; } = "";
    public bool CloseClientToTray { get; init; } = true;
    public bool ChineseTrayMenu { get; init; } = true;
}

public sealed class ManagerSettingsStore
{
    public string FilePath { get; }
    public string? LoadError { get; private set; }
    public ManagerSettingsStore(string? filePath = null) => FilePath = filePath ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AntigravityZhManager", "settings.json");
    public ManagerOptions Load()
    {
        if (!File.Exists(FilePath)) return new();
        try { return JsonSerializer.Deserialize<ManagerOptions>(File.ReadAllText(FilePath)) ?? throw new InvalidDataException("配置为空。"); }
        catch (Exception ex) { LoadError = ex.Message; return new(); }
    }
    public void Save(ManagerOptions options)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(FilePath))!);
        string temporary = FilePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(temporary, JsonSerializer.Serialize(options, new JsonSerializerOptions { WriteIndented = true }));
            File.Move(temporary, FilePath, true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}

public sealed record RepairObservation(string AsarPath, string Version, string Fingerprint, bool Running, bool Patched, CompatibilityDecision Compatibility);
public sealed record CompatibilityRepairResult(bool Success, string Message);

public interface ICompatibilityRepairEnvironment
{
    Task<RepairObservation?> ObserveAsync(string preferredExePath);
    Task<bool> IsLiveChineseAsync();
    Task<HotInjectResult> InjectAsync();
    Task<PatchResult> InstallAsync(RepairObservation observation, ManagerOptions options);
}

public sealed class CompatibilityRepairEnvironment : ICompatibilityRepairEnvironment
{
    public async Task<RepairObservation?> ObserveAsync(string preferredExePath)
    {
        var info = AntigravityDetector.Detect(string.IsNullOrWhiteSpace(preferredExePath) ? null : preferredExePath, inspectArchive: false);
        if (!info.HasAsar) return null;
        var current = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(info.AsarPath));
        ArchiveSnapshot? backup = current.IsPatched && File.Exists(info.AsarPath + ".bak")
            ? ArchiveSnapshot.Read(await File.ReadAllBytesAsync(info.AsarPath + ".bak")) : null;
        var compatible = ArchiveCompatibility.CheckInstalled(current, backup, true);
        if (!Version.TryParse(info.Version, out var exeVersion) ||
            $"{exeVersion.Major}.{exeVersion.Minor}.{exeVersion.Build}" != current.Version)
            compatible = new(false, "", "主程序与资源包版本尚未一致，等待更新完成。");
        return new(info.AsarPath, current.Version, Path.GetFullPath(info.AsarPath) + "|" + current.Sha256 + "|" + backup?.Sha256,
            ClientProcessGuard.IsRunningForArchive(info.AsarPath), current.IsPatched, compatible);
    }
    public Task<bool> IsLiveChineseAsync() => CdpHotPatcher.CheckIsHotInjectedAsync();
    public Task<HotInjectResult> InjectAsync() => CdpHotPatcher.InjectAsync();
    public Task<PatchResult> InstallAsync(RepairObservation observation, ManagerOptions options) => AsarCleanPatcher.InstallCleanPatchAsync(
        observation.AsarPath, options.CloseClientToTray, options.ChineseTrayMenu, allowCompatibleUpdates: true);
}

// One explicit request performs one compatibility check and repair. No timer or background retries.
public sealed class CompatibilityRepairService
{
    private readonly ICompatibilityRepairEnvironment _environment;
    public SemaphoreSlim Operations { get; } = new(1, 1);
    public CompatibilityRepairService(ICompatibilityRepairEnvironment environment) => _environment = environment;

    public async Task<CompatibilityRepairResult> RepairAsync(ManagerOptions options, Action<string>? log = null)
    {
        if (!await Operations.WaitAsync(0)) return new(false, "其他操作正在进行，请完成后再试。");
        try
        {
            log?.Invoke("正在检查当前版本与汉化兼容性…");
            var first = await _environment.ObserveAsync(options.PreferredExePath);
            if (first == null) return new(false, "未找到 Antigravity，请先手动选择安装路径。");
            await Task.Delay(500);
            var current = await _environment.ObserveAsync(options.PreferredExePath);
            if (current == null || first.Fingerprint != current.Fingerprint || first.Running != current.Running)
                return new(false, "Antigravity 正在更新或运行状态发生变化，请等待更新完成后再次点击。");
            if (!current.Compatibility.Allowed)
                return new(false, current.Version + "：" + current.Compatibility.Reason + "\n请更新汉化管理器或等待此版本适配。");
            log?.Invoke("兼容性核验通过：Antigravity " + current.Version);
            if (current.Running)
            {
                if (!await _environment.IsLiveChineseAsync())
                {
                    var injected = await _environment.InjectAsync();
                    if (!injected.Success) return new(false, injected.Message);
                }
                return new(true, current.Patched
                    ? current.Version + " 汉化已就绪，当前窗口已恢复中文。"
                    : current.Version + " 已恢复当前窗口中文。\n如需永久生效，请彻底退出 Antigravity（包括托盘），再点击【新版汉化适配】。");
            }
            if (current.Patched) return new(true, current.Version + " 已安装汉化，无需重复适配。");
            var result = await _environment.InstallAsync(current, options);
            return new(result.Success, result.Success
                ? current.Version + " 永久汉化已恢复，下次启动 Antigravity 即可生效。"
                : result.Message);
        }
        catch (Exception ex) { return new(false, "本次适配未完成：" + ex.Message + "\n请确认更新已完成后重试。"); }
        finally { Operations.Release(); }
    }
}
