'use client';

import { useEffect } from 'react';
import { useGraphStore } from '@/store/graphStore';

/**
 * PRD v2.1: Global keyboard shortcuts for canvas operations
 * 
 * Shortcuts:
 * - Cmd/Ctrl + Z: Undo
 * - Cmd/Ctrl + Shift + Z: Redo
 * - Delete/Backspace: Delete selected node
 */
export function KeyboardShortcuts() {
    const undo = useGraphStore(state => state.undo);
    const redo = useGraphStore(state => state.redo);
    const selectedNodeId = useGraphStore(state => state.selectedNodeId);
    const removeNode = useGraphStore(state => state.removeNode);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Skip if user is typing in an input/textarea
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            const isMeta = event.metaKey || event.ctrlKey;

            // Undo: Cmd/Ctrl + Z (without Shift)
            if (isMeta && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
                return;
            }

            // Redo: Cmd/Ctrl + Shift + Z
            if (isMeta && event.key === 'z' && event.shiftKey) {
                event.preventDefault();
                redo();
                return;
            }

            // Alternative Redo: Cmd/Ctrl + Y (Windows convention)
            if (isMeta && event.key === 'y') {
                event.preventDefault();
                redo();
                return;
            }

            // Delete selected node
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
                event.preventDefault();
                removeNode(selectedNodeId);
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, selectedNodeId, removeNode]);

    // This component doesn't render anything
    return null;
}

export default KeyboardShortcuts;
