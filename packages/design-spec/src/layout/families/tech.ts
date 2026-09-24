import { LayoutBuilder, grid, inset, splitX, splitY } from '../engine';
import { cardsSlot, codeSlot, flowSlot, imageSlot, listSlot, sideSlot, textSlot } from '../slots';
import { bulletList, card, cardColumns } from './common';
import type { Box, LayoutContext, LayoutFamily } from '../../types';

// ---------------------------------------------------------------------------
// concept-cards
// ---------------------------------------------------------------------------

export const conceptCards: LayoutFamily = {
  id: 'concept-cards',
  label: 'Concept cards',
  vertical: 'tech',
  description: 'Title plus 1–9 numbered or icon cards. Covers explainers, cheat sheets, checklists and title slides (hero).',
  variants: ['numbered', 'grid', 'stack', 'hero'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Eyebrow', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Title', required: true, maxChars: 90 },
    { name: 'subtitle', kind: 'text', label: 'Subtitle', maxChars: 200 },
    { name: 'cards', kind: 'cards', label: 'Cards', requiredIn: ['numbered', 'grid', 'stack'], minItems: 1, maxItems: 9 },
    { name: 'image', kind: 'image', label: 'Image' },
    { name: 'cta', kind: 'text', label: 'Call to action', maxChars: 90 },
    { name: 'tag', kind: 'text', label: 'Tag', maxChars: 32 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    const variant = page.variant ?? 'numbered';
    b.background();
    let area = b.ctaBar(b.safe, textSlot(page, 'cta'), textSlot(page, 'tag'));
    const cards = cardsSlot(page, 'cards');
    const content = { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') };

    if (variant === 'hero') {
      const image = imageSlot(page, 'image');
      let textArea = area;
      if (image) {
        const [first, second] = b.cls === 'wide' ? splitX(area, 0.52, b.s(48)) : splitY(area, 0.44, b.s(40));
        b.image('hero-image', 'image', image, b.cls === 'wide' ? second : first, { radius: b.s(b.theme.radius) });
        textArea = b.cls === 'wide' ? first : second;
      }
      const chipsH = cards.length ? Math.min(b.s(180), textArea.h * 0.3) : 0;
      const headerArea = { ...textArea, h: textArea.h - chipsH };
      const centered = !image;
      const headerTop = centered ? { ...headerArea, y: headerArea.y + headerArea.h * 0.18, h: headerArea.h * 0.82 } : headerArea;
      b.header(headerTop, content, { align: centered ? 'center' : 'left', titleSize: b.cls === 'wide' ? 104 : 112, maxTitleShare: 0.5 });
      if (cards.length) {
        const chipsArea = { x: textArea.x, y: textArea.y + textArea.h - chipsH, w: textArea.w, h: chipsH };
        grid(chipsArea, Math.min(cards.length, 3), Math.min(cards.length, 3), b.s(20)).forEach((box, i) =>
          card(b, box, { title: cards[i].title, icon: cards[i].icon }, i, { slot: `cards.${i}`, compact: true }));
      }
      b.brandMark();
      return b.primitives;
    }

    area = b.header(area, content);
    const cols = cardColumns(cards.length, area, variant);
    grid(area, cards.length, cols, b.s(22)).forEach((box, i) =>
      card(b, box, cards[i], i, { numbered: variant === 'numbered', slot: `cards.${i}` }));
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// architecture-flow
// ---------------------------------------------------------------------------

function clipToBox(from: { x: number; y: number }, to: { x: number; y: number }, box: Box, pad: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const tx = dx === 0 ? Infinity : (box.w / 2 + pad) / Math.abs(dx);
  const ty = dy === 0 ? Infinity : (box.h / 2 + pad) / Math.abs(dy);
  const t = Math.min(tx, ty, 0.5);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export const architectureFlow: LayoutFamily = {
  id: 'architecture-flow',
  label: 'Architecture flow',
  vertical: 'tech',
  description: 'Up to 8 connected components (flow), numbered steps, or a timeline.',
  variants: ['flow', 'steps', 'timeline'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Eyebrow', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Title', required: true, maxChars: 90 },
    { name: 'subtitle', kind: 'text', label: 'Subtitle', maxChars: 200 },
    { name: 'flow', kind: 'flow', label: 'Components and connections', required: true, minItems: 2, maxItems: 8 },
    { name: 'takeaway', kind: 'text', label: 'Takeaway', maxChars: 110 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    const variant = page.variant ?? 'flow';
    b.background();
    let area = b.ctaBar(b.safe, textSlot(page, 'takeaway'));
    area = b.header(area, { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') });
    const flow = flowSlot(page, 'flow');
    const n = flow.nodes.length;
    if (!n) return b.primitives;

    if (variant === 'timeline') {
      const horizontal = b.cls !== 'tall';
      const stroke = Math.max(2, b.s(6));
      if (horizontal) {
        const axisY = area.y + area.h / 2;
        b.line('timeline-axis', [area.x, axisY, area.x + area.w, axisY], b.color.border, stroke);
        const step = area.w / n;
        flow.nodes.forEach((node, i) => {
          const cx = area.x + step * (i + 0.5);
          const dot = b.s(34);
          b.rect('timeline-dot', { x: cx - dot / 2, y: axisY - dot / 2, w: dot, h: dot }, b.color.primary, { radius: dot / 2 });
          const labelH = area.h / 2 - dot;
          const above = i % 2 === 0;
          const box = { x: cx - step / 2 + b.s(8), y: above ? area.y : axisY + dot, w: step - b.s(16), h: labelH };
          b.icon('timeline-icon', `flow.nodes.${i}.icon`, node.icon, { x: cx - b.s(24), y: above ? box.y + box.h - b.s(56) : box.y, w: b.s(48), h: b.s(48) });
          b.text('timeline-label', `flow.nodes.${i}.label`, node.label, { x: box.x, y: above ? box.y : box.y + (node.icon ? b.s(60) : 0), w: box.w, h: box.h - b.s(64) }, { font: 'heading', size: 30, minSize: 14, weight: 700, align: 'center' });
        });
      } else {
        const axisX = area.x + b.s(40);
        b.line('timeline-axis', [axisX, area.y, axisX, area.y + area.h], b.color.border, stroke);
        const step = area.h / n;
        flow.nodes.forEach((node, i) => {
          const cy = area.y + step * (i + 0.5);
          const dot = b.s(34);
          b.rect('timeline-dot', { x: axisX - dot / 2, y: cy - dot / 2, w: dot, h: dot }, b.color.primary, { radius: dot / 2 });
          const x = axisX + dot + b.s(24);
          b.icon('timeline-icon', `flow.nodes.${i}.icon`, node.icon, { x, y: cy - b.s(24), w: b.s(48), h: b.s(48) });
          const tx = x + (node.icon ? b.s(64) : 0);
          b.text('timeline-label', `flow.nodes.${i}.label`, node.label, { x: tx, y: cy - step * 0.4, w: area.x + area.w - tx, h: step * 0.8 }, { font: 'heading', size: 34, minSize: 14, weight: 700 });
        });
      }
      b.brandMark();
      return b.primitives;
    }

    const cols = b.cls === 'wide' ? (n <= 5 ? n : Math.ceil(n / 2)) : b.cls === 'tall' ? (n <= 4 ? 1 : 2) : n <= 3 ? n : 2;
    const rows = Math.ceil(n / cols);
    const gapX = b.s(cols > 1 ? 70 : 0);
    const gapY = b.s(rows > 1 ? 60 : 0);
    const cells = grid(area, rows * cols, cols, Math.max(gapX, gapY));
    // Snake order keeps consecutive steps adjacent.
    const boxes = flow.nodes.map((_, i) => {
      const row = Math.floor(i / cols);
      const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      const cell = cells[row * cols + col];
      const w = Math.min(cell.w, b.s(360));
      const h = Math.min(cell.h, b.s(cols === 1 ? 150 : 210), w * 0.9);
      return { x: cell.x + (cell.w - w) / 2, y: cell.y + (cell.h - h) / 2, w, h };
    });
    const index = new Map(flow.nodes.map((node, i) => [node.id, i]));
    const edges = variant === 'steps' || !flow.edges.length
      ? flow.nodes.slice(1).map((node, i) => ({ from: flow.nodes[i].id, to: node.id, label: undefined as string | undefined }))
      : flow.edges;
    edges.forEach((edge) => {
      const a = index.get(edge.from);
      const c = index.get(edge.to);
      if (a === undefined || c === undefined) return;
      const A = boxes[a];
      const C = boxes[c];
      const ca = { x: A.x + A.w / 2, y: A.y + A.h / 2 };
      const cc = { x: C.x + C.w / 2, y: C.y + C.h / 2 };
      const start = clipToBox(ca, cc, A, b.s(10));
      const end = clipToBox(cc, ca, C, b.s(14));
      b.line('flow-edge', [start.x, start.y, end.x, end.y], b.color.primary, Math.max(2, b.s(5)), { arrow: true });
    });
    flow.nodes.forEach((node, i) => {
      const box = boxes[i];
      b.rect('flow-node', box, b.color.surface, { radius: b.s(Math.min(b.theme.radius, 28)), stroke: b.color.primary, strokeWidth: Math.max(1.5, b.s(3)) });
      const inner = inset(box, b.s(18));
      const iconSize = Math.min(b.s(64), inner.h * 0.45);
      const hasIcon = Boolean(node.icon);
      const badge = variant === 'steps';
      if (badge) {
        const d = b.s(46);
        b.rect('flow-step', { x: box.x - d * 0.35, y: box.y - d * 0.35, w: d, h: d }, b.color.accent, { radius: d / 2 });
        b.text('flow-step-number', undefined, String(i + 1), { x: box.x - d * 0.35, y: box.y - d * 0.35 + d * 0.2, w: d, h: d * 0.6 }, { font: 'heading', size: 24, minSize: 12, weight: 800, color: b.color.onPrimary, align: 'center', lineHeight: 1 });
      }
      if (hasIcon) b.icon('flow-icon', `flow.nodes.${i}.icon`, node.icon, { x: inner.x + (inner.w - iconSize) / 2, y: inner.y, w: iconSize, h: iconSize });
      const top = hasIcon ? inner.y + iconSize + b.s(10) : inner.y;
      b.text('flow-label', `flow.nodes.${i}.label`, node.label, { x: inner.x, y: top, w: inner.w, h: inner.y + inner.h - top }, { font: 'heading', size: 30, minSize: 13, weight: 700, align: 'center', lineHeight: 1.1 });
    });
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// code-explainer
// ---------------------------------------------------------------------------

function codePanel(b: LayoutBuilder, box: Box, language: string, source: string) {
  const panel = b.theme.mode === 'dark' ? b.color.surfaceAlt : '#0f172a';
  b.rect('code-panel', box, panel, { radius: b.s(Math.min(b.theme.radius, 24)), stroke: b.color.border, strokeWidth: Math.max(1, b.s(2)) });
  const bar = b.s(54);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((fill, i) => {
    const d = b.s(16);
    b.rect('code-dot', { x: box.x + b.s(24) + i * b.s(26), y: box.y + (bar - d) / 2, w: d, h: d }, fill, { radius: d / 2 });
  });
  b.text('code-language', 'code.language', language, { x: box.x + box.w - b.s(220), y: box.y + b.s(14), w: b.s(196), h: b.s(30) }, { font: 'mono', size: 20, minSize: 12, color: '#94a3b8', align: 'right' });
  b.text('code', 'code.source', source, inset({ x: box.x, y: box.y + bar, w: box.w, h: box.h - bar }, b.s(28), b.s(18)), { font: 'mono', size: 28, minSize: 12, color: '#e2e8f0', lineHeight: 1.4 });
}

export const codeExplainer: LayoutFamily = {
  id: 'code-explainer',
  label: 'Code explainer',
  vertical: 'tech',
  description: 'A code panel with up to four callouts, or a cheat sheet grid of snippets.',
  variants: ['explainer', 'cheatsheet'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Eyebrow', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Title', required: true, maxChars: 90 },
    { name: 'subtitle', kind: 'text', label: 'Subtitle', maxChars: 200 },
    { name: 'code', kind: 'code', label: 'Code', requiredIn: ['explainer'], maxChars: 1200 },
    { name: 'callouts', kind: 'list', label: 'Callouts', maxItems: 4, maxChars: 140 },
    { name: 'snippets', kind: 'cards', label: 'Snippets', requiredIn: ['cheatsheet'], minItems: 2, maxItems: 8 },
    { name: 'takeaway', kind: 'text', label: 'Takeaway', maxChars: 110 },
  ],
  layout(ctx: LayoutContext) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    b.background();
    let area = b.ctaBar(b.safe, textSlot(page, 'takeaway'));
    area = b.header(area, { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') });
    if ((page.variant ?? 'explainer') === 'cheatsheet') {
      const snippets = cardsSlot(page, 'snippets');
      grid(area, snippets.length, cardColumns(snippets.length, area, 'grid'), b.s(20)).forEach((box, i) =>
        card(b, box, snippets[i], i, { slot: `snippets.${i}`, mono: true, compact: true }));
      b.brandMark();
      return b.primitives;
    }
    const code = codeSlot(page, 'code');
    const callouts = listSlot(page, 'callouts');
    const lines = Math.max(4, (code?.source ?? '').split('\n').length);
    let codeBox = area;
    let calloutBox: Box | undefined;
    if (callouts.length) {
      [codeBox, calloutBox] = b.cls === 'wide' ? splitX(area, 0.6, b.s(40)) : splitY(area, Math.min(0.7, 0.3 + lines * 0.028), b.s(30));
    }
    codePanel(b, codeBox, code?.language ?? 'text', code?.source ?? '');
    if (calloutBox) {
      const rows = grid(calloutBox, callouts.length, b.cls === 'wide' ? 1 : Math.min(2, callouts.length), b.s(16));
      callouts.forEach((callout, i) => card(b, rows[i], { title: callout }, i, { numbered: true, slot: `callouts.${i}`, compact: true }));
    }
    b.brandMark();
    return b.primitives;
  },
};

// ---------------------------------------------------------------------------
// comparison
// ---------------------------------------------------------------------------

export const comparison: LayoutFamily = {
  id: 'comparison',
  label: 'Comparison',
  vertical: 'tech',
  description: 'Two options side by side (stacked on tall stories) with an optional verdict.',
  variants: ['columns'],
  slots: [
    { name: 'eyebrow', kind: 'text', label: 'Eyebrow', maxChars: 48 },
    { name: 'title', kind: 'text', label: 'Title', required: true, maxChars: 90 },
    { name: 'subtitle', kind: 'text', label: 'Subtitle', maxChars: 200 },
    { name: 'left', kind: 'side', label: 'Left option', required: true, maxItems: 6 },
    { name: 'right', kind: 'side', label: 'Right option', required: true, maxItems: 6 },
    { name: 'verdict', kind: 'text', label: 'Verdict', maxChars: 110 },
  ],
  layout(ctx) {
    const b = new LayoutBuilder(ctx);
    const { page } = ctx;
    b.background();
    let area = b.ctaBar(b.safe, textSlot(page, 'verdict'));
    area = b.header(area, { eyebrow: textSlot(page, 'eyebrow'), title: textSlot(page, 'title'), subtitle: textSlot(page, 'subtitle') });
    const stacked = b.H / b.W > 1.5;
    const gap = b.s(56);
    const [first, second] = stacked ? splitY(area, 0.5, gap) : splitX(area, 0.5, gap);
    (['left', 'right'] as const).forEach((name, i) => {
      const side = sideSlot(page, name);
      const box = i === 0 ? first : second;
      const accent = i === 0 ? b.color.primary : b.color.accent;
      b.rect('side-panel', box, b.color.surface, { radius: b.s(b.theme.radius), stroke: accent, strokeWidth: Math.max(1.5, b.s(3)) });
      const inner = inset(box, b.s(30));
      const headH = Math.min(b.s(80), inner.h * 0.2);
      b.rect('side-header', { x: box.x, y: box.y, w: box.w, h: headH + b.s(30) }, accent, { radius: b.s(b.theme.radius), opacity: 0.16 });
      b.text('side-title', `${name}.title`, side.title, { x: inner.x, y: inner.y, w: inner.w, h: headH }, { font: 'heading', size: 44, minSize: 18, weight: 800, color: accent });
      bulletList(b, { x: inner.x, y: inner.y + headH + b.s(26), w: inner.w, h: inner.h - headH - b.s(26) }, side.points, `${name}.points`, { icon: i === 0 ? 'check' : 'arrow-right', iconColor: accent });
    });
    const d = b.s(84);
    const center = stacked ? { x: area.x + area.w / 2, y: first.y + first.h + gap / 2 } : { x: first.x + first.w + gap / 2, y: area.y + area.h / 2 };
    b.rect('vs-badge', { x: center.x - d / 2, y: center.y - d / 2, w: d, h: d }, b.color.background, { radius: d / 2, stroke: b.color.border, strokeWidth: Math.max(1.5, b.s(3)) });
    b.text('vs', undefined, 'VS', { x: center.x - d / 2, y: center.y - d * 0.28, w: d, h: d * 0.56 }, { font: 'heading', size: 30, minSize: 12, weight: 800, align: 'center', lineHeight: 1 });
    b.brandMark();
    return b.primitives;
  },
};
