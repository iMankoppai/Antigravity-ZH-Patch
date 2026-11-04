---
name: dt-obs-genai
description: >-
  分析和调试 GenAI/LLM 应用：按提示词、模型和提供商统计
  token 成本与缓存；延迟/错误；智能体与工具循环/失败；对话；
  护栏；评估；OpenTelemetry/dt-evals 设置。
license: Apache-2.0
---

# AI 可观测性（GenAI）技能

使用 DQL 分析客户 GenAI 应用的 AI 可观测性信号 —— 黄金
信号、LLM 信号、token 与成本分析（含使用归因和提示词缓存
经济学）、智能体信号（包括循环/失控检测和 Smartscape 拓扑）、
对话/会话级分析、护栏和评估质量。

## 何时使用

将本技能用于有关客户 GenAI 应用的可观测性问题 —— 任何
读取 OpenTelemetry GenAI 跨度（`gen_ai.*`）或 LLM 评估 bizevents 的场景。示例触发：

- "LLM 延迟"、"按模型的错误率"
- "按模型的 token 使用量"、"token 吞吐量 / TPM"、"我是否触及速率限制"、"提供商限流或 429"
- "按模型和提供商的成本"、"谁在驱动 token 支出"、"我是否有提示词缓存"
- "每次对话的成本"、"最昂贵的会话"
- "失败的智能体工具调用"、"查找失控的智能体"
- "响应被截断或被阻止"、"完成原因"
- "失败的评估"、"质量分数"

## 何时不使用

Davis CoPilot/MCP 遥测（dt-platform）、通用服务指标（dt-obs-services）、
日志（dt-obs-logs），或非 GenAI 的分布式追踪（dt-obs-tracing）。

## 示例问题

当建议后续问题时（例如"每个主题给我一个示例问题"），
使用这些规范的、可直接提问的措辞 —— 每个能力一个。保持建议
为单子句，并避免字面短语"内容过滤器"（改用"被阻止或被
安全过滤"）；过长、多子句的问题可能会被拒绝。

- **流量、错误和延迟：** 过去 24 小时内，我按模型的 LLM 错误率和 p95 延迟是多少？
- **Token 使用量与成本：** 过去 24 小时内，按模型和提供商细分 token 使用量与成本。
- **智能体与工具活动：** 显示我过去 24 小时内失败的智能体工具调用。
- **对话分析：** 过去 24 小时内，按总 token 使用量计算，我最昂贵的 10 个对话是什么？
- **护栏：** 过去 7 天有多少响应被阻止或截断，哪个模型受影响最大？
- **评估质量：** 显示过去 24 小时内失败的评估，包含评审者的解释和问答对。

---

## 核心能力

### 黄金信号

四个经典可观测性信号 —— 流量、错误、延迟和饱和度 —— 直接适用于 GenAI 应用。
流量是随时间的请求吞吐量；错误是 `span.status_code == "error"` 的跨度；
延迟是 `duration` 字段（一个 Grail 持续时间值 —— 除以 `1ms` 字面量，`duration / 1ms`，以得到数值毫秒值）；
饱和度由每分钟的总 token 吞吐量（输入 + 输出 token 合计）代理。

```dql
fetch spans, from: now()-24h
| filter isNotNull(gen_ai.request.model)
| summarize total = count(), errors = countIf(span.status_code == "error"), by: {gen_ai.request.model}
| fieldsAdd error_rate_pct = if(total > 0, errors * 100.0 / total, else: 0.0)
| sort error_rate_pct desc
```

→ **完整的流量、延迟和饱和度查询：** 参见 [references/golden-signals.md](references/golden-signals.md)

### LLM 信号

LLM 信号描述每个请求由哪个模型和提供商提供服务、调用了何种操作类型
（`chat`、`execute_tool`、`invoke_agent`、`create_agent`），以及 token 如何被
消耗。用它们对提供商延迟进行基准测试、比较模型性能，并
理解跨模型-提供商组合的 token 分布。

```dql
fetch spans, from: now()-24h
| filter isNotNull(gen_ai.request.model)
| summarize p95_ms = percentile(duration, 95) / 1ms, requests = count(), by: {gen_ai.provider.name}
| sort p95_ms desc
```

→ **最慢的模型、按模型的 token 使用量：** 参见 [references/llm-signals.md](references/llm-signals.md)

### 成本与 Token

Token 消耗是主要的成本驱动因素。Dynatrace 在每个跨度上存储
`gen_ai.usage.input_tokens` 和 `gen_ai.usage.output_tokens` —— 没有存储的成本字段；
估算成本必须通过将 token 总和乘以你提供的每模型价格来推导。使用这些
查询识别支出最高的模型-提供商组合，并检测 token 燃烧尖峰。

