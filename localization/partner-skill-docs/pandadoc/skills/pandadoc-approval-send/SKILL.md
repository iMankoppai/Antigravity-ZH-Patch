---
name: pandadoc-approval-send
category: bizops
roles: [sales, bizops, ops]
complexity: advanced
prerequisites: [PandaDoc]
description: 从模板创建文档，并让其走内部审批链——读取审批步骤，在 API 允许之处让它走完链，在 API 不允许之处移交给 PandaDoc。当某文档在到达对方之前需要内部签署批准时使用。
tags: [pandadoc, approvals, workflow, e-signature, bizops]
version: "0.2.0"
metadata:
  visibility: public
---

# PandaDoc 审批路由发送

让文档走内部审批，而不是直接发给对方。

**已针对实时审批链验证。** 读取一条链以及让文档走完它，两者都做了端到端演练：从一个带审批工作流的模板创建的 `Draft` 会暴露一个填充好的 `approval_execution`，发送它会令文档进入 `Waiting for Approval`。有一种形态根本无法发送——其 `type` 为 `selectable` 的组——第 3 步解释原因以及应改做什么。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`templates_list`、`templates_details_get`、`documents_create`、`documents_status_get`、`documents_details_get`、`documents_send`。有用的工具：`documents_update`，在重试发送之前修复未指派的签名字段。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

**必须在 PandaDoc 中在模板或文档上配置审批工作流**。本技能无法创建一个：没有 MCP 工具暴露审批链配置，只能读取一条链并让文档走完它。配置一个是在 PandaDoc 中的 UI 操作。

---

## 审批在 API 中如何出现

`documents_details_get` 返回 **`approval_execution`**。当没有审批工作流作用于该文档时它为 `null`。填充后它看起来像这样：

```json
{
  "next_step": "<step id>",
  "is_completed": false,
  "is_ordering_enabled": true,
  "is_editing_allowed": false,
  "sender": { "email": "sender@example.com", "id": "<user id>" },
  "sender_message": "Please review and approve",
  "skip_user": null,
  "skip_message": null,
  "steps": [ /* see below */ ]
}
```

### 一个步骤有两种形态之一

**组步骤**——一个有名字的组，带一个或多个候选受派人：

```json
{
  "id": "<step id>",
  "assignee": null,
  "group": {
    "id": "<group id>",
    "name": "Finance",
    "type": "optional",
    "assignees": [
      { "id": "<assignee id>", "user": { "email": "a@example.com", "id": "<user id>" }, "is_document_sender": false }
    ]
  },
  "conditions": [], "condition_operator": "or",
  "approve_user": null, "approve_message": null,
  "reject_user": null, "reject_message": null,
  "is_skipped": false, "skip_reason": null
}
```

**直接受派人步骤**——一个具名的人，且 **`group` 为 `null`**：

```json
{
  "id": "<step id>",
  "assignee": { "id": "<assignee id>", "user": { "email": "b@example.com", "id": "<user id>" }, "is_document_sender": false },
  "group": null,
  "conditions": [], "condition_operator": "or",
  "approve_user": null, "approve_message": null,
  "reject_user": null, "reject_message": null,
  "is_skipped": false, "skip_reason": null
}
```

两种形态在实践中都会出现。只读取 `step.group.assignees` 的代码会抛错或悄悄跳过每一个直接受派人步骤——始终检查 `group` 是否为 `null`，并回退到 `assignee`。

### 读取一条链的状态

