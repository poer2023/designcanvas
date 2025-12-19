/**
 * PRD v2.1: DAG Runner (runGraph)
 *
 * Executes nodes in topological order with support for:
 * - RUN_NODE: Execute a single node
 * - RUN_FROM_HERE: Execute a node + all reachable downstream nodes
 * - RUN_GROUP: Execute only the subgraph inside a GroupFrame
 * - RUN_ALL: Execute all nodes from sources to sinks
 *
 * Integrations:
 * - SnapshotStore (active snapshot semantics + stale propagation)
 * - RecipeStore (run records + replay)
 */

import { useGraphStore, SkillNode, SkillEdge } from '@/store/graphStore';
import { useSnapshotStore, PortKey } from '@/store/snapshotStore';
import { createRecipeFromDagRun, type RunMode, type SnapshotRef, useRecipeStore } from '@/store/recipeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { prepareImagesForApi } from '@/lib/utils/imageUtils';

// =============================================================================
// Topological Sort
// =============================================================================

export function topologicalSort(nodes: SkillNode[], edges: SkillEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // Initialize
    for (const node of nodes) {
        inDegree.set(node.id, 0);
        adjacencyList.set(node.id, []);
    }

    // Build adjacency list and in-degree
    for (const edge of edges) {
        adjacencyList.get(edge.source)?.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Find all source nodes (in-degree = 0)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree === 0) {
            queue.push(nodeId);
        }
    }

    // Process queue
    const sorted: string[] = [];
    while (queue.length > 0) {
        const current = queue.shift()!;
        sorted.push(current);

        for (const neighbor of adjacencyList.get(current) || []) {
            const newDegree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) {
                queue.push(neighbor);
            }
        }
    }

    return sorted;
}

// =============================================================================
// Get Downstream Nodes
// =============================================================================

export function getDownstreamNodes(
    startNodeId: string,
    nodes: SkillNode[],
    edges: SkillEdge[]
): string[] {
    const visited = new Set<string>();
    const downstream: string[] = [];
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    for (const node of nodes) {
        adjacencyList.set(node.id, []);
    }
    for (const edge of edges) {
        adjacencyList.get(edge.source)?.push(edge.target);
    }

    // BFS from start node
    const queue = [startNodeId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        downstream.push(current);

        for (const neighbor of adjacencyList.get(current) || []) {
            if (!visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    // Return in topological order
    const allSorted = topologicalSort(nodes, edges);
    return allSorted.filter(id => downstream.includes(id));
}

// =============================================================================
// Node Execution
// =============================================================================

export interface ExecutionContext {
    nodeId: string;
    node: SkillNode;
    inputs: Record<string, unknown>;
}

export interface ExecutionResult {
    success: boolean;
    outputs?: Partial<Record<PortKey, unknown>>;
    error?: string;
    duration?: number;
}

// =============================================================================
// Classified Inputs for ImageStudio
// =============================================================================

interface BriefInput {
    content: string;
    level: number;  // Topological level for priority (higher = closer to target)
}

interface ContextInput {
    prompt?: string;
    params?: Record<string, unknown>;
}

interface ClassifiedInputs {
    briefInputs: BriefInput[];           // TextCard content
    imageRefs: string[];                 // Reference images
    contextInput?: ContextInput;         // Upstream context (from contextOut)
}

/**
 * Compute topological level for each node (distance from sources)
 */
function computeTopologicalLevels(
    nodes: SkillNode[],
    edges: SkillEdge[]
): Map<string, number> {
    const levels = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const adjacencyList = new Map<string, string[]>();

    // Initialize
    for (const node of nodes) {
        inDegree.set(node.id, 0);
        adjacencyList.set(node.id, []);
        levels.set(node.id, 0);
    }

    // Build adjacency list and in-degree
    for (const edge of edges) {
        adjacencyList.get(edge.source)?.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // BFS from sources
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree === 0) {
            queue.push(nodeId);
            levels.set(nodeId, 0);
        }
    }

    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentLevel = levels.get(current) || 0;

        for (const neighbor of adjacencyList.get(current) || []) {
            const newDegree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, newDegree);

            // Update level to max of current paths
            const neighborLevel = levels.get(neighbor) || 0;
            levels.set(neighbor, Math.max(neighborLevel, currentLevel + 1));

            if (newDegree === 0) {
                queue.push(neighbor);
            }
        }
    }

    return levels;
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Compile prompt with priority:
 * 1. Local prompt (highest)
 * 2. Brief inputs (sorted by level, same level randomized)
 * 3. Context input (lowest)
 */
function compilePromptWithPriority(
    localPrompt: string,
    briefInputs: BriefInput[],
    contextInput?: ContextInput
): string {
    const parts: string[] = [];

    // 1. Local prompt (highest priority)
    if (localPrompt.trim()) {
        parts.push(localPrompt.trim());
    }

    // 2. Brief inputs - group by level, shuffle same level, then flatten
    const byLevel = new Map<number, BriefInput[]>();
    for (const brief of briefInputs) {
        const arr = byLevel.get(brief.level) || [];
        arr.push(brief);
        byLevel.set(brief.level, arr);
    }

    // Sort levels descending (higher level = closer to target = higher priority)
    const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => b - a);
    for (const level of sortedLevels) {
        const inputs = shuffleArray(byLevel.get(level) || []);
        for (const input of inputs) {
            if (input.content.trim()) {
                parts.push(input.content.trim());
            }
        }
    }

    // 3. Context input (lowest priority)
    if (contextInput?.prompt?.trim()) {
        parts.push(contextInput.prompt.trim());
    }

    return parts.join('。');
}

