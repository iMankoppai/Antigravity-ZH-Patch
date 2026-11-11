---
name: arize-annotation
description: 在 Arize 上创建并管理标注配置（分类型、连续型、自由文本标签 schema）与标注队列（人工审核工作流）。通过 Python SDK 将人工标注应用到项目 span 上。当用户提到标注配置、标注队列、标签 schema、人工反馈、批量标注 span、update_annotations、标注队列、标注记录或人工审核时使用。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI (≥ 0.39.0) and a configured Arize profile.
---

# Arize 标注技能

> **`SPACE`** — `--space` 标志接受空间**名称**（例如 `my-workspace`）或 base64 空间 **ID**（例如 `U3BhY2U6...`）。已知名称可用 `ax spaces get NAME` 解析；`ax spaces list` 用于人工浏览。

本技能涵盖**标注配置**（标签 schema）与**标注队列**（人工审核工作流），以及通过 Python SDK 以编程方式对项目 span 进行标注。

**方向：** Arize 中的人工标注会将配置定义的值附加到产品 UI 中的 **span**、**数据集示例**、**实验相关记录**与**队列条目**上。本技能涵盖：`ax annotation-configs`、`ax annotation-queues`，以及使用 `ArizeClient.spans.update_annotations` 批量更新 span。

---

## 前置条件

直接开始任务——运行你需要的 `ax` 命令。不要预先检查版本、环境变量或 profile。

如果 `ax` 命令失败，请根据错误进行排查：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show` 检查当前 profile。如果 profile 缺失或 API key 有误，按 [references/ax-profiles.md](references/ax-profiles.md) 创建/更新它。如果用户没有自己的 key，请引导他们前往 https://app.arize.com/admin > API Keys
- 空间未知 → 参见 [Space](references/ax-profiles.md#space)
- **安全：** 绝不要读取 `.env` 文件或在文件系统中搜索凭据。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。Arize 凭据使用 `ax profiles`，LLM provider key 使用 `ax ai-integrations`。绝不要要求用户将机密粘贴到聊天中。缺少凭据时，参见 [references/ax-profiles.md](references/ax-profiles.md)。

---

## 什么是标注配置？

**标注配置**为单一类型的人工反馈标签定义 schema。在任何人能够标注 span、数据集记录、实验输出或队列条目之前，空间中必须已存在该标签的配置。

| 字段 | 说明 |
|-------|-------------|
| **名称（Name）** | 描述性标识符（例如 `Correctness`、`Helpfulness`）。在空间内必须唯一。 |
| **类型（Type）** | `CATEGORICAL`（从列表中选择）、`CONTINUOUS`（数值范围）或 `FREEFORM`（自由文本）。 |
| **值（Values）** | 对于分类型：标签字符串，每个标签一个 `--value`。 |
| **最小/最大分值（Min/Max Score）** | 对于连续型：数值边界。 |
| **优化方向（Optimization Direction）** | `MAXIMIZE`、`MINIMIZE` 或 `NONE`。用于在 UI 中渲染趋势。 |

## 标签应用的位置（界面）

| 界面 | 典型路径 |
|---------|----------------|
| **项目 span** | Python SDK `spans.update_annotations`（见下文）和/或 Arize UI |
| **数据集示例** | Arize UI（人工标注流程）；配置必须存在于空间中 |
| **实验输出** | 通常与数据集或 trace 一起在 UI 中审核——参见 arize-experiment、arize-dataset |
| **标注队列条目** | `ax annotation-queues` CLI（见下文）和/或 Arize UI；配置必须存在 |

在期望标签能够持久保存之前，务必确保相应的**标注配置**已存在于空间中。

---

## 基础 CRUD：标注配置

### 列出

```bash
ax annotation-configs list --space SPACE
ax annotation-configs list --space SPACE -o json
ax annotation-configs list --space SPACE --limit 20
ax annotation-configs list --space SPACE --name "Correctness"   # substring filter
```

### 创建 — 分类型

分类型配置向审核者提供一组固定的标签供其选择。

```bash
ax annotation-configs create categorical \
  --name "Correctness" \
  --space SPACE \
  --value correct \
  --value incorrect \
  --optimization-direction MAXIMIZE
```

常见的二元标签对：
- `correct` / `incorrect`
- `helpful` / `unhelpful`
- `safe` / `unsafe`
- `relevant` / `irrelevant`
- `pass` / `fail`

### 创建 — 连续型

连续型配置允许审核者在定义的范围内输入数值分数。

```bash
ax annotation-configs create continuous \
  --name "Quality Score" \
  --space SPACE \
  --min-score 0 \
  --max-score 10 \
  --optimization-direction MAXIMIZE
```

### 创建 — 自由文本

自由文本配置收集开放式文本反馈。除名称和空间外无需额外标志。

```bash
ax annotation-configs create freeform \
  --name "Reviewer Notes" \
  --space SPACE
