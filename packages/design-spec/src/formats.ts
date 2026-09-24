import type { FormatDef, LayoutClass } from './types';

/** Single source of truth for design sizes used by DesignSpec templates. */
export const FORMATS: FormatDef[] = [
  { id: 'square', label: 'Square post', width: 1080, height: 1080, kind: 'social', aspect: '1:1', videoPreset: 'square-1080' },
  { id: 'portrait-4x5', label: 'Portrait post', width: 1080, height: 1350, kind: 'social', aspect: '4:5', videoPreset: 'portrait-4x5' },
  { id: 'story', label: 'Story / Reel', width: 1080, height: 1920, kind: 'social', aspect: '9:16', videoPreset: 'portrait-1080p' },
  { id: 'linkedin', label: 'LinkedIn post', width: 1200, height: 627, kind: 'social', aspect: '1.91:1', videoPreset: 'landscape-1080p' },
  { id: 'youtube-thumb', label: 'YouTube thumbnail', width: 1280, height: 720, kind: 'web', aspect: '16:9', videoPreset: 'landscape-1080p' },
  { id: 'blog-hero', label: 'Blog hero', width: 1600, height: 900, kind: 'web', aspect: '16:9', videoPreset: 'landscape-1080p' },
  { id: 'slide-16x9', label: 'Slide 16:9', width: 1920, height: 1080, kind: 'slide', aspect: '16:9', videoPreset: 'landscape-1080p' },
  { id: 'slide-4x3', label: 'Slide 4:3', width: 1440, height: 1080, kind: 'slide', aspect: '4:3', videoPreset: 'landscape-1080p' },
  { id: 'a4', label: 'A4 print', width: 1240, height: 1754, kind: 'print', aspect: 'A', print: { widthMm: 210, heightMm: 297 }, videoPreset: 'portrait-4x5' },
  { id: 'a3', label: 'A3 print', width: 1754, height: 2480, kind: 'print', aspect: 'A', print: { widthMm: 297, heightMm: 420 }, videoPreset: 'portrait-4x5' },
  { id: 'letter', label: 'US Letter flyer', width: 1275, height: 1650, kind: 'print', aspect: '8.5:11', print: { widthMm: 215.9, heightMm: 279.4 }, videoPreset: 'portrait-4x5' },
  { id: 'poster-legacy', label: 'Classic poster', width: 800, height: 1132, kind: 'social', aspect: '4:5', videoPreset: 'portrait-4x5' },
];

const BY_ID = new Map(FORMATS.map((format) => [format.id, format]));

export function getFormat(id: string): FormatDef | undefined {
  return BY_ID.get(id);
}

export function requireFormat(id: string): FormatDef {
  const format = BY_ID.get(id);
  if (!format) throw new Error(`Unknown design format "${id}".`);
  return format;
}

export function formatForSize(width: number, height: number): FormatDef | undefined {
  return FORMATS.find((format) => format.width === width && format.height === height);
}

export function layoutClass(width: number, height: number): LayoutClass {
  const ratio = width / height;
  if (ratio > 1.15) return 'wide';
  if (ratio < 0.87) return 'tall';
  return 'square';
}
