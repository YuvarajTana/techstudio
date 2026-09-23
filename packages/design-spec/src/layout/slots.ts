import type { AgentValue, CardValue, CodeValue, DesignPage, FactsValue, FlowValue, ImageValue, SideValue, StatValue } from '../types';

/** Typed, forgiving readers for page slots (validation reports real problems). */
export function textSlot(page: DesignPage, name: string): string {
  const value = page.slots[name];
  return typeof value === 'string' ? value : '';
}

export function listSlot(page: DesignPage, name: string): string[] {
  const value = page.slots[name];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

export function cardsSlot(page: DesignPage, name: string): CardValue[] {
  const value = page.slots[name];
  return Array.isArray(value) ? (value as CardValue[]).filter((item) => item && typeof item === 'object' && typeof item.title === 'string') : [];
}

export function statsSlot(page: DesignPage, name: string): StatValue[] {
  const value = page.slots[name];
  return Array.isArray(value) ? (value as StatValue[]).filter((item) => item && typeof item === 'object' && typeof item.value === 'string') : [];
}

export function imageSlot(page: DesignPage, name: string): ImageValue | undefined {
  const value = page.slots[name] as ImageValue | undefined;
  return value && typeof value === 'object' && !Array.isArray(value) && typeof value.src === 'string' ? value : undefined;
}

export function imagesSlot(page: DesignPage, name: string): ImageValue[] {
  const value = page.slots[name];
  return Array.isArray(value) ? (value as ImageValue[]).filter((item) => item && typeof item === 'object' && typeof item.src === 'string') : [];
}

export function factsSlot(page: DesignPage, name: string): FactsValue {
  const value = page.slots[name];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as FactsValue) : {};
}

export function codeSlot(page: DesignPage, name: string): CodeValue | undefined {
  const value = page.slots[name] as CodeValue | undefined;
  return value && typeof value === 'object' && typeof value.source === 'string' ? value : undefined;
}

export function flowSlot(page: DesignPage, name: string): FlowValue {
  const value = page.slots[name] as FlowValue | undefined;
  return value && Array.isArray(value.nodes) ? { nodes: value.nodes, edges: Array.isArray(value.edges) ? value.edges : [] } : { nodes: [], edges: [] };
}

export function sideSlot(page: DesignPage, name: string): SideValue {
  const value = page.slots[name] as SideValue | undefined;
  return value && typeof value === 'object' && typeof value.title === 'string' ? { title: value.title, points: Array.isArray(value.points) ? value.points : [] } : { title: '', points: [] };
}

export function agentSlot(page: DesignPage, name: string): AgentValue | undefined {
  const value = page.slots[name] as AgentValue | undefined;
  return value && typeof value === 'object' && typeof value.name === 'string' && value.name.trim() ? value : undefined;
}

const numberFormat = new Intl.NumberFormat('en-US');

/** Fact chips shown for a property, in display order, with their icon ids. */
export function factChips(facts: FactsValue): { key: keyof FactsValue; icon: string; text: string }[] {
  const chips: { key: keyof FactsValue; icon: string; text: string }[] = [];
  if (facts.beds !== undefined) chips.push({ key: 'beds', icon: 'bed', text: `${facts.beds} ${facts.beds === 1 ? 'Bed' : 'Beds'}` });
  if (facts.baths !== undefined) chips.push({ key: 'baths', icon: 'bath', text: `${facts.baths} ${facts.baths === 1 ? 'Bath' : 'Baths'}` });
  if (facts.sqft !== undefined) chips.push({ key: 'sqft', icon: 'sqft', text: `${numberFormat.format(facts.sqft)} sq ft` });
  if (facts.parking !== undefined) chips.push({ key: 'parking', icon: 'garage', text: `${facts.parking} Parking` });
  if (facts.lot?.trim()) chips.push({ key: 'lot', icon: 'trees', text: facts.lot.trim() });
  return chips;
}
