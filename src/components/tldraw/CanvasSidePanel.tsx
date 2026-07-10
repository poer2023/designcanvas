'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  FolderOpen,
  ImagePlus,
  ListTodo,
  LoaderCircle,
  Network,
  PanelRightClose,
  Play,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { Editor, TLShapeId } from 'tldraw';
import {
  GENERATION_RATIOS,
  compileGenerationWorkflow,
  connectDesignCards,
  getGenerationNodeInput,
  persistGenerationWorkflow,
  runGenerationWorkflow,
  type GenerationNodeInput,
} from '@/lib/canvas/generationWorkflow';
import {
  DESIGN_CARD_TYPE,
  type DesignCardShape,
} from './DesignCardShape';

export type GenerationCardInput = GenerationNodeInput;

interface CanvasSidePanelProps {
  editor: Editor | null;
  projectId: string;
  onCreateTask: (title: string, body: string) => void;
  onCreateGeneration: (input: GenerationCardInput, afterShapeId?: TLShapeId) => TLShapeId | null;
  onImportAssets: () => Promise<number>;
  onCollapse: () => void;
}

interface ImageModel {
  model_id: string;
  display_name: string;
  capabilities: Array<'text2img' | 'img2img' | 'vision'>;
}

interface WorkflowSummary {
  nodes: number;
  edges: number;
  error: string | null;
  selectedGenerationId: TLShapeId | null;
}

interface AgentMessage {
  id: number;
  role: 'user' | 'agent';
  text: string;
}

type PanelMode = 'agent' | 'assets';
type ComposerAction = 'generate' | 'task';

const defaultGenerationInput: GenerationCardInput = {
  prompt: '',
  negativePrompt: '',
  modelId: 'mock:default',
  ratio: '1:1',
  seed: undefined,
  steps: 28,
  guidance: 7,
  strength: 0.65,
};

function readWorkflowSummary(editor: Editor | null): WorkflowSummary {
  if (!editor) return { nodes: 0, edges: 0, error: null, selectedGenerationId: null };
  const selectedGenerationId = editor.getSelectedShapeIds().find((shapeId) => {
    const shape = editor.getShape<DesignCardShape>(shapeId);
    return shape?.type === DESIGN_CARD_TYPE && shape.props.kind === 'generate';
  }) ?? null;
  try {
    const graph = compileGenerationWorkflow(editor);
    return {
      nodes: graph.generationNodes.length,
      edges: graph.edges.length,
      error: null,
      selectedGenerationId,
    };
  } catch (error) {
    return {
      nodes: editor.getCurrentPageShapes().filter((shape) => (
        shape.type === DESIGN_CARD_TYPE
        && (shape as DesignCardShape).props.kind === 'generate'
      )).length,
      edges: 0,
      error: error instanceof Error ? error.message : '工作流连接无效',
      selectedGenerationId,
    };
  }
}

