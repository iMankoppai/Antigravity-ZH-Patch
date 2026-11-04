---
name: sentry-snapshots-cocoa
description: 面向 Apple/Cocoa 项目的完整 Sentry Snapshots 设置。在被要求“setup SnapshotPreviews”、“setup Apple snapshot testing”、“upload Apple snapshots to Sentry”、“setup Apple snapshot GitHub Actions”或“setup Apple selective snapshot testing”时使用。
license: Apache-2.0
---
# 面向 Apple/Cocoa 的 Sentry Snapshots

## 范围

- 目标：生成 Apple 快照图像并把它们上传到 Sentry Snapshots。
- 先检测现有的快照生成，包括 Point-Free
  `swift-snapshot-testing`；当它已经能发出或可以发出 PNG 或 JPEG 时，保留它。
- 仅在设置 Sentry 第一方
  SnapshotPreviews 方案时，才使用 Sentry Wizard 的 `appleSnapshots` 流程。
- 仅在向导不可用、无法在消除歧义后以非交互方式解析目标、或在明确消除歧义后失败时，
  才使用手动设置。
- 仅打包的 SwiftPM：停下来询问宿主应用/测试目标；不支持独立
  `swift test` 渲染。

快照上传会把生成的图像与元数据发送到 Sentry。
确认目标组织/项目和导出目录，并在上传前检查这些
图像是否包含客户数据或其他敏感内容。
仅在用户请求的范围内上传所选的快照输出。

## 检测

在调用向导之前，只做足够用于路由的检测：

```bash
# SnapshotPreviews (Sentry first-party) -> prefer wizard / SnapshotPreviews routing
find . \( -name Package.swift -o -name Package.resolved -o -path '*/project.pbxproj' \) -print0 2>/dev/null | xargs -0 grep -lE "SnapshotPreviews" 2>/dev/null

# Point-Free swift-snapshot-testing -> preserve generator, swift-snapshot-testing CI path
find . \( -name Package.swift -o -name Package.resolved -o -path '*/project.pbxproj' \) -print0 2>/dev/null | xargs -0 grep -lE "swift-snapshot-testing|SnapshotTesting|assertSnapshot|__Snapshots__|TEST_RUNNER_SNAPSHOT_TESTING_RECORD" 2>/dev/null

# Required wizard input
find . -name '*.xcodeproj' -print 2>/dev/null | head -20

# Workflow shape
ls fastlane/Fastfile Gemfile 2>/dev/null

# Sentry auth presence only -> never print secret values
[ -n "$SENTRY_AUTH_TOKEN" ] && echo "SENTRY_AUTH_TOKEN=set" || echo "SENTRY_AUTH_TOKEN=unset"
[ -n "$SENTRY_ORG" ] && echo "SENTRY_ORG=set" || echo "SENTRY_ORG=unset"
[ -n "$SENTRY_PROJECT" ] && echo "SENTRY_PROJECT=set" || echo "SENTRY_PROJECT=unset"
```

记录：现有 SnapshotPreviews 设置、现有快照生成器/库、输出
目录（若已知）、Xcode 项目目录、CI 提供商、Fastlane 以及 Sentry 鉴权。
对每个 `.xcodeproj` 匹配项，记录其所在目录供 `--xcode-project-dir` 使用；
如果 `find` 打印 `./MyApp/MyApp.xcodeproj`，则传 `./MyApp`，而不是该 bundle 路径。
仅当不存在现有生成器时，才让向导检测 app 目标、宿主 XCTest 目标与 Swift previews。

## 路由

按此顺序解析路由；设置是主要路径，CI 是可选的后续步骤。

1. 选择或创建图像生成器：
   - 具名生成器优先；
   - 存在多个现有生成器且用户未选择 -> 询问；
   - 存在非 SnapshotPreviews 的现有生成器 -> 保留它；
   - 存在 SnapshotPreviews -> 使用它；
   - 没有现有生成器 -> 默认设置 SnapshotPreviews，用于 Sentry Snapshots 或
     Apple 快照测试。
2. 对于 SnapshotPreviews，如果没有 `.xcodeproj`
   宿主应用或没有宿主 XCTest 目标，则在设置/验证/CI 之前停下。
   在保留另一个生成器时，这些停止不适用。
3. 对于设置或验证：
   - 存在非 SnapshotPreviews 的现有生成器 -> 阅读 `references/snapshots.md`；
   - 存在 SnapshotPreviews -> 阅读 `references/snapshot-previews.md` 与
     `references/snapshots.md`；
   - 新建 SnapshotPreviews 设置 -> 阅读 `references/wizard-setup.md`；
   - 向导报告没有 Swift previews -> 在添加 previews 或选择另一个
     生成器之前先询问。
4. 仅在图像生成器存在之后，才处理 GitHub Actions/CI：
   - Point-Free `swift-snapshot-testing` -> 阅读
     `references/github-actions-swift-snapshot-testing.md` 与
     `references/snapshots.md`；
   - 其他非 SnapshotPreviews 生成器 -> 阅读 `references/snapshots.md` 并调整
     现有 CI/上传；
   - SnapshotPreviews，仅一个模拟器，无 matrix/fanout/选择式 CI -> 阅读
     `references/github-actions-simple.md`；
   - SnapshotPreviews，含多个模拟器、设备家族、matrix 或任何
     选择式 CI -> 阅读 `references/github-actions-fanout.md` 与
     `references/snapshot-previews.md`。

## 可选参考

| 需求 | 阅读 |
| --- | --- |
| 第一方 SnapshotPreviews 设置、消除歧义或手动兜底 | `references/wizard-setup.md` |
| SnapshotPreviews 元数据、渲染偏好、选择性渲染，或 SnapshotPreviews 专属故障排查 | `references/snapshot-previews.md` |
| 用 Fastlane、`sentry-cli`、清单、CI 说明把任何生成的快照图像上传到 Sentry，或上传故障排查 | `references/snapshots.md` |
| 单目标 GitHub Actions 工作流 | `references/github-actions-simple.md` |
| 多目标/扇出 GitHub Actions 工作流 | `references/github-actions-fanout.md` |
| Point-Free `swift-snapshot-testing` GitHub Actions 工作流 | `references/github-actions-swift-snapshot-testing.md` |

## 完成检查

- 所选的快照图像生成器已按上述路由进行记录，并被保留或配置。
- 快照生成出现在相关的本地或 CI 测试日志中。
- 导出目录包含 `.png` 文件以及任何生成的 `.json` sidecar。
- 上传成功并打印一个 Sentry URL 或 snapshot id。
- 基础分支上传是完整的；选择性 PR 上传包含完整的图像名称清单。
