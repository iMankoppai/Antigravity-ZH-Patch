using System.Net.WebSockets;
using System.Text;
using System.Text.Json.Nodes;
using AntigravityZhManager.Services;

static class CompatibilityRepairTests
{
    public static async Task<int> RunAsync()
    {
        int failures = 0, checks = 0;
        void Check(string name, bool ok)
        { checks++; if (!ok) failures++; Console.WriteLine($"[{(ok ? "PASS" : "FAIL")}] 新版汉化适配：{name}"); }


        var environment = new FakeEnvironment();
        var repair = new CompatibilityRepairService(environment);
        Check("仅创建服务不会检测、注入或安装", environment.Observations == 0 && environment.Injections == 0 && environment.Installs == 0);
        var outcome = await repair.RepairAsync(new());
        Check("未找到客户端时明确提示", !outcome.Success && outcome.Message.Contains("未找到"));
        environment.Observation = new("fixture/app.asar", "2.23.2", "A", true, false, new(true, "2.23.1", "compatible"));
        environment.AfterObserve = () => { if (environment.Observations == 3) environment.Observation = environment.Observation with { Fingerprint = "B" }; };
        outcome = await repair.RepairAsync(new());
        Check("两次检查间资源变化时不写入或注入", !outcome.Success && environment.Injections == 0 && environment.Installs == 0);
        environment.AfterObserve = null;
        outcome = await repair.RepairAsync(new());
        Check("运行中恢复实时中文并说明永久安装需再次点击", outcome.Success && environment.Injections == 1 && environment.Installs == 0 && outcome.Message.Contains("再点击"));
        outcome = await repair.RepairAsync(new());
        Check("已有实时中文时不重复注入", outcome.Success && environment.Injections == 1);
        environment.Observation = environment.Observation with { Running = false };
        Check("客户端退出本身不触发安装", environment.Installs == 0);
        outcome = await repair.RepairAsync(new());
        Check("退出后再次点击才永久安装", outcome.Success && environment.Installs == 1);
        environment.Observation = environment.Observation with { Patched = true };
        outcome = await repair.RepairAsync(new());
        Check("已永久安装时无需重复写入", outcome.Success && environment.Installs == 1);
        environment.Observation = environment.Observation with { Patched = false, Running = true, Compatibility = new(false, "", "native changed") };
        outcome = await repair.RepairAsync(new());
        Check("不兼容时阻止热加载与固化", !outcome.Success && environment.Injections == 1 && environment.Installs == 1);
        environment.Observation = environment.Observation with { Compatibility = new(true, "2.23.1", "compatible") };
        environment.Chinese = false; environment.InjectionSucceeds = false;
        outcome = await repair.RepairAsync(new());
        Check("热加载失败不报告成功", !outcome.Success && !environment.Chinese);
        environment.InjectionSucceeds = true;
        outcome = await repair.RepairAsync(new());
        Check("再次点击可重试热加载", outcome.Success && environment.Chinese);
        await repair.Operations.WaitAsync();
        int observations = environment.Observations;
        outcome = await repair.RepairAsync(new());
        repair.Operations.Release();
        Check("其他操作持锁时本次请求不执行", !outcome.Success && environment.Observations == observations);
        environment.ThrowOnObserve = true;
        outcome = await repair.RepairAsync(new());
        Check("资源读取失败明确返回且释放操作锁", !outcome.Success && repair.Operations.CurrentCount == 1);
        environment.ThrowOnObserve = false;
        environment.Observation = environment.Observation with { Running = false };
        environment.InstallSucceeds = false;
        outcome = await repair.RepairAsync(new());
        Check("永久安装失败不报告成功", !outcome.Success);
        environment.InstallSucceeds = true;
        outcome = await repair.RepairAsync(new());
        Check("再次点击可重试永久安装", outcome.Success);
        var concurrentEnvironment = new FakeEnvironment { Observation = environment.Observation };
        var concurrentRepair = new CompatibilityRepairService(concurrentEnvironment);
        var pendingObservation = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        concurrentEnvironment.ObserveDelay = pendingObservation.Task;
        var firstRepair = concurrentRepair.RepairAsync(new());
        var secondRepair = await concurrentRepair.RepairAsync(new());
        pendingObservation.SetResult(); await firstRepair;
        Check("并发请求只执行一次安装", !secondRepair.Success && concurrentEnvironment.Installs == 1);

        string temporaryRoot = Path.Combine(AppContext.BaseDirectory, "auto-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(temporaryRoot);
        try
        {
            var store = new ManagerSettingsStore(Path.Combine(temporaryRoot, "settings.json"));
            store.Save(new() { PreferredExePath = @"D:\路径\Antigravity.exe", CloseClientToTray = false });
            var saved = store.Load();
            Check("路径与客户端选项重启后保持", !saved.CloseClientToTray && saved.PreferredExePath.Contains("路径"));
            File.WriteAllText(store.FilePath, "truncated{");
            Check("损坏配置返回默认选项并记录错误", store.Load().CloseClientToTray && store.LoadError != null);

            var package = new JsonObject { ["name"] = "antigravity", ["main"] = "dist/main.js", ["version"] = "2.23.2", ["dependencies"] = new JsonObject { ["electron-log"] = "^5" } };
            var contents = ArchiveCompatibility.Targets.ToDictionary(t => t, t => Encoding.UTF8.GetBytes("official " + t));
            contents["package.json"] = Encoding.UTF8.GetBytes(package.ToJsonString());
            var fixture = ArchiveSnapshot.Read(Build(contents));
            var reference = new CompatibilityReference("2.23.1", ArchiveCompatibility.PackageSignature(package),
                ArchiveCompatibility.Targets.ToDictionary(t => t, t => ArchiveSnapshot.Hash(contents[t])));
            Check("同系列小版本且五模块完全一致时兼容", ArchiveCompatibility.CheckPristine(fixture, true, new[] { reference }).Allowed);
            Check("未启用兼容模式时仍拒绝未知版本", !ArchiveCompatibility.CheckPristine(fixture, false, new[] { reference }).Allowed);
            var changed = contents.ToDictionary(x => x.Key, x => x.Value);
            changed["dist/main.js"] = Encoding.UTF8.GetBytes("changed native");
            Check("任一原生模块变化立即拒绝", !ArchiveCompatibility.CheckPristine(ArchiveSnapshot.Read(Build(changed)), true, new[] { reference }).Allowed);
            package["version"] = "2.24.0"; changed = contents.ToDictionary(x => x.Key, x => x.Value); changed["package.json"] = Encoding.UTF8.GetBytes(package.ToJsonString());
            Check("跨系列升级即使锚点相同也拒绝", !ArchiveCompatibility.CheckPristine(ArchiveSnapshot.Read(Build(changed)), true, new[] { reference }).Allowed);
            package["version"] = "2.23.0"; changed["package.json"] = Encoding.UTF8.GetBytes(package.ToJsonString());
            Check("已登记版本哈希不符不走结构兜底", !ArchiveCompatibility.CheckPristine(ArchiveSnapshot.Read(Build(changed)), true, new[] { reference }).Allowed);
            package["version"] = "2.23.2"; package["dependencies"]!["electron-log"] = "^6"; changed["package.json"] = Encoding.UTF8.GetBytes(package.ToJsonString());
            Check("依赖变化时停止自动安装", !ArchiveCompatibility.CheckPristine(ArchiveSnapshot.Read(Build(changed)), true, new[] { reference }).Allowed);
            bool truncatedRejected = false;
            try { ArchiveSnapshot.Read(fixture.Bytes[..^1]); } catch (InvalidDataException) { truncatedRejected = true; }
            Check("更新包截断时拒绝处理", truncatedRejected);

            using var fragmented = new FakeSocket(new[] { ("{\"method\":\"Runtime.event\"}", true), ("{\"id\":9,\"result\":{}}", true), ("{\"id\":1,\"result\":{\"result\":", false), ("{\"value\":true}}}", true) });
            var reply = await CdpHotPatcher.ReceiveResultAsync(fragmented, 1, CancellationToken.None);
            Check("CDP 分片/异步事件不会造成误判", reply.GetProperty("value").GetBoolean());
            foreach (var (label, json) in new[] { ("协议错误", "{\"id\":1,\"error\":{\"message\":\"failed\"}}"), ("页面异常", "{\"id\":1,\"result\":{\"exceptionDetails\":{\"text\":\"failed\"}}}") })
            {
                bool rejected = false;
                using var socket = new FakeSocket(new[] { (json, true) });
                try { await CdpHotPatcher.ReceiveResultAsync(socket, 1, CancellationToken.None); } catch (IOException) { rejected = true; }
                Check("CDP " + label + "不报告成功", rejected);
            }

            string? pristinePath = new[] { Environment.GetEnvironmentVariable("ZH_PRISTINE_ASAR"), Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs/antigravity/resources/app.asar.bak") }
                .FirstOrDefault(p => !string.IsNullOrEmpty(p) && File.Exists(p));
            if (pristinePath != null)
            {
                var original = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(pristinePath));
                if (original.Version == "2.23.1")
                {
                    string target = Path.Combine(temporaryRoot, "app.asar");
                    await File.WriteAllBytesAsync(target, original.Bytes);
                    var result = await AsarCleanPatcher.InstallCleanPatchAsync(target);
                    Check("真实原版副本安装成功", result.Success);
                    result = await AsarCleanPatcher.InstallCleanPatchAsync(target, false, false);
                    var installed = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(target));
                    Check("重复安装按原件重建并保留新选项", result.Success && installed.Text("dist/main.js").Contains("hideWindowOnClose = false") && !installed.Text("dist/tray.js").Contains("localizedMenuOptions"));
                    var futurePackage = original.Package.DeepClone().AsObject(); futurePackage["version"] = "2.23.2";
                    var futureBytes = Rewrite(original, new() { ["package.json"] = Encoding.UTF8.GetBytes(futurePackage.ToJsonString()) });
                    await File.WriteAllBytesAsync(target, futureBytes);
                    var future = ArchiveSnapshot.Read(futureBytes);
                    Check("模拟未来小版本能使用生产基线识别", ArchiveCompatibility.CheckPristine(future, true).Allowed);
                    var integrationEnvironment = new FakeEnvironment
                    {
                        Observation = new(target, future.Version, future.Sha256, true, false, ArchiveCompatibility.CheckPristine(future, true)),
                        InstallAction = (observation, options) => AsarCleanPatcher.InstallCleanPatchAsync(observation.AsarPath,
                            options.CloseClientToTray, options.ChineseTrayMenu, allowCompatibleUpdates: true)
                    };
                    var integrationRepair = new CompatibilityRepairService(integrationEnvironment);
                    var integrationResult = await integrationRepair.RepairAsync(new());
                    Check("整链路模拟：更新后运行中热加载且不动磁盘", integrationEnvironment.Injections == 1 && File.ReadAllBytes(target).AsSpan().SequenceEqual(futureBytes));
                    integrationEnvironment.Observation = integrationEnvironment.Observation with { Running = false };
                    integrationResult = await integrationRepair.RepairAsync(new());
                    Check("手动适配轮换新版备份并固化", integrationResult.Success && File.ReadAllBytes(target + ".bak").AsSpan().SequenceEqual(futureBytes));
                    string preserved = target + ".bak." + original.Version + "." + original.Sha256;
                    Check("旧备份按版本和哈希保存且内容不变", File.Exists(preserved) && ArchiveSnapshot.Hash(File.ReadAllBytes(preserved)) == original.Sha256);
                    var futurePatched = ArchiveSnapshot.Read(File.ReadAllBytes(target));
                    Check("新版补丁中记录原件哈希", futurePatched.Receipt?["pristineSha256"]?.ToString() == future.Sha256);
                    var badBackupPackage = future.Package.DeepClone().AsObject(); badBackupPackage["description"] = "different build";
                    await File.WriteAllBytesAsync(target + ".bak", Rewrite(future, new() { ["package.json"] = Encoding.UTF8.GetBytes(badBackupPackage.ToJsonString()) }));
                    result = await AsarCleanPatcher.RestoreEnglishAsync(target);
                    Check("同版本但非安装时原件的备份也拒绝恢复", !result.Success && ArchiveSnapshot.Hash(File.ReadAllBytes(target)) == futurePatched.Sha256);
                    await File.WriteAllBytesAsync(target + ".bak", futureBytes);
                    result = await AsarCleanPatcher.RestoreEnglishAsync(target);
                    Check("未知兼容版还原与新版原件逐字节一致", result.Success && File.ReadAllBytes(target).AsSpan().SequenceEqual(futureBytes));
                    var incompatible = Rewrite(future, new() { ["dist/main.js"] = Encoding.UTF8.GetBytes(future.Text("dist/main.js") + "\n// changed upstream") });
                    await File.WriteAllBytesAsync(target, incompatible);
                    result = await AsarCleanPatcher.InstallCleanPatchAsync(target, allowCompatibleUpdates: true);
                    Check("不兼容更新不改归档也不覆盖备份", !result.Success && File.ReadAllBytes(target).AsSpan().SequenceEqual(incompatible) && File.ReadAllBytes(target + ".bak").AsSpan().SequenceEqual(futureBytes));
                }
            }
            else Console.WriteLine("[SKIP] 模拟未来版本整链路（本机无官方归档；合成兼容判定与状态机照常测试）");
        }
        finally
        {
            string resolved = Path.GetFullPath(temporaryRoot);
            string expectedBase = Path.GetFullPath(AppContext.BaseDirectory).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            if (!resolved.StartsWith(expectedBase, StringComparison.OrdinalIgnoreCase)) throw new IOException("测试清理目录越界。");
            Directory.Delete(resolved, true);
        }
        Console.WriteLine($"compatibility repair tests: {checks - failures}/{checks} PASS");
        return failures;
    }

