---
name: exempt-vuln
description: >-
  为 SAST、SCA、DAST、密钥、容器或 IaC 扫描器发现的漏洞创建 Harness STO 安全豁免（waiver）。
  可从 Harness UI 的两个入口工作：特定流水线执行的
  Vulnerabilities 标签（Target、Pipeline 或 Project 范围）
  和 All Issues 页面（仅 Project 范围）。支持带逐行错误
  容错的单次创建，以及最多 100 个问题的一次性全有或全无批量创建。请求者
  从已认证用户自动推导。
  在用户想要豁免漏洞、豁免 CVE、抑制安全发现、
  将发现标记为误报、接受风险，或一次性豁免多个漏洞时使用。
  触发短语：exempt vuln、豁免漏洞、豁免 CVE、waive vulnerability、创建
  豁免、抑制安全问题、误报、接受风险、忽略 CVE、批量豁免。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Create STO vulnerability exemptions (waivers) scoped to Project, Pipeline, or Target
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 豁免漏洞

为一个或多个 Harness STO 漏洞创建安全豁免（waiver）。STO 有两个
用户可以请求豁免的位置，每个允许不同的范围：

| 用户在 Harness UI 中的位置 | 他们可以请求的范围 |
|---|---|
| 特定流水线执行的 **Vulnerabilities 标签** | This Project、This Pipeline、This Target |
| **All Issues** 页面（项目范围基线） | 仅 This Project |

差异原因很简单：All Issues 页面上的行是跨执行聚合的，不携带
`execution_id`，因此后端没有可附加更窄范围的流水线或目标上下文。
组织和账户范围的豁免不在此创建；它们稍后通过以更高范围批准现有豁免而产生
（通过 `harness_execute resource_type=security_exemption action=approve body={scope:'ORG'|'ACCOUNT'}`），
这超出了此技能的范围。

## 说明

### 步骤 1——了解用户从何处开始

用平实语言询问用户：

> 你在哪个视图？
> 1. 特定流水线执行的 **Vulnerabilities 标签**，或
> 2. **All Issues** 页面（项目范围基线视图）。
>
> 如果你手边有 URL，直接粘贴——我会自动从中提取 org、project 和 execution。

你还需要：

- **org 和 project**，除非它们已在会话默认值中或你能从粘贴的 URL 读取它们。
- 对于 Vulnerabilities 标签路径：**execution ID**，或任何包含它的 Harness URL。

粘贴的 Harness UI URL 始终是最快路径。MCP `url` 参数自动提取路径中的每个
标识符，因此用户不必再输入任何东西。要识别的形状：

| 用户粘贴的 URL | 它告诉你什么 | 哪条路径 |
|---|---|---|
| `…/sto/executions/{executionId}/pipeline` | 一个执行的 Vulnerabilities 标签 | **Vulnerabilities 路径**——提取 `org_id`、`project_id`、`execution_id` |
| `…/pipeline/orgs/{org}/projects/{project}/pipelines/{pipelineId}/executions/{executionId}/…` | 流水线执行详情页 | **Vulnerabilities 路径**——也提取 `pipeline_id` |
| `…/sto/issues` 或 `…/sto/issues/{issueId}` | All Issues 页面 | **All Issues 路径**——仅提取 `org_id`、`project_id` |

如果用户粘贴 Vulnerabilities 标签 URL，无论他们如何表述，都将请求视为 Vulnerabilities 路径。
如果他们粘贴 All Issues URL，不要询问 execution ID——该视图没有。

### 步骤 2——列出问题以便用户挑选

#### 先显示小预览，而非整个列表

聊天是狭窄的表面——50 行表格不可读，用户通常只关心
少数问题。先做短预览，告诉他们总数，让他们要求更多或
缩小过滤器。

默认开场动作：

1. 向 `harness_list` 请求一个小页（10 行是好的默认值）。
2. 从响应中取 **`total`**——项目中匹配问题的总数 / 执行
   ——并决定显示什么：
   - 如果 `total` ≤ 10，显示每一行。
   - 如果 `total` > 10，显示**按严重性排序的前 5 行**（Critical → High → Medium → Low），
     然后说类似：
     > 显示 {total} 个匹配问题中的 5 个，按严重性排序。告诉我如何缩小——例如：
     > "show 10 mediums"、"only SAST"、"search log4j"、"show all highs"——或从
     > 下面的列表中挑选。
3. 如果用户要求更多或缩小过滤器，用新过滤器或更大的页大小重新调用 `harness_list`。
   除非用户要求，否则不要手动分页。

