/**
 * Database Seed Script for Real Providers and Models
 * Run this to populate the database with actual API providers
 */

import { getDb } from './index';

interface ProviderSeed {
    provider_id: string;
    display_name: string;
    base_url: string | null;
    timeout_ms: number;
    max_concurrency: number;
    is_enabled: boolean;
}

interface ModelSeed {
    model_id: string;
    provider_id: string;
    display_name: string;
    remote_model_name: string;
    capabilities: string[];
    is_enabled: boolean;
    sort_order: number;
}

const providers: ProviderSeed[] = [
    {
        provider_id: 'openrouter',
        display_name: 'OpenRouter',
        base_url: 'https://openrouter.ai/api/v1',
        timeout_ms: 120000,
        max_concurrency: 5,
        is_enabled: true,
    },
    {
        provider_id: 'cloudflare',
        display_name: 'Cloudflare Workers AI',
        base_url: 'https://api.cloudflare.com/client/v4',
        timeout_ms: 60000,
        max_concurrency: 10,
        is_enabled: true,
    },
    {
        provider_id: 'huggingface',
        display_name: 'Hugging Face',
        base_url: 'https://api-inference.huggingface.co',
        timeout_ms: 120000,
        max_concurrency: 3,
        is_enabled: true,
    },
];

const models: ModelSeed[] = [
    // OpenRouter models
    {
        model_id: 'openrouter:openai/dall-e-3',
        provider_id: 'openrouter',
        display_name: 'DALL-E 3',
        remote_model_name: 'openai/dall-e-3',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 10,
    },
    {
        model_id: 'openrouter:black-forest-labs/flux-1.1-pro',
        provider_id: 'openrouter',
        display_name: 'FLUX 1.1 Pro',
        remote_model_name: 'black-forest-labs/flux-1.1-pro',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 11,
    },
    {
        model_id: 'openrouter:stability/stable-diffusion-3',
        provider_id: 'openrouter',
        display_name: 'Stable Diffusion 3',
        remote_model_name: 'stability/stable-diffusion-3',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 12,
    },
    // Cloudflare models
    {
        model_id: 'cloudflare:@cf/stabilityai/stable-diffusion-xl-base-1.0',
        provider_id: 'cloudflare',
        display_name: 'Stable Diffusion XL',
        remote_model_name: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 20,
    },
    {
        model_id: 'cloudflare:@cf/bytedance/stable-diffusion-xl-lightning',
        provider_id: 'cloudflare',
        display_name: 'SDXL Lightning',
        remote_model_name: '@cf/bytedance/stable-diffusion-xl-lightning',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 21,
    },
    {
        model_id: 'cloudflare:@cf/black-forest-labs/flux-1-schnell',
        provider_id: 'cloudflare',
        display_name: 'FLUX.1 Schnell',
        remote_model_name: '@cf/black-forest-labs/flux-1-schnell',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 22,
    },
    // Leonardo.AI models (Cloudflare Partner)
    {
        model_id: 'cloudflare:@cf/leonardoai/phoenix-1.0',
        provider_id: 'cloudflare',
        display_name: 'Leonardo Phoenix 1.0',
        remote_model_name: '@cf/leonardoai/phoenix-1.0',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 23,
    },
    {
        model_id: 'cloudflare:@cf/leonardoai/lucid-origin',
        provider_id: 'cloudflare',
        display_name: 'Leonardo Lucid Origin',
        remote_model_name: '@cf/leonardoai/lucid-origin',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 24,
    },
    // Hugging Face models
    {
        model_id: 'huggingface:black-forest-labs/FLUX.1-dev',
        provider_id: 'huggingface',
        display_name: 'FLUX.1 Dev',
        remote_model_name: 'black-forest-labs/FLUX.1-dev',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 30,
    },
    {
        model_id: 'huggingface:stabilityai/stable-diffusion-2-1',
        provider_id: 'huggingface',
        display_name: 'Stable Diffusion 2.1',
        remote_model_name: 'stabilityai/stable-diffusion-2-1',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 31,
    },
    {
        model_id: 'huggingface:runwayml/stable-diffusion-v1-5',
        provider_id: 'huggingface',
        display_name: 'Stable Diffusion 1.5',
        remote_model_name: 'runwayml/stable-diffusion-v1-5',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 32,
    },
    {
        model_id: 'huggingface:stabilityai/stable-diffusion-xl-base-1.0',
        provider_id: 'huggingface',
        display_name: 'Stable Diffusion XL',
        remote_model_name: 'stabilityai/stable-diffusion-xl-base-1.0',
        capabilities: ['text2img'],
        is_enabled: true,
        sort_order: 33,
    },
];

/**
 * Seed providers into the database
 */
export function seedProviders(): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Clear existing placeholder providers (mock providers)
    db.prepare(`DELETE FROM models WHERE provider_id = 'mock'`).run();
    db.prepare(`DELETE FROM providers WHERE provider_id = 'mock'`).run();

    for (const provider of providers) {
        db.prepare(`
            INSERT INTO providers (provider_id, display_name, base_url, timeout_ms, max_concurrency, is_enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id) DO UPDATE SET
                display_name = excluded.display_name,
                base_url = excluded.base_url,
                timeout_ms = excluded.timeout_ms,
                max_concurrency = excluded.max_concurrency,
                updated_at = excluded.updated_at
        `).run(
            provider.provider_id,
            provider.display_name,
            provider.base_url,
            provider.timeout_ms,
            provider.max_concurrency,
            provider.is_enabled ? 1 : 0,
            now,
            now
        );
    }

    console.log(`Seeded ${providers.length} providers`);
}

/**
 * Seed models into the database
 */
export function seedModels(): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Clear existing placeholder models
    db.prepare(`DELETE FROM models WHERE provider_id = 'mock'`).run();

    for (const model of models) {
        db.prepare(`
            INSERT INTO models (model_id, provider_id, display_name, remote_model_name, capabilities, is_enabled, sort_order, default_params_json, is_hidden, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(model_id) DO UPDATE SET
                display_name = excluded.display_name,
                remote_model_name = excluded.remote_model_name,
                capabilities = excluded.capabilities,
                sort_order = excluded.sort_order,
                updated_at = excluded.updated_at
        `).run(
            model.model_id,
            model.provider_id,
            model.display_name,
            model.remote_model_name,
            JSON.stringify(model.capabilities),
            model.is_enabled ? 1 : 0,
            model.sort_order,
            '{}',
            0,
            now,
            now
        );
    }

    console.log(`Seeded ${models.length} models`);
}

/**
 * Run full seed
 */
export function seedAll(): void {
    console.log('Seeding providers and models...');
    seedProviders();
    seedModels();
    console.log('Seed complete!');
}

// Export data for inspection
export { providers, models };
