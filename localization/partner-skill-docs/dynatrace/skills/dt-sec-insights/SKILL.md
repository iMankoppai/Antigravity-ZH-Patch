---
name: dt-sec-insights
description: >-
  使用 DQL 查询并分析 security.events 中的 Dynatrace 安全数据：
  漏洞、威胁检测、合规态势和扫描覆盖。
  涵盖 Dynatrace 原生的运行时漏洞分析（RVA —— CVE、
  可达性、暴露、利用）、运行时应用保护（RAP）、
  自动检测和 Security Posture Management
  （KSPM/CSPM），以及外部安全产品和工具。触发词：
  "open critical vulnerabilities"、"vulnerable functions in use and publicly
  exposed"、"top vulnerable libraries / K8s workloads"、"CIS/DORA compliance
  pass rate"、"SQL injection detections"、"map external findings to workloads"、
  "hosts not covered by scanning"。不用于解释现有 DQL
  （使用 dt-dql-essentials）、Davis 问题（dt-obs-problems）、日志（dt-obs-logs）、
  分布式追踪（dt-obs-tracing）、服务 RED 指标（dt-obs-services），
  或平台使用/审计遥测（dt-platform）。
license: Apache-2.0
---

# 安全洞察技能

使用 DQL 查询并分析 `security.events` 中的 Dynatrace 安全数据。事件
来自 **Dynatrace 原生来源**（RVA、RAP、自动检测、SPM）或
通过集成摄取的**外部产品**（AWS Security Hub、Amazon
GuardDuty、GitHub Advanced Security、Snyk、Qualys、Tenable 等）。

## 此技能涵盖的内容

- **漏洞管理** —— Dynatrace 原生 RVA 对运行代码的开放 CVE
  （按 Dynatrace 安全分数和四维运行时
  评估排序风险：使用中的易受攻击功能、公共网络暴露、可达的
  数据资产、可用的公开利用），加上外部 SCA / SAST / 镜像扫描器。
- **合规态势** —— Dynatrace 原生 KSPM（仅 Kubernetes：CIS、DORA、NIST、
  STIG）加上 CSPM/VSPM 和外部合规/态势提供商。
- **运行时攻击和威胁** —— Dynatrace 原生检测（RAP 运行时攻击、
  自动检测规则）加上外部检测提供商。
- **威胁情报** —— 外部威胁情报报告（AlienVault OTX
  pulses、CrowdStrike Falcon Intelligence），带行为体 / 活动 / 目标定位上下文
  和入侵指标（IOC）；将报告的 IOC / CVE / 技术关联到
  你受监控的环境。**这些是关于外部世界的威胁情报 —— 而非
  你实体上的发现 —— 并且单独查询。**
- **扫描覆盖分析** —— 按 Dynatrace 扫描功能
  （`Library Vulnerability Analytics`、`Operating System
  Vulnerability Analytics`、`Code-level Vulnerability Analytics`）或按外部
  产品，统计已覆盖 vs. 未覆盖的 k8s 工作负载/主机/进程。
- **实体富化** —— 通过 Smartscape 将外部发现映射到 Dynatrace 运行时实体
  （主机、K8s 工作负载、云资源）。
- **仪表板 / KPI** —— 磁贴、top-N 表、趋势图、覆盖环图。

## 何时使用此技能

✅ **必须优先的路由规则：** 先识别用户意图，然后在生成 DQL 之前从 **快速开始：找到你的用例** 加载匹配的主要参考。识别意图，然后在编写 DQL 之前加载匹配的参考。

**跨领域（任何 / 所有发现类型）**