#### Vulnerabilities 标签（按执行）

```
harness_list
  resource_type: "pipeline_security_issue"
  org_id: <org>
  project_id: <project>
  filters:
    execution_id: <execution_id>           # REQUIRED
    severity_codes: "Critical,High"        # optional, user-driven
    issue_types: "SCA,SAST"                # optional
    search: "<CVE or component>"           # optional
    include_exempted: false                # hide rows that already have an exemption
    page_size_existing: 10                 # small preview — bump only on user request
    page_size_new: 10
```

响应将 `existing` 和 `new` diff 分区展平为单一 `items[]`，并用
`_partition` 标记每一行。每行暴露 `issue_id` 和 `targetVariantName`（一个显示字符串
如 `"nodegoat:master"`）。它**不**暴露原始 `target_id` 或 `pipeline_id`——步骤 3
涵盖当用户选择更窄范围时如何查找它们。

#### All Issues 页面（基线）

```
harness_list
  resource_type: "security_issue"
  org_id: <org>
  project_id: <project>
  filters:
    severity_codes: "Critical,High"
    issue_types: "SCA,SAST"
    search: "<CVE or component>"
    exemption_statuses: "None"             # hide rows that already have an exemption
    size: 10                               # small preview — bump only on user request
```

#### 选择提示词

当你询问用户要豁免哪些问题时，始终在同一提示词中包含三件事：

1. **总数**（以便他们知道从什么中挑选）。
2. **如何挑选**——按行号或粘贴问题 ID。
3. **每批限制**——批量端点每次调用最多接受 100 个问题，因此单次
   选择不能超过。

以对话方式表述，例如：

> 你想豁免哪些问题？按编号挑选（例如 `3`、`4-7`、`3,5,9`）或粘贴问题
> ID。你一次最多可选择 **100 个**——这是批量豁免的每批限制。
> 如果想要超过 100 个，先缩小过滤器或拆分为多个批次。

**不要**提供 "exempt all" 作为快捷方式。选择应始终是深思熟虑的编号或 ID
列表——完整理由见步骤 5b 中的 100 问题上限。

### 步骤 3——选择范围

#### 从 Vulnerabilities 标签

提供以下之一：

- **This Project**——豁免应用于项目中的每个流水线和目标。
- **This Pipeline**——仅当此问题出现在某一特定流水线时应用。
- **This Target**——仅应用于一个代码仓库、容器、实例或配置。

后端强制执行两条规则，因此此技能在调用 `harness_create` 之前也必须强制执行：

- 单个豁免上 `target_id` 和 `pipeline_id` 互斥。绝不同时发送。
- 对于 Project 范围，两者都不发送。项目已由请求上的 `project_id` 隐含。

`pipeline_security_issue` 行**不**携带 `target_id` 或 `pipeline_id`，因此对于更窄的范围你需要
自己解析它们。使用下面的配方——不要乱戳不相关的
端点。

##### 解析 `pipeline_id`

1. **如果用户粘贴了流水线执行 URL，** URL 提取器已经给你
   `pipeline_id`。直接使用——不要再查找。
2. **否则**（你只有原始 `execution_id`），获取一次执行：
   ```
   harness_get
     resource_type: "execution"
     resource_id:   <execution_id>
     org_id:        <org>
     project_id:    <project>
   ```
   从响应读取 `pipelineIdentifier`。

绝不列出流水线并搜索匹配。执行到流水线的链接是 1:1，上面的
查找是常数时间。

##### 解析 `target_id`

为同一执行拉取扫描步骤并构建一个小查找映射：

```
# 1. One call returns scanner + target metadata for every step in the execution.
harness_list
  resource_type: "pipeline_security_step"
  org_id: <org>
  project_id: <project>
  filters:
    execution_id: <same execution_id used for the issue list>

# 2. Build a map from the response:
#    key   = "<targetName>:<targetVariant>"   e.g. "nodegoat:master"
#    value = targetId                          (22-character Harness ID)
```

对于每个选中的问题行，在其 `targetVariantName` 中查找该映射。匹配的 `targetId`
就是放入 `body.target_id`（单次创建）或每个条目的 `target_id`（批量创建）的值。

`pipeline_security_issue` 列表响应还嵌入 `_target_id_lookup_hint` 和
`_pipeline_id_lookup_hint` 字段，描述这些相同的配方——如果用户问为何需要额外调用，
逐字呈现它们。

##### 建议的调用顺序

当用户从 URL 开始时，最便宜的确定性计划是：

