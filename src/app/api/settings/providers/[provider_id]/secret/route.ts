/**
 * PUT /api/settings/providers/[provider_id]/secret - Set provider API key
 */

import { NextResponse } from 'next/server';
import { setProviderSecret, getProvider } from '@/lib/db/providers';
import { isSecretKeyConfigured } from '@/lib/crypto';

interface RouteParams {
    params: Promise<{ provider_id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { provider_id } = await params;

        // Check if secret key is configured
        if (!isSecretKeyConfigured()) {
            return NextResponse.json(
                { success: false, error: 'APP_SECRET_KEY environment variable is not configured' },
                { status: 500 }
            );
        }

        // Check if provider exists
        const provider = getProvider(provider_id);
        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Provider not found' },
                { status: 404 }
            );
        }

        const body = await request.json() as { api_key: string };

        if (!body.api_key || typeof body.api_key !== 'string') {
            return NextResponse.json(
                { success: false, error: 'api_key is required' },
                { status: 400 }
            );
        }

        setProviderSecret(provider_id, body.api_key);

        return NextResponse.json({
            success: true,
            message: 'API key saved successfully'
        });
    } catch (error) {
        console.error('Failed to set provider secret:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save API key' },
            { status: 500 }
        );
    }
}
