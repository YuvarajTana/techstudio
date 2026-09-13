import { fabric } from 'fabric';
import type { FabricObjectAnimation, FabricObjectAnimationType } from '../types/timeline';
import { ANIMATION_REGISTRY } from './animationRegistry';
import { evaluateObjectAnimationAtTime } from './animationEvaluator';
import { useEditorStore } from '../store/useEditorStore';

export type EditorAnimationCategory =
  | 'recent'
  | 'favorites'
  | 'trending'
  | 'entrance'
  | 'technical'
  | 'text'
  | 'motion'
  | 'emphasis'
  | 'exit'
  | 'animated-elements'
  | 'confetti'
  | 'social'
  | 'charts'
  | 'counters'
  | 'page'
  | 'transitions'
  | 'existing-basic';

export interface EditorAnimationLibraryItem {
  id: string;
  name: string;
  category: EditorAnimationCategory;
  type: FabricObjectAnimationType;
  durationMs: number;
  delayMs?: number;
  easing?: FabricObjectAnimation['easing'];
  direction?: string;
  distance?: number;
  loop?: boolean;
  tags: string[];
  description: string;
  preview: string;
  mode?: 'apply' | 'insert';
  params?: Record<string, unknown>;
}

export const EDITOR_ANIMATION_CATEGORIES: Array<{ id: EditorAnimationCategory; label: string }> = [
  { id: 'existing-basic', label: 'Existing / Basic' },
  { id: 'entrance', label: 'Entrance Animations' },
  { id: 'text', label: 'Text Animations' },
  { id: 'motion', label: 'Moving Animations' },
  { id: 'technical', label: 'Technical Animations' },
  { id: 'confetti', label: 'Confetti Animations' },
  { id: 'social', label: 'Social Media Animations' },
  { id: 'animated-elements', label: 'Animated Elements' },
  { id: 'emphasis', label: 'Emphasis Animations' },
  { id: 'exit', label: 'Exit Animations' },
  { id: 'charts', label: 'Animated Charts' },
  { id: 'counters', label: 'Number Counters' },
  { id: 'page', label: 'Page Animations' },
  { id: 'transitions', label: 'Scene Transitions' },
  { id: 'trending', label: 'Trending' },
];

const legacyPresetToAnimationType = (preset: string): FabricObjectAnimationType => {
  const normalized = preset.trim().toLowerCase();
  if (normalized === 'scale') return 'scale';
  if (normalized === 'slide') return 'slide';
  if (normalized === 'morph') return 'morph';
  return normalized as FabricObjectAnimationType;
};

export const EXISTING_BASIC_ANIMATION_LIBRARY: EditorAnimationLibraryItem[] = ANIMATION_REGISTRY.map((definition) => ({
  id: definition.id,
  name: definition.name,
  category: 'existing-basic',
  type: legacyPresetToAnimationType(String(definition.preset)),
  durationMs: definition.durationMs,
  easing: 'ease-in-out',
  loop: definition.loop,
  tags: ['existing', definition.category, ...definition.tags],
  description: `Existing ${definition.category} animation preserved from the original TECKSTUDIO animation registry.`,
  preview: definition.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 4).toUpperCase(),
}));

