import { useEffect, useState } from 'react';
import { TEMPLATE_PAGE_SIZE } from '../components/templates/templateConstants';
import type { TemplateCategory, TemplateFiltersState, TemplateListResponse } from '../components/templates/templateTypes';
import { listTemplateCategories, listTemplates } from '../services/templatesApi';

const emptyList: TemplateListResponse = {
  items: [],
  templates: [],
  total: 0,
  page: 1,
  page_size: TEMPLATE_PAGE_SIZE,
  per_page: TEMPLATE_PAGE_SIZE,
  total_pages: 0,
  has_more: false,
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export function useTemplatesData(filters: TemplateFiltersState) {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [templates, setTemplates] = useState<TemplateListResponse>(emptyList);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    setCategoriesError('');

    listTemplateCategories(controller.signal)
      .then((data) => setCategories(data.categories || []))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setCategories([]);
        setCategoriesError(getErrorMessage(error, 'Failed to load template categories.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setTemplatesLoading(true);
    setTemplatesError('');

    listTemplates({
      query: filters.query,
      templateType: filters.templateType,
      categorySlug: filters.categorySlug,
      sort: filters.sort,
      page: filters.page,
      perPage: TEMPLATE_PAGE_SIZE,
    }, controller.signal)
      .then((data) => setTemplates(data))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setTemplates(emptyList);
        setTemplatesError(getErrorMessage(error, 'Failed to load templates.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setTemplatesLoading(false);
      });

    return () => controller.abort();
  }, [filters.categorySlug, filters.page, filters.query, filters.sort, filters.templateType]);

  const setTemplateFavourite = (templateId: string, isFavourite: boolean) => {
    setTemplates((current) => {
      const templates = current.templates.map((template) => (
        template.id === templateId ? { ...template, is_favourite: isFavourite } : template
      ));
      return {
        ...current,
        items: templates,
        templates,
      };
    });
  };

  return {
    categories,
    categoriesLoading,
    categoriesError,
    templates,
    templatesLoading,
    templatesError,
    setTemplateFavourite,
  };
}
