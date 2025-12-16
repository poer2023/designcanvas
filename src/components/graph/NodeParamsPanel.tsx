'use client';

import { X, Lock, Unlock, RotateCcw } from 'lucide-react';
import { useGraphStore, ParamValue, NodeStatus } from '@/store/graphStore';

// Define a clean props interface without inherited index signatures
interface NodeData {
    skillId: string;
    skillName: string;
    skillType: string;
    params: Record<string, ParamValue>;
    status: NodeStatus;
    locked: boolean;
    output?: Record<string, unknown> | null;
    error?: string;
}

interface NodeParamsPanelProps {
    nodeId: string;
    data: NodeData;
}

// Skill type definitions
const SKILL_INFO: Record<string, { name: string; color: string; icon: string }> = {
    'style-profiler': { name: 'Style Profiler', color: '#8B5CF6', icon: '✨' },
    'brief': { name: 'Poster Brief', color: '#3B82F6', icon: '📋' },
    'inspiration-pool': { name: 'Inspiration Pool', color: '#10B981', icon: '💡' },
    'prompt-forge': { name: 'Prompt Forge', color: '#F59E0B', icon: '🔧' },
    'batch-generate': { name: 'Batch Generate', color: '#EF4444', icon: '🎨' },
    'element-extract': { name: 'Element Extract', color: '#EC4899', icon: '✂️' },
    'compose': { name: 'Compose & Harmonize', color: '#6366F1', icon: '🧩' },
    'export': { name: 'Export', color: '#14B8A6', icon: '📤' },
};

interface FieldDef {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    options?: string[];
    placeholder?: string;
}

// Schema for each skill type's parameters
const SKILL_SCHEMAS: Record<string, { fields: FieldDef[] }> = {
    'style-profiler': {
        fields: [
            { key: 'portfolioPath', label: 'Portfolio Path', type: 'text', placeholder: '/path/to/images' },
            { key: 'tags', label: 'Tags', type: 'text', placeholder: 'modern, minimal, corporate' },
            { key: 'bannedTokens', label: 'Banned Tokens', type: 'textarea', placeholder: 'clipart, cartoon, low-quality' },
        ],
    },
    'brief': {
        fields: [
            { key: 'width', label: 'Width (px)', type: 'number', placeholder: '1080' },
            { key: 'height', label: 'Height (px)', type: 'number', placeholder: '1920' },
            { key: 'title', label: 'Main Title', type: 'text', placeholder: 'Summer Festival 2024' },
            { key: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'Join us for an unforgettable experience' },
            { key: 'tone', label: 'Tone', type: 'select', options: ['energetic', 'elegant', 'playful', 'professional', 'minimalist'] },
        ],
    },
    'inspiration-pool': {
        fields: [
            { key: 'keywords', label: 'Keywords', type: 'text', placeholder: 'music, festival, summer' },
            { key: 'diversity', label: 'Diversity', type: 'select', options: ['low', 'medium', 'high'] },
            { key: 'maxItems', label: 'Max Items', type: 'number', placeholder: '20' },
        ],
    },
    'prompt-forge': {
        fields: [
            { key: 'layoutStrategy', label: 'Layout Strategy', type: 'select', options: ['centered', 'asymmetric', 'grid', 'freeform'] },
            { key: 'strength', label: 'Style Strength', type: 'number', placeholder: '0.75' },
            { key: 'diversity', label: 'Output Diversity', type: 'number', placeholder: '0.5' },
        ],
    },
    'batch-generate': {
        fields: [
            { key: 'count', label: 'Batch Size', type: 'select', options: ['4', '8', '12', '24'] },
            { key: 'quality', label: 'Quality', type: 'select', options: ['draft', 'standard', 'high'] },
        ],
    },
    'element-extract': {
        fields: [
            { key: 'method', label: 'Extraction Method', type: 'select', options: ['rectangle', 'lasso', 'auto'] },
            { key: 'semanticTag', label: 'Semantic Tag', type: 'text', placeholder: 'background, text, logo' },
        ],
    },
    'compose': {
        fields: [
            { key: 'unifyPolicy', label: 'Unify Policy', type: 'select', options: ['tone', 'palette', 'grain', 'all'] },
            { key: 'alignGrid', label: 'Align to Grid', type: 'select', options: ['true', 'false'] },
        ],
    },
    'export': {
        fields: [
            { key: 'format', label: 'Format', type: 'select', options: ['PNG', 'JPG', 'PDF'] },
            { key: 'includeAssets', label: 'Include Assets', type: 'select', options: ['true', 'false'] },
            { key: 'includeRecipe', label: 'Include Recipe', type: 'select', options: ['true', 'false'] },
        ],
    },
};

