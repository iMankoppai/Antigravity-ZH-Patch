---
name: netlify-mcp-servers
description: 在 Netlify 上构建、部署和保护 Model Context Protocol (MCP) 服务器。只要任务涉及创建 MCP 服务器、把应用或 API 作为 MCP 工具暴露给 AI 智能体、让 Claude / Cursor / Claude Code 调用自定义远程服务器，或向现有 Netlify 站点添加 MCP 工具，就使用本技能。涵盖 Netlify Function 上的 MCP SDK + Streamable HTTP 传输、认证（单一共享密钥 vs 配合 Netlify Identity 的按用户 API 密钥）、读/写安全、文件上传，以及连接客户端。即使用户只说"MCP"、"给智能体的工具服务器"或"让 AI 使用我的 API"，也要使用它。
---

# Netlify MCP Servers

一个 MCP 服务器暴露 **tools**（以及可选的 resources/prompts），供 AI 客户端——Claude Desktop、Claude Code、Cursor——调用。在 Netlify 上，远程 MCP 服务器就是**一个 Netlify Function**，通过 HTTP 讲 MCP 协议。本技能帮你得到一个可用、安全的服务器，并把客户端连接到它。

**"Netlify MCP" 指的是两件不同的事——确保你构建的是正确的那一个。**Netlify 发布了它*自己的*托管 MCP 服务器，让 AI 客户端代表你操作 **Netlify 平台**——通过你的 Netlify 账户创建项目、触发部署、管理环境变量和基础设施。那个不是你写的；你按照 Netlify 的 MCP 服务器文档让客户端指向 Netlify 的托管 MCP 服务器（关于针对你的站点运行智能体，见 **netlify-agent-runner** 技能）。本技能讲的是*另一件*事：构建**你自己的** MCP 服务器——一个把你的应用工具和数据暴露给智能体的 endpoint——托管在 Netlify Function 上。如果需求是"让我的智能体管理我的 Netlify 站点/部署/环境变量"，那是托管的 Netlify MCP 服务器，而不是你写的 function。

同一套设置有两种用法：

- **独立服务器**——只负责 MCP endpoint 的代码仓库（例如封装第三方 API）。
- **添加到现有应用**——在站点之外再加一个 function。让它的工具调用**你的 UI 和 REST 路由已经在用的同一服务/数据层**，这样逻辑不会重复。

## 构建之前

先决定一件事，因为它会决定 auth 代码的形态：

- **谁调用这个服务器？**只有你（个人/单用户服务器）→ 使用**单一共享密钥**。多个人、每个人以自己身份行事 → 使用由 Netlify Identity 支持的**按用户 API 密钥**。见 [authentication](references/authentication.md)。

如果不确定，从单一共享密钥开始——只需几行代码，之后可以再叠加按用户密钥。除非你另行说明，我会默认采用这种。

## 技术栈

使用官方 MCP SDK 及其 Web 标准的 Streamable HTTP 传输，在 Netlify Function 内以无状态方式运行。

```bash
npm install @modelcontextprotocol/sdk zod
```

Netlify Function 本身就会说 Web 平台语言——它接收 `Request` 并返回 `Response`。SDK 附带了一个恰好构建在这些原语之上的传输，`WebStandardStreamableHTTPServerTransport`（SDK 内部运行所用的同一个核心，也是 Cloudflare Workers / Deno / Bun 所用的）：你把 `Request` 交给它，然后返回它产生的 `Response`——无需适配器，无需固定版本。较旧的指南会用 Node 风格的 `StreamableHTTPServerTransport` 再加一个 `fetch-to-node` 桥来合成它期望的 Node `req`/`res` 对象；在 Netlify 上两者都不需要，跳过它们既更简单，也是这里验证过可用的做法。

还有一个与以上无关的注意事项：对于任何 `Accept` 请求头**同时**缺少 `application/json` 和 `text/event-stream` 的 POST，该传输会返回 **HTTP 406**。这是 MCP 规范的一项要求，必须由*客户端*满足——出现 406 意味着要修客户端的 `Accept` 请求头，而不是服务器。让 SDK 掌管协议也意味着你不必手工维护 JSON-RPC 分帧或协议版本握手。

