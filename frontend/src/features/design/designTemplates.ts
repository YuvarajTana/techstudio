import {STARTER_TEMPLATES, adaptLegacyPosterTemplate, type DesignTemplate} from '@teckstudio/design-spec/catalog';
import {VALID_TECH_POSTER_TEMPLATES} from '../../data/techPosterTemplates';

/** Hand-written starters first, then the 65 legacy tech posters mapped onto layout families. */
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  ...STARTER_TEMPLATES,
  ...VALID_TECH_POSTER_TEMPLATES.map(adaptLegacyPosterTemplate),
];

export function findDesignTemplate(id: string | null | undefined): DesignTemplate | undefined {
  return id ? DESIGN_TEMPLATES.find((template) => template.id === id) : undefined;
}
