import { fabric } from 'fabric';
import { convertPosterTextRegion } from '../services/uploadsApi';
import type {
  PosterAnalysisResult,
  PosterColourRegion,
  PosterReferenceMode,
  PosterTextBlock,
} from '../types/uploads';
import { ensureFontLoaded } from './fontLoader';
import { enterInlineTextEditing, isEditableTextObject } from './textSelectionStyles';

type NormalizedBox = PosterTextBlock['normalized_bounding_box'];
type PosterTextOverrides = {
  text?: string;
  fontFamily?: string;
  fill?: string;
};

const createObjectId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
);

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const element = new Image();
  element.crossOrigin = 'anonymous';
  element.decoding = 'async';
  element.onload = () => resolve(element);
  element.onerror = () => reject(new Error('A generated poster asset could not be loaded.'));
  element.src = source;
});

const readString = (object: fabric.Object | null | undefined, key: string) => {
  const value = object?.get(key as keyof fabric.Object);
  return typeof value === 'string' ? value : '';
};

const readStringArray = (object: fabric.Object, key: string) => {
  const value = object.get(key as keyof fabric.Object);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const readTextBlock = (object: fabric.Object | null | undefined) => {
  const value = object?.get('posterTextBlock' as keyof fabric.Object);
  return value && typeof value === 'object' ? value as PosterTextBlock : null;
};

const readTextBlocks = (object: fabric.Object) => {
  const value = object.get('posterOcrRegions' as keyof fabric.Object);
  return Array.isArray(value) ? value as PosterTextBlock[] : [];
};

const naturalDimensions = (source: fabric.Image) => ({
  width: Math.max(1, Number(source.get('naturalWidth' as keyof fabric.Object)) || source.width || 1),
  height: Math.max(1, Number(source.get('naturalHeight' as keyof fabric.Object)) || source.height || 1),
});

const roleLabel = (block: Pick<PosterTextBlock, 'role'>) => {
  const role = block.role || 'body';
  const labels: Record<string, string> = {
    heading: 'Main Heading',
    subheading: 'Subtitle Text',
    body: 'Body Text',
    caption: 'Caption Text',
    label: 'Label Text',
    footer: 'Footer Text',
  };
  return labels[role] || 'Editable Text';
};

const readableSnippet = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 48);

export const normalizedBoxToSourceBox = (source: fabric.Image, box: NormalizedBox) => {
  const natural = naturalDimensions(source);
  return {
    x: box.x * natural.width,
    y: box.y * natural.height,
    width: box.width * natural.width,
    height: box.height * natural.height,
  };
};

export const mapNormalizedBoxToCanvas = (source: fabric.Image, normalizedBox: NormalizedBox) => {
  const box = normalizedBoxToSourceBox(source, normalizedBox);
  const cropX = source.cropX || 0;
  const cropY = source.cropY || 0;
  const visibleWidth = source.width || naturalDimensions(source).width;
  const visibleHeight = source.height || naturalDimensions(source).height;
  const localCenter = new fabric.Point(
    box.x + box.width / 2 - cropX - visibleWidth / 2,
    box.y + box.height / 2 - cropY - visibleHeight / 2,
  );
  const matrix = source.calcTransformMatrix();
  const center = fabric.util.transformPoint(localCenter, matrix);
  const transform = fabric.util.qrDecompose(matrix);
  return { box, center, transform };
};

const sourceTransformSnapshot = (source: fabric.Image) => {
  const natural = naturalDimensions(source);
  return {
    left: source.left,
    top: source.top,
    originX: source.originX,
    originY: source.originY,
    angle: source.angle,
    scaleX: source.scaleX,
    scaleY: source.scaleY,
    skewX: source.skewX,
    skewY: source.skewY,
    flipX: source.flipX,
    flipY: source.flipY,
    cropX: source.cropX,
    cropY: source.cropY,
    width: source.width,
    height: source.height,
    naturalWidth: natural.width,
    naturalHeight: natural.height,
  };
};

