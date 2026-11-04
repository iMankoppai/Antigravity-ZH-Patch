---
name: databricks-execution-compute
description: "在 Databricks 上执行代码并管理计算：通过无服务器、经典或交互式集群运行 Python/Scala/SQL/R，并创建/调整大小/删除集群和 SQL 数仓。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks 执行与计算

在 Databricks 上运行代码。有三种执行模式 —— 根据工作负载选择。以下所有示例都使用 Databricks CLI；安装和身份验证参见 `databricks-core` 技能。

## 执行模式决策矩阵

| 方面 | [Databricks Connect](references/1-databricks-connect.md) ⭐ | [无服务器作业](references/2-serverless-job.md) | [交互式集群](references/3-interactive-cluster.md) |
|--------|-------------------|----------------|---------------------|
| **用于** | Spark 代码（ETL、数据生成） | 重度处理（ML） | 跨工具调用的状态、Scala/R |
| **启动** | 即时 | 约 25-50 秒冷启动 | 若已停止则约 5 分钟 |
| **状态** | 在 Python 进程内 | 无 | 通过 context_id |
| **语言** | Python（PySpark） | Python、SQL | Python、Scala、SQL、R |
| **依赖** | `withDependencies()` | 带 environments spec 的 CLI | 在集群上安装 |

### 决策流程

主要决策点：如果你正在使用声明式自动化捆绑包（DABs），则先遵循 [`databricks-dabs` 技能](../../skills/databricks-dabs/SKILL.md)的说明。简而言之，你可以用 `databricks bundle run` 运行与作业、管道及其他资源关联的代码。这可以通过查看项目根目录中是否有 `databricks.yml` 文件来识别。如果这些资源不存在，或者你没有使用 DABs，则按以下继续进行。

对于所有基于 Spark 的工作负载，优先用 Databricks Connect，其次是无服务器。
```
Spark-based code? → Databricks Connect (fastest)
  └─ Python 3.12 missing? → Install it + databricks-connect
  └─ Install fails? → Ask user (don't auto-switch modes)

Heavy/long-running (ML)? → Serverless Job (independent)
Need state across calls? → Interactive Cluster (list and ask which one to use)
Scala/R? → Interactive Cluster (list and ask which one to use)
```


## 如何运行代码

**继续之前，请阅读你所选模式的参考文件。**

### Databricks Connect（本地运行，当它是纯 Spark 代码时优先）→ [参考](references/1-databricks-connect.md)

```bash
from databricks.connect import DatabricksSession
...
spark = DatabricksSession.builder.profile("my-local-profile").serverless(True).getOrCreate()


python my_spark_script.py
```

### 无服务器作业 → [参考](references/2-serverless-job.md)

纯 CLI 流程：将本地文件上传为工作区 notebook，用 `databricks jobs submit` 触发一次性运行（一次调用中完成创建 + 运行，临时性 —— 无 Jobs UI 条目，无重试），然后轮询 + 获取结果。本地文件必须是 Databricks 源 notebook —— 首行为 `# Databricks notebook source`（Python）或 `-- Databricks notebook source`（SQL）。

**1. 将本地文件上传为工作区 notebook。** `TARGET_PATH` 是位置参数；`--file` 是本地路径。

`databricks workspace import /Workspace/Users/<user>/.ai_dev_kit/train --file /local/path/to/train.py --format SOURCE --language PYTHON --overwrite`

**2. 提交运行。** 用 `--no-wait` 可立即拿回 `{"run_id": N}`；去掉它则阻塞直到终止。**`"client": "4"` 是必需的**，`dependencies` 才会安装（`"1"` 会静默忽略它们）。

`databricks jobs submit --no-wait --json @submit.json`

```json
{
  "run_name": "train-run",
  "tasks": [{
    "task_key": "main",
    "notebook_task": {"notebook_path": "/Workspace/Users/<user>/.ai_dev_kit/train"},
    "environment_key": "ml_env"
  }],
  "environments": [{
    "environment_key": "ml_env",
    "spec": {"client": "4", "dependencies": ["scikit-learn==1.5.2", "mlflow==2.22.0"]}
  }]
}
```

**3. 检查状态 / 等待完成。** 生命周期：`PENDING` → `RUNNING` → `TERMINATED`（或 `SKIPPED` / `INTERNAL_ERROR`）。只有当生命周期为 `TERMINATED` 后才读取 `.state.result_state`（`SUCCESS` / `FAILED` / `CANCELED`）。

`databricks jobs get-run <RUN_ID> | jq '{state: .state.life_cycle_state, result: .state.result_state, duration_ms: .execution_duration, url: .run_page_url, task_run_id: .tasks[0].run_id}'`

**4. 获取输出 / 错误。** **陷阱：** `get-run-output` 接受的是**任务**的 run_id（`.tasks[0].run_id`），而非提交时的父级 `run_id`。`notebook_output.result` 是传给 `dbutils.notebook.exit()` 的字符串。

`databricks jobs get-run-output <TASK_RUN_ID> | jq '{result: .notebook_output.result, error, error_trace}'`

