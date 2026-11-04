---
name: databricks-synthetic-data-gen
description: "使用 Spark + Faker 生成逼真的合成数据（强烈推荐）。支持无服务器执行、多种输出格式（Parquet/JSON/CSV/Delta），并可扩展到数千到数百万行。对于小型数据集（<10K 行），可选择在本地生成并上传到卷。当用户提及 'synthetic data'、'test data'、'generate data'、'demo dataset'、'Faker' 或 'sample data' 时使用。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

> Catalog 和 schema **始终由用户提供** —— 绝不要默认使用任何值。如果用户未提供，请询问。对于任何 UC 写入，**始终在写入数据之前创建 schema（如果不存在）**。

# Databricks 合成数据生成

使用 **Spark + Faker + Pandas UDF**（强烈推荐）为 Databricks 生成逼真的、有故事性的合成数据。

## 数据必须讲述一个业务故事

合成数据应展示 Databricks 如何帮助解决真实的业务问题。

**模式：** 某处出现问题 → 业务影响（$）→ 分析根因 → 找出受影响的客户 → 修复并预防。

**关键原则：**
- **问题 → 影响 → 分析 → 解决方案** —— 包含一个造成可衡量业务影响的事件、异常或问题。数据让你能够找到根因并据此采取行动。
- **切合行业但简单** —— 使用领域术语（例如 "SLA breach"、"churn"、"stockout"），但保持 schema 易于理解。几张表，关系清晰。
- **带 $ 影响的业务指标** —— 收入、MRR、成本、转化率。每个故事都需要一个美元符号来表明它为何重要。
- **表与表相互解释** —— 工单激增？事件表显示了那次停机。收入下降？流失表显示了谁离开了以及为什么。所有数据相互关联。
- **可操作的洞见** —— 数据应回答：发生了什么？谁受影响？代价是多少？我们如何预防？

**为什么不要扁平的分布：** 均匀数据没有故事 —— 没有尖峰、没有异常、没有群组、没有 20/80、没有偏斜，没有任何可调查之处。它无法展示 Databricks 在根因分析上的价值。

## 参考

| 何时 | 指南 |
|------|-------|
| 用户提及 **ML 模型训练** 或复杂时间模式 | [references/1-data-patterns.md](references/1-data-patterns.md) —— 可训练 ML 的数据、时间乘数、行一致性 |
| 生成过程中的错误 | [references/2-troubleshooting.md](references/2-troubleshooting.md) —— 修复常见问题 |

## 关键规则

1. **数据讲述一个故事** —— 出现问题，影响 $，可被分析和修复。展示 Databricks 的价值。
2. **所有数据都服务于故事** —— 每张表和每列都必须一致，并能在仪表板或 ML 模型中使用。没有孤立数据，没有随机噪声 —— 如果它不能帮助解释或绘制未来的仪表板或预测，就不要生成它。
3. **行业术语，简单 schema** —— 使用领域特定词汇，但保持易于理解（少量表，清晰的关系）
4. **绝不用均匀分布** —— 偏斜的分类、对数正态金额、80/20 模式。扁平 = 没有故事 = 无用
5. **足够的数据以显现趋势** —— 主表约 100K+ 行，以便模式在聚合后仍能保留
6. **询问 catalog/schema** —— 绝不默认，生成前始终确认
7. **提交计划以待批准** —— 在编写代码之前展示表、分布、假设
8. **主表优先** —— 先生成父表，写入 Delta，然后创建具有有效外键的子表
9. **使用 Spark + Faker + Pandas UDF** —— 可扩展、并行。只有当用户明确要求本地 + <30K 行时才用 Polars
10. **默认使用 Databricks Connect Serverless 生成数据** —— 如需则在 python 3.12 上更新 databricks-connect（除非指示不要使用 Databricks Connect，否则避免使用 execute_code）
11. **不用 `.cache()` 或 `.persist()`** —— 无服务器不支持。写入 Delta，再读回进行 join
12. **不用 Python 循环或 `.collect()`** —— 使用 Spark 并行。不在 driver 侧迭代，避免 Pandas↔Spark 转换

## 生成计划工作流

**在生成任何代码之前，你必须提交一个计划以供用户批准。**

### ⚠️ 必须做：继续之前确认 Catalog

**你必须明确询问用户使用哪个 catalog。** 不要假设或未经确认就继续。

给用户的示例提示：
> "Which Unity Catalog should I use for this data?"

在提交计划时，始终醒目地展示所选的 catalog：
```
📍 Output Location: catalog_name.schema_name
   Volume: /Volumes/catalog_name/schema_name/raw_data/
```

