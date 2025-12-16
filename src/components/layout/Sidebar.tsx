'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    Palette,
    Lightbulb,
    Puzzle,
    Album,
    Zap,
    Settings,
    PenTool
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

const navItems = [
    {
        section: 'Workspace',
        items: [
            { name: 'Projects', href: '/', icon: LayoutGrid },
            { name: 'Canvas', href: '/canvas', icon: PenTool },
        ],
    },
    {
        section: 'Assets',
        items: [
            { name: 'Styles', href: '/styles', icon: Palette },
            { name: 'Inspiration', href: '/inspiration', icon: Lightbulb },
            { name: 'Elements', href: '/elements', icon: Puzzle },
            { name: 'Gallery', href: '/gallery', icon: Album },
        ],
    },
    {
        section: 'System',
        items: [
            { name: 'Skills', href: '/skills', icon: Zap },
            { name: 'Settings', href: '/settings', icon: Settings },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="app-sidebar">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 pl-6 border-b border-subtle mb-2 h-[72px]">
                <div className="relative group">
                    <Logo size={32} />
                    <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg tracking-tight leading-none text-primary">PosterLab</span>
                    <span className="text-[10px] uppercase tracking-widest text-secondary font-semibold mt-1">Design Studio</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                {navItems.map((section) => (
                    <div key={section.section}>
                        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-secondary opacity-80">
                            {section.section}
                        </div>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all group
                      ${isActive
                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                : 'text-secondary hover:bg-hover hover:text-primary'}
                    `}
                                    >
                                        <Icon
                                            size={18}
                                            className={`
                        transition-colors opacity-80
                        ${isActive ? 'text-blue-500' : 'group-hover:text-primary'}
                      `}
                                        />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-tertiary">
                        H
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-primary">Hao</span>
                        <span className="text-[10px] text-tertiary">Pro Plan</span>
                    </div>
                </div>
                <ThemeToggle />
            </div>
        </aside>
    );
}
