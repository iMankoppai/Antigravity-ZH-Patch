---
name: databricks-ai-functions
description: "使用 Databricks 内置 AI Functions（ai_classify、ai_extract、ai_summarize、ai_mask、ai_translate、ai_fix_grammar、ai_gen、ai_analyze_sentiment、ai_similarity、ai_parse_document、ai_prep_search、ai_query、ai_forecast）将 AI 能力直接添加到 SQL 和 PySpark 管道中，而无需管理模型端点。还涵盖文档解析和构建自定义 RAG 管道（parse → prep_search → index → query）。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.2.0"
parent: databricks-core
---

# Databricks AI Functions

> **官方文档：** https://docs.databricks.com/large-language-models/ai-functions
> 单个函数参考：https://docs.databricks.com/sql/language-manual/sql-ref-functions-builtin

## 概述

Databricks AI Functions 是内置的 SQL 和 PySpark 函数，可从你的数据管道直接调用 Foundation Model API —— 无需设置模型端点，无需 API 密钥，无需样板代码。它们像 `UPPER()` 或 `LENGTH()` 一样自然地作用于表列，并针对大规模批量推理进行了优化。

**始终优先使用任务专用函数，而非 `ai_query`。** 只有当没有任务函数适用时（自定义/外部端点、多模态，或超出 `ai_extract` 限制的 JSON）才使用 `ai_query`。下文每个函数都共享一个基线：**DBR 15.1+**（notebook）/ **15.4 ML LTS**（批处理），**不支持 SQL Warehouse Classic**，且区域必须支持 AI Functions —— Prereqs 列只列出*额外*的要求。

**成本与速度 —— 每次调用都是一次 LLM 推理（慢且按 token 计费）。** 每行**只运行一次**函数，并将结果持久化到 Delta 表；绝不要在每个下游查询中反复调用它。在演示中，**避免生成包含数百万行的表** —— 必要时对输入采样，使演示快速运行。物化一次，然后查询廉价的 Delta 输出。

**Function** 列链接到仓库内的深入参考（完整选项、模式、示例）；**Docs** 链接到官方页面。

