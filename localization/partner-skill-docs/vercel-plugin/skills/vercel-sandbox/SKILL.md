---
name: vercel-sandbox
description: Vercel Sandbox 指南——用于安全运行不受信任代码的临时 Firecracker microVM。支持 AI 智能体、代码生成和实验。在隔离环境中执行用户生成或 AI 生成的代码时使用。
summary: "Run untrusted/AI-generated code in ephemeral Firecracker microVMs via @vercel/sandbox. Core loop: `const s = await Sandbox.create(); try { const r = await s.runCommand('python3', ['-c', code]); } finally { await s.stop(); }`. runCommand has no shell (wrap pipes/redirects in `bash -c`) and does not throw on non-zero exit (check r.exitCode). Default image is Ubuntu (`apt-get update` before install). Persistence is on by default (auto-snapshot on stop, resume by name; only the filesystem survives). For untrusted code use `networkPolicy: 'deny-all'`, a short `timeout`, and `persistent: false`. Credential brokering: a firewall `transform` injects a secret header on egress so the VM never holds it. AI agents reach models with no API key via the AI Gateway (`https://ai-gateway.vercel.sh`, `Authorization: Bearer $VERCEL_OIDC_TOKEN`) — the token is not auto-injected, so pass it via `env` or broker it. Full docs: https://vercel.com/docs/sandbox"
metadata:
  priority: 4
  docs:
    - "https://vercel.com/docs/sandbox"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns: []
  importPatterns:
    - '@vercel/sandbox'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/sandbox\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/sandbox\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/sandbox\b'
    - '\byarn\s+add\s+[^\n]*@vercel/sandbox\b'
  promptSignals:
    phrases:
      - "@vercel/sandbox"
      - "sandbox"
      - "code sandbox"
      - "vercel sandbox"
      - "isolated environment"
      - "sandboxed execution"
    allOf:
      - [sandbox, code]
      - [sandbox, execute]
      - [sandbox, run]
      - [sandbox, isolated]
      - [sandbox, safe]
      - [sandbox, environment]
      - [isolated, execute]
      - [isolated, code]
      - [isolated, environment]
      - [isolated, run]
      - [safe, execute]
      - [safe, code]
      - [untrusted, code]
      - [untrusted, execute]
      - [code, runner]
      - [code, playground]
      - [execute, safely]
      - [run, safely]
      - [run, isolation]
      - [execute, isolation]
      - [ffmpeg, process]
      - [ffmpeg, convert]
      - [ffmpeg, compress]
      - [student, code]
      - [student, execute]
      - [student, run]
    anyOf:
      - "sandbox"
      - "isolated"
      - "isolation"
      - "untrusted"
      - "safely"
      - "microvm"
      - "ffmpeg"
      - "playground"
    noneOf:
      - "iframe sandbox"
      - "sandbox attribute"
      - "codesandbox.io"
      - "stackblitz"
      - "offload"
      - "offloading"
      - "shard"
      - "shards"
      - "sharded"
      - "sharding"
    minScore: 4
retrieval:
  aliases:
    - code sandbox
    - microvm
    - isolated execution
    - safe code runner
  intents:
    - run untrusted code
    - execute code safely
    - create sandbox
    - isolate code execution
  entities:
    - Vercel Sandbox
    - Firecracker
    - microVM
    - isolated execution
chainTo:
  -
    pattern: 'from\s+[''""]vm2[''""]|require\s*\(\s*[''""]vm2[''""\)]|new\s+VM\('
    targetSkill: vercel-sandbox
    message: 'vm2 detected — it has known security vulnerabilities. Reloading Vercel Sandbox guidance for Firecracker microVM-based safe execution.'
  -
    pattern: 'child_process.*exec\(|execSync\(|spawn\(.*\{.*shell:\s*true'
    targetSkill: ai-sdk
    message: 'Shell exec for code execution detected — loading AI SDK guidance for tool-calling patterns that pair with Vercel Sandbox for safe agent execution.'

