import { NextResponse } from 'next/server';
import { loadAllSkills } from '@/lib/skills/registry';

export async function GET() {
    try {
        const skills = loadAllSkills();
        return NextResponse.json({ success: true, data: skills });
    } catch (error) {
        console.error('Error loading skills:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load skills' },
            { status: 500 }
        );
    }
}
