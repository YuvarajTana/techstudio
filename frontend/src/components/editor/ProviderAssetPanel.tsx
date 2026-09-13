import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, Film, ImageIcon, Loader2, Plus, Search, Shapes, Sparkles } from 'lucide-react';
import { fabric } from 'fabric';
import { ApiError, apiJson } from '../../services/apiClient';
import { loadSVGElement } from '../../utils/svgElementUtils';

type ProviderName = 'iconify' | 'unsplash' | 'lottiefiles';
type ProviderAssetKind = 'shape' | 'graphic' | 'photo' | 'animation';

interface ProviderAsset {
  id: string;
  title: string;
  provider: ProviderName;
  kind: ProviderAssetKind;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  sourceUrl: string;
  sourcePageUrl?: string | null;
  mimeType?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
  attributionRequired?: boolean;
  attributionText?: string | null;
  width?: number | null;
  height?: number | null;
  metadata?: Record<string, unknown>;
}

interface ProviderAssetResponse {
  provider: ProviderName;
  kind: ProviderAssetKind;
  query: string;
  page: number;
  perPage: number;
  items: ProviderAsset[];
}

interface ProviderAssetPanelProps {
  canvas: fabric.Canvas | null;
  saveHistory: () => void;
}

const PROVIDER_TABS: Array<{
  id: ProviderAssetKind;
  label: string;
  provider: ProviderName;
  defaultQuery: string;
  icon: React.ElementType;
}> = [
  { id: 'shape', label: 'Shapes', provider: 'iconify', defaultQuery: 'geometric shape', icon: Shapes },
  { id: 'graphic', label: 'Graphics', provider: 'iconify', defaultQuery: 'illustration', icon: Sparkles },
  { id: 'photo', label: 'Photos', provider: 'unsplash', defaultQuery: 'technology workspace', icon: ImageIcon },
  { id: 'animation', label: 'Animations', provider: 'lottiefiles', defaultQuery: 'loader', icon: Film },
];

const PROVIDER_LABELS: Record<ProviderName, string> = {
  iconify: 'Iconify',
  unsplash: 'Unsplash',
  lottiefiles: 'LottieFiles',
};

const fileLooksLikeImage = (url: string) =>
  /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(url) || url.startsWith('data:image/');

