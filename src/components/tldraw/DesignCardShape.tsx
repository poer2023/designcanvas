import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  useEditor,
  type RecordProps,
  type TLShape,
} from 'tldraw';
import { ImageIcon, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, type SyntheticEvent } from 'react';

export const DESIGN_CARD_TYPE = 'design-card' as const;
export const DESIGN_CARD_PORT_EVENT = 'designcanvas:card-port';
export const DESIGN_CARD_ACTION_EVENT = 'designcanvas:card-action';
export type DesignCardKind = 'brief' | 'note' | 'asset' | 'task' | 'generate';
export type DesignCardPortRole = 'input' | 'output';
export type DesignCardPortPhase = 'click' | 'drag-start' | 'drag-move' | 'drag-end' | 'drag-cancel';

export interface DesignCardPortEventDetail {
  phase: DesignCardPortPhase;
  shapeId: DesignCardShape['id'];
  role: DesignCardPortRole;
  clientX?: number;
  clientY?: number;
  targetShapeId?: DesignCardShape['id'];
}

export interface DesignCardActionEventDetail {
  action: 'edit' | 'run';
  shapeId: DesignCardShape['id'];
}

export interface DesignCardProps {
  w: number;
  h: number;
  kind: DesignCardKind;
  title: string;
  body: string;
  eyebrow: string;
  prompt?: string;
  negativePrompt?: string;
  modelId?: string;
  ratio?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  strength?: number;
  status?: 'draft' | 'queued' | 'running' | 'done' | 'error';
  outputUrl?: string;
  outputAssetId?: string;
  outputSeed?: number;
  error?: string;
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    [DESIGN_CARD_TYPE]: DesignCardProps;
  }
}

export type DesignCardShape = TLShape<typeof DESIGN_CARD_TYPE>;

const kindLabel: Record<DesignCardKind, string> = {
  brief: 'BRIEF',
  note: 'NOTE',
  asset: 'ASSET',
  task: 'TASK',
  generate: 'GENERATE',
};

const generationStatusLabel: Record<NonNullable<DesignCardProps['status']>, string> = {
  draft: '草稿',
  queued: '排队中',
  running: '生成中',
  done: '完成',
  error: '失败',
};

function stopCanvasEvent(event: SyntheticEvent) {
  event.stopPropagation();
}

function ConnectionPort({
  shapeId,
  role,
  title,
}: {
  shapeId: DesignCardShape['id'];
  role: DesignCardPortRole;
  title: string;
}) {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const label = role === 'output' ? `从“${title}”连接` : `连接到“${title}”`;
  const dispatchPortEvent = (detail: Omit<DesignCardPortEventDetail, 'shapeId' | 'role'>) => {
    window.dispatchEvent(new CustomEvent(DESIGN_CARD_PORT_EVENT, {
      detail: { ...detail, shapeId, role } satisfies DesignCardPortEventDetail,
    }));
  };
  useEffect(() => () => dragCleanupRef.current?.(), []);
  return (
    <button
      type="button"
      className={`dc-card-port dc-card-port--${role}`}
      data-connection-port={role}
      data-connection-shape-id={shapeId}
      aria-label={label}
      title={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (role !== 'output') return;
        dragCleanupRef.current?.();
        dragStartRef.current = { x: event.clientX, y: event.clientY };
        didDragRef.current = false;
        const pointerId = event.pointerId;
        const cleanup = () => {
          window.removeEventListener('pointermove', handlePointerMove, true);
          window.removeEventListener('pointerup', handlePointerUp, true);
          window.removeEventListener('pointercancel', handlePointerCancel, true);
          dragCleanupRef.current = null;
        };
        const handlePointerMove = (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId !== pointerId || !dragStartRef.current) return;
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          const start = dragStartRef.current;
          if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) > 4) {
            didDragRef.current = true;
          }
          if (!didDragRef.current) return;
          const targetPort = document
            .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
            ?.closest<HTMLElement>('[data-connection-port="input"]');
          dispatchPortEvent({
            phase: 'drag-move',
            clientX: moveEvent.clientX,
            clientY: moveEvent.clientY,
            targetShapeId: targetPort?.dataset.connectionShapeId as DesignCardShape['id'] | undefined,
          });
        };
        const finishPointerDrag = (finishEvent: PointerEvent, cancelled: boolean) => {
          if (finishEvent.pointerId !== pointerId || !dragStartRef.current) return;
          finishEvent.preventDefault();
          finishEvent.stopPropagation();
          const didDrag = didDragRef.current;
          dragStartRef.current = null;
          cleanup();
          if (cancelled || !didDrag) {
            if (cancelled) didDragRef.current = false;
            dispatchPortEvent({ phase: 'drag-cancel' });
            return;
          }
          const targetPort = document
            .elementFromPoint(finishEvent.clientX, finishEvent.clientY)
            ?.closest<HTMLElement>('[data-connection-port="input"]');
          const targetShapeId = targetPort?.dataset.connectionShapeId as DesignCardShape['id'] | undefined;
          dispatchPortEvent({
            phase: targetShapeId ? 'drag-end' : 'drag-cancel',
            clientX: finishEvent.clientX,
            clientY: finishEvent.clientY,
            targetShapeId,
          });
        };
        const handlePointerUp = (upEvent: PointerEvent) => finishPointerDrag(upEvent, false);
        const handlePointerCancel = (cancelEvent: PointerEvent) => finishPointerDrag(cancelEvent, true);
        window.addEventListener('pointermove', handlePointerMove, true);
        window.addEventListener('pointerup', handlePointerUp, true);
        window.addEventListener('pointercancel', handlePointerCancel, true);
        dragCleanupRef.current = cleanup;
        dispatchPortEvent({ phase: 'drag-start', clientX: event.clientX, clientY: event.clientY });
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        dispatchPortEvent({ phase: 'click' });
      }}
    >
      <span />
    </button>
  );
}

