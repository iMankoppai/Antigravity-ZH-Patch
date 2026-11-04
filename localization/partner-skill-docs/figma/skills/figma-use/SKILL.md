---
name: figma-use
description: "**强制前置条件** —— 你必须在每次 `use_figma` 工具调用之前调用此技能。绝不可在未先加载此技能的情况下直接调用 `use_figma`。跳过它会导致常见且难以调试的失败。每当用户想要执行需要 Figma 文件上下文中 JavaScript 执行的写操作或独特的读操作时触发——例如创建/编辑/删除节点、设置变量或令牌、构建组件和变体、修改自动布局或填充、把变量绑定到属性，或程序化检查文件结构。"
disable-model-invocation: false
---
# use_figma —— Figma Plugin API 技能
用 `use_figma` 工具通过 Plugin API 在 Figma 文件中执行 JavaScript。所有详细参考文档位于 `references/`。

在可用时，在读取或编辑文件之前调用 `create_session` 并传入 `fileKey` 和 `description`（如需要先创建文件），然后把返回的 `sessionId` 原样传给每个接受它的调用，包括后续调用和跨文件的工作。

**在调用 `use_figma` 时，务必在逗号分隔的 `skillNames` 参数中包含 `figma-use`。如果本技能是通过 MCP 资源加载的，你必须在名称前加上 `resource:` 前缀（例如 `resource:figma-use`）。** 这是一个用于跟踪技能使用情况的日志参数——它不影响执行。

**如果 Figma MCP 工具表现为延迟工具，在单次 `ToolSearch` 调用中批量加载其所有 schema**，使用 `select:` 语法——例如 `ToolSearch query="select:use_figma,get_screenshot,get_metadata,create_new_file"`。一次往返胜过六次。

**对可见设计更改强制要求：** 在首次改动性 `use_figma` 调用之前，与此技能一起加载 [figma-generate-design](../figma-generate-design/SKILL.md)，并在每个改动性调用的 `skillNames` 中包含两个名称。这适用于从单个可见属性或元素到完整页面、屏幕或组合式多分节视图——即使用户把该视图称为组件。`figma-use` 提供 Plugin API 规则；`figma-generate-design` 提供通过 `search_design_system` 的设计系统发现、素材导入和增量组装。

**可复用库例外：** 如果主要交付物是可复用组件、组件集、变体系统、变量/令牌集合、样式基础或其他用于复用或发布的库资产，改用加载 [figma-generate-library](../figma-generate-library/SKILL.md)。它提供组件创建工作流——变量基础、变体集和设计令牌绑定——这些是仅靠 `figma-use` 不覆盖的。对于既包含库资产又包含使用它们的组合式设计的任务，加载两个配套技能。只读 `use_figma` 调用两者都不需要。

在做任何事之前，加载 [plugin-api-standalone.index.md](references/plugin-api-standalone.index.md) 以理解有哪些可能。当你被要求编写 plugin API 代码时，用此上下文 grep [plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts) 查找相关类型、方法和属性。这是 API 表面的最终事实来源。它是一个大型类型文件，所以不要一次性全部加载，按需 grep 相关部分。

重要：每当你处理设计系统时，先从 [working-with-design-systems/wwds.md](references/working-with-design-systems/wwds.md) 开始，理解在 Figma 中处理设计系统的关键概念、流程和指南。然后按需加载关于组件、变量、文本样式和效果样式的更具体参考。

