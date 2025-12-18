/**
 * GET /api/settings/providers/[provider_id] - Get single provider
 * PUT /api/settings/providers/[provider_id] - Update provider
 * DELETE /api/settings/providers/[provider_id] - Delete provider
 */

import { NextResponse } from 'next/server';
import { getProvider, updateProvider, deleteProvider, type UpdateProviderInput } from '@/lib/db/providers';

interface RouteParams {
    params: Promise<{ provider_id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { provider_id } = await params;
        const provider = getProvider(provider_id);

        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Provider not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: provider });
    } catch (error) {
        console.error('Failed to get provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get provider' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { provider_id } = await params;
        const body = await request.json() as UpdateProviderInput;

        const provider = updateProvider(provider_id, body);

        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Provider not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: provider });
    } catch (error) {
        console.error('Failed to update provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update provider' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { provider_id } = await params;
        const deleted = deleteProvider(provider_id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Provider not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete provider' },
            { status: 500 }
        );
    }
}
