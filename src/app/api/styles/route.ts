import { NextRequest, NextResponse } from 'next/server';
import { getAllStyleProfiles, createStyleProfile } from '@/lib/db/styles';

export async function GET() {
    try {
        const styles = getAllStyleProfiles();
        return NextResponse.json({ success: true, data: styles });
    } catch (error) {
        console.error('Error fetching style profiles:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch style profiles' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.name || typeof body.name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Style name is required' },
                { status: 400 }
            );
        }

        if (!body.summary_s || typeof body.summary_s !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Short summary (summary_s) is required' },
                { status: 400 }
            );
        }

        const style = createStyleProfile({
            name: body.name,
            summary_s: body.summary_s,
            summary_m: body.summary_m,
            summary_l: body.summary_l,
            banned_tokens: body.banned_tokens,
            palette_hint: body.palette_hint,
            constraints: body.constraints,
            images: body.images || [],
        });

        return NextResponse.json({ success: true, data: style }, { status: 201 });
    } catch (error) {
        console.error('Error creating style profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create style profile' },
            { status: 500 }
        );
    }
}
