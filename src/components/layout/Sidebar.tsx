'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    Palette,
    Lightbulb,
    Album,
    Settings,
    PanelLeftClose,
    PanelLeft
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import { useSidebar } from '@/components/providers/SidebarProvider';

const navItems = [
    {
        section: 'Workspace',
        items: [
            { name: 'Projects', href: '/', icon: LayoutGrid },
        ],
    },
    {
        section: 'Assets',
        items: [
            { name: 'Styles', href: '/styles', icon: Palette },
            { name: 'Inspiration', href: '/inspiration', icon: Lightbulb },
            { name: 'Gallery', href: '/gallery', icon: Album },
        ],
    },
    {
        section: 'System',
        items: [
            { name: 'Settings', href: '/settings', icon: Settings },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggle } = useSidebar();

    return (
        <aside
            className={`
                bg-[var(--bg-panel)] border-r border-[var(--border-subtle)]
                flex flex-col flex-shrink-0 z-20 h-screen
                transition-all duration-300 ease-out
                ${isCollapsed ? 'w-[68px]' : 'w-[240px]'}
            `}
        >
            {/* Header */}
            <div className={`
                flex items-center h-14 border-b border-[var(--border-subtle)]
                ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'}
            `}>
                <div className="relative group">
                    <Logo size={28} />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-sm tracking-tight leading-none text-[var(--text-primary)]">
                            PosterLab
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                {navItems.map((section) => (
                    <div key={section.section} className="mb-6">
                        {!isCollapsed && (
                            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                                {section.section}
                            </div>
                        )}
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={isCollapsed ? item.name : undefined}
                                        className={`
                                            flex items-center rounded-lg transition-all duration-150 group
                                            ${isCollapsed
                                                ? 'justify-center w-11 h-11 mx-auto'
                                                : 'gap-3 px-3 py-2'}
                                            ${isActive
                                                ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}
                                        `}
                                    >
                                        <Icon
                                            size={18}
                                            className={`shrink-0 ${isActive ? 'text-[var(--accent-primary)]' : ''}`}
                                        />
                                        {!isCollapsed && (
                                            <span className="text-[13px] font-medium truncate">{item.name}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className={`
                border-t border-[var(--border-subtle)] p-3
                flex items-center 
                ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}
            `}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            H
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate">Hao</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">Pro</span>
                        </div>
                    </div>
                )}

                <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-1'}`}>
                    <ThemeToggle />
                    <button
                        onClick={toggle}
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
