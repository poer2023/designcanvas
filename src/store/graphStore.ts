import { create } from 'zustand';
import {
    Node,
    Edge,
    Connection,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { getPortTypeForHandle, isPortCompatible, type PortType } from '@/types/skills';
import { subscribeFromEdge, unsubscribeFromEdge, syncSubscriptionsFromEdges, useSnapshotStore, type OutputSnapshot, type PortKey, type StaleState, type Subscription } from './snapshotStore';

export type NodeStatus = 'idle' | 'running' | 'success' | 'fail';

// Use specific types instead of unknown for React Flow compatibility
export type ParamValue = string | number | boolean | null;
export type OutputValue = unknown;

export interface SkillNodeData {
    skillId: string;
    skillName: string;
    skillType: string;
    params: Record<string, ParamValue>;
    status: NodeStatus;
    locked: boolean;
    output?: unknown;
    error?: string;
    [key: string]: unknown; // Index signature for React Flow compatibility
}

export type SkillNode = Node<SkillNodeData>;
export type SkillEdge = Edge;

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

interface SnapshotStoreSnapshot {
    snapshots: Record<string, Record<string, OutputSnapshot>>;
    snapshotHistory: Record<string, Record<string, OutputSnapshot[]>>;
    activeByProducerPort: Record<string, string>;
    subscriptions: Record<string, Subscription[]>;
    staleStates: Record<string, StaleState>;
}

interface HistoryEntry {
    timestamp: number;
    mergeKey?: string;
    label?: string;
    graph: {
        nodes: SkillNode[];
        edges: SkillEdge[];
        viewport: { x: number; y: number; zoom: number };
        selectedNodeId: string | null;
    };
    snapshot: SnapshotStoreSnapshot;
}

function compileTextCardOutput(data: Record<string, unknown>): string {
    const role = (data.role as string | undefined) || 'notes';
    const content = (data.content as string | undefined) || '';

    if (role !== 'brief') return content;

    const title = (data.title as string | undefined) || '';
    const subtitle = (data.subtitle as string | undefined) || '';
    const info = (data.info as string | undefined) || '';
    const size = (data.size as string | undefined) || '';
    const tone = data.tone as number | undefined;
    const constraints = Array.isArray(data.constraints) ? (data.constraints as unknown[]).filter(Boolean).map(String) : [];

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

function hydrateSnapshotsFromNodes(nodes: SkillNode[]) {
    const snapshotStore = useSnapshotStore.getState();

    for (const node of nodes) {
        if (node.type === 'textCard') {
            const payload = compileTextCardOutput(node.data as Record<string, unknown>);
            if (payload.trim()) snapshotStore.createSnapshot(node.id, 'briefOut' as PortKey, payload);
        }

        if (node.type === 'uploadImage') {
            const imageUrl = node.data.imageUrl as string | undefined;
            const caption = node.data.caption as string | undefined;
            if (imageUrl) {
                snapshotStore.createSnapshot(node.id, 'imageOut' as PortKey, imageUrl);
                snapshotStore.createSnapshot(node.id, 'contextOut' as PortKey, {
                    imageUrl,
                    caption: caption || '',
                    source: 'upload',
                    nodeId: node.id,
                    timestamp: Date.now(),
                });
            }
        }

        if (node.type === 'media') {
            const imageUrl = node.data.imageUrl as string | undefined;
            if (imageUrl) snapshotStore.createSnapshot(node.id, 'imageOut' as PortKey, imageUrl);
        }

        if (node.type === 'imageCard' && node.data.mode === 'raw') {
            const imageUrl = node.data.imageUrl as string | undefined;
            if (imageUrl) snapshotStore.createSnapshot(node.id, 'imageOut' as PortKey, imageUrl);
        }
    }
}

interface GraphState {
    nodes: SkillNode[];
    edges: SkillEdge[];
    selectedNodeId: string | null;
    isRunning: boolean;

    // PRD v2.0: Persistence state
    projectId: string | null;
    viewport: { x: number; y: number; zoom: number };
    lastSavedVersion: number;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
    isDirty: boolean;

    // Actions
    setNodes: (nodes: SkillNode[]) => void;
    setEdges: (edges: SkillEdge[]) => void;
    onNodesChange: (changes: NodeChange<SkillNode>[]) => void;
    onEdgesChange: (changes: EdgeChange<SkillEdge>[]) => void;
    onConnect: (connection: Connection) => void;

    addNode: (skillType: string, position: { x: number; y: number }) => string | null;
    removeNode: (nodeId: string) => void;
    updateNodeParams: (nodeId: string, params: Record<string, ParamValue>) => void;
    updateNodeStatus: (nodeId: string, status: NodeStatus, output?: OutputValue, error?: string) => void;
    toggleNodeLock: (nodeId: string) => void;

    selectNode: (nodeId: string | null) => void;
    setIsRunning: (isRunning: boolean) => void;

    resetGraph: () => void;
    loadGraph: (nodes: SkillNode[], edges: SkillEdge[]) => void;

    // Node membership for GroupFrame
    updateNodeParent: (nodeId: string, parentId: string | null) => void;
    detectNodeMembership: (nodeId: string) => string | null;
    getNodesInGroup: (groupId: string) => SkillNode[];

    // PRD v2.0: Node data sync
    updateNodeData: (nodeId: string, data: Partial<SkillNodeData>) => void;

    // PRD v2.1: Undo/Redo history
    historyPast: HistoryEntry[];
    historyFuture: HistoryEntry[];
    historyPaused: boolean;
    resizingNodeIds: Record<string, boolean>;
    pushHistory: (options?: { mergeKey?: string; label?: string }) => void;
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;
    setHistoryPaused: (paused: boolean) => void;

    // PRD v2.0: Persistence actions
    setProjectId: (projectId: string | null) => void;
    setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
    markDirty: () => void;
    getGraphSnapshot: () => { nodes: unknown[]; edges: unknown[] };
    loadFromServer: (projectId: string) => Promise<boolean>;
    saveToServer: (force?: boolean) => Promise<boolean>;
    setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict') => void;
}

// Skill type definitions for adding new nodes
export const SKILL_TYPES: Record<string, { name: string; color: string; icon: string }> = {
    'style-profiler': { name: 'Style Profiler', color: '#8B5CF6', icon: '✨' },
    'brief': { name: 'Poster Brief', color: '#3B82F6', icon: '📋' },
    'inspiration-pool': { name: 'Inspiration Pool', color: '#10B981', icon: '💡' },
    'prompt-forge': { name: 'Prompt Forge', color: '#F59E0B', icon: '🔧' },
    'batch-generate': { name: 'Batch Generate', color: '#EF4444', icon: '🎨' },
    'element-extract': { name: 'Element Extract', color: '#EC4899', icon: '✂️' },
    'compose': { name: 'Compose & Harmonize', color: '#6366F1', icon: '🧩' },
    'export': { name: 'Export', color: '#14B8A6', icon: '📤' },
};

// v1.7: Map skill types to new node types
function getNodeTypeForSkill(skillType: string): string {
    // Direct mappings for new v1.7 types
    if (skillType === 'imageStudio') return 'imageStudio';
    if (skillType === 'uploadImage') return 'uploadImage';
    if (skillType === 'media') return 'media';
    if (skillType === 'upscale') return 'upscale';
    if (skillType === 'edit') return 'edit';
    if (skillType === 'textCard' || skillType === 'notes' || skillType === 'brief') return 'textCard';
    if (skillType.startsWith('group-') || ['style', 'refset', 'candidates', 'elements', 'blank'].includes(skillType)) return 'groupFrame';

    // Legacy mappings
    const textCards = ['brief', 'prompt-forge'];
    const groupFrames = ['style-profiler', 'inspiration-pool', 'element-extract', 'compose'];

    if (textCards.includes(skillType)) return 'textCard';
    if (groupFrames.includes(skillType)) return 'groupFrame';
    return 'skillNode';
}

// v1.7: Map skill types to group frame types
function mapSkillToGroupType(skillType: string): string {
    const mapping: Record<string, string> = {
        'style-profiler': 'style',
        'inspiration-pool': 'refset',
        'batch-generate': 'candidates',
        'element-extract': 'elements',
        'compose': 'blank',
        // Direct v1.7 types
        'style': 'style',
        'refset': 'refset',
        'candidates': 'candidates',
        'elements': 'elements',
        'blank': 'blank',
    };
    return mapping[skillType] || 'blank';
}

const initialNodes: SkillNode[] = [];
const initialEdges: SkillEdge[] = [];

export const useGraphStore = create<GraphState>((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    isRunning: false,

    // PRD v2.0: Persistence state initialization
    projectId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    lastSavedVersion: 0,
    saveStatus: 'idle',
    isDirty: false,

    // History
    historyPast: [],
    historyFuture: [],
    historyPaused: false,
    resizingNodeIds: {},

    setHistoryPaused: (paused) => set({ historyPaused: paused }),

    clearHistory: () => set({ historyPast: [], historyFuture: [] }),

    pushHistory: (options) => {
        if (get().historyPaused) return;
        const now = Date.now();
        const past = get().historyPast;
        const mergeKey = options?.mergeKey;

        const last = past[past.length - 1];
        if (mergeKey && last?.mergeKey === mergeKey && now - last.timestamp < 1000) {
            return;
        }

        const snapshotStore = useSnapshotStore.getState();
        const entry: HistoryEntry = {
            timestamp: now,
            mergeKey,
            label: options?.label,
            graph: {
                nodes: cloneJson(get().nodes),
                edges: cloneJson(get().edges),
                viewport: cloneJson(get().viewport),
                selectedNodeId: get().selectedNodeId,
            },
            snapshot: {
                snapshots: cloneJson(snapshotStore.snapshots),
                snapshotHistory: cloneJson(snapshotStore.snapshotHistory),
                activeByProducerPort: cloneJson(snapshotStore.activeByProducerPort),
                subscriptions: cloneJson(snapshotStore.subscriptions),
                staleStates: cloneJson(snapshotStore.staleStates),
            },
        };

        const nextPast = [...past, entry].slice(-50);
        set({ historyPast: nextPast, historyFuture: [] });
    },

    undo: () => {
        const past = get().historyPast;
        if (past.length === 0) return;

        const snapshotStore = useSnapshotStore.getState();
        const current: HistoryEntry = {
            timestamp: Date.now(),
            graph: {
                nodes: cloneJson(get().nodes),
                edges: cloneJson(get().edges),
                viewport: cloneJson(get().viewport),
                selectedNodeId: get().selectedNodeId,
            },
            snapshot: {
                snapshots: cloneJson(snapshotStore.snapshots),
                snapshotHistory: cloneJson(snapshotStore.snapshotHistory),
                activeByProducerPort: cloneJson(snapshotStore.activeByProducerPort),
                subscriptions: cloneJson(snapshotStore.subscriptions),
                staleStates: cloneJson(snapshotStore.staleStates),
            },
        };

        const prev = past[past.length - 1];
        const nextPast = past.slice(0, -1);
        const nextFuture = [current, ...get().historyFuture].slice(0, 50);

        set({
            historyPaused: true,
            historyPast: nextPast,
            historyFuture: nextFuture,
            nodes: cloneJson(prev.graph.nodes),
            edges: cloneJson(prev.graph.edges),
            viewport: cloneJson(prev.graph.viewport),
            selectedNodeId: prev.graph.selectedNodeId,
            isDirty: true,
        });

        useSnapshotStore.setState(cloneJson(prev.snapshot));
        useSnapshotStore.getState().updateStaleStates();
        set({ historyPaused: false });
    },

    redo: () => {
        const future = get().historyFuture;
        if (future.length === 0) return;

        const snapshotStore = useSnapshotStore.getState();
        const current: HistoryEntry = {
            timestamp: Date.now(),
            graph: {
                nodes: cloneJson(get().nodes),
                edges: cloneJson(get().edges),
                viewport: cloneJson(get().viewport),
                selectedNodeId: get().selectedNodeId,
            },
            snapshot: {
                snapshots: cloneJson(snapshotStore.snapshots),
                snapshotHistory: cloneJson(snapshotStore.snapshotHistory),
                activeByProducerPort: cloneJson(snapshotStore.activeByProducerPort),
                subscriptions: cloneJson(snapshotStore.subscriptions),
                staleStates: cloneJson(snapshotStore.staleStates),
            },
        };

        const next = future[0];
        const nextFuture = future.slice(1);
        const nextPast = [...get().historyPast, current].slice(-50);

        set({
            historyPaused: true,
            historyPast: nextPast,
            historyFuture: nextFuture,
            nodes: cloneJson(next.graph.nodes),
            edges: cloneJson(next.graph.edges),
            viewport: cloneJson(next.graph.viewport),
            selectedNodeId: next.graph.selectedNodeId,
            isDirty: true,
        });

        useSnapshotStore.setState(cloneJson(next.snapshot));
        useSnapshotStore.getState().updateStaleStates();
        set({ historyPaused: false });
    },

    setNodes: (nodes) => set({ nodes, isDirty: true }),
    setEdges: (edges) => set({ edges, isDirty: true }),

    onNodesChange: (changes) => {
        // Track resize start (NodeResizer fires dimensions changes while resizing).
        const resizingMap = { ...get().resizingNodeIds };
        for (const change of changes as unknown as Array<{ id: string; type: string; resizing?: boolean }>) {
            if (change.type !== 'dimensions') continue;
            if (change.resizing === true && !resizingMap[change.id]) {
                get().pushHistory({ label: 'resize' });
                resizingMap[change.id] = true;
            }
            if (change.resizing === false && resizingMap[change.id]) {
                delete resizingMap[change.id];
            }
        }

        const isPersistentChange = (change: NodeChange<SkillNode>) =>
            change.type === 'position' ||
            change.type === 'dimensions' ||
            change.type === 'remove' ||
            change.type === 'add';

        set({
            resizingNodeIds: resizingMap,
            nodes: applyNodeChanges(changes, get().nodes) as SkillNode[],
            isDirty: get().isDirty || changes.some(isPersistentChange),
        });
    },

    onEdgesChange: (changes) => {
        if (changes.some(c => c.type === 'remove')) {
            get().pushHistory({ label: 'removeEdge' });
        }

        const oldEdges = get().edges;
        const newEdges = applyEdgeChanges(changes, oldEdges);

        // PRD v2.0: Handle edge deletion for subscription cleanup
        for (const change of changes) {
            if (change.type === 'remove') {
                const removedEdge = oldEdges.find(e => e.id === change.id);
                if (removedEdge) {
                    unsubscribeFromEdge(removedEdge);
                }
            }
        }

        set({ edges: newEdges, isDirty: true });
    },

    onConnect: (connection) => {
        get().pushHistory({ label: 'connect' });
        const { nodes } = get();
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        if (!sourceNode || !targetNode) return;

        // Get port types
        const sourceType = getPortTypeForHandle(
            sourceNode.type || 'skillNode',
            connection.sourceHandle || '',
            'source'
        );
        const targetType = getPortTypeForHandle(
            targetNode.type || 'skillNode',
            connection.targetHandle || '',
            'target'
        );

        // Validate port compatibility
        if (!isPortCompatible(sourceType, targetType)) {
            console.warn(`Port type mismatch: ${sourceType} -> ${targetType}`);
            // Still allow connection but mark it
        }

        const newEdge: SkillEdge = {
            ...connection,
            id: uuidv4(),
            animated: true,
            data: { sourceType, targetType, valid: isPortCompatible(sourceType, targetType) }
        };

        set({
            edges: addEdge(newEdge, get().edges as Edge[]) as SkillEdge[],
            isDirty: true,
        });

        // PRD v2.0: Create subscription for the new edge
        subscribeFromEdge(newEdge);
    },

    addNode: (skillType, position) => {
        get().pushHistory({ label: 'addNode' });
        // v1.7: Support new card types
        const nodeType = getNodeTypeForSkill(skillType);

        // v1.7 direct node types
        if (nodeType === 'imageStudio' || nodeType === 'uploadImage' || nodeType === 'groupFrame' || nodeType === 'media' || nodeType === 'upscale' || nodeType === 'edit') {
            const id = uuidv4();
            const newNode: SkillNode = {
                id,
                type: nodeType,
                position,
                data: {
                    skillId: skillType,
                    skillName: nodeType === 'imageStudio' ? 'Image Studio' :
                        nodeType === 'uploadImage' ? 'Upload Image' :
                            nodeType === 'media' ? 'Media' :
                                nodeType === 'upscale' ? 'Upscale' :
                                    nodeType === 'edit' ? 'Edit' : 'Group',
                    skillType: skillType,
                    params: {},
                    status: 'idle',
                    locked: false,
                    // Type-specific data
                    ...(nodeType === 'imageStudio' && { state: 'empty', prompt: '', results: [] }),
                    ...(nodeType === 'uploadImage' && { imageUrl: '', caption: '' }),
                    ...(nodeType === 'media' && { imageUrl: '' }),
                    ...(nodeType === 'upscale' && { scale: 2 }),
                    ...(nodeType === 'edit' && { operation: 'crop', ratio: '1:1' }),
                    ...(nodeType === 'groupFrame' && { groupType: mapSkillToGroupType(skillType) }),
                },
            };
            set({ nodes: [...get().nodes, newNode] });
            return id;
        }

        // TextCard types
        if (nodeType === 'textCard') {
            const role = skillType === 'brief' ? 'brief' : 'notes';
            const id = uuidv4();
            const newNode: SkillNode = {
                id,
                type: 'textCard',
                position,
                data: {
                    skillId: skillType,
                    skillName: role === 'brief' ? 'Brief' : 'Notes',
                    skillType: skillType,
                    params: {},
                    status: 'idle',
                    locked: false,
                    role: role,
                    content: '',
                },
            };
            set({ nodes: [...get().nodes, newNode] });
            return id;
        }

        // Legacy skill types
        const skillInfo = SKILL_TYPES[skillType];
        if (skillInfo) {
            const id = uuidv4();
            const newNode: SkillNode = {
                id,
                type: nodeType,
                position,
                data: {
                    skillId: skillType,
                    skillName: skillInfo.name,
                    skillType: skillType,
                    params: {},
                    status: 'idle',
                    locked: false,
                },
            };
            set({ nodes: [...get().nodes, newNode] });
            return id;
        }
        return null;
    },

    removeNode: (nodeId) => {
        get().pushHistory({ label: 'removeNode' });
        // Clean up subscriptions for edges that will be removed
        const edgesToRemove = get().edges.filter((e) => e.source === nodeId || e.target === nodeId);
        for (const edge of edgesToRemove) {
            unsubscribeFromEdge(edge);
        }
        set({
            nodes: get().nodes.filter((n) => n.id !== nodeId),
            edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        });
    },

    updateNodeParams: (nodeId, params) => {
        get().pushHistory({ mergeKey: `params:${nodeId}`, label: 'params' });
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, params: { ...node.data.params, ...params } } }
                    : node
            ),
        });
    },

    updateNodeStatus: (nodeId, status, output, error) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, status, output, error } }
                    : node
            ),
        });
    },

    toggleNodeLock: (nodeId) => {
        get().pushHistory({ mergeKey: `lock:${nodeId}`, label: 'lock' });
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, locked: !node.data.locked } }
                    : node
            ),
        });
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
    setIsRunning: (isRunning) => set({ isRunning }),

    resetGraph: () => {
        useSnapshotStore.getState().clearSnapshots();
        set({ nodes: [], edges: [], selectedNodeId: null, historyPast: [], historyFuture: [] });
    },

    loadGraph: (nodes, edges) => set({ nodes, edges }),

    // Node membership detection for GroupFrame
    updateNodeParent: (nodeId: string, parentId: string | null) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, parentId: parentId ?? undefined }
                    : node
            ),
        });
    },

    detectNodeMembership: (nodeId: string) => {
        const { nodes } = get();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        // Find GroupFrame nodes
        const groupFrames = nodes.filter(n => n.type === 'groupFrame');

        for (const group of groupFrames) {
            // Check if node is within group bounds
            const groupWidth = (group.measured?.width || group.width || 400) as number;
            const groupHeight = (group.measured?.height || group.height || 300) as number;
            const nodeWidth = (node.measured?.width || node.width || 200) as number;
            const nodeHeight = (node.measured?.height || node.height || 100) as number;

            const nodeCenterX = node.position.x + nodeWidth / 2;
            const nodeCenterY = node.position.y + nodeHeight / 2;

            if (
                nodeCenterX >= group.position.x &&
                nodeCenterX <= group.position.x + groupWidth &&
                nodeCenterY >= group.position.y &&
                nodeCenterY <= group.position.y + groupHeight
            ) {
                return group.id;
            }
        }
        return null;
    },

    // Get all nodes in a group
    getNodesInGroup: (groupId: string) => {
        return get().nodes.filter(n => n.parentId === groupId);
    },

    // PRD v2.0: Update node data (for component state sync)
    updateNodeData: (nodeId: string, data: Partial<SkillNodeData>) => {
        get().pushHistory({ mergeKey: `data:${nodeId}`, label: 'data' });
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
            isDirty: true,
        });
    },

    // PRD v2.0: Persistence actions
    setProjectId: (projectId: string | null) => set({ projectId }),

    setViewport: (viewport: { x: number; y: number; zoom: number }) => set({ viewport, isDirty: true }),

    markDirty: () => set({ isDirty: true }),

    setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict') => set({ saveStatus: status }),

    getGraphSnapshot: () => {
        const { nodes, edges } = get();
        // Serialize nodes and edges for persistence
        return {
            nodes: nodes.map(node => ({
                id: node.id,
                type: node.type,
                position: node.position,
                parentId: node.parentId,
                style: node.style,
                data: node.data,
            })),
            edges: edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                data: edge.data,
            })),
        };
    },

    loadFromServer: async (projectId: string) => {
        try {
            set({ historyPaused: true, historyPast: [], historyFuture: [] });
            const response = await fetch(`/api/projects/${projectId}/graph`);
            const result = await response.json();

            if (!result.success) {
                console.error('Failed to load graph:', result.error);
                return false;
            }

            const { graph_snapshot, viewport, version } = result.data;

            const nextNodes = (graph_snapshot.nodes || []) as SkillNode[];
            const nextEdges = (graph_snapshot.edges || []) as SkillEdge[];

            // Restore nodes and edges
            set({
                projectId,
                nodes: nextNodes,
                edges: nextEdges,
                viewport: viewport || { x: 0, y: 0, zoom: 1 },
                lastSavedVersion: version,
                saveStatus: 'saved',
                isDirty: false,
                selectedNodeId: null,
            });

            // Rebuild edge-based subscriptions and rehydrate snapshots (SnapshotStore is ephemeral).
            const snapshotStore = useSnapshotStore.getState();
            snapshotStore.clearSnapshots();
            syncSubscriptionsFromEdges(nextEdges);
            hydrateSnapshotsFromNodes(nextNodes);

            set({ historyPaused: false });
            return true;
        } catch (error) {
            console.error('Error loading graph from server:', error);
            set({ historyPaused: false });
            return false;
        }
    },

    saveToServer: async (force = false) => {
        const { projectId, lastSavedVersion, isDirty, getGraphSnapshot, viewport } = get();

        if (!projectId) {
            console.error('No project ID set, cannot save');
            return false;
        }

        if (!isDirty && !force) {
            // Nothing to save
            return true;
        }

        set({ saveStatus: 'saving' });

        try {
            const graphSnapshot = getGraphSnapshot();

            const response = await fetch(`/api/projects/${projectId}/graph`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base_version: lastSavedVersion,
                    graph_snapshot: graphSnapshot,
                    viewport,
                    force,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                if (result.conflict) {
                    set({ saveStatus: 'conflict' });
                    console.warn('Version conflict detected, server version:', result.server_version);
                    return false;
                }
                set({ saveStatus: 'error' });
                console.error('Failed to save graph:', result.error);
                return false;
            }

            set({
                lastSavedVersion: result.data.version,
                saveStatus: 'saved',
                isDirty: false,
            });

            return true;
        } catch (error) {
            set({ saveStatus: 'error' });
            console.error('Error saving graph to server:', error);
            return false;
        }
    },
}));
