'use client';

import type { Project } from '@/types';
import { Calendar, MoreHorizontal, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';

interface ProjectCardProps {
    project: Project;
    onClick?: () => void;
    onDelete?: () => void;
}

export default function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
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

    // Generate a gradient based on the project name
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

    return (
        <div
            className="
                group relative cursor-pointer rounded-xl overflow-hidden
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--border-default)] hover:shadow-lg
                transition-all duration-200
            "
            onClick={onClick}
        >
            {/* Cover Image / Gradient Placeholder */}
            <div className="relative aspect-[16/10] overflow-hidden">
                {project.cover_image ? (
                    <img
                        src={project.cover_image}
                        alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradient(project.name)} opacity-80 group-hover:opacity-100 transition-opacity`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-white/20 text-6xl font-bold">
                                {project.name.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                )}

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
                                className="absolute right-0 top-full mt-1 w-36 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2">
                                    <Edit2 size={14} />
                                    Rename
                                </button>
                                <button
                                    onClick={() => onDelete?.()}
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
                {project.style_profile_id && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium">
                        <Sparkles size={10} />
                        Styled
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1 group-hover:text-[var(--accent-primary)] transition-colors">
                    {project.name}
                </h3>

                {project.description && (
                    <p className="text-xs text-[var(--text-tertiary)] line-clamp-1 mb-2">
                        {project.description}
                    </p>
                )}

                <div className="flex items-center text-[11px] text-[var(--text-tertiary)]">
                    <Calendar size={11} className="mr-1" />
                    <span>{formatDate(project.updated_at)}</span>
                </div>
            </div>
        </div>
    );
}