## 服务器 function

使用 Web 标准传输，这只需几行代码——旧指南展示的大部分内容都是 Node 桥，你不需要。把它放在 `netlify/functions/mcp.ts`：

```typescript
import type { Config, Context } from "@netlify/functions";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { checkBearer } from "../lib/mcp/bearer"; // see Authentication

function buildServer() {
  const server = new McpServer({ name: "my-mcp", version: "0.1.0" });

  server.tool(
    "get_item",
    "Fetch a single item by id. Read-only.",
    { id: z.string().describe("The item's unique id") },
    async ({ id }) => ({
      content: [{ type: "text", text: JSON.stringify(await getItem(id)) }],
    }),
  );

  return server;
}

export default async (req: Request, _context: Context) => {
  if (!checkBearer(req)) return new Response("Unauthorized", { status: 401 });

  // Stateless JSON server: it only does request/response over POST. Reject other
  // methods — a GET makes the transport open an SSE stream that never closes, which
  // a serverless function can't serve (you'll get a 502).
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Fresh server + transport per request, no session to persist. enableJsonResponse
  // returns one application/json body instead of an SSE stream — the right fit here.
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  // Hand over the Web Request, return the Web Response. The transport owns JSON-RPC
  // framing, body parsing (a malformed body comes back as a clean 400), and the handshake.
  await server.connect(transport);
  return transport.handleRequest(req);
};

export const config: Config = { path: "/mcp" };
```

这就是一个完整、可部署的服务器。其余都是工具、auth 和安全。

## 基于浏览器的客户端与 CORS

Netlify Functions **不会**为你添加 CORS 请求头，而且上面的服务器对每个非 POST 方法都返回 405——包括浏览器发送的 `OPTIONS` 预检。正常情况这没问题：原生 MCP 客户端（Claude Code、Cursor、Claude Desktop、`mcp-remote` 桥）**不是**浏览器，不执行同源策略，因此它们根本不需要 CORS——这就是为什么这些客户端能用，而浏览器调用不行。

只有当你的 MCP 客户端**在浏览器中**运行——即某个 Web 应用跨源调用服务器——它才重要。这时浏览器会阻断请求，除非响应携带 `Access-Control-Allow-Origin`，而且它会先发送一个 `OPTIONS` 预检，预检必须以 `2xx` 返回，并带有 `Access-Control-Allow-Methods`（含 `POST`）和 `Access-Control-Allow-Headers`（含 `Authorization` 和 `Content-Type`）。浏览器控制台里出现"blocked by CORS policy: No Access-Control-Allow-Origin header"错误就是这种情况——不是服务器坏了，也不是平台 bug。在 function 内部、**在 405 检查之前**应答预检，并在 POST 响应上也回显 CORS 请求头：

```typescript
const CORS = {
  "Access-Control-Allow-Origin": Netlify.env.get("MCP_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id",
};

// In the handler, before the 405 check:
if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
// ...then reject other non-POST methods with 405, and add CORS to the transport's Response.
```

function 必须自己设置这些请求头——不要把浏览器 CORS 错误当成要上报给 Netlify 的问题，也不要通过放宽 auth 来绕过它。

## 定义工具

每个工具包含一个 `name`、一行 `description`、一个 `zod` 输入 schema，以及一个返回 `{ content: [...] }` 的 handler。description 和参数的 `.describe()` 文本是模型唯一能看到的东西——像给智能体写 API 文档一样写它们：说明工具做什么、何时使用，并指出任何不可逆的操作。

随着数量增长，给每个工具单独的模块，并在 `buildServer()` 中注册它们。工具很多的服务器通常会维护一个注册表（由 `{ name, description, inputSchema, handler }` 组成的数组），并一次性接好 `tools/list` + `tools/call`——无论哪种方式，上面的传输设置都相同。

## 认证

MCP 客户端必须证明它被允许调用你的服务器。每个请求都携带 `Authorization: Bearer <token>`；其他一律以 401 拒绝。

**单一共享密钥**（个人 / 单用户）。一个环境变量，常量时间比较。把它放在 `netlify/lib/mcp/bearer.ts`：

