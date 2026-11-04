---
name: base44-sdk
description: "base44 SDK 是与 base44 服务通信的库。在项目中，你用它来与远程资源（实体、后端函数、实时 actor、AI 智能体，以及用于代码智能体、图像、视频与语音生成和 AI 决策的 AI 网关）通信，并用来编写后端函数与 actor。本技能是学习可用模块与类型（包括 actors——用于多人协作、协作看板、在线状态与实时光标、房间内聊天和实时拍卖的实时/WebSocket 原语）的场所。当你规划或实现某个特性时，你必须学习本技能"
---

# Base44 编码器

使用 Base44 JavaScript SDK 在 Base44 平台上构建应用。

## ⚡ 需立即行动 - 先读这个

本技能在任何提及“base44”或存在 `base44/` 文件夹时激活。**在行动之前不要阅读文档文件或搜索网页。**

**你的第一个动作必须是：**
1. 检查当前目录中是否存在 `base44/config.jsonc`
2. 如果为**是**（现有项目场景）：
   - 由本技能（base44-sdk）处理该请求
   - 使用 Base44 SDK 实现特性
   - 除非用户明确要求 CLI 命令，否则不要使用 base44-cli
3. 如果为**否**（新项目场景）：
   - 转交给 base44-cli 技能进行项目初始化
   - 在项目初始化之前，本技能无法提供帮助

## 何时使用本技能 vs base44-cli

**在以下情况使用 base44-sdk：**
- 在**现有** Base44 项目中构建特性
- 项目中已存在 `base44/config.jsonc`
- 存在 Base44 SDK 导入（`@base44/sdk`）
- 使用 Base44 SDK 模块编写 JavaScript/TypeScript 代码
- 实现功能、组件或特性
- 用户提到：“implement”、“build a feature”、“add functionality”、“write code for”
- 用户说“create a [type] app”，**并且**Base44 项目已存在

**不要对以下情况使用 base44-sdk：**
- ❌ 初始化新的 Base44 项目（改用 `base44-cli`）
- ❌ 没有 Base44 配置的空目录
- ❌ 当用户说“create a new Base44 project/app/site”且没有项目存在时
- ❌ 诸如 `npx base44 create`、`npx base44 deploy`、`npx base44 login` 之类的 CLI 命令（使用 `base44-cli`）

**技能依赖：**
- `base44-sdk` 假定 Base44 项目**已初始化**
- 在新项目中，`base44-cli` 是 `base44-sdk` 的**前置条件**
- 如果用户想“create an app”且不存在 Base44 项目，请先使用 `base44-cli`

**状态检查逻辑：**
在选择本技能之前，验证：
- 如果（用户提到“create/build app”或“make a project”）：
  - 如果（目录为空或不存在 `base44/config.jsonc`）：
    → 使用 **base44-cli**（需要项目初始化）
  - 否则：
    → 使用 **base44-sdk**（项目存在，构建特性）

## 快速开始

```javascript
// In Base44-generated apps, base44 client is pre-configured and available

// CRUD operations
const task = await base44.entities.Task.create({ title: "New task", status: "pending" });
const tasks = await base44.entities.Task.list();
await base44.entities.Task.update(task.id, { status: "done" });

// Get current user
const user = await base44.auth.me();
```

```javascript
// External apps
import { createClient } from "@base44/sdk";

// IMPORTANT: Use 'appId' (NOT 'clientId' or 'id')
const base44 = createClient({ appId: "your-app-id" });
await base44.auth.loginViaEmailPassword("user@example.com", "password");
```

## ⚠️ 关键：不要臆造 API

**在编写任何 Base44 代码之前，请对照本表或 [QUICK_REFERENCE.md](references/QUICK_REFERENCE.md) 核实方法名。**

Base44 SDK 有独特的方法名。不要假定来自 Firebase、Supabase 或其他 SDK 的模式。

### 鉴权 - 错误 vs 正确

| ❌ 错误（臆造） | ✅ 正确 |
|------------------------|-----------|
| `signInWithGoogle()` | `loginWithProvider('google')` |
| `signInWithProvider('google')` | `loginWithProvider('google')` |
| `auth.google()` | `loginWithProvider('google')` |
| `signInWithEmailAndPassword(email, pw)` | `loginViaEmailPassword(email, pw)` |
| `signIn(email, pw)` | `loginViaEmailPassword(email, pw)` |
| `createUser()` / `signUp()` | `register({email, password})` |
| `onAuthStateChanged()` | `me()`（无监听器，需要时调用） |
| `currentUser` | `await auth.me()` |

