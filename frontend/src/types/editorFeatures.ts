export type StickerFileType = 'svg' | 'png' | 'webp';

export type StickerItem = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  sourceUrl: string;
  fileType: StickerFileType;
  width?: number;
  height?: number;
  isPremium: boolean;
  isFeatured?: boolean;
  createdAt?: string;
};

export type FontSource = 'built-in' | 'premium' | 'brand' | 'uploaded';

export type FontItem = {
  id: string;
  family: string;
  displayName: string;
  category: string;
  source: FontSource;
  url?: string;
  weights: number[];
  styles: Array<'normal' | 'italic'>;
  isPremium: boolean;
  isVariable?: boolean;
  licence?: string;
  previewText?: string;
};

export type TextEffectType =
  | 'none'
  | 'shadow'
  | 'lift'
  | 'hollow'
  | 'outline'
  | 'splice'
  | 'echo'
  | 'glitch'
  | 'neon'
  | 'glow'
  | 'gradient'
  | 'background'
  | 'curve'
  | 'threeD';

export type TextEffectConfig = {
  type: TextEffectType;
  settings: Record<string, unknown>;
};

export type ImageEffectConfig = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  exposure?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
  sharpness?: number;
  blur?: number;
  grayscale?: boolean;
  sepia?: boolean;
  invert?: boolean;
  opacity?: number;
  preset?: string;
};

export type ProcessedImageMetadata = {
  originalImageUrl?: string;
  processedImageUrl?: string;
  personMaskUrl?: string;
  operation?: string;
  provider?: string;
  processedAt?: string;
};
