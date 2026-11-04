---
name: databricks-data-discovery
description: "通过 Genie 发现、探索和查询 Databricks 数据 —— 相当于 Genie One MCP 的 CLI 版本。每当用户要求查找或定位数据（'X 中有哪些表'、'X 位于哪里'、'哪个 catalog/schema 有 Y'）、回答关于数据的自然语言问题，或编写 SQL 查询时，都必须调用。"
compatibility: Requires databricks CLI >= v1.9.0 for `databricks genie ask` (older CLIs fall back to the deprecated `databricks experimental genie ask` alias)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks 数据发现

本技能**路由数据工作** —— 先做决定：
- 请求关于*数据* —— 查找它、向它提问，或生成 SQL → 委托给 **Genie One**：
  `databricks genie ask -s <session-label> "..."`（参见下方路由）。
- 编写文件或其他任何事 → 使用你自己的编码智能体工具。

Genie One 只需要一个已通过身份验证的 CLI profile（父级 `databricks-core` 技能在你需要时涵盖 auth/profile）—— 但应先把数据请求路由到 Genie；不要绕道去手动浏览 catalog。

## 路由 —— Genie vs 你的编码智能体

**当请求关于数据时，路由到 Genie：**
- **查找或定位数据** —— "wanderbricks 里有哪些表？"、"X 位于哪里？"、哪个 catalog/schema 含有某物。让 Genie 在你所有数据中解析一个模糊或部分名称，而不是自己猜测或对 catalog 跑 grep。
- **关于数据的问题** —— "有多少…"、"平均值是…"、"哪个…最多…"、趋势、细分。
- **从问题生成 SQL** —— 一个你可以运行、调整或放入文件的首版查询。
- **理解或剖析数据**，以便为查询、仪表板或应用提供依据。

**对于其他一切，路由到你自己的编码智能体（不要使用 Genie）：**
- **编写或编辑文件** —— 一个 `.sql` 文件、notebook、仪表板、应用、配置。Genie 查找数据并生成 SQL；文件由*你*来写。
- **编写作业、管道、应用或 DABs** —— 使用那些产品技能。
- **DDL 或写入** —— `CREATE` / `INSERT` / `UPDATE` / `DELETE`。
- **通用编程、git、基础设施，以及任何非数据任务。**

**关键原则：** 数据发现、数据问题和查询生成 → Genie One。其他一切 → 你的编码智能体。

## 为什么数据问题优先用 Genie

Genie *在 Databricks 数据平面内部*运行，对该组织的 Unity Catalog 元数据、指标视图和精心策划的语义上下文拥有受治理的一手访问 —— 这些上下文在你用临时 SQL 逆向工程 schema 时是**没有**的。对于数据问题，它往往比你自己做发现质量更高、性能更好，并且作为一项托管的 Databricks 能力会持续改进。不要因为你能写，就默认自己去写发现用的 SQL。

## 如何向 Genie 提问

始终用 `-s` 传入一个会话标签，并优先复用**同一个**标签：只有当第一次提问设置了会话标签时，后续追问才能延续这段对话；而复用它则能让后续问题建立在迄今所问的一切之上（"总结以上所有内容"）。只有为有意开启一个独立会话时才使用新的会话标签，或用不同的会话标签并行运行多个会话。

命令是 `databricks genie ask`（CLI >= v1.9.0）。在较旧的 CLI 上，它位于 `databricks experimental genie ask` —— 相同的标志和行为；若找不到 `databricks genie ask`，就使用该确切回退。

```bash
# Always pass a session label, and reuse the SAME one so follow-ups build on each other
databricks genie ask -s trips "How many bookings were there last week?"
databricks genie ask -s trips "Break that down by destination"
databricks genie ask -s trips "Summarize all of the above"

# --include-sql also prints the SQL Genie ran (use it to generate a query, too)
databricks genie ask -s trips "Write SQL for the top 5 destinations by revenue" --include-sql

# --output json gives a parseable result
databricks genie ask -s trips "Top 5 destinations by revenue" --output json
# → {"status":"completed","conversation_id":"…","text":"…","tool_calls":[{"name":"execute_sql","sql":"…","title":"…"}]}

# Older CLI (< v1.9.0) — same command under the deprecated experimental alias:
#   databricks experimental genie ask -s trips "How many bookings were there last week?"
```

