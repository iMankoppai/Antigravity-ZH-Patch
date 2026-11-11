---
name: neo4j-query-tuning-skill
description: 通过读取执行计划、识别不良算子（AllNodesScan、CartesianProduct、Eager、NodeByLabelScan）并给出修复方案
  （索引、提示、查询重写、运行时选择），诊断并修复运行缓慢的 Neo4j Cypher 查询。适用于查询缓慢、需要解读 EXPLAIN
  或 PROFILE 输出、dbHits 或 pageCacheHitRatio 表现不佳、基数估算与实际值偏差较大，或需要在 slotted/pipelined/parallel
  运行时之间做选择时。涵盖 USING INDEX / USING SCAN / USING JOIN 提示、db.stats.retrieve、SHOW QUERIES、
  SHOW TRANSACTIONS、TERMINATE TRANSACTION。
  不负责从零编写新 Cypher——请使用 neo4j-cypher-skill。
  不涵盖 GDS 算法调优——请使用 neo4j-gds-skill。
  不涵盖索引/约束创建语法细节——请使用 neo4j-cypher-skill 的 references/indexes.md。
allowed-tools: Bash WebFetch
version: 1.0.9
---

## 何时使用
- 查询耗时异常，需要做根因分析
- 已拿到 EXPLAIN/PROFILE 输出，需要解读
- 判断缺少或未被使用的是哪个索引
- 在 slotted / pipelined / parallel 运行时之间做决策
- 监控实时查询：SHOW QUERIES、SHOW TRANSACTIONS
- 基数估算有误（需要重新规划执行计划）

## 何时不使用
- **从零编写 Cypher** → `neo4j-cypher-skill`
- **GDS 算法性能** → `neo4j-gds-skill`
- **Schema 设计 / 数据建模** → `neo4j-modeling-skill`

---

## EXPLAIN 与 PROFILE 的对比

| | EXPLAIN | PROFILE |
|---|---|---|
| 是否执行查询？ | 否 | 是 |
| 是否返回数据？ | 否 | 是 |
| 是否显示 `rows`（实际值） | 否 | 是 |
| 是否显示 `dbHits`（实际值） | 否 | 是 |
| 是否显示 `estimatedRows` | 是 | 是 |
| 开销 | 零 | 完整查询开销 |

运行 `PROFILE` **两次**——第一次运行会预热页面缓存；第二次给出的指标才具有代表性。

```cypher
EXPLAIN MATCH (p:Person {email: $email}) RETURN p.name
PROFILE MATCH (p:Person {email: $email}) RETURN p.name
```

Query API 替代方式（无需驱动）：
```bash
curl -X POST https://<host>/db/<db>/query/v2 \
  -u <user>:<pass> -H "Content-Type: application/json" \
  -d '{"statement": "EXPLAIN MATCH (p:Person {email: $email}) RETURN p.name", "parameters": {"email": "a@b.com"}}'
```

---

## 关键计划指标

| 指标 | 良好表现 | 何时需排查 |
|---|---|---|
| `dbHits` | 低；添加索引后下降 | 相对 `rows` 偏高 |
| `rows` | 在计划早期就收缩 | 直到最后一个算子仍然很大 |
| `estimatedRows` | 接近 `rows` | 与实际值偏差 >10× |
| `pageCacheHitRatio` | >0.99 | <0.90（磁盘 I/O 瓶颈） |
| `pageCacheHits` | 高 | — |
| `pageCacheMisses` | 接近 0 | 持续上升（页面缓存过小） |

**自底向上**阅读计划——位于底部的叶子算子负责发起数据检索。

---

## 算子参考

