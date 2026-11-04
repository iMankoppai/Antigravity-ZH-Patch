---
name: qodo-review
description: 在实质性编码里程碑期间以及 PR 或完成工作交接之前，用 Qodo 审查本地改动。在编码时使用轻量的后台检查点，结合会话上下文收集并评估发现，并在交接前运行最终审查。也用于"审查我的本地 diff"、"PR 前审查"或"运行 qodo review"。对于已发布在 PR 上的发现，使用 qodo-review-resolver。
owner: Qodo
metadata:
  vendor: qodo
  version: "1.10.9"
  recommended: "true"
  package: "qodo"
  distribution: "marketplace"
  instruction_mode: "embedded"
---

# 本地审查

## 描述

**在编码期间以及交接完成工作之前审查本地改动**。`qodo review` 将你的工作树与一个基线提交做 diff，包含新增/未跟踪的文件，并把 diff 连同你提供的任何**编码会话上下文**发送到 Qodo 的审查引擎。它返回结构化的发现，然后你评估它们，并在用户同意（或 `autofix`）的情况下在代码中修复。不会推送任何东西，也不会创建 PR；只有基线提交必须已经在远端（审查器会克隆它）。

本技能用于本地改动，包括既有 PR 上的未推送工作。使用 `qodo-review-resolver` 处理来自 PR 远程审查的发现；不要为未改动的已推送快照重复那次审查。

## 先决条件

- 有一个已认证的 Qodo CLI 可用，或有一个已连接的 QAR MCP 服务器和一个经过测试的本地输入收集器可用；审查能力已启用。
- 比较基线存在于远端；本地改动和上下文不必推送。
- 编码会话上下文以及任何工单或设计引用已准备好附加。

## 选择何时以及审查得有多深

| 情况 | 选择 |
|---|---|
| 实质性编码期间的一个连贯里程碑 | `--fast --async`：轻量检查点；继续进行有用的编码并收集结果。 |
| 在开启/更新 PR 或交接完成工作之前的常规最终审查 | 省略两个深度标志：auto。在声称审查完成之前收集并评估结果。 |
| 用户意图要求异常彻底的审视，或已知的高影响范围使其有必要 | `--deep`，附上一句与请求或受影响行为相关的简要理由。 |

自动编码检查点始终使用 `--fast`。当上述某条例外适用时，有意为之的深度审查可以更早进行。像"彻底检查微妙的竞态"这样的请求可以无需"deep"一词就证明其合理性；泛泛的"审查"或"复查"则不能。识别具体影响，比如共享授权、破坏性迁移，或被多个服务使用的契约。diff 大小、会话长度、PR 就绪状态，或仅仅一个与安全相关的文件名，都不能证明 deep 的合理性。

在**无标志**时，CLI 省略深度，由审查器/部署来选择。Auto 可以选择 deep；它不保证是 standard，也不施加花费上限。没有 `--standard` 标志。`--fast` 和 `--deep` 互斥；每次调用都重新选择深度。

## 检查点与最终交接

- 审查一个已完成、可测试的切片，当其反馈能指导剩余工作时。不要审查未完成的探索、每一次编辑、自动地审查琐碎改动，或仅仅因为时间过去了。尊重用户的审查范围和预算。为提问或批准而暂停不是最终交接。
- 每个任务最多保持一个自动检查点处于活动状态。把它的操作 ID、已提交的范围和快照/上下文关联保留在任务的现有状态中。在自然停顿处轮询状态，同时做有用的工作；不要为了检查进度或重新审查未改动的输入而启动另一次审查。
- 在其保留窗口内收集每一个已提交的结果。在采取行动前对照当前代码复查发现：工作树可能已经改变。一个被取代的结果无法证明更新的工作。使用现有的 CLI 生命周期；不需要单独的子智能体或调度器。
- 在最终审查之前，收集未完成的检查点并核对其发现。用 auto 或经过论证的 deep 审查完整的预期改动，而不是依靠一个轻量检查点来交接。移除会让预期改动的一部分未被审查的临时路径限制。如果同一快照已有完成且上下文兼容的最终覆盖，就使用那个结果。
- 批量处理经授权的修复，验证它们，然后重新审查已改动的工作。检查点修复保持 `--fast`；最终审查的修复保留所请求的 auto 或经过论证的 deep 模式。让引擎决定增量资格；auto 每次可能路由不同。不要为了钉住 auto 路由而手动把最终修复切换到 `--fast` 或强行 `--deep`。如果工作回到大量实现，恢复轻量检查点，并在交接前再次建立最终覆盖。
- 如果另一遍重复同一个关切而没有可操作的进展，停止自动循环，报告剩余问题和所需的决定/检查。不要为了追逐零而反复购买新的审查遍次。待处理、失败、部分或被取代的审查不是干净的；浮现剩余的发现和覆盖情况。

