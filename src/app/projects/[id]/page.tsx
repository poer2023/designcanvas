'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Download, Layers, ChevronDown, Undo2, Redo2,
    Check, Loader2, AlertTriangle, Cloud, Upload
} from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import dynamic from 'next/dynamic';
import type { Project } from '@/types';
import type { Poster } from '@/types/poster';
import { useGraphStore } from '@/store/graphStore';
import { syncSubscriptionsFromEdges } from '@/store/snapshotStore';
import Dock from '@/components/canvas/Dock';
import CommandPalette from '@/components/canvas/CommandPalette';
import AssetsDrawer from '@/components/canvas/AssetsDrawer';
import type { InteractionMode } from '@/components/graph/SkillGraphCanvas';
import type { GroupType } from '@/components/cards/GroupFrame';
import { useAutoSave, useLoadGraph } from '@/lib/hooks/useAutoSave';
import {
    exportTemplate,
    importTemplate,
    downloadTemplate,
    readTemplateFile,
    isTemplateCompatible,
    type TemplateNode,
    type TemplateEdge,
} from '@/lib/templateUtils';

const SkillGraphCanvas = dynamic(() => import('@/components/graph/SkillGraphCanvas'), { ssr: false });

export default function SpacePage() {
    const params = useParams();
    const router = useRouter();
    const [space, setSpace] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

    // Interaction State
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
    const [pendingGroupType, setPendingGroupType] = useState<GroupType>('blank');

    // Command Palette / Search state
    const [searchOpen, setSearchOpen] = useState(false);

    // PRD v2.1: In-canvas Assets Drawer (Images)
    const [assetsOpen, setAssetsOpen] = useState(false);
    const [assetImages, setAssetImages] = useState<Poster[]>([]);

    const { addNode, nodes, edges, viewport, setNodes, setEdges } = useGraphStore();
    const undo = useGraphStore(state => state.undo);
    const redo = useGraphStore(state => state.redo);
    const canUndo = useGraphStore(state => state.historyPast.length > 0);
    const canRedo = useGraphStore(state => state.historyFuture.length > 0);

    // PRD v2.0: Load graph on mount
    useLoadGraph(params.id as string | undefined);

    // PRD v2.0: Auto-save with debounce
    const { saveStatus, saveNow, forceSave, hasConflict } = useAutoSave({
        enabled: !!params.id,
        onConflict: () => setShowConflictDialog(true),
    });

    // Keyboard shortcuts (v1.8)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if in input/textarea
            const el = document.activeElement as HTMLElement | null;
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return;

            // Undo / Redo
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
                return;
            }

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
            // I - Add Image Studio (PRD v1.8: No Upload shortcut, images paste/drop directly)
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
    }, [redo, undo]);

    useEffect(() => {
        if (params.id) {
            fetchSpace(params.id as string);
        }
    }, [params.id]);

    const fetchAssetImages = useCallback(async () => {
        if (!params.id) return;
        try {
            const res = await fetch(`/api/posters?projectId=${params.id}`);
            const data = await res.json();
            if (data.success) {
                setAssetImages(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch asset images:', error);
        }
    }, [params.id]);

    useEffect(() => {
        if (!assetsOpen) return;
        fetchAssetImages();
    }, [assetsOpen, fetchAssetImages]);

    useEffect(() => {
        const handler = () => {
            fetchAssetImages();
        };
        window.addEventListener('posterlab:assets-updated', handler);
        return () => window.removeEventListener('posterlab:assets-updated', handler);
    }, [fetchAssetImages]);

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

    // v1.8 Dock handlers
    const handleAddText = useCallback((role: 'notes' | 'brief') => {
        addNode(role, { x: 400, y: 300 });
        setInteractionMode('select');
    }, [addNode]);

    // PRD v1.8: Creates Image Studio (imageCard with mode=studio)
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

    // PRD v2.0: Template Export
    const handleExportTemplate = useCallback((selectionOnly = false) => {
        // Get selected node IDs
        const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);

        const template = exportTemplate(
            nodes as TemplateNode[],
            edges as TemplateEdge[],
            viewport,
            {
                selectionOnly,
                selectedNodeIds,
                includeViewport: true,
                name: space?.name || 'template',
            }
        );

        downloadTemplate(template, `${space?.name || 'template'}-${Date.now()}.json`);
        setShowExportMenu(false);
    }, [nodes, edges, viewport, space?.name]);

    // PRD v2.0: Template Import
    const handleImportTemplate = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const template = await readTemplateFile(file);

            if (!isTemplateCompatible(template)) {
                alert('This template was created with an incompatible version.');
                return;
            }

            const { nodes: importedNodes, edges: importedEdges } = importTemplate(template, {
                targetViewport: viewport,
            });

            // Add imported nodes and edges to existing graph
            useGraphStore.getState().pushHistory({ label: 'importTemplate' });
            const nextNodes = [...nodes, ...importedNodes as typeof nodes[number][]];
            const nextEdges = [...edges, ...importedEdges as typeof edges[number][]];
            setNodes(nextNodes);
            setEdges(nextEdges);
            syncSubscriptionsFromEdges(nextEdges);

            console.log(`[PRD v2.0] Imported ${importedNodes.length} nodes and ${importedEdges.length} edges`);
        } catch (error) {
            console.error('Failed to import template:', error);
            alert('Failed to import template. Please check the file format.');
        }

        // Reset file input
        if (importInputRef.current) {
            importInputRef.current.value = '';
        }
    }, [nodes, edges, viewport, setNodes, setEdges]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-app)]">
                <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
            </div>
        );
    }

    if (!space) return null;

    return (
        <div className="fixed inset-0 flex flex-col bg-[var(--bg-app)] overflow-hidden">
            {/* Minimal Top Toolbar (per PRD v1.6 Section 3.2) */}
            <header className="h-10 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] flex items-center justify-between px-3 shrink-0 z-50">
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

                {/* Right: Save Status + Theme + Undo/Redo + Export */}
                <div className="flex items-center gap-1">
                    {/* PRD v2.0: Save Status Indicator */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs">
                        {saveStatus === 'saving' && (
                            <>
                                <Loader2 size={12} className="text-blue-500 animate-spin" />
                                <span className="text-[var(--text-tertiary)]">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <Check size={12} className="text-green-500" />
                                <span className="text-[var(--text-tertiary)]">Saved</span>
                            </>
                        )}
                        {saveStatus === 'error' && (
                            <>
                                <AlertTriangle size={12} className="text-red-500" />
                                <span className="text-red-500">Save failed</span>
                            </>
                        )}
                        {saveStatus === 'conflict' && (
                            <>
                                <AlertTriangle size={12} className="text-orange-500" />
                                <span className="text-orange-500">Conflict</span>
                            </>
                        )}
                        {saveStatus === 'idle' && (
                            <>
                                <Cloud size={12} className="text-[var(--text-tertiary)]" />
                            </>
                        )}
                    </div>

                    <div className="w-px h-5 bg-[var(--border-subtle)]" />
                    <ThemeToggle />
                    <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Undo (⌘Z)"
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title="Redo (⌘⇧Z)"
                    >
                        <Redo2 size={14} />
                    </button>
                    <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />

                    {/* PRD v2.0: Template Export/Import */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1"
                            title="Export/Import Template"
                        >
                            <Download size={14} />
                            <ChevronDown size={10} />
                        </button>

                        {showExportMenu && (
                            <>
                                {/* Backdrop to close menu */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowExportMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-lg shadow-xl z-50 py-1">
                                    <button
                                        onClick={() => handleExportTemplate(false)}
                                        className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                    >
                                        <Download size={14} />
                                        Export Canvas
                                    </button>
                                    <button
                                        onClick={() => handleExportTemplate(true)}
                                        className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                        disabled={!nodes.some(n => n.selected)}
                                    >
                                        <Download size={14} />
                                        Export Selection
                                    </button>
                                    <div className="my-1 border-t border-[var(--border-subtle)]" />
                                    <button
                                        onClick={() => {
                                            importInputRef.current?.click();
                                            setShowExportMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                    >
                                        <Upload size={14} />
                                        Import Template
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Hidden file input for import */}
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportTemplate}
                        className="hidden"
                    />
                </div>
            </header>

            {/* PRD v2.0: Conflict Resolution Dialog */}
            {showConflictDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl p-6 max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <AlertTriangle className="text-orange-500" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">Version Conflict</h3>
                                <p className="text-sm text-[var(--text-secondary)]">This Space was updated elsewhere</p>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Your changes conflict with changes made elsewhere. Choose how to proceed:
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConflictDialog(false);
                                    window.location.reload();
                                }}
                                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                            >
                                Reload
                            </button>
                            <button
                                onClick={async () => {
                                    setShowConflictDialog(false);
                                    await forceSave();
                                }}
                                className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                            >
                                Force Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full-screen Canvas */}
            <main className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0">
                    <SkillGraphCanvas
                        interactionMode={interactionMode}
                        onInteractionModeChange={setInteractionMode}
                        groupTypeToDraw={pendingGroupType}
                    />
                </div>

                {/* Assets Drawer (left) */}
                <AssetsDrawer
                    isOpen={assetsOpen}
                    onToggle={() => setAssetsOpen(o => !o)}
                    images={assetImages}
                />

                {/* Dock Toolbar */}
                <Dock
                    onAddText={handleAddText}
                    onAddImageStudio={handleAddImageStudio}
                    onAddGroup={handleAddGroup}
                    onSearch={handleSearch}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
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
