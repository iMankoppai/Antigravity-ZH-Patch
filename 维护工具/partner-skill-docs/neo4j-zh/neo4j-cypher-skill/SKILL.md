---
name: neo4j-cypher-skill
description: 为 Neo4j 2025.x 和 2026.x 生成、优化并验证 Cypher 25 查询。
  在编写新 Cypher 查询、优化慢查询、图模式匹配、向量
  或全文搜索、子查询或批量写入时使用。涵盖 MATCH、MERGE、CREATE、WITH、RETURN、
  CALL、UNWIND、FOREACH、LOAD CSV、SEARCH、表达式、函数、索引和子查询。
  不处理驱动迁移或 API 变更——请使用 neo4j-migration-skill。
  不涵盖数据库管理或服务器运维——请使用 neo4j-cli-tools-skill。
compatibility: Neo4j >= 2025.01 (safe baseline); Cypher 25
version: 1.0.31
---

## 何时使用
- 编写、优化或调试 Cypher 查询
- 图模式匹配、QPE、可变长度路径
- 向量/全文搜索、子查询、批量写入、LOAD CSV

## 何时不使用
- **驱动迁移/API 变更** → `neo4j-migration-skill`
- **数据库管理**（用户、配置、备份）→ `neo4j-cli-tools-skill`
- **结合向量与全文或其他排序来源的混合搜索** → `neo4j-vector-index-skill`

GQL 合规说明：`LET`、`FINISH`、`FILTER` 和 `INSERT` 是有效的 Cypher 25 子句（通过 GQL 合规引入，主要在 Neo4j 2025.06）。在旧版本上，回退到 `WITH` /（省略 RETURN）/ `WHERE` / `CREATE`。`INSERT` 要求以 `&` 分隔的多标签，且不支持动态标签/类型。

---

## 预检

| ? | 已知 | 未知 |
|---|---|---|
| 项目中找到 `<db-name>-schema.json` | 直接使用——跳过在线检查 | — |
| Schema（来自上下文或在线 DB） | 直接使用 | 运行 Schema-First 协议 |
| Neo4j 版本 | 使用该版本功能 | 默认使用 2025.01 安全集 |
| 在执行（而非生成）？ | 使用 EXPLAIN + 写入闸门 | 声明查询未经验证 |

Schema 未知且无工具 → 在代码块外生成不可执行的草图：
```
(<SOURCE_LABEL> {<KEY>: $value})-[:<REL_TYPE>]->(<TARGET_LABEL>)
```
绝不要填入猜测的名称——看似真实的猜测会被盲目照抄。

---

## 默认值——应用于每个查询

1. `CYPHER 25`——第一个 token；在 `UNION` 之后或子查询内绝不要重复
2. Schema 优先——写之前先检查；若提示中已有 schema，则直接使用
3. 仅在受约束的键上 `MERGE`；关系 `MERGE` 仅在已绑定的端点上
4. 除非已绑定或后接 `WHERE n:$($label)`，否则禁止无标签的 `MATCH (n)`
5. 所有探索性读取默认 `LIMIT 25`；在高基数操作（可变长度遍历、扇出 MATCH、笛卡尔积）之前先 `WITH n LIMIT`
6. 注释：只用 `//`——`--` 是 SQL，无效
7. `REPEATABLE ELEMENTS` / `DIFFERENT RELATIONSHIPS` 放在 `MATCH` 之后，而不是模式末尾
8. `SHOW` 命令：`WHERE` 之前先 `YIELD`；可与通用 Cypher 子句（包括 `UNION`/`RETURN`）组合 [2026.05]——`SHOW DATABASES` 仍需要 system db（使用 `USE system`）。在 `system` db 上 `CALL`：先 `YIELD` 再 `WHERE` [2026.07]
9. 内联节点谓词 `(:Label WHERE p=x)`——仅在 `MATCH` 中有效
10. `WHERE` 不能跟在裸 `UNWIND` 之后——使用 `WITH x WHERE`
11. `(a)-[:R]-(b)`——无向会匹配两个方向，双重计数；除非方向未知，否则使用有向
12. `DETACH DELETE`——如果节点有关系，普通 `DELETE` 会抛错

