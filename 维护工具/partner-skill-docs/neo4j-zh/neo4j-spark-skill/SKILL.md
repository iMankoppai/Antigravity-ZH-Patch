---
name: neo4j-spark-skill
description: 当使用 Neo4j Connector for Apache Spark 6.0（org.neo4j.connectors:spark）或 5.x
  （org.neo4j:neo4j-connector-apache-spark）通过 Apache Spark 或 Databricks 读写 Neo4j 时使用。涵盖 SparkSession
  设置、通过 labels/Cypher/relationship scan 读取 DataFrame、使用 SaveMode 写入 DataFrame、
  用于 MERGE 的 node.keys、关系写入映射、分区与批处理调优、PySpark 与 Scala
  示例、Databricks 集群配置、用于凭证的 Databricks secrets、Delta Lake 到 Neo4j
  的流水线。不处理 Cypher 编写——请使用 neo4j-cypher-skill。不处理 Python
  bolt 驱动——请使用 neo4j-driver-python-skill。不处理 GDS 算法——请使用 neo4j-gds-skill。
version: 1.0.3
allowed-tools: Bash WebFetch
---

# Neo4j Connector for Apache Spark

## 何时使用

- 将 Neo4j 节点/关系读取到 Spark DataFrame 中
- 将 Spark DataFrame 作为节点或关系写入 Neo4j
- Databricks notebook 连接 Neo4j
- Delta Lake → Neo4j 摄取流水线
- 从大型 Neo4j 图进行分区并行读取

## 何时不使用

- **Python bolt 驱动 / execute_query** → `neo4j-driver-python-skill`
- **Cypher 查询编写** → `neo4j-cypher-skill`
- **GDS 图算法** → `neo4j-gds-skill`
- **Spring Boot + Neo4j** → `neo4j-spring-data-skill`

---

## 版本矩阵

| Connector | Spark | Scala | Java | Databricks Runtime | Neo4j | Maven coordinate |
|-----------|-------|-------|------|--------------------|-------|------------------|
| 6.0.x | 4.0, 4.1 | 2.13 | 17+ | 17.3 LTS | 5.x, 2025.x, 2026.x | `org.neo4j.connectors:spark:6.0.0-s_2.13` |
| 5.5.x / 5.4.x | 3.4, 3.5 | 2.12, 2.13 | 8+ | 14.3–16.4 LTS | 4.4, 5.x, 2025.x, 2026.x | `org.neo4j:neo4j-connector-apache-spark_2.13:5.5.0_for_spark_3` |

Group ID 在 6.0 中变更——`org.neo4j:neo4j-connector-apache-spark_<scala>` 现在是一个重定位 POM，指向 `org.neo4j.connectors:spark`。在 Spark 3.x 上请继续使用 5.5.x。

### 6.0 破坏性变更

| 变更 | 迁移 |
|---|---|
| Spark 基线 3.5 → 4.0/4.1；移除 Scala 2.12 和 Java 8–11 | 先升级到 5.5.0，再升级到 Spark 4.x + Scala 2.13 + Java 17 |
| Maven 坐标 `org.neo4j.connectors:spark:<version>-s_2.13` | 替换旧的 `_for_spark_3` 坐标 |
| 移除 `schema.optimization.type` | 使用 `schema.optimization.node.keys`、`schema.optimization.relationship.keys`、`schema.optimization` |
| 移除分区读取中的 `$stream.offset` | 使用 `partitions` + `query.count` |
| 移除 `;` 分隔的多语句 `script` | 使用 `script.1`、`script.2`、… `script.N` — 按编号顺序执行 |
| `relationship.save.strategy` 默认值从 `native` → `keys` | 显式设置 `.option("relationship.save.strategy", "native")` 以保持旧行为 |
| 为 Data Source V2 谓词下推重写了 `query` 选项 | 无需操作；升级时验证执行计划 |

---

## 设置

### 独立 Spark（PySpark）

```python
from pyspark.sql import SparkSession

spark = (SparkSession.builder
    .appName("neo4j-app")
    .config("spark.jars.packages",
            "org.neo4j.connectors:spark:6.0.0-s_2.13")   # Spark 3.x: org.neo4j:neo4j-connector-apache-spark_2.13:5.5.0_for_spark_3
    .config("neo4j.url", "neo4j+s://xxxx.databases.neo4j.io")
    .config("neo4j.authentication.type", "basic")
    .config("neo4j.authentication.basic.username", "neo4j")
    .config("neo4j.authentication.basic.password", "password")
    .getOrCreate())
```

### 独立 Spark（Scala）

