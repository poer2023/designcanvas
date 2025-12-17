# PosterLab PRD v1.3（Spaces 模式 + Skills 内核）

## 0. 核心定位

- **Space 是产品本体**：一张无限画布上同时放"素材、生成结果、元素、画板、流程工具"。
- **Skills 是隐藏内核**：用户看到的是"模板与工具卡片"，不是"技能列表"。

---

## 1. 范围约束（v1）

### v1 必做闭环

`Style（风格卡）→ Brief（简报卡）→ RefSet（样例卡）→ Batch（结果集卡）→ Pick（元素卡）→ Artboard（画板卡）→ Harmonize（终稿卡）→ Export`

### v1 不做

- 用户/团队/权限
- 真实可编辑文字对象（文字先当图处理；最多文字区域 mask + 局部重绘）
- PSD/AI 原生分层导出（先资产包）
- 公共技能市场（只做模板/工具的本地库）

---

## 2. 信息架构与页面

### 2.1 Spaces（首页）

- **Recent Spaces 区**（Space 卡片栅格）
- **Templates 区**（模板卡片栅格：一键创建 Space）
- **顶部全局搜索**（搜 Space/素材/结果/元素）

### 2.2 Space（核心：无限画布）

- 画布占绝对主区域
- **左侧 Assets Drawer**（抽屉）：Styles / Inspiration / Elements（三个 Tab）
- **右侧 Inspector**（检查器）：点中任意卡片/节点才弹出
- **顶部工具条**：Run、Run from selection、Stop、Zoom、Fit、History、Export

### 2.3 Templates & Tools（替代现在的 Skills 页面）

- **Templates（模板卡）**：每张模板=一套预置 Skill Graph + 默认参数
- **Tools（工具卡）**：可拖到画布创建"节点卡"（Batch/Extract/Harmonize/Export 等）
- **Advanced（折叠）**：Skill Pack 版本、Schema、测试用例（给开发用，默认隐藏）

### 2.4 Settings

- API Key、默认尺寸、默认 batch 数量、质量档、缓存清理

---

## 3. 核心交互原则（Spaces 化的关键）

1. **结果必须"回到画布上"**：Batch 的输出不是跳去 Gallery，而是在画布生成一个"结果集卡"。
2. **资产必须能拖拽上画布**：Style/RefSet/Element 都是可拖拽卡，拖进去就是"引用"。
3. **Inspector 只在需要时出现**：别让右侧配置常驻占屏。
4. **卡片即操作入口**：卡片上直接完成 80% 操作，深入参数才进 Inspector。
5. **Skills 不消失但隐形**：用户点的是"Generate / Extract / Harmonize"，背后才是调用 Skill。

---

## 4. 卡片系统（重点）

v1 的 UI 不是"页面"，而是"卡片集合"。所有核心功能都通过卡片完成。

### 4.1 卡片通用规范（Card Anatomy）

所有卡片统一结构：

| 区域 | 内容 |
|------|------|
| **Header** | 图标 + 标题 + 状态 pill（Idle/Running/Success/Failed/Locked） |
| **Body** | 关键摘要（chips）+ 缩略图（可选）+ 数量/尺寸等信息 |
| **Footer**（Hover 才出现） | 主动作（Primary）+ 次动作（…更多） |
| **右上角** | Pin（固定到画布）/ Lock（锁输出）/ More（菜单） |

**通用交互：**

- **单击**：选中（右侧 Inspector 显示详情）
- **双击**：进入/放大（比如 Artboard、Results Grid）
- **拖拽**：把卡片"当资源"丢到画布或丢进另一个卡片（触发组合动作）
- **Shift 多选**：对多张卡批量操作（Pin、Extract、Delete）
- **右键菜单**：复制/克隆/导出/查看 recipe/删除

### 4.2 Space 卡（首页 Recent Spaces）

**目的**：快速回到工作现场，不让用户先想"流程怎么搭"。

**字段：**
- 封面缩略图（最近终稿/最近结果集）
- Space 名称、更新时间
- "最近一次运行"的状态点
- 小型缩略条：最近 3 张产物

