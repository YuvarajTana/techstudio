import { LayoutBuilder, grid, inset, splitX } from '../engine';
import { cardsSlot, listSlot, textSlot } from '../slots';
import type { Box, CardValue, LayoutFamily } from '../../types';

/**
 * Job postings for LinkedIn, Instagram, WhatsApp and notice boards: one role
 * with key facts and skills (`single`), or a list of open roles (`openings`).
 */

/** Skill chips that wrap onto new rows. Returns the height used. */
function chips(b: LayoutBuilder, area: Box, items: string[], slot: string): number {
  if (!items.length || area.h <= 0) return 0;
  const h = b.s(b.cls === 'wide' ? 50 : 56);
  const gap = b.s(12);
  const padX = b.s(22);
  const size = 24;
  let x = area.x;
  let y = area.y;
  for (const [i, item] of items.entries()) {
    // Glyph-width estimate as in the layout engine (body ≈ 0.52 em).
    const w = Math.min(area.w, item.length * b.s(size) * 0.56 + padX * 2);
    if (x > area.x && x + w > area.x + area.w) {
      x = area.x;
      y += h + gap;
    }
    if (y + h > area.y + area.h) break;
    b.rect('skill-chip', { x, y, w, h }, b.color.surfaceAlt, { radius: h / 2, stroke: b.color.border, strokeWidth: Math.max(1, b.s(1.5)) });
    b.text('skill', `${slot}.${i}`, item, inset({ x, y, w, h }, padX, h * 0.24), { size, minSize: 12, weight: 600, align: 'center', lineHeight: 1.1 });
    x += w + gap;
  }
  return y + h - area.y;
}

/** Icon + small label + bold value. */
function fact(b: LayoutBuilder, box: Box, item: CardValue, i: number) {
  b.rect('fact-tile', box, b.color.surface, { radius: b.s(Math.min(b.theme.radius, 18)), stroke: b.color.border, strokeWidth: Math.max(1, b.s(2)) });
  const inner = inset(box, b.s(18), b.s(14));
  const icon = Math.min(b.s(46), inner.h * 0.6);
  // Accent icons beside primary text echo two-colour logos (e.g. blue + orange).
  b.icon('fact-icon', `details.${i}.icon`, item.icon, { x: inner.x, y: inner.y + (inner.h - icon) / 2, w: icon, h: icon }, b.color.accent);
  const textX = inner.x + (item.icon ? icon + b.s(14) : 0);
  const textW = inner.x + inner.w - textX;
  // Label and value sit together, centred in the tile.
  const labelStyle = { size: 22, minSize: 11, weight: 600, color: b.color.muted, uppercase: true, letterSpacing: 1, lineHeight: 1.1 } as const;
  const valueStyle = { font: 'heading', size: 34, minSize: 13, weight: 700, lineHeight: 1.12 } as const;
  const labelH = b.measureText(item.title, { x: textX, y: 0, w: textW, h: inner.h * 0.4 }, labelStyle);
  const valueH = b.measureText(item.body, { x: textX, y: 0, w: textW, h: inner.h - labelH - b.s(6) }, valueStyle);
  const top = inner.y + Math.max(0, (inner.h - labelH - b.s(6) - valueH) / 2);
  b.text('fact-label', `details.${i}.title`, item.title, { x: textX, y: top, w: textW, h: labelH + 1 }, labelStyle);
  b.text('fact-value', `details.${i}.body`, item.body, { x: textX, y: top + labelH + b.s(6), w: textW, h: valueH + 1 }, valueStyle);
}

