---
name: pandadoc-signing-velocity
category: reporting
roles: [sales, owner, bizops]
complexity: advanced
prerequisites: [PandaDoc]
description: 构建一份签署管道报告——状态计数、平均签署时长、在途金额，以及卡住的文档。客户端计算，并说明样本量和计算方法。当有人想要一份每周签署报告或管道概览时使用。
tags: [pandadoc, reporting, metrics, pipeline, e-signature]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc 签署速度与管道报告

状态计数、签署时长、在途金额，以及什么卡住了——作为一份报告。

这里的每个数字都是你在一个有界集合上计算的。**没有聚合端点**，所以这份报告的诚实性完全取决于说明进来的是什么。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`documents_list`、`documents_details_get`。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

---

## 本技能的规则

**每个数字都随附其样本量和计算方法。** 一个没有分母的平均值比没有平均值更糟，因为它读起来像权威的。如果你在四个文档上计算了签署时长，就说"在 4 个文档上"。如果你对集合设了上限，就说明你在哪里停下。

---

## 工作流

### 第 1 步：按状态计数

每个状态 `documents_list`，`count: 100`。对管道视图值得计数的状态：

- **在途：** `Sent`、`Viewed`、`Waiting for Approval`、`External Review`
- **已结束：** `Completed`、`Paid`
- **死亡或停滞：** `Declined`、`Expired`、`Rejected`
- **未开始：** `Draft`

每个状态一次调用——该参数接受单个字符串。如果某个状态返回 100 个结果，可能存在更多；说明该计数是下限而不是总数。

### 第 2 步：平均签署时长

只有 `Completed` 和 `Paid` 文档有时长。对每一个，你需要：

- `date_sent`——**只在 `documents_details_get` 中**，每个文档一次调用
- `recipients[].signature_date`——也只在详情中，每个收件人一个条目

区间是 `date_sent → 最新的非空 recipients[].signature_date`。不是 `date_completed`：那是文档关闭的时间，不是它被签署的时间。对详情调用次数设上限（30 是合理的）并说明你是否设了上限。

**一个没有非空 `signature_date` 的文档根本没有区间。** 正是这条单规则把强制完成的文档挡在外面：一个通过 `documents_status_change` 翻转的文档带有 `date_completed` 已设置，但每个 `recipients[].signature_date` 为 `null`、签名字段 `is_filled: false`，所以它对平均值没有任何贡献，且不得被计为已签署。

把算术摆在明面上：列出每个文档的区间，然后陈述总和与计数，再相除。报告三者，而不只是商。一个与旁边列出的区间不符的均值是这里最常见的失败，而除非总和在页面上，它是不可见的。在报告之前用总和与计数核对商——这个算术在被观察到输出错误时其每个输入都是对的。

三件要披露而不是掩埋的事：

1. **样本量。** "在 7 个文档上 3.2 天"，绝不只是"3.2 天"。
2. **在途文档被排除**，因为它们尚未签署。这会**向下**偏置平均值——快的签署者被过度代表，而任何仍在拖延的都不可见。说明这一点。
3. **区间结束于哪个签名。** 在一个多签署者的文档上那是最后一个，所以该数字是*完全*执行的时长，而不是首次签署的时长。在输出中说明这一点。

如果没有什么符合条件，就说明样本为空。不要产出一个数字。

### 第 3 步：在途金额

对在途状态求和 `pricing.total`。

- **绝不用 `grand_total`**——它在一个价值 200,000 USD 的文档上被观察到为 `0 PLN`。
- 货币按表存在于 `pricing.tables[].currency` 中，且**因文档而异**。当 `tables` 为空时，改为读 `pricing.quotes[].currency`——Quote 块文档把其定价留在那里，而只看 `tables` 会让它们的金额没有标注。不要跨货币相加。按货币报告，或报告占主导的那个并说明排除了什么。
- `options.optional_selected: false` 的行被排除在表总额之外，所以用 `pricing.total` 而不是累加行项目。
- 没有定价表的文档不贡献任何东西。说明有多少没有金额，这样一个小总额不会被误认为一条小管道。

### 第 4 步：卡住的文档

从 `date_sent` 计算在途文档的时长。标记任何发出超过 14 天且未完成的，以及任何部分签署——一些 `recipients[].has_completed: true`、另一些 false——超过 7 天的。

尊重 `signing_order`：顺序流程中较晚的签署者不是迟了。

### 第 5 步：报告

先讲计数，然后带分母的签署时长，然后按货币的在途金额，然后最旧的在前卡住清单。以一段简短的方法说明结尾：哪些状态、设了什么上限、时长从何时起算、以及排除了什么及原因。

---

## 用法示例

```txt
@pandadoc-signing-velocity — 每周签署报告
```

```txt
@pandadoc-signing-velocity — 管道看起来怎样，什么卡住了？
```

---

## 故障排查

### 平均签署时长看起来快得不合常理

检查强制完成的文档。`documents_status_change` 会立即设置 `date_completed`，所以如果你按 `date_completed` 度量，一个在同一分钟内创建并翻转的文档会报告近乎零的时长。改为按最新的 `recipients[].signature_date` 度量，并排除所有那些都为 `null` 的任何项。

### 在途金额看起来太低了

要么你读了 `grand_total` 而不是 `pricing.total`，要么大多数在途文档确实没有定价表。报告没有金额的文档计数，以便两种情况可区分。

### 跨货币的总额加不起来

它们本就不应相加。`pricing.tables[].currency` 因文档而异——在同一账户中 USD 和 PLN 都被见过。按货币报告。

### 某个状态计数看起来被截断了

`documents_list` 最大 `count: 100`。如果某个状态恰好返回 100，把它当作下限并翻页或说明。

### 没有每个文档一次调用我就拿不到 `date_sent`

正确——它和 `recipients[].signature_date` 只存在于 `documents_details_get`。对你展开的文档数量设上限并披露该上限，而不是悄悄截断样本。
