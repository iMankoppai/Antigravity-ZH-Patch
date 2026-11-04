---
name: auth0
description: 当添加、修复或改进应用对用户的身份认证方式或 API 的保护方式时使用，或在使用或配置任何 Auth0 功能时使用 —— 用户登录与登出、会话与令牌、路由和端点保护、MFA、无密码通行密钥登录（WebAuthn）、SSO、Organizations、RBAC、自定义域、用于托管账户和组织自助服务的 Universal Portals，或 Universal Login 品牌定制。也用于审计租户的健康状况、安全性和套餐匹配度（CheckMate），调试认证流程为何失败，从其他认证提供商迁移，或设置 Vercel 原生集成。涵盖任何 Web、移动或后端框架以及每个 Auth0 SDK、工具和 API。即使用户从未提到 Auth0 也使用。
license: Apache-2.0
metadata:
  author: Auth0 <support@auth0.com>
  version: '2.6.0'
  openclaw:
    emoji: "\U0001F510"
    homepage: https://github.com/auth0/agent-skills
    requires:
      bins:
        - auth0
    os:
      - darwin
      - linux
    install:
      - id: brew
        kind: brew
        formula: auth0
        bins: [auth0]
        label: 'Install Auth0 CLI (brew)'
---

# Auth0

检测意图 → 检测框架 → 检测工具 → 加载 2–3 个参考文件。

---

## 第 1 步：检测意图

将请求与**开发者想要什么**这一列进行匹配 —— 它用平实语言描述目标，而不只是 Auth0 术语。你选中的**意图**是一个查找键：在第 4 步中，它会逐字出现为章节标题（`### feature:mfa`），列出要加载哪些参考文件。

| 开发者想要什么（平实语言 + Auth0 术语） | 意图 |
|---|---|
| 向应用添加登录、注册、登录入口，"让用户登录 / 创建账户"，或以其他方式在应用或脚本中添加并使用 Auth0 SDK | **integrate** |
| 在密码**之后**要求第二步 —— 一次性验证码、短信或邮件验证码、身份验证器应用，或用作*附加*因素的通行密钥/指纹/面容/安全密钥；或在敏感操作前重新确认身份。*Auth0：multi-factor authentication（MFA）、two-factor（2FA）、two-step verification、step-up authentication。* | **feature:mfa** |
| 让用户**改用**通行密钥、指纹或 Face ID 而非密码进行注册或登录 —— 无密码 WebAuthn 作为主要凭据 —— 或让已登录用户向其账户添加通行密钥。*Auth0：passkeys、WebAuthn、passwordless login。* | **feature:passkeys** |
| 让不同的公司、团队、工作区或租户各自拥有自己的用户、成员、角色和登录 —— 通常是面向企业销售的产品。*Auth0：Organizations、multi-org、B2B SaaS。* | **feature:organizations** |
| 让企业客户通过输入工作邮箱，路由到其雇主的登录页，从而通过其公司的身份提供商登录。*Auth0：Enterprise Connect、B2B Connect - Enterprise、enterprise SSO。* | **feature:enterprise-connect** |
| 部署一个用于个人资料、通行密钥、MFA 或组织详情的托管自助服务门户，而不是自行构建“My Account”或“My Organization”UI。*Auth0：Universal Portals、My Account portal、My Organization portal。* | **feature:universal-portals** |
| 从你自己的网址（例如 `login.example.com`、`auth.company.com`）提供登录页面，而不是使用默认的 Auth0 URL。*Auth0：custom domain。* | **feature:custom-domains** |
| 使用你自己的代码或框架构建完全自定义的登录/注册页面，超出主题设置所能实现的范围。*Auth0：Advanced Customization for Universal Login（ACUL）。* | **feature:acul** |
| 更改登录页面的外观 —— logo、颜色、字体、背景、整体主题。*Auth0：branding、Universal Login customization。* | **feature:branding** |
| 将令牌绑定到客户端，使被盗或泄露的令牌无法从另一台机器被重用/重放。*Auth0：DPoP（Demonstrating Proof-of-Possession）、sender-constrained tokens。* | **feature:dpop** |
| 用外部或合作伙伴令牌（遗留系统、MCP/智能体，或另一个 IdP）换取 Auth0 令牌，无需交互式登录。*Auth0：Custom Token Exchange（CTE）、RFC 8693、subject_token。* | **feature:custom-token-exchange** |
| 以已登录用户的身份调用第三方 API（Google、GitHub、Slack）。*Auth0：Token Vault、Connected Accounts。* | **feature:token-vault** |
| 审计租户的安全/配置问题，出具报告，然后可选地修复发现的问题。*Auth0：tenant audit、CheckMate。* | **audit** |
| 检查租户是否健康且处于合适的套餐 —— 两个评分 + 一项建议。*Auth0：health check。* | **healthcheck** |
| 询问最佳实践、"这样安全吗？"、如何安全地处理令牌、"我应该怎么做 X"。*Auth0：guidance / security。* | **guidance** |
| 遇到错误：401 Unauthorized、403 Forbidden、CORS、回调 URL 不匹配、重定向循环。*Auth0：debugging。* | **debug** |
| 遇到速率限制：429 Too Many Requests、配额超限。*Auth0：rate limits。* | **debug:rate-limit** |
| 将现有应用从 Clerk、NextAuth.js、Firebase、Cognito、Okta、Supabase、Passport.js 或其他认证提供商迁移走。*Auth0：provider migration。* | **migrate** |
| 将 Auth0 SDK 本身升级到新的大版本（例如 Auth0.swift v2→v3、Auth0.Android v3→v4）—— 破坏性变更、弃用的 API、"更新到最新 SDK"。*Auth0：SDK major-version upgrade。* | **upgrade-sdk** |
| 安装 Auth0 的 Vercel Marketplace 集成、将 Auth0 连接到 Vercel 项目，或将 Auth0 配置同步到托管在 Vercel 上的 Next.js 应用。*Auth0：Vercel native integration。* | **integrate** |
| 直接使用 Auth0 CLI —— "用 `auth0` CLI 创建应用/API"、编写租户设置脚本，或在 CI 中自动化 Auth0 配置 —— 不涉及应用框架。*Auth0：CLI / tooling-only。* | **tooling** |

