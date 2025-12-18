/**
 * PRD v2.0: Auto-save hook for graph persistence
 * 
 * Provides debounced auto-save functionality for the graph canvas.
 * Watches for dirty state and saves automatically after a delay.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '@/store/graphStore';

const DEBOUNCE_DELAY = 800; // ms

interface UseAutoSaveOptions {
    enabled?: boolean;
    debounceMs?: number;
    onSaveStart?: () => void;
    onSaveComplete?: (success: boolean) => void;
    onConflict?: (serverVersion: number) => void;
}

export function useAutoSave(options: UseAutoSaveOptions = {}) {
    const {
        enabled = true,
        debounceMs = DEBOUNCE_DELAY,
        onSaveStart,
        onSaveComplete,
        onConflict,
    } = options;

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef(false);

    const isDirty = useGraphStore(state => state.isDirty);
    const saveStatus = useGraphStore(state => state.saveStatus);
    const projectId = useGraphStore(state => state.projectId);
    const saveToServer = useGraphStore(state => state.saveToServer);

    // Handle save
    const doSave = useCallback(async () => {
        if (isSavingRef.current || !projectId) return;

        isSavingRef.current = true;
        onSaveStart?.();

        const success = await saveToServer();

        isSavingRef.current = false;
        onSaveComplete?.(success);

        if (!success && saveStatus === 'conflict') {
            // Get server version from the last error (would need to be stored in state)
            // For now, just trigger the callback
            onConflict?.(0);
        }
    }, [projectId, saveToServer, saveStatus, onSaveStart, onSaveComplete, onConflict]);

    // Watch for dirty state and debounce save
    useEffect(() => {
        if (!enabled || !isDirty || !projectId) return;

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new debounced save
        timeoutRef.current = setTimeout(() => {
            doSave();
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, isDirty, projectId, debounceMs, doSave]);

    // Manual save function
    const saveNow = useCallback(async (force = false) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        return saveToServer(force);
    }, [saveToServer]);

    // Force save (override conflicts)
    const forceSave = useCallback(async () => {
        return saveNow(true);
    }, [saveNow]);

    return {
        saveStatus,
        isDirty,
        saveNow,
        forceSave,
        isSaving: saveStatus === 'saving',
        hasConflict: saveStatus === 'conflict',
    };
}

/**
 * Hook to load graph on mount
 */
export function useLoadGraph(projectId: string | undefined) {
    const loadFromServer = useGraphStore(state => state.loadFromServer);
    const setProjectId = useGraphStore(state => state.setProjectId);
    const resetGraph = useGraphStore(state => state.resetGraph);

    useEffect(() => {
        if (!projectId) {
            resetGraph();
            setProjectId(null);
            return;
        }

        setProjectId(projectId);
        loadFromServer(projectId);

        return () => {
            // Cleanup: could save before unmount if needed
        };
    }, [projectId, loadFromServer, setProjectId, resetGraph]);
}

/**
 * Hook to sync viewport changes
 */
export function useSyncViewport() {
    const setViewport = useGraphStore(state => state.setViewport);

    const handleViewportChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
        setViewport(viewport);
    }, [setViewport]);

    return { onViewportChange: handleViewportChange };
}
