import type { TemplateAsset } from './templateTypes';
import { TemplateCard } from './TemplateCard';
import { TemplateEmptyState } from './TemplateEmptyState';
import { TemplateErrorState } from './TemplateErrorState';
import { TemplateLoadingSkeleton } from './TemplateLoadingSkeleton';

interface TemplateGridProps {
  templates: TemplateAsset[];
  loading: boolean;
  error: string;
  usingTemplateId: string | null;
  onPreview: (template: TemplateAsset) => void;
  onUse: (template: TemplateAsset) => void;
  onFavouriteChange: (templateId: string, isFavourite: boolean) => void;
  onFavouriteError?: (message: string) => void;
  onClearFilters: () => void;
}

export function TemplateGrid({ templates, loading, error, usingTemplateId, onPreview, onUse, onFavouriteChange, onFavouriteError, onClearFilters }: TemplateGridProps) {
  if (loading) return <TemplateLoadingSkeleton />;
  if (error) return <TemplateErrorState message={error} onRetry={() => window.location.reload()} />;
  if (templates.length === 0) {
    return <TemplateEmptyState title="No templates found" description="Try another search term, template type, or category filter." onClearFilters={onClearFilters} />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onPreview={onPreview}
          onUse={onUse}
          onFavouriteChange={onFavouriteChange}
          onFavouriteError={onFavouriteError}
          using={usingTemplateId === template.id}
        />
      ))}
    </div>
  );
}
