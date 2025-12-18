# PosterLab PRD v2.0
> 主题：画布可持久化 + 模板导入导出 + Typed Ports 落地 + 最小可用 DAG Runner + 节点内结果墙

- 版本：v2.0
- 日期：2025-12-18
- 目标读者：产品 / 设计 / 前后端
- 依赖前置：PRD v1.8（Canvas/Card/Group/Snapshot/Recipe 体系雏形）、PRD v1.9（模型中心化 + 图片生成 Job）

---

## 0. 一句话概括

让 Space（画布）从“临时编辑器”升级为“可保存/可复用模板/可运行可回放”的工作台：  
**图（nodes/edges/viewport）可持久化**、**模板可导入导出**、**端口语义一致**、**最小 DAG 跑通（Run node / from here / all）**、**ImageGen 有可用的结果墙动作（预览/下载/Pin/替换/重置）**。

---

## 1. 目标（Goals）

### 1.1 必达（P0）

1. **Space 保存/加载**：任意编辑（节点/连线/组/尺寸/位置/viewport）可持久化，重新打开 Space 可恢复。
2. **模板导入/导出**：支持导出为 JSON（可分享），并能导入到新 Space 或插入到当前画布（用于“截图模板复刻”）。
3. **Typed Ports 真正落地**：端口 ID 与 type system 对齐；连线能被可靠解析为“某节点的某端口 → 某节点的某端口”。
4. **Runner 最小闭环**：支持 `run node` / `run from here` / `run all`（至少在 Run Group 作用域内），并与 v1.9 图片生成 job 打通。
5. **结果墙最小动作**：ImageGen 节点支持预览/下载/Pin（决定 ImageOut）/替换到 ImageCard/重置。

### 1.2 体验增强（P1）

1. `dirtyOnly`（只跑 stale）策略与 UI 提示。
2. Undo/Redo（画布级）+ 顶栏 Export（接线、非占位）。
3. 资产（Assets）从 dataURL 迁移到 asset_id 引用（更利于模板分享/缓存/体积控制）。

### 1.3 后置（P2）

1. input-hash 缓存（跨次运行复用）与全局去重策略。
2. 通用 Job 队列/取消/并发控制（超出图片生成 job 的统一调度）。
3. VideoGen 节点类型（等基础设施稳定后）。

---

## 2. 非目标（Non-goals）

- 多人协作、实时同步、权限系统
- 高级视频生成/剪辑链路
- 复杂元素 mask 编辑器（仍可 stub）
- “全局自动级联跑 DAG”（默认仍不自动跑；由 Run Group/Run 操作触发）

---

## 3. 术语表（Glossary）

- **Space**：一个工作空间/画布，对应 DB 的 `projects`。
- **GraphSnapshot**：React Flow 的 nodes/edges + viewport 的序列化快照（用于保存/模板/Recipe）。
- **Template**：可复用的图快照（可作为新 Space 起点，或插入到现有画布）。
- **Port / Typed Ports**：节点的输入/输出口（带类型），连线必须绑定端口 ID。
- **Snapshot（输出快照）**：节点运行/编辑产生的不可变输出，带版本号（用于 stale 判定与运行输入）。
- **Recipe**：一次运行的可回放记录（graph_snapshot + node_runs + asset_refs 等）。
- **Job**：图片生成的异步任务（v1.9 generation_jobs）。
- **Result Wall**：节点内部展示多结果并提供管理动作的区域。

---

## 4. 当前现状与缺口（基线）

> 本 PRD 以“当前代码已有：画布/卡片 UI + 连接 + 部分 Snapshot/Recipe + 图片生成 job API”为前提。

主要缺口：

1. **节点内部状态未回写到 node.data**（导致保存/模板/复制后丢内容）。
2. **Handle id 与 ports registry 不一致**（导致 typed ports 形同虚设）。
3. **没有 Graph 的持久化 API/表**（GraphStore 只在内存）。
4. **Runner 未接入**（GroupFrame 的 Run 是占位延时；executor 是 mock 且未被调用）。
5. **结果墙缺动作**（仅展示，不可管理）。
6. **模板只是 UI 占位**（graph_snapshot 为空，未插入画布）。

