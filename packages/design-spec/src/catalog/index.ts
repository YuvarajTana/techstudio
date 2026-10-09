import { requireFormat } from '../formats';
import { TECH_DECKS, TECH_STARTERS } from './tech';
import { REAL_ESTATE_DECKS, REAL_ESTATE_STARTERS } from './realEstate';
import { INDIA_BUSINESS, INDIA_EVENTS, INDIA_FESTIVALS, INDIA_REAL_ESTATE, INDIA_TEMPLATES } from './india';
import { HIRING_TEMPLATES } from './hiring';
import { PCS_DIGITAL_TEMPLATES } from './pcsDigital';
import type { DesignSpec } from '../types';
import type { DesignTemplate } from './types';

export type { DesignOutput, DesignTemplate } from './types';
export { adaptLegacyPosterTemplate, type LegacyPosterTemplateInput } from './legacy';
export { TECH_DECKS, TECH_STARTERS, REAL_ESTATE_DECKS, REAL_ESTATE_STARTERS };
export { INDIA_BUSINESS, INDIA_EVENTS, INDIA_FESTIVALS, INDIA_REAL_ESTATE, INDIA_TEMPLATES, HIRING_TEMPLATES, PCS_DIGITAL_TEMPLATES };

/** Hand-written starter templates (posters and decks) for every vertical. */
export const STARTER_TEMPLATES: DesignTemplate[] = [...TECH_DECKS, ...REAL_ESTATE_DECKS, ...TECH_STARTERS, ...REAL_ESTATE_STARTERS, ...INDIA_TEMPLATES, ...HIRING_TEMPLATES, ...PCS_DIGITAL_TEMPLATES];

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
    const haystack = [template.name, template.description, template.category, template.vertical, template.region === 'india' ? 'india indian' : '', template.season?.label ?? '', ...template.tags].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Seasonal templates whose season starts within `monthsAhead` months of
 * `today` (the current month counts), soonest first, then by popularity.
 */
export function upcomingTemplates(templates: DesignTemplate[], today: Date, monthsAhead = 1): DesignTemplate[] {
  const month = today.getMonth() + 1;
  const distance = (template: DesignTemplate) => {
    const months = template.season?.months ?? [];
    let best = Infinity;
    for (const m of months) best = Math.min(best, (m - month + 12) % 12);
    return best;
  };
  return templates
    .map((template) => ({ template, distance: distance(template) }))
    .filter((item) => item.distance <= monthsAhead)
    .sort((a, b) => a.distance - b.distance || b.template.popularity - a.template.popularity)
    .map((item) => item.template);
}
