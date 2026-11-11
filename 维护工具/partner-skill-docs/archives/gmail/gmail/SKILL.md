---
name: gmail
description: >-
    Read, search, send, and manage Gmail messages, drafts, labels, and emoji
    reactions using a Go CLI. Use when reading emails, searching inbox, sending
    messages, reacting to messages with emoji, managing drafts, forwarding,
    checking vacation responder, managing labels, downloading attachments, or
    decoding `mail.google.com` Web UI URLs. Don't use for Google Chat messages
    or Calendar invites.
metadata:
  icon: ✉️
  logo: https://www.gstatic.com/images/branding/productlogos/gmail_2020q4/v11/192px.svg
---

# gmail

Read and send Gmail emails from the command line via the Gmail REST API.

> **Important**: Replace `<SKILL_DIR>` in the Setup commands below with the
> absolute path to this skill's directory (the folder containing this `SKILL.md`
> file).

## Setup

Run this skill's script once, before anything else. It downloads the CLI for
this machine, registers `gmail` on the agent's `PATH` (not the user's shell),
and prints the version:

```bash
<SKILL_DIR>/scripts/gmail --version
```

```powershell
# Windows (PowerShell)
& "<SKILL_DIR>\scripts\gmail.cmd" --version
```

After that, always run bare `gmail`, never the script by its path: only `gmail`
gets the user's sign-in. Never ask the user to run it; they cannot.

## Authentication

Run bare `gmail` and let the result tell you how sign-in works. Don't search the
filesystem or environment for credentials, and don't ask the user for a token.

-   **Antigravity manages sign-in** when a command fails with Antigravity's
    "needs authentication" message. Follow it: show the plugin card it gives and
    ask the user to click **Sign in** on it, then retry once they say they have
    signed in. Do not run `gmail auth login` or `gmail auth status` in this case
    (`gmail auth status` checks standalone CLI storage and fails inside the
    sandbox; use `list_plugin_accounts` to check connected accounts). If more
    than one account is connected, choose one by prefixing the command with
    `AGY_ACCOUNT=<account>`, for example `AGY_ACCOUNT=me@example.com gmail ...`.
    In PowerShell, set it first:
    `$env:AGY_ACCOUNT = "me@example.com"; gmail ...`.
-   **Sign-in is unavailable** when it says
    `no credentials found: run gmail auth login`. This version of Antigravity,
    or this account, can't sign in to Gmail yet. Don't run `gmail auth login`;
    it doesn't work for Gmail. Tell the user that Gmail sign-in isn't available
    here and that updating Antigravity may fix it, then stop.
-   A 403 that names a missing permission or scope is not a sign-in problem.
    Report it instead of asking the user to sign in again.

## Quick Start

```bash
# 1. Search messages or threads (use --max N; NEVER use --max_results, --limit, or -n)
gmail readonly search "is:unread" --max 5
gmail readonly read "Dentist" --max 5

# 2. List drafts as JSON or create a draft (safe in unattended AGY_UNATTENDED mode)
gmail readonly drafts --json
gmail mutate create-draft --to "user@example.com" --subject "Draft" --md --body-file ./body.md
```

## Common & Global Flags

-   **`--max N`** — Result limit for `search`, `read`, `threads`, and `drafts`
    (default: 10, or 5 for `read`). **Banned flags**: Do NOT use
    `--max_results`, `--limit`, `-n`, or `-l` — those flags do not exist.
-   **`--json`** — Output as JSON (works with all `readonly` commands, e.g.,
    `readonly drafts --json`, `readonly list-reactions --message ID --json`).
-   **`--timezone <TZ>`** — Timezone override (e.g., `--timezone "Asia/Kolkata"`
    or `"America/New_York"`) for timestamp display in `readonly get-vacation`
    (defaults to `TZ`, system location, or `America/Los_Angeles`).
-   **`--page-token <TOKEN>`** (or `--page_token <TOKEN>`) — Pagination token
    for `readonly read`.
-   **`--to <emails>` / `--cc <emails>`** — Override recipient(s) and CC(s) in
    `mutate reply` instead of defaulting to original sender/thread participants.

## Command Namespacing & Safety Rules

-   **Namespaces**:
    -   **`readonly`**: Strictly reads messages, threads, drafts, labels,
        history, or settings without changing cloud state.
    -   **`mutate`**: State-changing writes, sending emails, managing drafts, or
        modifying labels and messages. Requires explicit user authorization.
-   **Unattended Mode (`AGY_UNATTENDED`)**:
    -   When the `AGY_UNATTENDED` environment variable is set (to any non-empty
        value), all outbound send commands (`mutate send`, `mutate reply`,
        `mutate react`, `mutate forward`, `mutate send-with-attachment`,
        `mutate send-draft`) are **hard-blocked** at the CLI level and return an
        error.
    -   **Workaround**: Use `mutate create-draft` instead. `mutate create-draft`
        is allowed in unattended mode because it does not send emails
        immediately, allowing the human operator to review and send manually.
-   **Explicit User Authorization Required for High-Risk Mutations**:
    -   **Sending emails** (`mutate send`, `mutate reply`, `mutate forward`,
        `mutate send-with-attachment`, `mutate send-draft`): Sends emails **as
        the user**. Always confirm recipient, subject, and body first.
    -   **Trashing Messages** (`mutate trash`): Never use unless the user
        explicitly asks to trash messages.
    -   **Deleting Drafts** (`mutate delete-draft`): Permanent (bypasses Trash).
        If the draft was handed to the user, they may have already sent it (or
        be inside the Undo Send window); deleting it then can permanently remove
        the sent message. Re-check `readonly drafts` and Sent
        (`readonly search "in:sent ..."`) for the thread first, and prefer
        `update-draft` (keeps thread and recipients) or ask the user to discard
        the old draft.
