---
name: neo4j-aura-agent-skill
description: 通过 v2beta1 REST API 管理 Neo4j Aura Agents——创建、列出、获取、更新、删除，
  以及调用由 AuraDB 实例支撑的 Aura agents。在配置 Aura Agent 工具
  （CypherTemplate、SimilaritySearch、Text2Cypher）、设置系统提示词、将 agent 部署到 REST
  或 MCP 端点、用自然语言查询调用 agent，或为 Aura Agent 评估功能生成评估
  数据集（最多 50 个问题）时使用。涵盖 OAuth2 认证、
  组织/项目作用域、工具参数 schema 以及 InvokeAgentResponse 格式。
  不涵盖 AuraDB 实例预配——请使用 neo4j-aura-provisioning-skill。
  不涵盖向量索引创建——请使用 neo4j-vector-index-skill。
version: 1.1.0
allowed-tools: Bash WebFetch  
---

## 何时使用
- 在现有 AuraDB 实例上创建或配置 Aura Agent
- 向 agent 添加/更新工具（CypherTemplate、SimilaritySearch、Text2Cypher）
- 部署 agent 以供外部访问（REST API 端点或 MCP 服务器）
- 通过 REST API 用自然语言查询调用 agent
- 列出、读取或删除项目中的现有 agent
- 生成评估数据集（JSON），以在 Aura 控制台的 Evaluation 功能中测试 agent

## 何时不使用
- **创建/管理 AuraDB 实例** → `neo4j-aura-provisioning-skill`
- **创建向量索引** → `neo4j-vector-index-skill`
- **直接运行 Cypher** → `neo4j-cypher-skill`
- **构建 Aura Graph Analytics 会话** → `neo4j-aura-graph-analytics-skill`

---

## 什么是 Aura Agents

基于 AuraDB 的 GraphRAG agents——通过三种工具类型回答自然语言问题：

- **CypherTemplate**——用于可预测查找的参数化查询
- **SimilaritySearch**——在 VECTOR 索引上进行向量相似度搜索
- **Text2Cypher**——自然语言 → Cypher，用于聚合和发现

无需应用代码即可通过自然语言将你的图暴露给用户或应用。可作为 REST 或 MCP 端点访问；支持单轮和多轮。若需完全控制 Cypher、低延迟查找或直接写入——请改用 `neo4j-cypher-skill`。

---

## 前置条件
- 运行中的 AuraDB 实例，且已加载知识图
- 在 Organization 设置中启用“Generative AI assistance”
- 在项目中开启“Aura Agent”
- 在项目/Security 级别启用“Tool authentication”
- 项目管理员访问权限
- 来自 console.neo4j.io → Account Settings → API Credentials 的 `AURA_CLIENT_ID` 和 `AURA_CLIENT_SECRET`
- `AURA_ORG_ID`、`AURA_PROJECT_ID`——见步骤 2；`AURA_INSTANCE_ID`——若尚未设置，则在步骤 2 中交互式解析
- Python 环境：在技能目录中执行 `uv sync`（或 `pip install neo4j neo4j-graphrag requests python-dotenv`）
- `.env` 和 `schema.json` 已在 `.gitignore` 中

---

## 步骤 1——验证认证

仅做手动凭据验证——脚本会在内部调用 `get_token()`。

```bash
TOKEN=$(curl -s --request POST 'https://api.neo4j.io/oauth/token' \
  --user "${AURA_CLIENT_ID}:${AURA_CLIENT_SECRET}" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  | jq -r '.access_token')
echo "Token: ${TOKEN:0:20}..."
```

如果 token 为空：核实 `.env` 中的 `AURA_CLIENT_ID`/`AURA_CLIENT_SECRET`。**停止并报告。**
token TTL：3600 秒。遇到 401/403 时重新运行。

---

## 步骤 2——解析 Organization 与 Project ID

**从控制台 URL**（最快）：打开 console.neo4j.io → 导航到一个项目。URL 模式：
`/organizations/{AURA_ORG_ID}/projects/{AURA_PROJECT_ID}`

