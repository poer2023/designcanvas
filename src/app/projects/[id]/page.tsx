'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Save, Play, Square, FileJson, ZoomIn, ZoomOut,
    Maximize2, Grid, Settings, ChevronDown, Share2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Project } from '@/types';
import { useGraphStore } from '@/store/graphStore';
import { executeGraph, ExecutionLog } from '@/lib/engine/executor';

const SkillGraphCanvas = dynamic(() => import('@/components/graph/SkillGraphCanvas'), { ssr: false });

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const stopExecutionRef = useRef(false);
    const { nodes, edges, isRunning, setIsRunning, updateNodeStatus } = useGraphStore();

    useEffect(() => {
        if (params.id) fetchProject(params.id as string);
    }, [params.id]);

    async function fetchProject(id: string) {
        try {
            const response = await fetch(`/api/projects/${id}`);
            const data = await response.json();
            if (data.success) {
                setProject(data.data);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleRunGraph = useCallback(async () => {
        if (nodes.length === 0) return;
        stopExecutionRef.current = false;
        setIsRunning(true);
        setLogs([]);
        setShowLogs(true);

        const onLog = (log: ExecutionLog) => setLogs(prev => [...prev, log]);
        await executeGraph(nodes, edges, updateNodeStatus, onLog, () => stopExecutionRef.current);
        setIsRunning(false);
    }, [nodes, edges, setIsRunning, updateNodeStatus]);

    const handleStop = useCallback(() => {
        stopExecutionRef.current = true;
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
                <div className="w-8 h-8 border-2 border-[#333] border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-hidden">
            {/* Minimal Top Toolbar */}
            <header className="h-12 bg-[#141414] border-b border-[#252525] flex items-center justify-between px-3 shrink-0 z-50">
                {/* Left Section */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#252525] transition-colors"
                        title="Back to Projects"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="w-px h-6 bg-[#252525]" />

                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-[10px]">
                            {project.name.substring(0, 2).toUpperCase()}
                        </div>
                        <button className="flex items-center gap-1.5 text-sm text-white hover:bg-[#252525] px-2 py-1 rounded transition-colors">
                            <span className="font-medium">{project.name}</span>
                            <ChevronDown size={14} className="text-[#666]" />
                        </button>
                    </div>
                </div>

                {/* Center Section - Zoom & View Controls */}
                <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
                    <button
                        onClick={() => setZoom(Math.max(25, zoom - 25))}
                        className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#252525] transition-colors"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <span className="text-xs text-[#888] w-12 text-center font-mono">{zoom}%</span>
                    <button
                        onClick={() => setZoom(Math.min(200, zoom + 25))}
                        className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#252525] transition-colors"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <div className="w-px h-4 bg-[#333] mx-1" />
                    <button
                        onClick={() => setZoom(100)}
                        className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#252525] transition-colors"
                        title="Fit to screen"
                    >
                        <Maximize2 size={14} />
                    </button>
                    <button
                        className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#252525] transition-colors"
                        title="Toggle grid"
                    >
                        <Grid size={14} />
                    </button>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`p-2 rounded-lg transition-colors ${showLogs ? 'bg-blue-500/20 text-blue-400' : 'text-[#888] hover:text-white hover:bg-[#252525]'}`}
                        title="Logs"
                    >
                        <FileJson size={16} />
                    </button>

                    {isRunning ? (
                        <button
                            onClick={handleStop}
                            className="h-8 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Square size={12} fill="currentColor" />
                            <span>Stop</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleRunGraph}
                            disabled={nodes.length === 0}
                            className="h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Play size={12} fill="currentColor" />
                            <span>Run</span>
                        </button>
                    )}

                    <div className="w-px h-6 bg-[#252525]" />

                    <button className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#252525] transition-colors">
                        <Save size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#252525] transition-colors">
                        <Share2 size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#252525] transition-colors">
                        <Settings size={16} />
                    </button>
                </div>
            </header>

            {/* Full-screen Canvas */}
            <main className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0">
                    <SkillGraphCanvas />
                </div>

                {/* Floating Logs Panel */}
                {showLogs && (
                    <div className="absolute right-4 top-4 bottom-4 w-80 bg-[#141414]/95 backdrop-blur-xl border border-[#252525] rounded-xl shadow-2xl flex flex-col overflow-hidden z-40">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525]">
                            <h3 className="text-sm font-medium text-white">Execution Logs</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLogs([])}
                                    className="text-xs text-[#666] hover:text-white transition-colors"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => setShowLogs(false)}
                                    className="text-[#666] hover:text-white transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {logs.length === 0 ? (
                                <div className="text-center text-[#555] text-xs py-8">
                                    No logs yet. Run the graph to see execution logs.
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#252525]">
                                        <div className="flex justify-between text-[10px] text-[#666] mb-1.5">
                                            <span className="text-blue-400 font-medium">{log.nodeId}</span>
                                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text-xs text-[#aaa] font-mono">{log.message}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
