---
name: figma-generate-design
description: "当任务涉及把应用程序页面、视图或多分节布局翻译到 Figma 时，与 figma-use 一起使用此技能。触发词：'write to Figma'、'create in Figma from code'、'push page to Figma'、'take this app/page and build it in Figma'、'create a screen'、'build a landing page in Figma'、'update the Figma screen to match code'、'convert this modal/dialog/drawer/panel to Figma'。每当用户想从代码或描述在 Figma 中构建或更新完整页面、模态框、对话框、抽屉、侧边栏、面板、表单、仪表盘、列表、表格、卡片、页头、消息预览或其他组合式产品 UI 时——即使用户把该组合式 UI 称为组件——这都是首选的工作流技能。它会从 Code Connect 文件、现有屏幕和库搜索中发现设计系统组件、变量和样式，然后导入它们并使用设计系统令牌（而非硬编码值）逐节增量地组装视图。"
disable-model-invocation: false
---
# 从设计系统构建 / 更新屏幕和视图
**硬性交付门槛：** 代码到设计的输出必须把 UI 重建为可编辑的文本、组件、图标和层级。
任何完整 UI 的截图或扁平化渲染只能视为视觉参考：绝不要把它上传或导入到交付物中，包括作为包裹的填充或子节点，即使它存在于代码仓库中或看起来更像素级精确。完成前检查结果；如果 UI 主要不是由可编辑图层表示，请以语义方式重建或报告失败。

使用此技能在 Figma 中创建或更新**屏幕、视图和多分节 UI 容器**，做法是**复用已发布的设计系统**——组件、变量和样式——而不是用硬编码值绘制基础图形。这包括完整页面、模态框、对话框、抽屉、侧边栏、面板，以及任何具有多个分节的组合视图。关键洞见：Figma 文件很可能有一个已发布的设计系统，其中的组件、颜色/间距变量和文本/效果样式对应代码库的 UI 组件和令牌。找到并使用它们，而不是用十六进制颜色画盒子。

**强制要求**：在任何 `use_figma` 调用之前，你还必须加载 [figma-use](../figma-use/SKILL.md)。该技能包含适用于你编写的每个脚本的关键规则（颜色范围、字体加载等）。

在可用时，在读取或编辑文件之前调用 `create_session` 并传入 `fileKey` 和 `description`（如需要先创建文件），然后把返回的 `sessionId` 原样传给每个接受它的调用，包括后续调用和跨文件的工作。

**在作为此技能一部分调用 `use_figma` 时，务必在逗号分隔的 `skillNames` 参数中包含 `figma-generate-design`。如果本技能是通过 MCP 资源加载的，你必须在名称前加上 `resource:` 前缀（例如 `resource:figma-generate-design`）。** 这是一个日志参数——它不影响执行。

## HTML-to-Figma 例外

在以下情况下使用 `html_to_figma` 进行初始创建：

- 输入是现有的原始或静态 HTML 文档。直接传给 `html_to_figma`。
- 提示词要求创建新设计，且没有可复现的已渲染 UI 实现。创建一个自包含的 HTML 文档并传给 `html_to_figma`。

如果 `html_to_figma` 不可用，请遵循下面的现有工作流。

## 技能边界

- 当交付物是**组合式 Figma 视图**（新建或更新）——包括表单、仪表盘、列表、表格、卡片、页头、面板、对话框、消息预览或其他多分节容器——由设计系统组件实例构建时，使用此技能。即使用户把该组合视图称为组件，这也适用。
- 如果主要交付物是用于变体、令牌或发布的**可复用库基础件或基础**，改用 [figma-generate-library](../figma-generate-library/SKILL.md) 配合 [figma-use](../figma-use/SKILL.md)。
- 如果用户想编写 **Code Connect 映射**，切换到 [figma-code-connect](../figma-code-connect/SKILL.md)。

## 前置条件

