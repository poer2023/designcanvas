/**
 * Provider Adapter Interface
 * PRD v1.9: Unified adapter layer for image generation providers
 */

export interface GenerationParams {
    ratio?: string;
    resolution?: string;
    count?: number;
    seed?: number;
    steps?: number;
    cfg?: number;
    style_strength?: number;
    img2img_strength?: number;
    // img2img support
    reference_images?: string[];  // Base64 or URL reference images
    strength?: number;            // img2img strength (0-1, default 0.7)
}

export interface GenerateRequest {
    request_id: string;
    model_id: string;
    mode: 'text2img' | 'img2img';
    prompt: string;
    negative?: string;
    params: GenerationParams;
    inputs?: {
        image_asset_ids?: string[];
    };
    context?: {
        brief_snapshot_id?: string;
        style_token_id?: string;
        refset_token_id?: string;
    };
}

export interface GenerateResult {
    asset_ids: string[];
    thumbnails: string[];
    seeds: number[];
    metadata?: Record<string, unknown>;
}

export interface GenerateRequestWithAuth extends GenerateRequest {
    _auth?: {
        apiKey: string;
    };
}

export interface TestResult {
    ok: boolean;
    message: string;
    latency_ms?: number;
}

/**
 * Base interface for all provider adapters
 */
export interface ProviderAdapter {
    name: string;

    /**
     * Generate images using this provider
     */
    generateImage(request: GenerateRequest): Promise<GenerateResult>;

    /**
     * Test connection to the provider
     */
    testConnection(): Promise<TestResult>;

    /**
     * Check if this adapter supports a capability
     */
    supportsCapability?(capability: 'text2img' | 'img2img' | 'vision'): boolean;
}

/**
 * Registry of available adapters
 */
const adapterRegistry = new Map<string, ProviderAdapter>();

/**
 * Register an adapter for a provider
 */
export function registerAdapter(providerId: string, adapter: ProviderAdapter): void {
    adapterRegistry.set(providerId, adapter);
}

/**
 * Get adapter for a provider
 */
export function getAdapter(providerId: string): ProviderAdapter | undefined {
    return adapterRegistry.get(providerId);
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): Map<string, ProviderAdapter> {
    return new Map(adapterRegistry);
}

/**
 * Extract provider ID from model ID
 * Model ID format: {provider_id}:{model_name}
 */
export function extractProviderId(modelId: string): string {
    const parts = modelId.split(':');
    return parts[0] || modelId;
}

/**
 * Generate images using the appropriate adapter
 */
export async function generateWithAdapter(
    request: GenerateRequest,
    apiKey: string
): Promise<GenerateResult> {
    const providerId = extractProviderId(request.model_id);
    const adapter = getAdapter(providerId);

    if (!adapter) {
        throw new Error(`No adapter found for provider: ${providerId}`);
    }

    // Inject API key into context (adapters can access it)
    const requestWithAuth = {
        ...request,
        _auth: { apiKey },
    };

    return adapter.generateImage(requestWithAuth as GenerateRequest);
}
