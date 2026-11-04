---
name: dt-obs-frontends
description: Dynatrace 上的真实用户监控（RUM）—— Web 和移动前端。Core Web Vitals、用户会话、页面性能、移动崩溃、前端错误，以及前后端关联。通过 `user.events`、`user.sessions` 和 `dt.frontend.*` 指标查询。不涵盖合成监控（HTTP/浏览器/网络检查）—— 那是另一个领域。
license: Apache-2.0
---

# 前端可观测性（RUM）

使用真实用户监控，通过 DQL 监控 Web 和移动前端。
面向**最新 Dynatrace 上的 RUM** —— 不要使用 RUM Classic 数据。

**概念和数据模型：** https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/concepts

## 数据模型

三个数据源，各用于不同的问题：

| 来源 | 用于 | 粒度 |
|--------|---------|-------------|
| `timeseries dt.frontend.*` | 趋势、仪表板、告警 | 聚合指标 |
| `fetch user.events` | 根因、单个页面浏览 / 请求 / 点击 / 错误 | 按事件 |
| `fetch user.sessions` | 跳出率、会话时长、会话级聚合 | 按会话 |

**经验法则**：从指标开始了解问题的整体轮廓，再深入事件了解原因。当问题关于用户旅程而非单个交互时，使用会话。

完整事件模型：https://docs.dynatrace.com/docs/semantic-dictionary/model/rum/user-events

**DQL 语言参考（函数、语法、运算符）：** https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language

**关键 `dt.frontend.*` 指标**（全部支持维度：`frontend.name`、`device.type`、`geo.country.iso_code`、`browser.name`、`os.name`、`dt.rum.user_type`、`dt.smartscape.frontend`）：

- `dt.frontend.web.page.largest_contentful_paint` / `dt.frontend.web.page.interaction_to_next_paint` / `dt.frontend.web.page.cumulative_layout_shift` / `dt.frontend.web.page.first_input_delay` —— Core Web Vitals
- `dt.frontend.web.navigation.time_to_first_byte` / `dt.frontend.web.navigation.dom_interactive` / `dt.frontend.web.navigation.load_event_end` —— 导航计时
- `dt.frontend.error.count` —— 错误计数
- `dt.frontend.request.count` / `dt.frontend.request.duration` —— 请求量和延迟
- `dt.frontend.user_action.count` / `dt.frontend.user_action.duration` —— 用户操作量和时长
- `dt.frontend.session.active.estimated_count` / `dt.frontend.user.active.estimated_count` —— 活跃会话和用户（基数指标；使用 `countDistinct()` 聚合）

## 常见过滤器

**所有来源（`user.events` + `user.sessions`）：**
- `frontend.name` —— 前端标识符（所有过滤的首选）；在 `user.sessions` 上是数组（一个会话可跨多个前端）。`dt.smartscape.frontend` 是 Smartscape 实体引用 —— 用它访问实体属性（如标签或关联服务），而不是用于基于名称的过滤。避免先查询 Smartscape 将名称解析为实体 ID 再与 `user.events` 连接 —— 始终直接按 `frontend.name` 过滤。
- `dt.rum.user_type` —— `real_user`、`synthetic`、`robot`
- `dt.rum.application.type` —— `web` 或 `mobile`
- `dt.rum.session.id`、`dt.rum.instance.id`
- `os.name`、`geo.country.iso_code`、`client.isp`
- `client.ip` —— 客户端 IP 地址 *（敏感字段 —— 默认隐藏；参见下面的字段权限）*

**`user.events` —— 仅 Web：**
- `browser.name`、`browser.version`、`device.type`

**`user.events` —— 仅移动端：**
- `device.model.identifier`、`device.manufacturer`、`app.short_version`

**常见特征过滤器**（将 `user.events` 限定到特定事件类型 —— 用作 `| filter characteristics.has_X`）：
- `characteristics.has_page_summary` —— 页面加载（Web）
- `characteristics.has_view_summary` —— 视图（SPA + 移动屏幕）
- `characteristics.has_navigation` —— 导航事件
- `characteristics.has_user_action` —— 用户操作
- `characteristics.has_error` —— 所有错误

完整特征参考：[references/characteristics.md](references/characteristics.md)

## 字段权限

某些字段是**敏感**的，属于 `builtin-sensitive-user-events-and-sessions` 字段集。它们在 `user.events` 和 `user.sessions` 上都**默认隐藏** —— 无访问权限的用户会看到 `null`，且按这些字段过滤或分组的查询会静默返回无结果。

此技能中使用的敏感字段：

- `client.ip` —— 客户端 IP 地址
- `user.identifier` —— 真实用户身份

通过以下策略声明授予访问权限：

```
ALLOW storage:fieldsets:read WHERE storage:fieldset-name="builtin-sensitive-user-events-and-sessions"
```