1. `harness_list pipeline_security_issue`——始终，以便用户挑选。
2. `harness_list pipeline_security_step`——仅当涉及 This Target 范围。
3. `harness_get execution`——仅当涉及 This Pipeline 范围且你尚未从 URL 获得
   `pipeline_id`。
4. `harness_create security_exemption` 或 `security_exemption_bulk`。

最多三次读取，加一次写入。绝不多于。

#### 从 All Issues 页面

唯一可用的范围是 **This Project**。如果用户要求 This Pipeline 或 This Target，
解释限制并等待他们选择——不要悄悄回退到 Project 范围：

> All Issues 页面不知道是哪个执行暴露了此问题，因此从这里我只能创建
> Project 范围的豁免。如果你需要更窄的范围，请为扫描此目标的流水线的最近执行打开
> **Vulnerabilities 标签**，把该 URL 或 execution ID 发给我，我会将豁免限定到
> 该流水线或目标。

### 步骤 4——收集豁免字段

| 字段 | 必需 | 备注 |
|---|---|---|
| `issue_id` | 是 | 来自所选行。 |
| `type` | 是 | 之一：`Compensating Controls`、`Acceptable Use`、`Acceptable Risk`、`False Positive`、`Fix Unavailable`、`Other`。这些与 Harness UI 的 Request Exemption 对话框中的选项匹配。 |
| `reason` | 是 | 简短理由（最多 1024 字符）。如果用户未给出则询问——绝不臆造。 |
| `duration_days` | 否 | 默认 30。如果用户提到不同数字则确认。 |
| `link` | 否 | 如果用户提到，则给出工单 URL（Jira、GitHub issue 等）。 |
| `occurrences` | 否 | 特定 occurrence ID 列表。仅当用户想豁免部分 occurrence 而非整个问题时使用。 |
| `scan_id` | 否 | 豁免一次扫描中发现的每个 occurrence。需要 This Target 范围。 |

`requester_id` 从已认证 PAT 自动填充——绝不向用户询问。

如果你需要完整 schema，运行 `harness_describe(resource_type="security_exemption")`。
如果 create 调用返回 missing-field 错误也一样。

### 步骤 5——确认，然后创建（单次）

在调用 `harness_create` 之前，用纯文本向用户回声 payload。每次使用相同
形状，以便用户学会快速扫视：

```
About to create this exemption:
  Issue:    <id>
  Scope:    This Project | This Pipeline (<pipeline_id>) | This Target (<target_id>)
  Type:     <type>
  Reason:   "<reason>"
  Duration: <n> days
Proceed? (yes/no)
```

收到 `yes` 后调用：

```
harness_create
  resource_type: "security_exemption"
  org_id:        <org>
  project_id:    <project>
  body:
    issue_id:      <id>
    type:          <type>
    reason:        <reason>
    duration_days: <n>            # optional
    # exactly one of the next two, or NEITHER for This Project scope:
    pipeline_id:   <pipeline_id>  # This Pipeline scope only
    target_id:     <target_id>    # This Target scope only
    link:          <url>          # optional
    occurrences:   [ids]          # optional
    scan_id:       <scan_id>      # optional, This Target scope only
```

### 步骤 5b——当用户想要豁免多个问题时

选择下面两条路径之一，并告诉用户你采用哪条以及为什么：

| 路径 | 何时使用 | 如何调用 | 行为 |
|---|---|---|---|
| **Single**（循环） | 条目需要不同的 `type`、`reason` 或 `duration_days`，或用户希望每行独立成功或失败。 | 每行一个 `harness_create resource_type=security_exemption`。 | 每行是它自己的事务。即使第 4 行失败，第 3 行也可以成功。 |
| **Bulk** | 每个条目共享相同的 `type`、`reason` 和 `duration_days`——即使范围按条目不同。 | 一个 `harness_create resource_type=security_exemption_bulk`，最多 100 个条目。 | **全有或全无。** 如果任何条目验证或插入失败，整个批次回滚。一个 DB 事务，一行审计。 |

**当两个或更多问题共享批次级字段时默认 bulk。** 这是常见情形
（"exempt all these Log4j highs"）。逐条范围仍可变化——单个批量调用可以
混合 This Project、This Pipeline 和 This Target 条目，只要 type 和 reason
相同。

**当条目有不同理由或类型，或用户明确想要逐行容错时，默认 single。**

##### 每批 bulk 中哪些统一，哪些可按条目变化

