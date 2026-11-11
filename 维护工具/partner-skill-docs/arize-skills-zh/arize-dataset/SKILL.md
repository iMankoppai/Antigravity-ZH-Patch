---
name: arize-dataset
description: 创建、管理和查询 Arize 数据集与示例。涵盖数据集 CRUD、追加示例、导出数据，以及使用 ax CLI 基于文件创建数据集。适用于用户需要测试数据、评估示例，或提到创建数据集、列出数据集、导出数据集、追加示例、数据集版本、黄金数据集或测试集的场景。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI (≥ 0.39.0) and a configured Arize profile.
---

# Arize 数据集技能

> **`SPACE`** — `--space` 标志接受空间**名称**（例如 `my-workspace`）或 base64 空间 **ID**（例如 `U3BhY2U6...`）。用 `ax spaces list` 找到你的空间。

## 概念

- **数据集（Dataset）** = 用于评估和实验的、带版本的示例集合
- **数据集版本（Dataset Version）** = 某时间点数据集的快照；更新可以就地完成，也可以创建新版本
- **示例（Example）** = 数据集中的单条记录，含任意用户自定义字段（例如 `question`、`answer`、`context`）
- **空间（Space）** = 组织性容器；数据集属于某个空间

示例上的系统管理字段（`id`、`created_at`、`updated_at`）由服务端自动生成——绝不要在创建或追加的负载中包含它们。

## 前置条件

直接执行任务——运行所需的 `ax` 命令。不要预先检查版本、环境变量或配置文件。

如果 `ax` 命令失败，根据错误进行排查：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show` 检查当前配置文件。如果配置缺失或 API key 错误，按照 [references/ax-profiles.md](references/ax-profiles.md) 创建/更新。如果用户没有密钥，引导他们访问 https://app.arize.com/admin > API Keys
- 空间未知 → 参见 [Space](references/ax-profiles.md#space)
- 项目不明确 → 询问用户，或运行 `ax projects list -o json --limit 100` 并作为可选项呈现
- **安全：** 绝不读取 `.env` 文件，也不要为查找凭据而搜索文件系统。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。使用 `ax profiles` 获取 Arize 凭据，使用 `ax ai-integrations` 获取 LLM 提供方密钥。绝不要让用户把机密粘贴到聊天中。对于缺失的凭据，参见 [references/ax-profiles.md](references/ax-profiles.md)。

## 列出数据集：`ax datasets list`

浏览空间中的数据集。列出用于人工浏览；当数据集名称或 ID 已知时，直接调用 `ax datasets get NAME_OR_ID --space SPACE -o json`。

```bash
ax datasets list
ax datasets list --space SPACE --limit 20
ax datasets list --cursor CURSOR_TOKEN
ax datasets list -o json
```

所有标志请运行 `ax datasets list --help`。

## 获取数据集：`ax datasets get`

快速元数据查询——返回数据集名称、空间、时间戳和版本列表。

```bash
ax datasets get NAME_OR_ID
ax datasets get NAME_OR_ID -o json
ax datasets get NAME_OR_ID --space SPACE   # required when using dataset name instead of ID
```

所有标志请运行 `ax datasets get --help`。

### 响应字段

| 字段 | 类型 | 描述 |
|-------|------|-------------|
| `id` | string | 数据集 ID |
| `name` | string | 数据集名称 |
| `space_id` | string | 该数据集所属的空间 |
| `created_at` | datetime | 数据集创建时间 |
| `updated_at` | datetime | 最后修改时间 |
| `versions` | array | 数据集版本列表（id、name、dataset_id、created_at、updated_at） |

## 导出数据集：`ax datasets export`

将示例下载到文件。默认情况下，导出返回一页示例（`--limit` 设置页大小，`--cursor` 选择后续页）。传入 `--all` 以导出完整数据集。使用 `--filter` 通过针对示例列、`id` 和 `annotation.<name>.*` 的类 SQL 表达式进行服务端收窄；`--filter` 不支持与 `--all` 一起使用。

```bash
ax datasets export NAME_OR_ID
# -> dataset_abc123_20260305_141500/examples.json

ax datasets export NAME_OR_ID --all
ax datasets export NAME_OR_ID --filter "annotation.Correctness.label = 'Correct'"
ax datasets export NAME_OR_ID --version-id VERSION_ID
ax datasets export NAME_OR_ID --output-dir ./data
ax datasets export NAME_OR_ID --stdout
ax datasets export NAME_OR_ID --stdout | jq '.[0]'
ax datasets export NAME_OR_ID --space SPACE   # required when using dataset name instead of ID
```

所有标志请运行 `ax datasets export --help`。

**智能体规则：** 只要任务需要每一个示例，就传入 `--all`；不带 `--all` 的导出会在一页之后停止。

**导出完整性验证：** 导出后，确认行数与服务端报告的一致：
```bash
# Get the server-reported count from dataset metadata
ax datasets get DATASET_NAME --space SPACE -o json | jq '.versions[-1] | {version: .id, examples: .example_count}'

# Compare to what was exported
jq 'length' dataset_*/examples.json

