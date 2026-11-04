---
name: pandadoc-contract-register
category: legal
roles: [legal, finance, bizops]
complexity: advanced
prerequisites: [PandaDoc]
description: 用 PandaDoc 提取的元数据构建一份已签署合同的登记册，包含其关键条款——对方、日期、金额和谈判条款——并标注每个值的置信程度。当有人想要一份合同登记册、提取出的关键条款，或某个客户的所有协议时使用。
tags: [pandadoc, contracts, metadata, legal, register]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc 已签署合同登记册与关键条款提取器

一张表，记录签了什么、与谁、何时、金额多少、条款如何——由 PandaDoc 自己的 AI 提取汇编而成。

有两件事塑造了下面的一切：**提取出的值未确认**，以及**你无法按它们搜索**。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`documents_list`、`documents_search`、`documents_details_get`、`documents_metadata_batch_get`。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

没有 `documents_metadata_get`。每次元数据读取都经过 `documents_metadata_batch_get`，它接受 1-40 个 ID，所以一个文档就是一个单元素的 `document_ids`。当你只想要某些字段返回时，它也接受 `field_keys`。

---

## 提取给你什么，以及它有什么代价

`documents_metadata_batch_get` 返回 AI 提取的字段。在一个已完成的合同上观察到的：

`Counterparty name`、`Counterparty address`、`Counterparty signer name`、`Internal party legal name`、`Internal signer name`、`Agreement date`，还有条款复选框——`Audit rights`、`Exclusivity`、`HIPAA / BAA`、`Include SLA`、`Most favored customer`、`Data processing addendum incorporated`、`Includes logo rights`、`Include special terms`、`Has referenced documents`。

三条必须传达给用户的约束：

1. **每个值都带有 `acceptance_status`，而且在每个样本的每个字段上它都是 `pending`。** 这意味着 AI 提取、未经人工确认。一份没有任何内容被审阅过的登记册却作为事实呈现，在法律语境中是一种责任。给它加标注。
2. **提取只在已完成的文档上异步运行。** 批次响应中的每个条目都带有自己的 `status`：`ok`、`extraction_pending`（在 `retry_after` 之后重试）、`internal_error`（也可重试，仅针对该文档）、`extraction_not_started`（文档尚未完成）、`extraction_failed`（终端——联系支持）、`not_found` 和 `access_denied`。一个不可用的 ID 不会让整个调用失败，所以按文档读取状态。
3. **没有金额字段。** 合同价值不在元数据里——它来自 `documents_details_get` → `pricing.total`。

---

## 搜索局限——大声说出来

**元数据不可查询。** `documents_metadata_batch_get` 接受文档 ID，不是过滤器——它按文档读取，`field_keys` 收窄的是哪些字段返回，而不是哪些文档返回。没有办法问"哪些合同有 `Counterparty name = Acme`"。

所以为一个客户构建登记册意味着：

1. 用 `documents_search` 收窄，它是**全文搜索，且要求非空的 `query`**
2. 读取每个命中的元数据
3. 保留 `Counterparty name` 实际匹配的那些

第 1 步正是答案出错的地方。一个没有字面出现在文档中的搜索词会漏掉它：`query: "contract"` 在一个同样的文档用 `query: "Agreement"` 能匹配到四个的工作区里返回了**零**个命中。而一个名字从不出现在文档标题或正文中的客户，根本不会被找到。

**因此：始终说明你搜了什么，绝不要声称登记册是完整的。** "Acme 的每一份合同"是你无法兑现的承诺。"每一份匹配 *Acme Corp* 搜索、并对照提取的对方核验过的合同"则是你能兑现的。

---

## 工作流

### 第 1 步：建立候选集合

- **整份登记册：** `documents_list` 配 `status: "Completed"`，然后 `status: "Paid"`，`count: 100`。不需要搜索词，所以没有假阴性。
- **单个客户：** `documents_search` 以客户名作为 `query`，`status: ["Completed", "Paid"]`。尝试明显的变体——完整法定名称、简称、域名——并说明你试了哪些。

**不要**用 `signature_date` 窗口来确立"已签署"：那个过滤器返回没人签过的文档。改为按收件人确认签名（见下）。

### 第 2 步：确认每一份确实已签署

对每个候选，`documents_details_get` 并检查 `recipients[]`：至少有一个条目 `recipient_type: "signer"` 且 `signature_date` 非空。

一个用 `documents_status_change` 翻转的文档会读作 `Completed` 且 `date_completed` 已设置，但每个 `signature_date` 都是 `null`，签名字段是 `is_filled: false`。它不是一份已签署的合同。要么排除它，要么将其单独列为手动完成。

### 第 3 步：拉取元数据

用 `documents_metadata_batch_get` 一次处理 1–40 个文档，而不是每个一次调用。当你只需要某些字段时传入 `field_keys`。

处理每个文档的 `status`。其中两个可重试：`extraction_pending`，在 `retry_after` 之后一次；`internal_error`，对该文档单独一次。其余是终端的——`extraction_not_started`、`extraction_failed`、`not_found`、`access_denied`——以同样方式返回的重试也是。把这些合同记录下来，其条款标记为不可用，而不是悄悄丢弃它们。

### 第 4 步：添加金额

`documents_details_get` → `pricing.total`，货币来自 `pricing.tables[].currency`——或当 `tables` 为空时来自 `pricing.quotes[].currency`，一个 Quote 块文档就是这样报告它的。只读 `tables` 会在那些文档上丢掉货币，而一个没有标注的金额比没有还糟。

**绝不用 `grand_total`**——在一个价值 200,000 USD 的文档上观察到 `0 PLN`。货币因文档而异，所以不要跨货币合计；改为按货币小计。

### 第 5 步：构建登记册

每份合同一行：对方、文档名称、协议日期、签署日期、带货币的金额，以及被设置的条款标志。省略为假的标志，而不是列出九个"否"列。

然后，用平实的话：

- 候选集合是如何建立的，以及如果你用了任何搜索词，确切是什么
- 提取值是 **AI 衍生、`acceptance_status: pending`**，未经人工审阅
- 有多少合同没有可用的提取
- 如果涉及搜索，登记册是**尽力而为、非穷尽的**

---

## 用法示例

```txt
@pandadoc-contract-register — 给我建一份登记册，涵盖我们今年签的所有东西，带金额和关键条款
```

```txt
@pandadoc-contract-register — 找出与 Acme Corp 的每一份合同，并显示每一份的状态和条款
```

---

## 故障排查

### 一个我确定我们有合同的客户却返回空

搜索词没有出现在那些文档中。元数据无法过滤，所以唯一的入口是全文。尝试法定名称、经营名称和电子邮件域名，并说明你试了什么。

### 元数据返回 `extraction_not_started`

文档尚未完成。提取只在已完成的文档上运行。除了等待无事可做。

### `documents_metadata_get` 不是一个工具

它在 MCP 服务器上不存在。用 `documents_metadata_batch_get` 配一个单元素的 `document_ids`。

### 每个字段都说 `pending`

符合预期——那是默认的 `acceptance_status`。它意味着没有人审阅过提取。带那个告诫报告这些值，而不是压制它们。

### 金额缺失或为 0

没有定价表的合同在 PandaDoc 里确实没有金额。如果你在一个你知道有价值的合同上看到 0，你读的是 `grand_total` 而不是 `pricing.total`。

### 登记册里的一份合同结果并未签署

检查 `recipients[].signature_date`。仅 `Completed` 状态并不意味着已签署——它可以被手动设置。
