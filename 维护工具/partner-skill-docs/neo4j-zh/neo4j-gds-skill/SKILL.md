---
name: neo4j-gds-skill
description: Neo4j Graph Data Science (GDS) 嵌入式插件，通过 Python 客户端或 Cypher 使用——
  涵盖 graphdatascience 客户端 2.x、GraphDataScience、gds.graph.project.native、
  gds.graph.project.cypher、snake_case 端点、图目录操作、
  stream/stats/mutate/write 模式、内存估算、PageRank、Louvain、WCC、FastRP、KNN、
  Node Similarity、ML 流水线以及清理。适用于安装 GDS 插件的 Aura Pro、自管理、本地或
  离线 Neo4j DBMS。不涵盖 Aura Graph Analytics
  GDS Sessions、AuraGraphDataScience、GdsSessions、gds.graph.project.remote 或 AuraDB
  Cypher API 投影/会话管理——请使用 neo4j-aura-graph-analytics-skill。
  不处理 Cypher 编写——请使用 neo4j-cypher-skill。
  不涵盖驱动设置——请使用 neo4j-driver-python-skill 或其他驱动技能。
version: 1.0.22
allowed-tools: Bash WebFetch
---

## 何时使用
- 通过 Python 客户端（`graphdatascience`）对嵌入式 GDS 插件运行 GDS 算法
- 通过 `CALL gds.*` Cypher 过程运行 GDS 算法
- 已安装 GDS 插件的 Aura Pro、自管理 Neo4j、本地 Neo4j 或离线 DBMS
- 投影命名内存图，运行中心性/社区/相似性/路径/嵌入算法
- 通过 `mutate` 模式串联算法；构建 FastRP → KNN 流水线
- 为 Neo4j 向量索引/结构相似性搜索写入节点嵌入
- 大型图操作前进行内存估算

## 何时不使用
- **Aura Graph Analytics Sessions / AGA / `GdsSessions` / `AuraGraphDataScience`** → `neo4j-aura-graph-analytics-skill`
- **带 `{ memory: ... }` 或 `{ sessionId: ... }` 的 AuraDB Cypher API** → `neo4j-aura-graph-analytics-skill`
- **Cypher 查询编写** → `neo4j-cypher-skill`
- **驱动/连接设置** → `neo4j-driver-python-skill`
- **GraphRAG 检索** → `neo4j-graphrag-skill`
- **针对已写入嵌入创建/查询向量索引** → `neo4j-vector-index-skill`

| 场景 | 使用 |
|---|---|
| 安装 GDS 插件的 Aura Pro | 本技能 |
| 安装 GDS 插件的自管理/本地/离线 Neo4j | 本技能 |
| AuraDB 无服务器分析会话 | `neo4j-aura-graph-analytics-skill` |
| 接入 AGA 会话的自管理 Neo4j | `neo4j-aura-graph-analytics-skill` |
| 非 Neo4j 数据源 | `neo4j-aura-graph-analytics-skill` |

---

## 预检

仅在与嵌入式 GDS 插件配合使用时使用。

```python
from graphdatascience import GraphDataScience

gds = GraphDataScience("neo4j+s://xxx.databases.neo4j.io", auth=("neo4j", "pw"))   # AuraDS; aura_ds auto-derived
gds = GraphDataScience("bolt://localhost:7687", auth=("neo4j", "password"))
print(gds.server_version())
```

```cypher
RETURN gds.version() AS gds_version
```

GDS 插件不可用：客户端在构造时抛出 `GdsNotFound`；Cypher 抛出 `Unknown function 'gds.version'`。AuraDB 无服务器分析 → `neo4j-aura-graph-analytics-skill`。自管理/本地 → 安装或启用 GDS 插件。

```bash
pip install "graphdatascience>=2.3"          # 2.3 required for GDS 2026.10; 2.1 for 2026.09
pip install "graphdatascience[rust-ext]"     # optional: faster serialization
```

