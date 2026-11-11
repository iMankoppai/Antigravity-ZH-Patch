---
name: neo4j-modeling-skill
description: 设计、审查并重构 Neo4j 图数据模型。适用于在节点标签、关系类型与属性之间做选择，将关系型/文档型 schema 迁移到图，检测反模式（泛化标签、超级节点、缺失约束），为 n 元关系设计中间节点，用约束和索引强制 schema，或依据图建模最佳实践评估现有模型。不处理 Cypher 查询编写 —— 请使用 neo4j-cypher-skill。不处理 Spring Data Neo4j 实体映射 —— 请使用 neo4j-spring-data-skill。不处理 GraphQL 类型定义 —— 请使用 neo4j-graphql-skill。不处理数据导入 —— 请使用 neo4j-import-skill。
version: 1.0.8
allowed-tools: WebFetch Bash
---

## 何时使用

- 从零设计图模型（领域 → 节点、关系、属性）
- 审查现有模型是否存在反模式
- 在节点、属性、关系与标签之间做决策
- 将关系型或文档型 schema 迁移到图
- 为 n 元或复杂关系设计中间节点
- 检测并缓解超级节点/高扇出问题
- 为模型选择并创建约束 + 索引

## 何时不使用

- **编写或优化 Cypher** → `neo4j-cypher-skill`
- **Spring Data Neo4j（@Node、@Relationship）** → `neo4j-spring-data-skill`
- **GraphQL 类型定义** → `neo4j-graphql-skill`
- **导入数据（LOAD CSV、APOC import）** → `neo4j-import-skill`

---

## 设计之前先检查

在现有数据库上，先运行 —— 绝不在不了解当前状态的情况下提出变更：

```cypher
CALL db.schema.visualization() YIELD nodes, relationships RETURN nodes, relationships;
SHOW CONSTRAINTS YIELD name, type, labelsOrTypes, properties RETURN name, type, labelsOrTypes, properties;
SHOW INDEXES YIELD name, type, labelsOrTypes, state WHERE state = 'ONLINE' RETURN name, type, labelsOrTypes;
```

如果 APOC 可用：
```cypher
CALL apoc.meta.schema() YIELD value RETURN value;
```

MCP 工具映射：

| 操作 | 工具 |
|---|---|
| 检查 schema | `get-schema` |
| `SHOW CONSTRAINTS`、`SHOW INDEXES` | `read-cypher` |
| `CREATE CONSTRAINT ... IF NOT EXISTS` | `write-cypher`（先展示并确认） |

---

## 默认规则 —— 适用于每个模型

1. 用例优先 —— 设计前先列出模型必须回答的 5+ 个查询
2. 节点 = 具有身份的实体（名词）；关系 = 有方向的连接（动词）
3. 标签用 PascalCase；关系类型用 SCREAMING_SNAKE_CASE；属性用 camelCase
4. 每个用于 MERGE 的节点类型都要在其键属性上有唯一性约束
5. 在已知类型时添加属性类型约束（`REQUIRE n.prop IS :: STRING`）—— 及早捕获错误写入。**仅企业版**；社区版：使用唯一性约束，在应用层校验类型
6. 不使用泛化标签（`:Entity`、`:Node`、`:Thing`）；不使用泛化关系类型（`:RELATED_TO`、`:HAS`）
7. 安全标签（用于行级访问控制）应使用公共前缀（例如 `Sec`），以便应用代码能可靠地将它们从领域 schema 中过滤掉
8. 关系方向承载语义 —— 而非随意指定
9. 在现有数据库上提出任何变更前先检查 schema
10. 所有约束/索引 DDL 都使用 `IF NOT EXISTS` —— 可安全重复运行
11. **在 Neo4j 2026.06+（企业版/Aura，GA）上：** 用一个块 `ALTER CURRENT GRAPH TYPE SET { … }` 声明完整模型，用 `ALTER CURRENT GRAPH TYPE ADD { … }` 扩展它，而不是逐条 `CREATE CONSTRAINT` 语句 —— 详见 `neo4j-cypher-skill`（GRAPH TYPE 参考）。社区版不可用（`ALTER CURRENT GRAPH TYPE SET` → "not supported in community edition"）：使用单条约束。在 2026.02–2026.05 上该语法为预览。

---

## 关键模式

### 节点 vs 关系 vs 属性 —— 决策表