| 意图 / 示例 | 参考 | 模式 |
|---|---|---|
| 跨所有产品的安全态势 / 概览（含 Dynatrace 原生） | `all-security-events.md` § 宽泛问题查询分解 | 3 流分解（外部+检测 `24h` / RVA `30m` / KSPM `1h`），合并；**计数摘要以 KSPM 合规领先 —— CIS 优先**（其他标准 + RVA + 检测在其下）→ `compliance.md` § CIS 主要标准摘要 |
| 特定实体上的发现 —— 直接或相关（爆炸半径） | **dt-sec-contextualization** `entity-enrichment.md` · `all-security-events.md` | **宽泛实体安全问题必须分解**：外部 `*_FINDING` 按 `dt.smartscape_source.id` / `dt.entity.*` / `k8s.*`（`24h`）+ DT RVA 实体范围（`30m`）+ DT SPM 实体范围（`1h`） |
| 来自特定提供商的发现 | `all-security-events.md` § 限定到特定提供商 | `contains(lower(event.provider \| product.vendor), "<p>")` |
| 哪些**第三方 / 外部**工具在发送数据（排除 Dynatrace 原生） | `all-security-events.md` § 哪些外部集成处于活跃状态 | 仅外部枚举（单个查询） |
| 集成了哪些安全产品？/ 我们有哪些安全数据？（默认：**包含 Dynatrace 原生** RVA + KSPM） | `all-security-events.md` § 宽泛问题查询分解 | 3 流分解；绝不用单个宽泛 `security.events` 扫描 |
| 哪些产品覆盖特定实体 | **dt-sec-contextualization** `correlation-and-coverage.md` · `all-security-events.md` | 按 `product.*` 汇总；发现 vs 扫描拆分 |

> **路由决胜规则：** 未限定的"集成了哪些安全产品？/ 我们是否覆盖？/ 我们有什么？"默认使用**包含 DT 的 3 流分解**（它*必须*查询 DT 漏洞和合规）。仅在用户明确限定到外部 / 第三方工具（"哪些外部工具向我们发送数据？"）时，才采用仅外部的单查询。

**漏洞（CVE 管理）**

| 意图 / 示例 | 参考 | 模式 |
|---|---|---|
| 计数 / 严重程度（"多少严重？"，按风险 + 静音状态） | `vulnerabilities-dynatrace.md` | RVA 快照步骤 1–3 |
| 最易受攻击的组件 / 主机 / 工作负载（排名） | `vulnerabilities-entities.md` | 步骤 1–3 + `expand` 类型化 `related_entities.<group>.ids` → 在 `id_classic` 上 `smartscapeNodes` lookup —— ⚠ RVA 事件上 `k8s.*`/`dt.entity.*` 为 null |
| CVE / 库查找；"我是否受 log4shell 影响？" | `vulnerabilities-dynatrace.md` § 实体范围 | 步骤 2 CVE/组件过滤器；将 RVA 限定到已知实体 |
| 爆炸半径 —— 哪些实体受 CVE X 影响 | `vulnerabilities-entities.md` | `related_entities.*` 间接关系展开 |
| 生命周期 —— 新增 / 已解决 / 开放持续时间 / MTTR | `vulnerabilities-dynatrace.md` | 后推导 `resolution.change_date`；MTTR 通过仅变更事件片段（§ 解决时间） |
| 运行时高级 —— 使用中的功能、暴露、利用、数据资产 | `vulnerabilities-dynatrace.md` | Davis 评估 `fieldsAdd`（步骤 3） |
| 外部扫描器漏洞 —— 容器 / 制品 / 组件 | `vulnerabilities-external.md` | `VULNERABILITY_FINDING` + 外部路由 |
| 用 RVA 验证外部漏洞发现 | `vulnerabilities-external.md` § 用 RVA 验证外部漏洞发现 · **dt-sec-contextualization** `entity-enrichment.md` | 先按 `vulnerability.references.cve` 匹配相同漏洞；然后通过直接 `dt.smartscape*` ID、容器镜像摘要 → 运行中的 `CONTAINER`，或主机 `host.ip` → Smartscape HOST 证明运行时相关性 |
| "本期间新报告**且不在上一期间**"（外部） | `vulnerabilities-external.md` · `common-patterns.md` § 18 | 上一期间**反连接**（`isNull(right.*)`）—— `finding.time.created` 过滤器**不**等效 |
| AI/LLM/GenAI 工作负载漏洞；"哪些 AI 服务有漏洞？" | `vulnerabilities-dynatrace-advanced.md` § AI 工作负载漏洞 | **先探测 `smartscapeNodes "GENAI_SERVICE"`** —— 零行 → 报告无法确定（无 GenAI 受监控服务）；非零 → DT 发现 + GENAI 范围（`30m`，按 `finding.id` 去重）。⚠ 零行 = 硬停止 —— **不允许任何后备**：实体/命名空间/工作负载名称子串、ML 库组件列表、进程/镜像/标签模式都是禁止的替代品。 |
| 本期间新增的 AI 工作负载漏洞 | `vulnerabilities-dynatrace-advanced.md` § UC-AI2 | 在 `{genai_service.id, vulnerability.id}` 上的上一窗口**反连接** |

