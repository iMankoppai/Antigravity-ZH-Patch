---
name: figma-generate-design
description: "当任务涉及把应用程序页面、视图或多分节布局翻译到 Figma 时，与 figma-use 一起使用此技能。触发词：'write to Figma'、'create in Figma from code'、'push page to Figma'、'take this app/page and build it in Figma'、'create a screen'、'build a landing page in Figma'、'update the Figma screen to match code'、'convert this modal/dialog/drawer/panel to Figma'。每当用户想从代码或描述在 Figma 中构建或更新完整页面、模态框、对话框、抽屉、侧边栏、面板或任何组合式多分节视图时，这都是首选的工作流技能。它会从 Code Connect 文件、现有屏幕和库搜索中发现设计系统组件、变量和样式，然后导入它们并使用设计系统令牌（而非硬编码值）逐节增量地组装视图。"
disable-model-invocation: false
---

# 从设计系统构建 / 更新屏幕和视图

使用此技能在 Figma 中创建或更新**屏幕、视图和多分节 UI 容器**，做法是**复用已发布的设计系统**——组件、变量和样式——而不是用硬编码值绘制基础图形。这包括完整页面、模态框、对话框、抽屉、侧边栏、面板，以及任何具有多个分节的组合视图。关键洞见：Figma 文件很可能有一个已发布的设计系统，其中的组件、颜色/间距变量和文本/效果样式对应代码库的 UI 组件和令牌。找到并使用它们，而不是用十六进制颜色画盒子。

**强制要求**：在任何 `use_figma` 调用之前，你还必须加载 [figma-use](../figma-use/SKILL.md)。该技能包含适用于你编写的每个脚本的关键规则（颜色范围、字体加载等）。

**在作为此技能一部分调用 `use_figma` 时，务必传入 `skillNames: "figma-generate-design"`。** 这是一个日志参数——它不影响执行。

## HTML-to-Figma 例外

在以下情况下使用 `html_to_figma` 进行初始创建：

- 输入是现有的原始或静态 HTML 文档。直接传给 `html_to_figma`。
- 提示词要求创建新设计，且没有可复现的已渲染 UI 实现。创建一个自包含的 HTML 文档并传给 `html_to_figma`。

如果 `html_to_figma` 不可用，请遵循下面的现有工作流。

## 技能边界

- 当交付物是**组合式 Figma 视图**（新建或更新）——完整页面屏幕、模态框、对话框、抽屉、侧边栏、面板或任何多分节容器——由设计系统组件实例构建时，使用此技能。
- 如果用户想创建**新的可复用组件或变体**，直接使用 [figma-use](../figma-use/SKILL.md)。
- 如果用户想编写 **Code Connect 映射**，切换到 [figma-code-connect](../figma-code-connect/SKILL.md)。

## 前置条件

- 必须连接 Figma MCP 服务器
- 目标 Figma 文件必须有一个带组件的已发布设计系统（或可访问的团队库）
- 用户应提供以下之一：
  - 一个用于工作的 Figma 文件 URL / file key
  - 或关于要针对哪个文件的上下文（智能体可以发现页面）
- 要构建/更新的屏幕/视图的源代码或描述

## 与 generate_figma_design 并行的 Web 应用工作流（仅限 Web 应用）

当从可在浏览器中渲染的 **Web 应用**构建屏幕时，最佳结果来自并行运行两种方法：

1. **并行：**
   - 使用此技能的工作流（use_figma + 设计系统组件）开始构建屏幕
   - 运行 `generate_figma_design` 捕获运行中 Web 应用的像素级精确截图
2. **两者都完成后：** 更新 use_figma 输出以匹配 `generate_figma_design` 捕获的像素级精确布局。捕获提供要达到的精确间距、尺寸和视觉处理，而你的 use_figma 输出具有正确链接到设计系统的组件实例。如果捕获包含图片，从捕获的图像填充中复制 `imageHash` 值，把它们转移到你的 use_figma 输出（详见步骤 5）。
3. **确认看起来不错后：** 删除 `generate_figma_design` 输出——它仅用作视觉参考。

这结合了两者的优点：`generate_figma_design` 给出像素级精确的布局精度，而 use_figma 给出保持链接且可更新的正确设计系统组件实例。

