'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Tag, Image as ImageIcon, Loader2, Trash2, Download, Search, Scissors } from 'lucide-react';
import type { Element } from '@/types/element';

export default function ElementsPage() {
    const [elements, setElements] = useState<Element[]>([]);
    const [loading, setLoading] = useState(true);
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedElement, setSelectedElement] = useState<Element | null>(null);

    useEffect(() => {
        fetchElements();
        fetchTags();
    }, [tagFilter]);

    async function fetchElements() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (tagFilter) {
                params.set('tag', tagFilter);
            }

            const response = await fetch(`/api/elements?${params}`);
            const data = await response.json();
            if (data.success) {
                setElements(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch elements:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTags() {
        try {
            const response = await fetch('/api/elements?tagsOnly=true');
            const data = await response.json();
            if (data.success) {
                setAvailableTags(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    }

    async function handleDelete(elementId: string) {
        if (!confirm('Are you sure you want to delete this element?')) return;

        try {
            const response = await fetch(`/api/elements/${elementId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setElements(elements.filter(e => e.id !== elementId));
                if (selectedElement?.id === elementId) {
                    setSelectedElement(null);
                }
            }
        } catch (error) {
            console.error('Failed to delete element:', error);
        }
    }

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="heading-xl mb-1">Elements Library</h1>
                    <p className="text-secondary">Manage extracted elements from your posters</p>
                </div>
            </div>

            <div className="flex gap-6 h-[calc(100vh-200px)]">
                {/* Filters Sidebar */}
                <div className="w-[220px] bg-panel border border-subtle rounded-xl p-4 overflow-y-auto shrink-0">
                    <h3 className="heading-sm mb-3 flex items-center gap-2">
                        <Filter size={14} />
                        <span>Filters</span>
                    </h3>

                    {/* Tags */}
                    <div className="mb-4">
                        <h4 className="text-xs font-medium text-tertiary uppercase mb-2">Semantic Tags</h4>
                        <div className="space-y-1">
                            <button
                                onClick={() => setTagFilter(null)}
                                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${tagFilter === null ? 'bg-accent-subtle text-accent-primary' : 'hover:bg-bg-hover'}
                `}
                            >
                                All Elements
                            </button>
                            {availableTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setTagFilter(tag)}
                                    className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2
                    ${tagFilter === tag ? 'bg-accent-subtle text-accent-primary' : 'hover:bg-bg-hover'}
                  `}
                                >
                                    <Tag size={12} />
                                    <span className="capitalize">{tag}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-tertiary" size={32} />
                        </div>
                    ) : elements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-tertiary">
                            <Scissors size={64} className="opacity-50 mb-4" />
                            <p className="text-lg">No elements yet</p>
                            <p className="text-sm">Extract elements from your posters in the Gallery</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {elements.map((element) => (
                                <div
                                    key={element.id}
                                    onClick={() => setSelectedElement(element)}
                                    className={`
                    group relative cursor-pointer rounded-xl overflow-hidden bg-card border 
                    transition-all hover:shadow-lg
                    ${selectedElement?.id === element.id
                                            ? 'border-accent-primary ring-2 ring-accent-subtle'
                                            : 'border-subtle hover:border-default'}
                  `}
                                >
                                    {/* Element Image */}
                                    <div className="aspect-square bg-bg-hover relative">
                                        {element.image_url ? (
                                            <img
                                                src={element.image_url}
                                                alt={element.semantic_tag || 'Element'}
                                                className="w-full h-full object-contain p-2"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <ImageIcon size={24} className="text-tertiary" />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(element.id); }}
                                                className="p-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 text-white"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-2">
                                        {element.semantic_tag && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-hover text-xs text-secondary">
                                                <Tag size={10} />
                                                {element.semantic_tag}
                                            </span>
                                        )}
                                        <div className="mt-1 text-[10px] text-tertiary">
                                            Used {element.used_count} times
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedElement && (
                    <div className="w-[300px] bg-panel border border-subtle rounded-xl p-4 overflow-y-auto shrink-0">
                        <h3 className="heading-sm mb-4">Element Details</h3>

                        {/* Preview */}
                        <div className="aspect-square bg-bg-hover rounded-lg mb-4 flex items-center justify-center">
                            <img
                                src={selectedElement.image_url}
                                alt={selectedElement.semantic_tag || 'Element'}
                                className="max-w-full max-h-full object-contain p-4"
                            />
                        </div>

                        {/* Metadata */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-tertiary">Semantic Tag</label>
                                <div className="mt-1 px-3 py-2 bg-card rounded-lg text-sm">
                                    {selectedElement.semantic_tag || 'No tag'}
                                </div>
                            </div>

                            {selectedElement.note && (
                                <div>
                                    <label className="text-xs font-medium text-tertiary">Notes</label>
                                    <div className="mt-1 px-3 py-2 bg-card rounded-lg text-sm">
                                        {selectedElement.note}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-medium text-tertiary">Bounding Box</label>
                                <div className="mt-1 px-3 py-2 bg-card rounded-lg text-xs font-mono">
                                    {selectedElement.bbox.width}×{selectedElement.bbox.height} at ({selectedElement.bbox.x}, {selectedElement.bbox.y})
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-tertiary">Usage Count</label>
                                <div className="mt-1 px-3 py-2 bg-card rounded-lg text-sm">
                                    {selectedElement.used_count} times
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 space-y-2">
                            <button className="btn btn-primary w-full h-9">
                                Use in Composition
                            </button>
                            <button
                                onClick={() => handleDelete(selectedElement.id)}
                                className="btn btn-ghost w-full h-9 text-red-500 hover:bg-red-500/10"
                            >
                                <Trash2 size={14} />
                                <span>Delete Element</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
