// Skills system type definitions (v1.7)

// =============================================================================
// Port Types - 用于类型化连接
// =============================================================================

export type PortType = 'brief' | 'style' | 'refset' | 'image' | 'context' | 'candidates' | 'elements' | 'any';

export interface PortDefinition {
    id: string;
    type: PortType;
    label: string;
    multiple?: boolean; // 是否允许多个连接
}

// 各节点类型的输入/输出端口定义
// PRD v2.0: Handle IDs must match exactly for proper edge → subscription binding
export const NODE_PORTS: Record<string, { inputs: PortDefinition[]; outputs: PortDefinition[] }> = {
    // ImageGen (ImageStudio / imageCard with mode=studio)
    imageStudio: {
        inputs: [
            { id: 'briefIn', type: 'brief', label: 'Brief' },
            { id: 'styleIn', type: 'style', label: 'Style' },
            { id: 'refsetIn', type: 'refset', label: 'RefSet' },
            { id: 'imageIn', type: 'image', label: 'Image' },
        ],
        outputs: [
            { id: 'imageOut', type: 'image', label: 'Image' },
            { id: 'contextOut', type: 'context', label: 'Context' },
        ],
    },
    // ImageCard (mode=raw) - raw image holder
    imageCard: {
        inputs: [],
        outputs: [
            { id: 'imageOut', type: 'image', label: 'Image' },
        ],
    },
    // UploadImage (legacy, same as imageCard raw)
    uploadImage: {
        inputs: [],
        outputs: [
            { id: 'imageOut', type: 'image', label: 'Image' },
            { id: 'contextOut', type: 'context', label: 'Context' },
        ],
    },
    // Media (PRD v2.1) - reuse existing assets
    media: {
        inputs: [],
        outputs: [
            { id: 'imageOut', type: 'image', label: 'Image' },
        ],
    },
    // Upscale (PRD v2.1 minimal) - post-process image
    upscale: {
        inputs: [
            { id: 'imageIn', type: 'image', label: 'Image' },
        ],
        outputs: [
            { id: 'imageOut', type: 'image', label: 'Image' },
        ],
    },
    // Edit (PRD v2.1 minimal) - basic image edit (e.g. crop)
    edit: {
        inputs: [
            { id: 'imageIn', type: 'image', label: 'Image' },
        ],
        outputs: [
            { id: 'imageOut', type: 'image', label: 'Image' },
        ],
    },
    // TextCard (notes/brief)
    textCard: {
        inputs: [
            { id: 'anyIn', type: 'any', label: '' },
        ],
        outputs: [
            { id: 'briefOut', type: 'brief', label: 'Brief' },
        ],
    },
    // GroupFrame - outputs depend on groupType
    groupFrame: {
        inputs: [
            { id: 'anyIn', type: 'any', label: '', multiple: true },
        ],
        outputs: [
            // Dynamic based on groupType:
            // style → styleToken
            // refset → refsetToken
            // candidates → candidatesToken
            // elements → elementsToken
            { id: 'styleToken', type: 'style', label: 'Style Token' },
            { id: 'refsetToken', type: 'refset', label: 'RefSet Token' },
            { id: 'candidatesToken', type: 'candidates', label: 'Candidates Token' },
            { id: 'elementsToken', type: 'elements', label: 'Elements Token' },
        ],
    },
};

// =============================================================================
// Token Types - Group Frame 输出的 Token
// =============================================================================

export interface StyleToken {
    palette: string[];
    summary: string;
    embedding?: ArrayBuffer;
    version: number;
}

export interface RefSetToken {
    images: string[];
    deduped: boolean;
    clusterStrength: number;
    count: number;
}

export interface CandidatesToken {
    images: string[];
    sourceNodeId: string;
    count: number;
}

export interface ElementsToken {
    elements: ElementItem[];
    sourceNodeId: string;
}

export interface ElementItem {
    id: string;
    imageUrl: string;
    maskUrl?: string;
    bbox: { x: number; y: number; width: number; height: number };
    tag?: string;
    note?: string;
}

// =============================================================================
// Context Out - ImageStudio/UploadImage 的上下文输出
// =============================================================================

export interface ImageParams {
    model: string;
    ratio: string;
    resolution: string;
    seed?: number;
    cfg?: number;
    steps?: number;
    styleStrength?: number;
    img2imgStrength?: number;
}

export interface ContextOut {
    images: string[];
    prompt?: string;
    negative?: string;
    params?: ImageParams;
    source: 'upload' | 'studio' | 'extract';
    caption?: string;
    nodeId: string;
    timestamp: number;
}

// =============================================================================
// Recipe - 完整可回放记录
// =============================================================================

export interface NodeRun {
    nodeId: string;
    nodeType: string;
    skillId?: string;
    skillVersion?: string;
    inputRefs: Record<string, string>; // portId -> sourceNodeId
    params: Record<string, unknown>;
    output?: unknown;
    status: 'success' | 'fail';
    duration: number;
    timestamp: number;
}

export interface Recipe {
    id: string;
    projectId: string;
    name?: string;
    description?: string;

    // Graph 快照
    graphSnapshot: {
        nodes: unknown[];
        edges: unknown[];
    };

    // 运行记录
    nodeRuns: NodeRun[];

    // 关键参数
    seeds: number[];
    skillVersions: Record<string, string>;
    assetRefs: string[];

    // 元数据
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// 连接校验
// =============================================================================

// 允许的连接关系
const COMPATIBLE_PORTS: Record<PortType, PortType[]> = {
    brief: ['brief', 'any'],
    style: ['style', 'any'],
    refset: ['refset', 'any'],
    image: ['image', 'any'],
    context: ['context', 'any'],
    candidates: ['candidates', 'any'],
    elements: ['elements', 'any'],
    any: ['brief', 'style', 'refset', 'image', 'context', 'candidates', 'elements', 'any'],
};

export function isPortCompatible(sourceType: PortType, targetType: PortType): boolean {
    return COMPATIBLE_PORTS[sourceType]?.includes(targetType) ||
        COMPATIBLE_PORTS[targetType]?.includes(sourceType);
}

export function getPortTypeForHandle(
    nodeType: string,
    handleId: string,
    handleType: 'source' | 'target'
): PortType {
    const nodePorts = NODE_PORTS[nodeType];
    if (!nodePorts) return 'any';

    const ports = handleType === 'source' ? nodePorts.outputs : nodePorts.inputs;
    const port = ports.find(p => p.id === handleId);
    return port?.type || 'any';
}