**当源包含图片时，此并行工作流是强制性的。** `use_figma` Plugin API 无法获取外部图片 URL——它只能通过复制文件中已有节点的 `imageHash` 值来设置图像填充。`generate_figma_design` 把所有可见图片栅格化到 Figma 中，提供你需要的哈希。如果存在图片时跳过捕获，图像画框会留空。

对于非 Web 应用（iOS、Android 等）或更新现有屏幕时，使用下面的标准工作流。

## 必需工作流

**按顺序遵循这些步骤。不要跳过步骤。**

> **硬性门禁——禁止的捷径：**
>
> - **禁止：** 在 2a-i 完成且 2a-ii 已尝试或记录为 N/A（例如“空文件，无现有屏幕”）之前，用 `search_design_system` 搜索组件 key。
> - **禁止：** 在下文检查清单中所有步骤 2 行都填好之前，进行任何会改动画布的 `use_figma` 调用（步骤 3+）。

### 步骤 1：理解交付物

在碰 Figma 之前，理解你要构建什么：

1. 如果从代码构建，阅读相关源文件以理解结构、分节以及使用了哪些组件。
2. 识别视图的主要分节（例如页面：页头、主视觉、内容面板、页脚；模态框：标题栏、表单分节、操作栏；侧边栏：导航、内容区、页脚操作）。
3. 对每个分节，列出涉及的 UI 组件（按钮、输入框、卡片、导航胶囊、手风琴等）。
4. **检查视图是否包含任何图片**（例如 `<img>`、`<Image>`、背景图片、产品照片、头像、从 URL 加载的图标）。如果包含且这是 Web 应用，你**必须**运行并行的 `generate_figma_design` 捕获工作流——立即与步骤 2 一起启动，使捕获在你发现组件时运行。见上文“与 generate_figma_design 并行”。

### 步骤 2：收集组件 key、变量和样式

你需要从设计系统获取三样东西：**组件**（按钮、卡片等）、**变量**（颜色、间距、圆角）和**样式**（文本样式、阴影等效果样式）。当存在设计系统令牌时，不要硬编码十六进制颜色或像素值。

#### 2a：发现组件


**2a-i —— 必需：检查所需组件的 Code Connect。** 从步骤 1 构建的组件列表开始，检查每个组件在代码库中是否有 Code Connect 文件。Code Connect 文件位于组件源码旁边，并按平台命名：

- **TypeScript/JS**：`*.figma.ts`、`*.figma.js`
- **React（基于解析器）**：`*.figma.tsx`
- **Kotlin/Compose**：包含 `@FigmaConnect` 的 `.kt` 文件
- **Swift**：包含 `FigmaConnect` 的 `.swift` 文件

对你需要的每个组件（例如 Button、Card、Input），搜索其 Code Connect 文件——按组件名 glob 或 grep（例如 `**/Button.figma.tsx`、`**/Card.figma.ts`）。只读取与你实际需要的组件匹配的文件。

从每个匹配的 Code Connect 文件中提取 Figma 组件 URL。从 URL 解析 `fileKey` 和 `nodeId`（把连字符转换为冒号：`123-456` → `123:456`）。然后用 `use_figma` 解析组件 key：

**示例：** Code Connect 文件包含 `// url=https://figma.com/design/ABC123/File?node-id=609-35535`。解析 `fileKey` = `ABC123`，`nodeId` = `609:35535`。针对**库文件**（fileKey `ABC123`，不是目标文件）运行 `use_figma` 来解析 key：

```js
const node = await figma.getNodeByIdAsync("609:35535");
const set = node?.parent?.type === "COMPONENT_SET" ? node.parent : node;
return { componentKey: set.key };
```

在单次调用中批量进行多个查找。在步骤 4 中用 `importComponentSetByKeyAsync()` 使用返回的 key。

标记已解析的组件。如果所有组件都已解析，跳过 2a-ii 和 2a-iii。如果没有任何所需组件有 Code Connect 文件，继续 2a-ii。

**2a-ii —— 如果仍有未解析组件则必需：检查现有屏幕。** 检查目标文件是否已包含使用相同设计系统的屏幕。一次 `use_figma` 调用遍历现有画框的实例，即可得到精确、权威的组件映射：

