---
name: browse
description: 使用 browse CLI 进行 Browserbase 浏览器自动化、Browserbase 云 API、Browserbase Functions、模板、网页抓取/搜索、诊断，以及 Browse.sh 技能发现/安装。当用户要求导航页面、检查浏览器状态、运行本地或远程浏览器会话、管理 Browserbase 资源、调用 Browserbase Functions、浏览或搭建 Browserbase 模板、抓取或搜索网页内容、诊断 browse 环境、查找或安装用于网站任务的技能、发现站点专属的 Browse.sh 技能，或安装/刷新此 browse 技能时使用。
compatibility: "Requires the browse CLI (`npm install -g browse`). Remote Browserbase sessions and cloud API commands require `BROWSERBASE_API_KEY`. Local mode uses Chrome/Chromium on the machine."
license: MIT
allowed-tools: Bash
metadata:
  openclaw:
    requires:
      bins:
        - browse
    install:
      - kind: node
        package: browse
        bins: [browse]
    homepage: https://github.com/browserbase/stagehand/tree/main/packages/cli
---

# Browse CLI

使用 `browse` 作为主要的 Browserbase 命令行界面。

它可以：

- 驱动本地或 Browserbase 托管的浏览器会话
- 通过无障碍快照、截图、DOM/文本读取和网络捕获来检查页面
- 通过 ref、选择器、XPath、键盘、鼠标、文件和视口控制与页面交互
- 管理 Browserbase 的项目、会话、上下文、扩展、抓取和搜索 API
- 开发、发布并调用 Browserbase Functions
- 浏览并搭建 Browserbase 模板
- 诊断本地或远程浏览器环境问题
- 发现并安装 Browse.sh 目录中的技能
- 安装或刷新此 Browse CLI 技能

## 环境检查

在依赖 CLI 之前，先验证其存在：

```bash
which browse || npm install -g browse
browse --help
```

使用以下命令安装或刷新此技能：

```bash
browse skills install
```

在运行不熟悉的命令之前，使用 `browse <topic> --help` 查看确切的标志。

## 浏览器目标选择

浏览器驱动命令在需要时会自动启动 browse 守护进程。通过标志为每条命令选择浏览器目标：

```bash
browse open https://example.com --local
browse open https://example.com --local --headed
browse open https://example.com --remote
browse open https://example.com --remote --verified --proxies
browse open https://example.com --auto-connect
browse open https://example.com --cdp 9222
browse open https://example.com --cdp ws://127.0.0.1:9222/devtools/browser/<id>
```

本地模式用于开发、localhost、受信任站点和快速迭代。仅当用户明确希望附加到已运行的、带现有 cookie 或登录状态的可调试 Chrome 会话时，才使用 `--auto-connect`；当没有可调试的 Chrome 可用时，使用 `--local`。当有 Browserbase 凭据且站点需要托管浏览器基础设施、Verified 浏览器模式、CAPTCHA 求解、代理或会话持久化时，使用远程模式。

`--local` 要求机器上已安装 Chrome 或 Chromium。在未安装浏览器的容器、CI 和沙箱中，使用 `--remote` 而非 `--local`。若 `--local` 失败并提示“No Chrome or Chromium found”，且已设置 `BROWSERBASE_API_KEY`，则切换到 `--remote`——不要重试 `--local`。

对于 Verified 和/或带代理的远程会话，将 `--verified` 和/或 `--proxies` 加到 `--remote` 上——单条命令即可保持 Browserbase 会话标识，因此 `browse status` 和 `browse doctor` 会报告会话 ID 和实时视图 URL。`--verified` 需要 Browserbase Scale 套餐。这些标志仅适用于 `--remote`，并会像 `--headed` 一样在会话生命周期内保持粘滞。仅当你需要 `open` 未暴露的会话选项（区域、保活、上下文）时，才使用 `browse cloud sessions create` + `--cdp`。

在启动会话时选择有头/无头和本地/远程模式。运行中的会话保持其模式：向已运行的无头会话传递冲突标志（如 `--headed`）会失败，直到你运行 `browse stop --session <name>` 或改用其他会话。

对任何非简单任务都使用命名会话，尤其是当多个智能体或并行任务可能同时运行时。每条浏览器命令都接受 `--session <name>`（或 `-s <name>`）；`BROWSE_SESSION` 环境变量设置默认值，两者都不带的命令共享 `default` 会话。

