---
name: spacefast
description: "将现有的网站、应用、报告或其他产物发布到 Spacefast，并验证其线上链接。也用于读取或管理团队记忆（Memories）以及查看团队技能（Skills）。要更改现有 Space 的内容或设计，请使用 edit-space。"
---

# 发布你的作品

使用已连接的 Spacefast 工具。在代码仓库中工作时，保留无关的文件和改动。

如果任务需要某个现有 Space 且其身份不明确，调用 `choose_space`。将选中的 Space 作为目标。选中并不代表批准发布或其他改动。

在执行管理操作前，阅读 [references.md](references.md) 中的 MCP 调用、审批与工作模式规则。

1. 对于团队记忆或技能的请求，确定团队以及可选的 Space。阅读 references.md 中的团队记忆与技能（Team Memories and Skills），并仅执行所请求的上下文工作。仅当用户同时请求时才发布。
2. 使用用户想要发布的产物。保留其预期的目标位置和访问设置。
3. 在创建或编辑之前，阅读 [references.md](references.md) 中的**团队记忆与技能（Team Memories and Skills）**。在准备改动前阅读完整上下文，并在任务中应用相关的已保存实践。
4. 在发布或部署新建或变更的源码之前，针对当前已保存的标准以及将要部署的确切源码/构建，运行 verify-design-system 技能。在桌面端和移动端宽度下检查受影响的页面和状态，并报告差距。仅在源码/构建和设计修订未变时复用验证结果。将缺失的标准报告为不可用，而非通过。启用 autoDeploy 时，在向源码工作区提交前先验证。遵循用户已有的发布意图和审批规则。
5. 阅读 [references.md](references.md) 中的**发布（Publish）**。其中涵盖此主机的发布路由、回执和验证。
6. 不要依据已提供的文件重建现有 Space。对于文件或设计更改，请改用源码工作流程。
7. 返回结果中的线上链接和版本链接。说明该版本是已上线还是仅已就绪。
8. 对于请求的预览、重定向或 GitHub 工作流程，阅读 [references.md](references.md) 中相应的章节。