/**
 * Classify inputs for ImageStudio node
 */
function classifyInputsForImageStudio(
    nodeId: string,
    inputs: Record<string, unknown>
): ClassifiedInputs {
    const snapshotStore = useSnapshotStore.getState();
    const graphStore = useGraphStore.getState();
    const subs = snapshotStore.getSubscriptions(nodeId);
    const levels = computeTopologicalLevels(graphStore.nodes, graphStore.edges);

    const briefInputs: BriefInput[] = [];
    const imageRefs: string[] = [];
    let contextInput: ContextInput | undefined;

    for (const sub of subs) {
        const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
        if (!snapshot) continue;

        const producerLevel = levels.get(sub.producer_id) || 0;

        if (sub.port_key === 'briefOut') {
            const content = typeof snapshot.payload === 'string'
                ? snapshot.payload
                : String(snapshot.payload || '');
            if (content.trim()) {
                briefInputs.push({ content, level: producerLevel });
            }
        } else if (sub.port_key === 'imageOut') {
            const url = typeof snapshot.payload === 'string' ? snapshot.payload : '';
            if (url) {
                imageRefs.push(url);
            }
        } else if (sub.port_key === 'contextOut') {
            const ctx = snapshot.payload as ContextInput | undefined;
            if (ctx) {
                contextInput = ctx;
            }
        }
    }

    return { briefInputs, imageRefs, contextInput };
}

function compileTextCardOutput(node: SkillNode): string {
    const role = (node.data.role as string | undefined) || 'notes';
    const content = (node.data.content as string | undefined) || '';

    if (role !== 'brief') return content;

    const title = (node.data.title as string | undefined) || '';
    const subtitle = (node.data.subtitle as string | undefined) || '';
    const info = (node.data.info as string | undefined) || '';
    const size = (node.data.size as string | undefined) || '';
    const tone = node.data.tone as number | undefined;
    const constraints = Array.isArray(node.data.constraints) ? (node.data.constraints as unknown[]).filter(Boolean).map(String) : [];

    const lines: string[] = [];
    if (title.trim()) lines.push(`# ${title.trim()}`);
    if (subtitle.trim()) lines.push(`## ${subtitle.trim()}`);
    if (size.trim()) lines.push(`- Size: ${size.trim()}`);
    if (typeof tone === 'number') lines.push(`- Tone: ${tone}`);
    if (info.trim()) {
        lines.push('');
        lines.push(info.trim());
    }
    if (constraints.length > 0) {
        lines.push('');
        lines.push('### Constraints');
        for (const c of constraints) {
            if (c.trim()) lines.push(`- ${c.trim()}`);
        }
    }
    return lines.join('\n');
}

