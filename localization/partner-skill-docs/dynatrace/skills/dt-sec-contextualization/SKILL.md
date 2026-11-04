---
name: dt-sec-contextualization
description: >-
  将安全信号、IoC 匹配或 Smartscape 节点解析为运行时
  Dynatrace 实体，并通过共享的运行时实体连接不同实体层级上的发现。
  涵盖身份到 Smartscape 的映射（包括
  容器镜像摘要/ID 到工作负载）、跨层级拓扑（K8s Pod
  检测 vs. 节点 CVE，经由 Pod 到节点）、按实体的风险汇总，以及
  与 dt-sec-insights 共享的覆盖匹配配方。触发词："map these findings
  to workloads/hosts"、"which workload does this container image run as"、"do
  these findings relate through the same runtime entity"、"enrich this IoC match
  with entity context"、"which threat report mentions this IoC"。仅针对 THREAT_REPORT IoC 富化（将匹配的 IoC 关联到
  归属报告）查询 security.events；不用于广泛的安全态势/概览
  （请使用 dt-sec-insights）、通用 DQL（请使用 dt-dql-essentials）、在
  日志/跨度中进行 IoC 狩猎（请使用 dt-sec-ioc-hunting），或安全跨层级上下文之外的 K8s 可观测性
  （请使用 dt-obs-kubernetes）。
license: Apache-2.0
---

# 安全上下文化技能

将安全信号和实体属性集解析为运行时 Dynatrace
Smartscape 实体，跨实体层级汇总发现，并连接
落到不同层级上的信号（例如 `K8S_POD` 上的检测 vs.
`KUBERNETES_NODE` 上的 CVE），通过共享的运行时实体。

## 此技能涵盖的内容

- **身份 → Smartscape 映射** —— 给定一行携带任意
  `dt.smartscape_source.id`、`container_image.digest`、`container_image.id`、
  `host.ip`、`dt.entity.*` 或 `k8s.*` 字段的数据，将其解析为任意请求层级上的 Smartscape
  实体（CONTAINER / K8S_POD / 工作负载 /
  K8S_NODE / HOST / 云 / `GENAI_SERVICE` —— AI/GenAI 工作负载）。
- **制品 → 运行时桥接** —— `container_image.digest` →
  `smartscapeNodes CONTAINER` → `is_part_of.*` → 父工作负载或
  `runs_on.host` → HOST。无需预先富化的 `dt.smartscape_source.id` 即可工作。
- **跨层级关联** —— 分层实体匹配，用于确定两个
  发现（例如来自不同环节的检测和 CVE）是否通过
  共享的运行时实体相关联。第 1 层：精确实体 id 匹配；第 2 层：按名称的相同
  工作负载/Pod/主机；第 3 层：相同命名空间/集群（仅上下文 ——
  不参与评分）。
- **Pod → 节点拓扑** —— 通过
  `k8s.node.name`（共同投影字段）或 Smartscape 边遍历将 `K8S_POD` 解析为其 `K8S_NODE`。支持
  "检测命中了 Pod X —— 该 Pod 是否运行在有漏洞的节点上？"
- **覆盖匹配配方** —— 2 方和 3 方容器→工作负载匹配
  模式，与 dt-sec-insights 覆盖计数查询共享。
- **实体富化** —— 给定发现、IoC 匹配或原始 Smartscape
  节点，生成按实体的风险级别细分和用于
  下游评分的实体键捆绑。
- **IoC 富化** —— 通过反向查找已摄取的
  `THREAT_REPORT` 事件（其 observable 数组包含该 IoC），为已匹配的 IoC（IP / 域名 / URL /
  邮箱 / CVE / 哈希 / MITRE TTP）赋予对手上下文（行为体、恶意软件家族、
  MITRE 技术、目标定位、提供商）。

## 何时使用此技能

| 意图 / 触发 | 参考 |
|---|---|
| 将发现 / IoC 匹配映射到工作负载、主机或云实体 | `identity-mapping.md` -> `entity-enrichment.md` |
| 此容器镜像 / 摘要以哪个 Smartscape 实体运行？ | `identity-mapping.md` § Mapping Primitive（路径 2 - 容器摘要） |
| 此检测和此 CVE 是否通过共享实体相关联？ | `correlation-and-coverage.md` § Correlation |
| Pod X 触发了 - 它是否运行在有漏洞的节点上？ | `correlation-and-coverage.md` § Correlation（Pod->Node 拓扑） |
| 按实体风险摘要（Critical/High/Medium/Low） | `entity-enrichment.md` |
| 覆盖匹配配方 - 产品 Y 覆盖了哪些工作负载？ | `correlation-and-coverage.md` § Coverage |
| 哪些实体身份字段与某发现类型相关？ | `identity-mapping.md` § Data Model |
| 为已匹配的 IoC（IP/域名/哈希/CVE/……）富化威胁报告对手上下文 | `ioc-enrichment.md` |
| 将发现范围限定到 AI/GenAI 工作负载；哪些进程属于某 AI 服务；将进程解析为其 AI 服务 | `identity-mapping.md` § Mapping Primitive（路径 4 - `GENAI_SERVICE -> SERVICE -> PROCESS`） |

