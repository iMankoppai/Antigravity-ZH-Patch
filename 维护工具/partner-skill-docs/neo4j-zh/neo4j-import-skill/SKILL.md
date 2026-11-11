---
name: neo4j-import-skill
description: 将结构化数据导入 Neo4j——LOAD CSV、CALL IN TRANSACTIONS、neo4j-admin
  database import full（离线批量）、apoc.load.csv/json、apoc.periodic.iterate、驱动
  批量写入。涵盖方法选择、头文件格式、类型转换、null 处理、
  ON ERROR 模式、CONCURRENT TRANSACTIONS、导入前约束设置以及导入后
  验证。适用于导入 CSV/JSON/Parquet 文件、将关系型数据迁移为图、
  或批量加载大型数据集。不处理非结构化文档/PDF/向量分块
  流水线——请使用 neo4j-document-import-skill。不处理实时应用写入模式
  （MERGE/CREATE）——请使用 neo4j-cypher-skill。不处理 neo4j-admin backup/restore/config
  ——请使用 neo4j-cli-tools-skill。
version: 1.0.11
allowed-tools: Bash WebFetch
---

# Neo4j 导入技能

## 何时使用

- 将 CSV、JSON 或 Parquet 文件导入 Neo4j
- 批量 upsert 节点和关系（UNWIND + CALL IN TRANSACTIONS）
- 迁移关系型数据（SQL → 图）
- 离线批量加载大型数据集（neo4j-admin import）
- 在在线（Cypher）和离线（admin）导入方法之间选择
- 验证导入完整性（计数、约束、索引状态）

## 何时不使用

- **非结构化文档、PDF、向量分块** → `neo4j-document-import-skill`
- **实时应用写入（应用代码中的 MERGE/CREATE）** → `neo4j-cypher-skill`
- **neo4j-admin backup/restore/config** → `neo4j-cli-tools-skill`
- **从现有图进行 GDS 算法投影** → `neo4j-gds-skill`

---

## 方法决策表

| 数据集规模 | 数据库状态 | 来源 | 方法 |
|---|---|---|---|
| 任意规模 | 在线 | CSV（Aura 或本地） | LOAD CSV + CALL IN TRANSACTIONS |
| < 1M 行 | 在线 | 列表/API 响应 | UNWIND + CALL IN TRANSACTIONS |
| > 10M 行 | **离线**（本地/自管理） | CSV / Parquet | `neo4j-admin database import full` |
| 任意规模 | 在线 | 有 APOC | `apoc.periodic.iterate` + `apoc.load.csv` |
| 任意规模 | 在线 | JSON/API | `apoc.load.json` 或驱动批处理 |
| 增量差异 | 离线（企业版） | CSV | `neo4j-admin database import incremental` |

**Aura**：仅支持 `https://` URL——不支持 `file:///`。仅可在自管理环境使用 neo4j-admin import。

---

## 导入前检查清单

严格按此顺序运行——跳过会导致难以调试的重复数据或索引未使用：

**导入前建约束。导入后建额外索引。**
- 约束会创建 MERGE 在加载时使用的隐式 RANGE 索引，并强制唯一性
- 额外的非唯一索引（TEXT、非键属性上的 RANGE、FULLTEXT）在加载后创建——Neo4j 会从已提交数据异步填充它们；轮询 `populationPercent` 直到 100%
- 导入前创建额外索引会拖慢加载时的每次写入，且毫无收益

1. **创建唯一性约束**（启用 MERGE 所使用的索引）：
   ```cypher
   CREATE CONSTRAINT IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;
   CREATE CONSTRAINT IF NOT EXISTS FOR (n:Movie)  REQUIRE n.movieId IS UNIQUE;
   ```
   > **Neo4j 2026.06+（企业版/Aura，GA）：** `ALTER CURRENT GRAPH TYPE SET { … }` 用单个声明式块替换所有单独的约束语句。参见 `neo4j-cypher-skill/references/graph-type.md`。在社区版或 2026.02 之前使用单独的 `CREATE CONSTRAINT`。

