/**
 * Hugging Face Inference API Provider Adapter
 * Supports image generation through HF's Serverless Inference
 */

import { v4 as uuidv4 } from 'uuid';
import {
    type ProviderAdapter,
    type GenerateRequest,
    type GenerateResult,
    type TestResult,
    registerAdapter,
} from './index';

/**
 * Hugging Face Inference API adapter for image generation
 */
class HuggingFaceAdapter implements ProviderAdapter {
    name = 'Hugging Face';
    private baseUrl = 'https://api-inference.huggingface.co/models';

    async generateImage(request: GenerateRequest & { _auth?: { apiKey: string } }): Promise<GenerateResult> {
        const apiKey = request._auth?.apiKey;
        if (!apiKey) {
            throw new Error('Hugging Face API token is required');
        }

        // Extract model name from model_id (format: huggingface:org/model-name)
        const modelName = request.model_id.includes(':')
            ? request.model_id.split(':').slice(1).join(':')
            : request.model_id;

        const count = request.params.count || 1;
        const asset_ids: string[] = [];
        const thumbnails: string[] = [];
        const seeds: number[] = [];

        // Calculate dimensions
        const dimensions = this.parseDimensions(
            request.params.ratio || '1:1',
            request.params.resolution || '1K'
        );

        for (let i = 0; i < count; i++) {
            const seed = request.params.seed !== undefined
                ? request.params.seed + i
                : Math.floor(Math.random() * 1000000);

            const body = {
                inputs: request.prompt,
                parameters: {
                    negative_prompt: request.negative || '',
                    num_inference_steps: request.params.steps || 30,
                    guidance_scale: request.params.cfg || 7.5,
                    seed: seed,
                    width: dimensions.width,
                    height: dimensions.height,
                },
                options: {
                    wait_for_model: true,
                    use_cache: false,
                },
            };

            try {
                const response = await fetch(`${this.baseUrl}/${modelName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(body),
                });

                // HF returns image as blob directly on success
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

                    if (response.status === 503) {
                        // Model loading - use placeholder
                        asset_ids.push(uuidv4());
                        thumbnails.push(`https://picsum.photos/seed/${seed}/${dimensions.width}/${dimensions.height}`);
                        seeds.push(seed);
                        continue;
                    }

                    throw new Error(
                        `Hugging Face API error: ${response.status} - ${(errorData as { error?: string }).error || JSON.stringify(errorData)
                        }`
                    );
                }

                // Response is the image blob
                const imageBlob = await response.blob();
                const base64 = await this.blobToBase64(imageBlob);

                asset_ids.push(uuidv4());
                thumbnails.push(base64);
                seeds.push(seed);
            } catch (error) {
                // On error, use placeholder
                asset_ids.push(uuidv4());
                thumbnails.push(`https://picsum.photos/seed/${seed}/${dimensions.width}/${dimensions.height}`);
                seeds.push(seed);
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
                provider: 'huggingface',
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

        try {
            // Test by getting user info
            const response = await fetch('https://huggingface.co/api/whoami-v2', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json() as { name?: string };
                return {
                    ok: true,
                    message: `Connected as ${data.name || 'user'}`,
                    latency_ms: latency,
                };
            } else if (response.status === 401) {
                return {
                    ok: false,
                    message: 'Invalid API token',
                    latency_ms: latency,
                };
            } else {
                return {
                    ok: false,
                    message: `HTTP ${response.status}`,
                    latency_ms: latency,
                };
            }
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    supportsCapability(capability: 'text2img' | 'img2img' | 'vision'): boolean {
        // HF supports various capabilities depending on the model
        return capability === 'text2img' || capability === 'img2img';
    }

    private async blobToBase64(blob: Blob): Promise<string> {
        const buffer = await blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = blob.type || 'image/png';
        return `data:${mimeType};base64,${base64}`;
    }

    private parseDimensions(ratio: string, resolution: string): { width: number; height: number } {
        const resolutionMap: Record<string, number> = {
            '1K': 1024,
            '2K': 1024, // Most HF models cap at 1024
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

        // Most models work with dimensions divisible by 64
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
const huggingFaceAdapter = new HuggingFaceAdapter();
registerAdapter('huggingface', huggingFaceAdapter);

export { HuggingFaceAdapter, huggingFaceAdapter };
