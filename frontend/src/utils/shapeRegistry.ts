/**
 * Centralized Shape Registry — canonical definitions for every shape.
 * All four workflows (sidebar preview, canvas insertion, project reload, export)
 * use these same definitions.
 */
import { fabric } from 'fabric';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShapeCategory =
  | 'basic'
  | 'polygon'
  | 'star'
  | 'arrow'
  | 'flowchart'
  | 'speech-bubble'
  | 'symbol'
  | 'decorative'
  | 'cloud'
  | 'heart'
  | 'banner'
  | 'teardrop'
  | 'cog'
  | 'square-star';

export interface ShapeDefinition {
  id: string;
  name: string;
  category: ShapeCategory;
  tags: string[];
  defaultWidth: number;
  defaultHeight: number;
  /** Returns SVG markup for sidebar thumbnail */
  thumbnail: () => string;
  /** Returns a Fabric.js object for canvas insertion */
  create: (opts?: ShapeCreateOptions) => fabric.Object;
}

export interface ShapeCreateOptions {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_FILL = '#8b5cf6';
const DEFAULT_STROKE = '#7c3aed';

function svgWrap(inner: string, w = 100, h = 100): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${inner}</svg>`;
}

function polyPoints(cx: number, cy: number, r: number, sides: number, angleOffset = -Math.PI / 2): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = angleOffset + (2 * Math.PI * i) / sides;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / points;
    const r = i % 2 === 0 ? outerR : innerR;
    result.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return result;
}

// ─── Shape Registry ───────────────────────────────────────────────────────────

export const SHAPE_REGISTRY: ShapeDefinition[] = [

  // ═══════════════════════ BASIC SHAPES ═══════════════════════════════════════

  {
    id: 'rectangle', name: 'Rectangle', category: 'basic', tags: ['rect', 'square', 'box'],
    defaultWidth: 140, defaultHeight: 100,
    thumbnail: () => svgWrap('<rect x="10" y="20" width="80" height="60" rx="2" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: o?.width || 140, height: o?.height || 100, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, rx: 2, ry: 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'square', name: 'Square', category: 'basic', tags: ['rect', 'box'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<rect x="10" y="10" width="80" height="80" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 120, height: 120, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'rounded-rect', name: 'Rounded Rectangle', category: 'basic', tags: ['rounded', 'rect', 'soft'],
    defaultWidth: 140, defaultHeight: 100,
    thumbnail: () => svgWrap('<rect x="5" y="15" width="90" height="70" rx="14" ry="14" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: o?.width || 140, height: o?.height || 100, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, rx: 16, ry: 16, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'circle', name: 'Circle', category: 'basic', tags: ['round', 'oval'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="40" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Circle({ radius: 60, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'oval', name: 'Oval', category: 'basic', tags: ['ellipse', 'round'],
    defaultWidth: 140, defaultHeight: 90,
    thumbnail: () => svgWrap('<ellipse cx="50" cy="50" rx="45" ry="30" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const g = new fabric.Group([
        new fabric.Ellipse({ rx: 70, ry: 45, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, originX: 'center', originY: 'center' }),
      ], { left: o?.left ?? 350, top: o?.top ?? 350, width: 140, height: 90 });
      return g;
    },
  },
  {
    id: 'triangle', name: 'Triangle', category: 'basic', tags: ['tri'],
    defaultWidth: 120, defaultHeight: 110,
    thumbnail: () => svgWrap('<polygon points="50,5 95,95 5,95" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Triangle({ width: 120, height: 110, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'inverted-triangle', name: 'Inverted Triangle', category: 'basic', tags: ['tri'],
    defaultWidth: 120, defaultHeight: 110,
    thumbnail: () => svgWrap('<polygon points="50,95 95,5 5,5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const t = new fabric.Triangle({ width: 120, height: 110, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350, angle: 180 });
      return t;
    },
  },
  {
    id: 'right-triangle', name: 'Right Triangle', category: 'basic', tags: ['tri'],
    defaultWidth: 120, defaultHeight: 110,
    thumbnail: () => svgWrap('<polygon points="5,95 95,95 5,5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 110 }, { x: 120, y: 110 }, { x: 0, y: 0 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'diamond', name: 'Diamond', category: 'basic', tags: ['rhombus', 'gem'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<polygon points="50,2 98,50 50,98 2,50" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 100, height: 100, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, angle: 45, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'parallelogram', name: 'Parallelogram', category: 'basic', tags: ['slant'],
    defaultWidth: 140, defaultHeight: 80,
    thumbnail: () => svgWrap('<polygon points="25,10 95,10 75,90 5,90" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 30, y: 0 }, { x: 140, y: 0 }, { x: 110, y: 80 }, { x: 0, y: 80 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'trapezoid', name: 'Trapezoid', category: 'basic', tags: ['trap'],
    defaultWidth: 140, defaultHeight: 80,
    thumbnail: () => svgWrap('<polygon points="25,10 75,10 95,90 5,90" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 25, y: 0 }, { x: 115, y: 0 }, { x: 140, y: 80 }, { x: 0, y: 80 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'semicircle', name: 'Semicircle', category: 'basic', tags: ['half-circle'],
    defaultWidth: 120, defaultHeight: 70,
    thumbnail: () => svgWrap('<path d="M 10 60 A 45 45 0 0 1 90 60 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 0 60 A 60 60 0 0 1 120 60 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'quarter-circle', name: 'Quarter Circle', category: 'basic', tags: ['quarter'],
    defaultWidth: 80, defaultHeight: 80,
    thumbnail: () => svgWrap('<path d="M 5 90 L 5 5 A 45 45 0 0 1 90 5 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 0 80 L 0 0 A 80 80 0 0 1 80 0 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cross', name: 'Cross', category: 'basic', tags: ['plus', 'x'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'plus', name: 'Plus', category: 'basic', tags: ['add', 'cross'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<rect x="38" y="5" width="24" height="90" rx="4" fill="#8b5cf6"/><rect x="5" y="38" width="90" height="24" rx="4" fill="#8b5cf6"/>'),
    create: (o) => {
      const bar1 = new fabric.Rect({ width: 24, height: 90, rx: 6, ry: 6, fill: o?.fill || DEFAULT_FILL, originX: 'center', originY: 'center', left: 50, top: 50 });
      const bar2 = new fabric.Rect({ width: 90, height: 24, rx: 6, ry: 6, fill: o?.fill || DEFAULT_FILL, originX: 'center', originY: 'center', left: 50, top: 50 });
      return new fabric.Group([bar1, bar2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'minus', name: 'Minus', category: 'basic', tags: ['subtract', 'line'],
    defaultWidth: 100, defaultHeight: 40,
    thumbnail: () => svgWrap('<rect x="5" y="35" width="90" height="20" rx="6" fill="#8b5cf6"/>'),
    create: (o) => new fabric.Rect({ width: 100, height: 20, rx: 10, ry: 10, fill: o?.fill || DEFAULT_FILL, left: o?.left ?? 350, top: o?.top ?? 380 }),
  },
  {
    id: 'pill', name: 'Pill', category: 'basic', tags: ['capsule', 'rounded'],
    defaultWidth: 140, defaultHeight: 60,
    thumbnail: () => svgWrap('<rect x="5" y="25" width="90" height="50" rx="25" ry="25" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 140, height: 60, rx: 30, ry: 30, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'ring', name: 'Ring', category: 'basic', tags: ['donut', 'hole'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="42" fill="none" stroke="#8b5cf6" stroke-width="10"/>'),
    create: (o) => {
      const outer = new fabric.Circle({ radius: 60, fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 14, originX: 'center', originY: 'center', left: 50, top: 50 });
      return new fabric.Group([outer], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'crescent', name: 'Crescent', category: 'basic', tags: ['moon'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 60 10 A 40 40 0 1 0 60 90 A 30 30 0 1 1 60 10 Z" fill="#8b5cf6"/>'),
    create: (o) => {
      const path = 'M 60 10 A 40 40 0 1 0 60 90 A 30 30 0 1 1 60 10 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'droplet', name: 'Droplet', category: 'basic', tags: ['water', 'tear'],
    defaultWidth: 80, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 50 5 Q 80 45 80 60 A 30 30 0 0 1 20 60 Q 20 45 50 5 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 50 5 Q 85 50 85 65 A 35 35 0 0 1 15 65 Q 15 50 50 5 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud', name: 'Cloud', category: 'basic', tags: ['weather', 'sky'],
    defaultWidth: 140, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 15 20 35 15 Q 50 5 60 15 Q 70 5 85 15 Q 100 10 105 25 Q 115 25 120 40 Q 130 45 130 55 Q 130 70 110 70 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 15 20 35 15 Q 50 5 60 15 Q 70 5 85 15 Q 100 10 105 25 Q 115 25 120 40 Q 130 45 130 55 Q 130 70 110 70 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart', name: 'Heart', category: 'basic', tags: ['love', 'like'],
    defaultWidth: 100, defaultHeight: 95,
    thumbnail: () => svgWrap('<path d="M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z" fill="#8b5cf6"/>'),
    create: (o) => {
      const path = 'M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'lightning', name: 'Lightning Bolt', category: 'basic', tags: ['bolt', 'thunder', 'electric'],
    defaultWidth: 70, defaultHeight: 100,
    thumbnail: () => svgWrap('<polygon points="40,0 10,50 30,50 15,100 60,40 38,40 55,0" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 40, y: 0 }, { x: 10, y: 50 }, { x: 30, y: 50 }, { x: 15, y: 100 }, { x: 60, y: 40 }, { x: 38, y: 40 }, { x: 55, y: 0 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'checkmark', name: 'Checkmark', category: 'basic', tags: ['check', 'tick', 'done'],
    defaultWidth: 80, defaultHeight: 70,
    thumbnail: () => svgWrap('<polyline points="10,38 32,60 72,14" fill="none" stroke="#8b5cf6" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'),
    create: (o) => {
      const path = 'M 10 38 L 32 60 L 72 14';
      return new fabric.Path(path, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 10, strokeLineCap: 'round', strokeLineJoin: 'round', left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'x-symbol', name: 'X Symbol', category: 'basic', tags: ['close', 'delete', 'cancel'],
    defaultWidth: 70, defaultHeight: 70,
    thumbnail: () => svgWrap('<line x1="10" y1="10" x2="90" y2="90" stroke="#8b5cf6" stroke-width="10" stroke-linecap="round"/><line x1="90" y1="10" x2="10" y2="90" stroke="#8b5cf6" stroke-width="10" stroke-linecap="round"/>'),
    create: (o) => {
      const l1 = new fabric.Line([10, 10, 90, 90], { stroke: o?.fill || DEFAULT_FILL, strokeWidth: 10, strokeLineCap: 'round' });
      const l2 = new fabric.Line([90, 10, 10, 90], { stroke: o?.fill || DEFAULT_FILL, strokeWidth: 10, strokeLineCap: 'round' });
      return new fabric.Group([l1, l2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ POLYGONS ═══════════════════════════════════════════

  ...[3, 4, 5, 6, 7, 8, 9, 10, 12].map((sides): ShapeDefinition => ({
    id: `polygon-${sides}`,
    name: `${['', '', '', 'Triangle', 'Square', 'Pentagon', 'Hexagon', 'Heptagon', 'Octagon', 'Nonagon', 'Decagon', '', 'Dodecagon'][sides]}`,
    category: 'polygon',
    tags: ['polygon', `${sides}-sided`],
    defaultWidth: 120,
    defaultHeight: 120,
    thumbnail: () => svgWrap(`<polygon points="${polyPoints(50, 50, 40, sides)}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`),
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      const r = 60;
      for (let i = 0; i < sides; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / sides;
        pts.push({ x: r + r * Math.cos(a), y: r + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  })),

