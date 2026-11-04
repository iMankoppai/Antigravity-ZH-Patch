---
name: databricks-unity-catalog
description: "Unity Catalog 治理、访问控制和可观测性。用于授予或撤销访问权限（GRANT/REVOKE）、推理权限模型和所有权、设置行级安全和列掩码、创建外部位置和存储凭证、定义 catalog/schema/table/volume、回答\"谁能读这张表\"，以及查询系统表（审计、血缘、计费）或处理 /Volumes/ 中的卷文件。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.3.0"
parent: databricks-core
---

# Unity Catalog

面向 Unity Catalog **治理** 的指导 —— 访问控制、权限模型、外部位置、可保护对象 DDL 和细粒度访问 —— 以及系统表和卷文件操作。

> **在运行 `databricks` CLI 命令之前，确认 CLI 和子命令存在。**
> 运行 `databricks --version` —— 本技能假定使用统一 CLI（**≥ v1.0.0**）。此处展示的若干
> 子命令（`experimental aitools`、`system-schemas`、`external-lineage`、
> `grants`）因版本或工作区可用性而异；如果某个缺失或拒绝某个标志，
> 则回退到 SQL 形式或 Python SDK，而不要猜测。每个参考在相关处注明其
> 自己的版本下限。

## 何时使用本技能

在以下情况使用本技能：

**治理与访问控制（从这里开始）：**
- **授予或撤销访问权限** —— `GRANT`/`REVOKE`、UC 权限模型、所有权（`ALTER … OWNER TO`）、`SHOW GRANTS`、"谁能读/写这张表？"
- **行级和列级安全** —— 行过滤器、列掩码、使用 `current_user()` / `is_account_group_member()` 的动态视图
- **外部位置与存储凭证** —— `CREATE STORAGE CREDENTIAL`、`CREATE EXTERNAL LOCATION`、支撑外部表/卷
- **可保护对象 DDL 与元数据** —— 创建/更改 catalog、schema、托管表 vs 外部表、视图；注释、标签、表属性、所有权

**可观测性与文件：**
- 处理**卷**（上传、下载、列出 `/Volumes/` 中的文件）
- 查询**血缘**（表依赖、列级血缘）
- 分析**审计日志**（谁访问了什么、权限变更）
- 监控**计费与用量**（DBU 消耗、成本分析）
- 跟踪**计算资源**（集群使用、数仓指标）
- 审查**作业执行**（运行历史、成功率、失败）
- 分析**查询性能**（慢查询、数仓利用率）
- 剖析**数据质量**（数据剖析、漂移检测、指标表）

## 参考文件

| 主题 | 文件 | 描述 |
|-------|------|-------------|
| **访问控制** | [references/1-access-control.md](references/1-access-control.md) | 权限模型、可保护对象层级、GRANT/REVOKE、所有权、继承、`SHOW GRANTS` |
| **外部位置** | [references/2-external-locations.md](references/2-external-locations.md) | 存储凭证（AWS/Azure/GCP）、外部位置、验证 |
| **可保护对象 DDL** | [references/3-securables-ddl.md](references/3-securables-ddl.md) | CREATE/ALTER/DROP catalog/schema/table/view、注释、标签、所有权 |
| **细粒度访问** | [references/4-fine-grained-access.md](references/4-fine-grained-access.md) | 行过滤器、列掩码、动态视图 |
| 系统表 | [references/5-system-tables.md](references/5-system-tables.md) | 血缘、审计、计费、计算、作业、查询历史 |
| 卷 | [references/6-volumes.md](references/6-volumes.md) | 卷文件操作、权限、最佳实践 |
| 数据剖析 | [references/7-data-profiling.md](references/7-data-profiling.md) | 数据剖析、漂移检测、剖析指标 |

## 快速开始

### 创建 Unity Catalog 对象（CLI）

**对 `create` 命令使用 `--json`。** 位置实参的顺序因命令而异，且在
CLI 版本间发生过变化，因此 `--json` 是本技能通篇展示的与顺序无关、版本稳定的形式。

