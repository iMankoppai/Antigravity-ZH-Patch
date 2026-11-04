---
name: migrate-birp-to-urp
description: 计划、执行并排查从 Built-in Render Pipeline 到 URP 的迁移。用于被要求将项目、场景、材质或着色器转换为 URP，或修复由此导致的视觉损坏时。
---
分类请求、检查当前项目状态、选择正确的迁移路径，并仔细验证 Built-in 到 URP 的迁移结果。

## 强制执行的执行参考

对于任何实际的迁移或修复过程，在第一次编辑项目设置、材质、后处理、光照、探针或场景的 `script eval` 调用之前，阅读 [references/implementation-patterns.md](references/implementation-patterns.md)。即使对于诸如 "migrate this project to URP" 这样的简短提示（当回滚安全性已确认时），这也是强制性的。

如果该资源无法加载，请使用本 SKILL.md 中的内嵌规则并降低你的信心：不要仅凭意图或工具日志声称 PPv2 转换、光照/探针刷新或迁移完成。

## 关键默认值

对于诸如 "migrate this Built-in project to URP" 或 "move this project to URP" 的简单请求，启动或恢复安全迁移工作流，而不是直接跳到转换。

通用升级提示不得要求用户提及每一个迁移风险。检查并处理常见的 Built-in 依赖，例如 PPv2、烘焙光照/光照贴图、反射探针、粒子/雾/烟材质、Quality 层级、相机后处理和代表性场景验证。

默认结果是基于阶段的：

1. 检测项目是 Built-in、部分迁移、已是 URP 还是 HDRP。
2. 将请求分类为标准 3D URP、URP 2D、选定材质转换、仅规划或故障排除。
3. 在推荐更改之前检查迁移风险：不透明材质、粒子/VFX 材质、自定义着色器、后处理、相机效果、烘焙光照/光照贴图/反射探针、Quality 层级和代表性场景。
4. 在任何会变更管线的操作之前停止，直到用户确认回滚点（如分支、备份、归档或一次性副本）。会变更管线的操作包括安装 URP、在 Graphics/Quality 设置中分配 URP 资产、运行转换器以及编辑材质或场景。
5. 选择下一个迁移阶段，执行该阶段，保存/重新查询其输出，并报告其阶段状态。
6. 将自定义着色器、`GrabPass`、Surface Shader、`OnRenderImage`、替换着色器和包拥有的着色器视为有范围的后续工作，而不是自动转换器的工作。
7. 在宣布完全迁移成功之前，验证代表性场景、Console 输出、相机渲染、光照/烘焙 GI 状态、材质、后处理持久性和质量层级分配。

默认阶段：

- 阶段 0：检查和规划。检测管线状态、代表性场景、回滚安全性、PPv2、材质/着色器风险、Quality 层级、光照/光照贴图/探针状态以及自定义渲染代码。
- 阶段 1：URP 设置和支持的材质转换。安装/复用 URP，在 Graphics/Quality 中创建/分配 URP 资产，转换支持的不透明和粒子/效果材质，并验证没有支持的材质仍停留在 Built-in 着色器上。
- 阶段 2：后处理和相机迁移。创建持久的 URP Volume 配置文件，接好场景 Volume/相机后处理，为 URP 验证禁用旧版 PPv2，并分类不支持的 PPv2 效果（如 SSR）。
- 阶段 3：光照、光照贴图和反射探针。解决陈旧的 Built-in 光照状态，配置 URP 光照/探针设置，在可行时重新烘焙/刷新，或明确标记光照/探针为部分完成。
- 阶段 4：最终验证和报告。保存/重新加载/重新查询项目状态，捕获代表性场景，检查 Console，并报告完成/未完成/手动项。

如果项目很小且 Unity 保持稳定，一个回合可以完成多个阶段，但不要将全部阶段强行塞入一个响应。与其过度声称 "complete" 的结果，不如诚实地划定阶段边界。

仅在项目状态或用户意图留下真正未解决的决策时才询问配置问题。如果用户说 "do not modify files"，请保持在审计/规划模式，不要执行转换或资产编辑。

### 通用升级契约

当用户给出通用迁移请求并允许更改时，从项目状态驱动下一阶段：

1. 不要要求用户在检查之前枚举已知 Built-in 特性。去发现它们。
2. 如果存在 PPv2、烘焙光照、反射探针、粒子/雾/烟材质或多个 Quality 层级，自动将它们纳入迁移。
3. 优先阶段完成而非一体化完成。每个阶段应保存/重新查询其自身输出，并以 `Phase complete`、`Phase partial` 或 `Blocked` 结束。
4. 如果 Unity 编译、包安装、域重载或长时间光照烘焙中断了处理，将中断报告为阶段边界，并在下一回合从已保存的部分状态恢复，而不是从头开始。
5. 不要依赖用户编写详细的清单提示来获得正确行为。详细清单用于基准测试或压力测试；普通用户提示仍应触发此分阶段契约。
6. 通用迁移请求授予检查和规划许可，但不能证明回滚安全性。如果没有确认回滚点，请在包安装或 URP 分配之前停止并请求确认。不要仅为到达备份问题而将项目留在洋红色的部分状态。
7. 如果回滚安全性已确认或用户说项目是一次性副本，则在当前阶段内继续，无需为常规工作再次询问。
8. 在阶段结束时，给出简洁的下一阶段提示或说明应运行哪个阶段。仅当下一阶段引入新的昂贵或风险操作时（例如长时间光照烘焙、删除/清理遗留资产或自定义着色器重写），才在该阶段之前请求确认。
9. 如果回滚安全性已确认且活动阶段内的普通工作仍未完成，不要问 "would you like me to continue?"。继续修复该阶段直到其门通过、工具/域重载边界中断执行，或出现真正的新风险决策。

### 通用迁移成功门

在说通用迁移 "successful"、"complete" 或 "fully migrated" 之前，验证已保存的项目状态，而不仅仅是工具日志：

