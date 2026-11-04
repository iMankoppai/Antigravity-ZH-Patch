---
name: workflow
description: Vercel Workflow SDK 专家指南。在构建持久化工作流、长时间运行任务、需要暂停/恢复的 API 路由或智能体、重试、基于步骤的执行，或使用 Vercel Workflow 进行崩溃安全编排时使用。
metadata:
  priority: 9
  docs:
    - "https://vercel.com/docs/workflows"
    - "https://workflow-sdk.dev"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'lib/workflow/**'
    - 'src/lib/workflow/**'
    - 'lib/workflow.*'
    - 'src/lib/workflow.*'
    - 'workflow.*'
    - '*workflow*'
  importPatterns:
    - 'workflow'
    - '@workflow/*'
    - '*workflow*'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*\bworkflow\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*\bworkflow\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*\bworkflow\b'
    - '\byarn\s+add\s+[^\n]*\bworkflow\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@workflow/'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@workflow/'
    - '\bbun\s+(install|i|add)\s+[^\n]*@workflow/'
    - '\byarn\s+add\s+[^\n]*@workflow/'
    - '\bnpx\s+workflow(?:@latest)?\b'
    - '\bbunx\s+workflow(?:@latest)?\b'
  promptSignals:
    phrases:
      # Direct workflow mentions
      - "vercel workflow"
      - "workflow sdk"
      # Legacy product name retained only as an input matcher.
      - "workflow devkit"
      - "durable workflow"
      - "durable execution"
      - "durable function"
      - "durable pipeline"
      - "durable process"
      - "durable agent"
      - "durable chat"
      - "step function"
      - "step functions"
      - "use workflow"
      - "use step"
      # Pipeline / multi-step language (the BIG gap — natural product prompts)
      - "multi-step pipeline"
      - "multi step pipeline"
      - "multi-step process"
      - "multi step process"
      - "multi-step creation"
      - "multi-step generation"
      - "processing pipeline"
      - "creation pipeline"
      - "generation pipeline"
      - "content pipeline"
      - "production pipeline"
      - "approval pipeline"
      - "ingestion pipeline"
      - "streams progress"
      - "stream progress"
      - "streams each phase"
      - "streams each step"
      - "streams each"
      - "stream each"
      # Reliability / durability language (missed in customer-support eval)
      - "survive page reload"
      - "survive page reloads"
      - "survive a crash"
      - "survive crashes"
      - "survive network"
      - "fault-tolerant"
      - "fault tolerant"
      - "crash-safe"
      - "crash safe"
      - "automatically retry"
      - "auto retry"
      - "retry on failure"
      - "retry on error"
      - "reliable and retry"
      - "reliable processing"
      - "individually reliable"
      - "each step reliable"
      - "each step should be reliable"
      - "steps should be reliable"
      - "reliable with automatic retry"
      - "reliable with retry"
      - "retry on transient"
      - "transient failures"
      - "session persistence"
      - "session should persist"
      - "session survives"
      - "reconnect automatically"
      - "auto reconnect"
      - "reconnect if the network"
      - "reconnect on disconnect"
      - "resume after failure"
      - "resume after crash"
      - "resume on reconnect"
      # Human-in-the-loop / approval patterns
      - "human-in-the-loop"
      - "human in the loop"
      - "wait for approval"
      - "approval step"
      - "approval before"
      - "editorial approval"
      - "manual approval"
      - "wait for user"
      - "pause until"
      - "wait for response"
      - "callback url"
      - "webhook callback"
      # Conversational AI with durability
      - "chat should survive"
      - "chat survives"
      - "conversation should persist"
      - "conversation persists"
      - "conversation should survive"
      # Sequential / chain / trigger orchestration language
      - "sequential chain"
      - "email chain"
      - "chain of emails"
      - "chain of steps"
      - "chain engine"
      - "chain with triggers"
      - "trigger chain"
      - "triggered chain"
      - "webhook chain"
      - "webhook pipeline"
      - "webhook orchestration"
      - "multi-service trigger"
      - "cross-service trigger"
      - "various triggers"
      - "different triggers"
      - "triggers from different"
      - "triggers from various"
      - "sequential steps"
      - "sequential pipeline"
      - "sequential process"
      - "sequential emails"
      - "escalation chain"
      - "escalation pipeline"
      - "state machine"
      - "step-based"
      - "step based"
      - "delay between steps"
      - "delay between emails"
      - "delayed steps"
      - "conditional steps"
      - "skip steps"
      - "branch based on"
      - "wait for webhook"
      - "wait for trigger"
      - "wait for event"
      - "orchestrate emails"
      - "orchestrate webhooks"
      - "orchestrate services"
      - "chain across services"
      # Debugging
      - "workflow stuck"
      - "workflow hung"
      - "workflow hanging"
      - "workflow waiting"
      - "workflow failing"
      - "workflow timeout"
      - "workflow not running"
      - "workflow error"
      - "check workflow"
      - "workflow logs"
      - "workflow run status"
      - "debug workflow"
      - "workflow not finishing"
      - "workflow not responding"
      - "workflow stalled"
      - "workflow pending"
      - "step is stuck"
      - "step is hanging"
      - "why is my workflow"
      - "workflow run"
      - "step failed"
      - "run status"
      - "run failed"
      - "run logs"
      - "workflow run failed"
      - "workflow step failed"
    allOf:
      - [workflow, durable]
      - [workflow, retry]
      - [workflow, resume]
      - [pause, resume]
      - [survive, crash]
      - [survive, reload]
      - [survive, disconnect]
      - [pipeline, stream]
      - [pipeline, step]
      - [pipeline, durable]
      - [pipeline, reliable]
      - [pipeline, retry]
      - [multi-step, stream]
      - [multi-step, reliable]
      - [generation, pipeline]
      - [creation, pipeline]
      - [process, stream]
      - [process, reliable]
      - [process, retry]
      - [retry, failure]
      - [retry, error]
      - [retry, automatically]
      - [retry, transient]
      - [reliable, retry]
      - [individually, reliable]
      - [steps, reliable]
      - [sandbox, reliable]
      - [sandbox, retry]
      - [reconnect, network]
      - [reconnect, drop]
      - [reconnect, disconnect]
      - [session, persist]
      - [session, survive]
      - [session, reload]
      - [session, reconnect]
      - [chat, survive]
      - [chat, persist]
      - [chat, reconnect]
      - [chat, durable]
      - [chat, fault]
      - [conversation, persist]
      - [conversation, survive]
      - [approval, wait]
      - [approval, human]
      - [each, step]
      - [each, phase]
      - [each, stage]
      - [step, reliable]
      - [step, retry]
      # Chain / trigger / sequential orchestration
      - [chain, trigger]
      - [chain, sequential]
      - [chain, email]
      - [chain, webhook]
      - [chain, delay]
      - [chain, step]
      - [chain, escalat]
      - [sequential, trigger]
      - [sequential, email]
      - [sequential, step]
      - [sequential, webhook]
      - [trigger, orchestrat]
      - [trigger, service]
      - [trigger, delay]
      - [trigger, sequential]
      - [webhook, chain]
      - [webhook, orchestrat]
      - [webhook, pipeline]
      - [webhook, sequential]
      - [email, trigger]
      - [email, pipeline]
      - [email, sequential]
      - [email, delay]
      - [email, escalat]
      - [escalat, trigger]
      - [escalat, step]
      - [escalat, email]
      - [state, machine]
      - [conditional, step]
      - [conditional, skip]
      - [branch, condition]
      - [wait, webhook]
      - [wait, trigger]
      - [wait, event]
      - [workflow, stuck]
      - [workflow, hung]
      - [workflow, timeout]
      - [workflow, error]
      - [workflow, logs]
      - [workflow, debug]
      - [workflow, check]
      - [workflow, failing]
      - [workflow, status]
      - [run, status]
      - [step, failed]
      - [step, stuck]
      - [step, timeout]
      - [workflow, run]
      - [run, logs]
    anyOf:
      - "long-running"
      - "long running"
      - "multi-step"
      - "multi step"
      - "pipeline"
      - "orchestration"
      - "step-by-step"
      - "step by step"
      - "each piece"
      - "each step"
      - "each phase"
      - "each stage"
      - "phase"
      - "phases"
      - "stage"
      - "stages"
      - "durable"
      - "reliable"
      - "fault-tolerant"
      - "retry"
      - "reconnect"
      - "survive"
      - "persist"
      - "approval"
      - "chain"
      - "sequential"
      - "trigger"
      - "webhook"
      - "escalation"
      - "state machine"
      - "orchestrate"
      - "orchestration"
    noneOf:
      - "github actions"
      - ".github/workflows"
      - "ci workflow"
      - "aws step functions"
    minScore: 4
