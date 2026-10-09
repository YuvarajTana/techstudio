import { LayoutBuilder, grid, inset, splitX, splitY, type TextStyle } from '../engine';
import { cardsSlot, imageSlot, textSlot } from '../slots';
import { cardColumns } from './common';
import type { Box, DesignPage, LayoutFamily } from '../../types';

/**
 * Occasion families: festival greetings, offers/menus/admissions and event
 * invitations. Written for Indian small businesses and families, but nothing
 * here is India-only; the Indian flavour comes from templates and themes.
 */

interface StackEntry {
  role: string;
  slot: string;
  text: string;
  style: TextStyle;
  /** Largest box height in canvas pixels. */
  maxH: number;
  /** Space after this entry in canvas pixels (default 18 reference units). */
  gap?: number;
  /** May give up height (smaller text) so later entries still fit. */
  flex?: boolean;
}
type Entry = StackEntry | 'ornament';

/** Thin frame inset from the page edge. `double` adds a second, finer frame. */
function frame(b: LayoutBuilder, double = false) {
  const outer = inset({ x: 0, y: 0, w: b.W, h: b.H }, b.margin * 0.42);
  const radius = b.s(Math.min(b.theme.radius, 28));
  b.rect('decoration-frame', outer, 'transparent', { radius, stroke: b.color.accent, strokeWidth: Math.max(1, b.s(3)), opacity: 0.75 });
  if (double) b.rect('decoration-frame', inset(outer, b.s(10)), 'transparent', { radius: Math.max(0, radius - b.s(8)), stroke: b.color.border, strokeWidth: Math.max(1, b.s(1.5)), opacity: 0.8 });
}

/** Centre dot flanked by two smaller dots and two rules. */
function ornament(b: LayoutBuilder, cx: number, cy: number, maxHalf: number) {
  const big = b.s(12);
  const small = b.s(8);
  b.rect('ornament', { x: cx - big / 2, y: cy - big / 2, w: big, h: big }, b.color.primary, { radius: big / 2 });
  for (const side of [-1, 1]) {
    const x = cx + side * b.s(24);
    b.rect('ornament', { x: x - small / 2, y: cy - small / 2, w: small, h: small }, b.color.accent, { radius: small / 2 });
    const reach = Math.max(b.s(40), Math.min(b.s(130), maxHalf));
    b.line('ornament', [cx + side * b.s(38), cy, cx + side * reach, cy], b.color.accent, Math.max(1, b.s(2)), { opacity: 0.8 });
  }
}

/** Measure entries top to bottom; `dropped` counts text entries that did not fit. */
function planStack(b: LayoutBuilder, area: Box, entries: Entry[], flexScale: number) {
  const defaultGap = b.s(18);
  const ornamentH = b.s(28);
  const plan: { entry: Entry; h: number; gap: number }[] = [];
  let dropped = 0;
  let y = area.y;
  for (const entry of entries) {
    if (entry === 'ornament') {
      if (!plan.length || area.y + area.h - y < ornamentH * 2) continue;
      plan.push({ entry, h: ornamentH, gap: defaultGap });
      y += ornamentH + defaultGap;
      continue;
    }
    if (!entry.text.trim()) continue;
    const remaining = area.y + area.h - y;
    if (remaining < b.s(24)) {
      dropped += 1;
      continue;
    }
    const maxH = entry.flex ? entry.maxH * flexScale : entry.maxH;
    const h = b.measureText(entry.text, { x: area.x, y, w: area.w, h: Math.min(maxH, remaining) }, entry.style);
    const gap = entry.gap ?? defaultGap;
    plan.push({ entry, h, gap });
    y += h + gap;
  }
  return { plan, dropped };
}

/**
 * Lay entries out top to bottom. With `center`, the measured block is centred
 * vertically in `area`. When entries do not fit, `flex` entries (the big
 * title) shrink first; anything still left over is dropped, and validation
 * reports it.
 */
