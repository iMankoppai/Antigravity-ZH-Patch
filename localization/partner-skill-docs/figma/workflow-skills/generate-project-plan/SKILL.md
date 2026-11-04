---
name: generate-project-plan
description: "从 PRD 加代码库上下文生成 FigJam 项目计划看板。交互式流程：研究 → 提议分节 → 逐节深入研究 → 逐节内容 + 块形状提议 → 创建 FigJam → 骨架 → 填充 → 图表 → 收尾。每个内容块（分节、嵌套分节、引言标注、表格、多栏文本、便签栏、图表分节、元数据条）都有自己的子技能参考文件。当用户要求'project plan in FigJam'、'interactive project plan'、'/generate-project-plan'，或提供 PRD 并希望逐节确认内容 + 渲染时使用。"
disable-model-invocation: false
---

# generate-project-plan

把 PRD（加上可选的代码库依据）转化为 FigJam 项目计划看板。分节集合不是固定的——技能从研究中提议候选，由用户挑选要包含哪些。对于每个被选中的分节，技能提议内容 + 渲染形状（块），由用户确认。

## 强制前置条件

**基础技能**（按名称加载；在 `figma/mcp-server-guide` 中可用）：

- `figma-use` —— **每个会话加载一次。** 保持在上下文中用于所有 `use_figma` 调用。
- `figma-use-figjam` —— **每次 `use_figma` 调用前重新加载。**
- `figma-generate-diagram` —— **每次 `generate_diagram` 调用前重新加载。**

**基础参考**（在此插件中）：

- [`foundation/palette.md`](references/foundation/palette.md) —— 分节 + 便签 + 文本调色板常量（`hex/255`）。
- [`foundation/layout.md`](references/foundation/layout.md) —— 画布几何、尺寸规则、占位符生命周期。
- [`foundation/plugin-api-traps.md`](references/foundation/plugin-api-traps.md) —— 已记录的 FigJam `use_figma` 陷阱。
- [`foundation/codebase-grounding.md`](references/foundation/codebase-grounding.md) —— 步骤 1 的扩展规则。

**分节目录**：

- [`section-catalog.md`](references/section-catalog.md) —— 约 10 个候选分节及其默认块和调色板。

**块子技能**（每种内容类型一个——在每次 `use_figma` 填充调用前重新加载你需要的那个）：

| 块 | 文件 | 何时加载 |
|---|---|---|
| 顶层分节 | [`blocks/section.md`](references/blocks/section.md) | 骨架阶段（步骤 6）和每次填充调用（步骤 7） |
| 嵌套分节 | [`blocks/nested-section.md`](references/blocks/nested-section.md) | 对子内容进行分组的填充（例如 "Design Decisions 1/2/3"） |
| 引言标注 | [`blocks/intro-callout.md`](references/blocks/intro-callout.md) | 以高亮引言开场的填充（例如 Motivation） |
| 文本基础件 | [`blocks/text-primitives.md`](references/blocks/text-primitives.md) | 任何使用正文段落、H3 子标题或项目符号列表的填充 |
| 表格 | [`blocks/table.md`](references/blocks/table.md) | 带结构化数据的填充（Resources、Goals、Dependencies、Rollout、Milestones） |
| 多栏文本 | [`blocks/multi-column-text.md`](references/blocks/multi-column-text.md) | 带 2–4 个选项栏的填充（Design Decisions 备选项） |
| 便签栏 | [`blocks/sticky-column.md`](references/blocks/sticky-column.md) | 带便签列表的填充（Success Metrics、Risks、Open Questions） |
| 图表分节 | [`blocks/diagram-section.md`](references/blocks/diagram-section.md) | 右栏图表分节（步骤 8） |
| 元数据条 | [`blocks/metadata-strip.md`](references/blocks/metadata-strip.md) | 骨架阶段——看板顶部的一条元数据条 |

**还要传递** `skillNames: "figma-use,figma-use-figjam,generate-project-plan"` 到 `use_figma` 调用（仅日志）。

