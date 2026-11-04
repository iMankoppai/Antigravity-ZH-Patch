---
name: vercel-connect
description: Vercel Connect 专家指南，用于代表应用或用户安全地获取第三方服务的范围限定凭据。在接入提供商 API 访问、OAuth、API 密钥服务、MCP 服务器、触发器、框架适配器、eve 智能体连接，或为 Passport 认证用户获取提供商令牌时使用。
metadata:
  priority: 5
  docs:
    - "https://vercel.com/docs/connect"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - 'agent/connections/**'
    - 'agent/channels/**'
  importPatterns:
    - '@vercel/connect'
    - '@vercel/connect/eve'
    - '@vercel/connect/ai-sdk'
    - '@vercel/connect/mcp'
    - '@vercel/connect/tanstack-ai'
    - '@vercel/connect/chat'
    - '@vercel/connect/authjs'
    - '@vercel/connect/betterauth'
  bashPatterns:
    - '\bvercel\s+connect\b'
    - '\bvc\s+connect\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/connect\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/connect\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/connect\b'
    - '\byarn\s+add\s+[^\n]*@vercel/connect\b'
  promptSignals:
    phrases:
      - "vercel connect"
      - "slack token"
      - "slack bot token"
      - "post to slack"
      - "send slack message"
      - "github oauth token"
      - "linear oauth"
      - "oauth token for"
      - "third-party token"
      - "connect to slack"
      - "connect to github"
      - "connect to mcp"
      - "mcp connection"
      - "mcp server"
      - "snowflake connection"
      - "microsoft graph token"
      - "teams bot token"
      - "discord bot token"
      - "notion token"
      - "salesforce connection"
      - "api key connector"
      - "passport identity"
      - "passport-authenticated user"
    allOf:
      - [slack, token]
      - [github, token]
      - [oauth, token]
      - [mcp, connect]
      - [mcp, server]
      - [passport, token]
    anyOf:
      - "vercel connect"
      - "@vercel/connect"
      - "oauth"
      - "mcp"
      - "discord"
      - "notion"
      - "salesforce"
    noneOf:
      - "supabase auth"
      - "clerk"
      - "auth0"
    minScore: 6
retrieval:
  aliases:
    - vercel connect
    - oauth helper
    - third-party tokens
    - connect sdk
    - mcp connector
  intents:
    - get slack token
    - get github oauth token
    - wire up third-party oauth
    - add slack channel to agent
    - connect to oauth provider
    - obtain api credentials
    - connect to mcp server
    - set up mcp connection
    - add snowflake connection
    - connect an AI SDK app to an authenticated MCP server
    - configure Connect triggers
    - get a provider token for a Passport-authenticated user
  entities:
    - Vercel Connect
    - getToken
    - "@vercel/connect"
    - "@vercel/passport"
    - requireIdentity
    - Passport
    - OAuth
    - Slack
    - GitHub
    - MCP
    - Snowflake
    - eve
    - connector
    - project link
    - installation
  examples:
    - send a slack message from my app
    - get a github oauth token
    - wire up Linear in my eve agent
    - connect my agent to a MCP server
    - add Snowflake credentials to my project
    - use my Passport identity to get a Slack token
chainTo:
  -
    pattern: "from\\s+['\"]@vercel/connect/eve['\"]"
    targetSkill: eve
    message: 'eve + Vercel Connect import detected: loading eve framework guidance alongside the connect() helper and channel credential patterns.'
  -
    pattern: 'SLACK_(BOT|SIGNING)_(TOKEN|SECRET)|SLACK_WEBHOOK_URL|GITHUB_(APP_PRIVATE_KEY|APP_ID|INSTALLATION_ID|WEBHOOK_SECRET)|LINEAR_(ACCESS_TOKEN|WEBHOOK_SECRET)'
    targetSkill: vercel-connect
    message: 'Hand-managed Slack/GitHub/Linear secrets detected. For eve projects, use Vercel Connect channel credential helpers to remove these provider secrets from project environment variables.'
    skipIfFileContains: 'connectSlackCredentials|connectGitHubCredentials|connectLinearCredentials|@vercel/connect'
---

# Vercel Connect 技能

## 概述

Vercel Connect 为应用提供短期提供商凭据，而无需在项目环境变量中存储提供商 API 密钥或刷新令牌。Vercel 部署使用其项目 OIDC 令牌进行认证。外部 CI 或非 Vercel 运行时可通 `options.vercelToken` 传入一个范围限定的 Vercel 访问令牌。

