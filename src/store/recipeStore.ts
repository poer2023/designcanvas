import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { type PortKey, useSnapshotStore } from './snapshotStore';

/**
 * PRD v2.1: Enhanced Recipe Store
 * 
 * Recipes now track:
 * - runMode: RUN_NODE | RUN_FROM_HERE | RUN_GROUP | RUN_ALL
 * - startNodeId: the node that initiated the run
 * - affectedNodeIds: all nodes that were executed
 * - nodeIoMap: input/output snapshot references per node
 */

// ============================================================================
// Types
// ============================================================================

export type RunMode = 'RUN_NODE' | 'RUN_FROM_HERE' | 'RUN_GROUP' | 'RUN_ALL';

export interface SnapshotRef {
    snapshotId: string;
    producerId: string;
    portKey: PortKey;
    version: number;
}

export interface NodeIOEntry {
    inputs: SnapshotRef[];
    outputs: SnapshotRef[];
}

export interface RecipeEntry {
    id: string;
    timestamp: number;
    projectId?: string;

    // PRD v2.1: Run context
    runMode: RunMode;
    startNodeId: string;
    affectedNodeIds: string[];
    nodeIoMap: Record<string, NodeIOEntry>;

    // Legacy node-level fields (kept for backward compatibility)
    nodeId: string;
    skillId: string;
    skillVersion: string;
    seed?: number;
    modelParams: {
        model?: string;
        ratio?: string;
        resolution?: string;
        count?: number;
        [key: string]: unknown;
    };
    inputRefs: {
        brief?: string;
        style?: string;
        refset?: string;
        candidates?: string[];
        elements?: string[];
    };
    outputs: {
        candidateIds?: string[];
        elementIds?: string[];
        tokenId?: string;
        imageUrls?: string[];
    };
    status: 'pending' | 'running' | 'success' | 'error';
    duration?: number;
    error?: string;
}

// ============================================================================
// Store
// ============================================================================

interface RecipeState {
    recipes: RecipeEntry[];

    // Actions
    addRecipe: (recipe: Omit<RecipeEntry, 'id' | 'timestamp' | 'status'>) => string;
    updateRecipeStatus: (id: string, status: RecipeEntry['status'], duration?: number, error?: string) => void;
    setRecipeOutputs: (id: string, outputs: RecipeEntry['outputs']) => void;
    updateNodeIoMap: (id: string, nodeId: string, entry: NodeIOEntry) => void;
    getRecipesForNode: (nodeId: string, projectId?: string) => RecipeEntry[];
    getLatestRecipe: (nodeId: string, projectId?: string) => RecipeEntry | undefined;
    getRecipeById: (id: string) => RecipeEntry | undefined;
    getRecentRecipes: (limit?: number) => RecipeEntry[];
    clearRecipes: () => void;
}

export const useRecipeStore = create<RecipeState>()(
    persist(
        (set, get) => ({
            recipes: [],

            addRecipe: (recipe) => {
                const id = uuidv4();
                const newRecipe: RecipeEntry = {
                    ...recipe,
                    id,
                    timestamp: Date.now(),
                    status: 'pending',
                    projectId: recipe.projectId,
                    // Ensure defaults for v2.1 fields
                    runMode: recipe.runMode || 'RUN_NODE',
                    startNodeId: recipe.startNodeId || recipe.nodeId,
                    affectedNodeIds: recipe.affectedNodeIds || [recipe.nodeId],
                    nodeIoMap: recipe.nodeIoMap || {},
                };
                set({ recipes: [...get().recipes, newRecipe].slice(-200) });
                console.log(`[PRD v2.1] Recipe created: ${id} (mode: ${newRecipe.runMode}, affected: ${newRecipe.affectedNodeIds.length} nodes)`);
                return id;
            },

            updateRecipeStatus: (id, status, duration, error) => {
                set({
                    recipes: get().recipes.map(r =>
                        r.id === id ? { ...r, status, duration, error } : r
                    ),
                });
            },

            setRecipeOutputs: (id, outputs) => {
                set({
                    recipes: get().recipes.map(r =>
                        r.id === id ? { ...r, outputs: { ...r.outputs, ...outputs } } : r
                    ),
                });
            },

            // PRD v2.1: Update IO map for a specific node in a recipe
            updateNodeIoMap: (id, nodeId, entry) => {
                set({
                    recipes: get().recipes.map(r =>
                        r.id === id
                            ? {
                                ...r,
                                nodeIoMap: {
                                    ...r.nodeIoMap,
                                    [nodeId]: entry
                                }
                            }
                            : r
                    ),
                });
            },

            getRecipesForNode: (nodeId, projectId) => {
                return get().recipes.filter(r =>
                    (!projectId || r.projectId === projectId) &&
                    (r.nodeId === nodeId || r.affectedNodeIds.includes(nodeId))
                );
            },

            getLatestRecipe: (nodeId, projectId) => {
                const nodeRecipes = get().recipes.filter(r =>
                    (!projectId || r.projectId === projectId) &&
                    (r.nodeId === nodeId || r.affectedNodeIds.includes(nodeId))
                );
                return nodeRecipes.length > 0
                    ? nodeRecipes.reduce((a, b) => a.timestamp > b.timestamp ? a : b)
                    : undefined;
            },

            getRecipeById: (id) => {
                return get().recipes.find(r => r.id === id);
            },

            getRecentRecipes: (limit = 10) => {
                return get().recipes
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, limit);
            },

            clearRecipes: () => set({ recipes: [] }),
        }),
        {
            name: 'posterlab-recipes-v2.1',
            partialize: (state) => ({ recipes: state.recipes }),
        }
    )
);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a recipe when running a single node
 */
