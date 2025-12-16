'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Settings, FileJson } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Project } from '@/types';
import { useGraphStore } from '@/store/graphStore';
import { executeGraph, ExecutionLog } from '@/lib/engine/executor';

// Dynamic import to avoid SSR issues with React Flow
const SkillGraphCanvas = dynamic(
    () => import('@/components/graph/SkillGraphCanvas'),
    { ssr: false, loading: () => <GraphLoading /> }
);

function GraphLoading() {
    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-black/20">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-secondary">Loading Graph Editor...</p>
            </div>
        </div>
    );
}

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    const stopExecutionRef = useRef(false);
    const { nodes, edges, isRunning, setIsRunning, updateNodeStatus, loadGraph } = useGraphStore();

    useEffect(() => {
        if (params.id) {
            fetchProject(params.id as string);
        }
    }, [params.id]);

    async function fetchProject(id: string) {
        try {
            const response = await fetch(`/api/projects/${id}`);
            const data = await response.json();
            if (data.success) {
                setProject(data.data);
                // TODO: Load saved graph from project
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    }

    const handleSaveGraph = useCallback(async () => {
        if (!project) return;
        setSaving(true);

        // TODO: Save graph to database
        const graphData = { nodes, edges };
        console.log('Saving graph:', graphData);

        await new Promise(resolve => setTimeout(resolve, 500));
        setSaving(false);
    }, [project, nodes, edges]);

    const handleRunGraph = useCallback(async () => {
        if (nodes.length === 0) return;

        stopExecutionRef.current = false;
        setIsRunning(true);
        setLogs([]);
        setShowLogs(true);

        const onLog = (log: ExecutionLog) => {
            setLogs(prev => [...prev, log]);
        };

        await executeGraph(
            nodes,
            edges,
            updateNodeStatus,
            onLog,
            () => stopExecutionRef.current
        );

        setIsRunning(false);
    }, [nodes, edges, setIsRunning, updateNodeStatus]);

    const handleStopGraph = useCallback(() => {
        stopExecutionRef.current = true;
        setIsRunning(false);
    }, [setIsRunning]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="h-[calc(100vh-48px)] flex flex-col -m-6 -mt-6">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-subtle bg-panel shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 rounded-lg hover:bg-bg-hover text-secondary hover:text-primary transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-sm font-semibold">{project.name}</h1>
                        {project.description && (
                            <p className="text-xs text-tertiary truncate max-w-[200px]">{project.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className={`btn btn-ghost h-8 px-2 ${showLogs ? 'bg-accent-subtle text-accent-primary' : ''}`}
                        title="Execution Logs"
                    >
                        <FileJson size={16} />
                    </button>
                    <button
                        onClick={handleSaveGraph}
                        disabled={saving}
                        className="btn btn-secondary h-8 px-3"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-border-default border-t-primary rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        <span>Save</span>
                    </button>
                    <button className="btn btn-ghost h-8 px-2" title="Settings">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1">
                    <SkillGraphCanvas />
                </div>

                {/* Execution Logs Panel */}
                {showLogs && (
                    <div className="w-[320px] bg-panel border-l border-subtle flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
                            <h3 className="heading-sm">Execution Logs</h3>
                            <button
                                onClick={() => setLogs([])}
                                className="text-xs text-tertiary hover:text-secondary"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {logs.length === 0 ? (
                                <div className="text-center py-8 text-tertiary text-sm">
                                    No logs yet. Run the graph to see execution logs.
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div
                                        key={i}
                                        className={`p-2 rounded-lg text-xs ${log.action === 'error'
                                                ? 'bg-red-500/10 text-red-400'
                                                : log.action === 'complete'
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-bg-hover text-secondary'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-medium">{log.message}</span>
                                            <span className="text-[10px] text-tertiary shrink-0">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
