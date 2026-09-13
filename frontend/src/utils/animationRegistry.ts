/**
 * Centralized Animation Registry — canonical definitions for every animation.
 * Uses Fabric.js programmatic animation (fabric.util.animate) for all motion.
 * No external libraries needed — everything is vector-based and editable.
 */
import { fabric } from 'fabric';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnimationCategory =
  | 'recommendation'
  | 'arrow'
  | 'word'
  | 'food'
  | 'shape'
  | 'emoji'
  | 'business'
  | 'technology'
  | 'social'
  | 'celebration'
  | 'loading'
  | 'decorative';

export type AnimationPreset =
  | 'bounce'
  | 'pulse'
  | 'fade'
  | 'slide'
  | 'rotate'
  | 'scale'
  | 'wobble'
  | 'shake'
  | 'float'
  | 'draw'
  | 'typewriter'
  | 'wave'
  | 'pop'
  | 'glow'
  | 'morph';

export interface AnimationDefinition {
  id: string;
  name: string;
  category: AnimationCategory;
  tags: string[];
  preset: AnimationPreset;
  defaultWidth: number;
  defaultHeight: number;
  defaultFill: string;
  durationMs: number;
  loop: boolean;
  /** Returns SVG markup for sidebar poster/thumbnail */
  thumbnail: () => string;
  /** Creates the Fabric.js object to be animated */
  create: (opts?: AnimationCreateOptions) => fabric.Object;
  /** Applies the animation to the object. Returns a cleanup function. */
  animate: (obj: fabric.Object, canvas: fabric.Canvas) => () => void;
}