## 此技能的组织方式

1. **SKILL.md**（本文件）—— 入口点和路由。
2. **references/**
   - [**identity-mapping.md**](references/identity-mapping.md) —— 通用的
     身份->Smartscape 解析器（映射原始路径 1/2/3/4）、预检
     标识符检查、层级选择，以及实体身份字段指导。
   - [**entity-enrichment.md**](references/entity-enrichment.md) —— 映射原始
     的使用者：云（路径 1）、K8s 工作负载（3 方）、按 IP 的主机、
     按实体的主机、自然语言后备、问题->实体->发现链。
     按实体的风险级别细分（Critical/High/Medium/Low）。
   - [**correlation-and-coverage.md**](references/correlation-and-coverage.md) ——
     跨层级实体汇聚、Pod->节点拓扑解析、评分契约，
     以及与 dt-sec-insights 共享的 2 方/3 方覆盖匹配配方。
   - [**ioc-enrichment.md**](references/ioc-enrichment.md) —— 反向查找 IoC
     富化：将匹配的 IoC 归属到已摄取的 `THREAT_REPORT` 事件，并
     呈现对手上下文（行为体 / 恶意软件 / MITRE / 目标定位）。单条和
     批量（按 IoC）模板；支持的 IoC 分类法。

## 通用最佳实践

1. **务必先加载 `dt-dql-essentials`** —— DQL 语法和函数名
   与 SQL 不同。在生成查询之前确认所有函数。
2. **让每个查询都基于具名模板** —— 不要即兴编造 Smartscape 连接。
   3 方匹配、摘要→CONTAINER→工作负载和 Pod→节点遍历模式
   都是精确的；偏离会产生静默的零行结果。
3. **在完整 3 方富化之前运行预检** —— 外部
   提供商差异很大。在运行昂贵的 append 链之前，确认至少有一条标识符路径已填充。
4. **在信任路径 1 之前检查 `dt.smartscape_source.type`** —— 非空的
   `dt.smartscape_source.id` 并不能证明工作负载级别的解析；该
   字段可能指向命名空间、集群或云资源。只有 K8s 工作负载
   类型（`K8S_DEPLOYMENT`、`K8S_DAEMONSET`、`K8S_STATEFULSET`、`K8S_CRONJOB`、
   `K8S_JOB`、`K8S_REPLICASET`）才有资格通过路径 1 进行工作负载富化。
5. **尽早去重，并在 `append` 之后再去重** —— 在连接前去重以合并
   重复摄取的副本；在 `append` 后再次去重，因为同一发现
   可能匹配多条路径。
6. **第 3 层关联仅为上下文** —— 两个发现共享相同命名空间/集群
   并不会提高暴露评分。切勿将集群级的
   共享属性视为实体级相关性的证明。
7. **将拓扑查询路由到 `dt-obs-kubernetes`** —— Pod→节点放置和
   Smartscape 边遍历模式位于
   `dt-obs-kubernetes/references/pod-node-placement.md`。不要在此处重新编写
   它们；引用它们并在 `correlation-and-coverage.md` 中应用输出。
8. **不要使用 `dt.system.bucket` 过滤器** —— 安全事件数据可能位于任何
   桶中；按桶过滤有隐藏发现的风险。
9. **THREAT_REPORT 是此处唯一允许的 `security.events` 查询 —— 仅限反向
   查找。** `ioc-enrichment.md` 将*匹配的 IoC*归属到报告
   （IoC → 报告）。广泛的 THREAT_REPORT 概览、IOC 汇总和正向
   报告 → 环境关联留在 `dt-sec-insights`
   （`threat-intelligence.md`）。切勿在此处编写发现/态势查询。

## 相关技能

| 技能 | 角色 |
|---|---|
| `dt-dql-essentials` | **首先加载。** 核心 DQL 语法、函数、Smartscape 模式。 |
| `dt-sec-insights` | 映射原始的使用者；拥有发现模式查询和覆盖计数逻辑。在 `threat-intelligence.md` 中拥有**正向**威胁情报（报告 → 环境关联、概览、IOC 汇总）；此技能仅拥有**反向** IoC → 报告富化（`ioc-enrichment.md`）。 |
| `dt-sec-ioc-hunting` | 将跨证据关联和实体富化路由到此技能。 |
| `dt-obs-kubernetes` | Pod→节点拓扑；K8s 实体放置模式。 |
| `dt-obs-hosts` | 主机清点；HOST/PROCESS_GROUP 发现的进程级上下文。 |
| `dt-obs-aws` / `dt-obs-azure` / `dt-obs-gcp` | 用于云实体富化的云 Smartscape 拓扑。 |