## 准备 PR 交接

当准备开启或更新 PR 时，遵循用户的提交政策，优先在最终本地审查之前提交预期改动。支持从本地到 PR 交接的 Git 审查可以从那个已核实的提交继续。提交并再次审查后续编辑以纳入它们。提交是可选的；没有可用的已审查提交时，Git 审查按其正常范围进行。
对于经授权的笔记维护，使用 `qodo-review-notes` 查找轨道，在开启前发布现有 HEAD 的 PR 笔记，在 HEAD 变化时刷新，之后加以绑定；单独保留本地审查上下文并核实消费情况。

## 说明
### 选择执行路径

优先使用 `qodo review`（当可用时）：它收集并过滤已跟踪和未跟踪的本地改动，解析远程基线，附加上下文，并管理检查点状态。QAR MCP 的 `start-pre-pr-review` 工具反而接受准备好的 `diff`、`base_sha`、代码仓库定位符和上下文；它无法读取此 worktree。只有当经过测试的本地收集器产出了相同的预期范围和排除项、报告了被省略的文件、并核实基线 SHA 可获取时，才使用那个 MCP 工具。不要拼凑一个临时的 `git diff` 就称其为等价覆盖。如果没有可用的收集器，报告仅靠 MCP 的本地审查无法安全覆盖此 worktree；不要声称完成了审查。

对于准备好的 MCP 审查，检查实时 schema。把 `review_scope.stream_id` 设为恰好 64 个小写十六进制字符：一个 JSON 数组的 SHA-256，该数组包含已解析的真实工作树根，再加上用于路径受限审查的已解析工作目录。在检查点之间复用它；UUID 是无效的。
对于不确定的启动，保留相同的 `request_id` 和确切参数：`request_id` 是这个启动工具的逻辑操作重试键，未声明单独的 `idempotency_key` 参数。按其公布的间隔轮询 `get-managed-agent-operation`，然后获取所有 `get-managed-agent-result` 块，并在解读产物之前核实其报告的摘要和字节数。
这些是简短的生命周期调用，不是 MCP Task。在读取回执之前检查 `isError`。应用下面相同的上下文、深度、覆盖、发现和权限规则。下面的 CLI 版本、身份和命令说明仅适用于 CLI 路径。

保留通知，附加自包含的上下文，显示进度，使用合适的超时，读取结构化结果，并对发现采取行动。

## 处理技能更新通知
把 `QODO_NOTICE` 更新当作被动的，即使较旧的 CLI 请求采取行动。继续任务，不要问清点或更新问题；每个事件最多提一次。忽略不会改变已记录的维护政策和选择退出设置。更新的技能在下一个会话加载；不要打断本会话。对于用户请求的更新，遵循[手动更新流程](references/skill-updates.md)。

## 执行

- MCP：使用实时 schema 参数；跳过 CLI shell 步骤。
- CLI：使用完整无 BOM 的 UTF-8 文件（工具用 `--args-file`，审查用 `--context-file`）；示例是 POSIX。
- Windows CLI：在第一次调用前阅读 [shell 指引](references/windows-shells.md)；仅当调用失败时才看 [启动器恢复](references/windows-launcher.md)。复用已解析的调用。

## 运行时兼容性门
使用本技能的命令未找到回退来解析可执行文件，然后不加溯源标志地运行 `<qodo> --version`。本技能要求 Qodo CLI **1.6.0 或更新**。如果较旧或无法解析，不要运行 `whoami`、`login` 或任何审查，也不要称其为认证失败。针对已记录的公共或企业 origin 展示 `qodo update`，并在运行前询问一次。经批准的更新之后，重新检查版本；否则在不变更技能或用户文件的情况下停止。

## 快速开始
你刚写完代码，所以你掌握着审查器在其他任何地方都拿不到的那一个输入：**为什么**。每次运行都把它附上——先写会话上下文，再审查：

