---
name: optimize-pipeline
description: >-
  通过 MCP 优化 Harness CI/CD 流水线性能。使用 Test Intelligence 配置并行测试
  执行、设计多层缓存策略、以阶段级耗时细分分析流水线瓶颈、
  优化缓存命中率，并设计带选择性构建的 monorepo CI
  流水线。在要求加速流水线、提高缓存命中率、设置
  并行测试、优化构建时间或配置 monorepo 构建时使用。不要用于创建
  新流水线（请改用 create-pipeline）或调试失败（请改用 debug-pipeline）。
  触发短语：流水线速度、慢流水线、缓存命中率、并行测试、test intelligence、
  构建优化、缓存策略、monorepo 流水线、流水线瓶颈、构建速度。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Pipeline speed optimization, parallel testing, caching, and monorepo builds
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 优化流水线

通过并行测试、缓存、瓶颈分析和 monorepo 策略分析并优化 Harness CI/CD 流水线性能。

## 说明

### 步骤 1：确定范围

确认服务、流水线和当前性能基线。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
```

获取近期执行耗时数据：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
  pipeline_id: "<pipeline_identifier>"
```

### 步骤 2：识别优化任务

确定用户需要哪种优化：

1. **带 Test Intelligence 的并行测试**——在运行器间拆分测试并跳过未变更的测试
2. **缓存策略**——多层依赖、构建输出和测试结果缓存
3. **流水线瓶颈分析**——带建议的阶段级耗时细分
4. **缓存命中率改进**——诊断并修复低缓存命中率
5. **Monorepo CI 流水线**——由变更路径触发的选择性构建

### 步骤 3：配置带 Test Intelligence 的并行测试

从用户处收集：
- 测试框架（JUnit、pytest、Jest、Go test 等）
- 总测试数和当前运行时间
- 目标运行时间

设计并行测试策略：
- 使用 Harness Test Intelligence 在 N 个并行运行器间拆分测试
- 使用 TI 根据代码变更识别并跳过未变更的测试
- 配置测试拆分方法：按类、按文件或按耗时数据
- 设置跨运行器的测试结果聚合
- 跟踪 TI 随时间节省（跳过测试 vs 总数）

配置：
- 在流水线阶段启用 Test Intelligence
- 根据测试数和运行器容量设置并行度
- 配置从所有并行运行器收集测试报告
- 设置失败阈值（例如任一运行器失败则阶段失败）

### 步骤 4：设计缓存策略

从用户处收集：
- 构建工具（Maven、Gradle、npm、yarn、pip、Go modules）
- 当前构建时间细分（依赖下载、编译、测试）
- 缓存键来源（锁文件哈希、清单哈希）

设计多层缓存：

**第 1 层——依赖：**
- 缓存键：锁文件的哈希（package-lock.json、pom.xml、go.sum）
- 缓存路径：依赖目录（~/.m2、node_modules、~/.cache/pip）
- 回退：如果找不到精确匹配则使用先前缓存

**第 2 层——构建输出：**
- 缓存键：源文件的哈希
- 缓存路径：构建输出目录（target/、dist/、build/）
- 失效：任何源文件变更

**第 3 层——测试结果：**
- 缓存键：源 + 测试文件的哈希
- 缓存路径：测试结果和覆盖率目录
- 结合 TI 用于跳过未变更的测试

设置缓存 TTL（建议 7-14 天）及回退策略。

### 步骤 5：分析流水线瓶颈

拉取执行数据并按阶段细分：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "execution"
  resource_id: "<execution_id>"
  org_id: "<organization>"
  project_id: "<project>"
```

对于每个阶段，识别：
- 耗时 vs 流水线总耗时（找出最长的阶段）
- 排队时间 vs 执行时间（运行器可用性问题）
- 可并行运行的顺序阶段
- 反复下载大型制品的步骤

产出按节省时间排序的优先优化清单。

### 步骤 6：设计 Monorepo CI 流水线

从用户处收集：
- 服务数量及其目录
- 共享库及其依赖方
- 构建工具

设计选择性构建：
- 使用基于路径的触发器：仅构建文件变更的服务
- 共享库变更时构建它们，然后重新构建所有依赖方
- 仅在跨服务依赖变化时运行集成测试
- 使用依赖图确定最小构建集

## 示例

- “我的流水线要 45 分钟，帮我加速”——分析瓶颈并推荐并行测试、缓存和阶段重排
- “设置带 Test Intelligence 的并行测试”——配置 TI 并在 N 个运行器间拆分测试
- “提高我们的缓存命中率”——诊断缓存键配置并修复常见未命中
- “为我们的 5 服务 monorepo 设计 CI 流水线”——配置带选择性构建的基于路径触发器
- “我们的构建每次都要下载依赖”——设计带回退的多层缓存策略

## 性能注意事项

- Test Intelligence 需要 2-3 次完整测试运行来构建其初始模型——最初的运行会执行所有测试。
- 缓存键应基于锁文件，而非时间戳——时间戳会导致不必要的缓存未命中。
- 超过运行器容量的并行度会导致排队——提高并行度之前先分析可用运行器容量。
- Monorepo 路径触发器应包含共享库目录，以避免漏掉传递变更。

## 故障排查

### Test Intelligence 未跳过测试
- 核实 TI 已启用并已完成基线运行
- 检查测试框架是否受 Harness TI 支持
- 确保测试报告格式已针对该框架正确配置

### 每次构建都缓存未命中
- 检查缓存键配置——键应使用文件哈希，而非时间戳
- 核实缓存路径与实际依赖目录匹配
- 检查缓存存储后端可从所有运行器访问

### Monorepo 构建所有内容
- 核实基于路径的触发器配置正确
- 检查依赖图包含共享库路径
- 确保触发器中的 glob 模式与实际目录结构匹配