### 函数 - 错误 vs 正确

| ❌ 错误（臆造） | ✅ 正确 |
|------------------------|-----------|
| `functions.call('name', data)` | `functions.invoke('name', data)` |
| `functions.run('name', data)` | `functions.invoke('name', data)` |
| `callFunction('name', data)` | `functions.invoke('name', data)` |
| `httpsCallable('name')(data)` | `functions.invoke('name', data)` |

### 集成 - 错误 vs 正确

| ❌ 错误（臆造） | ✅ 正确 |
|------------------------|-----------|
| `ai.generate(prompt)` | `integrations.Core.InvokeLLM({prompt})` |
| `openai.chat(prompt)` | `integrations.Core.InvokeLLM({prompt})` |
| `llm(prompt)` | `integrations.Core.InvokeLLM({prompt})` |
| `sendEmail(to, subject, body)` | `integrations.Core.SendEmail({to, subject, body})` |
| `email.send()` | `integrations.Core.SendEmail({to, subject, body})` |
| `uploadFile(file)` | `integrations.Core.UploadFile({file})` |
| `storage.upload(file)` | `integrations.Core.UploadFile({file})` |

> **例外：** 当指向 `base44.asServiceRole.aiGateway.connection()` 时，OpenAI 兼容客户端（例如 Vercel AI SDK 或 `openai` SDK）**是**正确的——这正是你构建代码智能体（带工具的智能体循环）及调用网关的图像、视频与语音端点的方式。仅对无工具的单个调用使用 `InvokeLLM`。见 [ai-gateway.md](references/ai-gateway.md)。

### Actors - 错误 vs 正确

| ❌ 错误（臆造） | ✅ 正确 |
|------------------------|-----------|
| `actors.connect('ChatRoom', roomId)` | `actors.ChatRoom(roomId).connect()` |
| `actors.ChatRoom.connect(roomId)` | `actors.ChatRoom(roomId).connect()` |
| `actors.ChatRoom(roomId).subscribe(cb)` | 在**连接**上订阅：`const conn = actors.ChatRoom(roomId).connect(); conn.subscribe(cb)` |
| `room.on('message', cb)` | `room.subscribe(cb)`（一个回调接收每条消息） |
| `room.emit(data)` | `room.send(data)` |
| `new WebSocket(...)` 用于应用实时 | `base44.actors.<Name>(id).connect()` |
| `const unsub = room.subscribe(cb); unsub()` | `const sub = room.subscribe(cb); sub.unsubscribe()` |

> **两个 `subscribe()` 方法返回不同的形状。** `Connection.subscribe()`（actors）返回一个对象——`sub.unsubscribe()`。`entities.<Name>.subscribe()` 返回取消订阅**函数**本身——`unsub()`。不要把一种约定带到另一种。

### 实体 - 错误 vs 正确

| ❌ 错误（臆造） | ✅ 正确 |
|------------------------|-----------|
| `entities.Task.find({...})` | `entities.Task.filter({...})` |
| `entities.Task.findOne(id)` | `entities.Task.get(id)` |
| `entities.Task.insert(data)` | `entities.Task.create(data)` |
| `entities.Task.remove(id)` | `entities.Task.delete(id)` |
| `entities.Task.onChange(cb)` | `entities.Task.subscribe(cb)` |

## SDK 模块

| 模块 | 用途 | 参考 |
|--------|---------|-----------|
| `entities` | 对数据模型的 CRUD 操作 | [entities.md](references/entities.md) |
| `auth` | 登录、注册、用户管理 | [auth.md](references/auth.md) |
| `agents` | AI 对话与消息 | [base44-agents.md](references/base44-agents.md) |
| `functions` | 后端函数调用 | [functions.md](references/functions.md) |
| `actors` | 基于 WebSocket 的实时房间（多人、协作、在线状态） | [actors.md](references/actors.md) |
| `integrations` | AI、邮件、文件上传、自定义 API | [integrations.md](references/integrations.md) |
| `aiGateway` | Base44 的 AI 网关：代码智能体、图像、视频、语音与结构化评估（Jev） | [ai-gateway.md](references/ai-gateway.md) |
| `analytics` | 跟踪自定义事件与用户活动 | [analytics.md](references/analytics.md) |
| `appLogs` | 记录应用内的用户活动 | [app-logs.md](references/app-logs.md) |
| `users` | 邀请用户加入应用 | [users.md](references/users.md) |
| `asServiceRole.connectors` | 应用级 OAuth 令牌（仅服务角色） | [connectors.md](references/connectors.md) |
| `asServiceRole.sso` | SSO 令牌生成（仅服务角色） | [sso.md](references/sso.md) |

