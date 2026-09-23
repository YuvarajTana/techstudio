/**
 * DesignSpec: one data-driven description of a poster (1 page) or slide deck
 * (N pages). Layout families turn a page's slot values into positioned
 * primitives; adapters turn primitives into Fabric objects (editor) and pages
 * into creative-video scenes (Remotion).
 */

export type FormatKind = 'social' | 'print' | 'slide' | 'video' | 'web';
export type LayoutClass = 'wide' | 'tall' | 'square';
export type VideoPresetId = 'landscape-1080p' | 'portrait-1080p' | 'square-1080' | 'portrait-4x5';

export interface FormatDef {
  id: string;
  label: string;
  width: number;
  height: number;
  kind: FormatKind;
  aspect: string;
  /** Physical size for print PDF export. */
  print?: { widthMm: number; heightMm: number };
  /** Closest creative-video output preset. */
  videoPreset: VideoPresetId;
}

export interface FontRef {
  family: string;
  /** Generic CSS fallback appended to the family. */
  fallback: 'sans-serif' | 'serif' | 'monospace';
}

export interface ThemeTokens {
  id: string;
  label: string;
  mode: 'light' | 'dark';
  vertical: 'tech' | 'real-estate' | 'generic';
  color: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
    accent: string;
    /** Text drawn on top of `primary`. */
    onPrimary: string;
  };
  font: { heading: FontRef; body: FontRef; mono: FontRef };
  radius: number;
  decoration: 'none' | 'grid' | 'glow' | 'rule';
}

export interface IconDef {
  set: 'tabler' | 'simple-icons';
  slug: string;
  style: 'stroke' | 'fill';
  viewBox: string;
  paths: string[];
  license: string;
  trademark: boolean;
  title?: string;
  hex?: string;
  attribution?: string;
}

// ---------------------------------------------------------------------------
// Slot values
// ---------------------------------------------------------------------------

export interface ImageValue {
  /** URL (http(s), /media/..., blob: or data:). Empty means "placeholder". */
  src: string;
  alt?: string;
  credit?: string;
}
export interface CardValue {
  title: string;
  body?: string;
  icon?: string;
}
export interface StatValue {
  value: string;
  label: string;
}
export interface FactsValue {
  beds?: number;
  baths?: number;
  sqft?: number;
  lot?: string;
  parking?: number;
}
export interface CodeValue {
  language: 'python' | 'javascript' | 'typescript' | 'sql' | 'bash' | 'json' | 'text';
  source: string;
}
export interface FlowValue {
  nodes: { id: string; label: string; icon?: string }[];
  edges: { from: string; to: string; label?: string }[];
}
export interface SideValue {
  title: string;
  points: string[];
}
export interface AgentValue {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
}

export type SlotValue =
  | string
  | string[]
  | ImageValue
  | ImageValue[]
  | CardValue[]
  | StatValue[]
  | FactsValue
  | CodeValue
  | FlowValue
  | SideValue
  | AgentValue;

export type SlotKind =
  | 'text'
  | 'list'
  | 'image'
  | 'images'
  | 'cards'
  | 'stats'
  | 'facts'
  | 'code'
  | 'flow'
  | 'side'
  | 'agent';

export interface SlotDef {
  name: string;
  kind: SlotKind;
  label: string;
  required?: boolean;
  /** Only required in these variants (overrides `required`). */
  requiredIn?: string[];
  maxChars?: number;
  minItems?: number;
  maxItems?: number;
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface DesignBrand {
  name?: string;
  logo?: ImageValue;
  primaryColor?: string;
  accentColor?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface DesignPage {
  id: string;
  layout: string;
  variant?: string;
  slots: Record<string, SlotValue | undefined>;
  /** Speaker notes; become narration text when a deck is turned into video. */
  notes?: string;
  video?: { durationFrames?: number };
}

export interface DesignSpec {
  schema: 'design-spec/v1';
  id: string;
  title: string;
  format: string;
  theme: string;
  brand?: DesignBrand;
  pages: DesignPage[];
}

// ---------------------------------------------------------------------------
// Layout primitives (absolute pixels in the target format)
// ---------------------------------------------------------------------------

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PrimitiveBase {
  id: string;
  /** Semantic role, e.g. "title", "card-body", "background". */
  role: string;
  /** Slot this object edits, e.g. "cards.2.title". */
  slot?: string;
  box: Box;
  opacity?: number;
}

export type Primitive =
  | (PrimitiveBase & {
      type: 'rect';
      fill: string;
      radius?: number;
      stroke?: string;
      strokeWidth?: number;
    })
  | (PrimitiveBase & {
      type: 'text';
      text: string;
      font: 'heading' | 'body' | 'mono';
      size: number;
      minSize: number;
      weight: number;
      color: string;
      align: 'left' | 'center' | 'right';
      lineHeight: number;
      uppercase?: boolean;
      letterSpacing?: number;
    })
  | (PrimitiveBase & {
      type: 'image';
      src: string;
      fit: 'cover' | 'contain';
      radius?: number;
      placeholderFill: string;
      placeholderText: string;
    })
  | (PrimitiveBase & { type: 'icon'; icon: string; color: string })
  | (PrimitiveBase & {
      type: 'line';
      points: [number, number, number, number];
      stroke: string;
      strokeWidth: number;
      arrow?: boolean;
      dash?: number[];
    });

export interface LayoutContext {
  format: FormatDef;
  theme: ThemeTokens;
  page: DesignPage;
  brand?: DesignBrand;
  pageIndex: number;
  pageCount: number;
}

export interface LayoutFamily {
  id: string;
  label: string;
  vertical: 'tech' | 'real-estate' | 'generic';
  description: string;
  variants: string[];
  slots: SlotDef[];
  layout(ctx: LayoutContext): Primitive[];
}
