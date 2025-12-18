/**
 * App Settings database operations
 * PRD v1.9: Global configuration management
 */

import { getDb } from './index';

export interface AppDefaults {
    default_text2img_model_id: string | null;
    default_img2img_model_id: string | null;
    default_ratio: string;
    default_resolution: string;
    default_count: number;
}

const DEFAULT_VALUES: AppDefaults = {
    default_text2img_model_id: null,
    default_img2img_model_id: null,
    default_ratio: '1:1',
    default_resolution: '1K',
    default_count: 4,
};

/**
 * Get a single setting value
 */
export function getSetting<T>(key: string): T | null {
    const db = getDb();
    const row = db.prepare('SELECT value_json FROM app_settings WHERE key = ?').get(key) as { value_json: string } | undefined;
    if (!row) return null;
    try {
        return JSON.parse(row.value_json) as T;
    } catch {
        return null;
    }
}

/**
 * Set a single setting value
 */
export function setSetting<T>(key: string, value: T): void {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO app_settings (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value), now);
}

/**
 * Delete a setting
 */
export function deleteSetting(key: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM app_settings WHERE key = ?').run(key);
    return result.changes > 0;
}

/**
 * Get all default settings
 */
export function getDefaults(): AppDefaults {
    return {
        default_text2img_model_id: getSetting<string>('default_text2img_model_id') ?? DEFAULT_VALUES.default_text2img_model_id,
        default_img2img_model_id: getSetting<string>('default_img2img_model_id') ?? DEFAULT_VALUES.default_img2img_model_id,
        default_ratio: getSetting<string>('default_ratio') ?? DEFAULT_VALUES.default_ratio,
        default_resolution: getSetting<string>('default_resolution') ?? DEFAULT_VALUES.default_resolution,
        default_count: getSetting<number>('default_count') ?? DEFAULT_VALUES.default_count,
    };
}

/**
 * Update default settings
 */
export function updateDefaults(updates: Partial<AppDefaults>): AppDefaults {
    if (updates.default_text2img_model_id !== undefined) {
        setSetting('default_text2img_model_id', updates.default_text2img_model_id);
    }
    if (updates.default_img2img_model_id !== undefined) {
        setSetting('default_img2img_model_id', updates.default_img2img_model_id);
    }
    if (updates.default_ratio !== undefined) {
        setSetting('default_ratio', updates.default_ratio);
    }
    if (updates.default_resolution !== undefined) {
        setSetting('default_resolution', updates.default_resolution);
    }
    if (updates.default_count !== undefined) {
        setSetting('default_count', updates.default_count);
    }

    return getDefaults();
}

/**
 * Get all settings as key-value pairs
 */
export function getAllSettings(): Record<string, unknown> {
    const db = getDb();
    const rows = db.prepare('SELECT key, value_json FROM app_settings').all() as { key: string; value_json: string }[];

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
        try {
            settings[row.key] = JSON.parse(row.value_json);
        } catch {
            settings[row.key] = row.value_json;
        }
    }

    return settings;
}
