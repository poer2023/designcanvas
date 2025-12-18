'use client';

import { useState, useCallback, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
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

interface UploadImageData {
    imageUrl?: string;
    caption?: string;
    favorite?: boolean;
    locked?: boolean;
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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageUrl(event.target?.result as string);
            };
            reader.readAsDataURL(files[0]);
        }
    }, []);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setImageUrl(event.target?.result as string);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    }, []);

    const handleClear = useCallback(() => {
        setImageUrl('');
    }, []);

    const isFinal = favorite || locked;

    return (
        <div className="group/card relative">
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
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add caption..."
                        className="w-full px-4 py-3 text-sm bg-white/80 backdrop-blur-md border border-gray-200 rounded-[20px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:bg-white"
                    />
                </div>
            </div>
        </div>
    );
}

export default memo(UploadImageComponent);