**编程式备用方案**：
```bash
curl -s https://api.neo4j.io/v1/tenants \
  -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, name}'
# tenant id maps to AURA_PROJECT_ID
```

在 `.env` 中设置：
```
AURA_ORG_ID=<organization-id>
AURA_PROJECT_ID=<project-id>
```

**检查 `AURA_INSTANCE_ID`**——如果它已在 `.env` 中设置，跳过本步骤剩余部分。

如果未设置，列出可用实例并请用户选择：

```bash
curl -s "https://api.neo4j.io/v1/instances?tenantId=${AURA_PROJECT_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {id, name, status, region, type}'
```

向用户展示输出。询问：**“agent 应连接到哪个实例？”** 然后写入 `.env`：

```
AURA_INSTANCE_ID=<chosen-instance-id>
NEO4J_URI=neo4j+s://<chosen-instance-id>.databases.neo4j.io
```

如果列表为空：此项目中不存在 AuraDB 实例——没有实例就无法创建 Aura Agent。**停止并报告。**
如果 `401`：重新运行步骤 1。如果 `404`：核实 `AURA_PROJECT_ID`。**停止并报告。**

---

## 步骤 3——列出现有 Agent

```bash
uv run python3 scripts/manage_agent.py list   # Linux/macOS
uv run python scripts\manage_agent.py list    # Windows
```

输出：agent ID、名称、启用状态、端点 URL。

如果 `401`：重新运行步骤 1。如果 `404`：核实 `AURA_ORG_ID`/`AURA_PROJECT_ID`。**停止并报告。**

---

## 步骤 4——获取图 Schema

需要 `.env` 中的 `NEO4J_URI`、`NEO4J_USERNAME`、`NEO4J_PASSWORD`。

```bash
uv run python3 scripts/fetch_schema.py   # Linux/macOS
uv run python scripts\fetch_schema.py    # Windows
```

保存 `schema.json`。输出：节点/关系类型计数、节点标签 + 类型化属性（含 Aura `data_type`）、关系模式、VECTOR 索引。

**数据闸门**——若出现以下情况，脚本会报错退出且不写入 `schema.json`：
- 少于 2 个节点，或
- 关系类型为零

如果闸门失败：先向数据库加载数据再继续。**停止并报告。**
如果 `ServiceUnavailable`：检查 `NEO4J_URI` 使用 `neo4j+s://`；实例必须为 `running`。**停止并报告。**
如果 `neo4j-graphrag not found`：执行 `uv add neo4j-graphrag`。**停止并报告。**

在步骤 5 之前阅读 `schema.json`。

---

## 步骤 5——发现用例

在设计工具之前，阅读 [references/authoring-guide.md](references/authoring-guide.md)。

**从请求和 schema 中获取答案；对缺口进行询问。不要猜测工具类型或参数。**

1. “这个 agent 应回答哪些问题？”
2. “哪些节点或关系最重要？”——对照 `schema.json → node_props` 匹配
3. “用户是否按特定属性值搜索？” → CypherTemplate
4. “是否有计数、分组或日期范围类问题？” → Text2Cypher
5. “是否搜索语义相似的文本？” → 检查 `schema.json → metadata → vector_index`
   - 未找到 VECTOR 索引：告知用户；跳过 SimilaritySearch；先委托给 `neo4j-vector-index-skill`
   - 找到 VECTOR 索引：provider/model 取自请求，否则询问（**“使用哪个 embedding provider 和 model？”**）；支持的模型 → `references/REFERENCE.md → Embedding Provider Options`。维度取自索引（`vector.dimensions`）。不要猜测 provider/model。

工具选择：

| 用例 | 工具 |
|---|---|
| 按特定属性值查找 | `cypherTemplate` |
| 语义文本搜索 | `similaritySearch` |
| 聚合、计数、开放式 | `text2cypher` |

