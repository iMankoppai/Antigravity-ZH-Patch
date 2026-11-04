---
name: dt-sec-semantic-mapping
description: "为新的安全集成建议并校验语义字典（SD）映射，可使用厂商 API 样本或实时事件。何时使用：将新的安全厂商数据映射到 Dynatrace SD；检查必需字段；校验命名空间；突出与语义字典的差异；提出映射改进建议；针对实时租户数据运行运行时校验。"
license: Apache-2.0
---

# dt-sec-semantic-mapping

为新的安全集成构建并校验对齐语义字典的映射。

## 用途

当用户想要执行以下操作时使用此技能：

- **建议**从厂商 API 输出到 Dynatrace `security.events` 字段的映射（工作流 A）。
- **校验**现有映射的完整性与质量，对照：
  - 本地基线样本和语义字典（工作流 B1 —— 静态、离线校验），或
  - 通过实时租户访问获取的实时租户数据（工作流 B2 —— 运行时校验）
- 突出与语义字典及本地参考之间的差异。
- 获得可操作的映射改进建议。

## 语义字典

语义字典（SD）定义了 `security.events` 的规范字段集。规范参考请参见 `references/semantic-reference.md`：本地与实时来源、可查询的 Grail 表、何时查询的决策矩阵，以及权威性规则（出现分歧时以实时 SD 为准）。

## 必需输入

在生成或校验映射之前，务必先运行 `references/intake-and-constraints.md` 中的摄取清单。如果输入不完整，请继续生成部分草稿，但须明确列出缺失的证据和置信度限制。

## 基线来源（自包含）

所有基线材料都位于此技能内部：

- `samples/` —— 覆盖所有发现类型和提供商的真实集成负载。当主要参考（SD、data-model-notes、known-discrepancies、validation-rules、object-type-expectations）对某个具体问题仍未解决时，作为后备查阅 —— 而不是每次运行工作流时的常规步骤。
- `references/semantic-reference.md` —— SD 参考、字段分类法、事件类型、提供商分类法和实体范围界定
- `references/validation-policy-and-reporting.md` —— 校验规则、可接受的差异和报告模板
- `references/intake-and-constraints.md` —— 摄取清单、输出契约、`object.type` 预期和 OpenPipeline 限制

## 事件类型覆盖要求

映射必须针对每个发现类别正确处理正确的 `event.type` 值集合。检测类集成是基于推送的，不使用扫描周期 —— 绝不为检测要求扫描事件。

完整表格、严重程度规则，以及当检测类映射错误地发出 `*_SCAN` 事件时的替代分类路径，请参见 [validation-policy-and-reporting.md](references/validation-policy-and-reporting.md#validation-rules) § 事件类型覆盖。

## 工作流

此技能以三种模式运行。从上下文识别模式：

| 模式 | 输入 | 流程来源 |
|---|---|---|
| **工作流 A** —— 建议新映射 | 仅原始厂商 API 负载 | `references/mapping-workflow.md § Workflow A`（阶段 1 映射表 → 用户批准 → 阶段 2 样本 JSON） |
| **工作流 B1** —— 静态校验 | 现有映射 + 厂商 API 样本 | `references/mapping-workflow.md § Workflow B` —— 分类输入模式（最终摄取 / 理论），应用规则，生成差异高亮表 |
| **工作流 B2** —— 运行时校验 | 现有映射 + 实时租户访问权限 | `references/runtime-validation.md` —— 先加载安全（AppSec）事件支持技能（必需的第 0 步），然后运行查询包，生成校验摘要表 |

所有工作流都遵循 `references/intake-and-constraints.md` 中的输出契约以及 `references/validation-policy-and-reporting.md` 中的报告模板。校验规则（事件类型覆盖、必需字段、扫描引用、命名空间要求、值/类型检查、厂商命名空间重复）位于 `references/validation-policy-and-reporting.md` 中。

## 可接受差异策略

可接受的 SD 偏差和厂商命名空间模式的规范列表，请参见 `references/validation-policy-and-reporting.md`。切勿对该列表中的字段提出严重/重大问题。真正未知的字段（既不在本地参考中，也不在实时 SD 中 —— 参见 `references/semantic-reference.md`）必须按照 `references/validation-policy-and-reporting.md` 予以质疑。

## 范围

此技能涵盖：

- 映射建议与细化（工作流 A）。
- 对照本地基线示例和语义字典进行静态校验（工作流 B1）。
- 通过实时租户访问对照实时租户数据进行运行时校验（工作流 B2）。
- 语义字典一致性检查。
- 差距分析与改进建议。

此技能不涵盖：

- 实时摄取管道部署。
- 运行时 DQL 性能基准测试。
- 租户侧摄取故障排查。

## 参考

- `references/semantic-reference.md` —— SD 参考及数据模型说明：本地来源、实时（可查询）来源、DQL 模式、何时查询的决策矩阵、权威性规则、字段分类法
- 涵盖完整 SD 访问模式和 Grail 表文档的技能 —— 用于针对 `security.events` 和 Grail 表的 DQL 查询模式
- [语义字典（公开文档）](https://docs.dynatrace.com/docs/semantic-dictionary/model/security-events)
- `references/intake-and-constraints.md` —— 摄取清单、输出契约、OpenPipeline 限制和 `object.type` 命名空间预期
- `references/mapping-workflow.md` —— 如何构建并细化映射候选方案
- `references/validation-policy-and-reporting.md` —— 完整校验规则集、已知差异和差异报告模板
- `references/runtime-validation.md` —— 可选的真实环境查询校验包
