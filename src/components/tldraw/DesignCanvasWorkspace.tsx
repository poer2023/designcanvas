'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardList,
  Frame,
  Hand,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Maximize2,
  MousePointer2,
  PenLine,
  Redo2,
  Send,
  Sparkles,
  StickyNote,
  Type,
  Undo2,
  Workflow,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Tldraw,
  createShapeId,
  getSnapshot,
  type Editor,
  type TLEditorSnapshot,
} from 'tldraw';
import { getDesktopBridge } from '@/lib/desktop/bridge';
import type { DesktopCanvasDocument, DesktopProject } from '@/lib/desktop/types';
import {
  DESIGN_CARD_TYPE,
  designCardShapeUtils,
  type DesignCardKind,
  type DesignCardShape,
} from './DesignCardShape';

type SaveStatus = 'saved' | 'saving' | 'error' | 'conflict';

const TLDRAW_SCHEMA_VERSION = 'tldraw-4.5';
const tldrawLicenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const tldrawOptions = { maxPages: 1 } as const;

const cardPresets: Record<DesignCardKind, Pick<DesignCardShape['props'], 'title' | 'body' | 'eyebrow'>> = {
  brief: {
    title: '视觉任务简报',
    eyebrow: 'PROJECT INPUT',
    body: '品牌目标、受众、尺寸与不可违背的约束。',
  },
  note: {
    title: '设计笔记',
    eyebrow: 'WORKING NOTE',
    body: '记录判断、反馈与下一步动作。',
  },
  asset: {
    title: '素材集合',
    eyebrow: 'LOCAL ASSETS',
    body: '图片、字体、视频与可复用设计元素。',
  },
  task: {
    title: '执行任务',
    eyebrow: 'AGENT TASK',
    body: '可运行、可追踪、可复用的设计动作。',
  },
};

function createCard(
  editor: Editor,
  kind: DesignCardKind,
  offset = { x: 0, y: 0 },
  overrides?: Partial<Pick<DesignCardShape['props'], 'title' | 'body' | 'eyebrow'>>
) {
  const id = createShapeId();
  const center = editor.getViewportPageBounds().center;
  editor.createShape<DesignCardShape>({
    id,
    type: DESIGN_CARD_TYPE,
    x: center.x - 160 + offset.x,
    y: center.y - 94 + offset.y,
    props: {
      ...cardPresets[kind],
      ...overrides,
      kind,
      w: 320,
      h: 188,
    },
  });
  editor.select(id);
  editor.setCurrentTool('select');
}

function seedCanvas(editor: Editor) {
  const seeds: Array<{ kind: DesignCardKind; x: number; y: number }> = [
    { kind: 'brief', x: -380, y: -110 },
    { kind: 'asset', x: 0, y: -110 },
    { kind: 'task', x: 380, y: -110 },
    { kind: 'note', x: 0, y: 130 },
  ];

  editor.createShapes<DesignCardShape>(seeds.map(({ kind, x, y }) => ({
    id: createShapeId(),
    type: DESIGN_CARD_TYPE,
    x,
    y,
    props: {
      ...cardPresets[kind],
      kind,
      w: 320,
      h: 188,
    },
  })));
  editor.zoomToFit({ animation: { duration: 240 } });
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="dc-tool-button"
      data-active={active || undefined}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active ? true : undefined}
    >
      {children}
    </button>
  );
}

