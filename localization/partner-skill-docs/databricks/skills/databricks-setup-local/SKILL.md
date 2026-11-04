---
name: databricks-setup-local
description: "使用 `databricks environments setup-local` 预览、置备或诊断由 uv 管理的本地 Python .venv。当用户想要为此设置或修复一个环境（用于 Databricks Connect、集群或无服务器计算、`--job-task` 或捆绑包目标），或当 setup-local 失败时使用。"
compatibility: Requires databricks CLI (>= v1.16.0) and uv
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks Setup-Local

**必须先做：** 使用 `databricks-core` 处理 CLI、身份验证和 profile 选择。切勿使用默认 profile。对于已存在的环境，使用 `databricks-execution-compute`。

## 工作流

### 1. 检查 CLI 和身份验证

CLI 必须 >= v1.16.0 —— 该版本新增了 `--no-dbconnect` 以及本技能所路由的 `E_PROVISION_CONFLICT` 失败。以确定的方式比较 —— 绝不凭肉眼判断版本（1.9.0 比 1.16.0 旧，而按字典序的字符串比较会判断错误）。先运行此门禁，若其以非零退出则不要继续：

```bash
# Subshell so a failed gate reports non-zero without closing a persistent shell.
(
  # Read stdout only -- upgrade nags on stderr carry their own semver and would win the parse.
  if ! raw="$(databricks version 2>/dev/null)"; then
    echo "STOP: databricks CLI is missing or failed to run -- install or upgrade it via databricks-core first"
    exit 1
  fi
  have="$(printf '%s\n' "$raw" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -n1 | tr -d v)"
  [ -n "$have" ] || have="$(printf '%s\n' "$raw" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
  if [ -z "$have" ]; then
    echo "STOP: could not read a version from 'databricks version' -- upgrade via databricks-core first"
    exit 1
  fi
  case "$raw" in
    *-dev*)
      echo "NOTE: dev build $have -- the floor cannot be checked; ask the user to confirm this build has setup-local"
      ;;
    *)
      if [ "$(printf '%s\n%s\n' "1.16.0" "$have" | sort -V | head -n1)" != "1.16.0" ]; then
        echo "STOP: databricks CLI $have is older than v1.16.0, the floor this skill requires -- older CLIs can run setup-local but not as documented here; upgrade via databricks-core first"
        exit 1
      fi
      ;;
  esac
)
```

只有在门禁通过之后，才使用选定的 profile 进行身份验证：

```bash
databricks auth describe --profile <PROFILE>
```

优先使用最新的稳定版 CLI；无需在线查询。如果门禁以非零退出（早于 v1.16.0、缺少 CLI 或无可读版本），或 `setup-local` 在帮助中不存在、报告 `unknown command`，或拒绝本技能要求你传入的某个标志，则停止。如果它打印 `NOTE: dev build`，则下限无法验证 —— 在继续之前与用户确认。使用 `databricks-core` 在获批后升级并验证；切勿手动重建 `setup-local`。

对每个工作区命令都使用选定的 profile。未经批准不要转换其他包管理器。

### 2. 确认项目目录

确认包含（或计划包含）`pyproject.toml`、`.venv` 和 `uv.lock` 的根目录；若可能有多个根目录则询问。将其用于预览和应用。它必须是全新目录（greenfield）或由 `uv` 管理的，但用于预览时不必可写。

### 3. 选择一个目标

恰好选择一个分支：

- **集群：** 使用 `--cluster-id <ID>` 或 `--cluster-name <NAME>`。若未知，用选定的 profile 列出集群并询问；参见[示例](references/examples.md)。
- **无服务器：** 使用 `--serverless-version <N>`。不存在版本列表命令；若未指定则询问。
- **作业任务：** 使用 `--job-task <JOB_ID>.<TASK_KEY>`。若任务未知，运行 `databricks jobs get <JOB_ID> --profile <PROFILE> --output json`，列出任务键并询问。
- **捆绑包：** 一个含有 `databricks.yml` 的项目。使用 `databricks-dabs` 检查其根目录和选定的目标。只有当该目标解析为受支持的经典或无服务器计算时才省略计算标志；否则询问。为具名目标添加 `--target <BUNDLE_TARGET>`。

切勿组合计算标志。若没有分支能够解析，询问用户。

### 4. 预览

先试运行；它不写入也不安装任何东西：

```bash
databricks environments setup-local --profile <PROFILE> <TARGET_ARGS> --dry-run --output json
```

对于捆绑包，`<TARGET_ARGS>` 为空或为 `--target <BUNDLE_TARGET>`。默认使用普通模式。只有当用户明确不希望此命令管理 `databricks-connect` 时才使用 `--no-dbconnect`；结果中的 `mode` 仍会为其报告 `constraints-only`。参见 [JSON 输出](references/json-output.md)和[示例](references/examples.md)。

### 5. 获取批准并应用

在应用之前，验证目录可写并运行 `uv --version`。安装 `uv` 之前先询问；切勿悄悄设置 `DATABRICKS_LOCALENV_AUTO_INSTALL_UV=1` 或运行远程安装程序。

展示目标、版本、警告、`plan.diff` 和目录。说明应用可能会：

- 备份并重写 `pyproject.toml`；
- 安装 Python 和依赖项；
- 更新 `.venv` 和 `uv.lock`。

对于捆绑包中的 `--serverless-version N`，还要披露下文所述的应用后作业 YAML 同步，以便批准同时覆盖两处变更。

只有在用户请求置备或批准该命名目录的计划之后才应用。保持目录、profile、目标和模式不变。

如果目录、profile、目标、模式或项目文件在预览之后发生变化，重新运行 `--dry-run`，展示新计划，并再次获取批准。将其解析出的 Python、`databricks-connect` 和受管理约束视为权威；不要用猜测的版本替代。另行在获批后单独协调用户自有的依赖冲突。

### 6. 处理结果

- `ok: true`：对于捆绑包中的 `--serverless-version N`，将其 YAML 源中每个现有作业的 `environments[].spec.environment_version` 更新为 `"N"`，然后验证捆绑包。如果不存在则报告；不要凭空创建。集群和作业任务目标跳过此步。报告目标、版本、警告和 `venvPath`；优先使用 `uv run <cmd>` 或从 `venvPath` 推导出平台特定的解释器。
- `ok: false`：使用[故障排查](references/troubleshooting.md)。在运行会改动文件的诊断之前，以及在提交外部 issue 之前，先询问。
- 无 JSON：检查 stderr 中的管线前 CLI、身份验证、目录或缓存错误。
