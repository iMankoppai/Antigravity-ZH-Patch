---
name: dt-setup-android
description: '用 Dynatrace Mobile Agent 对现有 Android 项目（Kotlin 或 Java）进行基本监控插桩。仅涵盖从零到首个事件的设置：Gradle 插件、代理配置和用户隐私选择加入。不用于初始插桩之外的高级 Dynatrace 配置。'
license: Apache-2.0
---

# Android Dynatrace 插桩

> **范围：** 仅基本设置 —— 从零到首个事件。对于初始插桩之外的任何内容（自定义操作、崩溃分组、数据隐私策略等），请直接参考 Dynatrace 文档。

## 阶段 1：预检

在做任何其他事情之前，通过查找 `settings.gradle.kts` 或 `settings.gradle` 确认当前目录是 Android 项目根目录。如果两者都不存在，**停止并告诉用户这不是 Android 项目根目录**，并请他们导航到正确的目录。

然后验证以下最低要求。如果不满足任何一项，**停止并告知用户**在继续之前需要升级什么：

| 要求                 | 最低 |
| --------------------------- | ------- |
| Gradle                      | 7.0.2   |
| Android Gradle Plugin (AGP) | 7.0     |
| JVM                         | Java 11 |

运行 `./gradlew --version`（Windows 上为 `gradlew.bat --version`）。输出涵盖 Gradle 以及 Gradle 实际使用的 JVM（`Daemon JVM` 行），当项目在 Android Studio 或 IntelliJ 中打开时，这可能与系统 Java 不同。不要使用 `java -version` —— 它可能报告与构建实际运行的不同的 JDK。AGP 版本在根构建文件中声明。

## 阶段 2：检测现有设置

如果在构建文件的任何地方找到 `dynatrace { }` 块或 `configure<com.dynatrace.tools.android.dsl.DynatraceExtension> { }` 块（当类被导入时也写作 `configure<DynatraceExtension> { }`），读取它并提取（如果存在）：

- `applicationId`（传给 `applicationId(...)` 或 `applicationId '...'` 的值）
- `beaconUrl`（传给 `beaconUrl(...)` 或 `beaconUrl '...'` 的值）

将这些保存为预填值以带入阶段 3。如果任一值缺失或使用占位符（例如 `YOUR_APPLICATION_ID`），则视为未找到。继续到阶段 3。

## 阶段 3：收集输入

**首先**，只询问：

1. `applicationId` —— Dynatrace 应用 ID。告诉用户这可以在其 Dynatrace 租户中他们已经创建的移动应用内找到。如果在阶段 2 中提取到了值，将其作为当前值显示，并请用户确认或替换。
1. `beaconUrl` —— Dynatrace beacon URL。告诉用户这也可以在其 Dynatrace 租户中同一移动应用配置内找到。同样：如有提取到的值则显示，并请确认或替换。

一旦用户确认或提供了两者，**然后**询问 —— 除非用户已在其初始请求中说明了会话回放偏好，此时跳过此问题并使用他们所说的：

1. 会话回放 —— 是否应启用会话回放？（是/否）

## 阶段 4：定位文件

### 查找应用模块

应用模块并不总是命名为 `app`。读取 `settings.gradle.kts` 或 `settings.gradle` 找出所有包含的模块，然后检查每个模块的构建文件是否有 `com.android.application` 插件。使用应用它的第一个模块的目录作为下面所有路径中的 `APP_MODULE`。

macOS / Linux：

```bash
grep -r -l --include="*.gradle" --include="*.gradle.kts" --exclude-dir=buildSrc "com.android.application" .
```

Windows（cmd）：

```text
findstr /s /m "com.android.application" *.gradle *.gradle.kts
```

Windows（PowerShell）：

```text
Get-ChildItem -Recurse -Include "*.gradle","*.gradle.kts" | Select-String "com.android.application" | Select-Object -ExpandProperty Path
```

丢弃任何匹配行包含 `apply false` 的结果 —— 那些是根构建文件中的版本目录声明，不是实际的插件应用。同时丢弃 `buildSrc/` 下的任何结果。

如果过滤后仍未找到应用 `com.android.application` 的模块，**停止并报告失败** —— 此时尚未修改任何文件。

### 编辑前要读取的文件

- **根** `build.gradle.kts` / `build.gradle`（与 settings 文件同级）
- **应用** `APP_MODULE/build.gradle.kts` / `APP_MODULE/build.gradle`
- **入口点源文件** —— 见下文

### 查找入口点文件

**首选：Application 类。** 使用适合操作系统的命令在源码树中搜索扩展 `Application` 的类：

macOS / Linux：

```bash
grep -r -l --include="*.java" "extends Application" APP_MODULE/src
grep -r -l --include="*.kt" ": Application()" APP_MODULE/src
```

