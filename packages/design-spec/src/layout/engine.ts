import { fontCovers } from '../fonts';
import { layoutClass } from '../formats';
import { themeWithBrand } from '../themes';
import type { Box, ImageValue, LayoutClass, LayoutContext, Primitive, ThemeTokens } from '../types';

type TextPrimitive = Extract<Primitive, { type: 'text' }>;
type FontRole = TextPrimitive['font'];

export const MIN_READABLE_PX = 10;

/** Average glyph advance as a fraction of font size (heuristic, Node-safe). */
const GLYPH_WIDTH: Record<FontRole, number> = { heading: 0.56, body: 0.52, mono: 0.61 };

/** Word-wrap line count estimate for a string at a given size and width. */
export function estimateLines(text: string, size: number, width: number, font: FontRole = 'body', letterSpacing = 0): number {
  const advance = size * GLYPH_WIDTH[font] + letterSpacing;
  const perLine = Math.max(1, Math.floor(width / Math.max(advance, 1)));
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    if (font === 'mono') {
      lines += Math.max(1, Math.ceil(paragraph.length / perLine));
      continue;
    }
    let current = 0;
    let count = 1;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const length = word.length;
      if (current === 0) current = length;
      else if (current + 1 + length <= perLine) current += 1 + length;
      else {
        count += 1;
        current = length;
      }
      while (current > perLine) {
        count += 1;
        current -= perLine;
      }
    }
    lines += count;
  }
  return Math.max(1, lines);
}

export function estimateTextHeight(text: string, size: number, width: number, font: FontRole, lineHeight: number, letterSpacing = 0): number {
  return estimateLines(text, size, width, font, letterSpacing) * size * lineHeight;
}

/** Largest size in [minSize, size] whose estimated height fits the box. */
export function fitTextSize(text: string, box: Box, size: number, minSize: number, font: FontRole, lineHeight: number, letterSpacing = 0): number {
  let current = size;
  while (current > minSize && estimateTextHeight(text, current, box.w, font, lineHeight, letterSpacing) > box.h) {
    current = Math.max(minSize, current - Math.max(1, current * 0.04));
  }
  return Math.round(current * 10) / 10;
}

export interface TextStyle {
  font?: FontRole;
  size: number;
  minSize?: number;
  weight?: number;
  color?: string;
  align?: TextPrimitive['align'];
  lineHeight?: number;
  uppercase?: boolean;
  letterSpacing?: number;
  opacity?: number;
}

/**
 * Collects primitives for one page. All sizes passed in are in the 1080
 * reference unit; `u` scales them to the actual format.
 */
export class LayoutBuilder {
  readonly W: number;
  readonly H: number;
  /** Scale from the 1080 reference unit to this format (uses the short edge). */
  readonly u: number;
  readonly cls: LayoutClass;
  readonly theme: ThemeTokens;
  readonly margin: number;
  readonly ctx: LayoutContext;
  private readonly items: Primitive[] = [];
  private counter = 0;

  constructor(ctx: LayoutContext) {
    this.ctx = ctx;
    this.W = ctx.format.width;
    this.H = ctx.format.height;
    this.u = Math.min(this.W, this.H) / 1080;
    this.cls = layoutClass(this.W, this.H);
    this.theme = themeWithBrand(ctx.theme, ctx.brand);
    this.margin = Math.round((this.cls === 'wide' ? 72 : 64) * this.u);
  }

  get primitives(): Primitive[] {
    return this.items;
  }

  get color() {
    return this.theme.color;
  }

  /** Content area inside the page margins. */
  get safe(): Box {
    return { x: this.margin, y: this.margin, w: this.W - this.margin * 2, h: this.H - this.margin * 2 };
  }

  private nextId(role: string) {
    this.counter += 1;
    return `${this.ctx.page.id}-${role}-${this.counter}`;
  }

  s(value: number) {
    return Math.round(value * this.u * 10) / 10;
  }

  rect(role: string, box: Box, fill: string, extra: { radius?: number; stroke?: string; strokeWidth?: number; opacity?: number; slot?: string } = {}) {
    this.items.push({ id: this.nextId(role), type: 'rect', role, box: round(box), fill, ...extra });
  }

