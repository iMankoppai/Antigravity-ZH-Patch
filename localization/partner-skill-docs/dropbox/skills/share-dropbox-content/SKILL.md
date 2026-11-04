---
name: share-dropbox-content
description: 通过创建共享链接、检查已有共享链接或说明当前共享链接状态来共享 Dropbox 文件或文件夹。仅在用户明确要求创建共享链接、检查访问或检查某个 Dropbox 共享链接时使用。
disable-model-invocation: false
---

# 共享 Dropbox 内容

使用此技能创建或检查 Dropbox 共享链接，并说明共享链接状态。

## 工具

- `create_shared_link`
- `list_shared_links`
- `get_shared_link_metadata`
- `get_file_metadata`
- `search`
- `list_folder`

## 工作流

1. 识别目标文件或文件夹。
2. 若目标不明确，使用 `search` 或 `list_folder` 并请用户选择。
3. 使用 `get_file_metadata` 确认确切目标。
4. 在检查当前共享状态时，或在创建新链接前且现有链接重要时，使用 `list_shared_links`；在将现有链接状态视为完整之前，只要响应指示 has_more 或返回游标就继续。
5. 当用户提供或询问特定共享链接时，使用 `get_shared_link_metadata`。
6. 在调用 `create_shared_link` 之前，汇总确切的共享计划并请求明确确认。
7. 共享后，报告生成的 URL、生效的访问设置以及任何警告或部分失败。
8. 若用户要求添加查看者、添加收件人或直接与指定人员共享，说明在这些 MCP 工具可用之前无法进行收件人共享。适当时提供改为创建共享链接。

## 需要确认

在创建共享链接之前，确认：

- 确切的目标文件或文件夹
- 用户所请求的链接/访问设置
- 到期时间、密码或下载设置（受支持时）

## 输出

成功操作后，包含：

- 共享链接 URL
- 链接是新建的还是复用的
- 生效的访问设置
- 任何关于现有链接设置与所请求设置不同的警告
- 检查现有链接时，共享链接分页是否完整

## 安全

在找到、下载或创建内容后，切勿自动创建链接。不要声称已向指定收件人或查看者授予访问权限；收件人共享工具不可用。

## 良好触发

- “为这个 Dropbox 文件夹创建共享链接。”
- “创建一个指向此文件的链接。”
- “检查谁能访问这个 Dropbox 链接。”
- “给我一个发布演示文稿的共享链接。”

## 不适用场景

- 用户只想查找文件。使用 `find-dropbox-content`。
- 用户只想要元数据或内容摘要。使用 `inspect-dropbox-file`。
- 用户想从他人处收集上传。使用 `collect-files-with-request`。
- 用户想添加查看者或直接与指定收件人共享。说明在所需 MCP 工具被暴露之前无法进行收件人共享。