**CypherTemplate 参数**：对每个参数，从 `schema.json → node_props` 或 `rel_props` 读取 `aura_data_type`，并将其用作 `data_type`。如果属性为 `low_cardinality: true`，参数的 `description` 应列出有效值——从 `schema.json` 中的 `values` 数组复制它们。示例：`"description": "Agreement type to filter by. Valid values: \"Distributor Agreement\", \"License Agreement\", \"NDA\""`。具有 `has_fulltext_index: true` 的属性尤其可能是过滤目标，在低基数时也应包含有效值。

**SimilaritySearch 配置**——值取自请求；`dimension` 取自索引；对缺口进行询问；然后起草工具配置：

| 字段 | 询问什么 | 来源 |
|---|---|---|
| `provider` | “openai”还是“vertexai”？ | 请求，否则由用户确认 |
| `model` | 使用哪个模型？ | 请求，否则由用户从 `references/REFERENCE.md → Embedding Provider Options` 中选择 |
| `dimension` | 输出维度是多少？ | 若模型可配置则为必填（见表格）；固定模型使用表格中的值 |

`index`：使用 `schema.json → metadata → vector_index` 中 `state = ONLINE` 的 `name`。`dimension` 必须与同一索引条目中的 `vector.dimensions` 匹配。

**信号清单**：对出现在工具或用户所述问题中的每个标签或关系，在系统提示词中编写一个信号块。模板和规则见 `references/authoring-guide.md → Signals inventory`。

起草配置 JSON → 展示给用户审阅 → 确认 → 进入步骤 6。如果用户表示继续，或请求已给出完整配置，则跳过审阅；说明配置后继续。

---

## 步骤 6——创建 Agent

最低必需配置：
```json
{
  "name": "My Agent",
  "description": "Answers questions about the graph",
  "dbid": "<AURA_INSTANCE_ID>",
  "is_private": false,
  "tools": [
    {
      "type": "text2cypher",
      "name": "Query Graph",
      "description": "Translates natural language questions into Cypher queries"
    }
  ]
}
```

**向用户展示配置并在运行前确认（如果用户已要求以这些细节创建则跳过）：**
```bash
uv run python3 scripts/manage_agent.py create --config agent-config.json
```

响应包含 `id`（保存为 `AURA_AGENT_ID`）、`endpoint_link`。响应中没有 MCP URL；如果 `is_mcp_enabled`：`https://mcp.neo4j.io/agent?project_id=<project_id>&agent_id=<agent_id>`——见 `references/REFERENCE.md → External Access`。

---

## 步骤 7——调用 Agent（测试）

```bash
uv run python3 scripts/invoke_agent.py --agent-id "$AURA_AGENT_ID" "What can you help me with?"
```

`--raw` 打印完整 JSON，包括推理链和 token 用量。

直接 curl（使用步骤 1 的 token）：
```bash
curl -s -X POST \
  "https://api.neo4j.io/v2beta1/organizations/${AURA_ORG_ID}/projects/${AURA_PROJECT_ID}/agents/${AURA_AGENT_ID}/invoke" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"input": "What can you help me with?"}'
```

---

## 步骤 8——更新 Agent（部分 PATCH）

创建仅包含要更改字段的 patch JSON：
```json
{ "system_prompt": "Updated instructions.", "is_mcp_enabled": true }
```

**向用户展示并在运行前确认：**
```bash
uv run python3 scripts/manage_agent.py update --agent-id "$AURA_AGENT_ID" --config patch.json
```

---

## 步骤 9——删除 Agent

不可逆。配置将被永久移除。

**向用户展示并在运行前等待明确确认：**
```bash
uv run python3 scripts/manage_agent.py delete --agent-id "$AURA_AGENT_ID"
```

返回 202 Accepted。

---

## 步骤 10——生成评估数据集

为 Aura 的 Agent Evaluation 功能创建一个可导入的评估数据集（最多 50 个问题）。先阅读 [references/evaluation-dataset-guide.md](references/evaluation-dataset-guide.md)——其中定义了格式、tool_type 映射、问题预算和类别规则。

