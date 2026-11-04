---
name: pandadoc-renewal-radar
category: legal
roles: [sales, legal, finance, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: 已签署合同中临近续约或到期的摘要，带对方、金额和剩余天数。读取提取出的续约字段（续约行动截止日、期限长度、续约类型、退出期），而不是从文档正文猜测期限，并把合同自身的结束日期与签署链接到期区分开，二者不是同一回事。当有人问接下来有什么要续约时使用。
tags: [pandadoc, renewals, contracts, legal, reporting]
version: "0.1.0"
metadata:
  visibility: internal
---

# PandaDoc 合同续约雷达

哪些已签署合同临近续约、它们价值多少、还剩多久。

**本技能的陷阱在于你用哪个日期。** PandaDoc 有三个看起来可互换、实则不能互换的日期概念。搞错了会产出一份自信地关于错误东西的清单。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`documents_list`、`documents_details_get`、`documents_metadata_batch_get`。有用的工具：`documents_search` 用于按日期列收窄，以及 `documents_content_get` 或 `documents_summary_get` 作为某合同没有提取出的期限字段时的最后手段。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

没有 `documents_metadata_get`。每次元数据读取都经过 `documents_metadata_batch_get`，它接受 1-40 个 ID，所以一个文档就是一个单元素的 `document_ids`。

---

## 三个日期，只有一个才是续约日期

| 概念 | 哪里 | 它实际是什么 |
| --- | --- | --- |
| `expiration_date` / `date_expiration` / `date_expired` | `documents_list`、`documents_details_get`、`documents_search` | **签署链接的到期。** 在发送时设置——观察到为 `date_sent` + 约 60 天。一旦签署就无意义。 |
| `effective_date` | 仅 `documents_search` 的过滤器列 | 协议生效的时间。更接近你想要的，但它是开始日期，不是结束日期。 |
| `Agreement date` | `documents_metadata_batch_get`，AI 提取 | 合同正面上的日期。也是开始，不是结束。 |

**它们没有一个是续约日期。** 没有任何文档字段持有合同结束日期。

这不意味着你必须读合同正文。期限和续约行为被提取进单独的**元数据字段**——包括一个已经是日期的字段——下一节列出它们。先读那些；正文是最后手段，不是第一步。

无论你用哪个，都要向用户说清楚，因为把一个推导出的日期当作存储的日期呈现是误导。

**绝不要用 `expiration_date` 构建这份清单。** 那是签署链接，在一份已签署的合同上它什么都说明不了。一份由它构建的"即将到期的合同"清单就是错的——而且它会看起来合理，这正是问题所在。

---

## 续约条款是提取出的字段。按键索要它们

期限被提取进已完成合同上的具名元数据字段。**在你读任何文档文本之前先读那些字段。** 当一个字段已经持有期限时却从正文读期限，正是本技能在一份明确写明了期限的合同上产出"我无法推导续约日期"的原因。

`documents_metadata_batch_get` 配 `field_keys`（区分大小写，未知键被忽略）：

| 键 | `field_type` | 值的形状 | 它给你什么 |
| --- | --- | --- | --- |
| `Next renewal action deadline` | `date` | ISO 8601 | 要行动到的日期。存在时直接用它。 |
| `Agreement date` | `date` | ISO 8601 | 初始期限的开始。 |
| `Initial term length` | `duration` | `value` 加上单独的 `period`（`months`、`years`、`days`） | 初始期限的长度。 |
| `Renewal term length` | `duration` | 同上 | 第一个之后的每个续约周期的长度。 |
| `Renewal type` | `dropdown` | JSON 数组**作为字符串**，例如 `"[\"Auto-Renew\"]"` | 它是自行续约还是需要签名。 |
| `Renewal opt out period` | `duration` | 同上 | 期限结束前的通知窗口。 |
| `Counterparty name` | `multi_line` | 文本 | 合同与谁签订。 |
| `Contract value`、`Contract currency` | `currency`、`dropdown` | `value` 加上 `currency_code` | 无需第二次调用即得金额。 |

两个形状陷阱：一个 `duration` 把单位放在兄弟字段 `period` 里，所以 `"12.0"` 只有在 `period` 这么说时才是十二*个月*；而一个 `dropdown` 值是一个被序列化成字符串的 JSON 数组，所以 `Renewal type` 读作 `"[\"Auto-Renew\"]"`，而不是 `Auto-Renew`。

`Next renewal action deadline` 被观察到为期限结束减去退出期：一份 `Agreement date` 为 2026-09-08、`Initial term length` 为 12 个月、`Renewal opt out period` 为 30 天的订单表携带 `2027-08-09`。当该字段存在时用它作为交叉检查，当它不存在时用它作为要执行的算术。

不是每份合同都有这些字段。一份没有期限的报价或方案什么都不声明，它的元数据回来时根本没有续约键——那是一个真正未知，不是一次失败的查找。说明是哪一种。

---

## 工作流

### 第 1 步：获取已签署的合同

只有 `Completed` 和 `Paid` 文档可能临近续约。`Draft` 或 `Sent` 文档还不是合同。

`documents_list` 配 `status: "Completed"`，然后 `status: "Paid"`，`count: 100`。

**不要**用带 `signature_date` 窗口的 `documents_search` 来确立"已签署"：那个过滤器返回没人签过的文档。它匹配被强制完成的文档，其 `recipients[].signature_date` 为 `null`。如果你需要确认某文档确实已签署，在 `documents_details_get` 中按收件人检查 `signature_date`。

### 第 2 步：为每份合同确立一个开始日期

按偏好顺序：

1. `documents_metadata_batch_get` → **`Agreement date`**。只存在于已完成的文档上，且异步提取。每个文档报告自己的 `status`：`extraction_pending` 在 `retry_after` 秒后重试一次，并对 `extraction_not_started`（文档未完成）或 `extraction_failed`（终端）回退。
2. `documents_search` 配 `date_filter_column: "effective_date"`，如果你是在收窄而不是逐个读文档。
3. `date_completed` 作为最后手段——它被签署的那天。说明你用了它。

每个提取值都带 `acceptance_status`，它在每个样本上都是 `pending`——AI 提取、未经人工确认。**当你报告一个来自元数据的日期时说明这一点。**

### 第 3 步：确立一个期限，并对此诚实

沿这个梯子向下走，在第一个能回答的梯级停下。说明你用了哪个梯级。

1. **`Next renewal action deadline`**——一个日期字段。存在时，那就是答案；无需算术。
2. **`Agreement date` + `Initial term length`** → 初始期限的结束。用它做两件事：
   - **如果那个结束已在过去**，合同处于一个续约周期中：从它按 `Renewal term length` 步长向前滚动，直到某个周期结束落在未来，并报告那一个。在一份两年前就续约过的合同上报告初始期限结束，会把一个历史日期放在一份按剩余天数排序的清单顶部。如果 `Renewal term length` 缺失，说明当前周期结束未知，而不是把过去的那个报告为即将到来。
   - **减去 `Renewal opt out period`** 从周期结束，得到客户实际必须行动到的日期——雷达存在正是为了浮现它。按**日历天**倒推，而不是倒推到月份边界：一个 2027-09-08 结束、有 30 天退出期的周期必须最迟在 **2027-08-09** 行动，那正是该合同上提取出的截止日字段本身所携带的值。把 `Renewal type` 并列报告：一份没人取消的 `Auto-Renew` 合同是一次续约，一份需要新签名的是一笔交易。
3. **文档文本**——只有当上述字段缺失时。`documents_summary_get`（`summary_type: "detailed"`）或 `documents_content_get`，寻找时长和任何自动续约的措辞。
4. **未知**——没有字段、没有条款。按合同说明并说明原因。

关于第 3 梯级的两条警告：

- `documents_summary_get` 返回的是**文档的 markdown 重渲染**，不是结构化摘要，而在一个字段为空的文档上，它会把**占位符渲染得好像它们是条款**——`Effective Date: May 12`、`Governing Law … State of (State)`。不要从占位符读出期限。如果值看起来像模板默认值，就把期限当作未知。
- 如果你找不到期限，说明该合同的续约日期未知，而不是假定十二个月。一个编造的续约日期比一个空缺更糟，因为没人会去核对它。

按合同陈述算术，包括当你向前滚动了一个周期时该日期属于哪个周期。如果你对日历减法没有信心，就给出窗口——"2026-10-31 之前 30 天"——而不是发布一个你猜的日期。错误的截止日正是本技能存在要防止的那一种失败。

### 第 4 步：添加对方和金额

- 对方 → `documents_metadata_batch_get` → `Counterparty name`，带同样的 `acceptance_status` 告诫
- 金额 → `documents_details_get` → **`pricing.total`**，货币来自 `pricing.tables[].currency`，或当 `tables` 为空时 `pricing.quotes[].currency`——Quote 块文档把其定价留在那里
- **绝不用 `grand_total`**——在一个价值 200,000 USD 的文档上被观察到为 `0 PLN`

`documents_metadata_batch_get` 每次请求覆盖 1–40 个文档，值得用它而不是每个一次调用。

### 第 5 步：报告

按剩余天数排序，最近的在前。每份合同：对方、名称、开始日期及其来源、期限及其来源、续约日期、有退出期时的退出截止日、`Renewal type`、剩余天数、带货币的金额。

然后说明：

- 每个日期来自第 3 步的哪个梯级——读到的 `Next renewal action deadline` 与 `Agreement date` 加上一个期限是不同的主张，而两者都与从正文读出的期限不同
- 推导出的续约日期是**推导的**，不是存储的，以及所用的算术
- 每个提取值都带 `acceptance_status: pending`
- 有多少合同没有续约字段也没有条款，这样一份短清单不会被读成一条安静的管道

---

## 用法示例

```txt
@pandadoc-renewal-radar — 接下来 90 天有什么要续约？
```

```txt
@pandadoc-renewal-radar — 带金额的每周续约摘要
```

---

## 故障排查

### 清单充满最近发送的文档

你用了 `expiration_date`。那是签署链接到期，在发送时设为约 60 天后，与续约毫无关系。从 `Completed`/`Paid` 和一个推导出的合同结束日期重建。

### 某合同显示一个与模板默认值匹配的期限

你读的是占位符而不是填好的值。`documents_summary_get` 把未填的模板字段渲染得好像它们是内容。把期限当作未知。

### 技能说它找不到续约日期并开始读合同正文

它跳过了第 3 步梯级 1。`Next renewal action deadline`、`Initial term length`、`Renewal term length`、`Renewal type` 和 `Renewal opt out period` 是提取出的字段——用 `documents_metadata_batch_get` 按键索要它们。只有真正一个都没有的合同（一份报价、一份方案、一份没有期限的 NDA）才落到文本。

### `documents_metadata_get` 不是一个工具

它在 MCP 服务器上不存在。用 `documents_metadata_batch_get` 配一个单元素的 `document_ids`。

### `Renewal type` 读作 `["Auto-Renew"]` 而期限长度读作 `12.0`

两者都是原始形状，不是错误。一个 `dropdown` 值是一个被序列化成字符串的 JSON 数组；一个 `duration` 值把其单位放在兄弟 `period` 字段里。把它们渲染为 "Auto-renew" 和 "12 months"——当 `period` 缺失时绝不猜测单位。

### 元数据返回 `extraction_not_started`

提取只在已完成的文档上运行且是异步的。如果文档已完成，在 `retry_after` 间隔后重试；否则回退到 `date_completed` 并说明。

### 金额显示为 0

你读了 `grand_total`。用 `pricing.total`。

### 一份"已签署"的合同结果未签署

它是用 `documents_status_change` 翻转的，那会设置 `date_completed` 但让每个 `recipients[].signature_date` 保持 `null`。在把文档当作合同之前检查每个收件人的签名日期。
