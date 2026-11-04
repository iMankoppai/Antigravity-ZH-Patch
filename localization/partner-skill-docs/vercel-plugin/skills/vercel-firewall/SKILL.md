---
name: vercel-firewall
description: Vercel Firewall 专家指南——自动 DDoS 缓解、Vercel WAF（自定义规则、IP 封禁、托管规则集、速率限制）、Attack Mode、system bypass、机器人管理以及 `vercel firewall` CLI。在配置平台级安全、响应攻击或暂存防火墙规则时使用。
metadata:
  priority: 7
  docs:
    - 'https://vercel.com/docs/vercel-firewall'
    - 'https://vercel.com/docs/cli/firewall'
  bashPatterns:
    - '\bvercel\s+firewall\b'
  promptSignals:
    phrases:
      - 'vercel firewall'
      - 'vercel waf'
      - 'attack mode'
      - 'ddos protection'
      - 'ip block'
      - 'managed ruleset'
      - 'bot protection'
      - 'system bypass'
      - 'rate limit rule'
    allOf:
      - [firewall, vercel]
      - [waf, vercel]
      - [ddos, vercel]
      - [challenge, vercel]
      - ['rate limit', vercel]
      - ['system bypass', vercel]
      - ['ip block', vercel]
    noneOf: []
    minScore: 6
retrieval:
  aliases:
    - ddos protection
    - waf rules
    - bot protection
    - rate limiting
    - attack mode
    - ip allowlist
    - traffic filtering
    - verified bots
  intents:
    - protect from ddos
    - block malicious traffic
    - configure firewall
    - rate limit api
    - allow bot through firewall
    - enable attack mode
    - publish firewall rule
  entities:
    - Vercel Firewall
    - Vercel WAF
    - DDoS
    - Attack Mode
    - Bot Protection
    - Managed Rulesets
    - System Bypass
    - JA3
    - JA4
---

# Vercel Firewall

