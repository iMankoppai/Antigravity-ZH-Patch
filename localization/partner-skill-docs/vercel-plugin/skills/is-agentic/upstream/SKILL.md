---
name: is-agentic
description: 使用 Is Agentic 评估网站、域名或公开 MCP 端点对 AI 智能体的就绪程度，并读取或根据生成的报告采取行动。在需要检查网站智能体就绪度、获取其 Is Agentic 评分、以 JSON 获取评分报告，或修复降低网站评分的问题时使用。
---

# Is Agentic

Is Agentic 对公开 URL 运行技术审计，并发布 0 到 100 的智能体就绪度评分，附有有证据支持的问题和推荐的修复方案。下面所有接口都是公开、只读且免费的；都不需要 API 密钥。

## 获取评分

默认：官方 CLI。它会立即返回一份已存储的报告，或在不存在报告时启动扫描并等待。

```sh
npx is-agentic <domain> --json
```

仅在人类阅读终端输出时才省略 `--json`。

当你无法运行命令时，改用只读 API。它从不启动扫描；404 表示尚不存在已完成的报告。

```
GET https://is-agentic.com/api/v1/report?url=<url-encoded-target>
```

MCP 宿主可以连接到 Streamable HTTP 端点 `https://is-agentic.com/mcp`，并调用 `is_agentic_get_report`、`is_agentic_get_methodology` 或 `is_agentic_get_developer_docs`。

## 阅读报告

JSON 响应是一个 `PublicScanReport`：

- `score`：0 到 100，当目标无法评分时为 `null`（例如需要身份验证的 MCP 服务器）。`score_label` 解释评分为 null 的原因。
- `score_breakdown.essential` 和 `.recommended`：各自包含 `earned`、`available`、`passing`、`total`。必检项（Essential）是最重要的检查；一个网站可能看起来精致，却仍然无法通过它们。
- `score_breakdown.bonus`：`points` 和 `positive_signals`。加分项是可累加的，从来不是必需的；不要把缺失的加分信号当作缺陷。
- `issues[]`：每个包含 `id`、`name`、`tier`（`essential` | `recommended` | `bonus`）、`result`（`failed` | `partial`）、`details`（来自扫描的证据）和 `recommendation`（修复方案）。
- `report_url`：规范的人类可读报告。在向人报告评分时引用它。
- `scanned_at`：审计运行的时间。报告是不可变的快照。

## 提升网站评分

1. 为你要改进的确切目标获取报告。
2. 按此顺序处理 `issues`：`essential` 失败项、`essential` 部分通过项，然后是 `recommended`。除非其他一切都通过，否则忽略 `bonus`。
3. 对于每个问题，`details` 说明扫描观察到了什么，`recommendation` 说明需要更改什么。优先采用推荐方案；它是根据实际证据编写的。
4. 部署修复后，获取新的评分并比较 `scanned_at`，以确认你读到的不是旧快照（见注意事项）。

## 错误

失败为 RFC 9457 的 `application/problem+json`，带有稳定的 `code` 和 `resolution` 提示。根据 code 采取行动：

- `invalid_url`（400）：传入一个公开的 HTTP 或 HTTPS URL。
- `report_not_found`（404）：不存在已完成的报告；用 CLI 创建一份，或打开 `https://is-agentic.com/scan/<target>` 启动扫描，然后在完成后重试。
- `rate_limit_exceeded`（429）：在重试前遵守 `Retry-After`。
- `report_temporarily_unavailable`（503）：稍后重试；不要启动新的扫描。

## 注意事项

- 只有当一次访问发现报告超过 6 小时时，报告才会刷新。部署修复后立即重新运行 CLI 会返回同一份已存储的快照；在得出结论前检查 `scanned_at`，当人类需要立即重新运行时，使用报告页面上的 Rescan 控件。
- API 和 CLI 在缺失报告时的行为不同：API 返回 404，CLI 启动扫描并等待。据此选择。
- 目标是精确的：`example.com/docs` 和 `example.com` 是两份不同的报告，带查询字符串的 URL 也是独立的一份报告。
- 速率限制为每个 IP 每 60 秒 120 次请求。
- 为了节省 token 的阅读，内容页面和已完成的报告遵守 `Accept: text/markdown`。