async function executeNode(context: ExecutionContext): Promise<ExecutionResult> {
    const { node } = context;
    const startTime = Date.now();

    try {
        const nodeType = node.type;

        switch (nodeType) {
            case 'textCard': {
                // TextCard produces brief output
                const content = compileTextCardOutput(node);
                return {
                    success: true,
                    outputs: {
                        briefOut: content,
                    } as Record<PortKey, unknown>,
                    duration: Date.now() - startTime,
                };
            }

            case 'imageCard': {
                const mode = node.data.mode as string;
                if (mode === 'raw') {
                    // Raw image card outputs its image
                    const imageUrl = node.data.imageUrl as string;
                    return {
                        success: true,
                        outputs: {
                            imageOut: imageUrl,
                        } as Record<PortKey, unknown>,
                        duration: Date.now() - startTime,
                    };
                }
                // Fall through to imageStudio for studio mode
            }

            case 'imageStudio': {
                // ImageStudio needs to call the unified generation API (PRD v1.9)
                // Enhanced with img2img support and multi-input handling
                const settings = useSettingsStore.getState();
                const defaults = settings.defaults;

                const localPrompt = (node.data.prompt as string | undefined) || '';
                const cardModelId =
                    (node.data.model_id as string | undefined)
                    || (node.data.model as string | undefined)
                    || null;

                // Fallback is important if settings haven't finished loading yet.
                const effectiveModelId =
                    cardModelId
                    || defaults?.default_text2img_model_id
                    || 'mock:default';

                const ratio = (node.data.ratio as string | undefined) || defaults?.default_ratio || '1:1';
                const resolution = (node.data.resolution as string | undefined) || defaults?.default_resolution || '1K';
                const count = (node.data.count as number | undefined) || defaults?.default_count || 1;
                const strength = node.data.strength as number | undefined;

                // Classify inputs from upstream nodes
                const classified = classifyInputsForImageStudio(context.nodeId, context.inputs);

                // Compile prompt with priority: local > brief > context
                const compiledPrompt = compilePromptWithPriority(
                    localPrompt,
                    classified.briefInputs,
                    classified.contextInput
                );

                if (!compiledPrompt) {
                    return {
                        success: false,
                        error: 'Missing prompt (or connect a Brief)',
                        duration: Date.now() - startTime,
                    };
                }

                // Determine mode: img2img if reference images exist
                const hasReferenceImages = classified.imageRefs.length > 0;
                const mode = hasReferenceImages ? 'img2img' : 'text2img';

                // Prepare reference images (compress/convert to base64)
                let referenceImages: string[] = [];
                if (hasReferenceImages) {
                    try {
                        referenceImages = await prepareImagesForApi(classified.imageRefs);
                    } catch (err) {
                        console.warn('[Runner] Failed to prepare reference images:', err);
                        // Continue with original URLs as fallback
                        referenceImages = classified.imageRefs;
                    }
                }

                // Build params
                const params: Record<string, unknown> = { ratio, resolution, count };
                if (hasReferenceImages && referenceImages.length > 0) {
                    params.reference_images = referenceImages;
                }
                if (strength !== undefined) {
                    params.strength = strength;
                }

                // Call generation API (async job)
                const response = await fetch('/api/generate/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model_id: effectiveModelId,
                        mode,
                        prompt: compiledPrompt,
                        params,
                    }),
                });

                const result = await response.json();

                if (!result.success) {
                    return {
                        success: false,
                        error: result.error || 'Generation failed',
                        duration: Date.now() - startTime,
                    };
                }

                const jobId = result.data?.job_id as string | undefined;
                if (!jobId) {
                    return {
                        success: false,
                        error: 'No job_id returned from generator',
                        duration: Date.now() - startTime,
                    };
                }

                const jobResult = await pollJobCompletion(jobId);
                if (!jobResult.success) {
                    return {
                        success: false,
                        error: jobResult.error,
                        duration: Date.now() - startTime,
                    };
                }

                const thumbnails = jobResult.thumbnails || [];

                return {
                    success: true,
                    outputs: {
                        imageOut: thumbnails[0],
                        contextOut: {
                            images: thumbnails,
                            asset_ids: jobResult.assetIds,
                            seeds: jobResult.seeds,
                            prompt: compiledPrompt,
                            params: { model_id: effectiveModelId, ratio, resolution, count, mode },
                            source: 'studio',
                            nodeId: node.id,
                            timestamp: Date.now(),
                        },
                    } as Record<PortKey, unknown>,
                    duration: Date.now() - startTime,
                };
            }

            case 'upscale': {
                const scale = (node.data.scale as number | undefined) ?? 2;
                const input = context.inputs['imageIn'];
                const imageUrl = typeof input === 'string' ? input : '';

                if (!imageUrl) {
                    return {
                        success: false,
                        error: 'Missing image input',
                        duration: Date.now() - startTime,
                    };
                }

                const out = await upscaleImageUrl(imageUrl, scale);

                return {
                    success: true,
                    outputs: {
                        imageOut: out,
                    } as Record<PortKey, unknown>,
                    duration: Date.now() - startTime,
                };
            }

            case 'edit': {
                const operation = (node.data.operation as string | undefined) || 'crop';
                const ratio = (node.data.ratio as string | undefined) || '1:1';
                const input = context.inputs['imageIn'];
                const imageUrl = typeof input === 'string' ? input : '';

                if (!imageUrl) {
                    return {
                        success: false,
                        error: 'Missing image input',
                        duration: Date.now() - startTime,
                    };
                }

                if (operation !== 'crop') {
                    return {
                        success: false,
                        error: `Unsupported operation: ${operation}`,
                        duration: Date.now() - startTime,
                    };
                }

                const out = await cropImageUrlToRatio(imageUrl, ratio);

                return {
                    success: true,
                    outputs: {
                        imageOut: out,
                    } as Record<PortKey, unknown>,
                    duration: Date.now() - startTime,
                };
            }

            case 'groupFrame': {
                // GroupFrame aggregates its children outputs into tokens
                const groupType = node.data.groupType as string;

                // For now, just pass through - actual token generation would
                // require iterating over child nodes
                return {
                    success: true,
                    outputs: {
                        [`${groupType}Token`]: { type: groupType, nodeId: node.id },
                    } as Record<PortKey, unknown>,
                    duration: Date.now() - startTime,
                };
            }

            default:
                return {
                    success: true,
                    outputs: {},
                    duration: Date.now() - startTime,
                };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
        };
    }
}

