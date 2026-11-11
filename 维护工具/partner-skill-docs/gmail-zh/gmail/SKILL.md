---
name: gmail
description: >-
    使用 Go CLI 读取、搜索、发送和管理 Gmail 邮件、草稿、标签及表情回应。适用于读取邮件、搜索收件箱、发送邮件、
    用表情回应邮件、管理草稿、转发、检查休假自动回复、管理标签、下载附件，或解码 `mail.google.com` Web UI 网址。
    请勿用于 Google Chat 消息或日历邀请。
metadata:
  icon: ✉️
  logo: https://www.gstatic.com/images/branding/productlogos/gmail_2020q4/v11/192px.svg
---

# gmail

通过 Gmail REST API 在命令行中读取和发送 Gmail 邮件。

> **重要**：请将下方安装命令中的 `<SKILL_DIR>` 替换为本技能目录的绝对路径（即包含此 `SKILL.md`
> 文件的文件夹）。

## 安装

先运行一次本技能的脚本，然后再做其他事情。它会为本机下载 CLI，将 `gmail` 注册到智能体的 `PATH`
（不是用户 shell 的 PATH），并打印版本：

```bash
<SKILL_DIR>/scripts/gmail --version
```

```powershell
# Windows (PowerShell)
& "<SKILL_DIR>\scripts\gmail.cmd" --version
```

之后请始终直接运行 `gmail`，不要再按路径运行该脚本：只有 `gmail` 才会获得用户的登录态。绝不要让用户去运行它；用户无法运行。

## 身份验证

直接运行 `gmail`，让返回结果告诉你登录方式。不要搜索文件系统或环境变量来查找凭据，也不要向用户索要 token。

-   **由 Antigravity 管理登录**：当命令失败并返回 Antigravity 的“需要身份验证”消息时，按提示操作：显示它给出的插件卡片，请用户点击其中的 **登录**，然后在用户确认已登录后重试。此情况下不要运行 `gmail auth login` 或 `gmail auth status`（`gmail auth status` 会检查独立 CLI 的存储，在沙箱内会失败；请用 `list_plugin_accounts` 查看已连接的账号）。如果连接了多个账号，可用命令前缀 `AGY_ACCOUNT=<account>` 选择一个账号，例如 `AGY_ACCOUNT=me@example.com gmail ...`。在 PowerShell 中请先设置：
    `$env:AGY_ACCOUNT = "me@example.com"; gmail ...`。
-   **无法登录**：当提示 `no credentials found: run gmail auth login` 时，说明此版本的 Antigravity 或此账号尚无法登录 Gmail。不要运行 `gmail auth login`，它对 Gmail 无效。告诉用户此处暂不支持 Gmail 登录、更新 Antigravity 可能解决，然后停止。
-   若 403 明确指向缺失的权限或 scope，则不是登录问题。请如实报告，不要让用户重新登录。

## 快速开始

```bash
# 1. Search messages or threads (use --max N; NEVER use --max_results, --limit, or -n)
gmail readonly search "is:unread" --max 5
gmail readonly read "Dentist" --max 5

# 2. List drafts as JSON or create a draft (safe in unattended AGY_UNATTENDED mode)
gmail readonly drafts --json
gmail mutate create-draft --to "user@example.com" --subject "Draft" --md --body-file ./body.md
```

## 常用与全局参数

-   **`--max N`** —— `search`、`read`、`threads`、`drafts` 的结果数量上限
    （默认 10，`read` 默认 5）。**禁用参数**：切勿使用
    `--max_results`、`--limit`、`-n` 或 `-l` —— 这些参数并不存在。
-   **`--json`** —— 以 JSON 输出（适用于所有 `readonly` 命令，例如
    `readonly drafts --json`、`readonly list-reactions --message ID --json`）。
-   **`--timezone <TZ>`** —— 时区覆盖（例如 `--timezone "Asia/Kolkata"`
    或 `"America/New_York"`），用于 `readonly get-vacation` 的时间戳显示
    （默认取 `TZ`、系统位置或 `America/Los_Angeles`）。
-   **`--page-token <TOKEN>`**（或 `--page_token <TOKEN>`）—— `readonly read` 的分页 token。
-   **`--to <emails>` / `--cc <emails>`** —— 在 `mutate reply` 中覆盖收件人和抄送，
    而不是默认使用原发件人/线程参与者。

## 命令命名空间与安全规则

-   **命名空间**：
    -   **`readonly`**：严格只读取邮件、线程、草稿、标签、历史或设置，不改变云端状态。
    -   **`mutate`**：会改变状态的写入、发送邮件、管理草稿，或修改标签与邮件。需要用户明确授权。
-   **无人值守模式（`AGY_UNATTENDED`）**：
    -   当设置了 `AGY_UNATTENDED` 环境变量（任意非空值）时，所有对外发送命令（`mutate send`、`mutate reply`、
        `mutate react`、`mutate forward`、`mutate send-with-attachment`、
        `mutate send-draft`）都会在 CLI 层被**强制阻止**并返回错误。
    -   **变通方法**：改用 `mutate create-draft`。无人值守模式下允许 `mutate create-draft`，
        因为它不会立即发送邮件，便于人工审核后手动发送。
