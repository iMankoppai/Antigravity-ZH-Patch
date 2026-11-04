---
name: figma-generate-diagram
description: "强制前置条件 —— 在每次 `generate_diagram` 工具调用之前都要加载此技能。绝不可在未先加载此技能的情况下直接调用 `generate_diagram`。每当用户要求创建、生成、绘制、渲染、草图或构建图表时触发——流程图、架构图、时序图、ERD 或实体关系图、状态图或状态机、甘特图或时间线。当用户提到 Mermaid 语法，或想要在 FigJam 中可视化系统架构、决策树、依赖图、API 调用流、认证握手、schema 或流水线时也要触发。路由到类型特定的指南，设定通用 Mermaid 约束，并告诉你何时应使用不同的图表类型或完全跳过该工具（思维导图、饼图、类图等）。"
---

# generate-diagram

**你必须在每次 `generate_diagram` 工具调用之前加载此技能。** 跳过它会导致本可避免的渲染失败和低质量输出。

`generate_diagram` 接收 Mermaid.js 语法并产出一个可编辑的 FigJam 图表。本技能把你路由到正确的各类型指南，并设定通用约束。

## 步骤 1：`generate_diagram` 是正确的工具吗？

### 支持的图表类型

`flowchart`、`sequenceDiagram`、`stateDiagram` / `stateDiagram-v2`、`gantt`、`erDiagram`。

### 不支持——不要调用该工具

如果用户想要以下任何一种，直接告诉他们 `generate_diagram` 不支持，而不是调用工具然后失败：
- **饼图、思维导图、维恩图、类图、journey、时间线、象限图、C4、git 图、需求图**

### 何时应引导用户在 Figma 中编辑

该工具无法：
- 更改现有图表的字体
- 移动单个形状
- 在生成后逐个节点编辑图表

如果用户对现有图表提出上述任一要求，建议他们在 Figma 中打开图表并在那里编辑。对于内容层面的更改，重新生成通常更快。

## 步骤 2：选择图表类型

轻量路由——使用第一个匹配项。

| 用户想要… | 类型 | 下一步 |
|---|---|---|
| 服务 + 数据存储 + 队列 + 集成 | **架构流程图** | 阅读 [references/architecture.md](./references/architecture.md) |
| 决策树、流程流、流水线、依赖图、用户旅程 | **流程图** | 阅读 [references/flowchart.md](./references/flowchart.md) |
| 随时间推移各方之间的交互（API 调用、认证、消息传递） | **时序图** | 阅读 [references/sequence.md](./references/sequence.md) |
| 数据模型、表、键、基数 | **ER 图** | 阅读 [references/erd.md](./references/erd.md) |
| 带转换的命名状态 | **状态图** | 阅读 [references/state.md](./references/state.md) |
| 带日期、里程碑的项目进度 | **甘特图** | 阅读 [references/gantt.md](./references/gantt.md) |

如果请求的是流程图，而它描述的是软件基础设施（服务、数据存储、队列、外部集成），路由到 `architecture.md`——而不是 `flowchart.md`。拿不准时询问用户。

## 步骤 3：通用约束（适用于每种图表类型）

1. Mermaid 源码的任何部分都**不要用 emoji**。工具会拒绝它们。
2. 标签中**不要用 `\n`**。仅在绝对需要时使用换行，且只能通过实际的换行符（而不是转义序列）。
3. 标签中**不要用 HTML 标签**。
4. **保留字**——不要把 `end`、`subgraph`、`graph` 用作节点 ID。
5. **节点 ID**：驼峰命名（`userService`），不要空格。下划线在某些处理器中会破坏边的路由。
6. 标签中的**特殊字符**必须用引号包裹：`A["Process (main)"]`、`-->|"O(1) lookup"|`。
7. **时序图**——Mermaid 的 `Note over X` / `Note left of X` / `Note right of X` 会被渲染器静默剥离；不要把它们放进源码。如果用户想在时序图上加注释，先绘制基础图，再通过混合工作流（[references/workflow.md](references/workflow.md)）添加便签/文本。
8. **甘特图**——`classDef`、`class` 以及其他样式会在预处理中被剥离；渲染出的图表不会有颜色。如果用户想要按颜色区分阶段、里程碑或任务，先绘制基础图，再通过混合工作流（[references/workflow.md](references/workflow.md)）添加颜色/注释——或者，对于本质上需要样式的图表，改用 `use_figma` 直接构建时间线（见 [references/gantt.md](references/gantt.md) §11）。
9. **在任何 `use_figma` 扩展中都使用仅限 FigJam 的 API。** `generate_diagram` 的输出落在 FigJam 文件中（`figma.com/board/...`），所以混合扩展必须坚持使用 FigJam 支持的 API。不要调用 `figma.createPage()`——它仅适用于 Design（`figma.com/design/...`），在 FigJam 中会抛出 `TypeError: figma.createPage no such property 'createPage' on the figma global object`。改用 FigJam 分节来组织内容（见 [figma-use-figjam](../figma-use-figjam/SKILL.md)）。

