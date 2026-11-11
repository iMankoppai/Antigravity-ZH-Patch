---
name: arize-prompt-optimization
description: 使用生产追踪数据、评估和标注来优化、改进和调试 LLM 提示。从 span 中提取提示，收集性能信号，并使用 ax CLI 运行数据驱动的优化循环。适用于用户提到优化提示、改进提示、让 AI 回应得更好、提升输出质量、提示工程、提示调优或系统提示改进的场景。
metadata:
  author: arize
  version: "1.0"
compatibility: Requires the ax CLI and a configured Arize profile.
---

# Arize 提示优化技能

> **`SPACE`** — `--space` 标志接受空间**名称**（例如 `my-workspace`）或 base64 空间 **ID**（例如 `U3BhY2U6...`）。用 `ax spaces get NAME` 确认已知名称；`ax spaces list` 用于人工浏览。

## 相关技能

- **arize-prompts**：使用 `ax prompts` 在 **Prompt Hub** 中创建、版本化和标注提示（JSON 消息、提供方、诸如 `production` 的标签）。当产物应存放在 Arize 中时使用该技能；使用下面的 **arize-prompt-optimization** 从追踪、数据集和实验中改进提示文本。

## 概念

### 提示在追踪数据中的位置

LLM 应用按照 OpenInference 语义约定发出 span。根据 span 类型和埋点的不同，提示存储在不同的 span 属性中：

| 列 | 包含内容 | 何时使用 |
|--------|-----------------|-------------|
| `attributes.llm.input_messages` | 基于角色的结构化聊天消息（system、user、assistant、tool） | 基于聊天的 LLM 提示的**主要来源** |
| `attributes.llm.input_messages.roles` | 角色数组：`system`、`user`、`assistant`、`tool` | 提取单个消息的角色 |
| `attributes.llm.input_messages.contents` | 消息内容字符串数组 | 提取消息文本 |
| `attributes.input.value` | 序列化的提示或用户问题（通用，适用于所有 span 类型） | 当结构化消息不可用时的回退方案 |
| `attributes.llm.prompt_template.template` | 含 `{variable}` 占位符的模板（例如 `"Answer {question} using {context}"`） | 当应用使用提示模板时 |
| `attributes.llm.prompt_template.variables` | 模板变量值（JSON 对象） | 查看替换进模板的值 |
| `attributes.output.value` | 模型响应文本 | 查看 LLM 产出的内容 |
| `attributes.llm.output_messages` | 结构化模型输出（包括工具调用） | 检查工具调用响应 |

### 按 span 类型查找提示

- **LLM span**（`attributes.openinference.span.kind = 'LLM'`）：检查 `attributes.llm.input_messages` 以获取结构化聊天消息，或检查 `attributes.input.value` 以获取序列化的提示。检查 `attributes.llm.prompt_template.template` 以获取模板。
- **Chain/Agent span**：`attributes.input.value` 包含用户的问题。实际的 LLM 提示位于**子 LLM span** 上——沿追踪树下探。
- **Tool span**：`attributes.input.value` 含工具输入，`attributes.output.value` 含工具结果。通常不是提示所在之处。

### 性能信号列

这些列携带用于优化的反馈数据：

| 列模式 | 来源 | 它告诉你什么 |
|---------------|--------|-------------------|
| `annotation.<name>.label` | 人工审核者 | 分类评级（例如 `correct`、`incorrect`、`partial`） |
| `annotation.<name>.score` | 人工审核者 | 数值质量分数（例如 0.0 - 1.0） |
| `annotation.<name>.text` | 人工审核者 | 对评级的自由文本说明 |
| `eval.<name>.label` | LLM-as-judge 评估 | 自动化的分类评估 |
| `eval.<name>.score` | LLM-as-judge 评估 | 自动化的数值分数 |
| `eval.<name>.explanation` | LLM-as-judge 评估 | 评估为何给出该分数——**对优化最有价值** |
| `attributes.input.value` | 追踪数据 | 输入 LLM 的内容 |
| `attributes.output.value` | 追踪数据 | LLM 产出的内容 |
| `{experiment_name}.output` | 实验运行 | 特定实验的输出 |

## 前置条件

直接执行任务——运行所需的 `ax` 命令。不要预先检查版本、环境变量或配置文件。

