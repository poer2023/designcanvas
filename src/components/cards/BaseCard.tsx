'use client';

import { useState, ReactNode, MouseEvent, DragEvent } from 'react';
import { MoreHorizontal, Pin, Lock, Loader2 } from 'lucide-react';

export type CardStatus = 'idle' | 'running' | 'success' | 'failed' | 'locked';

interface BaseCardProps {
    // Identity
    id: string;
    title: string;
    icon?: ReactNode;

    // Status
    status?: CardStatus;

    // Contents
    children: ReactNode;

    // Footer actions (shown on hover)
    primaryAction?: {
        label: string;
        onClick: () => void;
        icon?: ReactNode;
    };
    secondaryActions?: Array<{
        label: string;
        onClick: () => void;
        icon?: ReactNode;
    }>;

    // Corner actions
    onPin?: () => void;
    onLock?: () => void;
    isPinned?: boolean;
    isLocked?: boolean;

    // Interactions
    onClick?: () => void;
    onDoubleClick?: () => void;
    onContextMenu?: (e: MouseEvent) => void;

    // Drag and drop
    draggable?: boolean;
    onDragStart?: (e: DragEvent) => void;
    onDragEnd?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;

    // Selection
    selected?: boolean;

    // Sizing
    compact?: boolean;
    className?: string;
}

const statusColors: Record<CardStatus, { bg: string; text: string; dot: string }> = {
    idle: { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
    running: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' },
    success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
    locked: { bg: 'bg-violet-500/20', text: 'text-violet-400', dot: 'bg-violet-400' },
};

export default function BaseCard({
    id,
    title,
    icon,
    status = 'idle',
    children,
    primaryAction,
    secondaryActions,
    onPin,
    onLock,
    isPinned = false,
    isLocked = false,
    onClick,
    onDoubleClick,
    onContextMenu,
    draggable = false,
    onDragStart,
    onDragEnd,
    onDrop,
    onDragOver,
    selected = false,
    compact = false,
    className = '',
}: BaseCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const statusStyle = statusColors[status];

    const handleClick = (e: MouseEvent) => {
        if (onClick) {
            e.stopPropagation();
            onClick();
        }
    };

    const handleDoubleClick = (e: MouseEvent) => {
        if (onDoubleClick) {
            e.stopPropagation();
            onDoubleClick();
        }
    };

    return (
        <div
            className={`
                group relative rounded-xl overflow-hidden
                bg-[var(--bg-card)] border
                ${selected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}
                transition-all duration-200
                ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                ${compact ? 'p-2' : ''}
                ${className}
            `}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            data-card-id={id}
        >
            {/* Header */}
            <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'px-3 py-2.5 border-b border-[var(--border-subtle)]'}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {icon && (
                        <div className="shrink-0 text-[var(--text-tertiary)]">
                            {icon}
                        </div>
                    )}
                    <h4 className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {title}
                    </h4>
                    {/* Status Pill */}
                    {status !== 'idle' && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1 ${statusStyle.bg} ${statusStyle.text}`}>
                            {status === 'running' && <Loader2 size={8} className="animate-spin" />}
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {status}
                        </span>
                    )}
                </div>

                {/* Corner Actions */}
                <div className={`flex items-center gap-0.5 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                    {onPin && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPin(); }}
                            className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${isPinned ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}
                            title={isPinned ? 'Unpin' : 'Pin'}
                        >
                            <Pin size={12} />
                        </button>
                    )}
                    {onLock && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLock(); }}
                            className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${isLocked ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}`}
                            title={isLocked ? 'Unlock' : 'Lock'}
                        >
                            <Lock size={12} />
                        </button>
                    )}
                    {secondaryActions && secondaryActions.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
                            >
                                <MoreHorizontal size={12} />
                            </button>
                            {showMenu && (
                                <div
                                    className="absolute right-0 top-full mt-1 w-36 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 z-50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {secondaryActions.map((action, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { action.onClick(); setShowMenu(false); }}
                                            className="w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"
                                        >
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className={compact ? '' : 'p-3'}>
                {children}
            </div>

            {/* Footer (Hover Actions) */}
            {primaryAction && (
                <div
                    className={`
                        ${compact ? 'pt-2' : 'px-3 py-2 border-t border-[var(--border-subtle)]'}
                        ${isHovered ? 'opacity-100' : 'opacity-0'}
                        transition-opacity
                    `}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); primaryAction.onClick(); }}
                        className="
                            w-full py-1.5 rounded-lg text-xs font-medium
                            bg-[var(--accent-primary)] text-white
                            hover:bg-[var(--accent-hover)]
                            flex items-center justify-center gap-1.5
                            transition-colors
                        "
                    >
                        {primaryAction.icon}
                        {primaryAction.label}
                    </button>
                </div>
            )}
        </div>
    );
}

// Utility components for card content
export function CardChips({ items }: { items: Array<{ label: string; value?: string; color?: string }> }) {
    return (
        <div className="flex flex-wrap gap-1">
            {items.map((item, i) => (
                <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${item.color || 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'}`}
                >
                    {item.label}{item.value && `: ${item.value}`}
                </span>
            ))}
        </div>
    );
}

export function CardThumbnail({ src, alt, aspectRatio = '16/10' }: { src?: string; alt?: string; aspectRatio?: string }) {
    return (
        <div
            className="rounded-lg overflow-hidden bg-[var(--bg-hover)]"
            style={{ aspectRatio }}
        >
            {src ? (
                <img src={src} alt={alt || ''} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)]">
                    No Preview
                </div>
            )}
        </div>
    );
}

export function CardGrid({
    children,
    columns = 2
}: {
    children: ReactNode;
    columns?: 2 | 3 | 4;
}) {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
    };
    return (
        <div className={`grid ${gridCols[columns]} gap-1`}>
            {children}
        </div>
    );
}

export function CardInfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex justify-between text-[10px]">
            <span className="text-[var(--text-tertiary)]">{label}</span>
            <span className="text-[var(--text-secondary)]">{value}</span>
        </div>
    );
}
