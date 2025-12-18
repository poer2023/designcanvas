/**
 * Settings Store
 * PRD v1.9: Frontend state management for model configuration
 */

import { create } from 'zustand';

export type ModelCapability = 'text2img' | 'img2img' | 'vision';

export interface Provider {
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

export interface Model {
    model_id: string;
    provider_id: string;
    display_name: string;
    remote_model_name: string;
    capabilities: ModelCapability[];
    is_enabled: boolean;
    sort_order: number;
    default_params: Record<string, unknown>;
    is_hidden: boolean;
}

export interface AppDefaults {
    default_text2img_model_id: string | null;
    default_img2img_model_id: string | null;
    default_ratio: string;
    default_resolution: string;
    default_count: number;
}

interface SettingsState {
    // Data
    providers: Provider[];
    models: Model[];
    defaults: AppDefaults | null;
    loaded: boolean;
    loading: boolean;

    // Computed
    enabledModels: Model[];

    // Actions
    fetchProviders: () => Promise<void>;
    fetchModels: () => Promise<void>;
    fetchDefaults: () => Promise<void>;
    fetchAll: () => Promise<void>;

    // Model helpers
    getModel: (modelId: string) => Model | undefined;
    getEnabledModels: (capability?: ModelCapability) => Model[];
    isModelEnabled: (modelId: string) => boolean;

    // Effective model resolution
    resolveEffectiveModel: (
        cardModelId: string | null,
        groupModelId: string | null,
        mode: 'text2img' | 'img2img'
    ) => Model | null;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    providers: [],
    models: [],
    defaults: null,
    loaded: false,
    loading: false,

    get enabledModels() {
        return get().models.filter(m => m.is_enabled && !m.is_hidden);
    },

    fetchProviders: async () => {
        try {
            const res = await fetch('/api/settings/providers');
            const data = await res.json();
            if (data.success) {
                set({ providers: data.data });
            }
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        }
    },

    fetchModels: async () => {
        try {
            const res = await fetch('/api/settings/models');
            const data = await res.json();
            if (data.success) {
                set({ models: data.data });
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
        }
    },

    fetchDefaults: async () => {
        try {
            const res = await fetch('/api/settings/defaults');
            const data = await res.json();
            if (data.success) {
                set({ defaults: data.data });
            }
        } catch (error) {
            console.error('Failed to fetch defaults:', error);
        }
    },

    fetchAll: async () => {
        set({ loading: true });
        try {
            await Promise.all([
                get().fetchProviders(),
                get().fetchModels(),
                get().fetchDefaults(),
            ]);
            set({ loaded: true });
        } finally {
            set({ loading: false });
        }
    },

    getModel: (modelId: string) => {
        return get().models.find(m => m.model_id === modelId);
    },

    getEnabledModels: (capability?: ModelCapability) => {
        const models = get().models.filter(m => m.is_enabled && !m.is_hidden);
        if (capability) {
            return models.filter(m => m.capabilities.includes(capability));
        }
        return models;
    },

    isModelEnabled: (modelId: string) => {
        const model = get().getModel(modelId);
        return model?.is_enabled ?? false;
    },

    /**
     * Resolve effective model following PRD v1.9 hierarchy:
     * 1. Card Override (cardModelId)
     * 2. Group Default (groupModelId)
     * 3. Global Default (defaults.default_xxx_model_id)
     * 4. null if none available
     */
    resolveEffectiveModel: (cardModelId, groupModelId, mode) => {
        const { models, defaults } = get();
        const enabledModels = models.filter(m => m.is_enabled);

        // Priority 1: Card override
        if (cardModelId) {
            const cardModel = enabledModels.find(m => m.model_id === cardModelId);
            if (cardModel) return cardModel;
            // Card has a model but it's disabled - still return it for display purposes
            // but caller should check is_enabled
            const disabledModel = models.find(m => m.model_id === cardModelId);
            if (disabledModel) return disabledModel;
        }

        // Priority 2: Group default
        if (groupModelId) {
            const groupModel = enabledModels.find(m => m.model_id === groupModelId);
            if (groupModel) return groupModel;
        }

        // Priority 3: Global default
        if (defaults) {
            const defaultModelId = mode === 'img2img'
                ? defaults.default_img2img_model_id
                : defaults.default_text2img_model_id;

            if (defaultModelId) {
                const defaultModel = enabledModels.find(m => m.model_id === defaultModelId);
                if (defaultModel) return defaultModel;
            }
        }

        // Priority 4: First enabled model with matching capability
        const firstMatch = enabledModels.find(m => m.capabilities.includes(mode));
        if (firstMatch) return firstMatch;

        // No model available
        return null;
    },
}));

/**
 * Hook to get enabled models (useful for pickers)
 */
export function useEnabledModels(capability?: ModelCapability) {
    const models = useSettingsStore(state => state.models);
    return models.filter(m => {
        if (!m.is_enabled || m.is_hidden) return false;
        if (capability && !m.capabilities.includes(capability)) return false;
        return true;
    });
}

/**
 * Hook to resolve effective model for a card
 */
export function useEffectiveModel(
    cardModelId: string | null,
    groupModelId: string | null,
    mode: 'text2img' | 'img2img'
) {
    const resolveEffectiveModel = useSettingsStore(state => state.resolveEffectiveModel);
    return resolveEffectiveModel(cardModelId, groupModelId, mode);
}

/**
 * Initialize settings store - call once on app mount
 */
export function initSettingsStore() {
    const { loaded, fetchAll } = useSettingsStore.getState();
    if (!loaded) {
        fetchAll();
    }
}
