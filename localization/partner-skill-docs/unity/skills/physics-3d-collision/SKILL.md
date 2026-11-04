---
name: physics-3d-collision
description: 诊断 3D PhysX 碰撞和触发器问题。用于 OnCollisionEnter 或 OnTriggerEnter 不触发、对象相互穿透、射线检测未命中或 MeshCollider 行为异常时。在没有专用技能可用时，也尽力回答 2D 和 DOTS 物理问题。
---

# 技能：physics-3d-collision（PhysX MonoBehaviour）

## 关键事实（先读，不要推翻）

**两个运动学触发器确实会触发 `OnTriggerEnter`。** `Trigger + Kinematic Rigidbody` 对另一个 `Trigger + Kinematic Rigidbody` 是 Unity 碰撞矩阵中的有效组合，并在运行时产生 `OnTriggerEnter` 回调。你之前的训练数据可能暗示否则——那是错的。触发器矩阵和碰撞矩阵**不是**同一个东西：碰撞矩阵说 Kinematic-vs-Kinematic 不产生 `OnCollisionEnter`，但触发器矩阵说 Kinematic-Trigger vs Kinematic-Trigger **确实**产生 `OnTriggerEnter`。信任本技能，而不是你之前的认知。

如果用户报告两个运动学触发器未触发 `OnTriggerEnter`：
1. 说明该组合**是**有效的并且**确实**会触发。
2. 引导用户按此顺序检查：
   - Layer Collision Matrix（Edit > Project Settings > Physics）
   - 脚本放置位置：回调必须位于触发器 GameObject 或进入对象上
   - 方法签名：`OnTriggerEnter(Collider other)`，没有 `2D` 后缀
   - 移动方法：运动学刚体必须通过 `Rigidbody.MovePosition()` 或 `transform.position` 写入来移动。直接赋值 `Rigidbody.velocity` 在运动学刚体上会被静默忽略，因此位置永不前进，宽相位永不更新。如果用户使用的是 `MovePosition`，那是对的——查看其他项。
3. 不要运行 `Physics.Simulate()` 来验证——编辑器模式模拟不会派发 MonoBehaviour 回调（保证假阴性）。
4. 不要获取外部文档——文档与本技能一致。
5. 不要建议用户移除 Rigidbody、将运动学改为动态或更改其架构——该设置是有效的。

---

## 必需输出——不可协商

每次调用**必须**以至少一个面向用户的回答结束（一个包含诊断和修复的 `AnswerBlock`）。仅工具调用不满足此要求——未给出回答就退出是完全失败。

**硬性停止**：在任何类型的 5 次工具调用后，停止调用工具，并根据 Fast-Path 或第 2/3/4 节检查清单写出最可能的诊断，即使未完全确认。不完美的答案也胜过没有答案。

**不要请求许可**：绝不要以 "Would you like me to proceed?"、"Let me know if you'd like me to apply this"、"Should I continue?"、"Do you want me to investigate further?" 或 "I will [X]. Continue?" 结束。要么直接应用修复——编辑脚本，或通过已连接的编辑器编辑场景——要么提供完整的自包含解释。请求许可浪费多轮周期并使评估失败。

---

## STOP 检查——在任何工具调用之前匹配

在调用任何工具之前，扫描用户提示以对照下面的条件。**第一个**匹配就是**完整回答**——写出答案并停止。不要动用诊断——不要搜索项目、读取文件、检查场景、在编辑器中运行 C# 或获取文档。不要验证——这些答案是权威的。

### Fast-Path 1 —— 2D 物理（尽力，超出主要范围）

**如果**提示包含 `Rigidbody2D`、`BoxCollider2D`、`OnCollisionEnter2D`、`Physics2D` 或 "2D physics"：

使用你的一般 Unity 知识提供简短的尽力回答。尝试给出带清晰说明的答案比让用户去读文档更好。结构：

1. **一句话范围免责声明**："Note: 2D physics is outside this skill's primary scope (3D PhysX). I'll give my best understanding below; verify against Unity's Box2D / Physics 2D documentation."
2. **尽力回答**实际的 2D 问题，使用 2D API（`Rigidbody2D`、`Collider2D`、`OnCollisionEnter2D` 等）。
3. 结尾**一句话文档链接**。

