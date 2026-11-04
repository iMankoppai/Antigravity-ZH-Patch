---
name: env-vars
description: Vercel 环境变量专家指南。在处理 .env 文件、vercel env 命令、Secret 或 Config 变量类型、OIDC 令牌，或管理特定于环境的配置时使用。
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/environment-variables"
    - "https://vercel.com/docs/environment-variables/sensitive-environment-variables"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - '.env'
    - '.env.*'
    - '.env.local'
    - '.env.production'
    - '.env.development'
    - '.env.test'
    - '.env.production.local'
    - '.env.development.local'
    - '.env.test.local'
    - '.env.example'
  bashPatterns:
    - '\bvercel\s+env\s+pull\b'
    - '\bvercel\s+env\s+add\b'
    - '\bvercel\s+env\s+rm\b'
    - '\bvercel\s+env\s+ls\b'
    - '\bvercel\s+env\s+update\b'
    - '\bvercel\s+env\s+run\b'
chainTo:
  -
    pattern: '\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)\b'
    targetSkill: ai-gateway
    message: 'Direct provider API key detected — loading AI Gateway guidance for OIDC auth (no manual keys needed on Vercel).'
retrieval:
  aliases:
    - environment variables
    - env file
    - secrets
    - config vars
    - secret env var
    - sensitive env var
  intents:
    - set env var
    - manage secrets
    - pull env vars
    - configure environment
  entities:
    - .env
    - vercel env
    - OIDC
    - environment variable

---

# Vercel 环境变量

你是 Vercel 环境变量管理专家——`.env` 文件约定、`vercel env` CLI、OIDC 令牌生命周期以及特定于环境的配置。

## .env 文件层级

Vercel 和 Next.js 按特定顺序加载环境变量。后面的文件会覆盖前面的文件：

| 文件 | 用途 | 是否被 Git 跟踪？ |
|------|---------|-------------|
| `.env` | 所有环境的默认值 | 是 |
| `.env.local` | 本地覆盖和密钥 | **否**（已被 gitignore） |
| `.env.development` | 开发专属默认值 | 是 |
| `.env.development.local` | 本地开发覆盖 | **否** |
| `.env.production` | 生产专属默认值 | 是 |
| `.env.production.local` | 本地生产覆盖 | **否** |
| `.env.test` | 测试专属默认值 | 是 |
| `.env.test.local` | 本地测试覆盖 | **否** |

### 加载顺序（Next.js）

1. `.env`（最低优先级）
2. `.env.[environment]`（development、production 或 test）
3. `.env.local`（在测试环境中跳过）
4. `.env.[environment].local`（最高优先级）

### 关键规则

- **绝不要将密钥提交**到 `.env`、`.env.development` 或 `.env.production` —— 使用 `.local` 变体或 Vercel 环境变量
- `.env.local` 总是被 Next.js 的 gitignore 忽略——`vercel env pull` 将密钥写入这里
- 以 `NEXT_PUBLIC_` 为前缀的变量会暴露到浏览器包中——绝不要把密钥放入 `NEXT_PUBLIC_` 变量
- 所有其他变量仅在服务端可用（API 路由、Server Components、中间件）

## vercel env CLI

### 拉取环境变量

```bash
# Pull all env vars for the current environment into .env.local
vercel env pull .env.local

# Pull for a specific environment
vercel env pull .env.local --environment=production
vercel env pull .env.local --environment=preview
vercel env pull .env.local --environment=development

# Overwrite existing file without prompting
vercel env pull .env.local --yes

# Pull to a custom file
vercel env pull .env.production.local --environment=production
```

### 添加环境变量

每个变量都有一个类型：

| 类型 | 保存后 | 用于 |
|------|--------------|---------|
| **Secret** | 在仪表板和 `vercel env ls` 中隐藏；可以替换，但永远无法读回。生产和预览环境的 Secret 不会由 `vercel env pull` 返回。 | 密码、API 密钥、令牌、数据库 URL |
| **Config** | 有访问权限的成员可读 | 你稍后需要读取的非敏感值 |

部署在构建时和运行时都会收到这两种类型。Secret 和 Config 取代了 Sensitive 开关；现有的 Sensitive 变量都是 Secret。