2. **若使用 apoc.* 过程，先验证 APOC**：
   ```cypher
   RETURN apoc.version();
   ```
   若失败 → 未安装 APOC。改用普通 LOAD CSV。

3. **确认目标是 PRIMARY**（而非副本）：
   ```cypher
   CALL dbms.cluster.role() YIELD role RETURN role;
   ```
   若 role ≠ `PRIMARY` → 停止。将写入重定向到 PRIMARY 端点。

4. **导入前统计源文件行数**（尽早发现编码问题）：
   ```bash
   wc -l data/persons.csv    # Linux/macOS
   ```

5. **验证 UTF-8 编码**——LOAD CSV 需要 UTF-8。如需要则重新编码：
   ```bash
   file -i persons.csv       # Check encoding
   iconv -f latin1 -t utf-8 persons.csv > persons_utf8.csv
   ```

---

## LOAD CSV 模式

### 基本节点导入，含类型转换和 null 处理

```cypher
CYPHER 25
LOAD CSV WITH HEADERS FROM 'file:///persons.csv' AS row
CALL (row) {
  MERGE (p:Person {id: row.id})
  ON CREATE SET
    p.name       = row.name,
    p.age        = toIntegerOrNull(row.age),
    p.score      = toFloatOrNull(row.score),
    p.active     = toBoolean(row.active),
    p.born       = CASE WHEN row.born IS NOT NULL AND row.born <> '' THEN date(row.born) ELSE null END,
    p.createdAt  = datetime()
  ON MATCH SET
    p.updatedAt  = datetime()
} IN TRANSACTIONS OF 10000 ROWS
  ON ERROR CONTINUE
  REPORT STATUS AS s
RETURN s.transactionId, s.committed, s.errorMessage
```

Null/空字符串规则：
- CSV 缺少列 → `null`（安全）
- CSV 空字符串 `""` → 存储为 `""` **而非** `null`——使用 `nullIf(row.x, '')` 转换
- `toInteger(null)` 会抛错 → 始终使用 `toIntegerOrNull()`
- `toFloat(null)` 会抛错 → 始终使用 `toFloatOrNull()`
- Neo4j 从不存储 `null` 属性——它们在 SET 时被静默丢弃

### 关系导入（节点必须已存在）

```cypher
CYPHER 25
LOAD CSV WITH HEADERS FROM 'file:///knows.csv' AS row
CALL (row) {
  MATCH (a:Person {id: row.fromId})
  MATCH (b:Person {id: row.toId})
  MERGE (a)-[:KNOWS {since: toIntegerOrNull(row.year)}]->(b)
} IN TRANSACTIONS OF 5000 ROWS
  ON ERROR CONTINUE
  REPORT STATUS AS s
```

始终在导入任何关系之前导入所有节点——MATCH 在缺失节点上会失败。

### 制表符分隔或自定义分隔符

```cypher
CYPHER 25
LOAD CSV WITH HEADERS FROM 'file:///data.tsv' AS row FIELDTERMINATOR '\t'
CALL (row) { MERGE (p:Person {id: row.id}) }
IN TRANSACTIONS OF 10000 ROWS ON ERROR CONTINUE
```

### 压缩文件（ZIP / gzip——仅本地文件）

```cypher
LOAD CSV WITH HEADERS FROM 'file:///archive.csv.gz' AS row ...
```

### 云存储（企业版）

| 方案 | 示例 |
|---|---|
| AWS S3 | `s3://my-bucket/data/persons.csv` |
| Google Cloud Storage | `gs://my-bucket/persons.csv` |
| Azure Blob | `azb://account/container/persons.csv` |

### LOAD CSV 中有用的内置函数

```cypher
linenumber()   // current line number — use as fallback ID
file()         // absolute path of file being loaded
```

---

## CALL IN TRANSACTIONS——完整参考

### 语法

```cypher
CALL (row) {
  // write logic
} IN [n CONCURRENT] TRANSACTIONS
  [OF batchSize ROW[S]]
  [ON ERROR {CONTINUE | BREAK | FAIL | RETRY [FOR duration SECONDS] [THEN {CONTINUE|BREAK|FAIL}]}]
  [REPORT STATUS AS statusVar]
```

