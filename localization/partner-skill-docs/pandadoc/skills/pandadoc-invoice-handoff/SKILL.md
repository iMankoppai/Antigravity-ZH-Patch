---
name: pandadoc-invoice-handoff
category: finance
roles: [finance, owner, sales]
complexity: advanced
prerequisites: [PandaDoc]
description: 把一份已签署的报价或方案变成发票——找出已完成且尚未开票的报价，复用其定价，从模板创建发票，并在确认后发送。当有人要求为已成交的交易开票，或想要扫过已签署的报价来开票时使用。
tags: [pandadoc, invoicing, finance, quotes, e-signature]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc 报价 → 发票交接

找出已签署的报价，构建匹配的发票，发送它。

两个结构性事实塑造了这一点：**没有 webhook**，所以这是一次扫描而不是一次触发；而且**没有任何东西把报价标记为已开票**，所以你必须自己确立这一点，否则会重复开票。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`documents_list`、`documents_details_get`、`templates_list`、`templates_details_get`、`documents_create`、`documents_status_get`、`documents_update`、`documents_send`。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

**工作区中必须存在一个发票模板，且带有一个定价表（不是 Quote 块），币种与报价一致。** 参考账户有两个名为 "invoice" 的模板，都不合格：一个的定价块是 Quote 而不是 table（正是第 4 步描述的陷阱），另一个每次读取都返回 API 错误。所以创建并验证的路径（第 5–6 步）尚未针对真实模板做端到端测试；扫描、排除和拒绝步骤不受影响。

---

## 没有触发器，没有标记

**没有 webhook。** "完成时生成发票"无法通过 MCP 事件驱动。按计划或在需要时运行它，并把它当作对近期完成报价的一次扫描。

**没有已开票标志。** PandaDoc 不记录一份报价已开票。在创建任何东西之前，你必须决定你将如何知道，并在每次运行中使用相同的方法。选项，最好的在前：

1. **开票后给来源报价打标签**——文档带有 `tags`，可通过 `documents_update` 设置。一个像 `invoiced` 的标签是持久的、在 UI 中可见，且跨运行存活。这是推荐做法。
2. **在发票上采用命名约定**，例如 `Invoice - <quote name>`，然后在创建前搜索它。可行，但依赖 `documents_search` 全文，它是模糊的且最终一致的。
3. **每次都问用户。** 安全但不能扩展到计划性扫描。

无论你用哪个，**在输出中说明它**，而且如果你无法为某份报价确立是否已开票，就询问而不是假定。向客户发送同一项工作的第二张发票比不发送更糟。

---

## 工作流

### 第 1 步：找出已签署的报价

`documents_list` 配 `status: "Completed"`，然后 `status: "Paid"`，`count: 100`。

收窄到真正的报价——那些带有填充好的 `pricing` 块的。一份已签署的 NDA 没有可开票的金额。

**确认每一份确实已签署。** `documents_details_get` → `recipients[]` 必须包含一个 `recipient_type: "signer"` 且 `signature_date` 非空。一个用 `documents_status_change` 翻转的文档读作 `Completed` 但没人签署它，据此开票会为一项从未成交的交易向客户收费。

### 第 2 步：排除任何已开票的

应用上面的方法。如果打标签，跳过 `tags` 包含你的标记的报价。

### 第 3 步：读取要沿用的定价

从报价上的 `documents_details_get`：

- `pricing.tables[].items[]`——每行的 `name`、`qty`、`price`、`subtotal`
- `pricing.tables[].summary`——`subtotal`、`discount`、`tax`、`fee`、`total`
- `pricing.tables[].currency`
- 用于头条数字的 `pricing.total`——**绝不用 `grand_total`**，它在一个价值 200,000 USD 的文档上被观察到为 `0 PLN`

**如果 `pricing.tables` 为空，在下结论说报价没有行项目之前先看 `pricing.quotes`。** 一个基于 Quote 块构建的文档把所有东西放在 `quotes[]` 下：`quotes[].sections[].items[]`、`quotes[].summary`、`quotes[].currency`。同样的数据，不同的位置。在这种文档上只读 `tables` 会得到没有行也没有货币，据此构建的发票是空的。

**跳过 `options.optional_selected: false` 的行。** 它们被提供但未被采纳，所以被排除在报价总额之外，且绝不能出现在发票上。把它们带过去是最可能开出超过客户同意金额的方式。

### 第 4 步：找到发票模板

