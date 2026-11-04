---
name: receiving-code-review
description: 在接收代码审查反馈时、在实现建议之前使用，尤其是当反馈显得不清楚或技术上存疑时 —— 需要技术上的严谨和核实，而不是表演式的认同或盲目实现
---

# 代码审查的接收

## 概述

代码审查需要技术评估，而不是情绪表演。

**核心原则：** 实现之前先核实。假设之前先提问。技术正确性高于社交舒适。

## 回应模式

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## 禁止的回应

**绝不：**
- “你完全正确！”（明确违反指令文件）
- “说得太好了！”/“极好的反馈！”（表演式）
- “我现在就来实现它”（在核实之前）

**改为：**
- 复述技术需求
- 提出澄清性问题
- 如有误则用技术理由反驳
- 直接开始工作（行动 > 言语）

## 处理不清楚的反馈

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**示例：**
```
your human partner: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Implement 1,2,3,6 now, ask about 4,5 later
✅ RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

## 按来源分别处理

### 来自你的人类伙伴
- **可信** - 理解后实现
- 如范围不清楚，**仍要询问**
- **不做表演式认同**
- **直接行动** 或技术性确认

### 来自外部审查者
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with your human partner's prior decisions:
  Stop and discuss with your human partner first
```

**你的人类伙伴的规则：** “外部反馈 —— 保持怀疑，但仔细核查”

## 对“专业级”功能的 YAGNI 检查

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**你的人类伙伴的规则：** “你和审查者都向我汇报。如果我们不需要这个功能，就不要添加它。”

## 实现顺序

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

## 何时应当反驳

在以下情况反驳：
- 建议破坏了现有功能
- 审查者缺乏完整上下文
- 违反 YAGNI（未使用的功能）
- 对此技术栈而言技术上不正确
- 存在遗留/兼容性原因
- 与你人类伙伴的架构决定冲突

**如何反驳：**
- 使用技术理由，而非防御姿态
- 提出具体问题
- 引用可运行的测试/代码
- 若是架构层面的，让你的人类伙伴参与

**如果你不习惯当面反驳：** 说出这种紧张感，然后把你看到的问题告诉你的伙伴。他们会欣赏你的坦诚。

## 认可正确的反馈

当反馈确实正确时：
```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**为什么不道谢：** 行动会说话。直接修复它。代码本身表明你听到了反馈。

**如果你发现自己正要写“谢谢”：** 删掉它。改为陈述修复。

## 体面地纠正你的反驳

如果你提出了反驳却错了：
```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

事实性地陈述纠正，然后继续。

## 常见错误

| 错误 | 修正 |
|---------|-----|
| 表演式认同 | 陈述需求或直接行动 |
| 盲目实现 | 先对照代码库核实 |
| 批量实现而不测试 | 一次一个，逐个测试 |
| 假定审查者正确 | 检查是否会破坏东西 |
| 回避反驳 | 技术正确性 > 舒适 |
| 部分实现 | 先澄清所有条目 |
| 无法核实却照旧推进 | 说明局限，请求指示 |

## 真实示例

**表演式认同（坏）：**
```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**技术核实（好）：**
```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI（好）：**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

**不清楚的条目（好）：**
```
your human partner: "Fix items 1-6"
You understand 1,2,3,6. Unclear on 4,5.
✅ "Understand 1,2,3,6. Need clarification on 4 and 5 before implementing."
```

## GitHub 线程回复

在回复 GitHub 上的内联审查评论时，在评论线程中回复（`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`），而不是作为顶层 PR 评论。
