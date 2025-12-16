'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