始终在 notebook 中使用 `dbutils.notebook.exit(<string>)` —— `print()` 不会被 `get-run-output` 捕获。对于 JSON 结果：`dbutils.notebook.exit(json.dumps({...}))`，然后在客户端解析 `.notebook_output.result`。

### 交互式集群 → [参考](references/3-interactive-cluster.md)

**默认避免 —— 优先用无服务器作业。** 只在以下情况才使用交互式集群：
- 你已有正在运行且可用的经典集群，或
- 你需要跨多次调用的实时、有状态执行（通过执行上下文调试），或
- 用户明确要求。

交互式集群**启动很慢（3-8 分钟）**且在运行期间花钱。不要隐式启动一个。

## CLI 命令映射

所有计算生命周期和代码执行操作都通过 Databricks CLI。主要命令：

| 操作 | 命令 |
|--------|---------|
| 将本地文件上传为工作区 notebook | `databricks workspace import <WORKSPACE_PATH> --file <LOCAL> --format SOURCE --language PYTHON --overwrite` |
| 运行无服务器代码（上传 + 提交 + 等待） | `databricks jobs submit --json @submit.json`（参见上方的无服务器作业章节；用 `--no-wait` 异步运行） |
| 获取运行状态 / 等待 | `databricks jobs get-run <RUN_ID>`（轮询 `.state.life_cycle_state`） |
| 获取运行输出 | `databricks jobs get-run-output <TASK_RUN_ID>` |
| 列出集群 | `databricks clusters list --output json` |
| 获取集群详情 | `databricks clusters get <CLUSTER_ID>` |
| 启动 / 重启 / 终止集群 | `databricks clusters start/restart/delete <CLUSTER_ID>` |
| 永久删除集群 | `databricks clusters permanent-delete <CLUSTER_ID>` |
| 创建集群 | `databricks clusters create --json '{...}'`（参见 [3-interactive-cluster.md](references/3-interactive-cluster.md)） |
| 列出节点类型 / Spark 版本 | `databricks clusters list-node-types` / `databricks clusters spark-versions` |
| 在运行中的集群上执行代码 | `databricks api post /api/1.2/contexts/create` + `databricks api post /api/1.2/commands/execute`（参见 [3-interactive-cluster.md](references/3-interactive-cluster.md)） |
| SQL 数仓 | `databricks warehouses create/list/get/start/stop/edit/delete`（参见下方 SQL 数仓） |

### SQL 数仓

所有接受 `ID` 的命令都使用位置参数（无 `--id` 标志）。使用 `databricks warehouses list` 查找 ID。

```bash
# Create a serverless SQL warehouse. min_num_clusters + max_num_clusters are REQUIRED
# (the server rejects the default 0). Keep the aidevkit_project tag for resource tracking.
databricks warehouses create --json '{
  "name": "my-warehouse",
  "cluster_size": "Small",
  "enable_serverless_compute": true,
  "auto_stop_mins": 10,
  "min_num_clusters": 1,
  "max_num_clusters": 1,
  "tags": {"custom_tags": [{"key": "aidevkit_project", "value": "ai-dev-kit"}]}
}'

# List / find — trim to id, name, state with jq
databricks warehouses list -o json | jq '.[] | {id, name, state, size: .cluster_size}'

# Find by name
databricks warehouses list -o json | jq '.[] | select(.name == "my-warehouse")'

# Get one warehouse's full config
databricks warehouses get <WAREHOUSE_ID>

# Start / stop (both are LROs; add --no-wait to return immediately)
databricks warehouses start <WAREHOUSE_ID>
databricks warehouses stop  <WAREHOUSE_ID>

# Resize / reconfigure — pass the FULL desired config (omitted fields revert to defaults,
# so always re-state min_num_clusters/max_num_clusters). Use --no-wait if the warehouse
# is STOPPED, otherwise edit blocks trying to reach RUNNING and errors out (the mutation
# itself still applies). When the warehouse is already RUNNING, --no-wait is optional.
databricks warehouses edit <WAREHOUSE_ID> --no-wait --json '{
  "name": "my-warehouse",
  "cluster_size": "Medium",
  "enable_serverless_compute": true,
  "auto_stop_mins": 15,
  "min_num_clusters": 1,
  "max_num_clusters": 1
}'

# Delete (irreversible)
databricks warehouses delete <WAREHOUSE_ID>
```

**大小：** `2X-Small`、`X-Small`、`Small`、`Medium`、`Large`、`X-Large`、`2X-Large`、`3X-Large`、`4X-Large`。**类型：** 在 JSON 体中设置 `"warehouse_type": "PRO"`（默认）或 `"CLASSIC"`。

## 相关技能

- **[databricks-synthetic-data-gen](../databricks-synthetic-data-gen/SKILL.md)** — 使用 Spark + Faker 生成数据
- **databricks-jobs** — 生产作业编排
- **[databricks-dbsql](../databricks-dbsql/SKILL.md)** — SQL 数仓与 AI 函数
