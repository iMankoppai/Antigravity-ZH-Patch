---
name: pandadoc-nda-fast-send
category: legal
roles: [sales, bizops, legal, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: 一次性把一个标准 NDA 发给对方——找到正确的 NDA 模板，预填对方，确保每个签名都已指派，确认，然后发送。当有人想要发出一份 NDA、双向 NDA 或保密协议时使用。
tags: [pandadoc, nda, confidentiality, e-signature, legal]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc NDA 快速发送

把"给 Acme 的 NDA，发送到 `legal@acme.com`"变成一份已发送的 NDA，避开会让草率尝试失败的两个失误：选错模板，以及留下未指派的签名。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`templates_list`、`templates_details_get`、`documents_create`、`documents_status_get`、`documents_details_get`、`documents_update`、`documents_fields_assign`、`documents_send`。如果它们缺失，说明 MCP 服务器未连接并指向 <https://mcp.pandadoc.com>。

**工作区中必须存在一个 NDA 模板。** 没有绕开它的办法——见第 1 步。

---

## 用户提供什么

- **对方名称**——必需，用于文档名和 `Client.*` 令牌。
- **收件人邮箱**——必需。如果缺失，询问。
- **我们这边由谁会签**——常常未说明。你是否需要它取决于模板；见第 3 步。
- **截止日期或上下文**——可选，用于发送消息。

---

## 工作流

### 第 1 步：找到 NDA 模板——若没有则停止

用 `q: "NDA"` 和 `count: 10` 调用 `templates_list`。然后，因为 NDA 也被叫做其他名字，如果第一次返回不了有用的东西，试试 `q: "non-disclosure"` 和 `q: "confidentiality"`。

**`q` 不是名称子串匹配。** 一次对 "NDA" 的搜索曾返回一个名为 `Declaration H&S standards and regulations` 的模板。所以：

- **一个可能的匹配：** 点名它及其 ID，并说明你在用它。不要仅仅因为它是唯一的命中就假定它是对的。
- **多个：** 列出它们并询问。把错误的协议发给对方是不可恢复的错误。
- **没有可能的：** 平实地说明该工作区没有 NDA 模板，需要先在 PandaDoc 中创建一个。**不要临时造一个。** 生成的文档无法被签署——用 `source: "markdown"` 的 `documents_create` 会产生 `fields: []` 并悄悄把收件人降级为 `recipient_type: "CC"`，所以你交出的会是一份没人能签署的 NDA 形状的文档。那比说不行更糟。

也拒绝在一个读回来不可用的模板上继续：一个公开模板库模板可能完整地回答 `templates_details_get`，却仍以 `400 Template is not available.` 让 `documents_create` 失败。

### 第 2 步：读取模板

调用 `templates_details_get`。你需要：

- **`roles[]`**——每个签署角色及其确切名称。没有保证的 "Signer"；对方角色可能是 `Client`、`Recipient`、`Counterparty` 或作者所选的任何名称。猜测会悄悄丢掉收件人。
- **每个角色的 `preassigned_person`**——设置了它的角色会自己填充。为 `null` 的角色需要一个显式收件人。
- **`tokens[]`**——通常是 `Client.Company`、`Client.FirstName`、`Client.LastName`，有时 `Sender.Company`。

### 第 3 步：弄清收件人

数一数没有 `preassigned_person` 的签署角色：

- **一个**——对方邮箱就够了。继续。
- **两个或更多**——你需要为每个提供一个不同的邮箱。同一个地址不能占据两个角色；API 返回 `already in recipients list`。所以询问：*"这个模板还有一个 `<RoleName>` 签名块——我们这边由谁签署？"* 不要悄悄把两个角色都指派给同一个对方，也不要把它们合并到一个人身上，除非用户明确说这是一次测试或自签。

  **不要因为这个问题而停止本轮。** 缺少会签者阻塞的是*发送*，不是*起草*——两者不是同一个门控，而询问绝不是跳过第 4 步的理由。在同一个响应里，直接进入第 4 步用你已有的收件人创建文档，然后把角色问题**与**草稿链接**并列**提出，而不是用它取代草稿链接。这在用户要求一个草稿、说"先别发"，或"让我先看看"时都适用——他们想要一份摆在面前的文档，而只用一个问题回复会让他们没东西可看，而那正是他们唯一要求的东西。唯一的例外是直接要求发送：那种情况会签者的答案必须先回来，因为无论如何发送都无法继续。

注意，一个在 PandaDoc UI 中从文档转换来的模板**会丢失 `preassigned_person`**，所以一个看起来应该自己填充我们这边的模板可能并不会。

### 第 4 步：创建

```json
{
  "source": "template",
  "template_uuid": "<from Step 1>",
  "name": "NDA - <Counterparty> - <YYYY-MM-DD>",
  "recipients": [
    { "email": "<counterparty email>", "first_name": "<first>", "last_name": "<last>",
      "role": "<exact role name from Step 2>",
      "delivery_methods": { "email": true, "sms": false } }
  ],
  "tokens": [{ "name": "Client.Company", "value": "<Counterparty>" }]
}
```

使用第 2 步中读到的**确切**角色名，绝不用猜测的 "Signer"。始终把 `delivery_methods` 设为仅邮件，除非给出了电话号码，否则发送会以 `A phone number is required` 失败。

### 第 5 步：等待草稿

轮询 `documents_status_get` 直到它读作 `Draft`。`documents_create` 先返回 `Uploaded`。

注意 `Draft` 并不保证可发送性——见第 7 步。

### 第 6 步：检查每个签名都已指派——在发送之前

调用 `documents_details_get` 并核实：

1. **每个 `signature` 和 `initials` 字段都有非空的 `assigned_to.id`。** 一个空的属于某个没有收件人的角色，而 `documents_send` 会拒绝整个文档。如果你发现一个，按第 3 步解决它——用 `documents_update` 添加缺失的收件人，或对于一次确认的自签，用 `documents_fields_assign` 重新指派那些字段 UUID。
2. **没有收件人在没有电话号码的情况下 `sms: true`。** 如果是，用 `documents_update` 修复。
3. 对方名称落入你设置的令牌里。

这一步正是把三次失败的发送尝试变成一次干净发送的东西。不要因为创建调用成功了就跳过它——创建成功并不能说明可发送性。

### 第 7 步：确认，然后发送

始终先确认。展示模板名称、文档名称，以及每个收件人及其角色：

> 准备把 **"\<name\>"** 作为 `<Role>` 发送给 **\<email\>**？*（以及把 `<other@email>` 作为 `<OtherRole>`）*

只有明确同意后，才用来自用户上下文的 `subject` 和简短 `message` 调用 `documents_send`。

**同意必须来自用户。** 不是来自你自己推理认为发送显然是他们想要的，不是来自复述问题并自己回答。如果没有收到回复，答案就不是同意——把文档留作草稿，交出链接 `https://app.pandadoc.com/a/#/documents/<document_id>`，并说明它在等待他们的点头。那是一个完整、正确的结果，而不是未能完成：一份到达对方收件箱的 NDA 无法召回，而一份草稿不花什么。用户说不要发送时也一样——草稿、链接、停止。

- `409 The document isn't ready for a status transition yet`——即使在 `Draft` 之后也已知的竞态。稍等片刻并**重试一次**。不要循环。
- `400 Not all signature, initials fields were assigned`——第 6 步被跳过了或某个角色仍然为空。回去，而不是盲目重试。

然后报告发生了什么，附上链接 `https://app.pandadoc.com/a/#/documents/<document_id>`。

---

## 用法示例

```txt
@pandadoc-nda-fast-send — 把我们的标准 NDA 发给 legal@acme.com，他们周四通话前需要
```

```txt
@pandadoc-nda-fast-send — 给 Globex 的双向 NDA 发到 procurement@globex.com，我将作为 serhii@ourco.com 会签
```

---

## 故障排查

### `400 Not all signature, initials fields were assigned`

某个签署角色没有收件人。再次读取 `roles[]`，找到签名字段为空的 `assigned_to` 的那个角色，用 `documents_update` 添加该收件人，然后重试。

### `already in recipients list`

同一个邮箱被放到两个角色上。使用不同的地址。对于自签测试，保留一个收件人，改用 `documents_fields_assign` 重新指派第二个角色的字段 UUID。

### `400 Template is not available.`

该模板可读但不可用——通常是公开模板库模板而不是工作区里的。选一个工作区模板。

### `A phone number is required`

某个收件人默认成了 SMS 投递。用 `documents_update` 配 `delivery_methods: {email: true, sms: false}`。

### 发送时 `409`

文档在创建后仍在稳定中。重试一次。

### 工作区没有 NDA 模板

说明并停止。生成一个不是选项：markdown 创建的文档没有签名字段且无法被签署，而 `templates_create` 需要一个位于公共 HTTPS URL 的 PDF。