```typescript
import { timingSafeEqual } from "node:crypto";

export function checkBearer(req: Request): boolean {
  const expected = Netlify.env.get("MCP_BEARER_TOKEN");
  if (!expected) return false;
  const match = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const a = Buffer.from(match[1]);
  const b = Buffer.from(expected);
  // Length check first because timingSafeEqual throws (RangeError) on unequal-length
  // buffers. The token is fixed-length, so the early return leaks nothing useful.
  return a.length === b.length && timingSafeEqual(a, b);
}
```

用 `openssl rand -hex 32` 生成令牌，并把它存为密钥环境变量。

**按用户 API 密钥**（多用户）。Netlify Identity 门控一个 Web UI，每个用户在其中铸造自己的密钥；你只存储每个密钥的**哈希**（绝不存明文）并绑定到该用户，每次请求时把密钥解析为用户，并把该用户流入你的工具 handler，使工具以正确的人的身份行事。完整模式——schema、生成、哈希、吊销、解析用户——见 [authentication](references/authentication.md)。

**从简单的作用域开始。**最简单的模型是全有或全无：有效密钥可以以它所属用户的身份调用每个工具——通常这是正确的起点。当出现具体需求时（例如只读密钥）再添加按密钥的作用域，若应用确实需要再发展为按工具的作用域或角色分级。如果请求更完整的 RBAC 设计，先给出简单基线，再在其上叠加作用域，而不是一开始就把完整层级当作必需。

## 安全与权限

工具是交给自主智能体的公开 API。要慎重：

- **暴露能完成任务的最少内容。**把读与写分开，在暴露破坏性工具前三思。一个常见且稳妥的选择是**完全省略删除工具**，把破坏性操作保留在由人操作的 UI 中。
- **保护不可逆或公开的操作**，在工具描述中放入明确的指示——例如"发布前向用户展示确切的文本并取得确认"。这是模型层面的软性护栏，因此还要配一个真正的 kill switch：一个你可以立即吊销的令牌。
- **把客户端的凭据与后端的凭据分开。**客户端对你的服务器认证（bearer/API 密钥）；你的服务器用它*自己的*密钥对数据库或第三方 API 认证。绝不要把你后端的万能钥匙传给客户端。
- **使用最小权限的后端凭据**——应用密码或限定作用域的令牌，而不是账户级凭据，这样泄露可被控制且可吊销。
- **校验输入**（你的 `zod` schema 会做这件事）并**记录每次工具调用**，这样你能看到智能体做了什么——`console.info` 会出现在 Netlify function 日志中。

## 速率限制

MCP 服务器是一个公开 endpoint，自主智能体可能以紧密循环反复访问——要给它设上限。Netlify Functions 有**内置的声明式速率限制**，所以不要手工做计数器（按实例的内存计数器反正也无法跨 function 实例保持——见下一节）。在 function 的 `config` 导出中添加 `rateLimit` 块：

```typescript
export const config: Config = {
  path: "/mcp",
  rateLimit: {
    windowSize: 60,               // time window in seconds; capped at 180
    windowLimit: 100,             // max requests per window
    aggregateBy: ["ip", "domain"], // group by ip, domain, or both
  },
};
```

超过限制时，平台默认返回 HTTP `429`（或设置 `action: "rewrite"` 配一个 `to` 路径，把超出的流量发到专用页面）。function 速率限制**只**存在于 function 的 `config` 导出中——**不能**在 `netlify.toml` 中定义。

## 文件上传

当某个工具需要智能体提供文件（要发布的图片、要附加的文档）时，不要以 base64 通过工具调用推送字节——它会让模型的上下文膨胀并触及 payload 限制。改为交给智能体一个短期、一次性的**预签名 URL**，让它可以 `PUT` 原始字节到该 URL，把文件存入 **Netlify Blobs**，并在其他工具中用稳定的键引用该文件。用一个**密钥环境变量**作为密钥，对上传 id、content-type、大小和过期时间做 **HMAC-SHA256** 签名，并以**常量时间验证**它——签名*就是*授权，因此 `PUT` 不携带 bearer 令牌。在上传 endpoint 上，强制执行声明的 content-type 和大小，并拒绝重放。完整三步流程（`prepare_upload` → `PUT` → `finalize_upload`）及代码见：[file uploads](references/file-uploads.md)。