**检测（威胁和攻击）**

| 意图 / 示例 | 参考 | 模式 |
|---|---|---|
| 严重程度 / 时间窗口概览（DT + 外部） | `detections.md` · `all-security-events.md` | `DETECTION_FINDING` 摘要；默认未限定时间范围为 `2h`，仅在为空时加宽到 `24h` |
| 按攻击类型（`SQL injection`、加密挖矿等） | `detections.md` | `finding.type` 子串匹配 |
| 攻击者 IP / 活动 | `detections.md` | `expand actor.ips` + `ip()` |
| MITRE 技术 / 子技术 | `detections.md` | `threat.attack.*` 数组 |
| 仅 RAP / 仅自动检测 | `detections.md` § 提供商路由 | `product.name=="Runtime Application Protection"` / `event.provider=="Dynatrace Automated Detections"` |
| 将检测映射到实体；重复触发 | `detections.md` · **dt-sec-contextualization** `entity-enrichment.md` | `object.id` 分组 / 富化 |
| 特定外部提供商 | `all-security-events.md` § 限定到特定提供商 | 提供商 `contains` 惯用法 |

> **MITRE 路由决胜规则：** MITRE ATT&CK 问题按意图路由。"我们**检测到 / 观察到**（在我们实体上）哪些技术？" → `detections.md`（`DETECTION_FINDING`）。"**威胁情报 / 外部世界的活动**报告了哪些技术？" → `threat-intelligence.md`（`THREAT_REPORT`）。不要合并两者 —— 标记为 T1059 的报告不是 T1059 在你的环境中发生的证据。

**威胁情报（外部报告和 IOC）**

| 意图 / 示例 | 参考 | 模式 |
|---|---|---|
| 显示 / 列出 / 计数威胁情报报告；按提供商、行为体、恶意软件家族、目标国家/行业、TLP、报告类型 | `threat-intelligence.md` | `THREAT_REPORT` + **`dedup {threat.report.id}`**（先 SD 防护）；**绝不**使用四键发现 summarize |
| 跨报告的顶级 IOC（CVE / IP / 域名 / URL / 邮箱 / 哈希）或 MITRE 技术 | `threat-intelligence.md` § IOC 提取 | `dedup` → `expand` observable → `countDistinctExact(threat.report.id)` |
| **我是否暴露于报告 X / 这些 IOC 是否在我的环境中？**（威胁暴露） | `threat-intelligence.md` § 威胁暴露关联 | `join` 报告 IOC/CVE/技术与 `VULNERABILITY_FINDING`/RVA/`DETECTION_FINDING`；**日志/跨度 IoC 搜寻 → `dt-sec-ioc-hunting`** |

**合规（策略违反和基准）**