Windows（cmd）：

```text
findstr /s /m "extends Application" APP_MODULE\src\*.java
findstr /s /m ": Application()" APP_MODULE\src\*.kt
```

Windows（PowerShell）：

```text
Get-ChildItem -Recurse -Path APP_MODULE/src -Include "*.java" | Select-String "extends Application" | Select-Object -ExpandProperty Path
Get-ChildItem -Recurse -Path APP_MODULE/src -Include "*.kt" | Select-String ": Application()" | Select-Object -ExpandProperty Path
```

如果找到，使用该文件。在其 `onCreate()` 内、`super.onCreate()` 之后添加隐私选择加入调用。

**后备：启动 Activity。** 如果不存在 Application 类，在 `AndroidManifest.xml` 中找到启动 Activity —— 它是包含以下内容的 `<activity>`：

```text
<action android:name="android.intent.action.MAIN" />
<category android:name="android.intent.category.LAUNCHER" />
```

读取该 Activity 的 `android:name` 属性，定位其源文件，并在 `onCreate()` 内、`setContentView(...)` 之后添加隐私选择加入调用。

找到文件后，根据其扩展名检测语言：`.kt` = Kotlin，`.java` = Java。

> 不要假定文件名为 `MainActivity`。

## 阶段 5：插桩

对于下面的每个步骤，在写入之前检查元素是否已存在。如果存在且正确，跳过它。如果存在但不正确或不完整，只更新受影响的值。如果不存在，完整添加它。

在编辑任何文件之前，记录其原始内容。如果任何步骤因任何原因失败（构建错误、文件缺失、无法解决的冲突、意外的文件结构等）：

1. **立即停止** —— 不要尝试进一步更改。
1. **报告失败** —— 清楚说明哪一步失败以及为什么。
1. **回滚所有编辑** —— 将本阶段修改的每个文件恢复到原始内容。如果文件是全新创建的，删除它。
1. **确认回滚** —— 告诉用户哪些文件已恢复，并且项目已回到原始状态。

不要让项目处于部分插桩的状态。

### 根构建文件

首先检查根构建文件是 `build.gradle.kts`（Kotlin DSL）还是 `build.gradle`（Groovy DSL），并应用匹配的语法。

> `com.dynatrace.instrumentation` **必须**在根构建文件中应用，而不是应用模块中。

### Kotlin DSL（`build.gradle.kts`）

**Classpath 依赖** —— 检查 `com.dynatrace.tools.android:gradle-plugin` 是否已出现在 `buildscript { dependencies { } }` 块中。如果是且版本规范为 `8.+`，跳过。如果是但版本不同，将版本更新为 `8.+`。如果不存在，若已有 `buildscript { dependencies { } }` 块则将 classpath 添加到其中；否则在 `plugins {}` 块**之前**添加完整的 `buildscript` 块：

```text
buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath("com.dynatrace.tools.android:gradle-plugin:8.+")
    }
}
```

**插件应用** —— 检查 `apply(plugin = "com.dynatrace.instrumentation")` 是否已存在。如果是，跳过。如果不存在，在 `plugins {}` 块之后添加它。

**DynatraceExtension 块** —— 检查是否已存在 `configure<com.dynatrace.tools.android.dsl.DynatraceExtension>` 块。

- 如果存在，检查每个字段并只更新与目标值不同的字段：`applicationId`、`beaconUrl`、`userOptIn(true)`、`agentBehavior.startupLoadBalancing(true)`、`agentBehavior.startupWithGrailEnabled(true)`，以及 `sessionReplay.enabled(true)`（如果请求了会话回放）。添加任何缺失的字段。
- 如果不存在，在插件应用行之后添加完整块。两种情况下，将 `applicationId` 和 `beaconUrl` 替换为阶段 3 确认的值 —— 不要保留下面的占位符：

```text
configure<com.dynatrace.tools.android.dsl.DynatraceExtension> {
    configurations {
        create("sampleConfig") {
            autoStart {
                applicationId("YOUR_APPLICATION_ID")
                beaconUrl("https://your-tenant.live.dynatrace.com/mbeacon")
            }
            userOptIn(true)
            agentBehavior.startupLoadBalancing(true)
            agentBehavior.startupWithGrailEnabled(true)
            // only if session replay was requested:
            sessionReplay.enabled(true)
        }
    }
}
```

### Groovy DSL（`build.gradle`）

**Classpath 依赖** —— 检查 `com.dynatrace.tools.android:gradle-plugin` 是否已出现在 `buildscript { dependencies { } }` 块中。如果是且版本规范为 `8.+`，跳过。如果是但版本不同，将版本更新为 `8.+`。如果不存在，将 classpath 添加到现有 `buildscript { dependencies { } }` 块中，或如果不存在则在任何 `apply` 行之前创建完整的 `buildscript` 块：

