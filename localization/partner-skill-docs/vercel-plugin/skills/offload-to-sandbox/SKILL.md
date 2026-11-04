---
name: offload-to-sandbox
description: 使用 `vercel sandbox` CLI 将重型构建、完整测试套件和并行实验从本地机器卸载到 Vercel Sandboxes。当本地机器过载或被多个智能体共享时、当测试套件应被分片时，或当许多任务应并排运行而不消耗本地 CPU、内存或磁盘时使用。
summary: "Offload heavy work to Vercel Sandboxes: build a base snapshot once (toolchain + deps + baseline build), create one non-persistent sandbox per task from it (`vercel sandbox create --name <task> --non-persistent --snapshot <snap_id> --vcpus 8 --timeout 3h`; Hobby allows 4 vCPUs and 45-minute sessions), push code as a tarball of git-tracked and untracked files while keeping heavy dirs like node_modules, run commands as one quoted `sh -c` string (long jobs detached with an exit-status file you poll), copy small result files back, shard suites across sandboxes, check failures against an untouched baseline in the same sandbox, and `vercel sandbox remove` every sandbox when done. `vercel sandbox exec` exits 0 even when the remote command fails, so read the remote exit status yourself."
metadata:
  priority: 5
  docs:
    - "https://vercel.com/docs/sandbox"
    - "https://vercel.com/docs/cli/sandbox"
    - "https://vercel.com/docs/sandbox/cli-reference"
    - "https://vercel.com/docs/sandbox/pricing"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns: []
  importPatterns: []
  bashPatterns:
    - '\b(?:vercel|vc)\s+sandbox\s+(?:create|exec|copy|cp|snapshot|run|fork)\b'
  promptSignals:
    phrases:
      - "offload to a sandbox"
      - "offload to sandbox"
      - "run it in a sandbox"
      - "run the tests in a sandbox"
      - "remote sandbox"
      - "remote sandboxes"
      - "use sandboxes"
      - "shard the test suite"
      - "machine is overloaded"
    allOf:
      - [sandbox, offload]
      - [sandbox, remote]
      - [sandbox, "test suite"]
      - [sandbox, shard]
      - [sandbox, parallel]
      - [sandboxes, agents]
    anyOf:
      - "sandbox"
      - "sandboxes"
      - "offload"
      - "remote"
    noneOf:
      - "iframe sandbox"
      - "sandbox attribute"
      - "codesandbox.io"
    minScore: 6
retrieval:
  aliases:
    - offload work to vercel sandbox
    - remote build machine
    - remote test runner
  intents:
    - offload builds and tests to a sandbox
    - shard a test suite across machines
    - run parallel experiments remotely
  entities:
    - Vercel Sandbox
    - vercel sandbox CLI
    - snapshot
---

# 将工作卸载到 Vercel Sandbox

Vercel Sandbox 是一个 Linux microVM（x86_64），你可以在几秒内创建并在完成后移除。这使它成为一个良好的远程 worker：它让重型构建和长测试套件远离你的笔记本电脑，并为每个智能体或任务提供各自干净的机器。本技能涵盖如何使用 `vercel sandbox` CLI 高效地做到这一点。对于 `@vercel/sandbox` SDK 和运行不受信任的代码，见 `vercel-sandbox` 技能。

## 何时卸载，以及什么保留在本地

卸载：

- 完整测试套件，尤其是它们可以被分片时。
- 需要数分钟或需要 Linux 的构建。
- 一次许多任务：每个任务或每个智能体一个 sandbox。
- 任何填满本地磁盘的东西（大型构建树、许多 worktree）。

保留在本地：

- 编辑、`git`、小型针对性测试、类型检查和 lint，以及编排。
- 任何需要本地凭据或 sandbox 没有的硬件的东西。

当多个智能体共享一台机器时的一个良好默认：智能体在本地编辑并运行快速的针对性检查，所有重型工作都交给它们自己的 sandboxes。

## 计划限制

| | Hobby | Pro | Enterprise |
|---|---|---|---|
| 最大 vCPU（每个 2 GB 内存） | 4（8 GB） | 8（16 GB） | 32（64 GB） |
| 最大会话时长 | 45 分钟 | 24 小时 | 24 小时 |
| 并发 sandboxes | 10 | 10,000 | 10,000 |

`--vcpus` 接受 1 或最大到计划上限的偶数；默认是 2。下面的示例使用 Pro 规格（`--vcpus 8`、`--timeout 3h`）。在 Hobby 上，使用 `--vcpus 4` 和 `45m` 或更短的超时。Hobby 每月还只包含 5 小时的 Active CPU，因此重度卸载现实中需要 Pro。

