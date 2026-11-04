---
name: unity-package-management
description: 从编辑器外部添加、移除、升级和发现 Unity（UPM）包，优先使用 Pipeline 包命令，C# 脚本作为回退。用于包安装、验证包 ID 和版本，或选择游戏需要哪些包。
allowed-tools:
  - Bash
  - Write
  - Edit
---

# Unity 包管理（优先使用 Pipeline 命令，C# 脚本作为回退）

使用项目 Pipeline 包的 `package` 命令，通过 `unity command` 运行，
添加、移除、升级和发现 UPM（Unity Package Manager）包。仅在没有编辑器能
响应这些命令时，才回退到从脚本无头驱动 `UnityEditor.PackageManager.Client`（参见[回退](#fallback-no-editor-to-ask-the-c-client-api)）。**不要**手动编辑
`Packages/manifest.json`：Package Manager 会正确解析依赖和兼容版本，
而手动编辑经常破坏解析。

这补充 **`unity-cli`** 技能（编辑器安装、项目创建、构建/测试），该技能
记录了 `unity command`、`unity status` 和 `unity pipeline install`。

## 优先使用 package 命令

Pipeline 包注册了一个 `package` 命令组：`add`、`remove`、`list`、`resolve`、
`search` 和 `status`。它们需要一个运行中的编辑器，且其项目有 `com.unity.pipeline`（用
`unity pipeline install` 添加它，然后 `unity open`，再用 `unity status --until-ready` 等待）。
每个命令的参数来自编辑器，因此在首次调用前先阅读它们。不要猜测
参数名。

```bash
unity status --until-ready --project-path "<project-path>"
unity command package --project-path "<project-path>"                  # the package commands this Editor has
unity command --query package --format json --project-path "<project-path>"   # each command's parameter schema
unity command package search --project-path "<project-path>"           # then pass the parameters the schema lists
unity command package add --project-path "<project-path>"              # add one or more packages by id
unity command package list --project-path "<project-path>"             # confirm what is installed
```

将命令的参数按其名称在其后传入，如 schema 命名它们那样（`unity command <group>
<command> --<parameter> <value>`）。当 schema 接受多个 id 时，在一次 `package add` 调用中添加你需要的每个包。当需要最低版本时，按 schema 描述的方式固定版本
（`@<version>` id 形式属于下面的 C# 回退）。使用 `package status` 或 `package list` 验证，并用
`package remove` 删除包。将非零退出视为失败并阅读其消息。

如果 `unity command package` 报告没有该组，则项目的 Pipeline 包早于它：
运行 `unity pipeline upgrade`，或使用下面的回退。

## 何时使用

- 在现有或新建项目中添加 / 移除 / 升级一个或多个包。
- 在 CI 中非交互地设置项目的包（没有编辑器运行时使用回退脚本）。
- 在依赖某个包 id 之前验证它存在，或查找其可用版本。
- 决定游戏实际需要哪些包——参见
  [references/select-packages.md](references/select-packages.md)。

## 选择要安装什么

安装项目实际需要的内容，而不是全部；优先使用所选模板已提供的包（URP 模板已包含渲染管线、Input System 等）。类型 / 外观 / 平台 / 变现 → 包的映射，以及如何搜索注册表，
见 [references/select-packages.md](references/select-packages.md)。生成一个**去重的
包 id 列表**，并在安装前向用户回读。

## 回退：没有编辑器可询问（C# Client API）

仅当 `package add` 无法运行时使用本节：没有打开编辑器且你不希望打开、项目没有 Pipeline 包，或命令组缺失且不想要
升级。它通过编辑器在批处理模式下运行的脚本中的 `Client.AddAndRemove` 进行安装。

## `-quit` 问题——为什么不要在安装时使用 `unity run`

`Client.Add` / `Client.AddAndRemove` 是**异步的**：它们返回一个 `Request`，仅在后续 `EditorApplication.update` 滴答时完成（UPM 子进程将其结果
回送到编辑器的主循环泵，因此阻塞的 `while (!req.IsCompleted)` 忙等
会使其死锁）。编辑器必须在 `-executeMethod` 返回后**保持存活**，直到请求
完成。

`unity run` **不能**用于安装器：其默认路径会注入 `-quit`（参见 **`unity-cli`** 技能中的保留
标志）。使用 `-quit` 时，编辑器在方法返回的瞬间退出——在 UPM 解析之前——因此包永远不会安装，回调永远不会运行。

**解决方案：** 直接以 `-batchmode` 启动**编辑器二进制**，**不带** `-quit`。编辑器保持存活，`EditorApplication.update` 持续滴答，轮询回调运行，并在完成时自行调用 `EditorApplication.Exit(code)` ——既退出又设置进程
退出码。

## 安装器脚本

将此写入 `Assets/Editor/ProjectBootstrap/PackageInstaller.cs`。它必须位于
`Editor/` 文件夹（或仅编辑器程序集）下，因为它使用 `UnityEditor`。

```csharp
using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace ProjectBootstrap
{
    // Installs (and optionally removes) a fixed set of packages via the PackageManager
    // Client API, headless-safe.
    public static class PackageInstaller
    {
        // EDIT this list to match the package selection (see references/select-packages.md).
        static readonly string[] PackagesToAdd =
        {
            "com.unity.inputsystem",
            "com.unity.cinemachine",
            "com.unity.render-pipelines.universal",
            // "com.unity.package@1.2.3"  // pin a version with @ when a minimum is required
        };

        // Optionally drop packages in the same resolution pass (e.g. a template default you don't want).
        static readonly string[] PackagesToRemove = { };

        const double TimeoutSeconds = 600; // UPM resolution + downloads can be slow

        static AddAndRemoveRequest _request;
        static double _deadline;

        // Invoke with: -executeMethod ProjectBootstrap.PackageInstaller.Install  (NO -quit)
        public static void Install()
        {
            if (PackagesToAdd.Length == 0 && PackagesToRemove.Length == 0)
            {
                Debug.Log("[PackageInstaller] Nothing to do.");
                EditorApplication.Exit(0);
                return;
            }

            Debug.Log($"[PackageInstaller] Adding: {string.Join(", ", PackagesToAdd)}");
            _request = Client.AddAndRemove(packagesToAdd: PackagesToAdd, packagesToRemove: PackagesToRemove);
            _deadline = EditorApplication.timeSinceStartup + TimeoutSeconds;
            EditorApplication.update += Poll;
        }

        static void Poll()
        {
            if (_request == null) return;

            if (!_request.IsCompleted)
            {
                if (EditorApplication.timeSinceStartup > _deadline)
                {
                    EditorApplication.update -= Poll;
                    Debug.LogError("[PackageInstaller] Timed out waiting for UPM.");
                    EditorApplication.Exit(2);
                }
                return;
            }

            EditorApplication.update -= Poll;

            if (_request.Status == StatusCode.Success)
            {
                var names = _request.Result.Select(p => $"{p.name}@{p.version}");
                Debug.Log($"[PackageInstaller] Resolved: {string.Join(", ", names)}");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[PackageInstaller] Failed: {_request.Error?.message}");
                EditorApplication.Exit(1);
            }
        }
    }
}
```

`AddAndRemove` 在单一次 UPM 解析过程中安装整个集合——比每个包一次 `Client.Add`
更快且更不易出错。

**用一个脚本添加 / 移除 / 升级：**
- **添加**：在 `PackagesToAdd` 中列出 id。
- **移除**：在 `PackagesToRemove` 中列出 id。
- **升级 / 固定**：用 `@<version>` 添加 id（例如 `com.unity.cinemachine@2.9.7`）。没有
  版本时，解析会选取最新的兼容发布版本。

## 发现 / 验证包

要在添加之前确认 id 存在或列出其版本，请搜索注册表。编辑器内的 `Client.SearchAll()` / `Client.Search("<id>")` 调用也是异步的，因此它们使用与安装器**相同的轮询并 `Exit` 模式以及相同的无头运行**。编写
`Assets/Editor/ProjectBootstrap/PackageSearch.cs`：

```csharp
using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace ProjectBootstrap
{
    public static class PackageSearch
    {
        const double TimeoutSeconds = 120;
        static SearchRequest _request;
        static double _deadline;

        // Invoke with: -executeMethod ProjectBootstrap.PackageSearch.SearchAll  (NO -quit)
        public static void SearchAll()
        {
            _request = Client.SearchAll();                 // or Client.Search("com.unity.cinemachine")
            _deadline = EditorApplication.timeSinceStartup + TimeoutSeconds;
            EditorApplication.update += Poll;
        }

        static void Poll()
        {
            if (_request == null) return;
            if (!_request.IsCompleted)
            {
                if (EditorApplication.timeSinceStartup > _deadline)
                {
                    EditorApplication.update -= Poll;
                    Debug.LogError("[PackageSearch] Timed out.");
                    EditorApplication.Exit(2);
                }
                return;
            }
            EditorApplication.update -= Poll;

            if (_request.Status == StatusCode.Success)
            {
                foreach (var p in _request.Result.OrderBy(p => p.name))
                    Debug.Log($"[PackageSearch] {p.name}@{p.versions.latestCompatible}  {p.displayName}");
                Debug.Log($"[PackageSearch] {_request.Result.Length} packages found.");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[PackageSearch] Failed: {_request.Error?.message}");
                EditorApplication.Exit(1);
            }
        }
    }
}
```

`_request.Result` 是一个 `PackageInfo[]`；每个条目暴露 `name`、`displayName`、`description`
和 `versions`（`.latest`、`.latestCompatible`、`.all`）。对于没有编辑器的仅终端检查（一个**已知** id，而非自由文本搜索），直接查询注册表——参见
[references/select-packages.md](references/select-packages.md#discovering-and-verifying-packages)。

## 无头运行它（直接调用编辑器，不带 `-quit`）

根据版本解析编辑器二进制，然后以批处理模式运行它。脚本通过 `EditorApplication.Exit` 自行退出，因此**不要**传递 `-quit`：

```bash
VERSION="<version>"          # e.g. 6000.0.47f1 (or an installed version)
PROJECT="<project-path>"
METHOD="ProjectBootstrap.PackageInstaller.Install"   # or ...PackageSearch.SearchAll

# Install directory of that editor (Hub layout), via the unity CLI
ED=$(unity editors path "$VERSION" --format json | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['path'])")

# Resolve the executable per-OS (handles both "dir containing Unity.app" and the ".app" itself)
case "$(uname)" in
  Darwin) if [ -d "$ED/Unity.app" ]; then UNITY_BIN="$ED/Unity.app/Contents/MacOS/Unity";
          elif [[ "$ED" == *.app ]]; then UNITY_BIN="$ED/Contents/MacOS/Unity";
          else UNITY_BIN="$ED/Unity"; fi ;;
  Linux)  UNITY_BIN="$ED/Editor/Unity" ;;
  *)      UNITY_BIN="$ED/Editor/Unity.exe" ;;   # Windows (Git Bash / MSYS); use Editor\Unity.exe in PowerShell
esac

"$UNITY_BIN" -batchmode -projectPath "$PROJECT" -executeMethod "$METHOD" -logFile -
echo "Exit code: $?"   # 0 = success, 1 = UPM error, 2 = timeout
```

`-logFile -` 将编辑器日志（包括 `[PackageInstaller]` / `[PackageSearch]`
行）流式传输到 stdout，以便你可以观察解析进度并阅读任何 UPM 错误。如果
你构建上的 `unity editors path` 输出形状不同，请改从
`unity editors --installed --format json` 获取目录。

## 验证

```bash
# Every requested id should appear as a dependency
cat "<project-path>/Packages/manifest.json"
```

确认运行以 `0` 退出，且列表中的每个包都存在于 `manifest.json` 中。如果某个
包解析失败，会记录 `_request.Error.message`；阅读它并对照注册表检查 id/版本。编辑器自己的日志（包括 `[PackageInstaller]` 行）就是你上面用 `-logFile -` 流式传输的
stdout——在那里阅读它，而不是通过 `unity logs`（它显示
CLI 自己的日志，而不是编辑器的）。

## 无头导入和保存（生成 `.meta` 文件）

在脚本或工具写入新的 `.cs`/资产文件后，Unity 必须**导入**它们，以便生成
每个资产所需的 `.meta` 文件——并且每个 `.cs`/资产必须与其
`.meta` 一起提交。仅仅打开项目一次（`unity open "<project-path>"`）就会导入并生成
它们；当你需要**无头**操作（在脚本或 CI 中）时使用此方法。

与包安装器不同，这是**同步的**——它在返回前完成——因此
可以安全地通过 `unity run` 运行（它注入的 `-quit` 无害；该方法也调用
`EditorApplication.Exit` 以获得干净的退出码）。编写
`Assets/Editor/ProjectBootstrap/ProjectSaver.cs`：

```csharp
using UnityEditor;
using UnityEngine;

namespace ProjectBootstrap
{
    public static class ProjectSaver
    {
        // Invoke with: -executeMethod ProjectBootstrap.ProjectSaver.SaveAll
        public static void SaveAll()
        {
            AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate);
            AssetDatabase.SaveAssets();
            Debug.Log("[ProjectSaver] Assets imported and saved.");
            EditorApplication.Exit(0);
        }
    }
}
```

```bash
unity run "<project-path>" --editor-version <version> \
  -- -executeMethod ProjectBootstrap.ProjectSaver.SaveAll
```

## 说明

- 这些编辑器脚本是引导便利工具。将它们留在
  `Assets/Editor/ProjectBootstrap/`（除非被调用，它们什么都不做）或在设置后删除它们——由你决定；向用户提及。
- 所有脚本都位于 `Editor/` 下，因为它们使用 `UnityEditor`；它们从不会随构建发布。
- 变现 / 后端包（`com.unity.purchasing`、`com.unity.services.levelplay`、
  UGS 包）通过同一机制安装，但实际的**集成**请通过专门的技能完成：**implement-in-app-purchases**、**levelplay-unity-integration**、
  **build-live-game**。
