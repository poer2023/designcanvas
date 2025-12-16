'use client';

import { useState, useEffect } from 'react';
import { Filter, Tag, Image as ImageIcon, Loader2, Trash2, Download, Scissors, X, Search } from 'lucide-react';
import type { Element } from '@/types/element';

export default function ElementsPage() {
    const [elements, setElements] = useState<Element[]>([]);
    const [loading, setLoading] = useState(true);
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedElement, setSelectedElement] = useState<Element | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredElements = elements.filter(e =>
        !searchQuery || e.semantic_tag?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Elements</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {elements.length} element{elements.length !== 1 ? 's' : ''} extracted
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                        type="text"
                        placeholder="Search by tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="
              w-64 h-9 pl-9 pr-4 rounded-lg
              bg-[var(--bg-input)] border border-[var(--border-subtle)]
              text-sm text-[var(--text-primary)]
              placeholder:text-[var(--text-tertiary)]
              focus:outline-none focus:border-[var(--accent-primary)]
              transition-colors
            "
                    />
                </div>
            </div>

            <div className="flex gap-5 min-h-[calc(100vh-200px)]">
                {/* Filters Sidebar */}
                <div className="w-[200px] shrink-0">
                    <div className="sticky top-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Filter size={12} />
                            <span>Filters</span>
                        </h3>

                        <div className="space-y-1">
                            <button
                                onClick={() => setTagFilter(null)}
                                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${tagFilter === null
                                        ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-medium'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}
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
                    ${tagFilter === tag
                                            ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-medium'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}
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
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="animate-spin text-[var(--text-tertiary)]" size={32} />
                        </div>
                    ) : filteredElements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/30">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
                                <Scissors size={28} />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No elements yet</h3>
                            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                                Extract elements from your posters in the Gallery
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {filteredElements.map((element) => (
                                <div
                                    key={element.id}
                                    onClick={() => setSelectedElement(element)}
                                    className={`
                    group relative cursor-pointer rounded-xl overflow-hidden
                    bg-[var(--bg-card)] border transition-all duration-200
                    ${selectedElement?.id === element.id
                                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-subtle)]'
                                            : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:shadow-md'}
                  `}
                                >
                                    <div className="aspect-square bg-[var(--bg-hover)] relative">
                                        {element.image_url ? (
                                            <img
                                                src={element.image_url}
                                                alt={element.semantic_tag || 'Element'}
                                                className="w-full h-full object-contain p-3"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <ImageIcon size={24} className="text-[var(--text-tertiary)]" />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(element.id); }}
                                                className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 text-white transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white transition-colors"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-2.5">
                                        {element.semantic_tag ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-hover)] text-[10px] font-medium text-[var(--text-secondary)]">
                                                <Tag size={9} />
                                                {element.semantic_tag}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-[var(--text-tertiary)]">No tag</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedElement && (
                    <div className="w-[280px] shrink-0">
                        <div className="sticky top-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
                                <button
                                    onClick={() => setSelectedElement(null)}
                                    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Preview */}
                            <div className="aspect-square bg-[var(--bg-hover)] flex items-center justify-center">
                                <img
                                    src={selectedElement.image_url}
                                    alt={selectedElement.semantic_tag || 'Element'}
                                    className="max-w-full max-h-full object-contain p-6"
                                />
                            </div>

                            {/* Metadata */}
                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Tag</label>
                                    <div className="mt-1 px-3 py-2 bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)]">
                                        {selectedElement.semantic_tag || 'No tag'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Size</label>
                                    <div className="mt-1 px-3 py-2 bg-[var(--bg-input)] rounded-lg text-xs font-mono text-[var(--text-secondary)]">
                                        {selectedElement.bbox.width} × {selectedElement.bbox.height}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Used</label>
                                    <div className="mt-1 px-3 py-2 bg-[var(--bg-input)] rounded-lg text-sm text-[var(--text-primary)]">
                                        {selectedElement.used_count} time{selectedElement.used_count !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 pt-0 space-y-2">
                                <button className="
                  w-full h-9 rounded-lg text-sm font-medium
                  bg-[var(--accent-primary)] text-white
                  hover:bg-[var(--accent-hover)]
                  transition-colors
                ">
                                    Use in Canvas
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedElement.id)}
                                    className="
                    w-full h-9 rounded-lg text-sm font-medium
                    text-red-500 hover:bg-red-500/10
                    flex items-center justify-center gap-2
                    transition-colors
                  "
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
