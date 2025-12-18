'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';
import {
    Sparkles,
    Play,
    Settings,
    Image as ImageIcon,
    Loader2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    AlertTriangle,
    Cpu,
    X,
} from 'lucide-react';
import { useSettingsStore, useEnabledModels, type Model } from '@/store/settingsStore';
import { useSnapshotStore, type PortKey } from '@/store/snapshotStore';
import { useGraphStore } from '@/store/graphStore';
import { ActionBar, type ActionId } from '@/components/canvas/ActionBar';
import { v4 as uuidv4 } from 'uuid';
import { runGraph } from '@/lib/engine/runner';


// State machine states
type StudioState = 'empty' | 'draft' | 'generated' | 'pinned';
type RunStatus = 'idle' | 'running' | 'success' | 'fail';

interface ImageResult {
    id: string;
    url: string;
    seed?: number;
}

interface ImageStudioData {
    state: StudioState;
    status: RunStatus;
    // GraphStore common fields
    skillName?: string;
    error?: string;
    color?: string;
    prompt: string;
    negative?: string;
    compiledBrief?: string;
    model: string | null;
    ratio: string;
    resolution: string;
    count: number;
    seed?: number;
    cfg?: number;
    steps?: number;
    styleStrength?: number;
    img2imgStrength?: number;
    useCurrentAsInput?: boolean;
    results: ImageResult[];
    pinnedId?: string;
    favorite?: boolean;
    locked?: boolean;
}

interface ImageStudioProps {
    id: string;
    data: Partial<ImageStudioData>;
    selected?: boolean;
}

const RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'];
const RESOLUTIONS = ['1K', '2K', '4K'];

