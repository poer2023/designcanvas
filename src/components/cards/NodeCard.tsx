'use client';

import { Play, RotateCcw, Settings } from 'lucide-react';
import BaseCard, { CardStatus, CardChips } from './BaseCard';
import type { SkillNode } from '@/types';

// Icon mapping for different skill types
const skillIcons: Record<string, React.ReactNode> = {
    'style-profiler': '🎨',
    'brief': '📋',
    'prompt-forge': '✨',
    'batch-generate': '🖼️',
    'element-extract': '✂️',
    'compose': '🧩',
    'harmonize': '🪄',
    'export': '📦',
};

interface NodeCardProps {
    node: SkillNode;
    skillName?: string;
    inputs?: Array<{ type: string; id?: string; label?: string }>;
    outputSummary?: string;
    duration?: number;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onRun?: () => void;
    onRerun?: () => void;
    onLock?: () => void;
    onConfigure?: () => void;
}

export default function NodeCard({
    node,
    skillName,
    inputs = [],
    outputSummary,
    duration,
    selected = false,
    onClick,
    onDoubleClick,
    onRun,
    onRerun,
    onLock,
    onConfigure,
}: NodeCardProps) {
    const icon = skillIcons[node.skill_id] || '⚡';
    const status: CardStatus = node.status === 'fail' ? 'failed' : node.status;

    return (
        <BaseCard
            id={node.id}
            title={skillName || node.skill_id}
            icon={<span className="text-sm">{icon}</span>}
            status={status}
            selected={selected}
            isLocked={node.locked}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onLock={onLock}
            primaryAction={status !== 'running' ? {
                label: status === 'success' ? 'Re-run' : 'Run',
                onClick: () => (status === 'success' ? onRerun?.() : onRun?.()),
                icon: status === 'success' ? <RotateCcw size={12} /> : <Play size={12} />,
            } : undefined}
            secondaryActions={[
                { label: 'Configure', onClick: () => onConfigure?.(), icon: <Settings size={12} /> },
            ]}
        >
            <>
                {/* Input Chips */}
                {inputs.length > 0 && (
                    <div className="mb-2">
                        <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                            Inputs
                        </div>
                        <CardChips
                            items={inputs.map(input => ({
                                label: input.type,
                                value: input.label || input.id?.slice(0, 6),
                                color: getInputColor(input.type),
                            }))}
                        />
                    </div>
                )}

                {/* Output Summary */}
                {outputSummary && (
                    <div className="mb-2">
                        <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                            Output
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {outputSummary}
                        </span>
                    </div>
                )}

                {/* Duration */}
                {duration !== undefined && status === 'success' && (
                    <div className="text-[10px] text-[var(--text-tertiary)]">
                        Completed in {(duration / 1000).toFixed(1)}s
                    </div>
                )}

                {/* Error message for failed nodes */}
                {status === 'failed' && node.data?.error && (
                    <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <div className="text-[10px] text-red-400 line-clamp-2">
                            {String(node.data.error)}
                        </div>
                    </div>
                )}
            </>
        </BaseCard>
    );
}

function getInputColor(type: string): string {
    const colors: Record<string, string> = {
        style: 'bg-violet-500/20 text-violet-400',
        brief: 'bg-blue-500/20 text-blue-400',
        refset: 'bg-amber-500/20 text-amber-400',
        element: 'bg-emerald-500/20 text-emerald-400',
        poster: 'bg-rose-500/20 text-rose-400',
    };
    return colors[type] || 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]';
}
