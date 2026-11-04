---
name: dt-setup-oneagent
description: 用于在 VM/server、Kubernetes（Operator + DynaKube）、AWS Lambda（layer + 环境变量，以及可选的从零预置全新函数）、Windows 主机、通过 SSH 的远程 Linux 主机 / EC2 实例，以及 Azure VM / VM 规模集上安装、卸载或创建并安装 Dynatrace OneAgent 的参考知识。返回文档化的端点、环境变量、令牌作用域和可直接复制粘贴的命令。返回要运行的确切命令，而不是执行它们。当用户要求安装或卸载 OneAgent，或询问"how do I…"、"what URL/scope/var do I need for…"，或"explain the OneAgent deployment for X"时使用。
license: Apache-2.0
---

# 部署 Dynatrace OneAgent —— 知识参考

此技能**仅为参考**。它包含运维人员（或另一个智能体）在受支持的目标上手动安装 OneAgent 所需的文档化端点、环境变量、令牌作用域和命令。它不执行任何操作。

> 此技能给你命令；它不运行它们。遵循你所需目标的过程，按下文所述替换环境 URL 和令牌。

## 消费此技能的任何智能体的硬性规则

- **仅在用户明确指定的资源上操作。** 绝不主动创建占位/测试 Lambda、IAM 角色、K8s 命名空间、密钥、S3 桶、EC2 实例或任何其他夹具 —— 不是为了"演示"，不是"顺便"，也不是预先创建。如果指定的资源不存在且用户未要求创建它，停下来询问。旁路资源（额外的 Secrets Manager 条目、监控、辅助栈）不得悄然预置 —— 先以确认问题的形式提出并附上确切定义。
- **明确的用户驱动创建模式是可以的。** 当用户传入 `--create`（或在被询问后明确说"yes, create it"）时，为该模式预置文档化的确切资源是正确的做法 —— 参见 [references/aws-lambda.md](references/aws-lambda.md) 中*创建新函数并安装 OneAgent* 的文档化集合。不要质疑用户键入的函数名：**不要**对 "test"、"demo"、"scratch"、"tmp" 这样的名称进行模式匹配并拒绝、警告或坚持替代方案。输入是权威的；上述规则针对的是*悄然*或*未经请求*的创建，而不是用户请求的创建。
- **切勿持久化 API 令牌。** 令牌唯一的职责是 (a) 认证 OneAgent 制品下载 / layer-ARN 查找，以及 (b) 作为安装的一部分交给目标系统（Lambda 环境变量或 Secrets Manager、Linux 安装器、DynaKube 密钥）。不要将其缓存到本地文件、写入临时脚本、留在 shell 历史中、复制到 PR 描述中，或存储到目标系统之外任何严格需要它的地方。将每次运行视为全新：通过环境变量或 0600 文件提供、使用、丢弃。
- **切勿回显或记录 API 令牌。** 当你必须在命令中引用它时，写 `$DT_API_TOKEN` 或省略的前缀（`dt0s16.…`、`dt0c01.…`）。不要把字面值粘贴到正文中。
- **切勿假设环境 URL，并在安装前确认租户。** 指向错误的环境会*静默*失败：安装成功，而主机或函数只是向无人监控的租户报告。用户明确声明的环境 URL 始终优先于任何从工具默认值或先前运行推导出的值 —— 绝不要让缓存或发现的值覆盖它。说明你即将使用的租户，并让用户纠正你。租户 ID（`abc12345`）以及 labs 与 prod 决定正确的主机。
- **接受集合的写入会替换它 —— 读取、合并、然后写入。** 这里有几个 API 接受整个集合并覆盖原有内容：`aws lambda update-function-configuration` 对 `--environment` 和 `--layers` **两者**都这样做，因此只发送 Dynatrace 值会静默删除函数自身变量和任何其他层。始终读取当前状态，将你的添加合并进去，再把并集写回。首次写入前创建回滚快照。这适用于你即将替换集合而非添加到集合的任何地方。
- **从 dtctl 推导环境 URL。** `dtctl config current-context` 只返回*上下文名称*（例如 `my-env`），而不是 URL。URL 来自 `dtctl config describe-context <ctx>`。**不要**将其直接管道到 `jq`：某些 dtctl 版本忽略 `-o json` 并打印人类可读表格（`Environment:  https://…`）同时仍以 0 退出，因此 jq 因解析错误而崩溃，并拖垮任何 `set -e -o pipefail` 脚本。先检查输出确实是 JSON，并回退到抓取 `Environment:` 行：

```bash
CTX="$(dtctl config current-context 2>/dev/null || true)"
OUT="$(dtctl config describe-context "$CTX" -o json 2>/dev/null || true)"
if printf '%s' "$OUT" | jq -e . >/dev/null 2>&1; then
  DT_ENV_URL="$(printf '%s' "$OUT" | jq -r '.environment // .url // empty')"
else
  DT_ENV_URL="$(printf '%s' "$OUT" | awk 'tolower($1) ~ /^(environment|url):$/ {print $2; exit}')"
fi
```

