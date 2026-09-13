import { fabric } from 'fabric';
import {
  ROUNDED_BOLD_HIGHLIGHT_PRESET_ID,
  type TextPreset,
} from '../config/textPresets';
import { ensureFontLoaded, type FontReference } from './fontLoader';
import {
  captureTextSelection,
  isEditableTextObject,
  type EditableTextObject,
  type TextSelectionRange,
} from './textSelectionStyles';

export type HighlightRange = {
  start: number;
  end: number;
};

export type RoundedHighlightConfig = {
  primaryColor: string;
  highlightColor: string;
  ranges: HighlightRange[];
};

const DEFAULT_CONFIG: RoundedHighlightConfig = {
  primaryColor: '#F5F2E8',
  highlightColor: '#E3A83B',
  ranges: [],
};

const BUILT_IN_FONT_LICENCE = 'SIL Open Font License 1.1';

const FONT_CANDIDATES: FontReference[] = [
  { id: 'font_fredoka', family: 'Fredoka', source: 'built-in', weight: 700, style: 'normal', licence: BUILT_IN_FONT_LICENCE },
  { id: 'font_baloo_2', family: 'Baloo 2', source: 'built-in', weight: 700, style: 'normal', licence: BUILT_IN_FONT_LICENCE },
  { id: 'font_nunito', family: 'Nunito', source: 'built-in', weight: 700, style: 'normal', licence: BUILT_IN_FONT_LICENCE },
  { id: 'font_m_plus_rounded', family: 'M PLUS Rounded 1c', source: 'built-in', weight: 700, style: 'normal', licence: BUILT_IN_FONT_LICENCE },
  { id: 'font_arial_rounded', family: 'Arial Rounded MT Bold', source: 'built-in', weight: 700, style: 'normal', licence: 'System font; not redistributed' },
];

const boundedRange = (range: HighlightRange, length: number): HighlightRange | null => {
  const start = Math.max(0, Math.min(length, Math.floor(range.start)));
  const end = Math.max(start, Math.min(length, Math.floor(range.end)));
  return end > start ? { start, end } : null;
};

const collectHighlightRanges = (object: EditableTextObject, fill: string) => {
  const length = object.text?.length || 0;
  if (!length || !object.getSelectionStyles) return [];
  const styles = object.getSelectionStyles(0, length, false);
  const ranges: HighlightRange[] = [];
  let start = -1;

  styles.forEach((style, index) => {
    const matches = style.fill === fill;
    if (matches && start < 0) start = index;
    if (!matches && start >= 0) {
      ranges.push({ start, end: index });
      start = -1;
    }
  });
  if (start >= 0) ranges.push({ start, end: length });
  return ranges;
};

export const isRoundedHighlightText = (
  object: fabric.Object | null | undefined,
): object is EditableTextObject => (
  isEditableTextObject(object)
  && object.get('stylePresetId' as keyof fabric.Object) === ROUNDED_BOLD_HIGHLIGHT_PRESET_ID
);

export const readRoundedHighlightConfig = (
  object: fabric.Object | null | undefined,
): RoundedHighlightConfig => {
  if (!isRoundedHighlightText(object)) return { ...DEFAULT_CONFIG, ranges: [] };
  const stored = object.get('highlightPresetConfig' as keyof fabric.Object);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_CONFIG, ranges: [] };
  const config = stored as Partial<RoundedHighlightConfig>;
  return {
    primaryColor: typeof config.primaryColor === 'string' ? config.primaryColor : DEFAULT_CONFIG.primaryColor,
    highlightColor: typeof config.highlightColor === 'string' ? config.highlightColor : DEFAULT_CONFIG.highlightColor,
    ranges: Array.isArray(config.ranges)
      ? config.ranges.map((range) => boundedRange(range, object.text?.length || 0)).filter(Boolean) as HighlightRange[]
      : [],
  };
};

export const roundedHighlightLayerName = (text: string) => {
  const compact = text.replace(/\s+/g, ' ').trim() || 'Untitled';
  const label = compact.length > 44 ? `${compact.slice(0, 43)}…` : compact;
  return `Text – ${label}`;
};

