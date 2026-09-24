import {specFromPages, type CanvasPage, type DesignSpec, type ImageValue} from '@teckstudio/design-spec';
import {toCreativeVideo, type VideoMappingOptions} from '@teckstudio/design-spec/video';
import {apiJson} from '../../services/apiClient';
import type {DesignContext} from './designProject';

/**
 * Design images the video renderer may use: editor uploads (owned media, via
 * their asset id) and shared library photos. Other images (remote URLs,
 * placeholders) are left out, and listing scenes show a photo slot instead.
 */
export const resolveDesignImage: VideoMappingOptions['resolveImage'] = (image: ImageValue) => {
  if (image.assetId) return {source: 'uploaded', assetId: image.assetId};
  return undefined;
};

/** Turn a DesignSpec (poster or deck) into a motion video project and return its id. */
export async function createDesignVideo(spec: DesignSpec, templateId?: string): Promise<string> {
  const video = toCreativeVideo(spec, {resolveImage: resolveDesignImage});
  const context: DesignContext = {schema: 'design-context/v1', template_id: templateId, design_spec: spec};
  const result = await apiJson<{project_id: string}>('/api/creative-videos', {
    method: 'POST',
    body: JSON.stringify({spec: video, creative_context: context}),
  });
  return result.project_id;
}

/**
 * Video from an open Design Studio project: canvas text and photo edits are
 * read back into the stored spec first, so the video matches what is on screen.
 */
export async function createDesignVideoFromPages(spec: DesignSpec, pages: CanvasPage[], templateId?: string): Promise<string> {
  return createDesignVideo(specFromPages(spec, pages).spec, templateId);
}

/** The DesignSpec stored on a project created by the Design Studio, if any. */
export function designSpecFromContext(context: Record<string, unknown> | null | undefined): DesignSpec | undefined {
  if (!context || context.schema !== 'design-context/v1') return undefined;
  const spec = context.design_spec as DesignSpec | undefined;
  return spec && spec.schema === 'design-spec/v1' ? spec : undefined;
}
