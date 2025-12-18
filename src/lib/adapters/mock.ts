/**
 * Mock Provider Adapter
 * PRD v1.9: Development/testing adapter that generates placeholder images
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
 * Mock adapter for development and testing
 * Generates placeholder images without calling any external API
 */
class MockAdapter implements ProviderAdapter {
    name = 'Mock Provider';

    async generateImage(request: GenerateRequest): Promise<GenerateResult> {
        // Simulate network delay
        const delay = 500 + Math.random() * 1500;
        await new Promise(resolve => setTimeout(resolve, delay));

        const count = request.params.count || 4;
        const seeds: number[] = [];
        const asset_ids: string[] = [];
        const thumbnails: string[] = [];

        // Parse dimensions from ratio
        const dimensions = this.parseDimensions(
            request.params.ratio || '1:1',
            request.params.resolution || '1K'
        );

        for (let i = 0; i < count; i++) {
            const seed = request.params.seed !== undefined
                ? request.params.seed + i
                : Math.floor(Math.random() * 1000000);

            seeds.push(seed);
            asset_ids.push(uuidv4());

            // Generate placeholder image URL
            // Using picsum.photos for realistic placeholder images
            const imageUrl = this.generatePlaceholderUrl(
                dimensions.width,
                dimensions.height,
                seed,
                request.prompt
            );
            thumbnails.push(imageUrl);
        }

        return {
            asset_ids,
            thumbnails,
            seeds,
            metadata: {
                provider: 'mock',
                model: request.model_id,
                prompt: request.prompt,
                params: request.params,
                generated_at: new Date().toISOString(),
            },
        };
    }

    async testConnection(): Promise<TestResult> {
        // Mock always succeeds
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            ok: true,
            message: 'Mock provider is always available',
            latency_ms: 200,
        };
    }

    supportsCapability(capability: 'text2img' | 'img2img' | 'vision'): boolean {
        return capability === 'text2img' || capability === 'img2img';
    }

    private parseDimensions(ratio: string, resolution: string): { width: number; height: number } {
        const resolutionMap: Record<string, number> = {
            '1K': 1024,
            '2K': 2048,
            '4K': 4096,
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

        // Calculate dimensions maintaining the base dimension for the larger side
        if (rw >= rh) {
            return {
                width: baseDim,
                height: Math.round(baseDim * rh / rw),
            };
        } else {
            return {
                width: Math.round(baseDim * rw / rh),
                height: baseDim,
            };
        }
    }

    private generatePlaceholderUrl(
        width: number,
        height: number,
        seed: number,
        _prompt: string
    ): string {
        // Use picsum.photos for realistic placeholder images
        // The seed is used as the image ID for consistency
        const imageId = seed % 1000;

        // Limit dimensions for placeholder service (max 2000)
        const w = Math.min(width, 2000);
        const h = Math.min(height, 2000);

        return `https://picsum.photos/seed/${imageId}/${w}/${h}`;
    }
}

// Register the mock adapter
const mockAdapter = new MockAdapter();
registerAdapter('mock', mockAdapter);

export { MockAdapter, mockAdapter };