---

## 5. 产品形态与用户流程（UX）

### 5.1 Space 打开/保存/加载

**打开 Space**

1. 进入 `/projects/{id}`：
   - 拉取 `GET /api/projects/{id}/graph`（若无则返回空图+默认 viewport）。
   - 渲染 nodes/edges，恢复 viewport（center/zoom）。
2. 顶栏显示保存状态：
   - `Saved` / `Saving…` / `Offline` / `Conflict`（冲突仅在版本不一致时出现）。

**保存策略（P0）**

- 自动保存：nodes/edges/viewport 任一变动触发 debounce（例如 800ms）后保存。
- 手动保存（可选）：在顶栏提供 Save（优先做自动保存即可）。

**冲突策略（P0）**

- 采用 `base_version` 乐观锁：客户端携带上次拿到的 version；后端版本不一致则返回 409。
- 冲突 UI：提示“此 Space 在别处更新过”，提供：
  - `Reload`（丢弃本地未保存的更改）
  - `Force Save`（覆盖，仍是单机单用户场景下的兜底）

### 5.2 模板导入/导出

**导出（P0）**

- 从 Space 顶栏 `Export Template`：
  - 选择：`Whole Canvas` / `Selection Only`
  - 选择：`Include Viewport`（默认勾选）
  - 输出：下载一个 `template.json`

**导入到新 Space（P0）**

- Spaces 首页：点击某模板 → `Create Space from Template`
- 流程：创建 Project → 写入 graph_snapshot → 跳转到该 Space

**导入到当前 Space（P0）**

- Space 顶栏 `Import Template`：
  - 选择本地 `template.json`
  - 导入后：
    - 节点 ID 全部 remap（防冲突）
    - 插入位置：以当前 viewport center 为锚点偏移（保持相对布局）
    - 组/父子关系保持
    - 自动选中导入的节点集合（方便移动/删除）

### 5.3 运行（Runner）

**入口（P0）**

- Run Group（groupType=runGroup）头部按钮：
  - `Run All`
  - `Run Dirty Only`（P1）
  - `Run From Here…`（P0：从选中节点开始，跑下游）
- 单节点上下文菜单（或节点 header）：
  - `Run Node`
  - `Run From Here`

**Run From Here 的语义（P0）**

- 从选中节点开始，执行其**下游所有可达节点**（在当前 scope 内），按拓扑序。
- 说明：此语义更适合“上游改了，我想从中间重新跑到终点”。

**运行时反馈（P0）**

- 节点状态：`idle/running/success/fail/blocked`
- 运行日志（可选 P1）：轻量 toast 或右下角 log 面板
- 运行结束后自动写 Recipe（P0）

### 5.4 结果墙（ImageGen）

**在 ImageGen（ImageStudio / imageCard studio）中**

结果项提供动作（P0）：

- `Preview`：全屏/弹层查看（Lightbox）
- `Download`：下载原图（或最高分辨率 URL）
- `Pin as Output`：将该结果设为 `imageOut` 的 pinned 输出
- `Replace`：替换某个目标 ImageCard（raw）的内容（先做：替换当前选中的 raw ImageCard；或弹出选择）
- `Reset`：清空结果、清空 pinned、回到 empty/draft 状态

---

## 6. 对象模型（Data Model）

### 6.1 GraphSnapshot（P0）

GraphSnapshot = `nodes[] + edges[] + viewport`

- nodes：必须包含能恢复 UI 的最小字段：
  - `id, type, position, parentId?, style?(width/height), data`
- edges：
  - `id, source, target, sourceHandle, targetHandle, data?(valid/sourceType/targetType)`
- viewport：
  - `{ x, y, zoom }`

并额外增加 meta（用于模板与迁移）：

```json
{
  "meta": {
    "schema_version": "2.0",
    "app": "PosterLab",
    "exported_at": "2025-12-18T00:00:00Z"
  },
  "graph": {
    "nodes": [],
    "edges": [],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
}
```

