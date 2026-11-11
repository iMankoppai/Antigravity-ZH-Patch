---
name: arize-evaluator
description: 处理 Arize 上的 LLM-as-judge 与代码评估器工作流，包括创建/更新评估器、在 span 或实验上运行评估、管理任务、trigger-run 操作、列映射以及持续监控。当用户提到创建评估器、LLM judge、代码评估器、幻觉、忠实度、正确性、相关性、运行评估、为 span 打分、为实验打分、trigger-run、列映射、持续监控或改进评估器提示词时使用。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI and a configured Arize profile with an AI integration.
---

# Arize 评估器技能

> **`SPACE`** — `--space` 标志接受空间**名称**（例如 `my-workspace`）或 base64 空间 **ID**（例如 `U3BhY2U6...`）。可用 `ax spaces list` 查找你的空间。

本技能涵盖在 Arize 上设计、创建和运行**评估器**——既有 **LLM-as-judge（模板）**评估器，也有**代码评估器**（确定性，无需 LLM）。评估器定义评判者；**任务**则是针对真实数据运行该评判者的方式。

---

## 前提条件

直接着手任务——运行所需的 `ax` 命令。不要预先检查版本、环境变量或配置档。

如果 `ax` 命令失败，请根据错误进行排查：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show` 检查当前配置档。如果配置档缺失或 API key 有误，按 [references/ax-profiles.md](references/ax-profiles.md) 创建/更新它。如果用户没有自己的 key，引导他们前往 https://app.arize.com/admin > API Keys
- 空间未知 → 参见 [Space](references/ax-profiles.md#space)
- LLM provider 调用失败（缺少 provider 凭据）→ 运行 `ax ai-integrations list --space SPACE` 检查是否有平台托管的凭据。如果不存在，使用 **arize-ai-provider-integration** 技能——绝不要要求用户把 provider key 粘贴到聊天中。
- **安全：** 绝不读取 `.env` 文件，也不在文件系统中搜索凭据。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。Arize 凭据使用 `ax profiles`，LLM provider key 使用 `ax ai-integrations`。绝不要要求用户把机密粘贴到聊天中。缺少凭据时，参见 [references/ax-profiles.md](references/ax-profiles.md)。
- **关键——绝不编造评估结果：** 如果评估任务失败、被取消或未产生任何分数，请清楚地报告失败并解释出错原因。不要执行“手动评估”、杜撰质量分数、估算百分比，或把任何由 agent 生成的分析当作来自 Arize 评估系统呈现。应改为建议：(1) 修复已识别的问题并重试，(2) 尝试从 Arize UI 运行，(3) 用 `ax ai-integrations list` 验证集成凭据，(4) 联系 https://arize.com/contact/ 的支持。

---

## 概念

### 什么是评估器？

**评估器**是一个 LLM-as-judge 定义。它包含：

| 字段 | 说明 |
|-------|-------------|
| **Template** | 评判提示词。使用 `{variable}` 占位符（例如 `{input}`、`{output}`、`{context}`），在运行时通过任务的列映射填充。 |
| **分类选项** | 允许的输出标签集合（例如 `factual` / `hallucinated`）。二分类是默认且最常见的。每个选项可附加一个数值分数。 |
| **AI 集成** | 存储的 LLM provider 凭据（OpenAI、Anthropic、Bedrock 等），评估器用它调用评判模型。 |
| **模型** | 具体的评判模型（例如 `gpt-4o`、`claude-sonnet-4-5`）。 |
| **调用参数** | 可选的模型设置 JSON，例如 `{"temperature": 0}`。建议使用低 temperature 以保证可复现性。 |
| **优化方向** | 分数越高越好（`MAXIMIZE`）还是越差越好（`MINIMIZE`）。决定 UI 如何呈现趋势。 |
| **数据粒度** | 评估器在 **span**、**trace** 还是 **session** 级别运行。大多数评估器在 span 级别运行。 |

评估器是**带版本的**——每次提示词或模型变更都会创建一个新的不可变版本。最新的版本处于激活状态。

**代码评估器**是确定性的替代方案——无需 AI 集成或模型，只用 Python。它们以继承 `CodeEvaluator` 的类形式运行，而非裸函数，并有其严格的导入路径与 `evaluate()` 签名约定。任一项出错都会导致运行在 `0/0/0` 状态下静默取消。编写前请参见 [references/cli-reference.md](references/cli-reference.md) 中的“自定义 Python 代码评估器”。

**远程评估器**调用客户自托管的 HTTP 端点，通过 `ax evaluators create-evaluator remote` 创建，需传入评估器集成 ID；运行 `ax evaluators create-evaluator remote --help` 查看其标志。

### 什么是任务？

**任务**是针对真实数据运行一个或多个评估器的方式。任务附加到**项目**（实时 traces/spans）或**数据集**（实验运行）。任务包含：

| 字段 | 说明 |
|-------|-------------|
| **评估器** | 要运行的评估器列表。你可以在一个任务中运行多个。 |
| **列映射** | 将每个评估器的模板变量映射到 span 或实验运行上的实际字段路径（例如 `"input" → "attributes.input.value"`）。这正是评估器能跨项目和实验移植的原因。 |
| **查询过滤器** | SQL 风格的表达式，用于选择要评估的 span/运行（例如 `"attributes.openinference.span.kind = 'LLM'"`）。用任务级的 `--query-filter` 设置。可选，但对精确性很重要。 |
| **持续** | 对于项目任务：是否在新增 span 到达时自动打分。 |
| **采样率** | 对于持续项目任务：要评估的新 span 比例（0–1）。 |

---

## 数据粒度

在创建评估器时（`ax evaluators create-evaluator template` / `create-evaluator code`）设置 `--data-granularity`，而不是在任务上——它控制该评估器在针对**项目任务**运行时评估的数据单元（不是数据集/实验任务——那些直接评估实验运行）。默认值为 `span`。

| 级别 | 评估内容 | 适用场景 | 结果列前缀 |
|-------|-------------------|---------|---------------------|
| `span`（默认） | 单个 span | 问答正确性、幻觉、相关性 | `eval.{name}.label` / `.score` / `.explanation` |
| `trace` | 一个 trace 中的所有 span，按 `context.trace_id` 分组 | Agent 轨迹、任务正确性——任何需要完整调用链的场景 | `trace_eval.{name}.label` / `.score` / `.explanation` |
| `session` | 一个 session 中的所有 trace，按 `attributes.session.id` 分组并按开始时间排序 | 多轮连贯性、整体语气、对话质量 | `session_eval.{name}.label` / `.score` / `.explanation` |

### trace 与 session 聚合的工作方式

对于 **trace** 粒度，共享相同 `context.trace_id` 的 span 会分组在一起。评估器模板使用的列值会以逗号连接成单个字符串（每个值截断至 100K 字符），然后传给评判模型。

对于 **session** 粒度，先进行相同的 trace 级分组，然后按 `start_time` 对 trace 排序并按 `attributes.session.id` 分组。session 级值总计上限为 100K 字符。

### `{conversation}` 模板变量

在 session 粒度下，`{conversation}` 是一个特殊模板变量，会渲染为涵盖该 session 中所有 trace 的 `{input, output}` 轮次的 JSON 数组，其构建自 `attributes.input.value` / `attributes.llm.input_messages`（输入侧）与 `attributes.output.value` / `attributes.llm.output_messages`（输出侧）。

在 span 或 trace 粒度下，`{conversation}` 被视为常规模板变量，像其他变量一样通过列映射解析。

> **注意：** 要让 `{conversation}` 生效，span 必须带有 `attributes.session.id`。关于如何从应用代码中发出 `session.id`，包括 Jupyter notebook 和短生命周期脚本所需的 `force_flush()` 模式，请参见 **arize-instrumentation** 技能。

### 多评估器任务

一个任务可以包含不同粒度的评估器。运行时系统使用**最高**粒度（session > trace > span）进行数据获取，并自动**拆分为每个评估器一个子运行**。用任务级的 `--query-filter` 过滤，它会应用到任务中的每个评估器。

---

## 基础 CRUD

**AI 集成**、**评估器**（模板与代码）和**任务**的完整命令参考——每个标志及示例——见 [references/cli-reference.md](references/cli-reference.md)。下面的工作流已内联包含你需要的命令。

---

## 工作流 A：为项目创建评估器

当用户说出类似*“为我的 Playground Traces 项目创建评估器”*之类的话时使用。

### 第 1 步：确认项目名称

`ax spans export` 在配合 `--space SPACE` 时接受项目名称——无需查询 ID。要确认已知名称或获取其 base64 `"id"`（当名称触发校验错误时使用 `id`），可直接获取：

```bash
ax projects get PROJECT --space SPACE -o json
```

当项目名称未知时，`ax projects list --space SPACE -o json` 会列出项目以供浏览；将匹配的 `"name"` 用作 `PROJECT`。

### 第 2 步：了解要评估什么

如果用户指定了评估器类型（幻觉、正确性、相关性等）→ 跳到第 3 步。

如果没有，请采样最近的 span，以实际数据作为评估器的基础：

```bash
ax spans export PROJECT --space SPACE -l 10 --days 30 --stdout
```

检查 `attributes.input`、`attributes.output`、span 种类以及任何现有标注。识别失败模式（例如编造事实、跑题回答、缺少上下文），并提出 **1–3 个具体的评估器想法**。让用户选择。

每个建议必须包含：评估器名称（加粗）、一句话描述其评判内容，以及括号中的二分类标签对。每条格式如下：

1. **名称** — 对评判内容的描述。（`label_a` / `label_b`）

示例：
1. **回答正确性** — agent 的回答是否正确地回应了用户的财务查询？（`correct` / `incorrect`）
2. **幻觉** — 回答是否编造了未以检索上下文为依据的事实？（`factual` / `hallucinated`）

### 第 3 步：确认或创建 AI 集成

```bash
ax ai-integrations list --space SPACE -o json
```

如果存在合适的集成，记下其 ID。如果没有，使用 **arize-ai-provider-integration** 技能创建一个。询问用户希望评判使用哪个 provider/model。

### 第 4 步：创建评估器

使用下面的模板设计最佳实践。保持评估器名称和变量**通用**——项目特定的接线由任务（第 6 步）通过 `column_mappings` 处理。

```bash
ax evaluators create-evaluator template \
  --name "Hallucination" \
  --space SPACE \
  --template-name "hallucination" \
  --commit-message "Initial version" \
  --ai-integration-id INT_ID \
  --model-name "gpt-4o" \
  --include-explanations \
  --use-function-calling \
  --classification-choices '{"factual": 1, "hallucinated": 0}' \
  --template 'You are an evaluator. Given the user question and the model response, decide if the response is factual or contains unsupported claims.

