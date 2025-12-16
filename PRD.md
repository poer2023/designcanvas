# 海报灵感工厂 PosterLab（个人版）PRD v1.2

**形态**：本地优先（Local-first）工具  
**核心**：React Flow 的 Skill Graph + nano banana 生成 + 元素级挑选融合 + Recipe 可回放 + 按需加载省 token

---

## 1. 范围定义

### 1.1 必做（v1）

- **Skill Graph**：节点编排、参数配置、运行、单节点重跑、输出锁定
- **Style Profile**：上传作品集→风格摘要→禁用项→版本
- **Poster Brief**：结构化简报（尺寸/文案/调性/颜色/禁用项）
- **Inspiration Pool**：样例池（导入/抓取接口占位）+ 聚类/去重 + 选入 refset
- **Batch Generate**：批量生成候选海报（12/24）
- **Element Extract**：圈选提取元素（基础抠图/裁切+mask）+ 元素库
- **Compose & Harmonize**：从多元素拼贴→统一生成终稿→轻量微调
- **Export**：PNG/JPG/PDF + 资产包 + recipe.json
- **Recipe**：全链路可追溯、可回放（节点输入/输出/skill版本/seed/引用资产）

### 1.2 不做（明确砍）

- 账号体系/多用户/团队协作/权限
- 真实可编辑文字对象（AI 生成里的字当"图"处理，最多做到文字区域 mask + 局部重绘）
- PSD/AI 原生分层（先导出"资产包"）
- 公共技能市场（先做"个人技能库 + 可复制版本"）

---

## 2. 核心概念

| 概念 | 说明 |
|------|------|
| **Skill（技能）** | 一个可复用任务模块（规则/模板/资源/Schema/版本/测试用例） |
| **Skill Pack** | Skill 的落地包（manifest + 模板 + 资源 + 运行策略） |
| **Skill Graph** | 用户用 React Flow 连接的技能执行图 |
| **Profile（资产化上下文）** | Style / Brief / RefSet / Elements 等，统一用 ID 引用 |
| **Recipe（配方）** | 一次生成的完整可回放记录（最重要的"产品记忆"） |
| **按需加载** | 节点运行只加载"该节点 skill + 必要 profile 摘要（S/M/L）"，默认 S |

---

## 3. 信息架构（页面）

### Projects
- 项目列表：封面（最近终稿）、最后更新时间、绑定 style_profile
- 新建项目：选择 Style + 创建 Brief（或导入现成）

### Canvas（核心）
- 左：React Flow Graph（节点、连线、状态）
- 右：节点参数面板 + 运行日志 + 节点产物预览（Tab）
- 顶栏：Run / Stop / Re-run Node / Lock Output / Export / Token Budget 指示

### Style Profiles
- 上传作品集、自动摘要、禁用项、版本管理
- 预览：代表图 + 调色板提示 + 风格关键词

### Inspiration Pools
- 样例导入（文件夹/URL 列表/手动上传）
- 聚类视图、去重、来源与标注（个人版也建议留字段，免得未来升级痛苦）
- 一键加入项目 refset

### Gallery
- 候选海报瀑布流
- 单张详情：Recipe、参考样例、提取元素入口、收藏/淘汰

### Elements
- 元素库：筛选（语义标签/来源项目/使用次数）
- 元素卡：mask 预览、备注、来源海报、导出单元素

### Export
- 终稿导出：PNG/JPG/PDF + 资产包 + recipe.json

### Skill Library
- 内置 Skills（可复制为"我的版本"）
- 我的 Skills：版本、Schema、测试用例、依赖

### Settings（个人版）
- 模型 API key / 额度提示
- 默认输出尺寸、默认批量张数、缓存策略
- 存储路径、清理缓存

---

## 4. 主流程（用户视角）

1. 选择/创建 Style Profile
2. 填 Poster Brief
3. 生成/选择 Inspiration Pool（refset）
4. 批量生成候选海报（12/24）
5. 在候选中圈选喜欢元素，存入 Elements
6. 选若干元素融合，统一生成终稿
7. 导出交付（图片/PDF/资产包/配方）

---

## 5. Skills 规范（产品硬约束）

### 5.1 Skill Pack 必备结构