-   **No Shell Filtering (`grep`/`awk`)**: NEVER pipe Gmail CLI output to
    `grep`, `egrep`, or `awk`. Always filter directly via Gmail search query
    operators (e.g., `readonly search "is:unread bob"`).

## Recipes

### 1. Search, Read & Resilient Querying

```bash
gmail readonly search "is:unread from:alice@example.com" --max 5
gmail readonly read "is:starred" --max 3          # search + show full plain-text bodies
gmail readonly read --max 3 -- "-in:trash"        # pass -- before queries starting with -
gmail readonly read "is:starred" --page-token "TOKEN"
gmail readonly get MESSAGE_ID                     # full message by ID
gmail readonly threads "subject:review" --max 5   # 80-char snippets
gmail readonly get-thread THREAD_ID               # full thread + inline Reactions:
```

> **Note**: Always place `--` before a query string that starts with `-` (for
> example, `gmail readonly search --max 5 -- "-in:trash -in:spam"`), so leading
> hyphens are not parsed as CLI flags.

**Resilient Search (Handling Uncertain Dates or Times):**

When a user provides multiple constraints (e.g., an appointment entity/location
plus a remembered date or time):

-   **Anchor on the invariant entity**: Search by the most specific invariant
    term first (e.g., `"Dentist"`). Do **not** include unconfirmed dates or
    times (like `"18th September"` or `"11 am"`) in the primary query string, as
    misremembered dates return 0 hits.
-   **Batch read over loops**: Run `readonly read "Dentist" --max 5` to inspect
    candidate headers and plain-text bodies in one call (never loop
    `readonly get <id>` in shell scripts).
-   **Avoid `--json` on `readonly read`**: Default `readonly read` strips HTML
    boilerplate into clean plain text, whereas `--json` dumps raw base64
    payloads and RFC headers that bloat context.

**Gmail Search Operators** (supported by `search`, `read`, `threads`):
`is:unread`, `is:starred`, `is:important`, `from:user@example.com`,
`to:user@example.com`, `subject:keyword`, `after:2024/01/01`,
`before:2024/12/31`, `has:attachment`, `label:LABEL_NAME`, `newer_than:1d`,
`older_than:1w`.

### 2. Send, Reply & Format Emails (Markdown vs. HTML)

> [!IMPORTANT] When sending, drafting, or replying with Markdown content
> (headings, bold, lists, links), you **MUST** pass `--md`. For tables, you
> **MUST** pass `--html` with inline CSS (standard Markdown pipe tables
> `| Col 1 | Col 2 |` convert to unstyled `<table>` tags that render in Gmail
> with no borders, zero padding, and squashed columns).
>
> **Multiline & `%` bodies (especially on Windows)**: Passing literal `\n`
> inside `--body` sends a literal backslash-`n`, and on Windows `.cmd` shims
> `cmd.exe` truncates multiline `--body` arguments and expands `%...%` tokens
> (for example, `50%` can swallow subsequent flags like `--file`). Whenever a
> body has multiple lines, Markdown, HTML, or `%` characters on `mutate send`,
> `mutate send-with-attachment`, `mutate reply`, `mutate create-draft`, or
> `mutate update-draft`, write the body to a temporary file first (prefer the
> conversation scratch directory), pass `--body-file ./body.md` (or
> `--body-file ./body.html`), and delete any temporary file created in the
> workspace afterward. Write that file with your file-writing tool so it is
> UTF-8; shell redirection (`>`, `Out-File`) can save UTF-16 on Windows, which
> garbles the email.
>
> **`%`, `"` and `&` in other arguments (Windows only)**: `cmd.exe` also changes
> text passed inline, such as `--subject`, a search query, or a label name. It
> drops `%`, splits the argument at a `"`, and breaks on `&`, `|`, `<` and `>`.
> On Windows:
>
> -   Write `%` as `%%`: `--subject 'Up 20%%'`.
> -   Never put `"` in the text. Use `'` instead. An exact-phrase search needs
>     `"`, so search for the words with `subject:(quarterly report)`; it matches
>     both words in any order.
> -   Use `&`, `|`, `<` or `>` only in text that also has a space, like
>     `'P&L update'`. Otherwise reword it, like `Q and A`.
>
> These rules win over exact wording: if they change the user's text, say so.
> Body files need no escaping. Never do this on macOS or Linux.

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

### 3. Emoji Reactions (`list-reactions`, `react`, `delete-reaction`)

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

### 4. Drafts

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

### 5. Labels, Organization & Batch Operations

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

### 6. Settings, History & Attachments

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

## Handling Web UI (Sapinto) IDs

Standard 16-character hex IDs (`169a11506fd9abf4`) and permanent server IDs
(`thread-a:r-...`) work across all commands. When given a Gmail Web UI URL
containing a Base40-encoded "Sapinto" ID in the `#inbox/...` fragment (e.g.,
`https://mail.google.com/mail/u/0/#inbox/FMfcgxwBWKbBPzwzcvGXKWZXsRqpgsnJ`),
**extract the raw Sapinto ID fragment** (never pass the full URL) and pass it
directly to `readonly get-thread` or `readonly get`, which decode it
automatically:

```bash
gmail readonly get-thread FMfcgxwBWKbBPzwzcvGXKWZXsRqpgsnJ
```
