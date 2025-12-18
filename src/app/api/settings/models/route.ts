/**
 * GET /api/settings/models - Get models (with optional filter)
 * POST /api/settings/models - Create new model
 */

import { NextResponse } from 'next/server';
import { getAllModels, createModel, type CreateModelInput, type ModelFilter } from '@/lib/db/models';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const filter: ModelFilter = {};

        const enabled = searchParams.get('enabled');
        if (enabled === 'true') {
            filter.enabled = true;
        } else if (enabled === 'false') {
            filter.enabled = false;
        }
        // 'all' or no param means no filter

        const providerId = searchParams.get('provider_id');
        if (providerId) {
            filter.provider_id = providerId;
        }

        const capability = searchParams.get('capability');
        if (capability === 'text2img' || capability === 'img2img' || capability === 'vision') {
            filter.capability = capability;
        }

        const includeHidden = searchParams.get('include_hidden');
        if (includeHidden === 'true') {
            filter.include_hidden = true;
        }

        const models = getAllModels(filter);
        return NextResponse.json({ success: true, data: models });
    } catch (error) {
        console.error('Failed to get models:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get models' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as CreateModelInput;

        if (!body.model_id || !body.provider_id || !body.display_name || !body.remote_model_name) {
            return NextResponse.json(
                { success: false, error: 'model_id, provider_id, display_name, and remote_model_name are required' },
                { status: 400 }
            );
        }

        const model = createModel(body);
        return NextResponse.json({ success: true, data: model }, { status: 201 });
    } catch (error) {
        console.error('Failed to create model:', error);

        // Check for unique constraint violation
        if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
            return NextResponse.json(
                { success: false, error: 'Model ID already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to create model' },
            { status: 500 }
        );
    }
}