## 状态在请求之间无法保留

每个请求都会构建新的服务器和传输，任何一次调用都可能落到**不同的**——或冷启动的——function 实例上。模块级内存在实例之间不共享，也无法跨冷启动持久。因此你需要在调用之间持久化的状态**不能**放在模块作用域的 `Set`/`Map`/变量中：上面预签名上传的一次性/重放追踪、幂等键、"已处理过这个 id"的防护、你手工追踪的按用户计数器。内存中的护栏在本地和一个热实例上*看起来*正确，但一旦由另一个实例处理请求，就会静默放行重放的上传（或重复处理一次调用）。把这类状态放在**持久存储**中——Netlify Blobs 或你的数据库——以 upload/request id 为键，并在那里进行校验并标记。（这也是服务器本身以无状态方式运行、带 `sessionIdGenerator: undefined` 的原因。）

## 连接客户端

原生远程 MCP 支持如今已是常态；只把 `mcp-remote` 桥当作后备方案。

- **Claude Code**——`claude mcp add --transport http my-mcp https://<site>.netlify.app/mcp --header "Authorization: Bearer <token>"`
- **Cursor**——把服务器添加到 `mcp.json`，带上 URL 和 `Authorization` 请求头。
- **Claude Desktop / claude.ai**——添加一个 **Custom Connector**（Settings → Connectors）。Connectors 面向 OAuth；对于静态 bearer 服务器，`mcp-remote` 桥是可靠路径。
- **后备（较旧 / 仅 stdio 的客户端）**——`npx mcp-remote https://<site>.netlify.app/mcp --header "Authorization: Bearer <token>"`

完整客户端矩阵和 OAuth / Custom Connector 深入解析：[connecting clients](references/connecting-clients.md)。

## 本地开发与部署

- **运行它：**`netlify dev` 在 `http://localhost:8888/mcp` 提供该 function。
- **测试它：**MCP Inspector——`npx @modelcontextprotocol/inspector`——通过 Streamable HTTP 连接到你的 URL，带上 `Authorization: Bearer` 请求头，列出/调用工具。或把 `claude mcp add --transport http` 指向 localhost URL。
- **Identity 注意事项：**Netlify Identity 在 `netlify dev` 下**不**工作，因此按用户密钥的 auth 必须在部署预览上测试。见 **netlify-identity** 技能。
- **部署：**推送到 Git，或 `netlify deploy --build --prod`。
- **密钥：**把令牌/密钥设为环境变量（`netlify env:set MCP_BEARER_TOKEN <value> --secret`）——绝不放在代码里。

## 通用规则

- 绝不要硬编码密钥。把令牌、API 密钥和签名密钥存为 Netlify 环境变量（标记为密钥）。除了泄露风险之外，把 bearer 令牌或签名密钥写进源码（或构建发布的任何文件）会触发 **Netlify 的密钥扫描并使部署失败**，即使构建在其他方面是通过的——修复办法是把它移到密钥环境变量，并在运行时用 `Netlify.env.get(...)` 读取；如果它已被提交，就轮换该令牌，*而不是*禁用扫描器。扫描控制见 **netlify-deploy**。
- 在 functions 内，用 `Netlify.env.get("VAR")` 读取环境变量，而不是 `process.env`。
- 把 `.netlify` 加入 `.gitignore`。

## 相关技能与参考

- [authentication](references/authentication.md)——深入讲解单一密钥 vs 按用户 API 密钥（Identity）。
- [connecting clients](references/connecting-clients.md)——完整客户端矩阵、OAuth 和 Custom Connectors。
- [file uploads](references/file-uploads.md)——让智能体通过预签名 URL 把图片/文件上传到 Netlify Blobs。
- **netlify-functions**——function 语法、路由、限制。**netlify-identity**——Identity 设置。**netlify-database** / **netlify-blobs**——在哪里存储密钥和文件。**netlify-deploy**——部署。**netlify-config**——环境变量。