  /** Resolved size, minimum, spacing and the height `text()` would use in `box`. */
  private fit(text: string, box: Box, style: TextStyle) {
    let font = style.font ?? 'body';
    // A heading font without a glyph (e.g. ₹ in Outfit) hands the text to the body font.
    const fonts = this.theme.font;
    if (font !== 'body' && !fontCovers(fonts[font].family, text) && fontCovers(fonts.body.family, text)) font = 'body';
    const lineHeight = style.lineHeight ?? ((style.font ?? 'body') === 'heading' ? 1.08 : 1.3);
    const size = this.s(style.size);
    // Never shrink below ~10px on the real canvas; overflow is reported instead.
    const minSize = Math.min(size, Math.max(MIN_READABLE_PX, this.s(style.minSize ?? Math.max(14, style.size * 0.55))));
    const shown = style.uppercase ? text.toUpperCase() : text;
    const letterSpacing = style.letterSpacing ? this.s(style.letterSpacing) : undefined;
    const fitted = fitTextSize(shown, box, size, minSize, font, lineHeight, letterSpacing);
    const used = Math.min(box.h, estimateTextHeight(shown, fitted, box.w, font, lineHeight, letterSpacing));
    return { font, lineHeight, minSize, letterSpacing, fitted, used };
  }

  /** Height `text()` would use for `value` in `box`, without adding anything. */
  measureText(value: string | undefined, box: Box, style: TextStyle): number {
    const text = (value ?? '').trim();
    return text ? this.fit(text, box, style).used : 0;
  }

  text(role: string, slot: string | undefined, value: string | undefined, box: Box, style: TextStyle): number {
    const text = (value ?? '').trim();
    if (!text) return 0;
    const { font, lineHeight, minSize, letterSpacing, fitted, used } = this.fit(text, box, style);
    this.items.push({
      id: this.nextId(role),
      type: 'text',
      role,
      slot,
      // The recorded box is the estimated text block (top-aligned), so stacked
      // elements placed below `used` never overlap it. Renderers fit to it.
      box: round({ ...box, h: Math.max(used, Math.min(box.h, fitted * lineHeight)) }),
      text,
      font,
      size: fitted,
      minSize,
      weight: style.weight ?? (font === 'heading' ? 700 : 400),
      color: style.color ?? this.color.text,
      align: style.align ?? 'left',
      lineHeight,
      uppercase: style.uppercase,
      letterSpacing,
      opacity: style.opacity,
    });
    return used;
  }

  image(role: string, slot: string, value: ImageValue | undefined, box: Box, extra: { radius?: number; fit?: 'cover' | 'contain'; label?: string } = {}) {
    this.items.push({
      id: this.nextId(role),
      type: 'image',
      role,
      slot,
      box: round(box),
      src: value?.src ?? '',
      fit: extra.fit ?? 'cover',
      radius: extra.radius,
      placeholderFill: this.color.surfaceAlt,
      placeholderText: extra.label ?? 'Add photo',
    });
  }

  icon(role: string, slot: string | undefined, icon: string | undefined, box: Box, color?: string) {
    if (!icon) return;
    this.items.push({ id: this.nextId(role), type: 'icon', role, slot, icon, box: round(box), color: color ?? this.color.primary });
  }

  line(role: string, points: [number, number, number, number], stroke: string, strokeWidth: number, extra: { arrow?: boolean; dash?: number[]; opacity?: number } = {}) {
    const [x1, y1, x2, y2] = points.map((v) => Math.round(v * 10) / 10) as [number, number, number, number];
    const box = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    this.items.push({ id: this.nextId(role), type: 'line', role, box, points: [x1, y1, x2, y2], stroke, strokeWidth, ...extra });
  }

