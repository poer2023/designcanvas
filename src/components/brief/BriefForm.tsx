'use client';

import { useState } from 'react';
import { FileText, X, ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import type { Brief } from '@/types';

interface BriefFormProps {
    projectId: string;
    onSubmit: (brief: Partial<Brief>) => void;
    initialData?: Partial<Brief>;
}

const TONE_OPTIONS = ['energetic', 'elegant', 'playful', 'professional', 'minimalist', 'bold', 'subtle'];

const PRESET_SIZES = [
    { name: 'Instagram Post', width: 1080, height: 1080 },
    { name: 'Instagram Story', width: 1080, height: 1920 },
    { name: 'Facebook Post', width: 1200, height: 630 },
    { name: 'Twitter Post', width: 1200, height: 675 },
    { name: 'A4 Portrait', width: 2480, height: 3508 },
    { name: 'A4 Landscape', width: 3508, height: 2480 },
    { name: 'HD Poster', width: 1920, height: 1080 },
    { name: 'Custom', width: 0, height: 0 },
];

export default function BriefForm({ projectId, onSubmit, initialData }: BriefFormProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
    const [infoArea, setInfoArea] = useState(initialData?.info_area || '');
    const [width, setWidth] = useState(initialData?.size?.width || 1080);
    const [height, setHeight] = useState(initialData?.size?.height || 1920);
    const [selectedPreset, setSelectedPreset] = useState('Instagram Story');
    const [tone, setTone] = useState<string>(initialData?.tone_weights ? Object.keys(initialData.tone_weights)[0] : 'professional');
    const [brandColors, setBrandColors] = useState<string[]>(initialData?.brand_colors || ['#3B82F6']);
    const [bannedColors, setBannedColors] = useState<string[]>(initialData?.banned_colors || []);
    const [layoutStrategy, setLayoutStrategy] = useState(initialData?.layout_strategy || 'centered');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handlePresetChange = (presetName: string) => {
        setSelectedPreset(presetName);
        const preset = PRESET_SIZES.find(p => p.name === presetName);
        if (preset && preset.width > 0) {
            setWidth(preset.width);
            setHeight(preset.height);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            project_id: projectId,
            title,
            subtitle: subtitle || undefined,
            info_area: infoArea || undefined,
            size: { width, height },
            tone_weights: { [tone]: 1 },
            brand_colors: brandColors,
            banned_colors: bannedColors.length > 0 ? bannedColors : undefined,
            layout_strategy: layoutStrategy,
        });
    };

    const addColor = (colorArray: string[], setColors: (c: string[]) => void) => {
        setColors([...colorArray, '#888888']);
    };

    const updateColor = (colorArray: string[], setColors: (c: string[]) => void, index: number, value: string) => {
        const newColors = [...colorArray];
        newColors[index] = value;
        setColors(newColors);
    };

    const removeColor = (colorArray: string[], setColors: (c: string[]) => void, index: number) => {
        setColors(colorArray.filter((_, i) => i !== index));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Size Presets */}
            <div>
                <label className="block text-sm font-medium text-secondary mb-2">Poster Size</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {PRESET_SIZES.slice(0, 4).map(preset => (
                        <button
                            key={preset.name}
                            type="button"
                            onClick={() => handlePresetChange(preset.name)}
                            className={`p-2 rounded-lg text-xs text-center border transition-colors ${selectedPreset === preset.name
                                    ? 'border-accent-primary bg-accent-subtle text-accent-primary'
                                    : 'border-subtle hover:border-default'
                                }`}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="block text-xs text-tertiary mb-1">Width (px)</label>
                        <input
                            type="number"
                            className="input h-9"
                            value={width}
                            onChange={(e) => { setWidth(Number(e.target.value)); setSelectedPreset('Custom'); }}
                        />
                    </div>
                    <div className="flex items-end pb-1 text-tertiary">×</div>
                    <div className="flex-1">
                        <label className="block text-xs text-tertiary mb-1">Height (px)</label>
                        <input
                            type="number"
                            className="input h-9"
                            value={height}
                            onChange={(e) => { setHeight(Number(e.target.value)); setSelectedPreset('Custom'); }}
                        />
                    </div>
                </div>
            </div>

            {/* Text Content */}
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Main Title *</label>
                    <input
                        type="text"
                        className="input h-10"
                        placeholder="Summer Music Festival 2024"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Subtitle</label>
                    <input
                        type="text"
                        className="input h-10"
                        placeholder="Join us for an unforgettable experience"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">Additional Info</label>
                    <textarea
                        className="input min-h-[80px] resize-none"
                        placeholder="Date, location, ticket info..."
                        value={infoArea}
                        onChange={(e) => setInfoArea(e.target.value)}
                    />
                </div>
            </div>

            {/* Tone */}
            <div>
                <label className="block text-sm font-medium text-secondary mb-2">Tone</label>
                <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTone(t)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${tone === t
                                    ? 'bg-accent-primary text-white'
                                    : 'bg-bg-hover text-secondary hover:bg-active'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Brand Colors */}
            <div>
                <label className="block text-sm font-medium text-secondary mb-2">Brand Colors</label>
                <div className="flex flex-wrap gap-2 items-center">
                    {brandColors.map((color, i) => (
                        <div key={i} className="relative group">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => updateColor(brandColors, setBrandColors, i, e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-subtle"
                            />
                            <button
                                type="button"
                                onClick={() => removeColor(brandColors, setBrandColors, i)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => addColor(brandColors, setBrandColors)}
                        className="w-10 h-10 rounded-lg border-2 border-dashed border-subtle text-tertiary hover:border-accent-primary hover:text-accent-primary transition-colors flex items-center justify-center"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Advanced Options */}
            <div className="border border-subtle rounded-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-bg-hover hover:bg-active transition-colors"
                >
                    <span className="text-sm font-medium text-secondary">Advanced Options</span>
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showAdvanced && (
                    <div className="p-4 space-y-4 border-t border-subtle">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2">Layout Strategy</label>
                            <select
                                className="input h-9"
                                value={layoutStrategy}
                                onChange={(e) => setLayoutStrategy(e.target.value)}
                            >
                                <option value="centered">Centered</option>
                                <option value="asymmetric">Asymmetric</option>
                                <option value="grid">Grid</option>
                                <option value="freeform">Freeform</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2">Banned Colors</label>
                            <div className="flex flex-wrap gap-2 items-center">
                                {bannedColors.map((color, i) => (
                                    <div key={i} className="relative group">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => updateColor(bannedColors, setBannedColors, i, e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border border-subtle"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeColor(bannedColors, setBannedColors, i)}
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addColor(bannedColors, setBannedColors)}
                                    className="w-8 h-8 rounded border-2 border-dashed border-subtle text-tertiary hover:border-red-500 hover:text-red-500 transition-colors flex items-center justify-center text-xs"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
                <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
                    Save Brief
                </button>
            </div>
        </form>
    );
}

// Brief Card for displaying saved briefs
export function BriefCard({
    brief,
    onEdit,
    onDelete,
    onDuplicate
}: {
    brief: Brief;
    onEdit?: () => void;
    onDelete?: () => void;
    onDuplicate?: () => void;
}) {
    return (
        <div className="card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <FileText size={18} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">{brief.title}</h4>
                        <span className="text-xs text-tertiary">
                            {brief.size.width} × {brief.size.height}
                        </span>
                    </div>
                </div>
                <div className="flex gap-1">
                    {onDuplicate && (
                        <button onClick={onDuplicate} className="p-1.5 text-tertiary hover:text-primary rounded hover:bg-bg-hover">
                            <Copy size={14} />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} className="p-1.5 text-tertiary hover:text-red-500 rounded hover:bg-red-500/10">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {brief.subtitle && (
                <p className="text-sm text-secondary mb-2 line-clamp-1">{brief.subtitle}</p>
            )}

            {brief.brand_colors && brief.brand_colors.length > 0 && (
                <div className="flex gap-1">
                    {brief.brand_colors.slice(0, 5).map((color, i) => (
                        <div
                            key={i}
                            className="w-5 h-5 rounded-full border border-white/20"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
