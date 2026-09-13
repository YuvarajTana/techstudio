import { fabric } from 'fabric';

export type PosterSpecThemeId =
  | 'tech-blue'
  | 'purple-ai'
  | 'minimal-light'
  | 'corporate-navy'
  | 'black-gold'
  | 'green-growth'
  | 'orange-energy'
  | 'neon-future';

export type PosterSpecCard = {
  number: number;
  title: string;
  description: string;
  icon?: string;
};

export type PosterSpec = {
  title: string;
  subtitle: string;
  description: string;
  posterType: 'numbered-cards' | string;
  theme: PosterSpecThemeId | string;
  cards: PosterSpecCard[];
  cta: {
    text: string;
    tag?: string;
  };
};

type ThemeConfig = {
  id: PosterSpecThemeId;
  label: string;
  background: string;
  surface: string;
  card: string;
  cardAlt: string;
  border: string;
  primary: string;
  accent: string;
  text: string;
  muted: string;
  glow: string;
  dark: boolean;
};

export const POSTER_SPEC_THEMES: ThemeConfig[] = [
  {
    id: 'tech-blue',
    label: 'Tech Blue',
    background: '#07111f',
    surface: '#0d1b2e',
    card: '#10223a',
    cardAlt: '#0b1728',
    border: '#255f9f',
    primary: '#38bdf8',
    accent: '#22d3ee',
    text: '#f8fafc',
    muted: '#a9bdd5',
    glow: '#38bdf8',
    dark: true,
  },
  {
    id: 'purple-ai',
    label: 'Purple AI',
    background: '#12071f',
    surface: '#201033',
    card: '#281442',
    cardAlt: '#1b0c2d',
    border: '#7c3aed',
    primary: '#c084fc',
    accent: '#f472b6',
    text: '#fff7ff',
    muted: '#d8c7e8',
    glow: '#a855f7',
    dark: true,
  },
  {
    id: 'minimal-light',
    label: 'Minimal Light',
    background: '#f8fafc',
    surface: '#ffffff',
    card: '#ffffff',
    cardAlt: '#f1f5f9',
    border: '#cbd5e1',
    primary: '#2563eb',
    accent: '#0f766e',
    text: '#0f172a',
    muted: '#475569',
    glow: '#93c5fd',
    dark: false,
  },
  {
    id: 'corporate-navy',
    label: 'Corporate Navy',
    background: '#071326',
    surface: '#0f2344',
    card: '#132a4f',
    cardAlt: '#0b1a33',
    border: '#355c8f',
    primary: '#7dd3fc',
    accent: '#dbeafe',
    text: '#f8fafc',
    muted: '#bdd2ea',
    glow: '#1d4ed8',
    dark: true,
  },
  {
    id: 'black-gold',
    label: 'Black and Gold',
    background: '#070707',
    surface: '#15120a',
    card: '#1f1a0f',
    cardAlt: '#111111',
    border: '#a16207',
    primary: '#fbbf24',
    accent: '#fde68a',
    text: '#fffbea',
    muted: '#d6c7a1',
    glow: '#d97706',
    dark: true,
  },
  {
    id: 'green-growth',
    label: 'Green Growth',
    background: '#06140f',
    surface: '#0c281d',
    card: '#123526',
    cardAlt: '#0b2018',
    border: '#15803d',
    primary: '#34d399',
    accent: '#a7f3d0',
    text: '#f0fdf4',
    muted: '#b7d8c5',
    glow: '#22c55e',
    dark: true,
  },
  {
    id: 'orange-energy',
    label: 'Orange Energy',
    background: '#1c0b05',
    surface: '#331406',
    card: '#451a08',
    cardAlt: '#281006',
    border: '#ea580c',
    primary: '#fb923c',
    accent: '#fed7aa',
    text: '#fff7ed',
    muted: '#f3c6a6',
    glow: '#f97316',
    dark: true,
  },
  {
    id: 'neon-future',
    label: 'Neon Future',
    background: '#050816',
    surface: '#0d1230',
    card: '#131a3f',
    cardAlt: '#070b1e',
    border: '#06b6d4',
    primary: '#22d3ee',
    accent: '#e879f9',
    text: '#f8fafc',
    muted: '#b8c7e0',
    glow: '#d946ef',
    dark: true,
  },
];

