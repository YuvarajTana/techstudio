import { fabric } from 'fabric';

export type EditableTextObject = fabric.Textbox & {
  isEditing?: boolean;
  selectionStart?: number;
  selectionEnd?: number;
  hiddenTextarea?: HTMLTextAreaElement | null;
  enterEditing?: () => void;
  exitEditing?: () => void;
  selectAll?: () => void;
  setCursorByClick?: (event: Event) => void;
  setSelectionStyles?: (styles: Record<string, unknown>, start?: number, end?: number) => void;
  getSelectionStyles?: (start?: number, end?: number, complete?: boolean) => Array<Record<string, unknown>>;
  initDimensions?: () => void;
  setCoords: () => void;
};

export type TextSelectionRange = {
  objectId?: string;
  start: number;
  end: number;
};

export type TextStyleApplication = {
  applied: boolean;
  mode: 'selection' | 'object' | 'none';
  textObject?: EditableTextObject;
};

export type PageAlignment =
  | 'left'
  | 'center-horizontal'
  | 'right'
  | 'top'
  | 'center-vertical'
  | 'bottom'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

const TEXT_OBJECT_TYPES = new Set(['text', 'i-text', 'textbox']);

export const COMMON_FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 144, 180, 240, 300];
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 300;

export const clampFontSize = (value: number) => Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value || MIN_FONT_SIZE)));

export function isEditableTextObject(object: fabric.Object | null | undefined): object is EditableTextObject {
  return Boolean(object && TEXT_OBJECT_TYPES.has(object.type || '') && typeof (object as EditableTextObject).set === 'function');
}

export function isTextObjectLocked(object: fabric.Object | null | undefined) {
  if (!isEditableTextObject(object)) return false;
  return Boolean(
    object.selectable === false ||
    object.evented === false ||
    object.lockMovementX === true ||
    object.lockMovementY === true ||
    object.lockScalingX === true ||
    object.lockScalingY === true ||
    object.lockRotation === true
  );
}

export function enterInlineTextEditing(
  canvas: fabric.Canvas,
  object: fabric.Object | null | undefined,
  options: { selectAll?: boolean; pointerEvent?: Event; forceUnlock?: boolean } = {},
) {
  if (!isEditableTextObject(object) || typeof object.enterEditing !== 'function') return false;

  object.set({
    selectable: true,
    evented: true,
    editable: true,
    hasControls: true,
    ...(options.forceUnlock ? {
      locked: false,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
    } : {}),
  } as fabric.ITextboxOptions & Record<string, unknown>);
  canvas.setActiveObject(object);
  object.enterEditing();

  if (options.selectAll) {
    object.selectAll?.();
  } else if (options.pointerEvent) {
    object.setCursorByClick?.(options.pointerEvent);
  }

  object.hiddenTextarea?.focus();
  object.setCoords();
  canvas.requestRenderAll();
  window.requestAnimationFrame(() => object.hiddenTextarea?.focus());
  return true;
}

export function getFabricObjectId(object: fabric.Object | null | undefined) {
  if (!object) return undefined;
  const value = (object as unknown as { get?: (key: string) => unknown }).get?.('id');
  return typeof value === 'string' ? value : undefined;
}

export function captureTextSelection(object: fabric.Object | null | undefined): TextSelectionRange | null {
  if (!isEditableTextObject(object)) return null;
  const start = Number(object.selectionStart ?? 0);
  const end = Number(object.selectionEnd ?? start);
  if (!object.isEditing || start === end) return null;
  return {
    objectId: getFabricObjectId(object),
    start: Math.max(0, Math.min(start, end)),
    end: Math.max(start, end),
  };
}

function normalizeFallbackRange(object: fabric.Object, fallbackRange?: TextSelectionRange | null) {
  if (!fallbackRange) return null;
  const objectId = getFabricObjectId(object);
  if (fallbackRange.objectId && objectId && fallbackRange.objectId !== objectId) return null;
  return fallbackRange;
}

export function hasPartialTextSelection(object: fabric.Object | null | undefined, fallbackRange?: TextSelectionRange | null) {
  if (!isEditableTextObject(object)) return false;
  const liveSelection = captureTextSelection(object);
  const range = liveSelection || normalizeFallbackRange(object, fallbackRange);
  return Boolean(range && range.end > range.start);
}

function findTextObject(canvas: fabric.Canvas, object: EditableTextObject, range?: TextSelectionRange | null) {
  if (!range?.objectId) return object;
  const matched = canvas.getObjects().find((candidate) => getFabricObjectId(candidate) === range.objectId);
  return isEditableTextObject(matched) ? matched : object;
}

export function restoreTextSelection(canvas: fabric.Canvas, object: EditableTextObject, range?: TextSelectionRange | null) {
  if (!range || range.end <= range.start) return object;
  const target = findTextObject(canvas, object, range);
  canvas.setActiveObject(target);
  target.enterEditing?.();
  target.selectionStart = range.start;
  target.selectionEnd = range.end;
  target.hiddenTextarea?.focus?.();
  target.setCoords();
  canvas.requestRenderAll();
  return target;
}

