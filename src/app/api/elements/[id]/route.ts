import { NextRequest, NextResponse } from 'next/server';
import {
    getElementById,
    updateElement,
    deleteElement
} from '@/lib/db/elements';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const element = getElementById(id);

        if (!element) {
            return NextResponse.json(
                { success: false, error: 'Element not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: element });
    } catch (error) {
        console.error('Error fetching element:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch element' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { semantic_tag, note } = body;

        const element = updateElement(id, { semantic_tag, note });

        if (!element) {
            return NextResponse.json(
                { success: false, error: 'Element not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: element });
    } catch (error) {
        console.error('Error updating element:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update element' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const deleted = deleteElement(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Element not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting element:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete element' },
            { status: 500 }
        );
    }
}