export const POSTER_SPEC_SERIALIZATION_PROPS = [
  'id',
  'name',
  'selectable',
  'hasControls',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
  'teckstudioObjectType',
  'posterRole',
  'posterField',
  'posterCardIndex',
  'posterSpec',
  'posterSpecTheme',
  'posterSpecCanvasWidth',
  'posterSpecCanvasHeight',
];

const POSTER_WIDTH = 800;
const POSTER_HEIGHT = 1132;
const FONT_FAMILY = 'Outfit';

function themeFor(id: string | undefined): ThemeConfig {
  return POSTER_SPEC_THEMES.find((theme) => theme.id === id) || POSTER_SPEC_THEMES[0];
}

function objectId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function meta(role: string, field?: string, cardIndex?: number) {
  return {
    id: objectId(role),
    teckstudioObjectType: 'posterSpec',
    posterRole: role,
    posterField: field,
    posterCardIndex: cardIndex,
  };
}

function addTextbox(
  canvas: fabric.Canvas,
  text: string,
  options: fabric.ITextboxOptions & Record<string, unknown>,
) {
  const textbox = new fabric.Textbox(text, {
    fontFamily: FONT_FAMILY,
    splitByGrapheme: true,
    editable: true,
    selectable: true,
    evented: true,
    ...options,
  });
  canvas.add(textbox);
  return textbox;
}

function addRect(canvas: fabric.Canvas, options: fabric.IRectOptions & Record<string, unknown>) {
  const rect = new fabric.Rect({
    selectable: true,
    evented: true,
    ...options,
  });
  canvas.add(rect);
  return rect;
}

function iconGlyph(icon: string | undefined) {
  switch ((icon || '').toLowerCase()) {
    case 'chip':
      return '▣';
    case 'cloud':
      return '☁';
    case 'database':
      return '▦';
    case 'shield':
      return '⬟';
    case 'chart':
      return '↗';
    case 'code':
      return '</>';
    case 'spark':
      return '✦';
    default:
      return '•';
  }
}

export function normalizePosterSpec(spec: PosterSpec, themeId?: PosterSpecThemeId): PosterSpec {
  const cards = Array.isArray(spec.cards) ? spec.cards.slice(0, 9) : [];
  return {
    title: spec.title?.trim() || 'Technical Poster',
    subtitle: spec.subtitle?.trim() || 'A practical visual guide',
    description: spec.description?.trim() || 'Use this editable poster to explain the topic clearly.',
    posterType: 'numbered-cards',
    theme: themeId || themeFor(String(spec.theme)).id,
    cards: cards.map((card, index) => ({
      number: index + 1,
      title: card.title?.trim() || `Step ${index + 1}`,
      description: card.description?.trim() || 'Add a practical supporting point.',
      icon: card.icon || 'dot',
    })),
    cta: {
      text: spec.cta?.text?.trim() || 'Start building',
      tag: spec.cta?.tag?.trim() || 'TECHPOSTER STUDIO',
    },
  };
}

