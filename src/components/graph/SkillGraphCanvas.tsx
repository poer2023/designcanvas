'use client';

import { useCallback, useRef, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    ReactFlowProvider,
    useReactFlow,
    type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Square, Trash2 } from 'lucide-react';
import { useGraphStore, SKILL_TYPES, SkillNode } from '@/store/graphStore';
import SkillNodeComponent from './SkillNode';
import NodeParamsPanel from './NodeParamsPanel';

// Use type assertion to bypass React Flow + React 19 type incompatibility
const nodeTypes = {
    skillNode: SkillNodeComponent,
} as NodeTypes;

function SkillGraphCanvasInner() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const {
        nodes,
        edges,
        selectedNodeId,
        isRunning,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        resetGraph,
        setIsRunning,
    } = useGraphStore();

    const selectedNode = useMemo(
        () => nodes.find((n) => n.id === selectedNodeId) || null,
        [nodes, selectedNodeId]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const skillType = event.dataTransfer.getData('application/skilltype');
            if (!skillType) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            addNode(skillType, position);
        },
        [screenToFlowPosition, addNode]
    );

    const handleRunGraph = useCallback(async () => {
        setIsRunning(true);
        // Simulate execution
        for (const node of nodes) {
            useGraphStore.getState().updateNodeStatus(node.id, 'running');
            await new Promise((resolve) => setTimeout(resolve, 500));
            useGraphStore.getState().updateNodeStatus(node.id, 'success', { result: 'mock' });
        }
        setIsRunning(false);
    }, [nodes, setIsRunning]);

    const handleStopGraph = useCallback(() => {
        setIsRunning(false);
        nodes.forEach((node) => {
            if (node.data.status === 'running') {
                useGraphStore.getState().updateNodeStatus(node.id, 'idle');
            }
        });
    }, [nodes, setIsRunning]);

    return (
        <div className="flex h-full">
            {/* Graph Canvas */}
            <div className="flex-1 relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    className="bg-app"
                >
                    <Background color="var(--border-subtle)" gap={24} size={1} />
                    <Controls className="!bg-panel !border-subtle !rounded-lg !shadow-lg" />
                    <MiniMap
                        className="!bg-panel !border-subtle !rounded-lg"
                        nodeColor={(node) => {
                            const n = node as SkillNode;
                            return SKILL_TYPES[n.data?.skillType]?.color || '#666';
                        }}
                    />

                    {/* Top Toolbar */}
                    <Panel position="top-center" className="flex gap-2">
                        <div className="flex items-center gap-2 bg-panel border border-subtle rounded-lg p-1.5 shadow-lg">
                            {isRunning ? (
                                <button
                                    onClick={handleStopGraph}
                                    className="btn btn-ghost h-8 px-3 text-red-500 hover:bg-red-500/10"
                                >
                                    <Square size={14} fill="currentColor" />
                                    <span>Stop</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleRunGraph}
                                    className="btn btn-primary h-8 px-3"
                                    disabled={nodes.length === 0}
                                >
                                    <Play size={14} fill="currentColor" />
                                    <span>Run</span>
                                </button>
                            )}
                            <div className="w-px h-6 bg-border-subtle" />
                            <button
                                onClick={resetGraph}
                                className="btn btn-ghost h-8 px-2"
                                title="Reset Graph"
                                disabled={isRunning}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </Panel>
                </ReactFlow>

                {/* Empty State */}
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center p-8 bg-panel/80 backdrop-blur-sm border border-subtle rounded-2xl max-w-sm">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="heading-md mb-2">Build Your Workflow</h3>
                            <p className="text-secondary text-sm mb-4">
                                Drag skills from the sidebar to create your poster generation pipeline.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Skills Palette */}
            <div className="w-[220px] bg-panel border-l border-subtle p-4 overflow-y-auto">
                <div className="mb-4">
                    <h3 className="heading-sm mb-1">Skills</h3>
                    <p className="text-xs text-tertiary">Drag to add</p>
                </div>
                <div className="space-y-2">
                    {Object.entries(SKILL_TYPES).map(([type, info]) => (
                        <div
                            key={type}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/skilltype', type);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            className="flex items-center gap-2 p-2 rounded-lg border border-subtle bg-card hover:bg-card-hover cursor-grab active:cursor-grabbing transition-colors"
                        >
                            <span className="text-lg">{info.icon}</span>
                            <span className="text-xs font-medium text-primary">{info.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Node Params Panel */}
            {selectedNode && (
                <NodeParamsPanel
                    nodeId={selectedNode.id}
                    data={{
                        skillId: selectedNode.data.skillId,
                        skillName: selectedNode.data.skillName,
                        skillType: selectedNode.data.skillType,
                        params: selectedNode.data.params,
                        status: selectedNode.data.status,
                        locked: selectedNode.data.locked,
                        output: selectedNode.data.output as Record<string, unknown> | null | undefined,
                        error: selectedNode.data.error,
                    }}
                />
            )}
        </div>
    );
}

export default function SkillGraphCanvas() {
    return (
        <ReactFlowProvider>
            <SkillGraphCanvasInner />
        </ReactFlowProvider>
    );
}