兼容性（[表格](https://neo4j.com/docs/graph-data-science-client/current/installation/)）：

| 客户端 | GDS 服务器 | Python | pyarrow |
|---|---|---|---|
| 2.3 | >= 2.13, < 2.28, < 2026.11 | >= 3.11, < 3.16 | >= 22, < 27 |
| 2.1 / 2.2 | >= 2.13, < 2.28, < 2026.10 | >= 3.10, < 3.15 | 21–25 |
| 2.0 | >= 2.13, < 2.28, < 2026.9 | >= 3.10, < 3.15 | 21–25 |

所有 2.x：Neo4j Python 驱动 >= 5.26 且 < 7.0，pandas 2–3。Python 3.10 + GDS 2026.10 → 无受支持客户端；请升级 Python 或改用 Cypher `CALL gds.*`。GDS 服务器 < 2.13 → 构造时产生 `DeprecationWarning`；此时固定 `graphdatascience<2`（客户端 1.22）。

### 客户端 1.x 回退方案（GDS 服务器 < 2.13）

| 2.0 | 1.x 客户端 |
|---|---|
| `gds.page_rank`、`gds.louvain`、……——无 `v2` 前缀 | `gds.v2.page_rank`、`gds.v2.louvain`、…… |
| `gds.graph.project.native(...)` | `gds.v2.graph.project(...)` |
| `gds.graph.project.cypher(query)` | `gds.graph.cypher.project(query, database=...)` |
| `Graph` / `Model` | `GraphV2` / `ModelV2` |
| `gds.graph.drop(...)` → `list[GraphInfo]` | `gds.v2.graph.drop(...)` → 单个 `GraphInfo` |
| `Graph.drop(fail_if_missing=)` | `Graph.drop(failIfMissing=)` |
| `run_cypher(...)`——始终重试 | `run_cypher(..., retryable=...)` |

迁移指南：[Neo4j GDS Python 客户端 2.0 迁移](https://neo4j.com/docs/graph-data-science-client/current/migration-from-1x/)

GDS 插件版本跟随服务器：`2026.09.0` 需要 Neo4j `2026.09`——在升级任何一侧之前请查阅 [GDS 兼容性表](https://neo4j.com/docs/graph-data-science/current/installation/supported-neo4j-versions/)。

GDS 插件 `2026.07.0` 移除了 `CALL gds.userLog()`——从驱动结果摘要通知或 Neo4j 调试日志中读取提示和警告；通过 `CALL gds.listProgress()` 跟踪任务进度。

2.0 客户端规则：
- 纯端点，无 `v2` 前缀——无类型的 1.x 端点和 `gds.v2.*` 已移除
- snake_case 参数：`page_rank`、`fast_rp`、`mutate_property`、`write_property`
- 类型化结果属性：`result.write_millis`，而非 `result["writeMillis"]`（`stream` 仍返回 DataFrame）
- 通过 `gds.server_version()` 获取服务器版本——无 `gds.version()` 客户端方法（Cypher `RETURN gds.version()` 仍然有效）
- 过程别名：`gds.betweenness` ≡ `gds.betweenness_centrality`；还有 `gds.closeness`、`gds.degree`、`gds.eigenvector`、`gds.harmonic`、`gds.kcore`
- 流水线：`gds.pipeline.node_classification` / `link_prediction` / `node_regression`——2.0 中仅有的 API
- `gds.run_cypher(query, auto_commit=True)` [2.1] 用于 `CALL { … } IN TRANSACTIONS`——2.0 默认的可重试事务会拒绝它；在 2.0 上直接使用 Neo4j 驱动
- `gds.db_driver()` [2.1] → 底层 `neo4j.Driver`，用于自定义会话/事务；仅当客户端创建它时才由 `gds.close()` 关闭
- 在 `QueryMode` 出现的任何地方均可接受 `mode="READ"` / `"WRITE"` 字符串 [2.1]
- 插件接口上无异步/作业句柄 API——`compute()`、`*_async`、`gds.jobs` 仅属于 AGA Sessions

---

## 图目录操作

### 原生投影

```cypher
CALL gds.graph.project(
  'myGraph',
  ['Person', 'City'],
  { KNOWS: { orientation: 'UNDIRECTED' }, LIVES_IN: {} }
)
YIELD graphName, nodeCount, relationshipCount
```

```python
G, result = gds.graph.project.native("myGraph", "Person", "KNOWS")
print(result.node_count, result.relationship_count)

G, result = gds.graph.project.native(
    "myGraph",
    {"Person": {"properties": ["age", "score"]}, "City": {}},
    {"KNOWS": {"orientation": "UNDIRECTED"}, "LIVES_IN": {"properties": ["since"]}},
    overwrite=True,   # drop same-named graph first
)
```

原生投影：仅限插件/简单 Python 客户端工作流。AGA Sessions → `neo4j-aura-graph-analytics-skill`。
1.x 回退：`gds.v2.graph.project(...)`。

### Cypher 投影（用于新的 Cypher 工作流、过滤器、转换）

```python
G, result = gds.graph.project.cypher(
    """
    MATCH (source:Person)-[r:KNOWS]->(target:Person)
    WHERE source.active = true
    RETURN gds.graph.project($graph_name, source, target,
        { sourceNodeProperties: source { .score }, relationshipType: 'KNOWS' })
    """,
    graph_name="activeGraph",
)
```

`gds.graph.project.cypher(query)` 不接受 `database=`——在构造时设置 `GraphDataScience(..., database=...)`，或在投影前调用 `gds.set_database(...)`。
查询必须以恰好一个 `RETURN gds.graph.project(...)` 结尾。若验证失败：使用 `gds.run_cypher(...)`，然后 `gds.graph.get("graphName")`。
1.x 回退：`gds.graph.cypher.project(query, database=...)`。

AGA Sessions → `neo4j-aura-graph-analytics-skill`；切勿使用插件 Cypher 投影。

### 无向投影

原生投影：按关系类型设置 `orientation: 'UNDIRECTED'`。
插件 Cypher 投影：在第五个 `gds.graph.project(...)` 配置参数中设置 `undirectedRelationshipTypes: ['*']`。

Leiden 同时适用于有向图和无向图。当社区结构本质上对称时，请投影无向关系。

### 检查与删除

```python
G.node_count()              # 12_043
G.relationship_count()      # 87_211
G.node_properties()         # projected + mutated properties by label
G.relationship_properties() # projected + mutated properties by type
G.size_in_bytes()
gds.graph.drop(G)           # frees JVM heap; returns list[GraphInfo]

G = gds.graph.get("myGraph")       # re-attach to existing projection

gds.graph.list()
```

### 内存估算——在大型投影和算法之前运行

```cypher
CALL gds.graph.project.estimate(['Person'], 'KNOWS')
YIELD requiredMemory, bytesMin, bytesMax, nodeCount, relationshipCount
```

```python
est = gds.graph.project.estimate(node_projection=["Person"], relationship_projection=["KNOWS"])
print(est.required_memory)

G, project_result = gds.graph.project.native("myGraph", "Person", "KNOWS")
print(project_result.node_count)

# Algorithm estimation:
est = gds.page_rank.estimate(G, damping_factor=0.85)
print(est.required_memory)
```

---

## 执行模式

| 模式 | 副作用 | 返回 | 使用时机 |
|---|---|---|---|
| `stream` | 无 | 每节点/每对一行 | 检查结果；取前 N 个 |
| `stats` | 无 | 单行聚合 | 摘要/收敛检查 |
| `mutate` | 仅向内存图添加节点属性或关系类型/属性 | 统计行 | 串联算法 |
| `write` | 将节点属性或关系持久化到 Neo4j 数据库 | 统计行 | 最后一步——使其可查询 |

模式：`stream` 验证 → `mutate` 串联 → `write` 持久化。

`mutate_property` 不能已存在于内存图中。关系类算法（如 KNN）还需要 `mutate_relationship_type`。
在 `write` 之后，重新投影以便在后续 GDS 调用中使用已写入的属性（内存图看不到数据库写入）。

---

## gds.util.asNode()——丰富流式结果

`stream` 模式产出 `nodeId`（GDS 内部整数）。`gds.util.asNode(nodeId)` 将其转换回数据库节点，以便访问属性。

```cypher
// Single property
CALL gds.pageRank.stream('myGraph', {})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC LIMIT 10

// Multiple properties — convert once with WITH
CALL gds.pageRank.stream('myGraph', {})
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS node, score
RETURN node.name AS name, node.born AS born, score
ORDER BY score DESC LIMIT 10
```

`write`、`mutate` 或 `stats` 模式不需要它——这些模式不返回逐节点数据。

---

## 核心算法

### PageRank（中心性）

```cypher
CALL gds.pageRank.stream('myGraph', { dampingFactor: 0.85, maxIterations: 20 })
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score ORDER BY score DESC LIMIT 10
// score: relative influence — not absolute. Compare within same run only.
// didConverge: true means score stabilized; if false, increase maxIterations.

CALL gds.pageRank.write('myGraph', { writeProperty: 'pagerank', dampingFactor: 0.85 })
YIELD nodePropertiesWritten, ranIterations, didConverge
```

```python
pr_df = gds.page_rank.stream(G, damping_factor=0.85)
mutate_result = gds.page_rank.mutate(G, mutate_property="pagerank", damping_factor=0.85)
write_result = gds.page_rank.write(G, write_property="pagerank", damping_factor=0.85)
print(write_result.write_millis)
```

### Louvain（社区发现）

```cypher
CALL gds.louvain.stream('myGraph', { relationshipWeightProperty: 'weight' })
YIELD nodeId, communityId

CALL gds.louvain.write('myGraph', { writeProperty: 'community' })
YIELD communityCount, modularity
```

```python
louvain_df = gds.louvain.stream(G)
write_result = gds.louvain.write(G, write_property="community")
print(write_result.community_count)
```

Leiden 是 Louvain 的改进版，可避免连接不良的社区——当社区质量优先于原始速度时使用。
stats 结果中的 `modularity`：范围 -0.5 到 1.0。[field] 大于 0.3 的值通常表明有意义的社区结构；大于 0.7 则为强社区结构。
Leiden 同时适用于有向图和无向图。当社区结构本质上对称时，请投影无向关系。

### WCC——弱连通分量

先运行 WCC 以理解图结构；在对大型图运行昂贵算法前，先对不连通图进行分区。

```cypher
CALL gds.wcc.stream('myGraph', { minComponentSize: 10 })
YIELD nodeId, componentId

CALL gds.wcc.write('myGraph', { writeProperty: 'componentId' })
YIELD nodePropertiesWritten, componentCount
```

```python
wcc_df = gds.wcc.stream(G)
write_result = gds.wcc.write(G, write_property="componentId")
print(write_result.node_properties_written)
```

### 介数中心性

```python
gds.betweenness.stream(G)          # alias of betweenness_centrality; identifies bottleneck/bridge nodes
gds.betweenness.write(G, write_property="betweenness")
```

### 节点相似性

基于共同邻居的 Jaccard 相似性——无需节点属性。

```python
gds.node_similarity.stream(G, similarity_cutoff=0.1, top_k=10)
gds.node_similarity.write(G, write_relationship_type="SIMILAR", write_property="score",
                          similarity_cutoff=0.1, top_k=10)
```

### FastRP（节点嵌入）

快速、可扩展，适用于生产 ML 流水线。设置 `randomSeed` 以保证可复现性。

```cypher
CALL gds.fastRP.mutate('myGraph', {
  embeddingDimension: 256,
  iterationWeights: [0.0, 1.0, 1.0],
  featureProperties: ['score'],
  propertyRatio: 0.5,
  normalizationStrength: -0.5,
  randomSeed: 42,
  mutateProperty: 'embedding'
})
YIELD nodePropertiesWritten
```

```python
gds.fast_rp.mutate(G, embedding_dimension=256, iteration_weights=[0.0, 1.0, 1.0],
                   random_seed=42, mutate_property="embedding")
write_result = gds.fast_rp.write(G, embedding_dimension=256, write_property="embedding",
                                 random_seed=42)
print(write_result.write_millis)
```

若要对结构嵌入进行 ANN 搜索，在 `write` 之后，针对已写入的属性创建 Neo4j 向量索引。使用 `neo4j-vector-index-skill`。

### KNN——K 近邻

基于节点属性（通常是嵌入）为每个节点找出 k 个最相似的节点。

```cypher
CALL gds.knn.stream('myGraph', {
  nodeProperties: ['embedding'], topK: 10,
  sampleRate: 0.5, similarityCutoff: 0.7
})
YIELD node1, node2, similarity

CALL gds.knn.write('myGraph', {
  nodeProperties: ['embedding'], topK: 10,
  writeRelationshipType: 'SIMILAR', writeProperty: 'score'
})
YIELD relationshipsWritten
```

```python
knn_df = gds.knn.stream(G, node_properties=["embedding"], top_k=10)
gds.knn.write(G, node_properties=["embedding"], top_k=10,
              write_relationship_type="SIMILAR", write_property="score")
```

---

## FastRP → KNN 流水线（推荐）

```python
# 1. Project
G, _ = gds.graph.project.native("myGraph", "Product",
    {"BOUGHT_TOGETHER": {"orientation": "UNDIRECTED"}})

# 2. Estimate memory
print(gds.fast_rp.estimate(G, embedding_dimension=128).required_memory)

# 3. Embed
gds.fast_rp.mutate(G, embedding_dimension=128, random_seed=42, mutate_property="emb")

# 4. Similarity
gds.knn.write(G, node_properties=["emb"], top_k=10,
              write_relationship_type="SIMILAR", write_property="score")

# 5. Cleanup
gds.graph.drop(G)
```

---

## 算法选择

| 目标 | 算法 |
|---|---|
| 通过网络链接衡量影响力 | PageRank / ArticleRank |
| 瓶颈/桥接节点 | 介数中心性 |
| 直接连接 | 度中心性 |
| 社区（通用、快速） | Louvain |
| 社区（更高质量） | Leiden |
| 图是否连通？ | WCC（先运行） |
| 基于嵌入的相似性 | KNN |
| 基于邻居的相似性 | 节点相似性 |
| 最短路径（正权重） | Dijkstra / A* |
| k 条替代路径 | Yen's |
| 快速可扩展嵌入 | FastRP |
| 特征丰富的节点 | GraphSAGE（客户端：`gds.graph_sage`；Cypher：`gds.beta.graphSage`） |

完整算法目录 → [references/algorithms.md](references/algorithms.md)

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `Unknown function 'gds.version'` | 嵌入式 GDS 插件不可用 | AGA → `neo4j-aura-graph-analytics-skill`；自管理/本地 → 安装插件 |
| 客户端构造时 `GdsNotFound` | 目标数据库未安装 GDS 插件 | 安装/启用 GDS 插件；AuraDS 端点仅在具备 GDS 时可用 |
| `AttributeError: ... no attribute 'version'` | 客户端 2.0 中不存在 `gds.version()` | 使用 `gds.server_version()` |
| 客户端构造时 `DeprecationWarning` | GDS 服务器 < 2.13 | 升级 GDS 服务器，或固定 `graphdatascience<2` 并使用 1.x 映射表 |
| `Insufficient heap memory` / OOM | 图对于可用 JVM 堆过大 | 运行 `gds.graph.project.estimate`；增大 `server.memory.heap.max_size` |
| `Procedure not found: gds.leiden` | GDS 较旧或不兼容 | 通过 `CALL gds.list()` 查看可用过程；升级 GDS 或改用 Louvain |
| mutate 后 `Node property 'X' not found` | 属性未投影或图名错误 | 验证 `G.node_properties()` 包含该属性；检查 `mutate_property` 拼写 |
| `Graph 'myGraph' already exists` | 失败运行遗留的投影 | `overwrite=True`、`CALL gds.graph.drop('myGraph')` 或 `gds.graph.drop(G)` |
| `mutate_property already exists` | 在同一投影上重复运行算法 | 删除并重新投影，或使用不同的 `mutate_property` 名称 |
| `No algorithm results` | 源/目标节点不在投影中 | 验证节点标签/关系类型与投影匹配；检查 `G.node_count()` |
| `gds.graph.drop(...)` 后 `AttributeError: 'list' object ...` | 2.0 返回 `list[GraphInfo]` | 对结果取索引；1.x 客户端返回单个 `GraphInfo` |
| `run_cypher` 抛出 `A query with 'CALL { ... } IN TRANSACTIONS' can only be executed in an implicit transaction` | 2.0 在可重试的受管事务中运行每个查询 | `graphdatascience>=2.1` + `run_cypher(query, auto_commit=True)` |

---

## 完整工作流

1. 使用 `GraphDataScience(...)` 创建 `gds`。
2. 验证插件：`gds.server_version()` 或 `RETURN gds.version()`。
3. 估算内存：`gds.graph.project.estimate(...)` 和算法 `.estimate(...)`。
4. 使用 `gds.graph.project.native(...)` 或 `gds.graph.project.cypher(query)` 投影命名图。
5. 先运行 `gds.*.stream`；切换到 `mutate`；仅在满意后再使用 `write`。
6. 使用 `gds.graph.drop(G)` 删除图。
7. GDS 服务器 < 2.13 → 通过上方的映射表使用客户端 1.22。

内置测试数据集：`gds.graph.datasets.load_cora()`、`gds.graph.datasets.load_karate_club()`、`gds.graph.datasets.load_imdb()`

---

## MCP 工具映射

| 操作 | MCP 工具 |
|---|---|
| `RETURN gds.version()` | `read-cypher` |
| `gds.pageRank.stream(...)` | `read-cypher` |
| `gds.pageRank.write(...)` | `write-cypher` |
| `gds.graph.drop(...)` | `write-cypher` |
| 列出可用过程 | `read-cypher` → `CALL gds.list()` |

在执行任何 `write-cypher` 之前：展示确切的 Cypher、预计受影响的节点/关系，并请求确认。对于算法的 `write` 模式，在可用时先估算或运行 `stats`。

---

## 参考资料

- [references/algorithms.md](references/algorithms.md)——完整算法目录：所有过程、参数、层级、Cypher + Python 示例
- [references/graph-projection.md](references/graph-projection.md)——投影深入剖析：过滤、异构图、关系方向、属性类型
- [GDS 手册](https://neo4j.com/docs/graph-data-science/current/)
- [Python 客户端文档](https://neo4j.com/docs/graph-data-science-client/current/)

---

## 检查清单
- [ ] 已通过 `gds.server_version()` 或 `RETURN gds.version()` 确认嵌入式 GDS 插件
- [ ] 大型工作前已估算图/算法内存
- [ ] Python 示例使用 2.0 端点（无 `v2` 前缀）、snake_case 参数、类型化结果属性
- [ ] 客户端 1.x 仅与 GDS 服务器 < 2.13 配合使用，且根据映射表
- [ ] 投影使用原生或插件 Cypher 投影；不使用 `gds.graph.project.remote(...)`
- [ ] 使用后删除命名图（`gds.graph.drop(G)`；1.x：`gds.v2.graph.drop(G)`）
- [ ] 已选择执行模式：`stream`（检查）→ `mutate`（串联）→ `write`（持久化）
- [ ] 已检查 `write_property`/`mutate_property` 与现有属性冲突
- [ ] 重新投影已存在的图名时使用 `overwrite=True`
- [ ] 为可复现的嵌入设置 `randomSeed`
- [ ] 对可能不连通的图先运行 WCC
