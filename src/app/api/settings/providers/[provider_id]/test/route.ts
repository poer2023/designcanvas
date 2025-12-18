/**
 * POST /api/settings/providers/[provider_id]/test - Test provider connection
 */

import { NextResponse } from 'next/server';
import { getProvider, getDecryptedApiKey, updateProviderTestStatus, hasApiKey } from '@/lib/db/providers';
import { getAdapter } from '@/lib/adapters';

// Import real adapters to ensure they're registered
import '@/lib/adapters/openrouter';
import '@/lib/adapters/cloudflare';
import '@/lib/adapters/huggingface';

interface RouteParams {
    params: Promise<{ provider_id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { provider_id } = await params;

        // Check if provider exists
        const provider = getProvider(provider_id);
        if (!provider) {
            return NextResponse.json(
                { success: false, error: 'Provider not found' },
                { status: 404 }
            );
        }

        // Check if API key is set
        if (!hasApiKey(provider_id)) {
            updateProviderTestStatus(provider_id, 'missing');
            return NextResponse.json({
                success: true,
                data: { status: 'missing', message: 'No API key configured' }
            });
        }

        // Get the API key
        const apiKey = getDecryptedApiKey(provider_id);
        if (!apiKey) {
            updateProviderTestStatus(provider_id, 'invalid');
            return NextResponse.json({
                success: true,
                data: { status: 'invalid', message: 'Failed to decrypt API key' }
            });
        }

        // Get adapter for this provider
        const adapter = getAdapter(provider_id);

        let testResult: { status: 'ok' | 'invalid' | 'rate_limited'; message: string };

        if (adapter && 'testConnection' in adapter) {
            // Use adapter's testConnection method
            const result = await (adapter.testConnection as (apiKey?: string) => Promise<{ ok: boolean; message: string }>)(apiKey);
            testResult = {
                status: result.ok ? 'ok' : 'invalid',
                message: result.message,
            };
        } else {
            // Fallback to generic test
            testResult = await testGenericProvider(apiKey, provider.base_url);
        }

        updateProviderTestStatus(provider_id, testResult.status);

        return NextResponse.json({
            success: true,
            data: testResult
        });
    } catch (error) {
        console.error('Failed to test provider:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to test provider connection' },
            { status: 500 }
        );
    }
}

async function testGenericProvider(apiKey: string, baseUrl: string | null): Promise<{ status: 'ok' | 'invalid' | 'rate_limited'; message: string }> {
    if (!baseUrl) {
        return { status: 'invalid', message: 'No base URL configured' };
    }

    try {
        const response = await fetch(baseUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (response.ok) {
            return { status: 'ok', message: 'Connection successful' };
        } else if (response.status === 401 || response.status === 403) {
            return { status: 'invalid', message: 'Authentication failed' };
        } else if (response.status === 429) {
            return { status: 'rate_limited', message: 'Rate limited' };
        } else {
            return { status: 'ok', message: 'Server reachable (auth not verified)' };
        }
    } catch (error) {
        return { status: 'invalid', message: `Connection failed: ${error}` };
    }
}
