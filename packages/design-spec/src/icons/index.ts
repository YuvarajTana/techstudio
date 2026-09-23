import { ICON_SOURCES, ICONS } from './generated/icons';
import type { IconDef } from '../types';

export { ICONS, ICON_SOURCES };

/** Legacy PosterSpec icon names and friendly aliases → vendored icon ids. */
const ALIASES: Record<string, string> = {
  spark: 'sparkles',
  chip: 'cpu',
  chart: 'chart-bar',
  terminal: 'terminal',
  warning: 'alert',
  gateway: 'router',
  bathroom: 'bath',
  bedroom: 'bed',
  area: 'sqft',
  location: 'map-pin',
  pin: 'map-pin',
  money: 'price',
  aws: 'logo:aws',
  azure: 'logo:azure',
  gcp: 'logo:googlecloud',
  k8s: 'logo:kubernetes',
  kubernetes: 'logo:kubernetes',
  docker: 'logo:docker',
  postgres: 'logo:postgresql',
  redis: 'logo:redis',
  kafka: 'logo:apachekafka',
  python: 'logo:python',
};

export function resolveIconId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  if (ICONS[id]) return id;
  const alias = ALIASES[id.toLowerCase()];
  if (alias && ICONS[alias]) return alias;
  if (ICONS[`logo:${id.toLowerCase()}`]) return `logo:${id.toLowerCase()}`;
  return undefined;
}

export function getIcon(id: string | undefined): IconDef | undefined {
  const resolved = resolveIconId(id);
  return resolved ? ICONS[resolved] : undefined;
}

export function listIcons(filter?: { trademark?: boolean; set?: IconDef['set'] }): { id: string; icon: IconDef }[] {
  return Object.entries(ICONS)
    .filter(([, icon]) => filter?.trademark === undefined || icon.trademark === filter.trademark)
    .filter(([, icon]) => !filter?.set || icon.set === filter.set)
    .map(([id, icon]) => ({ id, icon }));
}

/** Standalone SVG markup, e.g. for fabric.loadSVGFromString or <img src=data:...>. */
export function iconSvg(id: string, color: string, strokeWidth = 2): string | undefined {
  const icon = getIcon(id);
  if (!icon) return undefined;
  const paint = icon.style === 'stroke'
    ? `fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`
    : `fill="${color}"`;
  const paths = icon.paths.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="${icon.viewBox}"><g ${paint}>${paths}</g></svg>`;
}

export const TRADEMARK_NOTICE =
  'Product logos are trademarks of their owners. They are provided (via Simple Icons / Tabler) only to refer to those products and do not imply endorsement.';
