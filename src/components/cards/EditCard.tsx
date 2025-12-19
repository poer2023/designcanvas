'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import { Plus, Scissors, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ActionBar, type ActionId } from '@/components/canvas/ActionBar';
import { useGraphStore } from '@/store/graphStore';
import { useSnapshotStore, type PortKey } from '@/store/snapshotStore';
import { runGraph } from '@/lib/engine/runner';
import { useRecipeStore } from '@/store/recipeStore';

interface EditData {
    operation?: 'crop';
    ratio?: string;
    locked?: boolean;
    color?: string;
    skillName?: string;
    status?: 'idle' | 'running' | 'success' | 'fail';
}

interface EditCardProps {
    id: string;
    data: Partial<EditData>;
    selected?: boolean;
}

const RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'];

function EditCardComponent({ id, data, selected }: EditCardProps) {
    const [previewOpen, setPreviewOpen] = useState(false);

    const locked = !!data.locked;
    const ratio = (data.ratio as string | undefined) || '1:1';
    const isRunning = data.status === 'running';

    // Performance: Use individual selectors to avoid re-render on unrelated changes
    const setNodes = useGraphStore(state => state.setNodes);
    const removeNode = useGraphStore(state => state.removeNode);
    const toggleNodeLock = useGraphStore(state => state.toggleNodeLock);
    const updateNodeData = useGraphStore(state => state.updateNodeData);
    const updateNodeStatus = useGraphStore(state => state.updateNodeStatus);
    const resetSnapshots = useSnapshotStore(s => s.resetSnapshots);
    const staleState = useSnapshotStore(s => s.getStaleState(id));

    const inputImage = useSnapshotStore(
        useCallback((state) => {
            const subs = state.subscriptions[id] || [];
            const imageSub = subs.find(s => s.port_key === 'imageOut');
            if (!imageSub) return null;
            const snap = state.snapshots[imageSub.producer_id]?.['imageOut'];
            const payload = snap?.payload;
            return typeof payload === 'string' ? payload : null;
        }, [id])
    );

    const outputImage = useSnapshotStore(
        useCallback((state) => {
            const snap = state.getActiveSnapshot(id, 'imageOut' as PortKey);
            const payload = snap?.payload;
            return typeof payload === 'string' ? payload : null;
        }, [id])
    );

    const missingInputs = useMemo(() => {
        if (!inputImage) return ['image'];
        return [];
    }, [inputImage]);

    const canRun = !locked && !!inputImage;
    const hasResults = !!outputImage;

    const cycleColor = useCallback(() => {
        const colors = [undefined, '#FEF3C7', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#E0E7FF'] as const;
        const current = data.color as string | undefined;
        const currentIndex = Math.max(0, colors.findIndex(c => c === current));
        const next = colors[(currentIndex + 1) % colors.length];
        updateNodeData(id, { color: next });
    }, [id, data.color, updateNodeData]);

    const handleReset = useCallback(() => {
        useGraphStore.getState().pushHistory({ label: 'reset' });
        resetSnapshots(id, 'imageOut' as PortKey);
        updateNodeStatus(id, 'idle');
    }, [id, resetSnapshots, updateNodeStatus]);

    const handleAction = useCallback((actionId: ActionId) => {
        switch (actionId) {
            case 'run':
                (async () => {
                    await runGraph({ mode: 'RUN_NODE', startNodeId: id });
                })();
                break;
            case 'runFromHere':
                (async () => {
                    await runGraph({ mode: 'RUN_FROM_HERE', startNodeId: id });
                })();
                break;
            case 'reset':
                handleReset();
                break;
            case 'preview':
                if (hasResults) setPreviewOpen(true);
                break;
            case 'saveToAssets':
                (async () => {
                    const projectId = useGraphStore.getState().projectId;
                    if (!projectId) return;

                    const snap = useSnapshotStore.getState().getActiveSnapshot(id, 'imageOut' as PortKey);
                    const url = snap?.payload;
                    if (typeof url !== 'string' || !url) return;

                    const latestRecipe = useRecipeStore.getState().getLatestRecipe(id);
                    const recipeId = latestRecipe?.id || 'edit';

                    await fetch('/api/posters', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_id: projectId,
                            image_url: url,
                            recipe_id: recipeId,
                            seed: 0,
                            tags: [],
                        }),
                    });

                    window.dispatchEvent(new Event('posterlab:assets-updated'));
                })();
                break;
            case 'duplicate': {
                const store = useGraphStore.getState();
                store.pushHistory({ label: 'duplicate' });
                const nodeToCopy = store.nodes.find(n => n.id === id);
                if (!nodeToCopy) return;
                const newNode = {
                    ...JSON.parse(JSON.stringify(nodeToCopy)),
                    id: uuidv4(),
                    position: {
                        x: nodeToCopy.position.x + 50,
                        y: nodeToCopy.position.y + 50,
                    },
                    parentId: undefined,
                    selected: false,
                };
                setNodes([...store.nodes, newNode]);
                break;
            }
            case 'delete':
                removeNode(id);
                break;
            case 'lock':
            case 'unlock':
                toggleNodeLock(id);
                break;
            case 'rename': {
                const currentName = (data.skillName as string | undefined) || 'Edit';
                const nextName = window.prompt('Rename node', currentName);
                if (nextName && nextName.trim()) updateNodeData(id, { skillName: nextName.trim() });
                break;
            }
            case 'color':
                cycleColor();
                break;
            default:
                break;
        }
    }, [id, setNodes, removeNode, toggleNodeLock, data.skillName, updateNodeData, cycleColor, handleReset, hasResults]);

    return (
        <div className="group/card relative">
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
                <ActionBar
                    nodeId={id}
                    nodeType="edit"
                    isLocked={locked}
                    isRunning={isRunning}
                    hasResults={hasResults}
                    canRun={canRun}
                    missingInputs={missingInputs}
                    onAction={handleAction}
                />
            </NodeToolbar>

            {/* Left Handle (Target) - imageIn */}
            <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    id="imageIn"
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-blue-400 group-hover/handle:shadow-lg group-hover/handle:bg-blue-50">
                    <Plus size={14} className="text-gray-500 group-hover/handle:text-blue-500" />
                </div>
            </div>

            {/* Right Handle (Source) - imageOut */}
            <Handle
                type="source"
                position={Position.Right}
                id="imageOut"
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-blue-400 hover:!shadow-lg hover:!bg-blue-50"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
                <Plus size={14} className="text-gray-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    bg-white rounded-[32px] overflow-hidden min-w-[300px] max-w-[420px]
                    flex flex-col relative
                    transition-all duration-200
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                `}
                style={{ backgroundColor: (data.color as string | undefined) || undefined }}
            >
                {/* Stale indicator */}
                {staleState !== 'fresh' && (
                    <div className={`absolute top-0 right-0 m-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${staleState === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {staleState === 'blocked' ? 'Blocked' : 'Stale'}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2 text-gray-800">
                        <Scissors size={16} className="text-gray-500" />
                        <span className="font-medium text-sm">{(data.skillName as string | undefined) || 'Edit'}</span>
                    </div>

                    <select
                        value={ratio}
                        disabled={locked}
                        onChange={(e) => updateNodeData(id, { ratio: e.target.value, operation: 'crop' })}
                        className="px-2 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-700 bg-white disabled:opacity-40"
                        title="Crop ratio"
                    >
                        {RATIOS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 space-y-3">
                    <div className="text-[10px] text-gray-400">Input</div>
                    <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        {inputImage ? (
                            <img src={inputImage} alt="Input" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-gray-400">
                                Connect an image
                            </div>
                        )}
                    </div>

                    <div className="text-[10px] text-gray-400">Output</div>
                    <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        {outputImage ? (
                            <img src={outputImage} alt="Output" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-xs text-gray-400">
                                Run to generate output
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewOpen && outputImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center"
                    onClick={() => setPreviewOpen(false)}
                >
                    <button
                        onClick={() => setPreviewOpen(false)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={outputImage}
                        alt="Preview"
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}

export default memo(EditCardComponent);
