import { NextRequest, NextResponse } from 'next/server';
import {
    getAllRefSets,
    getRefSetsByProject,
    createRefSet,
    getRefSetById,
    getRefSetItems
} from '@/lib/db/refsets';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const id = searchParams.get('id');

        if (id) {
            const refset = await getRefSetById(id);
            if (!refset) {
                return NextResponse.json(
                    { success: false, error: 'RefSet not found' },
                    { status: 404 }
                );
            }
            const items = await getRefSetItems(id);
            return NextResponse.json({ success: true, data: { ...refset, items } });
        }

        const refsets = projectId
            ? await getRefSetsByProject(projectId)
            : await getAllRefSets();

        return NextResponse.json({ success: true, data: refsets });
    } catch (error) {
        console.error('Error fetching refsets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch refsets' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, projectId, items } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        const refset = await createRefSet({ name, projectId, items });
        return NextResponse.json({ success: true, data: refset });
    } catch (error) {
        console.error('Error creating refset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create refset' },
            { status: 500 }
        );
    }
}
