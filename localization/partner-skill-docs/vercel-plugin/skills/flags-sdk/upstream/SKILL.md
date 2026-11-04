---
name: flags-sdk
description: >
  使用 Flags SDK（`flags` npm 包）在 Next.js 或 SvelteKit 代码中实现功能开关。
  在安装或配置 SDK、用 `flag()` 声明开关、接入提供商适配器
  （`@flags-sdk/vercel`、Statsig、LaunchDarkly、PostHog、GrowthBook、Global Config、
  OpenFeature、Split、Flagsmith、Reflag、Optimizely 或自定义）、使用 `identify`、`dedupe` 或
  `evaluate`、用预计算保持页面静态、设置 Flags Explorer 和 Vercel
  Toolbar，或加密开关值时使用。触发词：`flags/next`、`flags/sveltekit`、`flags/react`、
  `@flags-sdk/*`、`vercelAdapter`、precompute。对于规划开关、Vercel Flags 发布、
  实验和 `vercel flags` CLI，或其他框架，使用 `vercel-flags` 技能。
---

# 设置并使用 Flags SDK

Flags SDK（`flags` npm 包）是用于 Next.js 和 SvelteKit 的功能开关工具包。它将每个功能开关转换为可调用函数，通过适配器与任何开关提供商配合工作，并使用预计算模式保持页面静态。Vercel Flags 是第一方提供商；其适配器是 `@flags-sdk/vercel`。

- 文档：https://flags-sdk.dev
- 代码仓库：https://github.com/vercel/flags

