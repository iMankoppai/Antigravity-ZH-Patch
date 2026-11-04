---
name: requesting-code-review
description: 在完成任务、实现重大功能或合并之前，用于验证工作是否满足需求时使用
---

# 请求代码审查

派发一个代码审查子智能体，在问题级联扩散之前将其捕获。审查者会获得为评估而精心构建的上下文 —— 绝不是你本会话的历史。

**核心原则：** 尽早审查，经常审查。

## 何时请求审查

**必须：**
- 在子智能体驱动开发中的每个任务之后
- 完成重大功能之后
- 合并到 main 之前

**可选但有价值：**
- 卡住时（全新视角）
- 重构之前（基线检查）
- 修复复杂 bug 之后

## 如何请求

**1. 获取 git SHA：**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or: git merge-base origin/main HEAD
HEAD_SHA=$(git rev-parse HEAD)
```

**2. 派发代码审查子智能体：**

派发一个 `general-purpose` 子智能体，填写 [code-reviewer.md](code-reviewer.md) 中的模板

**占位符：**
- `{DESCRIPTION}` - 你所构建内容的简要概述
- `{PLAN_OR_REQUIREMENTS}` - 它应该做什么
- `{BASE_SHA}` - 起始提交
- `{HEAD_SHA}` - 结束提交

**3. 根据反馈采取行动：**
- 立即修复严重问题
- 继续之前修复重要问题
- 记录次要问题以备后续处理
- 如果审查者有误则反驳（附上理由）

## 示例

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | cut -d' ' -f1)
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code reviewer subagent]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## 常见借口

| 借口 | 实际情况 |
|--------|---------|
| “我自己审一下 diff 就行，不用派审查者” | 你是协调者 —— 内联审查 diff 会烧掉你维持工作推进所需的上下文窗口。派发一个审查子智能体：diff 和评估都留在它的上下文里，只有发现的问题回到你这里。 |
| “审查者需要我的整个会话历史才能理解这个变更” | 交给它精心构建的上下文，绝不是你的会话历史。这样能让审查者聚焦于工作成果，而非你的思考过程。 |

## 危险信号

**绝不：**
- 因为“它很简单”而跳过审查
- 忽略严重问题
- 带着未修复的重要问题继续
- 与合理的技术反馈争辩

**如果审查者有误：**
- 用技术理由反驳
- 展示能证明其有效的代码/测试
- 请求澄清

见模板：[code-reviewer.md](code-reviewer.md)
