'use client';

import { useState, type DragEvent } from 'react';
import {
    Palette,
    ImageIcon,
    Shapes,
    Album,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    Plus
} from 'lucide-react';
import type { StyleProfile, RefSet, Element } from '@/types';
import type { Poster } from '@/types/poster';

type AssetTab = 'styles' | 'inspiration' | 'elements' | 'images';

interface AssetsDrawerProps {
    isOpen: boolean;
    onToggle: () => void;
    styles?: StyleProfile[];
    refsets?: RefSet[];
    elements?: Element[];
    images?: Poster[];
    onDragStart?: (type: AssetTab, item: StyleProfile | RefSet | Element | Poster) => void;
}

export default function AssetsDrawer({
    isOpen,
    onToggle,
    styles = [],
    refsets = [],
    elements = [],
    images = [],
    onDragStart,
}: AssetsDrawerProps) {
    const [activeTab, setActiveTab] = useState<AssetTab>('images');

    const tabs = [
        { id: 'styles' as const, label: 'Styles', icon: Palette, count: styles.length },
        { id: 'inspiration' as const, label: 'Inspiration', icon: ImageIcon, count: refsets.length },
        { id: 'elements' as const, label: 'Elements', icon: Shapes, count: elements.length },
        { id: 'images' as const, label: 'Images', icon: Album, count: images.length },
    ];

    return (
        <>
            {/* Drawer */}
            <div
                className={`
                    absolute left-0 top-0 bottom-0 z-30
                    bg-[var(--bg-panel)]/95 backdrop-blur-xl
                    border-r border-[var(--border-subtle)]
                    transition-all duration-300 ease-out
                    ${isOpen ? 'w-72' : 'w-0'}
                    overflow-hidden
                `}
            >
                <div className="w-72 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">Assets</h3>
                        <button
                            onClick={onToggle}
                            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-[var(--border-subtle)]">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5
                                    transition-colors border-b-2 -mb-px
                                    ${activeTab === tab.id
                                        ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                                        : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}
                                `}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-hover)]">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {activeTab === 'styles' && (
                            <StylesPanel styles={styles} onDragStart={(item) => onDragStart?.('styles', item)} />
                        )}
                        {activeTab === 'inspiration' && (
                            <InspirationPanel refsets={refsets} onDragStart={(item) => onDragStart?.('inspiration', item)} />
                        )}
                        {activeTab === 'elements' && (
                            <ElementsPanel elements={elements} onDragStart={(item) => onDragStart?.('elements', item)} />
                        )}
                        {activeTab === 'images' && (
                            <ImagesPanel images={images} onDragStart={(item) => onDragStart?.('images', item)} />
                        )}
                    </div>
                </div>
            </div>

            {/* Toggle button when closed */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="
                        absolute left-3 top-3 z-20
                        p-2 rounded-lg
                        bg-[var(--bg-panel)]/90 backdrop-blur-sm
                        border border-[var(--border-subtle)]
                        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                        hover:bg-[var(--bg-hover)]
                        transition-all shadow-lg
                    "
                    title="Open Assets"
                >
                    <ChevronRight size={16} />
                </button>
            )}
        </>
    );
}

// Styles Panel
function StylesPanel({
    styles,
    onDragStart
}: {
    styles: StyleProfile[];
    onDragStart?: (item: StyleProfile) => void;
}) {
    if (styles.length === 0) {
        return (
            <EmptyState
                icon={Palette}
                title="No styles yet"
                description="Create a style profile to get started"
            />
        );
    }

    return (
        <div className="space-y-2">
            {styles.map((style) => (
                <StyleCard key={style.id} style={style} onDragStart={() => onDragStart?.(style)} />
            ))}
        </div>
    );
}

function StyleCard({
    style,
    onDragStart
}: {
    style: StyleProfile;
    onDragStart?: () => void;
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="
                group relative p-3 rounded-lg cursor-grab
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--accent-primary)]/50 hover:shadow-md
                transition-all
            "
        >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 text-[var(--text-tertiary)]">
                <GripVertical size={12} />
            </div>
            <div className="flex gap-3">
                {/* Preview */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                    {style.images?.[0] ? (
                        <img src={style.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                        <Palette size={16} className="text-white/60" />
                    )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {style.name}
                    </h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] line-clamp-1 mt-0.5">
                        {style.summary_s}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                            v{style.version}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Inspiration Panel
function InspirationPanel({
    refsets,
    onDragStart
}: {
    refsets: RefSet[];
    onDragStart?: (item: RefSet) => void;
}) {
    if (refsets.length === 0) {
        return (
            <EmptyState
                icon={ImageIcon}
                title="No inspiration"
                description="Import reference images to build your collection"
            />
        );
    }

    return (
        <div className="space-y-2">
            {refsets.map((refset) => (
                <RefSetCard key={refset.id} refset={refset} onDragStart={() => onDragStart?.(refset)} />
            ))}
        </div>
    );
}

function RefSetCard({
    refset,
    onDragStart
}: {
    refset: RefSet;
    onDragStart?: () => void;
}) {
    const previewItems = (refset.items ?? []).slice(0, 4);
    const itemCount = refset.items?.length ?? refset.item_count ?? 0;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="
                group relative p-3 rounded-lg cursor-grab
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--accent-primary)]/50 hover:shadow-md
                transition-all
            "
        >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 text-[var(--text-tertiary)]">
                <GripVertical size={12} />
            </div>
            <div className="flex gap-3">
                {/* 2x2 preview grid */}
                <div className="w-12 h-12 rounded-lg overflow-hidden grid grid-cols-2 gap-px bg-[var(--border-subtle)] shrink-0">
	                    {[0, 1, 2, 3].map((i) => (
	                        <div key={i} className="bg-[var(--bg-hover)]">
	                            {(() => {
	                                const url =
	                                    previewItems[i]?.image_url ??
	                                    previewItems[i]?.thumbnail_path ??
	                                    previewItems[i]?.image_path;
	                                return url ? (
	                                    <img
	                                        src={url}
	                                        alt=""
	                                        className="w-full h-full object-cover"
	                                    />
	                                ) : null;
	                            })()}
	                        </div>
	                    ))}
	                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {refset.name}
                    </h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                        {itemCount} items
                    </p>
                </div>
            </div>
        </div>
    );
}

// Elements Panel
function ElementsPanel({
    elements,
    onDragStart
}: {
    elements: Element[];
    onDragStart?: (item: Element) => void;
}) {
    if (elements.length === 0) {
        return (
            <EmptyState
                icon={Shapes}
                title="No elements"
                description="Extract elements from generated posters"
            />
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            {elements.map((element) => (
                <ElementCard key={element.id} element={element} onDragStart={() => onDragStart?.(element)} />
            ))}
        </div>
    );
}

// Images Panel (Gallery assets)
function ImagesPanel({
    images,
    onDragStart
}: {
    images: Poster[];
    onDragStart?: (item: Poster) => void;
}) {
    if (images.length === 0) {
        return (
            <EmptyState
                icon={Album}
                title="No images yet"
                description="Save a result to Assets, then drag it into the canvas"
            />
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            {images.map((poster) => (
                <ImageAssetCard
                    key={poster.id}
                    poster={poster}
                    onDragStart={(e) => {
                        // Drag into canvas => create Media node and seed it with imageUrl
                        e.dataTransfer.setData('application/skilltype', 'media');
                        e.dataTransfer.setData('application/skilldata', JSON.stringify({
                            imageUrl: poster.image_url,
                            skillName: 'Media',
                        }));
                        onDragStart?.(poster);
                    }}
                />
            ))}
        </div>
    );
}

function ImageAssetCard({
    poster,
    onDragStart
}: {
    poster: Poster;
    onDragStart: (e: DragEvent<HTMLDivElement>) => void;
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="
                group relative rounded-lg overflow-hidden cursor-grab
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--accent-primary)]/50 hover:shadow-md
                transition-all
            "
        >
            <div className="absolute left-1 top-1 opacity-0 group-hover:opacity-60 text-white drop-shadow">
                <GripVertical size={12} />
            </div>
            <div className="relative aspect-[4/3] bg-[var(--bg-hover)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster.image_url} alt="" className="w-full h-full object-cover" />
            </div>
        </div>
    );
}

function ElementCard({
    element,
    onDragStart
}: {
    element: Element;
    onDragStart?: () => void;
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="
                group relative aspect-square rounded-lg overflow-hidden cursor-grab
                bg-[var(--bg-card)] border border-[var(--border-subtle)]
                hover:border-[var(--accent-primary)]/50 hover:shadow-md
                transition-all
            "
        >
            {element.image_url ? (
                <img
                    src={element.image_url}
                    alt={element.semantic_tag || ''}
                    className="w-full h-full object-contain bg-[var(--bg-hover)]"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-hover)]">
                    <Shapes size={16} className="text-[var(--text-tertiary)]" />
                </div>
            )}
            {/* Tag overlay */}
            {element.semantic_tag && (
                <div className="absolute bottom-1 left-1 right-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-black/60 text-white truncate block">
                        {element.semantic_tag}
                    </span>
                </div>
            )}
            {/* Usage count */}
            {element.used_count > 0 && (
                <div className="absolute top-1 right-1">
                    <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--accent-primary)] text-white">
                        ×{element.used_count}
                    </span>
                </div>
            )}
        </div>
    );
}

// Empty State
function EmptyState({
    icon: Icon,
    title,
    description
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-3">
                <Icon size={18} />
            </div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</h4>
            <p className="text-xs text-[var(--text-tertiary)] max-w-[180px]">{description}</p>
            <button className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors">
                <Plus size={14} />
                Add
            </button>
        </div>
    );
}
