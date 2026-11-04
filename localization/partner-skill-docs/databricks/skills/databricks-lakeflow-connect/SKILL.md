---
name: databricks-lakeflow-connect
description: "使用 Lakeflow Connect 构建进入 Databricks 的托管摄取管道。适用于从 SaaS 应用（Salesforce、Workday Reports、ServiceNow、Google Analytics 4、HubSpot、Confluence）或数据库（SQL Server 云和本地；PuPr 中的 PostgreSQL/MySQL CDC）通过无服务器管道摄取到 Unity Catalog 时。"
compatibility: Requires databricks CLI (>= v0.294.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Lakeflow Connect

构建托管的摄取管道，从 SaaS 应用和数据库拉取数据到 Unity Catalog Delta 表，端到端受治理，由无服务器 Lakeflow Spark Declarative Pipelines（原名 Delta Live Tables / DLT）驱动。

**状态：** 混合 catalog —— GA 连接器可供生产使用，另有随时间不断扩展的公共预览、Beta 和私有预览连接器。参见下方的连接器 catalog。

---

## 什么是 Lakeflow Connect？

用于从 SaaS 应用和数据库摄取数据的托管连接器。生成的摄取管道由 Unity Catalog 治理，由无服务器计算和 Lakeflow Spark Declarative Pipelines 驱动。

需要记住三个框架：

- **简单且低维护** —— 无需编写客户端代码，无需运维消息总线；连接器 + UC Connection + 一个无服务器管道。
- **与湖仓统一** —— 凭证存储在 UC 中，输出是受治理的 Delta，像任何其他工作负载一样在 Jobs 和 SDP 上运行。
- **高效的增量处理** —— 变更跟踪 / CDC / schema 演进 / 重试都内置。

有四种架构模式：

1. **SaaS 拉取** —— 连接器通过 OAuth 或 API 密钥从外部 SaaS 读取，落地到流式 Delta 表。
2. **通过网关的数据库 CDC** —— 一个摄取网关在客户网络中运行，将变更事件暂存到 UC 卷，无服务器摄取管道将它们作为 CDC 应用到 Delta。
3. **基于查询** —— 对于没有原生 CDC 的源（Oracle / Teradata / SQL Server / PG / MySQL 基于查询，Snowflake / Redshift / Synapse / BigQuery 通过 Foreign Catalog），连接器发出周期性查询，而非订阅变更馈送。
4. **社区连接器** —— 基于模板，不在本技能范围内。

---

## Lakeflow Connect 是合适的工具吗？

在构建之前先决定这一点。Lakeflow Connect 是 SaaS 应用和数据库的托管**拉取**路径 —— 它并非适用于每一种摄取意图。

| 如果源是…… | 使用 | 技能 |
|---|---|---|
| 有托管连接器的 SaaS 应用或数据库（Salesforce、Workday、ServiceNow、GA4、HubSpot、Confluence、SQL Server、……） | **Lakeflow Connect** | 本技能 |
| 云对象存储上的文件（S3 / ADLS / GCS） | Auto Loader | **databricks-pipelines** |
| 你想就地查询、不复制副本的源 | Lakehouse Federation | — |
| 向你**推送**事件的应用或设备 | Zerobus | **databricks-zerobus-ingest** |
| 提供 Delta share 的合作伙伴 | Delta Sharing | — |

完整的推理，包括 Federation-vs-Connect 和 Auto-Loader-vs-Connect 的取舍，都在 [4-ingestion-decision-tree.md](references/4-ingestion-decision-tree.md) 中。

---

## 连接器 catalog

Lakeflow Connect 在多个发布阶段提供连接器。**GA** 和**公共预览**连接器受生产支持；**Beta** 和**私有预览**是早期访问，不受生产支持。

### GA 连接器

本技能中全面覆盖，除了 Reference 为公开文档页面的行。

| 源 | 类型 | 认证 | 参考 |
|--------|------|------|-----------|
| Salesforce（Sales / Service / 等） | SaaS 拉取 | OAuth U2M | [1-saas-connectors.md](references/1-saas-connectors.md) |
| Workday Reports（RaaS） | SaaS 拉取 | OAuth refresh token / basic | [1-saas-connectors.md](references/1-saas-connectors.md) |
| ServiceNow | SaaS 拉取 | OAuth U2M / basic | [1-saas-connectors.md](references/1-saas-connectors.md) |
| Google Analytics 4 | SaaS 拉取（通过 BigQuery） | 服务账号 JSON | [1-saas-connectors.md](references/1-saas-connectors.md) |
| HubSpot | SaaS 拉取 | OAuth | [1-saas-connectors.md](references/1-saas-connectors.md) |
| Confluence | SaaS 拉取 | OAuth | [1-saas-connectors.md](references/1-saas-connectors.md) |
| NetSuite | SaaS 拉取 | 基于 token 的认证（TBA） | [NetSuite 连接器文档](https://docs.databricks.com/ingestion/lakeflow-connect/netsuite) |
| Dynamics 365 | SaaS 拉取（通过 Azure Synapse Link） | OAuth U2M | [Dynamics 365 连接器文档](https://docs.databricks.com/ingestion/lakeflow-connect/d365) |
| SQL Server（云） | 数据库 CDC | DB 用户 + 变更跟踪 / CDC | [2-database-connectors.md](references/2-database-connectors.md) |
| SQL Server（本地） | 数据库 CDC | DB 用户 + ExpressRoute / Direct Connect | [2-database-connectors.md](references/2-database-connectors.md) |
| MySQL（集成式 CDC 管道，无网关） | 数据库 CDC | DB 用户 | [MySQL 集成式 CDC 管道文档](https://docs.databricks.com/ingestion/lakeflow-connect/mysql-integrated-pipeline) |
| Oracle / Teradata / SQL Server / PG / MySQL（基于查询） | 数据库查询 | DB 用户 | [基于查询的连接器文档](https://docs.databricks.com/ingestion/lakeflow-connect/query-based-overview) |
| Snowflake / Redshift / Synapse / BigQuery（Foreign Catalog） | 数据库查询 | Foreign Catalog | [基于查询的连接器文档](https://docs.databricks.com/ingestion/lakeflow-connect/query-based-overview) |

### 公共预览连接器

受生产支持。配置在 GA 之前可能演变。深入覆盖正逐步添加；在此之前，参见[公开连接器参考](https://docs.databricks.com/ingestion/lakeflow-connect/)了解当前设置步骤。

| 源 | 类型 | 认证 |
|--------|------|------|
| PostgreSQL CDC | 数据库 CDC | DB 用户 + 网关 |
| MySQL CDC（基于网关） | 数据库 CDC | DB 用户 + 网关 |
| SFTP | 文件拉取 | 密钥 / 密码 |

### Beta 和私有预览

早期访问连接器不受生产支持。列表每月变化；查看[公开连接器参考](https://docs.databricks.com/ingestion/lakeflow-connect/)了解当前可用性。

关于 Lakeflow-Connect-vs-Auto-Loader-vs-Federation-vs-Delta-Sharing 的决策，参见 [4-ingestion-decision-tree.md](references/4-ingestion-decision-tree.md)。

---

## 必需工具

- **Databricks CLI v0.294.0+** 用于 `databricks pipelines create` 和 `databricks connections create`。用 `databricks --version` 核实。
- **Databricks SDK for Python**（`databricks-sdk>=0.85.0`）如果你偏好 SDK 而非 CLI。
- **声明式自动化捆绑包** 如果以 IaC 形式编写（建议用于任何要交付到客户环境的管道）。

无需额外的连接器专用 SDK。Lakeflow Connect 复用 pipelines API 接口 —— 管道用 `ingestion_definition` 块而非 `libraries` 块创建，但 API 和 CLI 在其他方面相同。

---

## 前提条件

在创建任何管道之前确认：

1. **一个 Unity Catalog 目标** —— catalog 和 schema 必须存在；创建管道的服务主体或用户需要对目标 schema 的 `USE CATALOG`、`USE SCHEMA`、`CREATE TABLE` 和 `MODIFY` 权限。
2. **一个带源的凭证的 UC `CONNECTION` 对象**。SaaS OAuth U2M 连接必须通过 UI（Catalog Explorer）创建；API 密钥和基本认证连接可通过 CLI / DAB 创建。
3. **对于数据库连接器**：网关（经典计算，客户 VPC）与源数据库之间的网络可达性。本地需要 ExpressRoute（Azure）或 Direct Connect（AWS）。
4. **对于文件连接器**：SaaS 文件仓库（SharePoint / Google Drive）上的 OAuth scope 授权。

---

## 最小示例 —— Salesforce 摄取管道

标准的编写路径是 JSON 传给 `databricks pipelines create --json`。（Lakeflow Connect 没有 SQL `CREATE TABLE … FROM CONNECTION` 语法 —— 该语法仅存在于 Lakehouse Federation，那是另一个产品。）

```bash
databricks pipelines create --json '{
  "name": "salesforce_to_uc",
  "ingestion_definition": {
    "connection_name": "my_salesforce_oauth_connection",
    "objects": [
      {"table": {"source_schema": "salesforce", "source_table": "Account",
                 "destination_catalog": "main", "destination_schema": "salesforce_raw"}},
      {"table": {"source_schema": "salesforce", "source_table": "Opportunity",
                 "destination_catalog": "main", "destination_schema": "salesforce_raw"}}
    ]
  }
}'
```

DAB 编写的版本（生产路径），参见 [1-saas-connectors.md](references/1-saas-connectors.md)。

---

## 运行管道

编写完成后，部署并触发一次运行。捆绑包路径提供最干净的按键运行命令：

```bash
databricks bundle deploy -t dev
databricks bundle run salesforce_ingestion           # KEY = the pipeline resource key in the bundle; waits by default
databricks bundle run salesforce_ingestion --no-wait
```

用 `pipelines create --json` 以命令式方式创建的管道没有按名称运行的 CLI —— 改用管道 ID 启动并轮询一次更新：

```bash
databricks pipelines start-update <pipeline-id>             # returns an update_id
databricks pipelines get-update  <pipeline-id> <update-id>  # poll one update's status
databricks pipelines list-updates <pipeline-id>             # recent updates and their states
```

这种不对称正是用声明式自动化捆绑包编写的又一个理由。

---

## 详细指南

| 主题 | 文件 | 何时阅读 |
|-------|------|--------------|
| SaaS 连接器（Salesforce、Workday Reports、ServiceNow、GA4、HubSpot、Confluence） | [1-saas-connectors.md](references/1-saas-connectors.md) | 统一的 SaaS 模式、逐连接器差异、OAuth 流程、DAB 存根 |
| 数据库连接器（SQL Server 云 + 本地） | [2-database-connectors.md](references/2-database-connectors.md) | 网关模式、变更跟踪 vs CDC、网络设置 |
| 摄取决策树 | [4-ingestion-decision-tree.md](references/4-ingestion-decision-tree.md) | Lakeflow Connect vs Auto Loader vs Lakehouse Federation vs Delta Sharing |
| 故障排查与监控 | [5-troubleshooting-and-monitoring.md](references/5-troubleshooting-and-monitoring.md) | 事件日志查询、常见错误、升级指引 |

---

## 工作流

对于每个新的摄取管道：

1. **选择连接器类别** —— SaaS / 数据库 / 文件 / 推送 —— 并阅读匹配的参考文件。
2. **核实前提条件** —— UC 目标、源凭证、网络路径（数据库）、区域可用性。
3. **创建 UC `CONNECTION`** —— OAuth U2M 用 UI，其他一切用 CLI / DAB。
4. **编写管道** —— 一次性任务用 `databricks pipelines create --json`，任何交付给客户的东西用 DAB YAML。
5. **触发首次运行** 并观察事件日志；SQL 见 [5-troubleshooting-and-monitoring.md](references/5-troubleshooting-and-monitoring.md)。
6. **调度** 该触发式管道，用 Jobs 的 `pipeline_task`（cron 或间隔）。Lakeflow Connect 仅支持触发式运行 —— `continuous: false` 选择触发模式，但本身不是调度，因此节奏来自 Jobs 触发器。

---

## 反模式

三种看起来合理但会失败的形式 —— 错误与正确对照：

**1. `CREATE TABLE ... FROM CONNECTION` 是 Lakehouse Federation，而不是 Lakeflow Connect。**

```sql
-- WRONG: Federation syntax; no LFC equivalent exists
CREATE TABLE main.salesforce_raw.account FROM CONNECTION my_salesforce_conn;
```
```json
// RIGHT: author an ingestion_definition (see the Minimal Example above)
{"ingestion_definition": {"connection_name": "my_salesforce_conn", "objects": [/* ... */]}}
```

**2. 摄取管道携带 `ingestion_definition`，绝不携带 `libraries` 块。**

```json
// WRONG: libraries is for a standard SDP pipeline running your notebooks/files
{"name": "salesforce_to_uc", "libraries": [{"notebook": {"path": "/Repos/.../ingest"}}]}
// RIGHT:
{"name": "salesforce_to_uc", "ingestion_definition": {"connection_name": "...", "objects": []}}
```

**3. `continuous: true` 会被拒绝 —— Lakeflow Connect 仅支持触发式。**

```json
// WRONG: continuous mode fails at create
{"continuous": true, "ingestion_definition": {/* ... */}}
// RIGHT: continuous:false (or omit) + schedule with a Jobs pipeline_task
{"continuous": false, "ingestion_definition": {/* ... */}}
```

---

## 重要事项

- **仅触发式，无持续模式** —— 管道按计划或按需运行，绝不持续运行。查看连接器参考了解最新状态。
- **仅计算计费** —— Lakeflow Connect 以 DBU 计费（无按行费用）。数据库连接器除无服务器摄取管道 DBU 外，还会产生经典计算网关 DBU。当前费率见[定价页](https://www.databricks.com/product/pricing/lakeflow-connect)。
- **Salesforce 认证仅 OAuth U2M** —— 不支持机器对机器，不支持基本认证。创建连接需要 UI 走查。
- **数据库暂存保留默认 30 天**，位于网关和摄取管道之间的 UC 卷中。
- **每个管道的限制** —— 大多数 SaaS 连接器每个管道上限 250 张表。如需可分为多个管道。
- **这落地的是原始表** —— Lakeflow Connect 写入忠实于源的表（摄取落地区）。在其上用 **databricks-pipelines** 构建 medallion Bronze/Silver/Gold 转换。

---

## 关键概念

- **UC `CONNECTION` 是凭证锚点** —— 每个 Lakeflow Connect 管道都指向一个 UC 连接。连接拥有认证；管道按名称引用它。
- **无服务器摄取管道 +（可选）经典网关** —— SaaS 连接器是纯无服务器的。数据库连接器分为客户网络网关（经典）和无服务器摄取管道（绑定 Delta）。
- **CDC 和 schema 演进内置** —— 对于支持变更跟踪或 CDC 的源，连接器增量应用变更并演进目标 schema。数据类型变更通常需要全量快照重载。
- **流式 Delta 输出** —— 目标表是受治理的 Delta 表；CDC 源以变更语义应用（`APPLY CHANGES` / AUTO CDC，或针对快照源的 `apply_changes_from_snapshot`）。兼容下游物化视图和 Spark 流式。
- **OAuth U2M 仅 UI** —— DAB / CLI 无法引导 OAuth U2M 连接。将一次性浏览器步骤交给人工（Catalog Explorer > External Data > Connections > Create connection > 选择源 > 登录），然后在 `databricks connections get <connection_name>` 报告 `READY` 后继续。

---

## 常见问题

关于常见错误及其修复 —— 重复键违约、水位线 / 游标问题、schema 演进、网关区域可用性、`channel` runtime-channel 设置，以及运行但不落地数据的管道 —— 参见 [5-troubleshooting-and-monitoring.md](references/5-troubleshooting-and-monitoring.md)，其中还有诊断它们的事件日志查询。

---

## 相关技能

- **databricks-pipelines** —— Lakeflow Connect 管道所运行的 SDP 运行时。用于 Auto Loader 和下游管道模式。
- **databricks-zerobus-ingest** —— 基于推送的 gRPC 摄取。Lakeflow Connect 基于拉取的连接器的兄弟。
- **databricks-dabs** —— 以 IaC 形式编写 Lakeflow Connect 管道。
- **databricks-unity-catalog** —— 管理 LFC 凭证所在的 catalog、schema 和 UC `CONNECTION` 对象。
- **databricks-jobs** —— 用 `pipeline_task` 调度摄取管道。

---

## 资源

- [Lakeflow Connect 公开文档中心](https://docs.databricks.com/aws/en/ingestion/lakeflow-connect)
- [连接器参考（逐连接器设置）](https://docs.databricks.com/ingestion/lakeflow-connect/)
- [定价](https://www.databricks.com/product/pricing/lakeflow-connect)
