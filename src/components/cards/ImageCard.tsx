'use client';

import { useState, useCallback, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Image as ImageIcon,
    Star,
    Lock,
    Unlock,
    Scissors,
    Copy,
    Download,
    X,
    Plus,
    Check,
} from 'lucide-react';

type ImageRole = 'raw' | 'candidate' | 'element';

interface ImageCardData {
    role: ImageRole;
    imageUrl?: string;
    favorite?: boolean;
    locked?: boolean;
    tags?: string[];
    note?: string;
    // Element-specific
    maskUrl?: string;
}

interface ImageCardProps {
    id: string;
    data: ImageCardData;
    selected?: boolean;
}

function ImageCardComponent({ id, data, selected }: ImageCardProps) {
    const [role] = useState<ImageRole>(data.role || 'raw');
    const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
    const [favorite, setFavorite] = useState(data.favorite || false);
    const [locked, setLocked] = useState(data.locked || false);
    const [tags, setTags] = useState<string[]>(data.tags || []);
    const [note, setNote] = useState(data.note || '');
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
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-gray-400 group-hover/handle:shadow-lg group-hover/handle:scale-110">
                    <Plus size={14} className="text-gray-500" />
                </div>
            </div>

            {/* Right Handle (Source) - Small button only */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
                <Plus size={14} className="text-gray-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    bg-white rounded-[32px] overflow-hidden min-w-[300px] max-w-[400px]
                    flex flex-col
                    transition-all duration-200
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                    ${isFinal ? 'ring-2 ring-amber-400' : ''}
                `}
                onPaste={handlePaste}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <ImageIcon size={18} className="text-gray-600" />
                        <span className="font-semibold text-sm capitalize">{role} Image</span>
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
                        relative w-full aspect-video group
                        ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-gray-50'}
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Card image"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <ImageIcon size={32} className="text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400">
                                Drop or Paste Image
                            </p>
                        </div>
                    )}
                </div>

                {/* Element Info (only for element role) */}
                {role === 'element' && (
                    <div className="px-6 py-4 space-y-3">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                >
                                    {tag}
                                    <button
                                        onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                                        className="hover:text-purple-900"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={() => {
                                    const newTag = prompt('Enter tag:');
                                    if (newTag) setTags([...tags, newTag]);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        {/* Note */}
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add note..."
                            className="w-full px-3 py-2 text-sm bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                )}

                {/* Actions Footer (for candidate) */}
                {role === 'candidate' && imageUrl && (
                    <div className="px-6 py-4 flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                            <Copy size={14} />
                            Variations
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                            <Scissors size={14} />
                            Extract
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                            <Download size={14} />
                            Export
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(ImageCardComponent);
