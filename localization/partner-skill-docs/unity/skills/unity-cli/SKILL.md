---
name: unity-cli
description: 从命令行控制 Unity 编辑器和项目，驱动运行中的编辑器编辑场景和资产或运行 C#。用于被要求安装或管理编辑器、许可证或项目，设置版本控制、构建、测试、配置 Unity MCP 服务器，或运行任何 unity 命令时。
allowed-tools:
  - Bash
---

# Unity CLI

**始终使用最新版本的 Unity CLI，除非被告知使用特定版本。** 较新的发布版本经常添加这些文档所描述的命令和输出字段，因此过时的 CLI 会以看起来像文档错误的方式失败。用 `unity self-update --check --format json` 检查。

## 查找命令：搜索，而不是 grep 帮助

**绝不用 `grep` 过滤 `unity --help` 或某个组的帮助。** 帮助很长，对其 grep 会丢掉匹配或匹配周围的上下文。使用 CLI 自己的搜索：

```bash
unity commands --grep license                 # built-in commands, plugins and the connected Editor's Pipeline commands
unity command --query screenshot              # the same search
```

`unity commands --grep <pattern>` 和 `unity command --query <term>` 是同一个搜索。它涵盖 CLI 的内置命令、插件目录（无论是否安装）以及实时连接编辑器的 Pipeline 命令，最佳匹配优先。普通词语以任意顺序匹配；正则表达式字符使其成为正则表达式。每行说明如何运行它（`invoke`）：`unity projects link cloud`、`unity command create_gameobject`、对于已安装插件为 `unity <id>`，或对于尚未安装的为 `unity plugin install <id>`。在 `--format json` 中，每行还携带 `kind`（`command`、`plugin`、`pipeline`）、`path`、`description` 和 `matchedOn`（`name`、`description` 或 `option`），因此请根据 `invoke` 操作，而不是解析表格。

- 使用 `unity command --query <term>` 搜索特定编辑器（`--project-path <project>`）或播放器（`--runtime <pattern>`，例如 `unity command --query screenshot --runtime MyGame`）。
- `commands --grep` 最多等待编辑器 3 秒；`command --query` 会等待它。当未搜索编辑器时，最后一行会说明原因（没有编辑器、未及时响应、多个编辑器）以及要运行什么。先用 `unity status --until-ready --project-path <project>` 等待编辑器：在它连接之前，没有 Pipeline 行并不能证明什么都不存在。