### 如果没有任何明确匹配

选择最接近的目标。如果目标确实不清楚，询问开发者想要达成什么 —— 不要猜测意图。

---

## 第 2 步：检测框架

> **对于 `tooling` 意图，跳过此步骤** —— 以 CLI 为先的请求没有框架。转到第 3 步，加载 tooling 参考；只有当开发者之后转向将认证集成到应用中时，才询问框架。

自上而下处理。**在第一个能得出框架的层级处停止。**

### 第 1 层 —— 已安装 Auth0 SDK（最强信号）

### Node.js / JavaScript / TypeScript —— 检查 `package.json` → `dependencies`

各行按最具体的在前排列：Ionic/Capacitor 项目也会带有基础 SDK，因此要在其之前先检查 `@capacitor/browser` 相关行。

| 包 | 框架 |
|---|---|
| `@capacitor/browser` + `@auth0/auth0-angular` | `ionic-angular` |
| `@capacitor/browser` + `@auth0/auth0-react` | `ionic-react` |
| `@capacitor/browser` + `@auth0/auth0-vue` | `ionic-vue` |
| `@auth0/nextjs-auth0` | `nextjs` |
| `@auth0/auth0-nuxt` | `nuxt` |
| `@auth0/auth0-tanstack-start-react` | `tanstack-start` |
| `@auth0/auth0-react` | `react` |
| `@auth0/auth0-vue` | `vue` |
| `@auth0/auth0-angular` | `angular` |
| `@auth0/auth0-spa-js` | `spa-js` |
| `express-openid-connect` | `express` |
| `@auth0/auth0-fastify` | `fastify` |
| `@auth0/auth0-fastify-api` | `fastify-api` |
| `express-oauth2-jwt-bearer` | `express-jwt` |
| `react-native-auth0` + `app.json` or `app.config.js` present | `expo` |
| `react-native-auth0` (no Expo files) | `react-native` |
| `@auth0/auth0-api-js` | `auth0-api-js` |
| `@auth0/auth0-server-js` | `auth0-server-js` |
| `@auth0/auth0-auth-js` | `auth0-auth-js` |
| `auth0` (the bare package, not `@auth0/*`) | `node-auth0` |

