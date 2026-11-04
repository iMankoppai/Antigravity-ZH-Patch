---
name: pandadoc-engagement-tracker
category: sales
roles: [sales, cs, owner]
complexity: intermediate
prerequisites: [PandaDoc]
description: 跨已发出的文档跟踪每个收件人的签署进度——谁签了、谁没签、按什么顺序，以及哪些文档停滞了。当有人问谁在拖住一笔交易，或已发送文档的整体局面如何时使用。
tags: [pandadoc, engagement, tracking, e-signature, sales]
version: "0.1.0"
metadata:
  visibility: public
---

# PandaDoc 交易室参与度跟踪器

谁签了、谁没签、什么已经沉寂——跨越当前所有已发出的东西。

**使用前先读下面的局限。** 就目前形式而言，本技能只报告*签署*进度。它无法告诉你谁打开了文档。

---

## 先决条件

PandaDoc MCP 服务器必须已连接。所需工具：`documents_list`、`documents_details_get`。可选且当前不可用：`documents_audit_trail_get`。如果所需工具缺失，说明情况并指向 <https://mcp.pandadoc.com>。

---

## 已知局限——没有查看事件

本技能的预期版本既报告打开也报告签名。那需要 `documents_audit_trail_get`，它当前返回：

```txt
403  "Access to this resource was forbidden in PandaDoc."   code: forbidden
```

这是在一个真实的已完成文档上、用一个能读取其他所有文档工具的连接得到的。尚未解决这是计划权益、OAuth 范围还是工作区权限。已针对 PD-111238 跟踪。

所以：**尝试一次审计轨迹，失败时干净地降级。** 从 `documents_details_get` 报告签署进度，并明确说明该账户上无法获得打开和查看事件。绝不要把"尚未签署"呈现为"尚未打开"——它们是不同的事实，而后者是销售人员会据此行动的更强信号。

如果该调用某天开始成功，就把事件加入时间线并去掉那个告诫。

---

## 工作流

### 第 1 步：收集已发出的文档

`documents_list` 配 `status: "Sent"`，然后用 `status: "Viewed"` 再来一次。每个状态一次调用——该参数接受单个字符串。用 `count: 100`。

只有当用户也问及内部阻滞时才包含 `Waiting for Approval` 和 `External Review`，并说明你覆盖了哪些状态。

如果用户点名了一个文档或一个对方，就收窄到那个而不是全面扫。

### 第 2 步：读取每个收件人的进度

每个文档 `documents_details_get`。从 `recipients[]` 中为每个人取：

- `first_name`、`last_name`、`email`
- `recipient_type`——**`signer` 或 `CC`。** CC 收件人不被期望签署，且始终 `signature_date: null`。把一个 CC 报告为"未签署"是噪音；把他们排除在未完成清单之外，如果有的话单独提及。
- `has_completed`——那个人是否完成
- `signature_date`——他们何时签署，签之前为 `null`
- `signing_order`——如果设置了，签名是顺序的，所以较晚的签署者不是迟了，只是还轮不到。说明这一点，而不是标记他们。

也检查 `fields[]`：一个 `is_filled: false` 的 `signature` 字段确认一项未完成的签名。

### 第 3 步：尝试审计轨迹，每个文档一次

调用 `documents_audit_trail_get`。如果它返回 403，在本次运行余下时间停止尝试——这是账户级门控，不是按文档的。记录一次查看事件不可用。

如果它成功，把其事件按时间顺序并入每个文档的时间线，并注明你报告所用的时区。

### 第 4 步：弄明什么停滞了

从 `documents_details_get` 中的 `date_sent` 计算每个文档的时长——你已经有那个详情调用。不要用 `date_created`；一个在草稿中待过的文档会看起来过期，而实际并非如此。

在以下情况标记为停滞：

- 它已发出**超过 7 天**且完全没有签名，或
- **部分**签署者已完成、其他人超过 7 天仍未完成——一份部分签署的文档比一份未被触碰的文档是更强的停滞信号，因为动量曾经存在并停止了

当设置了 `signing_order` 时，只标记实际轮到的那个人。

### 第 5 步：报告

每个文档：名称、状态、自发出以来的时长，以及每个签署者一行——已签署带日期，或未完成。分组或排序使停滞项在顶部。

然后平实地说明：

- 你覆盖了哪些状态
- 时长是从发送时起算的
- **该账户上无法获得打开和查看事件**，如果审计轨迹返回了 403

---

## 用法示例

```txt
@pandadoc-engagement-tracker — 谁在拖住 Acme 这笔交易？
```

```txt
@pandadoc-engagement-tracker — 最近两周有什么沉寂了？
```

---

## 故障排查

### 审计轨迹上 `403 forbidden`

在该账户上符合预期。降级到签署进度并说明查看事件不可用。不要按文档重试——门控是账户级的。

### 某人显示为未签署但说他们签了

检查 `signing_order`。顺序签署时，较晚的签署者在较早的人完成之前无法行动。也检查 `recipient_type`——CC 收件人没有可提供的签名。

### 一份已完成的文档上所有人都显示为未完成

确认你读的是 `documents_details_get` 的 `recipients[]`，而不是 `documents_send` 回显的收件人列表，后者不带 `has_completed`。

### 一份文档被强制完成且没有显示任何签名

`documents_status_change` 到 `Completed` 会设置 `date_completed`，但让每个 `signature_date` 保持 `null` 且 `is_filled: false`。没有人签署它。把它报告为手动完成，而不是已签署。
