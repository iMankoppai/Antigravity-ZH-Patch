---
name: sentry-create-alert
description: 使用 workflow 引擎 API 创建 Sentry 告警。在被要求创建告警、设置通知、配置问题优先级告警，或构建 workflow 自动化时使用。支持 email、Slack、PagerDuty、Discord 以及其他通知操作。
license: Apache-2.0
---
# 创建 Sentry 告警

通过 Sentry 的 workflow 引擎 API 创建告警。

**注意：** 此 API 目前处于 **beta** 阶段，可能会有变更。
它属于 New Monitors and Alerts，可能无法在旧版 Alerts UI 中查看。

## 在以下情况调用本技能

- 用户要求“创建 Sentry 告警”或“设置通知”
- 用户希望在问题满足某些条件时收到邮件或通知
- 用户提到优先级告警、降级告警或 workflow 自动化
- 用户想为 Sentry 问题配置 Slack、PagerDuty 或邮件通知

## 前置条件

- shell 中可用 `curl`
- 具有 `alerts:write` 作用域的 Sentry 组织鉴权令牌（也接受 `org:admin` 或
  `org:write`）

## 阶段 1：收集配置

向用户询问任何缺失的细节：

| 细节 | 是否必填 | 示例 |
| --- | --- | --- |
| 组织 slug | 是 | `sentry`、`my-org` |
| 鉴权令牌 | 是 | `sntryu_...`（需要 `alerts:write` 作用域） |
| 区域 | 是（默认：`us`） | `us` → `us.sentry.io`，`de` → `de.sentry.io` |
| 告警名称 | 是 | `"High Priority De-escalation Alert"` |
| 触发事件 | 是 | 哪些问题事件会触发该 workflow |
| 条件 | 可选 | 在操作执行前进行过滤的条件 |
| 操作类型 | 是 | `email`、`slack` 或 `pagerduty` |
| 操作目标 | 是 | 用户邮箱、团队、频道或服务 |

## 阶段 2：查询 ID

按需使用这些 API 调用把名称解析为 ID。

```bash
API="https://{region}.sentry.io/api/0/organizations/{org}"
AUTH="Authorization: Bearer {token}"

# Find user ID by email
curl -s "$API/members/" -H "$AUTH" | python3 -c "
import json,sys
for m in json.load(sys.stdin):
  if m.get('email')=='USER_EMAIL' or m.get('user',{}).get('email')=='USER_EMAIL':
    print(m['user']['id']); break"

# List teams
curl -s "$API/teams/" -H "$AUTH" | python3 -c "
import json,sys
for t in json.load(sys.stdin):
  print(t['id'], t['slug'])"

# List integrations (for Slack/PagerDuty)
curl -s "$API/integrations/" -H "$AUTH" | python3 -c "
import json,sys
for i in json.load(sys.stdin):
  print(i['id'], i['provider']['key'], i['name'])"
```

## 阶段 3：构建载荷

### 触发事件

选择哪些问题事件会触发该 workflow。
使用 `logicType: "any-short"`（触发器必须始终使用此项）。

| 类型 | 触发时机 |
| --- | --- |
| `first_seen_event` | 新问题被创建 |
| `regression_event` | 已解决的问题重现 |
| `reappeared_event` | 已归档的问题重新出现 |
| `issue_resolved_trigger` | 问题被解决 |

### 过滤条件

在操作执行前必须通过的条件。
使用 `logicType: "all"`、`"any-short"` 或 `"none"`。

**`comparison` 字段是多态的** —— 其形状取决于条件 `type`：

| 类型 | `comparison` 格式 | 说明 |
| --- | --- | --- |
| `issue_priority_greater_or_equal` | `75`（裸整数） | 优先级 >= Low(25)/Medium(50)/High(75) |
| `issue_priority_deescalating` | `true`（裸布尔） | 优先级降到峰值以下 |
| `event_frequency_count` | `{"value": 100, "interval": "1hr"}` | 时间窗口内的事件数 |
| `event_unique_user_frequency_count` | `{"value": 50, "interval": "1hr"}` | 时间窗口内受影响的用户数 |
| `tagged_event` | `{"key": "level", "match": "eq", "value": "error"}` | 事件标签匹配 |
| `assigned_to` | `{"targetType": "Member", "targetIdentifier": 123}` | 问题已分配给目标 |
| `level` | `{"level": 40, "match": "gte"}` | 事件级别（fatal=50、error=40、warning=30） |
| `age_comparison` | `{"time": "hour", "value": 24, "comparisonType": "older"}` | 问题存续时长 |
| `issue_category` | `{"value": 1}` | 类别（1=Error、6=Feedback、10=Outage: uptime 与 cron） |
| `issue_occurrences` | `{"value": 100}` | 总发生次数 |