### 6.2 节点 data 的“权威字段”（P0）

> 所有可持久化/可模板化/可复制的状态必须存在于 `node.data`（或 store 中可序列化字段），组件内部 `useState` 只能是 UI 镜像。

#### A) TextCard（notes/brief）

- `role: "notes" | "brief"`
- `content`（notes）
- `brief`: `{ title, subtitle, info, size, tone, constraints[] }`（brief）
- 输出快照：
  - `briefOut`（由 brief 编译生成；可自动生成或点击 Save）

#### B) ImageCard（mode=raw）

- `mode: "raw"`
- `asset_id`（推荐 P1）或 `imageUrl`（P0 可先用 dataURL）
- `caption?, source?, filename?, created_at?, sha256?`
- `favorite?, locked?`
- 输出快照：
  - `imageOut`

#### C) ImageGen（ImageStudio / imageCard studio）

- `mode: "studio"`（若使用 imageCard 统一）
- `prompt, negative?`
- `model_id_override?`（可空，走 effective model）
- `ratio, resolution, count, seed?, cfg?, steps?, styleStrength?, img2imgStrength?`
- `results[]`: `{ id, asset_id?, url, seed?, created_at?, job_id? }`
- `pinned_result_id?`
- `run_status: idle|running|done|error`, `error?`, `last_job_id?`
- 输出快照：
  - `imageOut`（pinned 或默认第一张）
  - `contextOut`（prompt+params+seed+model 等）

#### D) GroupFrame（Portfolio/RefSet/Run Group/Elements/Blank）

- `groupType: "style" | "refset" | "runGroup" | "elements" | "blank" | "candidates"`
- `label?`
- `magnetic?`, `autoRun?`
- `runMode?`（runGroup 用）
- 输出快照（按 groupType）：
  - style → `styleToken`
  - refset → `refsetToken`
  - candidates → `candidatesToken`
  - elements → `elementsToken`

---

## 7. Typed Ports 规范（P0）

### 7.1 端口 ID 必须与 Handle id 一致

> 连线必须携带 `sourceHandle/targetHandle`，且在 UI 中的 `<Handle id="...">` 与 ports registry 一一对应。

### 7.2 端口表（建议最小集）

| Node | Direction | Handle id | PortType | 说明 |
|------|-----------|-----------|----------|------|
| TextCard | out | `briefOut` | `brief` | brief 编译输出 |
| ImageCard(raw) | out | `imageOut` | `image` | 图片引用输出 |
| ImageGen | in | `briefIn` | `brief` | brief 输入 |
| ImageGen | in | `styleIn` | `style` | style token 输入 |
| ImageGen | in | `refsetIn` | `refset` | refset token 输入 |
| ImageGen | in | `imageIn` | `image` | img2img 输入（可选） |
| ImageGen | out | `imageOut` | `image` | pinned image 输出 |
| ImageGen | out | `contextOut` | `context` | prompt/params 输出 |
| GroupFrame | out | `styleToken` | `style` | 当 groupType=style |
| GroupFrame | out | `refsetToken` | `refset` | 当 groupType=refset |
| GroupFrame | out | `candidatesToken` | `candidates` | 当 groupType=candidates |
| GroupFrame | out | `elementsToken` | `elements` | 当 groupType=elements |
| GroupFrame | in | `anyIn` | `any` | 外部输入（可多连） |

### 7.3 连线校验（P0）

- 默认策略：**不兼容则禁止连接**（并提示原因）。
- 例外：`any` 可与任意互连。
- 边上可保存 `data.valid` 与 `data.sourceType/targetType` 供 UI 渲染（可选）。

---

## 8. Snapshot（输出快照）与 Stale（P0）

### 8.1 Snapshot 基本行为

- 节点产生输出时：`createSnapshot(producerId, portKey, payload)`，版本 +1。
- 节点消耗输入并运行成功后：对其订阅的每个输入调用 `markConsumed`。

### 8.2 Edge → Subscription 规则（P0）

