---
name: feature-flag-onboarding
description: >-
  为一个应用编排首次 Harness FME 引导。确认一个已启用的
  FME 账户/项目，然后选择一个经验证的非生产环境；如果不存在，则移交给
  管理员，而不是自行创建。检测代码库的语言和框架，然后将
  代码集成委托给 instrument-feature-flag——绝不复制其包装器
  设计或两次创建同一功能标志。在需要时通过单独批准的定向更改，
  验证两种不同的具名 treatment 结果实际生效，
  而不仅仅是默认/回退响应。
  从实时状态和非机密进度摘要恢复，而不是从
  检查点文件；绝不因不确定的缺失而重建功能标志，也绝不复用
  过期的批准。在要求为应用引导 FME、端到端设置功能
  标志，或证明功能标志实时生效时使用。不用于仅创建功能标志
  （create-feature-flag）、仅代码门控（instrument-feature-flag）、
  仅定向（update-flag-targeting），或指标/实验设置。
metadata:
  author: Harness
  version: 1.0.1
  mcp-server: harness-mcp
  summary: Set up and verify a first feature flag in an existing project; resume partial onboarding
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI, plus local application code access and (for live proof) runtime/build access; guidance-only or partial if application/runtime access is unavailable
---

# 功能标志引导

为新应用的首次端到端 FME 设置编排：确认范围、选择安全环境、检测代码库、委托代码集成，然后证明两种不同 treatment 确实实时运行。此技能负责排序和验证；它不重新实现功能标志创建、代码接线或定向更改——那些位于 `/create-feature-flag`、`/instrument-feature-flag` 和 `/update-flag-targeting`。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。所有写入都委托给所链接的技能——此技能只读。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `compact: false` | `harness list feature_flag --json --limit 50` |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params.feature_flag_name` | `harness get feature_flag <name> --json` |
| 获取定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag> --env <env-id> --json` |

## 说明

### 阶段 1：范围与账户检查

遵循 [scope-establishment.md](../../../references/scope-establishment.md)，将已确认的账户/组织/项目与应用代码仓库区分开。在 API 调用之前，按 [mcp-setup.md](../../../references/mcp-setup.md) 确定受支持的 CLI 或 MCP 传输层；CLI 用户无需配置 MCP。此工作流始于一个已存在的、启用 FME 的账户/项目。在该范围中验证所需的读取能力。401/403、缺少工具或空清单本身并不证明缺少授权：诊断实际错误，而不要为了绕过它而更改范围/传输层。缺少的账户/项目/启用前置条件交给有权限的用户/管理员，而非自动预配。

### 阶段 2：恢复检查（无检查点文件）

使用任何非机密进度摘要来识别范围/应用/功能标志，然后重新读取当前状态；摘要是上下文，不是证据或批准。在选择候选之前先询问含糊的身份。对已确认的 ID 优先使用**获取功能标志/定义**；仅在需要时使用已分页的发现。404 需要范围/标识符/访问检查，而非自动创建。不要仅从功能标志存在就推断应用集成或实时成功。

以**已验证 / 不完整 / 未知**跟踪传输层、环境、SDK/配置、功能标志/定义、应用集成/测试、结果 A/B 和最终状态，并附证据。在阶段 4/6 期间，除了远程状态外，还要检查实际的应用修订、SDK 初始化/包装器和测试。从第一个不完整的阶段恢复，而不重复已完成的变更；如果修订、环境、身份、treatment 或定向发生变化，则重新验证证据。绝不复用过期的批准。仅指导/缺少运行时访问则保持为部分完成。

### 阶段 3：选择一个非生产环境

