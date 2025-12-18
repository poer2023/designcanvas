/**
 * GET /api/settings/providers - Get all providers
 * POST /api/settings/providers - Create new provider
 */

import { NextResponse } from 'next/server';
import { getAllProviders, createProvider, type CreateProviderInput } from '@/lib/db/providers';

export async function GET() {
    try {
        const providers = getAllProviders();
        return NextResponse.json({ success: true, data: providers });
    } catch (error) {
        console.error('Failed to get providers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get providers' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as CreateProviderInput;

        if (!body.provider_id || !body.display_name) {
            return NextResponse.json(
                { success: false, error: 'provider_id and display_name are required' },
                { status: 400 }
            );
        }

        const provider = createProvider(body);
        return NextResponse.json({ success: true, data: provider }, { status: 201 });
    } catch (error) {
        console.error('Failed to create provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create provider' },
            { status: 500 }
        );
    }
}
