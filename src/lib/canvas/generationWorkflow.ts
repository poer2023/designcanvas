import {
  createShapeId,
  type Editor,
  type TLArrowBinding,
  type TLArrowShape,
  type TLShapeId,
} from 'tldraw';
import { getDesktopBridge } from '@/lib/desktop/bridge';
import {
  DESIGN_CARD_TYPE,
  type DesignCardShape,
} from '@/components/tldraw/DesignCardShape';

export const GENERATION_RATIOS = ['1:1', '3:2', '4:5', '16:9'] as const;
export type GenerationRatio = typeof GENERATION_RATIOS[number];

export interface GenerationNodeInput {
  prompt: string;
  negativePrompt: string;
  modelId: string;
  ratio: GenerationRatio;
  seed?: number;
  steps: number;
  guidance: number;
  strength: number;
}

export interface GenerationWorkflowEdge {
  arrowId: TLShapeId;
  sourceId: TLShapeId;
  targetId: TLShapeId;
}

export interface GenerationWorkflowGraph {
  generationNodes: DesignCardShape[];
  allCards: Map<TLShapeId, DesignCardShape>;
  edges: GenerationWorkflowEdge[];
  order: TLShapeId[];
}

export interface GenerationRunReport {
  completedNodeIds: TLShapeId[];
  edgeCount: number;
}

export interface PersistedGenerationGraph {
  nodes: Array<{
    id: TLShapeId;
    type: DesignCardShape['props']['kind'];
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: TLShapeId;
    source: TLShapeId;
    target: TLShapeId;
  }>;
}

interface GenerationOutput {
  url: string;
  assetId?: string;
  seed?: number;
}

interface JobResponse {
  success: boolean;
  data?: {
    status: 'queued' | 'running' | 'done' | 'error';
    outputs?: {
      thumbnails?: string[];
      asset_ids?: string[];
      seeds?: number[];
    } | null;
    error?: string | null;
  };
  error?: string;
}

function isDesignCard(shape: unknown): shape is DesignCardShape {
  return Boolean(
    shape
    && typeof shape === 'object'
    && 'type' in shape
    && shape.type === DESIGN_CARD_TYPE
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getConnectionBend(
  sourceBounds: NonNullable<ReturnType<Editor['getShapePageBounds']>>,
  targetBounds: NonNullable<ReturnType<Editor['getShapePageBounds']>>
) {
  const distance = Math.hypot(
    targetBounds.center.x - sourceBounds.center.x,
    targetBounds.center.y - sourceBounds.center.y
  );
  const bend = clamp(distance * 0.025, 4, 18);
  return targetBounds.center.y < sourceBounds.center.y ? bend : -bend;
}

export function getGenerationNodeInput(shape: DesignCardShape): GenerationNodeInput {
  const prompt = (shape.props.prompt || shape.props.body || '').trim();
  const ratio = GENERATION_RATIOS.includes(shape.props.ratio as GenerationRatio)
    ? shape.props.ratio as GenerationRatio
    : '1:1';
  const seed = typeof shape.props.seed === 'number' && Number.isFinite(shape.props.seed)
    ? Math.round(clamp(shape.props.seed, 0, 2_147_483_647))
    : undefined;

  return {
    prompt,
    negativePrompt: (shape.props.negativePrompt || '').trim(),
    modelId: shape.props.modelId || 'mock:default',
    ratio,
    seed,
    steps: Math.round(clamp(toFiniteNumber(shape.props.steps, 28), 1, 150)),
    guidance: clamp(toFiniteNumber(shape.props.guidance, 7), 1, 30),
    strength: clamp(toFiniteNumber(shape.props.strength, 0.65), 0.05, 1),
  };
}

export function compileGenerationWorkflow(editor: Editor): GenerationWorkflowGraph {
  const pageShapes = editor.getCurrentPageShapes();
  const allCards = new Map<TLShapeId, DesignCardShape>();
  const generationNodes: DesignCardShape[] = [];

  for (const shape of pageShapes) {
    if (!isDesignCard(shape)) continue;
    allCards.set(shape.id, shape);
    if (shape.props.kind === 'generate') generationNodes.push(shape);
  }

  const edges: GenerationWorkflowEdge[] = [];
  const edgeKeys = new Set<string>();
  for (const arrow of pageShapes) {
    if (arrow.type !== 'arrow') continue;
    const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow');
    const start = bindings.find((binding) => binding.props.terminal === 'start');
    const end = bindings.find((binding) => binding.props.terminal === 'end');
    if (!start || !end || start.toId === end.toId) continue;
    if (!allCards.has(start.toId)) continue;
    if (allCards.get(end.toId)?.props.kind !== 'generate') continue;
    const edgeKey = `${start.toId}->${end.toId}`;
    if (edgeKeys.has(edgeKey)) continue;
    edgeKeys.add(edgeKey);
    edges.push({ arrowId: arrow.id, sourceId: start.toId, targetId: end.toId });
  }

  const nodeIds = new Set(generationNodes.map((node) => node.id));
  const indegree = new Map<TLShapeId, number>();
  const downstream = new Map<TLShapeId, TLShapeId[]>();
  for (const nodeId of nodeIds) {
    indegree.set(nodeId, 0);
    downstream.set(nodeId, []);
  }
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) continue;
    downstream.get(edge.sourceId)?.push(edge.targetId);
    indegree.set(edge.targetId, (indegree.get(edge.targetId) || 0) + 1);
  }

  const queue = [...nodeIds].filter((nodeId) => indegree.get(nodeId) === 0);
  const order: TLShapeId[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift() as TLShapeId;
    order.push(nodeId);
    for (const targetId of downstream.get(nodeId) || []) {
      const nextIndegree = (indegree.get(targetId) || 0) - 1;
      indegree.set(targetId, nextIndegree);
      if (nextIndegree === 0) queue.push(targetId);
    }
  }

  if (order.length !== nodeIds.size) {
    throw new Error('生成节点存在循环连接，请移除回路后再运行。');
  }

  return { generationNodes, allCards, edges, order };
}