当创建一条边：

- producer = edge.source
- portKey = edge.sourceHandle（必须映射到 Output PortKey，如 `briefOut/imageOut/styleToken/...`）
- subscriber = edge.target
- 订阅记录应可追踪与删除（建议把 `subscription_id` 记在 edge.data 中，或用 (subscriber,producer,portKey) 反查）。

当删除一条边：解除订阅。

### 8.3 Stale 判定（P0）

- `blocked`：某个“已连接的必需输入端口”没有 snapshot
- `stale`：任意订阅 snapshot.version > consumed_version
- `fresh`：全部已消费到最新版本

**必需输入端口的定义（P0）**

- “是否必需”由连接决定：某输入 Handle 若存在连接，则该端口视为必需；未连接则不阻塞运行。

---

## 9. Runner（P0）

### 9.1 三个操作

1. `Run Node`：只运行当前节点（不自动跑上游）。
2. `Run From Here`：运行当前节点 + 下游可达节点（在 scope 内）。
3. `Run All`：运行 scope 内所有可执行节点（拓扑序）。

### 9.2 Scope（作用域）

优先定义在 Run Group 内（groupType=runGroup）：

- scopeNodes：parentId == runGroup.id 的节点集合
- scopeEdges：source/target 均在 scopeNodes 内的 edges
- 允许读取外部输入：若某 scopeNode 有来自外部节点的边，作为输入读取（但外部节点不在本次运行中被执行）

### 9.3 执行顺序（P0）

- 对 scopeNodes 做拓扑排序（仅考虑 scopeEdges）。
- locked 节点：
  - 若有已存在输出快照：可跳过执行（视为“固定输入”）
  - 若无输出：仍可能 blocked

### 9.4 节点执行适配（P0）

- TextCard(brief)：生成 `briefOut` snapshot（payload 为结构化 brief + compiled prompt fields）。
- ImageCard(raw)：生成 `imageOut` snapshot（payload 为 asset ref / url）。
- ImageGen：
  - 计算 effective model（沿用 v1.9 的 defaults/override 规则）
  - 触发 `POST /api/generate/image` → 得到 job_id
  - 轮询 `GET /api/jobs/{job_id}` 直到 done/error
  - done：写 results、生成 `imageOut/contextOut` snapshot
