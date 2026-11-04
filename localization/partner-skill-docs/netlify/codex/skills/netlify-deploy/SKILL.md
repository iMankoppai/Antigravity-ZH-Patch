---
name: netlify-deploy
description: 从代码创建、配置和管理 Netlify 部署——当设置 Git 持续部署、从 CLI 运行 netlify deploy 或 netlify deploy --prod、编写 netlify.toml 部署上下文、添加 Deploy to Netlify 按钮、接好构建钩子、配置 Deploy Previews 或分支部署、锁定或跳过部署、修复失败的部署或密钥扫描导致的部署失败，或当有人要求"部署我的站点"、"设置预览部署"、"添加按分支的构建配置"、"让 staging 不被 Google 收录"或"在我的 README 里添加部署按钮"时，使用本技能。
---

# Netlify deploy

## 现代 CLI

```bash
netlify deploy              # manual draft deploy (no CI)
netlify deploy --prod       # deploy straight to production
netlify create              # new project from a natural-language prompt
netlify deploy --allow-anonymous   # temp project, claim within 1 hour
npm update -g netlify-cli   # skew protection needs 23.11.0+
```

部署是一个带版本、**原子**的快照：Netlify 只上传变更过的文件，并且只有所有文件都就位后才切换线上站点——站点永不处于不一致状态。部署可以是预览，也可以是服务在你主域名上的生产版本。

**持续部署 vs 手动部署：**通过 Git 和 Netlify CLI 部署都支持持续部署——一次 push 会自动触发构建。拖放和 API 创建一次性手动部署。手动部署（`netlify deploy`）**不**运行构建命令；登录状态下拖放是唯一的例外（自动检测框架）。

**⚠ 链接或创建站点时，把 `.netlify` 加入 `.gitignore`。**每条链接路径都会写入 `.netlify/state.json`，这个文件不能被提交。

## 创建部署的方式

- **Git CD**——连接一个代码仓库；Netlify 在每次 push 时构建并部署（OAuth2 或 Netlify GitHub App）。这是默认路径。生产部署来自对生产分支的 push——通常是代码仓库的默认分支（例如 `main`），可在 Branches and deploy contexts 下更改。
- **CLI**——`netlify create`、`netlify deploy`、`netlify deploy --prod`。
- **拖放**——https://app.netlify.com/drop。已登录：按需构建。未登录：按原样发布文件。
- **API**——通过文件摘要或 ZIP 创建部署（一次性手动）。
- **Deploy to Netlify 按钮**——从公开模板代码仓库一键部署。
- **构建钩子**——触发构建的唯一 URL。（来自构建钩子的部署被视为受信任，并绕过部署请求策略。）
- **AI 智能体**——从仪表盘使用 Agent Runners（Claude Code、OpenAI Codex、Google Antigravity）；每次改动文件的运行都会在 `agent-<runID>--<site>.netlify.app` 自动生成一个 Deploy Preview。提示词旁显示的内联预览就是该 URL 可访问的同一个 Deploy Preview。
- **Zapier / n8n**——自动化集成。

不确定用哪条路径？Deploy Navigator 会给出个性化建议：https://docs.netlify.com/start/choose-your-path#deploy-navigator（也以 "Not sure where to start?" 的形式内嵌在 create-deploys 页面）。

## netlify.toml 部署上下文

位于代码仓库根目录。文件配置覆盖 UI 设置。五个预定义上下文：`production`、`deploy-preview`、`branch-deploy`、`preview-server`、`dev`。分支名也可作为自定义上下文；更具体的上下文覆盖通用上下文。

```toml
[context.production]
  command = "make production"
  [context.production.environment]
    ACCESS_TOKEN = "super secret"
  [[context.production.plugins]]        # plugins REQUIRE double brackets
    package = "@netlify/plugin-sitemap"

[context.deploy-preview.environment]
  ACCESS_TOKEN = "not so secret"

[context.branch-deploy]                 # all branch deploys
  command = "make staging"

[context.staging]                       # one branch; overrides branch-deploy
  command = "npm run build:staging-special"

[context.dev.environment]
  NODE_ENV = "development"

[context."features/branch"]             # quote slashed branch names
  command = "gulp"
```

**⚠ 在 `netlify.toml` 中设置的环境变量对部署环境**不可用**——请通过 UI/CLI/API 设置。`netlify.toml` 会被提交，因此不要把敏感值放进去；请改用通过 UI/CLI/API 设置按上下文的环境变量。

完整上下文优先级规则见 `references/netlify-toml.md`，上下文策略见 `references/deployment-patterns.md`。

## Deploy Previews 与分支部署