1. 导出真实的 agent 定义（绝不要仅凭描述起草——LLM 会编造看似合理的工具调用）：
   ```bash
   uv run python3 scripts/manage_agent.py get --agent-id "$AURA_AGENT_ID" > agent.json
   ```
   确保 `schema.json` 存在（步骤 4）。
2. 列出工具（name、type、parameters、descriptions）并提出按类别的计划（总计 ≤ 50）。类别：
   1. 核心事实（计数、聚合、过滤、比较、AND/NOT）
   2. 逐工具探测——对每个非 Text2Cypher 工具：一个它应能准确处理的，一个针对假设限制的边界用例，一个利用其配置中已确认的结构缺口的用例
   3. 语义搜索——精确匹配 + 转述/概念性（仅当存在 `similaritySearch` 工具时）
   4. 多工具组合——每条链包含 2–4 个工具
   5. Text2Cypher 压力测试——5.1 2–3 跳/聚合，5.2 WITH/OPTIONAL 复合，5.3 最短路径/可变长度，5.4 零记录（幻觉）问题，5.5 schema 问题
3. **通过在数据库上运行 Cypher 推导每一个期望答案**（使用带 `.env` 凭据的 driver）。不要猜测答案。将 Cypher + 缺口理由保留在 `eval_dataset.provenance.json` 中。
4. 编写 `eval_dataset.json` 并验证：
   ```bash
   uv run python3 scripts/validate_eval_dataset.py eval_dataset.json --agent agent.json
   ```
5. 向用户展示各类别计数和样本。警告：在控制台中保存后问题**为只读**，且数据集没有版本历史，因此在导入前（Agent → Evaluation）先确认。

---

## 工具配置

### CypherTemplate
用于重复、可预测查找的预定义参数化查询。

```json
{
  "type": "cypherTemplate",
  "name": "<descriptive name>",
  "description": "<what it looks up and when to use it>",
  "enabled": true,
  "config": {
    "template": "MATCH (n:Label {prop: $param}) RETURN n",
    "parameters": [
      {
        "name": "param",
        "data_type": "<string|integer|number|boolean — from schema.json aura_data_type>",
        "description": "<what the parameter represents. If low_cardinality=true in schema.json, append: Valid values: \"val1\", \"val2\", ...>"
      }
    ]
  }
}
```

低基数规则：如果 `schema.json → node_props[Label][prop].low_cardinality` 为 `true`，则 `description` 字段必须以 `schema.json → node_props[Label][prop].values` 中的确切值结尾。这同样适用于 `rel_props` 中的关系属性。

### SimilaritySearch
需要 VECTOR 索引（`state = ONLINE`）。从 `schema.json → metadata → vector_index` 获取索引名称。

```json
{
  "type": "similaritySearch",
  "name": "<descriptive name>",
  "description": "<what text it searches and when to use it>",
  "enabled": true,
  "config": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "index": "<name from schema.json metadata.vector_index[state=ONLINE].name>",
    "top_k": 5,
    "dimension": "<vector.dimensions from schema.json metadata.vector_index options.indexConfig>",
    "post_processing_cypher": "<optional: Cypher to enrich similarity results with related nodes>"
  }
}
```

`provider`/`model` 组合：见 [references/REFERENCE.md](references/REFERENCE.md)。

### Text2Cypher
自然语言 → Cypher。用作聚合和发现的兜底方案。

