'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lock, Unlock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { SkillNodeData, SKILL_TYPES, useGraphStore, SkillNode } from '@/store/graphStore';

interface SkillNodeComponentProps {
    id: string;
    data: SkillNodeData;
    selected?: boolean;
}

function SkillNodeComponent({ id, data, selected }: SkillNodeComponentProps) {
    const { toggleNodeLock, selectNode } = useGraphStore();
    const skillInfo = SKILL_TYPES[data.skillType] || { color: '#666', icon: '❓' };

    const statusIcon = {
        idle: null,
        running: <Loader2 size={14} className="animate-spin text-blue-400" />,
        success: <CheckCircle2 size={14} className="text-green-400" />,
        fail: <AlertCircle size={14} className="text-red-400" />,
    };

    return (
        <div
            className={`
        relative bg-panel border rounded-xl shadow-lg min-w-[200px] overflow-hidden
        transition-all duration-200 cursor-pointer
        ${selected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-subtle hover:border-default'}
        ${data.locked ? 'opacity-75' : ''}
      `}
            onClick={() => selectNode(id)}
        >
            {/* Header */}
            <div
                className="flex items-center gap-2 px-3 py-2 border-b border-subtle"
                style={{ backgroundColor: `${skillInfo.color}15` }}
            >
                <span className="text-lg">{skillInfo.icon}</span>
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: skillInfo.color }}>
                    {data.skillName}
                </span>
                {statusIcon[data.status]}
                {data.locked && <Lock size={12} className="text-tertiary" />}
            </div>

            {/* Body */}
            <div className="px-3 py-2 text-xs text-secondary">
                {data.status === 'fail' && data.error ? (
                    <div className="text-red-400 truncate">{data.error}</div>
                ) : data.status === 'success' && data.output ? (
                    <div className="text-green-400 truncate">Output ready</div>
                ) : (
                    <div className="text-tertiary">Click to configure</div>
                )}
            </div>

            {/* Actions (visible on hover/select) */}
            <div
                className={`
        absolute top-2 right-2 flex gap-1 transition-opacity
        ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
      `}
            >
                <button
                    className="p-1 rounded bg-bg-hover hover:bg-active text-secondary hover:text-primary transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleNodeLock(id);
                    }}
                    title={data.locked ? 'Unlock output' : 'Lock output'}
                >
                    {data.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-panel"
            />

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-panel"
            />
        </div>
    );
}

export default memo(SkillNodeComponent);