```
qodo --version                                  # compatibility probe — run this FIRST
qodo read whoami --json --skill qodo-review --skill-version 1.10.9 --distribution marketplace --host antigravity
review_base=$(git merge-base HEAD origin/main) || { printf '%s\n' 'Cannot resolve merge base for origin/main; fetch missing history or choose the correct target.' >&2; exit 1; } # use the intended target branch
qodo review --base "$review_base" --context-file - <<'EOF' # branch changes, WITH context
{ "summary": "<what this change does and why>",
  "decisions": ["<a choice you made and its rationale>"] }
EOF
qodo review --base "$review_base" --context-file ctx.json # context from a file
qodo review --base "$review_base" --ticket <TICKET_URL> ... # ticket URL (repeatable)
qodo review --base "$review_base" --json ...              # machine-readable findings
qodo review --base "$review_base" src/ test/ ...          # limit to paths (git pathspecs)
develop_review_base=$(git merge-base HEAD origin/develop) || { printf '%s\n' 'Cannot resolve merge base for origin/develop; fetch missing history or choose the correct target.' >&2; exit 1; } # another target branch
qodo review --base "$develop_review_base" --json --context-file ctx.json # another target branch
qodo review --base "$review_base" --fast --async --json --context-file ctx.json # checkpoint
qodo review --base "$review_base" --json --context-file ctx.json      # final: auto
qodo review --base "$review_base" --deep --json --context-file ctx.json # justified deep review
qodo review --base "$review_base" # no context only when there is truly nothing to say
qodo review status <operation-id>            # collect an --async result (exit 2 = still running)
qodo review --help                           # exact flags (renders offline)
```

你也可以在代码仓库根目录维护 `.qodo/session-context.json`（相同的 JSON 形状）并保持更新——它会被自动附加到每次运行，因此即使一个裸的 `qodo review` 也带着你的上下文。显式的 `--context-file` 会覆盖它；该文件本身永远不是被审查 diff 的一部分。不要提交它（把 `.qodo/` 加到 `.gitignore` 或 `.git/info/exclude`）。
给你要解析的任何内容加上 `--json`。对于连接式执行，允许几分钟的超时，或把进程放到后台；异步提交和状态收集是分开的短调用。
**用 `qodo review --help` 确认确切的标志**（离线）——这里的示例只是示意性的。

## 为所选审查选择执行方式

编码检查点使用 `--async`：提交，继续有用的工作，然后用 `review status` 收集。对于最终审查，async 也有效，但在交接前要收集并评估它。如果需要实时进度，阅读 [连接式进度](references/connected-progress.md)并把 `--json --progress` 与宿主原生的后台进程一起使用。绝不把 `--progress` 与 `--async` 组合。
一次审查可能耗时数分钟；保持连接进程存活或使用 async，这样客户端退出也无法取消它。如果已安装的 CLI 中 async 不可用，保留所选深度并使用连接式回退。

对于连接式进度，标准的执行规则是：

- 通过文件附加上下文；stdin heredoc 不适合后台执行。
- 使用每次运行唯一的临时目录。把 stdout 上的单个结果 JSON 与 stderr 上的 NDJSON 进度分开。通过宿主的非阻塞进程工具轮询不断增长的进度文件；绝不要运行一个会阻塞智能体直到完成的前台 `tail`。
- 转述简短的状态消息，而不是原始 JSON 或模型输出。按 `kind` 翻译事件：`cli.status` 给出一条可读消息；`tool.activity` 给出工具名称和结果；`task.delta` 和未知类型是偶发的通用心跳，而不是每个事件一条消息。
- 对于 `qar.client.reconnecting`，转述尝试/延迟，以及存在时的结构化关闭/错误代码。`qar.client.reconnected` 意味着传输已打开；`resubscribeAttempts` 统计重新附加的实时任务。`qar.client.reconnect_failed` 表示重试已耗尽，而不是最终的错误解释。
- 在 `task.done` 时，检查 `payload.status`；在失败/取消或 `error` 时，停止进度转述但继续等待进程退出。始终读取结果封装，包括在非零退出时：像 `closed_preview` 这样的可操作消息/提示可能只在那里出现。进度不是发现。
- 捕获进程退出状态，在解析前回收子进程并解除其 PID。在中断时，终止并回收活动的子进程。仅在退出/失败/中断时清理那一次运行的目录；绝不重用或移除共享的 `.qodo/review.*` 路径。
- 如果后台进度不可用，用几分钟超时在前台运行，保留所选深度和上下文。缺失进度不是让审查失败或降低深度的理由。

**`qodo: command not found`？** 在 POSIX 上重试 `"${QODO_HOME:-$HOME/.qodo}/bin/qodo"`；在 Windows 上遵循链接的指引。保留已解析的调用；报告不可用的启动器。对于缺失的安装，获取 Qodo 的或管理员的校验和固定的安装程序；绝不编造摘要值，也不要把脚本管道输入到 shell。

