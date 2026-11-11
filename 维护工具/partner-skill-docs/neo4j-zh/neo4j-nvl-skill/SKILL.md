---
name: neo4j-nvl-skill
description: Neo4j Visualization Library（NVL）—— 面向浏览器的、与框架无关的图渲染。涵盖 @neo4j-nvl/base（NVL 类、节点/关系、Canvas 与 WebGL 渲染器）、@neo4j-nvl/interaction-handlers（ZoomInteraction、PanInteraction、DragNodeInteraction、ClickInteraction、HoverInteraction、BoxSelectInteraction、LassoInteraction、KeyboardInteraction）以及 @neo4j-nvl/react（InteractiveNvlWrapper、BasicNvlWrapper、StaticPictureWrapper）。适用于在浏览器中渲染 Neo4j 图、通过 nvlResultTransformer 输入 driver 结果、选择 Canvas 还是 WebGL、为节点/关系的点击/悬停/拖拽接线处理器，或将 NVL 嵌入 React、Vite 或原生 JS 应用。不处理 Cypher 查询编写 —— 请使用 neo4j-cypher-skill。不处理 driver 生命周期、session 或 executeQuery 设置 —— 请使用 neo4j-driver-javascript-skill。不处理 GraphVisualization/Needle 默认嵌入 —— 请使用 @neo4j-ndl/react。
compatibility: "@neo4j-nvl packages 2.0.x; React 19 for @neo4j-nvl/react; modern browsers with Canvas2D + WebGL2"
version: 2.0.0
allowed-tools: Bash WebFetch
---

## 何时使用
- 在浏览器（原生 JS、React、Vite）中渲染 Neo4j 图，使用自定义交互、渲染或数据形态
- 将 `driver.executeQuery` 结果可视化为交互式图
- 为缩放、平移、拖拽、点击、悬停、套索或框选交互接线
- 将 NVL 嵌入现有应用并同步图状态

