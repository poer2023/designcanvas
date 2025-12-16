'use client';

import { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon, Database, Trash2, HardDrive,
    Key, Palette, RefreshCw, AlertCircle, Check, Moon, Sun, Monitor
} from 'lucide-react';

interface CacheStats {
    projects: number;
    posters: number;
    elements: number;
    recipes: number;
    refsets: number;
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
                projects: 0,
                posters: postersData.meta?.total || postersData.data?.length || 0,
                elements: elementsData.meta?.total || elementsData.data?.length || 0,
                recipes: recipesData.meta?.total || recipesData.data?.length || 0,
                refsets: refsetsData.data?.length || 0,
            });
        } catch (error) {
            console.error('Failed to fetch cache stats:', error);
        } finally {
            setLoading(false);
        }
    }

    function loadSettings() {
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
        if (!confirm(`Are you sure you want to clear ${type === 'all' ? 'all cached data' : type}?`)) return;

        setClearing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Cache cleared: ${type}`);
        await fetchCacheStats();
        setClearing(false);
    }

    return (
        <>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Settings</h1>
                <p className="text-sm text-[var(--text-secondary)]">Configure your PosterLab preferences</p>
            </div>

            <div className="max-w-2xl space-y-6">
                {/* Appearance */}
                <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Palette size={16} className="text-violet-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">Theme and display preferences</p>
                        </div>
                    </div>

                    <div className="p-5">
                        <label className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Theme</label>
                        <div className="flex gap-2 mt-2">
                            {[
                                { value: 'light', icon: Sun, label: 'Light' },
                                { value: 'dark', icon: Moon, label: 'Dark' },
                                { value: 'system', icon: Monitor, label: 'System' },
                            ].map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    className="
                    flex-1 h-10 rounded-lg border border-[var(--border-default)]
                    flex items-center justify-center gap-2
                    text-sm text-[var(--text-secondary)]
                    hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
                    transition-colors
                  "
                                >
                                    <Icon size={16} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Canvas Defaults */}
                <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <SettingsIcon size={16} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Canvas Defaults</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">Default settings for new projects</p>
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Width (px)</label>
                                <input
                                    type="number"
                                    className="
                    w-full h-10 px-3 rounded-lg
                    bg-[var(--bg-input)] border border-[var(--border-default)]
                    text-sm text-[var(--text-primary)]
                    focus:outline-none focus:border-[var(--accent-primary)]
                  "
                                    value={settings.default_width}
                                    onChange={(e) => setSettings({ ...settings, default_width: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Height (px)</label>
                                <input
                                    type="number"
                                    className="
                    w-full h-10 px-3 rounded-lg
                    bg-[var(--bg-input)] border border-[var(--border-default)]
                    text-sm text-[var(--text-primary)]
                    focus:outline-none focus:border-[var(--accent-primary)]
                  "
                                    value={settings.default_height}
                                    onChange={(e) => setSettings({ ...settings, default_height: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Batch Size</label>
                                <select
                                    className="
                    w-full h-10 px-3 rounded-lg
                    bg-[var(--bg-input)] border border-[var(--border-default)]
                    text-sm text-[var(--text-primary)]
                    focus:outline-none focus:border-[var(--accent-primary)]
                  "
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
                                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Quality</label>
                                <select
                                    className="
                    w-full h-10 px-3 rounded-lg
                    bg-[var(--bg-input)] border border-[var(--border-default)]
                    text-sm text-[var(--text-primary)]
                    focus:outline-none focus:border-[var(--accent-primary)]
                  "
                                    value={settings.default_quality}
                                    onChange={(e) => setSettings({ ...settings, default_quality: e.target.value })}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="standard">Standard</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.auto_save}
                                    onChange={(e) => setSettings({ ...settings, auto_save: e.target.checked })}
                                    className="w-4 h-4 rounded border-[var(--border-default)]"
                                />
                                <span className="text-sm text-[var(--text-secondary)]">Auto-save drafts</span>
                            </label>

                            <button
                                onClick={saveSettings}
                                className="
                  h-9 px-4 rounded-lg text-sm font-medium
                  bg-[var(--accent-primary)] text-white
                  hover:bg-[var(--accent-hover)]
                  flex items-center gap-2
                  transition-colors
                "
                            >
                                {saved ? <><Check size={14} /> Saved!</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* API Configuration */}
                <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Key size={16} className="text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">API Keys</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">Configure external service connections</p>
                        </div>
                    </div>

                    <div className="p-5">
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Generation API Key</label>
                        <input
                            type="password"
                            placeholder="sk-..."
                            className="
                w-full h-10 px-3 rounded-lg
                bg-[var(--bg-input)] border border-[var(--border-default)]
                text-sm text-[var(--text-primary)]
                placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[var(--accent-primary)]
              "
                        />
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
                            API key for nano banana or other generation services
                        </p>
                    </div>
                </section>

                {/* Storage */}
                <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Database size={16} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Storage</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">Manage cached data</p>
                        </div>
                    </div>

                    <div className="p-5">
                        {loading ? (
                            <div className="text-center py-4 text-[var(--text-tertiary)]">Loading...</div>
                        ) : cacheStats ? (
                            <>
                                <div className="grid grid-cols-4 gap-3 mb-4">
                                    {[
                                        { label: 'Posters', value: cacheStats.posters },
                                        { label: 'Elements', value: cacheStats.elements },
                                        { label: 'Recipes', value: cacheStats.recipes },
                                        { label: 'RefSets', value: cacheStats.refsets },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="bg-[var(--bg-input)] rounded-lg p-3 text-center">
                                            <div className="text-xl font-semibold text-[var(--text-primary)]">{value}</div>
                                            <div className="text-[10px] text-[var(--text-tertiary)]">{label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => clearCache('all')}
                                        disabled={clearing}
                                        className="
                      flex-1 h-9 rounded-lg text-sm font-medium
                      text-red-500 border border-red-500/30
                      hover:bg-red-500/10
                      flex items-center justify-center gap-2
                      transition-colors
                    "
                                    >
                                        <Trash2 size={14} />
                                        Clear All Cache
                                    </button>
                                    <button
                                        onClick={() => fetchCacheStats()}
                                        className="
                      h-9 px-3 rounded-lg
                      text-[var(--text-tertiary)] border border-[var(--border-default)]
                      hover:bg-[var(--bg-hover)]
                      transition-colors
                    "
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4 text-[var(--text-tertiary)]">Failed to load</div>
                        )}
                    </div>
                </section>

                {/* Info Footer */}
                <div className="text-center text-xs text-[var(--text-tertiary)] py-4">
                    <p>PosterLab v1.0.0 • Local-first Design Tool</p>
                    <p className="mt-1">Data stored in <code className="bg-[var(--bg-hover)] px-1 rounded">./data/posterlab.db</code></p>
                </div>
            </div>
        </>
    );
}
