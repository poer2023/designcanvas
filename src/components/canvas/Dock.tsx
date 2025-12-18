'use client';

import { useState } from 'react';
import {
    Type,
    FileText,
    Image as ImageIcon,
    LayoutGrid,
    Search,
    Undo2,
    Redo2,
    ChevronUp,
    ChevronDown,
    MousePointer2,
    Hand,
    Scissors,
    PlayCircle,
} from 'lucide-react';
import type { InteractionMode } from '@/components/graph/SkillGraphCanvas';
import type { GroupType } from '@/components/cards/GroupFrame';

/**
 * PRD v1.8: Dock 工具栏
 * - 移除 Upload 按钮（图片通过 paste/drop 直接输入）
 * - Text（Notes/Brief）
 * - Image（创建 Image Studio 空卡）
 * - Group（Portfolio/RefSet/Run Group/Elements/Blank）
 * - Search
 */

interface DockProps {
    onAddText: (role: 'notes' | 'brief') => void;
    onAddImageStudio: () => void;
    onAddGroup: (type: GroupType) => void;
    onSearch: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;

    // Interaction
    interactionMode: InteractionMode;
    onInteractionModeChange: (mode: InteractionMode) => void;
}

// PRD v1.8: Updated group types
const GROUP_TYPES: { type: GroupType; label: string; color: string; icon?: typeof LayoutGrid }[] = [
    { type: 'style', label: 'Portfolio', color: '#8B5CF6' },        // Style Extract = Portfolio
    { type: 'refset', label: 'RefSet', color: '#10B981' },
    { type: 'runGroup', label: 'Run Group', color: '#3B82F6', icon: PlayCircle },
    { type: 'elements', label: 'Elements', color: '#EC4899' },
    { type: 'blank', label: 'Blank', color: '#64748B' },
];

export default function Dock({
    onAddText,
    onAddImageStudio,
    onAddGroup,
    onSearch,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    interactionMode,
    onInteractionModeChange,
}: DockProps) {
    const [showTextMenu, setShowTextMenu] = useState(false);
    const [showGroupMenu, setShowGroupMenu] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    if (collapsed) {
        return (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <button
                    onClick={() => setCollapsed(false)}
                    className="p-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-full shadow-2xl hover:bg-[var(--bg-hover)] transition-colors"
                >
                    <ChevronUp size={20} className="text-[var(--text-secondary)]" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            {/* Text Menu Popup */}
            {showTextMenu && (
                <div className="absolute bottom-full mb-2 left-20 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-1 min-w-[120px]">
                    <button
                        onClick={() => { onAddText('notes'); setShowTextMenu(false); }}
                        className="w-full px-3 py-2 text-left text-xs rounded-lg hover:bg-[var(--bg-hover)] flex items-center gap-2"
                    >
                        <Type size={14} className="text-gray-500" />
                        Notes
                    </button>
                    <button
                        onClick={() => { onAddText('brief'); setShowTextMenu(false); }}
                        className="w-full px-3 py-2 text-left text-xs rounded-lg hover:bg-[var(--bg-hover)] flex items-center gap-2"
                    >
                        <FileText size={14} className="text-blue-500" />
                        Brief
                    </button>
                </div>
            )}

            {/* Group Menu Popup */}
            {showGroupMenu && (
                <div className="absolute bottom-full mb-2 right-20 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-2 flex gap-1 animate-in fade-in slide-in-from-bottom-2">
                    {GROUP_TYPES.map(({ type, label, color }) => (
                        <button
                            key={type}
                            onClick={() => { onAddGroup(type); setShowGroupMenu(false); }}
                            className="px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Dock */}
            <div className="flex items-center gap-1 bg-[var(--bg-panel)]/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl p-1.5 shadow-2xl">

                {/* Interaction Modes */}
                <div className="flex items-center bg-gray-100/50 rounded-xl p-0.5 border border-gray-200/50">
                    <button
                        onClick={() => onInteractionModeChange('select')}
                        className={`p-2 rounded-lg transition-all ${interactionMode === 'select'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                        title="Select (V)"
                    >
                        <MousePointer2 size={18} />
                    </button>
                    <button
                        onClick={() => onInteractionModeChange('hand')}
                        className={`p-2 rounded-lg transition-all ${interactionMode === 'hand'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                        title="Hand Tool (H)"
                    >
                        <Hand size={18} />
                    </button>
                    <button
                        onClick={() => onInteractionModeChange('scissors')}
                        className={`p-2 rounded-lg transition-all ${interactionMode === 'scissors'
                            ? 'bg-white text-red-500 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                        title="Cut Connection (X)"
                    >
                        <Scissors size={18} />
                    </button>
                </div>

                <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />

                {/* Text Dropdown */}
                <button
                    onClick={() => { setShowTextMenu(!showTextMenu); setShowGroupMenu(false); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${showTextMenu
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                    title="Add Text (T=Notes, B=Brief)"
                >
                    <Type size={18} />
                    <span>Text</span>
                    <ChevronDown size={12} />
                </button>

                {/* Image (Studio) - PRD v1.8: Single button for Image Studio */}
                <button
                    onClick={onAddImageStudio}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                    title="Add Image Studio (I)"
                >
                    <ImageIcon size={18} />
                    <span>Image</span>
                </button>

                <div className="w-px h-6 bg-[var(--border-subtle)]" />

                {/* Group Dropdown */}
                <button
                    onClick={() => { setShowGroupMenu(!showGroupMenu); setShowTextMenu(false); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${showGroupMenu || interactionMode === 'draw_group'
                        ? 'bg-purple-500/20 text-purple-500'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                    title="Draw Group (G)"
                >
                    <LayoutGrid size={18} />
                    <span>Group</span>
                    <ChevronDown size={12} />
                </button>

                <div className="w-px h-6 bg-[var(--border-subtle)]" />

                {/* Search */}
                <button
                    onClick={onSearch}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                    title="Search (⌘K)"
                >
                    <Search size={18} />
                </button>

                {/* Undo/Redo */}
                {(onUndo || onRedo) && (
                    <>
                        <div className="w-px h-6 bg-[var(--border-subtle)]" />
                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className="p-2.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className="p-2.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 transition-colors"
                        >
                            <Redo2 size={16} />
                        </button>
                    </>
                )}

                {/* Collapse */}
                <button
                    onClick={() => setCollapsed(true)}
                    className="p-2.5 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors ml-1"
                >
                    <ChevronDown size={16} />
                </button>
            </div>
        </div>
    );
}