**间隔选项：** `"1min"`、`"5min"`、`"15min"`、`"1hr"`、`"1d"`、`"1w"`、`"30d"`

**标签匹配类型：** `"co"`（包含）、`"nc"`（不包含）、`"eq"`、`"ne"`、`"sw"`
（开头是）、`"ew"`（结尾是）、`"is"`（已设置）、`"ns"`（未设置）

将 `conditionResult` 设为 `false` 以取反（当条件不满足时触发）。

### 操作

| 类型 | 关键配置 |
| --- | --- |
| `email` | `config.targetType`：`"user"` / `"team"` / `"issue_owners"`，`config.targetIdentifier`：`<id>` |
| `slack` | `integrationId`：`<id>`，`config.targetDisplay`：`"#channel-name"` |
| `pagerduty` | `integrationId`：`<id>`，`config.targetDisplay`：`<service_name>`，`data.priority`：`"critical"` |
| `discord` | `integrationId`：`<id>`，`data.tags`：标签列表 |
| `msteams` | `integrationId`：`<id>`，`config.targetDisplay`：`<channel>` |
| `opsgenie` | `integrationId`：`<id>`，`data.priority`：`"P1"`-`"P5"` |
| `jira` | `integrationId`：`<id>`，`data`：项目/问题配置 |
| `github` | `integrationId`：`<id>`，`data`：代码仓库/问题配置 |

### 完整载荷结构

```json
{
  "name": "<Alert Name>",
  "enabled": true,
  "environment": null,
  "config": { "frequency": 30 },
  "triggers": {
    "logicType": "any-short",
    "conditions": [
      { "type": "first_seen_event", "comparison": true, "conditionResult": true }
    ],
    "actions": []
  },
  "actionFilters": [{
    "logicType": "all",
    "conditions": [
      { "type": "issue_priority_greater_or_equal", "comparison": 75, "conditionResult": true },
      { "type": "event_frequency_count", "comparison": {"value": 50, "interval": "1hr"}, "conditionResult": true }
    ],
    "actions": [{
      "type": "email",
      "integrationId": null,
      "data": {},
      "config": {
        "targetType": "user",
        "targetIdentifier": "<user_id>",
        "targetDisplay": null
      },
      "status": "active"
    }]
  }]
}
```

`frequency`：重复通知之间的分钟数。
允许值：`0`、`5`、`10`、`30`、`60`、`180`、`720`、`1440`。

**结构说明：** `triggers.actions` 始终为 `[]` —— 操作位于
`actionFilters[].actions` 内。

## 阶段 4：创建告警

```bash
curl -s -w "\n%{http_code}" -X POST \
  "https://{region}.sentry.io/api/0/organizations/{org}/workflows/" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{payload}'
```

预期 HTTP `201`。响应包含 workflow `id`。

## 阶段 5：验证

确认告警已创建并提供 UI 链接：

```
https://{org_slug}.sentry.io/monitors/alerts/{workflow_id}/
```

如果组织缺少 `workflow-engine-ui` 功能标志，告警会出现在：

```
https://{org_slug}.sentry.io/alerts/rules/
```

## 管理告警

```bash
# List all workflows
curl -s "$API/workflows/" -H "$AUTH"

# Get one workflow
curl -s "$API/workflows/{id}/" -H "$AUTH"

# Update a workflow
curl -s -X PUT "$API/workflows/{id}/" -H "$AUTH" -H "Content-Type: application/json" -d '{payload}'

# Delete a workflow
curl -s -X DELETE "$API/workflows/{id}/" -H "$AUTH"
# Expect 204
```

## 故障排查

| 问题 | 解决方案 |
| --- | --- |
| 401 Unauthorized | 令牌需要 `alerts:write` 作用域 |
| 403 Forbidden | 令牌必须属于目标组织 |
| 404 Not Found | 检查组织 slug 与区域（`us` 与 `de`） |
| 400 Bad Request | 校验载荷 JSON 结构，检查必填字段 |
| 找不到用户 ID | 确认邮箱与该组织中的成员匹配 |
