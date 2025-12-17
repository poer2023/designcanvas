'use client';

import { Shapes, Download, Trash2, Copy } from 'lucide-react';
import BaseCard, { CardStatus, CardChips } from './BaseCard';
import type { Element } from '@/types';

interface ElementCardProps {
    element: Element;
    status?: CardStatus;
    selected?: boolean;
    compact?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onExport?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onDragStart?: () => void;
}

export default function ElementCard({
    element,
    status = 'idle',
    selected = false,
    compact = false,
    onClick,
    onDoubleClick,
    onExport,
    onDelete,
    onDuplicate,
    onDragStart,
}: ElementCardProps) {
    return (
        <BaseCard
            id={element.id}
            title={element.semantic_tag || 'Element'}
            icon={<Shapes size={14} />}
            status={status}
            selected={selected}
            compact={compact}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', data: element }));
                onDragStart?.();
            }}
            secondaryActions={[
                { label: 'Export PNG', onClick: () => onExport?.(), icon: <Download size={12} /> },
                { label: 'Duplicate', onClick: () => onDuplicate?.(), icon: <Copy size={12} /> },
                { label: 'Delete', onClick: () => onDelete?.(), icon: <Trash2 size={12} /> },
            ]}
        >
            {/* Element Preview */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--bg-hover)] mb-2">
                {element.image_url ? (
                    <img
                        src={element.image_url}
                        alt={element.semantic_tag || 'Element'}
                        className="w-full h-full object-contain"
                    />
                ) : element.mask_url ? (
                    <img
                        src={element.mask_url}
                        alt={element.semantic_tag || 'Element mask'}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Shapes size={24} className="text-[var(--text-tertiary)]" />
                    </div>
                )}

                {/* Usage count badge */}
                {element.used_count > 0 && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--accent-primary)] text-white">
                        ×{element.used_count}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="space-y-1">
                <CardChips
                    items={[
                        { label: element.semantic_tag || 'untagged' },
                        { label: `${element.bbox?.width || 0}×${element.bbox?.height || 0}` },
                    ]}
                />
                {element.note && (
                    <p className="text-[10px] text-[var(--text-tertiary)] line-clamp-1">
                        {element.note}
                    </p>
                )}
            </div>
        </BaseCard>
    );
}
