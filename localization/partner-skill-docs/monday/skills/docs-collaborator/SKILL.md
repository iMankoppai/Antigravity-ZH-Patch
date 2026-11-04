---
name: docs-collaborator
description: |
  创建、读取、编辑并评论 monday.com 文档——monday 内部用于会议纪要、RFC、
  runbook、每周更新、复盘，以及任何与工作相关写作的富内容界面。
  它超越了单纯的 markdown 搬运，可内联嵌入实时看板列值（让文档反映实时
  状态）、通过提及标记用户/文档/看板、搭建常见文档形态，并把每次编辑
  通过正确的 update_doc 操作路由。当用户要求“create a doc”、“make a monday doc”、
  “draft meeting notes”、“write an RFC”、“scaffold a runbook”、
  “summarize a meeting in a doc”、“add a section to my doc”、“edit my doc”、“update the doc”、
  “comment on a doc”、“tag someone in a doc”、“embed a status in a doc”、
  “show live board data in a doc”、“rename a doc”或“show me my docs”时使用。
license: MIT
metadata:
  author: monday.com
  version: "0.2.1"
---

# 文档协作

创建、读取、编辑并评论 monday.com 文档。**本技能是一个能力界面，而不是模板引擎。** 每个文档都是类型化块的流（标题、段落、列表、表格、代码、分隔线、提示框、布局、嵌入的看板 / 部件 / 文档 / 图像 / 视频 / GIF）。下面列出的具名形态只是起点——可自由组合与扩展。差异化能力（实时列值嵌入、内联提及、提示框、布局）适用于任何形态，无论具名还是自创。

相较于原始 markdown 编辑器，平台原生价值体现在大多数构建者忽略的三件事上：对用户/文档/看板的内联提及、反映看板条目当前状态的**实时列值嵌入**，以及防止损坏文档块图的闭环编辑模式。

## 核心约束——先读这个

**绝不编辑你尚未读取的块。** monday 的 update_doc API 基于块 ID，而块 ID 只能通过带 `include_blocks: true` 的 `read_docs` 得知。跳过读取会导致操作引用不存在的 ID（静默失败），或更糟——复用另一个文档的 ID。闭环模式不可协商：

1. `read_docs` 配合 `include_blocks: true` 获取块 ID、类型与位置。
2. 按类型与位置、或按内容确定目标块。
3. `update_doc` 使用与目标块类型匹配的操作（见下面的路由规则）。

## 块操作路由——不那么显而易见的部分

每种块类型都有不同的允许变更集。选错操作是“调用成功但文档看起来不对”这类 Bug 的头号原因。

| 目标块类型 | 使用此操作 | 原因 |
|---|---|---|
| text（任意子类型：NORMAL_TEXT、LARGE_TITLE、MEDIUM_TITLE、SMALL_TITLE、QUOTE） | 内容编辑用 `update_block`；更改子类型（例如把段落提升为 H2）用 `replace_block` | 子类型在创建时设定；`update_block` 无法更改它 |
| code | `update_block` | 内容与语言可原地编辑 |
| list_item（BULLETED_LIST、NUMBERED_LIST、CHECK_LIST） | 内容编辑用 `update_block`；在无序 / 有序 / 检查列表之间切换用 `replace_block` | 列表变体在创建时设定 |
| divider | 仅 `replace_block` | 无可变属性 |
| table | 仅 `replace_block` | 行/列数与列宽不可变；表格单元格内容在创建后无法通过 API 寻址——见 `references/rich-content.md` 的“Tables” |
| image | 换源用 `replace_block` | URL / asset_id 在创建后不可变 |
| video | 换源用 `replace_block` | raw_url 在创建后不可变 |
| notice_box | 更改主题用 `replace_block` | 主题不可变；内容位于子块中（见 `references/rich-content.md` 的“Notice boxes”） |
| layout | 仅 `replace_block` | 单元格内容完全无法通过 API 填充——见 `references/rich-content.md` 的“Layouts” |
| BOARD 嵌入、WIDGET 嵌入、DOC 嵌入、GIPHY | 仅 `delete_block` | 没有公开 API 可创建或修改这些块类型 |