- 必须连接 Figma MCP 服务器
- 目标 Figma 文件必须有一个带组件的已发布设计系统（或可访问的团队库）
- 用户必须提供目标 Figma 文件（URL 或 `fileKey`）。如果还没有，先调用 `/figma-create-new-file`（或调用 `create_new_file`）并复用返回的 file_key。`use_figma` 和 `generate_figma_design` 都需要一个已存在的 `fileKey`。
- 要构建/更新的屏幕/视图的源代码或描述

## 与 generate_figma_design 并行的 Web 应用工作流（仅限 Web 应用）

当从可在浏览器中渲染的 **Web 应用**构建屏幕时，最佳结果来自并行运行两种方法：

1. **并行：**
   - 使用此技能的工作流（use_figma + 设计系统组件）针对目标 Figma 文件（`fileKey`）开始构建屏幕。
   - 针对**同一个 `fileKey`** 运行 `generate_figma_design`，把运行中 Web 应用的像素级精确截图捕获到该文件。`generate_figma_design` 始终需要 `fileKey`——如果用户还没有 Figma 文件，先调用 `/figma-create-new-file`（或调用 `create_new_file` MCP 工具）获取一个，并为该技能和截图复用同一个 file_key。
2. **两者都完成后：** 更新 use_figma 输出以匹配 `generate_figma_design` 捕获的像素级精确布局。捕获提供要达到的精确间距、尺寸和视觉处理，而你的 use_figma 输出具有正确链接到设计系统的组件实例。如果捕获包含图片，从捕获的图像填充中复制 `imageHash` 值，把它们转移到你的 use_figma 输出（详见步骤 5）。
3. **确认看起来不错后：** 删除 `generate_figma_design` 输出——它仅用作视觉参考。

这结合了两者的优点：`generate_figma_design` 给出像素级精确的布局精度，而 use_figma 给出保持链接且可更新的正确设计系统组件实例。

**当源包含应用使用的离散内容图片（如照片、头像、标志或图标）时，此并行工作流是强制性的。完整 UI 的截图或扁平化渲染是视觉参考，不是内容图片。** `use_figma` Plugin API 无法获取外部图片 URL——它只能通过复制文件中已有节点的 `imageHash` 值来设置图像填充。`generate_figma_design` 把所有可见图片栅格化到 Figma 中，提供你需要的哈希。如果存在这些内容图片时跳过捕获，它们的图像画框会留空。

对于非 Web 应用（iOS、Android 等）或更新现有屏幕时，使用下面的标准工作流。

## 必需工作流

**按顺序遵循这些步骤。不要跳过步骤。**

> **必需的不变量：**
>
> - 在改动交付物之前完成 Code Connect 发现并选定目标库。仅发现的导入和临时实例是允许的；立即移除临时实例。
> - 在导入每个选定素材的地方应用它。如果某个导入失败，在构建手动后备之前尝试下一个适用的精确结果。

### 步骤 1：理解交付物

在碰 Figma 之前，理解你要构建什么：