| 意图 / 示例 | 参考 | 模式 |
|---|---|---|
| 通过率 / 态势（CIS / DORA / NIST / STIG） | `compliance.md` | **先加载 `compliance.md`** —— SPM 步骤 1–2 + passRate |
| 严重错误配置 | `compliance.md` | **先加载 `compliance.md`** —— 步骤 1–2 + 严重程度过滤器 |
| **特定实体**上的合规 / 错误配置 | `compliance.md` § 实体安全标签页视图（实体范围 `${entityIdsOrNames}` 过滤器）· `entity-enrichment.md` | 镜像实体**安全标签页**（CIS 默认、仅失败）：表 1 DT CIS 失败规则 → 表 2 其他 DT 标准（重叠注意）→ 表 3 外部错误配置。宽泛态势/计数问题改用 § CIS 主要标准摘要（记分卡）。 |
| 将控制/标准映射到实体；按命名空间 | `compliance.md` | 通过 `compliance.standard.short_name` / `compliance.rule.id` 进行实体范围（⚠ 绝不用 `metadata_json`） |
| 云 / 非 K8s（PCI/ISO/HIPAA/GDPR；AWS/Azure/GCP） | `compliance.md` § 外部 | 外部分类法（`compliance.standards`/`policy`/`control`） |
| 按标准 / 框架分组的外部违规 | `compliance.md` § 外部 | `compliance.standards` 是**数组** —— 在 `summarize` 前 `expand` 它 |
| 配置**漂移** / 与上周相比新失败的规则（DT） | `compliance.md` § 周环比配置漂移 | 上一期间**反连接** —— 宽泛的 fetch 窗口**不**是替代品 |
| 本期间新增、上一期间不存在的外部合规发现 | `compliance.md` § 外部 | 上一期间反连接（与漂移相同规则） |
| KSPM（仅 Kubernetes，Dynatrace 原生） | `compliance.md` | `product.name=="Security Posture Management"` |

**覆盖、富化和仪表板**

| 意图 / 示例 | 参考 | 模式 |
|---|---|---|
| 覆盖 / "已覆盖 vs 未覆盖" / 覆盖缺口 —— 主机 / 进程 / 工作负载 | `coverage-and-dashboards.md`（计数逻辑）· **dt-sec-contextualization** `correlation-and-coverage.md`（匹配配方） | ⚠ **必须从 `smartscapeNodes` + `lookup` 扫描事件开始** —— 仅汇总扫描事件没有分母，无法回答覆盖问题 |
| 特定实体被某 DT 能力（RVA、SPM、RAP、其他 Dynatrace 原生）覆盖 | `coverage-and-dashboards.md` | 如果该能力在运行窗口内该实体没有相关发现或扫描/完成事件，回答**未覆盖** —— 该能力很可能未启用或未针对该实体配置 |
| 将外部发现映射 → 工作负载 / 主机 / 云 | **dt-sec-contextualization** `entity-enrichment.md` | 3 方匹配（K8s）/ 按 IP 的主机 / 路径 1（云）—— ⚠ **始终连接到 Smartscape；绝不单独按原始 `object.name` / `k8s.namespace.name` / `host.name` / 云资源 ID 对发现分组** |
| 每实体一行的风险摘要 | **dt-sec-contextualization** `entity-enrichment.md` · `coverage-and-dashboards.md` | RVA + 外部合并 |
| 仪表板 —— KPI 磁贴、top-N、趋势、环图 | `coverage-and-dashboards.md` | `makeTimeseries`、汇总配方 |

❌ **不用于：**

- Dynatrace 检测到的问题 → `dt-obs-problems`
- 应用/基础设施日志 → `dt-obs-logs`
- 分布式追踪 → `dt-obs-tracing`
- 服务性能/RED 指标 → `dt-obs-services`

## AppSec 数据简介

所有安全事件存储在 **`security.events`** 中，并按 `event.type` 分类：

