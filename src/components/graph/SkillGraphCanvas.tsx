'use client';

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type NodeTypes,
    type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore, SKILL_TYPES, SkillNode, SkillEdge } from '@/store/graphStore';
import SkillNodeComponent from './SkillNode';
import TextCard from '@/components/cards/TextCard';
import ImageStudio from '@/components/cards/ImageStudio';
import ImageCard from '@/components/cards/ImageCard';
import UploadImage from '@/components/cards/UploadImage';
import GroupFrame, { GroupType } from '@/components/cards/GroupFrame';
import MediaCard from '@/components/cards/MediaCard';
import UpscaleCard from '@/components/cards/UpscaleCard';
import { v4 as uuidv4 } from 'uuid';

/**
 * PRD v1.8: Node Types
 * - imageCard: Unified image card with mode='raw'|'studio'
 * - imageStudio: Legacy, kept for compatibility
 */
const nodeTypes = {
    skillNode: SkillNodeComponent,
    textCard: TextCard,
    imageStudio: ImageStudio,
    imageCard: ImageCard,
    uploadImage: UploadImage,
    groupFrame: GroupFrame,
    media: MediaCard,
    upscale: UpscaleCard,
} as NodeTypes;

export type InteractionMode = 'select' | 'hand' | 'draw_group' | 'scissors';

const SCISSORS_CURSOR = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 24 24\'%3E%3Ccircle cx=\'6\' cy=\'18\' r=\'2.2\' fill=\'%23f472b6\'/%3E%3Ccircle cx=\'6\' cy=\'6\' r=\'2.2\' fill=\'%230ea5e9\'/%3E%3Cpath d=\'M20 4 8.5 15.5\' stroke=\'%23fb7185\' stroke-width=\'2\' stroke-linecap=\'round\'/%3E%3Cpath d=\'M20 20 12 12\' stroke=\'%237c3aed\' stroke-width=\'2\' stroke-linecap=\'round\'/%3E%3C/svg%3E") 10 10, crosshair';

interface SkillGraphCanvasInnerProps {
    onNodeSelect?: (node: SkillNode | null) => void;
    interactionMode: InteractionMode;
    groupTypeToDraw?: GroupType;
    onInteractionModeChange: (mode: InteractionMode) => void;
}