// =============================================================================
// Job Polling
// =============================================================================

async function pollJobCompletion(
    jobId: string,
    maxAttempts = 60,
    intervalMs = 2000
): Promise<{ success: boolean; thumbnails?: string[]; assetIds?: string[]; seeds?: number[]; error?: string }> {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        const response = await fetch(`/api/jobs/${jobId}`);
        const result = await response.json();

        if (!result.success) {
            return { success: false, error: result.error };
        }

        const status = result.data?.status;

        if (status === 'done') {
            return {
                success: true,
                thumbnails: result.data?.outputs?.thumbnails,
                assetIds: result.data?.outputs?.asset_ids,
                seeds: result.data?.outputs?.seeds,
            };
        }

        if (status === 'error') {
            return { success: false, error: result.data?.error || 'Job failed' };
        }

        // Continue polling for 'queued' or 'running'
    }

    return { success: false, error: 'Job timed out' };
}

// =============================================================================
// Runner Functions
// =============================================================================

export interface RunOptions {
    onNodeStart?: (nodeId: string) => void;
    onNodeComplete?: (nodeId: string, result: ExecutionResult) => void;
    onComplete?: () => void;
    /** PRD v2.0: Only run stale/blocked nodes, skip fresh nodes */
    dirtyOnly?: boolean;
}

