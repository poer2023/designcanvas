# PosterLab PRD v1.9

## 主题：模型配置中心化 + 画布全局一致选型 + 真实图片生成接入

## 1. 背景与目标

### 1.1 背景

v1.8 你已经完成：

* Canvas / Card / Group / Run Group 运行体系
* Typed Ports、Snapshot、Recipe
* Image Studio 卡（参数 UI）与输入对象化（贴图自动成 raw image card）

### 1.2 v1.9 目标

1. **Settings 中集中配置所有模型**（按 Provider 管理 API Key、按 Model 启用/禁用、设置默认模型和默认参数）。
2. **画布任意位置选择模型时，只展示"已启用模型"**。
3. 接入真实图片生成 API（text2img / img2img 基础能力），并融入现有 Run/Recipe/Snapshot 体系。
4. 支持"默认值层级"：全局默认 → Space/Group 可选默认 → Card 覆写，且可解释可回放。

---

## 2. 范围

### 2.1 做

* Provider（供应商）配置：API Key、Base URL（可选）、超时、并发、测试连通
* Model Registry：模型列表、启用开关、展示名、能力标注、默认参数、隐藏/排序
* Image Studio 真实生成：单卡 Run 调用后端生成，落地 outputs（ImageOut/CandidatesOut/ContextOut）
* Run Group 串联运行：卡片按顺序运行，模型选择遵循统一的"Effective Model 解析规则"
* 错误与禁用策略：模型被禁用/Key 失效时的表现与不破坏旧 Recipe

### 2.2 不做

* 多用户/团队权限
* 成本计费系统（可以记录"粗略估算"，不做扣费）
* 高级 inpaint/mask 编辑器（后置）
* 模型市场/在线拉取（v1.9 模型定义由你配置）

---

## 3. 核心原则

1. **所有模型都在 Settings 配置**；画布里不允许"输入一个 modelId 文本框"这种原始时代交互。
2. **未启用模型在所有 Model Picker 中不出现**（新选择不可用）。
3. **可回放优先**：旧卡/旧 recipe 即便用的是后来禁用的模型，也必须能"解释并保留引用"，但不能被新选择器选中。
4. **选择器一致**：卡、组、模板的模型选择 UI 使用同一组件/同一数据源（enabled models）。

---

## 4. Settings 设计（前台）

### 4.1 Settings 页面结构

#### A. Providers（供应商）

每个 Provider 一张卡片：

* Provider 名称（NanoBanana / OpenAI / Replicate / 自定义 HTTP…）
* API Key（密文保存，前端只显示 "已设置/未设置"）
* Base URL（可选）
* Timeout / Max Concurrency（可选）
* `Test Connection`（按钮）
* 状态：OK / Missing Key / Invalid Key / Rate Limited（最近一次）

#### B. Models（模型）

模型列表（表格或卡片均可）字段：

* Enable toggle（开/关）
* Display Name（可编辑）
* Provider（只读）
* Model ID（只读）
* Capabilities（标签）：text2img / img2img / vision（可选）
* Default Params（点击展开编辑）
* Priority/Sort（影响下拉排序）
* Hide from quick list（可选，仅在搜索里出现）

> 关键：**启用开关决定所有 Picker 是否出现**。

#### C. Defaults（默认策略）

* Default model for **Text-to-Image**
* Default model for **Image-to-Image**（可选）
* Default generation presets（如：Fast / Standard / High）
* 默认输出数量、默认 ratio、默认 resolution（仅作为 UI 初值）

---

## 5. 模型选择与使用（画布"所有位置"统一规则）

### 5.1 模型选择的层级（Effective Model 解析）

当某个运行需要 model 时，按以下优先级取值：

1. **Card Override（卡片覆写）**：Image Studio 卡 Quick Bar 中选择的 model
2. **Group Default（组默认）**：如果该卡属于某个 Group 且 Group 配了 default model
3. **Space Default（空间默认，可选 v1.9 做不做都行）**：Space 级默认
4. **Global Default（全局默认）**：Settings → Defaults
5. 如果仍为空：Blocked，提示用户去 Settings 启用模型并设置默认

> 解析出来的模型称为 `effective_model_id`，必须写入 Recipe。

### 5.2 画布里的"模型选择器"出现在哪

#### A) Image Studio Card（必有）