1. 如果从代码构建，阅读相关源文件以理解结构、分节以及使用了哪些组件。
2. 识别视图的主要分节（例如页面：页头、主视觉、内容面板、页脚；模态框：标题栏、表单分节、操作栏；侧边栏：导航、内容区、页脚操作）。
3. 对每个分节，列出涉及的 UI 组件（按钮、输入框、卡片、导航胶囊、手风琴等）。
4. **从源识别产品的字族。不要默认使用 Inter。** 在编写任何脚本之前找出产品*使用*哪种字体。见 [references/discover-product-font.md](references/discover-product-font.md) 了解去哪里找（CSS 变量、组件文件）以及如何解析杂乱的 Figma 字体名称。
5. **检查视图是否包含任何图片**（例如 `<img>`、`<Image>`、背景图片、产品照片、头像、从 URL 加载的图标）。如果包含且这是 Web 应用，你**必须**运行并行的 `generate_figma_design` 捕获工作流——立即与步骤 2 一起启动，使捕获在你发现组件时运行。见上文“与 generate_figma_design 并行的 Web 应用工作流”。

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
if (set?.type === "COMPONENT_SET") {
  return { assetType: "component_set", componentSetKey: set.key };
}
if (set?.type === "COMPONENT") {
  return { assetType: "component", componentKey: set.key };
}
throw new Error("Expected a component or component set");
```

在单次调用中批量进行多个查找。根据步骤 4 中每个条目的 `assetType`，用 `importComponentByKeyAsync()` 或 `importComponentSetByKeyAsync()` 使用返回的 key。

标记已解析的组件并继续处理未解析的组件。

**2a-ii —— 必需：选择库范围，然后搜索并检查整个视图。** 调用 `get_libraries`。如果用户指定了一个或多个库，使用它们的精确 key，无论它们出现在 `libraries_added_to_file` 还是 `libraries_available_to_add` 中。否则在 `libraries_added_to_file` 中的所有库一起搜索。在每次搜索时把选定的 key 传入 `includeLibraryKeys`。仅当未解析的缺口没有合适匹配时，才从 `libraries_available_to_add` 添加具体相关的库并重试那些未解析查询；不要扩大到不相关的可用库。在第一次批量 `search_design_system` 调用中，除了针对已从源码或 Code Connect 检查中得知的未解析项的查询外，包含一个针对所请求视图或流程的组件查询。用用途和容器命名整个视图查询（例如 `billing settings drawer`）。检查最强的候选。如果它覆盖两个或更多请求的分节，将其选为地基；否则不采用整体视图复合继续。

**2a-iii —— 检查现有屏幕。** 检查目标文件是否已包含使用相同设计系统的屏幕。一次只读的 `use_figma` 调用可在单次权威遍历中盘点现有画框——其组件 key、绑定变量和文本/效果样式。在此处运行一次，并在 2b 和 2c 中复用结果，而不是重新遍历画框：

```js
const frame = figma.currentPage.findOne(n => n.name === "Existing Screen");
const components = new Map();
const styles = { text: new Map(), effect: new Map() };
const variableIds = new Set();

// boundVariables and style ids can sit on any scene node, so walk them all.
for (const node of frame?.findAll(() => true) ?? []) {
  if (node.type === "INSTANCE") {
    const mc = node.mainComponent;
    const cs = mc?.parent?.type === "COMPONENT_SET" ? mc.parent : null;
    const key = cs ? cs.key : mc?.key;
    if (key && !components.has(key)) {
      components.set(key, { name: cs ? cs.name : mc.name, key, isSet: !!cs, sampleVariant: mc.name });
    }
  }
  for (const b of Object.values(node.boundVariables ?? {}).flat()) {
    if (b?.id) variableIds.add(b.id);
  }
  for (const [prop, bucket] of [["textStyleId", "text"], ["effectStyleId", "effect"]]) {
    if (prop in node && typeof node[prop] === "string" && node[prop]) {
      const s = await figma.getStyleByIdAsync(node[prop]);
      if (s) styles[bucket].set(s.id, { name: s.name, id: s.id, key: s.key });
    }
  }
}
const vars = await Promise.all([...variableIds].map(id => figma.variables.getVariableByIdAsync(id)));

return {
  components: [...components.values()],
  variables: vars.filter(Boolean).map(v => ({ name: v.name, id: v.id, key: v.key, type: v.resolvedType, remote: v.remote })),
  textStyles: [...styles.text.values()],
  effectStyles: [...styles.effect.values()],
};
```

把 `components` 与你未解析的组件匹配；2a-i 的 Code Connect key 保持权威。标记任何新解析的组件。

**2a-iv —— 只搜索构建所需的缺口。** 在 Code Connect、整体视图发现和现有屏幕检查之后，搜索设计仍需的未解析组件和令牌。批量独立的一意图条目，把 `includeLibraryKeys` 限制在选定的库范围内，并把选定的 key 带入构建。不要为了穷尽搜索每个未解析角色而推迟构建。

```
// Step 1: Discover available libraries
get_libraries({ fileKey })
// Returns: {
//   libraries_added_to_file: [...],
//   libraries_available_to_add: [...],
//   libraries_available_to_add_next_offset: number | null
// }

