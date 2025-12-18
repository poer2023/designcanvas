/**
 * PRD v2.0: Project Graphs Database Functions
 * 
 * Handles persistence of graph snapshots (nodes/edges/viewport) for projects.
 * Uses optimistic locking with version numbers for conflict detection.
 */

import { getDb } from './index';

export interface GraphSnapshot {
    nodes: unknown[];
    edges: unknown[];
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

export interface ProjectGraph {
    project_id: string;
    schema_version: string;
    graph_snapshot: GraphSnapshot;
    viewport: Viewport;
    version: number;
    updated_at: string;
}

interface ProjectGraphRow {
    project_id: string;
    schema_version: string;
    graph_snapshot_json: string;
    viewport_json: string;
    version: number;
    updated_at: string;
}

/**
 * Ensure the project_graphs table exists
 */
function ensureTableExists() {
    const db = getDb();
    db.exec(`
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
    `);
}

/**
 * Get graph for a project
 * Returns null if no graph exists (project is new or hasn't been saved yet)
 */
export function getProjectGraph(projectId: string): ProjectGraph | null {
    ensureTableExists();
    const db = getDb();
    const row = db.prepare(`
        SELECT * FROM project_graphs WHERE project_id = ?
    `).get(projectId) as ProjectGraphRow | undefined;

    if (!row) return null;

    return {
        project_id: row.project_id,
        schema_version: row.schema_version,
        graph_snapshot: JSON.parse(row.graph_snapshot_json) as GraphSnapshot,
        viewport: JSON.parse(row.viewport_json) as Viewport,
        version: row.version,
        updated_at: row.updated_at,
    };
}

/**
 * Create an empty graph for a project
 */
export function createEmptyGraph(projectId: string): ProjectGraph {
    const db = getDb();
    const now = new Date().toISOString();
    const emptySnapshot: GraphSnapshot = { nodes: [], edges: [] };
    const defaultViewport: Viewport = { x: 0, y: 0, zoom: 1 };

    db.prepare(`
        INSERT INTO project_graphs (project_id, schema_version, graph_snapshot_json, viewport_json, version, updated_at)
        VALUES (?, '2.0', ?, ?, 1, ?)
    `).run(projectId, JSON.stringify(emptySnapshot), JSON.stringify(defaultViewport), now);

    return getProjectGraph(projectId)!;
}

export interface SaveGraphResult {
    success: boolean;
    version?: number;
    conflict?: boolean;
    serverVersion?: number;
}

/**
 * Save graph snapshot with optimistic locking
 * 
 * @param projectId - Project ID to save graph for
 * @param graphSnapshot - The nodes and edges to save
 * @param viewport - The viewport position and zoom
 * @param baseVersion - The version client last received (for conflict detection)
 * @returns SaveGraphResult with success status and new version, or conflict info
 */
export function saveProjectGraph(
    projectId: string,
    graphSnapshot: GraphSnapshot,
    viewport: Viewport,
    baseVersion: number
): SaveGraphResult {
    const db = getDb();
    const now = new Date().toISOString();

    // Check current version
    const current = db.prepare(`
        SELECT version FROM project_graphs WHERE project_id = ?
    `).get(projectId) as { version: number } | undefined;

    // If no graph exists, create one
    if (!current) {
        db.prepare(`
            INSERT INTO project_graphs (project_id, schema_version, graph_snapshot_json, viewport_json, version, updated_at)
            VALUES (?, '2.0', ?, ?, 1, ?)
        `).run(projectId, JSON.stringify(graphSnapshot), JSON.stringify(viewport), now);

        return { success: true, version: 1 };
    }

    // Check for version conflict
    if (current.version !== baseVersion) {
        return {
            success: false,
            conflict: true,
            serverVersion: current.version,
        };
    }

    // Update with new version
    const newVersion = current.version + 1;
    db.prepare(`
        UPDATE project_graphs 
        SET graph_snapshot_json = ?, viewport_json = ?, version = ?, updated_at = ?
        WHERE project_id = ? AND version = ?
    `).run(JSON.stringify(graphSnapshot), JSON.stringify(viewport), newVersion, now, projectId, baseVersion);

    return { success: true, version: newVersion };
}

/**
 * Force save graph (override any conflicts)
 * Used for "Force Save" action when user chooses to override
 */
export function forceSaveProjectGraph(
    projectId: string,
    graphSnapshot: GraphSnapshot,
    viewport: Viewport
): SaveGraphResult {
    const db = getDb();
    const now = new Date().toISOString();

    // Get current version or default to 0
    const current = db.prepare(`
        SELECT version FROM project_graphs WHERE project_id = ?
    `).get(projectId) as { version: number } | undefined;

    const newVersion = (current?.version ?? 0) + 1;

    if (current) {
        db.prepare(`
            UPDATE project_graphs 
            SET graph_snapshot_json = ?, viewport_json = ?, version = ?, updated_at = ?
            WHERE project_id = ?
        `).run(JSON.stringify(graphSnapshot), JSON.stringify(viewport), newVersion, now, projectId);
    } else {
        db.prepare(`
            INSERT INTO project_graphs (project_id, schema_version, graph_snapshot_json, viewport_json, version, updated_at)
            VALUES (?, '2.0', ?, ?, ?, ?)
        `).run(projectId, JSON.stringify(graphSnapshot), JSON.stringify(viewport), newVersion, now);
    }

    return { success: true, version: newVersion };
}

/**
 * Delete graph for a project
 */
export function deleteProjectGraph(projectId: string): boolean {
    const db = getDb();
    const result = db.prepare(`
        DELETE FROM project_graphs WHERE project_id = ?
    `).run(projectId);
    return result.changes > 0;
}
