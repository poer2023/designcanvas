// Element types for extracted poster elements

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Element {
    id: string;
    poster_id: string;
    project_id: string;
    image_url: string;      // Cropped element image
    mask_url?: string;      // Alpha mask image
    bbox: BoundingBox;
    semantic_tag?: string;  // e.g., "background", "text", "logo", "person"
    note?: string;          // User notes about why they liked this element
    used_count: number;     // How many times used in compositions
    created_at: string;
}

export interface SelectionPath {
    type: 'rectangle' | 'lasso';
    points: Array<{ x: number; y: number }>;
}

export interface ElementExtractRequest {
    poster_id: string;
    project_id: string;
    selection: SelectionPath;
    semantic_tag?: string;
    note?: string;
}

export interface ElementCreateInput {
    poster_id: string;
    project_id: string;
    image_url: string;
    mask_url?: string;
    bbox: BoundingBox;
    semantic_tag?: string;
    note?: string;
}
