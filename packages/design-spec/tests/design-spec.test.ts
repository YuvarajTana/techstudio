import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  FORMATS,
  ICONS,
  LAYOUT_FAMILIES,
  THEMES,
  getIcon,
  layoutPage,
  validateDesignSpec,
  type Box,
  type DesignSpec,
  type Primitive,
} from '../src/index.ts';
import { STARTER_TEMPLATES, adaptLegacyPosterTemplate, instantiateTemplate } from '../src/catalog/index.ts';
import { TECH_POSTER_TEMPLATES } from '../../../frontend/src/data/techPosterTemplates.ts';

const LEGACY = TECH_POSTER_TEMPLATES.map(adaptLegacyPosterTemplate);
const ALL = [...STARTER_TEMPLATES, ...LEGACY];
const DECORATION = /^decoration-/;

function overlapArea(a: Box, b: Box) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function checkGeometry(spec: DesignSpec, pageIndex: number, label: string) {
  const format = FORMATS.find((f) => f.id === spec.format)!;
  const items = layoutPage(spec, pageIndex);
  assert.ok(items.length > 0, `${label}: produced no primitives`);
  const ids = new Set<string>();
  for (const item of items) {
    assert.ok(!ids.has(item.id), `${label}: duplicate primitive id ${item.id}`);
    ids.add(item.id);
    for (const v of [item.box.x, item.box.y, item.box.w, item.box.h]) assert.ok(Number.isFinite(v), `${label}: ${item.role} has a non-finite box`);
    if (DECORATION.test(item.role)) continue;
    const tolerance = 1;
    assert.ok(item.box.x >= -tolerance && item.box.y >= -tolerance, `${label}: ${item.role} starts outside the canvas`);
    assert.ok(item.box.x + item.box.w <= format.width + tolerance, `${label}: ${item.role} exceeds width`);
    assert.ok(item.box.y + item.box.h <= format.height + tolerance, `${label}: ${item.role} exceeds height`);
    if (item.type === 'text') {
      assert.ok(item.box.w > 0 && item.box.h > 0, `${label}: ${item.role} text box is empty`);
      assert.ok(item.size >= item.minSize, `${label}: ${item.role} size below its minimum`);
    }
  }
  const texts = items.filter((item): item is Extract<Primitive, { type: 'text' }> => item.type === 'text');
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const area = overlapArea(texts[i].box, texts[j].box);
      const smaller = Math.min(texts[i].box.w * texts[i].box.h, texts[j].box.w * texts[j].box.h);
      assert.ok(area <= smaller * 0.02, `${label}: text "${texts[i].slot ?? texts[i].role}" overlaps "${texts[j].slot ?? texts[j].role}"`);
    }
  }
}

test('registries are consistent', () => {
  assert.equal(new Set(FORMATS.map((f) => f.id)).size, FORMATS.length);
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  assert.equal(new Set(LAYOUT_FAMILIES.map((f) => f.id)).size, LAYOUT_FAMILIES.length);
  for (const family of LAYOUT_FAMILIES) assert.ok(family.variants.length > 0, family.id);
  assert.ok(LAYOUT_FAMILIES.filter((f) => f.vertical === 'tech').length >= 4);
  assert.ok(LAYOUT_FAMILIES.filter((f) => f.vertical === 'real-estate').length >= 4);
});

test('every legacy template size maps to a registered format', () => {
  for (const template of TECH_POSTER_TEMPLATES) {
    assert.ok(FORMATS.some((f) => f.width === template.width && f.height === template.height), `${template.name} ${template.width}x${template.height}`);
  }
});

test('all starter and legacy templates validate without errors', () => {
  assert.ok(TECH_POSTER_TEMPLATES.length >= 60);
  assert.equal(new Set(ALL.map((t) => t.id)).size, ALL.length, 'template ids are unique');
  for (const template of ALL) {
    const { errors } = validateDesignSpec(template.spec);
    assert.deepEqual(errors, [], template.name);
  }
});

test('starter templates fit their native format without overflow warnings', () => {
  for (const template of STARTER_TEMPLATES) {
    const { warnings } = validateDesignSpec(template.spec);
    assert.deepEqual(warnings, [], template.name);
  }
});

