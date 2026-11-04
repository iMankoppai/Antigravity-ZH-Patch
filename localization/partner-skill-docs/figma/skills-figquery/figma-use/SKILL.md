---
name: figma-use
description: "**强制前置条件** —— 你必须在每次 `use_figma` 工具调用之前调用此技能。绝不可在未先加载此技能的情况下直接调用 `use_figma`。跳过它会导致常见且难以调试的失败。每当用户想要执行需要 Figma 文件上下文中 JavaScript 执行的写操作或独特的读操作时触发——例如创建/编辑/删除节点、设置变量或令牌、构建组件和变体、修改自动布局或填充、把变量绑定到属性，或程序化检查文件结构。"
disable-model-invocation: false
---

# use_figma —— Figma Plugin API 技能

通过 Plugin API 在 Figma 文件中执行 JavaScript。**调用 `use_figma` 时始终传入 `skillNames: "figma-use"`**（日志参数，不影响执行）。

**如果任务涉及从代码在 Figma 中构建或更新完整页面、屏幕或多分节布局**，还要加载 [figma-generate-design](../figma-generate-design/SKILL.md)。它提供通过 `search_design_system` 发现设计系统组件、导入它们并增量组装屏幕的工作流。两个技能协同工作：这个负责 API 规则，那个负责屏幕构建工作流。

**如果任务涉及在 Figma 中创建或构建组件**（即使单个组件），还要加载 [figma-generate-library](../figma-generate-library/SKILL.md)。它拥有组件创建工作流——先变量基础，再变体集，然后设计令牌绑定——这是仅靠 `figma-use` 不覆盖的。在构建组件之前先构建令牌/变量基础，然后把组件的 `fills`/`cornerRadius`/间距绑定到那些变量，而不是在存在令牌的地方内联字面量。

重要：每当你处理设计系统时，先从 [working-with-design-systems/wwds.md](references/working-with-design-systems/wwds.md) 开始，理解在 Figma 中处理设计系统的关键概念、流程和指南。然后按需加载关于组件、变量、文本样式和效果样式的更具体参考。

## $fig —— 基于计划的构建器 API（所有节点创建都必须使用它）

`$fig` 是一个全局对象，负责所有节点创建。它在脚本结束时自动刷新（无需 `$fig.done()`），处理字体预加载、批量改动并正确排序属性赋值。**对所有节点创建和改动操作都使用它。** 绝不使用 `figma.createFrame()`、`figma.createText()` 或任何 `figma.create*` 方法。它们在此环境中不存在。

**构造函数排队创建，而不是惰性模板。** 每个 `$fig` 节点构造函数（如 `$fig.frame(...)`）都会在计划中排队一个节点创建，即使其返回的计划节点从未被使用、返回或截图。未附加的节点在刷新时成为顶层节点。打算用作子节点的计划节点应在刷新前被追加或用在 `$fig.frame(opts, children)` 中。

**`layoutSizingHorizontal/Vertical = 'FILL'` 仅用于自动布局子节点。** 不要为顶层节点设置 FILL。

### 计划节点 vs 真实节点

`$fig.component(...)`、`$fig.variants(...)`、`$fig.instance(...)`、`$fig.get(...)` 和 `$fig.frame(...)` 返回**计划节点**，而不是原始 Plugin API 节点。`await $fig.done()` 会把计划节点实体化，并使 `planNode.node` 可用于访问真实节点。不要把计划节点当作真实节点使用。

- 对排队的改动使用 `planNode.set({ name, x, y })` 和 `planNode.append(childPlanNode)`。不要做像 `planNode.x = 100` 这样的直接赋值。不要把计划节点混入像 `node.appendChild(planNode)` 这样的原始 plugin API。
- 优先用 `$fig.instance(componentPlanNode, opts)` 或 `planNode.instance(componentPlanNode, opts)` 创建计划组件节点的实例，无需中间刷新。
- 仅当你需要原始状态或 `$fig`/计划节点未暴露的操作时，才使用 `planNode.node`。先刷新待处理的更改。不要在待处理的更改中混入原始 plugin 代码。

### 复制这些模式