你是 Vercel Firewall 专家，包括 `vercel firewall` CLI、Vercel WAF 和平台级保护（自定义规则、IP 封禁、system bypass、Attack Mode、系统缓解）。你遵循下面列出的所有[最佳实践](#best-practices)。

## 核心知识

- **Vercel 提供多层防火墙**，而不仅仅是 CDN。平台级 Firewall 提供 DDoS 保护，对所有客户免费。客户还可以配置带有 IP 封禁和自定义规则的 Web 应用防火墙。Vercel 还提供托管规则集，例如 Bot Protection 和 AI Bots。
- **每个计划的每个项目都开启自动 DDoS 缓解，包括 Hobby**，无需任何配置。它覆盖 L3/L4/L7 攻击。
- **Vercel 不对被 DDoS 缓解或 WAF 拦截的流量计费。** 仅为在缓解生效之前已服务或未被归类为攻击的请求产生用量。你不会为 WAF 自定义规则或托管规则的拒绝、挑战或限速所产生的请求或带宽付费。
- **自定义规则**允许用户定义自己的 Firewall 规则。包括动作 `deny`、`challenge`、`log`、`bypass`、`rate_limit`、`redirect`，并匹配 `host`、`path`、`query`、`protocol`、`scheme`、`method`、`route`、`ip_address`、`header`、`cookie`、`user_agent`、`environment`、`region`、`geo_continent`、`geo_country`、`geo_city` 和 `ja4_digest` 等字段。完整信息见 https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration。

## 概览

项目必须先关联（`vercel link`）。

```bash
vercel firewall overview                  # active rules, blocks, bypasses, attack-mode, drafts
vercel firewall overview --json
vercel firewall diff                      # show unpublished draft changes
vercel firewall diff --json
```

`rules` 和 `ip-blocks` 更改会作为草稿**暂存**——运行 `vercel firewall publish --yes` 使其生效。`system-bypass`、`attack-mode` 和 `system-mitigations` **立即**生效。

## 自定义规则

[自定义规则](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)基于请求属性定义流量策略。拦截滥用、对 API 限速、挑战可疑请求、重定向旧路径或记录流量。规则也可以通过 `vercel.json` 中的 `routes` 属性以 `mitigate` 动作声明式定义，但这种方式仅支持 `challenge` 和 `deny`——对于 `log`、`bypass`、`rate_limit` 或 `redirect`，使用 CLI 或仪表板。

### 查看

```bash
vercel firewall rules list                          # table of all rules
vercel firewall rules list --expand                 # show conditions + actions
vercel firewall rules list --json
vercel firewall rules inspect "My Rule"             # full detail of one rule
vercel firewall rules inspect "My Rule" --json
```

### 创建 — 四种模式

```bash
# AI — TTY only, BLOCKED FOR AGENTS/SCRIPTS
vercel firewall rules add --ai "Rate limit /api to 100 requests per minute by IP"

# Interactive wizard — TTY only, BLOCKED FOR AGENTS/SCRIPTS
vercel firewall rules add

# Flags — works in scripts and agents
vercel firewall rules add "Block crawlers" \
  --condition '{"type":"user_agent","op":"sub","value":"crawler"}' \
  --action deny --yes

# JSON — works in scripts and agents
vercel firewall rules add --json '{"name":"Block crawlers","conditionGroup":[{"conditions":[{"type":"user_agent","op":"sub","value":"crawler"}]}],"action":{"mitigate":{"action":"deny"}}}' --yes
```

### 多条件（AND）和 OR 组

```bash
# AND — multiple --condition flags in the same group
vercel firewall rules add "Secure admin" \
  --condition '{"type":"path","op":"pre","value":"/admin"}' \
  --condition '{"type":"geo_country","op":"eq","neg":true,"value":"US"}' \
  --action deny --yes

# OR — use --or to start a new group
vercel firewall rules add "Block dangerous methods" \
  --condition '{"type":"method","op":"eq","value":"DELETE"}' \
  --or \
  --condition '{"type":"method","op":"eq","value":"PATCH"}' \
  --action challenge --yes
```

### 编辑和管理

```bash
vercel firewall rules edit "My Rule" --action challenge --yes      # change action
vercel firewall rules edit "My Rule" --name "New Name" --yes       # rename
vercel firewall rules edit "My Rule" --enabled --yes               # enable
vercel firewall rules edit "My Rule" --disabled --yes              # disable
vercel firewall rules edit "My Rule" \
  --condition '{"type":"path","op":"pre","value":"/new"}' --yes    # replace conditions

vercel firewall rules enable  "My Rule"
vercel firewall rules disable "My Rule"
vercel firewall rules remove  "My Rule" --yes                      # aliases: rm, delete
vercel firewall rules reorder "My Rule" --first  --yes             # move to highest priority
vercel firewall rules reorder "My Rule" --last   --yes
vercel firewall rules reorder "My Rule" --position 3 --yes         # 1-based
```

规则按优先级顺序评估（从上到下）。重新排序以控制哪条规则先匹配。

注意：使用 `edit` 搭配 `--condition` 时，它会覆盖规则中列出的所有条件。编辑规则时确保指定所有条件。

### 条件格式

每个 `--condition` 是一个 JSON 对象：

```json
{
  "type": "path", // condition type (required)
  "op": "pre", // operator (required)
  "value": "/api", // value (required for most operators; omit for ex/nex)
  "key": "Authorization", // required for header / cookie / query types
  "neg": true // negate the condition (optional, default false)
}
```

组内的条件为 **AND**。多个组（由 `--or` 分隔）为 **OR**。

### 操作符

`eq`/`neq`（等于）、`sub`（包含）、`pre`（以…开头）、`suf`（以…结尾）、`re`（正则）、`ex`/`nex`（存在；省略 `value`）、`inc`/`ninc`（在集合中；`value` 是数组或逗号分隔）、`gt`/`gte`/`lt`/`lte`（数值）。设置 `neg: true` 以取反任何操作符。

### 条件类型

- **请求形态**：`path`、`raw_path`（重写前）、`target_path`（重写后）、`route`（例如 `/blog/[slug]`）、`server_action`、`method`、`host`、`protocol`、`scheme`、`environment`（preview|production）、`region`
- **客户端**：`ip_address`（IP 或 CIDR）、`user_agent`、`geo_country`、`geo_continent`、`geo_country_region`、`geo_city`、`geo_as_number`
- **头 / cookie / 查询**——需要 `key`：`header`、`cookie`、`query`
- **TLS 指纹**：`ja4_digest`（所有计划）、`ja3_digest`（仅 Enterprise）
- **速率限制分组**：`rate_limit_api_id`

### 动作

- `deny`——拦截（403）
- `challenge`——显示验证页面
- `log`——记录而不拦截（用于在强制执行前调优）
- `bypass`——跳过剩余的 WAF 自定义规则和托管规则集（不绕过系统级缓解——为此使用 System bypass）
- `rate_limit`——通过计数键限流（标志见速率限制示例）
- `redirect`——重定向到 URL 或路径；使用 `--redirect-url <URL>` 和可选的 `--redirect-permanent`（301；默认是临时 307 重定向）

`deny`、`challenge` 和 `rate_limit` 接受 `--duration`（Pro/Enterprise）：`1m`、`5m`、`15m`、`30m`、`1h`。持久——`deny --duration 30m` 在首次匹配后封禁客户端 30 分钟。没有 duration 时动作为逐请求评估。使用持久动作时要小心，因为即使 Firewall 规则被移除，它们也会在该时长内被封禁。

### 速率限制示例

```bash
vercel firewall rules add "Rate limit API" \
  --condition '{"type":"path","op":"pre","value":"/api"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 100 \
  --rate-limit-keys ip \
  --rate-limit-action deny \
  --yes
```

- `--rate-limit-window`——秒，10–3600（超过 600 仅 Enterprise）
- `--rate-limit-requests`——每窗口最大值，1–10,000,000
- `--rate-limit-keys`——按 `ip`（默认）或 `ja4` 计数。`header:<name>` 仅 Enterprise。可重复。
- `--rate-limit-algo`——`fixed_window`（默认）、`token_bucket`（仅 Enterprise）
- `--rate-limit-action`——超过限制时：`rate_limit` 返回 429（默认）、`deny` 返回 403、`challenge`、`log`
- 计数器是**按区域**的——N 个区域合计可能超出你配置的限制约 N 倍。

当用户就某项目寻求防火墙帮助——或询问“我应该添加哪些速率限制？”——主动扫描代码仓库寻找 API 端点并建议具体的 `rate_limit` 规则。大多数项目上线时没有速率限制，一个滥用客户端就可能推高账单或搞垮应用。一小套精心定向的规则能抓住最严重的违规者而不触碰合法流量。

方法作用域很重要——`GET /api/foo` 和 `POST /api/foo` 很可能需要不同的速率限制。始终用 `--rate-limit-action log` 和一个宽松的限制（预期合法速率的 5–10 倍）暂存，然后在收紧之前走完最佳实践中的分阶段推出流程。

对于更复杂的计数（自定义桶、从 header/cookie 哈希标识符、你自己的代码中的滑动窗口），引导用户使用 **Rate Limiting SDK**：https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk。

## IP 封禁

[IP 封禁](https://vercel.com/docs/vercel-firewall/vercel-waf/ip-blocking)完全封禁 IP 或 CIDR。暂存——需要 `publish`。

```bash
vercel firewall ip-blocks list
vercel firewall ip-blocks list --json
vercel firewall ip-blocks block 1.2.3.4 --yes
vercel firewall ip-blocks block 10.0.0.0/24 --hostname example.com --yes   # scoped to a host
vercel firewall ip-blocks block 1.2.3.4 --notes "Abuse report #123" --yes
vercel firewall ip-blocks unblock 1.2.3.4 --yes
vercel firewall ip-blocks unblock 1.2.3.4 --hostname example.com --yes     # disambiguate when blocked on multiple hosts
vercel firewall ip-blocks unblock ip_abc123 --yes                          # by rule ID
```

## System bypass

[System bypass 规则](https://vercel.com/docs/vercel-firewall/vercel-waf/system-bypass-rules)将受信任的 IP/CIDR 从系统级缓解（例如 DDoS 缓解）中豁免（办公室、CI 服务器、正常运行时间监控）。仅 Pro/Enterprise。立即生效——无需 publish。

```bash
vercel firewall system-bypass list
vercel firewall system-bypass list --json
vercel firewall system-bypass add 10.0.0.1 --yes
vercel firewall system-bypass add 10.0.0.0/24 --yes
vercel firewall system-bypass add 10.0.0.1 --domain example.com --yes
vercel firewall system-bypass add 10.0.0.1 --domain "*.example.com" --yes  # wildcard domain
vercel firewall system-bypass add 10.0.0.1 --notes "Office IP" --yes
vercel firewall system-bypass remove 10.0.0.1 --yes
```

System bypass **不**覆盖你自己的自定义规则——为此，使用带 `--action bypass` 的自定义规则。

## Attack mode

[Attack Mode](https://vercel.com/docs/vercel-firewall/attack-mode)是对活跃攻击的紧急响应。未验证的访客会看到挑战页面；已验证的机器人和搜索爬虫被豁免。立即生效——无需 publish。**需要交互式确认；由于严重性，对智能体/脚本阻止。**

```bash
vercel firewall attack-mode enable --duration 1h --yes    # 1h (default)
vercel firewall attack-mode enable --duration 6h --yes
vercel firewall attack-mode enable --duration 24h --yes
vercel firewall attack-mode disable --yes
```

## 系统缓解

Vercel 自动[缓解 DDoS 攻击](https://vercel.com/docs/vercel-firewall/ddos-mitigation)。在罕见情况下（调试误报），你可能需要暂停它们。24 小时后自动恢复。立即生效。**由于严重性，对智能体/脚本阻止——暂停会移除 DDoS 保护。**

```bash
vercel firewall system-mitigations pause  --yes    # 24h, auto-resume
vercel firewall system-mitigations resume --yes
```

## 发布

```bash
vercel firewall diff                      # review staged changes
vercel firewall publish --yes             # push drafts to production
vercel firewall discard --yes             # throw away drafts
```

## 从 CLI 查询防火墙流量

`vercel firewall traffic list` 和 `vercel firewall traffic inspect` 是无需离开终端即可分析防火墙活动的内置方式——适用于分阶段推出中的“审查流量”步骤，或用于发现哪些规则在真正起作用。与通用的 `vc metrics` 查询不同，这些在每个团队计划上都能对最近 24 小时成功；**Observability Plus** 仅将保留窗口扩展到 30 天。

```bash
vercel firewall traffic list --since 24h --json   # beyond your plan's retention needs Observability Plus
vercel firewall traffic list --action deny --dimension rule --json
```

- `traffic list` 按动作报告请求，外加跨 10 个维度的热门列表：`ip`、`ja4`、`asn`、`user-agent`、`path`、`rule`、`host`、`bot`、`country`、`action`。使用 `--dimension` 选择要包含哪些热门列表。
- `traffic inspect <dimension> <value>`（例如 `vercel firewall traffic inspect rule rule_abc123 --group-by ip`）深入一个值，并按第二个维度细分。
- `--since`/`--until` 接受 `1h`、`24h`、`3d`、`7d` 等，或 ISO 日期；`--json` 最适合程序化审查。
- `--since` 必须落在你计划的保留期内，否则查询需要 Observability Plus。如果 `--since` 已经太靠前，用 `--until` 缩短窗口也无济于事。

对于**活跃攻击分诊**视角——“现在正在发生什么吗？”——缩小窗口：

```bash
vercel firewall traffic list --since 1h --json
vercel firewall alerts list --since 1h --json   # DDoS mitigation and other anomaly episodes
```

其他可用命令：`vercel firewall status`（按评估顺序显示配置）、`vercel firewall persistent-actions list/inspect`（当前处于持久 deny/challenge 的客户端）以及 `vercel firewall bot-management`（Bot Protection、AI Bots 和 BotID 托管规则动作，外加未知机器人流量）。运行 `vercel firewall <subcommand> --help` 获取当前标志，并查看 https://vercel.com/docs/cli/firewall 获取完整参考。仪表板 URL `/firewall/traffic?filter=<ruleId>` 为人类审查显示相同数据。

## 最佳实践

防火墙位于每个请求之前。配置错误的规则可能拦截真实用户、杀死 SEO 爬虫或搞坏结账。将更改视为生产数据库迁移：暂存、审查，并让用户扣动扳机。

- **分阶段推出新规则，而不是一次性推出。** 在真实流量命中之前，新规则的影响范围是不可预测的。让每条有意义的规则走完下面的阶段，并在每个阶段之间请用户运行 `vercel firewall publish --yes`。即使某条规则“显然”只匹配攻击者，也不要跳过阶段——常见的 JA4 和 user agent 与真实用户碰撞的频率远高于它们看起来的样子。
  1. **到处记录（log）。** 用 `--action log` 添加规则，使其将命中记录到 Firewall 仪表板但不拦截任何内容。

     ```bash
     vercel firewall rules add "Block exploit probes" \
       --condition '{"type":"path","op":"inc","value":["/wp-admin","/.env","/.git/config","/phpmyadmin"]}' \
       --action log --yes
     ```

  2. **让用户在仪表板中审查流量。** 从 `rules add` 输出或 `vercel firewall rules list --json` 获取规则 ID（查找 `id` 字段——规则 ID 以 `rule_` 开头）。从 `.vercel/project.json`（`orgSlug` / `projectName`）或通过 `vercel project ls` 读取团队和项目 slug。构造过滤后的流量 URL 并请用户打开它：

     ```
     https://vercel.com/<team>/<project>/firewall/traffic?filter=<ruleId>
     ```

     让他们确认只有预期的流量在匹配（没有真实用户、没有 SEO 爬虫、没有内部工具）后再继续。

  3. **先在预览中拦截。** 将规则编辑为 `deny`（或 `challenge`）并添加一个 `environment = preview` 条件，使生产保持 log 模式。这让用户可以命中预览部署并确认拦截正确触发，而不暴露真实用户：

     ```bash
     vercel firewall rules edit "Block exploit probes" \
       --action deny \
       --condition '{"type":"path","op":"inc","value":["/wp-admin","/.env","/.git/config","/phpmyadmin"]}' \
       --condition '{"type":"environment","op":"eq","value":"preview"}' \
       --yes
     ```

     让用户发布，然后在预览 URL 中测试受影响的路径。重新检查按规则 ID 过滤的仪表板 URL，看拦截是否生效。

  4. **在生产中拦截。** 一旦用户对生产日志数据满意，编辑为 `deny` / `challenge` 并让他们发布。在最初 24 小时保持仪表板 URL 在手，以防需要用 `--action log` 或 `rules disable` 回滚。

- **暂存草稿；让用户发布。** 变更命令（`rules add/edit/enable/disable/remove/reorder`、`ip-blocks block/unblock`）只会暂存。运行 `vercel firewall diff` 显示将更改什么，然后**请用户自己运行 `vercel firewall publish --yes`**——不要代表他们推送到生产。仅在用户要求放弃暂存更改时使用 `discard --yes`。

- **不要运行 CLI 对智能体阻止的命令。** 改为说明用户需要做什么：
  - `vercel firewall rules add --ai "..."` 和 `vercel firewall rules add`（向导）——仅 TTY。使用 `--condition` 标志或 `--json`。
  - `vercel firewall attack-mode enable`——需要显式交互式确认；让用户运行它。
  - `vercel firewall system-mitigations pause`——在整个项目范围暂停平台 DDoS 保护；让用户运行它并尽快恢复。

- **在建议发布之前检查。** 带宽松条件（例如 `path` 以 `/` 开头）的 `deny` 会拦截整个站点。在把发布步骤交给用户之前，始终执行 `vercel firewall rules inspect "Name"` 和 `vercel firewall diff`。

- **温和地调优速率限制。** 从宽松的 `--rate-limit-requests`（预期合法速率的 5–10 倍）和 `--rate-limit-action log` 开始。用户审查仪表板数据后，收紧限制并将动作切换为 `rate_limit`、`challenge` 或 `deny`。

- **保持 bypass 范围狭窄。** 在解封受信任的自动化时，用共享密钥 header **加上** IP 或 CIDR 限定作用域。避免大开大合的 bypass（例如单个已知值的 header，攻击者可以猜到）。

- **不要过度拦截。** User agent、JA4 和 IP 地址与真实用户碰撞的频率远高于它们看起来的样子：
  - **JA4 指纹在数百万客户端之间共享。** 单个 Chrome 补丁版本、单个 iOS 版本或流行的移动 SDK 都会产生相同的 JA4。“拦截这个 JA4”可能悄悄干掉整个浏览器群体。在建议 JA4 规则之前，让它走上面的 log → 预览 → log-生产 → 拦截流程，并让用户确认仪表板只显示攻击者行为（高请求率、可疑路径、异常地理）——而不只是“这个 JA4 命中过 `/login` 一次”。
  - **User-agent 子串规则会不断过度匹配。** 像 `crawler`、`bot`、`python`、`curl` 或 `headless` 这样的 `sub` 匹配会拦截合法工具（正常运行时间监控、链接预览器、SEO 审计器、合作伙伴集成、用户自己的 CI）。对于已知良好的爬虫（Googlebot、Bingbot、Slack/Discord/X 的展开器 等），优先使用 Vercel 的已验证机器人信号而不是 UA 字符串，并将 UA 条件与另一个条件（path、geo、rate）配对，以便单个 UA token 无法干掉一整类客户端。
  - **在暂存前做合理性检查。** 在添加拦截之前，问用户：“这个指纹也匹配 macOS 上的 Chrome / 我们的移动应用 / 合作伙伴的 webhook 吗？”如果你不知道，答案就是“先记录，之后再决定”。

## 外部反向代理

位于 Vercel 前的外部代理会降低防火墙和 Bot Protection 的准确性：真实客户端 IP 变得不透明、信号可靠性下降、合法用户可能被反复挑战。尽可能避免。如果必须，使用 **Verified Proxy**，以便 Vercel 从已知出口范围信任你的代理头。https://vercel.com/docs/security/reverse-proxy

## 官方文档

- [Vercel Firewall](https://vercel.com/docs/vercel-firewall)
- [Bot management](https://vercel.com/docs/bot-management)
- [Vercel CLI](https://vercel.com/docs/cli/firewall)
