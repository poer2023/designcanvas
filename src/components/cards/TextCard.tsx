'use client';

import { useState, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
    Type,
    FileText,
    ChevronDown,
    Save,
    Plus,
    X,
    Settings,
} from 'lucide-react';

// v1.7: Only Notes and Brief roles
type TextRole = 'notes' | 'brief';

interface TextCardData {
    role: TextRole;
    content: string;
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

    const addConstraint = () => {
        const newConstraint = prompt('Enter constraint:');
        if (newConstraint) {
            setConstraints([...constraints, newConstraint]);
        }
    };

    return (
        <div className="group/card relative">
            {/* Left Handle (Target) - Full height hit area, visual button centered */}
            <div className="absolute -left-6 top-0 h-full w-6 z-10 group/handle flex items-center justify-center">
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!absolute !top-0 !left-0 !w-full !h-full !bg-transparent !border-0 !rounded-none !transform-none"
                />
                {/* Visual plus button - centered */}
                <div className="w-6 h-6 bg-white border border-gray-300 rounded-full shadow-md flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 pointer-events-none group-hover/handle:border-gray-400 group-hover/handle:shadow-lg group-hover/handle:scale-110">
                    <Plus size={14} className="text-gray-500" />
                </div>
            </div>

            {/* Right Handle (Source) - Small button only */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-6 !h-6 !bg-white !border !border-gray-300 !rounded-full !shadow-md !-right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !flex !items-center !justify-center hover:!border-gray-400 hover:!shadow-lg hover:!scale-110"
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
                                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-50"
                                    >
                                        Notes
                                    </button>
                                    <button
                                        onClick={() => { setRole('brief'); setShowRoleMenu(false); }}
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
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
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
                                className="w-full text-lg font-bold placeholder-gray-300 border-none p-0 focus:ring-0"
                            />
                            <input
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="Add subtitle..."
                                className="w-full text-sm text-gray-500 placeholder-gray-300 border-none p-0 focus:ring-0 mt-1"
                            />
                        </div>

                        <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                            <div className="flex gap-2">
                                <select
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
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
                                    <button onClick={() => setConstraints(constraints.filter((_, idx) => idx !== i))} className="hover:text-red-800">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={addConstraint}
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
        </div>
    );
}

export default memo(TextCardComponent);
