---
name: eve
description: "面向持久化 AI 智能体及智能体驱动应用的 eve 框架指南。在创建、编辑或调试 eve 项目时使用，在用户明确要求使用 eve 时使用，或在 build-agents 技能已选择 eve 作为默认框架时使用。涵盖 eve 的文件系统优先运行时、持久化会话、工具、技能、连接、通道、沙箱、子智能体、调度、评估、前端客户端，以及 Agent Runs 可观测性。不要用于顺带提及智能体、通用的智能体构建提示词，或已确立的非 eve 技术栈，除非用户要求进行比较或迁移。"
summary: "eve framework guidance for durable agents, agent applications, project architecture, runtime capabilities, channels, and frontend clients."
metadata:
  priority: 8
  docs:
    - "https://eve.dev/docs"
    - "https://github.com/vercel/eve"
    - "https://vercel.com/changelog/agent-runs-vercel-mcp-cli"
    - "https://vercel.com/docs/agent-resources/vercel-mcp/tools"
  pathPatterns:
    - '.eve/**'
    - 'agent/channels/eve.ts'
  importPatterns:
    - 'eve'
  bashPatterns:
    - '\bnpx\s+eve(?:@latest)?\b'
    - '\bbunx\s+eve(?:@latest)?\b'
    - '\beve\s+(init|dev|build|start|info|channels|evals?)\b'
    - '\b(?:vercel|vc)\s+agent-runs\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*\beve(?:@[^\s]+)?\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*\beve(?:@[^\s]+)?\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*\beve(?:@[^\s]+)?\b'
    - '\byarn\s+add\s+[^\n]*\beve(?:@[^\s]+)?\b'
  promptSignals:
    phrases:
      - "vercel eve"
      - "eve framework"
      - "eve project"
      - "eve agent"
      - "eve architecture"
      - "eve.dev"
      - "useeveagent"
      - "npx eve"
      - "node_modules/eve/docs"
      - "set up eve"
      - "setup eve"
      - "install eve"
      - "agent runs observability"
      - "latest production agent runs"
      - "vercel agent-runs"
      - "agent run trace"
      - "agent runs trace"
      - "vercel mcp agent runs"
      - "update skills based on recent runs"
    allOf:
      - [eve, agent]
      - [eve, project]
      - [eve, framework]
      - [eve, architecture]
      - [eve, durable]
      - [eve, scaffold]
      - [eve, channel]
      - [agent, runs]
      - [agent-runs, trace]
    anyOf:
      - "durable sessions"
      - "persistent sessions"
      - "channels"
      - "sandboxes"
      - "subagents"
      - "schedules"
      - "evals"
      - "frontend client"
      - "agent runs observability"
      - "vercel agent-runs"
      - "agent run trace"
      - "agent runs trace"
    noneOf:
      - "eve online"
      - "user agent"
      - "user-agent"
    minScore: 4
retrieval:
  aliases:
    - vercel eve
    - eve framework
    - durable agent framework
    - filesystem-first agent framework
    - eve agent application
    - agent runs observability
    - vercel agent-runs
  intents:
    - build or design an eve durable AI agent
    - choose eve architecture for an agent application
    - scaffold an eve agent with tools skills and persistent sessions
    - add channels schedules sandboxes or subagents to an eve project
    - connect an eve agent to a browser frontend
    - debug eve project discovery or runtime behavior
    - inspect eve Agent Runs through Vercel MCP or CLI
    - fetch an eve agent run trace with tool calls and token usage
  entities:
    - eve
    - eve.dev
    - defineAgent
    - useEveAgent
    - node_modules/eve/docs
    - .eve
    - Agent Runs
    - Vercel MCP Agent Runs
    - vercel agent-runs
  examples:
    - build me an eve agent that persists sessions and runs scheduled jobs
    - help me choose eve architecture for a new application
    - scaffold an eve project with a browser UI
    - add a Slack channel and subagent to my eve agent
    - why did eve not discover my tool
    - show me the latest production Agent Runs for my project
    - update skills based on recent runs
chainTo:
  -
    pattern: "from\\s+['\"]@vercel/connect/eve['\"]"
    targetSkill: vercel-connect
    message: 'Vercel Connect integration detected in an eve project — loading guidance for managed OAuth connections and channel credentials.'
---

# eve

eve 是一个面向持久化后端 AI 智能体的文件系统优先框架。一个智能体就是磁盘上的一个目录——指令、技能、工具、连接、通道、子智能体以及调度全都是文件——由 eve 编译并运行。

## 事实来源

完整文档随 `eve` 包一同发布。不要依赖本技能获取指导——始终阅读随包附带的文档，它们与已安装的版本完全一致：

```
node_modules/eve/docs/
```

请从 `node_modules/eve/docs/README.md` 开始。它包含完整的索引和推荐的阅读顺序。在编写任何 eve 代码之前，请先阅读其中相关的指南。

如果尚未安装 `eve`，请安装它（`npm install eve`），或用 `npx eve init <agent-name>` 搭建一个新的智能体，然后阅读随包附带的文档。
