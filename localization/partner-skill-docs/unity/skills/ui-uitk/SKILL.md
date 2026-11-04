---
name: ui-uitk
description: 理解、编辑并生成使用 flex 布局的 Unity UI Toolkit UXML 和 USS。用于涉及 UI Toolkit、UIElements、UIDocument、PanelSettings、自定义元素或 UI 运行时绑定的请求。
---

理解现有 Unity UI Toolkit 代码、进行针对性编辑、生成新的 UXML/USS 文件、Manipulator，并处理 UI 运行时绑定。

## 参考

按需阅读以下内容：
- [references/uss-guide.md](references/uss-guide.md) —— USS 模式和示例
- [references/svg-icons.md](references/svg-icons.md) —— SVG 图标生成（仅在生成图标时）
- [references/common-issues.md](references/common-issues.md) —— 要避免的常见错误
- [references/ui-runtime-binding.md](references/ui-runtime-binding.md) —— 在运行时将数据绑定到 UI 的模式和指南（仅在要求或涉及绑定时）
- [references/painter2d.md](references/painter2d.md) —— 用于自定义视觉效果的 Painter2D API：渐变、形状、弧线、程序化绘制（只要需要渐变、自定义形状、进度环、程序化绘制或任何超出 USS 表达能力的视觉效果时就阅读此文件）
- [references/pointermanipulator-guide.md](references/pointermanipulator-guide.md) —— 创建和使用 Manipulator 的模式和指南（仅在要求或涉及 Manipulator 时）。这有助于为 Visual Element 设置拖放功能或简单的事件处理。
- [references/custom-elements.md](references/custom-elements.md) —— 自定义 UI Element 模式以及使用 UXML、USS 和 C# 创建可复用组件的指南。这有助于创建可在项目间复用的复杂 UI 组件。

路径相对于本技能文件夹——直接读取 `references/uss-guide.md`。

## 理解

在解释 UI 结构时，使用此格式：
```
[ElementType] name="elementName" class="class1 class2"
├── [ChildType] name="childName"
│   └── [GrandchildType]
└── [ChildType] class="another-class"
```

## 编辑

**常见编辑请求：**

| 请求 | 操作 |
|---------|--------|
| "Change button color" | 编辑该按钮的 USS 选择器 |
| "Add a label here" | 在指定位置向 UXML 添加元素 |
| "Make this bigger" | 在 USS 中编辑宽度/高度 |
| "Hide this element" | 在 USS 中添加 `display: none` 或从 UXML 中移除 |
| "Rename this element" | 更新 UXML 中的 `name` 属性 |

**不要过度编辑：**
- 只更改所请求的内容
- 保留格式和结构
- 不要“改进”无关代码
- 除非要求，否则不要添加注释
- 对于针对性更改，优先修改特定元素或选择器而非重写整个文件——但要运用判断力；如果更改涉及文件的大部分，重写可能更干净
- 编辑时注意不要意外丢弃现有元素、样式或引用
- **编辑 USS 时**，专注于与请求相关的属性和选择器——避免不必要的重组，但如果更改确实需要，则进行重构

## 验证

无法从编辑器外部验证 UXML 或 USS——Unity 在导入时解析这些
文件，并在 Console 中报告问题。写入文件，然后让
用户检查结果。

**工作流：**

1. 将完整文件写入其在项目中的目标路径。不要写入部分或
   草稿内容——半写的 UXML 文件在编辑器拾取它的那一刻就是解析错误。
2. 请用户让 Unity 编辑器获得焦点。这会触发对已更改
   资产的重新导入。
3. 请他们报告 Console 中的任何内容。UXML 解析错误会指明文件和
   行号；USS 问题会显示为关于未知属性或选择器的警告。
4. 修复他们报告的内容并从步骤 1 重复。

**由于反馈需要用户一次往返，务必第一次就做对：**

- 在请用户检查之前完成所有文件，这样一次重新导入覆盖所有内容，
  而不是每个文件一次。
