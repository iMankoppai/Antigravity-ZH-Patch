---
name: databricks-serverless
description: "用于 Databricks 作业、Lakeflow 管道和声明式自动化捆绑包（DABs）的无服务器计算，支持 STANDARD 或 PERFORMANCE_OPTIMIZED，并且仅在无服务器无法运行该工作负载时才用经典计算。适用于创建、部署、调度或编辑作业或管道，或决定其计算时。在编写作业规范之前调用。对于迁移现有的经典工作负载，请使用 databricks-serverless-migration。"
compatibility: Requires databricks CLI (>= v0.292.0)
metadata:
  version: "0.3.2"
parent: databricks-core
---

# 在无服务器上部署 Databricks 作业和管道

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

本技能决定计算。若其他技能或示例（例如 `databricks-jobs`）展示了集群配置，应改为遵循本技能。

无服务器是你创建的每个作业、管道和捆绑包的默认计算。如果用户明确要求集群，就按他们说的做，并用一行提及无服务器选项。编辑现有作业时，保持其计算不变，除非用户要求更改；你添加的任务遵循本技能。

## 1. 无服务器还是经典

仅在以下情况使用经典计算：

- R 代码，或 notebook 单元格中的 Scala（`%scala`）：无服务器 notebook 只运行 Python 和 SQL；
- 自定义 Docker 镜像；
- 没有 pip 等效替代的 OS 包（`apt-get`）或原生库；
- 自定义 Spark 数据源 JAR；
- 对实例类型或 Databricks Runtime 版本有明确硬性要求；
- 用户明确请求；
- 现有代码超出第 5 节的预算；
- 没有无服务器的工作区：如果创建或运行作业因那里无服务器不可用而失败，就把整个作业放到经典上并说明。

然后只给被阻塞的任务一个集群（一个小的 `job_clusters` 条目，使用最新的 LTS runtime 和 `autoscale: {min_workers: 1, max_workers: 4}`），其余每个任务保持无服务器，并用一行说明阻塞原因。对于被阻塞的管道，给管道一个 `clusters` 块，而不是 `serverless: true`。

以下不是用经典的理由：JAR 任务中的 Scala 或 Java（JAR 任务在无服务器上运行）、GPU（无服务器 GPU）、大数据、长运行时间、Kafka、成本（在大多数情况下，无服务器 STANDARD 与按需经典持平或更便宜），或习惯。

## 2. 让每个任务都在无服务器上

- **新作业：** 省略 `new_cluster`、`job_clusters`、`job_cluster_key`、`existing_cluster_id`、`instance_pool_id`、`node_type_id`、`num_workers`、`autoscale`、`spark_version`。没有集群的任务在无服务器上运行。在现有作业中，保留它已有的集群设置。
- **Notebook 任务** 无需其他。**Python 脚本、wheel 和 JAR 任务** 从作业级环境获取其库。使用工作区提供的最新环境版本，作为带引号的字符串：
  ```yaml
  environments:
    - environment_key: default
      spec:
        environment_version: "4"                # example; use the latest
        dependencies: ["requests==2.32.3"]   # pin versions; JARs go in java_dependencies
  tasks:
    - task_key: main
      spark_python_task: {python_file: /Workspace/.../main.py}
      environment_key: default
  ```
- **SQL 任务：** 一个无服务器 SQL 数仓。**管道：** `serverless: true`，无 `clusters` 块。
- **流式：** `.trigger(availableNow=True)`，这是无服务器支持的触发器（没有 `processingTime` 或 `continuous` 触发器）。对于常驻处理，在一个持续作业中运行该流（`continuous: {pause_status: UNPAUSED}`），它会在一次运行结束后立即启动下一次运行，或使用持续管道。
- **为你创建的每个作业打上标签** 以便资源跟踪，正如其他 Databricks 技能所做：作业级 `tags: {"aidevkit_project": "ai-dev-kit"}`。保留用户已有的标签。

## 3. 选择性能模式

设置作业级 `performance_target`：

- **`STANDARD`** 当没有任何时间紧迫的事项、而成本比速度更重要时：定时批处理和 ETL、每夜或每周运行，或任何用户声明无延迟需求的作业。运行会在几分钟内而非几秒内开始，且成本更低。这是默认选择。
- **`PERFORMANCE_OPTIMIZED`** 仅当用户指定了 SLA 或相对于运行时间很紧的截止时间、有人等待结果，或作业每 30 分钟或更频繁地运行时。

`performance_target` 应用于整个作业，包括 notebook 任务（只有交互式 notebook 始终以性能优化方式运行）。用一行说明你选择了哪种模式及原因，例如 "STANDARD：每夜批处理，无截止时间。"
无服务器 GPU 任务忽略 `performance_target`。

管道没有自己的 `performance_target`。要调度管道，从带 `pipeline_task` 的作业触发它，并在该作业上设置模式；作业的模式应用于管道更新。持续管道只有在持续作业运行它时才以 STANDARD 运行。

## 4. 你编写的代码从一开始就在无服务器上运行

无服务器读取 Unity Catalog 表、`/Volumes/...` 路径、位于 Unity Catalog 外部位置之后的云路径，以及 `dbfs:/databricks-datasets/` 下的示例数据。它无法读取 DBFS 挂载（`dbfs:/mnt/...`）或其他 DBFS 根路径；只有这些才算作 DBFS 阻塞。

仅限 DataFrame 和 SQL API（无 RDD、`sc.*`、`spark.sparkContext`）；Unity Catalog 三段式表名；使用 `/Volumes/...` 路径而非 DBFS 挂载（`dbfs:/mnt/...`）；`availableNow` 流式触发器；无 `.cache()` 或 `.persist()`；无用于 executor、driver 或内存设置的 `spark.conf.set`；在环境中固定依赖，绝不用 init 脚本。

