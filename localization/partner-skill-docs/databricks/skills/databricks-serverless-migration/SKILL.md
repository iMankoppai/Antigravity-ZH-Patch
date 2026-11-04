---
name: databricks-serverless-migration
description: "将 Databricks 工作负载从经典计算迁移到无服务器计算。适用于将 notebook、作业、管道或 Scala JAR（`spark_jar_task`）从经典集群迁移到无服务器、检查现有代码是否无服务器兼容，或编写新的无服务器兼容代码时。为无服务器 Spark Connect 架构提供具体修复，并指导完整迁移。不适用于经典 DBR 版本升级或经典计算内的集群配置变更。"
compatibility: Requires databricks CLI (>= v0.292.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# 无服务器计算迁移

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

分析现有 Databricks 代码的无服务器计算兼容性，并指导从经典集群迁移。本技能遵循 4 步迁移生命周期：**摄取**（Ingest）工作负载 → **分析**（Analyze）兼容性 → **测试**（Test）通过 A/B 对比 → **验证**（Validate）并迭代。

## 何时使用本技能

- 将 notebook、作业或管道从经典计算迁移到无服务器
- 检查现有代码是否无服务器兼容
- 编写面向无服务器计算的新代码
- 迁移后排查无服务器特有的错误
- 在 Performance-Optimized 和 Standard 模式之间选择

## 在哪里运行本技能

本技能作为 Agent Skill（agentskills.io）发布，可在任何兼容客户端中运行：

- **笔记本电脑上的 Claude Code、Cursor 或任何 agentskills.io 客户端** —— 默认。通过 `databricks aitools install` 安装或遵循各客户端文档。
- **在 Databricks 工作区内通过 Genie Code Agent 模式** —— 将技能放入 `/Workspace/Users/<you>/.assistant/skills/databricks-serverless-migration/`（按用户）或 `/Workspace/.assistant/skills/databricks-serverless-migration/`（工作区范围，仅管理员）。三种安装方法和**重要的无服务器计算注意事项**（无服务器上未预装 Databricks CLI，因此某些部署步骤需要调整）见[在 Databricks Genie Code 中安装](references/install-in-databricks-genie-code.md)。

如果你为用户完成了一个迁移分析，而该用户当前从笔记本电脑客户端运行你，最后提及一次 Genie Code 选项 —— 许多用户更喜欢在工作负载所在的工作区内迭代迁移。

## 理解迁移阻塞

迁移阻塞分为三类。将精力集中在第 2 类 —— 这是本技能帮助最大的地方。

| 类别 | 描述 | 操作 |
|----------|-------------|--------|
| **1. 功能扩展中** | Databricks 正在积极扩展支持（例如 SparkML、自定义 JDBC） | 现在使用变通方法，稍后重访 |
| **2. 需要代码/配置变更** | 你的代码使用了需要为无服务器更新的模式（例如 RDD、DBFS、流式触发器） | **本技能在此提供帮助** —— 它检测这些模式并提供修复 |
| **3. 仅经典** | 工作负载需要无服务器上不可用的能力（例如根 OS 访问、R 语言） | 保留在经典计算上 |

## 决策树：我的工作负载准备好了吗？

```
Workload → Check language
├── R code → Category 3: keep on classic
├── Scala notebook cells → Category 2: port to PySpark/SQL, or compile as a JAR job task
├── Compiled Scala JAR (spark_jar_task, build.sbt/pom.xml/build.gradle) → see references/jar-migration.md
│     ├── Scala 2.12 build?             → recompile against 2.13.16
│     ├── Bundles spark-core/spark-sql? → use databricks-connect % Provided
│     └── Bundles libs on the kernel classpath? → mark % Provided (see the classpath table in references/jar-migration.md)
├── Python / SQL → Continue
    ├── Uses RDD APIs? → Category 2: rewrite to DataFrame API (see fixes below)
    ├── Uses DBFS paths? → Category 2: migrate to UC Volumes
    ├── Uses Hive Metastore? → Category 2: migrate to Unity Catalog (or use HMS Federation)
    ├── Uses df.cache/persist? → Category 1: remove and materialize to Delta (native support coming soon)
    ├── Uses streaming?
    │   ├── ProcessingTime trigger → Category 2: use AvailableNow or migrate to SDP
    │   ├── Continuous trigger → Category 2: use SDP continuous mode
    │   ├── No trigger specified → Category 2: add explicit .trigger(availableNow=True)
    │   └── AvailableNow / Once → Ready ✓
    ├── Uses init scripts? → Category 2: use Environments
    ├── Uses VPC peering? → Category 2: use NCCs / Private Link
    ├── Uses unsupported Spark configs? → Category 2: remove (serverless auto-tunes)
    ├── Uses custom JDBC drivers? → Category 2: use Lakehouse Federation or built-in JDBC
    ├── Uses Docker containers? → Category 3: use Environments for libs, or keep on classic
    └── All clear → Ready for serverless ✓
```

## 迁移工作流

### 步骤 1：摄取 —— 收集工作负载上下文

**确认迁移目标是无服务器计算。** 本技能专为经典 → 无服务器迁移而构建。检查、修复和工作流都针对无服务器计算架构（Spark Connect、Environments、NCC）。如果用户想改为在经典 DBR 版本之间升级，本技能不适用 —— 经典 DBR 升级有不同的兼容性面，应遵循标准 DBR 升级指南。

收集需要迁移到无服务器的完整情况：
- 阅读用户的 notebook/脚本文件
- 识别经典集群配置（实例类型、DBR 版本、Spark 配置、init 脚本、库）
- 记录网络设置（VPC 对等、实例配置文件、挂载）
- 理解工作负载类型：批处理作业、流式、交互式 notebook、管道
- 确定目标：输出始终是**无服务器计算**配置，而非带更新 DBR 的经典集群

### 步骤 1.5：处理多 notebook 工作负载

如果工作负载跨越多个用户 notebook（从计数中排除 `_resources/` 设置 notebook），**一次一个**处理它们，而非一次性全部。智能体的上下文窗口有限，在进行分析、修复和迁移时试图将一个 8-notebook 作业的全部源码保持在活动上下文中会触发自动压缩抖动（Claude Code）或其他客户端中同等的上下文溢出失败。

**过程**：

1. **先枚举。** 列出每个用户 notebook 及其路径。暂不完整读取正文，超出几行用于定位即可。
   - **检查 `bundle_config.py`（H4）。** 如果源码树包含 `bundle_config.py`，解析它并遵循任何上游源声明（git URL、S3 路径、`init_scripts`、`git_source` 或自定义上游仓库声明）。将每个引用的仓库克隆或抓取到相邻位置，并在枚举中包含其 notebook。将"外部源"列为迁移计划中的一等产物类别。没有这一步，多源演示（例如 `dbt-on-databricks` 引用上游 `dbt-databricks-c360` 仓库）会被错误枚举，真正的任务 notebook 会被遗漏。
2. **按顺序对每个 notebook**：
   a. 读取其完整源码。
   b. 仅针对此 notebook 运行步骤 2 分析检查清单。
   c. 在你的响应或草稿文件中记录结构化摘要，然后从活动工作记忆中丢弃原始源码。摘要必须包含：
      - `notebook_path`（相对）
      - `detected_patterns[]`（来自本技能目录的模式 ID）
      - `blockers[]`（此 notebook 命中的第 3 类模式，如果有）
      - `migration_steps[]`（排序的具体修复）
      - `unmigratable`（bool —— 如果有任何阻塞无变通方法则为 true）
   d. 如果你有可写草稿目录（`~/.databricks-migration-skill/scratch/<run-id>/findings/`），将摘要持久化为 `<notebook-basename>.json`。这将源安全地从上下文中释放。如果没有，将会话历史中的摘要保持紧凑。
3. **综合。** 所有 notebook 都有摘要后，仅从摘要生成统一迁移计划。逐 notebook 应用修复，绝不重读原始源码，除非需要解决摘要中的歧义。
4. **失败报告。** 每个工作负载恰好触发一次失败报告协议，而非每个 notebook 一次。报告中的 `detected_patterns` 数组跨所有 notebook 聚合；`notebook_characteristics` 使用求和的行数和语言/流式/ML 标志的并集。

**阈值指导**：当用户 notebook 数量 ≥ 3，或单个 notebook 超过约 5KB 源码时应用此过程。对于 1–2 个小型 notebook，步骤 2–4 中的单遍工作流即可。

**反模式**：不要尝试"将所有 notebook 合并为一个大文件"或"读取所有 notebook，然后在一个巨型回合中行动"的策略。两者都通过重新引入原始上下文压力问题而违背初衷。

### 步骤 2：分析 —— 扫描无服务器就绪性

**在运行 notebook 之前阅读它们 —— 不要依赖失败的作业运行来发现问题。** 运行前扫描比在错误追踪上迭代更快地暴露不兼容性，而许多无服务器失败（硬编码 catalog 引用、init 脚本、缺失依赖）很容易静态发现，但在失败运行后调试代价高昂。

在创建或运行任何测试作业之前：
1. 阅读作业引用的每个 notebook 和源文件
2. 扫描所有硬编码 catalog/schema 引用（例如 `spark.table("main.schema.table")`、`spark.sql("... FROM main...")`、`catalog = "main"`）
3. 检查依赖模式：init 脚本、本地 wheel 文件、自定义安装函数、`%pip install` 行
4. 定位任何 `requirements.txt` 或等效文件并解析完整依赖集
5. 标记 OS 级安装（`apt install`、`yum install`）以供转换或升级

扫描代码中与无服务器计算架构不兼容的模式。这些检查是无服务器特有的 —— 大多数这些模式在任何 DBR 版本的经典计算上都能正常工作。对发现的每个问题报告：
- **类别**：它属于 3 个阻塞类别中的哪一个
- **严重性**：阻塞（必须为无服务器修复）/ 警告（应修复）/ 信息（知悉）
- **模式**：检测到什么以及在哪里
- **修复**：针对无服务器计算的具体补救

#### 重写后 lint：单元 magic 边界检查（A1）

**高影响。** 在宣布迁移后的 notebook 就绪之前，对每个输出单元运行此 lint 遍历。在 dbdemos E2E 扫描中导致 3/7 演示失败（hls-readmission、fsi-fraud、retail-c360）。

**检测**：任何包含 `# MAGIC %<word>` 行（例如 `# MAGIC %run`、`# MAGIC %sql`、`# MAGIC %md`、`# MAGIC %pip`、`# MAGIC %fs`）的单元。在该单元内，每个非空行必须以 `# MAGIC ` 开头，或为空行。如果普通 Python 注释（或任何其他 Python 代码）在同一单元中先于 `# MAGIC %...` 指令，则该单元已损坏：Databricks 将其解析为 Python，`%run` 回退到 IPython 行 magic，产生类似 `File './00-global-setup-v2' not found` 的错误。

**修复**：绝不要在同一单元中在 `# MAGIC %...` 行上方前置普通 Python 注释。两个有效选项：

1. **首选**：将迁移注释放在上方单独的 `# MAGIC %md` 单元中（它自己的 `# COMMAND ----------` 块）。
2. **可接受**：完全去掉迁移注释，依赖 git/文件历史。

**修改前示例**（损坏；`%run` 失败并报 `File not found`）：

```python
# COMMAND ----------

# Migration: relative '%run ../../../_resources/00-global-setup-v2' may not
# resolve under serverless job tasks. Replaced with sibling reference.
# MAGIC %run ./00-global-setup-v2
```

**修改后示例**（干净；`%run` 作为单元 magic 触发）：

```python
# COMMAND ----------

# MAGIC %md
# MAGIC Migration: relative %run path replaced with sibling reference.

# COMMAND ----------

# MAGIC %run ./00-global-setup-v2
```

**类别 A：不支持的 API**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| `sc.parallelize(data)` | 阻塞 | `spark.createDataFrame([(x,) for x in data], ["value"])` |
| `rdd.map(fn)` | 阻塞 | `df.select(F.col("value") * 2)` 或 `df.withColumn(...)` |
| `rdd.filter(fn)` | 阻塞 | `df.filter(F.col("value") > 3)` |
| `rdd.reduce(fn)` | 阻塞 | `df.agg(F.sum("col")).collect()[0][0]` |
| `rdd.flatMap(fn)` | 阻塞 | `df.select(F.explode(F.split(col, " ")))` |
| `rdd.groupByKey()` | 阻塞 | `df.groupBy("key").agg(F.collect_list("value"))` |
| `rdd.mapPartitions(fn)` | 阻塞 | `df.groupBy(F.spark_partition_id()).applyInPandas(fn, schema)` |
| `sc.textFile(path)` | 阻塞 | `spark.read.text(path)` |
| `sc.wholeTextFiles(path)` | 阻塞 | `spark.read.format("binaryFile").load(path)` |
| `sc.broadcast(data)` | 阻塞 | `from pyspark.sql.functions import broadcast; df.join(broadcast(lookup_df), key)` |
| `sc.accumulator(init)` | 阻塞 | `df.agg(F.sum("col"))` 或 `df.count()` |
| `spark.sparkContext` | 阻塞 | 直接使用 `spark`（SparkSession） |
| `SparkContext.getOrCreate()` | 阻塞 | 不支持 —— 抛出 `RuntimeError: Only remote Spark sessions using Databricks Connect are supported`。数据设置用 `spark.createDataFrame()` 或 `spark.range()` 替代。 |
| `sqlContext.sql(query)` | 阻塞 | `spark.sql(query)` |
| `sc.hadoopConfiguration.set(...)` | 阻塞 | 使用 UC 外部位置 —— 无需凭证配置 |
| `df.cache()` / `df.persist()` | 警告 | 移除缓存调用。对于昂贵的中间结果，物化到 Delta 表。原生支持即将推出。 |
| `df.checkpoint()` | 警告 | 改为写入 Delta 表 |
| `spark.catalog.cacheTable(t)` / `CACHE TABLE` | 警告 | 移除 —— 无服务器上不需要 |
| notebook 中的 `%scala` 单元 | 阻塞 | 移植到 PySpark/SQL 或编译为 JAR 用于作业任务 |
| notebook 中的 `%r` 单元 | 阻塞 | 无无服务器等效项 —— 保留在经典上或移植到 PySpark |
| Hive 变量语法 `${var}` | 警告 | 使用 `DECLARE VARIABLE` / `SET VARIABLE`（SQL）或 Python f-string |
| `CREATE GLOBAL TEMPORARY VIEW` | 阻塞 | 使用 `CREATE OR REPLACE TEMPORARY VIEW` —— `global_temp` 数据库在无服务器上不存在 |
| 查询中的 `global_temp.` 前缀 | 警告 | 移除前缀 —— 会话范围临时视图无需限定符即可访问 |
| 内置 `max(..., key=)` / `min(..., key=)` / `sorted(..., key=)` 配合 `from pyspark.sql.functions import *`（A2） | 阻塞 | `pyspark.sql.functions.max` 遮蔽内置并拒绝 `key=`（抛出 `TypeError: max() got an unexpected keyword argument 'key'`）。使用排序+索引：`xs.sort(key=...); top = xs[0]`。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |
| `from databricks import automl` / `automl.classify()` / `automl.regress()` / `automl.forecast()`（A3） | 阻塞 | AutoML 在无服务器上不可用，且 `DBDemos.create_mockup_automl_run` 回退在 Spark Connect 上命中 `PlanMetrics not JSON serializable`。改写为内联 scikit-learn `Pipeline` 配合 `mlflow.sklearn.log_model` + `mlflow.register_model` + UC 别名。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |
| `mlflow.pyfunc.spark_udf(...)` 后跟 `df.withColumn("prediction", loaded_model(struct(*features)))`（A4） | mlflow 2.19.0 上阻塞 | Spark Connect 上的闭包 bug：`batch_predict_fn` 将 `loaded_model` 捕获为自由变量；worker 失败并报 `NameError: cannot access free variable 'loaded_model'`。**根因是 Spark Connect 序列化。** 首选修复（可移植，任何 mlflow），driver 侧 pandas 推理：`mlflow.pyfunc.load_model(uri).predict(df.toPandas())` 然后 `spark.createDataFrame(...)`。回退修复：在环境规范中固定 `mlflow>=2.20.0`。 |
| 模型服务端点创建中的 `AutoCaptureConfigInput(enabled=...)`（A5） | 警告 | 已弃用参数，会破坏首次端点部署。从 `EndpointCoreConfigInput(...)` 中完全移除 `auto_capture_config=AutoCaptureConfigInput(...)` 参数。 |
| `mlflow.<flavor>.log_model(..., registered_model_name=...)` 且作用域内有 `mlflow.set_registry_uri("databricks-uc")`（M1） | 阻塞 | 在 UC 下，`registered_model_name=` 触发内部 `get_model_version_by_alias(..., 'Champion')` 调用，对全新模型抛出 `RESOURCE_DOES_NOT_EXIST`。从 `log_model` 去掉该 kwarg；运行后调用 `mlflow.register_model(model_uri=f"runs:/{run.info.run_id}/model", name=<full_name>)` 和 `MlflowClient().set_registered_model_alias(...)`。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |
| 对 UC 注册模型访问 `.latest_versions`（例如 `client.get_registered_model(name).latest_versions`）（M2） | 阻塞 | 在 UC 上 `RegisteredModel.latest_versions` 始终为 `None`；`max(None, key=...)` 抛出 `TypeError: 'NoneType' object is not iterable`。使用 `client.search_model_versions(f"name='{name}'")` + 排序+索引（按上方 A2）。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |
| `mlflow.<flavor>.log_model(...)` 无 `signature=` kwarg，且作用域内有 `mlflow.set_registry_uri("databricks-uc")`（M3） | 阻塞 | UC 要求每个注册模型都有模型签名。没有 `signature=`，`log_model` 抛出 `MlflowException: Model signature is required for registering a model to Unity Catalog`。从样本推断：`signature = infer_signature(X_sample, model.predict(X_sample))` 然后作为 `signature=signature` 传给 `log_model`。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |
| 二元分类器预测列写为 `float64`（`Double`），而下游 Delta 表期望 `Integer`（M4） | 首次写入时阻塞 | sklearn 二元分类器（例如 A3 的 AutoML → sklearn 重写）将 `predict()` 结果输出为 `float64`。写入 `prediction` 列为 `IntegerType` 的 Delta 表失败并报 `DELTA_FAILED_TO_MERGE_FIELDS: prediction (Double) vs prediction (Integer)`。写入前转换：`df.withColumn("prediction", col("prediction").cast("integer"))`。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |

**类别 B：数据访问**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| `dbfs:/` 或 `/dbfs/` 路径（持久数据） | 阻塞 | 替换为 `/Volumes/<your_catalog>/schema/volume/path` |
| `dbfs:/tmp/`、`/dbfs/tmp/`、含 `cache`/`scratch`/`temp` 的路径 | 警告 | 使用 `/tmp/` 或 `/local_disk0/tmp/`（本地 driver 磁盘）—— 不要为临时文件使用卷，因为性能问题 |
| `file:///dbfs/` FUSE 挂载路径 | 警告 | 将持久路径替换为 `/Volumes/...`；将临时路径替换为 `/local_disk0/tmp/` |
| `dbutils.fs.mount(...)` | 阻塞 | 创建 UC 外部位置 + 外部卷 |
| `hive_metastore.db.table` | 警告 | 迁移到 UC 或使用 HMS Federation：`CREATE FOREIGN CATALOG ... USING CONNECTION hms_connection` |
| `CREATE DATABASE`/`CREATE SCHEMA` 无 `USE CATALOG` 或三段式名 | 阻塞 | 在 notebook 开头任何 CREATE 语句之前前置 `spark.sql("USE CATALOG <your_catalog>")`。从现有表引用检测目标 catalog，或询问用户。 |
| IAM 实例配置文件引用 | 警告 | 使用 UC 外部位置 + 存储凭证 |
| Hive SerDe 表 | 阻塞 | 迁移到 UC 中的 Delta 表 |
| 在 `config.py`、`config/__init__.py`、`_config*.py` 或任何通过 `%run` 引用的 Python 文件中的裸 `catalog = "<value>"` / `schema = "<value>"` 赋值（B1） | 阻塞 | Catalog 重写必须扫描**所有**配置文件，而不仅包含 `spark.table(...)` 的 notebook 正文。将 `"main"`、`"main__build"`、`"hive_metastore"` 等字面量替换为用户的目标 catalog（通常为 `home_<user>`）。重写后，在整个迁移树中 grep 残留的字面 catalog 引用。 |
| `spark.sql("CREATE CATALOG IF NOT EXISTS ...")`（B2） | 阻塞 | 权限检查在 `IF NOT EXISTS` 短路之前触发，因此非管理员用户即使 catalog 已存在也会命中 `PERMISSION_DENIED: User does not have CREATE CATALOG on Metastore`。先用 `SHOW CATALOGS LIKE '...'` 探测作保护；只有探测返回空时才发出 `CREATE CATALOG`。**递归应用于整个迁移树，包括 `_resources/00-global-setup-v2.py` 和 `config*` 文件。** 同样的模式也适用于用户不拥有的 catalog 中的 `CREATE SCHEMA IF NOT EXISTS` 和 `CREATE VOLUME IF NOT EXISTS`。 |

**类别 C：流式**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| `.trigger(processingTime=...)` | 阻塞 | `.trigger(availableNow=True)` + 设置 `maxFilesPerTrigger` 或 `maxBytesPerTrigger` 以防止 OOM |
| `.trigger(continuous=...)` | 阻塞 | 迁移到 SDP 持续模式 |
| writeStream 上没有 `.trigger()` 调用 | 阻塞 | **必须**添加 `.trigger(availableNow=True)` —— Spark 默认为 `ProcessingTime("0 seconds")`，不受支持 |
| Kafka 源 | 信息 | 配合 AvailableNow 可用；使用 `maxOffsetsPerTrigger` 控制批次大小 |
| Auto Loader | 信息 | 可用；使用 `cloudFiles.maxFilesPerTrigger`（注意 `cloudFiles.` 前缀） |

**类别 D：配置**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| 不支持的 `spark.conf.set(...)` | 警告 | 移除 —— 仅支持 6 个配置：`spark.sql.shuffle.partitions`、`spark.sql.session.timeZone`、`spark.sql.ansi.enabled`、`spark.sql.files.maxPartitionBytes`、`spark.sql.legacy.timeParserPolicy`、`spark.databricks.execution.timeout`。无服务器自动调优其他一切。 |
| Init 脚本 | 阻塞 | 使用 Environments：通过 notebook Environment 面板或 `requirements.txt` 添加依赖。固定特定版本。 |
| 集群策略 | 信息 | 使用预算策略进行成本归属 |
| Docker 容器 | 阻塞 | 使用 Environments 进行库管理。只有在 Docker 用于 OS 级定制时才保留在经典上。 |
| `%run ./relative/path` 或 `%run ../path` | 警告 | 相对 `%run` 路径在无服务器作业任务中可能无法正确解析。修复：(1) 如果被引用的 notebook 代码 <500 行则内联（首选），(2) 转换为带绝对路径的 `dbutils.notebook.run("<absolute_workspace_path>", timeout)`。在约 19% 的仓库中发现。 |
| `os.environ["VAR"]`（系统/自定义环境变量） | 警告 | 使用带回退的 `os.environ.get()`，Spark 信息用 `spark.version`，或自定义变量用 `dbutils.widgets` |
| `SET hivevar:` / `${hivevar:...}`（Hive 变量替换） | 阻塞 | 使用 SQL 会话变量：`DECLARE OR REPLACE VARIABLE name = value`（DBR 14.1+） |
| 环境变量（在 init 脚本中） | 警告 | 使用 `dbutils.widgets` 或作业参数 |
| 显式 executor 数量/内存配置 | 信息 | 移除 —— 无服务器自动扩缩和自动调优 |
| 已弃用的 Foundation Model 端点引用，例如 `databricks-meta-llama-3-1-405b-instruct` 及类似（D1） | 阻塞 | 通过**对每个迁移文件的全文扫描**检测（不要按文件名模式）。`ai_query(endpoint => '...')`、`ChatDatabricks(endpoint=...)`、模型服务配置和 Genie/AI-Functions SQL 中的常见引用。替换为当前默认的 `databricks-meta-llama-3-3-70b-instruct`。在最终部署前核实替换端点在目标工作区中存在。 |

**类别 E：库**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| notebook 中的 JAR 库 | 阻塞 | 编译为 JAR 作业任务（Scala 2.13、JDK 17、环境版本 4+） |
| 编译的 Scala JAR 迁移（版本 + 依赖冲突） | 阻塞 | 针对 Scala 2.13.16 重新编译；依赖 `databricks-connect` % Provided；将内核捆绑的依赖标记为 % Provided。完整过程 + env-4 类路径见 [JAR 迁移](references/jar-migration.md) |
| Maven 坐标 | 阻塞 | 替换为 Environments 中的 PyPI 包 |
| 未锁定版本的 `%pip install` | 警告 | 固定版本：`%pip install numpy==2.2.2 pandas==2.2.3` |
| 自定义 Spark 数据源（v1/v2 JAR） | 阻塞 | 使用 Lakehouse Federation、Lakeflow Connect 或 PySpark 自定义数据源 |
| LZO 格式文件 | 阻塞 | 转换为 Parquet 或 Delta |
| 在 SDP `.py` 库文件内通过 `mlflow.pyfunc.spark_udf(..., env_manager='local')` 加载 AutoML 训练的模型（E1） | 阻塞 | SDP 无服务器镜像不附带 `databricks-automl-runtime`；cloudpickle.load 抛出 `ModuleNotFoundError: No module named 'databricks.automl_runtime'`。自动发出 `%pip install -q databricks-automl-runtime` 作为 SDP `.py` 库文件的第一个非注释行。SDP `.py` 库文件支持 `%pip install`，并在规划 SQL 流之前每次更新运行一次。同样的修复也适用于加载 AutoML 训练模型的非 SDP notebook。 |
| AutoML → sklearn 重写（A3）配合预先存在的模型服务端点（E2） | 首次重新部署时阻塞 | 重写改变了模型签名（例如从输入中去掉 `id`）。固定到旧 AutoML 签名的预先存在端点在创建/更新时失败并报 HTTP 400 `Failed to enforce schema of data ... Model is missing inputs ['id']`。在**迁移后的测试端点**（而非服务真实流量的实时生产端点）的下游 serving notebook 中，将 `force_update = False` → `force_update = True`，使端点重新绑定到当前的 `prod`（或 `Champion`）别名。在翻转之前，确认端点名称与迁移副本匹配。 |

**类别 F：网络**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| VPC 对等配置 | 阻塞 | 创建 NCC，获取稳定 IP，在资源防火墙上列入允许列表。同区域 S3 访问无需更改即可用。 |
| 无 UC 的直接 S3/ADLS 访问 | 警告 | 使用 UC 外部位置 |

**类别 G：规格与调试**

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| 大 driver 内存配置 | 信息 | 无服务器 REPL 默认 8GB（通过 Environments 可选 16GB+ 高内存选项） |
| Spark UI 引用 | 信息 | 改用 Query Profile：点击单元输出下的 "See performance" |

**类别 H：作业级配置（dbt_task、SDP、多源、部署前提条件）**

这些检查针对作业/管道规格 JSON 和部署前提条件操作，而非 notebook 正文。与类别 A–G 中的逐 notebook 检查一并应用它们。

| 模式 | 严重性 | 修复 |
|---------|----------|-----|
| 作业规格中的 `dbt_task` 块（H1） | dbt 工作负载上阻塞 | 三个子检查：(1) **`warehouse_id`**：将已知繁忙或非无服务器的数仓换成 Stable/专用的 DBSQL 无服务器数仓。(2) **`project_directory`**：重写为迁移后的工作区位置（例如 `/Workspace/Users/<me>/<demo>-skill-migrated/...`）。(3) **`libraries[]`**：将仅经典的 Python wheel 替换为固定版本的无服务器兼容版本；标记 `dbt-databricks` < 1.7.x。 |
| 与原始演示一起部署且 `schema` 相同的 SDP 管道规格（H2） | 阻塞 | UC 拒绝并行部署并报 `Table is already managed by pipeline <orig-id>`。当目标路径包含迁移后缀（例如 `-skill-migrated/`）时，自动为管道的目标 `schema` 加后缀（例如 `dbdemos_retail_c360` → `dbdemos_retail_c360_skill_migrated`）。对转换文件中硬编码 schema 的任何 `LIVE` / `STREAMING TABLE` 引用应用相同的重写。部署前 lint 管道规格：如果任何目标表已存在且属于另一个管道，以清晰的消息失败。 |
| 工作区 `import` 10 MB 上限（H3） | 建议（可预见） | 部署前前提条件：在 `databricks workspace import` 之前遍历迁移树，标记任何 > 10 MB 的文件。将大文件（样本 CSV、`dbt seed` 数据、样本数据集等）改道到 UC 卷（`databricks fs cp`）而非工作区导入。在工作区导入命令旁发出一个 UC 卷上传命令，附上什么去哪里的清单。在大多数工作负载中不阻塞，但会阻塞任何使用 `dbt seed` 或大样本 CSV 的演示。 |
| 带 `bundle_config.py` 声明上游 git URL 的多源工作负载（H4） | 诊断 | 没有它，技能会错误枚举用户 notebook。解析 `bundle_config.py` 并遵循任何上游源声明（git URL、S3 路径）。在逐 notebook 枚举之前克隆或抓取引用的仓库。将"外部源"列为迁移计划中的一等产物类别。参见[多源枚举](references/multi-source-enumeration.md)。具体示例：`dbt-on-databricks` 的 `bundle_config.py` 引用上游 `dbt-databricks-c360` 仓库；真正的任务 notebook 在那里，而非本地 `dbdemos-notebooks/` 树中。 |

### 必需输出：无服务器环境规范

迁移输出必须包含无服务器环境规范以及迁移后的代码。通过以下方式生成：

1. 扫描所有 `import` 语句和 `%pip install` 行以检测所需包
2. 从作业配置中提取 init 脚本的 `pip install` 命令
3. 生成适合 Jobs API `environments` 字段的 JSON 块：

```json
{
  "environment_key": "Default",
  "spec": {
    "client": "2",
    "dependencies": ["mlflow==2.12.1", "scikit-learn==1.3.0", "xgboost==2.0.3"]
  }
}
```

**重要**：ML runtime 库（mlflow、scikit-learn、hyperopt、xgboost、tensorflow、torch 等）在无服务器计算上**未**预装。它们**必须**在环境规范 `dependencies` 中显式列出。ML runtime 在无服务器上**不可**用 —— 始终使用带显式包依赖的 Serverless Environments。

### 步骤 3：测试 —— 双分支策略

为测试和生产使用单独的分支，以将仅测试的变通方法排除在交付的代码之外。测试分支是安全的实验沙箱；生产分支只包含生产实际需要的更改。

| 方面               | 测试分支                                    | 生产分支                  |
|----------------------|------------------------------------------------|------------------------------------|
| 名称模式         | `serverless-test-{job_name}-{timestamp}`        | `serverless-prod-{job_name}`       |
| 基础分支          | 任何工作分支                              | 必须是 master                     |
| 目的              | 验证无服务器兼容性                 | 部署到生产               |
| 仅测试的变通方法 | 是（catalog 覆盖、采样数据、日期限制） | **否**                         |
| 兼容性修复  | 是（在此发现它们）                        | 是（应用已验证的）     |
| 作业配置变更   | 是（对于测试作业）                          | 是（对于生产作业）             |
| Catalog              | 测试 catalog                                    | 生产 catalog                 |
| 需要 PR          | 否                                              | 是                                |
| 合并到 master    | 否                                              | 是                                |

**测试分支**（`serverless-test-{job_name}-{timestamp}`）：临时，无需 PR。
1. 从你当前工作分支创建一个分支
2. 设置测试数据：使用作业血缘在测试 catalog 中创建上游表的采样副本（见下方测试数据设置）
3. 参数化 catalog，使 notebook 同时适用于测试和生产数据（见下方 catalog 参数化模式）
4. 应用步骤 2 中发现的所有兼容性修复
5. 创建一个无服务器测试作业并运行它
6. 如果失败，获取错误输出、调试、修复并重试
7. 记录哪些更改是**测试变通方法** vs **真正的兼容性修复**

**生产分支**（`serverless-prod-{job_name}`）：需要 PR，从 master 创建。
1. 从 master（不是从测试分支）创建一个新分支
2. 仅应用真正的兼容性修复 —— 无测试变通方法
3. 应用作业配置变更（见下方作业配置转换）
4. 提交并创建 PR

### 测试数据设置

当作业从生产表读取时，不要让测试作业指向生产数据。而是，在专用测试 catalog 中创建上游表的采样副本，并针对那些运行测试作业。

推荐模式：
1. 从作业的血缘（或从 notebook 的静态扫描）解析其上游表
2. 对每个上游表，运行 `CREATE TABLE IF NOT EXISTS <test_catalog>.<schema>.<table> AS SELECT * FROM <prod_catalog>.<schema>.<table> LIMIT N`（典型 N：10–1000 行）
3. 保持 schema 名称与生产相同 —— 只有 catalog 改变
4. 使操作幂等：跳过已存在的表，因此设置步骤可安全重跑
5. 需要运行中的 SQL 数仓和对测试 catalog 的 `CREATE TABLE` 权限

保留 schema 名称后，相同的 notebook 代码在两个环境中运行 —— 只有 `catalog` 组件的值改变。

### 决策树：这个更改应进入生产吗？

| 更改类型 | 生产？ | 原因 |
|-------------|-------------|--------|
| 移除不兼容的 Spark 配置 | **是** | 无服务器兼容性修复 |
| 更新库版本 | **是** | 无服务器兼容性修复 |
| 将 DBFS 路径替换为 UC 卷 | **是** | 无服务器兼容性修复 |
| 移除 init 脚本，添加 Environments | **是** | 无服务器兼容性修复 |
| 修复硬编码集群设置 | **是** | 无服务器兼容性修复 |
| Catalog 覆盖到测试 catalog | **否** | 仅测试变通方法 |
| 为缺失测试数据做的空 DataFrame 处理 | **否** | 仅测试变通方法 |
| 为更快测试的日期范围限制 | **否** | 仅测试变通方法 |

**简单测试**：如果没有这个更改，生产在无服务器上会失败吗？如果是 → 包含。如果否 → 仅测试分支。

### A/B 对比

两个分支都准备好后，对比输出：

```python
# Compare outputs between classic and serverless runs
classic_df = spark.read.table("main.output.classic_results")
serverless_df = spark.read.table("main.output.serverless_results")

assert classic_df.count() == serverless_df.count(), "Row count mismatch"
assert classic_df.schema == serverless_df.schema, "Schema mismatch"
diff = classic_df.exceptAll(serverless_df)
assert diff.count() == 0, f"Found {diff.count()} differing rows"
```

**临时桥接配置**：如果无服务器运行失败，你可以临时设置受支持的 Spark 配置（如 `spark.sql.shuffle.partitions`）来弥合差距。将这些标记为临时 —— 一旦工作负载稳定就移除。

### 步骤 4：验证 —— 确认并监控

A/B 对比通过后：
1. 合并生产分支 PR
2. 将生产作业切换到无服务器计算
3. 通过系统表（`system.billing.usage`）和预算策略监控成本
4. 移除任何临时桥接配置
5. 设置预算告警以提高成本可见性

### 迁移交付物

在成功的迁移运行结束时，呈现这些产物，让用户能验证工作并检查结果：

| 交付物 | 它是什么 | 为何重要 |
|-------------|------------|----------------|
| 测试分支名称/URL | 带所有兼容性修复和测试变通方法的 `serverless-test-{job_name}-{timestamp}` 分支 | 让用户看到实验期间改变了什么，包括仅测试的调整 |
| 生产分支名称/URL | 仅包含已验证兼容性修复的 `serverless-prod-{job_name}` 分支 | 这是交付的东西 —— 用户从这里审查并合并 PR |
| 测试作业 ID 和运行 URL | 验证迁移的无服务器测试作业 | 证明 notebook 在无服务器上针对采样数据成功运行 |
| 经典 vs 无服务器对比 | A/B 结果摘要（行数、schema 检查、行级差异） | 对无服务器输出匹配经典输出的信心 |
| 无服务器环境规范 | `environments` JSON 块（客户端版本 + 固定依赖） | 可直接粘贴到生产作业配置 |
| 变更摘要 | 进入生产 vs 仅测试的内容列表（含原因） | 供 PR 审查者的审计轨迹 |

如果任何交付物缺失，迁移就不完整 —— 不要标记为完成。

### 停止条件

不要为这些尝试变通方法 —— 将它们呈现给用户并停止：
- 源表、测试 catalog 或工作区的权限失败
- 第 3 类阻塞（R 代码、自定义 Spark 数据源 JAR、需要经典计算的功能）
- SQL 数仓或测试 catalog 不可用
- 重复失败（通常 5+ 次）且错误追踪中没有新信息 —— 改为生成失败报告（见失败报告协议）

## 快速修复参考

### 将 DBFS 路径替换为 UC 卷

```python
# BEFORE (classic)
df = spark.read.csv("dbfs:/mnt/datalake/sales/data.csv", header=True)
df.write.parquet("dbfs:/mnt/output/results")

# AFTER (serverless)
df = spark.read.csv("/Volumes/main/sales/raw_data/data.csv", header=True)
df.write.parquet("/Volumes/main/analytics/output/results")

# Replace mounts with external volumes (SQL):
# CREATE EXTERNAL VOLUME main.data.raw_files LOCATION 's3://my-bucket/data/';
# Then use: /Volumes/main/data/raw_files/

# Pandas paths too:
# BEFORE: pd.read_csv("/dbfs/mnt/data/file.csv")
# AFTER:  pd.read_csv("/Volumes/main/data/volume/file.csv")
```

### 将 RDD 操作替换为 DataFrame

```python
from pyspark.sql import functions as F

# parallelize + map
# BEFORE:
rdd = sc.parallelize([1, 2, 3])
result = rdd.map(lambda x: x * 2).collect()
# AFTER:
df = spark.createDataFrame([(1,), (2,), (3,)], ["value"])
result = df.select((F.col("value") * 2).alias("value")).collect()

# flatMap (word splitting)
# BEFORE:
words = sc.parallelize(["hello world"]).flatMap(lambda l: l.split(" ")).collect()
# AFTER:
df = spark.createDataFrame([("hello world",)], ["line"])
words = df.select(F.explode(F.split("line", " ")).alias("word")).collect()

# groupByKey
# BEFORE:
rdd = sc.parallelize([("a", 1), ("b", 2), ("a", 3)])
grouped = rdd.groupByKey().mapValues(list).collect()
# AFTER:
df = spark.createDataFrame([("a", 1), ("b", 2), ("a", 3)], ["key", "value"])
grouped = df.groupBy("key").agg(F.collect_list("value").alias("values")).collect()

# mapPartitions → applyInPandas
# BEFORE:
def process_partition(iterator):
    yield sum(iterator)
result = sc.parallelize(range(100), 4).mapPartitions(process_partition).collect()
# AFTER:
import pandas as pd
def process_group(pdf: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame({"total": [pdf["id"].sum()]})
result = (spark.range(100).repartition(4)
    .groupBy(F.spark_partition_id())
    .applyInPandas(process_group, schema="total long")
    .collect())

# textFile
# BEFORE: rdd = sc.textFile("/mnt/data/file.txt")
# AFTER:  df = spark.read.text("/Volumes/catalog/schema/volume/file.txt")

# wholeTextFiles
# BEFORE: rdd = sc.wholeTextFiles("/mnt/data/dir/")
# AFTER:  df = spark.read.format("binaryFile").load("/Volumes/catalog/schema/volume/dir/")
```

### 修复流式触发器

```python
# CRITICAL: Omitting .trigger() defaults to ProcessingTime(0) — not supported on serverless

# BEFORE (fails on serverless — no trigger = ProcessingTime default):
query = df.writeStream.format("delta").outputMode("append").start(path)

# BEFORE (fails — explicit ProcessingTime):
query = df.writeStream.trigger(processingTime="10 seconds").start(path)

# AFTER (serverless compatible):
query = (df.writeStream
    .format("delta")
    .outputMode("append")
    .trigger(availableNow=True)
    .option("checkpointLocation", "/Volumes/main/data/checkpoints/stream1")
    .start("/Volumes/main/data/output/stream1"))
query.awaitTermination()

# With OOM prevention (recommended for large sources):
query = (spark.readStream.format("delta")
    .option("maxFilesPerTrigger", 100)          # Delta/Parquet sources
    .option("maxBytesPerTrigger", "10g")         # Limit data per micro-batch
    .load(input_path)
    .writeStream
    .trigger(availableNow=True)
    .option("checkpointLocation", checkpoint_path)
    .start(output_path))

# Kafka: use maxOffsetsPerTrigger
query = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "topic1")
    .option("maxOffsetsPerTrigger", 100000)      # Kafka-specific
    .load()
    .writeStream.trigger(availableNow=True).start(output_path))

# Auto Loader: use cloudFiles.maxFilesPerTrigger (note the prefix)
query = (spark.readStream.format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.maxFilesPerTrigger", 1000)  # cloudFiles. prefix
    .load(landing_path)
    .writeStream.trigger(availableNow=True).start(output_path))
```

### 移除缓存

```python
# BEFORE (classic):
df = spark.read.parquet(path)
df.cache()
df.count()  # materialize cache
result1 = df.filter("status = 'active'")
result2 = df.groupBy("region").agg(F.sum("revenue"))

# AFTER (serverless — remove .cache(); native support coming soon):
df = spark.read.parquet(path)
result1 = df.filter("status = 'active'")
result2 = df.groupBy("region").agg(F.sum("revenue"))

# For truly expensive intermediate results, materialize to Delta:
expensive_df.write.format("delta").mode("overwrite").saveAsTable("main.scratch.intermediate")
result = spark.table("main.scratch.intermediate")

# SQL equivalent:
# BEFORE: CACHE TABLE my_table
# AFTER:  (just remove the CACHE TABLE statement)
```

### 其他快速修复

| 模式 | 修复 | 完整示例 |
|---------|-----|-------------|
| `sc.broadcast` / `sc.accumulator` / `sqlContext.sql` | 使用 SparkSession 等效项：`broadcast()` join、`df.agg()`、`spark.sql()` | [代码模式](references/code-patterns.md) |
| Init 脚本 | 移到 Environment 面板或 `requirements.txt`。不要安装 PySpark。固定版本。 | [代码模式](references/code-patterns.md) |
| Hive Metastore 表 | 使用 HMS Federation 作桥接（`CREATE FOREIGN CATALOG`）或直接迁移（`CREATE TABLE ... AS SELECT`） | [代码模式](references/code-patterns.md) |
| 自定义 JDBC JAR | 使用 Lakehouse Federation（`CREATE CONNECTION ... TYPE POSTGRESQL`）或内置 JDBC（在无服务器上工作） | [代码模式](references/code-patterns.md) |
| Spark UI 调试 | 使用 Query Profile：点击单元输出下的 "See performance"，或 `df.explain(True)` | [代码模式](references/code-patterns.md) |

### 运行时检测无服务器

```python
import os
is_serverless = os.getenv("IS_SERVERLESS", "").lower() == "true"
```

### 将作业配置从经典转换为无服务器

移除 `job_clusters`/`new_cluster`，添加带无服务器规范的 `environments`，将 `job_cluster_key` 替换为 `environment_key`，移除 `init_scripts`。完整的 before/after JSON 和环境版本映射见[配置指南](references/configuration-guide.md)。

**环境版本映射**（匹配工作负载所在的 DBR 版本）：

| 经典 DBR | 无服务器 `spec.client` | Python |
|-------------|--------------------------|--------|
| 13.x、14.x | `"1"` | 3.10 |
| 15.x | `"2"` | 3.11 |
| 16.x+ | `"3"` | 3.12 |

### 作业定义迁移

当迁移作业时，**作业配置 JSON**必须与 notebook 代码一并转换。智能体应执行以下所有操作：

**Init 脚本到无服务器 Environments**：检测作业 JSON 中的 `init_scripts`。提取所有 `pip install` 命令并将它们转换为 Environment `dependencies`。对于有 pip 等效项的 OS 级包（`apt install`/`yum install`）（例如 `apt install python3-opencv` 变成 `opencv-python`），转换它们。将没有 pip 等效项的 OS 级包标记为无服务器不兼容（第 3 类）。

**集群库（Maven/JAR）到 Environment 或卷**：包装 Python 的 JAR 的 Maven 坐标应替换为 Environment 规范中其 PyPI 等效项。DBFS 上的自定义 JAR 需要移到 `/Volumes/<your_catalog>/schema/volume/` 并在那里引用。自定义 Spark 数据源 JAR（v1/v2）是第 3 类阻塞 — 标记它们保留在经典上。

**job_clusters 到无服务器计算**：完全移除 `job_clusters` / `new_cluster` 块。添加带无服务器规范的 `environments` 数组。将每个任务中的 `job_cluster_key` 替换为 `environment_key`。移除 `init_scripts`、`num_workers`、`node_type_id`、`spark_version`。完整的 before/after 示例见[配置指南](references/configuration-guide.md)。

**spark_conf 迁移**：扫描 notebook 中的所有 `spark.conf.set(...)` 调用以及作业 JSON 中的 `spark_conf` 条目。对每一个：
- **支持**（保留）：`spark.sql.shuffle.partitions`、`spark.sql.session.timeZone`、`spark.sql.ansi.enabled`、`spark.sql.files.maxPartitionBytes`、`spark.sql.legacy.timeParserPolicy`、`spark.databricks.execution.timeout`
- **自动调优**（带注释移除）：AQE 配置、Delta 自动压缩、executor/driver 规格、并行度配置
- **凭证配置**（移除）：`fs.s3a.*`、`fs.azure.*` —— 由 UC 外部位置替代
- 在每处移除添加代码注释解释原因：`# Removed: auto-tuned on serverless` 或 `# Removed: use UC external locations instead`

### 为测试参数化 catalog

```python
dbutils.widgets.text("catalog", "main")  # Default to production
catalog = dbutils.widgets.get("catalog")
df = spark.table(f"{catalog}.sales.orders")
# Pass catalog="test_catalog" as a job parameter during testing
```

模拟表 catalog 映射和测试作业创建模式见[配置指南](references/configuration-guide.md)。

### 调试失败的无服务器运行

在猜测之前始终用 `w.jobs.get_run_output(run_id=...)` 获取实际错误。常见错误：

| 错误 | 修复 |
|-------|-----|
| `INFINITE_STREAMING_TRIGGER_NOT_SUPPORTED` | 添加 `.trigger(availableNow=True)` |
| `UNRESOLVED_COLUMN` | 临时视图名称冲突 —— 使用唯一名称 |
| `TABLE_OR_VIEW_NOT_FOUND` | DBFS/HMS 表不可访问 —— 迁移到 UC |
| `Py4JError: ... is not available` | 使用了 SparkContext/RDD —— 重写为 DataFrame |
| 包安装超时 | 固定版本；不要将 PySpark 安装为依赖 |
| `ModuleNotFoundError: No module named 'mlflow'` | 添加到环境规范 `dependencies` —— ML runtime 在无服务器上**不**可用 |
| `SparkContext.getOrCreate() is NOT supported` / `RuntimeError: Only remote Spark sessions` | 替换为 `spark.createDataFrame()` 或 `spark.range()` |
| `UC_FILE_SCHEME_FOR_TABLE_CREATION_NOT_SUPPORTED` | 使用托管表或 `/Volumes/...` 路径 |
| `PERMISSION_DENIED: CREATE SCHEMA on Catalog 'main'` | 在 CREATE 语句之前添加 `spark.sql("USE CATALOG <your_catalog>")` |
| `DATA_SOURCE_NOT_FOUND: Failed to find data source` | 第 3 类阻塞 —— 自定义 JAR 数据源需要经典计算 |
| JAR 运行上的 `NoSuchMethodError: scala.Predef$.wrapRefArray` / `NoClassDefFoundError: scala/Serializable` | Scala 版本不匹配 —— JAR 针对 2.12 编译；无服务器是 2.13.16。针对 2.13.16 重新编译。参见 [JAR 迁移](references/jar-migration.md) |
| JAR 运行上 `org/apache/spark/...` 的 `NoClassDefFoundError` | Spark 被打包而非提供。标记 `databricks-connect % Provided`（并重写任何 `SparkContext`/RDD 源码）。参见 [JAR 迁移](references/jar-migration.md) |
| 迁移后 `SyntaxError` | 确保注释在 MAGIC 块内，而非跨越单元分隔符 |
| `%run` 报 `File './<name>' not found`（或 `%run` 作为 IPython 行 magic 触发） | A1：普通 Python 注释在同一单元中先于 `# MAGIC %run`。将注释移到上方自己的 `# MAGIC %md` 单元。 |
| `TypeError: max() got an unexpected keyword argument 'key'` | A2：`from pyspark.sql.functions import *` 遮蔽了内置 `max`。使用排序+索引而非 `max(..., key=)`。 |
| `TypeError: Object of type PlanMetrics is not JSON serializable` | A3：不支持 `automl.classify/regress/forecast`；`DBDemos.create_mockup_automl_run` 回退在 Spark Connect 上命中此问题。改写为内联 sklearn Pipeline。 |
| `NameError: cannot access free variable 'loaded_model'` | A4：mlflow 2.19.0 `pyfunc.spark_udf` 在 Spark Connect 上的闭包 bug。使用 driver 侧 `pyfunc.load_model` + `toPandas()` + `spark.createDataFrame`，或固定 `mlflow>=2.20.0`。 |
| `ModuleNotFoundError: No module named 'databricks.automl_runtime'` | E1：SDP 镜像缺少 `databricks-automl-runtime`。在 SDP `.py` 库文件顶部发出 `%pip install -q databricks-automl-runtime`。 |
| `HTTP 400: Failed to enforce schema of data ... Model is missing inputs ['id']` | E2：AutoML → sklearn 重写改变了模型签名；将下游 `force_update = False` → `True`。 |
| `log_model` 期间 `get_model_version_by_alias(..., 'Champion')` 报 `RESOURCE_DOES_NOT_EXIST` | M1：在 UC 下从 `log_model` 去掉 `registered_model_name=`；运行后调用 `mlflow.register_model(...)`。 |
| `.latest_versions` 报 `TypeError: 'NoneType' object is not iterable` | M2：`RegisteredModel.latest_versions` 在 UC 上始终为 `None`。使用 `client.search_model_versions(...)` + 排序+索引。 |
| `MlflowException: Model signature is required for registering a model to Unity Catalog` | M3：UC 要求 `log_model` 上有 `signature=`。通过 `infer_signature(X_sample, model.predict(X_sample))` 推断并传给 `log_model(..., signature=signature)`。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |
| `ai_query(endpoint => 'databricks-meta-llama-3-1-405b-instruct')` 上 404 | D1：已弃用的 Foundation Model 端点。通过跨所有迁移文件的全文扫描替换为 `databricks-meta-llama-3-3-70b-instruct`。 |
| `PERMISSION_DENIED: User does not have CREATE CATALOG on Metastore`（即使 catalog 存在） | B2：权限检查在 `IF NOT EXISTS` 短路之前触发。用 `SHOW CATALOGS LIKE '...'` 探测作保护。递归应用，包括 `_resources/` 和 `config*` 文件。 |
| SDP 并行部署时 `Table is already managed by pipeline <pipeline-id>` | H2：为迁移管道的目标 `schema` 加后缀（例如 `<orig>_skill_migrated`）。 |
| `DELTA_FAILED_TO_MERGE_FIELDS: prediction (Double) vs prediction (Integer)` | M4：AutoML → sklearn 重写输出 `float64` 预测；二元分类器写入前转换为 `IntegerType`。参见[UC 上的 MLflow](references/mlflow-uc-patterns.md)。 |

完整错误参考和 SDK 代码示例见[配置指南](references/configuration-guide.md)。

## 性能模式选择

| 标准 | Performance-Optimized | Standard |
|----------|-----------------------|----------|
| 启动时间 | <50 秒 | 4-6 分钟 |
| 成本 | 较高 | 显著较低 |
| 可用于 | Notebook、Jobs、SDP | 仅 Jobs 和 SDP |
| 最适用于 | 交互工作、开发、时间敏感 | 批处理 ETL、调度管道 |
| 默认 | 是（UI 和 API） | 必须显式选择 |

**Standard 模式不**可用于 notebook。notebook 始终使用 Performance-Optimized。

## 需知的无服务器默认值

| 设置 | 值 |
|---------|-------|
| REPL VM 内存 | 默认 8GB（可选高内存选项） |
| 最大 executor | 32（Premium）、64（Enterprise）—— 通过支持提高 |
| 支持的 Spark 配置 | 仅 6 个（见上方类别 D） |
| 调试 | Query Profile（无 Spark UI） |
| ANSI SQL | 默认启用（可配置） |

## 失败报告协议

当迁移失败或命中不可迁移的模式时，生成结构化失败报告，并向用户提供一键将其作为 GitHub issue 提交的路径。这个反馈循环是技能学习的方式 —— 没有它，缺口就不会被发现。

完整的脱敏清单、URL 编码配方和示例预填链接见[失败报告](references/failure-reporting.md)。

### 决策树：何时提议提交 issue

**任何时候工作负载无法按原样完全迁移到无服务器，都提议提交 GitHub issue。** 来自"已知"模式（R、Scala、自定义 JAR 数据源、JVM 访问、第三方连接器）的报告与来自未知模式的报告一样有价值 —— 它们告诉维护者用户最常遇到哪些缺口，这驱动优先级。

具体来说，如果**任何**以下为真，则**始终**提议：

1. **工作负载包含任何第 3 类（仅经典）阻塞** —— R、Scala notebook 单元、自定义 JAR 数据源、JVM/Py4J 访问、无无服务器等效项的第三方连接器、原生二进制依赖等。模式"记录为第 3 类"这一事实不是跳过提议的理由。
2. **重试耗尽** —— `retry_count >= max_retries`（通常 5）且最终状态为 FAILED
3. **未知模式** —— 检测到不在技能目录中的经典计算构造
4. **修复未解决** —— 已应用已知修复但工作负载在无服务器上仍失败
5. **明确请求** —— 用户调用 `/migration-report`

**不要提议提交**仅当：

- 迁移完全成功（即使经过重试），或
- 工作负载已无服务器兼容且无需更改。

### 如何生成报告

将 JSON 文件写入 `~/.databricks-migration-skill/reports/failure-<ISO-timestamp>.json`。如果目录不存在则创建它。

**Schema**（严格遵循 —— 无自由文本代码或标识符）：

```json
{
  "report_version": "1.1",
  "report_id": "<uuid-v4>",
  "skill_version": "<from SKILL.md frontmatter metadata.version>",
  "timestamp": "<ISO 8601 UTC>",
  "failure_phase": "analyze | migrate | test | validate",
  "detected_patterns": [
    {"category": "A", "pattern_id": "rdd_parallelize", "count": 3}
  ],
  "attempted_fixes": [
    {"pattern_id": "rdd_parallelize", "fix_applied": "<fix_id>", "attempt_number": 1, "outcome": "failed"}
  ],
  "final_error_category": "unknown_api | missing_library | data_access | permission | custom_data_source | jvm_access | unsupported_language | other",
  "final_error_signature": "<SHA256 of top 3 stack frames, NOT the frames themselves>",
  "retry_count": 5,
  "total_duration_seconds": 245,
  "notebook_characteristics": {
    "lines_of_code": 180,
    "language": "python | sql | scala | r",
    "uses_streaming": false,
    "uses_ml_libraries": true,
    "databricks_runtime_source": "<DBR version only, no cluster identifiers>"
  }
}
```

### 报告**不得**包含的内容

硬性要求 —— 报告必须可安全地在 GitHub Issues 上公开分享：

- **无代码内容** —— 仅模式 ID（例如 `rdd_parallelize`），绝不代码片段、函数体，甚至单行示例
- **无文件路径** —— 无 notebook 名称、目录路径、工作区 URL 或 DBFS 路径
- **无错误消息文本** —— 仅错误类别枚举和哈希签名
- **无标识符** —— 无表名、列名、catalog 名、schema 名、密钥 scope 名、用户邮箱、工作区 ID 或账户 ID
- **无内部 Databricks 引用** —— 无 Databricks 员工姓名、内部代号（例如不在公开文档中的产品代号）、`go/` 链接、Confluence 页面 ID、Google Doc ID、Slack 用户或频道 ID（`U…`、`C…`）、PROD-* / SEV-* / SC-* 工单号
- **无客户引用** —— 无公司名、客户系统产品名，或任何会识别工作区所属组织的东西
- **无凭证** —— 无 token、API 密钥、连接字符串、JDBC URL 或服务主体 ID
- **无数据描述** —— 无列值样本、绑定到特定表的行数，或超出 `notebook_characteristics` 字段的 schema 指纹

### 匿名化安全检查

在写入报告之前，对照此模式检查清单扫描每个字符串字段。如果任何模式匹配，**丢弃违规字段**（不要部分脱敏 —— 空字符串比冒险泄露更安全）：

| 模式 | 要清除什么 |
|---------|---------------|
| `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` | 邮箱地址 |
| `dbfs:/`、`/dbfs/`、`s3://`、`abfss://`、`gs://`、`wasbs://` | 云存储路径 |
| `https?://[a-z0-9-]+\.cloud\.databricks\.com`、`https?://adb-\d+\.\d+\.azuredatabricks\.net` | 工作区 URL |
| `U[A-Z0-9]{8,}`、`C[A-Z0-9]{8,}` | Slack 用户 / 频道 ID |
| `\bgo/[a-z0-9-]+\b` | go/ 链接 |
| `\b(PROD|SEV|SC|JIRA)-\d+\b` | 内部工单 ID |
| `[0-9a-f]{20,}`（启发式） | 可能的 doc/文件/工作区 ID |
| 来自所分析 notebook 的 Catalog/schema/表名字面量 | 丢弃并替换为 `"<redacted>"` |

`notebook_characteristics` 字段是工作负载元数据的唯一安全表面。没有扩展此检查清单，不要添加新字段。

### 确定性的序列化后清除（必需）

上述脱敏发生在生成时，取决于模型应用每一条规则。这在最终通向公开 GitHub issue 的路径上是不够的。将报告序列化为 JSON 后：

1. **在最终 JSON 文件上重新运行 MUST-NOT-CONTAIN 正则集作为字面文本搜索**。匹配上表中的相同模式，加上所分析 notebook 中引用的任何 catalog/schema/表名。
2. **如果任何模式匹配，拒绝显示预填 URL 或 `gh issue create` 命令**。打印本地文件路径，列出匹配的模式，并告诉用户在分享前手动脱敏文件。
3. 只有当序列化后清除干净时，才可以显示预填 URL。

这个确定性检查不可协商；即使你确信已应用生成时脱敏，也不要跳过它。

### 生成报告后 —— 输出模板

当上方决策树说"提议提交"时，**默认输出仅限本地**。只有在用户确认本地文件且序列化后清除（见上文）干净之后，才显示预填 URL 和 `gh` 命令。

默认响应 —— 始终包含：

1. 本地报告文件路径（`~/.databricks-migration-skill/reports/failure-<timestamp>.json`，填入 `<timestamp>`）。
2. 一行说明报告仅包含模式 ID 和 notebook 特征，无代码或标识符。
3. 一个提示：*"This is a draft. Open the file, confirm the redaction looks right, then tell me to share it. I'll generate the pre-filled GitHub issue URL once you've confirmed."*

只有在用户明确确认（例如 *"share it"*、*"file the issue"*、*"looks good"*）**且**上方确定性序列化后清除返回干净之后，才生成：

- **选项 A** —— 一个完整的预填 `https://github.com/databricks/databricks-agent-skills/issues/new?template=migration-feedback.md&title=<…>&body=<…>` URL，两个参数均 URL 编码。
- **选项 B** —— 字面的 `gh issue create --repo databricks/databricks-agent-skills …` 命令，body-file 指向本地报告。

不要在写入文件的那一轮同时生成 URL 或 `gh` 命令。两轮：写入 + 提议审查，然后在明确确认后发布。

使用这个确切的收尾模板，替换 `<…>` 占位符：

```
Migration could not complete. A failure report has been generated at:

  ~/.databricks-migration-skill/reports/failure-<timestamp>.json

The report contains anonymized diagnostic data (detected pattern IDs, error
category, retry count, notebook characteristics) and no code content or PII.
Submission is optional and opt-in.

To help improve this skill, file the report as a GitHub issue:

  Option A — One-click in browser (pre-filled):
    <PREFILLED_ISSUE_URL>

  Option B — From the terminal (if you have the GitHub CLI installed):
    gh issue create \
      --repo databricks/databricks-agent-skills \
      --title "<TITLE>" \
      --body-file ~/.databricks-migration-skill/reports/failure-<timestamp>.json \
      --label migration-skill

Before submitting, please open the JSON and confirm nothing sensitive
slipped through. We never transmit reports automatically.
```

这样构建 `<PREFILLED_ISSUE_URL>`：

1. **标题**：`[migration-skill] <final_error_category> in <failure_phase> phase`
   示例：`[migration-skill] custom_data_source in migrate phase`
2. **正文**：issue 模板的 markdown 骨架（Category、Environment、Description、Failure report JSON 用 ` ```json ` 围栏）内联报告 JSON。
3. **URL 编码**标题和正文（空格用 `%20`、`#` 用 `%23`、换行用 `%0A` 等）。
4. **最终 URL**：
   `https://github.com/databricks/databricks-agent-skills/issues/new?template=migration-feedback.md&title=<URL-encoded title>&body=<URL-encoded body>`

如果你的运行时实际上无法写入文件（沙箱、无文件系统写入），仍显示文件将所在的路径并生成选项 A 和 B。用户可以自己将 JSON 写入磁盘。

完整配方和示例见[失败报告](references/failure-reporting.md)。

**绝不自动传输报告。** 用户拥有他们的数据，必须在分享前审查。如果用户拒绝，不要催促 —— 记录本地报告路径并继续。

## 成功报告

当迁移成功时，生成每个工作负载的报告，结构与失败报告相同（减去脱敏发布步骤），列出检测到的模式和为每个工作负载应用的修复。写入 `~/.databricks-migration-skill/reports/success-<timestamp>.json` 并告诉用户文件路径。

## 多工作负载迁移

当范围涉及多个独立工作负载时，并行迁移它们（例如每个工作负载一个子智能体）。单个工作负载内的逐 notebook 步骤保持串行，如步骤 1.5 所述。

## 参考指南

关于超出上方快速修复的详细变通方法和代码示例：

- [兼容性检查](references/compatibility-checks.md) —— 带全部 40+ 检查的完整模式检测表
- [流式迁移](references/streaming-migration.md) —— 触发器迁移、SDP 持续模式、持续作业
- [网络与安全](references/networking-and-security.md) —— VPC 对等到 NCC、Private Link、防火墙设置
- [代码模式](references/code-patterns.md) —— 每种迁移模式的完整 before/after 代码示例
- [配置指南](references/configuration-guide.md) —— 支持的 Spark 配置、Environments 设置、预算策略
- [UC 上的 MLflow](references/mlflow-uc-patterns.md) —— AutoML 重写为 sklearn、UC 感知注册、`latest_versions` 替换、`spark_udf` 闭包 bug 修复、预测列 dtype 对齐
- [多源枚举](references/multi-source-enumeration.md) —— 解析 `bundle_config.py` 并在逐 notebook 分析前抓取上游 git 源
- [失败报告](references/failure-reporting.md) —— 脱敏清单 + 预填 GitHub issue URL 配方（用于迁移无法完成时）
- [在 Databricks Genie Code 中安装](references/install-in-databricks-genie-code.md) —— 在 Databricks 工作区内运行本技能
- [JAR 迁移](references/jar-migration.md) —— 迁移编译的 Scala JAR（spark_jar_task）：Scala 2.13.16、Databricks Connect、与无服务器内核类路径的依赖冲突、sbt 修复、构建/测试/部署

## 文档

- 无服务器计算概览：https://docs.databricks.com/en/compute/serverless/
- **迁移指南**：https://docs.databricks.com/en/compute/serverless/migration
- 限制：https://docs.databricks.com/en/compute/serverless/limitations
- 最佳实践：https://docs.databricks.com/en/compute/serverless/best-practices
- 无服务器 notebook：https://docs.databricks.com/en/compute/serverless/notebooks
- 无服务器作业：https://docs.databricks.com/en/jobs/run-serverless-jobs
- 无服务器 SDP：https://docs.databricks.com/en/ldp/serverless
- Spark Connect vs 经典：https://docs.databricks.com/en/spark/connect-vs-classic
- Unity Catalog 升级：https://docs.databricks.com/en/data-governance/unity-catalog/upgrade/
- 支持的 Spark 配置：https://docs.databricks.com/en/spark/conf#serverless
