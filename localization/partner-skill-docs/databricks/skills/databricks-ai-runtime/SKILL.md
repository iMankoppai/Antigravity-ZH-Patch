---
name: databricks-ai-runtime
description: "Databricks AI Runtime，即 `databricks air` CLI 命令，用于在 Databricks 无服务器计算上提交和管理 GPU 训练工作负载。用于：编写和提交 `databricks air` 工作负载 YAML、传递超参数和密钥、检查运行状态、列出/取消运行、流式查看运行的日志并观察其进度、自定义 Docker 镜像设置，以及环境配置。"
compatibility: Requires the Databricks CLI with the air command. Flattened code_source requires CLI 1.20.0 or newer; older CLIs can use the nested snapshot format documented below. See the [installation guide](https://docs.databricks.com/dev-tools/cli/install).
metadata:
  version: "0.2.1"
---

# Databricks AI Runtime（`databricks air`）

Databricks AI Runtime 是一组 `databricks air` CLI 命令，用于将 GPU 训练工作负载提交到 Databricks 无服务器计算。它管理环境设置、分布式训练配置和工作负载生命周期，而无需你管理集群或基础设施。

本技能涵盖三个日常流程：**启动运行**、**检查运行**，以及在其训练时**监控运行**。

## 参考准则

CLI 内置帮助是字段名、GPU 类型、集群内环境变量和约束的权威来源。在运行时优先使用它，而非任何记忆的内容。通过将某个配置字段的路径传给 `run` 命令上的 `-h` 来查找该字段（路径是单独的实参）：

```bash
databricks air run -h config                              # list the YAML fields
databricks air run -h config.compute                      # one field
databricks air run -h config.compute.accelerator_type     # a nested field
```

`databricks air <subcommand> --help` 记录每条命令的标志。本技能涵盖工作流以及帮助未明确说明的少数事项。

## 会话设置

检查 CLI 版本，确认命令可用，并列出你的 Databricks 配置 profile：

```bash
databricks version
databricks air --help
databricks auth profiles --skip-validate    # available Databricks config profiles
```

示例使用扁平化的 `code_source` 字段，在 [Databricks CLI 1.20.0 及更新版本](https://github.com/databricks/cli/releases/tag/v1.20.0)中可用。在较旧的 CLI 上，使用 [工作负载 YAML](#workload-yaml) 下所示的等效嵌套快照格式。CLI 1.20.0 及更新版本两种格式都接受。不要在同一配置中混用嵌套和扁平化字段。

在每条命令上传递 `-p <profile>`。为脚本化/编程调用添加 `-o json`，以便获得结构化的信封而非人类文本：

- **成功**：`{"v": 1, "ts": "...", "data": {...}}`
- **错误**：`{"v": 1, "ts": "...", "error": {"code": "...", "kind": "...", "message": "...", "retryable": bool}}`

配置验证（输入）错误是例外：即使使用 `-o json`，它们也会以纯文本打印到 stderr 并以非零退出，因此也要检查退出码和 stderr，而不仅是解析后的 JSON。当你确实得到结构化错误时，其 `kind` 会告诉你该做什么：

| kind | 含义 | 操作 |
|---|---|---|
| `PERMANENT` | 未认证 / 权限被拒绝 / 不可重试 | 若为认证：`databricks auth login --host <workspace-url>` |
| `NOT_FOUND` | 错误的运行 ID / 资源 | 检查输入 |
| `CONFLICT` | 幂等键冲突 | 使用新的 `--idempotency-key` |
| `TRANSIENT` | 可重试 | 重试 |

## 子命令

| 命令 | 作用 |
|---|---|
| `databricks air run` | 从 YAML 文件提交一个工作负载。添加 `--watch` 以流式查看日志直到结束。 |
| `databricks air get <JOB_RUN_ID>` | 显示某次运行的状态、配置和计时。 |
| `databricks air list` | 列出你的活动运行（添加 `--all-status` 查看已结束的，`--all-users`、`--filter`、`--limit`）。 |
| `databricks air cancel <JOB_RUN_ID> [<JOB_RUN_ID>...]` / `... --all` | 取消一次或多次运行，或取消你的所有活动运行。 |
| `databricks air logs <JOB_RUN_ID>` | 流式查看正在运行的一次运行的日志，或获取已结束运行的日志。 |

关于标志和默认值，运行 `databricks air <subcommand> --help`。

## 工作负载 YAML

```yaml
experiment_name: my-training-job     # alphanumeric, - and _ only
compute:
  num_accelerators: 1
  accelerator_type: GPU_1xA10        # run `databricks air run -h config.compute` for valid values
environment:
  version: "5"                       # client image version; prefix "databricks_ai_v" to also load the ML venv
  dependencies:
    - mlflow
code_source:
  root_path: "."                     # relative to workload.yaml; extracted to $CODE_SOURCE_PATH on each node
command: |-
  cd "$CODE_SOURCE_PATH"
  python train.py
```

用 `databricks air run --file workload.yaml -p <profile>` 提交。字段详情位于 `databricks air run -h config.<field>`（权威来源）。当前的加速器类型为 `GPU_1xA10` 和 `GPU_8xH100`；用 `databricks air run -h config.compute` 确认。

对于较旧的 CLI，只需将上方的 `code_source` 块替换为：

```yaml
code_source:
  type: snapshot
  snapshot:
    root_path: "."
```

值和行为相同：在 `code_source` 下添加 `type: snapshot`，并将所有 snapshot 字段（`root_path`，以及任何 `remote_volume`、`git` 或 `include_paths`）放入 `code_source.snapshot` 内。保持工作负载其余部分不变。检查 `databricks air run -h config.code_source` 以了解已安装 CLI 支持的字段。

## 配置工作负载

这些可选的顶层字段涵盖常见需求。对其中任何一个运行 `databricks air run -h config.<field>` 以获取完整参考。

### 环境变量和密钥

在 `env_variables` 下设置普通值；在 `secrets` 下从 Databricks Secrets 拉取敏感值（每个条目将环境变量名映射到一个 `scope/key`，值在工作节点上物化，绝不记录到日志）：

```yaml
env_variables:
  BATCH_SIZE: "32"
secrets:
  HF_TOKEN: my_scope/hf_token          # -> $HF_TOKEN on every node
  WANDB_API_KEY: my_scope/wandb_key
```

scope 和 key 必须已经存在；用 Databricks CLI 一次性创建它们：

```bash
databricks secrets create-scope my_scope -p <profile>
databricks secrets put-secret my_scope hf_token -p <profile>
```

密钥环境变量名不得与 `env_variables` 名称冲突。

### 参数（超参数）

`parameters` 是将超参数传入脚本并在运行之间更改它们而无需编辑训练代码的干净方式。CLI 将它们写入集群上的一个 YAML 文件，并将其路径暴露为 `$HYPERPARAMETERS_PATH`：

```yaml
parameters:
  learning_rate: 0.001
  batch_size: 32
  warmup_steps: 1000
  use_amp: true
```

在脚本中读取它们：

```python
import os, yaml
with open(os.environ["HYPERPARAMETERS_PATH"]) as f:
    hp = yaml.safe_load(f)
lr = hp["learning_rate"]
```

值可以是字符串、数字、布尔值、列表或嵌套 dict。要扫描某个超参数，改值后重新提交（并使用新的幂等键）。

### 重试

失败的尝试会自动重试：`max_retries` 有一个非零默认值（用 `databricks air run -h config.max_retries` 检查当前值）。设置 `max_retries: 0` 可立即失败而不重试。设置 `timeout_minutes` 时，它按每次尝试生效。

### 权限

默认只有你能看到该运行。用 `permissions`（DABs 兼容格式）授予他人访问所提交作业的权限；级别有 `CAN_VIEW`、`CAN_MANAGE_RUN`、`CAN_MANAGE`：

```yaml
permissions:
  - group_name: data-engineering
    level: CAN_VIEW
  - user_name: alice@example.com
    level: CAN_MANAGE
```

## 每个节点上提供的环境变量

`databricks air` 会在每个节点上自动设置这些变量；在 `command:` 和你的训练代码中使用它们。用 `databricks air run -h config.command` 确认当前列表。

| 变量 | 含义 |
|---|---|
| `CODE_SOURCE_PATH` | 节点上已解压的 `code_source` 的绝对路径（`cd $CODE_SOURCE_PATH`）。 |
| `MASTER_ADDR` / `MASTER_PORT` | 用于分布式协调的 rank-0 节点的地址/端口。 |
| `NUM_NODES` | 节点总数。 |
| `NODE_RANK` | 当前节点的 rank（0 到 `NUM_NODES`-1）。 |
| `WORLD_SIZE` | 所有节点上的 GPU 总数。 |
| `LOCAL_WORLD_SIZE` | 该节点上的 GPU 数。 |
| `MLFLOW_RUN_ID` | 此作业的 MLflow 运行 ID（向其记录指标/产物）。 |
| `HYPERPARAMETERS_PATH` | `parameters` YAML 文件的路径（仅在定义了 `parameters:` 时设置）。 |

你的 `command:` **每个节点运行一次**，因此按进程的 rank（`RANK`、`LOCAL_RANK`）**不**由平台设置。你的分布式启动器（torchrun、accelerate）在它为每个 GPU 启动一个进程时会分配它们；将 `$NODE_RANK` / `$NUM_NODES` / `$MASTER_ADDR` / `$MASTER_PORT` 传给它。

## 启动运行

1. **将用户的意图转化为 YAML。** 从请求中提取模型、数据集路径、GPU 数量和类型，以及训练命令。当关键信息有歧义时（数据路径、检查点目录、自定义镜像），在合成配置之前先询问。

2. **使用上述环境变量编写 `command:`。** 常见的启动形态：

   | 框架 | `command:` 形态 |
   |---|---|
   | 普通 torch，单 GPU | `python train.py` |
   | torch，多 GPU（1 节点） | `torchrun --nproc_per_node=$LOCAL_WORLD_SIZE train.py` |
   | torch，多节点 | `torchrun --nnodes=$NUM_NODES --nproc_per_node=$LOCAL_WORLD_SIZE --node_rank=$NODE_RANK --master_addr=$MASTER_ADDR --master_port=$MASTER_PORT train.py` |
   | HuggingFace Accelerate | `accelerate launch --config_file accelerate.yaml train.py` |
   | DeepSpeed | `deepspeed --num_gpus=$LOCAL_WORLD_SIZE train.py` |
   | Composer / MosaicML | `composer train.py` |

   多行命令放在 `command: |-` 下。通过 `$CODE_SOURCE_PATH` 访问上传的代码。**GPU 总数 = 节点数 x 每节点加速器数**；某种类型的每节点数量来自 `databricks air run -h config.compute`，因此要让 `num_accelerators` 是其有效倍数。

3. **预检所引用的资源**，以免作业在启动时死掉：确认每个 `secrets` scope/key 都存在（`databricks secrets list-scopes` / `list-secrets <scope>`），如果设置了 `environment.unity_catalog_image`，确认该镜像已推送到同一工作区的 Databricks Artifact Registry，且提交身份可以读取它（参见 [docker-images.md](docker-images.md)）。不要将自定义镜像与 `environment.version` 或 `environment.dependencies` 组合使用。

4. **提交前试运行。** 这会验证配置而不启动：
   ```bash
   databricks air run --file workload.yaml --dry-run -o json -p <profile>
   ```
   配置验证错误是硬性停止：它以纯文本打印到 stderr 并以非零退出，因此将该消息展示给用户并修复 YAML。其他失败是基础设施/认证问题，应向上冒泡。

5. **提交。** 使用稳定的 `--idempotency-key`，以免意外的重跑造成重复提交（将其组合为 `<user>-<experiment>-<YYYYMMDD>-v<N>`，并在每次重新提交时递增 `vN`；避免像 `$(uuidgen)` 这样的动态子表达式，以便命令保持可自动批准）：
   ```bash
   databricks air run --file workload.yaml \
     --idempotency-key <key> -o json -p <profile>
   ```
   添加 `--watch` 以将日志流式传输到你的终端直到运行结束。从响应中捕获 `data.run_id`，然后监控它。

## 检查运行

```bash
databricks air get <JOB_RUN_ID> -o json -p <profile>   # status, config, timing
databricks air list -o json -p <profile>               # your active runs (add --all-status for finished)
```

## 监控运行

**在运行时流式查看日志。** 最简单的路径是用 `--watch` 提交，它会把运行的日志流式传输到你的终端直到达到终态：

```bash
databricks air run --file workload.yaml --watch -p <profile>
```

对于已经在进行的运行，按 ID 流式查看其日志：

```bash
databricks air logs <JOB_RUN_ID> -p <profile>
# --node N (one node), --lines N (last N lines of a finished run),
# --minutes N (last N minutes), --download-to DIR (save all nodes' logs)
```

**损失、GPU 利用率和指标历史位于 MLflow。** CLI 流式传输日志和状态，而非训练指标。提交/状态响应包含 MLflow 实验和运行 URL；将其回显，以便用户可以在 Databricks UI 中打开该运行查看损失曲线、GPU 利用率和系统图表。

## 如果运行失败

拉取日志并将实际错误呈现给用户：

```bash
databricks air logs <JOB_RUN_ID> -p <profile>
```

展示失败的 traceback，让用户决定如何修复。对于更深入的、有引导的训练失败诊断，使用 AI Runtime 自带的调试支持，而不要在此猜测根因。

## 自定义 Docker 镜像

当你的工作负载需要特定的系统库、CUDA 扩展（flash-attn、apex、自定义 kernel），或无法放入 `environment.dependencies` 的依赖时，使用自定义 Docker 镜像而非 `environment.version`。

**阅读 [docker-images.md](docker-images.md)** 以获得关于以下内容的分步指导：

- 使用 Databricks 提供的基础镜像
- Dockerfile 模式
- 预构建兼容性检查清单（CUDA/driver、PyTorch、NCCL、EFA/RDMA）
- 用 `databricks air images push` 推送镜像并用 `environment.unity_catalog_image` 运行它们
