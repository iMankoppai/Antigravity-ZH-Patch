---
name: pandadoc-quote-builder
category: sales
roles: [sales, bizops, owner]
complexity: advanced
prerequisites: [PandaDoc]
description: 从模板构建一份带定价的 PandaDoc 报价或方案——填写定价表和变量，核实总额与折扣是否真按所要求落地，确认，然后发送以供签署。当有人想为客户创建一份报价、方案或带定价的报价单时使用。
tags: [pandadoc, quotes, proposals, pricing, e-signature, sales]
version: "0.1.1"
metadata:
  visibility: public
---

# PandaDoc 报价与方案构建器

把"给 Acme 报价 200 个许可证，打 9 折"变成一份真实的、定价正确的 PandaDoc 文档，在任何人看到之前检查过，并只在确认后发送。

难的部分不是创建文档。而是**API 会接受你的定价，然后悄悄产出与你要求不同的数字。** 本技能大部分内容都是关于抓住这一点。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`templates_list`、`templates_details_get`、`documents_create`、`documents_status_get`、`documents_details_get`、`documents_update`、`documents_send`。如果它们缺失，告诉用户 MCP 服务器未连接并指向 <https://mcp.pandadoc.com>。

---

## 用户提供什么

从他们的消息中提取：

- **客户名称**——必需。用于文档名和 `Client.*` 令牌。
- **模板**——一个名称或描述（"我们的标准方案"）。如果缺失，询问；不要自己挑一个。
- **行项目**——每一项的描述、单价、数量。如果价格缺失，询问。
- **折扣**——可选。仔细读："10% discount" 几乎总意味着*客户少付 10%*，而不是*在模板已有折扣之上再加 10%*。见第 3 步。
- **收件人邮箱**——只在发送时需要。如果用户只想要草稿，跳过它。

---

## 为什么这不仅仅是"带定价创建"

四种行为，全部针对实时 MCP 验证过，而草率的流程会搞错：

1. **`discount.name` 决定你的折扣是替换模板的折扣还是加到它之上。** 它是一个键，不是标签。在一个带 15% 的模板上验证：在名字 `"Discount"`——模板已经使用的名字——下传入 `10`，恰好产生 **10%**，替换了它。在一个新名字如 `"Special promo"` 下传入 `10`，产生 **25%**，追加了第二个折扣。名字弄错，价格就错，且没有错误、文档看起来正常。
2. **`grand_total` 不是文档的价值。** 它在一个 `pricing.total` 为 `200000` USD 的文档上被观察到读作 `{amount: "0", currency: "PLN"}`。绝不向用户报 `grand_total`。
3. **未选中的可选行被排除在总额之外。** 一个 `options.optional_selected: false` 的行不贡献任何东西，所以你自己累加行项目计算出的总额会与文档不一致。
4. **有些模板根本无法读取。** `templates_details_get` 可能在某个特定模板上以 `PANDADOC_API_RESPONSE_INVALID` 失败，而由它创建的每个文档都以同样方式失败——尽管创建本身成功。所以创建成功并不意味着你能验证结果。

---

## 工作流

### 第 1 步：找到模板

用 `q` 设为用户的措辞和 `count: 10` 调用 `templates_list`。

`q` **不是**名称子串匹配，尽管参数描述这么说——一次对 "NDA" 的搜索曾返回一个名为 `Declaration H&S standards and regulations` 的模板。所以：

- **一个匹配：** 按名称和 ID 报告它，并继续。说明你挑了哪个模板。
- **多个匹配：** 列出名称 + ID 并询问。绝不猜测——错误的模板意味着错误的价格。
- **没有匹配：** 把词放宽一次，然后列出所有模板并询问。

**如果账户没有合适的模板，平实地说明并停止。** 没有模板就无法构建带定价的文档，而那些看似可用的变通全都失败。2026-08-06 验证：

- **`source: "markdown"` 无法携带定价。** 该参数在那个 source 上不存在——schema 直接拒绝 `pricing_tables`——而把价格表写进 markdown 正文也没用：它会作为普通内容表落地，`pricing` 返回 `{}`，`grand_total` 为 `0`。数字是惰性文本。没有可验证的东西、没有可应用的折扣、没有货币。该文档还有 `fields: []`，其收件人被悄悄降级为 `recipient_type: "CC"`，所以没人能签署它。
- **`source: "file"` 也不能。** 它不接受 `pricing_tables`。`parse_form_fields` 处理字段，不是定价。
- **`templates_create` 不是绕开它的办法。** 它从一个位于公共 HTTPS URL 的 PDF 构建模板——而聊天无法产出那个——而一个派生自 PDF 的模板反正也不携带结构化定价表。