这样用户很容易发现并在需要时纠正。

### 步骤 1：收集需求

询问用户：
- **Catalog/Schema** —— 使用哪个 catalog？
- **领域** —— 电商、支持工单、IoT、金融？（使用行业术语）

**如果用户未指定故事：** 提出一个。不要生成平淡的数据 —— 建议一个事件、异常或趋势来展示 Databricks 的价值（例如 "我会加入一次系统停机，它导致工单激增和流失 —— 这让你能演示根因分析"）。

### 步骤 2：带故事提交计划

展示清晰的规格说明，**并凸显业务故事和你的假设**：

```
📍 Output Location: {user_catalog}.support_demo
   Volume: /Volumes/{user_catalog}/support_demo/raw_data/

📖 Story: A payment system outage causes support ticket spike. Resolution times
   degrade, enterprise customers churn, revenue drops $2.3M. With Databricks we
   identify the root cause, affected customers, and prevent future impact.
```

| 表 | 描述 | 行数 | 关键假设 |
|-------|-------------|------|-----------------|
| customers | 带层级、MRR 的客户档案 | 10,000 | 企业客户占 10% 但贡献 60% 收入 |
| tickets | 带优先级、解决时长的支持工单 | 80,000 | 停机期间激增、SLA 违约 |
| incidents | 系统事件（停机、部署） | 50 | 月中发生支付停机 |
| churn_events | 带原因的客户取消 | 500 | 在糟糕支持体验后激增 |

**业务指标：**
- `customers.mrr` —— 面临风险的收入（$）
- `tickets.resolution_hours` —— SLA 表现
- `churn_events.lost_mrr` —— 流失影响（$）

**这份数据讲述的故事：**
- 事件表显示 3 月 15 日支付停机
- 停机期间工单激增 5 倍，解决时长从 4h 恶化到 18h
- 遭遇 SLA 违约的企业客户在 3 周后流失
- 总影响：损失 $2.3M MRR，可追溯到一个事件
- **Databricks 的价值：** 根因分析、识别高风险客户、构建告警

**询问用户**："Does this story work? Any adjustments?"

### 步骤 3：询问数据特性

- [x] 偏斜（非均匀分布） - **默认启用**
- [x] Join（引用完整性） - **默认启用**
- [ ] 坏数据注入（用于数据质量测试）
- [ ] 多语言文本
- [ ] 增量模式（追加而非覆盖）

### 生成前检查清单

- [ ] **Catalog 已确认** - 用户明确批准使用哪个 catalog
- [ ] 输出位置在计划中醒目展示（易于发现/更改）
- [ ] 表规格已展示并获批准
- [ ] 关于分布的假设已确认
- [ ] 用户已确认计算偏好（推荐在无服务器上使用 Databricks Connect）
- [ ] 已选择数据特性

**在用户批准计划（包括 catalog）之前，不要进入代码生成阶段。**

### 生成后验证

使用 `databricks experimental aitools tools query` 验证生成的数据（行数、分布、引用完整性）。直接查询 parquet 文件：

```bash
databricks experimental aitools tools query --warehouse $WAREHOUSE_ID "
SELECT COUNT(*) FROM parquet.\`/Volumes/CATALOG/SCHEMA/raw_data/customers\`
"
```

完整的验证示例见 [references/2-troubleshooting.md](references/2-troubleshooting.md)。

## 使用 Databricks Connect Spark + Faker 模式

```python
from databricks.connect import DatabricksSession
from pyspark.sql import functions as F
from pyspark.sql.types import StringType
import pandas as pd

# Setup serverless Spark session
spark = DatabricksSession.builder.serverless(True).getOrCreate()

# Pandas UDF pattern - import lib INSIDE the function (libs must be installed locally)
@F.pandas_udf(StringType())
def fake_name(ids: pd.Series) -> pd.Series:
    from faker import Faker  # Import inside UDF
    fake = Faker()
    return pd.Series([fake.name() for _ in range(len(ids))])

# Generate with spark.range, apply UDFs
customers_df = spark.range(0, 10000, numPartitions=16).select(
    F.concat(F.lit("CUST-"), F.lpad(F.col("id").cast("string"), 5, "0")).alias("customer_id"),
    fake_name(F.col("id")).alias("name"),
)

# Write to Volume as Parquet (default for raw data)
# Path is a folder with table name: /Volumes/catalog/schema/raw_data/customers/
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.{SCHEMA}.raw_data")
customers_df.write.mode("overwrite").parquet(f"/Volumes/{CATALOG}/{SCHEMA}/raw_data/customers")
```