**沙箱认证诊断。** 缺失凭据可能意味着无法访问钥匙串。当这种可能性成立时，通过宿主的审批流程请求一次确切的只读 `qodo read whoami` 重试，然后再建议登录。被拒即停止；该批准不覆盖任何其他命令。在相同的可执行文件/工作区/部署和执行上下文中复用一次成功的检查；请求每一次所需的宿主批准。网络、TLS、服务和明确的授权失败保留各自的诊断，而不是登录建议或自动的沙箱绕过。

## 用 `--async` 提交并收集

用 `qodo review --help` 检查支持情况。以下示例提交一个编码检查点。对于最终审查省略 `--fast`；只有在上述选择政策下才添加 `--deep`。在所有模式下附加相同的上下文。Shell 片段演示 CLI 协议；使用宿主自己的非阻塞等待机制。

`--async` 把连接从关键路径上移除。它通过 HTTP 提交审查，打印一个**操作 ID**，并立即以 0 退出。运行在服务端继续，无论你的进程是否存活；你稍后用 `qodo review status <operation-id>` 收集结果。

```
command -v jq >/dev/null 2>&1 || { printf '%s\n' 'This async recipe requires jq; install it or use the live qodo review flow.' >&2; exit 1; }
QODO_REVIEW_CONTEXT="${QODO_REVIEW_CONTEXT:-.qodo/session-context.json}"
[ -f "$QODO_REVIEW_CONTEXT" ] || { printf '%s\n' "Write the required review context to $QODO_REVIEW_CONTEXT (or set QODO_REVIEW_CONTEXT to its path)." >&2; exit 1; }
QODO_REVIEW_BASE="$(git merge-base HEAD origin/main)" || { printf '%s\n' 'Cannot resolve merge base for origin/main; fetch missing history or choose the correct target.' >&2; exit 1; } # substitute the intended target
if ! submission="$(qodo review --base "$QODO_REVIEW_BASE" --context-file "$QODO_REVIEW_CONTEXT" --async --json --fast)"; then printf '%s\n' "$submission" >&2; exit 1; fi
if ! id="$(printf '%s\n' "$submission" | jq -er '.operation_id | select(type == "string" and length > 0)')"; then printf '%s\n' "$submission" >&2; exit 1; fi
qodo review status "$id" --json                                # collect it
```

轮询现有操作直到它完成；在状态检查之间做有用的工作。提交退出 0 意味着被接受，而不是已审查。收集使用这些退出代码；读取任何返回的重试延迟：

| 退出 | 含义 | 做法 |
|---|---|---|
| `0` | 已完成。发现已渲染——输出与实时运行**完全相同**（`--json` 下为 `{findings, meta}`）。 | 照常对发现采取行动。 |
| `2` | 仍在运行或轮询被限流。 | 存在 `retry_after` 时遵循它，然后轮询同一个 ID。 |
| `1` | 失败、取消、过期，或无此操作。读取 `error` 封装。 | 遵循下面的有界恢复；绝不假定干净。 |

```
# This collection attempt returns failures to the host for classification under Recover a review.
# On nonzero exit, preserve the operation ID and emitted error; apply bounded recovery there.
QODO_REVIEW_TMP="$(mktemp -d "${TMPDIR:-/tmp}/qodo-review.XXXXXX")"
cleanup_qodo_review() { [ -n "${QODO_REVIEW_TMP:-}" ] && [ -d "$QODO_REVIEW_TMP" ] && rm -r -- "$QODO_REVIEW_TMP"; }
trap cleanup_qodo_review EXIT; trap 'exit 130' INT; trap 'exit 143' TERM
while :; do
  status=0; qodo review status "$id" --json > "$QODO_REVIEW_TMP/result.json" || status=$?
  case "$status" in
    0) cat "$QODO_REVIEW_TMP/result.json" || exit 1; break ;;
    2) delay=$(jq -r 'if (.retry_after | type) == "number" and .retry_after > 0 then .retry_after else 15 end' "$QODO_REVIEW_TMP/result.json") || exit 1
       sleep "$delay" ;;
    *) cat "$QODO_REVIEW_TMP/result.json" >&2; exit "$status" ;;
  esac
done
```

**它有什么代价——在你选择它之前要知道这些：**