| 函数 | 任务 | 输入 | 输出 | 额外前提 | 文档 |
|---|---|---|---|---|---|
| [`ai_analyze_sentiment`](references/1-task-functions.md#ai_analyze_sentiment) | 情感评分 | `content STRING` | `STRING` —— `positive`/`negative`/`neutral`/`mixed`，或 `NULL` | — | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_analyze_sentiment) |
| [`ai_classify`](references/1-task-functions.md#ai_classify) | 固定标签路由 | `content STRING\|VARIANT`、`labels`（2–500）、`[options MAP]` | `VARIANT` —— `{response:[label], error_message}` | — | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_classify) |
| [`ai_extract`](references/1-task-functions.md#ai_extract) | 实体 / 字段提取 | `content STRING\|VARIANT`、`schema STRING`（JSON）、`[options MAP]` | `VARIANT` —— `{response:{…}, error_message, metadata}` | ≤256 个字段，≤12 层嵌套 | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_extract) |
| [`ai_fix_grammar`](references/1-task-functions.md#ai_fix_grammar) | 语法纠正 | `content STRING` | `STRING`（已纠正） | — | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_fix_grammar) |
| [`ai_gen`](references/1-task-functions.md#ai_gen) | 自由形式生成 | `prompt STRING` | `STRING` | — | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_gen) |
| [`ai_mask`](references/1-task-functions.md#ai_mask) | PII 脱敏 | `content STRING`、`labels ARRAY<STRING>` | `STRING`（实体 → `[MASKED]`） | — | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_mask) |
| [`ai_similarity`](references/1-task-functions.md#ai_similarity) | 语义相似度 | `expr1 STRING`、`expr2 STRING` | `FLOAT`（0.0–1.0） | — | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_similarity) |
| [`ai_summarize`](references/1-task-functions.md#ai_summarize) | 摘要 | `content STRING`、`[max_words INT]`（0 = 不限） | `STRING` | 公共预览；针对英文调优 | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_summarize) |
| [`ai_translate`](references/1-task-functions.md#ai_translate) | 翻译 | `content STRING`、`to_lang STRING` | `STRING` | 语言：en、fr、de、hi、it、pt、es、th | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_translate) |
| [`ai_parse_document`](references/1-task-functions.md#ai_parse_document) | 解析 PDF / Office / 图像 | `content BINARY`、`[Map('version','2.0', …)]` | `VARIANT` —— 页面、元素、error_status | **DBR 17.3+**；≤500 页 / 100 MB | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_parse_document) |
| [`ai_prep_search`](references/1-task-functions.md#ai_prep_search) | 从已解析文档进行 RAG 分块 | `parsed VARIANT`、`[options MAP]` | `VARIANT` —— `{document:{contents, pages, source_uri}, error_status}` | **DBR 18.2+**（无服务器环境 v3+） | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_prep_search) |
| [`ai_query`](references/2-ai-query.md) | 任意服务端点（内置基础模型或自定义）、多模态、复杂 JSON（**最后手段**） | `endpoint STRING`、`request STRING\|STRUCT`、`[returnType]`、`[failOnError BOOL]`、`[modelParameters STRUCT]`、`[responseFormat STRING]`、`[files]` | 已解析的响应；配合 `failOnError => false` 时为一个 `STRUCT{response, errorMessage}` | **Pro/Serverless** 数仓；端点上具 `CAN QUERY` | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_query) |
| [`ai_forecast`](references/3-ai-forecast.md) | 时间序列预测（表值） | `observed TABLE`、`horizon`、`time_col`、`value_col`、`[group_col]`、`[prediction_interval_width]`、`[frequency]`、`[seed]`、`[parameters]` | 行：时间/分组列 + 每个值 `{v}_forecast`、`{v}_upper`、`{v}_lower`（DOUBLE） | **Pro/Serverless** 数仓；公共预览 | [↗](https://docs.databricks.com/sql/language-manual/functions/ai_forecast) |

模型在 Apache 2.0 或 LLAMA 3.3 Community License 下运行 —— 你须自行负责合规。

## 模式

**串联任务函数，一次完成列丰富。** `ai_classify`/`ai_extract` 返回一个 VARIANT —— 用冒号运算符（`:response`）读取它：

```sql
SELECT id,
  ai_analyze_sentiment(content)                                                   AS sentiment,
  ai_summarize(content, 30)                                                       AS summary,
  ai_classify(content, '["technical","billing","other"]', map('version','2.0')):response[0]::STRING AS category,
  ai_extract(content, '["product","error_code","date"]', map('version','2.0')):response:product::STRING AS product,
  ai_fix_grammar(content)                                                         AS content_clean
FROM raw_feedback;
```

在 **PySpark** 中，在 `expr(...)` 内调用其中任何一个：`df.withColumn("category", expr("ai_classify(content, '[\"a\",\"b\"]', map('version','2.0')):response[0]::STRING"))` —— 并通过 `selectExpr("col:response:field::STRING AS field")` 读取 VARIANT 字段。

**存储前进行 PII 脱敏** —— `ai_mask(content, ARRAY(entity_types))` 返回实体被替换为 `[MASKED]` 的文本。

```sql
SELECT ai_mask(message, array('person','email','phone','address')) AS message_safe FROM raw_messages;
```

**语义匹配 / 去重** —— `ai_similarity` 返回 0–1；自连接并设置阈值：

```sql
SELECT a.id, b.id, ai_similarity(a.name, b.name) AS score
FROM companies a JOIN companies b ON a.id < b.id
WHERE ai_similarity(a.name, b.name) > 0.85;
```

**预测** —— 表值；每个未来周期一行（+ 每个分组）。完整参数/分组/区间形式 → [3-ai-forecast.md](references/3-ai-forecast.md)：

```sql
SELECT * FROM ai_forecast(
    observed => TABLE(SELECT date, sales FROM daily_sales),
    horizon => '2026-12-31', time_col => 'date', value_col => 'sales');
-- Returns: date, sales_forecast, sales_upper, sales_lower
```

**通过 `ai_query` 处理嵌套 JSON**（最后手段 —— 仅在超出 `ai_extract` 限制时）—— 用 `from_json` 解析响应。模型名、多模态 `files =>`、`modelParameters`、SQL UDF → [2-ai-query.md](references/2-ai-query.md)：

```sql
SELECT from_json(
    ai_query('databricks-claude-sonnet-4',
        concat('Extract invoice as JSON with nested line_items array: ', text_blocks),
        responseFormat => '{"type":"json_object"}', failOnError => false).response,
    'STRUCT<numero:STRING, total:DOUBLE, line_items:ARRAY<STRUCT<code:STRING, qty:DOUBLE>>>'
) AS invoice
FROM parsed_documents;
```

文档解析（`ai_parse_document`）和 RAG 分块（`ai_prep_search`）在下文有各自的分阶段管道。

## 文档处理管道

将 AI Functions 逐阶段串联进 Delta 表中，进行批量文档处理。示例写成一个 **Spark Declarative Pipeline（SDP / Lakeflow / DLT）** —— 使用 `STREAM(...)` 源的 `CREATE OR REFRESH STREAMING TABLE`。要在 **notebook / SQL 数仓** 中独立运行相同的逻辑，请把每个 `CREATE OR REFRESH STREAMING TABLE x AS` 换成 `CREATE OR REPLACE TABLE x AS`，并去掉 `STREAM(...)` 包装。在 SDP Python 中是 `@dp.table`，配合 `from pyspark import pipelines as dp`。

```sql
-- Stage 1 — parse binary docs (any type), filter parse errors
CREATE OR REFRESH STREAMING TABLE raw_parsed AS
SELECT path,
  concat_ws('\n', transform(parsed:document:elements, e -> e:content::STRING)) AS text_blocks,
  parsed:error_status AS parse_error
FROM (
  SELECT path, ai_parse_document(content, map('version','2.0')) AS parsed
  FROM STREAM read_files('/Volumes/my_catalog/doc_processing/landing/', format => 'binaryFile')
)
WHERE parsed:error_status IS NULL;

-- Stage 2 — classify document type (cheap, no endpoint selection)
CREATE OR REFRESH STREAMING TABLE classified_docs AS
SELECT *,
  ai_classify(text_blocks, '["invoice","purchase_order","receipt","contract","other"]', map('version','2.0')):response[0]::STRING AS doc_type
FROM STREAM raw_parsed;

-- Stage 3 — extract fields; ai_extract returns a VARIANT, read fields with `:`
CREATE OR REFRESH STREAMING TABLE extracted AS
SELECT path, doc_type,
  result:response:invoice_number::STRING AS invoice_number,
  result:response:vendor_name::STRING    AS vendor_name,
  result:response:total_amount::DOUBLE   AS total_amount,
  result:error_message::STRING           AS extract_error
FROM (
  SELECT *, ai_extract(text_blocks,
    '{"invoice_number":{"type":"string"},"vendor_name":{"type":"string"},"total_amount":{"type":"number"}}',
    map('version','2.0')) AS result
  FROM STREAM classified_docs WHERE doc_type = 'invoice' AND text_blocks IS NOT NULL
);
```

在批处理作业中，将每行的错误路由到一个边车表，而不是让它使运行崩溃：保留 `ai_extract` 的 `result:error_message`（VARIANT，如上通过冒号访问），并对 `ai_query` 传入 `failOnError => false` 并检查 `ai_response.errorMessage`（一个 STRUCT 字段，通过点访问）。参见 [2-ai-query.md](references/2-ai-query.md)。

### 自定义 RAG 管道 —— 解析 → 准备 → 索引

用于检索而非字段提取：`ai_parse_document` → `ai_prep_search`（语义分块 + 上下文丰富，DBR 18.2+）→ Vector Search Delta Sync 索引。`ai_prep_search` 返回 `chunk_id`、`chunk_to_retrieve` 和 `chunk_to_embed`（用标题/页头/页码丰富）—— **对 `chunk_to_embed` 做嵌入，把 `chunk_to_retrieve` 返回给 LLM。** 以独立形式展示；在 SDP 中把 `CREATE OR REPLACE TABLE` 换成 `CREATE OR REFRESH STREAMING TABLE` + `STREAM read_files(...)`。

```sql
CREATE OR REPLACE TABLE parsed_chunks AS
WITH prepped AS (
  SELECT path AS source_path, ai_prep_search(ai_parse_document(content)) AS prep
  FROM read_files('/Volumes/my_catalog/doc_processing/docs/', format => 'binaryFile')
)
SELECT
  variant_get(chunk, '$.chunk_id',          'STRING') AS chunk_id,
  variant_get(chunk, '$.chunk_to_retrieve', 'STRING') AS chunk_to_retrieve,
  variant_get(chunk, '$.chunk_to_embed',    'STRING') AS chunk_to_embed,
  source_path
FROM prepped LATERAL VIEW explode(variant_get(prep, '$.document.contents', 'ARRAY<VARIANT>')) c AS chunk;
```

然后启用 CDF（`ALTER TABLE parsed_chunks SET TBLPROPERTIES (delta.enableChangeDataFeed = true)`）并使用 **[databricks-vector-search](../databricks-vector-search/SKILL.md)** 技能构建 Delta Sync 索引：PK `chunk_id`、嵌入源 `chunk_to_embed`、返回 `chunk_to_retrieve`。

**超越批处理：**
- **对输出提问** —— 将 Genie Agent 指向生成的 Delta 表以进行自然语言查询，而非手写 SQL；参见 **[databricks-genie-agents](../databricks-genie-agents/SKILL.md)** 技能。
- **低延迟 / 服务** —— 要将其暴露为实时的、受治理的端点（例如将模型注册到 Unity Catalog 并为其提供服务），使用 **[databricks-model-serving](../databricks-model-serving/SKILL.md)** 技能。
- **生产增量摄取** —— 对于可运行的端到端流式 `ai_parse_document` 作业（检查点、`trigger(availableNow=True)`），参见 [databricks/bundle-examples · job_with_ai_parse_document](https://github.com/databricks/bundle-examples/tree/main/contrib/job_with_ai_parse_document)。

## 参考文件

- [1-task-functions.md](references/1-task-functions.md) —— 每个任务专用函数的深入参考：完整的选项/模式（例如 `ai_extract` v2.1 引用 + 置信度分数、`ai_classify` 多标签、`ai_parse_document` 选项 + 输出模式、`ai_prep_search` 分块模式）和非平凡示例。上方的概述表直接链接到每个函数的章节。
- [2-ai-query.md](references/2-ai-query.md) —— `ai_query` 完整参考：所有参数、用 `responseFormat` 生成结构化输出、多模态 `files =>`、UDF 模式和错误处理
- [3-ai-forecast.md](references/3-ai-forecast.md) —— `ai_forecast` 参数、单指标、多分组、多指标和置信区间模式

## 常见问题

| 问题 | 解决方案 |
|---|---|
| `ai_parse_document` 未找到 | 要求 DBR **17.3+**。检查集群 runtime。 |
| `ai_prep_search` 未找到 | 要求 DBR **18.2+**（无服务器环境 v3+）。 |
| `explode()` 在 VARIANT 上失败 | `explode` 需要 ARRAY —— 先转换：`explode(variant_get(prep, '$.document.contents', 'ARRAY<VARIANT>'))`。 |
| 嵌入了错误的 RAG 列 | 对 `chunk_to_embed`（上下文丰富）做嵌入；把 `chunk_to_retrieve` 返回给 LLM。 |
| `ai_forecast` 失败 | 要求 **Pro 或 Serverless** SQL 数仓 —— 在 Classic 或 Starter 上不可用。 |
| 所有函数返回 NULL | 输入列为 NULL。调用前用 `WHERE col IS NOT NULL` 过滤。 |
| `ai_translate` 对某语言失败 | 支持（8 种）：英语（`en`）、法语（`fr`）、德语（`de`）、印地语（`hi`）、意大利语（`it`）、葡萄牙语（`pt`）、西班牙语（`es`）、泰语（`th`）—— `to_lang` 接受代码或全名（参见 [references/1-task-functions.md](references/1-task-functions.md)）。其他语言请使用支持多语言的模型配合 `ai_query`。 |
| `ai_classify` 返回意外的标签 | 使用清晰、互斥的标签名。标签越少（2–5）结果越可靠。 |
| `ai_query` 在批处理作业的某些行上抛异常 | 添加 `failOnError => false` —— 返回一个带 `.response` 和 `.errorMessage` 的 STRUCT（通过点访问），而非抛异常。 |
| `ai_query` 失败并返回 403 "no longer available" | 旧的 `databricks-*` 基础模型端点名已弃用，改用 Unity Catalog 模型服务。切换到 `system.ai.<model>`（同一调用，其他参数不变）；自定义端点不受此迁移影响，保留其现有名称。参见 [2-ai-query.md](references/2-ai-query.md#unity-gateway-migration-403-permission_denied)。 |
| 批处理作业运行缓慢 | 使用 DBR **15.4 ML LTS** 集群（而非无服务器或交互式）以获得优化的批量推理吞吐。 |
