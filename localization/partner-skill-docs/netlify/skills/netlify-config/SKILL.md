---
name: netlify-config
description: 通过 netlify.toml、_redirects 和 _headers 配置 Netlify 构建与路由。当设置构建命令或发布目录、添加重定向/重写/代理、添加 SPA 回退重写、设置自定义响应头或 basic auth、管理环境变量与密钥、按部署上下文限定变量作用域、把变量标记为密钥、禁用密钥扫描、配置 functions 打包、忽略构建，或在 Netlify 上接好 monorepo 或 JavaScript SPA 时，使用本技能。
---

# Netlify configuration

配置位于代码仓库**根目录**下的三个文件中（monorepo 则位于 base/package 目录）：
- `netlify.toml`——构建、上下文、插件、functions、重定向、请求头、dev。
- `_redirects`——纯文本重定向/重写规则，保存到**发布目录**，无扩展名。
- `_headers`——纯文本响应头，保存到**发布目录**。

`netlify.toml` 的值在冲突时**优先于 Netlify UI**。`netlify.toml` 中的路径是相对于**基础目录**的绝对路径（默认根目录 `/`）。

## 该用现代还是旧式语法
- Functions 打包器：使用 `node_bundler = "esbuild"`。`zisi` 是旧式的 JS 默认值；TypeScript 始终使用 `esbuild`。
- 临时重定向：使用 `status = 302`。`307` **不受支持**。
- Gatsby Image CDN：使用 `NETLIFY_IMAGE_CDN`，而不是已弃用的 `GATSBY_CLOUD_IMAGE_CDN`。
- 向 TOML 注入环境变量值：**不**支持 `key = "$VAR"`（代理重定向中的 `signed` 除外）。请使用构建命令中的 `sed` 替换或 build plugin（见下文）。

## `netlify.toml` 构建与上下文

```toml
[build]
  base = "frontend"
  publish = "dist"
  command = "npm run build"
  environment = { NODE_VERSION = "18" }

[context.production]
  publish = "output/"
  command = "make publish"

[context.deploy-preview]
  publish = "dist/"

[context."feat/branch"]        # quote names with special characters
  command = "npm run preview"
```

`[build]` 在 **Bash** 中运行。上下文感知的键包括 `[build]` 和 `[[plugins]]`——但**不包括** `[[redirects]]` 或 `[[headers]]`（那些始终是全局的）。优先级，从低到高：UI < toml < 任意上下文属性 < `[context.<name>]` < `[context.branchname]`。

## 重定向与重写

`_redirects` 规则**先**被处理，然后是 `netlify.toml`；在每个文件内，**自上而下第一个匹配的规则胜出**——把具体的规则列在通用规则前面。Edge functions 在重定向之前运行。

SPA history-`pushState` 回退（干净 URL 所必需）：
```
/*  /index.html  200
```
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

`_redirects` 语法——`from to [status] [conditions]`，`#` 注释，路径区分大小写，对特殊字符做 URL 编码：
```
/home         /              301
/my-redirect  /              302
/ecommerce    /store-closed  404          # custom 404 for a path
/pass-through /index.html    200          # rewrite
/best-pets/dogs /best-pets/cats.html 200! # force/shadow (! or force=true)
/news/*  /blog/:splat                     # splat
/news/:month/:date/:year/:slug  /blog/:year/:month/:date/:slug   # placeholders
/store id=:id  /blog/:id  301             # query params
/  /anz  302  Country=au,nz               # no spaces in value list
/israel/*  /israel/he/:splat  302  Language=he
/* /legacy/:splat 200 Cookie=is_legacy,my_other_cookie
```

`[[redirects]]` 关键字：`from`、`to`、`status`（默认 `301`）、`force`（默认 `false`；`!`/shadow）、`query`（`query = {path = ":path"}`）、`conditions`（`{Language, Country, Role, Cookie}`）、`headers`（代理请求头）、`signed`（签名代理的环境变量名）。

**注意事项：**
- 你**不能**用重定向添加/移除末尾斜杠——CDN 会先规范化 URL；`/x/ → /x 301!` 规则会无限循环。请依赖 Pretty URLs（默认开启）。
- 通配星号只能出现在段的**末尾**（`/jobs/*`），不能在路径中间（`/jobs/*.html` 无效）。占位符（`:x`）只能在段的开头；不能在同一个段里混用通配符+占位符。
- 你不能从通配中排除某个路径；请把更具体的规则放在前面。
- `Country` = ISO 3166-1 alpha-2；语言重定向只匹配**第一个** `Accept-Language` 条目。
- 使用外部 auth 提供商的基于角色的重定向**仅限 Enterprise**。
- 10,000+ 条重定向：使用通配符/占位符或 Edge Functions——过大的序列化输出会导致部署失败。

