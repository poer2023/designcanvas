'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Layers, Sparkles, Loader2, Trash2 } from 'lucide-react';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import type { Project } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { getBuiltInSpaceTemplate } from '@/lib/builtInTemplates';
import { importTemplate } from '@/lib/templateUtils';

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const { t } = useTranslation();

  // Template data with translation keys
  const templates = [
    { id: 'poster-batch', nameKey: 'spaces.templateItems.posterBatch.name', descKey: 'spaces.templateItems.posterBatch.description', tags: ['general', 'multi-poster'] },
    { id: 'music-festival', nameKey: 'spaces.templateItems.musicFestival.name', descKey: 'spaces.templateItems.musicFestival.description', tags: ['music', 'festival'] },
    { id: 'tech-promo', nameKey: 'spaces.templateItems.techPromo.name', descKey: 'spaces.templateItems.techPromo.description', tags: ['tech', 'promo'] },
    { id: 'social-story', nameKey: 'spaces.templateItems.socialStory.name', descKey: 'spaces.templateItems.socialStory.description', tags: ['social', 'story'] },
  ];

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
        setSpaces(prev => [data.data, ...prev]);
        setShowCreateDialog(false);
        router.push(`/projects/${data.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create space:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleUseTemplate(templateId: string, name: string, description: string) {
    if (creating) return;
    setCreating(true);

    try {
      const template = getBuiltInSpaceTemplate(templateId);
      if (!template) {
        setShowCreateDialog(true);
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await response.json();
      if (!data.success) return;

      const project = data.data as Project;
      setSpaces(prev => [project, ...prev]);

      const { nodes, edges } = importTemplate(template, {
        targetViewport: template.graph.viewport || { x: 0, y: 0, zoom: 1 },
        offsetX: 0,
        offsetY: 0,
      });

      await fetch(`/api/projects/${project.id}/graph`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph_snapshot: { nodes, edges },
          viewport: template.graph.viewport || { x: 0, y: 0, zoom: 1 },
          force: true,
        }),
      });

      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error('Failed to create space from template:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSpace(id: string) {
    if (!confirm(t('spaces.deleteConfirm'))) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setSpaces(spaces.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete space:', error);
    }
  }

  return (
    <>
      {/* Header - matching Settings page style */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{t('spaces.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{t('spaces.description')}</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="
                        h-9 px-4 rounded-lg text-sm font-medium
                        bg-[var(--accent-primary)] text-white
                        hover:bg-[var(--accent-hover)]
                        flex items-center gap-2
                        transition-colors
                    "
        >
          <Plus size={16} />
          {t('spaces.newSpace')}
        </button>
      </div>

      <div className="max-w-5xl space-y-8">
        {/* Templates Section */}
        <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Sparkles size={16} className="text-violet-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('spaces.templates.title')}</h2>
              <p className="text-xs text-[var(--text-tertiary)]">{t('spaces.templates.description')}</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template.id, t(template.nameKey), t(template.descKey))}
                  disabled={creating}
                  className="
                                        p-4 rounded-xl border border-[var(--border-subtle)]
                                        bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]
                                        text-left transition-colors
                                        group
                                    "
                >
                  <div className="font-medium text-sm text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-primary)]">
                    {t(template.nameKey)}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mb-3">
                    {t(template.descKey)}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {template.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Spaces Section */}
        <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <Layers size={16} className="text-teal-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('spaces.recentSpaces.title')}
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[var(--bg-hover)] text-xs font-medium text-[var(--text-tertiary)]">
                  {spaces.length}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">{t('spaces.recentSpaces.description')}</p>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : spaces.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
                  <Layers size={24} className="text-[var(--text-tertiary)]" />
                </div>
                <h3 className="font-medium text-[var(--text-primary)] mb-2">{t('spaces.noSpaces')}</h3>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">
                  {t('spaces.noSpacesHint')}
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="
                                        h-9 px-4 rounded-lg text-sm font-medium
                                        bg-[var(--accent-primary)] text-white
                                        hover:bg-[var(--accent-hover)]
                                        transition-colors
                                    "
                >
                  {t('spaces.createSpace')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {spaces.map(space => (
                  <div
                    key={space.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => router.push(`/projects/${space.id}`)}
                      className="
                                                w-full p-4 rounded-xl border border-[var(--border-subtle)]
                                                bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]
                                                text-left transition-colors
                                            "
                    >
                      {/* Cover */}
                      <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 mb-3 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">
                          {space.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate mb-1">
                        {space.name}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {new Date(space.updated_at).toLocaleDateString()}
                      </div>
                    </button>
                    {/* Actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpace(space.id);
                      }}
                      className="
                                                absolute top-2 right-2
                                                p-1.5 rounded-lg
                                                bg-[var(--bg-panel)]/80 backdrop-blur-sm
                                                text-[var(--text-tertiary)] hover:text-red-500
                                                opacity-0 group-hover:opacity-100
                                                transition-all
                                            "
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateSpace}
        loading={creating}
      />
    </>
  );
}