export const TECHNICAL_REEL_ANIMATION_LIBRARY: EditorAnimationLibraryItem[] = [
  { id: 'fade-in', name: 'Fade In', category: 'entrance', type: 'fade-in', durationMs: 700, easing: 'ease-out', tags: ['entrance', 'fade'], description: 'Opacity reveal used by scene titles and cards.', preview: 'FADE' },
  { id: 'slide-up', name: 'Slide Up', category: 'entrance', type: 'slide-up', durationMs: 800, easing: 'ease-out', direction: 'up', tags: ['entrance', 'slide'], description: 'Slides object upward into position.', preview: '↑' },
  { id: 'slide-down', name: 'Slide Down', category: 'entrance', type: 'slide-down', durationMs: 800, easing: 'ease-out', direction: 'down', tags: ['entrance', 'slide'], description: 'Slides object downward into position.', preview: '↓' },
  { id: 'slide-left', name: 'Slide Left', category: 'entrance', type: 'slide-left', durationMs: 800, easing: 'ease-out', direction: 'left', tags: ['entrance', 'slide'], description: 'Slides object from right toward left.', preview: '←' },
  { id: 'slide-right', name: 'Slide Right', category: 'entrance', type: 'slide-right', durationMs: 800, easing: 'ease-out', direction: 'right', tags: ['entrance', 'slide'], description: 'Slides object from left toward right.', preview: '→' },
  { id: 'scale-in', name: 'Scale In', category: 'entrance', type: 'scale-in', durationMs: 650, easing: 'ease-out-back', tags: ['entrance', 'scale', 'ai node'], description: 'Scales nodes and badges into place.', preview: '◎' },
  { id: 'pop-in', name: 'Pop In', category: 'entrance', type: 'pop-in', durationMs: 650, easing: 'ease-out-back', tags: ['entrance', 'pop'], description: 'Fast overshoot pop for badges and chips.', preview: 'POP' },

  { id: 'stagger-reveal', name: 'Stagger Reveal', category: 'technical', type: 'stagger-reveal', durationMs: 850, easing: 'ease-out', tags: ['cards', 'rows', 'stagger'], description: 'Sequential card/row reveal.', preview: '1·2·3' },
  { id: 'sequential-reveal', name: 'Sequential Reveal', category: 'technical', type: 'sequential-reveal', durationMs: 900, easing: 'ease-out', tags: ['sequence', 'steps'], description: 'Step-by-step technical reveal.', preview: 'A→B' },
  { id: 'progress-fill', name: 'Progress Fill', category: 'technical', type: 'progress-fill', durationMs: 1100, easing: 'ease-out', direction: 'right', tags: ['progress', 'fill'], description: 'Left-to-right progress bar fill.', preview: '▰▰▱' },
  { id: 'bar-grow', name: 'Bar Grow', category: 'technical', type: 'bar-grow', durationMs: 900, easing: 'ease-out', direction: 'up', tags: ['bar', 'chart'], description: 'Chart bar grows from baseline.', preview: '▂▅█' },
  { id: 'chart-stagger', name: 'Chart Stagger', category: 'technical', type: 'chart-stagger', durationMs: 950, easing: 'ease-out', direction: 'up', tags: ['chart', 'stagger'], description: 'Staggered analytics bar reveal.', preview: '▂▆▇' },
  { id: 'marker-reveal', name: 'Marker Reveal', category: 'technical', type: 'marker-reveal', durationMs: 650, easing: 'ease-out', tags: ['marker', 'label'], description: 'Timeline marker fade/draw.', preview: '●' },
  { id: 'connector-draw-in', name: 'Connector Draw', category: 'technical', type: 'connector-draw-in', durationMs: 900, easing: 'ease-out', tags: ['connector', 'draw'], description: 'Draws connector lines into view.', preview: '──' },
  { id: 'arrow-draw-in', name: 'Arrow Draw', category: 'technical', type: 'arrow-draw-in', durationMs: 900, easing: 'ease-out', tags: ['arrow', 'draw'], description: 'Draws arrow shaft/head into view.', preview: '──▶' },
  { id: 'line-draw', name: 'Line Draw', category: 'technical', type: 'line-draw', durationMs: 850, easing: 'ease-out', tags: ['line', 'draw'], description: 'Draws divider and rail lines.', preview: '━━━━' },
  { id: 'outline-draw', name: 'Outline Draw', category: 'technical', type: 'outline-draw', durationMs: 950, easing: 'ease-out', tags: ['outline', 'box'], description: 'Draws card outlines and frames.', preview: '▢' },
  { id: 'dash-flow', name: 'Dash Flow', category: 'technical', type: 'dash-flow', durationMs: 1200, easing: 'linear', loop: true, tags: ['dash', 'connector', 'flow'], description: 'Animated moving dash connector.', preview: '╌╌▶' },
  { id: 'traveling-dot', name: 'Traveling Dot', category: 'technical', type: 'traveling-dot', durationMs: 1200, easing: 'linear', loop: true, tags: ['dot', 'flow'], description: 'Single dot travels along a path.', preview: '•→' },
  { id: 'dot-sequence', name: 'Dot Sequence', category: 'technical', type: 'dot-sequence', durationMs: 1000, easing: 'ease-in-out', loop: true, tags: ['dots', 'sequence'], description: 'Sequential dot pulse used on connector paths.', preview: '• • •' },
  { id: 'indicator-travel', name: 'Indicator Travel', category: 'technical', type: 'indicator-travel', durationMs: 1400, easing: 'ease-in-out', direction: 'down', loop: true, tags: ['indicator', 'rail'], description: 'Status indicator moves along a rail.', preview: '│•' },
  { id: 'ring-draw', name: 'Ring Draw', category: 'technical', type: 'ring-draw', durationMs: 900, easing: 'ease-out', tags: ['ring', 'ai'], description: 'Draws AI rings or circular outlines.', preview: '◯' },
  { id: 'orbit-dot', name: 'Orbit Dot', category: 'technical', type: 'orbit-dot', durationMs: 1600, easing: 'linear', loop: true, tags: ['orbit', 'ai', 'dot'], description: 'Orbiting dot/halo movement.', preview: '◌•' },

  { id: 'typewriter', name: 'Typewriter', category: 'text', type: 'typewriter', durationMs: 1400, easing: 'linear', tags: ['text', 'typing'], description: 'Types text character by character.', preview: 'T|' },
  { id: 'character-reveal', name: 'Character Reveal', category: 'text', type: 'character-reveal', durationMs: 1000, easing: 'linear', tags: ['text', 'characters'], description: 'Progressively reveals characters.', preview: 'ABC' },
  { id: 'word-reveal', name: 'Word Reveal', category: 'text', type: 'word-reveal', durationMs: 1000, easing: 'ease-out', tags: ['text', 'words'], description: 'Reveals text word by word.', preview: 'W W' },
  { id: 'line-reveal', name: 'Line Reveal', category: 'text', type: 'line-reveal', durationMs: 900, easing: 'ease-out', tags: ['text', 'line'], description: 'Reveals multi-line copy line by line.', preview: '≡' },
  { id: 'code-line-reveal', name: 'Code Line Reveal', category: 'text', type: 'code-line-reveal', durationMs: 1200, easing: 'linear', tags: ['code', 'text'], description: 'Sequentially reveals code panel rows.', preview: '{ }' },
  { id: 'terminal-type', name: 'Terminal Type', category: 'text', type: 'terminal-type', durationMs: 1500, easing: 'linear', tags: ['terminal', 'typing'], description: 'Terminal prompt typing animation.', preview: '$ _' },
  { id: 'cursor-blink', name: 'Cursor Blink', category: 'text', type: 'cursor-blink', durationMs: 700, easing: 'linear', loop: true, tags: ['cursor', 'blink'], description: 'Blinking terminal cursor.', preview: '_' },

  { id: 'ai-node-scale-in', name: 'AI Node Scale In', category: 'motion', type: 'ai-node-scale-in', durationMs: 650, easing: 'ease-out-back', tags: ['ai', 'node', 'scale'], description: 'Scale reveal for AI/core nodes.', preview: 'AI' },
  { id: 'pulse', name: 'Pulse', category: 'emphasis', type: 'pulse', durationMs: 1000, easing: 'ease-in-out', loop: true, tags: ['pulse', 'emphasis'], description: 'Reusable subtle scale pulse.', preview: '◉' },
  { id: 'ring-pulse', name: 'Ring Pulse', category: 'emphasis', type: 'ring-pulse', durationMs: 1200, easing: 'ease-in-out', loop: true, tags: ['ring', 'pulse'], description: 'Repeating concentric ring pulse.', preview: '◎' },
  { id: 'status-dot-pulse', name: 'Status Pulse', category: 'emphasis', type: 'status-dot-pulse', durationMs: 900, easing: 'ease-in-out', loop: true, tags: ['status', 'pulse'], description: 'Pulsing online/status dot.', preview: '●' },
  { id: 'technical-pulse', name: 'Technical Pulse', category: 'emphasis', type: 'technical-pulse', durationMs: 1100, easing: 'ease-in-out', loop: true, tags: ['pulse', 'technical'], description: 'Subtle pulse for technical indicators.', preview: '◉' },
  { id: 'glow-pulse', name: 'Glow Pulse', category: 'emphasis', type: 'glow-pulse', durationMs: 1200, easing: 'ease-in-out', loop: true, tags: ['glow', 'pulse'], description: 'Opacity glow pulse.', preview: '✦' },

  { id: 'fade-out', name: 'Fade Out', category: 'exit', type: 'fade-out', durationMs: 650, easing: 'ease-in', tags: ['exit', 'fade'], description: 'Fades object out.', preview: 'OUT' },
  { id: 'slide-out-left', name: 'Slide Out Left', category: 'exit', type: 'slide-out-left', durationMs: 650, easing: 'ease-in', direction: 'left', tags: ['exit', 'slide'], description: 'Slides object off to the left.', preview: '←OUT' },
  { id: 'slide-out-right', name: 'Slide Out Right', category: 'exit', type: 'slide-out-right', durationMs: 650, easing: 'ease-in', direction: 'right', tags: ['exit', 'slide'], description: 'Slides object off to the right.', preview: 'OUT→' },
  { id: 'slide-out-up', name: 'Slide Out Up', category: 'exit', type: 'slide-out-up', durationMs: 650, easing: 'ease-in', direction: 'up', tags: ['exit', 'slide'], description: 'Slides object upward out.', preview: '↑OUT' },
  { id: 'slide-out-down', name: 'Slide Out Down', category: 'exit', type: 'slide-out-down', durationMs: 650, easing: 'ease-in', direction: 'down', tags: ['exit', 'slide'], description: 'Slides object downward out.', preview: 'OUT↓' },
  { id: 'scale-out', name: 'Scale Out', category: 'exit', type: 'scale-out', durationMs: 650, easing: 'ease-in', tags: ['exit', 'scale'], description: 'Scales object out while fading.', preview: '○' },

  { id: 'animated-progress-bar', name: 'Animated Progress Bar', category: 'animated-elements', type: 'progress-fill', durationMs: 1100, easing: 'ease-out', direction: 'right', mode: 'insert', tags: ['progress', 'insert'], description: 'Insert an animated progress fill object.', preview: '▰▰▱' },
  { id: 'animated-chart', name: 'Animated Chart', category: 'animated-elements', type: 'chart-stagger', durationMs: 1100, easing: 'ease-out', direction: 'up', mode: 'insert', tags: ['chart', 'insert'], description: 'Insert an animated staggered chart.', preview: '▂▆█' },
  { id: 'animated-connector-line', name: 'Animated Connector', category: 'animated-elements', type: 'connector-draw-in', durationMs: 900, easing: 'ease-out', mode: 'insert', tags: ['connector', 'insert'], description: 'Insert an animated connector line.', preview: '──' },
  { id: 'animated-arrow-line', name: 'Animated Arrow', category: 'animated-elements', type: 'arrow-draw-in', durationMs: 900, easing: 'ease-out', mode: 'insert', tags: ['arrow', 'insert'], description: 'Insert an animated arrow.', preview: '──▶' },
  { id: 'traveling-dot-connector', name: 'Traveling Dot Connector', category: 'animated-elements', type: 'traveling-dot', durationMs: 1200, easing: 'linear', direction: 'right', loop: true, mode: 'insert', tags: ['connector', 'dot', 'insert'], description: 'Insert a connector with traveling-dot motion metadata.', preview: '•→' },
  { id: 'animated-terminal', name: 'Animated Terminal', category: 'animated-elements', type: 'terminal-type', durationMs: 1500, easing: 'linear', mode: 'insert', tags: ['terminal', 'insert'], description: 'Insert an editable terminal typing label.', preview: '$ _' },
  { id: 'animated-code-panel', name: 'Animated Code Panel', category: 'animated-elements', type: 'code-line-reveal', durationMs: 1300, easing: 'linear', mode: 'insert', tags: ['code', 'insert'], description: 'Insert an editable code panel with line reveal metadata.', preview: '{ }' },
  { id: 'animated-ai-rings', name: 'Animated AI Rings', category: 'animated-elements', type: 'ring-pulse', durationMs: 1200, easing: 'ease-in-out', loop: true, mode: 'insert', tags: ['ai', 'rings', 'insert'], description: 'Insert pulsing AI system rings.', preview: '◎' },
  { id: 'orbit-dot-system', name: 'Orbit Dot System', category: 'animated-elements', type: 'orbit-dot', durationMs: 1600, easing: 'linear', loop: true, mode: 'insert', tags: ['orbit', 'dot', 'insert'], description: 'Insert an orbiting-dot system.', preview: '◌•' },
  { id: 'animated-status-dot', name: 'Status Indicator', category: 'animated-elements', type: 'status-dot-pulse', durationMs: 900, easing: 'ease-in-out', loop: true, mode: 'insert', tags: ['status', 'insert'], description: 'Insert a pulsing status indicator.', preview: '●' },
  { id: 'technical-progress-rail', name: 'Technical Progress Rail', category: 'animated-elements', type: 'indicator-travel', durationMs: 1400, easing: 'ease-in-out', direction: 'down', loop: true, mode: 'insert', tags: ['rail', 'indicator', 'insert'], description: 'Insert a technical rail with moving indicator metadata.', preview: '│•' },
];

const makeApply = (
  id: string,
  name: string,
  category: EditorAnimationCategory,
  type: FabricObjectAnimationType,
  preview: string,
  tags: string[] = [],
  durationMs = 900,
  easing: FabricObjectAnimation['easing'] = 'ease-out',
  options: Partial<EditorAnimationLibraryItem> = {},
): EditorAnimationLibraryItem => ({
  id,
  name,
  category,
  type,
  durationMs,
  easing,
  tags: [category, ...tags],
  description: `${name} reusable TECKSTUDIO animation preset.`,
  preview,
  ...options,
});

const makeInsert = (
  id: string,
  name: string,
  category: EditorAnimationCategory,
  type: FabricObjectAnimationType,
  preview: string,
  tags: string[] = [],
  durationMs = 1200,
  easing: FabricObjectAnimation['easing'] = 'ease-out',
  options: Partial<EditorAnimationLibraryItem> = {},
): EditorAnimationLibraryItem => ({
  ...makeApply(id, name, category, type, preview, tags, durationMs, easing, options),
  mode: 'insert',
});

