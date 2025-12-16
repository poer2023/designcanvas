import { SkillNode, SkillEdge, useGraphStore, OutputValue } from '@/store/graphStore';

export interface ExecutionResult {
    nodeId: string;
    status: 'success' | 'fail';
    output?: unknown;
    error?: string;
    duration: number;
}

export interface ExecutionLog {
    timestamp: string;
    nodeId: string;
    skillId: string;
    action: 'start' | 'complete' | 'error';
    message: string;
    data?: Record<string, unknown>;
}

/**
 * Topologically sort nodes for execution order
 */
export function topologicalSort(nodes: SkillNode[], edges: SkillEdge[]): SkillNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    nodes.forEach(node => {
        inDegree.set(node.id, 0);
        adjacency.set(node.id, []);
    });

    // Build adjacency and in-degree
    edges.forEach(edge => {
        const targets = adjacency.get(edge.source) || [];
        targets.push(edge.target);
        adjacency.set(edge.source, targets);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Kahn's algorithm
    const queue: string[] = [];
    const result: SkillNode[] = [];

    inDegree.forEach((degree, nodeId) => {
        if (degree === 0) queue.push(nodeId);
    });

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodeMap.get(nodeId);
        if (node) result.push(node);

        const neighbors = adjacency.get(nodeId) || [];
        neighbors.forEach(neighbor => {
            const newDegree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) queue.push(neighbor);
        });
    }

    // Check for cycles
    if (result.length !== nodes.length) {
        throw new Error('Graph contains a cycle');
    }

    return result;
}

/**
 * Get upstream dependencies for a node
 */
export function getUpstreamNodes(nodeId: string, edges: SkillEdge[]): string[] {
    return edges.filter(e => e.target === nodeId).map(e => e.source);
}

/**
 * Execute a single node (mock implementation)
 */
async function executeNode(
    node: SkillNode,
    upstreamOutputs: Map<string, unknown>,
    onLog: (log: ExecutionLog) => void
): Promise<ExecutionResult> {
    const startTime = Date.now();

    onLog({
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        skillId: node.data.skillId,
        action: 'start',
        message: `Starting ${node.data.skillName}`,
        data: { params: node.data.params, upstreamCount: upstreamOutputs.size }
    });

    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock execution result
    const success = Math.random() > 0.1; // 90% success rate for demo
    const duration = Date.now() - startTime;

    if (success) {
        const output = {
            skillId: node.data.skillId,
            params: node.data.params,
            upstreamData: Object.fromEntries(upstreamOutputs),
            generatedAt: new Date().toISOString(),
        };

        onLog({
            timestamp: new Date().toISOString(),
            nodeId: node.id,
            skillId: node.data.skillId,
            action: 'complete',
            message: `Completed ${node.data.skillName} in ${duration}ms`,
            data: output
        });

        return { nodeId: node.id, status: 'success', output, duration };
    } else {
        const error = 'Simulated random failure';

        onLog({
            timestamp: new Date().toISOString(),
            nodeId: node.id,
            skillId: node.data.skillId,
            action: 'error',
            message: `Failed ${node.data.skillName}: ${error}`,
        });

        return { nodeId: node.id, status: 'fail', error, duration };
    }
}

/**
 * Execute the entire graph
 */
export async function executeGraph(
    nodes: SkillNode[],
    edges: SkillEdge[],
    onNodeStatusChange: (nodeId: string, status: 'running' | 'success' | 'fail', output?: unknown, error?: string) => void,
    onLog: (log: ExecutionLog) => void,
    shouldStop: () => boolean
): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const outputs = new Map<string, unknown>();

    // Filter out locked nodes (use their existing output)
    const nodesToExecute = nodes.filter(n => !n.data.locked);
    const lockedNodes = nodes.filter(n => n.data.locked);

    // Add locked node outputs to the map
    lockedNodes.forEach(node => {
        if (node.data.output) {
            outputs.set(node.id, node.data.output);
        }
    });

    // Sort nodes
    let sortedNodes: SkillNode[];
    try {
        sortedNodes = topologicalSort(nodesToExecute, edges);
    } catch (error) {
        onLog({
            timestamp: new Date().toISOString(),
            nodeId: 'system',
            skillId: 'system',
            action: 'error',
            message: 'Graph contains a cycle, cannot execute',
        });
        return [];
    }

    // Execute in order
    for (const node of sortedNodes) {
        if (shouldStop()) {
            onLog({
                timestamp: new Date().toISOString(),
                nodeId: 'system',
                skillId: 'system',
                action: 'complete',
                message: 'Execution stopped by user',
            });
            break;
        }

        // Get upstream outputs
        const upstreamIds = getUpstreamNodes(node.id, edges);
        const upstreamOutputs = new Map<string, unknown>();
        upstreamIds.forEach(id => {
            if (outputs.has(id)) {
                upstreamOutputs.set(id, outputs.get(id));
            }
        });

        // Update status to running
        onNodeStatusChange(node.id, 'running');

        // Execute
        const result = await executeNode(node, upstreamOutputs, onLog);
        results.push(result);

        // Update status
        onNodeStatusChange(node.id, result.status, result.output, result.error);

        // Store output for downstream nodes
        if (result.status === 'success' && result.output) {
            outputs.set(node.id, result.output);
        }

        // Stop on failure
        if (result.status === 'fail') {
            onLog({
                timestamp: new Date().toISOString(),
                nodeId: 'system',
                skillId: 'system',
                action: 'error',
                message: `Execution stopped due to failure in ${node.data.skillName}`,
            });
            break;
        }
    }

    return results;
}
