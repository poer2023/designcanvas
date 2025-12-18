'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggle: () => void;
    expand: () => void;
    collapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'sidebar_collapsed';
const SIDEBAR_EVENT = 'sidebar_collapsed_change';

function readCollapsedFromStorage(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
    return false;
}

function subscribe(onStoreChange: () => void) {
    if (typeof window === 'undefined') return () => { };

    const handler = () => onStoreChange();
    window.addEventListener('storage', handler);
    window.addEventListener(SIDEBAR_EVENT, handler);
    return () => {
        window.removeEventListener('storage', handler);
        window.removeEventListener(SIDEBAR_EVENT, handler);
    };
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const isCollapsed = useSyncExternalStore(subscribe, readCollapsedFromStorage, getServerSnapshot);

    const setCollapsed = useCallback((next: boolean) => {
        localStorage.setItem(STORAGE_KEY, String(next));
        window.dispatchEvent(new Event(SIDEBAR_EVENT));
    }, []);

    const toggle = useCallback(() => {
        setCollapsed(!isCollapsed);
    }, [isCollapsed, setCollapsed]);

    const expand = useCallback(() => {
        setCollapsed(false);
    }, [setCollapsed]);

    const collapse = useCallback(() => {
        setCollapsed(true);
    }, [setCollapsed]);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggle, expand, collapse }}>
            {children}
        </SidebarContext.Provider>
    );
}
