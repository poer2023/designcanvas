import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Cached empty arrays to avoid infinite loop in React selectors
// When selectors return `|| []`, a new array reference each time
// causes useSyncExternalStore to think state changed, triggering infinite re-renders
const EMPTY_SNAPSHOT_ARRAY: OutputSnapshot[] = [];
const EMPTY_SUBSCRIPTION_ARRAY: Subscription[] = [];

/**
 * PRD v1.8: Output Snapshot Protocol
 * PRD v2.1: Active Snapshot & Replace/Reset Semantics
 * 
 * Snapshots are immutable outputs from nodes (cards/groups).
 * Downstream nodes subscribe to snapshots and get notified when upstream produces new versions.
 * 
 * v2.1 additions:
 * - activeByProducerPort: tracks which snapshot is "active" for each producer+port
 * - setActiveSnapshot: marks a specific snapshot as the active output (for Replace)
 * - resetSnapshots: clears all snapshots for a port (for Reset)
 */

export type PortKey = 'imageOut' | 'contextOut' | 'briefOut' | 'styleToken' | 'refsetToken' | 'candidatesToken' | 'elementsToken';

export interface OutputSnapshot {
    snapshot_id: string;
    producer_id: string;
    port_key: PortKey;
    version: number;
    payload: unknown;
    created_at: number;
}

export interface Subscription {
    id: string;
    subscriber_id: string;
    producer_id: string;
    port_key: PortKey;
    // Track which snapshot version the subscriber last consumed
    consumed_version: number;
}

export type StaleState = 'fresh' | 'stale' | 'blocked';

interface SnapshotState {
    // Snapshots indexed by producer_id -> port_key -> snapshot
    snapshots: Record<string, Record<string, OutputSnapshot>>;

    // PRD v2.1: Snapshot history for each producer+port (allows multiple versions)
    snapshotHistory: Record<string, Record<string, OutputSnapshot[]>>;

    // PRD v2.1: Active snapshot ID per producer+port (key: "producerId:portKey")
    activeByProducerPort: Record<string, string>;

    // Subscriptions indexed by subscriber_id
    subscriptions: Record<string, Subscription[]>;

    // Derived stale states indexed by node_id
    staleStates: Record<string, StaleState>;

    // Actions
    createSnapshot: (producerId: string, portKey: PortKey, payload: unknown) => OutputSnapshot;
    getSnapshot: (producerId: string, portKey: PortKey) => OutputSnapshot | undefined;
    getLatestVersion: (producerId: string, portKey: PortKey) => number;

    // PRD v2.1: Active snapshot management
    setActiveSnapshot: (producerId: string, portKey: PortKey, snapshotId: string) => void;
    getActiveSnapshot: (producerId: string, portKey: PortKey) => OutputSnapshot | undefined;
    getSnapshotHistory: (producerId: string, portKey: PortKey) => OutputSnapshot[];
    resetSnapshots: (producerId: string, portKey: PortKey) => void;

    // Subscription management
    subscribe: (subscriberId: string, producerId: string, portKey: PortKey) => string;
    unsubscribe: (subscriptionId: string) => void;
    unsubscribeAll: (subscriberId: string) => void;
    getSubscriptions: (subscriberId: string) => Subscription[];

    // Consumption tracking
    markConsumed: (subscriberId: string, producerId: string, portKey: PortKey, version: number) => void;

    // Stale state computation
    computeStaleState: (nodeId: string) => StaleState;
    updateStaleStates: () => void;
    getStaleState: (nodeId: string) => StaleState;

    // Cleanup
    clearSnapshots: () => void;
    removeProducerSnapshots: (producerId: string) => void;
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
    snapshots: {},
    snapshotHistory: {},
    activeByProducerPort: {},
    subscriptions: {},
    staleStates: {},

    createSnapshot: (producerId, portKey, payload) => {
        const currentVersion = get().getLatestVersion(producerId, portKey);
        const snapshot: OutputSnapshot = {
            snapshot_id: uuidv4(),
            producer_id: producerId,
            port_key: portKey,
            version: currentVersion + 1,
            payload,
            created_at: Date.now(),
        };

        const activeKey = `${producerId}:${portKey}`;

        set((state) => {
            // Add to history
            const producerHistory = state.snapshotHistory[producerId] || {};
            const portHistory = producerHistory[portKey] || [];

            return {
                snapshots: {
                    ...state.snapshots,
                    [producerId]: {
                        ...state.snapshots[producerId],
                        [portKey]: snapshot,
                    },
                },
                // PRD v2.1: Store in history
                snapshotHistory: {
                    ...state.snapshotHistory,
                    [producerId]: {
                        ...producerHistory,
                        [portKey]: [...portHistory, snapshot],
                    },
                },
                // PRD v2.1: Auto-set as active (newly created snapshot is active by default)
                activeByProducerPort: {
                    ...state.activeByProducerPort,
                    [activeKey]: snapshot.snapshot_id,
                },
            };
        });

        // Trigger stale state update for all subscribers
        get().updateStaleStates();

        return snapshot;
    },

