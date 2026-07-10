'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUp,
  Clock3,
  FolderOpen,
  Home,
  Layers3,
  LoaderCircle,
  Monitor,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { getDesktopBridge } from '@/lib/desktop/bridge';
import type { DesktopProject } from '@/lib/desktop/types';
import styles from './home.module.css';

function projectTitleFromPrompt(prompt: string) {
  const firstPhrase = prompt.split(/[，。！？!?\n]/)[0]?.trim();
  return firstPhrase?.slice(0, 28) || `新项目 ${new Date().toLocaleDateString('zh-CN')}`;
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DesktopProject[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDesktopBridge().listProjects()
      .then((items) => {
        if (!cancelled) setProjects(items);
      })
      .catch((error) => console.error('Failed to load projects:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const createProject = async (initialPrompt?: string) => {
    if (creating) return;
    const cleanPrompt = initialPrompt?.trim() || '';
    setCreating(true);
    try {
      const project = await getDesktopBridge().createProject({
        name: projectTitleFromPrompt(cleanPrompt),
        description: cleanPrompt || undefined,
      });
      router.push(`/projects/${project.id}/canvas`);
    } catch (error) {
      console.error('Failed to create project:', error);
      setCreating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!window.confirm('删除这个项目？此操作不可撤销。')) return;
    try {
      await getDesktopBridge().deleteProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <div className={styles.app}>
      <aside className={styles.rail} aria-label="主导航">
        <div className={styles.brandMark}><Layers3 size={18} /></div>
        <button type="button" className={styles.railButton} data-active aria-label="主页" title="主页">
          <Home size={18} />
        </button>
        <button
          type="button"
          className={styles.railButton}
          aria-label="项目"
          title="项目"
          onClick={() => document.getElementById('recent-projects')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <FolderOpen size={18} />
        </button>
        <div className={styles.railSpacer} />
        <div className={styles.localStatus} title="本地工作区"><Monitor size={16} /></div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.wordmark}>DesignCanvas</div>
          <div className={styles.workspaceBadge}>
            <span />
            Local workspace
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.start}>
            <div className={styles.kicker}><Sparkles size={14} /> DESIGN WORKSPACE</div>
            <h1>把想法放到画布上</h1>
            <p>从一句目标开始，在同一张无限画布里完成简报、生成、素材整理与设计任务。</p>

            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                void createProject(prompt);
              }}
            >
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="描述你要完成的设计，例如：为新品发布制作一组社交媒体视觉"
                rows={3}
                aria-label="项目目标"
              />
              <div className={styles.composerFooter}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => void createProject()}
                  disabled={creating}
                  aria-label="创建空白项目"
                  title="创建空白项目"
                >
                  <Plus size={18} />
                </button>
                <div className={styles.composerHint}>Brief · Generate · Assets · Tasks</div>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={creating || !prompt.trim()}
                  aria-label="开始"
                  title="开始"
                >
                  {creating ? <LoaderCircle className={styles.spin} size={18} /> : <ArrowUp size={18} />}
                </button>
              </div>
            </form>
          </section>

          <section id="recent-projects" className={styles.projects}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>最近项目</h2>
                <span>{projects.length} 个本地项目</span>
              </div>
              <button type="button" className={styles.newProjectButton} onClick={() => void createProject()} disabled={creating}>
                <Plus size={16} />
                新建项目
              </button>
            </div>

            {loading ? (
              <div className={styles.emptyState}><LoaderCircle className={styles.spin} size={22} /></div>
            ) : projects.length === 0 ? (
              <button type="button" className={styles.emptyState} onClick={() => void createProject()}>
                <Plus size={20} />
                创建第一个画布
              </button>
            ) : (
              <div className={styles.projectGrid}>
                {projects.map((project, index) => (
                  <article key={project.id} className={styles.projectCard}>
                    <button
                      type="button"
                      className={styles.projectOpen}
                      onClick={() => router.push(`/projects/${project.id}/canvas`)}
                    >
                      <div className={styles.projectPreview} data-tone={index % 4}>
                        <span className={styles.previewCardOne} />
                        <span className={styles.previewCardTwo} />
                        <span className={styles.previewDot} />
                      </div>
                      <div className={styles.projectMeta}>
                        <strong>{project.name}</strong>
                        <span><Clock3 size={12} /> {new Date(project.updated_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => void deleteProject(project.id)}
                      aria-label={`删除 ${project.name}`}
                      title="删除项目"
                    >
                      <Trash2 size={15} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