const findPosterSource = (canvas: fabric.Canvas, conversionId: string) => (
  canvas.getObjects().find((object) => (
    readString(object, 'posterConversionId') === conversionId
    && readString(object, 'posterConversionRole') === 'source'
  )) as fabric.Image | undefined
);

const createHotspot = (
  source: fabric.Image,
  block: PosterTextBlock,
  conversionId: string,
  sourceAssetId: string,
) => {
  const { box, center, transform } = mapNormalizedBoxToCanvas(source, block.normalized_bounding_box);
  return new fabric.Rect({
    id: createObjectId('ocr-hotspot'),
    name: `Editable region – “${block.text.replace(/\s+/g, ' ').slice(0, 48)}”`,
    objectType: 'editable-import-hotspot',
    posterConversionId: conversionId,
    posterConversionRole: 'ocr-hotspot',
    posterRegionId: block.id,
    posterTextBlockId: block.id,
    posterTextBlock: block,
    posterSourceAssetId: sourceAssetId,
    posterNormalizedBoundingBox: block.normalized_bounding_box,
    left: center.x,
    top: center.y,
    originX: 'center',
    originY: 'center',
    width: box.width,
    height: box.height,
    scaleX: Math.abs(transform.scaleX),
    scaleY: Math.abs(transform.scaleY),
    angle: transform.angle + block.style.rotation,
    fill: 'rgba(0,0,0,0)',
    stroke: 'rgba(139,92,246,0)',
    strokeWidth: 2,
    strokeUniform: true,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hoverCursor: 'pointer',
    excludeFromExport: true,
    excludeFromLayers: true,
    editorOnly: true,
  } as fabric.IRectOptions);
};

const ensureHotspot = (
  canvas: fabric.Canvas,
  source: fabric.Image,
  block: PosterTextBlock,
  conversionId: string,
) => {
  const current = canvas.getObjects().find((object) => (
    readString(object, 'posterConversionId') === conversionId
    && readString(object, 'posterConversionRole') === 'ocr-hotspot'
    && readString(object, 'posterRegionId') === block.id
  ));
  if (current) {
    current.set({ visible: true, evented: true, selectable: true });
    return current;
  }
  const hotspot = createHotspot(source, block, conversionId, readString(source, 'posterSourceAssetId'));
  canvas.add(hotspot);
  return hotspot;
};

export function rehydratePosterHotspots(canvas: fabric.Canvas) {
  const convertedBySource = new Map<string, Set<string>>();
  canvas.getObjects().forEach((object) => {
    if (!preparePosterEditableTextObject(object)) return;
    const conversionId = readString(object, 'posterConversionId');
    const regionId = readString(object, 'posterRegionId');
    if (!conversionId || !regionId) return;
    const converted = convertedBySource.get(conversionId) || new Set<string>();
    converted.add(regionId);
    convertedBySource.set(conversionId, converted);
  });
  const sources = canvas.getObjects().filter((object) => (
    object.type === 'image' && readString(object, 'posterConversionRole') === 'source'
  )) as fabric.Image[];
  sources.forEach((source) => {
    const conversionId = readString(source, 'posterConversionId');
    const converted = new Set([
      ...readStringArray(source, 'posterConvertedRegionIds'),
      ...(convertedBySource.get(conversionId) || []),
    ]);
    source.set({ posterConvertedRegionIds: [...converted] } as Record<string, unknown>);
    readTextBlocks(source).forEach((block) => {
      if (!converted.has(block.id)) ensureHotspot(canvas, source, block, conversionId);
    });
  });
  canvas.requestRenderAll();
}