Genie 在你所能看到的所有数据中搜索，运行 SQL，并流式返回一个基于数据的答案 —— 渲染出所执行的 SQL，并在有帮助时附上一个终端图表。它会自动解析一个 SQL 数仓（用 `--warehouse-id` 覆盖）；无需挑选或设置。

- **实时流式**：答案、智能体的步骤以及任何 SQL/结果都会在到达时出现。答案通常耗时约 5–30 秒；卡住的流（约 10 分钟没有数据）会以清晰的消息失败，而 Ctrl-C 或 `kill`（SIGTERM）能干净地取消。
- **选择会话标签**：任何字符串都可以 —— 一个像 `trips` 的主题，或 `$$` 表示每 shell 一个会话。默认复用一个会话标签，以便追问保留完整上下文；只有为有意独立的会话才使用新的标签。过期的会话标签会在下次提问时重新开始。无需复制来复制去的 id。
- **并行性**：要同时运行多个会话，给每个会话它自己的会话标签（`-s q1`、`-s q2`、……）—— 独立的会话标签互不干扰。在单个会话标签内保持调用串行：在前一轮返回后再发追问，绝不在*同一*会话标签上同时发起两次提问（它们会分裂成两段对话，只有一条映射能存活）。
- **结构化输出**：`--output json` 给出 `{status, conversation_id, text, tool_calls[]}`，其中 `tool_calls` 包含 Genie 执行的 SQL；`--raw` 转储原始事件流。注意 `--output json` 会缓冲并在最后一次性打印（无实时流式）—— 用于解析；交互使用时用默认文本输出。
- **生成查询**：让 Genie "write SQL for …" 并从响应中读取 SQL（它在答案文本里，`--include-sql` 还会显示 Genie 为验证它所运行的查询 —— 因此该 SQL 是已知可用的）。Genie 会为你解析 schema 和 join，因此这胜过对不熟悉的表手写 SQL。
- **获取精确/完整行**：Genie 会内联展示预览；要在本地拉取完整结果集，把它的 SQL（`--include-sql` 或 JSON 中的 `tool_calls`）复制到父技能的 `... aitools tools query "<SQL>"`。
- **非答案也是消息，而非错误**：如果 Genie 拒绝或"找不到相关数据"，不要重试 —— 使用下方的回退。

> **命名：** "Genie One" 是这种跨数据聊天的当前名称 —— 曾叫 "Databricks One"，后叫 "OneChat"（后端工具的名称仍然字面地叫 `onechat`）。全都是同一回事。

## 如果 Genie One 不可用 —— 手动回退

只有当 Genie One 确实不可用时才回退 —— 先**核实**（`databricks genie ask --help`，或在早于 v1.9.0 的 CLI 上用 `databricks experimental genie ask --help`）；不要假设命令缺失。当 Genie One 未启用、CLI 太旧而没有任一形式的 `genie ask`，或 Genie 无法覆盖该问题时，用父技能的命令自己完成发现 —— 参见**[手动数据探索](../databricks-core/manual-data-exploration.md)**（通过 `information_schema` 做关键词搜索、`discover-schema` 和 `tools query`）。用它运行已知 SQL 或剖析一张已知的表本身完全没问题。对于数据位置问题，**不要**默认用 `databricks tables list` 或原始 UC REST —— 先调用本技能并询问 Genie。

## 与 Genie One MCP 的关系

Databricks 也把这项能力提供为一个托管的 **MCP** 服务器 —— *Genie One MCP*。本技能通过 Databricks CLI 交付**同样的功能**，无需配置或托管 MCP 服务器。更广泛地说，Databricks Agent Skills 与 Databricks 的托管 MCP 服务器覆盖相同范围，因此你无需接入任何 MCP 就能使用它。如果你已经在运行 Genie One MCP，就用你更喜欢的那个 —— 它们访问同一个 Genie 后端。

## 相关技能

- **databricks-genie-agents** —— 构建和管理 **Genie Agents**：经过精选的
  智能体，让你或某个小组可以就特定数据提问（创建、配置、导入/导出）。
- **databricks-core**（父级）—— CLI 认证、profile，以及用作回退的手动数据探索
  参考。