* Quick Bar：Model dropdown 只展示 `enabled=true` 的模型
* 若卡片已有旧模型，但该模型后来被禁用：

  * 下拉列表里不出现它
  * 但卡片上方显示一个只读徽标：`Current: <model> (disabled)`
  * Run 按钮显示为 `Blocked`，并给操作：`Enable in Settings`（跳转）

#### B) Group Header（可选但推荐：只给"生成相关组"）

* 对 Generate/Pipeline 类 Group 提供 `Default Model`（同样只列 enabled models）
* 作用：给组内新建的 Image Studio 卡作为默认初值；或在 card 未覆写时生效

#### C) Templates 插入时（推荐）

* 插入模板区块时：模板不硬编码模型，只写 `use_global_default` 或 `use_group_default`
* 这样你换模型不需要改模板

#### D) 运行前预览（Run Group Dry-run）

* Run Group 点运行时显示（轻提示条，不要大弹窗）：

  * `Will run 5 nodes · Models: 3 used · Missing: 0`

---

## 6. 后台配置设计（重点：数据结构 + 安全 + 接口）

> 你没有用户系统，等价于"单租户"。但依然要做"密钥安全"和"可迁移"。

### 6.1 数据表（SQLite 示例）

#### providers

* `provider_id` (pk) e.g. `nanobanana`
* `display_name`
* `base_url` (nullable)
* `is_enabled`（可选：禁用整个 provider）
* `created_at`, `updated_at`

#### provider_secrets

* `provider_id` (pk)
* `api_key_encrypted`（加密存储）
* `last_test_status`（ok/invalid/missing/rate_limited）
* `last_test_at`

> 加密建议：用服务端 `APP_SECRET_KEY` 做对称加密（AES-GCM）；Docker 部署就靠环境变量提供密钥。

#### models

* `model_id` (pk) 例如 `nanobanana:pro-image-v3`
* `provider_id` (fk)
* `display_name`
* `remote_model_name`（真实 API 的 model 字符串）
* `capabilities`（json array：["text2img","img2img"]）
* `is_enabled` (bool)
* `sort_order` (int)
* `default_params_json`（json：ratio/resolution/steps/cfg等）
* `created_at`, `updated_at`

#### app_settings

* `key` (pk) e.g. `default_text2img_model_id`
* `value_json`

> 你也可以用一张 `settings` 表存 JSON，但拆表更易演进。

---

## 6.2 后台"模型注册"策略

v1.9 不要求你自动拉取供应商的模型清单（那会把你拖进无休止适配地狱）。
采用 **手动注册 + 未来可扩展**：

* Settings 提供 "Add Model" 表单：

  * Provider
  * Display Name
  * Remote Model Name（API 用）
  * Capabilities（勾选）
  * Default Params（可选）
  * Enable

---

## 6.3 后端 API 设计（必需）

### Settings

* `GET /api/settings/providers`

* `PUT /api/settings/providers/{provider_id}`（base_url、并发等非敏感项）

* `PUT /api/settings/providers/{provider_id}/secret`（写入 API Key，密文）

* `POST /api/settings/providers/{provider_id}/test`（返回 ok/invalid/…）

* `GET /api/settings/models?enabled=true|false|all`

* `POST /api/settings/models`（新增模型）

* `PUT /api/settings/models/{model_id}`（启用/禁用、display_name、default_params、sort）

* `GET /api/settings/defaults`

* `PUT /api/settings/defaults`

### Generation（图片生成）

* `POST /api/generate/image`
  请求体（统一协议）：

```json
{
  "request_id": "uuid",
  "model_id": "nanobanana:pro-image-v3",
  "mode": "text2img|img2img",
  "prompt": "string",
  "negative": "string?",
  "params": {
    "ratio": "9:16",
    "resolution": "1024",
    "count": 12,
    "seed": 123,
    "...": "..."
  },
  "inputs": {
    "image_asset_ids": ["..."] 
  },
  "context": {
    "brief_snapshot_id": "...",
    "style_token_id": "...",
    "refset_token_id": "..."
  }
}
```

返回：

```json
{
  "job_id": "uuid",
  "status": "queued|running|done|error",
  "outputs": {
    "asset_ids": ["..."],
    "thumbnails": ["..."]
  },
  "error": null
}
```

### Job 状态（v1.9 推荐）

