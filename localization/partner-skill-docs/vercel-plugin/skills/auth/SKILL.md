---
name: auth
description: 认证集成指南——面向 Next.js 应用的 Clerk（原生 Vercel Marketplace）、Better Auth、Descope 和 Auth0 设置，外加 Sign in with Vercel、Vercel Passport 和 Vercel KMS。涵盖服务端配置、路由处理器、proxy.ts 认证模式、登录/注册流程以及 Marketplace 配置。在实现用户认证、会话、受保护路由或保护部署时使用。
metadata:
  priority: 6
  docs:
    - "https://authjs.dev/getting-started"
    - "https://nextjs.org/docs/app/guides/authentication"
    - "https://better-auth.com/llms.txt"
  sitemap: "https://authjs.dev/sitemap.xml"
  pathPatterns:
    - 'proxy.ts'
    - 'proxy.js'
    - 'src/proxy.ts'
    - 'src/proxy.js'
    - 'middleware.ts'
    - 'middleware.js'
    - 'src/middleware.ts'
    - 'src/middleware.js'
    - 'clerk.config.*'
    - 'app/sign-in/**'
    - 'app/sign-up/**'
    - 'src/app/sign-in/**'
    - 'src/app/sign-up/**'
    - 'app/(auth)/**'
    - 'src/app/(auth)/**'
    - 'auth.config.*'
    - 'auth.ts'
    - 'auth.js'
    - 'lib/auth.ts'
    - 'src/lib/auth.ts'
    - 'lib/auth-client.ts'
    - 'src/lib/auth-client.ts'
    - 'app/api/auth/[...all]/**'
    - 'src/app/api/auth/[...all]/**'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*@clerk/nextjs\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@clerk/nextjs\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@clerk/nextjs\b'
    - '\byarn\s+add\s+[^\n]*@clerk/nextjs\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@descope/nextjs-sdk\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@descope/nextjs-sdk\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@descope/nextjs-sdk\b'
    - '\byarn\s+add\s+[^\n]*@descope/nextjs-sdk\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\byarn\s+add\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/kms\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/kms\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/kms\b'
    - '\byarn\s+add\s+[^\n]*@vercel/kms\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*\bbetter-auth\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*\bbetter-auth\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*\bbetter-auth\b'
    - '\byarn\s+add\s+[^\n]*\bbetter-auth\b'
    - '\b(npx|bunx|pnpm\s+dlx)\s+(auth@latest|@better-auth/cli)\b'
  importPatterns:
    - "@vercel/kms"
    - "better-auth"
validate:
  -
    pattern: 'VERCEL_CLIENT_(ID|SECRET)|vercel\.com/oauth/(authorize|access_token|token)'
    message: 'Hand-rolled Vercel OAuth detected. Use the Sign in with Vercel OIDC provider (or the built-in `vercel` social provider in Better Auth) instead of manual token exchange.'
    severity: recommended
    skipIfFileContains: 'signInWithVercel|@vercel/auth|better-auth|socialProviders'
retrieval:
  aliases:
    - authentication
    - login system
    - sign in
    - auth flow
    - sign in with vercel
    - passport
    - kms
  intents:
    - add auth
    - protect routes
    - manage sessions
    - implement login
    - secure api endpoints
  entities:
    - NextAuth
    - Auth.js
    - Better Auth
    - betterAuth
    - authClient
    - JWT
    - OAuth
    - session
    - middleware
    - getServerSession
    - Vercel Passport
    - Okta
    - Microsoft Entra ID
    - Vercel KMS
    - signToken
  examples:
    - add login to my app
    - protect this route with auth
    - set up NextAuth
    - set up Better Auth
    - add better auth to my next app
