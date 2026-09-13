import { fabric } from 'fabric';
import type { ImageEffectConfig } from '../types/editorFeatures';

export const DEFAULT_IMAGE_EFFECTS: Required<ImageEffectConfig> = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
  invert: false,
  opacity: 100,
  preset: 'Original',
};

export const IMAGE_FILTER_PRESETS: Array<{ name: string; config: ImageEffectConfig }> = [
  { name: 'Original', config: {} },
  { name: 'Vivid', config: { contrast: 18, saturation: 32, sharpness: 18 } },
  { name: 'Warm', config: { temperature: 35, saturation: 14, highlights: 8 } },
  { name: 'Cool', config: { temperature: -30, tint: -8, contrast: 8 } },
  { name: 'Cinematic', config: { contrast: 28, saturation: -8, shadows: -18, temperature: -10 } },
  { name: 'Vintage', config: { sepia: true, contrast: -8, saturation: -20, exposure: 8 } },
  { name: 'B&W', config: { grayscale: true, contrast: 18 } },
  { name: 'High Contrast', config: { contrast: 45, saturation: 8, sharpness: 25 } },
  { name: 'Soft', config: { contrast: -18, exposure: 10, blur: 2 } },
  { name: 'Moody', config: { exposure: -18, contrast: 24, saturation: -16, temperature: -12 } },
  { name: 'Retro', config: { sepia: true, tint: 18, saturation: -10, contrast: 10 } },
  { name: 'Film', config: { contrast: 12, shadows: 18, highlights: -12, saturation: -8 } },
  { name: 'Golden Hour', config: { temperature: 48, exposure: 8, saturation: 18 } },
  { name: 'Neon', config: { contrast: 32, saturation: 55, tint: 22, shadows: -12 } },
  { name: 'Pastel', config: { contrast: -22, exposure: 15, saturation: -10, highlights: 15 } },
  { name: 'Product Clean', config: { exposure: 18, contrast: 10, saturation: -5, sharpness: 28 } },
  { name: 'Portrait Glow', config: { exposure: 8, contrast: -8, highlights: 12, blur: 1 } },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const readImageEffectConfig = (image: fabric.Image | null): Required<ImageEffectConfig> => {
  if (!image) return { ...DEFAULT_IMAGE_EFFECTS };
  const saved = (
    image.get('imageEffectConfig' as keyof fabric.Image)
    || image.get('filtersConfig' as keyof fabric.Image)
  ) as ImageEffectConfig | undefined;
  if (saved) return { ...DEFAULT_IMAGE_EFFECTS, ...saved };
  const legacy = image.get('teckstudioEffects' as keyof fabric.Image) as Record<string, number> | undefined;
  if (!legacy) return { ...DEFAULT_IMAGE_EFFECTS };
  return {
    ...DEFAULT_IMAGE_EFFECTS,
    brightness: (legacy.brightness ?? 100) - 100,
    contrast: (legacy.contrast ?? 100) - 100,
    saturation: (legacy.saturate ?? 100) - 100,
    blur: (legacy.blur ?? 0) * 10,
    tint: legacy.hue ?? 0,
  };
};

export const applyImageEffectConfig = (image: fabric.Image, config: ImageEffectConfig) => {
  const normalized = { ...DEFAULT_IMAGE_EFFECTS, ...config };
  const imageFilters = fabric.Image.filters as unknown as Record<string, new (options?: Record<string, unknown>) => fabric.IBaseFilter>;
  const filters: fabric.IBaseFilter[] = [];
  const brightness = clamp((normalized.brightness + normalized.exposure * 0.7) / 100, -1, 1);
  const contrast = clamp(normalized.contrast / 100, -1, 1);
  const saturation = clamp(normalized.saturation / 100, -1, 1);

  if (brightness !== 0 && imageFilters.Brightness) filters.push(new imageFilters.Brightness({ brightness }));
  if (contrast !== 0 && imageFilters.Contrast) filters.push(new imageFilters.Contrast({ contrast }));
  if (saturation !== 0 && imageFilters.Saturation) filters.push(new imageFilters.Saturation({ saturation }));

  if (normalized.temperature !== 0 && imageFilters.BlendColor) {
    filters.push(new imageFilters.BlendColor({
      color: normalized.temperature > 0 ? '#ff8a3d' : '#4f83ff',
      mode: 'tint',
      alpha: Math.abs(normalized.temperature) / 420,
    }));
  }
  if (normalized.tint !== 0 && imageFilters.HueRotation) {
    filters.push(new imageFilters.HueRotation({ rotation: normalized.tint / 200 }));
  }
  if ((normalized.highlights !== 0 || normalized.shadows !== 0) && imageFilters.Gamma) {
    const baseGamma = clamp(1 - normalized.shadows / 180 + normalized.highlights / 300, 0.35, 2.4);
    filters.push(new imageFilters.Gamma({ gamma: [baseGamma, baseGamma, baseGamma] }));
  }
  if (normalized.sharpness > 0 && imageFilters.Convolute) {
    const amount = clamp(normalized.sharpness / 100, 0, 1);
    filters.push(new imageFilters.Convolute({
      matrix: [0, -amount, 0, -amount, 1 + amount * 4, -amount, 0, -amount, 0],
      opaque: false,
    }));
  }
  if (normalized.blur > 0 && imageFilters.Blur) {
    filters.push(new imageFilters.Blur({ blur: clamp(normalized.blur / 100, 0, 1) }));
  }
  if (normalized.grayscale && imageFilters.Grayscale) filters.push(new imageFilters.Grayscale());
  if (normalized.sepia && imageFilters.Sepia) filters.push(new imageFilters.Sepia());
  if (normalized.invert && imageFilters.Invert) filters.push(new imageFilters.Invert());

  image.filters = filters;
  image.set({
    imageEffectConfig: normalized,
    filtersConfig: normalized,
    teckstudioEffects: {
      brightness: normalized.brightness + 100,
      contrast: normalized.contrast + 100,
      saturate: normalized.saturation + 100,
      blur: normalized.blur / 10,
      hue: normalized.tint,
    },
    opacity: clamp(normalized.opacity / 100, 0, 1),
  } as Record<string, unknown>);
  image.applyFilters();
  image.setCoords();
};