- GroupFrame(style/refset/…）：
  - P0：允许 stub（例如 token 只包含 `image_asset_ids` / `image_urls` 列表与基础元数据）
  - 输出到对应 token port

### 9.5 Recipe（P0）

每次“Run All / Run From Here / Run Node”产生 1 条 Recipe：

- `graph_snapshot`：保存当次运行的 graph（nodes/edges/viewport）
- `node_runs[]`：按执行顺序记录：
  - inputs：引用的 snapshot_id / version / producer_id / portKey
  - outputs：产出的 snapshot_id 列表
  - job_id（若有）
  - status/duration/error
- `asset_refs`：本次运行涉及的 asset_id（若 P1 上 asset 化）

---

## 10. 缓存（P2，先定义接口）

### 10.1 input_hash 定义

`input_hash = hash(stable_json({ node_type, node_params, effective_model_id, upstream_snapshot_ids+versions }))`

- stable_json 要求字段顺序稳定（避免 hash 抖动）。
- 对 ImageGen：prompt/negative/ratio/resolution/count/seed + 上游 token/image 输入都应纳入。

### 10.2 命中策略

- `Run Dirty Only`：只执行 stale/blocked（P1）
- `Cache Hit`：若命中 cache 且用户未强制重跑 → 直接复用 outputs 并 markConsumed

---

## 11. 服务端持久化（API + DB）

### 11.1 Graph 持久化 API（P0）

#### `GET /api/projects/{id}/graph`

Response:

```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "version": 12,
    "schema_version": "2.0",
    "graph_snapshot": { "nodes": [], "edges": [] },
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "updated_at": "2025-12-18T00:00:00Z"
  }
}
```

#### `PUT /api/projects/{id}/graph`

Request:

```json
{
  "base_version": 12,
  "schema_version": "2.0",
  "graph_snapshot": { "nodes": [], "edges": [] },
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

- 成功：version +1
- 冲突：409 + 返回 server_version

### 11.2 DB 表建议（P0）

新增表 `project_graphs`（或等价结构）：

- `project_id TEXT PRIMARY KEY`
- `schema_version TEXT NOT NULL`
- `graph_snapshot_json TEXT NOT NULL`
- `viewport_json TEXT NOT NULL`
- `version INTEGER NOT NULL DEFAULT 1`
- `updated_at TEXT NOT NULL`

（如不想建新表，也可加到 `projects`，但会让 projects 变重；推荐单独表。）

### 11.3 Template API（P0/P1）

两条路径任选其一：

**路径 A（P0 最快）：纯前端 JSON 文件导入导出**

- 不需要 DB 表与 API（但无法做“模板库”）。

**路径 B（P1）：内置模板库（DB + API）**

- `GET /api/templates`
- `POST /api/templates`（保存当前图为模板）
- `GET /api/templates/{id}`
- `PUT /api/templates/{id}`
- `DELETE /api/templates/{id}`

DB 表 `templates`：

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `description TEXT`
- `tags TEXT`（json array）
- `schema_version TEXT NOT NULL`
- `graph_snapshot_json TEXT NOT NULL`
- `viewport_json TEXT`
- `preview_image_asset_id TEXT`（可选）
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

---

## 12. 验收标准（Acceptance Criteria）

### 12.1 P0 验收

1. 新建 Space → 添加 Text/Image/ImageGen/Group/连线 → 退出 → 再进入：布局与内容完全恢复。
2. Space 任意改动后，自动保存状态在 2 秒内从 `Saving…` → `Saved`（无报错）。
3. 导出 `template.json` 后导入到新 Space：节点数量/边数量/相对布局一致，Group 关系一致。
4. 任意一条边都能明确解析出 sourceHandle/targetHandle（非空），且连接校验生效（错误连接不可建立或明确标红）。
5. Run Group 内点击 `Run All`：ImageGen 能触发 job、拿到结果，并把下游节点 stale 状态正确更新。
6. ImageGen 结果墙：至少支持 Preview/Download/Pin/Reset；Pin 后 `imageOut` 变化能让下游变 stale。
7. 每次 Run 都能写入一条 Recipe（可在 `/api/recipes` 查到），包含 graph_snapshot 与 node_runs 基本字段。

### 12.2 P1 验收

1. `dirtyOnly`：只执行 stale 节点，fresh 节点不重跑。
2. Undo/Redo 能覆盖：移动节点、添加/删除边、创建/调整 Group（最小集）。
3. 资产从 dataURL 转为 asset_id 后，模板 JSON 体积可控（不随图片像素爆炸）。

---

## 13. 里程碑建议（Milestones）

### Milestone A（P0-1~P0-2）：图可持久化

- 节点数据回写到 node.data（关键字段齐）
- 新增 project_graphs 表 + graph API
- Space 页面接入 load + autosave

### Milestone B（P0-3）：模板 JSON

- 导出/导入 JSON（whole/selection）
- ID remap + 插入定位 + 组选中

### Milestone C（P0-4）：Runner 打通

- Edge→Subscription 接线 + stale 生效
- Run Group 实现 `run all / run from here / run node`
- ImageGen 调用 `/api/generate/image` + job 轮询 + snapshots + recipe

### Milestone D（P0-5）：结果墙动作

- Preview/Download/Pin/Replace/Reset（最小）

---

## 14. 开放问题（Open Questions）

1. `Run From Here` 是否需要一个“向上补跑”的变体（例如 `Run To Here`）？
2. 模板导出是否需要“连同 assets 一起打包”（zip）？还是先只支持引用（asset_id）？
3. GroupFrame 的 style/refset token 在 P0 是否允许完全 stub？（建议允许，先跑通链路）
4. 是否需要为 Graph 保存引入 ETag/If-Match？还是 `base_version` 足够？