## 何时不使用
- **带默认行为、无自定义交互的预样式嵌入图视图** → `@neo4j-ndl/react`（Neo4j Needle / NDL 设计系统）中的 `GraphVisualization` —— 用默认 Neo4j 样式封装 NVL。参见下文 [使用 NVL 还是 Needle 组件？](#use-nvl-or-the-needle-component)。
- **Python / Jupyter notebook 图可视化** → `neo4j/python-graph-visualization`（NVL 的 Python 移植版）
- **编写/优化 Cypher** → `neo4j-cypher-skill`
- **Driver 设置 / executeQuery / session** → `neo4j-driver-javascript-skill`
- **无渲染的服务端数据获取** → `neo4j-driver-javascript-skill`
- **GDS 算法执行** → `neo4j-gds-skill` 或 `neo4j-aura-graph-analytics-skill`
- **GraphQL API** → `neo4j-graphql-skill`

---

## 使用 NVL 还是 Needle 组件？

| 需求 | 使用 |
|---|---|
| 嵌入带默认 Neo4j 样式、无自定义交互或渲染的图视图 | `@neo4j-ndl/react`（Neo4j Needle / NDL 设计系统）中的 `GraphVisualization` —— 封装 NVL 并接受形如 `{ id, labels, properties: { key: { stringified, type } } }`（`NeoNode`）的记录 |
| 自定义交互、自定义渲染、非标准数据形态，或与框架无关的嵌入 | 本 skill —— 直接使用 NVL |

如果答案是第一行，请安装并使用 Needle 组件而非 NVL —— 不要重复做样式工作。

---

## 安装

```bash
npm install @neo4j-nvl/base                  # core (required)
npm install @neo4j-nvl/interaction-handlers  # standard interactions (optional, vanilla JS)
npm install @neo4j-nvl/react                 # React wrappers (optional)
```

对等要求：`@neo4j-nvl/react` 需要 **React 19**。已发布的 peerDependency 范围仍允许 React 18，但不建议混用大版本 —— 请以 19 为目标。`@neo4j-nvl/layout-workers` 是传递依赖 —— 切勿直接安装。仅在使用 `nvlResultTransformer` 时，`neo4j-driver` 才是 `@neo4j-nvl/base` 的对等依赖。

入门模板：https://github.com/neo4j-devtools/nvl-boilerplates —— 各框架的官方脚手架；优先使用它们而非手写搭建。

许可：NVL 依据 **Neo4j Visualization Library License** 发布 —— 仅用于 Neo4j 产品。不能用于其他图后端。

---

## 选择正确的范式

| 需求 | 使用 |
|---|---|
| React 应用，默认交互 | `@neo4j-nvl/react` 中的 `<InteractiveNvlWrapper>` |
| React 应用，自定义交互接线 | `<BasicNvlWrapper>` + 通过 `ref` 自建处理器 |
| 原生 JS，标准交互 | `NVL` + `@neo4j-nvl/interaction-handlers` |
| 原生 JS，完全自定义事件逻辑 | `NVL` + `container.addEventListener` + `nvl.getHits()` |
| 静态 PNG/SVG 图片导出 | `<StaticPictureWrapper>` 或 `nvl.saveToFile()` / `nvl.saveToSvg()` |

---

## 选择正确的渲染器

| 渲染器 | 最大节点数 | 细节 | 使用场景 |
|---|---|---|---|
| `'canvas'`（默认） | ~1,000 | 标题文字、图标、箭头、像素级精确命中测试 | 细节调查、小型图 |
| `'webgl'` | 100,000+ | 无标题文字；2.0 中支持节点图标和关系箭头 | 大规模模式探索 |

```javascript
const nvl = new NVL(container, nodes, rels, { renderer: 'webgl' })
nvl.setRenderer('canvas')   // swap at runtime
```

NVL 2.0 的 GPU 渲染器和力导向物理引擎需要 **WebGL2**。当 GPU 加速不可用时，NVL 可以回退到 Canvas 渲染和非 GPU 布局实现；使用 `disableWebGL: true` 显式避免 WebGL。

---

## 容器设置

容器必须同时具有显式的 `width` 和 `height`。缺少 height → 容器塌缩为 `0` → 图不可见。这是报告最多的 NVL bug。

```html
<!-- ❌ height defaults to 0; graph invisible -->
<div id="viz"></div>

<!-- ✅ explicit dimensions -->
<div id="viz" style="width: 100%; height: 600px;"></div>
```

---

## 原生 —— 基础库

```javascript
import { NVL } from '@neo4j-nvl/base'

const container = document.getElementById('viz')
const nodes = [{ id: '1' }, { id: '2' }]
const relationships = [{ id: '12', from: '1', to: '2', type: 'KNOWS' }]

const nvl = new NVL(container, nodes, relationships)
```

带选项 + 回调：

```javascript
import { NVL } from '@neo4j-nvl/base'

const options = {
  initialZoom: 1.0,
  minZoom: 0.1,
  maxZoom: 8,
  layout: 'forceDirected',
  renderer: 'canvas',
  styling: { defaultNodeColor: '#0e86d4', defaultRelationshipColor: '#888' }
}
const callbacks = {
  onInitialization: () => console.log('NVL ready'),
  onLayoutDone: () => nvl.fit([]),
  onError: (err) => console.error('NVL error', err)
}

const nvl = new NVL(container, nodes, relationships, options, callbacks)

// On teardown — always:
nvl.destroy()
```

`NVL` 构造函数签名：`new NVL(frame, nvlNodes?, nvlRels?, options?, callbacks?)`。除 `frame` 外均为可选，默认空。

---

## 原生 —— 交互处理器

将处理器组合到现有的 `NVL` 实例上。每个处理器通过 `.updateCallback(name, fn)` 注册回调，并且必须用 `.destroy()` 销毁。

```javascript
import { NVL } from '@neo4j-nvl/base'
import {
  ZoomInteraction, PanInteraction, DragNodeInteraction,
  ClickInteraction, HoverInteraction, BoxSelectInteraction,
  LassoInteraction, KeyboardInteraction
} from '@neo4j-nvl/interaction-handlers'

const nvl = new NVL(container, nodes, relationships)

const zoom  = new ZoomInteraction(nvl)
const pan   = new PanInteraction(nvl)
const drag  = new DragNodeInteraction(nvl)
const click = new ClickInteraction(nvl, { selectOnClick: true })
const hover = new HoverInteraction(nvl, { drawShadowOnHover: true })

click.updateCallback('onNodeClick',         (node, hits, evt) => console.log('node',  node.id))
click.updateCallback('onRelationshipClick', (rel,  hits, evt) => console.log('rel',   rel.id))
click.updateCallback('onClusterClick',      (cluster, hits, evt) => console.log('cluster', cluster.id))
click.updateCallback('onCanvasClick',       (evt)             => console.log('canvas'))
hover.updateCallback('onHover',             (el, hits, evt)   => el && console.log('over', el.id))
drag.updateCallback('onDragEnd',            (nodes, evt)      => savePositions(nodes))
zoom.updateCallback('onZoomAndPan',          (level, panX, panY) => console.log(level, panX, panY))

// Teardown — destroy all handlers, then the NVL instance
function teardown() {
  for (const h of [zoom, pan, drag, click, hover]) h.destroy()
  nvl.destroy()
}
```

禁用某个事件而不移除处理器：`click.removeCallback('onCanvasClick')`。传入 `true` 而非函数会以无操作方式启用该事件（对默认选中行为有用）。

---

## React —— InteractiveNvlWrapper

预先接好每个交互处理器。通过 `mouseEventCallbacks` 切换事件（函数 = 开启 + 回调；`true` = 开启，无操作；`false`/省略 = 关闭）。

```tsx
import { InteractiveNvlWrapper } from '@neo4j-nvl/react'
import type { MouseEventCallbacks } from '@neo4j-nvl/react'
import { useRef } from 'react'
import type { NVL, NvlOptions } from '@neo4j-nvl/base'

export function GraphView({ nodes, rels }) {
  const nvlRef = useRef<NVL>(null)

  const nvlOptions: NvlOptions = { initialZoom: 1, renderer: 'canvas' }

  const mouseEventCallbacks: MouseEventCallbacks = {
    onNodeClick:         (node, hits, evt) => console.log('node',  node.id),
    onRelationshipClick: (rel,  hits, evt) => console.log('rel',   rel.id),
    onClusterClick:      (cluster, hits, evt) => console.log('cluster', cluster.id),
    onCanvasClick:       (evt)             => console.log('canvas'),
    onHover:             (el, hits, evt)   => {
      if (el) console.log('hover', el.id)
      if (hits.clusters[0]) console.log('cluster hover', hits.clusters[0].data.id)
    },
    onDragEnd:           (nodes, evt)      => persist(nodes),
    onZoomAndPan: true,                                 // enable, no callback
    onPan:  true
  }

  return (
    <div style={{ width: '100%', height: 600 }}>
      <InteractiveNvlWrapper
        ref={nvlRef}
        nodes={nodes}
        rels={rels}
        nvlOptions={nvlOptions}
        interactionOptions={{ selectOnClick: true, drawShadowOnHover: true }}
        mouseEventCallbacks={mouseEventCallbacks}
        onInitializationError={(err) => console.error('NVL init', err)}
      />
    </div>
  )
}
```

`ref` 解析为底层的 `NVL` 实例 —— 可调用其任意方法：`nvlRef.current?.fit([])`、`nvlRef.current?.setRenderer('webgl')`、`nvlRef.current?.saveToFile()`。

---

## NVL 2.0 —— 布局聚类

`clusterBy` 将回调返回相同字符串或数字的节点分组。对独立节点返回 `undefined`。在 React 中用 `useCallback` 保持回调引用稳定。

力导向聚类将所有聚类设置嵌套在 `layoutOptions.clustering` 下：

```javascript
const clusterBy = (nodeId) => categoryByNodeId[nodeId]

const nvl = new NVL(container, nodes, relationships, {
  layout: 'forceDirected',
  layoutOptions: {
    seedingMethod: 'circle',
    clustering: {
      clusterBy,
      drawOutline: true,
      drawHalo: true,
      crossClusterRelationshipMultiplier: 0.2
    }
  },
  minFps: 3,
  maxFps: 30
})
```

`crossClusterRelationshipMultiplier` 为实验性，上限为 `0..1`，在接近 `1` 时可能使高度连接的图不稳定。它只影响跨聚类的弹簧拉力；聚类内部的边仍保持全强度。

层次聚类将 `clusterBy` 直接放在 `layoutOptions` 中：

```javascript
const nvl = new NVL(container, nodes, relationships, {
  layout: 'hierarchical',
  layoutOptions: {
    direction: 'down',
    clusterBy
  }
})
```

聚类装饰和聚类 hull 交互适用于力导向的 `layoutOptions.clustering`。`Cluster` 不是图元素；它有 `{ id: string | number, nodeIds: string[] }`。聚类回调仅在聚类 hull 内的空白处触发；节点和关系命中保持优先。

---

## 从 NVL 1.x 迁移到 2.0

- 将 React wrapper 的 `layout` 和 `layoutOptions` 属性移入 `nvlOptions`：
  `<InteractiveNvlWrapper nvlOptions={{ layout, layoutOptions }} />`。
- 将交互回调 `onZoom` 替换为 `onZoomAndPan(zoom, panX, panY, event)`。
- 移除 `intelWorkaround` 及与 Cytoscape 相关的布局设置；它们已不存在。
- 将 WebGL 视为仅 WebGL2，且不要期望 WebGL 渲染器中有标题文字。
- `getNodes()` 和 `onLayoutStep` 返回 `NodeWithClientPosition[]`：`x`/`y` 是布局坐标，`clientPosition` 相对于 canvas 元素。
- 使用 `styling.overlayLineColor`；`styling.minimapViewportBoxColor` 已弃用。

---

## React —— BasicNvlWrapper + Ref

不接线任何交互。ref 通过 `IncludeMethods<NVL>` 暴露每个 NVL 方法 —— 在 React 中构建自定义交互逻辑时使用。

```tsx
import { BasicNvlWrapper } from '@neo4j-nvl/react'
import type { NVL } from '@neo4j-nvl/base'
import { useRef } from 'react'

export function MiniGraph({ nodes, rels }) {
  const nvlRef = useRef<NVL>(null)

  return (
    <div style={{ width: '100%', height: 400 }}>
      <BasicNvlWrapper
        ref={nvlRef}
        nodes={nodes}
        rels={rels}
        nvlOptions={{ initialZoom: 2 }}
        nvlCallbacks={{ onLayoutDone: () => nvlRef.current?.fit([]) }}
      />
      <button onClick={() => nvlRef.current?.fit(['1', '2'])}>Zoom to 1,2</button>
    </div>
  )
}
```

---

## 接入 Neo4j Driver 结果

`@neo4j-nvl/base` 为 JS driver 导出一个 `ResultTransformer`，可跨任意记录形态对节点/关系去重。

```javascript
import neo4j from 'neo4j-driver'
import { NVL, nvlResultTransformer } from '@neo4j-nvl/base'

const driver = neo4j.driver(process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD))

const { nodes, relationships } = await driver.executeQuery(
  'MATCH (a)-[r]-(b) RETURN a, r, b LIMIT 25',
  {},
  { database: 'neo4j', resultTransformer: nvlResultTransformer }
)

const nvl = new NVL(document.getElementById('viz'), nodes, relationships)
```

```javascript
// ❌ raw EagerResult — records are not Node/Relationship objects
const result = await driver.executeQuery('MATCH (a)-[r]-(b) RETURN a, r, b')
new NVL(container, result.records, [])   // breaks

// ✅ use the transformer
const { nodes, relationships } = await driver.executeQuery(
  'MATCH (a)-[r]-(b) RETURN a, r, b',
  {},
  { database: 'neo4j', resultTransformer: nvlResultTransformer }
)
new NVL(container, nodes, relationships)
```

关于 driver 生命周期、session 管理、Integer 处理和 TypeScript 类型 → `neo4j-driver-javascript-skill`。

---

## 更新图

| 方法 | 行为 |
|---|---|
| `addAndUpdateElementsInGraph(nodes, rels)` | 插入新的；按 id 更新现有的（仅指定字段） |
| `updateElementsInGraph(nodes, rels)` | 仅更新现有的；忽略未知 id |
| `addElementsToGraph(nodes, rels)` | 仅插入；遇到已存在的 id 会抛错 |
| `removeNodesWithIds(ids)` | 移除节点；相邻关系自动移除 |
| `removeRelationshipsWithIds(ids)` | 移除关系 |
| `setNodePositions(nodes, updateLayout?)` | 覆盖位置；可选重新运行布局 |
| `restart(options?, retainPositions?)` | 用新选项重启；位置可选 |

差异更新使用 `PartialNode` / `PartialRelationship` —— 仅 `id` 必需：

```javascript
nvl.updateElementsInGraph(
  [{ id: '1', color: '#f00', selected: true }],   // PartialNode
  [{ id: '12', width: 4 }]                         // PartialRelationship
)
```

---

## 命中测试（手动）

在未使用 interaction-handlers 包时使用。在 2.0 中，`getHits()` 解析节点、关系和力导向聚类 hull。其默认目标为 `['node', 'relationship', 'cluster']`。

```javascript
const nvl = new NVL(container, nodes, rels)

container.addEventListener('click', (evt) => {
  const { nvlTargets } = nvl.getHits(evt, ['node', 'relationship', 'cluster'], { hitNodeMarginWidth: 4 })
  const hitNode = nvlTargets.nodes[0]
  const hitRel  = nvlTargets.relationships[0]
  const hitCluster = nvlTargets.clusters[0]
  if (hitNode) console.log('hit node', hitNode.data.id)
  else if (hitRel) console.log('hit rel', hitRel.data.id)
  else if (hitCluster) console.log('hit cluster', hitCluster.data.id, hitCluster.data.nodeIds)
  else console.log('hit canvas')
})
```

`HitTargetNode` / `HitTargetRelationship` 携带元素命中数据。`HitTargetCluster` 携带 `data`、`pointerCoordinates` 以及拟合后的凸 `hull`。参见 [references/api-surface.md](references/api-surface.md)。

---

## 常见错误

| 错误 | 修复 |
|---|---|
| 容器没有 `height` → 图不可见 | 在容器上设置显式 `width` 和 `height` |
| 直接传入 `driver.executeQuery` 结果 | 使用 `nvlResultTransformer` 并消费 `{ nodes, relationships }` |
| 对标签丰富的小图使用 WebGL | 使用 `'canvas'`；标签得到完全支持 |
| 对 10k+ 节点使用 Canvas | 通过 `renderer` 选项或 `setRenderer` 切换到 `'webgl'` |
| 每次 React 渲染都新建 `NVL` | 使用 `<InteractiveNvlWrapper>` / `<BasicNvlWrapper>`，或在 `useEffect` + `destroy()` 中包裹 |
| 销毁时忘记 `nvl.destroy()` | 在卸载时调用 `destroy()`；React wrapper 会自动处理 |
| 原生处理器未销毁 | 在 `nvl.destroy()` 之前对每个交互调用 `.destroy()` |
| Worker 构造被阻止（严格 CSP / 沙箱运行时 / 较旧打包器） | `nvlOptions: { disableWebWorkers: true }`（NVL 有非 worker 回退） |
| 受监管环境中启用了遥测 | `nvlOptions: { disableTelemetry: true }` |
| 布局永不收敛 | 用 `pinNode(id)` 固定锚节点；调整 `layoutTimeLimit` |
| `selectOnClick` 触发两次 | 在挂载时切换一次；不要每次渲染都翻转 `interactionOptions` |
| 命中测试在节点边缘附近失准 | 向 `getHits` 传入 `{ hitNodeMarginWidth: N }` |
| WebGL 上缺少标题文字 | 2.0 中属预期；标题文字仅 Canvas 支持，因此当标签重要时使用 `'canvas'` |
| React wrapper 忽略 `layout` / `layoutOptions` | 在 2.0 中这些必须嵌套在 `nvlOptions` 中 |
| `onZoom` 从不触发 | 它在 2.0 中已移除；使用 `onZoomAndPan` |
| 聚类回调错过节点点击 | 聚类回调针对聚类 hull 的空白区域；节点命中优先 |

---

## 参考资料

按需加载：
- [references/api-surface.md](references/api-surface.md) —— 完整的 2.0 `NVL` 方法表；聚类、FPS、seeding、`NodeWithClientPosition`、命中目标与交互回调类型；React props；命名导出；`nvlResultTransformer`
- [references/troubleshooting.md](references/troubleshooting.md) —— 零高度容器、WebGL2 与 Canvas 的取舍、聚类配置、1.x 迁移错误、worker 回退、上下文丢失、遥测、生命周期、布局与命中测试问题

权威网络文档（当上述参考资料不足时使用 `WebFetch`）：
- https://neo4j.com/docs/nvl/current/ —— 用户指南（安装、基础库、交互处理器、React wrapper）
- https://neo4j.com/docs/api/nvl/current/ —— TypeDoc API 参考
- https://neo4j.com/docs/api/nvl/current/examples.html —— 可运行示例
- https://github.com/neo4j-devtools/nvl-boilerplates —— 各受支持框架的官方入门模板
- https://github.com/neo4j/python-graph-visualization —— NVL 的 Python 移植版（本 skill 仅用于 JavaScript/浏览器路径）

---

## 检查清单
- [ ] 容器具有显式的 `width` 和 `height` CSS
- [ ] 已从决策表中选择正确的范式（原生 / handlers / React）
- [ ] 渲染器与预期节点数匹配（Canvas ≲1k / WebGL 100k+）
- [ ] 凡需要标题文字时都选择 Canvas
- [ ] React 的 `layout` 和 `layoutOptions` 嵌套在 `nvlOptions` 内
- [ ] 缩放处理器使用 `onZoomAndPan`，而非已移除的 `onZoom`
- [ ] `clusterBy` 在 React 中保持稳定，并按所选布局正确放置
- [ ] Driver `executeQuery` 结果经 `nvlResultTransformer` 管道处理
- [ ] 每次 `executeQuery` 调用都指定了 `database`（委托给 `neo4j-driver-javascript-skill`）
- [ ] 销毁时所有交互处理器在 `nvl.destroy()` 之前已 `.destroy()`
- [ ] React 卸载时调用 `nvl.destroy()`（仅手动实例 —— wrapper 会自动处理）
- [ ] 在受监管 / 离线环境中设置 `disableTelemetry: true`
- [ ] 当打包器 / CSP 阻止 worker 构造时设置 `disableWebWorkers: true`
- [ ] 图更新使用 `addAndUpdateElementsInGraph` / `updateElementsInGraph` —— 而非 `restart`
- [ ] 许可兼容：目标是 Neo4j 产品