export function connectDesignCards(
  editor: Editor,
  sourceId: TLShapeId,
  targetId: TLShapeId
) {
  if (sourceId === targetId) throw new Error('节点不能连接到自身。');
  const source = editor.getShape<DesignCardShape>(sourceId);
  const target = editor.getShape<DesignCardShape>(targetId);
  if (!source || source.type !== DESIGN_CARD_TYPE) throw new Error('连接起点不是有效卡片。');
  if (!target || target.type !== DESIGN_CARD_TYPE || target.props.kind !== 'generate') {
    throw new Error('连接目标必须是生成节点。');
  }

  for (const shape of editor.getCurrentPageShapes()) {
    if (shape.type !== 'arrow') continue;
    const bindings = editor.getBindingsFromShape<TLArrowBinding>(shape, 'arrow');
    const start = bindings.find((binding) => binding.props.terminal === 'start');
    const end = bindings.find((binding) => binding.props.terminal === 'end');
    if (start?.toId === sourceId && end?.toId === targetId) return shape.id;
  }

  const sourceBounds = editor.getShapePageBounds(source);
  const targetBounds = editor.getShapePageBounds(target);
  if (!sourceBounds || !targetBounds) throw new Error('无法读取卡片位置。');
  const start = sourceBounds.center;
  const end = targetBounds.center;
  const targetIsRight = end.x >= start.x;
  const arrowId = createShapeId();

  editor.markHistoryStoppingPoint('connect design cards');
  editor.createShape<TLArrowShape>({
    id: arrowId,
    type: 'arrow',
    x: start.x,
    y: start.y,
    props: {
      kind: 'arc',
      start: { x: 0, y: 0 },
      end: { x: end.x - start.x, y: end.y - start.y },
      bend: getConnectionBend(sourceBounds, targetBounds),
      size: 's',
      dash: 'solid',
      color: 'black',
      arrowheadEnd: 'arrow',
    },
  });
  editor.createBindings([
    {
      type: 'arrow',
      fromId: arrowId,
      toId: sourceId,
      props: {
        terminal: 'start',
        normalizedAnchor: { x: targetIsRight ? 1 : 0, y: 0.5 },
        isExact: true,
        isPrecise: true,
        snap: 'none',
      },
    },
    {
      type: 'arrow',
      fromId: arrowId,
      toId: targetId,
      props: {
        terminal: 'end',
        normalizedAnchor: { x: targetIsRight ? 0 : 1, y: 0.5 },
        isExact: true,
        isPrecise: true,
        snap: 'none',
      },
    },
  ]);
  editor.select(targetId);
  editor.setCurrentTool('select');
  return arrowId;
}