若环境中已设置 `BROWSE_SESSION`，则每条命令都已指向该会话——不要传递 `--session` 或臆造新名称。显式的 `--session <name>` 总是为该命令覆盖 `BROWSE_SESSION`，因此仅当有意指向其他会话时才传递它。

```bash
browse open https://example.com --session research --local
browse snapshot --session research
```

远程浏览器和云 API 命令需要：

```bash
export BROWSERBASE_API_KEY=...
```

## 浏览器自动化工作流

先打开页面，然后检查状态、操作并验证。

```bash
browse open https://example.com --session research --local
browse snapshot --session research
browse click @0-5 --session research
browse type "hello" --session research
browse snapshot --session research
browse stop --session research
```

对于大多数浏览器工作，优先使用 `browse snapshot` 而非截图。它结构化、快速，并返回如 `@0-5` 的 ref 以进行可靠的元素交互。当视觉布局、图像或像素级状态很重要时，使用截图。

每次快照都会刷新 ref。在点击、提交表单、导航或 UI 重新渲染之后，在使用下一个 ref 之前请重新拍摄快照。

## 并行浏览器工作

为每个独立的浏览器任务使用不同的 `--session` 值。会话隔离标签页、cookie、ref 和守护进程状态；省略 `--session` 的并行任务共享 `default` 会话，并会互相覆盖彼此的当前活动页面。

```bash
browse open https://example.com/search-a --session search-a --local
browse open https://example.com/search-b --session search-b --local
browse snapshot --session search-a
browse snapshot --session search-b
```

任务完成后，仅停止该任务的会话：

```bash
browse stop --session search-a
```

## 核心浏览器命令

导航：

```bash
browse open <url>
browse reload
browse back
browse forward
browse wait load
browse wait selector "#result"
```

页面状态：

```bash
browse snapshot                            # formatted tree only
browse snapshot --full                     # also include ref maps (xpathMap, urlMap)
browse get url
browse get title
browse get text body
browse get html "#main"
browse get value "#email"
browse get markdown body                   # page/element content as markdown
browse eval "document.title"              # run JavaScript in the active page
browse screenshot                         # saves screenshot-<timestamp>.png, prints { "saved": "<path>" }
browse screenshot --path page.png         # choose the output path
browse screenshot --base64                # legacy: print base64 JSON to stdout (avoid in agent loops)
```

交互：

```bash
browse click @0-5
browse fill @0-8 "search query"
browse type "text for the focused element"
browse press Enter
browse select "select[name=country]" "United States"
browse upload @0-12 ./file.pdf
browse highlight @0-5
browse is visible "#modal"
```

鼠标与视口：

```bash
browse mouse click 240 320
browse mouse hover 240 320
browse mouse drag 80 80 310 100
browse mouse scroll 500 300 0 600
browse viewport 1280 720
browse cursor                             # show a visible cursor overlay
```

标签页、网络与 CDP：

```bash
browse tab list
browse tab new https://example.com
browse tab switch <target-id>
browse tab close <target-id>              # refuses to close the last tab
browse network on
browse network off
browse network path
browse network clear
browse cdp 9222 --pretty
```

会话管理：

```bash
browse doctor
browse doctor --json
browse status
browse stop
browse stop --force
```

在调试损坏的浏览器会话之前，使用 `browse doctor`。当另一个智能体或 CI 需要结构化诊断时，使用 `browse doctor --json`。

若页面命令报告没有可用的活动页面，则检查并恢复命名会话：

```bash
browse status --session research
browse tab list --session research
browse tab new https://example.com --session research
browse open https://example.com --session research
```

## 云 API

使用 `browse cloud` 访问 Browserbase 平台 API：

```bash
browse cloud projects list
browse cloud projects get <project-id>
browse cloud projects usage <project-id>
browse cloud sessions create
browse cloud sessions create --proxies --verified
browse cloud sessions list
browse cloud sessions get <session-id>
browse cloud sessions update <session-id>
browse cloud sessions debug <session-id>
browse cloud sessions logs <session-id>
browse cloud sessions downloads get <session-id>
browse cloud sessions uploads create <session-id> ./file.pdf
browse cloud contexts create --name github
browse cloud contexts add github <context-id>
browse cloud contexts list
browse cloud contexts get <context-id|name>
browse cloud contexts update <context-id|name>
browse cloud contexts delete <context-id|name>
browse cloud extensions upload ./extension.zip
browse cloud extensions get <extension-id>
browse cloud extensions delete <extension-id>
browse cloud fetch https://example.com
browse cloud search "browser automation"
```