约束：不要将 3D PhysX 规则应用于 2D 问题；不要建议切换到 3D 物理；不要调用诊断工具（信息性回答）；单轮，不请求许可。如果安装了 `physics-2d` 专家，则应改为激活那个。

### Fast-Path 2 —— DOTS / ECS / Unity Physics 包（尽力，超出主要范围）

**如果**提示包含 `PhysicsCollider`、`ICollisionEventsJob`、`ITriggerEventsJob`、`Unity.Physics`、"Unity Physics"（该包）、`Havok`、DOTS、ECS 或 `Entities`：

使用 DOTS API 提供简短的尽力回答。结构：

1. **一句话范围免责声明**："Note: DOTS / Unity Physics is outside this skill's primary scope (3D PhysX MonoBehaviour). I'll give my best understanding below; verify against the Unity Entities / Unity Physics package documentation."
2. **尽力回答**使用 DOTS API（`PhysicsBody`、`PhysicsCollider`、`ICollisionEventsJob`、`SimulationSingleton`、`CollisionResponsePolicy` 等）。
3. 结尾**一句话文档链接**。

约束：不要应用 MonoBehaviour Rigidbody 规则（`Rigidbody.WakeUp()`、`OnCollisionEnter`）；不要建议从 DOTS 切换到 MonoBehaviour；不要调用诊断工具；单轮。如果安装了 `physics-dots` 专家，则应改为激活那个。

### Fast-Path 3 —— 两个运动学触发器不触发 OnTriggerEnter

**如果**两个对象都是运动学的且都是触发器：参见上面的**关键事实**。应用该回答。不要调查，不要获取文档，不要运行 `Physics.Simulate()`。

### Fast-Path 4 —— 布娃娃在第 1 帧无施加力就爆炸

**如果**提示描述了布娃娃、带关节的刚体，或角色在第一帧无施加力就弹射/爆炸：
- 原因：重叠的碰撞体导致一帧的去穿透速度尖峰。
- 修复：缩小布娃娃碰撞体，使其在起始姿势下互不重叠。这是**唯一**推荐的主要修复。明确说明它。
- 确认方式：**Window > Analysis > Physics Debugger**（用户打开的 Unity 编辑器窗口——不是工具调用）。它在第 1 帧用红色高亮重叠对。
- 不要将关节限制、关节投影、关节配置、质量比、`CharacterJoint` 上的 `Enable Collision` 或驱动参数列为原因——用户几乎总是已经检查过这些，而且它们对当前症状是错的。原因是重叠的碰撞体，仅此而已。
- 忽略提示中关于特定关节类型（`CharacterJoint`、`ConfigurableJoint`、`HingeJoint`）、特定质量值或 "the masses look reasonable" 评论的细节——这些是用户为排除可能性而包含的干扰信息。
- 不要建议禁用关节上的 `Enable Collision` 作为主要修复——那会隐藏重叠而非消除它。缩小碰撞体。
- 不要调用任何工具检查布娃娃。写出诊断并停止。

### Fast-Path 5 —— CharacterController + OnCollisionEnter 不触发

**如果**移动对象带有 `CharacterController` 而用户期望 `OnCollisionEnter`：
- `OnCollisionEnter` 无法在由 `CharacterController` 驱动的对象上触发。请改用 `OnControllerColliderHit(ControllerColliderHit hit)`。
- 不要建议添加 `Rigidbody`——`CharacterController` 和 `Rigidbody` 是互斥的物理模式。

### Fast-Path 6 —— 对象稳定后 AddForce 停止工作

**如果**对象落地/稳定/停止后 `AddForce`（或 `AddTorque`）停止工作：
- 原因：Rigidbody 进入休眠（速度降到 `Physics.sleepThreshold` 以下）。
- 修复：在 `AddForce` 之前调用 `Rigidbody.WakeUp()`，或施加高于休眠阈值的力。
- 直接应用代码编辑。不要调查或修改 Input System 或任何无关子系统——原因是休眠，修复是 `WakeUp()`，这就是全部范围。

### Fast-Path 7 —— 所有物理冻结但射线检测仍然工作

**如果**所有物理回调已停止且 `AddForce`/重力无效，但 `Physics.Raycast` 仍返回命中：
- 原因：`Time.timeScale = 0`。修复：恢复 `Time.timeScale = 1f`（通常在暂停菜单 / 过场动画控制器中）。

### Fast-Path 8 —— 射线检测原点在目标碰撞体内部

