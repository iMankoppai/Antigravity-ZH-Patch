---
name: new-unity-project
description: 指导创建新的 Unity 项目，在设置项目、源代码管理和包之前收集概念、平台和变现方式。用于用户要求开始新游戏或原型时。
allowed-tools:
  - Bash
  - Write
  - Edit
---

# 新建 Unity 项目

从想法到可运行、受版本控制的 Unity 项目的引导流程。本技能拥有**流程**——问题、其顺序、在你提问时于后台运行缓慢的安装，以及交接。它刻意**不**重新记录命令；它将机制委托给其他技能。

**委托给（阅读这些以获取实际命令——不要重新发明它们）：**
- **`unity-cli`** —— CLI 安装、认证/许可证、编辑器安装、项目创建、源代码控制、
  打开项目。其 "Bootstrap a new project from scratch" 工作流是这里的骨干。
- **`unity-package-management`** —— 使用 Pipeline `package` 命令安装包（C# 脚本作为回退），以及
  按类型 / 平台 / 变现方式选择包。
- **`urp-postprocessing`**、**`ui`**、**`2d-pixel-perfect`** —— 视觉基线（第 6 步）：
  后处理体积设置、HUD 框架选择、像素完美 2D。
- **`implement-in-app-purchases`**、**`levelplay-unity-integration`**、**`build-live-game`** ——
  变现 / 后端*集成*（在最后调用）。

**一次只做一步。** 只询问当前步骤的问题并等待用户后再继续——平台和变现答案会改变你安装的内容，因此不要提前收集所有内容或在它们确定之前搭建脚手架。

## 第 1 步之前：检查委托技能是否已加载

在你客户端列出的技能中查找 `unity-cli`、`unity-package-management`、`urp-postprocessing` 和 `ui`。前两个携带此流程委托的命令。第 6 步将后两个标记为必需。只获得本技能的客户端将没有其他技能。

如果缺少任何一个，请告诉用户是哪一个以及它为他们做什么。主动提出在开始前安装 Unity 技能，但未经同意不要安装，因为这会改变他们的智能体设置：

- **Claude Code，四个都未安装：** `unity setup claude --format json` 安装 Unity 插件，它携带所有技能。它会重复你已有的任何技能。较旧的 CLI 不认识 `unity setup`，因此那时使用下一条路线。全新安装在下一个会话或 `/reload-plugins` 后加载。在此之前，从其报告的 `skillsPath` 读取技能。
- **任何其他情况，包括部分安装：** 请用户在他们自己的终端中运行 `npx skills add Unity-Technologies/skills -g`，这需要 Node.js。他们在提示中只选择缺失的技能及其客户端。不要自己运行它，因为它的提示会选择技能落地的位置。如果客户端读取的是该命令不写入的技能文件夹，请告诉用户将每个缺失技能的文件夹从 github.com/Unity-Technologies/skills（`skills` 下）复制到该文件夹。

新安装的技能可能在客户端重启前不会加载。如果仍未列出，请询问安装程序将其放在哪里并从那里读取其 `SKILL.md`。

不要因两个必需技能而停滞。如果用户宁愿没有它们也继续，请使用第 6 步自身关于该项目的指导继续。在最终报告中指明缺失的技能，以便他们知道跳过了更深入的指导。另外两个携带你不应即兴发挥的命令。`unity skill show` 打印 `unity-cli` 而无需安装它。没有 `unity-package-management`，第 5 步无法运行，所以现在就说明，在第 2 步开始编辑器安装之前，让用户决定。

## 流程——以及并行性在哪里

1. **概念** —— 他们在构建什么。
2. **平台与变现** —— 然后，一旦知道平台，**在后台启动编辑器
   安装**（需要几分钟）并继续对话。
3. **（汇合）** 编辑器 + 平台模块完成安装。
4. **项目 + 源代码控制** —— 从匹配 2D/3D 的 **URP** 模板创建；初始化 git。
5. **包** —— 编辑器打开后用 `package add` 命令安装，否则用 C# 脚本。
6. **视觉基线** —— 后处理、相机、质量层级、UI 栈、管线正确的
   着色器，使第一帧看起来不像未改动的模板。
