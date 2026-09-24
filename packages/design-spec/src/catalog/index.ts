import { requireFormat } from '../formats';
import { TECH_DECKS, TECH_STARTERS } from './tech';
import { REAL_ESTATE_DECKS, REAL_ESTATE_STARTERS } from './realEstate';
import type { DesignSpec } from '../types';
import type { DesignTemplate } from './types';

export type { DesignOutput, DesignTemplate } from './types';
export { adaptLegacyPosterTemplate, type LegacyPosterTemplateInput } from './legacy';
export { TECH_DECKS, TECH_STARTERS, REAL_ESTATE_DECKS, REAL_ESTATE_STARTERS };

/** Hand-written starter templates (posters and decks) for both verticals. */
export const STARTER_TEMPLATES: DesignTemplate[] = [...TECH_DECKS, ...REAL_ESTATE_DECKS, ...TECH_STARTERS, ...REAL_ESTATE_STARTERS];

/** A copy of the template's spec in another format/theme, with a fresh id. */
export function instantiateTemplate(template: DesignTemplate, options: { format?: string; theme?: string; id?: string } = {}): DesignSpec {
  const spec = JSON.parse(JSON.stringify(template.spec)) as DesignSpec;
  if (options.format) {
    requireFormat(options.format);
    spec.format = options.format;
  }
  if (options.theme) spec.theme = options.theme;
  spec.id = options.id ?? `${spec.id}-${Date.now().toString(36)}`;
  return spec;
}

export function searchTemplates(templates: DesignTemplate[], query: string): DesignTemplate[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return templates;
  return templates.filter((template) => {
    const haystack = [template.name, template.description, template.category, template.vertical, ...template.tags].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