const makeMove = (
  id: string,
  name: string,
  type: FabricObjectAnimationType,
  preview: string,
  params: Record<string, unknown>,
  durationMs = 1600,
  easing: FabricObjectAnimation['easing'] = 'ease-in-out',
  loop = false,
): EditorAnimationLibraryItem => makeApply(
  id,
  name,
  'motion',
  type,
  preview,
  ['moving', 'motion', 'path'],
  durationMs,
  easing,
  {
    loop,
    params: {
      movement: {
        distance: 260,
        amplitude: 70,
        cycles: 4,
        radius: 90,
        width: 220,
        height: 120,
        startAngle: 0,
        endAngle: 360,
        clockwise: true,
        orientToPath: false,
        reverse: false,
        ...params,
      },
    },
  },
);

export const MOVING_ANIMATION_LIBRARY: EditorAnimationLibraryItem[] = [
  makeMove('move-left-right', 'Move Left -> Right', 'move-left-right', 'o-->', { endX: 260, endY: 0 }, 1200, 'linear'),
  makeMove('move-right-left', 'Move Right -> Left', 'move-right-left', '<--o', { endX: -260, endY: 0 }, 1200, 'linear'),
  makeMove('move-top-bottom', 'Move Top -> Bottom', 'move-top-bottom', 'o|v', { endX: 0, endY: 260 }, 1200, 'linear'),
  makeMove('move-bottom-top', 'Move Bottom -> Top', 'move-bottom-top', '^|o', { endX: 0, endY: -260 }, 1200, 'linear'),
  makeMove('move-diagonal-down-right', 'Move Diagonal Down Right', 'move-diagonal-down-right', 'o↘', { endX: 240, endY: 180 }, 1400),
  makeMove('move-diagonal-up-right', 'Move Diagonal Up Right', 'move-diagonal-up-right', 'o↗', { endX: 240, endY: -180 }, 1400),
  makeMove('move-diagonal-down-left', 'Move Diagonal Down Left', 'move-diagonal-down-left', '↙o', { endX: -240, endY: 180 }, 1400),
  makeMove('move-diagonal-up-left', 'Move Diagonal Up Left', 'move-diagonal-up-left', '↖o', { endX: -240, endY: -180 }, 1400),
  makeMove('slide-across', 'Slide Across', 'slide-across', '|o->|', { startX: -360, endX: 360, endY: 0 }, 1800, 'linear'),
  makeMove('float-across', 'Float Across', 'float-across', 'o~>', { endX: 280, amplitude: 42, cycles: 1.5 }, 2200, 'ease-in-out', true),
  makeMove('moving-drift', 'Drift', 'moving-drift', '~o~', { distance: 70, amplitude: 34 }, 2200, 'ease-in-out', true),
  makeMove('bounce-move', 'Bounce Move', 'bounce-move', 'o^>', { endX: 260, amplitude: 54, cycles: 3 }, 1600, 'ease-out'),
  makeMove('zig-zag', 'Zig-Zag', 'zig-zag', '/\\/\\', { endX: 280, amplitude: 70, cycles: 4 }, 1800, 'linear'),
  makeMove('curve-path', 'Curve Path', 'curve-path', '╭->', { bezier: [{ x: 0, y: 0 }, { x: 70, y: -140 }, { x: 210, y: 120 }, { x: 280, y: 0 }], orientToPath: true }, 1700, 'ease-in-out'),
  makeMove('arc-move', 'Arc Move', 'arc-move', '∩->', { endX: 260, amplitude: 110 }, 1600, 'ease-in-out'),
  makeMove('wave-move', 'Wave Move', 'wave-move', '~~>', { endX: 300, amplitude: 48, cycles: 2 }, 2000, 'linear', true),
  makeMove('circle-move', 'Circle Move', 'circle-move', '○', { radius: 90, startAngle: 0, endAngle: 360 }, 2200, 'linear', true),
  makeMove('orbit', 'Orbit', 'orbit', '◎', { radius: 120, startAngle: 0, endAngle: 360, orientToPath: true }, 2400, 'linear', true),
  makeMove('figure-8', 'Figure-8', 'figure-8', '∞', { width: 240, height: 130 }, 2600, 'linear', true),
  makeMove('custom-motion-path', 'Custom Motion Path', 'motion-path', 'REC', { points: [{ x: 0, y: 0 }, { x: 80, y: -60 }, { x: 160, y: 40 }, { x: 240, y: 0 }], recorded: true }, 1800),
  makeMove('traveling-dot-motion', 'Traveling Dot', 'traveling-dot', 'o-->', { endX: 300, endY: 0 }, 1400, 'linear', true),
  makeMove('path-follow', 'Path Follow', 'path-follow', '~o>', { bezier: [{ x: 0, y: 0 }, { x: 80, y: -110 }, { x: 200, y: 110 }, { x: 300, y: 0 }], orientToPath: true }, 1800, 'linear'),
  makeMove('arrow-travel', 'Arrow Travel', 'arrow-travel', '-->o', { endX: 300, endY: 0, orientToPath: true }, 1600, 'linear'),
  makeMove('continuous-scroll', 'Continuous Scroll', 'continuous-scroll', '<<<', { startX: 420, endX: -420, endY: 0 }, 3000, 'linear', true),
];

export const REFERENCE_VIDEO_MOTION_LIBRARY: EditorAnimationLibraryItem[] = [
  {
    ...makeMove('reference-title-rise', 'Reference Title Rise', 'move-bottom-top', 'T↑', { startY: 44, endY: 0, distance: 44 }, 760, 'ease-out'),
    description: 'Reference-video title motion: text rises subtly into its final poster position.',
    tags: ['motion', 'reference video', 'title', 'rise', 'text'],
  },
  {
    ...makeMove('reference-panel-slide-left', 'Reference Panel Slide From Left', 'move-left-right', '▣→', { startX: -260, endX: 0, endY: 0 }, 820, 'ease-out'),
    description: 'Reference-video panel motion: cards and boxes slide in from the left edge.',
    tags: ['motion', 'reference video', 'panel', 'card', 'slide'],
  },
  {
    ...makeMove('reference-panel-slide-right', 'Reference Panel Slide From Right', 'move-right-left', '←▣', { startX: 260, endX: 0, endY: 0 }, 820, 'ease-out'),
    description: 'Reference-video panel motion: cards and boxes slide in from the right edge.',
    tags: ['motion', 'reference video', 'panel', 'card', 'slide'],
  },
  {
    ...makeMove('reference-chip-pop-drift', 'Reference Chip Pop Drift', 'moving-drift', 'CH~', { distance: 10, amplitude: 6, cycles: 1 }, 1500, 'ease-in-out', true),
    description: 'Reference-video chip motion: small tags gently drift while remaining readable.',
    tags: ['motion', 'reference video', 'chip', 'pill', 'drift'],
  },
  {
    ...makeMove('reference-packet-travel', 'Reference Packet Travel', 'traveling-dot', '•──→', { endX: 240, endY: 0, dotSize: 7 }, 1050, 'linear', true),
    description: 'Reference-video packet motion: a dot travels horizontally across a connector.',
    tags: ['motion', 'reference video', 'packet', 'dot', 'connector', 'flow'],
  },
  {
    ...makeMove('reference-vertical-rail-travel', 'Reference Vertical Rail Travel', 'move-top-bottom', '│•', { startX: 0, startY: -90, endX: 0, endY: 90, distance: 180 }, 1350, 'ease-in-out', true),
    description: 'Reference-video rail motion: a marker travels down a vertical timeline or system rail.',
    tags: ['motion', 'reference video', 'vertical', 'rail', 'indicator'],
  },
  {
    ...makeMove('reference-bar-sweep', 'Reference Bar Sweep', 'move-left-right', '▰→', { startX: -36, endX: 0, endY: 0, distance: 36 }, 620, 'ease-out'),
    description: 'Reference-video bar motion: a short accent bar sweeps into alignment.',
    tags: ['motion', 'reference video', 'bar', 'metric', 'sweep'],
  },
  {
    ...makeMove('reference-chart-hop', 'Reference Chart Hop', 'bounce-move', '▂^', { endX: 0, endY: 0, amplitude: 28, cycles: 2.5 }, 880, 'ease-out'),
    description: 'Reference-video chart motion: chart marks bounce lightly after appearing.',
    tags: ['motion', 'reference video', 'chart', 'bar', 'bounce'],
  },
  {
    ...makeMove('reference-node-orbit', 'Reference Node Orbit', 'orbit', '◎•', { radius: 72, startAngle: -90, endAngle: 270, orientToPath: true }, 1800, 'linear', true),
    description: 'Reference-video AI/core motion: a node or dot orbits around a central element.',
    tags: ['motion', 'reference video', 'node', 'orbit', 'ai'],
  },
  {
    ...makeMove('reference-figure-eight-loop', 'Reference Figure-8 Loop', 'figure-8', '∞•', { width: 150, height: 76, orientToPath: true }, 2200, 'linear', true),
    description: 'Reference-video ambient motion: a small marker loops in a figure-eight path.',
    tags: ['motion', 'reference video', 'loop', 'figure eight', 'ambient'],
  },
  {
    ...makeMove('reference-wave-flow', 'Reference Wave Flow', 'wave-move', '≈→', { endX: 240, amplitude: 20, cycles: 1.6 }, 1600, 'ease-in-out', true),
    description: 'Reference-video flow motion: icons or packets move forward with a soft wave.',
    tags: ['motion', 'reference video', 'wave', 'flow', 'packet'],
  },
  {
    ...makeMove('reference-diagonal-signal', 'Reference Diagonal Signal', 'move-diagonal-up-right', '•↗', { endX: 130, endY: -82, distance: 130 }, 980, 'ease-out'),
    description: 'Reference-video signal motion: small markers move diagonally between technical nodes.',
    tags: ['motion', 'reference video', 'diagonal', 'signal', 'node'],
  },
  {
    ...makeMove('reference-footer-slide-up', 'Reference Footer Slide Up', 'move-bottom-top', 'F↑', { startY: 70, endY: 0, distance: 70 }, 720, 'ease-out'),
    description: 'Reference-video footer motion: footer labels rise into place near the bottom edge.',
    tags: ['motion', 'reference video', 'footer', 'slide', 'label'],
  },
  {
    ...makeMove('reference-menu-drop', 'Reference Menu Drop', 'move-top-bottom', '▾', { startY: -120, endY: 0, distance: 120 }, 700, 'ease-out-back'),
    description: 'Reference-video overlay motion: dropdown/menu panels drop into view and settle.',
    tags: ['motion', 'reference video', 'menu', 'overlay', 'drop'],
  },
  {
    ...makeMove('reference-scan-sweep', 'Reference Scan Sweep', 'move-top-bottom', 'SCAN', { startY: -120, endY: 120, distance: 240 }, 1450, 'linear', true),
    description: 'Reference-video scan motion: a thin highlight line sweeps through a technical poster.',
    tags: ['motion', 'reference video', 'scan', 'sweep', 'highlight'],
  },
];

