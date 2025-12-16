import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Element, BoundingBox, ElementCreateInput } from '@/types/element';

interface ElementRow {
    id: string;
    poster_id: string;
    project_id: string;
    image_url: string;
    mask_url: string | null;
    bbox: string;
    semantic_tag: string | null;
    note: string | null;
    used_count: number;
    created_at: string;
}

function rowToElement(row: ElementRow): Element {
    return {
        id: row.id,
        poster_id: row.poster_id,
        project_id: row.project_id,
        image_url: row.image_url,
        mask_url: row.mask_url || undefined,
        bbox: JSON.parse(row.bbox) as BoundingBox,
        semantic_tag: row.semantic_tag || undefined,
        note: row.note || undefined,
        used_count: row.used_count,
        created_at: row.created_at,
    };
}

export function getAllElements(): Element[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM elements ORDER BY created_at DESC
  `).all() as ElementRow[];

    return rows.map(rowToElement);
}

export function getElementsByProject(projectId: string): Element[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM elements WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId) as ElementRow[];

    return rows.map(rowToElement);
}

export function getElementsByPoster(posterId: string): Element[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM elements WHERE poster_id = ? ORDER BY created_at DESC
  `).all(posterId) as ElementRow[];

    return rows.map(rowToElement);
}

export function getElementsByTag(tag: string): Element[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM elements WHERE semantic_tag = ? ORDER BY used_count DESC
  `).all(tag) as ElementRow[];

    return rows.map(rowToElement);
}

export function getElementById(id: string): Element | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM elements WHERE id = ?`).get(id) as ElementRow | undefined;

    return row ? rowToElement(row) : null;
}

export function createElement(input: ElementCreateInput): Element {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO elements (id, poster_id, project_id, image_url, mask_url, bbox, semantic_tag, note, used_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        input.poster_id,
        input.project_id,
        input.image_url,
        input.mask_url || null,
        JSON.stringify(input.bbox),
        input.semantic_tag || null,
        input.note || null,
        0,
        now
    );

    return getElementById(id)!;
}

export function updateElement(
    id: string,
    data: Partial<Pick<Element, 'semantic_tag' | 'note'>>
): Element | null {
    const db = getDb();
    const existing = getElementById(id);
    if (!existing) return null;

    db.prepare(`
    UPDATE elements SET semantic_tag = ?, note = ? WHERE id = ?
  `).run(
        data.semantic_tag ?? existing.semantic_tag ?? null,
        data.note ?? existing.note ?? null,
        id
    );

    return getElementById(id);
}

export function incrementElementUsage(id: string): void {
    const db = getDb();
    db.prepare(`
    UPDATE elements SET used_count = used_count + 1 WHERE id = ?
  `).run(id);
}

export function deleteElement(id: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM elements WHERE id = ?`).run(id);
    return result.changes > 0;
}

export function getElementCount(projectId?: string): number {
    const db = getDb();

    if (projectId) {
        const result = db.prepare(`SELECT COUNT(*) as count FROM elements WHERE project_id = ?`).get(projectId) as { count: number };
        return result.count;
    }

    const result = db.prepare(`SELECT COUNT(*) as count FROM elements`).get() as { count: number };
    return result.count;
}

export function getUniqueElementTags(): string[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT DISTINCT semantic_tag FROM elements WHERE semantic_tag IS NOT NULL
  `).all() as { semantic_tag: string }[];

    return rows.map(r => r.semantic_tag);
}