    getSnapshot: (producerId, portKey) => {
        return get().snapshots[producerId]?.[portKey];
    },

    getLatestVersion: (producerId, portKey) => {
        return get().snapshots[producerId]?.[portKey]?.version ?? 0;
    },

    // PRD v2.1: Set a specific snapshot as active (for Replace action)
    setActiveSnapshot: (producerId, portKey, snapshotId) => {
        const activeKey = `${producerId}:${portKey}`;
        const history = get().snapshotHistory[producerId]?.[portKey] || [];
        const snapshot = history.find(s => s.snapshot_id === snapshotId);

        if (!snapshot) {
            console.warn(`[PRD v2.1] setActiveSnapshot: snapshot ${snapshotId} not found for ${producerId}:${portKey}`);
            return;
        }

        set((state) => ({
            // Update current snapshot to the active one
            snapshots: {
                ...state.snapshots,
                [producerId]: {
                    ...state.snapshots[producerId],
                    [portKey]: snapshot,
                },
            },
            activeByProducerPort: {
                ...state.activeByProducerPort,
                [activeKey]: snapshotId,
            },
        }));

        console.log(`[PRD v2.1] Set active snapshot: ${producerId}:${portKey} -> ${snapshotId}`);

        // Trigger stale state update for all subscribers
        get().updateStaleStates();
    },

    // PRD v2.1: Get the currently active snapshot
    getActiveSnapshot: (producerId, portKey) => {
        const activeKey = `${producerId}:${portKey}`;
        const activeId = get().activeByProducerPort[activeKey];

        if (!activeId) {
            // Fallback to current snapshot
            return get().snapshots[producerId]?.[portKey];
        }

        const history = get().snapshotHistory[producerId]?.[portKey] || [];
        return history.find(s => s.snapshot_id === activeId) || get().snapshots[producerId]?.[portKey];
    },

    // PRD v2.1: Get snapshot history for a producer+port
    getSnapshotHistory: (producerId, portKey) => {
        return get().snapshotHistory[producerId]?.[portKey] || EMPTY_SNAPSHOT_ARRAY;
    },

    // PRD v2.1: Reset/clear all snapshots for a port (for Reset action)
    resetSnapshots: (producerId, portKey) => {
        const activeKey = `${producerId}:${portKey}`;

        set((state) => {
            // Remove from snapshots
            const producerSnapshots = { ...state.snapshots[producerId] };
            delete producerSnapshots[portKey];

            // Remove from history (or mark as archived - for now, we clear)
            const producerHistory = { ...state.snapshotHistory[producerId] };
            delete producerHistory[portKey];

            // Remove active pointer
            const newActive = { ...state.activeByProducerPort };
            delete newActive[activeKey];

            return {
                snapshots: {
                    ...state.snapshots,
                    [producerId]: producerSnapshots,
                },
                snapshotHistory: {
                    ...state.snapshotHistory,
                    [producerId]: producerHistory,
                },
                activeByProducerPort: newActive,
            };
        });

        console.log(`[PRD v2.1] Reset snapshots: ${producerId}:${portKey}`);

        // Trigger stale state update - downstream nodes will become blocked
        get().updateStaleStates();
    },

    subscribe: (subscriberId, producerId, portKey) => {
        const id = uuidv4();
        const subscription: Subscription = {
            id,
            subscriber_id: subscriberId,
            producer_id: producerId,
            port_key: portKey,
            consumed_version: 0,
        };

        set((state) => ({
            subscriptions: {
                ...state.subscriptions,
                [subscriberId]: [...(state.subscriptions[subscriberId] || []), subscription],
            },
        }));

        get().updateStaleStates();
        return id;
    },

    unsubscribe: (subscriptionId) => {
        set((state) => {
            const newSubscriptions: Record<string, Subscription[]> = {};
            for (const [key, subs] of Object.entries(state.subscriptions)) {
                const filtered = subs.filter(s => s.id !== subscriptionId);
                if (filtered.length > 0) {
                    newSubscriptions[key] = filtered;
                }
            }
            return { subscriptions: newSubscriptions };
        });
        get().updateStaleStates();
    },

    unsubscribeAll: (subscriberId) => {
        set((state) => {
            const { [subscriberId]: _, ...rest } = state.subscriptions;
            return { subscriptions: rest };
        });
        get().updateStaleStates();
    },

    getSubscriptions: (subscriberId) => {
        return get().subscriptions[subscriberId] || EMPTY_SUBSCRIPTION_ARRAY;
    },

    markConsumed: (subscriberId, producerId, portKey, version) => {
        set((state) => ({
            subscriptions: {
                ...state.subscriptions,
                [subscriberId]: (state.subscriptions[subscriberId] || []).map(sub =>
                    sub.producer_id === producerId && sub.port_key === portKey
                        ? { ...sub, consumed_version: version }
                        : sub
                ),
            },
        }));
        get().updateStaleStates();
    },