**渲染怪癖——list_item 通过 `update_block` 添加提及。** 当向一个原本只含文本的 list_item 添加内联提及时，`update_block` 可能正确保存提及 blot（数据可证实），但某些客户端可能无法渲染该药丸标签（文本前缀在提及之前的情形）。变通办法：用 `replace_block` 换成一个包含相同 delta 的新 list_item。同样的模式在 `normal_text` 块中渲染正常；该怪癖似乎仅见于 list_item 更新。

关于每种块类型的完整细节与示例，见 `references/block-operations-matrix.md`。在编写任何非平凡的结构性编辑之前阅读它。

## 工作流：创建文档

### 步骤 1：确定位置

monday 文档位于两个位置之一：

- **工作区**（最常见）。需要 `workspace_id`。可选 `doc_kind`：`public`（默认）、`private`（仅创建者）、`share`（特定人员）。可选 `folder_id` 以嵌套到文件夹下。
- **附加到条目**。文档位于特定看板条目的文档类型列中。需要 `item_id`。如果用户选择了特定文档列，则可选 `column_id`；否则工具会自动创建一个。

**附加到条目的文档的单元格上限预检。** 文档类型单元格每个单元格只容纳一个文档——这是硬性 API 限制。在调用 `create_doc location=item` 之前，通过 `get_board_items_page` 配合 `columnIds: [<doc_col_id>]` 预检目标列，检查该单元格是否已被填充。如果已填充，请勿尝试创建——它会以 `CellLimitExceededException` 失败。改为**创建一个工作区级文档，并在新文档与现有附加文档之间添加双向 DOC 提及交叉链接**。绝不要自动分离现有文档。

如果用户未指定工作区，回退到通过 `get_user_context` 获取的用户主工作区。如果仍不明确，询问一次；不要在多个工作区之间猜测。

### 步骤 2：创建第 4 个文档之前的套餐层级防护

**Free 与 Basic 套餐每账户上限为 3 个文档。** 在 Free / Basic 账户上调用 `create_doc` 之前，检查这是否会成为第 4 个文档。没有直接的文档计数工具，因此实用的防护是：如果用户以前曾触及此限制，或问“我能创建超过 3 个文档吗？”，请提醒他们——升级到 Standard+ 可取消该上限。把套餐层级当作待定问题，而不是阻塞创建调用；平台自身会在达到上限时拒绝。

### 步骤 3：编写正文——形态是示例，不是边界

`create_doc` 接受一个 `markdown` 参数，导入时会被解析为块。保持在几个章节内；长正文用 `add_markdown_content` 追加（见 `references/errors.md`）。当用户说明某个用例时，以下常见形态之一可作为起点，然后自由扩展：

- **会议纪要：** 标题、日期、参会人（带 `@mentions`）、议程要点、决策、行动项表格、后续事项。
- **每周更新：** 亮点、关键指标、风险、下周计划。
- **RFC：** 问题、提议方案、考虑过的替代方案、未决问题、决策日志。
- **Runbook：** 触发器、前置条件、编号流程、回滚步骤、升级路径。
- **复盘：** 事件摘要、时间线、根因、做得好之处、不足之处、行动项。

当用户自创一种形态（“合作伙伴赋能页面”、“AI 就绪快照”、“Q3 入职上下文”）时，凭判断力组合——章节、表格、提示框、嵌入——而不是强行套用某个具名模板。差异化能力适用于任何形态。

**被动与主动模式。** 默认用可见的槽位标记（`_[embed: ...]_`、`_[mention: ...]_`）在你希望放置嵌入与提及的位置搭建骨架。当用户以名称引用条目、看板或人员时，切换到主动模式——接入真实的嵌入与提及——自行把名称解析为 ID（若名称有歧义，用前 3 个候选询问一次），并说明你选择了什么。在接入任何东西之前阅读 `references/create-modes.md`：其中有标记格式、升级触发条件、名称到 ID 的解析链，以及沟通契约。