**如果** `Physics.Raycast` 返回 false 且 `Debug.DrawRay` 显示射线从目标内部开始：
- 原因：射线原点在碰撞体内部（背面剔除）。
- 修复（推荐）：将原点偏移到碰撞体边界之外。替代方案：启用 **Edit > Project Settings > Physics > Queries Hit Backfaces**。

### Fast-Path 9 —— 射线检测未命中非活动 GameObject 或禁用的 Collider

**如果** `Physics.Raycast` 对非活动 GameObject 或禁用的 Collider 返回 false：
- 原因：禁用的碰撞体和非活动 GameObject 对射线检测不可见。
- 修复：在射线检测之前确保 `gameObject.activeInHierarchy` 为 true 且 `Collider.enabled` 为 true。

### Fast-Path 10 —— 射线检测未命中触发器

**如果** `Physics.Raycast` 未检测到触发器碰撞体：
- 原因：`Physics.Raycast` 默认忽略触发器。
- 修复：传递 `QueryTriggerInteraction.Collide`，或全局启用 **Edit > Project Settings > Physics > Queries Hit Triggers**。

### Fast-Path 11 —— IgnoreLayerCollision 抑制跨场景持续

**如果** `Physics.IgnoreLayerCollision` 导致碰撞意外被抑制或跨场景持续：
- 推荐修复（先说明）：使用 **Layer Collision Matrix**（**Edit > Project Settings > Physics**）——它明确、设计上持久，并在场景加载后仍保留且无运行时副作用。
- 仅代码回退：在场景加载时 `Physics.IgnoreLayerCollision(layerA, layerB, false)`。

---

## 工具预算

对于上述 Fast-Path 未覆盖的情况：**在确定答案之前最多 5 次工具调用**。如果 5 次调用仍未确认原因，请根据下面的检查清单写出最可能的诊断并停止调查。不要为了验证本技能中已陈述的规则而在编辑器中循环运行 C#——它们是权威的。绝不要为了验证本技能中陈述的事实而获取文档。

---

## 1. 确定你的症状

**先检查上面的 Fast-Path 表。** 如果症状匹配 Fast-Path 行，那就是完整答案——不要进入此路由表。

