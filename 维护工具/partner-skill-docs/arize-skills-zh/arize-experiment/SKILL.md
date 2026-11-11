---
name: arize-experiment
description: 创建、运行并分析用于评估和比较模型性能的 Arize 实验。涵盖实验 CRUD、导出运行、比较结果，以及使用 ax CLI 的评估工作流。当用户提到创建实验、运行实验、比较模型、模型性能、评估 AI、实验结果、基准测试、模型 A/B 测试或衡量准确度时使用。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI (≥ 0.39.0) and a configured Arize profile.
---

# Arize 实验技能

> **`SPACE`** — `--space` 标志接受空间**名称**（例如 `my-workspace`）或 base64 空间 **ID**（例如 `U3BhY2U6...`）。可用 `ax spaces list` 查找你的空间。

## 概念

- **实验（Experiment）** = 针对特定数据集版本的一次具名评估运行，每个样本对应一个运行
- **实验运行（Experiment Run）** = 处理一个数据集样本的结果——包含模型输出、可选的评估以及可选的 metadata
- **数据集（Dataset）** = 带版本的样本集合；每个实验都绑定到一个数据集和特定的数据集版本
- **评估（Evaluation）** = 附加到运行上的具名指标（例如 `correctness`、`relevance`），带可选的标签、分数和解释

典型流程：导出一个数据集 → 处理每个样本 → 收集输出和评估 → 用这些运行创建实验。

## 前提条件

直接着手任务——运行所需的 `ax` 命令。不要预先检查版本、环境变量或配置档。

如果 `ax` 命令失败，请根据错误进行排查：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show` 检查当前配置档。如果配置档缺失或 API key 有误，按 [references/ax-profiles.md](references/ax-profiles.md) 创建/更新它。如果用户没有自己的 key，引导他们前往 https://app.arize.com/admin > API Keys
- 空间未知 → 参见 [Space](references/ax-profiles.md#space)
- 项目不明确 → 询问用户，或运行 `ax projects list -o json --limit 100` 并作为可选项呈现
- **安全：** 绝不读取 `.env` 文件，也不在文件系统中搜索凭据。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。Arize 凭据使用 `ax profiles`，LLM provider key 使用 `ax ai-integrations`。绝不要要求用户把机密粘贴到聊天中。缺少凭据时，参见 [references/ax-profiles.md](references/ax-profiles.md)。
- **关键——绝不编造输出：** 运行实验时，你必须对每个数据集样本调用用户指定的真实模型 API。绝不编造、模拟或硬编码模型输出、延迟或评估分数。如果你无法调用 API（缺少 SDK、缺少凭据、网络错误），请停下来并在继续之前告诉用户需要什么。

## 列出实验：`ax experiments list`

浏览实验，可选按数据集过滤。输出到 stdout。

```bash
ax experiments list
ax experiments list --dataset DATASET_NAME --space SPACE --limit 20   # DATASET_NAME: name or ID (name preferred)
ax experiments list --cursor CURSOR_TOKEN
ax experiments list -o json
```

标志：`ax experiments list --help`。

## 获取实验：`ax experiments get`

快速查询 metadata——返回实验名称、关联的数据集/版本以及时间戳。

```bash
ax experiments get NAME_OR_ID
ax experiments get NAME_OR_ID -o json
ax experiments get NAME_OR_ID --dataset DATASET_NAME --space SPACE   # required when using experiment name instead of ID
```

标志：`ax experiments get --help`。

### 响应字段

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `id` | string | 实验 ID |
| `name` | string | 实验名称 |
| `dataset_id` | string | 关联的数据集 ID |
| `dataset_version_id` | string | 所使用的具体数据集版本 |
| `experiment_traces_project_id` | string | 存储实验 trace 的项目 |
| `created_at` | datetime | 实验创建时间 |
| `updated_at` | datetime | 最后修改时间 |

## 导出实验：`ax experiments export`

将所有运行下载到文件。默认使用 REST API；传入 `--all` 使用 Arrow Flight 进行批量传输。

```bash
# EXPERIMENT_NAME, DATASET_NAME: name or ID (name preferred)
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
# -> experiment_abc123_20260305_141500/runs.json

ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --all
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --output-dir ./results
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq '.[0]'
```

标志：`ax experiments export --help`。

### REST 与 Flight（`--all`）

- **REST**（默认）：更省事——无 Arrow/Flight 依赖，标准 HTTPS 端口，可穿过任何企业代理或防火墙。每页上限 500 个运行。
- **Flight**（`--all`）：运行数超过 500 的实验必需。在单独的主机/端口上使用 gRPC+TLS，某些企业网络可能会阻止。当前激活的 `ax` 配置档提供区域端点；参见 [profile 设置](references/ax-profiles.md)。

**Agent 自动升级规则：** 如果 REST 导出恰好返回 500 个运行，结果很可能是被截断的。用 `--all` 重新运行以获取完整数据集。

输出是运行对象的 JSON 数组：

```json
[
  {
    "id": "run_001",
    "example_id": "ex_001",
    "output": "The answer is 4.",
    "annotations": [
      { "name": "correctness", "label": "correct", "updated_at": "2026-03-01T00:00:00Z" }
    ],
    "additional_properties": {
      "eval.relevance.label": "relevant",
      "eval.relevance.score": 1,
      "eval.relevance.explanation": "Directly answers the question"
    }
  }
]
```

结果在每个运行中的出现位置：

- `annotations`：由 `annotate-runs` 写入的值（没有时为 `null`）
- `additional_properties["eval.<name>.label|score|explanation"]`：来自评估器任务的结果
- 使用 `--all` 时，annotations 也是扁平键：`additional_properties["annotation.<name>.label|score|text"]`

## 创建实验：`ax experiments create`

用数据文件中的运行创建一个新实验。

```bash
ax experiments create --name "gpt-4o-baseline" --dataset DATASET_NAME --space SPACE --file runs.json
ax experiments create --name "claude-test" --dataset DATASET_NAME --space SPACE --file runs.csv
```

标志：`ax experiments create --help`。`--dataset` 是可选的——省略它会创建一个没有关联数据集的独立实验（此时改为必需 `--space`）。

### 通过 stdin 传入数据

使用 `--file -` 直接管道传入数据——无需临时文件：

```bash
echo '[{"example_id": "ex_001", "output": "Paris"}]' | ax experiments create --name "my-experiment" --dataset DATASET_NAME --space SPACE --file -

