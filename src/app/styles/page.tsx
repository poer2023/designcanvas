'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Palette, Upload, X, Trash2, Edit2, ChevronRight, Search, Sparkles } from 'lucide-react';
import type { StyleProfile } from '@/types';

export default function StylesPage() {
    const [styles, setStyles] = useState<StyleProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<StyleProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchStyles();
    }, []);

    async function fetchStyles() {
        try {
            const response = await fetch('/api/styles');
            const data = await response.json();
            if (data.success) {
                setStyles(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch styles:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateStyle(formData: { name: string; images: string[]; tags: string }) {
        try {
            const response = await fetch('/api/styles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    summary_s: `Style profile based on ${formData.images.length} reference images`,
                    images: formData.images,
                    banned_tokens: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                }),
            });
            const data = await response.json();
            if (data.success) {
                setStyles([data.data, ...styles]);
                setShowCreateDialog(false);
            }
        } catch (error) {
            console.error('Failed to create style:', error);
        }
    }

    async function handleDeleteStyle(id: string) {
        if (!confirm('Are you sure you want to delete this style profile?')) return;

        try {
            await fetch(`/api/styles/${id}`, { method: 'DELETE' });
            setStyles(styles.filter(s => s.id !== id));
            if (selectedStyle?.id === id) {
                setSelectedStyle(null);
            }
        } catch (error) {
            console.error('Failed to delete style:', error);
        }
    }

    const filteredStyles = styles.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.summary_s?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Styles</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {styles.length} profile{styles.length !== 1 ? 's' : ''} defined
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                        <input
                            type="text"
                            placeholder="Search styles..."
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
                    <button
                        className="
              h-9 px-4 rounded-lg
              bg-[var(--accent-primary)] text-white text-sm font-medium
              hover:bg-[var(--accent-hover)]
              flex items-center gap-2
              transition-colors
            "
                        onClick={() => setShowCreateDialog(true)}
                    >
                        <Plus size={16} />
                        <span>Create</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-5 min-h-[calc(100vh-200px)]">
                {/* Styles Grid */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
                        </div>
                    ) : filteredStyles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/30">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
                                <Palette size={28} />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                                {searchQuery ? 'No matching styles' : 'No style profiles'}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
                                {searchQuery ? 'Try a different search' : 'Upload reference images to create your first style profile'}
                            </p>
                            {!searchQuery && (
                                <button
                                    className="
                    h-10 px-5 rounded-lg
                    bg-[var(--accent-primary)] text-white text-sm font-medium
                    hover:bg-[var(--accent-hover)]
                    transition-colors
                  "
                                    onClick={() => setShowCreateDialog(true)}
                                >
                                    Create Profile
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStyles.map((style) => (
                                <div
                                    key={style.id}
                                    className={`
                    group cursor-pointer rounded-xl overflow-hidden
                    bg-[var(--bg-card)] border transition-all duration-200
                    ${selectedStyle?.id === style.id
                                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-subtle)]'
                                            : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:shadow-md'}
                  `}
                                    onClick={() => setSelectedStyle(style)}
                                >
                                    {/* Palette Preview */}
                                    <div className="h-20 overflow-hidden relative">
                                        {style.palette_hint && style.palette_hint.length > 0 ? (
                                            <div className="flex w-full h-full">
                                                {style.palette_hint.slice(0, 5).map((color, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 h-full"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center">
                                                <Palette size={24} className="text-[var(--text-tertiary)] opacity-50" />
                                            </div>
                                        )}

                                        {/* Version badge */}
                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] font-mono backdrop-blur-sm">
                                            v{style.version}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                                                {style.name}
                                            </h3>
                                            <ChevronRight size={16} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                        </div>

                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                                            {style.summary_s}
                                        </p>

                                        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                                            <span>{style.images.length} references</span>
                                            {style.banned_tokens && style.banned_tokens.length > 0 && (
                                                <span className="text-red-400">{style.banned_tokens.length} banned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedStyle && (
                    <div className="w-[300px] shrink-0">
                        <div className="sticky top-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            {/* Header with palette */}
                            <div className="h-16 relative">
                                {selectedStyle.palette_hint && selectedStyle.palette_hint.length > 0 ? (
                                    <div className="flex w-full h-full">
                                        {selectedStyle.palette_hint.slice(0, 5).map((color, i) => (
                                            <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-pink-500/30" />
                                )}
                                <button
                                    onClick={() => setSelectedStyle(null)}
                                    className="absolute top-2 right-2 p-1 rounded bg-black/40 text-white hover:bg-black/60 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selectedStyle.name}</h2>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)] font-mono">
                                        v{selectedStyle.version}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mb-4">{selectedStyle.summary_s}</p>

                                {/* Banned Tokens */}
                                {selectedStyle.banned_tokens && selectedStyle.banned_tokens.length > 0 && (
                                    <div className="mb-4">
                                        <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Banned Tokens</label>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {selectedStyle.banned_tokens.map((token, i) => (
                                                <span key={i} className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400">
                                                    {token}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* References */}
                                <div className="mb-4">
                                    <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">References ({selectedStyle.images.length})</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {selectedStyle.images.slice(0, 6).map((img, i) => (
                                            <div key={i} className="aspect-square rounded-lg bg-[var(--bg-hover)] overflow-hidden flex items-center justify-center">
                                                <span className="text-xs text-[var(--text-tertiary)]">{i + 1}</span>
                                            </div>
                                        ))}
                                        {selectedStyle.images.length > 6 && (
                                            <div className="aspect-square rounded-lg bg-[var(--bg-hover)] flex items-center justify-center">
                                                <span className="text-xs text-[var(--text-tertiary)]">+{selectedStyle.images.length - 6}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 pt-0 space-y-2">
                                <button className="
                  w-full h-9 rounded-lg text-sm font-medium
                  bg-[var(--bg-input)] border border-[var(--border-default)]
                  text-[var(--text-primary)]
                  hover:bg-[var(--bg-hover)]
                  flex items-center justify-center gap-2
                  transition-colors
                ">
                                    <Edit2 size={14} />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => handleDeleteStyle(selectedStyle.id)}
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

            {/* Create Dialog */}
            {showCreateDialog && (
                <CreateStyleDialog
                    onClose={() => setShowCreateDialog(false)}
                    onSubmit={handleCreateStyle}
                />
            )}
        </>
    );
}

function CreateStyleDialog({
    onClose,
    onSubmit
}: {
    onClose: () => void;
    onSubmit: (data: { name: string; images: string[]; tags: string }) => void;
}) {
    const [name, setName] = useState('');
    const [tags, setTags] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages = Array.from(files).map(f => `/assets/styles/${f.name}`);
            setImages([...images, ...newImages]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, images, tags });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="
          w-full max-w-lg mx-4
          bg-[var(--bg-panel)] border border-[var(--border-subtle)]
          rounded-2xl shadow-2xl
        "
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Style Profile</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">Define your visual aesthetic</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            Profile Name
                        </label>
                        <input
                            type="text"
                            className="
                w-full h-11 px-4 rounded-lg
                bg-[var(--bg-input)] border border-[var(--border-default)]
                text-[var(--text-primary)] text-sm
                placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]
              "
                            placeholder="e.g. Minimalist Tech"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            Reference Images
                        </label>
                        <div
                            className="
                border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-6 text-center cursor-pointer
                hover:border-[var(--accent-primary)] hover:bg-[var(--accent-subtle)]/30 transition-colors
              "
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={28} className="mx-auto text-[var(--text-tertiary)] mb-2" />
                            <p className="text-sm text-[var(--text-secondary)]">Click to upload</p>
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">PNG, JPG up to 10MB</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        {images.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {images.map((img, i) => (
                                    <span key={i} className="text-[11px] px-2 py-1 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center gap-1">
                                        {img.split('/').pop()}
                                        <button
                                            type="button"
                                            onClick={() => setImages(images.filter((_, j) => j !== i))}
                                            className="text-[var(--text-tertiary)] hover:text-red-400"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            Banned Tokens <span className="text-[var(--text-tertiary)] font-normal">(comma-separated)</span>
                        </label>
                        <input
                            type="text"
                            className="
                w-full h-11 px-4 rounded-lg
                bg-[var(--bg-input)] border border-[var(--border-default)]
                text-[var(--text-primary)] text-sm
                placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]
              "
                            placeholder="e.g. blurry, low quality, watermark"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="
                px-4 h-10 rounded-lg text-sm font-medium
                text-[var(--text-secondary)]
                hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
                transition-colors
              "
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="
                px-5 h-10 rounded-lg text-sm font-medium
                bg-[var(--accent-primary)] text-white
                hover:bg-[var(--accent-hover)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
                        >
                            Create Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
