import { NextRequest, NextResponse } from 'next/server';
import { getBriefsByProjectId, createBrief, getBriefById } from '@/lib/db/briefs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('project_id');
        const briefId = searchParams.get('id');

        if (briefId) {
            const brief = getBriefById(briefId);
            if (!brief) {
                return NextResponse.json(
                    { success: false, error: 'Brief not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, data: brief });
        }

        if (!projectId) {
            return NextResponse.json(
                { success: false, error: 'project_id is required' },
                { status: 400 }
            );
        }

        const briefs = getBriefsByProjectId(projectId);
        return NextResponse.json({ success: true, data: briefs });
    } catch (error) {
        console.error('Error fetching briefs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch briefs' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.project_id) {
            return NextResponse.json(
                { success: false, error: 'project_id is required' },
                { status: 400 }
            );
        }

        if (!body.title) {
            return NextResponse.json(
                { success: false, error: 'title is required' },
                { status: 400 }
            );
        }

        if (!body.size || !body.size.width || !body.size.height) {
            return NextResponse.json(
                { success: false, error: 'size with width and height is required' },
                { status: 400 }
            );
        }

        const brief = createBrief({
            project_id: body.project_id,
            size: body.size,
            title: body.title,
            subtitle: body.subtitle,
            info_area: body.info_area,
            brand_colors: body.brand_colors,
            banned_colors: body.banned_colors,
            tone_weights: body.tone_weights,
            banned_elements: body.banned_elements,
            layout_strategy: body.layout_strategy,
        });

        return NextResponse.json({ success: true, data: brief }, { status: 201 });
    } catch (error) {
        console.error('Error creating brief:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create brief' },
            { status: 500 }
        );
    }
}