chainTo:
  -
    pattern: 'export\s+(default\s+)?function\s+middleware'
    targetSkill: routing-middleware
    message: 'Auth logic in a middleware() export — Next.js 16 uses proxy.ts with a proxy() export. Loading Routing Middleware guidance for the migration.'
  -
    pattern: 'from\s+[''\"](jsonwebtoken)[''"]|require\s*\(\s*[''\"](jsonwebtoken)[''"]|jwt\.sign\s*\('
    targetSkill: auth
    message: 'Manual JWT handling with jsonwebtoken detected — use Clerk, Better Auth, or Auth.js for built-in session handling, CSRF protection, and token rotation.'
    skipIfFileContains: 'better-auth|@clerk|next-auth'
  -
    pattern: 'from\s+[''\"](next-auth)[''"]|NextAuthOptions|authOptions\s*:'
    targetSkill: auth
    message: 'Legacy next-auth (v4) pattern detected — loading auth guidance for Auth.js v5 migration with the new universal auth() helper.'
  -
    pattern: 'from\s+[''"]@clerk/nextjs[''"]'
    targetSkill: auth
    message: 'Clerk import detected — loading Auth guidance for Clerk v7 patterns, middleware setup, organization handling, and Vercel Marketplace integration.'
    skipIfFileContains: 'clerkMiddleware|ClerkProvider'
  -
    pattern: "bcrypt|argon2"
    targetSkill: auth
    message: 'Manual password hashing detected (bcrypt/argon2) — use Clerk, Better Auth, or Auth0 for authentication with built-in password hashing and rate limiting.'
    skipIfFileContains: "@clerk|@auth0|better-auth"
  -
    pattern: 'from\s+[''"]better-auth[''"]|betterAuth\s*\('
    targetSkill: auth
    message: 'Better Auth config detected — loading Auth guidance for the Next.js route handler, nextCookies plugin, cookie-only middleware checks, cookie cache, and Marketplace Postgres/Redis wiring.'
    skipIfFileContains: 'nextCookies|toNextJsHandler'
---

# 认证集成

你是 Vercel 部署应用的认证专家——涵盖 Clerk（原生 Vercel Marketplace 集成）、Better Auth（自托管，数据在你自己的数据库中）、Descope 和 Auth0 用于应用登录，外加 Vercel 自己的原语：Sign in with Vercel（OAuth/OIDC 提供商）、Passport（使用你的身份提供商进行部署保护）和 KMS（托管签名密钥）。

所有 Next.js 示例均针对 Next.js 16，其中请求拦截文件是 `proxy.ts`（导出 `proxy`）。在 Next.js 15 或更早版本中，相同代码位于 `middleware.ts`（导出 `middleware`）。

## Clerk（推荐 — 原生 Marketplace 集成）

Clerk 是原生 Vercel Marketplace 集成，具有自动配置的环境变量和统一计费。当前 SDK：`@clerk/nextjs` v7（Core 3，2026 年 3 月）。

### 通过 Marketplace 安装

```bash
# Install Clerk from Vercel Marketplace (auto-provisions env vars)
vercel integration add clerk
```

自动配置的环境变量：
- `CLERK_SECRET_KEY` — 服务端 API 密钥
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — 客户端可发布密钥

### SDK 设置

```bash
# Install the Clerk Next.js SDK
npm install @clerk/nextjs
```

### Proxy 配置

```ts
// proxy.ts (Next.js 16; middleware.ts on Next.js 15 and earlier)
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

### 保护路由

```ts
// proxy.ts — protect specific routes
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
```

### Frontend API 代理（Core 3）

通过你自己的域名代理 Clerk 的 Frontend API，以避免第三方请求：

```ts
// proxy.ts
export default clerkMiddleware({
  frontendApiProxy: { enabled: true },
});
```

### Provider 设置

```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
```

### 登录和注册页面

```tsx
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return <SignIn />;
}
```

```tsx
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return <SignUp />;
}
```

将路由环境变量添加到 `.env.local`：

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 访问用户数据

```tsx
// Server component
import { currentUser } from "@clerk/nextjs/server";

export default async function Page() {
  const user = await currentUser();
  return <p>Hello, {user?.firstName}</p>;
}
```

```tsx
// Client component
"use client";
import { useUser } from "@clerk/nextjs";

