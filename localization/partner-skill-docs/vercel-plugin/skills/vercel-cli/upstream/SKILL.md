---
name: vercel-cli
description: 从命令行部署、管理、检查和排查 Vercel 项目。用于 Vercel 部署、Vercel Toolbar 评论、构建失败、项目和团队、环境变量、域名和 DNS、日志、指标、Speed Insights、Core Web Vitals、请求追踪、用量、活动、警报、防火墙规则、缓存、cron 任务、部署钩子、Edge Config、功能开关（`vercel flags`）、集成、连接器、Blob 存储、Container Registry（VCR）、微前端、滚动发布、自定义环境、Sandbox、智能体/MCP 设置、预览访问、本地开发，或 `vercel api` 回退。
---

# Vercel CLI 技能

Vercel CLI（`vercel` 或 `vc`）从命令行在 Vercel 平台上部署、管理和开发项目。对任何命令使用 `vercel <command> --help` 查看完整的标志详情。

已安装的 CLI 帮助是晦涩或新增标志的事实来源。如果这里的命令示例不够，请在行动前查看 `vercel <command> --help`，而不要猜测。

只从 stdout 解析 URL 和 JSON。警告、进度和 `--help` 打印到 stderr；仅在搜索帮助文本时合并流。某些帮助命令在打印用法后以 2 退出，因此应将打印出的用法视为成功读取了帮助。

在智能体/非交互模式下，许多命令将错误和必需确认作为 stdout 上的单个 JSON 对象报告，包含 `status`、`reason`、`hint` 和 `next`（可运行的后续命令）。在确认建议的 `next` 命令保留了用户预期的目标和授权之后，优先使用它，而不是自行组合重试；不要自动运行关联、认证或变更类后续命令。诸如 `list`、`logs`、`inspect` 和 `api` 等读取命令保持其正常输出形态。

## 关键：项目关联

项目上下文取决于命令的工作目录。在执行有影响的读取或变更之前，从预期的目录运行 `vercel project inspect --non-interactive`，并确认报告的 owner 和项目。该命令在非交互模式下只解析已存在的上下文；遇到 `link_required` 或目标不匹配时停止，而不要自动关联。

许多项目感知命令还接受 `--project <name-or-id>` 和 `--scope <team>`，用于显式的一次性目标。在使用前确认该目标和 scope 符合用户意图。

- **`<cwd>/.vercel/project.json`**：由 `vercel link` 创建。这个确切工作目录的关联优先于代码仓库关联。当从任意子目录运行时，CLI 通常不会继承根部的 `project.json`。
- **`<repo-root>/.vercel/repo.json`**：由 `vercel link --repo` 创建。CLI 选择包含工作目录的最深项目目录。
- **未匹配的代码仓库路径**：如果没有代码仓库映射包含工作目录，交互式代码仓库解析会在已配置的项目中提示选择。非交互式代码仓库解析当前会选择唯一已配置的项目，或在存在多个选项时保持未解析。设置项目的命令随后可能进入关联流程，因此非交互模式通常并非失败即关闭（fail-closed）。

位于应用目录内并不能证明已选择预期的项目。请显式检查解析出的项目，尤其当代码仓库映射未覆盖该目录时。

`vercel whoami --format json` 标识已认证用户和生效的团队；纯非 TTY 的 `vercel whoami` 只打印用户名。两者都不能验证已关联的项目。只读项目命令仍可能需要登录或团队 SAML 重新认证，并打开浏览器/设备流程。请用户刻意完成该流程后再继续。

## 快速开始

```bash
npm i -g vercel
vercel login
vercel link              # single project
# OR
vercel link --repo       # monorepo
vercel pull
vercel dev        # local development
vercel deploy     # preview deployment
vercel --prod     # production deployment
```

## 决策树

用它来路由到正确的参考文件：

