---
name: audit-report
description: >-
  使用 Harness 审计跟踪数据通过 MCP v2 工具生成审计报告和合规追溯。
  跟踪账户、组织
  和项目中的用户操作、资源变更、身份验证事件和访问模式。在要求审计活动、生成合规报告、
  调查安全事件、审查用户操作、检查变更日志或生成 SOC2/GDPR/HIPAA
  审计证据时使用。触发短语：审计报告、审计跟踪、合规审计、用户活动日志、
  变更日志、访问审计、安全调查、谁改了什么、审计事件。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Audit trails and compliance evidence (SOC2, GDPR, HIPAA)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 审计报告技能

使用 Harness MCP v2 工具生成审计报告和合规追溯。

## 使用的 MCP v2 工具

- 带 `resource_type: "audit_event"` 的 `harness_list`——列出带过滤器的审计事件
- 带 `resource_type: "audit_event"` 的 `harness_describe`——发现可用的过滤器和字段

审计事件是**只读的**。你可以列出和过滤它们，但不能创建、更新或删除它们。

## 说明

### 步骤 1：发现可用过滤器

```
harness_describe(resource_type="audit_event")
```

在查询之前了解可用的过滤参数。

### 步骤 2：列出审计事件

```
harness_list(
  resource_type="audit_event",
  org_id="<org>",           # optional - scope to organization
  project_id="<project>",   # optional - scope to project
  search_term="<user or resource>",  # optional
  page=0,
  size=100
)
```

### 步骤 3：按操作类型过滤

按这些标准操作类型过滤结果：

| 操作 | 描述 |
|--------|-------------|
| `CREATE` | 资源创建 |
| `UPDATE` | 资源修改 |
| `DELETE` | 资源删除 |
| `LOGIN` | 用户身份验证 |
| `LOGOUT` | 会话终止 |
| `ACCESS` | 资源访问 |
| `EXECUTE` | 流水线执行 |

### 步骤 4：按资源类型过滤

审计事件中的常见资源类型：

| 资源类型 | 示例 |
|---------------|----------|
| `PIPELINE` | 流水线创建、更新、删除 |
| `SECRET` | 密钥访问、轮换、删除 |
| `CONNECTOR` | 连接器修改 |
| `SERVICE` | 服务定义更改 |
| `ENVIRONMENT` | 环境配置更改 |
| `USER` | 用户管理操作 |
| `ROLE` | 角色分配更改 |
| `USER_GROUP` | 组成员关系更改 |

### 步骤 5：分析并关联

- 按用户对事件分组以识别活动模式
- 按资源对事件分组以跟踪变更历史
- 关联时间戳以重建事件时间线
- 标记异常（非工作时间活动、异常访问模式、权限提升）

### 步骤 6：生成报告

使用 references/report-templates.md 中的模板格式化发现。

有关报告模板（General、User Activity、Security）和合规框架映射（SOC 2、GDPR、HIPAA），请参阅 references/report-templates.md。

## 示例

### 生成 30 天审计报告

```
/audit-report
Generate an audit report for the last 30 days
```

### 调查特定用户

```
/audit-report
What has john.doe@company.com been doing in the last 7 days?
```

### 跟踪生产变更

```
/audit-report
Show all pipeline and environment changes in the production project this month
```

### 安全调查

```
/audit-report
Show all secret access events and privilege changes from last week
```

### 合规证据

```
/audit-report
Generate SOC2 audit evidence for Q4 covering access control and change management
```

## 错误处理

| 错误 | 原因 | 解决方法 |
|-------|-------|----------|
| 未返回审计事件 | 时间范围太窄或范围错误 | 扩大时间范围；核实 org_id/project_id |
| 访问被拒绝 | 用户缺少审计查看权限 | 请求 `core_audit_view` 权限 |
| 分页不完整 | 事件多于页面大小 | 递增 `page` 参数直到获取所有页 |
| 搜索词无返回 | 用户 ID 格式不匹配 | 尝试邮箱、用户名和显示名称变体 |

## 性能注意事项

- 在生成报告之前分页遍历所有结果。不完整的数据会导致不准确的审计跟踪。
- 跨范围（account、org、project）交叉引用事件以获得完整图景。不要跳过范围层级。
- 对于合规报告，将每一项声明与真实审计数据核对。不要推断或假设日志中不存在的活动。

## 故障排查

### 未找到事件

1. 从更宽的时间范围且无过滤器开始
2. 核实 org_id 和 project_id 范围——账户级事件不需要 org/project 过滤器
3. 移除 search_term 以确认事件存在，然后重新添加过滤器

### 缺少用户活动

1. 检查用户的邮箱和用户名两种格式
2. Service account 活动可能以不同的主体名称出现
3. API 密钥使用可能不显示为人类用户

### 审计跟踪不完整

1. 分页遍历所有结果——检查返回的 `size` 是否等于请求的 `size`（可能有更多页）
2. 账户级事件与 org/project 事件分开——在正确的范围查询
3. 某些事件类型可能需要特定权限才能查看
