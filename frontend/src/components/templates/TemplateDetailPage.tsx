import { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { getTemplatePreviewSource } from '../../services/templatesApi';
import type { TemplateAsset } from './templateTypes';
import { TemplateEmptyState } from './TemplateEmptyState';
import { TemplateErrorState } from './TemplateErrorState';
import { TemplateFavouriteButton } from './TemplateFavouriteButton';
import { TemplateLoadingSkeleton } from './TemplateLoadingSkeleton';
import { RelatedTemplates } from './RelatedTemplates';
import { TemplatePhaseTwoActions } from './TemplatePhaseTwoActions';
import type { TemplateProject } from './templateTypes';

interface TemplateDetailPageProps {
  template: TemplateAsset | null;
  relatedTemplates: TemplateAsset[];
  loading: boolean;
  error: string;
  usingTemplateId: string | null;
  onClose?: () => void;
  onPreview: (template: TemplateAsset) => void;
  onUse: (template: TemplateAsset) => void;
  onRemix: (template: TemplateAsset) => void;
  onProjectCreated: (project: TemplateProject) => void;
  onFavouriteChange: (templateId: string, isFavourite: boolean) => void;
  onFavouriteError?: (message: string) => void;
  notify?: (message: string, type?: 'success' | 'error') => void;
}

export function TemplateDetailPage({ template, relatedTemplates, loading, error, usingTemplateId, onClose, onPreview, onUse, onRemix, onProjectCreated, onFavouriteChange, onFavouriteError, notify }: TemplateDetailPageProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (loading) return <div className="p-6"><TemplateLoadingSkeleton count={4} /></div>;
  if (error) return <div className="p-6"><TemplateErrorState message={error} /></div>;
  if (!template) return <div className="p-6"><TemplateEmptyState title="Template not found" description="The selected template may have been removed or is unavailable." /></div>;

  const imageSource = getTemplatePreviewSource(template);
  const isCreating = usingTemplateId === template.id;

  return (
    <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="bg-zinc-900/90 p-5 sm:p-6">
        <div className="aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950">
          {imageSource && !imageFailed ? (
            <img src={imageSource} alt={template.name} onError={() => setImageFailed(true)} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-600/20 via-zinc-900 to-fuchsia-600/10 text-zinc-500">
              <ImageIcon className="h-12 w-12 text-violet-300/70" />
              <span className="mt-4 text-sm font-semibold text-zinc-400">Preview unavailable</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">{template.category?.name || template.template_type || 'Template'}</p>
            <h3 className="mt-2 text-2xl font-black text-white">{template.name}</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{template.description || 'Editable professional design template.'}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-800 p-2 text-zinc-400 hover:text-white" aria-label="Close template preview">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          {[
            ['Type', (template.template_type || 'template').replace(/-/g, ' ')],
            ['Category', template.category?.name || 'Uncategorized'],
            ['Dimensions', `${template.width} × ${template.height}`],
            ['Access', template.is_premium ? 'Premium' : 'Free'],
            ['Uses', String(template.use_count || 0)],
            ['Status', template.status],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 capitalize">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</div>
              <div className="mt-1 font-semibold text-zinc-200">{value}</div>
            </div>
          ))}
        </div>

        {template.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {template.tags.map((tag) => <span key={tag} className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-semibold text-violet-200">{tag}</span>)}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr]">
          <TemplateFavouriteButton templateId={template.id} isFavourite={template.is_favourite} onChange={onFavouriteChange} onError={onFavouriteError} />
          <button type="button" onClick={() => onUse(template)} disabled={isCreating} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
            {isCreating ? 'Creating…' : 'Use Template'}
          </button>
          <button type="button" onClick={() => onRemix(template)} disabled={isCreating} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100 hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-60">
            Remix Template
          </button>
        </div>

        <TemplatePhaseTwoActions template={template} onProjectCreated={onProjectCreated} notify={notify} />

        <RelatedTemplates
          templates={relatedTemplates}
          usingTemplateId={usingTemplateId}
          onPreview={onPreview}
          onUse={onUse}
          onFavouriteChange={onFavouriteChange}
          onFavouriteError={onFavouriteError}
        />
      </div>
    </div>
  );
}
