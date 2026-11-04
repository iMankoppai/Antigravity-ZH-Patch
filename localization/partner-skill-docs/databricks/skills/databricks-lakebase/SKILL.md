---
name: databricks-lakebase
description: "Databricks Lakebase Postgres：项目、扩缩、连接、Lakebase 同步表和 Data API。适用于询问 Lakebase 数据库、OLTP 存储，或将应用连接到 Databricks 上的 Postgres 时。"
compatibility: Requires databricks CLI (>= v0.294.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Lakebase Postgres Autoscaling

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

Lakebase 是 Databricks 的无服务器、Postgres 兼容数据库，在 AWS 和 Azure 上均可用（GA）。它提供全托管 OLTP 存储，具有自动扩缩、分支和缩容到零。

> **Provisioned Lakebase 已不复存在 —— 绝不要创建它。** 旧的 Provisioned 层（静态、不可扩展的 Postgres；`databricks database` CLI / `w.database` SDK）正在 2026 年夏季迁移到 Autoscaling，无需客户操作。今天的 Lakebase 仅支持 Autoscaling（`databricks postgres` / `w.postgres`）。不要尝试创建 Provisioned 实例；如果用户要求一个，告诉他们 Provisioned 实例已不复存在，并指引他们使用 Autoscaling。将应用配置中遗留的 `database` 资源键视为已弃用 —— 迁移到 `postgres` 资源键。对于遗留的 DAB `synced_database_tables` 资源，改用 `databricks postgres create-synced-table` CLI 流程（参见常见问题行和 `references/synced-tables.md`）。

在阅读旧配置或文档时，以下是已弃用的 Provisioned 层到 Autoscaling 的映射供参考：

| 方面 | Provisioned（已弃用） | Autoscaling（当前） |
|--------|-----------------------|-----------------------|
| CLI 组 | `databricks database` | `databricks postgres` |
| 顶层资源 | 实例 | 项目 |
| 容量 | CU_1–CU_8（16 GB/CU） | 0.5–112 CU（2 GB/CU） |
| 分支 | 不支持 | 完全支持 |
| 缩容到零 | 不支持 | 可配置 |
| HA | 可读辅助 | 1–3 个辅助 + 只读副本 |
| Data API | 不可用 | PostgREST HTTP API |
| 云 | 仅 AWS | AWS 和 Azure |

**合规：** 支持 HIPAA、C5、TISAX 或 None。

## 能力

- **项目生命周期** —— 创建、更新、删除 Lakebase Postgres Autoscaling 项目
- **分支** —— 带 TTL 的写时复制分支、时间点恢复和重置
- **计算扩缩** —— 自动扩缩 0.5--32 CU、固定 36--112 CU、缩容到零
- **高可用** —— 1 个主 + 1--3 个辅助、自动故障转移
- **PostgreSQL 连接** —— OAuth token 刷新、连接池、SSL
- **Data API** —— PostgREST 兼容的 HTTP CRUD（仅 Autoscaling）
- **Lakebase 同步表** —— 将 Unity Catalog Delta 表同步到 Postgres（以前称为 Reverse ETL）
- **Databricks App 集成** —— 用 Lakebase 特性脚手架化应用，部署优先工作流
- **云支持** —— AWS 和 Azure（GA）

**参考文档：**
- [computes-and-scaling.md](references/computes-and-scaling.md) —— 规格、端点管理、缩容到零、HA
- [connectivity.md](references/connectivity.md) —— 连接模式、token 刷新、Data API
- [synced-tables.md](references/synced-tables.md) —— Lakebase 同步表、数据类型映射、容量规划
- [lakehouse-sync.md](references/lakehouse-sync.md) —— 从 Lakebase Postgres 到 Unity Catalog Delta 表的 CDC（可通过 `databricks postgres *-cdf-config` / `w.postgres.*_cdf_config` 编程，Beta）
- [pgvector.md](references/pgvector.md) —— 使用 pgvector 扩展的向量相似度搜索
- [off-platform.md](references/off-platform.md) —— 平台外 Lakebase（不是 Databricks Apps）：通过 `@databricks/lakebase` 连接的外部 Node.js 应用、环境管理、token 刷新、Drizzle ORM

## 资源层级

```
Project (top-level container)
  └── Branch (isolated database environment, copy-on-write)
        ├── Endpoint (read-write or read-only)
        ├── Database (standard Postgres DB)
        └── Role (Postgres role)
```

- **项目**：顶层容器。创建一个项目会自动置备一个 `production` 分支和一个 `primary` 读写端点。
- **分支**：与父级共享存储的隔离数据库环境（写时复制）。状态：`READY`、`ARCHIVED`。
- **端点**（UI 中称为 **Compute**）：为分支提供动力的计算资源。类型：`ENDPOINT_TYPE_READ_WRITE`、`ENDPOINT_TYPE_READ_ONLY`。
- **数据库**：分支内的标准 Postgres 数据库。默认：`databricks_postgres`。
- **角色**：分支内的 Postgres 角色。

### 资源名称格式

| 资源 | 格式 |
|----------|--------|
| 项目 | `projects/{project_id}` |
| 分支 | `projects/{project_id}/branches/{branch_id}` |
| 端点 | `projects/{project_id}/branches/{branch_id}/endpoints/{endpoint_id}` |
| 数据库 | `projects/{project_id}/branches/{branch_id}/databases/{database_id}` |

所有 ID：1-63 个字符，以小写字母开头，仅限小写字母/数字/连字符（RFC 1123）。

## CLI 发现 —— 始终先这样做

> **注意：** "Lakebase" 是产品名；CLI 命令组是 `postgres`。所有命令都使用 `databricks postgres ...`。

**不要猜测命令语法。** 动态发现可用命令：

```bash
databricks postgres -h                    # List all subcommands
databricks postgres <subcommand> -h       # Flags, args, JSON fields
```

## 创建项目

> **先决定：复用还是创建。** 在构建或附加到应用时，询问用户是复用现有的项目/分支/数据库 —— 用 `databricks postgres list-projects`（然后 `list-branches` / `list-databases`）列出它们，让用户选择，并确认应用将拥有哪个 schema —— 还是创建一个新项目。只有当用户明确要求一个全新项目时才跳过列出并直接创建。

```bash
databricks postgres create-project <PROJECT_ID> \
  --json '{"spec": {"display_name": "<DISPLAY_NAME>"}}' \
  --profile <PROFILE>
```

自动创建：`production` 分支 + `primary` 读写端点（1 CU 最小/最大，缩容到零）。长时间运行的操作；CLI 默认等待。使用 `--no-wait` 立即返回。

创建后，验证：

```bash
databricks postgres list-branches projects/<PROJECT_ID> --profile <PROFILE>
databricks postgres list-endpoints projects/<PROJECT_ID>/branches/<BRANCH_ID> --profile <PROFILE>
databricks postgres list-databases projects/<PROJECT_ID>/branches/<BRANCH_ID> --profile <PROFILE>
```

**从 JSON 输出中提取连接值：**

| 值 | JSON 路径 | 用于 |
|-------|-----------|----------|
| 端点主机 | `status.hosts.host` | `PGHOST`、`lakebase.postgres.host` |
| 端点资源路径 | `name` | `LAKEBASE_ENDPOINT`、`lakebase.postgres.endpointPath` |
| 数据库资源路径 | `name` | `lakebase.postgres.database` |
| PostgreSQL 数据库名 | `status.postgres_database` | `PGDATABASE`、`lakebase.postgres.databaseName` |

### 更新项目

```bash
databricks postgres update-project projects/<PROJECT_ID> spec.display_name \
  --json '{"spec": {"display_name": "My Updated Application"}}' \
  --profile <PROFILE>
```

### 删除项目

**警告：** 永久性 —— 删除所有分支、计算、数据库、角色和数据。**未经用户明确许可不要删除。**

```bash
databricks postgres delete-project projects/<PROJECT_ID> --profile <PROFILE>
```

## 自动扩缩

端点使用**计算单元（CU）**（每 CU 约 2 GB RAM）。范围：0.5--32 CU（动态）、36--112 CU（固定）。缩容到零默认启用（5 分钟超时）。

关于规格表、端点 CRUD 和配置细节，参见 [computes-and-scaling.md](references/computes-and-scaling.md)。

## 分支

分支是写时复制快照。用于测试 schema 迁移、尝试查询，或预览数据变更而不影响生产。

```bash
databricks postgres create-branch projects/<PROJECT_ID> <BRANCH_ID> \
  --json '{"spec": {"source_branch": "projects/<PROJECT_ID>/branches/<SOURCE>", "no_expiry": true}}' \
  --profile <PROFILE>
```

分支需要过期策略：永久用 `"no_expiry": true`，或用 `"ttl": "<seconds>s"`（最多 30 天）。

**限制：** 每个项目 10 个未归档分支。每个分支 8 TB 逻辑数据。每个工作区 1,000 个项目。

| 用例 | TTL |
|----------|-----|
| CI/CD 环境 | 2--4 小时（`"ttl": "14400s"`） |
| 演示 | 24--48 小时（`"ttl": "172800s"`） |
| 功能开发 | 1--7 天（`"ttl": "604800s"`） |
| 长期测试 | 最多 30 天（`"ttl": "2592000s"`） |

**时间点分支：** 从过去状态（恢复窗口内）创建以进行恢复。时间规范字段位于 `--json` spec 内（`spec.source_branch_time`、`spec.source_branch_lsn`），而非顶层 `create-branch` 标志。

**重置：** 用父级最新数据替换分支的数据和 schema。本地更改会丢失。根分支和有子分支的分支不能重置；受保护的分支（`spec.is_protected`）也不能重置。

**重置仅 UI 可用 —— 没有 `databricks postgres reset-branch` CLI 命令，也没有 API/SDK 方法。** 在 Lakebase App 中，前往项目的 **Branches** 页面，点击分支旁的菜单，选择 **Reset from parent**。

CLI 变通方法：
- **删除 + 重建：** `delete-branch`，然后用 `spec.source_branch` 设为父级来 `create-branch`（如果受保护，先通过 `update-branch` 取消保护）。
- **时间点：** 用 `spec.source_branch_time` 或 `spec.source_branch_lsn` 执行 `create-branch`。不支持基于时间戳的*重置*；改用 PITR 分支。

**删除：** 受保护的分支必须先取消保护（`update-branch` 将 `spec.is_protected` 设为 `false`）。不能删除有子分支的分支。**绝不要删除 `production` 分支。**

## 后续步骤

### 构建 Databricks App

创建项目后，脚手架化一个连接的 Databricks App：

```bash
# 1. Get branch name
databricks postgres list-branches projects/<PROJECT_ID> --profile <PROFILE>

# 2. Get database name
databricks postgres list-databases projects/<PROJECT_ID>/branches/<BRANCH_ID> --profile <PROFILE>

# 3. Scaffold with lakebase feature
databricks apps init --name <APP_NAME> --features lakebase \
  --set "lakebase.postgres.branch=<BRANCH_NAME>" \
  --set "lakebase.postgres.database=<DATABASE_NAME>" \
  --run none --profile <PROFILE>
```

完整应用工作流请使用 **`databricks-apps`** 技能。

### 将 Lakebase 附加到现有应用

`apps init --features lakebase`（上方）在脚手架时接线数据库。要将项目附加到**现有**应用，更新其资源。

**使用 `postgres` 资源键** —— 其字段是 `branch` + `database`（来自上表的完整资源路径）。遗留的 `database` 键（`instance_name` + `database_name`）已弃用；使用它会失败并报 `Database instance <name> does not exist`。从 `list-branches` / `list-databases` 获取确切路径（数据库名通常带连字符，例如 `databricks-postgres`）。

用 **`databricks apps create-update`** 更新应用的资源 —— 这是用于任何应用的方法（较旧的 `databricks apps update` 是遗留的，无法更改处于某个空间中的应用的资源）。`update_mask=resources` 会替换整个 `resources` 数组，因此要读取应用当前的资源并**合并**新资源进去（否则你会分离其余的）。在 `--json` 中传递一切；只有 `APP_NAME` 是位置参数：

```bash
databricks apps create-update <APP_NAME> --json @update.json --profile <PROFILE>   # waits for completion; --no-wait to return early
```

```json
{
  "update_mask": "resources",
  "app": {
    "resources": [
      {
        "name": "postgres",
        "postgres": {
          "branch": "projects/<PROJECT_ID>/branches/<BRANCH_ID>",
          "database": "projects/<PROJECT_ID>/branches/<BRANCH_ID>/databases/<DATABASE_ID>",
          "permission": "CAN_CONNECT_AND_CREATE"
        }
      }
    ]
  }
}
```

**与用户确认分支/数据库 —— 不要悄悄默认使用 `production`。** 应用的服务主体必须能够创建并**拥有**它在那里使用的 schema，因此要避免那些 schema 名已被某用户拥有的分支/数据库（SP 会遇到 `permission denied … 42501`）—— 一个全新/专用的分支，或一个新应用拥有的 schema，是最干净的。完整所有权模型见下方**已部署应用的 Schema 权限**。

### 已部署应用的 Schema 权限

应用的服务主体拥有 `CAN_CONNECT_AND_CREATE` —— 它可以创建新对象，但**无法访问现有 schema**。SP 必须创建 schema 才能成为其所有者。

**始终先部署应用，再在本地运行它。** 这是 Lakebase 权限错误的第一大来源。

**正确的工作流：**
1. **先部署**：`databricks apps deploy <APP_NAME> --profile <PROFILE>`
2. **授予本地访问** *（如果需要）*：通过 UI 分配 `databricks_superuser`（项目创建者已有访问权限）
3. **本地开发**：你的凭证获得对 SP 拥有的 schema 的 DML 访问

**如果你已经先在本地运行**并遇到 `permission denied`：schema 由你的凭证拥有，而非 SP。**未经询问用户不要删除 schema** —— 删除它会删除所有数据。

请用户选择：
- **(A) 删除并重新部署：** `databricks psql --project <PROJECT_ID> -- -c "DROP SCHEMA IF EXISTS <SCHEMA_NAME> CASCADE;"`，然后在应用目录执行 `databricks apps deploy`。SP 会在启动时重建 schema。
- **(B) 先导出，再删除并重新部署：** 通过 `pg_dump` 导出（使用 `databricks postgres get-endpoint` 的连接细节；HOST 和 TOKEN 见下方**其他工作流**），或用 `databricks psql --project <PROJECT_ID>` 将表复制到临时 schema，然后执行选项 A。在 SP 重新部署时重建 schema 后，用 `pg_restore` 或从临时 schema 重新 INSERT 恢复。

### 其他工作流

```bash
# Connect a Postgres client -- get connection string
databricks postgres get-endpoint projects/<PROJECT_ID>/branches/<BRANCH_ID>/endpoints/<ENDPOINT_ID> --profile <PROFILE>

# Manage roles
databricks postgres create-role -h

# Add a read replica
databricks postgres create-endpoint projects/<PROJECT_ID>/branches/<BRANCH_ID> <ENDPOINT_ID> \
  --json '{"spec": {"type": "ENDPOINT_TYPE_READ_ONLY"}}' --profile <PROFILE>
```

**对 Lakebase 运行 SQL**（GRANT、CREATE INDEX 等）：
```bash
# 1. Get endpoint host
databricks postgres get-endpoint projects/<PROJECT_ID>/branches/<BRANCH_ID>/endpoints/<ENDPOINT_ID> --profile <PROFILE>

# 2. Generate OAuth token
databricks postgres generate-database-credential \
  projects/<PROJECT_ID>/branches/<BRANCH_ID>/endpoints/<ENDPOINT_ID> \
  --profile <PROFILE>

# 3. Connect (use token from step 2 as password, host from step 1)
PGPASSWORD='<TOKEN>' psql "host=<HOST> user=<USERNAME> dbname=databricks_postgres sslmode=require"
```

> **注意：** `generate-database-credential` 需要**端点**资源路径（`.../endpoints/<ENDPOINT_ID>`），而非数据库或分支路径。

**可脚本化版本**（一次复制粘贴，对智能体有用）：
```bash
EP=projects/<PROJECT_ID>/branches/<BRANCH_ID>/endpoints/<ENDPOINT_ID>
# get-endpoint JSON shape: {"status": {"hosts": {"host": "<HOSTNAME>"}, ...}, ...}
HOST=$(databricks postgres get-endpoint $EP --profile <PROFILE> -o json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['status']['hosts']['host'])")
TOKEN=$(databricks postgres generate-database-credential $EP --profile <PROFILE> -o json \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")
PGPASSWORD="$TOKEN" psql "host=$HOST user=<USERNAME> dbname=databricks_postgres sslmode=require"
```

**授予应用 SP 访问同步表的权限**（在同步 ONLINE 且应用部署后以项目所有者身份运行）：
```sql
GRANT USAGE ON SCHEMA public TO "<SP_CLIENT_ID>";
GRANT SELECT ON ALL TABLES IN SCHEMA public TO "<SP_CLIENT_ID>";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "<SP_CLIENT_ID>";
```
对于最小权限，考虑同步到专用 schema 而非 `public`，以便授权仅限定于同步数据。

获取 SP client ID：`databricks apps get <APP_NAME> --profile <PROFILE>` → `service_principal_client_id` 字段。

**Data API：** Postgres 表上 PostgREST 兼容的 HTTP CRUD。参见 [connectivity.md](references/connectivity.md)。
**同步表：** 将 Delta 表同步到 Lakebase。参见 [synced-tables.md](references/synced-tables.md)。

## PostgreSQL 扩展

Lakebase 支持 PostgreSQL 扩展（例如用于向量嵌入的 `pgvector`、用于查询统计的 `pg_stat_statements`）。参见[支持的扩展完整列表](https://docs.databricks.com/aws/en/oltp/projects/extensions)。

```sql
-- List available extensions
SELECT * FROM pg_available_extensions ORDER BY name;

-- Install an extension
CREATE EXTENSION IF NOT EXISTS <extension_name>;
```

关于使用 pgvector 的向量嵌入，参见 [pgvector.md](references/pgvector.md)。

## 故障排查

| 错误 | 解决方案 |
|-------|----------|
| `cannot configure default credentials` | 使用 `--profile` 标志或先进行身份验证 |
| `PERMISSION_DENIED` | 检查工作区权限 |
| `permission denied for schema` | schema 由另一个角色拥有。如果应用尚未部署：先部署，让 SP 创建并拥有 schema。如果已部署但遇到此错误（开发先本地运行）：警告用户数据丢失，提出先导出（`pg_dump` 使用 `databricks postgres get-endpoint` 的连接细节，或通过 `databricks psql` 复制临时 schema），然后 `DROP SCHEMA IF EXISTS <SCHEMA_NAME> CASCADE` + 重新部署。 |
| 受保护分支无法删除 | 先 `update-branch` 将 `spec.is_protected` 设为 `false` |
| 长时间运行操作超时 | 使用 `--no-wait` 并用 `get-operation` 轮询 |
| 长查询期间 token 过期 | token 在 1 小时后过期；实现刷新（参见 [connectivity.md](references/connectivity.md)） |
| 缩容到零后连接被拒绝 | 计算约 100ms 唤醒；实现重试逻辑 |
| 分支删除被阻止 | 先删除子分支 |
| 自动扩缩范围过宽 | Max - Min 不能超过 16 CU |
| 需要 SSL 错误 | 始终使用 `sslmode=require` |
| 需要 update mask | 所有 `update-*` 操作都需要指定字段（参见 `-h`） |
| 空闲后连接关闭 | 24h 空闲超时；超过 24h 的最大生存期不保证。实现重试。 |
| DNS 解析失败（macOS） | Python `socket.getaddrinfo()` 对长主机名失败。用 `dig` 解析 IP，与 `host` 一起通过 `hostaddr` 参数传入（用于 TLS SNI）。参见 [connectivity.md](references/connectivity.md)。 |
| `storage_catalog` 管道失败 | `new_pipeline_spec.storage_catalog` 必须是常规 UC catalog，而非 Lakebase catalog。DLT 无法将事件日志写入由 Postgres 支撑的 schema。 |
| 同步表 CDF 错误 | 在源上启用 CDF：`ALTER TABLE ... SET TBLPROPERTIES (delta.enableChangeDataFeed = true)`。Triggered/Continuous 模式需要。 |
| 同步权限错误 | 确保对源表具 `USE CATALOG`/`USE SCHEMA`，且在存储 catalog 中具 `CREATE TABLE` |
| 同步表空字节 | STRING/ARRAY/MAP/STRUCT 列中的空字节（0x00）会导致同步失败。清理源数据：`REPLACE(col, CAST(CHAR(0) AS STRING), '')` |
| 同步表数据被修改 | 在 Postgres 中对同步表只允许读查询、索引和 DROP TABLE。修改会破坏同步管道。 |
| DABs `synced_database_tables` | 已弃用 —— 映射到遗留 API，在当前 Lakebase 上失败。改用 `postgres_synced_tables` 捆绑包资源（Beta，CLI v1.0.0+）或 `databricks postgres create-synced-table` CLI。 |

## SDK 与版本要求

| 组件 | 最低版本 |
|-----------|----------------|
| Databricks CLI | >= v0.294.0 |
| Databricks SDK for Python | >= 0.81.0（用于 `w.postgres` 模块） |
| psycopg | 2.x 或 3.x（异步/池化推荐 3.x） |
| Postgres | 16 或 17（默认：PG 17） |