## 代理

```
/api/*           https://api.example.com/:splat        200
/netlify-site/*  https://my-other-site.netlify.app/:splat  200   # use .netlify.app, not custom domain
```
```toml
[[redirects]]                     # custom request headers + force
  from = "/search"
  to = "https://api.mysearch.com"
  status = 200
  force = true
  headers = {X-From = "Netlify"}
```
签名代理（`signed` 指定一个作用于 **Runtime** 的环境变量；必须位于 `netlify.toml` 中；JWS 仅限外部，不用于 Netlify→Netlify）：
```toml
[[redirects]]
  from = "/search"
  to = "https://api.mysearch.com"
  status = 200
  force = true
  signed = "API_SIGNATURE_TOKEN_PLACEHOLDER"
```

**注意事项：**不允许跨团队重写；同一密码站点的重写可以，但不能跨不同的受保护站点；代理超时 **26 秒**；默认只允许一跳；相对路径资源会失效（使用绝对路径或 `<base>`）；循环会被静默忽略。

## 自定义请求头

```
/*
  X-Frame-Options: DENY
/templates/index2.html
  X-Frame-Options: SAMEORIGIN
```
多值——重复该键（`_headers`）或使用多行 TOML 字符串：
```toml
[[headers]]
  for = "/*"
  [headers.values]
  cache-control = '''
  max-age=0,
  no-cache,
  no-store,
  must-revalidate'''
```

**注意事项：**
- `_headers`/`netlify.toml` 中的请求头是**全局的**——不作用于分支/上下文。变通方案：去掉全局请求头，把请求头文件放在自定义目录中，并在按上下文的构建命令中用 `cp` 把它们复制到发布目录：
  ```toml
  [context.staging]
    command = "npm run build && cp ./custom-headers/_stagingHeaders ./dist/_headers"
  ```
- 请求头只对来自 Netlify 存储的文件生效——**不**对代理内容或 function/edge（SSR）响应生效；那些必须自行设置请求头。
- 会被忽略（由服务器设置）的名称包括 `Content-Length`、`Content-Encoding`、`Location`（请使用重定向）、`Set-Cookie`、`Server` 等。
- Basic auth 请求头：**仅 Pro/Enterprise**。跨子域 cookie 需要自定义域（`netlify.app` 在公共后缀列表上）。

## Functions

```toml
[functions]
  directory = "myfunctions/"          # default: <base>/netlify/functions
  node_bundler = "esbuild"
  external_node_modules = ["package-1"]  # esbuild only; native add-ons etc.
  included_files = ["files/*.md"]        # ! prefix excludes

[functions."api_*"]                    # glob/named blocks concatenate with top-level
  external_node_modules = ["package-2"]
  included_files = ["!files/post-1.md"]
```

## 环境变量

两种存储方式：
- **UI / CLI / API**——存储在 Netlify（而非代码仓库）。支持站点变量 + 共享变量、按上下文的值、作用域；可作用于构建、functions/edge/ODB、片段注入、表单、签名代理。**任何敏感内容都推荐用这种方式。**
- **`netlify.toml`**——存储在代码仓库中。仅站点变量、按上下文的值、**无作用域选择**（全部都获得 **Builds** + **Post processing**），仅作用于构建 + 片段注入。

`netlify.toml` 中的环境变量会**覆盖**同名键的 UI/CLI/API 变量。

TOML 中的按上下文值：
```toml
[context.production]
  environment = { NODE_VERSION = "14.15.3" }
[context.deploy-preview.environment]
  NOT_PRIVATE_ITEM = "not so secret"
[context.branch-deploy.environment]
  NODE_ENV = "development"
```

CLI：
```bash
netlify env:set KEY value          # --secret marks it a secret
netlify env:import .env             # site vars; --replace-existing wipes others first
netlify env:unset KEY
netlify env:list --plain --context production > .env
netlify build                       # local build with Netlify's env vars
```
API：`createEnvVars` / `updateEnvVar`（`is_secret: true`）/ `setEnvVarValue` / `deleteEnvVar` / `deleteEnvVarValue`。