### ON ERROR 模式

| 模式 | 行为 | 使用时机 |
|---|---|---|
| `ON ERROR FAIL` | 默认。首次出错即回滚整个外层事务 | 全有或全无的严格导入 |
| `ON ERROR CONTINUE` | 跳过失败的批次，继续剩余批次 | 有韧性的批量加载——通过 REPORT STATUS 跟踪错误 |
| `ON ERROR BREAK` | 首次失败批次后停止；保留已完成的工作 | 半严格：提前停止，保留成功的批次 |
| `ON ERROR RETRY` | 指数退避重试（默认 30 秒）+ 回退 | 有死锁风险的并发写入 |

`ON ERROR CONTINUE/BREAK` → 即使内部批次失败，外层事务也**成功**。
`ON ERROR FAIL` → 不能与 `REPORT STATUS AS` 组合使用。

### CONCURRENT TRANSACTIONS（并行批次）

```cypher
CYPHER 25
LOAD CSV WITH HEADERS FROM 'file:///large.csv' AS row
CALL (row) {
  MERGE (p:Person {id: row.id}) SET p.name = row.name
} IN 4 CONCURRENT TRANSACTIONS OF 5000 ROWS
  ON ERROR RETRY FOR 30 SECONDS THEN CONTINUE
  REPORT STATUS AS s
```

对于非重叠键空间上的读密集 MERGE 使用 CONCURRENT。风险：重叠写入会死锁 → 与 `ON ERROR RETRY` 结合使用。

### REPORT STATUS 列

| 列 | 类型 | 含义 |
|---|---|---|
| `s.started` | BOOLEAN | 批次事务已启动 |
| `s.committed` | BOOLEAN | 批次已成功提交 |
| `s.transactionId` | STRING | 事务 ID |
| `s.errorMessage` | STRING 或 null | 批次失败时的错误详情 |

### 批次大小指引

| 行数 | 推荐批次大小 | 说明 |
|---|---|---|
| < 100k | 10 000 | 默认即可 |
| 100k – 1M | 10 000 – 50 000 | 监控堆；若快则增大 |
| 1M – 10M | 50 000 – 100 000 | 若有 CPU 可用则启用 CONCURRENT |
| > 10M 在线 | 50 000 | 考虑改用 neo4j-admin import |
| 关系导入 | 5 000 | 更低——每批执行 2 次 MATCH |

---

## neo4j-admin import（离线批量加载）

最快的方法：SSD 上 31M 节点 / 78M 关系约 3 分钟。数据库必须已停止或不存在。

### 命令结构

```bash
neo4j-admin database import full \
  --nodes=Person="persons_header.csv,persons.csv" \
  --nodes=Movie="movies_header.csv,movies.csv" \
  --relationships=ACTED_IN="acted_in_header.csv,acted_in.csv" \
  --relationships=DIRECTED="directed_header.csv,directed.csv" \
  --delimiter=, \
  --id-type=STRING \
  --bad-tolerance=0 \
  --threads=$(nproc) \
  --high-parallel-io=on \
  neo4j
```

**试运行**（2026.02+）——写入前验证：
```bash
neo4j-admin database import full --dry-run ...
```

### 节点头文件格式

```
# persons_header.csv
personId:ID,name,born:int,score:float,active:boolean,:LABEL
```

```
# persons.csv (data file — no header row)
p001,Alice,1985,9.2,true,Person
p002,Bob,1990,7.1,false,Person
```

| 字段 | 含义 |
|---|---|
| `:ID` | 用于关系接线的唯一 ID（默认不存为属性） |
| `:ID(Group)` | 作用域 ID 空间——当节点类型共享 ID 时使用 |
| `:LABEL` | 一个或多个标签；以分号分隔：`Person;Employee` |
| `prop:int` | 类型化属性；类型：`int long float double boolean byte short string` |
| `prop:date` | 时间类型：`date localtime time localdatetime datetime duration`；Parquet `INTERVAL` 列导入为 `DURATION` [2026.07+] |
| `prop:int[]` | 数组——单元格内以分号分隔值：`1;2;3` |
| `prop:vector` | 浮点向量（2025.10+）——CSV 中以分号分隔的坐标；可直接从原生 Parquet 列表类型导入 [2026.06+] |