**按规模设置分区：** `spark.range(N, numPartitions=P)`
- <100K 行：8 个分区
- 100K-500K：16 个分区
- 500K-1M：32 个分区
- 1M+：64+ 个分区

**输出格式：**
- **Parquet 到卷**（默认）：`df.write.parquet("/Volumes/.../raw_data/table")` —— 用于管道的原始数据
- **Delta 表**：`df.write.saveAsTable("catalog.schema.table")` —— 如果用户想要可查询的表
- **JSON/CSV**：小型维度表，复刻遗留系统

## 性能规则

生成的脚本必须高度高效。**绝不**做这些：

| 反模式 | 为何慢 | 改为这样做 |
|--------------|---------------|-----------------|
| driver 上的 Python 循环 | 单线程，无并行 | 使用 `spark.range()` + Spark 操作 |
| `.collect()` 然后迭代 | 将所有数据拉入 driver 内存 | 将数据留在 Spark 中，使用 DataFrame 操作 |
| Pandas → Spark → Pandas | 序列化开销，破坏分布式 | 留在 Spark 中，仅对 UDF 使用 `pandas_udf` |
| 读写临时文件 | 不必要的 I/O | 串联 DataFrame 转换 |
| 标量 UDF | 逐行处理 | 使用 `pandas_udf` 进行批处理 |

**好的模式：** `spark.range()` → Spark 转换 → `pandas_udf` 处理 Faker → 直接写入

## 常见模式

### 加权分类（绝不用均匀）
```python
F.when(F.rand() < 0.6, "Free").when(F.rand() < 0.9, "Pro").otherwise("Enterprise")
```

### 对数正态金额（在 pandas UDF 中）
使用 `np.random.lognormal(mean, sigma)` —— 始终为正，长尾：
- Enterprise：`lognormal(7.5, 0.8)` → 中位数约 $1800
- Pro：`lognormal(5.5, 0.7)` → 中位数约 $245
- Free：`lognormal(4.0, 0.6)` → 中位数约 $55

### 日期范围（过去 6 个月）
```python
END_DATE = datetime.now()
START_DATE = END_DATE - timedelta(days=180)
```

### 基础设施（始终在脚本中创建）
```python
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {CATALOG}.{SCHEMA}")
spark.sql(f"CREATE VOLUME IF NOT EXISTS {CATALOG}.{SCHEMA}.raw_data")
```

### 引用完整性（FK 模式）
先将主表写入 Delta，然后读回进行 FK join（无服务器上不用 `.cache()`）：
```python
# 1. Write master table
customers_df.write.mode("overwrite").saveAsTable(f"{CATALOG}.{SCHEMA}.customers")

# 2. Read back for FK lookup
customer_lookup = spark.table(f"{CATALOG}.{SCHEMA}.customers").select("customer_idx", "customer_id")

# 3. Generate child table with valid FKs via join
orders_df = spark.range(N_ORDERS).select(
    (F.abs(F.hash(F.col("id"))) % N_CUSTOMERS).alias("customer_idx")
)
orders_with_fk = orders_df.join(customer_lookup, on="customer_idx")
```

## 设置

要求 Python 3.12 和 databricks-connect>=16.4。使用 `uv`：

```bash
uv pip install "databricks-connect>=16.4,<17.4" faker numpy pandas holidays
```

## 相关技能

- **databricks-unity-catalog** —— 管理 catalog、schema 和卷
- **databricks-dabs** —— 用于生产部署的 DABs

## 常见问题

| 问题 | 解决方案 |
|-------|----------|
| `ModuleNotFoundError: faker` | 本地安装：`uv pip install faker`，在 UDF 内导入 |
| Faker UDF 很慢 | 使用 `pandas_udf` 进行批处理 |
| 内存不足 | 增大 `spark.range()` 中的 `numPartitions` |
| 引用完整性错误 | 先将主表写入 Delta，再读回进行 FK join |
| `PERSIST TABLE is not supported on serverless` | **绝不要在无服务器上使用 `.cache()` 或 `.persist()`** —— 先写入 Delta 表，再读回 |
| `F.window` 与 `Window` 的混淆 | 对于 `row_number()`、`rank()` 等使用 `from pyspark.sql.window import Window`。`F.window` 仅用于流式。 |
| 不支持广播变量 | **绝不要在无服务器上使用 `spark.sparkContext.broadcast()`** |

完整故障排查指南见 [references/2-troubleshooting.md](references/2-troubleshooting.md)。
