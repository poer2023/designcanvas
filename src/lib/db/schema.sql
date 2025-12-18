-- PosterLab SQLite Schema

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  style_profile_id TEXT,
  brief_id TEXT,
  cover_image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Style Profiles table
CREATE TABLE IF NOT EXISTS style_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  summary_s TEXT NOT NULL,
  summary_m TEXT,
  summary_l TEXT,
  banned_tokens TEXT, -- JSON array
  palette_hint TEXT,  -- JSON array
  constraints TEXT,   -- JSON object
  images TEXT NOT NULL, -- JSON array of paths
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Briefs table
CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  size TEXT NOT NULL,        -- JSON: {width, height}
  title TEXT NOT NULL,
  subtitle TEXT,
  info_area TEXT,
  brand_colors TEXT,         -- JSON array
  banned_colors TEXT,        -- JSON array
  tone_weights TEXT,         -- JSON object
  banned_elements TEXT,      -- JSON array
  layout_strategy TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Reference Sets table
CREATE TABLE IF NOT EXISTS refsets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_id TEXT,
  items TEXT NOT NULL,       -- JSON array
  clusters TEXT,             -- JSON array
  dedupe_map TEXT,           -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Posters table
CREATE TABLE IF NOT EXISTS posters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  tags TEXT,                 -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Elements table
CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  poster_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mask_url TEXT,
  bbox TEXT NOT NULL,        -- JSON: {x, y, width, height}
  semantic_tag TEXT,
  note TEXT,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poster_id) REFERENCES posters(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Finals table (final composed posters)
CREATE TABLE IF NOT EXISTS finals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  recipe_id TEXT NOT NULL,
  element_ids TEXT NOT NULL, -- JSON array
  masks TEXT,                -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  graph_snapshot TEXT NOT NULL, -- JSON
  node_runs TEXT NOT NULL,      -- JSON array
  seeds TEXT NOT NULL,          -- JSON array
  skill_versions TEXT NOT NULL, -- JSON object
  asset_refs TEXT NOT NULL,     -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Skills table (for custom/modified skills)
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  tags TEXT,                 -- JSON array
  io_schema TEXT NOT NULL,   -- JSON
  prompt_templates TEXT,     -- JSON
  resources TEXT,            -- JSON
  runtime_policy TEXT NOT NULL, -- JSON
  tests TEXT,                -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_posters_project ON posters(project_id);
CREATE INDEX IF NOT EXISTS idx_elements_project ON elements(project_id);
CREATE INDEX IF NOT EXISTS idx_elements_poster ON elements(poster_id);
CREATE INDEX IF NOT EXISTS idx_recipes_project ON recipes(project_id);
CREATE INDEX IF NOT EXISTS idx_briefs_project ON briefs(project_id);

-- PRD v2.0: Project Graphs table for canvas persistence
CREATE TABLE IF NOT EXISTS project_graphs (
  project_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL DEFAULT '2.0',
  graph_snapshot_json TEXT NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_graphs_updated ON project_graphs(updated_at DESC);
