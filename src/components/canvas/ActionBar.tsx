'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
    Play,
    FastForward,
    RefreshCw,
    RotateCcw,
    Eye,
    Pencil,
    Copy,
    Trash2,
    Lock,
    Unlock,
    Palette,
    ImageIcon,
    X,
    BookmarkPlus,
    Loader2
} from 'lucide-react';

/**
 * PRD v2.1: Unified Action Bar Component
 * 
 * Schema-driven action bar that appears above selected nodes.
 * Actions vary by node type.
 */

// ============================================================================
// Types
// ============================================================================

export type ActionId =
    // Common actions (all nodes)
    | 'rename'
    | 'duplicate'
    | 'delete'
    | 'lock'
    | 'unlock'
    | 'color'
    // Generation node actions
    | 'run'
    | 'runFromHere'
    | 'replace'
    | 'reset'
    | 'preview'
    | 'saveToAssets'
    // Input node actions
    | 'replaceInput'
    | 'resetInput';

export type NodeType =
    | 'textCard'
    | 'imageCard'
    | 'imageStudio'
    | 'groupFrame'
    | 'uploadImage'
    | 'media'
    | 'upscale'
    | 'edit';

interface ActionDefinition {
    id: ActionId;
    label: string;
    icon: React.ReactNode;
    primary?: boolean;
    toggle?: boolean;
    danger?: boolean;
    disabled?: boolean;
    tooltip?: string;
}

interface ActionBarProps {
    nodeId: string;
    nodeType: NodeType;
    isLocked?: boolean;
    isRunning?: boolean;
    hasResults?: boolean;
    canRun?: boolean;
    missingInputs?: string[];
    onAction: (actionId: ActionId) => void;
    className?: string;
}

// ============================================================================
// Action Icon Components
// ============================================================================

const ICON_SIZE = 16;

function ActionIcon({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
    if (loading) {
        return <Loader2 size={ICON_SIZE} className="animate-spin" />;
    }
    return <>{children}</>;
}

// ============================================================================
// Action Schemas
// ============================================================================

const COMMON_ACTIONS: ActionDefinition[] = [
    { id: 'rename', label: 'Rename', icon: <Pencil size={ICON_SIZE} /> },
    { id: 'duplicate', label: 'Duplicate', icon: <Copy size={ICON_SIZE} /> },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={ICON_SIZE} />, danger: true },
];

const LOCK_ACTION_LOCKED: ActionDefinition = {
    id: 'unlock',
    label: 'Unlock',
    icon: <Unlock size={ICON_SIZE} />,
    toggle: true
};

const LOCK_ACTION_UNLOCKED: ActionDefinition = {
    id: 'lock',
    label: 'Lock',
    icon: <Lock size={ICON_SIZE} />,
    toggle: true
};

const COLOR_ACTION: ActionDefinition = {
    id: 'color',
    label: 'Color',
    icon: <Palette size={ICON_SIZE} />
};

const SAVE_TO_ASSETS_ACTION: ActionDefinition = {
    id: 'saveToAssets',
    label: 'Save',
    icon: <BookmarkPlus size={ICON_SIZE} />
};

const GENERATION_ACTIONS: ActionDefinition[] = [
    { id: 'run', label: 'Run', icon: <Play size={ICON_SIZE} />, primary: true },
    { id: 'runFromHere', label: 'Run from here', icon: <FastForward size={ICON_SIZE} /> },
    { id: 'replace', label: 'Replace', icon: <RefreshCw size={ICON_SIZE} /> },
    { id: 'reset', label: 'Reset', icon: <RotateCcw size={ICON_SIZE} /> },
    { id: 'preview', label: 'Preview', icon: <Eye size={ICON_SIZE} /> },
];

const INPUT_ACTIONS: ActionDefinition[] = [
    { id: 'replaceInput', label: 'Replace', icon: <ImageIcon size={ICON_SIZE} /> },
    { id: 'resetInput', label: 'Reset', icon: <X size={ICON_SIZE} /> },
];

// Schema mapping node types to their action sets
const ACTION_SCHEMA: Record<NodeType, ActionId[]> = {
    textCard: ['preview', 'rename', 'duplicate', 'delete', 'lock', 'color'],
    imageCard: ['run', 'runFromHere', 'replace', 'reset', 'preview', 'saveToAssets', 'rename', 'duplicate', 'delete', 'lock'],
    imageStudio: ['run', 'runFromHere', 'replace', 'reset', 'preview', 'saveToAssets', 'rename', 'duplicate', 'delete', 'lock'],
    groupFrame: ['run', 'runFromHere', 'rename', 'duplicate', 'delete', 'lock', 'color'],
    uploadImage: ['replaceInput', 'resetInput', 'saveToAssets', 'rename', 'duplicate', 'delete', 'lock', 'color'],
    media: ['replaceInput', 'resetInput', 'saveToAssets', 'rename', 'duplicate', 'delete', 'lock', 'color'],
    upscale: ['run', 'runFromHere', 'reset', 'preview', 'saveToAssets', 'rename', 'duplicate', 'delete', 'lock', 'color'],
    edit: ['run', 'runFromHere', 'reset', 'preview', 'saveToAssets', 'rename', 'duplicate', 'delete', 'lock', 'color'],
};

