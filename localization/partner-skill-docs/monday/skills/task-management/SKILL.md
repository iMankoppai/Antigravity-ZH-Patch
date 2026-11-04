---
name: task-management
description: |
  在 monday.com 各看板上创建、更新、分配并管理条目。monday.com
  是一个可定制的 AI 工作平台，拥有面向工作管理、
  CRM、开发、服务与营销活动的专用产品。为所有列类型处理正确的列值格式化。
  当用户要求“create a task”、“add an item”、“update status”、“assign to”、
  “change due date”、“move item”、“mark as done”、“create a subitem”、“add a comment”
  或“update the priority”时使用。
license: MIT
metadata:
  author: monday.com
  version: "0.2.0"
---

# 任务管理

在 monday.com 看板上创建、更新、分配并管理条目。在 monday.com 中，看板上的每一行都是一个“条目”（item）——它可以代表一个任务、一笔交易、一个 Bug、一篇内容，或任何工作单元。本技能讲授 monday.com API 所要求的正确列值格式化——这是以编程方式使用该平台时最常见的错误来源。

## 关键前置条件

**在创建或更新任何条目之前，始终先调用 `get_board_info`**，以获取看板的列定义。你需要：
- 列 ID（例如 `status`、`date4`、`person`）
- 列类型（例如 `status`、`date`、`people`）
- 状态标签映射（例如哪个索引对应“Done”）
- 下拉列允许的值

没有这一步，列值写入会静默失败或设置错误的值。

## 工作流：创建条目

### 步骤 1：找到目标看板

如果用户指定了看板名称：
1. 用看板名称调用 `search` 找到它
2. 如果有多个结果，与用户确认匹配项

如果用户未指定：
1. 调用 `get_user_context` 列出他们的看板
2. 询问使用哪个看板

### 步骤 2：获取看板结构

用看板 ID 调用 `get_board_info`。注意：
- 所有列 ID 及其类型
- 分组 ID 与名称（以知道把条目放在哪里）
- 状态标签选项（确切的标签字符串，如“Working on it”、“Done”）

### 步骤 3：获取列类型细节（若需要）

如果你需要了解某列类型的确切格式，用该列类型调用 `get_column_type_info`。这返回 JSON schema 与校验规则。

### 步骤 4：创建条目

调用 `create_item`，传入：
- `boardId`：目标看板 ID
- `groupId`：放置条目的分组（来自步骤 2）
- `itemName`：条目名称
- `columnValues`：带列值的 JSON 字符串（见下面的格式化指南）

### 步骤 5：确认并跟进

创建之后：
- 用平实语言报告做了什么——不要叙述 API 调用
- 包含条目名称、看板名称，以及 MCP 工具返回的直接 URL
- 建议 2-3 个合乎逻辑的下一步，例如：
  - “要我给这个分配某人吗？”
  - “要我设置截止日期吗？”
  - “要把它拆成子条目吗？”
  - “要我添加一条带更多上下文的评论吗？”

## 工作流：更新条目

### 步骤 1：定位条目

如果用户提供了条目名称但没有 ID：
1. 调用 `get_board_info` 了解看板结构
2. 用搜索查询调用 `get_board_items_page` 找到该条目
3. **把返回的名称与用户的目标名称交叉核对。** `get_board_items_page` 配合 `searchTerm` 的行为是相关性排序，而不是严格的名称过滤——当不存在真正匹配时，它仍会返回条目，按部分重叠排名。写入之前，扫描返回列表寻找精确（不区分大小写）或近乎精确的名称匹配。如果返回的条目没有一个是名称匹配目标的，则把该搜索当作无匹配结果并转到步骤 4，即使响应非空。
4. 如果有多个结果匹配，写入前与用户确认匹配项
5. 如果没有名称匹配的结果，不要静默失败，也不要写入排名最近但名称错误的条目。请用户确认名称、建议你看到的最接近匹配，或提出列出该看板的条目