- **没有流式进度。** 这条路径上没有进度事件——运行不附着在你的进程上——所以 `--async` 和 `--progress` 会一起被拒绝，而不是发出一个永远不会到达的流。除了"仍在运行"之外没有中间状态。如果用户在看着并想看到它活着，改用 [连接式进度](references/connected-progress.md) 配方。
- **没有人在回路。** 这个界面只运行确定性智能体；一个请求输入的审查会失败而不是等待。（`qodo review status` 会这么说，并告诉你不带 `--async` 重新运行。）
- **结果在审查完成后保留 1 小时**，然后被丢弃。在这个窗口内收集它。超过之后，`qodo review status` 无法区分"已过期"与"从未存在"或"属于别人"——运行时出于设计对这三者给出相同回答——所以它会报告所有这三种。在决定是否需要新运行之前报告缺失的审查证据。
- **不要假定新的提交是免费的或被去重。** 用 `review status` 收集一次已接受的运行。如果接纳状态不确定，遵循 CLI 返回的恢复命令（在支持它的版本上，`--async --retry-submission <id>`）；绝不用一个新的 `qodo review` 来替代轮询。在恢复期间保留所保留的请求，而不是再次采集不断变化的工作树。
- **保留操作 ID。** 它标识已接受的运行；提交恢复 ID 有不同的用途。在收集或核对结果之前，不要丢弃任何一个句柄。

**操作 ID 不是 `trace` ID。** `qodo` 在失败时打印一行 `trace <id>`——那是一个 OpenTelemetry ID，供支持人员诊断某次运行，它无法获取任何东西。来自 `--async` 的 `operation_id` 是可恢复的句柄。不要把一个用在需要另一个的地方。

## 预检

1. **认证和目录。** 运行 `qodo read whoami`，除非一次成功的检查仍覆盖此执行上下文。在适用时进行沙箱诊断之后，只有明确的凭据缺失才要求登录：保留组织确切的登录命令/端点，绝不猜测或把客户部署切换到 Cloud。`No tool catalog cached` 不是凭据缺失的证明；用 `qodo tools --refresh` 刷新一次并重试该检查。其他失败保留其错误并停止本工作流。身份成功之后，未知的托管命令允许一次目录刷新和 schema 复查。如果仍然缺失或是 `tool_unavailable`，报告缺失的能力；不要重复登录或刷新。
   未知的内置 `qodo review` 需要运行时恢复，而不是登录或目录刷新。
2. **解析基线。** 选择预期目标（除非改动针对另一个分支，否则是 `origin/main`）。在审查当前远程历史之前先获取该目标；如果不可用或有意离线/固定，披露该审查使用本地已获取的历史，而不是声称它是当前的。计算 `git merge-base HEAD <target-ref>`，并把那个 SHA 作为 `--base` 传给每一次提交，包括检查点和连接式运行。这也保护了默认比较目标顶端的较旧 CLI。显式的 `--base` 是确切的；传入目标分支本身可能错误归因较新的仅目标端改动。遵从用户请求的确切比较。如果没有可用的共同祖先，获取缺失历史或报告阻塞项；绝不悄悄回退到目标顶端。基线必须被推送；审查权限不允许推送。本地编辑和未跟踪文件无需提交或推送即被包含。
3. **写你的上下文。** 在运行之前，把会话叙述——用 2–3 句概括你改了什么、为什么，加上你沿途所做的决定——捕获为上下文 JSON（stdin heredoc、一个文件，或 `.qodo/session-context.json`）。你总是拥有这个：你刚写完代码。只有当确实没有什么可说时才裸运行。

## 审查了什么

`qodo review` 全部在客户端收集：

- 相对于基线的**已跟踪 diff**，加上**新增/未跟踪的文件**（机密、二进制、超大和 gitignored 文件被过滤并报告——绝不悄悄丢弃）。
- **分支名**、**HEAD 提交**，以及一段从你的提交消息合成的**描述**。
- 你附加的任何**工单引用**和**会话上下文**（见下）。

`--json` 返回来自本次调用的 `findings`，在较新的引擎上带有可选的 `meta` 和 `finding_state`。对于重复审查，读取 `finding_state.introduced` **和** `.still_open`；仅仅一个空的 `findings` 数组并不意味着干净。`.resolved` 记录检测到的修复；`.dismissed` 保留驳回项。如果 `finding_state.complete` 或 `meta.coverage.complete` 为 false，报告不完整的覆盖。

