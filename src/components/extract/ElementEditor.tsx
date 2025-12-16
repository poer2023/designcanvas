'use client';

import { useState } from 'react';
import { X, Tag, Save, Loader2 } from 'lucide-react';
import type { BoundingBox, SelectionPath } from '@/types/element';

interface ElementEditorProps {
    imageUrl: string;
    selection: SelectionPath;
    bbox: BoundingBox;
    posterId: string;
    projectId: string;
    onSave: (data: { semantic_tag?: string; note?: string }) => Promise<void>;
    onCancel: () => void;
}

const SUGGESTED_TAGS = [
    'background', 'text', 'logo', 'person', 'object',
    'pattern', 'shape', 'photo', 'illustration', 'icon'
];

export default function ElementEditor({
    imageUrl,
    selection,
    bbox,
    posterId,
    projectId,
    onSave,
    onCancel,
}: ElementEditorProps) {
    const [semanticTag, setSemanticTag] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                semantic_tag: semanticTag || undefined,
                note: note || undefined,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dialog-overlay" onClick={onCancel}>
            <div className="dialog-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="heading-lg">Save Element</h2>
                    <button onClick={onCancel} className="text-tertiary hover:text-primary">
                        <X size={20} />
                    </button>
                </div>

                {/* Preview */}
                <div className="mb-6">
                    <div
                        className="bg-bg-hover rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ height: Math.min(200, bbox.height * (300 / bbox.width)) }}
                    >
                        <div
                            className="relative"
                            style={{
                                width: Math.min(300, bbox.width),
                                height: Math.min(200, bbox.height * (300 / bbox.width)),
                            }}
                        >
                            <img
                                src={imageUrl}
                                alt="Selected element"
                                className="absolute"
                                style={{
                                    transform: `translate(-${bbox.x}px, -${bbox.y}px)`,
                                    clip: `rect(${bbox.y}px, ${bbox.x + bbox.width}px, ${bbox.y + bbox.height}px, ${bbox.x}px)`,
                                }}
                            />
                        </div>
                    </div>
                    <div className="text-xs text-tertiary text-center mt-2">
                        {bbox.width} × {bbox.height} pixels
                    </div>
                </div>

                {/* Semantic Tag */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                        <Tag size={14} className="inline mr-1" />
                        Semantic Tag
                    </label>
                    <input
                        type="text"
                        className="input h-10 mb-2"
                        placeholder="e.g., background, logo, person"
                        value={semanticTag}
                        onChange={(e) => setSemanticTag(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1">
                        {SUGGESTED_TAGS.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setSemanticTag(tag)}
                                className={`
                  px-2 py-1 rounded text-xs transition-colors
                  ${semanticTag === tag
                                        ? 'bg-accent-subtle text-accent-primary'
                                        : 'bg-bg-hover text-secondary hover:text-primary'}
                `}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                        Notes (optional)
                    </label>
                    <textarea
                        className="input min-h-[80px] resize-none"
                        placeholder="Why you liked this element, how you plan to use it..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save to Library</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