### 步骤 2：获取看板结构

若尚未执行，调用 `get_board_info`。在写入值之前你必须知道列 ID 与类型。

### 步骤 3：更新列值

调用 `change_item_column_values`，传入：
- `boardId`：看板 ID
- `itemId`：条目 ID
- `columnValues`：仅包含要更改的列的 JSON 字符串

### 步骤 4：确认

用平实语言报告改了什么：条目名称、更新了哪些字段，以及新值。始终包含直接 URL。不要描述调用了哪些 API 工具。

## 何时使用 MCP UI 部件

默认使用纯文本确认。当用户要求分配工作并需要从一长串队友中挑选时，使用 `show-assign`——该部件渲染一个用户可与之交互的人员选择器。对于用户已指名受派人的单人分配，只需通过 `list_users_and_teams` 查询用户 ID 并直接写入，无需该部件。

不要用 `show-table` 确认单次创建或更新——纯文本加上条目 URL 更干净。

## 列值格式化指南

`create_item` 与 `change_item_column_values` 的 `columnValues` 参数是一个 JSON 字符串。每种列类型都需要特定格式。**弄错这一点是失败的头号原因。**

关于所有列类型的完整格式化参考，见 **`references/column-value-formats.md`**。

最常见类型的快速参考：

**Status** —— 使用 `{"label": "Done"}`，并配上 `get_board_info` 中的确切标签字符串：
```json
{"status_column_id": {"label": "Done"}}
```

**Date** —— 使用 `{"date": "YYYY-MM-DD"}`：
```json
{"date_column_id": {"date": "2025-06-15"}}
```

**People** —— 使用 `{"personsAndTeams": [{"id": USER_ID, "kind": "person"}]}`：
```json
{"person_column_id": {"personsAndTeams": [{"id": 12345678, "kind": "person"}]}}
```

**Text** —— 普通字符串值：
```json
{"text_column_id": "Some text value"}
```

**Numbers** —— 数字的普通字符串：
```json
{"numbers_column_id": "42"}
```

**Email** —— 使用 `{"email": "...", "text": "..."}`：
```json
{"email_column_id": {"email": "user@example.com", "text": "Contact"}}
```

**Phone** —— 使用 `{"phone": "...", "countryShortName": "..."}`：
```json
{"phone_column_id": {"phone": "+15551234567", "countryShortName": "US"}}
```

**Dropdown** —— 使用 `{"labels": ["Option 1", "Option 2"]}`：
```json
{"dropdown_column_id": {"labels": ["High Priority"]}}
```

**Timeline** —— 使用 `{"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}`：
```json
{"timeline_column_id": {"from": "2025-06-01", "to": "2025-06-30"}}
```

**Link** —— 使用 `{"url": "...", "text": "..."}`；`text` 是必需的（若没有标签则重复 URL）：
```json
{"link_column_id": {"url": "https://example.com", "text": "Example"}}
```

**Checkbox** —— 使用 `{"checked": "true"}`；要取消勾选，用 `{"checked": "false"}` 或 `null`。裸的 `true` / `false` 会失败：
```json
{"checkbox_column_id": {"checked": "true"}}
```

Email、phone 与 link 作为普通字符串会失败——始终发送对象。

### 一次更新多列

在单个 JSON 字符串中合并多个列更新：
```json
{
  "status": {"label": "Working on it"},
  "date4": {"date": "2025-06-15"},
  "person": {"personsAndTeams": [{"id": 12345678, "kind": "person"}]},
  "text0": "Implementation notes here"
}
```

## 创建子条目

要创建子条目，调用 `create_item` 并把 `parentItemId` 参数设为父条目的 ID。子条目会创建在父条目的子条目看板上。

注意：子条目看板有自己的列结构。设置列值之前，先在子条目看板上调用 `get_board_info` 获取其列定义。

## 添加评论

