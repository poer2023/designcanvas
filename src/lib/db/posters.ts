import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Poster, PosterStatus } from '@/types/poster';

interface PosterRow {
    id: string;
    project_id: string;
    image_url: string;
    recipe_id: string;
    seed: number;
    status: string;
    tags: string | null;
    created_at: string;
}

function rowToPoster(row: PosterRow): Poster {
    return {
        id: row.id,
        project_id: row.project_id,
        image_url: row.image_url,
        recipe_id: row.recipe_id,
        seed: row.seed,
        status: row.status as PosterStatus,
        tags: row.tags ? JSON.parse(row.tags) : [],
        created_at: row.created_at,
    };
}

export function getAllPosters(): Poster[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM posters ORDER BY created_at DESC
  `).all() as PosterRow[];

    return rows.map(rowToPoster);
}

export function getPostersByProject(projectId: string): Poster[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM posters WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId) as PosterRow[];

    return rows.map(rowToPoster);
}

export function getPostersByStatus(status: PosterStatus): Poster[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM posters WHERE status = ? ORDER BY created_at DESC
  `).all(status) as PosterRow[];

    return rows.map(rowToPoster);
}

export function getPosterById(id: string): Poster | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM posters WHERE id = ?`).get(id) as PosterRow | undefined;

    return row ? rowToPoster(row) : null;
}

export interface CreatePosterInput {
    project_id: string;
    image_url: string;
    recipe_id: string;
    seed: number;
    tags?: string[];
}

export function createPoster(input: CreatePosterInput): Poster {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO posters (id, project_id, image_url, recipe_id, seed, status, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        input.project_id,
        input.image_url,
        input.recipe_id,
        input.seed,
        'generated',
        input.tags ? JSON.stringify(input.tags) : null,
        now
    );

    return getPosterById(id)!;
}

export function createPosterBatch(inputs: CreatePosterInput[]): Poster[] {
    const db = getDb();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO posters (id, project_id, image_url, recipe_id, seed, status, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const ids: string[] = [];

    const insertMany = db.transaction((inputs: CreatePosterInput[]) => {
        for (const input of inputs) {
            const id = uuidv4();
            ids.push(id);
            stmt.run(
                id,
                input.project_id,
                input.image_url,
                input.recipe_id,
                input.seed,
                'generated',
                input.tags ? JSON.stringify(input.tags) : null,
                now
            );
        }
    });

    insertMany(inputs);

    return ids.map(id => getPosterById(id)!);
}

export function updatePosterStatus(id: string, status: PosterStatus): Poster | null {
    const db = getDb();

    db.prepare(`
    UPDATE posters SET status = ? WHERE id = ?
  `).run(status, id);

    return getPosterById(id);
}

export function deletePoster(id: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM posters WHERE id = ?`).run(id);
    return result.changes > 0;
}

export function getPosterCount(projectId?: string): number {
    const db = getDb();

    if (projectId) {
        const result = db.prepare(`SELECT COUNT(*) as count FROM posters WHERE project_id = ?`).get(projectId) as { count: number };
        return result.count;
    }

    const result = db.prepare(`SELECT COUNT(*) as count FROM posters`).get() as { count: number };
    return result.count;
}