const ALL_PORT_KEYS: PortKey[] = [
    'imageOut',
    'contextOut',
    'briefOut',
    'styleToken',
    'refsetToken',
    'candidatesToken',
    'elementsToken',
];

function portKeyToInputHandle(portKey: PortKey): string {
    return portKey.replace('Out', 'In').replace('Token', 'In');
}

function snapshotToRef(snapshot: { snapshot_id: string; producer_id: string; port_key: PortKey; version: number }): SnapshotRef {
    return {
        snapshotId: snapshot.snapshot_id,
        producerId: snapshot.producer_id,
        portKey: snapshot.port_key,
        version: snapshot.version,
    };
}

function getRunTargets(params: { mode: RunMode; startNodeId?: string; groupId?: string }): string[] {
    const { mode, startNodeId, groupId } = params;
    const { nodes, edges, getNodesInGroup } = useGraphStore.getState();

    if (mode === 'RUN_ALL') {
        const order = topologicalSort(nodes, edges);
        const nodeById = new Map(nodes.map(n => [n.id, n]));
        return order.filter(id => nodeById.get(id)?.type !== 'groupFrame');
    }

    if (mode === 'RUN_NODE') {
        if (!startNodeId) return [];
        const node = nodes.find(n => n.id === startNodeId);
        if (!node || node.type === 'groupFrame') return [];
        return [startNodeId];
    }

    if (mode === 'RUN_FROM_HERE') {
        if (!startNodeId) return [];
        const order = getDownstreamNodes(startNodeId, nodes, edges);
        const nodeById = new Map(nodes.map(n => [n.id, n]));
        return order.filter(id => nodeById.get(id)?.type !== 'groupFrame');
    }

    // RUN_GROUP
    const effectiveGroupId = groupId || startNodeId;
    if (!effectiveGroupId) return [];

    const groupNodes = getNodesInGroup(effectiveGroupId);
    if (groupNodes.length === 0) return [];

    const groupNodeIds = new Set(groupNodes.map(n => n.id));
    const groupEdges = edges.filter(e => groupNodeIds.has(e.source) && groupNodeIds.has(e.target));

    return topologicalSort(groupNodes, groupEdges);
}

function collectInputs(nodeId: string) {
    const snapshotStore = useSnapshotStore.getState();
    const subs = snapshotStore.getSubscriptions(nodeId);

    const inputs: Record<string, unknown> = {};
    const inputRefs: SnapshotRef[] = [];
    const missingUpstream: string[] = [];

    for (const sub of subs) {
        const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
        if (!snapshot) {
            missingUpstream.push(sub.port_key);
            continue;
        }

        inputs[portKeyToInputHandle(sub.port_key)] = snapshot.payload;
        inputRefs.push(snapshotToRef(snapshot));
    }

    return { inputs, inputRefs, missingUpstream, subs };
}

function validateRunnable(node: SkillNode, inputs: Record<string, unknown>, missingUpstream: string[]): { ok: boolean; missing: string[] } {
    // If a connected upstream hasn't produced output yet, treat as missing by default.
    // Node-specific rules can override this (e.g. ImageStudio can run with local prompt).
    if (missingUpstream.length > 0 && node.type !== 'imageStudio') {
        return { ok: false, missing: missingUpstream };
    }

    if (node.type === 'imageStudio') {
        const prompt = (node.data.prompt as string | undefined)?.trim() || '';
        const brief = (inputs['briefIn'] as string | undefined)?.trim() || '';

        const missing: string[] = [];
        if (!prompt && !brief) missing.push('prompt/brief');

        const settings = useSettingsStore.getState();
        const defaults = settings.defaults;
        const cardModelId =
            (node.data.model_id as string | undefined)
            || (node.data.model as string | undefined)
            || null;

        const effectiveModelId =
            cardModelId
            || defaults?.default_text2img_model_id
            || 'mock:default';

        if (!effectiveModelId) missing.push('model');

        return { ok: missing.length === 0, missing };
    }

    if (node.type === 'upscale') {
        const img = inputs['imageIn'];
        if (typeof img !== 'string' || !img.trim()) {
            return { ok: false, missing: ['image'] };
        }
    }

    if (node.type === 'edit') {
        const img = inputs['imageIn'];
        if (typeof img !== 'string' || !img.trim()) {
            return { ok: false, missing: ['image'] };
        }
    }

    return { ok: true, missing: [] };
}

