---
name: instrument-feature-flag
description: >-
  将应用代码置于现有 Harness FME 功能标志的门控之下。首先检测
  应用的语言、框架和任何现有的功能标志包装器；仅询问
  无法解决的事项（目标应用、主体身份、门控点、
  treatment/配置/回退名称、扩展需求）。优先使用现有
  包装器；否则提议一个薄薄的、客户可扩展的门面或钩子——
  绝不是新框架或第二个 SDK 客户端——在编辑之前获得批准。将
  具名 treatment 映射到分支，并带有安全的、不做布尔强制转换的回退，
  然后在包装器和调用点边界添加测试。新功能标志委托给
  create-feature-flag，使用实际选择的那一个环境；缺少
  定向则在全新批准下委托给 update-flag-targeting。不用于
  仅创建功能标志、指标（choose-metric、create-metric、
  instrument-metric），或首次引导（feature-flag-onboarding）。
  触发短语：将这段代码置于功能标志门控之下、添加功能标志检查、接入
  getTreatment、添加 SDK 评估调用。
metadata:
  author: Harness
  version: 1.0.1
  mcp-server: harness-mcp
  summary: Gate application code through an extensible flag abstraction, after stack detection and clarification
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI for flag reads, plus local application code access to make edits; guidance-only (no edits) if application access is unavailable
---

# 埋点功能标志

技能标识符：`instrument-feature-flag`。将应用代码置于现有 FME 功能标志的门控之下：先检查真实的应用，优先使用或设计一个小型客户可扩展的包装器，获得批准，实施最小编辑，并在包装器和调用点边界测试。相关：`/create-feature-flag`（新功能标志）、`/update-flag-targeting`（缺失/不足的定向）、`/feature-flag-onboarding`（首次设置，其为代码委托到此）。

## 工具

通过 Harness MCP 服务器或 Harness CLI 工作；名称来自 [tool-map.md](../../../references/fme/tool-map.md)。此技能仅读取所选环境的 Harness 功能标志状态——功能标志/定义写入委托给 `/create-feature-flag` 和 `/update-flag-targeting`。

| 操作 | MCP | CLI |
|-----------|-----|-----|
| 列出功能标志 | `harness_list` · `fme_feature_flag` · `size: 50` · `compact: false` | `harness list feature_flag --json --limit 50` |
| 获取功能标志 | `harness_get` · `fme_feature_flag` · `params.feature_flag_name` | `harness get feature_flag <name> --json` |
| 列出环境 | `harness_list` · `fme_environment` · `compact: false` | `harness list fme_environment --json` |
| 列出流量类型 | `harness_list` · `fme_traffic_type` · `compact: false` | `harness list traffic_type --json` |
| 获取定义 | `harness_get` · `fme_feature_flag_definition` · `params: { feature_flag_name, environment_id }` | `harness get feature_flag:definition <flag> --env <env-id> --json` |

## 说明

### 阶段 1：范围

遵循 [scope-establishment.md](../../../references/scope-establishment.md)。从请求/调用方携带已确认的账户/组织/项目、传输层和应用目标；在 API 调用之前仅询问缺失的上下文。将 Harness 范围与应用代码仓库/运行时保持分开——绝不从一方推导另一方。受支持的 CLI 或 MCP 选择参见 [mcp-setup.md](../../../references/mcp-setup.md)。**列出环境**，并在任何功能标志/定义移交之前要求**一个明确确认的环境**。解析其 ID 和 `isProduction`；如果未选择或选择含糊，询问并停止——绝不继承全环境默认值。此选择不授权写入。

### 阶段 2：在集成问题之前检测代码库