**动作：**
- 点击：进入 Space
- Hover：Rename / Duplicate / Export Space Zip / Delete

### 4.3 模板卡（Templates）

**目的**：把 Skills 变成"开箱即用工作流"，用户不需要理解节点。

**字段：**
- 模板名（如 "Poster Batch → Pick → Compose"）
- 适用场景标签（music festival / promo / tech）
- 预览图（该模板的默认画布布局截图）
- 默认输出（12 results / 1080×1920）

**动作：**
- Use Template（创建 Space）
- Preview Flow（只读预览画布）
- Duplicate Template（复制为我的模板）

**Skills 融入方式**：模板卡背后保存的是 Graph Snapshot + Skill Pack 版本锁定。

### 4.4 工具卡（Tools，用来拖到画布）

**目的**：像 Spaces 一样"拖一个工具进来就能用"，而不是去列表里点添加节点。

**例子：**
- Batch Generate（批量生成）
- Element Extract（提取元素）
- Compose & Harmonize（融合统一）
- Export（导出）
- Prompt Forge / Brief（可选：也可做成卡）

**交互：**
- 拖到画布：生成对应"节点卡"
- 拖到某张卡上：智能创建"连接"（例如把工具卡拖到 Results 卡上，就表示对结果集执行操作）

### 4.5 资产卡（Assets Drawer 内）

#### 4.5.1 Style 卡

**字段：**
- 代表图（作品集拼贴）
- 风格摘要（1 行）
- 禁用项 tag（最多 3 个，更多折叠）
- 版本号

**交互：**
- 拖到画布：创建一个 Style Reference 卡（引用 style_id）
- 拖到 Batch/Prompt/Compose 卡：自动填充 style_id
- 右键：新版本 / 编辑摘要 / 删除

#### 4.5.2 Inspiration（RefSet）卡

**字段：**
- 缩略图网格（4 宫格）
- 样例数量、去重数量
- 标签（来源/主题）

**交互：**
- 拖到画布：创建 RefSet Reference 卡
- 拖到 Batch/Prompt：自动填 refset_id
- 双击：打开"聚类选择面板"（在 Inspector）

#### 4.5.3 Element 卡

**字段：**
- 元素预览（mask/crop）
- 语义标签（background/text/deco…）
- 备注（喜欢原因，1 行）
- used_count

**交互：**
- 拖到 Artboard：放入画板
- 拖到 Compose 卡：加入 element_ids
- Hover：Pin / Delete / Export element png

### 4.6 节点卡 vs 结果卡（最容易做错的地方）

v1 强制分离节点卡和结果卡：

#### 4.6.1 节点卡（Node Card）

**用途**：表示"一个技能执行器"，负责输入参数与触发运行。

**字段（卡面必须可读，不显示 JSON）：**
- Inputs chips：style / brief / refset / element_ids（以 chip 显示）
- Output stub：12 results / 5 elements / 1 final
- 状态：Running/Success/Fail + 耗时
- 小按钮：Run / Re-run（可选，主 Run 在顶部也行）

**交互：**
- 点击：Inspector 展示详细参数（schema 表单）
- Lock：锁定该节点输出（下游重跑不影响上游）
- 失败态：显示错误摘要 + Retry

#### 4.6.2 结果集卡（Results Panel Card）

**用途**：这是 Spaces 的灵魂。Batch 的输出必须生成它，并自动摆在画布上。

**字段：**
- 标题：Results (12) + 尺寸
- 内部缩略图网格（3×4 或 4×3）
- 质量/风格强度等简短标签
- 选中计数（Selected 3）

**交互（关键）：**
- 单张点选：进入"选中状态"（可多选）
- 双击单张：放大预览（轻量查看）
- 拖拽单张缩略图出卡片：生成一个 Poster Card（单图卡）放到画布

**卡片级动作：**
- Extract Elements（对选中图批量提取）
- Generate Variations（对选中图做变体）
- Pin Selected（把选中图固定到画布）
- 右键：保存为 Gallery / 导出选中 / 查看 recipe

### 4.7 单图卡（Poster Card）

**字段：**
- 大缩略图
- 简短 info：seed / style / brief（折叠展示）
- 收藏星标

