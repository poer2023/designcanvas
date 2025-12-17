'use client';

import { CheckCircle, Download, RefreshCw, FileText, Layers } from 'lucide-react';
import BaseCard, { CardStatus, CardChips, CardInfoRow } from './BaseCard';
import type { Final, Element } from '@/types';

interface FinalCardProps {
    final: Final;
    elements?: Element[];
    status?: CardStatus;
    version?: number;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onExport?: (format: 'png' | 'pdf' | 'bundle') => void;
    onReharmonize?: () => void;
    onViewRecipe?: () => void;
}

export default function FinalCard({
    final,
    elements = [],
    status = 'success',
    version = 1,
    selected = false,
    onClick,
    onDoubleClick,
    onExport,
    onReharmonize,
    onViewRecipe,
}: FinalCardProps) {
    return (
        <BaseCard
            id={final.id}
            title="Final"
            icon={<CheckCircle size={14} />}
            status={status}
            selected={selected}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            primaryAction={{
                label: 'Export',
                onClick: () => onExport?.('png'),
                icon: <Download size={12} />,
            }}
            secondaryActions={[
                { label: 'Export PNG', onClick: () => onExport?.('png'), icon: <Download size={12} /> },
                { label: 'Export PDF', onClick: () => onExport?.('pdf'), icon: <Download size={12} /> },
                { label: 'Export Bundle', onClick: () => onExport?.('bundle'), icon: <Layers size={12} /> },
                { label: 'Re-harmonize', onClick: () => onReharmonize?.(), icon: <RefreshCw size={12} /> },
                { label: 'View Recipe', onClick: () => onViewRecipe?.(), icon: <FileText size={12} /> },
            ]}
        >
            {/* Large Thumbnail */}
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[var(--bg-hover)] mb-2">
                {final.image_url ? (
                    <img
                        src={final.image_url}
                        alt="Final"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
                        <CheckCircle size={24} className="text-white/30" />
                    </div>
                )}

                {/* Version badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500/80 text-white text-[10px] font-medium">
                    v{version}
                </div>
            </div>

            {/* Element chips */}
            {elements.length > 0 && (
                <div className="mb-2">
                    <CardChips
                        items={elements.map((el, i) => ({
                            label: `E${i + 1}`,
                            color: 'bg-violet-500/20 text-violet-400',
                        }))}
                    />
                </div>
            )}

            {/* Info */}
            <div className="space-y-1">
                <CardInfoRow label="Elements" value={final.element_ids.length} />
                <CardInfoRow label="Status" value={status} />
            </div>
        </BaseCard>
    );
}
