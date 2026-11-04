---
name: databricks-pipelines
description: 在 Databricks 上开发 Lakeflow Spark Declarative Pipelines（原名 Delta Live Tables）。适用于使用 Python 或 SQL 构建批处理或流式数据管道时，包括从事件流或周期性完整快照进行 Auto CDC。在开始实现之前调用。
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.3.0"
parent: databricks-core
---

# Lakeflow Spark Declarative Pipelines 开发

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证、profile 选择和数据发现命令。

## 决策树

使用此树确定使用哪种数据集类型和特性。多个特性可以应用于同一数据集 —— 例如，流式表可以使用 Auto Loader 进行摄取、使用 Append Flow 进行扇入、使用 Expectations 进行数据质量。先选择数据集类型，然后叠加适用的特性。

```
User request → What kind of output?
├── Intermediate/reusable logic (not persisted) → Temporary View
│   ├── Preprocessing/filtering before Auto CDC → Temporary View feeding CDC flow
│   ├── Shared intermediate streaming logic reused by multiple downstream tables
│   ├── Pipeline-private helper logic (not published to catalog)
│   └── Published to UC for external queries → Persistent View (SQL only)
├── Persisted dataset
│   ├── Source is a periodic complete snapshot that must be diffed by key → Streaming Table + Auto CDC FROM SNAPSHOT (SQL requires DBR 18.3+)
│   ├── Source is streaming/incremental/continuously growing → Streaming Table
│   │   ├── File ingestion (cloud storage, Volumes) → Auto Loader
│   │   ├── Message bus (Kafka, Kinesis, Pub/Sub, Pulsar, Event Hubs) → streaming source read
│   │   ├── Existing streaming/Delta table → streaming read from table
│   │   ├── CDC / upserts / track changes / keep latest per key / SCD Type 1 or 2 → Auto CDC
│   │   ├── Multiple sources into one table → Append Flows (NOT union)
│   │   ├── Historical backfill + live stream → one-time Append Flow + regular flow
│   │   └── Windowed aggregation with watermark → stateful streaming
│   └── Source is batch/historical/full scan → Materialized View
│       ├── Aggregation/join across full dataset (GROUP BY, SUM, COUNT, etc.)
│       ├── Gold layer aggregation from streaming table → MV with batch read (spark.read / no STREAM)
│       ├── JDBC/Federation/external batch sources
│       └── Small static file load (reference data, no streaming read)
├── Output to external system (Python only) → Sink
│   ├── Existing external table not managed by this pipeline → Sink with format="delta"
│   │   (prefer fully-qualified dataset names if the pipeline should own the table — see Publishing Modes)
│   ├── Kafka / Event Hubs → Sink with format="kafka" + @dp.append_flow(target="sink_name")
│   ├── Custom destination not natively supported → Sink with custom format
│   ├── Custom merge/upsert logic per batch → ForEachBatch Sink (Public Preview)
│   └── Multiple destinations per batch → ForEachBatch Sink (Public Preview)
└── Data quality constraints → Expectations (on any dataset type)
```

## 常见陷阱