| 字段 | 说明 |
|------|------|
| `meta` | name, version, description, tags |
| `io_schema` | input/output JSON Schema（强制） |
| `prompt_templates` | 短模板（禁止在 UI 里塞巨长提示词） |
| `resources` | 规则字典（版式 token/禁用 token/反例） |
| `runtime_policy` | 默认摘要级别（S/M/L）与升级条件 |
| `tests` | 至少 3 条回放用例（brief + 预期指标范围） |

### 5.2 运行时按需加载规则

- 所有上下文必须资产化：`style_id` / `brief_id` / `refset_id` / `element_ids` / `recipe_id`
- 节点执行输入只包含：
  - params + 引用 ID + 对应的摘要（默认 S）
  - 连续失败/用户切高质量才加载 M/L

---

## 6. 节点（Skills）详细需求（MVP）

### 6.1 Style Profiler

- **输入**：作品集图片（10–50）、标签、禁用项
- **输出**：`style_id`、`summary_S/M/L`、`constraints`、`banned_tokens`、`palette_hint`
- **交互**：摘要可编辑保存为新版本；版本可回滚

### 6.2 Poster Brief

- **输入**：尺寸、主/副标题、信息区、品牌色/禁用色、调性权重、禁用元素
- **输出**：`brief_id`（JSON）
- **交互**：Brief Card 固定展示在项目顶部，可一键复制创建新简报

### 6.3 Inspiration Pool

- **输入**：`style_id`（可选）、关键词、多样性参数、导入源（文件夹/上传/URL列表）
- **输出**：`refset_id` + clusters + 去重映射
- **交互**：聚类墙：保留/剔除；加入项目 refset

> **个人版建议**：v1 先把"导入+聚类"做扎实，网络抓取做成可插拔 connector，别让产品死在爬虫细节里。

### 6.4 Prompt Forge

- **输入**：`brief_id`、`style_id`、`refset_id`、`layout_strategy`、`strength/diversity`
- **输出**：`prompts[]`（每条含 seed、变体参数）
- **交互**：只展示"提示词摘要 + 参数"，全文默认隐藏

### 6.5 Batch Generate（nano banana）

- **输入**：`prompts[]`、N（12/24）、尺寸、质量档
- **输出**：`posters[]`（`poster_id`、`image_url`、`recipe_id`、`seed`）
- **交互**：瀑布流；收藏/淘汰；加入"提取队列"

### 6.6 Element Extract

- **输入**：`poster_id` + 用户圈选（矩形/套索）+ 语义标签（可选）
- **输出**：`elements[]`（`element_id`、`mask_url`、`bbox`、`tag`、`note`）
- **交互**：
  - 圈选后弹"元素卡编辑"：标签、备注（喜欢原因）
  - 元素入库可跨项目复用
- **抠图难度分级**：
  - v1：裁切 + 用户套索 mask（前端 canvas 生成 alpha）
  - v1.1：可选"自动抠图"插件位（后续接分割模型）

### 6.7 Compose & Harmonize

- **输入**：`element_ids`（>=2）、`brief_id`、`unify_policy`（tone/palette/grain）
- **输出**：`final_id`、`image_url`、`recipe_id`、`optional masks`（背景/文字区）
- **交互**：
  - 先生成"拼贴草稿"（可拖拽层级/缩放/对齐网格）
  - 再"一键统一生成"（默认开启）
  - 三个微调按钮：提升可读性 / 加留白 / 换配色（局部重绘）

### 6.8 Export

- **输入**：`final_id`、格式、是否导出资产包
- **输出**：download bundle（图/PDF/资产包/recipe.json）
- **交互**：导出页展示"尺寸/版本/配方摘要/引用元素列表"

---

## 7. 数据模型（核心）

```typescript
StyleProfile(style_id, versions[], summary_S/M/L, banned_tokens, palette_hint)

Brief(brief_id, size, text_blocks, palette, banned, layout_strategy)

RefSet(refset_id, items[], clusters, dedupe_map)

Poster(poster_id, image_url, recipe_id, created_at, tags)

Element(element_id, poster_id, mask_url, bbox, semantic_tag, note, used_count)

Final(final_id, image_url, recipe_id, masks?)

Recipe(recipe_id, graph_snapshot, node_runs[], seeds, skill_versions, asset_refs, created_at)
```

---

## 8. 非功能需求

- **本地优先**：SQLite + 本地文件目录存资产
- **性能**：Gallery 瀑布流虚拟滚动；缓存可清理
- **可追溯**：任何图片都能反查 recipe 与引用资产
- **稳定**：节点运行可中断；失败可重试；上游输出可锁定
- **可迁移**：项目一键导出为 zip（含 DB dump + assets + recipes）