# Or with a heredoc
ax experiments create --name "my-experiment" --dataset DATASET_NAME --space SPACE --file - << 'EOF'
[{"example_id": "ex_001", "output": "Paris"}]
EOF
```

### 运行文件中的必需列

| 列 | 类型 | 是否必需 | 说明 |
|--------|------|----------|-------------|
| `example_id` | string | yes | 来自 `ax datasets export` 的数据集样本**顶层 `id`** |
| `output` | string | yes | 该样本的模型/系统输出 |

额外的列会作为 `additionalProperties` 透传到运行上。

> **`example_id` 必须是 Arize 行 id**——即每个导出的数据集样本上的顶层 `id` 字段（`ex["id"]`）。**不要**使用嵌套在样本输入字段或 `additional_properties` 内的值；错误的值会静默失败或将运行附加到错误的样本上。创建运行前先导出数据集并检查顶层 `id` 字段。

> **⚠️ 创建文件中的内联 evaluations 不会作为分数附加。** `create` 只读取 `example_id` 和 `output`；其他每一列——包括 `evaluations` 对象——都会作为透传的额外字段存储，**而不是**实验评估，并且**不会**在 UI 中显示为分数。这会静默失败（无错误）。要附加分数/标签，请先创建实验，然后运行 `ax experiments annotate-runs`。

## 本地运行任务：`ax experiments run`

与 `create`（需要预先计算好的输出文件）不同，`run` 加载一个 Python 任务函数，对每个数据集行执行它，并将结果作为实验上传。

```bash
ax experiments run -n "my-experiment" --dataset DATASET_NAME --space SPACE --task task.py
ax experiments run -n "my-experiment" --dataset DATASET_NAME --space SPACE --task task.py --concurrency 5 --dry-run
```

`task.py` 必须定义一个顶层的 `task(dataset_row)` 函数，返回可 JSON 序列化的值：

```python
from anthropic import Anthropic

