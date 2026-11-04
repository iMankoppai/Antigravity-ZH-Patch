---
name: approve-exempt
description: >-
  在当前范围批准待处理的 Harness STO 安全豁免（waiver），或将其提升
  到项目、组织或账户范围。用户对范围内的批准和
  更高范围的提升都说 "approve"——不要要求他们说 "promote" 一词。支持批准一个豁免
  或混合列表，其中每一行有不同的批准范围。默认工作流在聊天中列出待处理
  豁免（分页预览），以便用户按行号挑选——无需从
  Harness UI 复制。在用户想要批准、签署或清除待处理豁免、豁免批准、
  组织范围批准或账户范围批准时使用。
  触发短语：批准豁免、approve exemption、批准 waiver、签署豁免、
  清除待处理豁免、为组织批准、为账户批准、组织范围批准、
  账户范围批准、待处理豁免。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Approve pending STO exemptions at current scope or elevate to Project, Org, or Account
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 批准豁免

批准一个或多个**待处理**的 STO 安全豁免。此技能涵盖某人请求豁免后的批准工作流（创建见 `/exempt-vuln`）。

**待处理范围仅有 `PROJECT`、`PIPELINE` 或 `TARGET`。** 豁免仅在
项目、流水线或目标范围被*请求*（All Issues → 项目；Vulnerabilities 标签 → 项目、
流水线或目标）。STO 不在组织或账户范围创建待处理请求——那些
更宽的范围仅在批准时的提升**之后**才存在（`body.scope` `ORG` 或 `ACCOUNT`）。在正常流程中，你不会在
`status: Pending` 的行上看到 `scope: ORG` 或 `scope: ACCOUNT`。
如果列表行显示 `ORG`/`ACCOUNT`，它已被批准/放宽（重新批准或不同的
工作流），而非此技能针对的新待处理请求。

Harness 暴露两种不同的 "scope" 概念——不要混淆：

| 概念 | 控制什么 | 如何使用 |
|---|---|---|
| **列表范围** | 你读取哪个项目的豁免队列 | 始终在**项目**范围列出。绝不要向 `harness_list` 传递 `resource_scope='account'` 或 `'org'`。 |
| **批准范围** | 批准后豁免在哪里生效 | 在 `harness_execute` 上作为 `body.scope` 传递——`CURRENT`、`PROJECT`、`ORG` 或 `ACCOUNT`。 |

用户几乎总是说**批准**，即使他们想要组织或账户范围的覆盖。将
"approve for org"、"org-wide" 和 "at account level" 视为**带提升的批准**——MCP
服务器在内部将这些路由到 promote 端点。你永远不需要单独的
`action='promote'` 调用；始终使用 `action='approve'` 搭配正确的 `body.scope`。

**让 Harness UI 不在循环中。** 不要要求用户从平台复制问题标题、CVE 或
豁免 ID。你的默认开场动作是在
**聊天中列出待处理豁免**，显示编号表，报告 `total`，并让他们按行号挑选（或如果他们主动给出关键词则用
`search` 缩小）。分页按请求显示更多行——你绝不一次性倾倒整个队列。

## 说明

### 步骤 1——确定项目上下文

你需要 **org** 和 **project**，除非它们已在会话默认值中或粘贴的 Harness
URL 提供了它们。

豁免列表 URL 形状（自动提取 org/project）：

`…/ng/account/{accountId}/all/orgs/{org}/projects/{project}/sto/exemptions`

### 步骤 2——呈现待处理豁免（默认开场动作）

除非用户已经从**你在本会话中展示的表**中挑选了行号，
否则在要求他们选择任何东西之前调用 `harness_list`。不要把他们送到 Harness UI。

#### 显示分页预览，而非整个队列

聊天是狭窄的表面——倾倒 50 个待处理行不可读。默认行为：

1. 用 `status: Pending`、`size: 5`、`page: 0` 调用 `harness_list`（除非 org/project 仍
   未知——先解决它们）。
2. 从响应中读取 **`total`**。
3. 按 `_display_hint` 从 `items[]` 渲染表格。为行编号 **1–N** 以匹配
   `_action_id_by_row`（从 1 开始）。