- **判断"链是否完成"要看 `is_completed`，而不是 `next_step`。** **`next_step` 不可靠**：在迄今观察到的每一个状态里它都是 `null`——`Draft` 上未启动的链、刚由一次发送启动的链、部分批准的链，以及已完成的链。绝不要从它推断任何东西。
- **`is_ordering_enabled`** 似乎用于区分顺序链（步骤按顺序运行）与并行链。从字段和携带它的链推断；并行执行没有被直接观察到。
- **`approve_user` / `approve_message`** 在已批准的步骤上被填充，携带批准者自己的评论。**`reject_user` / `reject_message`** 在拒绝时同样如此。一次拒绝会**停止**链：`is_completed` 保持 `false`，所以仅凭 `is_completed` 就把一条链称为"仍在运行"之前，先检查任何步骤上是否有 `reject_user`。
- **`group.type`** 有两个观察到的值。**`optional`** 意味着组内任何成员都可以批准；一个候选者批准就足以推进一条实时链。**`selectable`** 意味着发送者必须提名哪个成员批准——由审批步骤上的"Allow user to select approver"设置。这个区别决定文档到底能否发送：见第 3 步。
- **`is_selected`** 也出现在响应中每个组受派人上，而不只在发送载荷中。在一个 `selectable` 组上，在做出选择之前它对所有人都是 `false`。
- **`is_skipped` / `skip_reason`** 标记工作流绕过的一个步骤，通常通过 `conditions`。一个被跳过的步骤**不是**已批准的步骤，绝不能被报告为已批准。
- **`conditions` / `condition_operator`** 描述条件审批——一个只在文档满足某条件时才介入的步骤。空的 `conditions` 数组被假定为该步骤始终适用；填充数组的元素形态尚未被观察到。
- **`sender` / `sender_message`** 在 `Draft` 上为 `null`，在发送时填充。`sender_message` 只是传给 `documents_send` 的 `message`，不是工作流设置。
- 文档处于 `Waiting for Approval` 期间 **`date_sent` 保持 `null`**。它不是文档发出与否的信号——读 `status`。

### 发送

`documents_send` 接受 **`selected_approvers`**，形状为：

```json
{ "steps": [ { "id": "<step id>",
               "group": { "id": "<group id>", "type": "<group type>",
                          "assignees": [ { "user": "<user>", "is_selected": true } ] } } ] }
```

工具描述说要复制 `approval_execution` 中的 `steps`。注意这是一次**变换，不是复制**——步骤和组的 *id* 会沿用，但响应中的受派人（`{id, user: {…}, is_document_sender}`）不是载荷中的受派人（`{user, is_selected}`），所以要重建 `assignees`，而不是原样传你读到的那些。

**直接受派人步骤被完全省略。** 每个条目都需要 `id` 和 `group`，而 `group` 需要 `id`、`type` 和 `assignees`——一个 `group` 为 `null` 的步骤在这里没有表示。把这些步骤排除在外是正确的：一个唯一步骤是直接受派人的文档，在不带 `selected_approvers` 的情况下干净地发送，并进入了 `Waiting for Approval`。

**这个载荷实际上无法被发送。** PandaDoc 还要求 `group.name`，而该工具的 schema 没有 `name` 属性，所以为它传入的值会在请求离开之前被丢弃。每次调用都失败：省略 `name`，API 以缺失为由拒绝；提供它，API 仍以缺失为由拒绝。实际后果是，通过 MCP 无法进行批准人选择，这就是为什么第 3 步拒绝发送 `selectable` 链，而不是尝试。因此 `assignee.id` 和 `assignee.user.id` 哪个属于 `"user"` 无从谈起，仍然未知——请求根本走不到那一步。

`Sent`、`Viewed`、`Waiting for Approval`、`Approved` 和 `Rejected` 是**系统设置**的状态——`documents_status_change` 无法设置它们。只有 `Completed`、`Paid`、`Expired`、`Declined` 可以被手动设置。（承自工具 schema，未在实时环境重新验证。）

---

## 工作流

### 第 1 步：创建文档

照常查找并检查模板——`templates_list`（记住 `q` 是模糊匹配，所以确认匹配），然后 `templates_details_get` 获取 `roles[]` 和 `tokens[]`。用 `documents_create` 创建，使用确切角色名，以及 `delivery_methods: {email: true, sms: false}`。

轮询 `documents_status_get` 直到 `Draft`——`documents_create` 先返回 `Uploaded`，且在文档到达 `Draft` 之前链不可读。

### 第 2 步：读取审批链

`documents_details_get` 并查看 `approval_execution`。

**如果它是 `null`，则该文档上没有审批工作流。** 平实地说明，并询问是否直接发送。不要假装让一个没有链的东西走流程——也不要伪造 `selected_approvers` 载荷，那要么报错要么被忽略。

