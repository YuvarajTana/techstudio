import { apiJson } from './apiClient';
import type { StickerItem } from '../types/editorFeatures';

export type StickerCategory = {
  id: string;
  label: string;
  count: number;
};

export type StickerListItem = StickerItem & {
  isFavourite?: boolean;
};

export type StickerListResponse = {
  stickers: StickerListItem[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

export async function listStickerCategories() {
  return apiJson<{ categories: StickerCategory[] }>('/api/stickers/categories');
}

export async function listStickers(params: {
  query?: string;
  category?: string;
  collection?: 'all' | 'featured' | 'favorites' | 'recent';
  page?: number;
  perPage?: number;
} = {}) {
  const search = new URLSearchParams();
  if (params.query) search.set('q', params.query);
  if (params.category) search.set('category', params.category);
  if (params.collection && params.collection !== 'all') search.set('collection', params.collection);
  search.set('page', String(params.page || 1));
  search.set('per_page', String(params.perPage || 24));
  return apiJson<StickerListResponse>(`/api/stickers?${search.toString()}`, { timeoutMs: 30000 });
}

export async function setStickerFavourite(stickerId: string, isFavourite: boolean) {
  return apiJson<{ success: boolean; stickerId: string; isFavourite: boolean }>(
    `/api/stickers/${encodeURIComponent(stickerId)}/favorite`,
    { method: isFavourite ? 'POST' : 'DELETE' },
  );
}

export async function recordStickerUse(stickerId: string) {
  return apiJson<{ success: boolean; stickerId: string }>(
    `/api/stickers/${encodeURIComponent(stickerId)}/use`,
    { method: 'POST' },
  );
}
