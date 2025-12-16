'use client';

import { useState, useCallback, useRef } from 'react';
import {
    Plus, Minus, RotateCcw, Grid, Lock, Unlock, Eye, EyeOff,
    Trash2, Download, Layers, Move, ZoomIn, ZoomOut, Save,
    AlignLeft, AlignCenter, AlignRight, Play, Sparkles
} from 'lucide-react';
import type { CanvasElement, ComposeDraft, ExportOptions } from '@/types/compose';
import type { Element } from '@/types/element';

interface ComposeCanvasProps {
    draft?: ComposeDraft;
    availableElements: Element[];
    onSave?: (draft: ComposeDraft) => void;
    onExport?: (options: ExportOptions) => void;
    onHarmonize?: () => void;
}

const DEFAULT_DRAFT: Omit<ComposeDraft, 'id' | 'created_at' | 'updated_at'> = {
    project_id: '',
    name: 'Untitled Draft',
    width: 1080,
    height: 1920,
    background_color: '#ffffff',
    elements: [],
    grid_enabled: true,
    grid_size: 20,
};

export default function ComposeCanvas({
    draft,
    availableElements,
    onSave,
    onExport,
    onHarmonize
}: ComposeCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [elements, setElements] = useState<CanvasElement[]>(draft?.elements || []);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(0.5);
    const [gridEnabled, setGridEnabled] = useState(draft?.grid_enabled ?? true);
    const [canvasSize] = useState({ width: draft?.width || 1080, height: draft?.height || 1920 });
    const [bgColor, setBgColor] = useState(draft?.background_color || '#ffffff');
    const [dragging, setDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const selectedElement = elements.find(e => e.id === selectedId);

    const handleAddElement = useCallback((element: Element) => {
        const newCanvasElement: CanvasElement = {
            id: `ce-${Date.now()}`,
            element_id: element.id,
            image_url: element.image_url,
            x: canvasSize.width / 2 - 100,
            y: canvasSize.height / 2 - 100,
            width: 200,
            height: 200,
            rotation: 0,
            scale: 1,
            zIndex: elements.length,
            locked: false,
            visible: true,
        };
        setElements([...elements, newCanvasElement]);
        setSelectedId(newCanvasElement.id);
    }, [elements, canvasSize]);

    const handleUpdateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
        setElements(elements.map(e => e.id === id ? { ...e, ...updates } : e));
    }, [elements]);

    const handleDeleteElement = useCallback((id: string) => {
        setElements(elements.filter(e => e.id !== id));
        if (selectedId === id) setSelectedId(null);
    }, [elements, selectedId]);

    const handleBringForward = useCallback((id: string) => {
        const index = elements.findIndex(e => e.id === id);
        if (index < elements.length - 1) {
            const newElements = [...elements];
            [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
            newElements.forEach((e, i) => e.zIndex = i);
            setElements(newElements);
        }
    }, [elements]);

    const handleSendBackward = useCallback((id: string) => {
        const index = elements.findIndex(e => e.id === id);
        if (index > 0) {
            const newElements = [...elements];
            [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
            newElements.forEach((e, i) => e.zIndex = i);
            setElements(newElements);
        }
    }, [elements]);

    const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
        const element = elements.find(el => el.id === elementId);
        if (!element || element.locked) return;

        setSelectedId(elementId);
        setDragging(true);

        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    }, [elements]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging || !selectedId || !canvasRef.current) return;

        const element = elements.find(el => el.id === selectedId);
        if (!element || element.locked) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        let newX = (e.clientX - canvasRect.left - dragOffset.x) / zoom;
        let newY = (e.clientY - canvasRect.top - dragOffset.y) / zoom;

        // Snap to grid
        if (gridEnabled) {
            newX = Math.round(newX / 20) * 20;
            newY = Math.round(newY / 20) * 20;
        }

        handleUpdateElement(selectedId, { x: newX, y: newY });
    }, [dragging, selectedId, elements, zoom, dragOffset, gridEnabled, handleUpdateElement]);

    const handleMouseUp = useCallback(() => {
        setDragging(false);
    }, []);

    return (
        <div className="flex h-full bg-[#1a1a1a]">
            {/* Element Library Sidebar */}
            <div className="w-[200px] bg-panel border-r border-subtle p-3 overflow-y-auto">
                <h3 className="text-xs font-medium text-tertiary uppercase mb-3">Elements</h3>
                <div className="space-y-2">
                    {availableElements.length === 0 ? (
                        <p className="text-xs text-tertiary text-center py-4">
                            No elements available
                        </p>
                    ) : (
                        availableElements.map((element) => (
                            <button
                                key={element.id}
                                onClick={() => handleAddElement(element)}
                                className="w-full aspect-square bg-bg-hover rounded-lg overflow-hidden border border-subtle hover:border-accent-primary transition-colors"
                            >
                                <img
                                    src={element.image_url}
                                    alt={element.semantic_tag || 'Element'}
                                    className="w-full h-full object-contain p-2"
                                />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Toolbar */}
                <div className="h-12 bg-panel border-b border-subtle flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                            className="p-2 rounded-lg hover:bg-bg-hover text-secondary"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs text-secondary w-12 text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                            className="p-2 rounded-lg hover:bg-bg-hover text-secondary"
                        >
                            <ZoomIn size={16} />
                        </button>
                        <div className="w-px h-6 bg-border-subtle mx-2" />
                        <button
                            onClick={() => setGridEnabled(!gridEnabled)}
                            className={`p-2 rounded-lg ${gridEnabled ? 'bg-accent-subtle text-accent-primary' : 'hover:bg-bg-hover text-secondary'}`}
                        >
                            <Grid size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onHarmonize}
                            className="btn btn-secondary h-8 px-3"
                        >
                            <Sparkles size={14} />
                            <span>Harmonize</span>
                        </button>
                        <button
                            onClick={() => onExport?.({ format: 'png', quality: 100, include_assets: true, include_recipe: true, scale: 1 })}
                            className="btn btn-primary h-8 px-3"
                        >
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div
                    className="flex-1 overflow-auto flex items-center justify-center p-8"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div
                        ref={canvasRef}
                        className="relative shadow-2xl"
                        style={{
                            width: canvasSize.width * zoom,
                            height: canvasSize.height * zoom,
                            backgroundColor: bgColor,
                            backgroundImage: gridEnabled ? `
                linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
              ` : 'none',
                            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        }}
                    >
                        {elements
                            .filter(e => e.visible)
                            .sort((a, b) => a.zIndex - b.zIndex)
                            .map((element) => (
                                <div
                                    key={element.id}
                                    className={`absolute cursor-move ${selectedId === element.id ? 'ring-2 ring-blue-500' : ''
                                        } ${element.locked ? 'cursor-not-allowed opacity-75' : ''}`}
                                    style={{
                                        left: element.x * zoom,
                                        top: element.y * zoom,
                                        width: element.width * zoom,
                                        height: element.height * zoom,
                                        transform: `rotate(${element.rotation}deg) scale(${element.scale})`,
                                        transformOrigin: 'center',
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                                    onClick={() => setSelectedId(element.id)}
                                >
                                    <img
                                        src={element.image_url}
                                        alt=""
                                        className="w-full h-full object-contain pointer-events-none"
                                        draggable={false}
                                    />

                                    {/* Resize handles */}
                                    {selectedId === element.id && !element.locked && (
                                        <>
                                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize" />
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize" />
                                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize" />
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize" />
                                        </>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Properties Panel */}
            <div className="w-[240px] bg-panel border-l border-subtle p-4 overflow-y-auto">
                <h3 className="text-xs font-medium text-tertiary uppercase mb-3">Properties</h3>

                {selectedElement ? (
                    <div className="space-y-4">
                        {/* Position */}
                        <div>
                            <label className="text-xs text-tertiary mb-1.5 block">Position</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-tertiary">X</span>
                                    <input
                                        type="number"
                                        className="input h-8 text-xs"
                                        value={Math.round(selectedElement.x)}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { x: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-tertiary">Y</span>
                                    <input
                                        type="number"
                                        className="input h-8 text-xs"
                                        value={Math.round(selectedElement.y)}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { y: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Size */}
                        <div>
                            <label className="text-xs text-tertiary mb-1.5 block">Size</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-tertiary">W</span>
                                    <input
                                        type="number"
                                        className="input h-8 text-xs"
                                        value={Math.round(selectedElement.width)}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { width: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-tertiary">H</span>
                                    <input
                                        type="number"
                                        className="input h-8 text-xs"
                                        value={Math.round(selectedElement.height)}
                                        onChange={(e) => handleUpdateElement(selectedElement.id, { height: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rotation */}
                        <div>
                            <label className="text-xs text-tertiary mb-1.5 block">Rotation</label>
                            <input
                                type="range"
                                min="-180"
                                max="180"
                                value={selectedElement.rotation}
                                onChange={(e) => handleUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })}
                                className="w-full"
                            />
                            <div className="text-xs text-center text-secondary">{selectedElement.rotation}°</div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleUpdateElement(selectedElement.id, { locked: !selectedElement.locked })}
                                className={`p-2 rounded-lg ${selectedElement.locked ? 'bg-amber-500/20 text-amber-500' : 'bg-bg-hover text-secondary'}`}
                                title={selectedElement.locked ? 'Unlock' : 'Lock'}
                            >
                                {selectedElement.locked ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                            <button
                                onClick={() => handleUpdateElement(selectedElement.id, { visible: !selectedElement.visible })}
                                className="p-2 rounded-lg bg-bg-hover text-secondary"
                                title={selectedElement.visible ? 'Hide' : 'Show'}
                            >
                                {selectedElement.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                                onClick={() => handleBringForward(selectedElement.id)}
                                className="p-2 rounded-lg bg-bg-hover text-secondary"
                                title="Bring Forward"
                            >
                                <Layers size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteElement(selectedElement.id)}
                                className="p-2 rounded-lg bg-red-500/20 text-red-500"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-tertiary text-sm">
                        <Move size={24} className="mx-auto mb-2 opacity-50" />
                        <p>Select an element</p>
                    </div>
                )}

                {/* Canvas Properties */}
                <div className="mt-6 pt-4 border-t border-subtle">
                    <h4 className="text-xs font-medium text-tertiary uppercase mb-3">Canvas</h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-tertiary mb-1.5 block">Background</label>
                            <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="w-full h-8 rounded cursor-pointer"
                            />
                        </div>
                        <div className="text-xs text-tertiary">
                            {canvasSize.width} × {canvasSize.height}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
