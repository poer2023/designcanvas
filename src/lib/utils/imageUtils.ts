/**
 * Image Preprocessing Utilities
 * Handles image compression and format conversion for API requests
 */

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

/**
 * Convert blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Load image from URL or data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
}

/**
 * Prepare image for API by ensuring it's base64 and within size limits
 * - Compresses images larger than MAX_DIMENSION
 * - Converts URLs to base64 data URLs
 */
export async function prepareImageForApi(url: string): Promise<string> {
    // Already a data URL - check if needs compression
    if (url.startsWith('data:')) {
        try {
            const img = await loadImage(url);
            const { width, height } = img;

            // No compression needed
            if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
                return url;
            }

            // Compress
            return compressImage(img, width, height);
        } catch {
            // If loading fails, return as-is
            return url;
        }
    }

    // External URL - fetch and process
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        const img = await loadImage(dataUrl);
        const { width, height } = img;

        // No compression needed
        if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
            return dataUrl;
        }

        // Compress
        return compressImage(img, width, height);
    } catch (error) {
        console.warn('[ImageUtils] Failed to prepare image:', error);
        // Return original URL as fallback
        return url;
    }
}

/**
 * Compress image to fit within MAX_DIMENSION
 */
function compressImage(img: HTMLImageElement, width: number, height: number): string {
    const scale = MAX_DIMENSION / Math.max(width, height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas not supported');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Prepare multiple images for API
 */
export async function prepareImagesForApi(urls: string[]): Promise<string[]> {
    return Promise.all(urls.map(prepareImageForApi));
}

/**
 * Check if a URL is a valid image URL or data URL
 */
export function isValidImageUrl(url: string): boolean {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    if (/^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url)) return true;
    if (/^https?:\/\//.test(url)) return true; // Allow other URLs
    return false;
}