### Python —— 检查 `requirements.txt` 或 `pyproject.toml`

各行按最具体的在前排列：`auth0-server-python` 是与框架无关的服务器核心，因此在回退到裸 SDK 行之前，先检查是否有同时安装的 Web 框架。

| 包 | 框架 |
|---|---|
| `auth0-server-python` + `flask` | `flask` |
| `auth0-server-python` (no Flask web framework) | `server-python` |
| `auth0-fastapi-api` | `fastapi-api` |
| `auth0-api-python` | `api-python` |

### Java / Kotlin —— 检查 `build.gradle` 或 `pom.xml`

| 依赖 | 框架 |
|---|---|
| `mvc-auth-commons` (`com.auth0:mvc-auth-commons`) | `java-mvc` |
| `spring-security-oauth2-resource-server` | `springboot-api` |

### .NET —— 检查 `*.csproj` 或 `NuGet.Config`

| 包 | 框架 |
|---|---|
| `Auth0.AspNetCore.Authentication` (no `.Api` suffix) | `aspnetcore-auth` |
| `Auth0.AspNetCore.Authentication.Api` | `aspnetcore-api` |
| `Auth0.OidcClient.MAUI` | `maui` |
| `Auth0.OidcClient.AndroidX` | `net-android` |
| `Auth0.OidcClient.iOS` | `net-ios` |
| `Auth0.OidcClient.WinForms` | `winforms` |
| `Auth0.OidcClient.WPF` | `wpf` |

### PHP —— 检查 `composer.json`

`auth0/auth0-php` 通过 `SdkConfiguration` 的 `strategy` 同时驱动 PHP Web 应用和 API。`STRATEGY_API` 行更具体 —— 先检查它。

| 包 | 框架 |
|---|---|
| `auth0/auth0-php` + `SdkConfiguration::STRATEGY_API` (or `strategy: 'api'`) | `php-api` |
| `auth0/auth0-php` (no `STRATEGY_API` / `STRATEGY_REGULAR` or `strategy: 'webapp'`) | `php` |
| `auth0/login` (laravel, no `AuthorizationGuard`) | `laravel` |
| `auth0/login` + `AuthorizationGuard` | `laravel-api` |

> 如果已安装 `auth0/auth0-php` 但尚未设置 `SdkConfiguration` 策略（全新项目），则落到下面的变体消歧。

### Go —— 检查 `go.mod`

| 模块 | 框架 |
|---|---|
| `github.com/auth0/go-jwt-middleware` | `go` |

### 移动端（原生）

| 信号 | 框架 |
|---|---|
| `build.gradle(.kts)` + `com.auth0.kmp:auth0` (Kotlin Multiplatform module) | `kmp` |
| `Package.swift` or `.xcodeproj` + Auth0.swift | `swift` |
| `build.gradle` + `com.auth0.android:auth0` | `android` |
| `pubspec.yaml` + `auth0_flutter` + developer names/targets Windows desktop | `flutter-windows` |
| `pubspec.yaml` + `auth0_flutter` + `flutter.web: false` | `flutter-native` |
| `pubspec.yaml` + `auth0_flutter` + web enabled | `flutter-web` |

### 第 2 层 —— 从非 Auth0 的工作区依赖推断框架

如果没有匹配到 Auth0 SDK，则从普通（非 Auth0）依赖中检测框架。**在第一个匹配处停止。** 这选出的是基础框架；任何 Web 与 API 的变体都在下面的“变体消歧”中解决。与第 1 层一样，要在其基础框架之前先检查 `@ionic/*` 相关行。

