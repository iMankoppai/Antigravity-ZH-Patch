---
name: ui-ugui
description: 理解、编辑并生成 Unity uGUI Canvas 层级、RectTransform、Layout Group 和预制体 UI。用于涉及 Canvas、uGUI、RectTransform 或预制体 UI 文件的请求。
---

理解现有 Unity uGUI、进行针对性编辑，并生成新的基于 Canvas 的层级。

处理 ScrollRect/ScrollView 时，请阅读参考文件：
- [references/scrollview-setup.md](references/scrollview-setup.md) —— 所需的层级、设置规则和常见失败

## 范围

确定用户在要求什么：

| 请求类型 | 操作 |
|--------------|--------|
| 关于 UI 的问题 | **理解** —— 分析层级，解释结构 |
| 更改特定元素 | **编辑** —— 仅做针对性修改 |
| 创建新 UI | **生成** —— 创建新层级 |
| 修复/改进现有 UI | **编辑** —— 修改现有内容，不要重建 |

**只生成所请求的内容：**

| 请求 | 输出 |
|---------|--------|
| UI 布局 | 仅预制体或场景层级 |
| "with code" / "with logic" / "functional" | 层级 + 脚本 |

**这些并不意味着脚本：**
- "proper buttons" → 配置良好的 Button 组件
- "working UI" → 能正确渲染的有效层级
- "menu screen" → 仅视觉布局

## 关键规则

**命名空间消歧：**
- 创建或引用 UI 组件时始终使用完全限定的类型名称
- `UnityEngine.UI.Image`，而非 `Image`
- `UnityEngine.UI.Button`，而非 `Button`
- 项目中的其他命名空间可能导致类型歧义错误

**修改前验证：**
- 在做出更改之前始终检查当前存在的内容
- 在添加子对象之前确认父对象存在
- 在修改属性之前验证组件存在
- 绝不要假设层级状态——先查询它

**增量修复优于重建：**
- 修复问题时，进行针对性更正
- 绝不要为了修复问题而销毁并重建整个层级——销毁的对象会导致空引用级联
- 优先识别具体的损坏属性并只修复它，而非重写大部分内容
- **当修复失败时，先还原更改**再尝试替代方法

**一次一个更改：**
- 进行单个更改，然后验证结果
- 不要批量执行多个无关修改
- 编辑特定元素时注意不要无意中修改或移除相邻元素
- 如果某件事失败，先理解原因再尝试替代方案
- 避免同时进行多个更改的“霰弹枪调试”

**颜色和可见性：**
- **确保文本默认可读：** 选择颜色时，确保文本与其背景形成对比——但要尊重有意的低对比度用途（禁用状态、占位符文本、装饰元素）
- **检查新元素的可见性：** 创建 UI 元素后，验证它们具有非零尺寸且在父边界内。有意创建为隐藏的元素（供后续切换、动画等）是可以的

**规格遵循：**
- **精确遵循用户规格：** 当用户提供像素尺寸、十六进制颜色、位置、间距或其他确切值时，精确应用它们——不要近似或替换
- **尽量减少无关更改：** 编辑时，避免更改用户未询问的属性，除非为修复生效需要相关调整

## 约定

**优先遵循项目模式。** 在应用默认值之前先搜索现有文件。

| 类型 | 约定 | 好 | 差 |
|------|------------|------|-----|
| GameObject 名称 | PascalCase | `SubmitButton` | `submit-button` |
| 预制体路径 | 功能文件夹 | `Assets/UI/Inventory/` | `Assets/Prefabs/UI/` |

## 工作流

1. **验证状态** —— 在任何操作之前检查场景/层级中已存在的内容。
2. **分析** —— 精确确定需要什么。不要多余的。
3. **搜索** —— 查找现有预制体、Canvas、资产。不要假设路径。
4. **遵循项目模式** —— 匹配文件夹结构和命名。
5. **创建或编辑** —— 使用正确的锚点构建结构，或进行针对性编辑。
6. **确认结果** —— 在继续之前验证更改生效。

## Canvas 设置

每个 UI 都需要一个 Canvas：

