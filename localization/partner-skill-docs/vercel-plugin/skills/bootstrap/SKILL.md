---
name: bootstrap
description: 面向依赖 Vercel 关联资源（数据库、认证和托管集成）的代码仓库的项目引导编排器。在设置或修复代码仓库时使用，以便关联、环境配置、环境变量拉取以及首次运行 db/dev 命令以正确的安全顺序执行。
metadata:
  priority: 8
  docs:
    - "https://vercel.com/docs/getting-started-with-vercel"
    - "https://nextjs.org/docs/app/getting-started/installation"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - '.env.example'
    - '.env.sample'
    - '.env.template'
    - 'README*'
    - 'docs/**/setup*'
    - 'package.json'
    - 'drizzle.config.*'
    - 'prisma/schema.prisma'
    - 'auth.*'
    - 'src/**/auth.*'
  bashPatterns:
    - '\\bcp\\s+\\.env\\.(?:example|sample|template)\\s+\\.env\\.local\\b'
    - '\\b(?:npm|pnpm|bun|yarn)\\s+run\\s+db:(?:push|seed|migrate|generate)\\b'
    - '\\b(?:npm|pnpm|bun|yarn)\\s+run\\s+dev\\b'
    - '\\bvercel\\s+link\\b'
    - '\\bvercel\\s+integration\\s+(?:add|install)\\b'
    - '\\bvercel\\s+env\\s+pull\\b'
  importPatterns:
    - '@neondatabase/serverless'
    - 'drizzle-orm'
    - '@upstash/redis'
    - '@vercel/blob'
    - '@vercel/edge-config'
    - '@vercel/global-config'
    - 'next-auth'
    - '@auth/core'
    - 'better-auth'
chainTo:
  -
    pattern: '@vercel/(postgres|kv)|\b(KV_REST_API_URL|POSTGRES_URL)\b'
    targetSkill: vercel-storage
    message: '@vercel/postgres and @vercel/kv are sunset — loading Vercel Storage guidance for Neon and Upstash migration.'
  -
    pattern: 'from\s+[''""](next-auth|@auth/core|@clerk/nextjs|better-auth)[''""]'
    targetSkill: auth
    message: 'Auth library detected during bootstrap — loading Auth guidance for Clerk Marketplace setup and middleware patterns.'
  -
    pattern: 'OPENAI_API_KEY|ANTHROPIC_API_KEY|AI_GATEWAY'
    targetSkill: env-vars
    message: 'AI provider env vars detected — loading Environment Variables guidance for OIDC-based auth via vercel env pull.'
    skipIfFileContains: 'VERCEL_OIDC|vercel env pull'
retrieval:
  aliases:
    - project setup
    - repo init
    - getting started
    - scaffold
  intents:
    - set up project
    - initialize repo
    - link vercel project
    - pull env vars
  entities:
    - vercel link
    - env pull
    - database setup
    - first run

---

# 项目引导编排器

严格按顺序执行引导。在项目关联和环境验证完成之前，不要运行迁移或开发服务器。

## 规则

- 在 Vercel 关联完成且环境键验证通过之前，不要运行 `db:push`、`db:migrate`、`db:seed` 或 `dev`。
- 对于共享资源，优先使用 Vercel 托管的配置（`vercel integration ...`）。
- 仅当 Vercel 集成流程不可用时，才将提供商 CLI 作为回退方案。
- 绝不要在终端输出、日志或摘要中回显密钥值。

## 预检

1. 确认 Vercel CLI 已安装并已认证。

```bash
vercel --version
vercel whoami
```

2. 通过检查 `.vercel/project.json` 确认代码仓库关联。
3. 如果未关联，在请用户选择之前检查可用的团队/项目：

```bash
vercel teams ls
vercel projects ls --scope <team>
vercel link --yes --scope <team> --project <project>
```

4. 按优先级顺序查找环境模板：`.env.example`、`.env.sample`、`.env.template`。
5. 如果缺失，创建本地环境文件：

```bash
cp .env.example .env.local
```

## 资源配置：Postgres

### 首选路径（Vercel 托管的 Neon）

1. 阅读集成设置指南：

```bash
vercel integration guide neon
```

2. 将 Neon 集成添加到 Vercel 范围：

```bash
vercel integration add neon --scope <team>
```

3. 验证预期的环境变量名存在于 Vercel 中，并在本地拉取：

```bash
vercel env ls
vercel env pull .env.local --yes
```

### 回退路径 1（Dashboard）

1. 通过 Vercel 仪表板集成 UI 配置 Neon。
2. 重新运行 `vercel env pull .env.local --yes`。

