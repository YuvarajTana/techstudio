import { getTheme } from "@teckstudio/design-spec";
import type { CreativeVideoSpec } from "@teckstudio/lesson-video";

export interface SceneTheme {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  onAccent: string;
  heading: string;
  body: string;
  mono: string;
  themed: boolean;
}

/** Without `style`, reproduce the original paper look exactly. */
export function sceneTheme(spec: CreativeVideoSpec): SceneTheme {
  const theme = spec.style ? getTheme(spec.style.themeId) : undefined;
  if (!theme) {
    return {
      background: "#f7f5ef",
      surface: "white",
      border: "#dadbd8",
      text: spec.brand.primaryColor,
      muted: spec.brand.primaryColor,
      primary: spec.brand.primaryColor,
      accent: spec.brand.accentColor,
      onAccent: "white",
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
      mono: '"JetBrains Mono", monospace',
      themed: false,
    };
  }
  const font = (family: string, fallback: string) => `"${family}", ${fallback}`;
  return {
    background: theme.color.background,
    surface: theme.color.surface,
    border: theme.color.border,
    text: theme.color.text,
    muted: theme.color.muted,
    primary: spec.brand.primaryColor,
    accent: spec.brand.accentColor,
    onAccent: theme.color.onPrimary,
    heading: font(theme.font.heading.family, theme.font.heading.fallback),
    body: font(theme.font.body.family, theme.font.body.fallback),
    mono: font(theme.font.mono.family, theme.font.mono.fallback),
    themed: true,
  };
}

/** Font families (and weights) a spec needs loaded before rendering. */
export function requiredFonts(spec: CreativeVideoSpec): { family: string; weight: number }[] {
  const families = new Set(["Inter"]);
  const theme = spec.style ? getTheme(spec.style.themeId) : undefined;
  if (theme) [theme.font.heading, theme.font.body, theme.font.mono].forEach((ref) => families.add(ref.family));
  if (spec.scenes.some((scene) => scene.type === "code")) families.add("JetBrains Mono");
  const weights: Record<string, number[]> = { Inter: [400, 600, 700], Outfit: [400, 600, 700, 800], "JetBrains Mono": [400, 700], "Playfair Display": [400, 700] };
  return [...families].flatMap((family) => (weights[family] ?? [400, 700]).map((weight) => ({ family, weight })));
}

/**
 * Layout stage. Scenes are laid out on a stage whose size matches the
 * original landscape/portrait designs, then scaled to the output. For the
 * two original presets the scale is exactly 1.
 */
export function stageFor(width: number, height: number): { width: number; height: number; portrait: boolean; scale: number } {
  const ratio = width / height;
  if (ratio > 1.2) return { width: 1920, height: 1920 / ratio, portrait: false, scale: width / 1920 };
  if (ratio < 0.7) return { width: 1080, height: 1080 / ratio, portrait: true, scale: width / 1080 };
  if (ratio >= 0.95) return { width: 1440, height: 1440 / ratio, portrait: false, scale: width / 1440 };
  return { width: 1296, height: 1296 / ratio, portrait: true, scale: width / 1296 };
}