export function normalizeDesignCardConnections(editor: Editor) {
  let updatedCount = 0;
  editor.run(() => {
    for (const shape of editor.getCurrentPageShapes()) {
      if (shape.type !== 'arrow') continue;
      const arrow = shape as TLArrowShape;
      const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow');
      const start = bindings.find((binding) => binding.props.terminal === 'start');
      const end = bindings.find((binding) => binding.props.terminal === 'end');
      if (!start || !end) continue;

      const source = editor.getShape<DesignCardShape>(start.toId);
      const target = editor.getShape<DesignCardShape>(end.toId);
      if (
        !source
        || source.type !== DESIGN_CARD_TYPE
        || !target
        || target.type !== DESIGN_CARD_TYPE
        || target.props.kind !== 'generate'
      ) continue;

      const sourceBounds = editor.getShapePageBounds(source);
      const targetBounds = editor.getShapePageBounds(target);
      if (!sourceBounds || !targetBounds) continue;
      const targetIsRight = targetBounds.center.x >= sourceBounds.center.x;
      const nextStartAnchor = { x: targetIsRight ? 1 : 0, y: 0.5 };
      const nextEndAnchor = { x: targetIsRight ? 0 : 1, y: 0.5 };
      const nextBend = getConnectionBend(sourceBounds, targetBounds);
      const needsBindingUpdate = (
        !start.props.isExact
        || !start.props.isPrecise
        || start.props.normalizedAnchor.x !== nextStartAnchor.x
        || start.props.normalizedAnchor.y !== nextStartAnchor.y
        || !end.props.isExact
        || !end.props.isPrecise
        || end.props.normalizedAnchor.x !== nextEndAnchor.x
        || end.props.normalizedAnchor.y !== nextEndAnchor.y
      );
      const needsArrowUpdate = arrow.props.kind !== 'arc' || Math.abs(arrow.props.bend - nextBend) > 0.1;
      if (!needsBindingUpdate && !needsArrowUpdate) continue;

      editor.updateBindings([
        {
          id: start.id,
          type: 'arrow',
          props: {
            normalizedAnchor: nextStartAnchor,
            isExact: true,
            isPrecise: true,
            snap: 'none',
          },
        },
        {
          id: end.id,
          type: 'arrow',
          props: {
            normalizedAnchor: nextEndAnchor,
            isExact: true,
            isPrecise: true,
            snap: 'none',
          },
        },
      ]);
      if (needsArrowUpdate) {
        editor.updateShape<TLArrowShape>({
          id: arrow.id,
          type: 'arrow',
          props: {
            kind: 'arc',
            bend: nextBend,
          },
        });
      }
      updatedCount += 1;
    }
  }, { history: 'ignore' });
  return updatedCount;
}

export function serializeGenerationWorkflow(
  graph: GenerationWorkflowGraph
): PersistedGenerationGraph {
  return {
    nodes: [...graph.allCards.values()].map((shape) => ({
      id: shape.id,
      type: shape.props.kind,
      data: shape.props.kind === 'generate'
        ? {
            ...getGenerationNodeInput(shape),
            status: shape.props.status || 'draft',
            outputAssetId: shape.props.outputAssetId || null,
            outputUrl: shape.props.outputUrl || null,
            outputSeed: shape.props.outputSeed ?? null,
          }
        : {
            title: shape.props.title,
            body: shape.props.body,
          },
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.arrowId,
      source: edge.sourceId,
      target: edge.targetId,
    })),
  };
}

export async function persistGenerationWorkflow(
  projectId: string,
  editor: Editor,
  graph = compileGenerationWorkflow(editor)
) {
  const bridge = getDesktopBridge();
  const current = await bridge.loadGraph(projectId);
  if (!current) throw new Error('项目执行图不存在。');
  const camera = editor.getCamera();
  const result = await bridge.saveGraph({
    projectId,
    graphSnapshot: serializeGenerationWorkflow(graph),
    viewport: { x: camera.x, y: camera.y, zoom: camera.z },
    baseVersion: current.version,
  });
  if (result.conflict) throw new Error('执行图版本冲突，请重新打开项目后再运行。');
  if (!result.success) throw new Error(result.error || '保存执行图失败。');
  return graph;
}

function getDownstreamNodeIds(graph: GenerationWorkflowGraph, startNodeId?: TLShapeId) {
  if (!startNodeId) return new Set(graph.order);
  if (!graph.generationNodes.some((node) => node.id === startNodeId)) {
    throw new Error('请选择一个生成节点作为运行起点。');
  }

  const downstream = new Map<TLShapeId, TLShapeId[]>();
  for (const edge of graph.edges) {
    if (graph.allCards.get(edge.sourceId)?.props.kind !== 'generate') continue;
    const targets = downstream.get(edge.sourceId) || [];
    targets.push(edge.targetId);
    downstream.set(edge.sourceId, targets);
  }
  const selected = new Set<TLShapeId>();
  const queue: TLShapeId[] = [startNodeId];
  while (queue.length > 0) {
    const nodeId = queue.shift() as TLShapeId;
    if (selected.has(nodeId)) continue;
    selected.add(nodeId);
    queue.push(...(downstream.get(nodeId) || []));
  }
  return selected;
}

function updateGenerationShape(
  editor: Editor,
  shapeId: TLShapeId,
  props: Partial<DesignCardShape['props']>
) {
  const shape = editor.getShape<DesignCardShape>(shapeId);
  if (!shape || shape.type !== DESIGN_CARD_TYPE || shape.props.kind !== 'generate') return;
  editor.updateShape<DesignCardShape>({ id: shapeId, type: DESIGN_CARD_TYPE, props });
}

