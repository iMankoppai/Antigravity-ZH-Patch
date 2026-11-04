---
name: trello-use
description: "**强制前提** —— 在调用任何 Trello MCP 工具（`trelloRead*`、`trelloWrite*`、`trelloSearch`）之前，必须先加载本技能。内容涵盖每个工具都要求的 ARI id 格式，以及贯穿性的规则（当前用户查询、UTC 日期处理、Inbox 与看板的区别、有序创建、分页，以及嵌入字段预览与完整 `list_*` 记录的区别）。跳过它会导致格式错误的 id 错误、错误的到期日期/时区结果，以及基于被截断数据构建的回答。"
disable-model-invocation: false
---

# Trello MCP 服务器 —— 使用技能

Trello MCP 工具按动作分派（`action: "..."` 选择操作），并会严格校验：所选动作未使用的字段会被拒绝，而不是被忽略。

## 1. 首先确定当前用户

以 `action: "get_me"` 调用 `trelloReadMember`，获取已认证用户的个人资料，包括 `prefs.timezone`。在对卡片、Inbox 和搜索进行任何相对时间请求（"today"、"this week"）之前都要这样做 —— 最具体地说，当用户以本地或相对方式给出 `due` 日期/时间（例如 "tomorrow 1pm"）时，在 `trelloWriteCard`/`trelloWriteInbox` 的 `create` 或 `update` 之前要先解析 `prefs.timezone`，转换为 UTC，然后作为 `due` 传入。（Planner 事件使用不同的时区来源 —— 见 §3。）

## 2. ARI id 格式（关键 —— 传递任何 id 之前阅读）

每个 id 类型的参数（`cardId`、`boardId`、`listId`、`workspaceId`、`checklistId`、`itemId`、`labelId`、`plannerCalendarId`、`providerAccountId`）都是 ARI，而非原始的 Trello 对象 id。大多数是工作区范围的，并遵循以下形式：

```
ari:cloud:trello::<entity>/workspace/<workspaceObjectId>/<entityObjectId>
```

例外情况（下表中最后四行）不是工作区范围的：action、member 和 planner calendar 没有工作区段，而第三方账户是另一个 ARI 命名空间。

| 实体              | 形式                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| 看板               | `ari:cloud:trello::board/workspace/<workspaceObjectId>/<boardObjectId>`         |
| 卡片                | `ari:cloud:trello::card/workspace/<workspaceObjectId>/<cardObjectId>`           |
| 列表                | `ari:cloud:trello::list/workspace/<workspaceObjectId>/<listObjectId>`           |
| 检查清单           | `ari:cloud:trello::checklist/workspace/<workspaceObjectId>/<checklistObjectId>` |
| 检查项          | `ari:cloud:trello::check-item/workspace/<workspaceObjectId>/<itemObjectId>`     |
| 标签               | `ari:cloud:trello::label/workspace/<workspaceObjectId>/<labelObjectId>`         |
| 工作区           | `ari:cloud:trello::workspace/<workspaceObjectId>`                               |
| 操作              | `ari:cloud:trello::action/<actionObjectId>`（无工作区段）              |
| 成员              | `ari:cloud:trello::user/<memberObjectId>`（无工作区段）                |
| 规划日历    | `ari:cloud:trello::planner-calendar/<calendarObjectId>`（无工作区段）  |
| 第三方账户 | `ari:third-party:<provider>::account/<providerAccountId>`（例如 Google）         |

规则：

- **始终先从读取工具获取 ARI**，绝不自行构造或猜测。`trelloWriteCard`、`trelloWriteChecklist`、`trelloWriteInbox` 和 `trelloWritePlanner` 都会在其 id 参数上拒绝 Trello URL/短链接（"Do NOT pass a Trello URL or short link; use `trelloReadCard`/`trelloReadInbox` first to obtain the ARI"）。
- **两个读取 `get` 动作也接受纯 Trello URL**，作为便利：`trelloReadBoard`（`get`）接受看板 URL（`https://trello.com/b/<shortLink>/...`），`trelloReadCard`（`get`）接受卡片 URL（`.../c/<shortLink>/...`），除 ARI 之外还可使用。其他所有工具 —— 以及所有写工具 —— 都只接受 ARI。

## 3. 日期始终为 UTC ISO 8601

`due`（trelloWriteCard、trelloWriteInbox）和 `start`/`end`（trelloWritePlanner）均为 UTC ISO 8601（`"2026-06-01T17:00:00.000Z"`）。对于本地/相对时间，使用以下方式转换：

- 卡片与 Inbox：`trelloReadMember`（`get_me`）→ `prefs.timezone`
- Planner 事件：`trelloReadPlanner`（`get`）→ `primaryCalendar.timezone`
- 未给出时间 → 默认本地 09:00。

`trelloSearch` 的到期日期限定符（`due:`）使用相同的 UTC 边界规则 —— 先解析 `prefs.timezone`。

## 4. Inbox 不是 Trello 看板

Inbox 是个人快速收集界面，有专属工具：`trelloReadInbox` / `trelloWriteInbox`。不要试图通过 `trelloReadBoard`/`trelloWriteBoard` 访问它 —— 请改用 Inbox 专属工具。`trelloWriteInbox` 的 `create` 不接受 `pos` —— 新的 Inbox 卡片始终落在顶部。