## 视觉 UI 约定 —— 严格，不要偏离

这些源自一个规范参考看板。阅读事实来源文件获取完整常量；本节是单处摘要，使智能体能回答“什么颜色 / 尺寸 / 字体 / 内边距？”而无需到处翻找。

### 颜色（每个分节双色调）

每个左栏分节使用**同色相的两种协调颜色**：极浅的 `ARCH_PALE` 背景，以及该分节内任何表格标题所用的稍饱和 FigJam-`SECTION` 调色板颜色。右栏图表分节是纯白色。

| 分节背景（`ARCH_PALE.X`） | 表格标题（`TABLE_HEADER.lightX`） | 色相 |
|---|---|---|
| `#F8F5FF` | `#DCCCFF` | 紫罗兰 |
| `#EBFFEE` | `#CDF4D3` | 绿 |
| `#DBF0FF` | `#C2E5FF` | 蓝 |
| `#F5FBFF`（备选） | `#C2E5FF` | 浅蓝 |
| `#FFF7F0` | `#FFE0C2` | 橙 |
| `#F1FEFD` | `#C6FAF6` | 青 |
| `#FFFBF0` | `#FFEC BD` | 黄 |
| `#FFEEF8` | `#FFC2EC` | 粉 |
| `#FFEEE8` | `#FFCDC2` | 红 |

来源：`references/foundation/palette.md`。绝不要把深饱和调色板（`#874FFF`、`#3DADFF` 等）用于表格标题——那是给 FigJam 独立表格用的，不是项目计划看板。

架构图子图颜色由 `generate_diagram` 自动应用，**不得覆盖**。其规范值：`client #AFF4C6` 圆角矩形，`gateway #FFFFFF` 方形（若标注为 "Load Balancer"/"ALB"/"LB" 则为菱形），`service #E4CCFF` 方形，`datastore #BDE3FF` 圆柱，`external #FFFFFF` PREDEFINED_PROCESS，`async #BDE3FF` ENG_QUEUE。

### 排版（字体大小）

| 元素 | 大小 | 字体 | 颜色 |
|---|---|---|---|
| H1（看板标题） | **40** | Inter Medium | `#1E1E1E` |
| H2（分节标题——每个分节的第一个子节点） | 40 | Inter Medium | `#1E1E1E` |
| H3 —— 全宽子标题（例如 Motivation 内的 "Resources"） | **40** | Inter Medium | `#1E1E1E` |
| H3 —— 嵌套分节标题（例如 "Design Decision 1: …"） | **32** | Inter Medium | `#1E1E1E` |
| H3 —— 2/3/4 栏布局中的栏标题（Risks 栏、Goals 栏） | **24** | Inter Medium | `#1E1E1E` |
| 正文文本 | 16 | Inter Medium | `#1E1E1E` |
| 表格单元格（标题**和**正文） | 16 | **Inter Bold** | `#1E1E1E` |

三种不同的 H3 尺寸是有意的。40 = 当子标题单独位于分节中时匹配 H2 字重。32 = 子分节内的子节标题（672px 内宽）。24 = 窄上下文中的栏标题（≤ 224px 栏宽）。按**容器宽度**选择，而不是按语义深度。

在任何创建表格（Bold）加其他文本（Medium）的 `use_figma` 脚本顶部，始终同时加载 `Inter Medium` **和** `Inter Bold`。

### 分节属性

| 属性 | 值 |
|---|---|
| `section.fills` | `[{ type: 'SOLID', color: ARCH_PALE.X }]`（左栏）或 `ARCH_PALE.white`（右栏 / 图表） |
| `section.name` | `""` —— 空字符串。无 FigJam 标题栏标签。内部的 H2 是唯一标题。 |
| 内边距（四边） | 32（当前默认；参考用 40-50，暂时保持 32） |
| 第一个子节点位置 | `(32, 32)` |
| 宽度（左栏） | 800 |
| 宽度（右栏 / 图表） | 图表被重新父级后 `max(1200, diag.width + 64)` |
| 分节之间的垂直间隙（在包裹内） | **64** |
| 包裹行为 | 手动：追加子节点后调用 `section.resizeWithoutConstraints(w, maxChildBottom + 32)`。分节**不会**自动增长。 |
| 构建期间占位符 | 骨架阶段 `placeholder = true`；分节填充结束时 `placeholder = false`。 |

