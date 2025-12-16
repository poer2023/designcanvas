import fs from 'fs';
import path from 'path';

export interface SkillManifest {
    name: string;
    version: string;
    description: string;
    tags: string[];
    icon: string;
    color: string;
    io_schema: {
        input: Record<string, unknown>;
        output: Record<string, unknown>;
    };
    runtime_policy: {
        default_summary_level: 'S' | 'M' | 'L';
        upgrade_conditions?: string[];
    };
}

const SKILLS_DIR = path.join(process.cwd(), 'skills');

/**
 * Load all skill manifests from the skills directory
 */
export function loadAllSkills(): SkillManifest[] {
    const skills: SkillManifest[] = [];

    if (!fs.existsSync(SKILLS_DIR)) {
        return skills;
    }

    const skillFolders = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const folder of skillFolders) {
        const manifestPath = path.join(SKILLS_DIR, folder, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            try {
                const content = fs.readFileSync(manifestPath, 'utf-8');
                const manifest = JSON.parse(content) as SkillManifest;
                skills.push(manifest);
            } catch (error) {
                console.error(`Failed to load skill manifest: ${folder}`, error);
            }
        }
    }

    return skills;
}

/**
 * Load a specific skill manifest by name
 */
export function loadSkill(skillName: string): SkillManifest | null {
    const manifestPath = path.join(SKILLS_DIR, skillName, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        return JSON.parse(content) as SkillManifest;
    } catch (error) {
        console.error(`Failed to load skill: ${skillName}`, error);
        return null;
    }
}

/**
 * Get skill input schema for JSON Schema form rendering
 */
export function getSkillInputSchema(skillName: string): Record<string, unknown> | null {
    const manifest = loadSkill(skillName);
    return manifest?.io_schema.input || null;
}
