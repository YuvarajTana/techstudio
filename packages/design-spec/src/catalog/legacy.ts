import { formatForSize } from '../formats';
import { getTheme } from '../themes';
import type { DesignPage } from '../types';
import type { DesignTemplate } from './types';

/**
 * Structural subset of frontend/src/data/techPosterTemplates.ts#TechPosterTemplate.
 * Declared here so the package does not depend on the frontend.
 */
export interface LegacyPosterTemplateInput {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory: string;
  width: number;
  height: number;
  layoutFamily: string;
  themeId: string;
  tags: string[];
  isFeatured: boolean;
  popularity: number;
  posterSpec: {
    title: string;
    subtitle: string;
    description: string;
    cards: { title: string; description: string; icon?: string }[];
    cta: { text: string; tag?: string };
  };
}

const LAYOUT_MAP: Record<string, { layout: string; variant: string }> = {
  'Numbered Technical Cards': { layout: 'concept-cards', variant: 'numbered' },
  'Cheatsheet Grid': { layout: 'concept-cards', variant: 'grid' },
  'Product Feature Grid': { layout: 'concept-cards', variant: 'grid' },
  'Layered Technology Stack': { layout: 'concept-cards', variant: 'stack' },
  'Hero Promotion': { layout: 'concept-cards', variant: 'hero' },
  'Event Poster': { layout: 'concept-cards', variant: 'hero' },
  'Image and Content Split': { layout: 'concept-cards', variant: 'hero' },
  'Quote and Motivation': { layout: 'concept-cards', variant: 'hero' },
  'Timeline Roadmap': { layout: 'architecture-flow', variant: 'timeline' },
  'Architecture Flow': { layout: 'architecture-flow', variant: 'flow' },
  'Process Steps': { layout: 'architecture-flow', variant: 'steps' },
  'Side-by-Side Comparison': { layout: 'comparison', variant: 'columns' },
};

function clip(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function pageFor(template: LegacyPosterTemplateInput): DesignPage {
  const spec = template.posterSpec;
  const target = LAYOUT_MAP[template.layoutFamily] ?? { layout: 'concept-cards', variant: 'numbered' };
  const cards = spec.cards.map((card) => ({ title: clip(card.title, 80), body: clip(card.description, 400), icon: card.icon }));
  const header = { eyebrow: clip(template.subCategory, 48), title: clip(spec.title, 90), subtitle: clip(spec.description, 200) };
  const notes = `${spec.title}. ${spec.description}`;
  if (target.layout === 'architecture-flow') {
    const nodes = cards.slice(0, target.variant === 'flow' ? 6 : 7).map((card, i) => ({ id: `n${i + 1}`, label: clip(card.title, 40), icon: card.icon }));
    return {
      id: 'p1',
      layout: target.layout,
      variant: target.variant,
      slots: { ...header, flow: { nodes, edges: nodes.slice(1).map((node, i) => ({ from: nodes[i].id, to: node.id })) }, takeaway: clip(spec.cta.text, 110) },
      notes,
    };
  }
  if (target.layout === 'comparison') {
    const half = Math.ceil(cards.length / 2);
    const side = (items: typeof cards) => ({ title: clip(items[0]?.title ?? '', 40), points: items.slice(1, 5).map((card) => clip(card.title, 90)) });
    return { id: 'p1', layout: 'comparison', variant: 'columns', slots: { ...header, left: side(cards.slice(0, half)), right: side(cards.slice(half)), verdict: clip(spec.cta.text, 110) }, notes };
  }
  const shownCards = target.variant === 'hero' ? cards.slice(0, 3) : cards;
  return {
    id: 'p1',
    layout: 'concept-cards',
    variant: target.variant,
    slots: { ...header, cards: shownCards, cta: clip(spec.cta.text, 90), tag: spec.cta.tag ? clip(spec.cta.tag, 32) : undefined },
    notes,
  };
}

/** Convert one legacy PosterSpec template into a DesignSpec template honouring its size and layout family. */
export function adaptLegacyPosterTemplate(template: LegacyPosterTemplateInput): DesignTemplate {
  const format = formatForSize(template.width, template.height)?.id ?? 'poster-legacy';
  const theme = getTheme(template.themeId) ? template.themeId : 'tech-blue';
  return {
    id: `legacy-${template.id}`,
    name: template.name,
    description: template.description,
    vertical: 'tech',
    category: template.category,
    tags: template.tags,
    outputs: ['poster', 'video'],
    altFormats: ['portrait-4x5', 'square', 'story', 'a4', 'slide-16x9'],
    featured: template.isFeatured,
    popularity: template.popularity,
    source: 'legacy',
    spec: {
      schema: 'design-spec/v1',
      id: template.id,
      title: template.name,
      format,
      theme,
      pages: [pageFor(template)],
    },
  };
}