### 外层包裹 + 栏对齐（严格默认值）

看板有**一个外层包裹**（无标签，白色）加上图表栏：

1. **栏包裹** —— 位于 `(_, 0)` 的无标签白色 SECTION。按从顶到底的顺序包含：
   - H1 项目标题（40px Inter Medium，炭黑）位于 `(64, 64)`（= 分节内边距）
   - 元数据正文行：Owner / Status / Last updated / Source（16px Inter Medium，炭黑），位于 `(64, h1.y + h1.height + 16)`——H1 下方 16px 间隙；每个正文单元格之间 32px 间隙
   - 正文行下方 64px 间隙，然后是 6 个左栏分节以 64px 间距堆叠
2. **图表栏**位于 `(columnWrapperRight + 64, 0)`。每个图表是它自己的未包裹白色 SECTION；**顶部图表的 y 与栏包裹的 y（= 0）对齐**。图表以 64px 间距堆叠。

元数据**嵌入**在栏包裹中（不是单独的分节）。一个栏包裹容纳所有与文本相关的东西。

**常量：**
- 包裹内边距（四边）：**64**
- 包裹内分节之间的垂直间隙：**64**
- 包裹右边缘与图表栏左边缘之间的水平间隙：**64**
- 图表栏顶部与 `wrapper.y` 对齐（与包裹顶边相同的水平轴）
- 堆叠图表分节之间的垂直间隙：**64**（匹配内部间距）

```js
const PAD = 64;
const leftIds = [/* all left-column section ids in order */];
const sections = [];
for (const id of leftIds) sections.push(await figma.getNodeByIdAsync(id));

// Compute bbox of the column in page coords
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const s of sections) {
  minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
  maxX = Math.max(maxX, s.x + s.width); maxY = Math.max(maxY, s.y + s.height);
}

const wrapper = figma.createSection();
wrapper.name = "";                                                              // STRICT
wrapper.fills = [{ type: 'SOLID', color: WHITE }];                              // ARCH_PALE.white
wrapper.resizeWithoutConstraints((maxX - minX) + 2*PAD, (maxY - minY) + 2*PAD);
wrapper.x = minX - PAD;
wrapper.y = minY - PAD;

// Reparent + translate to keep visual positions
for (const s of sections) {
  const newX = (s.x - minX) + PAD;
  const newY = (s.y - minY) + PAD;
  wrapper.appendChild(s);
  s.x = newX;
  s.y = newY;
}
```

包裹没有页头（内部无 H2）也没有名称——它是一个纯容器。不要在这里重复项目标题；那在元数据条中。

**在包裹存在后定位图表栏：**

```js
const wrapperRight = wrapper.x + wrapper.width;
const diagramX = wrapperRight + 64;       // 64px horizontal gap matches inter-section gutter
let y = wrapper.y;                          // align top with wrapper's top edge
for (const id of diagramSectionIdsInOrder) {
  const d = await figma.getNodeByIdAsync(id);
  d.x = diagramX;
  d.y = y;
  y += d.height + 64;                     // 64px vertical gutter between stacked diagrams
}
```

### 垂直间距（严格）

| 之间 | 间隙 |
|---|---|
| 分节顶边 → H2（第一个子节点） | 32（= 内边距） |
| H2 → 下一个子节点（正文 / 引言标注 / H3 / 表格 / 第一栏） | **24** |
| 正文段落 → H3 | **24** |
| H3（任意尺寸：40 / 32 / 24）→ 下一个子节点（正文 / 表格 / 列表 / 栏内容） | **24** |
| 正文 → 正文 | **24** |
| 列表 → 下一个块 | **24** |
| 最后一个子节点底部 → 分节底边 | 32（= 内边距） |