所以当用户说"就给我做一个报价"而有没有模板时，诚实的答案是必须先有一个。产出一个把价格敲进去的 markdown 文档是可用的最糟结果：它看起来像一份报价，总额不可验证，折扣从未应用，而且无法被签署。不要这么做，也不要把它当作回退提供。

模板本身还必须满足两个进一步的要求——在承诺任何东西之前在第 2 步检查它们：其定价块必须是**经典定价表**而不是 Quote 块，且它必须已经是用户想要的**货币**，因为货币无法通过 API 设置。

### 第 2 步：检查模板——并处理它可能不可读

用所选 ID 调用 `templates_details_get`。你需要从它得到三样东西：

- **`pricing.tables[]`**——你将填充的定价表的名称。你必须确切传入这个名称；定价按名称匹配，不按位置。
- **`pricing.tables[].summary.discount` 和 `subtotal`**——模板**已有的**折扣。把它算成百分比：`summary.discount / summary.subtotal`。你在第 3 步需要这个数字。
- **`roles[]`**——谁签署。注意是否有角色设置了 `preassigned_person`；没有它的角色需要一个显式收件人。

**如果这次调用失败**，报 `PANDADOC_API_RESPONSE_INVALID`，停下并告诉用户该模板通过 API 不可读，建议换一个。不要继续——没有模板当前折扣你无法计算折扣增量，之后你也无法验证结果。

如果 `pricing.tables` 为空，在说什么之前先检查 `pricing.quotes`——两种情况看起来相似但并不相同：

- **`tables` 和 `quotes` 都为空**——模板确实没有定价块。说明并请求一个有定价块的。
- **`tables` 为空但 `quotes` 被填充**——模板使用 Quote 块。它*有*定价，但 API 无法写入它：`documents_create` 上没有 `quotes` 参数，而 `pricing_tables` 会被接受然后**悄悄忽略**，留下一个带有模板原始空行和 `total: "0"` 的文档。不要尝试它，也不要从这样的文档报告总额。告诉用户该模板的定价块是 Quote，无法通过 API 填充，并请求一个基于经典定价表构建的模板。

第二种情况是危险的那种：什么都不报错，所以一份从未定价的报价回来时看起来像一份价值为零的完成文档。

也要注意货币。`pricing.tables[].currency` 由模板固定，在创建时**无法覆盖**——传入不同的货币会以 `Wrong request currency … mismatch template currency` 失败。如果用户金额是另一种货币，就说明并请求一个他们货币的模板，而不是把他们的数字写进错误的面额。

### 第 3 步：确定折扣意味着什么，然后相应地挑选名称

这是带来差别的步骤——而且它不需要算术。

令 `T` 为用户点名的折扣，`D` 为第 2 步中模板已有的折扣。如果 `D` 为零，传入 `T` 并继续。如果 `D` 非零，请求是含糊的，只有用户能了结，所以询问：

> 这个模板已经打了 `D`% 的折扣。你要求 `T`%——客户最终应当整体是 `T`%，还是在现有 `D`% 之上再加 `T`%？

然后挑选与该答案匹配的折扣**名称**，因为名称才是控制组合方式的东西：

| 用户想要 | 传 | 在 `discount.name` 下 |
| --- | --- | --- |
| 总共 `T`% | `T` | `"Discount"`——模板自己的名称，它**替换**它 |
| 在 `D`% 之上再加 `T`% | `T` | 任何新名称，例如 `"Special promo"`——它**追加** |

**不要**计算像 `T − D` 这样的差值。那是早先对这个 API 的误读，当名称恰好匹配时它会产生附加费：在一个 15% 模板上的 `"Discount"` 下传入 `−5`，产生 −5% 的附加费，而不是 10% 的折扣。

一个使第 6 步成为必需的告诫：**模板的折扣名称无法从 `templates_details_get` 读取。** 模板响应携带 `summary.discount`，但让 `items[].discounts` 为空——名称只出现在已创建的文档上。`"Discount"` 是观察到的默认值，也是一个可靠的初次猜测，但它是一个猜测。验证，然后修正。

无论你应用了哪种解读，**在输出中说明它。**

### 第 4 步：创建文档

调用 `documents_create`：

```json
{
  "source": "template",
  "template_uuid": "<from Step 1>",
  "name": "<Type> - <Client> - <YYYY-MM-DD>",
  "recipients": [
    { "email": "<email>", "first_name": "<first>", "last_name": "<last>",
      "role": "<exact role name from Step 2>",
      "delivery_methods": { "email": true, "sms": false } }
  ],
  "tokens": [{ "name": "Client.Company", "value": "<Client>" }],
  "pricing_tables": [{
    "name": "<exact table name from Step 2>",
    "options": { "currency": "USD", "discount": { "name": "Discount", "type": "percent", "value": "<pass from Step 3>" } },
    "sections": [{
      "title": "Products", "default": true,
      "rows": [{
        "data": { "name": "<item>", "price": <unit price>, "qty": <quantity> },
        "options": { "optional": false, "optional_selected": false, "qty_editable": false }
      }]
    }]
  }]
}
```