值得注意的 Markdown 要点：

- Markdown 标题（`#`、`##`、`###`）映射到 LARGE_TITLE / MEDIUM_TITLE / SMALL_TITLE 块。
- Markdown 表格可用，单元格会用你填入的值填充。**这是获得预填表格内容的唯一方式。** 创建后通过 API 填充单元格不受支持。
- Markdown 图像与链接可用。对于基于资源的图像（monday 中上传的文件），在创建后使用 `update_doc` 配合 `create_block` 与 `block_type: "image"` 加 `asset_id`——markdown 无法引用资源。
- Markdown 没有 notice_box、layout、embed、带间距的分隔线、mention 或实时列值语法。在文档创建后通过 `update_doc` 添加这些。

### 步骤 4：调用 `create_doc`

```
create_doc({
  doc_name: "<title>",
  location: "workspace",
  workspace_id: <id>,
  doc_kind: "public" | "private" | "share",  // optional
  folder_id: <id>,                            // optional
  markdown: "<full markdown body>"
})
```

对于附加到条目（预检之后）：

```
create_doc({
  doc_name: "<title>",
  location: "item",
  item_id: <id>,
  column_id: "<doc_column_id>",  // optional
  markdown: "<full markdown body>"
})
```

捕获返回的 `doc_id`、`object_id` 与 `doc_url`。用户需要 URL 来分享或打开；`doc_id` 是后续每次编辑的主键。

### 步骤 5：叠加富内容附加项

提及、实时列值嵌入、提示框、布局与资源图像都需要一次后续的 `update_doc` 调用。在主动模式下，现在就用步骤 3 中解析好的 ID 接入它们。在被动模式下，保留槽位标记——用户稍后通过指定条目填写槽位。见 `references/delta-format-cheatsheet.md` 的“Common patterns”。

### 步骤 6：确认并建议下一步

平实语言确认：名称、工作区、文档 URL。说明所用的模式（被动骨架或主动）。然后给出 2-3 个契合该形态的后续：

- “要我用 @mentions 标记参会人吗？”
- “要我嵌入项目看板的实时状态吗？”
- “要我在顶部加一个带会议结果的提示框吗？”
- “要我把文档 URL 分享到某个 Slack 频道吗？”

## 工作流：读取文档

### 步骤 1：解析文档标识符

用户可能用三种方式指向文档：

- **doc_id**（例如 `41302579`）——API 的主键，由 `create_doc` 与 `read_docs` 返回。
- **object_id**（例如 `18411484379`）——文档 URL 中的数字片段：`https://monday.monday.com/docs/{object_id}`。
- **文档名称或模糊引用**（“Q3 复盘文档”）——通过 `read_docs` 配合 `type: "workspace_ids"` 列出工作区中的文档，然后按名称匹配。

`read_docs` 很宽容：如果你用 `type: "ids"` 调用它而值实际上是一个 `object_id`，它会自动以 `object_ids` 重试。依赖这一点，而不是猜测。

### 步骤 2：决定读取什么

两种模式：

- **content**（默认）——返回文档的块和/或 markdown 投影。
  - 若后续有任何编辑，`include_blocks: true` 是**强制性的**。不要省略它。
  - `include_comments: true` 以获取所有评论与回复。用 `comments_limit` 设置上限（默认 50）。
- **version_history**——返回文档的编辑历史（恢复点）。传 `object_id`，而不是 `id`。为“最近 N 次更改”请求设置 `version_history_limit`；设置 `include_diff: true` 查看改了什么（较慢）。

### 步骤 3：用已解析的提及与嵌入渲染，而不是占位符

API 的 `blocks_as_markdown` 投影会把提及渲染为 `@{USER-XXX}` 占位符，把实时列值嵌入渲染为空白。**对于“让我看看这个文档里有什么”的提示，这不是正确的渲染**——用户打开文档时看到的是药丸与实时芯片；文本渲染应与之对应。

