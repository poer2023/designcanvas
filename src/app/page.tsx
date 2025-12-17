'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Layers, Sparkles } from 'lucide-react';
import SpaceCard from '@/components/spaces/SpaceCard';
import TemplateCard, { defaultTemplates } from '@/components/spaces/TemplateCard';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import type { Project } from '@/types';

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSpaces();
  }, []);

  async function fetchSpaces() {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setSpaces(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch spaces:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSpace(formData: { name: string; description?: string }) {
    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setSpaces([data.data, ...spaces]);
        setShowCreateDialog(false);
        router.push(`/projects/${data.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create space:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSpace(id: string) {
    if (!confirm('Are you sure you want to delete this space?')) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setSpaces(spaces.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete space:', error);
    }
  }

  function handleUseTemplate(templateId: string) {
    // For now, create a new space. Future: copy template graph
    setShowCreateDialog(true);
  }

  const filteredSpaces = spaces.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Spaces</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Your creative workspaces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search spaces, assets, results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                                    w-72 h-10 pl-9 pr-4 rounded-xl
                                    bg-[var(--bg-input)] border border-[var(--border-subtle)]
                                    text-sm text-[var(--text-primary)]
                                    placeholder:text-[var(--text-tertiary)]
                                    focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/20
                                    transition-all
                                "
              />
            </div>

            <button
              className="
                                h-10 px-4 rounded-xl
                                bg-[var(--accent-primary)] text-white text-sm font-medium
                                hover:bg-[var(--accent-hover)]
                                flex items-center gap-2
                                transition-colors shadow-lg shadow-[var(--accent-primary)]/20
                            "
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus size={16} />
              <span>New Space</span>
            </button>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Templates</h2>
          <span className="text-xs text-[var(--text-tertiary)] ml-1">Quick start workflows</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {defaultTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template.id)}
            />
          ))}
        </div>
      </section>

      {/* Recent Spaces Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            Recent Spaces
            <span className="text-sm font-normal text-[var(--text-tertiary)] ml-2">
              ({spaces.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
          </div>
        ) : filteredSpaces.length === 0 ? (
          <div className="
                        flex flex-col items-center justify-center py-20 text-center
                        border border-dashed border-[var(--border-subtle)] rounded-2xl
                        bg-[var(--bg-card)]/30
                    ">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
              <Layers size={28} />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchQuery ? 'No matching spaces' : 'No spaces yet'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first space or start from a template above.'}
            </p>
            {!searchQuery && (
              <button
                className="
                                    h-10 px-5 rounded-xl
                                    bg-[var(--accent-primary)] text-white text-sm font-medium
                                    hover:bg-[var(--accent-hover)]
                                    transition-colors
                                "
                onClick={() => setShowCreateDialog(true)}
              >
                Create Space
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredSpaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                onClick={() => router.push(`/projects/${space.id}`)}
                onDelete={() => handleDeleteSpace(space.id)}
              />
            ))}
          </div>
        )}
      </section>

      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateSpace}
        loading={creating}
      />
    </>
  );
}
