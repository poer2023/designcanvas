'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Settings as SettingsIcon, Database, Trash2, Key, Palette, RefreshCw,
    Check, Moon, Sun, Monitor, Plus, Cpu, Zap, Eye, EyeOff,
    TestTube2, Loader2, ChevronDown, ChevronRight, AlertCircle,
    ToggleLeft, ToggleRight, Pencil, X, Save
} from 'lucide-react';

// Types
interface Provider {
    provider_id: string;
    display_name: string;
    base_url: string | null;
    timeout_ms: number;
    max_concurrency: number;
    is_enabled: boolean;
    has_api_key: boolean;
    last_test_status: 'ok' | 'invalid' | 'missing' | 'rate_limited' | 'unknown';
    last_test_at: string | null;
}

interface Model {
    model_id: string;
    provider_id: string;
    display_name: string;
    remote_model_name: string;
    capabilities: ('text2img' | 'img2img' | 'vision')[];
    is_enabled: boolean;
    sort_order: number;
    default_params: Record<string, unknown>;
    is_hidden: boolean;
}

interface AppDefaults {
    default_text2img_model_id: string | null;
    default_img2img_model_id: string | null;
    default_ratio: string;
    default_resolution: string;
    default_count: number;
}

interface CacheStats {
    projects: number;
    posters: number;
    elements: number;
    recipes: number;
    refsets: number;
}