要给条目添加评论或更新，调用 `create_update`，传入：
- `itemId`：条目 ID
- `body`：评论文本（支持基础 HTML：`<b>`、`<i>`、`<a>`、`<ul>`、`<li>`）

## 常见模式

**标记为完成：** 从 `get_board_info` 获取看板的“done”状态标签，然后用 `{"status_column_id": {"label": "Done"}}` 调用 `change_item_column_values`。确认状态更改后，检查看板是否有匹配的终止性分组（Done、Closed、Completed、Resolved、Fixed、Won、Lost、Archived）且该条目尚不在其中。若有，作为下一步提出：“要我也把它移到 Done 分组吗？”不要自动移动——有些看板有意让条目保持在其原始分组中，不论状态如何，因此始终先询问。

**重新分配：** 从 `list_users_and_teams` 获取新人员的用户 ID，然后用 people 列格式调用 `change_item_column_values`。

**批量创建与更新：** 使用 `create_items`（每次调用最多 20 个条目；每个条目选择自己的分组、父项或模板条目）与 `update_items`（每次调用最多 40 个更新，可跨看板）。每个条目各自成功或失败，因此请读取逐条目结果并仅重试失败的条目。单个条目使用 `create_item` / `change_item_column_values`。

**移到分组：** MCP 工具包没有直接的“移动条目”工具（`move_object` 用于看板/文件夹/概览，不用于条目）。使用 `all_monday_api` 配合 `move_item_to_group` mutation：`mutation { move_item_to_group (item_id: <ID>, group_id: "<GROUP_ID>") { id } }`。不要为移动而使用带 `duplicateFromItemId` 的 `create_item`——那会创建一个副本并把原始条目留在原处。

**把条目复制到另一个分组：** 带 `duplicateFromItemId` 的 `create_items` 会忽略 `groupId`——副本始终落在源条目的分组中。先复制，再用 `move_item_to_group` 移动每个副本。即使应用了你的新名称，复制响应也会把名称报告为“<original> (copy)”，因此在告诉用户其名称之前，请回读该条目。

## 明智的默认值

当用户未指定所有值时：
- **Status**：默认使用第一个非 done 标签（通常是“Not Started”或“Working on it”）——通过 `get_board_info` 检查看板的标签顺序。在响应中说明该默认值。
- **Group**：按此顺序选择分组。(1) 如果任何分组的名称匹配 backlog 模式（不区分大小写：`To Do`、`Todo`、`Backlog`、`New`、`Open`、`Not Started`、`Inbox`、`Lead`、`Triage`），使用它。(2) 否则，使用最上面的非终止性分组。终止性分组是名称匹配 done 模式（不区分大小写：`Done`、`Closed`、`Completed`、`Complete`、`Verified`、`Resolved`、`Fixed`、`Won`、`Lost`、`Archived`、`Cancelled`、`Canceled`）的分组。(3) 如果每个分组都是终止性的，请询问用户使用哪个分组，而不是猜测。有些 monday 看板从 API 返回的第一个分组是“Done”，所以不要盲目使用 `groups[0]`。始终说明你使用了哪个分组，以便用户覆盖。
- **Person**：如果用户已知且看板有人名列，提出分配给他们。未经询问不要自动分配。

## 批量操作

当在一个请求中创建或更新 5+ 个条目时：
- 用 `create_items` / `update_items` 将它们批处理，而不是每个条目一次调用
- 处理所有条目，然后呈现计数摘要与看板链接
- 不要列出每个单独条目——说“Created 12 items on the Marketing board”并附上看板 URL
- 如果有条目失败，请单独报告失败数量与原因

对于批量**破坏性**操作（3+ 个可能难以撤销的更新），执行前与用户确认。

**在没有子条目的看板上批量创建子条目。** 子条目看板在第一个子条目时惰性创建，在它存在之前发送的批次会间歇性地因缺少列错误而失败。先用 `create_item`（`parentItemId`）单独创建第一个子条目，在子条目看板上调用 `get_board_info` 获取其列 ID，然后用 `create_items` 批处理其余部分。

