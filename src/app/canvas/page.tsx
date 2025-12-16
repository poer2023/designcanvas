'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ComposeCanvas from '@/components/compose/ComposeCanvas';
import type { Element } from '@/types/element';
import type { ExportOptions } from '@/types/compose';

export default function CanvasPage() {
    const [elements, setElements] = useState<Element[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchElements();
    }, []);

    async function fetchElements() {
        try {
            const response = await fetch('/api/elements');
            const data = await response.json();
            if (data.success) {
                setElements(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch elements:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleExport(options: ExportOptions) {
        setExporting(true);

        // Mock export - in real implementation would render canvas and download
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Create mock download
        const filename = `poster-${Date.now()}.${options.format}`;
        alert(`Export complete: ${filename}\n\nOptions:\n- Format: ${options.format}\n- Include assets: ${options.include_assets}\n- Include recipe: ${options.include_recipe}`);

        setExporting(false);
    }

    async function handleHarmonize() {
        // Mock harmonize - would call AI to unify styles
        alert('Harmonize: This would send the composition to AI for style unification.');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="animate-spin text-tertiary" size={32} />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-72px)] -m-6">
            <ComposeCanvas
                availableElements={elements}
                onExport={handleExport}
                onHarmonize={handleHarmonize}
            />

            {exporting && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-panel rounded-xl p-6 flex items-center gap-3">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Exporting...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