function stack(b: LayoutBuilder, area: Box, entries: Entry[], opts: { center?: boolean } = {}) {
  let { plan, dropped } = planStack(b, area, entries, 1);
  for (const scale of [0.75, 0.55, 0.4]) {
    if (!dropped) break;
    ({ plan, dropped } = planStack(b, area, entries, scale));
  }
  while (plan.length && plan[plan.length - 1].entry === 'ornament') plan.pop();
  if (!plan.length) return;
  const total = plan.reduce((sum, item) => sum + item.h + item.gap, 0) - plan[plan.length - 1].gap;
  let top = opts.center ? area.y + Math.max(0, (area.h - total) / 2) : area.y;
  for (const { entry, h, gap } of plan) {
    if (entry === 'ornament') ornament(b, area.x + area.w / 2, top + h / 2, area.w / 2 - b.s(8));
    // +1px: the second fit must land on the size the measurement chose.
    else b.text(entry.role, entry.slot, entry.text, { x: area.x, y: top, w: area.w, h: h + 1 }, entry.style);
    top += h + gap;
  }
}

/** Entries pinned to the bottom of `area` under a short rule. Returns the area above. */
function footer(b: LayoutBuilder, area: Box, entries: StackEntry[]): Box {
  const visible = entries.filter((entry) => entry.text.trim());
  if (!visible.length) return area;
  const gap = b.s(8);
  const heights = visible.map((entry) => b.measureText(entry.text, { x: area.x, y: 0, w: area.w, h: entry.maxH }, entry.style));
  const total = heights.reduce((sum, h) => sum + h, 0) + gap * (visible.length - 1);
  const top = area.y + area.h - total;
  let y = top;
  visible.forEach((entry, i) => {
    b.text(entry.role, entry.slot, entry.text, { x: area.x, y, w: area.w, h: heights[i] + 1 }, entry.style);
    y += heights[i] + gap;
  });
  const ruleY = top - b.s(22);
  const half = Math.min(b.s(140), area.w * 0.3);
  const cx = area.x + area.w / 2;
  b.line('divider', [cx - half, ruleY, cx + half, ruleY], b.color.accent, Math.max(1, b.s(2)), { opacity: 0.8 });
  return { ...area, h: ruleY - b.s(22) - area.y };
}

/** Photo first (top on tall/square, left on wide); returns the remaining area. */
function photoSplit(b: LayoutBuilder, area: Box, slot: string, label: string, page: DesignPage): Box {
  const wide = b.cls === 'wide';
  const [first, second] = wide ? splitX(area, 0.46, b.s(48)) : splitY(area, b.cls === 'tall' ? 0.42 : 0.38, b.s(32));
  b.image('photo', slot, imageSlot(page, slot), first, { radius: b.s(Math.min(b.theme.radius, 32)), label });
  return second;
}

// ---------------------------------------------------------------------------
// festival-greeting
// ---------------------------------------------------------------------------