export default function UserGreeting() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return <p>Hello, {user?.firstName}</p>;
}
```

### API 路由保护

```ts
// app/api/protected/route.ts
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ userId });
}
```

## Better Auth（自托管）

Better Auth 是一个与框架无关的 TypeScript 认证库，运行在你的应用内部。用户、会话和账户存在于你自己的数据库中，因此唯一的外部依赖就是数据库本身。当用户希望在其应用内使用认证并将数据放在自己的数据库中，或在 Next.js 以外的框架上构建时，选择它。当前发布线：v1.7。

### 智能体工作流

1. **检测**框架（Next.js App/Pages Router、SvelteKit、Nuxt、Hono……）、数据库/ORM（`prisma/schema.prisma`、`drizzle.config.ts`、`pg`、`@neondatabase/serverless`）以及从 lockfile 检测包管理器。
2. **安装** `better-auth` 以及 DB 驱动。如果项目没有数据库，从 Marketplace 配置 Postgres。
3. **创建** `lib/auth.ts`（服务端）和 `lib/auth-client.ts`（客户端）。
4. 在 `app/api/auth/[...all]/route.ts` **挂载**路由处理器。
5. 用 `npx auth@latest migrate`（内置适配器）或 `generate` + ORM 的 migrate（Prisma/Drizzle）**迁移**。
6. **保护**路由：在 `proxy.ts` 中检查 cookie，在页面/路由处理器中进行真实的 `getSession()`。
7. **验证** `GET /api/auth/ok` 返回 `{ "status": "ok" }`，然后运行一个注册 → 登录 → `getSession()` 的通过流程。
8. 每次插件变更后**重新运行 migrate**。

### 安装

```bash
npm install better-auth pg
# Postgres from the Marketplace (auto-provisions DATABASE_URL)
vercel integration add neon
```

### 环境变量

```env
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

- **生产：** 将 `BETTER_AUTH_URL` 设为你的生产域名。
- **预览：** 对 Preview 环境保持 `BETTER_AUTH_URL` 未设置。Better Auth 从传入请求推断基础 URL，因此每个预览 URL 无需配置即可工作。`VERCEL_URL` **不会**被自动读取。
- OAuth 提供商需要注册重定向 URI（`<base>/api/auth/callback/<provider>`），因此预览上的社交登录需要一个稳定的分支别名。

### 服务端配置

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    // Sign in with Vercel — create a Vercel App in the dashboard for credentials
    vercel: {
      clientId: process.env.VERCEL_CLIENT_ID!,
      clientSecret: process.env.VERCEL_CLIENT_SECRET!,
    },
  },
  session: {
    // Signed cookie cache: most getSession() calls skip the database
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [nextCookies()], // keep last — sets cookies from Server Actions
});
```

Prisma / Drizzle / MongoDB 用户传入适配器而不是连接池：`prismaAdapter(prisma, { provider: "postgresql" })` 来自 `better-auth/adapters/prisma`，`drizzleAdapter(db, { provider: "pg" })` 来自 `better-auth/adapters/drizzle`。

### 路由处理器

```ts
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 数据库 Schema

```bash
npx auth@latest migrate    # built-in adapter (pg / mysql / sqlite): applies directly
npx auth@latest generate   # Prisma / Drizzle: writes the schema, then run your ORM's migrate
```

添加或移除插件后重新运行。用 `GET /api/auth/ok` → `{ "status": "ok" }` 验证。

### 客户端

```ts
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

```tsx
"use client";
import { authClient } from "@/lib/auth-client";

// Sign in
await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
await authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
await authClient.signUp.email({ email, password, name });
await authClient.signOut();

