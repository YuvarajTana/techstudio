import type { TemplateAsset } from './templateTypes';
import { TemplateCard } from './TemplateCard';

interface RelatedTemplatesProps {
  templates: TemplateAsset[];
  usingTemplateId: string | null;
  onPreview: (template: TemplateAsset) => void;
  onUse: (template: TemplateAsset) => void;
  onFavouriteChange: (templateId: string, isFavourite: boolean) => void;
  onFavouriteError?: (message: string) => void;
}

export function RelatedTemplates({ templates, usingTemplateId, onPreview, onUse, onFavouriteChange, onFavouriteError }: RelatedTemplatesProps) {
  if (templates.length === 0) return null;

  return (
    <section className="mt-8">
      <h4 className="mb-4 text-sm font-bold text-white">Related templates</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {templates.slice(0, 4).map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            compact
            onPreview={onPreview}
            onUse={onUse}
            onFavouriteChange={onFavouriteChange}
            onFavouriteError={onFavouriteError}
            using={usingTemplateId === template.id}
          />
        ))}
      </div>
    </section>
  );
}