export function applyTextStylesToSelectionOrObject(
  canvas: fabric.Canvas | null,
  object: fabric.Object | null,
  styles: Record<string, unknown>,
  fallbackRange?: TextSelectionRange | null,
): TextStyleApplication {
  if (!canvas || !isEditableTextObject(object)) {
    return { applied: false, mode: 'none' };
  }

  const liveSelection = captureTextSelection(object);
  const range = liveSelection || normalizeFallbackRange(object, fallbackRange);
  const hasRange = Boolean(range && range.end > range.start);
  const target = hasRange ? restoreTextSelection(canvas, object, range) : object;

  if (hasRange && target.setSelectionStyles) {
    target.setSelectionStyles(styles, range!.start, range!.end);
    target.selectionStart = range!.start;
    target.selectionEnd = range!.end;
  } else {
    target.set(styles as fabric.ITextboxOptions & Record<string, unknown>);
  }

  target.initDimensions?.();
  target.setCoords();
  canvas.setActiveObject(target);
  canvas.requestRenderAll();

  return { applied: true, mode: hasRange ? 'selection' : 'object', textObject: target };
}

export function readSelectionStyleValue<T = unknown>(
  object: fabric.Object | null | undefined,
  property: string,
  objectFallback: T,
  fallbackRange?: TextSelectionRange | null,
): T | 'Mixed' {
  if (!isEditableTextObject(object)) return objectFallback;
  const range = captureTextSelection(object) || normalizeFallbackRange(object, fallbackRange);
  if (!range || range.end <= range.start || !object.getSelectionStyles) {
    return ((object as unknown as { get: (key: string) => T }).get(property) ?? objectFallback) as T;
  }

  const values = object.getSelectionStyles(range.start, range.end, true).map((style) => (
    style[property] ?? (object as unknown as { get: (key: string) => T }).get(property) ?? objectFallback
  ));
  const first = values[0] as T | undefined;
  if (first === undefined) return objectFallback;
  return values.every((value) => value === first) ? first : 'Mixed';
}

export function transformTextCase(
  canvas: fabric.Canvas | null,
  object: fabric.Object | null,
  mode: 'upper' | 'lower' | 'capitalize' | 'sentence',
  fallbackRange?: TextSelectionRange | null,
): TextStyleApplication {
  if (!canvas || !isEditableTextObject(object)) return { applied: false, mode: 'none' };

  const transform = (value: string) => {
    if (mode === 'upper') return value.toUpperCase();
    if (mode === 'lower') return value.toLowerCase();
    if (mode === 'sentence') return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    return value.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  };

  const range = captureTextSelection(object) || normalizeFallbackRange(object, fallbackRange);
  if (range && range.end > range.start) {
    const target = restoreTextSelection(canvas, object, range);
    const value = target.text || '';
    const selectedText = value.slice(range.start, range.end);
    target.set('text', `${value.slice(0, range.start)}${transform(selectedText)}${value.slice(range.end)}`);
    target.selectionStart = range.start;
    target.selectionEnd = range.start + selectedText.length;
    target.initDimensions?.();
    target.setCoords();
    canvas.setActiveObject(target);
    canvas.requestRenderAll();
    return { applied: true, mode: 'selection', textObject: target };
  }

  object.set('text', transform(object.text || ''));
  object.initDimensions?.();
  object.setCoords();
  canvas.requestRenderAll();
  return { applied: true, mode: 'object', textObject: object };
}

function moveBoundingRectTo(object: fabric.Object, targetLeft?: number, targetTop?: number) {
  const bounds = object.getBoundingRect(true, true);
  const next: fabric.IObjectOptions = {};
  if (typeof targetLeft === 'number') next.left = (object.left || 0) + (targetLeft - bounds.left);
  if (typeof targetTop === 'number') next.top = (object.top || 0) + (targetTop - bounds.top);
  object.set(next);
}

export function alignObjectToPage(canvas: fabric.Canvas, object: fabric.Object, alignment: PageAlignment, margin = 0) {
  const bounds = object.getBoundingRect(true, true);
  const pageWidth = canvas.getWidth();
  const pageHeight = canvas.getHeight();
  const horizontal: Partial<Record<PageAlignment, 'left' | 'center' | 'right'>> = {
    left: 'left',
    'center-horizontal': 'center',
    right: 'right',
    'top-left': 'left',
    'center-left': 'left',
    'bottom-left': 'left',
    'top-center': 'center',
    center: 'center',
    'bottom-center': 'center',
    'top-right': 'right',
    'center-right': 'right',
    'bottom-right': 'right',
  };
  const vertical: Partial<Record<PageAlignment, 'top' | 'center' | 'bottom'>> = {
    top: 'top',
    'center-vertical': 'center',
    bottom: 'bottom',
    'top-left': 'top',
    'top-center': 'top',
    'top-right': 'top',
    'center-left': 'center',
    center: 'center',
    'center-right': 'center',
    'bottom-left': 'bottom',
    'bottom-center': 'bottom',
    'bottom-right': 'bottom',
  };

  let targetLeft: number | undefined;
  let targetTop: number | undefined;

  if (horizontal[alignment] === 'left') targetLeft = margin;
  if (horizontal[alignment] === 'center') targetLeft = (pageWidth - bounds.width) / 2;
  if (horizontal[alignment] === 'right') targetLeft = pageWidth - bounds.width - margin;
  if (vertical[alignment] === 'top') targetTop = margin;
  if (vertical[alignment] === 'center') targetTop = (pageHeight - bounds.height) / 2;
  if (vertical[alignment] === 'bottom') targetTop = pageHeight - bounds.height - margin;

  moveBoundingRectTo(object, targetLeft, targetTop);
  object.setCoords();
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
}
