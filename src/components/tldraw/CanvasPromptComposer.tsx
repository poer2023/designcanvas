'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react';
import type { Editor, TLShapeId } from 'tldraw';
import {
  GENERATION_RATIOS,
  connectDesignCards,
  type GenerationNodeInput,
  type GenerationRatio,
} from '@/lib/canvas/generationWorkflow';
import { DESIGN_CARD_TYPE, type DesignCardShape } from './DesignCardShape';
import { useGenerationModels } from './useGenerationModels';

interface CanvasPromptComposerProps {
  editor: Editor | null;
  running: boolean;
  onCreateGeneration: (input: GenerationNodeInput, afterShapeId?: TLShapeId) => TLShapeId | null;
  onRunWorkflow: (startNodeId?: TLShapeId) => Promise<void>;
}

export default function CanvasPromptComposer({
  editor,
  running,
  onCreateGeneration,
  onRunWorkflow,
}: CanvasPromptComposerProps) {
  const models = useGenerationModels();
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState('mock:default');
  const [ratio, setRatio] = useState<GenerationRatio>('1:1');
  const subscribeToSelection = useCallback((onStoreChange: () => void) => (
    editor?.store.listen(onStoreChange, { scope: 'all' }) ?? (() => {})
  ), [editor]);
  const readSelectedGenerationId = useCallback(() => (
    editor?.getSelectedShapeIds().find((shapeId) => {
      const shape = editor.getShape<DesignCardShape>(shapeId);
      return shape?.type === DESIGN_CARD_TYPE && shape.props.kind === 'generate';
    }) ?? null
  ), [editor]);
  const selectedGenerationId = useSyncExternalStore(
    subscribeToSelection,
    readSelectedGenerationId,
    () => null
  );

  const submit = () => {
    const nextPrompt = prompt.trim();
    if (!editor || !nextPrompt || running) return;
    const sourceId = selectedGenerationId ?? undefined;
    const createdId = onCreateGeneration({
      prompt: nextPrompt,
      negativePrompt: '',
      modelId,
      ratio,
      seed: undefined,
      steps: 28,
      guidance: 7,
      strength: 0.65,
    }, sourceId);
    if (!createdId) return;
    if (sourceId) {
      try {
        connectDesignCards(editor, sourceId, createdId);
      } catch {
        // The new result still runs when an optional iteration link cannot be created.
      }
    }
    setPrompt('');
    void onRunWorkflow(createdId);
  };

  const modelOptions = models.some((model) => model.model_id === modelId)
    ? models
    : [{
      model_id: modelId,
      display_name: modelId === 'mock:default' ? 'Mock Generator' : modelId,
      capabilities: [] as const,
    }, ...models];

  return (
    <form
      className="dc-canvas-composer"
      data-has-source={selectedGenerationId ? true : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Sparkles className="dc-canvas-composer__spark" size={17} />
      <textarea
        aria-label="画布生成输入"
        value={prompt}
        placeholder={selectedGenerationId ? '描述下一步变化…' : '描述想生成的画面…'}
        rows={1}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <span className="dc-canvas-composer__target">
        {selectedGenerationId ? '迭代' : '新建'}
      </span>
      <select aria-label="生成模型" title="生成模型" value={modelId} onChange={(event) => setModelId(event.target.value)}>
        {modelOptions.map((model) => (
          <option key={model.model_id} value={model.model_id}>{model.display_name}</option>
        ))}
      </select>
      <select
        aria-label="生成画幅比例"
        title="生成画幅比例"
        value={ratio}
        onChange={(event) => setRatio(event.target.value as GenerationRatio)}
      >
        {GENERATION_RATIOS.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <button type="submit" aria-label="开始生成" title="开始生成" disabled={!editor || !prompt.trim() || running}>
        {running ? <LoaderCircle className="dc-spin" size={17} /> : <ArrowUp size={17} />}
      </button>
      <span className="dc-sr-only" aria-live="polite">{running ? '正在生成图片' : ''}</span>
    </form>
  );
}
