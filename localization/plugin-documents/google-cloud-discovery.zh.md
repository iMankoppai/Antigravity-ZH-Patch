# Google Cloud 技能路由

本插件只内置了少量 Google Cloud 技能。请核实实际可用的技能，不要仅凭本文件作出假设。同一公开目录中还有许多技能**并未内置于此插件**；获取它们之前，无法通过本插件读取或加载。

当请求所需的专业知识超出内置技能的范围时，请指出可能适用的目录技能并获取它。目录中的命名通常遵循以下规律：

- `gke-*`：GKE 集群、网络、存储、扩缩容、成本、AI 推理和故障排查
- `agent-platform-*`：模型部署、调优、RAG、评估、端点和提示词
- `google-cloud-solution-*`：跨产品参考架构
- `google-cloud-waf-*`：架构完善框架的各个支柱
- `genkit-*`、`gemini-*`：Genkit SDK 和 Gemini API
- `cloud-logging-*`、`cloud-monitoring-*`：可观测性
- `<product>-basics`：BigQuery、Bigtable、Spanner、AlloyDB、Cloud SQL、Cloud Run、Firebase 和 Storage

如果可以使用 `finding-google-skills`，请用它搜索目录，不要根据上面的前缀猜测；它会获取当前索引并返回确切入口。否则，请浏览 https://github.com/google/skills/tree/main/skills/cloud

## 如何获取目录中的技能

通常应采用获取方式，无需安装任何内容。`finding-google-skills` 通过网络读取技能的 `SKILL.md`，供当前请求使用。它不会向用户系统写入文件，不会向此插件添加内容，会话结束后技能也不会保留。优先采用此方式。

安装则由用户通过自己的工具完成。安装后的技能位于用户自己的技能目录中，并不属于此插件。是否需要重启才能使用取决于用户的智能体，因此不要承诺安装后立即可用。

目录中的技能不会成为此插件的一部分。插件内容固定于用户安装的版本，获取和安装这两种方式都不会改变它。

对于可以直接获取的技能，不要把安装说成唯一途径。会话通常在沙箱中运行，未经提权或用户操作可能无法安装，因此用户可能无法执行安装技能的建议。

不要根据技能名称推断其内容。如果回答需要依赖无法读取的技能，请明确说明，不要凭记忆作答。
