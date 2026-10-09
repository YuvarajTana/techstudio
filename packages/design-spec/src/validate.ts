import { getFormat } from './formats';
import { getIcon } from './icons';
import { estimateTextHeight } from './layout/engine';
import { getLayoutFamily, layoutPage } from './layout';
import { getTheme } from './themes';
import type { DesignPage, DesignSpec, SlotDef, SlotValue } from './types';

export interface DesignValidation {
  errors: string[];
  /** Non-blocking issues, e.g. text that will be shrunk below its minimum size. */
  warnings: string[];
}

const MAX_PAGES = 40;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';

function checkLength(errors: string[], path: string, text: unknown, max?: number) {
  if (!isString(text)) {
    errors.push(`${path} must be text.`);
    return;
  }
  if (max && text.length > max) errors.push(`${path} is ${text.length} characters; keep it under ${max}.`);
}

function checkItems(errors: string[], path: string, items: unknown[], slot: SlotDef) {
  if (slot.minItems !== undefined && items.length < slot.minItems) errors.push(`${path} needs at least ${slot.minItems} item(s).`);
  if (slot.maxItems !== undefined && items.length > slot.maxItems) errors.push(`${path} allows at most ${slot.maxItems} item(s).`);
}

function checkIcon(warnings: string[], path: string, icon: unknown) {
  if (icon !== undefined && (!isString(icon) || !getIcon(icon))) warnings.push(`${path} "${String(icon)}" is not a known icon; it will be omitted.`);
}

function isEmpty(value: SlotValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (isString(value)) return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isObject(value) && 'nodes' in value) return !Array.isArray(value.nodes) || value.nodes.length === 0;
  if (isObject(value) && 'source' in value) return !isString(value.source) || !value.source.trim();
  return false;
}

function validateSlot(errors: string[], warnings: string[], path: string, slot: SlotDef, value: SlotValue) {
  switch (slot.kind) {
    case 'text':
      checkLength(errors, path, value, slot.maxChars);
      break;
    case 'list':
      if (!Array.isArray(value)) { errors.push(`${path} must be a list of text.`); break; }
      checkItems(errors, path, value, slot);
      value.forEach((item, i) => checkLength(errors, `${path}[${i}]`, item, slot.maxChars));
      break;
    case 'image':
      if (!isObject(value) || !isString(value.src)) errors.push(`${path} must be an image {src}.`);
      break;
    case 'images':
      if (!Array.isArray(value)) { errors.push(`${path} must be a list of images.`); break; }
      checkItems(errors, path, value, slot);
      value.forEach((item, i) => { if (!isObject(item) || !isString(item.src)) errors.push(`${path}[${i}] must be an image {src}.`); });
      break;
    case 'cards':
      if (!Array.isArray(value)) { errors.push(`${path} must be a list of cards.`); break; }
      checkItems(errors, path, value, slot);
      value.forEach((item, i) => {
        if (!isObject(item)) { errors.push(`${path}[${i}] must be a card.`); return; }
        checkLength(errors, `${path}[${i}].title`, item.title, 80);
        if (item.body !== undefined) checkLength(errors, `${path}[${i}].body`, item.body, 400);
        checkIcon(warnings, `${path}[${i}].icon`, item.icon);
      });
      break;
    case 'stats':
      if (!Array.isArray(value)) { errors.push(`${path} must be a list of stats.`); break; }
      checkItems(errors, path, value, slot);
      value.forEach((item, i) => {
        if (!isObject(item)) { errors.push(`${path}[${i}] must be a stat.`); return; }
        checkLength(errors, `${path}[${i}].value`, item.value, 16);
        checkLength(errors, `${path}[${i}].label`, item.label, 40);
      });
      break;
    case 'facts':
      if (!isObject(value)) { errors.push(`${path} must be an object.`); break; }
      for (const key of ['bhk', 'beds', 'baths', 'sqft', 'parking'] as const) {
        const n = value[key];
        if (n !== undefined && (typeof n !== 'number' || !Number.isFinite(n) || n < 0)) errors.push(`${path}.${key} must be a non-negative number.`);
      }
      if (value.lot !== undefined) checkLength(errors, `${path}.lot`, value.lot, 32);
      if (value.facing !== undefined) checkLength(errors, `${path}.facing`, value.facing, 24);
      break;
    case 'code':
      if (!isObject(value)) { errors.push(`${path} must be {language, source}.`); break; }
      checkLength(errors, `${path}.source`, value.source, slot.maxChars);
      if (isString(value.source) && value.source.split('\n').length > 24) errors.push(`${path} has more than 24 lines; split it across slides.`);
      if (!['python', 'javascript', 'typescript', 'sql', 'bash', 'json', 'text'].includes(String(value.language))) errors.push(`${path}.language is not supported.`);
      break;
    case 'flow': {
      if (!isObject(value) || !Array.isArray(value.nodes)) { errors.push(`${path} must be {nodes, edges}.`); break; }
      checkItems(errors, `${path}.nodes`, value.nodes, slot);
      const ids = new Set<string>();
      value.nodes.forEach((node, i) => {
        if (!isObject(node) || !isString(node.id)) { errors.push(`${path}.nodes[${i}] needs an id.`); return; }
        if (ids.has(node.id)) errors.push(`${path}.nodes[${i}] duplicates id "${node.id}".`);
        ids.add(node.id);
        checkLength(errors, `${path}.nodes[${i}].label`, node.label, 40);
        checkIcon(warnings, `${path}.nodes[${i}].icon`, node.icon);
      });
      const edges = Array.isArray(value.edges) ? value.edges : [];
      if (edges.length > 12) errors.push(`${path}.edges allows at most 12 connections.`);
      edges.forEach((edge, i) => {
        if (!isObject(edge) || !ids.has(String(edge.from)) || !ids.has(String(edge.to))) errors.push(`${path}.edges[${i}] must connect existing node ids.`);
      });
      break;
    }
    case 'side':
      if (!isObject(value)) { errors.push(`${path} must be {title, points}.`); break; }
      checkLength(errors, `${path}.title`, value.title, 40);
      if (!Array.isArray(value.points)) errors.push(`${path}.points must be a list.`);
      else {
        checkItems(errors, `${path}.points`, value.points, slot);
        value.points.forEach((point, i) => checkLength(errors, `${path}.points[${i}]`, point, 90));
      }
      break;
    case 'agent':
      if (!isObject(value)) { errors.push(`${path} must be {name, ...}.`); break; }
      checkLength(errors, `${path}.name`, value.name, 48);
      for (const key of ['title', 'phone', 'email'] as const) if (value[key] !== undefined) checkLength(errors, `${path}.${key}`, value[key], 64);
      break;
  }
}

