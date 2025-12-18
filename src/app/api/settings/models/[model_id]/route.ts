/**
 * GET /api/settings/models/[model_id] - Get single model
 * PUT /api/settings/models/[model_id] - Update model
 * DELETE /api/settings/models/[model_id] - Delete model
 */

import { NextResponse } from 'next/server';
import { getModel, updateModel, deleteModel, toggleModelEnabled, type UpdateModelInput } from '@/lib/db/models';

interface RouteParams {
    params: Promise<{ model_id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { model_id } = await params;
        const model = getModel(model_id);

        if (!model) {
            return NextResponse.json(
                { success: false, error: 'Model not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: model });
    } catch (error) {
        console.error('Failed to get model:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get model' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { model_id } = await params;
        const body = await request.json() as UpdateModelInput & { toggle_enabled?: boolean };

        // Special case: toggle enabled state
        if (body.toggle_enabled) {
            const model = toggleModelEnabled(model_id);
            if (!model) {
                return NextResponse.json(
                    { success: false, error: 'Model not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, data: model });
        }

        const model = updateModel(model_id, body);

        if (!model) {
            return NextResponse.json(
                { success: false, error: 'Model not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: model });
    } catch (error) {
        console.error('Failed to update model:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update model' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { model_id } = await params;
        const deleted = deleteModel(model_id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Model not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete model:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete model' },
            { status: 500 }
        );
    }
}