**访问语法：**在 `build.command`/`ignore.command` 中用 Bash 的 `$VAR`；在 Node 脚本和插件中用 `process.env.VAR`。

**作用域**（Pro/Enterprise；默认全部）：Builds（站点构建）· Functions（Functions/Edge/ODB）· Runtime（表单、签名代理）· Post processing（片段注入）。共享变量为 Pro/Enterprise，且**仅 Team Owner** 可读取/编辑。站点与共享变量同名冲突时，优先级**按作用域**分别解析——站点变量只在其实际携带的作用域内胜出。

**命名/限制：**键为字母数字加下划线，必须以字母开头（`1KEY`、`_KEY1` 无效）；键 ≤255 字符，值 ≤5,000 字符。只读变量名是保留的。更改需要一次构建 + 部署。

**通过保留的配置变量设置构建语言**——`NODE_VERSION`、`NPM_FLAGS`、`YARN_VERSION`、`BUN_VERSION`、`RUBY_VERSION`、`PHP_VERSION`、`PYTHON_VERSION`、`GO_VERSION`、`HUGO_VERSION`、`PNPM_FLAGS`、`NPM_TOKEN`（Yarn：`YARN_NPM_AUTH_TOKEN`）等。

**必须在 UI/CLI/API 中设置，而非 `netlify.toml`**（在代码仓库克隆后读取，或仅运行时变量）：`AWS_LAMBDA_JS_RUNTIME`、`GIT_LFS_ENABLED`、`GIT_LFS_FETCH_INCLUDE`、`NETLIFY_BUILD_DEBUG`。

**`CI` 注意事项：**默认为 `true`；如果它破坏构建，在构建命令前加上 `CI='' `。

### 向请求头/重定向注入环境变量值
不支持 `key = "$VAR"`。仅限路径方式（作用域必须包含 **Builds**）：
```toml
[build]
  command = "sed -i \"s|HEADER_PLACEHOLDER|${PROD_API_LOCATION}|g\" netlify.toml && yarn build"
```
`sed` 替换**仅**对 `[[headers]]`/`[[redirects]]` 有效（在构建后读取），并且对 build plugins **不可见**（它们在构建命令之前运行）。要让插件可见的更改，请使用本地 build plugin 编辑 `netlifyConfig`。

### 有用的只读构建变量
`CONTEXT` (`production`/`deploy-preview`/`branch-deploy`/`dev`), `BRANCH`, `COMMIT_REF`, `CACHED_COMMIT_REF`, `PULL_REQUEST`, `REVIEW_ID`, `URL`, `DEPLOY_URL`, `DEPLOY_PRIME_URL`, `SITE_ID`, `SITE_NAME`.

## 密钥控制器

把变量标记为密钥：`Contains secret values`（UI）/ `--secret`（CLI）/ `is_secret: true`（API）。强制且不可自定义的策略：
- 密钥值是**只写的**——设置后没有可读版本；该标记不能被移除以显示它。
- 密钥需要显式的上下文 + 作用域；**不能**携带 `post processing` 作用域。
- 只有 Netlify 上的代码（edge/serverless/build）能读取未掩码的值；Netlify 之外看到的是掩码。`dev` 上下文的值除外（从 UI/CLI/API 未掩码）；`netlify build` 从不发出原始值。

**密钥扫描**在任一变量成为密钥后自动运行（也通过智能检测）。检测到时使构建失败并记录位置。通过按上下文设置的环境变量进行配置：
- `SECRETS_SCAN_ENABLED=false`——禁用**所有**扫描（失去全部密钥保护）。
- `SECRETS_SCAN_SMART_DETECTION_ENABLED=false`——仅禁用智能检测。
- `SECRETS_SCAN_OMIT_KEYS`、`SECRETS_SCAN_OMIT_PATHS`（逗号分隔列表；路径从代码仓库根目录起，可用 glob）。
- `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`——把误报加入安全名单（**优先**用这个而不是禁用）。智能检测为 Personal/Pro/Enterprise。

扫描覆盖所有构建文件、长度 >4 字符且非布尔的值，搜索明文 + base64 + URI 编码的各种排列。

### 敏感变量策略（仅公开代码仓库）
决定**不受信任的**部署（无法识别的作者）是否获得敏感变量。站点成员的 Git 部署始终受信任，即使来自 fork。在 Project configuration > Environment variables > Site policies 中设置：
- **Require approval**（默认）——不受信任的部署等待成员批准。
- **Deploy without sensitive variables**——构建照常运行，但不提供敏感变量。
- **Deploy without restrictions**——所有变量都提供。

