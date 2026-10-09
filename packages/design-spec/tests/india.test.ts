import assert from 'node:assert/strict';
import test from 'node:test';
import { FORMATS, THEMES, applyBusinessProfile, getTheme, layoutPage, validateDesignSpec, type AgentValue, type DesignSpec } from '../src/index.ts';
import { factChips, formatNumber } from '../src/layout/slots.ts';
import { INDIA_TEMPLATES, STARTER_TEMPLATES, instantiateTemplate, searchTemplates, upcomingTemplates } from '../src/catalog/index.ts';
import { toCreativeVideo } from '../src/video/index.ts';

const byId = (id: string) => STARTER_TEMPLATES.find((t) => t.id === id)!;

function luminance(hex: string) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('Indian starters are tagged, use en-IN and cover every occasion vertical', () => {
  assert.ok(INDIA_TEMPLATES.length >= 20);
  for (const template of INDIA_TEMPLATES) {
    assert.equal(template.region, 'india', template.id);
    assert.equal(template.spec.locale, 'en-IN', template.id);
    assert.ok(STARTER_TEMPLATES.includes(template), `${template.id} is a starter`);
  }
  const verticals = new Set(INDIA_TEMPLATES.map((t) => t.vertical));
  for (const vertical of ['festival', 'business', 'events', 'education', 'real-estate']) assert.ok(verticals.has(vertical as never), vertical);
});

test('festive and business themes keep readable contrast', () => {
  for (const theme of THEMES.filter((t) => ['festival', 'events', 'business'].includes(t.vertical))) {
    const c = theme.color;
    assert.ok(contrast(c.text, c.background) >= 7, `${theme.id} text`);
    assert.ok(contrast(c.muted, c.background) >= 4.5, `${theme.id} muted`);
    assert.ok(contrast(c.muted, c.surfaceAlt) >= 4.5, `${theme.id} muted on panels`);
    // Primary is used for large headings and badge fills.
    assert.ok(contrast(c.primary, c.background) >= 3, `${theme.id} primary`);
    assert.ok(contrast(c.onPrimary, c.primary) >= 3, `${theme.id} on primary`);
  }
});

test('festive decorations stay in the margins and never cover content', () => {
  for (const id of ['marigold', 'tiranga', 'kasavu']) {
    const spec: DesignSpec = { ...byId('ds-in-diwali').spec, theme: id };
    const items = layoutPage(spec, 0);
    const decorations = items.filter((item) => item.role.startsWith('decoration-') && item.role !== 'decoration-frame');
    assert.ok(decorations.length > 0, `${id} draws a decoration`);
    const format = FORMATS.find((f) => f.id === spec.format)!;
    const margin = 64;
    for (const item of decorations) {
      const top = item.box.y + item.box.h <= margin;
      const bottom = item.box.y >= format.height - margin;
      assert.ok(top || bottom, `${id} ${item.role} at y=${item.box.y} intrudes into the content area`);
    }
  }
  assert.equal(getTheme('diwali-night')?.decoration, 'mandala');
});

test('BHK, facing and Indian digit grouping', () => {
  assert.equal(formatNumber(120000, 'en-IN'), '1,20,000');
  assert.equal(formatNumber(120000), '120,000');
  assert.equal(formatNumber(1650, 'not a locale'), '1,650');
  const chips = factChips({ bhk: 3, beds: 4, baths: 3, sqft: 125000, facing: 'East facing' }, 'en-IN');
  assert.deepEqual(chips.map((c) => c.text), ['3 BHK', '3 Baths', '1,25,000 sq ft', 'East facing']);
  assert.equal(chips.find((c) => c.key === 'facing')?.icon, 'compass');

  const listing = layoutPage(byId('ds-in-3bhk-apartment').spec, 0);
  assert.ok(listing.some((item) => item.type === 'text' && item.text === '3 BHK'));
  const legal = listing.find((item) => item.role === 'footnote');
  assert.ok(legal && legal.type === 'text' && legal.text.startsWith('RERA'), 'RERA line is drawn');
});