  /** Full-bleed background plus the theme's decoration. */
  background(fill = this.color.background) {
    this.rect('background', { x: 0, y: 0, w: this.W, h: this.H }, fill);
    const { decoration } = this.theme;
    if (decoration === 'grid') {
      const step = this.s(90);
      for (let x = step; x < this.W; x += step) this.line('decoration-grid', [x, 0, x, this.H], this.color.border, 1, { opacity: 0.18 });
      for (let y = step; y < this.H; y += step) this.line('decoration-grid', [0, y, this.W, y], this.color.border, 1, { opacity: 0.18 });
    } else if (decoration === 'glow') {
      const r = Math.max(this.W, this.H) * 0.42;
      this.rect('decoration-glow', { x: this.W - r * 1.2, y: -r * 0.6, w: r * 2, h: r * 2 }, this.color.primary, { radius: r, opacity: 0.1 });
      this.rect('decoration-glow', { x: -r * 0.9, y: this.H - r * 1.1, w: r * 1.6, h: r * 1.6 }, this.color.accent, { radius: r * 0.8, opacity: 0.07 });
    } else if (decoration === 'rule') {
      this.rect('decoration-rule', { x: 0, y: 0, w: this.W, h: this.s(10) }, this.color.primary);
    } else if (decoration === 'toran') {
      // Marigold bunting strung along the top edge, inside the top margin.
      const y = this.s(14);
      const step = this.s(54);
      const d = this.s(22);
      this.line('decoration-toran', [0, y, this.W, y], this.color.accent, Math.max(1, this.s(3)), { opacity: 0.8 });
      for (let i = 0, x = step / 2; x < this.W; i += 1, x += step) {
        this.rect('decoration-toran', { x: x - d / 2, y: y - d / 2, w: d, h: d }, i % 2 ? this.color.accent : this.color.primary, { radius: d / 2 });
        if (i % 2 === 0) this.rect('decoration-toran', { x: x - d / 4, y: y + d * 0.75, w: d / 2, h: d / 2 }, this.color.border, { radius: d / 4 });
      }
    } else if (decoration === 'mandala') {
      // Concentric rings bleeding off two opposite corners.
      const r = Math.min(this.W, this.H) * 0.34;
      for (const [cx, cy] of [[this.W, 0], [0, this.H]]) {
        for (const k of [1, 0.78, 0.56, 0.34]) {
          const rr = r * k;
          this.rect('decoration-mandala', { x: cx - rr, y: cy - rr, w: rr * 2, h: rr * 2 }, 'transparent', { radius: rr, stroke: this.color.primary, strokeWidth: Math.max(1, this.s(k === 1 ? 3 : 2)), opacity: 0.22 });
        }
      }
    } else if (decoration === 'kolam') {
      // Dotted frame, like a kolam / rangoli border.
      const pad = this.s(16);
      const step = this.s(36);
      const d = Math.max(2, this.s(7));
      const dot = (x: number, y: number, i: number) => this.rect('decoration-kolam', { x: x - d / 2, y: y - d / 2, w: d, h: d }, i % 3 ? this.color.border : this.color.primary, { radius: d / 2, opacity: 0.85 });
      const nx = Math.max(1, Math.round((this.W - pad * 2) / step));
      const ny = Math.max(1, Math.round((this.H - pad * 2) / step));
      for (let i = 0; i <= nx; i += 1) {
        const x = pad + ((this.W - pad * 2) * i) / nx;
        dot(x, pad, i);
        dot(x, this.H - pad, i);
      }
      for (let i = 1; i < ny; i += 1) {
        const y = pad + ((this.H - pad * 2) * i) / ny;
        dot(pad, y, i);
        dot(this.W - pad, y, i);
      }
    } else if (decoration === 'kasavu') {
      // Gold border bands, as on a Kerala kasavu saree.
      const band = this.s(12);
      this.rect('decoration-kasavu', { x: 0, y: 0, w: this.W, h: band }, this.color.accent);
      this.rect('decoration-kasavu', { x: 0, y: this.H - band, w: this.W, h: band }, this.color.accent);
      this.line('decoration-kasavu', [0, band * 1.9, this.W, band * 1.9], this.color.accent, Math.max(1, this.s(2)), { opacity: 0.7 });
    } else if (decoration === 'tiranga') {
      const band = this.s(14);
      this.rect('decoration-tiranga', { x: 0, y: 0, w: this.W, h: band }, this.color.primary);
      this.rect('decoration-tiranga', { x: 0, y: this.H - band, w: this.W, h: band }, this.color.accent);
    }
  }

  /**
   * One line of fine print (RERA number, offer terms) in the bottom margin,
   * left of the brand mark. `column` limits it to part of the page width.
   */
  footnote(slot: string, value: string | undefined, column: { x: number; w: number } = { x: this.margin, w: this.W - this.margin * 2 }) {
    const text = (value ?? '').trim();
    if (!text) return;
    const brand = this.ctx.brand;
    const reserved = brand?.name || brand?.logo?.src ? this.s(340) : 0;
    const right = Math.min(column.x + column.w, this.W - this.margin - reserved);
    const h = this.s(40);
    const box = { x: column.x, y: this.H - this.margin * 0.55 - h / 2, w: Math.max(1, right - column.x), h };
    this.text('footnote', slot, text, box, { size: 18, minSize: 11, color: this.color.muted, lineHeight: 1.15, opacity: 0.9 });
  }