```scala
val spark = SparkSession.builder
  .appName("neo4j-app")
  .config("spark.jars.packages",
    "org.neo4j.connectors:spark:6.0.0-s_2.13")
  .config("neo4j.url", "neo4j+s://xxxx.databases.neo4j.io")
  .config("neo4j.authentication.type", "basic")
  .config("neo4j.authentication.basic.username", "neo4j")
  .config("neo4j.authentication.basic.password", "password")
  .getOrCreate()
```

### Databricks — 集群安装

1. Cluster → **Libraries** → **Install New** → **Maven**
2. 在 DBR 17.3 LTS 上使用坐标 `org.neo4j.connectors:spark:6.0.0-s_2.13`；在 DBR 14.3–16.4 LTS 上使用 `org.neo4j:neo4j-connector-apache-spark_2.13:5.5.0_for_spark_3`
3. Cluster → **Advanced Options** → **Spark** 标签页 — 添加配置：
   ```
   neo4j.url neo4j+s://xxxx.databases.neo4j.io
   neo4j.authentication.type basic
   neo4j.authentication.basic.username {{secrets/neo4j/username}}
   neo4j.authentication.basic.password {{secrets/neo4j/password}}
   ```
4. 使用 **Single user** 访问模式（不支持 Unity Catalog 共享模式）

### Databricks — Secrets（优于明文）

```python
# Store credentials once:
# databricks secrets create-scope --scope neo4j
# databricks secrets put --scope neo4j --key url
# databricks secrets put --scope neo4j --key username
# databricks secrets put --scope neo4j --key password

neo4j_url  = dbutils.secrets.get(scope="neo4j", key="url")
neo4j_user = dbutils.secrets.get(scope="neo4j", key="username")
neo4j_pass = dbutils.secrets.get(scope="neo4j", key="password")

spark.conf.set("neo4j.url", neo4j_url)
spark.conf.set("neo4j.authentication.type", "basic")
spark.conf.set("neo4j.authentication.basic.username", neo4j_user)
spark.conf.set("neo4j.authentication.basic.password", neo4j_pass)
```

---

## 关键配置选项

| 选项 | 描述 | 默认值 |
|--------|-------------|---------|
| `neo4j.url` | Bolt/Neo4j URI | —（必需） |
| `neo4j.authentication.type` | `none`、`basic`、`kerberos`、`bearer` | `basic` |
| `neo4j.authentication.basic.username` | 用户名 | 驱动默认值 |
| `neo4j.authentication.basic.password` | 密码 | 驱动默认值 |
| `neo4j.authentication.bearer.token` | Bearer 令牌 | — |
| `neo4j.database` | 目标数据库 | 驱动默认值 |
| `neo4j.access.mode` | `read` 或 `write` | `read` |
| `neo4j.encryption.enabled` | TLS（使用 `+s`/`+ssc` URI 时忽略） | `false` |
| `neo4j.db.transaction.timeout` | 事务超时（毫秒） | 驱动默认值 |
| `neo4j.db.transaction.metadata.<key>` | 在查询日志中呈现的自定义事务元数据 [6.0] | empty |
| `neo4j.authentication.type` = supplier 名称 | 自定义 `AuthenticationTokenSupplierFactory`（例如通过 `org.neo4j.connectors:commons-authn-keycloak` 使用 `keycloak`），用于会过期的 OAuth/OIDC 令牌 | — |

### Cypher 版本与查询调优 [6.0]

| 选项 | 效果 |
|---|---|
| `cypher.version` | Cypher 语言版本 — `5`（默认）或 `25` |
| `cypher.tuning.<param>` | 在每条生成的查询上输出 `CYPHER <param>=<value>` 前导语句 |

对读和写上的 `labels`、`relationship`、`query` 有效；与 `gds` 一起使用时被拒绝。

```python
df = (spark.read.format("org.neo4j.spark.DataSource")
    .option("query", "MATCH (o:Object) RETURN o.id AS id, o.name AS name")
    .option("cypher.version", "25")
    .option("cypher.tuning.runtime", "parallel")           # CYPHER 25 runtime=parallel
    .option("db.transaction.metadata.app", "spark-etl")    # tags transactions in query.log
    .load())
```

---

## 从 Neo4j 读取

三种互斥的读取模式——每次 `.read()` 调用只使用其中一种。

### 标签扫描（节点）

```python
# PySpark
df = (spark.read.format("org.neo4j.spark.DataSource")
    .option("labels", ":Person")
    .load())
df.printSchema()
df.show()
```

```scala
// Scala
val df = spark.read
  .format("org.neo4j.spark.DataSource")
  .option("labels", ":Person")
  .load()
```

多标签过滤（AND）：`.option("labels", ":Person:Employee")`

结果包含 `<id>`（Neo4j 内部 id）和 `<labels>` 列。

### Cypher 查询读取

```python
df = (spark.read.format("org.neo4j.spark.DataSource")
    .option("query", "MATCH (p:Person)-[:ACTED_IN]->(m:Movie) RETURN p.name AS actor, m.title AS movie, m.year AS year")
    .load())
```

