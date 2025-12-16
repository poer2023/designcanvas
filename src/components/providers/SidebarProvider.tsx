'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggle: () => void;
    expand: () => void;
    collapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Persist state to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved !== null) {
            setIsCollapsed(saved === 'true');
        }
    }, []);

    const toggle = useCallback(() => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    }, []);

    const expand = useCallback(() => {
        setIsCollapsed(false);
        localStorage.setItem('sidebar_collapsed', 'false');
    }, []);

    const collapse = useCallback(() => {
        setIsCollapsed(true);
        localStorage.setItem('sidebar_collapsed', 'true');
    }, []);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggle, expand, collapse }}>
            {children}
        </SidebarContext.Provider>
    );
}