| 字段 | 在 body 中的位置 | 每个条目必须相同？ |
|---|---|---|
| `org_id`、`project_id` | 请求范围 | 是——一批 = 一个项目。 |
| `type`、`reason`、`duration_days`、`link`、`expiration` | 顶层 body | 是——一个值应用于所有条目。 |
| `issue_id` | 每条目 | 每个条目一个，必需。 |
| `target_id` *或* `pipeline_id` | 每条目 | 每个条目选择自己的范围。 |
| `scan_id`、`occurrences`、`search` | 每条目 | 每条目独立。 |

如果用户想要每行不同的 `type` 或 `reason` 值，bulk 无法编码——使用
单次创建。

##### 100 问题上限——未经检查绝不提供 "exempt all"

批量端点每次调用最多接受 100 个条目。MCP 预检强制执行此点，并会在发送请求前
抛出 `items must contain at most 100 entries`。应用这些规则：

1. **提供前先计数。** 始终从先前的 `harness_list` 响应读取 `total`。如果
   `total > 100`，不要将 "exempt all" 作为默认提供。显示计数并要求用户
   缩小过滤器（严重性、扫描器、搜索词、目标）或明确选择
   分块。
2. **仅在明确选择时分块。** 如果用户确认 "yes, exempt all" 且超过 100 个
   问题，将列表拆分为 100 或更少的块，每块发送一个批量调用。每个
   块是自己的全有或全无事务——失败的块不会回滚已成功的块，
   成功的块不会重试失败的块。在摘要中报告每块的 `succeeded` / `failed` 计数。
3. **绝不静默截断。** 为符合 100 而丢弃问题比 API 错误更糟。
   始终询问。
4. **拒绝含糊的 "all" 请求。** 如果用户未看到计数就说 "exempt all the highs"，
   先列出候选（一页足够）并显示 `total`。等待他们
   确认数字后再继续。

当你为用户选择行时，要求他们按**编号或问题 ID**选择，而非输入
"all"。将提示词表述为类似：

> 你想豁免哪些问题？按编号挑选（例如 `1,3,5-7`）或粘贴问题 ID。

如果用户仍说 "all" 且计数超过 100，呈现上面第 1 点的规则。

##### 批量调用形状

```
harness_create
  resource_type: "security_exemption_bulk"
  org_id:        <org>
  project_id:    <project>
  body:
    type:          <type>          # applied to every item
    reason:        <reason>        # applied to every item
    duration_days: <n>             # optional, default 30, applied to every item
    link:          <url>           # optional, applied to every item
    items:                         # 1..100 entries
      - issue_id: <id1>
        # per item, optional: target_id XOR pipeline_id, scan_id, occurrences, search
      - issue_id: <id2>
        pipeline_id: <pipeline_id>
      - issue_id: <id3>
        target_id: <target_id>
```

逐条目规则：

- 单个条目内 `target_id` 和 `pipeline_id` 互斥。
- 从 All Issues 页面，任何条目都不得携带 `target_id` 或 `pipeline_id`——整批是
  Project 范围。
- 从 Vulnerabilities 标签，每个条目独立选择自己的范围。

##### 读取批量响应

响应携带顶层 `status` 横幅。逐字呈现并相应反应：

| `status` | 含义 | 该做什么 |
|---|---|---|
| `ALL_SUCCEEDED` | 每个条目都已创建。 | 报告每个 `{issueId, id}` 并说明都待批准。 |
| `ALL_FAILED` | 整批已回滚，每个条目携带相同错误。 | 呈现 `results[0].error`，修复根因，然后重新提交**完整修正列表**——绝不只重试失败的行。 |
| `MIXED_UNEXPECTED` | 服务器同时返回成功和失败，违反全有或全无契约。 | 将其视为服务器 bug。显示原始 `results[]`，不要自动重试。 |
| `EMPTY` | 响应中无结果。 | 视为失败；检查请求确实包含条目。 |

`ALL_FAILED` 的典型原因：未知 `issue_id`、项目范围内未发现该问题的扫描、
互斥疏漏或重复豁免。`results[0].error` 指明实际原因。

如果单个坏条目毒害大批次且用户想知道是哪一个，你
可以回退到单次创建以隔离它——但要先询问；不要静默切换策略。

### 步骤 6——报告发生了什么

对于每个已创建的豁免，返回：

- `exemption_id`
- `status`——这在有正确权限的人批准之前将是 `Pending`。
  批准是单独的工作流，超出此技能范围。
- 指向项目 Exemptions 页面的深链接：
  `/ng/account/{accountId}/all/orgs/{org}/projects/{project}/sto/exemptions`

