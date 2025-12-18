import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, NodeRun, AssetRef } from '@/types/poster';

interface RecipeRow {
    id: string;
    project_id: string;
    graph_snapshot: string;
    node_runs: string;
    seeds: string;
    skill_versions: string;
    asset_refs: string;
    // PRD v2.1 fields
    mode: string | null;
    start_node_id: string | null;
    affected_node_ids: string | null;
    node_io_map: string | null;
    created_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
    return {
        id: row.id,
        project_id: row.project_id,
        graph_snapshot: JSON.parse(row.graph_snapshot),
        node_runs: JSON.parse(row.node_runs) as NodeRun[],
        seeds: JSON.parse(row.seeds) as number[],
        skill_versions: JSON.parse(row.skill_versions),
        asset_refs: JSON.parse(row.asset_refs) as AssetRef[],
        // PRD v2.1 fields
        mode: row.mode as Recipe['mode'] || undefined,
        start_node_id: row.start_node_id || undefined,
        affected_node_ids: row.affected_node_ids ? JSON.parse(row.affected_node_ids) : undefined,
        node_io_map: row.node_io_map ? JSON.parse(row.node_io_map) : undefined,
        created_at: row.created_at,
    };
}

export function getAllRecipes(): Recipe[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM recipes ORDER BY created_at DESC
  `).all() as RecipeRow[];

    return rows.map(rowToRecipe);
}

export function getRecipesByProject(projectId: string): Recipe[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM recipes WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId) as RecipeRow[];

    return rows.map(rowToRecipe);
}

export function getRecipeById(id: string): Recipe | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM recipes WHERE id = ?`).get(id) as RecipeRow | undefined;

    return row ? rowToRecipe(row) : null;
}

export interface CreateRecipeInput {
    project_id: string;
    graph_snapshot: Record<string, unknown>;
    node_runs: NodeRun[];
    seeds: number[];
    skill_versions: Record<string, string>;
    asset_refs: AssetRef[];
    // PRD v2.1 fields
    mode?: 'RUN_NODE' | 'RUN_FROM_HERE' | 'RUN_GROUP' | 'RUN_ALL';
    start_node_id?: string;
    affected_node_ids?: string[];
    node_io_map?: Record<string, { inputs: unknown[]; outputs: unknown[] }>;
}

export function createRecipe(input: CreateRecipeInput): Recipe {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO recipes (id, project_id, graph_snapshot, node_runs, seeds, skill_versions, asset_refs, mode, start_node_id, affected_node_ids, node_io_map, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        input.project_id,
        JSON.stringify(input.graph_snapshot),
        JSON.stringify(input.node_runs),
        JSON.stringify(input.seeds),
        JSON.stringify(input.skill_versions),
        JSON.stringify(input.asset_refs),
        input.mode || null,
        input.start_node_id || null,
        input.affected_node_ids ? JSON.stringify(input.affected_node_ids) : null,
        input.node_io_map ? JSON.stringify(input.node_io_map) : null,
        now
    );

    return getRecipeById(id)!;
}

export function deleteRecipe(id: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM recipes WHERE id = ?`).run(id);
    return result.changes > 0;
}

export function getRecipeCount(projectId?: string): number {
    const db = getDb();

    if (projectId) {
        const result = db.prepare(`SELECT COUNT(*) as count FROM recipes WHERE project_id = ?`).get(projectId) as { count: number };
        return result.count;
    }

    const result = db.prepare(`SELECT COUNT(*) as count FROM recipes`).get() as { count: number };
    return result.count;
}
