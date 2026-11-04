---
name: manage-freeze-windows
description: >-
  通过 MCP 管理 Harness 部署冻结窗口。创建、列出、获取、更新和删除项目级
  冻结窗口；将它们切换为 Enabled/Disabled；并获取或启用/禁用项目级全局
  冻结。在询问冻结窗口、部署冻结、变更冻结、发布封锁、
  维护窗口、假期冻结，或要暂停部署时使用。触发短语：冻结窗口、
  部署冻结、变更冻结、发布封锁、维护窗口、假期冻结、暂停
  部署、阻止流水线执行、全局冻结。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Create, toggle, and manage deployment freeze windows and the project-level global freeze
license: Apache-2.0
compatibility: Requires Harness MCP server (harness-mcp-v2)
---

# 管理冻结窗口

通过 MCP 创建和切换 Harness 部署冻结窗口。冻结窗口在时间窗口内阻止流水线执行，以便你为发布、假期或维护执行变更冻结。

## 使用的 MCP 工具

| 工具 | 资源类型 | 用途 |
|------|---------------|---------|
| `harness_list` | `freeze_window` | 列出项目冻结窗口，按状态/时间/关键词过滤 |
| `harness_get` | `freeze_window` | 按标识符获取单个冻结窗口 |
| `harness_create` | `freeze_window` | 从 YAML 创建冻结窗口 |
| `harness_update` | `freeze_window` | 替换现有冻结窗口的 YAML 定义 |
| `harness_delete` | `freeze_window` | 删除冻结窗口 |
| `harness_execute`（action: `toggle_status`） | `freeze_window` | 批量启用/禁用一个或多个冻结窗口 |
| `harness_get` | `global_freeze` | 获取当前项目级全局冻结状态 |
| `harness_execute`（action: `manage`） | `global_freeze` | 从 YAML 启用或禁用项目全局冻结 |
| `harness_schema` | `freeze_window` | `create` / `update` body 的确切 JSON Schema |

两个资源都是**项目范围**——每次调用都需要 `org_id` 和 `project_id`。

## 冻结窗口 YAML

创建/更新 body 接收**原始冻结 YAML 字符串**，作为 `body: { yaml: "<yaml string>" }` 传递。MCP 服务器以 `Content-Type: application/yaml` 将其转发给 Harness API。

```yaml
freeze:
  name: Q4 Release Freeze
  identifier: q4_release_freeze
  entityConfigs:
    - name: All Services
      entities:
        - type: Service
          filterType: All
        - type: Environment
          filterType: All
        - type: EnvType
          filterType: All
        - type: Org
          filterType: All
        - type: Project
          filterType: All
  status: Enabled                     # Enabled | Disabled
  description: "Change freeze for Q4 GA release"
  windows:
    - timeZone: America/Los_Angeles
      startTime: 2026-12-20 00:00 AM
      duration: 14d                   # e.g. 2h, 3d, 14d, 4w
      recurrence:
        type: Yearly                  # Daily | Weekly | Monthly | Yearly (optional)
  notificationRules: []
```

如果你想要权威字段列表，使用 `harness_schema(resource_type="freeze_window")`。关键规则：
- `identifier` 匹配 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`。
- `entityConfigs` 必需，且必须匹配至少一个部署范围。
- `windows[].duration` 接受 `h`、`d`、`w` 后缀（不含秒）。
- `windows[].startTime` 格式：给定 `timeZone` 中的 `YYYY-MM-DD HH:mm AM|PM`。

## 说明

### 步骤 1：列出现有冻结窗口

```
Call MCP tool: harness_list
Parameters:
  resource_type: "freeze_window"
  org_id: "<organization>"
  project_id: "<project>"
  freeze_status: "Enabled"     # optional: Enabled | Disabled
  search_term: "release"       # optional: keyword filter
  start_time: 1735689600000    # optional: epoch ms lower bound
  end_time: 1738368000000      # optional: epoch ms upper bound
```

### 步骤 2：按标识符获取冻结窗口

```
Call MCP tool: harness_get
Parameters:
  resource_type: "freeze_window"
  resource_id: "<freeze_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 3：创建冻结窗口

```
Call MCP tool: harness_create
Parameters:
  resource_type: "freeze_window"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    yaml: |
      freeze:
        name: Holiday Freeze
        identifier: holiday_freeze
        entityConfigs:
          - name: All Services
            entities:
              - type: Service
                filterType: All
              - type: Environment
                filterType: All
              - type: EnvType
                filterType: All
        status: Enabled
        windows:
          - timeZone: America/Los_Angeles
            startTime: 2026-12-22 06:00 PM
            duration: 10d
```

### 步骤 4：更新冻结窗口

`harness_update` 执行 YAML 的**全量替换**——包含你想保留的每个字段。

```
Call MCP tool: harness_update
Parameters:
  resource_type: "freeze_window"
  resource_id: "<freeze_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    yaml: "<full updated freeze YAML>"
```

### 步骤 5：切换一个或多个冻结窗口的状态

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "freeze_window"
  action: "toggle_status"
  org_id: "<organization>"
  project_id: "<project>"
  status: "Enabled"                    # Enabled | Disabled
  body:
    freeze_ids: ["holiday_freeze", "q4_release_freeze"]
