import { NextRequest, NextResponse } from 'next/server';
import {
    getRefSetById,
    deleteRefSet,
    addItemsToRefSet,
    updateRefSetClusters,
    getRefSetItems,
    getRefSetClusters
} from '@/lib/db/refsets';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const refset = await getRefSetById(id);

        if (!refset) {
            return NextResponse.json(
                { success: false, error: 'RefSet not found' },
                { status: 404 }
            );
        }

        const items = await getRefSetItems(id);
        const clusters = await getRefSetClusters(id);

        return NextResponse.json({
            success: true,
            data: { ...refset, items, clusters }
        });
    } catch (error) {
        console.error('Error fetching refset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch refset' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, items, clusters } = body;

        const refset = await getRefSetById(id);
        if (!refset) {
            return NextResponse.json(
                { success: false, error: 'RefSet not found' },
                { status: 404 }
            );
        }

        if (action === 'addItems' && items) {
            const newItems = await addItemsToRefSet(id, items);
            return NextResponse.json({ success: true, data: { addedItems: newItems } });
        }

        if (action === 'updateClusters' && clusters) {
            await updateRefSetClusters(id, clusters);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error updating refset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update refset' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const deleted = await deleteRefSet(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'RefSet not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting refset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete refset' },
            { status: 500 }
        );
    }
}