7. **保存并首次提交。**
8. **交接**变现 / 后端。

引导流程胜过原始配方的全部意义：数分钟的编辑器安装与用户回答概念问题的几分钟重叠，因此设置感觉即时。

## 第 1 步 —— 概念

如果客户端有多选题问题工具（Claude Code 中的 `AskUserQuestion`，Copilot CLI 中的 `ask_user`，VS Code 中的 `askQuestions`），就使用它，以便用户快速选择，但也让他们自由回答。没有的话，用纯文本提问。涵盖：

- **类型 / 核心循环** —— 平台跳跃、俯视角射击、解谜、放置、RPG、竞速、卡牌、塔防、
  模拟、超休闲、第一人称等。
- **维度与外观** —— 2D 或 3D；美术风格（像素、低多边形、风格化、写实、仅 UI）。
- **玩法** —— 一句话的“玩家时刻在做什么”。
- **范围** —— 单屏原型 vs 多场景游戏；单人还是多人。

还要确定**项目名称**。编写 2–4 行的**项目简报**，回读以确认。简报驱动模板选择（第 4 步）、包（第 5 步）和视觉基线（第 6 步）：记录用户给出的调色板 / 情绪词，以及外观是否为像素艺术。

## 第 2 步 —— 平台与变现，然后开始安装

两个决策，因为两者都会改变你安装的内容：

- **目标平台**（多选）：桌面（Win/macOS/Linux）、移动（iOS/Android）、WebGL、
  主机。这些映射到编辑器**模块**（第 3 步），并主张在移动/WebGL 上使用更精简的包。
- **变现**：无 / 付费 / 应用内购买 / 广告 / 混合。这仅决定你在第 8 步调用哪个
  交接技能——现在不要集成它。

确认要使用的编辑器版本（**默认：最新 LTS**——参见 `unity-cli` 了解 LTS vs Tech
vs beta 的权衡）。*现在*就询问，在启动安装之前，以免安装错误的版本。

然后确认前提条件并**将编辑器安装作为后台任务启动**，使其在你继续时运行。有关确切语法、各平台模块名称以及认证 /
许可证设置，请参见 `unity-cli` 技能：

```bash
unity --version
unity auth status --format json      # if signed out:  unity auth login
unity license status --format json   # if none active: unity license activate

# Start in the BACKGROUND, then go straight back to the conversation. Module names per platform
# (android / ios / webgl / …) are in the unity-cli skill.
unity install lts --module <platform-modules> --yes --accept-eula
```

将该安装作为**后台任务**运行（不要阻塞等待它）。如果你没有其他要问的，
可以就等待——并行性只有在有对话可重叠时才有帮助。

## 第 3 步 —— 汇合：编辑器就绪

在创建项目之前，确认后台安装已完成：

```bash
unity editors --installed --format json
```

如果失败，请浮现错误（参见 `unity-cli` 故障排除）并停止——没有编辑器，下游什么都无法工作。

## 第 4 步 —— 创建项目 + 源代码控制

逐字遵循 **`unity-cli`** 的 "Bootstrap a new project from scratch" 工作流：

- 列出编辑器提供的**真实**模板 id（`unity templates list --type core`）并按
  **渲染管线**选择，而不仅仅是 2D/3D——不要猜测 id。**默认使用 URP：**
  3D 使用 `com.unity.template.urp-blank`（"Universal 3D"），2D 使用 `com.unity.template.universal-2d`
  （"Universal 2D"）。`com.unity.template.3d` / `com.unity.template.2d` 是 **Built-in
  Render Pipeline** 模板——从 Unity 6.5 起弃用，6.7 中移除——因此仅在用户明确
  要求 Built-in 时才选择它们。对照 JSON 的 `renderPipeline`
  字段确认选择（当前发布版中 universal-2d 为空白，因此按 id 匹配那个）。
