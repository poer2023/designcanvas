const Database = require('better-sqlite3');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

class DesktopDatabase {
  constructor({ dataDir, schemaFiles }) {
    this.dataDir = dataDir;
    this.assetsDir = path.join(dataDir, 'assets');
    this.dbPath = path.join(dataDir, 'designcanvas.db');

    fs.mkdirSync(this.assetsDir, { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    this.applyMigrations(schemaFiles);
  }

  applyMigrations(schemaFiles) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const migrations = [
      {
        version: 1,
        name: 'baseline-schema',
        sql: schemaFiles
          .filter((schemaFile) => fs.existsSync(schemaFile))
          .map((schemaFile) => fs.readFileSync(schemaFile, 'utf8'))
          .join('\n'),
      },
      {
        version: 2,
        name: 'tldraw-canvas-documents',
        sql: `
          CREATE TABLE IF NOT EXISTS canvas_documents (
            project_id TEXT PRIMARY KEY,
            schema_version TEXT NOT NULL DEFAULT 'tldraw-4.5',
            snapshot_json TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_canvas_documents_updated
            ON canvas_documents(updated_at DESC);
        `,
      },
    ];

    if (!migrations[0].sql.trim()) {
      throw new Error('No baseline database schema files were found');
    }

    const appliedVersions = new Set(
      this.db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version)
    );
    const apply = this.db.transaction((migration) => {
      this.db.exec(migration.sql);
      this.db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)
      `).run(migration.version, migration.name, new Date().toISOString());
    });

    for (const migration of migrations) {
      if (!appliedVersions.has(migration.version)) apply(migration);
    }
  }

  listProjects() {
    return this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  }

  getProject(projectId) {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) || null;
  }

  createProject(input) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO projects (id, name, description, style_profile_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.description || null,
      input.style_profile_id || null,
      now,
      now
    );
    return this.getProject(id);
  }

  deleteProject(projectId) {
    return this.db.prepare('DELETE FROM projects WHERE id = ?').run(projectId).changes > 0;
  }

  loadGraph(projectId) {
    if (!this.getProject(projectId)) return null;

    let row = this.db.prepare(`
      SELECT * FROM project_graphs WHERE project_id = ?
    `).get(projectId);

    if (!row) {
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO project_graphs
          (project_id, schema_version, graph_snapshot_json, viewport_json, version, updated_at)
        VALUES (?, '2.0', ?, ?, 1, ?)
      `).run(
        projectId,
        JSON.stringify({ nodes: [], edges: [] }),
        JSON.stringify({ x: 0, y: 0, zoom: 1 }),
        now
      );
      row = this.db.prepare('SELECT * FROM project_graphs WHERE project_id = ?').get(projectId);
    }

    return {
      projectId: row.project_id,
      schemaVersion: row.schema_version,
      graphSnapshot: JSON.parse(row.graph_snapshot_json),
      viewport: JSON.parse(row.viewport_json),
      version: row.version,
      updatedAt: row.updated_at,
    };
  }

  saveGraph(request) {
    return this.saveVersionedDocument({
      table: 'project_graphs',
      projectId: request.projectId,
      baseVersion: request.baseVersion,
      force: request.force === true,
      insertSql: `
        INSERT INTO project_graphs
          (project_id, schema_version, graph_snapshot_json, viewport_json, version, updated_at)
        VALUES (?, '2.0', ?, ?, 1, ?)
      `,
      insertValues: [
        request.projectId,
        JSON.stringify(request.graphSnapshot),
        JSON.stringify(request.viewport),
      ],
      updateSql: `
        UPDATE project_graphs
        SET graph_snapshot_json = ?, viewport_json = ?, version = ?, updated_at = ?
        WHERE project_id = ?
      `,
      updateValues: [
        JSON.stringify(request.graphSnapshot),
        JSON.stringify(request.viewport),
      ],
    });
  }

  loadCanvasDocument(projectId) {
    const row = this.db.prepare(`
      SELECT * FROM canvas_documents WHERE project_id = ?
    `).get(projectId);
    if (!row) return null;

    return {
      projectId: row.project_id,
      schemaVersion: row.schema_version,
      snapshot: JSON.parse(row.snapshot_json),
      version: row.version,
      updatedAt: row.updated_at,
    };
  }

  saveCanvasDocument(request) {
    return this.saveVersionedDocument({
      table: 'canvas_documents',
      projectId: request.projectId,
      baseVersion: request.baseVersion,
      force: request.force === true,
      insertSql: `
        INSERT INTO canvas_documents
          (project_id, schema_version, snapshot_json, version, updated_at)
        VALUES (?, ?, ?, 1, ?)
      `,
      insertValues: [
        request.projectId,
        request.schemaVersion || 'tldraw-4.5',
        JSON.stringify(request.snapshot),
      ],
      updateSql: `
        UPDATE canvas_documents
        SET schema_version = ?, snapshot_json = ?, version = ?, updated_at = ?
        WHERE project_id = ?
      `,
      updateValues: [
        request.schemaVersion || 'tldraw-4.5',
        JSON.stringify(request.snapshot),
      ],
    });
  }

  saveVersionedDocument(options) {
    if (!this.getProject(options.projectId)) {
      return { success: false, error: 'Project not found' };
    }

    const save = this.db.transaction(() => {
      const current = this.db.prepare(`
        SELECT version FROM ${options.table} WHERE project_id = ?
      `).get(options.projectId);
      const now = new Date().toISOString();

      if (!current) {
        this.db.prepare(options.insertSql).run(...options.insertValues, now);
        this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
          .run(now, options.projectId);
        return { success: true, version: 1 };
      }

      if (!options.force && current.version !== options.baseVersion) {
        return {
          success: false,
          conflict: true,
          serverVersion: current.version,
          error: 'Version conflict',
        };
      }

      const nextVersion = current.version + 1;
      this.db.prepare(options.updateSql).run(
        ...options.updateValues,
        nextVersion,
        now,
        options.projectId
      );
      this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
        .run(now, options.projectId);
      return { success: true, version: nextVersion };
    });

    return save();
  }

  close() {
    if (this.db?.open) this.db.close();
  }
}

module.exports = { DesktopDatabase };
