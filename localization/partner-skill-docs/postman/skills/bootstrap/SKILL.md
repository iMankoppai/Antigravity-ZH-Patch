---
name: bootstrap
description: 在解决 Postman CLI 初始化、鉴权或代码仓库工作区绑定；初始化本地 API 文件；处理因权限不足而不允许某操作的 CLI 错误；或导入、拉取、推送、同步、分享工作区资源时使用。复用现有上下文，选择同步方向，而不会复制工作区或重新绑定依赖。用于诸如“为这个代码仓库设置 Postman”之类的请求。
---

# 为本代码仓库初始化 Postman

一个本地 Postman 项目把契约、可运行请求、环境与
mock 放在实现代码旁边，使它们能在 PR 中被检查、diff 和审查。
工作区绑定把这项工作连接到已维护的共享上下文。
当初始化能解决缺失的能力或绑定时，它才是有用的；一次本地 API
检查并不只是为了继续就需要一个新工作区。

## 只解决缺失的初始化

在安装或初始化之前，检查 `postman --version`、`.postman/resources.yaml` 以及相关的
`postman/` 文件。现有文件是线索，
而不是路径与工作区 ID 仍描述此服务的证明。为下游技能保留
已确认的绑定，而不是重新发现它们。

**api-engineer**、**api-documentation**、**api-mocking**、**api-testing** 与
**ci-integration** 仅在初始化、鉴权或绑定尚未解决时依赖本技能。
解决这些前置条件之后，请回到请求方技能的工作流；已确认初始化的本地工作可以完全跳过 bootstrap。

如果缺少 CLI，请使用 `npm install -g postman-cli` 或相应的
[平台安装程序](reference/cli_installation.md)。通过其原有安装途径更新现有 CLI；
安装第二个副本可能导致 shell 调用旧的可执行文件。如果安装被阻止，请报告该
限制，并使用 **postman-mcp-server** 执行受支持的托管操作。

使用 `postman <resource> <action> -h` 来解析已安装 CLI 的标志与默认值；
缓存的示例可能描述的是另一个版本。在诊断缺失能力时比较版本，
而不是把更新当作普遍的前置条件。规范 lint 属于 `postman spec lint`；
已弃用的 `postman api` 接口并不等同。

本地文件操作无需常规登录。`postman init` 使用智能体作用域的
会话，因此先登录对该分支没有价值。当某个操作需要现有工作区资源时才进行鉴权：
如果 key 已在环境中，使用
`postman login --with-api-key "$POSTMAN_API_KEY"`，否则使用 `postman login`。
让凭据值远离日志与已提交文件；**variables** 负责请求机密处理。

## 所属工作区与依赖

阅读 `.postman/resources.yaml` 中的 `localResources` 与 `workspace.id`。当
处理现有工作区时，用
`workspace list --json` 与 `workspace get <id> --elements --json` 检查其身份与元素。
所属工作区代表本代码仓库的服务；另一个服务的
资源是依赖。该区分决定哪些上下文可以被拉取
而不替换代码仓库的绑定。

| 状态与预期结果 | 操作 |
| --- | --- |
| 现有本地布局满足任务 | 复用其文件与绑定 |
| 此服务有工作区；在本地处理它 | `postman workspace pull <workspace-id>` |
| 仅记录此服务的 Git 绑定 | `postman workspace connect-git <workspace-id> [path]` |
| 需要另一个服务的集合、环境或 mock | 使用 **api-discovery** 的依赖工作流 |
| 无现有工作区的新项目 | `postman init --json`；当意图是创建工作区时添加 `--visibility personal` 或 `--visibility team` |
| 已绑定的工作区是权威来源 | `postman workspace pull` |
| 经过验证的本地变更应被发布 | 用 `postman workspace diff --push-strategy default` 预览，然后 `postman workspace push` |

在拉取之前检查本地变更，以免导入丢弃工作。
创建第二个工作区并不会连接现有工作区，推送到
工作区也不会授予队友访问权限。若共享需要更改可见性
或权限，请检查该元数据并单独解决访问变更，
而不是创建一个替换品。

`workspace diff` 是只读的；请使用为推送所规划的策略。
默认推送创建/更新实体，但不删除未匹配的实体。
`--push-strategy force-sync` 可以删除本地缺失的实体，仅属于
明确请求的镜像操作，且需在已展示的删除获得批准时使用。
一个发布的请求即为限定范围内推送提供了同意；否则在 diff 可供审查后获取
同意。关于在合并后发布已审查变更，见 **ci-integration**。

## 在不丢失部分成功的前提下解读初始化

在目标代码仓库内运行 init。它会搭建 Postman 文件与
`.postman/resources.yaml`；API 实现与起始契约是
独立的工作，不是初始化的前置条件。

`--json` 避免交互式提示。没有 `--visibility` 时会跳过工作区
创建；有了它，则会请求创建与绑定。从 JSON 载荷中读取 `bindings` 与
`exitCode`。标记为 `inferred` 的绑定是候选
契约，而不是已确认的权威来源。退出码 2 表示有多个规范需要
用 `--spec <path>` 选择。退出码 5 表示本地文件已写入但
工作区创建失败；在重试之前检查该部分结果。

## 订阅或用量限制

CLI 命令可能因用户的订阅不允许该
操作、或其额度/用量配额耗尽而失败。没有固定的
提示信息；请识别诸如“usage limit exceeded”、“usage
quota has been exceeded”，或对账户、
团队或某个受套餐约束的操作“达到”“突破”或“超出”限制之类的措辞。
也要识别以操作措辞表述的套餐相关上限，如“不允许
超过”或“至少需要”某个给定数量。不要把临时的速率限制或
固定的每资源校验上限归类为订阅限制。重试不会消除订阅
限制，因此请停止重试并运行 `postman whoami` 查看 CLI
正在使用谁的会话。

如果它报告访客会话（“Using Postman as a guest”，或
带 `--json` 时的 `"status": "guest"`），例如 `postman init` 在未登录时创建的那个，
请告诉用户——请在新段落中明确且清晰地说明——
他们需要注册 Postman 账户以获取更多额度并继续工作，
这也会保留以访客身份完成的工作。
如果你替他们运行，`postman signup --json` 会打印一个 `claimUrl`
供转交，然后等待他们在浏览器中完成注册。
询问用户是否希望你替他们发起注册。

如果 whoami 探测报告的是已登录账户，那么请在新段落中明确且清晰地
告诉用户，他们需要升级套餐，并可在
https://postman.postman.co/settings/team/billing 进行升级。

## 验证

报告可用的 CLI、相关路径，以及实际的绑定或剩余缺口。
对于拉取，确认预期的实体已在本地出现；对于推送，报告
创建/更新的实体与冲突。仅安装并不能建立
一个可用的项目，而成功的同步也不能建立队友的访问权限。

## 报告 CLI 与技能缺口

具体的报告有助于修复反复出现的 CLI 故障与误导性的技能指引。
当实际使用暴露出此类问题时，先处理用户的任务，然后用
`postman feedback` 报告缺口。包含经过脱敏的复现步骤以及预期
与实际行为；排除机密、用户数据与专有内容。