- 使用 `unity projects create "<Name>" --path <dir> --editor-version <v> --template <id>` 创建。
- 设置源代码控制——**询问用户想要哪种**，不要假设：Git（GitHub / GitLab；
  对资产密集的游戏添加 `--git-lfs`）或 **Unity Version Control**（`--vcs uvcs`，原生处理
  大型二进制资产——无 LFS），或纯本地 `git init` + Unity `.gitignore`。
  使用 `unity projects create --vcs … --git-token-from-stdin --no-initial-commit`
  一步发布（令牌在 stdin 上）。传递 **`--no-initial-commit`** 以便 CLI 不会在包和
  `.meta` 文件存在之前提交裸项目——你在第 7 步进行真正的首次提交/检入。
  确切标志参见 `unity-cli` 工作流。

## 第 5 步 —— 包

将简报映射到具体的包列表，并通过 **`unity-package-management`**
技能安装（**绝不**手动编辑 `manifest.json`）。一旦编辑器打开并准备好带有 `com.unity.pipeline`
（第 6 步安装它），使用该技能的 `package add` 命令。第 6 步打开编辑器，因此当
包必须在首次打开之前落地时，改用该技能的 C# 安装脚本（其
`-quit` 陷阱适用）。阅读该技能了解类型/平台/变现 → 包的映射。
模板已提供渲染管线——绝不要向 Built-in 模板项目添加 `com.unity.render-pipelines.universal`
（没有东西分配 URP 资产；材质变粉）或反之。
在安装前向用户回读最终列表；之后验证 `manifest.json`。

## 第 6 步 —— 视觉基线

全新模板渲染正确但看起来像默认值：无色调映射、未改动的质量
层级、平淡的颜色。留在那里，智能体会动用 `OnGUI` 并猜测着色器名称，这就是
褪色或洋红材质的来源。在任何玩法工作**之前**应用这个最低限度。

**首先，`unity pipeline install --project-path "<project-path>"`，在打开
编辑器之前。** 在编辑器中运行 C#，以及下面的 `unity command capture screenshot`，都需要
项目的 `com.unity.pipeline` 包。早于默认添加它的创建功能的 CLI 会让项目没有它（较新的已经添加了，此安装则什么都不改），且第 5 步
不添加它：该步骤通过以 `-batchmode -executeMethod` 启动编辑器二进制来安装包，这从不触及该包。在打开之前安装是
受支持的顺序——安装会更新 `Packages/manifest.json`，Unity 在项目
加载时读取它。对已打开的项目运行它，要么写入失败并显示
`PIPELINE_MANIFEST_WRITE_FAILED`（请用户关闭编辑器并重新运行），要么成功
但已打开的编辑器直到其窗口重新获得焦点才加载该包。在第二种
情况下 `unity status` 报告 `STATUS_PIPELINE_LOAD_PENDING`；请用户切换到
编辑器窗口。没有该
包，下面的一切都无法连接，这看起来像 `unity-cli`
描述的安全模式失败，但原因不同。

**然后** `unity open "<project-path>"`（也是第 7 步需要的），等待直到 `unity status`
报告编辑器就绪，并通过在其中运行 C# 应用下面每一项。**`unity-cli` 拥有
那些命令及其语法**——不要在这里重新推导它们。

一旦编辑器就绪，在你的技能中查找 `unity-pipeline`。它是 Pipeline 包自己的指南，没有客户端
从包文件夹加载它。如果缺失，现在就阅读其 `SKILL.md`。它位于包中的
`.claude/skills/unity-pipeline/`：如果项目嵌入了该包，则为 `Packages/com.unity.pipeline/`，否则为
`Library/PackageCache/com.unity.pipeline@*` 文件夹。列出 `Library/PackageCache` 以获取确切名称，因为后缀通常是哈希，而不是版本。

要让你的客户端在后续会话中加载它，`unity skill install <client> --local` 可以镜像它，但仅适用于
具有项目范围的客户端（`unity skill install --list` 显示哪些，Claude Desktop 没有）。它还会在
旁边写入 `unity-cli` 的项目副本。`unity-cli` 技能建议运行一次，但在这里，请等到用户
要求，并在打开后从项目文件夹运行它。在安装了 Unity 插件的 Claude Code 中它会提前停止，因为插件已经
携带 `unity-cli`。在那里，经用户同意，将 `unity-pipeline` 文件夹复制到项目的 `.claude/skills/` 中。
在无法镜像的情况下，请在每次会话中重新阅读包副本。

