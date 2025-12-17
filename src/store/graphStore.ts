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

interface GraphState {
    nodes: SkillNode[];
    edges: SkillEdge[];
    selectedNodeId: string | null;
    isRunning: boolean;

    // Actions
    setNodes: (nodes: SkillNode[]) => void;
    setEdges: (edges: SkillEdge[]) => void;
    onNodesChange: (changes: NodeChange<SkillNode>[]) => void;
    onEdgesChange: (changes: EdgeChange<SkillEdge>[]) => void;
    onConnect: (connection: Connection) => void;

    addNode: (skillType: string, position: { x: number; y: number }) => void;
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

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as SkillNode[],
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    onConnect: (connection) => {
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

        set({
            edges: addEdge(
                {
                    ...connection,
                    id: uuidv4(),
                    animated: true,
                    data: { sourceType, targetType, valid: isPortCompatible(sourceType, targetType) }
                },
                get().edges
            ),
        });
    },

    addNode: (skillType, position) => {
        // v1.7: Support new card types
        const nodeType = getNodeTypeForSkill(skillType);

        // v1.7 direct node types
        if (nodeType === 'imageStudio' || nodeType === 'uploadImage' || nodeType === 'groupFrame') {
            const newNode: SkillNode = {
                id: uuidv4(),
                type: nodeType,
                position,
                data: {
                    skillId: skillType,
                    skillName: nodeType === 'imageStudio' ? 'Image Studio' :
                        nodeType === 'uploadImage' ? 'Upload Image' : 'Group',
                    skillType: skillType,
                    params: {},
                    status: 'idle',
                    locked: false,
                    // Type-specific data
                    ...(nodeType === 'imageStudio' && { state: 'empty', prompt: '', results: [] }),
                    ...(nodeType === 'uploadImage' && { imageUrl: '', caption: '' }),
                    ...(nodeType === 'groupFrame' && { groupType: mapSkillToGroupType(skillType) }),
                },
            };
            set({ nodes: [...get().nodes, newNode] });
            return;
        }

        // TextCard types
        if (nodeType === 'textCard') {
            const role = skillType === 'brief' ? 'brief' : 'notes';
            const newNode: SkillNode = {
                id: uuidv4(),
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
            return;
        }

        // Legacy skill types
        const skillInfo = SKILL_TYPES[skillType];
        if (skillInfo) {
            const newNode: SkillNode = {
                id: uuidv4(),
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
        }
    },

    removeNode: (nodeId) => {
        set({
            nodes: get().nodes.filter((n) => n.id !== nodeId),
            edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        });
    },

    updateNodeParams: (nodeId, params) => {
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

    resetGraph: () => set({ nodes: [], edges: [], selectedNodeId: null }),

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
}));