| 信号 | 基础框架 |
|---|---|
| `package.json` 中的 `next` | `nextjs` |
| `package.json` 中的 `nuxt` | `nuxt` |
| `package.json` 中的 `@tanstack/react-start` | `tanstack-start` |
| `@ionic/*` + `@angular/core` | `ionic-angular` |
| `@ionic/*` + `react` | `ionic-react` |
| `@ionic/*` + `vue` | `ionic-vue` |
| `package.json` 中的 `@angular/core` | `angular` |
| `package.json` 中的 `vue`（无 `nuxt`） | `vue` |
| `package.json` 中的 `expo` | `expo` |
| `react-native`（无 `expo`） | `react-native` |
| `react`（上方没有元框架） | `react`（SPA）—— 见注释 |
| `package.json` 中的 `express` | `express`（变体见下） |
| `package.json` 中的 `fastify` | `fastify`（变体见下） |
| `requirements.txt`/`pyproject.toml` 中的 `flask` | `flask` |
| `requirements.txt`/`pyproject.toml` 中的 `fastapi` | `fastapi-api`（变体见下） |
| `pom.xml`/`build.gradle` 中的 `spring-boot` | `springboot-api` |
| `composer.json` 中的 `laravel/framework` | `laravel`（变体见下） |
| 存在 `composer.json`（无 Laravel） | `php`（变体见下） |
| 存在 `go.mod` + HTTP 服务器/路由器 | `go` |
| `org.jetbrains.kotlin.multiplatform` 插件 + `commonMain` 源集（共享 Android+iOS 模块） | `kmp` |
| `Package.swift` 或 `.xcodeproj` | `swift` |
| `pubspec.yaml`（Flutter）+ 开发者名称/目标为 Windows 桌面 | `flutter-windows` |
| `pubspec.yaml`（Flutter，禁用 Web） | `flutter-native` |
| `pubspec.yaml`（Flutter，启用 Web） | `flutter-web` |
| 引用 MAUI 的 `*.csproj` | `maui` |
| `*.csproj`（WinForms） | `winforms` |
| `*.csproj`（WPF） | `wpf` |
| `*.csproj` ASP.NET（Web 应用或 API） | `aspnetcore`（变体见下） |

> **`react` 说明：** 普通 React 项目若使用 React SDK，则映射为 SPA 的 `react`；若应用是与框架无关的原生 JS，则为 `spa-js`。如果不清楚，加载前先询问。

### 第 3 层 —— 从提示词推断框架

如果没有任何工作区信号匹配，则映射请求中提到的框架或语言。**在第一个匹配处停止。**

| 开发者提到…… | 框架 |
|---|---|
| Next.js / `next` | `nextjs` |
| Nuxt | `nuxt` |
| TanStack Start (React) | `tanstack-start` |
| Angular（非 Ionic） | `angular` |
| Vue（非 Nuxt/Ionic） | `vue` |
| React SPA（非 Next.js） | `react` |
| 原生 JS / 纯 JS / 无框架 SPA | `spa-js` |
| node-auth0 / `auth0` npm 包 | `node-auth0` |
| `@auth0/auth0-api-js` / auth0-api-js / 低级资源服务器 SDK | `auth0-api-js` |
| `@auth0/auth0-server-js` / auth0-server-js / 服务端 Auth0 会话 SDK | `auth0-server-js` |
| `@auth0/auth0-auth-js` / auth0-auth-js / AuthClient / 低级 OAuth OIDC | `auth0-auth-js` |
| Express（Web 应用 / 服务端渲染） | `express` |
| Express API / 保护 API 路由 | `express-jwt` |
| Fastify（Web）/ Fastify API | `fastify` / `fastify-api` |
| Flask | `flask` |
| FastAPI（Web 应用）/ FastAPI API | `server-python` / `fastapi-api` |
| `auth0-server-python` / 与框架无关的 Python 服务器 SDK / 没有专门参考的 Python OIDC Web 服务器（Django、Starlette、Sanic、Quart、aiohttp） | `server-python` |
| `auth0-api-python` / Python API JWT 校验器（资源服务器 / `verify_access_token`） | `api-python` |
| Spring Boot | `springboot-api` |
| Java MVC / Servlet | `java-mvc` |
| ASP.NET Core Web 应用 / API | `aspnetcore-auth` / `aspnetcore-api` |
| MAUI / WinForms / WPF | `maui` / `winforms` / `wpf` |
| PHP Web 应用 / PHP API | `php` / `php-api` |
| Laravel Web 应用 / Laravel API | `laravel` / `laravel-api` |
| Go / Golang API | `go` |
| Kotlin Multiplatform / KMP / 共享 Android+iOS 认证代码 / `com.auth0.kmp` | `kmp` |
| Swift / iOS | `swift` |
| Android / Kotlin | `android` |
| Flutter（原生 / Web / Windows） | `flutter-native` / `flutter-web` / `flutter-windows` |
| React Native / Expo | `react-native` / `expo` |
| Ionic (Angular/React/Vue) | `ionic-angular` / `ionic-react` / `ionic-vue` |

