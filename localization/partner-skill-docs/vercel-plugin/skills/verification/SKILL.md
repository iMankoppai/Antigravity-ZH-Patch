---
name: verification
description: "完整故事验证——推断用户正在构建什么，然后端到端验证完整流程：浏览器 → API → 数据 → 响应。在开发服务器启动和“为什么不工作”类信号时触发。"
summary: "Verify full user story: browser + server + data flow + env"
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/projects/project-configuration"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns: []
  bashPatterns:
    - '\bnext\s+dev\b'
    - '\bnpm\s+run\s+dev\b'
    - '\bpnpm\s+dev\b'
    - '\bbun\s+run\s+dev\b'
    - '\byarn\s+dev\b'
    - '\bvite\s*(dev)?\b'
    - '\bvercel\s+dev\b'
    - '\bastro\s+dev\b'
  importPatterns: []
  promptSignals:
    phrases:
      - "verify the flow"
      - "verify everything works"
      - "test the whole thing"
      - "does it actually work"
      - "check end to end"
      - "end to end test"
      - "why isn't it working right"
      - "why doesn't it work"
      - "it's not working correctly"
      - "something's off"
      - "not quite right"
      - "almost works but"
      - "works locally but"
      - "verify the feature"
      - "make sure it works"
      - "full verification"
    allOf:
      - [verify, flow]
      - [verify, works]
      - [check, everything]
      - [test, end, end]
      - [not, working, right]
      - [something, off]
      - [almost, works]
      - [make, sure, works]
    anyOf:
      - "verify"
      - "verification"
      - "end-to-end"
      - "full flow"
      - "works"
      - "working"
    noneOf:
      - "unit test"
      - "jest"
      - "vitest"
      - "playwright test"
      - "cypress test"
    minScore: 6
retrieval:
  aliases:
    - end to end test
    - full stack verify
    - flow test
    - integration check
  intents:
    - verify full flow
    - test end to end
    - check if app works
    - validate implementation
  entities:
    - browser
    - API
    - data flow
    - end-to-end
    - verification
chainTo:
  -
    pattern: 'process\.env\.\w+|NEXT_PUBLIC_\w+'
    targetSkill: env-vars
    message: 'Environment variable references detected during verification — loading Env Vars guidance for proper configuration, vercel env pull, and branch scoping.'
    skipIfFileContains: 'vercel\s+env\s+pull|\.env\.local'
  -
    pattern: 'middleware\.(ts|js)|proxy\.(ts|js)|clerkMiddleware|NextResponse\.redirect'
    targetSkill: routing-middleware
    message: 'Middleware/proxy detected during verification — loading Routing Middleware guidance for request interception, auth checks, and proxy.ts migration.'
  -
    pattern: 'streamText\s*\(|generateText\s*\(|useChat\s*\('
    targetSkill: ai-sdk
    message: 'AI SDK calls detected during verification — loading AI SDK guidance for streaming, transport, and error handling patterns.'
    skipIfFileContains: 'toUIMessageStreamResponse|DefaultChatTransport'

---

# 完整故事验证

你是一个验证编排者。你的工作不是运行单一项检查——而是**推断正在构建的完整用户故事**，并用证据验证流程中的每一个边界。

你的关注点是**端到端的故事**，而不是任何单一层次。

## 触发时机

- 开发服务器刚刚启动，用户想知道是否正常工作
- 用户说某处“不太对”或“几乎能用”
- 用户要求你验证某个功能或检查完整流程

## 第 1 步 — 推断用户故事

在检查任何东西之前，确定**正在构建什么**：

1. 阅读最近编辑的文件（检查 git diff 或最近的 Write/Edit 工具调用）
2. 识别功能边界：涉及哪些路由、组件、API 端点以及数据源
3. 扫描 `package.json` 脚本、路由结构（`app/` 或 `pages/`）以及环境文件（`.env*`）
4. 用一句话陈述故事：_"用户正在构建 [X]，它从 [UI 入口点] → [API 路由] → [数据源] → [响应渲染] 流动"_