**交互：**
- "Extract"按钮：进入圈选模式（见下）
- 拖到 Extract Node：自动作为输入
- 右键：Copy / Export / View recipe

### 4.8 圈选提取：从"工具"变成"卡片内模式"

v1 交互要求：圈选必须发生在单图卡的放大视图里，不要另开复杂页面。

**流程：**
1. 双击 Poster Card → 打开 Lightbox（覆盖层）
2. Lightbox 顶部工具：矩形 / 套索 / 橡皮擦 / 取消 / 保存为元素
3. 保存后：
   - 自动生成 Element Card（放到画布旁边）
   - 同时入库到 Assets Drawer 的 Elements Tab
   - 可选：保存时填 semantic_tag + note（一个小弹层即可）

### 4.9 Artboard 卡（画板卡，承载"像设计软件一样摆放"）

**字段：**
- 画板尺寸（1080×1920）
- 内部是可缩略预览
- 元素数量（5 items）

**交互：**
- 双击进入 Artboard 编辑（单独视图或画布内放大）
- 拖元素进来：吸附网格、可调层级、对齐辅助线
- 顶部按钮：Harmonize（统一生成）、Export

> 这是与"纯生成器"拉开差距的唯一正道。否则用户只会把产品当批量出图网站。

### 4.10 Final 卡（终稿卡）

**字段：**
- 终稿大缩略图
- 使用了哪些元素（chips：E1/E2/E3）
- 状态（success）+ 版本号

**交互：**
- Export（PNG/PDF/资产包）
- Re-harmonize（用同 recipe 复跑）
- View recipe（展开配方摘要）

### 4.11 Recipe 小卡（Recipe Chip / Recipe Card）

v1 要求：每张 Poster/Final 都能"一键看到配方摘要"。

**展示：**
- style_id / brief_id / refset_id / seed / skill_versions
- Loaded context 等级（S/M/L）与估算 tokens（粗略即可）

**作用**：不是给用户学习 AI 的，是给排查"为什么这次跑偏"的。

---

## 5. 核心流程（Spaces 版）

1. 从 Templates 创建 Space（画布自动含默认节点卡 + Artboard）
2. 左侧 Assets Drawer 拖入 Style 卡与 RefSet 卡
3. 填 Brief（Brief 也可以是卡，或 Inspector 表单）
4. Run Batch → 画布生成 Results Card
5. 在 Results Card 选 2–4 张 → Extract → 得到 Element Cards
6. 拖 Element Cards 到 Artboard → 调整摆放
7. 点击 Harmonize → 生成 Final Card
8. Export Final

---

## 6. 数据与约束（v1）

- **Local-first**：SQLite + 本地 assets 目录
- **所有卡片都引用资产 ID**：
  - style_id / brief_id / refset_id / poster_id / element_id / final_id / recipe_id
- **节点运行按需加载**：默认只加载摘要 S（失败或高质量再升）
- **支持**：单节点重跑、输出锁定、结果卡/终稿卡可回放 recipe

---

## 7. 开发进度（按"先像 Spaces"排序）

### Milestone A：Space 化骨架（先把"像不像"解决）

- Projects → Spaces 首页（Recent + Templates）
- Space 画布占主屏，左右抽屉可收起
- Inspector 只有选中对象才出现

**验收**：打开 Space 不像在写表单，像在"摆东西"。

---

### Milestone B：卡片系统落地（把功能塞进卡片）

- Results Panel Card（Batch 输出必须生成它）
- Poster Card + Lightbox 圈选提取 → Element Card
- Assets Drawer 三类资产卡可拖拽上画布

**验收**：80% 操作在画布完成，不需要跳页面。

---

### Milestone C：Artboard 与 Final（从"出图"到"合成"）

- Artboard Card（可摆放、对齐、层级）
- Harmonize 输出 Final Card
- Export（终稿 + 资产包 + recipe.json）

**验收**：元素融合闭环跑通，并且"终稿在画布上"。

---

### Milestone D：Skills 隐形化（让保留内核但不烦用户）

- Templates & Tools：模板卡=Graph preset；工具卡=可拖拽节点类型
- Advanced 折叠：Skill pack 版本、schema、测试
- Recipe Chip（每张图可反查）