```json
{
  "type": "text2cypher",
  "name": "<descriptive name>",
  "description": "<what questions it handles — and explicitly what it should NOT handle>",
  "enabled": true
}
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `401 Unauthorized` | token 过期 | 重新运行步骤 1 |
| `403 Forbidden` 出现在创建时 | 非项目管理员 | 申请管理员访问权限 |
| `400 Bad Request` | 工具配置无效或缺少必填字段 | 检查 `type` 拼写：`cypherTemplate`、`similaritySearch`、`text2cypher` |
| `404 Not Found` | org/project/agent ID 错误 | 重新运行 `list` 以核实 ID |
| 创建时带 SimilaritySearch 返回 `400` | 缺少向量索引 | 先创建索引——使用 `neo4j-vector-index-skill` |
| Agent 返回无结果 | `top_k` 太低或索引为空 | 提高 `top_k`；核实索引已填充 |

---

## 脚本

所有脚本自动从 `.env` 加载凭据。使用 `uv run python3 <script>` 运行。

| 脚本 | 用途 |
|---|---|
| `scripts/fetch_schema.py` | 从 AuraDB 获取图 schema；保存到 `schema.json` |
| `scripts/manage_agent.py` | CRUD：列出、创建、获取、更新、删除 agent |
| `scripts/invoke_agent.py` | 向 agent 发送自然语言查询 |
| `scripts/validate_eval_dataset.py` | 验证评估数据集 JSON（可选地对照 `agent.json`） |

**fetch_schema.py 参数：**

| 参数 | 类型 | 必需 | 默认值 |
|---|---|---|---|
| `NEO4J_URI` | env | 是 | — |
| `NEO4J_USERNAME` | env | 否 | `neo4j` |
| `NEO4J_PASSWORD` | env | 是 | — |
| `NEO4J_DATABASE` | env | 否 | `neo4j` |

**manage_agent.py 参数：**

| 参数 | 类型 | 必需 | 环境变量回退 |
|---|---|---|---|
| `AURA_CLIENT_ID` | env | 是 | — |
| `AURA_CLIENT_SECRET` | env | 是 | — |
| `--org-id` | arg | 否 | `AURA_ORG_ID` |
| `--project-id` | arg | 否 | `AURA_PROJECT_ID` |
| `--agent-id` | arg | get/update/delete | `AURA_AGENT_ID` |
| `--config` | arg | create/update | — |

**invoke_agent.py 参数：**

| 参数 | 类型 | 必需 | 环境变量回退 |
|---|---|---|---|
| `AURA_CLIENT_ID` | env | 是 | — |
| `AURA_CLIENT_SECRET` | env | 是 | — |
| `--org-id` | arg | 否 | `AURA_ORG_ID` |
| `--project-id` | arg | 否 | `AURA_PROJECT_ID` |
| `--agent-id` | arg | 是 | `AURA_AGENT_ID` |
| `query` | positional | 是 | — |
| `--raw` | flag | 否 | — |

---

## 核对清单
- [ ] AuraDB 实例为 `running`，知识图已加载
- [ ] 在 org/project 设置中启用“Generative AI assistance” + “Aura Agent”
- [ ] `.env` 已填充：`AURA_CLIENT_ID`、`AURA_CLIENT_SECRET`、`AURA_ORG_ID`、`AURA_PROJECT_ID`、`AURA_INSTANCE_ID`、`NEO4J_URI`、`NEO4J_PASSWORD`
- [ ] `.env` 和 `schema.json` 已在 `.gitignore` 中
- [ ] 认证已验证（步骤 1）
- [ ] Org/Project ID 已确认（步骤 2）
- [ ] 通过 `list` 确认 API 连通性（步骤 3）
- [ ] `schema.json` 已获取并审阅（步骤 4）——数据闸门通过（≥2 个节点，≥1 个关系类型）
- [ ] 已与用户确认用例（步骤 5）
- [ ] CypherTemplate `data_type` 取自 `schema.json aura_data_type`
- [ ] SimilaritySearch `index` 取自 `schema.json metadata.vector_index`（state=ONLINE）
- [ ] Agent 配置已展示给用户并确认（步骤 6）
- [ ] 必填字段齐全：`name`、`description`、`dbid`、`is_private`、`tools`（至少 1 个）
- [ ] `AURA_AGENT_ID` 已从创建响应中保存
- [ ] Agent 已调用且响应已验证（步骤 7）
- [ ] 更新/删除在执行前已由用户确认
- [ ] 评估数据集：≤ 50 个问题，期望答案来自数据库查询，工具调用已对照 `agent.json` 验证（步骤 10）