export interface RunGraphParams {
    mode: RunMode;
    startNodeId?: string;
    groupId?: string;
}

export interface RunGraphResult {
    recipeId: string | null;
    results: Record<string, ExecutionResult>;
}

/**
 * PRD v2.1: Unified runner entrypoint.
 */
export async function runGraph(params: RunGraphParams, options: RunOptions = {}): Promise<RunGraphResult> {
    const { mode, startNodeId } = params;
    const graph = useGraphStore.getState();
    const snapshotStore = useSnapshotStore.getState();
    const recipeStore = useRecipeStore.getState();

    const targetNodeIds = getRunTargets(params);
    if (targetNodeIds.length === 0) {
        return { recipeId: null, results: {} };
    }

    const runStartNodeId = startNodeId || targetNodeIds[0];
    const recipeId = createRecipeFromDagRun(mode, runStartNodeId, targetNodeIds, {
        projectId: graph.projectId ?? undefined,
    });

    recipeStore.updateRecipeStatus(recipeId, 'running');
    const runStartAt = Date.now();

    const resultsByNodeId: Record<string, ExecutionResult> = {};

    for (const nodeId of targetNodeIds) {
        const node = graph.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // GroupFrames are containers; runGroup runs their children, not the group node itself.
        if (node.type === 'groupFrame') continue;

        // Locked nodes are treated as frozen outputs.
        if (node.data.locked) {
            const { inputs, inputRefs } = collectInputs(nodeId);
            const activeOutputs: SnapshotRef[] = [];
            for (const portKey of ALL_PORT_KEYS) {
                const snap = snapshotStore.getActiveSnapshot(nodeId, portKey);
                if (snap) activeOutputs.push(snapshotToRef(snap));
            }
            recipeStore.updateNodeIoMap(recipeId, nodeId, { inputs: inputRefs, outputs: activeOutputs });

            const skipped: ExecutionResult = { success: true, outputs: {}, duration: 0 };
            resultsByNodeId[nodeId] = skipped;
            options.onNodeComplete?.(nodeId, skipped);
            continue;
        }

        // PRD v2.0: dirtyOnly - skip fresh nodes
        if (options.dirtyOnly) {
            const staleState = snapshotStore.getStaleState(nodeId);
            if (staleState === 'fresh') {
                console.log(`[dirtyOnly] Skipping fresh node: ${nodeId} (${node.type})`);
                const { inputRefs } = collectInputs(nodeId);
                const activeOutputs: SnapshotRef[] = [];
                for (const portKey of ALL_PORT_KEYS) {
                    const snap = snapshotStore.getActiveSnapshot(nodeId, portKey);
                    if (snap) activeOutputs.push(snapshotToRef(snap));
                }
                recipeStore.updateNodeIoMap(recipeId, nodeId, { inputs: inputRefs, outputs: activeOutputs });

                const skipped: ExecutionResult = { success: true, outputs: {}, duration: 0 };
                resultsByNodeId[nodeId] = skipped;
                options.onNodeComplete?.(nodeId, skipped);
                continue;
            }
        }

        options.onNodeStart?.(nodeId);
        graph.updateNodeStatus(nodeId, 'running');

        const { inputs, inputRefs, missingUpstream, subs } = collectInputs(nodeId);
        const validation = validateRunnable(node, inputs, missingUpstream);
        if (!validation.ok) {
            const error = `Missing inputs: ${validation.missing.join(', ')}`;
            const blocked: ExecutionResult = { success: false, error, duration: 0 };
            resultsByNodeId[nodeId] = blocked;

            graph.updateNodeStatus(nodeId, 'fail', undefined, error);
            recipeStore.updateNodeIoMap(recipeId, nodeId, { inputs: inputRefs, outputs: [] });
            recipeStore.updateRecipeStatus(recipeId, 'error', Date.now() - runStartAt, error);
            options.onNodeComplete?.(nodeId, blocked);
            break;
        }

        const result = await executeNode({ nodeId, node, inputs });
        resultsByNodeId[nodeId] = result;

        if (!result.success) {
            graph.updateNodeStatus(nodeId, 'fail', undefined, result.error);
            recipeStore.updateNodeIoMap(recipeId, nodeId, { inputs: inputRefs, outputs: [] });
            recipeStore.updateRecipeStatus(recipeId, 'error', Date.now() - runStartAt, result.error);
            options.onNodeComplete?.(nodeId, result);
            break;
        }

        graph.updateNodeStatus(nodeId, 'success');

        // Write outputs to SnapshotStore.
        // For ImageStudio we create one snapshot per candidate for Replace semantics.
        const activeOutputs: SnapshotRef[] = [];

        if (result.outputs) {
            if (node.type === 'imageStudio') {
                const contextOut = result.outputs.contextOut as { images?: unknown[] } | undefined;
                const images = Array.isArray(contextOut?.images) ? (contextOut?.images as unknown[]) : [];

                if (images.length > 0) {
                    const created = images
                        .map((payload) => snapshotStore.createSnapshot(nodeId, 'imageOut', payload))
                        .filter(Boolean);

                    // Default active = first candidate
                    if (created.length > 0) {
                        snapshotStore.setActiveSnapshot(nodeId, 'imageOut', created[0].snapshot_id);
                        const activeImage = snapshotStore.getActiveSnapshot(nodeId, 'imageOut');
                        if (activeImage) activeOutputs.push(snapshotToRef(activeImage));
                    }
                } else if (result.outputs.imageOut !== undefined) {
                    const snap = snapshotStore.createSnapshot(nodeId, 'imageOut', result.outputs.imageOut);
                    activeOutputs.push(snapshotToRef(snap));
                }

                if (result.outputs.contextOut !== undefined) {
                    const snap = snapshotStore.createSnapshot(nodeId, 'contextOut', result.outputs.contextOut);
                    activeOutputs.push(snapshotToRef(snap));
                }
            } else {
                for (const [portKey, payload] of Object.entries(result.outputs)) {
                    const snap = snapshotStore.createSnapshot(nodeId, portKey as PortKey, payload);
                    activeOutputs.push(snapshotToRef(snap));
                }
            }
        }

        // Mark consumed (input → subscriber) to clear stale state.
        for (const sub of subs) {
            const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
            if (snapshot) {
                snapshotStore.markConsumed(nodeId, sub.producer_id, sub.port_key, snapshot.version);
            }
        }

        recipeStore.updateNodeIoMap(recipeId, nodeId, { inputs: inputRefs, outputs: activeOutputs });
        options.onNodeComplete?.(nodeId, result);
    }

    const finalRecipe = recipeStore.getRecipeById(recipeId);
    if (finalRecipe?.status === 'running') {
        recipeStore.updateRecipeStatus(recipeId, 'success', Date.now() - runStartAt);
    }

    // PRD v2.1: Persist recipe to database
    const projectId = graph.projectId;
    if (projectId && finalRecipe) {
        try {
            await fetch('/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    graph_snapshot: { nodes: graph.nodes.map(n => ({ id: n.id, type: n.type })), edges: graph.edges.map(e => ({ id: e.id, source: e.source, target: e.target })) },
                    node_runs: [],
                    seeds: [],
                    skill_versions: {},
                    asset_refs: [],
                    mode: finalRecipe.runMode,
                    start_node_id: finalRecipe.startNodeId,
                    affected_node_ids: finalRecipe.affectedNodeIds,
                    node_io_map: finalRecipe.nodeIoMap,
                }),
            });
            console.log(`[PRD v2.1] Recipe ${recipeId} persisted to DB`);
        } catch (err) {
            console.warn('[PRD v2.1] Failed to persist recipe to DB:', err);
        }
    }

    options.onComplete?.();
    return { recipeId, results: resultsByNodeId };
}

