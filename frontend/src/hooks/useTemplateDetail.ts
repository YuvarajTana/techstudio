import { useEffect, useState } from 'react';
import type { TemplateAsset } from '../components/templates/templateTypes';
import { getRelatedTemplates, getTemplateDetail } from '../services/templatesApi';

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export function useTemplateDetail(templateId: string | null) {
  const [template, setTemplate] = useState<TemplateAsset | null>(null);
  const [relatedTemplates, setRelatedTemplates] = useState<TemplateAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!templateId) {
      setTemplate(null);
      setRelatedTemplates([]);
      setError('');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      getTemplateDetail(templateId, controller.signal),
      getRelatedTemplates(templateId, controller.signal),
    ])
      .then(([templateData, relatedData]) => {
        setTemplate(templateData);
        setRelatedTemplates(relatedData.templates || []);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setTemplate(null);
        setRelatedTemplates([]);
        setError(getErrorMessage(fetchError, 'Failed to load template details.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [templateId]);

  const setFavourite = (templateIdToUpdate: string, isFavourite: boolean) => {
    setTemplate((current) => (
      current?.id === templateIdToUpdate ? { ...current, is_favourite: isFavourite } : current
    ));
    setRelatedTemplates((current) => current.map((item) => (
      item.id === templateIdToUpdate ? { ...item, is_favourite: isFavourite } : item
    )));
  };

  return { template, relatedTemplates, loading, error, setFavourite };
}
