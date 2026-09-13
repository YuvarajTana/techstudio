import { fabric } from 'fabric';
import { ensureFontLoaded, type FontReference } from './fontLoader';

export const EDITORIAL_TECH_TEMPLATE_NAME = 'Editorial Tech API Poster';

export const EDITORIAL_TECH_PALETTE = {
  background: '#07100D',
  white: '#F3F0E8',
  gold: '#C89A4B',
  gray: '#858A85',
  grid: '#14201B',
  inactiveBorder: '#252D29',
  activeBorder: '#8D6B35',
  darkBox: 'rgba(8, 15, 12, 0.65)',
} as const;

export type EditorialGridOptions = {
  size?: number;
  opacity?: number;
  lineWidth?: number;
  color?: string;
};

export type EditorialBorderOptions = {
  inset?: number;
  thickness?: number;
  opacity?: number;
  color?: string;
  cornerRadius?: number;
};

export type EditorialTagOptions = {
  active?: boolean;
  paddingX?: number;
  paddingY?: number;
  manualWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  left?: number;
  top?: number;
};

export const EDITORIAL_FONT_REFERENCES = {
  serif: [
    { id: 'playfair-display-500', family: 'Playfair Display', source: 'built-in' as const, weight: 500, style: 'normal' as const },
    { id: 'playfair-display-500-italic', family: 'Playfair Display', source: 'built-in' as const, weight: 500, style: 'italic' as const },
    { id: 'playfair-display-600', family: 'Playfair Display', source: 'built-in' as const, weight: 600, style: 'normal' as const },
  ],
  mono: [
    { id: 'space-mono-400', family: 'Space Mono', source: 'built-in' as const, weight: 400, style: 'normal' as const },
    { id: 'space-mono-600', family: 'Space Mono', source: 'built-in' as const, weight: 600, style: 'normal' as const },
  ],
} satisfies Record<string, FontReference[]>;

export async function ensureEditorialFontsLoaded() {
  await Promise.allSettled(
    Object.values(EDITORIAL_FONT_REFERENCES).flat().map((reference) => ensureFontLoaded(reference)),
  );
}

const objectId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const lockedBackgroundOptions = {
  selectable: true,
  evented: false,
  lockMovementX: true,
  lockMovementY: true,
  lockScalingX: true,
  lockScalingY: true,
  lockRotation: true,
  hasControls: false,
};

const editorialMetadata = (role: string, name: string) => ({
  id: objectId(`editorial-${role}`),
  name,
  objectType: 'editorial-poster',
  teckstudioObjectType: `editorial${role.charAt(0).toUpperCase()}${role.slice(1)}`,
  editorialRole: role,
  elementCategory: 'Technology',
  elementSubcategory: 'Developer',
  elementTags: ['editorial', 'technology', 'developer', role],
  elementEditable: true,
});