// Step 2: Search within a specific library using its libraryKey
search_design_system({ queries: [{ entity: "component", query: "button" }], fileKey, includeLibraryKeys: ["lk-abc123..."] })
```

`libraries_available_to_add` 中的组织库是分页的（每页 20 个）。当 `libraries_available_to_add_next_offset` 非 null 时，还有更多组织库可用——用 `offset` 设为该值再次调用 `get_libraries` 以获取下一页。社区 UI 套件只出现在第一页。如果用户指定了你在当前页看不到的特定库，在放弃前继续翻页。

当文件有许多库而你想要有针对性的结果时（例如只在“iOS 26”或“Material 3”内搜索，而不是从每个库获取匹配），这尤其有用。

**每个查询使用一个意图。** `search_design_system` 不应用 OR 语义，所以绝不要把备选或同义词打包进一个字符串（“Button IconButton icon”什么都匹配不到）。知道时使用确切的设计系统名称或组件类型；否则按素材的 UI 角色搜索，例如“archive action icon”或“primary submit button”。
把每个选定的 key 映射到一个分节或属性。复用适用的复合后代，而不是构建平行替换项，并保持嵌套实例完整，除非只需要分离一个示例/模板包裹。

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

**先检查现有屏幕。** 复用 2a-iii 盘点中的 `variables`；如果该步骤被跳过，在有现有屏幕可用时在此处运行盘点。对于未解析的变量，使用 `search_design_system`，其 `queries` 条目的 `entity` 为 `"variable"`。

> **警告：两种不同的变量发现方法——不要混淆它们。**
>
> - 使用 `figma.variables.getLocalVariableCollectionsAsync()` 的 `use_figma`——**只返回当前文件中定义的本地变量**。如果返回空，**并不**意味着没有变量。远程/已发布的库变量对该 API 不可见。
> - 使用 `entity: "variable"` 查询条目的 `search_design_system`——搜索远程和已发布的库变量。用 `includeLibraryKeys` 把每个查询限定在 2a-ii 中选择的库 key 上。
>
> **绝不要仅凭 `getLocalVariableCollectionsAsync()` 返回空就断定“没有变量存在”。** 始终还要运行带变量查询条目的 `search_design_system` 来检查库变量，然后再决定创建自己的。

**查询策略：** `search_design_system` 匹配**变量名称**（例如 "Gray/gray-9"、"core/gray/100"、"space/400"），而不是类别。在一次 `queries` 调用中放入多个简短、简单的搜索，而不是一个复合查询。每个数组条目必须是 `{ "entity": "variable", "query": "..." }` 对象，绝不是裸字符串：

- **原始颜色：** `{ "entity": "variable", "query": "gray" }`、`{ "entity": "variable", "query": "red" }` 等。
- **语义颜色：** `{ "entity": "variable", "query": "background" }`、`{ "entity": "variable", "query": "surface" }` 等。
- **间距/尺寸：** `{ "entity": "variable", "query": "space" }`、`{ "entity": "variable", "query": "radius" }` 等。

如果初始搜索返回空，尝试更短的片段或不同的命名约定——各库差异很大（"grey" vs "gray"、"spacing" vs "space"、"color/bg" vs "background"）。

对于库变量（remote = true），用 `figma.variables.importVariableByKeyAsync(key)` 按 key 导入它们。对于本地变量，直接使用 `figma.variables.getVariableByIdAsync(id)`。

关于绑定模式，见 [variable-patterns.md](../figma-use/references/variable-patterns.md)。

#### 2c：发现样式（文本样式、效果样式）

复用 2a-iii 或 2b 盘点中的 `textStyles` 和 `effectStyles`。如果没有盘点，用相同脚本检查一个可用屏幕。在硬编码未解析的可复用填充/描边、排版或效果角色之前，发出一个聚焦的 `search_design_system` 条目，`entity: "style"`，例如 "surface"、"border"、"heading"、"body"、"shadow" 或 "elevation"。批量独立条目，但不要穷尽搜索已由选定组件或现有屏幕样式覆盖的角色。搜索任何仍缺失的样式。

用 `figma.importStyleByKeyAsync(key)` 导入库样式，然后用 `node.textStyleId = style.id` 或 `node.effectStyleId = style.id` 应用。

详见 [text-style-patterns.md](../figma-use/references/text-style-patterns.md) 和 [effect-style-patterns.md](../figma-use/references/effect-style-patterns.md)。

### 步骤 3：创建包裹画框

**不要先把分节构建为顶层页面子级然后再重新父级**——用 `appendChild()` 在 `use_figma` 调用之间移动节点会静默失败并产生孤立画框。先创建一个可变包裹画框，然后直接在其中构建每个分节。

在包裹内导入并实例化任何选定的整体视图复合。自定义其覆盖的后代，并把缺失的分节追加到包裹中与它并列；绝不要把子节点直接追加到实例。把包裹定位在远离现有内容处并返回其 ID：

```js
// Find clear space
let maxX = 0;
for (const child of figma.currentPage.children) {
  maxX = Math.max(maxX, child.x + child.width);
}