对于“让我看看 / 里面有什么 / 读这个文档”的提示：把每个提及解析为显示名称、在成本低廉时把嵌入解析为其当前值，并添加一个内联非文本元素及其 ID 的枚举表。关于确切规则，阅读 `references/read-rendering.md`。

不要用 `show-table` 展示文档内容——文档本身就是 UI。在聊天中用 markdown 渲染。

## 工作流：编辑文档

### 步骤 1：先读取

`read_docs` 配合 `include_blocks: true`。这是闭环前置条件。捕获每个块的 `id`、`type` 与位置。

### 步骤 2：选择正确的操作

选用能完成任务的最简单操作：

- **在末尾添加新内容：** `add_markdown_content`（无需块 ID；支持文本、列表、表格、代码）。
- **添加基于资源的图像：** `create_block` 配合 `block_type: "image"` 与 `asset_id`（markdown 不支持资源图像）。
- **原地编辑现有文本 / 代码 / list_item 内容：** `update_block` 配合匹配的 `block_content_type`（`text`、`code` 或 `list_item`）。
- **更改块的子类型**（段落 -> H2、无序 -> 有序、INFO 提示 -> WARNING 提示）：`replace_block`。子类型仅在创建时设定。
- **在精确位置插入块：** `create_block` 配合 `after_block_id`。没有 `before_block_id` 操作——要在文档最顶部插入，唯一的路径是在文档第一个块之后插入。
- **删除：** `delete_block`。这是 BOARD / WIDGET / DOC 嵌入 / GIPHY 块的唯一路径。
- **评论：** `add_comment`——HTML 正文；通过 `mentions_list` 标记人员，而不是在正文中用 `@`（见 `references/rich-content.md` 的“Comments”）。
- **重命名文档：** `set_name`。

完整的类型到操作路由见 `references/block-operations-matrix.md`。

### 步骤 3：为 text / code / list_item 编写 delta_format

`update_block` 与 `create_block` 对内容块接受一个由插入操作组成的 `delta_format` 数组。三条规则支配每个 delta：

1. 最后一个操作必须是 `{insert: {text: "\n"}}`。始终如此。没有例外。
2. 纯文本使用 `{insert: {text: "..."}}`，可带可选 `attributes`（bold、italic、underline、strike、code、link、color、background）。
3. 两种非文本插入解锁差异化能力：
   - 提及：`{insert: {mention: {id: <numeric-id>, type: "USER" | "DOC" | "BOARD"}}}`。通过 `list_users_and_teams` 解析用户 ID（始终传入 `name` 以限定调用范围）。
   - 实时列值嵌入：`{insert: {column_value: {item_id: <id>, column_id: "<column_id>"}}}`。每次打开文档时都实时渲染该条目该列的当前值。

示例与完整属性表见 `references/delta-format-cheatsheet.md`。

### 步骤 4：谨慎批处理操作

`update_doc` 一次调用最多接受 25 个操作，按顺序执行，遇到第一个失败即停止。四个陷阱：

- **提示框嵌套需要两次调用。** 在同一次调用中创建的 notice_box 无法被同一调用中后续操作通过 `parent_block_id` 引用。先创建 notice_box，捕获返回的 ID，然后进行第二次 `update_doc` 调用来嵌套子项。
- **位置依赖。** 如果操作 B 引用由操作 A 创建的块的位置，优先分成两次调用。数组中途失败会让文档处于部分状态。
- **同块冲突检测。** 当同一次调用（或同一用户回合）中的多个操作针对同一 `block_id` 时，在执行前把冲突呈现给用户——“最后写入获胜”是观察到的行为。示例：`update_block` 给段落 X 添加一个提及，然后稍后的 `update_block` 完全替换段落 X。第二个获胜；提及丢失。
- **评论锚点存在于 delta 中。** 当块有锚定评论时，读取响应会在相关文本插入上显示 `attributes.comments: [<update_id>, ...]`。`update_block` 会替换整个 delta_format，因此一次干净的重写会把评论从块上分离（评论本身在后端条目上存活，但失去其块链接）。要在编辑中保留锚定评论，请在新 delta 中匹配的文本插入上包含 `comments` 属性。

