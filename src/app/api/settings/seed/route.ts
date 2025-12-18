/**
 * POST /api/settings/seed - Seed providers and models
 * Development utility endpoint
 */

import { NextResponse } from 'next/server';
import { seedAll } from '@/lib/db/seed-providers';

export async function POST() {
    try {
        seedAll();
        return NextResponse.json({
            success: true,
            message: 'Providers and models seeded successfully',
        });
    } catch (error) {
        console.error('Seed failed:', error);
        return NextResponse.json(
            { success: false, error: 'Seed failed' },
            { status: 500 }
        );
    }
}