User question: {input}

Model response: {output}

Respond with exactly one of these labels: hallucinated, factual'
```

### 第 5 步：询问——回填、持续，还是两者都要？

**推荐做法：** 始终先进行小规模回填（约 100 个历史 span）以验证评估器，然后再启用持续监控。这样可以在为所有未来生产 span 打分之前，在已知数据上发现列映射错误、错误的 span 种类和模板问题。只有在回填确认打分正确后才启用持续。

在创建任务之前，询问：

> “你希望：
> (a) 对历史 span 运行一次性的**回填**？
> (b) 为未来的新 span 设置**持续**评估？
> (c) **两者都要**——先回填以验证，然后自动持续为新 span 打分？（推荐）”

### 第 6 步：从真实 span 数据确定列映射

不要猜测路径。拉取样本并检查实际存在哪些字段：

```bash
ax spans export PROJECT --space SPACE -l 5 --days 7 --stdout
```

对于每个模板变量（`{input}`、`{output}`、`{context}`），找到匹配的 JSON 路径。常见起点——**使用前务必在你的实际数据上验证**：

| 模板变量 | LLM span | CHAIN span |
|---|---|---|
| `input` | `attributes.input.value` | `attributes.input.value` |
| `output` | `attributes.llm.output_messages.0.message.content` | `attributes.output.value` |
| `context` | `attributes.retrieval.documents.contents` | — |
| `tool_output` | `attributes.input.value`（回退） | `attributes.output.value` |

**校验 span 种类对齐：** 如果评估器提示词假定的是 LLM 最终文本，而任务却指向 CHAIN span（或反之），运行可能取消或对错误的文本打分。确保任务上的 `query_filter` 与你映射的 span 种类匹配。

**过滤器作用于 eval 索引：** span 种类是 `attributes.openinference.span.kind`——`span_kind` 不是列，会静默地匹配不到任何内容。诸如 `attributes.metadata.*` 之类的自定义属性也可能未被索引。如果过滤器在数据存在的情况下返回 0 个 span，请移除它以确认时间窗口内确有数据。

**完整的 `--evaluators` JSON 示例：**

```json
[
  {
    "evaluator_id": "EVAL_ID",
    "column_mappings": {
      "input": "attributes.input.value",
      "output": "attributes.llm.output_messages.0.message.content",
      "context": "attributes.retrieval.documents.contents"
    }
  }
]
```

为模板引用的**每一个**变量都包含映射。遗漏一个会导致运行产生无效分数。

### 第 7 步：创建任务

**仅回填 (a)：**
```bash
ax tasks create-evaluation \
  --name "Hallucination Backfill" \
  --task-type TEMPLATE_EVALUATION \
  --project PROJECT --space SPACE \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --query-filter "attributes.openinference.span.kind = 'LLM'" \
  --no-continuous
