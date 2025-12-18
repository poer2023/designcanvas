/**
 * PRD v2.0: DAG Runner
 * 
 * Executes nodes in topological order with support for:
 * - Run All: Execute all nodes from sources to sinks
 * - Run From Here: Execute from a specific node downstream
 * - Run Node: Execute a single node
 */

import { useGraphStore, SkillNode, SkillEdge } from '@/store/graphStore';
import { useSnapshotStore, PortKey } from '@/store/snapshotStore';
import { useRecipeStore } from '@/store/recipeStore';

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

async function executeNode(context: ExecutionContext): Promise<ExecutionResult> {
    const { node } = context;
    const startTime = Date.now();

    try {
        const nodeType = node.type;

        switch (nodeType) {
            case 'textCard': {
                // TextCard produces brief output
                const content = node.data.content as string || '';
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
                // ImageStudio needs to call the generation API
                const prompt = node.data.prompt as string || '';
                const model = node.data.model as string || 'flux-schnell';
                const ratio = node.data.ratio as string || '1:1';
                const count = node.data.count as number || 1;

                // Get inputs from context
                const briefInput = context.inputs['briefIn'] as string;
                const compiledPrompt = briefInput || prompt;

                if (!compiledPrompt) {
                    return {
                        success: false,
                        error: 'No prompt or brief input provided',
                        duration: Date.now() - startTime,
                    };
                }

                // Call generation API
                const response = await fetch('/api/generate/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: compiledPrompt,
                        model,
                        ratio,
                        count,
                        negative: node.data.negative as string,
                        seed: node.data.seed as number,
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

                // For async jobs, we need to poll
                if (result.data?.job_id) {
                    const jobResult = await pollJobCompletion(result.data.job_id);
                    if (!jobResult.success) {
                        return {
                            success: false,
                            error: jobResult.error,
                            duration: Date.now() - startTime,
                        };
                    }

                    return {
                        success: true,
                        outputs: {
                            imageOut: jobResult.images?.[0],
                            contextOut: {
                                images: jobResult.images,
                                prompt: compiledPrompt,
                                params: { model, ratio },
                            },
                        } as Record<PortKey, unknown>,
                        duration: Date.now() - startTime,
                    };
                }

                // Sync result
                return {
                    success: true,
                    outputs: {
                        imageOut: result.data?.images?.[0],
                        contextOut: {
                            images: result.data?.images,
                            prompt: compiledPrompt,
                            params: { model, ratio },
                        },
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
): Promise<{ success: boolean; images?: string[]; error?: string }> {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        const response = await fetch(`/api/jobs/${jobId}`);
        const result = await response.json();

        if (!result.success) {
            return { success: false, error: result.error };
        }

        const status = result.data?.status;

        if (status === 'completed') {
            return { success: true, images: result.data?.result?.images };
        }

        if (status === 'failed') {
            return { success: false, error: result.data?.error || 'Job failed' };
        }

        // Continue polling for 'pending' or 'running'
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
}

/**
 * Run All: Execute all nodes in topological order
 */
export async function runAll(options: RunOptions = {}): Promise<void> {
    const { nodes, edges, updateNodeStatus } = useGraphStore.getState();
    const snapshotStore = useSnapshotStore.getState();

    const order = topologicalSort(nodes, edges);

    for (const nodeId of order) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Skip GroupFrames for now (they need special handling)
        if (node.type === 'groupFrame') continue;

        options.onNodeStart?.(nodeId);
        updateNodeStatus(nodeId, 'running');

        // Gather inputs from subscriptions
        const subs = snapshotStore.getSubscriptions(nodeId);
        const inputs: Record<string, unknown> = {};
        for (const sub of subs) {
            const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
            if (snapshot) {
                // Map port_key to input handle
                const inputHandle = sub.port_key.replace('Out', 'In').replace('Token', 'In');
                inputs[inputHandle] = snapshot.payload;
            }
        }

        const result = await executeNode({ nodeId, node, inputs });

        if (result.success) {
            updateNodeStatus(nodeId, 'success');

            // Create snapshots for outputs
            if (result.outputs) {
                for (const [portKey, payload] of Object.entries(result.outputs)) {
                    snapshotStore.createSnapshot(nodeId, portKey as PortKey, payload);
                }
            }

            // Mark consumed
            for (const sub of subs) {
                const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
                if (snapshot) {
                    snapshotStore.markConsumed(nodeId, sub.producer_id, sub.port_key, snapshot.version);
                }
            }
        } else {
            updateNodeStatus(nodeId, 'fail', undefined, result.error);
        }

        options.onNodeComplete?.(nodeId, result);
    }

    options.onComplete?.();
}

/**
 * Run From Here: Execute from a specific node downstream
 */
export async function runFromHere(startNodeId: string, options: RunOptions = {}): Promise<void> {
    const { nodes, edges, updateNodeStatus } = useGraphStore.getState();
    const snapshotStore = useSnapshotStore.getState();

    const downstream = getDownstreamNodes(startNodeId, nodes, edges);

    for (const nodeId of downstream) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        if (node.type === 'groupFrame') continue;

        options.onNodeStart?.(nodeId);
        updateNodeStatus(nodeId, 'running');

        const subs = snapshotStore.getSubscriptions(nodeId);
        const inputs: Record<string, unknown> = {};
        for (const sub of subs) {
            const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
            if (snapshot) {
                const inputHandle = sub.port_key.replace('Out', 'In').replace('Token', 'In');
                inputs[inputHandle] = snapshot.payload;
            }
        }

        const result = await executeNode({ nodeId, node, inputs });

        if (result.success) {
            updateNodeStatus(nodeId, 'success');

            if (result.outputs) {
                for (const [portKey, payload] of Object.entries(result.outputs)) {
                    snapshotStore.createSnapshot(nodeId, portKey as PortKey, payload);
                }
            }

            for (const sub of subs) {
                const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
                if (snapshot) {
                    snapshotStore.markConsumed(nodeId, sub.producer_id, sub.port_key, snapshot.version);
                }
            }
        } else {
            updateNodeStatus(nodeId, 'fail', undefined, result.error);
        }

        options.onNodeComplete?.(nodeId, result);
    }

    options.onComplete?.();
}

/**
 * Run Node: Execute a single node
 */
export async function runNode(nodeId: string, options: RunOptions = {}): Promise<ExecutionResult> {
    const { nodes, updateNodeStatus } = useGraphStore.getState();
    const snapshotStore = useSnapshotStore.getState();

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
        return { success: false, error: 'Node not found' };
    }

    options.onNodeStart?.(nodeId);
    updateNodeStatus(nodeId, 'running');

    const subs = snapshotStore.getSubscriptions(nodeId);
    const inputs: Record<string, unknown> = {};
    for (const sub of subs) {
        const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
        if (snapshot) {
            const inputHandle = sub.port_key.replace('Out', 'In').replace('Token', 'In');
            inputs[inputHandle] = snapshot.payload;
        }
    }

    const result = await executeNode({ nodeId, node, inputs });

    if (result.success) {
        updateNodeStatus(nodeId, 'success');

        if (result.outputs) {
            for (const [portKey, payload] of Object.entries(result.outputs)) {
                snapshotStore.createSnapshot(nodeId, portKey as PortKey, payload);
            }
        }

        for (const sub of subs) {
            const snapshot = snapshotStore.getSnapshot(sub.producer_id, sub.port_key);
            if (snapshot) {
                snapshotStore.markConsumed(nodeId, sub.producer_id, sub.port_key, snapshot.version);
            }
        }
    } else {
        updateNodeStatus(nodeId, 'fail', undefined, result.error);
    }

    options.onNodeComplete?.(nodeId, result);
    options.onComplete?.();

    return result;
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