function validatePage(errors: string[], warnings: string[], page: DesignPage, index: number) {
  const base = `/pages/${index}`;
  const family = getLayoutFamily(page.layout);
  if (!family) {
    errors.push(`${base}/layout "${page.layout}" is not a known layout family.`);
    return;
  }
  const variant = page.variant ?? family.variants[0];
  if (!family.variants.includes(variant)) errors.push(`${base}/variant "${variant}" is not one of ${family.variants.join(', ')}.`);
  if (!isObject(page.slots)) {
    errors.push(`${base}/slots must be an object.`);
    return;
  }
  const known = new Set(family.slots.map((slot) => slot.name));
  for (const name of Object.keys(page.slots)) if (!known.has(name)) warnings.push(`${base}/slots/${name} is not used by ${family.id}.`);
  for (const slot of family.slots) {
    const value = page.slots[slot.name];
    const required = slot.requiredIn ? slot.requiredIn.includes(variant) : Boolean(slot.required);
    if (isEmpty(value)) {
      if (required) errors.push(`${base}/slots/${slot.name} (${slot.label}) is required.`);
      continue;
    }
    validateSlot(errors, warnings, `${base}/slots/${slot.name}`, slot, value as SlotValue);
  }
  if (page.notes !== undefined) checkLength(errors, `${base}/notes`, page.notes, 3000);
}

/** Structural + per-family validation. Layout overflow is reported as warnings. */
export function validateDesignSpec(value: unknown): DesignValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(value)) return { errors: ['Design must be an object.'], warnings };
  const spec = value as unknown as DesignSpec;
  if (spec.schema !== 'design-spec/v1') errors.push('/schema must be "design-spec/v1".');
  if (!isString(spec.id) || !spec.id) errors.push('/id is required.');
  checkLength(errors, '/title', spec.title, 120);
  if (!isString(spec.format) || !getFormat(spec.format)) errors.push(`/format "${String(spec.format)}" is not a known format.`);
  if (!isString(spec.theme) || !getTheme(spec.theme)) errors.push(`/theme "${String(spec.theme)}" is not a known theme.`);
  if (spec.locale !== undefined && (!isString(spec.locale) || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(spec.locale))) errors.push(`/locale "${String(spec.locale)}" is not a BCP 47 tag such as "en-IN".`);
  if (!Array.isArray(spec.pages) || spec.pages.length === 0) errors.push('/pages needs at least one page.');
  else if (spec.pages.length > MAX_PAGES) errors.push(`/pages allows at most ${MAX_PAGES} pages.`);
  if (errors.length) return { errors, warnings };

  const ids = new Set<string>();
  spec.pages.forEach((page, i) => {
    if (!isObject(page)) { errors.push(`/pages/${i} must be an object.`); return; }
    if (!isString(page.id) || !page.id) errors.push(`/pages/${i}/id is required.`);
    else if (ids.has(page.id)) errors.push(`/pages/${i}/id "${page.id}" is duplicated.`);
    ids.add(page.id);
    validatePage(errors, warnings, page, i);
  });
  if (errors.length) return { errors, warnings };

  spec.pages.forEach((page, i) => {
    const items = layoutPage(spec, i);
    // A layout may leave out text that has no room; say so instead of dropping it silently.
    const placed = new Set(items.map((item) => item.slot).filter(Boolean));
    for (const slot of getLayoutFamily(page.layout)!.slots) {
      const value = page.slots[slot.name];
      if (slot.kind === 'text' && isString(value) && value.trim() && !placed.has(slot.name)) warnings.push(`/pages/${i} ${slot.name}: no room for this text in this format; shorten other text or choose a larger format.`);
    }
    for (const item of items) {
      if (item.type !== 'text') continue;
      const shown = item.uppercase ? item.text.toUpperCase() : item.text;
      const needed = estimateTextHeight(shown, item.minSize, item.box.w, item.font, item.lineHeight, item.letterSpacing);
      if (needed > item.box.h * 1.05) warnings.push(`/pages/${i} ${item.slot ?? item.role}: text may not fit; shorten it or choose a larger format.`);
    }
  });
  return { errors, warnings };
}

export function assertValidDesignSpec(value: unknown): DesignSpec {
  const { errors } = validateDesignSpec(value);
  if (errors.length) throw new Error(`Invalid design: ${errors.slice(0, 5).join(' ')}`);
  return value as DesignSpec;
}
