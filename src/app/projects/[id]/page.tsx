'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Download, Settings, Palette } from 'lucide-react';
import type { Project } from '@/types';

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchProject(params.id as string);
        }
    }, [params.id]);

    async function fetchProject(id: string) {
        try {
            const response = await fetch(`/api/projects/${id}`);
            const data = await response.json();
            if (data.success) {
                setProject(data.data);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-secondary hover:text-primary transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="heading-lg">{project.name}</h1>
                        {project.description && (
                            <p className="text-secondary text-sm">{project.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="btn btn-secondary">
                        <Settings size={16} />
                        <span>Settings</span>
                    </button>
                    <div className="h-6 w-px bg-border-subtle mx-1" />
                    <button className="btn btn-secondary text-secondary" disabled>
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                    <button className="btn btn-primary" disabled>
                        <Play size={16} fill="currentColor" />
                        <span>Run Graph</span>
                    </button>
                </div>
            </div>

            {/* Main Canvas Placeholder */}
            <div className="flex-1 bg-gray-50 dark:bg-black/20 border border-dashed border-subtle rounded-xl flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                <div className="relative z-10 text-center max-w-md p-8 bg-panel/80 backdrop-blur-sm border border-subtle rounded-2xl shadow-float">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                        <Palette size={32} />
                    </div>
                    <h3 className="heading-md mb-2">Skill Graph Canvas</h3>
                    <p className="text-secondary mb-6">
                        React Flow graph editor will be implemented here in Milestone M1.
                    </p>
                    <span className="badge badge-blue text-xs px-3 py-1">M1 Coming Soon</span>
                </div>
            </div>
        </div>
    );
}
