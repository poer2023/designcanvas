import type { Template, TemplateEdge, TemplateNode, TemplateViewport } from './templateUtils';

const DEFAULT_VIEWPORT: TemplateViewport = { x: 0, y: 0, zoom: 1 };

function makeBriefToStudioTemplate(options: {
    id: string;
    name: string;
    description?: string;
    ratio: string;
    resolution: string;
    count: number;
    title: string;
    subtitle?: string;
    info?: string;
}): Template {
    const now = new Date().toISOString();

    const nodes: TemplateNode[] = [
        {
            id: 'brief',
            type: 'textCard',
            position: { x: 140, y: 160 },
            data: {
                skillId: 'brief',
                skillName: 'Brief',
                skillType: 'brief',
                params: {},
                status: 'idle',
                locked: false,
                role: 'brief',
                content: '',
                title: options.title,
                subtitle: options.subtitle || '',
                info: options.info || '',
                size: options.resolution,
                tone: 60,
                constraints: [],
            },
        },
        {
            id: 'studio',
            type: 'imageStudio',
            position: { x: 520, y: 140 },
            data: {
                skillId: 'imageStudio',
                skillName: 'Image Studio',
                skillType: 'imageStudio',
                params: {},
                status: 'idle',
                locked: false,
                state: 'empty',
                prompt: '',
                results: [],
                ratio: options.ratio,
                resolution: options.resolution,
                count: options.count,
            },
        },
        {
            id: 'upscale',
            type: 'upscale',
            position: { x: 900, y: 160 },
            data: {
                skillId: 'upscale',
                skillName: 'Upscale',
                skillType: 'upscale',
                params: {},
                status: 'idle',
                locked: false,
                scale: 2,
            },
        },
    ];

    const edges: TemplateEdge[] = [
        {
            id: 'e1',
            source: 'brief',
            target: 'studio',
            sourceHandle: 'briefOut',
            targetHandle: 'briefIn',
        },
        {
            id: 'e2',
            source: 'studio',
            target: 'upscale',
            sourceHandle: 'imageOut',
            targetHandle: 'imageIn',
        },
    ];

    return {
        meta: {
            schema_version: '2.0',
            app: 'PosterLab',
            exported_at: now,
            name: options.name,
            description: options.description,
        },
        graph: {
            nodes,
            edges,
            viewport: DEFAULT_VIEWPORT,
        },
    };
}

export const BUILT_IN_SPACE_TEMPLATES: Record<string, Template> = {
    'poster-batch': makeBriefToStudioTemplate({
        id: 'poster-batch',
        name: 'Poster Batch',
        description: 'Brief → Generate → Upscale',
        ratio: '1:1',
        resolution: '1K',
        count: 4,
        title: 'Batch Poster Ideas',
        subtitle: 'Pick the best and iterate',
        info: 'Describe the key message, audience, and visual style.',
    }),
    'music-festival': makeBriefToStudioTemplate({
        id: 'music-festival',
        name: 'Music Festival',
        description: 'Event poster starter',
        ratio: '4:5',
        resolution: '1K',
        count: 4,
        title: 'Music Festival Poster',
        subtitle: 'Lineup + date + venue',
        info: 'Vibrant lighting, bold typography, energetic mood.',
    }),
    'tech-promo': makeBriefToStudioTemplate({
        id: 'tech-promo',
        name: 'Tech Promo',
        description: 'Clean banner starter',
        ratio: '16:9',
        resolution: '1K',
        count: 2,
        title: 'Tech Promo Banner',
        subtitle: 'Product launch / feature highlight',
        info: 'Minimal layout, high contrast, futuristic feel.',
    }),
    'social-story': makeBriefToStudioTemplate({
        id: 'social-story',
        name: 'Social Story',
        description: 'Vertical story starter',
        ratio: '9:16',
        resolution: '1K',
        count: 2,
        title: 'Social Story',
        subtitle: 'Quick announcement',
        info: 'Big headline, strong focal image, mobile-first composition.',
    }),
};

export function getBuiltInSpaceTemplate(templateId: string): Template | null {
    return BUILT_IN_SPACE_TEMPLATES[templateId] ?? null;
}

