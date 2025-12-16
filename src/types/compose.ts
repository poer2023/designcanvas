// Compose and Final poster types

export interface CanvasElement {
    id: string;
    element_id: string;         // Reference to Element in library
    image_url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;           // Degrees
    scale: number;
    zIndex: number;
    locked: boolean;
    visible: boolean;
}

export interface ComposeDraft {
    id: string;
    project_id: string;
    name: string;
    width: number;
    height: number;
    background_color: string;
    elements: CanvasElement[];
    grid_enabled: boolean;
    grid_size: number;
    created_at: string;
    updated_at: string;
}

export interface Final {
    id: string;
    project_id: string;
    image_url: string;
    thumbnail_url?: string;
    recipe_id: string;
    element_ids: string[];
    draft_id?: string;          // Reference to ComposeDraft
    width: number;
    height: number;
    created_at: string;
}

export interface ExportOptions {
    format: 'png' | 'jpg' | 'pdf';
    quality: number;            // 0-100 for jpg
    include_assets: boolean;    // Include element assets
    include_recipe: boolean;    // Include recipe.json
    scale: number;              // 1x, 2x, etc.
}

export interface ExportBundle {
    final_image: string;        // Path to exported image
    assets?: string[];          // Paths to asset files
    recipe?: string;            // Path to recipe.json
    manifest: {
        exported_at: string;
        format: string;
        dimensions: { width: number; height: number };
        elements_count: number;
    };
}
