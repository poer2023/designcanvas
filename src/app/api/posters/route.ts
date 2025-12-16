import { NextRequest, NextResponse } from 'next/server';
import {
    getAllPosters,
    getPostersByProject,
    getPostersByStatus,
    createPoster,
    createPosterBatch,
    getPosterCount
} from '@/lib/db/posters';
import type { PosterStatus } from '@/types/poster';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status') as PosterStatus | null;

        let posters;
        if (projectId) {
            posters = getPostersByProject(projectId);
        } else if (status) {
            posters = getPostersByStatus(status);
        } else {
            posters = getAllPosters();
        }

        const count = getPosterCount(projectId || undefined);

        return NextResponse.json({
            success: true,
            data: posters,
            meta: { total: count }
        });
    } catch (error) {
        console.error('Error fetching posters:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch posters' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { posters: posterInputs, ...single } = body;

        // Batch creation
        if (posterInputs && Array.isArray(posterInputs)) {
            const posters = createPosterBatch(posterInputs);
            return NextResponse.json({ success: true, data: posters });
        }

        // Single creation
        if (!single.project_id || !single.image_url || !single.recipe_id || single.seed === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const poster = createPoster(single);
        return NextResponse.json({ success: true, data: poster });
    } catch (error) {
        console.error('Error creating poster:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create poster' },
            { status: 500 }
        );
    }
}