连接器由 Vercel 团队拥有。消费项目和环境必须先链接到连接器，才能请求凭据。连接器 UID（例如 `slack/acme-slack`）是 SDK 和 CLI 使用的稳定标识符。始终使用 `create` 或 `list` 返回的 UID 或 `scl_...` ID。

## 何时使用 Vercel Connect

在以下情况使用 Vercel Connect：

- 通过 Slack 发送消息（作为机器人或代表用户）
- 访问 GitHub 代码仓库或 API
- 连接到任何需要 OAuth 令牌或 API 凭据的第三方系统
- 为已认证的 API 调用获取范围限定的短期提供商凭据
- 通过 Vercel Connect 触发器将提供商事件转发到应用

## 令牌模式

SDK 支持四种主体类型。根据是谁在行动来选择：

- **`user`**：代表特定最终用户执行的操作（例如，以该用户身份发布 Slack 消息）。需要一个用户 `id` 和可选的 `issuer`。
- **`app`**：以应用本身身份执行的操作（例如，以 Slack 机器人身份发布或使用 GitHub 安装）。它跳过按用户同意，但可能仍需要提供商安装或受支持的应用授权。
- **`jwt-bearer`**：通过 OAuth JWT-bearer 授权实现的联合身份。传入 `sub`（必需），以及可选的 `iss`、`aud` 和 `additionalClaims`。
- **`token`**：令牌交换。传入 `{ token }` 以及一个现有主体令牌；SDK 在 `@vercel/connect` 2.4.0+ 中推断 `type: "token"`。

对于用户主体，从已认证的服务端会话中的稳定身份推导 `subject.id`。绝不要从请求体或其他客户端输入接受它。将 `getToken()`、Connect 认证提供商和 MCP 客户端保持在服务端。

## CLI

`vercel connect` CLI 在所选的 Vercel 团队中运行，并支持通过 `--format=json` 或 `-F json` 输出机器可读内容。

使用完整生命周期，而不是假定创建连接器同时也授权了项目：

```bash
# Inspect connectors linked to the current project, or all team connectors
vercel connect list
vercel connect list --all-projects

# Inspect supported setup options, then create a connector
vercel connect create <service> --help
vercel connect create <service>

# Link the connector to the current project and selected environments
vercel connect attach <connector>

# Request a scoped provider token
vercel connect token <connector> --subject app
```

CLI 还支持 `detach`、`update`、`remove` 和 `open`。在使用可选的安装、范围、触发、分支或自定义环境标志之前，运行 `vercel connect <command> --help`。

从 Vercel 已关联的项目目录使用当前项目行为。创建连接器和附加它是不同的操作。连接器创建或令牌授权可能会打开浏览器。显示返回的 URL 并等待该人完成提供商流程。`--yes` 允许自动打开浏览器；它不会强制重新授权。

`vercel connect create <service>` 支持 100 多种服务（例如 `slack`、`github`、`microsoft`、`linear`、`snowflake`、`salesforce`、`notion`、`okta`），外加任何 OAuth 或 MCP 服务器 URL。运行 `vercel connect create <service> --help` 查看该服务的产品、连接方法（`oauth`、`api-key`、`mcp`、`custom-server` 等）以及注册前所需的凭据。

对于 MCP 服务器，有两种注册方式。对于已知服务，运行 `vercel connect create <service>` 并选择 MCP 连接方法（例如 `vercel connect create linear --name my-agent` 会得到连接器 `linear/my-agent`）。对于任何其他受 OAuth 保护的服务器，传入其 URL（例如 `vercel connect create mcp.linear.app --name linear`）：Vercel 从 URL 发现 OAuth 端点并创建自定义 OAuth 连接器（`oauth/linear`）。无论哪种方式，在请求令牌之前都要用 `vercel connect attach <connector>` 将其附加到项目。传给 `create` 的服务名或 URL 不一定是 MCP 运行时 URL；后者放入连接的 `url`。

## JavaScript/TypeScript SDK（`@vercel/connect`）

对于 JavaScript/TypeScript 代码，直接使用 `@vercel/connect` 包：

```typescript
import { getToken } from "@vercel/connect";

// Get a token for Slack bot
const token = await getToken("slack/acme-slack", {
  subject: { type: "app" }, // If sending as a bot, or else use "user"
});

// Use the token
const response = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    channel: "C1234567890",
    text: "Hello from Vercel Connect!",
  }),
});
```