export function createEditorialGrid(
  width: number,
  height: number,
  options: EditorialGridOptions = {},
) {
  const size = Math.max(20, options.size || 84);
  const opacity = Math.min(1, Math.max(0.01, options.opacity ?? 0.1));
  const lineWidth = Math.max(0.25, options.lineWidth || 1);
  const color = options.color || EDITORIAL_TECH_PALETTE.grid;
  const lines: fabric.Line[] = [];

  for (let x = 0; x <= width; x += size) {
    lines.push(new fabric.Line([x, 0, x, height], {
      stroke: color,
      strokeWidth: lineWidth,
      opacity,
      selectable: false,
      evented: false,
      strokeUniform: true,
    }));
  }

  for (let y = 0; y <= height; y += size) {
    lines.push(new fabric.Line([0, y, width, y], {
      stroke: color,
      strokeWidth: lineWidth,
      opacity,
      selectable: false,
      evented: false,
      strokeUniform: true,
    }));
  }

  return new fabric.Group(lines, {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    ...lockedBackgroundOptions,
    ...editorialMetadata('grid', 'Editorial grid pattern'),
    gridSize: size,
    gridOpacity: opacity,
    gridLineWidth: lineWidth,
    gridColor: color,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function createEditorialBorder(
  width: number,
  height: number,
  options: EditorialBorderOptions = {},
) {
  const inset = Math.max(0, options.inset ?? 6);
  const thickness = Math.max(0.5, options.thickness ?? 2);
  const opacity = Math.min(1, Math.max(0.05, options.opacity ?? 0.85));
  const color = options.color || EDITORIAL_TECH_PALETTE.white;
  const cornerRadius = Math.max(0, options.cornerRadius || 0);

  return new fabric.Rect({
    left: inset,
    top: inset,
    width: Math.max(1, width - inset * 2),
    height: Math.max(1, height - inset * 2),
    originX: 'left',
    originY: 'top',
    fill: 'rgba(0,0,0,0)',
    stroke: color,
    strokeWidth: thickness,
    strokeUniform: true,
    opacity,
    rx: cornerRadius,
    ry: cornerRadius,
    ...lockedBackgroundOptions,
    ...editorialMetadata('border', 'Editorial outer border'),
    borderInset: inset,
    borderOpacity: opacity,
  } as fabric.IRectOptions & Record<string, unknown>);
}

export function createEditorialDivider(canvasWidth: number, top = 545) {
  return new fabric.Rect({
    left: canvasWidth / 2,
    top,
    originX: 'center',
    originY: 'center',
    width: 84,
    height: 2,
    fill: EDITORIAL_TECH_PALETTE.gold,
    strokeWidth: 0,
    ...editorialMetadata('divider', 'Gold divider'),
  } as fabric.IRectOptions & Record<string, unknown>);
}

export function createEditorialTag(text: string, options: EditorialTagOptions = {}) {
  const active = Boolean(options.active);
  const paddingX = Math.max(6, options.paddingX ?? 20);
  const paddingY = Math.max(4, options.paddingY ?? 12);
  const fontSize = Math.max(8, options.fontSize || 20);
  const fontFamily = options.fontFamily || 'Space Mono, Menlo, Monaco, Consolas, monospace';
  const textColor = options.textColor || (active ? EDITORIAL_TECH_PALETTE.gold : EDITORIAL_TECH_PALETTE.gray);
  const backgroundColor = options.backgroundColor || EDITORIAL_TECH_PALETTE.darkBox;
  const borderColor = options.borderColor || (active ? EDITORIAL_TECH_PALETTE.activeBorder : EDITORIAL_TECH_PALETTE.inactiveBorder);
  const borderWidth = Math.max(0, options.borderWidth ?? 2);
  const cornerRadius = Math.max(0, options.cornerRadius || 0);
  const tagId = objectId('editorial-tag');
  const label = new fabric.IText(text, {
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    fill: textColor,
    fontFamily,
    fontSize,
    fontWeight: 400,
    charSpacing: 15,
    editable: true,
    name: `Tag text — ${text}`,
    id: objectId('editorial-tag-text'),
    objectType: 'editorial-tag-text',
    teckstudioObjectType: 'editorialTagText',
    editorialRole: 'tag-text',
    editorialTagId: tagId,
    editorialTagRole: 'text',
    tagPaddingX: paddingX,
    tagPaddingY: paddingY,
    tagManualWidth: Boolean(options.manualWidth),
    tagActive: active,
    fontReferences: fontFamily.includes('Playfair Display')
      ? EDITORIAL_FONT_REFERENCES.serif
      : fontFamily.includes('Space Mono')
        ? EDITORIAL_FONT_REFERENCES.mono
        : [],
  } as fabric.ITextOptions & Record<string, unknown>);

  const autoWidth = Math.ceil((label.width || text.length * fontSize * 0.62) + paddingX * 2);
  const width = Math.max(autoWidth, options.manualWidth || 0);
  const height = Math.ceil((label.height || fontSize * 1.25) + paddingY * 2);
  const box = new fabric.Rect({
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    width,
    height,
    fill: backgroundColor,
    stroke: borderColor,
    strokeWidth: borderWidth,
    strokeUniform: true,
    rx: cornerRadius,
    ry: cornerRadius,
    name: `Tag box — ${text}`,
    id: objectId('editorial-tag-box'),
    objectType: 'editorial-tag-box',
    teckstudioObjectType: 'editorialTagBox',
    editorialRole: 'tag-box',
    editorialTagId: tagId,
    editorialTagRole: 'background',
    tagPaddingX: paddingX,
    tagPaddingY: paddingY,
    tagManualWidth: Boolean(options.manualWidth),
    tagActive: active,
  } as fabric.IRectOptions & Record<string, unknown>);

  return new fabric.Group([box, label], {
    left: options.left ?? 0,
    top: options.top ?? 0,
    originX: 'center',
    originY: 'center',
    subTargetCheck: true,
    objectCaching: false,
    name: `Tag — ${text}`,
    id: tagId,
    objectType: 'editorial-tag',
    teckstudioObjectType: 'editorialTag',
    editorialRole: 'tag',
    editorialTagId: tagId,
    tagPaddingX: paddingX,
    tagPaddingY: paddingY,
    tagManualWidth: Boolean(options.manualWidth),
    tagActive: active,
    elementCategory: 'Technology',
    elementSubcategory: 'Developer labels',
    elementTags: ['editorial', 'tag', active ? 'active' : 'inactive'],
    elementEditable: true,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function createEditorialTagRow(
  canvasWidth: number,
  top: number,
  labels = ['routers', 'Depends()', 'auth', 'deploy'],
  gap = 14,
  options: EditorialTagOptions = {},
) {
  const tags = labels.map((label, index) => createEditorialTag(label, {
    ...options,
    active: index === 0,
    top,
  }));
  const totalWidth = tags.reduce((sum, tag) => sum + tag.getScaledWidth(), 0) + gap * Math.max(0, tags.length - 1);
  let cursor = (canvasWidth - totalWidth) / 2;
  tags.forEach((tag) => {
    const width = tag.getScaledWidth();
    tag.set({ left: cursor + width / 2, top });
    tag.setCoords();
    cursor += width + gap;
  });
  return tags;
}

export function resizeEditorialTagText(canvas: fabric.Canvas, textObject: fabric.Object) {
  if (textObject.get('editorialTagRole' as keyof fabric.Object) !== 'text') return false;
  const tagId = textObject.get('editorialTagId' as keyof fabric.Object);
  if (!tagId || textObject.get('tagManualWidth' as keyof fabric.Object) === true) return false;
  const box = canvas.getObjects().find((object) => (
    object.get('editorialTagId' as keyof fabric.Object) === tagId &&
    object.get('editorialTagRole' as keyof fabric.Object) === 'background'
  ));
  if (!box || box.type !== 'rect') return false;

  const paddingX = Number(textObject.get('tagPaddingX' as keyof fabric.Object)) || 20;
  const paddingY = Number(textObject.get('tagPaddingY' as keyof fabric.Object)) || 12;
  const editableText = textObject as fabric.IText;
  editableText.initDimensions();
  const width = Math.ceil((editableText.width || 1) + paddingX * 2);
  const height = Math.ceil((editableText.height || 1) + paddingY * 2);
  const center = box.getCenterPoint();
  box.set({ width, height, left: center.x, top: center.y, originX: 'center', originY: 'center' });
  editableText.set({ left: center.x, top: center.y, originX: 'center', originY: 'center' });
  box.setCoords();
  editableText.setCoords();
  canvas.requestRenderAll();
  return true;
}

export function enterEditorialTagEditing(canvas: fabric.Canvas, object: fabric.Object) {
  if (object.type !== 'group' || object.get('teckstudioObjectType' as keyof fabric.Object) !== 'editorialTag') return false;
  const selection = (object as fabric.Group).toActiveSelection();
  const textObject = selection.getObjects().find((child) => child.get('editorialTagRole' as keyof fabric.Object) === 'text');
  if (!textObject || textObject.type !== 'i-text') return false;
  canvas.setActiveObject(textObject);
  const editableText = textObject as fabric.IText;
  editableText.enterEditing();
  editableText.selectAll();
  editableText.hiddenTextarea?.focus();
  canvas.requestRenderAll();
  return true;
}

export function regroupEditorialTag(canvas: fabric.Canvas, tagId: string) {
  const existingGroup = canvas.getObjects().find((object) => (
    object.type === 'group' &&
    object.get('teckstudioObjectType' as keyof fabric.Object) === 'editorialTag' &&
    object.get('editorialTagId' as keyof fabric.Object) === tagId
  ));
  if (existingGroup) return existingGroup as fabric.Group;

  const children = canvas.getObjects().filter((object) => (
    object.get('editorialTagId' as keyof fabric.Object) === tagId &&
    ['background', 'text'].includes(String(object.get('editorialTagRole' as keyof fabric.Object) || ''))
  ));
  const box = children.find((object) => object.get('editorialTagRole' as keyof fabric.Object) === 'background');
  const textObject = children.find((object) => object.get('editorialTagRole' as keyof fabric.Object) === 'text') as fabric.IText | undefined;
  if (!box || !textObject) return null;

  const selection = new fabric.ActiveSelection([box, textObject], { canvas });
  canvas.setActiveObject(selection);
  const group = selection.toGroup();
  const paddingX = Number(textObject.get('tagPaddingX' as keyof fabric.Object)) || 20;
  const paddingY = Number(textObject.get('tagPaddingY' as keyof fabric.Object)) || 12;
  const active = textObject.get('tagActive' as keyof fabric.Object) === true;
  const label = textObject.text || 'Label';
  box.set('name', `Tag box — ${label}`);
  textObject.set('name', `Tag text — ${label}`);
  group.set({
    id: tagId,
    name: `Tag — ${label}`,
    objectType: 'editorial-tag',
    teckstudioObjectType: 'editorialTag',
    editorialRole: 'tag',
    editorialTagId: tagId,
    tagPaddingX: paddingX,
    tagPaddingY: paddingY,
    tagManualWidth: textObject.get('tagManualWidth' as keyof fabric.Object) === true,
    tagActive: active,
    elementCategory: 'Technology',
    elementSubcategory: 'Developer labels',
    elementTags: ['editorial', 'tag', active ? 'active' : 'inactive'],
    elementEditable: true,
    objectCaching: false,
    subTargetCheck: true,
  } as Record<string, unknown>);
  group.setCoords();
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
  return group;
}

const makeTextbox = (
  text: string,
  options: fabric.ITextboxOptions & Record<string, unknown>,
  role: string,
  name: string,
) => new fabric.Textbox(text, {
  originX: 'center',
  ...options,
  ...editorialMetadata(role, name),
} as fabric.ITextboxOptions & Record<string, unknown>);

export async function applyEditorialTechPoster(canvas: fabric.Canvas) {
  await ensureEditorialFontsLoaded();
  const width = 1080;
  const height = 1080;
  canvas.clear();
  canvas.setDimensions({ width, height });
  canvas.setBackgroundColor(EDITORIAL_TECH_PALETTE.background, () => undefined);

  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    originX: 'left',
    originY: 'top',
    fill: EDITORIAL_TECH_PALETTE.background,
    ...lockedBackgroundOptions,
    ...editorialMetadata('background', 'Main editorial background'),
  } as fabric.IRectOptions & Record<string, unknown>);
  const grid = createEditorialGrid(width, height);
  const border = createEditorialBorder(width, height);

  const eyebrow = makeTextbox('⌁  FASTAPI, PROPERLY', {
    left: width / 2,
    top: 215,
    width: 650,
    fontFamily: 'Space Mono, Menlo, Monaco, Consolas, monospace',
    fontSize: 20,
    fontWeight: 600,
    fill: EDITORIAL_TECH_PALETTE.gold,
    charSpacing: 250,
    textAlign: 'center',
    lineHeight: 1,
    fontReferences: EDITORIAL_FONT_REFERENCES.mono,
  }, 'eyebrow', 'Technical eyebrow');

  const subtitle = makeTextbox('PART 2 / 2  ·  STRUCTURE TO DEPLOY', {
    left: width / 2,
    top: 265,
    width: 760,
    fontFamily: 'Space Mono, Menlo, Monaco, Consolas, monospace',
    fontSize: 16,
    fill: EDITORIAL_TECH_PALETTE.gray,
    charSpacing: 220,
    textAlign: 'center',
    lineHeight: 1,
    fontReferences: EDITORIAL_FONT_REFERENCES.mono,
  }, 'subtitle', 'Technical subtitle');

  const headline = makeTextbox('ship the API', {
    left: width / 2,
    top: 350,
    width: 820,
    fontFamily: 'Playfair Display, Georgia, Times New Roman, serif',
    fontSize: 116,
    fontWeight: 600,
    fill: EDITORIAL_TECH_PALETTE.white,
    textAlign: 'center',
    lineHeight: 0.95,
    fontReferences: EDITORIAL_FONT_REFERENCES.serif,
  }, 'headline', 'Mixed editorial headline');
  headline.setSelectionStyles({
    fill: EDITORIAL_TECH_PALETTE.gold,
    fontStyle: 'italic',
    fontWeight: 500,
  }, 5, headline.text?.length || 12);

  const divider = createEditorialDivider(width, 535);

  const supportingCopy = 'From one file to a codebase\nyou can deploy.';
  const supporting = makeTextbox(supportingCopy, {
    left: width / 2,
    top: 595,
    width: 760,
    fontFamily: 'Playfair Display, Georgia, Times New Roman, serif',
    fontSize: 48,
    fontWeight: 500,
    fill: EDITORIAL_TECH_PALETTE.white,
    textAlign: 'center',
    lineHeight: 1.25,
    fontReferences: EDITORIAL_FONT_REFERENCES.serif,
  }, 'supporting-copy', 'Supporting editorial copy');
  const emphasisStart = supportingCopy.indexOf('deploy.');
  supporting.setSelectionStyles({
    fill: EDITORIAL_TECH_PALETTE.gold,
    fontStyle: 'italic',
  }, emphasisStart, emphasisStart + 'deploy.'.length);

  const tags = createEditorialTagRow(width, 785);

  const footer = makeTextbox('NO JARGON  ·  JUST THE MODEL  ·  SWIPE →', {
    left: width / 2,
    top: 930,
    width: 800,
    fontFamily: 'Space Mono, Menlo, Monaco, Consolas, monospace',
    fontSize: 15,
    fill: EDITORIAL_TECH_PALETTE.gray,
    charSpacing: 210,
    textAlign: 'center',
    lineHeight: 1,
    fontReferences: EDITORIAL_FONT_REFERENCES.mono,
  }, 'footer', 'Footer caption');

  const objects: fabric.Object[] = [
    background,
    grid,
    border,
    divider,
    eyebrow,
    subtitle,
    headline,
    supporting,
    ...tags,
    footer,
  ];
  canvas.add(...objects);
  canvas.discardActiveObject();
  canvas.renderAll();
  return objects;
}