```

**仅持续 (b)：**
```bash
ax tasks create-evaluation \
  --name "Hallucination Monitor" \
  --task-type TEMPLATE_EVALUATION \
  --project PROJECT --space SPACE \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"input": "attributes.input.value", "output": "attributes.output.value"}}]' \
  --query-filter "attributes.openinference.span.kind = 'LLM'" \
  --is-continuous \
  --sampling-rate 0.1
```

**两者都要 (c)：** 创建时使用 `--is-continuous`，然后在第 8 步再触发一次回填运行。

### 第 8 步：触发回填运行（如被要求）

> **Eval 索引延迟：** eval 索引从主 trace 存储异步构建，可能延迟 **1–2 小时**。首次测试运行时，使用结束时间至少在 2 小时之前的时间窗口。如果在过去一小时内摄取的 span 上把 `--data-end-time` 设为“现在”，运行会成功完成但会为 0 个 span 打分。

首先找出哪个时间范围有数据：
```bash
ax spans export PROJECT --space SPACE -l 100 --days 1 --stdout   # try last 24h first
ax spans export PROJECT --space SPACE -l 100 --days 7 --stdout   # widen if empty
```

使用真实 span 中的 `start_time` / `end_time` 字段设置时间窗口。首次验证运行时，将 `--max-spans` 上限设为约 100 以快速获得反馈：

```bash
ax tasks trigger-run TASK_ID \
  --data-start-time "2026-03-20T00:00:00" \
  --data-end-time "2026-03-21T23:59:59" \
  --max-spans 100 \
  --wait