| 算子 | 好/坏 | 含义 | 修复 |
|---|---|---|---|
| `NodeIndexSeek` | ✓ | 通过 RANGE/LOOKUP 索引进行精确匹配 | — |
| `NodeUniqueIndexSeek` | ✓ | 命中唯一约束索引 | — |
| `NodeIndexContainsScan` | ✓ | TEXT 索引的 CONTAINS / STARTS WITH | — |
| `NodeIndexScan` | ~ | 全索引扫描（无谓词） | 添加 WHERE 谓词或复合索引 |
| `NodeByLabelScan` | ✗ | 扫描该标签下的所有节点 | 在查找属性上添加 RANGE 索引 |
| `AllNodesScan` | ✗✗ | 扫描整个节点存储 | 为 MATCH 添加标签 + 索引 |
| `Expand(All)` | ~ | 从节点出发遍历关系 | 正常；用 LIMIT 或 WHERE 加以限制 |
| `Expand(Into)` | ~ | 在两个已匹配节点之间查找关系 | 端点已知的连接属正常 |
| `Filter` | ~ | 扫描之后应用谓词 | 将谓词移入带索引的 WHERE |
| `CartesianProduct` | ✗ | 两个 MATCH 之间无连接谓词 | 添加 WHERE 连接或在 MATCH 之间使用 WITH |
| `NodeHashJoin` | ~ | 基于节点 ID 的哈希连接 | 正常；规划器选择了哈希连接 |
| `ValueHashJoin` | ~ | 基于值的哈希连接 | 正常；输入较大时注意内存 |
| `EagerAggregation` | ~ | 完整聚合（ORDER BY、count(*)） | 对聚合属正常 |
| `Aggregation` | ✓ | 流式聚合 | — |
| `Eager` | ✗ | 读写冲突；物化所有行 | 见下方 Eager 修复策略 |
| `Sort` | ~ | 完整排序 — O(n log n) | 在 Sort 前加 `LIMIT`；将 LIMIT 前移 |
| `Top` | ✓ | 排序+限制合并 — O(n log k) | 优于 Sort+Limit |
| `Limit` | ✓ | 提前截断行 | 尽早前移 |
| `Skip` | ~ | 偏移分页 | 大图上使用键集分页 |
| `ProduceResults` | — | 最终输出算子 | 树的根节点 |
| `UndirectedRelationshipByIdSeekPipe` | ~ | 按关系 ID 查找 | 避免 `id(r)` — 使用 `elementId(r)` |

完整算子参考 → [references/plan-operators.md](references/plan-operators.md)

---

## 诊断工作流（Agent 运行手册）

### 步骤 1 — 基线计划
```cypher
EXPLAIN <query>
```
扫描输出，查找 `AllNodesScan`、`NodeByLabelScan`、`CartesianProduct`、`Eager`。

### 步骤 2 — 检查索引
```cypher
SHOW INDEXES YIELD name, type, labelsOrTypes, properties, state
WHERE state = 'ONLINE'
```
查明不良算子所涉及的标签/属性是否已有索引。

### 步骤 3 — 创建缺失的索引
```cypher
// RANGE index for equality/range predicates:
CREATE INDEX person_email IF NOT EXISTS FOR (n:Person) ON (n.email)
// TEXT index for CONTAINS/ENDS WITH:
CREATE TEXT INDEX person_bio IF NOT EXISTS FOR (n:Person) ON (n.bio)
// Composite for multi-property lookup:
CREATE INDEX order_status_date IF NOT EXISTS FOR (n:Order) ON (n.status, n.createdAt)
```
等待 `state = 'ONLINE'` 后再进行测量。

### 步骤 4 — 修复后执行 Profile
```cypher
PROFILE <query>
```
对比修复前后的 `dbHits` 和耗时毫秒。目标：由 `NodeIndexSeek` 取代扫描算子。

### 步骤 5 — 统计信息陈旧（若 estimatedRows 严重偏差）
```cypher
CALL db.prepareForReplanning()
// or resample a specific index:
CALL db.resampleIndex("person_email")
// or resample all outdated:
CALL db.resampleOutdatedIndexes()
```
配置：`dbms.cypher.statistics_divergence_threshold`（默认 `0.75` — 当统计变化超过 75% 时计划失效）。

---

## 修复常见的计划问题

### 缺少索引 → NodeByLabelScan / AllNodesScan
```cypher
// Force index hint when planner ignores it:
MATCH (p:Person {email: $email})
USING INDEX p:Person(email)
RETURN p.name
// Force label scan (sometimes faster for high selectivity):
MATCH (p:Person {email: $email})
USING SCAN p:Person
RETURN p.name
```

### 锚点错误 — 规划器选错了起始节点
重排 MATCH 或使用提示：
```cypher
// Force join at specific node:
MATCH (a:Author)-[:WROTE]->(b:Book)-[:IN_CATEGORY]->(c:Category {name: $cat})
USING JOIN ON b
RETURN a.name, b.title
```

### CartesianProduct — 两个未连接的 MATCH
```cypher
// Bad (Cartesian product):
MATCH (a:Author {id: $aid})
MATCH (b:Book  {id: $bid})
RETURN a.name, b.title

// Good (explicit join or WITH):
MATCH (a:Author {id: $aid})-[:WROTE]->(b:Book {id: $bid})
RETURN a.name, b.title
// Or: WITH between them to reset planning context
```