---

## URL 规范化

Dynatrace 的"新平台"URL 与 classic OneAgent 安装器端点不同。在构造安装器 URL 之前，转换：

| 输入（Dynatrace UI / 文档）            | 用于安装器端点           |
|----------------------------------------|---------------------------------------|
| `https://<id>.apps.dynatrace.com`      | `https://<id>.live.dynatrace.com`     |
| `https://<id>.<region>.apps.dynatracelabs.com` | `https://<id>.<region>.dynatracelabs.com` |
| 其他任何内容                          | 保持不变                             |

租户 ID 是第一个以点分隔的段（`<id>`）。

---

## 令牌类型和 Authorization 头

涉及两个令牌家族，**`Authorization` 方案由令牌的前缀决定，而不是由你调用哪个端点决定**：

| 令牌 | 前缀 | 头 |
|---|---|---|
| 平台令牌 | `dt0s16.` | `Authorization: Bearer <token>` |
| 访问令牌（classic API 令牌） | `dt0c01.` | `Authorization: Api-Token <token>` |
| PaaS 令牌 | `dt0s01.` | `Authorization: Bearer <token>` |
| OAuth 客户端密钥 | `dt0s02.` / `dt0s03.` | ❌ 不能直接使用 —— 必须先交换为 bearer 令牌 |

**平台令牌是前瞻性的默认选择。** Dynatrace 正在弃用访问令牌：新租户不能再创建它们，Classic API 端点正在更新以接受平台令牌。**不要**假定令牌以 `dt0c01.` 开头。此规则的参考实现是 dtwiz 的 `AuthHeader()`（`pkg/installer/installer.go`）：`dt0c01.*` → `Api-Token`，其他一切 → `Bearer`。

有一条路径将令牌交给历史上要求 PaaS/访问令牌的组件 —— 如果它拒绝平台令牌，请在该处使用 `dt0c01.` 访问令牌：

- **Kubernetes** —— Dynatrace Operator 使用 `dynakube` 密钥进行身份验证。

VM、远程 VM/EC2、Windows 和 Lambda 直接调用 Deployment API，可与任一令牌家族配合。

## 按目标的令牌作用域

对于**平台令牌**（`dt0s16.`），与 OneAgent 相关的作用域位于**Fleet management**：`fleet-management:oneagents:download`、`fleet-management:oneagent.connection-info:read`、`fleet-management:oneagent.tokens:read`、`fleet-management:cluster-id:read`；Kubernetes 还要求 `fleet-management:activegates:download` 和 `fleet-management:activegate.tokens:create`。通过 Dynatrace **QuickStart** 应用生成令牌会预置一套可用的作用域。

对于 **classic 访问令牌**（`dt0c01.`）：

| 目标          | 所需令牌作用域 |
|-----------------|------------------------|
| VM / Windows    | `InstallerDownload`（PaaS） |
| Kubernetes      | `InstallerDownload`、`settings.read`、`settings.write`、`activeGateTokenManagement.create` —— Dynatrace UI 的 "Kubernetes: Dynatrace Operator" 模板会设置全部四项。 |
| Azure VM / VMSS | `InstallerDownload`（PaaS）。Azure 侧：调用者的 `az` 身份需要 `Contributor` 或任何授予资源上 `Microsoft.Compute/.../extensions/write` 的角色。 |
| AWS Lambda（运行时令牌） | 一个由 OneAgent 层在运行时消费的**连接认证令牌**。与安装器令牌不同。从 Dynatrace UI 的 *Access tokens* 下使用 `entities.read` 创建，或使用 Hub → AWS Lambda 模板。 |

令牌从不按用户名限定作用域 —— 它们属于租户。

---

## 目标

每个目标都有自己的参考。它们共享上面的规则、URL 规范化和令牌指导 —— 先阅读这些，然后阅读你需要的那个。

托管 Kubernetes 发行版在 Kubernetes 参考中涵盖，而不是单独列出：安装完全相同，只是节点类型不同，因此增量应放在它们所修改的过程旁边。

| 目标 | 参考 |
|---|---|
| VM / server（Linux、macOS） | 下方 —— 所有其他目标所基于的基准情形 |
| 通过 SSH 的远程 VM / EC2 | → [references/remote-vm-ec2.md](references/remote-vm-ec2.md) |
| Windows 主机（WSL 或原生） | → [references/windows.md](references/windows.md) |
| Kubernetes（Operator + DynaKube）—— 包括 **EKS**、Fargate 和 Bottlerocket 限制 | → [references/kubernetes.md](references/kubernetes.md) |
| AWS Lambda（layer + 环境变量） | → [references/aws-lambda.md](references/aws-lambda.md) |
| Azure VM / VM 规模集（VM 扩展） | → [references/azure-vm.md](references/azure-vm.md) |