运行中的 sandboxes 按 Active CPU 和预置内存计费。快照只要存在就按 Snapshot Storage 每 GB-月计费。

## 一次性准备基础快照

在每个新 sandbox 中安装工具链和依赖会浪费时间和金钱。做一次、快照，然后从快照启动其他所有东西：

```bash
# 1. Create a builder sandbox from the default image (Ubuntu, Node.js, Python, common tools).
vercel sandbox create --name base-builder --non-persistent --vcpus 8 --timeout 2h --image vercel/sandbox/universal

# 2. Install the pinned toolchain and build the baseline tree once.
vercel sandbox copy ./setup-base.sh base-builder:/vercel/sandbox/setup-base.sh
vercel sandbox exec base-builder -- sh -c 'cd /vercel/sandbox && sh setup-base.sh; echo "exit=$?"'

# 3. Snapshot it (this stops the sandbox). The ID is printed on stderr, not stdout.
vercel sandbox snapshot base-builder --stop --expiration 0 2>&1 | grep -o 'snap_[A-Za-z0-9_-]*' | head -n 1 > BASE_SNAPSHOT
test -s BASE_SNAPSHOT

# 4. The builder is no longer needed. Removing it keeps the snapshot.
vercel sandbox remove base-builder
```

在快照之前检查第 2 步打印了 `exit=0`（原因见[运行命令](#run-commands)）。

在基础中放入什么：

- 项目所固定的确切工具链版本（编译器、运行时、包管理器）。
- 主分支在已知提交处的一份已安装并已构建的副本，作为只读基线（例如 `/vercel/sandbox/base`）。
- 任务将复用的小型辅助脚本（例如一个 `prepare.sh`，将刚推送的树转换为可运行的检出）。

将快照 ID 保存在工具旁的某个文件中。`--expiration 0` 意味着快照永不过期，因此在你删除它之前会一直计费。当工具链变化时，构建一个新快照并用 `vercel sandbox snapshots delete <old-id>` 删除旧的。在大规模运行之前，检查 `vercel sandbox snapshots get "$(cat BASE_SNAPSHOT)"` 仍显示状态 `created`；被删除或过期的快照显示 `deleted`。

## 每个任务创建一个 sandbox

```bash
vercel sandbox create --name exp-parser --non-persistent --snapshot "$(cat BASE_SNAPSHOT)" \
  --vcpus 8 --timeout 3h --tag app=my-project --tag owner=agent-parser --silent
```

- **按所有者和用途命名**（`exp-parser`、`exp-parser-2`），以便并行智能体永不冲突。名称按项目唯一，并一直占用直到 sandbox 被移除。绝不要使用另一个智能体的 sandbox。
- **规模：** 每个 vCPU 附带 2 GB 内存，这是获得更多内存的唯一方式。内存密集型步骤（大型编译、大型链接作业）可能被 Linux OOM killer 杀死。在低于计划 vCPU 上限时，增大规格。在上限时，降低步骤的并行度（例如减少构建作业）或单独运行它。
- **标签**（每个 sandbox 最多 5 个）使清理变得容易：最后列出并移除带有你的所有者标签的所有内容。

## 生存期与清理

Sandboxes 默认是持久的：当会话停止时，文件系统被快照以便 sandbox 稍后恢复，且该快照按 Snapshot Storage 计费。任务 sandboxes 不需要那样，这就是这里每个 `create` 都传 `--non-persistent` 的原因。

- **`--timeout` 设置会话时长**，而不是 sandbox 的生存期。默认是 5 分钟。当它用尽时，会话停止，其中运行的所有内容都被杀死，包括分离的作业。非持久 sandbox 此时丢失其整个文件系统。为整个任务设置超时。`vercel sandbox config timeout <name> <duration>` 稍后更改它，更高的值也会延长正在运行的会话。
- **任务完成时 `vercel sandbox remove <name>`。** `vercel sandbox stop` 只结束当前会话：sandbox 保留其名称，持久 sandbox 继续为其快照计费。Vercel 在 14 天不活动后移除无法恢复的 sandboxes，因此被停止的非持久 sandbox 会占用其名称直到那时，除非你移除它。
- 移除 sandbox 不会删除快照，因此基础快照在任务清理后仍然存在。`remove` 上的 `--delete-orphan-snapshots` 还会删除该 sandbox 自己且没有其他 sandbox 使用的快照。在移除制作基础快照的 builder 时不要传入它。
- **清扫孤儿**：用 `vercel sandbox list --all --tag owner=<agent>` 清理崩溃智能体留下的孤儿。`--all` 包含已停止的 sandboxes（默认只显示运行中的），`list` 一次按一个标签过滤。用它显示的所有内容执行 `vercel sandbox remove <name>...` 移除。仅在没有智能体仍在工作时清扫整个项目（`--tag app=my-project`）。

## 移入代码而不重新安装依赖

发送源代码，而不是构建输出。将 git 知道的文件（已跟踪加上未跟踪但未被忽略）打包为一个 tarball，复制它，并解压到旧树旁边。然后从旧树将重型目录（`node_modules`）移到新树，以便它们无需重新安装，并交换两者。[包装脚本](#wrap-it-in-one-small-script)中的 `sbx push` 正是这样做的：

```bash
sbx push exp-parser . /vercel/sandbox/cand
```

- 每次更改后推送；只需几秒。然后运行一个幂等的准备步骤，仅安装或重建已更改的内容（例如，仅在 lockfile 更改时才安装依赖）。
- 在 sandbox 内构建平台特定的工件。不要把 macOS 二进制文件复制到 Linux VM 中。
- 不要推送 `.git` 或依赖目录。如果你需要远程的 git 历史，推送一个 bundle 或在 sandbox 内 `git clone`。
- 你删除但未暂存的已跟踪文件会使 `tar` 失败。先暂存删除（`git rm`）。

## 运行命令

```bash
vercel sandbox exec --timeout 2h exp-parser -- sh -c 'cd /vercel/sandbox/cand && npm test -- --shard 1/4; echo "exit=$?"'
```

- 将整个命令作为**一个单引号字符串**传给 `sh -c`。否则你的本地 shell 会在 sandbox 看到它们之前展开 `$VARS` 和通配符。尤其是 zsh 会在未匹配的通配符上出错，并将 `$var:r`、`$var:h` 等视为修饰符；使用 `${var}`。
- **不要相信 `vercel sandbox exec` 的退出状态。** 即使远程命令失败，它也以 0 退出（已用 `vercel` 64.5.0 验证，它捆绑 Sandbox CLI 4.4.0）。在远程命令末尾加 `echo "exit=$?"` 并读取它，或使用 `sbx exec`，它返回远程状态。独立的 Sandbox CLI（`npm i -g sandbox`，然后 `sandbox exec ...`）确实会传递远程退出码。
- 对于超过一行的内容，在本地编写脚本，用 `vercel sandbox copy` 复制进去，然后运行它。这更易于引用、审查和重跑。
- `exec --timeout` 是可选的且没有默认值。当它到期时，命令被 SIGKILL 杀死，CLI 打印 `Command was killed (SIGKILL, exit code 137)`。没有它时，命令运行直到完成或会话超时。
- **长作业：** 以分离方式启动它们并轮询，以便作业不依赖于你本地 `exec` 调用保持连接或 `exec` 超时。会话超时仍然适用，因此确保它覆盖该作业：

  ```bash
  vercel sandbox exec exp-parser -- sh -c 'cd /vercel/sandbox/cand && rm -f /tmp/test.status && nohup sh -c "npm run test:all > /tmp/test.log 2>&1; echo \$? > /tmp/test.status" > /dev/null 2>&1 &'
  # later, cheap polls:
  vercel sandbox exec --timeout 30s exp-parser -- sh -c 'cat /tmp/test.status 2>/dev/null || tail -3 /tmp/test.log'
  ```

- 如果你比较计时，在同一 sandbox 中运行两个版本，因为同样大小的主机速度可能不同。

## 取回结果

- 让远程方写入精简的结果文件（失败测试名摘要、退出码、JSON 报告），并仅把这些复制回来：`vercel sandbox copy exp-parser:/tmp/results.json ./results/results.json`。`copy` 每次调用移动一个文件，目标必须是文件路径，而不是目录。
- 缺失的源文件会使 `copy` 打印错误而不失败，因此之后检查本地文件存在（`sbx get` 会这样做）。
- 在远程压缩大型日志，仅在需要时获取它们。通过 `exec` 流式传输数兆字节的输出很慢，且当智能体读取时会浪费上下文。

## 分片与并行化

- 按分片索引将慢速套件拆分到 N 个 sandboxes，使用你的测试运行器的分片或一个编排脚本，并同时运行各分片。
- 为每个任务提供自己的 sandbox。十个智能体各自在自己的 sandbox 中工作胜过在一台机器上排队的十个任务。
- 用预算限制并发，而不是用 API 允许的量。每个运行中的 sandbox 都要花钱。
- 大型扇出受你分配 vCPU 速度的限制。空闲的 Pro 团队从每分钟 150 vCPU 开始（18 个 8 vCPU 的 sandboxes），并随持续使用而递增；Hobby 允许每分钟 20 到 40。

## 将先前存在的失败与新失败区分开

远程套件通常有一些与你的更改无关的失败：环境差异、不稳定测试、main 上已有的失败。

- 在同一 sandbox 中，在未触碰的基线树上再次运行失败的测试。只有基线没有的失败才是你的。
- 在工具旁保留一份已知仅环境失败的简短列表，以便没有人再次追逐它们。
- 迭代时，运行针对性检查。在最终候选上运行完整套件，而不是在每个中间步骤上都运行。

## 认证与范围

- **令牌：** `vercel sandbox` 依次使用 `--token`、`VERCEL_AUTH_TOKEN`、`VERCEL_TOKEN`，然后是你的 `vercel login` 会话。仅当这些都不可用时，才回退到 `VERCEL_OIDC_TOKEN` 环境变量。对于 CI 或长时间运行的自动化，设置 `VERCEL_TOKEN`。
- 独立的 `sandbox` CLI 读取 `VERCEL_AUTH_TOKEN` 但不读取 `VERCEL_TOKEN`，并从当前目录加载 `.env` 文件。因此，拉取到 `.env.local` 的 `VERCEL_OIDC_TOKEN` 在那里优先于你的登录，且其项目成为默认范围。
- **团队和项目：** sandboxes 及其名称属于一个项目。`--scope`（或 `--team`）和 `--project` 设置它。没有它们时，CLI 在令牌为 OIDC 令牌时使用令牌中的项目，然后使用当前目录中的 `.vercel/project.json`（来自 `vercel link`），然后是你的默认团队和一个名为 `vercel-sandbox-default-project` 的项目（如需要它会创建）。
- 在脚本中显式传入 `--scope` 和 `--project`。否则从另一个目录运行的脚本会在不同项目中工作，无法看到、复用或清理你的 sandboxes。

## 用一个小脚本包装它

一个薄包装移除大多数错误并保持智能体指令简短。将此保存为 `sbx`，使其可执行，并设置 `SBX_SCOPE`、`SBX_PROJECT` 和 `SBX_OWNER`（在 Hobby 上还设置 `SBX_VCPUS=4 SBX_TIMEOUT=45m`）：

```sh
#!/bin/sh
# sbx: offload work to Vercel Sandboxes through `vercel sandbox`.
#   sbx create <name>                         new task sandbox from the base snapshot
#   sbx push <name> <local-dir> <remote-dir>  sync git-tracked and untracked files, keep node_modules
#   sbx exec <name> <script>                  run a shell script remotely, exit with its status
#   sbx get <name> <remote-file> <local-file>
#   sbx put <name> <local-file> <remote-file>
#   sbx rm <name>...                          permanently remove sandboxes
#   sbx clean                                 remove every sandbox tagged with your owner tag
# shellcheck disable=SC2016 # single-quoted scripts are expanded by the remote shell
set -eu

: "${SBX_SCOPE:?set SBX_SCOPE to your team slug}"
: "${SBX_PROJECT:?set SBX_PROJECT to your project name}"
owner=${SBX_OWNER:-${USER:-agent}}
vcpus=${SBX_VCPUS:-8}              # Pro maximum; Hobby allows 4
timeout=${SBX_TIMEOUT:-3h}         # session length; Hobby allows 45m
exec_timeout=${SBX_EXEC_TIMEOUT:-2h}

sb() { # sb <subcommand> [args...]
  sub=$1
  shift
  vercel sandbox "$sub" --scope "$SBX_SCOPE" --project "$SBX_PROJECT" "$@"
}

# `vercel sandbox exec` exits 0 even when the remote command fails, so the
# remote shell prints the script's exit status and remote() returns it.
remote() { # remote <name> <script> [args...]
  name=$1
  script=$2
  shift 2
  log=$(mktemp)
  sb exec --timeout "$exec_timeout" "$name" -- \
    sh -c 'sh -c "$0" sh "$@"; echo "__sbx_exit=$?"' "$script" "$@" | tee "$log"
  code=$(sed -n 's/^__sbx_exit=//p' "$log" | tail -n 1)
  rm -f "$log"
  return "${code:-1}"
}

push() { # push <name> <local-dir> <remote-dir>
  git -C "$2" rev-parse --is-inside-work-tree > /dev/null
  tgz=$(mktemp)
  (cd "$2" && git ls-files -z --cached --others --exclude-standard |
    COPYFILE_DISABLE=1 tar -czf "$tgz" --null -T -)
  sb copy "$tgz" "$1:$3.tgz"
  rm -f "$tgz"
  remote "$1" '
    set -e
    dest=$1
    rm -rf "$dest.new"
    mkdir -p "$dest.new"
    tar -xzf "$dest.tgz" -C "$dest.new"
    rm -f "$dest.tgz"
    if [ -d "$dest" ]; then
      (cd "$dest" && find . -maxdepth 4 -type d -name node_modules -prune -print) > "$dest.keep"
      while IFS= read -r keep; do
        [ -e "$dest.new/$keep" ] && continue
        mkdir -p "$(dirname "$dest.new/$keep")"
        mv "$dest/$keep" "$dest.new/$keep"
      done < "$dest.keep"
      rm -rf "$dest" "$dest.keep"
    fi
    mv "$dest.new" "$dest"' "$3" > /dev/null
}

cmd=${1:?usage: sbx create|push|exec|get|put|rm|clean ...}
shift
case "$cmd" in
  create)
    name=${1:?usage: sbx create <name>}
    snapshot=${SBX_SNAPSHOT:-$(cat BASE_SNAPSHOT)}
    sb create --name "$name" --non-persistent --snapshot "$snapshot" \
      --vcpus "$vcpus" --timeout "$timeout" \
      --tag "app=$SBX_PROJECT" --tag "owner=$owner" --silent
    echo "$name"
    ;;
  push)
    push "${1:?name}" "${2:?local dir}" "${3:?remote dir}"
    ;;
  exec)
    name=${1:?usage: sbx exec <name> <script>}
    shift
    remote "$name" "$*"
    ;;
  get)
    rm -f "${3:?local file}"
    sb copy "${1:?name}:${2:?remote file}" "$3"
    [ -f "$3" ] || { echo "sbx: could not copy $1:$2" >&2; exit 1; }
    ;;
  put)
    [ -f "${2:?local file}" ] || { echo "sbx: no such file: $2" >&2; exit 1; }
    sb copy "$2" "${1:?name}:${3:?remote file}"
    ;;
  rm)
    : "${1:?usage: sbx rm <name>...}"
    sb remove "$@"
    ;;
  clean)
    # `list` shows 50 sandboxes per page; run `sbx clean` again if more remain.
    names=$(sb list --all --tag "owner=$owner" | awk 'NR > 1 && NF && $1 != "More" { print $1 }')
    # shellcheck disable=SC2086 # one word per sandbox name
    if [ -n "$names" ]; then sb remove $names; fi
    ;;
  *)
    echo "usage: sbx create|push|exec|get|put|rm|clean ..." >&2
    exit 2
    ;;
esac
```

典型的智能体会话：

```sh
sbx create exp-parser
sbx push exp-parser . /vercel/sandbox/cand
sbx exec exp-parser 'cd /vercel/sandbox/cand && sh /vercel/sandbox/prepare.sh && npm test'
sbx get exp-parser /tmp/results.json ./results.json
sbx rm exp-parser
```

在包装脚本旁记录工作流（一个简短的 `SANDBOX.md`）：快照 ID、基础包含什么、准备步骤、如何运行套件，以及已知的仅环境失败。将每个智能体的指令指向该文件。

## 陷阱

- **假成功：** 远程命令失败时 `vercel sandbox exec` 以 0 退出。读取打印的退出状态，或使用 `sbx exec`。
- **OOM：** 大型编译可能被杀死。远程退出状态 137 意味着进程收到 SIGKILL，通常来自 OOM killer。在计划内增大规格，或在上限时降低并行度，而不是盲目重试。
- **会话超时导致工作丢失：** 非持久 sandbox 在会话停止时丢弃其文件系统。在超时前复制出结果，并为整个任务设置超时。
- **残留 sandboxes：** `stop` 不会释放 sandbox 的名称或删除它。使用 `remove`，并用 `list --all` 清扫。
- **过时快照：** 从旧基础启动的任务可能遇到工具链版本不匹配。当版本变化时，重建快照，或在任务 sandbox 中刷新工具。
- **共享 sandboxes：** 一个 sandbox 中的两个智能体会互相损坏对方的树。每个 sandbox 一个所有者。
- **运行中的配额：** 在 Hobby 上，一旦月度配额用完，sandbox 创建就会暂停；在 Pro 上，Spend Management 限额可以暂停项目。以小步骤提交工作，边做边将结果写入磁盘，并保持脚本幂等，以便替代智能体可以恢复而不是从头开始。
