---
name: databricks-jobs
description: 通过 DABs、Python SDK 或 CLI 在 Databricks 上开发和部署 Lakeflow Jobs。适用于使用 notebook、Python wheel、SQL、dbt 或管道创建数据工程作业时。在开始实现之前调用。对于计算（无服务器、性能模式、经典），也应使用 databricks-serverless。
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.3.0"
parent: databricks-core
---

# Lakeflow Jobs 开发

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证、profile 选择和数据探索命令。

**计算**：作业默认在无服务器上运行。在你选择计算或编写任何集群设置之前，使用 `databricks-serverless` 技能；它决定是无服务器还是经典，以及性能模式。

Lakeflow Jobs 通过多任务 DAG、灵活的触发器和全面的监控来编排数据工作流。作业支持多样的任务类型，可通过声明式自动化捆绑包（DABs）、Python SDK 或 CLI 管理。

## 参考文件

| 用例 | 参考文件 |
|----------|----------------|
| 配置任务类型（notebook、Python、SQL、dbt、pipeline、JAR、run_job、for_each） | [references/task-types.md](references/task-types.md) |
| 设置触发器和调度（cron、周期性、文件到达、表更新、持续） | [references/triggers-schedules.md](references/triggers-schedules.md) |
| 配置通知、健康规则、重试、超时、队列 | [references/notifications-monitoring.md](references/notifications-monitoring.md) |
| 完整的实例（ETL、数仓刷新、事件驱动、ML 训练、多环境、流式、跨作业） | [references/examples.md](references/examples.md) |

## 脚手架化新的作业项目

使用带配置文件的 `databricks bundle init` 以非交互方式脚手架化。这会在 `<project_name>/` 目录中创建一个项目：

```bash
databricks bundle init default-python --config-file <(echo '{"project_name": "my_job", "include_job": "yes", "include_pipeline": "no", "include_python": "yes", "serverless": "yes"}') --profile <PROFILE> < /dev/null
```

- `project_name`：仅限字母、数字、下划线

`bundle init` 还会在项目中创建一个 `AGENTS.md`。为该项目建设性地定制那个文件，而不是创建新的智能体指令文件。

## 项目结构

```
my-job-project/
├── databricks.yml              # Bundle configuration
├── resources/
│   └── my_job.job.yml          # Job definition
├── src/
│   ├── my_notebook.ipynb       # Notebook tasks
│   └── my_module/              # Python wheel package
│       ├── __init__.py
│       └── main.py
├── tests/
│   └── test_main.py
└── pyproject.toml              # Python project config (if using wheels)
```

## 快速开始

### 声明式自动化捆绑包（DABs）—— 推荐

```yaml
# resources/jobs.yml
resources:
  jobs:
    my_etl_job:
      name: "[${bundle.target}] My ETL Job"
      tasks:
        - task_key: extract
          notebook_task:
            notebook_path: ../src/notebooks/extract.py
      # no cluster block = serverless; compute details: databricks-serverless
```

### Python SDK

```python
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.jobs import Task, NotebookTask, Source

w = WorkspaceClient()

job = w.jobs.create(
    name="my-etl-job",
    tasks=[
        Task(
            task_key="extract",
            notebook_task=NotebookTask(
                notebook_path="/Workspace/Shared/etl/extract",
                source=Source.WORKSPACE,
            ),
        ),
    ],
)
print(f"Created job: {job.job_id}")
```

### CLI

```bash
databricks jobs create --json '{
  "name": "my-etl-job",
  "tasks": [{
    "task_key": "extract",
    "notebook_task": {
      "notebook_path": "/Workspace/Shared/etl/extract",
      "source": "WORKSPACE"
    }
  }]
}'
```

## 核心概念

### 多任务工作流

作业支持基于 DAG 的任务依赖：

```yaml
tasks:
  - task_key: extract
    notebook_task:
      notebook_path: ../src/extract.py

  - task_key: transform
    depends_on:
      - task_key: extract
    notebook_task:
      notebook_path: ../src/transform.py

  - task_key: load
    depends_on:
      - task_key: transform
    run_if: ALL_SUCCESS  # Only run if all dependencies succeed
    notebook_task:
      notebook_path: ../src/load.py
```

