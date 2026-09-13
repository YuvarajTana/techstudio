import { LayoutTemplate } from 'lucide-react';

interface TemplateEmptyStateProps {
  title: string;
  description: string;
  onClearFilters?: () => void;
}

export function TemplateEmptyState({ title, description, onClearFilters }: TemplateEmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
        <LayoutTemplate className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{description}</p>
      {onClearFilters && (
        <button type="button" onClick={onClearFilters} className="mt-5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
          Clear filters
        </button>
      )}
    </div>
  );
}
