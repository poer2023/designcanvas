'use client';

import { useCallback, useEffect, useMemo, useRef, useState, memo, type ReactNode } from 'react';
import { Handle, NodeToolbar, Position } from '@xyflow/react';
import {
    Type,
    FileText,
    ChevronDown,
    Save,
    Plus,
    X,
    Settings,
    Bold,
    Heading1,
    List,
    Link2,
    Code,
} from 'lucide-react';
import { ActionBar, type ActionId } from '@/components/canvas/ActionBar';
import { useGraphStore } from '@/store/graphStore';
import { useSnapshotStore, type PortKey } from '@/store/snapshotStore';
import { v4 as uuidv4 } from 'uuid';

// v1.7: Only Notes and Brief roles
type TextRole = 'notes' | 'brief';

interface TextCardData {
    role: TextRole;
    content: string;
    // GraphStore common fields (for ActionBar + persistence)
    skillName?: string;
    locked?: boolean;
    status?: 'idle' | 'running' | 'success' | 'fail';
    error?: string;
    color?: string;
    // Brief-specific fields
    title?: string;
    subtitle?: string;
    info?: string;
    size?: string;
    tone?: number;
    constraints?: string[];
}

interface TextCardProps {
    id: string;
    data: Partial<TextCardData>;
    selected?: boolean;
}

const SIZE_OPTIONS = ['1080×1920', '1920×1080', '1080×1080', 'A4', 'Custom'];

function safeHref(href: string): string | null {
    const value = href.trim();
    if (!value) return null;
    if (value.startsWith('/')) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('mailto:')) return value;
    return null;
}

function renderInlineMarkdown(text: string): ReactNode[] {
    const parts: ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(text))) {
        const start = match.index;
        const raw = match[0];
        if (start > lastIndex) {
            parts.push(text.slice(lastIndex, start));
        }

        if (raw.startsWith('**') && raw.endsWith('**')) {
            parts.push(<strong key={`b-${key++}`}>{raw.slice(2, -2)}</strong>);
        } else {
            const linkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            const label = linkMatch?.[1] ?? raw;
            const href = linkMatch?.[2] ?? '';
            const safe = safeHref(href);
            if (safe) {
                parts.push(
                    <a
                        key={`a-${key++}`}
                        href={safe}
                        target={safe.startsWith('http') ? '_blank' : undefined}
                        rel={safe.startsWith('http') ? 'noreferrer' : undefined}
                        className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                    >
                        {label}
                    </a>
                );
            } else {
                parts.push(raw);
            }
        }

        lastIndex = start + raw.length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}

function renderMarkdownMinimal(content: string): ReactNode {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const blocks: ReactNode[] = [];

    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i] ?? '';

        if (line.startsWith('```')) {
            i += 1;
            const codeLines: string[] = [];
            while (i < lines.length && !lines[i]?.startsWith('```')) {
                codeLines.push(lines[i] ?? '');
                i += 1;
            }
            if (i < lines.length && lines[i]?.startsWith('```')) i += 1;
            blocks.push(
                <pre
                    key={`code-${key++}`}
                    className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed"
                >
                    <code>{codeLines.join('\n')}</code>
                </pre>
            );
            continue;
        }

        const heading = line.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
            const level = heading[1]?.length ?? 1;
            const text = heading[2] ?? '';
            const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
            blocks.push(
                <HeadingTag
                    key={`h-${key++}`}
                    className={level === 1 ? 'text-xl font-semibold text-gray-900' : level === 2 ? 'text-lg font-semibold text-gray-900' : 'text-base font-semibold text-gray-900'}
                >
                    {renderInlineMarkdown(text)}
                </HeadingTag>
            );
            i += 1;
            continue;
        }

        const isList = /^\s*[-*]\s+/.test(line);
        if (isList) {
            const items: string[] = [];
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
                items.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''));
                i += 1;
            }
            blocks.push(
                <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 text-sm text-gray-800">
                    {items.map((item, idx) => (
                        <li key={`li-${idx}`}>{renderInlineMarkdown(item)}</li>
                    ))}
                </ul>
            );
            continue;
        }

        if (!line.trim()) {
            i += 1;
            continue;
        }

        const paraLines = [line];
        i += 1;
        while (
            i < lines.length &&
            (lines[i] ?? '').trim() &&
            !(lines[i] ?? '').startsWith('```') &&
            !/^(#{1,3})\s+/.test(lines[i] ?? '') &&
            !/^\s*[-*]\s+/.test(lines[i] ?? '')
        ) {
            paraLines.push(lines[i] ?? '');
            i += 1;
        }

        blocks.push(
            <p key={`p-${key++}`} className="text-sm text-gray-800 leading-relaxed">
                {renderInlineMarkdown(paraLines.join(' '))}
            </p>
        );
    }

    if (blocks.length === 0) {
        return <div className="text-sm text-gray-400">Nothing to preview</div>;
    }

    return <div className="space-y-3">{blocks}</div>;
}