```js
const frame = figma.currentPage.findOne(n => n.name === "Existing Screen");
const uniqueSets = new Map();
frame.findAll(n => n.type === "INSTANCE").forEach(inst => {
  const mc = inst.mainComponent;
  const cs = mc?.parent?.type === "COMPONENT_SET" ? mc.parent : null;
  const key = cs ? cs.key : mc?.key;
  const name = cs ? cs.name : mc?.name;
  if (key && !uniqueSets.has(key)) {
    uniqueSets.set(key, { name, key, isSet: !!cs, sampleVariant: mc.name });
  }
});
return [...uniqueSets.values()];
```

把结果与你未解析的组件匹配。标记任何新解析的组件。如果所有组件都已解析，跳过 2a-iii。

**2a-iii —— 最后手段：`search_design_system`。** 仅在完成 2a-i 和 2a-ii 后仍有组件未解析时使用。**广泛搜索**——在一次 `queries` 调用中尝试多个词和同义词作为组件条目（例如 `{ entity: "component", query: "button" }`、`{ entity: "component", query: "input" }`、`{ entity: "component", query: "nav" }` 等）。

**在映射中包含组件属性**——你需要知道每个组件暴露哪些 TEXT 属性以进行文本覆盖。创建一个临时实例，读取其 `componentProperties`（以及嵌套实例的那些），然后移除临时实例。

带属性信息的组件映射示例：

```
Component Map:
- Button → key: "abc123", type: COMPONENT_SET
  Properties: { "Label#2:0": TEXT, "Has Icon#4:64": BOOLEAN }
- PricingCard → key: "ghi789", type: COMPONENT_SET
  Properties: { "Device": VARIANT, "Variant": VARIANT }
  Nested "Text Heading" has: { "Text#2104:5": TEXT }
  Nested "Button" has: { "Label#2:0": TEXT }
```

#### 2b：发现变量（颜色、间距、圆角）

**先检查现有屏幕**（与组件相同）。或使用 `search_design_system`，其 `queries` 条目的 `entity` 为 `"variable"`。

> **警告：两种不同的变量发现方法——不要混淆它们。**
>
> - 使用 `figma.variables.getLocalVariableCollectionsAsync()` 的 `use_figma`——**只返回当前文件中定义的本地变量**。如果返回空，**并不**意味着没有变量。远程/已发布的库变量对该 API 不可见。
> - 使用 `entity: "variable"` 查询条目的 `search_design_system`——搜索**所有已链接的库**，包括远程和已发布的。这是发现设计系统变量的正确工具。
>
> **绝不要仅凭 `getLocalVariableCollectionsAsync()` 返回空就断定“没有变量存在”。** 始终还要运行带变量查询条目的 `search_design_system` 来检查库变量，然后再决定创建自己的。

**查询策略：** `search_design_system` 匹配**变量名称**（例如 "Gray/gray-9"、"core/gray/100"、"space/400"），而不是类别。在一次 `queries` 调用中放入多个简短、简单的查询，而不是一个复合查询：

- **原始颜色：** "gray"、"red"、"blue"、"green"、"white"、"brand"
- **语义颜色：** "background"、"foreground"、"border"、"surface"、"text"
- **间距/尺寸：** "space"、"radius"、"gap"、"padding"

如果初始搜索返回空，尝试更短的片段或不同的命名约定——各库差异很大（"grey" vs "gray"、"spacing" vs "space"、"color/bg" vs "background"）。

检查现有屏幕的绑定变量以获得最权威的结果：

```js
const frame = figma.currentPage.findOne(n => n.name === "Existing Screen");
const varMap = new Map();
frame.findAll(() => true).forEach(node => {
  const bv = node.boundVariables;
  if (!bv) return;
  for (const [prop, binding] of Object.entries(bv)) {
    const bindings = Array.isArray(binding) ? binding : [binding];
    for (const b of bindings) {
      if (b?.id && !varMap.has(b.id)) {
        const v = await figma.variables.getVariableByIdAsync(b.id);
        if (v) varMap.set(b.id, { name: v.name, id: v.id, key: v.key, type: v.resolvedType, remote: v.remote });
      }
    }
  }
});
return [...varMap.values()];
```

