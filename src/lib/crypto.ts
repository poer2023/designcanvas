/**
 * Crypto utilities for API key encryption
 * Uses AES-256-GCM for symmetric encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getSecretKey(): Buffer {
    const key = process.env.APP_SECRET_KEY;
    if (!key) {
        // For development, use a default key (NOT for production!)
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  APP_SECRET_KEY not set, using development default');
            return crypto.scryptSync('posterlab-dev-key-not-for-production', 'salt', 32);
        }
        throw new Error('APP_SECRET_KEY environment variable is required for API key encryption');
    }
    // Derive a 32-byte key from the provided secret
    return crypto.scryptSync(key, 'posterlab-salt', 32);
}

/**
 * Encrypt a plaintext string
 * Returns a base64-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
    const key = getSecretKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Expects base64-encoded string: iv:authTag:ciphertext
 */
export function decrypt(encrypted: string): string {
    const key = getSecretKey();

    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Check if a secret key is configured
 */
export function isSecretKeyConfigured(): boolean {
    return !!process.env.APP_SECRET_KEY || process.env.NODE_ENV === 'development';
}

/**
 * Mask an API key for display (show first 4 and last 4 chars)
 */
export function maskApiKey(key: string): string {
    if (key.length <= 8) {
        return '****';
    }
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