4. 告诉用户有多少待处理豁免以及如何继续：
   - 如果 `total` ≤ 5：显示每一行；询问批准哪些。
   - 如果 `total` > 5：显示第一页并说类似：
     > 此项目中有 **{total}** 个待处理豁免。下面显示第 1–5 行。按
     > 编号挑选（例如 `1`、`1 and 3`、`2-4`），说 **next** 查看下一页，或给出
     > **search** 词以缩小（CVE、请求者、问题标题）。
5. 对于**下一页**，严格遵循 `_nextPageHint`——保持 `size`、`status` 和任何 `search`
   完全相同；仅递增 `page`。

```
harness_list
  resource_type: "security_exemption"
  org_id: <org>
  project_id: <project>
  filters:
    status: "Pending"
    size: 5
    page: 0
    search: "<optional — only when user narrows>"
```

规则：

- `status` 必须是**单个**值（`Pending`），不能逗号分隔。
- 在分页会话的每次调用中，`filters` 内**默认 `size: 5`**。不要在会话中途提升
  `size`，除非用户明确要求更大的页（例如 "show 10"）。
- 分页时保持 `size` 和所有其他过滤器**完全相同**；逐字遵循 `_nextPageHint`。
- 绝不传递 `resource_scope`，也绝不将 `org_id` / `project_id` 设为 `org` 或
  `account` 之类的词——那些是批准范围短语，不是列表覆盖。

列表响应针对聊天优化：

- `items[]`——仅显示字段（`issue_title`、`severity`、`type`、`requested_by`、`target`、
  `scope`、`reason` 等）。**表格中无豁免 ID。**
- `_action_id_by_row`——将行号（**当前页**上从 1 开始）映射到 execute 调用的 `exemption_id`。
- `_display_hint`——列布局；遵循它。
- 每一行的 `scope` 是豁免的**请求范围**——待处理行预期只有 `TARGET`、`PIPELINE`
  或 `PROJECT`。

#### 选择提示词

显示表格后，始终包含：

1. **`total`** 待处理计数（项目范围，而不仅是此页）。
2. **如何挑选**——按你刚渲染表格中的行号。
3. **示例输入**——涵盖范围和注释的可复制示例，以便用户不必
   猜测语法（这是用户卡住的部分）。
4. **如何查看更多**——"next" / "next page"（分页）或缩小用的搜索词。

每次都以**示例输入块**渲染提示词。不要将其改写成"挑一个
编号"——用户需要看到他们可以在一条消息中混合范围和注释。模板：

> 此项目中有 **12** 个待处理豁免。下面显示第 1–5 行。
>
> **回复行号**以及（可选）每行的批准范围 + 注释。你可
> 调整的示例：
>
> - `1`——在当前范围批准第 1 行，无注释
> - `1 as-is`——相同，更明确
> - `2 for project`——将第 2 行放宽到项目范围
> - `3 for org` / `3 org-wide`——将第 3 行提升到组织范围
> - `4 for account`——将第 4 行提升到账户范围
> - `5 with comment "JIRA SEC-440, fix tracked"`——在当前范围批准并附备注
> - `2 for org with comment "approved by AppSec review"`——范围 + 注释一起
> - `1, 3, 5 as-is`——在当前范围批准多行
> - `1 as-is, 2 for org, 3 for account with comment "exception logged"`——混合范围 + 注释
>
> 说 **next** 查看第 6–10 行，或给出 **search** 词（CVE、请求者、标题）以缩小。

仅当用户给出关键词时才向列表调用添加 `search`——不要要求他们预先知道
CVE 或标题文本。如果用户只回复 `1, 2` 而无范围，默认 `CURRENT`
（按原样批准）并在执行前询问一次是否需要注释。

#### 当列表返回零行时

说明此项目中没有待处理豁免（针对当前过滤器）。不要要求他们
检查 UI——如果他们缩小过，提供不带 `search` 的列表，或确认 org/project。

### 步骤 3——解析要批准哪些行

**主要路径：** 用户从**你的表格**中挑选**行号**。通过他们所选
**同一页**的 `_action_id_by_row` 映射。如果他们先说 "next" 然后从
后面的页挑选，在映射编号之前重新列出该页（或保留页上下文）。

