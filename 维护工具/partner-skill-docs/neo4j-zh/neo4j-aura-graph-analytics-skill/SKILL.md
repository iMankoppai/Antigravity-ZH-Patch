---
name: neo4j-aura-graph-analytics-skill
description: 无服务器 Aura Graph Analytics（AGA）GDS Sessions——涵盖 GdsSessions、
  AuraGraphDataScience、AuraAPICredentials、DbmsConnectionInfo、SessionMemory、get_or_create、
  使用 gds.graph.project.cypher 和 gds.graph.project.remote 的远程图投影、
  gds.graph.project.native、gds.graph.construct、graphdatascience 客户端 2.0 会话
  端点、异步计算与 gds.jobs、AuraDB Cypher API memory/sessionId 投影、
  算法、回写以及会话生命周期。用于连接 AuraDB、自管理
  Neo4j 或独立 DataFrame/Spark 会话工作负载。
  不涵盖 Aura Pro 或自管理 Neo4j 上的嵌入式 GDS 插件——请使用 neo4j-gds-skill。
  不处理 Cypher 编写——请使用 neo4j-cypher-skill。
  不涵盖 Snowflake Graph Analytics——请使用 neo4j-snowflake-graph-analytics-skill。
version: 1.0.13
allowed-tools: Bash WebFetch
---

## 何时使用
- 在 Aura Graph Analytics GDS Sessions 中运行 GDS 算法
- 创建 `GdsSessions` 或使用 `AuraGraphDataScience`
- 使用 `gds.graph.project.remote(...)` 远程投影已连接的 Neo4j 数据
- 使用 `{ memory: ... }` 或 `{ sessionId: ... }` 进行 AuraDB Cypher API 投影
- 处理来自非 Neo4j 来源（Pandas、Spark、CSV）的图数据
- 按需 / 流水线工作负载——临时会话，按会话分钟计费
- 分析期间与线上数据库完全隔离

## 何时不使用
- **带嵌入式 GDS 插件的 Aura Pro** → `neo4j-gds-skill`
- **带嵌入式 GDS 插件的自管理 Neo4j** → `neo4j-gds-skill`
- **编写 Cypher 查询** → `neo4j-cypher-skill`
- **Snowflake Graph Analytics** → `neo4j-snowflake-graph-analytics-skill`

---

## 部署决策表

| 部署 | 使用 |
|---|---|
| AuraDB Free | **本技能**——最大 `m_2GB`，1 个并发会话，不计费 |
| Aura Pro + 启用 Graph Analytics 插件（轻量探索，共享资源） | `neo4j-gds-skill` |
| Aura Pro / Pro Trial + 会话（隔离计算） | **本技能**——最高 128 GB（Pro）/ 8 GB（Pro Trial），100 / 3 个并发会话 |
| AuraDB + Python 客户端会话 | **本技能** |
| AuraDB + Cypher API | AGA 特定的投影/会话说明用**本技能**；查询编写用 `neo4j-cypher-skill` |
| 自管理 Neo4j + AGA 会话 | **本技能** |
| 自管理 Neo4j + 嵌入式插件 | `neo4j-gds-skill` |
| 非 Neo4j 数据（Pandas、Spark） | **本技能**（独立模式） |

---

## 默认值

- 需要 `graphdatascience >= 2.0`；建议 `>= 2.3`
- 2.0 端点：无 `v2` 前缀——`gds.page_rank.*`、`gds.graph.node_properties.*`、`gds.graph.construct(...)`
- 端到端使用 snake_case 参数
- 会话创建后调用 `gds.verify_connectivity()`——验证会话，若已附加则也验证源 DB
- 大型会话前先估算内存
- 设置 TTL；默认空闲 1h，最长 7d（硬性 7 天生命周期上限）
- 完成后关闭会话：`gds.delete()` 或 `sessions.delete(session_name=...)` 停止计费
- 使用 `AuraAPICredentials.from_env()` 和 `DbmsConnectionInfo.from_env()`——绝不要硬编码凭据

---

## 安装

```bash
pip install "graphdatascience>=2.3"     # 2.3 is the current stable release
```

2.0–2.2 要求：Python >= 3.10、`neo4j` driver 5.26–7.0、pandas 2–3、pyarrow 21–25、numpy <3。2.3：Python >= 3.11 且 < 3.16（已移除 3.10），pyarrow >= 22 且 < 27——若使用 Python 3.10 请停留在 2.2。

### 客户端 1.x（旧版）

2.0 重命名/重组了客户端。仍固定使用 1.22（`graphdatascience<2`）？映射如下：