### 关系头文件格式

```
# acted_in_header.csv
:START_ID(Person),:END_ID(Movie),role,:TYPE
```

```
# acted_in.csv
p001,tt0133093,Neo,ACTED_IN
p002,tt0133093,Morpheus,ACTED_IN
```

`:START_ID` / `:END_ID` 必须引用与节点文件相同的 `:ID` 组。

### 关键标志

| 标志 | 默认 | 说明 |
|---|---|---|
| `--delimiter` | `,` | 单字节 UTF-8 字符，`TAB`、`\ID` 或 `U+XXXX`；拒绝换行字符 [2026.07+] |
| `--vector-delimiter` | `;` | 分隔 `prop:vector` 坐标；必须与 `--delimiter` 和 `--quote` 不同 [2026.06+ 强制] |
| `--id-type` | `STRING` | `STRING \| INTEGER \| ACTUAL` |
| `--bad-tolerance` | `-1`（无限制，2025.12 变更） | 严格生产导入设为 `0` |
| `--threads` | CPU 数量 | 在共享主机上显式设置 |
| `--max-off-heap-memory` | 90% RAM | 若其他服务共享主机则减少 |
| `--high-parallel-io` | `off` | SSD/NVMe 设为 `on` |
| `--format` | `standard` | `block` 用于 >34B 节点/关系 |
| `--overwrite-destination` | false | 若数据库已存在则必需 |
| `--dry-run` | false | 2026.02+——写入前验证 |

### Schema 文件（--schema）[企业版，block 格式]

传入含有 `CREATE CONSTRAINT` / `CREATE INDEX` 语句的 Cypher 文件；导入完成后自动执行。约束会先创建（已强制正确顺序）。文件路径可为本地或远程（`s3://`、`gs://`、`https://`）。

```bash
neo4j-admin database import full \
  --format=block \
  --schema=schema.cypher \
  --nodes=Person="persons_header.csv,persons.csv" \
  neo4j
```

```cypher
// schema.cypher
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT movie_id  IF NOT EXISTS FOR (n:Movie)  REQUIRE n.id IS UNIQUE;
CREATE RANGE INDEX person_email IF NOT EXISTS FOR (n:Person) ON (n.email);
CREATE TEXT  INDEX movie_title  IF NOT EXISTS FOR (n:Movie)  ON (n.title);
```

对于增量导入，也支持 `DROP CONSTRAINT` / `DROP INDEX` [2025.02+]——用于在合并阶段前移除索引，并在之后重建以加快写入。`--schema` 也接受图类型 DDL：`ALTER CURRENT GRAPH TYPE SET {…}` 用于 `full` [2026.05+]，`ALTER CURRENT GRAPH TYPE ADD/DROP/ALTER {…}` 用于 `incremental` [2026.06+]——参见 `neo4j-cypher-skill/references/graph-type.md`。

---

### 增量导入（仅企业版）

三阶段流程——当导入准备期间数据库必须保持在线时使用：

```bash
# Phase 1: Prepare staging area
neo4j-admin database import incremental --stage=prepare \
  --nodes=Person=persons_header.csv,delta.csv --force neo4j

# Phase 2: Build indexes (DB can be read-only during this phase)
neo4j-admin database import incremental --stage=build neo4j

# Phase 3: Merge into live database (brief write-lock)
neo4j-admin database import incremental --stage=merge neo4j
```

需要企业版 + `block` 存储格式。

---

## APOC 模式（当 APOC 可用时）

先验证：`RETURN apoc.version()`——若失败，改用 LOAD CSV 或驱动。

### apoc.periodic.iterate——批处理现有图数据

