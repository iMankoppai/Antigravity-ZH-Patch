---
name: create-tile-palette-or-rule-tiles
description: 从精灵或纹理创建 2D 瓦片调色板，或让瓦片根据其相邻瓦片发生变化。用于瓦片调色板或自连接瓦片，即使用户没有提及这些名称。
---

# 创建瓦片调色板

根据用户的需求选择匹配的参考文档，然后按照它操作：

- **瓦片调色板（Tile Palette）** — [references/palette-create.md](references/palette-create.md) — 当用户想要为 2D 关卡设计组织瓦片，或创建新的矩形、六边形、等距或等距 Z as Y 网格布局时。
- **空白/空 RuleTile**（未提供精灵）— [references/ruletile-createempty.md](references/ruletile-createempty.md) — 当用户想要一个空白 RuleTile（矩形网格）、HexagonalRuleTile 或 IsometricRuleTile 以进行自定义规则配置，且尚未提供或引用任何精灵时。
- **从现有精灵构建的 RuleTile**（已提供精灵、地形美术、边缘瓦片）— [references/ruletile-createfromsegment.md](references/ruletile-createfromsegment.md) — 当用户想要在绘制时自动拼接的瓦片，或从现有地形或边缘精灵构建 RuleTile 以使瓦片正确连接时。
