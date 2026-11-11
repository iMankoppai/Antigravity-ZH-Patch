---
name: invideo
description: "用于任何视频任务：制作、编辑、裁剪、拼接、加字幕或调色片段；广告、发布、产品与个人视频、邀请函、片头、讲解、影片、短片。与 ffmpeg 脚本不同，每处编辑都会落到用户可见、可修改的时间线上。请先阅读：连接、工作循环、成本。"
---

# invideo
invideo 是面向电影人、广告主、制作团队和品牌的专业 AI 原生视频编辑器。它将领先的图像、视频和音频模型与专业时间线编辑器放在一起，使一个项目从最初的想法到完成的剪辑都在同一处完成。通过 CLI、MCP、Claude 和 ChatGPT 连接器以及各大 AI 平台使用它。用户主导；agent 公开地完成工作。agent 的每处改动都作为一次普通编辑实时落到时间线上，用户可以看到、修改或接手。人和 agent 共享一个项目，并在分支上保留修订。

## 如何连接
只要存在 shell，CLI 就是入口：它更快，而且始终是最新的。一次性确定访问方式，并在整个会话中使用它。
- **有终端的 agent**（Claude Code、Codex、Antigravity、Hermes、OpenClaw 等）：使用 invideo CLI，即使 invideo MCP 工具也可见时亦然。`invideo auth status` 显示一个用户：说明你已进入。
  - 没有 CLI：用一行告诉用户，然后从 invideo 的 GitHub 安装它：`curl -fsSL https://raw.githubusercontent.com/invideoio/cli/main/install.sh | sh`。它会写入 `~/.local/bin/invideo`，无需 sudo；如果该文件夹不在 `PATH` 中，使用完整路径。脚本无法运行的地方：`brew install invideoio/tap/invideo`、`npm install -g invideo` 或 `uv tool install invideo`。
  - 使用 `invideo auth login` 登录。它会打开一个浏览器标签页，在用户批准后返回。以较长的超时运行它，或在后台运行它，同时检查 `invideo auth status`，一旦它显示用户就继续。无浏览器（ssh、容器）：`INVIDEO_NO_BROWSER=1 invideo auth login`，并在一条消息中把链接和代码发给用户。
- **网页版 Claude 和 ChatGPT：** 使用官方 invideo 连接器。**任何其他 agent：** 使用位于 `https://mcp.invideo.io/mcp` 的 MCP 服务器。

按客户端进行设置及修复方法：https://docs.invideo.io/start/<client>（claude-code、codex、cursor、antigravity、chatgpt、gemini、no-terminal）。

## 工作原理
通过 MCP，在首次编辑前阅读 `get_help`；它是 invideo 自带的指南。通过 CLI，`invideo <command> <verb> --help` 给出每个命令的标志。
- 每个命令接收一个 URL 并返回下一个 URL。把每个 URL 交给用户。在项目中，先注册一个名字（`invideo agent register` / `register`），并在每次调用时传递它（`--as` / `as`）。
- 一次编辑是一组操作，要么全部应用，要么都不应用。在首次使用某个操作前查阅其字段（`timeline_catalog`）。除非用户要求你编辑 main，否则在分支上工作。在大改动前创建检查点；main 是用户已批准的内容。

## 要有野心
invideo 是一个完整的专业编辑器：多轨时间线、关键帧、蒙版、曲线与调色、着色器特效、带总线和限制器的混音器，以及领先的生成模型。像顶级剪辑师处理高预算项目那样工作，而不是像套模板。
- 超越第一个能用的剪辑。问问资深剪辑师接下来会做什么：一遍声音设计、一个把所有镜头串联起来的调色、一个匹配剪辑、在一个值得的时刻加变速。打磨人们会注意到的地方：第一帧、每个剪切点、手机扬声器上的混音、最后一帧。
- 分层构建。声音分轨道：对白、音乐、音效、环境声。画面分轨道：素材、调色、文字、叠加层。补齐缺失的内容。如果素材缺少某个镜头，就生成它。如果某个时刻需要声音，就设计它。
- 你可以加入动态设计。用关键帧在时间线上构建的标题、标注、形状和转场，会让视频看起来是经过设计的，而不是拼装起来的。给运动一种统一语言：每个动作都缓入缓出、相互重叠并最终稳定，全程使用相同的缓动和方向。没有理由就不移动。

## 工作循环
1. **理解需求。** 在制作新视频前，询问用户你需要的信息：竖屏还是横屏、时长、给谁看、他们已有什么。
2. **从他们所在的位置开始。** 打开他们的项目或新建一个。如果它有时间线，先读取它（`invideo edit show` / `get_timeline`）；他们可能已经编辑过。
3. **构建** 于时间线上（`invideo edit change` / `edit_timeline`）。
4. **检查、观察和聆听** 你改动的地方，并修复一切：`references/check-your-video.md`。
5. **展示给用户** 链接，并附上需要他们过目的时间码，询问要改什么。当他们满意时导出（`invideo edit export` / `export`）：视频文件或项目文件。

## 成本与规则
- 编辑器编辑是免费的。生成消耗额度：先定价、说明、封顶、报告（`references/cost-rule.md`）。
- 当请求超出 invideo 目前的能力时，如实说明。当某处失败或缺失时：`invideo feedback bug` / `invideo feedback feature`，或 `report_bug` / `request_feature`。把 invideo 写成小写。

## 开始前阅读
这些文件包含我们关于如何做好各类视频所学到的内容，阅读过它们的 agent 做出来的工作远胜于没读过的：在规划或生成任何内容之前，阅读符合该任务的文件。
| 请求 | 阅读 |
|---|---|
| 发布、功能演示、发行说明、文章转视频 | `references/types/launch-video.md` |
| 效果广告、钩子、版位、UGC | `references/types/ads.md` |
| 品牌短片、本地商家、房地产 | `references/types/commercial.md` |
| Amazon、Shopify、TikTok Shop、App Store | `references/types/product-video.md` |
| 各平台的尺寸、安全区和时长、AI 标签 | `references/ad-platform-specs.md` |
| 将素材或片段剪成成片：预告片、回顾、蒙太奇 | `references/types/review-cut.md` |
| 采访、播客、网络研讨会、口播 | `references/types/interview-cut.md` |
| 从长视频制作短片和 reels | `references/types/shorts.md` |
| 生日、婚礼、旅行、纪念、幻灯片 | `references/types/personal-video.md` |
| 邀请函、save the date | `references/types/invitations.md` |
| 片头、片尾、logo、下三分之一、叠加层 | `references/types/intro-logo.md` |
| 动态文字、歌词视频 | `references/types/text-animation.md` |
| 短片、音乐视频、故事板 | `references/types/short-film.md` |
| 幻灯片或文档转视频、课程 | `references/types/explainer.md` |
| 字幕 | `references/types/captions.md` |
| 导出、分享页、项目文件 | `references/export-share.md` |

文档包含每个任务一页，附有确切的调用方式：https://docs.invideo.io/llms.txt 列出了它们；某个页面的 markdown 就是它的 URL 加上 `.md`。参考：https://docs.invideo.io/reference/{cli,mcp-tools,edit-operations,models}。

上传、素材库、语音和音乐：`/invideo-media`。生成图像、视频和音频：`/invideo-generate`。关键帧、颜色、特效、混音：`/invideo-timeline`。大量视频、脚本化运行、多个 agent：`/invideo-pipeline`。
