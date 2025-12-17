# PosterLab PRD v1.6（合并版）

> **模式**：Canvas-only 创意工作台  
> **核心组件**：Text Card + Image Card + Group Frame（组框）  
> **核心机制**：类型化输入口（Typed Ports）+ 连线生效（Connected = Active）  
> **Skills 融合**：组框/可执行区块绑定 skill_id@version + Recipe 可回放  
> **新增入口**：统一条形工具栏（底部/左侧 Dock 二选一）

---

## 0. 一句话定义

在一张无限画布里，用"文本卡 + 图片卡 + 组框"完成风格提炼、参考样例组织、批量出图、元素提取、（可选）统一生成与导出；连线决定生效，类型化输入口决定语义，Skills 在背后负责可复用与可回放。

---

## 1. 目标与范围

### 1.1 v1 必做闭环

```
Portfolio Group → Style Token → Brief Text → RefSet Group → Generate → Candidates Output Group → Extract Elements Group →（可选 Harmonize）→ Export
```

**终稿不做新类型**：在任何候选图上通过 ★ Favorite 或 Lock 标记为"可交付版本"。

### 1.2 v1 不做

- 用户/团队/权限
- 左侧 Assets 库 / 右侧 Inspector 面板（**全部删**）
- 真实可编辑文字对象（文字当图处理；局部重绘可后置）
- PSD/AI 原生分层导出（先资产包）
- 公共技能市场（只做模板区块 + 内置技能包）

---

## 2. 交互硬约束（写死）

| 约束 | 说明 |
|------|------|
| **无侧栏** | 无左侧 Assets、无右侧 Inspector、无常驻面板 |
| **无弹侧栏** | 点击卡片只选中，不弹侧栏；编辑/选择字段必须在卡片或组框内完成 |
| **连接生效** | 不连接 = 不生效（Inactive），默认可视为 notes/raw |
| **类型化输入** | 连接后由输入口类型赋予语义（brief/prompt/style/refset/candidates/elements） |
| **无大面板** | 高级设置只能在卡片/组框内展开（齿轮→展开），不允许弹出"大面板" |
| **结果不跳页** | 生成结果落在画布（组框结果区 + 可撕出单图卡） |

---

## 3. 页面与信息架构

### 3.1 Spaces 首页

- Recent Spaces（卡片）
- Templates（模板卡：插入预置区块）

### 3.2 Space（唯一主页面）

- 无限画布（Pan/Zoom/Minimap/History）
- **顶部轻工具条**（可极简）：Space 名称、Export、Undo/Redo（可选）
- **底部或左侧条形工具栏 Dock**（核心）：创建卡片/组、插入模板、连线模式、搜索

### 3.3 Settings

- API Key、默认尺寸/数量/质量档、缓存清理

---

## 4. 画布对象模型（UI 只保留 3 个形态）

### 4.1 Text Card（唯一文字卡）

- **role**: `notes` | `brief` | `prompt`
- 未连接默认 notes；可手动切 role；连接到输入口后可提示匹配但不强制改

### 4.2 Image Card（唯一图片卡）

- **role**（内部状态，不拆 UI 类型）：
  - `raw`（默认：贴图/原图）
  - `candidate`（候选图）
  - `element`（元素图：crop/mask）
- **终稿判定**：`favorite=true` 或 `locked=true`（状态，不是类型）

### 4.3 Group Frame（组框/容器）

- 容纳一批卡片，并提供"组级动作 + 输出 token"
- **组框类型**（v1）：`Portfolio` | `RefSet` | `Generate` | `Extract` | `Harmonize`（可选）| `Blank`
- 组框可折叠（Collapse）以节省画布空间

---

## 5. 条形工具栏 Dock

### 5.1 位置与形态

- **默认**：底部居中浮动 Dock（推荐）
- **可选**：左侧竖向 Dock（设置项）
- **支持**：折叠/展开、Pin 展开、Auto-hide

### 5.2 按钮分组（v1 最小集）

**基础创建（常驻）**

| 按钮 | 功能 |
|------|------|
| Text | 创建 Text Card（默认 notes） |
| Image | 创建空 Image Card（支持 paste/drop） |
| Group | 创建组框（弹出类型选择） |
| Link Mode | 连线模式开关（可选） |
| Search | 搜索插入（同 Cmd+K） |
| Undo/Redo | 可选 |

**Group 类型选择（点 Group 后弹出小条）**

`Portfolio` / `RefSet` / `Generate` / `Extract` / `Harmonize` / `Blank`

**Templates（可选按钮）**

- Template：插入预置区块（例如 Generate+Extract 一套）

### 5.3 创建行为一致性

- 新建对象默认落在当前视窗中心
- 若用户先点了某组框的某个输入口，Dock 会显示"目标插槽提示"，创建即自动连线

---

## 6. 类型化输入口（Typed Ports）与连线生效

### 6.1 输入口出现位置

- 只出现在可执行组框上（Generate/Extract/Harmonize 等）
- Portfolio/RefSet 也可视作"可执行组框"（有动作与输出 token）

### 6.2 v1 最小输入口类型

| 输入口 | 接受类型 |
|--------|----------|
| **Brief In** | Text(role=brief) |
| **Prompt In** | Text(role=prompt)（可选） |
| **Style In** | Style Token（来自 Portfolio Group 输出） |
| **RefSet In** | RefSet Token（来自 RefSet Group 输出） |
| **Candidates In** | Candidates Token（来自 Generate Group 输出）或 candidate 集合 |
| **Elements In** | Elements Token（来自 Extract Group 输出）或 element 集合 |

### 6.3 "聚焦输入口"机制

