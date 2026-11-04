---
name: urp-postprocessing
description: 使用 Volume 框架设置、配置并调试 URP 后处理。用于泛光、色调映射、颜色调整、景深、暗角或其他 Volume 覆盖。
required_packages:
  com.unity.render-pipelines.universal: ">=14.0.0"
---

帮助用户使用 URP 的 Volume 框架设置、配置并调试后处理效果。

**目标：设置后用户应获得可用的视觉效果且控制台零错误。**

## 0. 前提条件：一个可以在其中运行 C# 的编辑器

Volume 配置文件、`VolumeParameter.overrideState` 以及相机的后处理标志都是
编辑器/运行时对象状态——下面的检查和编辑都在实时编辑器中运行 C#。

**`unity-cli` 技能负责带你到达那里**——安装 CLI、确认已连接的
编辑器、添加项目的 `com.unity.pipeline` 包、区分真正缺失的编辑器
与卡在安全模式中的编辑器，以及发现编辑器的命令目录。先遵循它；
不要在这里重新推导任何这些内容。你特别需要 `script eval`，而不仅仅是一个可访问的
编辑器：它的存在取决于 Pipeline 包版本，而不是 CLI。如果它
缺失，请说明并停止。

通过 `script eval` 命令在已连接的编辑器中运行 C#。从
`unity command --format json` 发现其参数形态，而不要假设——内联形式为
`unity command script eval --caller plugin --skill urp-postprocessing --code '<snippet>'`，某些 Pipeline 版本还注册了
`script eval_file` 以便从文件运行代码段。**在动用 `script eval_file` 之前先检查目录；它经常缺失。** `unity command` 默认超时为 30 秒。

### 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**。由此产生两个后果，两者都会导致
编译错误而非警告：

- **没有 `using` 指令。** 编译器会将 `using UnityEngine;` 读取为资源释放
  语句并拒绝它（`CS0210`）。
- **类型必须完全限定。** 裸的 `AssetDatabase` 或 `Volume` 无法解析
  （`CS0246` / `CS0103`），而裸的 `Object` 会与 `object` 产生歧义（`CS0104`）。

如果下面的代码段是以文件形式编写的——为了可读性带有 using，或因需要
保存到项目中——在将其传给 `script eval` 之前请先限定类型。

## 0. 预检

在配置任何效果之前，**验证所有检查**。先修复失败项。

1. **URP 是活动的渲染管线** —— 如果不是，告知用户并停止。
2. **URP 资产上启用了 HDR** —— Tonemapping 需要它。Bloom 在 HDR 下效果最佳；在 SDR 中它仍然工作，但 `threshold` 必须 < 1。
3. **相机启用了后处理** —— `renderPostProcessing` 必须为 `true`（默认为 `false`）。相机堆叠：只有 `CameraRenderType.Base` 相机（或堆栈中最后一个 `Overlay`）应启用后处理。还要验证 Renderer 的 PostProcessData 资产不为 null——如果为 null，后处理通道将不存在。
4. **Volume 的 GameObject 层在相机的 Volume Layer Mask 中** —— `volumeLayerMask` 默认仅为层 0 "Default"。必须包含 Volume 的 `GameObject.layer`，否则相机会忽略它。
5. **Volume 存在且 `enabled = true`、有有效的 Profile 以及至少一个覆盖** —— `Volume` 组件必须启用，具有非 null 的 `profile`（或 `sharedProfile`），并且其属性上至少有一个 `overrideState = true` 的 `VolumeComponent`。

### 预检代码段

运行此代码以编程方式验证设置：