如果任何 create 调用失败，原样呈现 API 错误——它几乎总是
互斥违规或缺失字段，消息告诉用户确切该修复什么。

## 示例

### 示例 1——一个 CVE，This Pipeline 范围，来自特定执行

用户：*"Exempt CVE-2024-1234 from execution `ehsPKtczTRO5CUDAt-NR` for that pipeline only.
False positive — already patched in our fork."*

1. 从会话默认值确认 org 和 project。
2. `harness_list pipeline_security_issue` 搭配 `execution_id` 和 `search: "CVE-2024-1234"`。
3. 挑选匹配行并记下其 `issue_id`。
4. 解析 `pipeline_id`——从粘贴的 URL，或通过 `harness_get execution`。
5. 回声确认块，等待 `yes`，然后 `harness_create` 搭配
   `body: { issue_id, type: "False Positive", reason: "Patched in our fork — see PR #422", pipeline_id }`。

### 示例 2——来自 All Issues 页面的三个 Log4j 高危，This Project 范围，批量

用户：*"From the All Issues page, suppress these three high-severity Log4j findings for 90
days. Acceptable risk — we've mitigated at the gateway."*

1. `harness_list security_issue` 搭配 `severity_codes: "High"`、`search: "log4j"`。
2. 用户挑选三个 `issue_id`。
3. All Issues 路径 → This Project 范围（任何条目无 `target_id` 或 `pipeline_id`）。
4. 三者共享批次级字段 → 批量。
5. 一个 `harness_create resource_type=security_exemption_bulk` 搭配
   `body: { type: "Acceptable Risk", reason: "Mitigated at API gateway WAF — ticket SEC-880", duration_days: 90, items: [{issue_id:"i1"}, {issue_id:"i2"}, {issue_id:"i3"}] }`。
6. 预期 `status: ALL_SUCCEEDED`；报告返回的三个豁免 ID。

### 示例 2b——来自 Vulnerabilities 标签的混合范围批量

用户：*"From execution `ehsPKtczTRO5CUDAt-NR`, exempt these five Critical issues — the first
two for the whole project, the next two only on this pipeline, the last one only on the
`api-gateway` target. False positive across the board."*

1. `harness_list pipeline_security_issue` 搭配 `execution_id` 和 `severity_codes: "Critical"`。
2. `harness_list pipeline_security_step`（同一执行）解析 `api-gateway` 行的 `target_id`。
3. 用户挑选五行。
4. 一个批量调用——五者共享 `type` 和 `reason`，逐条范围按行编码：
   ```
   harness_create resource_type=security_exemption_bulk body:
     type: "False Positive"
     reason: "False positive — see triage doc #441"
     items:
       - { issue_id: i1 }                              # This Project
       - { issue_id: i2 }                              # This Project
       - { issue_id: i3, pipeline_id: <pipelineId> }   # This Pipeline
       - { issue_id: i4, pipeline_id: <pipelineId> }   # This Pipeline
       - { issue_id: i5, target_id:   <targetId> }     # This Target
   ```

### 示例 2c——两个 CVE 使用不同豁免类型

用户：*"Exempt these two CVEs — the Log4j one is a False Positive, the Spring4Shell one is
Acceptable Risk."*

两个条目需要不同的 `type` 值，bulk 无法编码。使用 single 路径：两次
顺序 `harness_create resource_type=security_exemption` 调用。拆分为两个各含一项的
批次只是 single 路径加上额外仪式。

### 示例 3——用户从 All Issues 页面请求 This Target 范围

用户：*"From the All Issues page, exempt this XSS finding for the `web-frontend` target only."*

不要悄悄降级。说：

> All Issues 页面不知道是哪个执行发现了此问题，因此从这里我只能创建
> Project 范围的豁免。两个选项：
> 1. 现在将其创建为 This Project 豁免，或
> 2. 为扫描了 `web-frontend` 的最近执行打开 Vulnerabilities 标签，把
>    该 URL 或 execution ID 发给我，我会将其限定到该目标。

### 示例 4——互斥错误恢复

如果用户为同一豁免同时提供 `pipeline_id` 和 `target_id`，在
调用 API 之前反驳：

> 豁免可以限定到一个流水线**或**一个目标，不能两者都。选一个：**This
> Pipeline** 应用于此流水线扫描的每个目标，而 **This Target** 应用于
> 扫描此目标的每个流水线。

## 性能注意事项