- **RVA 漏洞** —— `VULNERABILITY_STATE_REPORT_EVENT`（每实体 15 分钟快照）
- **KSPM 合规** —— `COMPLIANCE_FINDING`（按 `(rule, K8s object)`，与 `COMPLIANCE_SCAN_COMPLETED` 在 `scan.id` 上连接以进行最新扫描去重）
- **外部合规（CSPM / VSPM / 外部态势工具）** —— `COMPLIANCE_FINDING` 带外部分类法（`compliance.standards` / `compliance.policy` / `compliance.control`）；`compliance.rule.*` 通常为 null
- **检测** —— `DETECTION_FINDING`（RAP 通过 `product.name == "Runtime Application Protection"`）、`SECURITY_EVENT`（某些租户中的 RAP 事件）、自动检测通过 `event.provider == "Dynatrace Automated Detections"`、外部安全工具；以及用于按规则运行审计的 `DETECTION_EXECUTION_SUMMARY`（仅自动检测）
- **扫描覆盖** —— `VULNERABILITY_SCAN`、`COMPLIANCE_SCAN`
- **威胁情报** —— `THREAT_REPORT`（外部 TI 平台：AlienVault OTX pulses、CrowdStrike Falcon Intelligence）。**一类单独的数据 —— 不是发现：** 没有 `finding.*` / `object.*` / `dt.security.risk.level`，没有受影响实体，没有扫描周期。**绝不并入跨提供商发现摘要或态势概览分解** —— 通过 [threat-intelligence.md](references/threat-intelligence.md) 单独查询。按 `threat.report.id` 去重。

完整分类法和字段参考 → [data-model.md](references/data-model.md)

### 关键约束：快照窗口

DT RVA 和 KSPM 是**快照工具**，不是事件流。每个管道所需的最小查询窗口：