```
Canvas (Screen Space - Overlay or Camera)
├── CanvasScaler (Scale With Screen Size recommended)
├── GraphicRaycaster
└── [UI Content]
```

**CanvasScaler 设置：**
- 默认使用 UI Scale Mode "Scale With Screen Size"，除非项目有特定理由使用 "Constant Pixel Size"（例如像素艺术、固定分辨率目标）
- Reference Resolution：匹配项目标准（例如 1920x1080）
- 使用 Screen Space - Camera 创建 Canvas 时，先**读取相机的参考分辨率**
- Match Width Or Height：0.5（平衡）
- 如果现有 Canvas 使用 "Constant Pixel Size"，请指出并在更改前询问用户
- 布局优先使用锚点和 Layout Group，而非绝对像素位置

## 布局组件

**Layout Group 控制子对象尺寸：**
- 当父对象有 Layout Group 时，它管理子 RectTransform
- 子对象的锚点和 sizeDelta 可能被父对象覆盖
- 在设置值之前理解是父对象还是子对象控制尺寸

**垂直/水平 Layout Group：**
- Control Child Size：确定父对象是否设置子对象尺寸
- Child Force Expand：确定子对象是否拉伸以填充空间
- 如果 Control Child Size 关闭，子对象必须有显式尺寸

**避免布局冲突：**
- 当父对象控制它们时，不要手动设置子对象锚点/size
- 不要向应具有固定尺寸的元素添加 Layout Group
- 嵌套的 Layout Group 需要仔细配置每一层
- 当布局错误时，在修改子对象之前先检查父对象设置
- ContentSizeFitter 与启用 Control Child Size 的 Layout Group 位于**同一**对象上 = 冲突
- ContentSizeFitter 位于其父对象启用了 Control Child Size 的子对象上 = ContentSizeFitter 被覆盖（浪费）
- 当 ContentSizeFitter 与 Layout Group 父对象一起使用时，在相关轴上禁用父对象的 Control Child Size
- 常见模式：ScrollView Content 应具有 ContentSizeFitter + VerticalLayoutGroup，其中 VLG 控制子对象，而 ContentSizeFitter 调整 Content 本身的尺寸

**Grid Layout Group：**
- 用于物品栏网格、卡片布局
- Cell Size 必须显式设置——子对象会调整尺寸以匹配
- Constraint 控制行/列限制

**Content Size Fitter：**
- Horizontal/Vertical Fit：Preferred Size
- 用于应调整尺寸以适应其内容的容器
- 需要布局元素或文本组件来提供首选尺寸

## RectTransform 锚定

**元素必须具有非零尺寸才能可见：**
- 通过 sizeDelta 设置显式宽度/高度，或
- 使用具有正确偏移的拉伸锚点，或
- 让父对象 Layout Group 控制尺寸（启用 Control Child Size）

**锚点配置顺序：**
1. 先设置锚点预设（角、边或拉伸）
2. 然后设置位置/偏移值
3. 验证结果尺寸非零

**常见模式：**
- **拉伸锚点** —— 用于填充可用空间的响应式元素
- **角锚点** —— 用于固定位置、固定尺寸的元素
- **边锚点** —— 用于仅在一个方向拉伸的元素

**根据自然语言描述定位：**
当用户描述位置时（例如 "top right"、"bottom bar"、"left side"）：
1. 确定它是**角**（固定点）、**边**（沿一个轴拉伸）还是**填充**（两个轴都拉伸）
2. 设置 anchor min 和 anchor max——对于角它们是同一点；对于边/填充它们跨越一个范围
3. **设置 pivot 以匹配锚点**——pivot 必须与元素锚定的位置对齐，而不是保留默认值 (0.5, 0.5)。一个 "top right" 元素需要 pivot 在右上角；一个 "top bar" 需要 pivot 在顶部边缘中心
4. 在锚点和 pivot 配置**之后**设置位置/偏移值

**可见性清单：**
- 宽度和高度都大于零
- 元素在父边界内
- 元素未被同级遮挡（检查层级顺序）
- Image 组件有精灵或 alpha > 0 的颜色

## 常见组件

