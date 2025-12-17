'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { SKILL_TYPES } from '@/store/graphStore';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNode: (skillType: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onAddNode }: CommandPaletteProps) {
    const [search, setSearch] = useState('');

    // Keyboard shortcut handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter skills based on search
    const filteredSkills = Object.entries(SKILL_TYPES).filter(([, info]) =>
        info.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = useCallback((skillType: string) => {
        onAddNode(skillType);
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

                    {/* Skills List */}
                    <div className="max-h-64 overflow-y-auto py-2">
                        {filteredSkills.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[var(--text-tertiary)] text-sm">
                                No matching cards found
                            </div>
                        ) : (
                            filteredSkills.map(([type, info]) => (
                                <button
                                    key={type}
                                    onClick={() => handleSelect(type)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-left"
                                >
                                    <span
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                                        style={{ backgroundColor: `${info.color}20` }}
                                    >
                                        {info.icon}
                                    </span>
                                    <div>
                                        <div className="text-sm font-medium text-[var(--text-primary)]">
                                            {info.name}
                                        </div>
                                        <div className="text-xs text-[var(--text-tertiary)]">
                                            Add {info.name} card to canvas
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-input)]">
                        <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] font-mono">↵</kbd>
                                to select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] font-mono">esc</kbd>
                                to close
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