点击某输入口后：
- Dock 上的 Text/Image/Group 按钮出现 `→ Brief` / `→ Style` 等提示
- 点击 Text 自动创建对应 role（brief/prompt）并自动连接到该输入口
- 对 Style/RefSet 输入口：引导用户创建对应 Portfolio/RefSet 组框并运行得到 Token

### 6.4 连线模式

- **A. 拖拽连接（推荐）**：从输出 token/chip 拖到输入口
- **B. Link Mode**：点输出 → 点输入 完成连接（适配触控板）

### 6.5 生效规则

- 只有连接到输入口的卡片/Token 才参与运行
- 断开连接立即失效，但内容保留（便于复用）
- Candidates/Elements 允许多连接合并；Brief/Style/RefSet 通常单连接

---

## 7. 卡片字段与交互（全部"就地完成"）

### 7.1 Text Card（按 role 切换字段）

#### notes
- 自由文本；不参与执行

#### brief
- Title / Subtitle / Info（分块输入）
- Size（dropdown）
- Tone（slider）
- Constraints（chips：禁用项/品牌色/禁用色/密度等）
- Save（不需要运行）

#### prompt
- Prompt 文本（默认折叠摘要，展开可见）
- Lock（锁 prompt 版本）、Save

### 7.2 Image Card（按 role/状态显示动作）

#### raw
- 支持 paste/drop；可拖入组框

#### candidate
- 动作：Select（多选）、Variations、Extract、★、Lock、Export

#### element
- 显示 crop/mask + tags(chips) + note（一行）
- 动作：加入 Harmonize、Export PNG、Lock

#### 终稿
- 不是新卡：candidate 上 ★ + Lock（或任一）即可作为"可交付版本"
- Space 封面默认使用最近 ★ 或 Lock 的图

---

## 8. 组框类型（Group Frames）与输出 token

### 8.1 Portfolio Group（作品集组）

- Drop 多图
- ▶ Extract Style（控制条：质量档 + 齿轮）
- 结果区：风格摘要（可编辑）+ palette
- **输出口**：Style Token Out

### 8.2 RefSet Group（参考样例组）

- Drop 多图/文件夹
- 控制：Dedup、Cluster 强度、▶ Build RefSet
- 结果区：预览网格 + 数量 + 可剔除
- **输出口**：RefSet Token Out

### 8.3 Generate Group（生成组）

- **输入口**：Brief In / Style In / RefSet In / Prompt In（可选）
- Body：补充描述（可空）+ 已连接 inputs chips
- 控制条（图二风格）：Model / Ratio / Resolution / Count / ⚙ / ▶
- 结果区：网格（12/24），多选、排序
- 操作：
  - **Pin Selected**：把选中缩略图"撕出"为独立 candidate Image Cards
  - **Send to Extract**：把选中集合推送到 Extract Group
- **输出口**：Candidates Token Out

### 8.4 Extract Group（元素提取组）

- **输入口**：Candidates In
- 控制：Rect/Lasso、▶ Extract
- 结果区：元素网格（element），可撕出为独立 Element Cards
- **输出口**：Elements Token Out

### 8.5 Harmonize Group（可选）

- **输入口**：Elements In +（可选）Brief In +（可选）Style In
- 控制：Unify policy + ▶ Harmonize
- 输出：生成一张 candidate Image
- **输出口**：可选（Candidates Token）

### 8.6 Blank Group（空组框）

- 仅容器/分区/排版，不绑定 skill

---

## 9. Skills 内核与 Recipe

### 9.1 绑定粒度

- 每个"可执行组框"绑定 `skill_id@version`
- 组框输入口/输出 token 对应 `io_schema` 字段

### 9.2 Recipe 记录（强制）

每次点击 ▶ 必须写入：
- `skill_id@version`、seed、model params
- 输入引用（连接到各输入口的 card_id/token_id）
- 输出产物列表
- 状态/耗时/错误摘要

**查看方式**：组框右上 `…` → 展开折叠区（不许弹侧栏）

---

## 10. 无 Assets 侧栏后的资产管理策略

- **资产=画布上的卡/组框**
- **Search**（Dock 或 Cmd+K）：搜卡片标题/标签/状态
- **Template 插入**替代"去库里挑节点"

---

## 11. 本地存储与导出

- **Local-first**：SQLite + 本地 assets 目录
- **导出策略**：
  - 默认导出：当前 Space 中被 ★ 或 Lock 标记的图片
  - 可选导出包：图片 + element 资产 + recipe.json

---

## 12. 里程碑（实现顺序）

| 里程碑 | 内容 |
|--------|------|
| **M1** | 画布纯净化 + Dock（移除所有侧栏、Dock 基础按钮、Text role 切换） |
| **M2** | 组框与类型化输入口（Group Frame 创建、输入口类型校验、聚焦输入口机制） |
| **M3** | 生成闭环（Portfolio→Style Token、RefSet→RefSet Token、Generate→Candidates） |
| **M4** | 元素闭环（Extract→Elements Token、★/Lock 终稿标记、导出逻辑） |
| **M5** | Recipe 与复跑（运行记录 Recipe、组框内查看、基础复跑） |

---

## 13. v1 验收标准

- [x] 用户只用 Dock + 画布完成完整闭环，不需要任何侧栏/弹窗式配置面板
- [x] "连线决定生效、输入口决定语义"能解释所有运行结果
- [x] 候选图、元素、收藏/锁定图均可追溯 recipe
- [x] 终稿不需要新类型卡：★/Lock 标记即导出目标与 Space 封面来源

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.2 | - | 原始版本：Skill Graph + Canvas 模式 |
| v1.3 | 2024-12 | Spaces 模式 + 卡片系统重构 |
| v1.6 | 2024-12 | **Canvas-only 模式**：移除所有侧栏，Text/Image/Group Frame 三形态，Typed Ports + Dock |