**批量中的下拉与状态标签。** 复用 `get_board_info` 中的确切现有标签字符串。仅当用户想要一个真正的新标签时才设置 `createLabelsIfMissing: true`。对于 **dropdown** 列，批次中的新标签会按每个条目创建一次：三个条目带 `createLabelsIfMissing: true` 与新标签“Beta”，会在该列上留下三个“Beta”标签。先创建一个带新标签的条目，然后在不带 `createLabelsIfMissing` 的情况下批处理其余部分（标签现已存在）。Status 列不会这样重复，但仍要在每个条目中以相同拼写发送每个新标签。

## 错误预防与补救

1. **始终先调用 `get_board_info`** —— 绝不猜测列 ID 或状态标签
2. **使用确切的状态标签字符串** ——“Working on it”而不是“working on it”（区分大小写）
3. **写入前检查列类型** —— `status` 列与 `color` 列使用不同格式
4. **把 columnValues 字符串化** —— 该参数期望 JSON 字符串，而不是 JSON 对象
5. **校验人员 ID** —— 分配前用 `list_users_and_teams` 获取有效用户 ID。始终传入 `name` 参数（或已知时传 `userIds`）来限定查询范围。不带参数调用 `list_users_and_teams` 会返回整个账户用户列表，在大型租户上会超出令牌限制。如果用户提供了邮箱，先按本地部分作为名称搜索（例如 `alex.po@example.com` 用“alex.po”）；若无匹配，请用户提供该人员的显示名称

当 MCP 调用失败时，不要直接透传原始错误。请诊断并提出修复：

- “此看板上找不到状态标签‘Done!’。该看板使用‘Done’（无感叹号）。要我使用它吗？”
- “人员 ID 12345 不在你的账户中。要我列出可用用户，以便你挑选正确的吗？”
- “此看板权限被拒绝——它是私有的且你未订阅。要我请所有者添加你，或另选一个看板吗？”

**写入工具失败而读取正常。** 如果某个写入工具（`create_item`、`create_items`、`update_items`、`change_item_column_values`、`create_column`、`create_board`）从工具列表中缺失，或在你刚成功读取的看板上返回“Resource not found”、`USER_UNAUTHORIZED` 或 403，请重试同一调用一次。若再次失败，停止——不要循环或对同一看板尝试其他写入工具。告诉用户连接器会话失去了写入权限，请他们断开并重新连接 monday.com 连接器，并提出用 `submit_bug_or_feature_request` 报告它。

**预期看板缺失或工作区看起来为空。** 调用 `get_user_context` 并告诉用户他们连接的是哪个账户。同一邮箱在多个 monday 账户上的用户常常连接到错误的那个；重新连接并选择正确的账户即可修复。

## 使用的工具

- `get_user_context` —— 查找用户的看板
- `search` —— 按名称查找看板
- `get_board_info` —— 看板结构、列 ID、状态标签（写入前必需）
- `get_column_type_info` —— 详细的列类型 schema 与校验规则
- `get_board_items_page` —— 按名称或过滤条件查找条目
- `create_item` —— 创建新条目或子条目
- `create_items` —— 一次调用创建最多 20 个条目或子条目
- `change_item_column_values` —— 更新现有条目的列值
- `update_items` —— 一次调用更新最多 40 个条目，可跨看板
- `create_update` —— 给条目添加评论
- `all_monday_api` —— 用于在分组之间移动条目时的 `move_item_to_group` mutation
- `list_users_and_teams` —— 为 people 列查询用户 ID
- `submit_bug_or_feature_request` —— 报告在重试后仍持续失败的写入工具
- `show-assign`（有选择地）—— 当用户从众多队友中挑选时的人员选择器部件

## 附加资源

- **`references/column-value-formats.md`** —— 所有 monday.com 列类型的完整列值格式化参考
