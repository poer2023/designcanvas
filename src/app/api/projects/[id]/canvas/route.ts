import { NextRequest, NextResponse } from 'next/server';
import { getCanvasDocument, saveCanvasDocument } from '@/lib/db/canvasDocuments';
import { getProjectById } from '@/lib/db/projects';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!getProjectById(id)) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: getCanvasDocument(id) });
    } catch (error) {
        console.error('Error fetching canvas document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch canvas document' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        if (!getProjectById(id)) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        if (!body.snapshot || typeof body.snapshot !== 'object') {
            return NextResponse.json(
                { success: false, error: 'snapshot is required' },
                { status: 400 }
            );
        }
        if (!body.force && typeof body.base_version !== 'number') {
            return NextResponse.json(
                { success: false, error: 'base_version is required' },
                { status: 400 }
            );
        }

        const result = saveCanvasDocument(
            id,
            body.snapshot as Record<string, unknown>,
            body.base_version ?? 0,
            {
                force: body.force === true,
                schemaVersion: body.schema_version,
            }
        );

        if (!result.success && result.conflict) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Version conflict',
                    conflict: true,
                    server_version: result.serverVersion,
                },
                { status: 409 }
            );
        }

        return NextResponse.json({ success: true, data: { version: result.version } });
    } catch (error) {
        console.error('Error saving canvas document:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save canvas document' },
            { status: 500 }
        );
    }
}
