import { requireFormat } from '../formats';
import { requireTheme } from '../themes';
import { architectureFlow, codeExplainer, comparison, conceptCards } from './families/tech';
import { justSold, listingHero, openHouse, propertyFeatureGrid } from './families/realEstate';
import { eventInvite, festivalGreeting, offerPromo } from './families/occasion';
import type { DesignSpec, LayoutFamily, Primitive } from '../types';

export const LAYOUT_FAMILIES: LayoutFamily[] = [
  conceptCards,
  architectureFlow,
  codeExplainer,
  comparison,
  listingHero,
  openHouse,
  propertyFeatureGrid,
  justSold,
  festivalGreeting,
  offerPromo,
  eventInvite,
];

const BY_ID = new Map(LAYOUT_FAMILIES.map((family) => [family.id, family]));

export function getLayoutFamily(id: string): LayoutFamily | undefined {
  return BY_ID.get(id);
}

export function requireLayoutFamily(id: string): LayoutFamily {
  const family = BY_ID.get(id);
  if (!family) throw new Error(`Unknown layout family "${id}".`);
  return family;
}

/** Lay out one page of a spec into absolute-pixel primitives. */
export function layoutPage(spec: DesignSpec, pageIndex: number): Primitive[] {
  const page = spec.pages[pageIndex];
  if (!page) throw new Error(`Page ${pageIndex} does not exist.`);
  const family = requireLayoutFamily(page.layout);
  return family.layout({
    format: requireFormat(spec.format),
    theme: requireTheme(spec.theme),
    page: { ...page, variant: page.variant ?? family.variants[0] },
    brand: spec.brand,
    locale: spec.locale,
    pageIndex,
    pageCount: spec.pages.length,
  });
}

export { LayoutBuilder, estimateLines, estimateTextHeight, fitTextSize, grid, inset, splitX, splitY } from './engine';
