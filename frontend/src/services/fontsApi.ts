import { apiFetch, apiJson } from './apiClient';
import type { FontItem } from '../types/editorFeatures';

export type FontListItem = FontItem & { isFavourite?: boolean; canDelete?: boolean };

export async function listFonts(params: { query?: string; category?: string; source?: FontItem['source']; collection?: 'all' | 'favorites' | 'recent' } = {}) {
  const search = new URLSearchParams();
  if (params.query) search.set('q', params.query);
  if (params.category) search.set('category', params.category);
  if (params.source) search.set('source', params.source);
  if (params.collection && params.collection !== 'all') search.set('collection', params.collection);
  return apiJson<{ fonts: FontListItem[]; categories: string[] }>(`/api/fonts?${search.toString()}`);
}

export async function uploadFont(payload: { file: File; family: string; displayName: string; category: string; weight: number; style: 'normal' | 'italic'; licence: string }) {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('family', payload.family);
  form.append('display_name', payload.displayName);
  form.append('category', payload.category);
  form.append('weight', String(payload.weight));
  form.append('style_name', payload.style);
  form.append('licence', payload.licence);
  const response = await apiFetch('/api/fonts/upload', { method: 'POST', body: form, timeoutMs: 45000 });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || `Font upload failed (${response.status}).`);
  return data as FontListItem;
}

export async function deleteFont(fontId: string) {
  return apiJson<{ success: boolean; fontId: string }>(`/api/fonts/${encodeURIComponent(fontId)}`, { method: 'DELETE' });
}

export async function setFontFavourite(fontId: string, favourite: boolean) {
  return apiJson<{ success: boolean; fontId: string; isFavourite: boolean }>(`/api/fonts/${encodeURIComponent(fontId)}/favorite`, { method: favourite ? 'POST' : 'DELETE' });
}

export async function recordFontUse(fontId: string) {
  return apiJson<{ success: boolean; fontId: string }>(`/api/fonts/${encodeURIComponent(fontId)}/use`, { method: 'POST' });
}
