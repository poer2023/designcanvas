'use client';

import { useState, useRef, useCallback, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { X, Square, Lasso, Eraser, Save, RotateCcw, Tag } from 'lucide-react';
import type { Poster } from '@/types';

type Tool = 'rectangle' | 'lasso' | 'eraser';

interface Point {
    x: number;
    y: number;
}

interface LightboxProps {
    poster: Poster;
    isOpen: boolean;
    onClose: () => void;
    onSaveElement: (data: {
        poster_id: string;
        mask_data: string; // Base64 mask image
        bbox: { x: number; y: number; width: number; height: number };
        semantic_tag?: string;
        note?: string;
    }) => void;
}

export default function Lightbox({
    poster,
    isOpen,
    onClose,
    onSaveElement,
}: LightboxProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [tool, setTool] = useState<Tool>('rectangle');
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [semanticTag, setSemanticTag] = useState('');
    const [note, setNote] = useState('');
    const [imageLoaded, setImageLoaded] = useState(false);

    // Initialize canvases when image loads
    useEffect(() => {
        if (!isOpen || !poster.image_url) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = canvasRef.current;
            const maskCanvas = maskCanvasRef.current;
            if (!canvas || !maskCanvas) return;

            // Set canvas size to image size
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;

            // Draw image
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
            }

            // Clear mask
            const maskCtx = maskCanvas.getContext('2d');
            if (maskCtx) {
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            }

            setImageLoaded(true);
        };
        img.src = poster.image_url;

        return () => {
            setImageLoaded(false);
        };
    }, [isOpen, poster.image_url]);

    const getCanvasPoint = useCallback((e: ReactMouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }, []);

    const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const point = getCanvasPoint(e);
        setStartPoint(point);

        if (tool === 'lasso') {
            setLassoPoints([point]);
        }
    }, [tool, getCanvasPoint]);

    const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const point = getCanvasPoint(e);

        if (tool === 'lasso') {
            setLassoPoints(prev => [...prev, point]);

            // Draw lasso preview
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && lassoPoints.length > 0) {
                // Redraw image first
                const img = new Image();
                img.src = poster.image_url;
                ctx.drawImage(img, 0, 0);

                // Draw lasso path
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
                lassoPoints.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        } else if (tool === 'rectangle' && startPoint) {
            // Draw rectangle preview
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.src = poster.image_url;
                ctx.drawImage(img, 0, 0);

                ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(
                    startPoint.x,
                    startPoint.y,
                    point.x - startPoint.x,
                    point.y - startPoint.y
                );
                ctx.setLineDash([]);
            }
        }
    }, [isDrawing, tool, startPoint, lassoPoints, poster.image_url, getCanvasPoint]);

    const handleMouseUp = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const point = getCanvasPoint(e);
        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas?.getContext('2d');

        if (!maskCtx || !maskCanvas) return;

        // Set mask color (white on transparent for alpha channel)
        maskCtx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,1)';
        maskCtx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

        if (tool === 'rectangle' && startPoint) {
            maskCtx.fillRect(
                Math.min(startPoint.x, point.x),
                Math.min(startPoint.y, point.y),
                Math.abs(point.x - startPoint.x),
                Math.abs(point.y - startPoint.y)
            );
        } else if (tool === 'lasso' && lassoPoints.length > 2) {
            maskCtx.beginPath();
            maskCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            lassoPoints.forEach(p => maskCtx.lineTo(p.x, p.y));
            maskCtx.closePath();
            maskCtx.fill();
        }

        setStartPoint(null);
        setLassoPoints([]);

        // Redraw original image
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && poster.image_url) {
            const img = new Image();
            img.src = poster.image_url;
            ctx.drawImage(img, 0, 0);
        }
    }, [isDrawing, tool, startPoint, lassoPoints, poster.image_url, getCanvasPoint]);

    const clearMask = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas?.getContext('2d');
        if (maskCtx && maskCanvas) {
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        }
    }, []);

    const handleSave = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        // Get bounding box of the mask
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;

        let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0;
        let hasContent = false;

        for (let y = 0; y < maskCanvas.height; y++) {
            for (let x = 0; x < maskCanvas.width; x++) {
                const alpha = data[(y * maskCanvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    hasContent = true;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (!hasContent) {
            alert('Please draw a selection first');
            return;
        }

        setShowSaveDialog(true);
    }, []);

    const confirmSave = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;

        let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0;

        for (let y = 0; y < maskCanvas.height; y++) {
            for (let x = 0; x < maskCanvas.width; x++) {
                const alpha = data[(y * maskCanvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        onSaveElement({
            poster_id: poster.id,
            mask_data: maskCanvas.toDataURL('image/png'),
            bbox: {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
            },
            semantic_tag: semanticTag || undefined,
            note: note || undefined,
        });

        setShowSaveDialog(false);
        setSemanticTag('');
        setNote('');
        onClose();
    }, [poster.id, semanticTag, note, onSaveElement, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#333]">
                <div className="flex items-center gap-2">
                    {/* Tool Buttons */}
                    <div className="flex items-center gap-1 p-1 bg-[#252525] rounded-lg">
                        <button
                            onClick={() => setTool('rectangle')}
                            className={`p-2 rounded transition-colors ${tool === 'rectangle' ? 'bg-[var(--accent-primary)] text-white' : 'text-[#888] hover:text-white'}`}
                            title="Rectangle"
                        >
                            <Square size={16} />
                        </button>
                        <button
                            onClick={() => setTool('lasso')}
                            className={`p-2 rounded transition-colors ${tool === 'lasso' ? 'bg-[var(--accent-primary)] text-white' : 'text-[#888] hover:text-white'}`}
                            title="Lasso"
                        >
                            <Lasso size={16} />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-[var(--accent-primary)] text-white' : 'text-[#888] hover:text-white'}`}
                            title="Eraser"
                        >
                            <Eraser size={16} />
                        </button>
                    </div>

                    <button
                        onClick={clearMask}
                        className="p-2 rounded-lg text-[#888] hover:text-white hover:bg-[#333] transition-colors"
                        title="Clear Selection"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                <div className="text-sm text-[#888]">
                    Poster #{poster.seed}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                    >
                        <Save size={14} />
                        Save as Element
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
            <div
                ref={containerRef}
                className="flex-1 overflow-auto flex items-center justify-center p-8"
            >
                <div className="relative">
                    {/* Main canvas (visible image) */}
                    <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-[calc(100vh-120px)] cursor-crosshair"
                        style={{ display: imageLoaded ? 'block' : 'none' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => setIsDrawing(false)}
                    />

                    {/* Mask canvas (hidden, for computation) */}
                    <canvas
                        ref={maskCanvasRef}
                        className="absolute top-0 left-0 pointer-events-none opacity-30"
                        style={{ display: imageLoaded ? 'block' : 'none' }}
                    />

                    {!imageLoaded && (
                        <div className="w-64 h-96 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-[#333] border-t-[var(--accent-primary)] rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* Save Dialog */}
            {showSaveDialog && (
                <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center">
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 w-80">
                        <h3 className="text-white font-medium mb-4">Save Element</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-[#888] mb-1.5">
                                    <Tag size={12} className="inline mr-1" />
                                    Semantic Tag
                                </label>
                                <input
                                    type="text"
                                    value={semanticTag}
                                    onChange={(e) => setSemanticTag(e.target.value)}
                                    placeholder="e.g., background, text, decoration"
                                    className="w-full px-3 py-2 rounded-lg bg-[#252525] border border-[#333] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[var(--accent-primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-[#888] mb-1.5">
                                    Note (optional)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Why do you like this element?"
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-[#252525] border border-[#333] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="px-4 py-2 rounded-lg text-[#888] hover:text-white hover:bg-[#333] text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSave}
                                className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
                            >
                                Save Element
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
