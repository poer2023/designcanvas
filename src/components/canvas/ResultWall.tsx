/**
 * PRD v2.0: Result Wall Component
 * 
 * Displays generated image results with action overlay:
 * - Preview (Lightbox)
 * - Download
 * - Pin as Output
 * - Replace (copy to another ImageCard)
 * - Reset (clear results)
 */

'use client';

import { useState, useCallback, memo } from 'react';
import {
    Eye,
    Download,
    Pin,
    ArrowRight,
    RotateCcw,
    X,
    Check,
    Copy,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useSnapshotStore } from '@/store/snapshotStore';

export interface ImageResult {
    id: string;
    url: string;
    seed?: number;
}

interface ResultWallProps {
    nodeId: string;
    results: ImageResult[];
    pinnedId?: string;
    onPinChange?: (pinnedId: string | null) => void;
    onResultsChange?: (results: ImageResult[]) => void;
    aspectRatio?: number; // width/height ratio, e.g. 1.5 for 3:2
    layout?: 'grid' | 'single';
}

export function ResultWall({
    nodeId,
    results,
    pinnedId,
    onPinChange,
    onResultsChange,
    aspectRatio = 1.5,
    layout = 'grid'
}: ResultWallProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showReplaceMenu, setShowReplaceMenu] = useState<string | null>(null);

    const { nodes, updateNodeData } = useGraphStore();
    const { createSnapshot } = useSnapshotStore();

    // Get ImageCard nodes that can receive images
    const imageCardTargets = nodes.filter(n =>
        n.type === 'imageCard' &&
        n.data.mode === 'raw' &&
        n.id !== nodeId
    );

    // ==========================================================================
    // Actions
    // ==========================================================================

    const handlePreview = useCallback((index: number) => {
        setLightboxIndex(index);
        setShowLightbox(true);
    }, []);

    const handleDownload = useCallback(async (result: ImageResult) => {
        try {
            const response = await fetch(result.url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-${result.id}${result.seed ? `-seed${result.seed}` : ''}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }, []);

    const handlePin = useCallback((result: ImageResult) => {
        const newPinnedId = pinnedId === result.id ? null : result.id;
        onPinChange?.(newPinnedId);

        // Update snapshot with pinned image
        if (newPinnedId) {
            createSnapshot(nodeId, 'imageOut', result.url);
        }
    }, [pinnedId, onPinChange, nodeId, createSnapshot]);

    const handleReplace = useCallback((result: ImageResult, targetNodeId: string) => {
        // Update target node's imageUrl
        updateNodeData(targetNodeId, {
            imageUrl: result.url,
            source: 'replace',
        });
        setShowReplaceMenu(null);
        console.log(`[PRD v2.0] Replaced image in node ${targetNodeId}`);
    }, [updateNodeData]);

    const handleReset = useCallback(() => {
        onResultsChange?.([]);
        onPinChange?.(null);
    }, [onResultsChange, onPinChange]);

    // ==========================================================================
    // Lightbox Navigation
    // ==========================================================================

    const handleLightboxPrev = useCallback(() => {
        setLightboxIndex(i => (i - 1 + results.length) % results.length);
    }, [results.length]);

    const handleLightboxNext = useCallback(() => {
        setLightboxIndex(i => (i + 1) % results.length);
    }, [results.length]);

    // ==========================================================================
    // Render
    // ==========================================================================

    if (results.length === 0) {
        return null;
    }

    const gridCols = layout === 'single' || results.length === 1 ? 1 : 2;

    return (
        <>
            {/* Result Grid */}
            <div className={`grid gap-3 w-full h-full ${gridCols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {results.map((result, index) => {
                    const isPinned = pinnedId === result.id;
                    const isHovered = hoveredId === result.id;

                    return (
                        <div
                            key={result.id}
                            className="relative group rounded-xl overflow-hidden bg-gray-100"
                            style={{ aspectRatio }}
                            onMouseEnter={() => setHoveredId(result.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {/* Image */}
                            <img
                                src={result.url}
                                alt={`Result ${index + 1}`}
                                className="w-full h-full object-cover"
                            />

                            {/* Pinned Badge */}
                            {isPinned && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium flex items-center gap-1">
                                    <Pin size={10} />
                                    Pinned
                                </div>
                            )}

                            {/* Seed Badge */}
                            {result.seed !== undefined && (
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white/80 rounded text-[10px] font-mono">
                                    seed: {result.seed}
                                </div>
                            )}

                            {/* Action Overlay */}
                            <div className={`
                                absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
                                flex items-end justify-center pb-3 gap-2
                                transition-opacity duration-200
                                ${isHovered ? 'opacity-100' : 'opacity-0'}
                            `}>
                                {/* Preview */}
                                <button
                                    onClick={() => handlePreview(index)}
                                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                    title="Preview"
                                >
                                    <Eye size={14} />
                                </button>

                                {/* Download */}
                                <button
                                    onClick={() => handleDownload(result)}
                                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                    title="Download"
                                >
                                    <Download size={14} />
                                </button>

                                {/* Pin */}
                                <button
                                    onClick={() => handlePin(result)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${isPinned
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white/90 hover:bg-white text-gray-700'
                                        }`}
                                    title={isPinned ? 'Unpin' : 'Pin as Output'}
                                >
                                    {isPinned ? <Check size={14} /> : <Pin size={14} />}
                                </button>

                                {/* Replace */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowReplaceMenu(showReplaceMenu === result.id ? null : result.id)}
                                        className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                        title="Replace"
                                    >
                                        <Copy size={14} />
                                    </button>

                                    {/* Replace Menu */}
                                    {showReplaceMenu === result.id && (
                                        <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                                            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                                Copy to Image Card
                                            </div>
                                            {imageCardTargets.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-gray-400">
                                                    No available targets
                                                </div>
                                            ) : (
                                                imageCardTargets.map(target => (
                                                    <button
                                                        key={target.id}
                                                        onClick={() => handleReplace(result, target.id)}
                                                        className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <ArrowRight size={12} />
                                                        {target.data.skillName || 'Image Card'}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Reset Button (outside grid) */}
            {results.length > 0 && (
                <button
                    onClick={handleReset}
                    className="mt-3 w-full py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                    <RotateCcw size={12} />
                    Clear Results
                </button>
            )}

            {/* Lightbox */}
            {showLightbox && results[lightboxIndex] && (
                <div
                    className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center"
                    onClick={() => setShowLightbox(false)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>

                    {/* Navigation - Previous */}
                    {results.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}
                            className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={results[lightboxIndex].url}
                        alt={`Preview ${lightboxIndex + 1}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation - Next */}
                    {results.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}
                            className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    {/* Counter */}
                    {results.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
                            {lightboxIndex + 1} / {results.length}
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(results[lightboxIndex]); }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm flex items-center gap-2"
                        >
                            <Download size={14} />
                            Download
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePin(results[lightboxIndex]); }}
                            className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 ${pinnedId === results[lightboxIndex].id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                        >
                            <Pin size={14} />
                            {pinnedId === results[lightboxIndex].id ? 'Pinned' : 'Pin'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default memo(ResultWall);