```bash
# Interactive — prompts for value, environments, and type
vercel env add MY_SECRET

# Non-interactive: read the value from a file so it never lands in shell
# history or process arguments (echo "value" | ... and --value do both)
vercel env add MY_SECRET production < ./secret.txt

# Add to production and preview in one command
vercel env add MY_SECRET production,preview < ./secret.txt

# Set the type explicitly
vercel env add MY_SECRET production --type secret < ./secret.txt
vercel env add SITE_REGION production --type config < ./region.txt

# Add development in its own command; development-only adds default to Config
vercel env add MY_SECRET development < ./dev-secret.txt

# Update an existing value
vercel env update MY_SECRET production < ./secret.txt
```

- **默认值**：以非交互方式添加到生产、预览或自定义环境会存储为 Secret。
- **公开前缀始终是 Config**：诸如 `NEXT_PUBLIC_*` 或 `VITE_*` 的变量会暴露给浏览器，因此 CLI 拒绝为它们使用 `--type secret`。将私有值放在不带该前缀的名称下。
- **标志**：`--type config|secret` 需要 Vercel CLI 59.6 或更高版本。较旧的 CLI 使用 `--visibility`，现在它是 `--type` 的已弃用别名。`--sensitive`（Secret）和 `--no-sensitive`（Config）在每个版本中仍然可用。
- **团队策略**：**Separate Production Secret Values** 要求生产环境的 Secret 与同一键的预览、开发和自定义环境的值不同。在该策略下，创建独立的生产和非生产值，而不是向所有目标添加一个值。它取代了已弃用的 **Enforce Sensitive Environment Variables** 策略。

### 列出环境变量

```bash
# List all environment variables
vercel env ls

# Filter by environment
vercel env ls production
```

### 移除环境变量

```bash
# Remove from specific environment
vercel env rm MY_SECRET production

# Remove from all environments
vercel env rm MY_SECRET
```

## 引导流程（全新克隆 / 新机器）

从零开始设置项目时使用此步骤顺序：

```bash
# 1) Link first so pulls target the correct Vercel project
vercel link --yes --project <name-or-id> --scope <team>

# 2) Pull env vars into .env.local
vercel env pull .env.local --yes

# 3) Verify required keys from .env.example exist in .env.local
while IFS='=' read -r key _; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  grep -q "^${key}=" .env.local || echo "Missing in .env.local: $key"
done < .env.example
```

### 临时路径：使用 Vercel 环境变量运行而不写文件

如果你立即需要 Vercel 环境变量但还不想写入 `.env.local`：

```bash
vercel env run -- npm run dev
```

这适合在引导期间快速验证，但对于正常的本地工作流仍应拉取 `.env.local`。

### 在密钥或配置变更后重新拉取

在创建/更新密钥（`vercel env add`、仪表板更改）或配置会添加环境变量的集成（例如 Neon/Upstash）之后，重新运行：

```bash
vercel env pull .env.local --yes
```

## OIDC 令牌生命周期

Vercel 使用 **OIDC（OpenID Connect）** 令牌在你的应用与 Vercel 服务（AI Gateway、存储等）之间进行安全的无密钥认证。

### 工作方式

1. **在 Vercel 部署上**：`VERCEL_OIDC_TOKEN` 会作为短期 JWT 自动注入并自动刷新——无需任何配置
2. **本地开发**：`vercel env pull .env.local` 会配置一个有效期约 12 小时的 `VERCEL_OIDC_TOKEN`
3. **令牌过期**：当本地 OIDC 令牌过期时，重新运行 `vercel env pull .env.local --yes` 获取新令牌。考虑在每个开发会话开始时重新拉取，以避免会话中途出现认证失败

### 常见 OIDC 模式

```ts
// The @vercel/oidc package reads VERCEL_OIDC_TOKEN automatically
import { getVercelOidcToken } from '@vercel/oidc'

// AI Gateway uses OIDC by default — no manual token handling needed
import { gateway } from 'ai'
const result = await generateText({
  model: gateway('openai/gpt-5.2'),
  prompt: 'Hello',
})
```

### 排查 OIDC 问题

| 症状 | 原因 | 修复 |
|---------|-------|-----|
| 本地缺少 `VERCEL_OIDC_TOKEN` | 尚未拉取环境变量 | `vercel env pull .env.local` |
| 本地约 12 小时后出现认证错误 | 令牌过期 | `vercel env pull .env.local --yes` |
| 在 Vercel 上正常、本地失败 | `.env.local` 中没有令牌 | `vercel env pull .env.local` |
| `AI_GATEWAY_API_KEY` 与 OIDC | 两者都设置时，密钥优先 | 移除 `AI_GATEWAY_API_KEY` 以使用 OIDC |