```

### 获取

```bash
ax annotation-configs get NAME_OR_ID
ax annotation-configs get NAME_OR_ID -o json
ax annotation-configs get NAME_OR_ID --space SPACE   # required when using name instead of ID
```

### 更新

每种配置类型都有各自的更新命令。只更新发生变化的字段。

**自由文本：**

```bash
ax annotation-configs update freeform NAME_OR_ID --space SPACE --new-name "Updated Name"
```

**连续型：**

```bash
ax annotation-configs update continuous NAME_OR_ID --space SPACE --min-score 1 --max-score 5 --optimization-direction MINIMIZE
```

**分类型：**

```bash
ax annotation-configs update categorical NAME_OR_ID --space SPACE --value correct --value incorrect --optimization-direction MAXIMIZE
```

当使用名称而非 ID 时，`--space` 为必填。每个 `--value` 提供完整的分类标签列表：
它会替换现有标签，而不是追加到现有标签之后。对每个应保留的标签重复
`--value`，否则被省略的标签将被移除。

### 删除

```bash
ax annotation-configs delete NAME_OR_ID
ax annotation-configs delete NAME_OR_ID --space SPACE   # required when using name instead of ID
ax annotation-configs delete NAME_OR_ID --force   # skip confirmation
```

**注意：** 删除不可逆。产品中任何指向此配置的标注队列关联也会被移除（队列可能保留；如有需要，可在 Arize UI 中修复关联）。

---

## 标注队列：`ax annotation-queues`

标注队列将记录（span、数据集示例、实验运行）路由给人工审核者。每个队列都关联到一个或多个标注配置，这些配置定义了审核者可以应用的标签。

### 列出 / 获取

```bash
ax annotation-queues list --space SPACE
ax annotation-queues list --space SPACE -o json
ax annotation-queues list --space SPACE --name "Review"   # substring filter

ax annotation-queues get NAME_OR_ID --space SPACE
ax annotation-queues get NAME_OR_ID --space SPACE -o json
```

### 创建

至少需要一个 `--annotation-config-id`。

```bash
ax annotation-queues create \
  --name "Correctness Review" \
  --space SPACE \
  --annotation-config-id CONFIG_ID \
  --annotator-email reviewer@example.com \
  --instructions "Label each response as correct or incorrect." \
  --assignment-method ALL   # or: RANDOM
```

重复 `--annotation-config-id` 和 `--annotator-email` 以附加多个配置或审核者。

### 添加记录

向现有队列添加记录（`create` 也接受 `--record-sources` 以写入初始记录）。

```bash
ax annotation-queues add-records NAME_OR_ID --space SPACE --record-sources sources.json

ax annotation-queues add-records NAME_OR_ID --space SPACE \
  --record-sources '[{"record_type": "EXAMPLE", "dataset_id": "ds-1", "example_ids": ["ex-1", "ex-2"]}]'
```

`--record-sources` 为必填，接受 JSON 文件路径或内联 JSON 数组。每个来源指定 `record_type`（`SPAN` 或 `EXAMPLE`）以及类型特定的字段：
- **Span：** `project_id`、`start_time`（ISO 8601）、`end_time`（ISO 8601）、可选 `span_ids`
- **Example：** `dataset_id`、`example_ids`

### 更新

列表类标志（`--annotation-config-id`、`--annotator-email`）在更新时会**完全替换**现有值——请传入所有期望的值，而不仅仅是新增的值。

```bash
ax annotation-queues update NAME_OR_ID --space SPACE --name "New Name"
ax annotation-queues update NAME_OR_ID --space SPACE --instructions "Updated instructions"
ax annotation-queues update NAME_OR_ID --space SPACE \
  --annotation-config-id CONFIG_ID_A \
  --annotation-config-id CONFIG_ID_B
```

### 删除

```bash
ax annotation-queues delete NAME_OR_ID --space SPACE
ax annotation-queues delete NAME_OR_ID --space SPACE --force   # skip confirmation
```

### 列出记录

```bash
ax annotation-queues list-records NAME_OR_ID --space SPACE
ax annotation-queues list-records NAME_OR_ID --space SPACE --limit 50 -o json
```

### 为记录提交标注

标注按配置名称进行 upsert——每个标注配置调用一次。至少提供 `--score`、`--label` 或 `--text` 之一。

```bash
ax annotation-queues annotate-record NAME_OR_ID RECORD_ID \
  --annotation-name "Correctness" \
  --label "correct" \
  --space SPACE

ax annotation-queues annotate-record NAME_OR_ID RECORD_ID \
  --annotation-name "Quality Score" \
  --score 8.5 \
  --text "Response was accurate but slightly verbose." \
  --space SPACE
