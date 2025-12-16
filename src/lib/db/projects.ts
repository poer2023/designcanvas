import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '@/types';

export function getAllProjects(): Project[] {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM projects ORDER BY updated_at DESC
  `).all() as Project[];
    return rows;
}

export function getProjectById(id: string): Project | null {
    const db = getDb();
    const row = db.prepare(`
    SELECT * FROM projects WHERE id = ?
  `).get(id) as Project | undefined;
    return row || null;
}

export function createProject(data: {
    name: string;
    description?: string;
    style_profile_id?: string;
}): Project {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
    INSERT INTO projects (id, name, description, style_profile_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.description || null, data.style_profile_id || null, now, now);

    return getProjectById(id)!;
}

export function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'description' | 'style_profile_id' | 'brief_id' | 'cover_image'>>): Project | null {
    const db = getDb();
    const existing = getProjectById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
    }
    if (data.style_profile_id !== undefined) {
        updates.push('style_profile_id = ?');
        values.push(data.style_profile_id);
    }
    if (data.brief_id !== undefined) {
        updates.push('brief_id = ?');
        values.push(data.brief_id);
    }
    if (data.cover_image !== undefined) {
        updates.push('cover_image = ?');
        values.push(data.cover_image);
    }

    if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.prepare(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    }

    return getProjectById(id);
}

export function deleteProject(id: string): boolean {
    const db = getDb();
    const result = db.prepare(`
    DELETE FROM projects WHERE id = ?
  `).run(id);
    return result.changes > 0;
}
