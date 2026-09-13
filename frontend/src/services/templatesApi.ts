import { apiJson, apiUrl } from './apiClient';
import type {
  TemplateAsset,
  TemplateBrandKitListResponse,
  TemplateCategoriesResponse,
  TemplateFavouriteToggleResponse,
  TemplateListParams,
  TemplateListResponse,
  TemplateQuickReplaceRequest,
  TemplateRemixRequest,
  TemplateUseRequest,
  TemplateUseResponse,
} from '../components/templates/templateTypes';
import { normalizeTemplateTypeId } from '../components/templates/templateConstants';

const appendParam = (params: URLSearchParams, key: string, value?: string | number | boolean | null) => {
  if (value === undefined || value === null || value === '') return;
  params.set(key, String(value));
};

type BackendTemplateListResponse = Partial<TemplateListResponse> & {
  items?: TemplateAsset[];
  templates?: TemplateAsset[];
};

const normalizeTemplateListResponse = (payload: BackendTemplateListResponse): TemplateListResponse => {
  const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload.templates) ? payload.templates : []);
  const total = Number(payload.total || 0);
  const page = Number(payload.page || 1);
  const pageSize = Number(payload.page_size || payload.per_page || 24);
  const totalPages = Number(payload.total_pages || (total > 0 ? Math.ceil(total / pageSize) : 0));
  return {
    items,
    templates: items,
    total,
    page,
    page_size: pageSize,
    per_page: pageSize,
    total_pages: totalPages,
    has_more: Boolean(payload.has_more ?? (page * pageSize < total)),
  };
};

export function resolveTemplateAssetUrl(value?: string | null) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return apiUrl(value);
  return value;
}

export function getTemplatePreviewSource(template: TemplateAsset) {
  return resolveTemplateAssetUrl(template.preview_url || template.thumbnail_url || template.thumbnail);
}

export function listTemplates(params: TemplateListParams, signal?: AbortSignal) {
  const query = new URLSearchParams();
  appendParam(query, 'page', params.page || 1);
  appendParam(query, 'per_page', params.perPage || 24);
  appendParam(query, 'sort', params.sort || 'recommended');
  appendParam(query, 'search', params.query?.trim());
  const templateType = normalizeTemplateTypeId(params.templateType);
  if (templateType !== 'all') appendParam(query, 'type', templateType);
  if (params.categorySlug && params.categorySlug !== 'all') appendParam(query, 'category_slug', params.categorySlug);
  return apiJson<BackendTemplateListResponse>(`/api/templates?${query.toString()}`, { signal, timeoutMs: 45000 }).then(normalizeTemplateListResponse);
}

export function listTemplateCategories(signal?: AbortSignal) {
  return apiJson<TemplateCategoriesResponse>('/api/templates/categories', { signal, timeoutMs: 30000 });
}

export function getTemplateDetail(templateId: string, signal?: AbortSignal) {
  return apiJson<TemplateAsset>(`/api/templates/${templateId}`, { signal, timeoutMs: 30000 });
}

export function getRelatedTemplates(templateId: string, signal?: AbortSignal) {
  return apiJson<BackendTemplateListResponse>(`/api/templates/${templateId}/related?limit=8`, { signal, timeoutMs: 30000 }).then(normalizeTemplateListResponse);
}

export function favouriteTemplate(templateId: string) {
  return apiJson<TemplateFavouriteToggleResponse>(`/api/templates/${templateId}/favourite`, {
    method: 'POST',
  });
}

export function unfavouriteTemplate(templateId: string) {
  return apiJson<TemplateFavouriteToggleResponse>(`/api/templates/${templateId}/favourite`, {
    method: 'DELETE',
  });
}

export function createProjectFromTemplate(templateId: string, payload: TemplateUseRequest = {}) {
  return apiJson<TemplateUseResponse>(`/api/templates/${templateId}/use`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function applyTemplateToProject(templateId: string, projectId: string) {
  return apiJson<TemplateUseResponse>(`/api/templates/${templateId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  });
}

export function remixTemplate(templateId: string, payload: TemplateRemixRequest) {
  return apiJson<TemplateUseResponse>(`/api/templates/${templateId}/remix`, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 60000,
  });
}

export function quickReplaceTemplate(templateId: string, payload: TemplateQuickReplaceRequest) {
  return apiJson<TemplateUseResponse>(`/api/templates/${templateId}/quick-replace`, {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 60000,
  });
}

export function listTemplateBrandKits(signal?: AbortSignal) {
  return apiJson<TemplateBrandKitListResponse>('/api/brand-kits', { signal, timeoutMs: 30000 });
}