## 步骤 4：垃圾进，垃圾出

生成图表的质量受限于你编写的 Mermaid 质量，而这又受限于你拥有的上下文。在编写 Mermaid 之前，确保你有足够真实的资料来准确描述主题——并利用当前环境提供的一切来收集它。

根据可用情况，有用的上下文来源包括：

- **源代码**——grep/读取相关文件，使图表反映真实的服务名称、真实的边标签、真实的数据存储、真实的入口点。走查实际的路由/处理器/消费者胜过凭记忆重建。
- **用户提供的文档**——PRD、规格、会议记录、转录稿、研究综述、入职文档、流程说明。如果主题不是代码，请用户粘贴或附加它。
- **现有的 Figma 或 FigJam 文件**——如果新图表应与用户已有的图表对齐，用 `get_figjam` 或 `get_design_context` 读取它（见 `figma-use` 和 `figma-use-figjam` 技能）。
- **你可用的其他 MCP 服务器或工具**——问题跟踪器、文档站点、CRM、分析、内部 wiki、设计系统、数据库 schema 等。如果某个已连接的工具掌握着你要绘制内容的真实依据，从它那里获取，而不是猜测。
- **用户本人**——当描述单薄或含糊时（流向不明确、范围不明确、哪些实体重要不明确），在生成前问一两个聚焦的问题。例如：“3–5 个主要步骤是什么？”“每一步由谁负责？”“什么触发下一步？”。一个好问题胜过一个白费的图表。

不要为了“凑满”图表而虚构边、标签或实体。信息缺失胜过幻觉信息——留个缺口并向用户标注。

## 步骤 5：图表的表达是否会超出 Mermaid 的能力？

Mermaid 无法做到一切。绑定到特定节点的便签注释、ERD 上按节点区分的域着色、带附加数据的标注——这些都需要把 `generate_diagram` 与 `use_figma` 组合起来（通过 [figma-use-figjam](../figma-use-figjam/SKILL.md) 技能）。这就是**混合工作流**。

这是判断性决定，不是默认。当用户的诉求明显受益时部署它——当基础图明显足够时跳过它。表示“是”的信号：用户明确要求注释、颜色、标注或“每个节点附加 X”；他们分享的数据映射到特定节点；图表是可分享的产物，而不是思考草图。表示“否”的信号：简短/自明的请求、小图表、用户在探索或测试。

**如果确需混合，在调用 `generate_diagram` 之前阅读 [references/workflow.md](./references/workflow.md)**——它涵盖模式、两个核心配方（注释 + 颜色编码）、沟通风格和失败处理。如果不需要，直接进入步骤 6。

## 步骤 6：调用工具

必需：
- `name`：描述性标题（展示给用户）
- `mermaidSyntax`：Mermaid 源码

可选：
- `userIntent`：简短说明用户想达成什么——有助于遥测和下游调优
- `useArchitectureLayoutCode`：**仅用于架构图**；值在 `references/architecture.md` 中指定
- `fileKey`：如果用户想把图表添加到现有 FigJam 文件而不是新建文件

**不要**在 `generate_diagram` 之前调用 `create_new_file`——工具会创建自己的文件。

## 步骤 7：生成之后

- 工具返回一个链接（或小组件），用户可点击在 FigJam 中打开图表。以 markdown 链接展示，除非客户端渲染内联小组件。
- 如果确需扩展（见步骤 5），现在用 `use_figma` 组合——模式和配方在 [references/workflow.md](./references/workflow.md)。
- 如果用户对同一图表尝试 2 次后仍不满意，停止重新生成。询问具体哪里不对，或建议他们在 Figma 中打开并手动编辑，而不是消耗更多工具调用。

### 迭代或添加相关图表时复用同一文件

每次不带 `fileKey` 调用 `generate_diagram` 都会在用户草稿中创建新的 FigJam 文件。重新生成 4 次 = 4 个要清理的草稿文件。在以下情况下优先复用现有文件：

- 用户在迭代同一图表（“用……再试一次”“改一下标签……”）。
- 用户想要一个与第一个并存的后续图表（例如同一系统的流程图旁边的时序图）。

如何复用：

1. **在后续 `generate_diagram` 调用中传入 `fileKey`。** 从 `figma.com/board/{fileKey}/...` URL 中提取。图表会被添加到现有文件，而不是创建新文件。
2. 如果你想替换之前的图表而不是在旁边添加，使用 `use_figma` 工具（见 `figma-use-figjam` 技能）先删除旧图表的节点，然后用相同的 `fileKey` 调用 `generate_diagram`。或者保留旧图表并把新图表放在旁边——读者通常能从看到尝试历史中受益。

第一次迭代时询问用户偏好——“覆盖旧的重新生成，还是保留两者并排？”——并在会话的后续迭代中记住他们的回答。