1. Graphics 设置和每个相关 Quality 层级都指向预期的 URP 资产。
2. URP 资产在保存状态下具有有效的默认渲染器，且当前 Console 输出不包含未解决的渲染管线错误（例如 "Default Renderer is missing"）。如果分配后出现渲染器错误，请重新查询保存的渲染器列表/默认索引，尽可能清除陈旧 Console 输出，触发新的场景/相机验证，并继续修复而不是停在 "URP setup complete"。
3. 支持的 Built-in 材质（包括粒子/雾/烟材质）具有 URP 兼容的着色器，或被明确列为未解决的自定义/包着色器情况。有纹理/着色的源材质必须保留其源贴图/颜色；如果源 `_MainTex` 或 `_Color` 有内容，则缺少 `_BaseMap` 或全白 `_BaseColor` 的 URP 着色器分配是不完整的。粒子、雾、烟、蒸汽、贴花、VFX、加法和透明效果材质不应盲目强制为 `Universal Render Pipeline/Lit`；在适当时优先使用 URP 粒子/效果着色器，如 `Universal Render Pipeline/Particles/Unlit`。
4. 如果源场景使用了 PPv2，则存在已保存的 URP `VolumeProfile`，具有持久的非 null 覆盖组件，代表性场景通过 URP `Volume` 引用它，且为 URP 视觉验证禁用了旧版 PPv2。已保存的配置文件带有 `components: []`、`{fileID: 0}` 组件引用，或仅仍引用旧 `PostProcessProfile` 的场景，都是不完整的。
5. 如果代表性场景使用烘焙/混合光照、Enlighten/实时 GI Lighting Settings 资产、Lighting Data 资产、光照贴图、光照探针或反射探针，在通用完整迁移中不要将常规光照/探针修复留作手动后续。尝试 URP 兼容的 Lighting Settings 分配，在需要时清除/重新烘焙或恢复烘焙，在可行时刷新反射探针，然后保存/重新加载并验证场景引用预期的光照状态。创建 `.lighting` 资产并调用 `Lightmapping.lightingSettings = target` 加 `AssetDatabase.SaveAssets()` 是不够的；标记/保存场景，重新加载/重新查询，并比较保存的场景 `m_LightingSettings` 引用或资产 GUID。如果长时间烘焙或工具中断阻止了这一点，请称迁移为部分完成并从该阶段恢复。
6. 在迁移验证之前已刻意打开或选择代表性场景；不要从默认/测试场景推断烘焙光照或 PPv2 不存在。场景已在保存/重新加载后被捕获或检查，且 Console 输出已检查渲染管线、着色器或渲染器特性错误。
7. 最终措辞必须匹配门结果。仅当每个门都通过时才使用 "complete"。当 URP 已设置但 PPv2 Volume 持久性、旧版 PPv2 禁用、光照烘焙/探针刷新或保存状态验证仍待处理时，使用 "partial"。如果任何必需门是部分完成，不要以 "successfully migrated" 开始最终回答。

完整报告清单：

- 如果旧 PPv2 配置文件包含活动的 `DepthOfField`，新 URP 配置文件必须包含已保存的 `DepthOfField` 覆盖，或最终报告必须称其为省略/手动。
- 如果旧 PPv2 配置文件包含活动的 `AmbientOcclusion`，在可行时配置 URP SSAO 渲染器特性，或将 AO 标记为手动/部分。
- 如果旧 PPv2 配置文件包含活动的 `ScreenSpaceReflections`，列出 SSR 为不支持/手动，除非实际添加并验证了 URP 渲染器特性/自定义替换。
- 如果场景仍序列化旧 Lighting Settings GUID 或非零的旧 `m_LightingDataAsset`，则光照是部分完成。
- 如果场景有反射探针且 URP 资产仍序列化 `m_ReflectionProbeBlending: 0` 或 `m_ReflectionProbeBoxProjection: 0`，则反射是部分完成，除非有意禁用并报告。
- 如果任何清单项为 false，不要在最终答案中使用 "complete"、"fully migrated" 或 "fully functional on URP"。

不支持的特性可以保持手动，但要准确命名它们。示例包括需要 URP 渲染器特性/自定义/第三方替换的 PPv2 Screen Space Reflections、复杂的自定义着色器移植、`GrabPass`、替换着色器或包拥有的渲染代码。如果任何成功门项失败，在允许时继续修复或报告带有未完成项的部分迁移；不要将项目呈现为完全迁移。

回归防护摘要：

