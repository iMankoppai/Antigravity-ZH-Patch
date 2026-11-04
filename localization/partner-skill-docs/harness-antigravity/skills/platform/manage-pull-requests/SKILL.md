---
name: manage-pull-requests
description: >-
  通过 MCP 管理 Harness Code 拉取请求。列出、创建、更新和合并 PR；添加审查者并
  提交审查决定（批准 / 请求更改）；发布、更新和删除评论；读取
  讨论时间线；并检查 CI 状态。在要求开启 PR、合并 PR、批准 PR、
  留下代码审查评论、请求更改、指派审查者，或检查 PR 检查和活动时使用。
  触发短语：拉取请求、PR 审查、合并 PR、批准 PR、请求更改、添加审查者、
  PR 评论、PR 检查、PR 活动、代码审查。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: List, create, update, merge, review, and comment on Harness Code pull requests
license: Apache-2.0
compatibility: Requires Harness MCP server (harness-mcp-v2)
---

# 管理拉取请求

通过 MCP 管理 Harness Code 拉取请求、审查者、评论、检查和活动。

## 使用的 MCP 工具

| 工具 | 资源类型 | 用途 |
|------|---------------|---------|
| `harness_list` | `pull_request` | 列出代码仓库中的 PR，按状态过滤 |
| `harness_get` | `pull_request` | 按编号获取 PR 详情 |
| `harness_create` | `pull_request` | 开启新 PR |
| `harness_update` | `pull_request` | 更新 PR 标题 / 描述 / 状态 |
| `harness_execute`（action: `merge`） | `pull_request` | 合并 PR（merge/squash/rebase/fast-forward） |
| `harness_list` | `pr_reviewer` | 列出 PR 上的审查者 |
| `harness_create` | `pr_reviewer` | 向 PR 添加审查者 |
| `harness_execute`（action: `submit_review`） | `pr_reviewer` | 提交 `approved` 或 `changereq` 审查 |
| `harness_create` | `pr_comment` | 发布顶级或内联代码评论 |
| `harness_update` | `pr_comment` | 编辑评论 |
| `harness_delete` | `pr_comment` | 删除评论 |
| `harness_list` | `pr_activity` | 读取讨论时间线——**读取评论的唯一方式** |
| `harness_list` | `pr_check` | 列出 PR 上的 CI 状态检查 |
| `harness_schema` | 上述任一 | `create` / `update` body 字段的确切 JSON Schema |

所有拉取请求资源都是**代码仓库范围**。每次调用都需要 `repo_id` 和 `pr_number`（除了 `pull_request` 的 `harness_list`，它只需要 `repo_id`）。`org_id` / `project_id` 可选（服务器从代码仓库推断它们）。

**URL 快捷方式：** 如果通过 `url` 参数传入 Harness PR URL，MCP 服务器会自动提取 `repo_id` 和 `pr_number`——例如 `harness_get(resource_type="pull_request", url="https://app.harness.io/ng/account/.../pulls/42")`。

## 说明

### 步骤 1：列出或查找 PR

```
Call MCP tool: harness_list
Parameters:
  resource_type: "pull_request"
  repo_id: "<repository_identifier>"
  state: "open"        # optional: open | closed | merged
  query: "<keyword>"   # optional: full-text search
```

或获取特定 PR：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pull_request"
  repo_id: "<repository_identifier>"
  pr_number: <number>
```

### 步骤 2：开启 PR

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pull_request"
  repo_id: "<repository_identifier>"
  body:
    title: "Fix race condition in scheduler"
    source_branch: "fix/scheduler-race"
    target_branch: "main"
    description: "Resolves HAR-1234. Adds mutex around queue access."
```

`title`、`source_branch`、`target_branch` 是必需的。`description` 支持 markdown。

### 步骤 3：更新 PR 元数据

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pull_request"
  repo_id: "<repo>"
  pr_number: <number>
  body:
    title: "Updated title"
    description: "Updated description"
    state: "closed"     # optional: open | closed
```

所有 body 字段都是可选的——只包含你想更改的内容。

### 步骤 4：添加审查者

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pr_reviewer"
  repo_id: "<repo>"
  pr_number: <number>
  body:
    reviewer_id: <numeric_user_id>
```

用 `harness_list(resource_type="pr_reviewer", repo_id, pr_number)` 列出当前审查者。

### 步骤 5：提交审查决定

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "pr_reviewer"
  action: "submit_review"
  repo_id: "<repo>"
  pr_number: <number>
  body:
    decision: "approved"          # approved | changereq
    commit_sha: "<sha>"           # optional — the commit you reviewed
```

### 步骤 6：发布评论

**顶级评论：**

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pr_comment"
  repo_id: "<repo>"
  pr_number: <number>
  body:
    text: "LGTM with one nit — see inline."
```

**内联代码评论：**

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pr_comment"
  repo_id: "<repo>"
  pr_number: <number>
  body:
    text: "This loop can leak if the context is cancelled."
    path: "scheduler/queue.go"
    line_new: 142
    source_commit_sha: "<source_sha>"
    target_commit_sha: "<target_sha>"