/**
 * Backwards-compatible wrappers.
 */
export async function runAll(options: RunOptions = {}): Promise<void> {
    await runGraph({ mode: 'RUN_ALL' }, options);
}

export async function runFromHere(startNodeId: string, options: RunOptions = {}): Promise<void> {
    await runGraph({ mode: 'RUN_FROM_HERE', startNodeId }, options);
}

export async function runGroup(groupId: string, options: RunOptions = {}): Promise<void> {
    await runGraph({ mode: 'RUN_GROUP', startNodeId: groupId }, options);
}

export async function runNode(nodeId: string, options: RunOptions = {}): Promise<ExecutionResult> {
    const result = await runGraph({ mode: 'RUN_NODE', startNodeId: nodeId }, options);
    return result.results[nodeId] || { success: false, error: 'Node not executed' };
}

/**
 * Check if node is stale (needs re-execution)
 */
export function isNodeStale(nodeId: string): boolean {
    const snapshotStore = useSnapshotStore.getState();
    return snapshotStore.getStaleState(nodeId) === 'stale';
}

/**
 * Check if node is blocked (missing required inputs)
 */
export function isNodeBlocked(nodeId: string): boolean {
    const snapshotStore = useSnapshotStore.getState();
    return snapshotStore.getStaleState(nodeId) === 'blocked';
}