function ImageStudioComponent({ id, data, selected }: ImageStudioProps) {
    // Settings store
    const { loaded, fetchAll, defaults, models } = useSettingsStore();
    const enabledModels = useEnabledModels('text2img');

    // Initialize settings on mount
    useEffect(() => {
        if (!loaded) {
            fetchAll();
        }
    }, [loaded, fetchAll]);

    // State
    const [state, setState] = useState<StudioState>(data.state || 'empty');
    const [status, setStatus] = useState<RunStatus>(() => {
        const raw = data.status as unknown;
        if (raw === 'done') return 'success';
        if (raw === 'error') return 'fail';
        if (raw === 'idle' || raw === 'running' || raw === 'success' || raw === 'fail') return raw;
        return 'idle';
    });
    const [prompt, setPrompt] = useState(data.prompt || '');
    const [error, setError] = useState<string | null>(null);

    // Controls
    const [modelId, setModelId] = useState<string | null>(data.model || null);
    const [ratio, setRatio] = useState(data.ratio || '3:2');
    const [resolution, setResolution] = useState(data.resolution || '2K');
    const [count, setCount] = useState(data.count || 1);

    // Advanced settings visibility
    const [showSettings, setShowSettings] = useState(false);
    const [showDropdown, setShowDropdown] = useState<'model' | 'ratio' | 'resolution' | null>(null);

    // Preview lightbox
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Results
    const [results, setResults] = useState<ImageResult[]>(data.results || []);
    const imageHistory = useSnapshotStore(state => state.getSnapshotHistory(id, 'imageOut' as PortKey));
    const activeImageSnapshotId = useSnapshotStore(state => state.activeByProducerPort[`${id}:imageOut`]);
    const hasBriefInput = useSnapshotStore(state => {
        const subs = state.getSubscriptions(id);
        return subs
            .filter(s => s.port_key === 'briefOut')
            .some(s => !!state.getSnapshot(s.producer_id, s.port_key));
    });

    // Get effective model (with fallback to default)
    const effectiveModelId = modelId || defaults?.default_text2img_model_id || null;
    const currentModel = models.find(m => m.model_id === effectiveModelId);
    const isModelDisabled = currentModel && !currentModel.is_enabled;
    const isModelMissing = !currentModel && effectiveModelId;

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    // Reserve space for the bottom controls so results aren't covered.
    const controlsRef = useRef<HTMLDivElement>(null);
    const [controlsHeight, setControlsHeight] = useState(140);
    useEffect(() => {
        const el = controlsRef.current;
        if (!el) return;

        const update = () => {
            const next = Math.ceil(el.getBoundingClientRect().height);
            setControlsHeight((prev) => (prev === next ? prev : next));
        };

        update();
        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Calculate content height based on ratio with fixed width (480px - 48px padding = 432px)
    const getContentDimensions = () => {
        const [w, h] = ratio.split(':').map(Number);
        const contentWidth = 432;
        const aspectRatio = w / h;
        const height = contentWidth / aspectRatio;
        return { width: contentWidth, height };
    };

    const { height: contentHeight } = getContentDimensions();
    const contentReservedHeight = controlsHeight + 16 + 16;

    // Check if can run
    const canRun = Boolean((prompt.trim() || hasBriefInput) && effectiveModelId && !isModelDisabled && !isModelMissing);

    const handleRun = useCallback(async () => {
        if (!canRun || !effectiveModelId) return;

        setStatus('running');
        setState('draft');
        setError(null);

        try {
            // Persist current params into node data so the runner can read them.
            useGraphStore.getState().updateNodeData(id, {
                prompt,
                model_id: effectiveModelId,
                ratio,
                resolution,
                count,
            });

            const { results: runResults } = await runGraph({ mode: 'RUN_NODE', startNodeId: id });
            const nodeResult = runResults[id];

            if (!nodeResult?.success) {
                throw new Error(nodeResult?.error || 'Run failed');
            }

            setState('generated');
            setStatus('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('fail');
        }
    }, [id, canRun, effectiveModelId, prompt, ratio, resolution, count]);

    // Keep local results in sync with SnapshotStore history (Replace/Reset/Run).
    useEffect(() => {
        const nextResults: ImageResult[] = imageHistory.map((s, i) => ({
            id: s.snapshot_id,
            url: typeof s.payload === 'string' ? s.payload : String(s.payload),
            seed: (s.payload as { seed?: number } | undefined)?.seed,
        }));
        setResults(nextResults);
        setState(nextResults.length > 0 ? 'generated' : 'empty');
    }, [imageHistory]);

    // Keep local status in sync with graph node status (runner updates it).
    useEffect(() => {
        const nodeStatus = data.status;
        if (nodeStatus === 'running') setStatus('running');
        else if (nodeStatus === 'success') setStatus('success');
        else if (nodeStatus === 'fail') setStatus('fail');
        else setStatus('idle');
    }, [data.status]);

    useEffect(() => {
        setError((data.error as string | undefined) || null);
    }, [data.error]);

    // PRD v2.1: Action Bar handlers
    const { resetSnapshots, setActiveSnapshot } = useSnapshotStore();
    const { removeNode, setNodes, nodes, toggleNodeLock, updateNodeData } = useGraphStore();

    const cycleColor = useCallback(() => {
        const colors = [undefined, '#FEF3C7', '#DBEAFE', '#DCFCE7', '#FCE7F3', '#E0E7FF'] as const;
        const current = data.color as string | undefined;
        const currentIndex = Math.max(0, colors.findIndex(c => c === current));
        const next = colors[(currentIndex + 1) % colors.length];
        updateNodeData(id, { color: next });
    }, [id, data.color, updateNodeData]);

    const handleAction = useCallback((actionId: ActionId) => {
        switch (actionId) {
            case 'run':
                handleRun();
                break;
            case 'runFromHere':
                // PRD v2.1: Run from here (cascade downstream)
                (async () => {
                    setError(null);
                    try {
                        useGraphStore.getState().updateNodeData(id, {
                            prompt,
                            model_id: effectiveModelId,
                            ratio,
                            resolution,
                            count,
                        });
                        await runGraph({ mode: 'RUN_FROM_HERE', startNodeId: id });
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Unknown error');
                    }
                })();
                break;
            case 'replace':
                // Cycle through candidates by switching active snapshot (Replace creation)
                if (imageHistory.length > 1) {
                    const currentId = activeImageSnapshotId || imageHistory[0].snapshot_id;
                    const currentIndex = Math.max(0, imageHistory.findIndex(s => s.snapshot_id === currentId));
                    const nextIndex = (currentIndex + 1) % imageHistory.length;
                    setActiveSnapshot(id, 'imageOut' as PortKey, imageHistory[nextIndex].snapshot_id);
                }
                break;
            case 'reset':
                resetSnapshots(id, 'imageOut' as PortKey);
                setResults([]);
                setState('empty');
                setStatus('idle');
                break;
            case 'preview':
                if (results.length > 0) {
                    const activeId = activeImageSnapshotId || results[0]?.id;
                    const idx = Math.max(0, results.findIndex(r => r.id === activeId));
                    setLightboxIndex(idx);
                    setShowLightbox(true);
                }
                break;
            case 'duplicate':
                // Duplicate node by copying and offsetting
                const nodeToCopy = nodes.find(n => n.id === id);
                if (nodeToCopy) {
                    const newNode = {
                        ...JSON.parse(JSON.stringify(nodeToCopy)),
                        id: uuidv4(),
                        position: {
                            x: nodeToCopy.position.x + 50,
                            y: nodeToCopy.position.y + 50,
                        },
                        selected: false,
                    };
                    setNodes([...nodes, newNode]);
                }
                break;
            case 'delete':
                removeNode(id);
                break;
            case 'lock':
            case 'unlock':
                toggleNodeLock(id);
                break;
            case 'rename':
                {
                    const currentName = (data.skillName as string | undefined) || 'Image Generator';
                    const nextName = window.prompt('Rename node', currentName);
                    if (nextName && nextName.trim()) {
                        updateNodeData(id, { skillName: nextName.trim() });
                    }
                }
                break;
            case 'color':
                cycleColor();
                break;
            default:
                console.log('Action:', actionId);
        }
    }, [id, handleRun, imageHistory, activeImageSnapshotId, setActiveSnapshot, resetSnapshots, removeNode, nodes, setNodes, toggleNodeLock, data.skillName, updateNodeData, cycleColor, prompt, effectiveModelId, ratio, resolution, count, results]);

    const handleLightboxPrev = useCallback(() => {
        setLightboxIndex((i) => {
            if (results.length === 0) return 0;
            return (i - 1 + results.length) % results.length;
        });
    }, [results.length]);

    const handleLightboxNext = useCallback(() => {
        setLightboxIndex((i) => {
            if (results.length === 0) return 0;
            return (i + 1) % results.length;
        });
    }, [results.length]);

    return (
        <div className="group/card relative">
            {/* PRD v2.1: Action Bar - appears when selected */}
            <NodeToolbar isVisible={selected} position={Position.Top} offset={10}>
                <ActionBar
                    nodeId={id}
                    nodeType="imageStudio"
                    isLocked={data.locked ?? false}
                    isRunning={status === 'running'}
                    hasResults={results.length > 0}
                    canRun={canRun}
                    missingInputs={
                        !effectiveModelId
                            ? ['model']
                            : (!prompt.trim() && !hasBriefInput)
                                ? ['prompt/brief']
                                : []
                    }
                    onAction={handleAction}
                />
            </NodeToolbar>

            {/* Left Handle (Target) - Full height hit area, visual button centered */}
            <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    id="brief"
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-blue-400 group-hover/handle:shadow-lg group-hover/handle:bg-blue-50">
                    <Plus size={14} className="text-gray-500 group-hover/handle:text-blue-500" />
                </div>
            </div>

            {/* Right Handles (Source) - Dual outputs */}
            {/* Image Out - for image data (top position) */}
            <Handle
                type="source"
                position={Position.Right}
                id="imageOut"
                className="!w-6 !h-6 !bg-white !border !border-blue-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-blue-500 hover:!shadow-lg hover:!bg-blue-50"
                style={{ top: '40%', transform: 'translateY(-50%)' }}
            >
                <ImageIcon size={10} className="text-blue-500 pointer-events-none" />
            </Handle>
            {/* Context Out - for prompt/params (bottom position) */}
            <Handle
                type="source"
                position={Position.Right}
                id="contextOut"
                className="!w-6 !h-6 !bg-white !border !border-purple-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-purple-500 hover:!shadow-lg hover:!bg-purple-50"
                style={{ top: '60%', transform: 'translateY(-50%)' }}
            >
                <Sparkles size={10} className="text-purple-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    relative bg-white rounded-[32px] w-[480px]
                    flex flex-col
                    transition-all duration-500 ease-in-out
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                `}
                style={{
                    backgroundColor: (data.color as string | undefined) || undefined,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 z-20">
                    <div className="flex items-center gap-2 text-gray-800">
                        <ImageIcon size={18} className="text-gray-600" />
                        <span className="font-semibold text-sm">Image Generator</span>
                    </div>
                    {/* Model Badge */}
                    {currentModel && (
                        <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs min-w-0 max-w-[220px] ${isModelDisabled ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                }`}
                            title={currentModel.display_name}
                        >
                            {isModelDisabled && <AlertTriangle size={12} className="shrink-0" />}
                            <Cpu size={12} className="shrink-0" />
                            <span className="min-w-0 truncate">{currentModel.display_name}</span>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle size={14} />
                        {error}
                    </div>
                )}

                {/* Model Disabled Warning */}
                {isModelDisabled && (
                    <div className="mx-6 mb-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>Model is disabled.</span>
                        <a href="/settings" className="underline hover:no-underline">Enable in Settings</a>
                    </div>
                )}

                {/* Main Content Area - Adaptive Height */}
                <div
                    className="px-6 relative transition-all duration-500 ease-in-out"
                    style={{ height: contentHeight + contentReservedHeight }}
                >
                    <div className="absolute inset-x-6 top-0" style={{ height: contentHeight }}>
                        {results.length > 0 ? (
                            <div className={`grid gap-4 w-full h-full ${results.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {results.map((res) => (
                                    <div key={res.id} className="relative group rounded-xl overflow-hidden bg-gray-50 h-full w-full">
                                        <img src={res.url} alt="Generated" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Empty state - minimal visual footprint, but preserving aspect ratio space
                            <div className="w-full h-full" />
                        )}
                    </div>
                </div>

                {/* Bottom Controls Container */}
                <div
                    ref={controlsRef}
                    className="absolute bottom-4 left-4 right-4 bg-gray-50/80 backdrop-blur-md rounded-[24px] p-4 border border-gray-100/50 shadow-sm transition-all hover:shadow-md hover:bg-gray-50 z-30"
                >
                    {/* Prompt Input */}
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="描述你想要生成的图像......"
                        rows={1}
                        className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-gray-600 placeholder-gray-300 text-sm resize-none mb-4 py-0 pl-1"
                        style={{ minHeight: '24px', maxHeight: '120px' }}
                    />

                    {/* Control Row */}
                    <div className="flex items-center gap-1.5 relative z-20">
                        {/* Model Picker */}
                        <div className="relative min-w-0">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'model' ? null : 'model')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-w-0 ${isModelDisabled ? 'bg-yellow-100 text-yellow-700' :
                                    showDropdown === 'model' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'
                                    }`}
                                title={currentModel?.display_name || (effectiveModelId ? String(effectiveModelId) : undefined)}
                            >
                                <Cpu size={12} className="shrink-0" />
                                <span className="min-w-0 truncate">
                                    {currentModel?.display_name || 'Select model'}
                                </span>
                                <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${showDropdown === 'model' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'model' && (
                                <div className="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left max-h-64 overflow-y-auto">
                                    {enabledModels.length === 0 ? (
                                        <div className="px-3 py-4 text-xs text-gray-400 text-center">
                                            No models enabled.
                                            <a href="/settings" className="block text-blue-500 mt-1">Go to Settings</a>
                                        </div>
                                    ) : (
                                        enabledModels.map(m => (
                                            <button
                                                key={m.model_id}
                                                onClick={() => { setModelId(m.model_id); setShowDropdown(null); }}
                                                className={`px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${effectiveModelId === m.model_id ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'
                                                    }`}
                                            >
                                                <div className="font-medium">{m.display_name}</div>
                                                <div className="text-[10px] text-gray-400">{m.model_id}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Ratio Pill */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'ratio' ? null : 'ratio')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${showDropdown === 'ratio' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                <span className="opacity-50">☐</span> {ratio}
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showDropdown === 'ratio' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'ratio' && (
                                <div className="absolute bottom-full mb-2 left-0 w-24 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                                    {RATIOS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => { setRatio(r); setShowDropdown(null); }}
                                            className={`px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${ratio === r ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Resolution Pill */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'resolution' ? null : 'resolution')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${showDropdown === 'resolution' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {resolution}
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showDropdown === 'resolution' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'resolution' && (
                                <div className="absolute bottom-full mb-2 left-0 w-24 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                                    {RESOLUTIONS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => { setResolution(r); setShowDropdown(null); }}
                                            className={`px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${resolution === r ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Count Stepper Pill */}
                        <div className="flex items-center bg-gray-200/50 rounded-full px-1 py-0.5 shrink-0">
                            <button
                                onClick={() => setCount(Math.max(1, count - 1))}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full active:bg-gray-300/50 transition-colors"
                            >
                                <Minus size={10} />
                            </button>
                            <span className="text-xs font-medium text-gray-700 w-4 text-center select-none">{count}</span>
                            <button
                                onClick={() => setCount(Math.min(4, count + 1))}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full active:bg-gray-300/50 transition-colors"
                            >
                                <Plus size={10} />
                            </button>
                        </div>

                        <div className="flex-1 min-w-0" />

                        {/* Settings Button */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-full transition-colors shrink-0 ${showSettings ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
                        >
                            <Settings size={16} />
                        </button>

                        {/* Run Button */}
                        <button
                            onClick={handleRun}
                            disabled={!canRun || status === 'running'}
                            className={`
                                group w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                transition-colors
                                ${!canRun ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-black active:bg-gray-900 shadow-md'}
                            `}
                            title={!effectiveModelId ? 'No model selected' : isModelDisabled ? 'Model is disabled' : ''}
                        >
                            {status === 'running' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Play
                                    size={14}
                                    fill="currentColor"
                                    className="ml-0.5 transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
                                />
                            )}
                        </button>
                    </div>
                </div>

                {/* Click Outside Handler (Backdrop) */}
                {(showDropdown || showSettings) && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => { setShowDropdown(null); setShowSettings(false); }}
                    />
                )}
            </div>

            {/* Lightbox Preview */}
            {showLightbox && results[lightboxIndex] && (
                <div
                    className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center"
                    onClick={() => setShowLightbox(false)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    >
                        <X size={20} />
                    </button>

                    {/* Navigation - Previous */}
                    {results.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}
                            className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Image */}
                    <img
                        src={results[lightboxIndex].url}
                        alt={`Preview ${lightboxIndex + 1}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation - Next */}
                    {results.length > 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}
                            className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    {/* Counter */}
                    {results.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
                            {lightboxIndex + 1} / {results.length}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default memo(ImageStudioComponent);
