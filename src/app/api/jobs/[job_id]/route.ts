/**
 * GET /api/jobs/[job_id] - Get job status
 * PRD v1.9: Job polling endpoint
 */

import { NextResponse } from 'next/server';
import { getJob } from '@/lib/db/jobs';

interface RouteParams {
    params: Promise<{ job_id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { job_id } = await params;
        const job = getJob(job_id);

        if (!job) {
            return NextResponse.json(
                { success: false, error: 'Job not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                job_id: job.job_id,
                request_id: job.request_id,
                model_id: job.model_id,
                mode: job.mode,
                status: job.status,
                outputs: job.outputs,
                error: job.error,
                created_at: job.created_at,
                updated_at: job.updated_at,
            },
        });
    } catch (error) {
        console.error('Failed to get job:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get job' },
            { status: 500 }
        );
    }
}
