import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

/**
 * PRD v1.8: Output Snapshot Protocol
 * 
 * Snapshots are immutable outputs from nodes (cards/groups).
 * Downstream nodes subscribe to snapshots and get notified when upstream produces new versions.
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

    // Subscriptions indexed by subscriber_id
    subscriptions: Record<string, Subscription[]>;

    // Derived stale states indexed by node_id
    staleStates: Record<string, StaleState>;

    // Actions
    createSnapshot: (producerId: string, portKey: PortKey, payload: unknown) => OutputSnapshot;
    getSnapshot: (producerId: string, portKey: PortKey) => OutputSnapshot | undefined;
    getLatestVersion: (producerId: string, portKey: PortKey) => number;

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

        set((state) => ({
            snapshots: {
                ...state.snapshots,
                [producerId]: {
                    ...state.snapshots[producerId],
                    [portKey]: snapshot,
                },
            },
        }));

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
        return get().subscriptions[subscriberId] || [];
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

            if (snapshot.version > sub.consumed_version) {
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
        set({ snapshots: {}, staleStates: {} });
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

