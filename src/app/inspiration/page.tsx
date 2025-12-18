'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Trash2, Grid3X3, Image as ImageIcon, Folder, Check, X, Loader2, Search, Sparkles } from 'lucide-react';
import type { RefSet, RefSetItem } from '@/types/refset';
import { useTranslation } from '@/lib/i18n';

export default function InspirationPage() {
    const [refsets, setRefsets] = useState<RefSet[]>([]);
    const [selectedRefset, setSelectedRefset] = useState<RefSet | null>(null);
    const [items, setItems] = useState<RefSetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useTranslation();

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
            alert(t('inspiration.alertSelectFirst'));
            return;
        }

        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('image/')
        );

        if (files.length === 0) return;
        await handleUploadFiles(files);
    }, [selectedRefset, t]);

    const handleUploadFiles = async (files: File[]) => {
        if (!selectedRefset) return;

        setUploading(true);

        const newItems: Omit<RefSetItem, 'id' | 'refset_id' | 'created_at'>[] = files.map((file) => ({
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
                await fetchRefsetItems(selectedRefset.id);
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

    const filteredRefsets = refsets.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalImages = refsets.reduce((sum, r) => sum + r.item_count, 0);

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{t('inspiration.title')}</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {refsets.length} {refsets.length !== 1 ? t('inspiration.sets') : t('inspiration.set')} • {totalImages} {totalImages !== 1 ? t('inspiration.images') : t('inspiration.image')}
                    </p>
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
                    <span>{t('inspiration.newSet')}</span>
                </button>
            </div>

            <div className="flex gap-5 min-h-[calc(100vh-200px)]">
                {/* RefSets Sidebar */}
                <div className="w-[240px] shrink-0">
                    <div className="sticky top-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-[var(--border-subtle)]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input
                                    type="text"
                                    placeholder={t('inspiration.searchSets')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="
                    w-full h-9 pl-9 pr-3 rounded-lg
                    bg-[var(--bg-input)] border border-[var(--border-default)]
                    text-sm text-[var(--text-primary)]
                    placeholder:text-[var(--text-tertiary)]
                    focus:outline-none focus:border-[var(--accent-primary)]
                  "
                                />
                            </div>
                        </div>

                        <div className="p-2 max-h-[500px] overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-[var(--text-tertiary)]" size={20} />
                                </div>
                            ) : filteredRefsets.length === 0 ? (
                                <div className="text-center py-8">
                                    <Folder size={28} className="mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
                                    <p className="text-xs text-[var(--text-tertiary)]">
                                        {searchQuery ? t('inspiration.noMatchingSets') : t('inspiration.noSets')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredRefsets.map((refset) => (
                                        <button
                                            key={refset.id}
                                            onClick={() => handleSelectRefset(refset)}
                                            className={`
                        w-full p-3 rounded-lg text-left transition-all
                        ${selectedRefset?.id === refset.id
                                                    ? 'bg-[var(--accent-subtle)] border border-[var(--accent-primary)]'
                                                    : 'hover:bg-[var(--bg-hover)] border border-transparent'}
                      `}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Grid3X3 size={14} className={selectedRefset?.id === refset.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'} />
                                                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{refset.name}</span>
                                            </div>
                                            <div className="text-[11px] text-[var(--text-tertiary)]">
                                                {refset.item_count} {t('inspiration.images')}
                                                {refset.cluster_count > 0 && ` • ${refset.cluster_count} ${t('inspiration.clusters')}`}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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
                  relative border-2 border-dashed rounded-xl p-6 mb-4 text-center transition-all
                  ${dragActive
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-subtle)]'
                                        : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
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
                                    <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                                        <Loader2 className="animate-spin" size={18} />
                                        <span className="text-sm">{t('inspiration.upload.uploading')}</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="mx-auto text-[var(--text-tertiary)] mb-2" />
                                        <p className="text-sm text-[var(--text-secondary)]">{t('inspiration.upload.dropHint')}</p>
                                        <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{t('inspiration.upload.formats')}</p>
                                    </>
                                )}
                            </div>

                            {/* Image Grid */}
                            <div className="flex-1 overflow-y-auto">
                                {items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/30">
                                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-3">
                                            <ImageIcon size={24} />
                                        </div>
                                        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t('inspiration.noImages.title')}</h3>
                                        <p className="text-xs text-[var(--text-secondary)]">{t('inspiration.noImages.description')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`
                          relative aspect-square rounded-xl overflow-hidden group cursor-pointer
                          bg-[var(--bg-card)] border-2 transition-all
                          ${item.is_duplicate
                                                        ? 'border-amber-500/50 opacity-60'
                                                        : 'border-transparent hover:border-[var(--accent-primary)]'}
                        `}
                                            >
                                                <div className="absolute inset-0 bg-[var(--bg-hover)] flex items-center justify-center">
                                                    <ImageIcon size={20} className="text-[var(--text-tertiary)]" />
                                                </div>

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white transition-colors">
                                                        <Check size={14} />
                                                    </button>
                                                    <button className="p-2 bg-red-500/70 rounded-lg hover:bg-red-500 text-white transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                {/* Badges */}
                                                {item.is_duplicate && (
                                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-medium">
                                                        {t('inspiration.dup')}
                                                    </div>
                                                )}
                                                {item.cluster_id !== undefined && (
                                                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-blue-500/80 text-white text-[9px] font-medium backdrop-blur-sm">
                                                        C{item.cluster_id}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/30">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
                                <Sparkles size={28} />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">{t('inspiration.selectSet.title')}</h3>
                            <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-4">
                                {t('inspiration.selectSet.description')}
                            </p>
                            <button
                                className="
                  h-9 px-4 rounded-lg text-sm font-medium
                  bg-[var(--bg-input)] border border-[var(--border-default)]
                  text-[var(--text-primary)]
                  hover:bg-[var(--bg-hover)]
                  flex items-center gap-2
                  transition-colors
                "
                                onClick={() => setShowCreateDialog(true)}
                            >
                                <Plus size={14} />
                                {t('inspiration.createSet')}
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
    const { t } = useTranslation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onCreate(name.trim());
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="
          w-full max-w-md mx-4
          bg-[var(--bg-panel)] border border-[var(--border-subtle)]
          rounded-2xl shadow-2xl p-6
        "
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('inspiration.createDialog.title')}</h2>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            {t('inspiration.createDialog.nameLabel')}
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
                            placeholder={t('inspiration.createDialog.namePlaceholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3">
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
                            {t('common.cancel')}
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
                            {t('common.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
