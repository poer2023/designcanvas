# PosterLab PRD v1.8

> **去 Upload 卡｜贴图自动成卡｜Image Studio 作为生成端**

---

## 0. 核心原则

1. **UI 只有两类卡**：Text Card、Image Card
2. **Group Frame 是选框容器**：框内对象即归组，组有模板与输出 token
3. **图片输入无需"先建卡"**：用户直接粘贴/拖拽，系统自动生成 raw Image Card
4. **文生图只在 Image Studio 模式里完成**：空白图片卡就是生成端
5. **连线决定生效，typed ports 决定语义**
6. **单卡 Run 不级联**；链式刷新靠 Run Group（Pipeline Group）
7. **所有运行写 Recipe**（可回放、可追溯）

---

## 1. 目标与范围

### 1.1 v1.8 必做闭环

- 直接贴图/拖图 → 自动生成 raw Image Card
- 框选创建 Portfolio Group / RefSet Group → 组内图片作为输入
- 生成 Style Token / RefSet Token（组框运行）
- 创建 Image Studio（空白图片卡）→ 连上 Brief/Style/RefSet → 文生图出候选
- 候选图片 ★/Lock 标记"可交付版本" → Export
- 修改上游后，下游显示 stale；用 Run Group 串联刷新

### 1.2 明确不做

- 左侧 Assets 库、右侧 Inspector
- 自动全局级联跑 DAG
- 复杂 mask 编辑器（元素提取可先 stub/占位）
- 多人协作

---

## 2. 页面结构

### 2.1 Spaces 首页

- Recent Spaces
- Templates（插入预置区块）

### 2.2 Space（唯一主工作区）

- 无限画布
- 顶部轻工具条：Space 名称、Undo/Redo、Export
- 条形 Dock（底部或左侧）：创建卡片/组/模板、连线模式、搜索

---

## 3. 对象模型（只有 3 种形态）

### 3.1 Text Card

| role | 说明 |
|------|------|
| **notes** | 纯文本，不参与执行（除非连到 Brief In 也允许，但默认不推荐） |
| **brief** | 结构化需求（title/subtitle/info/size/tone/constraints） |

### 3.2 Image Card（一个组件，两种模式）

| mode | 说明 |
|------|------|
| **raw** | 仅承载图片（来自粘贴/拖拽/文件选择），默认作为输入引用 |
| **studio** | 生成端（空卡可文生图，生成后可继续 img2img / variations） |

> **终稿不是类型**：任意 candidate 图 ★ 或 Lock 即"可交付"。

### 3.3 Group Frame（选框容器）

- **创建方式**：进入框选模式 → 拉框 → 框内对象入组
- **组类型（模板）**：Portfolio / RefSet / Run Group /（可选 Elements）
- **组可以输出 token**：Style Token / RefSet Token / Candidates Token / Elements Token

---

## 4. 输入图片的交互（本次 PRD 核心改动）

### 4.1 直接贴图到画布（无须先建卡）

**用户动作**：
- Ctrl/Cmd+V（剪贴板图片）
- 拖拽本地文件到画布空白处
- 拖拽文件夹（可选 v1.8 支持多张）

**系统行为**：
- 自动创建 Image Card(mode=raw)，填充图片
- card 元数据记录：source=paste|dragdrop|picker、filename/hash/created_at

### 4.2 直接拖拽图片到某个 Group 框

**用户动作**：把文件拖到 Portfolio/RefSet Group 的框内

**系统行为**：在组内自动生成多个 raw Image Cards 并加入组

> **结论**：UI 不出现"Upload 卡"，但系统永远把输入图对象化成 raw Image Card。

---

## 5. Dock 工具栏（创建与插入统一入口）

### 5.1 Dock 常驻按钮（最小集）

| 按钮 | 行为 |
|------|------|
| **Text** | 创建 Text Card，默认 notes |
| **Image Studio** | 创建 Image Card(mode=studio) 空白生成卡 |
| **Group** | 进入框选建组模式 |
| **Template** | 插入预置区块（可选） |
| **Link Mode** | 点连模式（可选） |
| **Search** | Cmd+K 等效 |

### 5.2 Dock 不提供 Upload 按钮

输入图片全走"直接操作"：粘贴/拖拽/文件选择（可通过快捷键触发 picker）

---

## 6. 类型化输入口（Typed Ports）与连线规则

### 6.1 输入口只出现在"可执行组/卡"上

- Portfolio Group、RefSet Group、Run Group（执行控制）
- Image Studio Card（生成端）
- （可选）Extract/Harmonize 组（后置）

### 6.2 v1.8 最小端口集

| 端口 | 来源 |
|------|------|
| **Brief In** | Text Card(role=brief) |
| **Style In** | Style Token（Portfolio Group 输出） |
| **RefSet In** | RefSet Token（RefSet Group 输出） |
| **Image In** | raw/studio 的 pinned image（用于 img2img） |
| **Candidates In** | Run Group 里用于串联时可选 |
| **Elements In** | 后置 |

### 6.3 连线生效规则

- 只消费直接上游输出快照（single-hop）
- 单卡 Run 不自动跑上游；上游无输出则 Blocked
- 上游输入变化导致输出过期 → 下游显示 stale（但仍可"用旧快照运行"）

---

## 7. 卡片规格（全部卡内编辑/运行，不弹侧栏）

### 7.1 Text Card（Notes / Brief）

