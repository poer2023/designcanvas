// Core types for PosterLab

export interface Project {
    id: string;
    name: string;
    description?: string;
    style_profile_id?: string;
    brief_id?: string;
    cover_image?: string;
    created_at: string;
    updated_at: string;
}

// Space extends Project with template and artifact tracking
export interface Space extends Project {
    template_id?: string;
    recent_artifacts?: string[];
}

// Template for quick-start workflows
export interface Template {
    id: string;
    name: string;
    scene_tags: string[];
    preview_image?: string;
    default_output?: string;
    graph_snapshot: GraphSnapshot;
    skill_versions_lock: Record<string, string>;
    default_params: Record<string, unknown>;
}

export interface StyleProfile {
    id: string;
    name: string;
    version: number;
    summary_s: string;  // Short summary
    summary_m?: string; // Medium summary
    summary_l?: string; // Long summary
    banned_tokens?: string[];
    palette_hint?: string[];
    constraints?: Record<string, unknown>;
    images: string[];   // Portfolio image paths
    created_at: string;
    updated_at: string;
}

export interface Brief {
    id: string;
    project_id: string;
    size: { width: number; height: number };
    title: string;
    subtitle?: string;
    info_area?: string;
    brand_colors?: string[];
    banned_colors?: string[];
    tone_weights?: Record<string, number>;
    banned_elements?: string[];
    layout_strategy?: string;
    created_at: string;
    updated_at: string;
}

export interface RefSet {
    id: string;
    name: string;
    project_id?: string;
    items?: RefSetItem[];
    item_count?: number;
    clusters?: Cluster[];
    cluster_count?: number;
    dedupe_map?: Record<string, string>;
    created_at: string;
    updated_at: string;
}

export interface RefSetItem {
    id: string;
    image_url?: string;
    image_path?: string;
    thumbnail_path?: string;
    source?: string;
    tags?: string[];
    cluster_id?: string | number;
}

export interface Cluster {
    id: string;
    name?: string;
    representative_id: string;
    item_ids: string[];
}

export interface Poster {
    id: string;
    project_id: string;
    image_url: string;
    recipe_id: string;
    seed: number;
    status: 'generated' | 'favorited' | 'rejected';
    tags?: string[];
    created_at: string;
}

export interface Element {
    id: string;
    poster_id: string;
    project_id: string;
    image_url: string;
    mask_url?: string;
    bbox: { x: number; y: number; width: number; height: number };
    semantic_tag?: string;
    note?: string;
    used_count: number;
    created_at: string;
}

export interface Final {
    id: string;
    project_id: string;
    image_url: string;
    recipe_id: string;
    element_ids: string[];
    masks?: {
        background?: string;
        text_area?: string;
    };
    created_at: string;
}

export interface Recipe {
    id: string;
    project_id: string;
    graph_snapshot: GraphSnapshot;
    node_runs: NodeRun[];
    seeds: number[];
    skill_versions: Record<string, string>;
    asset_refs: AssetRef[];
    created_at: string;
}

export interface GraphSnapshot {
    nodes: SkillNode[];
    edges: SkillEdge[];
}

export interface SkillNode {
    id: string;
    type: string;
    skill_id: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    status: 'idle' | 'running' | 'success' | 'fail';
    locked: boolean;
}

export interface SkillEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface NodeRun {
    node_id: string;
    skill_id: string;
    skill_version: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    started_at: string;
    finished_at: string;
    status: 'success' | 'fail';
    error?: string;
}

export interface AssetRef {
    type: 'style' | 'brief' | 'refset' | 'element' | 'poster' | 'final';
    id: string;
}

// Skill types
export interface Skill {
    id: string;
    name: string;
    version: string;
    description: string;
    tags: string[];
    io_schema: {
        input: Record<string, unknown>;
        output: Record<string, unknown>;
    };
    prompt_templates?: Record<string, string>;
    resources?: Record<string, unknown>;
    runtime_policy: {
        default_summary_level: 'S' | 'M' | 'L';
        upgrade_conditions?: string[];
    };
    tests?: SkillTest[];
}

export interface SkillTest {
    name: string;
    input: Record<string, unknown>;
    expected: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