export interface AnimationCreateOptions {
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

// ─── Animation Engine ─────────────────────────────────────────────────────────

const activeAnimations = new Map<string, () => void>();
let isGlobalPlaying = false;

export function startGlobalPlayback() { isGlobalPlaying = true; }
export function stopGlobalPlayback() {
  isGlobalPlaying = false;
  activeAnimations.forEach((cleanup) => cleanup());
  activeAnimations.clear();
}
export function isPlaybackActive() { return isGlobalPlaying; }

export function registerAnimation(id: string, cleanup: () => void) {
  activeAnimations.set(id, cleanup);
}

export function unregisterAnimation(id: string) {
  const cleanup = activeAnimations.get(id);
  if (cleanup) { cleanup(); activeAnimations.delete(id); }
}

// ─── Animation Registry ───────────────────────────────────────────────────────

export const ANIMATION_REGISTRY: AnimationDefinition[] = [

  // ═══════════════════════ ARROW ANIMATIONS ═══════════════════════════════════

  {
    id: 'arrow-draw-right', name: 'Drawing Right Arrow', category: 'arrow', tags: ['arrow', 'right', 'draw', 'stroke'],
    preset: 'draw', defaultWidth: 160, defaultHeight: 60, defaultFill: '#8b5cf6', durationMs: 1200, loop: false,
    thumbnail: () => svgWrap('<path d="M 10 30 L 130 30 L 110 15 M 130 30 L 110 45" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
    create: (o) => {
      const path = new fabric.Path('M 10 30 L 130 30 L 110 15 M 130 30 L 110 45', {
        fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 4, strokeLineCap: 'round', strokeLineJoin: 'round',
        left: o?.left ?? 350, top: o?.top ?? 350,
      });
      return path;
    },
    animate: (obj) => {
      let frame: number;
      const totalLen = 200;
      let progressed = 0;
      const tick = () => {
        progressed += 16;
        const t = Math.min(progressed / 1200, 1);
        (obj as any).set({ strokeDashArray: [totalLen * t, totalLen] });
        obj.canvas?.renderAll();
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    },
  },
  {
    id: 'arrow-bounce', name: 'Bouncing Arrow', category: 'arrow', tags: ['arrow', 'bounce', 'down', 'cta'],
    preset: 'bounce', defaultWidth: 60, defaultHeight: 80, defaultFill: '#8b5cf6', durationMs: 800, loop: true,
    thumbnail: () => svgWrap('<polygon points="30,5 55,35 40,35 40,70 20,70 20,35 5,35" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 30, y: 0 }, { x: 55, y: 30 }, { x: 40, y: 30 }, { x: 40, y: 65 }, { x: 20, y: 65 }, { x: 20, y: 30 }, { x: 5, y: 30 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const baseY = obj.top ?? 350;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 800) / 800;
        const bounce = Math.sin(t * Math.PI) * 15;
        obj.set('top', baseY + bounce);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('top', baseY); };
    },
  },
  {
    id: 'arrow-pulse', name: 'Pulsing Arrow', category: 'arrow', tags: ['arrow', 'pulse', 'glow', 'attention'],
    preset: 'pulse', defaultWidth: 140, defaultHeight: 60, defaultFill: '#8b5cf6', durationMs: 1000, loop: true,
    thumbnail: () => svgWrap('<polygon points="0,15 90,15 90,0 120,25 90,50 90,35 0,35" fill="#8b5cf6"/>'),
    create: (o) => {
      const pts = [{ x: 0, y: 15 }, { x: 90, y: 15 }, { x: 90, y: 0 }, { x: 120, y: 25 }, { x: 90, y: 50 }, { x: 90, y: 35 }, { x: 0, y: 35 }];
      return new fabric.Polygon(pts, { fill: o?.fill || DEFAULT_FILL, left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1000) / 1000;
        const scale = 1 + 0.1 * Math.sin(t * Math.PI * 2);
        obj.set({ scaleX: scale, scaleY: scale });
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set({ scaleX: 1, scaleY: 1 }); };
    },
  },
  {
    id: 'arrow-curved', name: 'Curved Arrow Animation', category: 'arrow', tags: ['arrow', 'curved', 'swoop', 'flow'],
    preset: 'draw', defaultWidth: 120, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 1500, loop: false,
    thumbnail: () => svgWrap('<path d="M 10 80 Q 60 0 110 40" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"/><polygon points="110,40 95,30 100,48" fill="#8b5cf6"/>'),
    create: (o) => {
      const path = new fabric.Path('M 10 80 Q 60 0 110 40', {
        fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 4, strokeLineCap: 'round',
        left: o?.left ?? 350, top: o?.top ?? 350,
      });
      return path;
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 1500, 1);
        (obj as any).set({ strokeDashArray: [300 * t, 300] });
        obj.canvas?.renderAll();
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    },
  },
  {
    id: 'arrow-rotate', name: 'Rotating Arrow', category: 'arrow', tags: ['arrow', 'rotate', 'spin', 'circular'],
    preset: 'rotate', defaultWidth: 80, defaultHeight: 80, defaultFill: '#8b5cf6', durationMs: 2000, loop: true,
    thumbnail: () => svgWrap('<path d="M 50 15 A 35 35 0 1 1 15 50" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"/><polygon points="15,50 5,40 10,55" fill="#8b5cf6"/>'),
    create: (o) => {
      const path = new fabric.Path('M 50 15 A 35 35 0 1 1 15 50', {
        fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 4, strokeLineCap: 'round',
        left: o?.left ?? 350, top: o?.top ?? 350,
      });
      return path;
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 2000) / 2000;
        obj.set('angle', t * 360);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('angle', 0); };
    },
  },

  // ═══════════════════════ WORD ANIMATIONS ════════════════════════════════════

  ...[
    { text: 'Hello', id: 'word-hello', tags: ['hello', 'greeting', 'welcome'] },
    { text: 'Sale', id: 'word-sale', tags: ['sale', 'discount', 'offer'] },
    { text: 'New', id: 'word-new', tags: ['new', 'fresh', 'launch'] },
    { text: 'Wow', id: 'word-wow', tags: ['wow', 'amazing', 'surprise'] },
    { text: 'Thank You', id: 'word-thankyou', tags: ['thank', 'gratitude', 'thanks'] },
    { text: 'Congrats', id: 'word-congrats', tags: ['congratulations', 'celebration', 'winner'] },
    { text: 'Subscribe', id: 'word-subscribe', tags: ['subscribe', 'follow', 'join'] },
    { text: 'Limited', id: 'word-limited', tags: ['limited', 'exclusive', 'rare'] },
    { text: 'Coming Soon', id: 'word-comingsoon', tags: ['coming', 'soon', 'launch', 'wait'] },
    { text: 'Happy Birthday', id: 'word-birthday', tags: ['birthday', 'celebration', 'party'] },
  ].map((w): AnimationDefinition => ({
    id: w.id, name: `${w.text} Animation`, category: 'word', tags: ['word', 'text', 'animated-text', ...w.tags],
    preset: 'typewriter', defaultWidth: 160, defaultHeight: 60, defaultFill: '#8b5cf6', durationMs: 1000, loop: false,
    thumbnail: () => svgWrap(`<text x="50" y="55" text-anchor="middle" font-size="24" font-weight="bold" fill="#8b5cf6" font-family="sans-serif">${w.text}</text>`, 100, 70),
    create: (o) => new fabric.Text(w.text, {
      fontSize: 32, fontWeight: 'bold', fill: o?.fill || DEFAULT_FILL, fontFamily: 'sans-serif',
      left: o?.left ?? 350, top: o?.top ?? 350,
    }),
    animate: (obj) => {
      const textObj = obj as fabric.Text;
      const fullText = textObj.text || w.text;
      textObj.set('text', '');
      let frame: number;
      let start: number | null = null;
      const charsPerMs = fullText.length / 1000;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const elapsed = ts - start;
        const charCount = Math.min(Math.floor(elapsed * charsPerMs), fullText.length);
        textObj.set('text', fullText.substring(0, charCount));
        textObj.canvas?.renderAll();
        if (charCount < fullText.length) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); textObj.set('text', fullText); };
    },
  })),

  // ═══════════════════════ FOOD ANIMATIONS ════════════════════════════════════

  {
    id: 'food-coffee-steam', name: 'Coffee Steam', category: 'food', tags: ['coffee', 'steam', 'hot', 'cafe', 'drink'],
    preset: 'float', defaultWidth: 80, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 1500, loop: true,
    thumbnail: () => svgWrap('<rect x="15" y="45" width="50" height="45" rx="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><path d="M 30 45 Q 30 30 35 25" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/><path d="M 45 45 Q 45 28 50 20" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/>'),
    create: (o) => {
      const cup = new fabric.Rect({ width: 50, height: 45, rx: 5, ry: 5, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: 15, top: 45 });
      const steam1 = new fabric.Path('M 30 45 Q 30 30 35 25', { fill: 'transparent', stroke: '#a78bfa', strokeWidth: 2, strokeLineCap: 'round' });
      const steam2 = new fabric.Path('M 45 45 Q 45 28 50 20', { fill: 'transparent', stroke: '#a78bfa', strokeWidth: 2, strokeLineCap: 'round' });
      return new fabric.Group([cup, steam1, steam2], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const baseY = obj.top ?? 350;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1500) / 1500;
        const offset = Math.sin(t * Math.PI * 2) * 5;
        obj.set('top', baseY + offset);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('top', baseY); };
    },
  },
  {
    id: 'food-popcorn', name: 'Popcorn Pop', category: 'food', tags: ['popcorn', 'pop', 'movie', 'snack'],
    preset: 'bounce', defaultWidth: 80, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 600, loop: true,
    thumbnail: () => svgWrap('<path d="M 20 40 L 15 90 L 65 90 L 60 40 Z" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/><circle cx="35" cy="30" r="10" fill="#fbbf24"/><circle cx="50" cy="25" r="8" fill="#fbbf24"/><circle cx="42" cy="18" r="9" fill="#fbbf24"/>'),
    create: (o) => {
      const bag = new fabric.Path('M 20 40 L 15 90 L 65 90 L 60 40 Z', { fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 });
      const pop1 = new fabric.Circle({ radius: 10, fill: '#fbbf24', left: 25, top: 20 });
      const pop2 = new fabric.Circle({ radius: 8, fill: '#fcd34d', left: 42, top: 15 });
      const pop3 = new fabric.Circle({ radius: 9, fill: '#fbbf24', left: 33, top: 8 });
      return new fabric.Group([bag, pop1, pop2, pop3], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const baseY = obj.top ?? 350;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 600) / 600;
        const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * 12;
        obj.set('top', baseY - bounce);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('top', baseY); };
    },
  },
  {
    id: 'food-pizza', name: 'Pizza Slice', category: 'food', tags: ['pizza', 'food', 'italian', 'restaurant'],
    preset: 'wobble', defaultWidth: 90, defaultHeight: 90, defaultFill: '#8b5cf6', durationMs: 1200, loop: true,
    thumbnail: () => svgWrap('<path d="M 50 10 L 85 80 A 45 45 0 0 1 15 80 Z" fill="#fbbf24" stroke="#7c3aed" stroke-width="2"/><circle cx="40" cy="45" r="5" fill="#ef4444"/><circle cx="55" cy="55" r="4" fill="#ef4444"/><circle cx="45" cy="65" r="5" fill="#ef4444"/>'),
    create: (o) => {
      const slice = new fabric.Path('M 50 10 L 85 80 A 45 45 0 0 1 15 80 Z', { fill: '#fbbf24', stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2 });
      const t1 = new fabric.Circle({ radius: 5, fill: '#ef4444', left: 35, top: 40 });
      const t2 = new fabric.Circle({ radius: 4, fill: '#ef4444', left: 50, top: 50 });
      const t3 = new fabric.Circle({ radius: 5, fill: '#ef4444', left: 40, top: 60 });
      return new fabric.Group([slice, t1, t2, t3], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1200) / 1200;
        obj.set('angle', Math.sin(t * Math.PI * 2) * 8);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('angle', 0); };
    },
  },

  // ═══════════════════════ SHAPE ANIMATIONS ═══════════════════════════════════

  {
    id: 'shape-circle-pulse', name: 'Circle Pulse', category: 'shape', tags: ['circle', 'pulse', 'ring', 'loading'],
    preset: 'pulse', defaultWidth: 100, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 1000, loop: true,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="35" fill="none" stroke="#8b5cf6" stroke-width="4" opacity="0.8"/><circle cx="50" cy="50" r="20" fill="#8b5cf6" opacity="0.4"/>'),
    create: (o) => {
      const ring = new fabric.Circle({ radius: 40, fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 4, originX: 'center', originY: 'center', left: 50, top: 50 });
      const inner = new fabric.Circle({ radius: 22, fill: o?.fill || DEFAULT_FILL, opacity: 0.4, originX: 'center', originY: 'center', left: 50, top: 50 });
      return new fabric.Group([ring, inner], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1000) / 1000;
        const scale = 0.8 + 0.4 * Math.sin(t * Math.PI * 2);
        const opacity = 0.3 + 0.7 * (1 - t);
        obj.set({ scaleX: scale, scaleY: scale, opacity });
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set({ scaleX: 1, scaleY: 1, opacity: 1 }); };
    },
  },
  {
    id: 'shape-rotate-square', name: 'Rotating Square', category: 'shape', tags: ['square', 'rotate', 'spin', 'loading'],
    preset: 'rotate', defaultWidth: 80, defaultHeight: 80, defaultFill: '#8b5cf6', durationMs: 2000, loop: true,
    thumbnail: () => svgWrap('<rect x="20" y="20" width="60" height="60" rx="8" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>'),
    create: (o) => new fabric.Rect({ width: 60, height: 60, rx: 8, ry: 8, fill: o?.fill || DEFAULT_FILL, stroke: o?.stroke || DEFAULT_STROKE, strokeWidth: 2, left: o?.left ?? 350, top: o?.top ?? 350 }),
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 2000) / 2000;
        obj.set('angle', t * 360);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('angle', 0); };
    },
  },
  {
    id: 'shape-blob-morph', name: 'Blob Morph', category: 'shape', tags: ['blob', 'morph', 'organic', 'fluid'],
    preset: 'morph', defaultWidth: 120, defaultHeight: 120, defaultFill: '#8b5cf6', durationMs: 3000, loop: true,
    thumbnail: () => svgWrap('<ellipse cx="50" cy="50" rx="40" ry="35" fill="#8b5cf6" opacity="0.8"/>'),
    create: (o) => new fabric.Ellipse({ rx: 50, ry: 45, fill: o?.fill || DEFAULT_FILL, originX: 'center', originY: 'center', left: 60, top: 60 }),
    animate: (obj) => {
      const ellipse = obj as fabric.Ellipse;
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 3000) / 3000;
        ellipse.set({ rx: 45 + 10 * Math.sin(t * Math.PI * 2), ry: 40 + 12 * Math.cos(t * Math.PI * 2) });
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); ellipse.set({ rx: 50, ry: 45 }); };
    },
  },
  {
    id: 'shape-expanding-ring', name: 'Expanding Ring', category: 'shape', tags: ['ring', 'expand', 'ripple', 'radar'],
    preset: 'scale', defaultWidth: 100, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 1500, loop: true,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" stroke-width="3" opacity="0.5"/>'),
    create: (o) => new fabric.Circle({ radius: 45, fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 3, originX: 'center', originY: 'center', left: 50, top: 50 }),
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1500) / 1500;
        const scale = 0.3 + t * 0.7;
        const opacity = 1 - t;
        obj.set({ scaleX: scale, scaleY: scale, opacity });
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set({ scaleX: 1, scaleY: 1, opacity: 1 }); };
    },
  },
  {
    id: 'shape-loading-bar', name: 'Loading Bar', category: 'shape', tags: ['loading', 'bar', 'progress', 'indicator'],
    preset: 'slide', defaultWidth: 160, defaultHeight: 20, defaultFill: '#8b5cf6', durationMs: 1200, loop: true,
    thumbnail: () => svgWrap('<rect x="5" y="35" width="90" height="12" rx="6" fill="#27272a" stroke="#3f3f46" stroke-width="1"/><rect x="5" y="35" width="40" height="12" rx="6" fill="#8b5cf6"/>'),
    create: (o) => {
      const bg = new fabric.Rect({ width: 160, height: 16, rx: 8, ry: 8, fill: '#27272a', stroke: '#3f3f46', strokeWidth: 1, left: 0, top: 2 });
      const bar = new fabric.Rect({ width: 60, height: 16, rx: 8, ry: 8, fill: o?.fill || DEFAULT_FILL, left: 0, top: 2 });
      return new fabric.Group([bg, bar], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        obj.set('left', (obj.left ?? 350));
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    },
  },

  // ═══════════════════════ EMOJI ANIMATIONS ═══════════════════════════════════

  ...[
    { emoji: '👋', name: 'Waving Hand', id: 'emoji-wave', tags: ['wave', 'hello', 'hi', 'hand'], preset: 'wobble' as AnimationPreset },
    { emoji: '👍', name: 'Thumbs Up', id: 'emoji-thumbsup', tags: ['thumbs', 'like', 'approve', 'good'], preset: 'bounce' as AnimationPreset },
    { emoji: '❤️', name: 'Heart', id: 'emoji-heart', tags: ['heart', 'love', 'like'], preset: 'pulse' as AnimationPreset },
    { emoji: '🎉', name: 'Party Popper', id: 'emoji-party', tags: ['party', 'celebration', 'congrats'], preset: 'pop' as AnimationPreset },
    { emoji: '🔥', name: 'Fire', id: 'emoji-fire', tags: ['fire', 'hot', 'trending', 'lit'], preset: 'float' as AnimationPreset },
    { emoji: '✨', name: 'Sparkle', id: 'emoji-sparkle', tags: ['sparkle', 'shine', 'glitter', 'magic'], preset: 'pulse' as AnimationPreset },
    { emoji: '😢', name: 'Crying Face', id: 'emoji-cry', tags: ['cry', 'sad', 'tears'], preset: 'float' as AnimationPreset },
    { emoji: '😮', name: 'Surprised Face', id: 'emoji-surprise', tags: ['surprise', 'shock', 'wow'], preset: 'pop' as AnimationPreset },
    { emoji: '👏', name: 'Clapping', id: 'emoji-clap', tags: ['clap', 'applause', 'bravo'], preset: 'wobble' as AnimationPreset },
    { emoji: '💯', name: 'Hundred', id: 'emoji-hundred', tags: ['hundred', 'perfect', 'score'], preset: 'bounce' as AnimationPreset },
  ].map((e): AnimationDefinition => ({
    id: e.id, name: e.name, category: 'emoji', tags: ['emoji', 'reaction', ...e.tags],
    preset: e.preset, defaultWidth: 80, defaultHeight: 80, defaultFill: '#8b5cf6', durationMs: 800, loop: true,
    thumbnail: () => svgWrap(`<text x="50" y="60" text-anchor="middle" font-size="40">${e.emoji}</text>`),
    create: (o) => new fabric.Text(e.emoji, {
      fontSize: 48, left: o?.left ?? 350, top: o?.top ?? 350,
    }),
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const baseY = obj.top ?? 350;
      const baseAngle = obj.angle ?? 0;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 800) / 800;
        const sinVal = Math.sin(t * Math.PI * 2);
        if (e.preset === 'bounce') {
          obj.set('top', baseY - Math.abs(sinVal) * 10);
        } else if (e.preset === 'wobble') {
          obj.set('angle', baseAngle + sinVal * 15);
        } else if (e.preset === 'pulse') {
          const s = 1 + 0.15 * sinVal;
          obj.set({ scaleX: s, scaleY: s });
        } else if (e.preset === 'pop') {
          const s = 1 + 0.2 * Math.abs(sinVal);
          obj.set({ scaleX: s, scaleY: s });
        } else if (e.preset === 'float') {
          obj.set('top', baseY + sinVal * 5);
        }
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set({ top: baseY, angle: baseAngle, scaleX: 1, scaleY: 1 }); };
    },
  })),

  // ═══════════════════════ CELEBRATION ANIMATIONS ═════════════════════════════

  {
    id: 'celeb-confetti', name: 'Confetti Burst', category: 'celebration', tags: ['confetti', 'party', 'celebration', 'burst'],
    preset: 'pop', defaultWidth: 120, defaultHeight: 120, defaultFill: '#8b5cf6', durationMs: 1500, loop: false,
    thumbnail: () => svgWrap('<rect x="15" y="10" width="8" height="8" rx="2" fill="#ef4444" transform="rotate(30 19 14)"/><rect x="40" y="5" width="6" height="6" rx="1" fill="#3b82f6" transform="rotate(-20 43 8)"/><rect x="65" y="15" width="7" height="7" rx="2" fill="#22c55e" transform="rotate(45 68 18)"/><rect x="30" y="30" width="5" height="5" rx="1" fill="#eab308"/><rect x="55" y="25" width="8" height="4" rx="1" fill="#f97316" transform="rotate(-30 59 27)"/><rect x="20" y="45" width="6" height="6" rx="3" fill="#ec4899"/><rect x="50" y="40" width="7" height="7" rx="1" fill="#8b5cf6"/>'),
    create: (o) => {
      const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#8b5cf6'];
      const rects: fabric.Object[] = [];
      for (let i = 0; i < 12; i++) {
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 8;
        rects.push(new fabric.Rect({
          width: size, height: size, rx: size / 3, ry: size / 3, fill: color,
          left: 50 + (Math.random() - 0.5) * 80, top: 50 + (Math.random() - 0.5) * 40,
          angle: Math.random() * 360,
        }));
      }
      return new fabric.Group(rects, { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const group = obj as fabric.Group;
      const objects = group.getObjects();
      const originalPositions = objects.map((o: fabric.Object) => ({ left: o.left ?? 0, top: o.top ?? 0, angle: o.angle ?? 0, scaleX: o.scaleX ?? 1, scaleY: o.scaleY ?? 1 }));
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 1500, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        objects.forEach((o: fabric.Object, i: number) => {
          const orig = originalPositions[i];
          const angle = (i % 2 === 0 ? 1 : -1) * 360 * ease;
          const spreadY = -80 * ease + 120 * ease * ease;
          const spreadX = (i - objects.length / 2) * 8 * ease;
          o.set({ left: orig.left + spreadX, top: orig.top + spreadY, angle: orig.angle + angle, opacity: 1 - t * 0.5 });
        });
        obj.canvas?.renderAll();
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); objects.forEach((o: fabric.Object, i: number) => { const p = originalPositions[i]; o.set(p); }); };
    },
  },
  {
    id: 'celeb-sparkles', name: 'Sparkle Burst', category: 'celebration', tags: ['sparkle', 'burst', 'magic', 'shine'],
    preset: 'pulse', defaultWidth: 120, defaultHeight: 120, defaultFill: '#8b5cf6', durationMs: 1000, loop: true,
    thumbnail: () => {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = (2 * Math.PI * i) / 8;
        const r = i % 2 === 0 ? 42 : 18;
        pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
      }
      return svgWrap(`<polygon points="${pts.join(' ')}" fill="#eab308"/>`);
    },
    create: (o) => {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 4;
        const r = i % 2 === 0 ? 50 : 20;
        pts.push({ x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) });
      }
      return new fabric.Polygon(pts, { fill: o?.fill || '#eab308', left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1000) / 1000;
        const scale = 0.7 + 0.5 * Math.sin(t * Math.PI * 2);
        const angle = t * 45;
        obj.set({ scaleX: scale, scaleY: scale, angle });
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set({ scaleX: 1, scaleY: 1, angle: 0 }); };
    },
  },

  // ═══════════════════════ LOADING ANIMATIONS ═════════════════════════════════

  {
    id: 'loading-spinner', name: 'Spinner', category: 'loading', tags: ['loading', 'spinner', 'wait', 'progress'],
    preset: 'rotate', defaultWidth: 80, defaultHeight: 80, defaultFill: '#8b5cf6', durationMs: 1000, loop: true,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="35" fill="none" stroke="#27272a" stroke-width="6"/><path d="M 50 15 A 35 35 0 0 1 85 50" fill="none" stroke="#8b5cf6" stroke-width="6" stroke-linecap="round"/>'),
    create: (o) => {
      const bg = new fabric.Circle({ radius: 40, fill: 'transparent', stroke: '#27272a', strokeWidth: 6, originX: 'center', originY: 'center', left: 40, top: 40 });
      const arc = new fabric.Path('M 40 0 A 40 40 0 0 1 80 40', { fill: 'transparent', stroke: o?.fill || DEFAULT_FILL, strokeWidth: 6, strokeLineCap: 'round', originX: 'center', originY: 'center', left: 40, top: 0 });
      return new fabric.Group([bg, arc], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 1000) / 1000;
        obj.set('angle', t * 360);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('angle', 0); };
    },
  },
  {
    id: 'loading-dots', name: 'Bouncing Dots', category: 'loading', tags: ['loading', 'dots', 'bounce', 'dots'],
    preset: 'bounce', defaultWidth: 100, defaultHeight: 40, defaultFill: '#8b5cf6', durationMs: 600, loop: true,
    thumbnail: () => svgWrap('<circle cx="20" cy="50" r="8" fill="#8b5cf6"/><circle cx="50" cy="50" r="8" fill="#8b5cf6" opacity="0.6"/><circle cx="80" cy="50" r="8" fill="#8b5cf6" opacity="0.3"/>'),
    create: (o) => {
      const d1 = new fabric.Circle({ radius: 10, fill: o?.fill || DEFAULT_FILL, left: 10, top: 15 });
      const d2 = new fabric.Circle({ radius: 10, fill: o?.fill || DEFAULT_FILL, left: 40, top: 15, opacity: 0.7 });
      const d3 = new fabric.Circle({ radius: 10, fill: o?.fill || DEFAULT_FILL, left: 70, top: 15, opacity: 0.4 });
      return new fabric.Group([d1, d2, d3], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const group = obj as fabric.Group;
      const dots = group.getObjects();
      const originalYs = dots.map((d: fabric.Object) => d.top ?? 0);
      const tick = (ts: number) => {
        if (!start) start = ts;
        dots.forEach((d: fabric.Object, i: number) => {
          const delay = i * 0.2;
          const t = ((ts - (start as number)) % 600) / 600;
          const bounce = Math.sin((t + delay) * Math.PI * 2) * 10;
          d.set('top', originalYs[i] + bounce);
        });
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); dots.forEach((d: fabric.Object, i: number) => d.set('top', originalYs[i])); };
    },
  },

  // ═══════════════════════ BUSINESS ANIMATIONS ════════════════════════════════

  {
    id: 'biz-chart-growth', name: 'Growing Chart', category: 'business', tags: ['chart', 'growth', 'business', 'analytics'],
    preset: 'scale', defaultWidth: 140, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 1500, loop: false,
    thumbnail: () => svgWrap('<rect x="10" y="55" width="18" height="35" rx="3" fill="#8b5cf6" opacity="0.5"/><rect x="35" y="35" width="18" height="55" rx="3" fill="#8b5cf6" opacity="0.7"/><rect x="60" y="20" width="18" height="70" rx="3" fill="#8b5cf6" opacity="0.85"/><rect x="85" y="10" width="18" height="80" rx="3" fill="#8b5cf6"/>'),
    create: (o) => {
      const b1 = new fabric.Rect({ width: 18, height: 35, rx: 3, ry: 3, fill: o?.fill || DEFAULT_FILL, opacity: 0.5, left: 10, top: 55 });
      const b2 = new fabric.Rect({ width: 18, height: 55, rx: 3, ry: 3, fill: o?.fill || DEFAULT_FILL, opacity: 0.7, left: 35, top: 35 });
      const b3 = new fabric.Rect({ width: 18, height: 70, rx: 3, ry: 3, fill: o?.fill || DEFAULT_FILL, opacity: 0.85, left: 60, top: 20 });
      const b4 = new fabric.Rect({ width: 18, height: 80, rx: 3, ry: 3, fill: o?.fill || DEFAULT_FILL, left: 85, top: 10 });
      return new fabric.Group([b1, b2, b3, b4], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const group = obj as fabric.Group;
      const bars = group.getObjects();
      const origTops = bars.map((b: fabric.Object) => b.top ?? 0);
      const origHeights = bars.map((b: fabric.Object) => (b as fabric.Rect).height ?? 0);
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 1500, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        bars.forEach((b: fabric.Object, i: number) => {
          const rect = b as fabric.Rect;
          const newH = origHeights[i] * ease;
          rect.set({ height: newH, top: origTops[i] + origHeights[i] - newH });
        });
        obj.canvas?.renderAll();
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); bars.forEach((b: fabric.Object, i: number) => { b.set('top', origTops[i]); (b as fabric.Rect).set('height', origHeights[i]); }); };
    },
  },

  // ═══════════════════════ TECHNOLOGY ANIMATIONS ══════════════════════════════

  {
    id: 'tech-code-typing', name: 'Code Typing', category: 'technology', tags: ['code', 'typing', 'programming', 'development'],
    preset: 'typewriter', defaultWidth: 180, defaultHeight: 100, defaultFill: '#8b5cf6', durationMs: 2000, loop: false,
    thumbnail: () => svgWrap('<rect x="5" y="5" width="90" height="70" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1.5"/><text x="12" y="25" font-size="10" fill="#c9d1d9" font-family="monospace">const app = </text><text x="12" y="40" font-size="10" fill="#c9d1d9" font-family="monospace">  createEditor();</text><text x="12" y="55" font-size="10" fill="#c9d1d9" font-family="monospace">app.start();</text>'),
    create: (o) => {
      const bg = new fabric.Rect({ width: 180, height: 100, rx: 8, ry: 8, fill: '#0d1117', stroke: '#30363d', strokeWidth: 1.5, left: 0, top: 0 });
      const code = new fabric.Text('const app = createEditor();\napp.start();', {
        fontSize: 12, fill: '#c9d1d9', fontFamily: 'monospace', lineHeight: 1.5, left: 12, top: 12,
      });
      return new fabric.Group([bg, code], { left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      const group = obj as fabric.Group;
      const codeObj = group.getObjects()[1] as fabric.Text;
      const fullText = codeObj.text || '';
      codeObj.set('text', '');
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 2000, 1);
        const charCount = Math.floor(t * fullText.length);
        codeObj.set('text', fullText.substring(0, charCount));
        obj.canvas?.renderAll();
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); codeObj.set('text', fullText); };
    },
  },

  // ═══════════════════════ SOCIAL MEDIA ANIMATIONS ════════════════════════════

  {
    id: 'social-like', name: 'Like Animation', category: 'social', tags: ['like', 'heart', 'social', 'love'],
    preset: 'pop', defaultWidth: 60, defaultHeight: 60, defaultFill: '#ef4444', durationMs: 800, loop: false,
    thumbnail: () => svgWrap('<path d="M 30 52 C 15 40 0 30 0 18 C 0 8 8 0 16 0 C 22 0 27 3 30 7 C 33 3 38 0 44 0 C 52 0 60 8 60 18 C 60 30 45 40 30 52 Z" fill="#ef4444"/>'),
    create: (o) => {
      const p = 'M 30 52 C 15 40 0 30 0 18 C 0 8 8 0 16 0 C 22 0 27 3 30 7 C 33 3 38 0 44 0 C 52 0 60 8 60 18 C 60 30 45 40 30 52 Z';
      return new fabric.Path(p, { fill: o?.fill || '#ef4444', left: o?.left ?? 350, top: o?.top ?? 350 });
    },
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / 800, 1);
        const scale = t < 0.3 ? t / 0.3 * 1.3 : 1.3 - (t - 0.3) / 0.7 * 0.3;
        obj.set({ scaleX: scale, scaleY: scale });
        obj.canvas?.renderAll();
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set({ scaleX: 1, scaleY: 1 }); };
    },
  },

  // ═══════════════════════ DECORATIVE ANIMATIONS ══════════════════════════════

  {
    id: 'deco-float', name: 'Floating Element', category: 'decorative', tags: ['float', 'hover', 'gentle', 'ambient'],
    preset: 'float', defaultWidth: 60, defaultHeight: 60, defaultFill: '#8b5cf6', durationMs: 2000, loop: true,
    thumbnail: () => svgWrap('<circle cx="50" cy="50" r="25" fill="#8b5cf6" opacity="0.6"/>'),
    create: (o) => new fabric.Circle({ radius: 25, fill: o?.fill || DEFAULT_FILL, opacity: 0.6, originX: 'center', originY: 'center', left: 30, top: 30 }),
    animate: (obj) => {
      let frame: number;
      let start: number | null = null;
      const baseY = obj.top ?? 350;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const t = ((ts - start) % 2000) / 2000;
        obj.set('top', baseY + Math.sin(t * Math.PI * 2) * 8);
        obj.canvas?.renderAll();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(frame); obj.set('top', baseY); };
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const ANIMATION_MAP = new Map(ANIMATION_REGISTRY.map((a) => [a.id, a]));

export const ANIMATIONS_BY_CATEGORY = ANIMATION_REGISTRY.reduce<Record<AnimationCategory, AnimationDefinition[]>>((acc, a) => {
  (acc[a.category] ||= []).push(a);
  return acc;
}, {} as any);

export const ANIMATION_CATEGORIES: Array<{ id: AnimationCategory; label: string }> = [
  { id: 'recommendation', label: 'Magic Recommendations' },
  { id: 'arrow', label: 'Arrow Animations' },
  { id: 'word', label: 'Word Animations' },
  { id: 'food', label: 'Food Animations' },
  { id: 'shape', label: 'Shape Animations' },
  { id: 'emoji', label: 'Emoji Animations' },
  { id: 'business', label: 'Business Animations' },
  { id: 'technology', label: 'Technology Animations' },
  { id: 'social', label: 'Social Media Animations' },
  { id: 'celebration', label: 'Celebration Animations' },
  { id: 'loading', label: 'Loading Animations' },
  { id: 'decorative', label: 'Decorative Motion' },
];

export function searchAnimations(query: string): AnimationDefinition[] {
  if (!query.trim()) return ANIMATION_REGISTRY;
  const q = query.toLowerCase();
  return ANIMATION_REGISTRY.filter((a) =>
    a.name.toLowerCase().includes(q) ||
    a.id.includes(q) ||
    a.tags.some((t) => t.includes(q)) ||
    a.category.includes(q)
  );
}

// ─── Recommendation engine ────────────────────────────────────────────────────

export function getRecommendations(): AnimationDefinition[] {
  // Mix of popular animations from different categories
  const popular = [
    'emoji-wave', 'celeb-confetti', 'arrow-bounce', 'shape-circle-pulse',
    'word-hello', 'food-coffee-steam', 'deco-float', 'loading-spinner',
    'emoji-heart', 'celeb-sparkles', 'arrow-draw-right', 'shape-blob-morph',
  ];
  return popular.map((id) => ANIMATION_MAP.get(id)).filter(Boolean) as AnimationDefinition[];
}