function GenerationCard({ shape }: { shape: DesignCardShape }) {
  const editor = useEditor();
  const {
    title,
    body,
    outputUrl,
    status = 'draft',
    error,
    modelId = 'mock:default',
    ratio = '1:1',
  } = shape.props;
  const selectCard = () => {
    editor.select(shape.id);
    editor.setCurrentTool('select');
  };
  const openInspector = () => {
    selectCard();
    window.dispatchEvent(new CustomEvent(DESIGN_CARD_ACTION_EVENT, {
      detail: { action: 'edit', shapeId: shape.id } satisfies DesignCardActionEventDetail,
    }));
  };
  const processing = status === 'queued' || status === 'running';

  return (
    <HTMLContainer
      className="dc-image-result-card"
      data-testid="image-result-card-shape"
      style={{ pointerEvents: 'all' }}
      onDoubleClick={(event) => {
        stopCanvasEvent(event);
        openInspector();
      }}
    >
      <ConnectionPort shapeId={shape.id} role="input" title={title} />
      <ConnectionPort shapeId={shape.id} role="output" title={title} />
      <div
        className="dc-image-result-card__preview"
        data-status={status}
        style={outputUrl ? { backgroundImage: `url(${JSON.stringify(outputUrl)})` } : undefined}
      >
        {!outputUrl ? (
          <div className="dc-image-result-card__symbol">
            {processing ? <LoaderCircle className="dc-spin" size={24} /> : <ImageIcon size={24} />}
          </div>
        ) : null}
      </div>
      <div className="dc-image-result-card__content">
        <div className="dc-image-result-card__meta">
          <span>{ratio} · {modelId === 'mock:default' ? 'Mock Generator' : modelId}</span>
          <span className="dc-image-result-card__state" data-status={status}>{generationStatusLabel[status]}</span>
        </div>
        <div className="dc-image-result-card__prompt">{status === 'error' && error ? error : body}</div>
      </div>
    </HTMLContainer>
  );
}

export class DesignCardShapeUtil extends BaseBoxShapeUtil<DesignCardShape> {
  static override type = DESIGN_CARD_TYPE;
  static override props: RecordProps<DesignCardShape> = {
    w: T.number,
    h: T.number,
    kind: T.literalEnum('brief', 'note', 'asset', 'task', 'generate'),
    title: T.string,
    body: T.string,
    eyebrow: T.string,
    prompt: T.optional(T.string),
    negativePrompt: T.optional(T.string),
    modelId: T.optional(T.string),
    ratio: T.optional(T.string),
    seed: T.optional(T.number),
    steps: T.optional(T.number),
    guidance: T.optional(T.number),
    strength: T.optional(T.number),
    status: T.optional(T.literalEnum('draft', 'queued', 'running', 'done', 'error')),
    outputUrl: T.optional(T.string),
    outputAssetId: T.optional(T.string),
    outputSeed: T.optional(T.number),
    error: T.optional(T.string),
  };

  override canResize() {
    return true;
  }

  override getDefaultProps(): DesignCardShape['props'] {
    return {
      w: 320,
      h: 188,
      kind: 'note',
      title: 'Untitled card',
      body: '',
      eyebrow: '',
    };
  }

  override getAriaDescriptor(shape: DesignCardShape) {
    return `${kindLabel[shape.props.kind]}: ${shape.props.title}`;
  }

  component(shape: DesignCardShape) {
    const { kind, title, body, eyebrow } = shape.props;
    if (kind === 'generate') {
      return <GenerationCard shape={shape} />;
    }

    return (
      <HTMLContainer
        className="dc-design-card"
        data-kind={kind}
        data-testid="design-card-shape"
        style={{ pointerEvents: 'all' }}
      >
        <ConnectionPort shapeId={shape.id} role="output" title={title} />
        <div className="dc-design-card__content">
          <div className="dc-design-card__meta">
            <span>{kindLabel[kind]}</span>
            <span className="dc-design-card__status" />
          </div>
          {eyebrow ? <div className="dc-design-card__eyebrow">{eyebrow}</div> : null}
          <div className="dc-design-card__title">{title}</div>
          {body ? <div className="dc-design-card__body">{body}</div> : null}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: DesignCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx="8" ry="8" />;
  }
}

export const designCardShapeUtils = [DesignCardShapeUtil];
