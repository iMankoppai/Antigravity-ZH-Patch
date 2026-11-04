---
name: netlify-identity
description: 用 @netlify/identity 为 Netlify 站点添加用户认证——注册/登录/登出、Google/GitHub/GitLab/Bitbucket OAuth、服务端 getUser() 检查、基于角色的访问控制，以及 Identity 事件 functions。当任务涉及添加登录或注册表单、把内容限制为仅成员或角色可见、"auth 中间件"或在 Netlify Functions 或 Edge Functions 中验证用户、处理 OAuth 或邮件确认回调、在注册时分配角色，或自定义 Identity 邮件时，使用本技能。要把整个站点锁定为公司内部或仅员工访问，请改用 netlify-access-control。
---

# Netlify Identity

使用 `@netlify/identity`（npm）。对于新项目，它取代了旧版的 `netlify-identity-widget` 和 `gotrue-js`——不要再用那些。

```bash
npm install @netlify/identity
```

框架示例（Next.js/Astro/Remix/SvelteKit）和完整 API 参考见 [npm 上的 `@netlify/identity` README](https://www.npmjs.com/package/@netlify/identity)。

> **Identity 在 `netlify dev` 下不会运行。**在部署上测试所有 auth 流程——Deploy Previews 可用。本地开发无法完成注册/登录/OAuth。

> **Identity 配置仅限仪表盘——没有公开 API。**绝不要 curl `api.netlify.com` 来切换或读取 Identity 设置，绝不要从本地 Netlify 配置读取令牌，绝不要探测未记录的 endpoint。在 `https://app.netlify.com/projects/{site_name}/identity` 启用并配置 Identity。

> **绝不要在 Identity 之外从零自建 OAuth 流程。**不要在代码中注册提供商应用，不要在源码中放 `client_id`/`secret`，不要自定义回调令牌交换。使用 `oauthLogin()` + `handleAuthCallback()`。在 Identity 旁边用原始 OAuth 是最常见的返工来源。

## 客户端 auth（浏览器）

```ts
import { signup, login, logout, getUser, oauthLogin, handleAuthCallback } from '@netlify/identity'

// Register — confirmation email sent by default (unless autoconfirm is on)
const user = await signup('jane@example.com', 'securepassword', { full_name: 'Jane Doe' })

// Log in / out
await login('jane@example.com', 'securepassword')
await logout()

// Current user or null
const current = await getUser()
if (current) console.log(`Logged in as ${current.email}`)

// External provider — redirects the browser; provider is one of
// 'google' | 'github' | 'gitlab' | 'bitbucket'
oauthLogin('github')
```

> **`handleAuthCallback()` 在你的落地页上是必需的。**没有它，OAuth 重定向、邮件确认链接、密码找回链接和邀请链接永远无法完成。在页面加载时调用它：

```ts
import { handleAuthCallback } from '@netlify/identity'

const result = await handleAuthCallback() // falsy if no token in URL hash
if (result) console.log(result.type, result.user.email) // confirmation | invite | recovery | email change
```

针对单一令牌类型的替代方案：`recoverPassword()`（找回）、`acceptInvite()`（邀请）。用 `refreshSession()` 刷新会话。

不要硬编码存在哪些提供商。在启动时调用 `getSettings()`，并根据它返回的内容渲染注册表单和 OAuth 按钮。

## 服务端 auth（Netlify Functions 与 Edge Functions）

服务端 `getUser()`/`login()`/`admin.*` 需要现代的 **v2 functions**（`export default`）。不支持 v1 的 `export { handler }` 形式。

`getUser()` 在两种运行时中都可用。**`admin.*` 仅在 Netlify Functions 中运行——不在浏览器，也不在 Edge Functions。**

```ts
// netlify/functions/me.ts — verify user
import { getUser } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  return Response.json({ id: user.id, email: user.email })
}
```

Edge Function 的形式相同，只是从 `@netlify/edge-functions` 导入 `Context`。

### 角色检查

```ts
// netlify/functions/admin-users.ts
import { getUser, admin } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!user.roles.includes('admin')) return new Response('Forbidden', { status: 403 })
  const users = await admin.listUsers()
  return Response.json({ users })
}
```

### CSRF：服务端 auth endpoint 必需

> 任何在服务端运行 `login()`、`signup()` 或 `logout()` 的 endpoint **必须**在 handler 顶部调用 `verifyRequestOrigin(req)`。来源不匹配时它会抛出 403。

```ts
// netlify/functions/login.ts
import { login, verifyRequestOrigin } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  verifyRequestOrigin(req)
  const { email, password } = await req.json()
  await login(email, password)
  return new Response(null, { status: 302, headers: { Location: '/dashboard' } })
}
```

## Identity 事件 functions

当 Identity 事件发生时，平台会调用你的 handler。导出一个默认对象，每个事件对应一个方法。文件：`netlify/functions/identity.mts`。

> 类型化 handler（`UserSignupEvent`、`event.deny()`）需要 `@netlify/functions` ≥ 5.2.0。较旧的安装必须使用旧式文件名约定（`identity-signup.ts` 等）——见 `references/authorization-and-sessions.md`。

| Handler | 触发时机 |
|---|---|
| `userValidate` | 注册尝试时，在创建账户之前。在此拦截不良注册。 |
| `userSignup` | 注册完成时（若启用了邮件确认，则在确认之后）。分配角色、同步、欢迎。 |
| `userLogin` | 用户登录时。追踪/最后出现/拦截。 |
| `userModified` | 资料更新时。 |
| `userDeleted` | 用户被删除时（仅通知）。 |

事件 `user` 字段是 camelCase（`appMetadata`、`userMetadata`、`confirmedAt`）。

```typescript
// netlify/functions/identity.mts — deny a signup
import type { UserValidateEvent } from "@netlify/functions"

export default {
  userValidate(event: UserValidateEvent) {
    if (!event.user.email?.endsWith("@example.com")) return event.deny()
  },
}
```

```typescript
// netlify/functions/identity.mts — assign roles at signup
import type { UserSignupEvent } from "@netlify/functions"

export default {
  userSignup(event: UserSignupEvent) {
    return { user: { ...event.user, appMetadata: { ...event.user.appMetadata, roles: ["member"] } } }
  },
}
```

- `event.deny()`——拒绝该操作；最终用户收到 `401`，不会有可观测性错误。第一个调用它的 handler 会中止链条；后续订阅者不会被调用。（旧式文件名 functions 则用非 2xx 的 `Response` 表示拒绝。）
- 返回 `{ user: {...} }` 可在持久化前修改记录（在注册时设置角色的规范做法）。角色随 JWT 传递，因此角色变更在用户的**下次登录或令牌刷新时生效，而不是立即生效**——见下文 Roles & the JWT。
- 后台模式：`export const config: Config = { background: true }`——操作立即完成，handler 异步运行。

## 角色与 JWT

- `user.roles` 从 `app_metadata.roles` 读取，随 JWT 携带（cookie `nf_jwt`；通过 `nf_refresh` 刷新）。
- `user_metadata`——用户可编辑的资料（`full_name`、`email`）。`app_metadata`——应用数据，含 `roles`，用户不可编辑。

> **角色变更不是立即生效的。**它们在下次登录或令牌刷新时生效。更改角色不会使当前 JWT 失效。用 `refreshSession()` 强制刷新。

在 Netlify Function 中通过 `admin.updateUser()` 为现有用户设置角色；在注册时通过上面的 `userSignup` 事件 handler 设置。

SSR/会话水合和授权的深入指南位于 `references/advanced-patterns.md` 和 `references/authorization-and-sessions.md`。

## CDN 边缘 RBAC（重定向规则）

在边缘执行，无需回源往返。角色不匹配会得到 404，除非你添加回退——**始终为角色门控规则配一个回退。**

`_redirects`：
```
/admin/*  /admin/:splat  200!  Role=admin
/admin/*  /login         401!
# Multiple roles chained with commas:
/private/* /private/:splat 200! Role=editor,admin
```

`netlify.toml`：
```toml
[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  force = true
  status = 200
  conditions = {Role = ["editor", "admin"]}
```

用重定向规则做基于路径的门控；用基于 function 的 `user.roles` 检查做自定义授权逻辑。

## 配置（仅仪表盘）

基础：`https://app.netlify.com/projects/{site_name}/identity`。用 **Enable Identity** 启用。Identity 需要 HTTPS——在自定义域上集成前先设置好 SSL。

- **Registration**（`?tab=registration#registration-preferences`）：**Open**（默认，任何人都可以注册）或 **Invite only**（所有用户，包括通过外部提供商登录的用户，都必须先被邀请）。
- **Confirmation / autoconfirm**（`?tab=emails#confirmation-template`）：勾选该框以跳过邮件验证。
- **External providers**（`?tab=registration#external-providers`）：Google/GitHub/GitLab/Bitbucket。要使用品牌化 OAuth（用你的应用名而不是 "Netlify Identity"），在提供商处注册你的应用，获取 client ID + secret，并**在 Netlify 设置 UI 中**输入它们——不要在代码里。
- **Invitations**（`?tab=users`）：输入地址以发送邀请；链接携带 `invite_token`。
- **Password recovery**：用户页面 → **Send reset password email**；链接携带 `recovery_token`。

### 邮件（Pro 套餐或更高）

默认发件人是 `no-reply@netlify.com`。自定义 SMTP 发件人和自定义模板都需要 **Pro 套餐或更高**。

模板变量（Go 语法）：`{{ .Email }}`、`{{ .NewEmail }}`（仅邮件变更）、`{{ .SiteURL }}`、`{{ .ConfirmationURL }}`、`{{ .Token }}`。

各操作的自定义链接 hash 片段：
```
{{ .SiteURL }}/path/#invite_token={{ .Token }}
{{ .SiteURL }}/path/#confirmation_token={{ .Token }}
{{ .SiteURL }}/path/#recovery_token={{ .Token }}
{{ .SiteURL }}/path/#email_change_token={{ .Token }}
```

自定义模板约束：仅内联 CSS；图片用绝对链接；**不要有 `<html>`/`<head>`/`<body>` 标签**；确保你的构建不会改动 Go 模板变量。

### 审计日志（Pro 套餐或更高）

`?tab=audit-log`。用带范围的词搜索：`author:[string]` 或 `action:[string]`。操作名称：`login`、`logout`、`user_signedup`、`user_deleted`、`user_modified`、`token_revoked`、`token_refreshed`、`user_recovery_requested`、`user_invited`。

## 外部 JWT 提供商（Enterprise）

在 **Enterprise 套餐**上可用。你可以使用 Netlify Identity 或外部 JWT 提供商——**不能同时使用**；在启用 Netlify Identity 时，你无法认证第三方 JWT。

- 角色路径：Netlify Identity 为 `app_metadata.roles`；外部提供商为 `app_metadata.authorization.roles`。自定义路径 → 联系支持。
- JWT header 必须为 `{"alg": "HS256", "typ": "JWT"}`（必须 HS256）。payload 的 `exp` 是必需的，且必须是未来的 Unix Epoch 时间。
- 在 `Project configuration > General > Visitor access > JWT secret` 设置 JWT 密钥。项目级覆盖团队级默认值。

## 失败时——停止，不要猜

如果回调 404、`/.netlify/identity/*` 无法访问，或 OAuth 流程始终不返回：呈现错误、仪表盘 URL（`https://app.netlify.com/projects/{site_name}/identity`），以及要检查的设置（注册偏好、外部提供商配置、确认/自动确认）。然后停止。不要发明恢复命令。记住：Identity 在 `netlify dev` 下不工作——确认你是在部署上测试。

站点门控请求（"把此站点锁定到我的公司"、仅员工）先路由到 netlify-access-control 技能——Identity 仅为应用级用户层。

<!-- gap: getSettings() is referenced by house rules for provider discovery but its signature/return shape is not documented in the intermediate. -->

<!-- system: agent-context/identity/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（identity）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 深入指南位于本技能中：`references/advanced-patterns.md`（SSR/会话水合）和 `references/authorization-and-sessions.md`。
2. Identity 在 `netlify dev` 下不工作——在部署上测试 auth 流程（Deploy Previews 可用）。
3. Identity 配置没有公开 API——仅限仪表盘。绝不要 curl `api.netlify.com` 来切换或检查 Identity 设置，绝不要从 `~/Library/Preferences/netlify/config.json` 读取 auth 令牌，绝不要探测未记录的 endpoint。
4. 失败时（回调 404、`/.netlify/identity/*` 无法访问、OAuth 流程不返回），呈现错误、仪表盘 URL 和要检查的设置——然后停止。不要发明恢复命令。
5. 在使用 Identity 时，绝不要从零自建第三方 OAuth 流程——不要在代码中注册提供商应用，不要在代码中放 `client_id`/`secret`，不要自定义回调令牌交换。使用 `oauthLogin()` + `handleAuthCallback()`；在 Identity 旁边用原始 OAuth 是最常见的返工来源。
6. 服务端 `getUser()`/`login()`/`admin.*` 需要现代 v2 functions（`export default`）——不支持 v1 的 `export { handler }`。类型化 Identity 事件 handler（`UserSignupEvent`、`event.deny()`）需要 `@netlify/functions` ≥ 5.2.0；较旧的安装使用旧式文件名。
7. 不要硬编码存在哪些 auth 提供商——在启动时调用 `getSettings()`，并根据它返回的内容渲染注册表单和 OAuth 按钮。
8. 站点门控请求（"把此站点锁定到我的公司"、仅员工）先路由到 netlify-access-control 技能——Identity 仅为应用级用户层。
9. 任何分配或更改角色的答案——在注册时、通过 `admin.*`，或在仪表盘中——都必须说明该变更在用户下次登录或令牌刷新时生效，而不是立即生效。把这句话放在设置角色的代码旁边，而不只是放在单独的 JWT 小节：回答注册问题的智能体会读注册示例然后就停下，而它曾交付过省略该延迟的答案。