export async function convertPosterToEditableDesign(
  canvas: fabric.Canvas,
  source: fabric.Image,
  result: PosterAnalysisResult,
  acceptedBlocks: PosterTextBlock[],
  referenceMode: PosterReferenceMode,
) {
  void referenceMode;
  if (!acceptedBlocks.length) throw new Error('Accept at least one detected text block before enabling editable text regions.');
  const conversionId = createObjectId('poster-conversion');
  const sourceAssetId = readString(source, 'assetId') || result.source.asset_id;
  const previousSourceState = {
    name: readString(source, 'name'),
    objectType: readString(source, 'objectType'),
    selectable: source.selectable,
    evented: source.evented,
    lockMovementX: source.lockMovementX,
    lockMovementY: source.lockMovementY,
    lockScalingX: source.lockScalingX,
    lockScalingY: source.lockScalingY,
    lockRotation: source.lockRotation,
  };

  source.filters = [];
  source.applyFilters();
  source.set({
    name: 'Original Image',
    displayName: 'Original Image',
    objectType: 'editable-import-source',
    posterConversionId: conversionId,
    posterConversionRole: 'source',
    posterConversionMode: result.mode,
    posterSourceAssetId: sourceAssetId,
    posterAnalysisJobId: result.job_id,
    posterReferenceMode: 'lock',
    posterPalette: result.palette,
    posterWarnings: result.warnings,
    posterOcrRegions: acceptedBlocks,
    posterConvertedRegionIds: [],
    posterSourceDimensions: { width: result.source.width, height: result.source.height },
    posterDisplayTransform: sourceTransformSnapshot(source),
    posterOriginalObjectState: previousSourceState,
    posterEditableAsset: {
      assetId: sourceAssetId,
      originalSrc: result.source.url,
      naturalWidth: result.source.width,
      naturalHeight: result.source.height,
      detectedTextRegions: acceptedBlocks,
      generationStatus: 'completed',
      version: 1,
    },
    visible: true,
    opacity: 1,
    globalCompositeOperation: 'source-over',
    selectable: true,
    evented: true,
    hasControls: true,
    locked: true,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    excludeFromExport: false,
  } as Record<string, unknown>);
  source.setCoords();

  const sourceIndex = canvas.getObjects().indexOf(source);
  const reviewRequired = acceptedBlocks
    .filter((block) => block.confidence < 0.75)
    .map((block) => block.id);
  const hotspots = acceptedBlocks
    .sort((first, second) => first.reading_order - second.reading_order)
    .map((block) => createHotspot(source, block, conversionId, sourceAssetId));
  hotspots.forEach((hotspot, index) => {
    canvas.add(hotspot);
    canvas.moveTo(hotspot, Math.max(0, sourceIndex + 1 + index));
  });

  source.set({
    posterConvertedRegionIds: [],
    posterConversionSummary: {
      textLayerCount: 0,
      detectedTextCount: acceptedBlocks.length,
      highConfidenceCount: acceptedBlocks.length - reviewRequired.length,
      reviewRequiredRegionIds: [...new Set(reviewRequired)],
      localPatchCount: 0,
      visualState: 'original-preserved',
    },
  } as Record<string, unknown>);

  canvas.setActiveObject(source);
  canvas.requestRenderAll();

  if (import.meta.env.DEV) {
    const transform = sourceTransformSnapshot(source);
    console.debug('[TECKSTUDIO] Text-editable import preserves original image', {
      source: `${result.source.width} × ${result.source.height}`,
      canvas: `${canvas.getWidth()} × ${canvas.getHeight()}`,
      rendered: `${source.getScaledWidth()} × ${source.getScaledHeight()}`,
      offset: { x: source.left, y: source.top },
      scale: { x: source.scaleX, y: source.scaleY },
      origin: { x: source.originX, y: source.originY },
      zoom: canvas.getZoom(),
      viewportTransform: canvas.viewportTransform,
      displayTransform: transform,
      editableHotspots: hotspots.length,
      textLayers: 0,
      localPatches: 0,
      reviewRequired: reviewRequired.length,
    });
  }

  return {
    conversionId,
    created: [source, ...hotspots],
    source,
    background: source,
    hotspots,
    patches: [] as fabric.Image[],
    textObjects: [] as Array<fabric.IText | fabric.Textbox>,
    reviewRequired: [...new Set(reviewRequired)],
  };
}