否则会让你多跑一趟的两件事：

- **每一行都必须有 `options`**，即使 schema 把它标为可选。省略它会返回 `400 validation_error` 和 `{"rows": [{"options": ["This field is required."]}]}`。
- 始终把 `delivery_methods` 设为仅邮件，除非提供了电话号码，否则之后发送会以 `A phone number is required` 失败。

### 第 5 步：等待草稿

`documents_create` 返回状态 `Uploaded`。轮询 `documents_status_get` 直到它读作 `Draft`。通常一两次调用。

注意 `Draft` **并不**保证文档已准备好进行状态转换——见第 7 步。

### 第 6 步：验证数字——不要跳过这一步

在向用户展示任何东西之前，调用 `documents_details_get` 并检查：

1. **有效折扣与用户所要求的一致。** 计算 `summary.discount / summary.subtotal` 并与 `T` 比较。一个**负的** `summary.discount` 意味着你产出了附加费——名称没有按预期表现。无论哪种，如果不匹配，用 `documents_update` 直接传目标值修正它，然后重新读取并再次检查。绝不报告一个你未验证过的数字。
2. **每个行项目都在**，带正确的 `qty` 和 `price`，且每行的 `subtotal` 是你所预期的。
3. **没有你打算计入的行带 `options.optional_selected: false`。** 如果有一个如此，它的 subtotal 被排除在总额之外。
4. **从 `pricing.total` 读取价值**，绝不用 `grand_total`。
5. **货币**来自 `pricing.tables[].currency`。

验证结果而不是信任请求是有意为之，而且它已经证明了自己的价值：本技能的第一个版本在"折扣总是相加"的假定下计算差值，一次实时运行产生了 5% 的**附加费**而不是 10% 的折扣。验证步骤抓住了它，修正落在正确的数字上。即使组合规则改变也要保留这一步——它在任何一种规则下都是正确的。

### 第 7 步：确认，然后发送

向用户展示你验证过的数字——小计、作为百分比和金额的折扣、总额、货币——加上你用了哪个模板和哪种折扣解读。然后询问：

> 准备把 **"\<name\>"** 发送给 **\<email\>**？小计 \<X\>，\<T\>% 折扣，总额 \<Y\> \<currency\>。

只有明确同意后，才用 `subject` 和简短 `message` 调用 `documents_send`。

如果它返回 `409 The document isn't ready for a status transition yet`，稍等片刻并重试一次。即使 `documents_status_get` 已报告 `Draft` 也会发生——这是已知的竞态，不是你输入的错误。

如果它返回 `400 Not all signature, initials fields were assigned`，某个签署角色没有收件人。再次读取 `roles[]`，用 `documents_update` 添加缺失的收件人，然后重试。

如果用户不想发送，就留作草稿并给他们链接：`https://app.pandadoc.com/a/#/documents/<document_id>`

---

## 用法示例

```txt
@pandadoc-quote-builder — 用我们的标准方案给 Acme Corp 报价：200 个 Enterprise 许可证，单价 $1000，12 个月支持 $1500/月，9 折。发送到 procurement@acme.com
```

```txt
@pandadoc-quote-builder — 给 Globex 建一份草稿报价，50 个席位，单价 $99，无折扣。不要发送。
```

---

## 故障排查

### 总额与我的计算不符

检查可选行。一个 `options.optional_selected: false` 的行被排除在 `summary.subtotal` 之外。也确认你读的是 `pricing.total` 而不是 `grand_total`。

### 折扣算出来高于所要求的

你的 `discount.name` 与模板的不匹配，所以你的被追加而不是替换它。用 `name: "Discount"` 重新签发，或用 `documents_update` 直接传目标值修正文档。

### 折扣算出来是负数——总额高于小计

你在一个替换模板折扣的名称下传入了负值，所以它变成了附加费。改为把目标百分比作为正数传入。绝不传计算出的差值。

### 模板或文档上 `PANDADOC_API_RESPONSE_INVALID`

该模板的数据无法被 API 序列化。它同时影响模板和由它创建的每个文档，尽管创建本身成功。换一个模板并报告那个损坏的。

### 提到 `options` 的 `400 validation_error`

每个定价行都需要一个 `options` 对象，即使实际上为空。schema 说它是可选的；API 不同意。

### `grand_total` 显示 0

符合预期。它不反映定价表。用 `pricing.total`。

### 发送时 `409`

文档在创建后仍在稳定中。重试一次。不要循环。