# If counts differ, re-export with --all
```

输出是一个示例对象的 JSON 数组。每个示例含系统字段（`id`、`created_at`、`updated_at`）以及所有用户自定义字段：

```json
[
  {
    "id": "ex_001",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-15T10:00:00Z",
    "question": "What is 2+2?",
    "answer": "4",
    "topic": "math"
  }
]
```

## 创建数据集：`ax datasets create`

从数据文件（`--file`）或内联 JSON（`--json`）创建新数据集。

```bash
ax datasets create --name "My Dataset" --space SPACE --file data.csv
ax datasets create --name "My Dataset" --space SPACE --file data.json
ax datasets create --name "My Dataset" --space SPACE --file data.jsonl
ax datasets create --name "My Dataset" --space SPACE --file data.parquet
ax datasets create --name "My Dataset" --space SPACE --json '[{"question": "What is 2+2?", "answer": "4"}]'
```

所有标志请运行 `ax datasets create --help`。

### 通过 stdin 传入数据

使用 `--file -` 从另一个命令管道传入数据：

```bash
echo '[{"question": "What is 2+2?", "answer": "4"}]' | ax datasets create --name "my-dataset" --space SPACE --file -

# Or with a heredoc
ax datasets create --name "my-dataset" --space SPACE --file - << 'EOF'
[{"question": "What is 2+2?", "answer": "4"}]
EOF
```

### 支持的文件格式

| 格式 | 扩展名 | 说明 |
|--------|-----------|-------|
| CSV | `.csv` | 列标题成为字段名 |
| JSON | `.json` | 对象数组 |
| JSON Lines | `.jsonl` | 每行一个对象（不是 JSON 数组） |
| Parquet | `.parquet` | 列名成为字段名；保留类型 |

**格式注意事项：**
- **CSV**：丢失类型信息——日期变成字符串，`null` 变成空字符串。使用 JSON/Parquet 以保留类型。
- **JSONL**：每行是一个独立的 JSON 对象。`.jsonl` 文件中的 JSON 数组（`[{...}, {...}]`）会失败——请改用 `.json` 扩展名。
- **Parquet**：保留列类型。需要 `pandas`/`pyarrow` 才能在本地读取：`pd.read_parquet("examples.parquet")`。

## 追加示例：`ax datasets append`

向现有数据集添加示例。有两种输入模式——按需选用。

### 内联 JSON（适合智能体）

直接生成负载——无需临时文件：

```bash
ax datasets append DATASET_NAME --space SPACE --json '[{"question": "What is 2+2?", "answer": "4"}]'

ax datasets append DATASET_NAME --space SPACE --json '[
  {"question": "What is gravity?", "answer": "A fundamental force..."},
  {"question": "What is light?", "answer": "Electromagnetic radiation..."}
]'
```

### 从文件

```bash
ax datasets append DATASET_NAME --space SPACE --file new_examples.csv
ax datasets append DATASET_NAME --space SPACE --file additions.json
```

### 追加到特定版本

```bash
ax datasets append DATASET_NAME --space SPACE --json '[{"q": "..."}]' --version-id VERSION_ID
```

所有标志请运行 `ax datasets append --help`。

`--json` 或 `--file` 中必须且只能提供一个。

### 校验

- 每个示例必须是至少含一个用户自定义字段的 JSON 对象
- 每个请求最多 100,000 个示例

**追加前进行 schema 校验：** 如果数据集已有示例，在追加前检查其 schema，以避免字段不匹配却被静默处理：

```bash
# Check existing field names in the dataset
ax datasets export DATASET_NAME --space SPACE --stdout | jq '.[0] | keys'

# Verify your new data has matching field names
echo '[{"question": "..."}]' | jq '.[0] | keys'