  /**
   * Eyebrow + title + subtitle stacked at the top of `area`.
   * Returns the area remaining below the header.
   */
  header(area: Box, content: { eyebrow?: string; title?: string; subtitle?: string }, opts: { align?: 'left' | 'center'; titleSize?: number; maxTitleShare?: number } = {}): Box {
    const align = opts.align ?? 'left';
    let y = area.y;
    const gap = this.s(18);
    if (content.eyebrow?.trim()) {
      const h = this.s(34);
      this.text('eyebrow', 'eyebrow', content.eyebrow, { x: area.x, y, w: area.w, h }, { size: 24, minSize: 16, weight: 700, color: this.color.primary, uppercase: true, letterSpacing: 3, align });
      y += h + gap * 0.6;
    }
    const titleSize = opts.titleSize ?? (this.cls === 'wide' ? 76 : 84);
    const titleBoxH = Math.min(area.h * (opts.maxTitleShare ?? 0.34), this.s(titleSize) * 1.08 * 3);
    const used = this.text('title', 'title', content.title, { x: area.x, y, w: area.w, h: titleBoxH }, { font: 'heading', size: titleSize, minSize: titleSize * 0.5, weight: 800, align });
    y += used + gap;
    if (content.subtitle?.trim()) {
      const h = Math.min(this.s(96), area.h * 0.14);
      const usedSub = this.text('subtitle', 'subtitle', content.subtitle, { x: area.x, y, w: area.w, h }, { size: 32, minSize: 20, color: this.color.muted, align });
      y += usedSub + gap;
    }
    y += gap * 0.6;
    return { x: area.x, y, w: area.w, h: area.y + area.h - y };
  }

  /**
   * Full-width call-to-action bar at the bottom of `area`; returns the area above it.
   * `slot` names the slot the bar's text comes from, so canvas edits sync back to it.
   */
  ctaBar(area: Box, text: string | undefined, tag?: string, slot = 'cta'): Box {
    if (!text?.trim() && !tag?.trim()) return area;
    const h = this.s(this.cls === 'wide' ? 84 : 96);
    const box = { x: area.x, y: area.y + area.h - h, w: area.w, h };
    this.rect('cta-bar', box, this.color.primary, { radius: this.s(Math.min(this.theme.radius, 48)) });
    const pad = this.s(32);
    const tagW = tag?.trim() ? Math.min(box.w * 0.34, this.s(300)) : 0;
    this.text('cta', slot, text, { x: box.x + pad, y: box.y + this.s(22), w: box.w - pad * 2 - tagW, h: h - this.s(40) }, { size: 32, minSize: 18, weight: 700, color: this.color.onPrimary });
    if (tagW) this.text('cta-tag', 'tag', tag, { x: box.x + box.w - pad - tagW, y: box.y + this.s(26), w: tagW, h: h - this.s(44) }, { size: 24, minSize: 14, weight: 600, color: this.color.onPrimary, align: 'right' });
    return { ...area, h: area.h - h - this.s(28) };
  }

  /** Small brand line (name or logo) in the bottom-right corner, outside other content. */
  brandMark() {
    const brand = this.ctx.brand;
    if (!brand?.name && !brand?.logo?.src) return;
    const h = this.s(40);
    const w = this.s(320);
    const box = { x: this.W - this.margin - w, y: this.H - this.margin * 0.55 - h / 2, w, h };
    if (brand.logo?.src) this.image('brand-logo', 'brand.logo', brand.logo, { x: box.x + w - h * 3, y: box.y, w: h * 3, h }, { fit: 'contain', label: 'Logo' });
    else this.text('brand-name', 'brand.name', brand.name, box, { size: 22, minSize: 14, weight: 700, color: this.color.muted, align: 'right' });
  }
}

export function round(box: Box): Box {
  return { x: Math.round(box.x * 10) / 10, y: Math.round(box.y * 10) / 10, w: Math.round(box.w * 10) / 10, h: Math.round(box.h * 10) / 10 };
}

/** Split `area` into a grid of equally sized cells, row-major. */
export function grid(area: Box, count: number, cols: number, gap: number): Box[] {
  const rows = Math.max(1, Math.ceil(count / cols));
  const w = (area.w - gap * (cols - 1)) / cols;
  const h = (area.h - gap * (rows - 1)) / rows;
  return Array.from({ length: count }, (_, i) => ({ x: area.x + (i % cols) * (w + gap), y: area.y + Math.floor(i / cols) * (h + gap), w, h }));
}

/** Horizontal split: [left, right]. */
export function splitX(area: Box, ratio: number, gap: number): [Box, Box] {
  const w1 = (area.w - gap) * ratio;
  return [
    { x: area.x, y: area.y, w: w1, h: area.h },
    { x: area.x + w1 + gap, y: area.y, w: area.w - w1 - gap, h: area.h },
  ];
}

/** Vertical split: [top, bottom]. */
export function splitY(area: Box, ratio: number, gap: number): [Box, Box] {
  const h1 = (area.h - gap) * ratio;
  return [
    { x: area.x, y: area.y, w: area.w, h: h1 },
    { x: area.x, y: area.y + h1 + gap, w: area.w, h: area.h - h1 - gap },
  ];
}

export function inset(box: Box, dx: number, dy = dx): Box {
  return { x: box.x + dx, y: box.y + dy, w: Math.max(0, box.w - dx * 2), h: Math.max(0, box.h - dy * 2) };
}
