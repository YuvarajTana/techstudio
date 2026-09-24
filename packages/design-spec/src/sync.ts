/**
 * Read edits made on the canvas back into a DesignSpec.
 *
 * Every object rendered from a spec is tagged with the slot it shows
 * (`designSlot`, mirrored as `posterField`). Text and image edits on the
 * canvas are copied back into those slots so re-layout, reformatting and
 * video use the current content. Objects without a slot tag are ignored.
 */
import type { DesignPage, DesignSpec, ImageValue } from './types';

export interface CanvasPage {
  /** Editor page id: `page-<spec page id>` for Design Studio projects. */
  id: string;
  /** Serialized Fabric JSON. */
  data: string;
}

interface CanvasObject {
  type?: string;
  text?: string;
  src?: string;
  assetUrl?: string;
  sourceUrl?: string;
  assetId?: string;
  designSlot?: string;
  posterField?: string;
  designPageId?: string;
  designPlaceholder?: boolean;
}

/** Slots rendered from derived data (fact chips) or not user content. */
const SKIPPED = [/^facts\./, /\.icon$/, /^code\.language$/, /^brand\./];
const IMAGE_SLOT = /^(hero|image|photos\.\d+)$/;

function specPageFor(spec: DesignSpec, canvasPage: CanvasPage, object: CanvasObject): DesignPage | undefined {
  const byTag = object.designPageId ? spec.pages.find((page) => page.id === object.designPageId) : undefined;
  if (byTag) return byTag;
  const id = canvasPage.id.startsWith('page-') ? canvasPage.id.slice(5) : canvasPage.id;
  return spec.pages.find((page) => page.id === id);
}

function readPath(root: unknown, parts: string[]): unknown {
  let node = root;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/**
 * Write `value` at `path` inside `slots`. A path may end one level deeper than
 * a string item (e.g. `callouts.1.title` for a list rendered as cards); in that
 * case the string itself is replaced. Returns false if the path does not exist.
 */
function writeText(slots: Record<string, unknown>, path: string, value: string): boolean {
  const parts = path.split('.');
  for (let cut = parts.length; cut >= 1; cut -= 1) {
    const parentPath = parts.slice(0, cut - 1);
    const key = parts[cut - 1];
    const parent = readPath(slots, parentPath);
    if (parent === null || typeof parent !== 'object') continue;
    const current = (parent as Record<string, unknown>)[key];
    if (typeof current !== 'string') continue;
    if (cut < parts.length && parts.slice(cut).some((p) => p !== 'title')) return false;
    // Uppercase styling is applied at render time; keep the stored casing.
    if (current === value || current.toUpperCase() === value) return false;
    (parent as Record<string, unknown>)[key] = value;
    return true;
  }
  return false;
}

function writeImage(slots: Record<string, unknown>, path: string, image: ImageValue): boolean {
  const parts = path.split('.');
  const parent = readPath(slots, parts.slice(0, -1));
  if (parent === null || typeof parent !== 'object') return false;
  const key = parts[parts.length - 1];
  const current = (parent as Record<string, unknown>)[key] as ImageValue | undefined;
  if (current && current.src === image.src && current.assetId === image.assetId) return false;
  (parent as Record<string, unknown>)[key] = { ...(current ?? {}), ...image };
  return true;
}

/**
 * Copy canvas text and image edits into a copy of `spec`.
 * `changed` lists `pageId/slot` for every value that differs from the spec.
 */
export function specFromPages(spec: DesignSpec, pages: CanvasPage[]): { spec: DesignSpec; changed: string[] } {
  const next = JSON.parse(JSON.stringify(spec)) as DesignSpec;
  const changed: string[] = [];
  for (const canvasPage of pages) {
    let objects: CanvasObject[] = [];
    try {
      objects = (JSON.parse(canvasPage.data || '{}') as { objects?: CanvasObject[] }).objects ?? [];
    } catch {
      continue;
    }
    for (const object of objects) {
      const slot = object.designSlot ?? object.posterField;
      if (!slot || SKIPPED.some((rule) => rule.test(slot))) continue;
      const page = specPageFor(next, canvasPage, object);
      if (!page) continue;
      const slots = page.slots as Record<string, unknown>;
      if (object.type === 'textbox' && typeof object.text === 'string') {
        if (writeText(slots, slot, object.text)) changed.push(`${page.id}/${slot}`);
      } else if (object.type === 'image' && IMAGE_SLOT.test(slot) && !object.designPlaceholder) {
        const src = object.assetUrl || object.sourceUrl || object.src;
        if (!src || src.startsWith('data:')) continue;
        const image: ImageValue = { src, ...(object.assetId ? { assetId: object.assetId } : {}) };
        if (writeImage(slots, slot, image)) changed.push(`${page.id}/${slot}`);
      }
    }
  }
  return { spec: next, changed };
}