---

## 风格

| 元素 | 约定 |
|---|---|
| 节点标签 | PascalCase `:Person` |
| 关系类型 | SCREAMING_SNAKE_CASE `:KNOWS` |
| 属性/变量 | camelCase `firstName` |
| 子句 | 大写 `MATCH` |
| 布尔/null | 小写 `true false null` |
| 字符串 | 单引号；仅当包含 `'` 时才用双引号 |

> Schema 即真理。示例中的 `:Person`、`:KNOWS`、`name` 仅作说明——请替换为 schema 中的真实名称。

---

## Schema-First 协议

**优先级顺序：**

1. 项目任意位置有 `<db-name>-schema.json` → 直接读取，说明文件名 + `schema_retrieved_at`，跳过在线检查。如果明显过时且 DB 可访问，可提议重新获取。完整规则：[references/schema-guardrail.md](references/schema-guardrail.md)。
   - **存在性**——标签/关系类型/属性必须在 schema 中；在询问前先尝试同义词解析
   - **属性类型**——先推理意图（例如 string 与 INTEGER 可能是 null 检查）；仅在不清楚时才询问
   - **关系方向**——方向错误 → 静默纠正并记录
   - **同义词映射**——无歧义 → 静默解析；有歧义 → 选最可能的并记录；无法解析则询问

   脚本：`generate_schema.py`（在线 DB + APOC）、`define_schema.py`（无 DB）、`import_neo4j_schema.py`（转换 `neo4j-graphrag-python`、`graph-schema-introspector`、`graph-schema-json-js-utils`、`mcp-neo4j-data-modeling`）。

2. 上下文中有 schema → 使用它，跳过检查。

3. Schema 缺失 → 运行：
```cypher
CALL db.schema.visualization() YIELD nodes, relationships RETURN nodes, relationships;
SHOW INDEXES YIELD name, type, labelsOrTypes, properties, state WHERE state = 'ONLINE';
SHOW CONSTRAINTS YIELD name, type, labelsOrTypes, properties;
SHOW PROCEDURES YIELD name RETURN split(name,'.')[0] AS namespace, count(*) AS procedures;
```

每个标签的属性类型——先检查 APOC：
```cypher
// If APOC available (preferred — use this):
CALL apoc.meta.schema() YIELD value RETURN value;

// No APOC AND database ≤ 100k nodes/rels only (expensive on large graphs):
CALL db.schema.nodeTypeProperties() YIELD nodeType, propertyName, propertyTypes, mandatory;
CALL db.schema.relTypeProperties() YIELD relType, propertyName, propertyTypes, mandatory;
```

在返回任何查询前验证：标签存在 · 关系类型+方向正确 · 属性存在于该标签 · 索引 ONLINE。

---

## 关键模式

### MERGE
```cypher
// MERGE on constrained key; set extras in ON CREATE/ON MATCH
CYPHER 25
MATCH (a:Person {id: $a}) MATCH (b:Person {id: $b})
MERGE (a)-[r:KNOWS]->(b)
  ON CREATE SET r.since = date()
  ON MATCH  SET r.lastSeen = date()
```
`SET n = {}` 替换所有属性。`SET n += {}` 合并（安全的局部更新）。更新时使用 `+=`。

### WITH 作用域
```cypher
CYPHER 25
MATCH (a:Person)-[:KNOWS]->(b:Person)
WITH a, count(*) AS friends   // b dropped here
WHERE friends > 5
RETURN a.name, friends ORDER BY friends DESC
```
未在 `WITH` 中列出的每个变量都会被丢弃。`WITH *` 携带所有变量向前。

