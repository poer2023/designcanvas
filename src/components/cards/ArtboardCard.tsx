'use client';

import { Layout, Plus, Wand2, Download, Trash2 } from 'lucide-react';
import BaseCard, { CardStatus, CardInfoRow } from './BaseCard';
import type { Element } from '@/types';

interface ArtboardCardProps {
    id: string;
    name?: string;
    size: { width: number; height: number };
    elements: Element[];
    previewUrl?: string;
    status?: CardStatus;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onHarmonize?: () => void;
    onExport?: () => void;
    onClear?: () => void;
    onDrop?: (elementId: string) => void;
}

export default function ArtboardCard({
    id,
    name = 'Artboard',
    size,
    elements,
    previewUrl,
    status = 'idle',
    selected = false,
    onClick,
    onDoubleClick,
    onHarmonize,
    onExport,
    onClear,
    onDrop,
}: ArtboardCardProps) {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'element' && onDrop) {
                onDrop(data.data.id);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    return (
        <BaseCard
            id={id}
            title={name}
            icon={<Layout size={14} />}
            status={status}
            selected={selected}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            primaryAction={{
                label: 'Harmonize',
                onClick: () => onHarmonize?.(),
                icon: <Wand2 size={12} />,
            }}
            secondaryActions={[
                { label: 'Export', onClick: () => onExport?.(), icon: <Download size={12} /> },
                { label: 'Clear All', onClick: () => onClear?.(), icon: <Trash2 size={12} /> },
            ]}
        >
            {/* Preview Area */}
            <div
                className="relative rounded-lg overflow-hidden bg-[var(--bg-hover)] border border-dashed border-[var(--border-subtle)] mb-2"
                style={{ aspectRatio: `${size.width}/${size.height}` }}
            >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={name}
                        className="w-full h-full object-contain"
                    />
                ) : elements.length > 0 ? (
                    // Simple element preview layout
                    <div className="absolute inset-2 flex flex-wrap gap-1 items-center justify-center">
                        {elements.slice(0, 4).map((el, i) => (
                            <div
                                key={el.id}
                                className="w-8 h-8 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden"
                            >
                                {el.image_url && (
                                    <img src={el.image_url} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                        ))}
                        {elements.length > 4 && (
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                                +{elements.length - 4}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                        <Plus size={20} />
                        <span className="text-[10px] mt-1">Drop elements here</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="space-y-1">
                <CardInfoRow label="Size" value={`${size.width}×${size.height}`} />
                <CardInfoRow label="Elements" value={elements.length} />
            </div>
        </BaseCard>
    );
}
