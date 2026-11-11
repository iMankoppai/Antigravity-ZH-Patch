---
name: import-design-system
description: "将用户 user-provided 素材中的品牌、设计令牌、组件标准、写作指南和资源引用保存到 Spacefast 团队的设计系统中。"
---

# 导入设计系统

使用已连接的 Spacefast 工具。在代码仓库中工作时，保留无关的文件和改动。

如果任务需要某个现有 Space 且其身份不明确，调用 `choose_space`。将选中的 Space 作为目标。选中并不代表批准发布或其他改动。

在执行管理操作前，阅读 [references.md](references.md) 中的 MCP 调用、审批与工作模式规则。

1. 确定目标团队以及可选的 Space。阅读 references.md 中的团队记忆与技能（Team Memories and Skills）以及设计系统（Design system）。在提取标准之前，先阅读用户实际的参考资料。
2. 阅读当前已保存的文档和修订版本。仅准备有证据支撑的、针对品牌、编辑、令牌、组件和资源的改动；保留本次导入之外的字段。
3. 通过 updateTeamDesignSystem 并携带 expectedRevision 保存局部补丁，然后回读。报告已保存的范围和已更改的字段。导入标准不授权修改源码或部署。
