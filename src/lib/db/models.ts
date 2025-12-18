/**
 * Model database operations
 * PRD v1.9: Model registry management
 */

import { getDb } from './index';

export type ModelCapability = 'text2img' | 'img2img' | 'vision';

export interface Model {
    model_id: string;
    provider_id: string;
    display_name: string;
    remote_model_name: string;
    capabilities: ModelCapability[];
    is_enabled: boolean;
    sort_order: number;
    default_params: Record<string, unknown>;
    is_hidden: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateModelInput {
    model_id: string;
    provider_id: string;
    display_name: string;
    remote_model_name: string;
    capabilities?: ModelCapability[];
    is_enabled?: boolean;
    sort_order?: number;
    default_params?: Record<string, unknown>;
    is_hidden?: boolean;
}

export interface UpdateModelInput {
    display_name?: string;
    remote_model_name?: string;
    capabilities?: ModelCapability[];
    is_enabled?: boolean;
    sort_order?: number;
    default_params?: Record<string, unknown>;
    is_hidden?: boolean;
}

export interface ModelFilter {
    enabled?: boolean;
    provider_id?: string;
    capability?: ModelCapability;
    include_hidden?: boolean;
}

interface ModelRow {
    model_id: string;
    provider_id: string;
    display_name: string;
    remote_model_name: string;
    capabilities: string;
    is_enabled: number;
    sort_order: number;
    default_params_json: string;
    is_hidden: number;
    created_at: string;
    updated_at: string;
}

function rowToModel(row: ModelRow): Model {
    return {
        model_id: row.model_id,
        provider_id: row.provider_id,
        display_name: row.display_name,
        remote_model_name: row.remote_model_name,
        capabilities: JSON.parse(row.capabilities) as ModelCapability[],
        is_enabled: Boolean(row.is_enabled),
        sort_order: row.sort_order,
        default_params: JSON.parse(row.default_params_json || '{}'),
        is_hidden: Boolean(row.is_hidden),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Get all models with optional filters
 */
export function getAllModels(filter?: ModelFilter): Model[] {
    const db = getDb();

    let sql = 'SELECT * FROM models WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.enabled !== undefined) {
        sql += ' AND is_enabled = ?';
        params.push(filter.enabled ? 1 : 0);
    }

    if (filter?.provider_id) {
        sql += ' AND provider_id = ?';
        params.push(filter.provider_id);
    }

    if (filter?.capability) {
        sql += ' AND capabilities LIKE ?';
        params.push(`%"${filter.capability}"%`);
    }

    if (!filter?.include_hidden) {
        sql += ' AND is_hidden = 0';
    }

    sql += ' ORDER BY sort_order ASC, display_name ASC';

    const rows = db.prepare(sql).all(...params) as ModelRow[];
    return rows.map(rowToModel);
}

/**
 * Get enabled models only (convenience method for pickers)
 */
export function getEnabledModels(): Model[] {
    return getAllModels({ enabled: true, include_hidden: false });
}

/**
 * Get a single model by ID
 */
export function getModel(modelId: string): Model | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM models WHERE model_id = ?').get(modelId) as ModelRow | undefined;
    if (!row) return null;
    return rowToModel(row);
}

/**
 * Create a new model
 */
export function createModel(input: CreateModelInput): Model {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO models (
            model_id, provider_id, display_name, remote_model_name,
            capabilities, is_enabled, sort_order, default_params_json, is_hidden,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        input.model_id,
        input.provider_id,
        input.display_name,
        input.remote_model_name,
        JSON.stringify(input.capabilities || ['text2img']),
        input.is_enabled !== false ? 1 : 0,
        input.sort_order || 100,
        JSON.stringify(input.default_params || {}),
        input.is_hidden ? 1 : 0,
        now,
        now
    );

    // Log audit
    logAudit('create', 'model', input.model_id, null, JSON.stringify(input));

    return getModel(input.model_id) as Model;
}

/**
 * Update a model
 */
export function updateModel(modelId: string, input: UpdateModelInput): Model | null {
    const db = getDb();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.display_name !== undefined) {
        updates.push('display_name = ?');
        values.push(input.display_name);
    }
    if (input.remote_model_name !== undefined) {
        updates.push('remote_model_name = ?');
        values.push(input.remote_model_name);
    }
    if (input.capabilities !== undefined) {
        updates.push('capabilities = ?');
        values.push(JSON.stringify(input.capabilities));
    }
    if (input.is_enabled !== undefined) {
        updates.push('is_enabled = ?');
        values.push(input.is_enabled ? 1 : 0);
    }
    if (input.sort_order !== undefined) {
        updates.push('sort_order = ?');
        values.push(input.sort_order);
    }
    if (input.default_params !== undefined) {
        updates.push('default_params_json = ?');
        values.push(JSON.stringify(input.default_params));
    }
    if (input.is_hidden !== undefined) {
        updates.push('is_hidden = ?');
        values.push(input.is_hidden ? 1 : 0);
    }

    if (updates.length === 0) {
        return getModel(modelId);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(modelId);

    db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE model_id = ?`).run(...values);

    // Log audit
    logAudit('update', 'model', modelId, null, JSON.stringify(input));

    return getModel(modelId);
}

/**
 * Toggle model enabled state
 */
export function toggleModelEnabled(modelId: string): Model | null {
    const model = getModel(modelId);
    if (!model) return null;
    return updateModel(modelId, { is_enabled: !model.is_enabled });
}

/**
 * Delete a model
 */
export function deleteModel(modelId: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM models WHERE model_id = ?').run(modelId);

    if (result.changes > 0) {
        logAudit('delete', 'model', modelId, null, null);
    }

    return result.changes > 0;
}

/**
 * Get models by provider
 */
export function getModelsByProvider(providerId: string): Model[] {
    return getAllModels({ provider_id: providerId, include_hidden: true });
}

/**
 * Check if model exists
 */
export function modelExists(modelId: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM models WHERE model_id = ?').get(modelId);
    return !!row;
}

/**
 * Log audit entry
 */
function logAudit(
    action: string,
    entityType: string,
    entityId: string,
    oldValue: string | null,
    newValue: string | null
): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, old_value, new_value)
        VALUES (?, ?, ?, ?, ?)
    `).run(action, entityType, entityId, oldValue, newValue);
}
