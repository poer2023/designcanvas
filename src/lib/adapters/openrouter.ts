/**
 * OpenRouter Provider Adapter
 * Supports image generation through OpenRouter's unified API
 */

import { v4 as uuidv4 } from 'uuid';
import {
    type ProviderAdapter,
    type GenerateRequest,
    type GenerateResult,
    type TestResult,
    registerAdapter,
} from './index';

interface OpenRouterRequest {
    model: string;
    messages: {
        role: string;
        content: string | ContentPart[];  // Support multimodal content
    }[];
    modalities?: string[];
    max_tokens?: number;
    // Gemini image generation specific
    image_config?: {
        aspect_ratio?: string;
    };
}

// Content parts for multimodal requests
type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

interface OpenRouterResponse {
    id: string;
    choices: {
        message: {
            content: string | {
                type: string;
                image_url?: { url: string };
                text?: string;
            }[];
            // New images array format for Gemini models
            images?: {
                type: string;
                image_url: { url: string };
            }[];
        };
    }[];
    error?: {
        message: string;
        code: string;
    };
}

/**
 * OpenRouter adapter for image generation
 * Uses chat completions with image modality
 */
class OpenRouterAdapter implements ProviderAdapter {
    name = 'OpenRouter';
    private baseUrl = 'https://openrouter.ai/api/v1';

    async generateImage(request: GenerateRequest & { _auth?: { apiKey: string } }): Promise<GenerateResult> {
        const apiKey = request._auth?.apiKey;
        if (!apiKey) {
            throw new Error('OpenRouter API key is required');
        }

        // Extract model name from model_id (format: openrouter:model-name)
        const modelName = request.model_id.includes(':')
            ? request.model_id.split(':')[1]
            : request.model_id;

        const count = request.params.count || 1;
        const asset_ids: string[] = [];
        const thumbnails: string[] = [];
        const seeds: number[] = [];

        // Generate images one at a time (OpenRouter typically returns one image per request)
        for (let i = 0; i < count; i++) {
            const seed = request.params.seed !== undefined
                ? request.params.seed + i
                : Math.floor(Math.random() * 1000000);

            const promptWithParams = this.buildPrompt(request.prompt, request.params, seed, modelName);
            const referenceImages = request.params.reference_images as string[] | undefined;

            // Build content - multimodal if reference images exist
            let content: string | ContentPart[];
            if (referenceImages && referenceImages.length > 0) {
                // Multimodal: text first, then images
                const parts: ContentPart[] = [
                    { type: 'text', text: promptWithParams }
                ];
                for (const imgUrl of referenceImages) {
                    parts.push({
                        type: 'image_url',
                        image_url: { url: imgUrl }
                    });
                }
                content = parts;
            } else {
                content = promptWithParams;
            }

            const body: OpenRouterRequest = {
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content,
                    },
                ],
                modalities: ['text', 'image'],
                max_tokens: 4096,
            };

            // Add image_config for Gemini models (supports aspect ratio)
            if (modelName.includes('gemini') && request.params.ratio) {
                body.image_config = {
                    aspect_ratio: request.params.ratio,
                };
            }

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://posterlab.app',
                    'X-Title': 'PosterLab',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as OpenRouterResponse;

            if (data.error) {
                throw new Error(`OpenRouter error: ${data.error.message}`);
            }

            // Extract image URL from response
            const imageUrl = this.extractImageUrl(data);
            if (imageUrl) {
                asset_ids.push(uuidv4());
                thumbnails.push(imageUrl);
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
                provider: 'openrouter',
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
                message: 'API key is required',
            };
        }

        const startTime = Date.now();

        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
                return {
                    ok: true,
                    message: 'Connected to OpenRouter',
                    latency_ms: latency,
                };
            } else if (response.status === 401) {
                return {
                    ok: false,
                    message: 'Invalid API key',
                    latency_ms: latency,
                };
            } else if (response.status === 429) {
                return {
                    ok: false,
                    message: 'Rate limited',
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
        // OpenRouter supports text2img through various models
        return capability === 'text2img';
    }

    private buildPrompt(prompt: string, params: GenerateRequest['params'], seed: number, modelName?: string): string {
        const parts = [prompt];

        // Add aspect ratio hint if specified (skip for Gemini models which use image_config)
        const isGemini = modelName?.includes('gemini');
        if (!isGemini && params.ratio && params.ratio !== '1:1') {
            parts.push(`Aspect ratio: ${params.ratio}`);
        }

        // Add seed for reproducibility (where supported, skip for Gemini)
        if (!isGemini) {
            parts.push(`[seed: ${seed}]`);
        }

        return parts.join('. ');
    }

    private extractImageUrl(response: OpenRouterResponse): string | null {
        const message = response.choices?.[0]?.message;
        if (!message) return null;

        // Handle new images array format (Gemini models)
        if (message.images && message.images.length > 0) {
            const firstImage = message.images[0];
            if (firstImage.image_url?.url) {
                return firstImage.image_url.url;
            }
        }

        const content = message.content;
        if (!content) return null;

        // Handle array content (multimodal response)
        if (Array.isArray(content)) {
            for (const part of content) {
                if (part.type === 'image_url' && part.image_url?.url) {
                    return part.image_url.url;
                }
            }
        }

        // Handle string content with base64 image
        if (typeof content === 'string') {
            // Check for data URL
            const dataUrlMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
            if (dataUrlMatch) {
                return dataUrlMatch[0];
            }

            // Check for regular URL
            const urlMatch = content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp|gif)/i);
            if (urlMatch) {
                return urlMatch[0];
            }
        }

        return null;
    }
}

// Register the adapter
const openRouterAdapter = new OpenRouterAdapter();
registerAdapter('openrouter', openRouterAdapter);

export { OpenRouterAdapter, openRouterAdapter };