```cypher
CALL apoc.periodic.iterate(
  "MATCH (p:Person) WHERE NOT (p)-[:HAS_ACCOUNT]->() RETURN p",
  "CREATE (p)-[:HAS_ACCOUNT]->(a:Account {id: randomUUID()})",
  {batchSize: 10000, parallel: false, retries: 2}
) YIELD batches, total, errorMessages
RETURN batches, total, errorMessages
```

| 配置键 | 默认 | 说明 |
|---|---|---|
| `batchSize` | 10000 | 每个内部事务的行数 |
| `parallel` | false | 对非重叠写入启用；风险：死锁 |
| `retries` | 0 | 以 100ms 延迟重试失败批次 N 次 |

对于新代码，优先使用 `CALL IN TRANSACTIONS`（原生 Cypher）而非 `apoc.periodic.iterate`——它内置 `REPORT STATUS`、`CONCURRENT` 和 `RETRY`，且不依赖 APOC。

### apoc.load.csv——带配置选项加载

```cypher
CALL apoc.load.csv('file:///persons.csv', {
  header: true,
  sep: ',',
  skip: 1,
  limit: 1000000
}) YIELD lineNo, map, list
CALL (map) {
  MERGE (p:Person {id: map.id}) SET p.name = map.name
} IN TRANSACTIONS OF 10000 ROWS ON ERROR CONTINUE
```

### apoc.load.json——从文件或 URL 加载 JSON

```cypher
CALL apoc.load.json('https://api.example.com/persons') YIELD value
CALL (value) {
  MERGE (p:Person {id: value.id}) SET p.name = value.name
} IN TRANSACTIONS OF 1000 ROWS ON ERROR CONTINUE
```

---

## 驱动批量写入模式

当来源不是文件（API 响应、数据库迁移）时使用。收集到 `BATCH_SIZE`（10 000）列表中，每批调用 `UNWIND $rows AS row MERGE ...`。比逐行写入快约 10 倍。→ [Python + JS 示例](references/driver-batch-write.md)

---

## MCP 工具用法

| 操作 | MCP 工具 | 说明 |
|---|---|---|
| `SHOW CONSTRAINTS`、`SHOW INDEXES` | `read-cypher` | 导入前始终检查 |
| `CREATE CONSTRAINT`、`CREATE INDEX` | `write-cypher` | 关口：展示计划约束，确认 |
| LOAD CSV / CALL IN TRANSACTIONS | `write-cypher` | 关口：展示行数 + Cypher，确认 |
| 验证计数 | `read-cypher` | 导入后：`MATCH (n:Label) RETURN count(n)` |
| 轮询索引状态 | `read-cypher` | 轮询直到所有 `state = 'ONLINE'` |

写入关口——通过 MCP 进行任何批量写入前，展示：
1. 查询 + 受影响标签
2. 来自来源的估计行数
3. `EXPLAIN` 计划

等待用户确认。绝不在无确认的情况下自动执行 `CALL IN TRANSACTIONS` 或 `CREATE CONSTRAINT`。

若非默认，请始终传入 `database` 参数：`{"code": "...", "database": "neo4j"}`。

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `Couldn't load the external resource` | `file:///` 路径不在 Neo4j 导入目录中 | 将文件移动到 `$NEO4J_HOME/import/`；检查 `dbms.security.allow_csv_import_from_file_urls=true` |
| `Cannot merge node using null property value` | MERGE 键解析为 null | MERGE 前验证 `row.id IS NOT NULL`；添加 `WHERE row.id IS NOT NULL` |
| `toInteger() called on null` | 将 null 列传给非 null 安全函数 | 将 `toInteger()` 替换为 `toIntegerOrNull()`，`toFloat()` 替换为 `toFloatOrNull()` |
| `Node N already exists` / 导入中途约束冲突 | 源 ID 重复 | 去重源 CSV；使用 `MERGE` 而非 `CREATE`；为约束添加 `IF NOT EXISTS` |
| 堆溢出 / OutOfMemoryError | 批次太大或文件太大 | 减小批次大小；切换到 `CALL IN TRANSACTIONS`；离线使用 neo4j-admin |
| `Invalid input 'IN': expected...'` | 使用了 `PERIODIC COMMIT` | 将 `USING PERIODIC COMMIT` 替换为 `CALL IN TRANSACTIONS`——PERIODIC COMMIT 在 Cypher 25 中已移除 |
| neo4j-admin：`Bad input data` | 头格式错误或类型不匹配 | 检查 `:ID`、`:START_ID`、`:END_ID` 是否存在；检查类型化列能否正确解析 |
| neo4j-admin：导入静默失败 | `--bad-tolerance` 在 2025.12 前默认无限制 | 设 `--bad-tolerance=0` 以暴露所有错误 |
| MERGE 期间未使用索引 | 导入前未创建约束 | 删除数据，创建约束，重新导入 |
| 关系导入缺少节点 | 关系在节点之前导入 | 始终在导入任何关系文件之前导入所有节点文件 |

