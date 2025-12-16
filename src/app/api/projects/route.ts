import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, createProject } from '@/lib/db/projects';

export async function GET() {
    try {
        const projects = getAllProjects();
        return NextResponse.json({ success: true, data: projects });
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.name || typeof body.name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Project name is required' },
                { status: 400 }
            );
        }

        const project = createProject({
            name: body.name,
            description: body.description,
            style_profile_id: body.style_profile_id,
        });

        return NextResponse.json({ success: true, data: project }, { status: 201 });
    } catch (error) {
        console.error('Error creating project:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create project' },
            { status: 500 }
        );
    }
}