### Eager — 读写冲突
三种策略（选最简单的一种）：
1. **为 MATCH 节点添加具体标签**，让规划器区分读集与写集
2. **先收集再写入**：`WITH collect(n) AS nodes UNWIND nodes AS n SET n.x = 1`
3. **CALL IN TRANSACTIONS**：让每个批次在各自的事务中隔离执行
```cypher
CYPHER 25
MATCH (p:Person) WHERE p.score > 100
CALL (p) { SET p.tier = 'gold' } IN TRANSACTIONS OF 1000 ROWS
```

### 昂贵的 CONTAINS / ENDS WITH
```cypher
// Needs TEXT index (RANGE does NOT support these):
CREATE TEXT INDEX person_bio IF NOT EXISTS FOR (n:Person) ON (n.bio)
MATCH (p:Person) WHERE p.bio CONTAINS $keyword RETURN p.name
```

### 过度遍历 — 尽早前移 LIMIT
```cypher
// Bad: LIMIT after expensive join
MATCH (a:Author)-[:WROTE]->(b:Book)-[:REVIEWED_BY]->(r:Review)
RETURN a.name, b.title, r.text LIMIT 10

// Good: anchor limit before fan-out
MATCH (a:Author)-[:WROTE]->(b:Book)
WITH a, b LIMIT 10
MATCH (b)-[:REVIEWED_BY]->(r:Review)
RETURN a.name, b.title, r.text
```

---

## Cypher 运行时选择

| 运行时 | 选择方式 | 最适合 | 何时应避免 |
|---|---|---|---|
| `pipelined` | `CYPHER runtime=pipelined` | 默认 OLTP；流式、低内存 | 遇到不支持的算子会回退到 slotted |
| `slotted` | `CYPHER runtime=slotted` | 保证行为稳定；调试 | 性能关键的 OLTP |
| `parallel` | `CYPHER 25 runtime=parallel` | 大规模分析型扫描；聚合 | OLTP、写入、短查询、Aura Free |

大多数查询默认使用 pipelined。parallel 需要配置 `dbms.cypher.parallel.worker_limit`；在 Enterprise 和 2025+ 的 Aura Pro 上可用。

```cypher
// Force parallel for large aggregation:
CYPHER 25 runtime=parallel
MATCH (n:Transaction) WHERE n.amount > 1000
RETURN n.currency, count(*), sum(n.amount)
```

---

## 查询监控命令

```cypher
// Live queries + resource usage:
SHOW QUERIES YIELD query, queryId, elapsedTimeMillis, allocatedBytes, status, username

// Running transactions:
SHOW TRANSACTIONS YIELD transactionId, currentQuery, currentQueryProgress, elapsedTime, status, username, cpuTime, activeLockCount  // currentQueryProgress added [2026.03]

// Kill a specific transaction:
TERMINATE TRANSACTION $transactionId

// Kill a query:
TERMINATE QUERY $queryId

// Graph count stats (node/rel counts by label/type — feed into planner):
CALL db.stats.retrieve('GRAPH COUNTS') YIELD section, data RETURN section, data

// Token stats (label/property/rel-type IDs):
CALL db.stats.retrieve('TOKENS') YIELD section, data RETURN section, data
```

完整监控参考 → [references/stats-and-monitoring.md](references/stats-and-monitoring.md)

---

## 检查清单

- [ ] 先运行 `EXPLAIN` — 在不承担执行开销的情况下识别计划问题
- [ ] 检查是否有 `AllNodesScan` / `NodeByLabelScan` — 缺少索引
- [ ] 检查是否有 `CartesianProduct` — 缺少连接谓词
- [ ] 检查是否有 `Eager` — 读写冲突
- [ ] `SHOW INDEXES` — 确认相关索引存在且 `state = 'ONLINE'`
- [ ] 创建缺失的索引；等待其变为 ONLINE
- [ ] 运行 `PROFILE` 两次 — 第一次预热缓存，第二次才具代表性
- [ ] 对比修复前后的 `dbHits`
- [ ] 如果 `estimatedRows` 严重偏差 → `CALL db.prepareForReplanning()`
- [ ] 在高扇出操作之前前移 `LIMIT` / `WITH n LIMIT k`
- [ ] 对于 CONTAINS/ENDS WITH — 使用 TEXT 索引，而非 RANGE
- [ ] 对于大型分析查询 — 考虑 `runtime=parallel`
- [ ] 用 `TERMINATE TRANSACTION` 终止长时间运行的查询