**第 1、2、5 和 6 项假定使用 URP 模板**，这是第 4 步的默认值。如果用户
明确选择 Built-in，不要按所述运行它们：`UniversalAdditionalCameraData`、`Light2D`、
`urp-postprocessing` 体积框架以及每个 `Universal Render Pipeline/*` 着色器都是 URP
类型，在那里不存在，因此生成的 C# 无法编译。在 Built-in 上，第 3 和 4 项
仍按所述适用，后处理意味着旧版 Post Processing Stack，着色器
名称是 `Standard` / `Unlit/Color`。不要动用 `migrate-birp-to-urp`——用户要求的是
Built-in。

1. **后处理。** 全局 Volume 使用 Tonemapping（ACES）、低 Bloom（强度 0.5–1，
   阈值 0.9）和微妙的 Vignette（≈ 0.25）；在主
   相机的 `UniversalAdditionalCameraData` 上设置 `renderPostProcessing = true`。**必需的子技能：** `urp-postprocessing` —— 其
   代码模板创建体积并检查 HDR 和 Volume 层掩码。如果它未加载，
   请根据这些值构建体积并自行检查 HDR 和层掩码。
2. **相机和光照。** 2D → 正交，来自简报调色板的纯色背景，以及
   如果模板场景没有 `Light2D`，则在场景中添加一个 Global 类型的 `Light2D`（Sprite-Lit 着色器
   没有它会渲染为黑色）。3D → 透视；保留模板的方向光和天空盒，
   主光阴影开启。
3. **质量层级。** 先读取 `QualitySettings.names`——层级名称因模板而异——然后
   用 `QualitySettings.SetQualityLevel` 设置到与主要目标匹配的那个：桌面为最高层级，
   移动/WebGL 为最低层级。将色彩空间保持 Linear，Input System 保持模板
   设置的方式。
4. **UI 栈。** HUD 和菜单使用 uGUI Canvas + TextMeshPro 或 UI Toolkit——**绝不 `OnGUI`**。
   **必需的子技能：** `ui` 为项目在它们之间选择。如果它未加载，请
   根据简报在它们之间选择，并在最终报告中说明你选择了哪个以及原因。
5. **材质和着色器。** 在 URP 下使用 `Universal Render Pipeline/Lit`、`…/Unlit`、
   `…/2D/Sprite-Lit-Default` 或 `…/2D/Sprite-Unlit-Default`。`Standard` 和 `Unlit/Color` 在 URP 下渲染为
   粉色或褪色。优先使用 `GraphicsSettings.currentRenderPipeline.defaultMaterial`
   / `.default2DMaterial` 而非 `Shader.Find`，并将 `Shader.Find` 返回 `null` 视为错误。
   使用 `currentRenderPipeline`，而非 `defaultRenderPipeline`：质量层级可以携带自己的管线
   资产，而上面的第 3 项刚刚设置了层级。
6. **仅像素艺术。** 精灵上的点过滤模式和 Pixel Perfect Camera——参见
   `2d-pixel-perfect`。如果它未加载，请自行完成这两项，并将
   "第 1 步之前"中的安装路线放入最终报告。

保存场景，然后确认以下两项。**不要用 `unity logs`**——那读取的是 CLI 自己的
日志，从不是编辑器的，因此无论场景看起来如何它都报告干净：

- 编辑器端没有渲染管线或着色器错误。通过 `unity-cli` 读取编辑器控制台，
  或直接读取 `Editor.log`——该技能的 "Recovering from Safe Mode" 部分有
  各平台的路径。
- `unity command capture screenshot --output baseline.png` 看起来有光照和色调映射，而不是平淡
  灰色。

## 第 7 步 —— 保存并首次提交

项目已在第 6 步打开，因此 `.meta` 文件存在。**使用你在第 4 步设置的任何 VCS** 进行首次提交：

```bash
unity open "<project-path>"     # only if not already open; for headless/CI use the
                                # "Import & save headlessly" method in unity-package-management
```

- **Git（GitHub / GitLab / 本地）：**
  ```bash
  cd "<project-path>"
  git add -A
  git status                    # Library/ Temp/ obj/ Build/ must NOT be staged
  git commit -m "Initial Unity project: <Name>"
  ```
  每个 `.cs`/资产必须与其 `.meta` 一起提交。