```

在扩大到完整回填或启用持续之前，先审阅分数和解释。

---

## 工作流 B：为实验创建评估器

当用户说出类似*“为我的实验创建评估器”*或*“评估我的数据集运行”*之类的话时使用。

**如果用户说“数据集”但还没有实验：** 任务必须针对一个实验（而非裸数据集）。询问：
> “评估任务针对实验运行运行，而不是直接针对数据集。你希望我先帮你在这个数据集上创建一个实验吗？”

如果是，使用 **arize-experiment** 技能创建一个，然后再回到这里。

### 第 1 步：找到数据集和实验名称

```bash
ax datasets list --space SPACE
ax experiments list --dataset DATASET_NAME --space SPACE -o json
```

记下数据集名称以及要打分的实验名称。后续命令中这些参数接受名称或 ID——首选名称。

### 第 2 步：了解要评估什么

如果用户指定了评估器类型 → 跳到第 3 步。

如果没有，检查一次最近的实验运行，以实际数据作为评估器的基础：

```bash
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | python3 -c "import sys,json; runs=json.load(sys.stdin); print(json.dumps(runs[0], indent=2))"
```

查看 `output`、`input`、`evaluations` 和 `metadata` 字段。识别缺口（用户关心但尚未拥有的指标），并提出 **1–3 个评估器想法**。每个建议必须包含：评估器名称（加粗）、一句话描述，以及括号中的二分类标签对——格式与工作流 A 第 2 步相同。

### 第 3 步：确认或创建 AI 集成

同工作流 A 第 3 步。

### 第 4 步：创建评估器

同工作流 A 第 4 步。保持变量通用。

### 第 5 步：从真实运行数据确定列映射

运行数据的结构与 span 数据不同。检查：

```bash
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE --stdout | python3 -c "import sys,json; runs=json.load(sys.stdin); print(json.dumps(runs[0], indent=2))"
```

实验运行的常见映射：
- `output` → `"output"`（每个运行上的顶层字段）
- `input` → 检查它是在运行上，还是嵌入在关联的数据集样本中

如果 `input` 不在运行 JSON 上，导出数据集样本以找到路径：
```bash
ax datasets export DATASET_NAME --space SPACE --stdout | python3 -c "import sys,json; ex=json.load(sys.stdin); print(json.dumps(ex[0], indent=2))"
```

### 第 6 步：创建任务

`--experiment-ids` 接受来自 `ax experiments list --space SPACE -o json` 的 base64 ID。

```bash
ax tasks create-evaluation \
  --name "Experiment Correctness" \
  --task-type TEMPLATE_EVALUATION \
  --dataset DATASET_NAME --space SPACE \
  --experiment-ids "EXP_ID" \
  --evaluators '[{"evaluator_id": "EVAL_ID", "column_mappings": {"output": "output"}}]' \
  --no-continuous
