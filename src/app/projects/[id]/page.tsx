'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Save, Settings, FileJson,
    Workflow, Image as ImageIcon, Sparkles, PenTool, LayoutGrid
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Project } from '@/types';
import { useGraphStore } from '@/store/graphStore';
import { executeGraph, ExecutionLog } from '@/lib/engine/executor';

// Lazy load heavy components
const SkillGraphCanvas = dynamic(() => import('@/components/graph/SkillGraphCanvas'), { ssr: false });
const GalleryPage = dynamic(() => import('@/app/gallery/page'), { ssr: false });
const ComposeCanvas = dynamic(() => import('@/components/compose/ComposeCanvas'), { ssr: false });
const InspirationPage = dynamic(() => import('@/app/inspiration/page'), { ssr: false });

type EditorMode = 'graph' | 'inspiration' | 'gallery' | 'canvas';

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<EditorMode>('graph');

    // Graph State
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);
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

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
        </div>
    );

    if (!project) return null;

    return (
        <div className="h-screen flex flex-col bg-app overflow-hidden">
            {/* Unified Toolbar */}
            <div className="h-14 border-b border-subtle bg-panel flex items-center justify-between px-4 shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 rounded-lg hover:bg-bg-hover text-secondary hover:text-primary transition-colors"
                        title="Back to Projects"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
                            {project.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold leading-none mb-1">{project.name}</h1>
                            <div className="flex items-center gap-1.5 text-[11px] text-tertiary">
                                <span className="bg-bg-hover px-1.5 rounded">v1.0.0</span>
                                <span>Edited just now</span>
                            </div>
                        </div>
                    </div>

                    {/* Mode Switcher (Replica of Figma's top center toggle) */}
                    <div className="bg-bg-hover p-1 rounded-lg flex items-center gap-1 ml-8">
                        <ModeTab
                            active={mode === 'graph'}
                            onClick={() => setMode('graph')}
                            icon={Workflow}
                            label="Logic"
                        />
                        <ModeTab
                            active={mode === 'inspiration'}
                            onClick={() => setMode('inspiration')}
                            icon={Sparkles}
                            label="Inspire"
                        />
                        <ModeTab
                            active={mode === 'gallery'}
                            onClick={() => setMode('gallery')}
                            icon={ImageIcon}
                            label="Gallery"
                        />
                        <ModeTab
                            active={mode === 'canvas'}
                            onClick={() => setMode('canvas')}
                            icon={PenTool}
                            label="Canvas"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {mode === 'graph' && (
                        <>
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                className={`btn btn-ghost h-8 px-2 ${showLogs ? 'bg-accent-subtle text-accent-primary' : ''}`}
                                title="Execution Logs"
                            >
                                <FileJson size={16} />
                            </button>
                            <button
                                onClick={isRunning ? () => stopExecutionRef.current = true : handleRunGraph}
                                className={`btn h-8 px-4 ${isRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'}`}
                            >
                                {isRunning ? (
                                    <>
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        <span>Running...</span>
                                    </>
                                ) : (
                                    <>
                                        <Workflow size={14} />
                                        <span>Run Graph</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                    <button className="btn btn-secondary h-8 px-3">
                        <Save size={14} />
                    </button>
                    <button className="btn btn-primary h-8 px-4">
                        Share
                    </button>
                </div>
            </div>

            {/* Main Workspace Area */}
            <div className="flex-1 overflow-hidden relative">
                {mode === 'graph' && (
                    <div className="absolute inset-0 flex">
                        <div className="flex-1 relative">
                            <SkillGraphCanvas />
                        </div>
                        {showLogs && (
                            <div className="w-[320px] bg-panel border-l border-subtle flex flex-col z-20 shadow-xl">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
                                    <h3 className="heading-sm">Logs</h3>
                                    <button onClick={() => setLogs([])} className="text-xs text-tertiary hover:text-secondary">Clear</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {logs.map((log, i) => (
                                        <div key={i} className="p-2 rounded bg-bg-hover text-xs font-mono">
                                            <div className="flex justify-between text-tertiary mb-1">
                                                <span>{log.nodeId}</span>
                                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="text-secondary">{log.message}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Other modes rendered inside scrollable container */}
                {mode !== 'graph' && (
                    <div className="absolute inset-0 overflow-y-auto bg-app">
                        <div className="min-h-full">
                            {mode === 'inspiration' && <div className="p-6"><InspirationPage /></div>}
                            {mode === 'gallery' && <div className="p-6"><GalleryPage /></div>}
                            {mode === 'canvas' && <div className="h-full"><ComposeCanvas availableElements={[]} /></div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ModeTab({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${active
                    ? 'bg-white dark:bg-[#333] text-primary shadow-sm'
                    : 'text-tertiary hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'}
            `}
        >
            <Icon size={14} />
            <span>{label}</span>
        </button>
    );
}
