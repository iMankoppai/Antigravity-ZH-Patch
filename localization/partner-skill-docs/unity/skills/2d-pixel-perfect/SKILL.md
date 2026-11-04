---
name: 2d-pixel-perfect
description: 在 URP 或 Built-in 中设置、诊断并修复使用 PixelPerfectCamera 的像素完美 2D 渲染。用于复古风格或像素艺术 2D 游戏看起来模糊、抖动或未对齐时。不用于 HD 2D 或高分辨率美术。
---

在 Unity 项目中设置、诊断并修复像素完美 2D 渲染。

---

## ⚠ 有两个完全独立的实现

Unity 中的像素完美渲染**不是一个系统**——它是两个独立、互不兼容的实现，每个渲染管线一个。**在编写或诊断任何代码之前，始终先检测管线。**

| | URP | Built-in |
|---|---|---|
| **组件** | `UnityEngine.Rendering.Universal.PixelPerfectCamera` | `UnityEngine.U2D.PixelPerfectCamera` |
| **包** | URP 内置——无需额外安装 | `com.unity.2d.pixel-perfect` v6.0.0+ |
| **API 风格** | 枚举（`gridSnapping`、`cropFrame`） | 布尔值（`pixelSnapping`、`upscaleRT`、`cropFrameX/Y`） |

**不要在 URP 项目中安装 `com.unity.2d.pixel-perfect`。**

**→ 始终先调用 `DetectPipeline()`**（`references/pipeline-detection.cs`），然后根据结果分支你的设置、诊断和修复。

---

## 何时不要使用本技能

- **HD 2D 或高分辨率 2D 游戏**——像素对齐和点过滤会让平滑的美术看起来不对
- **仅 UI 的场景**——请改用 Canvas Scaler
- **HDRP 项目**——不支持 Pixel Perfect Camera

---

## 关键提醒

⚠ **先检测渲染管线**——URP 和 Built-in 使用不同的 Pixel Perfect Camera 组件，且不可互换。
⚠ **Filter Mode = Point 是头号修复**——双线性过滤是 Unity 的默认值，几乎总是模糊精灵的原因。
⚠ **必须禁用抗锯齿**——在 Quality Settings 和相机上都要禁用。AA 会主动模糊像素边缘。

## 关键原则

### 1. 管线检测与相机组件选择

参见本文件顶部的双路径比较表。程序集名称说明：独立的 Built-in 包安装到 `Runtime/` 文件夹中，但 asmdef 的 `"name"` 字段是 `Unity.2D.PixelPerfect`——没有 `Runtime` 后缀。不支持 HDRP——请参见常见问题下的 HDRP 回退部分。

**→ 代码：`references/pipeline-detection.cs`** —— `DetectPipeline()`、`GetPixelPerfectCameraType()` 以及迁移不匹配检查。

### 2. 诊断优先的方法

在做出更改之前始终先诊断。报告发现，然后只修复损坏的部分。

### 3. 在正确的范围内工作

默认为场景范围。仅在用户明确要求时才进行项目范围扫描。

---

## 诊断清单

**精灵导入设置：**
- [ ] 所有范围内精灵的 Filter Mode = `Point (no filter)`
- [ ] Mip Maps = 禁用
- [ ] Compression = `None` / 未压缩
- [ ] 场景中所有精灵的 PPU 一致
- [ ] 精灵轴心设置为 Custom / Pixels 模式——奇数尺寸精灵（例如 15×15）上的中心轴心会落在 7.5px，导致 0.5px 的错位

**→ 代码：`references/sprite-settings.cs`** —— `GetImporter()` 和 `FixSpriteImportSettings()`。

**编辑器对齐设置：**
- [ ] 所有轴上的 Grid Size = `1 / assetsPPU`（例如 PPU 16 → 0.0625，PPU 100 → 0.01）
- [ ] 在 Grid and Snap 叠加层中启用 Grid Snapping
- [ ] 要对现有 GameObject 进行对齐：选择它们 → Align Selected → All Axes

