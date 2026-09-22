import {apiFetch, apiJson} from '../../services/apiClient';
import type {Brand, CatalogItem, CreativeMedia} from './types';

export const creativeApi = {
  brands: () => apiJson<{brand_kits: Brand[]}>('/api/brand-kits'),
  catalog: (id: string) => apiJson<{items: CatalogItem[]}>(`/api/brand-kits/${id}/catalog`),
  media: (kind: 'image' | 'audio' = 'image') => apiJson<{items: CreativeMedia[]}>(`/api/creative/media?kind=${kind}&limit=100`),
  async upload(file: File, role = 'creative', projectId?: string) {
    const body = new FormData(); body.append('file', file); body.append('role', role);
    if (projectId) body.append('project_id', projectId);
    const response = await apiFetch('/api/creative/media', {method: 'POST', body, timeoutMs: 120000});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || 'Unable to upload media.');
    return payload as CreativeMedia;
  },
  async blob(media: Pick<CreativeMedia, 'content_url'>) {
    const response = await apiFetch(media.content_url);
    if (!response.ok) throw new Error('Media is unavailable. Choose another owned asset.');
    return response.blob();
  },
  async dataUrl(media: Pick<CreativeMedia, 'content_url'>) {
    const blob = await this.blob(media);
    return new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read media.')); reader.readAsDataURL(blob);});
  },
};