参考：[字段权限](https://docs.dynatrace.com/docs/shortlink/rum-on-grail-permissions#field-permissions)

## 下钻模式

无论具体的问题领域（错误、性能、后台活动等）如何，大多数调查都遵循这种分层方法：

**1. 识别前端**

先按 `by: {frontend.name}` 分组，找出受影响的应用。如果需要预先将 Web 与移动分析分开，请按 `dt.rum.application.type`（`web` 或 `mobile`）过滤。

**2. 找到受影响的页面或视图**

两个字段在所有事件上都可用（不限于特定特征）：

- `page.name` —— 规范化为 Dynatrace 实体名称的页面 URL；**仅 Web**
- `view.name` —— SPA 路由或移动屏幕名称；在 **Web 和移动端**都可用

两者可以同时出现在同一事件上。对于 Web SPA，`page.name` 反映顶层文档，而 `view.name` 反映当前路由 —— 按 `view.name` 分组可获得更细的粒度。对于移动端，仅使用 `view.name`。

**额外的收窄维度**

| 维度 | 字段 | 平台 | 何时使用 |
|-----------|-------|----------|-------------|
| 特定请求 / 端点 | `url.domain`、`url.path` | Web + 移动 | 特定 API 调用上的性能或错误模式 |
| 单个用户会话 | `dt.rum.session.id` | Web + 移动 | 复现特定用户的旅程；连接到会话回放 |
| 设备形态 | `device.type` | 仅 Web | 桌面 vs 移动浏览器 vs 平板模式 |
| 浏览器兼容性 | `browser.name`、`browser.version` | 仅 Web | 仅在特定浏览器上的问题 |
| 应用版本 | `app.short_version` | 仅移动 | 特定应用版本引入的回归 |
| 地理位置 | `geo.country.iso_code` | Web + 移动 | 区域性基础设施或 CDN 问题 |
| 合成 vs 真实流量 | `dt.rum.user_type` | Web + 移动 | 在面向用户的分析之前排除合成监控 |

## 工作流

每个工作流映射到一个或多个参考。在开始工作流时加载参考，而不是预先加载。

| 工作流 | 参考 |
|----------|-----------|
| 事件特征 —— 类型、过滤器、event_type 推导 | [references/characteristics.md](references/characteristics.md) |
| Web Vitals（LCP、FCP、FID、INP、CLS） | [references/web-vitals.md](references/web-vitals.md) |
| 会话、跳出、参与度分析 | [references/user-sessions.md](references/user-sessions.md) |
| 用户操作 —— 交互生命周期、完成原因、超时 | [references/user-actions.md](references/user-actions.md) |
| 错误、异常、失败请求 | [references/error-tracking.md](references/error-tracking.md) |
| 前后端关联 —— 机制、追踪覆盖、`frontend.link` | [references/frontend-backend-linking.md](references/frontend-backend-linking.md) |
| CSP 违规 —— 安全策略执行和阻止的资源 | [references/csp-violations.md](references/csp-violations.md) |
| 移动应用启动、崩溃、ANR、原生信号 | [references/mobile-monitoring.md](references/mobile-monitoring.md) |
| 请求延迟、长任务、JS 性能分析、地理性能 | [references/web-performance-analysis.md](references/web-performance-analysis.md) |
| 可见性变化 —— 标签切换、后台时间、参与度质量 | [references/visibility-changes.md](references/visibility-changes.md) |
| 慢页面加载 —— 后端 vs 渲染 vs 网络 vs JS 分诊 | [references/slow-page-load-playbook.md](references/slow-page-load-playbook.md) |
| 诊断零结果、异常、模糊数据 | [references/troubleshooting.md](references/troubleshooting.md) |

## 性能阈值（快速参考）

- **LCP**：良好 < 2.5 s | 差 > 4.0 s
- **INP**：良好 < 200 ms | 差 > 500 ms
- **CLS**：良好 < 0.1 | 差 > 0.25
- **FCP**：良好 < 1.8 s | 差 > 3.0 s
- **TTFB**：良好 < 800 ms | 差 > 1800 ms
- **移动冷启动**：良好 < 3 s | 差 > 5 s
- **移动温启动**：良好 < 1.5 s | 差 > 2 s
- **移动热启动**：良好 < 500 ms | 差 > 1 s
- **长任务**：> 50 ms 有问题，> 250 ms 严重

*Web vitals 阈值（LCP、INP、CLS、FCP、TTFB）：https://web.dev/articles/vitals*

## 何时使用

对于真实用户的 Web 和移动前端遥测 —— Core Web Vitals、会话、点击、错误、崩溃、来自浏览器/应用的请求延迟，以及前后端关联 —— 使用此技能。

对于以下内容，使用不同的技能：

- 合成监控 / 可用性检查 → `dt-obs-synthetic`
- 后端服务、追踪、跨度 → `dt-obs-services`、`dt-obs-tracing`
- 基础设施、主机 → `dt-obs-hosts`
- 日志 → `dt-obs-logs`
- 问题和事件 → `dt-obs-problems`
