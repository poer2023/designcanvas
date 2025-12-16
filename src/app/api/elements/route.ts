import { NextRequest, NextResponse } from 'next/server';
import {
    getAllElements,
    getElementsByProject,
    getElementsByTag,
    createElement,
    getElementCount,
    getUniqueElementTags
} from '@/lib/db/elements';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const tag = searchParams.get('tag');
        const tagsOnly = searchParams.get('tagsOnly');

        if (tagsOnly === 'true') {
            const tags = getUniqueElementTags();
            return NextResponse.json({ success: true, data: tags });
        }

        let elements;
        if (projectId) {
            elements = getElementsByProject(projectId);
        } else if (tag) {
            elements = getElementsByTag(tag);
        } else {
            elements = getAllElements();
        }

        const count = getElementCount(projectId || undefined);

        return NextResponse.json({
            success: true,
            data: elements,
            meta: { total: count }
        });
    } catch (error) {
        console.error('Error fetching elements:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch elements' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { poster_id, project_id, image_url, mask_url, bbox, semantic_tag, note } = body;

        if (!poster_id || !project_id || !image_url || !bbox) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const element = createElement({
            poster_id,
            project_id,
            image_url,
            mask_url,
            bbox,
            semantic_tag,
            note,
        });

        return NextResponse.json({ success: true, data: element });
    } catch (error) {
        console.error('Error creating element:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create element' },
            { status: 500 }
        );
    }
}
