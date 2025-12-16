'use client';

import { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

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
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-panel relative" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-tertiary hover:text-primary transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                        <FolderPlus size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-primary">New Project</h2>
                        <p className="text-sm text-secondary">Start a new poster design journey</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">
                            Project Name
                        </label>
                        <input
                            type="text"
                            className="input h-10"
                            placeholder="e.g. Summer Music Festival"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">
                            Description <span className="text-tertiary font-normal">(Optional)</span>
                        </label>
                        <textarea
                            className="input min-h-[100px] resize-none"
                            placeholder="Briefly describe what you want to create..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary min-w-[100px]"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