* `GET /api/jobs/{job_id}`（轮询）
  或
* `GET /api/jobs/stream/{job_id}`（SSE）

> 你现在已有 Run/Recipe 框架，用 job 模式最稳，不会阻塞 UI。

---

## 6.4 Provider Adapter（后端内部结构）

做一层统一适配，别在业务里写 if/else：

* `ProviderAdapter.generateImage(request) -> assets[]`
* 每个 provider 实现：

  * auth（取解密后的 key）
  * request mapping（把你的统一参数映射到它的 API）
  * response parsing（落资产与元数据）

---

## 7. 前端接入与画布行为（落到卡片与运行）

### 7.1 Image Studio 卡的运行逻辑（Run）

1. 解析 effective model（按层级）
2. 从 inputs（Brief/Style/RefSet/ImageIn）组装 prompt/context
3. 调用 `/api/generate/image`
4. job done 后：

   * 写 `CandidatesOut` snapshot（asset_ids[]）
   * 写 `ImageOut` snapshot（默认 pinned/第一张）
   * 写 `ContextOut` snapshot（prompt+params+seed+model+输入引用）
   * 写 Recipe（inputs snapshots + params + outputs snapshots）

### 7.2 Model Picker 的数据源

* 画布内所有模型选择器仅调用：

  * `GET /api/settings/models?enabled=true`
* 选择器绝不展示 disabled 模型
* 卡片如果引用了 disabled 模型：以"只读徽标 + 阻塞运行"呈现

### 7.3 Run Group（Pipeline）与模型

* Run Group 执行每个节点时，都要为该节点解析 effective model
* 如果某节点缺模型（默认为空且无 enabled model）：Run Group 显示该节点 Blocked，并停止或跳过（策略可选）

  * v1.9 默认：停止并提示去 Settings 启用模型

---

## 8. 权限与安全（单用户也要做）

* API Key 只存在服务端，前端永远不回显
* `APP_SECRET_KEY` 环境变量必须设置，否则拒绝保存 secret（避免明文落盘）
* 模型启用/禁用属于"配置变更"，需要写审计日志（最简：写一条 event 表即可）

---

## 9. 异常与边界场景

1. **模型禁用后旧卡怎么办**：

   * 不出现在 Picker
   * 卡片显示 Current(disabled)，Run 阻塞，提示去 Settings 启用或切换模型

2. **Provider Key 失效/限流**：

   * 任务 error（带 reason）
   * Settings provider 卡显示 last_test_status + 最近错误
   * Image Studio 卡结果区显示可读错误 + Retry（可切模型）

3. **参数不兼容**（某模型不支持某 ratio/resolution）：

   * 后端 adapter 做校验并返回可读错误
   * 前端可做"能力约束"：根据 model.capabilities/constraints 动态限制下拉选项（v1.9 可简化为后端校验优先）

---

## 10. 里程碑与交付顺序（你下一步照着做）

### M1：Settings 配置中心（Provider + Model）

* provider 密钥加密存储 + test endpoint
* model registry CRUD + enabled filter
* defaults 设置

### M2：前端 Picker 全面切换为"enabled models"

* Image Studio 卡 model dropdown 接 settings
* Group default model（可选）
* disabled 模型引用的兼容展示（只读徽标 + blocked）

### M3：真实生成 API 接入（最小可用）

* `/api/generate/image` + job 轮询
* Image Studio run 跑通：生成 → assets → snapshots → recipe

### M4：Run Group 集成（串联运行）

* dry-run 汇总：missing model / disabled model / provider key missing
* 失败策略：默认 stop + 指引

---

## 11. 验收标准（v1.9 Done）

* Settings 能配置 provider key、注册模型、启用/禁用模型、设置默认模型
* 画布所有模型选择器只显示 enabled 模型
* Image Studio 卡能真实生成图片，并在卡内显示候选网格
* 生成记录写入 snapshot + recipe（可回放）
* 模型禁用/Key 失效时，画布可解释、可引导修复，不出现"无声失败"

---

如果你愿意再把体验抬一截（但不影响 v1.9 完成）：加一个 **"Preset（Fast/Standard/High）"**，它本质就是一组 default params，用户在卡片里只切 preset，模型选择依然来自 enabled models。这样设计师不会天天盯着 steps/cfg 这种工程参数怀疑人生。