### 步骤 5：验证并确认

非平凡编辑之后，用 `include_blocks: true` 重新读取以确认块按预期落地。平实语言确认：改了什么、文档 URL。不要叙述 API 调用。

## 富内容：表格、提示框、布局、提及、实时嵌入、评论

实时列值嵌入是差异化能力：它们让文档与真实看板数据保持同步。在添加其中任何元素之前，阅读 `references/rich-content.md`。它涵盖表格约束、提示框嵌套、布局、提及类型、实时列值嵌入与评论。

## 明智的默认值

当用户未指定所有值时：

- **工作区**：通过 `get_user_context` 获取用户的主工作区。说明该默认值。如果有多个工作区都合理，询问一次。
- **doc_kind**：`public`（平台默认）。
- **文件夹**：无（工作区根目录）。
- **文档形态**：如果用户说明某个用例（“会议纪要”、“RFC”、“每周更新”），搭建匹配形态作为起点，并按用户的具体要求扩展。如果用户自创形态，凭判断组合——无需模板。
- **模式**：默认被动骨架（槽位标记）。仅当存在基于名称的意图信号时，才升级到主动模式（真实嵌入 / 提及 / 交叉链接）。
- **主动模式下的嵌入与提及**：在接入之前说明解析出的选择与推理。提供覆盖选项。

在响应中说明每一个默认值，以便用户覆盖。

## 写入前校验前置条件

- **文档存在：** 在任何写入之前，`read_docs` 已对目标 ID 成功。
- **块 ID 真实：** 操作数组中的每个 `block_id` 都来自最近一次 `read_docs` 调用。
- **用于提及的用户 ID：** 通过 `list_users_and_teams` 解析（始终带 `name` 或 `userIds` 过滤）。
- **用于嵌入的条目 ID 与列 ID：** 写入前用 `get_board_info` 与 `get_board_items_page` 确认二者。状态列 ID 始终是看板专属的（例如 `color_mm2x25ey`），绝不是通用的字面量 `"status"`。
- **工作区存在：** 如果用户指定了名称但未提供 ID，使用 `list_workspaces`。
- **附加到条目的文档的单元格容量：** 在 `create_doc location=item` 之前通过 `get_board_items_page` 预检目标文档列（见步骤 1）。
- **主动模式的空数据兜底：** 当用户意图引用的列没有任何值（例如“最高优先级”但 Priority 列全为 null）时，不要静默选取。检测空状态、向用户披露（“所有条目上都没有设置 Priority 值”）、提供一个带明确推理的兜底启发式（“改为按 Status + 截止日期临近度挑选”），并提供覆盖。

## 写入前的重复检测

**在任何 `create_block`、`add_markdown_content`、`add_comment` 或替换内容的 `update_block` 之前，将拟定内容与文档中的现有块进行比较。** 默认在匹配时跳过并报告；向用户呈现选项；绝不静默重复。

按块类型的匹配启发式：

| 块类型 | 匹配启发式 |
|---|---|
| text / heading / quote / code | 完全相同的 delta 文本 + 相同子类型 |
| list_item | 完全相同的文本 + 相同列表类型 + 相邻性（多个条目段落作为一个组匹配） |
| notice_box | 相同主题 + 相同子文本 |
| table | 相同维度 + 相同单元格内容 |
| mention | 相同 block 位置上的相同 user_id |
| column_value embed | 相同 block 位置上的相同 item_id + column_id |
| comment | 相同正文 + 相同锚点（默认排除——见下文） |

发现匹配时的技能行为：

1. **默认：跳过 + 报告。**“X 已存在于 <位置>。跳过以避免重复。”
2. **呈现选项**（不要静默选择）：
   - **(a) 跳过**——保留现有，什么都不做
   - **(b) 重复**——按请求继续，接受冗余
   - **(c) 替换**——删除现有，新建一个
   - **(d) 移动**——仅当新请求带有与现有匹配位置冲突的明确位置意图（“在最顶部 / 在最底部 / 在 X 之后”）时才提供