### 子查询——速查表
```
EXISTS { (a)-[:R]->(b) }                           // boolean check
COUNT  { (a)-[:R]->(b) WHERE a.x > 0 }             // count
COLLECT { MATCH (a)-[:R]->(b) RETURN b.name }       // collect list (full MATCH+RETURN required)
CALL (p) { MATCH (p)-[:ACTED_IN]->(m) RETURN m }    // correlated subquery (explicit import)
OPTIONAL CALL (p) { ... }                           // nullable subquery
```
`CALL { WITH x ... }` 已废弃 → `CALL (x) { ... }`。`COLLECT {}` 恰好返回一列。

### CALL IN TRANSACTIONS（批量写入）
```cypher
CYPHER 25
LOAD CSV WITH HEADERS FROM 'file:///data.csv' AS row
CALL (row) {
  MERGE (p:Person {id: row.id}) SET p += row
} IN TRANSACTIONS OF 1000 ROWS ON ERROR CONTINUE REPORT STATUS AS s
```
输入流必须在子查询之外。仅自动提交——绝不要包裹在 `beginTransaction()` 中。`PERIODIC COMMIT` 已废弃。

`DISJOINT BY` [2026.06，Cypher 25] 用于 `IN CONCURRENT TRANSACTIONS`，通过将共享易锁资源的批次顺序调度来防止死锁——在导入关系时使用：
```cypher
CYPHER 25
LOAD CSV WITH HEADERS FROM 'file:///rels.csv' AS line
CALL (line) {
  MATCH (a:Movie {id: line.movieId}), (b:Person {id: line.personId})
  MERGE (b)-[:ACTED_IN]->(a)
} IN CONCURRENT TRANSACTIONS OF 1000 ROWS DISJOINT BY (line.movieId, line.personId)
```
`DISJOINT BY (expr,...)` 声明锁键（只能是外层查询变量）；`DISJOINT BY AUTO` 通过静态分析推断；`DISJOINT BY NONE` 禁用。覆盖 `dbms.cypher.transactions.default_subquery_batch_strategy`。`EXPLAIN`/`PROFILE` 会在 `TransactionForeach` 上的 `DISJOINT BY (...)` 中显示键。

### QPE 基础
```cypher
CYPHER 25
MATCH SHORTEST 1 (a:Person {name:'Alice'})(()-[:KNOWS]->()){1,}(b:Person {name:'Bob'})
RETURN b.name

// ACYCLIC [2026.03] — no repeated nodes within a path (prevents cycles)
CYPHER 25
MATCH p = ACYCLIC (start:Router {name: $from})-[:LINK]-+(end:Router {name: $to})
RETURN [n IN nodes(p) | n.name] AS route
ORDER BY length(p) LIMIT 5
```
量词放在分组外：`(pattern){N,M}`。分组以节点开头和结尾。`REPEATABLE ELEMENTS` 需要有界 `{m,n}`。`ACYCLIC` 意味着节点在路径内不能重复（强于默认的 `DIFFERENT RELATIONSHIPS`）。

匹配模式——加在 `MATCH` 之后：
- `DIFFERENT RELATIONSHIPS`（默认）——每条关系在每个路径中只遍历一次
- `REPEATABLE ELEMENTS` [2025.x]——节点/关系可重访；用于环状路线、权重优化路径、受限回溯；需要有界 `{m,n}`

### 条件 CALL 子查询 [2025.06]
```cypher
CYPHER 25
MATCH (move:Item {id: $id})
OPTIONAL MATCH (insertBefore:Item {id: $before})
OPTIONAL MATCH (insertAfter:Item  {id: $after})
CALL (move, insertBefore, insertAfter) {
  WHEN insertBefore IS NULL THEN {
    MATCH (last:Item) WHERE NOT (last)-[:NEXT]->() AND last <> move
    CREATE (last)-[:NEXT]->(move)
  }
  WHEN insertAfter IS NULL THEN {
    CREATE (move)-[:NEXT]->(insertBefore)
  }
  ELSE {
    CREATE (insertAfter)-[:NEXT]->(move)
    CREATE (move)-[:NEXT]->(insertBefore)
  }
}
```
使用 WHEN…THEN…ELSE 实现 if-else-if 写入逻辑；互斥（首个匹配生效）。2025.06 之前不可用。