export const festivalGreeting: LayoutFamily = {
  id: 'festival-greeting',
  label: 'Festival greeting',
  vertical: 'festival',
  description: 'A big festival greeting, a short message and who it is from. Optional photo.',
  variants: ['centered', 'photo'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Lead-in (e.g. Wishing you a)', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Greeting', required: true, maxChars: 48 },
    { name: 'message', kind: 'text', label: 'Message', maxChars: 220 },
    { name: 'image', kind: 'image', label: 'Photo' },
    { name: 'sender', kind: 'text', label: 'From (business or family)', maxChars: 60 },
    { name: 'contact', kind: 'text', label: 'Contact line', maxChars: 100 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    const wide = b.cls === 'wide';
    b.background();
    frame(b);
    let area = inset(b.safe, b.s(16));
    if (page.variant === 'photo') area = photoSplit(b, area, 'image', 'Add a festive photo', page);
    area = footer(b, area, [
      { role: 'sender', slot: 'sender', text: textSlot(page, 'sender'), style: { font: 'heading', size: 40, minSize: 20, weight: 700, align: 'center', lineHeight: 1.1 }, maxH: b.s(96) },
      { role: 'contact', slot: 'contact', text: textSlot(page, 'contact'), style: { size: 24, minSize: 13, color: b.color.muted, align: 'center', lineHeight: 1.25 }, maxH: b.s(66) },
    ]);
    stack(b, area, [
      { role: 'eyebrow', slot: 'eyebrow', text: textSlot(page, 'eyebrow'), style: { size: 32, minSize: 16, color: b.color.muted, align: 'center', lineHeight: 1.2 }, maxH: b.s(84), gap: b.s(10) },
      { role: 'title', slot: 'title', text: textSlot(page, 'title'), style: { font: 'heading', size: wide ? 104 : 124, minSize: 36, weight: 800, color: b.color.primary, align: 'center', lineHeight: 1.04 }, maxH: area.h * 0.5, flex: true },
      'ornament',
      { role: 'message', slot: 'message', text: textSlot(page, 'message'), style: { size: 32, minSize: 15, align: 'center', lineHeight: 1.4 }, maxH: area.h },
    ], { center: true });
    // No corner brand mark: the sender line carries the brand, and the mark would cross the frame.
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// offer-promo
// ---------------------------------------------------------------------------

/** Icon + text rows (validity, address, phone) in a panel at the bottom. Returns the area above. */
function infoPanel(b: LayoutBuilder, area: Box, rows: { icon: string; slot: string; text: string }[]): Box {
  if (!rows.length) return area;
  const wide = b.cls === 'wide';
  const pad = b.s(wide ? 18 : 22);
  const cols = wide ? rows.length : 1;
  const rowH = (row: { slot: string }) => b.s(wide || row.slot !== 'address' ? 52 : 76);
  const cellH = wide ? Math.max(...rows.map((row) => rowH(row))) : 0;
  const innerH = wide ? b.s(76) : rows.reduce((sum, row) => sum + rowH(row), 0) + b.s(8) * (rows.length - 1);
  const panel = { x: area.x, y: area.y + area.h - innerH - pad * 2, w: area.w, h: innerH + pad * 2 };
  b.rect('info-panel', panel, b.color.surfaceAlt, { radius: b.s(Math.min(b.theme.radius, 22)) });
  const inner = inset(panel, pad);
  const colW = (inner.w - b.s(20) * (cols - 1)) / cols;
  let y = inner.y;
  rows.forEach((row, i) => {
    const h = wide ? Math.min(cellH, inner.h) : rowH(row);
    const x = inner.x + (wide ? i * (colW + b.s(20)) : 0);
    const icon = Math.min(b.s(30), h * 0.6);
    b.icon('info-icon', undefined, row.icon, { x, y: y + b.s(4), w: icon, h: icon }, b.color.primary);
    b.text(`info-${row.slot}`, row.slot, row.text, { x: x + icon + b.s(12), y: y + b.s(2), w: colW - icon - b.s(12), h: h - b.s(4) }, { size: 26, minSize: 13, weight: 600, lineHeight: 1.18 });
    if (!wide) y += h + b.s(8);
  });
  return { ...area, h: panel.y - b.s(24) - area.y };
}

/** Circular offer badge centred on (cx, cy). */
function offerBadge(b: LayoutBuilder, text: string, cx: number, cy: number, d: number) {
  b.rect('offer-badge', { x: cx - d / 2, y: cy - d / 2, w: d, h: d }, b.color.primary, { radius: d / 2 });
  const ring = d * 0.06;
  b.rect('offer-ring', { x: cx - d / 2 + ring, y: cy - d / 2 + ring, w: d - ring * 2, h: d - ring * 2 }, 'transparent', { radius: d / 2 - ring, stroke: b.color.onPrimary, strokeWidth: Math.max(1, b.s(2)), opacity: 0.55 });
  const box = { x: cx - d * 0.34, y: cy - d * 0.34, w: d * 0.68, h: d * 0.68 };
  const style: TextStyle = { font: 'heading', size: 68, minSize: 22, weight: 800, color: b.color.onPrimary, align: 'center', uppercase: true, lineHeight: 1.0 };
  const h = b.measureText(text, box, style);
  b.text('offer', 'offer', text, { ...box, y: cy - h / 2, h: h + 1 }, style);
}

/** Item tile: name above a highlighted price. */
function priceTile(b: LayoutBuilder, box: Box, item: { title: string; body?: string }, i: number) {
  b.rect('item', box, b.color.surface, { radius: b.s(Math.min(b.theme.radius, 20)), stroke: b.color.border, strokeWidth: Math.max(1, b.s(2)) });
  const inner = inset(box, b.s(18), b.s(14));
  const hasPrice = Boolean(item.body?.trim());
  const titleH = hasPrice ? inner.h * 0.5 : inner.h;
  const used = b.text('item-title', `items.${i}.title`, item.title, { x: inner.x, y: inner.y, w: inner.w, h: titleH }, { font: 'heading', size: 30, minSize: 14, weight: 700, lineHeight: 1.12 });
  if (hasPrice) {
    const top = inner.y + used + b.s(6);
    b.text('item-price', `items.${i}.body`, item.body, { x: inner.x, y: top, w: inner.w, h: inner.y + inner.h - top }, { font: 'heading', size: 34, minSize: 14, weight: 800, color: b.color.primary, lineHeight: 1.1 });
  }
}

/** Menu row: name on the left, dotted leader, price on the right. */
function menuRows(b: LayoutBuilder, area: Box, items: { title: string; body?: string }[]) {
  if (!items.length || area.h <= b.s(30)) return;
  const cols = b.cls === 'wide' && items.length > 4 ? 2 : 1;
  const rows = Math.ceil(items.length / cols);
  const gapX = b.s(48);
  const colW = (area.w - gapX * (cols - 1)) / cols;
  const rowH = Math.min(area.h / rows, b.s(92));
  items.forEach((item, i) => {
    const x = area.x + Math.floor(i / rows) * (colW + gapX);
    const y = area.y + (i % rows) * rowH;
    const priceW = Math.min(colW * 0.34, b.s(220));
    const nameW = colW - priceW - b.s(24);
    const textH = rowH - b.s(14);
    b.text('item-title', `items.${i}.title`, item.title, { x, y, w: nameW, h: textH }, { size: 32, minSize: 14, weight: 600, lineHeight: 1.15 });
    b.text('item-price', `items.${i}.body`, item.body, { x: x + colW - priceW, y, w: priceW, h: textH }, { font: 'heading', size: 34, minSize: 14, weight: 800, color: b.color.primary, align: 'right', lineHeight: 1.15 });
    const lineY = y + rowH - b.s(6);
    b.line('item-rule', [x, lineY, x + colW, lineY], b.color.border, Math.max(1, b.s(2)), { dash: [b.s(4), b.s(8)], opacity: 0.9 });
  });
}

export const offerPromo: LayoutFamily = {
  id: 'offer-promo',
  label: 'Offer / promotion',
  vertical: 'business',
  description: 'Sale, menu or admissions poster: offer badge, items with prices, validity, address and phone.',
  variants: ['burst', 'menu'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Occasion (e.g. Diwali Dhamaka)', maxChars: 40 },
    { name: 'title', kind: 'text', label: 'Headline or shop name', required: true, maxChars: 70 },
    { name: 'subtitle', kind: 'text', label: 'Subtitle', maxChars: 140 },
    { name: 'offer', kind: 'text', label: 'Offer (e.g. Flat 40% off)', maxChars: 40 },
    { name: 'image', kind: 'image', label: 'Product photo' },
    { name: 'items', kind: 'cards', label: 'Items (name + price)', requiredIn: ['menu'], minItems: 0, maxItems: 8 },
    { name: 'validity', kind: 'text', label: 'Valid till', maxChars: 48 },
    { name: 'address', kind: 'text', label: 'Address', maxChars: 120 },
    { name: 'phone', kind: 'text', label: 'Phone / WhatsApp', maxChars: 40 },
    { name: 'terms', kind: 'text', label: 'Fine print', maxChars: 120 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    const wide = b.cls === 'wide';
    const menu = page.variant === 'menu';
    b.background();
    let area = infoPanel(b, b.safe, [
      { icon: 'calendar', slot: 'validity', text: textSlot(page, 'validity') },
      { icon: 'map-pin', slot: 'address', text: textSlot(page, 'address') },
      { icon: 'phone', slot: 'phone', text: textSlot(page, 'phone') },
    ].filter((row) => row.text));
    area = b.header(area, { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') }, { titleSize: wide ? 72 : 88, maxTitleShare: 0.28 });
    const items = cardsSlot(page, 'items');
    const offer = textSlot(page, 'offer');

    if (menu) {
      if (offer && area.h > b.s(140)) {
        const pill = { x: area.x, y: area.y, w: Math.min(area.w, b.s(620)), h: b.s(72) };
        b.rect('offer-pill', pill, b.color.primary, { radius: pill.h / 2 });
        b.text('offer', 'offer', offer, inset(pill, b.s(28), b.s(16)), { font: 'heading', size: 34, minSize: 16, weight: 800, color: b.color.onPrimary, align: 'center', lineHeight: 1.1 });
        area = { ...area, y: area.y + pill.h + b.s(26), h: area.h - pill.h - b.s(26) };
      }
      menuRows(b, area, items);
    } else {
      let visual: Box = area;
      let itemArea: Box | undefined;
      if (items.length) [visual, itemArea] = wide ? splitX(area, 0.42, b.s(36)) : splitY(area, b.cls === 'tall' ? 0.5 : 0.46, b.s(28));
      b.image('photo', 'image', imageSlot(page, 'image'), visual, { radius: b.s(Math.min(b.theme.radius, 28)), label: 'Add a product photo' });
      if (offer) {
        const d = Math.min(visual.w * 0.46, visual.h * 0.8, b.s(340));
        offerBadge(b, offer, visual.x + visual.w - d / 2 - b.s(14), visual.y + visual.h - d / 2 - b.s(14), d);
      }
      if (itemArea && itemArea.h > b.s(60)) {
        // Price tiles need width: at most three across, 2×2 for four on tall and square pages.
        const cols = wide ? cardColumns(items.length, itemArea, 'grid') : items.length <= 3 ? items.length : Math.min(3, Math.ceil(items.length / 2));
        grid(itemArea, items.length, cols, b.s(16)).forEach((box, i) => priceTile(b, box, items[i], i));
      }
    }
    b.footnote('terms', textSlot(page, 'terms'));
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// event-invite
// ---------------------------------------------------------------------------

export const eventInvite: LayoutFamily = {
  id: 'event-invite',
  label: 'Event invitation',
  vertical: 'events',
  description: 'Wedding, housewarming, naming ceremony or community event: names, date, time, venue and hosts.',
  variants: ['classic', 'photo'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Occasion (e.g. Griha Pravesh)', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Names or event', required: true, maxChars: 80 },
    { name: 'subtitle', kind: 'text', label: 'Invitation line', maxChars: 200 },
    { name: 'image', kind: 'image', label: 'Photo' },
    { name: 'date', kind: 'text', label: 'Date', required: true, maxChars: 48 },
    { name: 'time', kind: 'text', label: 'Time / muhurtham', maxChars: 48 },
    { name: 'venue', kind: 'text', label: 'Venue', maxChars: 140 },
    { name: 'hosts', kind: 'text', label: 'Hosts / compliments from', maxChars: 120 },
    { name: 'rsvp', kind: 'text', label: 'RSVP', maxChars: 60 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    const wide = b.cls === 'wide';
    b.background();
    frame(b, true);
    let area = inset(b.safe, b.s(24));
    if (page.variant === 'photo') area = photoSplit(b, area, 'image', 'Add a photo', page);
    area = footer(b, area, [
      { role: 'hosts', slot: 'hosts', text: textSlot(page, 'hosts'), style: { size: 26, minSize: 13, color: b.color.muted, align: 'center', lineHeight: 1.25 }, maxH: b.s(70) },
      { role: 'rsvp', slot: 'rsvp', text: textSlot(page, 'rsvp'), style: { size: 26, minSize: 13, weight: 700, color: b.color.primary, align: 'center', lineHeight: 1.2 }, maxH: b.s(40) },
    ]);
    stack(b, area, [
      { role: 'eyebrow', slot: 'eyebrow', text: textSlot(page, 'eyebrow'), style: { size: 26, minSize: 14, weight: 700, color: b.color.primary, align: 'center', uppercase: true, letterSpacing: 3, lineHeight: 1.2 }, maxH: b.s(70), gap: b.s(14) },
      { role: 'title', slot: 'title', text: textSlot(page, 'title'), style: { font: 'heading', size: wide ? 88 : 100, minSize: 32, weight: 800, color: b.color.primary, align: 'center', lineHeight: 1.06 }, maxH: area.h * 0.36, flex: true },
      { role: 'subtitle', slot: 'subtitle', text: textSlot(page, 'subtitle'), style: { size: 28, minSize: 14, color: b.color.muted, align: 'center', lineHeight: 1.35 }, maxH: b.s(120) },
      'ornament',
      { role: 'date', slot: 'date', text: textSlot(page, 'date'), style: { font: 'heading', size: 46, minSize: 20, weight: 700, align: 'center', lineHeight: 1.12 }, maxH: b.s(110), gap: b.s(8) },
      { role: 'time', slot: 'time', text: textSlot(page, 'time'), style: { size: 30, minSize: 15, weight: 600, color: b.color.muted, align: 'center', lineHeight: 1.2 }, maxH: b.s(76) },
      { role: 'venue', slot: 'venue', text: textSlot(page, 'venue'), style: { size: 30, minSize: 15, align: 'center', lineHeight: 1.3 }, maxH: b.s(120) },
    ], { center: true });
    return b.primitives;
  },
};
