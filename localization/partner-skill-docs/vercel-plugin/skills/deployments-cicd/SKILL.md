---
name: deployments-cicd
description: Vercel 部署和 CI/CD 专家指南。在部署、提升、回滚、检查部署、使用 --prebuilt 构建，或为 Vercel 配置 CI 工作流文件时使用。
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/deployments"
    - "https://vercel.com/docs/git"
    - "https://vercel.com/docs/deployments/promoting-a-deployment"
    - "https://vercel.com/docs/deployment-checks"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - '.github/workflows/*.yml'
    - '.github/workflows/*.yaml'
    - '.gitlab-ci.yml'
    - 'bitbucket-pipelines.yml'
    - 'vercel.json'
    - 'apps/*/vercel.json'
  bashPatterns:
    - '\bvercel\s+deploy\b'
    - '\bvercel\s+--prod\b'
    - '\bvercel\s+promote\b'
    - '\bvercel\s+rollback\b'
    - '\bvercel\s+inspect\b'
    - '\bvercel\s+build\b'
    - '\bvercel\s+deploy\s+--prebuilt\b'
validate:
  -
    pattern: 'cron:\s*[''"]|from\s+[''"](node-cron)[''"]|cron\.schedule\('
    message: 'Manual cron scheduling detected. Use Vercel Cron Jobs (vercel.json crons) for platform-native scheduled tasks.'
    severity: recommended
    skipIfFileContains: 'vercel\.json.*crons|@vercel/cron'
retrieval:
  aliases:
    - deploy
    - ci cd
    - continuous deployment
    - release pipeline
  intents:
    - deploy to vercel
    - set up ci cd
    - promote deployment
    - rollback deploy
  entities:
    - vercel deploy
    - preview
    - production
    - rollback
    - promote
    - CI workflow
---

# Vercel 部署与 CI/CD

你是 Vercel 部署工作流专家——`vercel deploy`、`vercel promote`、`vercel rollback`、`vercel inspect`、`vercel build`，以及与 GitHub Actions、GitLab CI 和 Bitbucket Pipelines 的 CI/CD 流水线集成。

## 部署命令

### 预览部署

```bash
# Deploy from project root (creates preview URL)
vercel

# Equivalent explicit form
vercel deploy
```

使用 Git 集成时，每次向非生产分支推送都会自动创建预览部署。它们提供一个用于测试的唯一 URL。

### 生产部署

```bash
# Deploy directly to production
vercel --prod
vercel deploy --prod

# Force a new deployment (skip cache)
vercel --prod --force
```

### 本地构建，部署构建输出

```bash
# Build locally (uses preview env vars by default)
vercel build

# Build with production env vars
vercel build --prod

# Deploy only the build output (no remote build)
vercel deploy --prebuilt
vercel deploy --prebuilt --prod
```

**何时使用 `--prebuilt`：** 自定义 CI 流水线，你控制构建步骤、需要 CI 级别的构建缓存，或需要在构建和部署之间运行测试。

