'use client';

import type { Project } from '@/types';
import { Calendar, MoreHorizontal, Sparkles, Trash2, Edit2, Copy, Download, Clock } from 'lucide-react';
import { useState } from 'react';

interface SpaceCardProps {
    space: Project;
    onClick?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
    onRename?: () => void;
    onExport?: () => void;
}

export default function SpaceCard({
    space,
    onClick,
    onDelete,
    onDuplicate,
    onRename,
    onExport
}: SpaceCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    // Generate a gradient based on the space name
    const getGradient = (name: string) => {
        const gradients = [
            'from-blue-500 to-violet-500',
            'from-rose-500 to-orange-400',
            'from-emerald-500 to-teal-400',
            'from-amber-500 to-pink-500',
            'from-indigo-500 to-cyan-400',
            'from-fuchsia-500 to-rose-400',
        ];
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
        return gradients[index];
    };

    // Get status color
    const getStatusColor = (space: Project) => {
        // For now, based on updated_at recency
        const date = new Date(space.updated_at);
        const now = new Date();
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        if (diffHours < 1) return 'bg-emerald-400'; // Recently active
        if (diffHours < 24) return 'bg-amber-400'; // Active today
        return 'bg-slate-400'; // Idle
    };

    return (
        <div
            className="
                group relative cursor-pointer rounded-xl overflow-hidden
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--border-default)] hover:shadow-lg hover:shadow-black/20
                transition-all duration-200
            "
            onClick={onClick}
        >
            {/* Cover Image / Gradient Placeholder */}
            <div className="relative aspect-[16/10] overflow-hidden">
                {space.cover_image ? (
                    <img
                        src={space.cover_image}
                        alt={space.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(space.name)} opacity-80 group-hover:opacity-100 transition-opacity`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-white/20 text-6xl font-bold">
                                {space.name.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Indicator */}
                <div className="absolute top-3 left-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(space)} ring-2 ring-black/20`} />
                </div>

                {/* Menu Button */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
                        >
                            <MoreHorizontal size={16} />
                        </button>

                        {showMenu && (
                            <div
                                className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => { onRename?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                >
                                    <Edit2 size={14} />
                                    Rename
                                </button>
                                <button
                                    onClick={() => { onDuplicate?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                >
                                    <Copy size={14} />
                                    Duplicate
                                </button>
                                <button
                                    onClick={() => { onExport?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                >
                                    <Download size={14} />
                                    Export Zip
                                </button>
                                <div className="h-px bg-[var(--border-subtle)] my-1" />
                                <button
                                    onClick={() => { onDelete?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Style indicator */}
                {space.style_profile_id && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium">
                        <Sparkles size={10} />
                        Styled
                    </div>
                )}

                {/* Recent artifacts preview strip */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="w-6 h-6 rounded bg-white/10 backdrop-blur-sm border border-white/20"
                        />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1 group-hover:text-[var(--accent-primary)] transition-colors">
                    {space.name}
                </h3>

                {space.description && (
                    <p className="text-xs text-[var(--text-tertiary)] line-clamp-1 mb-2">
                        {space.description}
                    </p>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center text-[11px] text-[var(--text-tertiary)]">
                        <Clock size={11} className="mr-1" />
                        <span>{formatDate(space.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