- **RVA**：`30m` 固定窗口（捕获最新的 15 分钟周期）；如果 30m 快照为空或明显过时，使用 [vulnerabilities-dynatrace.md](references/vulnerabilities-dynatrace.md#latest-known-state-fallback-when-30m-is-empty-or-stale) 中受控的 24h 最新已知状态后备
- **KSPM**：`1h` 固定窗口（内连接需要最新的 `COMPLIANCE_SCAN_COMPLETED` 标记）
- **外部发现（含 CSPM/VSPM）**：`2h–24h+`（无快照语义 —— 这些是一次性事件）

加宽这些窗口不会回看更远 —— 它们只捕获最新的报告/扫描周期。历史趋势请使用更长窗口上的 `makeTimeseries`。

> **DT 生成的 `VULNERABILITY_FINDING` vs. RVA 状态报告。** Dynatrace 生成的
> `VULNERABILITY_FINDING` 查询（例如
> [vulnerabilities-dynatrace-advanced.md § AI 工作负载漏洞](references/vulnerabilities-dynatrace-advanced.md#ai-workload-vulnerabilities-dynatrace-findings)
> 中的 AI 工作负载范围）也使用 `30m` 窗口，但按 **`finding.id`** 去重，因为 DT 发现会在
> 每次扫描运行（约 15 分钟）时重新发出 —— 这与 RVA 状态报告的
> `30m` 窗口不同，后者按 **`{vulnerability.display_id, affected_entity.id}`** 去重。
> 不要混合两种去重粒度。

### Dynatrace 应用中的默认时间范围

UI 应用在时间选择器中显示预设默认值。当用户
引用"应用的视图"但未给出明确窗口时，匹配
这些默认值以将查询结果与用户在 UI 中看到的对齐：

| 应用 | 默认时间选择器 |
|---|---|
| Vulnerabilities 应用 | 30 分钟 |
| Threats & Exploits 应用 | 2 小时 |
| Security Posture Management 应用 | 2 小时 |

这些应用默认值*宽于*上面的最小快照窗口
（例如 SPM 应用 = 2h vs. KSPM 管道最小 = 1h）。最小窗口是
内连接 / 最新周期去重所需的工作窗口；应用默认值
是用户首次加载时看到的。生成规范管道 DQL 时使用**最小窗口**；
当用户问"SPM 应用现在向我显示什么？"或构建旨在匹配
应用视图的仪表板磁贴时，使用**应用默认值**。

详情参见 [vulnerabilities-dynatrace.md § 快照 vs. 历史](references/vulnerabilities-dynatrace.md)。

## 此技能的组织方式

为可扩展性，此技能分为两部分：

1. **SKILL.md**（本文件）—— 入口点、快速查找、路由到正确的参考
2. **references/** —— 按能力或领域的详细指导：
   - [**data-model.md**](references/data-model.md) —— `fetch security.events` 的参考 —— 事件类型、提供商、字段、实体范围。
   - [**common-patterns.md**](references/common-patterns.md) —— 跨领域模式、要避免的常见错误和查询故障排查参考。
   - [**vulnerabilities-dynatrace.md**](references/vulnerabilities-dynatrace.md) —— Dynatrace 运行时漏洞分析（RVA）：快照管道、计数、生命周期、运行时评估、CLV、追踪、静音和实体范围。
   - [**vulnerabilities-dynatrace-advanced.md**](references/vulnerabilities-dynatrace-advanced.md) —— 高级 DT 漏洞指导：最佳实践和 AI 工作负载（`VULNERABILITY_FINDING`）查询工作流。
   - [**vulnerabilities-external.md**](references/vulnerabilities-external.md) —— 外部 SCA / SAST / 镜像扫描器漏洞发现（`VULNERABILITY_FINDING`）。
   - [**vulnerabilities-entities.md**](references/vulnerabilities-entities.md) —— DT RVA 实体排名："最易受攻击的主机 / K8s 工作负载 / 组件" + CVE 爆炸半径。
   - [**compliance.md**](references/compliance.md) —— Dynatrace Security Posture Management（SPM / XSPM）合规发现和外部提供商合规发现。
   - [**detections.md**](references/detections.md) —— 运行时应用保护（RAP）检测、自动检测规则和外部提供商检测。
   - [**threat-intelligence.md**](references/threat-intelligence.md) —— 外部威胁情报报告（`THREAT_REPORT`）：AlienVault OTX / CrowdStrike Falcon Intelligence、IOC 提取和威胁暴露关联。不是发现 —— 单独查询。
   - [**all-security-events.md**](references/all-security-events.md) —— 跨提供商查询、双重计数防护、统一摘要
   - [**coverage-and-dashboards.md**](references/coverage-and-dashboards.md) —— 实体覆盖计数逻辑（`smartscapeNodes` 分母、已覆盖 vs. 未覆盖）和仪表板模式（KPI 磁贴、top-N、趋势图、覆盖环图）。
   - **entity-enrichment** —— 移至 **dt-sec-contextualization** `references/entity-enrichment.md`（3 方匹配 / 按 IP 的主机 / 云）。任何实体映射问题加载 `dt-sec-contextualization`。

## 通用最佳实践

1. **始终先加载 dt-dql-essentials** —— DQL 语法和函数名与 SQL 不同。在生成查询之前，在 `dt-dql-essentials` 中确认所有函数。
2. **让每个查询都基于所路由参考的规范模板 —— 不要即兴编造 DQL。** 识别意图，加载匹配的参考（按*何时使用*），并从其规范管道 / 具名构建块构建。**不要**从 SQL 习惯中发明字段名、枚举值、连接语法或管道形态。仅在技能示例中明确显示或在 `dt-dql-essentials` 中验证的语法下偏离模板。如果没有模板覆盖该请求，说明这一点并改编最接近的 —— 绝不捏造字段或值。
3. **不要使用 `dt.system.bucket` 过滤器** —— 安全事件数据可能位于任何桶；按桶过滤有隐藏发现的风险。
4. **为家族使用正确的来源字段** —— RVA 使用 `event.provider == "Dynatrace"`，SPM/检测使用 `product.vendor == "Dynatrace"`。参见 [data-model.md § 提供商分类法](references/data-model.md)。
5. **始终包含明确的 `from:` 子句 —— 为查询类别使用正确的窗口：**

   | 查询类别 | 默认窗口 | 说明 |
   |---|---|---|
   | DT RVA 快照 | `30m` 固定 | 捕获最新的 15 分钟状态报告周期 —— 不要加宽 |
   | DT KSPM 快照 | `1h` 固定 | 与扫描完成周期内连接对齐 —— 不要加宽 |
   | RAP / 外部检测检索或当前摘要 | 首次尝试 `2h` | 匹配 Threats & Exploits 应用默认值。仅在零行返回或用户明确要求更长窗口时才加宽到 `24h`（参见 [detections.md § 空时加宽后备](references/detections.md)） |
   | 跨提供商摘要（聚合） | `24h` | 摘要随时间聚合；从宽开始 |

   省略 `from:` 会回退到与快照语义不匹配的默认窗口，并产生查询运行之间的漂移。30m / 1h 窗口*不是*任意的 —— 它们与底层 RVA / SPM 扫描节奏相关联。完整窗口参考参见 [common-patterns.md § 7](references/common-patterns.md)。

   **分解包含 DT 的宽泛 / 态势概览问题**（"集成了哪些安全产品，包括 Dynatrace 原生？"、态势概览、包含 DT 漏洞/合规的跨类别计数）—— 绝不用一次宽泛扫描所有 `security.events` 来回答。运行三个独立查询并合并：流 A 外部 + DT 检测（`24h`，双重计数防护），流 B DT RVA（`30m`），流 C DT KSPM（`1h`）。这使高基数的快照流保持在其紧凑窗口内并避免双重计数。更窄的"哪些**外部**集成在发送数据？"仍保持单个仅外部查询。参见 [all-security-events.md § 宽泛问题查询分解](references/all-security-events.md#broad-question-query-decomposition)。
6. **在原始列表中保留实体标识符**（top / latest / list / show-me —— 无 `summarize`），以便用户看到每个发现位于哪个实体上。命名空间按家族拆分，**不可互换**：跨提供商 `*_FINDING` / 扫描事件使用通用 `dt.smartscape*` / `dt.entity*` / `dt.source*` 字段；RVA 状态/变更事件将这些留空，并在 `affected_entity*` / `related_entities*` 中携带引用。不用于纯计数 / 通过率摘要。字段列表和通配符参考 → [common-patterns.md § 17](references/common-patterns.md#17-entity-identifier-preservation-on-raw-listings)。
7. **宽泛实体安全问题也需要外部流。** 对于"此主机 / K8s 节点 / 工作负载 / 集群的安全发现"这类提示，不要在 DT RVA 和 SPM 之后停止。还要在 `24h` 内运行用宽实体 OR 链（`dt.smartscape_source.id`、`dt.entity.*`、`object.*` 和相关 `k8s.*` 字段）限定的外部/跨提供商 `*_FINDING` 流，然后与 RVA（`30m`）和 SPM（`1h`）合并。将 `dt.source_entity` 视为旧版/扫描后备，而非主要的跨提供商范围路径。如果外部分支返回 0 行，报告"未找到外部发现"并附上所用的范围。加载 **dt-sec-contextualization** → `entity-enrichment.md` 了解 Smartscape 连接。另见 [all-security-events.md](references/all-security-events.md)。
8. **始终约束原始列表和 top-N 结果。** 如果用户要求"top X"、"last X"或"first X"，以 `| sort ... | limit X` 结束（在排名/排序之后）。如果用户要求列出/显示发现但**未**明确要求所有数据且输出不是摘要（`summarize` / `makeTimeseries`），默认添加 `| limit 50`。不要对安全发现运行无界原始投影。完整规则和例外 → [common-patterns.md § 16](references/common-patterns.md#16-result-limits-for-top-n-and-raw-listings)。
9. **保留查询形态 —— 除非用户要求更粗的聚合，否则不要丢弃 `by:` 键。** 规范跨提供商 `summarize` 始终按 `{event.provider, product.name, event.type, dt.security.risk.level}` 键控。丢弃其中任何一个都会静默地将来自不同提供商、产品或发现类型的行合并为单个计数，并将被评估器扣分。除非用户明确要求更粗的视图，否则不要用更简单的 `by: {dt.security.risk.level}` 或 `by: {event.type}` 替换四键分组。参见 [common-patterns.md § 15](references/common-patterns.md)。

10. **合规状态使用 `compliance.result.status.level`**（`PASSED`/`FAILED`/`MANUAL`/`NOT_RELEVANT`）—— 绝不用 `event.status` 或 `"PASS"`/`"FAIL"`。通过率在最新扫描去重连接 `on: {scan.id}` 之后按规则判定计算。字段术语、去重连接和通过率汇总 → [compliance.md](references/compliance.md)。

11. **在 `expand` / `join` / `lookup` 扇出数组之后，计数不同的标识而非行** —— 使用 `countDistinctExact(vulnerability.display_id)` / `countDistinctExact(finding.id)`，或先按标识 + 分组键 `dedup`。仅当进入 `expand` 的粒度已经是被计数项每项一行时，普通 `count()` 才安全。示例和例外 → [common-patterns.md § Mistakes #55](references/common-patterns.md#mistakes-to-avoid)。

12. **将空的实体覆盖探测解释为未覆盖。** 在验证特定实体是否被 Dynatrace 安全能力（RVA、SPM/KSPM、RAP 或其他 Dynatrace 原生能力）覆盖时，相关发现和扫描/完成事件的缺失意味着该实体**未被**该能力覆盖。说明可能的原因：该能力未启用，或未配置 / 部署以监控该实体。当用户问的是覆盖时，不要将其软化为"无发现"。计数逻辑 → [coverage-and-dashboards.md](references/coverage-and-dashboards.md)；匹配配方 → **dt-sec-contextualization** `correlation-and-coverage.md`。

13. **如实报告空结果 —— 绝不捏造数字。** 0 行意味着"无匹配数据"，说明所用的范围和过滤器；绝不发明看似合理的值。在放宽过滤器之前，应用该家族文档化的恢复（RVA 30m→24h 最新已知状态、检测 2h→24h 加宽、RVA 在 null `k8s.*`/`dt.entity.*`/`dt.smartscape*` 上的过滤器 → 转向 `affected_entity.*`/`related_entities.*`），并在你进行适配时明确说明。恢复详情 → [vulnerabilities-dynatrace.md](references/vulnerabilities-dynatrace.md) / [detections.md](references/detections.md)。

领域特定最佳实践和完整诊断目录，参见上面"此技能的组织方式"一节中列出的参考。

## 外部文档

- https://docs.dynatrace.com/docs/secure/threat-observability/concepts
- https://docs.dynatrace.com/docs/semantic-dictionary/model/security-events
- https://docs.dynatrace.com/docs/semantic-dictionary/fields

## 相关技能

- **dt-dql-essentials** —— 首先加载。核心 DQL 语法、命令参考、函数目录、Smartscape 模式。
- **dt-sec-contextualization** —— 任何实体映射问题加载：3 方匹配（K8s 工作负载）、按 IP 的主机、云路径 1、Pod→节点拓扑、跨证据关联、覆盖匹配配方。
- **dt-obs-kubernetes** —— K8s 拓扑；对限定到集群 / 工作负载的安全发现有用
- **dt-obs-hosts** —— 主机清点、进程级上下文；当发现的受影响实体是 HOST 或 PROCESS_GROUP 时有用
- **dt-obs-services** —— 服务范围查询；对 UC-G3"影响 `<service-name>` 的发现"以及从易受攻击服务追踪到 RED 指标有用
- **dt-obs-aws / dt-obs-azure / dt-obs-gcp** —— 云 Smartscape；对根据提供商资源拓扑富化外部云安全发现有用，以及对超大规模厂商特定提供商字段处理（云资源 ID、ARN、账户范围）有用
- **dt-obs-tracing** —— 从易受攻击 / 受攻击实体下钻到代表性请求追踪
- **dt-obs-problems** —— 在查询安全发现之前获取问题的受影响/相关实体 ID（UC-G5）