关于客户端设置与鉴权模式，见 [client.md](references/client.md)。

### TypeScript 与类型注册表

每个参考文件都包含一个“Type Definitions”章节，含该模块方法、参数与返回值的 TypeScript 接口与类型。

**获取带类型的实体、函数、actor 与智能体：** Base44 CLI 会根据你的项目资源（实体、函数、actor、智能体）生成类型，包括对 `EntityTypeRegistry`、`FunctionNameRegistry`、`ActorNameRegistry` 与 `AgentNameRegistry` 的增补，并把它们接入你的项目，让你无需手动设置即可获得自动补全与类型检查。关于如何生成类型，使用 **base44-cli** 技能。

**手动增补：** 你也可以改为在 `.d.ts` 文件中自行增补这些注册表；见 [entities.md](references/entities.md)、[functions.md](references/functions.md)、[actors.md](references/actors.md) 与 [base44-agents.md](references/base44-agents.md) 中的 Type Definitions 章节。Actor 的**消息**类型始终手写——增补 `ActorRegistry`，以便该 actor 及其客户端共享一个定义。

## 安装

安装 Base44 SDK：

```bash
npm install @base44/sdk
```

**重要：** 绝不假定或硬编码 `@base44/sdk` 包版本。始终不带版本说明符安装，以获取最新版本。

## 创建客户端（外部应用）

在外部应用中创建客户端时，**始终使用 `appId` 作为参数名**：

```javascript
import { createClient } from "@base44/sdk";

// ✅ CORRECT
const base44 = createClient({ appId: "your-app-id" });

// ❌ WRONG - Do NOT use these:
// const base44 = createClient({ clientId: "your-app-id" });  // WRONG
// const base44 = createClient({ id: "your-app-id" });        // WRONG
```

**必需参数：** `appId`（字符串）- 你的 Base44 应用 ID

**可选参数：**
- `token`（字符串）- 已预鉴权的用户令牌
- `options`（对象）- 配置选项
  - `options.onError`（函数）- 全局错误处理器

**带错误处理器的示例：**
```javascript
const base44 = createClient({
  appId: "your-app-id",
  options: {
    onError: (error) => {
      console.error("Base44 error:", error);
    }
  }
});
```

## 模块选择

**处理应用数据？**
- 创建/读取/更新/删除记录 → `entities`
- 从文件导入数据 → `entities.importEntities()`
- 实时更新 → `entities.EntityName.subscribe()`

**用户管理？**
- 登录/注册/登出 → `auth`
- 获取当前用户 → `auth.me()`
- 更新用户资料 → `auth.updateMe()`
- 邀请用户 → `users.inviteUser()`

