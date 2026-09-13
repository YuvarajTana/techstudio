import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useTemplatesData } from '../../hooks/useTemplatesData';
import { useTemplateUrlFilters } from '../../hooks/useTemplateUrlFilters';
import { createProjectFromTemplate, remixTemplate } from '../../services/templatesApi';
import {
  DEFAULT_TEMPLATE_FILTERS,
  getTemplateSortLabel,
  getTemplateTypeLabel,
} from './templateConstants';
import type { ActiveFilterChip } from './ActiveFilterChips';
import { ActiveFilterChips } from './ActiveFilterChips';
import { TemplateCategoryFilters } from './TemplateCategoryFilters';
import { TemplateGrid } from './TemplateGrid';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { TemplateSortDropdown } from './TemplateSortDropdown';
import { TemplateTypeTabs } from './TemplateTypeTabs';
import { TemplatesSearchBar } from './TemplatesSearchBar';
import type { TemplateAsset, TemplateProject } from './templateTypes';

interface TemplatesPageProps {
  onCreateBlankPoster: () => void;
  onGenerateWithAi: (prompt?: string) => void;
  onTemplateUsed: (project: TemplateProject) => void;
  notify?: (message: string, type?: 'success' | 'error') => void;
}

const getCategoryLabel = (categories: { slug: string; name: string }[], slug: string) => categories.find((category) => category.slug === slug)?.name || slug;

