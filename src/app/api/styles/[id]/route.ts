import { NextRequest, NextResponse } from 'next/server';
import { getStyleProfileById, updateStyleProfile, deleteStyleProfile } from '@/lib/db/styles';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const style = getStyleProfileById(id);

        if (!style) {
            return NextResponse.json(
                { success: false, error: 'Style profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: style });
    } catch (error) {
        console.error('Error fetching style profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch style profile' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const style = updateStyleProfile(id, {
            name: body.name,
            summary_s: body.summary_s,
            summary_m: body.summary_m,
            summary_l: body.summary_l,
            banned_tokens: body.banned_tokens,
            palette_hint: body.palette_hint,
            constraints: body.constraints,
            images: body.images,
        });

        if (!style) {
            return NextResponse.json(
                { success: false, error: 'Style profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: style });
    } catch (error) {
        console.error('Error updating style profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update style profile' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const deleted = deleteStyleProfile(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Style profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: { deleted: true } });
    } catch (error) {
        console.error('Error deleting style profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete style profile' },
            { status: 500 }
        );
    }
}