```

### 第 7 步：触发并监控

```bash
ax tasks trigger-run TASK_ID \
  --experiment-ids "EXP_ID" \
  --wait

ax tasks list-runs TASK_ID
ax tasks get-run RUN_ID
```

---

## 模板设计最佳实践

### 1. 使用通用、可移植的变量名

使用 `{input}`、`{output}` 和 `{context}`——而不是与特定项目或 span 属性绑定的名称（例如不要使用 `{attributes_input_value}`）。评估器本身保持抽象；**任务的 `column_mappings`** 才是你将其接到特定项目或实验中实际字段的地方。这样同一个评估器无需修改即可跨多个项目和实验运行。

### 2. 默认使用二分类标签

使用恰好两个清晰的字符串标签（例如 `hallucinated` / `factual`、`correct` / `incorrect`、`pass` / `fail`）。二分类标签：
- 对评判模型来说最容易稳定产出
- 在业界最常见
- 在仪表盘中解释起来最简单

如果用户坚持要多于两个选项，那也可以——但先推荐二分类，并解释权衡（标签越多 → 歧义越多 → 评分者间一致性越低）。

### 3. 明确模型必须返回什么

模板必须告诉评判模型**只**返回标签字符串——不要返回其他内容。为标签输出设置 `--classification-choices`；提示词中的标签字符串必须与其键**完全匹配**（拼写相同、大小写相同）。仅对自由格式（非分类）输出才省略 `--classification-choices`。

好：
```
Respond with exactly one of these labels: hallucinated, factual
```

差（过于开放）：
```
Is this hallucinated? Answer yes or no.
```

### 4. 保持低 temperature

传入 `--invocation-params '{"temperature": 0}'` 以获得可复现的打分。较高的 temperature 会给评估结果引入噪声。

### 5. 使用 `--include-explanations` 进行调试

在初始设置期间，始终包含解释，以便在大规模信任标签之前验证评判者的推理是否正确。

### 6. 在 bash 中用单引号传入模板

单引号可防止 shell 插值 `{variable}` 占位符。双引号会导致问题：

```bash
# Correct
--template 'Judge this: {input} → {output}'