-   **高风险变更必须获得用户明确授权**：
    -   **发送邮件**（`mutate send`、`mutate reply`、`mutate forward`、
        `mutate send-with-attachment`、`mutate send-draft`）：会**以用户身份**发送邮件。
        务必先确认收件人、主题和正文。
    -   **将邮件移入回收站**（`mutate trash`）：除非用户明确要求，否则绝不使用。
    -   **删除草稿**（`mutate delete-draft`）：永久删除（绕过回收站）。
        如果草稿已交给用户，用户可能已经发送（或正处于“撤销发送”窗口内）；此时删除可能永久移除已发送的邮件。
        请先重新检查 `readonly drafts` 和“已发送”（`readonly search "in:sent ..."`）中的该线程，
        优先使用 `update-draft`（保留线程与收件人），或请用户丢弃旧草稿。
-   **不要用 shell 过滤（`grep`/`awk`）**：切勿将 Gmail CLI 输出通过管道传给
    `grep`、`egrep` 或 `awk`。请始终直接用 Gmail 搜索查询运算符过滤（例如 `readonly search "is:unread bob"`）。

## 示例

### 1. 搜索、读取与稳健查询

```bash
gmail readonly search "is:unread from:alice@example.com" --max 5
gmail readonly read "is:starred" --max 3          # search + show full plain-text bodies
gmail readonly read --max 3 -- "-in:trash"        # pass -- before queries starting with -
gmail readonly read "is:starred" --page-token "TOKEN"
gmail readonly get MESSAGE_ID                     # full message by ID
gmail readonly threads "subject:review" --max 5   # 80-char snippets
gmail readonly get-thread THREAD_ID               # full thread + inline Reactions:
```

> **注意**：以 `-` 开头的查询字符串前务必加 `--`（例如
> `gmail readonly search --max 5 -- "-in:trash -in:spam"`），以免开头的连字符被解析为 CLI 参数。

**稳健搜索（应对不确定的日期或时间）：**

当用户给出多个约束（例如某个约会实体/地点，加上记忆中的日期或时间）时：

-   **锚定不变的实体**：优先用最具体、不会变的关键词搜索（例如 `"Dentist"`）。**不要**把未经确认的日期或时间
    （如 `"18th September"` 或 `"11 am"`）放进主查询串，记错的日期会得到 0 结果。
-   **批量读取而非循环**：运行 `readonly read "Dentist" --max 5` 一次性查看候选的头部与纯文本正文
    （绝不要在 shell 脚本里循环调用 `readonly get <id>`）。
-   **不要在 `readonly read` 上用 `--json`**：默认的 `readonly read` 会把 HTML 样板清理为干净的纯文本，
    而 `--json` 会输出原始 base64 载荷和 RFC 头部，徒增上下文体积。

**Gmail 搜索运算符**（`search`、`read`、`threads` 支持）：
`is:unread`、`is:starred`、`is:important`、`from:user@example.com`、
`to:user@example.com`、`subject:keyword`、`after:2024/01/01`、
`before:2024/12/31`、`has:attachment`、`label:LABEL_NAME`、`newer_than:1d`、
`older_than:1w`。

### 2. 发送、回复与格式化邮件（Markdown 与 HTML）

> [!IMPORTANT] 使用 Markdown 内容（标题、粗体、列表、链接）发送、起草或回复时，
> **必须**传入 `--md`。对于表格，**必须**传入 `--html` 并使用内联 CSS（标准 Markdown 管道表格
> `| Col 1 | Col 2 |` 会转换成无样式的 `<table>` 标签，在 Gmail 中渲染为无边框、零内边距、列被挤压）。
>
> **多行与含 `%` 的正文（尤其是在 Windows 上）**：在 `--body` 中传字面量 `\n` 会发送字面的反斜杠加 `n`；
> 在 Windows 上 `.cmd` 包装会令 `cmd.exe` 截断多行的 `--body` 参数并展开 `%...%` token
> （例如 `50%` 可能吞掉后续的 `--file` 等参数）。只要正文有多行、Markdown、HTML 或 `%` 字符，
> 在 `mutate send`、`mutate send-with-attachment`、`mutate reply`、`mutate create-draft`
> 或 `mutate update-draft` 中，请先把正文写入临时文件（优先使用会话草稿目录），
> 传入 `--body-file ./body.md`（或 `--body-file ./body.html`），随后删除在工作区创建的临时文件。
> 请用你的文件写入工具写该文件，以确保为 UTF-8；shell 重定向（`>`、`Out-File`）在 Windows 上可能保存为 UTF-16，导致邮件乱码。
>
> **其他参数中的 `%`、`"` 与 `&`（仅 Windows）**：`cmd.exe` 也会改变内联传入的文本，例如 `--subject`、搜索查询或标签名。
> 它会丢弃 `%`、在 `"` 处分割参数，并在遇到 `&`、`|`、`<`、`>` 时出错。在 Windows 上：
>
> -   把 `%` 写成 `%%`：`--subject 'Up 20%%'`。
> -   绝不要在文本中使用 `"`，改用 `'`。精确短语搜索需要 `"`，因此请改用 `subject:(quarterly report)` 搜索这些词；它会以任意顺序匹配两个词。
> -   仅在文本同时含空格时使用 `&`、`|`、`<` 或 `>`，例如 `'P&L update'`。否则请改写，例如 `Q and A`。
>
> 这些规则优先于精确措辞：如果它们改变了用户的文本，请说明。正文文件无需转义。绝不要在 macOS 或 Linux 上这样做。