使用显式的 RETURN 别名——它们会成为 DataFrame 的列名。查询中不要使用 `SKIP`/`LIMIT`（连接器负责分页）。

### 关系扫描

```python
df = (spark.read.format("org.neo4j.spark.DataSource")
    .option("relationship", "BOUGHT")
    .option("relationship.source.labels", ":Customer")
    .option("relationship.target.labels", ":Product")
    .load())
```

结果列：`<rel.id>`、`<rel.type>`、`<source.*>`、`<target.*>`，外加关系属性。

### 读取分区调优

```python
df = (spark.read.format("org.neo4j.spark.DataSource")
    .option("labels", ":Transaction")
    .option("partitions", "10")        # parallel partitions (default: 1)
    .option("batch.size", "5000")      # rows per partition batch (default: 5000)
    .option("schema.flatten.limit", "100")  # rows sampled for schema inference
    .load())
```

完整读取选项参考：[references/read-patterns.md](references/read-patterns.md)

---

## 写入 Neo4j

### SaveMode

| SaveMode | Cypher | 需要 |
|----------|--------|----------|
| `Append` | `CREATE` | 无额外要求 |
| `Overwrite` | `MERGE` | `node.keys`（节点）或 `*.node.keys`（关系） |
| `ErrorIfExists` | `CREATE` + 若存在则报错 | — |

在 `Overwrite` 模式下写入之前，始终为 `node.keys` 属性创建唯一约束。

### 写入节点 — Append（CREATE）

```python
from pyspark.sql import Row

people = spark.createDataFrame([
    {"name": "Alice", "age": 30},
    {"name": "Bob",   "age": 25},
])

(people.write.format("org.neo4j.spark.DataSource")
    .mode("Append")
    .option("labels", ":Person")
    .save())
```

### 写入节点 — Overwrite（MERGE）

```python
(people.write.format("org.neo4j.spark.DataSource")
    .mode("Overwrite")
    .option("labels", ":Person")
    .option("node.keys", "name")       # comma-separated; df_col:node_prop if names differ
    .save())
```

带重命名的 `node.keys`：`.option("node.keys", "df_col:node_property,id:personId")`

### 写入节点 — Scala

```scala
import org.apache.spark.sql.SaveMode

peopleDF.write
  .format("org.neo4j.spark.DataSource")
  .mode(SaveMode.Overwrite)
  .option("labels", ":Person")
  .option("node.keys", "name")
  .save()
```

### 写入关系

在写入关系之前使用 `coalesce(1)` 以避免死锁。

```python
rel_df = spark.createDataFrame([
    {"cust_id": "C1", "prod_id": "P1", "qty": 3},
    {"cust_id": "C2", "prod_id": "P2", "qty": 1},
])

(rel_df.coalesce(1)
    .write.format("org.neo4j.spark.DataSource")
    .mode("Append")
    .option("relationship", "BOUGHT")
    .option("relationship.save.strategy", "keys")
    .option("relationship.source.labels", ":Customer")
    .option("relationship.source.save.mode", "Match")          # require existing nodes
    .option("relationship.source.node.keys", "cust_id:id")
    .option("relationship.target.labels", ":Product")
    .option("relationship.target.save.mode", "Match")
    .option("relationship.target.node.keys", "prod_id:id")
    .option("relationship.properties", "qty:quantity")
    .save())
```

`relationship.source.save.mode` / `relationship.target.save.mode`：
- `Match` — 查找已存在的节点（缺失则失败）
- `Append` — 始终 CREATE 新节点
- `Overwrite` — MERGE 节点

### 写入前脚本 [6.0]

`script.N` 在写入操作之前按编号顺序运行一次 Cypher。在使用 `query` 模式时是索引/约束设置所必需的（该模式下 `schema.optimization.*` 会被拒绝）。

```python
(df.write.format("org.neo4j.spark.DataSource")
    .mode("Overwrite")
    .option("query", "MERGE (p:Person {email: event.email}) SET p.name = event.name")
    .option("script.1", "CREATE CONSTRAINT person_email IF NOT EXISTS FOR (p:Person) REQUIRE p.email IS UNIQUE")
    .option("script.2", "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)")
    .option("index.await.timeout", "300")   # db.awaitIndexes seconds; 0 disables
    .save())
```

`script`（单条语句）与 `script.N` 互斥。在 6.0 上，单个 `script` 内以分号分隔的多条语句会失败。

完整写入选项参考：[references/write-patterns.md](references/write-patterns.md)

---

## Databricks — Delta Lake → Neo4j 流水线

