'use client';

import { X, Star, Trash2, Download, ChevronLeft, ChevronRight, Scissors, Copy } from 'lucide-react';
import type { Poster } from '@/types/poster';

interface PosterDetailProps {
    poster: Poster;
    onClose: () => void;
    onFavorite: () => void;
    onReject: () => void;
    onDelete: () => void;
}

export default function PosterDetail({
    poster,
    onClose,
    onFavorite,
    onReject,
    onDelete
}: PosterDetailProps) {
    return (
        <div className="fixed inset-0 z-50 flex" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Content */}
            <div
                className="relative flex flex-1 m-4 md:m-8 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Area */}
                <div className="flex-1 flex items-center justify-center bg-black/40 rounded-l-2xl">
                    <img
                        src={poster.image_url || '/placeholder-poster.jpg'}
                        alt={`Poster ${poster.id}`}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>

                {/* Side Panel */}
                <div className="w-[360px] bg-panel rounded-r-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-subtle">
                        <h2 className="heading-lg">Poster Details</h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-tertiary hover:text-primary transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={onFavorite}
                                className={`
                  btn flex-1 h-10
                  ${poster.status === 'favorite' ? 'btn-primary' : 'btn-secondary'}
                `}
                            >
                                <Star size={16} fill={poster.status === 'favorite' ? 'currentColor' : 'none'} />
                                <span>{poster.status === 'favorite' ? 'Favorited' : 'Favorite'}</span>
                            </button>
                            <button
                                onClick={onReject}
                                className={`
                  btn flex-1 h-10
                  ${poster.status === 'rejected' ? 'bg-red-500 text-white' : 'btn-secondary'}
                `}
                            >
                                <X size={16} />
                                <span>{poster.status === 'rejected' ? 'Rejected' : 'Reject'}</span>
                            </button>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-medium text-tertiary uppercase mb-2">Generation Info</h3>
                                <div className="bg-card rounded-lg p-3 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Seed</span>
                                        <span className="text-primary font-mono">{poster.seed}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Created</span>
                                        <span className="text-primary">
                                            {new Date(poster.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Status</span>
                                        <span className={`
                      px-2 py-0.5 rounded-md text-xs font-medium
                      ${poster.status === 'favorite' ? 'bg-amber-500/20 text-amber-500' : ''}
                      ${poster.status === 'rejected' ? 'bg-red-500/20 text-red-500' : ''}
                      ${poster.status === 'generated' ? 'bg-blue-500/20 text-blue-500' : ''}
                    `}>
                                            {poster.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Recipe Reference */}
                            <div>
                                <h3 className="text-xs font-medium text-tertiary uppercase mb-2">Recipe</h3>
                                <div className="bg-card rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-secondary font-mono truncate">
                                            {poster.recipe_id.slice(0, 8)}...
                                        </span>
                                        <button className="text-tertiary hover:text-primary">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            {poster.tags && poster.tags.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-medium text-tertiary uppercase mb-2">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {poster.tags.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 rounded-md bg-bg-hover text-xs text-secondary"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-subtle space-y-2">
                        <button className="btn btn-secondary w-full h-10">
                            <Scissors size={16} />
                            <span>Extract Elements</span>
                        </button>
                        <div className="flex gap-2">
                            <button className="btn btn-secondary flex-1 h-10">
                                <Download size={16} />
                                <span>Download</span>
                            </button>
                            <button
                                onClick={onDelete}
                                className="btn btn-ghost h-10 px-3 text-red-500 hover:bg-red-500/10"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
