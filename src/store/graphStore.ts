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
        set({
            edges: addEdge(
                { ...connection, id: uuidv4(), animated: true },
                get().edges
            ),
        });
    },

    addNode: (skillType, position) => {
        const skillInfo = SKILL_TYPES[skillType];
        if (!skillInfo) return;

        const newNode: SkillNode = {
            id: uuidv4(),
            type: 'skillNode',
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
}));