| 问题 | 回答 | 建模为 |
|---|---|---|
| 它是否是一个具有身份、作为入口点被查询的事物？ | 是 | 节点 |
| 它是两个事物之间带方向的连接吗？ | 是 | 关系 |
| 该连接是否有自己的属性或有多个目标？ | 是 | 中间节点 |
| 它是否是一个始终随父级返回、从不单独过滤的标量？ | 是 | 父级上的属性 |
| 它是否是用于基于类型过滤或路径遍历的类别？ | 是 | 标签（而非属性） |
| 同一属性值是否在许多节点间重复（低基数）？ | 是 | 标签，而非属性节点 |
| 它是否是连接 >2 个实体的事实？ | 是 | 中间节点 |

### 属性 vs 标签 —— 决策表

| 使用标签的场景 | 使用属性的场景 |
|---|---|
| 值少、固定、用作遍历过滤（`WHERE n:Active`） | 值多、动态，或每个节点唯一 |
| 按类型遍历（`MATCH (n:VIPCustomer)`） | 按值过滤（`WHERE n.tier = 'vip'`） |
| 类别驱动索引选择 | 细粒度值驱动范围扫描 |
| 示例：`:Active`、`:Verified`、`:Premium` | 示例：`status`、`score`、`email` |

规则：添加标签很廉价；扫描所有 `:Label` 节点很快。绝不要将高基数值建模为标签。

像 `status` 这样的低基数状态：如果它是用于遍历/过滤的稳定类别，用标签（`:Active`）；如果经常变化或只随节点返回，用属性。绝不用 `(:Status)` 节点。

---

### 中间节点模式

当关系需要自己的属性、连接 >2 个实体，或可被独立查询时使用。

**之前（带属性的关系 —— 受限）：**
```
(Person)-[:ACTED_IN {role: "Neo"}]->(Movie)
// Cannot query roles independent of movies
```

**之后（中间节点 —— 可查询、可扩展）：**
```
(Person)-[:PLAYED]->(Role {name: "Neo"})-[:IN]->(Movie)
// MATCH (r:Role) WHERE r.name STARTS WITH 'Neo' RETURN r
```

**任职重叠示例：**
```cypher
// Find colleagues who overlapped at same company
MATCH (p1:Person)-[:WORKED_AT]->(e1:Employment)-[:AT]->(c:Company)<-[:AT]-(e2:Employment)<-[:WORKED_AT]-(p2:Person)
WHERE elementId(p1) < elementId(p2)
  AND e1.startDate <= coalesce(e2.endDate, date())
  AND e2.startDate <= coalesce(e1.endDate, date())
RETURN DISTINCT p1.name, p2.name, c.name
```

在以下情况将关系提升为中间节点：
- 关系有 >2 个属性
- 关系是另一个查询的对象
- 多个实体共享同一连接上下文
- 你需要在一条事实中连接 >2 个实体

---

### 关系型 → 图 迁移表

| 关系型构造 | 图等价物 | 说明 |
|---|---|---|
| 表行 | 节点 | 每张表一个标签（按需添加更多） |
| 列（标量） | 节点属性 | |
| 主键 | 唯一性约束属性 | 优先使用 `tmdbId`/`personId` 而非裸 `id` |
| 外键 | 关系 | 方向：从依赖方 → 被引用方 |
| 多对多连接表 | 中间节点 | 尤其当连接表有自己的列时 |
| 连接表（无自己的列） | 直接关系 | 更简单；之后可升级为中间节点 |
| NULL FK（可选关系） | 不存在的关系 | 不创建节点；缺席即为信号 |
| 多态 FK（Rails 风格） | 多个标签或关系类型 | 拆分为类型特定的关系 |
| 自引用 FK | 同标签关系 | `:Employee {managerId}` → `(e)-[:REPORTS_TO]->(m)` |
| 审计/历史列 | 中间版本化节点 | 版本化模式见参考资料 |

---

### 超级节点检测与缓解

**检测：**
```cypher
// Find top-10 highest-degree nodes
MATCH (n)
RETURN labels(n) AS labels, elementId(n) AS id, count{ (n)--() } AS degree
ORDER BY degree DESC LIMIT 10
```

度数远高于其标签中位数的节点 = 超级节点候选。任何关系数 >100K 的节点都会降低经过它的遍历查询性能。

**原因：**
- 领域超级节点：机场、名人、热门话题标签 —— 不可避免
- 建模超级节点：把性别、国家、状态建模为拥有数百万条边的节点 —— 可避免

**缓解策略（按优先级）：**

| 策略 | 使用时机 | 实现 |
|---|---|---|
| **查询方向** | 存在方向不对称 | 从低度数一侧查询；利用方向 |
| **关系类型拆分** | 超级节点承担多种角色 | 用 `:FOLLOWS` + `:FAN` 替代单一 `:RELATED_TO` |
| **标签隔离** | 超级节点混淆了实体类型 | `:Celebrity` vs `:User` → 只查询相关子类型 |
| **分桶模式** | 时间序列或高容量事件节点 | 见下文 |
| **避免建模** | 低基数类别 | 用标签而非节点（`:Active` 而非 `(:Status {name:"Active"})`） |
| **连接提示** | 查询调优的最后手段 | 在 Cypher 中使用 `USING JOIN ON n` |

