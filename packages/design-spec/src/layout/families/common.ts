import { factChips } from '../slots';
import { inset, type LayoutBuilder } from '../engine';
import type { AgentValue, Box, CardValue, FactsValue } from '../../types';

/** Numbered / icon card used by concept-cards, cheatsheets and feature grids. */
export function card(b: LayoutBuilder, box: Box, item: CardValue, index: number, opts: { numbered?: boolean; slot: string; mono?: boolean; compact?: boolean }) {
  const { color } = b;
  b.rect('card', box, color.surface, { radius: b.s(b.theme.radius), stroke: color.border, strokeWidth: Math.max(1, b.s(2)) });
  const pad = b.s(opts.compact ? 18 : 26);
  const inner = inset(box, pad);
  const horizontal = inner.w > inner.h * 2.2;
  const badge = Math.min(b.s(opts.compact ? 48 : 64), inner.h * (horizontal ? 0.9 : 0.34), inner.w * 0.3);
  const hasBadge = opts.numbered || Boolean(item.icon);
  const badgeBox = { x: inner.x, y: inner.y, w: badge, h: badge };
  if (opts.numbered) {
    b.rect('card-badge', badgeBox, color.primary, { radius: badge / 2 });
    b.text('card-number', undefined, String(index + 1).padStart(2, '0'), inset(badgeBox, badge * 0.12, badge * 0.24), { font: 'heading', size: 26, minSize: 12, weight: 800, color: color.onPrimary, align: 'center', lineHeight: 1 });
  } else if (item.icon) {
    b.rect('card-badge', badgeBox, color.surfaceAlt, { radius: b.s(14) });
    b.icon('card-icon', `${opts.slot}.icon`, item.icon, inset(badgeBox, badge * 0.2), color.primary);
  }
  // Large cards (e.g. 2x2 on a 16:9 slide) get proportionally larger type.
  const boost = Math.max(1, Math.min(1.6, box.w / b.s(440), box.h / b.s(300)));
  const gap = b.s(14);
  const text: Box = horizontal && hasBadge
    ? { x: inner.x + badge + gap * 1.5, y: inner.y, w: inner.w - badge - gap * 1.5, h: inner.h }
    : hasBadge
      ? { x: inner.x, y: inner.y + badge + gap, w: inner.w, h: inner.h - badge - gap }
      : inner;
  const hasBody = Boolean(item.body?.trim());
  const titleH = hasBody ? Math.min(text.h * 0.42, b.s(84 * boost)) : text.h;
  const usedTitle = b.text('card-title', `${opts.slot}.title`, item.title, { x: text.x, y: text.y, w: text.w, h: titleH }, { font: 'heading', size: (opts.compact ? 28 : 34) * boost, minSize: 16, weight: 700 });
  if (hasBody) {
    const top = text.y + usedTitle + b.s(8);
    b.text('card-body', `${opts.slot}.body`, item.body, { x: text.x, y: top, w: text.w, h: text.y + text.h - top }, { font: opts.mono ? 'mono' : 'body', size: (opts.mono ? 22 : 24) * boost, minSize: 13, color: opts.mono ? color.text : color.muted, lineHeight: opts.mono ? 1.35 : 1.3 });
  }
}

/** Column count for n cards in an area of the given aspect. */
export function cardColumns(n: number, area: Box, variant: string): number {
  if (variant === 'stack' || n <= 1) return 1;
  const ratio = area.w / Math.max(area.h, 1);
  if (ratio > 2.2) return Math.min(n, n <= 4 ? n : Math.ceil(n / 2));
  if (ratio > 1.2) return n <= 3 ? n : n === 4 ? 2 : 3;
  if (ratio > 0.8) return n <= 2 ? n : n <= 6 ? 2 : 3;
  return n <= 3 ? 1 : 2;
}

/** Icon + text chips in one row (property facts). Returns height used. */
export function factRow(b: LayoutBuilder, area: Box, facts: FactsValue, opts: { color?: string; iconColor?: string; size?: number } = {}): number {
  const chips = factChips(facts, b.ctx.locale);
  if (!chips.length) return 0;
  const h = Math.min(area.h, b.s(opts.size ?? 52));
  const gap = b.s(18);
  // Wrap onto two rows when chips would be too narrow to read.
  const perRow = (area.w - gap * (chips.length - 1)) / chips.length < b.s(190) ? Math.ceil(chips.length / 2) : chips.length;
  const rows = Math.ceil(chips.length / perRow);
  const w = (area.w - gap * (perRow - 1)) / perRow;
  chips.forEach((chip, i) => {
    const x = area.x + (i % perRow) * (w + gap);
    const y = area.y + Math.floor(i / perRow) * (h + b.s(10));
    const iconSize = h * 0.72;
    b.icon('fact-icon', `facts.${chip.key}`, chip.icon, { x, y: y + (h - iconSize) / 2, w: iconSize, h: iconSize }, opts.iconColor ?? b.color.primary);
    b.text('fact', `facts.${chip.key}`, chip.text, { x: x + iconSize + b.s(10), y: y + h * 0.18, w: Math.max(1, w - iconSize - b.s(10)), h: h * 0.7 }, { size: 26, minSize: 13, weight: 600, color: opts.color ?? b.color.text, lineHeight: 1.1 });
  });
  return rows * h + (rows - 1) * b.s(10);
}