const wrapper = figma.createAutoLayout("VERTICAL");

// --- Size the wrapper based on container type ---
// Full page:       wrapper.resize(1440, 100); wrapper.name = "Homepage";
// Modal/dialog:    wrapper.resize(640, 100);  wrapper.name = "Settings Modal";
// Drawer/sidebar:  wrapper.resize(360, 100);  wrapper.name = "Navigation Drawer";
// Panel:           wrapper.resize(400, 100);  wrapper.name = "Details Panel";
// Adapt width to match the source code's actual dimensions.

wrapper.name = "VIEW_NAME";
wrapper.primaryAxisAlignItems = "CENTER";
wrapper.counterAxisAlignItems = "CENTER";
wrapper.resize(WIDTH, 100);
wrapper.layoutSizingHorizontal = "FIXED";
wrapper.x = maxX + 200;
wrapper.y = 0;

return { success: true, wrapperId: wrapper.id };
```

### 步骤 4：自定义已覆盖的分节并构建缺失的分节

**这是最重要的步骤。** 从选定的复合开始：自定义它已覆盖的后代，只构建缺失的分节。在可安全重试的构建阶段中工作，在安全时批量处理相关分节。仅在页面上下文边界、难以恢复的部分执行或失败后的有针对性的重试时才拆分——不仅仅是创建一个验证检查点。每个脚本开始时按 ID 获取可变包裹画框。把新内容追加到该画框，绝不要追加到组件实例。

```js
const createdNodeIds = [];

// Resolve the wrapper and import every design system dependency in parallel.
// Sequential awaits here serialize N independent IPC round-trips at the top
// of every section build; one Promise.all is dramatically faster.
const [wrapper, buttonSet, bgColorVar, spacingVar, shadowStyle] = await Promise.all([
  figma.getNodeByIdAsync("WRAPPER_ID_FROM_STEP_3"),
  figma.importComponentSetByKeyAsync("BUTTON_SET_KEY"),
  figma.variables.importVariableByKeyAsync("BG_COLOR_VAR_KEY"),
  figma.variables.importVariableByKeyAsync("SPACING_VAR_KEY"),
  figma.importStyleByKeyAsync("SHADOW_STYLE_KEY"),
]);
const primaryButton = buttonSet.children.find(c =>
  c.type === "COMPONENT" && c.name.includes("variant=primary")
) || buttonSet.defaultVariant;