### 回退路径 2（Neon CLI）

仅当 Vercel 托管配置不可用时才使用 Neon CLI。创建资源后，在 Vercel 中添加所需的环境变量并再次拉取。

## AUTH_SECRET 生成

生成高熵密钥而不打印它，然后将其存储到 Vercel 并刷新本地环境：

```bash
AUTH_SECRET="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"
printf "%s" "$AUTH_SECRET" | vercel env add AUTH_SECRET production,preview
printf "%s" "$AUTH_SECRET" | vercel env add AUTH_SECRET development  # separate command: development-only adds default to Config
unset AUTH_SECRET
vercel env pull .env.local --yes
```

## 环境验证

将模板文件中的必需键与 `.env.local` 的键进行比较（仅名称，绝不比较值）：

```bash
template_file=""
for candidate in .env.example .env.sample .env.template; do
  if [ -f "$candidate" ]; then
    template_file="$candidate"
    break
  fi
done

comm -23 \
  <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$template_file" | cut -d '=' -f 1 | sort -u) \
  <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env.local | cut -d '=' -f 1 | sort -u)
```

仅当缺失键列表为空时才继续。

## 应用设置

在关联 + 环境验证之后：

```bash
npm run db:push
npm run db:seed
npm run dev
```

使用代码仓库的包管理器（`npm`、`pnpm`、`bun` 或 `yarn`），并且只运行 `package.json` 中存在的脚本。

## Next.js + shadcn 项目的 UI 基线

在关联和环境验证之后，在功能开发之前建立 UI 基础：
1. 添加一套基线基础组件：`npx shadcn@latest add button card input label textarea select switch tabs dialog alert-dialog sheet dropdown-menu badge separator skeleton table`
2. 在 `layout.tsx` 和 `globals.css` 中应用 Geist 字体修复。
3. 确认应用外壳使用 `bg-background text-foreground`。
4. 对于产品、管理和 AI 应用默认使用深色模式，除非代码仓库明显以营销为主。

## 引导验证

确认每个检查点：

- `vercel whoami` 成功。
- `.vercel/project.json` 存在且与所选项目匹配。
- Postgres 集成路径已完成（Vercel 集成、dashboard 或提供商 CLI 回退）。
- `vercel env pull .env.local --yes` 成功。
- 必需环境键的差集为空。
- 数据库命令状态已记录（`db:push`、`db:seed`、`db:migrate`、`db:generate`，视情况而定）。
- `dev` 命令启动时没有立即出现配置/认证/环境失败。

如果验证失败，停止并报告确切的失败步骤以及补救措施。

## 摘要格式

以以下格式返回最终的引导摘要：

```md
## Bootstrap Result
- **Linked Project**: <team>/<project>
- **Resource Path**: vercel-integration-neon | dashboard-neon | neon-cli
- **Env Keys**: <count> required, <count> present, <count> missing
- **Secrets**: AUTH_SECRET set in Vercel (value never shown)
- **Migration Status**: not-run | success | failed (<step>)
- **Dev Result**: not-run | started | failed
```

## 引导后续步骤

- 如果环境键仍然缺失，在 Vercel 中添加缺失的键并重新运行 `vercel env pull .env.local --yes`。
- 如果数据库命令失败，修复连接/schema 问题并只重新运行失败的 db 步骤。
- 如果 `dev` 失败，解决运行时错误，然后用包管理器的 `run dev` 重启。

## next-forge 项目

如果项目是用 `npx next-forge init` 搭建的（通过 `packages/auth` + `packages/database` + `@repo/*` 导入检测；包管理器在初始化时选择）：

1. 环境文件按应用划分（`apps/app/.env.local`、`apps/web/.env.local`、`apps/api/.env.local`），外加 `packages/database/.env`。
2. 用代码仓库的包管理器运行 `migrate` 脚本（而不是 `db:push`）——它会运行 `prisma format` + `prisma generate` + `prisma migrate dev`，并提示输入迁移名称。
3. 最少环境变量：`DATABASE_URL`、`NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_WEB_URL`、`NEXT_PUBLIC_API_URL`（URL 已为本地开发预配置）。
4. 可选服务（Clerk、Stripe、Resend、PostHog 等）最初可以跳过——键未设置的集成会在运行时跳过。删除从 `.env.example` 复制来的空 `KEY=""` 占位符：空字符串会使 `keys.ts` 的格式检查失败。
5. 部署为 3 个独立的 Vercel 项目，根目录分别为 `apps/app`、`apps/api`、`apps/web`。