**始终使用 `prevChild.y + prevChild.height + 24` 定位子节点**——绝不要使用像 `prevChild.y + 60` 这样的固定偏移。H3 有三种不同尺寸（40 / 32 / 24），所以固定偏移按定义就是错的；在设置字体大小后始终读取 `prevChild.height`。

**当你事后更改页头的字体大小时，你必须重新堆叠下游子节点。** 设置 `h3.fontSize = 40` 会增大节点高度；如果下一个子节点的 `y` 是在调整大小之前计算的，它会重叠。

### 表格

- **标题和正文单元格**都使用 `Inter Bold` 16px（不是 Medium）。
- 标题文本是 `#1E1E1E` 炭黑，位于浅色填充上（匹配分节的色相）。
- 正文单元格填充保持默认白色；文本是炭黑。
- 标题不使用深底白字——那对这种看板风格是错的。

### 图表（右栏）

带 `useArchitectureLayoutCode: "FIGMA_DIAGRAM_2026"` 的 `generate_diagram` 会产生**多个页面级节点**（1–2 个子图 SECTION + 裸 SHAPE_WITH_TEXT + CONNECTOR），而不是单个容器。要把它们包裹在分节中：
1. 收集所有新页面级节点（排除已知的计划分节 ID）。
2. 计算 bbox。
3. 创建一个新 SECTION，尺寸为 `bboxW + 64 × bboxH + 64 + 64`（HEADER_BLOCK = 40 H2 + 24 间隙），填充 `ARCH_PALE.white`。
4. 重新父级每个图表节点，平移本地坐标以保持视觉布局。
5. **关键——在重新父级后删除并重建每个连接线。** 赋给自身的技巧（`c.connectorStart = c.connectorStart`）不可靠：短连接线重新路由正常，但长弯连接线会保留过时的弯头路径点，并延伸到分节外数百像素。从捕获的 spec 删除 + `figma.createConnector()` 每次都能产生干净的路线。见 [`blocks/diagram-section.md`](references/blocks/diagram-section.md) 了解 spec 捕获 + 重建模式。
6. **连接线标签——显式 `fontName` + `fontSize` + `fills` 全部必需。** 新连接线的 `text` 子层没有可用的默认值。设置**全部四项**：`c.text.fontName = { family: 'Inter', style: 'Medium' }`、`c.text.fontSize = 14`、`c.text.characters = label`、`c.text.fills = [{ type: 'SOLID', color: CHARCOAL }]`。默认 `text.fills` 是**`[]`（空数组）**，所以标签渲染为**透明**且不可见——`c.text.characters` 的读回会骗你；用截图验证。

图表分节约定：`section.name = ""`，内部 H2 文本节点作为标题（与看板其余部分一致）。

### 不要使用什么（常见错误默认值）

| 不要用 | 改用 | 原因 |
|---|---|---|
| `#CDF4D3`（FigJam lightGreen）作分节背景 | `#EBFFEE`（ARCH_PALE.green） | 在图表旁边太饱和 |
| `#C2E5FF`（FigJam lightBlue）作分节背景 | `#DBF0FF` 或 `#F5FBFF`（ARCH_PALE.blue / blueLite） | 同上 |
| `#874FFF`（FigJam 深紫罗兰）作表格标题 | `#DCCCFF`（FigJam lightViolet） | 参考用浅色配浅色，不是深色配浅色 |
| 深色表格标题上的白色文本 | 浅色标题上的 `#1E1E1E` 炭黑文本 | 同上——浅色配浅色约定 |
| 表格单元格用 `Inter Medium` | `Inter Bold` | 参考对所有单元格用 Bold |
| `section.name = "Goals"`（或任何非空字符串） | `section.name = ""` | 参考用空名称；内部 H2 是标题 |
| 只重新父级生成图表的一个子图 | 重新父级所有页面级节点（SECTION + SHAPE + CONNECTOR） | 架构图不是单个节点 |
| 相信 `c.connectorStart = c.connectorStart` 会重新路由每个连接线 | 重新父级后，从捕获的 spec **删除并重建每个连接线** | 长弯连接线保留过时的弯头路径点；只有 `figma.createConnector()` 产生新路线 |
| 在新连接线上只设置 `c.text.characters = label` | 设置 `c.text.fontName`、`c.text.fontSize`、`c.text.characters` 和 `c.text.fills` | 默认：fontSize 缺失，fills=`[]`（空数组 → 透明）→ 尽管读回正确，标签仍不可见 |