**相机设置：**
- [ ] 相机投影 = Orthographic
- [ ] Pixel Perfect Camera 组件存在且类型与管线匹配
- [ ] `allowHDR`、`allowMSAA`、`allowDynamicResolution` 均为 `false`
- [ ] 场景视图在相机 Gizmo 上显示两个绿色边界框——实线 = 可见区域，虚线 = 参考分辨率

**→ 代码：`references/camera-setup-urp.cs`** —— 完整的 URP 相机 + PP Camera 配置。
**→ 代码：`references/camera-setup-builtin.cs`** —— Built-in 独立配置。

**项目质量设置：**
- [ ] Quality Settings 中 Anti-Aliasing = 0
- [ ] Anisotropic Filtering = 禁用

---

## API 参考

完整的属性/方法表、`GridSnapping` 和 `CropFrame` 枚举值，以及推荐配置：
**→ `references/api-reference.md`** —— 在编写或审查相机设置代码时阅读此文件。

快速枚举摘要：

**`GridSnapping`**：`None` · `PixelSnapping`（标准） · `UpscaleRenderTexture`（真实低分辨率；与后处理和 UI 文本不兼容）

**`CropFrame`**：`None` · `Pillarbox` · `Letterbox` · `Windowbox`（最安全的默认值） · `StretchFill`

---

## 参考分辨率

在构建任何资产之前选择。资产生产开始后绝不更改。

| 参考分辨率 | 1080p | 1440p | 4K |
|---|---|---|---|
| 320 × 180 | 6× | 8× | 12× |
| 480 × 270 | 4× | ~5.3× | 8× |
| 640 × 360 | 3× | 4× | 6× |

320×180 是最安全的通用选择。对于无法整数适配的屏幕（例如 1366×768），使用 `cropFrame = Windowbox` 添加黑边，而不是拉伸到小数倍率。

---

## 迁移与兼容性

### 使用 Built-in 独立组件的 URP 项目

**症状**：`DetectPipeline()` 返回 URP，但相机带有 `UnityEngine.U2D.PixelPerfectCamera`。症状很微妙，因为独立组件有 `ENABLE_URP` 条件代码。

**修复**：
1. 从 Package Manager 中移除 `com.unity.2d.pixel-perfect`
2. 从每个相机上移除 `UnityEngine.U2D.PixelPerfectCamera`
3. 添加 `UnityEngine.Rendering.Universal.PixelPerfectCamera`
4. 重新配置——布尔值（`pixelSnapping`、`upscaleRT`、`cropFrameX/Y`）变为枚举（`gridSnapping`、`cropFrame`）

**→ 检测代码：`references/pipeline-detection.cs`**（文件底部）。

### 旧 URP 命名空间（Unity 2022 之前 / URP 13.x 之前）

**症状**：编译器错误引用 `UnityEngine.Experimental.Rendering.Universal`。

**修复**：将 `using UnityEngine.Experimental.Rendering.Universal;` 替换为 `using UnityEngine.Rendering.Universal;`。更新任何程序集限定的类型字符串。`[MovedFrom]` 特性会自动处理序列化——GameObject 上的组件在升级后仍保留。

---

## 常见问题与解决方案

### 精灵模糊
**修复**：将所有范围内精灵的 Filter Mode 设为 Point，禁用 Mip Maps，在 Quality Settings 中禁用 AA。
**→ 代码：`references/sprite-settings.cs`**

### 瓦片之间的 Tilemap 间隙
按顺序处理——诸如负单元格间隙或 PPU = 31.99 的变通方案在相机移动时会失效。