### 动态关系类型 [2025.x]
```cypher
// Create/match/merge with dynamic rel type (must resolve to exactly one STRING)
CYPHER 25 CREATE (a:Node)-[:$($relType)]->(b:Node)
CYPHER 25 MATCH  (a:Node)-[:$($relType)]->(b:Node) RETURN a.name, b.name
```

### 字符串插值 [2026.08，Cypher 25]
```cypher
CYPHER 25
MATCH (p:Person {id: $id})
RETURN s"Hello, {p.name}, age {p.age}" AS greeting   // S"..." and s'...' equivalent
```
- 每个 `{expr}` 通过 `toString()` 转换
- 拒绝 `MAP`、`LIST`、`NODE`、`PATH`、`RELATIONSHIP`
- 用 `\{` 和 `\}` 转义字面花括号
- 插值字符串可以嵌套
- 绝不要把不受信任的值插值进传给 `apoc.cypher.run*()` 的 Cypher 文本；应改为传 `$parameters`

### UUID 类型 [2026.08，Cypher 25]
```cypher
CYPHER 25
CREATE (sess:Session {sessionId: uuid()});            // random UUID value

CYPHER 25
MATCH (sess:Session {sessionId: uuid($uuidString)})   // STRING 8-4-4-4-12 → UUID
RETURN toString(sess.sessionId) AS sessionId, uuid.mostSignificantBits(sess.sessionId) AS msb
```
`UUID` 属性需要 Neo4j 2026.08+。较旧的驱动可能返回占位 `MAP` 并给出警告 `03N95 Neo.ClientNotification.UnknownType`——确切支持情况请查看各驱动技能（`neo4j-driver-python-skill` 需要 >= 6.3）；否则继续使用 `randomUUID()` 字符串 id。

### 空间 / Point
```cypher
// WGS84 geographic point
SET n.coords = point({longitude: $lon, latitude: $lat})

// Distance in metres; requires POINT index for performance
MATCH (a:Place {name: $origin}) MATCH (b:Place)
RETURN b.name, point.distance(a.coords, b.coords) AS distM
ORDER BY distM LIMIT 10

// Bounding-box pre-filter (uses POINT index) then distance
MATCH (b:Place)
WHERE point.withinBBox(b.coords,
        point({longitude: $west, latitude: $south}),
        point({longitude: $east, latitude: $north}))
RETURN b.name, point.distance(b.coords, $origin) AS distM
```
创建 POINT 索引：`CREATE POINT INDEX name IF NOT EXISTS FOR (n:Place) ON (n.coords)`

### 聚合分组键
`RETURN`/`WITH` 中未聚合的表达式是隐式分组键——`GROUP BY` 可选：
```cypher
// actor + director are grouping keys; count(*) is the aggregate
MATCH (a:Person)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
RETURN a.name, d.name, count(*) AS collaborations
ORDER BY collaborations DESC
```
`WITH`/`RETURN` 上的显式 `GROUP BY` 子句 [2026.07，Cypher 25] 明确声明分组键——与 GQL 对齐的隐式分组替代方案；隐式分组仍有效：
```cypher
MATCH (a:Person)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
RETURN a.name, d.name, count(*) AS collaborations GROUP BY a.name, d.name
ORDER BY collaborations DESC
```
`GROUP BY ()` = 无分组键（一行）；`GROUP BY ALL` = 每个非聚合返回项都是键。未出现在投影中的分组键不会被返回。规则 → [references/cypher-syntax.md](references/cypher-syntax.md)。

`count(n)` 统计非 null；`count(*)` 统计行数（包括 null）。`collect(DISTINCT expr)` 去重。
`count()` 比 `size(collect())` 更快——count() 读取内部存储；collect() 会先构建列表。