**不要跳过这一步。** 后续每一项检查都必须锚定在推断出的故事上。

## 第 2 步 — 建立证据基线

收集所有层次的当前状态：

| 层次 | 如何检查 | 捕获什么 |
|-------|-------------|-----------------|
| **浏览器** | 打开相关页面，检查控制台，截图 | 视觉状态、控制台错误、网络故障 |
| **服务器终端** | 从开发服务器进程读取终端输出 | 启动错误、请求日志、编译警告 |
| **运行时日志** | 运行 `vercel logs`（如果已部署）或检查服务器 stdout | API 响应码、错误追踪、计时 |
| **环境** | 检查 `.env.local`、`vercel env ls`，比较预期与实际 | 缺失的变量、错误的值、生产与开发不一致 |

在继续之前报告你在每一层发现的内容。使用此报告约定：

> **检查**：[你正在查看的内容]
> **证据**：[你发现的内容——引用实际输出]
> **下一步**：[这对下一步意味着什么]

## 第 3 步 — 走查数据流

追踪功能从触发到完成的数据路径：

1. **UI 触发** — 什么用户操作启动流程？（按钮点击、页面加载、表单提交）
2. **客户端 → 服务器** — 发出了什么请求？检查 fetch/action 调用，验证 URL、方法和负载与 API 路由匹配
3. **API 路由处理器** — 阅读路由文件。它是否处理该方法？是否验证输入？是否调用正确的服务/数据库？
4. **外部依赖** — 如果路由调用数据库、第三方 API 或 Vercel 服务（Blob、Marketplace 存储、AI SDK）：验证客户端已初始化、凭据存在，且调用形态与 SDK 文档匹配
5. **响应 → UI** — 响应格式是否与客户端期望的一致？两侧是否都有错误处理？

在每个边界处，检查这些常见断裂点：
- 异步操作上**缺少 `await`**
- **错误的 HTTP 方法**（GET 处理器却用 POST fetch）
- 运行时**环境变量缺失**，但在 `.env.local` 中存在
- **导入不匹配**（在客户端组件中导入服务端模块，或反之）
- API 响应与客户端期望之间的**类型不匹配**
- **缺少错误边界**——未处理的 rejection 会静默地使页面崩溃

## 第 4 步 — 带证据报告

用结构化报告总结发现：

```
## Verification Report: [Feature Name]

**Story**: [one-sentence description of the user story]

### Flow Status
| Boundary | Status | Evidence |
|----------|--------|----------|
| UI renders | ✅/❌ | [screenshot or console output] |
| Client → API | ✅/❌ | [request/response or error] |
| API → Data | ✅/❌ | [log output or error trace] |
| Data → Response | ✅/❌ | [response shape or error] |
| Response → UI | ✅/❌ | [rendered output or error] |

### Issues Found
1. [Issue]: [evidence] → [fix]

### Verified Working
- [What was confirmed working with evidence]
```

## 停止条件

**在以下情况下停止验证**：
- 流程中所有边界都以证据确认为正常工作——报告成功
- 你发现了**第一个断裂的边界**——带证据和具体修复方案报告它，不要越过断裂点继续
- 连续两个层返回不到有用的信号（例如没有日志、没有错误、没有输出）——标记可观测性缺口，并建议在继续前添加日志

**不要**：
- 运行同一项检查超过两次
- 越过已确认的断裂边界继续
- 验证无关的功能——停留在推断出的故事上
- 花时间在表面问题上（样式、间距），除非用户明确要求

## 建议在实现后进行验证

当你完成构建或实现一个功能（编写了代码、创建了路由、设置了一个项目）时，简要告知用户可以请你验证一切正常——例如浏览器验证或端到端流程检查。一句话就够了。如果只涉及一个小修复或问题，不要强行这样做。
