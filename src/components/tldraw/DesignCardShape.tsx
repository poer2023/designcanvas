import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
} from 'tldraw';
import { ImageIcon, Sparkles } from 'lucide-react';

export const DESIGN_CARD_TYPE = 'design-card' as const;
export type DesignCardKind = 'brief' | 'note' | 'asset' | 'task' | 'generate';

export interface DesignCardProps {
  w: number;
  h: number;
  kind: DesignCardKind;
  title: string;
  body: string;
  eyebrow: string;
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

export class DesignCardShapeUtil extends BaseBoxShapeUtil<DesignCardShape> {
  static override type = DESIGN_CARD_TYPE;
  static override props: RecordProps<DesignCardShape> = {
    w: T.number,
    h: T.number,
    kind: T.literalEnum('brief', 'note', 'asset', 'task', 'generate'),
    title: T.string,
    body: T.string,
    eyebrow: T.string,
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
      return (
        <HTMLContainer
          className="dc-generation-card"
          data-testid="generation-card-shape"
          style={{ pointerEvents: 'all' }}
        >
          <div className="dc-generation-card__preview">
            <div className="dc-generation-card__symbol"><ImageIcon size={24} /></div>
            <span><Sparkles size={12} /> GENERATION DRAFT</span>
          </div>
          <div className="dc-generation-card__content">
            <div className="dc-generation-card__meta">
              <span>{eyebrow}</span>
              <span className="dc-generation-card__state">草稿</span>
            </div>
            <div className="dc-generation-card__title">{title}</div>
            <div className="dc-generation-card__prompt">{body}</div>
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
        <div className="dc-design-card__rail" />
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
