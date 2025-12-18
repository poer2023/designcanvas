/**
 * PRD v2.0: Template Utilities
 * 
 * Template = reusable graph snapshot that can be exported/imported.
 * Supports:
 * - Export whole canvas or selection
 * - Import with ID remap and position offset
 */

import { v4 as uuidv4 } from 'uuid';

// Template schema
export interface TemplateMeta {
    schema_version: string;
    app: string;
    exported_at: string;
    name?: string;
    description?: string;
}

export interface TemplateNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    parentId?: string;
    style?: Record<string, unknown>;
    data: Record<string, unknown>;
}

export interface TemplateEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    data?: Record<string, unknown>;
}

export interface TemplateViewport {
    x: number;
    y: number;
    zoom: number;
}

export interface Template {
    meta: TemplateMeta;
    graph: {
        nodes: TemplateNode[];
        edges: TemplateEdge[];
        viewport?: TemplateViewport;
    };
}

export interface ExportOptions {
    selectionOnly?: boolean;
    selectedNodeIds?: string[];
    includeViewport?: boolean;
    name?: string;
    description?: string;
}

export interface ImportOptions {
    targetViewport?: TemplateViewport;
    offsetX?: number;
    offsetY?: number;
}

/**
 * Export nodes and edges to a template
 */
export function exportTemplate(
    nodes: TemplateNode[],
    edges: TemplateEdge[],
    viewport: TemplateViewport,
    options: ExportOptions = {}
): Template {
    const {
        selectionOnly = false,
        selectedNodeIds = [],
        includeViewport = true,
        name,
        description,
    } = options;

    // Filter nodes if selection only
    let exportNodes = nodes;
    let exportEdges = edges;

    if (selectionOnly && selectedNodeIds.length > 0) {
        const selectedSet = new Set(selectedNodeIds);

        // Include selected nodes and their children (for groups)
        const nodesToExport = new Set<string>();

        // First pass: add selected nodes
        for (const nodeId of selectedNodeIds) {
            nodesToExport.add(nodeId);
        }

        // Second pass: add children of selected groups
        for (const node of nodes) {
            if (node.parentId && nodesToExport.has(node.parentId)) {
                nodesToExport.add(node.id);
            }
        }

        exportNodes = nodes.filter(n => nodesToExport.has(n.id));

        // Filter edges to only include those between exported nodes
        exportEdges = edges.filter(e =>
            nodesToExport.has(e.source) && nodesToExport.has(e.target)
        );
    }

    // Create template
    const template: Template = {
        meta: {
            schema_version: '2.0',
            app: 'PosterLab',
            exported_at: new Date().toISOString(),
            ...(name && { name }),
            ...(description && { description }),
        },
        graph: {
            nodes: exportNodes.map(n => ({
                id: n.id,
                type: n.type,
                position: n.position,
                parentId: n.parentId,
                style: n.style,
                data: n.data,
            })),
            edges: exportEdges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                data: e.data,
            })),
            ...(includeViewport && { viewport }),
        },
    };

    return template;
}

/**
 * Remap all IDs in a template to new UUIDs
 * Returns the remapped template and ID mapping
 */
export function remapTemplateIds(template: Template): {
    template: Template;
    idMap: Map<string, string>;
} {
    const idMap = new Map<string, string>();

    // Generate new IDs for all nodes
    for (const node of template.graph.nodes) {
        idMap.set(node.id, uuidv4());
    }

    // Generate new IDs for all edges
    for (const edge of template.graph.edges) {
        idMap.set(edge.id, uuidv4());
    }

    // Remap nodes
    const remappedNodes = template.graph.nodes.map(node => ({
        ...node,
        id: idMap.get(node.id)!,
        parentId: node.parentId ? idMap.get(node.parentId) : undefined,
    }));

    // Remap edges
    const remappedEdges = template.graph.edges.map(edge => ({
        ...edge,
        id: idMap.get(edge.id)!,
        source: idMap.get(edge.source)!,
        target: idMap.get(edge.target)!,
    }));

    return {
        template: {
            ...template,
            graph: {
                ...template.graph,
                nodes: remappedNodes,
                edges: remappedEdges,
            },
        },
        idMap,
    };
}

/**
 * Calculate the bounding box of nodes
 */
export function calculateNodesBounds(nodes: TemplateNode[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    centerX: number;
    centerY: number;
} {
    if (nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, centerX: 0, centerY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
        const width = (node.style?.width as number) || 300;
        const height = (node.style?.height as number) || 200;

        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + width);
        maxY = Math.max(maxY, node.position.y + height);
    }

    return {
        minX,
        minY,
        maxX,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
    };
}

/**
 * Import template and prepare nodes/edges for insertion
 * Remaps IDs and offsets positions
 */
export function importTemplate(
    template: Template,
    options: ImportOptions = {}
): {
    nodes: TemplateNode[];
    edges: TemplateEdge[];
} {
    const {
        targetViewport = { x: 0, y: 0, zoom: 1 },
        offsetX,
        offsetY,
    } = options;

    // Remap IDs
    const { template: remapped } = remapTemplateIds(template);

    // Calculate template bounds
    const bounds = calculateNodesBounds(remapped.graph.nodes);

    // Calculate offset to center template on target viewport
    // If explicit offset provided, use that; otherwise center on viewport
    const finalOffsetX = offsetX ?? ((-targetViewport.x / targetViewport.zoom) - bounds.centerX);
    const finalOffsetY = offsetY ?? ((-targetViewport.y / targetViewport.zoom) - bounds.centerY);

    // Apply offset to all top-level nodes (nodes without parents)
    const offsetNodes = remapped.graph.nodes.map(node => {
        if (node.parentId) {
            // Child nodes keep their relative position
            return node;
        }
        return {
            ...node,
            position: {
                x: node.position.x + finalOffsetX,
                y: node.position.y + finalOffsetY,
            },
        };
    });

    return {
        nodes: offsetNodes,
        edges: remapped.graph.edges,
    };
}

/**
 * Download template as JSON file
 */
export function downloadTemplate(template: Template, filename?: string): void {
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `template-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Read template from uploaded file
 */
export async function readTemplateFile(file: File): Promise<Template> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const template = JSON.parse(json) as Template;

                // Validate basic structure
                if (!template.meta || !template.graph) {
                    throw new Error('Invalid template format: missing meta or graph');
                }

                if (!template.graph.nodes || !template.graph.edges) {
                    throw new Error('Invalid template format: missing nodes or edges');
                }

                resolve(template);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Validate template schema version compatibility
 */
export function isTemplateCompatible(template: Template): boolean {
    const supportedVersions = ['2.0', '1.9', '1.8'];
    return supportedVersions.includes(template.meta.schema_version);
}
