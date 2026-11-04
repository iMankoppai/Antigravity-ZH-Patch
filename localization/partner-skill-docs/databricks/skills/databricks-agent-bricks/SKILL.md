---
name: databricks-agent-bricks
description: "创建 Agent Bricks：用于文档问答的 Knowledge Assistants（KA），以及用于多智能体编排（MAS）的 Supervisor Agents。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Agent Bricks

Agent Bricks 是 Databricks 中预构建的 AI 组件（tiles），提供对话式界面。本技能涵盖 **Knowledge Assistants** 和 **Supervisor Agents**。

| 组件 | 用途 | 本技能 |
|-------|---------|------------|
| **Knowledge Assistant（KA）** | 对卷中的 PDFs/文本使用 RAG 进行文档问答 | ✓ |
| **Supervisor Agent** | 编排多个智能体（KA、端点、UC 函数、MCP） | ✓ |

---

## Knowledge Assistant

```bash
# Find volumes
databricks volumes list CATALOG SCHEMA
databricks experimental aitools tools query --warehouse WH "LIST '/Volumes/catalog/schema/volume/'"

# Create KA
databricks knowledge-assistants create-knowledge-assistant "Name" "Description"

# Add knowledge source. With --json, pass ONLY the PARENT as a positional arg
# and put display_name / description / source_type / the source body (files|index|file_table)
# inside the JSON. Mixing positional DISPLAY_NAME/DESCRIPTION/SOURCE_TYPE with --json errors.
databricks knowledge-assistants create-knowledge-source \
  "knowledge-assistants/{ka_id}" \
  --json '{
    "display_name": "Docs",
    "description": "Documentation files",
    "source_type": "files",
    "files": {"path": "/Volumes/catalog/schema/volume/"}
  }'

# Sync and check status
databricks knowledge-assistants sync-knowledge-sources "knowledge-assistants/{ka_id}"
databricks knowledge-assistants get-knowledge-assistant "knowledge-assistants/{ka_id}"

# List/manage
databricks knowledge-assistants list-knowledge-assistants
databricks knowledge-assistants delete-knowledge-assistant "knowledge-assistants/{ka_id}"  # destructive & irreversible — confirm the id first
```

**数据源类型：** `files`（卷路径）或 `index`（Vector Search：`index.index_name`、`index.text_col`、`index.doc_uri_col`）

**状态：** `CREATING`（2-5 分钟）→ `ONLINE` → `OFFLINE`

---

## Supervisor Agent

原生 CLI：`databricks supervisor-agents`（Beta，要求 CLI ≥ v1.0.0）。资源路径形如 `supervisor-agents/{id}` —— 每条命令接受该完整路径，或一个该形状的 `PARENT`。`list-supervisor-agents` 和 `list-examples`/`list-tools` 返回裸 JSON 数组。

```bash
# Create the supervisor agent (display name positional, description/instructions as flags)
databricks supervisor-agents create-supervisor-agent "My Supervisor" \
    --description "Routes queries to specialized agents" \
    --instructions "Route data questions to analyst, document questions to docs_agent."
# → returns {name: "supervisor-agents/<uuid>", endpoint_name: "mas-<short>-endpoint", ...}

# List / get / find by name
databricks supervisor-agents list-supervisor-agents
databricks supervisor-agents get-supervisor-agent supervisor-agents/<id>
databricks supervisor-agents list-supervisor-agents | jq '.[] | select(.display_name == "My Supervisor")'

# Update — UPDATE_MASK + new DISPLAY_NAME are positional; description/instructions optional flags
databricks supervisor-agents update-supervisor-agent supervisor-agents/<id> \
    "display_name,description,instructions" "My Supervisor (v2)" \
    --description "..." --instructions "..."

# Delete (destructive & irreversible — confirm the id first)
databricks supervisor-agents delete-supervisor-agent supervisor-agents/<id>
```

### 工具（supervisor 所路由到的智能体）

每个工具将 supervisor 连接到下游资源。`tool_type` 放在 `--json` 里（使用 `--json` 时，CLI 会拒绝将其作为位置参数）。每种类型都有一个类型专属的块（`genie_space`、`knowledge_assistant` 等），其标识符字段因类型而异 —— 见下表。

```bash
# Attach a Genie space — find its space_id with `databricks genie list-spaces`
databricks supervisor-agents create-tool supervisor-agents/<id> analyst --json '{
    "tool_type": "genie_space",
    "description": "SQL analytics on the analytics warehouse",
    "genie_space": {"id": "<genie_space_id>"}
}'

# Attach a Knowledge Assistant — find ka_id with `databricks knowledge-assistants list-knowledge-assistants`
databricks supervisor-agents create-tool supervisor-agents/<id> docs_agent --json '{
    "tool_type": "knowledge_assistant",
    "description": "Answers from product documentation",
    "knowledge_assistant": {"knowledge_assistant_id": "<ka_id>"}
}'

# List / get / delete tools
databricks supervisor-agents list-tools supervisor-agents/<id>
databricks supervisor-agents get-tool supervisor-agents/<id>/tools/<tool_id>
databricks supervisor-agents delete-tool supervisor-agents/<id>/tools/<tool_id>
```

**工具类型**（`tool_type` 值 → 类型专属块）：

| `tool_type` | 块 | 用于 |
|---|---|---|
| `genie_space` | `{"id": "<space_id>"}` | 通过 Genie 将自然语言 → SQL |
| `knowledge_assistant` | `{"knowledge_assistant_id": "<ka_id>"}` | 通过 KA 进行文档问答 |
| `uc_function` | `{"name": "catalog.schema.func"}` | UC SQL/Python 函数 |
| `uc_connection` | `{"name": "<connection_name>"}` | 通过 UC HTTP Connection 的外部 MCP 服务器 |
| `volume` | `{"name": "<full_volume_name>"}` | 浏览 UC 卷 |
| `app` | `{"name": "<app_name>"}` | Databricks App |
| 其他类型（`serving_endpoint`、`lakeview_dashboard`、`supervisor_agent`、`uc_table`、`vector_search_index`、`catalog`、`schema`、`web_search`） | 块名和字段形状各异 | 运行 `databricks supervisor-agents create-tool --help` 并探查 —— 这些尚未在此处经过端到端验证。 |

### 示例（训练 supervisor）

示例必须使用 `--json` —— 位置参数 `GUIDELINES` 不接受任何编码，因为 guidelines 是 `repeated string`。

```bash
databricks supervisor-agents create-example supervisor-agents/<id> --json '{
    "question": "What were Q4 revenue numbers?",
    "guidelines": ["Route to analyst Genie space", "Always group by region"]
}'

databricks supervisor-agents list-examples supervisor-agents/<id>
databricks supervisor-agents get-example supervisor-agents/<id>/examples/<ex_id>
databricks supervisor-agents delete-example supervisor-agents/<id>/examples/<ex_id>
```

**端点就绪：** 在 `create-supervisor-agent` 之后，服务端点最多需要约 10 分钟才能上线并可回答查询。`get-supervisor-agent` 会立即返回端点名称，但查询它受制于端点自身的就绪状态 —— 通过 `databricks serving-endpoints get <endpoint_name>` 检查。

---

## 参考

| 主题 | 文件 |
|-------|------|
| KA 数据源类型、索引、故障排查 | [references/1-knowledge-assistants.md](references/1-knowledge-assistants.md) |
| UC 函数、MCP 服务器、示例 | [references/2-supervisor-agents.md](references/2-supervisor-agents.md) |
