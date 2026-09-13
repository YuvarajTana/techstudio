import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, Loader2, Search, Sparkles, Star } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useEditorStore } from '../../store/useEditorStore';
import { getAuthToken } from '../../services/apiClient';
import {
  listStickerCategories,
  listStickers,
  recordStickerUse,
  setStickerFavourite,
  type StickerCategory,
  type StickerListItem,
} from '../../services/stickersApi';
import { addStickerToCanvas } from '../../utils/stickerCanvas';
import { StickerEditingControls } from './StickerEditingControls';

type Collection = 'all' | 'featured' | 'favorites' | 'recent';

export const StickersPanel: React.FC = () => {
  const { canvas, saveHistory, setSelectedObject } = useEditorStore();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [category, setCategory] = useState('');
  const [collection, setCollection] = useState<Collection>('all');
  const [categories, setCategories] = useState<StickerCategory[]>([]);
  const [stickers, setStickers] = useState<StickerListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listStickerCategories()
      .then((result) => setCategories(result.categories.filter((item) => item.count > 0)))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load sticker categories.'));
  }, []);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const result = await listStickers({
        query: debouncedQuery.trim() || undefined,
        category: category || undefined,
        collection,
        page: nextPage,
        perPage: 24,
      });
      setStickers((current) => append ? [...current, ...result.stickers] : result.stickers);
      setPage(result.page);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (reason) {
      if (!append) setStickers([]);
      setError(reason instanceof Error ? reason.message : 'Unable to load stickers.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, collection, debouncedQuery]);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const addSticker = async (sticker: StickerListItem) => {
    if (!canvas) {
      setError('The canvas is not ready yet.');
      return;
    }
    setError('');
    try {
      const object = await addStickerToCanvas(canvas, sticker);
      setSelectedObject(object);
      saveHistory();
      if (getAuthToken()) void recordStickerUse(sticker.id).catch(() => undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The sticker could not be added to the canvas.');
    }
  };

  const toggleFavourite = async (sticker: StickerListItem) => {
    if (!getAuthToken()) {
      setError('Sign in to save sticker favourites.');
      return;
    }
    const next = !sticker.isFavourite;
    setStickers((current) => current.map((item) => item.id === sticker.id ? { ...item, isFavourite: next } : item));
    try {
      await setStickerFavourite(sticker.id, next);
      if (collection === 'favorites' && !next) {
        setStickers((current) => current.filter((item) => item.id !== sticker.id));
        setTotal((current) => Math.max(0, current - 1));
      }
    } catch (reason) {
      setStickers((current) => current.map((item) => item.id === sticker.id ? { ...item, isFavourite: !next } : item));
      setError(reason instanceof Error ? reason.message : 'Unable to update sticker favourite.');
    }
  };

  const collectionItems = useMemo(() => [
    { id: 'all' as const, label: 'All', icon: Sparkles },
    { id: 'featured' as const, label: 'Featured', icon: Star },
    { id: 'favorites' as const, label: 'Favorites', icon: Heart },
    { id: 'recent' as const, label: 'Recent', icon: null },
  ], []);

  return (
    <div className="flex flex-col gap-4">
      <StickerEditingControls />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stickers..."
          aria-label="Search stickers"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs text-zinc-100 outline-none transition focus:border-violet-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {collectionItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setCollection(item.id); setCategory(''); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${collection === item.id ? 'border-violet-500/50 bg-violet-500/15 text-violet-200' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              {Icon && <Icon className="h-3 w-3" />}{item.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${!category ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200' : 'border-zinc-800 text-zinc-500'}`}
        >
          All categories
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setCategory(item.id); setCollection('all'); }}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${category === item.id ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200' : 'border-zinc-800 text-zinc-500 hover:text-zinc-200'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span>{loading ? 'Loading stickers…' : `${stickers.length}/${total} stickers`}</span>
        {(query || category) && <button type="button" onClick={() => { setQuery(''); setCategory(''); }} className="font-semibold text-violet-300">Clear filters</button>}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200">
          {error}
          <button type="button" onClick={() => void load(1, false)} className="ml-2 font-bold underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-2" aria-label="Loading stickers">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-xl bg-zinc-900" />)}
        </div>
      ) : stickers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-zinc-600" />
          <p className="mt-2 text-xs font-bold text-zinc-300">No stickers found.</p>
          <p className="mt-1 text-[10px] text-zinc-500">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {stickers.map((sticker) => (
            <div key={sticker.id} className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition hover:border-violet-500/60">
              <button
                type="button"
                onClick={() => void addSticker(sticker)}
                onDoubleClick={() => void addSticker(sticker)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-teckstudio-sticker', JSON.stringify(sticker));
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                className="block w-full p-2"
                title={`Add ${sticker.name} to canvas`}
              >
                <img src={sticker.thumbnailUrl} alt={sticker.name} loading="lazy" className="aspect-square w-full object-contain" />
                <span className="mt-1 block truncate text-left text-[10px] font-semibold text-zinc-300">{sticker.name}</span>
              </button>
              <button
                type="button"
                onClick={() => void toggleFavourite(sticker)}
                aria-label={sticker.isFavourite ? `Remove ${sticker.name} from favorites` : `Add ${sticker.name} to favorites`}
                className={`absolute right-2 top-2 rounded-full border p-1.5 backdrop-blur ${sticker.isFavourite ? 'border-rose-400/50 bg-rose-500/20 text-rose-300' : 'border-white/15 bg-black/35 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100'}`}
              >
                <Heart className="h-3 w-3" fill={sticker.isFavourite ? 'currentColor' : 'none'} />
              </button>
              {sticker.isPremium && <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-black text-amber-950">PREMIUM</span>}
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <button type="button" disabled={loadingMore} onClick={() => void load(page + 1, true)} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-2 text-xs font-bold text-zinc-300 hover:border-violet-500/50 disabled:opacity-50">
          {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
};
