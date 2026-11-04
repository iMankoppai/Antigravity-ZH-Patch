---
name: databricks-dbsql
description: >-
  Databricks SQL（DBSQL）高级功能和 SQL 数仓能力。
  当用户提及以下内容时，必须调用本技能："DBSQL"、"Databricks SQL"、
  "SQL warehouse"、"SQL scripting"、"stored procedure"、"CALL procedure"、
  "materialized view"、"CREATE MATERIALIZED VIEW"、"pipe syntax"、"|>"、
  "geospatial"、"H3"、"ST_"、"spatial SQL"、"collation"、"COLLATE"、
  "ai_query"、"ai_classify"、"ai_extract"、"ai_gen"、"AI function"、
  "http_request"、"remote_query"、"read_files"、"Lakehouse Federation"、
  "recursive CTE"、"WITH RECURSIVE"、"multi-statement transaction"、
  "temp table"、"temporary view"、"pipe operator"。
  当用户询问 SQL 最佳实践、数据建模
  模式或 Databricks 上的高级 SQL 功能时，也应调用。
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks SQL（DBSQL）—— 高级功能

## 快速参考

| 功能 | 关键语法 | 起始版本 | 参考 |
|---------|-----------|-------|-----------|
| SQL 脚本 | `BEGIN...END`、`DECLARE`、`IF/WHILE/FOR` | DBR 16.3+ | [references/sql-scripting.md](references/sql-scripting.md) |
| 存储过程 | `CREATE PROCEDURE`、`CALL` | DBR 17.0+ | [references/sql-scripting.md](references/sql-scripting.md) |
| 递归 CTE | `WITH RECURSIVE` | DBR 17.0+ | [references/sql-scripting.md](references/sql-scripting.md) |
| 事务 | `BEGIN ATOMIC...END` | GA | [references/sql-scripting.md](references/sql-scripting.md) |
| 物化视图 | `CREATE MATERIALIZED VIEW` | Pro/Serverless | [references/materialized-views-pipes.md](references/materialized-views-pipes.md) |
| 临时表 | `CREATE TEMPORARY TABLE` | 全部 | [references/materialized-views-pipes.md](references/materialized-views-pipes.md) |
| 管道语法 | `\|>` 运算符 | DBR 16.1+ | [references/materialized-views-pipes.md](references/materialized-views-pipes.md) |
| 地理空间（H3） | `h3_longlatash3()`、`h3_polyfillash3()` | DBR 11.2+ | [references/geospatial-collations.md](references/geospatial-collations.md) |
| 地理空间（ST） | `ST_Point()`、`ST_Contains()`、80+ 个函数 | DBR 16.0+ | [references/geospatial-collations.md](references/geospatial-collations.md) |
| 排序规则 | `COLLATE`、`UTF8_LCASE`、locale 感知 | DBR 16.1+ | [references/geospatial-collations.md](references/geospatial-collations.md) |
| AI 函数 | `ai_query()`、`ai_classify()`、11+ 个函数 | DBR 15.1+ | [references/ai-functions.md](references/ai-functions.md) |
| http_request | `http_request(conn, ...)` | Pro/Serverless | [references/ai-functions.md](references/ai-functions.md) |
| remote_query | `SELECT * FROM remote_query(...)` | Pro/Serverless | [references/ai-functions.md](references/ai-functions.md) |
| read_files | `SELECT * FROM read_files(...)` | 全部 | [references/ai-functions.md](references/ai-functions.md) |
| 数据建模 | 星型模式、液体聚类 | 全部 | [references/best-practices.md](references/best-practices.md) |

---

## 常见模式

### SQL 脚本 —— 过程式 ETL

```sql
BEGIN
  DECLARE v_count INT;
  DECLARE v_status STRING DEFAULT 'pending';

  SET v_count = (SELECT COUNT(*) FROM catalog.schema.raw_orders WHERE status = 'new');

  IF v_count > 0 THEN
    INSERT INTO catalog.schema.processed_orders
    SELECT *, current_timestamp() AS processed_at
    FROM catalog.schema.raw_orders
    WHERE status = 'new';

    SET v_status = 'completed';
  ELSE
    SET v_status = 'skipped';
  END IF;

  SELECT v_status AS result, v_count AS rows_processed;
END
```