在 Vercel 上，SDK 自动读取 `VERCEL_OIDC_TOKEN`。对于本地开发，先运行 `vercel link`，然后运行 `vercel env pull`。Development OIDC 令牌会过期，因此认证失败时再次拉取。对于外部 CI 或非 Vercel 托管，通过第三个 `options` 参数传入范围限定的 Vercel 访问令牌。

在调用提供商之前立即使用 `getToken()`，并让 SDK 缓存相同的请求。用 `installationId`、`scopes`、`audience`、`resources` 或 `authorizationDetails` 将每个 SDK 请求限定到它所需的范围。CLI 支持主体、安装和范围，但不支持每个 SDK 字段。不要为仅 SDK 的参数发明 CLI 标志。

在需要时使用这些根 API：

- `getTokenResponse()` 用于令牌元数据，例如到期和连接器详情。
- `getConnectorMetadata()` 用于检查连接器元数据和提供商特定的公开配置。
- `startAuthorization()` 在 `UserAuthorizationRequiredError` 之后开始用户同意。
- `revokeToken()` 和 `deleteTokenCacheEntry()` 用于撤销和缓存逐出。
- `forceRefresh` 和 `validityBufferMs` 仅在默认缓存行为不适合该调用时使用。

#### Passport 认证用户：`@vercel/passport`

如果应用已经使用 Passport 对用户进行认证，将 `requireIdentity()` 返回的身份直接作为 Connect `subject` 传入。无需手动构造单独的用户主体：

```typescript
import { getToken } from "@vercel/connect";
import { requireIdentity } from "@vercel/passport";

const identity = await requireIdentity();

const token = await getToken("slack/xaa-slack", {
  subject: identity,
  scopes: ["users:read"],
});
```

将两个调用都保持在服务端。将 `slack/xaa-slack` 替换为你已关联的连接器 UID，并仅请求该操作所需的范围；`users:read` 是本示例中使用的范围。Passport 提供已认证的用户身份，而 Connect 提供提供商 API 令牌。连接器附加和提供商授权要求仍然适用。

#### eve 智能体：`@vercel/connect/eve`