const createPatchObject = async (
  source: fabric.Image,
  conversionId: string,
  block: PosterTextBlock,
  patch: Awaited<ReturnType<typeof convertPosterTextRegion>>,
  patchObjectId: string,
  ownerTextId: string,
) => {
  const element = await loadImage(patch.asset.url);
  const mapped = mapNormalizedBoxToCanvas(source, patch.normalized_box);
  const image = new fabric.Image(element, {
    crossOrigin: 'anonymous',
    left: mapped.center.x,
    top: mapped.center.y,
    originX: 'center',
    originY: 'center',
    angle: mapped.transform.angle,
    scaleX: Math.abs(mapped.transform.scaleX),
    scaleY: Math.abs(mapped.transform.scaleY),
  });
  image.set({
    id: patchObjectId,
    name: `Clean Patch – “${block.text.replace(/\s+/g, ' ').slice(0, 48)}”`,
    objectType: 'editable-import-patch',
    posterConversionId: conversionId,
    posterConversionRole: 'clean-patch',
    posterRegionId: block.id,
    posterTextBlockId: block.id,
    posterOwnerTextId: ownerTextId,
    posterPatchAssetId: patch.asset.asset_id,
    posterPatchUrl: patch.asset.url,
    posterSourceBoundingBox: patch.source_box,
    posterNormalizedPatchBox: patch.normalized_box,
    posterSourceAssetId: readString(source, 'posterSourceAssetId'),
    assetId: patch.asset.asset_id,
    assetUrl: patch.asset.url,
    sourceUrl: patch.asset.url,
    naturalWidth: patch.asset.width,
    naturalHeight: patch.asset.height,
    selectable: false,
    evented: false,
    locked: true,
    excludeFromLayers: true,
    staticExportSupported: true,
  } as Record<string, unknown>);
  return image;
};

const numericFontWeight = (weight: string) => {
  const parsed = Number(weight);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return weight === 'bold' ? 700 : 400;
};

