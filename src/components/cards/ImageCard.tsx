'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Image as ImageIcon,
    Star,
    Lock,
    Unlock,
    Copy,
    FolderPlus,
    Plus,
    Play,
    Settings,
    Loader2,
    ChevronDown,
    Minus,
    GalleryHorizontalEnd,
    AlertCircle,
} from 'lucide-react';
import { useSnapshotStore, type StaleState, type PortKey } from '@/store/snapshotStore';

/**
 * PRD v1.8: Unified Image Card
 * 
 * mode = 'raw' | 'studio'
 * - raw:承载图片（来自粘贴/拖拽），默认作为输入引用
 * - studio: 生成端（空卡可文生图，生成后可继续 img2img / variations）
 */

export type ImageCardMode = 'raw' | 'studio';
type StudioState = 'empty' | 'draft' | 'generated' | 'pinned';
type RunStatus = 'idle' | 'running' | 'done' | 'error';

export interface ImageResult {
    id: string;
    url: string;
    seed?: number;
}

export interface ImageCardData {
    mode: ImageCardMode;
    // Raw mode
    imageUrl?: string;
    caption?: string;
    source?: 'paste' | 'dragdrop' | 'picker';
    filename?: string;
    // Studio mode
    state?: StudioState;
    status?: RunStatus;
    prompt?: string;
    negative?: string;
    compiledBrief?: string;
    model?: string;
    ratio?: string;
    resolution?: string;
    count?: number;
    seed?: number;
    cfg?: number;
    steps?: number;
    styleStrength?: number;
    img2imgStrength?: number;
    useCurrentAsInput?: boolean;
    results?: ImageResult[];
    pinnedId?: string;
    // Common
    favorite?: boolean;
    locked?: boolean;
    staleState?: StaleState;
}

export interface ImageCardProps {
    id: string;
    data: Partial<ImageCardData>;
    selected?: boolean;
}

const MODELS = ['Seedream 4.5', 'SDXL', 'Flux', 'Midjourney'];
const RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'];
const RESOLUTIONS = ['1K', '2K', '4K'];

