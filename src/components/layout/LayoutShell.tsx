'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Full-screen routes without sidebar
    const isFullScreen = pathname.startsWith('/projects/');

    if (isFullScreen) {
        // Full-screen mode: no sidebar, no padding
        return <>{children}</>;
    }

    // Normal mode: with sidebar and padding
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-[var(--bg-app)]">
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