// =============================================================================
// Client-side image helpers (Upscale)
// =============================================================================

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
    });
}

async function ensureDataUrl(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch image (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    return blobToDataUrl(blob);
}

function upscaleDataUrl(dataUrl: string, scale: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas not supported'));
                return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            try {
                resolve(canvas.toDataURL('image/png'));
            } catch {
                reject(new Error('Failed to encode image'));
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
    });
}

async function upscaleImageUrl(url: string, scale: number): Promise<string> {
    const safeScale = Number.isFinite(scale) ? Math.min(8, Math.max(1, scale)) : 2;
    const dataUrl = await ensureDataUrl(url);
    return upscaleDataUrl(dataUrl, safeScale);
}

function parseRatioValue(ratio: string): number {
    const trimmed = ratio.trim();
    const parts = trimmed.split(':').map(Number);
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[0] > 0 && parts[1] > 0) {
        return parts[0] / parts[1];
    }
    return 1;
}

function cropDataUrlToRatio(dataUrl: string, ratio: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const targetRatio = parseRatioValue(ratio);
            const srcW = img.width || 1;
            const srcH = img.height || 1;
            const srcRatio = srcW / srcH;

            let sx = 0;
            let sy = 0;
            let sw = srcW;
            let sh = srcH;

            if (srcRatio > targetRatio) {
                // Crop width
                sw = Math.max(1, Math.round(srcH * targetRatio));
                sx = Math.max(0, Math.round((srcW - sw) / 2));
            } else if (srcRatio < targetRatio) {
                // Crop height
                sh = Math.max(1, Math.round(srcW / targetRatio));
                sy = Math.max(0, Math.round((srcH - sh) / 2));
            }

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas not supported'));
                return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

            try {
                resolve(canvas.toDataURL('image/png'));
            } catch {
                reject(new Error('Failed to encode image'));
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
    });
}

async function cropImageUrlToRatio(url: string, ratio: string): Promise<string> {
    const dataUrl = await ensureDataUrl(url);
    return cropDataUrlToRatio(dataUrl, ratio);
}