```

传递标识符数组——切换可批量执行。当你只需翻转启用/禁用时，用它代替编辑 YAML。

### 步骤 6：删除冻结窗口

```
Call MCP tool: harness_delete
Parameters:
  resource_type: "freeze_window"
  resource_id: "<freeze_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 7：读取项目全局冻结

```
Call MCP tool: harness_get
Parameters:
  resource_type: "global_freeze"
  org_id: "<organization>"
  project_id: "<project>"
```

返回 `{ status: "Enabled" | "Disabled", ... }`。全局冻结是**单例**——每个项目范围恰好有一个，不需要 `resource_id`。

### 步骤 8：启用或禁用全局冻结

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "global_freeze"
  action: "manage"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    yaml: |
      freeze:
        name: Project Global Freeze
        identifier: _global_
        status: Enabled              # Enabled | Disabled
        entityConfigs:
          - name: All
            entities:
              - type: Service
                filterType: All
              - type: Environment
                filterType: All
              - type: EnvType
                filterType: All
        windows:
          - timeZone: UTC
            startTime: 2026-12-22 00:00 AM
            duration: 14d
```

当 `status: Enabled` 时全局冻结立即生效——项目范围的流水线将开始被阻止。

## 示例

### 创建两周假期冻结

```
/manage-freeze-windows
Create a holiday freeze window called "Winter 2026 Shutdown" in org default, project payments,
covering all services and environments, from 2026-12-22 6pm PT for 14 days.
```

### 检查当前什么在阻止部署

```
/manage-freeze-windows
List every Enabled freeze window in project "payments" and also show me whether the project global
freeze is on.
```

### 为热修复批量禁用所有冻结

```
/manage-freeze-windows
Disable all Enabled freeze windows in project "payments" temporarily so I can ship a hotfix.
```

### 打开项目全局冻结

```
/manage-freeze-windows
Enable the global freeze for project "payments" right now with a 4-hour duration in UTC —
we're running incident response.
```

### 审计某次发布的计划冻结

```
/manage-freeze-windows
Show me every freeze window in project "release-ops" whose start_time is in the next 30 days.
```

## 性能注意事项

- **使用 `harness_schema(resource_type="freeze_window")`** 在起草新 YAML 之前获取权威 body schema——字段名称区分大小写，且若干字段（`entityConfigs`、`windows`、`notificationRules`）是必需的。
- **当你只想翻转启用/禁用时，优先使用 `toggle_status` 而非 `update`**——它避免重新发送完整 YAML，并可批量执行。
- **冻结窗口是项目范围**——项目 A 的窗口不影响项目 B。要冻结整个组织，在每个项目创建冻结窗口（或为每个项目使用 `global_freeze`）。
- **`global_freeze` 是每个项目的单例**——没有 list/create/delete。`harness_get` 读取它，`harness_execute(action="manage")` 通过 YAML 将其开或关。
- **时区很重要**——`timeZone` 是 IANA 名称（例如 `America/Los_Angeles`、`Europe/Berlin`），不是偏移量。服务器在该时区解释 `startTime`。
- **重叠窗口会叠加**——Harness 评估每个 Enabled 冻结窗口；如果任一匹配，部署就被阻止。如果你以后可能重新启用，请禁用而非删除。

## 故障排查

### `body must include yaml (freeze YAML string with 'freeze:' root)`

你将 body 作为纯 YAML 字符串或 JSON 对象传递了——`bodyBuilder` 期望外层形状 `body: { yaml: "<yaml string>" }`。将你的 YAML 字符串包裹在 `yaml` 键中。

### 创建时 `INVALID_REQUEST`

- 检查 `entityConfigs` 存在且非空。`entityConfigs[].entities` 必须至少包含 `Service` 和 `Environment`（或 `EnvType`）过滤器。
- 核实 `identifier` 匹配 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`——标识符中不允许连字符和点。
- `duration` 值使用后缀（`2h`、`3d`、`14d`、`4w`）——不带后缀的原始数字会被拒绝。

### `DUPLICATE_IDENTIFIER`

同一项目范围已存在该标识符的冻结窗口。要么 `harness_update` 现有窗口，要么选择新标识符。

### 切换失败，提示 "body must include freeze_ids"

`toggle_status` 期望 `body.freeze_ids` 为字符串数组，即使单个窗口也是如此。传递 `body: { freeze_ids: ["my_freeze"] }`，而非 `body: "my_freeze"` 或 `resource_id: "my_freeze"`。

### 在 Enabled 冻结期间部署仍在运行

- 确认冻结 `status` 为 `Enabled` 而非 `Disabled`——`harness_get` 会显示当前状态。
- 检查 `windows[].startTime` 和 `duration`——如果当前时间在窗口之外，冻结已计划但未激活。
- 核实 `entityConfigs` 实际覆盖你正在部署的服务/环境——带有 `Service: filterType: NotEquals / entityRefs: [payments]` 的冻结不会阻止 `payments`。
- 全局项目冻结和具名冻结窗口是独立的——如果只有其中一个是匹配的，任一为 `Disabled` 就足以让部署通过。

### 无法删除冻结窗口

在某些账户层级，活动（当前正在触发）的冻结窗口无法删除——先通过 `toggle_status` 将它们 `Disabled` 然后 `harness_delete`。
