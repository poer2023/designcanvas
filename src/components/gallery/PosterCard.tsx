'use client';

import { Star, X, Image as ImageIcon } from 'lucide-react';
import type { Poster } from '@/types/poster';

interface PosterCardProps {
    poster: Poster;
    onClick: () => void;
    onFavorite: () => void;
    onReject: () => void;
}

export default function PosterCard({ poster, onClick, onFavorite, onReject }: PosterCardProps) {
    return (
        <div
            className={`
        relative group cursor-pointer rounded-xl overflow-hidden
        bg-[var(--bg-card)] border border-[var(--border-subtle)]
        hover:border-[var(--accent-primary)] hover:shadow-lg
        transition-all duration-200 break-inside-avoid mb-4
        ${poster.status === 'rejected' ? 'opacity-50 hover:opacity-100' : ''}
        ${poster.status === 'favorite' ? 'ring-2 ring-amber-400/50' : ''}
      `}
            onClick={onClick}
        >
            {/* Image */}
            <div className="relative aspect-[3/4] bg-[var(--bg-hover)]">
                {poster.image_url ? (
                    <img
                        src={poster.image_url}
                        alt={`Poster ${poster.id}`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                        <ImageIcon size={32} className="text-[var(--text-tertiary)]" />
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                        <div className="flex gap-1.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                                className={`
                  p-2 rounded-lg backdrop-blur-sm transition-all
                  ${poster.status === 'favorite'
                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                        : 'bg-white/15 text-white hover:bg-white/25'}
                `}
                                title="Favorite"
                            >
                                <Star size={14} fill={poster.status === 'favorite' ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onReject(); }}
                                className={`
                  p-2 rounded-lg backdrop-blur-sm transition-all
                  ${poster.status === 'rejected'
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                        : 'bg-white/15 text-white hover:bg-white/25'}
                `}
                                title="Reject"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <span className="text-white/70 text-[10px] font-mono bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                            {poster.seed}
                        </span>
                    </div>
                </div>

                {/* Status Badge */}
                {poster.status === 'favorite' && (
                    <div className="absolute top-2 right-2 p-1.5 bg-amber-500 rounded-full shadow-lg shadow-amber-500/30">
                        <Star size={10} className="text-white" fill="currentColor" />
                    </div>
                )}
            </div>
        </div>
    );
}
