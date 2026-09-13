import { apiUrl } from '../services/apiClient';
import type { FontItem } from '../types/editorFeatures';

export type FontReference = Pick<FontItem, 'id' | 'family' | 'source' | 'url' | 'licence'> & {
  weight?: number;
  style?: 'normal' | 'italic';
};

const loadingFonts = new Map<string, Promise<void>>();

const normalizedUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith('/')) return apiUrl(url);
  return url;
};

export async function ensureFontLoaded(font: FontReference) {
  const url = normalizedUrl(font.url);
  if (!url) {
    await document.fonts.load(`${font.style || 'normal'} ${font.weight || 400} 16px "${font.family}"`);
    return;
  }
  const key = `${font.family}|${font.weight || 400}|${font.style || 'normal'}|${url}`;
  if (document.fonts.check(`${font.style || 'normal'} ${font.weight || 400} 16px "${font.family}"`)) return;
  const current = loadingFonts.get(key);
  if (current) return current;
  const promise = new FontFace(font.family, `url(${JSON.stringify(url)})`, {
    weight: String(font.weight || 400),
    style: font.style || 'normal',
  }).load().then((loaded) => {
    document.fonts.add(loaded);
  }).finally(() => {
    loadingFonts.delete(key);
  });
  loadingFonts.set(key, promise);
  return promise;
}

const collectReferences = (objects: unknown[], result: FontReference[]) => {
  objects.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const object = entry as Record<string, unknown>;
    const references = Array.isArray(object.fontReferences) ? object.fontReferences : [];
    references.forEach((reference) => {
      if (reference && typeof reference === 'object') result.push(reference as FontReference);
    });
    if (typeof object.fontFamily === 'string' && typeof object.fontUrl === 'string') {
      result.push({
        id: typeof object.fontId === 'string' ? object.fontId : object.fontFamily,
        family: object.fontFamily,
        source: typeof object.fontSource === 'string' ? object.fontSource as FontReference['source'] : 'uploaded',
        url: object.fontUrl,
        licence: typeof object.fontLicence === 'string' ? object.fontLicence : undefined,
        weight: typeof object.fontWeight === 'number' ? object.fontWeight : Number(object.fontWeight) || 400,
        style: object.fontStyle === 'italic' ? 'italic' : 'normal',
      });
    }
    if (Array.isArray(object.objects)) collectReferences(object.objects, result);
  });
};

export async function preloadFontsFromCanvasJson(json: string) {
  let parsed: { objects?: unknown[] };
  try {
    parsed = JSON.parse(json);
  } catch {
    return;
  }
  const references: FontReference[] = [];
  collectReferences(Array.isArray(parsed.objects) ? parsed.objects : [], references);
  const unique = [...new Map(references.map((item) => [`${item.family}|${item.weight || 400}|${item.style || 'normal'}|${item.url || ''}`, item])).values()];
  await Promise.allSettled(unique.map((reference) => ensureFontLoaded(reference)));
}