    private static byte[] Build(Dictionary<string, byte[]> contents)
    {
        var root = new JsonObject { ["files"] = new JsonObject() };
        foreach (string name in contents.Keys)
        {
            var directory = root["files"]!.AsObject();
            var segments = name.Split('/');
            foreach (var segment in segments[..^1])
            { directory[segment] ??= new JsonObject { ["files"] = new JsonObject() }; directory = directory[segment]!["files"]!.AsObject(); }
            directory[segments[^1]] = new JsonObject();
        }
        return Pack(root, contents);
    }
    private static byte[] Rewrite(ArchiveSnapshot source, Dictionary<string, byte[]> changes)
    { var content = source.Files.ToDictionary(x => x.Key, x => x.Value); foreach (var pair in changes) content[pair.Key] = pair.Value; return Pack(source.Header.DeepClone().AsObject(), content); }
    private static byte[] Pack(JsonObject root, Dictionary<string, byte[]> content)
    {
        using var payload = new MemoryStream();
        void Walk(JsonObject directory, string prefix)
        {
            foreach (var pair in directory)
            {
                var node = pair.Value!.AsObject(); string name = prefix + pair.Key;
                if (node["files"] is JsonObject children) { Walk(children, name + "/"); continue; }
                if (node["unpacked"]?.GetValue<bool>() == true || node.ContainsKey("link")) continue;
                byte[] bytes = content[name]; node["offset"] = payload.Position.ToString(); node["size"] = bytes.Length;
                node["integrity"] = new JsonObject { ["algorithm"] = "SHA256", ["hash"] = ArchiveSnapshot.Hash(bytes) };
                payload.Write(bytes);
            }
        }
        Walk(root["files"]!.AsObject(), "");
        byte[] json = Encoding.UTF8.GetBytes(root.ToJsonString());
        int headerSize = (4 + json.Length + 3) / 4 * 4;
        byte[] archive = new byte[12 + headerSize + payload.Length];
        BitConverter.GetBytes(4u).CopyTo(archive, 0); BitConverter.GetBytes((uint)(headerSize + 4)).CopyTo(archive, 4);
        BitConverter.GetBytes((uint)headerSize).CopyTo(archive, 8); BitConverter.GetBytes((uint)json.Length).CopyTo(archive, 12);
        json.CopyTo(archive, 16); payload.ToArray().CopyTo(archive, 12 + headerSize);
        return archive;
    }