```

对已删除行的评论使用 `line_old`。

### 步骤 7：读取评论——使用 `pr_activity`，而非 `pr_comment`

Harness Code API **不**在 `/comments` 上暴露 `GET`。要读取讨论，列出按类型过滤的 PR 活动：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "pr_activity"
  repo_id: "<repo>"
  pr_number: <number>
  kind: "comment"        # just comments (general + code)
  # or type: "code-comment" for inline code review comments only
```

其他有用的 `type` 过滤器：`review-submit`、`reviewer-add`、`state-change`、`merge`、`title-change`。

### 步骤 8：编辑或删除评论

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pr_comment"
  repo_id: "<repo>"
  pr_number: <number>
  comment_id: <numeric_comment_id>
  body:
    text: "Updated comment body"
```

```
Call MCP tool: harness_delete
Parameters:
  resource_type: "pr_comment"
  repo_id: "<repo>"
  pr_number: <number>
  comment_id: <numeric_comment_id>
```

### 步骤 9：检查 CI 检查

```
Call MCP tool: harness_list
Parameters:
  resource_type: "pr_check"
  repo_id: "<repo>"
  pr_number: <number>
```

返回与 PR 头提交关联的每项状态检查（流水线、测试运行、外部检查）的状态。合并前使用此检查以确认必需检查为绿。

### 步骤 10：合并

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "pull_request"
  action: "merge"
  repo_id: "<repo>"
  pr_number: <number>
  body:
    method: "squash"               # merge | squash | rebase | fast-forward
    delete_source_branch: true
    dry_run: false
    source_sha: "<expected_sha>"   # optional optimistic lock
```

先设置 `dry_run: true` 以在不执行的情况下预览合并——在破坏性合并之前有用。

## 示例

### 开启 PR 并请求审查

```
/manage-pull-requests
Open a PR from feat/new-auth into main titled "Add OAuth device flow" on repo platformUI,
and add user 12345 as a reviewer.
```

### 读取 PR 上所有未解决的评论

```
/manage-pull-requests
Show me every inline code comment on PR 182 in repo harness-core so I can address them.
```

### 批准并合并

```
/manage-pull-requests
Approve PR 47 in repo mcp-server with a "LGTM" comment, then squash-merge it and delete the branch.
```

### 合并前检查 CI

```
/manage-pull-requests
List the checks on PR 99 in repo harness-cli. If they're all green, merge it with a squash.
```

### 关闭陈旧 PR

```
/manage-pull-requests
Close PR 22 in repo harness-skills with a comment explaining we're going in a different direction.
```

## 性能注意事项

- **始终同时传递 `repo_id` + `pr_number`**，除了 `harness_list(pull_request)` 只需 `repo_id`。按 PR 调用时缺少 `pr_number` 会从服务器返回一个有用的 400。
- **通过 `pr_activity` 读取评论，绝不用 `pr_comment`。** 评论端点是仅 POST 的。对所有讨论使用 `kind=comment`，仅对内联使用 `type=code-comment`。
- **在破坏性 squash/rebase 合并之前对合并使用 `dry_run: true`**——尤其是在带必需检查的 main 分支上。
- **当用户粘贴 PR 链接时优先使用 URL 快捷方式。** `url="<PR URL>"` 会自动提取 `org_id`、`project_id`、`repo_id` 和 `pr_number`——更少参数出错。
- **`pr_reviewer.submit_review`** 独立于审查者列表记录审查。你无需先调用 `harness_create(pr_reviewer)` 才能提交审查——任何有访问权限的用户都可以审查。
- **跨范围搜索**：当不知道哪个代码仓库包含 PR 时，`harness_search(query="<text>", resource_types=["pull_request"])` 可跨代码仓库查找 PR。

## 故障排查

### "repo_id is required"

所有 PR 操作都是代码仓库范围的。传递代码仓库标识符（不是代码仓库名称）——如果不确定，先用 `harness_list(resource_type="repository")` 列出代码仓库。

### 列出评论时评论不显示

`pr_comment` 没有 `list`/`get` 操作。使用 `harness_list(resource_type="pr_activity", kind="comment")` 读取讨论时间线。

### "GET /comments not found" / 读取评论时 404

与上面相同原因——Harness Code API 对 `/comments` 是仅 POST 的。通过 `pr_activity` 读取。

### 审查决定被拒绝

检查 `decision` 值——它必须精确为 `"approved"` 或 `"changereq"`。API 不接受 `"approve"`（无 `d`）或 `"request_changes"`。

### 合并失败并提示 "source SHA mismatch"

你传入了 `source_sha`，而它不再匹配分支头（有人在你计算后推送了）。去掉 `source_sha` 或重新获取 PR 以获得当前的 `source_sha`。

### 内联评论没有 diff 上下文

内联代码评论在 body 中需要同时提供 `source_commit_sha` 和 `target_commit_sha`——没有它们，评论会显示为顶级评论。从 `harness_get(pull_request)` → `source_sha` / `target_sha` 获取 SHA。

### 必需检查未通过但合并仍然成功

如果调用方有管理员权限，`harness_execute(action=merge)` 会绕过分支保护。先使用 `harness_list(resource_type="pr_check")`，若任何检查不是 `success` 则在自动化中快速失败。