## 5. 现有代码：快速检查，而非迁移

用户正在等待部署。花一小段时间通读一遍，然后部署。

1. **只扫描作业运行的文件**（文本搜索，如 `grep` 或 `rg`；不要读取整个仓库）查找：`sc.`、`sparkContext`、
   `.rdd`、`parallelize`、`mapPartitions`、`reduceByKey`、`groupByKey`、`dbfs:/`、`/dbfs/`、
   `dbutils.fs.mount`、`.cache(`、`.persist(`、`spark.conf.set`、`processingTime`、`continuous=`、
   `writeStream`、`hive_metastore.`、`GLOBAL TEMP`、`hivevar`、`init_scripts`、`apt-get`、`docker`，
   以及其他语言：`%scala` 或 `%r` 作为整个 magic（`# MAGIC %r`，而非 `%run`）、`.r` 文件和 R notebook、`SparkR` 和 `sparklyr`。R 和 Scala 单元转到经典（第 1 节）。
2. **次要阻塞：修复它们并在无服务器上部署**，前提是每个修复都是机械且局部的、保留逻辑、无需新基础设施，并且总共约 5 处小修改或更少：
   - 删除 `.cache()`、`.persist()`、`.unpersist()`、`setLogLevel`、executor/driver/AQE 的 `spark.conf.set` 行
   - 将 `pip install` 或 `requirements.txt` 移入环境并固定版本
   - 对未设置触发器的流添加 `.trigger(availableNow=True)`，且该作业本来就按计划运行（带 `processingTime` 或 `continuous` 触发器的流是第 4 步阻塞）
   - 仅当该卷的存储位置正是挂载的来源时，才将 `dbfs:/mnt/...` 路径替换为 `/Volumes/...` 路径，以便作业读取相同的数据；仅有相似名称的卷还不够。否则该挂载是第 4 步阻塞。
   - 当同一文件创建并读取该视图时，`CREATE GLOBAL TEMP VIEW` 变为 `CREATE TEMP VIEW`，其对 `global_temp.<view>` 的读取变为 `<view>`（无服务器没有全局临时视图）；若另一个任务或 notebook 读取该全局临时视图，则是第 4 步阻塞
   - 仅当你知道哪个 Unity Catalog catalog 存放该表（例如作业的默认 catalog）时，才为两段式表名添加 catalog；`hive_metastore` 中的表是第 4 步阻塞

   在你的回复中列出你所做的每一处修改。
3. **RDD 或 SparkContext 代码：将其转换为 DataFrame 并在无服务器上部署**，仅当以下全部成立时：
   - 它是一个约 200 行或更少的文件；
   - 该变更是纯 API 转换：相同的逻辑，用 DataFrame 或 SQL 表达；
   - 每个输入路径、表、输出表和参数都保持完全不变。绝不要替换成另一个数据集，哪怕是示例数据集；
   - 每个输入都已能在无服务器上读取（第 4 节：Unity Catalog 表、已有的 `/Volumes/...` 路径、外部位置之后的云路径，或 `dbfs:/databricks-datasets/`），因此无需做任何新设置。

   将原始文件另存为旁边的 `<name>.classic.py`，并让作业指向翻译后的文件。告诉用户该翻译尚未运行，并建议做一次测试运行，将输出与经典版本比较。
4. **任何更大的改动：不要重写。** 现在就把该任务放到经典上（第 1 节），保持其他任务无服务器，并以这句话结束："Kept <task> on classic because <blocker>. To move it to serverless, use the databricks-serverless-migration skill." 更大意味着：任何不满足第 3 步条件的 RDD 代码（例如它读取 DBFS 挂载）、没有位于同一存储上卷的挂载、Hive Metastore 到 Unity Catalog、重新编译 JAR、网络变更、改变流的作为（常驻的 `processingTime` 或 `continuous` 流），或除第 3 步翻译之外约超过 5 处修改。

不要停下来询问是否要迁移。先部署，然后报告你做了什么。

## 常见问题

| 问题 | 解决方案 |
|-------|----------|
| `Libraries field is not supported for serverless task` | 将库移入 `environments[].spec.dependencies`（JAR：`java_dependencies`）并在任务上设置 `environment_key` |
| 无服务器作业启动太慢 | `performance_target: PERFORMANCE_OPTIMIZED`，仅当用户需要快速启动时（第 3 节） |
| `Only remote Spark sessions ... are supported` 或其他 RDD 错误 | RDD/SparkContext 代码：第 5 节，第 3 或第 4 步 |
| 在 `dbfs:/mnt/...` 上出现 `[PATH_NOT_FOUND]` 或无法访问 | DBFS 挂载在无服务器上不可用：使用位于同一存储上的卷（第 5 节，第 2 步），否则第 4 步 |
| 工作区未启用或无服务器不可用 | 将作业放到经典上并告知用户（第 1 节） |
| 同级技能的示例对新作业使用了 `job_clusters` | 省略集群块；本技能决定计算。现有作业保持其计算 |

## 相关技能

- **databricks-core** - CLI 基础、身份验证、profile
- **databricks-jobs** - 作业结构、任务类型、触发器、通知
- **databricks-pipelines** - Lakeflow Spark Declarative Pipelines
- **databricks-serverless-migration** - 将现有经典工作负载迁移到无服务器

## 文档

- [作业的无服务器计算](https://docs.databricks.com/jobs/run-serverless-jobs)
- [无服务器计算限制](https://docs.databricks.com/compute/serverless/limitations)
- [无服务器依赖（environments）](https://docs.databricks.com/compute/serverless/dependencies)
- [无服务器管道](https://docs.databricks.com/ldp/serverless)
