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
    const statusStyles = {
        generated: '',
        favorite: 'ring-2 ring-amber-400',
        rejected: 'opacity-50',
        archived: 'opacity-30',
    };

    return (
        <div
            className={`
        relative group cursor-pointer rounded-xl overflow-hidden bg-card border border-subtle 
        hover:border-accent-primary transition-all break-inside-avoid mb-4
        ${statusStyles[poster.status]}
      `}
            onClick={onClick}
        >
            {/* Image */}
            <div className="relative aspect-[3/4] bg-bg-hover">
                {poster.image_url ? (
                    <img
                        src={poster.image_url}
                        alt={`Poster ${poster.id}`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon size={32} className="text-tertiary" />
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onFavorite(); }}
                                className={`
                  p-2 rounded-lg transition-colors
                  ${poster.status === 'favorite'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-white/20 text-white hover:bg-white/30'}
                `}
                                title="Favorite"
                            >
                                <Star size={16} fill={poster.status === 'favorite' ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onReject(); }}
                                className={`
                  p-2 rounded-lg transition-colors
                  ${poster.status === 'rejected'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white/20 text-white hover:bg-white/30'}
                `}
                                title="Reject"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <span className="text-white/80 text-xs">
                            Seed: {poster.seed}
                        </span>
                    </div>
                </div>

                {/* Status Badge */}
                {poster.status === 'favorite' && (
                    <div className="absolute top-2 right-2 p-1.5 bg-amber-500 rounded-full">
                        <Star size={12} className="text-white" fill="currentColor" />
                    </div>
                )}
            </div>
        </div>
    );
}