```bash
# Create a catalog
databricks catalogs create --json '{"name": "my_catalog"}'

# Create a schema
databricks schemas create --json '{"name": "my_schema", "catalog_name": "my_catalog"}'

# Create a managed volume
databricks volumes create --json '{
  "catalog_name": "my_catalog",
  "schema_name": "my_schema",
  "name": "my_volume",
  "volume_type": "MANAGED"
}'

# List catalogs, schemas, volumes (read commands take simple positional args)
databricks catalogs list
databricks schemas list my_catalog
databricks volumes list my_catalog.my_schema
```

如果你更喜欢位置实参，`create` 的位置实参仍然可用，但顺序在各命令间**不**统一
—— 下面是逐命令的顺序（也是推荐 `--json` 的原因）：

| 命令 | 位置 `create` 顺序 |
|---------|---------------------------|
| `databricks catalogs create` | `NAME` |
| `databricks schemas create`  | `NAME CATALOG_NAME` |
| `databricks volumes create`  | `CATALOG_NAME SCHEMA_NAME NAME VOLUME_TYPE` |

> **CLI 接口面因版本而异。** 如果你的安装中缺少某个 `databricks` 子命令或位置签名，
> 优先使用 `--json`、SQL 形式或 Python SDK，而不要猜测标志。

### 卷文件操作（CLI）

`databricks fs` 即使对于 UC 卷路径也需要 `dbfs:` scheme 前缀 —— 没有它，CLI 会把路径当作本地文件系统并以 `no such directory` 报错。

```bash
# List files in a volume
databricks fs ls dbfs:/Volumes/catalog/schema/volume/path/

# Upload a directory's contents to a volume (-r copies contents, not the directory itself)
databricks fs cp -r --overwrite /tmp/data dbfs:/Volumes/catalog/schema/volume/dest

# Download a file from a volume
databricks fs cp dbfs:/Volumes/catalog/schema/volume/file.csv /tmp/file.csv

# Create a directory in a volume
databricks fs mkdirs dbfs:/Volumes/catalog/schema/volume/new_folder
```

### 授予与撤销访问权限

`GRANT`/`REVOKE` 是核心治理操作。完整权限模型见 [references/1-access-control.md](references/1-access-control.md)。

```sql
-- Grant read access on a schema to a group
GRANT USE CATALOG ON CATALOG analytics TO `data_readers`;
GRANT USE SCHEMA ON SCHEMA analytics.gold TO `data_readers`;
GRANT SELECT ON SCHEMA analytics.gold TO `data_readers`;

-- Who can access this table?
SHOW GRANTS ON TABLE analytics.gold.customers;

-- Revoke
REVOKE SELECT ON SCHEMA analytics.gold FROM `data_readers`;
```

### 启用系统表访问

```sql
-- Grant access to system tables
GRANT USE CATALOG ON CATALOG system TO `data_engineers`;
GRANT USE SCHEMA ON SCHEMA system.access TO `data_engineers`;
GRANT SELECT ON SCHEMA system.access TO `data_engineers`;
```

### 常见查询

```sql
-- Table lineage: What tables feed into this table?
SELECT source_table_full_name, source_column_name
FROM system.access.table_lineage
WHERE target_table_full_name = 'catalog.schema.table'
  AND event_date >= current_date() - 7;

-- Audit: Recent permission changes
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE action_name LIKE '%GRANT%' OR action_name LIKE '%REVOKE%'
ORDER BY event_time DESC
LIMIT 100;

-- Billing: DBU usage by workspace
SELECT workspace_id, sku_name, SUM(usage_quantity) AS total_dbus
FROM system.billing.usage
WHERE usage_date >= current_date() - 30
GROUP BY workspace_id, sku_name;
```

## 从 CLI 运行 SQL

> **`databricks experimental aitools tools query` 是一个实验性命令。**
> `experimental` 命名空间不保证在 CLI 版本间稳定，你的安装中可能
> 不存在。优先从 **SQL 数仓**（SQL 编辑器、定时查询）或 **Python SDK**
> （`w.statement_execution.execute_statement`），或 **notebook** 运行系统表 SQL。
> 仅在快速临时检查时使用实验性 CLI。

> **获取这些示例使用的 ID。** `WAREHOUSE_ID` —— 运行 `databricks warehouses list`
> （或从 UI 中 SQL 数仓的 *Connection details* 复制）。`METASTORE_ID`（用于
> [references/5-system-tables.md](references/5-system-tables.md)）—— 通过 SDK 用 `w.metastores.current().metastore_id`，
> 或 Catalog UI → metastore 详情。