// Build section frame with variable bindings (not hardcoded values)
const section = figma.createAutoLayout();
section.name = "Header";
section.setBoundVariable("paddingLeft", spacingVar);
section.setBoundVariable("paddingRight", spacingVar);
const bgPaint = figma.variables.setBoundVariableForPaint(
  { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', bgColorVar
);
section.fills = [bgPaint];

// Apply the effect style imported above
section.effectStyleId = shadowStyle.id;

// Create component instances inside the section
const btnInstance = primaryButton.createInstance();
section.appendChild(btnInstance);
createdNodeIds.push(btnInstance.id);

// Append section to wrapper
wrapper.appendChild(section);
section.layoutSizingHorizontal = "FILL"; // AFTER appending

createdNodeIds.push(section.id);
return { success: true, createdNodeIds };
```

每次调用返回创建的节点 ID 以及相关计数、名称和边界——这是你的默认结构验证。仅当该证据缺失或相关改动使其失效时，才运行单独的结构读取。把视觉检查留到步骤 5。

#### 用 setProperties() 覆盖实例文本

组件实例自带占位文本（“Title”、“Heading”、“Button”）。使用你在步骤 2 中发现的组件属性 key，用 `setProperties()` 覆盖它们——这比直接操作 `node.characters` 更可靠。完整模式见 [component-patterns.md](../figma-use/references/component-patterns.md#overriding-text-in-a-component-instance)。

对于暴露自己 TEXT 属性的嵌套实例，在嵌套实例上调用 `setProperties()`：

```js
// Use the type-indexed criteria for the type filter, then narrow by name.
const nestedHeading = cardInstance
  .findAllWithCriteria({ types: ["INSTANCE"] })
  .find(n => n.name === "Text Heading");
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

#### 把重复和可复用元素组件化（必需）

组件化是**默认**工作流的一部分，而不是可选的后续步骤。第一次就产出组件化结构；不要输出一棵一次性画框的扁平树，然后等第二个“现在把它组件化”的提示。

- **设计系统实例已经组件化**（步骤 2）。优先使用它们。
- **对于设计系统未覆盖、但会重复或映射到可复用源组件的任何内容，用 `figma.createComponent()` 一次性创建一个本地组件并放置实例**，而不是手工构建 N 个几乎相同的画框。一个源组件映射到一个 Figma 主组件。

关于“构建一次、放置实例”的模式和代码，见 [references/componentization.md](references/componentization.md)。

#### 图标：导入 SVG，绝不从旋转后的基础图形重建

图标是**上面“手动构建 vs 导入”划分的主要例外。** 如果设计系统把图标暴露为组件，就实例化它（单个 INSTANCE_SWAP 属性，而不是每个图标一个变体）。否则——最常见的是当**从代码库抓取图标以在 Figma 中放置或替换它**时——把图标的 **SVG 源直接**导入为矢量节点。这是图标的主要、默认路径；不要重绘它们。

1. **从代码库获取 SVG。** 阅读图标的源——内联 `<svg>`、导入的 `.svg` 素材或图标库条目——并传入确切的 SVG 字符串。优先使用代码库自己的 SVG，而不是手工编写。
2. **用 `figma.createNodeFromSvg(svgString)` 导入**，它返回一个由可编辑矢量路径组成的 `FrameNode`。SVG 字符串**必须**包含 `viewBox` 加上显式的 `width`/`height`（例如 `<svg width="24" height="24" viewBox="0 0 24 24" ...>`）。没有 `width`/`height` 时它会回退到 `viewBox` 尺寸，通常比槽位小——“图标没正确设置尺寸”的常见原因。
3. **把它调整到槽位大小。** `createNodeFromSvg` 画框在调整大小时会缩放其内容，所以 `icon.resize(size, size)` 会把整个图标（包括描边粗细）适配到目标盒。等效做法是把 `width`/`height` 写成目标值。匹配源图标的尺寸——常见为 16/20/24px。
4. **绝不从旋转后的线/矩形/椭圆基础图形重建图标。** Figma 的线条旋转在 `use_figma` 上下文中不可靠，会产生损坏、旋转错误图标（人字形塌缩成一团，箭头头部与杆脱离）。导入 SVG 既更可靠又更可编辑。

```js
// Place / replace an icon from a codebase SVG into a 24px slot
const icon = figma.createNodeFromSvg(
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="m9 18 6-6-6-6" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
);
icon.name = "icon/chevron-right";
icon.resize(24, 24);          // scales the whole icon to the slot
slotFrame.appendChild(icon);
```

**代码库 SVG 通常使用 `currentColor`**（例如 `stroke="currentColor"` / `fill="currentColor"`），`createNodeFromSvg` 会把它导入为**黑色**——它不继承父级的颜色。导入后设置预期颜色：在导入前把字面颜色替换进 SVG 字符串，或把导入矢量的填充/描边绑定到设计系统颜色变量（用 `setBoundVariableForPaint`，与任何填充一样）。要把导入的 SVG 变成可复用图标组件（用于 INSTANCE_SWAP），见 [figma-generate-library → 创建图标组件](../figma-generate-library/references/component-creation.md) 和 [INSTANCE_SWAP 模式](../figma-use/references/component-patterns.md#instance_swap-avoiding-variant-explosion)。

### 步骤 5：验证完整视图并转移图片

在视觉验证之前，用 `use_figma` 读回包裹并返回其后代总数、出现的每种后代节点类型的计数，以及每个图像填充节点的 ID、名称、节点类型和尺寸。这些计数是证据，不是数字通过阈值；不要从截图中推断可编辑性，也不要接受叠加在完整 UI 栅格上的少量可编辑节点。如果包裹内任何位置存在完整 UI 的截图或扁平化渲染，移除它并以语义方式重建 UI 或报告失败；不要声称完成。

在组合所有分节后，对包裹画框截取**一张完整视图组合截图**并与源比较。如果它揭示有意义的视觉缺陷，应用有针对性的 `use_figma` 修正——不要重建整个视图——然后截取**一张**修正后截图。最近一张通过的截图就是最终检查：不要再截一张未改动的“最终”截图，也不要逐个截取每个分节。

在视觉修正之前，把包裹的实例、样式和绑定变量 key 与步骤 2 的映射比较。每个适用的选定素材都应出现在输出中；完成前替换手动等价物和原始值。

检查组合截图中的：
- **被裁剪/截断的文本**——行高或画框尺寸切掉下伸部、上伸部或整行
- **重叠内容**——因尺寸错误或缺少自动布局而元素堆叠
- 仍显示占位文本（“Title”、“Heading”、“Button”）
- 因布局尺寸 bug 而被截断的内容
- 错误的组件变体（例如 Neutral 而不是 Primary 按钮）
- **错误的字族**——文本以与产品不同的字体渲染（例如产品是 SF Pro 却用 Inter）。脚本运行无错误，所以乍看不可见；显式断言它（见下文“断言字族正确”）
- **空白图像占位符**——如果图片缺失，在考虑用 `generate_image` 生成占位符之前，从 `generate_figma_design` 捕获中转移它们（见下文“从 generate_figma_design 捕获中转移图片”）

#### 断言字族正确

**你必须显式断言渲染的文本使用步骤 1 中识别的产品字体**，并把任何不匹配视为验证失败。不要假定成功加载的字体就是正确字体：当产品使用 SF Pro 时加载 Inter 即使没有错误也是失败。**如果你有源参考（运行中的 Web 应用、设计稿或 `generate_figma_design` 捕获），你还必须比较渲染的截图**——正确字族内的近似样式可能通过字族检查但仍看起来错误。

见 [references/discover-product-font.md](references/discover-product-font.md#verify-the-font-after-building) 了解读回脚本（它将你要修正的独立文本与你要标记的设计系统管控文本分开）和截图比较步骤。

#### 从 generate_figma_design 捕获中转移图片

如果你并行运行了 `generate_figma_design`，只把应用使用的离散内容素材转移到你的设计系统输出。绝不要上传或转移捕获根节点或完整 UI 的任何截图或扁平化渲染。

1. 通过搜索 `type === "IMAGE"` 的填充，在捕获输出中找到所有图像节点：
   ```js
   const capture = await figma.getNodeByIdAsync("CAPTURE_NODE_ID");
   const imageNodes = capture.findAll(() => true).flatMap(n => {
     if (!Array.isArray(n.fills)) return [];
     const imageFill = n.fills.find(f => f.type === "IMAGE");
     return imageFill ? [{ name: n.name, id: n.id, imageHash: imageFill.imageHash }] : [];
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

优先复用可用的源、捕获或库图片。如果仍有占位符，调用 Figma 的 `generate_image` 工具。生成图片后，告知用户使用了 Figma AI 配额来生成它们。

如果 Figma AI 不可用或其 AI 配额已达上限，与用户确认是否可使用替代的图像生成工具。仅用 `upload_assets` 上传这些替代提供商的图片。

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
4. 遵循与步骤 4–5 相同的证据和截图节奏：依赖返回的 ID 以及相关计数、名称和边界进行结构验证，然后在更新后截取一张完整视图截图（仅在需要有针对性的视觉修正时才再截一张修正后截图）。

```js
// Example: Swap a button variant in an existing screen.
// Batch the node lookup and component-set import in parallel — they are
// independent and awaiting them sequentially serializes two IPC round-trips.
const [existingButton, buttonSet] = await Promise.all([
  figma.getNodeByIdAsync("EXISTING_BUTTON_INSTANCE_ID"),
  figma.importComponentSetByKeyAsync("BUTTON_SET_KEY"),
]);
if (existingButton && existingButton.type === "INSTANCE") {
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

遵循 [figma-use 错误恢复](../figma-use/SKILL.md#7-error-recovery--self-correction)：

- 如果 `safeToRetryWithoutCanvasRead` 为 `true`，修正错误并重试。
- 如果为 `false`，读取画布，确定发生了什么变化，然后进行更改。

由于此技能在可安全重试的构建阶段中工作，错误自然限定在当前阶段。先前成功调用的内容保持完整。

## 最佳实践

- **构建前始终先搜索。** 设计系统很可能有你需要的组件、变量或样式。手动构建和硬编码值应是例外，而不是规则。
- **只搜索未解析的缺口，每个查询一个意图。** 把同义词和部分词作为独立的 `{ entity, query }` 条目放入一次 `queries` 调用，绝不合并成一个字符串——一个“NavigationPill”可能在“pill”、“nav”、“tab”或“chip”下被找到，所以把它们作为四个组件条目传入。对于变量，使用 `entity: "variable"` 配合 "color"、"spacing" 和 "radius" 等查询。仅对未解析的构建缺口这样做，一旦找到合适素材就停止。
- **优先使用设计系统令牌而非硬编码值。** 对颜色、间距和圆角使用变量绑定。对排版使用文本样式。对阴影使用效果样式。这使屏幕保持链接到设计系统。
- **优先使用组件实例而非手动构建。** 实例保持链接到源组件，并在设计系统演进时自动更新。
- **默认组件化。** 把重复或可复用元素构建一次作为组件，然后放置实例。不要交付一棵需要第二次“把它组件化”处理的一次性画框扁平树。
- **在可安全重试的构建阶段中工作。** 当脚本保持可安全重试时，把相关分节批量放入一次 `use_figma` 调用；仅在页面上下文边界、难以恢复的改动或实际失败后的有针对性的重试时拆分。
- **每次调用都返回节点 ID 和验证证据。** 返回创建的 ID 以及相关计数、名称和边界——这是你的默认结构验证，而且你将需要这些 ID 来组合分节和进行错误恢复。
- **用一张组合截图进行视觉验证。** 组合后截取一张完整视图截图，仅在有针对性的视觉修正后再截一张；最近一张通过的截图就是最终版本。
- **断言字族，而不只是成功加载。** 脚本可能无错误地加载错误的字体。构建后，验证渲染的文本使用步骤 1 中识别的产品字体（见步骤 5）。
- **匹配现有约定。** 如果文件已有屏幕，匹配它们的命名、尺寸和布局模式。