test('legacy templates honour their own size and layout family', () => {
  const byName = new Map(LEGACY.map((t) => [t.name, t]));
  assert.equal(byName.get('YouTube Tech Thumbnail')!.spec.format, 'youtube-thumb');
  assert.equal(byName.get('LinkedIn Thought Leadership')!.spec.format, 'linkedin');
  const layouts = new Set(LEGACY.map((t) => t.spec.pages[0].layout));
  assert.ok(layouts.has('architecture-flow') && layouts.has('comparison') && layouts.has('concept-cards'));
});

test('every starter lays out inside every alternate format', () => {
  for (const template of STARTER_TEMPLATES) {
    for (const format of new Set([template.spec.format, ...template.altFormats])) {
      const spec = instantiateTemplate(template, { format, id: 'x' });
      spec.pages.forEach((_, i) => checkGeometry(spec, i, `${template.name} [${format}] page ${i + 1}`));
    }
  }
});

test('every family lays out in every format and theme', () => {
  const byLayout = new Map<string, DesignSpec>();
  for (const template of STARTER_TEMPLATES) for (const page of template.spec.pages) {
    const key = `${page.layout}:${page.variant ?? ''}`;
    if (!byLayout.has(key)) byLayout.set(key, { ...template.spec, pages: [page] });
  }
  for (const family of LAYOUT_FAMILIES) assert.ok([...byLayout.keys()].some((key) => key.startsWith(`${family.id}:`)), `${family.id} has a starter`);
  for (const [key, spec] of byLayout) {
    for (const format of FORMATS) {
      for (const theme of [THEMES[0].id, THEMES[THEMES.length - 1].id]) {
        checkGeometry({ ...spec, format: format.id, theme }, 0, `${key} [${format.id}/${theme}]`);
      }
    }
  }
});

test('all legacy templates lay out inside their canvas', () => {
  for (const template of LEGACY) checkGeometry(template.spec, 0, template.name);
});

test('validation reports missing required slots, bad variants and broken flows', () => {
  const base = STARTER_TEMPLATES.find((t) => t.id === 'ds-tech-rag-pipeline')!.spec;
  const broken: DesignSpec = JSON.parse(JSON.stringify(base));
  delete broken.pages[0].slots.title;
  broken.pages[0].variant = 'spiral';
  (broken.pages[0].slots.flow as { edges: { from: string; to: string }[] }).edges.push({ from: 'docs', to: 'nowhere' });
  const { errors } = validateDesignSpec(broken);
  assert.ok(errors.some((e) => e.includes('slots/title')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('variant "spiral"')));
  assert.ok(errors.some((e) => e.includes('edges[5]')));
  assert.ok(validateDesignSpec({ ...base, format: 'billboard' }).errors[0].includes('format'));
  assert.ok(validateDesignSpec({ ...base, pages: [base.pages[0], base.pages[0]] }).errors.some((e) => e.includes('duplicated')));
});

test('long copy produces an overflow warning instead of silently clipping', () => {
  const base = STARTER_TEMPLATES.find((t) => t.id === 'ds-tech-caching-101')!.spec;
  const spec: DesignSpec = JSON.parse(JSON.stringify(base));
  spec.format = 'linkedin';
  spec.pages[0].slots.cards = Array.from({ length: 9 }, (_, i) => ({ title: `Card ${i + 1}`, body: 'word '.repeat(79).trim() }));
  const { errors, warnings } = validateDesignSpec(spec);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('cards.0.body')), warnings.join('\n'));
});

test('icons referenced by starters exist and the vendored set covers required.json', () => {
  const required = JSON.parse(readFileSync(new URL('../src/icons/required.json', import.meta.url), 'utf8'));
  for (const id of [...Object.keys(required.tabler), ...Object.keys(required.tablerBrands)]) assert.ok(ICONS[id], id);
  for (const slug of required.simpleIcons) assert.ok(ICONS[`logo:${slug}`], slug);
  for (const icon of Object.values(ICONS)) {
    assert.ok(icon.license && icon.paths.length > 0, icon.slug);
    assert.ok(!/SA-/.test(icon.license), `${icon.slug} is share-alike`);
  }
  const json = JSON.stringify(STARTER_TEMPLATES);
  for (const match of json.matchAll(/"icon":"([^"]+)"/g)) assert.ok(getIcon(match[1]), `unknown icon ${match[1]}`);
  for (const id of ['bed', 'bath', 'sqft', 'map-pin', 'key', 'floor-plan', 'server', 'database', 'logo:kubernetes', 'logo:aws']) assert.ok(getIcon(id), id);
});
