/**
 * POST /api/settings/providers/[provider_id]/test - Test provider connection
 */

import { NextResponse } from 'next/server';
import { getProvider, getDecryptedApiKey, updateProviderTestStatus, hasApiKey } from '@/lib/db/providers';

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

        // Test connection based on provider type
        let testResult: { status: 'ok' | 'invalid' | 'rate_limited'; message: string };

        switch (provider_id) {
            case 'mock':
                // Mock provider always succeeds
                testResult = { status: 'ok', message: 'Mock provider connected' };
                break;

            case 'openai':
                testResult = await testOpenAI(apiKey, provider.base_url);
                break;

            case 'replicate':
                testResult = await testReplicate(apiKey, provider.base_url);
                break;

            case 'nanobanana':
                testResult = await testNanoBanana(apiKey, provider.base_url);
                break;

            default:
                // Generic HTTP test
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

async function testOpenAI(apiKey: string, baseUrl: string | null): Promise<{ status: 'ok' | 'invalid' | 'rate_limited'; message: string }> {
    try {
        const url = `${baseUrl || 'https://api.openai.com/v1'}/models`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (response.status === 200) {
            return { status: 'ok', message: 'OpenAI connection successful' };
        } else if (response.status === 401) {
            return { status: 'invalid', message: 'Invalid API key' };
        } else if (response.status === 429) {
            return { status: 'rate_limited', message: 'Rate limited' };
        } else {
            return { status: 'invalid', message: `Unexpected status: ${response.status}` };
        }
    } catch (error) {
        return { status: 'invalid', message: `Connection failed: ${error}` };
    }
}

async function testReplicate(apiKey: string, baseUrl: string | null): Promise<{ status: 'ok' | 'invalid' | 'rate_limited'; message: string }> {
    try {
        const url = `${baseUrl || 'https://api.replicate.com/v1'}/models`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${apiKey}`,
            },
        });

        if (response.status === 200) {
            return { status: 'ok', message: 'Replicate connection successful' };
        } else if (response.status === 401) {
            return { status: 'invalid', message: 'Invalid API key' };
        } else if (response.status === 429) {
            return { status: 'rate_limited', message: 'Rate limited' };
        } else {
            return { status: 'invalid', message: `Unexpected status: ${response.status}` };
        }
    } catch (error) {
        return { status: 'invalid', message: `Connection failed: ${error}` };
    }
}

async function testNanoBanana(apiKey: string, baseUrl: string | null): Promise<{ status: 'ok' | 'invalid' | 'rate_limited'; message: string }> {
    // Placeholder for NanoBanana API test
    // For now, just validate the key format
    if (apiKey && apiKey.length > 10) {
        return { status: 'ok', message: 'NanoBanana key format valid (no live test available)' };
    }
    return { status: 'invalid', message: 'Invalid key format' };
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
