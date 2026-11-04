---
name: optimize-text-mesh-pro
description: 优化 TextMeshPro 的渲染、内存和字体设置，包括字体资产栈、回退图集、SDF 质量和世界空间文本。用于用户询问 TMP 字体、中日韩或多语言文本或文本性能时。
---

# 优化 TextMeshPro

## 分诊——先确定症状

在提供建议之前，先确定用户的问题属于哪个类别。如果用户没有描述具体症状，请询问："Are you seeing a **memory/atlas bloat**, **visual quality**, **CPU/performance**, **build size**, or **localization/alignment** issue with TextMeshPro?"

| 症状 | 转到 |
|---|---|
| Memory Profiler 显示大或多个 TMP 图集 | [字体栈与动态回退](#font-stack--dynamic-fallbacks)、[Memory Profiler：包含字体数据](#memory-profiler-include-font-data) |
| 字形粗细不一致、边缘模糊、视觉质量 | [内边距与采样比例](#padding--sampling-ratios)、[字体资产缩放](#font-asset-scale)、[图集渲染模式：SDF16](#atlas-render-mode-sdf16) |
| 文本更新或 Canvas 重建期间 CPU 尖峰 | [AutoSize](#autosize)、[世界空间 vs Canvas 文本](#worldspace-vs-canvas-text) |
| 随包发布的字体文件导致构建体积过大 | [动态 OS 图集填充](#dynamic-os-atlas-population-tmp-320-pre3) |
| 混合拉丁文 + 中日韩文对齐看起来不对 | [字体规范化](#font-normalization) |
| 需要多种字体样式（斜体、描边、辉光） | [材质预设](#material-presets) |

---

## 核心规则

- **主字体 = 已烘焙所有字形的静态资产。** 通过 Fallback 列表（或 TMP Settings）为其他所有内容添加**动态**回退。将动态图集大小保持在 **512-1024** 以限制峰值内存。
- **动态回退字体 -> 启用 `Clear Dynamic Data On Build`。** 否则在编辑器中烘焙的字形会随附到播放器中。
- **在主字体 + 回退字体之间保持内边距与采样点大小的比例一致。** 不匹配会导致同一行上字形粗细不一致。
- **拉丁文采样点大小 70-90；中日韩文 36-50。** 不同的书写系统需要不同的采样大小以获得干净的 SDF。
- **字体资产 Scale = 1。** 其他任何值（例如 0.9）都会破坏标准点大小计算。
- **布局锁定后，在运行时禁用 AutoSize。** AutoSize 用于设计，而不是实时计数器。
- **世界空间文本 -> 使用 `TextMeshPro`，而非 `TextMeshProUGUI`。** 世界空间中的 Canvas 开销并非免费。
- **将频繁变化的 TMP UI 父级化到其自己的 Canvas** 以限制重建成本。
- **对于同一字体的斜体 / 粗体 / 描边 / 辉光变体，TMP 材质预设 > 复制字体资产。**
- **对于在 iOS/Android 上发布多语言构建，评估 `Atlas Population Mode = Dynamic OS`**（TMP 3.2.0-pre.3+）以利用系统字体并缩小构建体积。

---

## 字体栈与动态回退

如果用户报告 TMP 图集导致内存膨胀，建议采用此字体栈模式：

```
Main font asset (static, all required Latin glyphs baked)
  -> Fallback 1: Dynamic font (atlas 512 or 1024) for CJK
  -> Fallback 2: Dynamic font for symbols / emoji
```

**绝不要在未启用 `Clear Dynamic Data On Build` 的情况下发布动态回退字体资产。** 如果此开关关闭，在编辑器中测试时烘焙的每个字形都会包含在播放器构建中。

---

## 内边距与采样比例

如果用户报告主字体与回退字体之间笔画宽度或字形粗细不一致，请检查内边距与采样点大小的比例。

该比例为 `Padding / SamplingPointSize`。当 Padding = 9 且 Sampling Point Size = 90 时，比例 = **10%**。

- 主字体采用一种比例，而回退字体采用不同比例，会在同一行产生**不一致的笔画宽度**。
- 选择一个比例（10% 是安全的默认值），将其应用于链中的所有字体资产。

推荐的采样点大小：

- **拉丁文书写系统**：70-90。
- **中日韩文书写系统**：36-50（中日韩字形视觉上更密集；较小的采样大小仍能产生干净的 SDF 并节省图集内存）。

---

## 字体资产缩放

如果用户报告点大小与设计规格不符，请检查字体资产的 Scale 值。某些导入的 TMP 字体资产附带 `Scale = 0.9` 而非 `1.0`。Scale 值参与点大小到像素的计算，因此非 1 的缩放会产生非标准的点大小。建议用户在调整内边距比例之前，**在所有字体资产上将 Scale 设为 1**。

---

## 精灵资产

如果用户报告移动端 TMP 精灵资产加载缓慢，请检查源纹理的 Texture Type。它必须设置为 **Default**（而非 Sprite）。Sprite 类型会创建 TMP 不使用的子子对象；Default 可避免它们。

---

## AutoSize

如果用户报告频繁变化的文本字段（计时器、计数器、聊天、动态玩家名称）出现 CPU 尖峰，请检查 `enableAutoSizing` 是否开启。AutoSize 会在字符串变化时调整文本大小，导致持续的 CPU 尖峰。

建议：布局锁定后**禁用 AutoSize 并硬编码选定的点大小**。仅对真正静态、在语言环境变化时自动适配的标签保留 AutoSize。

---

## 图集渲染模式：SDF16

如果点大小为 **72 或更大**的静态字体看起来不清晰或边缘模糊，建议将 **Atlas Render Mode** 切换为 **SDF16**。更精确的 SDF 用于大字形，代价是略微增加图集内存。

---

## 字体规范化

如果用户报告同一行上拉丁文 + 中日韩文文本未对齐，请引导他们完成以下步骤：

1. **Window -> TextMeshPro -> Settings -> Import TMP Example & Extras**（每个项目一次）。
2. 将 **`TMP_TextInfoDebugTool`** 组件添加到显示未对齐文本的 TextMeshPro 对象上。
3. 启用 **ShowLines** 开关——升部、降部和基线会渲染为叠加层。
4. 混合拉丁文 + 中日韩文字符串；如果线条偏离，**调整 TMP Font Asset 上的升部/降部**直到它们对齐。

> **注意**：已观察到导入 TMP Examples & Extras 在某些项目布局上会导致无限导入循环。如果发生这种情况，请关闭 Unity 并重新打开——第二次尝试时导入会解决。

---

## 材质预设

如果用户需要同一字体的多种样式（斜体、粗体、描边、辉光），建议使用材质预设而非复制字体资产。预设共享同一字体纹理，但覆盖着色器参数。

如何创建：

1. 选择一个 TMP Text GameObject。
2. 在 Inspector 中，找到 **Material** 部分。
3. **右键单击 Material 标题 -> Create Material Preset。**
4. 重命名新材质并调整设置。
5. 在 TMP Text 组件上，从 **Material Preset 下拉菜单**中选择预设。

---

## 动态 OS 图集填充（TMP 3.2.0-pre.3）

如果用户正在发布多语言构建并担心构建体积，建议评估 **`Atlas Population Mode = Dynamic OS`**（TMP 3.2.0-pre.3+）：

- 在编辑器中：仍使用项目中的源字体。
- 在播放器构建中：**不包含源字体**。运行时，Unity 在设备上搜索具有匹配 Family + Style 名称的字体。

推荐的中日韩系统字体：

| 平台 | 推荐的系统字体 |
|---|---|
| **Android** | NotoSans（广泛覆盖中文、日文、韩文字形）。 |
| **iOS** | 用于简体/繁体中文的 PingFang。iOS 对中日韩使用**每种语言独有的字体**（中文、日文、韩文使用不同的字体族）——在所有三者上发布单一 TMP 设置时请检查回退链。 |

优势：构建体积缩小（不附带中日韩字体文件）且内存下降（系统字体与操作系统共享）。

---

## Memory Profiler：包含字体数据

如果 Memory Profiler 在编辑器中显示字体资产大小异常大，请检查 `.ttf` / `.ttc` 导入设置上是否启用了 **Include Font Data**。编辑器默认将源字体文件包含在资产中，但在设备上（尤其是使用 Dynamic OS 时），不付出此成本。

要使编辑器捕获与设备一致：在字体文件上 -> 在导入设置中取消勾选 **Include Font Data**。然后 Memory Profiler 将显示**不含**底层字体文件的开销。

---

## 世界空间 vs Canvas 文本

如果用户有使用 `TextMeshProUGUI` 的世界空间文本（伤害数字、标牌、全息图），建议改用 **`TextMeshPro`**。世界空间 Canvas 是已知的低效之处。

如果 `TextMeshProUGUI` 元素的 `text` 经常变化（计时器、计数器、聊天），建议**将其父级化到具有自己 Canvas 组件的子 GameObject 下**。Canvas 重建按 Canvas 范围进行，因此隔离易变字段可减少其余 UI 的重建成本。

---

## 常见陷阱

如果用户的设置符合以下任何一项，请指出：

- 为所有语言使用一个巨大的动态字体资产，而非静态主字体 + 动态回退——动态图集会膨胀。
- 主字体 + 回退之间的内边距比例不一致——同一行文本看起来像两种字体。
- 从导入继承的字体资产 Scale = 0.9——点大小将无法匹配设计规格。
- 对实时计数器保留 AutoSize——隐藏的 CPU 尖峰。
- 世界空间 Canvas 内的世界空间 `TextMeshProUGUI`——额外的重建且无益处；请使用 `TextMeshPro`。
- 忘记在动态回退字体上启用 **Clear Dynamic Data On Build**——编辑器测试字形会随附到播放器中。
- 在编辑器中以开启 Include Font Data 的方式捕获 Memory Profiler，然后惊讶于设备上的构建更小。
- 精灵资产的源纹理设置为 Sprite 类型——移动端加载因额外的子子对象而变慢。

---

## 参考

- TextMeshPro - Atlas Population Mode (Unity Manual): https://docs.unity3d.com/Packages/com.unity.textmeshpro@latest/manual/FontAssets.html
