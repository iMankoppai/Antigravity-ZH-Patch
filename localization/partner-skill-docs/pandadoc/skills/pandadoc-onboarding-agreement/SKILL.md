---
name: pandadoc-onboarding-agreement
category: hr
roles: [hr, ops, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: 从模板生成一份入职或雇佣文档，预填新入职者的详细信息，确保每个字段都指派给他们，然后发送以供签署。当有人正在为一名新员工办理入职需要发出文书时使用。
tags: [pandadoc, hr, onboarding, employment, e-signature]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc 入职协议生成器

发出新入职者的文书，其详细信息已经填好，没有任何东西留在未指派状态。

与普通发送的区别在于**预填**：HR 模板带有许多字段，而一份有一半留空的文档会把工作推回给新员工。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`templates_list`、`templates_details_get`、`documents_create`、`documents_status_get`、`documents_details_get`、`documents_fields_assign`、`documents_update`、`documents_send`。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

---

## 处理个人数据

这些文档带有个人信息——全名、身份证号、地址，有时还有薪酬。两个习惯：

- **绝不在你的回复中复述身份证号、PESEL、护照号、家庭住址或薪资数字。** 引用它，不要重述它："national ID——用你给的值已填"、"PESEL——已收到，将放入 `Text2`"。用户输入了那个号码；他们不需要把它读回来，而这份转录会被记录、粘贴进工单并被分享。他们消息中的一次提及不可避免，第二次是你应当防止的。

  容易滑倒的地方是第 2 步的字段清单和第 6 步的摘要，那里列出字段和值感觉像是尽职尽责。`Text2 — can use 85******345 (ID)` 就是错误；改为写 `Text2 — national ID, from your message`。即使你只是在询问别的东西，比如一个缺失的日期，这也成立。

  当一个值确实必须被识别时，打码是可以的——`85******345`——但点名该字段通常就够了。
- **绝不为个人字段编造一个值。** 如果身份证号、地址或开始日期缺失，询问。一份雇佣文档中看似合理的占位符比一个未填的字段糟得多，因为它可能被签署。

---

## 工作流

### 第 1 步：找到模板

`templates_list` 把 `q` 设为文档类型——"onboarding"、"employment"、"offer"，或用户所说的任何东西。`q` **不是**名称子串匹配，所以单个命中不是正确匹配的证明。HR 库尤其倾向于存放近乎重复的模板：按合同类型、按签署者、按国家。

- **一个可能的匹配：** 点名它及其 ID，说明你在用它。
- **多个：** 列出它们并询问。错误的变体意味着该合同类型错误的法律条款。
- **没有可能的：** 说明工作区没有这样的模板。**不要生成一个**——一个 markdown 创建的文档有 `fields: []`，其收件人被悄悄降级为 `recipient_type: "CC"`，所以没人能签署它。

### 第 2 步：读取模板的字段和角色

`templates_details_get`。你需要：

- **`roles[]`**——HR 文书通常一个签署角色（`Employee` 很常见），但要检查。注意任何 `preassigned_person`。
- **`fields[]`**——每个字段、其 `type`（`text`、`date`、`signature`、……）、它 `assigned_to` 哪个角色，以及最重要的是它的 **`merge_field`**。最后这一个决定下面的一切。
- **`tokens[]`**——按 `Client.*` / `Sender.*` 约定的模板变量，与字段分开。

**只有带非空 `merge_field` 的字段才能通过 API 预填。** 一个字段对象带四个标识符——`uuid`、`name`、`field_id`、`merge_field`——只有最后一个才是 `fields` 的有效键。其余三个会被拒绝：`field_id` 和 `name` 被 `documents_create` 悄悄丢弃，并从 `documents_update` 产生 `400 There are no such fields in the document`。已针对 `8q5FqeodqheYCQBCBBBqCW` 在 2026-08-06 验证。

所以在承诺任何东西之前，把 `fields[]` 分成两半：

- **`merge_field` 非空**——可预填。合并名就是键。
- **`merge_field: null`**——无法以任何方式预填。你传的任何东西都不会落地。收件人在打开文档后手动填写，或在 PandaDoc 编辑器中给模板添加合并字段。

如果你需要的每个字段都落在第二组，**在创建任何东西之前说明这一点**。本工作区有若干 HR 模板就是这样构建的（`7gocasE6Tr2GdSqae2HtwT`、`riFxJ8qcGRpGJiukZVVBPc`——所有字段 `merge_field: null`，全部名为 `Text`），在那些模板上，本技能存在的预填就根本不可用。提供两个真正的选项——给模板添加合并字段，或空着发送让入职者填写——让用户选择。不要创建一个空文档并把它当作已预填的文书呈现。

留意第二个陷阱：**一个合并名会填满共享它的每个字段，用同一个值。** 如果姓名、身份证和城市都在一个合并字段后面，它们无法容纳三个不同的值，模板就需要三个不同的合并名，本技能才能做它的工作。

**不要向用户索要签署者提供的值。** 用这一点来决定预先问什么。这是提问的提示，不是发送门控——门控是第 5 步的 `is_filled` 检查。

- `signature` 和 `initials` 字段始终是签署者的。绝不预填它们，绝不索要它们。
- 其他字段（`text`、`date`、下拉框）通常是雇主填写：姓名、身份证号、地址、开始日期、部门。签署角色上的一个裸 `date` 常常是签署日期，但不要假定——一个空的会在第 5 步浮现，由用户那时决定。

向用户索要你没有的雇主拥有的值。不要在一个所有者不明确的字段上阻塞：预填你能预填的，让第 5 步抓住任何仍然为空的东西。

为用户列出你能预填什么、以及你需要从他们那里得到什么，并一次性索要缺失的值，而不是一次一个。当你写那个清单时，点名该字段及其来源——"national ID，from the value you gave"——而不是复述值本身。见 *处理个人数据*。

如果你真正需要的东西缺失，询问——但权衡它对照用户所要求的。当他们想要一个草稿、或说先别发送时，用你已有的创建文档，并把问题放在草稿链接旁边。一个单独的问题、没有文档，不是他们所要求的。

### 第 3 步：用你能预填的一切创建

从模板 `documents_create`，传入：

- `recipients`——入职者，带 `email`、`first_name`、`last_name`、第 2 步的**确切**角色名，以及 `delivery_methods: {email: true, sms: false}`
- `fields`——一个 **`merge_field`** 到 `{value: …}` 的映射，用于第 2 步中识别的可预填字段
- `tokens`——任何模板变量，作为 `[{name, value}]`

键是合并名，不是 `field_id`，不是 `uuid`，不是 `name` 属性。一个什么都匹配不到的键会被悄悄忽略而不是拒绝，这就是第 5 步存在的原因。

收件人令牌会自己填充：传入 `recipients` 会填充 `Client.FirstName`、`Client.LastName`、`Sender.*` 和 `Document.CreatedDate`，无需你列出它们。只显式传入那些带有收件人记录不具有的值的令牌，比如 `Client.Company`。

轮询 `documents_status_get` 直到 `Draft`。

### 第 4 步：指派任何留在未指派状态的东西

`documents_details_get` 并检查 `fields[]`。任何 `assigned_to.id` 为空的字段属于某个没有收件人的角色，将阻塞发送。

用 `documents_fields_assign` 修复，传入字段 UUID 和收件人。注意这个工具**只指派既有字段**——它无法创建字段，所以如果模板缺少你需要的字段，模板必须在 PandaDoc 中更改。

### 第 5 步：核实预填，并列出每一个空的数据字段

仍在 `documents_details_get` 中，遍历 `fields[]` 并确认：

1. **你打算预填的每个字段都有 `is_filled: true` 和你传入的值。** 一个没有匹配到任何合并字段的键会被悄悄丢弃——创建调用成功而字段保持为空。这是最常见的失败，而除了读回没有任何东西会浮现它。

   如果一个字段返回为空，不要假定是拼写错误并用不同的键重试。先检查该字段上的 `merge_field`：当它为 `null` 时，不存在任何键，重试无法奏效。说明该字段不可由 API 填充，并把它留给下面的空字段清单。
2. **每个 `signature` 和 `initials` 字段都有非空的 `assigned_to.id`**，否则 `documents_send` 会以 `Not all signature, initials fields were assigned` 拒绝该文档。
3. **没有收件人在没有电话号码的情况下 `sms: true`。**

然后构建发送门控。这是一条硬规则，不是可自行判断的事，且它失效时是安全的——除非 `is_filled` 明确为 `true`，否则把字段当作空：

> 收集每一个 `type` 不是 `signature` 或 `initials` **且** `is_filled` 不为 `true` 的字段。

那就是空数据字段的清单。有些可能可以留给签署者，有些可能是雇主本应提供的值——MCP 不标记哪些是哪种，所以不要猜。这个清单上的每个字段都必须在第 6 步解决，文档才能发送：用户提供一个值或明确豁免它。一个空的数据字段绝不悄悄离开。

### 第 6 步：解决空字段，确认，然后发送

如果第 5 步的空数据字段清单不为空，先不要提供发送。展示它并请用户清除它。点名每个字段；不要复述值（见 *处理个人数据*）：

> 在我能发送之前，这些字段是空的：`Salary`、`Start Date`。对每一个，给我一个值，或告诉我留空让签署者填写。

用 `documents_update` 应用提供的值（合并名作为键），重新读取 `documents_details_get`，并重建清单。一个例外：`merge_field: null` 的字段根本无法通过 API 填充（`documents_update` 返回 `400 There are no such fields in the document`），所以用户为它提供的值无法落地——它只能被豁免，由入职者在打开文档后手动填写。用户填写的字段现在必须读作 `is_filled: true`；一个被豁免的字段从清单上移除。只有当清单上的每个字段都被填写或豁免时，你才提供发送。

然后展示文档名称、收件人和角色、已预填的数量，以及有意留空的字段。询问：

> 准备把 **"\<name\>"** 发送给 **\<email\>**？\<N\> 个字段已预填，\<W\> 个按你的选择留空（\<field names\>），加上签署者自己的字段（签名，以及指派给他们的任何其他字段）。

只有明确同意后，才 `documents_send` 配上 `subject` 和简短 `message`。遇 `409 The document isn't ready for a status transition yet` 重试一次。

**同意必须来自用户。** 不是来自你自己推理认为发送显然是他们想要的，不是来自复述问题并自己回答。如果没有收到回复，答案就不是同意——把文档留作草稿，交出链接，并说明它在等待他们的点头。那是一个完整的结果，而不是未能完成。雇佣文书在任何人都未批准之前就落到新员工收件箱，是严重得多的错误，而一份草稿不花什么。用户说不要发送时也一样。

用链接 `https://app.pandadoc.com/a/#/documents/<document_id>` 报告结果。

---

## 用法示例

```txt
@pandadoc-onboarding-agreement — Anna Kowalska 从 9 月 1 日开始的入职文书，发送到 anna.kowalska@example.com
```

```txt
@pandadoc-onboarding-agreement — Dzmitry 的远程工作申请，他是无固定期限合同
```

---

## 故障排查

### 我提供的一个字段在文档上是空的

在做任何其他事情之前先读取该字段上的 `merge_field`。它决定你遇到的是两种不同问题中的哪一种，而它们有不同的修复。

- **`merge_field` 为 null。** 该字段根本无法由 API 寻址。没有任何键有效——`field_id`、`uuid` 和 `name` 都被拒绝，`documents_update` 回答 `400 There are no such fields in the document: <what you passed>`。用另一个键重试浪费用户的时间。告诉他们模板需要在 PandaDoc 编辑器中添加一个合并字段，或入职者要手动填写这一个。
- **`merge_field` 已设置但值没有落地。** 那么键确实错了。逐字使用合并名，包括空格和标点——像 `MM / DD / YYYY` 这样的合并名很常见——并用 `documents_update` 设置它。

### 两个字段需要不同的值但共享一个合并字段

不可能。一个合并名寻址携带它的每个字段并向所有字段写入同一个值。模板必须给那些字段不同的合并名。说明这一点，而不是填一个而让另一个错误。

### `400 Not all signature, initials fields were assigned`

一个签名字段有空的 `assigned_to`。用 `documents_fields_assign` 指派它，或如果整个角色都没有代表，用 `documents_update` 添加缺失的收件人。

### `documents_fields_assign` 无法创建我需要的字段

它只指派既有字段。在 PandaDoc 中把该字段添加到模板。

### 多个近乎相同的模板

对 HR 库来说是正常的——按合同类型、按签署者、按国家的变体。询问而不是猜测；区别通常是法律性的，不是外观性的。

### `A phone number is required`

收件人默认成了 SMS 投递。用 `documents_update` 配 `delivery_methods: {email: true, sms: false}`。

### 发送时 `409`

即使在 `Draft` 之后也已知的竞态。重试一次，不要循环。
