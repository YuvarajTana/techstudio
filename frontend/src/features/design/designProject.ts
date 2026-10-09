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

const thumbnailCache = new Map<string, Promise<string>>();
/** Live previews add an entry per edit; keep only the most recent renders. */
const MAX_CACHED_THUMBNAILS = 150;
let queue: Promise<unknown> = Promise.resolve();

/** Render one page to a PNG data URL whose longer edge is `maxEdge` (the page's own size when omitted). */
function renderPagePng(spec: DesignSpec, pageIndex: number, maxEdge?: number): Promise<string> {
  const job = queue.then(async () => {
    await loadDesignFonts(spec);
    const json = await renderDesignPage(fabric, spec, pageIndex, renderOptions);
    const data = JSON.parse(json) as {width: number; height: number};
    const canvas = new fabric.StaticCanvas(document.createElement('canvas'), {width: data.width, height: data.height, renderOnAddRemove: false});
    try {
      await new Promise<void>((resolve) => canvas.loadFromJSON(data, () => resolve()));
      canvas.renderAll();
      return canvas.toDataURL({format: 'png', multiplier: maxEdge ? maxEdge / Math.max(data.width, data.height) : 1});
    } finally {
      canvas.dispose();
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/** Full-size PNG of a single-page design, downloaded without creating a project. */
export async function downloadDesignPng(spec: DesignSpec, fileName: string): Promise<void> {
  const url = await renderPagePng(spec, 0);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'design'}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** PNG data URL of one page (the first by default), rendered one at a time to keep the UI responsive. */
export function designThumbnail(key: string, spec: DesignSpec, maxEdge = 360, pageIndex = 0): Promise<string> {
  const cacheKey = `${key}@${maxEdge}#${pageIndex}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached) return cached;
  const job = renderPagePng(spec, pageIndex, maxEdge);
  thumbnailCache.set(cacheKey, job);
  while (thumbnailCache.size > MAX_CACHED_THUMBNAILS) thumbnailCache.delete(thumbnailCache.keys().next().value!);
  job.catch(() => thumbnailCache.delete(cacheKey));
  return job;
}