  // Shield
  {
    id: 'shield', name: 'Shield', category: 'polygon', tags: ['shield', 'badge', 'protect'],
    defaultWidth: 100, defaultHeight: 110,
    thumbnail: () => svgWrap('<path d="M 50 5 L 90 20 L 90 55 Q 90 85 50 98 Q 10 85 10 55 L 10 20 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 50 5 L 90 20 L 90 55 Q 90 85 50 98 Q 10 85 10 55 L 10 20 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ STARS ══════════════════════════════════════════════

  ...[4, 5, 6, 7, 8, 10, 12].map((points): ShapeDefinition => ({
    id: `star-${points}`,
    name: `${points}-Point Star`,
    category: 'star',
    tags: ['star', 'sparkle', `${points}-point`],
    defaultWidth: 120,
    defaultHeight: 120,
    thumbnail: () => {
      const pts = starPoints(50, 50, 42, 18, points).map((p) => `${p.x},${p.y}`).join(' ');
      return svgWrap(`<polygon points="${pts}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`);
    },
    create: (o) => {
      const pts = starPoints(60, 60, 60, 25, points);
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  })),

  // Sparkle
  {
    id: 'sparkle', name: 'Sparkle', category: 'star', tags: ['sparkle', 'twinkle', 'shine'],
    defaultWidth: 80, defaultHeight: 80,
    thumbnail: () => svgWrap('<polygon points="40,0 47,30 80,30 53,50 62,80 40,60 18,80 27,50 0,30 33,30" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 40, y: 0 }, { x: 47, y: 30 }, { x: 80, y: 30 }, { x: 53, y: 50 }, { x: 62, y: 80 }, { x: 40, y: 60 }, { x: 18, y: 80 }, { x: 27, y: 50 }, { x: 0, y: 30 }, { x: 33, y: 30 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // Sunburst
  {
    id: 'sunburst', name: 'Sunburst', category: 'star', tags: ['sun', 'burst', 'ray'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (2 * Math.PI * i) / 16;
        const r = i % 2 === 0 ? 45 : 25;
        pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#8b5cf6"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 16; i++) {
        const a = (2 * Math.PI * i) / 16;
        const r = i % 2 === 0 ? 60 : 35;
        pts.push({ x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ ARROWS ═════════════════════════════════════════════

  {
    id: 'arrow-right', name: 'Right Arrow', category: 'arrow', tags: ['arrow', 'right', 'forward'],
    defaultWidth: 140, defaultHeight: 80,
    thumbnail: () => svgWrap('<polygon points="0,20 70,20 70,0 100,35 70,70 70,50 0,50" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 20 }, { x: 70, y: 20 }, { x: 70, y: 0 }, { x: 100, y: 35 }, { x: 70, y: 70 }, { x: 70, y: 50 }, { x: 0, y: 50 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'arrow-left', name: 'Left Arrow', category: 'arrow', tags: ['arrow', 'left', 'back'],
    defaultWidth: 140, defaultHeight: 80,
    thumbnail: () => svgWrap('<polygon points="100,20 30,20 30,0 0,35 30,70 30,50 100,50" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 100, y: 20 }, { x: 30, y: 20 }, { x: 30, y: 0 }, { x: 0, y: 35 }, { x: 30, y: 70 }, { x: 30, y: 50 }, { x: 100, y: 50 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'arrow-up', name: 'Up Arrow', category: 'arrow', tags: ['arrow', 'up'],
    defaultWidth: 80, defaultHeight: 140,
    thumbnail: () => svgWrap('<polygon points="35,0 0,50 20,50 20,100 50,100 50,50 70,50" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 35, y: 0 }, { x: 0, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 100 }, { x: 50, y: 100 }, { x: 50, y: 50 }, { x: 70, y: 50 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'arrow-down', name: 'Down Arrow', category: 'arrow', tags: ['arrow', 'down'],
    defaultWidth: 80, defaultHeight: 140,
    thumbnail: () => svgWrap('<polygon points="35,100 0,50 20,50 20,0 50,0 50,50 70,50" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 35, y: 100 }, { x: 0, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 70, y: 50 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'arrow-double-h', name: 'Double Arrow H', category: 'arrow', tags: ['arrow', 'double', 'horizontal'],
    defaultWidth: 140, defaultHeight: 50,
    thumbnail: () => svgWrap('<polygon points="0,25 20,10 20,18 80,18 80,10 100,25 80,40 80,32 20,32 20,40" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 25 }, { x: 20, y: 10 }, { x: 20, y: 18 }, { x: 80, y: 18 }, { x: 80, y: 10 }, { x: 100, y: 25 }, { x: 80, y: 40 }, { x: 80, y: 32 }, { x: 20, y: 32 }, { x: 20, y: 40 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'chevron-right', name: 'Chevron Right', category: 'arrow', tags: ['chevron', 'right', 'next'],
    defaultWidth: 80, defaultHeight: 80,
    thumbnail: () => svgWrap('<polyline points="15,10 50,40 15,70" fill="none" stroke="#8b5cf6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    create: (o) => {
      const path = 'M 15 10 L 50 40 L 15 70';
      return new fabric.Path(path, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 8, strokeLineCap: 'round', strokeLineJoin: 'round', left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'chevron-left', name: 'Chevron Left', category: 'arrow', tags: ['chevron', 'left', 'back'],
    defaultWidth: 80, defaultHeight: 80,
    thumbnail: () => svgWrap('<polyline points="65,10 30,40 65,70" fill="none" stroke="#8b5cf6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    create: (o) => {
      const path = 'M 65 10 L 30 40 L 65 70';
      return new fabric.Path(path, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 8, strokeLineCap: 'round', strokeLineJoin: 'round', left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'curved-arrow', name: 'Curved Arrow', category: 'arrow', tags: ['curved', 'round', 'turn'],
    defaultWidth: 100, defaultHeight: 80,
    thumbnail: () => svgWrap('<path d="M 10 60 Q 10 10 60 10 L 55 2" fill="none" stroke="#8b5cf6" stroke-width="6" stroke-linecap="round"/><polygon points="55,2 70,12 58,18" fill="#8b5cf6"/>'),
    create: (o) => {
      const path = 'M 10 60 Q 10 10 60 10';
      const line = new fabric.Path(path, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 6, strokeLineCap: 'round' });
      const head = new fabric.Triangle({ width: 18, height: 18, fill: o?.fill || DEFAULT_FILL, left: 58, top: 2, angle: 45 });
      return new fabric.Group([line, head], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ FLOWCHART ══════════════════════════════════════════

  {
    id: 'flow-process', name: 'Process', category: 'flowchart', tags: ['flowchart', 'process', 'rectangle'],
    defaultWidth: 140, defaultHeight: 70,
    thumbnail: () => svgWrap('<rect x="5" y="15" width="90" height="70" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 140, height: 70, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'flow-terminator', name: 'Terminator', category: 'flowchart', tags: ['flowchart', 'start', 'end', 'rounded'],
    defaultWidth: 140, defaultHeight: 60,
    thumbnail: () => svgWrap('<rect x="5" y="20" width="90" height="60" rx="30" ry="30" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 140, height: 60, rx: 30, ry: 30, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'flow-decision', name: 'Decision', category: 'flowchart', tags: ['flowchart', 'diamond', 'yes', 'no'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<polygon points="50,5 95,50 50,95 5,50" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 100, height: 100, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, angle: 45, left: o?.left ?? 350, top: o?.top ?? 350 }),
  },
  {
    id: 'flow-data', name: 'Data', category: 'flowchart', tags: ['flowchart', 'io', 'input', 'output'],
    defaultWidth: 140, defaultHeight: 70,
    thumbnail: () => svgWrap('<polygon points="20,15 95,15 80,85 5,85" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 20, y: 0 }, { x: 140, y: 0 }, { x: 120, y: 70 }, { x: 0, y: 70 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'flow-document', name: 'Document', category: 'flowchart', tags: ['flowchart', 'doc', 'page'],
    defaultWidth: 130, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 10 10 L 90 10 L 90 70 Q 70 55 50 70 Q 30 85 10 70 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 0 0 L 130 0 L 130 70 Q 100 50 65 70 Q 30 90 0 70 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'flow-database', name: 'Database', category: 'flowchart', tags: ['flowchart', 'db', 'storage'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<ellipse cx="50" cy="20" rx="40" ry="12" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><path d="M 10 20 L 10 80 Q 10 92 50 92 Q 90 92 90 80 L 90 20" fill="none" stroke="#7c3aed" stroke-width="2"/><ellipse cx="50" cy="80" rx="40" ry="12" fill="none" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const top = new fabric.Ellipse({ rx: 50, ry: 15, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, originX: 'center', left: 50, top: 15 });
      const body = new fabric.Rect({ width: 100, height: 70, fill: 'transparent', stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 0, top: 15 });
      const bottom = new fabric.Ellipse({ rx: 50, ry: 15, fill: 'transparent', stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, originX: 'center', left: 50, top: 85 });
      return new fabric.Group([body, top, bottom], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'flow-preparation', name: 'Preparation', category: 'flowchart', tags: ['flowchart', 'hexagon'],
    defaultWidth: 130, defaultHeight: 80,
    thumbnail: () => svgWrap(`<polygon points="${polyPoints(50, 50, 42, 6)}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`),
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      const r = 65;
      for (let i = 0; i < 6; i++) {
        const a = (2 * Math.PI * i) / 6;
        pts.push({ x: 65 + r * 0.8 * Math.cos(a), y: 40 + r * 0.5 * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'flow-delay', name: 'Delay', category: 'flowchart', tags: ['flowchart', 'wait', 'pause'],
    defaultWidth: 120, defaultHeight: 70,
    thumbnail: () => svgWrap('<path d="M 30 10 Q 90 10 90 50 Q 90 90 30 90 L 10 90 L 10 10 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const path = 'M 30 0 Q 120 0 120 35 Q 120 70 30 70 L 0 70 L 0 0 Z';
      return new fabric.Path(path, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ SPEECH BUBBLES ═════════════════════════════════════

  {
    id: 'bubble-square', name: 'Square Speech Bubble', category: 'speech-bubble', tags: ['speech', 'bubble', 'talk', 'square'],
    defaultWidth: 160, defaultHeight: 120,
    thumbnail: () => svgWrap('<rect x="5" y="5" width="90" height="65" rx="4" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="20,70 35,90 35,70" fill="#8b5cf6"/>'),
    create: (o) => {
      const rect = new fabric.Rect({ width: 160, height: 100, rx: 8, ry: 8, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, originX: 'center', originY: 'center', left: 80, top: 50 });
      const tail = new fabric.Triangle({ width: 30, height: 25, fill: o?.fill || DEFAULT_FILL, left: 40, top: 95, angle: 0 });
      return new fabric.Group([rect, tail], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'bubble-rounded', name: 'Rounded Speech Bubble', category: 'speech-bubble', tags: ['speech', 'bubble', 'round'],
    defaultWidth: 160, defaultHeight: 120,
    thumbnail: () => svgWrap('<rect x="5" y="5" width="90" height="60" rx="20" ry="20" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="25,65 40,85 40,65" fill="#8b5cf6"/>'),
    create: (o) => {
      const rect = new fabric.Rect({ width: 160, height: 100, rx: 30, ry: 30, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, originX: 'center', originY: 'center', left: 80, top: 50 });
      const tail = new fabric.Triangle({ width: 25, height: 22, fill: o?.fill || DEFAULT_FILL, left: 40, top: 95 });
      return new fabric.Group([rect, tail], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'bubble-oval', name: 'Oval Speech Bubble', category: 'speech-bubble', tags: ['speech', 'bubble', 'oval'],
    defaultWidth: 160, defaultHeight: 110,
    thumbnail: () => svgWrap('<ellipse cx="50" cy="40" rx="45" ry="28" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="35,65 48,85 48,62" fill="#8b5cf6"/>'),
    create: (o) => {
      const ellipse = new fabric.Ellipse({ rx: 80, ry: 45, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, originX: 'center', originY: 'center', left: 80, top: 45 });
      const tail = new fabric.Triangle({ width: 22, height: 20, fill: o?.fill || DEFAULT_FILL, left: 45, top: 85 });
      return new fabric.Group([ellipse, tail], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'bubble-thought', name: 'Thought Bubble', category: 'speech-bubble', tags: ['thought', 'think', 'cloud'],
    defaultWidth: 160, defaultHeight: 130,
    thumbnail: () => svgWrap('<ellipse cx="50" cy="35" rx="42" ry="28" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><circle cx="28" cy="72" r="6" fill="#8b5cf6"/><circle cx="18" cy="85" r="4" fill="#8b5cf6"/>'),
    create: (o) => {
      const ellipse = new fabric.Ellipse({ rx: 80, ry: 45, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, originX: 'center', originY: 'center', left: 80, top: 45 });
      const dot1 = new fabric.Circle({ radius: 8, fill: o?.fill || DEFAULT_FILL, left: 35, top: 85 });
      const dot2 = new fabric.Circle({ radius: 5, fill: o?.fill || DEFAULT_FILL, left: 22, top: 100 });
      return new fabric.Group([ellipse, dot1, dot2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'bubble-shout', name: 'Shout Bubble', category: 'speech-bubble', tags: ['shout', 'yell', 'burst'],
    defaultWidth: 160, defaultHeight: 130,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 14; i++) {
        const a = (2 * Math.PI * i) / 14;
        const r = i % 2 === 0 ? 45 : 35;
        pts.push(`${50 + r * Math.cos(a)},${40 + r * Math.sin(a)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 14; i++) {
        const a = (2 * Math.PI * i) / 14;
        const r = i % 2 === 0 ? 75 : 55;
        pts.push({ x: 80 + r * Math.cos(a), y: 65 + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ SYMBOLS ════════════════════════════════════════════

  {
    id: 'emoji-smile', name: 'Smile', category: 'symbol', tags: ['emoji', 'happy', 'face'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="42" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><circle cx="35" cy="38" r="4" fill="#fff"/><circle cx="65" cy="38" r="4" fill="#fff"/><path d="M 30 58 Q 50 75 70 58" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'),
    create: (o) => {
      const face = new fabric.Circle({ radius: 50, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, originX: 'center', originY: 'center', left: 50, top: 50 });
      const eye1 = new fabric.Circle({ radius: 5, fill: '#ffffff', left: 35, top: 35 });
      const eye2 = new fabric.Circle({ radius: 5, fill: '#ffffff', left: 60, top: 35 });
      const smile = new fabric.Path('M 30 55 Q 50 75 70 55', { fill: 'transparent', stroke: '#ffffff', strokeWidth: 3, strokeLineCap: 'round' });
      return new fabric.Group([face, eye1, eye2, smile], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'emoji-star', name: 'Star Face', category: 'symbol', tags: ['emoji', 'star', 'rating'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => {
      const pts = starPoints(50, 50, 45, 20, 5).map((p) => `${p.x},${p.y}`).join(' ');
      return svgWrap(`<polygon points="${pts}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`);
    },
    create: (o) => {
      const pts = starPoints(50, 50, 50, 22, 5);
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ DECORATIVE ═════════════════════════════════════════

  {
    id: 'badge-star', name: 'Badge Star', category: 'decorative', tags: ['badge', 'star', 'ribbon'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts = starPoints(50, 50, 45, 28, 5).map((p) => `${p.x},${p.y}`).join(' ');
      return svgWrap(`<polygon points="${pts}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><circle cx="50" cy="50" r="15" fill="#7c3aed"/>`);
    },
    create: (o) => {
      const pts = starPoints(60, 60, 60, 35, 5);
      const star = new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, originX: 'center', originY: 'center', left: 60, top: 60 });
      const inner = new fabric.Circle({ radius: 18, fill: o?.stroke || DEFAULT_STROKE, originX: 'center', originY: 'center', left: 60, top: 60 });
      return new fabric.Group([star, inner], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'label-tag', name: 'Label Tag', category: 'decorative', tags: ['label', 'tag', 'price'],
    defaultWidth: 120, defaultHeight: 60,
    thumbnail: () => svgWrap('<path d="M 10 10 L 75 10 L 95 45 L 75 80 L 10 80 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 0 }, { x: 90, y: 0 }, { x: 120, y: 30 }, { x: 90, y: 60 }, { x: 0, y: 60 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'ribbon', name: 'Ribbon', category: 'decorative', tags: ['ribbon', 'banner', 'medal'],
    defaultWidth: 140, defaultHeight: 80,
    thumbnail: () => svgWrap('<polygon points="0,0 30,0 30,80 0,60" fill="#7c3aed"/><rect x="30" y="15" width="80" height="50" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="110,0 140,0 140,60 110,80" fill="#7c3aed"/>'),
    create: (o) => {
      const left = new fabric.Polygon([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 80 }, { x: 0, y: 60 }], { fill: o?.stroke || DEFAULT_STROKE });
      const center = new fabric.Rect({ width: 80, height: 50, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 30, top: 15 });
      const right = new fabric.Polygon([{ x: 110, y: 0 }, { x: 140, y: 0 }, { x: 140, y: 60 }, { x: 110, y: 80 }], { fill: o?.stroke || DEFAULT_STROKE });
      return new fabric.Group([left, center, right], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'wreath', name: 'Wreath', category: 'decorative', tags: ['wreath', 'laurel', 'circle'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="42" fill="none" stroke="#8b5cf6" stroke-width="8" stroke-dasharray="12 6"/>'),
    create: (o) => {
      const circle = new fabric.Circle({ radius: 55, fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 10, strokeDashArray: [14, 8], originX: 'center', originY: 'center', left: 50, top: 50 });
      return new fabric.Group([circle], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ CLOUDS ═════════════════════════════════════════════

  {
    id: 'cloud-rounded', name: 'Rounded Cloud', category: 'cloud', tags: ['cloud', 'sky', 'weather', 'round'],
    defaultWidth: 140, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 15 20 35 15 Q 50 5 60 15 Q 70 5 85 15 Q 100 10 105 25 Q 115 25 120 40 Q 130 45 130 55 Q 130 70 110 70 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 15 20 35 15 Q 50 5 60 15 Q 70 5 85 15 Q 100 10 105 25 Q 115 25 120 40 Q 130 45 130 55 Q 130 70 110 70 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-flat', name: 'Flat Bottom Cloud', category: 'cloud', tags: ['cloud', 'flat', 'weather'],
    defaultWidth: 140, defaultHeight: 80,
    thumbnail: () => svgWrap('<path d="M 10 65 L 130 65 Q 130 45 115 40 Q 120 20 100 15 Q 90 5 75 10 Q 65 0 50 8 Q 35 0 25 12 Q 10 15 10 35 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 10 65 L 130 65 Q 130 45 115 40 Q 120 20 100 15 Q 90 5 75 10 Q 65 0 50 8 Q 35 0 25 12 Q 10 15 10 35 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-compact', name: 'Compact Cloud', category: 'cloud', tags: ['cloud', 'small', 'tiny'],
    defaultWidth: 100, defaultHeight: 70,
    thumbnail: () => svgWrap('<path d="M 20 60 Q 5 60 5 48 Q 5 35 18 33 Q 15 18 32 14 Q 45 5 55 14 Q 65 8 75 18 Q 88 18 90 32 Q 95 35 95 48 Q 95 60 80 60 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 20 60 Q 5 60 5 48 Q 5 35 18 33 Q 15 18 32 14 Q 45 5 55 14 Q 65 8 75 18 Q 88 18 90 32 Q 95 35 95 48 Q 95 60 80 60 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-wide', name: 'Wide Cloud', category: 'cloud', tags: ['cloud', 'wide', 'stretch'],
    defaultWidth: 160, defaultHeight: 70,
    thumbnail: () => svgWrap('<path d="M 5 60 Q 5 48 15 45 Q 12 30 28 25 Q 38 15 50 18 Q 58 8 70 12 Q 82 5 92 15 Q 105 8 115 18 Q 128 12 135 25 Q 148 22 155 35 Q 160 42 158 52 Q 158 60 145 60 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 5 60 Q 5 48 15 45 Q 12 30 28 25 Q 38 15 50 18 Q 58 8 70 12 Q 82 5 92 15 Q 105 8 115 18 Q 128 12 135 25 Q 148 22 155 35 Q 160 42 158 52 Q 158 60 145 60 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-tall', name: 'Tall Cloud', category: 'cloud', tags: ['cloud', 'tall', 'puffy'],
    defaultWidth: 100, defaultHeight: 110,
    thumbnail: () => svgWrap('<path d="M 20 100 Q 5 100 5 85 Q 5 72 15 70 Q 10 55 22 48 Q 18 32 32 25 Q 35 12 50 10 Q 62 5 70 15 Q 80 10 88 22 Q 95 20 98 32 Q 100 38 100 50 Q 100 70 95 85 Q 95 100 80 100 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 20 100 Q 5 100 5 85 Q 5 72 15 70 Q 10 55 22 48 Q 18 32 32 25 Q 35 12 50 10 Q 62 5 70 15 Q 80 10 88 22 Q 95 20 98 32 Q 100 38 100 50 Q 100 70 95 85 Q 95 100 80 100 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-cartoon', name: 'Cartoon Cloud', category: 'cloud', tags: ['cloud', 'cartoon', 'fun', 'comic'],
    defaultWidth: 130, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 20 85 Q 2 85 2 70 Q 2 58 14 55 Q 10 38 28 30 Q 25 15 42 10 Q 55 0 68 10 Q 78 3 90 12 Q 100 8 108 20 Q 120 18 125 32 Q 130 38 128 50 Q 130 62 120 70 Q 120 85 105 85 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 20 85 Q 2 85 2 70 Q 2 58 14 55 Q 10 38 28 30 Q 25 15 42 10 Q 55 0 68 10 Q 78 3 90 12 Q 100 8 108 20 Q 120 18 125 32 Q 130 38 128 50 Q 130 62 120 70 Q 120 85 105 85 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-minimal', name: 'Minimal Cloud', category: 'cloud', tags: ['cloud', 'minimal', 'simple', 'clean'],
    defaultWidth: 110, defaultHeight: 60,
    thumbnail: () => svgWrap('<path d="M 15 55 Q 5 55 5 45 Q 5 35 15 33 Q 15 20 30 18 Q 40 10 52 15 Q 60 8 70 15 Q 82 10 90 20 Q 100 18 105 28 Q 110 35 108 45 Q 108 55 95 55 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 15 55 Q 5 55 5 45 Q 5 35 15 33 Q 15 20 30 18 Q 40 10 52 15 Q 60 8 70 15 Q 82 10 90 20 Q 100 18 105 28 Q 110 35 108 45 Q 108 55 95 55 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-storm', name: 'Storm Cloud', category: 'cloud', tags: ['cloud', 'storm', 'dark', 'rain'],
    defaultWidth: 140, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 20 75 Q 5 75 5 62 Q 5 50 15 48 Q 12 32 28 26 Q 25 12 42 8 Q 55 0 68 8 Q 78 2 90 10 Q 102 5 112 16 Q 122 12 128 24 Q 135 28 135 42 Q 135 55 125 62 Q 125 75 110 75 Z" fill="#6b7280" stroke="#4b5563" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 20 75 Q 5 75 5 62 Q 5 50 15 48 Q 12 32 28 26 Q 25 12 42 8 Q 55 0 68 8 Q 78 2 90 10 Q 102 5 112 16 Q 122 12 128 24 Q 135 28 135 42 Q 135 55 125 62 Q 125 75 110 75 Z';
      return new fabric.Path(p, { fill: o?.fill || '#6b7280', stroke: o?.stroke || '#4b5563', strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cloud-outline', name: 'Cloud Outline', category: 'cloud', tags: ['cloud', 'outline', 'stroke'],
    defaultWidth: 140, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 15 20 35 15 Q 50 5 60 15 Q 70 5 85 15 Q 100 10 105 25 Q 115 25 120 40 Q 130 45 130 55 Q 130 70 110 70 Z" fill="none" stroke="#8b5cf6" stroke-width="3"/>'),
    create: (o) => {
      const p = 'M 25 70 Q 5 70 5 55 Q 5 40 20 38 Q 15 20 35 15 Q 50 5 60 15 Q 70 5 85 15 Q 100 10 105 25 Q 115 25 120 40 Q 130 45 130 55 Q 130 70 110 70 Z';
      return new fabric.Path(p, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: o?.strokeWidth ?? 3, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ HEARTS ═════════════════════════════════════════════

  {
    id: 'heart-classic', name: 'Classic Heart', category: 'heart', tags: ['heart', 'love', 'like', 'valentine'],
    defaultWidth: 100, defaultHeight: 95,
    thumbnail: () => svgWrap('<path d="M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-wide', name: 'Wide Heart', category: 'heart', tags: ['heart', 'wide', 'broad'],
    defaultWidth: 120, defaultHeight: 80,
    thumbnail: () => svgWrap('<path d="M 60 75 C 30 55 0 42 0 25 C 0 8 12 0 25 0 C 35 0 50 5 60 15 C 70 5 85 0 95 0 C 108 0 120 8 120 25 C 120 42 90 55 60 75 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 60 75 C 30 55 0 42 0 25 C 0 8 12 0 25 0 C 35 0 50 5 60 15 C 70 5 85 0 95 0 C 108 0 120 8 120 25 C 120 42 90 55 60 75 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-narrow', name: 'Narrow Heart', category: 'heart', tags: ['heart', 'narrow', 'thin'],
    defaultWidth: 80, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 40 92 C 18 70 0 55 0 35 C 0 15 10 0 22 0 C 30 0 36 4 40 10 C 44 4 50 0 58 0 C 70 0 80 15 80 35 C 80 55 62 70 40 92 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 40 92 C 18 70 0 55 0 35 C 0 15 10 0 22 0 C 30 0 36 4 40 10 C 44 4 50 0 58 0 C 70 0 80 15 80 35 C 80 55 62 70 40 92 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-rounded', name: 'Rounded Heart', category: 'heart', tags: ['heart', 'round', 'soft', 'cute'],
    defaultWidth: 100, defaultHeight: 95,
    thumbnail: () => svgWrap('<path d="M 50 88 C 22 68 0 52 0 32 C 0 14 12 2 28 2 C 38 2 46 8 50 16 C 54 8 62 2 72 2 C 88 2 100 14 100 32 C 100 52 78 68 50 88 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 50 88 C 22 68 0 52 0 32 C 0 14 12 2 28 2 C 38 2 46 8 50 16 C 54 8 62 2 72 2 C 88 2 100 14 100 32 C 100 52 78 68 50 88 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-tall', name: 'Tall Heart', category: 'heart', tags: ['heart', 'tall', 'elongated'],
    defaultWidth: 80, defaultHeight: 110,
    thumbnail: () => svgWrap('<path d="M 40 102 C 15 78 0 60 0 38 C 0 16 10 0 24 0 C 32 0 37 5 40 12 C 43 5 48 0 56 0 C 70 0 80 16 80 38 C 80 60 65 78 40 102 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 40 102 C 15 78 0 60 0 38 C 0 16 10 0 24 0 C 32 0 37 5 40 12 C 43 5 48 0 56 0 C 70 0 80 16 80 38 C 80 60 65 78 40 102 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-geometric', name: 'Geometric Heart', category: 'heart', tags: ['heart', 'geometric', 'angular', 'sharp'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<polygon points="50,95 5,45 20,5 50,25 80,5 95,45" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 50, y: 95 }, { x: 5, y: 45 }, { x: 20, y: 5 }, { x: 50, y: 25 }, { x: 80, y: 5 }, { x: 95, y: 45 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-outline', name: 'Heart Outline', category: 'heart', tags: ['heart', 'outline', 'stroke'],
    defaultWidth: 100, defaultHeight: 95,
    thumbnail: () => svgWrap('<path d="M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z" fill="none" stroke="#8b5cf6" stroke-width="3"/>'),
    create: (o) => {
      const p = 'M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z';
      return new fabric.Path(p, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: o?.strokeWidth ?? 3, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-broken', name: 'Broken Heart', category: 'heart', tags: ['heart', 'broken', 'sad', 'crack'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 50 92 C 25 70 0 54 0 34 C 0 14 12 2 26 2 C 36 2 44 7 48 14 L 52 8 C 56 14 64 2 74 2 C 88 2 100 14 100 34 C 100 54 75 70 50 92 Z M 48 14 L 52 8 L 50 50" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const left = 'M 50 92 C 25 70 0 54 0 34 C 0 14 12 2 26 2 C 36 2 44 7 48 14';
      const right = 'M 52 8 C 56 14 64 2 74 2 C 88 2 100 14 100 34 C 100 54 75 70 50 92';
      const crack = 'M 48 14 L 52 8 L 50 50';
      const g = new fabric.Group([
        new fabric.Path(left, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 }),
        new fabric.Path(right, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 }),
        new fabric.Path(crack, { fill: 'transparent', stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 }),
      ], { left: o?.left ?? 350, top: o?.top ?? 350 });
      return g;
    },
  },
  {
    id: 'heart-double', name: 'Double Heart', category: 'heart', tags: ['heart', 'double', 'two', 'couple'],
    defaultWidth: 130, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 40 78 C 18 60 2 48 2 30 C 2 14 12 4 24 4 C 32 4 38 8 40 14 C 42 8 48 4 56 4 C 68 4 78 14 78 30 C 78 48 62 60 40 78 Z" fill="#8b5cf6"/><path d="M 92 68 C 76 54 64 44 64 30 C 64 18 72 10 82 10 C 88 10 92 13 94 18 C 96 13 100 10 106 10 C 116 10 124 18 124 30 C 124 44 112 54 92 68 Z" fill="#a78bfa" stroke="#7c3aed" stroke-width="1.5"/>'),
    create: (o) => {
      const p1 = 'M 40 78 C 18 60 2 48 2 30 C 2 14 12 4 24 4 C 32 4 38 8 40 14 C 42 8 48 4 56 4 C 68 4 78 14 78 30 C 78 48 62 60 40 78 Z';
      const p2 = 'M 92 68 C 76 54 64 44 64 30 C 64 18 72 10 82 10 C 88 10 92 13 94 18 C 96 13 100 10 106 10 C 116 10 124 18 124 30 C 124 44 112 54 92 68 Z';
      const h1 = new fabric.Path(p1, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 });
      const h2 = new fabric.Path(p2, { fill: o?.fill || '#a78bfa', stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 });
      return new fabric.Group([h1, h2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'heart-tilted', name: 'Tilted Heart', category: 'heart', tags: ['heart', 'tilted', 'angle', 'playful'],
    defaultWidth: 100, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2" transform="rotate(-15 50 50)"/>'),
    create: (o) => {
      const p = 'M 50 88 C 25 65 0 50 0 30 C 0 10 15 0 30 0 C 40 0 48 5 50 12 C 52 5 60 0 70 0 C 85 0 100 10 100 30 C 100 50 75 65 50 88 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, angle: -15, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ BANNERS ════════════════════════════════════════════

  {
    id: 'banner-horizontal', name: 'Horizontal Ribbon', category: 'banner', tags: ['banner', 'ribbon', 'horizontal'],
    defaultWidth: 160, defaultHeight: 50,
    thumbnail: () => svgWrap('<path d="M 10 10 L 90 10 L 90 0 L 100 25 L 90 50 L 90 40 L 10 40 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><rect x="10" y="10" width="80" height="30" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const ribbon = new fabric.Rect({ width: 120, height: 40, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 0, top: 10 });
      const tail = new fabric.Polygon([{ x: 120, y: 0 }, { x: 150, y: 25 }, { x: 120, y: 50 }], { fill: o?.stroke || DEFAULT_STROKE, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 1 });
      return new fabric.Group([ribbon, tail], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-double-ended', name: 'Double-Ended Ribbon', category: 'banner', tags: ['banner', 'ribbon', 'double', 'ends'],
    defaultWidth: 160, defaultHeight: 50,
    thumbnail: () => svgWrap('<polygon points="15,10 85,10 100,25 85,40 15,40 0,25" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 20, y: 0 }, { x: 140, y: 0 }, { x: 160, y: 25 }, { x: 140, y: 50 }, { x: 20, y: 50 }, { x: 0, y: 25 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-left-fold', name: 'Left Fold Ribbon', category: 'banner', tags: ['banner', 'ribbon', 'fold', 'left'],
    defaultWidth: 140, defaultHeight: 60,
    thumbnail: () => svgWrap('<rect x="20" y="5" width="80" height="40" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="0,5 20,5 20,20" fill="#6d28d9"/><polygon points="0,45 20,45 20,30" fill="#6d28d9"/><polygon points="100,5 120,5 120,45 100,45 110,25" fill="#7c3aed"/>'),
    create: (o) => {
      const main = new fabric.Rect({ width: 100, height: 40, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 20, top: 5 });
      const fold1 = new fabric.Polygon([{ x: 0, y: 5 }, { x: 20, y: 5 }, { x: 20, y: 20 }], { fill: o?.stroke || DEFAULT_STROKE });
      const fold2 = new fabric.Polygon([{ x: 0, y: 45 }, { x: 20, y: 45 }, { x: 20, y: 30 }], { fill: o?.stroke || DEFAULT_STROKE });
      return new fabric.Group([main, fold1, fold2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-right-fold', name: 'Right Fold Ribbon', category: 'banner', tags: ['banner', 'ribbon', 'fold', 'right'],
    defaultWidth: 140, defaultHeight: 60,
    thumbnail: () => svgWrap('<rect x="0" y="5" width="80" height="40" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="120,5 100,5 100,20" fill="#6d28d9"/><polygon points="120,45 100,45 100,30" fill="#6d28d9"/><polygon points="80,5 60,5 60,45 80,45 70,25" fill="#7c3aed"/>'),
    create: (o) => {
      const main = new fabric.Rect({ width: 100, height: 40, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 0, top: 5 });
      const fold1 = new fabric.Polygon([{ x: 120, y: 5 }, { x: 100, y: 5 }, { x: 100, y: 20 }], { fill: o?.stroke || DEFAULT_STROKE });
      const fold2 = new fabric.Polygon([{ x: 120, y: 45 }, { x: 100, y: 45 }, { x: 100, y: 30 }], { fill: o?.stroke || DEFAULT_STROKE });
      return new fabric.Group([main, fold1, fold2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-vertical', name: 'Vertical Banner', category: 'banner', tags: ['banner', 'vertical', 'flag'],
    defaultWidth: 80, defaultHeight: 120,
    thumbnail: () => svgWrap('<polygon points="10,5 70,5 70,90 40,110 10,90" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 10, y: 0 }, { x: 70, y: 0 }, { x: 70, y: 90 }, { x: 40, y: 120 }, { x: 10, y: 90 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-pointed', name: 'Pointed Banner', category: 'banner', tags: ['banner', 'pointed', 'arrow'],
    defaultWidth: 140, defaultHeight: 60,
    thumbnail: () => svgWrap('<polygon points="0,5 110,5 140,30 110,55 0,55" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 0 }, { x: 110, y: 0 }, { x: 140, y: 30 }, { x: 110, y: 60 }, { x: 0, y: 60 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-notched', name: 'Notched Banner', category: 'banner', tags: ['banner', 'notched', 'cut'],
    defaultWidth: 140, defaultHeight: 60,
    thumbnail: () => svgWrap('<polygon points="0,5 130,5 130,55 0,55 15,30" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 0 }, { x: 130, y: 0 }, { x: 130, y: 60 }, { x: 0, y: 60 }, { x: 20, y: 30 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-bookmark', name: 'Bookmark Banner', category: 'banner', tags: ['banner', 'bookmark', 'flag'],
    defaultWidth: 60, defaultHeight: 100,
    thumbnail: () => svgWrap('<polygon points="5,5 55,5 55,85 30,70 5,85" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 85 }, { x: 30, y: 65 }, { x: 0, y: 85 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-curved', name: 'Curved Ribbon', category: 'banner', tags: ['banner', 'curved', 'wave', 'flowing'],
    defaultWidth: 160, defaultHeight: 60,
    thumbnail: () => svgWrap('<path d="M 5 20 Q 40 5 80 25 Q 120 45 155 20 L 155 40 Q 120 65 80 45 Q 40 25 5 40 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 5 20 Q 40 5 80 25 Q 120 45 155 20 L 155 40 Q 120 65 80 45 Q 40 25 5 40 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-folded', name: 'Folded Ribbon', category: 'banner', tags: ['banner', 'folded', '3d', 'ribbon'],
    defaultWidth: 150, defaultHeight: 70,
    thumbnail: () => svgWrap('<rect x="5" y="10" width="100" height="40" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><polygon points="105,10 145,10 145,50 105,50" fill="#6d28d9" stroke="#7c3aed" stroke-width="2"/><polygon points="105,10 120,0 120,40 105,50" fill="#7c3aed"/>'),
    create: (o) => {
      const main = new fabric.Rect({ width: 100, height: 40, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 5, top: 10 });
      const fold = new fabric.Rect({ width: 40, height: 40, fill: o?.stroke || DEFAULT_STROKE, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 105, top: 10 });
      const shadow = new fabric.Polygon([{ x: 105, y: 10 }, { x: 120, y: 0 }, { x: 120, y: 40 }, { x: 105, y: 50 }], { fill: '#5b21b6' });
      return new fabric.Group([main, shadow, fold], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'banner-shield', name: 'Shield Banner', category: 'banner', tags: ['banner', 'shield', 'badge', 'award'],
    defaultWidth: 100, defaultHeight: 110,
    thumbnail: () => svgWrap('<path d="M 50 5 L 90 20 L 90 55 Q 90 85 50 98 Q 10 85 10 55 L 10 20 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 50 5 L 90 20 L 90 55 Q 90 85 50 98 Q 10 85 10 55 L 10 20 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ TEARDROPS ══════════════════════════════════════════

  {
    id: 'teardrop-basic', name: 'Basic Teardrop', category: 'teardrop', tags: ['teardrop', 'drop', 'water', 'tear'],
    defaultWidth: 70, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 35 5 Q 60 40 60 55 A 25 25 0 0 1 10 55 Q 10 40 35 5 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 35 5 Q 65 45 65 60 A 30 30 0 0 1 5 60 Q 5 45 35 5 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-tall', name: 'Tall Teardrop', category: 'teardrop', tags: ['teardrop', 'tall', 'elongated'],
    defaultWidth: 60, defaultHeight: 110,
    thumbnail: () => svgWrap('<path d="M 30 2 Q 52 35 52 55 A 22 22 0 0 1 8 55 Q 8 35 30 2 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 30 2 Q 55 40 55 60 A 25 25 0 0 1 5 60 Q 5 40 30 2 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-wide', name: 'Wide Teardrop', category: 'teardrop', tags: ['teardrop', 'wide', 'fat'],
    defaultWidth: 90, defaultHeight: 90,
    thumbnail: () => svgWrap('<path d="M 45 5 Q 75 35 75 50 A 30 30 0 0 1 15 50 Q 15 35 45 5 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 45 5 Q 80 40 80 55 A 35 35 0 0 1 10 55 Q 10 40 45 5 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-rounded', name: 'Rounded Teardrop', category: 'teardrop', tags: ['teardrop', 'round', 'soft'],
    defaultWidth: 80, defaultHeight: 95,
    thumbnail: () => svgWrap('<path d="M 40 5 Q 68 32 68 50 A 28 28 0 0 1 12 50 Q 12 32 40 5 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 40 5 Q 72 35 72 52 A 30 30 0 0 1 8 52 Q 8 35 40 5 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-narrow', name: 'Narrow Teardrop', category: 'teardrop', tags: ['teardrop', 'narrow', 'slim'],
    defaultWidth: 50, defaultHeight: 105,
    thumbnail: () => svgWrap('<path d="M 25 2 Q 42 30 42 50 A 18 18 0 0 1 8 50 Q 8 30 25 2 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 25 2 Q 45 35 45 55 A 20 20 0 0 1 5 55 Q 5 35 25 2 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-inverted', name: 'Inverted Teardrop', category: 'teardrop', tags: ['teardrop', 'inverted', 'upside', 'pin'],
    defaultWidth: 70, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 35 95 Q 10 60 10 45 A 25 25 0 0 1 60 45 Q 60 60 35 95 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 35 95 Q 5 55 5 40 A 30 30 0 0 1 65 40 Q 65 55 35 95 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-side', name: 'Side Teardrop', category: 'teardrop', tags: ['teardrop', 'side', 'horizontal', 'pointing'],
    defaultWidth: 100, defaultHeight: 70,
    thumbnail: () => svgWrap('<path d="M 5 35 Q 40 10 55 10 A 25 25 0 0 1 55 60 Q 40 60 5 35 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 5 35 Q 42 5 58 5 A 30 30 0 0 1 58 65 Q 42 65 5 35 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'teardrop-outline', name: 'Teardrop Outline', category: 'teardrop', tags: ['teardrop', 'outline', 'stroke'],
    defaultWidth: 70, defaultHeight: 100,
    thumbnail: () => svgWrap('<path d="M 35 5 Q 60 40 60 55 A 25 25 0 0 1 10 55 Q 10 40 35 5 Z" fill="none" stroke="#8b5cf6" stroke-width="3"/>'),
    create: (o) => {
      const p = 'M 35 5 Q 65 45 65 60 A 30 30 0 0 1 5 60 Q 5 45 35 5 Z';
      return new fabric.Path(p, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: o?.strokeWidth ?? 3, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ COGS ═══════════════════════════════════════════════

  ...[
    { teeth: 8, name: '8-Tooth Cog', id: 'cog-8' },
    { teeth: 10, name: '10-Tooth Cog', id: 'cog-10' },
    { teeth: 12, name: '12-Tooth Cog', id: 'cog-12' },
    { teeth: 16, name: '16-Tooth Cog', id: 'cog-16' },
  ].map((cfg): ShapeDefinition => {
    const cogPath = (teeth: number): string => {
      const cx = 50, cy = 50, outerR = 45, innerR = 32;
      const pts: string[] = [];
      for (let i = 0; i < teeth; i++) {
        const a1 = (2 * Math.PI * i) / teeth;
        const a2 = (2 * Math.PI * (i + 0.35)) / teeth;
        const a3 = (2 * Math.PI * (i + 0.5)) / teeth;
        const a4 = (2 * Math.PI * (i + 0.85)) / teeth;
        pts.push(`${cx + innerR * Math.cos(a1)},${cy + innerR * Math.sin(a1)}`);
        pts.push(`${cx + outerR * Math.cos(a2)},${cy + outerR * Math.sin(a2)}`);
        pts.push(`${cx + outerR * Math.cos(a3)},${cy + outerR * Math.sin(a3)}`);
        pts.push(`${cx + innerR * Math.cos(a4)},${cy + innerR * Math.sin(a4)}`);
      }
      return pts.join(' ');
    };
    return {
      id: cfg.id, name: cfg.name, category: 'cog', tags: ['cog', 'gear', 'mechanical', 'settings', `${cfg.teeth}-tooth`],
      defaultWidth: 120, defaultHeight: 120,
      thumbnail: () => svgWrap(`<polygon points="${cogPath(cfg.teeth)}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="#121214"/>`),
      create: (o) => {
        const cogPts: Array<{ x: number; y: number }> = [];
        const cx = 60, cy = 60, outerR = 55, innerR = 40;
        for (let i = 0; i < cfg.teeth; i++) {
          const a1 = (2 * Math.PI * i) / cfg.teeth;
          const a2 = (2 * Math.PI * (i + 0.35)) / cfg.teeth;
          const a3 = (2 * Math.PI * (i + 0.5)) / cfg.teeth;
          const a4 = (2 * Math.PI * (i + 0.85)) / cfg.teeth;
          cogPts.push({ x: cx + innerR * Math.cos(a1), y: cy + innerR * Math.sin(a1) });
          cogPts.push({ x: cx + outerR * Math.cos(a2), y: cy + outerR * Math.sin(a2) });
          cogPts.push({ x: cx + outerR * Math.cos(a3), y: cy + outerR * Math.sin(a3) });
          cogPts.push({ x: cx + innerR * Math.cos(a4), y: cy + innerR * Math.sin(a4) });
        }
        const cog = new fabric.Polygon(cogPts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2 });
        const hole = new fabric.Circle({ radius: 15, fill: '#121214', originX: 'center', originY: 'center', left: 60, top: 60 });
        return new fabric.Group([cog, hole], { left: o?.left ?? 350, top: o?.top ?? 350 });
      },
    };
  }),

  {
    id: 'cog-rounded', name: 'Rounded Cog', category: 'cog', tags: ['cog', 'gear', 'round', 'soft'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="40" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="#121214"/><circle cx="50" cy="8" r="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/><circle cx="85" cy="28" r="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/><circle cx="85" cy="72" r="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/><circle cx="50" cy="92" r="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/><circle cx="15" cy="72" r="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/><circle cx="15" cy="28" r="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/>'),
    create: (o) => {
      const cx = 60, cy = 60;
      const main = new fabric.Circle({ radius: 48, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, originX: 'center', originY: 'center', left: cx, top: cy });
      const hole = new fabric.Circle({ radius: 15, fill: '#121214', originX: 'center', originY: 'center', left: cx, top: cy });
      const teeth: fabric.Object[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (2 * Math.PI * i) / 8;
        teeth.push(new fabric.Circle({ radius: 8, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 1.5, left: cx + 50 * Math.cos(a), top: cy + 50 * Math.sin(a) }));
      }
      return new fabric.Group([main, ...teeth, hole], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cog-solid', name: 'Solid Cog', category: 'cog', tags: ['cog', 'gear', 'solid', 'filled'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 8; i++) {
        const a1 = (2 * Math.PI * i) / 8;
        const a2 = (2 * Math.PI * (i + 0.3)) / 8;
        const a3 = (2 * Math.PI * (i + 0.5)) / 8;
        const a4 = (2 * Math.PI * (i + 0.8)) / 8;
        pts.push(`${50 + 30 * Math.cos(a1)},${50 + 30 * Math.sin(a1)}`);
        pts.push(`${50 + 45 * Math.cos(a2)},${50 + 45 * Math.sin(a2)}`);
        pts.push(`${50 + 45 * Math.cos(a3)},${50 + 45 * Math.sin(a3)}`);
        pts.push(`${50 + 30 * Math.cos(a4)},${50 + 30 * Math.sin(a4)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const a1 = (2 * Math.PI * i) / 8;
        const a2 = (2 * Math.PI * (i + 0.3)) / 8;
        const a3 = (2 * Math.PI * (i + 0.5)) / 8;
        const a4 = (2 * Math.PI * (i + 0.8)) / 8;
        pts.push({ x: 60 + 35 * Math.cos(a1), y: 60 + 35 * Math.sin(a1) });
        pts.push({ x: 60 + 55 * Math.cos(a2), y: 60 + 55 * Math.sin(a2) });
        pts.push({ x: 60 + 55 * Math.cos(a3), y: 60 + 55 * Math.sin(a3) });
        pts.push({ x: 60 + 35 * Math.cos(a4), y: 60 + 35 * Math.sin(a4) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'cog-outline', name: 'Cog Outline', category: 'cog', tags: ['cog', 'gear', 'outline', 'stroke'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 8; i++) {
        const a1 = (2 * Math.PI * i) / 8;
        const a2 = (2 * Math.PI * (i + 0.35)) / 8;
        const a3 = (2 * Math.PI * (i + 0.5)) / 8;
        const a4 = (2 * Math.PI * (i + 0.85)) / 8;
        pts.push(`${50 + 30 * Math.cos(a1)},${50 + 30 * Math.sin(a1)}`);
        pts.push(`${50 + 45 * Math.cos(a2)},${50 + 45 * Math.sin(a2)}`);
        pts.push(`${50 + 45 * Math.cos(a3)},${50 + 45 * Math.sin(a3)}`);
        pts.push(`${50 + 30 * Math.cos(a4)},${50 + 30 * Math.sin(a4)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="none" stroke="#8b5cf6" stroke-width="3"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const a1 = (2 * Math.PI * i) / 8;
        const a2 = (2 * Math.PI * (i + 0.35)) / 8;
        const a3 = (2 * Math.PI * (i + 0.5)) / 8;
        const a4 = (2 * Math.PI * (i + 0.85)) / 8;
        pts.push({ x: 60 + 38 * Math.cos(a1), y: 60 + 38 * Math.sin(a1) });
        pts.push({ x: 60 + 55 * Math.cos(a2), y: 60 + 55 * Math.sin(a2) });
        pts.push({ x: 60 + 55 * Math.cos(a3), y: 60 + 55 * Math.sin(a3) });
        pts.push({ x: 60 + 38 * Math.cos(a4), y: 60 + 38 * Math.sin(a4) });
      }
      return new fabric.Polygon(pts, { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: o?.strokeWidth ?? 3, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },

  // ═══════════════════════ SQUARE STARS ═══════════════════════════════════════

  ...[
    { arms: 4, name: '4-Arm Square Star', id: 'square-star-4' },
    { arms: 6, name: '6-Arm Square Star', id: 'square-star-6' },
    { arms: 8, name: '8-Arm Square Star', id: 'square-star-8' },
  ].map((cfg): ShapeDefinition => {
    const squareStarPath = (arms: number): string => {
      const cx = 50, cy = 50, outerR = 45, innerR = 18;
      const pts: string[] = [];
      for (let i = 0; i < arms * 2; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / arms;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return pts.join(' ');
    };
    return {
      id: cfg.id, name: cfg.name, category: 'square-star', tags: ['square-star', 'asterisk', 'burst', 'sparkle', `${cfg.arms}-arm`],
      defaultWidth: 120, defaultHeight: 120,
      thumbnail: () => svgWrap(`<polygon points="${squareStarPath(cfg.arms)}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`),
      create: (o) => {
        const pts = starPoints(60, 60, 55, 22, cfg.arms);
        return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
      },
    };
  }),

  {
    id: 'square-star-block', name: 'Block Square Star', category: 'square-star', tags: ['square-star', 'block', 'thick', 'bold'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<path d="M 50 5 L 62 38 L 95 38 L 68 58 L 78 92 L 50 72 L 22 92 L 32 58 L 5 38 L 38 38 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const pts = [{ x: 50, y: 0 }, { x: 62, y: 38 }, { x: 100, y: 38 }, { x: 68, y: 62 }, { x: 80, y: 100 }, { x: 50, y: 75 }, { x: 20, y: 100 }, { x: 32, y: 62 }, { x: 0, y: 38 }, { x: 38, y: 38 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'square-star-rounded', name: 'Rounded Square Star', category: 'square-star', tags: ['square-star', 'round', 'soft'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 4;
        const r = i % 2 === 0 ? 45 : 20;
        pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2" stroke-linejoin="round"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 4;
        const r = i % 2 === 0 ? 55 : 24;
        pts.push({ x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, strokeLineJoin: 'round', left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'square-star-sharp', name: 'Sharp Square Star', category: 'square-star', tags: ['square-star', 'sharp', 'pointy'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 4;
        const r = i % 2 === 0 ? 48 : 10;
        pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 4;
        const r = i % 2 === 0 ? 58 : 12;
        pts.push({ x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'square-star-burst', name: 'Square Burst', category: 'square-star', tags: ['square-star', 'burst', 'explosion', 'ray'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => {
      const pts: string[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (2 * Math.PI * i) / 16;
        const r = i % 2 === 0 ? 48 : 30;
        pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#8b5cf6" stroke="#7c3aed" stroke-width="1.5"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 16; i++) {
        const a = (2 * Math.PI * i) / 16;
        const r = i % 2 === 0 ? 58 : 36;
        pts.push({ x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 1.5, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
  {
    id: 'square-star-cross', name: 'Cross Star', category: 'square-star', tags: ['square-star', 'cross', 'plus', 'x'],
    defaultWidth: 120, defaultHeight: 120,
    thumbnail: () => svgWrap('<path d="M 45 5 L 55 5 L 55 45 L 95 45 L 95 55 L 55 55 L 55 95 L 45 95 L 45 55 L 5 55 L 5 45 L 45 45 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => {
      const p = 'M 45 0 L 75 0 L 75 45 L 120 45 L 120 75 L 75 75 L 75 120 L 45 120 L 45 75 L 0 75 L 0 45 L 45 45 Z';
      return new fabric.Path(p, { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: o?.strokeWidth ?? 2, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const SHAPE_MAP = new Map(SHAPE_REGISTRY.map((s) => [s.id, s]));

export const SHAPES_BY_CATEGORY = SHAPE_REGISTRY.reduce<Record<ShapeCategory, ShapeDefinition[]>>((acc, s) => {
  (acc[s.category] ||= []).push(s);
  return acc;
}, {} as any);

export const SHAPE_CATEGORIES: Array<{ id: ShapeCategory; label: string }> = [
  { id: 'basic', label: 'Basic Shapes' },
  { id: 'polygon', label: 'Polygons' },
  { id: 'star', label: 'Stars' },
  { id: 'arrow', label: 'Arrows' },
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'speech-bubble', label: 'Speech Bubbles' },
  { id: 'cloud', label: 'Clouds' },
  { id: 'heart', label: 'Hearts' },
  { id: 'banner', label: 'Banners' },
  { id: 'teardrop', label: 'Teardrops' },
  { id: 'cog', label: 'Cogs' },
  { id: 'square-star', label: 'Square Stars' },
  { id: 'symbol', label: 'Symbols' },
  { id: 'decorative', label: 'Decorative' },
];

export function searchShapes(query: string): ShapeDefinition[] {
  if (!query.trim()) return SHAPE_REGISTRY;
  const q = query.toLowerCase();
  return SHAPE_REGISTRY.filter((s) =>
    s.name.toLowerCase().includes(q) ||
    s.id.includes(q) ||
    s.tags.some((t) => t.includes(q)) ||
    s.category.includes(q)
  );
}