对于带上下文持久化的远程会话：

```bash
browse cloud sessions create --context-id <context-id> --persist
```

上下文在会话之间持久化 cookie 和本地存储（登录状态）。用 `--name` 为
上下文命名一次以保存本地别名，然后在任何接受上下文 ID 的地方复用该名称，
而无需记住 ID：

```bash
browse cloud contexts create --name github          # saves github -> ctx_...
browse cloud contexts add github <context-id>        # name a context you already have
browse cloud sessions create --context-id github --persist
browse cloud contexts list                          # show saved names
```

当任务需要 Browserbase Verified 浏览器模式时，使用 `--verified`。要直接驱动 Verified/带代理的会话，优先使用 `browse open <url> --remote --verified --proxies` 而非先创建再附加——它会保持会话标识，使 `browse status`/`browse doctor` 能够报告该会话。使用 `browse cloud sessions create` 获取驱动标志未覆盖的会话选项（区域、保活、上下文、完整的 `--stdin` 正文）。

当用户需要简单的 HTTP 抓取且无需浏览器交互时，使用 `browse cloud fetch`。它默认返回 markdown 格式的页面内容；传递 `--format raw` 获得原始响应正文，或传递 `--format json --schema <schema>` 进行结构化提取。当用户要求网页搜索结果时，使用 `browse cloud search`。

## Browserbase Functions

使用 `browse functions` 创建、开发、发布并调用 Browserbase Functions：

```bash
browse functions init my-function
browse functions dev index.ts
browse functions publish index.ts
browse functions publish index.ts --dry-run
browse functions invoke <function-id> --params '{"url":"https://example.com"}'
browse functions invoke --check-status <invocation-id>
```

Functions 命令使用 `BROWSERBASE_API_KEY`。生成的项目从 `@browserbasehq/sdk-functions` 导入 `defineFn`。

## 模板

使用 `browse templates` 发现并搭建 Browserbase 起始模板：

```bash
browse templates list
browse templates list --tag Python --source Browserbase
browse templates find google-trends-keywords
browse templates find amazon --json
browse templates clone google-trends-keywords
browse templates clone amazon-product-scraping --language python ./my-scraper
browse templates clone dynamic-form-filling ./form-bot --language typescript
```

当确切 slug 不确定时，在克隆之前使用 `browse templates find`。当模板同时支持两种运行时，使用 `--language typescript` 或 `--language python` 选择生成项目的运行时。

## 技能

安装或刷新此内置 CLI 技能：

```bash
browse skills install
```

### 发现 Browse.sh 技能

Browse.sh（https://browse.sh）是站点专属浏览器自动化技能的目录。每个技能都限定于某个网站上的某个任务，并由 `<domain>/<task>` slug 标识。已安装的技能为该站点编码了经过验证的策略——API 端点、选择器、反机器人处理——因此它比从零探索站点更快、更可靠地完成任务。

在以下情况主动搜索目录：

- 用户要求在某特定网站上完成某项任务——在手动自动化之前先搜索该域名
- 用户要求航班、外卖、评论、食谱、票务、招聘或购物等常见类别的任务——搜索该关键词
- 用户询问“是否有 X 的技能”或想要新能力

```bash
browse skills list                              # browse the catalog
browse skills find <query>                      # search by slug, domain, title, description, category, alias, or tag
browse skills add <domain>/<task>               # install an exact slug
```

### 搜索策略

先搜索域名，然后搜索任务，再逐步扩大：

```bash
browse skills find yelp.com                     # 1. exact domain
browse skills find yelp                         # 2. site name
browse skills find reviews                      # 3. task keyword
browse skills find "restaurant reviews"         # 4. multi-word query
browse skills find food --limit 5               # 5. category keyword, capped
```