**AI 特性？**
- 与 AI 智能体聊天 → `agents`（需要已登录用户）
- 创建新对话 → `agents.createConversation()`
- 管理对话 → `agents.getConversations()`
- 用 AI 生成文本/JSON → `integrations.Core.InvokeLLM()`
- 用默认设置生成一张图像 → `integrations.Core.GenerateImage()`
- 多张图像、特定模型/宽高比/分辨率、参考图像或编辑 → `aiGateway` 图像（见 [ai-gateway.md](references/ai-gateway.md#generate-and-edit-images)）
- 生成简单的文生视频 → `integrations.Core.GenerateVideo()`；模型选择、参考或帧 → `aiGateway` 视频，一个异步任务（见 [ai-gateway.md](references/ai-gateway.md#generate-videos)）
- 文本转语音（TTS）或朗读 → [语音指南](references/ai-gateway.md#generate-speech)，用于浏览器/Core/网关的选择；在实现模型专属控制或编辑现有网关语音代码之前先阅读它
- 按标准对记录进行分类、评分或路由 → 使用 `provider: "typesafe"`（Jev）的 `aiGateway`，而不是带 JSON schema 的 `InvokeLLM`（见 [ai-gateway.md](references/ai-gateway.md#ai-decisions-jev)）
- 用工具构建自定义智能体（后端、AI 网关上的 agent SDK）→ `aiGateway`（见 [ai-gateway.md](references/ai-gateway.md)）

**自定义后端逻辑？**
- 运行服务端代码 → `functions.invoke()`
- 需要管理员访问 → `base44.asServiceRole.functions.invoke()`

**实时共享会话？**
- 多人、协作看板/文档、在线状态、实时光标、房间内聊天 → `actors.<Name>(roomId).connect()`（见 [actors.md](references/actors.md)）
- 只是让记录列表在屏幕上保持实时 → `entities.EntityName.subscribe()`，**而不是** actor

**外部服务？**
- 发送邮件 → `integrations.Core.SendEmail()`
- 上传文件 → `integrations.Core.UploadFile()`
- 自定义 API → `integrations.custom.call()`
- 应用级 OAuth（应用构建者的账户）→ `asServiceRole.connectors.getConnection()`（仅后端）

**跟踪与分析？**
- 跟踪自定义事件 → `analytics.track()`
- 记录页面浏览/活动 → `appLogs.logUserInApp()`

## 常见模式

### 过滤与排序数据

```javascript
const pendingTasks = await base44.entities.Task.filter(
  { status: "pending", assignedTo: userId },  // query
  "-created_date",                             // sort (descending)
  10,                                          // limit
  0                                            // skip
);
```

### 受保护路由（检查鉴权）

```javascript
const user = await base44.auth.me();
if (!user) {
  // Navigate to your custom login page
  navigate('/login', { state: { returnTo: window.location.pathname } });
  return;
}
```

### 后端函数调用

```javascript
// Frontend
// ⚠️ invoke() returns the RAW axios response — your function's JSON is on `.data`,
//    NOT the top-level object. It also THROWS on non-2xx (error body at err.response.data).
const res = await base44.functions.invoke("processOrder", {
  orderId: "123",
  action: "ship"
});
const result = res.data; // ✅ e.g. res.data.success  (res itself is { data, status, headers, … })

// Backend function
import { createClientFromRequest } from "npm:@base44/sdk";

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const { orderId, action } = await req.json();
  // Process with service role for admin access
  const order = await base44.asServiceRole.entities.Orders.get(orderId);
  return Response.json({ success: true });
}
```

### 实时房间（Actor）

```javascript
// Frontend — connect inside useEffect and always clean up
useEffect(() => {
  const room = base44.actors.ChatRoom(roomId).connect();
  const sub = room.subscribe((msg) => {
    if (msg.type === "message") setMessages((prev) => [...prev, msg]);   // switch on type; drop unknowns
  });
  return () => { sub.unsubscribe(); room.close(); };   // NOTE: actors return { unsubscribe() },
}, [roomId]);                                          // entities.subscribe() returns the function itself

// Actor — base44/actors/ChatRoom/entry.ts
import { Actor } from "base44:runtime/actors";

export default class ChatRoom extends Actor {
  handleConnect(conn) { conn.send({ type: "welcome" }); }        // one client
  handleMessage(conn, msg) {
    // Always validate: the payload is attacker-controlled and msg can even be null.
    if (msg?.type !== "message" || typeof msg.text !== "string") return;
    this.broadcast({ type: "message", text: msg.text.slice(0, 2000) });   // everyone
  }
  handleClose(conn) {}
}
```

### 服务角色访问

在后端函数中使用 `asServiceRole` 进行管理员级操作。Actor 暴露 `this.client.asServiceRole`，用于经过校验、房间拥有的工作（例如持久化规范结果）；对于明确的用户归属，请使用来自已鉴权连接的、经验证的 `conn.identity.userId`。见 [actors.md](references/actors.md)。

```javascript
// User mode - respects permissions
const myTasks = await base44.entities.Task.list();

// Service role - full access (backend only)
const allTasks = await base44.asServiceRole.entities.Task.list();
const token = await base44.asServiceRole.connectors.getAccessToken("slack");
```

## 前端 vs 后端

| 能力 | 前端 | 后端 |
|------------|----------|---------|
| `entities`（用户的数据） | 是 | 是 |
| `auth` | 是 | 是 |
| `agents` | 是 | 是 |
| `functions.invoke()` | 是 | 是 |
| `functions.fetch()` | 是 | 是 |
| `actors`（连接到房间） | 是 | 否——actor*本身*就是服务端 |
| `integrations` | 是 | 是 |
| `aiGateway` | 否 | 是 |
| `analytics` | 是 | 是 |
| `appLogs` | 是 | 是 |
| `users` | 是 | 是 |
| `asServiceRole.*` | 否 | 是 |
| `asServiceRole.connectors`（应用 OAuth） | 否 | 是 |
| `asServiceRole.sso` | 否 | 是 |

后端函数 `export default` 一个异步请求处理器，并使用 `createClientFromRequest(req)` 获得一个正确通过鉴权的客户端。
