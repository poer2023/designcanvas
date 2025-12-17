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
                group relative cursor-pointer
                bg-[var(--bg-card)] rounded-2xl
                border border-[var(--border-subtle)]
                shadow-sm
                hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 hover:border-[var(--border-default)]
                transition-all duration-300 ease-out
                overflow-hidden
            "
            onClick={onClick}
        >
            {/* Cover Image / Gradient Placeholder */}
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-tertiary)]">
                {space.cover_image ? (
                    <img
                        src={space.cover_image}
                        alt={space.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(space.name)} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-white/30 text-6xl font-black tracking-tighter transform group-hover:scale-110 transition-transform duration-500">
                                {space.name.substring(0, 2).toUpperCase()}
                            </div>
                        </div>

                        {/* Overlay gradient for text readability */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                    </div>
                )}

                {/* Status Indicator (finer positioning) */}
                <div className="absolute top-3 left-3 z-10">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(space)} ring-2 ring-white/20 backdrop-blur-sm shadow-sm`} />
                </div>

                {/* Menu Button */}
                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-1.5 rounded-xl bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg transition-colors"
                        >
                            <MoreHorizontal size={18} />
                        </button>

                        {showMenu && (
                            <div
                                className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl py-1.5 z-20 animate-in fade-in zoom-in-95 duration-200"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => { onRename?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors"
                                >
                                    <Edit2 size={14} className="opacity-70" />
                                    Rename
                                </button>
                                <button
                                    onClick={() => { onDuplicate?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors"
                                >
                                    <Copy size={14} className="opacity-70" />
                                    Duplicate
                                </button>
                                <button
                                    onClick={() => { onExport?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2.5 transition-colors"
                                >
                                    <Download size={14} className="opacity-70" />
                                    Export Zip
                                </button>
                                <div className="h-px bg-[var(--border-subtle)] my-1 mx-2" />
                                <button
                                    onClick={() => { onDelete?.(); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors rounded-b-lg"
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
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-semibold shadow-lg">
                        <Sparkles size={10} className="text-amber-300" />
                        Styled
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 bg-[var(--bg-card)]">
                <h3 className="text-base font-semibold text-[var(--text-primary)] truncate mb-1.5 group-hover:text-[var(--accent-primary)] transition-colors">
                    {space.name}
                </h3>

                {space.description ? (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-3 h-4">
                        {space.description}
                    </p>
                ) : (
                    <div className="h-4 mb-3" />
                )}

                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 mt-1">
                    <div className="flex items-center text-[11px] font-medium text-[var(--text-tertiary)]">
                        <Clock size={12} className="mr-1.5 opacity-70" />
                        <span>{formatDate(space.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
