'use client';

import { useState, useEffect } from 'react';
import { Filter, Star, X, Image as ImageIcon, Loader2, Sparkles, Trash2, Download } from 'lucide-react';
import type { Poster, PosterStatus } from '@/types/poster';
import PosterCard from '@/components/gallery/PosterCard';
import PosterDetail from '@/components/gallery/PosterDetail';

const STATUS_FILTERS: { value: PosterStatus | 'all'; label: string; icon?: React.ReactNode }[] = [
    { value: 'all', label: 'All' },
    { value: 'generated', label: 'New', icon: <Sparkles size={14} /> },
    { value: 'favorite', label: 'Favorites', icon: <Star size={14} /> },
    { value: 'rejected', label: 'Rejected', icon: <X size={14} /> },
];

export default function GalleryPage() {
    const [posters, setPosters] = useState<Poster[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<PosterStatus | 'all'>('all');
    const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null);

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
        if (!confirm('Are you sure you want to delete this poster?')) return;

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

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="heading-xl mb-1">Gallery</h1>
                    <p className="text-secondary">Browse and manage generated posters</p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 bg-panel border border-subtle rounded-lg p-1">
                    {STATUS_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${statusFilter === filter.value
                                    ? 'bg-accent-subtle text-accent-primary'
                                    : 'text-secondary hover:text-primary hover:bg-bg-hover'}
              `}
                        >
                            {filter.icon}
                            <span>{filter.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-tertiary" size={32} />
                </div>
            ) : filteredPosters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-tertiary">
                    <ImageIcon size={64} className="opacity-50 mb-4" />
                    <p className="text-lg">No posters yet</p>
                    <p className="text-sm">Generate some posters from your project's Skill Graph</p>
                </div>
            ) : (
                /* Masonry Grid */
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
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
