'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Cable,
  Check,
  ClipboardList,
  Frame,
  Hand,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Maximize2,
  MousePointer2,
  PanelRightOpen,
  PenLine,
  Redo2,
  StickyNote,
  Type,
  Undo2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Tldraw,
  createShapeId,
  getSnapshot,
  type Editor,
  type TLEditorSnapshot,
  type TLShapeId,
} from 'tldraw';
import { connectDesignCards } from '@/lib/canvas/generationWorkflow';
import { getDesktopBridge } from '@/lib/desktop/bridge';
import type { DesktopCanvasDocument, DesktopProject } from '@/lib/desktop/types';
import {
  DESIGN_CARD_TYPE,
  DESIGN_CARD_PORT_EVENT,
  designCardShapeUtils,
  type DesignCardKind,
  type DesignCardPortEventDetail,
  type DesignCardShape,
} from './DesignCardShape';
import CanvasSidePanel, { type GenerationCardInput } from './CanvasSidePanel';

type SaveStatus = 'saved' | 'saving' | 'error' | 'conflict';

interface ConnectionDragState {
  sourceId: TLShapeId;
  start: { x: number; y: number };
  current: { x: number; y: number };
  targetId?: TLShapeId;
}

const TLDRAW_SCHEMA_VERSION = 'tldraw-4.5';
const tldrawLicenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;
const tldrawOptions = { maxPages: 1 } as const;

