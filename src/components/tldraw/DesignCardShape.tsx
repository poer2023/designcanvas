import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
} from 'tldraw';
import { ImageIcon, Sparkles } from 'lucide-react';

export const DESIGN_CARD_TYPE = 'design-card' as const;
export const DESIGN_CARD_PORT_EVENT = 'designcanvas:card-port';
export type DesignCardKind = 'brief' | 'note' | 'asset' | 'task' | 'generate';
export type DesignCardPortRole = 'input' | 'output';

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

function ConnectionPort({
  shapeId,
  role,
  title,
}: {
  shapeId: DesignCardShape['id'];
  role: DesignCardPortRole;
  title: string;
}) {
  const label = role === 'output' ? `从“${title}”连接` : `连接到“${title}”`;
  return (
    <button
      type="button"
      className={`dc-card-port dc-card-port--${role}`}
      data-connection-port={role}
      aria-label={label}
      title={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent(DESIGN_CARD_PORT_EVENT, {
          detail: { shapeId, role },
        }));
      }}
    >
      <span />
    </button>
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
    const { kind, title, body, eyebrow, outputUrl, status = 'draft', error } = shape.props;
    if (kind === 'generate') {
      return (
        <HTMLContainer
          className="dc-generation-card"
          data-testid="generation-card-shape"
          style={{ pointerEvents: 'all' }}
        >
          <ConnectionPort shapeId={shape.id} role="input" title={title} />
          <ConnectionPort shapeId={shape.id} role="output" title={title} />
          <div
            className="dc-generation-card__preview"
            data-status={status}
            style={outputUrl ? { backgroundImage: `url(${JSON.stringify(outputUrl)})` } : undefined}
          >
            {!outputUrl ? <div className="dc-generation-card__symbol"><ImageIcon size={24} /></div> : null}
            <span><Sparkles size={12} /> GENERATION DRAFT</span>
          </div>
          <div className="dc-generation-card__content">
            <div className="dc-generation-card__meta">
              <span>{eyebrow}</span>
              <span className="dc-generation-card__state" data-status={status}>{generationStatusLabel[status]}</span>
            </div>
            <div className="dc-generation-card__title">{title}</div>
            <div className="dc-generation-card__prompt">{status === 'error' && error ? error : body}</div>
          </div>
        </HTMLContainer>
      );
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
