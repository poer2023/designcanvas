// RefSet and Inspiration Pool types

export interface RefSetItem {
    id: string;
    refset_id: string;
    image_path: string;
    thumbnail_path?: string;
    phash?: string; // Perceptual hash for deduplication
    cluster_id?: number;
    width?: number;
    height?: number;
    file_size?: number;
    is_duplicate: boolean;
    duplicate_of?: string; // ID of the original if this is a duplicate
    created_at: string;
}

export interface RefSet {
    id: string;
    project_id?: string;
    name: string;
    description?: string;
    item_count: number;
    cluster_count: number;
    created_at: string;
    updated_at: string;
}

export interface Cluster {
    id: number;
    refset_id: string;
    name?: string;
    representative_image?: string; // Path to cluster representative
    item_count: number;
    is_selected: boolean; // Whether to include in final refset
}

export interface InspirationUpload {
    files: File[];
    name: string;
    projectId?: string;
}

export interface DeduplicationResult {
    total: number;
    unique: number;
    duplicates: number;
    duplicateGroups: Array<{
        original: string;
        duplicates: string[];
    }>;
}

export interface ClusteringResult {
    clusterCount: number;
    clusters: Cluster[];
    items: Pick<RefSetItem, 'id' | 'cluster_id'>[];
}