- **Deploy Previews** 会为 PRs/MRs（GitHub、GitLab、Bitbucket、Azure DevOps、Cursor Origin）和智能体运行自动构建。基础分支必须是生产分支或已启用分支部署的分支。URL：`deploy-preview-<num>--<site>.netlify.app`。首次部署待定期间，该 URL 返回 `Not Found`。
- **分支部署**需要设置：Project configuration > Developer settings > Continuous deployment > Branches and deploy contexts > Configure。启用特定分支（支持前缀通配符 `features/*`）或**所有**新分支。URL：`<branch>--<site>.netlify.app`。只要分支存在，分支部署就持续存在。构建设置/环境变量：`[context.branch-deploy]` 用于所有分支，`[context.<branch>]` 用于单个分支。
- 一个有开放 PR 的分支部署分支会**同时**产生一个 Deploy Preview 和一个分支部署。
- **入口路径：**在 PR/MR 描述中放入 `@netlify /some/path`，然后推送一个新提交以重新生成。一旦在 PR 中设定，就无法在 Netlify Drawer 中更改。
- **跳过部署：**`[skip ci]` 或 `[skip netlify]`——放在 PR/MR **标题**中可跳过 Deploy Preview；放在**提交信息任意位置**可跳过分支/生产部署。下一个未标记的提交会部署所有被跳过的变更。

## 锁定、跳过与手动生产部署

- **锁定**（禁用自动发布）：Deploys 列表 > **Lock to stop auto publishing**。新部署仍会构建但不会发布。解锁以恢复。
- **⚠ 在 Git-CD 站点上手动 `netlify deploy --prod`：**下一次对生产分支的 push 会静默替换你手工发布的部署。提醒用户；如果它必须保持在线，请锁定已发布的部署。

## 管理部署

- **查找：**Deploys 标签页（Developer 或 Team Owner）；按部署 ID 或分支名搜索；按时间范围、部署上下文和状态筛选。
- **取消：**在进行中部署的详情页，**Cancel deploy** > **Yes, cancel deploy**。
- **重试：**从分支 HEAD 构建（可选清除缓存）——如果 HEAD 已越过原始部署的 SHA，它仍从 HEAD 构建。
- **下载：**在成功部署的详情页——通过 **Deploy file browser** 下载单个文件，或通过页眉 **Download** > **Download ready** 下载包含所有文件的 ZIP。
- **删除：**仅 Developer 或 Team Owner。你不能删除最近发布到站点主 URL 的部署，也不能删除仍在进行中的部署。删除是永久的，不会降低团队成本，也不会保留构建分钟数。

## Deploy to Netlify 按钮

模板代码必须位于 **GitHub.com 或 GitLab.com** 上的**公开**代码仓库中。

Markdown：
```md
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify/netlify-statuskit)
```

URL 变体（基础链接 `https://app.netlify.com/start/deploy`）：
```txt
# require/pre-fill env vars (hash, client-side only; values may be null)
...?repository=<repo>#SECRET_TOKEN=specialuniquevalue&CUSTOM_LOGO=

# monorepo base dir (whole repo cloned, builds from blog/)
...?repository=<repo>&base=blog

# clone only a subdirectory
...?repository=<repo>&create_from_path=examples/hello

# deploy a specific branch (sets it as production branch)
...?repository=<repo>&branch=beta-feature

# install required SDK extensions before first deploy
...?repository=<repo>&fullConfiguration=true
```

基于文件的模板配置，`[template]` 位于代码仓库根目录的 `netlify.toml` 中：
```toml
[template]
  incoming-hooks = ["Contentful"]
  required-extensions = ["supabase"]

[template.environment]
  SECRET_TOKEN = "change me for your secret token"
  CUSTOM_LOGO = "set the url to your custom logo here"
```

你**不能**在 `[template]` 中设置环境变量值或基础目录——请使用 URL 参数。`[template.environment]` 中的占位字符串只是 UI 标签。

**⚠ 模板配置（incoming hooks、模板环境变量）只从代码仓库**根目录**读取。**当按钮通过 `base` 指向子目录时，基础目录的 `netlify.toml` 在构建上优先，但那里的模板配置会被忽略。要明确说明这一限制，而不是任其隐含。

## 密钥扫描失败

**⚠ 密钥扫描导致的部署失败意味着某个看起来像密钥的值进入了你的构建输出。**如果它是真正的密钥，那就是泄露——停止在客户端/发布输出中传输它并轮换它。为真正的泄露而设置 `SECRETS_SCAN_ENABLED=false` 来让扫描器闭嘴是**绝对**不行的。对于确实非密钥的值，用 `SECRETS_SCAN_OMIT_KEYS` / `SECRETS_SCAN_OMIT_PATHS` 精确限定范围。

## 修复失败的部署——没有回滚

**失败的部署永不发布**——上一个部署仍在线上，因此没有什么需要恢复。如果有人要求回滚或恢复上一个部署，纠正这个前提：部署失败后什么都没变；对于错误的*已发布*部署，**向前修复**——回退该提交并让 CI 重新部署它。不要调用 `restoreSiteDeploy` 或 `publishDeploy`，也不要把仪表盘回滚当作答案交给用户。

