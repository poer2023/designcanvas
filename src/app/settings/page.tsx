'use client';

import { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon, Database, Trash2, HardDrive,
    Key, Palette, Download, RefreshCw, AlertCircle, Check
} from 'lucide-react';

interface CacheStats {
    projects: number;
    posters: number;
    elements: number;
    recipes: number;
    refsets: number;
    total_size_mb: number;
}

export default function SettingsPage() {
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [settings, setSettings] = useState({
        default_width: 1080,
        default_height: 1920,
        default_batch_size: 12,
        default_quality: 'standard',
        auto_save: true,
        grid_size: 20,
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchCacheStats();
        loadSettings();
    }, []);

    async function fetchCacheStats() {
        try {
            // Fetch counts from various APIs
            const [postersRes, elementsRes, recipesRes, refsetsRes] = await Promise.all([
                fetch('/api/posters'),
                fetch('/api/elements'),
                fetch('/api/recipes'),
                fetch('/api/refsets'),
            ]);

            const [postersData, elementsData, recipesData, refsetsData] = await Promise.all([
                postersRes.json(),
                elementsRes.json(),
                recipesRes.json(),
                refsetsRes.json(),
            ]);

            setCacheStats({
                projects: 0, // Would need projects count API
                posters: postersData.meta?.total || postersData.data?.length || 0,
                elements: elementsData.meta?.total || elementsData.data?.length || 0,
                recipes: recipesData.meta?.total || recipesData.data?.length || 0,
                refsets: refsetsData.data?.length || 0,
                total_size_mb: 0, // Would calculate from actual files
            });
        } catch (error) {
            console.error('Failed to fetch cache stats:', error);
        } finally {
            setLoading(false);
        }
    }

    function loadSettings() {
        // Load from localStorage
        const stored = localStorage.getItem('posterlab_settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch {
                // Use defaults
            }
        }
    }

    function saveSettings() {
        localStorage.setItem('posterlab_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    async function clearCache(type: 'all' | 'posters' | 'elements' | 'recipes') {
        if (!confirm(`Are you sure you want to clear ${type === 'all' ? 'all cached data' : type}? This cannot be undone.`)) {
            return;
        }

        setClearing(true);

        // In real implementation, would call APIs to delete data
        await new Promise(resolve => setTimeout(resolve, 1000));

        alert(`Cache cleared: ${type}`);
        await fetchCacheStats();
        setClearing(false);
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="heading-xl mb-1">Settings</h1>
                <p className="text-secondary">Configure your PosterLab preferences</p>
            </div>

            <div className="max-w-3xl space-y-8">
                {/* Default Dimensions */}
                <section className="bg-panel border border-subtle rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette size={20} className="text-accent-primary" />
                        <h2 className="heading-lg">Default Canvas</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">
                                Default Width (px)
                            </label>
                            <input
                                type="number"
                                className="input h-10"
                                value={settings.default_width}
                                onChange={(e) => setSettings({ ...settings, default_width: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">
                                Default Height (px)
                            </label>
                            <input
                                type="number"
                                className="input h-10"
                                value={settings.default_height}
                                onChange={(e) => setSettings({ ...settings, default_height: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">
                                Default Batch Size
                            </label>
                            <select
                                className="input h-10"
                                value={settings.default_batch_size}
                                onChange={(e) => setSettings({ ...settings, default_batch_size: Number(e.target.value) })}
                            >
                                <option value={4}>4 images</option>
                                <option value={8}>8 images</option>
                                <option value={12}>12 images</option>
                                <option value={24}>24 images</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">
                                Default Quality
                            </label>
                            <select
                                className="input h-10"
                                value={settings.default_quality}
                                onChange={(e) => setSettings({ ...settings, default_quality: e.target.value })}
                            >
                                <option value="draft">Draft</option>
                                <option value="standard">Standard</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.auto_save}
                                onChange={(e) => setSettings({ ...settings, auto_save: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-secondary">Auto-save drafts</span>
                        </label>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button className="btn btn-primary" onClick={saveSettings}>
                            {saved ? (
                                <>
                                    <Check size={16} />
                                    <span>Saved!</span>
                                </>
                            ) : (
                                'Save Settings'
                            )}
                        </button>
                    </div>
                </section>

                {/* API Keys */}
                <section className="bg-panel border border-subtle rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Key size={20} className="text-accent-primary" />
                        <h2 className="heading-lg">API Configuration</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1.5">
                                Generation API Key
                            </label>
                            <input
                                type="password"
                                className="input h-10"
                                placeholder="sk-..."
                            />
                            <p className="text-xs text-tertiary mt-1">
                                API key for nano banana or other generation services
                            </p>
                        </div>
                    </div>
                </section>

                {/* Cache Management */}
                <section className="bg-panel border border-subtle rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Database size={20} className="text-accent-primary" />
                        <h2 className="heading-lg">Cache Management</h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-4 text-tertiary">Loading...</div>
                    ) : cacheStats ? (
                        <>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-card rounded-lg p-4">
                                    <div className="text-2xl font-bold">{cacheStats.posters}</div>
                                    <div className="text-xs text-tertiary">Posters</div>
                                </div>
                                <div className="bg-card rounded-lg p-4">
                                    <div className="text-2xl font-bold">{cacheStats.elements}</div>
                                    <div className="text-xs text-tertiary">Elements</div>
                                </div>
                                <div className="bg-card rounded-lg p-4">
                                    <div className="text-2xl font-bold">{cacheStats.recipes}</div>
                                    <div className="text-xs text-tertiary">Recipes</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button
                                    className="btn btn-secondary w-full h-10 justify-start"
                                    onClick={() => clearCache('posters')}
                                    disabled={clearing}
                                >
                                    <Trash2 size={16} />
                                    <span>Clear Posters Cache</span>
                                </button>
                                <button
                                    className="btn btn-secondary w-full h-10 justify-start"
                                    onClick={() => clearCache('elements')}
                                    disabled={clearing}
                                >
                                    <Trash2 size={16} />
                                    <span>Clear Elements Cache</span>
                                </button>
                                <button
                                    className="btn btn-ghost w-full h-10 justify-start text-red-500 hover:bg-red-500/10"
                                    onClick={() => clearCache('all')}
                                    disabled={clearing}
                                >
                                    <AlertCircle size={16} />
                                    <span>Clear All Data</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4 text-tertiary">Failed to load stats</div>
                    )}
                </section>

                {/* Storage Info */}
                <section className="bg-panel border border-subtle rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <HardDrive size={20} className="text-accent-primary" />
                        <h2 className="heading-lg">Storage</h2>
                    </div>

                    <div className="text-sm text-secondary">
                        <p className="mb-2">Data is stored locally in SQLite database.</p>
                        <p className="text-xs text-tertiary">
                            Location: <code className="bg-bg-hover px-1 rounded">./data/posterlab.db</code>
                        </p>
                    </div>
                </section>
            </div>
        </>
    );
}