```csharp
// `script eval` compiles a statement block, not a file: no `using` directives are
// allowed, so every type is fully qualified.
var report = new System.Text.StringBuilder();

// 1. Check URP is active — a hard stop, so throw: it fails the eval loudly
var urpAsset = UnityEngine.Rendering.Universal.UniversalRenderPipeline.asset;
if (urpAsset == null)
    throw new System.Exception("URP is not the active render pipeline.");

// 2. Check HDR
if (!urpAsset.supportsHDR)
    report.AppendLine("Warning: HDR is disabled on the URP Asset. Tonemapping won't work; Bloom requires threshold < 1.");

// 3. Check camera post-processing
var cam = UnityEngine.Camera.main;
if (cam == null)
    throw new System.Exception("No Main Camera found.");
if (!cam.TryGetComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>(out var camData))
    throw new System.Exception("Missing UniversalAdditionalCameraData on camera. Is URP active?");
if (!camData.renderPostProcessing)
    report.AppendLine("Warning: Post-processing is disabled on the camera. Enable via camData.renderPostProcessing = true.");

// 4. Check volume layer mask
var volumes = UnityEngine.Object.FindObjectsByType<UnityEngine.Rendering.Volume>(UnityEngine.FindObjectsSortMode.None);
foreach (var vol in volumes)
{
    if (!vol.enabled) { report.AppendLine($"Warning: Volume '{vol.name}' is disabled."); continue; }
    if ((camData.volumeLayerMask & (1 << vol.gameObject.layer)) == 0)
        report.AppendLine($"Warning: Volume '{vol.name}' on layer {vol.gameObject.layer} is not in camera's volumeLayerMask.");
    // 5. Check profile and overrides
    var profile = vol.sharedProfile;
    if (profile == null) { report.AppendLine($"Warning: Volume '{vol.name}' has no profile assigned."); continue; }
    if (profile.components.Count == 0)
        report.AppendLine($"Warning: Volume '{vol.name}' profile has no overrides.");
}

// Return the findings: logs land in the Editor console, the returned value comes back to you
return report.Length == 0 ? "Post-processing setup looks correct." : report.ToString();
```

## 1. Volume 设置

效果作为 **VolumeComponent 覆盖**添加在 **VolumeProfile**（一个 `ScriptableObject`）上。

**全局 Volume**（最常见）：带 `Volume` 组件的 GameObject，`isGlobal = true`，已分配 `profile`。影响其 `volumeLayerMask` 包含 Volume 层的每个相机。

**局部 Volume（可选，但优先）**：带触发器 `Collider` + `Volume` 组件的 GameObject，`isGlobal = false`。属性：
- `priority`（float）—— 当 Volume 重叠时，较高值覆盖较低值。
- `blendDistance`（float）—— 开始混合的外部距离（世界单位）（0 = 无混合，在碰撞体边界处即时过渡）。
- `weight`（float，0–1）—— 缩放 Volume 的整体影响。

## 2. 后处理效果

所有效果都是 `VolumeComponent` 子类，通过 `profile.Add<T>()` 作为覆盖添加在 `VolumeProfile` 上。使用 `profile.Has<T>()` 或 `profile.TryGet<T>(out var t)` 检查存在性。使用 `profile.Remove<T>()` 移除。

每个属性都是 `VolumeParameter`。在设置 `value` 之前你**必须**设置 `overrideState = true`，否则 Volume 系统会忽略它。

在配置特定效果时，加载完整 API 参考：
- [references/effect-reference.md](references/effect-reference.md) —— 按效果划分的所有 VolumeComponent 属性（Bloom、Tonemapping、ColorAdjustments、DepthOfField、Vignette、MotionBlur、FilmGrain、ChromaticAberration、SplitToning、LensDistortion、WhiteBalance、PaniniProjection、LiftGammaGain、ShadowsMidtonesHighlights、ColorCurves、ChannelMixer）

关于代码模板：
- [references/code-templates.md](references/code-templates.md) —— 全局 Volume 设置、相机后处理和配置文件修改模板

## 3. 防幻觉规则

### 必需的 using

这些在你将 `.cs` 文件写入项目时适用。**传给 `script eval` 的代码段无法
携带它们**——请改为限定类型（参见上面的 "将 C# 传给 `script eval`"）。

```csharp
using UnityEngine.Rendering;           // Volume, VolumeProfile, VolumeComponent, VolumeParameter
using UnityEngine.Rendering.Universal;  // Bloom, Tonemapping, ColorAdjustments, UniversalRenderPipeline, etc.
```

### 错误 → 正确 API 映射