## 步骤模板

下面每个步骤都使用此形状。阅读步骤，然后执行。

```
## Step N — <Name>  [Type: Research | Confirm | Write]
Inputs required: …
Ask if missing: …
Tools / refs loaded: …
Do: (3–6 action bullets)
Checkpoint: (Research → self-check; Confirm → AskUserQuestion; Write → screenshot + AskUserQuestion)
```

三种步骤类型：
- **研究（Research）**——只读；检查点 = 自检清单。
- **确认（Confirm）**——无看板写入，用户决策门；检查点 = `AskUserQuestion`。
- **写入（Write）**——创建/改动 FigJam；检查点 = 截图 + `AskUserQuestion`。

---

## 步骤 1 —— 收集上下文  [Research]

**所需输入**
- PRD 文件路径或粘贴的文本。
- 可选：代码库入口点（文件路径、服务名、文档路径）。

**缺失时询问**
- "PRD 在哪？（路径或粘贴）。"
- "有什么代码库入口点我应该作为依据？（路径 / 服务 / 文档 / 'none'）。"

**加载的工具 / 参考**
- `Read`、`Glob`、`Grep`。
- [`foundation/codebase-grounding.md`](references/foundation/codebase-grounding.md)。

**做**
1. 阅读 PRD。提取：标题、问题、目标、非目标、负责人、受众、成功指标、推出提示、风险。
2. 如果提供了入口点：遵循 `codebase-grounding.md`——有界 20 文件上限、深度 1 导入、向上走到 `CLAUDE.md`/`ARCHITECTURE.md`/`OWNERS`。
3. 产出**技术上下文对象**：`files_read`、`services`、`external_deps`、`key_modules`、`architecture_notes`、`ownership`、`expansion_truncated`。

**自检**
- 有：项目标题、问题陈述、至少 1 个具体目标、负责人（或 "TBD"）、涉及的服务（或带原因的空列表）。
- 有足够信号在步骤 2 起草候选分节卡片。若没有，回到前面询问。

---

## 步骤 2 —— 提议候选分节  [Confirm]

**所需输入**
- 来自步骤 1 的技术上下文对象。

**加载的工具 / 参考**
- [`section-catalog.md`](references/section-catalog.md)。
- `AskUserQuestion`。

**做**
1. 对目录中的每个分节，根据步骤 1 判断它是否有*真实内容*。跳过会为空或凑数的目录条目。
2. 对每个合格候选，产出一张卡片：
   - **标题**（目录名称）
   - **一行描述**（此分节将包含什么，针对 PRD 具体化）
   - **为何建议**（哪些 PRD 事实或技术上下文项证明它合理）
   - **默认块形状**（来自目录）
3. 把所有卡片打印到聊天。
4. 触发 `AskUserQuestion`，**每批 ≤4 个候选**用一个 multiSelect 问题（每次调用最多 4 个问题，每个 4 个选项 → 每次调用最多 16 个候选）。每个选项的标签是分节标题；描述是一行摘要。

**检查点（AskUserQuestion）**
- 上述 multiSelect 问题。用户勾选他们想要的分节。把选中集存为 `approved_sections`。
- 如果零个分节被选中 → 用干净退出消息停止。不创建文件。

---

