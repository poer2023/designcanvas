'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Search } from 'lucide-react';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import type { Project } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(formData: { name: string; description?: string }) {
    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setProjects([data.data, ...projects]);
        setShowCreateDialog(false);
        router.push(`/projects/${data.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Projects</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-64 h-9 pl-9 pr-4 rounded-lg
                bg-[var(--bg-input)] border border-[var(--border-subtle)]
                text-sm text-[var(--text-primary)]
                placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[var(--accent-primary)]
                transition-colors
              "
            />
          </div>

          <button
            className="
              h-9 px-4 rounded-lg
              bg-[var(--accent-primary)] text-white text-sm font-medium
              hover:bg-[var(--accent-hover)]
              flex items-center gap-2
              transition-colors
            "
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="
          flex flex-col items-center justify-center py-24 text-center
          border border-dashed border-[var(--border-subtle)] rounded-2xl
          bg-[var(--bg-card)]/30
        ">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
            <FolderOpen size={28} />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first project to start designing amazing posters with AI assistance.'}
          </p>
          {!searchQuery && (
            <button
              className="
                h-10 px-5 rounded-lg
                bg-[var(--accent-primary)] text-white text-sm font-medium
                hover:bg-[var(--accent-hover)]
                transition-colors
              "
              onClick={() => setShowCreateDialog(true)}
            >
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${project.id}`)}
              onDelete={() => handleDeleteProject(project.id)}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateProject}
        loading={creating}
      />
    </>
  );
}