检查真实应用：语言/框架/运行时和包管理器（锁文件/清单）、monorepo 中哪个应用/包看似合理、已安装的 FME/OpenFeature/Classic-FF SDK 及其版本，以及任何现有的功能标志包装器/门面（grep 与功能标志相邻的辅助名称，而不仅是原始 SDK 调用）。检测信号参见 [sdk-patterns.md](../../../references/fme/sdk-patterns.md)，原生 FME/OpenFeature/Classic-FF 契约表参见 [language-guidance.md](../../../references/fme/language-guidance.md#phase-3-sdk--provider-identification)——FME 原生 treatment 是**名称**，而非布尔值，批量/配置/异步评估调用有各自的结果形状；绝不假定它们共享一个签名。**停止：** 仅 Classic FF 的代码仓库且没有匹配的 FME 功能标志；或配置目标（FME 项目/环境）未经验证的 OpenFeature 提供方——在将 `getBooleanValue`/等视为关于此功能标志的证据之前先确认它。在询问集成问题之前，用 3–5 条要点总结检测到的事实。没有应用访问时，询问缺失的非机密上下文并仅提供指导：不臆造文件位置、编辑或测试成功。缺少 SDK 是设置情形，而非未知签名例外：从经验证的官方文档提议一个适合运行时的包，并在批准计划中包含安装/版本更改。

### 阶段 3：仅询问检查未解决的事项

仅询问阶段 2 未解决的事实，绝不要重复询问检查已确认或调用技能（例如 `/feature-flag-onboarding`）已提供的事实：
1. 目标应用/包，如果 monorepo 有多个看似合理的目标。
2. 评估主体键来源和流量类型，如果存在多个身份候选（用户 vs 账户 vs 匿名）。
3. 确切门控点——如果多个位置看似合理，给出候选 `file:line`。
4. 此调用点必须分支的具名 treatment/配置，以及 `control`/错误的安全回退。
5. 扩展需求——应用或其客户以后是否会添加 treatment/分支，而无需再次触碰此调用点？

### 阶段 4：解析功能标志定义

使用已确认的名称和范围**获取功能标志**。404 不是需要新功能标志的证据：按 [tool-map.md](../../../references/fme/tool-map.md#common-errors) 重新检查标识符、范围和访问。仅在解决真正的缺失以及用户的创建意图之后，以已确认的范围/传输层、名称/目的、流量类型、treatment 名称/配置/安全默认值、已知描述/工单和**一个已选环境**加载 [create-feature-flag](../create-feature-flag/SKILL.md)；携带用户确认的事实，而不是推导新的默认值。其自身的已批准计划控制创建。披露批准资源创建并不批准后续的应用编辑；取消会留下一个需要报告的资源，而非自动删除。要求返回的读回/ID 与该契约匹配，然后在此恢复而不再次创建。已归档的功能标志不是活动的集成目标：停止并澄清；任何生命周期更改都是单独的请求。

对于现有功能标志，对照**列出流量类型**和已批准的评估主体来源确认返回的 `trafficType`。用户/账户/设备身份不匹配是停止并澄清的情况——不要从键的格式推断语义兼容性，也不要静默更改它。在该环境中**获取定义**，并将阶段 3 与确切、区分大小写的 treatment 名称和配置对账。缺失的定义或所请求的 treatment 更改仅在确认该意图后、在其单独的批准下交给 [update-flag-targeting](../update-flag-targeting/SKILL.md)。一个当前未分配流量的 treatment 并**不**要求仅为写入/测试其代码分支而更改定向。绝不要作为埋点的副作用扩大发布。

### 阶段 5：设计集成

**优先使用阶段 2 中找到的现有包装器/门面**——扩展它，不要创建第二个。如果不存在，默认建议：一个薄薄的、符合习惯的、**应用拥有的**门面（服务器代码的服务模块/函数，组件框架的领域特定自定义钩子），它：
- 拥有 SDK 客户端的就绪状态和此功能标志的唯一评估调用。
- 暴露符合习惯的应用面向契约，保留所需的 treatment/配置和异步语义。保留现有的类型化提供方/包装器契约；布尔辅助函数需要明确批准的 treatment 映射，绝不做字符串真值判断。
- 保持客户特定行为可扩展，而无需散落原始 SDK 调用。约定所需的扩展点；不要构建插件框架或假定未来的 treatment 名称。添加活动 treatment 仍是单独的已批准定义更改。

绝不引入新的通用/跨功能标志框架、第二个 SDK 客户端或猜测的跨语言签名——对照已安装 SDK 的类型/版本或现有调用进行验证。没有包装器的直接 SDK 调用是例外，而非默认：仅当语言/框架使包装器不切实际时才提议它，解释权衡，并为该特定选择获得明确批准。仅检查非机密配置/凭据引用（参见 [language-guidance.md](../../../references/fme/language-guidance.md#credentials-and-dependencies)）——绝不打印、请求或硬编码凭据值。展示提议的接口/位置、调用点、treatment 到分支的映射、就绪/错误/已配置回退行为、依赖/配置更改和聚焦测试计划。通过[语言指导](../../../references/fme/language-guidance.md#credentials-and-dependencies)验证已安装的签名并确认缺失的 SDK/凭据前置条件；没有声明的工具能检索 SDK 密钥。**停止并等待对这些编辑及任何依赖/版本更改的明确批准**。重新确认已更改的计划；资源创建批准不是编辑应用的批准。

### 阶段 6：实施

做最小的编辑：仅在缺失时进行 SDK 初始化/包装器、包装器的评估调用，以及使用该包装器的调用点。复用 SDK 为此环境和身份现有的客户端/工厂生命周期——不要为每次评估实例化一个客户端——但这不是通用的“永远一个客户端”规则；遵循已安装 SDK 的文档化模式。显式映射每个具名 treatment；将 `control` 和任何未映射/意外的值路由到约定的安全回退——绝不要把非空 treatment 字符串通过真值判断视为“已启用”。配置的回退 treatment 是一种安全行为，而非功能标志实时评估的证据——绝不把回退/离线/mock 的结果报告为成功评估。使用已批准的契约处理未就绪状态、意外 treatment 和缺失/格式错误的配置；保留框架钩子的顺序和清理。不要添加未请求且未批准的日志、分析、缓存或 PII 捕获。

### 阶段 7：测试

在应用现有框架中于两个边界添加/更新聚焦测试：(1) 包装器——每个已批准的 treatment、身份隔离、就绪/错误/已配置回退和格式错误配置的行为；(2) 调用点的分支和安全回退。运行安全的聚焦测试；未经批准不要安装新的测试框架。如果测试无法运行，说明原因并标记为**未运行**，而非通过。Mock 验证代码行为，而非实时评估。实时证据属于调用的引导工作流或单独授权的运行时检查；绝不自动启动引导、部署、提交或开启 PR。

### 阶段 8：总结与移交

报告应用/修订、功能标志和所选环境 ID、已批准的主体来源/流量类型契约（无敏感值）、编辑位置、treatment/回退映射、依赖/配置更改、被委托资源的读回和测试（通过/失败/未运行）。将实时行为单独报告为已验证并附具名证据，或未验证。在仅指导模式下，列出提议的步骤和限制，而不是声称编辑。将证据返回给调用方，而不要递归调用它或重复询问已确认的事实。

## 示例

- “将新的结账流程置于 `checkout-v2` 功能标志的门控之下”——检测并澄清，读取其实时定义，然后提议包装器集成；现有功能标志并不构成跳过这些步骤的理由。
- “为这个特性添加功能标志检查，目前还没有功能标志”——阶段 4 以所选的那一个环境将创建委托给 `/create-feature-flag`，然后在阶段 5 恢复。
- “用每个 treatment 的配置和安全回退接入 `v1`/`v2`/`v3` treatment”——明确确认每个 treatment 的配置形状和回退；绝不要假定 `off`。
- “构建一个客户可扩展的包装器，以便商家以后添加自己的 treatment”——阶段 5 提议一个带 treatment 到处理器映射扩展点的门面；批准、实现，然后为每个处理器添加包装器级和调用点测试。
- “我现在没有应用代码仓库的访问权限”——询问必要的非机密上下文并仅提供指导；实现、确切位置和测试保持未验证。
- “此代码仓库只有 Classic FF，不是 FME”——按阶段 2 停止。

## 性能注意事项

- 阶段 2 检测替代了若干阶段 3 问题；保持检查成比例——一旦识别出门控点和 SDK 就停止，不要详尽地 grep 整个代码仓库。
- 列表使用 `compact: false`；所有读取都携带显式范围。工具表的列表行是页请求，不是完整清单：遵循[分页](../../../references/fme/tool-map.md#pagination)，使用 CLI `--offset`/`--limit` 直到确立完整性。仅当功能标志身份未知时，才将**列出功能标志**用于已批准的发现；优先使用已确认的 ID/直接获取。
- 被委托的创建/更新带有各自的确认/批准和审计注释；此技能不复制该协议。

## 故障排查

| 问题 | 解决方案 |
|---------|----------|
| Get flag 返回 404 | 先重新检查范围、标识符和访问。只有确认缺失加上明确的创建请求才能移交 `/create-feature-flag` |
| 定义缺失或定向不足以支持约定的 treatment | 在全新批准下委托给 `/update-flag-targeting` |
| 代码中的 treatment 名称与实时 `treatments` 数组不匹配 | 重新读取定义；修复代码引用，绝不要重命名实时 treatment 以匹配代码 |
| 无法判断哪个应用/包是门控目标 | 询问——不要从功能标志的名称或流量类型猜测 |
| 代码仓库仅使用 Classic FF，或来源未知的 OpenFeature 提供方 | 停止；在编写任何评估代码之前确认实际的功能标志系统 |

## 参考资料

- [language-guidance.md](../../../references/fme/language-guidance.md) — 技术栈检测、包装器复用/扩展点、SDK/提供方契约、凭据
- [sdk-patterns.md](../../../references/fme/sdk-patterns.md) — 评估/跟踪调用签名和搜索模式
- [concepts.md](../../../references/fme/concepts.md) — treatment、`control`、终止状态
- [mcp-setup.md](../../../references/mcp-setup.md) — MCP/CLI 传输层选择
- [tool-map.md](../../../references/fme/tool-map.md#common-errors) — 工具名称、参数、通用 Harness API 错误