**分桶模式（时间序列 / 高容量）：**
```cypher
// Instead of: (:User)-[:VIEWED]->(:Page) (millions of rels per user)
// Bucket by hour:
(u:User)-[:VIEWED_IN]->(b:ViewBucket {userId: u.id, hour: '2025-04-28T14'})-[:VIEWED]->(p:Page)

// Query last hour's views without traversing full history:
MATCH (u:User {id: $uid})-[:VIEWED_IN]->(b:ViewBucket {hour: $hour})-[:VIEWED]->(p)
RETURN p.url
```

---

### 命名约定

| 元素 | 约定 | 好 | 差 |
|---|---|---|---|
| 节点标签 | PascalCase，单数名词 | `:Person`、`:BlogPost` | `:person`、`:blog_posts`、`:Entity` |
| 关系类型 | SCREAMING_SNAKE_CASE，动词短语 | `:ACTED_IN`、`:WORKS_FOR` | `:actedin`、`:relatedTo`、`:HAS` |
| 属性键 | camelCase | `firstName`、`createdAt` | `FirstName`、`first_name` |
| 约束名 | snake_case 描述性 | `person_id_unique` | `constraint1` |
| 索引名 | snake_case 描述性 | `person_name_idx` | `index2` |

---

### Schema 强制 —— 为每种元素创建什么

用 `IF NOT EXISTS` 运行所有 DDL。在导入数据之前应用。

```cypher
// 1. Uniqueness constraint — every node type used in MERGE
CREATE CONSTRAINT person_id_unique IF NOT EXISTS
  FOR (p:Person) REQUIRE p.id IS UNIQUE;

// 2. Existence constraint (Enterprise) — mandatory properties
CREATE CONSTRAINT person_name_exists IF NOT EXISTS
  FOR (p:Person) REQUIRE p.name IS NOT NULL;

// 3. Property type constraint (Enterprise) — enforce data type
CREATE CONSTRAINT person_born_integer IF NOT EXISTS
  FOR (p:Person) REQUIRE p.born IS :: INTEGER;

// 4. Key constraint (Enterprise) — unique + exists in one
CREATE CONSTRAINT movie_tmdbid_key IF NOT EXISTS
  FOR (m:Movie) REQUIRE m.tmdbId IS NODE KEY;

// 4b. Community alternative to NODE KEY — composite uniqueness (existence not enforced)
CREATE CONSTRAINT movie_title_released_unique IF NOT EXISTS
  FOR (m:Movie) REQUIRE (m.title, m.released) IS UNIQUE;

// 5. Range index — equality and range filters on properties
CREATE INDEX person_name_idx IF NOT EXISTS
  FOR (p:Person) ON (p.name);

// 6. Fulltext index — ranked free-text search via `SEARCH ... FULLTEXT INDEX` [2026.09] (`db.index.fulltext.queryNodes` deprecated 2026.10) (Lucene syntax, wildcards like `An*`); not used for CONTAINS / STARTS WITH predicates
CREATE FULLTEXT INDEX person_fulltext IF NOT EXISTS
  FOR (n:Person) ON EACH [n.name, n.bio];

// 6b. Text index — serves CONTAINS / STARTS WITH / ENDS WITH (range index preferred for STARTS WITH when present)
CREATE TEXT INDEX person_bio_text IF NOT EXISTS
  FOR (n:Person) ON (n.bio);

// 7. Vector index — embedding similarity search
CREATE VECTOR INDEX chunk_embedding_idx IF NOT EXISTS
  FOR (c:Chunk) ON (c.embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine' } };

// 8. Relationship index — filter on rel properties
CREATE INDEX acted_in_year_idx IF NOT EXISTS
  FOR ()-[r:ACTED_IN]-() ON (r.year);
```

创建索引后，轮询直到 ONLINE：
```cypher
SHOW INDEXES YIELD name, state WHERE state <> 'ONLINE' RETURN name, state;
```
在 state = `ONLINE` 之前不要使用索引。

---

### Vector / Embedding 属性建模

对长文本优先使用专用的 `:Chunk` 节点；短文本的 embedding 可以放在实体上：

```
(:Document)-[:HAS_CHUNK]->(c:Chunk {text: "...", embedding: [...]})
```

