import type { FontRef } from './types';

export interface FontFamilyDef {
  family: string;
  fallback: FontRef['fallback'];
  /** @fontsource package that bundles the files (OFL-1.1). */
  fontsource: string;
  weights: number[];
  license: 'OFL-1.1';
}

/** Fonts that DesignSpec themes may reference. All are self-hosted via @fontsource. */
export const FONT_FAMILIES: FontFamilyDef[] = [
  { family: 'Inter', fallback: 'sans-serif', fontsource: '@fontsource/inter', weights: [400, 600, 700], license: 'OFL-1.1' },
  { family: 'Outfit', fallback: 'sans-serif', fontsource: '@fontsource/outfit', weights: [400, 600, 700, 800], license: 'OFL-1.1' },
  { family: 'JetBrains Mono', fallback: 'monospace', fontsource: '@fontsource/jetbrains-mono', weights: [400, 700], license: 'OFL-1.1' },
  { family: 'Playfair Display', fallback: 'serif', fontsource: '@fontsource/playfair-display', weights: [400, 700], license: 'OFL-1.1' },
];

export const font = {
  inter: { family: 'Inter', fallback: 'sans-serif' } as FontRef,
  outfit: { family: 'Outfit', fallback: 'sans-serif' } as FontRef,
  mono: { family: 'JetBrains Mono', fallback: 'monospace' } as FontRef,
  playfair: { family: 'Playfair Display', fallback: 'serif' } as FontRef,
};

export function cssFontStack(ref: FontRef): string {
  return `"${ref.family}", ${ref.fallback}`;
}
