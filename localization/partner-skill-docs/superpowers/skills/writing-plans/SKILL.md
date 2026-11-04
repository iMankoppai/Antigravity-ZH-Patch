---
name: writing-plans
description: 当你为一个多步骤任务有了规格说明或需求时使用，在接触代码之前
---

# 编写计划

## 概述

为一个没见过这套代码库、也没见过这份规格说明的工程师编写实现计划。假设他们一旦知道了确切的接口和确切的测试，就会用项目语言写出地道的代码，并且凡计划留待开放之处他们都会做出合理的选择。他们无法知道的是你所决定的东西：哪些文件、哪些名称和签名、规格说明里的哪些值、哪些测试证明每个任务。把这些记录下来。把整个计划以一口大小的任务形式交给他们。DRY。YAGNI。TDD。频繁提交。

**开始时宣布：** "我正在使用 writing-plans 技能来创建实现计划。"

**上下文：** 如果在隔离的 worktree 中工作，它应当在执行时通过 `superpowers:using-git-worktrees` 技能创建。

**将计划保存到：** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- （用户对计划位置的偏好高于此默认值）

## 范围检查

如果规格说明覆盖多个相互独立的子系统，它本应在头脑风暴期间被拆分成子项目规格。如果没有，建议把它拆成独立的计划——每个子系统一份。每份计划都应能独立产出可运行、可测试的软件。

## 文件结构

在定义任务之前，先规划出将创建或修改哪些文件、以及每个文件负责什么。分解的决策就在这里锁定。

- 设计具有清晰边界和明确接口的单元。每个文件都应有一个清晰的职责。
- 你对自己能在上下文里同时容纳的代码推理得最好，当文件聚焦时你的编辑也更可靠。优先选择更小、更聚焦的文件，而非承担过多职责的大文件。
- 一起变更的文件应当放在一起。按职责拆分，而不是按技术层拆分。
- 在既有代码库中，遵循既有的模式。如果代码库使用大文件，不要单方面重构——但如果你正在修改的文件已经变得难以驾驭，在计划里包含一次拆分是合理的。

这个结构会影响任务分解。每个任务都应产出可独立理解的、自成一体的改动。

## 任务规模适度

任务是能携带自己的测试周期、且值得让一位新审查者把关的最小单位。划定任务边界时：把设置、配置、脚手架和文档步骤并入那个交付物需要它们的任务；只在审查者能切实地否决一个任务却同时批准其相邻任务的地方拆分。每个任务以一个可独立测试的交付物结束。

## 步骤粒度

**每一步都是一个动作，带一个可检查的结果：**
- "写失败的测试" —— 一步
- "运行它以确保它失败" —— 一步
- "实现让测试通过的最少代码" —— 一步
- "运行测试并确保它们通过" —— 一步
- "提交" —— 一步

## 计划文档头部

**每份计划都必须以此头部开始：**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Spec:** [path to the spec/design doc this plan implements — the plan
argues from the spec, so the spec travels with it; executors read both]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

## Review Focus

