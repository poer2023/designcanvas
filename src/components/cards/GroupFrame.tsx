'use client';

import { useState, memo, useCallback } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { useGraphStore } from '@/store/graphStore';
import {
    Folder,
    Image as ImageIcon,
    Sparkles,
    Scissors,
    Square,
    Play,
    Settings,
    Loader2,
    Trash2,
    Magnet,
    Plus,
} from 'lucide-react';

export type GroupType = 'style' | 'refset' | 'candidates' | 'elements' | 'blank';

interface GroupFrameData {
    groupType: GroupType;
    label?: string;
    autoRun?: boolean;
    groupPrompt?: string;
    magnetic?: boolean;
}

interface GroupFrameProps {
    id: string;
    data: Partial<GroupFrameData>;
    selected?: boolean;
}

const GROUP_CONFIG: Record<GroupType, {
    icon: typeof Folder;
    label: string;
    color: string;
    outputLabel: string;
}> = {
    style: {
        icon: Sparkles,
        label: 'Style Extract',
        color: '#8B5CF6',
        outputLabel: 'Style',
    },
    refset: {
        icon: ImageIcon,
        label: 'RefSet',
        color: '#10B981',
        outputLabel: 'Ref',
    },
    candidates: {
        icon: Sparkles,
        label: 'Candidates',
        color: '#EF4444',
        outputLabel: 'Candidates',
    },
    elements: {
        icon: Scissors,
        label: 'Elements',
        color: '#EC4899',
        outputLabel: 'Elements',
    },
    blank: {
        icon: Square,
        label: 'Group',
        color: '#94A3B8',
        outputLabel: '',
    },
};

function GroupFrameComponent({ id, data, selected }: GroupFrameProps) {
    const { removeNode } = useGraphStore();
    const [groupType] = useState<GroupType>(data.groupType || 'blank');
    const [autoRun, setAutoRun] = useState(data.autoRun || false);
    const [magnetic, setMagnetic] = useState(data.magnetic ?? true);
    const [isRunning, setIsRunning] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const config = GROUP_CONFIG[groupType];
    const Icon = config.icon;

    const handleRun = useCallback(async () => {
        setIsRunning(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsRunning(false);
    }, []);

    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selection
        if (confirm('Delete group?')) {
            removeNode(id);
        }
    }, [id, removeNode]);

    return (
        <div className="group/card relative w-full h-full">
            {/* Resizer */}
            <NodeResizer
                minWidth={200}
                minHeight={150}
                isVisible={selected}
                lineClassName="!border-blue-400"
                handleClassName="!w-2 !h-2 !bg-blue-500 !border-0"
            />

            {/* Left Handle (Target) - Full height hit area, visual button centered */}
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

            {/* Right Handle (Source) - Small button only (only for non-blank groups) */}
            {groupType !== 'blank' && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                    <Plus size={14} className="text-gray-500 pointer-events-none" />
                </Handle>
            )}

            <div
                className={`
                    w-full h-full min-w-[200px] min-h-[150px]
                    rounded-[32px] overflow-visible
                    border-2 transition-all duration-200
                    ${selected ? 'ring-2 ring-blue-400/30' : ''}
                `}
                style={{
                    borderColor: `${config.color}40`,
                    backgroundColor: `${config.color}05`,
                    borderStyle: groupType === 'blank' ? 'dashed' : 'solid',
                }}
            >
                {/* Header Pill - Floating Top Left */}
                <div
                    className="absolute -top-4 left-6 flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-full shadow-sm border border-white/50 backdrop-blur-md group"
                    style={{ backgroundColor: `${config.color}15` }}
                >
                    <div className="p-1 rounded-full" style={{ backgroundColor: config.color }}>
                        <Icon size={10} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold pr-1" style={{ color: config.color }}>
                        {data.label || config.label}
                    </span>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 pl-2 border-l border-gray-200/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        {groupType !== 'blank' && (
                            <button
                                onClick={handleRun}
                                disabled={isRunning}
                                className="p-1 hover:bg-white/50 rounded-full transition-colors"
                                style={{ color: config.color }}
                            >
                                {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                            </button>
                        )}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-1 hover:bg-white/50 rounded-full transition-colors ${showSettings ? 'text-gray-800' : 'text-gray-400'}`}
                        >
                            <Settings size={10} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-1 hover:bg-red-100/50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                </div>

                {/* Settings Popup */}
                {showSettings && (
                    <div className="absolute top-8 left-6 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-[9999] animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Config</span>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                                <div className={`p-1 rounded-md ${magnetic ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Magnet size={12} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-medium text-gray-700">Magnetic</div>
                                    <div className="text-[9px] text-gray-400">Capture internal nodes</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={magnetic}
                                    onChange={(e) => setMagnetic(e.target.checked)}
                                    className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                />
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                                <div className={`p-1 rounded-md ${autoRun ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Play size={12} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-medium text-gray-700">Auto-Run</div>
                                    <div className="text-[9px] text-gray-400">Run on change</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={autoRun}
                                    onChange={(e) => setAutoRun(e.target.checked)}
                                    className="w-3 h-3 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                                />
                            </label>
                        </div>

                        <div className="h-px bg-gray-100 my-2" />

                        <textarea
                            placeholder="Additional instructions..."
                            rows={2}
                            className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg resize-none outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Output Label (for non-blank groups) */}
                {groupType !== 'blank' && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center">
                        <span
                            className="mr-8 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-white/50 shadow-sm backdrop-blur-sm"
                            style={{
                                backgroundColor: `${config.color}15`,
                                color: config.color,
                            }}
                        >
                            {config.outputLabel}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(GroupFrameComponent);