复用一份完整的**列出环境**清单，并核实显式选择环境的 ID 和 `isProduction: false`；当选择已明确时不要再次询问。否则推荐一个隔离/测试环境并确认它。在断定不存在之前遵循[分页](../../../references/fme/tool-map.md#pagination)。若没有非生产环境，停止以移交管理员——绝不自行创建或静默使用生产环境。

### 阶段 4：检测代码库，然后澄清

让此序列可见：**检测 → 澄清 → 委托包装器计划。** 按 [language-guidance.md](../../../references/fme/language-guidance.md#phase-1-detect-before-asking) 做一次轻量检测（语言/框架/运行时、monorepo 布局、现有的 FME/OpenFeature/Classic-FF 使用情况）——足以挑选目标应用并知道 `/instrument-feature-flag` 是否会找到现有包装器。如果无法识别已安装的功能标志系统（仅 Classic FF，或未经验证的 OpenFeature 提供方），先停止并解决，再委托。总结检测到的内容，然后仅询问未解决的选择：目标应用/服务、目的和候选门控点、评估身份/流量类型、预期 treatment 结果/回退以及客户扩展需求。现有定义约束有效的 treatment 名称；对于新功能标志，仅在明确确认时才提议 `on`/`off` 之类的名称，绝不静默假定。不要在此设计包装器、SDK 配方或 treatment 映射——那完全属于阶段 6 的 `/instrument-feature-flag`。将每个已确认的事实向前传递，使被委托的技能绝不重复询问它们。

### 阶段 5：约定引导契约

确认复用已识别的功能标志或创建它的意图、一个环境、两种不同的预期结果、一个获授权的隔离测试主体以及期望的最终状态（包括移除/保留临时定向）。这些决策描述计划，而非一揽子写入批准。创建属于阶段 6 的埋点移交；不要在此单独创建功能标志。绝不要仅仅因为名称看似合理就选择一个无关的现有功能标志。

### 阶段 6：委托代码集成（架构由被调用方拥有）

以已确认的范围/传输层、应用/修订、检测到的技术栈/包装器、现有功能标志或提议的创建意图、**一个已选环境**、身份/流量类型、预期结果、回退和扩展需求加载 [instrument-feature-flag](../instrument-feature-flag/SKILL.md)。它校验契约、拥有已批准的抽象/代码编辑/测试，并将任何创建委托给 [create-feature-flag](../create-feature-flag/SKILL.md)，然后返回此处——无重复创建或递归移交。传递已确认的事实；仅澄清新的缺口。

要求返回资源 ID/读回、已批准的 treatment/身份映射、编辑后的修订、SDK/配置就绪状态和测试状态。缺少 SDK 凭据需要获授权的预配移交，绝不使用伪造的检索工具或 admin token 替换。如果代码测试失败或源/设置不完整，解决或报告为部分完成，并在实时定向更改之前停止。没有运行时访问最多意味着代码已测试/配置已验证，而非已完成引导。

### 阶段 7：证明 treatment A 实时生效

在测试定向变更之前，要求阶段 6 已验证集成/映射且有针对性的应用测试通过证据；仅指导性提议或功能标志存在是不够的。如果用户运行了测试，明确归属其报告的结果，而不是声称工具执行。确认运行中的应用包含该修订、使用所选环境的凭据**引用**，并已完成所安装 SDK 的真实就绪路径。请用户执行/授权任何必要的构建、重启或运行时检查；绝不自动部署。如果缺少前置条件或证据访问，停在部分完成，而不只是为了尝试测试就更改定向。

读取当前定义。如果需要更改，在全新批准下加载 [update-flag-targeting](../update-flag-targeting/SKILL.md)，以将 A 提供给约定的隔离主体；保留其他受众。其实验/治理检查和终止状态排序适用——绝不恢复过期定向或将 kill 用作通用的关闭开关。验证定义读回，然后让获授权的用户/运行时检查触发真实路径。记录修订、功能标志/环境、非敏感主体引用、观察到的 treatment 和应用行为。对于每个结果，确认本次调用来自真实的功能标志决策而非回退：使用所安装 SDK 支持的评估细节/原因、关联的曝光元数据，或能区分回退的获授权集成检查。仅就绪本身不够。不要臆造遥测 API、启用敏感日志、仅仅为通过而更改回退语义，或把 mock/离线/默认响应计为证据。如果可用证据无法区分结果，标记为未验证并在 B 之前停止。

### 阶段 8：证明 treatment B 实时生效

使用**同一功能标志、环境、应用修订和评估身份**，对 B 重复阶段 7 的读取/批准更改/读回/观察序列，使结果具有可比性。复用已验证的证据，而不是重复变更。如果中断或验证失败，报告实际当前状态和待清理项；不要自动终止或恢复快照。对每个待处理的变更遵循 [write-safety.md](../../../references/fme/write-safety.md)。

### 阶段 9：约定最终状态并总结

重新读取当前状态，并与阶段 5 约定的最终状态（包括临时测试定向）对账。仅在全新批准的 diff 下委托必要的更改，保留并发的无关更改；绝不恢复整个旧定义快照。验证最终读回。如果用户拒绝或清理无法完成，报告剩余内容并保持引导为部分完成。

按 [operation-summary.md](../../../templates/operation-summary.md) 总结：配置读回；代码测试（通过/失败/未运行）；观察到的实时 A/B 行为（已验证/未验证并附证据）；最终状态/清理；以及下一个不完整的阶段。完整完成需要有效的应用测试、两个真实结果以及经验证约定的最终状态。提供此非机密进度摘要以供恢复，而非强制的代码仓库检查点文件。

## 示例

- “为结账服务引导 FME”——通过阶段 1-9 的全新运行。
- “继续我们昨天开始的引导”——阶段 2 从实时状态恢复，无需检查点文件。
- “只用 CLI 设置，不用 MCP”——通过 CLI tool-map 行执行相同的阶段；MCP 从非强制。
- “目前还没有非生产环境”——停在阶段 3，移交管理员。
- “SDK 凭据未配置”——在集成期间解析凭据引用；在获授权用户预配之前停止测试定向变更。绝不用 admin API token 替换。
- “我不认识这个 SDK/语言”——停止并询问，而不是猜测一个跨语言模式。

## 性能注意事项

- 工具表的列表行获取的是页，不是完整清单。在做出缺失断言之前，复用已确认的 ID 并遵循[分页](../../../references/fme/tool-map.md#pagination)，包括 CLI `--offset`/`--limit`。远程功能标志存在不能确立 SDK、代码测试或运行时完成。
- 被委托的阶段（6-9）带有各自的确认/批准和审计协议；此技能负责排序，不复制它们。
- 即使背靠背，也将阶段 7 和阶段 8 视为两个单独的批准——单次确认不涵盖两者。

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| 此组织/项目未启用 FME | 停止；移交管理员——此技能不预配账户/项目 |
| 没有非生产环境 | 停止；移交管理员创建一个——绝不默认使用生产环境 |
| 恢复时功能标志/应用含糊 | 询问是哪个功能标志/应用，以实时状态作为上下文，而不是猜测或重建 |
| Treatment A/B 看起来与更改前相同 | 在提议任何获授权重启或新更改之前，检查运行时修订、环境/身份、SDK 就绪/传播、定向优先级和回退 |
| 仅观察到 mock/回退响应 | 不是证据——SDK 可能未就绪或未连接；在重新测试之前验证就绪状态和凭据 |

## 参考资料

- [language-guidance.md](../../../references/fme/language-guidance.md) — 先检测后询问、包装器复用、SDK/提供方契约（由 `/instrument-feature-flag` 拥有，此处仅作编排意识参考）
- [write-safety.md](../../../references/fme/write-safety.md) 和 [concepts.md](../../../references/fme/concepts.md) — 终止/恢复排序、实验检查
- [mcp-setup.md](../../../references/mcp-setup.md) — MCP/CLI 传输层选择
- [operation-summary.md](../../../templates/operation-summary.md) — 结构化完成摘要
- [tool-map.md](../../../references/fme/tool-map.md#common-errors) — 工具名称、参数、通用 Harness API 错误