### 按平台

上面的表格按安装机制组织，因为这决定了过程。如果你是从某个特定云的角度来的：

| 平台 | 你部署到的目标 | 前往 |
|---|---|---|
| **AWS** | EC2 实例 | [remote-vm-ec2.md](references/remote-vm-ec2.md) |
| | EKS —— EC2 节点 | [kubernetes.md](references/kubernetes.md) |
| | EKS —— Fargate 或 Bottlerocket 节点 | [kubernetes.md § AWS EKS  specifics](references/kubernetes.md) —— 全栈不可用，仅 `applicationMonitoring` |
| | Lambda 函数 | [aws-lambda.md](references/aws-lambda.md) |
| **Azure** | VM 或 VM 规模集 | [azure-vm.md](references/azure-vm.md) |
| | AKS | [kubernetes.md](references/kubernetes.md) —— **不是** VM 扩展，即使节点池是 VMSS |
| **Google Cloud** | GKE（标准） | [kubernetes.md](references/kubernetes.md) |
| | GKE Autopilot | 操作员路径参见 [kubernetes.md](references/kubernetes.md) —— 全栈不可用，如同 Bottlerocket。未涵盖 Autopilot 特定的调优 |
| | Compute Engine VM | [remote-vm-ec2.md](references/remote-vm-ec2.md) —— SSH 过程并非 AWS 特有 |
| **本地 / 其他任何地方** | 你登录的 Linux 或 macOS | 下方 |
| | 你通过 SSH 访问的 Linux | [remote-vm-ec2.md](references/remote-vm-ec2.md) |
| | Windows | [windows.md](references/windows.md) |
| | Kubernetes，或通过标准 operator 的 OpenShift | [kubernetes.md](references/kubernetes.md) —— 未涵盖 classic OpenShift node-config-operator 路线 |

## VM / server（Linux、macOS）

**端点**（替换 `${DT_ENV_URL_NORMALIZED}` 和 `${ARCH}`，其中 `ARCH` ∈ `x86 | arm | ppc64le | s390`）：

```
GET ${DT_ENV_URL_NORMALIZED}/api/v1/deployment/installer/agent/unix/default/latest?arch=${ARCH}&flavor=default
Header: Authorization: Api-Token ${DT_API_TOKEN}   # dt0c01.… access token
        Authorization: Bearer ${DT_API_TOKEN}      # dt0s16.… platform token
```

**安装命令：**

将方案设置为匹配你的令牌 —— `dt0c01.…` 用 `Api-Token`，`dt0s16.…` 用 `Bearer`：

```bash
DT_AUTH="Api-Token ${DT_API_TOKEN}"   # platform token: DT_AUTH="Bearer ${DT_API_TOKEN}"

wget -O Dynatrace-OneAgent-Linux.sh \
  --header="Authorization: ${DT_AUTH}" \
  "${DT_ENV_URL_NORMALIZED}/api/v1/deployment/installer/agent/unix/default/latest?arch=${ARCH}&flavor=default"

sudo /bin/sh Dynatrace-OneAgent-Linux.sh \
  --set-monitoring-mode=fullstack \
  --set-app-log-content-access=true \
  [--set-host-group=<name>] \
  [--set-network-zone=<zone>]
```

**重启注意：** OneAgent 无法注入到已在运行的进程。安装后，重启你想监控的工作负载。

**卸载：**

```bash
sudo /opt/dynatrace/oneagent/agent/uninstall.sh
```

移除 systemd 单元、`/opt/dynatrace`，以及注入代理的 `/etc/ld.so.preload` 行。

---

## 何时不应使用此技能

- 用户希望替他们执行安装而不是解释。→ 此技能仍适用：遵循目标的过程并运行命令，先确认租户。
- 用户询问安装为何失败并想要解释。→ 此技能适用。
- 用户想要此技能未涵盖的目标（Azure Functions / App Service / Container Apps、classic OpenShift node-config-operator、GKE Autopilot 细节、ECS Fargate）。→ 参考 <https://docs.dynatrace.com>；此技能涵盖 VM/server、通过 SSH 的远程 VM/EC2、Windows、Kubernetes 和 AWS Lambda。

## 参考

- OneAgent Linux 安装：<https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/installation-and-operation/linux>
- OneAgent Windows 安装：<https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/installation-and-operation/windows>
- Kubernetes（Operator + DynaKube）：<https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/deployment/full-stack-observability>
- Dynatrace Operator 发布：<https://github.com/Dynatrace/dynatrace-operator/releases>
- AWS Lambda（Hub）：<https://www.dynatrace.com/hub/detail/amazon-web-services-aws-lambda/>
