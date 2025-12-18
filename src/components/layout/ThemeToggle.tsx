'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(_onStoreChange: () => void) {
    return () => { };
}

function getSnapshot() {
    return true;
}

function getServerSnapshot() {
    return false;
}

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!mounted) {
        return <div className="w-[32px] h-[32px]" />; // Placeholder
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn btn-ghost btn-icon"
            title={`Current theme: ${theme}`}
        >
            {theme === 'dark' ? (
                <Moon size={16} />
            ) : (
                <Sun size={16} />
            )}
        </button>
    );
}
