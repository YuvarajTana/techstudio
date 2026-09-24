import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutPage, specFromPages, validateDesignSpec, type DesignSpec } from '../src/index.ts';
import { STARTER_TEMPLATES } from '../src/catalog/index.ts';

/** Page JSON shaped like the Fabric adapter's output (text + image objects with slot tags). */
function canvasPages(spec: DesignSpec, options: { legacyTags?: boolean } = {}) {
  return spec.pages.map((page, index) => ({
    id: `page-${page.id}`,
    data: JSON.stringify({
      objects: layoutPage(spec, index).flatMap((item) => {
        const tags = options.legacyTags
          ? { posterField: item.slot } // saved before design* props were persisted
          : { designSlot: item.slot, posterField: item.slot, designPageId: page.id };
        if (item.type === 'text') return [{ type: 'textbox', text: item.uppercase ? item.text.toUpperCase() : item.text, ...tags }];
        if (item.type === 'image') return [{ type: 'group', designPlaceholder: true, ...tags }];
        return [{ type: 'rect', ...tags }];
      }),
    }),
  }));
}

function edit(pages: ReturnType<typeof canvasPages>, pageIndex: number, slot: string, change: Record<string, unknown>) {
  const data = JSON.parse(pages[pageIndex].data);
  const object = data.objects.find((o: { posterField?: string }) => o.posterField === slot);
  assert.ok(object, `no object for ${slot}`);
  Object.assign(object, change);
  pages[pageIndex].data = JSON.stringify(data);
}

const template = (id: string) => STARTER_TEMPLATES.find((t) => t.id === id)!.spec;

test('unedited canvas produces no changes (uppercase styling is ignored)', () => {
  for (const starter of STARTER_TEMPLATES) {
    const { changed, spec } = specFromPages(starter.spec, canvasPages(starter.spec));
    assert.deepEqual(changed, [], starter.name);
    assert.deepEqual(spec, starter.spec);
  }
});

test('text edits round-trip into nested slots', () => {
  const deck = template('ds-deck-http-lesson');
  const pages = canvasPages(deck);
  edit(pages, 0, 'title', { text: 'How the web talks' });
  edit(pages, 1, 'cards.2.body', { text: 'Metadata for content type and caching.' });
  edit(pages, 2, 'flow.nodes.1.label', { text: 'Resolve DNS' });
  edit(pages, 3, 'callouts.0.title', { text: 'Start line: method, path, version' });
  edit(pages, 4, 'right.points.1', { text: 'Body carries the data' });
  const { spec, changed } = specFromPages(deck, pages);
  assert.deepEqual(changed, ['title/title', 'ideas/cards.2.body', 'flow/flow.nodes.1.label', 'code/callouts.0.title', 'compare/right.points.1']);
  assert.equal(spec.pages[0].slots.title, 'How the web talks');
  assert.equal((spec.pages[1].slots.cards as { body: string }[])[2].body, 'Metadata for content type and caching.');
  assert.equal((spec.pages[2].slots.flow as { nodes: { label: string }[] }).nodes[1].label, 'Resolve DNS');
  assert.equal((spec.pages[3].slots.callouts as string[])[0], 'Start line: method, path, version');
  assert.equal((spec.pages[4].slots.right as { points: string[] }).points[1], 'Body carries the data');
  assert.deepEqual(validateDesignSpec(spec).errors, []);
  assert.equal(deck.pages[0].slots.title, 'How HTTP requests work', 'input spec is not mutated');
});

test('projects saved without design tags still sync by page id and posterField', () => {
  const spec = template('ds-tech-caching-101');
  const pages = canvasPages(spec, { legacyTags: true });
  edit(pages, 0, 'cards.0.title', { text: 'Hit' });
  assert.equal((specFromPages(spec, pages).spec.pages[0].slots.cards as { title: string }[])[0].title, 'Hit');
});

test('derived fact chips are ignored; replaced photos keep their owned asset id', () => {
  const spec = template('ds-re-modern-family-home');
  const pages = canvasPages(spec);
  edit(pages, 0, 'facts.beds', { text: '9 Beds' });
  edit(pages, 0, 'price', { text: '$699,000' });
  edit(pages, 0, 'hero', { type: 'image', designPlaceholder: false, assetUrl: '/media/uploads/u1/house.jpg', assetId: 'upl_123' });
  const { spec: next, changed } = specFromPages(spec, pages);
  assert.deepEqual(changed.sort(), ['p1/hero', 'p1/price']);
  assert.deepEqual((next.pages[0].slots.facts as { beds: number }).beds, 4);
  assert.deepEqual(next.pages[0].slots.hero, { src: '/media/uploads/u1/house.jpg', alt: 'Front of the house', assetId: 'upl_123' });
});

test('malformed page data and unknown slots are skipped', () => {
  const spec = template('ds-tech-sql-vs-nosql');
  const result = specFromPages(spec, [
    { id: 'page-p1', data: 'not json' },
    { id: 'page-p1', data: JSON.stringify({ objects: [{ type: 'textbox', text: 'x', designSlot: 'nope.3.title' }, { type: 'textbox', text: 'y' }] }) },
  ]);
  assert.deepEqual(result.changed, []);
});
