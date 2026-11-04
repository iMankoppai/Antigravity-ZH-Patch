---
name: vercel-flags
description: "使用 Vercel Flags 在任何应用或框架中实现功能开关、A/B 测试和渐进式发布。每当用户正在规划、添加或更改功能开关、toggle、杀伤开关、实验、百分比发布或定向规则，或想为某些用户门控或隐藏某个功能时使用，即使尚未选择库或提供商。涵盖选择集成（Flags SDK、`@vercel/flags-core`、OpenFeature）、Vercel 仪表板、`vercel flags` CLI（create、inspect、set、split、rollout、rules、segments、evaluations、archive）、OIDC 与 SDK 键、`FLAGS_SECRET` 以及 Flags Explorer 覆盖。对于 Next.js 或 SvelteKit 代码中的 `flag()` 声明、适配器、预计算和 Flags Explorer 端点，加载 `flags-sdk` 技能。"
summary: "Vercel Flags guidance — plan a flag, choose Flags SDK vs @vercel/flags-core vs OpenFeature, manage flags with the vercel flags CLI, run rollouts and A/B tests, and retire flags safely."
metadata:
  priority: 6
  docs:
    - "https://vercel.com/docs/flags"
    - "https://vercel.com/docs/cli/flags"
  sitemap: "https://vercel.com/sitemap.xml"
  importPatterns:
    - '@vercel/flags-core'
  bashPatterns:
    - '\bvercel\s+flags\b'
    - '\bvc\s+flags\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/flags-core\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/flags-core\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/flags-core\b'
    - '\byarn\s+add\s+[^\n]*@vercel/flags-core\b'
  promptSignals:
    phrases:
      - "feature flag"
      - "feature flags"
      - "vercel flags"
      - "feature gate"
      - "feature gating"
      - "a/b test"
      - "a/b testing"
      - "ab test"
      - "ab testing"
      - "flag rollout"
      - "gradual rollout"
      - "percentage rollout"
      - "kill switch"
      - "flag variant"
      - "traffic split"
      - "targeting rules"
      - "flag rules"
      - "flag segments"
      - "flag targeting"
      - "flag evaluations"
      - "flag overrides"
      - "existing flag"
      - "archive flag"
      - "flags-core"
    allOf:
      - [flag, rollout]
      - [flag, variant]
      - [flag, toggle]
      - [flag, experiment]
      - [flag, archive]
      - [experiment, variant]
      - [split, test]
    anyOf:
      - "flag"
      - "experiment"
      - "experimentation"
      - "rollout"
      - "variant"
    noneOf:
      - "command-line flag"
      - "command line flag"
      - "cli flag"
      - "compiler flag"
      - "flag emoji"
      - "rolling release"
    minScore: 6
retrieval:
  aliases:
    - feature flags
    - feature toggles
    - vercel flags
    - a/b testing
    - flags core
  intents:
    - add a feature flag
    - run an a/b test
    - gate a feature
    - roll out gradually
    - manage flags from cli
    - archive a feature flag
  entities:
    - Vercel Flags
    - vercel flags CLI
    - "@vercel/flags-core"
    - OpenFeature
    - FLAGS_SECRET
    - SDK keys
---

# Vercel Flags

Vercel Flags 是 Vercel 的功能开关平台。开关在 Vercel 仪表板中或用 `vercel flags` CLI 创建和管理，在你的应用中进行服务端评估，并按环境（Development、Preview、Production）切换而无需重新部署。

- 文档：https://vercel.com/docs/flags
- CLI 参考：https://vercel.com/docs/cli/flags

