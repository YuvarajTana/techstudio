import type {DesignSpec} from '@teckstudio/design-spec';
import {toCreativeVideo} from '@teckstudio/design-spec/video';
import {apiJson} from '../../services/apiClient';
import type {DesignContext} from './designProject';

/**
 * Turn a DesignSpec (poster or deck) into a motion video project and return its id.
 * Template photos are placeholders, so listing scenes start with a photo slot the
 * user fills in the video editor (uploads become owned media assets there).
 */
export async function createDesignVideo(spec: DesignSpec, templateId?: string): Promise<string> {
  const video = toCreativeVideo(spec);
  const context: DesignContext = {schema: 'design-context/v1', template_id: templateId, design_spec: spec};
  const result = await apiJson<{project_id: string}>('/api/creative-videos', {
    method: 'POST',
    body: JSON.stringify({spec: video, creative_context: context}),
  });
  return result.project_id;
}

/** The DesignSpec stored on a project created by the Design Studio, if any. */
export function designSpecFromContext(context: Record<string, unknown> | null | undefined): DesignSpec | undefined {
  if (!context || context.schema !== 'design-context/v1') return undefined;
  const spec = context.design_spec as DesignSpec | undefined;
  return spec && spec.schema === 'design-spec/v1' ? spec : undefined;
}