```

### 分配记录

通过重复 `--email` 将用户分配去审核某条特定记录；这会完全替换现有分配，因此每次都要传入所有被分配者（不传任何 `--email` 标志则会清空所有分配）：

```bash
ax annotation-queues assign-record NAME_OR_ID RECORD_ID --email user@example.com --space SPACE
```

### 删除记录

```bash
ax annotation-queues delete-records NAME_OR_ID --space SPACE --record-id REC_1 --record-id REC_2   # max 100; --force skips confirmation
```

---

## 将标注应用到 Span（Python SDK）

当你已经有标签（例如来自审核导出或外部标注工具）时，使用 Python SDK 将标注批量应用到**项目 span**。

```python
import pandas as pd
from arize import ArizeClient

import os

client = ArizeClient(api_key=os.environ["ARIZE_API_KEY"])

# Build a DataFrame with annotation columns
# Required: context.span_id + at least one annotation.<name>.label or annotation.<name>.score
annotations_df = pd.DataFrame([
    {
        "context.span_id": "span_001",
        "annotation.Correctness.label": "correct",
        "annotation.Correctness.updated_by": "reviewer@example.com",
    },
    {
        "context.span_id": "span_002",
        "annotation.Correctness.label": "incorrect",
        "annotation.Correctness.updated_by": "reviewer@example.com",
    },
])

response = client.spans.update_annotations(
    space_id=os.environ["ARIZE_SPACE_ID"],
    project_name="your-project",
    dataframe=annotations_df,
    validate=True,
)
```

**DataFrame 列 schema：**

| 列 | 必需 | 说明 |
|--------|----------|-------------|
| `context.span_id` | 是 | 要标注的 span |
| `annotation.<name>.label` | 其中之一 | 分类型或自由文本标签 |
| `annotation.<name>.score` | 其中之一 | 数值分数 |
| `annotation.<name>.updated_by` | 否 | 标注者标识符（邮箱或姓名） |
| `annotation.<name>.updated_at` | 否 | 时间戳，自 epoch 起的毫秒数 |
| `annotation.notes` | 否 | span 上的自由文本备注 |

**限制：** 标注仅适用于提交前 31 天内的 span。

---

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| `ax: command not found` | 参见 [references/ax-setup.md](references/ax-setup.md) |
| `401 Unauthorized` | API key 可能无权访问此空间。请在 https://app.arize.com/admin > API Keys 验证 |
| `Annotation config not found` | `ax annotation-configs list --space SPACE`（或使用 `ax annotation-configs get NAME_OR_ID --space SPACE`） |
| `409 Conflict on create` | 名称在空间中已存在。请使用其他名称或获取现有配置 ID。 |
| 找不到队列 | `ax annotation-queues list --space SPACE`；验证队列名称或 ID |
| 记录未出现在队列中 | 确保与队列关联的标注配置存在；检查 `ax annotation-configs list --space SPACE` |
| Span SDK 报错或缺少 span | 确认 `project_name`、`space_id` 和 span ID；使用 arize-trace 导出 span |

---

## 通过 CLI 批量标注

`ax` CLI 提供批量标注命令，可在不借助 Python SDK 的情况下大规模写入标注。所有命令都接受一个文件（CSV、JSON、JSONL 或 Parquet），每次请求最多 **1000 条标注**，并采用 **upsert 语义**（键相同的现有标注会被更新，新标注会被创建）。

| 资源 | 命令 | 技能 |
|----------|---------|-------|
| Span | `ax spans annotate PROJECT --space SPACE --file annotations.json` | **arize-trace** |
| 数据集示例 | `ax datasets annotate-examples NAME_OR_ID --space SPACE --file annotations.json` | **arize-dataset** |
| 实验运行 | `ax experiments annotate-runs NAME_OR_ID --space SPACE --dataset DATASET --file annotations.json` | **arize-experiment** |

注意事项：
- `ax spans annotate`：时间窗口内有一个 span ID 未找到，整个请求即被拒绝。
- `ax datasets annotate-examples` 和 `ax experiments annotate-runs`：未匹配的记录 ID 会被静默忽略。
- `ax experiments annotate-runs`：独立实验可省略 `--dataset`，并传入 `--space`。

文件格式详情请参见所链接的技能。

---

## 相关技能

- **arize-trace**：导出 span 以查找 span ID 和时间范围；通过 `ax spans annotate` 批量标注 span
- **arize-dataset**：查找数据集 ID 和示例 ID；通过 `ax datasets annotate-examples` 批量标注示例
- **arize-evaluator**：自动化 LLM-as-judge，与人工标注配合使用
- **arize-experiment**：与数据集和评估工作流关联的实验；通过 `ax experiments annotate-runs` 批量标注运行
- **arize-prompts**：管理提示模板；标注提示输出以进行质量追踪
- **arize-link**：指向 Arize UI 中标注配置和队列的深层链接

---

## 保存凭据以备将来使用

参见 [references/ax-profiles.md](references/ax-profiles.md) § 保存凭据以备将来使用。