// Reactive session
const { data: session, isPending } = authClient.useSession();
```

### 访问会话数据（服务端）

```tsx
// Server Component, Server Action, or Route Handler
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return <p>Hello, {session.user.name}</p>;
}
```

每个端点（包括插件端点）都可通过 `auth.api.*` 在服务端调用——无需 HTTP 往返。

### 保护路由

在中间件/proxy 中只检查会话 **cookie**——绝不要在那里调用数据库。在页面或路由处理器中进行真实检查。

```ts
// proxy.ts (Next.js 16) — rename to middleware.ts on Next.js 15
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
```

### 在 Vercel 上保持快速

- **开启 cookie 缓存**（`session.cookieCache`）——在 Fluid Compute 函数中避免每个请求一次数据库读取。
- **用 Redis 做共享状态**——`vercel integration add upstash`，然后传入一个 `secondaryStorage` 适配器。会话和限速计数器迁移到 Redis；默认的内存限速器不会在函数实例之间共享状态。设置 `rateLimit.storage: "secondary-storage"`。
- **从子路径导入插件**以便 tree-shaking：`import { twoFactor } from "better-auth/plugins/two-factor"`，而不是 `"better-auth/plugins"`。
- **只在中间件中检查 cookie**——`getSessionCookie()` 是同步的，且在 Edge 运行时可用；在中间件中使用 `auth.api.getSession()` 需要 Node.js 运行时，并且每个请求都要付出一次数据库访问。
- **分离的前端源？** 将其添加到 `trustedOrigins`（允许通配符：`"https://*.vercel.app"`）。同源应用无需任何操作。

### 常见错误

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 从 Server Action 未设置 cookie | `nextCookies()` 缺失或不是 `plugins` 中的最后一个 | 将其添加为最后一个插件 |
| 中间件在 Edge 上缓慢或失败 | 中间件中的 `auth.api.getSession()` | 使用 `getSessionCookie()`；在页面中验证 |
| 独立前端上出现 "Invalid origin" | 源不受信任 | 将其添加到 `trustedOrigins` |
| 添加插件后出现类型错误或缺少表 | schema 未重新生成 | 重新运行 `npx auth@latest migrate` / `generate` |
| 适配器找不到模型 | 配置使用了数据库表名 | 使用 ORM 的**模型**名（`modelName: "user"`，不是 `"users"`） |
| 生产环境中限速每个请求都重置 | 默认的内存限速存储 | 使用 `secondaryStorage`（Redis）或 `rateLimit.storage: "database"` |
| Vercel 上回调 URL 错误 | `BETTER_AUTH_URL` 指向 localhost 或预览 | 在 Production 中设置生产域名；对 Preview 保持未设置 |

### 插件

服务端插件 + 匹配的客户端插件 + 重新运行迁移。

| 功能 | 服务端导入 | 客户端插件 |
|---------|--------------|---------------|
| 双因素（TOTP/OTP） | `twoFactor` 来自 `better-auth/plugins/two-factor` | `twoFactorClient` |
| 组织/团队 | `organization` 来自 `better-auth/plugins/organization` | `organizationClient` |
| 魔术链接 | `magicLink` 来自 `better-auth/plugins/magic-link` | `magicLinkClient` |
| 管理/用户管理 | `admin` 来自 `better-auth/plugins/admin` | `adminClient` |
| Passkeys（WebAuthn） | `passkey` 来自 `@better-auth/passkey` | `passkeyClient` |
| 企业 SSO（SAML/OIDC） | `sso` 来自 `@better-auth/sso` | — |
| Stripe 订阅 | `stripe` 来自 `@better-auth/stripe` | `stripeClient` |
| 通过 Vercel Connect 连接器登录 | `genericOAuth` 来自 `better-auth/plugins/generic-oauth` + `connect` 来自 `@vercel/connect/betterauth` | —（v1.7 用 `authClient.signIn.social` 登录；`genericOAuthClient` 仅存在于 v1.6 及更早版本） |

### 智能体工具

安装官方 Better Auth 技能以获取更深入、感知版本的指导（规划问卷、适配器、迁移、最佳实践）：

```bash
npx skills add better-auth/skills
```

文档按版本发布。匹配 lockfile 中的 `better-auth` 版本，然后从 [better-auth.com/llms.txt](https://better-auth.com/llms.txt) 或文档 MCP 服务器（`https://mcp.better-auth.com/mcp`，或 `npx auth@latest mcp --cursor` 注册它）开始。

## Descope

Descope 在 Vercel Marketplace 上可用，具有原生集成支持。

### 通过 Marketplace 安装

```bash
vercel integration add descope
```

### SDK 设置

```bash
npm install @descope/nextjs-sdk
```

### Provider 和 Proxy

