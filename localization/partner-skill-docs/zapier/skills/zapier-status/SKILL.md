---
name: zapier-status
description: 检查你的 Zapier MCP 配置健康状况。三种模式——健康检查（仪表盘视图）、审计（找出浪费和重复项）、诊断（系统性排查）。在询问“我的 MCP 工作正常吗？”、“检查我的工具”、“审计我的配置”、“哪里坏了？”或“zapier status”时使用。
---

# Zapier 状态

用于监控和维护 Zapier MCP 配置的三种模式。根据上下文确定模式，不清楚就询问。

关于 Zapier MCP 服务器本身如何工作，参见 [docs.zapier.com/mcp](https://docs.zapier.com/mcp/home)。

## 模式 1：健康检查

**触发：** “检查我的工具”、“zapier status”、“一切正常吗？”，或任何一般性的状态询问。

对当前状态的快速仪表盘视图。

### 步骤

1. 检查可用的 Zapier MCP 工具。确切的范围取决于服务器的配置——有些服务器暴露报告动作清单的元工具，另一些则把每个配置的动作暴露为各自命名的工具。使用任何可用的信号。

2. 如果没有可用的 Zapier 工具：报告连接状态并建议运行 **zapier-onboard**。

3. 如果工具可用，按应用分组构建一份摘要：

**对每个应用**，展示：

- 应用名称
- 动作数量
- 动作类型（从名称推断读取 vs 写入：find/search/get/list = 读取，send/create/update/add = 写入）
- 快速状态：正常 / 需要认证 / 错误

**格式化为仪表盘：**

```
Zapier MCP status
=================
Server: connected
Total actions: 14 across 5 apps

Slack         3 actions (2 read, 1 write)     ✓ working
Gmail         3 actions (1 read, 2 write)     ✓ working
Google Cal    2 actions (1 read, 1 write)     ✓ working
Jira          3 actions (2 read, 1 write)     ✓ working
Google Docs   2 actions (1 read, 1 write)     ✓ working
```

4. 如果有任何动作看起来坏了（根据最近的错误或认证问题），标出它们。

5. 以这句话结尾：“一切看起来都很好。” 或“发现了 [N] 个问题。想让我诊断它们吗？”

## 模式 2：审计

**触发：** “审计我的配置”、“清理我的工具”、“找出重复项”、“我应该删掉什么？”

找出低效之处：重复的动作、未使用的工具、与原生 MCP 服务器的冲突。

### 步骤

1. 通过检查可用的 Zapier MCP 工具获取完整清单。

2. **检查 Zapier MCP 内部的重复项：**
   - 同一应用有多个做类似事情的动作（例如，同时存在一个 “find message” 和一个 “search messages” 的 Slack 动作）
   - 建议删除用处较小的那个

3. **检查与原生 MCP 服务器的冲突：**
   - 查看客户端 MCP 配置文件中配置的其他 MCP 服务器（例如 `.cursor/mcp.json`、`claude_desktop_config.json`、`.mcp.json`——取决于客户端）
   - 如果用户既有原生 Slack MCP 又有 Zapier Slack 动作，标出来
   - 建议：“你通过 Zapier 和原生 Slack 服务器都接入了 Slack。原生服务器通常更适合单应用使用。考虑删除 Zapier 的 Slack 动作。”

4. **检查未使用或低价值的动作：**
   - 作为默认值很少有用的动作（例如，只在偶尔才需要的非常具体的写入动作）
   - 建议删除那些可以按需重新添加的动作

5. **展示审计报告：**

```
Audit results
=============
Duplicates:       1 found
  - Slack: "find_message" and "search_messages" overlap. Recommend removing "search_messages".

Native conflicts:  1 found
  - Slack: native Slack MCP also configured. Consider removing Zapier Slack actions.

Cleanup candidates: 2 found
  - Google Sheets "delete_row": rarely needed, can re-add on demand
  - Jira "add_attachment": niche action, add when needed

Recommended removals: 4 actions
Want me to show you how to clean these up?
```

6. 如果用户说可以，引导他们前往 [mcp.zapier.com](https://mcp.zapier.com) 删除推荐的动作（或使用服务器可用的对话内禁用工具）。准确列出要删除哪些。

## 模式 3：诊断

**触发：** “哪里坏了？”、“我的工具不工作”、“调试我的 MCP”，或当某个具体工具调用失败时。

带错误模式匹配的系统性排查。

### 步骤

1. **收集上下文：** 询问出了什么问题，或使用当前对话中的错误。

2. **按顺序运行诊断：**

   a. **连接检查：** 尝试调用任何可用的 Zapier 工具。如果什么都不行，问题是服务器级的（认证、配置、网络）。

   b. **动作检查：** 该服务器上是否提供这个具体动作？如果没有，用户需要在 mcp.zapier.com 添加它（或通过服务器可用的对话内发现工具添加）。

   c. **认证检查：** 尝试为受影响的应用调用一个读取动作。如果返回认证错误，该应用连接需要重新认证。

   d. **参数检查：** 检查失败调用的参数。常见问题：
   - 缺少必填字段
   - 字段格式错误（ID vs 名称）
   - 指令对参数解析器来说太模糊

3. **匹配已知错误模式：**

| 症状                                    | 可能原因                        | 修复                                                           |
| ------------------------------------------ | ----------------------------------- | ------------------------------------------------------------- |
| 所有工具都失败                             | 服务器认证过期                 | 在 mcp.zapier.com 重新认证                             |
| 一个应用失败，其他正常                 | 应用级认证过期              | 重新连接那个具体应用                                  |
| 找不到/不可用工具               | 动作未配置               | 引导用户到 mcp.zapier.com 添加它                       |
| “invalid params”                           | 字段或格式错误              | 检查该工具的参数 schema                             |
| 结果为空但预期数据存在 | 搜索太窄或字段错误    | 扩大搜索范围或检查字段名                       |
| 执行超时                         | 服务器过载或动作很慢 | 重试一次，若持续出现则报告                         |
| “rate limit exceeded”                      | 调用太多                      | 分散请求，等待 30 秒                           |
| 在一个项目中可用，在另一个中失败     | 项目级 vs 全局配置      | 检查该客户端的项目级和全局 MCP 配置 |

4. **报告发现：**

“这是我发现的情况：

- **连接**：正常（服务器有响应）
- **动作**：5 个应用共有 14 个工具可用
- **认证问题**：Gmail 连接已过期。你需要在 mcp.zapier.com 重新认证 Gmail。
- **建议**：[直接链接或具体说明]”

5. 如果修复需要用户操作（重新认证、更改配置），提供具体的链接或说明。如果是 AI 能修复的（调整参数、尝试不同的工具），主动提出去做。

## 通用说明

- 在任何模式下，始终先检查可用的 Zapier MCP 工具作为第一个诊断步骤。
- 不要倾倒原始错误消息。把它们转换成平实的语言。
- 如果问题超出该技能能诊断的范围（服务器端 bug、API 故障），说明这一点，并建议查看 [status.zapier.com](https://status.zapier.com) 或联系支持。
