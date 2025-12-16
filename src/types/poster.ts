// Poster and Gallery types

export type PosterStatus = 'generated' | 'favorite' | 'rejected' | 'archived';

export interface Poster {
    id: string;
    project_id: string;
    image_url: string;
    thumbnail_url?: string;
    recipe_id: string;
    seed: number;
    status: PosterStatus;
    tags: string[];
    width?: number;
    height?: number;
    prompt_summary?: string;
    created_at: string;
}

export interface Recipe {
    id: string;
    project_id: string;
    graph_snapshot: Record<string, unknown>;
    node_runs: NodeRun[];
    seeds: number[];
    skill_versions: Record<string, string>;
    asset_refs: AssetRef[];
    created_at: string;
}

export interface NodeRun {
    node_id: string;
    skill_id: string;
    status: 'success' | 'fail';
    input_summary: Record<string, unknown>;
    output_summary: Record<string, unknown>;
    duration_ms: number;
    started_at: string;
    finished_at: string;
}

export interface AssetRef {
    type: 'style' | 'brief' | 'refset' | 'element';
    id: string;
    version?: number;
}

export interface GenerationRequest {
    project_id: string;
    prompts: string[];
    count: number;
    width: number;
    height: number;
    quality: 'draft' | 'standard' | 'high';
    style_id?: string;
    brief_id?: string;
    refset_id?: string;
}

export interface GenerationResult {
    posters: Poster[];
    recipe_id: string;
    total_duration_ms: number;
}