export default function NodeParamsPanel({ nodeId, data }: NodeParamsPanelProps) {
    const { updateNodeParams, updateNodeStatus, toggleNodeLock, selectNode, removeNode } = useGraphStore();

    const skillInfo = SKILL_INFO[data.skillType] || { name: 'Unknown', color: '#666', icon: '❓' };
    const schema = SKILL_SCHEMAS[data.skillType] || { fields: [] };

    const handleParamChange = (key: string, value: ParamValue) => {
        updateNodeParams(nodeId, { [key]: value });
    };

    const handleRerun = () => {
        updateNodeStatus(nodeId, 'running');
        setTimeout(() => {
            updateNodeStatus(nodeId, 'success', { result: 'rerun complete' });
        }, 1000);
    };

    const getParamValue = (key: string): string => {
        const val = data.params[key];
        if (val === null || val === undefined) return '';
        return String(val);
    };

    return (
        <div className="w-[320px] bg-panel border-l border-subtle flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-subtle">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{skillInfo.icon}</span>
                    <div>
                        <h3 className="heading-sm" style={{ color: skillInfo.color }}>{skillInfo.name}</h3>
                        <span className="text-[10px] text-tertiary uppercase">Node Config</span>
                    </div>
                </div>
                <button
                    onClick={() => selectNode(null)}
                    className="p-1 text-tertiary hover:text-primary transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Parameters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {schema.fields.map((field) => (
                    <div key={field.key}>
                        <label className="block text-xs font-medium text-secondary mb-1.5">
                            {field.label}
                        </label>
                        {field.type === 'select' ? (
                            <select
                                className="input h-9"
                                value={getParamValue(field.key)}
                                onChange={(e) => handleParamChange(field.key, e.target.value)}
                            >
                                <option value="">Select...</option>
                                {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : field.type === 'textarea' ? (
                            <textarea
                                className="input min-h-[80px] resize-none"
                                placeholder={field.placeholder}
                                value={getParamValue(field.key)}
                                onChange={(e) => handleParamChange(field.key, e.target.value)}
                            />
                        ) : (
                            <input
                                type={field.type}
                                className="input h-9"
                                placeholder={field.placeholder}
                                value={getParamValue(field.key)}
                                onChange={(e) => handleParamChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                            />
                        )}
                    </div>
                ))}

                {schema.fields.length === 0 && (
                    <div className="text-center py-8 text-tertiary">
                        <p className="text-sm">No parameters available</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-subtle space-y-2">
                <div className="flex gap-2">
                    <button
                        onClick={handleRerun}
                        className="btn btn-secondary flex-1 h-9"
                        disabled={data.status === 'running'}
                    >
                        <RotateCcw size={14} />
                        <span>Re-run</span>
                    </button>
                    <button
                        onClick={() => toggleNodeLock(nodeId)}
                        className={`btn h-9 px-3 ${data.locked ? 'btn-primary' : 'btn-secondary'}`}
                        title={data.locked ? 'Unlock output' : 'Lock output'}
                    >
                        {data.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                </div>
                <button
                    onClick={() => removeNode(nodeId)}
                    className="btn btn-ghost w-full h-9 text-red-500 hover:bg-red-500/10"
                >
                    Remove Node
                </button>
            </div>

            {/* Output Preview */}
            {data.output && (
                <div className="p-4 border-t border-subtle">
                    <h4 className="text-xs font-medium text-secondary mb-2">Output Preview</h4>
                    <pre className="text-[10px] text-tertiary bg-bg-app p-2 rounded-lg overflow-auto max-h-[100px]">
                        {JSON.stringify(data.output, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