| 组件 | 使用场景 |
|-----------|----------|
| `Image` | 背景、图标 |
| `RawImage` | 渲染纹理、视频 |
| `Text (TMP)` | 所有文本（使用 TextMeshPro） |
| `Button` | 可点击元素 |
| `Toggle` | 复选框、单选按钮 |
| `Slider` | 值范围 |
| `ScrollRect` | 可滚动内容 |
| `InputField (TMP)` | 文本输入 |

## 最佳实践

- 所有文本使用 TextMeshPro（而非旧版 Text）
- 带文本的 WorldSpace UI 也应使用 Text Mesh Pro，务必查看项目，如果项目中不存在 TMP essentials 则导入它们
- 如果导入了 TextMeshPro Essentials，务必在资产导入后关闭 TMP Importer 窗口和 Import Unity Package 窗口
- 逻辑地组织层级（Header、Content、Footer）
- 尽可能使用 Layout Group 而非手动定位
- 在非交互图像上设置 Raycast Target = false
- 使用精灵图集以提升性能

**永远不要使用** `EditorApplication.ExecuteMenuItem("Window/TextMeshPro/Import TMP Essential Resources")`，除非用户要求交互式 TMP Essentials 安装。它会打开一个模态对话框，阻塞调用它的任何内容，直到有人关闭它。

**不要使用** `AssetDatabase.ImportPackage()` 处理 TMP 资源，`TMP_PackageResourceImporter.ImportResources()` 才是规范的非交互式 API。

## 交互就绪

在完成任何包含交互元素的 UI 之前，请验证：

1. 场景中必须存在 **EventSystem**（恰好一个）
2. **GraphicRaycaster** 必须位于 Canvas 上
3. 交互元素上 **Raycast Target = true**（非交互元素上为 false 以避免阻挡）
4. **Button.onClick 应已接线**（通过检视面板或脚本）——仅在要求脚本或逻辑时

如果前三项缺失，交互元素将在视觉上存在但静默失败。

## 理解

当用户询问关于现有 UI 的问题时：

**先阅读层级。** 不要假设——回答之前始终检查场景或预制体。

**分析结构：**
- 识别 Canvas 及其渲染模式
- 映射父子关系
- 识别哪些 Layout Group 控制哪些子对象
- 检查 RectTransform 锚点配置

**回答关于以下内容的问题：**
- "What does this button do?" → 解释组件、层级位置、事件接线
- "How is this laid out?" → 描述 Layout Group、锚定、层级
- "Why is this invisible?" → 检查尺寸、锚点、父边界、组件状态
- "What controls this element's size?" → 追踪 Layout Group 设置或锚点

## 编辑

对于现有 UI 的针对性更改：

**编辑前阅读。** 始终先检查当前状态。

**编辑工作流：**
1. 验证目标对象存在
2. 识别要更改的特定属性或组件
3. 进行所需的最小更改
4. 在继续之前验证结果

**绝不要为修复而销毁：**
- 销毁对象会级联到其他位置的空引用
- 就地修复属性，而非重新创建
- 如果必须移除某个元素，请先更新所有引用

## C#（仅在要求时）

- 使用完全限定的 UI 类型以避免命名空间冲突
- 使用 `[SerializeField]` 用于检视面板引用
- 在 Awake() 中缓存组件引用
- 使用事件/委托用于按钮回调
- 将脚本放在与预制体相同的文件夹中（遵循项目模式）

**组件引用：**
- 在访问引用的对象之前验证它们存在
- 处理序列化引用可能为 null 的情况
- 接线引用时，确认目标组件存在

## 错误恢复

当出问题时：

**停止并诊断：**
- 识别确切的错误或症状
- 在尝试修复之前确定根本原因
- 不要做推测性更改

**增量修复：**
- 一次解决一个问题
- 在进入下一个之前验证每个修复
- 记录更改了什么

**避免破坏性模式：**
- “从头开始”的策略会连同损坏的元素一起销毁可用的元素
- 重建整个层级制造的问题比解决的更多
- 优先外科式修复而非整体替换

**当卡住时：**
- 重新验证层级的当前状态
- 检查之前的更改是否实际应用
- 考虑是否方法本身有误而非实现有误