对于库变量（remote = true），用 `figma.variables.importVariableByKeyAsync(key)` 按 key 导入它们。对于本地变量，直接使用 `figma.variables.getVariableByIdAsync(id)`。

关于绑定模式，见 [variable-patterns.md](../figma-use/references/variable-patterns.md)。

#### 2c：发现样式（文本样式、效果样式）

用 `search_design_system` 配合 `entity: "style"` 查询条目以及 "heading"、"body"、"shadow"、"elevation" 等词来搜索样式。或检查现有屏幕使用了什么：

```js
const frame = figma.currentPage.findOne(n => n.name === "Existing Screen");
const styles = { text: new Map(), effect: new Map() };
frame.findAll(() => true).forEach(node => {
  if ('textStyleId' in node && node.textStyleId) {
    const s = figma.getStyleById(node.textStyleId);
    if (s) styles.text.set(s.id, { name: s.name, id: s.id, key: s.key });
  }
  if ('effectStyleId' in node && node.effectStyleId) {
    const s = figma.getStyleById(node.effectStyleId);
    if (s) styles.effect.set(s.id, { name: s.name, id: s.id, key: s.key });
  }
});
return {
  textStyles: [...styles.text.values()],
  effectStyles: [...styles.effect.values()]
};
```

用 `figma.importStyleByKeyAsync(key)` 导入库样式，然后用 `node.textStyleId = style.id` 或 `node.effectStyleId = style.id` 应用。

详见 [text-style-patterns.md](../figma-use/references/text-style-patterns.md) 和 [effect-style-patterns.md](../figma-use/references/effect-style-patterns.md)。

### 步骤 3：先用占位符创建包裹画框

**必须使用 $fig** 所有节点创建都使用 `$fig`。API 参考见 [fig-builder.md](../figma-use/references/fig-builder.md)。

**使用占位符，不要一次填满所有分节**——带 `placeholder: true` 的新节点会在计划变更自动刷新后出现在工具调用结果中，例如 `{ created: { '0:3': 'My Screen', '0:4': 'Header Placeholder' }}`

```js
// --- Size the wrapper based on container type ---
// Full page:       { width: 1440, name: "Homepage" }
// Modal/dialog:    { width: 640, name: "Settings Modal" }
// Drawer/sidebar:  { width: 360, name: "Navigation Drawer" }
// Panel:           { width: 400, name: "Details Panel" }
// Adapt width to match the source code's actual dimensions.

$fig.autoLayout(
  {
    name: 'VIEW_NAME',
    layoutMode: 'VERTICAL',
    primaryAxisAlignItems: 'CENTER',
    counterAxisAlignItems: 'CENTER',
    width: WIDTH,
  },
  // Create placeholder sections for the screen
  [
    $fig.autoLayout({ name: 'Header', layoutSizingHorizontal: 'FILL', placeholder: true }),
    $fig.autoLayout({ name: 'Content', layoutSizingHorizontal: 'FILL', placeholder: true }),
    $fig.autoLayout({ name: 'Footer', layoutSizingHorizontal: 'FILL', placeholder: true }),
  ]
)
```

### 步骤 4：在包裹内构建每个分节

**这是最重要的步骤。** 一次构建一个分节，每个放在它自己的 `use_figma` 调用中。每个脚本开始时，按 ID 获取分节占位符并用真实分节替换它。

```js
const header = $fig.get("HEADER_PLACEHOLDER_ID_FROM_STEP_3");

// Import design system components by key
const buttonSet = await figma.importComponentSetByKeyAsync("BUTTON_SET_KEY");
const primaryButton = buttonSet.children.find(c =>
  c.type === "COMPONENT" && c.name.includes("variant=primary")
) || buttonSet.defaultVariant;

// Import design system variables for colors and spacing
const bgColorVar = await figma.variables.importVariableByKeyAsync("BG_COLOR_VAR_KEY");
const spacingVar = await figma.variables.importVariableByKeyAsync("SPACING_VAR_KEY");

const shadowStyle = await figma.importStyleByKeyAsync("SHADOW_STYLE_KEY");

// Replace the placeholder with a real section frame with variable bindings (not hardcoded values)
header.replace(
  $fig.autoLayout(
    {
      name: 'Header',
      layoutSizingHorizontal: 'FILL', // Set to FILL because auto-layout frames default to HUG
      paddingLeft: spacingVar,
      paddingRight: spacingVar,
      fills: [{ type: 'SOLID', color: bgColorVar }],
      effects: shadowStyle,
    },
    [
      $fig.instance(primaryButton)
    ]
  )
).screenshot()
```