**构建带子节点的自动布局画框——单次调用：**
```js
$fig.autoLayout(
  // fixed width; omit height to hug vertically
  { name: 'Todo List', layoutMode: 'VERTICAL', width: 480 },
  ['item 1', 'item 2', 'item 3'].map((item) =>
    $fig.autoLayout(
      // FILL is valid because this item is attached to the auto-layout Todo List
      { name: 'Todo Item', layoutSizingHorizontal: 'FILL' },
      [$fig.text({ characters: item, fontName: { family: 'Inter', style: 'Bold' } })],
    ),
  ),
).screenshot() // Screenshot new node trees to verify. Prefer `.screenshot()` over `get_screenshot` call after `use_figma`.
```

**N 个并行条目，用于重复的小 UI 元素，如色板、列表项等：**
```js
const ITEMS = [
  { name: 'A', bg: '#ffffff', accent: '#0969da' },
  { name: 'B', bg: '#fff8f1', accent: '#bf5af2' },
  // ...add more here
]
ITEMS.forEach((v, i) => $fig.autoLayout({ name: v.name, x: i * 410, width: 390, fills: [figma.util.solidPaint(v.bg)] }, [
  $fig.text({ characters: v.name, fills: [figma.util.solidPaint(v.accent)] }),
]))
```

**更新现有节点——按查询或按 id：**
```js
$fig.query('FRAME[name=Header] TEXT[name=Title]').set({ characters: 'New Title', fontSize: 24 })
$fig.get('1:42').set({ opacity: 0.8, cornerRadius: 12 })
```

**在现有节点内添加节点**
```js
$fig.get('1:42').append($fig.autoLayout({ name: 'New Frame' }))
```

`parent.append(a, b, c)` 和 `$fig.append(parent, a, b, c)` 按顺序追加每个子节点并返回父级以链式调用。

**创建变体并放置实例**
```js
const SIZES = ['Small', 'Medium', 'Large']
const buttonComponentSet = $fig.variants({ name: 'Button' }, SIZES.map((size) => $fig.component({ name: `Size=${size}`, layoutMode: 'HORIZONTAL', /** other props */ })))
const buttonInst = $fig.instance(buttonComponentSet, { props: { Size: 'Medium' } })
$fig.get('DESTINATION_FRAME_ID').append(buttonInst)
// Creation and placement are queued; no intermediate done() is needed.
```
通过组件集上的 `props` 选择变体。当单个变体引用不可用时，这对已发布的集也有效。
如果较早的测量需要 `await $fig.done()`，继续用计划节点的 `.set(...)` 和 `.append(...)` 进行更改和放置。