规则：
- Chunk 节点：`text`（源文本）、`embedding`（浮点数组）、`chunkIndex`（int）
- 父文档：仅元数据（title、url、createdAt）
- 仅在 `c.embedding` 上建向量索引
- Chunk 大小 200–500 token、20% 重叠是生产默认值 [field]
- 分块的文档：不要把 embedding 放在 `:Document` 上 —— 会使节点过大，污染遍历

---

### 反模式表

| 反模式 | 问题 | 修复 |
|---|---|---|
| 泛化标签 `:Entity`、`:Node` | 无过滤收益；所有节点被扫描 | 使用领域标签 `:Person`、`:Product` |
| 泛化关系类型 `:RELATED_TO`、`:HAS` | 无法按关系类型过滤 | 使用语义类型 `:PURCHASED`、`:AUTHORED` |
| 将低基数值作为节点 | 超级节点（`:Status {name:"active"}` → 数百万条边） | 改用标签 `:Active` |
| 属性作为标签（`n.type = 'VIP'` + `:VIP` 标签同时存在） | 不一致、重复 | 二选一；若用于遍历则优先标签 |
| 将 embedding 存储在业务节点上 | 节点膨胀、遍历变慢 | 专用 `:Chunk` 节点 |
| MERGE 无唯一性约束 | 静默创建重复节点 | 在任何 MERGE 前添加约束 |
| 缺少关系方向含义 | 方向随意；模型混乱 | 方向 = 动作的语义流向 |
| 连接表被建模为裸属性 | 丢失历史与可扩展性 | 带自身属性的中间节点 |
| 用 `id` 作为属性名 | `id(n)` 是已弃用的 Cypher 函数（用 `elementId(n)`）；实践中裸 `id` 作为属性名没问题，但领域限定名（`personId`、`movieId`）更清晰，且可避免未来的歧义 | 在有助于可读性时优先使用 `personId`、`movieId`、`tmdbId` |
| 所有日期都以字符串表示 | 无范围查询；无时间运算符 | 使用 Neo4j `date()` 或 `datetime()` 类型 |

---

## 输出格式 —— Schema 评估

审查现有模型时：

```
## Schema Assessment

### Compliant
- [constraint / pattern that is correct]

### Issues Found
#### [Title] — Severity: ERROR / WARNING / INFO
- **Current**: what the model does
- **Problem**: why it is an issue
- **Fix**: specific Cypher DDL or model change

## Recommended Schema
### Node Labels
- :Label {key: TYPE, prop: TYPE, ...}  → constraints: [list]

### Relationships
- (:LabelA)-[:TYPE {prop: TYPE}]->(:LabelB)

### Constraints to Create
[CREATE CONSTRAINT ... statements]

### Indexes to Create
[CREATE INDEX ... statements]
```

严重性语义：

| 严重性 | 含义 | 动作 |
|---|---|---|
| `ERROR` | 模型正确性失败（可能产生重复、有数据丢失风险） | 停止；继续前修复 |
| `WARNING` | 性能或可扩展性风险 | 报告；继续前询问用户 |
| `INFO` | 风格或约定偏差 | 指出；继续 |

---

## 来源标签

- `[official]` —— Neo4j 文档中直接陈述
- `[derived]` —— 由文档化行为推导
- `[field]` —— 社区经验法则；视为默认但需验证

---

## 检查清单

- [ ] 建模前已定义用例（≥5 个查询）
- [ ] 在现有数据库上提出变更前已检查 schema
- [ ] 每个 MERGE 目标节点标签都有唯一性约束
- [ ] 无泛化标签（`:Entity`、`:Node`、`:Thing`）
- [ ] 无泛化关系类型（`:RELATED_TO`、`:HAS`、`:CONNECTED_TO`）
- [ ] 关系方向承载语义
- [ ] n 元或带属性的关系使用中间节点
- [ ] 高基数值作为属性存储，而非节点
- [ ] 低基数类别用作标签，而非属性节点
- [ ] embedding 放在专用 `:Chunk` 节点上，而非业务节点
- [ ] 已识别并缓解超级节点候选
- [ ] 所有 DDL 使用 `IF NOT EXISTS`
- [ ] 索引在使用前轮询至 ONLINE
- [ ] 评估输出遵循上述结构化格式
- [ ] 每条禁止项都配有具体修复

---

## 参考资料

按需加载：
- [Neo4j 数据建模指南](https://neo4j.com/docs/getting-started/data-modeling/guide-data-modeling/)
- [Neo4j 建模技巧](https://neo4j.com/docs/getting-started/data-modeling/modeling-tips/)
- [GraphAcademy：图数据建模基础](https://graphacademy.neo4j.com/courses/modeling-fundamentals/)
- [超级节点 —— 关于超级节点的一切（David Allen）](https://medium.com/neo4j/graph-modeling-all-about-super-nodes-d6ad7e11015b)
