/**
 * Generation Jobs database operations
 * PRD v1.9: Async job management for image generation
 */

import { getDb } from './index';
import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface GenerationJob {
    job_id: string;
    request_id: string;
    model_id: string;
    mode: 'text2img' | 'img2img';
    status: JobStatus;
    request_payload: Record<string, unknown>;
    outputs: {
        asset_ids?: string[];
        thumbnails?: string[];
        seeds?: number[];
    } | null;
    error: string | null;
    created_at: string;
    updated_at: string;
}

interface JobRow {
    job_id: string;
    request_id: string;
    model_id: string;
    mode: string;
    status: string;
    request_payload: string;
    outputs: string | null;
    error: string | null;
    created_at: string;
    updated_at: string;
}

function rowToJob(row: JobRow): GenerationJob {
    return {
        job_id: row.job_id,
        request_id: row.request_id,
        model_id: row.model_id,
        mode: row.mode as 'text2img' | 'img2img',
        status: row.status as JobStatus,
        request_payload: JSON.parse(row.request_payload),
        outputs: row.outputs ? JSON.parse(row.outputs) : null,
        error: row.error,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Create a new generation job
 */
export function createJob(
    requestId: string,
    modelId: string,
    mode: 'text2img' | 'img2img',
    requestPayload: Record<string, unknown>
): GenerationJob {
    const db = getDb();
    const jobId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO generation_jobs (job_id, request_id, model_id, mode, status, request_payload, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)
    `).run(jobId, requestId, modelId, mode, JSON.stringify(requestPayload), now, now);

    return getJob(jobId) as GenerationJob;
}

/**
 * Get a job by ID
 */
export function getJob(jobId: string): GenerationJob | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM generation_jobs WHERE job_id = ?').get(jobId) as JobRow | undefined;
    if (!row) return null;
    return rowToJob(row);
}

/**
 * Get a job by request ID
 */
export function getJobByRequestId(requestId: string): GenerationJob | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM generation_jobs WHERE request_id = ?').get(requestId) as JobRow | undefined;
    if (!row) return null;
    return rowToJob(row);
}

/**
 * Update job status
 */
export function updateJobStatus(jobId: string, status: JobStatus, error?: string): void {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE generation_jobs 
        SET status = ?, error = ?, updated_at = ?
        WHERE job_id = ?
    `).run(status, error || null, now, jobId);
}

/**
 * Set job outputs
 */
export function setJobOutputs(
    jobId: string,
    outputs: { asset_ids: string[]; thumbnails: string[]; seeds?: number[] }
): void {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE generation_jobs 
        SET status = 'done', outputs = ?, updated_at = ?
        WHERE job_id = ?
    `).run(JSON.stringify(outputs), now, jobId);
}

/**
 * Set job error
 */
export function setJobError(jobId: string, error: string): void {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE generation_jobs 
        SET status = 'error', error = ?, updated_at = ?
        WHERE job_id = ?
    `).run(error, now, jobId);
}

/**
 * Get recent jobs
 */
export function getRecentJobs(limit: number = 20): GenerationJob[] {
    const db = getDb();
    const rows = db.prepare(`
        SELECT * FROM generation_jobs 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as JobRow[];

    return rows.map(rowToJob);
}

/**
 * Get pending jobs (queued or running)
 */
export function getPendingJobs(): GenerationJob[] {
    const db = getDb();
    const rows = db.prepare(`
        SELECT * FROM generation_jobs 
        WHERE status IN ('queued', 'running')
        ORDER BY created_at ASC
    `).all() as JobRow[];

    return rows.map(rowToJob);
}

/**
 * Clean up old jobs (older than specified days)
 */
export function cleanupOldJobs(daysOld: number = 7): number {
    const db = getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = db.prepare(`
        DELETE FROM generation_jobs 
        WHERE created_at < ? AND status IN ('done', 'error')
    `).run(cutoff.toISOString());

    return result.changes;
}