```text
buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath 'com.dynatrace.tools.android:gradle-plugin:8.+'
    }
}
```

**插件应用** —— 检查 `apply plugin: 'com.dynatrace.instrumentation'` 是否已存在。如果是，跳过。如果不存在，在现有 `apply` 行之后或文件末尾添加它。

**dynatrace 块** —— 检查是否已存在 `dynatrace { }` 块。

- 如果存在，检查每个字段并只更新与目标值不同的字段：`applicationId`、`beaconUrl`、`userOptIn true`、`agentBehavior.startupLoadBalancing true`、`agentBehavior.startupWithGrailEnabled true`，以及 `sessionReplay.enabled true`（如果请求了会话回放）。添加任何缺失的字段。
- 如果不存在，在插件应用行之后添加完整块。两种情况下，将 `applicationId` 和 `beaconUrl` 替换为阶段 3 确认的值 —— 不要保留下面的占位符：

```text
dynatrace {
    configurations {
        sampleConfig {
            autoStart {
                applicationId 'YOUR_APPLICATION_ID'
                beaconUrl 'https://your-tenant.live.dynatrace.com/mbeacon'
            }
            userOptIn true
            agentBehavior.startupLoadBalancing true
            agentBehavior.startupWithGrailEnabled true
            // only if session replay was requested:
            sessionReplay.enabled true
        }
    }
}
```

### 入口点文件（Application 类或启动 Activity）

只添加尚未存在的 import。对于隐私选择加入调用，检查 `onCreate` 内是否已存在 `Dynatrace.applyUserPrivacyOptions(...)`。如果存在，验证每个选项（`DataCollectionLevel.USER_BEHAVIOR`、`withCrashReportingOptedIn(true)`、如果启用会话回放则 `withScreenRecordOptedIn(true)`）并更新任何不同的选项。如果不存在，按入口点类型对应位置插入：

- **Application 子类** —— 在 `super.onCreate()` 之后
- **启动 Activity** —— 在 `setContentView(...)` 之后

### Kotlin

**Imports** —— 只添加尚未存在的 import：

```text
import com.dynatrace.android.agent.Dynatrace
import com.dynatrace.android.agent.conf.DataCollectionLevel
import com.dynatrace.android.agent.conf.UserPrivacyOptions
```

**隐私选择加入调用** —— 在 `super.onCreate()`（Application 子类）之后或 `setContentView(...)`（启动 Activity）之后插入。仅在阶段 3 启用了会话回放时才包含 `.withScreenRecordOptedIn(true)`：

```text
Dynatrace.applyUserPrivacyOptions(
    UserPrivacyOptions.builder()
        .withDataCollectionLevel(DataCollectionLevel.USER_BEHAVIOR)
        .withCrashReportingOptedIn(true)
        // .withScreenRecordOptedIn(true) — add only if session replay is enabled
        .build()
)
```

### Java

**Imports** —— 只添加尚未存在的 import：

```text
import com.dynatrace.android.agent.Dynatrace;
import com.dynatrace.android.agent.conf.DataCollectionLevel;
import com.dynatrace.android.agent.conf.UserPrivacyOptions;
```

**隐私选择加入调用** —— 在 `super.onCreate()`（Application 子类）之后或 `setContentView(...)`（启动 Activity）之后插入。仅在阶段 3 启用了会话回放时才包含 `.withScreenRecordOptedIn(true)`：

```text
Dynatrace.applyUserPrivacyOptions(UserPrivacyOptions.builder()
    .withDataCollectionLevel(DataCollectionLevel.USER_BEHAVIOR)
    .withCrashReportingOptedIn(true)
    // .withScreenRecordOptedIn(true) — add only if session replay is enabled
    .build()
);
```

## 阶段 6：构建并验证

首先，发现可用的 assemble 任务，以处理具有自定义构建类型或产品风味的项目：

macOS / Linux：

```bash
./gradlew tasks --group=build | grep -i "^assemble"
```

Windows（cmd）：

```text
gradlew.bat tasks --group=build | findstr /i "assemble"
```

Windows（PowerShell）：

```text
.\gradlew.bat tasks --group=build | Select-String -Pattern "^assemble" -CaseSensitive:$false
```

如果只列出一个 assemble 任务，使用它。如果列出多个任务，将它们呈现给用户并询问要运行哪一个。

然后运行它：

- macOS / Linux：`./gradlew CHOSEN_TASK`
- Windows（cmd）：`gradlew.bat CHOSEN_TASK`
- Windows（PowerShell）：`.\gradlew.bat CHOSEN_TASK`

构建成功即确认 Dynatrace 插件已正确接通。
