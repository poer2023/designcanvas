/**
 * PRD v2.0: Graph API Endpoints
 * 
 * GET /api/projects/{id}/graph - Retrieve graph snapshot
 * PUT /api/projects/{id}/graph - Save graph with version conflict handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectById } from '@/lib/db/projects';
import {
    getProjectGraph,
    saveProjectGraph,
    forceSaveProjectGraph,
    createEmptyGraph,
    type GraphSnapshot,
    type Viewport
} from '@/lib/db/projectGraphs';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/{id}/graph
 * 
 * Retrieve the graph snapshot for a project.
 * Returns empty graph if none exists.
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;

        // Verify project exists
        const project = getProjectById(id);
        if (!project) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            );
        }

        // Get or create graph
        let graph = getProjectGraph(id);
        if (!graph) {
            graph = createEmptyGraph(id);
        }

        return NextResponse.json({
            success: true,
            data: {
                project_id: graph.project_id,
                version: graph.version,
                schema_version: graph.schema_version,
                graph_snapshot: graph.graph_snapshot,
                viewport: graph.viewport,
                updated_at: graph.updated_at,
            }
        });
    } catch (error) {
        console.error('Error fetching graph:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch graph' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/projects/{id}/graph
 * 
 * Save graph snapshot with optimistic locking.
 * 
 * Request body:
 * - base_version: number (required for conflict detection)
 * - schema_version: string (optional, defaults to '2.0')
 * - graph_snapshot: { nodes: [], edges: [] }
 * - viewport: { x: number, y: number, zoom: number }
 * - force: boolean (optional, force save ignoring conflicts)
 */
export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Verify project exists
        const project = getProjectById(id);
        if (!project) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            );
        }

        // Validate request body
        if (!body.graph_snapshot || typeof body.graph_snapshot !== 'object') {
            return NextResponse.json(
                { success: false, error: 'graph_snapshot is required' },
                { status: 400 }
            );
        }

        if (!body.viewport || typeof body.viewport !== 'object') {
            return NextResponse.json(
                { success: false, error: 'viewport is required' },
                { status: 400 }
            );
        }

        const graphSnapshot: GraphSnapshot = {
            nodes: body.graph_snapshot.nodes || [],
            edges: body.graph_snapshot.edges || [],
        };

        const viewport: Viewport = {
            x: body.viewport.x ?? 0,
            y: body.viewport.y ?? 0,
            zoom: body.viewport.zoom ?? 1,
        };

        // Force save if requested
        if (body.force) {
            const result = forceSaveProjectGraph(id, graphSnapshot, viewport);
            return NextResponse.json({
                success: true,
                data: {
                    version: result.version,
                    forced: true,
                }
            });
        }

        // Normal save with version check
        if (typeof body.base_version !== 'number') {
            return NextResponse.json(
                { success: false, error: 'base_version is required for non-force saves' },
                { status: 400 }
            );
        }

        const result = saveProjectGraph(id, graphSnapshot, viewport, body.base_version);

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

        return NextResponse.json({
            success: true,
            data: {
                version: result.version,
            }
        });
    } catch (error) {
        console.error('Error saving graph:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save graph' },
            { status: 500 }
        );
    }
}