---

## 开发进度切分（里程碑式）

> 每个里程碑都按"可交付闭环"切，做完一个就能真实用一点点，而不是永远在搭脚手架。

### M0 基础工程与本地存储

**交付物**
- 项目骨架：前端（React/Next）+ 本地 API（FastAPI/Node 任一）+ 资源目录规划
- SQLite schema（Projects/Profiles/Recipes/Artifacts）
- 资产存储与引用规范（assets/xxx，DB 存路径与元数据）

**验收标准**
- 能新建项目、保存/读取 Project 元数据
- 能写入并读取一个"假 Poster"记录（用于后续串联）

**依赖**：无

---

### M1 Skill Graph 编辑器（React Flow）+ 运行框架

**交付物**
- Graph 编辑（新增/删除/连线/拖拽）
- 节点参数面板（基于 JSON Schema 渲染）
- 运行引擎 v0：按拓扑顺序执行节点（先用 mock 节点）

**验收标准**
- 一张默认 Graph 可运行，节点状态：idle/running/success/fail
- 支持单节点重跑、停止运行

**依赖**：M0

---

### M2 Skill Library（技能包）与按需加载机制

**交付物**
- Skill Pack manifest 读取与版本管理（本地目录）
- 运行时装配器：只加载当前 skill + 引用 profile 摘要（S）
- 运行日志：记录 Loaded Assets 清单 + 参数快照

**验收标准**
- 节点运行日志能看到"加载了哪些摘要/资源"
- 同一 Graph 不同 skill 版本可切换运行（记录进 recipe）

**依赖**：M1

---

### M3 Style Profile + Brief（上下文资产化闭环）

**交付物**
- Style Profiles 页：作品集上传、生成摘要（先用规则/LLM 占位）、版本保存
- Brief 表单与 Brief Card（JSON 存储）
- Profile 引用机制：graph 节点用 `style_id`/`brief_id`

**验收标准**
- Style/Brief 能被节点读取并在运行日志里体现
- 修改 Style 版本后可重跑下游节点（上游可锁定）

**依赖**：M2

---

### M4 Inspiration Pool（导入 + 聚类 + refset）

**交付物**
- 样例导入：文件夹/上传（至少一种）
- 去重（hash/感知hash任一）+ 聚类（embedding 或简化版）
- `refset_id` 可被 Prompt Forge 引用

**验收标准**
- 样例池能稳定产出 refset（可选/可删簇）
- refset 能被后续节点读取（哪怕先只传 topK）

**依赖**：M3

---

### M5 Batch Generate（接入 nano banana）+ Gallery

**交付物**
- Prompt Forge v1（参数 + 摘要输出 + seeds）
- Batch Generate 调用 nano banana（批量）
- Gallery 瀑布流 + 单张详情（recipe/refs/seed）

**验收标准**
- 从 Brief + Style + RefSet 一键生成 12 张候选
- 每张候选都能反查 recipe.json（至少包含节点输入/输出摘要）

**依赖**：M4

---

### M6 Element Extract（圈选）+ Elements 库

**交付物**
- Gallery 单张圈选：矩形 + 套索（canvas 生成 mask）
- Element 资产落盘（mask + crop + 元数据）
- Elements 库：筛选/查看/备注/删除

**验收标准**
- 用户能从候选里提取至少 3 个元素并在元素库复用
- `element_id` 可被 Compose 节点引用

**依赖**：M5

---

### M7 Compose & Harmonize（融合终稿）+ Export

**交付物**
- 拼贴草稿画布（拖拽/缩放/层级/对齐网格）
- Harmonize：统一生成终稿（nano banana 二次生成）
- Export：PNG/JPG/PDF + 资产包 + recipe.json

**验收标准**
- 选 2+ 元素 + brief 能生成终稿并导出
- 导出包包含：终稿 + 元素清单 + recipe.json

**依赖**：M6

---

### M8 稳定性与"像工具"的细节

**交付物**
- 缓存管理（按项目清理）
- Recipe 回放（至少能"复跑同配方"）
- 指标与排序（可读性/一致性/多样性至少一种可用）
- 错误恢复：失败提示、重试、锁定输出逻辑完善

**验收标准**
- 连续跑 10 次流程不崩、可定位问题、可回滚
- 用户能把"一个项目"完整从创建做到导出，不需要你在旁边当客服

**依赖**：M7
