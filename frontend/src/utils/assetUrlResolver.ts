/**
 * Centralized Asset URL Resolver with Preloading & Reliable Fallback Handling.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/+$/, '');

// Clean inline SVG fallback placeholder (violet icon on dark container)
export const DEFAULT_ASSET_FALLBACK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/**
 * Normalizes any asset URL (local, relative, backend-served, or external provider) into a valid absolute URL.
 */
export const resolveAssetUrl = (
  primaryUrl?: string | null,
  secondaryUrl?: string | null,
  fallback: string = DEFAULT_ASSET_FALLBACK_SVG
): string => {
  const url = (primaryUrl || secondaryUrl || '').trim();

  if (!url) {
    return fallback;
  }

  // Data URLs (e.g. data:image/svg+xml;base64,...)
  if (url.startsWith('data:')) {
    return url;
  }

  // Already absolute HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative path to backend static media or API route
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Asynchronously preloads and decodes an image asset, caching the result in memory.
 */
export const preloadImageAsset = (url: string): Promise<HTMLImageElement> => {
  const resolvedUrl = resolveAssetUrl(url);

  if (imageCache.has(resolvedUrl)) {
    return imageCache.get(resolvedUrl)!;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      if ('decode' in img) {
        img.decode()
          .then(() => resolve(img))
          .catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      imageCache.delete(resolvedUrl);
      reject(new Error(`Failed to load image asset from: ${resolvedUrl}`));
    };
    img.src = resolvedUrl;
  });

  imageCache.set(resolvedUrl, promise);
  return promise;
};

/**
 * Clears the runtime asset image cache.
 */
export const clearAssetCache = () => {
  imageCache.clear();
};

/**
 * Handle image loading errors gracefully on thumbnail <img> tags.
 */
export const handleThumbnailError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback: string = DEFAULT_ASSET_FALLBACK_SVG
) => {
  const img = e.currentTarget;
  if (img.src !== fallback) {
    img.onerror = null; // Prevent infinite fallback loops
    img.src = fallback;
  }
};