## 步骤 3 —— 逐节深入研究  [Research]

**所需输入**
- 来自步骤 2 的 `approved_sections`；来自步骤 1 的技术上下文。

**加载的工具 / 参考**
- `Read`、`Grep`、`Glob`（可选）。

**做**
1. 对 `approved_sections` 中的每个分节，查找其目录条目。目录声明该分节需要什么（例如 Dependencies 需要跨团队服务 + 外部依赖 + 阻碍）。
2. 比较该分节需要什么 vs. 技术上下文有什么。
3. 为每个分节产出**差距列表**：用户必须提供的具体事实，表述为可回答的问题（不要"自己去搞清楚"式的差距）。

**自检**
- 每个 `approved_sections` 条目都有 `ready`（无差距）或具体非空的差距列表。
- 差距是可回答的——不是像 "告诉我更多关于 X" 这样含糊的提示。

---

## 步骤 4 —— 逐节内容 + 块提议  [Confirm]

**所需输入**
- 来自步骤 3 的差距列表。

**加载的工具 / 参考**
- `AskUserQuestion`。
- [`section-catalog.md`](references/section-catalog.md)。
- 该分节默认形状的块参考（例如 Dependencies 用 `blocks/table.md`）。

**做**，每节（一次一个，或如果琐碎则小批量）：
1. 填补差距列表——散文用自由文本提示；有界选择用 `AskUserQuestion`。
2. 提议：
   - **内容**：将出现的具体项目符号 / 行 / 便签。
   - **块形状**：渲染块（正文段落 / 表格 / 多栏 / 便签栏 / …）。默认来自 `section-catalog.md`；在合理时提供替代形状（例如"作为表格，还是作为多栏布局？"）。
3. 显示一个简短预览——分节标题 + 正文第一行 + 块类型摘要。
4. 触发 `AskUserQuestion`："使用此内容 + 形状？[Yes / Edit / Skip this section]。"
5. Edit → 接受自由文本修订，重新显示，重新询问。Skip → 把分节标记为 `skipped`；不写入看板。

**检查点**
- 每个分节都是 `approved`、`edited+approved` 或 `skipped`。尚无看板写入。

---

## 步骤 5 —— 创建 FigJam 文件  [Write]

**所需输入**
- `approved_sections`（未跳过）；项目标题；`planKey`（Figma 团队计划）。

**加载的工具 / 参考**
- `create_new_file` MCP 工具。
- `whoami` MCP 工具（若 `planKey` 未知）。
- `use_figma`（一次）。
- `figma-use`（从步骤 5 起已在上下文中）。
- `figma-use-figjam`（为探测而重新加载）。
- `AskUserQuestion`。

**做**
1. 解析 `planKey`：调用 `whoami`。如果一个计划 → 使用它。如果多个 → `AskUserQuestion` 哪个团队。
2. 用 `{ planKey, fileName: "<project title>", editorType: "figjam" }` 调用 `create_new_file`。捕获 `file_key` + `file_url`。
3. 运行首次探测（`use_figma`）：

```js
const page = figma.currentPage;
return {
  rootName: figma.root.name,
  editorType: figma.editorType,
  pageCount: figma.root.children.length,
  firstPageName: figma.root.children[0].name,
  currentPageChildrenCount: page.children.length,
};
```

预期 `editorType === "figjam"` 且页面为空。如果不是，停止并报告。

**检查点（探测输出 + AskUserQuestion）**
- 打印探测返回 + `file_url`。
- AskUserQuestion："文件已创建于 `<file_url>`——继续到骨架？[Yes / Cancel]。" Cancel = 停止，留下空文件。

---

## 步骤 6 —— 骨架阶段  [Write]

**所需输入**
- 按分类顺序的 `approved_sections`；来自 `foundation/palette.md` 的调色板；来自 `foundation/layout.md` 的布局常量。