### 带错误处理的存储过程

```sql
CREATE OR REPLACE PROCEDURE catalog.schema.upsert_customers(
  IN p_source STRING,
  OUT p_rows_affected INT
)
LANGUAGE SQL
SQL SECURITY INVOKER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    SET p_rows_affected = -1;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = concat('Upsert failed for source: ', p_source);
  END;

  MERGE INTO catalog.schema.dim_customer AS t
  USING (SELECT * FROM identifier(p_source)) AS s
  ON t.customer_id = s.customer_id
  WHEN MATCHED THEN UPDATE SET *
  WHEN NOT MATCHED THEN INSERT *;

  SET p_rows_affected = (SELECT COUNT(*) FROM identifier(p_source));
END;

-- Invoke:
CALL catalog.schema.upsert_customers('catalog.schema.staging_customers', ?);
```

### 带定时刷新的物化视图

```sql
CREATE OR REPLACE MATERIALIZED VIEW catalog.schema.daily_revenue
  CLUSTER BY (order_date)
  SCHEDULE EVERY 1 HOUR
  COMMENT 'Hourly-refreshed daily revenue by region'
AS SELECT
    order_date,
    region,
    SUM(amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM catalog.schema.fact_orders
JOIN catalog.schema.dim_store USING (store_id)
GROUP BY order_date, region;
```

### 管道语法 —— 可读的转换

```sql
-- Traditional SQL rewritten with pipe syntax
FROM catalog.schema.fact_orders
  |> WHERE order_date >= current_date() - INTERVAL 30 DAYS
  |> AGGREGATE SUM(amount) AS total, COUNT(*) AS cnt GROUP BY region, product_category
  |> WHERE total > 10000
  |> ORDER BY total DESC
  |> LIMIT 20;
```

### AI 函数 —— 用 LLM 丰富数据

```sql
-- Classify support tickets
SELECT
  ticket_id,
  description,
  ai_classify(description, ARRAY('billing', 'technical', 'account', 'feature_request')) AS category,
  ai_analyze_sentiment(description) AS sentiment
FROM catalog.schema.support_tickets
LIMIT 100;

-- Extract entities from text
SELECT
  doc_id,
  ai_extract(content, ARRAY('person_name', 'company', 'dollar_amount')) AS entities
FROM catalog.schema.contracts;

-- General-purpose AI query with structured output
SELECT ai_query(
  'databricks-meta-llama-3-3-70b-instruct',
  concat('Summarize this customer feedback in JSON with keys: topic, sentiment, action_items. Feedback: ', feedback),
  returnType => 'STRUCT<topic STRING, sentiment STRING, action_items ARRAY<STRING>>'
) AS analysis
FROM catalog.schema.customer_feedback
LIMIT 50;
```

### 地理空间 —— 使用 H3 进行邻近搜索

```sql
-- Find stores within 5km of each customer using H3 indexing
WITH customer_h3 AS (
  SELECT *, h3_longlatash3(longitude, latitude, 7) AS h3_cell
  FROM catalog.schema.customers
),
store_h3 AS (
  SELECT *, h3_longlatash3(longitude, latitude, 7) AS h3_cell
  FROM catalog.schema.stores
)
SELECT
  c.customer_id,
  s.store_id,
  ST_Distance(
    ST_Point(c.longitude, c.latitude),
    ST_Point(s.longitude, s.latitude)
  ) AS distance_m
FROM customer_h3 c
JOIN store_h3 s ON h3_ischildof(c.h3_cell, h3_toparent(s.h3_cell, 5))
WHERE ST_Distance(
  ST_Point(c.longitude, c.latitude),
  ST_Point(s.longitude, s.latitude)
) < 5000;
```

### 排序规则 —— 不区分大小写的搜索

```sql
-- Create table with case-insensitive collation
CREATE TABLE catalog.schema.products (
  product_id BIGINT GENERATED ALWAYS AS IDENTITY,
  name STRING COLLATE UTF8_LCASE,
  category STRING COLLATE UTF8_LCASE,
  price DECIMAL(10, 2)
);

-- Queries automatically case-insensitive (no LOWER() needed)
SELECT * FROM catalog.schema.products
WHERE name = 'MacBook Pro';  -- matches 'macbook pro', 'MACBOOK PRO', etc.
```