**Prebuilt 限制：**[系统环境变量在构建时缺失](https://vercel.com/docs/cli/deploy#when-not-to-use---prebuilt)，并且 Next.js Skew Protection 需要[自定义部署 ID](https://vercel.com/docs/skew-protection#custom-deployment-id)。

### 提升与回滚

```bash
# Stage a production deployment without assigning domains
vercel deploy --prod --skip-domain

# Promote it (instant, no rebuild)
vercel promote <deployment-url-or-id>

# Show pending rollback status (no argument does not roll back)
vercel rollback status

# Rollback to a specific deployment
vercel rollback <deployment-url-or-id>
```

**提升一个生产部署，而不是预览。** 提升已暂存的生产部署是即时的，并提供相同的构建。提升预览会用生产环境变量重新构建它，因此被测试的构建并不是发布的那一个。

**回滚会关闭自动分配。** 新的生产推送将停止上线，直到 `vercel promote` 恢复它。

### 检查部署

```bash
# View deployment details (build info, functions, metadata)
vercel inspect <deployment-url>

# List recent deployments
vercel ls

# View recent runtime logs for a deployment
vercel logs --deployment <url>
```

## CI/CD 集成

### 何时添加 CI 流水线

Git 集成会构建每次推送、在拉取请求上发布预览 URL，并部署生产分支。将 CI 用于 Vercel 不运行的内容：测试、安全扫描、性能预算和审批门禁。用 [Deployment Checks](references/deployment-checks.md) 在此之上为发布设置门禁，同时让 Vercel 持续构建。仅当构建必须在你的 runner 中运行时（例如为了使源代码不进入 Vercel，或用于 GitHub Enterprise Server），才从 CI 部署。

### 必需的环境变量

每个 CI 流水线都需要这三个变量：

```bash
VERCEL_TOKEN=<your-token>        # Personal or team token
VERCEL_ORG_ID=<org-id>           # From .vercel/project.json
VERCEL_PROJECT_ID=<project-id>   # From .vercel/project.json
```

在 CI 提供商中将它们设为密钥。绝不要将它们提交到源代码控制。CLI 从环境中读取 `VERCEL_TOKEN`；不要传入 `--token`，因为这会在进程列表和日志中暴露它。

### GitHub Actions

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production

      - name: Build
        run: vercel build --prod

      - name: Deploy
        run: vercel deploy --prebuilt --prod
```

### 其他 CI 流水线和后端访问

| 任务 | 阅读 |
| --- | --- |
| 从 GitHub Actions 在拉取请求上发布预览 URL，或从 GitLab CI 或 Bitbucket Pipelines 部署 | [references/cli-pipelines.md](references/cli-pipelines.md) |
| 让已部署的函数在没有静态密钥的情况下访问 AWS、GCP 或 Vault（OIDC 联合） | [references/oidc-federation.md](references/oidc-federation.md) |
| Deployment Checks，或从 CI 测试受保护的部署 | [references/deployment-checks.md](references/deployment-checks.md) |
| 实时状态（MCP） | [references/live-status.md](references/live-status.md) |

## 常见 CI 模式

### 仅发布经过测试的构建

对于 Git 部署，要求 [Deployment Checks](references/deployment-checks.md)。当 CI 使用 CLI 部署时，暂存一个生产部署、测试它，然后提升那个构建：

```yaml
env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  stage:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      # ... checkout, install, vercel pull --environment=production, vercel build --prod ...
      - id: deploy
        run: echo "url=$(vercel deploy --prebuilt --prod --skip-domain)" >> $GITHUB_OUTPUT

  e2e-tests:
    needs: stage
    runs-on: ubuntu-latest
    steps:
      # ... checkout, install, bypass header in playwright.config.ts (see references/deployment-checks.md) ...
      - run: npx playwright test
        env:
          BASE_URL: ${{ needs.stage.outputs.url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}

  promote:
    needs: [stage, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - run: npm install -g vercel
      - run: vercel promote ${{ needs.stage.outputs.url }}
```

## 用于 CI 的全局 CLI 标志

| 标志 | 用途 |
|------|---------|
| `--token <token>` | 认证；在 CI 中，改为设置 `VERCEL_TOKEN` |
| `--yes` / `-y` | 跳过确认提示 |
| `--scope <team>` | 以特定团队身份执行 |
| `--cwd <dir>` | 设置工作目录 |

## 最佳实践

1. **在 CI 中始终使用 `--prebuilt`** —— 将构建与部署分离，启用构建缓存和测试门禁
2. **在构建前使用 `vercel pull`** —— 确保正确的环境变量和项目设置
3. **仅发布经过测试的构建** —— Deployment Checks（Git）或暂存的生产构建（CLI）
4. **使用 OIDC 联合进行运行时后端访问** —— 让 Vercel 函数无需静态密钥即可认证到 AWS/GCP（不替代用于 CLI 的 `VERCEL_TOKEN`）
5. **在 CI 中固定 Vercel CLI 版本** —— `npm install -g vercel@latest` 可能意外出问题
6. **在 CI 中添加 `--yes` 标志** —— 防止交互式提示挂起流水线

## 部署策略矩阵

| 场景 | 策略 | 命令 |
|----------|----------|----------|
| 标准团队工作流 | Git 推送部署 | 推送到 main/feature 分支 |
| 自定义 CI/CD（Actions、CircleCI） | Prebuilt 部署 | `vercel build && vercel deploy --prebuilt` |
| 使用 Turborepo 的 Monorepo | 受影响的 + 远程缓存 | `turbo run build --affected` |
| 每个 PR 都有预览 | 默认行为 | 按分支自动创建预览 URL |
| 发布经过测试的构建 | Deployment Checks（Git）或暂存的生产（CLI） | 必需的检查，或 `vercel deploy --prod --skip-domain` → 测试 → `vercel promote <url>` |
| 带数据库迁移的原子部署 | 两阶段 | 运行迁移 → 验证 → `vercel promote` |
| 延迟敏感的区域数据 | Vercel Functions | 保持 Node.js 默认；将函数区域设在数据附近 |

## 常见构建错误

| 错误 | 原因 | 修复 |
|-------|-------|-----|
| `ERR_PNPM_OUTDATED_LOCKFILE` | Lockfile 与 package.json 不匹配 | 运行 `pnpm install`，提交 lockfile |
| `NEXT_NOT_FOUND` | 根目录配置错误 | 在 Project Settings 中设置 Root Directory |
| `Invalid next.config.js` | 配置语法错误 | 用 `next build` 在本地验证配置 |
| `functions/api/*.js` 不匹配 | 文件结构错误 | 移到 `app/api/` 目录（App Router） |
| `Error: EPERM` | 构建中的文件权限问题 | 不要在构建脚本中 `chmod`；使用 postinstall |

## 部署摘要格式

呈现一个结构化的部署结果块：

```
## Deploy Result
- **URL**: <deployment-url>
- **Target**: production | preview
- **Status**: READY | ERROR | BUILDING | QUEUED
- **Commit**: <short-sha>
- **Framework**: <detected-framework>
- **Build Duration**: <duration>
```

如果部署失败，追加：

```
- **Error**: <summary of failure from logs>
```

对于生产部署，还要包括：

```
### Post-Deploy Observability
- **Error scan**: <N errors found / clean> (scanned via vercel logs -q level:error --since 1h)
- **Drains**: <N configured / none>
- **Monitoring**: <active / gaps identified>
```

## 部署后续步骤

根据部署结果：

- **成功（预览）** → “访问预览 URL 进行验证。准备好后，运行 `/deploy prod` 提升到生产。”
- **成功（生产）** → “你的生产站点已上线。运行 `/status` 查看完整项目概览。”
- **构建错误** → “检查上面的构建日志。常见修复：验证 package.json 中的 `build` 脚本、用 `/env list` 检查缺失的环境变量、确保依赖已安装。”
- **缺少环境变量** → “运行 `/env pull` 在本地同步环境变量，或运行 `/env list` 查看 Vercel 上配置了什么。”
- **Monorepo 问题** → “在 Project Settings 中将 Root Directory 设置为应用的文件夹；`vercel.json` 没有 `rootDirectory` 键。”
- **检测到部署后错误** → “查看上面的错误。用 `vercel logs --deployment <url> -q level:error` 查看详情。如果配置了 drains，与外部监控关联。”
- **未配置监控** → “在下次生产部署前设置 drains 或安装错误跟踪集成。运行 `/status` 进行完整的可观测性诊断。”

## 官方文档

- [部署](https://vercel.com/docs/deployments)
- [Vercel CLI](https://vercel.com/docs/cli)
- [GitHub Actions](https://vercel.com/docs/git/vercel-for-github)
- [GitLab CI](https://vercel.com/docs/git/vercel-for-gitlab)
- [Bitbucket Pipelines](https://vercel.com/docs/git/vercel-for-bitbucket)
- [OIDC 联合](https://vercel.com/docs/oidc)
