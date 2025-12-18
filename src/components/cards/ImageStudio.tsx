'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Sparkles,
    Play,
    Settings,
    Image as ImageIcon,
    Loader2,
    ChevronDown,
    Plus,
    Minus,
    GalleryHorizontalEnd
} from 'lucide-react';

// State machine states
type StudioState = 'empty' | 'draft' | 'generated' | 'pinned';
type RunStatus = 'idle' | 'running' | 'done' | 'error';

interface ImageResult {
    id: string;
    url: string;
    seed?: number;
}

interface ImageStudioData {
    state: StudioState;
    status: RunStatus;
    prompt: string;
    negative?: string;
    compiledBrief?: string;
    model: string;
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

const MODELS = ['Seedream 4.5', 'SDXL', 'Flux', 'Midjourney'];
const RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16'];
const RESOLUTIONS = ['1K', '2K', '4K'];

function ImageStudioComponent({ id, data, selected }: ImageStudioProps) {
    // State
    const [state, setState] = useState<StudioState>(data.state || 'empty');
    const [status, setStatus] = useState<RunStatus>(data.status || 'idle');
    const [prompt, setPrompt] = useState(data.prompt || '');

    // Controls
    const [model, setModel] = useState(data.model || 'Seedream 4.5');
    const [ratio, setRatio] = useState(data.ratio || '3:2');
    const [resolution, setResolution] = useState(data.resolution || '2K');
    const [count, setCount] = useState(data.count || 1);

    // Advanced settings visibility
    const [showSettings, setShowSettings] = useState(false);
    const [showDropdown, setShowDropdown] = useState<'model' | 'ratio' | 'resolution' | null>(null);

    // Results
    const [results, setResults] = useState<ImageResult[]>(data.results || []);

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [prompt]);

    // Calculate content height based on ratio with fixed width (480px - 48px padding = 432px)
    const getContentDimensions = () => {
        const [w, h] = ratio.split(':').map(Number);
        const contentWidth = 432;
        const aspectRatio = w / h;
        const height = contentWidth / aspectRatio;
        return { width: contentWidth, height };
    };

    const { height: contentHeight } = getContentDimensions();

    const handleRun = useCallback(async () => {
        if (!prompt.trim()) return;
        setStatus('running');
        setState('draft');

        // Mock generation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockResults: ImageResult[] = Array.from({ length: count }, (_, i) => ({
            id: `result-${Date.now()}-${i}`,
            url: `https://picsum.photos/seed/${Date.now() + i}/400/600`, // In real app, this would match ratio
            seed: Math.floor(Math.random() * 1000000),
        }));

        setResults(mockResults);
        setState('generated');
        setStatus('done');
    }, [prompt, count]);

    return (
        <div className="group/card relative">
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
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 z-20">
                    <div className="flex items-center gap-2 text-gray-800">
                        <ImageIcon size={18} className="text-gray-600" />
                        <span className="font-semibold text-sm">Image Generator #1</span>
                    </div>
                </div>

                {/* Main Content Area - Adaptive Height */}
                <div
                    className="px-6 pb-24 relative transition-all duration-500 ease-in-out"
                    style={{ height: contentHeight + 96 }} // Add padding-bottom space (24px * 4 = 96px) roughly or just let it expand? 
                // Actually user said "content bearing area" adapts.
                // If we set explicit height here, flex-col parent will respect it.
                >
                    <div className="absolute inset-x-6 inset-y-0" style={{ height: contentHeight }}>
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
                <div className="absolute bottom-4 left-4 right-4 bg-gray-50/80 backdrop-blur-md rounded-[24px] p-4 border border-gray-100/50 shadow-sm transition-all hover:shadow-md hover:bg-gray-50 z-30">
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
                    <div className="flex items-center gap-1.5 relative z-20 overflow-x-auto no-scrollbar mask-gradient-r">
                        {/* Model Pill */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowDropdown(showDropdown === 'model' ? null : 'model')}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${showDropdown === 'model' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200/50 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {model}
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showDropdown === 'model' ? 'rotate-180' : ''}`} />
                            </button>
                            {showDropdown === 'model' && (
                                <div className="absolute bottom-full mb-2 left-0 w-32 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                                    {MODELS.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setModel(m); setShowDropdown(null); }}
                                            className={`px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${model === m ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
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
                            disabled={!prompt || status === 'running'}
                            className={`
                                w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0
                                ${!prompt ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-black hover:scale-105 shadow-md active:scale-95'}
                            `}
                        >
                            {status === 'running' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Play size={14} fill="currentColor" className="ml-0.5" />
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
        </div>
    );
}

export default memo(ImageStudioComponent);
