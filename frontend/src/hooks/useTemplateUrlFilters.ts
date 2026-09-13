import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_TEMPLATE_FILTERS, normalizeTemplateTypeId } from '../components/templates/templateConstants';
import type { TemplateFiltersState } from '../components/templates/templateTypes';

type TemplateFilterPatch = Partial<TemplateFiltersState> & { resetPage?: boolean };

const parsePage = (value: string | null) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TEMPLATE_FILTERS.page;
};

export function useTemplateUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<TemplateFiltersState>(() => ({
    query: searchParams.get('q') || DEFAULT_TEMPLATE_FILTERS.query,
    templateType: normalizeTemplateTypeId(searchParams.get('type')),
    categorySlug: searchParams.get('category') || DEFAULT_TEMPLATE_FILTERS.categorySlug,
    sort: searchParams.get('sort') || DEFAULT_TEMPLATE_FILTERS.sort,
    page: parsePage(searchParams.get('page')),
    detailId: searchParams.get('template') || DEFAULT_TEMPLATE_FILTERS.detailId,
  }), [searchParams]);

  const updateFilters = (patch: TemplateFilterPatch) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', 'templates');

    const nextFilters = {
      ...filters,
      ...patch,
      page: patch.resetPage === false ? (patch.page ?? filters.page) : (patch.page ?? 1),
    };
    nextFilters.templateType = normalizeTemplateTypeId(nextFilters.templateType);

    if (nextFilters.query.trim()) next.set('q', nextFilters.query.trim()); else next.delete('q');
    if (nextFilters.templateType !== DEFAULT_TEMPLATE_FILTERS.templateType) next.set('type', nextFilters.templateType); else next.delete('type');
    if (nextFilters.categorySlug !== DEFAULT_TEMPLATE_FILTERS.categorySlug) next.set('category', nextFilters.categorySlug); else next.delete('category');
    if (nextFilters.sort !== DEFAULT_TEMPLATE_FILTERS.sort) next.set('sort', nextFilters.sort); else next.delete('sort');
    if (nextFilters.page > 1) next.set('page', String(nextFilters.page)); else next.delete('page');
    if (nextFilters.detailId) next.set('template', nextFilters.detailId); else next.delete('template');

    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.set('view', 'templates');
    ['q', 'type', 'category', 'sort', 'page', 'template'].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  };

  return { filters, updateFilters, clearFilters };
}
