/**
 * GET /api/settings/defaults - Get default settings
 * PUT /api/settings/defaults - Update default settings
 */

import { NextResponse } from 'next/server';
import { getDefaults, updateDefaults, type AppDefaults } from '@/lib/db/appSettings';

export async function GET() {
    try {
        const defaults = getDefaults();
        return NextResponse.json({ success: true, data: defaults });
    } catch (error) {
        console.error('Failed to get defaults:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get defaults' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json() as Partial<AppDefaults>;
        const defaults = updateDefaults(body);
        return NextResponse.json({ success: true, data: defaults });
    } catch (error) {
        console.error('Failed to update defaults:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update defaults' },
            { status: 500 }
        );
    }
}
