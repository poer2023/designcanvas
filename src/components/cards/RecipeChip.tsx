'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clipboard, ExternalLink } from 'lucide-react';
import type { Recipe } from '@/types';

interface RecipeChipProps {
    recipe: Recipe;
    compact?: boolean;
    onCopy?: () => void;
    onExpand?: () => void;
}

export default function RecipeChip({
    recipe,
    compact = true,
    onCopy,
    onExpand,
}: RecipeChipProps) {
    const [isExpanded, setIsExpanded] = useState(!compact);

    // Calculate estimated tokens (rough)
    const estimateTokens = () => {
        const assetCount = recipe.asset_refs.length;
        const nodeCount = recipe.node_runs.length;
        return assetCount * 50 + nodeCount * 100;
    };

    // Get context level
    const getContextLevel = () => {
        const tokens = estimateTokens();
        if (tokens < 500) return 'S';
        if (tokens < 2000) return 'M';
        return 'L';
    };

    if (compact && !isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-[var(--bg-hover)] hover:bg-[var(--bg-input)]
                    text-[10px] text-[var(--text-tertiary)]
                    transition-colors
                "
            >
                <span className="text-[var(--accent-primary)]">⚗️</span>
                Recipe
                <ChevronDown size={10} />
            </button>
        );
    }

    return (
        <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <span>⚗️</span>
                    <span className="text-xs font-medium text-[var(--text-primary)]">Recipe</span>
                    <span className={`
                        px-1.5 py-0.5 rounded text-[9px] font-medium
                        ${getContextLevel() === 'S' ? 'bg-emerald-500/20 text-emerald-400' :
                            getContextLevel() === 'M' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'}
                    `}>
                        {getContextLevel()}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {onCopy && (
                        <button
                            onClick={onCopy}
                            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
                            title="Copy Recipe"
                        >
                            <Clipboard size={12} />
                        </button>
                    )}
                    {compact && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
                        >
                            <ChevronUp size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Asset References */}
            <div className="space-y-1.5">
                {recipe.asset_refs.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-tertiary)] capitalize">{ref.type}</span>
                        <code className="text-[var(--text-secondary)] bg-[var(--bg-hover)] px-1 rounded">
                            {ref.id.slice(0, 8)}...
                        </code>
                    </div>
                ))}
            </div>

            {/* Seeds */}
            {recipe.seeds.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-tertiary)]">Seeds</span>
                        <span className="text-[var(--text-secondary)]">
                            {recipe.seeds.slice(0, 3).join(', ')}
                            {recipe.seeds.length > 3 && ` +${recipe.seeds.length - 3}`}
                        </span>
                    </div>
                </div>
            )}

            {/* Skill Versions */}
            {Object.keys(recipe.skill_versions).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="text-[10px] text-[var(--text-tertiary)] mb-1">Skill Versions</div>
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(recipe.skill_versions).map(([skill, version]) => (
                            <span
                                key={skill}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                            >
                                {skill}:{version}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Estimated Tokens */}
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--text-tertiary)]">Est. Tokens</span>
                    <span className="text-[var(--text-secondary)]">~{estimateTokens()}</span>
                </div>
            </div>
        </div>
    );
}
