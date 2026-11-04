---
name: optimize-web
description: 优化 Unity WebGL 和 WebGPU 构建以实现更小的下载、更快的加载和更流畅的浏览器性能。用于被要求缩小 Web 构建、加速其加载，或修复浏览器中的卡顿、内存或电池问题时。
---
审计并应用 Player Settings、压缩、剥离和服务器设置，使 Unity Web 构建更小更快。

## 重要

- 每一步都使用 unity cli（`unity command --format json`）和 `unity-cli` 技能。在可用时也使用 `unity-pipeline`。
- 在做出更改之前，先建立当前行为的基线，以便你能判断后续结果是否确实由你的更改引起。
- 创建一个还原点，以便在你的更改失败时回滚。
- 只做所要求的事情。不要更改无关的资产或文件。
- 如果更改影响运行时行为，添加 `Debug.Log` 行以证明实际场景行为（不仅仅是你的更改）现在正常工作——你稍后进入 Play 模式验证时会阅读它们。例如，如果你的修复旨在确保 GameObject 改变大小，请记录其 Transform 缩放。
- 避免冗长的解释。

## 性能说明
- 花时间彻底完成这项工作。
- 质量比速度更重要。

## 完整主题地图

在你继续工作流或诊断之前：

1. 打开并阅读涵盖与你打算做或修复的内容相关的具体主题的[文档页面](#full-topic-map)，并检查你是否遗漏了什么。
2. 在回答中说明你阅读的文件。

这是因为你关于 Unity 的训练知识可能过时、不正确或针对错误的 Unity 版本。

如果编辑器安装文件夹有 `Data/Documentation` 文件夹（例如 `...Unity/Hub/Editor/6000.6.0b2/Editor/Data/Documentation`），请从 `<editor-install>/Editor/Data/Documentation/en/Manual` 文件夹读取 html 文件。否则文档页面在线位于 `https://docs.unity.com/en-us/engine/<VERSION>/manual/`。

对于本技能使用的包（`com.unity.cloud.ktx`、`com.unity.addressables`、`com.unity.web.stripping-tool`），文档页面是 Unity Manual 的本地 markdown 转换，存储在 `<project-folder>/Library/PackageCache/<package-name>@*/`。只读取该特定 `PackageCache` 子文件夹中的 .md 文件。你不得查看非 .md 文件，或查看其他 Library 或 PackageCache 文件夹，否则耗时太长。如果该文件夹没有 `.md` 文件，请改用 `https://docs.unity3d.com/Packages/<package-name>@<VERSION>/manual/`。

优先使用 `WebFetch` 而非 `WebSearch`——更快且能落到确切的参考。只获取你需要的内容。获取前将 `<VERSION>` 替换为以下内容：

- **docs.unity3d.com**：Unity 版本，例如 `6000.6`
- **docs.unity3d.com 上的包**：包版本，例如 `@6.6` 或 `@2.0`。如果不确定请检查包版本。
- **docs.unity.com**：Unity 版本，例如 `6000.6`

从 `ProjectSettings/ProjectVersion.txt` 读取 Unity major.minor（例如从 `6000.0.58f1` 得到 `6000.0`，因为完整构建号会给出 404），并从 `Packages/packages-lock.json` 读取每个包的 major.minor。

- [Recommended Player settings to optimize your Web build](https://docs.unity.com/en-us/engine/<VERSION>/manual/platform-specific/webgl/building-distribution/web-optimization/player.md) —— 本地 `web-optimization-player.html`：压缩、剥离、异常和内存的发布值。
- [Use C# code to enable optimization settings](https://docs.unity.com/en-us/engine/<VERSION>/manual/platform-specific/webgl/building-distribution/web-optimization/c-sharp.md) —— 本地 `web-optimization-c-sharp.html`：一步应用推荐设置的编辑器脚本。
- [Remove unused resources from your Web build](https://docs.unity.com/en-us/engine/<VERSION>/manual/platform-specific/webgl/building-distribution/web-optimization/remove-resources.md) —— 本地 `web-optimization-remove-resources.html`：移除未使用的包和剥离着色器变体。
- [Distribution size and code stripping](https://docs.unity.com/en-us/engine/<VERSION>/manual/platform-specific/webgl/building-distribution/distributionsize-codestripping.md) —— 本地 `webgl-distributionsize-codestripping.html`：什么驱动 Web 构建大小以及剥离如何工作。
- [Deploy a Web application](https://docs.unity.com/en-us/engine/<VERSION>/manual/platform-specific/webgl/building-distribution/deploying.md) —— 本地 `webgl-deploying.html`：服务器压缩头、MIME 类型和 Decompression Fallback。
- [Memory in Unity Web](https://docs.unity.com/en-us/engine/<VERSION>/manual/platform-specific/webgl/develop/memory.md) —— 本地 `webgl-memory.html`：Wasm 堆大小、内存增长和浏览器内存限制。

### API 参考

API 是 `UnityEditor.PlayerSettings`、`UnityEditor.PlayerSettings.WebGL` 和 `UnityEditor.WebGL.UserBuildSettings`，是 Unity 引擎的一部分。它按 Unity 版本进行版本化，因此在依赖特定类或方法之前，请检查项目的 Unity 版本。

1. 使用 `unity-cli` 技能检查项目的 Unity 版本。
2. 如果编辑器安装文件夹有 `Data/Documentation` 文件夹（例如 `.../Unity/Hub/Editor/6000.6.0b2/Editor/Data/Documentation`），请 grep 其中 `en/ScriptReference` 文件夹内的 html 文件，并跳过其余步骤。
3. 否则，获取并缓存 `https://docs.unity3d.com/<VERSION>/Documentation/ScriptReference/xrefmap.yml`（将 `<VERSION>` 替换为 Unity 版本，例如 `6000.3`）。此文件将每个公开 API 成员的完全限定名列为 `uid`（例如 `uid: 'UnityEngine.Rigidbody.AddForce(UnityEngine.Vector3)'`）。
4. 在本地 grep yml 文件以查找类或方法，而不是每次查找都重新获取。该文件很大（约 6 MB），所以不要读取整个文件。
5. 将 `uid` 转换为 markdown 页面：移除括号中的参数，转为小写，将 `.` 替换为 `/`，并添加 `.md`。然后获取 `https://docs.unity.com/en-us/engine/<VERSION>/script-reference/<converted uid>`。例如，`UnityEngine.Rigidbody.AddForce(UnityEngine.Vector3)` => `https://docs.unity.com/en-us/engine/6000.3/script-reference/unityengine/rigidbody/addforce.md`。所有重载都在同一页面上。
   - 构造函数使用 `ctor`（例如 `unityengine/vector3/ctor.md`），索引器使用 `item`（例如 `unityengine/vector3/item.md`）。
   - 对于运算符，获取类页面（例如 `unityengine/vector3.md`）并跟随其链接。
   - 页面内的链接以 `/engine/` 开头。在它们前面加上 `https://docs.unity.com/en-us`。
   - 如果该 Unity 版本没有该页面，请改用 `xrefmap.yml` 条目中的 `href`（例如 `href: 'Rigidbody.AddForce.html'` => `https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Rigidbody.AddForce.html`）。

始终使用项目 Unity 版本的文档，而不是依赖训练知识，因为 API 经常在版本之间被标记为过时。

KTX API（`KtxUnity`）是 `com.unity.cloud.ktx` 包的一部分。它按包版本而非 Unity 版本进行版本化，因此在依赖特定类或方法之前，请检查项目已安装的包版本。

1. 从 `Packages/packages-lock.json` 读取已安装的包版本。
2. 获取并缓存 `https://docs.unity3d.com/Packages/com.unity.cloud.ktx@<version>/xrefmap.yml`（将 `<version>` 替换为已安装的包版本，例如 `3.4`）。此文件将每个公开 API 成员的完全限定名映射到其文档页面 `href`。
3. 在本地 grep yml 文件以查找类或方法，而不是每次查找都重新获取。不要读取整个文件。

## 过程

1. 获取项目上下文：从 `ProjectSettings/ProjectVersion.txt` 获取 Unity 版本，从 `Packages/packages-lock.json` 获取你需要的包版本（`com.unity.cloud.ktx`、`com.unity.addressables`、`com.unity.web.stripping-tool`）。如果没有项目，假定 Unity `6000.0`。对于 `packages-lock.json` 中未列出的任何包，假定该包文档中的最新版本。保留你确实找到的每个版本——只对实际缺失的值使用默认值。在报告中说明每个假设并继续。如果用户没有说要优化什么且没有可读取的项目，请询问他们想改进什么。
2. 从[完整主题地图](#full-topic-map)阅读涵盖该任务的文档页面。
3. 按[在编辑器中运行 C#](#running-c-in-the-editor)所述设置 `script eval`。如果没有可访问的编辑器或缺少 `script eval`，请说明，跳到第 5 步，然后直接到第 9 步。在报告中将构建验证和运行时检查标记为未执行，并基于用户请求和第 2 步的文档给出建议。
4. 运行 [0. 预检](#0-pre-flight)和 [1. 评估当前状态](#1-assess-current-state)。它们的结果是你的基线。
5. 将请求匹配到 [2. 理解请求](#2-understand-request)中的一行。
6. 创建还原点，然后应用 [3. Web 构建优化工作流](#3-web-build-optimization-workflow)中的更改。如果症状匹配 [5. 故障排除](#5-troubleshooting)，请遵循该条目。
7. 运行 [4. 验证](#4-validation)：重新运行预检代码段并将值与你的基线比较。
8. 执行[最后一步](#final-step)中的检查。
9. 给出[最终报告](#final-report)。

## 在编辑器中运行 C#

下面每个读取或写入 Player Setting 的步骤都通过 Unity
CLI 在实时编辑器中运行。**`unity-cli` 技能负责带你到达那里**——安装 CLI、确认已连接的
编辑器、添加项目的 `com.unity.pipeline` 包、区分真正缺失的编辑器
与卡在安全模式中的编辑器，以及发现编辑器的命令目录。先遵循它；不要在这里
重新推导任何内容。

有两件事它无法替你了解：

- **你特别需要 `script eval`**，而不仅仅是一个可访问的编辑器。确认它出现在目录中。
  它的存在取决于 Pipeline 包版本，而不是 CLI，因此健康的安装仍可能
  缺少它——如果缺失，请说明并跳过读取或写入设置的步骤。
- **你可以在必要时从 `ProjectSettings/ProjectSettings.asset` 读取 Player Settings，但不要
  以那种方式写入它们。** 序列化名称不匹配 API 名称，其中若干设置
  是按构建目标的，且手编辑的值会与构建实际
  使用的值静默不一致。无法访问的编辑器是写入步骤的停止信号。

使用 `unity command script eval --caller plugin --skill optimize-web --code '<snippet>'` 运行 C#。`unity command` 默认超时为
30 秒。

### 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**，因此编写代码时不要带 `using` 指令，并使用
完全限定的类型。如果代码无法编译，请在此查找错误：

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| `CS0210` | `using` 指令，例如 `using UnityEditor;`，编译器将其读取为资源释放语句 | 移除该指令并限定类型 |
| `CS0246` | 未限定的类型，例如 `PlayerSettings` | 使用完整名称，如 `UnityEditor.PlayerSettings` |
| `CS0104` | 裸 `Object`，与 `object` 产生歧义 | 使用 `UnityEngine.Object` |

### 读取本技能审计的设置

一次调用返回整个预检画面。在 Unity 6000.5.7f1 上验证：

```csharp
var target = UnityEditor.Build.NamedBuildTarget.WebGL;
var w = new System.Collections.Generic.List<string>();
w.Add($"activeBuildTarget={UnityEditor.EditorUserBuildSettings.activeBuildTarget}");
w.Add($"compressionFormat={UnityEditor.PlayerSettings.WebGL.compressionFormat}");
w.Add($"decompressionFallback={UnityEditor.PlayerSettings.WebGL.decompressionFallback}");
w.Add($"stripEngineCode={UnityEditor.PlayerSettings.stripEngineCode}");
w.Add($"managedStrippingLevel={UnityEditor.PlayerSettings.GetManagedStrippingLevel(target)}");
w.Add($"il2cppCodeGeneration={UnityEditor.PlayerSettings.GetIl2CppCodeGeneration(target)}");
w.Add($"apiCompatibilityLevel={UnityEditor.PlayerSettings.GetApiCompatibilityLevel(target)}");
w.Add($"exceptionSupport={UnityEditor.PlayerSettings.WebGL.exceptionSupport}");
w.Add($"debugSymbolMode={UnityEditor.PlayerSettings.WebGL.debugSymbolMode}");
w.Add($"dataCaching={UnityEditor.PlayerSettings.WebGL.dataCaching}");
w.Add($"wasm2023={UnityEditor.PlayerSettings.WebGL.wasm2023}");
w.Add($"initialMemorySize={UnityEditor.PlayerSettings.WebGL.initialMemorySize}");
w.Add($"maximumMemorySize={UnityEditor.PlayerSettings.WebGL.maximumMemorySize}");
w.Add($"memoryGrowthMode={UnityEditor.PlayerSettings.WebGL.memoryGrowthMode}");
w.Add($"targetFrameRate={UnityEngine.Application.targetFrameRate}");
w.Add($"vSyncCount={UnityEngine.QualitySettings.vSyncCount}");
return string.Join("\n", w);
```

**要弄对的三个 API 名称**，因为显而易见的拼写不存在且无法编译：

| 设置 | 正确形式 | 不存在 |
|---|---|---|
| 托管剥离级别 | `PlayerSettings.GetManagedStrippingLevel(NamedBuildTarget.WebGL)` | `PlayerSettings.managedStrippingLevel` |
| Wasm 代码优化 | `UnityEditor.WebGL.UserBuildSettings.codeOptimization` | `PlayerSettings.WebGL.codeOptimization`、`PlayerSettings.WebGL.optimizationLevel` |
| IL2CPP 代码生成 | `PlayerSettings.GetIl2CppCodeGeneration(NamedBuildTarget.WebGL)` | 裸属性 |

`UserBuildSettings` 位于 WebGL 构建支持模块中，因此仅当该模块
已安装时才能解析。在与其余部分分开的调用中读取它，并将解析失败视为 "Web
模块未安装"，而不是不良代码段。

**`codeOptimization` 是这里唯一不位于项目文件中的设置。** 它持久化到
`Library/EditorUserBuildSettings.asset`，而 `Library/` 被每个标准 Unity
`.gitignore` 所 gitignore，因此此值是每台机器的，不会传递：队友和 CI 不会继承它。
两个后果。通过 API 回读它，不要在
`ProjectSettings/ProjectSettings.asset` 中查找它——即使成功应用它也不在那里，因此它的
缺失不是失败。如果发布构建在 CI 中运行，请将其作为构建步骤在那里应用，而不是
假设代码仓库携带它。

### 应用设置

本技能中的大多数写入是单个批次，而
[scripts/WebOptimizer.cs](scripts/WebOptimizer.cs) 已经是该批次。它声明一个带 `[MenuItem]` 的类，
因此它是**项目文件，不是 `script eval` 输入**——类声明无法
展平为语句块。将其保存到 `Assets/Editor/` 下，让 Unity 编译，然后在一行中调用它：

```csharp
UnityEditor.EditorApplication.ExecuteMenuItem("Tools/Apply Web Release Settings");
```

保留其 `using` 指令；它们在文件中是正确的。对于一次性更改——单个质量
层级、帧率翻转——内联 `script eval` 语句即可。

### 从磁盘验证，而非从你刚写入的对象验证

**在同一会话中应用设置并回读它什么也证明不了。** Player Settings 是
内存对象，直到有东西保存它们，因此每次回读都返回你刚赋的值，
无论它是否到达 `ProjectSettings/ProjectSettings.asset`。跳过保存的运行报告成功，而当
编辑器会话结束时整个更改都消失了。这是观察到的，不是推测的：一次运行应用了
一切，回读 Brotli / High / None，说完成了，而磁盘上的文件从未改变。

因此任何写入之后：

1. **保存。** `UnityEditor.AssetDatabase.SaveAssets()`。`WebOptimizer.cs` 现在自己做这个；内联
   `script eval` 写入必须显式执行它。
2. **回读值并报告它们。** 不是 "applied successfully"，而是实际值，以便
   用户可以看到存储的内容。`WebOptimizer.cs` 记录全部九项。
3. **对于任何按构建目标的设置，说明你读取的目标。** 其中若干设置每个目标存在一次，
   因此一个值可能对一个目标正确而对正在构建的目标未设置。

同样的陷阱在文件编辑路线中以相反方式存在：手编辑的
`ProjectSettings.asset` 回读正常，而运行的编辑器和构建仍使用旧的
值。在保存和重新导入后验证才能捕获两者。

**不要尝试在批处理模式下复现这个。** 使用 `-quit` 调用的批处理编辑器在
退出时保存设置，因此未保存的写入无论如何都会持久化，运行看起来正确。保存和非保存
版本的脚本在 `-quit` 下都通过。该 bug 仅出现在实时编辑器会话中，也就是
发现它的地方。从绿色批处理运行得出保存不必要的结论，是从一个看不到缺陷的测试中得出的错误
结论。

## 0. 预检

1. **确认 Web 构建目标：** 使用上面的预检代码段读取 `EditorUserBuildSettings.activeBuildTarget`——必须是 `WebGL`；如果不是，警告用户。
2. **读取压缩和剥离设置：** 使用上面的预检代码段读取 `compressionFormat`、`decompressionFallback`、`stripEngineCode` 和托管剥离级别。注意剥离级别是 `PlayerSettings.GetManagedStrippingLevel(NamedBuildTarget.WebGL)`——没有 `PlayerSettings.managedStrippingLevel` 属性。
3. **读取异常和优化设置：** 从上面的预检代码段读取 `PlayerSettings.WebGL.exceptionSupport`。对于 wasm 代码优化级别使用 `UnityEditor.WebGL.UserBuildSettings.codeOptimization`——`PlayerSettings.WebGL.codeOptimization` 和 `optimizationLevel` 拼写不存在且不会编译。
4. **读取帧率设置：** 使用上面的预检代码段读取 `Application.targetFrameRate` 和 `QualitySettings.vSyncCount`。
5. **读取额外的玩家设置：** 使用上面的预检代码段读取 `PlayerSettings.WebGL.dataCaching`、`PlayerSettings.WebGL.debugSymbolMode`、`PlayerSettings.WebGL.maximumMemorySize` 和 `PlayerSettings.GetApiCompatibilityLevel`。
6. 仅在确认了压缩、剥离、帧率和玩家设置后才继续。

## 1. 评估当前状态

1. **检查 Build Report：** 指导用户在构建后打开 `Window > General > Build Report` 并识别最大的资产和代码大小贡献者。
2. **验证服务器配置：** 请用户确认托管服务器是否发送 `Content-Encoding: br`（Brotli）或 `Content-Encoding: gzip` 头，以及是否为 `.wasm` 文件设置 `Content-Type: application/wasm`。
3. **检查帧率配置：** 使用上面的预检代码段确认 `Application.targetFrameRate`——对于 Web 应为 `-1`（让浏览器驱动）。
4. **检查内存设置：** 使用上面的预检代码段读取 `PlayerSettings.WebGL.initialMemorySize` 和 `PlayerSettings.WebGL.memoryGrowthMode`。
5. 在提出建议之前报告发现。

## 2. 理解请求

| 用户说 | 默认解读 |
|-----------|----------------------|
| "build too large" / "download too slow" | Strip Engine Code 开；Managed Stripping High；Disk Size + LTO；Brotli |
| "Decompression Fallback" / "slow startup" | Decompression Fallback 关；修复服务器以发送 Content-Encoding |
| "stutter in Chrome" / "stutter in Safari" | 在浏览器 DevTools 中分析；Safari 上限 60 fps |
| "excessive battery in browser" | 静态屏幕使用 `OnDemandRendering`；`targetFrameRate = -1` |
| "exceptions too large" | 发布用 None；如果浏览器基线允许则用 Wasm 2023 异常 |
| "set up CDN" | Addressables 远程组 + CDN 上的 Brotli/Gzip |
| "WebAssembly 2023" | 当浏览器基线支持时启用——更小更快 |
| "memory growth slow" | 将 Initial Memory Size 调至峰值估计；使用 Geometric 增长模式 |
| "KTX" / "Basis Universal" / "texture formats unknown GPU" | KTX2 配合 Basis Universal；ETC1S 用于大小，UASTC 用于质量 |
| "strip unused code" / "remove unused packages" | Web Stripping Tool + 移除未使用的包 + 着色器剥离 |
| "quality settings for web" | Quality Level 设为 Very Low 或 Low；较低质量 = 更快加载 |
| "shader variants too many" | Graphics 设置：自动光照贴图/雾模式；剥离实例化 + BRG 变体；审计 Always Included Shaders |
| "video not playing" / "audio issues" | 视频：仅 URL 或 StreamingAssets；音频：Web 上无 AudioEffects，使用 Mono，压缩 |
| "profiler symbols" / "can't read Wasm stacks" | 通过构建处理器或 emscriptenArgs 嵌入分析符号 |
| "iOS crashes" / "Safari memory" | iOS 内存限制；将 Initial Memory Size 设高而不是增长；iOS 18 之前 Gigacage 2GB 限制 |

## 3. Web 构建优化工作流

### 重要：一键优化脚本

**始终主动提出为用户生成此脚本。** Unity 官方 Web 优化文档提供单个编辑器菜单脚本，一次应用所有推荐的发布设置。放在 `Assets/Editor/WebOptimizer.cs`——模板见 [scripts/WebOptimizer.cs](scripts/WebOptimizer.cs)。

根据用户项目需求改编脚本（例如如果他们使用 `try/catch` 则保留异常，HTTP 托管时将 Brotli 切换为 Gzip）。此脚本是对新 Web 项目影响最大的单一操作——它防止遗漏设置。

### Player Settings 审计

通过 `script eval` 验证并设置这些值：

| 设置 | 发布建议 |
|---|---|
| **Compression Format** | **Brotli**（HTTPS 托管）；HTTP 用 Gzip |
| **Decompression Fallback** | 服务器正确配置时**关** |
| **Strip Engine Code** | **开** |
| **Managed Stripping Level** | **High**（发布）/ Medium（开发） |
| **Code Optimization** | **Disk Size with LTO**（发布）/ Build Times（开发） |
| **WebAssembly Language Features** | 如果浏览器基线允许则 **2023** |
| **Enable Exceptions** | **None**（最小）；如果需要 `try/catch` 则 Explicitly Thrown Only |
| **Initial Memory Size** | 调至峰值估计；太小会导致昂贵的增长 |
| **Memory Growth Mode** | **Geometric** |
| **API Compatibility Level** | **.NET Standard 2.1** —— 比 .NET Framework 更小 |
| **IL2CPP Code Generation** | **Optimize Size** —— 更小的 Wasm，略有运行时成本 |
| **Debug Symbols** | 发布用**关**；仅开发构建开启 |
| **Data Caching** | **开** —— 在浏览器 IndexedDB 中缓存资产数据以加快重复加载 |
| **Strip Unused Mesh Components** | **开** —— 移除未使用的顶点属性 |
| **Maximum Memory Size** | **2048 MB** 默认；复杂 3D 最多 4096（Firefox 和 Chrome < 119 在 2048 以上有问题） |
| **vSyncCount** | 0（浏览器处理节奏） |
| **targetFrameRate** | -1（使用 `requestAnimationFrame`） |

### 压缩和服务器配置

| 压缩 | 何时使用 | 备注 |
|---|---|---|
| **Brotli** | HTTPS 或 localhost | 最佳比率；浏览器仅在安全上下文中接受 |
| **Gzip** | HTTP 交付、旧版 CDN | 通用 |
| **None** | 本地开发 / file:// | 最大负载；不要发布 |

配置服务器以：
- 用 `Content-Encoding: br` 提供 `.br` 文件。
- 用 `Content-Encoding: gzip` 提供 `.gz` 文件。
- 为 `.wasm` 设置 `Content-Type: application/wasm`，为 `.js` 设置 `application/javascript`。
- 启用 HTTP/2 或 HTTP/3 以并行化块获取。

如果主机无法注入 `Content-Encoding`：仅作为回退设置 **Decompression Fallback = On**——它增加约 150 KB JS 并减慢启动。

### 异常处理

| 设置 | 构建大小 | 使用 |
|---|---|---|
| **None** | 最小 | 未捕获异常可接受的发布构建 |
| **Explicitly Thrown Only** | 适中 | 捕获异常的项目的默认值 |
| **Full** | 最大、最慢 | 很少需要；发布时避免 |

Wasm 2023 引入更便宜的异常模型；当浏览器目标支持时，从 Explicitly Thrown Only（旧版）切换到 Wasm 异常可同时减少大小和成本。

### 移除未使用的资源

三个类别审计以减少构建大小：

**1. 未使用的包** —— 检查 `Packages/manifest.json` 以及 Package Manager 的 **In Project** 和 **Built-in** 视图。移除或禁用项目不使用的包。Input System 包如果未使用是重要的体积贡献者。

**2. 着色器剥离** —— 在 `Edit > Project Settings > Graphics` 中配置：

| 设置 | 建议 |
|---|---|
| **Lightmap Modes** | Automatic（剥离未使用的光照贴图着色器变体） |
| **Fog Modes** | Automatic（剥离未使用的雾着色器变体） |
| **Instancing Variants** | Strip Unused |
| **Batch Renderer Group Variants** | Strip All（如果不使用 BRG） |
| **Always Included Shaders** | 审计并移除项目不引用的任何着色器 |

剥离后测试——确保你没有移除任何被引用的着色器。

**3. Web Stripping Tool**（`com.unity.web.stripping-tool`）—— 分析 WebAssembly 二进制并识别未使用的 Unity 引擎子模块（例如仅 2D 游戏中的 3D 图形）。通过 Package Manager 安装，分析构建，然后配置要排除哪些子模块。可以产生超出 Managed Stripping Level 单独实现的显著大小减少。

### Web 的质量设置

较低质量层级减少加载时间并改善运行时性能。通过 `Edit > Project Settings > Quality` 设置：

- 使用 **Very Low** 或 **Low** 作为默认 Web 质量层级。
- 用 `script eval` 设置它：`UnityEngine.QualitySettings.SetQualityLevel(0, true);`，其中 0 = Very Low。
- 考虑创建 Web 专用质量层级，禁用浏览器中不必要的功能（实时阴影、后处理效果、高粒子数）。

### Web 上的帧率

- 用 `script eval` 设置它：`UnityEngine.Application.targetFrameRate = -1;` —— 让浏览器使用 `requestAnimationFrame`。
- 注意：**Safari 在 WebGL 中上限为 60 fps**；高刷新率目标不适用。
- 使用 `OnDemandRendering.renderFrameInterval` 在静态/空闲屏幕降至 5–10 fps 以节省电池。

### KTX / Basis Universal 纹理

KTX2 配合 Basis Universal 超压缩发布单个纹理文件，在加载时转码为浏览器设备的最佳 GPU 格式（桌面 BC7、移动 ASTC、较旧 Android ETC2）。这避免了为每个 GPU 系列发布单独的纹理变体——对于目标硬件未知的 Web 至关重要。

| 主题 | 指导 |
|---|---|
| **包** | 通过 Package Manager 安装 `com.unity.cloud.ktx`（KtxUnity） |
| **何时使用** | 通过 Addressables 或资产包提供给未知 GPU 目标的运行时加载纹理 |
| **何时不使用** | 烘焙到播放器构建中的纹理——Unity 已在构建时选择正确格式 |
| **超压缩** | 用 **ETC1S** 获得最小大小（有损，适合漫反射/反照率）；**UASTC** 获得更高质量（近无损，更适合法线/UI） |
| **编码** | 用 `toktx` 或 `basisu` CLI 离线编码；不要在运行时编码 |
| **线性数据** | 编码法线贴图、遮罩或数据纹理时设置 `--assign_oetf linear` 以避免错误的 sRGB 转换 |
| **Mip 贴图** | 在编码时生成 mip（`--genmipmap`）——浏览器端 mip 生成很昂贵 |
| **加载** | 使用 `KtxTexture.LoadFromStreamingAssets` 或通过 UnityWebRequest 加载字节并调用 `KtxTexture.LoadFromBytes` |
| **内存** | 转码纹理是标准 GPU 纹理；内存成本等于目标格式，而非 KTX2 文件大小 |
| **方向** | 始终包含 `--lower_left_maps_to_s0t0` 以匹配 Unity 的 UV 约定 |

**`toktx` CLI 示例：** 参见 [scripts/toktx-examples.sh](scripts/toktx-examples.sh) 获取涵盖反照率（ETC1S）、法线/细节（UASTC）、ICC 配置文件错误和线性数据的命令。

### Web 上的流式传输

- 使用 Addressables 配合托管在 CDN 上、带 Brotli / Gzip 的**远程组**。
- 避免将整个游戏捆绑到初始下载中；按需流式传输关卡。
- 目标 < 30 MB 初始下载以实现 "instant play"；关卡数据随后。
- 对于面向混合 GPU 硬件的流式纹理，优先使用 KTX2 包而非按平台变体——一个包服务所有浏览器。

### 分析 Web 构建

| 工具 | 用途 | 备注 |
|---|---|---|
| **Chrome DevTools > Performance** | CPU 火焰图；主线程分析 | WebGL 卡顿的默认首选；检查 Wasm 调用堆栈 |
| **Chrome DevTools > Memory** | 堆快照；分配时间线 | 查找 JS/Wasm 内存泄漏；在场景加载前后比较快照 |
| **Firefox Profiler** | 跨平台；可分享 URL；原生 + Wasm 视图 | 某些情况下比 Chrome 更好的 Wasm 符号化；可分享的分析 URL 供团队审查 |
| **Safari Web Inspector** | iOS Safari 和 macOS Safari 调试 | Safari 特定问题所需；WebGL/Wasm 运行时与 Chromium 不同 |
| **Unity Profiler over WebSocket** | 连接到开发构建；标准标记 | 用于 Unity 端标记（GC、渲染、脚本）；不捕获浏览器端开销 |

**症状 → 工具快速参考：**

| 症状 | 一线工具 | 二线工具 |
|---|---|---|
| WebGL 卡顿 / 顿挫 | Chrome DevTools > Performance | Firefox Profiler |
| 内存随时间攀升 | Chrome DevTools > Memory | Unity Memory Profiler（WebSocket） |
| 初始加载缓慢 | Chrome DevTools > Network | Build Report Inspector |
| 仅 Safari 渲染问题 | Safari Web Inspector | 与 Chrome DevTools 比较 |

**嵌入分析符号** —— 浏览器分析器默认显示混乱的 Wasm 函数名。要在 Chrome/Firefox 火焰图中获得可读的 C# 方法名，要么为开发构建启用 `Player Settings > Publishing > Debug Symbols`，要么添加构建处理器：

```csharp
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

public class WebProfilingBuildProcessor : IPreprocessBuildWithReport
{
    public int callbackOrder => 0;
    public void OnPreprocessBuild(BuildReport report)
    {
        PlayerSettings.SetAdditionalIl2CppArgs("--compiler-flags=--profiling-funcs");
    }
}
```

**Emscripten 内置分析器** —— 通过 `PlayerSettings.WebGL.emscriptenArgs` 一次启用一个：

| 标志 | 显示什么 |
|---|---|
| `--cpuprofiler` | 浏览器中的 CPU 分析器叠加层 |
| `--memoryprofiler` | 可视化内存图（白色=已分配未使用，粉色=堆栈，蓝色=动态，绿色=碎片化） |
| `--threadprofiler` | 线程活动分析器 |

**GPU 调试** —— Web 上不支持 Frame Debugger。使用 [Spector.js](https://spector.babylonjs.com/) 作为基于浏览器的替代——它捕获绘制调用和 WebGL 状态。

**Firefox `about:memory`** —— 在 Firefox 中将 `about:memory` 作为 URL 输入，单击 Measure 查看每个标签页的细分：WASM 代码大小、WASM 堆、.data 文件、web audio。注意 WASM 堆 > 300 MB（崩溃风险，尤其是在 iOS Safari 上）。

编辑器 Play 模式不代表浏览器运行时；始终在浏览器中测量。Chrome 和 Safari 的 GC 和 JIT 行为不同——两者都测试。

### Web 内存指令

- 在纹理和网格上禁用 **Read/Write Enabled**——它将数据复制到 WASM 堆。
- 通过将资产移到 Addressables 或 AssetBundles 减少 `.data` 文件大小。
- 使用压缩纹理格式（KTX2/Basis）以减少下载和解码内存成本。

### iOS Safari 内存限制

- **iOS < 18：** WebContent 进程限制约 1.5 GB。WASM 内存（Gigacage）上限 2 GB。类型化数组共享此池。在 iPhone X（iOS 16）上堆增长上限约 512 MB，但预先将 Initial Memory Size 设为 512 MB–1.5 GB 可行。
- **iOS 18+：** 限制基本解除；iPhone 11 可分配约 4 GB。
- 在 iOS 上，将 **Initial Memory Size** 设为目标峰值，而不是依赖增长——Safari 处理大的预先分配比增量增长更好。
- WASM 堆 > 300 MB 在较旧 iOS 上有崩溃风险；为广泛兼容目标 < 200 MB。

### Web 上的视频和音频

- **视频：** 播放仅从 URL（启用 CORS 的服务器）或从 StreamingAssets 工作。在 iOS 上服务器必须支持 HTTP 范围请求以进行流式传输。使用浏览器兼容格式（MP4/H.264）。
- **音频：** AudioEffects（混音器效果）需要计算着色器——**WebGL 上不可用**。混音器和 MixerGroup 仅用于音量控制。将音频设为 **Mono** 以改善加载。如果 `about:memory` 显示 web audio > 100 MB，音频可能未压缩——切换到 Vorbis。

### Canvas 和 DPI

如果 canvas 被放大，它采用新分辨率。在 Web 模板中使用 `devicePixelRatio` 以抵消 DPI 缩放并避免以不必要的高分辨率渲染。

## 4. 验证

1. 使用预检代码段重新读取 Player Settings（压缩、剥离、异常、targetFrameRate）。
2. 重新构建播放器并将 Build Report 文件大小与基线比较。
3. 至少在 Chrome 和 Safari 中验证（GC 和 JIT 行为不同）。
4. 最多 **3 次迭代**，然后询问用户反馈。

## 5. 故障排除

### 启用 Strip Engine Code 后构建仍然很大

1. **Managed Stripping Level** 是否设置为 Medium 或 Low？→ 发布时设为 High。
2. 插件是否使用反射访问否则会被剥离的引擎模块？→ 添加 `link.xml` 以保留所需符号。
3. **Exceptions** 是否设置为 Full？→ Full 增加最大的代码开销；切换到 None 或 Explicitly Thrown Only。

### Brotli 不工作——需要 Decompression Fallback

1. 服务器是否发送 `Content-Encoding: br`？→ 没有此头浏览器不会解压；此时需要回退 JS 解压器。
2. 构建是否通过 HTTP（而非 HTTPS）托管？→ Brotli 需要安全上下文；HTTP 托管时降级到 Gzip。

### Safari 卡顿但 Chrome 不卡顿

1. 项目是否设置 `Application.targetFrameRate = 60`？→ 在 Safari WebGL 上这与浏览器节奏冲突；设为 `-1`。
2. 是否有着色器在 Safari 的 WebGL 实现上表现不同？→ 在设备上测试；Safari 的 WebGL/Wasm 运行时与 Chromium 不同——某些 GLSL 构造处理方式不同。

### 内存增长慢路径被触发

1. 对于项目的峰值，**Initial Memory Size** 是否太小？→ Wasm 内存增长需要完整的缓冲区复制；将 Initial Memory Size 设为现实的峰值估计。
2. **Memory Growth Mode** 是否设置为 Linear？→ 切换到 **Geometric** 以获得更合理的增长曲线。

### 帧率设为 60 但浏览器运行不稳定

1. 代码中是否设置 `Application.targetFrameRate = 60`？→ 在 Web 上这与 `requestAnimationFrame` 浏览器节奏冲突。设为 `-1`。
2. `vSyncCount` 是否非零？→ 设为 0；浏览器处理节奏。

### Firefox 缓存拒绝大文件

Firefox 通过 `browser.cache.disk.max_entry_size` 限制单个缓存条目。如果构建超出此值（默认约 50 MB），资产将不会缓存。解决方案：使用 Addressables 拆分为 < 51 MB 的包，或指导用户在 `about:config` 中增加设置。

### 本地开发服务器设置

为使用正确 MIME 类型本地测试构建：

```bash
# Python (HTTP)
python -m http.server 55553 -d path/to/build

# Node.js (install serve-handler)
npx serve path/to/build -l 3001
```

对于 Brotli 测试，使用 HTTPS——Brotli 需要安全上下文。为本地测试用 OpenSSL 生成自签名证书。

## 最后一步

Web 设置仅在浏览器构建中生效，因此编辑器中的干净编译和 Play 模式还不够。按顺序运行这些检查。如果任何检查失败，请重新阅读[文档页面](#full-topic-map)以找出你遗漏的内容，修复它，然后再次运行检查。

1. 检查项目控制台错误为零。
2. 检查你更改的每个设置都已保存，如[从磁盘验证](#verify-from-disk-not-from-the-objects-you-just-wrote)所述：`ProjectSettings/ProjectSettings.asset` 持有新值，且 `codeOptimization` 通过 API 回读。
3. 如果你重新构建了播放器，按[本地开发服务器设置](#local-dev-server-setup)所述提供构建并在浏览器中打开。然后检查以下内容：
   - 浏览器控制台不显示错误，例如解压失败或内存不足错误。
   - 在 Network 选项卡中，`.wasm`、`.data` 和 `.framework.js` 文件返回与压缩格式匹配的 `Content-Encoding` 头（Brotli 为 `br`，Gzip 为 `gzip`），且其大小与 Build Report 匹配。
4. 如果更改影响运行时行为，例如帧率或质量层级，请在浏览器控制台检查 `Debug.Log` 行，然后移除它们。尽量避免截屏和检查截图，除非绝对必要，因为它们更耗时。

## 最终报告

给用户一个简洁但不过于密集的清单，说明你做了什么以及为什么。包含以下内容：

- 之前和之后的下载大小，以及你更改的每个设置（压缩、剥离、异常、`targetFrameRate`）及其旧值和新值。
- 任何副作用，例如你添加到项目中的脚本（例如 `Assets/Editor/WebOptimizer.cs`）、你更改的质量层级，或存储在每台机器上且不会传递给队友或 CI 的设置（`codeOptimization`）。
- 你没有运行的任何检查，例如未重新构建的浏览器测试，或没有可用编辑器时的所有检查，以及你所做的假设。

如果用户需要跟进更多步骤或决策，请列出它们，例如为 Addressables 远程组设置 CDN、Safari 测试，或在浏览器基线允许时迁移到 Wasm 2023 功能集。例如：

```
I made the following changes:

[✓] Set Compression Format to Brotli and Strip Engine Code to on, because the server sends `Content-Encoding: br` over HTTPS.
[✓] Added `Assets/Editor/WebOptimizer.cs`, which applies the release settings from Tools > Apply Web Release Settings.

Follow these steps to finish:

1. Apply `codeOptimization` in your CI build step, because it's stored in `Library/` and doesn't travel with the project.
2. Test the build in Safari, because its garbage collection and JIT behaviour differ from Chrome.
```

## 另请参阅

当任务超出本技能范围时，将用户指向此 Unity 工具：

- **Addressables 包** —— 通过 CDN 提供的远程组，当下载预算需要将内容
  移出初始负载时。
- **Unity Profiler，连接到浏览器** —— 跨平台分析方法论。第 3 节
  涵盖附加它的 Web 特定部分。
- **着色器变体剥离**（Graphics 设置 → Shader Stripping 和 `ShaderVariantCollection`）
  —— 变体数量直接影响 Wasm 大小，因此当仅剥离未改变
  数量时值得检查。
- **Project Settings → Player** —— 本技能读取的相同标志，如果用户更愿意在检视面板中
  查看它们而不是让它们被报告。
- 移动浏览器电池行为遵循第 3 和第 4 节中相同的帧率和质量层级指导；
  这里没有单独的移动路径。