const fileLooksLikeSvg = (asset: ProviderAsset) =>
  asset.mimeType === 'image/svg+xml' || /\.svg(\?|#|$)/i.test(asset.sourceUrl);

const placeObjectOnCanvas = (canvas: fabric.Canvas, object: fabric.Object, targetSize = 220) => {
  const canvasWidth = canvas.width || 800;
  const canvasHeight = canvas.height || 800;
  const objectWidth = object.width || targetSize;
  const objectHeight = object.height || targetSize;
  const scale = Math.min(targetSize / objectWidth, targetSize / objectHeight, 1);

  object.set({
    left: canvasWidth / 2 - (objectWidth * scale) / 2,
    top: canvasHeight / 2 - (objectHeight * scale) / 2,
    scaleX: scale,
    scaleY: scale,
  });
  object.setCoords();
};

const createAnimationPlaceholder = (asset: ProviderAsset) => {
  const rect = new fabric.Rect({
    width: 260,
    height: 150,
    rx: 16,
    ry: 16,
    fill: '#15151f',
    stroke: '#8B5CF6',
    strokeWidth: 2,
  });
  const title = new fabric.Textbox(asset.title, {
    left: 18,
    top: 42,
    width: 224,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 20,
    fontWeight: '700',
    fill: '#F4F4F5',
    textAlign: 'center',
  });
  const caption = new fabric.Textbox('Lottie animation', {
    left: 18,
    top: 96,
    width: 224,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 12,
    fill: '#A78BFA',
    textAlign: 'center',
  });

  return new fabric.Group([rect, title, caption], {
    id: `provider_${asset.id}_${Date.now()}`,
    name: asset.title,
    externalAssetProvider: asset.provider,
    externalAssetKind: asset.kind,
    externalAssetSourceUrl: asset.sourceUrl,
    externalAssetPageUrl: asset.sourcePageUrl,
    externalAssetLicense: asset.licenseName,
    externalAssetAttribution: asset.attributionText,
    animationDataUrl: asset.sourceUrl,
  } as fabric.IGroupOptions & Record<string, unknown>);
};

const ProviderAssetPanel: React.FC<ProviderAssetPanelProps> = ({ canvas, saveHistory }) => {
  const [activeKind, setActiveKind] = useState<ProviderAssetKind>('shape');
  const [query, setQuery] = useState(PROVIDER_TABS[0].defaultQuery);
  const [items, setItems] = useState<ProviderAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<ProviderAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  const activeTab = useMemo(
    () => PROVIDER_TABS.find((tab) => tab.id === activeKind) || PROVIDER_TABS[0],
    [activeKind],
  );

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        provider: activeTab.provider,
        kind: activeTab.id,
        q: query.trim() || activeTab.defaultQuery,
        page: '1',
        per_page: '30',
      });
      const response = await apiJson<ProviderAssetResponse>(`/api/provider-assets/search?${params.toString()}`, {
        auth: false,
        timeoutMs: 20000,
      });
      setItems(response.items);
      setSelectedAsset(response.items[0] || null);
    } catch (err) {
      const message = err instanceof ApiError ? String(err.message) : 'Provider search failed.';
      setItems([]);
      setSelectedAsset(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, query]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleTabClick = (kind: ProviderAssetKind) => {
    const nextTab = PROVIDER_TABS.find((tab) => tab.id === kind) || PROVIDER_TABS[0];
    setActiveKind(kind);
    setQuery(nextTab.defaultQuery);
    setSelectedAsset(null);
    setError('');
  };

  const addAssetToCanvas = async (asset: ProviderAsset) => {
    if (!canvas) return;
    setAddingId(asset.id);
    try {
      let object: fabric.Object | null = null;
      if (fileLooksLikeSvg(asset)) {
        object = await loadSVGElement(asset.sourceUrl, {
          id: `provider_${asset.id}_${Date.now()}`,
          name: asset.title,
        });
      } else {
        const imageUrl = asset.previewUrl || asset.thumbnailUrl || asset.sourceUrl;
        if (imageUrl && fileLooksLikeImage(imageUrl)) {
          object = await new Promise<fabric.Image | null>((resolve) => {
            fabric.Image.fromURL(
              imageUrl,
              (image) => resolve(image || null),
              { crossOrigin: 'anonymous' },
            );
          });
        }
      }

      if (!object) {
        object = createAnimationPlaceholder(asset);
      }

      placeObjectOnCanvas(canvas, object, asset.kind === 'photo' ? 320 : 220);
      object.set({
        id: (object as fabric.Object & { id?: string }).id || `provider_${asset.id}_${Date.now()}`,
        name: asset.title,
        externalAssetProvider: asset.provider,
        externalAssetKind: asset.kind,
        externalAssetSourceUrl: asset.sourceUrl,
        externalAssetPageUrl: asset.sourcePageUrl,
        externalAssetLicense: asset.licenseName,
        externalAssetAttribution: asset.attributionText,
      } as Record<string, unknown>);
      object.setCoords();
      canvas.add(object);
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
      saveHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add asset to canvas.');
    } finally {
      setAddingId(null);
    }
  };

  const selectedPreview = selectedAsset?.previewUrl || selectedAsset?.thumbnailUrl || selectedAsset?.sourceUrl;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5">
        {PROVIDER_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[10px] font-bold transition-all ${
                activeKind === tab.id
                  ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-500 hover:border-white/[0.16] hover:text-zinc-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          loadAssets();
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${activeTab.label.toLowerCase()}`}
            className="w-full rounded-xl border border-white/[0.08] bg-[#12121B] py-2.5 pl-9 pr-3 text-xs text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-500/60"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-600/20 text-violet-200 transition-colors hover:bg-violet-600/30 disabled:opacity-50"
          title="Search provider"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </form>

      {selectedAsset && (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035]">
          <div className="flex h-32 items-center justify-center bg-black/25">
            {selectedPreview && fileLooksLikeImage(selectedPreview) ? (
              <img src={selectedPreview} alt={selectedAsset.title} className="max-h-full max-w-full object-contain p-3" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-200">
                <Film className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="space-y-2 p-3">
            <div>
              <p className="line-clamp-2 text-xs font-bold text-zinc-100">{selectedAsset.title}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {PROVIDER_LABELS[selectedAsset.provider]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addAssetToCanvas(selectedAsset)}
                disabled={!canvas || addingId === selectedAsset.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingId === selectedAsset.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </button>
              {selectedAsset.sourcePageUrl && (
                <a
                  href={selectedAsset.sourcePageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-500 transition-colors hover:border-white/[0.16] hover:text-zinc-200"
                  title="Open source page"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-zinc-500">
        <span>{loading ? 'Loading...' : `${items.length} ${activeTab.label.toLowerCase()}`}</span>
        <span>{PROVIDER_LABELS[activeTab.provider]}</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-center">
          <Eye className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
          <p className="text-xs font-semibold text-zinc-400">No provider assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((asset) => {
            const thumb = asset.thumbnailUrl || asset.previewUrl || asset.sourceUrl;
            const isSelected = selectedAsset?.id === asset.id;
            return (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                onDoubleClick={() => addAssetToCanvas(asset)}
                className={`group relative flex h-24 items-center justify-center overflow-hidden rounded-xl border bg-[#12121B] transition-all ${
                  isSelected
                    ? 'border-violet-400/70 ring-2 ring-violet-500/20'
                    : 'border-white/[0.08] hover:border-white/[0.18]'
                }`}
                title={asset.title}
              >
                {thumb && fileLooksLikeImage(thumb) ? (
                  <img src={thumb} alt={asset.title} className="h-full w-full object-contain p-2" loading="lazy" />
                ) : (
                  <Film className="h-7 w-7 text-violet-300" />
                )}
                <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/70 px-1.5 py-1 text-left text-[9px] font-semibold text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100">
                  {asset.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderAssetPanel;