### 变体消歧（Web 应用 vs API）

某些框架有单独的 Web 应用和 API 参考。当第 1 层没有确定变体时，按**意图优先**选择：

| 基础 | Web 应用变体 | API 变体 | 在以下情况选择 API…… |
|---|---|---|---|
| express | `express` | `express-jwt` | 保护 API 路由 / 校验 JWT，无服务端渲染 UI |
| fastify | `fastify` | `fastify-api` | 资源服务器 / 仅 JWT 校验 |
| fastapi | `server-python` | `fastapi-api` | 资源服务器 / 仅 JWT 校验；带登录/登出 UI 的 Web 应用使用 `server-python` |
| php | `php` | `php-api` | 构建/保护 PHP API，无 Web UI |
| laravel | `laravel` | `laravel-api` | 仅 API（令牌守卫），无 Blade UI |
| aspnetcore | `aspnetcore-auth` | `aspnetcore-api` | Web API / JWT bearer，无 cookie 登录 UI |

如果意图仍然不明确（既有 UI 又有受保护的端点，或不清楚），在加载前**说明你检测到什么，并询问开发者**是 Web 应用还是 API。

### 如果没有任何匹配

询问开发者使用的是什么框架/语言。不要猜测。

### 冲突

如果第 2 层（工作区）与第 3 层（提示词）实质不一致（例如提示词说是 "Next.js"，但 `package.json` 中没有 `next`），**说明冲突并询问**，而不是悄悄选择。当两者都存在且一致时，工作区信号优先于提示词。

---

## 第 3 步：检测工具

阅读项目文件树和请求 —— 这是基于项目上下文的判断，而非产品偏好。

| 项目具有…… | 加载 |
|---|---|
| `terraform/` 目录或任何 `*.tf` 文件 | `tooling-terraform/index.md` |
| 此智能体会话中处于活动状态的 Auth0 MCP 服务器 | `tooling-mcp/index.md` |
| 请求 Auth0 Vercel Marketplace/原生集成，或将 Auth0 连接到 Vercel 项目 | `tooling-vercel/index.md` |
| 其他任何情况（默认） | `tooling-cli/index.md` |

---

## 第 4 步：加载参考文件

找到下面标题与你第 1 步选中的**意图**相匹配的章节，然后阅读其中列出的参考文件。

### integrate
```
Read: references/framework-{framework}/index.md
Read: references/tooling-{tooling}/index.md
Follow the integration workflow in references/framework-{framework}/index.md.
Use references/tooling-{tooling}/index.md for all Auth0 tenant configuration steps.
```

### feature:mfa
```
Read: references/feature-mfa/index.md
Read: references/tooling-{tooling}/index.md
```

