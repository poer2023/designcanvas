/**
 * Cloudflare Workers AI Provider Adapter
 * Supports real image generation through Cloudflare's AI API
 * 
 * Configuration:
 * - API Token: From Cloudflare Dashboard → My Profile → API Tokens
 * - Account ID: Can be found in Cloudflare Dashboard URL or in the right sidebar
 *   The account ID should be stored in provider's base_url field as:
 *   https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai
 */

import { v4 as uuidv4 } from 'uuid';
import {
    type ProviderAdapter,
    type GenerateRequest,
    type GenerateResult,
    type TestResult,
    registerAdapter,
} from './index';

interface CloudflareAIResponse {
    result: ArrayBuffer | { image: string };
    success: boolean;
    errors: { message: string; code: number }[];
    messages: string[];
}

/**
 * Cloudflare Workers AI adapter for image generation
 */
class CloudflareAdapter implements ProviderAdapter {
    name = 'Cloudflare Workers AI';

    // Default account ID - user should configure this in provider settings
    // This can be overridden by setting base_url to include the account ID
    private defaultAccountId = '';

    async generateImage(request: GenerateRequest & { _auth?: { apiKey: string } }): Promise<GenerateResult> {
        const apiKey = request._auth?.apiKey;
        if (!apiKey) {
            throw new Error('Cloudflare API token is required');
        }

        // Extract model name from model_id (format: cloudflare:@cf/model-name)
        const modelName = request.model_id.includes(':')
            ? request.model_id.split(':').slice(1).join(':')
            : request.model_id;

        // Try to extract account ID from API key format: accountId:token
        // Or use the account ID from base_url if configured
        const { accountId, token } = this.parseApiKey(apiKey);

        if (!accountId) {
            throw new Error('Account ID required. Set API key as "account_id:api_token" format.');
        }

        const count = request.params.count || 1;
        const asset_ids: string[] = [];
        const thumbnails: string[] = [];
        const seeds: number[] = [];

        // Calculate dimensions
        const dimensions = this.parseDimensions(
            request.params.ratio || '1:1',
            request.params.resolution || '1K'
        );

        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`;

        for (let i = 0; i < count; i++) {
            const seed = request.params.seed !== undefined
                ? request.params.seed + i
                : Math.floor(Math.random() * 1000000);

            try {
                const body = {
                    prompt: request.prompt,
                    negative_prompt: request.negative || '',
                    num_steps: request.params.steps || 20,
                    guidance: request.params.cfg || 7.5,
                    width: dimensions.width,
                    height: dimensions.height,
                };

                console.log(`[Cloudflare] Generating with model: ${modelName}`);
                console.log(`[Cloudflare] Endpoint: ${endpoint}`);
                console.log(`[Cloudflare] Request prompt: "${request.prompt}"`);
                console.log(`[Cloudflare] Request params:`, JSON.stringify(request.params));
                console.log(`[Cloudflare] Dimensions: ${dimensions.width}x${dimensions.height}`);
                console.log(`[Cloudflare] API body:`, JSON.stringify(body));

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[Cloudflare] API error: ${response.status}`, errorText);
                    throw new Error(`Cloudflare API error: ${response.status} - ${errorText}`);
                }

                // Cloudflare returns image as binary data
                const contentType = response.headers.get('content-type');

                if (contentType?.includes('image')) {
                    // Binary image response
                    const imageBuffer = await response.arrayBuffer();
                    const base64 = Buffer.from(imageBuffer).toString('base64');
                    const mimeType = contentType.split(';')[0] || 'image/png';

                    asset_ids.push(uuidv4());
                    thumbnails.push(`data:${mimeType};base64,${base64}`);
                    seeds.push(seed);
                } else {
                    // JSON response with base64 image
                    const data = await response.json() as CloudflareAIResponse;

                    if (!data.success) {
                        const errorMsg = data.errors?.[0]?.message || 'Unknown error';
                        throw new Error(`Cloudflare error: ${errorMsg}`);
                    }

                    if (typeof data.result === 'object' && 'image' in data.result) {
                        asset_ids.push(uuidv4());
                        thumbnails.push(`data:image/png;base64,${data.result.image}`);
                        seeds.push(seed);
                    }
                }
            } catch (error) {
                console.error('[Cloudflare] Generation failed:', error);
                throw error;
            }
        }

        if (thumbnails.length === 0) {
            throw new Error('No images generated');
        }

        return {
            asset_ids,
            thumbnails,
            seeds,
            metadata: {
                provider: 'cloudflare',
                model: modelName,
                prompt: request.prompt,
                params: request.params,
                generated_at: new Date().toISOString(),
            },
        };
    }

    async testConnection(apiKey?: string): Promise<TestResult> {
        if (!apiKey) {
            return {
                ok: false,
                message: 'API token is required',
            };
        }

        const startTime = Date.now();
        const { accountId, token } = this.parseApiKey(apiKey);

        if (!accountId) {
            return {
                ok: false,
                message: 'Please use format: account_id:api_token',
                latency_ms: Date.now() - startTime,
            };
        }

        try {
            // Test by listing AI models
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            const latency = Date.now() - startTime;
            const data = await response.json() as { success: boolean; errors?: { message: string }[] };

            if (response.ok && data.success) {
                return {
                    ok: true,
                    message: 'Connected to Cloudflare Workers AI',
                    latency_ms: latency,
                };
            }

            if (response.status === 401 || response.status === 403) {
                return {
                    ok: false,
                    message: 'Invalid API token or insufficient permissions',
                    latency_ms: latency,
                };
            }

            return {
                ok: false,
                message: data.errors?.[0]?.message || `HTTP ${response.status}`,
                latency_ms: latency,
            };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    supportsCapability(capability: 'text2img' | 'img2img' | 'vision'): boolean {
        return capability === 'text2img';
    }

    private parseApiKey(apiKey: string): { accountId: string | null; token: string } {
        // Format: account_id:api_token
        const colonIndex = apiKey.indexOf(':');
        if (colonIndex === -1) {
            // No colon - assume it's just the token
            return { accountId: null, token: apiKey };
        }
        return {
            accountId: apiKey.slice(0, colonIndex),
            token: apiKey.slice(colonIndex + 1),
        };
    }

    private parseDimensions(ratio: string, resolution: string): { width: number; height: number } {
        // Cloudflare SDXL models support up to 1024x1024
        const resolutionMap: Record<string, number> = {
            '1K': 1024,
            '2K': 1024,
            '4K': 1024,
        };
        const baseDim = resolutionMap[resolution] || 1024;

        const ratioMap: Record<string, [number, number]> = {
            '1:1': [1, 1],
            '3:2': [3, 2],
            '2:3': [2, 3],
            '16:9': [16, 9],
            '9:16': [9, 16],
        };
        const [rw, rh] = ratioMap[ratio] || [1, 1];

        // Dimensions must be divisible by 64 for many models
        if (rw >= rh) {
            const height = Math.round(baseDim * rh / rw);
            return {
                width: Math.floor(baseDim / 64) * 64,
                height: Math.floor(height / 64) * 64,
            };
        } else {
            const width = Math.round(baseDim * rw / rh);
            return {
                width: Math.floor(width / 64) * 64,
                height: Math.floor(baseDim / 64) * 64,
            };
        }
    }
}

// Register the adapter
const cloudflareAdapter = new CloudflareAdapter();
registerAdapter('cloudflare', cloudflareAdapter);

export { CloudflareAdapter, cloudflareAdapter };