export const updateRoundedHighlightLayerName = (object: fabric.Object | null | undefined) => {
  if (!isRoundedHighlightText(object)) return false;
  object.set('name', roundedHighlightLayerName(object.text || ''));
  return true;
};

export const synchronizeRoundedHighlightText = (
  object: fabric.Object | null | undefined,
) => {
  if (!isRoundedHighlightText(object)) return false;
  const config = readRoundedHighlightConfig(object);
  const ranges = collectHighlightRanges(object, config.highlightColor);

  object.set({
    fill: config.primaryColor,
    highlightPresetConfig: { ...config, ranges },
    name: roundedHighlightLayerName(object.text || ''),
  } as fabric.ITextboxOptions & Record<string, unknown>);
  object.initDimensions?.();
  object.setCoords();
  object.canvas?.requestRenderAll();
  return true;
};

export const setRoundedPrimaryColor = (object: fabric.Object, color: string) => {
  if (!isRoundedHighlightText(object)) return false;
  const config = readRoundedHighlightConfig(object);
  object.set({
    fill: color,
    highlightPresetConfig: { ...config, primaryColor: color },
  } as fabric.ITextboxOptions & Record<string, unknown>);
  synchronizeRoundedHighlightText(object);
  return true;
};

export const setRoundedHighlightColor = (
  object: fabric.Object,
  color: string,
  selectedRange?: TextSelectionRange | null,
) => {
  if (!isRoundedHighlightText(object)) return false;
  const config = readRoundedHighlightConfig(object);
  const range = selectedRange && selectedRange.end > selectedRange.start
    ? boundedRange(selectedRange, object.text?.length || 0)
    : null;
  if (!range) return false;
  object.setSelectionStyles?.({ fill: color }, range.start, range.end);
  const ranges = [...config.ranges, range]
    .map((item) => boundedRange(item, object.text?.length || 0))
    .filter(Boolean) as HighlightRange[];
  const nextConfig: RoundedHighlightConfig = { ...config, highlightColor: color, ranges };
  object.set('highlightPresetConfig' as keyof fabric.Object, nextConfig);
  synchronizeRoundedHighlightText(object);
  return true;
};

export const trackManualRoundedHighlightColorEdit = (
  object: fabric.Object | null | undefined,
  range: TextSelectionRange | null | undefined,
  color: unknown,
) => {
  if (!isRoundedHighlightText(object) || typeof color !== 'string') return;
  const config = readRoundedHighlightConfig(object);
  if (!range || range.end <= range.start) {
    object.set('highlightPresetConfig' as keyof fabric.Object, {
      ...config,
      primaryColor: color,
    });
    return;
  }
  const ranges = config.ranges.filter((item) => (
    range.end <= item.start || range.start >= item.end || color === config.highlightColor
  ));
  object.set('highlightPresetConfig' as keyof fabric.Object, {
    ...config,
    ranges,
  });
};

export async function resolveRoundedHighlightFont() {
  for (const reference of FONT_CANDIDATES) {
    try {
      await ensureFontLoaded(reference);
      await document.fonts.ready;
      if (document.fonts.check(`normal ${reference.weight || 700} 16px "${reference.family}"`)) {
        return reference;
      }
    } catch {
      // Continue to the next configured rounded-font fallback.
    }
  }
  return {
    id: 'font_rounded_fallback',
    family: 'sans-serif',
    source: 'built-in',
    weight: 700,
    style: 'normal',
    licence: 'Browser generic font fallback',
  } satisfies FontReference;
}