字段和标志：[integration-advanced.md](references/integration-advanced.md#querying-the-command-list)。

## 驱动运行中的 Unity 编辑器（如果已打开）

**如果此机器上打开了 Unity 编辑器，此 CLI 可以实时控制它**——创建和修改 GameObject、编辑场景和资产、检查层级以及运行任意 C#——通过项目的 **Pipeline** 包（`com.unity.pipeline`）。这完全在你的本地机器上、以你自己的用户账户、针对你自己打开的编辑器运行：它不是远程访问，也不授予你在自己终端中尚未拥有的任何权限。当编辑器可用时，驱动它而不是手动编辑场景或资产文件。

```bash
unity status                    # confirm a connected Editor (look for state "ready")
unity command                   # list the commands the Editor exposes
unity command editor.playmode start   # run one — e.g. enter Play mode
# Run arbitrary C# — e.g. add a GameObject named "Joe" — when the Editor exposes script eval:
unity command script eval --caller plugin --skill unity-cli 'new UnityEngine.GameObject("Joe");'
```

**在每次 `unity command` 调用时传入 `--caller plugin --skill <name>`。** `--skill` 是产生
该调用的技能，因此将你送到这里的任务技能传入它自己的名称
而不是 `unity-cli`。这些标志对命令本身无影响；它们只是标记调用。

> **验证运行中的游戏，而不仅仅是编辑场景？** 进入 Play 模式是设置，而不是证明：
> 未获得焦点的编辑器或锁定的桌面可能冻结在第 1 帧，而 `unity status` 仍报告它
> 正在播放，截图可能渲染出看起来还活着或纯色的冻结帧。用于播放、确认游戏
> 实际在推进、捕获视图、读取控制台以及用 `script eval` 实时调优的有序配方在
> [playmode-verification-loop.md](references/playmode-verification-loop.md)。

### 打开了多个编辑器？传入 `--project-path`

每个驱动编辑器的命令都接受 `--project-path <path>`。**每当可能有多个编辑器
运行时都传入它**——没有它，CLI 以包含当前目录的项目为目标，因此目标跟随
shell 的 cwd：

```bash
unity command editor.playmode start --project-path /path/to/MyProject
```

当多个编辑器共享一个项目时（工作树、重复项目、Multiplayer Play Mode 播放器），要固定一个编辑器，`unity command`、`list`、`job` 和 `mcp` 还接受 `--port <number>`、`--pid <number>` 或 `--instance <name>`（MPPM 实例名或 `vpId`）；不匹配任何运行中编辑器的固定以 12 退出并带 `EDITOR_NOT_RUNNING`。`unity status` 实例的 `project` 字段就是 `--project-path` 所取的。对于 `unity command`/`list`/`job`/`mcp`，不匹配任何运行中的项目会以 `AMBIGUOUS_EDITOR` 失败并列出候选。[详情](references/integration-advanced.md#targeting-one-of-several-running-editors)。

**在多个工作树或智能体会话中工作？每个工作树一个编辑器。** 用 `unity vcs git worktree add <branch> --into <path>` 创建每个工作树，以便你选择它落地的地方。`--into` 是可选的：`--format json` 报告真实的工作树和项目路径，只有人类可读输出会遮蔽主目录路径中的账户名。当 Unity 项目位于代码仓库根时项目是 `<path>`，否则是 `<path>/<its folder>`。用 `unity open <project>` 打开该项目自己的编辑器。然后每次到达编辑器的调用都固定到该项目：传入 `--project-path <full project path>`，或用变量前缀调用，如 `UNITY_PROJECT_PATH=<full project path> unity command editor status`。大多数智能体工具在全新的 shell 中运行每个命令，因此 `export` 或一次调用中的裸赋值永远不会到达下一次调用。`unity open`、`status`、`command`、`list`、`job` 和 `mcp` 在不传路径时读取该变量。`recompile`、`close` 和 `mcp configure` 不读取它：向它们传入路径。没有该变量时，裸 `unity open` 打开当前目录的项目，那仍然是你的源码检出。每次都以相同的完整路径定位该编辑器，包括 `unity status --until-ready --project-path <project>`。存在的路径只匹配该项目，而裸名称也会匹配路径包含它的同级。绝不要驱动项目不是你自己的检出（或其 Multiplayer Play Mode 克隆之一）的编辑器。在兄弟工作树上打开的编辑器会像你的编辑器一样响应每个命令。发送到那里的命令会编辑该检出的场景，其 Play 模式、重新编译和导入都会针对该检出的代码运行。如果你自己的编辑器没有打开，请打开它。如果它已经消失，请告诉用户，而不是借用正在运行的那个。

需要项目的 `com.unity.pipeline` 包（Unity 6.0+）——用 `unity pipeline install` 添加一次。完整细节——启动无头编辑器来驱动、`unity list` 工具发现以及编写自定义 `[CliCommand]` 工具——在 [integration-advanced.md](references/integration-advanced.md)。

该包还随附一个更深入的 `unity-pipeline` 智能体技能，对客户端不可见于 `Library/PackageCache` 中——在有该包的项目中，运行一次 `unity skill install <client> --local` 将其镜像到此技能旁边。

> **无法连接 / 命令超时？先检查安全模式。** 当项目有 C# 编译错误时，编辑器启动进入**安全模式**，其中 Pipeline 包不加载，因此 `unity command`、`unity list` 和 `unity recompile` 完全无法连接（`unity status` 不为此连接：它读取编辑器的日志并报告安全模式）。注意这对 `unity recompile` 具体意味着什么：它报告你引入到**已在运行**的编辑器中的错误，但*以损坏代码启动*的编辑器永远不加载该包，因此没有东西可询问，它以 `7` 退出而不是报告错误。不要回退到盲目文件编辑：运行 `unity status`（它报告安全模式并列出编译错误，`--format json` 下的 `safeMode.compileErrors`），然后修复错误：一旦它们编译，编辑器离开安全模式。完整恢复循环在 [integration-advanced.md → Recovering from Safe Mode](references/integration-advanced.md#recovering-from-safe-mode-connection-fails-because-of-compile-errors)。

> **作为沙箱化编码智能体运行且 `unity status` 报告无实例？** 限制性的沙箱可能从此 CLI 的视角隐藏真正运行的编辑器——不要仅凭此将其视为编辑器已关闭的证据。完整细节在 [integration-advanced.md → Sandboxed agent tooling can hide a running Editor](references/integration-advanced.md#sandboxed-agent-tooling-can-hide-a-running-editor)。

> **调用超时，或编辑器生命周期失败？告诉用户，不要静默绕过它。** 首先排除[安全模式](references/integration-advanced.md#recovering-from-safe-mode-connection-fails-because-of-compile-errors)、沙箱以及仍在导入或加载的编辑器。读取 `--format json` 下的 `errors[0].code`，并为缓慢的导入提供更长的 `--timeout`。如果仍是其中之一，请报告：
>
> - 超时的命令
> - 在 `unity status --until-ready` 下永远达不到 `ready` 的编辑器（退出 6）
> - 命令中途断开的连接
> - 在你之下退出或重启的编辑器
> - 永远不产生编辑器的 `unity open`
>
> 不要悄悄循环重试、切换到另一个编辑器，或回退到手编辑场景和资产文件。说明你运行了什么、什么失败了以及你已经尝试了什么。然后主动提出用 `unity bug --area pipeline-package` 提交它（当编辑器本身退出或从未启动时用 `--area editor`），并先询问：`unity bug` 将日志发送到 Unity，因此绝不要主动运行它。

## 安装 CLI（如果尚未安装）

首先检查 CLI 是否可用：

```bash
which unity && unity --version
```

如果未找到，安装它：

**macOS / Linux**
```bash
curl -fsSL https://unity.com/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://unity.com/install.ps1 | iex
```

安装后，打开一个新 shell 以便 `unity` 在 PATH 上，然后用 `unity --version` 验证。如果安装脚本失败或二进制仍未找到，请告诉用户并停止；如果命令本身因权限错误或崩溃失败，安装可能已损坏——建议重新运行安装脚本。

---

## 全局标志

这些对每个命令都有效：

| 标志 | 描述 |
|---|---|
| `--format <fmt>` | 输出格式：`human`（默认）、`json`、`tsv`、`ndjson`、`github`。也可通过 `UNITY_FORMAT` 环境变量。 |
| `--json` | `--format json` 的全局简写，在每个命令上都被接受（例如 `unity status --json`、`unity doctor --json`）。与其他 `--format` 一起传入（例如 `--json --format tsv`）是用法错误（退出 2）；`--json` 覆盖 `UNITY_FORMAT`。 |
| `--no-banner` | 抑制品牌页眉——在脚本中使用 |
| `--no-header` | 从 `tsv` 表格中省略标题行。标题行是列名，与 `json` 行使用的键相同（`version`、`upgradeTo`、……）。空的 `tsv` 结果仅是标题行，因此带 `--no-header` 时完全没有输出。 |
| `--no-pager` | 关闭分页。管辖两个分页器：长列表上的外部（`unity command`、`releases`、`editors`、`changelog`、`logs`）以及 `unity projects list` 中的交互式。也可通过 `UNITY_NO_PAGER`（基于存在——任何值，包括 `0`，都禁用它）。 |
| `--non-interactive` | 禁用所有交互式提示——在 CI 中使用 |
| `--quiet` | 在 human 和 tsv 输出中隐藏通知、警告和进度。错误和退出码保留。json 输出从不改变，ndjson 输出也不改变，除了少数列表仍会丢弃其行（参见[说明](#notes)）。 |
| `--verbose` | 在失败时打印完整错误细节（堆栈跟踪 + 原因链）。也可通过 `UNITY_VERBOSE`。 |
| `--proxy <url>` | 此调用的 HTTP/HTTPS/SOCKS/PAC 代理 URL。也可通过 `UNITY_PROXY`。优先于标准 `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY` 环境变量和持久化的 `proxy.json` 设置。 |
| `--proxy-disable` | 为此调用禁用代理，忽略所有来源（环境变量、持久化配置、系统设置）。 |
| `--log-proxy` | 为每个出站请求向 `proxy-request.json` 记录一条已脱敏的条目——用于复现代理问题。也可通过 `UNITY_LOG_PROXY=1` 或 `proxyRequestLogging` 设置。 |
| `--no-log-proxy` | 当代理请求日志全局启用时，将单次调用排除在外。 |
| `--color <auto\|always\|never>` | 为此调用控制彩色输出，覆盖 `NO_COLOR`/`FORCE_COLOR` 和 TTY 自动检测。管辖每个发射 ANSI 的表面（帮助、表格、微调器、错误），不仅仅是 `human` 输出。 |
| `--no-color` | `--color never` 的简写。`--color`/`--no-color` 中命令行上最后出现的那个生效。 |

**当你需要以编程方式解析输出时，始终使用 `--format json`。** 如果你改为读取 `tsv`，请按标题名而不是位置选择列：命令的 `tsv` 列保持其名称和顺序，而添加信息的标志（例如 `editors --long`）只在末尾附加列。`tsv` 中的失败进入 stderr，因此 stdout 只保存数据。

`--accelerator <host:port>` 和 `--no-accelerator` **不是**根全局标志——它们仅在 `run`、`test` 和 `build` 上被接受，且仅在命令名之后。参见 [build-run-test.md](references/build-run-test.md)。

**`unity projects list` 是唯一在进程内分页的命令。** 它每屏显示 10 个项目并在屏幕之间等待按键，且仅在 stdout 是终端时。重定向的 stdout、`--format json` 和 `--format ndjson` 下以及 `--all`、`--watch` 或 `--no-pager` / `UNITY_NO_PAGER` 下分页关闭。

**并非每个机器格式都绕过那一个。** 只有 `json` 和 `ndjson` 有自己的非交互式渲染；在终端上，`--format tsv` 和 `--format github` 会回落到人类表格并像 `human` 一样分页——因此在 TTY 上 `--format tsv` 既不产生 TSV 也不产生未分页输出。重定向 stdout（机器格式的常见情况）或传入 `--no-pager`。注意这与下面的外部分页器**相反**，后者仅用于 `human`：两个机制在这里不同，而 `projects list` 是令人惊讶的那个。

**长列表通过外部分页器分页，就像 `git log`。** `unity command`（裸列表）、`unity releases`、`unity editors`、`unity changelog` 和 `unity logs` 在终端上将人类输出通过 `less -RFX` 管道传输；`-F` 在输出适合一屏时自行退出。`$UNITY_PAGER` 然后 `$PAGER` 覆盖选择并通过 shell 运行，因此 `PAGER="less -S"` 有效；空白值被忽略而不是视为选择退出。与 `projects list` 的分页器不同，这个**仅用于 `human`**，且从不对重定向的 stdout、任何机器格式（`json`、`tsv`、`ndjson`、`github`）、`--quiet`、`TERM=dumb`、流式模式（`editors --watch`、`logs --follow`）、具名 `unity command <name>` 或 `unity shell` 内生效。损坏的分页器代价是分页，而不是输出：指定不存在内容的 `$PAGER` 在任何东西生成之前被解析，而一个生成后死亡的会将输出重新打印到终端，由分页器的退出状态决定（干净退出是正常的 `q` 并丢弃；失败状态重新打印）。退出 0 而不读取的分页器（`PAGER=true`）与 `q` 无法区分，因此其输出丢失。一个仅仅*等待*的分页器不是损坏的；CLI 与它一起等待。

品牌 Unity 页眉（logo、字标、CLI 版本）在落地页面上渲染——裸 `unity`、`unity --help` / `-h`、`unity help` 以及首次运行同意提示之上。它仅在 TTY 上显示，最多打印一次，并在窄终端、无 Unicode 或 `NO_COLOR` 下降级为紧凑、无颜色的文本。管道输出不受影响。在脚本中用 `--no-banner` 抑制它。裸 `unity` 打印用法并退出 0。

## 环境变量

所有 CLI 环境变量使用 `UNITY_` 前缀。CLI 标志总是覆盖相应的环境变量。

| 变量 | 镜像标志 | 描述 |
|---|---|---|
| `UNITY_FORMAT` | `--format` | 输出格式（`human`、`json`、`tsv`、`ndjson`、`github`）。`HUB_FORMAT` 是已弃用的别名。 |
| `UNITY_EDITOR_VERSION` | `--editor-version` | 编辑器版本（例如 `2023.3.0f1`、`latest`、`lts`）。 |
| `UNITY_ARCHITECTURE` | `--architecture` | 芯片架构（`x86_64`、`arm64`）。 |
| `UNITY_PROJECT_PATH` | 路径参数 | 未传路径时的项目路径。由 `open`（和 `projects open`）、连接编辑器的命令 `status`、`command`、`list`、`job` 和 `mcp`，以及 `pipeline install`/`upgrade` 和 `collaboration` 命令遵守。不被 `recompile`、`close`（和 `projects close`）或 `mcp configure` 读取。 |
| `UNITY_QUIET` | `--quiet` | 抑制非必要输出。 |
| `UNITY_VERBOSE` | `--verbose` | 在失败时显示完整错误细节。 |
| `UNITY_NON_INTERACTIVE` | `--non-interactive` | 禁用交互式提示。 |
| `UNITY_NO_BANNER` | `--no-banner` | 抑制品牌横幅。 |
| `UNITY_NO_PAGER` | `--no-pager` | 关闭分页——长列表上的外部以及 `unity projects list` 的交互式。基于存在：任何值都算，包括 `0`。 |
| `UNITY_PAGER` | — | 用于长列表的分页器，覆盖 `$PAGER` 和 `less -RFX` 默认值。通过 shell 运行，因此标志有效（`less -S`）。空白值被忽略，而非选择退出。 |
| `PAGER` | — | 与 `UNITY_PAGER` 相同，仅在其未设置或空白时咨询。 |
| `LESS` / `LV` / `LESSCHARSET` / `MORE` | — | 仅在你未设置它们时传递给分页器，默认为 `FRX`、`-c`、`utf-8` 和 `FRX`。`LESSCHARSET` 在区域设置未声明 UTF-8 时保持多字节字形可读；`MORE` 存在是因为 macOS/BSD 上的 `more` 是另一个名字的 `less` 并读取 `$MORE`，因此没有它时 `PAGER=more` 即使对一行也等待按键。 |
| `UNITY_RUN_TIMEOUT` | `--timeout` | `unity run` 的超时，以秒为单位。 |
| `UNITY_TEST_TIMEOUT` | `--timeout` | `unity test` 的超时，以秒为单位。 |
| `UNITY_CLOUD_ORG` | `--cloud-org` | 单次调用的活动 Unity Cloud 组织 id 或名称。 |
| `UNITY_CLOUD_PROJECT` | `--cloud-project` | 云项目 ID 或名称（服务账户需要 ID）；由 Cloud Build 清单使用。Pipeline Automation 清单是组织范围的。 |
| `UNITY_NO_CLOUD` | `--no-cloud` | 在 `projects create` 和 `projects upgrade` 上拒绝 Unity Cloud 链接。基于存在：任何值都算，包括 `0`。在 `projects create` 和 `projects upgrade` 上，显式的 `--cloud`、`--cloud-project`、`--cloud-org` 或 `--coppa` 胜过它。设置它时 `projects create --vcs uvcs` 被拒绝，除非其中一个标志覆盖它。 |
| `UNITY_SERVICE_ACCOUNT_ID` | — | 非交互式（CI）认证的服务账户客户端 ID。 |
| `UNITY_SERVICE_ACCOUNT_SECRET` | — | 非交互式（CI）认证的服务账户客户端密钥。 |
| `UNITY_PROXY` | `--proxy` | HTTP/HTTPS/SOCKS/PAC 代理 URL。优先于 `HTTPS_PROXY`/`HTTP_PROXY`/`ALL_PROXY` 和持久化的 `proxy.json` 设置。 |
| `UNITY_NO_UPDATE_CHECK` | — | 禁用后台 "update available" 检查（参见 `unity config update-check`）。 |
| `UNITY_NO_AGENT_HINTS` | — | 当 AI 智能体运行 `unity` 时停止建议 Unity 的智能体插件或技能：Claude Code 的安装提示、`unity setup codex` / `unity setup grok` 提示以及 `unity skill install` 提示（`--format json` 下信封 `notifications` 中的 `AGENT_PLUGIN_AVAILABLE` 条目）。基于存在：任何值都算。提示要求你在运行其命令之前获得用户批准。 |
| `UNITY_NO_CONSENT_PROMPT` | — | 抑制一次性首次运行分析同意提示*而不*记录选择——用于在交互式终端上绝不能吸收该提示的包装脚本。分析保持关闭，直到你运行 `unity analytics opt-in`。与 `UNITY_NON_INTERACTIVE` 不同，它不改变命令行为的其他任何方面。 |
| `UNITY_NO_CRASH_REPORT` | — | 完全禁用匿名崩溃/错误报告（Sentry）。 |
| `UNITY_LOG_PROXY` | `--log-proxy` | 为每个出站请求向 `proxy-request.json` 记录一条已脱敏的条目。真值：`1`、`true`。 |
| `UNITY_ACCELERATOR` | `--accelerator` | Unity Accelerator 端点（`host:port`）。优先于持久化的 `accelerator.json`；`--accelerator` 优先于它。 |
| `UNITY_NO_ELEVATE` | `--no-elevate` | Windows：跳过 `install` / `install-modules` 的提升（UAC）安装助手，以便安装服务以非提升方式运行。如果你的账户需要，编辑器的 NSIS 安装程序仍会按需请求提升——管理员令牌总是需要；标准用户从不需要。 |
| `UNITY_INSTALL_RETRIES` | `--retries`（仅 `install-modules`） | `install` 和 `install-modules` 对传输或验证失败的编辑器或模块下载重试的次数。`0` 禁用重试；`unity install` 没有 `--retries` 标志，因此在那里设置该变量。 |
| `UNITY_NO_AUTH_BROKER` | — | 跳过常驻认证代理并直接从操作系统密钥环读取凭据。默认情况下，每个需要令牌的命令都经过一个按需启动并在空闲两分钟后退出的代理（参见 [auth-license-cloud.md](references/auth-license-cloud.md)）。 |
| `UNITY_CLI_HOME` | — | 安装脚本和 `unity self-install` 的安装根目录，在每个平台包括 Windows：二进制落在 `<UNITY_CLI_HOME>/bin` 而不是默认位置。 |
| `UNITY_NO_EDITOR_IDENTITY_SERVER` | — | 禁用在没有 Hub 运行时 `unity open` 启动以响应编辑器登录查询的后台身份助手（参见 [projects-templates.md](references/projects-templates.md)）。基于存在。 |
| `UNITY_EXPERIMENTAL_FEX_EMU` | none | 仅 Linux arm64，实验性且不受支持：在 FEX-Emu 下运行 x86_64 编辑器。`1`、`true` 或 `yes` 开启它，且仅在安装了 FEX-Emu 和 x86_64 RootFS 时生效（`unity doctor` 检查）。已知 C# 脚本编译在 FEX-Emu 下崩溃。参见 [editors-install.md](references/editors-install.md)。 |

**CI 服务账户认证：** 同时设置 `UNITY_SERVICE_ACCOUNT_ID` 和 `UNITY_SERVICE_ACCOUNT_SECRET` 以跳过浏览器 OAuth 流程——这使密钥远离进程参数列表和 shell 历史。它们映射到 `unity auth login` 的 `--client-id` / `--secret-from-stdin` 输入，但从环境读取凭据不是完整登录：它不运行交互式流程，也不将凭据持久化到密钥环。

## 获取帮助

在任何级别向任何命令或子命令追加 `-h` 或 `--help`：`unity --help`、`unity projects create --help`。

不确定用哪个命令？[搜索，而不是 grep 帮助](#find-a-command-search-dont-grep-help)。`unity --help` 和未知命令错误也以该指针结尾。每个搜索结束时都会指出它跳过的来源以及搜索它的命令（JSON 中的 `data.hint`）：在得出什么都不存在的结论之前先遵循它。

## 退出码

先根据退出码分支，然后根据 json 或 ndjson 信封中的 `errors[0].code` 分支。**Retry** 表示
不加更改地再次运行同一命令是否能成功。`unity commands --json` 将此表作为 `exitCodes` 携带，
并带有选择每个退出的错误代码。`6` 涵盖没有更具体代码命名的每个失败；缺失的项目、
未运行的编辑器、未知编辑器命令和超时都有它们自己的代码（`11` 到 `14`）。

<!-- exit-codes:begin (checked against the CLI's exit-code table) -->
| 代码 | 名称 | 重试 | 含义 |
|---|---|---|---|
| 0 | `SUCCESS` | 否 | 命令成功。 |
| 1 | `ERROR` | 否 | 意外或不支持的状态。 |
| 2 | `BAD_ARGS` | 否 | 用法错误：未知命令或选项，或错误的值。 |
| 3 | `AUTH_ERROR` | 否 | 未登录、会话过期或权限被拒绝。 |
| 4 | `NEEDS_CONFIG` | 否 | 缺少设置：所需的工具、设置或链接。 |
| 6 | `COMMAND_FAILED` | 否 | 命令因没有更具体代码命名的原因失败。 |
| 7 | `NETWORK_UNREACHABLE` | 是 | 无法访问所需服务。 |
| 8 | `TESTS_FAILED` | 否 | 测试运行了，有些失败。 |
| 9 | `INSTALL_LOCKED` | 是 | 另一个进程持有安装锁。 |
| 10 | `READY_TIMEOUT` | 是 | 编辑器未及时就绪。 |
| 11 | `NOT_FOUND` | 否 | 命令命名的东西不存在：项目、发布版本、模块。 |
| 12 | `EDITOR_UNREACHABLE` | 是 | 没有运行中的编辑器响应：没有运行、没有匹配，或它拒绝了连接。 |
| 13 | `REMOTE_COMMAND_FAILED` | 否 | 编辑器响应了，但没有该名称的命令。 |
| 14 | `TIMEOUT` | 是 | 操作超时：编辑器请求、HTTP 请求、批处理运行。 |
| 130 | `INTERRUPTED` | 是 | 被 Ctrl-C（SIGINT）中断。 |
| 141 | `OUTPUT_CLOSED` | 否 | stdout 的读取器关闭了管道。 |
| 143 | `TERMINATED` | 是 | 被 SIGTERM 终止。 |
<!-- exit-codes:end -->

`8` 仅用于 `unity test`：测试运行了且有些失败。从未完成的运行退出 `6`，超时的退出 `14`，
因此 CI 可以重试那些，而绝不盲目重新运行失败的测试。`9`：
同一安装的较早项可能已经就位（`data.completedUids`）。`10` 仅用于
`unity open --until-ready`；编辑器仍在运行。

## 命令

完整的逐命令参考——语法、标志和示例——位于 [`references/`](references/) 下的分组文件中。
**阅读你需要的命令组对应的文件**；上面所有全局标志、环境变量和退出码
全程适用。每个命令还支持 `-h` / `--help`（参见[获取帮助](#getting-help)）。

| 命令 | 参考文件 |
|---|---|
| `auth`（login / logout / status / list / switch / default / consumers / revoke）、`license`（activate / return / server）、`cloud`（org / project） | [auth-license-cloud.md](references/auth-license-cloud.md) |
| `pipeline cloud-build`（targets 包括 groups / builds / project / tooling）、`pipeline automation`（apps / pipelines / jobs / automations / bots / profiles / templates，加上 `apps versions`、`pipelines versions`、`jobs stats`） | [cloud-automation.md](references/cloud-automation.md) |
| `editors`（list / running / add / default / path / install-path / info / upgrade / prune / verify / module）、`install`、`uninstall`、`modules`、`install-modules`、`terms`（accept / status） | [editors-install.md](references/editors-install.md) |
| `projects`（list / create / new / clone / open / link / require / upgrade / export / import / pin / size / clean / exec；其帮助写着 "Create, open, upgrade, and link local Unity projects (Unity Cloud, GitHub/GitLab)"，因此将文件夹链接到 Unity Cloud 是 `projects link cloud`，不是 `cloud`）、`open`、`close`、`releases`、`templates`（list / info / create / pack / delete）、`assets`（`inspect` / `export`） | [projects-templates.md](references/projects-templates.md) |
| `config`（proxy / update-check / accelerator / get / set / list / unset / resolve）、`context`（save / use / list / current / delete）、`hub install` | [config-hub.md](references/config-hub.md) |
| `run`、`test`、`build`（+ `build run`）、`recompile`、`watch`（`test`） | [build-run-test.md](references/build-run-test.md) |
| `logs`、`doctor`、`env`、`version`、`cache`、`ci init`、`analytics`、`changelog`、`docs`（+ `toc`）、`language`、`completion`、`bug`、`self-update`、`self-uninstall`、`diagnose proxy`、`diagnose accelerator`、`diagnose update` | [diagnostics-maintenance.md](references/diagnostics-maintenance.md)。要查找、引用和版本匹配 Unity 文档：[docs-workflow.md](references/docs-workflow.md) |
| `mcp`（+ `configure`）、`setup claude` / `codex` / `grok` / `antigravity`、`skill`（install / refresh / show）、`plugin`（install / remove / upgrade / list / changelog）、本地 `pipeline`（install / upgrade / list / list-versions）、`command` / `commands` / `status` / `list`、`job`（status / wait / cancel）、应答打开的模态对话框（`command editor.dialog list` / `answer` / `dismiss`）、`shell` | [integration-advanced.md](references/integration-advanced.md) |
| `vcs` —— `setup` / `status` / `sync` / `switch` / `doctor` / `providers` / `merge-setup` / `conflicts` / `explain` / `resolve` / `diff` / `blame` / `summarize` / `affected` / `hooks`、`vcs git`（`migrate-lfs` / `worktree`）、`vcs uvcs`（`locks` / `changesets` / `review`） | [version-control.md](references/version-control.md) |
| `collaboration`（别名 `collab`）—— `annotations` / `attachments` / `thumbnail` / `reactions` / `read` / `subscribe` / `jira` | [collaboration.md](references/collaboration.md) |

## 常见工作流

### 检查云构建或 Pipeline Automation 资源

阅读 [cloud-automation.md](references/cloud-automation.md) 了解两个组中的每个只读
命令、上下文/认证、逐命令过滤和排序、
输出字段、分页（包括拒绝 `--page`/`--limit` 而不是忽略它们的叶子）、错误和脱敏。
`pipeline cloud-build` 读取 Build Automation；
`pipeline automation` 读取 Pipeline Automation。两者都不需要运行中的编辑器
或本地 Pipeline 包。服务账户使用数字组织 ID。
这些命令不触发构建/作业、获取日志/构件或更改
配置。

JSON/NDJSON 在 `data` 下返回完整的 API 形状结果，如 Collab 那样；NDJSON
有一个终端结果，没有项帧。保留原生字段和自由形式的
元数据，受参考的有界秘密保护和公共 API
脱敏假设约束。表投影保持独立。显式本地构建
目标保留 `_local`；缺失的目标不是本地。这些约定适用于后续的 cloud-automation 工作。

### 编辑场景、GameObject 或资产——先 `unity status`

**在编辑任何场景、GameObject、预制体或资产之前，运行 `unity status` 以检测已连接的编辑器。** 如果有一个可访问，用实时命令驱动它而不是触碰项目文件——编辑器将更改应用到*实际活动场景*并保持其内存状态同步。

```bash
unity status                       # is an Editor connected? (look for state "ready")
unity command                      # discover the scene/GameObject commands THIS Editor exposes
# then drive it with the commands it lists — for example, if your Editor exposes them:
unity command gameobject create   # act on the live, active scene
unity command scene save          # persist the active scene
```

命令被分组并作为 `unity command <group> <name>` 调用。它们的名称由编辑器定义，因此运行 `unity command`（或 `unity list`）查看确切的集合——不要假设名称。

> **当实时编辑器可访问时，绝不要手编辑 `.unity`、`.prefab` 或 `.asset` YAML。** 原始文件编辑：
> - **容易出错**——fileID 和 GUID 是手工分配且容易出错；
> - **对运行中的编辑器不可见**直到重新导入，因此更改静默地未能生效；以及
> - **容易命中错误的文件**——例如写入 `SampleScene.unity` 而编辑器的活动场景实际是 `Demo2.unity`，产生看起来有效但用户看不到变化的 YAML。

**在得出没有编辑器可访问的结论之前排除两个假阴性——两者看起来都与真正关闭的编辑器相同，且在时间压力下都容易搞错：**

- **安全模式。** 如果编辑器*确实*为此项目运行但 `unity command` 无法连接，它可能因编译错误卡在**安全模式**，而不是真正缺失。运行 `unity status`：如果它报告安全模式（`STATUS_SAFE_MODE`，带编译错误），编辑 C# 源码以修复编译错误*就是*正确的做法，而不是回退。参见 [integration-advanced.md → Recovering from Safe Mode](references/integration-advanced.md#recovering-from-safe-mode-connection-fails-because-of-compile-errors)。
- **沙箱化的智能体 shell。** 如果你自己的 shell 命令在限制性沙箱内运行——像这个这样的编码智能体的常见情况——沙箱可能以同样方式从 `unity status` 隐藏真正运行的编辑器。这适用于到达此预检的**每个**场景/GameObject/预制体/资产任务，而不仅仅是明显需要实时编辑器的任务：一个你原本可以在无任何 CLI 参与下完成的任务（例如通过普通编辑器 API 生成资产）仍可能在此被引入 "no Editor" 并脱轨。不要将 "no instances" 视为编辑器已关闭的证据，也不要悄悄即兴发明第三条路径——比如驱动一个单独的无头编辑器进程来近似实时连接会做的事情——作为已披露文件编辑的替代品。明确说明你的沙箱可能阻止你对真实编辑器的视图，并在回退之前询问是否实际打开了编辑器。完整细节：[integration-advanced.md → Sandboxed agent tooling can hide a running Editor](references/integration-advanced.md#sandboxed-agent-tooling-can-hide-a-running-editor)。

只有在排除了上述两者后才回退到直接编辑文件——并明确说明（"no live Editor detected, editing the file directly"）。

### 生成资产、纹理、精灵、图像或 3D 模型：检查 `ai` 目录插件

**在以某种其他方式近似 "generate a texture/sprite/image/3D model for my project" 请求之前，
检查是否安装了 Unity AI Generators 插件（`ai`）。** 它是 Unity 自己的目录插件，正是为这类请求准备的，使用它几乎总是更好的答案。
下面相同的三步模式（识别意图、检查目录、安装前询问）
适用于 CLI 随附的任何目录插件，而不仅仅是这一个；`unity plugin list` 总是
反映完整目录，无论是否安装，因此它也是你发现其他可用内容的方式。

1. **检查是否安装。**
   ```bash
   unity plugin list --format json
   ```
   找到 `id` 为 `"ai"` 的条目并读取其 `installed` 字段（`true` / `false`）。

2. **未安装？告诉用户，然后询问，绝不静默安装。** 明确说明 Unity
   随附一个涵盖此内容的 AI Generators 插件，并在运行之前等待确认：
   ```bash
   unity plugin install ai
   ```
   拒绝是正常的回答：回退到你原本会做的任何事，并且不要在同一对话中
   再次询问。

   `ai` 是 alpha 版，在 alpha 期间它受限于 Unity 内部网络上的 Unity 员工。普通
   用户的 `unity plugin install ai` 可能因**登录**消息失败（"Unity AI
   Generators is currently limited to Unity staff. Sign in with a Unity staff account…"）或，一旦越过那一步，
   如果从你运行的位置无法访问它需要的网络，则是普通的**下载失败**。两者都不是
   请求中的 bug：报告该消息并回退，与任何其他拒绝相同。

3. **在同一会话中拾取其智能体技能。** 目录插件可以在其负载中附带自己的智能体技能
   （`ai` 就是这样），而安装插件本身并不会使该技能
   对你可见；它必须像本技能本身一样被镜像：
   ```bash
   unity skill install <client>     # e.g. claude-code, first time this session
   unity skill refresh              # already mirrored earlier? re-render it fresh
   ```
   `unity plugin install` 自己的最后一行已告诉你哪个适用：它在安装附带了技能
   的副本之后立即指向 `unity skill install`，而一旦某个已镜像但插件的副本刚变化，
   则指向 `unity skill refresh`。用 `unity skill list --format json` 确认
   它落在哪里（寻找 `skill` 字段命名插件自己技能的行，例如 `unity-ai`，并读取其 `path`），然后在驱动插件的命令之前阅读该文件。
   不要从本技能猜测其命令面，本技能只记录 `unity` 本身。

**在此之前调用的命令**（直接键入 `unity ai …`，或凭记忆建议）
**会以清晰、可操作的消息失败**，命名确切的安装命令（`unity plugin install
ai`），在人类和机器（`--format json` / `--format ndjson`）输出中都是如此，位于稳定的
错误代码 `TOOL_NOT_INSTALLED` 下。读取该消息，而不是猜测命令为何
什么都不做；同样的形状（`TOOL_UNSUPPORTED_PLATFORM`、`TOOL_RUNTIME_NOT_INSTALLED`）涵盖
目录工具无法运行的另外两个原因。

### 从零引导新项目

> 对于**引导式**端到端体验——概念问题、在你规划时后台安装编辑器、
> 包选择和变现交接——使用
> **`new-unity-project`** 技能。本节是该技能所基于的原始 CLI 配方；当你只想要命令时
> 直接使用它。

仅使用 CLI 将想法变成一个可运行、受版本控制的项目。**先决定目标
平台**——它们决定你在步骤 2 安装哪些编辑器模块。你可以稍后添加
模块（`unity install-modules`），但项目在该平台的模块安装之前无法为该平台构建，
因此最简单的是提前决定。

```bash
# 1. Confirm the CLI works and you're signed in and licensed (see references/auth-license-cloud.md).
unity --version
unity auth status --format json      # if signed out:      unity auth login
unity license status --format json   # if none active:      unity license activate

# 2. Pick and install an Editor with the modules your target platforms need.
#    Default to the latest LTS (most stable, ~2 years of patches). Reach for a Tech-stream
#    release (--stream tech) only for a feature not yet in LTS; treat --stream beta/alpha as
#    evaluation-only, never for a project you intend to ship. A deadline argues for LTS.
#    (lts / latest aliases work almost everywhere a version is accepted — `templates` is the
#     exception; see step 3.)
unity releases --stream lts --limit 5 --format json
unity install lts --module android --module ios --yes --accept-eula   # add --module webgl, etc.
unity editors --installed --format json                               # confirm it landed

# 3. List the real template ids this Editor offers — don't guess them — and pick by RENDER
#    PIPELINE, not just by 2D/3D. Default to the URP templates:
#      3D → com.unity.template.urp-blank      ("Universal 3D")
#      2D → com.unity.template.universal-2d   ("Universal 2D": URP + the 2D packages)
#    com.unity.template.3d and com.unity.template.2d are the Built-in Render Pipeline templates
#    (displayName "… (Built-In Render Pipeline)"): deprecated from Unity 6.5, gone in 6.7. Use
#    them only when the user explicitly asks for Built-in. Confirm the pick with the JSON
#    `renderPipeline` field — it is blank for universal-2d on current releases, so match that
#    one by id.
#    NOTE: `templates` does NOT resolve the lts / latest aliases — unlike `install` and
#    `projects create`, it passes --editor straight through and rejects anything that is not a
#    concrete 6000.x.y. Use the version you just installed (read it from `editors --installed`).
unity templates list --editor <6000.x.y> --type core --format json

# 4. Create the project. The first positional arg is the NAME; --path sets the parent directory.
#    All options supplied, so it won't prompt; add --non-interactive in CI.
#    (To publish it to a remote in the same step, use the source-control forms below instead.)
unity projects create "MyGame" --path ~/UnityProjects \
  --editor-version lts --template com.unity.template.urp-blank

# 5. Add the Pipeline package BEFORE the first open. `unity command`, `unity status` and
#    `unity command script eval` all need it, and templates don't include it. The Editor reads
#    Packages/manifest.json when it loads the project, so installing first means the package
#    is live from the first open.
unity pipeline install --project-path ~/UnityProjects/MyGame

# 6. Open the project and wait until its Editor is ready to take commands. Pass the project's
#    full path: a path that exists matches that project's Editor only, so an Editor open on a
#    sibling checkout such as ~/UnityProjects/MyGame-lighting can't end the wait.
cd ~/UnityProjects/MyGame
unity open .
unity status --until-ready --project-path ~/UnityProjects/MyGame --format json
```

**然后在实时编辑器中构建场景，而不是在批处理模式下。** 针对运行中的编辑器，用 `unity command script eval`（或编辑器自己的 `unity command`
工具）创建 GameObject、接线组件并设置资产引用，并用相同方式回读结果。每一步都可以在下
一步之前检查。通过 `unity run -- -executeMethod` 运行的脚本是没有编辑器能保持打开时（CI、无头构建机器）的**回退**。它看不到它产生了什么：保存为 null 的引用，例如没有 `PanelSettings` 的 `UIDocument`，仍报告成功。如果你确实使用批处理模式，请在实时编辑器中打开结果并在宣布工作完成之前检查它。如何让编辑器来驱动：
[integration-advanced.md → Getting an Editor to drive](references/integration-advanced.md#getting-an-editor-to-drive)。

**源代码控制——让用户选择。** CLI 为任何提供商一步将新项目发布到新的远程。**始终在 stdin 上传入令牌**（`--git-token-from-stdin`），以便秘密从不
落入 shell 历史或进程列表。根据项目选择——不要默认一个：

- **Git —— GitHub / GitLab**（`--vcs github` / `--vcs gitlab`）。无处不在。对于资产密集的游戏
  添加 **Git LFS**（`--git-lfs`），以免大二进制文件膨胀历史。
- **Unity Version Control —— UVCS**（`--vcs uvcs`）。Unity 自己的 VCS，为大型二进制游戏
  资产而建：它原生处理它们（**无需 LFS**）并支持文件锁定——通常对美术密集型项目或较大团队
  更合适。认证使用你的 Unity 登录；`--vcs-region`
  选择区域。

```bash
# Git (GitHub) — drop --git-lfs if the game isn't asset-heavy. Add --no-initial-commit if you
# want to add packages/assets BEFORE the first commit (see the new-unity-project flow).
unity projects create "MyGame" --path ~/UnityProjects \
  --editor-version lts --template com.unity.template.urp-blank \
  --vcs github --git-namespace my-org --git-repo my-game \
  --git-visibility private --git-default-branch main --git-token-from-stdin --git-lfs

# Unity Version Control (UVCS) — handles binaries natively, so no LFS:
unity projects create "MyGame" --path ~/UnityProjects \
  --editor-version lts --template com.unity.template.urp-blank \
  --vcs uvcs --git-namespace my-org --git-repo my-game --vcs-region <region>
```

从秘密存储向 `--git-token-from-stdin` 提供令牌，绝不要用字面量——例如
`… --git-token-from-stdin <<<"$GIT_TOKEN"`，其中 `$GIT_TOKEN` 来自你的 CI/秘密管理器
（UVCS 使用你的 Unity 登录，因此无需令牌）。

**日常使用 UVCS 工作区：几个包装的读取，其余全部直接传给
`cm`。** 这种划分是刻意的且值得教授，因为猜错会浪费用户的时间：

- **`unity vcs uvcs <verb>`** 包装将 **`cm` 的数据连接到你的项目**的读取——
  `locks`（谁持有锁，*以及哪些锁覆盖你已更改的文件*）、
  `changesets` 和 `review`。这些连接是 `cm` 无法为你做的事情，它们以
  稳定的信封返回，因此每当有东西*解析*输出时优先使用它们。
- **`unity uvcs <args>`** 将整个命令行逐字转发给 `cm`，包括 `--help` 和
  `--format`。这是受支持的路线，不是变通方案：`cm` 拥有并版本化这一
  词汇表，包装它会固定一个会过时的改写。对于**部分
  检出**、**搁置集**和**获取或释放锁**，以及当人类阅读输出时，使用它。

```bash
unity vcs uvcs locks                       # who holds what, and what collides with your changes
unity uvcs lock list                       # the raw listing, cm's own flags and output
unity uvcs partial update /Assets/Levels   # cm's own vocabulary, unchanged
unity uvcs shelve -c "wip: lighting pass"
```

每个动词、标志和陷阱：[version-control.md](references/version-control.md)。

`unity cm <args>` 是 cm 自己名称下的相同直通。两者都需要 `cm` 客户端；用 `unity plugin install plastic` 安装它（如果命令说它缺失）。

**超出设置，`vcs` 组涵盖整个第 2 天循环**——`status`、`sync`、`switch`、
`merge-setup`、`conflicts` / `explain` / `resolve`、`diff`、`blame`、`summarize`、`affected`、
`hooks`、`doctor`、`providers`——而 Unity 语义是选择它而非原始
`git` 的原因。完整参考，带标志和陷阱：
[version-control.md](references/version-control.md)。

**Git 令牌属于用户的凭据管理器，而不是 CLI。** 当没有给出令牌标志或环境变量时，
CLI 询问 `git credential fill` 并使用配置的助手返回的任何内容；它
不存储传给或告知它的任何内容。不要建议 CLI 能保存 Git 令牌，也不要当用户已有
可用的凭据助手时动用令牌标志。如果他们想为每个组织使用不同的令牌，那是
`git config --global credential.useHttpPath true` 加上多账户
助手，如 [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager)。
CLI 传入完整仓库 URL 以便助手可以区分，但它从不安装或
重新配置助手。`UNITY_GITHUB_TOKEN` / `UNITY_GITLAB_TOKEN` 是每个提供商一个令牌，因此
跨越多个组织的 CI 作业应在每次调用时传入 `--git-token-from-stdin`。参见
[references/projects-templates.md](references/projects-templates.md) 了解完整
源代码控制标志集。对于纯本地 Git 仓库，用适合 Unity 的忽略初始化 git，以便多 GB 的 `Library/` 和其他生成文件夹永远不会被提交：

```bash
cd ~/UnityProjects/MyGame
git init -b main
# Download (do not pipe to a shell) a maintained Unity .gitignore:
curl -fsSL https://raw.githubusercontent.com/github/gitignore/main/Unity.gitignore -o .gitignore

# Asset-heavy game? Keep large binaries out of git history with Git LFS:
git lfs install
git lfs track "*.psd" "*.fbx" "*.wav" "*.mp3" "*.png"   # adjust to your asset types
git add .gitattributes

git add -A
git status                             # sanity-check: Library/ Temp/ obj/ Build/ must NOT be staged
git commit -m "Initial Unity project: MyGame"
git ls-files | grep -c '^Library/'     # must print 0
```

**CLI 覆盖什么和不覆盖什么。** CLI 处理编辑器、项目和源代码控制。
它没有顶层包命令。要添加超出模板的 UPM（Unity Package Manager）包，使用
**`unity-package-management`** 技能：它通过 `unity command` 运行 Pipeline `package add`
命令，以无头 C# 脚本作为回退。对于变现/后端，交接给专门的技能：`implement-in-app-purchases`
（IAP）、`levelplay-unity-integration`（广告）或 `build-live-game`（账户、云存档、
经济、远程配置、排行榜）。一旦上面的步骤 5 和 6 完成，就在打开的
编辑器中工作。

**在编辑器已打开时安装了 Pipeline 包？** 编辑器仅在其下次刷新时拾取
manifest 更改。在此之前 `unity status` 报告
`STATUS_PIPELINE_LOAD_PENDING`（或在该代码存在之前的 CLI 发布版上为 `STATUS_NO_INSTANCES`）。仍在打开或导入的编辑器会报告相同的代码，直到它完成，
因此先等待那个（`unity status --until-ready`）。CLI 无法自行触发刷新：
如果编辑器已完成打开，请用户切换到 Unity 编辑器窗口，然后
重新运行 `unity status --until-ready`。在首次打开之前安装（步骤 5）完全避免了这一点。

### 查找并安装缺失的编辑器

```bash
# 1. Check what's installed
unity editors --installed --format json

# 2. Browse available LTS versions
unity releases --lts --limit 5 --format json

# 3. Install
unity install 6000.0.47f1 --yes --accept-eula
```

### 用正确的编辑器打开项目

```bash
# 1. Check the project's required editor version
unity projects info /path/to/MyProject --format json
# Look at "editorVersion" in the result

# 2. Confirm that editor is installed
unity editors --installed --format json

# 3. Open (warns if the editor version is missing)
unity open /path/to/MyProject
```

### CI：激活许可证，然后构建

```bash
# 1. Activate a license without signing in; a service account cannot activate one.
#    A perpetual or legacy serial: store it as the CI secret UNITY_LICENSE_SERIAL
#    (the name `unity ci init` generates) and pass it to the step, e.g. in GitHub
#    Actions `env: { UNITY_LICENSE_SERIAL: ${{ secrets.UNITY_LICENSE_SERIAL }} }`.
#    A serial tied to a subscription needs a signed-in user, so for those seats use
#    --floating, or the offline --generate-request / --file path (see "Headless /
#    fleet license activation" in references/auth-license-cloud.md).
unity license activate --serial "$UNITY_LICENSE_SERIAL"   # or: unity license activate --floating

# 2. Only if the job also runs cloud commands: export UNITY_SERVICE_ACCOUNT_ID and
#    UNITY_SERVICE_ACCOUNT_SECRET from the CI secret store. Every later command reads
#    them directly, with no `unity auth login` and nothing written to a credential
#    store (which a headless runner may not have).

# 3. Build
unity build /path/to/MyProject \
  --editor-version 6000.0.47f1 \
  --target StandaloneLinux64 \
  --execute-method Builder.PerformBuild \
  --allow-install
echo "Exit code: $?"

# 4. Return the license when done (serial or assigned seats)
unity license return --yes
```

### CI：无头构建

优先使用专门的 `unity build` 命令（处理批处理模式、日志和 CI 标志）：

```bash
unity build /path/to/MyProject \
  --editor-version 6000.0.47f1 \
  --target StandaloneLinux64 \
  --execute-method Builder.PerformBuild \
  --allow-install
echo "Exit code: $?"
```

或使用 `unity run`（批处理模式是自动的——绝不要传 `-batchmode`/`-quit`）：

```bash
unity run /path/to/MyProject \
  --editor-version 6000.0.47f1 \
  --allow-install \
  -- -executeMethod Builder.PerformBuild -logFile build.log
echo "Exit code: $?"
```

为播放器构建编写脚本？将每个 `MonoBehaviour` 单独放在以其类命名的 `.cs` 文件中。多个在
一个文件中可以在编辑器和 Play 模式中正常运行，但构建的播放器在启动时崩溃，说场景文件
如 `level0` 已损坏。参见 [build-run-test.md](references/build-run-test.md#build)。

### CI：运行测试并发布结果

```bash
unity test /path/to/MyProject \
  --editor-version 6000.0.47f1 \
  --mode EditMode \
  --report-format junit \
  --output ./test-results.xml \
  --allow-install \
  --timeout 600
case $? in
  0) echo "All tests passed" ;;
  8) echo "Tests failed — report to developers, do not retry" ;;
  *) echo "Run did not complete — infrastructure failure, safe to retry" ;;
esac
```

退出 `8` 意味着运行完成并报告失败的测试；任何其他非零代码意味着它从未产生
裁决。在 `--format json` 下相同的划分是 `errors[0].code`：`TESTS_FAILED` 对
`TEST_RUN_ERROR` / `TEST_TIMED_OUT`。

`--report-format junit` 使 `--output` 成为 JUnit 架构报告，GitHub Actions 和 GitLab
将其作为原生测试结果摄取而无需转换步骤。即使测试失败也会写入它。去掉该标志为
NUnit3 默认值，或使用 `--report-format nunit,junit` 从一次运行获得两者。添加 `--coverage` 通过
Unity Code Coverage 包收集覆盖率——如果项目没有该包它会警告并继续。参见 [build-run-test.md](references/build-run-test.md)。

**在更改上迭代，而不是在门控流水线？** 运行能为该更改失败的最便宜的测试。先尝试 EditMode。
在工作时使用 `--filter`、`--affected` 或 `--rerun-failed`。在交回工作之前，对最终代码
每种模式运行一次完整套件。绝不要在未改变的代码上重新运行套件，除非运行以 `6` 退出且无裁决。
这些运行保留 NUnit 默认值，因为 `--affected` 和 `--rerun-failed` 无法读取上面 CI 示例写入的
仅 JUnit 报告。[build-run-test.md](references/build-run-test.md#run-the-cheapest-test-that-proves-the-change)有该规则，以及每个标志读取和写入哪个报告。`unity test` 拒绝在编辑器中打开的项目：不要关闭用户的编辑器来腾出空间，
也不要在他们处于 Play Mode 时启动测试运行。

### 调试 CLI

```bash
# Check auth + installed editors + recent errors in one command
unity doctor --format json

# Follow live logs during an install
unity logs --follow --level info
```

---

## 通知

`--format json` 或 `--format ndjson` 信封可能携带一个 `notifications`
数组：关于用户环境的通告，而不是关于你运行的命令。
**当存在一个时，告诉用户**——他们没有其他方式看到它，因为面向人类的等价物是终端横幅，永远不会到达
你。

没有东西要报告时该键缺席，因此读取为
`envelope.notifications ?? []`。

```jsonc
{
  "code": "CLI_UPDATE_AVAILABLE",
  "message": "A new version of the Unity CLI is available: 1.0.0-beta.8 → 1.0.0-beta.9",
  "data": { "current": "1.0.0-beta.8", "latest": "1.0.0-beta.9" },
  "remediation": { "command": "unity self-update", "requiresUserApproval": true }
}
```

根据 `code` 分支；`message` 是本地化的并用于显示。`data` 按 `code` 成型。

`PLUGIN_UPDATE_AVAILABLE` 意味着已安装的插件有更新的版本。
`data` 是 `{ "plugin": "<id>", "current": "…", "latest": "…" }`，remediation 是 `unity plugin upgrade <id>`。每个过时的插件有一个条目。

`remediation` 说明通知如何解决。它可能缺席，这意味着通知是信息性的且没有东西要运行。

`FEX_EMU_EXPERIMENTAL` 意味着命令在 Linux arm64 上通过 FEX-Emu 运行了，或将运行 x86_64 编辑器。告诉用户它是实验性且不受支持的，并且已知 C# 脚本编译在那里崩溃。

**`requiresUserApproval: true` 意味着不要自己运行 `remediation.command`。** 呈现通知和命令，让用户决定。

---

## 说明

- `--non-interactive` 和 `--yes` 一起抑制所有提示——在 CI 中两者都用。
- 短标志在每个命令上的含义相同：`-y` 在存在 `--yes` 的任何地方都是 `--yes`，`-a` 是 `--architecture`。`unity projects list` 和 `unity projects size` 将 "every project" 拼为 `--all`；写那个，不是 `-a`。CLI 仍接受的旧拼写（那里的 `-a`、`status` 上的 `--project`、`--template-version`、`--hub-version`、`--package-version`、`--list-components`、`--install-dir`、`--childModules`、`--wait-timeout`、`--git-token-stdin`、`command` 上的 `--group_by`、`collaboration annotations` 上的 `--local-space`、`collaboration` 上的 `--project-id` 和 `--organization-id`、`projects list` 上的 `-v`、`releases` 和 `vcs git migrate-lfs` 上的 `--since`）会打印警告，命名要使用的拼写；`editors` 和 `projects list` 上的 `--verbose` 也是如此，它仍显示每列但现在拼为 `--long`；在 `--format json` 中它在信封的 `warnings` 里。使用新拼写，以免警告落入你解析的日志。
- `--timeout` 在每个命令上取写成数字的整数秒（`--timeout 600`），`UNITY_BUILD_TIMEOUT`、`UNITY_RUN_TIMEOUT` 和 `UNITY_TEST_TIMEOUT` 也是如此。单位、分数或指数（`30s`、`5m`、`1.5`、`1e3`）是用法错误（退出 `2`），因此自己将分钟转换为秒。
- `--format json` 总是产生机器可读输出；优先于解析人类文本。错误信封与成功信封一样以相同的 2 空格缩进漂亮打印。
- **`success` 恰好在退出码为 `0` 时为 `true`。** 答案为否的状态命令（`unity auth status` 已登出、`unity license status` 无许可证、`unity status` 无就绪编辑器）是失败：`success: false`、一个命名答案的 `errors[0].code`，且其报告仍在 `data` 中。什么也没找到的列表（`unity editors running` 无编辑器）成功并带空列表。
- **从 stdout 而非 stderr 读取失败。** 失败的命令仍向 stdout 写入完整文档：在 `--format json` 下是一个带 `success: false` 和已填充 `errors` 数组（`errors[0].code` 是要分支的稳定令牌）的信封；在 `--format ndjson` 下是通常的终端 `{"type":"result","success":false,…}` 帧。**每个 ndjson 流都以恰好一个终端 `{"type":"result"}` 帧结束，成功时也是如此**，因此没有它的流被截断了。表形列表（`unity editors`、`unity editors upgrade --check`、`unity templates list`、`unity releases`、`unity projects list`、`unity context list`、`unity auth list`、`unity modules list`、`unity list`、`unity doctor`、`unity cloud org list`、`unity cloud project list`）先每行写一行，行上没有 `type` 字段，然后是一个终端帧，其 `data` 为 `{"count": N}`。单记录答案（`unity version`、`unity language`、`unity config proxy`、`unity cache info` 等）就是该帧本身，其 `data` 与 `--format json` 相同；`unity env` 写其行，然后是帧。`--quiet` 从不改变 json 输出。它也从不改变 ndjson 输出，除了 `unity editors upgrade`、`unity editors module list`、`unity install-modules`、`unity build --list-targets`、`unity build --list-profiles` 和 `unity env` 在 `--quiet` 下仍会丢弃其行（终端帧保留），这是一个已知 bug；当你需要那些行时保持 `--quiet` 关闭。任一格式中的警告仅出现在 `warnings` 中，从不在 stderr 上。`--watch` 列表仅在 Ctrl-C 时结束，不写终端帧。少数命令（其中包括 `unity install-modules --list`）仍以没有终端帧结束成功的 ndjson 流，这是一个已知 bug。**根据 `success` 分支，绝不根据 `data` 分支**——`data` 在失败时通常为 `null`，但并非总是：部分 `unity auth switch` 模糊时携带 `data.candidates` 供你消歧，部分 `unity editors add` 失败时每路径携带一行。检查 `success` 和退出码——绝不要将空 stdout 视为失败信号，也不要解析 stderr，在这些格式中 stderr 只携带人类诊断。如果非零退出时 stdout 为空，那是该命令中的已知 bug，而不是你应该针对其编码的形状。
- `unity <version> [path]` 是 `unity open [path] --editor-version <version>` 的简写。可用于 `lts`、`latest` 或像 `6000.0.47f1` 的完整版本字符串。
- CLI 支持 kubectl 风格插件：PATH 上任何 `unity-<name>` 二进制都可作为 `unity <name>` 调用。
- 终端输出针对服务器提供的值（项目标题、编辑器版本、模块名称）的控制字符 / 转义序列注入进行了加固——C0 控制字符和非 SGR 转义序列从表格/列表/树输出中剥离，现在还从 Commander 用法错误、`unity bug` 日志归档警告以及 `unity projects add`/`remove` 机器（tsv）输出中剥离，同时保留 SGR 颜色/样式代码。
- CLI 通过 Sentry 报告匿名崩溃和错误以帮助修复 bug（无 IP 地址或主机名；主目录路径和类令牌值在发送前被擦除），与 Unity Hub 一致。选择加入分析还会附加一个匿名机器 id；选择退出的用户保持完全匿名。设置 `UNITY_NO_CRASH_REPORT` 完全禁用报告。另外，每次运行都会发送一个匿名 `cli telemetry` 使用 ping，无论分析/同意状态如何——参见 [diagnostics-maintenance.md](references/diagnostics-maintenance.md#analytics--usagetelemetry-consent)。
- `unity --version` 打印你拥有的版本。`unity self-update --check --format json` 说明你已安装渠道上是否存在更新的版本（beta 跟随 beta）。`unity self-update --check --channel stable --format json` 检查稳定发布，例如一旦 GA 发布就迁离 beta 时。
- **始终使用最新版本的 Unity CLI，除非被告知使用特定版本。** 较新的 CLI 经常添加这些文档所描述的命令和输出字段，因此过时的 CLI 会以看起来像文档错误的方式失败。
- 从 `0.1.0-beta.8` 起，CLI 在后台检查更新的版本并打印不显眼的 "update available" 通知（仅交互式会话；从不延迟命令）。用 `unity config update-check off` 或 `UNITY_NO_UPDATE_CHECK` 环境变量将其关闭。
- 同样的检查也涵盖 CLI 安装的插件（`unity plugin install`）：当其中一个有更新的版本时，通知会命名它并建议 `unity plugin upgrade`，每天最多一次。同样的两个开关将其关闭。
- **在 `--format json` 和 `--format ndjson` 下，同一通知以信封上的 `notifications` 数组到达你**——参见下面的[通知](#notifications)。通过 MCP 它每会话到达一次，作为服务器 `initialize` `instructions` 中的散文。
- 每个 CLI 命令的出站 HTTP 都遵循解析后的代理（参见 `unity config proxy`）。无效的 `--proxy` 值（格式错误的 URL 或不支持的方案）以用法错误（退出 2）失败，而不是被静默忽略。用 `unity env --format json` 或 `unity doctor --format json` 检查 CLI 实际解析了什么——两者都会浮现活动代理 URL、其来源和认证来源。
