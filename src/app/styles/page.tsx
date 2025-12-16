'use client';

import { useState, useEffect } from 'react';
import type { StyleProfile } from '@/types';
import { Plus, Palette } from 'lucide-react';

export default function StylesPage() {
    const [styles, setStyles] = useState<StyleProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStyles();
    }, []);

    async function fetchStyles() {
        try {
            const response = await fetch('/api/styles');
            const data = await response.json();
            if (data.success) {
                setStyles(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch styles:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="heading-xl mb-1">Style Profiles</h1>
                    <p className="text-secondary">Manage your design aesthetics and constraints</p>
                </div>
                <button className="btn btn-primary h-10 px-4">
                    <Plus size={18} />
                    <span>New Profile</span>
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
                </div>
            ) : styles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-subtle rounded-xl bg-card/50">
                    <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center text-tertiary mb-4">
                        <Palette size={32} />
                    </div>
                    <h3 className="heading-md mb-2">No style profiles</h3>
                    <p className="text-secondary max-w-sm mb-6">
                        Upload portfolios to let AI analyze and generate style profiles for you.
                    </p>
                    <button className="btn btn-primary">Create Profile</button>
                </div>
            ) : (
                <div className="grid-responsive">
                    {styles.map((style) => (
                        <div key={style.id} className="card group hover:shadow-lg">
                            <div className="h-[120px] bg-bg-hover rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                                {style.palette_hint && style.palette_hint.length > 0 ? (
                                    <div className="flex gap-1">
                                        {style.palette_hint.slice(0, 5).map((color, i) => (
                                            <div
                                                key={i}
                                                className="w-8 h-8 rounded-full shadow-sm ring-2 ring-white dark:ring-white/10"
                                                style={{ background: color }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <Palette size={32} className="text-tertiary opacity-50" />
                                )}
                            </div>

                            <h3 className="heading-sm mb-1 group-hover:text-blue-500 transition-colors">
                                {style.name}
                            </h3>
                            <p className="text-sm text-secondary mb-3 line-clamp-2">
                                {style.summary_s}
                            </p>

                            <div className="flex items-center justify-between border-t border-subtle pt-3">
                                <span className="badge badge-blue">v{style.version}</span>
                                <span className="text-xs text-tertiary">
                                    {style.images.length} refs
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
