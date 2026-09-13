import { useEffect, useMemo } from 'react';
import type { TemplateAsset, TemplateProject } from './templateTypes';
import { useTemplateDetail } from '../../hooks/useTemplateDetail';
import { TemplateDetailPage } from './TemplateDetailPage';

interface TemplatePreviewModalProps {
  templateId: string | null;
  templates: TemplateAsset[];
  usingTemplateId: string | null;
  onClose: () => void;
  onPreview: (template: TemplateAsset) => void;
  onUse: (template: TemplateAsset) => void;
  onRemix: (template: TemplateAsset) => void;
  onProjectCreated: (project: TemplateProject) => void;
  onFavouriteChange: (templateId: string, isFavourite: boolean) => void;
  onFavouriteError?: (message: string) => void;
  notify?: (message: string, type?: 'success' | 'error') => void;
}

export function TemplatePreviewModal({ templateId, templates, usingTemplateId, onClose, onPreview, onUse, onRemix, onProjectCreated, onFavouriteChange, onFavouriteError, notify }: TemplatePreviewModalProps) {
  const { template, relatedTemplates, loading, error, setFavourite } = useTemplateDetail(templateId);

  const currentIndex = useMemo(() => templates.findIndex((item) => item.id === templateId), [templateId, templates]);
  const previousTemplate = currentIndex > 0 ? templates[currentIndex - 1] : null;
  const nextTemplate = currentIndex >= 0 && currentIndex < templates.length - 1 ? templates[currentIndex + 1] : null;

  useEffect(() => {
    if (!templateId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowUp') && previousTemplate) {
        event.preventDefault();
        onPreview(previousTemplate);
      }
      if ((event.key === 'ArrowRight' || event.key === 'ArrowDown') && nextTemplate) {
        event.preventDefault();
        onPreview(nextTemplate);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextTemplate, onClose, onPreview, previousTemplate, templateId]);

  if (!templateId) return null;

  const handleFavouriteChange = (id: string, isFavourite: boolean) => {
    setFavourite(id, isFavourite);
    onFavouriteChange(id, isFavourite);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Template preview"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50">
        {previousTemplate && (
          <button type="button" onClick={() => onPreview(previousTemplate)} className="absolute left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-lg font-black text-zinc-200 shadow-lg hover:border-violet-400/50 hover:text-white lg:flex" aria-label="Preview previous template">
            ‹
          </button>
        )}
        {nextTemplate && (
          <button type="button" onClick={() => onPreview(nextTemplate)} className="absolute right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 text-lg font-black text-zinc-200 shadow-lg hover:border-violet-400/50 hover:text-white lg:flex" aria-label="Preview next template">
            ›
          </button>
        )}
        <TemplateDetailPage
          template={template}
          relatedTemplates={relatedTemplates}
          loading={loading}
          error={error}
          usingTemplateId={usingTemplateId}
          onClose={onClose}
          onPreview={onPreview}
          onUse={onUse}
          onRemix={onRemix}
          onProjectCreated={onProjectCreated}
          onFavouriteChange={handleFavouriteChange}
          onFavouriteError={onFavouriteError}
          notify={notify}
        />
      </div>
    </div>
  );
}
