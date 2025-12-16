'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Square, Lasso, Check, X, Undo2 } from 'lucide-react';
import type { SelectionPath, BoundingBox } from '@/types/element';

interface SelectionCanvasProps {
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    onSelectionComplete: (selection: SelectionPath, bbox: BoundingBox) => void;
    onCancel: () => void;
}

type SelectionMode = 'rectangle' | 'lasso';

export default function SelectionCanvas({
    imageUrl,
    imageWidth,
    imageHeight,
    onSelectionComplete,
    onCancel,
}: SelectionCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<SelectionMode>('rectangle');
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
    const [lassoPoints, setLassoPoints] = useState<Array<{ x: number; y: number }>>([]);
    const [scale, setScale] = useState(1);

    // Calculate scale to fit image in view
    useEffect(() => {
        const maxWidth = window.innerWidth * 0.6;
        const maxHeight = window.innerHeight * 0.7;
        const scaleX = maxWidth / imageWidth;
        const scaleY = maxHeight / imageHeight;
        setScale(Math.min(scaleX, scaleY, 1));
    }, [imageWidth, imageHeight]);

    const getCanvasPoint = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale,
        };
    }, [scale]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const point = getCanvasPoint(e);
        if (!point) return;

        setIsDrawing(true);
        setStartPoint(point);
        setCurrentPoint(point);

        if (mode === 'lasso') {
            setLassoPoints([point]);
        }
    }, [getCanvasPoint, mode]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDrawing) return;

        const point = getCanvasPoint(e);
        if (!point) return;

        setCurrentPoint(point);

        if (mode === 'lasso') {
            setLassoPoints(prev => [...prev, point]);
        }
    }, [isDrawing, getCanvasPoint, mode]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !startPoint || !currentPoint) return;
        setIsDrawing(false);
    }, [isDrawing, startPoint, currentPoint]);

    const handleConfirm = useCallback(() => {
        if (mode === 'rectangle' && startPoint && currentPoint) {
            const minX = Math.min(startPoint.x, currentPoint.x);
            const minY = Math.min(startPoint.y, currentPoint.y);
            const maxX = Math.max(startPoint.x, currentPoint.x);
            const maxY = Math.max(startPoint.y, currentPoint.y);

            const bbox: BoundingBox = {
                x: Math.round(minX),
                y: Math.round(minY),
                width: Math.round(maxX - minX),
                height: Math.round(maxY - minY),
            };

            const selection: SelectionPath = {
                type: 'rectangle',
                points: [
                    { x: minX, y: minY },
                    { x: maxX, y: minY },
                    { x: maxX, y: maxY },
                    { x: minX, y: maxY },
                ],
            };

            onSelectionComplete(selection, bbox);
        } else if (mode === 'lasso' && lassoPoints.length > 2) {
            const xs = lassoPoints.map(p => p.x);
            const ys = lassoPoints.map(p => p.y);

            const bbox: BoundingBox = {
                x: Math.round(Math.min(...xs)),
                y: Math.round(Math.min(...ys)),
                width: Math.round(Math.max(...xs) - Math.min(...xs)),
                height: Math.round(Math.max(...ys) - Math.min(...ys)),
            };

            const selection: SelectionPath = {
                type: 'lasso',
                points: lassoPoints,
            };

            onSelectionComplete(selection, bbox);
        }
    }, [mode, startPoint, currentPoint, lassoPoints, onSelectionComplete]);

    const handleReset = useCallback(() => {
        setStartPoint(null);
        setCurrentPoint(null);
        setLassoPoints([]);
        setIsDrawing(false);
    }, []);

    // Draw selection overlay
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw selection
        ctx.strokeStyle = '#0d99ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillStyle = 'rgba(13, 153, 255, 0.2)';

        if (mode === 'rectangle' && startPoint && currentPoint) {
            const x = Math.min(startPoint.x, currentPoint.x);
            const y = Math.min(startPoint.y, currentPoint.y);
            const w = Math.abs(currentPoint.x - startPoint.x);
            const h = Math.abs(currentPoint.y - startPoint.y);

            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        } else if (mode === 'lasso' && lassoPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);

            for (let i = 1; i < lassoPoints.length; i++) {
                ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
            }

            if (!isDrawing) {
                ctx.closePath();
                ctx.fill();
            }
            ctx.stroke();
        }
    }, [mode, startPoint, currentPoint, lassoPoints, isDrawing]);

    const hasSelection = (mode === 'rectangle' && startPoint && currentPoint) ||
        (mode === 'lasso' && lassoPoints.length > 2);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
            {/* Toolbar */}
            <div className="h-14 bg-panel border-b border-subtle flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setMode('rectangle'); handleReset(); }}
                        className={`
              p-2 rounded-lg transition-colors flex items-center gap-2
              ${mode === 'rectangle' ? 'bg-accent-subtle text-accent-primary' : 'hover:bg-bg-hover text-secondary'}
            `}
                    >
                        <Square size={18} />
                        <span className="text-sm">Rectangle</span>
                    </button>
                    <button
                        onClick={() => { setMode('lasso'); handleReset(); }}
                        className={`
              p-2 rounded-lg transition-colors flex items-center gap-2
              ${mode === 'lasso' ? 'bg-accent-subtle text-accent-primary' : 'hover:bg-bg-hover text-secondary'}
            `}
                    >
                        <Lasso size={18} />
                        <span className="text-sm">Lasso</span>
                    </button>
                    <div className="w-px h-6 bg-border-subtle mx-2" />
                    <button
                        onClick={handleReset}
                        className="p-2 rounded-lg hover:bg-bg-hover text-secondary"
                        title="Reset"
                    >
                        <Undo2 size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary h-9"
                    >
                        <X size={16} />
                        <span>Cancel</span>
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="btn btn-primary h-9"
                        disabled={!hasSelection}
                    >
                        <Check size={16} />
                        <span>Confirm Selection</span>
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="relative" style={{ width: imageWidth * scale, height: imageHeight * scale }}>
                    {/* Image */}
                    <img
                        src={imageUrl}
                        alt="Select area"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        draggable={false}
                    />

                    {/* Selection Canvas */}
                    <canvas
                        ref={canvasRef}
                        width={imageWidth}
                        height={imageHeight}
                        className="absolute inset-0 cursor-crosshair"
                        style={{ width: imageWidth * scale, height: imageHeight * scale }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    />
                </div>
            </div>

            {/* Instructions */}
            <div className="h-12 bg-panel border-t border-subtle flex items-center justify-center text-sm text-secondary">
                {mode === 'rectangle'
                    ? 'Click and drag to create a rectangular selection'
                    : 'Click and drag to draw a freeform selection path'}
            </div>
        </div>
    );
}