## 特定于环境的配置

### Vercel 仪表板 vs .env 文件

| 用例 | 在哪里设置 |
|----------|-------------|
| 密钥（API 密钥、令牌） | Vercel 仪表板（`https://vercel.com/{team}/{project}/settings/environment-variables`）或 `vercel env add`，类型为 Secret |
| 公开配置（站点 URL、功能开关） | `.env` 或 `.env.[environment]` 文件 |
| 仅本地的覆盖 | `.env.local` |
| CI/CD 密钥 | 带环境范围限定的 Vercel 仪表板（`https://vercel.com/{team}/{project}/settings/environment-variables`） |

### Vercel 上的环境范围限定

在 Vercel 仪表板 `https://vercel.com/{team}/{project}/settings/environment-variables` 中设置的变量可以限定到：

- **生产** — 生产域名部署
- **预览** — 分支/PR 部署
- **开发** — `vercel dev` 和 `vercel env pull`

一个变量可以分配给一个、两个或全部三个环境。

### Git 分支覆盖

预览环境变量可以限定到特定的 Git 分支：

```bash
# Add a variable only for the "staging" branch
vercel env add DATABASE_URL preview --git-branch=staging < ./staging-database-url.txt
```

## 注意事项

### `vercel env pull` 会合并到现有文件

`vercel env pull .env.local` 会合并到现有文件。仅在本地定义的变量会被保留（记录为 `Kept <KEYS>`；Vercel CLI 56+）。同时也存在于 Vercel 上的键会采用拉取的值，因此其中某个的本地覆盖会被替换。当前的 CLI 还会为其无法读取的 Secret 保留真实的本地值，并始终刷新 `VERCEL_OIDC_TOKEN`。较旧的 CLI 会替换整个文件，因此请先备份自定义变量：

```bash
# Save custom vars before pulling
grep -v '^#' .env.local | grep -v '^VERCEL_\|^POSTGRES_\|^NEXT_PUBLIC_' > .env.custom.bak
vercel env pull .env.local --yes
cat .env.custom.bak >> .env.local  # Re-append custom vars
```

或者把自定义变量维护在单独的 `.env.development.local` 文件中（由 Next.js 在 `.env.local` 之后加载）。

### 拉取的文件省略生产和预览环境的 Secret

`vercel env pull --environment=production`（或 `preview`）不会写入 Secret 值，因此拉取的文件无法复现生产凭据。为本地工作保留单独的 Development 值，而不是试图把生产 Secret 复制到机器上。

### 脚本不会自动加载 `.env.local`

只有 Next.js 会自动加载 `.env.local`。独立脚本（`drizzle-kit`、`tsx`、自定义 Node 脚本）需要显式加载：

```bash
# Use dotenv-cli
npm install -D dotenv-cli
npx dotenv -e .env.local -- npx drizzle-kit push
npx dotenv -e .env.local -- npx tsx scripts/seed.ts

# Or source manually
source <(grep -v '^#' .env.local | sed 's/^/export /') && node scripts/migrate.js
```

## 最佳实践

1. **将 `vercel env pull` 作为设置工作流的一部分** —— 在 README 中记录它
2. **绝不要硬编码密钥** —— 始终使用环境变量
3. **范围收窄** —— 不要给预览部署生产数据库访问权限
4. **在本地开发中定期轮换 OIDC 令牌** —— 看到认证错误时重新拉取
5. **使用 `.env.example`** —— 提交一个值为空的模板，让队友知道需要哪些变量
6. **给客户端变量加 `NEXT_PUBLIC_` 前缀** —— 且绝不要把密钥放进去
7. **把自定义变量保留在 `.env.development.local` 中** —— 保护它们不被 `vercel env pull` 覆盖

## 官方文档

- [环境变量](https://vercel.com/docs/environment-variables)
- [Vercel CLI：env](https://vercel.com/docs/cli/env)
- [Secret 和 Config 类型](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types)
- [Next.js 环境变量](https://nextjs.org/docs/app/guides/environment-variables)
