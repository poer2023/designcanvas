'use client';

import { useState, useEffect } from 'react';
import { Star, X, Image as ImageIcon, Loader2, Sparkles, Grid3X3, LayoutGrid } from 'lucide-react';
import type { Poster, PosterStatus } from '@/types/poster';
import PosterCard from '@/components/gallery/PosterCard';
import PosterDetail from '@/components/gallery/PosterDetail';
import { useTranslation } from '@/lib/i18n';

export default function GalleryPage() {
    const [posters, setPosters] = useState<Poster[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<PosterStatus | 'all'>('all');
    const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');
    const { t } = useTranslation();

    const STATUS_FILTERS: { value: PosterStatus | 'all'; labelKey: string; icon?: React.ReactNode; color?: string }[] = [
        { value: 'all', labelKey: 'gallery.filters.all' },
        { value: 'generated', labelKey: 'gallery.filters.new', icon: <Sparkles size={14} />, color: 'blue' },
        { value: 'favorite', labelKey: 'gallery.filters.favorites', icon: <Star size={14} />, color: 'amber' },
        { value: 'rejected', labelKey: 'gallery.filters.rejected', icon: <X size={14} />, color: 'red' },
    ];

    useEffect(() => {
        fetchPosters();
    }, [statusFilter]);

    async function fetchPosters() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.set('status', statusFilter);
            }

            const response = await fetch(`/api/posters?${params}`);
            const data = await response.json();
            if (data.success) {
                setPosters(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch posters:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(posterId: string, newStatus: PosterStatus) {
        try {
            const response = await fetch(`/api/posters/${posterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setPosters(posters.map(p =>
                    p.id === posterId ? { ...p, status: newStatus } : p
                ));
                if (selectedPoster?.id === posterId) {
                    setSelectedPoster({ ...selectedPoster, status: newStatus });
                }
            }
        } catch (error) {
            console.error('Failed to update poster status:', error);
        }
    }

    async function handleDelete(posterId: string) {
        if (!confirm(t('gallery.deleteConfirm'))) return;

        try {
            const response = await fetch(`/api/posters/${posterId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setPosters(posters.filter(p => p.id !== posterId));
                if (selectedPoster?.id === posterId) {
                    setSelectedPoster(null);
                }
            }
        } catch (error) {
            console.error('Failed to delete poster:', error);
        }
    }

    const filteredPosters = statusFilter === 'all'
        ? posters
        : posters.filter(p => p.status === statusFilter);

    const stats = {
        total: posters.length,
        favorites: posters.filter(p => p.status === 'favorite').length,
        rejected: posters.filter(p => p.status === 'rejected').length,
    };

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{t('gallery.title')}</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {stats.total} {stats.total !== 1 ? t('gallery.posters') : t('gallery.poster')} • {stats.favorites} {stats.favorites !== 1 ? t('gallery.favorites') : t('gallery.favorite')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] p-1">
                        <button
                            onClick={() => setViewMode('masonry')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'masonry' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                            title={t('gallery.viewModes.masonry')}
                        >
                            <Grid3X3 size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                            title={t('gallery.viewModes.grid')}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg p-1">
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setStatusFilter(filter.value)}
                                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                  ${statusFilter === filter.value
                                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
                `}
                            >
                                {filter.icon}
                                <span>{t(filter.labelKey)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="animate-spin text-[var(--text-tertiary)]" size={32} />
                </div>
            ) : filteredPosters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/30">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
                        <ImageIcon size={28} />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">{t('gallery.empty.title')}</h3>
                    <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                        {t('gallery.empty.description')}
                    </p>
                </div>
            ) : viewMode === 'masonry' ? (
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                    {filteredPosters.map((poster) => (
                        <PosterCard
                            key={poster.id}
                            poster={poster}
                            onClick={() => setSelectedPoster(poster)}
                            onFavorite={() => handleStatusChange(
                                poster.id,
                                poster.status === 'favorite' ? 'generated' : 'favorite'
                            )}
                            onReject={() => handleStatusChange(
                                poster.id,
                                poster.status === 'rejected' ? 'generated' : 'rejected'
                            )}
                        />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredPosters.map((poster) => (
                        <PosterCard
                            key={poster.id}
                            poster={poster}
                            onClick={() => setSelectedPoster(poster)}
                            onFavorite={() => handleStatusChange(
                                poster.id,
                                poster.status === 'favorite' ? 'generated' : 'favorite'
                            )}
                            onReject={() => handleStatusChange(
                                poster.id,
                                poster.status === 'rejected' ? 'generated' : 'rejected'
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedPoster && (
                <PosterDetail
                    poster={selectedPoster}
                    onClose={() => setSelectedPoster(null)}
                    onFavorite={() => handleStatusChange(
                        selectedPoster.id,
                        selectedPoster.status === 'favorite' ? 'generated' : 'favorite'
                    )}
                    onReject={() => handleStatusChange(
                        selectedPoster.id,
                        selectedPoster.status === 'rejected' ? 'generated' : 'rejected'
                    )}
                    onDelete={() => handleDelete(selectedPoster.id)}
                />
            )}
        </>
    );
}