export function TemplatesPage({ onCreateBlankPoster, onGenerateWithAi, onTemplateUsed, notify }: TemplatesPageProps) {
  const { filters, updateFilters, clearFilters } = useTemplateUrlFilters();
  const [searchInput, setSearchInput] = useState(filters.query);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 320);

  const {
    categories,
    categoriesLoading,
    categoriesError,
    templates,
    templatesLoading,
    templatesError,
    setTemplateFavourite,
  } = useTemplatesData(filters);

  useEffect(() => {
    updateFilters({ resetPage: false });
  }, []);

  useEffect(() => {
    if (debouncedSearch !== filters.query) {
      updateFilters({ query: debouncedSearch });
    }
  }, [debouncedSearch, filters.query]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.query) chips.push({ id: 'query', label: `Search: ${filters.query}`, onClear: () => { setSearchInput(''); updateFilters({ query: '' }); } });
    if (filters.templateType !== DEFAULT_TEMPLATE_FILTERS.templateType) chips.push({ id: 'type', label: getTemplateTypeLabel(filters.templateType), onClear: () => updateFilters({ templateType: DEFAULT_TEMPLATE_FILTERS.templateType }) });
    if (filters.categorySlug !== DEFAULT_TEMPLATE_FILTERS.categorySlug) chips.push({ id: 'category', label: getCategoryLabel(categories, filters.categorySlug), onClear: () => updateFilters({ categorySlug: DEFAULT_TEMPLATE_FILTERS.categorySlug }) });
    if (filters.sort !== DEFAULT_TEMPLATE_FILTERS.sort) chips.push({ id: 'sort', label: `Sort: ${getTemplateSortLabel(filters.sort)}`, onClear: () => updateFilters({ sort: DEFAULT_TEMPLATE_FILTERS.sort }) });
    return chips;
  }, [categories, filters.categorySlug, filters.query, filters.sort, filters.templateType]);

  const handleUseTemplate = async (template: TemplateAsset, remix = false) => {
    if (usingTemplateId) return;
    setUsingTemplateId(template.id);
    try {
      const response = await createProjectFromTemplate(template.id, {
        project_name: remix ? `${template.name} Remix` : `${template.name} Copy`,
      });
      notify?.(remix ? 'Template remixed into a new editable design.' : 'Template copied into a new editable design.');
      onTemplateUsed(response.project);
    } catch (error) {
      notify?.(error instanceof Error ? error.message : 'Failed to create project from template.', 'error');
    } finally {
      setUsingTemplateId(null);
    }
  };

  const handleRemixTemplate = async (template: TemplateAsset) => {
    if (usingTemplateId) return;
    setUsingTemplateId(template.id);
    try {
      const response = await remixTemplate(template.id, {
        prompt: `Create a fresh remix of ${template.name} while preserving the editable layout structure.`,
        project_name: `${template.name} AI Remix`,
      });
      notify?.('AI remix created as a new editable design.');
      onTemplateUsed(response.project);
    } catch (error) {
      notify?.(error instanceof Error ? error.message : 'Failed to create AI remix.', 'error');
    } finally {
      setUsingTemplateId(null);
    }
  };

  const openTemplatePreview = (template: TemplateAsset) => {
    updateFilters({ detailId: template.id, resetPage: false });
  };

  const closeTemplatePreview = () => {
    updateFilters({ detailId: null, resetPage: false });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const currentStart = templates.total === 0 ? 0 : ((templates.page - 1) * templates.per_page) + 1;
  const currentEnd = Math.min(templates.page * templates.per_page, templates.total);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pt-6 lg:pt-8">
        <section className="rounded-[2rem] border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-950 to-violet-950/30 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200">
                <LayoutTemplate className="h-3.5 w-3.5" />
                Template Library
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white">Templates</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Search professional editable templates, preview details, favourite useful designs, and open a copied template in the editor.</p>
              <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                <TemplatesSearchBar value={searchInput} onChange={setSearchInput} />
                <button type="button" onClick={onCreateBlankPoster} className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-violet-400/50">
                  Create Blank Poster
                </button>
                <button type="button" onClick={() => onGenerateWithAi(searchInput || filters.query || undefined)} className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
                  <Sparkles className="mr-2 inline h-4 w-4" />Generate with AI
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TemplateSortDropdown value={filters.sort} onChange={(sort) => updateFilters({ sort })} />
              <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-400">
                {templatesLoading ? 'Loading…' : `${templates.total} templates`}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <TemplateTypeTabs selectedType={filters.templateType} onChange={(templateType) => updateFilters({ templateType })} />
          <TemplateCategoryFilters categories={categories} selectedCategory={filters.categorySlug} loading={categoriesLoading} error={categoriesError} onChange={(categorySlug) => updateFilters({ categorySlug })} />
          <ActiveFilterChips chips={activeChips} onClearAll={handleClearFilters} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Browse templates</h3>
              <p className="text-xs text-zinc-500">
                {templatesLoading ? 'Loading matching templates…' : `${currentStart}–${currentEnd} of ${templates.total} results`}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => updateFilters({ page: Math.max(1, filters.page - 1), resetPage: false })} disabled={filters.page <= 1 || templatesLoading} className="h-9 rounded-xl border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <button type="button" onClick={() => updateFilters({ page: filters.page + 1, resetPage: false })} disabled={!templates.has_more || templatesLoading} className="h-9 rounded-xl border border-zinc-800 px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          </div>

          <TemplateGrid
            templates={templates.templates}
            loading={templatesLoading}
            error={templatesError}
            usingTemplateId={usingTemplateId}
            onPreview={openTemplatePreview}
            onUse={(template) => handleUseTemplate(template)}
            onFavouriteChange={setTemplateFavourite}
            onFavouriteError={(message) => notify?.(message, 'error')}
            onClearFilters={handleClearFilters}
          />
        </section>
      </div>

      <TemplatePreviewModal
        templateId={filters.detailId}
        templates={templates.templates}
        usingTemplateId={usingTemplateId}
        onClose={closeTemplatePreview}
        onPreview={openTemplatePreview}
        onUse={(template) => handleUseTemplate(template)}
        onRemix={handleRemixTemplate}
        onProjectCreated={onTemplateUsed}
        onFavouriteChange={setTemplateFavourite}
        onFavouriteError={(message) => notify?.(message, 'error')}
        notify={notify}
      />
    </>
  );
}