在继续前用 `.screenshot()` 验证该分节。仔细查看被裁剪/截断的文本（行高切掉内容）和重叠元素——这些是最常见的问题，且乍看很容易被忽略。

#### 用 setProperties() 覆盖实例文本

组件实例自带占位文本（“Title”、“Heading”、“Button”）。使用你在步骤 2 中发现的组件属性 key，用 `setProperties()` 覆盖它们——这比直接操作 `node.characters` 更可靠。完整模式见 [component-patterns.md](../figma-use/references/component-patterns.md#overriding-text-in-a-component-instance)。

对于暴露自己 TEXT 属性的嵌套实例，在嵌套实例上调用 `setProperties()`：

```js
const nestedHeading = cardInstance.findOne(n => n.type === "INSTANCE" && n.name === "Text Heading");
if (nestedHeading) {
  nestedHeading.setProperties({ "Text#2104:5": "Actual heading from source code" });
}
```

仅对不由任何组件属性管理的文本退回直接使用 `node.characters`。

#### 仔细阅读源码默认值

在把代码组件翻译为 Figma 实例时，检查源代码中组件的默认 prop 值，而不只是显式传入的值。例如 `<Button size="small">Register</Button>` 没有 variant prop——检查组件定义以找到 `variant = "primary"` 作为默认。选择错误的变体（例如 Neutral 而不是 Primary）会产生视觉上不正确的结果，且很容易被忽略。

#### 手动构建 vs 从设计系统导入

| 手动构建 | 从设计系统导入 |
|----------------|--------------------------|
| 包裹画框 | **组件**：按钮、卡片、输入框、导航等 |
| 分节容器画框 | **变量**：颜色（填充、描边）、间距（内边距、间隙）、圆角 |
| 布局网格（行、列） | **文本样式**：标题、正文、说明文字等 |
| | **效果样式**：阴影、模糊等 |

当设计系统变量存在时，**绝不硬编码十六进制颜色或像素间距**。间距/圆角使用 `setBoundVariable`，颜色使用 `setBoundVariableForPaint`。用 `node.textStyleId` 应用文本样式，用 `node.effectStyleId` 应用效果样式。

#### 图标：导入 SVG，绝不从旋转后的基础图形重建

图标是**上面“手动构建 vs 导入”划分的主要例外。** 如果设计系统把图标暴露为组件，就实例化它（通过 `$fig.instance(iconComponent)` 的单个 INSTANCE_SWAP 属性，而不是每个图标一个变体）。否则——最常见的是当**从代码库抓取图标以在 Figma 中放置或替换它**时——把图标的 **SVG 源直接**导入为矢量节点。这是图标的主要、默认路径；不要重绘它们。

1. **从代码库获取 SVG。** 阅读图标的源——内联 `<svg>`、导入的 `.svg` 素材或图标库条目——并传入确切的 SVG 字符串。优先使用代码库自己的 SVG，而不是手工编写。
2. **用 `$fig.svg(svgString, opts?)` 创建它**，它把 SVG 解析为矢量节点树。SVG 字符串**必须**包含 `viewBox` 加上显式的 `width`/`height`（例如 `<svg width="24" height="24" viewBox="0 0 24 24" ...>`）；没有它们时它会回退到 `viewBox` 尺寸，通常比槽位小——“图标没正确设置尺寸”的常见原因。（命令式的 `figma.createNodeFromSvg(svgString)` 也可用，返回一个你可以 `.resize(size, size)` 的 `FrameNode`。）
3. **把它调整到槽位大小。** 通过 SVG 字符串中的 `width`/`height` 匹配源图标的尺寸——常见为 16/20/24px。像任何其他计划节点一样追加它：作为父级 `children` 中的子节点，或 `slot.svg(svgString, opts)`。
4. **绝不从旋转后的线/矩形/椭圆基础图形重建图标。** Figma 的线条旋转在 `use_figma` 上下文中不可靠，会产生损坏、旋转错误图标（人字形塌缩成一团，箭头头部与杆脱离）。导入 SVG 既更可靠又更可编辑。

```js
// Import a codebase icon SVG as a vector, sized to a 24px slot
const chevron = $fig.svg(
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="m9 18 6-6-6-6" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  { name: 'icon/chevron-right' }
);
// include as a child when building a section — e.g. $fig.autoLayout({...}, [ label, chevron ])
// or append onto an existing plan node — e.g. row.svg('<svg .../>', { name: 'icon/chevron-right' })
```

**代码库 SVG 通常使用 `currentColor`**（例如 `stroke="currentColor"` / `fill="currentColor"`），导入后会变成**黑色**——它不继承父级的颜色。导入后设置预期颜色：在导入前把字面颜色替换进 SVG 字符串，或把导入矢量的填充/描边绑定到设计系统颜色变量（用 `setBoundVariableForPaint`，与任何填充一样）。要把导入的 SVG 变成可复用图标组件（用于 INSTANCE_SWAP），见 [figma-generate-library → 创建图标组件](../figma-generate-library/references/component-creation.md#creating-icon-components-for-instance_swap) 和 [INSTANCE_SWAP 模式](../figma-use/references/component-patterns.md#instance_swap-avoiding-variant-explosion)。

### 步骤 5：验证完整视图并转移图片

在组合所有分节后，对包裹画框调用 `get_screenshot` 并与源比较。用有针对性的 `use_figma` 调用修正任何问题——不要重建整个视图。

**对单个分节截图，而不只是完整视图。** 降低分辨率的完整视图截图会掩盖文本截断、错误颜色和尚未覆盖的占位文本。按节点 ID 对每个分节截图以捕捉：
- **被裁剪/截断的文本**——行高或画框尺寸切掉下伸部、上伸部或整行
- **重叠内容**——因尺寸错误或缺少自动布局而元素堆叠
- 仍显示占位文本（“Title”、“Heading”、“Button”）
- 因布局尺寸 bug 而被截断的内容
- 错误的组件变体（例如 Neutral 而不是 Primary 按钮）
- **空白图像占位符**——如果图片缺失，你需要从 `generate_figma_design` 捕获中转移它们（见下文）

#### 从 generate_figma_design 捕获中转移图片

如果你并行运行了 `generate_figma_design`（当源包含图片时强制），把捕获的图片转移到你的设计系统输出：

1. 通过搜索 `type === "IMAGE"` 的填充，在捕获输出中找到所有图像节点：
   ```js
   const capture = await figma.getNodeByIdAsync("CAPTURE_NODE_ID");
   const imageNodes = [];
   capture.findAll(n => {
     if (n.fills && Array.isArray(n.fills)) {
       for (const fill of n.fills) {
         if (fill.type === "IMAGE") {
           imageNodes.push({ name: n.name, id: n.id, imageHash: fill.imageHash });
           return true;
         }
       }
     }
     return false;
   });
   return imageNodes;
   ```
2. 把每张捕获图片与你的 use_figma 输出中对应的画框匹配（按位置、名称或顺序）。
3. 把图像哈希应用到目标画框：
   ```js
   targetFrame.fills = [{ type: "IMAGE", imageHash: "hash_from_capture", scaleMode: "FILL" }];
   ```
4. 所有图片转移后删除 `generate_figma_design` 捕获输出。

#### 生成占位图片

优先复用可用的源、捕获或库图片。如果仍有占位符，告诉用户将生成多少张图片并请求许可，说明生成图片使用 Figma AI 配额。

获得同意后，用目标 `fileKey` 和每个现有占位符的 `nodeId` 调用 `generate_image`。如果没有现有目标节点，省略 `nodeId` 以创建新画框并使用返回的 `nodeId`。

如果 Figma AI 不可用或其 AI 配额已达上限，使用另一个可用的图像生成工具，说明其使用和计费遵循该提供商而非 Figma AI 配额，并取得任何所需的同意。仅用 `upload_assets` 上传这些替代提供商的图片。

### 步骤 6：更新现有视图

当更新而不是从头创建时：

1. 用 `get_metadata` 检查现有屏幕结构。
2. 识别哪些分节需要更新、哪些可以保留。
3. 对每个需要更改的分节：
   - 按 ID 或名称定位现有节点
   - 如果设计系统组件变了，替换组件实例
   - 按需更新文本内容、变体属性或布局
   - 移除已弃用的分节
   - 添加新分节
4. 每次修改后用 `get_screenshot` 验证。

```js
// Example: Swap a button variant in an existing screen
const existingButton = await figma.getNodeByIdAsync("EXISTING_BUTTON_INSTANCE_ID");
if (existingButton && existingButton.type === "INSTANCE") {
  // Import the updated component
  const buttonSet = await figma.importComponentSetByKeyAsync("BUTTON_SET_KEY");
  const newVariant = buttonSet.children.find(c =>
    c.name.includes("variant=primary") && c.name.includes("size=lg")
  ) || buttonSet.defaultVariant;
  existingButton.swapComponent(newVariant);
}
return { success: true, mutatedNodeIds: [existingButton.id] };
```

## 参考文档

关于详细的 API 模式和陷阱，按需从 [figma-use](../figma-use/SKILL.md) 的参考中加载这些：

- [component-patterns.md](../figma-use/references/component-patterns.md) —— 按 key 导入、查找变体、setProperties、文本覆盖、使用实例
- [variable-patterns.md](../figma-use/references/variable-patterns.md) —— 创建/绑定变量、导入库变量、作用域、别名、发现现有变量
- [text-style-patterns.md](../figma-use/references/text-style-patterns.md) —— 创建/应用文本样式、导入库文本样式、字号阶梯
- [effect-style-patterns.md](../figma-use/references/effect-style-patterns.md) —— 创建/应用效果样式（阴影）、导入库效果样式
- [gotchas.md](../figma-use/references/gotchas.md) —— 布局陷阱（HUG/FILL 交互、counterAxisAlignItems、尺寸设置顺序）、填充/颜色问题、页面上下文重置

## 错误恢复

遵循 [figma-use](../figma-use/SKILL.md#6-error-recovery--self-correction) 的错误恢复流程：

1. 出错时**停止**——不要立即重试。
2. **仔细阅读错误消息**以理解出了什么问题。
3. 如果错误不清楚，调用 `get_metadata` 或 `get_screenshot` 检查当前文件状态。
4. 根据错误消息**修正脚本**。
5. **重试**修正后的脚本——这是安全的，因为失败的脚本是原子的（脚本出错时不会创建任何东西）。

由于此技能增量式工作（每次调用一个分节），错误自然限定在单个分节。先前成功调用的分节保持完整。

## 最佳实践

- **构建前始终先搜索。** 设计系统很可能有你需要的组件、变量或样式。手动构建和硬编码值应是例外，而不是规则。
- **广泛搜索。** 把同义词和部分词作为 `{ entity, query }` 条目放入一次 `queries` 调用。一个“NavigationPill”可能在“pill”、“nav”、“tab”或“chip”下被找到，所以把它们作为组件条目传入。对于变量，使用 `entity: "variable"` 配合 "color"、"spacing"、"radius" 等查询。
- **优先使用设计系统令牌而非硬编码值。** 对颜色、间距和圆角使用变量绑定。对排版使用文本样式。对阴影使用效果样式。这使屏幕保持链接到设计系统。
- **优先使用组件实例而非手动构建。** 实例保持链接到源组件，并在设计系统演进时自动更新。
- **所有节点创建必须使用 $fig。** 不要使用 `figma.createFrame()`、`figma.createText()` 等。使用 `$fig.autoLayout()`、`$fig.text()`、`$fig.rectangle()` 等。
- **除非有充分理由，否则使用自动布局。** 自动布局是最可靠的节点布局方式。你不应使用自动布局的唯一理由是当被要求不用，或周围内容不使用它。
- **逐节工作。** 每次 `use_figma` 调用绝不要构建超过一个主要分节。
- **每个分节后进行视觉验证。** 在节点上调用 `.screenshot()` 以尽早发现问题。
- **匹配现有约定。** 如果文件已有屏幕，匹配它们的命名、尺寸和布局模式。