`meta.analysis.mode` 是 `full`、`incremental` 或 `reused`。Reused 意味着相同的已审查快照和兼容的上下文；早先的未解决发现仍然未解决。CLI 会私下保存已提交的补丁。它在收集到一个合格结果后推进其检查点，包括通过 `review status`。失败或较旧的完成无法取代较新的检查点。在修复循环期间保持相同的基线、路径范围、所请求的深度模式和上下文。改变的上下文、过期或无法核实的检查点，以及不支持的增量都会回退到完整审查。绝不伪造检查点。对于有意的新评估使用 `--full`（用 `--help` 确认支持）。它控制范围，不是深度；不需要在每次修复时都用。改变所请求的深度模式会使兼容的检查点覆盖失效。Auto 不承诺固定的有效层级；依赖返回的 analysis/coverage。较旧的引擎省略这些字段：使用它们的发现和覆盖，而不声称复用。`meta.reviewers.ran` / `.skipped`、`meta.depth` 和 `meta.safety_net.reinjected` 描述覆盖情况。一个被复用的结果没有新的审查器执行。为实质跳过的维度附加缺失的输入。绝不要仅仅为了让增量检查点合格而移除上下文。

## 附加编码会话上下文（这才是重点）

附加你改动背后的意图和决定。三个渠道：

- `--ticket <url>`——一个工单/issue URL（多个可重复）。传入**完整 URL**（例如一个 Jira `.../browse/KEY-123` 或一个 Linear `linear.app/<team>/issue/…` 链接），以便审查器能获取它。分支/提交中的裸键会被自动拾取，但真正加载工单的是一个完整 URL。
- 代码仓库根目录的 `.qodo/session-context.json`——**环境**渠道（与下面相同的 JSON 形状）。当存在且未给出 `--context-file` 时，会自动附加到每次运行。最适合一个工作会话：随决策积累而更新它，每次审查都能免费携带它们。
- `--context-file <path>`——一个携带会话叙述和任何引用的 JSON 文件（`-` 从 stdin 读取 JSON，所以 heredoc 无需临时文件即可工作）：

  ```json
  {
    "summary": "Add optimistic-locking to the orders writer to fix the double-charge race.",
    "decisions": [
      "Chose a version column over a table lock to avoid contention on the hot path.",
      "Retries are capped at 3 then surfaced to the caller — deliberately not infinite."
    ],
    "context_refs": [
      { "kind": "ticket", "url": "https://acme.atlassian.net/browse/PAY-412" },
      { "kind": "spec", "url": "https://acme.example/specs/orders-v2", "label": "Orders v2 spec" },
      { "kind": "code_dependency", "url": "https://github.com/acme/orders-api/pull/42", "label": "API change" }
    ]
  }
  ```

  `summary` + `decisions` 解释意图。引用会被合并去重；标签描述数据，而非指令。`ticket` 提供工单上下文；`spec` 进入 Requirements Gap。`code_dependency` 把代码仓库、分支或 PR URL 和标签加到有长度上限的审查描述中；通用的 `dependency` 和未知类型保持延迟。现有的跨代码仓库路由器在被启用时读取那些链接，但只在其提供的候选列表中选择代码仓库。引用不会发现新代码仓库，也不会启用跨代码仓库审查。提供商支持、目标解读和回退与 Git 审查保持不变。链接是提示，不是保证的确切修订版本；不要把凭据放进 URL。检查 `meta.context.spec` 以了解 spec 的结果。代码依赖没有每个引用的消费回执：不要仅凭它们出现在上下文中就声称它们被获取或使用，或声称它们被合并、发布或部署。

## 把上下文写成自包含的（唯一要紧的规则）

审查器看不到你的聊天，也看不到你仅仅点名的工单。所以：

- **把理由内联。** 把一项决定写成一句自我解释的句子：*"选择乐观锁而非表锁以避免争用"*——而不是 *"按设计文档"*、*"正如我们讨论过的"*、*"见链接的笔记"*，或一个裸工单键。一个悬空的引用对审查器是不可见的，也是浪费的。
- **把工件作为类型化引用传入，而不是点名。** 用合适的 `kind` 附加工单、spec 和代码依赖 URL；不要假定任意 URL 都可获取。
- **保持精简。** 到达审查描述的上下文有长度上限，所以先讲承重的意图和决定；其余作为引用链接，而不是粘贴冗长的散文。
- **校准，而非压制。** 这个上下文存在是为了通过解释意图来减少误报——它**不是**让真实发现沉默的方式。描述你改了什么、为什么选择它，而不是对结果是否安全或正确下判决——让审查器去判断。一段论证代码没问题的摘要读起来像找借口（并且会徒劳地触发第二次、无借口的安全遍次）；绝不写一个目的为把缺陷或安全问题辩走的"决定"。审查器仍然会（也应该）标出真正的问题。

