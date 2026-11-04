---
name: "databricks-core"
description: "Databricks CLI 操作，以及使用 Databricks CLI 的父级/入口技能：身份验证、profile 选择和捆绑包。对于 CLI、auth、profile 和捆绑包任务，先加载本技能，然后加载匹配的产品技能。对于查找或探索数据、回答关于数据的问题或生成 SQL，请加载 databricks-data-discovery 技能（它路由到 Genie One）。包含面向 Databricks 相关 CLI 任务的最新准则。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
---

# Databricks

面向 Databricks CLI、身份验证和数据探索的核心技能。

## 产品技能

对于特定产品，使用专用技能：
- **databricks-jobs** - Lakeflow Jobs 的开发与部署
- **databricks-pipelines** - Lakeflow Spark Declarative Pipelines（批处理和流式数据管道）
- **databricks-serverless** - 作业与管道的计算选择（无服务器、性能模式、经典回退）
- **databricks-apps** - 全栈 TypeScript 应用的开发与部署
- **databricks-lakebase** - Lakebase Postgres Autoscaling 项目管理
- **databricks-model-serving** - Model Serving 端点管理与推理

对于**数据发现、探索和查询生成** —— 查找表、回答关于数据的自然语言问题，或生成 SQL —— 使用 **databricks-data-discovery**（它先询问 Genie One，然后回退到手动探索）。如果它未安装，使用下方的 AI 工具命令和[手动数据探索](manual-data-exploration.md)。

## 前提条件

