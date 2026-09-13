import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getTemplatePreviewSource } from '../../services/templatesApi';
import { getTemplateOrientation } from '../../utils/templateCompatibility';
import type { TemplateAsset } from './templateTypes';
import { TemplateFavouriteButton } from './TemplateFavouriteButton';

interface TemplateCardProps {
  template: TemplateAsset;
  onPreview: (template: TemplateAsset) => void;
  onUse: (template: TemplateAsset) => void;
  onFavouriteChange: (templateId: string, isFavourite: boolean) => void;
  onFavouriteError?: (message: string) => void;
  using?: boolean;
  compact?: boolean;
}

export function TemplateCard({ template, onPreview, onUse, onFavouriteChange, onFavouriteError, using = false, compact = false }: TemplateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = getTemplatePreviewSource(template);
  const categoryLabel = template.category?.name || 'Template';
  const typeLabel = (template.template_type || 'template').replace(/-/g, ' ');
  const orientation = getTemplateOrientation(template.width, template.height);
  const aspectClass = orientation === 'landscape' ? 'aspect-[16/10]' : orientation === 'square' ? 'aspect-square' : 'aspect-[3/4]';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70 p-3 transition-all hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-950/20">
      <button type="button" onClick={() => onPreview(template)} className="relative block overflow-hidden rounded-2xl text-left focus:outline-none focus:ring-2 focus:ring-violet-400/40">
        <div className={`${aspectClass} overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900`}>
          {imageSource && !imageFailed ? (
            <img
              src={imageSource}
              alt={template.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-600/20 via-zinc-900 to-fuchsia-600/10 p-6 text-center text-zinc-500">
              <ImageIcon className="h-9 w-9 text-violet-300/70" />
              <span className="mt-3 text-xs font-semibold text-zinc-400">Preview unavailable</span>
            </div>
          )}
        </div>
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${template.is_premium ? 'bg-amber-400 text-zinc-950' : 'bg-emerald-400 text-zinc-950'}`}>
          {template.is_premium ? 'Premium' : 'Free'}
        </span>
      </button>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-white" title={template.name}>{template.name}</h3>
            <p className="mt-1 truncate text-xs capitalize text-zinc-500">{categoryLabel} · {typeLabel}</p>
          </div>
          <TemplateFavouriteButton templateId={template.id} isFavourite={template.is_favourite} onChange={onFavouriteChange} onError={onFavouriteError} />
        </div>

        {!compact && template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {template.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">{tag}</span>)}
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <button type="button" onClick={() => onPreview(template)} className="h-9 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
            Preview
          </button>
          <button type="button" onClick={() => onUse(template)} disabled={using} className="h-9 rounded-xl bg-violet-600 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
            {using ? 'Creating…' : 'Use Template'}
          </button>
        </div>
      </div>
    </article>
  );
}