- **名称** → SDP = LDP = Lakeflow Declarative Pipelines =（原名）DLT。用户提及它们时都可互换。
- **未指定类型就"创建表"** → 询问源是流式还是批处理。流式源 → 流式表；批处理源 → 物化视图。不匹配的组合在验证时报错。
- **对流式源进行聚合** → 使用带批读取（`spark.read.table` / 不带 `STREAM` 的 `SELECT FROM`）的物化视图。ST 是仅追加的，不会在源行变化时重新计算聚合；MV 会。
- **中间逻辑** → 默认使用临时视图。即使是被多个下游表复用的共享逻辑。只有当物化一次能节省大量重处理时，才使用私有 MV/ST（`private=True` / `CREATE PRIVATE ...`）。对于 Auto CDC 之前的预处理，临时视图是必需的 —— CDC 流从 `STREAM(view_name)`（SQL）或 `spark.readStream.table("view_name")`（Python）读取。
- **流的 Union** → 使用多个 Append Flow。跨流式源的 UNION 是反模式。
- **更改数据集类型** → 无法原地将 ST→MV 或 MV→ST。完全刷新也无济于事。手动删除现有表或重命名新数据集。
- **`CREATE OR REFRESH` vs `CREATE`** → 两者对 SQL 数据集都能解析，但 `CREATE OR REFRESH` 是惯用约定。对于 PRIVATE 数据集：`CREATE OR REFRESH PRIVATE STREAMING TABLE` / `... MATERIALIZED VIEW`。
- **Kafka/Event Hubs 接收端序列化** → `value` 列是强制的；用 `to_json(struct(*)) AS value` 序列化行。参见 [sink-python.md](references/sink-python.md)。
- **多列 Auto CDC 排序** → SQL：`SEQUENCE BY STRUCT(col1, col2)`。Python：`sequence_by=struct("col1", "col2")`。参见 auto-cdc 参考。
- **Auto CDC TRUNCATE**（仅 SCD Type 1）→ SQL：`APPLY AS TRUNCATE WHEN condition`。Python：`apply_as_truncates=expr("condition")`。不要声称不支持 truncate。
- **周期性完整快照** → 在 DBR 18.3+ 上使用 SQL `AUTO CDC FROM SNAPSHOT`，或在较旧运行时上使用 Python `dp.create_auto_cdc_from_snapshot_flow`。阅读 Auto CDC 参考了解版本选择和生命周期规则。
- **仅 Python 的特性** → Sink、ForEachBatch Sink 和自定义数据源仅支持 Python。当用户在 SQL 中工作时，澄清这一点并建议切换到 Python。
- **推荐一个清晰的方法** → 呈现单一推荐路径。不要列出反模式或劣质替代方案 —— 它们会造成混乱。只有当替代方案真正提供不同取舍时才提及。

## 常见问题

错误 → 智能体经常遇到的原因/修复映射。关于 DAB 捆绑包 vs CLI 迭代的部署问题，参见工作流专属参考文件。