function CanvasControls({ editor }: { editor: Editor }) {
  const [canvasState, setCanvasState] = useState(() => ({
    tool: editor.getCurrentToolId(),
    zoom: editor.getZoomLevel(),
    canUndo: editor.canUndo(),
    canRedo: editor.canRedo(),
  }));

  useEffect(() => editor.store.listen(() => {
    const next = {
      tool: editor.getCurrentToolId(),
      zoom: editor.getZoomLevel(),
      canUndo: editor.canUndo(),
      canRedo: editor.canRedo(),
    };
    setCanvasState((current) => (
      current.tool === next.tool
      && current.zoom === next.zoom
      && current.canUndo === next.canUndo
      && current.canRedo === next.canRedo
        ? current
        : next
    ));
  }, { scope: 'all' }), [editor]);

  const setCurrentTool = (nextTool: string) => {
    editor.setCurrentTool(nextTool);
  };

  const { tool, zoom, canUndo, canRedo } = canvasState;

  return (
    <>
      <div className="dc-history-controls">
        <ToolButton label="撤销" disabled={!canUndo} onClick={() => editor.undo()}>
          <Undo2 size={17} />
        </ToolButton>
        <ToolButton label="重做" disabled={!canRedo} onClick={() => editor.redo()}>
          <Redo2 size={17} />
        </ToolButton>
      </div>

      <div className="dc-canvas-toolbar" role="toolbar" aria-label="画布工具">
        <ToolButton label="选择" active={tool === 'select'} onClick={() => setCurrentTool('select')}>
          <MousePointer2 size={18} />
        </ToolButton>
        <ToolButton label="抓手" active={tool === 'hand'} onClick={() => setCurrentTool('hand')}>
          <Hand size={18} />
        </ToolButton>
        <span className="dc-toolbar-divider" />
        <ToolButton label="任务简报" onClick={() => createCard(editor, 'brief')}>
          <ClipboardList size={18} />
        </ToolButton>
        <ToolButton label="设计笔记" onClick={() => createCard(editor, 'note')}>
          <StickyNote size={18} />
        </ToolButton>
        <ToolButton label="素材集合" onClick={() => createCard(editor, 'asset')}>
          <ImagePlus size={18} />
        </ToolButton>
        <ToolButton label="执行任务" onClick={() => createCard(editor, 'task')}>
          <Sparkles size={18} />
        </ToolButton>
        <span className="dc-toolbar-divider" />
        <ToolButton label="画笔" active={tool === 'draw'} onClick={() => setCurrentTool('draw')}>
          <PenLine size={18} />
        </ToolButton>
        <ToolButton label="文字" active={tool === 'text'} onClick={() => setCurrentTool('text')}>
          <Type size={18} />
        </ToolButton>
        <ToolButton label="画框" active={tool === 'frame'} onClick={() => setCurrentTool('frame')}>
          <Frame size={18} />
        </ToolButton>
      </div>

      <div className="dc-zoom-controls">
        <ToolButton label="缩小" onClick={() => editor.zoomOut(editor.getViewportScreenCenter())}>
          <ZoomOut size={16} />
        </ToolButton>
        <span className="dc-zoom-value">{Math.round(zoom * 100)}%</span>
        <ToolButton label="放大" onClick={() => editor.zoomIn(editor.getViewportScreenCenter())}>
          <ZoomIn size={16} />
        </ToolButton>
        <ToolButton label="适合画布" onClick={() => editor.zoomToFit({ animation: { duration: 180 } })}>
          <Maximize2 size={16} />
        </ToolButton>
      </div>
    </>
  );
}

function SaveIndicator({ status, onForceSave }: { status: SaveStatus; onForceSave: () => void }) {
  const labels: Record<SaveStatus, string> = {
    saved: '已保存',
    saving: '保存中',
    error: '保存失败',
    conflict: '保存冲突',
  };
  const icon = status === 'saved'
    ? <Check size={14} />
    : status === 'saving'
      ? <LoaderCircle className="dc-spin" size={14} />
      : <AlertTriangle size={14} />;

  return (
    <button
      type="button"
      className="dc-save-indicator"
      data-status={status}
      onClick={status === 'conflict' ? onForceSave : undefined}
      disabled={status !== 'conflict'}
      aria-label={labels[status]}
      title={labels[status]}
    >
      {icon}
      <span>{labels[status]}</span>
    </button>
  );
}