test('locale must be a BCP 47 tag', () => {
  const spec = instantiateTemplate(byId('ds-in-diwali'), { id: 'x' });
  assert.deepEqual(validateDesignSpec({ ...spec, locale: 'te-IN' }).errors, []);
  assert.ok(validateDesignSpec({ ...spec, locale: 'Telugu please' }).errors[0].includes('locale'));
});

test('upcoming festivals are ordered by how soon their season starts', () => {
  const october = upcomingTemplates(STARTER_TEMPLATES, new Date(2026, 9, 9)).map((t) => t.id);
  assert.ok(october.includes('ds-in-diwali') && october.includes('ds-in-diwali-sale') && october.includes('ds-in-dussehra'), october.join(','));
  assert.ok(!october.includes('ds-in-sankranti'));
  const january = upcomingTemplates(STARTER_TEMPLATES, new Date(2027, 0, 2)).map((t) => t.id);
  assert.ok(january.includes('ds-in-sankranti') && january.includes('ds-in-republic-day'));
  // December looks one month ahead and wraps into January.
  const december = upcomingTemplates(STARTER_TEMPLATES, new Date(2026, 11, 1)).map((t) => t.id);
  assert.equal(december[0], 'ds-in-christmas');
  assert.ok(december.includes('ds-in-sankranti'));
  assert.ok(STARTER_TEMPLATES.filter((t) => !t.season).every((t) => !december.includes(t.id)));
});

test('search understands regional and festival names', () => {
  const ids = (query: string) => searchTemplates(STARTER_TEMPLATES, query).map((t) => t.id);
  assert.ok(ids('deepavali').includes('ds-in-diwali'));
  assert.ok(ids('pelli').includes('ds-in-wedding-invite'));
  assert.ok(ids('gruhapravesam').includes('ds-in-griha-pravesh'));
  assert.ok(ids('india plots').includes('ds-in-open-plots'));
  assert.ok(ids('telugu').includes('ds-in-ugadi'));
});

test('occasion layouts map to promotion videos with an outro', () => {
  const festival = toCreativeVideo(byId('ds-in-diwali').spec);
  assert.equal(festival.purpose, 'promotion');
  assert.equal(festival.style?.themeId, 'diwali-night');
  assert.equal(festival.scenes[0].type, 'title');
  assert.equal(festival.scenes.at(-1)?.type, 'logo');
  assert.equal(festival.brand.name, 'Sri Lakshmi Jewellers', 'video header names the sender');

  const sale = toCreativeVideo(byId('ds-in-diwali-sale').spec);
  assert.ok(sale.scenes.some((s) => s.type === 'slide' && s.title.toUpperCase().includes('40%')), 'offer statement');

  const invite = toCreativeVideo(byId('ds-in-wedding-invite').spec);
  assert.equal(invite.brand.name, 'Ananya & Karthik');
  assert.ok(invite.scenes.some((s) => s.type === 'slide' && s.title.includes('10 December')), 'date statement');

  const listing = toCreativeVideo(byId('ds-in-3bhk-apartment').spec).scenes.find((s) => s.type === 'listing');
  assert.ok(listing && listing.type === 'listing');
  assert.equal(listing.facts.beds, 3);
  assert.equal(listing.facts.lot, 'East facing');

  // Purpose follows the layouts, not the theme: an admissions offer on a navy theme still promotes.
  const admissions = toCreativeVideo(byId('ds-in-admissions-open').spec);
  assert.equal(admissions.style?.themeId, 'corporate-navy');
  assert.equal(admissions.purpose, 'promotion');
});