- 查询确切 slug（`browse skills find yelp.com/extract-reviews-2ikb22`）会打印详情视图，包含完整描述和安装命令。
- 若搜索没有返回任何结果，在断定不存在该技能之前，先尝试同义词（`flights` 与 `travel`，`food` 与 `restaurants`）。
- 每个结果都会显示推荐方法——`api`、`fetch`、`browser` 或 `hybrid`——指示该技能如何驱动站点。安装次数表明哪些技能经过了验证。
- 许多 slug 以生成的 suffix（`-2ikb22`）结尾，因此切勿猜测或自行构造它们。仅使用从 `list` 或 `find` 输出中复制的确切 slug 进行安装：`browse skills add yelp.com/extract-reviews-2ikb22`。已安装的技能会作为常规技能供智能体使用；可能需要新的智能体会话才能加载它。

### 输出格式

输出在终端中为表格，在管道传输时为 JSON，因此智能体默认获得结构化 JSON。使用 `--format table|json` 或 `--json` 强制指定格式。

```bash
browse skills find food --format table --limit 10
browse skills find food --json | jq -r '.skills[] | "\(.slug)\t\(.title)"'
```

JSON 输出包含所有匹配项及完整描述，并忽略 `--limit`；`browse skills list --json` 返回整个目录，其内容庞大。优先使用 `browse skills find <query>` 先缩小范围，或使用 `--format table --limit <n>` 获得紧凑视图。

## 最佳实践

1. 运行真实命令并检查其输出，而不是猜测。
2. 在交互之前使用 `browse snapshot`，以便获得当前的 ref。
3. 在导航或改变 DOM 的操作之后重新运行 `browse snapshot`，因为 ref 可能发生变化。
4. 点击和上传优先使用快照中的 ref；当 ref 不可用时，使用选择器或 XPath。
5. localhost 和可重复的开发使用 `--local`；受保护站点或 Browserbase 专属行为使用 `--remote`。
6. 为每个并行或长时间运行的任务使用不同的 `--session <name>`；不带该标志的命令共享 `default` 会话。
7. 仅当打算附加到现有可调试的本地 Chrome 会话时，才使用 `--auto-connect`。
8. 当会话启动、浏览器发现、CDP 附加或 Browserbase 认证看起来异常时，使用 `browse doctor`。
9. 切勿原样重试失败的命令。若同一命令以相同错误失败两次，请停止——运行 `browse doctor --json`，然后改变方法（修复密钥、切换 `--local`/`--remote`，或 `browse stop --force` 后重新开始）。重复执行相同的失败命令只会持续失败。
10. 完成后使用 `browse stop`（或 `browse stop --session <name>`）清理守护进程状态。
11. 对于不熟悉的命令细节，运行 `browse <topic> --help` 并遵循确切的短横线小写标志。

## 故障排查

- “No active page”：运行 `browse status --session <name>`，然后运行 `browse open <url> --session <name>` 或 `browse tab new <url> --session <name>`；若守护进程已陈旧，使用 `browse stop --force`。
- 未找到 Chrome：使用带 Browserbase 凭据的 `--remote`、安装 Chrome，或用 `--cdp` 附加。
- 操作失败：运行 `browse snapshot` 并使用当前页面状态中可见的 ref。
- `open`、`get` 或其他驱动命令返回 401 Unauthorized：设置 `BROWSERBASE_API_KEY` 会使 `browse` 默认使用远程模式。在 https://browserbase.com/settings 修复密钥、取消设置该变量，或传递 `--local` 以运行受管理的本地浏览器（无需密钥）。
- 同一命令以相同错误失败两次：停止重试——切勿原样重试失败的命令。初始化失败会缓存数秒，因此立即重试会返回相同错误。运行 `browse doctor --json`，然后改变方法：修复密钥、切换 `--local`/`--remote`，或 `browse stop --force` 后重新开始。
- 远程命令失败：验证 `BROWSERBASE_API_KEY` 并检查 `browse cloud projects list`。
- 会话设置不清楚：运行 `browse doctor` 或 `browse doctor --json`。
- 受保护站点阻止本地模式：使用 `--remote` 重试。
- `browse skills find` 未返回任何结果：扩大查询范围——先是裸域名，然后是站点名，再是任务关键词或同义词。
- `browse skills add` 在 `npx` 上失败：从 https://nodejs.org 安装 Node.js，然后重新运行。
- 新添加的技能不可用：它会为未来的会话安装；列出已安装技能或启动新的智能体会话。
