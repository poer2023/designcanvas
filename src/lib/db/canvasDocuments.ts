import { getDb } from './index';

export interface CanvasDocument {
    project_id: string;
    schema_version: string;
    snapshot: Record<string, unknown>;
    version: number;
    updated_at: string;
}

interface CanvasDocumentRow {
    project_id: string;
    schema_version: string;
    snapshot_json: string;
    version: number;
    updated_at: string;
}

export interface SaveCanvasDocumentResult {
    success: boolean;
    version?: number;
    conflict?: boolean;
    serverVersion?: number;
}

function ensureTableExists() {
    getDb().exec(`
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
    `);
}

export function getCanvasDocument(projectId: string): CanvasDocument | null {
    ensureTableExists();
    const row = getDb().prepare(`
        SELECT * FROM canvas_documents WHERE project_id = ?
    `).get(projectId) as CanvasDocumentRow | undefined;

    if (!row) return null;

    return {
        project_id: row.project_id,
        schema_version: row.schema_version,
        snapshot: JSON.parse(row.snapshot_json) as Record<string, unknown>,
        version: row.version,
        updated_at: row.updated_at,
    };
}

export function saveCanvasDocument(
    projectId: string,
    snapshot: Record<string, unknown>,
    baseVersion: number,
    options?: { force?: boolean; schemaVersion?: string }
): SaveCanvasDocumentResult {
    ensureTableExists();
    const db = getDb();
    const now = new Date().toISOString();
    const schemaVersion = options?.schemaVersion || 'tldraw-4.5';

    const transaction = db.transaction((): SaveCanvasDocumentResult => {
        const current = db.prepare(`
            SELECT version FROM canvas_documents WHERE project_id = ?
        `).get(projectId) as { version: number } | undefined;

        if (!current) {
            db.prepare(`
                INSERT INTO canvas_documents
                    (project_id, schema_version, snapshot_json, version, updated_at)
                VALUES (?, ?, ?, 1, ?)
            `).run(projectId, schemaVersion, JSON.stringify(snapshot), now);
            db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId);
            return { success: true, version: 1 };
        }

        if (!options?.force && current.version !== baseVersion) {
            return {
                success: false,
                conflict: true,
                serverVersion: current.version,
            };
        }

        const nextVersion = current.version + 1;
        db.prepare(`
            UPDATE canvas_documents
            SET schema_version = ?, snapshot_json = ?, version = ?, updated_at = ?
            WHERE project_id = ?
        `).run(schemaVersion, JSON.stringify(snapshot), nextVersion, now, projectId);
        db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId);
        return { success: true, version: nextVersion };
    });

    return transaction();
}