[The five input classes or failure modes the spec implies but no task's
tests exercise that are most likely to bite a person using this software
— one line each, naming the input or condition and the behavior a
reasonable person would expect, most likely first. The spec is a vision
document: it says what the software must do, not everything it will
meet, and its silence on an input is not permission for that input to
break the program. Write the list here, once, with the spec in front of
you. Then, for each line, add the test that pins it to the task that
owns the code, in that task's own step style.]

---
```

## 任务结构

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Implement `function(input: InputType) -> ResultType` in `exact/path/to/file.py`**

One line on the approach when the signature and the test leave a choice
(which library call, which data structure); a code block only for an
algorithm they do not determine.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## 一个步骤包含什么

当一个实现者能从中写出恰好一件合理的事情时，这一步就完成了。这就是全部要求：无歧义，而非完整。每一类步骤携带让它无歧义所必需的东西，不多不少：

- **一个测试步骤：** 测试的名称及其断言，以代码形式，其中带上规格说明的确切值。
- **一个代码步骤：** 确切的签名（名称、参数、返回类型）、它所在的文件，以及规格说明所钉死的具体值。实现者写函数体。只有当签名和测试无法确定某个算法时，或规格说明钉死了确切的副本时，才出现函数体。
- **一个验证步骤：** 要运行的命令，以及表示它通过了的输出。
- **对另一个任务的引用：** 那个任务的 Interfaces 块说明该用什么；计划不重复那个任务的代码。

计划是实现者无法独自做出的那组决定。一份比它所描述的代码还长的计划，等于把代码写了出来。那些什么也没决定的句子（"TBD"、"处理边界情况"、"添加适当的校验"、"为上述内容编写测试"、某个没有任何任务定义的类型或函数）是相反方向的失败，而自审会把两者都抓出来。

## 自审

写完完整计划后，用新的眼光看规格说明，并对照它检查计划。这是一份你自己运行的清单——不是派发子智能体。

**1. 规格覆盖：** 略读规格说明里的每一节/每项需求。你能指出一个实现它的任务吗？列出任何缺漏。

**2. 步骤扫描：** 每一步都必须让实现者写出恰好一件合理的事情，且没有哪一步能携带超过这一点：一句什么都不决定的句子是缺漏，而一个签名和测试已经确定的函数体则是转录。两者都要修。

**3. 类型一致性：** 你在后续任务中使用的类型、方法签名和属性名，是否与你在较早任务中定义的一致？一个函数在第 3 个任务里叫 `clearLayers()`，在第 7 个任务里却叫 `clearFullLayers()`，这就是个缺陷。

**4. 审查重点：** 对于规格说明暗示的每一类输入或失败模式，是否有一个任务的测试覆盖它？最可能影响使用者的五个未覆盖项放进 Review Focus 一节，那里每一行都会把对应的测试加到拥有的那个任务里。一个空的小节意味着你检查过、没有发现，而不是你跳过了检查。

**5. 比例：** 比较计划的长度与规格说明的长度。一份比它所实现的规格说明长好几倍的计划，是程序的转录，而不是计划。如果代码块是文档的大部分，就用签名、测试名称和断言替换函数体，并检查每一步是否仍然无歧义。

如果发现问题，就地修正。无需重新审查——改完继续即可。如果你发现一项没有任务对应的规格需求，补上那个任务。

## 执行交接

保存并自审计划之后，把它链接给你的人类伙伴阅读。如果他们已明确提供了执行方式，请他们审阅计划并确认它抓住了他们想要的；在实现之前等待那次审阅，然后使用保留的方式。否则，请他们审阅计划，并在实现之前选择一种执行方式。

**当尚未提供任何执行方式时：**

**"计划已完成，保存到 `docs/superpowers/plans/<filename>.md`。请审阅计划。你更倾向于哪种执行方式？**

- **子智能体驱动** —— 一个全新的子智能体实现每个任务，一个全新的审查者在下一个任务开始前检查它，最后进行整分支审查。最彻底；每个任务和每次审查都要花一份全新的上下文。
- **原生** —— 我在本会话里自己实现每个任务，按这个 harness 运行工作的方式，然后由一位使用最强模型的全新审查者检查整个分支。最便宜也最快；直到最后才有独立审查。用中档的会话模型也运行良好，因为计划承载了设计。

**对于这份计划，我推荐 <两者之一>，因为 <出自计划的一句话：任务之间在多大程度上依赖彼此的接口、任务有多少、一个已发布的错误会付出什么代价>。计划是否抓住了你想要的，我们该用哪种方式？"**

**当已经提供了执行方式时：**

**"计划已完成，保存到 `docs/superpowers/plans/<filename>.md`。请审阅计划。它是否抓住了你想要的？"**

**如果选择了子智能体驱动：**
- **必需子技能：** 使用 superpowers:subagent-driven-development

**如果选择了原生：**
- **必需子技能：** 使用 superpowers:executing-plans