function getConnectionPreviewPath({ start, current }: ConnectionDragState) {
  const direction = current.x >= start.x ? 1 : -1;
  const controlOffset = Math.max(72, Math.abs(current.x - start.x) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x + controlOffset * direction} ${start.y}, ${current.x - controlOffset * direction} ${current.y}, ${current.x} ${current.y}`;
}

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
  generate: {
    title: '图像生成',
    eyebrow: 'IMAGE DRAFT · 1:1',
    body: '描述主体、构图、光线和视觉风格。',
  },
};

function findOpenCardPosition(editor: Editor, size: { w: number; h: number }) {
  const viewport = editor.getViewportPageBounds();
  const center = viewport.center;
  const existingBounds = editor.getCurrentPageShapes()
    .map((shape) => editor.getShapePageBounds(shape))
    .filter((bounds) => bounds !== undefined);
  const columnStep = size.w + 52;
  const rowStep = size.h + 52;
  const offsets = [
    [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [2, 0], [-2, 0], [0, 2], [0, -2],
  ];

  for (const [column, row] of offsets) {
    const candidate = {
      x: center.x - size.w / 2 + column * columnStep,
      y: center.y - size.h / 2 + row * rowStep,
    };
    const overlaps = existingBounds.some((bounds) => (
      candidate.x < bounds.maxX + 28
      && candidate.x + size.w > bounds.minX - 28
      && candidate.y < bounds.maxY + 28
      && candidate.y + size.h > bounds.minY - 28
    ));
    if (!overlaps) return candidate;
  }

  const pageBounds = editor.getCurrentPageBounds();
  return {
    x: (pageBounds?.maxX ?? center.x) + 72,
    y: pageBounds?.minY ?? center.y - size.h / 2,
  };
}

function createCard(
  editor: Editor,
  kind: DesignCardKind,
  offset = { x: 0, y: 0 },
  overrides?: Partial<DesignCardShape['props']>,
  preferredPosition?: { x: number; y: number }
) {
  const id = createShapeId();
  const size = kind === 'generate' ? { w: 360, h: 300 } : { w: 320, h: 188 };
  const position = preferredPosition ?? findOpenCardPosition(editor, size);
  editor.createShape<DesignCardShape>({
    id,
    type: DESIGN_CARD_TYPE,
    x: position.x + offset.x,
    y: position.y + offset.y,
    props: {
      ...cardPresets[kind],
      ...overrides,
      kind,
      ...size,
    },
  });
  editor.select(id);
  editor.setCurrentTool('select');
  const viewport = editor.getViewportPageBounds();
  if (
    position.x < viewport.minX
    || position.y < viewport.minY
    || position.x + size.w > viewport.maxX
    || position.y + size.h > viewport.maxY
  ) {
    editor.zoomToSelection({ animation: { duration: 180 } });
  }
  return id;
}

function seedCanvas(editor: Editor, projectDescription?: string | null) {
  const seeds: Array<{ kind: DesignCardKind; x: number; y: number }> = [
    { kind: 'brief', x: -420, y: -80 },
    { kind: 'generate', x: -20, y: -130 },
    { kind: 'asset', x: 400, y: -80 },
    { kind: 'note', x: 20, y: 220 },
  ];

  editor.createShapes<DesignCardShape>(seeds.map(({ kind, x, y }) => ({
    id: createShapeId(),
    type: DESIGN_CARD_TYPE,
    x,
    y,
    props: {
      ...cardPresets[kind],
      ...(kind === 'brief' && projectDescription ? { body: projectDescription } : {}),
      ...(kind === 'generate' ? {
        body: projectDescription || cardPresets.generate.body,
        prompt: projectDescription || cardPresets.generate.body,
        modelId: 'mock:default',
        ratio: '1:1',
        steps: 28,
        guidance: 7,
        strength: 0.65,
        status: 'draft' as const,
      } : {}),
      kind,
      w: kind === 'generate' ? 360 : 320,
      h: kind === 'generate' ? 300 : 188,
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
          <WandSparkles size={18} />
        </ToolButton>
        <ToolButton label="生成卡片" onClick={() => createCard(editor, 'generate')}>
          <ImagePlus size={18} />
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
        <ToolButton label="连接节点" active={tool === 'arrow'} onClick={() => setCurrentTool('arrow')}>
          <ArrowRight size={18} />
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

export default function DesignCanvasWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<DesktopProject | null>(null);
  const [canvasDocument, setCanvasDocument] = useState<DesktopCanvasDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<TLShapeId | null>(null);
  const pendingConnectionSourceRef = useRef<TLShapeId | null>(null);
  const [connectionDrag, setConnectionDrag] = useState<ConnectionDragState | null>(null);
  const connectionDragRef = useRef<ConnectionDragState | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<{ text: string; error?: boolean } | null>(null);
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
      seedCanvas(mountedEditor, project?.description);
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
  }, [canvasDocument, project?.description, queueSave]);

  const createTaskCard = useCallback((title: string, body: string) => {
    if (!editor) return;
    createCard(editor, 'task', { x: 0, y: 0 }, {
      title,
      eyebrow: 'AGENT TASK',
      body,
    });
  }, [editor]);

  const createGenerationCard = useCallback((input: GenerationCardInput, afterShapeId?: TLShapeId) => {
    if (!editor) return null;
    const sourceBounds = afterShapeId ? editor.getShapePageBounds(afterShapeId) : undefined;
    return createCard(editor, 'generate', { x: 0, y: 0 }, {
      title: '图像生成',
      eyebrow: `GENERATION · ${input.ratio}`,
      body: input.prompt,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      modelId: input.modelId,
      ratio: input.ratio,
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
      steps: input.steps,
      guidance: input.guidance,
      strength: input.strength,
      status: 'draft',
    }, sourceBounds ? { x: sourceBounds.maxX + 120, y: sourceBounds.minY } : undefined);
  }, [editor]);

  const importAssets = useCallback(async () => {
    if (!editor) return 0;
    const assets = await getDesktopBridge().importAssets(projectId);
    assets.forEach((asset, index) => {
      createCard(editor, 'asset', { x: index * 28, y: index * 24 }, {
        title: asset.name,
        eyebrow: 'LOCAL ASSET',
        body: '已复制到项目素材目录',
      });
    });
    return assets.length;
  }, [editor, projectId]);

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

  useEffect(() => {
    if (!editor) return;
    const updatePendingConnection = (shapeId: TLShapeId | null) => {
      pendingConnectionSourceRef.current = shapeId;
      setPendingConnectionSourceId(shapeId);
    };
    const updateConnectionDrag = (drag: ConnectionDragState | null) => {
      connectionDragRef.current = drag;
      setConnectionDrag(drag);
    };
    const showConnectionResult = (text: string, error = false) => {
      setConnectionMessage({ text, error: error || undefined });
      if (!error) window.setTimeout(() => setConnectionMessage(null), 1400);
    };
    const createConnection = (sourceId: TLShapeId, targetId: TLShapeId) => {
      try {
        connectDesignCards(editor, sourceId, targetId);
        updatePendingConnection(null);
        showConnectionResult('连接已创建');
      } catch (error) {
        showConnectionResult(error instanceof Error ? error.message : '创建连接失败', true);
      }
    };
    const handlePort = (event: Event) => {
      const detail = (event as CustomEvent<DesignCardPortEventDetail>).detail;
      if (!detail?.shapeId || !detail.role || !detail.phase) return;
      if (detail.phase === 'drag-start') {
        if (detail.clientX === undefined || detail.clientY === undefined) return;
        editor.setCurrentTool('select');
        updatePendingConnection(null);
        setConnectionMessage(null);
        connectionDragRef.current = {
          sourceId: detail.shapeId,
          start: { x: detail.clientX, y: detail.clientY },
          current: { x: detail.clientX, y: detail.clientY },
        };
        return;
      }
      if (detail.phase === 'drag-move') {
        const activeDrag = connectionDragRef.current;
        if (!activeDrag || detail.clientX === undefined || detail.clientY === undefined) return;
        updateConnectionDrag({
          ...activeDrag,
          current: { x: detail.clientX, y: detail.clientY },
          targetId: detail.targetShapeId,
        });
        return;
      }
      if (detail.phase === 'drag-cancel') {
        updateConnectionDrag(null);
        return;
      }
      if (detail.phase === 'drag-end') {
        const sourceId = connectionDragRef.current?.sourceId ?? detail.shapeId;
        updateConnectionDrag(null);
        if (detail.targetShapeId) createConnection(sourceId, detail.targetShapeId);
        return;
      }
      if (detail.phase !== 'click') return;
      if (detail.role === 'output') {
        editor.setCurrentTool('select');
        updatePendingConnection(detail.shapeId);
        setConnectionMessage(null);
        return;
      }
      const sourceId = pendingConnectionSourceRef.current;
      if (!sourceId) {
        setConnectionMessage({ text: '请先选择一个右侧输出端口', error: true });
        return;
      }
      createConnection(sourceId, detail.shapeId);
    };
    const cancelConnection = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      updatePendingConnection(null);
      updateConnectionDrag(null);
      setConnectionMessage(null);
    };
    window.addEventListener(DESIGN_CARD_PORT_EVENT, handlePort);
    window.addEventListener('keydown', cancelConnection);
    return () => {
      window.removeEventListener(DESIGN_CARD_PORT_EVENT, handlePort);
      window.removeEventListener('keydown', cancelConnection);
    };
  }, [editor]);

  if (loading || !project) {
    return (
      <div className="dc-loading-screen">
        <LoaderCircle className="dc-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="dc-workspace" data-connecting={pendingConnectionSourceId || connectionDrag ? true : undefined}>
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
          {!panelOpen ? (
            <button type="button" className="dc-topbar-icon" onClick={() => setPanelOpen(true)} aria-label="展开右侧栏" title="展开右侧栏">
              <PanelRightOpen size={17} />
            </button>
          ) : null}
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
          {connectionDrag ? (
            <svg className="dc-connection-preview" aria-hidden="true">
              <path d={getConnectionPreviewPath(connectionDrag)} data-target={connectionDrag.targetId ? true : undefined} />
              <circle cx={connectionDrag.current.x} cy={connectionDrag.current.y} r="5" data-target={connectionDrag.targetId ? true : undefined} />
            </svg>
          ) : null}
          {pendingConnectionSourceId || connectionMessage ? (
            <div className="dc-connection-message" data-error={connectionMessage?.error || undefined}>
              <Cable size={15} />
              <span>{connectionMessage?.text || '选择目标节点的左侧输入端口'}</span>
              {pendingConnectionSourceId ? (
                <button
                  type="button"
                  aria-label="取消连接"
                  title="取消连接"
                  onClick={() => {
                    pendingConnectionSourceRef.current = null;
                    setPendingConnectionSourceId(null);
                  }}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </main>
        {panelOpen ? (
          <CanvasSidePanel
            editor={editor}
            projectId={projectId}
            onCreateTask={createTaskCard}
            onCreateGeneration={createGenerationCard}
            onImportAssets={importAssets}
            onCollapse={() => setPanelOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