---

## 导入后验证

导入完成后——全部运行：

```cypher
// Row counts per label
MATCH (n:Person) RETURN count(n) AS persons;
MATCH ()-[:KNOWS]->() RETURN count(*) AS knows_rels;

// After import: create additional non-unique indexes (populated async)
CREATE TEXT INDEX movie_title IF NOT EXISTS FOR (n:Movie) ON (n.title);
CREATE RANGE INDEX person_born IF NOT EXISTS FOR (n:Person) ON (n.born);

// Poll population — wait until populationPercent = 100 before opening to queries
SHOW INDEXES YIELD name, state, populationPercent
WHERE state <> 'ONLINE' OR populationPercent < 100
RETURN name, state, populationPercent
ORDER BY populationPercent;

// Spot check: null keys = import bug
MATCH (p:Person) WHERE p.id IS NULL RETURN count(p) AS missing_id;
```

在所有索引处于 ONLINE 之前不要运行生产查询。

---

## 参考资料

- [LOAD CSV——Cypher 手册 25](https://neo4j.com/docs/cypher-manual/25/clauses/load-csv/)
- [CALL IN TRANSACTIONS——Cypher 手册](https://neo4j.com/docs/cypher-manual/current/subqueries/subqueries-in-transactions/)
- [neo4j-admin database import](https://neo4j.com/docs/operations-manual/current/tools/neo4j-admin/neo4j-admin-import/)
- [APOC 周期性执行](https://neo4j.com/docs/apoc/current/graph-updates/periodic-execution/)
- [APOC load 过程](https://neo4j.com/docs/apoc/current/import/)
- [GraphAcademy：导入 CSV 数据](https://graphacademy.neo4j.com/courses/importing-cypher/)
- [索引与约束——类型、MERGE 锁语义、导入预检](../neo4j-cypher-skill/references/indexes.md)
- [Data Importer GUI——使用时机、Aura 访问、多轮处理、陷阱](references/data-importer-gui.md)
- [导入后重构——拆分列表、抽取节点、添加标签、外键验证](references/post-import-refactoring.md)

---

## 检查清单

- [ ] 在任何基于 MERGE 的导入前创建唯一性约束
- [ ] 若使用 `apoc.*` 过程，已验证 APOC 可用性
- [ ] 确认目标为 PRIMARY（而非副本）
- [ ] 源文件已验证：UTF-8 编码、预期行数、无 BOM
- [ ] LOAD CSV 使用 `toIntegerOrNull()` / `toFloatOrNull()`——绝不使用裸 `toInteger()`/`toFloat()`
- [ ] 在空字符串 ≠ null 处应用 `nullIf(row.x, '')`
- [ ] 使用 `CALL IN TRANSACTIONS`（而非 `USING PERIODIC COMMIT`）
- [ ] 生产加载使用 `ON ERROR CONTINUE` + `REPORT STATUS`
- [ ] 关系导入前已完成节点导入
- [ ] neo4j-admin：设置 `--bad-tolerance=0`；SSD 设置 `--high-parallel-io=on`
- [ ] 导入后：行数与源匹配；所有索引处于 ONLINE
- [ ] 已应用写入执行关口（MCP）：展示查询 + 估算，获得确认
- [ ] 凭据在 `.env` 中；`.env` 在 `.gitignore` 中