    private sealed class FakeEnvironment : ICompatibilityRepairEnvironment
    {
        public RepairObservation? Observation;
        public int Injections, Installs, Observations;
        public bool Chinese, InjectionSucceeds = true, InstallSucceeds = true, ThrowOnObserve;
        public Action? AfterObserve;
        public Task? ObserveDelay;
        public Func<RepairObservation, ManagerOptions, Task<PatchResult>>? InstallAction;
        public async Task<RepairObservation?> ObserveAsync(string path)
        { Observations++; if (ThrowOnObserve) throw new IOException("sharing violation"); if (ObserveDelay != null) await ObserveDelay; AfterObserve?.Invoke(); return Observation; }
        public Task<bool> IsLiveChineseAsync() => Task.FromResult(Chinese);
        public Task<HotInjectResult> InjectAsync() { Injections++; Chinese = InjectionSucceeds; return Task.FromResult(new HotInjectResult { Success = InjectionSucceeds, Message = "fixture" }); }
        public Task<PatchResult> InstallAsync(RepairObservation observation, ManagerOptions options)
        { Installs++; return InstallAction?.Invoke(observation, options) ?? Task.FromResult(new PatchResult { Success = InstallSucceeds, Message = "fixture" }); }
    }

    private sealed class FakeSocket : WebSocket
    {
        private readonly Queue<(byte[] Bytes, bool End)> _frames;
        public FakeSocket(IEnumerable<(string Json, bool End)> frames) => _frames = new(frames.Select(f => (Encoding.UTF8.GetBytes(f.Json), f.End)));
        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => WebSocketState.Open;
        public override string? SubProtocol => null;
        public override void Abort() { }
        public override void Dispose() { }
        public override Task CloseAsync(WebSocketCloseStatus status, string? description, CancellationToken token) => Task.CompletedTask;
        public override Task CloseOutputAsync(WebSocketCloseStatus status, string? description, CancellationToken token) => Task.CompletedTask;
        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType type, bool end, CancellationToken token) => Task.CompletedTask;
        public override Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken token)
        { var frame = _frames.Dequeue(); frame.Bytes.CopyTo(buffer.Array!, buffer.Offset); return Task.FromResult(new WebSocketReceiveResult(frame.Bytes.Length, WebSocketMessageType.Text, frame.End)); }
    }
}