## 1. 关键规则
1.  **用 `return` 把数据送回去。** 返回值会自动 JSON 序列化（对象、数组、字符串、数字）。不要调用 `figma.closePlugin()`，也不要把代码包在 async IIFE 中——这已为你处理。
2.  **编写带顶层 `await` 和 `return` 的普通 JavaScript。** 代码会自动包裹在异步上下文中。不要包在 `(async () => { ... })()` 中。
3.  `figma.notify()` **抛出 "not implemented"**——绝不使用它
3a. **返回节点 ID，并把工作流状态保持在 Figma 文件之外。** 仅在 `COMPONENT` 或 `COMPONENT_SET` 上设置人类可读的组件用途和用法到 `node.description`——绝不在画框或实例上。
3b. **在访问类型特定属性之前先收窄类型。** 检查 `node.type`，使用诸如 `"characters" in node` 的能力守卫，或用 `findAllWithCriteria` 预过滤。`characters` 需要文本能力节点；可选链不能保护不受支持的属性访问。
4.  `console.log()` 不会返回——用 `return` 输出
5.  **按安全重试和从证据验证来设定构建调用的粒度。** 不要仅为创建验证检查点而拆分一个正常工作的操作。当生成的脚本保持可安全重试时批量相关工作；一个完整分节或页面可以在一次调用中构建。在跨页面上下文、部分执行难以恢复时，或实际失败后需要有针对性的重试时拆分。每次写入返回受影响的 ID 和相关计数、名称或边界——这算作结构验证。仅当所需证据缺失或相关改动之后才运行单独的结构检查。通常组合后截一张截图，视觉修正后截一张。最近一张通过的截图就是最终检查；当没有相关变化时不要重复它。一旦要求通过就停止。
6.  颜色是 **0–1 范围**（不是 0–255）：`{r: 1, g: 0, b: 0}` = 红色。Paint 的 `color` 对象**只用 `{r, g, b}`——没有 `a` 字段**；不透明度放在 paint 层级（`{ type: 'SOLID', color: {...}, opacity: 0.5 }`）。
7.  填充/描边是**只读数组**——克隆、修改、重新赋值
8.  **每次文本编辑都遵循规范配方：加载字体 → `await` → 修改 → 返回受影响的节点 ID。** 跳过加载会抛出 `Cannot write to node with unloaded font "<family> <style>"`。该规则涵盖的不只是 `characters`——它适用于对具有未加载字体的节点的任何操作（`appendChild`、`insertChild`、`setBoundVariable`、`setExplicitVariableModeForCollection`、`setValueForMode`、触及文本的 `findAll` 回调）。修改现有文本时，通过 `getStyledTextSegments(['fontName'])` 加载节点的*当前*字体，而不是硬编码默认值。Inter 在大多数环境中预加载，所以其他字族更常暴露此 bug——配方对每种字体都一样。如果样式字符串未验证，先使用 `await figma.listAvailableFontsAsync()`——**绝不猜测**（`"SemiBold"` vs `"Semi Bold"` 是常见的坑）。对于 `FONT_FAMILY` 作用域的变量，在 `setBoundVariable("fontFamily", …)`、`setValueForMode` 或 `setExplicitVariableModeForCollection` 之前加载每个相关模式下的每个值。`lineHeight`/`letterSpacing` 接受 `{unit, value}`，不是裸数字。见 [规范文本编辑配方](references/gotchas.md#canonical-text-edit-recipe-font-load--await--mutate--return-ids)。
9.  **页面是增量加载的**——使用 `await figma.setCurrentPageAsync(page)` 切换页面并加载其内容。同步 setter `figma.currentPage = page` **不**起作用并抛出 `"Setting figma.currentPage is not supported"`。页面上下文在每次 `use_figma` 调用开始时重置到**第一页**，所以每次调用都要重新切换；**每次调用最多切换一次**并并行展开多页面工作——见[页面规则](#2-page-rules-critical)和 [gotchas.md](references/gotchas.md#set-current-page-once-per-use_figma-call--split-multi-page-work-into-parallel-calls)。
10. `setBoundVariableForPaint` 返回一个**新的** paint——必须捕获并重新赋值
11. `createVariable` 接受集合**对象或 ID 字符串**（对象优先）
12. **`layoutSizingHorizontal/Vertical` 的值受结构上下文限制——`FIXED` 始终有效，`HUG` 和 `FILL` 则不然。** `'HUG'` 仅在自动布局画框本身或其 **TEXT** 子节点上有效。`'FILL'` 仅在自动布局画框的子节点上有效，且该子节点不得绝对定位、不得位于不可变画框内、不得是画布网格子节点。实际后果：先追加到自动布局父级，再设置 `HUG`/`FILL`——新建或未父级的节点尚不能满足该规则。该属性本身存在于每个 `SceneNode` 上；错误是值被拒绝，而不是“没有此属性”。见 [Gotchas](references/gotchas.md#layoutsizinghorizontallayoutsizingvertical-value-rules-fixed-hug-fill)。
12a. **对包含相关子节点的容器使用自动布局。** 当子节点具有结构关系——堆叠、并排、对齐、有间隙、包裹——把它们包在 `figma.createAutoLayout()` 中，而不是用带绝对 `x`/`y` 的 `figma.createFrame()`。绝对坐标管理容器在画布上的位置；自动布局管理其子节点在内部的相互关系。跳过容器会使内容无法抵御文本重排、内容变化或重叠。
12b. **`layoutSizing*` 和 `*AxisSizingMode` 是不同的枚举——不要交叉使用。** `layoutSizingHorizontal`/`layoutSizingVertical`（设置在**子节点**上）接受 `'FIXED'|'HUG'|'FILL'`；`primaryAxisSizingMode`/`counterAxisSizingMode`（设置在**画框本身**上）接受 `'FIXED'|'AUTO'`。所以 `layoutSizingVertical = 'AUTO'` 无效（用 `'HUG'`），而 `counterAxisSizingMode = 'FILL'` 会抛出 `Expected 'FIXED' | 'AUTO', received 'FILL'`（用 `'FIXED'`/`'AUTO'`）。同一 setter 的另外两个错误——`Error: in set_layoutSizingHorizontal: node must be an auto-layout frame or a child of an auto-layout frame` 和 `Error: in set_layoutSizingHorizontal: FILL can only be set on children of auto-layout frames`——意味着该节点尚未处于自动布局上下文中；**建议：让父级成为自动布局（`figma.createAutoLayout()`）并在设置前 `appendChild` 该节点**（见规则 12）。见 [Gotchas](references/gotchas.md#layoutsizing-vs-axissizingmode-two-different-sizing-enums)。
12c. **`resize()` 会把尺寸模式重置为 `FIXED`，所以要在设置 `layoutSizing*` 之前调用它。** 一个自动换行的 **TEXT** 块需要 `textAutoResize = 'HEIGHT'` 加上显式的 FIXED 宽度（`resize()`），而不是只用 `FILL`——默认的 `WIDTH_AND_HEIGHT` 模式会忽略 `FILL` 并把节点塌缩成近乎零宽的一丝。之后验证 `node.width > 0`。
13. **把新的顶层节点定位在远离 (0,0) 处。** 直接追加到页面的节点默认位于 (0,0)。扫描 `figma.currentPage.children` 寻找一个空位（例如最右侧节点之右）。这仅适用于页面级节点——嵌套在其他画框或自动布局容器内的节点由其父级定位。见 [Gotchas](references/gotchas.md)。
14. **`use_figma` 出错时，遵循 `safeToRetryWithoutCanvasRead`。** 如果为 `true`，修正错误并重试。如果为 `false`，读取画布，确定发生了什么变化，然后进行更改。见[错误恢复](#7-error-recovery--self-correction)。
15. **必须 `return` 所有创建/修改的节点 ID。** 每当脚本创建新节点或修改画布上的现有节点时，收集每个受影响的节点 ID 并在结构化对象中返回它们（例如 `return { createdNodeIds: [...], mutatedNodeIds: [...] }`）。这对后续调用引用、验证或清理那些节点至关重要。`use_figma` 调用之间不保留状态，所以把先前调用的 ID 作为**字符串字面量**传入，而不是变量。见 [common-patterns.md](references/common-patterns.md) 中的多步示例。
16. **创建变量时始终显式设置 `variable.scopes`。** 默认的 `ALL_SCOPES` 会污染每个属性选择器——几乎总不是你要的。背景用 `["FRAME_FILL", "SHAPE_FILL"]` 之类的具体作用域，文本颜色用 `["TEXT_FILL"]`，间距用 `["GAP"]` 等。完整列表见 [variable-patterns.md](references/variable-patterns.md)。
17. **`await` 每个 Promise。** 绝不要让 Promise 未被 await——未 await 的异步调用（例如没有 `await` 的 `figma.loadFontAsync(...)`，或没有 `await` 的 `figma.setCurrentPageAsync(page)`）会变成发后不管，导致静默失败或竞态条件。脚本可能在异步操作完成前返回，导致数据缺失或变更半应用。
18. **绝不要从变体组件读取 `componentPropertyDefinitions`。** 先收窄所有者：节点本身是 `COMPONENT_SET` 时使用该节点，只有在父级不是 `COMPONENT_SET` 时才使用 `COMPONENT`，否则把变体 `COMPONENT` 提升到其父级集。可选链并不能让该 getter 安全。见[组件属性所有者收窄](references/component-patterns.md#component-property-owner-narrowing)。
> 每条规则的详细 WRONG/CORRECT 示例，见 [Gotchas & Common Mistakes](references/gotchas.md)。

## 2. 页面规则（关键）

异步专用 setter 和每次调用的上下文重置在规则 9 中已涵盖。本节展开需要示例演示的一条规则：**每个脚本最多切换页面一次，并并行展开多页面工作。**

绝不要在循环中遍历 `figma.root.children` 并切换页面——每次切换都会重新加载文件。如果工作跨多个页面，**把它拆分为 N 次 `use_figma` 调用（每个目标页面一次）并并行发出**——一条包含 N 个 `use_figma` 工具使用块的助手消息。Harness 会并发运行它们；每个脚本恰好设置一次 `currentPage`。

> **明确指示：** 展开时，你必须**在一条消息中**发出 N 个工具调用。不要把她们分散到多个回合。不要在发出下一个之前等待一个完成。顺序的逐页调用会浪费拆分的全部好处。

```js
// AVOID — switches pages N times in one script, reloads the file each time
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);
  // ... touch this page ...
}

// PREFER — read-only discovery call to get page IDs, then in the NEXT message
// emit N parallel use_figma tool calls (one per page), each setting currentPage once.
```

对任何多页面工作默认使用并行展开——读取和写入都一样。你也可以多次调用 `use_figma` 来增量构建（例如 `return` 现有节点的元数据，然后在后续脚本中修改它们）。完整理由见 [gotchas.md → 每次 `use_figma` 调用只设置一次当前页面](references/gotchas.md#set-current-page-once-per-use_figma-call--split-multi-page-work-into-parallel-calls)。

## 3. `return` 是你的输出通道

智能体**只**看到你 `return` 的值——`console.log()` 不可见（规则 4），抛出的错误会被自动捕获（让其传播或显式 `throw`）。硬性要求是规则 15：每个创建或修改画布节点的脚本**必须**在结构化对象中返回所有受影响的节点 ID 以及任何可操作的状态——例如 `return { createdNodeIds: [...], mutatedNodeIds: [...], count: 5, errors: [] }`——以便后续调用可以引用、验证或清理它们。

## 4. 编辑器模式

`use_figma` 在**设计模式**下工作（editorType `"figma"`，默认）。FigJam（`"figjam"`）和 Slides（`"slides"`）有不同可用节点类型集——大多数设计节点在 FigJam 中被阻止，而 FigJam 独有节点在 Slides 中被阻止。

**从 URL 辨别编辑器：** Design = `figma.com/design/...`，FigJam = `figma.com/board/...`，Slides = `figma.com/slides/...`。在假定 API 可用之前先确认。

设计模式中可用：Rectangle、Frame、Component、Text、Ellipse、Star、Line、Vector、Polygon、BooleanOperation、Slice、Page、Section、TextPath。

设计模式中**被阻止**：Sticky、Connector、ShapeWithText、CodeBlock、Slide、SlideRow、SlideGrid、InteractiveSlideElement、Webpage。

Slides 模式中可用：Rectangle、Frame、Component、Text、Ellipse、Star、Line、Vector、Polygon、BooleanOperation、Slice、Section、TextPath、Slide、SlideRow、SlideGrid、InteractiveSlideElement。

Slides 模式中**被阻止**：Sticky、Connector、ShapeWithText、CodeBlock、Webpage、Page。

**仅限 Design 的 API（不只是节点类型）：** `figma.createPage()` 仅在 Design 文件（`figma.com/design/...`）中可用。在 FigJam（`figma.com/board/...`）和 Slides（`figma.com/slides/...`）中它都会抛出 `TypeError: figma.createPage no such property 'createPage' on the figma global object`。不要在 FigJam 或 Slides 工作流中发出 `figma.createPage()`。

> **Slides 说明：** 目前还没有专门用于 Slides 文件的读取工具。使用 `use_figma` 配合只读脚本进行检查（见第 6 节“先检查”模式），并使用 `get_screenshot` / `await node.screenshot()` 获取视觉上下文。关于 Slides 特定的 API 指导，加载 [figma-use-slides](../figma-use-slides/SKILL.md) 技能。

## 5. 高效 API —— 优先使用这些而非冗长替代

这些 API 减少样板、消除顺序错误并压缩令牌输出。**始终优先使用它们而非冗长的替代方案。**

### `node.query(selector)` —— 类 CSS 的节点搜索

使用类 CSS 选择器在子树内查找节点。替代冗长的 `findAll` + filter 循环。

```js
// BEFORE — verbose traversal
const texts = frame.findAll(n => n.type === 'TEXT' && n.name === 'Title')

// AFTER — one-liner with query
const texts = frame.query('TEXT[name=Title]')
```

**选择器语法：**
- 类型：`FRAME`、`TEXT`、`RECTANGLE`、`ELLIPSE`、`COMPONENT`、`INSTANCE`、`SECTION`（不区分大小写）
- 属性精确：`[name=Card]`、`[visible=true]`、`[opacity=0.5]`
- 属性子串：`[name*=art]`（包含）、`[name^=Header]`（开头）、`[name$=Nav]`（结尾）
- 点路径遍历：`[fills.0.type=SOLID]`、`[fills.*.type=SOLID]`（通配索引）
- 实例匹配：`[mainComponent=nodeId]`、`[mainComponent.name=Button]`
- 组合器：`FRAME > TEXT`（直接子级）、`FRAME TEXT`（任意后代）、`A + B`（相邻兄弟）、`A ~ B`（一般兄弟）
- 伪类：`:first-child`、`:last-child`、`:nth-child(2)`、`:not(TYPE)`、`:is(FRAME, RECTANGLE)`、`:where(TEXT, ELLIPSE)`
- 节点 ID：`#nodeId` 或裸 GUID
- 逗号：`TEXT, RECTANGLE`（并集）
- 通配：`*`（任意类型）

**QueryResult 方法：**
| 方法 | 描述 |
|---|---|
| `.length` | 匹配节点数量 |
| `.first()` | 第一个匹配节点（或 `null`） |
| `.last()` | 最后一个匹配节点（或 `null`） |
| `.toArray()` | 转换为常规数组 |
| `.each(fn)` | 用回调迭代，返回 `this` 以链式调用 |
| `.map(fn)` | 映射为新数组 |
| `.filter(fn)` | 过滤为新的 QueryResult |
| `.values(keys)` | 提取属性值：`.values(['name', 'x', 'y'])` → `[{name, x, y}, ...]` |
| `.set(props)` | 在所有匹配节点上设置属性（见下方 `node.set()`） |
| `.query(selector)` | 在匹配节点内子查询 |
| `for...of` | 可迭代——可用于 `for` 循环 |

**作用域：** `node.query()` 在该节点的子树内搜索。要搜索整个页面：`figma.currentPage.query('...')`。没有全局 `figma.query()`。

**示例：**
```js
// Recolor all text inside cards
figma.currentPage.query('FRAME[name^=Card] TEXT').set({
  fills: [{type: 'SOLID', color: {r: 0.2, g: 0.2, b: 0.8}}]
})

// Get names and positions of all frames
return figma.currentPage.query('FRAME').values(['name', 'x', 'y'])

// Find the first component named "Button"
const btn = figma.currentPage.query('COMPONENT[name=Button]').first()

// Find all instances of a specific component
figma.currentPage.query(`INSTANCE[mainComponent=${compId}]`)

// Find nodes with solid fills using dot-path traversal
figma.currentPage.query('[fills.0.type=SOLID]')
```

### `node.set(props)` —— 批量属性更新

在一次调用中设置多个属性。返回 `this` 以链式调用。

```js
// BEFORE — one line per property
frame.opacity = 0.5
frame.cornerRadius = 8
frame.name = "Card"

// AFTER — single call
frame.set({ opacity: 0.5, cornerRadius: 8, name: "Card" })
```

**优先级键排序：** `layoutMode` 总是先于其他属性（如 `width`/`height`）应用，无论对象键顺序如何。这避免了 `resize()` 行为因 `layoutMode` 是否设置而不同的常见 bug。

**宽度/高度处理：** `width` 和 `height` 会自动通过 `node.resize()` 路由——设置 `{ width: 200 }` 会调用 `resize(200, currentHeight)`。

**与 query 链式调用：**
```js
// Find all rectangles named "Divider" and update them
figma.currentPage.query('RECTANGLE[name=Divider]').set({
  fills: [{type: 'SOLID', color: {r: 0.9, g: 0.9, b: 0.9}}],
  cornerRadius: 2
})
```

### `figma.createAutoLayout(direction?, props?)` —— 自动布局画框

创建一个已启用自动布局且两轴都包裹内容的画框。**当子节点彼此有结构关系时，这是默认容器（见规则 12a）。**

```js
// BEFORE — manual setup, easy to get ordering wrong
const frame = figma.createFrame()
frame.layoutMode = 'VERTICAL'
frame.primaryAxisSizingMode = 'AUTO'
frame.counterAxisSizingMode = 'AUTO'
frame.layoutSizingHorizontal = 'HUG'
frame.layoutSizingVertical = 'HUG'

// AFTER — one call, layout ready
const frame = figma.createAutoLayout('VERTICAL')
```

子节点被追加后可立即使用 `layoutSizingHorizontal/Vertical = 'FILL'`——无需手动设置尺寸模式。

接受可选 props 对象作为第一个或第二个参数：
```js
figma.createAutoLayout({ name: 'Card', itemSpacing: 12 })               // HORIZONTAL + props
figma.createAutoLayout('VERTICAL', { name: 'Column', itemSpacing: 8 })  // VERTICAL + props
```

### `node.placeholder` —— AI 进行中反馈的微光叠加

在节点上设置一个视觉微光叠加，表示工作正在进行。**完成后务必移除微光**——残留的微光会让用户困惑并表明工作未完成。

```js
// Mark as in-progress
frame.placeholder = true

// ... build out the content ...

// MUST remove when done — never leave shimmers on finished nodes
frame.placeholder = false
```

构建复杂布局时，在填充分节之前对分节设置 `placeholder = true`，然后每完成一个分节就对其设置 `placeholder = false`。

### `await node.screenshot(opts?)` —— 内联截图

把节点捕获为 PNG 并在响应中内联返回。省去单独调用 `get_screenshot` 的需要。

```js
// Take a screenshot of a frame (returned inline in the tool response)
await frame.screenshot()

// Custom scale (default auto-scales: 0.5x or capped so max dimension ≤ 1024px)
await frame.screenshot({ scale: 2 })

// Include overlapping content from sibling nodes
await frame.screenshot({ contentsOnly: false })
```

**何时使用：** 遵循规则 5。需要视觉证据时截取一张组合截图。如果随后进行视觉修正，截一张修正后截图；那张通过的截图就是最终版本。不要额外截一张未改动的“最终”截图。

**自动命名：** 图片说明包含节点元数据——`"Card (300x150 at 0,60).png"`——无需解析图片即可提供空间上下文。

**默认缩放：** 使用 0.5x 缩放，但会自动封顶，使最大输出尺寸永不超过 1024px。显式 `{ scale: N }` 会绕过封顶。

## 6. 增量工作流（如何避免 bug）

浪费的最常见原因是不必要的碎片化、冗余验证以及无法安全重试的脚本。**使用规则 5 的可安全重试和基于证据的验证契约。**

### 关键规则

- **按可恢复性而非验证节奏选择调用边界。** 在安全时批量相关的创建、属性更新、父级设置和有针对性的诊断。一个完整页面可以是一次调用；不要仅为了验证每个分节而把它拆成页头/内容/页脚调用。**Slides 覆盖：** 在 Slides 文件中，幻灯片是孤立子树——相关限制是每张幻灯片的复杂度，而不是跨幻灯片的节点总数。一次调用构建 3–5 张新幻灯片是安全的，同一次调用中对演示文稿每张幻灯片应用相同编辑（例如添加页脚、重着色标题）也是安全的。见 [figma-use-slides](../figma-use-slides/SKILL.md) 了解演示文稿构建工作流。
- **自顶向下构建，从占位符开始。** 先创建外部结构，在每个分节上设置 `placeholder = true`，然后在后续调用中增量地用真实内容替换占位符。

### 模式

1. **先检查。** 在创建任何东西之前，运行只读 `use_figma` 以发现文件中已存在的内容——页面、组件、变量、命名约定。匹配已有的内容。
2. **构建骨架。** 用占位分节创建顶层结构。在每个分节上设置 `placeholder = true`，让用户看到进度。
3. **在可安全重试的批次中填充内容。** 当操作保持可安全重试时，可以一起填充多个相关分节。完成后对每个分节设置 `placeholder = false`。
4. **每次调用都返回 ID**（规则 15）——你将需要创建的节点/变量/集合 ID 作为后续调用的输入。
5. **从写入返回验证证据。** 返回 ID 以及相关计数、名称、层级或边界。仅对缺失证据或改动使先前证据失效后添加单独审计。视觉检查遵循规则 5。
6. **继续前先修正。** 如果验证揭示问题，在进入下一步之前修正它。不要在损坏的基础上构建。

### 复杂任务的建议步骤顺序

```
Step 1: Inspect file — discover existing pages, components, variables, conventions
Step 2: Create tokens/variables (if needed)
       → return collection, variable, and mode counts
Step 3: Create individual components
       → return component IDs and relevant child/variant counts
Step 4: Compose layouts from component instances
       → return layout IDs/bounds + take a composition screenshot
Step 5: Apply a targeted visual fix only if needed
       → take one post-fix screenshot; this is final
Step 6: Stop if nothing relevant changed
```

### 每步验证什么

| 之后… | 用 `get_metadata` 检查 | 用 `get_screenshot` 检查 |
|---|---|---|
| 创建变量 | 集合数、变量数、模式名称 | — |
| 创建组件 | 子节点数、变体名称、属性定义 | 变体可见、未折叠、网格可读 |
| 绑定变量 | 节点属性反映绑定 | 颜色/令牌正确解析 |
| 组合布局 | 实例节点有 mainComponent、层级正确 | 无裁剪/截断文本、无重叠元素、间距正确 |

## 7. 错误恢复与自我修正

任何 `use_figma` 错误时，遵循 `safeToRetryWithoutCanvasRead`（规则 14）：`true` → 修正已识别的错误并在不添加诊断性画布读取的情况下重试；`false` → 读取画布，确定发生了什么变化，然后进行更改。如果同一个 API 或属性错误出现两次，检查其定义一次并在重试前修正根本原因；不要围绕同一个无效改动继续分解操作。修复已是关键规则一部分的错误在那里诊断——`"not implemented"`（`figma.notify`，规则 3）、`layoutSizing*` 的 HUG/FILL 拒绝（规则 12、12b）、`"Setting figma.currentPage is not supported"`（规则 9）、变体上的 `componentPropertyDefinitions`（规则 18），以及错误节点类型上的 `characters`/`description`（规则 3a、3b）。下面的行涵盖契约未命名的失败：

| 错误消息 | 可能原因 | 如何修正 |
|---|---|---|
| Property value out of range | 颜色通道 > 1（用了 0–255 而不是 0–1） | 除以 255 |
| `"Cannot read properties of null"` | 节点不存在（错误 ID、错误页面） | 检查页面上下文，验证 ID |
| 脚本挂起 / 无响应 | 无限循环或未解决的 promise | 检查 `while(true)` 或缺失的 `await`；确保代码终止 |
| `"The node with id X does not exist"` | 父实例被子级 `detachInstance()` 隐式分离，改变了 ID | 从稳定的（非实例）父画框遍历重新发现节点 |

### 脚本成功但结果看起来错误时

调用 `get_metadata` 检查结构正确性（层级、计数、位置），调用 `get_screenshot` 检查视觉正确性——仔细查看被裁剪/截断的文本（行高切掉内容）和重叠元素，这些常见且容易被忽略。确定差异是结构性的还是视觉性的，然后编写一个**有针对性的**修正脚本，只修改损坏的部分——不要重建一切。

> 完整验证工作流，见 [Validation & Error Recovery](references/validation-and-recovery.md)。

## 8. 预飞检查清单
在提交任何 `use_figma` 调用之前，对照[第 1 节](#1-critical-rules)中的操作契约重新阅读脚本。曾经在此枚举的每个门禁现在都位于那里——违反其中任何一条的脚本都还没准备好提交：

- [ ] **输出**——使用 `return`（不是 `figma.closePlugin()`），未包在 async IIFE 中，不用 `console.log()` 作为输出；`return` 结构化数据并包含所有创建/修改的节点 ID（规则 1、2、4、15）
- [ ] **颜色与填充**——0–1 范围；paint 的 `color` 只用 `{r, g, b}`（无 `a`）；填充/描边作为新数组重新赋值（规则 6、7）
- [ ] **类型收窄**——`characters`、`description` 和 `componentPropertyDefinitions` 在访问前受保护/收窄（规则 3a、3b、18）
- [ ] **页面**——切换使用 `await figma.setCurrentPageAsync(page)`，每次调用最多一次（规则 9）
- [ ] **布局与尺寸**——相关子节点放在 `figma.createAutoLayout()` 中；顶层节点定位在远离 (0,0) 处；`HUG`/`FILL` 在 `appendChild` 之后设置；`resize()` 在尺寸模式之前；自动换行的 TEXT 使用 `textAutoResize='HEIGHT'` + FIXED 宽度（规则 12、12a、12b、12c、13）
- [ ] **文本**——规范字体配方，样式名称经 `listAvailableFontsAsync()` 验证；`lineHeight`/`letterSpacing` 为 `{unit, value}`；`FONT_FAMILY` 变量先加载每个模式的值（规则 8）
- [ ] **异步与状态**——每个 Promise 都 `await`；多步 ID 作为字符串字面量传递（规则 15、17）

## 9. 创建前先发现约定

**创建任何东西之前始终先检查 Figma 文件。** 不同文件使用不同的命名约定、变量结构和组件模式。你的代码应匹配已有内容，而不是强加新约定。

对任何约定（命名、作用域、结构）有疑问时，先检查 Figma 文件，再检查用户的代码库。仅当两者都不存在时才退回通用模式。

### 快速检查脚本

**列出所有页面和顶层节点：**
```js
const pages = figma.root.children.map(p => `${p.name} id=${p.id} children=${p.children.length}`);
return pages.join('\n');
```

**列出所有页面上的现有组件：**

对于已发布组件，`search_design_system` 是一个选项。对于画布上的组件，使用两步展开——**不要在一个脚本内循环页面。**

步骤 1：一次只读 `use_figma` 获取页面 ID：
```js
return figma.root.children.map(p => ({ id: p.id, name: p.name }));
```

步骤 2：在**下一个助手回合中并行每页发出一个 `use_figma`**（一条包含 N 个工具使用块的消息）。每个运行：
```js
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
// findAllWithCriteria uses an indexed type lookup — hundreds of times faster
// than the findAll(n => n.type === '…') side-effect-in-predicate antipattern.
const matches = page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
return matches.map(n => ({ page: page.name, name: n.name, type: n.type, id: n.id }));
```

**列出现有变量集合及其约定：**
```js
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const results = collections.map(c => ({
  name: c.name, id: c.id,
  varCount: c.variableIds.length,
  modes: c.modes.map(m => m.name)
}));
return results;
```

## 10. 参考文档

根据任务涉及的内容按需加载这些：

| 文档 | 何时加载 | 涵盖内容 |
|-----|-------------|----------------|
| [gotchas.md](references/gotchas.md) | 在任何 `use_figma` 之前 | 每个已知陷阱及 WRONG/CORRECT 代码示例——从[规范文本编辑配方](references/gotchas.md#canonical-text-edit-recipe-font-load--await--mutate--return-ids)开始 |
| [common-patterns.md](references/common-patterns.md) | 需要可运行的代码示例 | 脚本骨架：形状、文本、自动布局、变量、组件、多步工作流 |
| [plugin-api-patterns.md](references/plugin-api-patterns.md) | 创建/编辑节点 | 填充、描边、自动布局、效果、分组、克隆、样式 |
| [api-reference.md](references/api-reference.md) | 需要确切的 API 表面 | 节点创建、变量 API、核心属性、什么可用什么不可用 |
| [validation-and-recovery.md](references/validation-and-recovery.md) | 多步写入或错误恢复 | `get_metadata` vs `get_screenshot` 工作流、强制错误恢复步骤 |
| [component-patterns.md](references/component-patterns.md) | 创建组件/变体 | combineAsVariants、组件属性、INSTANCE_SWAP、变体布局、发现现有组件、元数据遍历 |
| [variable-patterns.md](references/variable-patterns.md) | 创建/绑定变量 | 集合、模式、作用域、别名、绑定模式、发现现有变量 |
| [text-style-patterns.md](references/text-style-patterns.md) | 创建/应用文本样式 | 字号阶梯、通过 `listAvailableFontsAsync` 发现字体、列出样式、把样式应用到节点 |
| [effect-style-patterns.md](references/effect-style-patterns.md) | 创建/应用效果样式 | 投影、列出样式、把样式应用到节点 |
| [plugin-api-standalone.index.md](references/plugin-api-standalone.index.md) | 需要理解完整 API 表面 | Plugin API 中所有类型、方法和属性的索引 |
| [plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts) | 需要确切的类型签名 | 完整类型文件——grep 特定符号，不要一次性全加载 |

## 11. 代码片段示例

你会在此处的文档中看到各种代码片段。这些片段包含有用的 plugin API 代码，可以重新利用。按原样使用，或将其作为起步代码。如果有最好以通用片段记录的关键概念，把它们指出并写到磁盘，以便将来复用。
