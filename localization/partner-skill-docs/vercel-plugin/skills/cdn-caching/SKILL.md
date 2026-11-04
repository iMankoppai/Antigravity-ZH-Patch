---
name: cdn-caching
description: 调试 Vercel CDN 缓存——缓存命中率、陈旧内容、重验证行为、ISR + PPR、逐请求缓存原因（cacheReason）和 PPR 状态（ppr_state），以及成本。
metadata:
  priority: 6
  docs:
    - 'https://vercel.com/docs/caching'
    - 'https://vercel.com/docs/caching/cdn-cache'
    - 'https://vercel.com/docs/incremental-static-regeneration'
    - 'https://vercel.com/docs/cli/metrics'
  bashPatterns:
    - '\bvercel\s+cache\s+(purge|invalidate|dangerously-delete)\b'
  promptSignals:
    phrases:
      - 'cache hit rate'
      - 'isr cost'
      - 'isr read units'
      - 'isr write units'
      - 'stale content'
      - 'x-vercel-cache'
      - 'cache reason'
      - 'cacheReason'
      - 'x-vercel-cache-reason'
      - 'ppr state'
      - 'ppr_state'
      - 'x-vercel-ppr-state'
      - 'stale_time'
      - 'stale_tag'
      - 'stale_error'
      - 'draft_mode'
      - 'prerender_bypass'
    allOf:
      - [cache, debug]
      - [stale, cache]
      - [revalidation, count]
      - [cache, reason]
      - [why, stale]
      - [why, bypass]
      - [cache, miss]
    anyOf:
      - 'revalidate'
      - 'prerender'
      - 'invalidate'
      - 'draft mode'
      - 'crawler'
      - 'cold cache'
      - 'request collapsed'
    minScore: 6
retrieval:
  aliases:
    - cache reason
    - ppr state
    - cache hit rate
    - stale content
  intents:
    - why is my page stale
    - why is this request a bypass
    - why was this a cache miss
  entities:
    - cacheReason
    - ppr_state
    - collapsed
    - draft_mode
    - prerender_bypass
    - stale_time
    - stale_tag
    - stale_error
---

# Vercel 缓存

你是理解 Vercel 缓存基础设施以及 CDN Cache、ISR 和 PPR 如何工作的专家。

## 核心知识

- ISR（以及构建在其之上的渲染策略 PPR）是框架功能——Next.js、SvelteKit、Nuxt 和 Astro 在 Vercel 上都使用它，这里的层次、指标和 CLI 无论哪种框架都适用。（对于在你的函数与后端_之间_缓存数据，那是 Runtime Cache——一个单独的层；见参考资料。）
- **PPR（部分预渲染）**——一种渲染策略，_不是_缓存层：静态外壳存在于 **ISR 缓存**中，而函数按请求渲染动态空洞并将它们流式传输到同一响应中。有空洞的路由在外壳命中时仍会调用函数；无空洞的路由就只是 ISR（纯粹的 `prerender` HIT）。

### 缓存如何工作

Vercel 在访客和后端之间的多个层进行缓存。请求到达最近的 **PoP**，它路由到一个 Vercel 区域；然后 CDN **按顺序检查每一层，并在有一层可用时立即返回缓存响应**，因此只有当上游没有任何有效副本时，你的函数才会运行。

#### 缓存层

