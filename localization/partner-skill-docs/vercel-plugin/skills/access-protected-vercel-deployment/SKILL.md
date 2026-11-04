---
name: access-protected-vercel-deployment
description: 访问并测试受 Vercel Authentication、SSO 或 Deployment Protection 保护的 Vercel 部署。当 curl、agent-browser、Playwright 或其他自动化请求到达 Vercel 登录页或保护页时使用；当受保护的预览或生产 URL 返回 401 或 403 时使用；当出现 TRUSTED_SOURCES_ENVIRONMENT_MISMATCH 时使用；或在 `vercel curl` 与 `x-vercel-trusted-oidc-idp-token` 请求头之间做选择时使用。
summary: Access protected Vercel URLs with vercel curl or a short-lived OIDC token
metadata:
  priority: 8
  docs:
    - "https://vercel.com/docs/cli/curl"
    - "https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources"
    - "https://vercel.com/docs/oidc#in-local-development"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns: []
  bashPatterns:
    # Match vc curl for every hostname, including custom aliases.
    - '\b(?:vercel|vc)\s+curl\b'
    # Keep raw clients scoped to hostnames that identify themselves as Vercel.
    - '\b(?:curl|wget)\b[^\n]*\.vercel\.app\b'
    - '\bagent-browser\b[^\n]*(?:open|navigate|goto)[^\n]*\.vercel\.app\b'
    # Match custom aliases when the request includes an explicit Vercel protection header.
    - '\bx-vercel-(?:trusted-oidc-idp-token|protection-bypass)\b'
  importPatterns: []
  promptSignals:
    phrases:
      - "access protected vercel deployment"
      - "protected vercel deployment"
      - "deployment protection"
      - "vercel sso"
      - "vercel authentication page"
      - "behind vercel authentication"
      - "behind vercel sso"
      - "x-vercel-trusted-oidc-idp-token"
      - "trusted_sources_environment_mismatch"
      - "trusted sources environment mismatch"
      - "protection bypass"
    allOf:
      - [vercel, protected]
      - [vercel, sso]
      - [vercel, "403"]
      - [deployment, login]
      - [preview, protected]
      - [production, protected]
    anyOf:
      - "deployment"
      - "preview"
      - "production"
      - "curl"
      - "browser"
      - "authentication"
    noneOf:
      - "aws deployment protection"
      - "github deployment protection"
      - "kubernetes deployment protection"
    minScore: 6
retrieval:
  aliases:
    - protected Vercel deployment
    - Vercel SSO bypass
    - Vercel deployment authentication
    - Vercel Trusted Sources
  intents:
    - access a protected deployment
    - test a protected preview
    - verify a protected production deployment
    - authenticate browser automation to Vercel
  entities:
    - vercel curl
    - VERCEL_OIDC_TOKEN
    - x-vercel-trusted-oidc-idp-token
    - Trusted Sources
    - Deployment Protection
  examples:
    - preview is behind Vercel SSO
    - curl this protected Vercel deployment
    - access a protected Vercel deployment through a custom domain
    - open the protected production URL in agent-browser
---

# 访问受保护的 Vercel 部署

使用调用方现有的 Vercel 认证。不要禁用 Deployment Protection，也不要把索取长期有效的绕过密钥作为第一方案。

## 选择访问路径

### HTTP 请求：使用 `vercel curl`

对于响应体、响应头、健康检查和 API 调用，用 `vercel curl`（`vc curl`）替代原始 `curl`。它接受原生 curl 选项，并使用 Vercel 认证访问受保护的预览和生产部署。

```bash
vc curl https://my-app.vercel.app/api/health
vc curl https://app.example.com/api/health
vc curl my-app.vercel.app/api/users -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada"}'
vc curl /api/health
```

仅路径形式会指向已关联项目的生产部署。当确切部署很重要时，传入完整 URL。

如果认证失败，在更改保护设置之前检查本地身份和项目：

```bash
vc whoami
```

检查 `.vercel/project.json` 以确认已关联的项目和团队。仅在目录未关联或关联到错误项目时运行 `vc link`。仅在 CLI 报告没有可用的已认证用户时运行 `vc login`。

### 浏览器自动化：将开发 OIDC 令牌作为请求头附加

浏览器请求必须将短期本地令牌作为请求头包含在内：

```text
x-vercel-trusted-oidc-idp-token: <VERCEL_OIDC_TOKEN>
```

使用支持按源限定请求头的浏览器工具。使用 `agent-browser` 时，在不打印或持久化令牌的情况下注入开发变量：

```bash
vc env run -- sh -c \
  'test -n "$VERCEL_OIDC_TOKEN" && agent-browser open "$1" --headers "{\"x-vercel-trusted-oidc-idp-token\":\"$VERCEL_OIDC_TOKEN\"}"' \
  sh https://my-app.vercel.app
```

然后继续同一会话中的正常浏览器工作流。对于 Playwright 或其他浏览器驱动，在首次导航前在浏览器上下文的额外 HTTP 请求头中设置相同的请求头。

如果本地 CLI 版本无法通过 `vc env run` 提供令牌，用以下命令刷新本地开发凭据：

```bash
vc env pull .env.local --yes
```

通过项目现有的 dotenv 机制加载该文件。绝不要打印令牌、将其值粘贴到源代码中或提交 `.env.local`。

对 Trusted Sources 使用 `x-vercel-trusted-oidc-idp-token`。不要用 `x-vercel-oidc-token` 替代；该请求头是将 OIDC 令牌传入 Vercel Function，用途不同。

## Trusted Sources 规则

已关联 Vercel 项目的本地开发令牌默认可以访问同一项目的预览部署。它不会自动访问受保护的生产部署。对于受保护的生产部署，项目自身的 Trusted Sources 条目必须允许 `development` → `production`。

对于正常的同项目预览场景，不要要求用户配置 Trusted Sources。

在以下情况下需要配置：

- 目标是受保护的生产部署，且调用方使用本地开发令牌；
- 调用方属于另一个 Vercel 项目或团队；
- 目标项目的自访问规则已被自定义；或
- 响应为 `TRUSTED_SOURCES_ENVIRONMENT_MISMATCH`。

在目标项目中，打开 **Settings → Deployment Protection → Trusted Sources**。添加或编辑调用方，并允许所需的 `from` → `to` 环境对。本地令牌具有 `development` 环境，因此访问受保护的生产需要 `development` → `production`。

将此视为访问控制变更：说明所需的准确规则，并在更改前获得授权。不要扩大无关的环境对。

## 诊断响应

- Vercel 登录页、SSO 页或 Deployment Protection 页意味着请求未使用可接受的认证路径。
- `TRUSTED_SOURCES_ENVIRONMENT_MISMATCH` 意味着令牌有效，但其调用环境不允许到达目标环境。
- 在绕过 Vercel 保护后由应用生成的 `401` 或 `403` 属于应用自身的认证，必须单独调试。
- 标记为 `"target": "production"` 的部署仍可能受保护。不要假定生产是公开的。

## 避免

- 不要为了让自动化通过而禁用 Deployment Protection。
- 在收到保护页后不要反复发送原始未认证的 `curl`。
- 当 `vc curl` 或按源限定的 OIDC 请求头可以对请求进行认证时，不要启动交互式 SSO 浏览器登录。
- 不要在日志、截图、已提交文件或面向用户的输出中暴露 `VERCEL_OIDC_TOKEN`。

## 相关技能

- 一般 Vercel CLI 用法：`⤳ skill: vercel-cli`
- 端到端应用验证：`⤳ skill: verification`
