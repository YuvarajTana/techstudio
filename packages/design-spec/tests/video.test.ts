import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESET_SIZES, compileVideo, validateCreativeVideo, type CreativePreset } from '@teckstudio/lesson-video';
import { STARTER_TEMPLATES, adaptLegacyPosterTemplate, instantiateTemplate } from '../src/catalog/index.ts';
import { resolveDesignImage, toCreativeVideo } from '../src/video/index.ts';
import { TECH_POSTER_TEMPLATES } from '../../../frontend/src/data/techPosterTemplates.ts';

const PRESETS = Object.keys(PRESET_SIZES) as CreativePreset[];

test('every starter template maps to a valid video in every preset', () => {
  for (const template of STARTER_TEMPLATES) {
    for (const preset of PRESETS) {
      const video = toCreativeVideo(template.spec, { preset });
      assert.deepEqual(validateCreativeVideo(video), [], `${template.name} ${preset}`);
      const plan = compileVideo(video);
      assert.ok(plan.durationInFrames >= 450 && plan.durationInFrames <= 2700, `${template.name}: ${plan.durationInFrames} frames`);
      assert.deepEqual({ width: plan.width, height: plan.height }, PRESET_SIZES[preset]);
    }
  }
});

test('every legacy template maps to a valid video', () => {
  for (const template of TECH_POSTER_TEMPLATES.map(adaptLegacyPosterTemplate)) {
    assert.deepEqual(validateCreativeVideo(toCreativeVideo(template.spec)), [], template.name);
  }
});

test('the default preset follows the design format', () => {
  const deck = STARTER_TEMPLATES.find((t) => t.id === 'ds-deck-http-lesson')!;
  assert.equal(toCreativeVideo(deck.spec).output.preset, 'landscape-1080p');
  assert.equal(toCreativeVideo(instantiateTemplate(deck, { format: 'story' })).output.preset, 'portrait-1080p');
  assert.equal(toCreativeVideo(instantiateTemplate(deck, { format: 'square' })).output.preset, 'square-1080');
});

test('decks keep page order, use motion scenes and carry speaker notes as narration', () => {
  const deck = STARTER_TEMPLATES.find((t) => t.id === 'ds-deck-http-lesson')!;
  const video = toCreativeVideo(deck.spec);
  const types = video.scenes.map((s) => s.type);
  assert.deepEqual(types.slice(0, 2), ['title', 'slide']);
  assert.ok(types.includes('process') && types.includes('code') && types.includes('comparison'), types.join(','));
  assert.ok(video.scenes.slice(1).every((s) => s.transitionIn), 'every cut after the first has a transition');
  assert.equal(video.scenes[0].narration?.text, deck.spec.pages[0].notes);
  assert.equal(video.style?.themeId, 'corporate-navy');
  assert.equal(video.purpose, 'explainer');
});

test('real-estate listings become listing scenes with resolved photos and an agent outro', () => {
  const template = STARTER_TEMPLATES.find((t) => t.id === 'ds-re-modern-family-home')!;
  const spec = instantiateTemplate(template, { id: 'x' });
  (spec.pages[0].slots.hero as { src: string }).src = '/media/uploads/u1/photo.jpg';
  const video = toCreativeVideo(spec, { resolveImage: (image) => (image.src.includes('/uploads/') ? { source: 'uploaded', assetId: 'upload_123' } : undefined) });
  const listing = video.scenes.find((s) => s.type === 'listing');
  assert.ok(listing && listing.type === 'listing');
  assert.deepEqual(listing.photoAssetIds, ['img-1']);
  assert.deepEqual(video.assets, [{ id: 'img-1', kind: 'image', source: 'uploaded', assetId: 'upload_123' }]);
  assert.equal(listing.facts.beds, 4);
  assert.equal(video.scenes.at(-1)?.type, 'logo');
  assert.equal(video.purpose, 'promotion');
  // Without a resolver the listing still validates, with a photo placeholder.
  const plain = toCreativeVideo(template.spec);
  assert.deepEqual(validateCreativeVideo(plain), []);
});

test('just-sold stats become animated counters', () => {
  const template = STARTER_TEMPLATES.find((t) => t.id === 'ds-re-just-sold')!;
  const stats = toCreativeVideo(template.spec).scenes.find((s) => s.type === 'stats');
  assert.ok(stats && stats.type === 'stats');
  assert.deepEqual(stats.items.map((i) => [i.value, i.suffix]), [[6, undefined], [104, '%'], [9, undefined]]);
});

test('default image resolver maps uploads and library photos, nothing else', () => {
  assert.deepEqual(resolveDesignImage({ src: '/media/uploads/u/1.png', assetId: 'upl_1' }), { source: 'uploaded', assetId: 'upl_1' });
  assert.deepEqual(resolveDesignImage({ src: '/media/asset-library-full/real-estate/01-house-exterior.jpg' }), { source: 'library', assetId: 'real-estate__01-house-exterior' });
  assert.deepEqual(resolveDesignImage({ src: 'http://127.0.0.1:5001/media/asset-library/nature/001-mountain-lake.jpg?v=2' }), { source: 'library', assetId: 'nature__001-mountain-lake' });
  for (const src of ['', 'https://example.com/a.jpg', 'data:image/png;base64,xx', '/media/asset-library/../secrets/x.jpg', '/media/asset-library/nature/sub/x.jpg']) {
    assert.equal(resolveDesignImage({ src }), undefined, src);
  }
  const template = STARTER_TEMPLATES.find((t) => t.id === 'ds-deck-property-listing')!;
  const spec = instantiateTemplate(template, { id: 'lib' });
  (spec.pages[0].slots.hero as { src: string }).src = '/media/asset-library-full/real-estate/01-house-exterior.jpg';
  (spec.pages[1].slots.photos as { src: string }[])[0].src = '/media/asset-library/real-estate/03-living-room.jpg';
  const video = toCreativeVideo(spec, { resolveImage: resolveDesignImage });
  assert.deepEqual(video.assets.map((a) => [a.source, a.assetId]), [['library', 'real-estate__01-house-exterior'], ['library', 'real-estate__03-living-room']]);
  const listing = video.scenes.find((s) => s.type === 'listing');
  assert.ok(listing && listing.type === 'listing' && listing.photoAssetIds[0] === 'img-1');
  assert.deepEqual(validateCreativeVideo(video), []);
});