**notes**：自由文本，默认不参与执行

**brief**：
- title/subtitle/info（分块输入）
- size dropdown（1080×1920/A4/custom）
- tone slider
- constraints chips（品牌色/禁用项/密度/留白偏好等）
- **输出**：BriefSnapshot

> 文字卡默认不 Run。prompt 编译由 Image Studio 内部完成并写入 recipe。

### 7.2 Image Card(mode=raw)

- 预览图 + 一行 caption（可选）
- **输出**：ImageSnapshot（作为输入引用）
- **动作**：Copy / Duplicate / Lock / ★ / Add to Group

### 7.3 Image Card(mode=studio)（生成端，核心）

**Empty / Draft**：
- prompt textarea（主输入）
- quick bar：Model / Ratio / Resolution / Count / ⚙ / ▶
- advanced（⚙）：seed/steps/cfg/styleStrength/img2imgStrength（可先 stub）

**Generated**：
- results grid（N 张）
- pin（主图）、多选、variations、extract（后置）

**输出两类快照**：
- **ImageOut**（pinned 或默认第一张）
- **ContextOut**（prompt + params + seed + model +（可选）image ref）

> 生成后的"图+参数+文本"必须作为下游输入可连接，支撑 skills 工程。

---

## 8. Group Frame 规格

### 8.1 Group 创建（框选）

1. 点击 Dock 的 Group → 进入框选模式
2. 拉框后生成 group 边框，框内所有卡片入组
3. 支持拖入/拖出动态加入/移除

### 8.2 Group 类型（模板）与动作

**Portfolio Group（提炼风格）**
- 输入：组内所有 raw/studio 图片（取 pinned 或单图）
- 运行：Extract Style
- 输出：Style Token Out（含 style summary + palette + 可选 embedding refs）
- 组内 UI：顶部条显示状态、Run、Auto-run（默认 off）、…

**RefSet Group（参考样例）**
- 输入：组内图片集合
- 运行：Build RefSet（可带 dedup/cluster）
- 输出：RefSet Token Out（refs 列表 + 摘要）

**Run Group（Pipeline Group）**
- 作用：串联运行刷新"最新输出"，解决单卡不级联的问题
- 运行顺序：拓扑排序（基于组内连线依赖），只跑组内
- 模式：Run All / Run Dirty Only / Run From Here

> 组不再是"容器卡"，而是"画布上的工作区框"。

---

## 9. 运行模型（单卡 vs Run Group）

### 9.1 单卡 Run（默认省钱模式）

- 只读直接上游输出快照
- 不触发上游
- stale 只提示，不强制阻塞（除非输入缺失）

### 9.2 Run Group（串联刷新模式）

- 用户需要"串起来跑出最新"时使用
- 组内拓扑排序执行
- 组外依赖视作外部快照（可提示 external stale）

---

## 10. 通信与快照协议

### 10.1 Output Snapshot（不可变）

```typescript
interface OutputSnapshot {
  snapshot_id: string;
  producer_id: string;
  port_key: string;
  version: number;
  payload: unknown;
  created_at: number;
}
```

下游只订阅 snapshot，不读上游 state。

### 10.2 连接即订阅

- 连接建立：下游订阅上游的某个 port_key 输出
- 上游新输出 version+1：通知下游 stale（不自动跑）

---

## 11. Recipe（必须做）

每次运行写：
- actor（card/group）
- skill_id@version
- inputs（snapshot refs）
- params（模型/比例/数量/seed 等）
- outputs（snapshot ids）
- duration/status/error

查看方式：卡/组顶部 … 展开折叠区（仍在对象内部，不弹侧栏）

---

## 12. 导出规则（终稿=状态）

- **默认导出**：当前 Space 内被 ★ 或 Lock 标记的图片
- **可选**：导出包（images + recipe.json）

---

## 13. 迭代计划

| Step | 内容 |
|------|------|
| **Step 1** | 快照协议 + stale/blocked：输出快照、订阅、版本递增；下游 stale/blocked 状态可见 |
| **Step 2** | Image Studio 卡跑通文生图 + ContextOut：空卡 → 生成 → 网格 → pin/★/lock；输出 ImageOut/ContextOut |
| **Step 3** | Group 框选 + Portfolio/RefSet 输出 token：框选入组；组内 run 输出 token；token 可连到 Image Studio 的 Style/RefSet 输入口 |
| **Step 4** | Run Group（Pipeline）拓扑执行 + Recipe：组内拓扑排序串联运行；每次 run 写 recipe |

---

## 14. 验收标准（v1.8）

- [ ] 用户可直接 paste/drop 图片到画布或 group，系统自动对象化为 raw Image Cards
- [ ] Image Studio 空卡可文生图，生成结果可作为下游输入连接（含 ContextOut）
- [ ] 无侧栏情况下完成：Portfolio→Style→Brief→RefSet→Generate→★/Lock→Export
- [ ] 修改上游后下游能显示 stale；Run Group 可串联刷新并写 recipe

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.6 | 2024-12 | Canvas-only + Typed Ports |
| v1.7 | 2024-12 | Image Studio 生成卡 + Upload Image 输入卡 + Group 选框容器 + 双输出(Image+Context) |
| v1.8 | 2024-12 | **去 Upload 卡 → 统一 Image Card(raw/studio)、直接贴图自动成卡、快照协议、stale/blocked 状态、Run Group 级联执行、Recipe 追溯** |
