import { LayoutBuilder, grid, inset, splitX, splitY } from '../engine';
import { agentSlot, cardsSlot, factsSlot, imageSlot, imagesSlot, listSlot, statsSlot, textSlot } from '../slots';
import { agentBar, bulletList, card, factRow } from './common';
import type { Box, LayoutFamily } from '../../types';

const OVERLAY = '#0b0f14';

// ---------------------------------------------------------------------------
// listing-hero
// ---------------------------------------------------------------------------

export const listingHero: LayoutFamily = {
  id: 'listing-hero',
  label: 'Listing hero',
  vertical: 'real-estate',
  description: 'Hero photo, price, address, beds/baths/sq ft facts, highlights and agent contact.',
  variants: ['classic'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Status (e.g. For Sale)', maxChars: 32 },
    { name: 'hero', kind: 'image', label: 'Hero photo' },
    { name: 'price', kind: 'text', label: 'Price', required: true, maxChars: 32 },
    { name: 'address', kind: 'text', label: 'Address', required: true, maxChars: 90 },
    { name: 'headline', kind: 'text', label: 'Headline', maxChars: 80 },
    { name: 'facts', kind: 'facts', label: 'Facts' },
    { name: 'features', kind: 'list', label: 'Highlights', maxItems: 4, maxChars: 60 },
    { name: 'agent', kind: 'agent', label: 'Agent' },
    { name: 'cta', kind: 'text', label: 'Call to action', maxChars: 60 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    b.background();
    const wide = b.cls === 'wide';
    const photo: Box = wide
      ? { x: 0, y: 0, w: b.W * 0.56, h: b.H }
      : { x: 0, y: 0, w: b.W, h: b.H * (b.cls === 'tall' ? 0.5 : 0.44) };
    b.image('hero-photo', 'hero', imageSlot(page, 'hero'), photo, { label: 'Add hero photo' });
    const eyebrow = textSlot(page, 'eyebrow');
    if (eyebrow) {
      const chip = { x: b.margin, y: b.margin, w: b.s(240), h: b.s(58) };
      b.rect('status-chip', chip, b.color.primary, { radius: b.s(Math.min(b.theme.radius, 29)) });
      b.text('status', 'eyebrow', eyebrow, inset(chip, b.s(16), b.s(12)), { size: 24, minSize: 12, weight: 700, color: b.color.onPrimary, align: 'center', uppercase: true, letterSpacing: 2, lineHeight: 1.1 });
    }
    let area: Box = wide
      ? { x: photo.w + b.margin, y: b.margin, w: b.W - photo.w - b.margin * 2, h: b.H - b.margin * 2 }
      : { x: b.margin, y: photo.h + b.s(44), w: b.W - b.margin * 2, h: b.H - photo.h - b.s(44) - b.margin };

    const agentH = agentBar(b, area, agentSlot(page, 'agent'));
    if (agentH) area = { ...area, h: area.h - agentH - b.s(24) };
    area = b.ctaBar(area, textSlot(page, 'cta'));

    let y = area.y;
    const headline = textSlot(page, 'headline');
    if (headline) {
      const used = b.text('headline', 'headline', headline, { x: area.x, y, w: area.w, h: b.s(wide ? 110 : 64) }, { font: 'heading', size: wide ? 44 : 38, minSize: 18, weight: 600, color: b.color.muted });
      y += used + b.s(10);
    }
    const priceUsed = b.text('price', 'price', textSlot(page, 'price'), { x: area.x, y, w: area.w, h: b.s(100) }, { font: 'heading', size: 84, minSize: 32, weight: 800, color: b.color.primary, lineHeight: 1 });
    y += priceUsed + b.s(14);
    const addressUsed = b.text('address', 'address', textSlot(page, 'address'), { x: area.x, y, w: area.w, h: b.s(84) }, { size: 32, minSize: 16, weight: 500, lineHeight: 1.2 });
    y += addressUsed + b.s(26);
    const factsH = factRow(b, { x: area.x, y, w: area.w, h: b.s(56) }, factsSlot(page, 'facts'));
    if (factsH) {
      y += factsH + b.s(18);
      b.line('divider', [area.x, y, area.x + area.w, y], b.color.border, Math.max(1, b.s(2)));
      y += b.s(22);
    }
    const features = listSlot(page, 'features');
    bulletList(b, { x: area.x, y, w: area.w, h: area.y + area.h - y }, features, 'features', { columns: wide || features.length < 3 ? 1 : 2, size: 26, maxRowHeight: 70 });
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// open-house
// ---------------------------------------------------------------------------

export const openHouse: LayoutFamily = {
  id: 'open-house',
  label: 'Open house',
  vertical: 'real-estate',
  description: 'Full-bleed photo with an open-house banner, date and time, address and highlights.',
  variants: ['overlay'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Banner', maxChars: 24 },
    { name: 'hero', kind: 'image', label: 'Photo' },
    { name: 'date', kind: 'text', label: 'Date', required: true, maxChars: 40 },
    { name: 'time', kind: 'text', label: 'Time', maxChars: 40 },
    { name: 'address', kind: 'text', label: 'Address', required: true, maxChars: 90 },
    { name: 'headline', kind: 'text', label: 'Headline', maxChars: 80 },
    { name: 'highlights', kind: 'list', label: 'Highlights', maxItems: 3, maxChars: 60 },
    { name: 'agent', kind: 'agent', label: 'Agent' },
    { name: 'cta', kind: 'text', label: 'Call to action', maxChars: 60 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    b.background(OVERLAY);
    b.image('hero-photo', 'hero', imageSlot(page, 'hero'), { x: 0, y: 0, w: b.W, h: b.H }, { label: 'Add property photo' });
    const wide = b.cls === 'wide';
    const panel: Box = wide ? { x: 0, y: 0, w: b.W * 0.5, h: b.H } : { x: 0, y: b.H * 0.36, w: b.W, h: b.H * 0.64 };
    b.rect('overlay', panel, OVERLAY, { opacity: 0.8 });
    let area: Box = wide ? inset(panel, b.margin) : { x: b.margin, y: panel.y + b.s(40), w: b.W - b.margin * 2, h: panel.h - b.s(40) - b.margin };

    // Banner sits above the panel on tall formats, at the top of the panel otherwise.
    const bannerBox: Box = wide ? { x: area.x, y: area.y, w: area.w, h: b.s(120) } : { x: b.margin, y: b.margin, w: b.W - b.margin * 2, h: b.s(132) };
    b.text('banner', 'eyebrow', textSlot(page, 'eyebrow') || 'Open House', bannerBox, { font: 'heading', size: 112, minSize: 40, weight: 800, color: '#ffffff', uppercase: true, letterSpacing: 4, lineHeight: 1 });
    if (wide) area = { ...area, y: area.y + bannerBox.h + b.s(20), h: area.h - bannerBox.h - b.s(20) };

    const agentH = agentBar(b, area, agentSlot(page, 'agent'), { dark: true });
    if (agentH) area = { ...area, h: area.h - agentH - b.s(24) };
    area = b.ctaBar(area, textSlot(page, 'cta'));

    let y = area.y;
    const dateBox = { x: area.x, y, w: Math.min(area.w, b.s(560)), h: b.s(128) };
    b.rect('date-badge', dateBox, b.color.primary, { radius: b.s(Math.min(b.theme.radius, 24)) });
    b.text('date', 'date', textSlot(page, 'date'), { x: dateBox.x + b.s(24), y: dateBox.y + b.s(16), w: dateBox.w - b.s(48), h: b.s(54) }, { font: 'heading', size: 44, minSize: 18, weight: 800, color: b.color.onPrimary, lineHeight: 1.1 });
    b.text('time', 'time', textSlot(page, 'time'), { x: dateBox.x + b.s(24), y: dateBox.y + b.s(74), w: dateBox.w - b.s(48), h: b.s(40) }, { size: 28, minSize: 14, weight: 600, color: b.color.onPrimary, lineHeight: 1.1 });
    y += dateBox.h + b.s(28);
    const headline = textSlot(page, 'headline');
    if (headline) y += b.text('headline', 'headline', headline, { x: area.x, y, w: area.w, h: b.s(110) }, { font: 'heading', size: 48, minSize: 20, weight: 700, color: '#ffffff' }) + b.s(12);
    const pin = b.s(36);
    b.icon('address-icon', undefined, 'map-pin', { x: area.x, y: y + b.s(2), w: pin, h: pin }, b.color.accent);
    y += b.text('address', 'address', textSlot(page, 'address'), { x: area.x + pin + b.s(12), y, w: area.w - pin - b.s(12), h: b.s(84) }, { size: 32, minSize: 16, weight: 500, color: '#ffffff', lineHeight: 1.2 }) + b.s(24);
    bulletList(b, { x: area.x, y, w: area.w, h: area.y + area.h - y }, listSlot(page, 'highlights'), 'highlights', { color: '#ffffff', iconColor: b.color.accent, size: 28, maxRowHeight: 70 });
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// property-feature-grid
// ---------------------------------------------------------------------------

export const propertyFeatureGrid: LayoutFamily = {
  id: 'property-feature-grid',
  label: 'Property features',
  vertical: 'real-estate',
  description: 'Up to four photos plus an icon grid of property features or neighbourhood highlights.',
  variants: ['mosaic', 'gallery'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Eyebrow', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Title', required: true, maxChars: 80 },
    { name: 'subtitle', kind: 'text', label: 'Subtitle', maxChars: 160 },
    { name: 'photos', kind: 'images', label: 'Photos', maxItems: 4 },
    { name: 'features', kind: 'cards', label: 'Features', minItems: 0, maxItems: 8 },
    { name: 'cta', kind: 'text', label: 'Call to action', maxChars: 60 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    b.background();
    let area = b.ctaBar(b.safe, textSlot(page, 'cta'));
    area = b.header(area, { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') }, { titleSize: 72 });
    const photos = imagesSlot(page, 'photos');
    const features = cardsSlot(page, 'features');
    const gallery = page.variant === 'gallery' || !features.length;
    let photoArea: Box | undefined;
    let featureArea: Box | undefined;
    if (gallery) photoArea = area;
    else if (!photos.length) featureArea = area;
    else [photoArea, featureArea] = b.cls === 'wide' ? splitX(area, 0.52, b.s(40)) : splitY(area, 0.5, b.s(32));

    if (photoArea) {
      const count = Math.max(1, Math.min(4, photos.length || (gallery ? 4 : 3)));
      const gap = b.s(16);
      const radius = b.s(Math.min(b.theme.radius, 20));
      if (count >= 3) {
        const [big, rest] = b.cls === 'tall' && !gallery ? splitY(photoArea, 0.58, gap) : splitX(photoArea, 0.58, gap);
        b.image('photo', 'photos.0', photos[0], big, { radius });
        const small = b.cls === 'tall' && !gallery ? grid(rest, count - 1, count - 1, gap) : grid(rest, count - 1, 1, gap);
        small.forEach((box, i) => b.image('photo', `photos.${i + 1}`, photos[i + 1], box, { radius }));
      } else {
        grid(photoArea, count, b.cls === 'tall' ? 1 : count, gap).forEach((box, i) => b.image('photo', `photos.${i}`, photos[i], box, { radius }));
      }
    }
    if (featureArea && features.length) {
      const cols = featureArea.w / featureArea.h > 1.3 ? (features.length > 4 ? 3 : 2) : 2;
      grid(featureArea, features.length, Math.min(cols, features.length), b.s(16)).forEach((box, i) =>
        card(b, box, { title: features[i].title, body: features[i].body, icon: features[i].icon ?? 'home-check' }, i, { slot: `features.${i}`, compact: true }));
    }
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// just-sold
// ---------------------------------------------------------------------------

export const justSold: LayoutFamily = {
  id: 'just-sold',
  label: 'Just sold',
  vertical: 'real-estate',
  description: 'Celebrates a closed sale with a banner, photo, address and up to three result stats.',
  variants: ['ribbon'],
  slots: [
    { name: 'banner', kind: 'text', label: 'Banner', maxChars: 24 },
    { name: 'hero', kind: 'image', label: 'Photo' },
    { name: 'address', kind: 'text', label: 'Address', required: true, maxChars: 90 },
    { name: 'price', kind: 'text', label: 'Sale price', maxChars: 32 },
    { name: 'headline', kind: 'text', label: 'Headline', maxChars: 80 },
    { name: 'stats', kind: 'stats', label: 'Results', maxItems: 3 },
    { name: 'agent', kind: 'agent', label: 'Agent' },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    b.background();
    const wide = b.cls === 'wide';
    const photo: Box = wide ? { x: 0, y: 0, w: b.W * 0.5, h: b.H } : { x: 0, y: 0, w: b.W, h: b.H * (b.cls === 'tall' ? 0.48 : 0.42) };
    b.image('hero-photo', 'hero', imageSlot(page, 'hero'), photo, { label: 'Add property photo' });
    const ribbonH = b.s(wide ? 120 : 132);
    const ribbon: Box = { x: 0, y: photo.y + photo.h - ribbonH - b.s(wide ? 60 : 36), w: wide ? photo.w * 0.9 : b.W * 0.78, h: ribbonH };
    b.rect('ribbon', ribbon, b.color.primary);
    b.text('banner', 'banner', textSlot(page, 'banner') || 'Just Sold', { x: b.margin, y: ribbon.y + ribbonH * 0.16, w: ribbon.w - b.margin * 1.5, h: ribbonH * 0.7 }, { font: 'heading', size: 88, minSize: 30, weight: 800, color: b.color.onPrimary, uppercase: true, letterSpacing: 4, lineHeight: 1 });

    let area: Box = wide
      ? { x: photo.w + b.margin, y: b.margin, w: b.W - photo.w - b.margin * 2, h: b.H - b.margin * 2 }
      : { x: b.margin, y: photo.h + b.s(40), w: b.W - b.margin * 2, h: b.H - photo.h - b.s(40) - b.margin };
    const agentH = agentBar(b, area, agentSlot(page, 'agent'));
    if (agentH) area = { ...area, h: area.h - agentH - b.s(24) };
    let y = area.y;
    const headline = textSlot(page, 'headline');
    if (headline) y += b.text('headline', 'headline', headline, { x: area.x, y, w: area.w, h: b.s(100) }, { font: 'heading', size: 42, minSize: 18, weight: 600, color: b.color.muted }) + b.s(10);
    y += b.text('address', 'address', textSlot(page, 'address'), { x: area.x, y, w: area.w, h: b.s(120) }, { font: 'heading', size: 52, minSize: 20, weight: 800, lineHeight: 1.1 }) + b.s(12);
    const price = textSlot(page, 'price');
    if (price) y += b.text('price', 'price', price, { x: area.x, y, w: area.w, h: b.s(70) }, { font: 'heading', size: 56, minSize: 22, weight: 700, color: b.color.primary, lineHeight: 1 }) + b.s(26);
    const stats = statsSlot(page, 'stats');
    if (stats.length && area.y + area.h - y > b.s(80)) {
      const statArea = { x: area.x, y, w: area.w, h: Math.min(b.s(170), area.y + area.h - y) };
      grid(statArea, stats.length, stats.length, b.s(18)).forEach((box, i) => {
        b.rect('stat', box, b.color.surfaceAlt, { radius: b.s(Math.min(b.theme.radius, 20)) });
        const inner = inset(box, b.s(16), b.s(14));
        b.text('stat-value', `stats.${i}.value`, stats[i].value, { x: inner.x, y: inner.y, w: inner.w, h: inner.h * 0.58 }, { font: 'heading', size: 54, minSize: 18, weight: 800, color: b.color.primary, align: 'center', lineHeight: 1 });
        b.text('stat-label', `stats.${i}.label`, stats[i].label, { x: inner.x, y: inner.y + inner.h * 0.62, w: inner.w, h: inner.h * 0.38 }, { size: 22, minSize: 11, color: b.color.muted, align: 'center', lineHeight: 1.1 });
      });
    }
    b.brandMark();
    return b.primitives;
  },
};
