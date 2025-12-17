'use client';

import { useState, useRef, useCallback, useEffect, MouseEvent } from 'react';
import {
    X, ZoomIn, ZoomOut, Grid, AlignLeft, AlignCenter, AlignRight,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    Trash2, Copy, ArrowUp, ArrowDown, Wand2, Download, Undo, Redo
} from 'lucide-react';
import type { Element } from '@/types';

interface ArtboardElement {
    id: string;
    element: Element;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
}

interface ArtboardEditorProps {
    isOpen: boolean;
    onClose: () => void;
    artboardSize: { width: number; height: number };
    elements: ArtboardElement[];
    onElementsChange: (elements: ArtboardElement[]) => void;
    onHarmonize: () => void;
    onExport: () => void;
}

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8;

export default function ArtboardEditor({
    isOpen,
    onClose,
    artboardSize,
    elements,
    onElementsChange,
    onHarmonize,
    onExport,
}: ArtboardEditorProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Alignment guides
    const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

    const selectedElements = elements.filter(el => selectedIds.has(el.id));

    // Snap to grid
    const snapToGrid = useCallback((value: number): number => {
        if (!showGrid) return value;
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    }, [showGrid]);

    // Handle element selection
    const handleElementClick = useCallback((id: string, e: MouseEvent) => {
        e.stopPropagation();
        if (e.shiftKey) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
                return next;
            });
        } else {
            setSelectedIds(new Set([id]));
        }
    }, []);

    // Handle canvas click (deselect)
    const handleCanvasClick = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    // Handle drag start
    const handleDragStart = useCallback((id: string, e: MouseEvent) => {
        e.stopPropagation();
        if (!selectedIds.has(id)) {
            setSelectedIds(new Set([id]));
        }
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    }, [selectedIds]);

    // Handle drag move
    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragStart) return;

        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;

        setDragOffset({ x: snapToGrid(dx), y: snapToGrid(dy) });

        // Calculate alignment guides
        const newGuides: { x: number[]; y: number[] } = { x: [], y: [] };
        const centerX = artboardSize.width / 2;
        const centerY = artboardSize.height / 2;

        selectedIds.forEach(id => {
            const el = elements.find(e => e.id === id);
            if (el) {
                const newX = el.x + snapToGrid(dx);
                const newY = el.y + snapToGrid(dy);
                const elCenterX = newX + el.width / 2;
                const elCenterY = newY + el.height / 2;

                // Check center alignment
                if (Math.abs(elCenterX - centerX) < SNAP_THRESHOLD) {
                    newGuides.x.push(centerX);
                }
                if (Math.abs(elCenterY - centerY) < SNAP_THRESHOLD) {
                    newGuides.y.push(centerY);
                }
            }
        });

        setGuides(newGuides);
    }, [isDragging, dragStart, zoom, selectedIds, elements, artboardSize, snapToGrid]);

    // Handle drag end
    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;

        // Apply the drag offset to selected elements
        const newElements = elements.map(el => {
            if (selectedIds.has(el.id)) {
                return {
                    ...el,
                    x: el.x + dragOffset.x,
                    y: el.y + dragOffset.y,
                };
            }
            return el;
        });

        onElementsChange(newElements);
        setIsDragging(false);
        setDragStart(null);
        setDragOffset({ x: 0, y: 0 });
        setGuides({ x: [], y: [] });
    }, [isDragging, selectedIds, elements, dragOffset, onElementsChange]);

    // Layer operations
    const bringForward = useCallback(() => {
        if (selectedIds.size !== 1) return;
        const id = Array.from(selectedIds)[0];
        const maxZ = Math.max(...elements.map(e => e.zIndex));
        const newElements = elements.map(el =>
            el.id === id ? { ...el, zIndex: maxZ + 1 } : el
        );
        onElementsChange(newElements);
    }, [selectedIds, elements, onElementsChange]);

    const sendBackward = useCallback(() => {
        if (selectedIds.size !== 1) return;
        const id = Array.from(selectedIds)[0];
        const minZ = Math.min(...elements.map(e => e.zIndex));
        const newElements = elements.map(el =>
            el.id === id ? { ...el, zIndex: minZ - 1 } : el
        );
        onElementsChange(newElements);
    }, [selectedIds, elements, onElementsChange]);

    // Delete selected
    const deleteSelected = useCallback(() => {
        const newElements = elements.filter(el => !selectedIds.has(el.id));
        onElementsChange(newElements);
        setSelectedIds(new Set());
    }, [selectedIds, elements, onElementsChange]);

    // Alignment operations
    const alignElements = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        if (selectedIds.size < 2) return;

        const selected = elements.filter(el => selectedIds.has(el.id));
        let targetValue: number;

        switch (alignment) {
            case 'left':
                targetValue = Math.min(...selected.map(el => el.x));
                break;
            case 'right':
                targetValue = Math.max(...selected.map(el => el.x + el.width));
                break;
            case 'center':
                targetValue = selected.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selected.length;
                break;
            case 'top':
                targetValue = Math.min(...selected.map(el => el.y));
                break;
            case 'bottom':
                targetValue = Math.max(...selected.map(el => el.y + el.height));
                break;
            case 'middle':
                targetValue = selected.reduce((sum, el) => sum + el.y + el.height / 2, 0) / selected.length;
                break;
        }

        const newElements = elements.map(el => {
            if (!selectedIds.has(el.id)) return el;

            switch (alignment) {
                case 'left':
                    return { ...el, x: targetValue };
                case 'right':
                    return { ...el, x: targetValue - el.width };
                case 'center':
                    return { ...el, x: targetValue - el.width / 2 };
                case 'top':
                    return { ...el, y: targetValue };
                case 'bottom':
                    return { ...el, y: targetValue - el.height };
                case 'middle':
                    return { ...el, y: targetValue - el.height / 2 };
                default:
                    return el;
            }
        });

        onElementsChange(newElements);
    }, [selectedIds, elements, onElementsChange]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-[#333]">
                <div className="flex items-center gap-3">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-[#252525] rounded-lg p-1">
                        <button
                            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                            className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333] transition-colors"
                        >
                            <ZoomOut size={14} />
                        </button>
                        <span className="text-xs text-[#888] w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                            className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333] transition-colors"
                        >
                            <ZoomIn size={14} />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-2 rounded-lg transition-colors ${showGrid ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]' : 'text-[#888] hover:text-white hover:bg-[#333]'}`}
                        title="Toggle Grid"
                    >
                        <Grid size={16} />
                    </button>

                    <div className="w-px h-6 bg-[#333]" />

                    {/* Alignment Tools */}
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => alignElements('left')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Align Left">
                            <AlignLeft size={14} />
                        </button>
                        <button onClick={() => alignElements('center')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Align Center">
                            <AlignCenter size={14} />
                        </button>
                        <button onClick={() => alignElements('right')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Align Right">
                            <AlignRight size={14} />
                        </button>
                        <div className="w-px h-4 bg-[#333] mx-1" />
                        <button onClick={() => alignElements('top')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Align Top">
                            <AlignStartVertical size={14} />
                        </button>
                        <button onClick={() => alignElements('middle')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Align Middle">
                            <AlignCenterVertical size={14} />
                        </button>
                        <button onClick={() => alignElements('bottom')} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Align Bottom">
                            <AlignEndVertical size={14} />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-[#333]" />

                    {/* Layer Tools */}
                    <div className="flex items-center gap-0.5">
                        <button onClick={bringForward} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Bring Forward">
                            <ArrowUp size={14} />
                        </button>
                        <button onClick={sendBackward} className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#333]" title="Send Backward">
                            <ArrowDown size={14} />
                        </button>
                        <button onClick={deleteSelected} className="p-1.5 rounded text-[#888] hover:text-red-400 hover:bg-[#333]" title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="text-sm text-[#888]">
                    {artboardSize.width} × {artboardSize.height}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onHarmonize}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors"
                    >
                        <Wand2 size={14} />
                        Harmonize
                    </button>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#333] text-white text-sm font-medium hover:bg-[#444] transition-colors"
                    >
                        <Download size={14} />
                        Export
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#333] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#0a0a0a]">
                <div
                    ref={canvasRef}
                    className="relative bg-white shadow-2xl"
                    style={{
                        width: artboardSize.width * zoom,
                        height: artboardSize.height * zoom,
                    }}
                    onClick={handleCanvasClick}
                >
                    {/* Grid */}
                    {showGrid && (
                        <svg
                            className="absolute inset-0 pointer-events-none"
                            width="100%"
                            height="100%"
                        >
                            <defs>
                                <pattern
                                    id="grid"
                                    width={GRID_SIZE * zoom}
                                    height={GRID_SIZE * zoom}
                                    patternUnits="userSpaceOnUse"
                                >
                                    <path
                                        d={`M ${GRID_SIZE * zoom} 0 L 0 0 0 ${GRID_SIZE * zoom}`}
                                        fill="none"
                                        stroke="rgba(0,0,0,0.05)"
                                        strokeWidth="1"
                                    />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    )}

                    {/* Alignment Guides */}
                    {guides.x.map((x, i) => (
                        <div
                            key={`gx-${i}`}
                            className="absolute top-0 bottom-0 w-px bg-[var(--accent-primary)] pointer-events-none"
                            style={{ left: x * zoom }}
                        />
                    ))}
                    {guides.y.map((y, i) => (
                        <div
                            key={`gy-${i}`}
                            className="absolute left-0 right-0 h-px bg-[var(--accent-primary)] pointer-events-none"
                            style={{ top: y * zoom }}
                        />
                    ))}

                    {/* Elements */}
                    {elements
                        .sort((a, b) => a.zIndex - b.zIndex)
                        .map(el => {
                            const isSelected = selectedIds.has(el.id);
                            const offsetX = isSelected && isDragging ? dragOffset.x : 0;
                            const offsetY = isSelected && isDragging ? dragOffset.y : 0;

                            return (
                                <div
                                    key={el.id}
                                    className={`absolute cursor-move ${isSelected ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
                                    style={{
                                        left: (el.x + offsetX) * zoom,
                                        top: (el.y + offsetY) * zoom,
                                        width: el.width * zoom,
                                        height: el.height * zoom,
                                        transform: `rotate(${el.rotation}deg)`,
                                        zIndex: el.zIndex,
                                    }}
                                    onClick={(e) => handleElementClick(el.id, e)}
                                    onMouseDown={(e) => handleDragStart(el.id, e)}
                                >
                                    {el.element.image_url ? (
                                        <img
                                            src={el.element.image_url}
                                            alt=""
                                            className="w-full h-full object-contain"
                                            draggable={false}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                            Element
                                        </div>
                                    )}

                                    {/* Selection handles */}
                                    {isSelected && (
                                        <>
                                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-[var(--accent-primary)] rounded-full" />
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-[var(--accent-primary)] rounded-full" />
                                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-[var(--accent-primary)] rounded-full" />
                                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-[var(--accent-primary)] rounded-full" />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Layer Panel (Side) */}
            <div className="absolute right-4 top-16 bottom-4 w-48 bg-[#141414]/95 backdrop-blur-xl border border-[#333] rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-[#333]">
                    <h3 className="text-xs font-medium text-white">Layers</h3>
                </div>
                <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100%-40px)]">
                    {elements
                        .sort((a, b) => b.zIndex - a.zIndex)
                        .map(el => (
                            <div
                                key={el.id}
                                className={`
                                    flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer
                                    ${selectedIds.has(el.id) ? 'bg-[var(--accent-primary)]/20' : 'hover:bg-[#252525]'}
                                    transition-colors
                                `}
                                onClick={(e) => handleElementClick(el.id, e)}
                            >
                                <div className="w-6 h-6 rounded bg-[#252525] overflow-hidden shrink-0">
                                    {el.element.image_url && (
                                        <img src={el.element.image_url} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <span className="text-[10px] text-[#aaa] truncate">
                                    {el.element.semantic_tag || `Element ${el.id.slice(0, 4)}`}
                                </span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