如果它被填充，遍历 `steps`。对每个步骤，按形态解析候选者：当 `group` 存在时用 `group.assignees`，当 `group` 为 `null` 时用单个 `assignee`。留意任何带非空 `conditions` 数组的步骤——它可能根本不介入。

在描述链之前检查 `is_ordering_enabled`：当它为 `true` 时步骤顺序运行，应作为有序呈现；当它为 `false` 时它们并行运行，所以不要暗示一个等待另一个。

### 第 3 步：检查这条链到底能否发送

在靠近 `documents_send` 之前读取每个步骤上的 `group.type`。

- **直接受派人步骤**（`group: null`）——可发送。没有选择要做。
- **`group.type: "optional"`**——可发送。组内任何成员都可以批准。你没有在选择批准人，也不得暗示你选了。
- **`group.type: "selectable"`**——**不可发送。在此停止并转到第 3a 步。**

一个 `selectable` 组要求发送者提名一个批准人，而该提名无法通过此 MCP 服务器表达。`documents_send` 接受一个 `selected_approvers` 载荷，但 PandaDoc 在其中要求 `group.name`，而工具的 schema 没有这个属性，所以该字段在传输中被丢弃。因此两条路线都失败，而且都不能在技能内恢复：

- 省略 `selected_approvers` → `400 UNABLE_TO_REQUEST_BECAUSE_NOT_ACTIVE_ASSIGNEE`，*"For selectable groups assignees should be selected"*
- 提供它 → `400`，`{"selected_approvers": {"steps": [{"group": {"name": ["This field is required."]}}]}}`

不要尝试发送以"看看会发生什么"。它会失败，而把一次失败的发送报告为发送，是本技能能产生的最糟结果。

如果你编辑此文件，保留这一段落：没有它，下面的守卫看起来是武断的。

### 第 3a 步：移交一条 selectable 链

这个草稿仍然值得保留——用户在 PandaDoc 中完成它。用平实的语言报告：你创建了什么、审批步骤让发送者选择谁批准、且你无法自动做出那个选择，以及接下来该做什么。把候选者作为信息点名，而不是作为问题——用户即将从列表中挑选他们，这节省他们查找。

**不要**向用户解释 MCP、schema 或 HTTP 代码。"不是我自动能做的事"就是他们需要的全部解释。

> 我已创建草稿 **"MSA – Acme Corp"**。它发出前需要内部批准，而审批步骤让发送者选择谁批准它——那个选择不是我自动能做的，所以我停在草稿而不是发送它。
>
> 要完成它：
>
> 1. 打开它：`https://app.pandadoc.com/a/#/documents/<document id>`
> 2. 从那里发送——你会被要求挑选批准人
> 3. 选择 **Roman Vybornov** 或 **Taras Khvyl**
>
> 它会先到他们那里批准；在那完成之前它不会到达对方。

绝不要在 selectable 链上问"该由谁批准？"。你无法对答案采取行动。

### 第 4 步：让文档走完链

只有当每个步骤都是直接受派人或 `optional` 组时才到达这里。用 `subject` 和 `message` 调用 `documents_send`，且**不带 `selected_approvers`**——在这些形态上没有可选择的，而且该参数反正也无法成功发送（第 3 步）。

- `409 The document isn't ready for a status transition yet`——重试一次。这是即使在 `Draft` 之后也已知的竞态。
- `400 NOT_ALL_FIELDS_WERE_ASSIGNED`——某个签署角色没有收件人，所以其签名和首字母字段未指派。为**每个**角色都创建带收件人的文档，而不只是对方，或者在重试之前用 `documents_update` 修复它。
- `DOCUMENT_HAS_UNFILLED_VARIABLES`——文档仍有空变量，列在 `detail.unfilled_variables` 中。询问是填写它们还是空着发送；只有在用户选择之后才用 `skip_unfilled_variables: true` 重试。

发送之后，轮询 `documents_status_get`。当链运行时预期是 `Waiting for Approval` 而不是 `Sent`。报告你实际观察到的状态，而不是假定。

### 第 5 步：报告

说明文档、按配置的链、每个步骤选定了谁，以及当前状态。