| 错误 | 正确 |
|-------|---------|
| `PostProcessVolume` | `Volume`（来自 `UnityEngine.Rendering`） |
| `PostProcessLayer` | `UniversalAdditionalCameraData.renderPostProcessing`（bool） |
| `UnityEngine.Rendering.PostProcessing` | `UnityEngine.Rendering.Universal` |
| `profile.GetSetting<T>()` | `profile.TryGet<T>(out var t)`（返回 bool） |
| `profile.AddSettings<T>()` | `profile.Add<T>()`（返回 T；如果已存在则抛出——先检查 `profile.Has<T>()`） |
| `volume.sharedProfile`（在运行时修改） | `volume.profile`（自动将资产克隆为实例） |
| `VolumeManager.instance.stack.GetComponent<T>()` | `volume.profile.TryGet<T>(out var t)` |

### 关键事实
- **`overrideState = true`** 对你设置的每个 `VolumeParameter` 都是必需的。Volume 系统会跳过 `overrideState` 为 `false` 的参数。这是头号脚本编写错误。
- **`sharedProfile`** = 直接返回资产（编辑持久化到磁盘）。**`profile`** = 如有需要自动克隆为实例（对运行时编辑安全）。用 `volume.HasInstantiatedProfile()` 检查。
- **`profile.Add<T>(bool overrides = false)`** —— 传 `true` 以在添加组件的所有参数上自动启用 `overrideState`。

## 4. 调试清单

当后处理不起作用时，按顺序检查：

1. `cam.TryGetComponent<UniversalAdditionalCameraData>(out var data)` 成功且 `data.renderPostProcessing` 为 `true`？
2. 场景中存在 Volume 且已分配非 null 的 `profile`（或 `sharedProfile`）？
3. 通过 `profile.Add<T>()` 添加了覆盖并且你设置的每个属性上 `overrideState = true`？
4. Volume 的 `GameObject.layer` 包含在相机的 `data.volumeLayerMask` 中？（默认掩码仅为层 0 "Default"。）
5. `volume.isGlobal = true`（对于全局），或相机在 Volume 的触发器 `Collider` 内（对于局部）？
6. 相机 `data.renderType` 是 `CameraRenderType.Base`，不是 `Overlay`？（Overlay 相机合成到 Base 相机的输出上。）
7. `UniversalRenderPipeline.asset.supportsHDR` 为 `true`？Bloom 和 Tonemapping 需要它。
8. 在 **Game 视图**中查看？Scene 视图在其工具栏中有单独的后处理开关。

## 5. 常用配方

格式：效果 属性=值。Bloom 值为 threshold/intensity/scatter。

**电影感（胶片）：** Tonemapping mode=ACES、ColorAdjustments contrast=15 saturation=-10、Bloom threshold=0.9 intensity=0.5 scatter=0.7、Vignette intensity=0.3 smoothness=0.4、FilmGrain type=Medium1 intensity=0.2

**风格化/鲜艳：** Tonemapping mode=Neutral、ColorAdjustments saturation=20 contrast=10、Bloom threshold=0.8 intensity=1.5 scatter=0.6、SplitToning highlights=warm shadows=cool

**恐怖/暗黑：** ColorAdjustments postExposure=-0.5 saturation=-30 contrast=20、Vignette intensity=0.5 smoothness=0.3 color=dark-red、FilmGrain type=Large01 intensity=0.4、ChromaticAberration intensity=0.15

**简洁/移动端：** Tonemapping mode=Neutral、ColorAdjustments postExposure=0.2、Bloom threshold=1.0 intensity=0.3（微妙）。在移动端避免 FilmGrain、MotionBlur、DepthOfField。

## 6. 最终确认

设置后，向用户报告：

```
Post-Processing Setup Complete
- Volume: [Global/Local] on "[GameObject Name]"
- Profile: [Asset Path]
- Effects: [List with key property=value pairs]
- Camera: [Name] — renderPostProcessing=true, volumeLayerMask includes layer [N]

View results in Game view (not Scene view).
Undo all changes with Edit > Undo (Ctrl+Z).
```