function SkillGraphCanvasInner({
    onNodeSelect,
    interactionMode,
    groupTypeToDraw = 'blank',
    onInteractionModeChange
}: SkillGraphCanvasInnerProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition, getViewport } = useReactFlow();

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null);
    const [drawCurrent, setDrawCurrent] = useState<{ x: number, y: number } | null>(null);

    // Middle mouse panning state
    const [isPanning, setIsPanning] = useState(false);

    // Clipboard for copy/paste
    const clipboardRef = useRef<SkillNode | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

    const {
        nodes,
        edges,
        selectedNodeId,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setNodes,
        setEdges,
    } = useGraphStore();

    // Refs for copy/paste to avoid dependency array issues
    const nodesRef = useRef(nodes);
    const setNodesRef = useRef(setNodes);
    useEffect(() => {
        nodesRef.current = nodes;
        setNodesRef.current = setNodes;
    }, [nodes, setNodes]);

    /**
     * PRD v1.8: Canvas-level paste handler
     * When user pastes an image to the canvas, auto-create a raw ImageCard
     */
    const handleCanvasPaste = useCallback((event: ClipboardEvent) => {
        // Ignore if focus is on an input/textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    event.preventDefault();

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imageUrl = e.target?.result as string;

                        // Get center of viewport for placement
                        const viewport = getViewport();
                        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
                        const centerX = bounds ? bounds.width / 2 : 400;
                        const centerY = bounds ? bounds.height / 2 : 300;

                        const position = screenToFlowPosition({
                            x: centerX,
                            y: centerY,
                        });

                        // Create raw ImageCard
                        const newNode: SkillNode = {
                            id: uuidv4(),
                            type: 'imageCard',
                            position,
                            data: {
                                skillId: 'imageCard',
                                skillName: 'Image',
                                skillType: 'imageCard',
                                params: {},
                                status: 'idle',
                                locked: false,
                                mode: 'raw',
                                imageUrl,
                                source: 'paste',
                            },
                        };

                        setNodesRef.current([...nodesRef.current, newNode]);
                        console.log('[PRD v1.8] Auto-created raw ImageCard from paste');
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        }
    }, [screenToFlowPosition, getViewport]);

    // Attach canvas paste listener
    useEffect(() => {
        document.addEventListener('paste', handleCanvasPaste);
        return () => document.removeEventListener('paste', handleCanvasPaste);
    }, [handleCanvasPaste]);

    // Copy/Paste keyboard shortcuts (Ctrl/Cmd+C, Ctrl/Cmd+V for nodes)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if focus is on an input/textarea
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Check for Ctrl (Windows) or Cmd (Mac)
            const isModifierPressed = event.ctrlKey || event.metaKey;

            if (!isModifierPressed) return;

            // Copy: Ctrl/Cmd+C
            if (event.key === 'c' || event.key === 'C') {
                // Find selected node (React Flow marks it with selected: true)
                const currentNodes = nodesRef.current;
                const selectedNode = currentNodes.find(n => n.selected);
                if (selectedNode) {
                    // Deep clone the node
                    clipboardRef.current = JSON.parse(JSON.stringify(selectedNode));
                    console.log('[Copy] Copied node:', selectedNode.id, selectedNode.type);
                    event.preventDefault();
                }
            }

            // Paste: Ctrl/Cmd+V (for nodes, not images - images handled by handleCanvasPaste)
            if (event.key === 'v' || event.key === 'V') {
                if (!clipboardRef.current) {
                    return; // Let image paste handler take over
                }

                const copiedNode = clipboardRef.current;
                const PASTE_OFFSET = 50;

                // Create new node with new ID and offset position
                const newNode: SkillNode = {
                    ...JSON.parse(JSON.stringify(copiedNode)),
                    id: uuidv4(),
                    position: {
                        x: copiedNode.position.x + PASTE_OFFSET,
                        y: copiedNode.position.y + PASTE_OFFSET,
                    },
                    // Clear parent relationship for pasted nodes
                    parentId: undefined,
                    selected: false,
                };

                console.log('[Paste] Pasting node:', newNode.id, newNode.type);

                // Add new node to the canvas
                setNodesRef.current([...nodesRef.current, newNode]);

                // Update clipboard position for subsequent pastes
                clipboardRef.current = {
                    ...clipboardRef.current,
                    position: newNode.position,
                };

                event.preventDefault();
            }
        };

        // Attach to document to ensure we capture events
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []); // Empty dependency array - refs handle the updates

    const getNodeDimensions = useCallback((node: SkillNode) => {
        const measuredWidth = node.measured?.width;
        const measuredHeight = node.measured?.height;

        const widthFromStyle =
            typeof node.style?.width === 'number'
                ? node.style.width
                : typeof node.style?.width === 'string'
                    ? Number.parseFloat(node.style.width)
                    : undefined;

        const heightFromStyle =
            typeof node.style?.height === 'number'
                ? node.style.height
                : typeof node.style?.height === 'string'
                    ? Number.parseFloat(node.style.height)
                    : undefined;

        return {
            width: measuredWidth ?? node.width ?? widthFromStyle ?? 300,
            height: measuredHeight ?? node.height ?? heightFromStyle ?? 200,
        };
    }, []);

    const getAbsolutePosition = useCallback((node: SkillNode, nodeById: Map<string, SkillNode>): XYPosition => {
        let x = node.position.x;
        let y = node.position.y;

        let parentId = node.parentId;
        let safety = 0;
        while (parentId && safety < 50) {
            const parent = nodeById.get(parentId);
            if (!parent) break;
            x += parent.position.x;
            y += parent.position.y;
            parentId = parent.parentId;
            safety += 1;
        }

        return { x, y };
    }, []);

    const reorderNodesForParenting = useCallback((inputNodes: SkillNode[]) => {
        const nodeById = new Map(inputNodes.map(n => [n.id, n]));
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const ordered: SkillNode[] = [];

        const visit = (node: SkillNode) => {
            if (visited.has(node.id)) return;
            if (visiting.has(node.id)) return;

            visiting.add(node.id);
            if (node.parentId) {
                const parent = nodeById.get(node.parentId);
                if (parent) visit(parent);
            }
            visiting.delete(node.id);
            visited.add(node.id);
            ordered.push(node);
        };

        inputNodes.forEach(visit);
        return ordered;
    }, []);

    const hasParentOrderViolation = useCallback((inputNodes: SkillNode[]) => {
        const indexById = new Map<string, number>();
        inputNodes.forEach((n, idx) => indexById.set(n.id, idx));

        for (let idx = 0; idx < inputNodes.length; idx += 1) {
            const node = inputNodes[idx];
            if (!node.parentId) continue;
            const parentIndex = indexById.get(node.parentId);
            if (parentIndex !== undefined && parentIndex > idx) return true;
        }
        return false;
    }, []);

    // Ensure parent nodes come before children in the nodes array (React Flow requirement).
    useEffect(() => {
        const needsReorder = hasParentOrderViolation(nodes);
        if (!needsReorder) return;

        setNodes(reorderNodesForParenting(nodes));
    }, [nodes, hasParentOrderViolation, reorderNodesForParenting, setNodes]);

    const selectedNode = useMemo(
        () => nodes.find((n) => n.id === selectedNodeId) || null,
        [nodes, selectedNodeId]
    );

    // Notify parent when selection changes
    useMemo(() => {
        onNodeSelect?.(selectedNode);
    }, [selectedNode, onNodeSelect]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const skillType = event.dataTransfer.getData('application/skilltype');
            if (!skillType) return;

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            addNode(skillType, position);
        },
        [screenToFlowPosition, addNode]
    );

    // Group Drawing Handlers
    const onPaneMouseDown = useCallback((event: React.MouseEvent) => {
        if (interactionMode !== 'draw_group') return;
        if (event.button !== 0) return;

        event.preventDefault();
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;

        setIsDrawing(true);
        setDrawStart({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
        });
        setDrawCurrent({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
        });
    }, [interactionMode]);

    const onPaneMouseMove = useCallback((event: React.MouseEvent) => {
        if (!isDrawing || !drawStart) return;

        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;

        setDrawCurrent({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
        });
    }, [isDrawing, drawStart]);

    const onPaneMouseUp = useCallback((event: React.MouseEvent) => {
        if (!isDrawing || !drawStart || !drawCurrent) return;

        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);

        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;

        // Calculate Box in Screen Coords
        const startX = Math.min(drawStart.x, drawCurrent.x);
        const startY = Math.min(drawStart.y, drawCurrent.y);
        const drawWidth = Math.abs(drawCurrent.x - drawStart.x);
        const drawHeight = Math.abs(drawCurrent.y - drawStart.y);

        if (drawWidth < 10 || drawHeight < 10) { // Lower tolerance
            onInteractionModeChange('select');
            return;
        }

        // Convert to Flow Coords
        const flowStart = screenToFlowPosition({ x: startX + bounds.left, y: startY + bounds.top });
        const flowEnd = screenToFlowPosition({ x: startX + bounds.left + drawWidth, y: startY + bounds.top + drawHeight });

        // Normalize Flow Rect (handle zoomed out negatives etc)
        const rect = {
            x: Math.min(flowStart.x, flowEnd.x),
            y: Math.min(flowStart.y, flowEnd.y),
            width: Math.abs(flowEnd.x - flowStart.x),
            height: Math.abs(flowEnd.y - flowStart.y),
        };

        // Find intersecting nodes
        const intersectingNodes = nodes.filter(n => {
            if (n.type === 'groupFrame') return false;
            if (n.parentId) return false;
            const nW = n.measured?.width || n.width || 300; // Fallback width
            const nH = n.measured?.height || n.height || 300;
            const nX = n.position.x;
            const nY = n.position.y;

            const centerX = nX + nW / 2;
            const centerY = nY + nH / 2;
            return centerX >= rect.x && centerX <= rect.x + rect.width &&
                centerY >= rect.y && centerY <= rect.y + rect.height;
        });

        let finalGroupRect = { ...rect };
        const children = intersectingNodes;

        if (children.length > 0) {
            // Calculate Union Rect
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            children.forEach(n => {
                const nW = n.measured?.width || n.width || 300;
                const nH = n.measured?.height || n.height || 300;
                minX = Math.min(minX, n.position.x);
                minY = Math.min(minY, n.position.y);
                maxX = Math.max(maxX, n.position.x + nW);
                maxY = Math.max(maxY, n.position.y + nH);
            });

            // Add Padding (Top is larger for header)
            const PADDING_TOP = 80;
            const PADDING = 40;

            finalGroupRect = {
                x: minX - PADDING,
                y: minY - PADDING_TOP,
                width: (maxX - minX) + (PADDING * 2),
                height: (maxY - minY) + (PADDING_TOP + PADDING),
            };

            // Ensure we cover the user's drawn area too if it's larger
            const drawnRight = rect.x + rect.width;
            const drawnBottom = rect.y + rect.height;
            const finalRight = finalGroupRect.x + finalGroupRect.width;
            const finalBottom = finalGroupRect.y + finalGroupRect.height;

            finalGroupRect.x = Math.min(finalGroupRect.x, rect.x);
            finalGroupRect.y = Math.min(finalGroupRect.y, rect.y);
            finalGroupRect.width = Math.max(finalRight, drawnRight) - finalGroupRect.x;
            finalGroupRect.height = Math.max(finalBottom, drawnBottom) - finalGroupRect.y;
        }

        // Create Group Node
        const groupId = uuidv4();
        const groupNode: SkillNode = {
            id: groupId,
            type: 'groupFrame',
            position: { x: finalGroupRect.x, y: finalGroupRect.y },
            style: { width: finalGroupRect.width, height: finalGroupRect.height },
            data: {
                skillId: groupTypeToDraw,
                skillName: 'Group',
                skillType: groupTypeToDraw,
                groupType: groupTypeToDraw,
                params: {},
                status: 'idle',
                locked: false,
            },
            zIndex: -1,
        };

        // React Flow requires parent nodes to appear before their children in the nodes array.
        let newNodes = [groupNode, ...nodes];

        // Reparent Children
        if (children.length > 0) {
            newNodes = newNodes.map(n => {
                if (children.find(c => c.id === n.id)) {
                    return {
                        ...n,
                        parentId: groupId,
                        position: {
                            x: n.position.x - finalGroupRect.x,
                            y: n.position.y - finalGroupRect.y,
                        },
                        // No 'extent' to allow dragging out if needed, or 'parent' to keep inside
                        // User asked for "Free drag", assuming they meant free INSIDE.
                        // I will set extent: parent to keep them contained as per standard Group behavior, 
                        // but user said "free drag", usually implies not constrained? 
                        // Let's rely on standard RF behavior. If extent is unset, they can be dragged out.
                        // "吸附了" (Snapped) -> usually implies they become children.
                        // "Can trigger free drag" -> maybe they want to drag OUT? 
                        // For Smart Grouping, keeping them inside (extent: 'parent') feels cleaner.
                        // But let's leave extent undefined for flexibility.
                    };
                }
                return n;
            });
        }

        setNodes(newNodes);
        onInteractionModeChange('select');

    }, [isDrawing, drawStart, drawCurrent, screenToFlowPosition, nodes, setNodes, groupTypeToDraw, onInteractionModeChange]);

    // Render Preview Box
    const previewBox = useMemo(() => {
        if (!isDrawing || !drawStart || !drawCurrent) return null;

        const left = Math.min(drawStart.x, drawCurrent.x);
        const top = Math.min(drawStart.y, drawCurrent.y);
        const width = Math.abs(drawCurrent.x - drawStart.x);
        const height = Math.abs(drawCurrent.y - drawStart.y);

        return (
            <div
                className="absolute z-50 border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none rounded-xl"
                style={{
                    left,
                    top,
                    width,
                    height,
                }}
            />
        );
    }, [isDrawing, drawStart, drawCurrent]);

    const onNodeDragStop = useCallback((_: React.MouseEvent, dragged: SkillNode) => {
        const currentNodes = nodes;
        if (currentNodes.length === 0) return;

        const nodeById = new Map(currentNodes.map(n => [n.id, n]));
        const draggedFromState = nodeById.get(dragged.id);
        const effectiveDragged = draggedFromState
            ? { ...draggedFromState, position: dragged.position, parentId: dragged.parentId }
            : dragged;

        nodeById.set(effectiveDragged.id, effectiveDragged);
        const effectiveNodes = currentNodes.map(n => (n.id === effectiveDragged.id ? effectiveDragged : n));

        if (effectiveDragged.type === 'groupFrame') {
            const group = effectiveDragged;
            const groupAbs = getAbsolutePosition(group, nodeById);
            const groupDim = getNodeDimensions(group);

            const isMagnetic = (group.data.magnetic as boolean | undefined) !== false;
            if (!isMagnetic) return;

            let didChange = false;
            const updates = effectiveNodes.map(n => {
                if (n.type === 'groupFrame') return n;
                if (n.parentId) return n;

                const abs = getAbsolutePosition(n, nodeById);
                const dim = getNodeDimensions(n);
                const centerX = abs.x + dim.width / 2;
                const centerY = abs.y + dim.height / 2;

                const inside =
                    centerX >= groupAbs.x &&
                    centerX <= groupAbs.x + groupDim.width &&
                    centerY >= groupAbs.y &&
                    centerY <= groupAbs.y + groupDim.height;

                if (!inside) return n;

                didChange = true;
                return {
                    ...n,
                    parentId: group.id,
                    position: {
                        x: abs.x - groupAbs.x,
                        y: abs.y - groupAbs.y,
                    },
                };
            });

            if (!didChange) return;
            setNodes(reorderNodesForParenting(updates));
            return;
        }

        // Non-group nodes: snap into/out of groups on drop
        const node = effectiveDragged;

        const nodeAbs = getAbsolutePosition(node, nodeById);
        const nodeDim = getNodeDimensions(node);
        const nodeCenter = {
            x: nodeAbs.x + nodeDim.width / 2,
            y: nodeAbs.y + nodeDim.height / 2,
        };

        const groups = effectiveNodes.filter(n => n.type === 'groupFrame');
        const currentParentId = node.parentId ?? null;
        const groupHits = groups.map(g => {
            const gAbs = getAbsolutePosition(g, nodeById);
            const gDim = getNodeDimensions(g);
            const inside =
                nodeCenter.x >= gAbs.x &&
                nodeCenter.x <= gAbs.x + gDim.width &&
                nodeCenter.y >= gAbs.y &&
                nodeCenter.y <= gAbs.y + gDim.height;
            return { id: g.id, abs: gAbs, area: gDim.width * gDim.height, inside };
        });

        const currentParentHit =
            currentParentId ? groupHits.find(g => g.id === currentParentId && g.inside) ?? null : null;

        const targetGroup =
            currentParentHit ??
            groupHits
                .filter(g => g.inside)
                .sort((a, b) => a.area - b.area)[0] ??
            null;

        // Already in correct group (or no group)
        if ((targetGroup?.id ?? null) === currentParentId) return;

        const nextNodes = effectiveNodes.map(n => {
            if (n.id !== node.id) return n;

            if (!targetGroup) {
                // Detach from parent -> convert to absolute position
                return {
                    ...n,
                    parentId: undefined,
                    position: { ...nodeAbs },
                };
            }

            // Attach to target group -> convert to relative position
            return {
                ...n,
                parentId: targetGroup.id,
                position: {
                    x: nodeAbs.x - targetGroup.abs.x,
                    y: nodeAbs.y - targetGroup.abs.y,
                },
            };
        });

        setNodes(reorderNodesForParenting(nextNodes));
    }, [nodes, getAbsolutePosition, getNodeDimensions, reorderNodesForParenting, setNodes]);

    useEffect(() => {
        if (!isPanning) return;
        const handleMouseUp = () => setIsPanning(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isPanning]);

    // Use pointer capture phase to reliably detect middle mouse down even when React Flow consumes the event.
    const handleWrapperPointerDownCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse') return;
        if (event.button !== 1) return;
        setIsPanning(true);
    }, []);

    const handleWrapperPointerUpCapture = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse') return;
        if (event.button !== 1) return;
        setIsPanning(false);
    }, []);

    // Track middle mouse button for cursor change
    const handleWrapperMouseDown = useCallback((event: React.MouseEvent) => {
        // Middle mouse button = 1
        if (event.button === 1) {
            event.preventDefault();
            setIsPanning(true);
            return;
        }
        onPaneMouseDown(event);
    }, [onPaneMouseDown]);

    const handleWrapperMouseUp = useCallback((event: React.MouseEvent) => {
        setIsPanning(false);
        onPaneMouseUp(event);
    }, [onPaneMouseUp]);

    // Determine cursor style (inline to override React Flow)
    const getCursorStyle = (): React.CSSProperties => {
        if (isPanning) return { cursor: 'grabbing' };
        if (interactionMode === 'hand') return { cursor: 'grab' };
        if (interactionMode === 'draw_group') return { cursor: 'crosshair' };
        if (interactionMode === 'scissors') return { cursor: SCISSORS_CURSOR };
        return {};
    };

    const decoratedEdges = useMemo(() => {
        return edges.map((edge) => {
            const classNames = [edge.className];
            if (interactionMode === 'scissors') classNames.push('edge-scissors-mode');
            if (interactionMode === 'scissors' && hoveredEdgeId === edge.id) classNames.push('edge-scissors-hover');

            return {
                ...edge,
                className: classNames.filter(Boolean).join(' '),
            };
        });
    }, [edges, hoveredEdgeId, interactionMode]);

    // Handle edge click for scissors mode
    const onEdgeClick = useCallback((_: React.MouseEvent, edge: SkillEdge) => {
        if (interactionMode !== 'scissors') return;
        // Remove the clicked edge
        setEdges(edges.filter(e => e.id !== edge.id));
    }, [interactionMode, edges, setEdges]);

    const handleEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: SkillEdge) => {
        if (interactionMode !== 'scissors') return;
        setHoveredEdgeId(edge.id);
    }, [interactionMode]);

    const handleEdgeMouseLeave = useCallback(() => {
        if (interactionMode !== 'scissors') return;
        setHoveredEdgeId(null);
    }, [interactionMode]);

    return (
        <div
            className={`w-full h-full relative ${isPanning ? 'panning-active' : ''} ${interactionMode === 'hand' ? 'hand-mode' : ''} ${interactionMode === 'draw_group' ? 'draw-group-mode' : ''} ${interactionMode === 'scissors' ? 'scissors-mode' : ''}`}
            style={getCursorStyle()}
            ref={reactFlowWrapper}
            onPointerDownCapture={handleWrapperPointerDownCapture}
            onPointerUpCapture={handleWrapperPointerUpCapture}
            onMouseDown={handleWrapperMouseDown}
            onMouseMove={onPaneMouseMove}
            onMouseUp={handleWrapperMouseUp}
            onMouseLeave={handleWrapperMouseUp}
        >
            <ReactFlow
                nodes={nodes}
                edges={decoratedEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                onEdgeClick={onEdgeClick}
                onEdgeMouseEnter={handleEdgeMouseEnter}
                onEdgeMouseLeave={handleEdgeMouseLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
                className="bg-app"
                panOnDrag={interactionMode === 'hand' ? [0, 1] : [1]}
                selectionOnDrag={interactionMode === 'select'}
                panOnScroll={true}
                nodesDraggable={interactionMode === 'select'}
                elementsSelectable={interactionMode === 'select'}
            >
                <Background color="var(--border-subtle)" gap={24} size={1} />

                {/* Controls - Bottom Left */}
                <Controls
                    className="!bg-white/90 dark:!bg-gray-900/90 !backdrop-blur-sm !border !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg"
                    showInteractive={false}
                    position="bottom-left"
                />

                {/* MiniMap - Bottom Right */}
                <MiniMap
                    className="!bg-white/90 dark:!bg-gray-900/90 !backdrop-blur-sm !border !border-gray-200 dark:!border-gray-700 !rounded-xl !shadow-lg"
                    style={{ width: 140, height: 90 }}
                    nodeColor={(node) => {
                        const n = node as SkillNode;
                        return SKILL_TYPES[n.data?.skillType]?.color || '#888';
                    }}
                    maskColor="rgba(0,0,0,0.08)"
                    pannable
                    zoomable
                    position="bottom-right"
                />
            </ReactFlow>

            {/* Drawing Preview */}
            {previewBox}

            {/* Empty State */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-8 bg-panel/80 backdrop-blur-sm border border-subtle rounded-2xl max-w-md opacity-50">
                        <div className="text-5xl mb-4">🎨</div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            Ready to Create
                        </h3>
                    </div>
                </div>
            )}
        </div>
    );
}

export interface SkillGraphCanvasProps {
    onNodeSelect?: (node: SkillNode | null) => void;
    interactionMode: InteractionMode;
    groupTypeToDraw?: GroupType;
    onInteractionModeChange: (mode: InteractionMode) => void;
}

export default function SkillGraphCanvas({
    onNodeSelect,
    interactionMode = 'select',
    groupTypeToDraw,
    onInteractionModeChange
}: SkillGraphCanvasProps) {
    return (
        <ReactFlowProvider>
            <SkillGraphCanvasInner
                onNodeSelect={onNodeSelect}
                interactionMode={interactionMode}
                groupTypeToDraw={groupTypeToDraw}
                onInteractionModeChange={onInteractionModeChange}
            />
        </ReactFlowProvider>
    );
}
