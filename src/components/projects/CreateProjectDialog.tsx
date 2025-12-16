'use client';

import { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';

interface CreateProjectDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string }) => void;
    loading?: boolean;
}

export default function CreateProjectDialog({
    open,
    onClose,
    onSubmit,
    loading = false,
}: CreateProjectDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), description: description.trim() || undefined });
        setName('');
        setDescription('');
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="
                    w-full max-w-md mx-4
                    bg-[var(--bg-panel)] border border-[var(--border-subtle)]
                    rounded-2xl shadow-2xl
                    animate-in fade-in zoom-in-95 duration-200
                "
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                            <FolderPlus size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Project</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">Create a new poster design project</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Poster"
                            className="
                                w-full h-11 px-4 rounded-lg
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-[var(--text-primary)] text-sm
                                placeholder:text-[var(--text-tertiary)]
                                focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]
                                transition-all
                            "
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                            Description <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your project..."
                            rows={3}
                            className="
                                w-full px-4 py-3 rounded-lg resize-none
                                bg-[var(--bg-input)] border border-[var(--border-default)]
                                text-[var(--text-primary)] text-sm
                                placeholder:text-[var(--text-tertiary)]
                                focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]
                                transition-all
                            "
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="
                                px-4 h-10 rounded-lg text-sm font-medium
                                text-[var(--text-secondary)]
                                hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
                                transition-colors
                            "
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="
                                px-5 h-10 rounded-lg text-sm font-medium
                                bg-[var(--accent-primary)] text-white
                                hover:bg-[var(--accent-hover)]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                flex items-center gap-2
                                transition-colors
                            "
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
