'use client';

import { X, MoreHorizontal, Lock, Pin, Play, RotateCcw } from 'lucide-react';
import type { SkillNode } from '@/store/graphStore';
import { useState } from 'react';
import { replayRecipe, useRecipeStore } from '@/store/recipeStore';

interface InspectorProps {
    isOpen: boolean;
    onClose: () => void;
    selectedNode?: SkillNode | null;
    selectedCardType?: 'style' | 'refset' | 'element' | 'results' | 'poster' | 'artboard' | 'final' | 'node';
    selectedData?: Record<string, unknown>;
    onRun?: () => void;
    onLock?: () => void;
    onPin?: () => void;
}

export default function Inspector({
    isOpen,
    onClose,
    selectedNode,
    selectedCardType,
    selectedData,
    onRun,
    onLock,
    onPin,
}: InspectorProps) {
    const [activeTab, setActiveTab] = useState<'params' | 'output' | 'recipe'>('params');

    if (!isOpen || (!selectedNode && !selectedCardType)) {
        return null;
    }

    const getTitle = () => {
        if (selectedNode) {
            return selectedNode.data?.skillName || selectedNode.data?.skillId || 'Node';
        }
        switch (selectedCardType) {
            case 'style': return 'Style Profile';
            case 'refset': return 'Reference Set';
            case 'element': return 'Element';
            case 'results': return 'Results';
            case 'poster': return 'Poster';
            case 'artboard': return 'Artboard';
            case 'final': return 'Final';
            default: return 'Inspector';
        }
    };

    const getStatusPill = () => {
        if (!selectedNode) return null;
        const status = selectedNode.data?.status;
        if (!status) return null;
        const statusColors = {
            idle: 'bg-slate-500',
            running: 'bg-amber-500 animate-pulse',
            success: 'bg-emerald-500',
            fail: 'bg-red-500',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] text-white font-medium ${statusColors[status as keyof typeof statusColors]}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="
            absolute right-0 top-0 bottom-0 z-30
            w-80 bg-[var(--bg-panel)]/95 backdrop-blur-xl
            border-l border-[var(--border-subtle)]
            flex flex-col
            shadow-2xl
        ">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{getTitle()}</h3>
                    {getStatusPill()}
                </div>
                <div className="flex items-center gap-1">
                    {selectedNode && (
                        <>
                            <button
                                onClick={onPin}
                                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                                title="Pin to Canvas"
                            >
                                <Pin size={14} />
                            </button>
                            <button
                                onClick={onLock}
                                className={`p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors ${selectedNode.data?.locked
                                    ? 'text-amber-400'
                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }`}
                                title={selectedNode.data?.locked ? 'Unlock Output' : 'Lock Output'}
                            >
                                <Lock size={14} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Tabs (for nodes) */}
            {selectedNode && (
                <div className="flex border-b border-[var(--border-subtle)]">
                    {(['params', 'output', 'recipe'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                flex-1 py-2 text-xs font-medium capitalize
                                border-b-2 -mb-px transition-colors
                                ${activeTab === tab
                                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                    : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {selectedNode ? (
                    <>
                        {activeTab === 'params' && (
                            <NodeParamsContent node={selectedNode} />
                        )}
                        {activeTab === 'output' && (
                            <NodeOutputContent node={selectedNode} />
                        )}
                        {activeTab === 'recipe' && (
                            <NodeRecipeContent node={selectedNode} />
                        )}
                    </>
                ) : (
                    <CardDetailsContent type={selectedCardType} data={selectedData} />
                )}
            </div>

            {/* Actions Footer */}
            {selectedNode && (
                <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
                    <button
                        onClick={onRun}
                        disabled={selectedNode.data?.status === 'running'}
                        className="
                            flex-1 py-2 rounded-lg text-xs font-medium
                            bg-emerald-500 text-white
                            hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center justify-center gap-1.5
                            transition-colors
                        "
                    >
                        <Play size={12} fill="currentColor" />
                        Run
                    </button>
                    <button
                        className="
                            py-2 px-3 rounded-lg text-xs font-medium
                            bg-[var(--bg-hover)] text-[var(--text-secondary)]
                            hover:bg-[var(--bg-input)]
                            flex items-center justify-center gap-1.5
                            transition-colors
                        "
                    >
                        <RotateCcw size={12} />
                        Re-run
                    </button>
                </div>
            )}
        </div>
    );
}

// Node Params Content
function NodeParamsContent({ node }: { node: SkillNode }) {
    const params = node.data || {};

    return (
        <div className="space-y-4">
            {Object.entries(params).map(([key, value]) => (
                <div key={key}>
                    <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 capitalize">
                        {key.replace(/_/g, ' ')}
                    </label>
                    {typeof value === 'boolean' ? (
                        <div className={`
                            inline-block px-2 py-1 rounded text-xs
                            ${value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}
                        `}>
                            {value ? 'Yes' : 'No'}
                        </div>
                    ) : typeof value === 'object' ? (
                        <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-input)] p-2 rounded-lg overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                        </pre>
                    ) : (
                        <input
                            type="text"
                            value={String(value ?? '')}
                            readOnly
                            className="
                                w-full px-3 py-2 rounded-lg text-xs
                                bg-[var(--bg-input)] border border-[var(--border-subtle)]
                                text-[var(--text-primary)]
                            "
                        />
                    )}
                </div>
            ))}
            {Object.keys(params).length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                    No parameters configured
                </p>
            )}
        </div>
    );
}

// Node Output Content
function NodeOutputContent({ node }: { node: SkillNode }) {
    const status = node.data?.status;
    return (
        <div className="text-center py-8">
            <p className="text-xs text-[var(--text-tertiary)]">
                {status === 'success'
                    ? 'Output available on canvas'
                    : status === 'running'
                        ? 'Running...'
                        : 'Run the node to see output'}
            </p>
        </div>
    );
}

// Node Recipe Content
function NodeRecipeContent({ node }: { node: SkillNode }) {
    const recipes = useRecipeStore(state => state.getRecipesForNode(node.id));

    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs text-[var(--text-tertiary)]">Runs</label>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{recipes.length}</span>
                </div>

                {recipes.length === 0 ? (
                    <p className="text-xs text-[var(--text-tertiary)] text-center py-6">
                        No runs yet. Use the node Action Bar to run.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {recipes
                            .slice()
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .slice(0, 10)
                            .map((recipe) => (
                                <div
                                    key={recipe.id}
                                    className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0">
                                            <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                                                {recipe.runMode}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-tertiary)]">
                                                {new Date(recipe.timestamp).toLocaleString()}
                                                {recipe.duration !== undefined ? ` · ${recipe.duration}ms` : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => replayRecipe(recipe.id)}
                                            disabled={recipe.status !== 'success'}
                                            className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-40 transition-colors"
                                            title={recipe.status !== 'success' ? 'Only successful runs can be replayed' : 'Replay (restore active outputs)'}
                                        >
                                            Replay
                                        </button>
                                    </div>
                                    {recipe.error && (
                                        <div className="mt-2 text-[10px] text-red-400">
                                            {recipe.error}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>

            <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Skill ID</label>
                <code className="text-xs text-[var(--text-secondary)] bg-[var(--bg-input)] px-2 py-1 rounded block">
                    {node.data?.skillId}
                </code>
            </div>
            <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Node ID</label>
                <code className="text-xs text-[var(--text-secondary)] bg-[var(--bg-input)] px-2 py-1 rounded block">
                    {node.id}
                </code>
            </div>
            <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Locked</label>
                <span className={`text-xs ${node.data?.locked ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                    {node.data?.locked ? 'Yes' : 'No'}
                </span>
            </div>
        </div>
    );
}

// Card Details Content
function CardDetailsContent({
    type,
    data
}: {
    type?: string;
    data?: Record<string, unknown>;
}) {
    if (!data) {
        return (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-8">
                Select an item to view details
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {Object.entries(data).map(([key, value]) => (
                <div key={key}>
                    <label className="block text-xs text-[var(--text-tertiary)] mb-1 capitalize">
                        {key.replace(/_/g, ' ')}
                    </label>
                    <div className="text-xs text-[var(--text-primary)]">
                        {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                    </div>
                </div>
            ))}
        </div>
    );
}