`ORDER BY`/`WHERE` 子句中引用比变量或 `var.prop` 更复杂的投影项的表达式已废弃 [2026.07]——在投影中为该表达式起别名，并按别名排序。遮蔽传入变量的名称同理。当投影子句已聚合时，`ORDER BY`/`WHERE` 现在可以调用不在投影列表中的聚合函数。

---

## 常见语法陷阱（查询出错的首要原因）

| 错误 | 正确 |
|---|---|
| `ORDER BY n.prop AS x DESC` | `ORDER BY n.prop DESC` |
| 聚合 RETURN 后 `ORDER BY preAggVar` | 使用 RETURN 别名 |
| `count(r WHERE r.x=5)` | `sum(CASE WHEN r.x=5 THEN 1 ELSE 0 END)` |
| `UNWIND list AS x WHERE x>5` | `UNWIND list AS x WITH x WHERE x>5` |
| `least(a,b)` / `greatest(a,b)` | `CASE WHEN a<b THEN a ELSE b END` |
| `-- comment` | `// comment` |
| `shortestPath((a)-[*]->(b))`（仍有效） | 优先 `SHORTEST 1 (a)(()-[]->()){1,}(b)` |
| `id(n)` | `elementId(n)` |
| `[:REL*1..5]`（仍有效） | 优先 `(()-[:REL]->()){1,5}` |
| `CALL { WITH x ... }` | `CALL (x) { ... }` |
| `COLLECT { (a)-[:R]->(b) }` | `COLLECT { MATCH ... RETURN b }` |
| `SET n = {k:v}` 局部更新 | `SET n += {k:v}` |
| 带关系的 `DELETE n` | `DETACH DELETE n` |
| `WHERE n.x = null` | `WHERE n.x IS NULL` |
| `toInteger(null)` 抛错 | `toIntegerOrNull(null)` |
| `n.$key` 动态属性 | `n[$key]` |
| `SET n:$label` | `SET n:$($label)` |
| `ZONED DATETIME >= date(...)` → 0 行 | 使用 `datetime(...)` 或 `.year` 访问器 |
| 带 `Z` 后缀的 ISO 字符串按 UTC 存储/比较 | **`Z` ≠ Neo4j 中的 UTC**——`Z` 被解析为偏移量，而不是 UTC 时区；查询计划器和范围索引对它们的处理不同。显式强制转换：`datetime({datetime: datetime('2025-09-10T03:43:00Z'), timezone: 'UTC'})`（[neo4j#13519](https://github.com/neo4j/neo4j/issues/13519)） |
| `FOREACH ... RETURN` | `UNWIND ... RETURN` |

完整陷阱表 → [references/syntax-traps.md](references/syntax-traps.md)

---

## 输出模式与写入闸门

默认：参数化查询。**返回具名属性，而不是完整节点或 `RETURN *`。**
```cypher
// RIGHT: agent gets named fields it can reason over
CYPHER 25 MATCH (n:Organization {name: $name}) RETURN n.name, n.founded, n.industry LIMIT 10

// WRONG: full node object wastes tokens, leaks all properties, agent can't extract fields cleanly
CYPHER 25 MATCH (n:Organization {name: $name}) RETURN n LIMIT 10
```
例外：schema/诊断查询（`CALL db.schema.visualization()`、`SHOW INDEXES YIELD *`、`EXPLAIN`），其中对象本身就是重点。

**验证工作流：**
1. 任何写入前先 `EXPLAIN`——捕获语法错误、缺失索引
2. 新读取：先用 `LIMIT 1` 测试
3. 写入：先把读取部分验证为 `RETURN`，再替换为 `SET`/`CREATE`/`DELETE`
4. 用 `PROFILE` 测量 db hits；检查是否有 `AllNodesScan`、`CartesianProduct`、`Eager`

**Query API v2**（无需驱动——可用于 schema 检查、EXPLAIN、读取、写入）：
```bash
curl -X POST https://<instance>.databases.neo4j.io/db/<database>/query/v2 \
  -u <user>:<password> -H "Content-Type: application/json" \
  -d '{"statement": "EXPLAIN MATCH (n:Person {name: $name}) RETURN n", "parameters": {"name": "Alice"}}'
# Local: http://localhost:7474/db/<database>/query/v2
# Response: {"data": {"fields": [...], "values": [...]}}  — prefix EXPLAIN to plan without executing
```

**写入执行闸门**——仅当 agent 执行时（MCP/cypher-shell/HTTP），而不是为代码/脚本/用户生成时：
1. 运行 `EXPLAIN` → 报告预计受影响的行数
2. 等待用户确认后再执行

---

## 版本闸门

版本未知时默认使用 2025.01 安全功能。

| 功能 | 最低版本 | 回退方案 |
|---|---|---|
| `CYPHER 25`、QPE、`CALL (x) {}` | 2025.01 | 需要 2025+ |
| 匹配模式（`DIFFERENT RELATIONSHIPS`、`REPEATABLE ELEMENTS`） | 2025.01 | 需要 2025+ |
| 动态标签 `$($expr)`、`coll.sort()` | 2025.01 | APOC 或应用侧 |
| `CONCURRENT TRANSACTIONS`、`REPORT STATUS` | 2025.01 | 去掉 / 省略 |
| `SEARCH` 子句——`VECTOR INDEX` | 2026.01 | `CALL db.index.vector.queryNodes(...)`（2026.04 废弃） |
| `SEARCH` 子句——`FULLTEXT INDEX`（`WITH ANALYZER`、`SKIP`/`OFFSET`） | 2026.09 | `CALL db.index.fulltext.queryNodes(...)` / `queryRelationships(...)`（2026.10 废弃） |
| `ACYCLIC` 路径模式（路径中无重复节点） | 2026.03 | 用 `size(nodes(p)) = size(apoc.coll.toSet(nodes(p)))` 后置过滤 |
| `string.indexOf()`、`string.join()`、`string.regexReplace()` | 2026.05 | `apoc.text.*` 或应用侧 |
| GQL 别名：`FOR`=`UNWIND`、`PROPERTY_EXISTS`=`IS NOT NULL`、`IS [NOT] LABELED`=`n:Label`；函数别名（`local_time`、`zoned_datetime`、`duration_between`、`collect_list` 等） | 2026.02–04 | 仅 GQL 合规——使用 Cypher 等价物；完整列表 → [references/cypher-syntax.md](references/cypher-syntax.md) |
| **GRAPH TYPE** schema DDL（`ALTER CURRENT GRAPH TYPE SET/ADD/ALTER/DROP`、`SHOW CURRENT GRAPH TYPE`） | 2026.02（预览），**GA 2026.06** | 使用各自的 `CREATE CONSTRAINT` / `CREATE INDEX` |
| `WITH`/`RETURN` 上的 `GROUP BY` 子句（显式分组键，GQL 对齐） | 2026.07 | 隐式分组——在投影中列出非聚合表达式 |
| `cardinality()`——MAP 中的键、LIST 中的元素、PATH 中的节点+关系 | 2026.07 | LIST/MAP 键用 `size()`，PATH 用 `length()` |
| `ORDER BY`/`WHERE` 中的聚合函数（仅聚合投影）且不是投影项 | 2026.07 | 将聚合作为别名投影，然后按别名排序/过滤 |
| `system` 数据库上过程调用中 `YIELD` 之后的 `WHERE` | 2026.07 | `YIELD` + `RETURN`，在客户端过滤 |
| 字符串插值 `s"...{expr}..."` / `S"…"` | 2026.08 | 用 `toString()` 或 `string.join()` 的 `+` 拼接 |
| `UUID` 类型；`uuid()`、`uuid(name)`、`uuid(mostSigBits, leastSigBits)`、`uuid.mostSignificantBits()`、`uuid.leastSignificantBits()` | 2026.08 | `randomUUID()` STRING 属性 |
| `null / 0` 返回 `null` 而不是抛出除零错误 | 2026.08 | `CASE WHEN d = 0 THEN null ELSE n / d END` |
| Map 推导 `{k: v IN map \| keyExpr: valueExpr}` | 2026.09 | `apoc.map.fromPairs([k IN keys(m) \| [k, m[k]]])` |
| 对 `LIST`、`MAP`、`NODE`、`RELATIONSHIP`、`PATH` 使用 `toString()`、`toStringList()`、`toStringOrNull()` | 2026.09 | 逐个转换标量分量，然后 `string.join()` |
| Map 相加 `map1 + map2`（合并 map） | 2026.10（Aura 2026 年 10 月） | `apoc.map.merge(map1, map2)` |
| `db.schema.visualization(estimate => false)`——扫描数据，丢弃计数存储幽灵关系（较慢） | 2026.10 | 无参调用；用 `MATCH (a:A)-[:R]->(b:B) RETURN count(*) LIMIT 1` 验证关系组合 |

---

## 性能

EXPLAIN/PROFILE 危险信号：`AllNodesScan` `CartesianProduct` `NodeByLabelScan` `Eager`

修复 Eager——三种方法（选择能奏效的最简单方法）：
1. **为 MATCH 节点添加具体标签**以消除读/写歧义：
   在写入 `:City` 节点时用 `MATCH (x:CallingPoint)` 而不是裸 `MATCH (x)`
2. **先收集，再写入**：`WITH collect(u) AS users UNWIND users AS u ...`
3. **CALL IN TRANSACTIONS**：将每个批次隔离在各自的事务中

标签推断——当查询计划器低估多标签查询的选择性时：[Neo4j 5]
```cypher
CYPHER inferSchemaParts = most_selective_label
MATCH (admin:Administrator {name: $name}), (resource:Resource {name: $res})
MATCH p=(admin)-[:MEMBER_OF]->()-[:ALLOWED_INHERIT]->(company)
RETURN count(p)
```

索引锚点：每个针对属性的 MATCH/MERGE/WHERE 都需要在查找属性上有索引，否则 Neo4j 会扫描所有节点。**索引只有在节点有标签时才激活**——`MATCH (n {prop: $v})` 从不使用索引；`MATCH (n:Label {prop: $v})` 会使用。没有约束的 MERGE 没有原子性保证（两个并发 MERGE 可能创建重复）。`CONTAINS`/`ENDS WITH` → TEXT 索引（RANGE 不支持它们）。当 EXPLAIN 显示扫描时，用 `USING INDEX n:Label(prop)` 强制指定计划。
对嵌套数据使用链式 `OPTIONAL MATCH` → 替换为 `COLLECT { MATCH ... RETURN }`。
动态标签（`$($label)`）→ `AllNodesScan`+Filter；尽可能使用静态标签。

完整反模式 → [references/performance.md](references/performance.md)

---

## 失败恢复

- 0 结果：检查参数类型，逐个移除 WHERE 谓词，用 EXPLAIN 查看索引使用情况
- TypeError：使用 `toIntegerOrNull()`/`toFloatOrNull()`；用 `IS NOT NULL` 防护
- 变量超出作用域：未在 `WITH` 中列出 → 使用 `count(*)` 而不是 `count(droppedVar)`
- 超时：修复 AllNodesScan → 添加早期 `LIMIT` → `CALL IN TRANSACTIONS OF 1000 ROWS`
- 长时间查询进度 [2026.03]：`SHOW TRANSACTIONS YIELD currentQuery, status, currentQueryProgress`
- DateTime 不匹配：`ZONED DATETIME >= date(...)` → 0 行；使用 `datetime()` 或 `.year`
- `Z` 后缀 ≠ UTC 时区：带 `Z` 的 ISO 字符串按 UTC 偏移量存储，而不是 UTC 时区——跨 `Z` 与 `UTC` 存储值的范围查询会返回 0 行。写入时强制转换：`datetime({datetime: datetime($isoStr), timezone: 'UTC'})`
- Duration：`duration.between(d1,d2).days` = 天数*分量*（1 月 1 日 → 3 月 15 日：14），不是总天数。总天数：`duration.inDays(d1,d2).days`（73）；对 `inMonths`、`inSeconds` 同理。`.inDays` 不是 duration 值上的访问器
- `Cannot merge node using null property value`：MERGE 键解析为 null——先验证参数
- `IndexNotFoundError`：`SHOW INDEXES YIELD name, state WHERE state <> 'ONLINE'`

---

## 参考

按需加载：
- [references/indexes.md](references/indexes.md)——索引类型（RANGE/TEXT/FULLTEXT/POINT/COMPOSITE/LOOKUP）、约束、MERGE 锁语义、全文 Lucene 语法、导入预检
- [references/cypher-syntax.md](references/cypher-syntax.md)——完整语法参考：WITH、DELETE、ORDER BY、CASE、null、列表、字符串、日期、空间/point、LOAD CSV、子查询、QPE、动态标签、SEARCH（向量 [2026.01]、全文 [2026.09]）；条件 CALL（WHEN/THEN/ELSE）；标签模式表达式；allReduce；NEXT 子句；紧凑 CASE WHEN；normalize()；字符串插值；UUID 类型 + `uuid()` 函数 [2026.08]；map 推导 [2026.09]；索引/约束类型表；带引入版本注释的函数
- [references/syntax-traps.md](references/syntax-traps.md)——40+ 语法陷阱表
- [references/performance.md](references/performance.md)——反模式、text 与 fulltext 索引、Eager（3 种修复策略）、标签推断、批处理最佳实践、并行运行时
- [references/advanced-patterns.md](references/advanced-patterns.md)——REPEATABLE ELEMENTS 模式、allReduce 有状态遍历、多站点 QPE、路线规划模拟、DAG 关键路径、时序欺诈检测组件图、环检测、OPTIONAL CALL
- [references/apoc.md](references/apoc.md)——APOC Core：重构、虚拟图、合并辅助函数、路径扩展器、触发器、集合、条件执行
- [references/graph-type.md](references/graph-type.md)——GRAPH TYPE DDL（GA 2026.06）：`ALTER CURRENT GRAPH TYPE SET/ADD/ALTER/DROP`、`SHOW CURRENT GRAPH TYPE [AS GRAPH]`、元素类型语法、属性类型、约束、标签含义、关系类型强制、所需权限

## WebFetch

| 需求 | URL |
|---|---|
| 子句语义 | `https://neo4j.com/docs/cypher-manual/25/clauses/{clause}/` |
| 函数签名 | `https://neo4j.com/docs/cypher-manual/25/functions/{type}/` |
| QPE / 路径 | `https://neo4j.com/docs/cypher-manual/25/patterns/` |
| 空间/point 函数 | `https://neo4j.com/docs/cypher-manual/25/functions/spatial/` |
| 索引/约束参考 | `https://neo4j.com/docs/cypher-manual/25/indexes/` |
| 完整速查表 | `https://neo4j.com/docs/cypher-cheat-sheet/25/all/` |

---

## 核对清单
- [ ] Schema 已检查或在上下文中确认
- [ ] 每个顶层查询都带 `CYPHER 25` 前缀
- [ ] 使用 `$parameters`（而非字面量）
- [ ] 探索性读取带 `LIMIT`（默认 25）
- [ ] 已运行 `EXPLAIN`；危险信号已解决
- [ ] 写入部分在执行前已作为 `RETURN` 验证
- [ ] 如果 agent 正在执行（而非生成），已应用写入执行闸门
- [ ] `MERGE` 仅在受约束的键上
- [ ] 无无标签的 `MATCH (n)`
- [ ] Schema 操作不在显式事务内