- 在写入之前重新阅读 `references/uss-guide.md` 和 `references/common-issues.md`，
  而不是在错误返回之后。
- 注意那些通过解析但渲染错误的错误——它们根本不会出现在
  Console 中，因此用户必须亲自查看 UI。`references/common-issues.md`
  列出了它们。

## 生成

在创建新 UI 时：

**只生成所请求的内容：**

| 请求 | 输出 |
|---------|--------|
| 仅 USS | 仅 `.uss` 文件 |
| 仅 UXML | 仅 `.uxml` 文件 |
| UI 界面 / 菜单 / 面板 | 仅 `.uss` + `.uxml` |
| "with code" / "with logic" / "functional" | `.uss` + `.uxml` + `.cs` |

**这些并不意味着 C#：**
- "proper buttons" → 样式良好的 Button 元素
- "currency display" → 一个 Label 元素
- "working UI" → 能正确渲染的有效 UXML/USS
- "inventory screen" → 仅视觉布局
- "inventory system" / "equipment system" / "crafting system" → 询问："Should items be draggable?" 如果答案为是，请参阅 `references/pointermanipulator-guide.md` 获取模式

**生成工作流：**
1. **分析** —— 精确确定需要哪些文件。不要多余的。
2. **搜索** —— 查找现有 USS、UXML、资产。不要假设路径。
3. **遵循项目模式** —— 匹配文件夹结构和命名约定。
4. **复用** —— 检查共享样式表。适当时复用。
5. **先写 USS** —— 对照下面的限制进行验证。
6. **写 UXML** —— 引用 USS，验证结构。
7. **完整写出文件** —— 绝不要部分内容；关于错误如何返回以及为什么一轮文件胜过
   几轮，请参见上面的验证。
8. **场景设置** —— 如果向场景添加 UI，则分配 PanelSettings。
9. **数据绑定** —— 如果要求，添加带运行时数据绑定模式的 C# 脚本（参见 `references/ui-runtime-binding.md`）。如有需要，生成 scriptable object 资产。在 UXML 中或通过 C# 中的数据源将该资产分配给 UI 元素根。

**颜色、可见性和规格规则：**
- **确保文本默认可读：** 选择颜色时，确保文本与其背景形成对比——但要尊重有意的低对比度用途（禁用状态、占位符文本、装饰元素）。使用设计令牌时，检查文本和背景变量是否提供足够的对比度。
- **遵循确切值：** 用户指定的十六进制颜色、像素尺寸、间距——完全按给定值使用。不要近似或替换。

**样式 / 主题**
在为 UI 设置样式或调整主题时，确保不仅应用于当前 UXML 中的元素，也应用于 UI Toolkit 的核心元素，这些元素通常由若干子元素组成。

## 约定

**优先遵循项目模式。** 在应用默认值之前先搜索现有文件。

| 类型 | 约定 | 好 | 差 |
|------|------------|------|-----|
| `name` 属性 | camelCase | `submitButton` | `submit-button` |
| `class` 属性 / USS | kebab-case | `.submit-button` | `.submitButton` |
| 文件路径 | 功能文件夹 | `Assets/UI/Inventory/` | `Assets/Scripts/UI/` |

**输出格式：**
```uxml Filename.uxml
<ui:UXML>...</ui:UXML>
```
```uss Filename.uss
.class { ... }
```

## USS 限制

Unity 的 USS 是 CSS 的子集。这些属性**不**存在——绝不使用它们：

| 绝不使用 | 改用 |
|-----------|-------------|
| `border` 简写 | 分别使用 `border-width`、`border-color` |
| `gap` | 子元素上的 `margin` |
| `z-index` | DOM 顺序或父级嵌套 |
| `pointer-events` | `picking-mode` UXML 属性 |
| `filter` | 不支持 |
| `outline` | `border-*` 属性 |
| `box-shadow` | 嵌套元素或背景图像 |
| `:first-child`、`:last-child`、`:nth-child` | 显式类 |
| `[attribute]` 选择器 | 显式类 |
| `transition-property: <value>` | 完全省略，或仅 `none`/`initial`/`inherit` |
| `linear-gradient()`、`radial-gradient()` | 使用带 Painter2D 的自定义 `VisualElement`（参见 `references/painter2d.md`） |

