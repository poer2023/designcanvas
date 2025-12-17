'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Lock,
    Unlock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Settings,
    Play,
    Minus,
    Plus,
    Image as ImageIcon,
    Type
} from 'lucide-react';
import { SkillNodeData, SKILL_TYPES, useGraphStore } from '@/store/graphStore';

interface SkillNodeComponentProps {
    id: string;
    data: SkillNodeData;
    selected?: boolean;
}

function SkillNodeComponent({ id, data, selected }: SkillNodeComponentProps) {
    const { toggleNodeLock, selectNode, updateNodeParams } = useGraphStore();
    const skillInfo = SKILL_TYPES[data.skillType] || { color: '#666', icon: '❓' };

    const statusIcon = {
        idle: null,
        running: <Loader2 size={14} className="animate-spin text-blue-400" />,
        success: <CheckCircle2 size={14} className="text-green-400" />,
        fail: <AlertCircle size={14} className="text-red-400" />,
    };

    const isImageOutput = typeof data.output === 'string' &&
        (data.output.startsWith('http') || data.output.startsWith('data:image') || data.output.startsWith('/'));

    // Mock params handling - in a real app these would come from data.params
    const qty = (data.params?.batchSize as number) || 1;
    const updateQty = (delta: number) => {
        const newQty = Math.max(1, qty + delta);
        updateNodeParams(id, { batchSize: newQty });
    };

    return (
        <div className="group/card relative">
            {/* Left Handle (Target) - Full height hit area, visual button centered */}
            <div className="absolute -left-[14px] top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-gray-400 group-hover/handle:shadow-lg group-hover/handle:scale-110">
                    <Plus size={14} className="text-gray-500" />
                </div>
            </div>

            {/* Right Handle (Source) - Small button only */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-[14px] opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
                <Plus size={14} className="text-gray-500 pointer-events-none" />
            </Handle>

            <div
                className={`
                    relative bg-white rounded-[32px] min-w-[600px] min-h-[400px] flex flex-col
                    transition-all duration-300
                    ${selected
                        ? 'ring-[3px] ring-blue-500 shadow-xl'
                        : 'shadow-sm hover:shadow-md border border-gray-200'
                    }
                `}
                onClick={() => selectNode(id)}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-6 pt-5 pb-2">
                    <span className="text-lg text-gray-700 font-medium flex items-center gap-2">
                        {skillInfo.icon === '🎨' ? <ImageIcon size={20} /> : skillInfo.icon}
                        {data.skillName} #{id.slice(0, 4)} {/* Mocking a sequence number style */}
                    </span>
                    <div className="ml-auto">
                        {statusIcon[data.status]}
                    </div>
                </div>

                {/* Body */}
                <div className={`flex-1 mx-2 mb-2 rounded-[24px] bg-[#F9F9F9] relative overflow-hidden flex flex-col ${selected ? 'mb-[80px]' : ''}`}>
                    {isImageOutput ? (
                        <img
                            src={data.output as string}
                            alt="Node output"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="p-8 text-gray-400 text-lg font-light">
                            Describe the image you want to generate...
                        </div>
                    )}
                </div>

                {/* Footer - Only visible when selected (or we could make it absolute bottom) */}
                {selected && (
                    <div className="absolute bottom-0 left-0 right-0 h-[80px] px-6 flex items-center gap-3">
                        {/* Model Selector */}
                        <button className="h-10 px-4 bg-gray-100 rounded-full flex items-center gap-2 text-sm font-medium hover:bg-gray-200 transition-colors">
                            Seedream 4.5
                            <span className="opacity-50">▼</span>
                        </button>

                        {/* Ratio Selector */}
                        <button className="h-10 px-4 bg-gray-100 rounded-full flex items-center gap-2 text-sm font-medium hover:bg-gray-200 transition-colors">
                            <span className="w-4 h-3 border border-current rounded-sm"></span>
                            3:2
                            <span className="opacity-50">▼</span>
                        </button>

                        {/* Resolution Selector */}
                        <button className="h-10 px-4 bg-gray-100 rounded-full flex items-center gap-2 text-sm font-medium hover:bg-gray-200 transition-colors">
                            2K
                            <span className="opacity-50">▼</span>
                        </button>

                        {/* Quantity Counter */}
                        <div className="h-10 bg-gray-100 rounded-full flex items-center px-1">
                            <button
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                                onClick={(e) => { e.stopPropagation(); updateQty(-1); }}
                            >
                                <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{qty}</span>
                            <button
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                                onClick={(e) => { e.stopPropagation(); updateQty(1); }}
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Settings */}
                        <button className="h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors ml-1">
                            <Settings size={18} />
                        </button>

                        {/* Run Button */}
                        <button className="h-12 w-12 flex items-center justify-center bg-gray-500 text-white rounded-full hover:bg-gray-700 transition-colors ml-auto shadow-lg">
                            <Play size={20} fill="currentColor" className="ml-0.5" />
                        </button>
                    </div>
                )}


                {/* Side Actions (External from card flow in original design, let's keep Lock here but maybe improved) */}
                <div className="absolute -right-12 top-0 flex flex-col gap-2">
                    {isImageOutput && (
                        <button
                            className="p-2 bg-white rounded-full shadow hover:scale-110 transition-all text-gray-600"
                            title="View Gallery"
                        >
                            <ImageIcon size={20} />
                        </button>
                    )}
                    <button
                        className={`p-2 bg-white rounded-full shadow hover:scale-110 transition-all ${data.locked ? 'text-blue-500' : 'text-gray-400'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleNodeLock(id);
                        }}
                    >
                        {data.locked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(SkillNodeComponent);
