---
name: vercel-agent
description: Vercel Agent 指南——仪表板与 Slack 聊天、代码审查、生产调查、经批准的操作以及产品安装。在配置或使用 Vercel 的 AI 助手时使用。
metadata:
  priority: 4
  docs:
    - "https://vercel.com/docs"
    - "https://vercel.com/docs/agent"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns: 
    - '.github/workflows/vercel*.yml'
    - '.github/workflows/vercel*.yaml'
    - '.github/workflows/deploy*.yml'
    - '.github/workflows/deploy*.yaml'
    - '.github/workflows/preview*.yml'
    - '.github/workflows/preview*.yaml'
  bashPatterns: 
    - '\bvercel\s+agent\b'
retrieval:
  aliases:
    - ai code review
    - production debugger
    - dashboard chat
    - slack agent
    - vercel ai tools
    - pr analyzer
  intents:
    - set up vercel agent
    - automate code review
    - investigate incident
    - configure ai tools
  entities:
    - Vercel Agent
    - code review
    - incident investigation
    - approved actions
chainTo:
  -
    pattern: 'uses:\s*vercel/|vercel-action|VERCEL_TOKEN.*github'
    targetSkill: deployments-cicd
    message: 'GitHub Actions with Vercel detected — loading CI/CD guidance for deployment workflows, preview URLs, and production promotions.'
---

# Vercel Agent

你是 Vercel Agent 专家——Vercel 平台内置的 AI 驱动开发工具。

## 它是什么

Vercel Agent 是内置于 Vercel 的 AI 助手。它利用项目、部署、日志、指标、配置、用量和代码仓库上下文来回答问题、调查生产问题、审查代码、安装受支持的产品，并提出经批准的操作。

仪表板聊天、Slack 聊天、Investigations 和 Code Review 面向 Pro 和 Enterprise 团队处于公开测试阶段。

## 能力

### 聊天

- 从 Vercel 仪表板中的 **Agent** 按钮开始对话。
- 连接 Slack，从受支持的对话中提问和调查问题。
- Vercel Agent 默认是只读的。当任务需要写入时，它会提出一份限定范围的计划并等待批准。
- 经批准的工作可以直接进行受支持的更改，或根据任务打开一个拉取请求。

### 代码审查
- 在推送时或通过 PR 评论中的 `@vercel` 提及触发的自动 PR 分析
- 多步推理：识别安全漏洞、逻辑错误、性能问题
- 在 **Vercel Sandbox**（安全执行）中生成并验证补丁
- 支持内联建议和完整补丁提案

### 调查
- 使用项目日志和指标分析异常警报、失败的部署、运行时错误、成本问题和性能问题。
- Observability Plus 每个计费周期包含 10 次调查。额外的调查按 token 用量计费。

### 安装
- 自动安装 Web Analytics 和 Speed Insights SDK
- 分析代码仓库结构、安装依赖、编写集成代码
- 创建包含更改的 PR
- **免费**（不消耗额度）

## 定价

- 付费的 Vercel Agent 工作按底层提供商的推理费率计费，不收取加价，另加每百万输入、输出和缓存 token 收取 0.25 美元的 Vercel Token Rate。
- 在公开测试期间，聊天和 Slack 包含有限数量的简单请求。
- Observability Plus 每个计费周期包含 10 次调查。
- 安装不收取 Agent 费用，但已安装的产品保留其正常的用量费用。

## 配置

在 Vercel 仪表板右上角选择 **Agent** 以开始对话，或配置聊天、Slack、代码审查、调查和安装。Vercel Agent 是一项平台服务，不需要 npm 包。

## 何时使用

- 对每个 PR 进行自动化的安全和质量检查
- 当异常警报触发时进行根因分析
- 从仪表板或 Slack 提问并执行经批准的操作操作
- 为分析/监控快速安装 SDK

## 参考资料

- 📖 文档：https://vercel.com/docs/agent
- 📖 定价：https://vercel.com/docs/agent/pricing
- 📖 权限：https://vercel.com/docs/agent/chat/permissions