// ============================================================================
// Tooltip Component (Inline)
// ============================================================================

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
    const [show, setShow] = useState(false);

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && content && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-50 pointer-events-none">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function ActionBar({
    nodeType,
    isLocked = false,
    isRunning = false,
    hasResults = false,
    canRun = true,
    missingInputs = [],
    onAction,
    className = '',
}: ActionBarProps) {
    // Build action list based on node type and state
    const actions = useMemo(() => {
        const actionIds = ACTION_SCHEMA[nodeType] || [];
        const result: ActionDefinition[] = [];

        for (const actionId of actionIds) {
            // Handle lock/unlock toggle
            if (actionId === 'lock') {
                result.push(isLocked ? LOCK_ACTION_LOCKED : LOCK_ACTION_UNLOCKED);
                continue;
            }

            // Find action definition
            let action = COMMON_ACTIONS.find(a => a.id === actionId)
                || GENERATION_ACTIONS.find(a => a.id === actionId)
                || INPUT_ACTIONS.find(a => a.id === actionId);

            if (actionId === 'color') {
                action = COLOR_ACTION;
            }
            if (actionId === 'saveToAssets') {
                action = SAVE_TO_ASSETS_ACTION;
            }

            if (action) {
                // Apply state-based modifications
                const modifiedAction = { ...action };

                // Disable run if can't run
                if (actionId === 'run' || actionId === 'runFromHere') {
                    if (!canRun || isRunning) {
                        modifiedAction.disabled = true;
                        if (missingInputs.length > 0) {
                            modifiedAction.tooltip = `Missing: ${missingInputs.join(', ')}`;
                        } else if (isRunning) {
                            modifiedAction.tooltip = 'Running...';
                        }
                    }
                }

                // Disable replace/preview if no results
                if ((actionId === 'replace' || actionId === 'preview' || actionId === 'saveToAssets') && !hasResults) {
                    modifiedAction.disabled = true;
                    modifiedAction.tooltip = 'No results';
                }

                result.push(modifiedAction);
            }
        }

        return result;
    }, [nodeType, isLocked, isRunning, hasResults, canRun, missingInputs]);

    const handleAction = useCallback((actionId: ActionId) => {
        onAction(actionId);
    }, [onAction]);

    // Separate primary actions from secondary
    const primaryActions = actions.filter(a => a.primary);
    const secondaryActions = actions.filter(a => !a.primary);

    return (
        <div
            className={`flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-panel)]/95 backdrop-blur-xl border border-[var(--border-subtle)] rounded-xl shadow-2xl pointer-events-auto ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Primary Actions */}
            {primaryActions.map((action) => (
                <Tooltip key={action.id} content={action.tooltip || action.label}>
                    <button
                        onClick={() => handleAction(action.id)}
                        disabled={action.disabled}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ActionIcon loading={isRunning && action.id === 'run'}>
                            {action.icon}
                        </ActionIcon>
                        <span>{action.label}</span>
                    </button>
                </Tooltip>
            ))}

            {/* Divider between primary and secondary */}
            {primaryActions.length > 0 && secondaryActions.length > 0 && (
                <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
            )}

            {/* Secondary Actions */}
            {secondaryActions.map((action) => (
                <Tooltip key={action.id} content={action.tooltip || action.label}>
                    <button
                        onClick={() => handleAction(action.id)}
                        disabled={action.disabled}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${action.danger
                                ? 'text-red-500 hover:bg-red-500/10'
                                : action.toggle && isLocked
                                    ? 'bg-amber-500/20 text-amber-500'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {action.icon}
                    </button>
                </Tooltip>
            ))}
        </div>
    );
}

// ============================================================================
// Node Toolbar Wrapper (for React Flow integration)
// ============================================================================

interface NodeActionBarProps extends Omit<ActionBarProps, 'className'> {
    position?: 'top' | 'bottom';
    offset?: number;
}

/**
 * Wrapper component that positions the ActionBar above a node.
 * Used with React Flow's NodeToolbar or as a floating element.
 */
export function NodeActionBar({
    position = 'top',
    offset = 8,
    ...props
}: NodeActionBarProps) {
    return (
        <div
            className={`absolute left-1/2 -translate-x-1/2 z-50 ${position === 'top' ? 'bottom-full' : 'top-full'
                }`}
            style={{
                [position === 'top' ? 'marginBottom' : 'marginTop']: offset,
            }}
        >
            <ActionBar {...props} />
        </div>
    );
}

export default ActionBar;
