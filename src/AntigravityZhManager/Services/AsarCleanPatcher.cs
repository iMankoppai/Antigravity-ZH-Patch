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
        private static string CalcSha256(byte[] data)
        {
            using var sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(data);
            var sb = new StringBuilder();
            foreach (byte b in hash) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }

        public static async Task<PatchResult> InstallCleanPatchAsync(
            string asarPath,
            bool enableCloseToTray = true,
            bool enableTrayMenu = true,
            Action<string>? log = null)
        {
            var result = new PatchResult();
            try
            {
                var processes = System.Diagnostics.Process.GetProcessesByName("Antigravity");
                if (processes.Length > 0)
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

                // 备份原始文件
                if (!File.Exists(bakPath))
                {
                    log?.Invoke("📦 正在创建官方原版备份: app.asar.bak ...");
                    File.Copy(asarPath, bakPath, true);
                    log?.Invoke("✅ 原版备份创建成功！");
                }
                else
                {
                    log?.Invoke("ℹ️ 已存在官方原版备份: app.asar.bak");
                }

                log?.Invoke("📖 正在读取并解构 ASAR 归档...");
                byte[] asarBytes = await File.ReadAllBytesAsync(asarPath);

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

                // 1. ipcHandlers
                ipcHandlers = ipcHandlers
                    .Replace("title: 'Open workspace'", "title: '打开工作区'")
                    .Replace("title: 'Open workspaces'", "title: '选择多个工作区'");

                // 2. mainJs
                if (!mainJs.Contains("setAppUserModelId"))
                {
                    mainJs = mainJs.Replace(
                        "const electron_1 = require(\"electron\");",
                        "const electron_1 = require(\"electron\");\nif (process.platform === 'win32') electron_1.app.setAppUserModelId('electron.app.Antigravity');"
                    );
                }

                if (enableCloseToTray && !mainJs.Contains("closeWindowToBackground"))
                {
                    mainJs = mainJs.Replace(
                        "    settingsService = new settingsService_1.SettingsService(storageManager);\n    // Handle deep link URL from command line arguments (All platforms)\n",
                        "    settingsService = new settingsService_1.SettingsService(storageManager);\n    utils_1.closeWindowToBackground = () => settingsService.getSetting(settingsService_1.SettingKey.RUN_IN_BACKGROUND);\n    // Handle deep link URL from command line arguments (All platforms)\n"
                    );
                }

                // 洁癖模式内嵌注入点
                if (!mainJs.Contains("zh-bundle.js"))
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

                if (enableCloseToTray && !utilsJs.Contains("closeWindowToBackground"))
                {
                    utilsJs = utilsJs.Replace(
                        "exports.showQuitConfirmation = false;\nfunction setShowQuitConfirmation(value) {\n",
                        "exports.showQuitConfirmation = false;\nexports.closeWindowToBackground = null;\nfunction setShowQuitConfirmation(value) {\n"
                    );

                    utilsJs = utilsJs.Replace(
                        "    }\n    void win.loadURL(url);\n",
                        "    }\n    let closePending = false;\n    let allowNormalClose = false;\n    win.on('close', (event) => {\n        if (process.platform !== 'win32' || allowNormalClose || !exports.closeWindowToBackground) return;\n        event.preventDefault();\n        if (closePending) return;\n        closePending = true;\n        Promise.resolve().then(() => exports.closeWindowToBackground()).then((enabled) => {\n            if (win.isDestroyed()) return;\n            if (enabled) win.hide();\n            else { allowNormalClose = true; win.close(); }\n        }).catch((error) => {\n            console.error('Unable to read background setting for window close:', error);\n            if (!win.isDestroyed()) { allowNormalClose = true; win.close(); }\n        }).finally(() => { closePending = false; });\n    });\n    try { require('./zh-bundle.js').attach(win, url); } catch(e){ console.error('ZH attach error', e); }\n    void win.loadURL(url);\n"
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
                    ["dist/zh-bundle.js"] = zhBundleBytes
                };

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

                string tmpAsarPath = asarPath + ".tmp";
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

                // 替换主文件
                File.Move(tmpAsarPath, asarPath, true);

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
        }

        public static async Task<PatchResult> RestoreEnglishAsync(string asarPath, Action<string>? log = null)
        {
            var result = new PatchResult();
            try
            {
                var processes = System.Diagnostics.Process.GetProcessesByName("Antigravity");
                if (processes.Length > 0)
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

                log?.Invoke("↩️ 正在从官方原版备份还原 app.asar ...");
                await Task.Run(() => File.Copy(bakPath, asarPath, true));

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
        }

        public static PatchResult CleanLegacyFiles(string installDir, Action<string>? log = null)
        {
            var result = new PatchResult();
            try
            {
                int count = 0;
                string legacyDir = Path.Combine(installDir, "中文补丁");
                if (Directory.Exists(legacyDir))
                {
                    log?.Invoke($"🧹 正在清理旧版外部文件夹: {legacyDir} ...");
                    Directory.Delete(legacyDir, true);
                    count++;
                }

                // 清理可能散落在根目录的已知历史补丁脚本（精确匹配，绝不使用通配符误伤用户自定义维护脚本）
                string[] legacyScriptNames = {
                    "install.cmd", "install.vbs", "install.ps1",
                    "restore.cmd", "restore.vbs", "restore.ps1",
                    "restore-en.cmd", "restore-en.vbs", "restore-en.ps1",
                    "common.ps1", "launch.ps1"
                };
                foreach (var scriptName in legacyScriptNames)
                {
                    string scriptFile = Path.Combine(installDir, scriptName);
                    if (File.Exists(scriptFile))
                    {
                        try
                        {
                            File.Delete(scriptFile);
                            log?.Invoke($"🧹 已清理旧脚本: {scriptName}");
                            count++;
                        }
                        catch { }
                    }
                }

                result.Success = true;
                result.Message = $"清理完成！共清理了 {count} 处旧脚本与残留文件夹，目录已恢复极致清爽！";
                log?.Invoke("✨ " + result.Message);
                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = "清理失败: " + ex.Message;
                log?.Invoke("❌ " + result.Message);
                return result;
            }
        }
    }
}