# Both outputs should show the same user-defined fields
```

字段是自由形式的：新示例中的额外字段会被添加，缺失的字段会变为 null。然而，字段名中的拼写错误（例如 `queston` 与 `question`）会静默地创建新列——追加前请核对拼写。

## 更新示例：`ax datasets update-examples`

`ax datasets update-examples` 按示例 `id` 修补行；`ax datasets delete-examples` 从某个版本中删除行，需要 `--version-id` 以及作为示例 ID JSON 数组的 `--example-ids`。不常用——运行 `ax datasets update-examples --help` 或 `ax datasets delete-examples --help` 查看标志和输入格式。

## 删除数据集：`ax datasets delete`

```bash
ax datasets delete NAME_OR_ID
ax datasets delete NAME_OR_ID --space SPACE   # required when using dataset name instead of ID
ax datasets delete NAME_OR_ID --force   # skip confirmation prompt
```

所有标志请运行 `ax datasets delete --help`。

## 更新数据集：`ax datasets update`

重命名现有数据集。

```bash
ax datasets update NAME_OR_ID --name "new-dataset-name"
ax datasets update NAME_OR_ID --name "new-dataset-name" --space SPACE
```

所有标志请运行 `ax datasets update --help`。

## 标注示例：`ax datasets annotate-examples`

从文件批量向数据集示例写入标注。采用 upsert 语义——具有相同键的现有标注会被更新，新的会被创建。每个请求最多 1000 个示例。每条记录需要 `record_id`（数据集示例 ID）和 `values`；未匹配的 record ID 会被静默忽略，因此请先对照一次导出来确认 ID。

```bash
ax datasets annotate-examples NAME_OR_ID --file annotations.json
ax datasets annotate-examples NAME_OR_ID --file annotations.csv --space SPACE
```

所有标志请运行 `ax datasets annotate-examples --help`。

## 工作流

### 按名称查找数据集

所有数据集命令都直接接受名称或 ID（传入名称时添加 `--space SPACE`）。要将名称解析为 ID，从 `get` 中读取：

```bash
ax datasets get "eval-set-v1" --space SPACE -o json | jq -r '.id'
```

### 从文件创建数据集用于评估

1. 准备一个含评估列（例如 `input`、`expected_output`）的 CSV/JSON/Parquet 文件
   - 如果内联生成数据，用 `--json` 传入，或通过 `--file -` 管道传入（参见创建数据集一节）
2. `ax datasets create --name "eval-set-v1" --space SPACE --file eval_data.csv`
3. 验证：`ax datasets get DATASET_NAME --space SPACE`
4. 使用数据集名称运行实验

### 向现有数据集添加示例

```bash
# Append inline or from a file using the dataset name (see Append Examples section for full syntax)
ax datasets append DATASET_NAME --space SPACE --json '[{"question": "...", "answer": "..."}]'
ax datasets append DATASET_NAME --space SPACE --file additional_examples.csv
```

### 下载数据集以供离线分析

1. `ax datasets export DATASET_NAME --space SPACE --all`——将每个示例下载到文件
2. 解析 JSON：`jq '.[] | .question' dataset_*/examples.json`

### 导出特定版本

```bash
# List versions
ax datasets get DATASET_NAME --space SPACE -o json | jq '.versions'

# Export that version
ax datasets export DATASET_NAME --space SPACE --version-id VERSION_ID
```

### 迭代数据集

1. 导出当前版本：`ax datasets export DATASET_NAME --space SPACE --all`
2. 在本地修改示例
3. 追加新行：`ax datasets append DATASET_NAME --space SPACE --file new_rows.csv`
4. 或创建全新版本：`ax datasets create --name "eval-set-v2" --space SPACE --file updated_data.json`

### 将导出管道传给其他工具

```bash
# Count examples
ax datasets export DATASET_NAME --space SPACE --all --stdout | jq 'length'

# Extract a single field
ax datasets export DATASET_NAME --space SPACE --stdout | jq '.[].question'

# Convert to CSV with jq
ax datasets export DATASET_NAME --space SPACE --stdout | jq -r '.[] | [.question, .answer] | @csv'
```

## 数据集示例的 Schema

示例是自由形式的 JSON 对象。没有固定 schema——列就是你提供的任意字段。系统管理字段由服务端添加：

| 字段 | 类型 | 管理者 | 说明 |
|-------|------|-----------|-------|
| `id` | string | server | 自动生成的 UUID。更新时必需，创建/追加时禁止 |
| `created_at` | datetime | server | 不可变的创建时间戳 |
| `updated_at` | datetime | server | 修改时自动更新 |
| *(任意用户字段)* | 任意 JSON 类型 | user | 字符串、数字、布尔值、null、嵌套对象、数组 |


## 相关技能

- **arize-trace**：导出生产 span 以了解应放入数据集的数据 → 使用 `arize-trace`
- **arize-experiment**：针对该数据集运行评估 → 下一步是 `arize-experiment`
- **arize-prompt-optimization**：使用数据集 + 实验结果来改进提示 → 使用 `arize-prompt-optimization`

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| `ax: command not found` | 参见 [references/ax-setup.md](references/ax-setup.md) |
| `401 Unauthorized` | API key 错误、已过期，或无权访问该空间。使用 [references/ax-profiles.md](references/ax-profiles.md) 修复配置文件。 |
| `No profile found` | 未配置任何配置文件。参见 [references/ax-profiles.md](references/ax-profiles.md) 创建一个。 |
| `Dataset not found` | 使用 `ax datasets get NAME_OR_ID --space SPACE` 检查名称或 ID；仅使用 `ax datasets list --space SPACE` 浏览查找正确名称 |
| `File format error` | 支持：CSV、JSON、JSONL、Parquet。使用 `--file -` 从 stdin 读取。 |
| `platform-managed column` | 从创建/追加负载中移除 `id`、`created_at`、`updated_at` |
| `reserved column` | 移除 `time`、`count` 或任何 `source_record_*` 字段 |
| `Provide either --json or --file` | 追加需要且仅需要一个输入源 |
| `Examples array is empty` | 确保你的 JSON 数组或文件至少包含一个示例 |
| `not a JSON object` | `--json` 数组中的每个元素必须是 `{...}` 对象，而非字符串或数字 |

## 保存凭据以供后续使用

参见 [references/ax-profiles.md](references/ax-profiles.md) § 保存凭据以供后续使用。