**run_if 条件：**

- `ALL_SUCCESS`（默认）—— 当所有依赖成功时运行
- `ALL_DONE` —— 当所有依赖完成时运行（成功或失败）
- `AT_LEAST_ONE_SUCCESS` —— 当至少一个依赖成功时运行
- `NONE_FAILED` —— 当没有依赖失败时运行
- `ALL_FAILED` —— 当所有依赖失败时运行
- `AT_LEAST_ONE_FAILED` —— 当至少一个依赖失败时运行

### 任务类型摘要

| 任务类型 | 用例 | 参考 |
|-----------|----------|-----------|
| `notebook_task` | 运行 notebook | [references/task-types.md#notebook-task](references/task-types.md#notebook-task) |
| `spark_python_task` | 运行 Python 脚本 | [references/task-types.md#spark-python-task](references/task-types.md#spark-python-task) |
| `python_wheel_task` | 运行 Python wheel | [references/task-types.md#python-wheel-task](references/task-types.md#python-wheel-task) |
| `sql_task` | 运行 SQL 查询/文件/仪表板/告警 | [references/task-types.md#sql-task](references/task-types.md#sql-task) |
| `dbt_task` | 运行 dbt 项目 | [references/task-types.md#dbt-task](references/task-types.md#dbt-task) |
| `pipeline_task` | 触发 SDP（原 DLT）管道 | [references/task-types.md#pipeline-task](references/task-types.md#pipeline-task) |
| `spark_jar_task` | 运行 Spark JAR | [references/task-types.md#spark-jar-task](references/task-types.md#spark-jar-task) |
| `run_job_task` | 触发其他作业 | [references/task-types.md#run-job-task](references/task-types.md#run-job-task) |
| `for_each_task` | 对输入进行循环 | [references/task-types.md#for-each-task](references/task-types.md#for-each-task) |

### 触发器类型摘要

| 触发器类型 | 用例 | 参考 |
|--------------|----------|-----------|
| `schedule` | 基于 cron 的调度 | [references/triggers-schedules.md#cron-schedule](references/triggers-schedules.md#cron-schedule) |
| `trigger.periodic` | 基于间隔 | [references/triggers-schedules.md#periodic-trigger](references/triggers-schedules.md#periodic-trigger) |
| `trigger.file_arrival` | 文件到达事件 | [references/triggers-schedules.md#file-arrival-trigger](references/triggers-schedules.md#file-arrival-trigger) |
| `trigger.table_update` | Unity Catalog 表变更事件 | [references/triggers-schedules.md#table-update-trigger](references/triggers-schedules.md#table-update-trigger) |
| `continuous` | 常驻运行的作业 | [references/triggers-schedules.md#continuous-jobs](references/triggers-schedules.md#continuous-jobs) |

## 计算配置

无服务器是默认。省略集群设置（`job_clusters`、`new_cluster`、`job_cluster_key`、`existing_cluster_id`）；没有这些设置的 notebook、Python 脚本、wheel 或 JAR 任务在无服务器上运行。SQL 任务以及 dbt 任务的 SQL 在 SQL 数仓上运行（`warehouse_id`，参见[任务类型](references/task-types.md)）；pipeline 任务在管道自己的计算上运行（管道中的 `serverless: true`），作业的 `performance_target` 设置其模式。如果创建或运行作业因工作区无服务器不可用而失败，就把整个作业放到经典上并说明（为在作业计算上运行的任务使用作业集群）。

关于计算的其他一切，**使用 `databricks-serverless` 技能**：性能模式（`performance_target`）、库（`environments`）、可能无法在无服务器上运行的现有代码，以及少数需要经典集群的工作负载。如果该技能未安装，运行 `databricks aitools install`。无论哪种方式，都要在每个作业上设置 `performance_target`：`STANDARD` 以优化成本，当作业对时间敏感、交互式或其他工作负载依赖它时用 `PERFORMANCE_OPTIMIZED`。

## 作业参数

在作业级定义的参数会传给所有任务（无需逐任务重复）：

```yaml
parameters:
  - name: env
    default: "dev"
  - name: date
    default: "{{start_date}}"  # Dynamic value reference
```

在 notebook 中访问：

```python
catalog = dbutils.widgets.get("env")
load_date = dbutils.widgets.get("date")
```

传给特定任务：

```yaml
tasks:
  - task_key: my_task
    notebook_task:
      notebook_path: ../src/notebook.py
      base_parameters:
        env: "{{job.parameters.env}}"
        custom_param: "value"
```

## 常见操作

### Python SDK

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# List jobs
jobs = w.jobs.list()

# Get job details
job = w.jobs.get(job_id=12345)

# Run job now
run = w.jobs.run_now(job_id=12345)

# Run with parameters
run = w.jobs.run_now(
    job_id=12345,
    job_parameters={"env": "prod", "date": "2024-01-15"},
)

# Cancel run
w.jobs.cancel_run(run_id=run.run_id)

# Delete job
w.jobs.delete(job_id=12345)
```

### CLI

```bash
# List jobs
databricks jobs list

# Get job details
databricks jobs get 12345

# Run job
databricks jobs run-now 12345

# Run with parameters (must use --json with job_id inside)
databricks jobs run-now --json '{"job_id": 12345, "job_parameters": {"env": "prod"}}'

# Cancel run
databricks jobs cancel-run 67890

# Delete job
databricks jobs delete 12345
```

### 声明式自动化捆绑包操作

```bash
# Validate configuration
databricks bundle validate --profile <profile>

# Deploy to a target
databricks bundle deploy -t dev --profile <profile>

# Run a job
databricks bundle run <job_name> -t dev --profile <profile>

# Check run status
databricks jobs get-run --run-id <id> --profile <profile>

# Destroy resources
databricks bundle destroy --auto-approve
```

## 权限（DABs）

```yaml
resources:
  jobs:
    my_job:
      name: "My Job"
      permissions:
        - level: CAN_VIEW
          group_name: "data-analysts"
        - level: CAN_MANAGE_RUN
          group_name: "data-engineers"
        - level: CAN_MANAGE
          user_name: "admin@example.com"
```

**权限级别：**

- `CAN_VIEW` —— 查看作业和运行历史
- `CAN_MANAGE_RUN` —— 查看、触发和取消运行
- `CAN_MANAGE` —— 完全控制，包括编辑和删除

## 单元测试

在本地运行单元测试：

```bash
uv run pytest
```

## 开发工作流

1. **验证**：`databricks bundle validate --profile <profile>`
2. **部署**：`databricks bundle deploy -t dev --profile <profile>`
3. **运行**：`databricks bundle run <job_name> -t dev --profile <profile>`
4. **检查运行状态**：`databricks jobs get-run --run-id <id> --profile <profile>`

## 常见问题

| 问题 | 解决方案 |
|-------|----------|
| 无服务器作业启动缓慢 | `performance_target: PERFORMANCE_OPTIMIZED`；参见 databricks-serverless |
| 任务依赖不工作 | 核实 `depends_on` 中的 `task_key` 引用完全匹配 |
| 调度未触发 | 检查 `pause_status: UNPAUSED` 和有效的时区 |
| 文件到达未检测到 | 确保路径具有正确权限并使用云存储 URL |
| 表更新触发器缺少事件 | 核实 Unity Catalog 表和正确的授权 |
| 参数无法访问 | 在 notebook 中使用 `dbutils.widgets.get()` |
| `admins` 组错误 | 无法修改作业的管理员权限 |
| 无服务器任务失败 | 参见 databricks-serverless 的常见问题（库、RDD 代码、DBFS 挂载） |

## 相关技能

- **databricks-dabs** —— 作业和管道共享的 DABs 配置模式
- **databricks-pipelines** —— 由 `pipeline_task` 触发的 SDP（原 DLT）管道
- **databricks-serverless** —— 计算决策：无服务器、性能模式、经典回退

## 文档

- [Lakeflow Jobs](https://docs.databricks.com/jobs)
- [任务类型](https://docs.databricks.com/jobs/configure-task)
- [声明式自动化捆绑包](https://docs.databricks.com/dev-tools/bundles/)
- [Jobs API 参考](https://docs.databricks.com/api/jobs/v2/job)
- [捆绑包示例代码仓库](https://github.com/databricks/bundle-examples)