**加载的工具 / 参考**
- `use_figma`（一次调用）。
- 重新加载 `figma-use-figjam/SKILL.md`。
- 重新加载 `blocks/section.md` 和 `blocks/metadata-strip.md`。
- [`foundation/palette.md`](references/foundation/palette.md)、[`foundation/layout.md`](references/foundation/layout.md)。

**做**
1. 按 `blocks/metadata-strip.md` 创建元数据条（H1 + 4 个正文文本在板面 `(0, 0)`–`(0, ~100)`）。
2. 对每个批准分节，按 `blocks/section.md` 创建一个顶层 SECTION——背景色来自 ARCH_PALE，`section.name = ""`（无标题栏标签——严格），`placeholder = true`，左栏分节用 `resizeWithoutConstraints(LEFT_COL_W, DEFAULT_H)`，右栏图表分节用 `resizeWithoutConstraints(RIGHT_COL_W_MIN, DEFAULT_H)`。
3. 把每个左栏分节定位在 `(0, SECTION_TOP_Y + cumulative_y)`。右栏分节在 `(832, SECTION_TOP_Y + cumulative_y_right)`。
4. 返回所有创建的节点 ID：`{ createdNodeIds: { metadataStrip: {...}, sections: { <slug>: "<id>", ... } }, status: "skeleton-complete" }`。（`slug` 是内部的，用于查找调色板并驱动步骤 7 的填充。它绝不会写入 `section.name`。）
5. 在 `await figma.currentPage.screenshot({ scale: 0.3 })` 截一张内联截图。

**检查点（截图 + AskUserQuestion）**
- AskUserQuestion："骨架看起来对吗？[Yes / Fix / Cancel]。" Fix = 有针对性的修正脚本；Cancel = 停止。

---

## 步骤 7 —— 填充阶段（每节一次调用）  [Write]

**所需输入**
- 每个分节的批准内容 + 块形状；来自步骤 6 的分节 ID。

**加载的工具 / 参考**
- `use_figma`（每节一次调用）。
- 重新加载 `figma-use-figjam/SKILL.md`。
- 重新加载此分节使用的任何块参考：
  - 始终 `blocks/section.md`。
  - 若有正文/H3/列表，则 `blocks/text-primitives.md`。
  - 若有表格，则 `blocks/table.md`。
  - 若多栏，则 `blocks/multi-column-text.md`。
  - 若有嵌套子节，则 `blocks/nested-section.md`。
  - 若有高亮引言，则 `blocks/intro-callout.md`。
  - 若有便签，则 `blocks/sticky-column.md`。

**做**，每节：
1. `await figma.getNodeByIdAsync(sectionId)`——确认类型是 SECTION。
2. 构建内容：先 H2 页头，然后按批准的块形状添加子节点。先追加到分节，再设置 x/y。
3. 按 `blocks/sticky-column.md` 对便签做两遍测量。
4. `section.resizeWithoutConstraints(LEFT_COL_W, computed_height)`。
5. `section.placeholder = false`。
6. 内联 `await section.screenshot()`。
7. `return { mutatedNodeIds: [...], sectionHeight, screenshotIncluded: true }`。

**检查点（截图 + AskUserQuestion）**
- 每节：AskUserQuestion："分节 `<name>` 完成了吗？[Yes / Edit this section / Skip rest]。" Edit = 有针对性的修正；Skip rest = 退出填充循环（用户将手动完成）。

**所有左栏填充之后**：运行重新堆叠过程（单次 `use_figma`），根据实际调整后的高度修正累计 Y：

```js
let y = SECTION_TOP_Y;
for (const id of leftColumnSectionIdsInOrder) {
  const sec = await figma.getNodeByIdAsync(id);
  sec.y = y;
  sec.x = 0;
  y += sec.height + 32;
}
return { mutatedNodeIds: leftColumnSectionIdsInOrder };
```

**然后运行外层包裹过程**（单次 `use_figma`）——把所有左栏分节包裹在一个无标签的白色外层 SECTION 中（见上文视觉约定块中的"外层栏包裹"）。这是严格的；不要跳过。