| 他们如何挑选 | 你做什么 |
|---|---|
| 行号（`1`、`1 and 3`、`2-4`） | 通过当前页的 `_action_id_by_row` 映射。默认范围 `CURRENT`。 |
| 行 + 范围（`2 for org`、`3 as-is`、`4 for account`） | 映射行 → `exemption_id`；按[自然语言 → `body.scope`](#natural-language--bodyscope)表设置 `body.scope`。 |
| 行 + 注释（`5 with comment "SEC-440"`） | 与行挑选相同；将引用的文本作为 `body.comment` 附加。 |
| 行 + 范围 + 注释（`2 for org with comment "AppSec approved"`） | 组合两者——计划中的一条条目带 `scope` 和 `comment`。 |
| 混合列表（`1 as-is, 2 for org, 3 for account with comment "logged"`） | 每行一条计划条目；范围和注释可按行不同。 |
| "Next" / "next page" | 按 `_nextPageHint` 递增 `page`；显示新表格；等待挑选。 |
| 搜索词（`log4j`、请求者名称） | 用 `search` 重新列出，重置为 `page: 0`；显示过滤后的预览。 |
| 豁免 ID（22 字符 Harness ID） | 如果他们粘贴一个则接受——但**绝不索要** ID；列表是默认。 |
| "All on this page" | 仅**当前页**的每一行——按行或一个共享范围确认。 |

当多个行匹配一个搜索词时，显示过滤后的表格并询问是哪（些）行——不要
猜测。

如果用户给出含糊的批准请求且尚无行号（"approve pending exemptions"、
"sign off waivers"），**回到步骤 2**——先列出，然后请他们挑选。在他们
从已呈现的表格中选择（或确认 "all on this page" 并明确范围）之前不要执行。

对于**混合批次**，用户可以在一条消息中为**每个豁免分配不同的批准范围**，例如：

> Approve #1 as-is, #2 for org, #3 for account.

构建内部计划：`{ exemption_id, approval_scope, issue_title }[]`——每个
豁免一条条目，范围可以不同。

### 步骤 4——将用户意图映射到 `body.scope`

`body.scope` 在每次批准调用中都是**必需的**。它是**批准范围**（豁免生效之处），
而非待处理行当前的 scope 标签。

#### 提升路径（待处理 → 目标）

`body.scope` 始终是 **`CURRENT`**、**`PROJECT`**、**`ORG`** 或 **`ACCOUNT`** 之一。它
命名批准后的**目标**。列表行的 `scope` 始终是**起始**请求范围（`TARGET`、`PIPELINE` 或 `PROJECT`）。当目标比 "approve as-is" 更宽时，提升使用 `/promote`；MCP 从 `action='approve'` 路由它。

| 待处理 `scope`（起点） | 用户意图 | `body.scope`（目标） |
|---|---|---|
| `TARGET` | 按请求批准 | `CURRENT` |
| `TARGET` | 放宽到项目 | `PROJECT` |
| `TARGET` | 放宽到组织（可跳过项目） | `ORG` |
| `TARGET` | 放宽到账户 | `ACCOUNT` |
| `PIPELINE` | 按请求批准 | `CURRENT` |
| `PIPELINE` | 放宽到项目 | `PROJECT` |
| `PIPELINE` | 放宽到组织 | `ORG` |
| `PIPELINE` | 放宽到账户 | `ACCOUNT` |
| `PROJECT` | 按请求批准 | `CURRENT` |
| `PROJECT` | 放宽到组织 | `ORG` |
| `PROJECT` | 放宽到账户 | `ACCOUNT` |

**没有**从 `ORG` 或 `ACCOUNT` 开始的待处理行——创建无法请求那些
范围（在 sto-core 中 org/account 的 `canCreate` 为 false）。不要在 **Pending** 队列上规划 "org → org" 或
"org → account" 之类的路径。上表中的 `ORG` / `ACCOUNT` **仅**是
从 target、pipeline 或 project 放宽时的 `body.scope` 目标。

**跳级提升：** 待处理 **target**（或 pipeline）行可以在一次调用中直接到 **org** 或 **account**
——用户无需先单独进行项目批准步骤，除非他们明确要求
项目范围。

**项目 → 项目：** 当行已是 `PROJECT` 且用户不想放宽时，使用
`CURRENT`。**不要**为此传递 `body.scope: "PROJECT"`——execute 上的 `PROJECT` 意味着
"提升**到**项目范围"（对于 target/pipeline 待处理行）。普通 "approve this
project exemption" → `CURRENT`。

**不支持（不要提供）：**

| 请求 | 原因 |
|---|---|
| 缩小范围（项目 → 目标、组织 → 项目等） | 提升只会放宽；降级是无效的。待处理请求不能从 org/account 开始。 |
| 待处理行显示 `ORG` 或 `ACCOUNT` | 不是正常的待处理*请求*——已放宽或重新批准情形。 | 对标准批准列出 `status: Pending`；过期的 org/account 重新批准是另一 UI/API 路径。 |
| execute 时 `body.scope` 为 `TARGET` 或 `PIPELINE` | MCP 预检拒绝这些；仅待处理范围。使用 `CURRENT` 按请求在 target/pipeline 批准。 |
| 在用户 RBAC 之上批准 | API 返回 403；豁免上的 `CanApproveFor` 必须包含目标范围。 |
| 一次调用中超过一个目标的多跳 | 每次 execute 选择一个目标范围；你不能同时传递 `ORG` 和 `ACCOUNT`。 |

**Org / account execute 参数：** 当 `body.scope` 为 `ORG` 时，在 execute
调用中省略 `project_id`。当 `body.scope` 为 `ACCOUNT` 时，同时省略 `org_id` 和 `project_id`（MCP 预检
清除它们）。对于 `CURRENT` 和 `PROJECT`，保留正常项目上下文。

#### 自然语言 → `body.scope`

| 用户说（示例） | `body.scope` | 效果 |
|---|---|---|
| "approve"、"approve as-is"、"at current scope"、"this target/pipeline/project" | `CURRENT` | 在豁免现有请求范围批准（无提升）。 |
| "approve for project"、"project-wide"、"elevate to project" | `PROJECT` | 将 **Target** 或 **Pipeline** 待处理豁免放宽到项目范围。 |
| "approve for org"、"org-wide"、"organization level"、"at org" | `ORG` | 提升并在组织范围批准。 |
| "approve for account"、"account-wide"、"account level" | `ACCOUNT` | 提升并在账户范围批准。 |

**默认：** 如果用户说普通的 "approve" 且无提升暗示，使用 `CURRENT`。

**按行覆盖：** 在混合列表中，尊重每一行所述范围。第 2 行可以是 `ORG`，而
第 3 行在同一次会话中是 `ACCOUNT`。

可选字段（除非用户另有指定，每行相同）：

| 字段 | 备注 |
|---|---|
| `comment` | 可选批准备注。用户可以在选择中内联附加（`5 with comment "JIRA SEC-440"`）——逐字捕获引用的文本。如果他们挑选一行但无注释表述，在 execute 之前询问一次；绝不臆造文本。 |
| `approver_id` | 从 PAT 自动推导——绝不询问用户。 |

**不要**使用带 `action='promote'` 的 `harness_execute`。`approve` 动作接受
`body.scope` 并自动选择 `/approve` vs `/promote`（`CURRENT` → approve 端点；
`ORG` / `ACCOUNT` / `PROJECT` → promote 端点）。

### 步骤 5——执行前确认

在任何写入之前回声一个紧凑的确认表：

```
About to approve N exemption(s):
  # | Issue                          | Pending scope | Approve at   | Comment
  1 | CVE-2024-1234 in log4j-core    | TARGET        | CURRENT      | —
  2 | SQL Injection in api-gateway   | PROJECT       | ORG          | SEC-440
  3 | Spring4Shell                   | PROJECT       | ACCOUNT      | —
Proceed? (yes/no)
```

等待明确的 **yes**（或在用户于无法交互征询的客户端中确认后，才在 `harness_execute` 上传递 `confirm: true`）。

### 步骤 6——执行批准（每个豁免一次调用）

**没有批量批准 API**。混合范围需要**顺序** `harness_execute` 调用——
每个豁免一次，各自带自己的 `body.scope`：

```
harness_execute
  resource_type: "security_exemption"
  action: "approve"
  resource_id: <exemption_id from _action_id_by_row or user>
  org_id: <org>          # omit org_id/project_id when body.scope is ACCOUNT
  project_id: <project>  # omit project_id when body.scope is ORG or ACCOUNT
  body:
    scope: <CURRENT | ORG | ACCOUNT | PROJECT>
    comment: "<optional>"
```

每次调用后，记录成功或失败。如果 3 次调用中的第 2 次失败，报告哪些成功、
哪些失败——不要用不同范围静默重试。

### 步骤 7——报告结果

对于每个已批准的豁免，返回：

- 问题标题（来自计划）
- 先前的待处理 `scope` 与所用的 `body.scope`
- API 响应中的新状态（成功时预期 `Approved`）
- 深链接：`/ng/account/{accountId}/all/orgs/{org}/projects/{project}/sto/exemptions`

如果用户的 RBAC 不允许所请求的提升，原样呈现 API 错误并
建议较低范围（例如 `CURRENT` 或 `PROJECT`）或不同的审批人。

## 示例

### 示例 1——默认流程：在聊天中列出，用户按行挑选（无需 UI 复制）

用户：*"Approve pending exemptions."*

1. 从会话或 URL 确认 org/project。
2. `harness_list` 搭配 `status: Pending`、`size: 5`、`page: 0`。
3. 显示编号表 + `total`（例如 "8 pending, showing 1–5"）。
4. 用户：*"#2 and #4, as-is."* → 映射 `_action_id_by_row[2]` 和 `[4]`，均为 `CURRENT`。
5. 确认表，然后执行。

**不要**先要求他们打开 Harness 或粘贴问题名称。

### 示例 2——分页

用户：在看过 12 行中的 1–5 行后说 *"Next page"*。

1. 遵循 `_nextPageHint`（`page: 1`，相同 `size: 5`）。
2. 显示第 6–10 行（在**此页**上编号 1–5——澄清相对于页的编号或在显示中
   重新编号为 6–10，使挑选无歧义）。
3. 用户挑选；通过该页响应的 `_action_id_by_row` 映射。

### 示例 3——在当前范围批准一行（列表之后）

用户：*"Approve pending exemptions"* → 看到表格 → *"#1, as-is."*

1. 第 1 行待处理 `scope: TARGET` → `CURRENT`。
2. 确认，然后用来自 `_action_id_by_row[1]` 的 `resource_id` 执行 `harness_execute`。

### 示例 4——Target → 项目提升（用户说 "approve for project"）

用户从表格中挑选一行：*"#1 for the whole project."*

1. 列表已在第 1 行显示 `scope: TARGET`。
2. "For project" → `body.scope: "PROJECT"`。
3. 确认 **Pending scope: TARGET → Approve at: PROJECT**，然后执行。

### 示例 5——组织范围批准（用户说 "approve"，而非 "promote"）

用户：*"#2 for org"*（从已呈现的表格中选择后）。

1. 映射第 2 行 → `body.scope: "ORG"`。
2. 确认显示 **Approve at: ORG**，用 `action: "approve"` 执行。

### 示例 6——一步从 Target → 组织（跳过项目）

用户从待处理表格中：*"Approve row 3 for org"*。

1. 第 3 行显示 `scope: TARGET`。
2. `body.scope: "ORG"`——在 execute 中省略 `project_id`。

### 示例 7——一个请求中的混合范围

用户：*"Approve #1 as-is, #2 for org, and #3 for account."*（来自同一页表格）。

1. 计划三行，分别为 `CURRENT`、`ORG`、`ACCOUNT`。
2. 一个确认表；三次顺序 execute。

### 示例 7b——一条消息中的内联范围 + 注释

用户：*"Approve #2 for org with comment \"AppSec reviewed, JIRA SEC-440\" and #4 as-is."*

1. 第 2 行 → `body.scope: "ORG"`，`body.comment: "AppSec reviewed, JIRA SEC-440"`。
2. 第 4 行 → `body.scope: "CURRENT"`，无注释。
3. 确认两行（显示注释列），然后顺序执行。

不要剥离或改写引用的注释文本。

### 示例 8——可选搜索缩小（用户主动给出关键词）

用户：*"Show pending log4j exemptions."*

1. 用 `search: "log4j"`、`page: 0`、`size: 5` 列出。
2. 显示过滤后的表格；用户按行号挑选。

### 示例 9——除非要求，否则拒绝不在范围内

用户：*"Reject the XSS exemption."*

此技能用于**批准**。使用 `harness_execute` 搭配 `action: "reject"` 和相同的
`resource_id` 查找模式，或如果用户坚持，通过单独的 reject 工作流处理。

## 性能注意事项

- **列表优先工作流**——一次小的 `harness_list` 预览胜过要求用户在
  UI 中搜寻。默认 `size: 5`；当他们说 "next" 时用 `_nextPageHint` 分页。
- 列表是 POST 并分页的；在会话中各页保持 `size` 恒定。
- 批准是 `high_write` 且 `do_not_retry`——将错误呈现给用户而不是
  自动重试。
- 顺序 execute 对混合范围是正确的；不要并行化写入。
- `approver_id` 每次调用从 PAT 推导一次——无需额外用户查找。
- 仅当用户缩小时才添加 `search`——不能作为展示待处理队列的替代。

## 故障排查

| 症状 | 原因 | 修复 |
|---|---|---|
| `security_exemption approve: body.scope is required` | execute 上省略了 `body.scope`。 | 始终传递 `scope`；将普通 "approve" 默认到 `CURRENT`。 |
| 列表错误：`account scope not supported` | 在**列表**上用了 `resource_scope='account'` 或 `'org'`。 | 移除范围覆盖；在项目列出。仅在 **execute** 的 `body.scope` 上放 `ORG`/`ACCOUNT`。 |
| 批准时 `invalid scope 'PIPELINE'` 或 `'TARGET'` | `body.scope` 必须是 `CURRENT`、`PROJECT`、`ORG` 或 `ACCOUNT`。 | 按原样在 target/pipeline 批准 → `CURRENT`。放宽到项目 → `PROJECT`。 |
| 用户想要项目 → 项目 | 已是项目范围；无提升。 | `CURRENT`，而非 `PROJECT`。 |
| 用户想要 target → org（或 pipeline → account 等） | 有效的跳级提升。 | 单次 execute 搭配 `ORG` 或 `ACCOUNT`；除非用户先要求项目，否则不要求中间 `PROJECT` 步骤。 |
| target → account 时 403 | 缺少账户级 `sto_exemption_approve`。 | 尝试 `CURRENT` 或 `PROJECT`，或具有账户批准权限的用户。 |
| 降级请求（在项目待处理行上"仅为此 target 批准"） | 批准时不能缩小。 | 解释；他们需要新的 target 范围豁免请求，通过 `/exempt-vuln`。 |
| 用户说 "promote to org" | 与组织范围批准相同。 | `action: "approve"`，`body.scope: "ORG"`。 |
| API 403 / permission denied | PAT 用户在该提升范围缺少 `sto_exemption_approve`。 | 尝试 `CURRENT` 或找具有 org/account 批准权限的人。 |
| 分页后行号不匹配 | 用户引用了较早页的 `#3`，而你用不同过滤器重新列出了。 | 重新显示当前页表格；在第 2 页及以后使用绝对行标签（6–10），或重新获取他们所挑选的页。 |
| 用户要求批准但代理跳过了列表 | 违反列表优先工作流。 | 始终先 `harness_list` Pending；在执行前呈现编号表。 |
| 代理要求用户从 Harness UI 复制 | 技能要求零/最少 UI 交互。 | 在聊天中列出待处理豁免；仅按行号选择。 |
| `_action_id_by_row` 缺少索引 | 该行在 API 负载中无 `id`。 | 重新列出或询问用户豁免 ID。 |
| 豁免不在 Pending 列表 | 已批准、已拒绝或已过期。 | 用适当的 `status` 列出或说明当前状态。 |
| 用户期望待处理 `scope: ORG` | 请求仅在项目/流水线/target 创建。 | Org/account 效果来自批准时的 `body.scope`，而非创建路径。 |
| 代理使用了 `security_issue` | 错误资源——issue 是漏洞，不是豁免。 | 切换到 `resource_type: "security_exemption"`。 |