### http_request —— 调用外部 API

```sql
-- Set up connection first (one-time)
CREATE CONNECTION my_api_conn
  TYPE HTTP
  OPTIONS (host 'https://api.example.com', bearer_token secret('scope', 'token'));

-- Call API from SQL
SELECT
  order_id,
  http_request(
    conn => 'my_api_conn',
    method => 'POST',
    path => '/v1/validate',
    json => to_json(named_struct('order_id', order_id, 'amount', amount))
  ).text AS api_response
FROM catalog.schema.orders
WHERE needs_validation = true;
```

### read_files —— 摄取原始文件

```sql
-- Read JSON files from a Volume with schema hints
SELECT *
FROM read_files(
  '/Volumes/catalog/schema/raw/events/',
  format => 'json',
  schemaHints => 'event_id STRING, timestamp TIMESTAMP, payload MAP<STRING, STRING>',
  pathGlobFilter => '*.json',
  recursiveFileLookup => true
);

-- Read CSV with options
SELECT *
FROM read_files(
  '/Volumes/catalog/schema/raw/sales/',
  format => 'csv',
  header => true,
  delimiter => '|',
  dateFormat => 'yyyy-MM-dd',
  schema => 'sale_id INT, sale_date DATE, amount DECIMAL(10,2), store STRING'
);
```

### 递归 CTE —— 层级遍历

```sql
WITH RECURSIVE org_chart AS (
  -- Anchor: top-level managers
  SELECT employee_id, name, manager_id, 0 AS depth, ARRAY(name) AS path
  FROM catalog.schema.employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: direct reports
  SELECT e.employee_id, e.name, e.manager_id, o.depth + 1, array_append(o.path, e.name)
  FROM catalog.schema.employees e
  JOIN org_chart o ON e.manager_id = o.employee_id
  WHERE o.depth < 10  -- safety limit
)
SELECT * FROM org_chart ORDER BY depth, name;
```

### remote_query —— 联邦查询

```sql
-- Query PostgreSQL via Lakehouse Federation
SELECT *
FROM remote_query(
  'my_postgres_connection',
  database => 'my_database',
  query    => 'SELECT customer_id, email, created_at FROM customers WHERE active = true'
);
```

---

## 参考文件

加载这些文件以获取详细语法、完整参数列表和高级模式：

| 文件 | 内容 | 何时阅读 |
|------|----------|--------------|
| [references/sql-scripting.md](references/sql-scripting.md) | SQL 脚本、存储过程、递归 CTE、事务 | 用户需要过程式 SQL、错误处理、循环、动态 SQL |
| [references/materialized-views-pipes.md](references/materialized-views-pipes.md) | 物化视图、临时表/视图、管道语法 | 用户需要 MV、刷新调度、临时对象、管道运算符 |
| [references/geospatial-collations.md](references/geospatial-collations.md) | 39 个 H3 函数、80+ 个 ST 函数、排序规则类型与层级 | 用户需要空间分析、H3 索引、大小写/重音处理 |
| [references/ai-functions.md](references/ai-functions.md) | 13 个 AI 函数、http_request、remote_query、read_files（所有选项） | 用户需要 AI 丰富、API 调用、联邦、文件摄取 |
| [references/best-practices.md](references/best-practices.md) | 数据建模、性能、液体聚类、反模式 | 用户需要架构指导、优化或建模建议 |

---

## 关键准则

- **始终使用无服务器 SQL 数仓** 用于 AI 函数、MV 和 http_request
- **在开发期间使用 `LIMIT`** 配合 AI 函数以控制成本
- **对于新表优先用液体聚类而非分区**（最多 1-4 个键）
- **当不确定聚类键时使用 `CLUSTER BY AUTO`**
- **Gold 层用星型模式** 用于 BI；Silver 层可接受 OBT
- **在维度模型上定义 PK/FK 约束** 以进行查询优化
- **对需要不区分大小写搜索的用户可见字符串列使用 `COLLATE UTF8_LCASE`**
- **在部署前通过 CLI**（`databricks experimental aitools tools query`）或 notebook **测试 SQL**。如果你的 CLI 版本拒绝 `--warehouse`，改为在环境中设置 `DATABRICKS_WAREHOUSE_ID`。