**验收**：用户不需要看"Skills 列表"也能用完整流程。

---

## 8. Spaces 模式核心原则（v1.3 新增）

### 8.1 画布最大化（Canvas Maximization）

**强制约束**：
- 画布占视觉权重 **80-90%**
- 左侧 Assets Drawer **默认收起**，展开后**覆盖画布**（不推挤）
- 右侧 Inspector **默认隐藏**，仅在点击卡片 Gear 时浮层显示
- **移除**常驻 Skills 列表 → 改为 `+ Add` 按钮或 `Cmd+K` 命令面板

### 8.2 卡片即工作台（Cards as Workstation）

卡片不是"占位符"，而是**完整的工作单元**。

**卡片通用结构**：

| 区域 | 内容 |
|------|------|
| **Header** | 图标 + 名称 + 状态 pill + Lock + ⋯ 菜单 |
| **Body** | 核心编辑区：文本输入 / 下拉选择 / 资源拖拽区（混排支持） |
| **Footer** | 快捷控制条：Model / Ratio / Resolution / Count / Gear / Play |
| **Results** | 内嵌结果展示：缩略图网格 / 成功文本 / 错误摘要 |

**80/20 原则**：
- **卡片内完成 80% 操作**（输入、选择、运行、查看结果）
- **Inspector 只放 20% 高级选项**（Schema 高级参数、版本信息、调试）

### 8.3 各类型卡片规范

#### Style Profile 卡
- **Body**：大拖拽区（Drop portfolio images）+ Tags chips + Banned tokens chips
- **Footer**：Analyze（运行）+ Gear
- **Results**：风格摘要 + Palette 色块 + "保存为 Style" 按钮

#### Brief 卡
- **Body**：标题/副标题/信息区（分段输入，可折叠）+ 尺寸 dropdown + 调性 slider
- **Footer**：保存（资产卡，无需 Run）
- **Inspector**：文案层级规则、禁用色、留白偏好、网格策略

#### RefSet（Inspiration Pool）卡
- **Body**：拖拽导入区 或 关键词输入
- **Footer**：Cluster / Dedup（运行）
- **Results**：4宫格预览 + 数量 + 簇筛选 chips + Pin/Save 按钮

#### Batch Generate 卡
- **Body**：Prompt 文本区（可引用 Brief）
- **Footer**：Model / Ratio / Resolution / Count / Gear / Play
- **Results**：缩略图网格（12/24）+ 多选支持 + Pin Selected / Extract / Variations

#### Element Extract 卡
- **输入方式 A**：从 Batch 选中图后点 Extract → 队列 thumbnails
- **输入方式 B**：拖入 Poster 卡 → 圈选模式（Lightbox）
- **Body**：选择方法（Rect/Lasso）+ Semantic tag chips
- **Results**：生成 Element Cards + 自动写入 Assets

#### Artboard / Compose 卡
- **双击进入画板编辑态**：拖元素、吸附网格、对齐线、层级调整
- **右上按钮**：Harmonize（统一生成）
- **Results**：Final 预览或生成 Final 卡

#### Export 卡
- **Body**：格式选择（PNG/PDF/资产包）
- **Footer**：Export 按钮
- **Results**：导出路径 + recipe.json 链接

### 8.4 Skills 隐形化原则

**用户玩卡片，系统玩技能包**：

- 每张卡背后绑定 `skill_id@version`
- 卡内表单由 `io_schema` 渲染
- Gear 打开该 skill 的 advanced 参数
- 每次运行写 Recipe（style/brief/refset/seed/version）
- 卡片 ⋯ 菜单可查看 Recipe

### 8.5 Run 层级规范

| 入口 | 作用域 |
|------|--------|
| **卡片内 Play** | 运行当前卡片（就地运行） |
| **全局 Run** | 运行整条流程 或 选区 |
| **移除**：画布浮动 Run、Node 右下 Re-run | 减少混乱 |

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.2 | - | 原始版本：Skill Graph + Canvas 模式 |
| v1.3 | 2024-12 | **重大变更**：Spaces 模式 + 卡片系统重构 |