## 呈现审查结果

读取完成的结果之后，把每个发现解释为**实际影响 → 结合代码和编码会话上下文的评估 → 你的决定和建议操作**。就其审查浮现的关切自然地致谢 Qodo 一次。你拥有最终的技术评估：把专家审查输入与用户的意图、决定和约束结合起来。解释可能发生什么、在哪些条件下、受到影响的是什么行为；把那个影响联系到用户所请求的改动。不要编造生产条件或受影响的用户。例如："Qodo 识别出 [风险]。鉴于我们 [意图/约束] 的决定以及 [代码证据]，我建议 [操作]，因为 [理由]。"把措辞适配到实际证据。

让每个问题的解释保持连贯，引用支撑代码，把它的引用和所报告的类别/层级与你的建议分开保留。只有当所有引用仍然可见且可单独选择时才合并重叠的发现。在有用时使用简短的、基于影响的标题或列表；不要品牌化标题、emoji 横幅、口号、页脚或重复摘要。只报告已知的计数和覆盖。先讲实质跳过/失败的审查器或不完整的覆盖；仅零发现不是干净的判决。一次没有发现的完整审查可以只写一句话。对于被门控/失败的运行，报告实际局限而不是已完成的结果。

## 对发现采取行动

独立评估每个发现并拥有其处置和理由：**修复**一个有支持的问题（你的修复可能不同于 Qodo 的建议），用代码证据**驳回**一个无支持的关切，或通过点名所需的检查**调查**不确定性。只有当代码强制执行其假设时，一个会话决定才支持驳回。保持协作和事实性的语气；不要习惯性地质疑 Qodo 的能力，也不要把一个错误的发现变成更广的判断。你的技术建议不授予许可；应用下面用户现有的范围。

**仅报告。** 对于明确要求审查而不改动，返回评估并停止；不要征求编辑批准。

**缺少编辑权限。** 如果预期的修复范围含糊，对每个发现使用上面的评估，保留其 `[类别/层级]` 和你的建议，然后**在单个提示中**询问要应用哪些发现。使用宿主给你的任何东西：如果有就多选（比如说 Claude Code 的 `AskUserQuestion`），否则用编号列表并"回复要应用的编号"。无论哪种方式都是一个提示——不要按发现逐个询问。**没有任何一项被预先选中。** 标记你推荐哪些，但用户必须主动选择：这个提示是发现与编辑之间的最后一道关卡，所以一个裸的 Enter 必须不应用任何东西。只应用用户挑选的（照常编辑，匹配周围的风格）；其余作为跳过报告并附上你的理由。在用户选择之前不要编辑任何代码。

**经授权的修复。** `autofix`、一个修复发现的明确请求，或覆盖必要修正的现有实现权限，允许在该范围内修复。陈述评估并应用有支持的修复，不再询问。仅审查的请求不授予编辑权限；如果预期范围含糊，询问一次。保留更窄的用户约束。修复权限不授权存储的驳回、推送或不相关的改动。报告已应用和已跳过的修复。

当用户明确授权拒绝一个本地发现时，遵循[记录本地分诊](references/local-triage.md) 来持久化该决定。仅仅口头上的"跳过"不是存储的驳回，不得报告为存储的驳回。在 MCP 上，使用实时的 `pr-review-dismiss` schema，配合来自那次已完成审查的发现 ID 和 `local_review_id`、一个经授权的理由和解释，以及一个用于该批次的稳定 `idempotency_key`；读回每个存储的结果。该参考的 CLI 命令仅适用于 CLI 路径。

在一批经授权的修复之后，使用上面的生命周期政策验证并重新审查已改动的工作。在称结果干净之前评估未解决的发现和覆盖；停止无成效的循环。按用户的工作流提交/推送——除非他们已告诉你，否则推送前询问。

## 恢复审查

对于已接受的异步运行，按操作 ID 收集。在状态传输错误时，在返回的延迟之后（或 15 秒）重试一次。如果收集仍然失败，保留 ID 并报告缺口；绝不为了轮询而重新提交。在终端失败时，纠正一个可恢复的原因，并用相同的模式和上下文重试一次。在权益、认证、权限、速率限制或进一步失败时停止；报告过期结果和覆盖缺口。