const createTextObject = async (
  source: fabric.Image,
  block: PosterTextBlock,
  conversionId: string,
  patchAssetId: string,
  patchObjectId: string,
  textObjectId: string,
  overrides: PosterTextOverrides,
) => {
  const family = overrides.fontFamily?.trim() || block.style.font_family_guess || 'Inter';
  const weight = numericFontWeight(block.style.font_weight);
  const fontStyle = block.style.font_style === 'italic' || block.style.font_style === 'oblique'
    ? 'italic'
    : 'normal';
  await ensureFontLoaded({
    id: family,
    family,
    source: 'built-in',
    weight,
    style: fontStyle,
  });

  const mapped = mapNormalizedBoxToCanvas(source, block.normalized_bounding_box);
  const displayScaleX = Math.max(0.001, Math.abs(mapped.transform.scaleX));
  const displayScaleY = Math.max(0.001, Math.abs(mapped.transform.scaleY));
  const displayWidth = Math.max(8, mapped.box.width * displayScaleX);
  const displayHeight = Math.max(8, mapped.box.height * displayScaleY);
  const currentText = overrides.text ?? block.text;
  const baseFontSize = Math.max(8, block.style.font_size * displayScaleY);
  await document.fonts.load(`${fontStyle} ${weight} ${baseFontSize}px "${family}"`);
  const commonTextOptions = {
    left: mapped.center.x,
    top: mapped.center.y,
    originX: 'center',
    originY: 'center',
    fontFamily: family,
    fontSize: baseFontSize,
    fontWeight: block.style.font_weight,
    fontStyle,
    fill: overrides.fill || block.style.fill,
    stroke: block.style.stroke || undefined,
    strokeWidth: block.style.stroke_width,
    backgroundColor: block.style.background_color || '',
    textAlign: block.style.text_align as 'left' | 'center' | 'right' | 'justify',
    lineHeight: block.style.line_height,
    charSpacing: Math.round((block.style.letter_spacing / Math.max(8, block.style.font_size)) * 1000),
    angle: mapped.transform.angle + block.style.rotation,
  } as fabric.ITextOptions;
  const isSingleLine = !currentText.includes('\n') && currentText.length <= 48;
  const text = isSingleLine ? new fabric.IText(currentText, {
    ...commonTextOptions,
  } as fabric.ITextOptions) : new fabric.Textbox(currentText, {
    ...commonTextOptions,
    width: displayWidth,
    splitByGrapheme: false,
  } as fabric.ITextboxOptions);
  text.initDimensions();
  const measuredWidth = Math.max(1, text.width || 1);
  const measuredHeight = Math.max(1, text.height || 1);
  const fitRatio = Math.min(displayWidth / measuredWidth, displayHeight / measuredHeight, 1);
  if (fitRatio < 1) {
    text.set('fontSize', Math.max(8, (text.fontSize || 8) * fitRatio));
    text.initDimensions();
  }
  text.set({
    id: textObjectId,
    name: `${roleLabel(block)} – “${readableSnippet(currentText)}”`,
    objectType: 'editable-import-text',
    posterConversionId: conversionId,
    posterConversionRole: 'text',
    posterRegionId: block.id,
    posterTextBlockId: block.id,
    posterTextBlock: block,
    posterOriginalText: block.text,
    posterOriginalOcrText: block.text,
    posterCurrentText: currentText,
    posterConverted: true,
    posterNormalizedBoundingBox: block.normalized_bounding_box,
    posterSourceAssetId: readString(source, 'posterSourceAssetId'),
    posterPatchAssetId: patchAssetId,
    posterCleanPatchId: patchObjectId,
    posterTextRole: block.role || 'body',
    posterFontMatch: {
      requestedFamily: block.style.font_family_guess,
      appliedFamily: family,
      confidence: block.confidence,
    },
    ocrSourceAssetId: readString(source, 'posterSourceAssetId'),
    ocrConfidence: block.confidence,
    scaleX: 1,
    scaleY: 1,
    editable: true,
    selectable: true,
    evented: true,
    hasControls: true,
    locked: false,
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: false,
    visible: true,
    opacity: 1,
    excludeFromExport: false,
    staticExportSupported: true,
  } as Record<string, unknown>);
  text.initDimensions();
  text.setCoords();
  return text;
};

export async function convertPosterRegionToText(
  canvas: fabric.Canvas,
  hotspot: fabric.Object,
  overrides: PosterTextOverrides = {},
) {
  if (readString(hotspot, 'posterConversionRole') !== 'ocr-hotspot') {
    throw new Error('Select a detected editable text region first.');
  }
  const conversionId = readString(hotspot, 'posterConversionId');
  const block = readTextBlock(hotspot);
  const source = findPosterSource(canvas, conversionId);
  const jobId = readString(source, 'posterAnalysisJobId');
  if (!source || !block || !jobId) throw new Error('The editable import metadata is incomplete.');
  const patchResult = await convertPosterTextRegion(jobId, block.id);
  const patchObjectId = createObjectId('poster-clean-patch');
  const textObjectId = createObjectId('editable-ocr-text');
  const patch = await createPatchObject(
    source,
    conversionId,
    block,
    patchResult,
    patchObjectId,
    textObjectId,
  );
  const text = await createTextObject(
    source,
    block,
    conversionId,
    patchResult.asset.asset_id,
    patchObjectId,
    textObjectId,
    overrides,
  );
  const sourceIndex = canvas.getObjects().indexOf(source);
  canvas.add(patch);
  canvas.moveTo(patch, Math.max(0, sourceIndex + 1));
  canvas.add(text);
  canvas.moveTo(text, Math.max(0, sourceIndex + 2));
  hotspot.set({ visible: false, evented: false, selectable: false });
  const converted = new Set(readStringArray(source, 'posterConvertedRegionIds'));
  converted.add(block.id);
  source.set({ posterConvertedRegionIds: [...converted] } as Record<string, unknown>);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();
  return { source, patch, text, hotspot };
}

