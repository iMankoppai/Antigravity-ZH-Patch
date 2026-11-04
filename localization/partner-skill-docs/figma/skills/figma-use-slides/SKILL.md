---
name: figma-use-slides
description: "此技能帮助智能体在 Slides 上下文中使用 Figma 的 use_figma MCP 工具。可与 figma-use 一起使用，后者为使用 use_figma 工具提供基础上下文。"
disable-model-invocation: false
---

# use_figma —— 用于 Slides 的 Figma Plugin API 技能

此技能包含 `use_figma` MCP 工具针对 Slides 的特定上下文。[figma-use](../figma-use/SKILL.md) 技能通过 MCP 提供插件 API 执行的基础上下文，以及此处未描述的更高级用例所需的完整 Figma 插件 API。

**在调用 `use_figma` 进行 Slides 操作时，务必在逗号分隔的 `skillNames` 参数中包含 `figma-use-slides`。如果本技能是通过 MCP 资源加载的，你必须在名称前加上 `resource:` 前缀（例如 `resource:figma-use-slides`）。** 这是一个用于跟踪技能使用情况的日志参数——它不影响执行。

## 选择如何构建 Slides 演示文稿

如果你的环境还提供 `generate_deck` 工具，请为每个演示文稿请求**选择一种**方法——不要为同一演示文稿同时调用两者。

### 何时使用哪种

**`use_figma` + 本技能（默认）：** 处理任何 Slides 任务——新建演示文稿、编辑现有演示文稿、品牌匹配设计、参考文件样式、迭代优化、演讲者备注，以及对布局、颜色和排版的完全创意控制。大多数请求都用这个。

**`generate_deck`：** 使用预构建、精心策划的模板在单次调用中生成完整演示文稿。适用于用户不需要自定义设计、品牌匹配或参考文件样式的快速、直接的演示文稿。它无法使用自定义模板，无法引用其他 Figma 文件作为设计方向，也不支持通过对话进行迭代编辑或后续修改。

拿不准时，默认使用 `use_figma` + 本技能——它涵盖 `generate_deck` 能做的一切以及更多。

### 选定一种并贯彻到底

一旦为某个演示文稿选定了方法，就用该方法完成整个请求。不要用 `generate_deck` 生成演示文稿后又用 `use_figma` 创建或填充文件——用户最终会得到重复、冲突的产物和令人困惑的体验。

## 关键规则（Slides 特有）