type TabType = 'providers' | 'models' | 'defaults' | 'storage' | 'appearance';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('providers');
    const [providers, setProviders] = useState<Provider[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [defaults, setDefaults] = useState<AppDefaults | null>(null);
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            await Promise.all([
                fetchProviders(),
                fetchModels(),
                fetchDefaults(),
                fetchCacheStats(),
            ]);
        } finally {
            setLoading(false);
        }
    }

    async function fetchProviders() {
        try {
            const res = await fetch('/api/settings/providers');
            const data = await res.json();
            if (data.success) {
                setProviders(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        }
    }

    async function fetchModels() {
        try {
            const res = await fetch('/api/settings/models?include_hidden=true');
            const data = await res.json();
            if (data.success) {
                setModels(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
        }
    }

    async function fetchDefaults() {
        try {
            const res = await fetch('/api/settings/defaults');
            const data = await res.json();
            if (data.success) {
                setDefaults(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch defaults:', error);
        }
    }

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
        }
    }

    const tabs = [
        { id: 'providers' as TabType, label: 'Providers', icon: Key },
        { id: 'models' as TabType, label: 'Models', icon: Cpu },
        { id: 'defaults' as TabType, label: 'Defaults', icon: SettingsIcon },
        { id: 'storage' as TabType, label: 'Storage', icon: Database },
        { id: 'appearance' as TabType, label: 'Appearance', icon: Palette },
    ];

    return (
        <>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Settings</h1>
                <p className="text-sm text-[var(--text-secondary)]">Configure providers, models, and preferences</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 p-1 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                            ${activeTab === tab.id
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                            }
                        `}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="max-w-4xl">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'providers' && (
                            <ProvidersTab
                                providers={providers}
                                onUpdate={fetchProviders}
                            />
                        )}
                        {activeTab === 'models' && (
                            <ModelsTab
                                models={models}
                                providers={providers}
                                onUpdate={fetchModels}
                            />
                        )}
                        {activeTab === 'defaults' && (
                            <DefaultsTab
                                defaults={defaults}
                                models={models.filter(m => m.is_enabled)}
                                onUpdate={fetchDefaults}
                            />
                        )}
                        {activeTab === 'storage' && (
                            <StorageTab
                                cacheStats={cacheStats}
                                onRefresh={fetchCacheStats}
                            />
                        )}
                        {activeTab === 'appearance' && <AppearanceTab />}
                    </>
                )}
            </div>

            {/* Info Footer */}
            <div className="text-center text-xs text-[var(--text-tertiary)] py-8 mt-8">
                <p>PosterLab v1.9.0 • Model Configuration Center</p>
            </div>
        </>
    );
}

// ===================== PROVIDERS TAB =====================
function ProvidersTab({ providers, onUpdate }: { providers: Provider[]; onUpdate: () => void }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Providers</h2>
                    <p className="text-sm text-[var(--text-tertiary)]">Configure API keys and connection settings</p>
                </div>
            </div>

            <div className="grid gap-4">
                {providers.map(provider => (
                    <ProviderCard
                        key={provider.provider_id}
                        provider={provider}
                        onUpdate={onUpdate}
                    />
                ))}
            </div>
        </div>
    );
}

function ProviderCard({ provider, onUpdate }: { provider: Provider; onUpdate: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

    const statusColors: Record<string, string> = {
        ok: 'bg-green-500',
        invalid: 'bg-red-500',
        missing: 'bg-yellow-500',
        rate_limited: 'bg-orange-500',
        unknown: 'bg-gray-500',
    };

    const statusLabels: Record<string, string> = {
        ok: 'Connected',
        invalid: 'Invalid Key',
        missing: 'No Key',
        rate_limited: 'Rate Limited',
        unknown: 'Unknown',
    };

    async function saveApiKey() {
        if (!apiKey.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/settings/providers/${provider.provider_id}/secret`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: apiKey }),
            });
            if (res.ok) {
                setApiKey('');
                onUpdate();
            }
        } finally {
            setSaving(false);
        }
    }

    async function testConnection() {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(`/api/settings/providers/${provider.provider_id}/test`, {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                setTestResult(data.data);
                onUpdate();
            }
        } finally {
            setTesting(false);
        }
    }

    return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center">
                        <Key size={18} className="text-[var(--text-secondary)]" />
                    </div>
                    <div>
                        <div className="font-medium text-[var(--text-primary)]">{provider.display_name}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">{provider.provider_id}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[provider.last_test_status]}`} />
                        <span className="text-xs text-[var(--text-secondary)]">
                            {statusLabels[provider.last_test_status]}
                        </span>
                    </div>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-5 pt-2 border-t border-[var(--border-subtle)] space-y-4">
                    {/* API Key Input */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">
                            API Key {provider.has_api_key && <span className="text-green-500">(Configured)</span>}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={provider.has_api_key ? '••••••••' : 'Enter API key...'}
                                className="
                                    flex-1 h-10 px-3 rounded-lg
                                    bg-[var(--bg-input)] border border-[var(--border-default)]
                                    text-sm text-[var(--text-primary)]
                                    placeholder:text-[var(--text-tertiary)]
                                    focus:outline-none focus:border-[var(--accent-primary)]
                                "
                            />
                            <button
                                onClick={saveApiKey}
                                disabled={!apiKey.trim() || saving}
                                className="
                                    h-10 px-4 rounded-lg text-sm font-medium
                                    bg-[var(--accent-primary)] text-white
                                    hover:bg-[var(--accent-hover)]
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    flex items-center gap-2
                                "
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Base URL */}
                    {provider.base_url && (
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Base URL</label>
                            <div className="text-sm text-[var(--text-secondary)] font-mono bg-[var(--bg-input)] px-3 py-2 rounded-lg">
                                {provider.base_url}
                            </div>
                        </div>
                    )}

                    {/* Test Connection */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={testConnection}
                            disabled={testing || !provider.has_api_key}
                            className="
                                h-9 px-4 rounded-lg text-sm font-medium
                                border border-[var(--border-default)]
                                text-[var(--text-secondary)]
                                hover:bg-[var(--bg-hover)]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                flex items-center gap-2
                            "
                        >
                            {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
                            Test Connection
                        </button>
                        {testResult && (
                            <div className={`text-sm ${testResult.status === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
                                {testResult.message}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ===================== MODELS TAB =====================
function ModelsTab({ models, providers, onUpdate }: { models: Model[]; providers: Provider[]; onUpdate: () => void }) {
    const [showAddForm, setShowAddForm] = useState(false);

    const getProviderName = useCallback((providerId: string) => {
        return providers.find(p => p.provider_id === providerId)?.display_name || providerId;
    }, [providers]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Models</h2>
                    <p className="text-sm text-[var(--text-tertiary)]">
                        {models.filter(m => m.is_enabled).length} of {models.length} models enabled
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="
                        h-9 px-4 rounded-lg text-sm font-medium
                        bg-[var(--accent-primary)] text-white
                        hover:bg-[var(--accent-hover)]
                        flex items-center gap-2
                    "
                >
                    <Plus size={14} />
                    Add Model
                </button>
            </div>

            {showAddForm && (
                <AddModelForm
                    providers={providers}
                    onClose={() => setShowAddForm(false)}
                    onSuccess={() => {
                        setShowAddForm(false);
                        onUpdate();
                    }}
                />
            )}

            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border-subtle)]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                                Enable
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                                Model
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                                Provider
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                                Capabilities
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {models.map(model => (
                            <ModelRow
                                key={model.model_id}
                                model={model}
                                providerName={getProviderName(model.provider_id)}
                                onUpdate={onUpdate}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ModelRow({ model, providerName, onUpdate }: { model: Model; providerName: string; onUpdate: () => void }) {
    const [toggling, setToggling] = useState(false);

    async function toggleEnabled() {
        setToggling(true);
        try {
            await fetch(`/api/settings/models/${encodeURIComponent(model.model_id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toggle_enabled: true }),
            });
            onUpdate();
        } finally {
            setToggling(false);
        }
    }

    const capabilityColors: Record<string, string> = {
        text2img: 'bg-blue-500/10 text-blue-500',
        img2img: 'bg-purple-500/10 text-purple-500',
        vision: 'bg-emerald-500/10 text-emerald-500',
    };

    return (
        <tr className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors">
            <td className="px-4 py-3">
                <button
                    onClick={toggleEnabled}
                    disabled={toggling}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                    {toggling ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : model.is_enabled ? (
                        <ToggleRight size={24} className="text-[var(--accent-primary)]" />
                    ) : (
                        <ToggleLeft size={24} />
                    )}
                </button>
            </td>
            <td className="px-4 py-3">
                <div className="font-medium text-[var(--text-primary)]">{model.display_name}</div>
                <div className="text-xs text-[var(--text-tertiary)] font-mono">{model.model_id}</div>
            </td>
            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                {providerName}
            </td>
            <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                    {model.capabilities.map(cap => (
                        <span
                            key={cap}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${capabilityColors[cap]}`}
                        >
                            {cap}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-4 py-3">
                <button
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                    <Pencil size={14} />
                </button>
            </td>
        </tr>
    );
}

function AddModelForm({ providers, onClose, onSuccess }: {
    providers: Provider[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        model_id: '',
        provider_id: providers[0]?.provider_id || '',
        display_name: '',
        remote_model_name: '',
        capabilities: ['text2img'] as ('text2img' | 'img2img' | 'vision')[],
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.model_id || !form.display_name || !form.remote_model_name) {
            setError('All fields are required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/settings/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (data.success) {
                onSuccess();
            } else {
                setError(data.error || 'Failed to create model');
            }
        } catch {
            setError('Failed to create model');
        } finally {
            setSaving(false);
        }
    }

    function toggleCapability(cap: 'text2img' | 'img2img' | 'vision') {
        setForm(prev => ({
            ...prev,
            capabilities: prev.capabilities.includes(cap)
                ? prev.capabilities.filter(c => c !== cap)
                : [...prev.capabilities, cap]
        }));
    }

    return (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-[var(--text-primary)]">Add New Model</h3>
                <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    <X size={18} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Model ID</label>
                        <input
                            type="text"
                            value={form.model_id}
                            onChange={(e) => setForm({ ...form, model_id: e.target.value })}
                            placeholder="e.g. provider:model-name"
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Provider</label>
                        <select
                            value={form.provider_id}
                            onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        >
                            {providers.map(p => (
                                <option key={p.provider_id} value={p.provider_id}>{p.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Display Name</label>
                        <input
                            type="text"
                            value={form.display_name}
                            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                            placeholder="e.g. SDXL Pro"
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Remote Model Name</label>
                        <input
                            type="text"
                            value={form.remote_model_name}
                            onChange={(e) => setForm({ ...form, remote_model_name: e.target.value })}
                            placeholder="e.g. stabilityai/sdxl"
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Capabilities</label>
                    <div className="flex gap-2">
                        {(['text2img', 'img2img', 'vision'] as const).map(cap => (
                            <button
                                key={cap}
                                type="button"
                                onClick={() => toggleCapability(cap)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                                    ${form.capabilities.includes(cap)
                                        ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }
                                `}
                            >
                                {cap}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            h-9 px-4 rounded-lg text-sm font-medium
                            border border-[var(--border-default)]
                            text-[var(--text-secondary)]
                            hover:bg-[var(--bg-hover)]
                        "
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="
                            h-9 px-4 rounded-lg text-sm font-medium
                            bg-[var(--accent-primary)] text-white
                            hover:bg-[var(--accent-hover)]
                            disabled:opacity-50
                            flex items-center gap-2
                        "
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Create Model
                    </button>
                </div>
            </form>
        </div>
    );
}

// ===================== DEFAULTS TAB =====================
function DefaultsTab({ defaults, models, onUpdate }: {
    defaults: AppDefaults | null;
    models: Model[];
    onUpdate: () => void;
}) {
    const [form, setForm] = useState<AppDefaults>(defaults || {
        default_text2img_model_id: null,
        default_img2img_model_id: null,
        default_ratio: '1:1',
        default_resolution: '1K',
        default_count: 4,
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (defaults) {
            setForm(defaults);
        }
    }, [defaults]);

    async function handleSave() {
        setSaving(true);
        try {
            await fetch('/api/settings/defaults', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            onUpdate();
        } finally {
            setSaving(false);
        }
    }

    const text2imgModels = models.filter(m => m.capabilities.includes('text2img'));
    const img2imgModels = models.filter(m => m.capabilities.includes('img2img'));

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Defaults</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Default settings for new generations</p>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-5">
                {/* Default Models */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">
                            Default Text-to-Image Model
                        </label>
                        <select
                            value={form.default_text2img_model_id || ''}
                            onChange={(e) => setForm({ ...form, default_text2img_model_id: e.target.value || null })}
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        >
                            <option value="">None selected</option>
                            {text2imgModels.map(m => (
                                <option key={m.model_id} value={m.model_id}>{m.display_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">
                            Default Image-to-Image Model
                        </label>
                        <select
                            value={form.default_img2img_model_id || ''}
                            onChange={(e) => setForm({ ...form, default_img2img_model_id: e.target.value || null })}
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        >
                            <option value="">None selected</option>
                            {img2imgModels.map(m => (
                                <option key={m.model_id} value={m.model_id}>{m.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Default Generation Params */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">
                            Default Ratio
                        </label>
                        <select
                            value={form.default_ratio}
                            onChange={(e) => setForm({ ...form, default_ratio: e.target.value })}
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        >
                            <option value="1:1">1:1</option>
                            <option value="3:2">3:2</option>
                            <option value="2:3">2:3</option>
                            <option value="16:9">16:9</option>
                            <option value="9:16">9:16</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">
                            Default Resolution
                        </label>
                        <select
                            value={form.default_resolution}
                            onChange={(e) => setForm({ ...form, default_resolution: e.target.value })}
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        >
                            <option value="1K">1K</option>
                            <option value="2K">2K</option>
                            <option value="4K">4K</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">
                            Default Count
                        </label>
                        <select
                            value={form.default_count}
                            onChange={(e) => setForm({ ...form, default_count: Number(e.target.value) })}
                            className="
                                w-full h-10 px-3 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-sm text-[var(--text-primary)]
                                focus:outline-none focus:border-[var(--accent-primary)]
                            "
                        >
                            <option value={1}>1</option>
                            <option value={4}>4</option>
                            <option value={8}>8</option>
                            <option value={12}>12</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="
                            h-9 px-4 rounded-lg text-sm font-medium
                            bg-[var(--accent-primary)] text-white
                            hover:bg-[var(--accent-hover)]
                            disabled:opacity-50
                            flex items-center gap-2
                        "
                    >
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : saved ? (
                            <Check size={14} />
                        ) : (
                            <Save size={14} />
                        )}
                        {saved ? 'Saved!' : 'Save Defaults'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===================== STORAGE TAB =====================
function StorageTab({ cacheStats, onRefresh }: { cacheStats: CacheStats | null; onRefresh: () => void }) {
    const [clearing, setClearing] = useState(false);

    async function clearCache(type: 'all' | 'posters' | 'elements' | 'recipes') {
        if (!confirm(`Are you sure you want to clear ${type === 'all' ? 'all cached data' : type}?`)) return;

        setClearing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Cache cleared: ${type}`);
        await onRefresh();
        setClearing(false);
    }

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Storage</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Manage cached data</p>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5">
                {cacheStats ? (
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
                                onClick={onRefresh}
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

            <div className="text-xs text-[var(--text-tertiary)]">
                Data stored in <code className="bg-[var(--bg-hover)] px-1 rounded">./data/posterlab.db</code>
            </div>
        </div>
    );
}

// ===================== APPEARANCE TAB =====================
function AppearanceTab() {
    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Appearance</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Theme and display preferences</p>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5">
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
        </div>
    );
}