- **CDN 缓存**——区域级、临时。命中时区域返回响应而无需调用函数。读取/写入是**免费的**。
- **ISR 缓存**——持久，位于单个[函数区域](https://vercel.com/docs/functions/configuring-functions/region)中。CDN 未命中时，Vercel 在调用你的函数_之前_读取这里（缓存屏蔽），然后将结果复制回 CDN。范围限定到其部署（新部署不会复用它）；保留到被重验证或 31 天未被访问；读取/写入按 **8 KB 为单位计费**。
- **函数调用**——仅当两个缓存都没有有效副本时才运行。它可能读取 Runtime/数据缓存（一个单独的层；见参考资料）和你的后端，然后 Vercel 将响应存储到 ISR 缓存中。
- **图片缓存**——优化后的图片，在首次转换后缓存在 CDN 上。
- 清除在大约 300 毫秒内在全球传播。

**请求折叠**：当许多请求同时命中同一个未缓存路径时，Vercel 将它们折叠为每个区域一次函数调用，以保护源站。

#### 关键概念

- **缓存命中率**——从缓存提供（`HIT`/`STALE`/`PRERENDER`）相对于源站（`MISS`/`REVALIDATED`）的份额。在_可缓存_请求上度量它——排除 `BYPASS` 和 `(not set)`（重定向、错误、不可缓存的方法），否则它们会因非缓存原因拉低比率。低命中率意味着更多源站负载和更高延迟。
- **重验证**——刷新缓存内容。**基于时间**在间隔后自动运行；**按需**在你调用 API 时运行。两者都使用 stale-while-revalidate：访客继续获得缓存版本，而新版本在后台重新生成。
- **失效 vs. dangerously-delete**——两种清除内容的方式，对命中率的冲击非常不同：
  - _失效_（`invalidateByTag`、Next.js 16+ `revalidateTag(tag, 'max')`）= stale-while-revalidate。在后台刷新的同时继续提供陈旧内容 → 响应显示 `x-vercel-cache: STALE`。
  - _Dangerously-delete_（`dangerouslyDeleteByTag`、Next.js `updateTag`、`revalidatePath`，或不带 profile 的 `revalidateTag(tag)`）= 硬移除。下一个请求在**前台**阻塞以重新生成 → `x-vercel-cache: REVALIDATED`。
- **缓存标签与影响范围**——标签对缓存条目进行分组，使一次调用能清除许多条目。附加到数千个路径的粗粒度标签有较大的_影响范围_：一次写入就会丢弃它们全部，命中率会崩溃直到它们重新预热。优先使用细粒度标签（`product-${id}`）外加一个汇总标签。
- **缓存状态**（`x-vercel-cache` 响应头）——_结果_：

  | 值         | 含义                                                          |
  | ------------- | ---------------------------------------------------------------- |
  | `HIT`         | 从缓存提供；未运行函数                               |
  | `MISS`        | 未缓存；源站/函数已运行                                  |
  | `STALE`       | 在后台重验证时提供陈旧内容（SWR / 失效） |
  | `PRERENDER`   | 提供了预渲染的 ISR/PPR 外壳                               |
  | `REVALIDATED` | 删除后（或 `Pragma: no-cache`）的前台重验证   |
  | `BYPASS`      | 跳过缓存（`no-store`、`private`、cookies 等）           |

- **缓存原因**（`cacheReason`）——对单个请求该结果的更精细_解释_。`cache_result` 指标将所有 `MISS`（以及所有 `STALE`）归并在一起；原因是唯一能区分它们的东西。十一个值：四个用于 MISS，三个映射到 BYPASS，三个用于 STALE，一个用于 REVALIDATED：

  | `cacheReason`        | 细化  | 含义                                                                       |
  | --------------------- | -------- | ----------------------------------------------------------------------------- |
  | `cold`                | MISS     | 此键/变体的缓存为空（首次请求或被逐出）；函数已运行 |
  | `collapsed`           | MISS     | 对同一个未缓存路径的并发请求被折叠为单次调用   |
  | `error`               | MISS     | 错误导致无法从缓存提供                                         |
  | `vary_key_denied`     | MISS     | 源站的 `Vary` 头指定了高基数请求头（例如 `Cookie`）；响应无法缓存 |
  | `draft_mode`          | → BYPASS | Next.js Draft Mode 激活——绕过以便编辑者看到实时内容              |
  | `prerender_bypass`    | → BYPASS | 请求匹配路由的 `experimentalBypassFor` 配置（例如 PPR 上的 bot UA） |
  | `crawler`             | → BYPASS | SEO 爬虫 UA——提供完整响应，以便机器人索引真实内容              |
  | `stale_time`          | STALE    | 基于时间的 `revalidate` 间隔已过；在后台重新生成（SWR）     |
  | `stale_tag`           | STALE    | 标签已失效（`invalidateByTag` / `revalidateTag(tag, 'max')`）；正在重新生成 |
  | `stale_error`         | STALE    | 一次重验证尝试**失败**；提供最后一个良好副本（一个 bug 信号）  |
  | 基于标签的删除    | REVALIDATED | 标签已删除（`dangerouslyDeleteByTag` / 不带 profile 的 `revalidateTag(tag)` / 仪表板按标签清除）；前台重新生成 |

  一个原始的 `MISS` 且原因为 `draft_mode` / `prerender_bypass` / `crawler` 时，**显示为 `BYPASS`**（通常都是预期的）。三个 `stale_*` 原因将一个健康的时间刷新（`stale_time`）、一个宽泛标签冲击（`stale_tag`）与一次失败的重新生成（`stale_error`）区分开。从仪表板 Logs 的“Reason”行读取 `cacheReason`，用 `vercel logs requests --query 'cacheReason:stale_error'` 查找匹配的请求（需要 Observability Plus 或 Priority 项目），或用 `vercel metrics vercel.request.count --group-by cache_reason` 聚合——`x-vercel-cache-reason` 头仅限内部，无法通过 `curl` 看到。

- **PPR 状态**（`ppr_state`）——对于 Partial Prerendering 路由，响应的_多少_是预渲染的、多少是按请求计算的。仅在 `partial_prerender` 服务上设置；对于普通 `prerender` / `func` / `static` 路由以及代理无法分类的情况（冷外壳未命中、`BYPASS`）为空。三种状态：

  | `ppr_state` | 含义                                                                              |
  | ----------- | ------------------------------------------------------------------------------------ |
  | Static      | 完全预渲染——无延迟状态，因此函数不会为正文被调用   |
  | Partial     | 静态外壳从缓存提供 + 一个延迟空洞，函数按请求恢复它  |
  | Dynamic     | 整个正文被延迟并由函数按请求渲染                  |

  仍然调用函数的 **Partial** 服务并_不是_缓存未命中——缓存外壳立即提供，而函数只填充动态空洞。从仪表板 Logs 面板读取 `ppr_state`，用 `vercel logs requests --query` 按 `pprState` 过滤（需要 Observability Plus 或 Priority 项目），或用 `vercel metrics vercel.request.count --group-by ppr_state` 聚合。与 `cacheReason` 一样，`x-vercel-ppr-state` 头仅限内部，无法通过 `curl` 看到。

## 调查缓存问题

使用 Vercel CLI。`vercel metrics` 给出聚合数字（需要 [Observability Plus](https://vercel.com/docs/observability/observability-plus)）；`vercel logs requests` 显示逐请求的 CDN 行为（状态、缓存结果、路径），`vercel logs` 显示请求产生的运行时日志。

指标需要按团队和项目查询（`-S <team> -p <project>`）。用 `--prod` 过滤生产（等价于 `--filter 'environment:production'`；CLI 的过滤语法是 KQL——较旧的 OData `eq`/`and` 语法已弃用）。运行 `vercel metrics schema <metric>` 发现维度；使用 `--format json` 获得机器可读输出。使用 `-g` 时，记住 **`--limit` 是按时间桶的**——当你需要整个窗口的总计时省略 `-g`。

### 缓存命中率

从这里开始了解缓存工作得有多好的整体情况。

**第 1 步 — 整体拆分。** 将 `vercel.request.count` 按 `cache_result` 分组。将 `HIT`、`STALE` 和 `PRERENDER` 视为缓存提供；将调查重点放在 `MISS`。在计算_可缓存_流量的命中率时排除 `BYPASS` 和 `(not set)`（见[调试 BYPASS 流量](#debugging-bypass-traffic)）。`STALE` 意味着 stale-while-revalidate 正常工作——在[分析 ISR 成本](#analyzing-isr-costs)中深入重验证频率，而不是这里。

```bash
vercel metrics vercel.request.count -S <team> -p <project> \
  --prod --group-by cache_result --since 24h
```

**第 2 步 — 未命中集中在哪里。** 将 `MISS` 桶（以及可选的 `STALE`）按 `path_type` 拆分，然后按 `route` 或 `request_path` 拆分：

```bash
vercel metrics vercel.request.count -S <team> -p <project> \
  --prod -f "cache_result:MISS" \
  --group-by path_type --since 24h

vercel metrics vercel.request.count -S <team> -p <project> \
  --prod -f "cache_result:MISS AND path_type:prerender" \
  --group-by request_path --since 24h
```

**预期情况：** `prerender` 路由（静态外壳、ISR 页面）应显示出较高的 `HIT`/`PRERENDER` 份额。`MISS` 计数不成比例的 `prerender` 路径是你进行逐路径头检查（上面的 `curl`）和代码审查的候选清单。

`streaming_func` 路由默认动态渲染，但你仍可以用 `Cache-Control` 头缓存它们——匹配的请求会缓存在 CDN 上。每个缓存条目除了路径和查询参数外，还根据 `Vary` 头（cookies、RSC 等）变化，因此预期比完全静态的 `prerender` 路由有更多缓存键和更低命中率。

### 分析 ISR 成本

了解命中率后，量化 ISR 支出以及驱动它的是否是重验证（而非流量）。

**利用率 vs. ISR 计费。** **利用率**是 `vercel.request.count`——总请求量。**ISR 成本**按 8 KB 为单位单独计费：当区域 CDN 未命中并下落到 ISR 缓存时为 `read_units`，当重验证/重新生成产生已更改的输出时为 `write_units`（未更改的内容不产生）。区域 CDN 对 ISR 起到很大的屏蔽作用——大多数请求从不触及 ISR 层，因此 **read_units 将远低于请求计数**。不要把 read_units 与 write_units 比较作为利用率检查；关注 **write_units**（重验证成本）以及它们与总流量的关系。

```bash
vercel metrics vercel.request.count -S <team> -p <project> -a sum --since 24h
vercel metrics vercel.isr_operation.write_units -S <team> -p <project> -a sum --since 24h
```

**写入利用率 = 缓存服务 ÷ ISR 写入**——每次重新生成的缓存读取。

```bash
# numerator: cache serves — sum the HIT + STALE + PRERENDER buckets
vercel metrics vercel.request.count -S <team> -p <project> \
  --prod -f "cache_result:(HIT OR STALE)" \
  --group-by route -a sum --since 24h
# denominator: ISR writes
vercel metrics vercel.isr_operation.write_units -S <team> -p <project> \
  --prod --group-by route -a sum --since 24h
```

高是好的；接近或低于约 1 意味着你的重新生成速度与页面读取速度大致相同（浪费写入）→ 延长 revalidate 间隔或将基于时间改为按需标签重验证。

**哪些路由重验证最多。** 按 `route` 和 `request_path` 拆分写入单元，找出相对于流量频繁重新生成的路径：

```bash
vercel metrics vercel.isr_operation.write_units -S <team> -p <project> \
  -a sum --group-by route --since 24h

vercel metrics vercel.isr_operation.write_units -S <team> -p <project> \
  -a sum --group-by request_path --since 24h
```

**重新生成 vs. 服务。** 按 `path_type` 对写入单元分组——集中在 `background_func` 中证实重验证（而非逐请求动态工作）是成本驱动因素。

**基于时间 vs. 基于标签的重验证。** 基于时间的间隔按计划重新生成，无论内容是否变化——通常效率较低。基于标签的按需重验证通常更好，但_过于宽泛的标签_有较大的影响范围：一次失效会丢弃携带它的所有条目。

- **标签影响范围**——按 `cache_tags` 对写入单元分组。如果许多_无关_路由显示出几乎相同的写入计数，一个共享的热标签正在同步地使它们失效（例如每个博客文章因为共享一个宽泛的 `blogPost` 标签而以相同速率重写）：

```bash
vercel metrics vercel.isr_operation.write_units -S <team> -p <project> \
  -a sum --group-by cache_tags --since 24h
```

- **什么触发了重验证**——按 `triggering_tag` 对 `vercel.request.count` 分组，查看哪些标签最常触发（`triggering_tag` 仅在请求计数上，不在 ISR 操作指标上。它是触发页面变得陈旧的标签之一）：

```bash
vercel metrics vercel.request.count -S <team> -p <project> \
  -f "triggering_tag:*" --group-by triggering_tag --since 24h
```

影响范围大且频繁重验证的标签是 write_units 高的常见根因。对于事件驱动的内容，优先使用细粒度标签（`product-${id}`）和按需失效，而不是短时间间隔。

**在代码中确认。** 指标告诉你_哪个_标签热；代码仓库告诉你_为什么_。grep 该标签的失效调用点——`revalidateTag(`、`invalidateByTag(`、`updateTag(`、`dangerouslyDeleteByTag(`——并阅读触发器。一个 CMS webhook 或同步 cron 在每次事件时使一个**宽泛**标签失效（而不是特定的 `${type}:${id}`）是典型的放大器。

### 调试 BYPASS 流量

`BYPASS` 最大的合理来源是 **Draft Mode** 和 **SEO 爬虫**。Draft Mode 必须绕过缓存，以便编辑者看到实时内容。SEO 机器人必须收到**完整响应**——尤其是在请求时组装静态外壳和动态空洞的 PPR 路由上——以便爬虫索引用户实际看到的内容。这种 BYPASS 是预期的，不是配置错误。

在调整头或 revalidate 间隔之前，确认这两个桶之后还剩下什么：

```bash
vercel metrics vercel.request.count -S <team> -p <project> \
  -f "cache_result:BYPASS" --group-by bot_category --since 24h

vercel metrics vercel.request.count -S <team> -p <project> \
  -f "cache_result:BYPASS" --group-by user_agent --since 24h

vercel metrics vercel.request.count -S <team> -p <project> \
  -f "cache_result:BYPASS" --group-by request_method --since 24h
```

结合 `vercel-firewall` 技能的 **Firewall/WAF** 可用于管理经过验证的 SEO 爬虫、屏蔽滥用机器人，并在垃圾流量扭曲你的命中率图景之前对其限速。

## 降低 ISR 成本

- **优先基于标签而非基于时间的重验证。** 当内容变化时，用按需 `revalidateTag` / `invalidateByTag` 替换短的 `revalidate` 间隔——基于时间的重新生成不管是否有任何变化都会运行。如果使用 Cache Components，对照 Next.js 随附文档（`node_modules/next/dist/docs/`）检查 `cacheLife` 调用。
- **将标签限定到特定 ID。** 使 `blogPost:<id>` 失效，而不是通用的 `blogPost`/`page` 标签——一次宽泛的失效会重新生成携带它的所有内容。
- 在框架声明处调整 revalidate 间隔（Next.js `revalidate` / `cacheLife`、SvelteKit `isr`、Nuxt `routeRules`、Astro）。对于 Next.js Cache Components，参见随附文档或官方 `next-cache-components-optimizer` 技能（`npx skills add vercel/next.js --skill next-cache-components-optimizer`）。
- 使用 `CDN-Cache-Control` 头缓存动态函数。

### 检查单个路径

```bash
curl -sSI https://<host>/<path> | grep -iE 'x-vercel-cache|x-matched-path|cache-control|vary|age|set-cookie'
```

这个零依赖的首次访问显示状态（`x-vercel-cache`）、缓存指令（`Cache-Control` / `CDN-Cache-Control` / `Vercel-CDN-Cache-Control`），以及——关键地——**`x-matched-path`**，它揭示诸如 `/precomputed/exp~.../...` 的重写，从而暴露实验/开关预计算。`vary` 标志个性化（RSC、cookies）；`set-cookie` 强制 `BYPASS`。对于逐阶段计时细分，`vercel httpstat /some/path`（CLI v48.9.0+；需要安装 `httpstat` 工具）添加延迟统计。一个应缓存却显示 `MISS`/`BYPASS` 的路径通常有 `private`、`no-store`、`max-age=0`、逐请求输入（cookies/headers/`searchParams`），或不可缓存的方法（见 FAQ）。

**检查单个请求。** 当指标或头给你一个请求 ID 时，拉取它的 CDN 记录及其产生的运行时日志：

```bash
vercel logs requests --query 'requestId:"<request-id>"' --since 1h --json   # status, cache result, path
vercel logs --query 'requestId:"<request-id>"' --since 1h --json            # runtime log entries
```

设置 `--since`/`--until` 覆盖请求发生的时间；默认窗口是最近 30 分钟。使用 `--json` 时，记录字段在 `.data` 下（例如 `jq 'select(.type == "request") | .data.cacheResult'`），最后的 `summary` 行说明是否有更多记录匹配。

## 常见问题

- **什么是 prerender 变体未命中？** 当路由使用动态参数时，每个不同的缓存键变体都会被单独预渲染和缓存，因此每个变体在每个区域的首次命中都会未命中，低流量的变体很少保持温热。最常见的现代原因是**功能开关 / 实验预计算**——中间件按请求选择变体（`/precomputed/exp~.../...` 路径），而开关 × 路由 × PPR 段会相乘成数千个 ISR 条目（也是中间件调用成本）。修复：折叠变体矩阵（退役已完成的实验），或接受该成本。
- **PPR 会避免函数调用吗？** 不——PPR 路由按定义有动态空洞，因此缓存外壳命中仍会运行函数来填充它们。（一个_没有_空洞的路由就只是 ISR，提供纯粹的 `prerender` HIT——见关键概念。）
- **为什么函数调用比 PPR 请求多？** PPR 请求有一个静态外壳和一次动态函数调用。当静态外壳需要重新生成时，它会在内容动态函数之上额外产生一次函数调用。

## 相关技能

- `vercel-firewall`——管理经过验证的 SEO 爬虫、屏蔽滥用机器人，并对垃圾 BYPASS 流量限速。
- `runtime-cache`——在_你的函数与后端之间_缓存数据（按区域的键值/数据缓存）。是与 CDN/ISR 缓存不同的层；用它来在函数内缓存一个 API 响应或查询结果。

## 参考资料：

- 缓存概述：https://vercel.com/docs/caching
- ISR：https://vercel.com/docs/incremental-static-regeneration
- 部分预渲染（PPR）：https://vercel.com/docs/partial-prerendering
- Cache-Control 头：https://vercel.com/docs/caching/cache-control-headers
- 诊断和修复缓存问题（完整手册）：https://vercel.com/docs/caching/cdn-cache/debug-cache-issues
- vercel metrics CLI：https://vercel.com/docs/cli/metrics
- vercel logs CLI：https://vercel.com/docs/cli/logs