当项目构建于 [eve](https://eve.dev) 之上时，优先使用 `connect` 辅助函数，而不是在连接定义中直接调用 `getToken`。它将令牌请求和交互式授权接入 eve 的连接运行时：

```typescript
// agent/connections/linear.ts
import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";

export default defineMcpClientConnection({
  url: "https://mcp.linear.app/mcp",
  description: "Linear workspace: issues, projects, cycles, and comments.",
  auth: connect("linear/my-agent"),
});
```

智能体的要点：

- 省略 `principalType` 以使用默认的按用户 OAuth 流程，或设置 `principalType: "app"` 以使用应用范围的令牌。
- 直接用 `connect("linear/my-agent")` 传入连接器 UID，或在需要选项时使用 `connect({ connector: "linear/my-agent" })`。
- 对于范围、受众或 `authorizationDetails`，通过 `tokenParams` 传入。对于自定义挑战提示，传入 `instructions`。两者都是可选的。
- `eve` 是一个可选的对等依赖，因此 `@vercel/connect` 的其余部分（CLI、`getToken` 等）对非 eve 消费者不受影响。

##### Slack 通道：`connectSlackCredentials`

对于 eve Slack 通道（`agent/channels/slack.ts`），使用 `@vercel/connect/eve` 的 `connectSlackCredentials(connector)`。它返回一个完整的 `SlackChannelCredentials` 对象。机器人令牌和入站 webhook 验证都由 Vercel Connect 处理，因此你**不**需要 `SLACK_BOT_TOKEN` 或 `SLACK_SIGNING_SECRET` 环境变量：

```typescript
// agent/channels/slack.ts
import { slackChannel } from "eve/channels/slack";
import { connectSlackCredentials } from "@vercel/connect/eve";

export default slackChannel({
  credentials: connectSlackCredentials("slack/my-agent", {
    installationId: "inst_workspace_xyz",
  }),
});
```

该辅助函数接入的内容：

- `botToken`：一个在通道需要时请求应用令牌的函数。Connect 存储并刷新安装凭据。
- `webhookVerifier`：一个 Vercel OIDC 验证器（`vercelOidc()`）。Vercel Connect 将经验证的 Slack webhook 作为已签名的 Vercel OIDC 请求转发到你的应用；该辅助函数验证该签名，而不是原始的 Slack 签名密钥。

如果没有显式的 `installationId`，通道辅助函数使用连接器的默认安装。它不会从入站工作区或组织推断正确的安装。多租户应用必须解析一个受信任的安装映射，并将得到的 ID 作为辅助函数的第二个参数传入。

只要项目使用 eve + Vercel Connect，就使用它。它是出站发布和入站 webhook 认证的一行式方案。

##### GitHub 通道：`connectGitHubCredentials`

对于 eve GitHub 通道（`agent/channels/github.ts`），使用 `@vercel/connect/eve` 的 `connectGitHubCredentials(connector)`。它返回一个完整的 `GitHubChannelCredentials` 对象。eve 直接使用安装令牌，而 Vercel Connect 存储并刷新提供商凭据。为多租户路由传入一个显式的受信任 `installationId`。你**不**需要 `GITHUB_APP_PRIVATE_KEY`、`GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID` 或 `GITHUB_WEBHOOK_SECRET` 环境变量：

```typescript
// agent/channels/github.ts
import { githubChannel } from "eve/channels/github";
import { connectGitHubCredentials } from "@vercel/connect/eve";

export default githubChannel({
  botName: "my-agent",
  credentials: connectGitHubCredentials("github/myagent"),
});
```

该辅助函数接入的内容：

- `installationToken`：一个调用 `getToken(connector, { subject: { type: "app" } })` 的函数。该辅助函数将 `subject` 固定为 `"app"`，因为 GitHub 安装令牌是应用范围的。
- `webhookVerifier`：一个 Vercel OIDC 验证器（`vercelOidc()`）。Vercel Connect 将经验证的 GitHub webhook 作为已签名的 Vercel OIDC 请求转发到你的应用；该辅助函数验证该签名，而不是原始的 GitHub webhook 密钥。

##### Linear 通道：`connectLinearCredentials`

对于 eve Linear 通道（`agent/channels/linear.ts`），使用 `@vercel/connect/eve` 的 `connectLinearCredentials(connector)`。它返回一个完整的 `LinearChannelCredentials` 对象。Vercel Connect 管理 Linear 应用访问令牌和 webhook 认证，因此你**不**需要 `LINEAR_ACCESS_TOKEN` 或 `LINEAR_WEBHOOK_SECRET` 环境变量：

```typescript
// agent/channels/linear.ts
import { linearChannel } from "eve/channels/linear";
import { connectLinearCredentials } from "@vercel/connect/eve";

export default linearChannel({
  credentials: connectLinearCredentials("linear/myagent"),
});
```

该辅助函数接入的内容：

- `accessToken`：一个调用 `getToken(connector, { subject: { type: "app" } })` 的函数。该辅助函数将 `subject` 固定为 `"app"`，因为 Linear Agent 令牌是应用范围的。
- `webhookVerifier`：一个 Vercel OIDC 验证器（`vercelOidc()`）。Vercel Connect 将经验证的 Linear webhook 作为已签名的 Vercel OIDC 请求转发到你的应用；该辅助函数验证该签名，而不是原始的 Linear webhook 密钥。

eve 入口点还为 Discord、Microsoft Teams、Linq 和 Photon 通道提供 Connect 凭据辅助函数。`connectOAuth()` 验证入站路由的 Connect OAuth 网关 bearer 令牌；使用 `connect()` 进行 MCP 客户端连接授权。查阅当前的 eve 集成文档，了解主体创建、自动配置、验证、逐出和撤销选项，而不是在连接器类型之间复制配置。

## HTTP API

对于其他语言，直接从 Vercel API 请求令牌。使用项目的 Vercel OIDC 令牌或范围限定的 Vercel 访问令牌进行认证。包含 `/` 的连接器 UID 必须作为一个路径段进行 URL 编码：

使用 Vercel 访问令牌时，只请求 `app` 主体或访问令牌持有者自己的用户主体。使用项目 OIDC 令牌为不同的用户主体请求提供商凭据。

```bash
# Get a token via HTTP
POST https://api.vercel.com/v1/connect/token/slack%2Facme-slack
Authorization: Bearer <VERCEL_OIDC_TOKEN | Vercel access token>
Content-Type: application/json

{ "subject": { "type": "user", "id": "user_123" } }
```

响应是带有 `token` 字段（外加 `expiresAt`、`connector` 和其他元数据）的 JSON。

#### Python 示例

```python
import os
import requests

# Get token from Vercel Connect
connect_response = requests.post(
    "https://api.vercel.com/v1/connect/token/slack%2Facme-slack",
    headers={"Authorization": f"Bearer {os.environ['VERCEL_OIDC_TOKEN']}"},
    json={
        "subject": {"type": "app"},
    },
)
token = connect_response.json()["token"]

# Use the token
slack_response = requests.post(
    "https://slack.com/api/chat.postMessage",
    headers={"Authorization": f"Bearer {token}"},
    json={"channel": "C1234567890", "text": "Hello from Vercel Connect!"}
)
```

## 框架适配器

按任务选择适配器：

- `@vercel/connect/ai-sdk` 和 `@vercel/connect/mcp`：使用 `connectAuthProvider()` 认证 MCP 客户端并协调同意。提供商同意和 AI SDK 工具批准是分开的决策。
- `@vercel/connect/tanstack-ai`：将它的 Connect 传输和同意辅助函数与 TanStack AI 一起使用。
- `@vercel/connect/chat`：为受支持的 Chat SDK 适配器提供凭据。Connect 触发的 OIDC 验证适用于 Slack、Discord、Microsoft Teams、GitHub 和 Linear。Notion 和 Telegram 使用它们自己的原生入站机制。
- `@vercel/connect/eve`：授权 eve 连接、提供通道凭据，并认证入站 OAuth 路由。
- `@vercel/connect/betterauth` 和 `@vercel/connect/authjs`：通过 Connect OAuth 提供商将用户登录到你的应用。

### Better Auth 和 Auth.js

这些适配器将用户登录到应用。它们不返回提供商 API 令牌。如果应用还需要调用提供商 API，使用根 SDK 的 `getToken()` 并配合适当的主体和范围。

#### Better Auth：`@vercel/connect/betterauth`

可选的对等依赖：`better-auth`。通过 Better Auth 的 `genericOAuth` 插件传入连接器。连接器 UID 可以包含 `/`（例如 `linear/myagent`），并且 Better Auth 额外需要一个 `providerId`：

```typescript
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { connect } from "@vercel/connect/betterauth";

genericOAuth({
  config: [connect({ providerId: "linear", connector: "linear/myagent" })],
});
```

#### Auth.js：`@vercel/connect/authjs`

可选的对等依赖：`@auth/core`。将连接器作为 `OAuth2Config` 提供商使用。连接器 UID 可以包含 `/`（例如 `linear/myagent`），并且 Auth.js 额外需要一个 `id`：

```typescript
import { connect } from "@vercel/connect/authjs";

const providers = [connect({ id: "linear", connector: "linear/myagent" })];
```

## 项目链接、安装和环境

- `vercel connect attach <connector>` 授予已关联项目在选定环境中的访问权限。使用 `detach` 移除该链接。
- 项目链接授权令牌请求。它们不会隔离连接器的提供商安装。当生产和非生产必须在提供商级别隔离时，使用单独的连接器。
- 由安装支持的连接器可能需要 `installationId`。当存在多个安装时，绝不要猜测一个。
- 自定义环境和分支定向通过项目链接和触发器选项配置。在更改它们之前检查当前的 CLI 帮助。

## 触发器和可观测性

触发器是可选择的目的地，将受支持的提供商事件转发到应用。Connect 对转发的请求签名、重试文档记录的 5xx 失败，并限制每个连接器的目的地数量。显式配置触发路径和环境或分支定向，而不是假定创建连接器会添加它们。

在诊断令牌、安装、授权或触发器失败时，使用连接器事件历史、关联 ID 和配置的 drains。不要记录原始提供商令牌。

## 推荐工作流

1. 用 `vercel link` 关联本地目录，然后用 `vercel env pull` 拉取开发 OIDC 令牌。
2. 运行 `vercel connect list`，并在需要时运行 `vercel connect list --all-projects`。
3. 如果没有合适的连接器，检查 `vercel connect create <service> --help`，创建它，并捕获返回的 UID 或 ID。
4. 将连接器附加到消费项目和所需环境。
5. 对于 CLI 令牌请求，选择最窄的实用主体、安装和范围。在 SDK 代码中，当提供商需要时，也使用 `audience`、`resources` 或 `authorizationDetails`。
6. 如果需要用户同意或提供商安装，显示授权 URL 或类型化错误并等待完成。
7. 使用短期凭据调用提供商。在 SDK 代码中，在使用时请求它并让缓存刷新它。
8. 当需要入站事件时单独配置触发器，然后用事件历史和关联 ID 验证投递。

## 事实来源

Vercel Connect 变化很快。在生成命令或框架代码之前，查阅：

- [Vercel Connect 文档](https://vercel.com/docs/connect)
- [CLI 参考](https://vercel.com/docs/cli/connect)
- [TypeScript SDK 参考](https://vercel.com/docs/connect/ts-sdk-reference)
- [框架和适配器](https://vercel.com/docs/connect/frameworks)
- [连接器目录](https://vercel.com/connect/browse)