function TextCardComponent({ id, data, selected }: TextCardProps) {
    const [role, setRole] = useState<TextRole>(data.role || 'notes');
    const [content, setContent] = useState(data.content || '');

    // Brief fields
    const [title, setTitle] = useState(data.title || '');
    const [subtitle, setSubtitle] = useState(data.subtitle || '');
    const [info, setInfo] = useState(data.info || '');
    const [size, setSize] = useState(data.size || '1080×1920');
    const [tone, setTone] = useState(data.tone ?? 50);
    const [constraints, setConstraints] = useState<string[]>(data.constraints || []);

    // UI States
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Performance: Use individual selectors to avoid re-render on nodes array changes
    const setNodes = useGraphStore(state => state.setNodes);
    const removeNode = useGraphStore(state => state.removeNode);
    const toggleNodeLock = useGraphStore(state => state.toggleNodeLock);
    const updateNodeData = useGraphStore(state => state.updateNodeData);
    const createSnapshot = useSnapshotStore(state => state.createSnapshot);

    const cycleColor = (current: string | undefined) => {
        const colors = [undefined, '#FEF3C7', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#E0E7FF'] as const;
        const currentIndex = Math.max(0, colors.findIndex(c => c === current));
        return colors[(currentIndex + 1) % colors.length];
    };

    const briefMarkdown = useMemo(() => {
        const lines: string[] = [];
        if (title.trim()) lines.push(`# ${title.trim()}`);
        if (subtitle.trim()) lines.push(`## ${subtitle.trim()}`);
        if (size?.trim()) lines.push(`- Size: ${size}`);
        if (typeof tone === 'number') lines.push(`- Tone: ${tone}`);
        if (info.trim()) {
            lines.push('');
            lines.push(info.trim());
        }
        if (constraints.length > 0) {
            lines.push('');
            lines.push('### Constraints');
            for (const c of constraints) {
                if (c.trim()) lines.push(`- ${c.trim()}`);
            }
        }
        return lines.join('\n');
    }, [title, subtitle, size, tone, info, constraints]);

    const outputText = role === 'brief' ? briefMarkdown : content;

    const updateTextWithSelection = useCallback(
        (next: string, selection?: { start: number; end: number }) => {
            setContent(next);
            if (!selection) return;
            const el = textareaRef.current;
            if (!el) return;
            requestAnimationFrame(() => {
                el.focus();
                el.setSelectionRange(selection.start, selection.end);
            });
        },
        []
    );

    const wrapSelection = useCallback(
        (before: string, after: string) => {
            const el = textareaRef.current;
            if (!el) return;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const selectedText = content.slice(start, end);
            const next = content.slice(0, start) + before + selectedText + after + content.slice(end);
            const cursorStart = start + before.length;
            const cursorEnd = cursorStart + selectedText.length;
            updateTextWithSelection(next, { start: cursorStart, end: cursorEnd });
        },
        [content, updateTextWithSelection]
    );

    const prefixSelectedLines = useCallback(
        (prefix: string) => {
            const el = textareaRef.current;
            if (!el) return;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;

            const lineStart = content.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = (() => {
                const nextBreak = content.indexOf('\n', end);
                return nextBreak === -1 ? content.length : nextBreak;
            })();

            const segment = content.slice(lineStart, lineEnd);
            const segmentLines = segment.split('\n');
            const nextSegment = segmentLines
                .map(l => (l.trim() ? (l.startsWith(prefix) ? l : `${prefix}${l}`) : l))
                .join('\n');

            const next = content.slice(0, lineStart) + nextSegment + content.slice(lineEnd);

            const delta = nextSegment.length - segment.length;
            updateTextWithSelection(next, { start, end: end + delta });
        },
        [content, updateTextWithSelection]
    );

    const insertLink = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const selectedText = content.slice(start, end) || 'link text';
        const href = window.prompt('Link URL (https://...)', 'https://')?.trim() || '';
        if (!href) return;
        const snippet = `[${selectedText}](${href})`;
        const next = content.slice(0, start) + snippet + content.slice(end);
        const cursor = start + snippet.length;
        updateTextWithSelection(next, { start: cursor, end: cursor });
    }, [content, updateTextWithSelection]);

    const insertCodeBlock = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const selectedText = content.slice(start, end);

        if (selectedText) {
            const snippet = `\`\`\`\n${selectedText}\n\`\`\``;
            const next = content.slice(0, start) + snippet + content.slice(end);
            updateTextWithSelection(next, { start: start + 4, end: start + 4 + selectedText.length });
            return;
        }

        const snippet = '```\n\n```';
        const next = content.slice(0, start) + snippet + content.slice(end);
        const cursor = start + 4;
        updateTextWithSelection(next, { start: cursor, end: cursor });
    }, [content, updateTextWithSelection]);

    const handleAction = (actionId: ActionId) => {
        switch (actionId) {
            case 'preview':
                setShowPreview(true);
                break;
            case 'duplicate': {
                const store = useGraphStore.getState();
                store.pushHistory({ label: 'duplicate' });
                const nodeToCopy = store.nodes.find(n => n.id === id);
                if (!nodeToCopy) return;
                const newNode = {
                    ...JSON.parse(JSON.stringify(nodeToCopy)),
                    id: uuidv4(),
                    position: {
                        x: nodeToCopy.position.x + 50,
                        y: nodeToCopy.position.y + 50,
                    },
                    selected: false,
                };
                setNodes([...store.nodes, newNode]);
                break;
            }
            case 'delete':
                removeNode(id);
                break;
            case 'lock':
            case 'unlock':
                toggleNodeLock(id);
                break;
            case 'rename': {
                const currentName = (data.skillName as string | undefined) || 'Text';
                const nextName = window.prompt('Rename node', currentName);
                if (nextName && nextName.trim()) {
                    updateNodeData(id, { skillName: nextName.trim() });
                }
                break;
            }
            case 'color': {
                const next = cycleColor(data.color as string | undefined);
                updateNodeData(id, { color: next });
                break;
            }
            default:
                break;
        }
    };

    const addConstraint = () => {
        const newConstraint = prompt('Enter constraint:');
        if (newConstraint) {
            setConstraints([...constraints, newConstraint]);
        }
    };

    // Persist node data (for runner + PRD v2.0 graph persistence).
    useEffect(() => {
        updateNodeData(id, { role, content, title, subtitle, info, size, tone, constraints });
    }, [id, role, content, title, subtitle, info, size, tone, constraints, updateNodeData]);

    // Auto-emit briefOut snapshots so downstream nodes become stale when text changes.
    // Debounced to avoid creating a snapshot on every keystroke.
    useEffect(() => {
        if (data.locked) return;
        const t = setTimeout(() => {
            createSnapshot(id, 'briefOut' as PortKey, outputText);
        }, 300);
        return () => clearTimeout(t);
    }, [id, outputText, data.locked, createSnapshot]);

    return (
        <div className="group/card relative">
            {/* PRD v2.1: Action Bar */}
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
                <ActionBar
                    nodeId={id}
                    nodeType="textCard"
                    isLocked={!!data.locked}
                    isRunning={data.status === 'running'}
                    hasResults={outputText.trim().length > 0}
                    onAction={handleAction}
                />
            </NodeToolbar>
            {/* Left Handle (Target) - Full height hit area, visual button centered */}
            <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                {/* Visual plus button - centered */}
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-blue-400 group-hover/handle:shadow-lg group-hover/handle:bg-blue-50">
                    <Plus size={14} className="text-gray-500 group-hover/handle:text-blue-500" />
                </div>
            </div>

            {/* Right Handle (Source) - Small button only */}
            <Handle
                type="source"
                position={Position.Right}
                id="briefOut"
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-blue-400 hover:!shadow-lg hover:!bg-blue-50"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
                <Plus size={14} className="text-gray-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    bg-white rounded-[32px] overflow-hidden min-w-[320px] max-w-[420px]
                    flex flex-col relative
                    transition-all duration-200
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        {role === 'notes' ? <Type size={18} className="text-gray-600" /> : <FileText size={18} className="text-blue-500" />}
                        <div className="relative">
                            <button
                                onClick={() => setShowRoleMenu(!showRoleMenu)}
                                className="font-semibold text-sm capitalize flex items-center gap-1 hover:text-gray-600"
                            >
                                {role}
                                <ChevronDown size={12} className="opacity-50" />
                            </button>
                            {showRoleMenu && (
                                <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                                    <button
                                        onClick={() => { setRole('notes'); setShowRoleMenu(false); }}
                                        disabled={!!data.locked}
                                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50"
                                    >
                                        Notes
                                    </button>
                                    <button
                                        onClick={() => { setRole('brief'); setShowRoleMenu(false); }}
                                        disabled={!!data.locked}
                                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50"
                                    >
                                        Brief
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Note Mode */}
                {role === 'notes' && (
                    <div className="px-6 pb-20 pt-0">
                        {/* Minimal markdown toolbar (P1) */}
                        <div className="flex items-center gap-1 mb-3">
                            <button
                                type="button"
                                disabled={!!data.locked}
                                onClick={() => prefixSelectedLines('# ')}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                                title="Heading"
                            >
                                <Heading1 size={14} />
                            </button>
                            <button
                                type="button"
                                disabled={!!data.locked}
                                onClick={() => wrapSelection('**', '**')}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                                title="Bold (⌘/Ctrl+B)"
                            >
                                <Bold size={14} />
                            </button>
                            <button
                                type="button"
                                disabled={!!data.locked}
                                onClick={() => prefixSelectedLines('- ')}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                                title="List"
                            >
                                <List size={14} />
                            </button>
                            <button
                                type="button"
                                disabled={!!data.locked}
                                onClick={insertLink}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                                title="Link (⌘/Ctrl+K)"
                            >
                                <Link2 size={14} />
                            </button>
                            <button
                                type="button"
                                disabled={!!data.locked}
                                onClick={insertCodeBlock}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                                title="Code block"
                            >
                                <Code size={14} />
                            </button>
                            <div className="flex-1" />
                            <div className="text-[10px] text-gray-400">
                                Markdown
                            </div>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (data.locked) return;
                                const mod = e.metaKey || e.ctrlKey;
                                if (!mod) return;
                                if (e.key === 'b') {
                                    e.preventDefault();
                                    wrapSelection('**', '**');
                                }
                                if (e.key === 'k') {
                                    e.preventDefault();
                                    insertLink();
                                }
                            }}
                            disabled={!!data.locked}
                            placeholder="Type something..."
                            className="w-full min-h-[200px] text-sm text-gray-700 placeholder-gray-300 resize-none outline-none bg-transparent"
                        />
                    </div>
                )}

                {/* Brief Mode */}
                {role === 'brief' && (
                    <div className="px-6 pb-8 pt-0 space-y-4">
                        <div>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Poster Title"
                                disabled={!!data.locked}
                                className="w-full text-lg font-bold placeholder-gray-300 border-none p-0 focus:ring-0"
                            />
                            <input
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="Add subtitle..."
                                disabled={!!data.locked}
                                className="w-full text-sm text-gray-500 placeholder-gray-300 border-none p-0 focus:ring-0 mt-1"
                            />
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                            <div className="flex gap-2">
                                <select
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    disabled={!!data.locked}
                                    className="flex-1 px-3 py-2 text-xs bg-white rounded-xl border border-gray-200 outline-none"
                                >
                                    {SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <button
                                    onClick={() => setShowSettings(!showSettings)}
                                    className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700"
                                >
                                    <Settings size={14} />
                                </button>
                            </div>

                            {showSettings && (
                                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-medium">Information</label>
                                        <textarea
                                            value={info}
                                            onChange={(e) => setInfo(e.target.value)}
                                            placeholder="Date, Venue, etc."
                                            rows={2}
                                            disabled={!!data.locked}
                                            className="w-full mt-1 px-3 py-2 text-xs bg-white rounded-xl border border-gray-200 resize-none outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-medium">Tone ({tone})</label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={tone}
                                            onChange={(e) => setTone(Number(e.target.value))}
                                            disabled={!!data.locked}
                                            className="w-full mt-1 accent-black"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {constraints.map((c, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                                    {c}
                                    <button
                                        disabled={!!data.locked}
                                        onClick={() => setConstraints(constraints.filter((_, idx) => idx !== i))}
                                        className="hover:text-red-800 disabled:opacity-40"
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={addConstraint}
                                disabled={!!data.locked}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-gray-200"
                            >
                                <Plus size={12} />
                                Constraint
                            </button>
                        </div>
                    </div>
                )}

                {/* Note Actions Bottom Bar */}
                {role === 'notes' && (
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <button className="px-4 py-2 bg-black text-white text-xs font-medium rounded-full shadow-lg hover:bg-gray-800 flex items-center gap-1.5 transition-transform active:scale-95">
                            <Save size={12} />
                            Save Note
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                            <div className="text-sm font-medium text-gray-900">Preview</div>
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">
                            {renderMarkdownMinimal(outputText)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(TextCardComponent);