**只报告载荷包含的内容。** `approval_execution` 在任何地方都没有时间戳——没有批准日期、没有"于……批准"、没有经过时间。如果你发现自己写了一个日期，删掉它：那是编造的。

在报告一条运行中的链的进度时，从步骤字段读取它，而不是猜测：

- 一个设置了 `approve_user` 的步骤已批准——点名批准者，并在存在时引用 `approve_message`。`approval_execution` **不带时间戳**：不要说明某步骤何时被批准，也绝不要编造一个日期来填补空白
- 一个 `is_skipped: true` 的步骤是**被绕过，而不是被批准**——说跳过，并给出 `skip_reason`
- 一个设置了 `reject_user` 的步骤停止了链——点名谁拒绝了以及为什么
- 被拒绝步骤**之后**的步骤从未到达。把它们报告为未到达，而不是待处理：一条被拒绝的链不在等任何人，而把下一步骤称为"待处理"暗示签署批准还在途中。它们的字段看起来与一个真正待处理的步骤相同，所以你是从拒绝而不是从步骤本身读出这一点
- 在一条没有拒绝的链上，其他一切都是待处理

如果文档在等待批准，说清楚它**尚未**到达对方——这个区别就是本技能的全部要点。

---

## 用法示例

```txt
@pandadoc-approval-send — 从我们的标准模板为客户 Acme 创建 MSA，并让它走审批
```

```txt
@pandadoc-approval-send — 这个折扣发出前需要财务签署批准
```

---

## 故障排查

### `approval_execution` 为 `null`

该文档或其模板上没有附加审批工作流。说明这一点并询问是否直接发送。工作流在 PandaDoc 中配置，不通过 API。

### `step.group` 为 `null`

那是一个直接受派人步骤，不是损坏的载荷。改为读取 `step.assignee`。两种形态都是正常的。

### `next_step` 为 `null` 但文档仍是 `Waiting for Approval`

符合预期——`next_step` 不是可靠的进度指针。用 `is_completed` 判断链是否结束，用每步骤的 `approve_user` / `is_skipped` / `reject_user` 字段判断它处于何处。

### 某步骤显示 `is_skipped: true`

该步骤上的一个条件未匹配，所以工作流绕过了它。把它报告为跳过并附上其 `skip_reason`。称其为已批准会歪曲谁签署批准了。

### 文档直接变成 `Sent`

要么没有应用链，要么 `selected_approvers` 被省略或被拒绝。再次检查 `approval_execution`，并报告实际发生了什么，而不是本意是什么。

### `documents_status_change` 无法设置 `Approved`

正确——`Sent`、`Viewed`、`Approved`、`Rejected` 和 `Waiting for Approval` 是系统设置的。只有 `Completed`、`Paid`、`Expired`、`Declined` 可以被手动设置。

### 我不知道该选哪个批准人

那么该步骤是一个 `selectable` 组，答案是既不询问也不选择——你无法对选择采取行动，所以询问既浪费用户时间又暗示你缺乏的能力。也绝不要代表他们挑选：审批链的存在正是为了由一个有名字的人签署批准。按第 3a 步移交草稿，让他们在 PandaDoc 中选择。

### 发送"成功"了但文档仍是 `Draft`

它没有成功。`documents_send` 把其结果封装在一个信封中，被拒绝的发送会作为一个外层成功返回，其中含有一个内层 `isError: true` 和真实的 `error.code`——读取内层载荷，而不是外层标志。无论响应说什么，都用 `documents_status_get` 确认：一个没有移动的文档就是一个没有发送的文档。

### 发送时 `UNABLE_TO_REQUEST_BECAUSE_NOT_ACTIVE_ASSIGNEE`

"For selectable groups assignees should be selected。"该链有一个 `selectable` 组，无法通过 API 发送——见第 3 步。不要用 `selected_approvers` 重试；那也会失败。按第 3a 步移交。

### 发送因 `selected_approvers` 被拒

符合预期——该载荷根本无法发送（见 发送）。不要在 `"user"` 值上反复尝试；请求在 `"user"` 被读取之前就因缺失的 `group.name` 失败。停下并按第 3a 步移交。
