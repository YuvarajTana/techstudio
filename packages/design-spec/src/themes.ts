import { font } from './fonts';
import type { ThemeTokens } from './types';

type Palette = ThemeTokens['color'];

function tech(id: string, label: string, mode: ThemeTokens['mode'], color: Palette, decoration: ThemeTokens['decoration'] = 'glow'): ThemeTokens {
  return { id, label, mode, vertical: 'tech', color, font: { heading: font.outfit, body: font.inter, mono: font.mono }, radius: 22, decoration };
}

/**
 * Theme tokens. The first eight mirror POSTER_SPEC_THEMES in
 * frontend/src/utils/posterSpecRenderer.ts so migrated templates keep their look.
 */
export const THEMES: ThemeTokens[] = [
  tech('tech-blue', 'Tech Blue', 'dark', { background: '#07111f', surface: '#10223a', surfaceAlt: '#0b1728', border: '#255f9f', text: '#f8fafc', muted: '#a9bdd5', primary: '#38bdf8', accent: '#22d3ee', onPrimary: '#04121f' }, 'grid'),
  tech('purple-ai', 'Purple AI', 'dark', { background: '#12071f', surface: '#281442', surfaceAlt: '#1b0c2d', border: '#7c3aed', text: '#fff7ff', muted: '#d8c7e8', primary: '#c084fc', accent: '#f472b6', onPrimary: '#1a0628' }),
  tech('minimal-light', 'Minimal Light', 'light', { background: '#f8fafc', surface: '#ffffff', surfaceAlt: '#f1f5f9', border: '#cbd5e1', text: '#0f172a', muted: '#475569', primary: '#2563eb', accent: '#0f766e', onPrimary: '#ffffff' }, 'rule'),
  tech('corporate-navy', 'Corporate Navy', 'dark', { background: '#071326', surface: '#132a4f', surfaceAlt: '#0b1a33', border: '#355c8f', text: '#f8fafc', muted: '#bdd2ea', primary: '#7dd3fc', accent: '#dbeafe', onPrimary: '#071326' }, 'rule'),
  tech('black-gold', 'Black and Gold', 'dark', { background: '#070707', surface: '#1f1a0f', surfaceAlt: '#111111', border: '#a16207', text: '#fffbea', muted: '#d6c7a1', primary: '#fbbf24', accent: '#fde68a', onPrimary: '#140f02' }, 'rule'),
  tech('green-growth', 'Green Growth', 'dark', { background: '#06140f', surface: '#123526', surfaceAlt: '#0b2018', border: '#15803d', text: '#f0fdf4', muted: '#b7d8c5', primary: '#34d399', accent: '#a7f3d0', onPrimary: '#03140c' }),
  tech('orange-energy', 'Orange Energy', 'dark', { background: '#1c0b05', surface: '#451a08', surfaceAlt: '#281006', border: '#ea580c', text: '#fff7ed', muted: '#f3c6a6', primary: '#fb923c', accent: '#fed7aa', onPrimary: '#1c0b05' }),
  tech('neon-future', 'Neon Future', 'dark', { background: '#050816', surface: '#131a3f', surfaceAlt: '#070b1e', border: '#06b6d4', text: '#f8fafc', muted: '#b8c7e0', primary: '#22d3ee', accent: '#e879f9', onPrimary: '#050816' }, 'grid'),
  {
    id: 'estate-classic', label: 'Estate Classic', mode: 'light', vertical: 'real-estate',
    color: { background: '#f7f3ec', surface: '#ffffff', surfaceAlt: '#efe7da', border: '#d9ccb6', text: '#1c2733', muted: '#5b6672', primary: '#1f3a5f', accent: '#b88a44', onPrimary: '#ffffff' },
    font: { heading: font.playfair, body: font.inter, mono: font.mono }, radius: 6, decoration: 'rule',
  },
  {
    id: 'estate-modern', label: 'Estate Modern', mode: 'light', vertical: 'real-estate',
    color: { background: '#ffffff', surface: '#f4f6f6', surfaceAlt: '#e7ecec', border: '#d3dada', text: '#141b1f', muted: '#56636a', primary: '#0f766e', accent: '#f59e0b', onPrimary: '#ffffff' },
    font: { heading: font.outfit, body: font.inter, mono: font.mono }, radius: 16, decoration: 'none',
  },
  {
    id: 'estate-luxe', label: 'Estate Luxe', mode: 'dark', vertical: 'real-estate',
    color: { background: '#0e0e0f', surface: '#1a1a1c', surfaceAlt: '#232326', border: '#3a3326', text: '#f6f1e7', muted: '#bdb4a3', primary: '#c9a45c', accent: '#e8d5a8', onPrimary: '#16130c' },
    font: { heading: font.playfair, body: font.inter, mono: font.mono }, radius: 2, decoration: 'rule',
  },
  // Indian festive and business palettes.
  {
    id: 'marigold', label: 'Marigold', mode: 'light', vertical: 'festival',
    color: { background: '#fff8ec', surface: '#ffffff', surfaceAlt: '#ffeccc', border: '#f2c27b', text: '#3b1a0b', muted: '#7a4524', primary: '#c2410c', accent: '#d97706', onPrimary: '#ffffff' },
    font: { heading: font.playfair, body: font.inter, mono: font.mono }, radius: 18, decoration: 'toran',
  },
  {
    id: 'diwali-night', label: 'Diwali Night', mode: 'dark', vertical: 'festival',
    color: { background: '#140a2b', surface: '#241347', surfaceAlt: '#1b0e38', border: '#8a5a12', text: '#fff7e6', muted: '#e3d2ad', primary: '#f5b301', accent: '#ff8a3d', onPrimary: '#1a0f00' },
    font: { heading: font.playfair, body: font.inter, mono: font.mono }, radius: 18, decoration: 'mandala',
  },
  {
    id: 'rangoli', label: 'Rangoli', mode: 'light', vertical: 'festival',
    color: { background: '#fff5fa', surface: '#ffffff', surfaceAlt: '#fde3f0', border: '#f2a7cb', text: '#2b0f2c', muted: '#6b3a64', primary: '#be185d', accent: '#0f766e', onPrimary: '#ffffff' },
    font: { heading: font.outfit, body: font.inter, mono: font.mono }, radius: 22, decoration: 'kolam',
  },
  {
    id: 'kasavu', label: 'Kasavu', mode: 'light', vertical: 'festival',
    color: { background: '#fbf7ea', surface: '#fffdf5', surfaceAlt: '#f3ead0', border: '#c9a227', text: '#1f2a1a', muted: '#55604a', primary: '#1d5b25', accent: '#b8901c', onPrimary: '#ffffff' },
    font: { heading: font.playfair, body: font.inter, mono: font.mono }, radius: 10, decoration: 'kasavu',
  },
  {
    id: 'shaadi-maroon', label: 'Shaadi Maroon', mode: 'dark', vertical: 'events',
    color: { background: '#3d0a17', surface: '#561226', surfaceAlt: '#2e0711', border: '#b8913f', text: '#fff4e0', muted: '#ecd3a9', primary: '#e6b450', accent: '#f59e7b', onPrimary: '#2a0710' },
    font: { heading: font.playfair, body: font.inter, mono: font.mono }, radius: 14, decoration: 'mandala',
  },
  {
    id: 'tiranga', label: 'Tiranga', mode: 'light', vertical: 'festival',
    color: { background: '#ffffff', surface: '#f8fafc', surfaceAlt: '#eef2f7', border: '#cbd5e1', text: '#0b1f4d', muted: '#40506b', primary: '#d4600a', accent: '#138808', onPrimary: '#ffffff' },
    font: { heading: font.outfit, body: font.inter, mono: font.mono }, radius: 16, decoration: 'tiranga',
  },
  {
    id: 'bazaar', label: 'Bazaar Bold', mode: 'light', vertical: 'business',
    color: { background: '#fffbea', surface: '#ffffff', surfaceAlt: '#fff1b8', border: '#facc15', text: '#1c1917', muted: '#57534e', primary: '#dc2626', accent: '#ca8a04', onPrimary: '#ffffff' },
    font: { heading: font.outfit, body: font.inter, mono: font.mono }, radius: 20, decoration: 'rule',
  },
];

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));
export const THEME_IDS = THEMES.map((theme) => theme.id);

export function getTheme(id: string): ThemeTokens | undefined {
  return BY_ID.get(id);
}

export function requireTheme(id: string): ThemeTokens {
  const theme = BY_ID.get(id);
  if (!theme) throw new Error(`Unknown design theme "${id}".`);
  return theme;
}

/** Apply brand colours on top of a theme without mutating it. */
export function themeWithBrand(theme: ThemeTokens, brand?: { primaryColor?: string; accentColor?: string }): ThemeTokens {
  if (!brand?.primaryColor && !brand?.accentColor) return theme;
  const hex = /^#[0-9a-f]{6}$/i;
  return {
    ...theme,
    color: {
      ...theme.color,
      primary: brand.primaryColor && hex.test(brand.primaryColor) ? brand.primaryColor : theme.color.primary,
      accent: brand.accentColor && hex.test(brand.accentColor) ? brand.accentColor : theme.color.accent,
      onPrimary: brand.primaryColor && hex.test(brand.primaryColor) ? readableOn(brand.primaryColor) : theme.color.onPrimary,
    },
  };
}

/** Black or white, whichever contrasts more with the given colour. */
export function readableOn(hexColor: string): string {
  const value = hexColor.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#0b0f14' : '#ffffff';
}