def task(dataset_row):
    resp = Anthropic().messages.create(
        model="claude-sonnet-4-6", max_tokens=256,
        messages=[{"role": "user", "content": dataset_row["question"]}]
    )
    return resp.content[0].text
```

`--dry-run` 针对前 10 个样本进行测试而不上传，用于在完整运行之前验证任务。标志：`ax experiments run --help`。

> **根据逻辑所在位置选择运行路径。** 当有本地 Python 任务要执行时，使用 `ax experiments run`——它在这台机器上运行 `task.py` 并上传结果；无需 AI 集成。当运行应托管且重复执行时，使用 `ax tasks create-run-experiment`——它注册一个平台侧的 `run_experiment` 任务，由 Arize 按计划或按需执行，由 JSON `--run-configuration`（模型 + messages + AI 集成）驱动，而非本地代码。对本地/临时运行和自定义逻辑默认使用 `ax experiments run`；对重复的托管运行使用任务路径——相关路由参见 **arize-evaluator** 技能。

## 列出运行：`ax experiments list-runs`

实验运行的分页终端视图（相对于 `export`，后者将其下载到文件）。

```bash
ax experiments list-runs EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --limit 30
ax experiments list-runs EXPERIMENT_ID
```

标志：`ax experiments list-runs --help`。

## 删除实验：`ax experiments delete`

```bash
ax experiments delete NAME_OR_ID
ax experiments delete NAME_OR_ID --dataset DATASET_NAME --space SPACE   # required when using experiment name instead of ID
ax experiments delete NAME_OR_ID --force   # skip confirmation prompt
```

标志：`ax experiments delete --help`。

## 标注运行：`ax experiments annotate-runs`

**这是将评估分数/标签附加到实验并在 UI 中显示它们的必需步骤。** 评估无法通过 `create` 附加；参见“创建实验”下的警告。你在实验存在之后在此写入它们。Upsert 语义——对同一运行重新提交相同的标注 `name` 会覆盖先前的值。每次请求最多 1000 个运行；未匹配的记录 ID 会被静默忽略。

每个 `name` 必须是该空间中已存在的标注配置（先创建它；参见 **arize-annotation** 技能），且值必须符合其类型：分类 → `label`（配置的值之一，不带 `score`），连续 → `score`，自由格式 → `text`。

```bash
ax experiments annotate-runs NAME_OR_ID --file annotations.json --dataset DATASET_NAME --space SPACE
ax experiments annotate-runs NAME_OR_ID --file annotations.csv --dataset DATASET_NAME --space SPACE
```

### 标注文件 schema

一个 JSON 数组；每一项标注一个运行：

```json
[
  {
    "record_id": "run_001",
    "values": [
      { "name": "correctness", "label": "correct" },
      { "name": "relevance", "score": 0.95 }
    ]
  }
]
```

| 字段 | 类型 | 是否必需 | 说明 |
|-------|------|----------|-------------|
| `record_id` | string | yes | **实验运行 ID**（来自 `ax experiments export` 的运行 `id`）——**不是** `example_id` |
| `values` | array | yes | 一个或多个标注 dict，每个含 `name` 以及至少 `score`、`label` 或 `text` 之一 |
| `values[].name` | string | yes | 已有标注配置的名称（例如 `correctness`）——成为 UI 中的列 |
| `values[].score` | number | no | 连续型配置 |
| `values[].label` | string | no | 分类型配置；必须是该配置的值之一 |
| `values[].text` | string | no | 自由格式配置 |

> `record_id` 以**运行** id 为键，而运行 id 只在 `create` 之后才存在。因此顺序始终是：`create` → `export`（读取每个运行的 `id`）→ 构建标注 → `annotate-runs`。

标志：`ax experiments annotate-runs --help`。

## 实验运行 Schema

每个运行对应一个数据集样本。**在 `create` 时，只消费 `example_id` 和 `output`**；其他任何内容（例如 `metadata`）都作为透传字段存储。关于 `export` 返回的内容，参见 [导出实验](#export-experiment-ax-experiments-export)。

```json
{
  "example_id": "required -- the dataset example's top-level id",
  "output": "required -- the model/system output for this example",
  "metadata": { "model": "gpt-4o", "latency_ms": 1234 }
}
```

## 工作流

### 针对数据集运行实验

1. 找到或创建数据集：
   ```bash
   ax datasets list --space SPACE
   ax datasets export DATASET_NAME --space SPACE --stdout | jq 'length'
   ```
2. 导出数据集样本：
   ```bash
   ax datasets export DATASET_NAME --space SPACE
   ```
3. 对每个样本调用真实模型 API 并收集输出。使用 `ax datasets export --stdout` 将样本直接管道传入推理脚本：

   ```bash
   ax datasets export DATASET_NAME --space SPACE --stdout | python3 infer.py > runs.json
   ```

   编写 `infer.py` 从 stdin 读取样本、调用目标模型，并将运行 JSON 写到 stdout。从 `references/inference-template.py` 的模板开始——复制它，检查导出的数据集 JSON 以确认输入字段名称，然后取消注释用户想要的 provider 代码块。

   **运行前：** 安装 SDK，设置 API key 环境变量。如果 API 不可达，请停下来并告诉用户。

4. 校验运行文件：
   ```bash
   python3 -c "import json; runs=json.load(open('runs.json')); print(f'{len(runs)} runs'); print(json.dumps(runs[0], indent=2))"
   ```
   每个运行必须含有 `example_id`（数据集行的顶层 `id`）和 `output`。`metadata` 是可选的。**不要把 `evaluations` 放在这里**——`create` 会忽略它们；分数在下面第 7–9 步附加。
5. 创建实验：
   ```bash
   ax experiments create --name "gpt-4o-baseline" --dataset DATASET_NAME --space SPACE --file runs.json
   ```
6. 校验：`ax experiments get "gpt-4o-baseline" --dataset DATASET_NAME --space SPACE`

   **附加评估分数（分数要在 UI 中显示所必需）。** 评估**不**来自创建文件——你用 `annotate-runs` 附加，它以每个运行的 `id`（创建时分配）为键，因此你必须先导出以得知这些 ID。

7. 将实验导出为结构化数据，以便在读取每个运行的 `id` 时同时看到其 `example_id`。确认导出的运行记录包含这两个字段。
8. 以结构化 JSON 处理方式构建标注文件，以 `record_id`（运行 `id`）为键。通过 LLM-as-judge、代码检查或人工审阅为每个运行打分/打标签；绝不编造分数。先创建标注配置（此处为分类型的 `correctness`，值为 `correct`/`incorrect`）。输出 [标注文件 schema](#annotation-file-schema) 中的结构。
9. 用 `ax experiments annotate-runs ... --file annotations.json` 附加分数，然后导出或检查实验以确认评估已附加。

### 比较两个实验

1. 导出两个实验：
   ```bash
   ax experiments export "experiment-a" --dataset DATASET_NAME --space SPACE --stdout > a.json
   ax experiments export "experiment-b" --dataset DATASET_NAME --space SPACE --stdout > b.json
   ```
   这些示例读取评估器任务的 `correctness` 结果（`.additional_properties["eval.correctness.score"]`）。对于 `annotate-runs` 的值，改用 `(.annotations // [] | map(select(.name == "correctness"))[0].score)`。
2. 平均正确性分数（将 `a.json` 换成 `b.json` 检查另一个实验）：
   ```bash
   jq '[.[] | .additional_properties["eval.correctness.score"]] | add / length' a.json
   ```
3. 找出结果不同的样本：
   ```bash
   jq -s '.[0] as $a | .[1][] | . as $run | {example_id: $run.example_id, b_score: $run.additional_properties["eval.correctness.score"], a_score: ($a[] | select(.example_id == $run.example_id) | .additional_properties["eval.correctness.score"])}' a.json b.json
   ```
4. 每个评估器的分数分布（通过/失败/部分计数；换文件检查另一个实验）：
   ```bash
   jq '[.[] | .additional_properties["eval.correctness.label"]] | group_by(.) | map({label: .[0], count: length})' a.json
   ```
5. 找出回归（在 A 中通过但在 B 中失败的样本）：
   ```bash
   jq -s '[.[0][] | select(.additional_properties["eval.correctness.label"] == "correct")] as $passed_a | [.[1][] | select(.additional_properties["eval.correctness.label"] != "correct") | select(.example_id as $id | $passed_a | any(.example_id == $id))]' a.json b.json
   ```

**统计显著性说明：** 每个评估器 ≥ 30 个样本时可靠；样本更少时，将差值仅视为方向性——n=10 上 5% 的差异可能是噪声。报告分数时同时报告样本量：`jq 'length' a.json`。

### 下载实验结果用于分析

1. `ax experiments list --dataset DATASET_NAME --space SPACE`——查找实验
2. `ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE`——下载到文件
3. 解析：`jq '.[] | {example_id, score: .additional_properties["eval.correctness.score"]}' experiment_*/runs.json`

### 将导出管道到其他工具

```bash
# Count runs
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq 'length'

# Extract all outputs
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq '.[].output'

# Get runs with low scores
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq '[.[] | select(.additional_properties["eval.correctness.score"] < 0.5)]'

# Convert to CSV
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | jq -r '.[] | [.example_id, .output, .additional_properties["eval.correctness.score"]] | @csv'
```

## 相关技能

- **arize-dataset**：创建或导出本实验所针对的数据集 → 先使用 `arize-dataset`
- **arize-prompts**：在实验之前或之后，于 Prompt Hub 中存储并版本化提示词模板（`ax prompts`）
- **arize-prompt-optimization**：利用实验结果改进提示词 → 下一步是 `arize-prompt-optimization`
- **arize-trace**：为失败的实验运行检查单个 span trace → 使用 `arize-trace`
- **arize-link**：从实验运行生成指向 trace 的可点击 UI 链接 → 使用 `arize-link`

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| `ax: command not found` | 参见 [references/ax-setup.md](references/ax-setup.md) |
| `401 Unauthorized` | API key 错误、已过期或无权访问此空间。使用 [references/ax-profiles.md](references/ax-profiles.md) 修复配置档。 |
| `No profile found` | 未配置配置档。参见 [references/ax-profiles.md](references/ax-profiles.md) 创建一个。 |
| `Experiment not found` | 用 `ax experiments get NAME --dataset DATASET --space SPACE` 检查（如果是独立实验则省略 `--dataset`） |
| `Invalid runs file` | 每个运行必须含有 `example_id` 和 `output` 字段 |
| `example_id mismatch` | `example_id` 必须是来自 `ax datasets export` 的数据集行**顶层 `id`**——而不是嵌套在样本字段或 `additional_properties` 中的值。导出数据集并检查顶层 `id` 字段。 |
| 运行已创建但 UI 中无分数/评估 | 创建文件中的评估会被静默忽略。创建实验后用 `ax experiments annotate-runs`（以运行 `id` 为键）附加它们——参见工作流第 7–9 步。 |
| `annotate-runs` 报告成功但没有任何变化 | `record_id` 必须是**运行 `id`**（来自 `ax experiments export`），而不是 `example_id`。未匹配的记录 ID 会被静默忽略。 |
| `annotate-runs`：`no annotation config with name '...'` | 先创建配置（参见 **arize-annotation** 技能）；`name` 必须与它完全匹配。 |
| `annotate-runs`：`score must not be set` 或 `label '...' is not one of` | 值不符合配置类型：分类型从其值中取 `label`，连续型取 `score`，自由格式取 `text`。 |
| `No runs found` | 导出返回为空——通过 `ax experiments get` 验证实验有运行 |
| `Dataset not found` | 关联的数据集可能已被删除；用 `ax datasets get NAME --space SPACE` 检查 |

## 保存凭据以供将来使用

参见 [references/ax-profiles.md](references/ax-profiles.md) § 保存凭据以供将来使用。
