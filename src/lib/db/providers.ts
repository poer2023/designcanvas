/**
 * Provider database operations
 * PRD v1.9: Provider configuration management
 */

import { getDb } from './index';
import { encrypt, decrypt, isSecretKeyConfigured } from '../crypto';

export interface Provider {
    provider_id: string;
    display_name: string;
    base_url: string | null;
    timeout_ms: number;
    max_concurrency: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProviderWithStatus extends Provider {
    has_api_key: boolean;
    last_test_status: 'ok' | 'invalid' | 'missing' | 'rate_limited' | 'unknown';
    last_test_at: string | null;
}

export interface CreateProviderInput {
    provider_id: string;
    display_name: string;
    base_url?: string;
    timeout_ms?: number;
    max_concurrency?: number;
    is_enabled?: boolean;
}

export interface UpdateProviderInput {
    display_name?: string;
    base_url?: string;
    timeout_ms?: number;
    max_concurrency?: number;
    is_enabled?: boolean;
}

/**
 * Get all providers with their status
 */
export function getAllProviders(): ProviderWithStatus[] {
    const db = getDb();
    const rows = db.prepare(`
        SELECT 
            p.*,
            CASE WHEN ps.api_key_encrypted IS NOT NULL THEN 1 ELSE 0 END as has_api_key,
            COALESCE(ps.last_test_status, 'unknown') as last_test_status,
            ps.last_test_at
        FROM providers p
        LEFT JOIN provider_secrets ps ON p.provider_id = ps.provider_id
        ORDER BY p.display_name
    `).all() as (Provider & { has_api_key: number; last_test_status: string; last_test_at: string | null })[];

    return rows.map(row => ({
        ...row,
        is_enabled: Boolean(row.is_enabled),
        has_api_key: Boolean(row.has_api_key),
        last_test_status: row.last_test_status as ProviderWithStatus['last_test_status'],
    }));
}

/**
 * Get a single provider by ID
 */
export function getProvider(providerId: string): ProviderWithStatus | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT 
            p.*,
            CASE WHEN ps.api_key_encrypted IS NOT NULL THEN 1 ELSE 0 END as has_api_key,
            COALESCE(ps.last_test_status, 'unknown') as last_test_status,
            ps.last_test_at
        FROM providers p
        LEFT JOIN provider_secrets ps ON p.provider_id = ps.provider_id
        WHERE p.provider_id = ?
    `).get(providerId) as (Provider & { has_api_key: number; last_test_status: string; last_test_at: string | null }) | undefined;

    if (!row) return null;

    return {
        ...row,
        is_enabled: Boolean(row.is_enabled),
        has_api_key: Boolean(row.has_api_key),
        last_test_status: row.last_test_status as ProviderWithStatus['last_test_status'],
    };
}

/**
 * Create a new provider
 */
export function createProvider(input: CreateProviderInput): Provider {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO providers (provider_id, display_name, base_url, timeout_ms, max_concurrency, is_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        input.provider_id,
        input.display_name,
        input.base_url || null,
        input.timeout_ms || 30000,
        input.max_concurrency || 5,
        input.is_enabled !== false ? 1 : 0,
        now,
        now
    );

    return getProvider(input.provider_id) as Provider;
}

/**
 * Update a provider
 */
export function updateProvider(providerId: string, input: UpdateProviderInput): Provider | null {
    const db = getDb();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.display_name !== undefined) {
        updates.push('display_name = ?');
        values.push(input.display_name);
    }
    if (input.base_url !== undefined) {
        updates.push('base_url = ?');
        values.push(input.base_url || null);
    }
    if (input.timeout_ms !== undefined) {
        updates.push('timeout_ms = ?');
        values.push(input.timeout_ms);
    }
    if (input.max_concurrency !== undefined) {
        updates.push('max_concurrency = ?');
        values.push(input.max_concurrency);
    }
    if (input.is_enabled !== undefined) {
        updates.push('is_enabled = ?');
        values.push(input.is_enabled ? 1 : 0);
    }

    if (updates.length === 0) {
        return getProvider(providerId);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(providerId);

    db.prepare(`
        UPDATE providers SET ${updates.join(', ')} WHERE provider_id = ?
    `).run(...values);

    // Log audit
    logAudit('update', 'provider', providerId, null, JSON.stringify(input));

    return getProvider(providerId);
}

/**
 * Delete a provider
 */
export function deleteProvider(providerId: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM providers WHERE provider_id = ?').run(providerId);
    return result.changes > 0;
}

/**
 * Set provider API key (encrypted storage)
 */
export function setProviderSecret(providerId: string, apiKey: string): void {
    if (!isSecretKeyConfigured()) {
        throw new Error('APP_SECRET_KEY must be configured to store API keys');
    }

    const db = getDb();
    const encrypted = encrypt(apiKey);
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO provider_secrets (provider_id, api_key_encrypted, last_test_status, last_test_at)
        VALUES (?, ?, 'unknown', ?)
        ON CONFLICT(provider_id) DO UPDATE SET
            api_key_encrypted = excluded.api_key_encrypted,
            last_test_status = 'unknown',
            last_test_at = excluded.last_test_at
    `).run(providerId, encrypted, now);

    // Log audit (don't log the actual key!)
    logAudit('set_secret', 'provider', providerId, null, 'API key updated');
}

/**
 * Get decrypted API key for internal use
 */
export function getDecryptedApiKey(providerId: string): string | null {
    const db = getDb();
    const row = db.prepare(
        'SELECT api_key_encrypted FROM provider_secrets WHERE provider_id = ?'
    ).get(providerId) as { api_key_encrypted: string } | undefined;

    if (!row) return null;

    try {
        return decrypt(row.api_key_encrypted);
    } catch (error) {
        console.error('Failed to decrypt API key:', error);
        return null;
    }
}

/**
 * Update provider test status
 */
export function updateProviderTestStatus(
    providerId: string,
    status: 'ok' | 'invalid' | 'missing' | 'rate_limited'
): void {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE provider_secrets 
        SET last_test_status = ?, last_test_at = ?
        WHERE provider_id = ?
    `).run(status, now, providerId);
}

/**
 * Check if provider has API key
 */
export function hasApiKey(providerId: string): boolean {
    const db = getDb();
    const row = db.prepare(
        'SELECT 1 FROM provider_secrets WHERE provider_id = ? AND api_key_encrypted IS NOT NULL'
    ).get(providerId);
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