如果 `ax` 命令失败，根据错误进行排查：
- `command not found` 或版本错误 → 参见 [references/ax-setup.md](references/ax-setup.md)
- `401 Unauthorized` / 缺少 API key → 运行 `ax profiles show` 检查当前配置文件。如果配置缺失或 API key 错误，按照 [references/ax-profiles.md](references/ax-profiles.md) 创建/更新。如果用户没有密钥，引导他们访问 https://app.arize.com/admin > API Keys
- 空间未知 → 参见 [Space](references/ax-profiles.md#space)
- 项目不明确 → 询问用户，或运行 `ax projects list -o json --limit 100` 并作为可选项呈现
- LLM 提供方调用失败（缺少提供方凭据）→ 运行 `ax ai-integrations list --space SPACE` 检查平台托管的凭据。若不存在，使用 **arize-ai-provider-integration** 技能——绝不要让用户把提供方密钥粘贴到聊天中。
- **安全：** 绝不读取 `.env` 文件，也不要为查找凭据而搜索文件系统。例外：非机密的 `ARIZE_SPACE_ID` 行（参见 [Space](references/ax-profiles.md#space)）。使用 `ax profiles` 获取 Arize 凭据，使用 `ax ai-integrations` 获取 LLM 提供方密钥。绝不要让用户把机密粘贴到聊天中。对于缺失的凭据，参见 [references/ax-profiles.md](references/ax-profiles.md)。

### 何时必须先询问用户

仍然优先使用 `ax` 查询，而非开放式提问：用 `ax projects get NAME --space SPACE` 或 `ax datasets get NAME --space SPACE` 确认已知名称（`list` 用于人工浏览）。如果你仍无法继续（例如多个项目匹配用户给出的名称、追踪与实验路径不明确，或破坏性范围），**不要**直接跳入提问——当因范围或确认而停下时，使用与 **arize-instrumentation** 相同的明确措辞：

1. 确认技能，例如：**我在本仓库中找到了 arize-prompt-optimization 技能**（如有帮助，可以补充 `skills/arize-prompt-optimization/SKILL.md`）。
2. 然后是一行明确的暂停语，例如：**在调用它之前，有几个澄清问题：**
3. 询问**尽可能少**的编号或简短要点问题——仅限那些会阻塞本技能下一步 `ax` 操作的问题。

## 阶段 1：提取当前提示

### 查找包含提示的 LLM span

```bash
# Sample LLM spans (where prompts live)
ax spans export PROJECT --space SPACE --filter "attributes.openinference.span.kind = 'LLM'" -l 10 --stdout

# Filter by model
ax spans export PROJECT --space SPACE --filter "attributes.llm.model_name = 'gpt-4o'" -l 10 --stdout

# Filter by span name (e.g., a specific LLM call)
ax spans export PROJECT --space SPACE --filter "name = 'ChatCompletion'" -l 10 --stdout
```

### 导出追踪以检查提示结构

```bash
# Export all spans in a trace
ax spans export PROJECT --space SPACE --trace-id TRACE_ID --stdout > spans.json

# Export a single span
ax spans export PROJECT --space SPACE --span-id SPAN_ID
```

### 从导出的 JSON 中提取提示

```bash
# Extract structured chat messages (system + user + assistant)
jq '.[0] | {
  messages: .attributes.llm.input_messages,
  model: .attributes.llm.model_name
}' spans.json

# Extract the system prompt specifically
jq '[.[] | select(.attributes.llm.input_messages.roles[]? == "system")] | .[0].attributes.llm.input_messages' spans.json

# Extract prompt template and variables
jq '.[0].attributes.llm.prompt_template' spans.json

# Extract from input.value (fallback for non-structured prompts)
jq '.[0].attributes.input.value' spans.json
```

### 将提示重构为消息

拿到 span 数据后，将提示重构为消息数组：

```json
[
  {"role": "SYSTEM", "content": "You are a helpful assistant that..."},
  {"role": "USER", "content": "Given {input}, answer the question: {question}"}
]
```

如果 span 含 `attributes.llm.prompt_template.template`，则该提示使用了变量。保留这些占位符（`{variable}` 或 `{{variable}}`）——它们在运行时会被替换。

## 阶段 2：收集性能数据

### 来自追踪（生产反馈）

```bash
# Find error spans -- these indicate prompt failures
ax spans export PROJECT --space SPACE \
  --filter "status_code = 'ERROR' AND attributes.openinference.span.kind = 'LLM'" \
  -l 20 --stdout

# Find spans with low eval scores
ax spans export PROJECT --space SPACE \
  --filter "annotation.correctness.label = 'incorrect'" \
  -l 20 --stdout

# Find spans with high latency (may indicate overly complex prompts)
ax spans export PROJECT --space SPACE \
  --filter "attributes.openinference.span.kind = 'LLM' AND latency_ms > 10000" \
  -l 20 --stdout

# Export error traces for detailed inspection
ax spans export PROJECT --space SPACE --trace-id TRACE_ID
```

### 来自数据集和实验

```bash
# Export a dataset (ground truth examples)
ax datasets export DATASET_NAME --space SPACE
# -> dataset_*/examples.json

# Export experiment results (what the LLM produced)
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
# -> experiment_*/runs.json
```

### 合并数据集 + 实验以供分析

按 `example_id` 将两个文件连接，将输入与输出和评估并排查看：

```bash
# Count examples and runs
jq 'length' dataset_*/examples.json
jq 'length' experiment_*/runs.json

# View a single joined record
jq -s '
  .[0] as $dataset |
  .[1][0] as $run |
  ($dataset[] | select(.id == $run.example_id)) as $example |
  {
    input: $example,
    output: $run.output,
    evaluations: $run.evaluations
  }
' dataset_*/examples.json experiment_*/runs.json

# Find failed examples (where eval score < threshold)
jq '[.[] | select(.evaluations.correctness.score < 0.5)]' experiment_*/runs.json
```

### 确定要优化什么

在失败案例中寻找规律：

1. **将输出与基准真值比较**：LLM 的输出在哪些地方与预期不同？
2. **阅读评估解释**：`eval.*.explanation` 告诉你某处为何失败
3. **检查标注文本**：人工反馈描述了具体问题
4. **查找冗长度不匹配**：如果输出相对基准真值过长/过短
5. **检查格式合规性**：输出是否符合预期格式？

## 阶段 3：优化提示

### 优化元提示

填写 [references/optimization-meta-prompt.md](references/optimization-meta-prompt.md) 中的三个占位符，并将其发送给你的 LLM（GPT-4o、Claude 等）以生成改进版本的提示。

### 准备性能数据

在粘贴进模板之前，将记录格式化为 JSON 数组：

```bash
# From dataset + experiment: join and select relevant columns
jq -s '
  .[0] as $ds |
  [.[1][] | . as $run |
    ($ds[] | select(.id == $run.example_id)) as $ex |
    {
      input: $ex.input,
      expected: $ex.expected_output,
      actual_output: $run.output,
      eval_score: $run.evaluations.correctness.score,
      eval_label: $run.evaluations.correctness.label,
      eval_explanation: $run.evaluations.correctness.explanation
    }
  ]
' dataset_*/examples.json experiment_*/runs.json

# From exported spans: extract input/output pairs with annotations
jq '[.[] | select(.attributes.openinference.span.kind == "LLM") | {
  input: .attributes.input.value,
  output: .attributes.output.value,
  status: .status_code,
  model: .attributes.llm.model_name
}]' spans.json
```

### 应用修订后的提示

在 LLM 返回修订后的消息数组后：

1. 并排比较原始提示和修订提示
2. 验证所有模板变量都得到保留
3. 检查格式指令完好无损
4. 在全面部署前先在若干示例上测试

## 阶段 4：迭代

### 优化循环

```
1. Extract prompt    -> Phase 1 (once)
2. Run experiment    -> ax experiments create ...
3. Export results    -> ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
4. Analyze failures  -> jq to find low scores
5. Run meta-prompt   -> Phase 3 with new failure data
6. Apply revised prompt
7. Repeat from step 2
```

### 衡量改进

```bash
# Compare scores across experiments
# Experiment A (baseline)
jq '[.[] | .evaluations.correctness.score] | add / length' experiment_a/runs.json

# Experiment B (optimized)
jq '[.[] | .evaluations.correctness.score] | add / length' experiment_b/runs.json

# Find examples that flipped from fail to pass
jq -s '
  [.[0][] | select(.evaluations.correctness.label == "incorrect")] as $fails |
  [.[1][] | select(.evaluations.correctness.label == "correct") |
    select(.example_id as $id | $fails | any(.example_id == $id))
  ] | length
' experiment_a/runs.json experiment_b/runs.json
```

### A/B 比较两个提示

1. 针对同一数据集创建两个实验，每个使用不同的提示版本
2. 导出二者：`ax experiments export EXP_A --dataset DATASET_NAME --space SPACE`，对 `EXP_B` 执行相同操作
3. 比较平均分数、失败率和具体的示例翻转
4. 检查回归——在提示 A 下通过但在提示 B 下失败的示例

## 提示工程最佳实践

在编写或修订提示时应用以下实践：

| 技巧 | 何时应用 | 示例 |
|-----------|--------------|---------|
| 清晰、详细的指令 | 输出含糊或跑题 | "Classify the sentiment as exactly one of: positive, negative, neutral" |
| 将指令放在开头 | 模型忽略后面的指令 | 将任务描述放在示例之前 |
| 分步拆解 | 复杂的多步流程 | "First extract entities, then classify each, then summarize" |
| 明确的人设 | 需要一致的风格/语气 | "You are a senior financial analyst writing for institutional investors" |
| 分隔符标记 | 各部分内容混在一起 | 使用 `---`、`###` 或 XML 标签将输入与指令分开 |
| Few-shot 示例 | 输出格式需要澄清 | 展示 2-3 组合成的输入/输出对 |
| 指定输出长度 | 响应过长或过短 | "Respond in exactly 2-3 sentences" |
| 推理指令 | 准确性至关重要 | "Think step by step before answering" |
| "我不知道"准则 | 存在幻觉风险 | "If the answer is not in the provided context, say 'I don't have enough information'" |

### 变量保留

在优化使用模板变量的提示时：

- **单花括号**（`{variable}`）：Python f-string / Jinja 风格。在 Arize 中最常见。
- **双花括号**（`{{variable}}`）：Mustache 风格。当框架要求时使用。
- 优化过程中绝不要增加或删除变量占位符
- 绝不要重命名变量——运行时替换依赖于精确的名称
- 如果添加 few-shot 示例，使用字面值，而非变量占位符

## 工作流

### 从失败的追踪优化提示

1. 一步导出完整的失败追踪：
   ```bash
   ax traces export PROJECT --space SPACE --filter "status_code = 'ERROR'" -l 5 --stdout > failing.json
   ```
2. 从 LLM span 中提取提示（若存在出错的 LLM span 则取其，否则取第一个 LLM span）：
   ```bash
   jq '[.[] | select(.attributes.openinference.span.kind == "LLM")] | (map(select(.status_code == "ERROR"))[0] // .[0]) | {
     messages: .attributes.llm.input_messages,
     template: .attributes.llm.prompt_template,
     output: .attributes.output.value,
     error: .attributes.exception.message
   }' failing.json
   ```
3. 从错误消息或输出中确定失败原因
4. 用提示和错误上下文填写优化元提示（阶段 3）
5. 应用修订后的提示

### 使用数据集和实验进行优化

1. 导出数据集和实验（`ax experiments list --dataset DATASET_NAME --space SPACE` 可查找未知名称）：
   ```bash
   ax datasets export DATASET_NAME --space SPACE
   ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
   ```
2. 为元提示准备连接后的数据
3. 运行优化元提示
4. 用修订后的提示创建一个新实验以衡量改进

### 调试产生错误格式的提示

1. 导出输出格式错误的 span：
   ```bash
   ax spans export PROJECT --space SPACE \
     --filter "attributes.openinference.span.kind = 'LLM' AND annotation.format.label = 'incorrect'" \
     -l 10 --stdout > bad_format.json
   ```
2. 查看 LLM 实际产出的内容与预期的内容
3. 向提示添加明确的格式指令（JSON schema、示例、分隔符）
4. 常见修复：添加一个展示确切期望输出格式的 few-shot 示例

### 减少 RAG 提示中的幻觉

1. 查找模型产生幻觉的追踪：
   ```bash
   ax spans export PROJECT --space SPACE \
     --filter "annotation.faithfulness.label = 'unfaithful'" \
     -l 20 --stdout
   ```
2. 一起导出并检查检索器 + LLM span：
   ```bash
   ax spans export PROJECT --space SPACE --trace-id TRACE_ID --stdout > spans.json
   jq '[.[] | {kind: .attributes.openinference.span.kind, name, input: .attributes.input.value, output: .attributes.output.value}]' spans.json
   ```
3. 检查检索到的上下文是否实际包含答案
4. 向系统提示添加接地指令："Only use information from the provided context. If the answer is not in the context, say so."

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| `ax: command not found` | 参见 [references/ax-setup.md](references/ax-setup.md) |
| `No profile found` | 未配置任何配置文件。参见 [references/ax-profiles.md](references/ax-profiles.md) 创建一个。 |
| span 上没有 `input_messages` | 检查 span 类型——Chain/Agent span 将提示存储在子 LLM span 上，而非自身 |
| 提示模板为 `null` | 并非所有埋点都会发出 `prompt_template`。改用 `input_messages` 或 `input.value` |
| 优化后变量丢失 | 验证修订后的提示保留了原始提示中的所有 `{var}` 占位符 |
| 优化使结果更糟 | 检查是否过拟合——元提示可能记住了测试数据。确保 few-shot 示例是合成的 |
| 没有评估/标注列 | 先运行评估（通过 Arize UI 或 SDK），然后重新导出 |
| 找不到实验输出列 | 列名为 `{experiment_name}.output`——通过 `ax experiments get` 检查确切的实验名称 |
| `jq` 处理 span JSON 时出错 | 确保指向正确的文件路径（例如 `--stdout > spans.json` 得到的 `spans.json`） |