| 错误 / 症状 | 原因 / 修复 |
|-----------------|-------------|
| 拒绝 `CREATE OR REPLACE STREAMING TABLE` / `MATERIALIZED VIEW` | `CREATE OR REPLACE` 是标准 SQL，不是 SDP。使用 `CREATE OR REFRESH STREAMING TABLE` / `CREATE OR REFRESH MATERIALIZED VIEW`。 |
| `databricks fs ls /Volumes/...` 上 CLI 错误 | 即使对于 UC 卷路径也需要 `dbfs:` 前缀：`databricks fs ls dbfs:/Volumes/<catalog>/<schema>/<volume>/<path>`。 |
| 首次写入时 `DELTA_CLUSTERING_COLUMNS_DATATYPE_NOT_SUPPORTED` | 某个 `CLUSTER BY` 列是 BOOLEAN / ARRAY / MAP / STRUCT / BINARY。SDP 不会预验证 —— 提交前用 `DESCRIBE` 核实。聚类键必须是数值 / 字符串 / 日期 / 时间戳。完整类型规则见 [references/performance.md](references/performance.md#cluster-key-data-types)。 |
| `Cannot create streaming table from batch query` | 在流式表查询中你写了 `FROM read_files(...)`（批处理）。使用 `FROM STREAM read_files(...)` 以便 Auto Loader 生效。 |
| 摄取时 `Column not found` | `schemaHints` 与实际文件 schema 不匹配。对样本文件 `DESCRIBE` 并调整提示。 |
| 流式读取失败并报解析器错误 | 文件摄取用 `FROM STREAM read_files(...)`，表到表的流用 `FROM stream(table)`（或 `FROM STREAM table_name` —— 遗留 DLT，优先函数形式）。不要混用。 |
| 无服务器管道卡在 `INITIALIZING` | 正常 —— 首次运行冷启动需要几分钟。不要杀掉它。 |
| 物化视图不做增量刷新 | 聚合的自动增量刷新需要**无服务器** + 源上的 Delta 行跟踪（`delta.enableRowTracking = true`）。缺少任一，则回退到全量重算。当用户询问增量刷新时提及无服务器要求。 |
| SCD2 查询返回空 / 在 `START_AT` 上 "column not found" | Lakeflow 使用 `__START_AT` / `__END_AT`（双下划线）。当前行：`WHERE __END_AT IS NULL`。 |
| 事件输出中缺少 `error.exceptions[0].message` | 你的 `jq` 读取的是 `.message`（只是 "Update X is FAILED"）。读取 `error.exceptions[0].message` 获取真实原因 —— 参见 [2-rapid-iteration-with-cli.md](references/2-rapid-iteration-with-cli.md#step-4-start-an-update-and-poll-that-update)。 |

## 发布模式

管道使用管道设置中配置的**默认 catalog 和 schema**。所有数据集都发布到那里，除非被覆盖。

- **完全限定名**：在数据集名称中使用 `catalog.schema.table` 以写入与管道默认不同的 catalog/schema。管道直接在那里创建数据集 —— 无需 Sink。
- **USE CATALOG / USE SCHEMA**：更改同一文件中所有后续定义的当前 catalog/schema 的 SQL 命令。
- **LIVE 前缀**：已弃用。在默认发布模式中被忽略。
- 在管道内读取或定义数据集时，只使用数据集名称 —— 不要使用完全限定名，除非管道已如此做或用户明确请求不同的目标 catalog/schema。

## API 参考

**在编写任何特性的管道代码之前，阅读链接的参考文件。** 下面每个表将特性映射到确切的 API，以及该（特性、语言）的细节文件。

有些特性建立在其他特性之上 —— 两者都要读：

- **Auto Loader** / **Auto CDC** / **Sinks** 以流式表为目标 → 还要读 [streaming-table-python.md](references/streaming-table-python.md) / [streaming-table-sql.md](references/streaming-table-sql.md)。
- **Expectations** 附加到数据集 → 还要读数据集定义文件（streaming-table / materialized-view / temporary-view）。

### 数据集定义 API

| 特性                    | 描述                                                      | Python                            | SQL                                         | 技能（Py）                                              | 技能（SQL）                                       |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| 流式表            | 持续增量处理、exactly-once、仅追加。    | `@dp.table()` 返回流式 DF | `CREATE OR REFRESH STREAMING TABLE`         | [streaming-table-python](references/streaming-table-python.md) | [streaming-table-sql](references/streaming-table-sql.md) |
| 物化视图          | 物理存储的查询结果，增量刷新。         | `@dp.materialized_view()`         | `CREATE OR REFRESH MATERIALIZED VIEW`       | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 临时视图             | 管道私有，不持久化到 Unity Catalog。                | `@dp.temporary_view()`            | `CREATE TEMPORARY VIEW`                     | [temporary-view-python](references/temporary-view-python.md) | [temporary-view-sql](references/temporary-view-sql.md) |
| 持久视图（UC）       | 发布到 UC；查询在访问时运行（无存储）。              | 不适用 —— 仅 SQL                    | `CREATE VIEW`                               | —                                                       | [view-sql](references/view-sql.md)                |
| 流式表（显式） | 空目标，由单独的流填充（Append Flow、AUTO CDC）。 | `dp.create_streaming_table()`     | `CREATE OR REFRESH STREAMING TABLE`（无 AS） | [streaming-table-python](references/streaming-table-python.md) | [streaming-table-sql](references/streaming-table-sql.md) |

### 流和 Sink API

| 特性                      | 描述                                                      | Python                       | SQL                                    | 技能（Py）                                                  | 技能（SQL）                                       |
| ---------------------------- | ---------------------------------------------------------------- | ---------------------------- | -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Append Flow                  | 扇入：多个源 → 一个流式表。代替 UNION 使用。 | `@dp.append_flow()`     | `CREATE FLOW ... INSERT INTO`          | [streaming-table-python](references/streaming-table-python.md) | [streaming-table-sql](references/streaming-table-sql.md) |
| 回填流                | 一次性历史加载 + 持续的实时流进入同一表。 | `@dp.append_flow(once=True)` | `CREATE FLOW ... INSERT INTO ... ONCE` | [streaming-table-python](references/streaming-table-python.md) | [streaming-table-sql](references/streaming-table-sql.md) |
| Sink（Delta/Kafka/EH/自定义） | 将流式输出写入外部 Delta / Kafka / Event Hubs。   | `dp.create_sink()`           | 不适用 —— 仅 Python                      | [sink-python](references/sink-python.md)                    | —                                                 |
| ForEachBatch Sink            | 自定义逐批 Python 逻辑（merge/upsert、多目标）。公共预览。 | `@dp.foreach_batch_sink()` | 不适用 —— 仅 Python         | [foreach-batch-sink-python](references/foreach-batch-sink-python.md) | —                                       |
| RTM 更新流              | 实时模式：将流路由到接收端，亚秒级延迟。公共预览。 | `@dp.update_flow(target=...)` | 不适用 —— 仅 Python          | [real-time-mode](references/real-time-mode.md)              | —                                                 |

### CDC API

| 特性                      | 描述                                                          | Python                                      | SQL                             | 技能（Py）                                | 技能（SQL）                          |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------- | ------------------------------- | ----------------------------------------- | ------------------------------------ |
| Auto CDC（流式源）  | 从 CDC 馈送进行 SCD Type 1（覆盖）或 Type 2（历史）。          | `dp.create_auto_cdc_flow()`                 | `AUTO CDC INTO ... FROM STREAM` | [auto-cdc-python](references/auto-cdc-python.md) | [auto-cdc-sql](references/auto-cdc-sql.md) |
| Auto CDC（周期性快照） | 比较连续的完整快照以检测变更。                | `dp.create_auto_cdc_from_snapshot_flow()`   | `AUTO CDC ... FROM SNAPSHOT`（DBR 18.3+） | [auto-cdc-python](references/auto-cdc-python.md) | [auto-cdc-sql](references/auto-cdc-sql.md) |

关于查询 SCD Type 2 历史表（`__START_AT` / `__END_AT`、时间点、将事实与历史维度连接），参见 [scd-2-querying.md](references/scd-2-querying.md)。

### 数据质量 API

| 特性            | 描述                                | Python                       | SQL                                                    | 技能（Py）                                            | 技能（SQL）                                     |
| ------------------ | ------------------------------------------ | ---------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| Expect（警告）      | 记录违规，保留所有行。             | `@dp.expect()`               | `CONSTRAINT ... EXPECT (...)`                          | [expectations-python](references/expectations-python.md) | [expectations-sql](references/expectations-sql.md) |
| Expect 或丢弃     | 丢弃违规行。                       | `@dp.expect_or_drop()`       | `CONSTRAINT ... EXPECT (...) ON VIOLATION DROP ROW`    | [expectations-python](references/expectations-python.md) | [expectations-sql](references/expectations-sql.md) |
| Expect 或失败     | 首次违规时使管道失败。      | `@dp.expect_or_fail()`       | `CONSTRAINT ... EXPECT (...) ON VIOLATION FAIL UPDATE` | [expectations-python](references/expectations-python.md) | [expectations-sql](references/expectations-sql.md) |
| Expect all（警告）  | 一次多个约束，仅警告。   | `@dp.expect_all({})`         | 多个 `CONSTRAINT` 子句                          | [expectations-python](references/expectations-python.md) | [expectations-sql](references/expectations-sql.md) |
| Expect all 或丢弃 | 多个约束，违规时丢弃。   | `@dp.expect_all_or_drop({})` | 多个带 `DROP ROW` 的约束                   | [expectations-python](references/expectations-python.md) | [expectations-sql](references/expectations-sql.md) |
| Expect all 或失败 | 多个约束，违规时失败。   | `@dp.expect_all_or_fail({})` | 多个带 `FAIL UPDATE` 的约束                | [expectations-python](references/expectations-python.md) | [expectations-sql](references/expectations-sql.md) |

### 读取数据 API

| 特性                           | 描述                                            | Python                                         | SQL                                              | 技能（Py）                                              | 技能（SQL）                                       |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| 批读取（管道数据集）     | 将同级表作为静态 DataFrame 读取。            | `spark.read.table("name")`                     | `SELECT ... FROM name`                           | —                                                       | —                                                 |
| 流式读取（管道数据集） | 将同级表作为流式 DataFrame 读取。         | `spark.readStream.table("name")`               | `SELECT ... FROM STREAM(name)`                   | —                                                       | —                                                 |
| Auto Loader（云文件）         | 从云存储增量摄取新文件。     | `spark.readStream.format("cloudFiles")`        | `STREAM read_files(...)`                         | [auto-loader-python](references/auto-loader-python.md)  | [auto-loader-sql](references/auto-loader-sql.md)  |
| Kafka 源                      | 从 Kafka topic 流式读取。                       | `spark.readStream.format("kafka")`             | `STREAM read_kafka(...)`                         | [kafka](references/kafka.md)                            | [kafka](references/kafka.md)                      |
| Kinesis 源                    | 从 AWS Kinesis 流式读取。                       | `spark.readStream.format("kinesis")`           | `STREAM read_kinesis(...)`                       | —                                                       | —                                                 |
| Pub/Sub 源                    | 从 GCP Pub/Sub 流式读取。                       | `spark.readStream.format("pubsub")`            | `STREAM read_pubsub(...)`                        | —                                                       | —                                                 |
| Pulsar 源                     | 从 Apache Pulsar 流式读取。                     | `spark.readStream.format("pulsar")`            | `STREAM read_pulsar(...)`                        | —                                                       | —                                                 |
| Event Hubs 源                 | 从 Azure Event Hubs 流式读取（Kafka 协议）。 | `spark.readStream.format("kafka")` + EH 配置 | `STREAM read_kafka(...)` + EH 配置             | [kafka](references/kafka.md)                            | [kafka](references/kafka.md)                      |
| JDBC / Lakehouse Federation       | 通过联邦从外部系统批读取。       | `spark.read.format("postgresql")` 等         | 通过联邦 catalog 直接引用表          | —                                                       | —                                                 |
| 自定义数据源                | 用户定义的 Python 数据源。                       | `spark.read[Stream].format("custom")`          | 不适用 —— 仅 Python                                | —                                                       | —                                                 |
| 静态文件读取（批处理）          | 一次性加载文件（无增量跟踪）。      | `spark.read.format("json"\|"csv"\|...).load()` | `read_files(...)`（无 STREAM）                    | —                                                       | —                                                 |
| 跳过上游变更提交      | 忽略上游表上的 CDC 提交。              | `.option("skipChangeCommits", "true")`         | `STREAM name WITH (SKIPCHANGECOMMITS)`            | [streaming-table-python](references/streaming-table-python.md) | [streaming-table-sql](references/streaming-table-sql.md) |

### 表/Schema 特性 API

| 特性                      | 描述                                                   | Python                                                | SQL                                     | 技能（Py）                                              | 技能（SQL）                                       |
| ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| 液体聚类            | 自适应多列数据布局；替代 PARTITION + Z-ORDER。尽可能优先自动聚类 | `cluster_by=[...]`                                 | `CLUSTER BY (col1, col2)`               | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 自动液体聚类       | Databricks 从查询模式中挑选聚类键。         | `cluster_by_auto=True`                                | `CLUSTER BY AUTO`                       | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 分区列            | 遗留固定分区。优先用液体聚类。          | `partition_cols=[...]`                                | `PARTITIONED BY (col1, col2)`           | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 表属性             | Delta 表属性（自动优化、CDF、保留期）。       | `table_properties={...}`                              | `TBLPROPERTIES (...)`                   | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 显式 schema              | 预先声明列类型（vs 推断）。                  | `schema="col1 TYPE, ..."`                             | `(col1 TYPE, ...) AS`                   | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 生成列            | 写入时从其他列计算的列。            | `schema="..., col TYPE GENERATED ALWAYS AS (expr)"`   | `col TYPE GENERATED ALWAYS AS (expr)`   | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 行过滤器（公共预览）  | UC 细粒度访问：通过函数过滤行。            | `row_filter="ROW FILTER fn ON (col)"`                 | `WITH ROW FILTER fn ON (col)`           | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 列掩码（公共预览） | UC 细粒度访问：用函数掩码列。        | `schema="..., col TYPE MASK fn USING COLUMNS (col2)"` | `col TYPE MASK fn USING COLUMNS (col2)` | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |
| 私有数据集              | 不发布到 UC 的物化中间结果。                | `private=True`                                        | `CREATE PRIVATE ...`                    | [materialized-view-python](references/materialized-view-python.md) | [materialized-view-sql](references/materialized-view-sql.md) |

### 遗留 DLT 语法 —— 始终迁移

上方的表**只展示现代 API**。如果你在用户代码中看到以下任何内容，那是遗留 DLT 语法 —— **始终迁移到现代形式**，不要扩展它。在建议更改之前阅读 [references/dlt-migration.md](references/dlt-migration.md)，以确保转换正确（尤其是 `apply_changes` → `create_auto_cdc_flow` 语义和 `partition_cols` → `cluster_by`）。

| 如果你看到……                                                                 | ……那是 DLT。迁移到                                                |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `import dlt`                                                                | `from pyspark import pipelines as dp`                                |
| `@dlt.table(...)`、`@dlt.append_flow(...)`、`@dlt.expect*`                  | `dp.*` 上相同的装饰器名（例如 `@dp.table`、`@dp.expect_or_drop`）。 |
| `@dlt.view(...)`（或较旧代码中若有的 `@dp.view(...)`）              | `@dp.temporary_view(...)` —— 现代 API 没有 `view` 装饰器，只有 `temporary_view`。 |
| `dlt.read("name")` / `dlt.read_stream("name")`                              | `spark.read.table("name")` / `spark.readStream.table("name")`        |
| `dp.read(...)` / `dp.read_stream(...)`                                      | 也是遗留 —— 使用 `spark.read.table(...)` / `spark.readStream.table(...)`。 |
| `dlt.apply_changes(...)` / `dp.apply_changes(...)`                          | `dp.create_auto_cdc_flow(...)`。`sequence_by` 接受列名（字符串）或 `col(...)`；`stored_as_scd_type` 对 Type 2 是整数 `2`，对 Type 1 是字符串 `"1"`。 |
| `dlt.apply_changes_from_snapshot(...)`                                      | `dp.create_auto_cdc_from_snapshot_flow(...)`                         |
| `dlt.create_streaming_table(...)`                                           | `dp.create_streaming_table(...)`                                     |
| SQL 中的 `LIVE.<name>` 前缀                                                 | 裸名称（批处理用 `SELECT FROM name`，流式用 `SELECT FROM STREAM(name)`）。`LIVE.` 在现代管道中会报错。 |
| `CREATE LIVE TABLE` / `CREATE STREAMING LIVE TABLE` | `CREATE OR REFRESH MATERIALIZED VIEW` / `CREATE OR REFRESH STREAMING TABLE`。 |
| `CREATE TEMPORARY LIVE VIEW`（又称 `CREATE LIVE VIEW`） | `CREATE TEMPORARY VIEW`。**例外**：`CREATE TEMPORARY VIEW` 不支持 expectations 的 `CONSTRAINT` 子句 —— 对于需要在临时视图上使用 expectations 的罕见情况，保留 `CREATE LIVE VIEW`。参见 [temporary-view-sql.md](references/temporary-view-sql.md#using-expectations-with-temporary-views) 和 [expectations-sql.md](references/expectations-sql.md)。 |
| `APPLY CHANGES INTO ... FROM STREAM ...`（SQL）                              | `AUTO CDC INTO ... FROM STREAM ...`                                  |
| `partition_cols=[...]` / `PARTITIONED BY (...)` + `ZORDER`                  | `cluster_by=[...]` / `CLUSTER BY (...)`（液体聚类）。         |
| `input_file_name()`                                                         | `_metadata.file_path`（SQL）/ `F.col("_metadata.file_path")`（Python）。 |
| `create_streaming_table` / 管道配置上的 `target=...` 参数        | `schema=...`                                                         |

## 语言选择（Python vs SQL）

在脚手架化之前决定 —— 该选择决定模板文件（`.py` vs `.sql`）以及适用哪些参考文档。两者可以共存，但选一个主语言。不确定时，为简单起见默认用 SQL。

| 用户信号 | 选择 |
|-------------|------|
| "Python pipeline"、UDF、pandas、ML 推理、pyspark | **Python** |
| "SQL pipeline"、"SQL files" | **SQL** |
| "Simple pipeline"、"create a table"、"an aggregation" | **SQL**（更简单，作为默认） |
| 复杂参数化逻辑、自定义 UDF、ML | **Python** |

如果有歧义，询问。坚持所选语言，除非用户明确切换。

## 选择你的工作流

存在三种项目形态 —— 在脚手架化之前选择。生产定向的工作默认用 A，探索 / 演示脚手架默认用 C。

- **A：独立的新的管道项目（DAB）** —— 管道就是项目，无现有 `databricks.yml`。用 `databricks pipelines init --output-dir . --config-file init-config.json` 脚手架化。→ [1-project-initialization-with-dab.md](references/1-project-initialization-with-dab.md)
- **B：现有捆绑包中的管道（DAB）** —— `databricks.yml` 已存在。添加指向 `src/` 的 `resources/<name>.pipeline.yml`。→ [1-project-initialization-with-dab.md#workflow-b-pipeline-in-existing-bundle](references/1-project-initialization-with-dab.md#workflow-b-pipeline-in-existing-bundle)
- **C：快速 CLI 迭代（无捆绑包）** —— 原型开发。`databricks pipelines create / start-update / list-pipeline-events`；如果工作要进生产，稍后正式化为捆绑包。→ [2-rapid-iteration-with-cli.md](references/2-rapid-iteration-with-cli.md)

## 管道结构

- 除非用户另有说明，遵循 medallion 模式（Bronze → Silver → Gold）。默认保持简单 —— 只几张表。
- 每个文件一个数据集，以数据集命名。转换文件位于 `src/` 或 `transformations/`。
- **Gold 层：保留关键业务维度。** 聚合到 Gold 时，保留分析师将用于过滤/切片的维度（位置、部门、产品线、客户细分、时间段）。过度聚合会丢失下游无法恢复的信息。如果提及仪表板，其上的每个过滤器都需要是 Gold 表中的一列。在查询中进一步聚合比恢复丢失的维度更容易。


## 运行管道

选择正确的运行命令取决于上文选择的工作流。

- **工作流 A / B（DAB）** —— 代码更改只有在 `databricks bundle deploy` 后才生效。在任何运行、试运行或选择性刷新之前始终先部署。
  ```bash
  databricks bundle validate --profile <profile>
  databricks bundle deploy -t dev --profile <profile>
  databricks bundle run <pipeline_name> -t dev --profile <profile>
  databricks pipelines get <pipeline_id> --profile <profile>      # status
  ```
  → 完整 DAB 运行 + 迭代细节：[references/1-project-initialization-with-dab.md#running-a-pipeline-workflow-a--b](references/1-project-initialization-with-dab.md#running-a-pipeline-workflow-a--b)

- **工作流 C（CLI，无捆绑包）** —— 将文件上传到工作区，然后直接驱动管道。每次代码更改后重新上传。
  ```bash
  databricks workspace import-dir ./my_pipeline /Workspace/Users/<user>/my_pipeline --overwrite
  databricks pipelines start-update <pipeline_id>
  ```
  → 完整 CLI 运行 + 轮询模式：[references/2-rapid-iteration-with-cli.md](references/2-rapid-iteration-with-cli.md)

**刷新模式（两种工作流）：**

- **选择性刷新** 当你只需运行一张表时优先。依赖必须已经物化。
- **完全刷新** 是最昂贵且危险的选项，**可能导致数据丢失**（它从头重处理流式源，销毁流式状态）。只在真正必要时使用。始终将其作为后续建议，且用户必须明确批准。

**始终轮询 update**，而非顶层管道状态 —— 参见 [2-rapid-iteration-with-cli.md#step-4-start-an-update-and-poll-that-update](references/2-rapid-iteration-with-cli.md#step-4-start-an-update-and-poll-that-update) 中的轮询理由。同样的规则适用于捆绑包运行。

## 参考索引

项目与生命周期：

- [1-project-initialization-with-dab.md](references/1-project-initialization-with-dab.md) —— 工作流 A 和 B。
- [2-rapid-iteration-with-cli.md](references/2-rapid-iteration-with-cli.md) —— 工作流 C；start-update + 轮询 + 错误提取。
- [pipeline-configuration.md](references/pipeline-configuration.md) —— 完整的 create/update JSON 参考 + 变体片段 + 多 schema + 平台约束。
- [performance.md](references/performance.md) —— 液体聚类、状态管理、join、预聚合、监控。
- [dlt-migration.md](references/dlt-migration.md) —— DLT → SDP 转换。

横切模式：

- [streaming-patterns.md](references/streaming-patterns.md) —— 去重、窗口聚合、迟到数据、救援数据隔离、异常检测、延迟监控。
- [scd-2-querying.md](references/scd-2-querying.md) —— 当前状态、时间点、将事实与历史维度连接。
- [kafka.md](references/kafka.md) —— Kafka / Event Hubs 摄取。
- [real-time-mode.md](references/real-time-mode.md) —— 实时模式（RTM）：亚秒级持续管道（`@dp.update_flow`、Kafka 接收端、无服务器或经典）。

Auto Loader 格式特定选项：[JSON](references/options-json.md) · [CSV](references/options-csv.md) · [XML](references/options-xml.md) · [Parquet](references/options-parquet.md) · [Avro](references/options-avro.md) · [Text](references/options-text.md) · [ORC](references/options-orc.md)。

数据集、流、CDC、expectation、Auto Loader 和 sink 参考在[上方 API 参考表](#api-reference)中按（特性、语言）列出。
