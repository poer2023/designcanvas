'use client';

import { useState } from 'react';
import {
  Bot,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';

export interface GenerationCardInput {
  prompt: string;
  preset: 'image-draft' | 'poster-draft';
  ratio: '1:1' | '3:2' | '4:5' | '16:9';
}

interface CanvasSidePanelProps {
  ready: boolean;
  onCreateTask: (title: string, body: string) => void;
  onCreateGeneration: (input: GenerationCardInput) => void;
  onImportAssets: () => Promise<number>;
}

type PanelMode = 'agent' | 'generate' | 'assets';

const quickTasks = ['整理画布', '提取风格', '检查一致性', '准备导出'];
const ratios: GenerationCardInput['ratio'][] = ['1:1', '3:2', '4:5', '16:9'];

export default function CanvasSidePanel({
  ready,
  onCreateTask,
  onCreateGeneration,
  onImportAssets,
}: CanvasSidePanelProps) {
  const [mode, setMode] = useState<PanelMode>('generate');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [preset, setPreset] = useState<GenerationCardInput['preset']>('image-draft');
  const [ratio, setRatio] = useState<GenerationCardInput['ratio']>('1:1');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const addTask = (title: string, body = '') => {
    if (!ready) return;
    onCreateTask(title, body.trim() || '等待执行');
    setTaskPrompt('');
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
        <button type="button" role="tab" aria-selected={mode === 'generate'} data-active={mode === 'generate' || undefined} onClick={() => setMode('generate')}>
          <Sparkles size={15} /> 生成
        </button>
        <button type="button" role="tab" aria-selected={mode === 'assets'} data-active={mode === 'assets' || undefined} onClick={() => setMode('assets')}>
          <FolderOpen size={15} /> 素材
        </button>
      </div>

      {mode === 'agent' ? (
        <div className="dc-panel-content">
          <div className="dc-panel-heading">
            <span>DESIGN AGENT</span>
            <h2>添加设计任务</h2>
          </div>
          <div className="dc-task-grid">
            {quickTasks.map((task) => (
              <button key={task} type="button" className="dc-task-chip" disabled={!ready} onClick={() => addTask(task)}>
                {task}
              </button>
            ))}
          </div>
          <label className="dc-field-label" htmlFor="agent-task">任务内容</label>
          <textarea
            id="agent-task"
            className="dc-panel-textarea"
            value={taskPrompt}
            onChange={(event) => setTaskPrompt(event.target.value)}
            placeholder="输入要执行的设计任务"
            rows={5}
          />
          <button type="button" className="dc-primary-action" disabled={!ready || !taskPrompt.trim()} onClick={() => addTask(taskPrompt.trim(), taskPrompt)}>
            <Plus size={16} /> 添加任务卡片
          </button>
        </div>
      ) : null}

      {mode === 'generate' ? (
        <div className="dc-panel-content">
          <div className="dc-panel-heading">
            <span>GENERATION</span>
            <h2>添加生成卡片</h2>
          </div>
          <label className="dc-field-label" htmlFor="generation-prompt">提示词</label>
          <textarea
            id="generation-prompt"
            className="dc-panel-textarea"
            value={generationPrompt}
            onChange={(event) => setGenerationPrompt(event.target.value)}
            placeholder="描述画面、主体、构图和风格"
            rows={6}
          />

          <label className="dc-field-label" htmlFor="generation-preset">草稿类型</label>
          <select
            id="generation-preset"
            className="dc-panel-select"
            value={preset}
            onChange={(event) => setPreset(event.target.value as GenerationCardInput['preset'])}
          >
            <option value="image-draft">图像草稿</option>
            <option value="poster-draft">海报草稿</option>
          </select>

          <span className="dc-field-label">画幅</span>
          <div className="dc-ratio-control" role="group" aria-label="画幅比例">
            {ratios.map((item) => (
              <button key={item} type="button" data-active={ratio === item || undefined} onClick={() => setRatio(item)}>
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="dc-primary-action"
            disabled={!ready || !generationPrompt.trim()}
            onClick={() => {
              onCreateGeneration({ prompt: generationPrompt.trim(), preset, ratio });
              setGenerationPrompt('');
            }}
          >
            <ImagePlus size={16} /> 添加到画布
          </button>
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