### feature:passkeys
```
Read: references/feature-passkeys/index.md
Then Read the detected SDK's passkey leaf from the hub's "Example code snippets" table (e.g. nextjs → nextjs-auth0.md; react-native/expo → ONLY react-native-auth0.md, which covers react-native-web — never auth0-react.md) — it has the exact API and ceremony; don't implement from framework-{framework}/index.md alone.
Read: references/tooling-{tooling}/index.md
If framework detected: Read references/framework-{framework}/index.md
```

### feature:organizations
```
Read: references/feature-organizations/index.md
Read: references/tooling-{tooling}/index.md
If framework detected: Read references/framework-{framework}/index.md
If multi-tenant architecture / B2B SaaS design question: also Read references/pattern-multi-tenant/index.md
```

### feature:enterprise-connect
```
Read: references/feature-enterprise-connect/index.md
Read: references/tooling-{tooling}/index.md
If framework detected: Read references/framework-{framework}/index.md
```

### feature:universal-portals
```
Read: references/feature-universal-portals/index.md
Read: references/tooling-{tooling}/index.md
```

### feature:custom-domains
```
Read: references/feature-custom-domains/index.md
Read: references/tooling-{tooling}/index.md
```

### feature:acul
```
Read: references/feature-acul/index.md
Read: references/tooling-{tooling}/index.md
```

### feature:branding
```
Read: references/feature-branding/index.md
Read: references/tooling-{tooling}/index.md
```

### feature:dpop
```
Read: references/feature-dpop/index.md
Read: references/tooling-{tooling}/index.md
If a SPA framework is detected (vue/react/angular/spa-js): Read references/framework-{framework}/index.md
DPoP is SPA-only (no SSR: Next.js/Nuxt) — feature-dpop/index.md states the exclusion.
```

### feature:custom-token-exchange
```
Read: references/feature-custom-token-exchange/index.md
Read: references/tooling-{tooling}/index.md
If framework detected: Read references/framework-{framework}/index.md
```

### feature:token-vault
```
Read: references/feature-token-vault/index.md
Read: references/tooling-{tooling}/index.md
If framework detected: Read references/framework-{framework}/index.md
```

### guidance
```
Read: references/pattern-security/index.md
If framework detected: Read references/framework-{framework}/index.md (for SDK-specific guidance — token storage, session handling, route protection)
If token handling / JWT vs opaque / storage: Read references/pattern-token-handling/index.md
If multi-tenant / B2B architecture: Read references/pattern-multi-tenant/index.md + references/feature-organizations/index.md
```

### debug
```
Read: references/pattern-common-errors/index.md
If framework detected: Read references/framework-{framework}/index.md
```

### debug:rate-limit
```
Read: references/pattern-rate-limiting/index.md
```

### migrate
```
Read: references/feature-migration/index.md
Read: references/tooling-{tooling}/index.md
If framework detected: Read references/framework-{framework}/index.md
```

### audit
```
Read: references/feature-audit/index.md
Read: references/feature-audit-pricing/index.md
Read: references/feature-audit-remediation/index.md
Read: references/tooling-{tooling}/index.md
Apply findings only with per-command confirmation; verify each change by re-fetch.
```

### healthcheck
```
Read: references/feature-healthcheck/index.md
Read: references/feature-audit/index.md
Read: references/feature-audit-pricing/index.md
Read: references/feature-audit-remediation/index.md
Read: references/tooling-{tooling}/index.md
If a scan can run, do the audit workflow first, then score and recommend a plan. If not, score capability fit and recommend anyway. Never quote Enterprise pricing.
```

### upgrade-sdk
```
Read: references/framework-{framework}/index.md
Follow its "Major Version Migration" section (e.g. Auth0.swift v3, Auth0.Android v4).
This is an Auth0 SDK version bump — NOT a provider migration. Do not load feature-migration/index.md.
If no framework is detected: ask which Auth0 SDK the developer is upgrading.
```

### tooling
```
Read: references/tooling-{tooling}/index.md
No framework file — this is a CLI/tooling-only task (create apps/APIs, script
tenant setup, automate config in CI). If the developer then wants to integrate
auth into an app, return to Step 1 with the integrate intent.
```