| 1.x | 2.0 |
|---|---|
| `gds.v2.<endpoint>` | `gds.<endpoint>`——`v2` 前缀已移除；无类型的 1.x 端点已删除 |
| `gds.graph.project(graph_name, query)`（远程） | `gds.graph.project.cypher(graph_name, query)` |
| `gds.graph.project_native(...)` | `gds.graph.project.native(...)` |
| `GraphV2` / `ModelV2` | `Graph` / `Model`——`from graphdatascience import Graph` |
| `Graph.drop(failIfMissing=)` / `Model.drop(failIfMissing=)` | `fail_if_missing=` |
| `gds.v2.verify_session_connectivity()` / `gds.v2.verify_db_connectivity()` | `gds.verify_connectivity()`——1.x 中也存在；`v2` 命名空间已移除 |
| `run_cypher(..., retryable=)` | 已移除——始终重试 |
| `gds.graph.project.cypher(database=...)` | 已移除——在投影前 `gds.set_database(...)` |
| `gds.graph.node_labels.mutate(write_concurrency=, job_id=)` | 参数已移除 |
| `ArrowEndpointVersion.from_arrow_info` | `check_version_compatibility` |

迁移指南：[Neo4j GDS Python client 2.0 migration](https://neo4j.com/docs/graph-data-science-client/current/migration-from-1x/)

2.0 新增：`GdsSessions.estimate(algorithms=[...])` 按算法估算内存；`GdsSessions.get_or_create(show_progress=...)`；仅限关键字的 `GdsSessions.delete(session_name=|session_id=)` 在未删除任何内容时返回 `False`；`gds.graph.project` / `generate` / `construct` / `filter` / `sample` 上的 `overwrite=True` 会先删除同名图；`gds.graph.drop(...)` 接受多个图 → `list[GraphInfo]`。

2.1 新增：`gds.run_cypher(query, auto_commit=True)` 用于 `CALL { … } IN TRANSACTIONS`（2.0 默认的可重试事务会拒绝它）；`gds.db_driver()` → 会话客户端管理的 `neo4j.Driver`（由 `gds.close()` 关闭）；`mode="READ"`/`"WRITE"` 字符串可用于 `QueryMode`。

2.3 新增：`get_or_create` 附加到 Aura 虚拟图实例（类型自动检测；传入 `uri=` + `aura_instance_id=`）；`DbmsConnectionInfo(uri=...)` 对 AuraDB 按原样使用，而不是被 Aura API 连接 URL 替换；通过 AuraDB Cypher API 投影的图可在 Python 客户端使用，反之亦然（预览）；`gds.graph.project.cypher` 在查询未匹配到数据时报告未创建图。

---

## 关键模式

### 步骤 1——认证

```python
from graphdatascience.session import AuraAPICredentials, GdsSessions

sessions = GdsSessions(api_credentials=AuraAPICredentials.from_env())
# Reads: AURA_CLIENT_ID, AURA_CLIENT_SECRET, AURA_PROJECT_ID (optional)
# Create API credentials in Aura Console → Account → API credentials
```

属于多个项目或组织：设置 `AURA_PROJECT_ID` 或传入 `project_id=`——2.1 在推导默认项目时先检查组织。

### 步骤 2——估算内存

```python
from graphdatascience.session import AlgorithmCategory, SessionMemory

# Per-algorithm + config — preferred
memory = sessions.estimate(
    node_count=1_000_000,
    relationship_count=5_000_000,
    algorithms=["wcc", "louvain", "fast_rp"],
)
# or with config:
memory = sessions.estimate(
    node_count=1_000_000,
    relationship_count=5_000_000,
    algorithms={"fast_rp": {"embedding_dimension": 128}},
)
# Coarse category estimate — 1.x style, still available
memory = sessions.estimate(
    node_count=1_000_000,
    relationship_count=5_000_000,
    algorithm_categories=[
        AlgorithmCategory.CENTRALITY,
        AlgorithmCategory.NODE_EMBEDDING,
        AlgorithmCategory.COMMUNITY_DETECTION,
    ],
)
# Returns SessionMemory tier, e.g. SessionMemory.m_8GB
# Fixed tiers: m_2GB … m_512GB — see references/limitations.md
```

### 步骤 3——创建会话

**模式 A——连接 AuraDB：**
```python
from graphdatascience.session import DbmsConnectionInfo, SessionMemory, CloudLocation
from datetime import timedelta

# Reads: AURA_INSTANCEID (takes precedence) or NEO4J_URI, plus NEO4J_USERNAME,
# NEO4J_PASSWORD, NEO4J_DATABASE
db_connection = DbmsConnectionInfo.from_env()
# Explicit: DbmsConnectionInfo(aura_instance_id=..., username=..., password=...)
# Virtual graph instance [2.3]: DbmsConnectionInfo(uri="neo4j+s://...", aura_instance_id=..., username=..., password=...)

gds = sessions.get_or_create(
    session_name="my-analysis",
    memory=memory,
    db_connection=db_connection,
    ttl=timedelta(hours=2),
)
gds.verify_connectivity()
```

**模式 B——自管理 Neo4j：**
```python
# Same from_env() — set NEO4J_URI (e.g. "bolt://my-server:7687"), no AURA_INSTANCEID
gds = sessions.get_or_create(
    session_name="my-analysis-sm",
    memory=SessionMemory.m_8GB,
    db_connection=DbmsConnectionInfo.from_env(),
    ttl=timedelta(hours=2),
    cloud_location=CloudLocation("gcp", "europe-west1"),
)
gds.verify_connectivity()
```

**模式 C——独立模式（无 Neo4j DB）：**
```python
gds = sessions.get_or_create(
    session_name="my-standalone",
    memory=SessionMemory.m_4GB,
    ttl=timedelta(hours=1),
    cloud_location=CloudLocation("gcp", "europe-west1"),
)
gds.verify_connectivity()
```

`get_or_create()` 是幂等的；按名称重新连接到已有会话。

### 步骤 4——投影图

**从已连接的 Neo4j（远程投影）：**
```python
query = """
    CALL () {
        MATCH (p:Person)
        OPTIONAL MATCH (p)-[r:KNOWS]->(p2:Person)
        RETURN p AS source, r AS rel, p2 AS target,
               p {.age, .score} AS sourceNodeProperties,
               p2 {.age, .score} AS targetNodeProperties
    }
    RETURN gds.graph.project.remote(source, target, {
        sourceNodeLabels:     labels(source),
        targetNodeLabels:     labels(target),
        sourceNodeProperties: sourceNodeProperties,
        targetNodeProperties: targetNodeProperties,
        relationshipType:     type(rel)
    })
"""

G, result = gds.graph.project.cypher(
    graph_name="my-graph",
    query=query,
    undirected_relationship_types=["KNOWS"],
)
print(f"Projected {G.node_count()} nodes, {G.relationship_count()} relationships")
```

多模式 MATCH 需要 `CALL () { ... }`。多个标签/关系类型时在 `CALL` 内使用 `UNION`。
远程查询必须使用 `gds.graph.project.remote(...)`；图名称传给 `gds.graph.project.cypher(...)`，而不是放在查询中。包含 `gds.graph.project` 但不带 `.remote` 的查询会被自动改写并给出警告。查询内的 `undirectedRelationshipTypes` / `inverseIndexedRelationshipTypes` → `ValueError`——应作为方法参数传入。
只有数值型节点属性可被投影进会话；流式传输时通过 `db_node_properties` 获取字符串属性。
独立会话不能远程投影——`ValueError: Remote projection is only supported for attached Sessions.`
1.x 备用方案：`gds.graph.project(graph_name=..., query=...)`。

**原生远程投影（无 Cypher 查询）**——`gds.graph.project.native(...)` 按标签/类型过滤从附加的 DB 投影：
```python
G, result = gds.graph.project.native(
    "my-graph",
    ["Person"],                              # node_label_filter
    ["KNOWS"],                               # relationship_type_filter
    node_properties=["age", "score"],
    undirected_relationship_types=["KNOWS"],
)
```
仅限附加会话。标签/类型过滤的投影用 `project.native`；转换、计算属性或 `UNION` 异构模式用 `project.cypher`。

**AuraDB Cypher API 投影：**
```cypher
CYPHER runtime=parallel
MATCH (source)
OPTIONAL MATCH (source)-->(target)
RETURN gds.graph.project(
  'my-graph',
  source,
  target,
  {},
  { memory: '2GB' }
)
```

已存在的显式会话：
```cypher
CYPHER runtime=parallel
MATCH (source)
OPTIONAL MATCH (source)-->(target)
RETURN gds.graph.project(
  'my-graph',
  source,
  target,
  {},
  { sessionId: '00000000-11111111' }
)
```

Cypher API 使用 `gds.graph.project(...)`，而不是 `gds.graph.project.remote(...)`。将 `memory`、`ttl`、`sessionId`、`batchSize` 放在第五个配置参数中。

通过 Cypher API 管理会话：
```cypher
CALL gds.session.getOrCreate('test-session', '2GB', duration({minutes: 30}))
YIELD id, name, status
RETURN id, name, status

CALL gds.session.list()
YIELD id, name, status, memory
RETURN id, name, status, memory
```

隐式 Cypher API 会话在会话中所有投影图都被删除时删除。

**从 Pandas DataFrame（独立模式）：**
```python
import pandas as pd

nodes_df = pd.DataFrame([
    {"nodeId": 0, "labels": "Person", "age": 30},
    {"nodeId": 1, "labels": "Person", "age": 25},
])
rels_df = pd.DataFrame([
    {"sourceNodeId": 0, "targetNodeId": 1, "relationshipType": "KNOWS"},
])

G = gds.graph.construct("my-graph", [nodes_df], [rels_df])
```

必需列——节点：`nodeId`（int）、`labels`（str）。关系：`sourceNodeId`、`targetNodeId`、`relationshipType`。在 `construct()` 之前删除字符串节点属性——会话只接受数值属性。

### 步骤 5——运行算法

```python
# Mutate — chain results without writing to DB
gds.page_rank.mutate(G, mutate_property="pagerank", damping_factor=0.85)
gds.fast_rp.mutate(G,
    mutate_property="embedding",
    embedding_dimension=128,
    feature_properties=["pagerank"],
    random_seed=42,
)

# Stream — inspect results as DataFrame
df = gds.page_rank.stream(G)
print(df.sort_values("score", ascending=False).head(10))

# Write — persist to connected Neo4j DB (connected modes only)
gds.louvain.write(G, write_property="community")
```

ML 流水线：`gds.pipeline.node_classification` / `link_prediction` / `node_regression`——2.0 中唯一的 API。
1.x 备用方案：`gds.v2.page_rank.mutate(...)`；像 `gds.pageRank.mutate(...)` 这类无类型的 1.x 端点在 2.0 中已移除。
插件算法参考 → `neo4j-gds-skill`；AGA 的限制不同。

### 步骤 6——异步任务轮询

长时间运行的算法——非阻塞的 `compute()` 返回 `JobHandle`：

```python
import time

job = gds.page_rank.compute(G, damping_factor=0.85)   # algorithm config only — no mutate/write args
while not job.done():
    time.sleep(5)
    print(f"Job status: {job.status().status} {job.status().progress_percent()}")
if not job.status().succeeded():                       # status string "done" / "aborted" / "running"
    raise RuntimeError(f"Algorithm job failed: {job.status().status}")
df = job.stream(wait=False)                            # raises JobNotFinishedError if not done
# or: job.mutate(mutate_property="pagerank")  /  job.write(write_properties="pagerank") → WriteJobHandle
```

Handle 方法：`.job_id()`、`.status()` → `JobStatus`（`.status`、`.progress`、`.succeeded()`、`.aborted()`、`.running()`）、`.done()`、`.wait(*, termination_flag=None)`、`.cancel()`、`.summary(wait=True)`、`.stream(wait=True)`、`.mutate(mutate_property=..., wait=True)`、`.write(write_properties=...)`。

以任务方式运行 GraphSAGE 预测 [2.2]：`gds.graph_sage.compute(G, model_name)`（经典模型）、`gds.graph_sage.supervised.compute(G, model_name, feature_properties)`（添加 `predicted_class`、`predicted_probabilities`）、`gds.graph_sage.unsupervised.compute(G, model_name, feature_properties)`——均返回 `JobHandle`；通过 `.stream()` / `.mutate()` / `.write()` 物化。
异步投影返回 `ProjectionJobHandle`（`gds.graph.project.native_async(...)`、`cypher_async(...)`）；回写产生 `WriteJobHandle`。列出/恢复任务：

```python
gds.jobs.list()                     # JobInfo per job: job_id, name
handle = gds.jobs.get(G, job_id)    # concrete handle type for the job
```

### 步骤 7——获取结果

```python
# Stream node properties
result_df = gds.graph.node_properties.stream(
    G,
    node_properties=["pagerank", "embedding"],
    db_node_properties=["name"],   # connected modes only — fetches string props from DB
)
result_df.head(10)
```

独立模式：无 `db_node_properties`；连接源 DataFrame：
```python
result_df = gds.graph.node_properties.stream(G, ["pagerank"])
result_df.merge(nodes_df[["nodeId", "name"]], how="left")
```

### 步骤 8——回写与清理

```python
# Write node properties to connected Neo4j
gds.graph.node_properties.write(G, ["pagerank", "embedding"])

# Write relationship properties
gds.graph.relationships.write(G, "SIMILAR", ["score"])

# Query connected DB from session
gds.run_cypher("MATCH (n:Person) RETURN count(n)")

# Drop projected graph
gds.graph.drop(G)

# Delete session
sessions.delete(session_name="my-analysis")
# or: gds.delete()
```

先写后删；会话关闭时未写回的结果会丢失。

### 会话管理

```python
# List active sessions
from pandas import DataFrame
DataFrame(sessions.list())

# Reconnect to existing session
gds = sessions.get_or_create(session_name="my-analysis", memory=..., db_connection=...)
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `AuthenticationError` / 401 | `CLIENT_ID`/`CLIENT_SECRET` 错误 | 在 Aura Console → Account → API credentials 中重新生成 |
| `RuntimeError` 获取已过期的会话 | 超出 TTL | 用 `sessions.list()` 检查；重新创建会话 |
| `SessionNotFoundError` | 会话过期（超出 TTL）或名称拼写错误 | 用 `sessions.list()` 检查；重新创建会话 |
| `GraphNotFoundError` | 投影被删除或会话重连后未重新投影 | 重新运行 `gds.graph.project.cypher()` 或 `gds.graph.construct()` |
| `ValueError: Remote projection is only supported for attached Sessions.` | 独立会话不能远程投影 | 改用 DataFrame 的 `gds.graph.construct(...)` |
| `NotAvailableInStandaloneSessions` | 功能需要附加 DB（例如 `gds.topological_link_prediction`、远程投影） | 附加一个 DB 或换用其他算法 |
| 算法任务 `FAILED` | 超出内存限制或算法不支持 | 提高 `SessionMemory`；对仅附加功能检查 `NotAvailableOutsideAura` |
| `MemoryEstimationExceeded` | 图大于估算 | 用实际计数重新估算；选择上一档 |
| 会话重连后结果为空 | 会话关闭前结果未写回 | 始终在 `gds.delete()` 前写入/流式获取 |
| `String node properties not supported` | 节点 DataFrame 中有字符串列 | 在 `gds.graph.construct()` 前删除字符串列；稍后通过 `db_node_properties` 获取字符串 |
| `AGA not enabled for project` | AGA 功能未激活 | 在 Aura Console → 项目设置中启用 |

---

## 参考

按需加载：
- [references/workflows.md](references/workflows.md)——完整的 AuraDB 和独立工作流示例、Spark 集成
- [references/limitations.md](references/limitations.md)——AGA 与嵌入式 GDS 功能对照表、SessionMemory 档位、云位置

## WebFetch

| 需求 | URL |
|---|---|
| AGA Python 客户端文档 | `https://neo4j.com/docs/graph-data-science-client/current/aura-graph-analytics/` |
| AGA Cypher API 文档 | `https://neo4j.com/docs/graph-data-science/current/aura-graph-analytics/cypher/` |
| 客户端迁移指南 1.x → 2.0 | `https://neo4j.com/docs/graph-data-science-client/current/migration-from-1x/` |
| AuraDB 教程 notebook | `https://github.com/neo4j/graph-data-science-client/blob/main/examples/graph-analytics-serverless.ipynb` |
| GDS 算法参考 | `https://neo4j.com/docs/graph-data-science/current/algorithms/` |

---

## 核对清单
- [ ] Aura API 凭据已创建并设置到环境中（`AURA_CLIENT_ID`、`AURA_CLIENT_SECRET`）
- [ ] 连接会话：为 `DbmsConnectionInfo.from_env()` 设置 `AURA_INSTANCEID` 或 `NEO4J_URI`，以及 `NEO4J_USERNAME`、`NEO4J_PASSWORD`
- [ ] Aura 项目已启用 AGA 功能（Aura Console → 项目设置）
- [ ] 会话创建前已估算内存（`sessions.estimate(..., algorithms=[...])`）
- [ ] 云位置选择靠近数据源
- [ ] 会话创建后已调用 `gds.verify_connectivity()`
- [ ] 远程投影使用 `gds.graph.project.cypher(graph_name, query)`，且查询内使用 `gds.graph.project.remote(...)`
- [ ] 远程投影的图名称传给端点，而不是传给远程函数
- [ ] `undirected_relationship_types` 作为方法参数传入，绝不放在查询内
- [ ] AuraDB Cypher API 投影使用第五个配置映射传入 `memory` 或 `sessionId`
- [ ] 显式 Cypher API 会话使用 `gds.session.getOrCreate(...)`；隐式会话随投影图一起删除
- [ ] 设置 TTL 以避免空闲会话产生意外费用
- [ ] 异步算法任务轮询至 `RUNNING_DONE` 后再读取结果
- [ ] 结果在删除前已回写（连接模式）或流式获取并持久化（独立模式）
- [ ] 完成后删除会话（`sessions.delete(session_name=...)` 或 `gds.delete()`）
