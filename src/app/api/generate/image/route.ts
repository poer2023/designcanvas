/**
 * POST /api/generate/image - Generate images
 * PRD v1.9: Unified image generation endpoint
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getModel } from '@/lib/db/models';
import { getDecryptedApiKey } from '@/lib/db/providers';
import { createJob, updateJobStatus, setJobOutputs, setJobError } from '@/lib/db/jobs';
import { extractProviderId, type GenerateRequest, type GenerationParams } from '@/lib/adapters';

// Import mock adapter to ensure it's registered
import '@/lib/adapters/mock';
// Import real adapters
import '@/lib/adapters/openrouter';
import '@/lib/adapters/cloudflare';
import '@/lib/adapters/huggingface';

interface RequestBody {
    request_id?: string;
    model_id: string;
    mode: 'text2img' | 'img2img';
    prompt: string;
    negative?: string;
    params?: GenerationParams;
    inputs?: {
        image_asset_ids?: string[];
    };
    context?: {
        brief_snapshot_id?: string;
        style_token_id?: string;
        refset_token_id?: string;
    };
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as RequestBody;

        // Validate required fields
        if (!body.model_id || !body.prompt) {
            return NextResponse.json(
                { success: false, error: 'model_id and prompt are required' },
                { status: 400 }
            );
        }

        // Check if model exists and is enabled
        const model = getModel(body.model_id);
        if (!model) {
            return NextResponse.json(
                { success: false, error: 'Model not found' },
                { status: 404 }
            );
        }
        if (!model.is_enabled) {
            return NextResponse.json(
                { success: false, error: 'Model is disabled' },
                { status: 400 }
            );
        }

        // Check provider API key
        const providerId = extractProviderId(body.model_id);
        const apiKey = getDecryptedApiKey(providerId);

        // Mock provider doesn't need API key
        if (providerId !== 'mock' && !apiKey) {
            return NextResponse.json(
                { success: false, error: 'Provider API key not configured' },
                { status: 400 }
            );
        }

        // Create job
        const requestId = body.request_id || uuidv4();
        const mode = body.mode || 'text2img';
        const job = createJob(requestId, body.model_id, mode, body as unknown as Record<string, unknown>);

        // Start async generation
        processGeneration(job.job_id, body, apiKey || '').catch(err => {
            console.error('Generation error:', err);
            setJobError(job.job_id, err.message || 'Unknown error');
        });

        // Return immediately with job info
        return NextResponse.json({
            success: true,
            data: {
                job_id: job.job_id,
                request_id: requestId,
                status: 'queued',
            },
        });
    } catch (error) {
        console.error('Failed to create generation job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create generation job' },
            { status: 500 }
        );
    }
}

async function processGeneration(jobId: string, body: RequestBody, apiKey: string) {
    const providerId = extractProviderId(body.model_id);

    // Update status to running
    updateJobStatus(jobId, 'running');

    try {
        // Import adapter dynamically based on provider
        const { getAdapter } = await import('@/lib/adapters');
        const adapter = getAdapter(providerId);

        if (!adapter) {
            throw new Error(`No adapter found for provider: ${providerId}`);
        }

        // Build request with auth
        const generateRequest = {
            request_id: body.request_id || uuidv4(),
            model_id: body.model_id,
            mode: body.mode || 'text2img',
            prompt: body.prompt,
            negative: body.negative,
            params: body.params || {},
            inputs: body.inputs,
            context: body.context,
            _auth: { apiKey },  // Inject API key for adapter
        };

        // Generate images
        const result = await adapter.generateImage(generateRequest);

        // Save outputs
        setJobOutputs(jobId, {
            asset_ids: result.asset_ids,
            thumbnails: result.thumbnails,
            seeds: result.seeds,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setJobError(jobId, message);
        throw error;
    }
}
