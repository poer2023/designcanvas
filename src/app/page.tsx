'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen } from 'lucide-react';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectDialog from '@/components/projects/CreateProjectDialog';
import type { Project } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

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

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="heading-xl mb-1">Projects</h1>
          <p className="text-secondary">Manage your creative poster sessions</p>
        </div>
        <button
          className="btn btn-primary h-10 px-4 shadow-lg shadow-blue-500/20"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-subtle rounded-xl bg-card/50">
          <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center text-tertiary mb-4">
            <FolderOpen size={32} />
          </div>
          <h3 className="heading-md mb-2">No projects yet</h3>
          <p className="text-secondary max-w-sm mb-6">
            Create your first project to start designing amazing posters with AI assistance.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateDialog(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid-responsive">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`/projects/${project.id}`)}
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
