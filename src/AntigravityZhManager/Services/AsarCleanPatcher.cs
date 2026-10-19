using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace AntigravityZhManager.Services
{
    public class PatchResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public static class AsarCleanPatcher
    {
        private static readonly System.Threading.SemaphoreSlim FileGate = new(1, 1);
        private static string CalcSha256(byte[] data)
        {
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(data);
            var sb = new StringBuilder();
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        private static string Sha256OfFile(string path)
        {
            using var stream = File.OpenRead(path);
            using var sha = SHA256.Create();
            return Convert.ToHexString(sha.ComputeHash(stream)).ToLowerInvariant();
        }

        // 从 ASAR 的 package.json 读取客户端版本，用于匹配基线清单。
        private static string? ReadClientVersion(byte[] asarBytes, int payloadBase)
        {
            try
            {
                uint jsonLength = BitConverter.ToUInt32(asarBytes, 12);
                var header = JsonNode.Parse(Encoding.UTF8.GetString(asarBytes, 16, (int)jsonLength)) as JsonObject;
                var pkg = header?["files"]?["package.json"] as JsonObject;
                if (pkg == null) return null;
                if (pkg["unpacked"]?.GetValue<bool>() == true || pkg.ContainsKey("link")) return null;
                long offset = long.Parse(pkg["offset"]!.ToString());
                int size = int.Parse(pkg["size"]!.ToString());
                if (offset < 0 || size < 0 || offset > asarBytes.Length - payloadBase ||
                    size > asarBytes.Length - payloadBase - offset) return null;
                var pkgText = Encoding.UTF8.GetString(asarBytes, payloadBase + (int)offset, size).TrimStart('\uFEFF');
                using var doc = JsonDocument.Parse(pkgText);
                return doc.RootElement.TryGetProperty("version", out var v) ? v.GetString() : null;
            }
            catch { return null; }
        }

        // 回读临时归档并逐项校验。校验逻辑在 AsarArchiveVerifier，便于独立测试。
        private static Task VerifyWrittenArchiveAsync(
            string tmpPath,
            Dictionary<string, byte[]> plannedChanges,
            List<(string Path, JsonObject Node)> fileEntries,
            Func<string, byte[]> originalContent,
            Action<string>? log)
        {
            var order = new List<string>(fileEntries.Count);
            var original = new Dictionary<string, byte[]>(StringComparer.Ordinal);
            foreach (var (entryPath, node) in fileEntries)
            {
                order.Add(entryPath);
                if (node["unpacked"]?.GetValue<bool>() == true || node.ContainsKey("link")) continue;
                if (plannedChanges.ContainsKey(entryPath)) continue;
                original[entryPath] = originalContent(entryPath);
            }
            return AsarArchiveVerifier.VerifyAsync(tmpPath, plannedChanges, order, original, log);
        }

        // 写入前自检：注入锚点必须真正命中，否则拒绝写入。
        private static void AssertInjectionApplied(string label, string content, params string[] requiredMarkers)
        {
            foreach (var marker in requiredMarkers)
            {
                if (!content.Contains(marker))
                {
                    throw new InvalidDataException(
                        $"注入自检失败（{label}）：未找到标记 “{marker}”。官方版本可能已变化，已停止写入，原有归档保持不变。");
                }
            }
        }

        public static async Task<PatchResult> InstallCleanPatchAsync(
            string asarPath,
            bool enableCloseToTray = true,
            bool enableTrayMenu = true,
            Action<string>? log = null,
            bool allowCompatibleUpdates = false)
        {
            await FileGate.WaitAsync();
            try { return await InstallCoreAsync(asarPath, enableCloseToTray, enableTrayMenu, log, allowCompatibleUpdates); }
            finally { FileGate.Release(); }
        }

        private static async Task<PatchResult> InstallCoreAsync(string asarPath, bool enableCloseToTray,
            bool enableTrayMenu, Action<string>? log, bool allowCompatibleUpdates)
        {
            var result = new PatchResult();
            string? temporaryOutput = null;
            try
            {
                if (ClientProcessGuard.IsRunningForArchive(asarPath))
                {
                    result.Message = "检测到 Antigravity 正在运行中！\n为防止文件占用冲突，请先彻底关闭 Antigravity 客户端（包括系统托盘图标），然后再点击安装。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                if (!File.Exists(asarPath))
                {
                    result.Message = "未找到 resources\\app.asar 文件。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                string dir = Path.GetDirectoryName(asarPath)!;
                string bakPath = Path.Combine(dir, "app.asar.bak");

                log?.Invoke("📖 正在读取并解构 ASAR 归档...");
                var current = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(asarPath));
                ArchiveSnapshot? backup = current.IsPatched && File.Exists(bakPath)
                    ? ArchiveSnapshot.Read(await File.ReadAllBytesAsync(bakPath)) : null;
                var compatibility = ArchiveCompatibility.CheckInstalled(current, backup, allowCompatibleUpdates);
                if (!compatibility.Allowed) throw new InvalidDataException(compatibility.Reason);
                var source = current.IsPatched ? backup! : current;
                byte[] asarBytes = source.Bytes;
                log?.Invoke("🔎 " + compatibility.Reason);

                if (asarBytes.Length < 16) throw new InvalidDataException("ASAR 文件头不足 16 字节。");
                uint magic = BitConverter.ToUInt32(asarBytes, 0);
                uint totalHeaderSize = BitConverter.ToUInt32(asarBytes, 4);
                uint headerDescSize = BitConverter.ToUInt32(asarBytes, 8);
                uint jsonLength = BitConverter.ToUInt32(asarBytes, 12);

                if (magic != 4 || totalHeaderSize < 8 || totalHeaderSize > asarBytes.Length - 8 ||
                    headerDescSize != totalHeaderSize - 4 || jsonLength > totalHeaderSize - 8)
                    throw new InvalidDataException("ASAR pickle 长度或边界不合法。");
                int payloadBase = checked(8 + (int)totalHeaderSize);
                string jsonString = Encoding.UTF8.GetString(asarBytes, 16, (int)jsonLength);

                var headerNode = JsonNode.Parse(jsonString) as JsonObject;
                if (headerNode == null || !headerNode.ContainsKey("files"))
                {
                    result.Message = "ASAR 头部结构无效。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                var filesNode = headerNode["files"]!.AsObject();
                headerNode["antigravityZh"] = new JsonObject
                {
                    ["schema"] = 1, ["version"] = source.Version,
                    ["pristineSha256"] = source.Sha256, ["referenceVersion"] = compatibility.ReferenceVersion
                };

                // 扁平化文件列表
                var fileEntries = new List<(string Path, JsonObject Node)>();
                void Walk(JsonObject current, string currentPath)
                {
                    foreach (var kvp in current)
                    {
                        if (kvp.Value is JsonObject obj)
                        {
                            if (obj.ContainsKey("files") && obj["files"] is JsonObject subFiles)
                            {
                                Walk(subFiles, currentPath + kvp.Key + "/");
                            }
                            else
                            {
                                fileEntries.Add((currentPath + kvp.Key, obj));
                            }
                        }
                    }
                }
                Walk(filesNode, "");

                log?.Invoke($"📂 ASAR 包含文件数: {fileEntries.Count}");

                // 提取文件内容辅助函数
                byte[] GetFileBytes(string relPath)
                {
                    var item = fileEntries.Find(e => e.Path == relPath);
                    if (item.Node == null) throw new Exception($"找不到文件: {relPath}");
                    if (item.Node["unpacked"]?.GetValue<bool>() == true || item.Node.ContainsKey("link"))
                        throw new InvalidDataException($"目标模块不是内嵌文件，拒绝此版本: {relPath}");
                    if (!item.Node.ContainsKey("offset") || item.Node["offset"] == null)
                    {
                        throw new Exception($"文件非内嵌 payload 文件: {relPath}");
                    }
                    long offset = long.Parse(item.Node["offset"]!.ToString());
                    int size = int.Parse(item.Node["size"]!.ToString());
                    if (offset < 0 || size < 0 || offset > asarBytes.Length - payloadBase ||
                        size > asarBytes.Length - payloadBase - offset)
                        throw new InvalidDataException($"ASAR 文件边界无效: {relPath}");
                    byte[] buf = new byte[size];
                    Array.Copy(asarBytes, payloadBase + offset, buf, 0, size);
                    return buf;
                }

                string GetFileText(string relPath) => Encoding.UTF8.GetString(GetFileBytes(relPath));

                log?.Invoke("⚡ 正在应用原生模块适配规则...");
                string ipcHandlers = GetFileText("dist/ipcHandlers.js");
                string mainJs = GetFileText("dist/main.js");
                string utilsJs = GetFileText("dist/utils.js");
                string trayJs = GetFileText("dist/tray.js");
                string wizardJs = GetFileText("dist/ideInstall/wizard.js");
                string? provisionJs = fileEntries.Any(e => e.Path == "dist/provisionSplash.js")
                    ? GetFileText("dist/provisionSplash.js") : null;

                // 1. ipcHandlers
                ipcHandlers = ipcHandlers
                    .Replace("title: 'Open workspace'", "title: '打开工作区'")
                    .Replace("title: 'Open workspaces'", "title: '选择多个工作区'");

                // 2. mainJs
                // This must execute before the early WSL warnings, not only after
                // the first renderer window has opened.
                const string electronImport = "const electron_1 = require(\"electron\");";
                if (mainJs.Split(electronImport).Length != 2)
                    throw new InvalidDataException("原生弹窗注入锚点数量异常，拒绝写入。");
                mainJs = mainJs.Replace(electronImport, electronImport +
                    "\nrequire('./zh-bundle.js').installNativeDialogs(electron_1.dialog);");
                if (!mainJs.Contains("setAppUserModelId"))
                {
                    mainJs = mainJs.Replace(
                        "const electron_1 = require(\"electron\");",
                        "const electron_1 = require(\"electron\");\nif (process.platform === 'win32') electron_1.app.setAppUserModelId('electron.app.Antigravity');"
                    );
                }

                string closeToTrayLiteral = enableCloseToTray ? "true" : "false";
                if (!mainJs.Contains("closeWindowToBackground"))
                {
                    mainJs = mainJs.Replace(
                        "    settingsService = new settingsService_1.SettingsService(storageManager);\n    // Handle deep link URL from command line arguments (All platforms)\n",
                        "    settingsService = new settingsService_1.SettingsService(storageManager);\n    // 关闭到托盘由管理器开关决定：客户端自身设置默认在 Windows 关闭，\n    // 且 getSetting 只认存储里的 'true'，直接委派会让功能静默失效。\n    utils_1.closeWindowToBackground = () => true;\n    utils_1.hideWindowOnClose = " + closeToTrayLiteral + ";\n    // Handle deep link URL from command line arguments (All platforms)\n"
                    );
                }

                else
                {
                    // 已注入过：选项切换时只更新开关，避免钩子残留或重复注入。
                    mainJs = mainJs
                        .Replace("utils_1.hideWindowOnClose = true;", $"utils_1.hideWindowOnClose = {closeToTrayLiteral};")
                        .Replace("utils_1.hideWindowOnClose = false;", $"utils_1.hideWindowOnClose = {closeToTrayLiteral};");
                }

                // 洁癖模式内嵌注入点
                if (!mainJs.Contains("require('./zh-bundle.js').attach"))
                {
                    mainJs = mainJs.Replace(
                        "                        void win.loadURL(newUrl);",
                        "                        try { require('./zh-bundle.js').attach(win, newUrl); } catch(e){ console.error('ZH attach error', e); }\n                        void win.loadURL(newUrl);"
                    );
                }

                // 3. utilsJs
                if (!utilsJs.Contains("setAppDetails"))
                {
                    utilsJs = utilsJs.Replace(
                        "    // Prevent the menu dropdown from being very wide due to long page titles",
                        "    if (process.platform === 'win32') win.setAppDetails({ appId: 'electron.app.Antigravity' });\n    // Prevent the menu dropdown from being very wide due to long page titles"
                    );
                }

                if (!utilsJs.Contains("closeWindowToBackground"))
                {
                    utilsJs = utilsJs.Replace(
                        "exports.showQuitConfirmation = false;\nfunction setShowQuitConfirmation(value) {\n",
                        "exports.showQuitConfirmation = false;\nexports.closeWindowToBackground = null;\n    exports.hideWindowOnClose = false;\nfunction setShowQuitConfirmation(value) {\n"
                    );

                    utilsJs = utilsJs.Replace(
                        "    }\n    void win.loadURL(url);\n",
                        "    }\n    let closePending = false;\n    let allowNormalClose = false;\n    win.on('close', (event) => {\n        if (process.platform !== 'win32' || allowNormalClose || !exports.hideWindowOnClose || !exports.closeWindowToBackground) return;\n        event.preventDefault();\n        if (closePending) return;\n        closePending = true;\n        Promise.resolve().then(() => exports.closeWindowToBackground()).then((enabled) => {\n            if (win.isDestroyed()) return;\n            if (enabled) win.hide();\n            else { allowNormalClose = true; win.close(); }\n        }).catch((error) => {\n            console.error('Unable to read background setting for window close:', error);\n            if (!win.isDestroyed()) { allowNormalClose = true; win.close(); }\n        }).finally(() => { closePending = false; });\n    });\n    try { require('./zh-bundle.js').attach(win, url); } catch(e){ console.error('ZH attach error', e); }\n    void win.loadURL(url);\n"
                    );
                }
                else if (!utilsJs.Contains("zh-bundle.js"))
                {
                    utilsJs = utilsJs.Replace(
                        "    void win.loadURL(url);",
                        "    try { require('./zh-bundle.js').attach(win, url); } catch(e){ console.error('ZH attach error', e); }\n    void win.loadURL(url);"
                    );
                }

                // 4. trayJs
                if (enableTrayMenu && !trayJs.Contains("localizedMenuOptions"))
                {
                    trayJs = trayJs
                        .Replace(
                            "let contextMenu = null;\n/**",
                            "let contextMenu = null;\nfunction localizedMenuOptions(options) {\n    const result = { ...options };\n    const labels = {\n        'No agents running': '暂无运行中的代理',\n        'Quit': '退出',\n        'Connect to WSL': '连接到 WSL',\n        'Reopen Locally': '在本机重新打开',\n    };\n    if (result.label === `Open ${electron_1.app.getName()}`) result.label = `打开 ${electron_1.app.getName()}`;\n    else if (Object.hasOwn(labels, result.label)) result.label = labels[result.label];\n    if (Array.isArray(result.submenu)) result.submenu = result.submenu.map(item => ({ ...item }));\n    return result;\n}\n/**"
                        )
                        .Replace(
                            "    contextMenu = electron_1.Menu.buildFromTemplate(actions);",
                            "    contextMenu = electron_1.Menu.buildFromTemplate(actions.map(localizedMenuOptions));"
                        )
                        .Replace(
                            "    if (onClick && !(0, utils_1.isMacOS)()) {\n        tray.on('click', onClick);\n    }",
                            "    if (onClick && !(0, utils_1.isMacOS)()) {\n        tray.on('click', onClick);\n    }\n    if (process.platform === 'win32') {\n        const openAction = actions.find(action => action.label === `Open ${electron_1.app.getName()}` && typeof action.click === 'function');\n        if (openAction) tray.on('double-click', () => openAction.click());\n    }"
                        )
                        .Replace(
                            "    contextMenu.insert(Math.min(position, contextMenu.items.length), new electron_1.MenuItem(options));\n    // Re-set the menu so the tray picks up the change.\n",
                            "    contextMenu.insert(Math.min(position, contextMenu.items.length), new electron_1.MenuItem(localizedMenuOptions(options)));\n    // Re-set the menu so the tray picks up the change.\n"
                        )
                        .Replace(
                            "        if (countItem) {\n            countItem.label =\n                (count > 0 ? `${count}` : 'No') +\n                    ' agent' +\n                    (count === 1 ? '' : 's') +\n                    ' running';\n            tray.setContextMenu(contextMenu);\n",
                            "        if (countItem) {\n            countItem.label = count > 0 ? `${count} 个代理正在运行` : '暂无运行中的代理';\n            tray.setContextMenu(contextMenu);\n"
                        );
                }

                // 首次运行向导自建 BrowserWindow 并以 data: URL 加载，不经过
                // main.js/utils.js 的 loadURL 挂点，因此单独注入。
                if (!wizardJs.Contains("zh-bundle.js"))
                {
                    wizardJs = wizardJs.Replace(
                        "        void wizardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);",
                        "        try { require('../zh-bundle.js').attach(wizardWindow, 'data:text/html;charset=utf-8,'); } catch(e){ console.error('ZH attach error', e); }\n" +
                        "        void wizardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);"
                    );
                }

                // WSL provisioning owns a separate data: window. Attach before
                // loadURL so both its initial heading and subsequent status text
                // are observed without changing distro names or install behavior.
                if (provisionJs != null)
                {
                    const string provisionLoad = "    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);";
                    if (provisionJs.Split(provisionLoad).Length != 2)
                        throw new InvalidDataException("WSL 准备窗口注入锚点数量异常，拒绝写入。");
                    provisionJs = provisionJs.Replace(provisionLoad,
                        "    require('./zh-bundle.js').attach(win, 'data:text/html;charset=utf-8,');\n" + provisionLoad);
                }

                // 写入前自检：确认每个注入点都真正命中。官方版本更新可能移除或改变
                // 锚点，此时 String.Replace 会静默空操作却仍报成功，因此校验失败时
                // 直接拒绝写入，保留原有归档。
                AssertInjectionApplied("dist/ipcHandlers.js", ipcHandlers, "打开工作区", "选择多个工作区");
                AssertInjectionApplied("dist/main.js", mainJs, "zh-bundle.js");
                AssertInjectionApplied("dist/main.js (native dialogs)", mainJs, "installNativeDialogs(electron_1.dialog)");
                AssertInjectionApplied("dist/utils.js", utilsJs, "zh-bundle.js");
                AssertInjectionApplied("dist/ideInstall/wizard.js", wizardJs, "zh-bundle.js");
                if (enableCloseToTray)
                {
                    AssertInjectionApplied("dist/main.js (closeToTray)", mainJs, "closeWindowToBackground");
                    AssertInjectionApplied("dist/utils.js (closeToTray)", utilsJs, "closeWindowToBackground");
                }
                if (enableTrayMenu)
                {
                    AssertInjectionApplied("dist/tray.js", trayJs, "localizedMenuOptions");
                }

                // 读取内嵌资源中的 zh-bundle.js
                var assembly = Assembly.GetExecutingAssembly();
                byte[] zhBundleBytes;
                using (var s = assembly.GetManifestResourceStream("AntigravityZhManager.Assets.zh-bundle.js"))
                {
                    if (s == null) throw new Exception("未能加载内嵌 zh-bundle.js 资源。");
                    using var ms = new MemoryStream();
                    await s.CopyToAsync(ms);
                    zhBundleBytes = ms.ToArray();
                }

                log?.Invoke($"📦 准备封包洁癖版汉化内核 (大小: {zhBundleBytes.Length / 1024} KB)...");

                var modifiedEntries = new Dictionary<string, byte[]>
                {
                    ["dist/ipcHandlers.js"] = Encoding.UTF8.GetBytes(ipcHandlers),
                    ["dist/main.js"] = Encoding.UTF8.GetBytes(mainJs),
                    ["dist/utils.js"] = Encoding.UTF8.GetBytes(utilsJs),
                    ["dist/tray.js"] = Encoding.UTF8.GetBytes(trayJs),
                    ["dist/ideInstall/wizard.js"] = Encoding.UTF8.GetBytes(wizardJs),
                    ["dist/zh-bundle.js"] = zhBundleBytes
                };
                if (provisionJs != null)
                {
                    AssertInjectionApplied("dist/provisionSplash.js", provisionJs, "zh-bundle.js");
                    modifiedEntries["dist/provisionSplash.js"] = Encoding.UTF8.GetBytes(provisionJs);
                }

                // 在 header 中注册 dist/zh-bundle.js
                var distFiles = filesNode["dist"]?["files"]?.AsObject()
                    ?? throw new InvalidDataException("缺少 dist/files 目录。");
                if (distFiles["zh-bundle.js"] is JsonObject existingBundle &&
                    (existingBundle["unpacked"]?.GetValue<bool>() == true || existingBundle.ContainsKey("link")))
                    throw new InvalidDataException("已有汉化模块是 unpacked/link，拒绝直接覆盖。");
                if (!distFiles.ContainsKey("zh-bundle.js"))
                {
                    string bHash = CalcSha256(zhBundleBytes);
                    var entryObj = new JsonObject
                    {
                        ["size"] = zhBundleBytes.Length,
                        ["offset"] = "0",
                        ["integrity"] = new JsonObject
                        {
                            ["algorithm"] = "SHA256",
                            ["hash"] = bHash,
                            ["blockSize"] = 4194304,
                            ["blocks"] = new JsonArray { bHash }
                        }
                    };
                    distFiles["zh-bundle.js"] = entryObj;
                    fileEntries.Add(("dist/zh-bundle.js", entryObj));
                }

                // 先快照原始偏移/大小：下面的循环会就地改写 header 节点，而回读校验必须
                // 用原始字节。否则会用新偏移去读旧归档，必然产生伪越界（如 icon.png）。
                var originalRanges = new Dictionary<string, (long Offset, int Size)>(StringComparer.Ordinal);
                foreach (var (rangePath, rangeNode) in fileEntries)
                {
                    if (rangeNode["unpacked"]?.GetValue<bool>() == true || rangeNode.ContainsKey("link")) continue;
                    if (!rangeNode.ContainsKey("offset") || rangeNode["offset"] == null || !rangeNode.ContainsKey("size")) continue;
                    originalRanges[rangePath] = (long.Parse(rangeNode["offset"]!.ToString()), int.Parse(rangeNode["size"]!.ToString()));
                }
                byte[] OriginalBytes(string relPath)
                {
                    if (!originalRanges.TryGetValue(relPath, out var range))
                        throw new InvalidDataException($"找不到原始归档条目: {relPath}");
                    if (range.Offset < 0 || range.Size < 0 || range.Offset > asarBytes.Length - payloadBase ||
                        range.Size > asarBytes.Length - payloadBase - range.Offset)
                        throw new InvalidDataException($"ASAR 文件边界无效: {relPath}");
                    byte[] originalBuf = new byte[range.Size];
                    Array.Copy(asarBytes, payloadBase + range.Offset, originalBuf, 0, range.Size);
                    return originalBuf;
                }

                // 重新排布文件 offset 并计算完整性
                var payloadStreams = new List<byte[]>();
                long curOffset = 0;

                foreach (var (path, node) in fileEntries)
                {
                    bool isUnpacked = node.ContainsKey("unpacked") && node["unpacked"]?.GetValue<bool>() == true;
                    bool isLink = node.ContainsKey("link");
                    if (isUnpacked || isLink)
                    {
                        // unpacked 或 link 文件只在 header 声明，不在 ASAR payload 中分配 offset
                        continue;
                    }

                    byte[] fileData = modifiedEntries.TryGetValue(path, out var mod) ? mod : GetFileBytes(path);

                    node["offset"] = curOffset.ToString();
                    node["size"] = fileData.Length;

                    const int blockSize = 4194304;
                    var blocks = new JsonArray();
                    for (int start = 0; start < fileData.Length;)
                    {
                        int length = Math.Min(blockSize, fileData.Length - start);
                        blocks.Add(CalcSha256(fileData.AsSpan(start, length).ToArray()));
                        start += length;
                    }
                    if (fileData.Length == 0) blocks.Add(CalcSha256(Array.Empty<byte>()));
                    string fileHash = CalcSha256(fileData);
                    node["integrity"] = new JsonObject
                    {
                        ["algorithm"] = "SHA256",
                        ["hash"] = fileHash,
                        ["blockSize"] = 4194304,
                        ["blocks"] = blocks
                    };

                    payloadStreams.Add(fileData);
                    curOffset += fileData.Length;
                }

                // 序列化 header
                byte[] headerJsonBytes = Encoding.UTF8.GetBytes(headerNode.ToJsonString());
                int headerSize = ((4 + headerJsonBytes.Length + 3) / 4) * 4;

                byte[] h = new byte[4 + headerSize];
                BitConverter.GetBytes((uint)headerSize).CopyTo(h, 0);
                BitConverter.GetBytes((uint)headerJsonBytes.Length).CopyTo(h, 4);
                headerJsonBytes.CopyTo(h, 8);

                byte[] prefix = new byte[8];
                BitConverter.GetBytes(4u).CopyTo(prefix, 0);
                BitConverter.GetBytes((uint)h.Length).CopyTo(prefix, 4);

                string tmpAsarPath = asarPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
                temporaryOutput = tmpAsarPath;
                log?.Invoke("💾 正在写入新版洁癖 ASAR 归档...");

                using (var fs = new FileStream(tmpAsarPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await fs.WriteAsync(prefix);
                    await fs.WriteAsync(h);
                    foreach (var chunk in payloadStreams)
                    {
                        await fs.WriteAsync(chunk);
                    }
                }

                // 替换前重读临时归档并完整校验：头部长度、packed 偏移与大小、
                // 完整性块、unpacked/link 元数据保留，以及“实际改动 == 计划改动”。
                // 临时文件写“成功”不等于归档正确，必须回读验证。
                log?.Invoke("🔍 正在重读临时归档并校验...");
                await VerifyWrittenArchiveAsync(tmpAsarPath, modifiedEntries, fileEntries, OriginalBytes, log);
                log?.Invoke("✅ 临时归档校验通过。");

                // 校验通过后才替换主文件；失败时上面的校验会抛错，
                // 原归档保持不动，只留下属于本次操作的 .tmp 供分析。
                EnsureUnchangedAndStopped(asarPath, current.Sha256);
                await PrepareBackupAsync(bakPath, source, log);
                EnsureUnchangedAndStopped(asarPath, current.Sha256);
                if (Sha256OfFile(bakPath) != source.Sha256) throw new InvalidDataException("提交前备份发生变化，已停止安装。");
                string writtenHash = Sha256OfFile(tmpAsarPath);
                File.Replace(tmpAsarPath, asarPath, null);
                if (Sha256OfFile(asarPath) != writtenHash) throw new InvalidDataException("安装后回读哈希不一致。");

                result.Success = true;
                result.Message = "✨ 永久汉化安装成功（终极洁癖模式）！所有翻译逻辑与汉化内核已完全内嵌在ASAR中，软件目录下无需任何多余文件夹！";
                log?.Invoke("🎉 " + result.Message);
                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = "安装失败: " + ex.Message;
                log?.Invoke("❌ " + result.Message);
                return result;
            }
            finally { if (temporaryOutput != null) TryDeleteTemporary(temporaryOutput); }
        }

        public static async Task<PatchResult> RestoreEnglishAsync(string asarPath, Action<string>? log = null)
        {
            await FileGate.WaitAsync();
            try { return await RestoreCoreAsync(asarPath, log); }
            finally { FileGate.Release(); }
        }

        private static async Task<PatchResult> RestoreCoreAsync(string asarPath, Action<string>? log)
        {
            var result = new PatchResult();
            string? temporaryOutput = null;
            try
            {
                if (ClientProcessGuard.IsRunningForArchive(asarPath))
                {
                    result.Message = "检测到 Antigravity 正在运行中！\n为防止文件占用冲突，请先彻底关闭 Antigravity 客户端（包括系统托盘图标），然后再执行还原。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                string dir = Path.GetDirectoryName(asarPath)!;
                string bakPath = Path.Combine(dir, "app.asar.bak");

                if (!File.Exists(bakPath))
                {
                    result.Message = "未找到备份文件 app.asar.bak，无法还原。";
                    log?.Invoke("❌ " + result.Message);
                    return result;
                }

                var current = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(asarPath));
                var backup = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(bakPath));
                var compatible = ArchiveCompatibility.CheckInstalled(current, backup, true);
                if (!compatible.Allowed || current.Version != backup.Version ||
                    !ArchiveCompatibility.CheckPristine(backup, true).Allowed)
                    throw new InvalidDataException(compatible.Allowed ? "备份版本不匹配，拒绝还原。" : compatible.Reason);
                if (!current.IsPatched)
                    return new PatchResult { Success = true, Message = "当前归档已经是原件，无需覆盖。" };
                log?.Invoke("↩️ 正在从匹配的原件备份还原 app.asar ...");
                string temporary = asarPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
                temporaryOutput = temporary;
                await File.WriteAllBytesAsync(temporary, backup.Bytes);
                if (Sha256OfFile(temporary) != backup.Sha256) throw new InvalidDataException("还原临时文件校验失败。");
                EnsureUnchangedAndStopped(asarPath, current.Sha256);
                File.Replace(temporary, asarPath, null);
                if (Sha256OfFile(asarPath) != backup.Sha256) throw new InvalidDataException("还原后哈希校验失败。");

                result.Success = true;
                result.Message = "官方英文原版还原成功！所有改动已彻底清除。";
                log?.Invoke("✅ " + result.Message);
                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = "还原失败: " + ex.Message;
                log?.Invoke("❌ " + result.Message);
                return result;
            }
            finally { if (temporaryOutput != null) TryDeleteTemporary(temporaryOutput); }
        }
        /// <summary>
        /// 清理旧版遗留物。实际编排与归属判定在 LegacyCleaner / LegacyOwnership，
        /// 便于独立做隔离测试。
        /// </summary>
        public static PatchResult CleanLegacyFiles(string installDir, Action<string>? log = null)
        {
            var outcome = LegacyCleaner.Clean(installDir, log);
            return new PatchResult { Success = outcome.Success, Message = outcome.Message };
        }

        private static void EnsureUnchangedAndStopped(string path, string expectedHash)
        {
            if (ClientProcessGuard.IsRunningForArchive(path)) throw new IOException("客户端已启动，等待下次退出后再安装。");
            if (Sha256OfFile(path) != expectedHash) throw new IOException("资源包在处理期间发生变化，等待更新完成后重试。");
        }

        private static async Task PrepareBackupAsync(string backupPath, ArchiveSnapshot source, Action<string>? log)
        {
            if (File.Exists(backupPath))
            {
                string oldHash = Sha256OfFile(backupPath);
                if (oldHash == source.Sha256) return;
                string oldVersion;
                try { oldVersion = ArchiveSnapshot.Read(await File.ReadAllBytesAsync(backupPath)).Version; }
                catch { oldVersion = "unknown"; }
                string preserved = backupPath + "." + oldVersion + "." + oldHash;
                if (!File.Exists(preserved)) File.Copy(backupPath, preserved, false);
                if (Sha256OfFile(preserved) != oldHash) throw new IOException("旧备份归档校验失败，停止覆盖。");
                log?.Invoke("📦 已保留旧版备份：" + Path.GetFileName(preserved));
            }
            string temporary = backupPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                await File.WriteAllBytesAsync(temporary, source.Bytes);
                if (Sha256OfFile(temporary) != source.Sha256) throw new IOException("新版原件备份校验失败。");
                File.Move(temporary, backupPath, true);
            }
            finally { TryDeleteTemporary(temporary); }
            log?.Invoke("📦 已建立并核对 " + source.Version + " 的原件备份。");
        }

        private static void TryDeleteTemporary(string path)
        { try { if (File.Exists(path)) File.Delete(path); } catch { /* Only this operation's unique temporary file. */ } }
    }
}
