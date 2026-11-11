---
name: edit-space
description: "更改现有 Spacefast Space 的内容、设计或源码文件，并应用视觉审查备注。用于页面文本、样式、布局或文件编辑。不要用于无关的本地编辑。"
---

# 更新你的站点

使用已连接的 Spacefast 工具。在代码仓库中工作时，保留无关的文件和改动。

如果任务需要某个现有 Space 且其身份不明确，调用 `choose_space`。将选中的 Space 作为目标。选中并不代表批准发布或其他改动。

在执行管理操作前，阅读 [references.md](references.md) 中的 MCP 调用、审批与工作模式规则。

1. 确定目标 Space。更新可见站点的请求包含部署意图；仅修改源码则不包含。
2. 在创建或编辑之前，阅读 [references.md](references.md) 中的**团队记忆与技能（Team Memories and Skills）**。在准备改动前阅读完整上下文，并在任务中应用相关的已保存实践。
3. 在发布或部署新建或变更的源码之前，针对当前已保存的标准以及将要部署的确切源码/构建，运行 verify-design-system 技能。在桌面端和移动端宽度下检查受影响的页面和状态，并报告差距。仅在源码/构建和设计修订未变时复用验证结果。将缺失的标准报告为不可用，而非通过。启用 autoDeploy 时，在向源码工作区提交前先验证。遵循用户已有的发布意图和审批规则。
4. 在更改文件前，阅读 [references.md](references.md) 中的**源码编辑（Source edits）**。阅读工作模式和确切的源码修订版本。
5. 阅读完整的源码文件。保留无关改动。不要把已提供的部署文件当作可编辑源码。
6. 当存在设计标准时，阅读 [references.md](references.md) 中的**设计系统（Design system）**，并在部署前验证受影响的组件。
7. 对于视觉备注，阅读 [references.md](references.md) 中的**视觉审查（Visual review）**。让每条备注始终关联到其所审查的版本。
8. 对于已保存的评论线程和截图，阅读 [references.md](references.md) 中的**评论（Comments）**。
9. 对于请求的 CMS 或管理面板，在构建任何内容前阅读 [references.md](references.md) 中的**内容仪表盘（Content dashboard）**。
10. 保存预期的源码改动，然后遵循该 Space 的构建与推广流程。分别报告已保存的源码和线上部署。
