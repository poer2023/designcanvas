'use client';

import { useState } from 'react';
import { X, Download, FileImage, FileText, Package } from 'lucide-react';
import type { ExportOptions } from '@/types/compose';

interface ExportDialogProps {
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    isExporting: boolean;
}

export default function ExportDialog({ onClose, onExport, isExporting }: ExportDialogProps) {
    const [format, setFormat] = useState<'png' | 'jpg' | 'pdf'>('png');
    const [quality, setQuality] = useState(100);
    const [scale, setScale] = useState(1);
    const [includeAssets, setIncludeAssets] = useState(true);
    const [includeRecipe, setIncludeRecipe] = useState(true);

    const handleExport = () => {
        onExport({
            format,
            quality,
            scale,
            include_assets: includeAssets,
            include_recipe: includeRecipe,
        });
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-panel max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="heading-lg">Export Poster</h2>
                    <button onClick={onClose} className="text-tertiary hover:text-primary">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Format</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['png', 'jpg', 'pdf'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFormat(f)}
                                    className={`
                    p-3 rounded-lg border text-center transition-colors
                    ${format === f
                                            ? 'border-accent-primary bg-accent-subtle'
                                            : 'border-subtle hover:border-default'}
                  `}
                                >
                                    <FileImage size={20} className="mx-auto mb-1" />
                                    <span className="text-xs font-medium uppercase">{f}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quality (for JPG) */}
                    {format === 'jpg' && (
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2">
                                Quality: {quality}%
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={quality}
                                onChange={(e) => setQuality(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Scale */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Scale</label>
                        <div className="flex gap-2">
                            {[1, 2, 3].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setScale(s)}
                                    className={`
                    flex-1 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${scale === s
                                            ? 'border-accent-primary bg-accent-subtle'
                                            : 'border-subtle hover:border-default'}
                  `}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Include Options */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeAssets}
                                onChange={(e) => setIncludeAssets(e.target.checked)}
                                className="w-4 h-4 rounded border-subtle"
                            />
                            <div className="flex items-center gap-2">
                                <Package size={16} className="text-tertiary" />
                                <span className="text-sm">Include asset files</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeRecipe}
                                onChange={(e) => setIncludeRecipe(e.target.checked)}
                                className="w-4 h-4 rounded border-subtle"
                            />
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-tertiary" />
                                <span className="text-sm">Include recipe.json</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Export</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
