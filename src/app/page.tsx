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
      <div className="relative isolate flex flex-col gap-8 mb-12 pt-4">
        {/* Background Mesh Gradient */}
        <div className="absolute -top-20 -left-20 -right-20 h-64 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent blur-3xl -z-10 opacity-60" />

        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div className="flex items-center gap-5">
            <div className="
              relative group
              w-14 h-14 rounded-2xl
              bg-gradient-to-br from-violet-600 to-indigo-600
              shadow-lg shadow-violet-500/20
              flex items-center justify-center
              transform transition-all duration-300 hover:scale-105 hover:rotate-3
            ">
              <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Layers size={28} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Spaces</h1>
              <p className="text-[var(--text-secondary)] mt-1 font-medium">
                Your creative workspaces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Global Search */}
            <div className="group relative w-full md:w-80">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
              <input
                type="text"
                placeholder="Search spaces, assets, results..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full h-11 pl-10 pr-4 rounded-xl
                  bg-[var(--bg-card)]/50 backdrop-blur-sm
                  border border-[var(--border-subtle)]
                  text-sm text-[var(--text-primary)]
                  placeholder:text-[var(--text-tertiary)]
                  shadow-sm
                  focus:outline-none focus:border-[var(--accent-primary)]/50 focus:ring-4 focus:ring-[var(--accent-primary)]/10
                  focus:bg-[var(--bg-card)]
                  transition-all duration-200
                "
              />
            </div>

            <button
              className="
                h-11 px-6 rounded-xl
                bg-[var(--accent-primary)] text-white text-sm font-semibold
                hover:bg-[var(--accent-hover)]
                active:scale-95
                flex items-center gap-2
                transition-all duration-200
                shadow-lg shadow-[var(--accent-primary)]/25 hover:shadow-[var(--accent-primary)]/40
              "
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>New Space</span>
            </button>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Start with a Template</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Quick start workflows to jumpstart your creativity</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards ease-out">
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
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Recent Spaces
                <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-tertiary)]">
                  {spaces.length}
                </span>
              </h2>
              <p className="text-sm text-[var(--text-tertiary)]">Pick up where you left off</p>
            </div>
          </div>
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
                        animate-in fade-in zoom-in-95 duration-500
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards ease-out delay-100">
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
