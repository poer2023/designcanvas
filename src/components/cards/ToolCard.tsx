'use client';

import { Wand2, Layers, Sparkles, Download, FileText, Scissors, Palette, GripVertical } from 'lucide-react';

// Tool definitions for the Tools panel
export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    skillId: string;
    category: 'generate' | 'extract' | 'compose' | 'export';
}

export const defaultTools: ToolDefinition[] = [
    {
        id: 'batch-generate',
        name: 'Batch Generate',
        description: 'Generate multiple poster variations',
        icon: <Sparkles size={16} />,
        skillId: 'batch-generate',
        category: 'generate',
    },
    {
        id: 'element-extract',
        name: 'Element Extract',
        description: 'Extract elements from posters',
        icon: <Scissors size={16} />,
        skillId: 'element-extract',
        category: 'extract',
    },
    {
        id: 'compose',
        name: 'Compose & Harmonize',
        description: 'Combine elements and unify style',
        icon: <Wand2 size={16} />,
        skillId: 'compose',
        category: 'compose',
    },
    {
        id: 'export',
        name: 'Export',
        description: 'Export final outputs',
        icon: <Download size={16} />,
        skillId: 'export',
        category: 'export',
    },
    {
        id: 'style-profiler',
        name: 'Style Profiler',
        description: 'Analyze and create style profiles',
        icon: <Palette size={16} />,
        skillId: 'style-profiler',
        category: 'generate',
    },
    {
        id: 'brief',
        name: 'Brief',
        description: 'Create poster brief',
        icon: <FileText size={16} />,
        skillId: 'brief',
        category: 'generate',
    },
];

interface ToolCardProps {
    tool: ToolDefinition;
    onDragStart?: (tool: ToolDefinition) => void;
    onDragEnd?: () => void;
}

export default function ToolCard({
    tool,
    onDragStart,
    onDragEnd,
}: ToolCardProps) {
    const categoryColors = {
        generate: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        extract: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        compose: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        export: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tool', data: tool }));
                onDragStart?.(tool);
            }}
            onDragEnd={onDragEnd}
            className={`
                group flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--accent-primary)]/50 hover:shadow-md
                transition-all
            `}
        >
            {/* Drag Handle */}
            <div className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-50 transition-opacity">
                <GripVertical size={14} />
            </div>

            {/* Icon */}
            <div className={`p-2 rounded-lg ${categoryColors[tool.category]}`}>
                {tool.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                    {tool.name}
                </h4>
                <p className="text-[10px] text-[var(--text-tertiary)] line-clamp-1">
                    {tool.description}
                </p>
            </div>
        </div>
    );
}