---

## 步骤 8 —— 图表  [Write]

**所需输入**
- 来自步骤 2/4 的图表意图（Current State、Target State、0–N Key Flows）；用于 Mermaid 组合的技术上下文。

**加载的工具 / 参考**
- 每次 `generate_diagram` 调用前重新加载 `generate-diagram/SKILL.md`。
- 每次重新父级 `use_figma` 调用前重新加载 `figma-use-figjam/SKILL.md` + `blocks/diagram-section.md`。
- `generate_diagram` MCP 工具、`use_figma`。

**做**，每个图表：
1. `use_figma`：按 `blocks/diagram-section.md` 创建右栏分节（白色填充，H2 页头，`placeholder = true`）。
2. `generate_diagram`：从技术上下文组合 Mermaid；架构图使用 `useArchitectureLayoutCode: "FIGMA_DIAGRAM_2026"`。
3. `use_figma`：定位生成的图表节点，重新父级到分节（`section.appendChild(diag)`），定位在 H2 下方，调整分节大小以适配。`placeholder = false`。
4. `await section.screenshot()`。

**失败处理**：如果 `generate_diagram` 失败，在分节中留下一个文本占位符，内容为 `"Diagram generation failed: <message>. Regenerate manually."`。继续下一个图表。

**检查点（截图 + AskUserQuestion）**
- 每个图表：AskUserQuestion："图表 `<name>` 看起来对吗？[Yes / Regenerate / Skip]。"

---

## 步骤 9 —— 最终审查 + 报告  [Write，然后 Read]

**所需输入**
- 来自步骤 5 的 `file_url`。

**加载的工具 / 参考**
- `use_figma`（一次调用用于整页截图）。

**做**
1. `await figma.currentPage.screenshot({ scale: 0.25 })`——完整看板。
2. 检查：两栏结构、无重叠、没有分节保留 `placeholder = true`、元数据条可见。
3. 用有针对性的 `use_figma` 脚本修正任何问题。**不要**从头重新生成。
4. 发布到聊天：

```
✅ Project plan written to FigJam.
File: <file_url>
Sections: <N text + N diagram>
Files referenced during grounding: <count>
```

**检查点（截图 + AskUserQuestion）**
- AskUserQuestion："完成，还是微调？[Done / Tweak]。" Tweak = 按用户请求的有针对性修正脚本，不是重新生成。

---

## 操作规则

- 每次 `use_figma` 调用 ≤10 个逻辑操作。
- 始终从每个写入脚本返回 `createdNodeIds` / `mutatedNodeIds`。
- 所有调色板颜色使用 `hex/255` 记法（见 `foundation/palette.md`）。
- **严格：分节背景使用 `ARCH_PALE` 调色板，而不是 FigJam 标准 SECTION 调色板。** ARCH_PALE 颜色（`#EBFFEE`、`#F8F5FF`、`#F5FBFF`、`#FFF7F0` 等）在视觉上与 `generate_diagram` 产生的架构图子图包裹相配。FigJam SECTION 调色板（`#CDF4D3`、`#C2E5FF`、`#DCCCFF`、`#FFE0C2`）太饱和，会在图表旁边造成明显的颜色冲突。见 `foundation/palette.md`。
- **严格：每个项目计划分节（左栏、右栏和嵌套子节点）都要 `section.name = ""`。** 面向用户的标题作为分节*内部*的 H2 文本节点渲染，而不是通过 FigJam 的分节标题栏标签。参考看板使用空分节名称；设置非空 `name` 会产生重复标签，在视觉上使看板杂乱。
- 在每个 Confirm/Write 检查点读取、编辑或取消——绝不要在未回答的 AskUserQuestion 之后继续写入。
- 如果 `use_figma` 脚本出错：原子性——不做任何更改。阅读错误，修正，重试。

## 触发短语

"/generate-project-plan"、"interactive project plan"、"project plan"、"make a FigJam project plan"、"PRD to FigJam"。
