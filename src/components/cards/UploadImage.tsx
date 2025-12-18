'use client';

import { useState, useCallback, memo, useRef } from 'react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import {
    Upload,
    Image as ImageIcon,
    Star,
    Lock,
    Unlock,
    X,
    Plus,
    Sparkles,
} from 'lucide-react';
import { ActionBar, type ActionId } from '@/components/canvas/ActionBar';
import { useGraphStore } from '@/store/graphStore';
import { useSnapshotStore, type PortKey } from '@/store/snapshotStore';
import { v4 as uuidv4 } from 'uuid';

interface UploadImageData {
    imageUrl?: string;
    caption?: string;
    favorite?: boolean;
    locked?: boolean;
    color?: string;
    skillName?: string;
    status?: 'idle' | 'running' | 'success' | 'fail';
}

interface UploadImageProps {
    id: string;
    data: Partial<UploadImageData>;
    selected?: boolean;
}

function UploadImageComponent({ id, data, selected }: UploadImageProps) {
    const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
    const [caption, setCaption] = useState(data.caption || '');
    const [favorite, setFavorite] = useState(data.favorite || false);
    const [locked, setLocked] = useState(data.locked || false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { nodes, setNodes, removeNode, toggleNodeLock, updateNodeData } = useGraphStore();
    const createSnapshot = useSnapshotStore(state => state.createSnapshot);
    const resetSnapshots = useSnapshotStore(state => state.resetSnapshots);

    const cycleColor = useCallback(() => {
        const colors = [undefined, '#FEF3C7', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#E0E7FF'] as const;
        const current = data.color as string | undefined;
        const currentIndex = Math.max(0, colors.findIndex(c => c === current));
        const next = colors[(currentIndex + 1) % colors.length];
        updateNodeData(id, { color: next });
    }, [id, data.color, updateNodeData]);

    const writeSnapshots = useCallback((url: string, nextCaption: string, source: string) => {
        createSnapshot(id, 'imageOut' as PortKey, url);
        createSnapshot(id, 'contextOut' as PortKey, {
            imageUrl: url,
            caption: nextCaption,
            source,
            nodeId: id,
            timestamp: Date.now(),
        });
    }, [id, createSnapshot]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                setImageUrl(url);
                updateNodeData(id, { imageUrl: url, source: 'dragdrop' });
                writeSnapshots(url, caption, 'dragdrop');
            };
            reader.readAsDataURL(files[0]);
        }
    }, [id, caption, updateNodeData, writeSnapshots]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const url = event.target?.result as string;
                        setImageUrl(url);
                        updateNodeData(id, { imageUrl: url, source: 'paste' });
                        writeSnapshots(url, caption, 'paste');
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    }, [id, caption, updateNodeData, writeSnapshots]);

    const handleClear = useCallback(() => {
        setImageUrl('');
        updateNodeData(id, { imageUrl: '' });
        resetSnapshots(id, 'imageOut' as PortKey);
        resetSnapshots(id, 'contextOut' as PortKey);
    }, [id, resetSnapshots, updateNodeData]);

    const isFinal = favorite || locked;

    const handleReplaceInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            setImageUrl(url);
            updateNodeData(id, { imageUrl: url, source: 'picker' });
            writeSnapshots(url, caption, 'picker');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [id, caption, updateNodeData, writeSnapshots]);

    const handleAction = useCallback((actionId: ActionId) => {
        switch (actionId) {
            case 'replaceInput':
                handleReplaceInput();
                break;
            case 'resetInput':
                handleClear();
                break;
            case 'duplicate': {
                const nodeToCopy = nodes.find(n => n.id === id);
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
                setNodes([...nodes, newNode]);
                break;
            }
            case 'delete':
                removeNode(id);
                break;
            case 'lock':
            case 'unlock':
                toggleNodeLock(id);
                setLocked(!locked);
                break;
            case 'rename': {
                const currentName = (data.skillName as string | undefined) || 'Upload Image';
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
    }, [handleReplaceInput, handleClear, nodes, setNodes, removeNode, toggleNodeLock, id, locked, data.skillName, updateNodeData, cycleColor]);

    return (
        <div className="group/card relative">
            {/* PRD v2.1: Action Bar */}
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
                <ActionBar
                    nodeId={id}
                    nodeType="uploadImage"
                    isLocked={locked}
                    hasResults={!!imageUrl}
                    onAction={handleAction}
                />
            </NodeToolbar>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
            {/* Left Handle (Target) - Full height hit area, visual button centered */}
            <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-blue-400 group-hover/handle:shadow-lg group-hover/handle:bg-blue-50">
                    <Plus size={14} className="text-gray-500 group-hover/handle:text-blue-500" />
                </div>
            </div>

            {/* Right Handles (Source) - Dual outputs */}
            {/* Image Out - for image data (top position) */}
            <Handle
                type="source"
                position={Position.Right}
                id="imageOut"
                className="!w-6 !h-6 !bg-white !border !border-blue-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-blue-500 hover:!shadow-lg hover:!bg-blue-50"
                style={{ top: '40%', transform: 'translateY(-50%)' }}
            >
                <ImageIcon size={10} className="text-blue-500 pointer-events-none" />
            </Handle>
            {/* Context Out - for caption and metadata (bottom position) */}
            <Handle
                type="source"
                position={Position.Right}
                id="contextOut"
                className="!w-6 !h-6 !bg-white !border !border-purple-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-purple-500 hover:!shadow-lg hover:!bg-purple-50"
                style={{ top: '60%', transform: 'translateY(-50%)' }}
            >
                <Sparkles size={10} className="text-purple-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    bg-white rounded-[32px] overflow-hidden min-w-[300px] max-w-[400px]
                    flex flex-col relative
                    transition-all duration-200
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                    ${isFinal ? 'ring-2 ring-amber-400' : ''}
                `}
                style={{ backgroundColor: (data.color as string | undefined) || undefined }}
                onPaste={handlePaste}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <Upload size={18} className="text-gray-600" />
                        <span className="font-semibold text-sm">Upload Image</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setFavorite(!favorite)}
                            className={`p-2 rounded-full transition-colors ${favorite
                                ? 'text-amber-500 bg-amber-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={() => setLocked(!locked)}
                            className={`p-2 rounded-full transition-colors ${locked
                                ? 'text-blue-500 bg-blue-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                    </div>
                </div>

                {/* Image Area */}
                <div
                    className={`
                        relative w-full aspect-[4/3] group
                        ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-gray-50'}
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {imageUrl ? (
                        <>
                            <img
                                src={imageUrl}
                                alt="Uploaded"
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={handleClear}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                                <X size={14} />
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <ImageIcon size={32} className="text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400">
                                Drop or paste image
                            </p>
                        </div>
                    )}
                </div>

                {/* Floating Caption Input (Bottom) */}
                <div className="absolute bottom-4 left-4 right-4">
                    <input
                        value={caption}
                        onChange={(e) => {
                            const next = e.target.value;
                            setCaption(next);
                            updateNodeData(id, { caption: next });
                            if (imageUrl) {
                                createSnapshot(id, 'contextOut' as PortKey, {
                                    imageUrl,
                                    caption: next,
                                    source: 'caption',
                                    nodeId: id,
                                    timestamp: Date.now(),
                                });
                            }
                        }}
                        placeholder="Add caption..."
                        className="w-full px-4 py-3 text-sm bg-white/80 backdrop-blur-md border border-gray-200 rounded-[20px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:bg-white"
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(UploadImageComponent);