---

# Vercel Sandbox

Vercel Sandbox 在临时 Firecracker microVM 内运行不受信任或 AI 生成的代码。你获得一个具有文件系统和网络的真实 Linux VM——通过 API 按需创建，并在完成后停止（或快照）。当你不能完全信任的代码需要运行时使用它：AI 智能体工具调用、代码生成、用户提交、构建或实验。

**不要**对不受信任的代码使用像 `vm2`（已知逃逸）或 `child_process`/`eval` 这样的进程内沙箱。它们共享你的进程；Sandbox 是独立的 VM。

## 安装

```bash
pnpm add @vercel/sandbox   # or npm i / yarn add / bun add
```

还有一个 Python SDK（`vercel` 包，`vercel.sandbox`）和一个 `sandbox` CLI。本技能除非另有说明，展示的是 JS SDK。

## 最小示例

核心循环是创建 → 运行 → 停止。对于一次性工作，在 `finally` 中停止，这样抛出的错误不会泄漏一个运行中的 VM（运行期间会计费）。`stop()` 可以安全地多次调用。

```ts
import { Sandbox } from "@vercel/sandbox";

const sandbox = await Sandbox.create();
try {
  const result = await sandbox.runCommand("python3", ["-c", "print(2 + 2)"]);
  console.log(await result.stdout()); // "4\n"
  console.log(result.exitCode);       // 0
} finally {
  await sandbox.stop();
}
```

不带参数调用 `Sandbox.create()` 会启动默认镜像（`vercel/sandbox/universal`，Ubuntu 加 Node.js 24、Python 3.14 作为 `python3`，以及常见工具）、2 个 vCPU 和 5 分钟超时。

## 认证

- **在 Vercel 上**（Functions、Cron、构建）：SDK 通过部署的 OIDC 令牌自动认证。无需配置。
- **本地开发**：运行 `vercel link` 然后 `vercel env pull`，在 `.env.local` 中获得 `VERCEL_OIDC_TOKEN`（有效期约 12 小时；过期时重新拉取）。
- **外部 / CI**（无 OIDC 可用）：设置 `VERCEL_TOKEN`、`VERCEL_TEAM_ID`、`VERCEL_PROJECT_ID`，并将它们作为 `token`、`teamId`、`projectId` 传给 `Sandbox.create()`（SDK 不会从环境中读取它们）。