**内联样式：** 绝不要在 UXML 中使用 `style="..."`。所有样式仅在 USS 中。

**外部 URL：** 绝不要使用带外部路径的 `url()`。仅 `url("project://database/Assets/...")`。

**优先使用弹性布局而非硬编码尺寸：**
- 使用 `flex-grow`、`flex-shrink` 或 `%`，而不是固定的 `width`/`height` 值
- 让元素自然流动并受其父容器约束
- 仅在根容器上或确实需要固定尺寸时设置显式像素尺寸
- 子元素应适应可用空间，而不是定义自己的尺寸

## USS 简洁性

- 无默认值（`flex-direction: column` 是默认值）
- 无默认字体
- 无冗余约束（`width: 100px` 不需要 `min-width`/`max-width`）
- 无重叠属性（`flex: 1` 已设置 grow/shrink）
- 使用能起作用的最简单选择器
- 绝不重复选择器

## UXML

每个文件必须：
1. 声明命名空间：`<ui:UXML xmlns:ui="UnityEngine.UIElements">`
2. 链接样式表：`<ui:Style src="Screen.uss" />`
3. 恰好有一个顶层容器
4. **没有 `style="..."` 属性**——仅使用 USS

```uxml
<ui:UXML xmlns:ui="UnityEngine.UIElements">
  <ui:Style src="Panel.uss" />
  <ui:VisualElement name="root" class="panel">
    <!-- content -->
  </ui:VisualElement>
</ui:UXML>
```

## 事件与交互性
- 使用 Pointer Manipulator 在 VisualElement 上处理事件和交互（参见 `references/pointermanipulator-guide.md`）
- 如果请求拖放，则编写一个 pointer Manipulator，并在 UXML 中或通过 C# 将其附加到相关的 Visual Element。
- 对于简单的点击事件，你可以在 UXML 中使用 `clickable` manipulator
- 对于更高级的交互，在 C# 中创建更传统的事件回调并按需将它们附加到元素

**对于物品栏和制作系统：**
- 当用户请求 "inventory system"、"equipment system" 或 "crafting system" 时，明确询问："Should players be able to drag and drop items?"
- 如果答案为是，阅读 `references/pointermanipulator-guide.md` 以获取物品栏/制作专用模式
- 如果答案为否或不清楚，仅创建静态布局

## 资产

**不要引用 `UnityDefaultRuntimeTheme.tss`** 或 Unity 的内置主题图标。

**图标优先级：**
1. 复用现有项目图标
2. 生成 SVG（参见 `references/svg-icons.md`）
3. 图像生成器（最后手段）

**引用格式：**
```uss
background-image: url("project://database/Assets/UI/Textures/icon.png");
```

## 场景设置

**PanelSettings 是必需的**——没有它 UI 不会渲染。

1. 搜索现有 PanelSettings 资产
2. 如果没有，创建通用版本：`Assets/UI/PanelSettings.asset`
3. 分配给 UIDocument 的 `Panel Settings` 字段

编辑器 UI（EditorWindow、PropertyDrawer）跳过此步骤。

## C#（仅在要求时）

- 通过 USS 类设置样式（`AddToClassList()`）——绝不要使用 `element.style.*`，因为内联样式比 USS 选择器具有更高的优先级，使它们无法通过样式表覆盖，并增加每个元素的内存开销
- UITK 使用 TextCore 文本资产——使用 `FontAsset`、`TextStyleSheet` 和 `TextSettings`，而不是它们的 TextMeshPro 等价物（`TMP_FontAsset` 等）
- 将脚本放在与 UXML/USS 相同的文件夹中
