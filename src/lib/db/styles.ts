import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { StyleProfile } from '@/types';

interface StyleProfileRow {
  id: string;
  name: string;
  version: number;
  summary_s: string;
  summary_m: string | null;
  summary_l: string | null;
  banned_tokens: string | null;
  palette_hint: string | null;
  constraints: string | null;
  images: string;
  created_at: string;
  updated_at: string;
}

function rowToStyleProfile(row: StyleProfileRow): StyleProfile {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    summary_s: row.summary_s,
    summary_m: row.summary_m ?? undefined,
    summary_l: row.summary_l ?? undefined,
    banned_tokens: row.banned_tokens ? JSON.parse(row.banned_tokens) : undefined,
    palette_hint: row.palette_hint ? JSON.parse(row.palette_hint) : undefined,
    constraints: row.constraints ? JSON.parse(row.constraints) : undefined,
    images: JSON.parse(row.images),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getAllStyleProfiles(): StyleProfile[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM style_profiles ORDER BY updated_at DESC
  `).all() as StyleProfileRow[];
  return rows.map(rowToStyleProfile);
}

export function getStyleProfileById(id: string): StyleProfile | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM style_profiles WHERE id = ?
  `).get(id) as StyleProfileRow | undefined;
  return row ? rowToStyleProfile(row) : null;
}

export function createStyleProfile(data: {
  name: string;
  summary_s: string;
  summary_m?: string;
  summary_l?: string;
  banned_tokens?: string[];
  palette_hint?: string[];
  constraints?: Record<string, unknown>;
  images: string[];
}): StyleProfile {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO style_profiles (id, name, version, summary_s, summary_m, summary_l, banned_tokens, palette_hint, constraints, images, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    1,
    data.summary_s,
    data.summary_m || null,
    data.summary_l || null,
    data.banned_tokens ? JSON.stringify(data.banned_tokens) : null,
    data.palette_hint ? JSON.stringify(data.palette_hint) : null,
    data.constraints ? JSON.stringify(data.constraints) : null,
    JSON.stringify(data.images),
    now,
    now
  );

  return getStyleProfileById(id)!;
}

export function updateStyleProfile(id: string, data: Partial<Omit<StyleProfile, 'id' | 'created_at' | 'updated_at'>>): StyleProfile | null {
  const db = getDb();
  const existing = getStyleProfileById(id);
  if (!existing) return null;

  // Increment version on update
  const newVersion = existing.version + 1;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE style_profiles SET
      name = ?,
      version = ?,
      summary_s = ?,
      summary_m = ?,
      summary_l = ?,
      banned_tokens = ?,
      palette_hint = ?,
      constraints = ?,
      images = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? existing.name,
    newVersion,
    data.summary_s ?? existing.summary_s,
    data.summary_m ?? existing.summary_m ?? null,
    data.summary_l ?? existing.summary_l ?? null,
    data.banned_tokens ? JSON.stringify(data.banned_tokens) : (existing.banned_tokens ? JSON.stringify(existing.banned_tokens) : null),
    data.palette_hint ? JSON.stringify(data.palette_hint) : (existing.palette_hint ? JSON.stringify(existing.palette_hint) : null),
    data.constraints ? JSON.stringify(data.constraints) : (existing.constraints ? JSON.stringify(existing.constraints) : null),
    data.images ? JSON.stringify(data.images) : JSON.stringify(existing.images),
    now,
    id
  );

  return getStyleProfileById(id);
}

export function deleteStyleProfile(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM style_profiles WHERE id = ?
  `).run(id);
  return result.changes > 0;
}