> ⚠️ `$fig.variants` **不会**为变体定位——它们堆叠在 (0,0)，整个集渲染为一个折叠、重叠的元素。你必须在之后对变体进行网格排列并调整集的大小。见 [`fig-builder.md`](references/fig-builder.md#required-follow-up--grid-the-variants-fig-build--raw-layout) 了解所需的后续配方。

> **构建组件——即使只有一个？绑定令牌化值是完成工作的一部分，而不是偏好。** 只要任何*有*对应设计令牌的值——无论该令牌已存在于文件中，还是你从源码创建的——仍是硬编码字面量，组件就**不算完成**。当 `fills` 颜色 / `cornerRadius` / 内边距 / `itemSpacing` 存在令牌时，绑定它：构建一个 `$fig.varCollection`（原始层 + 别名为它的语义层），并把变量**句柄直接传入属性**。**要避免的反模式：** 不要把已解析的令牌值复制到本地 JS 常量（例如 `const VARIANTS = [{ bg: '#2c2c2c' }]`）并用已解析的字面颜色绘制——即使源码定义了令牌，这也会静默绕过变量。这对单个组件和完整设计系统同样适用。**只绑定实际有令牌的值**——真正没有令牌的值（一次性几何、图标像素尺寸、静态 1px 分隔线）正确地保持字面量；不要发明令牌来绑定。**如果你在一次 `use_figma` 调用中创建变量并在稍后的调用中构建组件，先重新水合句柄**（`$fig.getVar(id)` 或使用你返回的 ID 调用 `figma.variables.getVariableByIdAsync`）——先前调用的句柄不在作用域内。实用配方：[fig-builder.md → 构建带绑定变量的组件](references/fig-builder.md#building-a-component-with-bound-variables-the-default-for-components)。

**创建组件的实例**
```js
// First arg can be a component plan wrapper, a node ID ('1:2'), OR a library asset key
// from `search_design_system` results (the `componentKey` or `componentSetKey` field, according to `assetType`).
$fig.instance('1:2', { name: 'Cancel Btn', props: { label: 'Cancel'}})
```

**消费样式/变量**
```js
$fig.autoLayout({ name: 'Card', itemSpacing: spacingVar, fills: fillStyle })

// Looked up by asset key from `search_design_system` (the `key` field)
$fig.autoLayout({ fills: $fig.getStyle(BG_STYLE_KEY) })
$fig.rectangle({ fills: [{ type: 'SOLID', color: $fig.getVar(BRAND_VAR_KEY) }] })
```

**按 key 使用设计系统资产（来自 `search_design_system`）**

`search_design_system` 为组件返回 `componentKey`，为组件集返回 `componentSetKey`，为样式和变量返回 `key`。把这些直接传入统一的 `$fig` 查找——计划会自动排队库导入，所以你不需要单独的 `await figma.importComponentByKeyAsync(...)` / `importStyleByKeyAsync(...)` / `importVariableByKeyAsync(...)` 步骤。
```js
// One call site, many input shapes — node IDs, real variable/style ids,
// AND 40-char asset keys (e.g. '49c8754d4b898e176148650df612a47998a8c4a1')
const btn        = $fig.get(BUTTON_KEY)                    // component / component set
const instance   = $fig.instance(BUTTON_SET_KEY, {         // create an instance from a set
  props: { Size: 'md', Variant: 'primary' },
})
const heading    = $fig.getStyle(HEADING_TEXT_STYLE_KEY)   // paint / text / effect / grid style
const brand      = $fig.getVar(BRAND_COLOR_VAR_KEY)        // variable

$fig.text({ characters: 'Hello', textStyle: heading })
$fig.rectangle({ fills: [{ type: 'SOLID', color: brand }] })
```

**从 key 发现集合的变体 props**——`search_design_system` 返回集合的 `componentSetKey`，而不是其变体属性。这是**两次 `use_figma` 调用**：调用 1 在工具结果中 `return` 集合的属性定义及其变体，使其 props 返回给你；然后，在知道有效 props 后，调用 2 实例化你想要的变体。
```js
const setHandle = $fig.get(BUTTON_SET_KEY)
await $fig.done()
const set = setHandle.node
if (!set || set.type !== 'COMPONENT_SET') {
  throw new Error(`Key ${BUTTON_SET_KEY} is not a COMPONENT_SET`)
}
return {
  componentPropertyDefinitions: set.componentPropertyDefinitions,
  variants: set.children
    .filter((c) => c.type === 'COMPONENT')
    .map((c) => ({ name: c.name, variantProperties: c.variantProperties })),
}
```
```js
// Call 2 — instantiate with props you picked from call 1's output
$fig.instance(BUTTON_SET_KEY, { props: { Size: 'Large', Kind: 'Secondary' } })
```

**批量组件替换——`$fig.query().set()`：**
```js
const chevron = $fig.get('CHEVRON_KEY')
$fig.query('INSTANCE[name=arrow_drop_down]').set({ mainComponent: chevron })
```

**用 `.query()` 和 `.values()` 搜索并投影子值**
```js
const menuArrows = $fig
  .query('PAGE[name=Menu] INSTANCE[mainComponent.name*=arrow], PAGE[name=Menu] INSTANCE[mainComponent.name*=chevron]')
  .values(['id', 'name', 'mainComponent.name', 'mainComponent.id']);

// Use quotes for multi-word selector values
const expandComponents = $fig
  .query('COMPONENT[name*=expand], COMPONENT[name*=chevron_down], COMPONENT[name*=chevron_up], COMPONENT[name*="multi word name"]')
  .values(['id', 'name']);
```

**在另一个页面上执行操作：**
```js
// Switch to a specific page (loads its content)
const targetPage = figma.root.children.find((p) => p.name === "My Page");
await figma.setCurrentPageAsync(targetPage);
$fig.query('INSTANCE[name=arrow_drop_down]').set({ ... })
```

**通过辅助函数实现渐变——无需手工变换矩阵：**
```js
const node = $fig.rectangle({ width: 240, height: 120 })
$fig.gradient(node, 'LINEAR', [
  { pos: 0, color: figma.util.rgba('#000000') },
  { pos: 1, color: figma.util.rgba('#ffffff') },
])
```

**字面颜色——使用内置工具，每次调用都可用：**
```js
$fig.rectangle({ fills: [figma.util.solidPaint('#2563eb80')] }) // alpha becomes paint opacity
const rgb = figma.util.rgb('#2563eb') // { r, g, b }; ignores input alpha
const rgba = figma.util.rgba('#2563eb80') // { r, g, b, a }; for gradient stops/effects
```
直接使用这些工具，而不是定义十六进制解析器或依赖先前 `use_figma` 调用的辅助函数。对于令牌支撑的属性，保持直接传入变量句柄；把其解析后的颜色转换为 paint 会丢失绑定。

**在计划节点上链式调用——children 数组的替代方案：**
```js
const card = $fig.autoLayout({ name: 'Card', layoutMode: 'VERTICAL' })
card.text({ characters: 'Title', fontSize: 20 })
card.text({ characters: 'Description', fontSize: 14 })
```

### `$fig` 创建 + 改动 API（完整表面）

- **创建：** `$fig.autoLayout / .frame / .text / .rectangle / .ellipse / .polygon / .star / .line / .vector / .section / .component / .page`——都接受 `(opts?, children?)`。计划节点可链式调用。
- **从 SVG 创建——首选的图标路径：** `$fig.svg(svgStr, opts?)` 从 SVG 字符串构建矢量节点树。**优先使用真实矢量图标：** 通过 `$fig.svg(...)` 导入图标的 SVG 源（内联 `<svg>`、`.svg` 素材或源图标库字形——例如 lucide/heroicons），而不是用打字 emoji/Unicode 字形（★ ⚙ 🔍 ☰ ▾）或普通矩形近似图标。真正无法获得 SVG 时，简单字形或形状是好的后备——只是要先尝试 SVG。（不过不要从旋转的线/矩形基础图形重建图标——那会渲染损坏。）完整配方（viewBox+width/height 尺寸、`currentColor`、设计系统图标的 INSTANCE_SWAP）：[figma-generate-design → 图标](../figma-generate-design/SKILL.md#icons-import-the-svg-never-reconstruct-from-rotated-primitives)。
- **创建组件的实例：** `$fig.instance(compRef, opts?)`——`compRef` 是组件计划节点、节点 ID 字符串或库资产 key（来自 `search_design_system` 的 `componentKey` 或 `componentSetKey`）；导入会自动在计划中排队。
- **分组/布尔：** `$fig.group / .union / .subtract / .intersect / .exclude / .variants`——都接受 `(opts?, children?)`。
- **读取：** `$fig.get(id)` 包裹现有 `SceneNode`——`id` 可以是真实节点 ID 或库资产 key（来自 `search_design_system` 的 `componentKey` 或 `componentSetKey`）；导入会自动在计划中排队。`$fig.query(selector, scope?)` 返回 `{ length, values(paths), first(), last(), each(fn), filter(fn), set(props), moveTo(parent, idx?), remove() }`。选择器是类 CSS 的（例如 `'FRAME[name*=Card] TEXT'`）。`$fig.getStyle(nameOrIdOrKey)` 和 `$fig.getVar(nameOrIdOrKey)` 接受来自 `search_design_system` 的匹配 `key` 值。
- **改动：** `$fig.set(target, props)`、`.delete(...nodes)`、`.move(target, parent, idx?)`、`.clone(target, props?)`、`.append(parent, child)`、`.addAt(parent, idx, child)`、`.replace(old, new)`、`.reorder(parent, children)`、`.gradient(node, type, stops, transform?)`、`.image(node, hash, scaleMode?)`。
- **计划节点方法（可链式）：** `.set()`、`.remove()`、`.clone()`、`.moveTo(parent, idx?)`、`.append(child)`、`.query(selector)`、`.screenshot({scale?, contentsOnly?})`，以及用于实体化 `SceneNode` 的 `.node` getter（刷新前为 null）。

### 何时使用原始 Figma Plugin API

把读取或更改文档状态的原始 Plugin API 代码与计划中的创建和改动分开。在 `$fig` 代码之前运行它，或在显式 `await $fig.done()` 刷新所有待处理更改之后运行。不要把计划节点传给原始方法，如 `regularNode.appendChild(planNode)` 或 `insertChild`；改用 `$fig.get(regularNode.id).append(planNode)` 或 `.addAt(index, planNode)`。计划中的更改在计划刷新之前对 `regularNode.children` 等原始读取不可见。刷新后，当原始 API 需要真实节点时使用 `planNode.node`。纯颜色辅助函数如 `figma.util.solidPaint`、`.rgb` 和 `.rgba` 可以在 `$fig` 表达式内使用。

仅在以下情况下使用原始 API：

- **颜色转换：** `figma.util.solidPaint`、`.rgb` 和 `.rgba` 为 `$fig` 属性转换字面颜色，而不创建或改动节点。
- **脚本中途需要异步结果：** `await figma.setCurrentPageAsync(...)`、`await figma.loadFontAsync(...)`——必须在后续计划步骤能使用结果之前完成。（导入库组件**不**是这些情况之一：把匹配的 `componentKey` 或 `componentSetKey` 直接传入 `$fig.get(...)` / `$fig.instance(...)`，并在 `props` 中传入变体属性值。`$fig` 会在计划中排队库导入并为你解析变体。）
- **脚本中途读取真实节点状态：** 自动布局后测量的 `width` / `height`、计算出的颜色、getStyledTextSegments——在脚本中途实体化，然后读取计划节点上的 `.node`。见 [references/fig-builder.md](references/fig-builder.md) 了解脚本中途检查模式。
- **`$fig` 确实不暴露的东西：** `node.setRangeFontName(...)` 等——通过 `planNode.node` 访问（见 [references/fig-builder.md](references/fig-builder.md)）。

## 关键规则

1. **仅使用 `$fig` 创建 / 批量编辑节点**（`$fig.autoLayout(...)`、`$fig.text(...)`、`$fig.query(...).set(...)`）。原始 Plugin API 是后备——仅当 `$fig` 无法表达操作（中间节点状态读取、非 SceneNode 类型如 Variable）时才使用它。库组件**不是**离开 `$fig` 的理由：`$fig.get(componentKey)` / `$fig.instance(componentSetKey, { props })` 会排队库导入并为你解析变体。见 [references/fig-builder.md](references/fig-builder.md) 和 [references/critical-rules-deep.md](references/critical-rules-deep.md) 了解 WRONG/RIGHT 示例。

2. **不要直接使用 `findOne`、`findAll`、`findAllWithCriteria`、`findChildren`、`findChild` 进行节点搜索** 它们比 `query()` 更冗长、更易出错、效率更低。此外，不要用递归搜索。

3. **如果只用 `$fig`，就避免 `return` / `$fig.done()`**——运行时会自动刷新并返回包含创建/更新节点 ID 的 `FigDoneResult`。如果在脚本中途需要原始 plugin API 或其他数据，才使用 `return`。

4. **按分节增量构建更大的设计。** 参考 [figma-generate-design](../figma-generate-design/SKILL.md) 技能了解占位符 + 替换工作流。用下面完整的父子示例创建带占位符的屏幕，然后进行后续 `use_figma` 调用来替换它们并截图：`$fig.get("PLACEHOLDER_ID_FROM_PREVIOUS_STEP").replace( ... ).screenshot()`。每次工具调用最多可做 5 次 `.screenshot()` 调用。如果你需要更多截图，说明你做得太多，需要把任务分解为多次 `use_figma` 调用。

   ```js
   $fig.autoLayout({ name: 'Screen', layoutMode: 'VERTICAL', width: 390 }, [
     $fig.autoLayout({ name: 'Header', layoutSizingHorizontal: 'FILL', placeholder: true }),
     $fig.autoLayout({ name: 'Content', layoutSizingHorizontal: 'FILL', placeholder: true }),
   ])
   ```

5. **带顶层 `await` 的普通 JS。** 代码会自动包裹在 async 中。不要包在 `(async () => {})()` 中。

6. **字面颜色使用内置工具。** `figma.util.solidPaint('#2563eb80')` 创建一个带不透明度的完整实色 paint。对于单个颜色字段，用 `figma.util.rgb(...)` 得到 `{r,g,b}`（实色 paint；忽略 alpha），用 `figma.util.rgba(...)` 得到 `{r,g,b,a}`（渐变停靠点/效果）。通道是 0–1；实色 paint 的不透明度属于 `color` 之外。这些工具在每次调用中都可用——无需自定义十六进制解析器。令牌支撑的属性仍直接接受变量句柄。见 [references/critical-rules-deep.md](references/critical-rules-deep.md) 了解 WRONG/RIGHT。

7. **不要在 `Bash` 中对 Figma URL 使用 `curl` / `wget` / `Read`。** 仅通过 `use_figma` 和 `mcp__figma__*` 工具访问 Figma 文件。`get_screenshot` 之后，图片内联在工具结果中——不要重新获取或重新 Read 它。

8. **空 / 不支持的响应是终局的。** 接受并继续——不要尝试替代绕过路径。

9. **触摸属性前先验证节点类型。** 只有 `FRAME / COMPONENT / COMPONENT_SET / INSTANCE / GROUP / SECTION / PAGE` 有 `.children`。`GROUP` 没有 `fills` / `strokes` / `cornerRadius`。`TEXT` 没有 `cornerRadius` / `padding*` / `layoutMode`。`layoutPositioning='ABSOLUTE'` 需要父级 `layoutMode !== 'NONE'`。检查 `'<prop>' in node` 或 grep [references/plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts)。完整列表见 [references/critical-rules-deep.md](references/critical-rules-deep.md)。

10. **不要重复查询相同信息。** 对同一目标两次 `get_metadata` / `get_comments` 产生相同结果。在心里缓存。

11. **一旦有足够信息就果断。** 不要持续收集——第 3 张截图或第 4 次 metadata 调用的边际信息接近于零。

12. **`use_figma` 的 "An unexpected error occurred" 是服务端的，不是你的脚本 bug。** 不要原样重试——更改方法（更小的批次、不同的选择器、去掉一个节点属性）。

13. **绝不要调用 `mcp__figma__get_design_context`。禁止。** 此工具需要选择（此环境中不存在选择），所以每次调用都会失败。错误不可恢复——调用它只会烧掉一个工具槽并强制重试。对于文件的结构化读取，改用 `mcp__figma__get_metadata`（用于顶层画框发现）和带 `$fig.query()` 的 `use_figma`。**绝不要以任何理由调用 `get_design_context`。**

14. **当任务引用源代码时，代码库 `Read` 调用 ≤3 次。** 超过则只用 grep。第 4 次代码库 Read 被禁止——用你已有的写 `use_figma` 脚本。

15. **同一错误重试 3 次 → 切换方法。** 最常见：切换到 `$fig`（它会自动处理排序）。打补丁原始 API 不起作用。

16. **除非有充分理由，否则必须使用自动布局。** 用 `$fig.autoLayout(...)` 创建自动布局画框，而不是绝对定位节点。新的自动布局画框两轴都包裹内容。如果你想让自动布局子节点填充容器的交叉轴，显式把 `layoutSizingHorizontal` 或 `layoutSizingVertical` 赋为 `'FILL'`。

17. **渐变 paint 需要所有字段：** `type`、`gradientStops`、`gradientTransform`（一个 `[[a,b,tx],[c,d,ty]]` 矩阵）。缺少任何一项都会抛出验证错误。见 [references/critical-rules-deep.md](references/critical-rules-deep.md)。

18. **发现可用字体，尤其是样式变体。** 用 `await figma.listAvailableFontsAsync()` 为 `$fig.text({ fontName: ... })` 发现可用字体。

19. **创建变量时显式设置变量 `scopes`。** 默认的 `ALL_SCOPES` 会污染每个属性选择器。使用具体作用域——背景用 `['FRAME_FILL', 'SHAPE_FILL']`，文本用 `['TEXT_FILL']`，间距用 `['GAP']`，圆角用 `['CORNER_RADIUS']`；不应出现在选择器中的原始值用 `[]`。在 `$fig` 中，把 `scopes` 传给 `colorVar` / `numVar`；在原始 API 中，设置 `variable.scopes`。见 [references/variable-patterns.md](references/variable-patterns.md)。

### 现有节点的批量改动（替换/更新/替换）在 3 次 `use_figma` 调用内完成

对于"替换 N 个图标"、"更新 M 个颜色"、"替换 K 个实例"之类的任务：
1. **在一个脚本中 DISCOVER + MUTATE**（通过 `figma.currentPage.query()` 查找，导入任何组件，通过 `$fig.query(...).each(...)` 改动，返回计数）。
2. **VERIFY**（可选）——只读 `.query()` 计数。
3. **FINAL REPORT** 在助手文本中，不调用工具。停止。

没有第 4 次调用。不要追逐最后 20% 的边界情况。如果调用 1 出错，修正并重做——那仍是你的唯一一次改动调用。完整模板见 [references/critical-rules-deep.md](references/critical-rules-deep.md)。

## 节点属性陷阱

不要猜测节点属性或假定类 CSS 属性。访问不存在的属性会抛出 `TypeError: node.foo: no such property 'foo' on TYPE node`。每次抛出都会烧掉一次重试。[plugin-api-standalone.index.md](references/plugin-api-standalone.index.md) 包含 API 中所有符号的列表。使用该文件并在 [plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts) 中 grep 完整 API 类型以获取完整定义。

- **只有 `FRAME` / `COMPONENT` / `COMPONENT_SET` / `INSTANCE` / `GROUP` / `SECTION` / `PAGE` 有 `.children`。** `RECTANGLE`、`TEXT`、`ELLIPSE`、`POLYGON`、`STAR`、`VECTOR`、`LINE`、`SLICE`、`STICKY`、`SHAPE_WITH_TEXT`、`STAMP`、`CONNECTOR`、`TABLE`、`WIDGET`、`EMBED`、`MEDIA` 没有。访问节点子节点前检查 `'children' in node`。
- **`GROUP` 没有 `fills` / `strokes` / `cornerRadius`。** 在内部子形状上应用 paint/圆角。
- **Figma 自动布局 != CSS flexbox。** 没有 margin 这种东西。
- **`TEXT` 没有容器属性。** 文本有字体 / 尺寸 / 装饰 / 填充。不要使用内边距、布局模式、条目间距等容器属性。
- **`INSTANCE` 后代对于结构操作是只读的**——你不能 `appendChild` / `insertChild` 到实例子节点。编辑源 `COMPONENT` 或先分离。
- **绝不要在节点上使用 `primaryAxisSizingMode` 或 `counterAxisSizingMode`。** 使用 `layoutSizingHorizontal` 或 `layoutSizingVertical` 配合 'FIXED' | 'HUG' | 'FILL'。仅当父级有自动布局时才使用 'FILL'。
- **没有 `instance.swapMainComponent(...)`。** 使用带组件属性变体值的 `instance.setProperties({...})`，或 `$fig.query(...).set({props: {...}})`。有 `instance.swapComponent(component)`（不同的方法名）。

## 参考

- [references/fig-builder.md](references/fig-builder.md) —— 完整 `$fig` API 和实用模式
- [references/critical-rules-deep.md](references/critical-rules-deep.md) —— WRONG/RIGHT 示例、完整节点类型陷阱列表、批量改动模板、语法 bug 检查清单
- [references/gotchas.md](references/gotchas.md) —— 原始 Plugin API 边界情况
- [references/plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts) —— 类型定义（grep，不要整体读取）
- [references/plugin-api-standalone.index.md](references/plugin-api-standalone.index.md) —— API 导航
- [references/common-patterns.md](references/common-patterns.md)、[component-patterns.md](references/component-patterns.md)、[variable-patterns.md](references/variable-patterns.md)、[text-style-patterns.md](references/text-style-patterns.md)、[effect-style-patterns.md](references/effect-style-patterns.md) —— 模式手册
- [references/working-with-design-systems/](references/working-with-design-systems/) —— 设计系统工作流
- [references/validation-and-recovery.md](references/validation-and-recovery.md) —— 错误恢复模式