```python
# Read from Delta table (Unity Catalog or DBFS)
delta_df = spark.read.format("delta").table("catalog.schema.customers")

# Optional: filter/transform in Spark before writing
filtered = delta_df.filter("active = true").select("customer_id", "name", "region")

# Write to Neo4j
(filtered.write.format("org.neo4j.spark.DataSource")
    .mode("Overwrite")
    .option("labels", ":Customer")
    .option("node.keys", "customer_id")
    .option("batch.size", "20000")
    .save())
```

关系流水线模式——先加载两组节点，再写入边：

```python
# Step 1: ensure nodes exist
customers_df.write.format("org.neo4j.spark.DataSource").mode("Overwrite") \
    .option("labels", ":Customer").option("node.keys", "customer_id").save()

products_df.write.format("org.neo4j.spark.DataSource").mode("Overwrite") \
    .option("labels", ":Product").option("node.keys", "product_id").save()

# Step 2: write relationships (single partition)
orders_df.coalesce(1).write.format("org.neo4j.spark.DataSource").mode("Append") \
    .option("relationship", "ORDERED") \
    .option("relationship.save.strategy", "keys") \
    .option("relationship.source.labels", ":Customer") \
    .option("relationship.source.save.mode", "Match") \
    .option("relationship.source.node.keys", "customer_id:customer_id") \
    .option("relationship.target.labels", ":Product") \
    .option("relationship.target.save.mode", "Match") \
    .option("relationship.target.node.keys", "product_id:product_id") \
    .save()
```

---

## 写入性能调优

| 场景 | 建议 |
|----------|---------------|
| 节点写入（无锁竞争） | `repartition(N)`，其中 N ≤ Neo4j CPU 核数 |
| 关系写入（有锁风险） | `coalesce(1)` — 单分区 |
| 大数据集 | `batch.size` 10000–20000（根据堆内存调整） |
| MERGE 密集型加载 | 先为 `node.keys` 属性添加唯一约束 |

```python
# Aggressive batch — monitor Neo4j heap; OOM risk above 50k
(big_df.repartition(8)
    .write.format("org.neo4j.spark.DataSource")
    .mode("Overwrite")
    .option("labels", ":Event")
    .option("node.keys", "event_id")
    .option("batch.size", "20000")
    .save())
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|-------|-------|-----|
| `ClassNotFoundException: org.neo4j.spark.DataSource` | JAR 不在 classpath 上 | 添加 `spark.jars.packages` 或附加库 |
| 关系写入时发生死锁 | 多个分区锁定节点 | 写入前 `coalesce(1)` |
| Overwrite 时出现重复节点 | 键上没有唯一约束 | `CREATE CONSTRAINT ON (n:Label) ASSERT n.prop IS UNIQUE` |
| Neo4j 侧 OOM | `batch.size` 过大 | 降至 5000–10000；检查堆内存 |
| Schema 全是 `string` 列 | 没有 APOC，schema 未采样 | 调高 `schema.flatten.limit`；或改用带显式类型的 `query` 模式 |
| 写入时 `Access mode is read` 错误 | 会话以读模式打开 | 移除 `neo4j.access.mode` 或设为 `write` |
| Databricks Shared 集群失败 | 不支持 Unity Catalog 共享模式 | 切换到 Single User 访问模式 |
| 在 Spark 4 上出现 `NoSuchMethodError` / `IncompatibleClassChangeError` | 在 Spark 4 运行时上使用了 5.x 连接器 | 使用 `org.neo4j.connectors:spark:6.0.0-s_2.13` |
| 升级后关系写入忽略 `rel.*` / `source.*` 列 | 6.0 默认策略是 `keys`，不是 `native` | `.option("relationship.save.strategy", "native")` |
| `script` 选项因多条语句被拒绝 | 6.0 移除了用 `;` 分隔的脚本 | 拆分为 `script.1`、`script.2`、… |

---

## 检查清单

- [ ] 连接器坐标与 Spark 线路匹配——Spark 4.x 用 `org.neo4j.connectors:spark:*-s_2.13`，Spark 3.x 用 `org.neo4j:neo4j-connector-apache-spark_<scala>:*_for_spark_3`
- [ ] 制品中的 Scala 版本与集群运行时匹配（6.x 上仅支持 2.13）
- [ ] 凭证放在 Databricks secrets 或环境变量中——不是硬编码
- [ ] 使用 `Overwrite` 模式时设置了 `node.keys`
- [ ] MERGE 写入前在 `node.keys` 属性上创建了唯一约束
- [ ] 关系写入前应用了 `coalesce(1)`
- [ ] `batch.size` 按 Neo4j 堆内存设定（从 5000 起，逐步调高）
- [ ] Delta Lake → Neo4j：先写节点再写关系
- [ ] `query` 模式：Cypher 中无 `SKIP`/`LIMIT`（连接器在内部处理分页）
- [ ] Databricks：Single User 访问模式（非 Shared）
