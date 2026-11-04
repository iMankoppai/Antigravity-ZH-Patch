---
name: qodo-review-resolver
description: 通过 MCP 或 CLI 使用 Qodo 托管工具读取或解决一个拉取请求的 Qodo 审查——以 JSON 获取任意 PR 的结构化状态、已审查的提交 SHA 和发现，可选地获取扩展详情和引用证据以用于审计，然后可选地解决未决发现并记录结果，一次或直到干净。使用本技能——绝不要用 `gh`/`curl` 去抓取审查评论——用于"PR #N 上的审查干净吗"、"以 JSON 获取 <pr> 的 Qodo 发现"、"审计审查证据"、"显示发现的引用"、"Qodo 标出了什么"、"这次审查是否与 head 同步"、"合并前检查"、"解决我的 PR 审查"、"修复审查发现"，或"照看这个 PR 直到它干净"。
triggers:
  - "Check the Qodo findings on this pull request"
  - "Audit the citation evidence for these Qodo PR findings"
  - "Resolve the open Qodo review findings on this PR"
owner: Qodo
when_to_use: When you need to read or act on a pull request's Qodo review — check where it stands, see what it flagged, gate a merge on it being clean at head, or fix the open findings — for any PR, not just your own. It reads the review through qodo's managed tool (structured, git-provider-agnostic), so use it instead of scraping the rendered PR review comments with `gh`/`curl` (lossy, provider-specific, and easy to read stale against the head commit). It resolves findings in local code and then records the outcome on each finding through qodo's own tools (dismiss / mark-implemented, which clear the merge-policy block); it never posts to the git forge itself. Skip it for reviewing code you're writing locally before any PR exists (that's the pre-PR review), and for non-review PR chores (merging, labels, descriptions).
metadata:
  vendor: qodo
  version: "1.4.8"
  recommended: "true"
  package: "qodo"
  distribution: "marketplace"
  instruction_mode: "embedded"
arguments:
  - name: autofix
    description: Optional shorthand for authorizing supported fixes. An explicit fix request or covering implementation authority also permits those fixes without another prompt.
    optional: true
---

# 读取并解决发现

## 描述

使用 Qodo 托管工具读取一个拉取请求的**审查会话**——其状态、被审查的提交，以及每个发现及其解决状态——针对**任意** PR（你的或别人的）。在审计引用或调查某个发现的支持证据、位置、驳回或审查运行历史时，请求扩展结果。仅读取也是一种正当用法：读取后停下，报告一次审查处于什么状态或标出了什么（例如为了以它在 head 上干净为条件来把关合并）。要更进一步，**在代码中解决未决发现**，应用你自己的判断（审查是强有力的第二意见，不是圣经）。当用户已授权时应用有支持的修复；否则呈现你的评估供选择。运行一次（报告 + 经授权的修复）或作为监视循环（解决 → 让 Qodo 重新审查新提交 → 重复直到干净）。当另行授权时，**记录结果**在你已了结的发现上——你修好的用 `mark-implemented`，用户同意不通过代码改动就关闭的用 `dismiss`。这正是清除那些发现所持有的合并政策阻塞的方式；跳过它，审查在有人点击 PR 之前会一直显示红色。你仍然绝不自己向 forge 发布：状态工具写入 Qodo 的审查数据库，由 Qodo 协调 PR 评论。（普通的 git/forge *元数据*读取——`git rev-parse HEAD`、`gh pr view --json headRefOid`——是可以的，而且实际上下面的新鲜度检查需要它们；"不要抓取"规则针对的是 qodo，不是你的 shell。）

## 先决条件

- 一个已连接的 QAR 托管工具 MCP 服务器或已认证的 Qodo CLI 暴露审查会话工具。
- 确切的 PR URL 及其当前 head SHA 可在不抓取审查评论的情况下被解析。
- 任何发现状态的写入都有明确的用户授权；代码修复权限或仅 `autofix` 不覆盖它。

## 说明

### 选择执行路径

当所需的审查会话能力可用时，使用已连接的 QAR 托管工具 MCP 工具；否则使用下面的 CLI 路径。在 MCP 上，读取宿主提供的描述、`inputSchema`，以及只读/变更标注。线上工具是 `get-pr-review-findings`（`pr_url`，可选 `extended`）、`pr-review-dismiss` 和 `pr-review-mark-implemented`；在调用前核实它们的实时 schema。在 `structuredContent` 之前检查 `isError`，包括对于成功的传输响应。一个被截断的发现结果是不完整的，绝不是干净的审查。

MCP 写入需要在实时 schema 的 `idempotency_key` 参数中为逻辑发现处置提供稳定键。支持请求元数据的宿主可以改为发送 `_meta["io.qodo/idempotency-key"]`；如果两者都发送，它们必须一致。对于不确定的重试，保持相同的键和确切参数。下面的授权、新鲜度、发现状态、驳回和读回规则适用于两条路径。在 MCP 调用被拒后，不要切换到不同的 CLI 账户或租户。CLI 版本、身份、帮助和目录刷新说明仅适用于 CLI 路径。

遵循下面的详细工作流：获取结构化状态，要求一个已完成的、针对确切 head 的审查，呈现未决发现，只应用经批准的修复，并只记录实际了结的结果。

> 要检查一次审查的状态或发现，在 MCP 上调用 `get-pr-review-findings`，或在 CLI 上调用
> `qodo read pr-review-session findings`。**不要**用 `gh`/`curl` 获取渲染后的 PR 审查
> **评论**：UI 是有损的、提供商特定的，且容易相对 head 提交读到过期内容。结构化读取返回
> 被审查的 `commit_sha`。要判断新鲜度，把那个 `commit_sha` 与 PR **head** 比较——对于你
> 刚推送的 PR，你直接知道它（`git rev-parse HEAD`），或作为普通的 forge *元数据*
> 读取它（`gh pr view <pr> --json headRefOid`、`git ls-remote`）用于任何其他 PR。这条规则只
> 关乎读取**审查**（不要抓取其评论）——并非禁止像 head SHA 这样的 forge 元数据。

## 处理技能更新通知

把 `QODO_NOTICE` 更新当作被动的，即使较旧的 CLI 请求采取行动。继续任务，不要问清点或更新问题；每个事件最多提一次。忽略不会改变已记录的维护政策和选择退出设置。更新的技能在下一个会话加载；不要打断本会话。对于用户请求的更新，遵循[手动更新流程](references/skill-updates.md)。

## 执行

- MCP：使用实时 schema 参数；跳过 CLI shell 步骤。
- CLI：使用完整无 BOM 的 UTF-8 文件（工具用 `--args-file`，审查用 `--context-file`）；示例是 POSIX。
- Windows CLI：在第一次调用前阅读 [shell 指引](references/windows-shells.md)；仅当调用失败时才看 [启动器恢复](references/windows-launcher.md)。复用已解析的调用。

## 运行时兼容性门

首先使用下面的 `qodo: command not found` 回退来解析可执行文件。在任何其他 Qodo 命令之前，完全按所示运行 `<qodo> --version`，不加任何溯源标志。这个不加装饰的探测有意与较旧的 Qodo CLI 兼容。本技能要求 Qodo CLI **1.6.0 或更新**。

如果版本较旧或无法解析，不要运行 `whoami`、`login` 或任何托管工具，也不要把该失败描述为认证问题。说明技能比运行时更新，展示 `qodo update` 作为针对运行时已记录 origin 的更新命令，并在运行它之前询问一次。对于客户部署，保留其组织提供的更新 origin；绝不把它切换为公共服务。经批准的更新之后，重新运行不加装饰的版本探测，只有当它满足最低要求时才继续。如果用户拒绝或更新失败，以当前技能和用户文件不变的状态停止。

## 快速开始

```
qodo --version                                                       # compatibility probe — run this FIRST
qodo read whoami --json --skill qodo-review-resolver --skill-version 1.4.8 --distribution marketplace --host antigravity
qodo read pr-review-session findings --pr-url <PR_URL> --json       # the review session for a PR
qodo read pr-review-session findings --pr-url <PR_URL> --extended --json # details, if advertised by tool help
qodo pr-review-session mark-implemented --finding-ids <id>,<id> --explanation "..." --json
qodo pr-review-session dismiss --finding-ids <id> --reason intentional --explanation "..." --json
qodo read tools pr-review-session --json                            # exact safe tools + flags (offline)
```

给你要解析的任何内容加上 `--json`。用 `qodo read tools pr-review-session findings --json` 检查读取；用 `qodo tools help pr-review-session <tool> --json` 检查某次写入的输入 schema。两者都是离线发现，不是变更。只读目录有意排除写入；那里缺失并不证明它们不可用。

认证后在 `dismiss`/`mark-implemented` 上出现 `unknown command` 可能是本地工具目录过期——按下面所述刷新一次。如果命令仍然缺失，该工作区当前不暴露 PR 审查写入；报告那个能力边界，而不是循环。

**`qodo: command not found`？** 在 POSIX 上重试 `"${QODO_HOME:-$HOME/.qodo}/bin/qodo"`；在 Windows 上遵循链接的指引。保留已解析的调用；报告不可用的启动器。对于缺失的安装，获取 Qodo 的或管理员的校验和固定的安装程序；绝不编造摘要值，也不要把脚本管道输入到 shell。

**沙箱认证诊断。** 缺失凭据可能意味着无法访问钥匙串。当这种可能性成立时，通过宿主的审批流程请求一次确切的只读 `qodo read whoami` 重试，然后再建议登录。被拒即停止；该批准不覆盖任何其他命令。在相同的可执行文件/工作区/部署和执行上下文中复用一次成功的检查；请求每一次所需的宿主批准。网络、TLS、服务和明确的授权失败保留各自的诊断，而不是登录建议或自动的沙箱绕过。

## 预检

1. **认证和目录。** 运行 `qodo read whoami`，除非一次成功的检查仍覆盖此执行上下文。在适用时进行沙箱诊断之后，只有明确的凭据缺失才要求登录：保留组织确切的登录命令/端点，绝不猜测或把客户部署切换到 Cloud。`No tool catalog cached` 不是凭据缺失的证明；用 `qodo tools --refresh` 刷新一次并重试该检查。其他失败保留其错误并停止本工作流。身份成功之后，未知的托管命令允许一次目录刷新和 schema 复查。如果仍然缺失或是 `tool_unavailable`，报告缺失的能力；不要重复登录或刷新。
2. **解析 PR。** 使用用户给出的 PR URL。如果他们没点名一个，而你在一个 git 代码仓库内，推断当前分支的开启 PR，并在行动之前**与用户确认**。绝不猜测 PR URL。
3. **把编辑绑定到检出。** 仅报告的读取可以针对任意 PR。在任何本地修复之前，从提供商元数据解析 PR 代码仓库，并从其 `origin` 解析当前检出代码仓库；把两者规范化为完整的不区分大小写的 `owner/repo` 身份。它们必须完全匹配。origin 缺失/含糊或不匹配意味着停止并请用户打开正确的检出——绝不把一个代码仓库的发现应用到另一个 worktree。使用该 PR 的分支或一个隔离的 worktree，本地 HEAD 位于被审查的 head（或由同一修复工作流产出的一个经核实的后代）。仅仅在代码仓库里有该提交是不够的。检查本地差异并保留不相关的编辑；绝不为了满足此检查而重置或切换一个脏 worktree。如果目标 PR 改变，重复这些检查。

## 获取审查会话

`qodo read pr-review-session findings --pr-url <PR_URL> --json` 返回：

- `review_session`——最新一次审查运行：`status`、`commit_sha`（**审查所包含的最后一个提交**——这些发现所描述的代码）、`started_at`。**`null` = 该 PR 尚无审查**——告诉用户并停止（没有可解决的）。
- `findings[]`——每个当前发现，各带：`title`、`description`、`category`、`action_level`（`action_required` > `remediation_recommended` > `informational`）、`attribution_status`、`git_sha`、`review_run_id`、`comment_id` / `inline_comment_id`。

零发现只有对于在当前 PR head 上完整、已完成的审查才支持干净的判决。

### 用于审计和调查的扩展结果

日常状态轮询保持紧凑读取。当用户需要支持证据或更多细节时，检查 `qodo read tools pr-review-session findings --json`。只有当 schema 声明了 `extended` 布尔值时，才用 `qodo read pr-review-session findings --pr-url <PR_URL> --extended --json`。工具/API 输入是 `extended: true`；省略或 false 保持紧凑响应。这会读取更多已存储的数据；它不会重新运行或加深审查。

扩展结果添加发现位置和代码片段、驳回理由/解释、`review_runs`，以及带 `explanation` 和 `citations` 的 `findings[].evidence`。在审计输出中保留每个引用的来源类型、来源引用、文本和来源特定元数据。把证据与该发现的 `id`、`git_sha`、`review_run_id` 和 `review_source` 关联；当前发现可能源自比 `review_session` 更早的运行。

为 null 的证据意味着不可用；空 citations 列表不含任何记录的引用。缺失的 evidence 字段可能表示较旧的后端：报告那个局限，而不声称该发现没有支持证据。如果目录中缺失 `extended`，遵循现有的单次刷新恢复并再次检查；如果仍然缺失，报告扩展读取不可用并继续使用紧凑读取。绝不对缺少它的目录发送 `--extended`；不要发明替代标志或替换为抓取的评论。

如果结果带有 `qar_operation_result_truncated: true`，报告为不完整的读取，而不是空或干净的审查。扩展结果描述当前发现和已记录的运行，不是每一个发现修订版本的不变历史。在行动之前应用下面的新鲜度检查。

## 先读取会话状态（在信任任何发现之前）

`review_session` 告诉你*这些发现是否已经真实存在，以及它们覆盖什么代码*——在行动之前检查它：

- **审查仍在运行吗？** API 把运行中的审查报告为 `started`；那就是轮询状态。对于仅状态请求，报告该状态并返回；只有当等待是所请求任务的一部分时才轮询。`failed`、`aborted`、`skipped` 和 `superseded` 是非成功的终端状态：报告它们并停止循环。未知状态不是成功，也不是无限轮询的许可。
- **这些发现描述的是哪个提交？** `review_session.commit_sha` 是审查所包含的最后一个提交。如果它**落后于 PR head**，这些发现就是**过期的**——它们没有反映你的最新代码。要么审查还没有在新提交上运行（等待），要么你在看一个旧的运行。只有当会话是 `completed` 且其 `commit_sha` 是你关心的提交（在监视循环中是 head）时，才信任发现。

只对**当前提交的已完成审查**采取行动。一个运行中的或过期的审查无法授权发现解决。在监视模式下，尊重重试延迟，在声称干净之前重新检查 forge head，并在审查没有进展时停止，而不是无限轮询。

## 呈现审查状态

使用自然的行文：**结果 → 对改动和处置的上下文解释 → 验证 → 剩余工作**。对于仅报告的请求，先讲当前的审查状态和剩余发现的影响。就审查浮现的具体关切致谢 Qodo 一次；你拥有最终评估和建议操作。不要品牌化标题、emoji 横幅、口号、页脚或重复摘要块。在有用时使用简短的问题标题或列表。

对每个发现，解释可能发生什么、在哪些条件下、以及为什么它对用户预期改动重要。对照代码和可用的编码会话决定与约束评估它；在需要时检索 PR 上下文，绝不编造缺失的会话。引用证据，并把发现引用和所报告的类别/层级与你的建议分开保留。拥有修复、驳回或调查的决定及其理由。一个有意的选择只有当实现强制执行其假设时才支持驳回。保持协作和事实性的语气；不要习惯性地质疑 Qodo 的能力。遵循现有的编辑和处置写入的范围与审批门控；你的技术评估不授予许可。

从结构化状态点名 PR、审查状态和被审查的提交；在行动之前与 forge head 比较。把过期、运行中、失败或缺失的审查明确说出来。区分**代码已改**、**处置已记录**和**更新的代码已被审查**。测试通过或状态写入成功并不能确立对更新提交的干净审查。只有当前 head 的已完成审查才能支持那个判决；如实报告剩余发现和缺失的验证。例如："通过 [改动] 解决了 Qodo 识别出的 [风险]，保留了 [用户决定]。[验证]。最新审查覆盖 [旧 SHA]；对 [head SHA] 的审查仍未完成。"只使用实际结果。在监视模式下，报告有意义的状态变化，而不在每次轮询或状态写入时重复评估。

## 分诊

- **未决 vs 完成是 `attribution_status`。** 对返回值分类，包括不同部署使用的受支持表示：
  - **OPEN——处理这些：** `pending`、`partial_implementation`、`not_implemented`、`focus_areas_edited`。
  - **CLOSED——搁置这些：** `implemented`、`full_implementation`、`dismissed`、`detected_after_merge`、`outdated`。报告不熟悉的值，而不是悄悄把它们排除在干净判决之外。
  - `action_level` 是**严重性**，不是未决-vs-关闭。一个已关闭的发现仍可能 `action_required`。
- **按 `action_level` 排序：** 先 `action_required`，然后 `remediation_recommended`；把 `informational` 当作可选并浮现它，不一定修复它。
- 按文件对未决发现分组，以便你每个文件只编辑一次。

## 遵从用户指令（可选范围）

如果用户给了一条指令，把它当作**对未决发现的过滤器**，只对匹配项行动——不要扩大它：

- **按操作层级**——"解决 action-required 的发现" → 仅 `action_level == action_required`；"所有可操作的" → `action_required` + `remediation_recommended`。
- **按类别**——"只要安全的发现" → `category == Security`（正确性、性能等同理）。
- **按具体发现**——"修复发现 #3" / "那个 SQL 注入的" → 按 `id` 或 `title` 匹配。
- **仅报告**——"审查发现了什么？" / "它干净吗？" → 概括发现及其状态，不改任何代码。

没有修复指令或覆盖性的实现权限 → 呈现未决的 `action_required` 然后 `remediation_recommended` 供批准，并浮现（而非自动修复）`informational`。当指令含糊时，在一行里陈述你所选的范围，然后再行动，以便用户可以纠正。始终报告你**跳过**了哪些发现及原因（超出范围 / 驳回 / 信息性）——绝不悄悄丢掉一个。

## 两种模式

每一轮都遵循**解决一个发现**：评估并只应用现有用户权限（`autofix` 或明确的修复请求）覆盖的修复；否则呈现并询问。推送权限是分开的。

**一次（默认）。** 获取 → 评估每个未决发现（分诊——全部四种 OPEN 状态，不只是 `pending`）→ 如缺少权限则呈现并询问 → 在代码中应用经授权的修复 → 只在用户授权范围内提交/推送 → 概括修复和剩余发现。对于仅本地的修复，报告"等待推送"并保持发现状态不变。在一次经核实的推送之后，优先让下一次审查自动重新归因；手动状态写入额外需要明确授权和**记录结果**中的检查。停止。除非被要求，不要循环。分诊覆盖**全部**未决发现，但选择器只*提供*可操作的集合——`action_required` 然后 `remediation_recommended`——`informational` 单独浮现，与上面默认范围匹配；只有当用户要求时才把 `informational` 放进选择器。（提供不等于选择：每个框起始都是未勾选。）

**监视直到干净**（当用户说"照看" / "一直进行到它干净"）。在其范围内复用明确的修复权限；仅监视不授权编辑。在你解决发现并推送修复提交之后，Qodo 重新审查*新*提交——所以：

1. 记下 PR 的当前 head SHA——你刚推送的提交（`git rev-parse HEAD`），或者，对于你没推送的 PR，作为 forge 元数据读取它（`gh pr view <pr> --json headRefOid`）。那是元数据读取，不是审查评论抓取——没问题。
2. 每次读取都遵循**先读取会话状态**：只在有界监视内轮询 `started`；报告非成功的终端或未知状态并停止。一个已完成的较旧运行是过期的：允许有界等待新 head 的审查出现。只有当审查是 **`completed` 且其 `commit_sha` 等于那个 head SHA** 时才行动。
3. 当新鲜时：如果仍有任何 OPEN 发现（全部四种状态——`partial_implementation` 仍是未决），解决它们并重复；如果没有剩余，报告审查干净并停止。
4. 限定它：在几轮没有进展后停止并交还给用户，而不是无限循环。

## 解决一个发现

对照代码、PR 意图和可用的会话上下文评估 Qodo 的发现。拥有最终技术建议和理由，同时遵循下面用户的授权范围和批准。

**对照实际代码和 PR 意图评估每个发现**，并形成建议：

- **合理且在范围内** → 修复是恰当的；记下你会改什么（读取 `title` + `description`，定位代码——当代码不在本地时，`qodo-codebase-wisdom` 技能的读取工具能帮忙）。
- **无支持或已解决** → 用代码证据建议驳回。一个有意的选择只有当实现强制执行其假设时才支持驳回。
- **不确定** → 在决定前识别所需的证据或检查。

**仅报告。** 返回评估并停止；对于明确要求审查而不改动，不要征求编辑批准。

**只在缺少编辑权限时才呈现并询问。** 如果 `autofix`、一个明确的修复请求，或覆盖性的实现权限已经适用，跳过这个选择提示并遵循下面的**经授权的修复**。否则对每个未决、范围内的发现使用上面的评估，保留其 `action_level`/`category` 和你的建议，然后**在单个提示中**询问要解决哪些发现。使用宿主给你的任何东西：如果有就多选（比如说 Claude Code 的 `AskUserQuestion`），否则用编号列表并"回复要解决的编号"。无论哪种方式都是一个提示——不要按发现逐个询问。**没有任何一项被预先选中。** 标记你推荐哪些，但用户必须主动选择：这个提示是发现与编辑之间的最后一道关卡，所以一个裸的 Enter 必须不解决任何东西。只解决用户挑选的（照常编辑，匹配周围的代码）；其余作为跳过报告并附上你的理由。在这个缺少权限的路径上，不要在用户选择之前编辑。

**经授权的修复。** `autofix` 或像"修复 action-required 的发现"这样的明确请求，授权在该范围内进行有支持的代码修复；不需要特殊令牌或重复确认。现有的实现权限也可以覆盖修正。在应用之前陈述你的评估。仅状态的请求不授予编辑权限；如果范围含糊就询问一次。修复权限和监视都不授权发现状态写入（`dismiss` 或 `mark-implemented`）或推送。报告修复和跳过的发现。

按用户的工作流提交/推送——除非他们已告诉你，否则推送前询问。

**`attribution_status` 是预期的信号**——一个已修复的发现会被下一次审查自行重新归因为 `implemented` 或 `full_implementation`，所以在推送后，重新获取并只处理仍然未决的东西。但它是工具，可能出故障：如果某个发现在你确信已修复之后仍保持未决，或某个状态明显与代码矛盾，不要循环反复修复它——把差异标记给用户并继续。（解决在轮次中收敛；一次修复也可能浮现真正的新发现，监视循环会拾取它们。）

## 记录结果

要求对具体状态写入的明确授权；修复代码或推送它的许可不授权关闭发现。在推送修复之后优先自动重新归因。

关闭一个发现是一次**写入**——它更新 Qodo 的审查数据库、重新设计该发现的 PR 评论样式、重新渲染审查摘要，并释放该发现持有的合并政策阻塞。两条命令，它们之间的区别就是全部要点：一个说*代码改了*，另一个说*代码没改，原因如下*。绝不要用其中一个表达另一个。

```
qodo pr-review-session mark-implemented --finding-ids <id>,<id> --explanation "what you changed" --json
qodo pr-review-session dismiss --finding-ids <id>,<id> --reason <reason> --explanation "why" --json
```

- **按 PR 批量，一次调用。** 协调每次调用运行一次，而不是每个发现一次——所以你实现的所有发现放进一个 `mark-implemented`，所有共享驳回理由的放进一个 `dismiss`。最多 100 个 id。
- **`mark-implemented` 只在明确授权、且只针对你实际改过并推送的代码时使用。** 它在审查尚未核实修复的情况下清除合并门控，所以错误的声明会把一个未修复的发现当作已修复发布出去。如果反正还会有另一轮审查运行，优先让它自己重新归因该修复；当在合并前不会有进一步轮次、或门控必须现在清除时才用它。
- **`dismiss` 需要用户对每个发现的明确同意，每次都是——`autofix` 不覆盖它。** `autofix` 是对*编辑代码*的同意，下一次审查会重新检查；而驳回会关闭一个审查仍然相信的发现，对团队可见，且没有任何东西会重新打开它。呈现你提议驳回什么以及为什么，只驳回用户点名的。
- **`--reason`**（必需）：`false_positive`（发现是错的）· `intentional`（代码是有意且正确的）· `deferred`（真实，但超出本 PR 范围）· `rejected`（理解但拒绝）。始终添加 `--explanation`——审查者之后会在没有你上下文的情况下读它。
- **按发现读取 `results`，不要假定整个调用成功。** 即使个别 id 失败它也是 200：`not_found`（错 id 或错工作区）和 `conflict`（已关闭，或未链接到 PR）是终端的——不要重试它们。`reconciled: false` 意味着数据库改动落地了但 PR 侧更新没有；重新运行同一命令是安全且幂等的，且 PR 会在其下一次审查时自行修复。`already_dismissed` / `already_implemented` 报告**存储的**理由——重放绝不覆盖原始值。

## 示例

**用户："解决 https://github.com/acme/api/pull/318 上的 action-required 发现"**

1. `qodo read whoami` → 已登录。
2. `qodo read pr-review-session findings --pr-url https://github.com/acme/api/pull/318 --json` → `review_session`：`status: completed`、`commit_sha: a1b2c3d`（= PR head，所以发现是当前的）；`findings`：3 个未决（2 个 `pending`、1 个 `partial_implementation`）——2 个 `action_required`、1 个 `informational`。
3. 指令过滤到 `action_required` → 处理那 2 个；信息性的那个超出范围（报告它，不修复）。
4. 评估每个：*"SQL 通过字符串插值构建"* → 真实 → 建议在 `db/orders.py` 中参数化查询。*"出站调用缺少超时"* → 客户端已在上游设置了默认超时 → 已满足 → 建议以该理由跳过。
5. 明确请求覆盖了受支持的 action-required 修复：参数化 SQL 查询并验证。把超时报告为已满足，把信息性发现报告为超出范围；两者都不会被自动驳回。把本地修复与 PR 的审查状态分开报告。只有在单独的覆盖性权限下才推送，然后检查新 head 的审查。

## 配置

使用 `--json`，把 `review_session.commit_sha` 与 forge head 元数据比较，并在无装饰的版本探测之后第一次已认证的 Qodo 调用上打上确切的技能/版本/分发来源标记。读取和写入能力从已安装的 CLI 目录中发现；渲染后的 forge 评论永远不是数据来源。

## 错误处理

把 null 会话、运行中的审查（`started`）、过期的提交、缺失的写入能力、速率限制和工具循环错误当作明确状态。在报告中保留它们，绝不为了显得审查干净而仅仅关闭一个发现。

## 护栏

- **新鲜度 = 对被审查提交的已完成审查，而不是时间戳。** 发现描述 `review_session.commit_sha`，只有当 `status` 为 `completed` 时才是最终的。在任何推送之后，把它们当作过期的，直到一次 `completed` 审查的 `commit_sha` 追上 PR head——否则你会对一个进行中的审查采取行动，或"修复"一个发现并未描述的提交。
- **绝不自己向 forge 发布。** 你做的唯一写入是 `dismiss` / `mark-implemented`，它们经过 Qodo 并让它协调 PR。不要调用任何 forge 写入工具（评论、批准、标签、描述）来"解决"一个发现——在*代码*中解决它，然后记录结果。
- **你可以拒绝一个你认为错误的发现**（附上清晰理由）。在系统中驳回它现在是可能的，但那是**用户**的决定，不是你的——提议它，点名理由，只对他们的明确同意行动。在真正的分歧上用户是仲裁者。
- **不要关闭你没了结的东西。** 你因范围而跳过的发现保持未决——报告为跳过，而不是把它当作 `deferred` 驳回以使列表看起来干净。
- **不要猜测** PR URL——先解析它；`null` 会话意味着尚无审查。
- `MT-TOOL-LOOP` 或 `MT-RATE-LIMITED` 错误意味着停止/退避并改变方法，而不是重试。

在经授权的改动之后，报告改进了什么、每个决定为何做出、验证了什么，以及还有什么需要关注。让本地编辑、已记录的处置和审查状态保持区分。