validate:
  -
    pattern: setTimeout|setInterval
    message: 'setTimeout/setInterval are not available in workflow sandbox scope — use sleep() from "workflow" for delays'
    severity: error
    skipIfFileContains: "use step"
  -
    pattern: context\.run\s*\(
    message: 'context.run() is not a Workflow SDK pattern — use "use step" directive for retryable, observable steps'
    severity: error
    upgradeToSkill: workflow
    upgradeWhy: 'Guides migration from context.run() to the "use step" directive for durable, retryable workflow steps.'
  -
    pattern: \brequire\s*\(
    message: 'require() is not available in workflow sandbox scope — use ESM imports and move Node.js logic into "use step" functions'
    severity: error
    skipIfFileContains: "use step"
  -
    pattern: getWritable\(\)
    message: 'getWritable() must only be called inside "use step" functions — workflow sandbox scope does not support it'
    severity: recommended
    skipIfFileContains: "use step"
  -
    pattern: streamObject\s*\(
    message: 'streamObject() is deprecated since AI SDK 6 — use streamText() with output: Output.object() instead'
    severity: error
    upgradeToSkill: ai-sdk
    upgradeWhy: 'Guides migration from streamObject to streamText + Output.object() with correct v6 streaming patterns.'
  -
    pattern: await\s+\w+Workflow\s*\(
    message: 'Do not call workflow functions directly — use start() from "workflow/api" to register the run and get a runId'
    severity: recommended
    skipIfFileContains: "use workflow"
  -
    pattern: \bfetch\s*\(
    message: 'Native fetch() is not available in workflow sandbox scope — import fetch from "workflow" or move the call into a "use step" function'
    severity: recommended
    skipIfFileContains: "use step"
  -
    pattern: '"use step"'
    message: "Workflow steps should include console.log or structured logging for observability — add logging at step entry/exit to debug hangs"
    severity: warn
    skipIfFileContains: "console\\.(log|warn|error|info)"
  -
    pattern: '"use workflow"'
    message: "Workflow files should import and use logging — add console.log or a logger at key execution points for debugging"
    severity: warn
    skipIfFileContains: "console\\.(log|warn|error|info)"
chainTo:
  -
    pattern: 'DurableAgent|@workflow/ai'
    targetSkill: ai-sdk
    message: 'Workflow 5 (workflow@latest) deprecates DurableAgent (@workflow/ai) in favor of WorkflowAgent from @ai-sdk/workflow 2.x, which requires Workflow 5; the Workflow 4 docs (workflow@4) use DurableAgent. Loading AI SDK guidance for tool calling, the Agent class, and model configuration.'
    skipIfFileContains: 'from\s+[''"]ai[''"]|@ai-sdk/|streamText|generateText'
  -
    pattern: 'process\.env\.(OPENAI_API_KEY|ANTHROPIC_API_KEY)|from\s+[''"]@ai-sdk/(anthropic|openai)[''""]'
    targetSkill: ai-gateway
    message: 'Direct provider API key in workflow — loading AI Gateway guidance for OIDC auth (required for Workflow SDK AI steps).'
    skipIfFileContains: 'gateway\(|@ai-sdk/gateway|VERCEL_OIDC'
  -
    pattern: 'setTimeout\s*\(|setInterval\s*\('
    targetSkill: vercel-functions
    message: 'Timer-based delay in workflow code — use sleep() from "workflow" instead of setTimeout/setInterval. Loading Vercel Functions guidance.'
    skipIfFileContains: 'from\s+[''"]workflow[''"].*sleep|sleep\s*\('
retrieval:
  aliases:
    - durable workflow
    - long running task
    - step function
    - orchestration
  intents:
    - build workflow
    - add retry logic
    - create durable task
    - implement step function
  entities:
    - Workflow SDK
    # Legacy product names retained only as retrieval aliases.
    - Workflow DevKit
    - WDK
    - step
    - pause/resume
    - durable
---

## *关键*：始终使用正确的 `workflow` 文档

你对 `workflow` 的知识已经过时。

下面概述的 `workflow` 文档与已安装的 Workflow SDK 版本匹配。
在开始任何与 `workflow` 相关的任务之前，遵循这些说明：

搜索 `node_modules/workflow/docs/` 中的随附文档：

1. **查找文档**：`glob "node_modules/workflow/docs/**/*.mdx"`
2. **搜索内容**：`grep "your query" node_modules/workflow/docs/`

`node_modules/workflow/docs/` 中的文档结构：

- `getting-started/` - 框架设置（next.mdx、express.mdx、hono.mdx 等）
- `foundations/` - 核心概念（workflows-and-steps.mdx、hooks.mdx、streaming.mdx 等）
- `api-reference/workflow/` - API 文档（sleep.mdx、create-hook.mdx、fatal-error.mdx 等）
- `api-reference/workflow-api/` - 客户端 API（start.mdx、get-run.mdx、resume-hook.mdx 等）
- `api-reference/workflow-runtime/` - 运行时 API（get-world.mdx）和 `world/` World SDK（storage.mdx、streams.mdx、queue.mdx）
- `api-reference/workflow-observability/` - Hydration 和名称解析工具（hydrate-resource-io.mdx、parse-workflow-name.mdx 等）
- `ai/`：AI SDK 集成文档
- `errors/` - 错误码文档
- `worlds/` - 各 World 的行为和限制（vercel.mdx、local.mdx、postgres.mdx）。其他页面以 `/worlds/<name>` 链接它们。

相关包也包含随附文档：

- `@ai-sdk/workflow`：`node_modules/ai/docs/` - WorkflowAgent 和 AI SDK 集成
- `@workflow/ai`：`node_modules/@workflow/ai/docs/` - 现有应用的已弃用 DurableAgent API
- `@workflow/core`：`node_modules/@workflow/core/docs/` - 核心运行时（foundations、how-it-works）
- `@workflow/next`：`node_modules/@workflow/next/docs/` - Next.js 集成

**如有疑问，更新到 Workflow SDK 的最新版本。**

### 官方资源

- **网站**：https://workflow-sdk.dev
- **GitHub**：https://github.com/vercel/workflow

### 快速参考

**指令：**

```typescript
"use workflow";  // First line - makes async function durable
"use step";      // First line - makes function a cached, retryable unit
```

**基本导入：**

```typescript
// Workflow primitives
import { sleep, fetch, createHook, createWebhook, getWritable } from "workflow";
import { FatalError, RetryableError } from "workflow";
import { getWorkflowMetadata, getStepMetadata } from "workflow";

// API operations
import { start, getRun, resumeHook, resumeWebhook } from "workflow/api";

// Observability & data hydration
import { hydrateResourceIO, observabilityRevivers, parseStepName, parseWorkflowName } from "workflow/observability";

// Framework integrations
import { withWorkflow } from "workflow/next";
import { workflow } from "workflow/vite";
import { workflow } from "workflow/astro";
// Or use modules: ["workflow/nitro"] for Nitro/Nuxt

// AI agent (Workflow 5)
import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
```

## 优先使用步骤函数以避免沙箱错误

`"use workflow"` 函数运行在沙箱化 VM 中。`"use step"` 函数拥有**完整的 Node.js 访问权限**。将你的逻辑放入步骤中，并纯粹将 workflow 函数用于编排。

```typescript
// Steps have full Node.js and npm access
async function fetchUserData(userId: string) {
  "use step";
  const response = await fetch(`https://api.example.com/users/${userId}`);
  return response.json();
}

async function processWithAI(data: any) {
  "use step";
  // AI SDK works in steps without workarounds
  return await generateText({
    model: "spacexai/grok-4.6",
    prompt: `Process: ${JSON.stringify(data)}`,
  });
}

// Workflow orchestrates steps - no sandbox issues
export async function dataProcessingWorkflow(userId: string) {
  "use workflow";
  const data = await fetchUserData(userId);
  const processed = await processWithAI(data);
  return { success: true, processed };
}
```

**好处：** 步骤有自动重试，结果会持久化以便重放，且没有沙箱限制。

## Workflow 沙箱限制

当你需要将逻辑直接放在 workflow 函数中（而非步骤中）时，适用这些限制：

| 限制 | 变通方案 |
|------------|------------|
| 无 `fetch()` | `import { fetch } from "workflow"` 然后 `globalThis.fetch = fetch` |
| 无 `setTimeout`/`setInterval` | 使用 `"workflow"` 的 `sleep("5s")` |
| 无 Node.js 模块（fs、crypto 等） | 移到步骤函数 |

**示例 - 在 workflow 上下文中使用 fetch：**

```typescript
import { fetch } from "workflow";

export async function myWorkflow() {
  "use workflow";
  globalThis.fetch = fetch;  // Required for AI SDK and HTTP libraries
  // Now generateText() and other libraries work
}
```

**注意：** 纯 `"provider/model"` 字符串使用 Vercel AI Gateway。除非用户明确需要仅提供商的功能，否则不要构造直接的提供商实例。

## WorkflowAgent：Workflow 5 中的 AI 智能体

在 Workflow 5 上使用 AI SDK 的 `WorkflowAgent` 构建持久化智能体。它取代 `@workflow/ai` 中已弃用的 `DurableAgent` API，并对模型调用和由步骤支撑的工具进行检查点。

```typescript
import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { isStepCount, tool } from "ai";
import { getWritable } from "workflow";
import { z } from "zod";

async function lookupData({ query }: { query: string }) {
  "use step";
  // Step functions have full Node.js access
  return `Results for "${query}"`;
}

export async function myAgentWorkflow(userMessage: string) {
  "use workflow";

  const agent = new WorkflowAgent({
    model: "spacexai/grok-4.6",
    instructions: "You are a helpful assistant.",
    tools: {
      lookupData: tool({
        description: "Search for information",
        inputSchema: z.object({ query: z.string() }),
        execute: lookupData,
      }),
    },
  });

  const result = await agent.stream({
    messages: [{ role: "user", content: userMessage }],
    writable: getWritable<ModelCallStreamPart>(),
    stopWhen: isStepCount(10),
  });

  return result.messages;
}
```

**要点：**
- 纯 `"provider/model"` 字符串路由通过 Vercel AI Gateway；`spacexai/grok-4.6` 是 Workflow 示例中的默认模型
- `getWritable<ModelCallStreamPart>()` 流式传输持久化的模型调用输出；在 HTTP 路由中用 `createModelCallToUIChunkTransform()` 转换它
- 需要 Node.js/npm 访问的工具 `execute` 函数应使用 `"use step"`
- 使用 workflow 原语（`sleep()`、`createHook()`）的工具 `execute` 函数**不应**使用 `"use step"`，因为它们在 workflow 层级运行
- `stopWhen` 限制模型调用次数；默认在模型停止调用工具时停止
- 多轮：将 `result.messages` 加上新的用户消息传给后续的 `agent.stream()` 调用

**更多细节，请查看已安装 AI SDK 包中的 WorkflowAgent 文档，或访问 https://ai-sdk.dev/v7/docs/agents/workflow-agent。**

## 启动工作流和子工作流

使用 `start()` 从 API 路由启动工作流。在 Workflow 5 中，`start()` 也可以直接从 workflow 函数调用以生成子运行；它由步骤支撑，并在父级事件日志中记录一个确定性边界。

```typescript
import { start } from "workflow/api";

// From an API route; works directly
export async function POST() {
  const run = await start(myWorkflow, [arg1, arg2]);
  return Response.json({ runId: run.runId });
}

// No-args workflow
const run = await start(noArgWorkflow);
```

**从 Workflow 5 workflow 内部启动子工作流：**

```typescript
import { start } from "workflow/api";

export async function parentWorkflow() {
  "use workflow";
  const childRun = await start(childWorkflow, ["some data"]);
  await sleep("1h");
  return { childRunId: childRun.runId };
}
```

`start()` 在创建子运行后返回，不等待它完成。仅当父级应等待子级时才使用 `childRun.returnValue`；workflow 内每次 `Run` 属性访问或方法调用都是一个步骤。

## 运行大小与并发：知道何时拆分

不要把任何你记得的数字当作权威——当前值发布在 [Workflow 运行限制](https://vercel.com/docs/workflows/pricing#workflow-run-limits)下。

**每次运行的事件数。** 一次运行的事件日志有上限，超过上限时运行以 `MAX_EVENTS_EXCEEDED` 失败。事件不是步骤：一个首次尝试就成功的步骤记录三个（`step_created`、`step_started`、`step_completed`），一次重试再记录一或两个，而钩子、休眠和 webhook 各自记录自己的。在上限之前很早就拆分为子工作流——定价页面建议超过**几千个事件**时就拆分，因为重放在运行失败之前很久就会变慢。

**每次运行的步骤数。** 通过事件限制隐式设上限。当一条链否则会达到五位数时，将多个项打包进一个步骤。

**并发。** 宽的扇出是被节流而不是被拒绝：事件创建按运行每秒限速，因此对几千个项的扁平 `Promise.all` 大部分时间都在退避。改为批处理或打包——分块处理列表，或每步处理几个项，以便更少、更大的单元并发运行。为每个项生成一个子运行本身并不会缩小扇出；它限定每个子级的日志并隔离失败，因为这些原因值得做，但它不能替代分块。

你不能自己提高其中任何一个——`WORKFLOW_MAX_EVENTS_OVERRIDE` 只会*向下*限制，而在 Vercel World 上上限由服务拥有——但 Vercel 会按请求提高每次运行的事件和步骤限制，因此真正大的运行既是设计问题也是支持问题。

```typescript
const BATCH = 100;

async function processItem(item: string) {
  "use step";
  return item.toUpperCase();
}

// One step per item, all in flight at once, all in one log
export async function processAll(items: string[]) {
  "use workflow";
  await Promise.all(items.map((item) => processItem(item)));
}

// Chunked, so only BATCH steps are in flight at a time
export async function processBatched(items: string[]) {
  "use workflow";
  for (let i = 0; i < items.length; i += BATCH) {
    await Promise.allSettled(items.slice(i, i + BATCH).map((item) => processItem(item)));
  }
}

// Bundled, so one step covers many items and the log stays short
async function processChunk(chunk: string[]) {
  "use step";
  return chunk.map((item) => item.toUpperCase());
}

export async function processBundled(items: string[]) {
  "use workflow";
  for (let i = 0; i < items.length; i += BATCH) {
    await processChunk(items.slice(i, i + BATCH));
  }
}
```

`processAll` 是大规模时应避免的形态。`processBatched` 限制了并发但仍为每个项记录事件。`processBundled` 同时限制两者，因为一个步骤覆盖 `BATCH` 个项——这是三者中唯一一个事件数随 `BATCH` 增长而缩小的。

## 钩子：用外部事件暂停与恢复

钩子让工作流等待外部数据。在 workflow 内使用 `createHook()`，从 API 路由使用 `resumeHook()`。确定性令牌仅用于 `createHook()` + `resumeHook()`（服务端）。`createWebhook()` 始终生成随机令牌，因此不要向 `createWebhook()` 传 `token` 选项。

### 单个事件

```typescript
import { createHook } from "workflow";

export async function approvalWorkflow() {
  "use workflow";

  const hook = createHook<{ approved: boolean }>({
    token: "approval-123",  // deterministic token for external systems
  });

  const result = await hook;  // Workflow suspends here
  return result.approved;
}
```

### 多个事件（可迭代钩子）

钩子实现 `AsyncIterable`。使用 `for await...of` 接收多个事件：

```typescript
import { createHook } from "workflow";

export async function chatWorkflow(channelId: string) {
  "use workflow";

  const hook = createHook<{ text: string; done?: boolean }>({
    token: `chat-${channelId}`,
  });

  for await (const event of hook) {
    await processMessage(event.text);
    if (event.done) break;
  }
}
```

每次 `resumeHook(token, payload)` 调用都会将下一个值传递给循环。

### 从 API 路由恢复

```typescript
import { resumeHook } from "workflow/api";

export async function POST(req: Request) {
  const { token, data } = await req.json();
  await resumeHook(token, data);
  return new Response("ok");
}
```

## 错误处理

对于永久失败（不重试）使用 `FatalError`，对于瞬时失败使用 `RetryableError`：

```typescript
import { FatalError, RetryableError } from "workflow";

if (res.status === 429) {
  throw new RetryableError("Rate limited", { retryAfter: "5m" });
}
if (res.status >= 400 && res.status < 500) {
  throw new FatalError(`Client error: ${res.status}`);
}
```

## 序列化

传入/传出工作流和步骤的所有数据都必须可序列化。

**支持的内置类型：** string、number、boolean、null、undefined、bigint、纯对象、数组、Date、RegExp、URL、URLSearchParams、Map、Set、Headers、ArrayBuffer、类型化数组、Request、Response、ReadableStream、WritableStream。

**不支持：** Function、Symbol、WeakMap/WeakSet。传数据，而不是回调。

### 自定义类序列化

类实例**可以**通过实现 `@workflow/serde` 协议跨 workflow/step 边界序列化。当类具有带 `"use step"` 的实例方法，或你想在步骤之间传递类实例时，这至关重要。

**安装：** `@workflow/serde` 必须是包含该类的包的依赖。

**模式：** 使用计算属性语法在类体内添加两个静态方法：

```typescript
import { WORKFLOW_SERIALIZE, WORKFLOW_DESERIALIZE } from "@workflow/serde";

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // Serialize: return plain data (must be devalue-compatible types only)
  static [WORKFLOW_SERIALIZE](instance: Point) {
    return { x: instance.x, y: instance.y };
  }

  // Deserialize: reconstruct from plain data
  static [WORKFLOW_DESERIALIZE](data: { x: number; y: number }) {
    return new Point(data.x, data.y);
  }

  async computeDistance(other: Point) {
    "use step";
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }
}
```

**关键规则：**
1. **在类体内定义 serde 方法**，作为带计算属性语法的静态方法（`static [WORKFLOW_SERIALIZE](...)`）。SWC 插件通过扫描类来检测它们。不要在外部赋值它们（例如 `(MyClass as any)[WORKFLOW_SERIALIZE] = ...`）——编译器不会检测到。
2. **Serde 方法必须只返回 devalue 兼容的类型**（纯对象、数组、原始值、Date、Map、Set、Uint8Array 等）。没有函数、没有类实例、没有 Node.js 特定对象。
3. **为依赖 Node.js 的实例方法添加 `"use step"`。** SWC 插件会从 workflow 包中剥离 `"use step"` 方法体。这样你就把 Node.js 导入（fs、crypto、child_process 等）挡在 workflow 沙箱之外。带 serde 方法的类外壳保留在 workflow 包中；只有步骤方法体被移除。
4. **不要手动注册类。** SWC 插件自动生成注册代码（一个设置 `classId` 并将类添加到全局注册表的 IIFE）。手动调用 `registerSerializationClass()` 不必要且容易出错。
5. **不要使用动态导入来绕过沙箱限制。** 如果类方法需要 Node.js API，正确的解决方案是 `"use step"`，而不是 `/* @vite-ignore */ import(...)`。

**Serde 良好工作的情况：** 纯数据类、领域模型、配置对象，以及依赖 Node.js 的方法可以标记为 `"use step"` 的类。

**何时避免 serde：** 如果一个类本质上无法与 Node.js API 分离（每个方法都需要 `fs`、`net` 等），并且无法作为外壳有意义地存在于 workflow 沙箱中，就把它完全保留在步骤函数中，并跨边界传递纯数据对象。

### 验证 serde 合规性

使用这些工具验证类是否正确设置：

- **`workflow transform <file> --check-serde`** —— 显示文件的 SWC 转换输出并检查 serde 类是否合规（workflow 包中没有残留 Node.js 导入）。
- **`workflow validate`** —— 扫描所有 workflow 文件并报告 serde 合规问题。使用 `--json` 获得机器可读输出。
- **SWC Playground** —— `workbench/swc-playground` 处的网页 playground 在检测到 serde 模式时显示一个 Serde Analysis 面板。
- **构建时警告** —— 当 serde 类在 workflow 包中仍有 Node.js 内置导入时，构建器会自动警告。

## 流式传输

使用 `getWritable()` 从工作流流式传输数据。`getWritable()` 可在 workflow 和 step 上下文**两者**中调用，但你**不能直接在 workflow 函数中与流交互**（调用 `getWriter()`、`write()`、`close()`）。流必须传递给步骤函数进行实际 I/O，或步骤可以自己调用 `getWritable()`。

**在 workflow 中获取流，将其传给步骤：**
```typescript
import { getWritable } from "workflow";

export async function myWorkflow() {
  "use workflow";
  const writable = getWritable();
  await writeData(writable, "hello world");
}

async function writeData(writable: WritableStream, chunk: string) {
  "use step";
  const writer = writable.getWriter();
  try {
    await writer.write(chunk);
  } finally {
    writer.releaseLock();
  }
}
```

**直接在步骤内调用 `getWritable()`（无需传递）：**
```typescript
import { getWritable } from "workflow";

async function streamData(chunk: string) {
  "use step";
  const writer = getWritable().getWriter();
  try {
    await writer.write(chunk);
  } finally {
    writer.releaseLock();
  }
}
```

### 命名空间流

使用 `getWritable({ namespace: 'name' })` 为不同类型的数据创建多个独立流。这对于将日志与主输出、不同日志级别、智能体输出、指标或任何不同数据通道分开很有用。长时工作流受益于命名空间流，因为你可以只重放重要事件（例如最终结果），同时将详细日志保留在单独的流中。

**示例：日志级别和智能体输出分离：**
```typescript
import { getWritable } from "workflow";

type LogEntry = { level: "debug" | "info" | "warn" | "error"; message: string; timestamp: number };
type AgentOutput = { type: "thought" | "action" | "result"; content: string };

async function logDebug(message: string) {
  "use step";
  const writer = getWritable<LogEntry>({ namespace: "logs:debug" }).getWriter();
  try {
    await writer.write({ level: "debug", message, timestamp: Date.now() });
  } finally {
    writer.releaseLock();
  }
}

async function logInfo(message: string) {
  "use step";
  const writer = getWritable<LogEntry>({ namespace: "logs:info" }).getWriter();
  try {
    await writer.write({ level: "info", message, timestamp: Date.now() });
  } finally {
    writer.releaseLock();
  }
}

async function emitAgentThought(thought: string) {
  "use step";
  const writer = getWritable<AgentOutput>({ namespace: "agent:thoughts" }).getWriter();
  try {
    await writer.write({ type: "thought", content: thought });
  } finally {
    writer.releaseLock();
  }
}

async function emitAgentResult(result: string) {
  "use step";
  // Important results go to the default stream for replay
  const writer = getWritable<AgentOutput>().getWriter();
  try {
    await writer.write({ type: "result", content: result });
  } finally {
    writer.releaseLock();
  }
}

export async function agentWorkflow(task: string) {
  "use workflow";
  
  await logInfo(`Starting task: ${task}`);
  await logDebug("Initializing agent context");
  await emitAgentThought("Analyzing the task requirements...");
  
  // ... agent processing ...
  
  await emitAgentResult("Task completed successfully");
  await logInfo("Workflow finished");
}
```

**消费命名空间流：**
```typescript
import { start, getRun } from "workflow/api";
import { agentWorkflow } from "./workflows/agent";

export async function POST(request: Request) {
  const run = await start(agentWorkflow, ["process data"]);

  // Access specific streams by namespace
  const results = run.getReadable({ namespace: undefined }); // Default stream (important results)
  const infoLogs = run.getReadable({ namespace: "logs:info" });
  const debugLogs = run.getReadable({ namespace: "logs:debug" });
  const thoughts = run.getReadable({ namespace: "agent:thoughts" });

  // Return only important results for most clients
  return new Response(results, { headers: { "Content-Type": "application/json" } });
}

// Resume from a specific point (useful for long sessions)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId")!;
  const startIndex = parseInt(searchParams.get("startIndex") || "0", 10);
  
  const run = getRun(runId);
  // Resume only the important stream, skip verbose debug logs
  const stream = run.getReadable({ startIndex });
  
  return new Response(stream);
}
```

对于长时会话（50+ 分钟），命名空间流有助于管理重放性能。将详细/调试输出放在单独的命名空间中，以便你只重放重要事件。

## 调试

```bash
# Check workflow endpoints are reachable
npx workflow health
npx workflow health --port 3001  # Non-default port

# Visual dashboard for runs
npx workflow web
npx workflow web <run_id>

# CLI inspection (use --json for machine-readable output, --help for full usage)
npx workflow inspect runs
npx workflow inspect run <run_id>

# For Vercel-deployed projects, specify backend and project
npx workflow inspect runs --backend vercel --project <project-name> --team <team-slug>
npx workflow inspect run <run_id> --backend vercel --project <project-name> --team <team-slug>

# Open Vercel dashboard in browser for a specific run
npx workflow inspect run <run_id> --web
npx workflow web <run_id> --backend vercel --project <project-name> --team <team-slug>

# Cancel a running workflow
npx workflow cancel <run_id>
npx workflow cancel <run_id> --backend vercel --project <project-name> --team <team-slug>
# --env defaults to "production"; use --env preview for preview deployments
```

### 深度链接到某次运行（分享 URL，不打开浏览器）

使用 `--url` 来**打印**仪表板深度链接并退出。不打开浏览器，也不启动本地服务器。当你需要交给用户一个可点击链接（PR 评论、Slack 消息、调试摘要）而不是打开 UI 时，这是正确的工具。（`--web` 打开仪表板；`--url` 只打印链接。）

```bash
# Vercel run: prints the Vercel dashboard URL for the run
npx workflow inspect run <run_id> --backend vercel --project <project> --team <team> --url
npx workflow web <run_id> --backend vercel --project <project> --team <team> --env preview --url

# Local run: prints the local web UI deep link
npx workflow inspect run <run_id> --url

# Machine-readable: --url --json prints { "url": "..." } to stdout
npx workflow inspect run <run_id> --backend vercel --url --json
```

生成的 URL 格式：

- **Vercel：** `https://vercel.com/<team-slug>/<project-slug>/workflows/runs/<run_id>?environment=<production|preview>`
  （`--env` 选择环境；默认 `production`。解析团队
  slug 需要通过 `vercel login` 登录并关联项目。）
- **本地：** `http://localhost:<port>?resource=run&id=<run_id>`（端口默认
  `3456`；`npx workflow web` 服务器运行期间链接有效）。

stdout **仅**包含 URL（或 JSON 对象）。所有其他输出到
stderr，因此你可以直接捕获它，例如 `URL=$(npx workflow web <run_id> --backend vercel --url)`。

**调试提示：**
- 在任何命令上使用 `--json`（`-j`）获得机器可读输出
- 使用 `--web` 在浏览器中打开 Vercel Observability 仪表板，或使用 `--url` 打印深度链接
- 在任何命令上使用 `--help` 获取完整用法详情
- 只导入你实际使用的 workflow API。未使用的导入可能导致 500 错误。

## 测试工作流

Workflow SDK 提供一个 Vitest 插件，用于在进程内测试工作流，无需运行服务器。

**单元测试步骤：** 步骤是函数；没有编译器时，`"use step"` 是空操作。直接测试它们：

```typescript
import { describe, it, expect } from "vitest";
import { createUser } from "./user-signup";

describe("createUser step", () => {
  it("should create a user", async () => {
    const user = await createUser("test@example.com");
    expect(user.email).toBe("test@example.com");
  });
});
```

**集成测试：** 对于使用 `sleep()`、钩子、webhook 或重试的工作流，使用 `@workflow/vitest`。将其安装在 `workflow` 旁边并保持两者同一主版本：`npm i -D @workflow/vitest`。当插件的 `@workflow/core` 主版本与应用不同时，运行会失败。

```typescript
// vitest.integration.config.ts
import { defineConfig } from "vitest/config";
import { workflow } from "@workflow/vitest";

export default defineConfig({
  plugins: [workflow()],
  test: {
    include: ["**/*.integration.test.ts"],
    testTimeout: 60_000,
  },
});
```

```typescript
// approval.integration.test.ts
import { describe, it, expect } from "vitest";
import { start, getRun, resumeHook } from "workflow/api";
import { waitForHook, waitForSleep } from "@workflow/vitest";
import { approvalWorkflow } from "./approval";

describe("approvalWorkflow", () => {
  it("should publish when approved", async () => {
    const run = await start(approvalWorkflow, ["doc-123"]);

    // Wait for the hook, then resume it
    await waitForHook(run, { token: "approval:doc-123" });
    await resumeHook("approval:doc-123", { approved: true, reviewer: "alice" });

    // Wait for sleep, then wake it up
    const sleepId = await waitForSleep(run);
    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });

    const result = await run.returnValue;
    expect(result).toEqual({ status: "published", reviewer: "alice" });
  });
});
```

**测试 webhook：** 使用带 `Request` 对象的 `resumeWebhook()`。无需 HTTP 服务器：

```typescript
import { start, resumeWebhook } from "workflow/api";
import { waitForHook } from "@workflow/vitest";

const run = await start(ingestWorkflow, ["ep-1"]);
const hook = await waitForHook(run);  // Discovers the random webhook token
await resumeWebhook(hook.token, new Request("https://example.com/webhook", {
  method: "POST",
  body: JSON.stringify({ event: "order.created" }),
}));
```

**关键 API：**
- `start()`：触发一个工作流
- `run.returnValue`：等待工作流完成
- `waitForHook(run, { token? })` / `waitForSleep(run)`：等待工作流到达暂停点
- `resumeHook(token, data)` / `resumeWebhook(token, request)`：恢复暂停的工作流
- `getRun(runId).wakeUp({ correlationIds })`：跳过 `sleep()` 调用
- `getWorkflowRef(name)` / `listWorkflowRefs()`：当测试无法导入函数时，在测试构建的 manifest 中查找工作流（绝不要手写 `workflow//...` id）

**最佳实践：**
- 将单元测试（无插件）和集成测试（`workflow()` 插件）放在单独的配置中
- 将 `@workflow/vitest` 安装在 `workflow` 的同一主版本上，并一起升级
- 使用基于测试数据的确定性钩子令牌以便更容易恢复
- 设置宽松的 `testTimeout` 值，因为工作流可能比典型单元测试运行更久
- `vi.mock()` 永远到不了 workflow 主体（它们在 VM 中运行），只有在生成的包通过 Vitest 的模块运行器加载时才到达步骤代码；项目本地模块被打包进步骤包，因此 mock npm 叶子、注入依赖，或对步骤进行单元测试

## 可观测性与 World SDK

使用 `await getWorld()` 构建可观测性仪表板、管理面板并检查工作流状态。`getWorld()` 是异步的并返回 `Promise<World>`（动态导入 / 基于环境的设置）。

**关键导入：**
```typescript
import { getWorld } from "workflow/runtime";
import { hydrateResourceIO, observabilityRevivers, parseStepName, parseWorkflowName } from "workflow/observability";
```

**关键文档**（在 `node_modules/workflow/docs/` 中 grep 获取完整细节）：
- `api-reference/workflow-runtime/world/storage.mdx`：事件、运行、步骤和钩子（事件是事实来源；其他是物化视图）
- `api-reference/workflow-observability/`：Hydration 和名称解析

### World SDK 方法签名

⚠️ 分页是嵌套的：`{ pagination: { cursor } }`，不是直接的 `{ cursor }`。

```typescript
const world = await getWorld();

// Runs
const { data, cursor } = await world.runs.list({ pagination: { cursor }, resolveData: 'all' | 'none' });
const run = await world.runs.get(runId, { resolveData: 'all' | 'none' });
// Cancel via event creation (no cancel() method on runs)
await world.events.create(runId, { eventType: 'run_cancelled' });

// Steps: runId is top-level, NOT inside pagination
const { data, cursor } = await world.steps.list({ runId, pagination: { cursor }, resolveData: 'all' | 'none' });
const step = await world.steps.get(runId, stepId, { resolveData: 'all' | 'none' });

// Events
const { data, cursor } = await world.events.list({ runId, pagination: { cursor } });
await world.events.create(runId, { eventType: 'run_cancelled' });

// Hooks
const hook = await world.hooks.get(hookId);
const hook = await world.hooks.getByToken(token);

// Streams (methods on world.streams)
await world.streams.write(runId, name, chunk);
await world.streams.writeMulti?.(runId, name, chunks);
const readable = await world.streams.get(runId, name, startIndex);
await world.streams.close(runId, name);
const streamNames = await world.streams.list(runId);
const chunks = await world.streams.getChunks(runId, name, { limit, cursor });
const info = await world.streams.getInfo(runId, name);

// Queue (methods live directly on world as internal SDK infrastructure)
await world.queue(queueName, payload, opts);
const deploymentId = await world.getDeploymentId();
```

### `resolveData` 参数

控制输入/输出数据是否**包含**在响应中。接受 `'all'`（默认）或 `'none'`。

**重要**：即使使用 `'all'`，数据仍然是 devalue 序列化的。你必须调用 `hydrateResourceIO()` 来获得可用的 JS 值。

- **使用 `'none'`** 用于状态轮询、进度仪表板、运行列表
- **使用 `'all'`**（或省略）当你需要检查实际步骤 I/O 数据时，然后**始终 hydrate**

```typescript
// Lightweight status check with no I/O loaded
const run = await world.runs.get(runId, { resolveData: 'none' });
console.log(run.status); // 'running' | 'completed' | 'failed' | 'cancelled'

// Full inspection: resolveData includes data, hydrateResourceIO deserializes it
const step = await world.steps.get(runId, stepId); // defaults to 'all'
const hydrated = hydrateResourceIO(step, observabilityRevivers);
```

> **常见错误**：在 `resolveData: 'all'` 之后检查 `step.input !== undefined` 并假定
> 数据已可使用。数据存在但已序列化，因此始终先 hydrate。

### 数据 hydration（devalue 格式）

步骤 I/O 通过 [devalue](https://github.com/Rich-Harris/devalue) 序列化，带有 4 字节格式前缀（`devl`）。没有 hydration 时，`input`/`output` 是带数字键的类 Uint8Array 对象：
`{"0":100,"1":101,"2":118,"3":108,...}` 包含的值没有 hydration 就无法使用。

**使用 I/O 数据之前始终 hydrate：**

```typescript
import { hydrateResourceIO, observabilityRevivers } from "workflow/observability";

const { data: steps } = await world.steps.list({ runId, resolveData: 'all' });
const hydrated = steps.map(s => hydrateResourceIO(s, observabilityRevivers));
// hydrated[0].input → [123, 2] (actual function arguments)
// hydrated[0].output → 125 (actual return value)
```

`hydrateResourceIO` 对 `Step` 和 `WorkflowRun` 对象都有效。对于加密工作流，使用 `getEncryptionKeyForRun()` + `hydrateResourceIOWithKey()`。

### 名称解析

`parseWorkflowName()`、`parseStepName()` 和 `parseClassName()` 返回 `{ shortName: string, moduleSpecifier: string } | null`。始终使用可选链：

```typescript
const parsed = parseWorkflowName("workflow//./src/workflows/order//processOrder");
// parsed?.shortName → "processOrder"
// parsed?.moduleSpecifier → "./src/workflows/order"
// ⚠️ Returns null if format doesn't match
```

### 事件类型

事件是仅追加的事实来源。Runs/Steps/Hooks 是物化视图。

| 类别 | 类型 |
|----------|-------|
| Run | `run_created`、`run_started`、`run_completed`、`run_failed`、`run_cancelled` |
| Step | `step_created`、`step_started`、`step_completed`、`step_failed`、`step_retrying` |
| Hook | `hook_created`、`hook_received`、`hook_disposed`、`hook_conflict` |
| Wait | `wait_created`、`wait_completed` |

## 错误处理模式

针对不同失败模式的三种错误策略：

| 错误类型 | 何时使用 | 行为 |
|------------|----------|----------|
| `FatalError` | 永久失败（错误输入、认证被拒） | 立即终止工作流，不重试 |
| `RetryableError` | 瞬时失败（限速、超时） | 带可选 `retryAfter` 延迟重试 |
| `Promise.allSettled` | 混合关键性的并行步骤 | 即使某些步骤失败也继续 |

```typescript
import { FatalError, RetryableError } from "workflow";

// Permanent failure, so the workflow terminates
throw new FatalError("Invalid input: missing required field");

// Transient failure, so it will retry
throw new RetryableError("API rate limited", { retryAfter: "5m" });

// Mixed criticality parallel execution
const results = await Promise.allSettled([
  criticalStep(data),    // Must succeed
  optionalStep(data),    // OK to fail
  enrichmentStep(data),  // OK to fail
]);
const [critical, optional, enrichment] = results;
if (critical.status === "rejected") throw new FatalError(critical.reason);
```