使用本技能决定某个功能应如何被开关控制、创建和更改开关，以及运行发布和实验。用与你的技术栈匹配的技能编写应用代码（见[选择方案](#choose-an-approach)）。不要把 CLI 步骤留作给用户的“后续步骤”；自己执行它们。

## 路由请求

- **规划**（“把这个放到开关后面”、“发布到 10%”、“对定价页面做 A/B 测试”、“添加杀伤开关”）：遵循[规划开关](#plan-a-flag)，然后[选择方案](#choose-an-approach)。
- **无需代码更改即可创建或管理开关**（create、inspect、enable、set、split、rollout、rules、archive）：遵循[使用 CLI 管理开关](#manage-flags-with-the-cli)。这需要一个已认证的 CLI，而不是 SDK 包、Toolbar、Flags Explorer 或 `.env.local`（`vercel flags override` 除外，它会读取 `FLAGS_SECRET`）。
- **向已使用 Flags SDK 的应用添加开关**（`package.json` 中有 `flags`）：立即加载 `flags-sdk` 技能；它会在 Vercel 上创建开关并在代码中声明它。
- **否则在代码中实现**：遵循[选择方案](#choose-an-approach)并加载匹配的技能或参考。在应用代码仓库内，将含糊的请求视为规划、创建和实现。

## 选择方案

在编写代码之前检查项目。

- **已在使用其他开关提供商**（Statsig、LaunchDarkly、PostHog、GrowthBook 等）：保留它。在 Next.js 或 SvelteKit 上，Flags SDK 通过适配器连接到它；加载 `flags-sdk` 技能。在任何其他技术栈上，使用该提供商自己的 SDK。该提供商的发布、定向和实验在其自己的仪表板中配置，而不是用 `vercel flags`；本技能的 CLI 和生命周期章节不适用。
- **尚无提供商**：使用 Vercel Flags。按技术栈选择集成（[SDK](https://vercel.com/docs/flags/vercel-flags/sdks)）：
  - **Next.js 或 SvelteKit**：Flags SDK（`flags` + `@flags-sdk/vercel`）。它添加 Flags Explorer 集成和静态页面的预计算。加载 `flags-sdk` 技能。如果不可用，建议 `npx skills add vercel/flags@flags-sdk`（不要自动安装）。
  - **任何其他框架或普通服务器**（例如 Express）：`@vercel/flags-core`。参见[其他框架](#other-frameworks)。
  - **用户想要提供商可移植性或已在使用 OpenFeature**：Vercel Flags OpenFeature 提供商（[将 OpenFeature 与 Vercel Flags 一起使用](https://vercel.com/docs/flags/vercel-flags/sdks/openfeature)）。

对于每种集成，仪表板和 `vercel flags` CLI 的工作方式相同。

## 规划开关

在创建开关之前决定这些事项；类型之后无法更改。

- **类型**：`boolean` 用于开/关和杀伤开关；当开关选择某个变体或携带配置时使用 `string`、`number` 或 `json`（[开关类型](https://vercel.com/docs/flags/vercel-flags/dashboard/feature-flag#flag-types)）。
- **变体**：按行为命名（`control`、`new-checkout`），而不是按发布步骤命名。
- **键**：kebab-case、稳定，并在 CLI、仪表板和代码中为同一字符串（`flag()` 中的 `key` 或 `evaluate()` 的第一个参数）。
- **环境**：每个环境提供自己的值或定向。规划 Development、Preview 和 Production 在发布时提供什么。
- **定向**：百分比发布或 A/B 拆分需要一个用于分桶的稳定标识，例如 `user.id`。先在 Flags → Entities 下定义实体和属性；应用必须从其评估上下文返回相同的名称（[实体](https://vercel.com/docs/flags/vercel-flags/dashboard/entities)）。
- **回退值**：当开关被归档、尚未创建或评估失败时应用提供的值。这成为代码中的 `defaultValue`。
- **退出**：除非是长期运行的运维开关，否则开关是临时的。在 [references/cli.md — 生命周期与安全](references/cli.md#lifecycle-and-safety) 中规划移除顺序。

## 使用 CLI 管理开关

CLI 使用你的 Vercel 账户认证。SDK 键和 `vercel env pull` 是应用凭据，不是 CLI 的先决条件。

> **先决条件**：Vercel CLI 必须已安装并已认证。如果未安装，运行 `pnpm i -g vercel`。对于认证或关联问题，如果 `vercel-cli` 技能可用则遵循它。如果不可用，建议 `npx skills add vercel/vercel@vercel-cli`（不要自动安装它），并在此期间依赖 `vercel <command> --help`。

运行 `vercel flags --help` 获取当前子命令列表，并在使用子命令之前运行 `vercel flags <cmd> --help`。[references/cli.md](references/cli.md) 涵盖 `--help` 无法涵盖的内容：CLI 概念如何映射到应用、提升顺序、静态值与定向模式，以及归档或删除之前要运行的检查。

### 项目定向

使用 `--project <name-or-id>` 和 `--scope <team>` 在无本地关联的情况下选择目标。如果 CLI 拒绝 `--project`，先升级它（`pnpm i -g vercel`）。没有这些选项时，命令使用已关联的项目：运行 `vercel project inspect --non-interactive` 并检查报告的 owner 和项目名称；仅有 `.vercel/` 目录并不能证明存在关联。如果它报告 `link_required`，说明项目未关联。如果用户指定了项目或团队而输出不同，停止并询问，而不是重新关联。在未关联的目录中，优先使用 `--project` / `--scope` 而不是 `vercel link`；如果目标项目未知，询问。

### 常见流程

始终先 `inspect`，以便了解每个环境当前提供什么，并将 CLI 键与应用已声明的开关匹配；创建第二个开关不能替代采用已有的开关。

- **创建**：`vercel flags create <key> --kind boolean --description "<description>"`。如果键已存在，改为采用它。
- **开启或关闭**：对布尔开关使用 `enable` / `disable`，用 `set <key>` 提供任何类型的一个变体。这些会把环境置于静态值模式。
- **渐进式发布**：`rollout <key> --by user.id ...`（[发布功能](https://vercel.com/docs/flags/vercel-flags/cli/roll-out-feature)）。
- **A/B 测试**：`split <key> --by user.id ...`（[运行 A/B 测试](https://vercel.com/docs/flags/vercel-flags/cli/run-ab-test)）。
- **定向规则和分段**：`rules`、`segments` 和 `use-targeting <key>`，将环境从静态值切回目标和规则。
- **验证**：用 `inspect` 查看提供的状态，用 `versions` 查看历史，用 `evaluations` 确认流量到达新变体。
- **退役**：先移除代码，验证没有评估，然后 `archive`；`rm` 仅用于已归档的开关。遵循[生命周期与安全](references/cli.md#lifecycle-and-safety)。

`archive`、`unarchive`、`rm` 和 `update --remove-variant` 会提示确认。当用户已批准该操作时传入 `--yes`。

## 凭据

- **OIDC**：在 Vercel 上，应用使用项目的 OIDC 令牌进行认证，并评估当前环境的配置。`vercel env pull` 将 Development 令牌写入 `.env.local` 供本地开发使用（[入门](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials)）。
- **SDK 键（`FLAGS`）**：仅用于 Vercel 之外的应用、自定义环境，或由另一个项目拥有的开关。每个键限定到一个环境，并在创建时显示一次（[SDK 键](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)）。不是 CLI 认证失败的恢复路径。
- **`FLAGS_SECRET`**：当为项目激活 Vercel Flags 时按环境创建。它为 Flags Explorer 覆盖和预计算代码签名，`vercel flags override` 从环境或 `.env.local` 读取它。保留现有值，绝不要在常规设置中轮换它们；本地值缺失并不意味着远程值缺失，因此在生成之前检查目标环境。`flags-sdk` 技能记录了如何生成缺失的值。不要将密钥打印到终端、日志或聊天中。

## Flags Explorer

Flags Explorer 是 Vercel Toolbar 面板，它列出应用的开关，并允许你通过一个用 `FLAGS_SECRET` 签名的 cookie 按浏览器覆盖它们（[Flags Explorer](https://vercel.com/docs/flags/flags-explorer)）。应用通过发现端点暴露其开关；Flags SDK 会生成它（`flags-sdk` 技能）。`vercel flags override <key>=<value>` 从终端生成相同的 cookie 令牌。

## 其他框架

对于没有 Flags SDK 入口点的框架，直接使用 `@vercel/flags-core`（[核心 SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)）。在模块作用域创建一个客户端，并在请求处理器内调用 `evaluate()` 或 `bulkEvaluate()`；两者都在首次使用时初始化客户端。不要添加模块作用域的 `client.initialize()` 调用，也不要缓存其 promise 供处理器 await。

```ts
// src/flags.ts
import { createClient } from '@vercel/flags-core';

const client = createClient();

// Call from a request handler, not during module loading.
export async function showNewCheckout(userId: string): Promise<boolean> {
  const result = await client.evaluate<boolean>('new-checkout', false, {
    user: { id: userId },
  });
  return result.value;
}
```

使用 OIDC 时，令牌可能来自请求上下文，并在模块加载期间可能不存在。即使内嵌定义也需要它来按令牌的 `project_id` 选择条目，本地 `.env.local` 凭据会掩盖这一时序问题。显式初始化是可选的，并且必须等到认证可用；稍后 await 一个已启动的初始化 promise 并不会把它移入请求上下文。在 Vercel 之外，传入 SDK 键：`createClient(process.env.FLAGS)`。

`evaluate()` 的第三个参数是评估上下文；其实体和属性名称必须与 Flags → Entities 下定义的名称匹配，以便发布和规则可以据此分桶。

## 参考资料

- **[references/cli.md](references/cli.md)**：`vercel flags` 概念如何映射到应用（键、类型、变体、回退值、定向属性、时间戳条件、认证、覆盖、内嵌定义），以及用于提升、验证、移除和归档开关的生命周期与安全检查清单。
