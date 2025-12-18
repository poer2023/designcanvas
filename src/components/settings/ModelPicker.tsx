'use client';

/**
 * ModelPicker Component
 * PRD v1.9: Unified model selector for all canvas positions
 * 
 * Features:
 * - Only shows enabled models
 * - Shows disabled model warning if current model is disabled
 * - Supports capability filtering (text2img, img2img, vision)
 */

import { useState, useEffect, memo } from 'react';
import { ChevronDown, AlertTriangle, Cpu, Loader2 } from 'lucide-react';
import { useSettingsStore, type Model, type ModelCapability } from '@/store/settingsStore';

interface ModelPickerProps {
    value: string | null;
    onChange: (modelId: string) => void;
    capability?: ModelCapability;
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

function ModelPickerComponent({
    value,
    onChange,
    capability = 'text2img',
    placeholder = 'Select model...',
    disabled = false,
    size = 'md',
    className = '',
}: ModelPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { models, loaded, loading, fetchAll } = useSettingsStore();

    // Fetch models on first mount if not loaded
    useEffect(() => {
        if (!loaded && !loading) {
            fetchAll();
        }
    }, [loaded, loading, fetchAll]);

    // Filter enabled models by capability
    const enabledModels = models.filter(m =>
        m.is_enabled &&
        !m.is_hidden &&
        m.capabilities.includes(capability)
    );

    // Get current model (may be disabled)
    const currentModel = models.find(m => m.model_id === value);
    const isCurrentModelDisabled = currentModel && !currentModel.is_enabled;

    // Size variants
    const sizeClasses = {
        sm: 'h-8 text-xs px-2',
        md: 'h-10 text-sm px-3',
    };

    if (loading) {
        return (
            <div className={`
                ${sizeClasses[size]} rounded-lg
                bg-[var(--bg-input)] border border-[var(--border-default)]
                flex items-center gap-2 text-[var(--text-tertiary)]
                ${className}
            `}>
                <Loader2 size={14} className="animate-spin" />
                Loading models...
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full ${sizeClasses[size]} rounded-lg
                    bg-[var(--bg-input)] border
                    ${isCurrentModelDisabled
                        ? 'border-yellow-500/50'
                        : 'border-[var(--border-default)]'
                    }
                    text-left flex items-center justify-between gap-2
                    ${disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-[var(--border-hover)] cursor-pointer'
                    }
                    transition-colors
                `}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {isCurrentModelDisabled && (
                        <AlertTriangle size={14} className="text-yellow-500 shrink-0" />
                    )}
                    <Cpu size={14} className="text-[var(--text-tertiary)] shrink-0" />
                    <span className={`truncate ${value ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                        {currentModel?.display_name || placeholder}
                    </span>
                    {isCurrentModelDisabled && (
                        <span className="text-yellow-500 text-xs shrink-0">(disabled)</span>
                    )}
                </div>
                <ChevronDown
                    size={14}
                    className={`text-[var(--text-tertiary)] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Disabled Model Warning */}
            {isCurrentModelDisabled && (
                <div className="mt-1 text-xs text-yellow-500 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    This model is disabled. Select an enabled model or enable it in Settings.
                </div>
            )}

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="
                        absolute z-50 mt-1 w-full
                        bg-[var(--bg-panel)] border border-[var(--border-default)]
                        rounded-lg shadow-lg overflow-hidden
                        max-h-64 overflow-y-auto
                    ">
                        {enabledModels.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-[var(--text-tertiary)] text-center">
                                No enabled models available.
                                <br />
                                <a
                                    href="/settings"
                                    className="text-[var(--accent-primary)] hover:underline"
                                >
                                    Go to Settings
                                </a>
                            </div>
                        ) : (
                            enabledModels.map(model => (
                                <button
                                    key={model.model_id}
                                    type="button"
                                    onClick={() => {
                                        onChange(model.model_id);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full px-3 py-2.5 text-left
                                        flex items-center gap-2
                                        hover:bg-[var(--bg-hover)]
                                        transition-colors
                                        ${model.model_id === value ? 'bg-[var(--bg-hover)]' : ''}
                                    `}
                                >
                                    <Cpu size={14} className="text-[var(--text-tertiary)] shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm text-[var(--text-primary)] truncate">
                                            {model.display_name}
                                        </div>
                                        <div className="text-xs text-[var(--text-tertiary)] truncate">
                                            {model.model_id}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {model.capabilities.map(cap => (
                                            <span
                                                key={cap}
                                                className={`
                                                    px-1.5 py-0.5 rounded text-[10px] font-medium
                                                    ${cap === 'text2img' ? 'bg-blue-500/10 text-blue-500' : ''}
                                                    ${cap === 'img2img' ? 'bg-purple-500/10 text-purple-500' : ''}
                                                    ${cap === 'vision' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                                                `}
                                            >
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export const ModelPicker = memo(ModelPickerComponent);

/**
 * Compact model badge for display only (no picker)
 */
interface ModelBadgeProps {
    modelId: string | null;
    className?: string;
}

export function ModelBadge({ modelId, className = '' }: ModelBadgeProps) {
    const models = useSettingsStore(state => state.models);
    const model = models.find(m => m.model_id === modelId);

    if (!model) {
        return (
            <span className={`text-xs text-[var(--text-tertiary)] ${className}`}>
                No model
            </span>
        );
    }

    const isDisabled = !model.is_enabled;

    return (
        <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${isDisabled
                ? 'bg-yellow-500/10 text-yellow-600'
                : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            }
            ${className}
        `}>
            {isDisabled && <AlertTriangle size={10} />}
            <Cpu size={10} />
            {model.display_name}
            {isDisabled && <span className="text-yellow-600">(disabled)</span>}
        </span>
    );
}

/**
 * Blocked state indicator for when model is missing/disabled
 */
interface ModelBlockedProps {
    reason: 'disabled' | 'missing' | 'no-key';
    modelName?: string;
    className?: string;
}

export function ModelBlocked({ reason, modelName, className = '' }: ModelBlockedProps) {
    const messages = {
        disabled: `Model "${modelName}" is disabled`,
        missing: 'No model selected',
        'no-key': 'Provider API key not configured',
    };

    return (
        <div className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-yellow-500/10 border border-yellow-500/30
            text-yellow-600 text-sm
            ${className}
        `}>
            <AlertTriangle size={16} />
            <span>{messages[reason]}</span>
            <a
                href="/settings"
                className="ml-auto text-xs underline hover:no-underline"
            >
                Go to Settings
            </a>
        </div>
    );
}

export default ModelPicker;