- **部署、重新部署、强制构建、无缓存构建，或部署来源/来源证明** → `references/deployment.md`
- **滚动发布、部署钩子、cron 任务、缓存、git 连接、Edge Config、重定向、自定义环境** → `references/project-infra.md`
- **本地开发** → `references/local-development.md`
- **环境变量** → `references/environment-variables.md`
- **CI/CD 自动化** → `references/ci-automation.md`
- **域名或 DNS** → `references/domains-and-dns.md`
- **项目或团队** → `references/projects-and-teams.md`
- **Vercel Toolbar 评论（`vercel comments`）** → `references/comments.md`
- **构建失败、部署错误、日志、指标、Speed Insights、Core Web Vitals、活动、性能、预览访问或生产调试** → `references/monitoring-and-debugging.md`
- **警报、用量、合同、计费购买、令牌、遥测或 CLI 升级** → `references/platform-ops.md`
- **Blob 存储** → `references/storage.md`
- **Container Registry（`vercel vcr`：镜像仓库、镜像、标签、docker/podman/buildah 登录、push/pull）** → `references/container-registry.md`
- **集成（数据库、存储等）** → `references/integrations.md`
- **连接器（`vercel connect`）** → `references/connectors.md`
- **路由规则** → `references/routing.md`
- **防火墙（WAF 规则、IP 封禁、速率限制）** → `references/firewall.md`
- **访问预览部署** → 使用 `vercel curl`（见 `references/monitoring-and-debugging.md`）
- **CLI 命令不可用或输出缺少必需字段** → 在一流的 CLI 路径不可用或不足时，使用 `vercel api`（见 `references/advanced.md`）
- **Node.js 后端（Express、Hono 等）** → `references/node-backends.md`
- **Monorepo（Turborepo、Nx、工作区）** → `references/monorepos.md`
- **Bun 运行时** → `references/bun.md`
- **功能开关（`vercel flags`：create、inspect、set、split、rollout、rules、segments、sdk-keys）** → `references/flags.md`
- **微前端** → `references/microfrontends.md`
- **Sandbox** → `references/sandbox.md`
- **智能体、MCP、技能发现或 AI Gateway** → `references/agent-and-ai.md`
- **捕获的请求追踪（`vercel traces`，包括 `--open` / `--view`）** → `references/advanced.md`
- **高级（`vercel api` 回退、webhooks）** → `references/advanced.md`
- **全局标志** → `references/global-options.md`
- **首次设置** → `references/getting-started.md`

## 反模式

- **在含多个项目的 monorepo 中使用错误的关联类型**：`vercel link` 创建 `project.json`，它只跟踪一个项目。改用 `vercel link --repo`。出问题时先检查 `.vercel/`。
- **在 monorepo 中让命令自动关联**：如果 `.vercel/` 不存在，许多命令会隐式运行 `vercel link`。这会创建 `project.json`，它可能不正确。先显式运行 `vercel link`（或 `--repo`）。
- **假定应用子目录决定了项目**：用 `vercel project inspect --non-interactive` 验证；在非交互模式下，未匹配的代码仓库路径当前可能回退到唯一已配置的项目。
- **用 `vercel whoami` 作为已关联项目的验证**：`vercel whoami --format json` 报告认证和团队上下文，而不是所选项目。
- **在纯 CI 运行中忘记非交互标志**：被检测到的智能体默认获得 `--non-interactive`，但纯 CI 不会——在那里显式传入它，并且只对需要确认的命令添加 `--yes`。
- **在 `vercel build` 之后使用 `vercel deploy` 却不带 `--prebuilt`**：构建输出会被忽略。
- **用 `vercel redeploy` 进行无缓存重建**：`vercel redeploy` 不提供无缓存标志；当你需要一个不保留构建缓存的全新部署时，使用不带 `--with-cache` 的 `vercel deploy --force`。
- **在标志中硬编码令牌**：使用 `VERCEL_TOKEN` 环境变量而不是 `--token`。
- **禁用部署保护**：改用 `vercel curl` 来访问预览部署。
- **过早使用 `vercel api`**：当一流的 CLI 命令能暴露所需数据或变更时，优先使用它们。