```dql
fetch spans, from: now()-24h
| filter isNotNull(gen_ai.usage.input_tokens) or isNotNull(gen_ai.usage.output_tokens)
| summarize input_tokens = sum(gen_ai.usage.input_tokens), output_tokens = sum(gen_ai.usage.output_tokens), total_tokens = sum(gen_ai.usage.input_tokens) + sum(gen_ai.usage.output_tokens), by: {gen_ai.provider.name, gen_ai.request.model}
| sort total_tokens desc
```

→ **Token 尖峰、成本估算、最昂贵的提示词、使用归因、提示词缓存经济学：** 参见 [references/cost-and-tokens.md](references/cost-and-tokens.md)

### 智能体信号

GenAI 智能体为每次工具调用（`execute_tool`）、智能体步骤
（`invoke_agent`）和智能体创建（`create_agent`）发出跨度。使用智能体信号识别
哪些工具调用最频繁以及哪些智能体失败。对于*结构性*
问题 —— 存在哪些智能体、模型和提供商以及它们如何连接 —— 查询
GenAI Smartscape 实体（`GENAI_AGENT`、`GENAI_MODEL`、`GENAI_PROVIDER`、`GENAI_SERVICE`），
而不是扫描跨度；这是受功能标志控制的预览。

```dql
fetch spans, from: now()-24h
| filter isNotNull(gen_ai.agent.name)
| summarize total = count(), errors = countIf(span.status_code == "error"), by: {gen_ai.agent.name}
| fieldsAdd error_rate_pct = if(total > 0, errors * 100.0 / total, else: 0.0)
| sort errors desc
```

→ **工具使用、失败的智能体、智能体步骤延迟、循环/失控检测、Smartscape 拓扑：** 参见 [references/agent-signals.md](references/agent-signals.md)

### 对话分析

逐跨度和逐追踪信号衡量单个请求或单个轮次。当应用
传播 `gen_ai.conversation.id` 时，你可以将跨度汇总到**会话**级别 ——
每次对话的成本、对话运行的深度，以及哪些会话是失控昂贵或
易出错的。这是成本分摊和用户感知可靠性所关心的单元。

```dql
fetch spans, from: now()-24h
| filter isNotNull(gen_ai.conversation.id)
| summarize turns = countDistinct(trace.id), total_tokens = sum(gen_ai.usage.input_tokens) + sum(gen_ai.usage.output_tokens), errors = countIf(span.status_code == "error"), by: {gen_ai.conversation.id}
| sort total_tokens desc
```

→ **每次对话的成本/深度、会话错误率：** 参见 [references/conversation-analytics.md](references/conversation-analytics.md)

### 护栏

护栏以跨度上的 `gen_ai.response.finish_reasons` 形式出现 —— `content_filter` 表示
安全过滤器阻止或脱敏了输出，`length` 表示响应在
token 限制处被截断 —— 也以评估 bizevents 中的主动安全评估器（`prompt-injection`、`pii-leakage`、
`toxicity`、`bias`）形式出现。用它们量化被阻止和截断的
响应，并将它们与 LLM 评审的安全判定关联起来。

```dql
fetch spans, from: now()-24h
| filter isNotNull(gen_ai.response.finish_reasons)
| fieldsAdd finish_reason = gen_ai.response.finish_reasons
| expand finish_reason
| summarize calls = count(), by: {finish_reason, gen_ai.request.model}
| sort calls desc
```

→ **被阻止（安全过滤）、被截断（长度）、完成原因细分：** 参见 [references/guardrails.md](references/guardrails.md)

### 评估质量

评估结果以 **bizevents**（不是跨度）形式捕获，带有
`event.type == "gen_ai.evaluation.result"`。每个评估器为每个
响应发出一个 bizevent，携带分数、通过/失败标签、解释和确切的问答对。
使用评估查询监控质量维度，并呈现带 LLM 评审推理的失败响应。
每个 bizevent 还携带产生被评估响应的运行的 `trace.id`，
因此你可以从质量失败转向导致它的跨度。

```dql
fetch bizevents, from: now()-24h
| filter event.type == "gen_ai.evaluation.result"
| filter gen_ai.evaluation.score.label == "fail"
| fields timestamp, gen_ai.evaluation.name, gen_ai.evaluation.score.value, gen_ai.evaluation.explanation, gen_ai.evaluation.input.question, gen_ai.evaluation.input.answer
| sort timestamp desc
```

→ **质量分数、失败的评估、失败率：** 参见 [references/evaluations.md](references/evaluations.md)

### 空状态检查

当任何信号查询返回零行时，不要报告"未找到数据" —— 首先确认
应用是否发送 GenAI 遥测。以下两个存在性检查显示
存在哪些信号家族：

