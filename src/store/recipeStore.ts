import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface RecipeEntry {
    id: string;
    timestamp: number;
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
    };
    status: 'pending' | 'running' | 'success' | 'error';
    duration?: number;
    error?: string;
}

interface RecipeState {
    recipes: RecipeEntry[];

    // Actions
    addRecipe: (recipe: Omit<RecipeEntry, 'id' | 'timestamp' | 'status'>) => string;
    updateRecipeStatus: (id: string, status: RecipeEntry['status'], duration?: number, error?: string) => void;
    setRecipeOutputs: (id: string, outputs: RecipeEntry['outputs']) => void;
    getRecipesForNode: (nodeId: string) => RecipeEntry[];
    getLatestRecipe: (nodeId: string) => RecipeEntry | undefined;
    clearRecipes: () => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
    recipes: [],

    addRecipe: (recipe) => {
        const id = uuidv4();
        const newRecipe: RecipeEntry = {
            ...recipe,
            id,
            timestamp: Date.now(),
            status: 'pending',
        };
        set({ recipes: [...get().recipes, newRecipe] });
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

    getRecipesForNode: (nodeId) => {
        return get().recipes.filter(r => r.nodeId === nodeId);
    },

    getLatestRecipe: (nodeId) => {
        const nodeRecipes = get().recipes.filter(r => r.nodeId === nodeId);
        return nodeRecipes.length > 0
            ? nodeRecipes.reduce((a, b) => a.timestamp > b.timestamp ? a : b)
            : undefined;
    },

    clearRecipes: () => set({ recipes: [] }),
}));

// Helper to create a recipe when running a group
export function createRecipeFromRun(
    nodeId: string,
    skillId: string,
    modelParams: RecipeEntry['modelParams'],
    inputRefs: RecipeEntry['inputRefs'],
    seed?: number
): string {
    return useRecipeStore.getState().addRecipe({
        nodeId,
        skillId,
        skillVersion: '1.0.0', // TODO: get actual version
        seed,
        modelParams,
        inputRefs,
        outputs: {},
    });
}