| # | 检查 | 修复 |
|---|---|---|
| 1 | 精灵图集是否关闭 Tight Packing、Padding ≥ 4、Sprite Packer Mode 已启用？ | 在编辑器设置中启用 Sprite Packer Mode；在图集上将 Padding 设为 ≥ 4 并关闭 Tight Packing |
| 2 | 瓦片集纹理和图集上的 Mipmap 是否禁用？ | 禁用 Generate Mip Maps |
| 3 | 相机上 AA = 0、MSAA 关闭？ | 全局禁用 AA |
| 4 | Compression = None？ | RGBA 32 位未压缩 |
| 5 | 所有瓦片精灵的像素尺寸是否都是偶数？ | 奇数尺寸会导致 0.5px 网格偏移 |
| 6 | PPU = 瓦片像素宽度？（16×16 → PPU 16） | PPU 不匹配会留下物理间隙 |
| 7 | 上述全部通过后仅在相机移动时出现间隙？ | 使用 PP Camera 像素对齐；不要使用 `cellGap = -0.01f` |

### Cinemachine 冲突
**原因**：Cinemachine 和 Pixel Perfect Camera 都每帧写入正交尺寸。

**修复**：通过每个 Virtual Camera 上的 Add Extension 下拉菜单添加 `CinemachinePixelPerfect` 扩展。不要在代码中通过 `AddComponent` 添加它。

**已知限制**：
- 虚拟相机之间的相机混合在过渡期间不是像素完美的
- `UpscaleRenderTexture` 会减少有效的像素完美正交尺寸，可能导致构图偏离
- Target Group + Framing Transposer 会导致明显的卡顿（无可用修复）

### 使用 `upscaleRT` 时的后处理模糊
**原因**：后处理在 PP Camera 放大渲染纹理之后运行。

**简单修复**：禁用 `upscaleRT`。随后后处理以原生屏幕分辨率运行。

**高级修复（Unity 6 URP）**：在 `RenderPassEvent2D.AfterRenderingPostProcessing` 处注入一个 `ScriptableRendererFeature2D`。使用 2D 专用的基类——`ScriptableRendererFeature`（3D 基类）在 URP 2D 渲染器中会被静默忽略。

### 使用 `upscaleRT` 时 UI 文本模糊
**状态**：已知 Unity bug，拒绝修复（截至 2025 年 Unity 6 仍存在）。

**根本原因**：(A) Canvas 渲染到低分辨率缓冲区并随场景一起放大。(B) TMP 的 SDF 渐变阈值在低参考分辨率下校准不当。

**按可靠性排序的修复**：
1. Canvas 使用 `Screen Space - Overlay`——绕过相机，以原生分辨率渲染
2. 使用不带 PP Camera 组件的专用 UI 相机，`Screen Space - Camera` 模式
3. 仅 Unity 6：`Font Material → Debug Settings → Sharpness = 1`（缓解 B，不解决 A）

### 物理 / 渲染不同步（微小卡顿）
**原因**：物理以固定时间步长运行；插值位置产生的小数值每帧对齐到不同的像素。

**修复**：
- 在物理驱动的精灵上启用 `Rigidbody2D.interpolation = RigidbodyInterpolation2D.Interpolate`
- 设置 `Time.fixedDeltaTime = 1f / 60f` 以匹配目标帧率
- 将相机跟踪保持在 `LateUpdate` 中，而不是 `FixedUpdate`

### 非整数缩放 / 像素抽稀
**原因**：屏幕分辨率不是参考分辨率的干净整数倍。

**修复**：从上表中选择参考分辨率。当不存在整数适配时使用 `cropFrame = Windowbox`。

### 缺少 URP 2D Renderer
**修复**：
1. `Assets > Create > Rendering > URP 2D Renderer Data`
2. 在 Renderer List 下将其分配给你的 URP Asset
3. 需要 `com.unity.render-pipelines.universal` 12.0+

### HDRP 回退
HDRP 不支持 Pixel Perfect Camera。

**Built-in / Unity 5.x**：使用 `RenderTexture` + `Graphics.Blit` 并配合 `FilterMode.Point`。

**Unity 6 URP**：使用 `ScriptableRendererFeature2D` + `ScriptableRenderPass2D`，在 `RenderPassEvent2D.AfterRendering` 处通过 `AddRasterRenderPass` 注入。注意：`OnRenderImage` 和 `Graphics.Blit` 与 Unity 6 的渲染图不兼容。