export default function CanvasSidePanel({
  editor,
  projectId,
  onCreateTask,
  onCreateGeneration,
  onImportAssets,
  onCollapse,
}: CanvasSidePanelProps) {
  const ready = Boolean(editor);
  const messageIdRef = useRef(0);
  const [mode, setMode] = useState<PanelMode>('agent');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [composerAction, setComposerAction] = useState<ComposerAction>('generate');
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [generationInput, setGenerationInput] = useState(defaultGenerationInput);
  const [models, setModels] = useState<ImageModel[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowSummary>(() => readWorkflowSummary(editor));
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) {
      setWorkflow(readWorkflowSummary(null));
      return;
    }
    const refresh = () => setWorkflow(readWorkflowSummary(editor));
    refresh();
    return editor.store.listen(refresh, { scope: 'all' });
  }, [editor]);

  useEffect(() => {
    if (!editor || !workflow.selectedGenerationId) return;
    const selected = editor.getShape<DesignCardShape>(workflow.selectedGenerationId);
    if (selected?.type === DESIGN_CARD_TYPE && selected.props.kind === 'generate') {
      setGenerationInput(getGenerationNodeInput(selected));
    }
  }, [editor, workflow.selectedGenerationId]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/models?enabled=true')
      .then((response) => response.json())
      .then((payload: { success?: boolean; data?: ImageModel[] }) => {
        if (cancelled || !payload.success || !payload.data) return;
        setModels(payload.data.filter((model) => (
          model.capabilities.includes('text2img') || model.capabilities.includes('img2img')
        )));
      })
      .catch((error) => console.error('Failed to load image models:', error));
    return () => { cancelled = true; };
  }, []);

  const appendMessage = (role: AgentMessage['role'], text: string) => {
    messageIdRef.current += 1;
    const id = messageIdRef.current;
    setMessages((current) => [...current, { id, role, text }]);
  };

  const patchGenerationInput = (patch: Partial<GenerationCardInput>) => {
    setGenerationInput((current) => ({ ...current, ...patch }));
  };

  const submitAgentPrompt = () => {
    const prompt = agentPrompt.trim();
    if (!editor || !prompt) return;
    appendMessage('user', prompt);

    if (composerAction === 'task') {
      onCreateTask(prompt.slice(0, 28), prompt);
      appendMessage('agent', '任务卡片已添加到画布');
      setAgentPrompt('');
      return;
    }

    const sourceId = workflow.selectedGenerationId ?? undefined;
    const nextInput = sourceId
      ? { ...generationInput, prompt, seed: undefined }
      : { ...defaultGenerationInput, modelId: generationInput.modelId, prompt };
    const createdId = onCreateGeneration(nextInput, sourceId);
    if (!createdId) {
      appendMessage('agent', '生成节点创建失败');
      return;
    }
    if (sourceId) {
      try {
        connectDesignCards(editor, sourceId, createdId);
        appendMessage('agent', '下游迭代节点已创建并连接');
      } catch (error) {
        appendMessage('agent', error instanceof Error ? error.message : '节点已创建，但连接失败');
      }
    } else {
      appendMessage('agent', '生成节点已添加到画布');
    }
    setAgentPrompt('');
  };

  const saveSelectedGeneration = () => {
    if (!editor || !workflow.selectedGenerationId || !generationInput.prompt.trim()) return;
    editor.updateShape<DesignCardShape>({
      id: workflow.selectedGenerationId,
      type: DESIGN_CARD_TYPE,
      props: {
        title: '图像生成',
        eyebrow: `GENERATION · ${generationInput.ratio}`,
        body: generationInput.prompt.trim(),
        prompt: generationInput.prompt.trim(),
        negativePrompt: generationInput.negativePrompt.trim(),
        modelId: generationInput.modelId,
        ratio: generationInput.ratio,
        seed: generationInput.seed,
        steps: generationInput.steps,
        guidance: generationInput.guidance,
        strength: generationInput.strength,
        status: 'draft',
        outputUrl: '',
        outputAssetId: '',
        error: '',
      },
    });
    setRunResult('节点设置已更新');
  };

  const runWorkflow = async (startNodeId?: TLShapeId) => {
    if (!editor || running) return;
    setRunning(true);
    setRunResult(startNodeId ? '正在运行所选节点及下游…' : '正在运行全部节点…');
    try {
      const graph = await persistGenerationWorkflow(projectId, editor);
      const report = await runGenerationWorkflow(editor, startNodeId, graph);
      await persistGenerationWorkflow(projectId, editor);
      setRunResult(`已完成 ${report.completedNodeIds.length} 个节点`);
    } catch (error) {
      setRunResult(error instanceof Error ? error.message : '工作流运行失败');
    } finally {
      setRunning(false);
    }
  };

  const importAssets = async () => {
    if (!ready || importing) return;
    setImporting(true);
    setImportResult(null);
    try {
      const count = await onImportAssets();
      setImportResult(count > 0 ? `已导入 ${count} 个素材` : '未选择素材');
    } catch (error) {
      console.error('Failed to import assets:', error);
      setImportResult('导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <aside className="dc-agent-panel">
      <div className="dc-panel-tabs" role="tablist" aria-label="画布模式">
        <button type="button" role="tab" aria-selected={mode === 'agent'} data-active={mode === 'agent' || undefined} onClick={() => setMode('agent')}>
          <Bot size={15} /> Agent
        </button>
        <button type="button" role="tab" aria-selected={mode === 'assets'} data-active={mode === 'assets' || undefined} onClick={() => setMode('assets')}>
          <FolderOpen size={15} /> 素材
        </button>
        <button type="button" className="dc-panel-collapse" aria-label="收起右侧栏" title="收起右侧栏" onClick={onCollapse}>
          <PanelRightClose size={16} />
        </button>
      </div>

      {mode === 'agent' ? (
        <div className="dc-agent-content">
          <div className="dc-agent-header">
            <div className="dc-agent-identity">
              <span><Bot size={16} /></span>
              <div><strong>Design Agent</strong><small>{workflow.nodes} 节点 · {workflow.edges} 连接</small></div>
            </div>
            <div className="dc-agent-run-actions">
              <button type="button" aria-label="从所选节点运行" title="从所选节点运行" disabled={!workflow.selectedGenerationId || running || Boolean(workflow.error)} onClick={() => void runWorkflow(workflow.selectedGenerationId ?? undefined)}>
                <Network size={15} />
              </button>
              <button type="button" aria-label="运行全部节点" title="运行全部节点" disabled={workflow.nodes === 0 || running || Boolean(workflow.error)} onClick={() => void runWorkflow()}>
                {running ? <LoaderCircle className="dc-spin" size={15} /> : <Play size={15} />}
              </button>
            </div>
          </div>

          {workflow.error ? <div className="dc-agent-notice" data-error>{workflow.error}</div> : null}

          <div className="dc-agent-thread" aria-live="polite">
            {messages.length === 0 && !runResult ? (
              <div className="dc-agent-empty">
                <Sparkles size={18} />
                <span>画布已就绪</span>
              </div>
            ) : null}
            {messages.map((message) => (
              <div key={message.id} className="dc-agent-message" data-role={message.role}>
                {message.text}
              </div>
            ))}
            {runResult ? <div className="dc-agent-message" data-role="agent">{runResult}</div> : null}
          </div>

          {workflow.selectedGenerationId ? (
            <details className="dc-node-inspector">
              <summary>
                <SlidersHorizontal size={15} />
                <span>节点设置</span>
                <small>{generationInput.modelId} · {generationInput.ratio}</small>
              </summary>
              <div className="dc-node-inspector__body">
                <label className="dc-field-label" htmlFor="selected-generation-prompt">提示词</label>
                <textarea id="selected-generation-prompt" className="dc-panel-textarea" value={generationInput.prompt} onChange={(event) => patchGenerationInput({ prompt: event.target.value })} rows={3} />

                <label className="dc-field-label" htmlFor="selected-generation-negative">反向提示词</label>
                <textarea id="selected-generation-negative" className="dc-panel-textarea dc-panel-textarea--compact" value={generationInput.negativePrompt} onChange={(event) => patchGenerationInput({ negativePrompt: event.target.value })} rows={2} />

                <label className="dc-field-label" htmlFor="selected-generation-model">模型</label>
                <select id="selected-generation-model" className="dc-panel-select" value={generationInput.modelId} onChange={(event) => patchGenerationInput({ modelId: event.target.value })}>
                  {models.length === 0 ? <option value="mock:default">Mock Generator</option> : null}
                  {models.map((model) => <option key={model.model_id} value={model.model_id}>{model.display_name}</option>)}
                </select>

                <div className="dc-ratio-control" role="group" aria-label="画幅比例">
                  {GENERATION_RATIOS.map((ratio) => (
                    <button key={ratio} type="button" data-active={generationInput.ratio === ratio || undefined} onClick={() => patchGenerationInput({ ratio })}>{ratio}</button>
                  ))}
                </div>

                <div className="dc-number-grid">
                  <label>Seed<input type="number" min="0" max="2147483647" value={generationInput.seed ?? ''} placeholder="自动" onChange={(event) => patchGenerationInput({ seed: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
                  <label>Steps<input type="number" min="1" max="150" value={generationInput.steps} onChange={(event) => patchGenerationInput({ steps: Number(event.target.value) })} /></label>
                  <label>Guidance<input type="number" min="1" max="30" step="0.5" value={generationInput.guidance} onChange={(event) => patchGenerationInput({ guidance: Number(event.target.value) })} /></label>
                  <label>变化强度<input type="number" min="0.05" max="1" step="0.05" value={generationInput.strength} onChange={(event) => patchGenerationInput({ strength: Number(event.target.value) })} /></label>
                </div>

                <button type="button" className="dc-secondary-action" disabled={!generationInput.prompt.trim()} onClick={saveSelectedGeneration}>保存节点设置</button>
              </div>
            </details>
          ) : null}

          <div className="dc-agent-composer">
            <textarea
              aria-label="Agent 输入"
              value={agentPrompt}
              onChange={(event) => setAgentPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitAgentPrompt();
                }
              }}
              placeholder={workflow.selectedGenerationId ? '描述下一步迭代…' : '让 Agent 在画布上完成什么？'}
              rows={3}
            />
            <div className="dc-agent-composer__footer">
              <div className="dc-composer-menu-wrap">
                <button type="button" className="dc-composer-icon" aria-label="选择卡片类型" title="选择卡片类型" onClick={() => setComposerMenuOpen((open) => !open)}>
                  <Plus size={17} />
                </button>
                {composerMenuOpen ? (
                  <div className="dc-composer-menu" role="menu">
                    <button type="button" role="menuitem" data-active={composerAction === 'generate' || undefined} onClick={() => { setComposerAction('generate'); setComposerMenuOpen(false); }}>
                      <ImagePlus size={15} /> 生成节点
                    </button>
                    <button type="button" role="menuitem" data-active={composerAction === 'task' || undefined} onClick={() => { setComposerAction('task'); setComposerMenuOpen(false); }}>
                      <ListTodo size={15} /> 任务卡片
                    </button>
                  </div>
                ) : null}
              </div>
              <span className="dc-composer-target">
                {composerAction === 'task' ? '任务卡片' : workflow.selectedGenerationId ? '基于所选节点' : '生成节点'}
              </span>
              <button type="button" className="dc-composer-send" aria-label="发送给 Agent" title="发送给 Agent" disabled={!ready || !agentPrompt.trim()} onClick={submitAgentPrompt}>
                <ArrowUp size={17} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'assets' ? (
        <div className="dc-panel-content">
          <div className="dc-panel-heading">
            <span>LOCAL ASSETS</span>
            <h2>项目素材</h2>
          </div>
          <button type="button" className="dc-import-zone" disabled={!ready || importing} onClick={() => void importAssets()}>
            {importing ? <LoaderCircle className="dc-spin" size={22} /> : <Upload size={22} />}
            <strong>导入本地文件</strong>
            <span>PNG · JPG · WEBP · SVG · MP4</span>
          </button>
          {importResult ? <div className="dc-import-result">{importResult}</div> : null}
        </div>
      ) : null}
    </aside>
  );
}
