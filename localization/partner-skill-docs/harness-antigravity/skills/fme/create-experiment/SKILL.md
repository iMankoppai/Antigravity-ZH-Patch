---
name: create-experiment
description: >-
  用于创建新 Harness FME 实验的轻量兼容入口。
  直接调用 manage-experiments 的“创建实验”流程——相同的范围、
  父级/环境解析、假设、指标、treatment、窗口和
  规则——并返回创建后的实验 id 及验证。在
  要求创建实验、设置 A/B 测试或设计新
  实验时使用。不要用于更新、暂停、恢复、完成、
  归档或删除实验（用 manage-experiments），也不要用于
  解释结果（用 review-experiment-results）。触发短语：创建
  实验、设置 A/B 测试、设计实验、启动测试、
  为 X 创建新实验。
metadata:
  author: Harness
  version: 1.0.1
  mcp-server: harness-mcp
  summary: Creation-only entry point to the manage-experiments workflow
license: Apache-2.0
compatibility: Requires the Harness MCP server or the Harness CLI
---

# 创建实验

保留用于直接 `/create-experiment` 调用的兼容入口。此
技能不复制任何工作流——它将整个创建流程交给
[manage-experiments](../manage-experiments/SKILL.md) 的**创建实验**
部分，并在该流程完成后返回。

## 工具

自身不执行任何操作；它使用 manage-experiments
创建实验流程的操作，名称见 [tool-map.md](../../../references/fme/tool-map.md)。

## 说明

### 步骤 1：委托

阅读 [manage-experiments/SKILL.md](../manage-experiments/SKILL.md)，并完全按其写法
遵循其**阶段 1：确定范围**和**创建实验**部分（步骤 1-8），
使用当前请求的范围（org/project）、父
功能标志 + 环境、假设、指标、treatment、窗口
（`startAt`/`endAt`）和 `rule`。不要在此重新推导或重新解释该
部分的任何逻辑——此技能没有关于
解析 treatment、选择指标或起草 payload 的独立指令；它的存在只是
为了让 `/create-experiment` 仍然是有效的调用。

如果你运行所在的工具接口无法按需跟随 markdown 链接
加载另一个技能的文件，直接读取
`skills/fme/manage-experiments/SKILL.md`（同一代码仓库，相对路径），并以相同方式
继续。

### 步骤 2：返回结果

一旦 manage-experiments 的步骤 8（验证）完成，将创建后的
实验的 `id`、`status` 以及经验证的字段（baseline/comparison
treatment、关键/支撑指标、rule）报告给用户。不要添加
第二次验证——manage-experiments 的步骤 8 是权威的。

## 示例

- “在 new-checkout 功能标志上创建实验” → 委托给
  manage-experiments 创建流程，返回创建的 id
- “为定价页面设置 A/B 测试” → 相同委托
- “暂停实验 pricing_test_2” → 不是此技能；路由到
  [manage-experiments](../manage-experiments/SKILL.md)（Update）
- “结账实验赢了吗？” → 不是此技能；路由到
  [review-experiment-results](../review-experiment-results/SKILL.md)

## 性能注意事项

- 没有独立的工具调用：每个 MCP/CLI 操作都发生在
  被委托的 manage-experiments 流程内，因此这里没有可优化掉的重复范围
  解析或双重验证。

## 故障排查

| 问题 | 解决 |
|-------|------------|
| 用户要求更新/暂停/恢复/完成/归档/删除现有实验 | 路由到 [manage-experiments](../manage-experiments/SKILL.md)（Update/Delete），而非此技能 |
| 用户询问结果、赢家或显著性 | 路由到 [review-experiment-results](../review-experiment-results/SKILL.md) |
| manage-experiments 的创建流程因缺少决策（假设、treatment、指标）而停止 | 在此也向用户呈现该停止——不要替它猜测 |
| 被委托的流程中途失败（例如父级 404、名称重复 409） | 按 manage-experiments 的故障排查表所述报告错误；不要用臆造的值重试 |