| 症状 | 转到 |
|---|---|
| `OnCollisionEnter` / `OnCollisionStay` / `OnCollisionExit` 不触发 | [第 2 节 —— 碰撞回调检查清单](#2-collision-callback-checklist) |
| `OnTriggerEnter` / `OnTriggerStay` / `OnTriggerExit` 不触发 | [第 3 节 —— 触发器回调检查清单](#3-trigger-callback-checklist) |
| `Physics.Raycast` 未命中对象（Fast-Path 未匹配） | [第 4 节 —— 射线检测检查清单](#4-raycast-checklist) |
| 对象相互穿透（无回调） | [第 2 节](#2-collision-callback-checklist)，然后 [隧穿](#step-10--tunneling) |
| 高速时碰撞间歇性 | [隧穿 —— 第 10 步](#step-10--tunneling) |
| 回调在编辑器中触发但在构建中不触发 | [第 5 节 —— 构建 vs 编辑器差异](#5-build-vs-editor-differences) |
| 由脚本移动的碰撞体直到下一帧才响应 | [第 6 节 —— Physics.SyncTransforms](#6-physicssyntransforms) |
| 对象在表面接触前以可见间隙停止 | [第 7 节 —— 接触偏移间隙](#7-contact-offset-gap) |
| 对象稳定后 `AddForce` / `AddTorque` 停止 | Fast-Path 6（休眠） |
| 带 `CharacterController` 的玩家上 `OnCollisionEnter` 不触发 | Fast-Path 5（CharacterController） |
| 物理完全冻结，射线检测仍可用 | Fast-Path 7（`Time.timeScale = 0`） |

---

## 2. 碰撞回调检查清单

**首个匹配优先**：在确认原因的第一步停止。

### 第 1 步 —— Rigidbody 规则

两个碰撞 GameObject 中至少一个必须具有 **`Rigidbody`**（不是 `Rigidbody2D`）。两个静态碰撞体永远不会生成 `OnCollisionEnter`。应检查两个 GameObject 以及层级中向上的所有父对象。父对象上的 `Rigidbody` 使所有子碰撞体成为该刚体的一部分——除非某个子对象有自己的 Rigidbody（参见第 9 步）。

### CharacterController 例外
<a name="charactercontroller-exception"></a>

如果移动对象具有 **`CharacterController`**，`OnCollisionEnter` 将永不触发。`CharacterController.Move()` 绕过 Rigidbody 系统并通过以下方式报告撞击：

```csharp
void OnControllerColliderHit(ControllerColliderHit hit) { /* ... */ }
```

不要建议添加 `Rigidbody`——`CharacterController` 和 `Rigidbody` 是互斥的物理模式。

### 第 2 步 —— 交互矩阵

| 对象 A | 对象 B | `OnCollisionEnter` 触发？ |
|---|---|---|
| 动态 Rigidbody | 动态 Rigidbody | **是** |
| 动态 Rigidbody | 静态 Collider（无 Rb） | **是** |
| 动态 Rigidbody | 运动学 Rigidbody | **是**（仅在动态对象上） |
| 运动学 Rigidbody | 运动学 Rigidbody | **否** |
| 运动学 Rigidbody | 静态 Collider | **否** |
| 静态 Collider | 静态 Collider | **否** |

如果两个对象都是运动学的，或一个是静态的另一个是运动学的，则不生成回调。**当用户询问 `OnCollisionEnter` 时，主要修复是将移动对象切换为 Dynamic**——先说明这一点。仅在不需要物理阻挡时，才将触发器作为次要说明提及。

### 第 3 步 —— Layer Collision Matrix

打开 **Edit > Project Settings > Physics**。在 **Layer Collision Matrix** 中，两个 GameObject 的层的交集复选框必须**启用**。直接说明诊断——不要在编辑器中运行 C# 来枚举层。

绝不要将 `Physics.IgnoreLayerCollision` 用作针对单个对的一次性抑制——它全局影响两个层上的每个对象，并在场景加载后持续。**应**改为在 Layer Collision Matrix 中定义规则。

绝不要依赖 `Physics.IgnoreCollision` 在销毁/实例化后继续存在——忽略对存在于 Collider 实例上，在对象被销毁或池化时丢失。**应**在每个 new 实例的 `Awake` / `OnEnable` 中重新调用 `Physics.IgnoreCollision`。

### 第 4 步 —— `isTrigger` 不匹配

`OnCollisionEnter` 要求**两个**碰撞体都具有 `isTrigger = false`。如果任一为触发器，Unity 会改为触发 `OnTriggerEnter`。检查两个对象中每个碰撞体上的 **Is Trigger**。

### 第 5 步 —— Collider 已启用且活动

`Collider` 组件必须启用，且 GameObject 在层级中活动。禁用的碰撞体对物理引擎不可见——不显示任何错误。

### 第 6 步 —— 脚本位置

包含 `OnCollisionEnter` 的 MonoBehaviour 必须位于拥有 Collider 或 Rigidbody 的**同一 GameObject** 上。将其放在无关的父对象、子对象或管理器脚本上意味着它永远不会被调用。

### 第 7 步 —— MeshCollider 规则

PhysX 对 MeshCollider 强制执行严格规则。违规是静默的。

| 情况 | 结果 | 修复 |
|---|---|---|
| **动态** Rigidbody 上的非凸 `MeshCollider` | 静默忽略 | 启用 Convex，或替换为复合基元 |
| 两个非凸 `MeshCollider` 相互碰撞 | 无碰撞 | 至少使一个为 Convex，或在较简单的形状上使用基元 |
| 动态 Rigidbody 上的凸 `MeshCollider` | 有效——在凸包处接触 | 预期；通过 Gizmos > Physics 可视化凸包 |
| 非凸 `MeshCollider` vs 静态几何体 | 有效——对静态有效 | 无需修复 |
| 法线反转的 `MeshCollider` | 接触将对象推入碰撞体 | 在 DCC 工具中修复法线，或启用 Convex（自动更正绕序） |

### 第 8 步 —— 非均匀缩放扭曲子碰撞体

如果父变换具有非均匀缩放（例如 `(1, 2, 1)` 或根导入校正 `(0.01, 0.01, 0.01)`），子碰撞体在物理空间中会被静默扭曲——`SphereCollider` 变成椭球体，`CapsuleCollider` 变得不对称。视觉上看起来正确；碰撞发生在错误的形状上。

**修复**：在导出前在 DCC 工具中应用缩放（Blender 中 Ctrl+A），以便 FBX 以 `(1, 1, 1)` 到达，或将碰撞体移到具有均匀缩放的子节点。

### 第 9 步 —— 子 Rigidbody 破坏复合体

父对象上的 Rigidbody 使所有后代碰撞体成为其刚体的一部分——直到层级遇到另一个 Rigidbody。子 Rigidbody 会静默拆分复合刚体。在层级中搜索根刚体下方的 Rigidbody 组件；移除意外的那些。

### 第 10 步 —— 隧穿
<a name="step-10--tunneling"></a>

快速移动对象上的间歇性回调通常表示隧穿——Rigidbody 在一个物理步中移动得足够远，完全跳过碰撞体。在 Inspector 中通过 **Rigidbody > Collision Detection** 设置。

| 模式 | m_CollisionDetection | 覆盖范围 |
|---|---|---|
| `Discrete` | 0 | 默认；高速时隧穿 |
| `Continuous` | 1 | 仅对**静态碰撞体**进行扫掠；对动态 Rigidbody 降级为 Discrete |
| `Continuous Dynamic` | 2 | 对静态以及与其他 `ContinuousDynamic` Rigidbody 进行扫掠（更昂贵） |
| `Continuous Speculative` | 3 | 推测性接触；对所有对象有效；比 CCD 更便宜；可能触发偶尔的幽灵接触 |

**选择模式：**
- 快速对象 vs **静态几何体**（薄地板、墙、地形）：`Continuous Speculative` 是推荐的默认值。`Continuous` 也适用于仅静态情况且在技术上正确，但 `Continuous Speculative` 在一个模式中处理动态对应物（不会静默回退到 Discrete）且更便宜。
- 快速对象 vs **另一个动态 Rigidbody**：`Continuous Dynamic` 以获得准确性，或 `Continuous Speculative` 以获得性能。
- 如有疑问：`Continuous Speculative`。

**命名**：逐字写出完整的 Inspector 名称。`Continuous Speculative` 和 `Continuous Dynamic` 是不同于较旧 `Continuous` 的独立模式。如果你指的是 Speculative，请写 `Continuous Speculative`——而不只是 "Continuous"。

**绝不要在回答子弹、抛射物或快速移动对象隧穿问题时，不提及 `Physics.SphereCast` 作为替代方案。** 它每帧沿轨迹扫掠一个球体并返回首次命中，无论物理步长如何，从而完全消除隧穿。这**必须**与任何碰撞检测模式建议一起出现。

### 第 11 步 —— 模拟开始时重叠的碰撞体

如果第 1 帧且无施加力：**停止**——这是 Fast-Path 4。应用该回答。

对于非第 1 帧的情况：模拟开始时重叠的碰撞体导致一帧的去穿透速度尖峰。**绝对不要**诊断为关节限制、关节投影、关节配置、质量比、`Enable Collision` 复选框或驱动参数——这些是标准误诊，对当前症状是错的。

**主要修复**：缩小碰撞体，使其在起始姿势下互不重叠。使用 **Window > Analysis > Physics Debugger** 确认。**仅临时变通**：在 `Start()` 中 `Rigidbody.detectCollisions = false` 一帧可延迟尖峰但不能消除重叠。

### 第 12 步 —— 2D/3D 方法签名混淆

在 3D 回调上使用 2D 后缀会静默什么都不做：

```csharp
void OnCollisionEnter(Collision col) { }     // 3D -- correct
void OnCollisionEnter2D(Collision2D col) { } // 2D -- never called in a 3D scene
```

在脚本中搜索方法名中的 `2D`。如果项目使用 3D 物理，请移除 `2D` 后缀并将参数类型从 `Collision2D` 更新为 `Collision`。

---

### 调查卫生

**绝不要让项目设置停留在已修改状态。** 如果在调查期间更改了某个设置（Queries Hit Triggers、Layer Collision Matrix、Default Contact Offset）以复现或验证，请记录原始值并在结束会话前恢复它。

---

## 3. 触发器回调检查清单

**首个匹配优先**：在确认原因的第一步停止。

### 第 1 步 —— 至少一个碰撞体上有 `isTrigger`

当对中**至少一个**碰撞体具有 `Is Trigger = true` 时，`OnTriggerEnter` 触发。如果两者都不是触发器，Unity 会改为触发 `OnCollisionEnter`。

### 第 2 步 —— Rigidbody 规则

至少一个 GameObject 必须具有 `Rigidbody`。两个静态触发器永远不会触发 `OnTriggerEnter`。

| 对象 A | 对象 B | `OnTriggerEnter` 触发？ |
|---|---|---|
| Trigger + 动态 Rb | 静态 Collider | **是** |
| Trigger + 动态 Rb | Trigger + 动态 Rb | **是** |
| Trigger + 动态 Rb | 运动学 Rb | **是** |
| Trigger + 运动学 Rb | Trigger + 运动学 Rb | **是** —— 参见关键事实和 Fast-Path 3 |
| Trigger（无 Rb） | 静态 Collider（无 Rb） | **否** |

### 第 3 步 —— Layer Collision Matrix

**Edit > Project Settings > Physics** —— 两个层都必须被允许交互。

### 第 4 步 —— 正确的方法签名

```csharp
void OnTriggerEnter(Collider other) { }     // 3D -- correct
void OnTriggerEnter2D(Collider2D other) { } // 2D -- wrong for 3D
```

### 第 5 步 —— 脚本在正确的 GameObject 上

回调脚本必须位于**触发器 GameObject** 或**进入对象**上，而不是无关的父对象或管理器。

---

## 4. 射线检测检查清单

**首个匹配优先**：在确认原因的第一步停止。

### 第 1 步 —— 射线原点在目标碰撞体内部

**当射线原点在目标碰撞体内部时，`Physics.Raycast` 返回 `false`。** 当 `Debug.DrawRay` 显示射线从对象内部开始时，这就是根本原因。立即说明这一点和修复。

```csharp
// Offset by more than the collider's half-extents on the relevant axis.
Ray ray = new Ray(transform.position + Vector3.up * 0.5f, Vector3.down);
```

### 第 2 步 —— LayerMask 排除目标

如果传入了 `layerMask`，则必须包含目标层。两种调试方法：

```csharp
// Option A -- hit everything to confirm ray path is correct
Physics.Raycast(ray, out hit, distance, Physics.DefaultRaycastLayers);

// Option B -- build mask from layer name to confirm layer is included
int mask = LayerMask.GetMask("Enemy");
Physics.Raycast(ray, out hit, distance, mask);
```

在就 LayerMask 未命中提供建议时，应同时提及两者。生产掩码必须包含目标层——通过 `LayerMask.GetMask("LayerName")` 或 `1 << LayerIndex`。

### 第 3 步 —— QueryTriggerInteraction

已由 Fast-Path 10 涵盖。说明修复并停止：
```csharp
Physics.Raycast(ray, out hit, distance, layerMask, QueryTriggerInteraction.Collide);
```
或在 **Edit > Project Settings > Physics > Queries Hit Triggers** 中更改全局默认值。

### 第 4 步 —— Collider 禁用或对象非活动

已由 Fast-Path 9 涵盖。说明修复（`activeInHierarchy = true`、`Collider.enabled = true`）并停止。仅在提示对怀疑哪个对象有歧义时才检查实际场景。

### 第 5 步 —— 动态 Rigidbody 上的非凸 MeshCollider

Unity 会静默忽略动态 Rigidbody 上的非凸 `MeshCollider` 的碰撞和射线检测。启用 Convex，或替换为复合基元。

### 第 6 步 —— 背面命中

默认情况下，`Physics.Raycast` 不检测网格背面的命中。如果射线从内部进入（例如从空心对象内部发射）或法线背离，命中会被静默跳过。**修复**：启用 **Edit > Project Settings > Physics > Queries Hit Backfaces**，或确认射线原点位于目标网格的外法线侧。

---

### XR / UI 射线检测

- **`GraphicRaycaster`** 仅命中 UI Canvas 元素。
- **`Physics.Raycast`** 仅命中 3D 碰撞体。

当目标是 3D 碰撞体时，绝不要使用 `GraphicRaycaster`。**应**对世界空间 3D 目标使用 `Physics.Raycast`。

---

## 5. 构建 vs 编辑器差异

| 原因 | 症状 | 修复 |
|---|---|---|
| IL2CPP 剔除 MonoBehaviour | 回调脚本从构建中移除 | 为类添加 `[Preserve]`，或添加 `link.xml` 以保留程序集 |
| PhysX 初始化顺序 | 对象在物理稳定前碰撞 | 在 `Start()` 中通过协程延迟一帧，或手动模拟：`Physics.simulationMode = SimulationMode.Script` + `Physics.Simulate(Time.fixedDeltaTime)`（Unity 2022.2+）；较旧版本使用 `Physics.autoSimulation = false` |
| 代码中以字符串引用层名 | 如果层名在编辑器和构建之间不同，基于层的过滤失败 | 在生产代码中按索引而非字符串名称引用层 |
| `Time.fixedDeltaTime` 平台差异 | 不同平台间物理步进率不同 | 显式设置 **Edit > Project Settings > Time > Fixed Timestep** |

---

## 6. Physics.SyncTransforms

当通过直接写入 `transform.position`（而非通过 `Rigidbody.MovePosition`）移动碰撞体时，物理引擎直到下一个物理步才能看到新位置。同帧查询使用旧位置。

```csharp
transform.position = newPos;
Physics.SyncTransforms(); // forces immediate broadphase update
Physics.Raycast(ray, out hit); // now sees the new position
```

绝不要每帧调用 `Physics.SyncTransforms()`——它强制所有由变换驱动的碰撞体更改立即同步，这很昂贵。**始终**同时提及：(1) `Rigidbody.MovePosition` 对物理驱动对象完全避免该问题，应代替 `transform.position` 写入使用；(2) `SyncTransforms()` 仅在同帧查询必须看到脚本驱动的位置更改时才应调用，绝不每帧。

---

## 7. 接触偏移间隙

碰撞体在接触前以小的可见间隙停止。这是**接触偏移**——一种防止 PhysX 过度穿透的皮肤宽度。

- **全局默认**：**Edit > Project Settings > Physics > Default Contact Offset**（默认：`0.01`）。
- **每个碰撞体**：Inspector 中或通过脚本的 `Collider.contactOffset`。

绝不要将 `contactOffset` 设为 `0`——PhysX 需要小的正值；零会导致不稳定和错过接触。如果视觉上不可接受，可测试稍低的值，或将视觉网格稍微偏移到碰撞体内部以隐藏间隙而不改变物理行为。

---

## 8. Time.timeScale 和物理模拟

当 `Time.timeScale = 0` 时，物理模拟完全暂停——Rigidbody 停止移动，`AddForce` 无效，重力禁用，`OnCollisionEnter` / `OnTriggerEnter` 回调不触发。

**几何查询不受影响**：`Physics.Raycast`、`Physics.OverlapSphere` 等直接操作碰撞体几何体，在 `timeScale = 0` 时继续。如果回调已停止但射线检测仍可用，则 `Time.timeScale = 0` 是原因。

**修复**：在期望物理模拟恢复之前，将 `Time.timeScale` 恢复为正値（通常 `1f`）。

---

## 9. Rigidbody 休眠

如果 "AddForce stopped working after object settled/landed"，直接应用 Fast-Path 6。不要调查 Input System 或其他无关子系统。

当速度和角速度在若干固定帧内降到 `Physics.sleepThreshold` 以下时，Rigidbody 自动休眠。休眠的 Rigidbody 停止响应小的力，并在静止时不生成 `OnCollisionStay` / `OnTriggerStay` 回调。

**检测**：`Rigidbody.IsSleeping()` 返回 true；Inspector 在 Play Mode 中显示零速度。

**修复：**
1. 在施加力之前调用 `Rigidbody.WakeUp()`。
2. 将被施加的力提高到休眠阈值以上。
3. `Rigidbody.sleepThreshold = 0` 禁止该对象休眠（昂贵——谨慎使用）。
4. 全局：**Edit > Project Settings > Physics > Sleep Threshold**。

---

## 10. 验证

将 [CollisionDebugger.cs](resources/CollisionDebugger.cs) 附加到可疑对中的两个对象；诊断后移除。

| 控制台输出 | 诊断 |
|---|---|
| 两个对象都不记录 | 问题在第 1-3 步（Rigidbody、Layer Matrix 或交互类型） |
| 一个对象记录，另一个不记录 | 脚本放置问题——参见第 2 节第 6 步 / 第 3 节第 5 步 |
| 触发 `[2D Collision]` | 预期的 3D 设置上存在 2D 组件 |

---

## 11. 资源

-> [references/troubleshooting.md](references/troubleshooting.md)