`templates_list` 配 `q: "invoice"`。记住 `q` 是模糊的——确认匹配，而不是信任单个命中。读取 `templates_details_get` 获取 `roles[]`、`tokens[]` 和定价表名称。

如果没有发票模板，**停下并说明。** 不要临时造一个：markdown 创建的文档没有签名字段，其收件人会被悄悄降级为 CC，所以你会产出的东西不可用。

该模板的两个属性决定你究竟能否继续。在第 5 步之前检查两者：

**它的定价块必须是 table，而不是 Quote。** 如果 `pricing.tables` 为空而 `pricing.quotes` 被填充，停下。`pricing_tables` 在这种模板上会被接受然后被悄悄忽略，所以你会创建一张显示 `total: "0"` 的发票，且任何地方都没有错误。一张看起来完成的零发票比没有发票更糟。说明该模板使用 Quote 块，并请求一个基于定价表构建的模板。

**它的货币必须与报价匹配。** `pricing.tables[].currency` 由模板固定，无法通过 API 以任何途径设置。`documents_create` 用 `400 Wrong request currency … mismatch template currency` 拒绝不同的货币，并留下一个损坏的文档。`documents_update` 更糟：它返回 `{"updated": true}`，应用你的行数据，并**悄悄保留模板的货币**——所以一个事后"修复"货币的技能会得到成功响应，并报告一个文档实际没有的面额。如果你曾经写入定价，事后重新读取 `pricing.tables[].currency`，而不是信任那次调用。更糟的是那种*不*报错的失败：省略货币，报价的数字被原封不动地写入模板的面额，把一项 200,000 USD 的协议变成一张看起来完全正常的 200,000 PLN 发票。如果货币不同，**停下并告诉用户**——点名两种货币，并请求一个与报价相同货币的发票模板。绝不自己换算金额；你没有汇率，也没有挑选汇率的权限。

### 第 5 步：创建发票

从发票模板 `documents_create`，把沿用的行项目传入 `pricing_tables`，放在第 4 步中**确切**的表名之下。

关于折扣：`discount.name` 决定你的值是替换模板的折扣还是加到它之上——匹配模板的名称则替换，任何其他名称则追加。要精确复现报价的折扣，把报价的有效百分比放在 `"Discount"` 下传入，然后**验证**（第 6 步）。绝不要传入计算出的差值。

`options` 在每一行上都是必需的，即使 schema 把它标为可选。

轮询 `documents_status_get` 直到 `Draft`。

### 第 6 步：验证发票与报价匹配

在展示任何东西之前，对发票 `documents_details_get` 并与报价比较：

- 相同的行项目、相同的数量、相同的单价
- `summary.subtotal` 匹配
- 有效折扣匹配——且 `summary.discount` **不是负数**，那将意味着附加费
- `pricing.total` 与报价总额匹配
- 货币匹配

如果任何东西不同，用 `documents_update` 修正并重新读取。报告一个你未与报价比较过的发票总额，正是客户被收取错误金额的方式。

### 第 7 步：确认、发送、标记

展示比较——报价总额对发票总额——并在发送前询问。只有明确同意后，才 `documents_send`。遇 `409` 重试一次。

**成功发送之后，用 `documents_update` 把你的已开票标记应用到来源报价。** 如果你跳过这个，下一次扫描会再次给它开票。

报告：报价、发票、两个总额、它们匹配、收件人，以及来源报价现已标记。

---

## 用法示例

```txt
@pandadoc-invoice-handoff — 有已签署的报价等待开票吗？
```

```txt
@pandadoc-invoice-handoff — 给刚成交的 Acme Corp 交易开票
```

---

## 故障排查

### 没有发票模板

停下并说明。生成一个不可行——markdown 文档无法被签署，而 `templates_create` 需要一个位于公共 HTTPS URL 的 PDF。

### 发票总额高于报价

最可能的是你带过来了一个未被选中的可选行。那些被排除在报价总额之外。检查每一行的 `options.optional_selected`。

### 折扣算错了

`discount.name` 没有按预期表现。把目标百分比放在 `"Discount"` 下传入并验证；如果仍然不同，用 `documents_update` 以直接值修正。

### 一份报价被开了两次票

已开票标记未应用，或不同运行之间用了不同的方法。选定一种方法，每次发送后应用它，每次创建前检查它。

### 我给一项并未真正成交的交易开了票

仅 `Completed` 状态并不意味着已签署——它可以用 `documents_status_change` 手动设置，那会让每个 `recipients[].signature_date` 保持 `null`。开票前始终检查签名日期。
