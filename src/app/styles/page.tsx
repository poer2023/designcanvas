'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Palette, Upload, X, Trash2, Edit2, Check, ChevronRight } from 'lucide-react';
import type { StyleProfile } from '@/types';

export default function StylesPage() {
    const [styles, setStyles] = useState<StyleProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<StyleProfile | null>(null);

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

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="heading-xl mb-1">Style Profiles</h1>
                    <p className="text-secondary">Define your visual aesthetics and constraints</p>
                </div>
                <button
                    className="btn btn-primary h-10 px-4"
                    onClick={() => setShowCreateDialog(true)}
                >
                    <Plus size={18} />
                    <span>Create Profile</span>
                </button>
            </div>

            <div className="flex gap-6">
                {/* Styles List */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
                        </div>
                    ) : styles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-subtle rounded-xl bg-card/50">
                            <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center text-tertiary mb-4">
                                <Palette size={32} />
                            </div>
                            <h3 className="heading-md mb-2">No style profiles</h3>
                            <p className="text-secondary max-w-sm mb-6">
                                Upload reference images to create your first style profile.
                            </p>
                            <button className="btn btn-primary" onClick={() => setShowCreateDialog(true)}>
                                Create Profile
                            </button>
                        </div>
                    ) : (
                        <div className="grid-responsive">
                            {styles.map((style) => (
                                <div
                                    key={style.id}
                                    className={`card cursor-pointer group ${selectedStyle?.id === style.id ? 'ring-2 ring-accent-primary' : ''}`}
                                    onClick={() => setSelectedStyle(style)}
                                >
                                    {/* Palette Preview */}
                                    <div className="h-24 rounded-lg mb-4 overflow-hidden bg-bg-hover flex items-center justify-center">
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
                                            <Palette size={32} className="text-tertiary opacity-50" />
                                        )}
                                    </div>

                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="heading-sm group-hover:text-blue-500 transition-colors">
                                            {style.name}
                                        </h3>
                                        <span className="badge badge-blue shrink-0">v{style.version}</span>
                                    </div>

                                    <p className="text-sm text-secondary line-clamp-2 mb-3">
                                        {style.summary_s}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-tertiary border-t border-subtle pt-3">
                                        <span>{style.images.length} references</span>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedStyle && (
                    <div className="w-[360px] bg-panel border border-subtle rounded-xl p-6 h-fit sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="heading-md">{selectedStyle.name}</h2>
                            <button onClick={() => setSelectedStyle(null)} className="text-tertiary hover:text-primary">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-tertiary uppercase">Summary</label>
                                <p className="text-sm text-secondary mt-1">{selectedStyle.summary_s}</p>
                            </div>

                            {selectedStyle.banned_tokens && selectedStyle.banned_tokens.length > 0 && (
                                <div>
                                    <label className="text-xs font-medium text-tertiary uppercase">Banned Tokens</label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {selectedStyle.banned_tokens.map((token, i) => (
                                            <span key={i} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400">
                                                {token}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-medium text-tertiary uppercase">References</label>
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {selectedStyle.images.slice(0, 6).map((img, i) => (
                                        <div key={i} className="aspect-square rounded-lg bg-bg-hover overflow-hidden">
                                            <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">
                                                {i + 1}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedStyle.images.length > 6 && (
                                        <div className="aspect-square rounded-lg bg-bg-hover flex items-center justify-center text-tertiary text-xs">
                                            +{selectedStyle.images.length - 6}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-subtle space-y-2">
                            <button className="btn btn-secondary w-full justify-center">
                                <Edit2 size={14} />
                                <span>Edit Profile</span>
                            </button>
                            <button className="btn btn-ghost w-full justify-center text-red-500 hover:bg-red-500/10">
                                <Trash2 size={14} />
                                <span>Delete</span>
                            </button>
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
            // For now, just store file names as paths (real implementation would upload)
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
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="heading-lg">Create Style Profile</h2>
                        <p className="text-sm text-secondary">Upload reference images to define your style</p>
                    </div>
                    <button onClick={onClose} className="text-tertiary hover:text-primary">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">
                            Profile Name
                        </label>
                        <input
                            type="text"
                            className="input h-10"
                            placeholder="e.g. Minimalist Tech"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">
                            Reference Images
                        </label>
                        <div
                            className="border-2 border-dashed border-subtle rounded-xl p-8 text-center cursor-pointer hover:border-accent-primary hover:bg-accent-subtle/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={32} className="mx-auto text-tertiary mb-2" />
                            <p className="text-sm text-secondary">Click to upload or drag images here</p>
                            <p className="text-xs text-tertiary mt-1">PNG, JPG up to 10MB each</p>
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
                            <div className="mt-3 flex flex-wrap gap-2">
                                {images.map((img, i) => (
                                    <span key={i} className="text-xs px-2 py-1 rounded bg-bg-hover text-secondary">
                                        {img.split('/').pop()}
                                        <button
                                            type="button"
                                            onClick={() => setImages(images.filter((_, j) => j !== i))}
                                            className="ml-1 text-tertiary hover:text-red-400"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">
                            Style Tags <span className="text-tertiary font-normal">(comma-separated)</span>
                        </label>
                        <input
                            type="text"
                            className="input h-10"
                            placeholder="e.g. modern, clean, corporate"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
                            Create Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
