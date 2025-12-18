-- PosterLab v1.9 Schema Extension
-- 模型配置中心化 + 真实图片生成接入

-- Providers 表（供应商配置）
CREATE TABLE IF NOT EXISTS providers (
  provider_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  base_url TEXT,
  timeout_ms INTEGER DEFAULT 30000,
  max_concurrency INTEGER DEFAULT 5,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Provider Secrets 表（加密存储 API Key）
CREATE TABLE IF NOT EXISTS provider_secrets (
  provider_id TEXT PRIMARY KEY,
  api_key_encrypted TEXT NOT NULL,
  last_test_status TEXT DEFAULT 'unknown',
  last_test_at TEXT,
  FOREIGN KEY (provider_id) REFERENCES providers(provider_id) ON DELETE CASCADE
);

-- Models 表（模型注册）
CREATE TABLE IF NOT EXISTS models (
  model_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  remote_model_name TEXT NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '["text2img"]',
  is_enabled INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 100,
  default_params_json TEXT DEFAULT '{}',
  is_hidden INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(provider_id) ON DELETE CASCADE
);

-- App Settings 表（全局配置）
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Generation Jobs 表（异步任务）
CREATE TABLE IF NOT EXISTS generation_jobs (
  job_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  request_payload TEXT NOT NULL,
  outputs TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit Log 表（审计日志）
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(is_enabled);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_request ON generation_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Seed default providers
INSERT OR IGNORE INTO providers (provider_id, display_name, base_url, is_enabled) VALUES
  ('mock', 'Mock Provider', NULL, 1),
  ('nanobanana', 'NanoBanana', 'https://api.nanobanana.com', 0),
  ('openai', 'OpenAI', 'https://api.openai.com/v1', 0),
  ('replicate', 'Replicate', 'https://api.replicate.com/v1', 0);

-- Seed default models (mock provider for testing)
INSERT OR IGNORE INTO models (model_id, provider_id, display_name, remote_model_name, capabilities, is_enabled, sort_order) VALUES
  ('mock:default', 'mock', 'Mock Generator', 'mock-v1', '["text2img", "img2img"]', 1, 1),
  ('mock:fast', 'mock', 'Mock Fast', 'mock-fast', '["text2img"]', 1, 2),
  ('mock:hd', 'mock', 'Mock HD', 'mock-hd', '["text2img", "img2img"]', 1, 3);

-- Seed default settings
INSERT OR IGNORE INTO app_settings (key, value_json) VALUES
  ('default_text2img_model_id', '"mock:default"'),
  ('default_img2img_model_id', '"mock:default"'),
  ('default_ratio', '"1:1"'),
  ('default_resolution', '"1K"'),
  ('default_count', '4');