- `pipeline_security_issue` 使用 diff 分页——`page_existing` / `page_size_existing` 和
  `page_new` / `page_size_new` 是独立计数器。先开小预览（各 10）并
  仅当用户要求更多或缩小过滤器时才提升大小。响应始终
  报告分区感知的 `total`，因此你可以显示 "5 of 19" 而无需进一步分页。
- `security_issue` 使用标准分页（`page` / `size`）。相同模式——从 `size:
  10` 开始，呈现 `total`，按请求扩展。
- 预先过滤掉已豁免的噪声：在 `pipeline_security_issue` 上传 `include_exempted: false`，
  或在 `security_issue` 上传 `exemption_statuses: "None"`。
- 单次创建是每个问题一个 POST。MCP 服务器将其标记为
  `risk: high_write, retryPolicy: do_not_retry`——将失败呈现给用户而不是
  自动重试。
- 批量创建是多达 100 个条目的一次 POST，产生一个数据库事务和一行审计。
  在 100 个条目时，大约是 5 次 DB 往返，而循环 single 约 400 次（参见
  `sto-core/docs/STO-8977-bulk-exemption-api.md`）。当两个或更多条目共享
  批次级字段时优先使用 bulk。
- Bulk 是全有或全无。绝不只重试 `ALL_FAILED` 或
  `MIXED_UNEXPECTED` 响应中失败的行——而是重新提交完整修正列表。

## 故障排查

| 症状 | 原因 | 修复 |
|---|---|---|
| `Missing required fields for security_exemption: issue_id, type, reason` | `body` 中缺少必需字段。 | 询问用户——绝不臆造 `reason` 或默认 `type`。 |
| API 错误：`targetId` cannot be combined with `pipelineId` / `projectId` | 单个豁免上发送了两个范围字段。 | 只选一个——参见步骤 3 的规则。 |
| 列表错误：`account scope not supported` | 调用方在列出豁免时传递了 `resource_scope='account'` 或 `'org'`。 | `security_exemption` 始终在项目范围列出。那些关键词是*批准*范围（与 `harness_execute` 一起使用），不是列表范围。移除覆盖并重新列出。 |
| 新豁免立即显示为 `Approved` | 请求者的 RBAC 在该范围授予自动批准。 | 这是按设计工作；在报告中提及。 |
| `getCurrentUserId` 失败 | PAT 推导的用户查找失败（网络或认证）。 | 原样呈现错误——绝不臆造 ID。检查 `HARNESS_API_KEY` 仍有效。 |
| 用户在创建时要求 Org 或 Account 范围 | create 端点做不到。 | 在 This Project 范围创建，然后通过 `harness_execute resource_type=security_exemption action=approve body={scope:'ORG'|'ACCOUNT'}` 提升它。该流程超出此技能。 |
| 用户从 All Issues 页面开始，但现在想要 This Pipeline 或 This Target | All Issues 路径按设计仅 Project。 | 使用相关 `execution_id` 切换到 Vulnerabilities 标签路径。 |
| 代理一直寻找问题行上的 `target_id` | `pipeline_security_issue` 不暴露 `target_id`——仅 `targetVariantName`（一个显示字符串）。 | 用相同 `execution_id` 调用一次 `harness_list pipeline_security_step`，构建 `{targetName:targetVariant → targetId}` 映射，然后查找每行的 `targetVariantName`。列表响应嵌入 `_target_id_lookup_hint`，含相同配方。 |
| 批量响应 `status: ALL_FAILED` | 一个或多个条目验证或插入失败；按全有或全无契约整批回滚。 | 读取 `results[0].error` 获取真实原因（未知 `issue_id`、范围内无匹配扫描、互斥疏漏、重复豁免）。修复并重新提交**完整**修正列表——绝不只重试失败的行。 |
| 批量响应 `status: MIXED_UNEXPECTED` | 服务器同时返回成功和失败，违反全有或全无契约。 | 视为服务器端 bug。显示原始 `results[]`，不要自动重试。仅在用户确认后才对失败条目回退到单次创建。 |
| 预检错误：`items must contain at most 100 entries` | 调用方超过每批限制。 | 拆分为多个每次 100 或更少条目的批量调用。**预防**：在提供 "exempt all" 之前检查先前列表的 `total`——参见步骤 5b 中的 100 问题上限。绝不静默截断。 |
| 预检错误：`items[N].issue_id` 或 `items[N] sets both target_id and pipeline_id` | 批次中某个条目格式错误。 | 错误消息中的索引告诉你是哪个条目。修复它，然后重新提交完整列表。 |