export function renderPosterSpecToCanvas(
  canvas: fabric.Canvas,
  rawSpec: PosterSpec,
  requestedTheme?: PosterSpecThemeId,
) {
  const spec = normalizePosterSpec(rawSpec, requestedTheme);
  const theme = themeFor(String(spec.theme));
  const cardCount = Math.max(3, Math.min(9, spec.cards.length || 7));
  const columns = cardCount <= 4 ? 1 : 2;
  const rows = Math.ceil(cardCount / columns);
  const margin = 56;
  const gap = 16;
  const cardAreaTop = 320;
  const cardAreaBottom = 960;
  const cardWidth = (POSTER_WIDTH - margin * 2 - gap * (columns - 1)) / columns;
  const cardHeight = (cardAreaBottom - cardAreaTop - gap * (rows - 1)) / rows;

  canvas.clear();
  canvas.setDimensions({ width: POSTER_WIDTH, height: POSTER_HEIGHT });
  canvas.setBackgroundColor(theme.background, () => undefined);

  addRect(canvas, {
    left: 0,
    top: 0,
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    fill: theme.background,
    selectable: false,
    evented: false,
    name: 'Poster background',
    ...meta('background', 'theme'),
  });

  addRect(canvas, {
    left: -120,
    top: -100,
    width: 380,
    height: 380,
    rx: 190,
    ry: 190,
    fill: theme.glow,
    opacity: theme.dark ? 0.14 : 0.12,
    selectable: false,
    evented: false,
    name: 'Poster glow top',
    ...meta('decoration'),
  });

  addRect(canvas, {
    left: POSTER_WIDTH - 240,
    top: 760,
    width: 360,
    height: 360,
    rx: 180,
    ry: 180,
    fill: theme.accent,
    opacity: theme.dark ? 0.12 : 0.1,
    selectable: false,
    evented: false,
    name: 'Poster glow bottom',
    ...meta('decoration'),
  });

  addTextbox(canvas, 'NUMBERED TECHNICAL CARDS', {
    left: margin,
    top: 54,
    width: POSTER_WIDTH - margin * 2,
    fontSize: 16,
    charSpacing: 180,
    fill: theme.primary,
    fontWeight: '700',
    textAlign: 'center',
    name: 'Poster eyebrow',
    ...meta('eyebrow', 'eyebrow'),
  });

  addTextbox(canvas, spec.title, {
    left: margin,
    top: 92,
    width: POSTER_WIDTH - margin * 2,
    fontSize: spec.title.length > 26 ? 52 : 62,
    lineHeight: 0.94,
    fill: theme.text,
    fontWeight: '800',
    textAlign: 'center',
    name: 'Poster title',
    ...meta('title', 'title'),
  });

  addTextbox(canvas, spec.subtitle, {
    left: margin + 28,
    top: 210,
    width: POSTER_WIDTH - margin * 2 - 56,
    fontSize: 24,
    lineHeight: 1.16,
    fill: theme.muted,
    fontWeight: '600',
    textAlign: 'center',
    name: 'Poster subtitle',
    ...meta('subtitle', 'subtitle'),
  });

  addTextbox(canvas, spec.description, {
    left: margin + 50,
    top: 260,
    width: POSTER_WIDTH - margin * 2 - 100,
    fontSize: 16,
    lineHeight: 1.25,
    fill: theme.muted,
    textAlign: 'center',
    name: 'Poster description',
    ...meta('description', 'description'),
  });

  spec.cards.slice(0, cardCount).forEach((card, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const left = margin + column * (cardWidth + gap);
    const top = cardAreaTop + row * (cardHeight + gap);
    const cardFill = index % 2 === 0 ? theme.card : theme.cardAlt;

    addRect(canvas, {
      left,
      top,
      width: cardWidth,
      height: cardHeight,
      rx: 24,
      ry: 24,
      fill: cardFill,
      stroke: theme.border,
      strokeWidth: theme.dark ? 1.2 : 1,
      opacity: 0.96,
      name: `Card ${card.number} background`,
      ...meta('card-background', 'cards', index),
    });

    addRect(canvas, {
      left: left + 20,
      top: top + 18,
      width: 48,
      height: 48,
      rx: 16,
      ry: 16,
      fill: theme.primary,
      opacity: theme.dark ? 0.2 : 0.14,
      stroke: theme.primary,
      strokeWidth: 1,
      name: `Card ${card.number} number badge`,
      ...meta('card-number-badge', 'cards', index),
    });

    addTextbox(canvas, String(card.number).padStart(2, '0'), {
      left: left + 20,
      top: top + 29,
      width: 48,
      fontSize: 18,
      fill: theme.primary,
      fontWeight: '800',
      textAlign: 'center',
      selectable: true,
      name: `Card ${card.number} number`,
      ...meta('card-number', 'cards', index),
    });

    addTextbox(canvas, iconGlyph(card.icon), {
      left: left + cardWidth - 60,
      top: top + 25,
      width: 36,
      fontSize: 19,
      fill: theme.accent,
      fontWeight: '700',
      textAlign: 'center',
      name: `Card ${card.number} icon`,
      ...meta('card-icon', 'cards', index),
    });

    addTextbox(canvas, card.title, {
      left: left + 82,
      top: top + 20,
      width: cardWidth - 150,
      fontSize: columns === 1 ? 24 : 20,
      lineHeight: 1.05,
      fill: theme.text,
      fontWeight: '800',
      name: `Card ${card.number} title`,
      ...meta('card-title', 'cards', index),
    });

    addTextbox(canvas, card.description, {
      left: left + 22,
      top: top + Math.max(76, cardHeight * 0.48),
      width: cardWidth - 44,
      fontSize: rows >= 5 ? 13 : 15,
      lineHeight: 1.2,
      fill: theme.muted,
      name: `Card ${card.number} description`,
      ...meta('card-description', 'cards', index),
    });
  });

  addRect(canvas, {
    left: margin,
    top: 1004,
    width: POSTER_WIDTH - margin * 2,
    height: 82,
    rx: 28,
    ry: 28,
    fill: theme.surface,
    stroke: theme.primary,
    strokeWidth: 1.2,
    opacity: 0.96,
    name: 'CTA background',
    ...meta('cta-background', 'cta'),
  });

  addTextbox(canvas, spec.cta.text, {
    left: margin + 28,
    top: 1026,
    width: POSTER_WIDTH - margin * 2 - 56,
    fontSize: 26,
    fill: theme.text,
    fontWeight: '800',
    textAlign: 'center',
    name: 'Poster CTA',
    ...meta('cta-text', 'cta.text'),
  });

  addTextbox(canvas, spec.cta.tag || 'TECHPOSTER STUDIO', {
    left: margin,
    top: 1088,
    width: POSTER_WIDTH - margin * 2,
    fontSize: 13,
    charSpacing: 180,
    fill: theme.primary,
    fontWeight: '700',
    textAlign: 'center',
    name: 'Poster footer tag',
    ...meta('cta-tag', 'cta.tag'),
  });

  const metadata = new fabric.Rect({
    left: -10,
    top: -10,
    width: 1,
    height: 1,
    fill: 'transparent',
    visible: false,
    selectable: false,
    evented: false,
    name: 'PosterSpec metadata',
  });
  metadata.set({
    ...meta('metadata'),
    teckstudioObjectType: 'posterSpecMetadata',
    posterSpec: spec,
    posterSpecTheme: spec.theme,
    posterSpecCanvasWidth: POSTER_WIDTH,
    posterSpecCanvasHeight: POSTER_HEIGHT,
  } as Record<string, unknown>);
  canvas.add(metadata);

  canvas.discardActiveObject();
  canvas.requestRenderAll();
  return {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    objectCount: canvas.getObjects().length,
    spec,
  };
}

export function createPosterSpecProjectData(rawSpec: PosterSpec, requestedTheme?: PosterSpecThemeId) {
  const element = document.createElement('canvas');
  const canvas = new fabric.Canvas(element, { renderOnAddRemove: false, preserveObjectStacking: true });
  const rendered = renderPosterSpecToCanvas(canvas, rawSpec, requestedTheme);
  const data = JSON.stringify({
    ...canvas.toJSON(POSTER_SPEC_SERIALIZATION_PROPS),
    width: rendered.width,
    height: rendered.height,
  });
  canvas.dispose();
  return {
    data,
    width: rendered.width,
    height: rendered.height,
    spec: rendered.spec,
  };
}
