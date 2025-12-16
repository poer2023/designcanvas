'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Trash2, Grid, Image as ImageIcon, Folder, Check, X, Loader2 } from 'lucide-react';
import type { RefSet, RefSetItem } from '@/types/refset';

export default function InspirationPage() {
    const [refsets, setRefsets] = useState<RefSet[]>([]);
    const [selectedRefset, setSelectedRefset] = useState<RefSet | null>(null);
    const [items, setItems] = useState<RefSetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        fetchRefsets();
    }, []);

    async function fetchRefsets() {
        try {
            const response = await fetch('/api/refsets');
            const data = await response.json();
            if (data.success) {
                setRefsets(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch refsets:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchRefsetItems(id: string) {
        try {
            const response = await fetch(`/api/refsets/${id}`);
            const data = await response.json();
            if (data.success) {
                setItems(data.data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch refset items:', error);
        }
    }

    const handleSelectRefset = useCallback((refset: RefSet) => {
        setSelectedRefset(refset);
        fetchRefsetItems(refset.id);
    }, []);

    const handleCreateRefset = async (name: string) => {
        try {
            const response = await fetch('/api/refsets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const data = await response.json();
            if (data.success) {
                setRefsets([data.data, ...refsets]);
                setShowCreateDialog(false);
                handleSelectRefset(data.data);
            }
        } catch (error) {
            console.error('Failed to create refset:', error);
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (!selectedRefset) {
            alert('Please select or create a RefSet first');
            return;
        }

        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('image/')
        );

        if (files.length === 0) return;

        await handleUploadFiles(files);
    }, [selectedRefset]);

    const handleUploadFiles = async (files: File[]) => {
        if (!selectedRefset) return;

        setUploading(true);

        // Create mock items (in real implementation, would upload to server)
        const newItems: Omit<RefSetItem, 'id' | 'refset_id' | 'created_at'>[] = files.map((file, index) => ({
            image_path: `/assets/inspiration/${selectedRefset.id}/${file.name}`,
            thumbnail_path: `/assets/inspiration/${selectedRefset.id}/thumbs/${file.name}`,
            file_size: file.size,
            is_duplicate: false,
        }));

        try {
            const response = await fetch(`/api/refsets/${selectedRefset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'addItems', items: newItems }),
            });
            const data = await response.json();
            if (data.success) {
                // Refresh items
                await fetchRefsetItems(selectedRefset.id);
                // Update refset count
                setRefsets(refsets.map(r =>
                    r.id === selectedRefset.id
                        ? { ...r, item_count: r.item_count + files.length }
                        : r
                ));
            }
        } catch (error) {
            console.error('Failed to upload files:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleUploadFiles(Array.from(files));
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="heading-xl mb-1">Inspiration Pool</h1>
                    <p className="text-secondary">Import and organize reference images</p>
                </div>
                <button
                    className="btn btn-primary h-10 px-4"
                    onClick={() => setShowCreateDialog(true)}
                >
                    <Plus size={18} />
                    <span>New RefSet</span>
                </button>
            </div>

            <div className="flex gap-6 h-[calc(100vh-200px)]">
                {/* RefSets Sidebar */}
                <div className="w-[260px] bg-panel border border-subtle rounded-xl p-4 overflow-y-auto shrink-0">
                    <h3 className="heading-sm mb-3">Reference Sets</h3>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-tertiary" size={24} />
                        </div>
                    ) : refsets.length === 0 ? (
                        <div className="text-center py-8 text-tertiary text-sm">
                            <Folder size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No reference sets yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {refsets.map((refset) => (
                                <button
                                    key={refset.id}
                                    onClick={() => handleSelectRefset(refset)}
                                    className={`
                    w-full p-3 rounded-lg text-left transition-colors
                    ${selectedRefset?.id === refset.id
                                            ? 'bg-accent-subtle border border-accent-primary'
                                            : 'bg-card hover:bg-card-hover border border-transparent'}
                  `}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Grid size={14} className="text-tertiary" />
                                        <span className="text-sm font-medium truncate">{refset.name}</span>
                                    </div>
                                    <div className="text-xs text-tertiary">
                                        {refset.item_count} images • {refset.cluster_count} clusters
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedRefset ? (
                        <>
                            {/* Upload Zone */}
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`
                  relative border-2 border-dashed rounded-xl p-8 mb-4 text-center transition-colors
                  ${dragActive
                                        ? 'border-accent-primary bg-accent-subtle'
                                        : 'border-subtle hover:border-default'}
                `}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileInput}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {uploading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Uploading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} className="mx-auto text-tertiary mb-2" />
                                        <p className="text-secondary">Drop images here or click to upload</p>
                                        <p className="text-xs text-tertiary mt-1">Supports JPG, PNG, WebP</p>
                                    </>
                                )}
                            </div>

                            {/* Image Grid */}
                            <div className="flex-1 overflow-y-auto">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-tertiary">
                                        <ImageIcon size={48} className="opacity-50 mb-4" />
                                        <p className="text-lg">No images yet</p>
                                        <p className="text-sm">Upload images to get started</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-4">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`
                          relative aspect-square rounded-lg overflow-hidden border-2 group cursor-pointer
                          ${item.is_duplicate ? 'border-amber-500/50 opacity-60' : 'border-transparent hover:border-accent-primary'}
                        `}
                                            >
                                                <div className="absolute inset-0 bg-bg-hover flex items-center justify-center">
                                                    <ImageIcon size={24} className="text-tertiary" />
                                                </div>

                                                {/* Overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white">
                                                        <Check size={16} />
                                                    </button>
                                                    <button className="p-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 text-white">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Duplicate badge */}
                                                {item.is_duplicate && (
                                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-medium">
                                                        Duplicate
                                                    </div>
                                                )}

                                                {/* Cluster badge */}
                                                {item.cluster_id !== undefined && (
                                                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px] font-medium">
                                                        Cluster {item.cluster_id}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-tertiary">
                            <Grid size={64} className="opacity-50 mb-4" />
                            <p className="text-lg">Select a Reference Set</p>
                            <p className="text-sm mb-4">Or create a new one to get started</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCreateDialog(true)}
                            >
                                <Plus size={16} />
                                <span>Create RefSet</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            {showCreateDialog && (
                <CreateRefsetDialog
                    onClose={() => setShowCreateDialog(false)}
                    onCreate={handleCreateRefset}
                />
            )}
        </>
    );
}

function CreateRefsetDialog({
    onClose,
    onCreate
}: {
    onClose: () => void;
    onCreate: (name: string) => void;
}) {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name.trim());
        }
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-panel max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="heading-lg">Create Reference Set</h2>
                    <button onClick={onClose} className="text-tertiary hover:text-primary">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-secondary mb-1.5">
                            Name
                        </label>
                        <input
                            type="text"
                            className="input h-10"
                            placeholder="e.g. Summer Festival References"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