实验性 CLI 形式（仅为方便）：

```bash
databricks experimental aitools tools query --warehouse WAREHOUSE_ID "
  SELECT source_table_full_name, target_table_full_name
  FROM system.access.table_lineage
  WHERE event_date >= current_date() - 7
"
```

稳定的 SDK 回退（在任何 CLI 版本上都能用）：

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()
resp = w.statement_execution.execute_statement(
    warehouse_id="WAREHOUSE_ID",
    statement="""
        SELECT source_table_full_name, target_table_full_name
        FROM system.access.table_lineage
        WHERE event_date >= current_date() - 7
        LIMIT 100
    """,
)
for row in resp.result.data_array or []:
    print(row)
```

> **CLI 接口面因版本而异。** 如果某个 `databricks` 子命令（例如某个 `experimental`
> 工具、`system-schemas` 或 `external-lineage`）缺失，回退到上述 SQL 数仓
> 或 Python SDK，而不要猜测标志。

## 最佳实践

1. **授予最小访问权限** - 应用最小权限；在可行的最窄可保护对象上授予
2. **按日期过滤** - 系统表可能很大；始终使用日期过滤器
3. **使用适当的保留期** - 检查你工作区的保留设置
4. **调度报告** - 为定期监控创建定时查询
5. **优先用 SQL/SDK 而非实验性 CLI** - 对于超出快速检查的任何事情

## 相关技能

本技能负责 Unity Catalog **治理**：访问控制、权限模型、外部位置 / 存储凭证、可保护对象 DDL、细粒度访问、系统表和卷。对于相邻的关注点，使用同级技能：

- **databricks-core**（声明的父级）—— 认证、profile 选择、通用 CLI，以及 catalog/table 的*探索*
- **[databricks-metric-views](../databricks-metric-views/SKILL.md)** —— 指标视图定义 / DDL（`WITH METRICS LANGUAGE YAML`）
- **[databricks-iceberg](../databricks-iceberg/SKILL.md)** —— 托管 Iceberg、External Iceberg Reads（原名 Uniform），以及用于外部引擎的 **Iceberg REST Catalog（IRC）凭证*分发*** —— 有别于 UC 存储凭证（参见 [references/2-external-locations.md](references/2-external-locations.md)）
- **[databricks-ml-training](../databricks-ml-training/SKILL.md)** —— UC 模型注册和 `@prod`/`@challenger` 别名
- **[databricks-vector-search](../databricks-vector-search/SKILL.md)** —— Vector Search 索引
- **[databricks-pipelines](../databricks-pipelines/SKILL.md)**、**[databricks-jobs](../databricks-jobs/SKILL.md)**、**[databricks-lakeflow-connect](../databricks-lakeflow-connect/SKILL.md)** —— 通过管道/作业/托管摄取*生产*表
- **[databricks-lakebase](../databricks-lakebase/SKILL.md)** —— Lakebase / 同步表（OLTP）
- **[databricks-ai-functions](../databricks-ai-functions/SKILL.md)** —— `ai_mask` / `ai_classify` 等 AI 函数（AI *转换*，**非**访问控制 —— 参见 [references/4-fine-grained-access.md](references/4-fine-grained-access.md)）
- **[databricks-aibi-dashboards](../databricks-aibi-dashboards/SKILL.md)** —— 基于 UC 数据的 AI/BI 仪表板
- **[databricks-synthetic-data-gen](../databricks-synthetic-data-gen/SKILL.md)** —— 生成存储在 UC 卷中的数据

### 路线图（尚未覆盖 —— 推迟到后续版本）

这些治理领域有意**不在 v0.3.0 范围内**，计划在后续版本中实现：

- Delta Sharing / Marketplace / Clean Rooms
- Lakehouse Federation（连接 + 外部 catalog）
- ABAC / 作为策略的受治理标签

## 资源

- [Unity Catalog 权限与可保护对象](https://docs.databricks.com/data-governance/unity-catalog/access-control/privileges-reference)
- [Unity Catalog 系统表](https://docs.databricks.com/admin/system-tables)
- [审计日志参考](https://docs.databricks.com/admin/account-settings/audit-logs)
- [管理外部位置和存储凭证](https://docs.databricks.com/connect/unity-catalog/cloud-storage)
