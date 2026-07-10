'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  FolderOpen,
  LoaderCircle,
  Network,
  PanelRightClose,
  Play,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import type { Editor, TLShapeId } from 'tldraw';
import {
  GENERATION_RATIOS,
  compileGenerationWorkflow,
  getGenerationNodeInput,
  type GenerationNodeInput,
} from '@/lib/canvas/generationWorkflow';
import {
  DESIGN_CARD_TYPE,
  type DesignCardShape,
} from './DesignCardShape';
import { useGenerationModels } from './useGenerationModels';

export type GenerationCardInput = GenerationNodeInput;

interface CanvasSidePanelProps {
  editor: Editor | null;
  inspectorRequestId: number;
  running: boolean;
  runResult: string | null;
  onRunWorkflow: (startNodeId?: TLShapeId) => Promise<void>;
  onImportAssets: () => Promise<number>;
  onCollapse: () => void;
}

interface WorkflowSummary {
  nodes: number;
  edges: number;
  error: string | null;
  selectedGenerationId: TLShapeId | null;
  selectedGenerationFingerprint: string | null;
}

type PanelMode = 'agent' | 'assets';

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
  if (!editor) {
    return {
      nodes: 0,
      edges: 0,
      error: null,
      selectedGenerationId: null,
      selectedGenerationFingerprint: null,
    };
  }
  const selectedGenerationId = editor.getSelectedShapeIds().find((shapeId) => {
    const shape = editor.getShape<DesignCardShape>(shapeId);
    return shape?.type === DESIGN_CARD_TYPE && shape.props.kind === 'generate';
  }) ?? null;
  const selectedGeneration = selectedGenerationId
    ? editor.getShape<DesignCardShape>(selectedGenerationId)
    : undefined;
  const selectedGenerationFingerprint = selectedGeneration?.type === DESIGN_CARD_TYPE
    ? JSON.stringify(getGenerationNodeInput(selectedGeneration))
    : null;
  try {
    const graph = compileGenerationWorkflow(editor);
    return {
      nodes: graph.generationNodes.length,
      edges: graph.edges.length,
      error: null,
      selectedGenerationId,
      selectedGenerationFingerprint,
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
      selectedGenerationFingerprint,
    };
  }
}

export default function CanvasSidePanel({
  editor,
  inspectorRequestId,
  running,
  runResult,
  onRunWorkflow,
  onImportAssets,
  onCollapse,
}: CanvasSidePanelProps) {
  const ready = Boolean(editor);
  const models = useGenerationModels();
  const [mode, setMode] = useState<PanelMode>('agent');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [generationInput, setGenerationInput] = useState(defaultGenerationInput);
  const [workflow, setWorkflow] = useState<WorkflowSummary>(() => readWorkflowSummary(editor));
  const [inspectorNotice, setInspectorNotice] = useState<string | null>(null);
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
  }, [editor, workflow.selectedGenerationFingerprint, workflow.selectedGenerationId]);

  useEffect(() => {
    if (inspectorRequestId === 0) return;
    setMode('agent');
    setInspectorOpen(true);
  }, [inspectorRequestId]);

  const patchGenerationInput = (patch: Partial<GenerationCardInput>) => {
    setGenerationInput((current) => ({ ...current, ...patch }));
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
    setInspectorNotice('节点设置已保存');
    window.setTimeout(() => setInspectorNotice(null), 1400);
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
              <button type="button" aria-label="从所选节点运行" title="从所选节点运行" disabled={!workflow.selectedGenerationId || running || Boolean(workflow.error)} onClick={() => void onRunWorkflow(workflow.selectedGenerationId ?? undefined)}>
                <Network size={15} />
              </button>
              <button type="button" aria-label="运行全部节点" title="运行全部节点" disabled={workflow.nodes === 0 || running || Boolean(workflow.error)} onClick={() => void onRunWorkflow()}>
                {running ? <LoaderCircle className="dc-spin" size={15} /> : <Play size={15} />}
              </button>
            </div>
          </div>

          {workflow.error ? <div className="dc-agent-notice" data-error>{workflow.error}</div> : null}

          {runResult ? (
            <details className="dc-run-history">
              <summary>
                <span>运行记录</span>
                <small>{running ? '生成中' : '最近一次'}</small>
              </summary>
              <div aria-live="polite">{runResult}</div>
            </details>
          ) : null}

          {workflow.selectedGenerationId ? (
            <details
              className="dc-node-inspector"
              open={inspectorOpen}
              onToggle={(event) => setInspectorOpen(event.currentTarget.open)}
            >
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
                {inspectorNotice ? <div className="dc-inspector-notice" aria-live="polite">{inspectorNotice}</div> : null}
              </div>
            </details>
          ) : null}
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