```dql
fetch spans, from: now()-24h
| summarize 
    has_genai = countIf(isNotNull(gen_ai.request.model)), 
    has_tokens = countIf(isNotNull(gen_ai.usage.input_tokens) or isNotNull(gen_ai.usage.output_tokens)), 
    has_agents = countIf(isNotNull(gen_ai.agent.name)), 
    has_tools = countIf(gen_ai.operation.name == "execute_tool"), 
    has_conversation = countIf(isNotNull(gen_ai.conversation.id)), 
    has_finish_reason = countIf(isNotNull(gen_ai.response.finish_reasons)), 
    has_cached_tokens = countIf(isNotNull(gen_ai.usage.cache_read.input_tokens) or isNotNull(gen_ai.usage.cache_creation.input_tokens)),
    total = count()
    
```

```dql
fetch bizevents, from: now()-24h
| filter event.type == "gen_ai.evaluation.result"
| summarize evals = count()
```

如果 `has_genai` 为零，报告该应用似乎尚未为 AI
可观测性进行插桩 —— 而不是"未找到数据"。如果 `has_genai` 非零但某个特定家族
（`has_tokens`、`has_agents`、`has_tools`、`has_conversation`、`has_finish_reason`、
`has_cached_tokens`、`evals`）为零，则只缺少该信号类型 —— 例如
`has_conversation == 0` 表示会话级分析不可用，因为应用
不传播对话 id，`has_cached_tokens == 0` 表示未报告提示词缓存遥测。
这些可选家族可能使用不同的属性名，取决于
提供商/SDK；在报告其缺失之前先验证。

---

## 智能体指令

### 先行动，后细化

当用户请求分析时，立即使用合理的默认值继续。不要询问
你可以合理假设的参数值。

**未指定时的默认值：**

| 参数 | 默认值 | 理由 |
|-----------|---------|-----------|
| 时间范围 | 最近 24 小时（`from: now()-24h`） | 覆盖完整的运维日，同时不会太窄 |
| 模型范围 | 所有模型（无模型过滤器） | 显示全貌；用户在看到结果后可以收窄 |
| 提供商范围 | 所有提供商 | 与模型范围同样的理由 |
| Token 阈值 | 无 | 显示全部 —— 让数据揭示异常值 |

**例外 —— 成本价格。** 每模型价格是你唯一
无法默认的输入（数据中没有成本字段）。在估算 USD 之前向用户询问它们；
绝不使用记忆中的价格。参见 [cost-and-tokens.md](references/cost-and-tokens.md)。

### 空状态规则

当任何信号查询返回零行时，在响应之前运行上面
**空状态检查**能力中的两个存在性检查 —— 绝不回复"未找到数据"。
如果 `has_genai` 为零，报告该应用似乎尚未为 AI
可观测性进行插桩；如果仅某个特定家族为零，说明缺少的是哪种信号类型。

### 范围边界

此技能仅涵盖**客户 GenAI 应用**的 AI 可观测性信号。
产品文档和配置操作方法问题（例如"我如何配置
Dynatrace OTLP 端点？"）交给 `ask-dynatrace-docs` —— 此技能不
包含产品配置操作方法。

### 理解用户意图

**将用户请求和提示词起始短语映射到能力：**

| 用户请求 / 提示词起始 | 能力 | 参考文件 |
|-------------------------------|------------|----------------|
| "理解 AI 可观测性信号" | 所有信号类别概览 | 本 SKILL.md |
| "分析 LLM 延迟和错误"、"LLM 错误"、"按模型的错误率" | 黄金信号 | [golden-signals.md](references/golden-signals.md) |
| "哪些模型当前最慢？"、"比较跨提供商的延迟" | LLM 信号 | [llm-signals.md](references/llm-signals.md) |
| "显示按模型的 token 使用量"、"token 使用量尖峰" | 成本与 Token | [cost-and-tokens.md](references/cost-and-tokens.md) |
| "按模型和提供商细分成本"、"哪些提示词最昂贵？" | 成本与 Token | [cost-and-tokens.md](references/cost-and-tokens.md) |
| "追踪失败的智能体运行"、"显示失败的工具调用" | 智能体信号 | [agent-signals.md](references/agent-signals.md) |
| "按延迟细分智能体步骤" | 智能体信号 | [agent-signals.md](references/agent-signals.md) |
| "绘制智能体拓扑"、"这个智能体使用哪些模型？"、"列出 GenAI 智能体/模型/提供商" | 智能体信号（Smartscape） | [agent-signals.md](references/agent-signals.md) |
| "智能体是否卡在循环中？"、"查找失控的智能体"、"是什么导致 token 尖峰？" | 智能体信号（循环） | [agent-signals.md](references/agent-signals.md) |
| "每次对话的成本"、"最昂贵的会话"、"对话运行多深？" | 对话分析 | [conversation-analytics.md](references/conversation-analytics.md) |
| "拼接智能体轨迹"、"按会话 id 过滤"、"跨会话连接追踪" | 对话分析 | [conversation-analytics.md](references/conversation-analytics.md) |
| "响应被阻止/过滤的频率如何？"、"响应是否被截断？"、"完成原因" | 护栏 | [guardrails.md](references/guardrails.md) |
| "按应用/用户/租户的成本"、"谁在驱动 token 支出？" | 成本与 Token（归因） | [cost-and-tokens.md](references/cost-and-tokens.md) |
| "我是否有提示词缓存？"、"缓存命中率"、"缓存节省" | 成本与 Token（缓存） | [cost-and-tokens.md](references/cost-and-tokens.md) |
| "总结评估质量分数"、"显示低分响应"、"显示失败的评估" | 评估质量 | [evaluations.md](references/evaluations.md) |
| "我缺少哪些信号？"、"为什么没有数据？" | 空状态检查 | 本 SKILL.md |

