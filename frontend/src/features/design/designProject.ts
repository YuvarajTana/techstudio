import {fabric} from 'fabric';
import type {DesignSpec} from '@teckstudio/design-spec';
import {loadDesignFonts, renderDesignPage, renderDesignToProjectData} from '@teckstudio/design-spec/fabric';
import {apiJson} from '../../services/apiClient';
import {CUSTOM_FABRIC_PROPERTIES} from '../../utils/editorElementFactory';
import {resolveAssetUrl} from '../../utils/assetUrlResolver';

export const DESIGN_TYPES = {poster: 'design-poster', deck: 'design-deck'} as const;

export interface DesignContext {
  schema: 'design-context/v1';
  template_id?: string;
  design_spec: DesignSpec;
}

const renderOptions = {serializationProps: CUSTOM_FABRIC_PROPERTIES, resolveImageUrl: (src: string) => (src.startsWith('blob:') ? src : resolveAssetUrl(src))};

/** Render a DesignSpec into editable Fabric pages and save it as a new project. Returns the project id. */
export async function createDesignProject(spec: DesignSpec, templateId?: string): Promise<string> {
  const rendered = await renderDesignToProjectData(fabric, spec, renderOptions);
  const background = (JSON.parse(rendered.pages[0].data) as {background?: string}).background ?? '#ffffff';
  const context: DesignContext = {schema: 'design-context/v1', template_id: templateId, design_spec: spec};
  const result = await apiJson<{id: string}>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: spec.title || 'New design',
      design_type: spec.pages.length > 1 ? DESIGN_TYPES.deck : DESIGN_TYPES.poster,
      width: rendered.width,
      height: rendered.height,
      background_color: background,
      data: rendered.projectData,
      creative_context: context,
    }),
  });
  return result.id;
}

/** Template card thumbnails (stable keys). */
const thumbnailCache = new Map<string, Promise<string>>();
const MAX_CACHED_THUMBNAILS = 150;
/** Live previews get a new key per edit; keep only the last few. */
const previewCache = new Map<string, Promise<string>>();
const MAX_CACHED_PREVIEWS = 8;
let queue: Promise<unknown> = Promise.resolve();

/** A render that was superseded before its turn in the queue came. */
export class StaleRenderError extends Error {}

/** Render one page onto a Fabric canvas, one job at a time, and hand the canvas to `draw`. */
function withPageCanvas<T>(spec: DesignSpec, pageIndex: number, draw: (canvas: fabric.StaticCanvas, size: {width: number; height: number}) => T | Promise<T>, isStale?: () => boolean): Promise<T> {
  const job = queue.then(async () => {
    if (isStale?.()) throw new StaleRenderError('Preview superseded.');
    await loadDesignFonts(spec);
    const json = await renderDesignPage(fabric, spec, pageIndex, renderOptions);
    const data = JSON.parse(json) as {width: number; height: number};
    const canvas = new fabric.StaticCanvas(document.createElement('canvas'), {width: data.width, height: data.height, renderOnAddRemove: false});
    try {
      await new Promise<void>((resolve) => canvas.loadFromJSON(data, () => resolve()));
      canvas.renderAll();
      return await draw(canvas, data);
    } finally {
      canvas.dispose();
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/** Full-size PNG of a single-page design, downloaded without creating a project. */
export async function downloadDesignPng(spec: DesignSpec, fileName: string): Promise<void> {
  // A Blob URL, not a data URL: large print sizes exceed what browsers accept in a download data URL.
  const blob = await withPageCanvas(spec, 0, (canvas) => new Promise<Blob>((resolve, reject) => {
    (canvas.getElement() as HTMLCanvasElement).toBlob((value) => (value ? resolve(value) : reject(new Error('Could not encode the PNG.'))), 'image/png');
  }));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // Keep letters in any script (Telugu, Hindi…) so names survive the language phase.
  link.download = `${fileName.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\- ]+/gu, '').trim().replace(/\s+/g, '-').toLowerCase() || 'design'}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * PNG data URL of one page (the first by default). `preview` keeps it in a
 * small separate cache and skips the render if `isStale` says a newer
 * preview has replaced it while it waited.
 */
export function designThumbnail(key: string, spec: DesignSpec, maxEdge = 360, pageIndex = 0, options: {preview?: boolean; isStale?: () => boolean} = {}): Promise<string> {
  const cache = options.preview ? previewCache : thumbnailCache;
  const limit = options.preview ? MAX_CACHED_PREVIEWS : MAX_CACHED_THUMBNAILS;
  const cacheKey = `${key}@${maxEdge}#${pageIndex}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const job = withPageCanvas(spec, pageIndex, (canvas, size) => canvas.toDataURL({format: 'png', multiplier: maxEdge / Math.max(size.width, size.height)}), options.isStale);
  cache.set(cacheKey, job);
  while (cache.size > limit) cache.delete(cache.keys().next().value!);
  job.catch(() => cache.delete(cacheKey));
  return job;
}