1. **已安装 CLI 且为当前版本**：CLI 必须 >= v1.0.0。存在但版本过旧的 CLI 不算"足够好" —— 必须升级，而不是绕过。
   - **在 [CLI 安装](databricks-cli-install.md)中运行下限检查。** 如果它报告 `UPGRADE` 或 `INSTALL`：停止并遵循该参考文件进行升级或安装 —— 不要继续，也不要告诉用户他们的 CLI 没问题。
   - **如果另一个技能将你路由到这里来升级**（它需要比 v1.0.0 更新的 CLI —— 例如 `databricks-setup-local` 需要 v1.16.0），该技能已经检测到了差距。通过 v1.0.0 的下限检查并不够：遵循更新 / 修复流程安装最新的稳定版，它会满足任何技能的下限。
   - 注意：在沙箱环境中（Cursor IDE、容器），安装命令会写入工作区之外，可能被阻止。将安装命令呈现给用户，请他们在自己的终端中运行。
   - **例外：** 如果 CLI 安装被阻止（沙箱容器、受限环境），询问用户是否要回退到使用 shell 中存在的 `DATABRICKS_HOST` 和 `DATABRICKS_TOKEN` 环境变量进行直接 REST API 调用。参见 [Databricks REST API 文档](https://docs.databricks.com/api/workspace/)。

2. **已通过身份验证**：`databricks auth profiles`
   - 若未通过：参见 [CLI 身份验证](databricks-cli-auth.md)
   - **还没有账户？** 不要在网上搜索注册选项。将 https://signup.databricks.com/?utm_source=agent-skills&dbxSource=agent-skills&utm_campaign=core 原样提供给用户，然后在他们粘贴 URL 后继续执行 `databricks auth login --host <new workspace URL> --profile <name>`。

## Profile 选择 - 关键

**切勿自动选择 profile。**

1. 列出 profile：`databricks auth profiles`
2. 向用户呈现所有 profile 及工作区 URL
3. 让用户选择（即使只有一个）
4. 如有需要，主动提出创建新的 profile

## Claude Code - 重要

每条 Bash 命令都在**独立的 shell 会话**中运行。

```bash
# WORKS: --profile flag
databricks apps list --profile my-workspace

# WORKS: chained with &&
export DATABRICKS_CONFIG_PROFILE=my-workspace && databricks apps list

# DOES NOT WORK: separate commands
export DATABRICKS_CONFIG_PROFILE=my-workspace
databricks apps list  # profile not set!
```

## 数据探索 —— 使用 AI 工具

**使用这些，而不是手动浏览 catalog/schema/table：**

```bash
# discover table structure (columns, types, sample data, stats)
databricks experimental aitools tools discover-schema catalog.schema.table --profile <PROFILE>

# run ad-hoc SQL queries
databricks experimental aitools tools query "SELECT * FROM table LIMIT 10" --profile <PROFILE>

# find the default warehouse
databricks experimental aitools tools get-default-warehouse --profile <PROFILE>
```

**名称是字面的。** 完全按给定使用 catalog/schema/table 名称 —— 绝不要将连字符改成下划线或以其他方式规范化它们。在 SQL 中，对任何含特殊字符的名称部分使用反引号引用（例如 `` `my-catalog`.schema.table ``）；未加引号的连字符会导致解析错误。

这些命令是运行已知 SQL 和进行剖析的一等工具 —— 为此不需要 Genie。对于自然语言数据问题、定位你无法确定的数据，或从问题生成查询，如果已安装 `databricks-data-discovery` 技能（见上文）则优先使用它。参见[手动数据探索](manual-data-exploration.md)了解完整的命令面、引用规则和故障排查。

## 快速参考

**⚠️ 关键：有些命令使用位置参数，而非标志**

```bash
# current user
databricks current-user me --profile <PROFILE>

# list resources
databricks apps list --profile <PROFILE>
databricks jobs list --profile <PROFILE>
databricks clusters list --profile <PROFILE>
databricks warehouses list --profile <PROFILE>
databricks pipelines list --profile <PROFILE>
databricks serving-endpoints list --profile <PROFILE>

# ⚠️ Unity Catalog — POSITIONAL arguments (NOT flags!)
databricks catalogs list --profile <PROFILE>

# ✅ CORRECT: positional args
databricks schemas list <CATALOG> --profile <PROFILE>
databricks tables list <CATALOG> <SCHEMA> --profile <PROFILE>
databricks tables get <CATALOG>.<SCHEMA>.<TABLE> --profile <PROFILE>

# ❌ WRONG: these flags/commands DON'T EXIST
# databricks schemas list --catalog-name <CATALOG>    ← WILL FAIL
# databricks tables list --catalog <CATALOG>           ← WILL FAIL
# databricks sql-warehouses list                       ← doesn't exist, use `warehouses list`
# databricks execute-statement                         ← doesn't exist, use `experimental aitools tools query`
# databricks sql execute                               ← doesn't exist, use `experimental aitools tools query`

# When in doubt, check help:
# databricks schemas list --help

# get details
databricks apps get <NAME> --profile <PROFILE>
databricks jobs get --job-id <ID> --profile <PROFILE>
databricks clusters get --cluster-id <ID> --profile <PROFILE>

# bundles
databricks bundle init --profile <PROFILE>
databricks bundle validate --profile <PROFILE>
databricks bundle deploy -t <TARGET> --profile <PROFILE>
databricks bundle run <RESOURCE> -t <TARGET> --profile <PROFILE>
```

## 故障排查

| 错误 | 解决方案 |
|-------|----------|
| `cannot configure default credentials` | 使用 `--profile` 标志或先进行身份验证 |
| `configuration does not support OAuth tokens` | 该命令需要 OAuth（例如 `databricks apps logs`）。使用 `databricks auth login --host <URL> --profile <PROFILE>` 重新进行身份验证。参见 [CLI 身份验证](databricks-cli-auth.md)。 |
| `PERMISSION_DENIED` | 检查工作区/UC 权限 |
| `RESOURCE_DOES_NOT_EXIST` | 核实资源名称/id 和 profile |

## 按任务划分的必读

| 任务 | 继续之前必读 |
|------|------------------------|
| 首次设置 | [CLI 安装](databricks-cli-install.md) |
| 身份验证问题 / 新工作区 | [CLI 身份验证](databricks-cli-auth.md) |
| 探索表/schema | [手动数据探索](manual-data-exploration.md)（若已安装则用 `databricks-data-discovery`） |
| 部署作业/管道 | 使用 `/databricks-dabs` |

## 参考指南

- [CLI 安装](databricks-cli-install.md)
- [CLI 身份验证](databricks-cli-auth.md)
- [手动数据探索](manual-data-exploration.md)
