/**
 * DesignSpec → Fabric adapter. Runs in the browser (needs a DOM canvas).
 * The caller passes its `fabric` namespace so this package has no hard
 * dependency on a particular Fabric build.
 *
 * Output follows the editor's project format: the first page's Fabric JSON
 * plus `teckstudioPages` / `teckstudioActivePageId` for multi-page decks.
 * Once created, the Fabric JSON is authoritative; the spec is provenance.
 */
import { requireFormat } from '../formats';
import { iconSvg } from '../icons';
import { layoutPage, requireLayoutFamily } from '../layout';
import { requireTheme } from '../themes';
import type { DesignSpec, Primitive } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type FabricNamespace = any;
type FabricObject = any;

export const DESIGN_FABRIC_PROPERTIES = ['designSlot', 'designLayout', 'designPageId', 'designRole', 'designPlaceholder', 'designSpecId', 'designIcon'];
const BASE_PROPERTIES = ['id', 'name', 'selectable', 'evented', 'hasControls', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'posterRole', 'posterField', 'posterTemplateId', 'assetUrl'];

export interface FabricRenderOptions {
  /** Extra properties to keep when serialising (the editor's CUSTOM_FABRIC_PROPERTIES). */
  serializationProps?: string[];
  /** Map stored image URLs (e.g. /media/...) to loadable URLs. */
  resolveImageUrl?: (src: string) => string;
}

export interface DesignPageData {
  id: string;
  name: string;
  /** Serialized Fabric JSON for this page. */
  data: string;
}

export interface DesignProjectData {
  width: number;
  height: number;
  pages: DesignPageData[];
  /** Project `data` string: first page JSON + teckstudioPages metadata. */
  projectData: string;
}

function fontFamily(spec: DesignSpec, role: 'heading' | 'body' | 'mono') {
  return requireTheme(spec.theme).font[role];
}

/** Wait for the theme fonts so text measurement is correct. */
export async function loadDesignFonts(spec: DesignSpec): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const theme = requireTheme(spec.theme);
  const loads: Promise<unknown>[] = [];
  for (const ref of [theme.font.heading, theme.font.body, theme.font.mono]) {
    for (const weight of [400, 600, 700, 800]) loads.push(document.fonts.load(`${weight} 32px "${ref.family}"`).catch(() => undefined));
  }
  await Promise.all(loads);
}

function metadata(spec: DesignSpec, pageId: string, layout: string, item: Primitive) {
  const locked = item.role === 'background' || item.role.startsWith('decoration-');
  return {
    id: `${spec.id}:${item.id}`,
    name: item.slot ?? item.role.replaceAll('-', ' '),
    designSpecId: spec.id,
    designPageId: pageId,
    designLayout: layout,
    designRole: item.role,
    designSlot: item.slot,
    posterRole: item.role,
    posterField: item.slot,
    posterTemplateId: `design-${layout}`,
    selectable: !item.role.startsWith('decoration-'),
    evented: !item.role.startsWith('decoration-'),
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
    opacity: item.opacity ?? 1,
  };
}

function fitTextbox(box: FabricObject, maxHeight: number, minSize: number) {
  box.initDimensions();
  let guard = 0;
  while ((box.height ?? 0) > maxHeight && Number(box.fontSize) > minSize && guard < 200) {
    box.set('fontSize', Math.max(minSize, Number(box.fontSize) - Math.max(0.5, Number(box.fontSize) * 0.03)));
    box.initDimensions();
    guard += 1;
  }
}

function loadImage(fabric: FabricNamespace, url: string): Promise<FabricObject | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 15000);
    fabric.Image.fromURL(url, (img: FabricObject) => {
      clearTimeout(timer);
      resolve(img && img.width && img.height ? img : null);
    }, { crossOrigin: 'anonymous' });
  });
}

function loadSvg(fabric: FabricNamespace, svg: string): Promise<FabricObject | null> {
  return new Promise((resolve) => {
    fabric.loadSVGFromString(svg, (objects: FabricObject[], options: Record<string, unknown>) => {
      resolve(objects?.length ? fabric.util.groupSVGElements(objects, options) : null);
    });
  });
}

async function placeholder(fabric: FabricNamespace, item: Extract<Primitive, { type: 'image' }>, meta: Record<string, unknown>, textColor: string, font: string) {
  const { box } = item;
  const bg = new fabric.Rect({ left: 0, top: 0, width: box.w, height: box.h, rx: item.radius ?? 0, ry: item.radius ?? 0, fill: item.placeholderFill, originX: 'left', originY: 'top' });
  const parts: FabricObject[] = [bg];
  const iconSize = Math.min(box.w, box.h) * 0.18;
  const svg = iconSvg('photo', textColor, 1.5);
  const icon = svg ? await loadSvg(fabric, svg) : null;
  if (icon) {
    icon.set({ left: box.w / 2, top: box.h / 2 - iconSize * 0.3, originX: 'center', originY: 'center', opacity: 0.55 });
    icon.scaleToWidth(iconSize);
    parts.push(icon);
  }
  const label = new fabric.Text(item.placeholderText, { left: box.w / 2, top: box.h / 2 + iconSize * 0.55, originX: 'center', originY: 'top', fontSize: Math.max(12, Math.min(28, box.w / 14)), fontFamily: font, fill: textColor, opacity: 0.6 });
  parts.push(label);
  return new fabric.Group(parts, { left: box.x, top: box.y, ...meta, name: `${item.slot} (placeholder)`, designPlaceholder: true });
}