    computeStaleState: (nodeId) => {
        const subs = get().subscriptions[nodeId] || [];

        if (subs.length === 0) {
            return 'fresh';
        }

        let hasStale = false;

        for (const sub of subs) {
            const snapshot = get().getSnapshot(sub.producer_id, sub.port_key);

            if (!snapshot) {
                // Required input missing → blocked
                return 'blocked';
            }

            // PRD v2.1: Replace can switch active output to an older version.
            // So we treat "stale" as "current active version differs from what was consumed",
            // not strictly "newer than consumed".
            if (snapshot.version !== sub.consumed_version) {
                hasStale = true;
            }
        }

        return hasStale ? 'stale' : 'fresh';
    },

    updateStaleStates: () => {
        const allSubscriberIds = Object.keys(get().subscriptions);
        const newStaleStates: Record<string, StaleState> = {};

        for (const nodeId of allSubscriberIds) {
            newStaleStates[nodeId] = get().computeStaleState(nodeId);
        }

        set({ staleStates: newStaleStates });
    },

    getStaleState: (nodeId) => {
        return get().staleStates[nodeId] || 'fresh';
    },

    clearSnapshots: () => {
        set({ snapshots: {}, snapshotHistory: {}, activeByProducerPort: {}, subscriptions: {}, staleStates: {} });
    },

    removeProducerSnapshots: (producerId) => {
        set((state) => {
            const { [producerId]: _, ...rest } = state.snapshots;
            return { snapshots: rest };
        });
        get().updateStaleStates();
    },
}));

// Helper to get all inputs for a node
export function getNodeInputs(nodeId: string): Record<PortKey, unknown> {
    const store = useSnapshotStore.getState();
    const subs = store.getSubscriptions(nodeId);
    const inputs: Partial<Record<PortKey, unknown>> = {};

    for (const sub of subs) {
        const snapshot = store.getSnapshot(sub.producer_id, sub.port_key);
        if (snapshot) {
            inputs[sub.port_key] = snapshot.payload;
        }
    }

    return inputs as Record<PortKey, unknown>;
}

// Helper to check if node can run (all required inputs available)
export function canNodeRun(nodeId: string, requiredPorts: PortKey[]): boolean {
    const store = useSnapshotStore.getState();
    const subs = store.getSubscriptions(nodeId);

    for (const port of requiredPorts) {
        const hasSub = subs.some(s => s.port_key === port);
        if (hasSub) {
            const sub = subs.find(s => s.port_key === port)!;
            const snapshot = store.getSnapshot(sub.producer_id, sub.port_key);
            if (!snapshot) {
                return false;
            }
        }
    }

    return true;
}

// =============================================================================
// PRD v2.0: Edge-based Subscription Helpers
// =============================================================================

export interface EdgeData {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

// Map sourceHandle to PortKey
function handleToPortKey(handleId: string | null | undefined): PortKey | null {
    if (!handleId) return null;

    const validPortKeys: PortKey[] = [
        'imageOut', 'contextOut', 'briefOut',
        'styleToken', 'refsetToken', 'candidatesToken', 'elementsToken'
    ];

    if (validPortKeys.includes(handleId as PortKey)) {
        return handleId as PortKey;
    }

    return null;
}

/**
 * Subscribe based on edge connection
 * Called when a new edge is created
 */
export function subscribeFromEdge(edge: EdgeData): string | null {
    const portKey = handleToPortKey(edge.sourceHandle);

    if (!portKey) {
        console.warn(`[PRD v2.0] Edge ${edge.id}: sourceHandle "${edge.sourceHandle}" is not a valid PortKey, skipping subscription`);
        return null;
    }

    const store = useSnapshotStore.getState();
    const subscriptionId = store.subscribe(edge.target, edge.source, portKey);

    console.log(`[PRD v2.0] Created subscription: ${edge.source}:${portKey} → ${edge.target} (sub_id: ${subscriptionId})`);

    return subscriptionId;
}

/**
 * Unsubscribe based on edge deletion
 * Called when an edge is removed
 */
export function unsubscribeFromEdge(edge: EdgeData): void {
    const portKey = handleToPortKey(edge.sourceHandle);

    if (!portKey) {
        return;
    }

    const store = useSnapshotStore.getState();
    const subs = store.getSubscriptions(edge.target);

    // Find subscription matching this edge
    const matchingSub = subs.find(s =>
        s.producer_id === edge.source && s.port_key === portKey
    );

    if (matchingSub) {
        store.unsubscribe(matchingSub.id);
        console.log(`[PRD v2.0] Removed subscription: ${edge.source}:${portKey} → ${edge.target}`);
    }
}

/**
 * Sync all subscriptions based on current edges
 * Called on graph load to rebuild subscription state
 */
export function syncSubscriptionsFromEdges(edges: EdgeData[]): void {
    const store = useSnapshotStore.getState();

    // Clear all existing subscriptions
    for (const subscriberId of Object.keys(store.subscriptions)) {
        store.unsubscribeAll(subscriberId);
    }

    // Create subscriptions from edges
    for (const edge of edges) {
        subscribeFromEdge(edge);
    }

    console.log(`[PRD v2.0] Synced ${edges.length} edges to subscriptions`);
}