不适用于 GitHub Enterprise Server / GitLab 自管理代码仓库（视作私有）。

## 忽略构建

`[build]` 下的 `ignore` 决定是否重新构建——在 Bash 中从基础目录运行（或 Node.js 18，固定；站点的 `package.json` 依赖**不可**用）。**退出码 `1` = 有变更 → 构建继续；退出码 `0` = 无变更 → 构建停止。**无论退出码如何，构建钩子始终会构建。
```toml
[build]
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF packages/blog-1 packages/common"
```
```toml
[build]
  ignore = "node ignore_build.js"   # separate file paths must start with ./
```
```js
// ignore_build.js
process.exitCode = process.env.BRANCH.includes("debug") ? 0 : 1
```

## Monorepo

把站点子目录设为**包目录**（把它的 `netlify.toml` 放在那里），把 base 留在根目录 `/`，在子目录层级声明依赖。包目录是 **UI-only 的——不能在 `netlify.toml` 中设置**（Project configuration > Developer settings > Continuous deployment > Build settings）。配置文件发现顺序：包目录 → 基础目录 → 根目录。`netlify.toml` 中的路径仍为相对于基础目录的绝对路径。`netlify <cmd> --filter <site>` 选择某个站点。

## JavaScript SPA

构建命令 `npm run <script>` / `yarn <script>`；发布目录通常是 `dist`（取决于框架）。为 `pushState` 路由添加上面的 `/*  /index.html  200` 回退。代码分割 + 带原子部署的哈希文件名，在引用陈旧时可能抛出 `Uncaught SyntaxError: Unexpected token`——请禁用哈希文件名、使用固定链接或 service worker。

## Netlify Dev `[dev]`

**不**在 Bash 中运行（`command` 中不能使用 Bash 语法）。**没有 `environment` 键**——在 `[context.dev.environment]` 下设置本地环境变量。
```toml
[dev]
  command = "yarn start"
  targetPort = 3000        # if both command + targetPort set, framework must be "#custom"
  port = 8888
  framework = "#custom"
  [dev.https]
    certFile = "cert.pem"
    keyFile = "key.pem"
```

## 插件与扩展

```toml
[[plugins]]
package = "netlify-plugin-check-output-for-puppy-references"
  [plugins.inputs]
  breeds = ["pomeranian", "chihuahua"]

[[integrations]]              # build-time extension; install on team first
  name = "abc-performance-extension"
  [integrations.config]
    output_path = "reports/performance-reports.html"
```

完整参考页面：构建环境变量见 https://docs.netlify.com/build/configure-builds/environment-variables.md，环境变量概览见 https://docs.netlify.com/build/environment-variables/overview.md，密钥控制器见 https://docs.netlify.com/build/environment-variables/secrets-controller.md，重定向见 https://docs.netlify.com/manage/routing/redirects/overview.md，重定向选项见 https://docs.netlify.com/manage/routing/redirects/redirect-options.md，重写/代理见 https://docs.netlify.com/manage/routing/redirects/rewrites-proxies.md，自定义请求头见 https://docs.netlify.com/manage/routing/headers.md，以及基于文件的配置见 https://docs.netlify.com/build/configure-builds/file-based-configuration.md。

<!-- Plan gating for the sensitive variable policy itself is unspecified in the sources; only its public-repo requirement and the smart-detection plan list are documented. -->

<!-- system: agent-context/config/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify 内部规则（config）

这些是组织约定，而非文档事实——由 ctx-gen 合并进渲染后的技能，且从不自动生成。由技能维护者负责。

1. 在 `netlify.toml` 中设置的环境变量在运行时对 functions 或 edge functions **不可用**——在那里读取会返回 `undefined`。请在 UI 中或用 `netlify env:set` 设置运行时变量，而不是 `netlify.toml`。
2. 绝不要把密钥放进客户端前缀的环境变量（`VITE_`、`NEXT_PUBLIC_`、`PUBLIC_` 等）——它们会被内联进客户端 bundle；`--secret` 保护不了它们。
3. 在本地快照环境变量时（`netlify env:list --plain > .env`），让 `.env` 保持被 gitignore——绝不提交它。
4. 明确说明环境变量作用域的交互：一个作用于 Builds 的站点变量不会在其他作用域中遮蔽共享变量——优先级按作用域独立解析（站点变量只在其实际携带的作用域内胜过共享变量）。