export const CANVA_CLASS_ANIMATION_LIBRARY: EditorAnimationLibraryItem[] = [
  makeApply('rise', 'Rise', 'entrance', 'rise', '↑', ['slide', 'entry']),
  makeApply('pan-up', 'Pan Up', 'entrance', 'pan-up', '⇧', ['image', 'pan'], 1200),
  makeApply('pan-down', 'Pan Down', 'entrance', 'pan-down', '⇩', ['image', 'pan'], 1200),
  makeApply('pop', 'Pop', 'entrance', 'pop', 'POP', ['entry']),
  makeApply('zoom-in', 'Zoom In', 'entrance', 'zoom-in', '＋', ['image', 'photo'], 1200),
  makeApply('bounce-in', 'Bounce In', 'entrance', 'bounce-in', '↥', ['entry', 'bounce'], 900, 'ease-out-back'),
  makeApply('drift-in', 'Drift In', 'entrance', 'drift-in', '↝', ['entry', 'soft']),
  makeApply('tumble-in', 'Tumble In', 'entrance', 'tumble-in', '⟳', ['entry', 'rotate'], 1000, 'ease-out-back'),
  makeApply('wipe-in', 'Wipe In', 'entrance', 'wipe-in', '▰', ['mask', 'reveal']),
  makeApply('blur-in', 'Blur In', 'entrance', 'blur-in', 'BLR', ['soft', 'reveal']),
  makeApply('reveal', 'Reveal', 'entrance', 'reveal', '▣', ['mask']),

  makeApply('fade-characters', 'Fade Characters', 'text', 'fade-characters', 'ABC', ['text', 'character']),
  makeApply('pop-characters', 'Pop Characters', 'text', 'pop-characters', 'A!B', ['text', 'character'], 900, 'ease-out-back'),
  makeApply('rise-characters', 'Rise Characters', 'text', 'rise-characters', 'A↑', ['text', 'character']),
  makeApply('pan-text', 'Pan Text', 'text', 'pan-text', 'TXT→', ['text', 'pan']),
  makeApply('tumble-text', 'Tumble Text', 'text', 'tumble-text', 'T⟳', ['text', 'rotate'], 1000, 'ease-out-back'),
  makeApply('breathe-text', 'Breathe Text', 'text', 'breathe-text', 'T~', ['text', 'pulse'], 1400, 'ease-in-out', { loop: true }),
  makeApply('flicker', 'Flicker', 'text', 'flicker', '⚡', ['text', 'glitch'], 900, 'linear', { loop: true }),
  makeApply('neon-flicker', 'Neon Flicker', 'text', 'neon-flicker', 'NEON', ['text', 'glow'], 1100, 'linear', { loop: true }),
  makeApply('wipe-text', 'Wipe Text', 'text', 'wipe-text', '▰T', ['text', 'wipe']),
  makeApply('slide-text', 'Slide Text', 'text', 'slide-text', 'T→', ['text', 'slide']),
  makeApply('bounce-text', 'Bounce Text', 'text', 'bounce-text', 'T↥', ['text', 'bounce'], 900),
  makeApply('wave-text', 'Wave Text', 'text', 'wave-text', '∿T', ['text', 'wave'], 1200, 'ease-in-out', { loop: true }),
  makeApply('letter-stagger', 'Letter Stagger', 'text', 'letter-stagger', 'A·B', ['text', 'stagger']),

  makeApply('motion-path', 'Create Motion Path', 'motion', 'motion-path', '〰→', ['motion', 'path'], 1800, 'ease-in-out', { params: { motionPath: { points: [{ x: 0, y: 0 }, { x: 90, y: -48 }, { x: 180, y: 0 }], orientToPath: false } } }),
  makeApply('motion-straight', 'Straight Motion Path', 'motion', 'motion-path', '──→', ['motion', 'path'], 1600, 'ease-in-out', { params: { motionPath: { points: [{ x: 0, y: 0 }, { x: 180, y: 0 }] } } }),
  makeApply('motion-zigzag', 'Zigzag Motion Path', 'motion', 'motion-path', '〽', ['motion', 'path'], 1800, 'ease-in-out', { params: { motionPath: { points: [{ x: 0, y: 0 }, { x: 60, y: -42 }, { x: 120, y: 42 }, { x: 180, y: 0 }] } } }),
  makeApply('motion-circle', 'Circle Motion Path', 'motion', 'motion-path', '◌', ['motion', 'path', 'circle'], 1800, 'linear', { loop: true, params: { motionPath: { shape: 'circle', radius: 80 } } }),
  makeApply('custom-create-animation', 'Create an Animation', 'motion', 'motion-path', 'REC', ['motion', 'custom', 'record'], 1800, 'ease-in-out', { params: { motionPath: { points: [{ x: 0, y: 0 }, { x: 55, y: -30 }, { x: 125, y: 35 }, { x: 180, y: 0 }], recorded: true } } }),
  makeApply('ken-burns', 'Ken Burns', 'motion', 'ken-burns', 'KB', ['image', 'photo'], 2400, 'ease-in-out'),
  makeApply('drift', 'Drift', 'motion', 'drift', '↝', ['image', 'shape'], 1600, 'ease-in-out', { loop: true }),

  makeApply('breathe', 'Breathe', 'emphasis', 'breathe', '◌', ['soft', 'pulse'], 1400, 'ease-in-out', { loop: true }),
  makeApply('wiggle', 'Wiggle', 'emphasis', 'wiggle', '~', ['rotate'], 900, 'ease-in-out', { loop: true }),
  makeApply('swing', 'Swing', 'emphasis', 'swing', '↔', ['rotate'], 1000, 'ease-in-out', { loop: true }),
  makeApply('jitter', 'Jitter', 'emphasis', 'jitter', '##', ['shake'], 700, 'linear', { loop: true }),
  makeApply('heartbeat', 'Heartbeat', 'emphasis', 'heartbeat', '♥', ['pulse'], 900, 'ease-in-out', { loop: true }),
  makeApply('color-pulse', 'Color Pulse', 'emphasis', 'color-pulse', '●', ['color'], 1100, 'ease-in-out', { loop: true }),
  makeApply('rotate-small', 'Rotate Small', 'emphasis', 'rotate-small', '↺', ['rotate'], 900, 'ease-in-out', { loop: true }),
  makeApply('hover', 'Hover', 'emphasis', 'hover', '↕', ['float'], 1400, 'ease-in-out', { loop: true }),

  makeApply('zoom-out', 'Zoom Out', 'exit', 'zoom-out', '−', ['exit', 'photo'], 850),
  makeApply('pop-out', 'Pop Out', 'exit', 'pop-out', 'POP', ['exit'], 650, 'ease-in'),
  makeApply('wipe-out', 'Wipe Out', 'exit', 'wipe-out', '▱', ['exit', 'mask'], 750, 'ease-in'),
  makeApply('blur-out', 'Blur Out', 'exit', 'blur-out', 'BLR', ['exit'], 750, 'ease-in'),
  makeApply('drift-out', 'Drift Out', 'exit', 'drift-out', '↝', ['exit'], 850, 'ease-in'),

  ...['Classic Confetti', 'Color Confetti', 'Paper Confetti', 'Spark Confetti', 'Celebration Burst', 'Falling Confetti', 'Side Cannon Confetti', 'Streamer Burst', 'Stars Burst', 'Hearts Burst'].map((name, index) => makeInsert(
    `confetti-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    'confetti',
    index === 5 ? 'confetti-fall' : 'confetti-burst',
    index >= 8 ? '★' : '🎉',
    ['confetti', 'particle', 'celebration'],
    1600,
    'ease-out',
    { params: { particleCount: index === 0 ? 36 : 24, seed: index + 11, spread: 120, gravity: 0.7 } },
  )),

  ...['Like Counter', 'Follower Counter', 'Notification Bubble', 'Comment Bubble', 'Heart Reaction', 'Like Reaction', 'Follow Button', 'Subscribe Button', 'Share Indicator', 'View Counter', 'Message Notification', 'Reaction Stack', 'Typing Dots', 'Live Badge', 'Verified Badge Pulse'].map((name, index) => makeInsert(
    `social-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    'social',
    index === 1 || index === 9 ? 'count-up' : index === 12 ? 'dot-sequence' : 'pop-in',
    index === 12 ? '•••' : index === 14 ? '✓' : '♡',
    ['social', 'editable', 'counter'],
    1200,
    'ease-out-back',
    { params: { startValue: 0, endValue: index === 1 ? 1000 : 45, suffix: index === 9 ? ' views' : '' } },
  )),

  makeInsert('animated-bar-chart', 'Animated Bar Chart', 'charts', 'chart-stagger', '▂▆█', ['chart'], 1200),
  makeInsert('animated-horizontal-chart', 'Animated Horizontal Chart', 'charts', 'progress-fill', '▰▰', ['chart'], 1200),
  makeInsert('animated-probability-chart', 'Animated Probability Chart', 'charts', 'bar-grow', '%█', ['chart'], 1200),
  makeInsert('animated-progress-chart', 'Animated Progress Chart', 'charts', 'progress-fill', '▰▱', ['chart'], 1200),
  makeInsert('animated-donut-chart', 'Animated Donut Chart', 'charts', 'ring-draw', '◔', ['chart'], 1200),
  makeInsert('animated-counter', 'Animated Counter', 'charts', 'count-up', '0→9', ['chart', 'counter'], 1200),

  makeApply('count-up', 'Count Up', 'counters', 'count-up', '0→9', ['counter'], 1200, 'ease-out', { params: { startValue: 0, endValue: 100 } }),
  makeApply('count-down', 'Count Down', 'counters', 'count-down', '9→0', ['counter'], 1200, 'ease-out', { params: { startValue: 100, endValue: 0 } }),
  makeApply('percentage-count', 'Percentage Count', 'counters', 'percentage-count', '0%', ['counter'], 1200, 'ease-out', { params: { startValue: 0, endValue: 100, suffix: '%' } }),
  makeApply('currency-count', 'Currency Count', 'counters', 'currency-count', '$0', ['counter'], 1200, 'ease-out', { params: { startValue: 0, endValue: 999, prefix: '$' } }),
  makeApply('follower-count', 'Follower Count', 'counters', 'follower-count', '+1K', ['counter', 'social'], 1200, 'ease-out', { params: { startValue: 0, endValue: 1000 } }),
  makeApply('progress-count', 'Progress Count', 'counters', 'progress-count', '75%', ['counter', 'progress'], 1200, 'ease-out', { params: { startValue: 0, endValue: 75, suffix: '%' } }),

  makeApply('wipe-left', 'Wipe Left', 'motion', 'wipe-left', '◧', ['wipe']),
  makeApply('wipe-right', 'Wipe Right', 'motion', 'wipe-right', '◨', ['wipe']),
  makeApply('wipe-up', 'Wipe Up', 'motion', 'wipe-up', '◩', ['wipe']),
  makeApply('wipe-down', 'Wipe Down', 'motion', 'wipe-down', '◪', ['wipe']),
  makeApply('center-reveal', 'Center Reveal', 'motion', 'center-reveal', '▣', ['reveal']),
  makeApply('circular-reveal', 'Circular Reveal', 'motion', 'circular-reveal', '◉', ['reveal']),

  makeApply('page-fade', 'Page Fade', 'page', 'fade', 'PG', ['page']),
  makeApply('page-pan', 'Page Pan', 'page', 'pan-left', 'PG→', ['page']),
  makeApply('page-rise', 'Page Rise', 'page', 'rise', 'PG↑', ['page']),
  makeApply('page-zoom', 'Page Zoom', 'page', 'zoom-in', 'PG+', ['page']),
  makeApply('page-drift', 'Page Drift', 'page', 'drift', 'PG↝', ['page']),
  makeApply('page-simple-reveal', 'Simple Reveal', 'page', 'reveal', 'PG▣', ['page']),

  ...['Cut', 'Fade', 'Crossfade', 'Slide Left', 'Slide Right', 'Slide Up', 'Slide Down', 'Wipe', 'Dissolve'].map((name) => makeApply(
    `transition-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    'transitions',
    name.includes('Slide') ? 'slide-left' : name.includes('Wipe') ? 'wipe-in' : 'fade',
    '⇄',
    ['transition', 'scene'],
    700,
  )),

  makeInsert('trending-flame', 'Animated Flame', 'trending', 'float', '🔥', ['trending', 'sticker'], 1300, 'ease-in-out', { loop: true }),
  makeInsert('trending-sparkle', 'Sparkle', 'trending', 'glow-pulse', '✨', ['trending'], 1100, 'ease-in-out', { loop: true }),
  makeInsert('trending-celebration', 'Celebration', 'trending', 'confetti-burst', '🎉', ['trending', 'confetti']),
  makeInsert('trending-globe', 'Animated Globe', 'trending', 'rotate', '🌐', ['trending'], 2200, 'linear', { loop: true }),
  makeInsert('trending-arrow', 'Animated Arrow', 'trending', 'arrow-draw-in', '→', ['trending']),
  makeInsert('trending-sticker', 'Animated Sticker', 'trending', 'bounce', '★', ['trending', 'sticker'], 900, 'ease-in-out', { loop: true }),
  makeInsert('trending-character', 'Animated Character', 'trending', 'wiggle', '☺', ['trending', 'sticker'], 1000, 'ease-in-out', { loop: true }),
  makeInsert('trending-gradient-blob', 'Animated Gradient Blob', 'trending', 'morph', '◖', ['trending'], 1600, 'ease-in-out', { loop: true }),
  makeInsert('trending-highlight', 'Animated Highlight', 'trending', 'line-draw', '▔', ['trending']),
  makeInsert('trending-badge', 'Animated Badge', 'trending', 'pop-in', 'NEW', ['trending']),
  makeInsert('trending-cursor', 'Animated Cursor', 'trending', 'cursor-blink', '_', ['trending'], 800, 'linear', { loop: true }),
  makeInsert('trending-loader', 'Animated Loader', 'trending', 'rotate', '◌', ['trending', 'loading'], 1000, 'linear', { loop: true }),
  makeInsert('trending-reaction', 'Animated Emoji-style Reaction', 'trending', 'pop-in', '♥', ['trending', 'reaction']),
];

export const EDITOR_ANIMATION_LIBRARY: EditorAnimationLibraryItem[] = [
  ...EXISTING_BASIC_ANIMATION_LIBRARY,
  ...TECHNICAL_REEL_ANIMATION_LIBRARY,
  ...MOVING_ANIMATION_LIBRARY,
  ...REFERENCE_VIDEO_MOTION_LIBRARY,
  ...CANVA_CLASS_ANIMATION_LIBRARY,
];

export const EDITOR_ANIMATIONS_BY_CATEGORY = EDITOR_ANIMATION_LIBRARY.reduce<Record<EditorAnimationCategory, EditorAnimationLibraryItem[]>>((acc, item) => {
  acc[item.category] = acc[item.category] || [];
  acc[item.category].push(item);
  return acc;
}, {
  recent: [],
  favorites: [],
  trending: [],
  'existing-basic': [],
  entrance: [],
  technical: [],
  text: [],
  motion: [],
  emphasis: [],
  exit: [],
  'animated-elements': [],
  confetti: [],
  social: [],
  charts: [],
  counters: [],
  page: [],
  transitions: [],
});

export const searchEditorAnimations = (query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return EDITOR_ANIMATION_LIBRARY;
  return EDITOR_ANIMATION_LIBRARY.filter((item) => (
    item.name.toLowerCase().includes(needle)
    || item.description.toLowerCase().includes(needle)
    || item.tags.some((tag) => tag.toLowerCase().includes(needle))
    || item.type.toLowerCase().includes(needle)
  ));
};

const animationId = () => (
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `animation-${Date.now()}-${Math.round(Math.random() * 10000)}`
);

const objectId = () => `animated-object-${Date.now()}-${Math.round(Math.random() * 10000)}`;

export const getAnimationTargets = (selectedObject: fabric.Object | null | undefined) => {
  if (!selectedObject) return [];
  if (selectedObject.type === 'activeSelection') {
    const activeSelection = selectedObject as fabric.ActiveSelection;
    return activeSelection.getObjects();
  }
  return [selectedObject];
};

const ensureBaseAnimationState = (object: fabric.Object) => {
  const existing = object.get('baseAnimationState' as keyof fabric.Object);
  if (existing) return;
  const text = ['text', 'i-text', 'textbox'].includes(object.type || '') ? String((object as fabric.Text).text || '') : undefined;
  object.set({
    baseAnimationState: {
      left: object.left ?? 0,
      top: object.top ?? 0,
      width: object.width ?? 0,
      height: object.height ?? 0,
      scaleX: object.scaleX ?? 1,
      scaleY: object.scaleY ?? 1,
      angle: object.angle ?? 0,
      opacity: object.opacity ?? 1,
      visible: object.visible !== false,
      text,
      strokeDashArray: object.strokeDashArray,
      strokeDashOffset: object.strokeDashOffset,
    },
    originalText: text,
    targetWidth: (object.width ?? 0) * (object.scaleX ?? 1),
    targetHeight: (object.height ?? 0) * (object.scaleY ?? 1),
  } as Record<string, unknown>);
};

export const restoreBaseAnimationState = (object: fabric.Object) => {
  const base = object.get('baseAnimationState' as keyof fabric.Object) as Record<string, unknown> | undefined;
  if (!base) return;
  object.set({
    left: base.left,
    top: base.top,
    width: base.width,
    height: base.height,
    scaleX: base.scaleX,
    scaleY: base.scaleY,
    angle: base.angle,
    opacity: base.opacity,
    strokeDashArray: base.strokeDashArray,
    strokeDashOffset: base.strokeDashOffset,
  } as Record<string, unknown>);
  if (base.text !== undefined && 'text' in object) {
    (object as fabric.Text).set('text', String(base.text));
  }
  object.setCoords();
};

export const applyEditorAnimationToObject = (
  selectedObject: fabric.Object | null | undefined,
  item: EditorAnimationLibraryItem,
  canvas: fabric.Canvas,
) => {
  const targets = getAnimationTargets(selectedObject);
  if (!targets.length) return 0;
  targets.forEach((object, index) => {
    if (!object.get('id' as keyof fabric.Object)) {
      object.set('id' as keyof fabric.Object, objectId() as never);
    }
    ensureBaseAnimationState(object);
    const staggerGapMs = Number(item.params?.staggerGapMs ?? 120);
    const staggerDelay = item.type.includes('stagger') || item.type.includes('sequential')
      ? index * Math.max(staggerGapMs, 0)
      : 0;
    const phase = ['entrance', 'emphasis', 'exit'].includes(item.category) ? item.category : 'object';
    const animation: FabricObjectAnimation = {
      id: animationId(),
      objectId: String(object.get('id' as keyof fabric.Object) || ''),
      type: item.type,
      startMs: 0,
      durationMs: item.durationMs,
      delayMs: staggerDelay,
      easing: item.easing || 'ease-out',
      loop: item.loop || false,
      direction: item.direction,
      distance: item.distance,
      params: { ...(item.params || {}), phase, sourceAnimationId: item.id },
    };
    const fullText = ['text', 'i-text', 'textbox'].includes(object.type || '') ? String((object as fabric.Text).text || '') : undefined;
    const existingAnimations = (object.get('objectAnimations' as keyof fabric.Object) as FabricObjectAnimation[] | undefined) || [];
    const nextAnimations = phase === 'object'
      ? [animation]
      : [
        ...existingAnimations.filter((existing) => (
          (existing.params as { phase?: unknown } | undefined)?.phase !== phase
        )),
        animation,
      ];
    object.set({
      objectAnimations: nextAnimations,
      animationConfig: {
        format: 'fabric-keyframe',
        animationType: animation.type,
        startMs: animation.startMs,
        durationMs: animation.durationMs,
        delayMs: animation.delayMs,
        easing: animation.easing,
        loop: animation.loop,
        direction: animation.direction,
        sourceAnimationId: item.id,
        fullText,
        params: item.params,
      },
      isAnimated: true,
      animatedExportSupported: true,
      timelineBaseVisible: object.visible !== false,
    } as Record<string, unknown>);
    object.setCoords();
  });
  canvas.requestRenderAll();
  return targets.length;
};

const attachAnimation = (object: fabric.Object, item: EditorAnimationLibraryItem) => {
  object.set({
    id: objectId(),
    name: item.name,
    objectAnimations: [{
      id: animationId(),
      type: item.type,
      startMs: 0,
      durationMs: item.durationMs,
      delayMs: item.delayMs || 0,
      easing: item.easing || 'ease-out',
      loop: item.loop || false,
      direction: item.direction,
      distance: item.distance,
      params: item.params,
    }],
    animationConfig: {
      format: 'fabric-keyframe',
      animationType: item.type,
      durationMs: item.durationMs,
      delayMs: item.delayMs || 0,
      easing: item.easing || 'ease-out',
      loop: item.loop || false,
      direction: item.direction,
      sourceAnimationId: item.id,
      fullText: ['text', 'i-text', 'textbox'].includes(object.type || '') ? String((object as fabric.Text).text || '') : undefined,
      params: item.params,
    },
    isAnimated: true,
    animatedExportSupported: true,
    timelineBaseVisible: true,
  } as Record<string, unknown>);
  ensureBaseAnimationState(object);
  return object;
};

const seededUnit = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

const createConfettiElement = (item: EditorAnimationLibraryItem, canvas: fabric.Canvas) => {
  const center = canvas.getCenter();
  const count = Math.min(Math.max(Number(item.params?.particleCount ?? 28), 8), 80);
  const colors = ['#22d3ee', '#a855f7', '#f59e0b', '#22c55e', '#ef4444', '#f472b6'];
  return Array.from({ length: count }).map((_, index) => {
    const angle = seededUnit(index + Number(item.params?.seed ?? 17)) * Math.PI * 2;
    const radius = 8 + seededUnit(index + 83) * 44;
    const isCircle = index % 3 === 0;
    const object = isCircle
      ? new fabric.Circle({
        left: center.left + Math.cos(angle) * radius,
        top: center.top + Math.sin(angle) * radius,
        radius: 4 + seededUnit(index + 5) * 3,
        fill: colors[index % colors.length],
      })
      : new fabric.Rect({
        left: center.left + Math.cos(angle) * radius,
        top: center.top + Math.sin(angle) * radius,
        width: 8 + seededUnit(index + 7) * 8,
        height: 4 + seededUnit(index + 11) * 8,
        rx: 2,
        ry: 2,
        angle: seededUnit(index + 13) * 180,
        fill: colors[index % colors.length],
      });
    return attachAnimation(object, {
      ...item,
      distance: 40 + seededUnit(index + 19) * 110,
      delayMs: index * 12,
    });
  });
};

const createSocialElement = (item: EditorAnimationLibraryItem, canvas: fabric.Canvas) => {
  const center = canvas.getCenter();
  const label = item.name.includes('Follower') ? '1,000 followers'
    : item.name.includes('View') ? '45 views'
      : item.name.includes('Subscribe') ? 'Subscribe'
        : item.name.includes('Follow') ? 'Follow'
          : item.name.includes('Typing') ? 'Typing •••'
            : item.name;
  return attachAnimation(new fabric.Group([
    new fabric.Rect({
      left: 0,
      top: 0,
      width: 230,
      height: 62,
      rx: 18,
      ry: 18,
      fill: '#111827',
      stroke: '#334155',
      strokeWidth: 2,
    }),
    new fabric.Circle({
      left: 16,
      top: 17,
      radius: 14,
      fill: '#8b5cf6',
    }),
    new fabric.Text(label, {
      left: 48,
      top: 20,
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 18,
      fontWeight: '700',
      fill: '#f8fafc',
    }),
  ], {
    left: center.left - 115,
    top: center.top - 31,
  }), item);
};

export const createEditorAnimatedElement = (item: EditorAnimationLibraryItem, canvas: fabric.Canvas) => {
  const center = canvas.getCenter();
  const base = {
    left: center.left - 120,
    top: center.top - 40,
    originX: 'left' as const,
    originY: 'top' as const,
  };
  if (item.category === 'confetti') {
    return createConfettiElement(item, canvas);
  }
  if (item.category === 'social') {
    return createSocialElement(item, canvas);
  }
  if (item.category === 'trending') {
    const label = item.preview.length <= 2 ? item.preview : item.name.replace(/^Animated\s+/, '').slice(0, 8);
    return attachAnimation(new fabric.Text(label, {
      left: center.left - 38,
      top: center.top - 30,
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: label.length <= 2 ? 48 : 22,
      fontWeight: '800',
      fill: '#f8fafc',
      shadow: new fabric.Shadow({ color: 'rgba(168,85,247,0.45)', blur: 14 }),
    }), item);
  }
  if (item.category === 'counters' || item.id === 'animated-counter') {
    return attachAnimation(new fabric.Textbox('0', {
      ...base,
      width: 180,
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 52,
      fontWeight: '900',
      fill: '#f8fafc',
    }), item);
  }
  if (item.category === 'charts' && item.id !== 'animated-counter') {
    if (item.id === 'animated-donut-chart') {
      return attachAnimation(new fabric.Circle({
        left: center.left - 55,
        top: center.top - 55,
        radius: 55,
        fill: 'transparent',
        stroke: '#22d3ee',
        strokeWidth: 14,
      }), item);
    }
    return [42, 82, 124, 66].map((height, index) => attachAnimation(new fabric.Rect({
      left: center.left - 105 + (index * 58),
      top: center.top + 80 - height,
      originX: 'left',
      originY: 'top',
      width: item.id.includes('horizontal') ? 160 : 36,
      height: item.id.includes('horizontal') ? 18 : height,
      rx: 9,
      ry: 9,
      fill: ['#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b'][index],
    }), {
      ...item,
      type: item.id.includes('horizontal') ? 'progress-fill' : 'bar-grow',
      delayMs: index * 120,
    }));
  }
  if (item.id === 'animated-progress-bar') {
    return attachAnimation(new fabric.Rect({
      ...base,
      width: 240,
      height: 14,
      rx: 7,
      ry: 7,
      fill: '#22d3ee',
      shadow: new fabric.Shadow({ color: 'rgba(34,211,238,0.35)', blur: 12 }),
    }), item);
  }
  if (item.id === 'animated-chart') {
    return [52, 96, 138, 78].map((height, index) => attachAnimation(new fabric.Rect({
      left: center.left - 105 + (index * 58),
      top: center.top + 80 - height,
      originX: 'left',
      originY: 'top',
      width: 36,
      height,
      rx: 9,
      ry: 9,
      fill: ['#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b'][index],
      shadow: new fabric.Shadow({ color: 'rgba(139,92,246,0.25)', blur: 10 }),
    }), {
      ...item,
      type: 'bar-grow',
      delayMs: index * 140,
    } as EditorAnimationLibraryItem));
  }
  if (item.id === 'animated-arrow-line') {
    return attachAnimation(new fabric.Path('M 0 0 L 220 0 L 204 -10 M 220 0 L 204 10', {
      left: center.left - 110,
      top: center.top,
      fill: '',
      stroke: '#a855f7',
      strokeWidth: 5,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    }), item);
  }
  if (item.id === 'animated-connector-line') {
    return attachAnimation(new fabric.Line([center.left - 120, center.top, center.left + 120, center.top], {
      stroke: '#22c55e',
      strokeWidth: 5,
      strokeLineCap: 'round',
    }), item);
  }
  if (item.id === 'traveling-dot-connector') {
    const line = new fabric.Line([center.left - 120, center.top, center.left + 120, center.top], {
      stroke: '#334155',
      strokeWidth: 4,
      strokeDashArray: [14, 10],
      strokeLineCap: 'round',
      selectable: true,
    });
    const dot = attachAnimation(new fabric.Circle({
      left: center.left - 126,
      top: center.top - 6,
      radius: 7,
      fill: '#22d3ee',
      shadow: new fabric.Shadow({ color: 'rgba(34,211,238,0.5)', blur: 14 }),
    }), {
      ...item,
      distance: 240,
    });
    return [line, dot];
  }
  if (item.id === 'animated-terminal') {
    return attachAnimation(new fabric.Textbox('$ npm run build\n✓ compiled\n✓ exported reel', {
      ...base,
      width: 260,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 22,
      fill: '#d1fae5',
      backgroundColor: '#07111f',
      padding: 12,
    }), item);
  }
  if (item.id === 'animated-code-panel') {
    return attachAnimation(new fabric.Textbox('01  from fastapi import FastAPI\n02  app = FastAPI()\n03  @app.get("/health")\n04  def health(): return {"ok": True}', {
      ...base,
      width: 330,
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 18,
      fill: '#bfdbfe',
      backgroundColor: '#07111f',
      padding: 14,
    }), item);
  }
  if (item.id === 'animated-ai-rings' || item.id === 'orbit-dot-system') {
    const ringOuter = new fabric.Circle({
      left: center.left - 74,
      top: center.top - 74,
      radius: 74,
      fill: 'transparent',
      stroke: '#38bdf8',
      strokeWidth: 3,
      opacity: 0.8,
    });
    const ringInner = new fabric.Circle({
      left: center.left - 48,
      top: center.top - 48,
      radius: 48,
      fill: 'transparent',
      stroke: '#8b5cf6',
      strokeWidth: 3,
      opacity: 0.75,
    });
    const node = new fabric.Circle({
      left: center.left - 25,
      top: center.top - 25,
      radius: 25,
      fill: '#111827',
      stroke: '#22c55e',
      strokeWidth: 3,
    });
    const label = new fabric.Text('AI', {
      left: center.left - 16,
      top: center.top - 14,
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: 22,
      fontWeight: '800',
      fill: '#e0f2fe',
    });
    const dot = new fabric.Circle({
      left: center.left + 66,
      top: center.top - 7,
      radius: 7,
      fill: '#22d3ee',
    });
    return attachAnimation(new fabric.Group([ringOuter, ringInner, node, label, dot], {
      left: center.left - 74,
      top: center.top - 74,
    }), item);
  }
  if (item.id === 'technical-progress-rail') {
    const line = new fabric.Line([center.left, center.top - 120, center.left, center.top + 120], {
      stroke: '#334155',
      strokeWidth: 4,
      strokeDashArray: [12, 10],
      strokeLineCap: 'round',
    });
    const dot = attachAnimation(new fabric.Circle({
      left: center.left - 8,
      top: center.top - 128,
      radius: 8,
      fill: '#22c55e',
      shadow: new fabric.Shadow({ color: 'rgba(34,197,94,0.55)', blur: 16 }),
    }), {
      ...item,
      distance: 240,
    });
    return [line, dot];
  }
  return attachAnimation(new fabric.Circle({
    left: center.left - 12,
    top: center.top - 12,
    radius: 12,
    fill: '#22c55e',
    shadow: new fabric.Shadow({ color: 'rgba(34,197,94,0.55)', blur: 16 }),
  }), item);
};

const readObjectId = (object: fabric.Object | null | undefined) => {
  if (!object) return '';
  return String(
    object.get('id' as keyof fabric.Object)
    || object.get('objectId' as keyof fabric.Object)
    || object.get('elementId' as keyof fabric.Object)
    || object.get('connectorId' as keyof fabric.Object)
    || '',
  );
};

const findCanvasObjectById = (canvas: fabric.Canvas, id: string) => {
  if (!id) return null;
  return canvas.getObjects().find((object) => readObjectId(object) === id) || null;
};

export const resolveAnimationSelection = (
  canvas: fabric.Canvas | null | undefined,
  selectedObject: fabric.Object | null | undefined,
  selectedObjectId?: string | null,
) => {
  if (!canvas) return null;
  const activeObject = canvas.getActiveObject();
  if (activeObject) return activeObject;
  const selectedIdFallback = selectedObjectId || '';
  const fallbackObject = findCanvasObjectById(canvas, selectedIdFallback);
  if (fallbackObject) return fallbackObject;
  if (selectedObject) {
    const selectedId = readObjectId(selectedObject);
    const liveObject = findCanvasObjectById(canvas, selectedId);
    if (liveObject) return liveObject;
    if (canvas.getObjects().includes(selectedObject)) return selectedObject;
  }
  return null;
};

export const getAppliedAnimationIds = (selectedObject: fabric.Object | null | undefined) => {
  const appliedIds = new Set<string>();
  getAnimationTargets(selectedObject).forEach((object) => {
    const animations = (object.get('objectAnimations' as keyof fabric.Object) as FabricObjectAnimation[] | undefined) || [];
    animations.forEach((animation) => {
      if (animation.type) appliedIds.add(String(animation.type));
      const sourceAnimationId = (animation.params as { sourceAnimationId?: unknown } | undefined)?.sourceAnimationId;
      if (sourceAnimationId) appliedIds.add(String(sourceAnimationId));
    });
    const legacy = object.get('animationConfig' as keyof fabric.Object) as Record<string, unknown> | undefined;
    if (legacy?.animationType) appliedIds.add(String(legacy.animationType));
    if (legacy?.sourceAnimationId) appliedIds.add(String(legacy.sourceAnimationId));
  });
  return appliedIds;
};

export const normalizeAnimationId = (rawId: string): string => {
  const normalized = (rawId || '').trim().toLowerCase();
  if (!normalized || normalized === 'none') return 'none';

  const aliasMap: Record<string, string> = {
    'fade': 'fade-in',
    'fade in': 'fade-in',
    'fade-in': 'fade-in',
    'slide up': 'slide-up',
    'slide-up': 'slide-up',
    'slide left': 'slide-left',
    'slide-left': 'slide-left',
    'slide right': 'slide-right',
    'slide-right': 'slide-right',
    'slide down': 'slide-down',
    'slide-down': 'slide-down',
    'scale': 'scale-in',
    'scale in': 'scale-in',
    'scale-in': 'scale-in',
    'typewriter': 'typewriter',
    'character reveal': 'character-reveal',
    'character-reveal': 'character-reveal',
    'word reveal': 'word-reveal',
    'word-reveal': 'word-reveal',
    'line reveal': 'line-reveal',
    'line-reveal': 'line-reveal',
    'pop': 'pop-in',
    'pop in': 'pop-in',
    'pop-in': 'pop-in',
    'rise': 'slide-up',
    'draw': 'connector-draw-in',
    'draw in': 'connector-draw-in',
    'draw-in': 'connector-draw-in',
    'pulse': 'pulse',
    'fade out': 'fade-out',
    'fade-out': 'fade-out',
    'scale out': 'scale-out',
    'scale-out': 'scale-out',
  };

  if (aliasMap[normalized]) return aliasMap[normalized];

  const found = EDITOR_ANIMATION_LIBRARY.find((anim) =>
    anim.id.toLowerCase() === normalized ||
    anim.type.toLowerCase() === normalized ||
    anim.name.toLowerCase() === normalized
  );

  return found ? found.id : normalized;
};

export const runLocalAnimationPreview = (
  canvas: fabric.Canvas,
  targets: fabric.Object[],
  type: string,
  durationMs = 800,
  easing = 'ease-out',
  direction?: string,
  params?: Record<string, unknown>,
) => {
  if (!canvas || targets.length === 0) return;
  const duration = Math.min(Math.max(durationMs || 800, 300), 3000);
  const baseStates = targets.map((object) => {
    ensureBaseAnimationState(object);
    return {
      object,
      left: object.left ?? 0,
      top: object.top ?? 0,
      width: object.width,
      height: object.height,
      scaleX: object.scaleX ?? 1,
      scaleY: object.scaleY ?? 1,
      angle: object.angle ?? 0,
      opacity: object.opacity ?? 1,
      text: 'text' in object ? String((object as fabric.Text).text || '') : undefined,
    };
  });

  const startedAt = performance.now();
  const applyFrame = (now: number) => {
    const elapsed = Math.min(now - startedAt, duration);
    baseStates.forEach((base) => {
      const fullText = base.text || '';
      base.object.set({
        left: base.left,
        top: base.top,
        width: base.width,
        height: base.height,
        scaleX: base.scaleX,
        scaleY: base.scaleY,
        angle: base.angle,
        opacity: base.opacity,
      });
      if (base.text !== undefined) (base.object as fabric.Text).set('text', base.text);

      const evaluation = evaluateObjectAnimationAtTime({
        animation: {
          type: type as FabricObjectAnimationType,
          startMs: 0,
          durationMs: duration,
          easing: easing as FabricObjectAnimation['easing'],
          loop: false,
          direction,
          params,
        },
        localTimeMs: elapsed,
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        textLength: fullText.length,
        objectWidth: (base.width || 0) * base.scaleX,
        objectHeight: (base.height || 0) * base.scaleY,
      });

      const dimensionPatch: Record<string, unknown> = {};
      if (evaluation.widthFactor !== undefined && base.width !== undefined) {
        dimensionPatch.width = Math.max(base.width * evaluation.widthFactor, 0.001);
      }
      if (evaluation.heightFactor !== undefined && base.height !== undefined) {
        dimensionPatch.height = Math.max(base.height * evaluation.heightFactor, 0.001);
      }

      base.object.set({
        opacity: base.opacity * evaluation.opacity,
        left: base.left + evaluation.translateX,
        top: base.top + evaluation.translateY,
        scaleX: base.scaleX * evaluation.scaleX,
        scaleY: base.scaleY * evaluation.scaleY,
        angle: base.angle + evaluation.rotation,
        ...dimensionPatch,
      });

      if ('text' in base.object && evaluation.textValue !== undefined) {
        (base.object as fabric.Text).set('text', evaluation.textValue);
      } else if ('text' in base.object && evaluation.visibleTextLength !== undefined) {
        (base.object as fabric.Text).set('text', fullText.slice(0, evaluation.visibleTextLength));
      }
      base.object.setCoords();
    });
    canvas.requestRenderAll();

    if (elapsed < duration) {
      requestAnimationFrame(applyFrame);
    } else {
      // Restore canonical edit state
      baseStates.forEach((base) => {
        base.object.set({
          left: base.left,
          top: base.top,
          width: base.width,
          height: base.height,
          scaleX: base.scaleX,
          scaleY: base.scaleY,
          angle: base.angle,
          opacity: base.opacity,
        });
        if (base.text !== undefined) (base.object as fabric.Text).set('text', base.text);
        base.object.setCoords();
      });
      canvas.requestRenderAll();
    }
  };

  requestAnimationFrame(applyFrame);
};

export interface ApplyAnimationToSelectedObjectOptions {
  canvas: fabric.Canvas | null | undefined;
  selectedObject: fabric.Object | null | undefined;
  selectedObjectId?: string | null;
  animationId: string;
  saveHistory?: () => void;
  setSelectedObject?: (object: fabric.Object | null) => void;
  onPreview?: (item: EditorAnimationLibraryItem, targets: fabric.Object[]) => void;
}

export type ApplyAnimationToSelectedObjectResult = {
  status: 'applied' | 'inserted' | 'no-selection' | 'not-found' | 'no-canvas';
  item?: EditorAnimationLibraryItem;
  targets: fabric.Object[];
  message: string;
};

export const applyAnimationToSelectedObject = ({
  canvas,
  selectedObject,
  selectedObjectId,
  animationId,
  saveHistory,
  setSelectedObject,
  onPreview,
}: ApplyAnimationToSelectedObjectOptions): ApplyAnimationToSelectedObjectResult => {
  if (!canvas) {
    return {
      status: 'no-canvas',
      targets: [],
      message: 'Canvas is not ready yet.',
    };
  }

  const canonicalId = normalizeAnimationId(animationId);
  const liveSelection = resolveAnimationSelection(canvas, selectedObject, selectedObjectId);
  const targets = getAnimationTargets(liveSelection);

  console.log('[ANIMATION CLICK] requestedAnimation =', animationId, '-> canonicalId =', canonicalId);
  console.log('[ANIMATION CLICK] activeObjectId =', selectedObjectId || (liveSelection ? readObjectId(liveSelection) : null));
  console.log('[ANIMATION CLICK] activeObjectType =', liveSelection?.type);

  if (canonicalId === 'none') {
    if (targets.length) {
      console.log('[ANIMATION APPLY] removing animation from', targets.length, 'targets');
      targets.forEach((obj) => {
        restoreBaseAnimationState(obj);
        obj.set({
          objectAnimations: [],
          animationConfig: { format: 'fabric-keyframe', animationType: 'none' },
          isAnimated: false,
        } as Record<string, unknown>);
      });
      if (liveSelection) canvas.setActiveObject(liveSelection);
      canvas.requestRenderAll();
      saveHistory?.();
      useEditorStore.getState().bumpSelectionAnimation();
      window.dispatchEvent(new CustomEvent('teckstudio:animation-applied', { detail: { type: 'none' } }));
    }
    return {
      status: 'applied',
      targets,
      message: 'Animation removed.',
    };
  }

  let item = EDITOR_ANIMATION_LIBRARY.find((animation) => animation.id === canonicalId || animation.type === canonicalId);
  if (!item) {
    item = {
      id: canonicalId,
      name: canonicalId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      category: 'entrance',
      type: canonicalId as FabricObjectAnimationType,
      durationMs: canonicalId === 'typewriter' ? 1400 : 800,
      easing: 'ease-out',
      tags: ['dynamic', canonicalId],
      description: `${canonicalId} animation`,
      preview: canonicalId.slice(0, 4).toUpperCase(),
    };
  }

  if (item.mode === 'insert') {
    const created = createEditorAnimatedElement(item, canvas);
    const objects = Array.isArray(created) ? created : [created];
    objects.forEach((object) => canvas.add(object));
    const activeObject = objects.length === 1
      ? objects[0]
      : new fabric.ActiveSelection(objects, { canvas });
    canvas.setActiveObject(activeObject);
    setSelectedObject?.(activeObject);
    canvas.requestRenderAll();
    saveHistory?.();
    return {
      status: 'inserted',
      item,
      targets: objects,
      message: `${item.name} added to canvas.`,
    };
  }

  if (!liveSelection || !targets.length) {
    console.warn('[ANIMATION APPLY] No valid selection found for animation');
    return {
      status: 'no-selection',
      item,
      targets: [],
      message: 'Select an element on the canvas to apply this animation.',
    };
  }

  console.log('[ANIMATION APPLY] before =', targets[0].get('objectAnimations' as keyof fabric.Object));
  const appliedCount = applyEditorAnimationToObject(liveSelection, item, canvas);
  console.log('[ANIMATION APPLY] after =', targets[0].get('objectAnimations' as keyof fabric.Object));
  console.log('[ANIMATION STORE] selectedElementAnimation =', item.type);

  if (!appliedCount) {
    return {
      status: 'no-selection',
      item,
      targets: [],
      message: 'Select an element on the canvas to apply this animation.',
    };
  }

  canvas.setActiveObject(liveSelection);
  setSelectedObject?.(liveSelection);
  canvas.fire('object:modified', { target: liveSelection });
  useEditorStore.getState().bumpSelectionAnimation();
  window.dispatchEvent(new CustomEvent('teckstudio:animation-applied', { detail: { type: item.type, item } }));
  canvas.requestRenderAll();
  saveHistory?.();

  if (onPreview) {
    onPreview(item, targets);
  } else {
    runLocalAnimationPreview(canvas, targets, item.type, item.durationMs, item.easing, item.direction, item.params);
  }

  return {
    status: 'applied',
    item,
    targets,
    message: `${item.name} applied to ${appliedCount} selected object${appliedCount === 1 ? '' : 's'}.`,
  };
};
