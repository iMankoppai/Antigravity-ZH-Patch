---
name: pandadoc-followup-list
category: sales
roles: [sales, bizops, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: 扫过仍在等待签署的文档，按它们等待了多久以及价值多少排序，并为每一份草拟一条跟进消息。当有人问需要催促什么、哪些文档卡住了，或想要草拟提醒时使用。
tags: [pandadoc, follow-up, pipeline, e-signature, sales]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc 未签署文档跟进清单

找出仍在等待的东西，弄清什么最该先关注，并写好提醒。按计划运行或按需运行。

**你无法发送提醒。** 从一开始就清楚说明这一点——见下面的边界。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`documents_list`、`documents_details_get`。可选：`documents_search`。如果它们缺失，说明情况并指向 <https://mcp.pandadoc.com>。

---

## 边界——本技能不能做什么

PandaDoc MCP 中**没有提醒端点**，而 `documents_send` 只接受 `Draft` 状态的文档。因此一份已经 `Sent` 的文档**无法通过 API 重新发送或催促**。

所以本技能浮现过期的东西、对它们排名，并**草拟文本**。由用户发送，或由 PandaDoc 内置的自动提醒发送。绝不要说或暗示已发送提醒。绝不要对一份 `Sent` 文档调用 `documents_send`——它会失败，而尝试它暗示你误解了你在做什么。

---

## 工作流

### 第 1 步：确定"等待"意味着什么，并说明它

文档状态是一个 15 项的封闭集合。那些可能意味着"已发出但未完成"的：

- **`Sent`**——已送达，未打开
- **`Viewed`**——已打开，未签署
- **`Waiting for Approval`**——卡在内部审批，不在对方那里
- **`External Review`**——在对方的审查者那里
- **`Waiting for Payment`**——已签署但未付款，是另一种催法

默认使用 **`Sent` 和 `Viewed`**——那些毫无歧义地"在等对方签署"。只有当用户请求暗示了其他状态时才包含它们（"任何地方卡住的"、"包括审批的"），并**在输出中说明你计入了哪些状态**。一份范围不可见的清单无法被信任。

绝不包含 `Draft`（从未发送）、`Completed`、`Paid`、`Declined`、`Expired`。

### 第 2 步：收集它们

`documents_list` 接受**单个** `status` 字符串，所以每个状态一次调用。`documents_search` 接受 `status[]` 但要求非空的 `query`，那会悄悄收窄扫描——所以优先用几次 `documents_list` 调用并配 `count: 100`。

注意没有排序参数；默认顺序是 `date_created` 降序。

### 第 3 步：计算每份文档的时长

`documents_list` 免费给你 `date_created` 和 `date_modified`。它**不**给你 `date_sent`——那只在 `documents_details_get` 里，每个文档一次调用。

有意地选择：

- **`date_sent`** 是"它已经发出多久"的诚实度量，但每个文档要花费一次调用。
- **`date_created`** 免费，但对任何先在草稿里待过的东西会高估等待时长。

当集合小（比如说少于 30 个文档）时默认用 `date_sent`，超过则默认用 `date_created`，并**说明你用了哪个**。如果你用了 `date_created`，说明该数字是自创建以来的时间，而不是自发送以来的时间——否则用户会把它读成后者。

按时长分桶：**0–3 天 / 4–7 / 8–14 / 15+**。每个桶内最旧的在前。

### 第 4 步：添加金额和收件人，如果用户想要排名

金额和收件人只存在于 `documents_details_get`。如果你已经为 `date_sent` 调用它，就在同一趟里取它们。

- 金额 → `pricing.total`，货币 → `pricing.tables[].currency`，当 `tables` 为空时回退到 `pricing.quotes[].currency`。一个基于 Quote 块构建的文档其定价在 `quotes[]` 下且 `tables[]` 为空，所以只读 `tables` 会悄悄丢掉货币。
- **绝不用 `grand_total`**——它在一个价值 200,000 USD 的文档上被观察到读作 `0 PLN`
- `options.optional_selected: false` 的行被排除在总额之外，所以不要自己累加行项目
- 收件人 → `recipients[]`，每个收件人的 `has_completed` 告诉你谁在拖住它

先按时间、再按金额排名。一份 20 天前、价值 5 千美元的文档通常比一份 2 天前、价值 50 万美元的文档更需要催促，而用户如果不同意可以重新排序。

如果你跳过了详情调用，说明清单未按金额排名，而不是报告零。

### 第 5 步：为每份文档草拟一条提醒

每个文档一条简短消息，发给尚未完成的收件人。用名称引用该文档，说明它等待了多久，并在存在时从 `recipients[].shared_link` 给他们签署链接。

保持平实简短——用户会在发送前编辑。不要编造文档里没有的紧迫感、截止日期或商业条款。

### 第 6 步：报告

按桶分组，最旧的在前。对每份：名称、状态、时长、谁未签署、金额（如果你有）、以及草拟的提醒。然后平实地说明：

- 你计入了哪些状态
- 时长是自发送起还是自创建起
- **什么都没有发送**，这些是供用户发送的草稿

---

## 用法示例

```txt
@pandadoc-followup-list — 有什么需要催促？
```

```txt
@pandadoc-followup-list — 显示一切卡住超过一周的东西，包括任何在等内部审批的，并草拟提醒
```

---

## 故障排查

### 清单是空的但我知道文档发出去了

检查你查询了哪些状态。一份停在 `Waiting for Approval` 或 `External Review` 的文档是已发出的，但不在默认的 `Sent`/`Viewed` 集合里。

### 时长看起来太长了

你对停在草稿里的文档用 `date_created` 计算了时长。对受影响的文档改用 `documents_details_get` 的 `date_sent` 重新运行。

### 金额显示为 0

你读了 `grand_total`。用 `pricing.total`。

### `documents_send` 在其中一份上失败

符合预期，而且本就不该尝试。`documents_send` 要求 `Draft`；一份 `Sent` 文档根本无法通过 API 催促。草拟文本并交给用户。