```tsx
// app/layout.tsx
import { AuthProvider } from "@descope/nextjs-sdk";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </AuthProvider>
  );
}
```

```ts
// proxy.ts
import { authMiddleware } from "@descope/nextjs-sdk/server";

export default authMiddleware({
  projectId: process.env.DESCOPE_PROJECT_ID!,
  publicRoutes: ["/", "/sign-in"],
});
```

### 登录流程

```tsx
"use client";
import { Descope } from "@descope/nextjs-sdk";

export default function SignInPage() {
  return <Descope flowId="sign-up-or-in" />;
}
```

## Auth0

Auth0 提供成熟的认证平台，具有广泛的身份提供商支持。

### SDK 设置

```bash
npm install @auth0/nextjs-auth0
```

### 配置

```ts
// lib/auth0.ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();
```

必需的环境变量：

```env
AUTH0_SECRET=<random-secret>
APP_BASE_URL=http://localhost:3000   # optional: omit on Vercel previews and the SDK infers it from the request host
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=<client-id>
AUTH0_CLIENT_SECRET=<client-secret>
```

### Proxy

```ts
// proxy.ts
import { auth0 } from "@/lib/auth0";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

### 访问会话数据

```tsx
// Server component
import { auth0 } from "@/lib/auth0";

export default async function Page() {
  const session = await auth0.getSession();
  return session ? (
    <p>Hello, {session.user.name}</p>
  ) : (
    <a href="/auth/login">Log in</a>
  );
}
```

## Vercel 原生身份原语

这些不是 Clerk、Descope 或 Auth0 的替代品。它们涵盖身份来自 Vercel 本身或你需要 Vercel 持有密钥的情况。

### Sign in with Vercel

让用户使用他们的 Vercel 账户登录。Vercel 的身份提供商实现了 OAuth 2.0 和 OpenID Connect：在仪表板中注册一个 App，使用 PKCE（`code_challenge_method: 'S256'`）、`state` 和 `nonce` 重定向到 `https://vercel.com/oauth/authorize`，然后在 `https://api.vercel.com/login/oauth/token` 交换 `code`。访问令牌有效 1 小时；刷新令牌有效 30 天并在使用时轮换。绝不要在没有 PKCE、state 和 nonce 检查的情况下手工实现令牌交换。文档：https://vercel.com/docs/sign-in-with-vercel/getting-started

### Vercel Passport（部署保护）

Passport 使用你自己的 OIDC 身份提供商（Okta、Microsoft Entra ID、Auth0 或任何与 OIDC 兼容的提供商）保护整个部署。Vercel Connect 存储 OAuth 应用配置，Vercel 在任何请求到达你的代码之前重定向未认证的访客。对于内部工具和预览，使用它而不是应用级认证。你的应用可以在服务端读取经验证的访客身份，或将转发的 Passport 令牌作为 JWT 验证。Enterprise 计划；自 2026 年 7 月起 GA。文档：https://vercel.com/docs/passport

### Vercel KMS（托管签名密钥）

KMS 用永不离开 Vercel 的密钥对 JWT 和消息进行签名。在团队的 Key Management 设置中创建一个 issuer，安装 `@vercel/kms`，并在路由处理器或 Server Component 内调用 `signJWT({ issuerId, claims, ttl })`（解析为 `{ token, keyId, algorithm, fingerprint }`；`@vercel/kms` 0.3.0+，`signToken` 已弃用）；函数的 OIDC 令牌会自动授权该请求。依赖方使用 `https://kms.vercel.com/<issuerId>/jwks.json` 处发布的 JWKS 进行验证。使用它而不是在环境变量中存储私有签名密钥。文档：https://vercel.com/docs/kms

## 决策矩阵

