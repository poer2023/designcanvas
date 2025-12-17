'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Type, FileText, Upload, Sparkles, LayoutGrid, Scissors, Square } from 'lucide-react';

// v1.7 Node Types for Command Palette
const NODE_TYPES = [
    { type: 'notes', name: 'Text Notes', icon: Type, color: '#64748B', shortcut: 'T' },
    { type: 'brief', name: 'Text Brief', icon: FileText, color: '#3B82F6', shortcut: 'B' },
    { type: 'uploadImage', name: 'Upload Image', icon: Upload, color: '#10B981', shortcut: 'U' },
    { type: 'imageStudio', name: 'Image Studio', icon: Sparkles, color: '#8B5CF6', shortcut: 'I' },
    { type: 'style', name: 'Style Group', icon: LayoutGrid, color: '#8B5CF6', shortcut: '' },
    { type: 'refset', name: 'RefSet Group', icon: LayoutGrid, color: '#10B981', shortcut: '' },
    { type: 'candidates', name: 'Candidates Group', icon: LayoutGrid, color: '#EF4444', shortcut: '' },
    { type: 'elements', name: 'Elements Group', icon: Scissors, color: '#EC4899', shortcut: '' },
    { type: 'blank', name: 'Blank Group', icon: Square, color: '#64748B', shortcut: 'G' },
];

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNode: (skillType: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onAddNode }: CommandPaletteProps) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Filter nodes based on search
    const filteredNodes = NODE_TYPES.filter(node =>
        node.name.toLowerCase().includes(search.toLowerCase())
    );

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredNodes.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredNodes[selectedIndex]) {
                    handleSelect(filteredNodes[selectedIndex].type);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, filteredNodes, selectedIndex]);

    const handleSelect = useCallback((nodeType: string) => {
        onAddNode(nodeType);
        setSearch('');
        onClose();
    }, [onAddNode, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Palette */}
            <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
                <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
                        <Search size={18} className="text-[var(--text-tertiary)]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Add a card..."
                            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none text-sm"
                            autoFocus
                        />
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Nodes List */}
                    <div className="max-h-64 overflow-y-auto py-2">
                        {filteredNodes.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-sm">
                                No matching cards found
                            </div>
                        ) : (
                            filteredNodes.map((node, index) => {
                                const Icon = node.icon;
                                return (
                                    <button
                                        key={node.type}
                                        onClick={() => handleSelect(node.type)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${index === selectedIndex
                                                ? 'bg-[var(--bg-hover)]'
                                                : 'hover:bg-[var(--bg-hover)]'
                                            }`}
                                    >
                                        <span
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${node.color}20` }}
                                        >
                                            <Icon size={16} style={{ color: node.color }} />
                                        </span>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-[var(--text-primary)]">
                                                {node.name}
                                            </div>
                                        </div>
                                        {node.shortcut && (
                                            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-tertiary)] text-xs font-mono">
                                                {node.shortcut}
                                            </kbd>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-input)]">
                        <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] font-mono">↑↓</kbd>
                                navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] font-mono">↵</kbd>
                                select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] font-mono">esc</kbd>
                                close
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

