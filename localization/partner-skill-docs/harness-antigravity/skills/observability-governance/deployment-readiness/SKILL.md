---
name: deployment-readiness
description: >-
  通过 Harness MCP 评估部署就绪状态。运行带 go/no-go
  建议的部署前就绪检查、分析源环境与目标环境之间的环境漂移，并提供
  数据驱动的金丝雀发布决策。在要求检查服务是否已准备好部署、
  部署前比较环境，或决定是否晋级金丝雀时使用。不要用于
  运行流水线（请改用 run-pipeline）或调试失败（请改用 debug-pipeline）。
  触发短语：部署就绪、可部署、部署前检查、环境漂移、
  金丝雀决策、晋级金丝雀、回滚金丝雀、go no-go、部署检查清单、生产
  就绪、金丝雀分析。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Pre-deployment readiness checks, environment drift, and canary decisions
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 部署就绪

使用 Harness MCP 评估部署就绪状态、分析环境漂移并做出数据驱动的金丝雀发布决策。

## 说明

### 步骤 1：确定范围

确认服务、目标环境和部署类型。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "service"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：识别就绪任务

确定用户需要哪种评估：

1. **部署就绪检查**——带 go/no-go 的全面部署前验证
2. **环境漂移分析**——源环境与目标环境之间的差异
3. **金丝雀发布决策**——数据驱动的晋级、暂停或回滚建议

### 步骤 3：运行部署就绪检查

从用户处收集：
- 服务名称和目标环境
- 部署类型（rolling、blue-green、canary）
- 变更摘要（正在部署什么）

执行就绪检查：

**流水线健康：**
```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
  pipeline_id: "<pipeline_identifier>"
```
- 最近 N 次流水线执行：通过率和失败模式
- 所有必需阶段通过（构建、测试、安全扫描）

**依赖验证：**
- 所有被引用的连接器、密钥和基础设施可访问
- 目标环境配置了必需审批

**制品就绪：**
- 容器镜像存在且已通过安全扫描
- SBOM 已生成并签名（如要求）
- 镜像标签与预期版本匹配

**环境健康：**
- 目标环境未冻结或处于维护状态
- 目标集群无活动事件
- 资源容量足以支持部署

**安全闸门：**
- 无超过阈值的严重或高危 CVE
- 目标环境的 OPA 策略通过
- 必需的合规证明存在

呈现结构化报告，每项检查为 PASS/FAIL/WARNING，并给出最终 GO/NO-GO 建议。

### 步骤 4：分析环境漂移

从用户处收集：
- 服务名称、源环境和目标环境

使用 harness_get 比较环境（每个均需）：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "environment"
  resource_id: "<source_env>"
  org_id: "<organization>"
  project_id: "<project>"
```

检查以下方面的漂移：
- **配置：** 环境变量、功能标志、config map
- **基础设施：** 资源限制、副本数、节点池
- **密钥：** 密钥版本和轮换状态
- **清单：** Kubernetes 清单差异
- **依赖：** 外部服务版本和端点

按风险对每个差异分类：
- CRITICAL：可能导致中断（缺少密钥、错误端点）
- WARNING：可能导致行为差异（不同的资源限制）
- INFO：外观性或预期差异（环境特定的值）

### 步骤 5：金丝雀发布决策

从用户处收集：
- 服务名称、金丝雀流量百分比和时长
- 金丝雀版本 vs 基线版本
- 要评估的关键指标（错误率、延迟、吞吐量）

分析金丝雀健康：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
```

评估：
- **错误率：** 金丝雀 vs 基线（阈值：不超过基线的 1.1 倍）
- **延迟：** P50、P95、P99 比较
- **吞吐量：** 无错误处理的请求
- **资源使用：** CPU 和内存 vs 基线
- **业务指标：** 转化率、交易成功率

提供建议：
- **PROMOTE**——所有指标在阈值内，建议增加流量或全量发布
- **HOLD**——部分指标处于临界，建议延长观察窗口
- **ROLLBACK**——指标退化超出阈值，建议立即回滚

## 示例

- “我们的 payment-service 准备好部署到生产了吗？”——运行完整就绪检查并给出 go/no-go 建议
- “部署前比较 staging 和生产环境”——分析配置、基础设施和密钥漂移
- “我们应该晋级金丝雀还是回滚？”——评估金丝雀指标并建议晋级/保持/回滚
- “为 checkout 服务运行部署前检查清单”——验证流水线健康、制品、安全闸门和环境

## 性能注意事项

- 就绪检查应针对实际目标环境运行，而非缓存状态——环境在检查之间会变化。
- 环境漂移分析在部署前一刻最有价值——提前数小时运行可能错过近期更改。
- 金丝雀决策需要足够的流量才有统计意义——低流量服务可能需要更长的观察窗口。
- 可用时在金丝雀分析中包含业务指标——仅技术指标可能错过面向用户的问题。

## 故障排查

### 就绪检查返回假阴性
- 核实连接器和密钥可从就绪检查运行器访问
- 检查正在部署的特定镜像标签的安全扫描结果可用
- 确保环境冻结状态是最新的

### 漂移分析显示太多差异
- 过滤掉预期差异（环境特定变量，如 URL、凭据）
- 先关注基础设施和清单漂移——这些最可能导致问题
- 在 Harness 中使用环境覆盖来管理预期的按环境配置

### 金丝雀指标无结论
- 增加流量百分比以获得更多数据点
- 延长观察窗口以捕获更多流量模式
- 检查金丝雀 Pod 的指标收集是否正常工作