test('saved business details fill the right slot in each layout', () => {
  const profile = { name: 'Kaveri Sweets', phone: '+91 98480 00000', address: 'Tilak Road, Rajahmundry' };
  const greeting = applyBusinessProfile(byId('ds-in-diwali').spec, profile);
  assert.equal(greeting.pages[0].slots.sender, 'Kaveri Sweets');
  assert.equal(greeting.pages[0].slots.contact, 'Tilak Road, Rajahmundry · +91 98480 00000');
  const sale = applyBusinessProfile(byId('ds-in-diwali-sale').spec, profile);
  assert.equal(sale.pages[0].slots.title, 'Kaveri Sweets');
  assert.equal(sale.pages[0].slots.phone, '+91 98480 00000');
  const invite = applyBusinessProfile(byId('ds-in-wedding-invite').spec, profile);
  assert.equal(invite.pages[0].slots.rsvp, 'RSVP: +91 98480 00000');
  assert.equal(invite.pages[0].slots.title, 'Ananya & Karthik', 'personal invites keep their names');
  const listing = applyBusinessProfile(byId('ds-in-3bhk-apartment').spec, { name: 'Kaveri Realty', phone: '+91 98480 00000' });
  assert.equal(listing.brand?.name, 'Kaveri Realty');
  assert.equal((listing.pages[0].slots.agent as AgentValue).phone, '+91 98480 00000');
  // Only the given fields change; the template itself is untouched.
  const nameOnly = applyBusinessProfile(byId('ds-in-diwali').spec, { name: 'Kaveri Sweets' });
  assert.equal(nameOnly.pages[0].slots.contact, byId('ds-in-diwali').spec.pages[0].slots.contact);
  assert.equal(byId('ds-in-diwali').spec.pages[0].slots.sender, 'Sri Lakshmi Jewellers');
  // Long values are clipped to the slot limit so the design stays valid.
  const long = applyBusinessProfile(byId('ds-in-diwali-sale').spec, { name: 'x'.repeat(200) });
  assert.deepEqual(validateDesignSpec(long).errors, []);
});

test('text with ₹ moves from a heading font without the glyph to the body font', () => {
  const sale = instantiateTemplate(byId('ds-in-grand-opening'), { id: 'x' });
  assert.equal(getTheme(sale.theme)?.font.heading.family, 'Outfit');
  const items = layoutPage(sale, 0);
  const text = (slot: string) => items.find((item) => item.type === 'text' && item.slot === slot) as Extract<(typeof items)[number], { type: 'text' }>;
  assert.equal(text('offer').font, 'body', 'Free gift on ₹999+ in Inter');
  assert.equal(text('title').font, 'heading', 'text without ₹ keeps Outfit');
  // Playfair Display has ₹, so Playfair themes keep their heading font.
  const marigold = layoutPage(byId('ds-in-diwali-sale').spec, 0);
  assert.equal((marigold.find((item) => item.type === 'text' && item.slot === 'items.0.body') as { font: string }).font, 'heading');
});

test('text that has no room is reported instead of silently dropped', () => {
  const invite = instantiateTemplate(byId('ds-in-naming-ceremony'), { format: 'square', id: 'x' });
  invite.pages[0].slots.subtitle = 'We would be delighted to have you with us as we name our little one.';
  invite.pages[0].slots.venue = 'Sri Krishna Function Hall, Road No. 12, Banjara Hills, Hyderabad';
  const placed = new Set(layoutPage(invite, 0).map((item) => item.slot));
  const { warnings } = validateDesignSpec(invite);
  for (const slot of ['title', 'date', 'time', 'venue', 'subtitle']) {
    if (!placed.has(slot)) assert.ok(warnings.some((w) => w.includes(` ${slot}: no room`)), `${slot} dropped without a warning`);
  }
  // The big names shrink first, so date and venue survive on the sample text.
  for (const id of ['ds-in-wedding-invite', 'ds-in-griha-pravesh']) {
    const spec = instantiateTemplate(byId(id), { format: 'square', id: 'x' });
    spec.pages[0].variant = 'photo';
    const slots = new Set(layoutPage(spec, 0).map((item) => item.slot));
    assert.ok(slots.has('date') && slots.has('venue'), `${id}: ${[...slots].join(',')}`);
  }
});