export function createRecipeFromRun(
    nodeId: string,
    skillId: string,
    modelParams: RecipeEntry['modelParams'],
    inputRefs: RecipeEntry['inputRefs'],
    seed?: number,
    projectId?: string
): string {
    return useRecipeStore.getState().addRecipe({
        runMode: 'RUN_NODE',
        startNodeId: nodeId,
        affectedNodeIds: [nodeId],
        nodeIoMap: {},
        projectId,
        nodeId,
        skillId,
        skillVersion: '1.0.0',
        seed,
        modelParams,
        inputRefs,
        outputs: {},
    });
}

/**
 * PRD v2.1: Create a recipe for a DAG run (Run from here / Run all / Run group)
 */
export function createRecipeFromDagRun(
    runMode: RunMode,
    startNodeId: string,
    affectedNodeIds: string[],
    options: {
        projectId?: string;
        skillId?: string;
        modelParams?: RecipeEntry['modelParams'];
    } = {},
): string {
    const { projectId, skillId = 'dag-run', modelParams = {} } = options;
    return useRecipeStore.getState().addRecipe({
        runMode,
        startNodeId,
        affectedNodeIds,
        nodeIoMap: {},
        projectId,
        nodeId: startNodeId,
        skillId,
        skillVersion: '1.0.0',
        modelParams,
        inputRefs: {},
        outputs: {},
    });
}

/**
 * PRD v2.1: Replay a recipe by restoring active snapshots
 * 
 * This function restores the canvas to the state it was in when the recipe was run.
 * It does NOT re-execute nodes - just restores the output selection state.
 */
export function replayRecipe(recipeId: string): boolean {
    const recipe = useRecipeStore.getState().getRecipeById(recipeId);
    if (!recipe) {
        console.warn(`[PRD v2.1] Cannot replay recipe: ${recipeId} not found`);
        return false;
    }

    const snapshotStore = useSnapshotStore.getState();
    let restored = 0;

    // Restore active snapshots from nodeIoMap
    for (const ioEntry of Object.values(recipe.nodeIoMap)) {
        for (const outputRef of ioEntry.outputs) {
            // Check if snapshot still exists in history
            const history = snapshotStore.getSnapshotHistory(outputRef.producerId, outputRef.portKey);
            const snapshotExists = history.some((s: { snapshot_id: string }) => s.snapshot_id === outputRef.snapshotId);

            if (snapshotExists) {
                snapshotStore.setActiveSnapshot(
                    outputRef.producerId,
                    outputRef.portKey,
                    outputRef.snapshotId
                );
                restored++;
            } else {
                console.warn(`[PRD v2.1] Snapshot ${outputRef.snapshotId} no longer exists, skipping`);
            }
        }
    }

    console.log(`[PRD v2.1] Replayed recipe ${recipeId}: restored ${restored} active snapshots`);
    return restored > 0;
}