- **Unity Version Control（UVCS）：** 通过你的 UVCS 客户端/工作区（在第
  4 步期间创建）检入——没有 `git` 步骤。生成的文件夹仍被忽略规则排除。

在任一提交之前，如果第 6 步将技能镜像到了项目中（Claude
Code 的 `.claude/skills/`），请询问用户是否包含它们或排除它们。

如果你在第 4 步通过 `--vcs` 发布且**没有** `--no-initial-commit`，CLI 已经对
裸项目进行了初始提交——在此处添加后续提交，而不是重复提交。

## 第 8 步 —— 交接

基于第 2 步的变现，调用匹配的技能进行实际集成：
- IAP → **implement-in-app-purchases**
- 广告 → **levelplay-unity-integration**
- 账户 / 云存档 / 经济 / 远程配置 / 排行榜 → **build-live-game**

如果匹配的技能未加载，请将 "第 1 步之前"中的安装路线放入后续
步骤，而不是凭记忆集成。

报告项目路径、编辑器版本、渲染管线和模板、已安装的包、
应用的视觉基线、任何缺失的技能以及后续步骤。

## 范围——本技能不做的事

- **不做玩法脚手架。** 它让你到达一个具有视觉底线的可运行、已接线的项目；
  构建实际游戏（场景、控制器、美术）是下一次对话——在那里通过
  `unity-cli` MCP 服务器和 Package Manager 与编辑器迭代。通用类型骨架
  往往产生一次性的模拟基元，因此本技能刻意停在干净的
  起点。视觉基线（第 6 步）是设置，不是内容。
- **不提供命令参考。** 语法位于 `unity-cli` / `unity-package-management`。

## 清单

- [ ] 在第 1 步之前检查了委托技能（`unity-cli`、`unity-package-management`、
      `urp-postprocessing`、`ui`）：缺失的已提供安装，或在最终报告中指明
- [ ] 已捕获并确认概念简报（类型、外观、玩法、范围、名称）
- [ ] 记录了平台 + 变现；选择了编辑器版本
- [ ] 已安装编辑器 + 平台模块（在第 2 步期间后台启动）
- [ ] 从 **URP** 模板（`urp-blank` / `universal-2d`）创建项目，除非明确要求
      Built-in；已用 Unity `.gitignore` 初始化 git
- [ ] 使用 `package add` 安装包（或在首次打开前使用该技能的 C# 脚本）；已验证 `manifest.json`；未在模板之上添加渲染管线包
- [ ] 编辑器就绪后从包文件夹读取了 `unity-pipeline`，或在征得
      用户同意后镜像到项目中
- [ ] 应用了视觉基线：全局 Volume（色调映射、泛光、暗角）+ 相机后处理开启，
      为目标设置了质量层级，选择了 UI 栈（无 `OnGUI`），URP 着色器名称，已检查截图
- [ ] 项目已打开/保存以便 `.meta` 文件存在；已进行首次提交；已排除 `Library/`
- [ ] 如适用，已交接给变现/后端技能

## 常见错误

- **阻塞在编辑器安装上**，而不是在你提问时将其后台化。
- **安装了错误的编辑器**，因为在后台安装之前未确认版本。
- **提前收集所有问题**——平台/变现答案会改变模块和包。
- **手动编辑 `manifest.json`**，而不是使用 package 命令或该技能的脚本（参见 `unity-package-management`）。
- **凭记忆执行必需子技能的工作**当它未加载时，而不告诉用户
  或提供安装。
- **提交 `Library/`/`Temp/`/`obj/`/`Build/`**，或提交没有 `.meta` 文件的脚本。
- **缺少编辑器模块**——移动目标需要 `android`/`ios`；WebGL 需要 `webgl`。
- **因为名称匹配而选择 `com.unity.template.2d` / `.3d`**——那些是 Built-in
  管线模板。请使用 `universal-2d` / `urp-blank`。
- **跳过视觉基线**并发布模板的平淡默认值，然后在 URP 下用 `OnGUI` 构建
  HUD 并用 `Shader.Find("Standard")` 构建材质。