export async function createRoundedHighlightText(canvas: fabric.Canvas, preset: TextPreset) {
  const fontReference = await resolveRoundedHighlightFont();
  const canvasWidth = canvas.getWidth() || 800;
  const canvasHeight = canvas.getHeight() || 800;
  const fontSize = Math.round(Math.min(
    preset.maxFontSize || 160,
    Math.max(preset.minFontSize || 42, canvasWidth * (preset.fontSizeRatio || 0.1)),
  ));
  const charSpacing = preset.letterSpacingPx
    ? Math.round((preset.letterSpacingPx / fontSize) * 1000)
    : preset.charSpacing || 0;
  const object = new fabric.IText(preset.text, {
    id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `text_${Date.now()}`,
    name: roundedHighlightLayerName(preset.text),
    objectType: 'text',
    textRole: 'heading',
    stylePresetId: preset.id,
    highlightPresetConfig: {
      primaryColor: preset.fill,
      highlightColor: preset.highlightColor || DEFAULT_CONFIG.highlightColor,
      ranges: [],
    },
    fontId: fontReference.id,
    fontSource: fontReference.source,
    fontLicence: fontReference.licence,
    fontReferences: [fontReference],
    fontFamily: fontReference.family,
    fontSize,
    fontWeight: preset.fontWeight,
    fontStyle: preset.fontStyle || 'normal',
    fill: preset.fill,
    textAlign: preset.textAlign,
    charSpacing,
    lineHeight: preset.lineHeight || 1,
    stroke: preset.stroke || undefined,
    strokeWidth: preset.strokeWidth || 0,
    shadow: preset.shadow ? new fabric.Shadow(preset.shadow) : undefined,
    originX: 'center',
    originY: 'center',
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    opacity: 1,
    editable: true,
    objectCaching: false,
  } as fabric.ITextOptions & Record<string, unknown>);
  synchronizeRoundedHighlightText(object);
  object.setCoords();
  return object;
}

const removeCharacterTypographyOverrides = (object: EditableTextObject) => {
  const styles = object.styles as Record<string, Record<string, Record<string, unknown>>> | undefined;
  if (!styles) return;
  Object.values(styles).forEach((line) => {
    Object.values(line).forEach((character) => {
      delete character.fontFamily;
      delete character.fontWeight;
      delete character.fontStyle;
    });
  });
};

export async function applyRoundedHighlightPresetToText(
  canvas: fabric.Canvas,
  object: fabric.Object,
  preset: TextPreset,
) {
  if (!isEditableTextObject(object)) return null;
  const fontReference = await resolveRoundedHighlightFont();
  if (!canvas.contains(object)) return null;

  const center = object.getCenterPoint();
  const width = object.type === 'textbox' ? object.width : undefined;
  const existingConfig = isRoundedHighlightText(object)
    ? readRoundedHighlightConfig(object)
    : null;

  removeCharacterTypographyOverrides(object);
  object.set({
    stylePresetId: preset.id,
    textRole: 'heading',
    highlightPresetConfig: {
      primaryColor: preset.fill,
      highlightColor: existingConfig?.highlightColor || preset.highlightColor || DEFAULT_CONFIG.highlightColor,
      ranges: existingConfig?.ranges || [],
    },
    fontId: fontReference.id,
    fontSource: fontReference.source,
    fontLicence: fontReference.licence,
    fontReferences: [fontReference],
    fontFamily: fontReference.family,
    fontWeight: preset.fontWeight,
    fontStyle: preset.fontStyle || 'normal',
    fill: preset.fill,
    charSpacing: preset.letterSpacingPx
      ? Math.round((preset.letterSpacingPx / Math.max(1, object.fontSize || preset.fontSize)) * 1000)
      : preset.charSpacing || 0,
    lineHeight: preset.lineHeight || 1,
    editable: true,
    objectCaching: false,
    ...(typeof width === 'number' ? { width } : {}),
  } as fabric.ITextboxOptions & Record<string, unknown>);
  object.initDimensions?.();
  object.setPositionByOrigin(center, 'center', 'center');
  synchronizeRoundedHighlightText(object);
  object.setCoords();
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  return object;
}

export const selectedRoundedHighlightRange = (
  object: fabric.Object | null | undefined,
  fallbackRange?: TextSelectionRange | null,
) => {
  if (!isRoundedHighlightText(object)) return null;
  return captureTextSelection(object) || fallbackRange || null;
};
