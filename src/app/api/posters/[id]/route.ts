import { NextRequest, NextResponse } from 'next/server';
import {
    getPosterById,
    updatePosterStatus,
    deletePoster
} from '@/lib/db/posters';
import type { PosterStatus } from '@/types/poster';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const poster = getPosterById(id);

        if (!poster) {
            return NextResponse.json(
                { success: false, error: 'Poster not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: poster });
    } catch (error) {
        console.error('Error fetching poster:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch poster' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body as { status: PosterStatus };

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'Status is required' },
                { status: 400 }
            );
        }

        const poster = updatePosterStatus(id, status);

        if (!poster) {
            return NextResponse.json(
                { success: false, error: 'Poster not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: poster });
    } catch (error) {
        console.error('Error updating poster:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update poster' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const deleted = deletePoster(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Poster not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting poster:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete poster' },
            { status: 500 }
        );
    }
}
