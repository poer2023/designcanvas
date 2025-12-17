'use client';

import { useState } from 'react';
import { Image, Star, Copy, Download, FileText, Sparkles } from 'lucide-react';
import BaseCard, { CardStatus, CardChips } from './BaseCard';
import type { Poster } from '@/types';

interface PosterCardProps {
    poster: Poster;
    status?: CardStatus;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onExtract?: () => void;
    onFavorite?: () => void;
    onCopy?: () => void;
    onExport?: () => void;
    onViewRecipe?: () => void;
    onDragStart?: () => void;
}

export default function PosterCard({
    poster,
    status = 'idle',
    selected = false,
    onClick,
    onDoubleClick,
    onExtract,
    onFavorite,
    onCopy,
    onExport,
    onViewRecipe,
    onDragStart,
}: PosterCardProps) {
    const isFavorited = poster.status === 'favorited';

    return (
        <BaseCard
            id={poster.id}
            title={`Poster #${poster.seed}`}
            icon={<Image size={14} />}
            status={status}
            selected={selected}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'poster', data: poster }));
                onDragStart?.();
            }}
            primaryAction={{
                label: 'Extract Elements',
                onClick: () => onExtract?.(),
                icon: <Sparkles size={12} />,
            }}
            secondaryActions={[
                { label: 'Copy', onClick: () => onCopy?.(), icon: <Copy size={12} /> },
                { label: 'Export', onClick: () => onExport?.(), icon: <Download size={12} /> },
                { label: 'View Recipe', onClick: () => onViewRecipe?.(), icon: <FileText size={12} /> },
            ]}
        >
            {/* Large Thumbnail */}
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[var(--bg-hover)] mb-2">
                {poster.image_url ? (
                    <img
                        src={poster.image_url}
                        alt={`Poster ${poster.seed}`}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 flex items-center justify-center">
                        <Image size={24} className="text-white/30" />
                    </div>
                )}

                {/* Favorite Star */}
                <button
                    onClick={(e) => { e.stopPropagation(); onFavorite?.(); }}
                    className={`
                        absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-sm
                        ${isFavorited
                            ? 'bg-amber-500/80 text-white'
                            : 'bg-black/40 text-white/60 hover:text-white'}
                        transition-colors
                    `}
                >
                    <Star size={14} fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
            </div>

            {/* Info Chips */}
            <CardChips
                items={[
                    { label: 'seed', value: String(poster.seed) },
                    ...(poster.tags?.map(tag => ({ label: tag })) || []),
                ]}
            />
        </BaseCard>
    );
}
