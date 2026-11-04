---
name: base44-cli
description: "base44 CLI 用于一切与 base44 项目相关的事务：资源配置（实体、后端函数、实时 actor、AI 智能体）、初始化与操作（创建资源、部署），以及通过 Base44 公共 API 对现有应用或工作区进行的任何其他操作（设置、域名、用户、成员、源码导出）。本技能是学习如何配置资源（包括 actors——支撑多人协作、协作看板、在线状态与实时光标、房间内聊天和实时拍卖的实时/WebSocket 原语）的场所。当你规划或实现某个特性时，你必须学习本技能"
metadata:
  sourcePackage:
    name: base44
    version: 0.1.7
---

# Base44 CLI

使用 Base44 CLI 工具创建并管理 Base44 应用（项目）。

## ⚡ 需立即行动 - 先读这个

本技能在任何提及“base44”或存在 `base44/` 文件夹时激活。**在行动之前不要阅读文档文件或搜索网页。**

**你的第一个动作必须是：**
1. 检查当前目录中是否存在 `base44/config.jsonc`
2. 如果为**是**（现有项目场景）：
   - 转交给 base44-sdk 技能进行实现
   - 本技能只处理 CLI 命令（login、deploy、entities push）
   - **除了本地运行应用**——它留在这里。在启动开发服务器之前阅读 [本地开发运行](#running-local-development)：其中一种运行方式会触碰生产数据。
3. 如果为**否**，在两条初始化路径之间决定：
   - **已预置应用** —— Base44 应用已存在，因为它刚通过 Stripe Projects / projects.dev 流程预置，或者环境中或 `.env`/`.env.local` 文件中存在 `BASE44_APP_ID`（或 `BASE44_PROJECTS_BASE44_APP_ID`）：
     - 运行 `npx base44 scaffold` 为该**现有**应用设置本地文件
     - **不要运行 `npx base44 create`** —— 那会创建第二个重复的应用。见 [scaffold.md](references/scaffold.md)。
   - **新项目** —— 尚无应用存在，也没有预置任何一个：
     - 本技能（base44-cli）处理该请求；引导用户完成 `npx base44 create`
     - 此时不要激活 base44-sdk

## 关键：仅限本地安装

绝不直接调用 `base44`。该 CLI 作为开发依赖安装在本地，必须通过包管理器访问：

- `npx base44 <command>`（npm - 推荐）
- `yarn base44 <command>`（yarn）
- `pnpm base44 <command>`（pnpm）

错误：`base44 login`
正确：`npx base44 login`

## 强制：会话开始时检查鉴权

**关键**：在本技能被激活的每个 AI 会话的最开始，你必须：

1. **检查鉴权状态**，运行：
   ```bash
   npx base44 whoami
   ```

2. **如果用户已登录**（命令成功并显示邮箱）：
   - 继续所请求的任务

3. **如果用户未登录**（命令失败或显示错误）：
   - **立即停止**
   - **不要继续**任何 CLI 操作
   - **请用户手动登录**，运行：
     ```bash
     npx base44 login
   ```
   - 等待用户确认已登录后再继续

**这项检查是强制的，必须在执行任何其他 Base44 CLI 命令之前进行。**

**通过 Stripe Projects / projects.dev 预置？** 当应用通过该流程预置时，CLI 会从它注入的 `BASE44_ACCESS_TOKEN` / `BASE44_REFRESH_TOKEN` 环境变量中播种鉴权（带 `BASE44_PROJECTS_*` 前缀的名称会被自动规范化）。在这种情况下 `npx base44 whoami` 已经成功，你**不**需要交互式 `npx base44 login`。

**已设置工作区 API key？** 如果 `BASE44_API_KEY` 环境变量被设置为工作区 API key（前缀 `b44k_`），CLI 会直接用其鉴权——`npx base44 whoami` 与其他命令无需交互式登录即可成功。

## 概览

Base44 CLI 提供用于鉴权、创建项目、管理实体与部署 Base44 应用的命令行工具。它与框架无关，可与 Vite、Next.js、Create React App、Svelte、Vue 等流行前端框架配合使用。

## 何时使用本技能 vs base44-sdk

**在以下情况使用 base44-cli：**
- 从头创建**新** Base44 项目
- 在空目录中初始化项目
- 为外部预置的**现有**应用设置本地文件（例如通过 Stripe Projects / projects.dev 流程）→ 使用 `scaffold`
- 目录缺少 `base44/config.jsonc`
- 用户提到：“create a new project”、“initialize project”、“setup a project”、“start a new Base44 app”
- 通过 CLI 部署、推送实体或鉴权
- 使用 CLI 命令（`npx base44 ...`）

**在以下情况使用 base44-sdk：**
- 在**现有** Base44 项目中构建特性
- `base44/config.jsonc` 已存在
- 使用 Base44 SDK 编写 JavaScript/TypeScript 代码
- 实现功能、组件或特性
- 用户提到：“implement”、“build a feature”、“add functionality”、“write code”

**技能依赖：**
- 在新项目中，`base44-cli` 是 `base44-sdk` 的**前置条件**
- 如果用户想“create an app”且不存在 Base44 项目，请先使用 `base44-cli`
- `base44-sdk` 假定 Base44 项目已初始化

**状态检查逻辑：**
在选择技能之前，检查：
- 如果（用户提到“create/build app”或“make a project”）：
  - 如果（`base44/config.jsonc` 存在）：
    → 使用 **base44-sdk**（项目存在，构建特性）
  - 否则如果（应用是外部预置的——设置了 `BASE44_APP_ID`/`BASE44_PROJECTS_BASE44_APP_ID`，或 Stripe Projects / projects.dev 流程刚运行过）：
    → 使用 **base44-cli** → `npx base44 scaffold`（为现有应用设置本地文件；不要 `create`）
  - 否则：
    → 使用 **base44-cli** → `npx base44 create`（需要新项目初始化）

## 项目结构

一个 Base44 项目把标准前端项目与一个 `base44/` 配置文件夹结合起来：

```
my-app/
├── base44/                      # Base44 configuration (created by CLI)
│   ├── config.jsonc             # Project settings, site config
│   ├── .types/                  # Auto-generated TypeScript types (created by `types generate`)
│   │   └── types.d.ts           # Module augmentation for @base44/sdk
│   ├── entities/                # Entity schema definitions
│   │   ├── task.jsonc
│   │   └── board.jsonc
│   ├── functions/               # Backend functions (optional)
│   │   └── my-function/
│   │       └── entry.ts
│   ├── actors/                  # Realtime actors (optional)
│   │   └── ChatRoom/
│   │       └── entry.ts
│   ├── agents/                  # Agent configurations (optional)
│   │   └── support_agent.jsonc
│   ├── agent-skills/            # Agent skill instructions (optional)
│   │   └── pdf-export.md
│   └── connectors/              # OAuth connector configurations (optional)
│       └── googlecalendar.jsonc
├── src/                         # Frontend source code
│   ├── api/
│   │   └── base44Client.js      # Base44 SDK client
│   ├── pages/
│   ├── components/
│   └── main.jsx
├── index.html                   # SPA entry point
├── package.json
└── vite.config.js               # Or your framework's config
```

**关键文件：**
- `base44/config.jsonc` - 项目名称、描述、站点构建设置
- `base44/entities/*.jsonc` - 数据模型 schema（见 Entity Schema 章节）
- `base44/functions/*/entry.ts` - 后端函数入口点
- `base44/actors/*/entry.ts` - 实时 actor 入口点（可选）
- `base44/agents/*.jsonc` - 智能体配置（可选）
- `base44/agent-skills/*.md` - 智能体技能说明（可选）
- `base44/.types/types.d.ts` - 为实体、函数与智能体自动生成的 TypeScript 类型（由 `npx base44 types generate` 创建）
- `base44/connectors/*.jsonc` - OAuth 连接器配置（可选）
- `src/api/base44Client.js` - 供前端使用的预配置 SDK 客户端

**config.jsonc 示例：**
```jsonc
{
  "name": "My App",                    // Required: project name
  "description": "App description",    // Optional: project description
  "visibility": "public",              // Optional: "public" | "private" | "workspace"
  "entitiesDir": "./entities",         // Optional: default "entities"
  "functionsDir": "./functions",       // Optional: default "functions"
  "actorsDir": "./actors",             // Optional: default "actors"
  "agentsDir": "./agents",             // Optional: default "agents"
  "agentSkillsDir": "./agent-skills",  // Optional: default "agent-skills"
  "connectorsDir": "./connectors",     // Optional: default "connectors"
  "site": {                            // Optional: site deployment config
    "installCommand": "npm install",   // Optional: install dependencies
    "buildCommand": "npm run build",   // Optional: build command
    "serveCommand": "npm run dev",     // Optional: local dev server
    "outputDirectory": "./dist"        // Optional: build output directory
  }
}
```

**配置属性：**

| 属性 | 说明 | 默认 |
|----------|-------------|---------|
| `name` | 项目名称（必填） | - |
| `description` | 项目描述 | - |
| `visibility` | 应用可见性：`public`、`private` 或 `workspace` | - |
| `entitiesDir` | 实体 schema 的目录 | `"entities"` |
| `functionsDir` | 后端函数的目录 | `"functions"` |
| `actorsDir` | 实时 actor 的目录 | `"actors"` |
| `agentsDir` | 智能体配置的目录 | `"agents"` |
| `agentSkillsDir` | 智能体技能说明的目录 | `"agent-skills"` |
| `connectorsDir` | 连接器配置的目录 | `"connectors"` |
| `site.installCommand` | 安装依赖的命令 | - |
| `site.buildCommand` | 构建项目的命令 | - |
| `site.serveCommand` | 运行开发服务器的命令 | - |
| `site.outputDirectory` | 用于部署的构建输出目录 | - |

## 安装

将 Base44 CLI 作为开发依赖安装到你的项目中：

```bash
npm install --save-dev base44
```

**重要：** 绝不假定或硬编码 `base44` 包版本。始终不带版本说明符安装，以获取最新版本。

然后用 `npx` 运行命令：

```bash
npx base44 <command>
```

**注意：** 本文档中的所有命令都使用 `npx base44`。如偏好，你也可以使用 `yarn base44` 或 `pnpm base44`。

## 全局 `--app-id` 选项

CLI 有一个全局 `--app-id <id>` 选项，用于只需要应用上下文、不需要本地项目文件的命令。

**解析顺序：** `--app-id` 标志 → `BASE44_APP_ID` 环境变量 → 本地 `base44/.app.jsonc`

当你想在不切换到已链接项目目录的情况下检查或操作某个应用时，这很有用。常见示例：

```bash
# Run a one-off script against a specific app
cat ./script.ts | npx base44 exec --app-id app_123

# Fetch logs for a deployed app without a local checkout
npx base44 logs --app-id app_123 --level error
```

对 `exec` 与 `logs` 这类应用级命令使用 `--app-id`。

**不要**对需要本地项目文件的命令使用 `--app-id`：
- `base44 create` 创建新应用，因此它拒绝 `--app-id`
- `base44 dev` 从已链接的本地项目运行，因此它拒绝 `--app-id`
- `base44 deploy` 仍需要本地项目目录，因为它读取本地资源

## 全局 `--json` 选项

CLI 有一个全局 `--json` 选项，使命令在 stdout 上输出机器可读的 JSON 文档，而不是面向人的输出。它还会强制非交互模式（spinner/状态消息/日志移到 stderr），因此 stdout 保持纯 JSON——可以安全地管道到 `jq` 或其他程序。

```bash
npx base44 connectors list-available --json
npx base44 logs --app-id app_123 --json
```

## 可用命令

### 鉴权

| 命令         | 说明                                     | 参考                                   |
| --------------- | ----------------------------------------------- | ------------------------------------------- |
| `base44 login`  | 使用设备码流程向 Base44 鉴权 | [auth-login.md](references/auth-login.md)   |
| `base44 logout` | 从当前设备登出                      | [auth-logout.md](references/auth-logout.md) |
| `base44 whoami` | 显示当前已鉴权用户              | [auth-whoami.md](references/auth-whoami.md) |

### 项目管理

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 create` | 从模板创建新的 Base44 项目 | [create.md](references/create.md) ⚠️ **必读** |
| `base44 scaffold` | 为现有 Base44 应用（按 app ID）搭建本地项目 | [scaffold.md](references/scaffold.md) |
| `base44 link` | 把现有本地项目链接到 Base44 | [link.md](references/link.md) |
| `base44 eject` | 下载现有 Base44 项目的代码 | [eject.md](references/eject.md) |
| `base44 dashboard open` | 在浏览器中打开应用仪表盘 | [dashboard.md](references/dashboard.md) |
| `base44 visibility <level>` | 在服务器上设置应用可见性（`public`、`private` 或 `workspace`） | [visibility.md](references/visibility.md) |

### 工作区管理

工作区（又称组织）把应用归组在共享成员关系下。默认 `base44 create`/`base44 link --create` 使用你的个人工作区；传入 `-w, --workspace <id>` 以指定另一个。

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 workspace list` | 列出你所属的工作区 | [workspace-list.md](references/workspace-list.md) |
| `base44 workspace get <workspace-id>` | 按 ID 显示单个工作区的详情 | [workspace-get.md](references/workspace-get.md) |
| `base44 workspace move [workspace-id]` | 把当前应用移到另一个工作区 | [workspace-move.md](references/workspace-move.md) |

### 开发

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 dev` | 为你的 Base44 后端启动本地开发，并在配置了 `site.serveCommand` 时也启动前端 | [dev.md](references/dev.md) |
| `base44 dev --remote` | 本地提供前端，连接**生产**后端 | [dev.md](references/dev.md) |

### 部署

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 build` | 注入 app id 构建站点——用它代替裸的 `npm run build` | — |
| `base44 deploy` | 部署所有资源（实体、函数、actor、智能体、智能体技能、连接器、鉴权配置与站点）；询问是否先构建，或传 `--build` / `--no-build` | [deploy.md](references/deploy.md) |

### 实体管理

| 操作 / 命令       | 说明                                 | 参考                                           |
| ---------------------- | ------------------------------------------- | --------------------------------------------------- |
| 创建实体        | 在 `base44/entities` 文件夹中定义实体 | [entities-create.md](references/entities-create.md) |
| `base44 entities push` | 把本地实体推送到 Base44               | [entities-push.md](references/entities-push.md)     |
| RLS 模式           | 行级安全示例与操作符   | [rls-examples.md](references/rls-examples.md) ⚠️ **RLS 必读** |

#### 实体 Schema（快速参考）

创建实体文件时始终遵循这个确切结构：

**文件命名：** `base44/entities/{kebab-case-name}.jsonc`（例如 `TeamMember` 用 `team-member.jsonc`）

**Schema 模板：**
```jsonc
{
  "name": "EntityName",
  "type": "object",
  "properties": {
    "field_name": {
      "type": "string",
      "description": "Field description"
    }
  },
  "required": ["field_name"]
}
```

**字段类型：** `string`、`number`、`integer`、`boolean`、`array`、`object`、`binary`
**字符串格式：** `date`、`date-time`、`time`、`email`、`uri`、`hostname`、`ipv4`、`ipv6`、`uuid`、`file`、`regex`、`richtext`
**对于枚举：** 添加 `"enum": ["value1", "value2"]`，并可选择 `"default": "value1"`
**实体名称：** 必须仅限字母数字（模式：`/^[a-zA-Z0-9]+$/`）

关于完整文档，见 [entities-create.md](references/entities-create.md)。

### 函数管理

| 操作 / 命令          | 说明                                   | 参考                                               |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| 创建函数          | 在 `base44/functions` 中定义函数 | [functions-create.md](references/functions-create.md)   |
| `base44 functions deploy [names...] [--force]` | 把本地函数部署到 Base44；可选地定位特定函数或修剪已移除的函数 | [functions-deploy.md](references/functions-deploy.md)   |
| `base44 functions delete <names...>` | 从 Base44 删除一个或多个已部署函数 | [functions-delete.md](references/functions-delete.md) |
| `base44 functions list`   | 列出 Base44 远程上所有已部署函数  | [functions-list.md](references/functions-list.md)       |
| `base44 functions pull [name]` | 把已部署函数从 Base44 拉到本地文件 | [functions-pull.md](references/functions-pull.md)  |

### Workflow 运行

Workflow 是自动化系统（cron 计划、实体触发器、连接器事件、应用内智能体操作）。这些命令是只读的：它们回答“存在哪些 workflow”以及“我的计划任务失败了吗，为什么”。

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 workflows list` | 列出此应用的 workflow 及其状态与运行摘要 | [workflows-list.md](references/workflows-list.md) |
| `base44 workflows runs [--status <s>] [--since <t>]` | 列出 workflow 运行，最新的在前；失败的运行包含底层错误 | [workflows-runs.md](references/workflows-runs.md) |

### Actor 管理

Actor 是 WebSocket 之上的有状态实时服务器房间——每个房间 id 一个实时实例，由连接到该 id 的每个客户端共享。把它们用于多人会话、协作看板、在线状态与实时光标、房间内聊天以及实时拍卖。

Actor 使用由 SDK 管理的鉴权的直接连接。使用经验证的 `conn.identity` 进行用户归属，使用 `this.client.asServiceRole` 持久化经过校验的房间结果。Actor 不接收应用机密；把依赖机密的操作放进后端函数。关于编写契约，见 [actors-create.md](references/actors-create.md)。

| 操作 / 命令 | 说明 | 参考 |
| ---------------- | ----------- | --------- |
| 创建 Actor | 在 `base44/actors` 中定义 actor | [actors-create.md](references/actors-create.md) |
| `base44 actors deploy [names...]` | 把本地 actor 部署到 Base44；可选地定位特定 actor | [actors-deploy.md](references/actors-deploy.md) |
| `base44 actors delete <names...>` | 拆除已部署的 actor（销毁已发布的脚本） | [actors-deploy.md](references/actors-deploy.md#deleting-a-deployed-actor) |

#### Actor 布局（快速参考）

**文件命名：** `base44/actors/{ActorName}/entry.ts` —— 文件夹就是 actor 的身份。

```javascript
// base44/actors/ChatRoom/entry.ts
import { Actor } from "base44:runtime/actors";

export default class ChatRoom extends Actor {
  handleConnect(conn) { conn.send({ type: "welcome" }); }   // this client only
  handleMessage(conn, msg) {
    // Always validate: the payload is attacker-controlled and msg can even be null.
    if (msg?.type !== "message" || typeof msg.text !== "string") return;
    this.broadcast({ type: "message", text: msg.text.slice(0, 2000) });   // the whole room
  }
  handleClose(conn) {}
}
```

**命名规则：** actor 名称会成为一个 JavaScript 类绑定与 WebSocket 连接处理器——它们必须匹配 `[A-Za-z_][A-Za-z0-9_]*`（最多 128 个字符，不能含 `/`、`-`、`.` 或 `:`），不能是 JS 保留字，不能与后端函数名称冲突，且不能嵌套在子文件夹中。CLI 在上传前会在本地检查这一切；名称中含点的文件夹则会被跳过（因此 `ChatRoom.bak/` 是安全的草稿空间）。
- 有效：`ChatRoom`、`BoardRoom`、`Lobby`
- 无效：`chat-room`、`games/Arena`、`class`

**必需：** `entry.ts`（或 `entry.js`），它**默认导出**一个继承自 `base44:runtime/actors` 的 `Actor` 的类。在 TypeScript 中，还要声明 `handleTick() {}` —— 它是 `Actor` 的抽象成员。

**与函数不同：** 只上传 actor 自己的文件夹（没有 `base44/shared/`）、没有 `--force` 修剪、没有 `list`/`pull` 命令、没有本地 `base44 dev` 运行时、名称不能带路径，且不支持自动化。

关于完整文档，见 [actors-create.md](references/actors-create.md)。

### 智能体管理

智能体是可与你应用的用户交互、访问应用的实体并调用后端函数的对话式 AI 助手。使用这些命令管理智能体配置。

| 操作 / 命令        | 说明                             | 参考                                       |
| ----------------------- | --------------------------------------- | ----------------------------------------------- |
| 创建智能体           | 在 `base44/agents` 文件夹中定义智能体 | 见下面的智能体 Schema                          |
| `base44 agents pull`    | 把远程智能体拉到本地文件       | [agents-pull.md](references/agents-pull.md)     |
| `base44 agents push`    | 把本地智能体推送到 Base44             | [agents-push.md](references/agents-push.md)     |

**注意：** 智能体命令执行全量同步——push 会用本地智能体替换所有远程智能体，pull 会用远程智能体替换所有本地智能体。

#### 智能体 Schema（快速参考）

**文件命名：** `base44/agents/{agent_name}.jsonc`（例如 `support_agent.jsonc`）

**Schema 模板：**
```jsonc
{
  "name": "agent_name",
  "description": "Brief description of what this agent does",
  "instructions": "Detailed instructions for the agent's behavior",
  "tool_configs": [
    // Entity tool - gives agent access to entity operations
    { "entity_name": "tasks", "allowed_operations": ["read", "create", "update", "delete"] },
    // Backend function tool - gives agent access to a function
    { "function_name": "send_email", "description": "Send an email notification" },
    // Server route tool - gives agent access to one of a full-stack app's server routes
    { "tool_name": "order_summary", "route_path": "/api/orders/summary", "method": "get", "description": "Summarize the user's recent orders" }
  ],
  "memory_config": {                 // Optional: lets the agent remember facts across conversations
    "enabled": true,
    "scope": "both",                 // "global" | "user" | "both"
    "include_other_conversation_context": false,
    "instructions": null
  },
  "whatsapp_greeting": "Hello! How can I help you today?"
}
```

**命名规则：**
- 智能体名称必须匹配模式：`/^[a-z0-9_]+$/`（小写字母数字加下划线，1-100 个字符）
- 有效：`support_agent`、`order_bot`
- 无效：`Support-Agent`、`OrderBot`

**必填字段：** `name`、`description`、`instructions`
**可选字段：** `tool_configs`（默认为 `[]`）、`memory_config`、`whatsapp_greeting`

**工具配置类型：**
- **实体工具**：`entity_name` + `allowed_operations`（由以下组成的数组：`read`、`create`、`update`、`delete`）
- **后端函数工具**：`function_name` + `description`
- **服务器路由工具**（全栈应用）：`tool_name`（1-64 个字母、数字、`_`、`-` 字符）+ `route_path`（应用相对，以单个 `/` 开头，无查询字符串）+ `method`（`get`\|`post`\|`put`\|`patch`\|`delete`，默认 `post`）+ `description`（默认 `"agent server route"`）

**内存配置字段**（全部可选，详见 [agents-push.md](references/agents-push.md#memory-configuration)）：`enabled`（布尔，默认 `true`）、`scope`（`global`\|`user`\|`both`，默认 `both`）、`include_other_conversation_context`（布尔，默认 `false`）、`instructions`（字符串\|null，默认 `null`）

### 智能体技能管理

智能体技能是可复用的 Markdown 说明，扩展你应用的 AI 智能体知道如何做的事。使用这些命令管理它们。

| 操作 / 命令             | 说明                                    | 参考                                                     |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| 创建智能体技能          | 在 `base44/agent-skills` 文件夹中定义技能   | [agent-skills-push.md](references/agent-skills-push.md#agent-skill-file-format) |
| `base44 agent-skills pull`   | 把远程智能体技能拉到本地文件         | [agent-skills-pull.md](references/agent-skills-pull.md)       |
| `base44 agent-skills push`   | 把本地智能体技能推送到 Base44               | [agent-skills-push.md](references/agent-skills-push.md)       |

**注意：** 智能体技能命令执行全量同步——push 会用本地技能替换所有远程技能，pull 会用远程技能替换所有本地技能。

#### 智能体技能 Schema（快速参考）

**文件命名：** `base44/agent-skills/{skill-name}.md`（例如 `pdf-export.md`）

**Schema 模板：**
```markdown
---
description: Export the current report as a PDF and attach it to the conversation.
---

Use this skill when the user asks to export, download, or share a report as a PDF.

1. Call the `generate_report_pdf` function with the current report's entity ID.
2. Attach the returned file URL in your reply.
```

**命名规则：** 技能名称（文件名去掉 `.md`）必须匹配模式 `/^[a-z0-9]+(-[a-z0-9]+)*$/`（小写、连字符分隔、1-64 个字符）
- 有效：`pdf-export`、`order-lookup`
- 无效：`PdfExport`、`pdf_export`

**必填字段：** `description`（frontmatter，1-1024 个字符）、正文（Markdown 内容，1-15000 个字符）

关于完整文档，见 [agent-skills-push.md](references/agent-skills-push.md)。

### 连接器管理

连接器让你的应用连接外部服务（Google Calendar、Slack、Stripe 等）。大多数连接器使用 OAuth 为后端函数提供访问外部 API 的访问令牌。Stripe 是例外——它在服务端自动预置，没有 OAuth 浏览器流程。

| 操作 / 命令                   | 说明                                          | 参考                                                           |
| ---------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| 创建连接器                  | 在 `base44/connectors` 文件夹中定义连接器      | [connectors-create.md](references/connectors-create.md)             |
| `base44 connectors list-available` | 列出 Base44 所有可用的集成类型     | [connectors-list-available.md](references/connectors-list-available.md) |
| `base44 connectors initiate --integration-type <t> [--scopes <s...>]` | 初始化连接器并启动其 OAuth 流程；配合 `--app-id` 可无项目运行 | [connectors-initiate.md](references/connectors-initiate.md) |
| `base44 connectors pull`           | 把远程连接器拉到本地文件                | [connectors-pull.md](references/connectors-pull.md)                 |
| `base44 connectors push`           | 把本地连接器推送到 Base44                      | [connectors-push.md](references/connectors-push.md)                 |

**注意：** 连接器命令执行全量同步——push 会用本地连接器替换所有远程连接器（并触发新 OAuth 连接器的 OAuth），pull 会用远程连接器替换所有本地连接器。

#### 连接器 Schema（快速参考）

**文件命名：** `base44/connectors/{type}.jsonc`（例如 `googlecalendar.jsonc`、`slack.jsonc`）

**Schema 模板：**
```jsonc
{
  "type": "googlecalendar",
  "scopes": [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events"
  ]
}
```

**必填字段：** `type`
**可选字段：** `scopes`（默认为 `[]`）

**可用连接器类型：** 运行 `npx base44 connectors list-available` 查看所有受支持的集成类型。

**注意：** `stripe` 也是一个有效的连接器类型，但不会由 `list-available` 返回。把它当作受支持的类型——它由 Base44 自动预置，没有 OAuth 浏览器流程。详见 [connectors-create.md](references/connectors-create.md)。

关于完整文档，见 [connectors-create.md](references/connectors-create.md)。

### 鉴权配置

管理应用的鉴权设置（例如用户名与密码登录）。鉴权配置存储在 `base44/auth/` 中，并通过 `auth push`/`auth pull` 与 Base44 同步。

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 auth password-login <enable\|disable>` | 启用或禁用用户名与密码鉴权 | [auth-password-login.md](references/auth-password-login.md) |
| `base44 auth social-login <provider> <enable\|disable>` | 启用或禁用社交登录（google、microsoft、facebook、apple） | [auth-social-login.md](references/auth-social-login.md) |
| `base44 auth sso <enable\|disable>` | 配置 SSO 身份提供方（google、microsoft、github、okta、custom） | [auth-sso.md](references/auth-sso.md) |
| `base44 auth pull` | 把鉴权配置从 Base44 拉到本地文件 | [auth-pull.md](references/auth-pull.md) |
| `base44 auth push` | 把本地鉴权配置推送到 Base44 | [auth-push.md](references/auth-push.md) |

**注意：** 鉴权配置也会作为 `base44 deploy` 的一部分被部署。

### 机密管理

管理项目机密（安全存储在 Base44 中的环境变量）。这些命令从 `--help` 输出中隐藏，但功能完整。

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 secrets list` | 列出所有机密的名称 | [secrets-list.md](references/secrets-list.md) |
| `base44 secrets set` | 设置一个或多个机密（KEY=VALUE 或 --env-file） | [secrets-set.md](references/secrets-set.md) |
| `base44 secrets delete <key>` | 按名称删除一个机密 | [secrets-delete.md](references/secrets-delete.md) |

### 脚本执行

在 Base44 SDK 已预鉴权的情况下，针对你的应用运行一次性脚本。用于对实体执行 CRUD 操作（`base44.entities.MyEntity.list/create/update/delete`）、调用后端函数（`base44.functions.invoke("myFunction", args)`）、调用智能体，或访问 SDK 暴露的任何其他资源——无需部署完整函数。适用于数据迁移、批量操作、调试与脚本化工作流。

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 exec` | 在 Base44 SDK 已预鉴权的情况下运行一个脚本（通过 stdin） | [exec.md](references/exec.md) |

### 类型生成

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 types generate` | 从实体、函数、actor、智能体与连接器生成 TypeScript 类型（`types.d.ts`） | [types-generate.md](references/types-generate.md) |

**输出：** `base44/.types/types.d.ts` —— 用带类型的注册表（`EntityTypeRegistry`、`FunctionNameRegistry`、`AgentNameRegistry`、`ConnectorTypeRegistry`、`ActorNameRegistry`）增补 `@base44/sdk` 模块。

**无需鉴权。** 完全在本地运行。自动更新 `tsconfig.json` 以包含生成的类型。

### 站点管理

| 命令              | 说明                               | 参考                                   |
| -------------------- | ----------------------------------------- | ------------------------------------------- |
| `base44 site deploy` | 把构建好的站点文件部署到 Base44 托管 | [site-deploy.md](references/site-deploy.md) |
| `base44 site open`   | 在浏览器中打开已部署的站点    | [site-open.md](references/site-open.md)     |

**仅 SPA**：Base44 托管支持具有单个 `index.html` 入口点的单页应用。所有路由都从 `index.html` 提供（客户端路由）。

### 任何其他 API 操作

对于上面没有专用命令的 Base44 平台任务（自定义域名、URL 重定向、SEO 设置、应用用户、协作者与所有权、分析、安全扫描、工作区成员与分组、CSV 导入等），用 `base44 api` 直接查找并调用公共 API 端点。它通过服务器的 OpenAPI 规范，用你的 CLI 登录覆盖 Apps API 与 Workspace API。

**仅当某个专用命令恰好做了所要求的事时才优先使用它**（`base44 secrets`、`base44 functions`、`base44 logs`、`base44 deploy`，以及本技能的其余命令）。如果它还做了用户没要求的事（先读它的参考），则改用 `base44 api`。

该 API 覆盖应用与工作区，而不覆盖你自己的 Base44 账户：没有针对你的密码、邮箱或资料的操作。把这些用户引导到 Base44 Web 应用。

**流程：**
1. **查找端点：** `npx base44 api search "<what you want to do>"`，或用 `api catalog [area]` 浏览，或在搜索未命中时用 `api grep <regex>`。每个结果的 `endpoint`（例如 `"GET /api/apps/{app_id}/custom-domains"`）就是要原样传下去的方法与路径。
2. **读取其契约：** `npx base44 api fetch <METHOD> <path> --help | jq '.description, .parameters, .requestBodySchema, .responseSchema'`。调用前先读 `description`：最顶端的搜索结果并不总是正确的操作。
3. **调用它：** `npx base44 api fetch <METHOD> <path> [--body <json>]`。仅在查看时加上 `--read-only`。

| 命令 | 说明 | 参考 |
|---------|-------------|-----------|
| `base44 api search <text...>` | 按功能搜索每个公共 API 操作 | [api-search.md](references/api-search.md) |
| `base44 api catalog [area]` | 列出 API 的区域，或某个区域中的每个操作 | [api-catalog.md](references/api-catalog.md) |
| `base44 api grep <pattern>` | 用正则表达式搜索 API 规范，用于搜索未命中时 | [api-grep.md](references/api-grep.md) |
| `base44 api fetch <METHOD> <path>` | 用你的登录调用一个操作；在路径后加 `--help` 获取其契约 | [api-fetch.md](references/api-fetch.md) ⚠️ **调用前必读** |

## 快速开始

1. 在你的项目中安装 CLI：
   ```bash
   npm install --save-dev base44
   ```

2. 向 Base44 鉴权：
   ```bash
   npx base44 login
   ```

3. 创建新项目（始终提供名称与 `--path` 标志）：
   ```bash
   npx base44 create my-app --path .
   ```

4. 运行本地开发：
   ```bash
   npx base44 dev
   ```

5. 构建并部署所有内容：
   ```bash
   npx base44 deploy --build -y
   ```

或部署单个资源：
- `npx base44 entities push` - 仅推送实体
- `npx base44 functions deploy` - 仅部署函数
- `npx base44 functions delete <name>` - 删除一个已部署函数
- `npx base44 functions list` - 列出所有已部署函数
- `npx base44 functions pull` - 把已部署函数拉到本地文件
- `npx base44 actors deploy` - 仅部署实时 actor
- `npx base44 actors delete <name>` - 拆除一个已部署的 actor
- `npx base44 agents push` - 仅推送智能体
- `npx base44 agent-skills push` - 仅推送智能体技能
- `npx base44 connectors pull` - 从 Base44 拉取连接器
- `npx base44 connectors push` - 仅推送连接器
- `npx base44 auth pull` - 从 Base44 拉取鉴权配置
- `npx base44 auth push` - 仅推送鉴权配置
- `npx base44 site deploy -y` - 仅部署站点

## 常见工作流

### 创建新项目

**⚠️ 强制：在运行 `base44 create` 之前，你必须阅读 [create.md](references/create.md) 了解：**
- **模板选择** —— 选择正确的模板（`backend-and-client` 与 `backend-only`）
- **正确的工作流** —— 不同模板需要不同的设置步骤
- **常见陷阱** —— 避免导致失败的文件夹创建错误

不遵循 create.md 的说明会导致项目搭建损坏。

### 链接现有项目
```bash
# If you have base44/config.jsonc but no .app.jsonc
npx base44 link --create --name my-app
```

### 运行本地开发

始终通过 CLI 运行——两种模式：

| 命令 | 后端 + 数据 |
|---------|----------------|
| `npx base44 dev` | **本地** —— 一次性，每次启动为空，停止即消失 |
| `npx base44 dev --remote` | **生产** —— 真实应用的实时数据 |

`base44 dev` 启动本地后端（实体、函数、鉴权），并在
`base44/config.jsonc` 设置了 `site.serveCommand` 时也提供前端；仅后端的项目无需其他。
`--remote` *仅*运行前端连接真实后端，因此它既需要一个已链接项目，也需要
`site.serveCommand`。

不要自己运行 `npm run dev`：没有 CLI 注入的环境变量，应用没有可到达的后端——
开发服务器会打印应使用的命令。

**默认使用 `npx base44 dev`。** 在 `--remote` 下每次写入都会命中实时应用。无论哪种方式，vite 启动行都会指明后端：`[base44] Proxy enabled: /api -> <target>`。说明你启动了哪一个。选项：[dev.md](references/dev.md)。

### 部署所有更改
```bash
# Generate types (optional, for TypeScript projects)
npx base44 types generate

# Deploy everything (entities, functions, and site), building the site first
npx base44 deploy --build -y
```

通过 CLI 构建，而不是用 `npm run build`：`npx base44 build` 会注入 `VITE_BASE44_APP_ID`，
而裸的 `npm run build` 会使其保持未设置——于是 bundle 无法解析自己的应用，已部署站点上的每次 API
调用都会失败。`npx base44 deploy` 会询问是否先构建；`--build` /
`--no-build` 提前作答（非交互默认仅上传，因此 CI 不变）。

### 生成 TypeScript 类型
```bash
# Generate types from entities, functions, actors, agents, and connectors
npx base44 types generate
```

这会创建 `base44/.types/types.d.ts`，为 `@base44/sdk` 模块提供带类型的注册表。在更改实体、函数、actor、智能体或连接器之后运行它，以保持类型同步。无需鉴权。

### 部署单个资源
```bash
# Push only entities
npx base44 entities push

# Deploy only functions (all)
npx base44 functions deploy
# Deploy specific functions
npx base44 functions deploy my-function other-function
# Deploy and prune removed functions
npx base44 functions deploy --force

# Deploy only actors (all)
npx base44 actors deploy
# Deploy specific actors
npx base44 actors deploy ChatRoom BoardRoom
# Tear down a deployed actor
npx base44 actors delete ChatRoom

# Push only agents
npx base44 agents push

# Push only agent skills
npx base44 agent-skills push

# Pull connectors from Base44
npx base44 connectors pull

# Push only connectors
npx base44 connectors push

# Deploy only site
npx base44 site deploy -y
```

### 打开仪表盘
```bash
# Open app dashboard in browser
npx base44 dashboard
```

## 鉴权

大多数命令需要鉴权。如果你未登录，CLI 会自动提示你登录。你的会话存储在本地，并可跨 CLI 会话持久保留。

## 故障排查

| 错误                       | 解决方案                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------- |
| 未鉴权           | 先运行 `npx base44 login`                                                        |
| 未找到实体           | 确保 `base44/entities/` 目录中存在实体                               |
| 实体无法识别       | 确保文件使用 kebab-case 命名（例如 `team-member.jsonc`，而不是 `TeamMember.jsonc`） |
| 未找到函数          | 确保 `base44/functions/` 中存在带 `entry.ts` 或 `entry.js` 的函数   |
| 未找到 actor             | 确保 actor 以 `base44/actors/<ActorName>/entry.ts` 形式存在（绝不要直接放在 `base44/actors/` 中） |
| actor 名称无效          | actor 名称必须匹配 `[A-Za-z_][A-Za-z0-9_]*`（不能含 `/`、`-`、`.` 或 `:`），避免 JS 保留字，且不能嵌套。会在上传前的本地被捕获 |
| `actors cannot be nested`   | 展平为 `base44/actors/<ActorName>/entry.ts`，或重命名你命名为 `entry.ts` 的辅助文件——`base44/actors/` 下的每个 entry 文件都算一个 actor |
| Actor 与函数共享名称 | 它们部署进同一个命名空间——重命名其中之一 |
| actor 文件在函数桶中被拒绝 | 导入 `base44:runtime/actors` 的文件必须位于 `base44/actors/<ActorName>/entry.ts`——把它移出 `base44/functions/` |
| 未找到智能体             | 确保 `base44/agents/` 目录中存在带有效 `.jsonc` 配置的智能体       |
| 智能体名称无效          | 智能体名称必须仅限小写字母数字加下划线                    |
| 未找到智能体技能       | 确保 `base44/agent-skills/` 目录中存在带有效 `.md` 文件的技能文件  |
| 技能文件无效          | 技能文件名必须小写连字符化，并在其 frontmatter 中包含 `description` |
| Push 被取消 / 需要 --yes | `agents push`、`agent-skills push`、`entities push` 与 `connectors push` 是破坏性的全量同步——交互式确认，或在 CI/非交互模式传 `-y`/`--yes` |
| 未找到连接器         | 确保 `base44/connectors/` 目录中存在带有效 `.jsonc` 配置的连接器 |
| 连接器类型无效      | 运行 `npx base44 connectors list-available` 查看有效类型 |
| 连接器类型重复    | 每个连接器类型在每个项目中只能定义一次                            |
| 连接器授权超时 | 重新运行 `npx base44 connectors push` 并在浏览器中完成 OAuth 流程  |
| 未找到站点配置 | 检查项目配置中是否配置了 `site.outputDirectory`                   |
| 站点部署失败       | 确保站点已先构建（`npx base44 build` 或 `npx base44 deploy --build`）且构建成功 |
| 已部署站点的 API 调用全部失败 | bundle 在构建时未带上其 app id——用 `npx base44 build`（不是裸的 `npm run build`）重新构建并重新部署 |
| 出现有更新可用的消息    | 若提示更新，运行 `npm install -g base44@latest`（或对本地安装使用 npx） |