## 5. 有序创建

当创建多个必须保持特定顺序的条目 —— 列表、卡片、卡片上的检查清单，或检查清单中的检查项 —— 时，按预期顺序将 `pos` 设为不同的连续整数（`1, 2, 3, …`）。范围按父级划分：卡片按列表，列表按整个看板，检查清单按卡片，检查项按检查清单。不同的值可固定顺序，与哪个调用先落地无关，因此你可以并行创建它们。在暴露该字段的地方，`pos` 也接受 `"top"`/`"bottom"`。

**示例 —— 新看板上的 3 个列表，顺序很重要（`To Do` → `In Progress` → `Done`）：**

```json
[
  {
    "tool": "trelloWriteList",
    "action": "create",
    "boardId": "ari:cloud:trello::board/workspace/<workspaceObjectId>/<boardObjectId>",
    "name": "To Do",
    "pos": 1
  },
  {
    "tool": "trelloWriteList",
    "action": "create",
    "boardId": "ari:cloud:trello::board/workspace/<workspaceObjectId>/<boardObjectId>",
    "name": "In Progress",
    "pos": 2
  },
  {
    "tool": "trelloWriteList",
    "action": "create",
    "boardId": "ari:cloud:trello::board/workspace/<workspaceObjectId>/<boardObjectId>",
    "name": "Done",
    "pos": 3
  }
]
```

这三个都可以并行发出 —— `pos` 按看板划分，且不同的值（1/2/3）可固定顺序，无论哪个调用先落地。

**示例 —— 同一列表中的 3 张卡片，顺序很重要（`Step 1` → `Step 2` → `Step 3`）：**

```json
[
  {
    "tool": "trelloWriteCard",
    "action": "create",
    "listId": "ari:cloud:trello::list/workspace/<workspaceObjectId>/<listObjectId>",
    "name": "Step 1",
    "pos": 1
  },
  {
    "tool": "trelloWriteCard",
    "action": "create",
    "listId": "ari:cloud:trello::list/workspace/<workspaceObjectId>/<listObjectId>",
    "name": "Step 2",
    "pos": 2
  },
  {
    "tool": "trelloWriteCard",
    "action": "create",
    "listId": "ari:cloud:trello::list/workspace/<workspaceObjectId>/<listObjectId>",
    "name": "Step 3",
    "pos": 3
  }
]
```

这里的 `pos` 仅作用于那一个列表 —— 在另一个列表中以 `pos: 1` 创建的卡片，与这个列表的 `pos: 1` 相互独立。

**反例 —— 顺序无关紧要：** 直接创建条目而不设置 `pos`（或设为 `"bottom"`）。当用户未要求特定顺序时，不要臆造连续数字 —— 那是多余的精确度。

## 6. 分页

列出集合的读取工具使用游标分页（传入 `cursor`，返回 `pageInfo.endCursor`/`nextCursor` + `hasNextPage`/`hasMore`）。在 `hasNextPage`/`hasMore` 为 true 时持续分页，而不是假定第一页就是完整的 —— 这尤其适用于 `trelloReadBoard` 的 `list`/`list_by_workspace` 按 `visibility` 过滤时（过滤在服务端按页进行，而非在分页前全局进行）。

## 7. 嵌入字段是预览

嵌套子对象的字段 —— 看板上的 `lists`、卡片上的 `labels`/`comments`、列表上的 `cards` —— 在 `get` 和 `list_*` 响应中都是被截断的预览。`<field>HasMore: true` 标记某个字段被截断：`listsHasMore`、`labelsHasMore`、`checklistsHasMore`、`commentsHasMore`。

计数、"所有 X"、过滤或"这是全部吗？"都需要每一个子项。用匹配的动作获取它们，持续分页直到某次响应报告没有下一页（§6），并基于那些页面作答。

| 需要完整获取的子项           | 使用以下方式获取                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 看板的列表                     | `trelloReadList` `list_by_board`                                                                                                        |
| 列表的卡片                      | `trelloReadCard` `list_by_list`                                                                                                         |
| 卡片的检查清单及其检查项 | `trelloReadChecklist` `list_by_card`                                                                                                    |
| 看板的标签                    | `trelloReadBoard` `list_labels`                                                                                                         |
| 卡片的评论                   | `trelloReadCard` `list_comments` —— **受限**：当其未出现在所公布的动作中时，评论不可用；请如实说明 |
| 卡片自身的标签或成员      | 不存在卡片范围的动作 —— 预览就是上限，因此将其呈现为不完整                                                     |

**示例 —— "这个看板有多少个列表？"** `trelloReadBoard` 的 `get` 返回带 `listsHasMore: true` 的 `lists`。从该响应中取出看板 ARI，传入列表动作，跟随游标直到最后一页，然后计数你所收集到的内容：

```json
{
  "tool": "trelloReadList",
  "action": "list_by_board",
  "boardId": "ari:cloud:trello::board/workspace/<workspaceObjectId>/<boardObjectId>",
  "cursor": "<endCursor/nextCursor from the previous page>"
}
```