Netlify 会在部署日志上方显示 **Why did it fail?** 的 AI 诊断——该诊断及其建议的解决方案**不**消耗额度。选择 **Fix with agent** 会启动一次智能体运行，它**确实**会从你团队的余额中消耗额度。见 https://docs.netlify.com/resources/troubleshooting/fix-a-failed-deploy/。

## 部署权限（私有代码仓库）

Netlify 只构建由**可识别的作者**（Owners、Developers、Git Contributors；Marketplace 机器人也算）推送到私有代码仓库的变更。无法识别作者的合并会显示 **Pending approval**；Team Owner 必须先把他们关联到团队账户，构建才会开始。构建钩子部署不受此限制。

## 约束与注意事项

- **每个目录的文件数：54,000。**发布目录中任何超过此数的目录都会导致部署失败。每次部署的总文件数没有限制。
- **Skew protection：**所有套餐；**仅生产上下文**——分支部署、Deploy Previews 和固定链接会绕过它并提供最新部署。需要 Netlify CLI 23.11.0+。Astro 5.15.0+ 通过 Netlify Adapter 默认启用它；Next.js 需主动选择。生产部署（或所有部署）上的密码保护会关闭 skew protection——只有当你仅保护非生产部署时它才有效。Netlify 在硬导航时会丢弃 skew protection 信号（`Sec-Fetch-Mode: navigate`，或存在 `Sec-Fetch-Site` 且不为 `same-origin`）。框架维护者通过 `netlify/v1/skew-protection.json` 添加支持。
- **⚠ 搜索索引——最新的分支部署**是**可被索引的：**Netlify 会给 Deploy Previews 和较早的分支部署加上 `X-Robots-Tag: noindex`，但**不**会给每个分支最近的分支部署加，因此 `staging--<site>.netlify.app` 可能被抓取。该响应头本来也不是保证。要让预览/分支部署不被搜索收录，请通过项目可见性把项目设为私有（仅基于额度的套餐），或为**非生产**部署开启密码保护（该作用域也能让 skew protection 继续工作）。
- **预览 URL 可见性：**Deploy Preview / 分支部署 URL 会与任何持有链接的人分享，除非你添加密码或团队登录保护。
- **新项目可见性：**在启用"默认私有"的基于额度套餐上，新项目无论以何种方式创建，起始都是私有的。
- **自动删除：**部署在 30 天后被删除（付费套餐 90 天）；Enterprise 可将此提高到 365 天。永不删除：已发布的部署、最近一次成功的生产部署，以及每个分支最近一次成功的分支部署。在 Project configuration > Developer settings > Automatic Deletion 配置。

完整 CLI 接口和标志见 `references/cli-commands.md`。

<!-- Retention period for failed/canceled deploys is stated inconsistently in sources (30/90 days vs 6 months); used the 30/90-day figure. -->
<!-- Sources don't state noindex behavior for unpublished production deploys or permalinks. -->

<!-- system: agent-context/deploy/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（deploy）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 智能体不回滚部署：绝不要调用 `restoreSiteDeploy` 或 `publishDeploy` 来恢复较早的部署。向前修复——回退提交并让 CI 部署它。
2. 失败的部署永不发布；失败时没有什么可回滚的。
3. 深入指南位于本技能中：`references/netlify-toml.md`、`references/cli-commands.md`、`references/deployment-patterns.md`。
4. frontmatter 的 description 绝不能把回滚或恢复宣传为一项能力——不要出现 "roll back"、"restore a deploy" 或等价说法。
5. 当用户要求回滚或恢复上一个部署时，纠正前提而不是照办：部署失败后，上一个部署仍在线上，没有什么可恢复的；对于错误的已发布部署，按规则 1 向前修复。不要把 `restoreSiteDeploy` / `publishDeploy` 或仪表盘回滚当作答案交给用户。
6. 链接或创建站点时，始终把 `.netlify` 加入 `.gitignore`——每条链接路径都会写入 `.netlify/state.json`，这个文件不能被提交。每次链接时都要提到这一点。
7. 密钥扫描导致的部署失败：如果被标记的值是真正的密钥，那就是泄露——停止在客户端/发布输出中传输它并轮换它；绝不要为真正的泄露让扫描器闭嘴。对于确实非密钥的值，用 `SECRETS_SCAN_OMIT_KEYS` / `SECRETS_SCAN_OMIT_PATHS` 精确限定范围，绝不用 `SECRETS_SCAN_ENABLED=false`。
8. 在已连接 Git CD 的站点上运行手动 `netlify deploy --prod` 之前，提醒用户：下一次对生产分支的 push 会静默替换手工发布的部署；如果它必须保持在线，建议锁定已发布的部署。
9. Deploy-to-Netlify 按钮：模板配置（incoming hooks、模板环境变量）只从代码仓库根目录读取。当按钮通过 `base` 指向子目录时，要明确说明这一限制——不要任其隐含。
