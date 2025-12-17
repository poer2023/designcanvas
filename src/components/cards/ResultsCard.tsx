'use client';

import { useState, useCallback, MouseEvent } from 'react';
import { Grid3X3, Sparkles, Download, Copy, Layers } from 'lucide-react';
import BaseCard, { CardStatus, CardGrid } from './BaseCard';
import type { Poster } from '@/types';

interface ResultsCardProps {
    id: string;
    title?: string;
    results: Poster[];
    size?: { width: number; height: number };
    status?: CardStatus;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onResultSelect?: (posterId: string, selected: boolean) => void;
    onResultDragStart?: (poster: Poster) => void;
    onExtract?: (selectedIds: string[]) => void;
    onVariations?: (selectedIds: string[]) => void;
    onPinSelected?: (selectedIds: string[]) => void;
    onExport?: (selectedIds: string[]) => void;
}

export default function ResultsCard({
    id,
    title = 'Results',
    results,
    size,
    status = 'idle',
    selected = false,
    onClick,
    onDoubleClick,
    onResultSelect,
    onResultDragStart,
    onExtract,
    onVariations,
    onPinSelected,
    onExport,
}: ResultsCardProps) {
    const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

    const toggleResultSelection = useCallback((posterId: string, e: MouseEvent) => {
        e.stopPropagation();
        setSelectedResults(prev => {
            const next = new Set(prev);
            if (next.has(posterId)) {
                next.delete(posterId);
            } else {
                next.add(posterId);
            }
            onResultSelect?.(posterId, next.has(posterId));
            return next;
        });
    }, [onResultSelect]);

    const handleExtract = useCallback(() => {
        onExtract?.(Array.from(selectedResults));
    }, [selectedResults, onExtract]);

    const handleVariations = useCallback(() => {
        onVariations?.(Array.from(selectedResults));
    }, [selectedResults, onVariations]);

    const handlePinSelected = useCallback(() => {
        onPinSelected?.(Array.from(selectedResults));
    }, [selectedResults, onPinSelected]);

    const selectedCount = selectedResults.size;

    return (
        <BaseCard
            id={id}
            title={`${title} (${results.length})`}
            icon={<Grid3X3 size={14} />}
            status={status}
            selected={selected}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            primaryAction={selectedCount > 0 ? {
                label: `Extract ${selectedCount} Element${selectedCount > 1 ? 's' : ''}`,
                onClick: handleExtract,
                icon: <Layers size={12} />,
            } : undefined}
            secondaryActions={[
                ...(selectedCount > 0 ? [
                    { label: 'Generate Variations', onClick: handleVariations, icon: <Sparkles size={12} /> },
                    { label: 'Pin Selected', onClick: handlePinSelected, icon: <Copy size={12} /> },
                ] : []),
                { label: 'Export All', onClick: () => onExport?.(results.map(r => r.id)), icon: <Download size={12} /> },
            ]}
        >
            {/* Size info */}
            {size && (
                <div className="text-[10px] text-[var(--text-tertiary)] mb-2">
                    {size.width} × {size.height}
                </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                {results.map((poster) => (
                    <ResultThumbnail
                        key={poster.id}
                        poster={poster}
                        selected={selectedResults.has(poster.id)}
                        onClick={(e) => toggleResultSelection(poster.id, e)}
                        onDragStart={() => onResultDragStart?.(poster)}
                    />
                ))}
            </div>

            {/* Selection counter */}
            {selectedCount > 0 && (
                <div className="mt-2 text-[10px] text-[var(--accent-primary)] font-medium">
                    {selectedCount} selected
                </div>
            )}
        </BaseCard>
    );
}

function ResultThumbnail({
    poster,
    selected,
    onClick,
    onDragStart,
}: {
    poster: Poster;
    selected: boolean;
    onClick: (e: MouseEvent) => void;
    onDragStart?: () => void;
}) {
    return (
        <div
            className={`
                relative aspect-[3/4] rounded overflow-hidden cursor-pointer
                border-2 transition-all
                ${selected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30'
                    : 'border-transparent hover:border-[var(--border-default)]'}
            `}
            onClick={onClick}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'poster', data: poster }));
                onDragStart?.();
            }}
        >
            {poster.image_url ? (
                <img
                    src={poster.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 flex items-center justify-center">
                    <span className="text-[8px] text-white/50">#{poster.seed}</span>
                </div>
            )}

            {/* Selection indicator */}
            {selected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Status indicator */}
            {poster.status === 'favorited' && (
                <div className="absolute bottom-1 right-1">
                    <Sparkles size={10} className="text-amber-400" />
                </div>
            )}
        </div>
    );
}