async function toFabric(fabric: FabricNamespace, spec: DesignSpec, pageId: string, layout: string, item: Primitive, options: FabricRenderOptions): Promise<FabricObject | null> {
  const meta = metadata(spec, pageId, layout, item);
  const theme = requireTheme(spec.theme);
  switch (item.type) {
    case 'rect':
      return new fabric.Rect({ left: item.box.x, top: item.box.y, width: item.box.w, height: item.box.h, rx: item.radius ?? 0, ry: item.radius ?? 0, fill: item.fill, stroke: item.stroke, strokeWidth: item.stroke ? item.strokeWidth ?? 1 : 0, ...meta });
    case 'text': {
      const ref = fontFamily(spec, item.font);
      const box = new fabric.Textbox(item.uppercase ? item.text.toUpperCase() : item.text, {
        left: item.box.x,
        top: item.box.y,
        width: item.box.w,
        fontSize: item.size,
        fontFamily: ref.family,
        fontWeight: item.weight,
        fill: item.color,
        lineHeight: item.lineHeight,
        textAlign: item.align,
        charSpacing: item.letterSpacing ? (item.letterSpacing / item.size) * 1000 : 0,
        splitByGrapheme: item.font === 'mono',
        ...meta,
      });
      fitTextbox(box, item.box.h + 1, item.minSize);
      return box;
    }
    case 'image': {
      const url = item.src ? (options.resolveImageUrl ? options.resolveImageUrl(item.src) : item.src) : '';
      const img = url ? await loadImage(fabric, url) : null;
      if (!img) return placeholder(fabric, item, meta, theme.color.muted, theme.font.body.family);
      const { box } = item;
      const ratio = item.fit === 'contain' ? Math.min(box.w / img.width, box.h / img.height) : Math.max(box.w / img.width, box.h / img.height);
      img.set({ ...meta, left: box.x + box.w / 2, top: box.y + box.h / 2, originX: 'center', originY: 'center', scaleX: ratio, scaleY: ratio, assetUrl: item.src });
      if (item.fit === 'cover' || item.radius) {
        img.clipPath = new fabric.Rect({ left: box.x, top: box.y, width: box.w, height: box.h, rx: item.radius ?? 0, ry: item.radius ?? 0, absolutePositioned: true });
      }
      return img;
    }
    case 'icon': {
      const svg = iconSvg(item.icon, item.color);
      const icon = svg ? await loadSvg(fabric, svg) : null;
      if (!icon) return null;
      const scale = Math.min(item.box.w / (icon.width || 24), item.box.h / (icon.height || 24));
      icon.set({ ...meta, left: item.box.x, top: item.box.y, scaleX: scale, scaleY: scale, designIcon: item.icon });
      return icon;
    }
    case 'line': {
      const [x1, y1, x2, y2] = item.points;
      const line = new fabric.Line([x1, y1, x2, y2], { stroke: item.stroke, strokeWidth: item.strokeWidth, strokeDashArray: item.dash, strokeLineCap: 'round' });
      if (!item.arrow) {
        line.set(meta);
        return line;
      }
      const size = Math.max(10, item.strokeWidth * 3.2);
      const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90;
      const head = new fabric.Triangle({ left: x2, top: y2, originX: 'center', originY: 'center', width: size, height: size, fill: item.stroke, angle });
      return new fabric.Group([line, head], meta);
    }
  }
}

/** Render one page into a Fabric canvas and return its serialized JSON. */
export async function renderDesignPage(fabric: FabricNamespace, spec: DesignSpec, pageIndex: number, options: FabricRenderOptions = {}): Promise<string> {
  const format = requireFormat(spec.format);
  const page = spec.pages[pageIndex];
  const layout = requireLayoutFamily(page.layout).id;
  const canvas = new fabric.StaticCanvas(document.createElement('canvas'), { width: format.width, height: format.height, renderOnAddRemove: false });
  try {
    const primitives = layoutPage(spec, pageIndex);
    const background = primitives.find((item) => item.role === 'background');
    if (background?.type === 'rect') canvas.backgroundColor = background.fill;
    for (const item of primitives) {
      const object = await toFabric(fabric, spec, page.id, layout, item, options);
      if (object) canvas.add(object);
    }
    const props = [...new Set([...(options.serializationProps ?? []), ...BASE_PROPERTIES, ...DESIGN_FABRIC_PROPERTIES])];
    const json = canvas.toJSON(props);
    json.width = format.width;
    json.height = format.height;
    json.background = canvas.backgroundColor;
    return JSON.stringify(json);
  } finally {
    canvas.dispose();
  }
}

function pageName(spec: DesignSpec, index: number): string {
  const page = spec.pages[index];
  const title = page.slots.title ?? page.slots.headline ?? page.slots.address;
  const label = typeof title === 'string' && title.trim() ? title.trim().slice(0, 40) : `Page ${index + 1}`;
  return spec.pages.length > 1 ? `${index + 1}. ${label}` : label;
}

/** Render every page and assemble the editor's project data string. */
export async function renderDesignToProjectData(fabric: FabricNamespace, spec: DesignSpec, options: FabricRenderOptions = {}): Promise<DesignProjectData> {
  await loadDesignFonts(spec);
  const format = requireFormat(spec.format);
  const pages: DesignPageData[] = [];
  for (let i = 0; i < spec.pages.length; i++) {
    pages.push({ id: `page-${spec.pages[i].id}`, name: pageName(spec, i), data: await renderDesignPage(fabric, spec, i, options) });
  }
  const first = JSON.parse(pages[0].data) as Record<string, unknown>;
  const now = new Date().toISOString();
  first.teckstudioPages = pages.map((page) => ({ ...page, updatedAt: now }));
  first.teckstudioActivePageId = pages[0].id;
  return { width: format.width, height: format.height, pages, projectData: JSON.stringify(first) };
}