/** Bulleted list with a check/marker icon. Returns height used. */
export function bulletList(b: LayoutBuilder, area: Box, items: string[], slot: string, opts: { icon?: string; color?: string; iconColor?: string; size?: number; columns?: number; maxRowHeight?: number } = {}): number {
  if (!items.length || area.h <= 0) return 0;
  const cols = opts.columns ?? 1;
  const rows = Math.ceil(items.length / cols);
  const gapX = b.s(28);
  const gapY = b.s(10);
  const rowH = Math.min((area.h - gapY * (rows - 1)) / rows, b.s(opts.maxRowHeight ?? 110));
  const colW = (area.w - gapX * (cols - 1)) / cols;
  const marker = Math.min(b.s(30), rowH * 0.8);
  items.forEach((item, i) => {
    const x = area.x + (i % cols) * (colW + gapX);
    const y = area.y + Math.floor(i / cols) * (rowH + gapY);
    b.icon('bullet-icon', undefined, opts.icon ?? 'check', { x, y: y + b.s(4), w: marker, h: marker }, opts.iconColor ?? b.color.primary);
    b.text('bullet', `${slot}.${i}`, item, { x: x + marker + b.s(14), y, w: colW - marker - b.s(14), h: rowH }, { size: opts.size ?? 28, minSize: 14, color: opts.color ?? b.color.text, lineHeight: 1.25 });
  });
  return rows * rowH + (rows - 1) * gapY;
}

/** Agent / contact strip. Returns height used (0 when no agent). */
export function agentBar(b: LayoutBuilder, area: Box, agent: AgentValue | undefined, opts: { dark?: boolean } = {}): number {
  if (!agent) return 0;
  const h = Math.min(area.h, b.s(b.cls === 'wide' ? 100 : 120));
  const box = { x: area.x, y: area.y + area.h - h, w: area.w, h };
  const text = opts.dark ? '#ffffff' : b.color.text;
  const muted = opts.dark ? 'rgba(255,255,255,0.78)' : b.color.muted;
  b.rect('agent-bar', box, opts.dark ? 'rgba(255,255,255,0.12)' : b.color.surfaceAlt, { radius: b.s(Math.min(b.theme.radius, 24)) });
  const pad = b.s(24);
  const inner = inset(box, pad, pad * 0.7);
  const nameW = inner.w * 0.46;
  b.text('agent-name', 'agent.name', agent.name, { x: inner.x, y: inner.y, w: nameW, h: inner.h * 0.55 }, { font: 'heading', size: 30, minSize: 16, weight: 700, color: text });
  b.text('agent-title', 'agent.title', agent.title, { x: inner.x, y: inner.y + inner.h * 0.56, w: nameW, h: inner.h * 0.44 }, { size: 22, minSize: 12, color: muted });
  const contacts = [
    agent.phone ? { icon: 'phone', text: agent.phone, slot: 'agent.phone' } : undefined,
    agent.email ? { icon: 'mail', text: agent.email, slot: 'agent.email' } : undefined,
  ].filter(Boolean) as { icon: string; text: string; slot: string }[];
  const cx = inner.x + nameW + b.s(16);
  const cw = inner.w - nameW - b.s(16);
  const rowH = inner.h / Math.max(contacts.length, 1);
  contacts.forEach((contact, i) => {
    const y = inner.y + i * rowH;
    const icon = Math.min(b.s(26), rowH * 0.8);
    b.icon('agent-contact-icon', undefined, contact.icon, { x: cx, y: y + (rowH - icon) / 2, w: icon, h: icon }, opts.dark ? '#ffffff' : b.color.primary);
    b.text('agent-contact', contact.slot, contact.text, { x: cx + icon + b.s(10), y: y + rowH * 0.12, w: cw - icon - b.s(10), h: rowH * 0.8 }, { size: 22, minSize: 11, color: text, lineHeight: 1.1 });
  });
  return h;
}