function AgentPanel({ editor }: { editor: Editor | null }) {
  const tasks = ['整理画布', '提取风格', '生成版式', '检查一致性', '导出资产'];
  const [prompt, setPrompt] = useState('');

  const createTask = (title: string) => {
    if (!editor) return;
    createCard(editor, 'task', { x: 0, y: 0 }, {
      title,
      eyebrow: 'AGENT TASK',
      body: prompt.trim() || '等待执行',
    });
    setPrompt('');
  };

  return (
    <aside className="dc-agent-panel">
      <div className="dc-agent-header">
        <div>
          <span className="dc-agent-kicker">DESIGN AGENT</span>
          <h2>新任务</h2>
        </div>
        <div className="dc-agent-mark"><Sparkles size={16} /></div>
      </div>

      <div className="dc-agent-body">
        <div className="dc-task-title">设计任务</div>
        <div className="dc-task-grid">
          {tasks.map((task) => (
            <button
              key={task}
              type="button"
              className="dc-task-chip"
              disabled={!editor}
              onClick={() => createTask(task)}
            >
              {task}
            </button>
          ))}
        </div>
      </div>

      <div className="dc-composer">
        <textarea
          aria-label="设计任务"
          placeholder="输入设计目标..."
          rows={4}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="dc-composer-footer">
          <span className="dc-agent-mode">
            <Sparkles size={15} />
            Agent
          </span>
          <button
            type="button"
            className="dc-send-button"
            aria-label="发送"
            title="发送"
            disabled={!editor || !prompt.trim()}
            onClick={() => createTask(prompt.trim())}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function DesignCanvasWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<DesktopProject | null>(null);
  const [canvasDocument, setCanvasDocument] = useState<DesktopCanvasDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const versionRef = useRef(0);
  const dirtyRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const flushRequestedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const flushRef = useRef<((editor: Editor, force?: boolean) => Promise<void>) | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getDesktopBridge().getProject(projectId),
      getDesktopBridge().loadCanvasDocument(projectId),
    ]).then(([nextProject, nextDocument]) => {
      if (cancelled) return;
      if (!nextProject) {
        router.push('/');
        return;
      }
      setProject(nextProject);
      setCanvasDocument(nextDocument);
      versionRef.current = nextDocument?.version ?? 0;
    }).catch((error) => {
      console.error('Failed to load canvas:', error);
      if (!cancelled) router.push('/');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId, router]);

  const flushSave = useCallback(async (currentEditor: Editor, force = false) => {
    if (saveInFlightRef.current) {
      flushRequestedRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    dirtyRef.current = false;
    if (mountedRef.current) setSaveStatus('saving');
    try {
      const snapshot = getSnapshot(currentEditor.store) as unknown as Record<string, unknown>;
      const result = await getDesktopBridge().saveCanvasDocument({
        projectId,
        schemaVersion: TLDRAW_SCHEMA_VERSION,
        snapshot,
        baseVersion: versionRef.current,
        force,
      });

      if (result.conflict) {
        if (mountedRef.current) setSaveStatus('conflict');
      } else if (!result.success) {
        dirtyRef.current = true;
        if (mountedRef.current) setSaveStatus('error');
      } else {
        versionRef.current = result.version ?? versionRef.current;
        if (mountedRef.current) setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Failed to save canvas:', error);
      dirtyRef.current = true;
      if (mountedRef.current) setSaveStatus('error');
    } finally {
      saveInFlightRef.current = false;
      if (flushRequestedRef.current) {
        flushRequestedRef.current = false;
        saveTimerRef.current = window.setTimeout(() => {
          void flushRef.current?.(currentEditor);
        }, 250);
      }
    }
  }, [projectId]);

  useEffect(() => {
    flushRef.current = flushSave;
  }, [flushSave]);

  const queueSave = useCallback((currentEditor: Editor, delay = 650) => {
    dirtyRef.current = true;
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void flushRef.current?.(currentEditor);
    }, delay);
  }, []);

  const handleMount = useCallback((mountedEditor: Editor) => {
    listenerCleanupRef.current?.();
    setEditor(mountedEditor);
    if (!canvasDocument && mountedEditor.getCurrentPageShapes().length === 0) {
      seedCanvas(mountedEditor);
    }

    const removeDocumentListener = mountedEditor.store.listen(
      () => queueSave(mountedEditor),
      { source: 'user', scope: 'document' }
    );
    const removeSessionListener = mountedEditor.store.listen(
      () => queueSave(mountedEditor),
      { source: 'user', scope: 'session' }
    );
    listenerCleanupRef.current = () => {
      removeDocumentListener();
      removeSessionListener();
    };

    if (!canvasDocument) queueSave(mountedEditor, 0);
  }, [canvasDocument, queueSave]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden' && editor && dirtyRef.current) {
        void flushRef.current?.(editor);
      }
    };
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => document.removeEventListener('visibilitychange', flushWhenHidden);
  }, [editor]);

  useEffect(() => () => {
    listenerCleanupRef.current?.();
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    if (editor && dirtyRef.current) void flushRef.current?.(editor);
  }, [editor]);

  if (loading || !project) {
    return (
      <div className="dc-loading-screen">
        <LoaderCircle className="dc-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="dc-workspace">
      <header className="dc-topbar">
        <div className="dc-topbar-left">
          <button type="button" className="dc-topbar-icon" onClick={() => router.push('/')} aria-label="返回项目" title="返回项目">
            <ArrowLeft size={17} />
          </button>
          <div className="dc-product-mark"><Layers3 size={15} /></div>
          <div className="dc-project-name">{project.name}</div>
        </div>
        <div className="dc-topbar-right">
          <span className="dc-local-badge">LOCAL</span>
          <SaveIndicator
            status={saveStatus}
            onForceSave={() => editor && void flushSave(editor, true)}
          />
          <button type="button" className="dc-topbar-icon" onClick={() => router.push(`/projects/${projectId}`)} aria-label="执行图" title="执行图">
            <Workflow size={17} />
          </button>
        </div>
      </header>

      <div className="dc-workspace-body">
        <main className="dc-canvas-stage">
          <Tldraw
            hideUi
            licenseKey={tldrawLicenseKey}
            onMount={handleMount}
            shapeUtils={designCardShapeUtils}
            snapshot={canvasDocument?.snapshot as unknown as TLEditorSnapshot | undefined}
            options={tldrawOptions}
          />
          {editor ? <CanvasControls editor={editor} /> : null}
        </main>
        <AgentPanel editor={editor} />
      </div>
    </div>
  );
}
