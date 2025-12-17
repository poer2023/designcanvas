'use client';

import { Layers, Eye, Copy, Zap } from 'lucide-react';
import type { Template } from '@/types';

interface TemplateCardProps {
    template: Template;
    onUse?: () => void;
    onPreview?: () => void;
    onDuplicate?: () => void;
}

// Default templates for v1
export const defaultTemplates: Template[] = [
    {
        id: 'poster-batch-standard',
        name: 'Poster Batch → Pick → Compose',
        scene_tags: ['general', 'multi-poster'],
        preview_image: undefined,
        default_output: '12 results / 1080×1920',
        graph_snapshot: { nodes: [], edges: [] },
        skill_versions_lock: {},
        default_params: { batch_size: 12, width: 1080, height: 1920 },
    },
    {
        id: 'music-festival',
        name: 'Music Festival Poster',
        scene_tags: ['music', 'festival', 'event'],
        preview_image: undefined,
        default_output: '8 results / 1080×1350',
        graph_snapshot: { nodes: [], edges: [] },
        skill_versions_lock: {},
        default_params: { batch_size: 8, width: 1080, height: 1350 },
    },
    {
        id: 'tech-promo',
        name: 'Tech Promo Banner',
        scene_tags: ['tech', 'promo', 'minimal'],
        preview_image: undefined,
        default_output: '6 results / 1200×628',
        graph_snapshot: { nodes: [], edges: [] },
        skill_versions_lock: {},
        default_params: { batch_size: 6, width: 1200, height: 628 },
    },
    {
        id: 'social-story',
        name: 'Social Story',
        scene_tags: ['social', 'story', 'vertical'],
        preview_image: undefined,
        default_output: '12 results / 1080×1920',
        graph_snapshot: { nodes: [], edges: [] },
        skill_versions_lock: {},
        default_params: { batch_size: 12, width: 1080, height: 1920 },
    },
];

export default function TemplateCard({
    template,
    onUse,
    onPreview,
    onDuplicate
}: TemplateCardProps) {
    // Generate a gradient based on the template name
    const getGradient = (name: string) => {
        const gradients = [
            'from-violet-600 to-indigo-600',
            'from-pink-500 to-rose-500',
            'from-cyan-500 to-blue-500',
            'from-amber-500 to-orange-500',
            'from-emerald-500 to-green-500',
            'from-purple-500 to-fuchsia-500',
        ];
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
        return gradients[index];
    };

    return (
        <div className="
            group relative cursor-pointer rounded-xl overflow-hidden
            bg-[var(--bg-card)] border border-[var(--border-subtle)]
            hover:border-[var(--accent-primary)]/50 hover:shadow-lg hover:shadow-[var(--accent-primary)]/10
            transition-all duration-200
        ">
            {/* Preview Area */}
            <div className="relative aspect-[4/3] overflow-hidden">
                {template.preview_image ? (
                    <img
                        src={template.preview_image}
                        alt={template.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(template.name)} opacity-60`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Layers size={32} className="text-white/40" />
                        </div>
                        {/* Simulated graph preview */}
                        <div className="absolute inset-4 flex items-center justify-center">
                            <div className="flex items-center gap-2">
                                {['Style', 'Generate', 'Export'].map((step, i) => (
                                    <div key={step} className="flex items-center">
                                        <div className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-white text-[9px] font-medium">
                                            {step}
                                        </div>
                                        {i < 2 && (
                                            <div className="w-4 h-px bg-white/30 mx-1" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick action buttons on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onUse?.(); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
                    >
                        <Zap size={12} />
                        Use Template
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPreview?.(); }}
                        className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                        title="Preview"
                    >
                        <Eye size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
                        className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                        title="Duplicate"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                <h3 className="text-sm font-medium text-[var(--text-primary)] truncate mb-1.5">
                    {template.name}
                </h3>

                {/* Scene tags */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {template.scene_tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Output specs */}
                <div className="text-[10px] text-[var(--text-tertiary)]">
                    {template.default_output}
                </div>
            </div>
        </div>
    );
}