| 需求 | 推荐 | 理由 |
|------|------------|-----|
| 在 Vercel 上最快的设置 | Clerk | 原生 Marketplace，自动配置环境变量 |
| 无密码/社交登录流程 | Descope | 可视化流程构建器，Marketplace 原生 |
| 企业 SSO / SAML / 多租户 | Auth0 | 深入的企业身份支持 |
| 预构建 UI 组件 | Clerk | 开箱即用的 `<SignIn />`、`<UserButton />` |
| Vercel 统一计费 | Clerk 或 Descope | 两者都是原生 Marketplace 集成 |
| 认证在你的数据库中，无托管供应商 | Better Auth | 在你的应用中运行，数据在你自己的数据库中，无需配置供应商仪表板 |
| 非 Next.js（SvelteKit、Nuxt、Hono、Expo、纯 Node） | Better Auth | 与框架无关的处理器 + 客户端适配器 |
| 组织、2FA、passkeys、SSO、Stripe（代码方式） | Better Auth | 带生成 schema 的插件系统 |
| 开发者工具的"使用 Vercel 登录" | Sign in with Vercel | Vercel 是身份提供商 |
| 将部署限制为 Okta/Entra 后的员工 | Vercel Passport | 平台级，无需应用代码 |
| 不存储私钥地签名 JWT | Vercel KMS | 托管密钥，OIDC 授权的签名 |

## Clerk Core 3 破坏性变更（2026 年 3 月）

Clerk 提供一个升级 CLI，它扫描你的代码库并应用 codemod：`npx @clerk/upgrade`。需要 **Node.js 20.9.0+**。

- **`SignedIn`/`SignedOut`/`Protect` 被 `Show` 取代** —— 例如 `<Protect role="admin">` → `<Show when={{ role: 'admin' }}>`
- **包重命名** —— `@clerk/clerk-react` → `@clerk/react`，`@clerk/clerk-expo` → `@clerk/expo`
- **`ClerkProvider` 必须位于 `<body>` 内部，而不是包裹 `<html>`** —— CLI 会自动处理这一点
- **`@clerk/types` 已移除** —— 从 SDK 自己的 `/types` 入口点导入类型，或对与框架无关的代码使用 `@clerk/shared/types`
- **重定向 props 重命名** —— `afterSignInUrl`/`afterSignUpUrl`/`redirectUrl` → `fallbackRedirectUrl`/`signUpFallbackRedirectUrl`/`forceRedirectUrl`
- **最低 Next.js 版本：15.2.8（或在 Next.js 16 上为 16.0.10）** —— 后续 15.x 次版本也需要各自修补的版本（15.3.8+、15.4.10+、15.5.9+）；Next.js 13 和 14 不再受支持
- **卫星域名** —— 应用不再在首次访问时自动重定向；在中间件和 `ClerkProvider` 中设置 `satelliteAutoSync: true` 以恢复 Core 2 行为
- **离线时 `getToken()` 抛出 `ClerkOfflineError`** —— 以前返回 `null`；登出时仍返回 `null`

## 交叉引用

- **Marketplace 安装和环境变量配置** → `⤳ skill: marketplace`
- **Proxy 和 Routing Middleware 模式** → `⤳ skill: routing-middleware`
- **从 CLI 或测试访问受保护的部署** → `⤳ skill: access-protected-vercel-deployment`
- **环境变量管理** → `⤳ skill: env-vars`
- **用于 Better Auth 的 Neon Postgres / Upstash Redis** → `⤳ skill: vercel-storage`
- **使用 Better Auth 通过 Vercel Connect 连接器登录（`@vercel/connect/betterauth`）；提供商 API 令牌使用 `getToken()`** → `⤳ skill: vercel-connect`

## 官方文档

- [Better Auth 文档](https://better-auth.com/docs) · [Next.js 集成](https://better-auth.com/docs/integrations/next) · [Sign in with Vercel](https://better-auth.com/docs/authentication/vercel)
- [Better Auth 智能体技能](https://github.com/better-auth/skills)
- [Clerk + Vercel Marketplace](https://clerk.com/docs/deployments/vercel)
- [Clerk Next.js 快速开始](https://clerk.com/docs/quickstarts/nextjs)
- [Descope Next.js SDK](https://docs.descope.com/getting-started/nextjs)
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Sign in with Vercel](https://vercel.com/docs/sign-in-with-vercel)
- [Vercel Passport](https://vercel.com/docs/passport)
- [Vercel KMS](https://vercel.com/docs/kms)
