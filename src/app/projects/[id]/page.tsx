'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Download, Layers, ChevronDown, Undo2, Redo2
} from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import dynamic from 'next/dynamic';
import type { Project } from '@/types';
import { useGraphStore } from '@/store/graphStore';
import Dock from '@/components/canvas/Dock';
import CommandPalette from '@/components/canvas/CommandPalette';
import type { InteractionMode } from '@/components/graph/SkillGraphCanvas';
import type { GroupType } from '@/components/cards/GroupFrame';

const SkillGraphCanvas = dynamic(() => import('@/components/graph/SkillGraphCanvas'), { ssr: false });

export default function SpacePage() {
    const params = useParams();
    const router = useRouter();
    const [space, setSpace] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    // Interaction State
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
    const [pendingGroupType, setPendingGroupType] = useState<GroupType>('blank');

    // Command Palette / Search state
    const [searchOpen, setSearchOpen] = useState(false);

    const { addNode } = useGraphStore();

    // Keyboard shortcuts (v1.7)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if in input/textarea
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            // ⌘K - Search/Command Palette
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            // V - Select Mode
            if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
                setInteractionMode('select');
            }
            // H - Hand Mode
            if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
                setInteractionMode('hand');
            }
            // T - Add Text Card (Notes)
            if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleAddText('notes');
            }
            // B - Add Text Card (Brief)
            if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleAddText('brief');
            }
            // U - Add Upload Image
            if (e.key === 'u' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleAddUploadImage();
            }
            // I - Add Image Studio
            if (e.key === 'i' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleAddImageStudio();
            }
            // G - Add Group (Draw Mode)
            if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleAddGroup('blank');
            }
            // X - Scissors Mode (Cut Connections)
            if (e.key === 'x' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setInteractionMode('scissors');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (params.id) {
            fetchSpace(params.id as string);
        }
    }, [params.id]);

    async function fetchSpace(id: string) {
        try {
            const response = await fetch(`/api/projects/${id}`);
            const data = await response.json();
            if (data.success) {
                setSpace(data.data);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch space:', error);
        } finally {
            setLoading(false);
        }
    }

    // v1.7 Dock handlers
    const handleAddText = useCallback((role: 'notes' | 'brief') => {
        addNode(role, { x: 400, y: 300 });
        setInteractionMode('select');
    }, [addNode]);

    const handleAddUploadImage = useCallback(() => {
        addNode('uploadImage', { x: 400, y: 300 });
        setInteractionMode('select');
    }, [addNode]);

    const handleAddImageStudio = useCallback(() => {
        addNode('imageStudio', { x: 400, y: 300 });
        setInteractionMode('select');
    }, [addNode]);

    const handleAddGroup = useCallback((type: GroupType) => {
        setPendingGroupType(type);
        setInteractionMode('draw_group');
    }, []);

    const handleSearch = useCallback(() => {
        setSearchOpen(true);
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-app)]">
                <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
            </div>
        );
    }

    if (!space) return null;

    return (
        <div className="fixed inset-0 flex flex-col bg-app overflow-hidden">
            {/* Minimal Top Toolbar (per PRD v1.6 Section 3.2) */}
            <header className="h-10 bg-panel/80 backdrop-blur-sm border-b border-subtle flex items-center justify-between px-3 shrink-0 z-50">
                {/* Left: Back + Space Name */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/')}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Back to Spaces"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className="w-px h-5 bg-[var(--border-subtle)]" />

                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <Layers size={12} className="text-white" />
                        </div>
                        <button className="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] px-1.5 py-0.5 rounded-lg transition-colors">
                            <span className="font-medium">{space.name}</span>
                            <ChevronDown size={12} className="text-[var(--text-tertiary)]" />
                        </button>
                    </div>
                </div>

                {/* Right: Theme + Undo/Redo + Export */}
                <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
                    <button
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Undo (⌘Z)"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Redo (⌘⇧Z)"
                    >
                        <Redo2 size={14} />
                    </button>
                    <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
                    <button
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Export"
                    >
                        <Download size={14} />
                    </button>
                </div>
            </header>

            {/* Full-screen Canvas */}
            <main className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0">
                    <SkillGraphCanvas
                        interactionMode={interactionMode}
                        onInteractionModeChange={setInteractionMode}
                        groupTypeToDraw={pendingGroupType}
                    />
                </div>

                {/* Dock Toolbar */}
                <Dock
                    onAddText={handleAddText}
                    onAddUploadImage={handleAddUploadImage}
                    onAddImageStudio={handleAddImageStudio}
                    onAddGroup={handleAddGroup}
                    onSearch={handleSearch}
                    interactionMode={interactionMode}
                    onInteractionModeChange={setInteractionMode}
                />

                {/* Command Palette / Search */}
                <CommandPalette
                    isOpen={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    onAddNode={(skillType) => {
                        addNode(skillType, { x: 400, y: 300 });
                    }}
                />
            </main>
        </div>
    );
}
