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
let queue: Promise<unknown> = Promise.resolve();

/** PNG data URL of the first page, rendered one at a time to keep the UI responsive. */
export function designThumbnail(key: string, spec: DesignSpec, maxEdge = 360): Promise<string> {
  const cached = thumbnailCache.get(key);
  if (cached) return cached;
  const job = queue.then(async () => {
    await loadDesignFonts(spec);
    const json = await renderDesignPage(fabric, spec, 0, renderOptions);
    const data = JSON.parse(json) as {width: number; height: number};
    const canvas = new fabric.StaticCanvas(document.createElement('canvas'), {width: data.width, height: data.height, renderOnAddRemove: false});
    try {
      await new Promise<void>((resolve) => canvas.loadFromJSON(data, () => resolve()));
      canvas.renderAll();
      return canvas.toDataURL({format: 'png', multiplier: maxEdge / Math.max(data.width, data.height)});
    } finally {
      canvas.dispose();
    }
  });
  queue = job.catch(() => undefined);
  thumbnailCache.set(key, job);
  job.catch(() => thumbnailCache.delete(key));
  return job;
}