```bash
# Send plain text, Markdown (--md), or HTML (--html)
gmail mutate send --to "user@example.com" --subject "Hello" --body "Hi!"
gmail mutate send --to "a@example.com" --cc "b@example.com" --bcc "c@example.com" --subject "Update" --md --body-file ./body.md
gmail mutate send --to "user@example.com" --subject "Large Report" --body-file ./body.html --html

# Send with attachment (--file works with --md, --html, and --body-file)
gmail mutate send-with-attachment --to "user@example.com" \
  --subject "Report" --body-file ./body.md --md --file ./report.pdf

# Reply and forward
gmail mutate reply --message MESSAGE_ID --body "Thanks!" --all --include-history
gmail mutate reply --message MESSAGE_ID --body-file ./body.md --md --to "user@example.com" --cc "team@example.com"
gmail mutate forward MESSAGE_ID "other@example.com"
```

### 3. 表情回应（`list-reactions`、`react`、`delete-reaction`）

```bash
# 1. List validated emoji reactions on a message (as JSON) or thread
gmail readonly list-reactions --message MESSAGE_ID --json
gmail readonly list-reactions --thread THREAD_ID

# 2. React to a message with a single Unicode emoji (alias: create-reaction)
gmail mutate react --message MESSAGE_ID --emoji "🚧"

# 3. Remove an active reaction by message + emoji or reaction ID (alias: unreact)
gmail mutate delete-reaction --message MESSAGE_ID --emoji "🚧"
gmail mutate unreact --id REACTION_MESSAGE_ID
```

### 4. 草稿

```bash
gmail readonly drafts --max 10
gmail readonly drafts --json
gmail readonly get-draft DRAFT_ID
gmail mutate create-draft --to "user@example.com" --subject "Draft" --md --body-file ./body.md
gmail mutate create-draft --to "user@example.com" --subject "Attachment" --body "See attached" --file ./report.pdf
gmail mutate create-draft --message MESSAGE_ID --all --include-history --body "Reply-all draft"
gmail mutate update-draft DRAFT_ID --body "Updated body"
gmail mutate update-draft DRAFT_ID --md --body-file ./body.md
gmail mutate send-draft DRAFT_ID
gmail mutate delete-draft DRAFT_ID
```

### 5. 标签、组织与批量操作

```bash
gmail readonly labels
gmail readonly get-label LABEL_ID
gmail mutate create-label "Parent/Child" --bg-color red --text-color white
gmail mutate update-label LABEL_ID --name "New Name" --bg-color "#f691b3" --text-color "#000000"
gmail mutate add-label MESSAGE_ID LABEL_ID
gmail mutate remove-label MESSAGE_ID LABEL_ID
gmail mutate delete-label LABEL_ID
gmail mutate mark-read MESSAGE_ID
gmail mutate mark-unread MESSAGE_ID
gmail mutate archive MESSAGE_ID1 MESSAGE_ID2
gmail mutate archive --thread THREAD_ID
gmail mutate trash MESSAGE_ID
gmail mutate thread-modify THREAD_ID --add STARRED --remove UNREAD
gmail mutate batch-modify "MSG_ID1,MSG_ID2" --add-labels "LABEL1,LABEL2" --remove-labels "LABEL3"
```

### 6. 设置、历史与附件

```bash
# Vacation responder (optional --timezone for timestamp display)
gmail readonly get-vacation

# Forwarding, Send-As, History & Attachments
gmail readonly forwarding-addresses
gmail readonly get-autoforward
gmail readonly sendas
gmail readonly history 12345
gmail readonly download-attachment MESSAGE_ID ATTACHMENT_ID ./output.pdf
```

## 处理 Web UI（Sapinto）ID

标准的 16 字符十六进制 ID（`169a11506fd9abf4`）和永久服务器 ID
（`thread-a:r-...`）在所有命令中都可用。当拿到一个 Gmail Web UI 网址，
其 `#inbox/...` 片段中含 Base40 编码的“Sapinto”ID（例如
`https://mail.google.com/mail/u/0/#inbox/FMfcgxwBWKbBPzwzcvGXKWZXsRqpgsnJ`），
请**提取原始的 Sapinto ID 片段**（绝不要传整条 URL），直接传给 `readonly get-thread` 或 `readonly get`，
它们会自动解码：

```bash
gmail readonly get-thread FMfcgxwBWKbBPzwzcvGXKWZXsRqpgsnJ
```