重复属正常、检测不应触发的排除项：

- **评论被排除**，除了短暂的卡顿窗口。相同的评论正文在 60 秒内提交到相同范围（文档或块）几乎可以肯定是重复提交 / 网络重试；超过该时间则视为合法（合法的复审、情绪回应）。
- 列表中相邻的同样式块——是预期的结构，不是重复。
- 在不同父项下重复的章节名称（例如两个不同 H2 下的两个“Action Items”H3）。

把这条重复检测规则应用到技能中的每一条写入路径。

## 带补救地呈现错误

当调用失败时，告诉用户出了什么错以及如何修复。常见失败及其补救的目录（格式错误或过期的块 ID、schema 不匹配、单次调用中的嵌套、单元格上限、空白嵌入、套餐限制、不支持的块类型、孤儿评论锚点）见 `references/errors.md`。

## 对破坏性操作保持保守

以下操作需要明确确认：

- 一次调用删除 3+ 个块。
- 删除某个块，而它是其父项中唯一的内容（会删除父项的唯一内容；父项会留作空壳）。
- 删除 notice_box、table 或 layout——子项不会自动删除；它们会成为孤儿。要么先删除子项，要么接受孤儿状态。
- 批量 replace_block 操作（每次替换都是一次删除 + 创建；不可逆）。
- 重命名一个有实时外部引用的文档（Slack 消息、其他文档、条目更新）。

单块编辑、单块创建与单条评论不需要额外确认——用户已经提出了要求。

## 何时使用 MCP UI 部件

文档就是 UI。不要渲染 `show-table` 或 `show-chart` 来展示文档内容。纯文本确认与 markdown 总结才是正确的输出。

## 平实语言优先于原始 JSON

绝不要告诉用户“我调用了 `read_docs`，然后用 `update_block` 操作调用了 `update_doc`”。用人话说改了什么：“已用新的升级联系人更新了你 runbook 的第二段。”始终包含文档 URL。

## 使用的工具

- `get_user_context` —— 解析用户的主工作区
- `list_workspaces` —— 未提供时按名称查找工作区
- `create_doc` —— 在工作区中创建文档，或附加到条目；markdown 正文在创建时作为块导入
- `read_docs` —— 获取一个或多个文档（内容模式）或版本历史；任何编辑前 `include_blocks: true` 是强制性的；`include_comments: true` 用于评论线程
- `update_doc` —— 顺序操作：`set_name`、`add_markdown_content`、`update_block`、`create_block`、`delete_block`、`replace_block`、`add_comment`
- `list_users_and_teams` —— 为提及与 `mentions_list` 解析用户 ID（始终传入 `name` 或 `userIds` 以限定范围）
- `get_board_info` —— 在写入实时列值嵌入前校验列 ID；为主动模式嵌入接线预检看板结构
- `get_board_items_page` —— 在写入实时列值嵌入前校验条目 ID；为附加到条目的创建预检文档列单元格；在主动模式下把条目名称解析为 ID
- `search` —— 在主动模式下按名称模糊解析文档或按名称解析看板

## 附加资源

- **`references/block-operations-matrix.md`** —— 按块类型允许的操作、陷阱与示例载荷。
- **`references/create-modes.md`** —— 被动骨架槽位标记、主动模式触发条件、名称到 ID 的解析以及沟通契约。
- **`references/rich-content.md`** —— 表格、提示框、布局、提及、实时列值嵌入与评论。
- **`references/read-rendering.md`** —— 读取文档时如何渲染提及、嵌入与内联元素。
- **`references/errors.md`** —— 常见失败及其补救方式。
- **`references/delta-format-cheatsheet.md`** —— delta_format 插入操作、属性、提及、column_value 嵌入、终止符规则、常见模式以及被动模式槽位标记格式。