本技能涵盖代码。规划开关、在 Flags SDK、`@vercel/flags-core` 和 OpenFeature 之间做选择，以及在仪表板中或用 `vercel flags` CLI 管理开关，属于 `vercel-flags` 技能。归档开关、删除它或移除变体需要该技能中的检查（先移除代码，确认在 Skew Protection 窗口内没有评估，在 `rm` 之前归档）；没有它不要运行这些命令。如果它不可用，建议 `npx skills add vercel/flags@vercel-flags`（不要自动安装），并在此期间运行 `vercel flags <cmd> --help`。对于使用其他框架的项目，`@vercel/flags-core` 取代本 SDK（[核心 SDK](https://vercel.com/docs/flags/vercel-flags/sdks/core)）。

当用户要求安装、配置或设置 SDK 时，遵循[设置 SDK](#set-up-the-sdk)（包括在缺少 `.env.local` 时的 `vercel env pull`）。当他们要求向代码添加开关时，遵循[创建开关](#create-a-flag)或[添加已在 Vercel 上存在的开关](#add-a-flag-that-already-exists-on-vercel)。在应用代码仓库内，将含糊的请求视为完整流程。不要把 CLI 步骤留作给用户的“后续步骤”；自己执行它们。

## 核心概念

### 开关即代码

每个开关都声明为一个函数。调用处没有字符串键：

```ts
import { flag } from 'flags/next';

export const exampleFlag = flag({
  key: 'example-flag',
  decide() { return false; },
});

const value = await exampleFlag();
```

### 服务端评估

开关在服务端评估，以避免布局偏移、保持页面静态并维持机密性。将路由中间件与预计算模式结合，以从 CDN 提供静态变体。

### 适配器模式

适配器替代开关声明上的 `decide` 和 `origin`，将你的开关连接到提供商。Vercel Flags（`@flags-sdk/vercel`）是第一方适配器。第三方适配器可用于 Statsig、LaunchDarkly、PostHog 等。

```ts
import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

export const exampleFlag = flag({
  key: 'example-flag',
  adapter: vercelAdapter,
});
```

> **版本说明**：SDK 以 `flags` 发布（从 `@vercel/flags` 重命名而来；旧名称仍出现在更新日志历史中）。`flags` 4.2.0+ 接受以引用方式传入适配器工厂（`adapter: vercelAdapter`），并在每次声明时解析一次。较旧版本需要调用它（`adapter: vercelAdapter()`）。调用形式在新版本上仍然有效，因此除非你针对 `flags` < 4.2.0，否则优先使用简写。

## 设置 SDK

一次性项目设置。当尚未安装 Flags SDK，或 Toolbar / Flags Explorer / `.env.local` 缺失时运行。跳过任何已完成的步骤。

### 开始之前

检查项目状态以调整命令并决定可以跳过哪些步骤：

- 存在哪个 lockfile（`pnpm-lock.yaml`、`package-lock.json`、`yarn.lock`、`bun.lockb`）？→ 相应地调整所有包管理器命令（`pnpm add`、`npm install`、`yarn add`、`bun add`）。
- `package.json` 中是否有 `flags`？→ 跳过安装（第 1 步）
- 项目是否已关联？→ 跳过第 2 步中的 `vercel link`
- `.env.local` 是否包含 `VERCEL_OIDC_TOKEN=`（或 `FLAGS=` SDK 键）？→ 环境变量已拉取，跳过第 3 步
- `package.json` 中是否有 `@vercel/toolbar`？→ 跳过 toolbar 设置（第 4 步）
- `flags.ts`（或 `lib/flags.ts`、`src/flags.ts`）是否存在？→ 跳过创建它（第 5 步）
- `app/.well-known/vercel/flags/route.ts` 是否存在？→ Flags Explorer 已设置，跳过第 6 步

### 步骤

1. **安装包**（如果 `package.json` 中尚无）：
   ```bash
   pnpm i flags @flags-sdk/vercel
   ```

2. **将项目关联到 Vercel**（`vercel env pull` 和本地 OIDC 令牌刷新所需）：
   > **先决条件**：Vercel CLI 必须已安装并已认证。如果未安装，运行 `pnpm i -g vercel`。对于认证或关联问题，如果 `vercel-cli` 技能已可用则遵循它。如果不可用，建议用户用 `npx skills add vercel/vercel@vercel-cli` 安装它（不要自动安装），并在此期间依赖 `vercel <command> --help`。

   用 `vercel project inspect --non-interactive` 验证关联，并检查报告的 owner 和项目名称；仅有 `.vercel/` 目录并不能证明存在关联。如果它报告 `link_required`，运行 `vercel link`。如果用户指定了项目或团队而输出不同，停止并询问，而不是重新关联。

3. **拉取环境变量**：如果 `.env.local` 缺少 `VERCEL_OIDC_TOKEN=`，遵循[拉取环境变量](#pull-environment-variables)。

4. **设置 Vercel Toolbar**（如果尚未存在）：
   - 运行 `pnpm i @vercel/toolbar`
   - 用 toolbar 插件包裹 `next.config.ts`
   - 在根布局中渲染 `<VercelToolbar />`
   完整代码见 [references/nextjs.md — Toolbar 设置](references/nextjs.md#toolbar-setup)。

5. **确保 `flags.ts` 存在**：如果缺失，创建 `flags.ts`（或匹配项目的 `lib/flags.ts` / `src/flags.ts`），包含 `export {}` 以便 TypeScript 将其视为模块。Flags Explorer 导入此文件——在发现路由之前创建它。

6. **设置 Flags Explorer**（如果尚未存在）：创建 `app/.well-known/vercel/flags/route.ts` —— 见 [Flags Explorer 设置](#flags-explorer-setup)。仅在 `flags.ts` 存在后才这样做。将导入指向真实的 flags 文件路径（代码片段假定根目录的 `flags.ts`）。

## 拉取环境变量

`vercel env pull` 将 Development 凭据写入 `.env.local`：`vercelAdapter` 在本地使用的 Vercel OIDC 令牌（部署会自动接收，[入门](https://vercel.com/docs/flags/vercel-flags/quickstart#pull-local-openid-connect-credentials)）以及用于 Flags Explorer 和覆盖的 Development `FLAGS_SECRET`。在以下情况运行它：

- `.env.local` 缺少 `VERCEL_OIDC_TOKEN=`（或 `FLAGS=` SDK 键）
- 你创建了项目的第一个开关；激活 Vercel Flags 会按环境创建 `FLAGS_SECRET`
- 本地评估因认证错误失败；SDK 通过已关联的项目刷新过期令牌，重新拉取是回退方案

SDK 键（`FLAGS`）仅用于 Vercel 之外的应用、自定义环境，或另一个项目的开关（[SDK 键](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)）。如果拉取后 `FLAGS_SECRET` 仍然缺失，按 [FLAGS_SECRET](#flags_secret) 生成它。

## 创建开关

当用户要求你创建或添加一个在 Vercel 上尚不存在的功能开关时，按顺序遵循这些步骤。如果开关已在仪表板中创建（提示中这样说，或 `vercel flags create` 报告键已存在），改为遵循[添加已在 Vercel 上存在的开关](#add-a-flag-that-already-exists-on-vercel)。

### 开始之前

- 如果包、Vercel 关联、`.env.local`、Toolbar、`flags.ts` 或 Flags Explorer 缺失，先完成[设置 SDK](#set-up-the-sdk)。跳过已完成的步骤。
- `.env.local` 是否包含 `VERCEL_OIDC_TOKEN=`？→ 环境变量已拉取；如果本地评估因认证错误失败，见[拉取环境变量](#pull-environment-variables)。
- `flags.ts`（或 `lib/flags.ts`、`src/flags.ts`）是否存在？→ 添加到它，而不是从头创建。

### 步骤

1. **确保 SDK 已设置**：如需要，遵循[设置 SDK](#set-up-the-sdk)，然后继续。

2. **向 Vercel 注册开关**：对已关联的项目运行 `vercel flags create <flag-key> --kind boolean --description "<description>"`，或传入 `--project <name-or-id>` 和 `--scope <team>`。选择与开关类型参数匹配的 kind；它之后无法更改。

3. **拉取环境变量**：如果这是项目的第一个开关，再次遵循[拉取环境变量](#pull-environment-variables)；激活创建了 `FLAGS_SECRET`。

4. **在代码中声明开关**：使用 `vercelAdapter` 将其添加到 `flags.ts`（如果文件不存在则创建）：
   ```ts
   import { flag } from 'flags/next';
   import { vercelAdapter } from '@flags-sdk/vercel';

   export const myFlag = flag({
     key: 'my-flag',
     adapter: vercelAdapter,
   });
   ```

5. **使用开关**：在页面或组件中调用它，并根据结果条件渲染：
   ```tsx
   import { myFlag } from '../flags';

   export default async function Page() {
     const enabled = await myFlag();
     return <div>{enabled ? 'Feature on' : 'Feature off'}</div>;
   }
   ```

## 添加已在 Vercel 上存在的开关

当开关已在仪表板中或由他人创建时使用此流程，例如提示说开关“已创建”或要求你运行 `vercel flags inspect`。不要为已存在的键运行 `vercel flags create`。

1. **确保 SDK 已设置**：如需要，遵循[设置 SDK](#set-up-the-sdk)。
2. **阅读定义**：运行 `vercel flags inspect <flag-key>`。记录 kind、变体（值和标签）、描述，以及每个环境提供什么。
3. **拉取环境变量**：如果 `.env.local` 缺少 `VERCEL_OIDC_TOKEN=`，遵循[拉取环境变量](#pull-environment-variables)。
4. **声明开关**：使用 `vercelAdapter` 将其添加到 `flags.ts`。映射 `inspect` 输出：
   - `key`：与打印完全一致的开关键
   - kind → 类型参数：`boolean` → `flag<boolean>`，`string` → `flag<string>`，`number` → `flag<number>`，`json` → `flag<YourType>`
   - `description`：从 `inspect` 复制
   - `defaultValue`：当开关被归档或评估失败时提供的值（通常是生产当前提供的值）
   - `options`：可选；当你使用预计算或希望在 Flags Explorer 中列出时，镜像变体
   - `identify`：当开关有定向时添加或复用一个，使用仪表板中配置的实体属性（见[带评估上下文的开关](#flag-with-evaluation-context)）
   ```ts
   export const welcomeMessage = flag<string>({
     key: 'welcome-message',
     description: 'Copy shown on the landing page',
     defaultValue: 'control',
     adapter: vercelAdapter,
   });
   ```
5. **使用开关**，如[创建开关](#create-a-flag)第 5 步。

## Vercel Flags 适配器

`@flags-sdk/vercel` 将 `flag()` 声明连接到 Vercel Flags。`vercelAdapter` 使用项目的 Vercel OIDC 令牌进行认证并评估当前环境的配置；SDK 键（`FLAGS`）仅用于手动认证：Vercel 之外的应用、自定义环境，或另一个项目的开关（[SDK 键](https://vercel.com/docs/flags/vercel-flags/dashboard/sdk-keys)）。激活 Vercel Flags 会为 Flags Explorer 按环境创建 `FLAGS_SECRET`。

关于用户定向、属性类型、自定义适配器配置、共享 `@vercel/flags-core` 客户端以及 Flags Explorer 端点，见 [references/providers.md — Vercel](references/providers.md#vercel)。

更改开关提供的内容（enable、set、split、rollout、rules、archive）在仪表板中或用 `vercel flags` 进行，而不是在代码中。`vercel-flags` 技能涵盖这些流程；`vercel flags <cmd> --help` 列出选项。

## 声明开关

使用 Vercel Flags 时，如[创建开关](#create-a-flag)所示用 `vercelAdapter` 声明开关。对于其他提供商，见 [references/providers.md](references/providers.md)。以下是通用的 `flag()` 模式。

### 基本开关

```ts
import { flag } from 'flags/next'; // or 'flags/sveltekit'

export const showBanner = flag<boolean>({
  key: 'show-banner',
  description: 'Show promotional banner',
  defaultValue: false,
  options: [
    { value: false, label: 'Hide' },
    { value: true, label: 'Show' },
  ],
  decide() { return false; },
});
```

### 带评估上下文的开关

使用 `identify` 确定请求是为谁发起的。返回的实体被传递给 `decide`：

```ts
import { dedupe, flag } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface Entities {
  user?: { id: string };
}

const identify = dedupe(
  ({ cookies }: { cookies: ReadonlyRequestCookies }): Entities => {
    const userId = cookies.get('user-id')?.value;
    return { user: userId ? { id: userId } : undefined };
  },
);

export const dashboardFlag = flag<boolean, Entities>({
  key: 'new-dashboard',
  identify,
  decide({ entities }) {
    if (!entities?.user) return false;
    return ['user1', 'user2'].includes(entities.user.id);
  },
});
```

使用 `vercelAdapter` 时，返回对象中的实体和属性名称（这里的 `user.id`）就是仪表板规则和 `vercel flags split|rollout|rules --by` 定向的对象。它们必须与仪表板中配置的实体和属性类型匹配。见 [references/providers.md — 用户定向](references/providers.md#user-targeting) 和[属性类型](references/providers.md#attribute-types)。

### 使用其他适配器的开关

适配器将开关连接到第三方提供商。每个适配器替代 `decide` 和 `origin`：

```ts
import { flag } from 'flags/next';
import { statsigAdapter } from '@flags-sdk/statsig';

export const myGate = flag({
  key: 'my_gate',
  adapter: statsigAdapter.featureGate((gate) => gate.value),
  identify,
});
```

所有受支持的适配器见 [references/providers.md](references/providers.md)。

### 关键参数

| 参数      | 类型                               | 描述                                          |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `key`          | `string`                           | 唯一的开关标识符                               |
| `decide`       | `function`                         | 解析开关值                              |
| `defaultValue` | `any`                              | 若 `decide` 返回 undefined 或抛出时的回退值     |
| `description`  | `string`                           | 在 Flags Explorer 中显示                              |
| `origin`       | `string`                           | 在提供商仪表板中管理开关的 URL         |
| `options`      | `{ label?: string, value: any }[]` | 可能的值，用于预计算 + Flags Explorer|
| `adapter`      | `Adapter`                          | 实现 `decide` 和 `origin` 的提供商适配器  |
| `identify`     | `function`                         | 为 `decide` 返回评估上下文（实体）   |

## 去重（Dedupe）

将共享函数（尤其是 `identify`）包裹在 `dedupe` 中，以便每个请求只运行一次：

```ts
import { dedupe } from 'flags/next';

const identify = dedupe(({ cookies }) => {
  return { user: { id: cookies.get('uid')?.value } };
});
```

注意：`dedupe` 在 Pages Router 中不可用。

## 批量评估

要一次评估**多个**开关，调用 `evaluate()`（来自 `flags/next`），而不是逐个 await 开关或使用 `Promise.all()`。要评估**单个**开关，只需调用它：`await myFlag()`。

```ts
import { evaluate } from 'flags/next';
import { flagA, flagB } from '../flags';

// avoid: each await blocks the next, so the flags resolve sequentially
const a = await flagA();
const b = await flagB();

// avoid: parallel, but each flag is evaluated in isolation
const [a, b] = await Promise.all([flagA(), flagB()]);

// prefer: shares work across the batch
const [a, b] = await evaluate([flagA, flagB]);
```

`evaluate()` 比两种方法都快。逐个 await 开关会使总延迟成为每个开关评估时间之和，而不是最慢的单个开关；而 `Promise.all()` 并行运行它们但孤立地评估每个。`evaluate()` 为整批一次性预读头、cookie 和覆盖，并让适配器在单次调用中解析一组，这减少了运行时管理的并行 promise 数量，并减少了异步工作被其他微任务打断的空间。

它接受一个**数组**（位置结果）或一个**对象**（键控结果）：

```ts
const [a, b] = await evaluate([flagA, flagB]);
const { a, b } = await evaluate({ a: flagA, b: flagB });
```

在 App Router 之外（Pages Router `getServerSideProps`/API 路由，或路由中间件），将请求作为第二个参数传入：`await evaluate([flagA, flagB], request)`。

`evaluate()` 始终在请求时评估开关。它不用于读取[预计算](#precompute-pattern)（静态）值——对于那些，使用 `getPrecomputed`（或用代码调用开关，`await myFlag(code, flagGroup)`）。

适配器可以通过实现可选的 `bulkDecide` 钩子来选择加入批处理。Vercel 适配器（`@flags-sdk/vercel`）实现了它——在解析数百个开关时评估时间大约减少 10 倍。实现 `bulkDecide` 见 [references/providers.md — 自定义适配器](references/providers.md#custom-adapters)，完整签名见 [references/api.md — `evaluate`](references/api.md#evaluate)。

## Flags Explorer 设置

### Next.js (App Router)

```ts
// app/.well-known/vercel/flags/route.ts
import { createFlagsDiscoveryEndpoint } from 'flags/next';
import { getProviderData } from '@flags-sdk/vercel';
import * as flags from '../../../../flags'; // adjust if flags live under lib/ or src/

export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData(flags);
});
```

### 使用外部提供商数据

当与 Vercel Flags 一起使用第三方提供商时，用 `mergeProviderData` 合并它们的数据。每个提供商适配器导出自己的 `getProviderData` —— 见 [references/providers.md](references/providers.md) 中的提供商专属示例。

### SvelteKit

```ts
// src/hooks.server.ts
import { createHandle } from 'flags/sveltekit';
import { FLAGS_SECRET } from '$env/static/private';
import * as flags from '$lib/flags';

export const handle = createHandle({ secret: FLAGS_SECRET, flags });
```

## FLAGS_SECRET

预计算和 Flags Explorer 所需。激活 Vercel Flags 会按环境创建一个值。保留现有值；不要在普通 SDK 设置中轮换它们。本地值缺失并不意味着远程值缺失：先检查目标环境，然后为 Development 遵循[拉取环境变量](#pull-environment-variables)。

仅为缺失某值的环境生成密钥。使用 32 个密码学随机字节，base64 编码，每个环境使用不同的值。将 Preview 和 Production 值标记为 Sensitive。将生成的值直接发送到存储，例如 `vercel env add` 的 stdin；不要将它们打印到终端输出、日志或聊天，或嵌入命令参数。

## 预计算模式

使用预计算以在使用功能开关的同时保持页面静态。中间件评估开关并通过重写将结果编码到 URL 中。页面读取预计算值而不是重新评估。

高层流程：
1. 声明开关并将它们分组到一个数组中
2. 在中间件中调用 `precompute(flagGroup)`，获得一个 `code` 字符串
3. 将请求重写到 `/${code}/original-path`
4. 页面从 `code` 读取开关值：`await myFlag(code, flagGroup)`

完整实现细节见框架专属参考：
- **Next.js**：见 [references/nextjs.md](references/nextjs.md) —— 涵盖 proxy 中间件、预计算设置、ISR、generatePermutations、多组
- **SvelteKit**：见 [references/sveltekit.md](references/sveltekit.md) —— 涵盖 reroute 钩子、中间件、预计算设置、ISR、预渲染

## 自定义适配器

创建一个适配器工厂，返回包含 `origin` 和 `decide` 的对象。完整模式（包括默认适配器和单例客户端示例）见 [references/providers.md](references/providers.md#custom-adapters)。

## 加密函数

用于在浏览器中保持开关数据机密（供 Flags Explorer 使用）：

| 函数                   | 用途                             |
| -------------------------- | ----------------------------------- |
| `encryptFlagValues`        | 加密已解析的开关值        |
| `decryptFlagValues`        | 解密开关值                 |
| `encryptFlagDefinitions`   | 加密开关定义/元数据   |
| `decryptFlagDefinitions`   | 解密开关定义            |
| `encryptOverrides`         | 加密 toolbar 覆盖           |
| `decryptOverrides`         | 解密 toolbar 覆盖           |

默认都使用 `FLAGS_SECRET`。示例：

```tsx
import { encryptFlagValues } from 'flags';
import { FlagValues } from 'flags/react';

async function ConfidentialFlags({ values }) {
  const encrypted = await encryptFlagValues(values);
  return <FlagValues values={encrypted} />;
}
```

## React 组件

```tsx
import { FlagValues, FlagDefinitions } from 'flags/react';

// Renders script tag with flag values for Flags Explorer
<FlagValues values={{ myFlag: true }} />

// Renders script tag with flag definitions for Flags Explorer
<FlagDefinitions definitions={{ myFlag: { options: [...], description: '...' } }} />
```

## 参考资料

详细的框架和提供商指南在单独的文件中，以保持上下文精简：

- **[references/nextjs.md](references/nextjs.md)**：Next.js 快速开始、toolbar、App Router、Pages Router、middleware/proxy、预计算、dedupe、仪表板页面、营销页面、suspense 回退
- **[references/sveltekit.md](references/sveltekit.md)**：SvelteKit 快速开始、toolbar、hooks 设置、带 reroute + middleware 的预计算、仪表板页面、营销页面
- **[references/providers.md](references/providers.md)**：所有提供商适配器——Vercel、Global Config、Statsig、LaunchDarkly、PostHog、GrowthBook、Flagsmith、Reflag、Split、Optimizely、OpenFeature 以及自定义适配器
- **[references/api.md](references/api.md)**：`flags`、`flags/react`、`flags/next` 和 `flags/sveltekit` 的完整 API 参考
