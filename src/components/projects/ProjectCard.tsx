'use client';

import type { Project } from '@/types';
import { Calendar, MoreHorizontal } from 'lucide-react';

interface ProjectCardProps {
    project: Project;
    onClick?: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div
            className="card group cursor-pointer p-0 overflow-hidden flex flex-col h-full hover:shadow-lg transition-all"
            onClick={onClick}
        >
            {/* Cover Image */}
            <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 w-full overflow-hidden">
                {project.cover_image ? (
                    <img
                        src={project.cover_image}
                        alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-tertiary transition-colors group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
                        <div className="w-16 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-2 opacity-50"></div>
                        <span className="text-xs font-medium">No Preview</span>
                    </div>
                )}

                {/* Hover Overlay Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition-colors">
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="text-[15px] font-semibold text-primary truncate leading-tight group-hover:text-blue-500 transition-colors">
                        {project.name}
                    </h3>
                </div>

                {project.description && (
                    <p className="text-[13px] text-secondary line-clamp-2 mb-3">
                        {project.description}
                    </p>
                )}

                <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-tertiary border-t border-subtle">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{formatDate(project.updated_at)}</span>
                    </div>

                    {project.style_profile_id && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                            Style
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