export function isPosterEditableText(object: fabric.Object | null | undefined) {
  return Boolean(
    isEditableTextObject(object)
    && readString(object, 'posterConversionRole') === 'text'
    && readString(object, 'objectType') === 'editable-import-text',
  );
}

export function preparePosterEditableTextObject(object: fabric.Object | null | undefined) {
  if (!isPosterEditableText(object)) return false;
  const textObject = object as fabric.IText;
  const currentText = typeof textObject.text === 'string'
    ? textObject.text
    : readString(textObject, 'posterCurrentText') || readString(textObject, 'posterOriginalText');
  const explicitlyLocked = textObject.get('locked' as keyof fabric.Object) === true;
  textObject.set({
    name: `${roleLabel(readTextBlock(textObject) || { role: 'body' })} – “${readableSnippet(currentText)}”`,
    posterCurrentText: currentText,
    posterConverted: true,
    editable: true,
    selectable: true,
    evented: true,
    hasControls: true,
    locked: explicitlyLocked,
    lockMovementX: explicitlyLocked,
    lockMovementY: explicitlyLocked,
    lockScalingX: explicitlyLocked,
    lockScalingY: explicitlyLocked,
    lockRotation: explicitlyLocked,
    visible: true,
    excludeFromExport: false,
  } as Record<string, unknown>);
  textObject.setCoords();
  return true;
}

export function syncPosterEditableTextMetadata(object: fabric.Object | null | undefined) {
  if (!preparePosterEditableTextObject(object)) return false;
  const textObject = object as fabric.IText;
  const currentText = textObject.text || '';
  textObject.set({
    posterCurrentText: currentText,
    name: `${roleLabel(readTextBlock(textObject) || { role: 'body' })} – “${readableSnippet(currentText)}”`,
  } as Record<string, unknown>);
  return true;
}

export function normalizePosterEditableTextTransform(object: fabric.Object | null | undefined) {
  if (!isPosterEditableText(object)) return false;
  const textObject = object as fabric.Textbox;
  if (textObject.isEditing) return false;
  const scaleX = textObject.scaleX || 1;
  const scaleY = textObject.scaleY || 1;
  if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) return false;

  const center = textObject.getCenterPoint();
  const nextFontSize = Math.max(8, Math.min(300, Math.round((textObject.fontSize || 16) * Math.abs(scaleY))));
  const nextWidth = textObject.type === 'textbox'
    ? Math.max(8, (textObject.width || 8) * Math.abs(scaleX))
    : textObject.width;
  textObject.set({
    fontSize: nextFontSize,
    width: nextWidth,
    scaleX: 1,
    scaleY: 1,
  } as fabric.ITextboxOptions & Record<string, unknown>);
  textObject.initDimensions?.();
  textObject.setPositionByOrigin(center, 'center', 'center');
  textObject.setCoords();
  syncPosterEditableTextMetadata(textObject);
  return true;
}

export function enterPosterTextEditing(
  canvas: fabric.Canvas,
  object: fabric.Object | null | undefined,
  options: { selectAll?: boolean; pointerEvent?: Event } = {},
) {
  if (!isPosterEditableText(object)) return false;
  preparePosterEditableTextObject(object);
  if (object?.get('locked' as keyof fabric.Object) === true) return false;
  const entered = enterInlineTextEditing(canvas, object, {
    ...options,
    forceUnlock: false,
  });
  if (entered) {
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'text-styles' } }));
  }
  return entered;
}

const regionIdForObject = (object: fabric.Object | null | undefined) => readString(object, 'posterRegionId');