# Wrong — shell may interpret { } or fail
--template "Judge this: {input} → {output}"
```

---

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| `ax: command not found` | 参见 [references/ax-setup.md](references/ax-setup.md) |
| `401 Unauthorized` | API key 可能无权访问此空间。请在 https://app.arize.com/admin > API Keys 验证 |
| `Evaluator not found` | `ax evaluators get NAME_OR_ID --space SPACE`（`ax evaluators list --space SPACE` 供人工浏览） |
| `Integration not found` | `ax ai-integrations get NAME_OR_ID --space SPACE`（`list` 供人工浏览） |
| `Task not found` | `ax tasks get TASK_ID`（`ax tasks list --space SPACE` 供人工浏览） |
| `project and dataset-id are mutually exclusive` | 创建任务时只使用其中一个 |
| `experiment-ids required for dataset tasks` | 在 `create` 和 `trigger-run` 中添加 `--experiment-ids` |
| `sampling-rate only valid for project tasks` | 从数据集任务中移除 `--sampling-rate` |
| `project '...' not found` 或 `ax spans export` 上的校验错误 | 添加 `--space SPACE`；若仍存在，通过 `ax projects get PROJECT --space SPACE -o json` 查询 base64 项目 ID 并改用 `id` 字段 |
| 模板校验错误 | 在 bash 中使用单引号的 `--template '...'`；使用单花括号 `{var}`，而不是 `{{var}}` |
| 运行卡在 `pending` | `ax tasks get-run RUN_ID`；然后 `ax tasks cancel-run RUN_ID` |
| 运行 `completed`，0 个 span | 扩大时间窗口；eval 索引可能未覆盖较旧数据 |
| 分数看起来不对 | 添加 `--include-explanations` 并在几个样本上检查评判者的推理 |
| `trigger-run` 上的时间格式错误 | 使用 `2026-03-21T09:00:00`——末尾不带 `Z` |
| 运行失败：“missing rails and classification choices” | 在 `ax evaluators create-evaluator template`（新建）或 `create-evaluator-version template`（已有）上添加 `--classification-choices '{"label_a": 1, "label_b": 0}'`——标签必须与模板匹配 |
| 运行 `completed`，所有 span 被跳过 | 查询过滤器匹配到了 span，但列映射错误或模板变量无法解析——导出一个样本 span 并核对路径 |
| 设置了 `query_filter` 但为 0 个 span 打分，或出现 `No data found` | 使用 `attributes.openinference.span.kind`，而非 `span_kind`。自定义属性可能未被索引。移除过滤器以确认窗口内存在 span。 |
| 打分的 span 种类错误 | 在任务的 `--query-filter` 上设置 span 种类过滤器，而不是每个评估器各自的 `query_filter` |
| 自定义**代码**评估器运行在约 3 秒后以 `0/0/0`（成功/错误/跳过）取消 | 导入路径或 `evaluate()` 签名错误——参见 [references/cli-reference.md](references/cli-reference.md) 中**自定义 Python 代码评估器**下的“CRITICAL”提示。必须从 `arize.experimental.datasets.experiments.evaluators.base`（而非 `arize.experiments`）导入，并声明具名的 `evaluate()` 参数，而不只是 `**kwargs`。 |

### 诊断被取消的运行

对于被取消的运行（约 1 秒或约 3 分钟）、错误的 span 种类以及列映射不匹配，请按 [references/troubleshooting.md](references/troubleshooting.md) 中的有序清单逐项排查（凭据 → 模型名称 → 列映射/路径检查 → 时间窗口 → span 种类 → 变量解析）。

---

## 相关技能

- **arize-ai-provider-integration**：LLM provider 集成的完整 CRUD（创建、更新、删除凭据）
- **arize-trace**：导出 span 以发现列路径和时间范围
- **arize-experiment**：创建实验并导出运行以进行实验列映射
- **arize-dataset**：导出数据集样本，以在运行缺少输入字段时找到它们
- **arize-prompts**：在 Prompt Hub 中管理提示词模板；与评估器配合对带版本的提示词打分
- **arize-link**：指向 Arize UI 中评估器和任务的深链接

---

## 保存凭据以供将来使用

参见 [references/ax-profiles.md](references/ax-profiles.md) § 保存凭据以供将来使用。
