import { NextRequest, NextResponse } from 'next/server';
import {
    getAllRecipes,
    getRecipesByProject,
    createRecipe,
    getRecipeById,
    deleteRecipe,
    getRecipeCount
} from '@/lib/db/recipes';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const id = searchParams.get('id');

        if (id) {
            const recipe = getRecipeById(id);
            if (!recipe) {
                return NextResponse.json(
                    { success: false, error: 'Recipe not found' },
                    { status: 404 }
                );
            }
            return NextResponse.json({ success: true, data: recipe });
        }

        const recipes = projectId
            ? getRecipesByProject(projectId)
            : getAllRecipes();

        const count = getRecipeCount(projectId || undefined);

        return NextResponse.json({
            success: true,
            data: recipes,
            meta: { total: count }
        });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch recipes' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { project_id, graph_snapshot, node_runs, seeds, skill_versions, asset_refs } = body;

        if (!project_id || !graph_snapshot) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const recipe = createRecipe({
            project_id,
            graph_snapshot,
            node_runs: node_runs || [],
            seeds: seeds || [],
            skill_versions: skill_versions || {},
            asset_refs: asset_refs || [],
        });

        return NextResponse.json({ success: true, data: recipe });
    } catch (error) {
        console.error('Error creating recipe:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create recipe' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID is required' },
                { status: 400 }
            );
        }

        const deleted = deleteRecipe(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Recipe not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete recipe' },
            { status: 500 }
        );
    }
}
