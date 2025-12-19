'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import { Image as ImageIcon, Search, X, Plus, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ActionBar, type ActionId } from '@/components/canvas/ActionBar';
import { useGraphStore } from '@/store/graphStore';
import { useSnapshotStore, type OutputSnapshot, type PortKey } from '@/store/snapshotStore';
import { useRecipeStore } from '@/store/recipeStore';

interface MediaData {
    imageUrl?: string;
    locked?: boolean;
    color?: string;
    skillName?: string;
    status?: 'idle' | 'running' | 'success' | 'fail';
}

interface MediaCardProps {
    id: string;
    data: Partial<MediaData>;
    selected?: boolean;
}

type MediaAsset = {
    snapshotId: string;
    url: string;
    createdAt: number;
    producerId: string;
};

function MediaCardComponent({ id, data, selected }: MediaCardProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');

    const imageUrl = (data.imageUrl as string | undefined) || '';
    const locked = !!data.locked;

    // Performance: Use individual selectors to avoid re-render on unrelated changes
    const setNodes = useGraphStore(state => state.setNodes);
    const removeNode = useGraphStore(state => state.removeNode);
    const toggleNodeLock = useGraphStore(state => state.toggleNodeLock);
    const updateNodeData = useGraphStore(state => state.updateNodeData);
    const createSnapshot = useSnapshotStore(s => s.createSnapshot);
    const resetSnapshots = useSnapshotStore(s => s.resetSnapshots);
    const snapshotHistory = useSnapshotStore(s => s.snapshotHistory);

    const cycleColor = useCallback(() => {
        const colors = [undefined, '#FEF3C7', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#E0E7FF'] as const;
        const current = data.color as string | undefined;
        const currentIndex = Math.max(0, colors.findIndex(c => c === current));
        const next = colors[(currentIndex + 1) % colors.length];
        updateNodeData(id, { color: next });
    }, [id, data.color, updateNodeData]);

    const assets = useMemo<MediaAsset[]>(() => {
        const list: MediaAsset[] = [];

        for (const [producerId, ports] of Object.entries(snapshotHistory)) {
            if (producerId === id) continue;
            const history = (ports as Record<string, OutputSnapshot[] | undefined>)['imageOut'] || [];
            for (const snap of history) {
                const url = typeof snap.payload === 'string' ? snap.payload : null;
                if (!url) continue;
                list.push({
                    snapshotId: snap.snapshot_id,
                    url,
                    createdAt: snap.created_at,
                    producerId,
                });
            }
        }

        list.sort((a, b) => b.createdAt - a.createdAt);

        // Deduplicate by url (keep most recent)
        const seen = new Set<string>();
        return list.filter(item => {
            if (seen.has(item.url)) return false;
            seen.add(item.url);
            return true;
        });
    }, [snapshotHistory, id]);

    const filteredAssets = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return assets;
        return assets.filter(a =>
            a.url.toLowerCase().includes(q) || a.producerId.toLowerCase().includes(q)
        );
    }, [assets, search]);

    const applyAsset = useCallback((asset: MediaAsset) => {
        if (locked) return;
        updateNodeData(id, { imageUrl: asset.url, source: 'media' });
        setPickerOpen(false);
        setSearch('');
    }, [id, locked, updateNodeData, createSnapshot]);

    const lastEmittedUrlRef = useRef<string>('');

    // Ensure Media node outputs are reconstructed from persisted node data (SnapshotStore is ephemeral).
    useEffect(() => {
        if (locked) return;
        if (!imageUrl) {
            lastEmittedUrlRef.current = '';
            return;
        }
        if (lastEmittedUrlRef.current === imageUrl) return;
        lastEmittedUrlRef.current = imageUrl;
        createSnapshot(id, 'imageOut' as PortKey, imageUrl);
    }, [id, imageUrl, locked, createSnapshot]);

    const handleReset = useCallback(() => {
        if (locked) return;
        updateNodeData(id, { imageUrl: '' });
        resetSnapshots(id, 'imageOut' as PortKey);
    }, [id, locked, updateNodeData, resetSnapshots]);

    const handleAction = (actionId: ActionId) => {
        switch (actionId) {
            case 'replaceInput':
                if (!locked) setPickerOpen(true);
                break;
            case 'resetInput':
                handleReset();
                break;
            case 'saveToAssets':
                (async () => {
                    const projectId = useGraphStore.getState().projectId;
                    if (!projectId) return;
                    if (!imageUrl) return;

                    const latestRecipe = useRecipeStore.getState().getLatestRecipe(id);
                    const recipeId = latestRecipe?.id || 'media';

                    await fetch('/api/posters', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            project_id: projectId,
                            image_url: imageUrl,
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
                const currentName = (data.skillName as string | undefined) || 'Media';
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
    };

    return (
        <div className="group/card relative">
            {/* PRD v2.1: Action Bar */}
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
                <ActionBar
                    nodeId={id}
                    nodeType="media"
                    isLocked={locked}
                    hasResults={!!imageUrl}
                    onAction={handleAction}
                />
            </NodeToolbar>

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
                    bg-white rounded-[32px] overflow-hidden min-w-[280px] max-w-[360px]
                    flex flex-col relative
                    transition-all duration-200
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                `}
                style={{ backgroundColor: (data.color as string | undefined) || undefined }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2 text-gray-800">
                        <Sparkles size={16} className="text-gray-500" />
                        <span className="font-medium text-sm">{(data.skillName as string | undefined) || 'Media'}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => !locked && setPickerOpen(true)}
                        disabled={locked}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40"
                    >
                        Choose
                    </button>
                </div>

                {/* Image Area */}
                <div className="relative w-full aspect-[4/3] bg-gray-50">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Media"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <ImageIcon size={28} className="text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400">
                                Pick an existing image from this canvas session
                            </p>
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => setPickerOpen(true)}
                                className="mt-3 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Open picker
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-[10px] text-gray-400">
                        Output: imageOut
                    </div>
                    {imageUrl && (
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={locked}
                            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Picker Modal */}
            {pickerOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
                    onClick={() => { setPickerOpen(false); setSearch(''); }}
                >
                    <div
                        className="w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-900">Select Media</div>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => { setPickerOpen(false); setSearch(''); }}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                                <Search size={14} className="text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search (url / producer id)"
                                    className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
                                />
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400">
                                Showing {filteredAssets.length} images from current session
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto">
                            {filteredAssets.length === 0 ? (
                                <div className="py-16 text-center text-sm text-gray-500">
                                    No images found. Generate or upload an image first.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {filteredAssets.map(asset => (
                                        <button
                                            key={asset.snapshotId}
                                            type="button"
                                            onClick={() => applyAsset(asset)}
                                            className="group rounded-xl overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left"
                                        >
                                            <div className="relative aspect-[4/3] bg-gray-50">
                                                <img
                                                    src={asset.url}
                                                    alt="Asset"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="p-2">
                                                <div className="text-[10px] text-gray-500 truncate" title={asset.producerId}>
                                                    {asset.producerId}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(MediaCardComponent);