这是**调用** SDK 的进程的认证。它与你想在 VM **内部**可用的任何凭据是分开的——sandbox 不会自动携带你的 `VERCEL_OIDC_TOKEN`（见[在 Sandbox 中运行 AI 智能体](#running-ai-agents-in-a-sandbox)）。

## 创建 sandbox

常见的 `Sandbox.create()` 选项（全部可选）：

| 选项 | 默认值 | 说明 |
|---|---|---|
| `image` | `vercel/sandbox/universal` | 托管镜像，或自定义/公共 VCR 镜像。见[镜像](#images)。 |
| `resources` | `{ vcpus: 2 }` | `vcpus` 可以是 `1` 或最大到计划上限的偶数（Hobby 4、Pro 8、Enterprise 32）。每个 vCPU 包含 2 GB RAM。对于廉价、低强度不受信任运行使用 `1`。 |
| `timeout` | `300_000`（5 分钟） | 会话超时（毫秒）。到期时会话停止，任何进行中的 `runCommand` **reject**。用 `sandbox.extendTimeout(ms)` 延长到计划最大会话（Hobby 45 分钟，Pro/Ent 24 小时）。 |
| `ports` | `[]` | 要暴露的端口，最多 15 个。用 `sandbox.domain(port)` 访问它们。你的服务器必须监听 `0.0.0.0`（不是 `127.0.0.1`）才能被访问。 |
| `region` | 项目默认或 `iad1` | 19 个区域之一。 |
| `persistent` | `true` | 停止时自动快照并在下次调用时恢复。对于一次性工作传 `false` 以避免快照存储成本。 |
| `networkPolicy` | `"allow-all"` | 对于不受信任代码使用 `"deny-all"` 或允许列表。见[网络策略](#network-policy-and-credential-brokering)。 |
| `env` | – | 每条命令的环境变量。逐命令 `env` 覆盖这些。用它向 VM 注入凭据。 |
| `name` | 自动生成 | 按项目唯一，不可变。用于检索/恢复持久 sandbox。 |
| `tags` | – | 最多 5 个键值对，用于在 `Sandbox.list()` 中过滤。 |

## 运行命令

`runCommand` 直接运行一个二进制文件——**没有 shell**，因此管道、重定向、`&&` 和通配符除非你自己调用 shell 否则不工作。它**无论退出码如何都会以完成的命令 resolve**（非零退出不会抛出）；检查 `result.exitCode`。它仅在真正运行失败时 reject——例如会话在命令执行中途超时。

命令默认以**非 root** 用户（`ubuntu`，在 sudo 组中）运行；传 `sudo: true` 以 root 运行。

```ts
const r = await sandbox.runCommand("npm", ["install"]);
if (r.exitCode !== 0) throw new Error(await r.stderr()); // non-zero does NOT throw

// Needs a shell for the redirect / pipe. Use absolute paths (see below).
await sandbox.runCommand("bash", ["-c", "echo hi > /vercel/sandbox/out.txt && cat /vercel/sandbox/out.txt"]);

// Root for one command (sudo is object-form only)
await sandbox.runCommand({ cmd: "apt-get", args: ["update"], sudo: true });

// Long-running process: detached (object form only) returns immediately
const server = await sandbox.runCommand({ cmd: "npm", args: ["run", "dev"], detached: true });
```

`runCommand` 返回一个完成的命令，带有 `await result.stdout()`、`await result.stderr()` 和 `result.exitCode`（当 `detached: true` 时为活动的 `Command`）。对象形式还接受 `cwd`、`env` 以及 `stdout`/`stderr`（用于流式传输的 `Writable`）。`sudo` 和 `detached` 仅支持对象形式。

**工作目录**：下面的文件方法以 `/vercel/sandbox` 为根，但不要假定命令的默认工作目录相同。每当命令读取或写入你通过 `writeFiles`/`readFileToBuffer` 创建的文件时，使用 **`/vercel/sandbox` 下的绝对路径**（或传入显式的 `cwd`），以便两侧指向同一位置。

## 文件

文件方法的路径除非是绝对路径，否则相对于 `/vercel/sandbox`。`content` 必须是 `Buffer`。

```ts
await sandbox.writeFiles([
  { path: "input.txt", content: Buffer.from("line one\nline two\n") },
  { path: "run.sh", content: Buffer.from("#!/bin/bash\necho hi"), mode: 0o755 },
]);

// readFileToBuffer returns a Buffer, or null if the file is missing — guard it.
// (readFile returns a ReadableStream; neither returns a string, so convert yourself.)
const buf = await sandbox.readFileToBuffer({ path: "input.txt" });
const text = buf?.toString("utf8") ?? "";

await sandbox.mkDir("src/generated");
```

要在创建时拉入源代码，使用 `source`：一个 git 代码仓库（`{ type: "git", url, username, password, depth?, revision? }` —— `username`/`password` 对私有代码仓库进行认证）、一个 `tarball`（`{ type: "tarball", url }`），或一个 `snapshot`（`{ type: "snapshot", snapshotId }`）。

## 安装系统包

默认镜像是 **Ubuntu**——使用 `apt-get`，并先运行 `apt-get update`（包列表初始为空，因此不运行它安装会失败）。这需要 `sudo`，且没有 shell，因此通过 `bash -c` 运行并检查退出码：

```ts
const install = await sandbox.runCommand({
  cmd: "bash",
  args: ["-c", "apt-get update && apt-get install -y ffmpeg"],
  sudo: true,
});
if (install.exitCode !== 0) throw new Error(await install.stderr());
```

对于不同的基础，使用托管镜像（`vercel/sandbox/arch` 使用 `pacman`/`yay`）或构建[自定义镜像](#images)，以便包被预先烘焙进去，运行时无需安装任何东西。

## 端口和预览 URL

在创建时暴露端口（最多 15 个），启动一个**监听 `0.0.0.0`** 的服务器（不是 `127.0.0.1`，否则不可达——host 标志特定于框架），然后读取其公共 URL。`detached` 在进程生成时返回，而不是在监听时返回，因此在使用 URL 之前轮询就绪状态：

```ts
const sandbox = await Sandbox.create({ ports: [3000] });
// Bind 0.0.0.0 — e.g. Next/Vite: `run dev -- --host 0.0.0.0`; node http: listen("0.0.0.0")
await sandbox.runCommand({ cmd: "npm", args: ["run", "dev", "--", "--host", "0.0.0.0"], detached: true });

// Wait until the port actually answers inside the VM
for (let i = 0; i < 30; i++) {
  const ping = await sandbox.runCommand("bash", ["-c", "curl -sf http://localhost:3000 >/dev/null && echo up || true"]);
  if ((await ping.stdout()).includes("up")) break;
  await new Promise((r) => setTimeout(r, 1000));
}
const url = sandbox.domain(3000); // public HTTPS URL for port 3000
```

URL 由运行中的会话提供。如果 sandbox 停止，在你恢复它并重启服务器之前没有任何东西在监听——因此对于持久的预览，保持会话存活（`extendTimeout`），而不是在会话之间依赖 URL。进出暴露端口的流量都计费（请求和响应都计入）。

## 生命周期与持久化

**持久化是默认的。** 当持久 sandbox 停止时，其**文件系统**会自动快照；之后的调用会将其恢复到一个新会话。只有文件系统被保存——**运行中的进程不会在停止/恢复后存活**，因此在恢复时重启长时间运行的服务器（见下文）。

- **Sandbox 与会话**：*sandbox* 是由 `name` 标识的长期存在的实体；*会话* 是一次 VM 启动。最大会话时长限制每个会话，而不是 sandbox——恢复会以新的超时启动新会话，因此持久 sandbox 的总生存期实际上无界。
- **检索 / 恢复**：`Sandbox.get({ name })` 立即返回句柄，并在下次需要运行中 VM 的调用时自动恢复（`resume: false` 仅在 `get` 内跳过恢复；它不会禁用这一点）。`getOrCreate` 默认在返回前不恢复；传 `resume: true` 以立即恢复并 await `onResume`。`stop()` 和 `update()` 从不自动恢复。当 sandbox 可能尚不存在时使用 `getOrCreate`，当你确定它存在时使用 `get`。
- **`getOrCreate` 接受与 `create` 相同的创建选项**（`ports`、`persistent`、`resources`、`networkPolicy`、`env` 等）。它们**仅在它创建** sandbox 时应用；如果命名的 sandbox 已存在，则以其现有配置返回（用 `sandbox.update({ … })` 更改它）。
- **钩子是逐调用的**，并在互斥的事件上触发：`onCreate` 在 `getOrCreate` 首次创建 sandbox 时运行一次；`onResume` 在恢复时运行。因此要**每个会话恰好一次**启动服务，在 **`onCreate`（首次启动）和 `onResume`（后续启动）两者**中启动它。钩子是*本次* `getOrCreate` 调用的参数，不存储在 sandbox 上——通过 `Sandbox.get` 恢复的*不同进程*不会运行它们，因此它需要自己重启所需的东西。
- 分离的服务器在进程生成后立即返回，**而不是**在监听时——因此在启动它之后（首次启动在 `onCreate` 中，后续启动在 `onResume` 中），轮询直到端口应答，再视 `domain(port)` 为活动（见[端口](#ports-and-preview-urls)）。

```ts
const startDev = (s) =>
  s.runCommand({ cmd: "npm", args: ["run", "dev"], detached: true, cwd: "/vercel/sandbox" });

const sandbox = await Sandbox.getOrCreate({
  name: "agent-ws",
  ports: [3000],
  onCreate: async (s) => {          // once, on first creation
    await s.runCommand({ cmd: "git", args: ["clone", repoUrl, "."], cwd: "/vercel/sandbox" });
    await s.runCommand({ cmd: "npm", args: ["install"], cwd: "/vercel/sandbox" });
    await startDev(s);              // up on first boot, before domain() is read
  },
  onResume: async (s) => startDev(s), // every later resume
});
// Poll for the server to be listening (see Ports) before using the URL.
const url = sandbox.domain(3000);
// Don't stop this sandbox in a finally — stopping kills the dev server and the URL.
// If this process might find the sandbox already existing (not freshly created), pass
// `resume: true` above and start the server yourself — the hooks only fire on create/this call.
```

一个独立的后续进程按名称重连，并在第一条命令时恢复。它不会运行上面的钩子，因此重启它需要的任何东西：

```ts
const sandbox = await Sandbox.get({ name: "agent-ws" });
const test = await sandbox.runCommand({ cmd: "npm", args: ["test"], cwd: "/vercel/sandbox" }); // resumes, then runs
```

一次性工作选择退出：`Sandbox.create({ persistent: false })` —— 文件系统在停止时丢弃，且不产生快照存储成本。推荐用于临时/CI 任务。

## 快照

快照是保存的完整文件系统镜像，你可以从中启动新 sandbox——这是跳过重复依赖安装的方式（从快照创建比从头安装快得多）。

```ts
const running = await Sandbox.create({ image: "vercel/sandbox/node:24" });
await running.runCommand({ cmd: "bash", args: ["-c", "apt-get update && apt-get install -y ffmpeg"], sudo: true });
const snap = await running.snapshot(); // sandbox stops automatically after; do NOT call stop()

const fast = await Sandbox.create({ source: { type: "snapshot", snapshotId: snap.snapshotId } });
```

快照默认在最后一次使用后 30 天过期。用 `snapshotExpiration`（毫秒；`0` = 永不）和 `keepLastSnapshots: { count: 1 }`（只保留最新的——保持存储平稳）控制保留。持久 sandbox 在停止时自动创建这些。

## 镜像

传 `image` 以控制环境。托管镜像位于 `vercel/sandbox` 下：

| 镜像 | 内容 |
|---|---|
| `vercel/sandbox/universal`（默认） | Ubuntu + Node.js 24、Python 3.14、编码智能体、实用工具 |
| `vercel/sandbox/node:22\|24\|26` | Ubuntu + 固定 Node.js、pnpm |
| `vercel/sandbox/python:3.14` | Ubuntu + Python 3.14、pip、venv、uv |
| `vercel/sandbox/ubuntu` | 最小 Ubuntu 26.04 + sudo |
| `vercel/sandbox/arch` | Arch Linux、yay、base-devel |

**自定义镜像**（烘焙你自己的工具）通过 Vercel Container Registry：`vercel vcr build docker . my-repo:latest --push`，然后 `image: "my-repo:latest"`。团队范围（`team/project/repo:tag`）和公共镜像也可用。注意：Sandbox **不**运行 Dockerfile 的 `ENTRYPOINT`/`CMD`——在创建后用 `runCommand` 自己启动进程。为可复现性固定摘要（`image@sha256:...`）。

## 驱动器

驱动器是你挂载到 sandbox 中作为目录的持久存储；与快照（每个 sandbox 的完整文件系统副本）不同，驱动器是一个由许多 sandbox 共享并在多次运行中持续更新的目录。适合智能体工作区、依赖缓存和共享数据。

```ts
import { Sandbox, Drive } from "@vercel/sandbox";

const drive = await Drive.getOrCreate({ name: "workspace-cache" });
const sandbox = await Sandbox.create({ mounts: { "/data": drive } }); // read-write

// Concurrent read-only access via a drive snapshot
const reader = await Sandbox.create({ mounts: { "/data": drive.snapshot() } });
```

每次运行最多 4 个驱动器。默认大小 1 TiB（Hobby 1 GiB），最大 16 TiB。驱动器位于一个区域；挂载它的 sandbox 必须使用该区域作为其主区域（故障转移区域仍会加载驱动器，但读取延迟更高）。同一时间只有一个 sandbox 能以读写方式挂载驱动器；使用 `drive.snapshot()` 进行共享读取。

## 网络策略和凭据中介

出口防火墙是 Sandbox 对不受信任代码的关键安全控制。在创建时或通过 `sandbox.update({ networkPolicy })` 设置 `networkPolicy`：

- `"allow-all"`（默认）——允许所有出口。
- `"deny-all"`——阻止所有出口，包括 DNS。对不受信任代码从这里开始。
- 规则对象——`allow` 列表将出口限制为**仅**列出的域名（其他一切被拒绝）；为 IP 范围添加 `subnets.allow`/`subnets.deny`（`deny` 优先）。域名匹配基于 SNI，因此非 TLS 流量除非按 IP 范围（`subnets.allow`）允许或策略包含 `*` 通配符（放行无域名流量）否则被拒绝；`subnets.deny` 仅移除允许规则授予的访问。

**凭据中介**：`transform` 规则在对允许域名的出口上注入一个密钥 header，因此 VM 内的代码可以调用已认证的 API **而密钥永远不会进入 sandbox**。由于 `allow` 列表拒绝其他一切，虚拟机只能到达那一个域名：

```ts
const sandbox = await Sandbox.create({
  networkPolicy: {
    allow: {
      "api.example.com": [{
        transform: [{ headers: { Authorization: `Bearer ${process.env.API_SECRET}` } }],
      }],
    },
  },
});
// Inside the VM: fetch("https://api.example.com/…") is authenticated by the
// firewall; the VM never holds API_SECRET and can't reach any other host
// (no catch-all `*` rule, so non-TLS / domain-less egress is denied too).
```

## 在 sandbox 中运行 AI 智能体

要运行 AI 生成的代码，或编辑并执行代码的编码智能体（Claude Code、Codex），将其放入 sandbox。按信任级别有两种给予模型访问的方式：

**受信任的智能体——注入 OIDC 令牌，直接调用 AI Gateway。** AI Gateway 接受 Vercel OIDC 令牌作为 bearer 凭据，因此不需要模型 API 密钥。sandbox **不会**自动拥有你的 `VERCEL_OIDC_TOKEN`，因此通过 `env` 传入它：

```ts
const sandbox = await Sandbox.create({
  env: { VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN! },
});
// Inside the VM, hit the gateway (OpenAI-compatible at /v1, Anthropic-compatible at root):
//   curl https://ai-gateway.vercel.sh/v1/chat/completions \
//     -H "Authorization: Bearer $VERCEL_OIDC_TOKEN" -H "Content-Type: application/json" \
//     -d '{"model":"anthropic/claude-sonnet-5","messages":[{"role":"user","content":"hi"}]}'
// The AI SDK auto-resolves VERCEL_OIDC_TOKEN when AI_GATEWAY_API_KEY isn't set. Model ids
// come from the AI Gateway model catalog (provider/model, e.g. "anthropic/claude-sonnet-5").
```

**不受信任的代码——中介凭据，使其远离 VM。** 对于你不信任的代码，完全不要把令牌放入 VM。只允许网关并在防火墙处注入 auth header，使虚拟机不持有凭据且无法到达其他主机（没有 `*` 通配符，非 TLS 出口也被拒绝）：

```ts
const sandbox = await Sandbox.create({
  networkPolicy: {
    allow: {
      "ai-gateway.vercel.sh": [{
        transform: [{ headers: { Authorization: `Bearer ${process.env.VERCEL_OIDC_TOKEN}` } }],
      }],
    },
  },
});
// Agent code calls https://ai-gateway.vercel.sh with no token present in the VM.
```

OIDC 令牌约 12 小时；对于更长的会话，在恢复时重新注入或将工作限定在令牌的生命周期内。

## 多智能体隔离

在一个 sandbox 中运行多个智能体，每个作为自己的 Linux 用户并拥有私有主目录（仅 JS SDK；镜像必须包含 `/bin/bash`）：

```ts
const alice = await sandbox.createUser("alice"); // /home/alice
await alice.runCommand("whoami"); // runs as alice
const root = sandbox.asUser("root");
```

一个用户主目录中的文件对另一个用户不可读。用 `sandbox.createGroup("team")`（目录在 `/shared/team`）和 `addUserToGroup` 共享工作区。

## CLI

`sandbox` CLI（也是 `vercel sandbox`）以 Docker 风格镜像 SDK：

```bash
sandbox create --name my-box              # create (persistent; --non-persistent to opt out)
sandbox exec my-box -- npm test           # run a command in a named sandbox (resumes if stopped)
sandbox run --rm -- node --version        # one-off: create, run, then delete (--rm); without it the box persists
sandbox connect my-box                    # interactive shell (aliases: ssh, shell)
sandbox copy ./local my-box:/remote       # copy one file; dest is the full path (alias: cp)
sandbox list                              # list sandboxes (alias: ls)
sandbox drives get-or-create cache        # create a drive
sandbox stop my-box
```

## 限制和成本

- **会话时长**：Hobby 45 分钟，Pro/Ent 24 小时（每个会话；更长则恢复）。
- **资源**：`vcpus` 为 1 或最大到 4/8/32 的偶数（Hobby/Pro/Ent），每个 vCPU 2 GB RAM，15 个端口，64 GB 磁盘。
- **并发**：Hobby 10，Pro/Ent 10,000 个并发 sandboxes。
- **网络**：你的 sandbox **下载**的数据（npm、git、数据集）是**免费的**；它发送出去的数据和所有暴露端口的流量都计费。
- **隔离**：每个 sandbox 是独立的 Firecracker microVM，因此崩溃、fork 炸弹或磁盘填满都被限制在该 VM 内。VM 内除 vCPU 和 64 GB 磁盘限制外没有逐进程的 CPU/PID 配额——用短 `timeout` 和针对不受信任代码的 `deny-all` 来限制风险。
- **省钱**：完成一次性工作后调用 `stop()`，合理设置 vCPU（可低至 1），对临时运行使用 `persistent: false`，并使用更小的镜像或 `keepLastSnapshots: { count: 1 }` 来减少快照存储。

## 最佳实践清单

- 对于一次性工作，在 `finally` 中 `stop()`（可以安全地多次调用）。**例外**：服务暴露端口的长寿 sandbox——不要停止它，否则 URL 会失效；让它继续运行（它会持久化/恢复）。
- `runCommand` 没有 shell（将管道/重定向/`&&` 包裹在 `bash -c` 中）且非零退出不会抛出（检查 `result.exitCode`）；如果会话在命令执行中途超时它会 reject。
- 当命令读取/写入你用 `writeFiles` 创建的文件时，使用绝对的 `/vercel/sandbox` 路径（或显式 `cwd`）。
- 在 `apt-get install` 之前 `apt-get update`；命令默认非 root（root 用 `sudo: true`）；`sudo`/`detached` 仅支持对象形式。
- 在 **`onCreate` 和 `onResume` 两者**中启动每会话服务（dev 服务器）——只有文件系统在停止后存活。
- 对于不受信任代码：`networkPolicy: "deny-all"`（或严格的允许列表）、短 `timeout`（例如 `30_000`）、`vcpus: 1` 和 `persistent: false`。
- 暴露的服务器必须绑定 `0.0.0.0`，而不是 `127.0.0.1`。
- 为可复现启动固定自定义镜像的摘要；`ENTRYPOINT`/`CMD` 不会运行。