---

## 常见工作流

### 工作流：成本调查

```
1. Run token usage by model and provider (cost-and-tokens.md → "Token usage by model and provider")
2. Identify the top model-provider combinations by total_tokens
3. For the top offenders, run token usage spikes to check for abnormal time windows
4. Use the cost-estimation template in "Most expensive prompts and models" to estimate USD spend — ask the user for per-model prices first (see "Exception — cost prices" under Agent Instructions)
5. Check for prompt-size outliers: high input_tokens / output_tokens ratio indicates large context windows
6. Attribute spend to a consumer (cost-and-tokens.md → "Usage attribution") and check whether prompt caching is enabled and effective (cost-and-tokens.md → "Prompt caching economics")
```

### 工作流：Token 尖峰 / 失控调查

```
1. Run token usage spikes (cost-and-tokens.md → "Token usage spikes") to find the abnormal time window
2. Within that window, run repeated-tool-calls and runaway-turn queries (agent-signals.md → "Agent loops and runaway detection")
3. For a flagged trace.id, open the trace to see what the agent looped on
4. If conversation ids are present, re-run the loop query grouped by gen_ai.conversation.id to catch cross-turn loops (conversation-analytics.md)
```

### 工作流：失败的智能体运行

```
1. Run failing agent activity query (agent-signals.md → "Failing agent activity")
2. Sort by errors desc to find the most error-prone agent
3. Take the trace.id from a failing span and open in Dynatrace distributed-tracing view
4. Check agent steps by latency (agent-signals.md) to see which operation type is slowest
```

### 工作流：护栏与安全审查

```
1. Run the guardrails presence check (guardrails.md) to confirm finish reasons are recorded
2. Run the finish-reason breakdown, then the blocked (content_filter) and truncated (length) queries
3. Correlate safety-filter spikes with the prompt-injection evaluator and truncation with answer-completeness failures (evaluations.md)
4. For a specific block or failure, take the trace.id and pivot to the originating spans (evaluations.md → "Correlating evaluations to traces")
```

### 工作流：评估审查

```
1. Run evaluation quality scores (evaluations.md → "Evaluation quality scores") to rank evaluators by avg_score asc
2. Focus on the lowest-scoring evaluator
3. Run failed evaluations (evaluations.md → "Failed evaluations") to surface the exact Q&A pairs and LLM judge explanations
4. Use the "Fail rate by evaluator" query to see how many responses fail each evaluator and the share of total evaluations
5. To root-cause a specific failure, take its trace.id and pivot to the originating spans (evaluations.md → "Correlating evaluations to traces")
```

---

## 参考

- [references/golden-signals.md](references/golden-signals.md) —— 流量、错误、延迟、饱和度
- [references/llm-signals.md](references/llm-signals.md) —— 最慢的模型、提供商延迟、按模型的 token 使用量
- [references/cost-and-tokens.md](references/cost-and-tokens.md) —— token 使用量、尖峰、成本估算模板、使用归因、提示词缓存经济学
- [references/agent-signals.md](references/agent-signals.md) —— 工具使用、失败的智能体、步骤延迟、循环/失控检测、Smartscape 智能体拓扑（预览）
- [references/conversation-analytics.md](references/conversation-analytics.md) —— 会话级成本、深度和错误率（`gen_ai.conversation.id`）
- [references/guardrails.md](references/guardrails.md) —— 通过完成原因体现的被阻止（安全过滤）和被截断（长度）响应
- [references/evaluations.md](references/evaluations.md) —— 质量分数、失败的评估、失败率、追踪关联（bizevents）
