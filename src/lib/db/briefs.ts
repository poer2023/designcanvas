import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Brief } from '@/types';

interface BriefRow {
  id: string;
  project_id: string;
  size: string;
  title: string;
  subtitle: string | null;
  info_area: string | null;
  brand_colors: string | null;
  banned_colors: string | null;
  tone_weights: string | null;
  banned_elements: string | null;
  layout_strategy: string | null;
  created_at: string;
  updated_at: string;
}

function rowToBrief(row: BriefRow): Brief {
  return {
    id: row.id,
    project_id: row.project_id,
    size: JSON.parse(row.size),
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    info_area: row.info_area ?? undefined,
    brand_colors: row.brand_colors ? JSON.parse(row.brand_colors) : undefined,
    banned_colors: row.banned_colors ? JSON.parse(row.banned_colors) : undefined,
    tone_weights: row.tone_weights ? JSON.parse(row.tone_weights) : undefined,
    banned_elements: row.banned_elements ? JSON.parse(row.banned_elements) : undefined,
    layout_strategy: row.layout_strategy ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getBriefsByProjectId(projectId: string): Brief[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM briefs WHERE project_id = ? ORDER BY created_at DESC
  `).all(projectId) as BriefRow[];
  return rows.map(rowToBrief);
}

export function getBriefById(id: string): Brief | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM briefs WHERE id = ?
  `).get(id) as BriefRow | undefined;
  return row ? rowToBrief(row) : null;
}

export function createBrief(data: {
  project_id: string;
  size: { width: number; height: number };
  title: string;
  subtitle?: string;
  info_area?: string;
  brand_colors?: string[];
  banned_colors?: string[];
  tone_weights?: Record<string, number>;
  banned_elements?: string[];
  layout_strategy?: string;
}): Brief {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO briefs (id, project_id, size, title, subtitle, info_area, brand_colors, banned_colors, tone_weights, banned_elements, layout_strategy, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.project_id,
    JSON.stringify(data.size),
    data.title,
    data.subtitle || null,
    data.info_area || null,
    data.brand_colors ? JSON.stringify(data.brand_colors) : null,
    data.banned_colors ? JSON.stringify(data.banned_colors) : null,
    data.tone_weights ? JSON.stringify(data.tone_weights) : null,
    data.banned_elements ? JSON.stringify(data.banned_elements) : null,
    data.layout_strategy || null,
    now,
    now
  );

  return getBriefById(id)!;
}

export function updateBrief(id: string, data: Partial<Omit<Brief, 'id' | 'project_id' | 'created_at' | 'updated_at'>>): Brief | null {
  const db = getDb();
  const existing = getBriefById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE briefs SET
      size = ?,
      title = ?,
      subtitle = ?,
      info_area = ?,
      brand_colors = ?,
      banned_colors = ?,
      tone_weights = ?,
      banned_elements = ?,
      layout_strategy = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    data.size ? JSON.stringify(data.size) : JSON.stringify(existing.size),
    data.title ?? existing.title,
    data.subtitle ?? existing.subtitle ?? null,
    data.info_area ?? existing.info_area ?? null,
    data.brand_colors ? JSON.stringify(data.brand_colors) : (existing.brand_colors ? JSON.stringify(existing.brand_colors) : null),
    data.banned_colors ? JSON.stringify(data.banned_colors) : (existing.banned_colors ? JSON.stringify(existing.banned_colors) : null),
    data.tone_weights ? JSON.stringify(data.tone_weights) : (existing.tone_weights ? JSON.stringify(existing.tone_weights) : null),
    data.banned_elements ? JSON.stringify(data.banned_elements) : (existing.banned_elements ? JSON.stringify(existing.banned_elements) : null),
    data.layout_strategy ?? existing.layout_strategy ?? null,
    now,
    id
  );

  return getBriefById(id);
}

export function deleteBrief(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM briefs WHERE id = ?
  `).run(id);
  return result.changes > 0;
}
