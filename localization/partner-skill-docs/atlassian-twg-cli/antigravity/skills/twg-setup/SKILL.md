---
name: twg-setup
description: 为 Antigravity 安装、升级、认证或修复 `twg`，包括缺失的 CLI 或技能以及 doctor/认证后续处理。TWG 为 Antigravity 提供跨 Jira、Confluence、Bitbucket、JSM、Assets、Slack、Google Drive 等的接地工作上下文，使其能够关联工单、文档、代码、人员和决策；呈现风险与依赖；汇总进展；并保持工作推进。
allowed-tools: Bash
---

# TWG 设置

认可的安装程序宿主：`antigravity`、`claude-code`、`codex`、`copilot`、`cursor`、`devin`、`gemini`、`hermes`、`intellij`、`opencode`、`pi`、`qoder`、`vscode`。

## Unix / macOS

**安装命令 —— 在终端中运行**

```bash
curl -fsSL --retry 2 https://teamwork-graph.atlassian.com/cli/install | bash -s -- --plugin antigravity
```

**检查**

```bash
TWG_BIN="$(command -v twg || true)"
if [ -z "$TWG_BIN" ] && [ -x "$HOME/.local/bin/twg" ]; then
  TWG_BIN="$HOME/.local/bin/twg"
fi
if [ -z "$TWG_BIN" ]; then
  echo "twg was not found at the standard launcher path; install TWG or add its directory to PATH." >&2
fi
[ -n "$TWG_BIN" ] && "$TWG_BIN" doctor || true
```

**Antigravity 技能**

```bash
TWG_BIN="$(command -v twg || true)"
if [ -z "$TWG_BIN" ] && [ -x "$HOME/.local/bin/twg" ]; then
  TWG_BIN="$HOME/.local/bin/twg"
fi
if [ -z "$TWG_BIN" ]; then
  echo "twg was not found at the standard launcher path; install TWG or add its directory to PATH." >&2
fi
[ -n "$TWG_BIN" ] && "$TWG_BIN" skills install --agent antigravity --yes
```


## Windows PowerShell

**安装命令 —— 在 PowerShell 中运行**

```powershell
curl.exe -fsSL https://teamwork-graph.atlassian.com/cli/install.ps1 -o "$env:TEMP\twg-install.ps1"
powershell -ExecutionPolicy Bypass -File "$env:TEMP\twg-install.ps1" -Plugin antigravity
```

**检查**

```powershell
$twgCommand = Get-Command twg -ErrorAction SilentlyContinue
$TWG_BIN = if ($twgCommand) { $twgCommand.Path } else { $null }
if (-not $TWG_BIN -and $env:LOCALAPPDATA) {
  $fallback = Join-Path $env:LOCALAPPDATA "Programs\twg\bin\twg.exe"
  if (Test-Path -LiteralPath $fallback -PathType Leaf) { $TWG_BIN = $fallback }
}
if (-not $TWG_BIN) {
  Write-Warning "twg was not found; use the installer command above."
}
if ($TWG_BIN) {
  & $TWG_BIN doctor
}
```

**Antigravity 技能**

```powershell
$twgCommand = Get-Command twg -ErrorAction SilentlyContinue
$TWG_BIN = if ($twgCommand) { $twgCommand.Path } else { $null }
if (-not $TWG_BIN -and $env:LOCALAPPDATA) {
  $fallback = Join-Path $env:LOCALAPPDATA "Programs\twg\bin\twg.exe"
  if (Test-Path -LiteralPath $fallback -PathType Leaf) { $TWG_BIN = $fallback }
}
if (-not $TWG_BIN) {
  Write-Warning "twg was not found; use the installer command above."
}
if ($TWG_BIN) {
  & $TWG_BIN skills install --agent antigravity --yes
}
```


## 通用流程

从运行时上下文推断当前宿主；绝不要要求用户来指明它。当宿主可识别时，使用其插件参数；仅当宿主确实未知时才省略。不要向用户叙述插件参数，也不要描述归因或分析。

1. 运行与操作系统相应的**检查**代码块。如果沙盒运行未找到 `twg`，请求批准在非沙盒环境下运行该代码块。沙盒可能会隐藏主目录，因此沙盒结果并不能证明 `twg` 不存在。
2. 如果 CLI 缺失，向用户提供与操作系统相应的安装命令，并为可识别的宿主附带插件参数。不要执行它，即使在交互式终端中也不要执行。以 `When it finishes, reply done.` 结尾。不要包含 `doctor` 或其他后续命令。
3. 在用户回复 `done` 后，由你自己运行与操作系统相应的**检查**代码块，以便 `doctor` 验证安装。绝不要要求用户运行 `doctor` 或粘贴其输出，也绝不要因认证、权限或命令错误而重新安装。
4. 在 `doctor` 状态健康后，以非沙盒方式运行与操作系统相应的 **Antigravity 技能**代码块。Antigravity 仅从 `~/.gemini/config/skills` 读取全局技能。如果 `twg` 报告未知智能体，向用户提供 `twg upgrade`，然后重新运行此步骤。

将交给用户的每条安装或补救命令都放在带围栏的 `bash` 或 `powershell` 代码块中。使用原始 URL；绝不要以内联形式或作为 Markdown 链接渲染命令。用户在他们自己的终端中完成协议、浏览器认证、可选连接和机密输入。绝不要请求或暴露令牌、密码、API 密钥、2FA/OTP 验证码或 OAuth `device_code`。

## Doctor 修复

仅对已存在的安装，或在用户回复 `done` 之后，才使用本节。只运行所报告的修复。

- 将交互式认证和设置修复交给用户；绝不要自己执行它们。将命令放入匹配的带围栏代码块，以 `When it finishes, reply done.` 结尾，并在该回复之后由你自己重新运行 `doctor`。
- 直接运行非交互式修复（包括技能刷新），然后重新运行 `doctor`。
- OAuth：`twg login --force`。
- 初始/通用设置：`twg setup`。
- 可选的 Bitbucket：`twg setup bitbucket`。

### 技能刷新

如果 doctor 报告技能问题，或 Antigravity 看不到 TWG 技能，请在 `~/.gemini/config/skills` 处刷新它们：

```text
twg skills install --agent antigravity --yes
```

使用 `twg skills list` 检查已保存的隔离策略。
被隔离的技能会保留最新内容，但没有全局发现链接。
刷新不会清除此策略。
仅在用户要求启用该技能时才恢复：

```bash
twg skills restore <exact-name> --yes
```

在安装或刷新技能后，重启 Antigravity。

用一行话总结任何遗留问题。

## 继续原始请求

当 `doctor` 状态健康时，恢复并完成用户的原始请求。不要在设置处停下，也不要要求用户选择新任务。

## 可以尝试

仅当用户的请求只是设置本身时，提供几条有用的 TWG 提示词：

- 总结我最近 7 天：工作流、关键人员、阻碍、后续行动。使用 `twg work query` 和 `twg collaborators`。
- 我离开了 [N days]。请就 [topic] 帮我补课：更新、决策、阻碍、回复、后续行动。
- 关于 [topic] 我应该和谁谈？找出负责人和最多三位专家，解释每个人为何相关，并告诉我应该先联系谁。
- [project] 的最新状态如何？包括负责人、最近更新、阻碍或风险，以及下一个里程碑。
- 找出 [topic] 当前最有用的三份设计文档或 PRD。解释每份文档确立了哪些内容，并标记过时或相互冲突的指引。
