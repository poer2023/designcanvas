import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { RefSet, RefSetItem, Cluster } from '@/types/refset';

interface RefSetRow {
    id: string;
    name: string;
    project_id: string | null;
    items: string;
    clusters: string | null;
    dedupe_map: string | null;
    created_at: string;
    updated_at: string;
}

function rowToRefSet(row: RefSetRow): RefSet {
    const items = JSON.parse(row.items || '[]') as RefSetItem[];
    const clusters = JSON.parse(row.clusters || '[]') as Cluster[];

    return {
        id: row.id,
        project_id: row.project_id || undefined,
        name: row.name,
        item_count: items.length,
        cluster_count: clusters.length,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export async function getAllRefSets(): Promise<RefSet[]> {
    const db = await getDb();
    const rows = db.prepare(`
    SELECT * FROM refsets ORDER BY updated_at DESC
  `).all() as RefSetRow[];

    return rows.map(rowToRefSet);
}

export async function getRefSetsByProject(projectId: string): Promise<RefSet[]> {
    const db = await getDb();
    const rows = db.prepare(`
    SELECT * FROM refsets WHERE project_id = ? ORDER BY updated_at DESC
  `).all(projectId) as RefSetRow[];

    return rows.map(rowToRefSet);
}

export async function getRefSetById(id: string): Promise<RefSet | null> {
    const db = await getDb();
    const row = db.prepare(`SELECT * FROM refsets WHERE id = ?`).get(id) as RefSetRow | undefined;

    return row ? rowToRefSet(row) : null;
}

export async function getRefSetItems(id: string): Promise<RefSetItem[]> {
    const db = await getDb();
    const row = db.prepare(`SELECT items FROM refsets WHERE id = ?`).get(id) as { items: string } | undefined;

    if (!row) return [];
    return JSON.parse(row.items || '[]') as RefSetItem[];
}

export async function getRefSetClusters(id: string): Promise<Cluster[]> {
    const db = await getDb();
    const row = db.prepare(`SELECT clusters FROM refsets WHERE id = ?`).get(id) as { clusters: string } | undefined;

    if (!row) return [];
    return JSON.parse(row.clusters || '[]') as Cluster[];
}

export interface CreateRefSetInput {
    name: string;
    projectId?: string;
    items?: RefSetItem[];
}

export async function createRefSet(input: CreateRefSetInput): Promise<RefSet> {
    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    const items = input.items || [];

    db.prepare(`
    INSERT INTO refsets (id, name, project_id, items, clusters, dedupe_map, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        input.name,
        input.projectId || null,
        JSON.stringify(items),
        JSON.stringify([]),
        JSON.stringify({}),
        now,
        now
    );

    return {
        id,
        name: input.name,
        project_id: input.projectId,
        item_count: items.length,
        cluster_count: 0,
        created_at: now,
        updated_at: now,
    };
}

export async function addItemsToRefSet(
    refsetId: string,
    newItems: Omit<RefSetItem, 'id' | 'refset_id' | 'created_at'>[]
): Promise<RefSetItem[]> {
    const db = await getDb();
    const now = new Date().toISOString();

    // Get existing items
    const existing = await getRefSetItems(refsetId);

    // Create new items with IDs
    const createdItems: RefSetItem[] = newItems.map(item => ({
        ...item,
        id: uuidv4(),
        refset_id: refsetId,
        created_at: now,
    }));

    // Merge and update
    const allItems = [...existing, ...createdItems];

    db.prepare(`
    UPDATE refsets SET items = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(allItems), now, refsetId);

    return createdItems;
}

export async function updateRefSetClusters(refsetId: string, clusters: Cluster[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    db.prepare(`
    UPDATE refsets SET clusters = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(clusters), now, refsetId);
}

export async function removeItemFromRefSet(refsetId: string, itemId: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    const items = await getRefSetItems(refsetId);
    const filtered = items.filter(item => item.id !== itemId);

    db.prepare(`
    UPDATE refsets SET items = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(filtered), now, refsetId);
}

export async function deleteRefSet(id: string): Promise<boolean> {
    const db = await getDb();
    const result = db.prepare(`DELETE FROM refsets WHERE id = ?`).run(id);
    return result.changes > 0;
}

export async function updateRefSetDedupeMap(
    refsetId: string,
    dedupeMap: Record<string, string[]>
): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    db.prepare(`
    UPDATE refsets SET dedupe_map = ?, updated_at = ? WHERE id = ?
  `).run(JSON.stringify(dedupeMap), now, refsetId);
}