async function pollGenerationJob(jobId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const response = await fetch(`/api/jobs/${jobId}`);
    const payload = await response.json() as JobResponse;
    if (!response.ok || !payload.success) throw new Error(payload.error || '读取生成任务失败');
    if (payload.data?.status === 'error') throw new Error(payload.data.error || '生成任务失败');
    if (payload.data?.status === 'done') {
      const url = payload.data.outputs?.thumbnails?.[0];
      if (!url) throw new Error('生成任务没有返回图片');
      return {
        url,
        assetId: payload.data.outputs?.asset_ids?.[0],
        seed: payload.data.outputs?.seeds?.[0],
      } satisfies GenerationOutput;
    }
  }
  throw new Error('生成任务超时');
}

async function executeGenerationNode(
  editor: Editor,
  shape: DesignCardShape,
  contextText: string[],
  upstreamOutputs: GenerationOutput[]
) {
  const input = getGenerationNodeInput(shape);
  const prompt = [input.prompt, ...contextText].filter(Boolean).join('\n');
  if (!prompt) throw new Error('生成节点缺少提示词或上游文本。');
  const inheritedSeed = upstreamOutputs.find((output) => output.seed !== undefined)?.seed;
  const effectiveSeed = input.seed ?? (inheritedSeed !== undefined ? inheritedSeed + 1 : undefined);
  const referenceImages = upstreamOutputs.map((output) => output.url).filter(Boolean);

  updateGenerationShape(editor, shape.id, { status: 'running', error: '' });
  const response = await fetch('/api/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_id: input.modelId,
      mode: referenceImages.length > 0 ? 'img2img' : 'text2img',
      prompt,
      negative: input.negativePrompt || undefined,
      params: {
        ratio: input.ratio,
        resolution: '1K',
        count: 1,
        seed: effectiveSeed,
        steps: input.steps,
        cfg: input.guidance,
        strength: input.strength,
        img2img_strength: input.strength,
        reference_images: referenceImages,
      },
    }),
  });
  const payload = await response.json() as { success: boolean; data?: { job_id: string }; error?: string };
  if (!response.ok || !payload.success || !payload.data?.job_id) {
    throw new Error(payload.error || '创建生成任务失败');
  }
  const output = await pollGenerationJob(payload.data.job_id);
  updateGenerationShape(editor, shape.id, {
    status: 'done',
    outputUrl: output.url,
    outputAssetId: output.assetId,
    outputSeed: output.seed,
    seed: effectiveSeed ?? output.seed,
    error: '',
  });
  return output;
}

export async function runGenerationWorkflow(
  editor: Editor,
  startNodeId?: TLShapeId,
  compiledGraph?: GenerationWorkflowGraph
): Promise<GenerationRunReport> {
  const graph = compiledGraph ?? compileGenerationWorkflow(editor);
  if (graph.generationNodes.length === 0) throw new Error('画布中没有生成节点。');
  const selectedNodeIds = getDownstreamNodeIds(graph, startNodeId);
  const outputs = new Map<TLShapeId, GenerationOutput>();
  for (const node of graph.generationNodes) {
    if (node.props.outputUrl) {
      outputs.set(node.id, {
        url: node.props.outputUrl,
        assetId: node.props.outputAssetId,
        seed: node.props.outputSeed ?? node.props.seed,
      });
    }
  }

  const completedNodeIds: TLShapeId[] = [];
  for (const nodeId of graph.order) {
    if (!selectedNodeIds.has(nodeId)) continue;
    const shape = graph.allCards.get(nodeId);
    if (!shape || shape.props.kind !== 'generate') continue;
    const incomingEdges = graph.edges.filter((edge) => edge.targetId === nodeId);
    const contextText: string[] = [];
    const upstreamOutputs: GenerationOutput[] = [];
    for (const edge of incomingEdges) {
      const source = graph.allCards.get(edge.sourceId);
      if (!source) continue;
      if (source.props.kind === 'generate') {
        const output = outputs.get(source.id);
        if (!output) throw new Error(`上游生成节点“${source.props.title}”还没有有效输出。`);
        upstreamOutputs.push(output);
      } else {
        const text = source.props.body.trim() || source.props.title.trim();
        if (text) contextText.push(text);
      }
    }

    try {
      const output = await executeGenerationNode(editor, shape, contextText, upstreamOutputs);
      outputs.set(nodeId, output);
      completedNodeIds.push(nodeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成节点执行失败';
      updateGenerationShape(editor, nodeId, { status: 'error', error: message });
      throw error;
    }
  }

  return { completedNodeIds, edgeCount: graph.edges.length };
}