1. **新建的 Slides 文件有默认浅色主题。** 通过 `create_new_file` 创建 Slides 文件时，会自动初始化一个默认浅色主题。该主题是结构性脚手架——你应为你正在构建的演示文稿用自己的设计方向覆盖主题的颜色变量和文本样式。不要依赖或受默认浅色主题令牌的影响。
2. **必须在设置 `x`/`y` 之前 `appendChild`——对每个节点、每一层嵌套都是如此。** 新建节点会被静默自动父级到幻灯片上下文中，绝对位置为 `(240, 240)`（幻灯片网格的 `GRID_PADDING`）。在 `appendChild` 之前写入 `x`/`y` 会导致该值被存储到那个隐藏原点；一旦附加真实父级，节点就会落在 `(intended − 240, intended − 240)`。该 bug 是**间歇性的**——同一脚本中的某些画框会逃过它，所以一次通过的测试并不能证明你是安全的。**要识别的特征：** 如果任何节点最终比你设置的位置偏移 `(−240, −240)`，说明你的代码在最终 `appendChild` 之前设置了 `x`/`y`。不要试图通过加回 240 来补偿——那会在重试时产生更差的输出。改为修正顺序。见 [slide-gotchas.md](references/slide-gotchas.md#position-after-appendchild-critical) 的辅助模式，它让顺序不可能出错。
3. **SLIDE_GRID 和 SLIDE_ROW 是不透明节点**——不要访问它们的 `.fills`、`.effects` 或布局属性。只有 `SLIDE` 节点（类型 `'SLIDE'`）扩展 `BaseFrameMixin`。**例外：** `SLIDE_ROW.name` 是可设置的——插件正是这样重命名幻灯片分节的（例如 `slideRow.name = "Intro"`）。见 [slide-lifecycle.md](references/slide-lifecycle.md)。
4. **`get_metadata` 在 Slides 文件上不起作用。** 使用 `use_figma` 只读脚本进行验证。在 `closePlugin()` 输出中返回创建的节点位置，并验证没有重叠的边界框。
5. **不要在 Slides 中调用 `figma.createPage()`。** 它会抛出 `TypeError: figma.createPage no such property 'createPage' on the figma global object`——`createPage()` 仅是 Design 文件的 API（`figma.com/design/...`）；Slides URL 是 `figma.com/slides/...`。改用幻灯片网格（`SLIDE_GRID` / `SLIDE_ROW` / `SLIDE`）来组织演示文稿结构——见 [slide-lifecycle.md](references/slide-lifecycle.md) 和 [slide-grid.md](references/slide-grid.md)。
6. **绝不要删除现有幻灯片来重建它们。** 当被要求改进、重新设计或重新样式化演示文稿时，就地修改现有幻灯片。仅当用户明确要求“从头开始”或“彻底重做”时才删除幻灯片。

## 设计思维

并非每项任务都需要相同深度的设计思维。做任何事之前，先确定你处于哪个档位：

- **内容/属性编辑**——更改文本、替换颜色、更新数字、修正对齐、调整元素大小。跳过设计思维。直接做更改并匹配已有内容。
- **结构性添加**——添加幻灯片、重做一个分节的布局、更改演示文稿的调色板、引入新的视觉元素。包括“改进”“重新设计”或“重新样式化”演示文稿的请求——这些是对已有内容就地编辑，而不是新建演示文稿。设计思维适用，但处于*继承*模式：现有演示文稿就是你的设计语言。检查它，匹配其调色板、字体、空间习惯和母题。扩展现有演示文稿的个性，而不是重新发明它。
- **新建演示文稿**——从零或从空白文件构建演示文稿。如下文所述应用完整的设计思维。

对于现有演示文稿的结构性添加：在更改前运行检查脚本（见下文）并截屏。“什么颜色故事？”和“什么字体处理？”的答案已在文件中——你的工作是读取它们并保持一致。[slide-design.md](references/slide-design.md) 中的设计原则描述的是你要*匹配*的东西，而不是你要*选择*的东西。

### 新建演示文稿的设计流程

在为新建演示文稿编写任何 Plugin API 代码之前，先决定它应该*感觉*像什么。Figma 用户有很高的视觉期望——一个看起来像来自通用模板生成器的演示文稿会以错误的方式引人注目。

1. **阅读简报。** 演示文稿在传达什么，对谁传达？投资者路演、团队回顾、产品发布和技术深入探讨都需要不同的视觉处理。设计应与内容密不可分。
2. **检查是否有设计语言。** 在发明任何东西之前，看看用户已经给了你什么。提示词中的品牌指南——调色板、排版规格、标志规则、语气描述——是已经做出的设计决策。指向参考 Figma 文件的链接是你应该研究（而不只是瞥一眼）的设计语言。用户的输入越具体，你应自行发明的就越少。当用户提供参考时，你的角色从*设计师*转变为*诠释者*：提取设计语言并忠实地应用到新内容。
3. **采取立场——针对剩下未定的部分。** 如果用户提供了完整的品牌系统，你的创意空间在于布局、节奏和构图——而不是颜色或字体。如果他们给了一张参考幻灯片作启发，你有更多余地，但仍应回响其个性。如果他们什么都没给，那么每个决策都由你负责——选择一种颜色故事、一种字体处理、一种组织空间的方式，并在每张幻灯片上贯彻它。一个有清晰视角（哪怕是安静的视角）的演示文稿总比在每个决策上都求稳的演示文稿读起来更好。“采取立场”的范围与用户提供的多少成反比。
4. **赋予它一个签名。** 每个好的演示文稿至少有一个你脱离上下文看到也能认出的元素：独特的调色板、出人意料的布局节奏、反复出现的形状语言。依据品牌指南工作时，签名应*来自*那个品牌语言——放大已经存在的东西，而不是添加格格不入的东西。从零设计时，在开始构建前先确定签名是什么。

### 阅读参考文件

当用户提供指向 Figma 文件的链接作为参考时，在设计任何东西之前研究它。你提取什么取决于文件是什么：

- **Slides 文件**：`get_metadata` 在 Slides 文件上不起作用。使用 `get_screenshot` 捕获单张幻灯片作为视觉参考，并使用 `use_figma` 配合参考文件的 `fileKey` 运行只读脚本，提取主题变量、调色板、字体选择和布局模式。
- **Design 文件**：`get_design_context` 给你全面的设计数据——颜色、排版、布局结构。`get_screenshot` 给你视觉参考。两者都用。

在参考文件中要寻找什么：调色板（哪个色调主导、强调色是什么、深/浅背景如何运用）、字体选择（字族、字重、如何处理层级）、空间习惯（内容锚定在哪、留白多少、是否有元素出血到边缘），以及任何反复出现的母题（形状、线条处理、装饰元素）。这些是你继承的决策——其余的都是你的。

跟随参考的程度取决于用户的请求。“让它看起来像这个”意味着用新内容复现设计语言。“用这个作启发”意味着回响其个性但做出你自己的东西。“这是我们的品牌演示文稿”意味着提取品牌系统并一致地应用它。拿不准时，更贴近参考——让用户要求你偏离，比要求你撤销与品牌冲突的自创选择更容易。

加载 [slide-design.md](references/slide-design.md) 获取关于颜色、字体、布局模式、构图以及要避免什么的特定指导。当你有参考文件或品牌指南时，把 slide-design.md 的原则当作针对用户*未*做决策的默认值——而不是对用户已做决策的覆盖。

## 演示文稿构建工作流

构建 5 张或更多幻灯片的新演示文稿时，使用这个两阶段工作流。它专门为演示文稿构建替代了 [figma-use](../figma-use/SKILL.md) 第 6 节中的通用增量工作流——原则仍适用，但节奏改变。

### 阶段 1 —— 设计与规划

完成上面的设计思维流程（阅读简报、检查设计语言、采取立场、赋予签名），然后**在编写任何 `use_figma` 代码之前**，生成涵盖整个演示文稿的幻灯片计划：

1. **逐页计划。** 对每张幻灯片：其目的/内容、以空间方式描述的布局方法（例如“标题锚定在左上，规格卡片占据右侧三分之一，装饰性圆形出血到右上边缘”），以及背景处理（深/浅/渐变）。规划期间不要计算像素坐标——用空间术语描述布局。坐标计算发生在代码生成阶段。
2. **共享常量。** 声明你将使用的字族和样式、作为命名角色的调色板（primary、accent、bgDark、surface、textPrimary、textMuted 等），以及重复出现的母题或签名元素。
3. **布局多样性检查。** 按顺序通读幻灯片计划。如果布局描述感觉重复——“两栏、两栏、网格、两栏”——在构建前重新安排。这是使布局多样化最省时的时刻。见 [slide-design.md](references/slide-design.md) 了解反模式。
4. **代码前导。** 写出你将粘贴到每个构建脚本顶部的可复用前导：一个 `const C = { ... }` 调色板对象、一个 `Promise.all([...])` 字体加载块，以及来自 [slide-gotchas.md](references/slide-gotchas.md#position-after-appendchild-critical) 的 `addFrame`/`addText`/`addRect` 辅助函数。

### 阶段 2 —— 构建

以大批次执行计划。目标是最小化“思考后再构建”的循环次数——而不是最小化每个脚本的元素数量。

- **每次 `use_figma` 调用 3–5 张幻灯片。** 结构相似的幻灯片（例如一系列产品功能幻灯片）可以放在同一批次。每张幻灯片是孤立的子树——不存在跨幻灯片依赖，所以大批次是安全的。
- **批次之间不要重新规划。** 设计在阶段 1 已决定。如果某批次成功并通过验证，立即进行下一批次。仅当某批次失败或产生需要更改方法的视觉问题时才重新规划。
- **粘贴代码前导**（颜色、字体、辅助函数）到每个构建脚本顶部。从阶段 1 原样复制——不要重新推导。
- **验证每个批次**，使用 [slide-gotchas.md](references/slide-gotchas.md#batch-validation-script) 中的确定性批次验证脚本。它会在大约 3 秒内检查重叠元素、文本裁剪和越界节点。如果检查通过，无需截图直接继续。如果失败，对受影响的幻灯片截屏并在继续前修正。
- **仅在检查点截屏**——第一个批次之后（验证视觉系统：颜色、排版、设计方向），以及最后一个批次之后（整体质量）。每个检查点用内联 `await slide.screenshot()` 截取 1–2 张代表性幻灯片，而不是单独调用 `get_screenshot`。
- **返回所有创建的节点 ID**，如常从每个构建脚本返回。

## 分节

分节是幻灯片网格中的水平行——每一行都是一个分节。名称会显示在编辑器（行旁边）和演讲者视图（Presenter View）中（以便演讲者在各组之间跳转）。它们是给编辑演示文稿的人的组织辅助——断点落在哪里由用户决定，而不是你。

### 当被要求组织演示文稿时

“组织这个演示文稿”是含糊的——分组、重排、去重或重构。在动用 `AskUserQuestion` 之前先阅读演示文稿。

**默认：提议，不要询问。** 大多数演示文稿都有线索——标题首尾呼应、编号用例、重复的*之前/之后*对、过渡幻灯片（“然后 X 登场”）、一张*谢谢*。当线索存在时，选一种分节方案并在一条确认消息中呈现。提议内的有界决定（一个*用例*行还是三行、过渡幻灯片放在哪里）是可逆的——选一个并继续。

**后备：当线索缺失时询问。** 如果幻灯片顺序随意或没有主线，询问哪些范围应放在一起以及如何称呼它们。不要用三等分来替代阅读。

### 命名 + 范围

名称应简短（1–3 个词）、具体（*Demo* 胜过 *Show & tell*），并在演示文稿内保持一致。通常两到五个分节；仅对长或重复的演示文稿才更多。名称不是幻灯片标题——它们帮助找到一个组，而不是描述其内容。

### 重命名分节

`getSlideGrid()` 返回 `SlideNode[][]`——内层数组是幻灯片的普通 JS 数组，而不是 `SLIDE_ROW` 节点。在这些数组上设置 `.name` 会静默无操作。要重命名分节，遍历节点树并在真正的 `SLIDE_ROW` 上设置 `.name`：

```js
const slideGrid = figma.currentPage.children.find(c => c.type === "SLIDE_GRID");
slideGrid.children[0].name = "Intro";
```

## 演讲者备注

演讲者备注是演讲者对每张幻灯片的私人补充。它们出现在演讲者视图（Presenter View）中（仅演讲者可见，观众不可见），并在现场演示中充当脚本、提示单或讲点参考。

### 何时编写演讲者备注

- **当被要求时**：如果用户要求演讲者备注、演示者备注、讲点或演示文稿脚本，为每张有实质内容的幻灯片写备注（跳过分节分隔页或纯装饰幻灯片，除非有话要说）。
- **可现场演示的演示文稿**：如果用户明确要求一个可现场演示的演示文稿，演讲者备注很有用。当它们有助于演讲者理解幻灯片上不可见的节奏、过渡或上下文时，添加它们。
- **稀疏或视觉化幻灯片**：如果幻灯片围绕图表、图片、隐喻或挑衅性问题构建，备注可以帮助解释演讲者应说什么。当视觉上下文重要时，对图片密集、图表密集或视觉稀疏的幻灯片使用截图或 `node.screenshot()`，但默认不要对每张幻灯片截屏——图片会消耗上下文预算。
- **不要未经要求就添加备注**：对于正常的幻灯片编辑、布局工作或对现有演示文稿的更新，除非用户要求，否则不要填充演讲者备注。添加备注会改变演示流程，可能让演示文稿所有者意外。

### 好的演讲者备注是什么样

演讲者备注是给*演讲者*的，不是给观众的。它们应感觉像一位可信的同事俯身低语“这是要说的”。好的备注：

- **补充幻灯片，而不是重复它。** 如果幻灯片说“收入增长 40%”，备注不应说“收入增长 40%”。它们应说*为什么*增长、观众应得到什么要点，或这通常会引出什么问题。
- **简洁且可扫读。** 演讲者说到一半瞥一眼需要立刻找到位置。使用短项目符号，而不是密集段落。每点应是一个想法。
- **包含过渡。** 最好的备注告诉演讲者如何在幻灯片之间*移动*：“掌声平息后……”或“这建立在上一要点之上——回顾 40% 这个数字。”
- **承载幻灯片无法承载的上下文。** 数据来源（“来源：Q4 FY25 内部指标，尚未公开”）、注意事项（“如果 CFO 在场，跳过这张幻灯片”）、时间提示（“这是中点——你应该在约 10 分钟处”），以及预期问题（“他们会问利润率——见附录第 14 张”）。
- **匹配演示的语域。** 投资者路演的备注精确且经过排练。团队回顾的备注轻松灵活。主题演讲的备注可能包含舞台指示。让语气匹配上下文。

### 演讲者备注中要避免什么

- **完整脚本**：大段文本备注会鼓励逐字朗读，这会造就糟糕的演示。如果用户明确要求脚本，写一个，但默认用项目符号。
- **为观众格式化**：备注对观众不可见。不要为非演讲者优化其可读性。
- **与幻灯片冗余**：如果幻灯片自明（带联系信息的“谢谢”），则不需要备注。让一张幻灯片的备注留空没问题。

### 格式化

`slide.speakerNotes` 接受 markdown 字符串。优先用项目符号列表作为主要结构；粗体用于强调演讲者不应跳过的关键短语很有用。见 [slide-properties.md](references/slide-properties.md#supported-formatting) 了解受支持（列表、粗体、斜体、删除线）和不支持（标题、代码块、行内代码、链接）的 markdown 完整列表。

## 检查 Slides 文件

目前还没有专门用于 Slides 文件的读取工具。使用 `use_figma` 配合只读脚本进行检查，并使用 `get_screenshot` / `await node.screenshot()` 获取视觉上下文。

- **创建前先检查。** 在创建任何东西之前，运行只读 `use_figma` 以发现已存在的内容——幻灯片、文本、组件、命名约定。[figma-use](../figma-use/SKILL.md) 第 6 节的“先检查”模式在此适用。
- **`get_metadata` 在 Slides 文件上不起作用**——它仅支持 `figma`（Design）编辑器类型。
- **`console.log()` 输出不会返回**——只有 `return` 值会回来。始终 `return` 你需要的数据。
- **使用 `get_screenshot` 获取视觉上下文**——传入有效的 `nodeId` 以获得截图。你也可以在 `use_figma` 脚本中内联使用 `await node.screenshot()`。

### 快速检查脚本

**列出演示文稿中的所有幻灯片：**
```js
const grid = figma.getSlideGrid();
return grid.map((row, rowIdx) =>
  row.map((slide, colIdx) => ({
    id: slide.id,
    name: slide.name,
    row: rowIdx,
    col: colIdx,
    isSkipped: slide.isSkippedSlide,
    speakerNotes: slide.speakerNotes,
  }))
);
```

**从特定幻灯片获取文本内容：**
```js
const slide = figma.getNodeById("TARGET_SLIDE_ID");
// findAllWithCriteria uses an indexed type lookup — much faster than
// findAll(n => n.type === 'TEXT') on slides with many shapes/images.
const textNodes = slide.findAllWithCriteria({ types: ["TEXT"] });
const fontsToLoad = new Set();
for (const t of textNodes) {
  if (t.fontName !== figma.mixed) {
    fontsToLoad.add(JSON.stringify(t.fontName));
  } else {
    const segments = t.getStyledTextSegments(["fontName"]);
    for (const seg of segments) fontsToLoad.add(JSON.stringify(seg.fontName));
  }
}
for (const f of fontsToLoad) {
  await figma.loadFontAsync(JSON.parse(f));
}
return textNodes.map(t => ({
  id: t.id,
  name: t.name,
  characters: t.characters,
  x: t.x,
  y: t.y,
  width: t.width,
  height: t.height,
}));
```

## 参考文档

只加载任务所需的参考：

- [slide-gotchas](references/slide-gotchas.md) —— Slides 特有的陷阱（坐标偏移、不透明节点类型、验证变通方法）
- [slide-lifecycle](references/slide-lifecycle.md) —— 创建、克隆、删除和重排幻灯片与幻灯片行
- [slide-grid](references/slide-grid.md) —— 使用幻灯片网格布局（`getSlideGrid`、`setSlideGrid`）
- [slide-content](references/slide-content.md) —— 在幻灯片内构建内容（文本、形状、自动布局——SlideNode 扩展 BaseFrameMixin）
- [slide-properties](references/slide-properties.md) —— 幻灯片特有属性（`speakerNotes`、`isSkippedSlide`、`focusedSlide`、`focusedNode`、`slideThemeId`、`InteractiveSlideElementNode`）
- [slide-design](references/slide-design.md) —— 打造视觉有趣、富有变化的演示文稿的设计原则（颜色策略、排版、布局多样性、空间构图、反模式）