function ImageCardComponent({ id, data, selected }: ImageCardProps) {
    const mode = data.mode || 'raw';

    // Common state
    const [favorite, setFavorite] = useState(data.favorite || false);
    const [locked, setLocked] = useState(data.locked || false);

    // Raw mode state
    const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
    const [caption, setCaption] = useState(data.caption || '');
    const [isDragging, setIsDragging] = useState(false);

    // Studio mode state
    const [studioState, setStudioState] = useState<StudioState>(data.state || 'empty');
    const [runStatus, setRunStatus] = useState<RunStatus>(data.status || 'idle');
    const [prompt, setPrompt] = useState(data.prompt || '');
    const [model, setModel] = useState(data.model || 'Seedream 4.5');
    const [ratio, setRatio] = useState(data.ratio || '3:2');
    const [resolution, setResolution] = useState(data.resolution || '2K');
    const [count, setCount] = useState(data.count || 1);
    const [results, setResults] = useState<ImageResult[]>(data.results || []);
    const [showSettings, setShowSettings] = useState(false);
    const [showDropdown, setShowDropdown] = useState<'model' | 'ratio' | 'resolution' | null>(null);

    // Stale state from snapshot store
    const staleState = useSnapshotStore(state => state.getStaleState(id));
    const createSnapshot = useSnapshotStore(state => state.createSnapshot);

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    // Raw mode handlers
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                setImageUrl(url);
                // Create output snapshot
                createSnapshot(id, 'imageOut', { imageUrl: url, source: 'dragdrop' });
            };
            reader.readAsDataURL(files[0]);
        }
    }, [id, createSnapshot]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const url = event.target?.result as string;
                        setImageUrl(url);
                        // Create output snapshot
                        createSnapshot(id, 'imageOut', { imageUrl: url, source: 'paste' });
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    }, [id, createSnapshot]);

    // Studio mode handlers
    const handleRun = useCallback(async () => {
        if (!prompt.trim()) return;
        setRunStatus('running');
        setStudioState('draft');

        // Mock generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockResults: ImageResult[] = Array.from({ length: count }, (_, i) => ({
            id: `result-${Date.now()}-${i}`,
            url: `https://picsum.photos/seed/${Date.now() + i}/400/600`,
            seed: Math.floor(Math.random() * 1000000),
        }));

        setResults(mockResults);
        setStudioState('generated');
        setRunStatus('done');

        // Create output snapshots
        createSnapshot(id, 'imageOut', {
            images: mockResults.map(r => r.url),
            pinnedId: mockResults[0]?.id
        });
        createSnapshot(id, 'contextOut', {
            images: mockResults.map(r => r.url),
            prompt,
            params: { model, ratio, resolution, count },
            source: 'studio'
        });
    }, [prompt, count, model, ratio, resolution, id, createSnapshot]);

    const isFinal = favorite || locked;

    // Stale indicator
    const staleIndicator = staleState !== 'fresh' && (
        <div className={`absolute top-0 right-0 m-2 z-20 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${staleState === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
            <AlertCircle size={12} />
            {staleState === 'blocked' ? 'Blocked' : 'Stale'}
        </div>
    );

    // === RAW MODE ===
    if (mode === 'raw') {
        return (
            <div className="group/card relative">
                {/* Left Handle (Target) - Full height hit area */}
                <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                    />
                    <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-gray-400 group-hover/handle:shadow-lg group-hover/handle:scale-110">
                        <Plus size={14} className="text-gray-500" />
                    </div>
                </div>

                {/* Right Handle (Source) - imageOut */}
                <Handle
                    type="source"
                    position={Position.Right}
                    id="imageOut"
                    className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                    <Plus size={14} className="text-gray-500 pointer-events-none" />
                </Handle>

                <div
                    className={`
                        bg-white rounded-[32px] overflow-hidden min-w-[280px] max-w-[360px]
                        flex flex-col relative
                        transition-all duration-200
                        ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                        ${isFinal ? 'ring-2 ring-amber-400' : ''}
                    `}
                    onPaste={handlePaste}
                >
                    {staleIndicator}

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-2 text-gray-800">
                            <ImageIcon size={16} className="text-gray-500" />
                            <span className="font-medium text-sm">Image</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setFavorite(!favorite)}
                                className={`p-1.5 rounded-full transition-colors ${favorite
                                    ? 'text-amber-500 bg-amber-50'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onClick={() => setLocked(!locked)}
                                className={`p-1.5 rounded-full transition-colors ${locked
                                    ? 'text-blue-500 bg-blue-50'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {locked ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Image Area */}
                    <div
                        className={`
                            relative w-full aspect-[4/3] group
                            ${isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-gray-50'}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="Raw image"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <ImageIcon size={28} className="text-gray-300 mb-2" />
                                <p className="text-xs text-gray-400">
                                    Drop or paste image
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Caption */}
                    <div className="px-4 py-3">
                        <input
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Add caption..."
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    {/* Actions */}
                    {imageUrl && (
                        <div className="px-4 pb-3 flex gap-2">
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                                <Copy size={12} />
                                Copy
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                                <FolderPlus size={12} />
                                Add to Group
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // === STUDIO MODE ===
    return (
        <div className="group/card relative">
            {/* Left Handle (Target) - Full height hit area, visual button centered */}
            <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    id="briefIn"
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-gray-400 group-hover/handle:shadow-lg group-hover/handle:scale-110">
                    <Plus size={14} className="text-gray-500" />
                </div>
            </div>

            {/* Right Handle (Source) - imageOut */}
            <Handle
                type="source"
                position={Position.Right}
                id="imageOut"
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
                style={{ top: '40%', transform: 'translateY(-50%)' }}
            >
                <Plus size={14} className="text-gray-500 pointer-events-none" />
            </Handle>

            {/* Right Handle 2 (Source) - contextOut */}
            <Handle
                type="source"
                position={Position.Right}
                id="contextOut"
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
                style={{ top: '60%', transform: 'translateY(-50%)' }}
            >
                <Plus size={14} className="text-gray-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    relative bg-white rounded-[32px] w-[560px] min-h-[380px]
                    flex flex-col
                    transition-all duration-200
                    ${selected ? 'ring-2 ring-gray-400 shadow-2xl' : 'shadow-lg border border-gray-200'}
                    ${isFinal ? 'ring-2 ring-amber-400' : ''}
                `}
            >
                {staleIndicator}

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <ImageIcon size={18} className="text-gray-600" />
                        <span className="font-semibold text-sm">Image Studio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFavorite(!favorite)}
                            className={`p-2 rounded-full transition-colors ${favorite
                                ? 'text-amber-500 bg-amber-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={() => setLocked(!locked)}
                            className={`p-2 rounded-full transition-colors ${locked
                                ? 'text-blue-500 bg-blue-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <GalleryHorizontalEnd size={18} />
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 px-6 pb-24 relative min-h-[180px]">
                    {results.length > 0 ? (
                        <div className={`grid gap-3 ${results.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {results.map((res) => (
                                <div key={res.id} className="relative group rounded-xl overflow-hidden aspect-[3/2] bg-gray-50">
                                    <img src={res.url} alt="Generated" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-300">
                            <ImageIcon size={48} />
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-4 left-4 right-4 bg-gray-50/80 backdrop-blur-md rounded-[24px] p-4 border border-gray-100/50 shadow-sm transition-all hover:shadow-md hover:bg-gray-50 z-30">
                    {/* Prompt Input */}
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="描述你想要生成的图像..."
                        rows={1}
                        className="w-full bg-transparent border-none focus:ring-0 text-gray-600 placeholder-gray-300 text-sm resize-none mb-3 py-0 pl-1"
                        style={{ minHeight: '24px', maxHeight: '96px' }}
                    />

                    {/* Control Row */}
                    <div className="flex items-center gap-2 relative z-20">
                        {/* Model Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'model' ? null : 'model')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showDropdown === 'model' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'}`}
                            >
                                {model}
                                <ChevronDown size={12} className={`transition-transform ${showDropdown === 'model' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'model' && (
                                <div className="absolute bottom-full mb-2 left-0 w-32 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1">
                                    {MODELS.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setModel(m); setShowDropdown(null); }}
                                            className={`px-3 py-2 text-xs text-left hover:bg-gray-50 ${model === m ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ratio Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'ratio' ? null : 'ratio')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showDropdown === 'ratio' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'}`}
                            >
                                ☐ {ratio}
                                <ChevronDown size={12} className={`transition-transform ${showDropdown === 'ratio' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'ratio' && (
                                <div className="absolute bottom-full mb-2 left-0 w-24 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1">
                                    {RATIOS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => { setRatio(r); setShowDropdown(null); }}
                                            className={`px-3 py-2 text-xs text-left hover:bg-gray-50 ${ratio === r ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Resolution Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'resolution' ? null : 'resolution')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showDropdown === 'resolution' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'}`}
                            >
                                {resolution}
                                <ChevronDown size={12} className={`transition-transform ${showDropdown === 'resolution' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'resolution' && (
                                <div className="absolute bottom-full mb-2 left-0 w-24 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1">
                                    {RESOLUTIONS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => { setResolution(r); setShowDropdown(null); }}
                                            className={`px-3 py-2 text-xs text-left hover:bg-gray-50 ${resolution === r ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Count Stepper */}
                        <div className="flex items-center bg-gray-200/50 rounded-full px-1 py-0.5">
                            <button
                                onClick={() => setCount(Math.max(1, count - 1))}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full"
                            >
                                <Minus size={10} />
                            </button>
                            <span className="text-xs font-medium text-gray-700 w-4 text-center">{count}</span>
                            <button
                                onClick={() => setCount(Math.min(4, count + 1))}
                                className="p-1 text-gray-500 hover:text-gray-700 rounded-full"
                            >
                                <Plus size={10} />
                            </button>
                        </div>

                        {/* Settings */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-full transition-colors ml-auto ${showSettings ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
                        >
                            <Settings size={16} />
                        </button>

                        {/* Run Button */}
                        <button
                            onClick={handleRun}
                            disabled={!prompt || runStatus === 'running'}
                            className={`
                                w-8 h-8 rounded-full flex items-center justify-center transition-all
                                ${!prompt ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-black hover:scale-105 shadow-md active:scale-95'}
                            `}
                        >
                            {runStatus === 'running' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Play size={14} fill="currentColor" className="ml-0.5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Click Outside Handler */}
                {(showDropdown || showSettings) && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => { setShowDropdown(null); setShowSettings(false); }}
                    />
                )}
            </div>
        </div>
    );
}

export default memo(ImageCardComponent);
export { ImageCardComponent as ImageCard };