- 对实际迁移或修复工作使用详细的[执行回归清单](references/implementation-patterns.md#execution-regression-checklist)。
- 在状态声明之前验证保存的场景引用：URP Volume/配置文件、Quality 分配、Lighting Settings/Data、URP 资产/渲染器以及反射探针设置。
- 从转换前的快照保留材质源数据，然后在着色器更改后恢复 `_BaseMap`、`_BaseColor`、纹理缩放/偏移和相关贴图。
- 在最终措辞之前验证 PPv2、植被、粒子/效果、烘焙光照、探针和曝光的代表性视觉效果。
- 报告确切的阶段状态。通过阶段允许 `Phase complete`；仅当每个成功门都通过时才允许项目级 `complete`。

## 执行路径：在编辑器中运行 C#

本技能中的每个 C# 步骤都通过 Unity CLI 在实时编辑器中运行。**`unity-cli`
技能负责带你到达那里**——安装 CLI、确认已连接的编辑器、添加
项目的 `com.unity.pipeline` 包、区分真正缺失的编辑器与卡在
安全模式中的编辑器，以及发现编辑器的命令目录。先遵循它；不要在这里重新推导
任何内容。

有两件事它无法替你了解：

- **你特别需要 `script eval`**，而不仅仅是一个可访问的编辑器。确认它出现在
  目录中。它的存在取决于 Pipeline 包版本，而不是 CLI，因此健康的
  安装仍可能缺少它——如果缺失，请说明并停止。
- **在早于 6000.3 的编辑器上，预计 Pipeline 包完全无法工作**，并正确读取
  症状而不是重试。`com.unity.pipeline` 使用 `IPreprocessBuildWithContext`
  和 `BuildCallbackContext`，这些是 Unity 在 **6000.3** 中引入的；该包自己的 manifest
  声明 `"unity": "6000.0"`，因此它能顺利安装然后无法编译。测量结果：
  存在于 6000.3 / 6000.4 / 6000.5，不存在于 6000.0 / 6000.1 / 6000.2 以及 2022 和 2023
  系列。症状具有误导性——服务器从不启动，`unity status` 不显示行也不显示
  错误，真正原因是编辑器日志中那两个类型的 `CS0246`。如果你看到那个，
  请告诉用户编辑器对 Pipeline 包来说太旧，而不是调试 CLI。

  **这在这里比在大多数技能中更重要：** 将项目从 Built-in
  管线迁移的人，按定义通常使用较旧的编辑器。
- **渲染管线迁移无法安全地盲目编写。** 分配 URP 资产、转换
  材质以及重新烘焙光照都需要实时编辑器。无法访问的编辑器是停止信号，而不是
  手动编辑 `ProjectSettings/GraphicsSettings.asset` 的提示。

使用 `unity command script eval --caller plugin --skill migrate-birp-to-urp --code '<snippet>'` 运行 C#。`unity command` 默认超时为 30 秒，
这在这里很重要：安装 URP 会触发包刷新和域重载，将
超过它。将其视为阶段边界，而不是提高超时。

### 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**。三个后果，都会导致编译
错误而非警告：

- **没有 `using` 指令。** 编译器会将 `using UnityEngine;` 读取为资源释放
  语句并拒绝它（`CS0210`）。
- **类型必须完全限定。** 裸的 `GraphicsSettings` 或 `Volume` 无法解析
  （`CS0246` / `CS0103`），而裸的 `Object` 会与 `object` 产生歧义（`CS0104`）。
- **扩展方法不可用**，因为它们通过 `using` 解析。本技能否则会动用的两个：
  `camera.GetUniversalAdditionalCameraData()` 变为
  `camera.GetComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>()`，而 LINQ
  调用必须以静态方式编写——`System.Linq.Enumerable.FirstOrDefault(sequence, predicate)`
  而非 `sequence.FirstOrDefault(predicate)`。

### 两种执行模式——按代码段的形状选择

参考中携带两种形状，它们不可互换：

- **语句形状**（裸语句序列，如上面的检测代码段）——直接传给
  `script eval`，完全限定，不带 `using` 行。
- **类或方法形状**（任何声明 `class`、`static` 方法或 `[MenuItem]` 的内容，
  如材质快照模式）——这些是**项目文件，不是 `script eval` 输入**。类
  声明无法展平为语句块。将代码段保存到
  `Assets/Editor/` 下，让 Unity 编译它，然后通过一行 `script eval`
  调用调用其入口点。在该文件中保留 `using` 指令；它们在那里是正确的。

对于多步迁移，脚本路线无论如何都更可靠：它能在 URP 安装和材质转换触发的
域重载中存活，而长 `script eval` 负载则不能。

### 检测活动的渲染管线

```csharp
var rp = UnityEngine.Rendering.GraphicsSettings.defaultRenderPipeline;
var qrp = UnityEngine.QualitySettings.renderPipeline;
return $"graphics={(rp == null ? "NULL (Built-in)" : rp.GetType().Name + ":" + rp.name)}, "
     + $"activeQualityLevel={(qrp == null ? "inherits Graphics" : qrp.GetType().Name + ":" + qrp.name)}";
```

`UniversalRenderPipelineAsset` 表示 URP；`HDRenderPipelineAsset` 表示 HDRP；两者都为 `NULL`
表示 Built-in。**也要检查每个质量层级的分配**——项目可以在
Graphics 设置中切换，而 Quality 层级仍指向不同的资产，或指向无：

```csharp
var names = UnityEngine.QualitySettings.names;
var rows = new System.Collections.Generic.List<string>();
for (int i = 0; i < names.Length; i++)
{
    var a = UnityEngine.QualitySettings.GetRenderPipelineAssetAt(i);
    rows.Add($"{i}:{names[i]}={(a == null ? "inherits Graphics" : a.name)}");
}
return string.Join(", ", rows);
```

如果项目 Unity 版本中 `GetRenderPipelineAssetAt` 不可用，请改为读取
`ProjectSettings/QualitySettings.asset`，而不是在运行时切换层级——
`SetQualityLevel` 会变更项目状态。

## 0. 预检：管线检测和参考加载

在做任何其他事情之前，你**必须确定活动的渲染管线和迁移模式**：

1. **检测管线：** 运行上面执行路径部分中的渲染管线检测代码段。
   - 如果 `currentRenderPipeline` 或 `defaultRenderPipelineAsset` 引用 `UniversalRenderPipelineAsset` -> **URP**。
   - 如果未分配渲染管线资产 -> **Built-in**。
   - 如果引用 `HDRenderPipelineAsset` -> **HDRP**。说明本技能仅涵盖 Built-in 到 URP 迁移。基本比较建议可以，但不要用本技能驱动 HDRP 迁移。
2. **加载基础参考：** 阅读 [references/migration-workflow.md](references/migration-workflow.md)。
3. **在相关时加载着色器参考：** 如果请求提及材质、着色器、洋红材质、渲染错误、图像效果或自定义渲染，也阅读：
   - [references/custom-shader-triage.md](references/custom-shader-triage.md)
   - 当检查或项目文件搜索发现高级着色器/效果模式时，阅读 [references/complex-shader-situations.md](references/complex-shader-situations.md)
4. **在相关时加载质量参考：** 如果请求提及阴影、光照、烘焙光照、光照贴图、反射探针、质量设置、视觉不匹配或迁移后的性能，也阅读 [references/quality-settings-map.md](references/quality-settings-map.md)。
5. **在执行时加载实现模式：** 如果请求允许实际迁移更改、后处理转换、烘焙光照/探针修复或从部分迁移恢复，也阅读 [references/implementation-patterns.md](references/implementation-patterns.md)。
6. **将请求分类**为以下之一：
   - 全项目 Built-in 到 URP 迁移
   - Built-in 2D 到 URP 2D 迁移
   - 仅选定材质转换
   - 仅规划/解释
   - 之前迁移后的故障排除
7. **如果项目已在 URP 上，** 切换到故障排除模式，而不是盲目重新运行设置。
8. **仅在**管线和迁移路径明确后才继续。

## 1. 评估当前迁移状态

在做出任何更改之前，**检查已存在的内容**：

1. **检查管线状态和分配点：**
   - 运行上面执行路径部分中的两个渲染管线检测代码段——Graphics 设置的那个和每个质量层级的那个。
   - 如果项目有 Quality 层级，在假设项目已完全切换之前，检查每个层级使用哪个 Render Pipeline Asset。
2. **清点迁移面：** 使用 `script eval` 配合 `UnityEditor.AssetDatabase.FindAssets` 或等效资产查询来清点：
   - 材质，包括通常使用内置粒子着色器的粒子/VFX 材质
   - 植被材质，包括草、树、地形细节、SpeedTree、公告板、叶卡、镂空和风驱动植被材质
   - 着色器
   - 场景和重要预制体
   - URP 资产和渲染器资产（如有）
   - 后处理配置文件 / volume 配置文件
   - Lighting Settings 资产、Lighting Data 资产、光照贴图、光照探针、反射探针以及混合/烘焙光
3. **扫描渲染风险标记：** 使用可用的项目文件搜索、`AssetDatabase.FindAssets` 或简短的 `script eval` 文件扫描来搜索项目中特定的渲染模式，例如：
   - `PostProcessLayer`、`PostProcessVolume`、`UnityEngine.Rendering.PostProcessing`
   - `OnRenderImage(`、`RenderWithShader`、`SetReplacementShader`
   - `#pragma surface`、`GrabPass`、`CGPROGRAM`
   - `CommandBuffer`、自定义着色器 include 路径或包着色器命名空间
   - 植被标记，如 `Nature/`、`SpeedTree`、`TreeCreator`、`Grass`、`Foliage`、`_Cutoff`、`_AlphaClip`、`_Cull`、公告板或风关键字
4. **如果安装了 PPv2 但 grep 什么都没找到，** 通过 Unity API 按组件/类型检查打开的场景和配置文件资产。场景 YAML 和序列化包引用可能被文本搜索遗漏。
5. **确定项目形状：** 决定项目主要是 3D、主要是 2D 还是混合。
6. **报告发现：** 在提出转换之前总结当前状态。示例：
   - "The project is still on Built-in, has no URP asset assigned, contains PPv2 references, and includes several custom shaders using surface-shader syntax."

## 2. 收集需求

确定用户实际想要什么。如果请求有歧义，请询问。

对常见请求使用这些默认值：

| 用户说 | 默认解读 |
|-----------|------------------------|
| "Upgrade this project to URP" | 全项目迁移 |
| "Move this 2D project to URP" | Built-in 2D 到 URP 2D 迁移 |
| "Convert these materials" | 定向材质转换 |
| "My materials turned pink" | 迁移后着色器/材质故障排除 |
| "Lighting looks wrong after URP" | 质量和视觉一致性故障排除 |
| "Do not change anything yet" | 仅规划/审计 |

### 要收集的信息

- **范围：** 全项目、选定材质或仅故障排除
- **目标渲染器：** 标准 URP 或 URP 2D
- **验证目标：** 哪些场景、预制体或相机对用户最重要
- **风险承受能力：** 有限的手动后续是否可接受
- **渲染依赖：** 自定义着色器、Asset Store 着色器、PPv2、烘焙光照/光照贴图/探针、图像效果、命令缓冲区、替换着色器或多个 Quality 层级
- **执行许可：** 仅规划 vs 实际项目更改

## 3. 安全门

在任何变更管线的步骤之前：

1. **确认回滚安全性。**
   - 在用户确认备份、分支、归档、一次性副本或回滚点之前，绝不要安装 URP、分配 URP 资产、运行 Render Pipeline Converter、编辑材质或编辑迁移场景状态。
   - 如果缺少回滚安全性，不要将项目部分切换到 URP。在规划模式停止并先请求回滚确认。
2. **将引擎升级风险与管线升级风险分开。**
   - 如果项目也要迁到新的 Unity 版本，建议先做引擎升级，再做管线迁移。不要将两者视为单一盲目操作。
3. **如果回滚安全性已确认，** 将其视为覆盖整个迁移过程。不要在每个转换器之前再次询问；继续通过设置、材质转换、PPv2 迁移、光照/探针工作、保存/重新加载验证和最终报告，除非出现新的风险决策。
4. **如果用户已授权完整的一次性迁移，** 不要在常规设置或可恢复错误之后请求继续许可。继续下一个不完整的迁移阶段。仅在出现新的破坏性清理决策、包/域重载停止执行，或重复修复尝试达到验证迭代限制时才询问。
4. **如果项目已部分迁移，** 确定之前是否确认过回滚安全性。如果是，请从第一个未完成项恢复。如果否，请报告部分状态并在做额外更改之前询问。

## 4. 选择迁移路径

为项目使用正确的路径：

### 路径 A：标准 3D Built-in 到 URP
- 用于迁移到标准 URP 的普通 3D Built-in 项目。

### 路径 B：Built-in 2D 到 URP 2D
- 当项目主要是 2D 且用户期望 URP 2D 光照或渲染器行为时使用。
- 不要将其视为与标准 URP 相同的工作流。

### 路径 C：定向仅材质转换
- 仅当项目已在 URP 上且用户想要转换选定材质时使用。

### 路径 D：排查现有迁移
- 当项目已在 URP 上或迁移已尝试过时使用。
- 优先处理影响最大的破损，而不是盲目重新运行整个迁移。

## 5. URP 设置工作流

遵循这个确切的设置顺序：

1. **确保 URP 已安装。**
   - 安装 URP 可能触发包刷新、编译和域重载。将其视为阶段边界。
   - 不要在 `script eval` 调用中对 `UnityEditor.PackageManager.Client.Add` 无限自旋等待。请求安装，然后通过 `Packages/manifest.json`、包列表或 Unity 完成刷新后 URP 类型/资产的存在来验证。
   - 如果包安装导致 `script eval` 调用超时或返回空，请在 Unity 完成编译后的新回合中恢复。不要重启整个迁移或重新安装 URP；检查部分状态并从那里继续。
2. **如果尚不存在，创建所需的 URP 资产和渲染器资产。**
3. **在 Graphics 设置**以及所有相关 Quality 层级中**分配 URP 资产**。
4. **对于 2D 项目，** 在转换之前创建并分配正确的 2D Renderer 资产。
5. **如果 URP 资产已存在，** 在适当时检查并复用它，而不是自动创建重复项。
6. **在 URP 实际成为目标配置的活动渲染管线之前不要继续**。

## 6. 转换工作流

对于实际转换工作，遵循 [references/migration-workflow.md](references/migration-workflow.md)。

1. **选择正确的 Render Pipeline Converter 路径：**
   - `Built-in Render Pipeline to URP`
   - `Built-in Render Pipeline 2D to URP 2D`
2. **在转换之前初始化转换器并检查候选更改。**
3. **对于标准 Built-in 到 URP 迁移，** 优先使用参考中描述的可应用转换器：
   - `Rendering Settings`
   - `Material Upgrade`
   - `Animation Clip Converter`
   - `Read-only Material Converter`
   - `Post-processing Stack v2 Converter`
4. **对于选定材质转换，** 使用定向材质转换工作流，而不是转换整个项目。
5. **在转换之前审查警告和失败。**
6. **仅在用户确认项目可安全更改后才运行转换。**
7. **验证每个材质实际落在哪个着色器上**——不要假设转换器选择了 3D
   目标。`MaterialUpgrader.FetchAllUpgradersForPipeline` 连同 3D 提供程序
   一起返回 2D 提供程序集，两者以同等优先级声称 `Standard`，因此在 3D 项目上，普通的 `Standard` 材质可能
   静默转换为 `Universal Render Pipeline/2D/Mesh2D-Lit-Default` 而不是
   `Universal Render Pipeline/Lit`。没有错误且材质不会变洋红，因此除非你回读着色器名称，
   否则这是不可见的——在 6000.5.8f1 上测量。

   之后读取每个已转换材质的 `shader.name` 并确认它匹配映射表中的预期目标。
   如果任何材质在 3D 项目中落在 `2D/` 着色器上，请从回滚点恢复那些材质，
   并用 3D 过滤的升级器列表转换它们，或使用
   [references/implementation-patterns.md](references/implementation-patterns.md) 中的手动模式。
7. **转换后，验证保存的项目状态。**
   - 重新打开或重新查询代表性资产，而不是仅信任命令输出。
   - 在场景级编辑后同时保存资产和打开的场景。对场景组件、相机数据、活动光照设置、反射探针和 PPv2 启用状态的更改仅靠 `AssetDatabase.SaveAssets()` 不能证明。
   - 确认 URP 资产已在 Graphics 和预期 Quality 层级中分配。
   - 对于 Quality 层级，通过重新查询 `QualitySettings.GetRenderPipelineAssetAt(i)` 或读取 `ProjectSettings/QualitySettings.asset` 中保存的 `customRenderPipeline` 条目来验证。如果它们保持为 `{fileID: 0}`，则 Quality 层级未显式分配。
   - 不要调用猜测的质量 API，例如 `QualitySettings.SetRenderPipelineAssetAt`；在该 API 不可用的 Unity 版本中，使用 `QualitySettings.SetQualityLevel(index)` 切换到每个目标层级，设置 `QualitySettings.renderPipeline = urpAsset`，然后恢复原始层级并验证保存的 `customRenderPipeline` 值。
   - 确认已转换材质实际引用 URP 着色器。
   - 确认具有源反照率纹理的代表性材质现在具有非 null 的 `_BaseMap` 值。此检查必须与转换前的材质快照进行比较；不要使用转换后的 `_MainTex` 作为事实依据。
   - 确认粒子/VFX 材质不再引用 Built-in 粒子着色器 ID 或旧版着色器名称；在适当时使用 URP 粒子着色器，如 `Universal Render Pipeline/Particles/Unlit`。如果材质名称或路径包含 `Particle`、`Fog`、`Smoke`、`Steam`、`VFX`、`Additive` 或类似效果术语，请保留透明/加法行为，而不是默认将它们设为 URP Lit。
   - 确认植被材质保留镂空/Alpha 裁剪、渲染面意图、纹理、着色、法线和预期的风/公告板行为。如果草/树卡片因其专门着色器行为丢失而变得实心或静态，则材质转换是部分完成。
   - 如果尝试了 PPv2 转换，确认保存的 URP Volume 配置文件包含持久的非 null `components` 条目，且场景/相机接线使用 URP 兼容组件。
   - 如果存在烘焙光照，将旧 Lighting Data 和光照贴图保留为参考数据，然后验证它们是否仍产生可接受的 URP 视觉效果。如果创建了新的 Lighting Settings 资产，在保存/重新加载后验证保存的场景实际引用它；磁盘上存在该资产是不够的。在实际的通用迁移中，当陈旧烘焙数据或反射探针影响一致性时尝试重新烘焙/刷新；如果无法在当前回合完成，请报告迁移为部分完成并在稍后从光照/探针阶段恢复。
   - 不要凭意图声称 "refreshed reflection probes"。验证新的或更新的探针输出、更改的已保存反射探针资产或成功的探针渲染工具输出。如果现有的 EXR 文件保持不变，请说探针已作为参考保留或仍需刷新。
   - 如果任何验证失败，请将该项报告为未完成/手动后续，而不是已迁移。

## 7. 着色器和材质分诊

当材质变为洋红、着色器无法编译或视觉效果严重漂移时，先使用 [references/custom-shader-triage.md](references/custom-shader-triage.md)。

1. **识别受影响的材质和着色器。**
   - 检查确切的材质着色器分配，而不仅仅是场景症状。
2. **在编辑着色器代码之前阅读 Console 和 Inspector 错误。**
3. **对着色器情况分类：**
   - 转换器应处理的受支持 Built-in 着色器
   - 可能安全移植的简单自定义着色器
   - 需要范围化迁移计划的复杂自定义着色器
   - 需要镂空、双面叶片、公告板、地形细节渲染或风行为的植被着色器
   - 可能需要维护者文档、范围化自定义移植或手动后续的包拥有或 Asset Store 着色器
4. **对于复杂着色器情况，** 使用 [references/complex-shader-situations.md](references/complex-shader-situations.md)。
5. **优先最小安全修复。**
   - 首先恢复代表性材质的渲染。
   - 在将修复扩展到更多资产之前验证结果。
6. **绝不要在整个项目范围内批量搜索替换着色器代码**，除非映射是显式、经过测试且有范围的。

## 8. 后处理、相机和渲染效果分诊

Built-in 项目通常依赖的不仅仅是材质转换。

1. **如果存在 PPv2，** 检查转换器输出并验证生成的 URP volume、配置文件和相机行为。
   - 在转换之前清点现有 `PostProcessVolume`、`PostProcessLayer` 和 PPv2 `PostProcessProfile` 资产。
   - 在可用时优先使用 URP `Post-processing Stack v2 Converter`，而不是凭记忆手工构建等价配置文件。
   - 转换后，验证保存的 URP `VolumeProfile` 资产包含持久的覆盖组件，而不是空的 `components: []` 配置文件或悬空的 `{fileID: 0}` 组件引用。
   - 如果通过脚本创建配置文件，`VolumeProfile.Add<T>()` 仅创建组件对象；对于持久配置文件资产，还要调用 `AssetDatabase.AddObjectToAsset(component, profile)`，将配置文件和组件标记为脏，保存资产，重新加载资产，并在报告成功之前计数保存的非 null 组件。如果保存的配置文件有 `{fileID: 0}` 组件条目，请在声称迁移成功之前重新创建或修复配置文件。
   - 验证代表性场景包含预期的 `Volume` 对象，且目标相机在需要时具有启用了后处理的 `UniversalAdditionalCameraData`。
   - 如果源场景仍只序列化 PPv2 `sharedProfile` 引用而没有 URP `Volume` 引用新 `VolumeProfile`，即使磁盘上存在 URP 配置文件资产，PPv2 迁移也是不完整的。
   - 如果活动的 URP `Volume` 引用空配置文件，请将其视为不完整的场景接线，而不是活动的后处理。修复配置文件或将 PPv2 报告为部分。
   - 检查是否保留旧的 `PostProcessVolume` / `PostProcessLayer` 组件。如果保留，请说明它们是有意保留、无害的旧版遗留，还是未解决的迁移工作。
   - 如果旧 PPv2 组件仅作为参考保留而 URP Volume 活动，为 URP 视觉验证禁用旧 PPv2 组件/层以避免双重后处理。在一致性被接受或用户批准清理之前不要删除它。
   - 在有验证的 URP 替换存在之前，或用户接受那些效果将被丢弃/手动后续之前，不要移除 PPv2 包、组件或配置文件作为清理步骤。
   - 在实际迁移期间，如果源配置文件可用，不要将常见 PPv2 一致性留作模糊的手动任务。为常见可映射效果（如 Bloom、Color Adjustments/Tonemapping、Vignette 和 Depth of Field）创建持久的 URP 覆盖，然后验证保存的配置文件具有非 null 组件。
   - 可以将不支持或不等价的效果标记为手动后续，例如应变成渲染器特性/SSAO 设置而不是直接 Volume 覆盖的 PPv2 Screen Space Reflections 或 Ambient Occlusion。
   - 如果 URP Volume 覆盖无法可靠创建，请记录 PPv2 效果及其 URP 等价物，而不是声称它们已迁移。
2. **不要将瞬态工具成功当作后处理成功。**
   - 说 "Added Bloom" 的命令日志是不够的。在保存/重新加载后重新读取保存的 `VolumeProfile` 资产或检查场景。
   - 如果保存的配置文件为空，请说 PPv2 设置已记录或部分准备，而不是已迁移。
3. **如果 grep 找到 `OnRenderImage`，** 将其视为自定义全屏效果情况。
   - 在 URP 中，自定义全屏效果应转向 `ScriptableRenderPass`、Renderer Feature 或 URP 自定义后处理，而不是停留在 Built-in 图像效果路径。
4. **如果 grep 找到 `RenderWithShader` 或 `SetReplacementShader`，** 将其视为替换着色器情况。
   - 这些效果通常需要刻意的 URP 渲染器特性或自定义 pass 策略。
5. **如果效果依赖场景颜色、深度或法线，** 验证 URP 兼容路径，而不是假设 Built-in 方法仍然适用。
6. **如果自定义相机在 Built-in 中堆叠效果，** 在迁移后显式验证相机输出，而不是假设一致。
7. **对于高级着色器/效果故障排除问题，提供具体的替换模式。**
   - 对于 `GrabPass`，提及 `_CameraOpaqueTexture` / Scene Color、所需的 URP 资产设置，以及透明排序可能与 Built-in 不同的限制。
   - 对于 `OnRenderImage`，提及 `ScriptableRendererFeature` 加 `ScriptableRenderPass`。展示 Unity 6 风格模板时，使用带临时 `RTHandle` 和 `Blitter.BlitCameraTexture` 的参考模式。
   - 绝不要推荐 `Blitter.BlitCameraTexture(cmd, source, source, material, pass)` 或其他源到源 blit 作为主要 `OnRenderImage` 替换。如果你不打算展示更安全的临时目标模式，请省略代码示例并改为解释架构。
   - 对于 Surface Shader，说明 `#pragma surface` 没有直接的 URP 等价物，并根据效果复杂度选择 Shader Graph 或 URP HLSL 顶点/片段重写。
   - 不要停在 "rewrite it"；给用户一个实用的首次移植步骤和一个验证目标。

## 9. 质量、光照和视觉一致性审查

当用户提及视觉不匹配、阴影、性能或质量设置时，使用 [references/quality-settings-map.md](references/quality-settings-map.md)。

1. **审查 Graphics 设置和每个活动 Quality 层级。**
   - 如果某个 Quality 层级没有自定义 URP 资产，请说明该层级是有意回退到 Graphics 设置还是仍需要显式分配。
   - 除非检查了每个相关层级，否则不要声称所有质量层级都已迁移。
   - 如果使用序列化项目设置，保存的字段通常是 `customRenderPipeline`；写入一个猜测字段（如 `renderPipelineAsset`）是不够的，除非保存的资产证明该分配。
   - 如果通过脚本分配，使用与 URP Render Settings 转换器相同的模式：缓存 `QualitySettings.GetQualityLevel()`，为每个目标层级调用 `QualitySettings.SetQualityLevel(index)`，赋值 `QualitySettings.renderPipeline = urpAsset`，然后恢复原始质量层级并在磁盘上验证。
2. **检查通常影响一致性的 URP 资产设置：**
   - 阴影
   - 阴影距离和级联
   - MSAA
   - 渲染缩放
   - 当效果依赖 HDR、不透明纹理和深度纹理设置时
3. **不要自动承诺相同的光照。**
   - Built-in 和 URP 在光照衰减、烘焙 GI 外观、阴影调优、反射探针响应、色调映射、曝光和后处理行为上可能不同。
4. **对于烘焙光照场景，** 将现有光照贴图和 Lighting Data 视为参考材料，而非保证最终的 URP 输出。
   - 清点 `Lightmapping.lightingSettings`、场景 `LightmapSettings`、烘焙/混合光、光照探针、反射探针以及任何现有 `LightingDataAsset`。
   - 在用户具有视觉参考或回滚点之前保留烘焙数据，但如果它们使场景过曝或失真，不要将陈旧的 Built-in 光照贴图作为最终 URP 光照解决方案保持活动。
   - 如果场景看起来过曝、太暗或不匹配，首先通过在 URP 验证期间禁用旧版 PPv2 来隔离后处理/曝光，然后在更改光照之前审查 URP Volume 曝光/色调映射/泛光。
   - 如果清除烘焙数据使场景不再过曝，请将旧光照贴图/Lighting Data 识别为陈旧或不兼容的活动数据。然后在 URP 下使用最终 URP 资产、渲染器、Volume 和 Quality 设置重新烘焙，而不是针对陈旧烘焙调优光照。
   - 如果创建或分配 URP 兼容的 `LightingSettings`，将光照设置和活动场景标记为脏，保存场景，重新加载或重新查询，并验证保存的场景引用预期的 `.lighting` 资产。仅 `AssetDatabase.SaveAssets()` 不能保存场景的 `Lightmapping.lightingSettings` 引用。如果保存的场景仍指向 Enlighten/实时 GI 设置资产，不要报告 "Baked GI enabled"。
   - 当视觉一致性是请求的一部分且旧 `LightingData.asset` / 反射探针 EXR 仍来自 Built-in 烘焙时，将它们视为参考数据，直到在 URP 下重新烘焙/刷新。不要仅凭旧烘焙数据声称视觉一致性得以保留。
   - 当视觉一致性重要时，建议清除/重新烘焙光照并刷新反射探针。除非在 URP 设置后（最好在 URP 烘焙后）对代表性场景进行了视觉检查，否则不要声称烘焙光照已成功迁移。
5. **对于 2D 光照项目，** 确保精灵和瓦片地图在需要时使用 URP 兼容的受光材质。
6. **对于性能回归，** 检查问题是否来自：
   - 更重的 URP 资产设置
   - 后处理
   - 额外的阴影成本
   - 自定义着色器移植或非批处理着色器
7. **在更改 URP 资产设置时，** 在保存后重新读取保存的资产或查询属性，然后再报告 MSAA、附加光限制、HDR、深度纹理或不透明纹理等值。

## 10. 验证

在设置、转换或故障排除后，验证结果：

1. **捕获场景：** 在代表性场景上捕获 Scene View 或特定相机——参见 [references/capturing-the-editor.md](references/capturing-the-editor.md)。
2. **评估结果：**
   - 除非仍有未解决的自定义着色器阻塞项，否则没有洋红材质
   - 主光照和阴影按预期表现
   - 烘焙 GI/光照贴图、光照探针和反射探针可接受或被明确标记待重新烘焙/刷新
   - 相机渲染预期内容
   - 后处理或全屏效果仍正确表现
   - 精灵、瓦片地图或 2D 光照在相关时工作
3. **验证持久项目数据，而不仅仅是视觉输出。**
   - 检查保存的 URP 资产、渲染器资产、场景引用、材质着色器 GUID/名称、Quality 设置和 Volume 配置文件。
   - 在得出烘焙光照、PPv2 或反射探针不存在的结论之前，确认打开了代表性场景（而非默认/测试场景）或以其他方式检查过。
   - 对于材质迁移，在验证中包含粒子/VFX 材质。残留的内置粒子着色器 ID 或旧版粒子着色器名称意味着材质迁移不完整。
   - 对于 PPv2 迁移，保存的 URP `VolumeProfile` 资产必须包含预期的覆盖组件，然后才能报告为已迁移。
   - 如果工具日志报告映射的后处理但保存的配置文件重新加载为 `components: []`，请推翻工具日志并将迁移报告为失败/不完整。
   - 对于烘焙光照场景，检查 Lighting Settings、Lighting Data/光照贴图引用、光照探针和反射探针。编译成功不能证明烘焙光照一致性。如果旧光照贴图导致过曝，请在判断一致性之前清除活动烘焙数据并在 URP 下重新烘焙。在分配新的光照设置后，验证保存的场景引用，而不仅仅是新 `.lighting` 资产的存在。
   - 如果旧 `LightingData.asset` 仍被分配且反射探针 EXR 在视觉检查后未重新生成或明确接受，请将光照/探针分类为保留或部分，而非刷新。
4. **使用 `Unity.GetConsoleLogs` 检查 Console 输出**以查找着色器、渲染管线或渲染器特性错误。
5. **先修复影响最大的问题，** 然后再次验证。
6. **最多重复 3 次迭代**，然后报告剩余阻塞项或询问用户希望如何继续。

## 11. 故障排除决策树

如果用户报告迁移问题，请遵循此诊断流程：

### "迁移" 后项目仍表现得像 Built-in
1. 检查 Graphics 设置中是否分配了 URP 资产。
2. 检查相关 Quality 层级是否也指向 URP 资产。
3. 在排查任何其他问题之前，验证活动渲染管线实际是 URP。

### 安装 URP 后迁移停止
1. 将其视为包刷新/域重载边界，而不是其本身失败的完整迁移。
2. 重新检查 `Packages/manifest.json` 和包状态。如果 URP 已安装，不要重新安装它。
3. 检查部分资产，例如 URP 资产、渲染器资产、已转换材质、空 Volume 配置文件和场景组件更改。
4. 如果 URP 已安装/分配但 Built-in 材质仍占主导或场景为洋红，材质转换是下一个立即的不完整项。如果回滚安全性已确认，不要称 URP 设置完成并停在那里。
5. 从第一个未完成的验证项继续：Graphics/Quality 分配、渲染器资产有效性、材质转换、PPv2 到 URP Volume 迁移、烘焙光照重新烘焙，然后最终验证。
6. 如果之前的聊天/导出没有最终响应，将其报告为不完整证据并在新的聊天/回合中继续。

### 材质为洋红/亮粉色
1. 检查 Console 和 Inspector 的着色器错误。
2. 确认材质使用受支持的 Built-in 着色器、自定义着色器还是包拥有着色器。
3. 如果它是受支持的 Built-in 着色器，先审查转换器路径或定向材质转换。
4. 如果项目已在 URP 上且许多受支持的 Built-in 材质仍存在，请将其视为不完整的材质转换，而非最终视觉一致性工作。
5. 如果它是自定义或包着色器，进入 [references/custom-shader-triage.md](references/custom-shader-triage.md)，并在需要时进入 [references/complex-shader-situations.md](references/complex-shader-situations.md)。

### 场景明显更暗、更亮或就是 "不对"
1. 比较 Scene View 和 Game View 捕获。
2. 首先检查双重后处理：保留的 PPv2 `PostProcessVolume` / `PostProcessLayer` 加上活动的 URP `Volume` 可能使验证捕获过曝或失真。
3. 审查阴影、环境/环境光照、色调映射、天空盒、曝光、泛光和后处理。
4. 检查烘焙光照状态：Lighting Settings、Lighting Data 资产、光照贴图引用、混合/烘焙光、光照探针和反射探针。
5. 在重写内容之前审查质量层级分配和 URP 资产设置。
6. 如果清除烘焙数据修复了严重过曝，请将旧光照贴图视为陈旧的活动数据：仅将其保留为参考/回滚证据，然后在 URP 下重新烘焙。
7. 如果场景依赖烘焙光照，在声称视觉一致之前建议 URP 重新烘焙和反射探针刷新。
8. 记住 Built-in 和 URP 的光照衰减可能不同；将其视为调优任务，而不是转换失败的证明。

### 后处理或全屏效果消失
1. 检查 PPv2 是否已转换，以及目标相机和 volume 设置是否仍然有效。
2. 检查保存的 URP `VolumeProfile` 资产。空配置文件意味着 PPv2 效果实际上未迁移。
3. 检查场景中是否有旧 `PostProcessVolume` / `PostProcessLayer` 组件仍活动。
4. 搜索 `OnRenderImage`、自定义 blit 代码或替换着色器相机效果。
5. 使用 URP 兼容方法移植效果，而不是试图原样保留 Built-in 回调路径。

### 透明/折射/扭曲效果损坏
1. 检查着色器是否依赖 `GrabPass` 或类似的 Built-in 屏幕复制工作流。
2. 如果是，请使用 [references/complex-shader-situations.md](references/complex-shader-situations.md) 并选择 Scene Color / Renderer Feature / 自定义 pass 方法。

### 2D 光照不影响精灵
1. 确认项目实际使用 2D Renderer。
2. 确认现有精灵材质在需要时已升级为 URP 兼容的受光材质。
3. 不要假设拖入的新精灵证明旧项目材质是正确的。

### 迁移后性能回归
1. 审查渲染缩放、阴影、附加光、MSAA、后处理、不透明/深度纹理和其他 URP 资产设置。
2. 检查自定义着色器移植是否失去批处理兼容性或引入额外 pass。
3. 在假设唯一答案是回滚之前先调优设置。

### 自定义着色器编译但视觉效果仍不对
1. 确定问题是简单的参数漂移还是结构不兼容。
2. 如果着色器来自 surface shader、`GrabPass`、替换着色器工作流或自定义光照路径，将其视为复杂迁移情况。
3. 在将方法推广到整个项目之前验证一个代表性材质。

## 12. 核心护栏

- 首先检测活动的渲染管线；对于 HDRP，解释不匹配并仅提供基本比较指导。
- 在确认回滚安全性之前不要变更项目；改为在 URP 安装、资产分配、转换器、材质编辑或场景编辑之前停在规划模式。
- 不要将工具日志或创建的资产当作证据；改为在状态声明之前保存/重新加载/重新查询 Graphics、Quality、材质、Volume、光照、探针、Console 和代表性场景。
- 不要将部分阶段压缩为项目级完成；改为根据成功门报告 `Phase complete`、`Partial migration` 和 `Manual follow-up`。
- 不要批量重写脆弱的渲染代码；改为对自定义着色器、`GrabPass`、`OnRenderImage`、替换着色器、包拥有的渲染代码和不支持的 PPv2 效果使用范围化映射。

## 13. 回报

总结：

- 使用了哪条迁移路径
- 项目仍为 Built-in、部分迁移还是完全在 URP 上
- 运行了哪些转换器
- 自动修复了什么
- 仍需手动处理什么
- 验证了哪些场景、材质或相机
- 仍有哪些风险，尤其是复杂着色器、包效果和视觉一致性
- 后处理是完全迁移、部分准备还是仅为手动后续记录
- Quality 层级是显式分配还是有意依赖 Graphics 设置回退
- 粒子/VFX 材质是已转换还是仍需 URP 粒子着色器后续
- 烘焙光照/光照贴图/反射探针是作为参考保留、视觉验证、重新烘焙/刷新，还是留作手动后续
- 曝光、色调映射、环境填充和相机/Volume 后处理接线是视觉平衡还是仍部分完成

保守使用完成语言。如果报告包含任何 `Partial`、`Manual follow-up`、`not validated`、`may still need` 或不支持特性项，请说明具体已完成的阶段通过，并称整体迁移为部分/手动。不要将项目级 "complete" 声明与手动后续项目符号配对。

## 参考

- [Migration Workflow](references/migration-workflow.md)
- [Custom Shader Triage](references/custom-shader-triage.md)
- [Complex Shader Situations](references/complex-shader-situations.md)
- [Quality Settings Map](references/quality-settings-map.md)
- [Implementation Patterns](references/implementation-patterns.md)

当本技能被激活时，主动阅读 [references/migration-workflow.md](references/migration-workflow.md)。如果请求涉及材质、着色器、洋红材质、自定义渲染或全屏效果，也阅读 [references/custom-shader-triage.md](references/custom-shader-triage.md) 和 [references/complex-shader-situations.md](references/complex-shader-situations.md)。如果请求涉及视觉不匹配、光照、烘焙光照、光照贴图、反射探针、阴影或迁移后的性能，也阅读 [references/quality-settings-map.md](references/quality-settings-map.md)。如果用户允许实际迁移更改或要求继续/修复部分迁移，也阅读 [references/implementation-patterns.md](references/implementation-patterns.md)。
