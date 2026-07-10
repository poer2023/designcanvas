'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  Network,
  PanelRightClose,
  Play,
  Plus,
  Upload,
} from 'lucide-react';
import type { Editor, TLShapeId } from 'tldraw';
import {
  GENERATION_RATIOS,
  compileGenerationWorkflow,
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
  onCreateGeneration: (input: GenerationCardInput) => void;
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

type PanelMode = 'agent' | 'assets';

const quickTasks = ['整理画布', '提取风格', '检查一致性', '准备导出'];
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
  const [mode, setMode] = useState<PanelMode>('agent');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [generationInput, setGenerationInput] = useState(defaultGenerationInput);
  const [models, setModels] = useState<ImageModel[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowSummary>(() => readWorkflowSummary(editor));
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
    if (!editor) return;
    if (!workflow.selectedGenerationId) {
      setGenerationInput((current) => ({ ...defaultGenerationInput, modelId: current.modelId }));
      return;
    }
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
        const imageModels = payload.data.filter((model) => (
          model.capabilities.includes('text2img') || model.capabilities.includes('img2img')
        ));
        setModels(imageModels);
      })
      .catch((error) => console.error('Failed to load image models:', error));
    return () => { cancelled = true; };
  }, []);

  const patchGenerationInput = (patch: Partial<GenerationCardInput>) => {
    setGenerationInput((current) => ({ ...current, ...patch }));
  };

  const addTask = (title: string, body = '') => {
    if (!ready) return;
    onCreateTask(title, body.trim() || '等待执行');
    setTaskPrompt('');
  };

  const saveGenerationNode = () => {
    if (!editor || !generationInput.prompt.trim()) return;
    if (workflow.selectedGenerationId) {
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
      setRunResult('节点参数已更新，原输出已标记为过期');
      return;
    }
    onCreateGeneration({
      ...generationInput,
      prompt: generationInput.prompt.trim(),
      negativePrompt: generationInput.negativePrompt.trim(),
    });
    setGenerationInput((current) => ({ ...defaultGenerationInput, modelId: current.modelId }));
    setRunResult('生成节点已添加到画布');
  };

  const runWorkflow = async (startNodeId?: TLShapeId) => {
    if (!editor || running) return;
    setRunning(true);
    setRunResult(startNodeId ? '正在运行所选节点及下游节点…' : '正在按连接顺序运行工作流…');
    try {
      const graph = await persistGenerationWorkflow(projectId, editor);
      const report = await runGenerationWorkflow(editor, startNodeId, graph);
      await persistGenerationWorkflow(projectId, editor);
      setRunResult(`已完成 ${report.completedNodeIds.length} 个节点，经过 ${report.edgeCount} 条连接`);
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
        <div className="dc-panel-content">
          <div className="dc-panel-heading dc-panel-heading--workflow">
            <div>
              <span>CONNECTED WORKFLOW</span>
              <h2>节点工作流</h2>
            </div>
            <Network size={20} />
          </div>

          <div className="dc-workflow-summary" data-error={workflow.error ? true : undefined}>
            <div><strong>{workflow.nodes}</strong><span>生成节点</span></div>
            <div><strong>{workflow.edges}</strong><span>有效连接</span></div>
          </div>
          {workflow.error ? <div className="dc-workflow-message" data-error>{workflow.error}</div> : null}

          <div className="dc-workflow-actions">
            <button type="button" className="dc-primary-action" disabled={!ready || running || workflow.nodes === 0 || Boolean(workflow.error)} onClick={() => void runWorkflow()}>
              {running ? <LoaderCircle className="dc-spin" size={16} /> : <Play size={16} />}
              运行全部
            </button>
            <button type="button" className="dc-secondary-action" disabled={!ready || running || !workflow.selectedGenerationId || Boolean(workflow.error)} onClick={() => void runWorkflow(workflow.selectedGenerationId ?? undefined)}>
              从所选节点运行
            </button>
          </div>
          {runResult ? <div className="dc-workflow-message">{runResult}</div> : null}

          <div className="dc-panel-section-title">
            <span>{workflow.selectedGenerationId ? '所选节点' : '新节点'}</span>
            <strong>{workflow.selectedGenerationId ? '编辑生成参数' : '添加生成节点'}</strong>
          </div>

          <label className="dc-field-label" htmlFor="generation-prompt">提示词</label>
          <textarea
            id="generation-prompt"
            className="dc-panel-textarea"
            value={generationInput.prompt}
            onChange={(event) => patchGenerationInput({ prompt: event.target.value })}
            placeholder="描述主体、构图、光线和视觉风格"
            rows={5}
          />

          <label className="dc-field-label" htmlFor="generation-negative">反向提示词</label>
          <textarea
            id="generation-negative"
            className="dc-panel-textarea dc-panel-textarea--compact"
            value={generationInput.negativePrompt}
            onChange={(event) => patchGenerationInput({ negativePrompt: event.target.value })}
            placeholder="排除不希望出现的内容"
            rows={2}
          />

          <label className="dc-field-label" htmlFor="generation-model">模型</label>
          <select
            id="generation-model"
            className="dc-panel-select"
            value={generationInput.modelId}
            onChange={(event) => patchGenerationInput({ modelId: event.target.value })}
          >
            {models.length === 0 ? <option value="mock:default">Mock Generator</option> : null}
            {models.map((model) => <option key={model.model_id} value={model.model_id}>{model.display_name}</option>)}
          </select>

          <span className="dc-field-label">画幅</span>
          <div className="dc-ratio-control" role="group" aria-label="画幅比例">
            {GENERATION_RATIOS.map((ratio) => (
              <button key={ratio} type="button" data-active={generationInput.ratio === ratio || undefined} onClick={() => patchGenerationInput({ ratio })}>
                {ratio}
              </button>
            ))}
          </div>

          <div className="dc-number-grid">
            <label>Seed<input type="number" min="0" max="2147483647" value={generationInput.seed ?? ''} placeholder="自动" onChange={(event) => patchGenerationInput({ seed: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
            <label>Steps<input type="number" min="1" max="150" value={generationInput.steps} onChange={(event) => patchGenerationInput({ steps: Number(event.target.value) })} /></label>
            <label>Guidance<input type="number" min="1" max="30" step="0.5" value={generationInput.guidance} onChange={(event) => patchGenerationInput({ guidance: Number(event.target.value) })} /></label>
            <label>变化强度<input type="number" min="0.05" max="1" step="0.05" value={generationInput.strength} onChange={(event) => patchGenerationInput({ strength: Number(event.target.value) })} /></label>
          </div>

          <button type="button" className="dc-primary-action dc-node-save" disabled={!ready || !generationInput.prompt.trim()} onClick={saveGenerationNode}>
            {workflow.selectedGenerationId ? <Network size={16} /> : <ImagePlus size={16} />}
            {workflow.selectedGenerationId ? '更新所选节点' : '添加到画布'}
          </button>

          <details className="dc-agent-tasks">
            <summary>添加普通 Agent 任务</summary>
            <div className="dc-task-grid">
              {quickTasks.map((task) => (
                <button key={task} type="button" className="dc-task-chip" disabled={!ready} onClick={() => addTask(task)}>{task}</button>
              ))}
            </div>
            <textarea className="dc-panel-textarea dc-panel-textarea--compact" value={taskPrompt} onChange={(event) => setTaskPrompt(event.target.value)} placeholder="输入要执行的设计任务" rows={3} />
            <button type="button" className="dc-secondary-action" disabled={!ready || !taskPrompt.trim()} onClick={() => addTask(taskPrompt.trim(), taskPrompt)}>
              <Plus size={15} /> 添加任务卡片
            </button>
          </details>
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
