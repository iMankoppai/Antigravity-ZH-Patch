---
name: arize-instrumentation
description: 为 LLM 应用首次添加 Arize AX 追踪。检测技术栈，路由到唯一匹配的集成文档，在用户确认后接入自动埋点，并验证 trace 成功落地。当用户想要为应用添加埋点、从零开始添加追踪、搭建 LLM 可观测性、集成 OpenTelemetry 或 openinference，或开始使用 Arize 追踪时使用。
metadata:
  author: arize
  version: "2.0"
---

# Arize 埋点技能

为应用首次添加 **Arize AX 追踪**：**检测技术栈 → 获取唯一匹配的集成文档 → 接入自动埋点 → 验证 trace 落地。**

**本地路由。** 通过 [references/integration-routing.md](references/integration-routing.md) 将检测到的技术栈映射到单个文档页面，并且**只获取该页面**。当应用使用 agent 框架时，应按**框架**路由，而不是按它所包装的 provider SDK 路由——框架应用内部的裸 `openai`/`anthropic` 导入并不是集成目标；只有当应用直接调用 provider SDK 且完全没有框架介入时，才路由到 provider 页面。当技术栈未在列表中时，按路由器指引在 [llms.txt](https://arize.com/docs/llms.txt) 中搜索其集成页面；若无匹配，使用[手动埋点](https://arize.com/docs/ax/instrument/manual-instrumentation)。绝不要批量读取 [PROMPT.md](https://arize.com/docs/PROMPT.md) 聚合文件。

**规则：** 先检查再修改；追踪是增量式的，绝不改变业务逻辑；遵循现有风格；代码中不含机密，且**绝不要求用户将机密（API key、token）粘贴到聊天中**——只引用 `ARIZE_API_KEY`/`ARIZE_SPACE_ID` 环境变量，由用户在他们自己的 `.env`/shell 中设置；保留或询问应用所在的 Arize 区域/导出端点，而不要假设为美国——参见 [references/regions-and-endpoints.md](references/regions-and-endpoints.md)；在创建持久本地状态（`ax` profile、`.zshrc`、环境变量）之前先询问——参见 [references/ax-profiles.md](references/ax-profiles.md)。

## 阶段 1：分析（只读——不改代码/文件）

从清单文件和导入中检测：语言、包管理器、LLM provider、框架、现有追踪（`TracerProvider`、`register()`、`ARIZE_*`/`OTEL_*`、Datadog/Honeycomb）、现有 Arize 端点/区域配置（`ARIZE_COLLECTOR_ENDPOINT`、代码内的 Arize 端点选项，或已确认指向 Arize 的 `OTEL_EXPORTER_OTLP_ENDPOINT`），以及应用是否运行工具/agent 循环（仅当匹配的框架埋点不覆盖时才手动添加 CHAIN/TOOL span——在阶段 2 决定）。**先确认范围**——monorepo、多服务或多框架需要在动任何东西前先问“是哪一个？”；不要替用户选择。

输出简要摘要（技术栈、拟议集成、现有追踪、范围）。如果目标明确且用户要求现在就加埋点，则继续；如果有歧义或只要求分析，则停下并确认。

## 阶段 2：实现（目标确认之后）

1. **获取匹配的集成文档**并逐字遵循其安装 + 接线步骤。
2. **安装**——在写代码之前，用检测到的包管理器安装；确切的包来自匹配的文档。Python 基础：`arize-otel`（当前 PyPI 发行版）+ `openinference-instrumentation-{name}`（包名用连字符，导入用下划线）。TS/JS：`@opentelemetry/sdk-trace-node` + 匹配的 `@arizeai/openinference-*`（或第一方 exporter，例如 Mastra 的 `@mastra/arize`）。Go **没有集成文档**——安装、接线、flush 和手动 span 参见 [references/go.md](references/go.md)。
3. **凭据和区域**——应用需要一个 API key + Space + exporter 端点/区域。只检查目标应用自身的配置；绝不要扫描同级代码仓库/shell 文件、泄露机密，或接受粘贴的 key。参见 [references/credentials-and-config.md](references/credentials-and-config.md)、[references/regions-and-endpoints.md](references/regions-and-endpoints.md) 和 [references/ax-profiles.md](references/ax-profiles.md)。
4. **集中化** init 到一个模块，且在任何 LLM 客户端创建**之前**。已有 OTel → 将 Arize 添加为*额外* exporter；不要替换它。

5. **当所选 TypeScript 集成支持过滤器时，过滤非 GenAI span。** 使这成为 Arize exporter 的默认设置，以免通用 HTTP/fetch、框架和基础设施 span 淹没项目。对于使用 `@arizeai/openinference-vercel` 的 Vercel AI SDK v7，在 `OpenInferenceSimpleSpanProcessor` 上设置 `spanFilter: isOpenInferenceSpan` 和 `reparentOrphanedSpans: true`；否则 AI span 可能保留对被过滤掉的 HTTP 父级的引用。对于使用 `@mastra/observability` 的 Mastra，在确认应用不依赖 GENERIC span 作为其唯一面向用户的边界后，在 Arize observability 配置上配置 `spanFilter: span => span.type !== SpanType.GENERIC`。不要假设存在通用的 OpenTelemetry 选项：检查匹配集成当前的 API。如果它没有过滤器，避免为 Arize 管道启用不相关的 HTTP/自动埋点，或使用受支持的 processor/collector 过滤器保留预期的 GenAI span。保留有用的语义请求边界；过滤策略不应静默丢弃应用唯一的用户输入/最终答案 span。

**自动 vs 手动：** 优先使用自动埋点——**不要**手写它已覆盖的 span（会重复 span，且与 semconv 漂移）。只为任何埋点都看不到的逻辑，或技术栈根本没有埋点时，才添加手动 span。**当应用直接调用 provider SDK 时，OpenAI 和 Anthropic SDK 埋点会捕获 LLM 调用——包括模型的工具调用请求（名称 + 参数）——但不会捕获工具的执行、其返回值，或 agent/chain 边界。自带工具调用循环的裸 SDK 应用必须为每次执行添加一个 TOOL span（以捕获结果），并添加一个 CHAIN（或 AGENT）span 来聚合该轮次**，否则这些内容永远不会出现——在存在可装饰函数的地方用 `@tracer.tool`/`@tracer.chain` 装饰器完成（它们会自动设置 kind、metadata 和 status）；只有在没有可装饰函数处才手写 span。有些 agent 框架反而通过自己的客户端层驱动模型并发出自己的 OpenTelemetry span；对这些框架，provider 埋点**什么也捕获不到**，因此应通过框架的集成页面而非 provider SDK 进行埋点。框架埋点（LangChain/LangGraph/OpenAI Agents SDK）*通常*覆盖工具和 chain——在跳过手动 span 之前先到匹配文档中核实。`register()`/`arize-otel-go` 用于设置；参见 [references/manual-spans.md](references/manual-spans.md) 和[手动埋点](https://arize.com/docs/ax/instrument/manual-instrumentation)。

**跨领域（所有技术栈）：**
- **项目名必填**——缺失 → HTTP 500（仅 `service.name` 会失败）。设为资源属性：Python `register(project_name=…)`；TS `SEMRESATTRS_PROJECT_NAME`/`model_id`；Go `Options{ProjectName}` 或 `openinference.project.name`。
- **不要手写 `TracerProvider`/exporter**——使用 `register()`/`arize-otel-go`；只有在集成现有 provider 时才用原生 OTel。
- **顺序：** 注册 tracer → 埋点 → 客户端。
- **区域：** 不要假设为美国。保留 `ARIZE_COLLECTOR_ENDPOINT` 或已确认指向 Arize 的端点。通用的 `OTEL_EXPORTER_OTLP_ENDPOINT` 可能属于现有的非 Arize exporter；单独保留该 exporter，并询问 Arize SaaS 区域，而不要盲目复用。参见 [references/regions-and-endpoints.md](references/regions-and-endpoints.md)。
- **优先用 `@tracer.*` 装饰器而非手写 span**——它们会自动设置 kind、`input.value`/`output.value`、完整的 TOOL 元数据和终止 status，因此不会像手写 span 那样发出 `UNSET`/不完整的 span。装饰器位于函数*定义*上，所以动态分发不是手写的理由。参见 [references/manual-spans.md](references/manual-spans.md)。
- **手写 span 必须在退出前设置：** `openinference.span.kind`、`input.value`/`output.value`，对于 TOOL span 还要设置 `tool.name`/`tool.description`/`tool.parameters` 全部三项。**最常被遗漏的一行：** `start_as_current_span` 会把抛出的异常记录为 `ERROR`，但**从不设置 `OK`**——因此要在成功路径上添加 `span.set_status(Status(StatusCode.OK))`，否则 span 导出为 `UNSET` 并导致评分失败。参见 [references/manual-spans.md](references/manual-spans.md)。
- **退出前 flush**（CLI/脚本/notebook），否则异步导出会丢失：Python `force_flush()`+`shutdown()`，TS `shutdown()`，Go `defer tp.Shutdown(ctx)`（绝不要在 span 中途 `log.Fatalf`/`os.Exit`）。参见 [references/session-tracking.md](references/session-tracking.md)。
- **会话：** 对于明显的多轮交互（例如多轮聊天机器人）或用户要求时，添加 `session.id`，使轮次归组为一个对话——参见 [references/session-tracking.md](references/session-tracking.md)。
- **绝不静默覆盖**应用的项目/空间/ID/端点——暴露不匹配。

## 验证

只有当：应用可构建/通过类型检查、带着追踪启动、发出 ≥1 个真实请求，并且你在 Arize 中确认了 trace **或**给出了精确的 app-vs-Arize 阻塞点，才算完成。触发一次 LLM 调用，然后使用 **`arize-trace`** 技能确认 span（kind、`input.value`/`output.value`、父子关系；如果运行工具，则 CHAIN+TOOL）。对提供过滤器的 TypeScript 集成，包含 span 过滤器检查。审查新 trace 中的所有 span 是否有缺失的 input/output，包括未分类的 REST/HTTP span；按 [references/verification.md](references/verification.md) 决定是添加语义请求/响应数据、添加显式的 AI 工作流边界，还是过滤不相关的基础设施 span。与应用一起选择如何表示应用无法安全或正确捕获的任何数据。没有 trace → 检查 `ARIZE_SPACE_ID`/`ARIZE_API_KEY`、init 顺序、配置的 collector 端点/区域、exporter 日志（`GRPC_VERBOSITY=debug`）；常见原因：区域端点错误、缺少项目名（500）、短生命周期进程未 flush，或导出/验证**凭据上下文不匹配**（报告它，不要重写配置——[references/credentials-and-config.md](references/credentials-and-config.md)）。关于确定性的 trace 查找顺序、阻塞点分类和到达后冒烟检查，请遵循 [references/verification.md](references/verification.md)。

## 确认 trace 之后

发出里程碑（安装 → 接线 → 运行 → 导出 → 验证）；将已恢复的错误标记为已解决；最后区分已完成和阻塞项。然后简要提供下一步：**`arize-trace`**（检查/调试）、**`arize-dataset`**（整理）、**`arize-evaluator`**（评估）、**`arize-experiment`**（比较）、**`arize-prompt-optimization`**（改进提示）。质量问题 → 先 **`arize-trace`**。

## 参考

[integration-routing](references/integration-routing.md)（路由器） · [credentials-and-config](references/credentials-and-config.md) · [regions-and-endpoints](references/regions-and-endpoints.md) · [ax-profiles](references/ax-profiles.md) · [manual-spans](references/manual-spans.md) · [go](references/go.md)（Go——不存在文档页面） · [session-tracking](references/session-tracking.md) · [verification](references/verification.md) · [tracing-assistant-mcp](references/tracing-assistant-mcp.md)。
