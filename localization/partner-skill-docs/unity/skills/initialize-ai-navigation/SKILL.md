---
name: initialize-ai-navigation
description: 设置并配置 Unity AI Navigation，包括 NavMesh 表面、智能体、障碍物和链接。用于用户询问导航网格、寻路、巡逻路线或障碍物规避时。
---

确定用户需要什么，并引导他们完成导航设置。有关扩展的组件细节、API 说明、代码配方和故障排除，请参阅 [navigation-system.md](references/navigation-system.md)。

### 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**。由此产生两个后果，两者都会导致编译错误而非警告：

- **没有 `using` 指令。** 编译器会将 `using UnityEngine;` 读取为资源释放语句并拒绝它（`CS0210`）。
- **类型必须完全限定。** 裸的 `AssetDatabase` 或 `Volume` 无法解析（`CS0246` / `CS0103`），而裸的 `Object` 会与 `object` 产生歧义（`CS0104`）。

如果下面的代码段是以文件形式编写的——为了可读性带有 using，或因需要保存到项目中——在将其传给 `script eval` 之前请先限定类型。

## 路由逻辑

| 用户说 | 解读 |
|-----------|---------------|
| "add navigation" / "set up nav" | 完整设置：NavMeshSurface + 烘焙 + NavMeshAgent |
| "make this character navigate" | 添加 NavMeshAgent，确保 NavMesh 存在 |
| "add pathfinding" | NavMeshAgent + 移动脚本 |
| "agent won't move" / "path not found" | 故障排除——见参考中的故障排除决策树 |
| "avoid obstacles" | 带雕刻或规避的 NavMeshObstacle |
| "connect two areas" / "jump across" | 区域之间的 NavMeshLink |
| "patrol between points" | NavMeshAgent + 巡逻脚本 |
| "click to move" | NavMeshAgent + 射线检测点击移动脚本 |
| "animate the character while navigating" | 将 Animator 与 NavMeshAgent 结合 |
| "different agent sizes" | 在 Navigation 窗口中配置智能体类型 |
| "areas and costs" / "restrict areas" | NavMesh 区域类型、修改器和智能体区域掩码 |

## 工作流

### 0. 包安装检查
在做任何其他事情之前，验证 `com.unity.ai.navigation` 已安装。如果缺失，将其添加到 `Packages/manifest.json` 的 `dependencies` 下——编辑器下次获得焦点时 Unity 会解析它，这无需编辑器连接：

```json
"com.unity.ai.navigation": "<current 2.x version>"
```

不要凭空编造版本字符串。从 Unity 注册表读取当前版本——`https://packages.unity.com/com.unity.ai.navigation` 列出了所有已发布版本——或复制此 manifest 中相邻 Unity 包已使用的版本。不存在的版本会让 Unity **静默地**解析失败，因此错误的猜测看起来就像什么都没发生。

只有在确认已安装后才继续。如果你有可运行 C# 的实时编辑器，请参阅 [navigation-system.md](references/navigation-system.md) 获取 `Client.Add` 的等价写法。

### 1. 预检：评估当前导航设置
在做出更改之前，检查已存在的内容：
1. 查找现有的导航组件。在已连接的编辑器中，查询实时场景中的
   `NavMeshSurface`、`NavMeshAgent`、`NavMeshObstacle`、`NavMeshLink` 和 `NavMeshModifier`——参见
   `unity-cli` 技能以驱动运行中的编辑器。没有编辑器时，在场景和预制体
   文件中搜索这些组件名称。
2. 通过 **Window > AI > Navigation > Agents 标签页**检查已配置的智能体类型。
3. 在提出更改之前，汇总所有检测到的导航组件。

### 2. 收集缺失的信息
在创建组件之前，确保用户已指定：可行走表面、智能体类型/尺寸、智能体行为、障碍物、链接以及区域/成本需求。如有任何不清楚之处请询问。完整细节见参考中的信息收集清单。

### 3. 规划与执行
遵循此总体顺序。有关每个组件的详细分步说明，请参见参考中的组件设置指南：
1. **NavMesh Surface** —— 创建可行走网格（烘焙它）
2. **NavMesh Agent** —— 添加寻路角色
3. **NavMesh Obstacle** —— 添加动态障碍物
4. **NavMesh Link** —— 连接断开的 NavMesh 区域
5. **NavMesh Modifier / Modifier Volume** —— 微调区域类型
6. **脚本** —— 移动、巡逻、点击移动、动画结合（参见参考中的常用配方）

### 4. 验证
设置完成后，确认：
- NavMesh 已烘焙且可见（蓝色覆盖层）
- NavMeshSurface 的智能体类型与 NavMeshAgent 的智能体类型匹配
- 智能体具备通往其目的地的有效路径
- 障碍物正确雕刻或阻挡
- 链接两端均已连接且已启用 Activated
- 区域掩码允许预期的移动
- 没有冲突的组件（参见参考中的混用组件指南）
- 如果使用 Rigidbody 与 NavMeshAgent，已启用 Is Kinematic

### 5. 最终确认
总结所创建或更改的内容：
- NavMesh Surfaces：哪个 GameObject、智能体类型、几何模式、烘焙状态
- NavMesh Agent：哪个 GameObject、速度、停止距离、区域掩码
- NavMesh Obstacle：哪个 GameObject、形状、雕刻开/关
- NavMesh Link：起点/终点、双向、区域类型
- 脚本：哪些脚本附加到哪些 GameObject
- 任何所需的手动步骤（调整路径点、场景更改后重新烘焙等）