/** One open role per row: title, a muted line of facts, and an arrow. */
function roleRow(b: LayoutBuilder, box: Box, item: CardValue, i: number) {
  b.rect('role', box, b.color.surface, { radius: b.s(Math.min(b.theme.radius, 18)), stroke: b.color.border, strokeWidth: Math.max(1, b.s(2)) });
  const inner = inset(box, b.s(22), b.s(12));
  const arrow = Math.min(b.s(34), inner.h * 0.6);
  const textW = inner.w - arrow - b.s(16);
  const hasBody = Boolean(item.body?.trim());
  const used = b.text('role-title', `roles.${i}.title`, item.title, { x: inner.x, y: inner.y, w: textW, h: hasBody ? inner.h * 0.56 : inner.h }, { font: 'heading', size: 34, minSize: 14, weight: 700, lineHeight: 1.1 });
  if (hasBody) {
    const top = inner.y + used + b.s(4);
    b.text('role-meta', `roles.${i}.body`, item.body, { x: inner.x, y: top, w: textW, h: inner.y + inner.h - top }, { size: 24, minSize: 11, color: b.color.muted, lineHeight: 1.15 });
  }
  b.icon('role-arrow', undefined, 'arrow-right', { x: inner.x + inner.w - arrow, y: inner.y + (inner.h - arrow) / 2, w: arrow, h: arrow }, b.color.primary);
}

export const jobPosting: LayoutFamily = {
  id: 'job-posting',
  label: 'Job posting',
  vertical: 'hiring',
  description: 'Hiring post: role, key facts (experience, location, CTC…), skills and how to apply; or a list of open roles.',
  variants: ['single', 'openings'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Kicker (e.g. We’re hiring)', maxChars: 40 },
    { name: 'title', kind: 'text', label: 'Role or headline', required: true, maxChars: 80 },
    { name: 'subtitle', kind: 'text', label: 'One line about the team or role', maxChars: 160 },
    { name: 'details', kind: 'cards', label: 'Key facts (label + value)', maxItems: 6 },
    { name: 'skills', kind: 'list', label: 'Skills', maxItems: 10, maxChars: 28 },
    { name: 'roles', kind: 'cards', label: 'Open roles (title + experience/location)', requiredIn: ['openings'], minItems: 0, maxItems: 8 },
    { name: 'cta', kind: 'text', label: 'How to apply', maxChars: 90 },
    { name: 'tag', kind: 'text', label: 'Tag (e.g. #Hiring)', maxChars: 32 },
    { name: 'legal', kind: 'text', label: 'Fine print (e.g. equal opportunity)', maxChars: 120 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    const wide = b.cls === 'wide';
    b.background();
    let area = b.ctaBar(b.safe, textSlot(page, 'cta'), textSlot(page, 'tag'));
    area = b.header(area, { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') }, { titleSize: wide ? 72 : 84, maxTitleShare: 0.3 });

    if (page.variant === 'openings') {
      const roles = cardsSlot(page, 'roles');
      if (roles.length && area.h > b.s(60)) {
        const cols = wide && roles.length > 3 ? 2 : 1;
        const rows = Math.ceil(roles.length / cols);
        const rowH = Math.min(b.s(156), (area.h - b.s(14) * (rows - 1)) / rows);
        grid({ ...area, h: rowH * rows + b.s(14) * (rows - 1) }, roles.length, cols, b.s(14)).forEach((box, i) => roleRow(b, box, roles[i], i));
      }
    } else {
      const details = cardsSlot(page, 'details');
      const skills = listSlot(page, 'skills');
      let factsArea: Box = area;
      if (wide && skills.length) {
        const [left, right] = splitX(area, 0.6, b.s(36));
        factsArea = left;
        chips(b, right, skills, 'skills');
      } else if (skills.length) {
        const used = chips(b, { ...area, h: Math.min(area.h * 0.34, b.s(200)) }, skills, 'skills');
        factsArea = { ...area, y: area.y + used + b.s(28), h: area.h - used - b.s(28) };
      }
      if (details.length && factsArea.h > b.s(70)) {
        const cols = details.length === 1 ? 1 : wide ? (details.length > 4 ? 3 : 2) : details.length > 4 && b.cls === 'square' ? 3 : 2;
        const rows = Math.ceil(details.length / cols);
        const tileH = Math.min(b.s(196), (factsArea.h - b.s(16) * (rows - 1)) / rows);
        grid({ ...factsArea, h: tileH * rows + b.s(16) * (rows - 1) }, details.length, cols, b.s(16)).forEach((box, i) => fact(b, box, details[i], i));
      }
    }
    b.footnote('legal', textSlot(page, 'legal'));
    b.brandMark();
    return b.primitives;
  },
};