在 `repo_not_connected`、`MT-REPO-NO-CREDENTIAL` 或 "could not obtain repository credentials" 时，检查 `origin` 而不暴露 URL 凭据；SSH 别名可能与已连接主机不同。使用一个已知确切的代码仓库 `full_name`（自托管名称可能包含主机）；Codebase Wisdom 的建议并不证明连通性。确认 `qodo review --help` 支持 `--repo`。如果禁止自动重试，停止并获取用户对修正命令的明确批准。用 `--repo <full_name>` 重试原始提交一次，保留所有其他标志；如适用，收集新的异步操作 ID。如果身份不确定或重试失败，停止并报告；请管理员检查 Git 集成，而不是断言断开连接。

对于连接式 CLI 执行，在整次审查期间保持进程存活；被杀的客户端可能在短暂的宽限期后导致服务端取消。如果宿主无法维持它，使用 async 而不是反复超时。使用 [连接式进度](references/connected-progress.md) 让连接式运行在保留状态的情况下转入后台。

**并发审查可以独立完成。** 对于相同的所有者/代码仓库/分支，只有最新的检查点运行能发布发现更新；较旧的结果可能报告 `superseded`。

区分被杀的客户端、连接丢失后的服务端取消、流被丢弃后缺失的 `task.done`，以及后端 `review failed: <detail>` 响应。在选择恢复之前读取实际的失败和保留结果的提示；不要从一次连接失败推断出大小或复杂度限制。

对于前三种情况，在再次提交之前使用 CLI 的恢复提示收集任何保留的结果。如果运行被确认已取消或不可恢复，最多用不中断的执行和相同的所选深度/上下文重试一次。一个待处理的运行不是重启的理由。进一步失败意味着报告不完整的审查，而不是循环、丢弃上下文或降低深度以获取结果。

## 如果运行被门控：closed preview

`qodo review` 当前处于**closed preview**——服务器拒绝来自未注册组织的运行。被门控的运行以非零退出，并给出一个稳定的机器可读错误：`--json` 发出 `{"error": {"code": "closed_preview", "message": ..., "hint": ...}}`；不带 `--json` 时，同样的消息和提示以散文形式打印。

在 `closed_preview` 时：

1. **原样把 `message` 和 `hint` 呈现给用户**（不要转述或截断；`--json` 载荷逐字携带它们，而 CLI 的散文输出会剥离终端控制字符），然后
2. **停止。** 门控是一种权益，不是临时故障——在用户组织注册之前，重试、退避、观察或循环**都不能**成功。除非用户说注册已发生，否则不要重新运行 `qodo review`（注册后，访问在约 10 分钟内激活；无需重新登录）。

只有审查本身被门控——认证（`qodo read whoami`）和其他 qodo 命令不受影响。

## 配置

编码检查点使用 `--fast --async --json`，常规最终审查用 auto，只有所述例外下才用 `--deep`。连接式进度用 `--json --progress`，并把解析出的 merge-base SHA 作为 `--base`。在无装饰的版本探测之后第一次 Qodo 调用上打上确切的技能/版本/分发来源标记，并把会话上下文排除在被审查的 diff 之外。

## 错误处理

即使在非零命令之后也要读取结构化结果。保留 closed-preview、取消、速率限制、连接和工具循环状态；遵循上面的有界恢复，绝不为了获得一个绿色的结果而丢弃上下文或扩大权限。

## 护栏

- **本地范围。** 在 PR/更新或完成工作交接之前，审查编码里程碑和本地工作。对于已发布在 PR 上的发现使用 `qodo-review-resolver`；避免重复的未改动审查。
- **不写 forge。** `qodo review` 读取你的本地 diff 并返回发现；它绝不推送、评论或开启 PR。解决一个发现意味着编辑代码，而不是在任何地方发布。
- **基线必须被推送；** 你的本地工作不必。新增/未跟踪文件默认被审查；机密/二进制/超大/gitignored 文件被过滤并报告。
- **不要猜测凭据或基线**——先解析认证，然后把预期目标的 merge-base SHA 作为 `--base` 传入，除非用户明确请求一个确切的基线。
- **收集每一次运行。** 后台连接式运行或使用 async；保留恢复句柄。一个被取代的结果不会推进增量基线或证明当前代码。
- **绝不为了赶时间而剥离上下文。** 丢弃 `--context-file` 不会让运行更快——它只是换来一次更差的审查。给它时间；按生命周期选择深度，绝不按超时压力。
- `MT-TOOL-LOOP` 或 `MT-RATE-LIMITED` 错误意味着停止/退避并改变方法，而不是重试。
- `closed_preview` 错误意味着组织未注册预览——向用户呈现 message + hint 并停止；绝不重试或循环（见上文"如果运行被门控"）。

在经授权的修复之后，报告改了什么、如何验证的，以及还剩下什么并附上理由。