export function revertPosterRegion(canvas: fabric.Canvas, selected: fabric.Object) {
  const conversionId = readString(selected, 'posterConversionId');
  const regionId = regionIdForObject(selected);
  const source = findPosterSource(canvas, conversionId);
  if (!source || !regionId) return null;
  canvas.getObjects()
    .filter((object) => (
      readString(object, 'posterConversionId') === conversionId
      && regionIdForObject(object) === regionId
      && ['clean-patch', 'text'].includes(readString(object, 'posterConversionRole'))
    ))
    .forEach((object) => canvas.remove(object));
  source.set({
    posterConvertedRegionIds: readStringArray(source, 'posterConvertedRegionIds').filter((id) => id !== regionId),
  } as Record<string, unknown>);
  const block = readTextBlocks(source).find((item) => item.id === regionId);
  const hotspot = block ? ensureHotspot(canvas, source, block, conversionId) : null;
  if (hotspot) canvas.setActiveObject(hotspot);
  canvas.requestRenderAll();
  return hotspot;
}

export function revertAllPosterRegions(canvas: fabric.Canvas, conversionId: string) {
  const source = findPosterSource(canvas, conversionId);
  if (!source) return null;
  canvas.getObjects()
    .filter((object) => (
      readString(object, 'posterConversionId') === conversionId
      && ['clean-patch', 'text', 'ocr-hotspot'].includes(readString(object, 'posterConversionRole'))
    ))
    .forEach((object) => canvas.remove(object));
  source.set({ posterConvertedRegionIds: [] } as Record<string, unknown>);
  readTextBlocks(source).forEach((block) => ensureHotspot(canvas, source, block, conversionId));
  canvas.setActiveObject(source);
  canvas.requestRenderAll();
  return source;
}

export function restoreOriginalPoster(canvas: fabric.Canvas, conversionId: string) {
  const source = findPosterSource(canvas, conversionId);
  canvas.getObjects()
    .filter((object) => readString(object, 'posterConversionId') === conversionId && object !== source)
    .forEach((object) => canvas.remove(object));
  if (source) {
    const originalState = source.get('posterOriginalObjectState' as keyof fabric.Object);
    source.set({
      ...(originalState && typeof originalState === 'object' ? originalState : {}),
      name: readString(source, 'name') || 'Uploaded Poster',
      objectType: 'uploaded-image',
      visible: true,
      opacity: 1,
      globalCompositeOperation: 'source-over',
      excludeFromExport: false,
      posterConversionId: undefined,
      posterConversionRole: undefined,
      posterConversionMode: undefined,
      posterAnalysisJobId: undefined,
      posterReferenceMode: undefined,
      posterOcrRegions: undefined,
      posterConvertedRegionIds: undefined,
      posterSourceDimensions: undefined,
      posterDisplayTransform: undefined,
      posterOriginalObjectState: undefined,
    } as Record<string, unknown>);
    source.setCoords();
    canvas.setActiveObject(source);
  }
  canvas.requestRenderAll();
  return source;
}

export function setPosterConversionView(canvas: fabric.Canvas, conversionId: string) {
  const source = findPosterSource(canvas, conversionId);
  if (source) {
    source.set({ visible: true, opacity: 1, globalCompositeOperation: 'source-over' });
    canvas.setActiveObject(source);
  }
  canvas.requestRenderAll();
}

export function setPosterRegionColour(object: fabric.Object, colour: string) {
  const config = object.get('posterRegionConfig' as keyof fabric.Object);
  if (!config || typeof config !== 'object') return false;
  if (object.type === 'image') {
    const image = object as fabric.Image;
    image.filters = [new fabric.Image.filters.BlendColor({ color: colour, mode: 'tint', alpha: 0.88 })];
    image.applyFilters();
  } else {
    object.set('fill', colour);
  }
  object.set({
    posterRegionConfig: { ...(config as PosterColourRegion), currentColor: colour },
  } as Record<string, unknown>);
  return true;
}
