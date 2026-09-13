/**
 * Centralized Graphics Registry — AI & Technology themed original SVG graphics.
 * All graphics are inline SVGs — no external URLs, no broken thumbnails.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GraphicCategory =
  | 'ai-chip'
  | 'brain-circuit'
  | 'neural-network'
  | 'robot'
  | 'digital-human'
  | 'circuit-pattern'
  | 'ai-badge';

export type GraphicStyle = 'outline' | 'filled' | 'gradient' | 'neon' | 'minimal' | 'isometric';

export interface GraphicDefinition {
  id: string;
  name: string;
  category: GraphicCategory;
  style: GraphicStyle;
  tags: string[];
  defaultWidth: number;
  defaultHeight: number;
  /** Returns SVG markup for thumbnail and canvas insertion */
  svg: () => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const P = '#8b5cf6'; // primary purple
const S = '#7c3aed'; // secondary purple
const B = '#3b82f6'; // blue
const C = '#06b6d4'; // cyan
const K = '#1e1e2e'; // dark bg
const W = '#e2e8f0'; // light
const GRAY = '#6b7280';

function svg(inner: string, w = 100, h = 100): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${inner}</svg>`;
}

// ─── Graphics Registry ────────────────────────────────────────────────────────

export const GRAPHICS_REGISTRY: GraphicDefinition[] = [

  // ═══════════════════════ AI CHIPS & PROCESSORS ══════════════════════════════

  {
    id: 'chip-processor-outline', name: 'AI Processor Outline', category: 'ai-chip', style: 'outline',
    tags: ['chip', 'processor', 'cpu', 'ai', 'outline', 'tech'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="${P}" stroke-width="3"/>
      <rect x="32" y="32" width="36" height="36" rx="4" fill="none" stroke="${P}" stroke-width="1.5"/>
      <text x="50" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="${P}" font-family="monospace">AI</text>
      <line x1="35" y1="20" x2="35" y2="10" stroke="${P}" stroke-width="2"/><line x1="50" y1="20" x2="50" y2="10" stroke="${P}" stroke-width="2"/><line x1="65" y1="20" x2="65" y2="10" stroke="${P}" stroke-width="2"/>
      <line x1="35" y1="80" x2="35" y2="90" stroke="${P}" stroke-width="2"/><line x1="50" y1="80" x2="50" y2="90" stroke="${P}" stroke-width="2"/><line x1="65" y1="80" x2="65" y2="90" stroke="${P}" stroke-width="2"/>
      <line x1="20" y1="35" x2="10" y2="35" stroke="${P}" stroke-width="2"/><line x1="20" y1="50" x2="10" y2="50" stroke="${P}" stroke-width="2"/><line x1="20" y1="65" x2="10" y2="65" stroke="${P}" stroke-width="2"/>
      <line x1="80" y1="35" x2="90" y2="35" stroke="${P}" stroke-width="2"/><line x1="80" y1="50" x2="90" y2="50" stroke="${P}" stroke-width="2"/><line x1="80" y1="65" x2="90" y2="65" stroke="${P}" stroke-width="2"/>`),
  },
  {
    id: 'chip-processor-filled', name: 'AI Processor Filled', category: 'ai-chip', style: 'filled',
    tags: ['chip', 'processor', 'cpu', 'ai', 'filled', 'tech'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="20" y="20" width="60" height="60" rx="8" fill="${P}"/>
      <rect x="32" y="32" width="36" height="36" rx="4" fill="${K}"/>
      <text x="50" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="${P}" font-family="monospace">AI</text>
      <rect x="33" y="8" width="4" height="12" rx="2" fill="${S}"/><rect x="48" y="8" width="4" height="12" rx="2" fill="${S}"/><rect x="63" y="8" width="4" height="12" rx="2" fill="${S}"/>
      <rect x="33" y="80" width="4" height="12" rx="2" fill="${S}"/><rect x="48" y="80" width="4" height="12" rx="2" fill="${S}"/><rect x="63" y="80" width="4" height="12" rx="2" fill="${S}"/>
      <rect x="8" y="33" width="12" height="4" rx="2" fill="${S}"/><rect x="8" y="48" width="12" height="4" rx="2" fill="${S}"/><rect x="8" y="63" width="12" height="4" rx="2" fill="${S}"/>
      <rect x="80" y="33" width="12" height="4" rx="2" fill="${S}"/><rect x="80" y="48" width="12" height="4" rx="2" fill="${S}"/><rect x="80" y="63" width="12" height="4" rx="2" fill="${S}"/>`),
  },
  {
    id: 'chip-neural', name: 'Neural Processor', category: 'ai-chip', style: 'gradient',
    tags: ['chip', 'neural', 'processor', 'gradient', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gChip" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${B}"/><stop offset="100%" stop-color="${P}"/></linearGradient></defs>
      <rect x="20" y="20" width="60" height="60" rx="10" fill="url(#gChip)"/>
      <circle cx="50" cy="50" r="15" fill="none" stroke="${W}" stroke-width="2"/>
      <circle cx="50" cy="50" r="5" fill="${W}"/>
      <circle cx="50" cy="30" r="3" fill="${W}" opacity="0.7"/><circle cx="68" cy="42" r="3" fill="${W}" opacity="0.7"/>
      <circle cx="62" cy="62" r="3" fill="${W}" opacity="0.7"/><circle cx="38" cy="62" r="3" fill="${W}" opacity="0.7"/>
      <circle cx="32" cy="42" r="3" fill="${W}" opacity="0.7"/>
      <line x1="50" y1="35" x2="50" y2="45" stroke="${W}" stroke-width="1" opacity="0.5"/>
      <line x1="63" y1="42" x2="55" y2="48" stroke="${W}" stroke-width="1" opacity="0.5"/>
      <line x1="58" y1="60" x2="53" y2="55" stroke="${W}" stroke-width="1" opacity="0.5"/>
      <line x1="42" y1="60" x2="47" y2="55" stroke="${W}" stroke-width="1" opacity="0.5"/>
      <line x1="37" y1="42" x2="45" y2="48" stroke="${W}" stroke-width="1" opacity="0.5"/>`),
  },
  {
    id: 'chip-circuit', name: 'Circuit Board Chip', category: 'ai-chip', style: 'outline',
    tags: ['chip', 'circuit', 'board', 'tech', 'outline'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="25" y="25" width="50" height="50" rx="4" fill="${K}" stroke="${C}" stroke-width="2"/>
      <circle cx="40" cy="40" r="3" fill="${C}"/><circle cx="60" cy="40" r="3" fill="${C}"/>
      <circle cx="40" cy="60" r="3" fill="${C}"/><circle cx="60" cy="60" r="3" fill="${C}"/>
      <line x1="40" y1="40" x2="60" y2="40" stroke="${C}" stroke-width="1"/><line x1="40" y1="60" x2="60" y2="60" stroke="${C}" stroke-width="1"/>
      <line x1="40" y1="40" x2="40" y2="60" stroke="${C}" stroke-width="1"/><line x1="60" y1="40" x2="60" y2="60" stroke="${C}" stroke-width="1"/>
      <line x1="25" y1="40" x2="12" y2="40" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <line x1="75" y1="40" x2="88" y2="40" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <line x1="40" y1="25" x2="40" y2="12" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <line x1="60" y1="25" x2="60" y2="12" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <line x1="40" y1="75" x2="40" y2="88" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <line x1="60" y1="75" x2="60" y2="88" stroke="${C}" stroke-width="1.5" stroke-dasharray="3 2"/>`),
  },
  {
    id: 'chip-glowing', name: 'Glowing Processor', category: 'ai-chip', style: 'neon',
    tags: ['chip', 'glow', 'neon', 'processor', 'futuristic'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="22" y="22" width="56" height="56" rx="8" fill="${K}" stroke="${P}" stroke-width="2" filter="url(#glow)"/>
      <rect x="30" y="30" width="40" height="40" rx="4" fill="none" stroke="${P}" stroke-width="1" opacity="0.5"/>
      <circle cx="50" cy="50" r="12" fill="none" stroke="${P}" stroke-width="2" filter="url(#glow)"/>
      <circle cx="50" cy="50" r="4" fill="${P}" filter="url(#glow)"/>
      <line x1="50" y1="22" x2="50" y2="8" stroke="${P}" stroke-width="2" filter="url(#glow)"/>
      <line x1="50" y1="78" x2="50" y2="92" stroke="${P}" stroke-width="2" filter="url(#glow)"/>
      <line x1="22" y1="50" x2="8" y2="50" stroke="${P}" stroke-width="2" filter="url(#glow)"/>
      <line x1="78" y1="50" x2="92" y2="50" stroke="${P}" stroke-width="2" filter="url(#glow)"/>`),
  },
  {
    id: 'chip-minimal', name: 'Minimal AI Chip', category: 'ai-chip', style: 'minimal',
    tags: ['chip', 'minimal', 'clean', 'simple', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="28" y="28" width="44" height="44" rx="6" fill="none" stroke="${GRAY}" stroke-width="2"/>
      <text x="50" y="54" text-anchor="middle" font-size="14" font-weight="600" fill="${GRAY}" font-family="system-ui">AI</text>
      <circle cx="50" cy="14" r="2" fill="${GRAY}"/><circle cx="50" cy="86" r="2" fill="${GRAY}"/>
      <circle cx="14" cy="50" r="2" fill="${GRAY}"/><circle cx="86" cy="50" r="2" fill="${GRAY}"/>`),
  },

  // ═══════════════════════ BRAIN & CIRCUIT ════════════════════════════════════

  {
    id: 'brain-circuit-half', name: 'Half Brain Half Circuit', category: 'brain-circuit', style: 'filled',
    tags: ['brain', 'circuit', 'half', 'split', 'ai', 'technology'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<path d="M 50 10 C 25 10 10 30 10 50 C 10 70 25 90 50 90 L 50 10 Z" fill="${P}" opacity="0.8"/>
      <path d="M 50 10 C 75 10 90 30 90 50 C 90 70 75 90 50 90 L 50 10 Z" fill="${K}" stroke="${C}" stroke-width="1.5"/>
      <circle cx="30" cy="40" r="3" fill="${W}"/><circle cx="25" cy="55" r="2.5" fill="${W}"/><circle cx="35" cy="65" r="3" fill="${W}"/>
      <circle cx="70" cy="35" r="2" fill="${C}"/><circle cx="80" cy="50" r="2" fill="${C}"/><circle cx="70" cy="65" r="2" fill="${C}"/>
      <line x1="70" y1="35" x2="80" y2="50" stroke="${C}" stroke-width="1"/><line x1="80" y1="50" x2="70" y2="65" stroke="${C}" stroke-width="1"/>
      <line x1="50" y1="40" x2="70" y2="35" stroke="${C}" stroke-width="1" stroke-dasharray="2 2"/>
      <line x1="50" y1="60" x2="70" y2="65" stroke="${C}" stroke-width="1" stroke-dasharray="2 2"/>`),
  },
  {
    id: 'brain-processor', name: 'Brain with Processor', category: 'brain-circuit', style: 'gradient',
    tags: ['brain', 'processor', 'chip', 'neural', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gBrain" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${P}"/><stop offset="100%" stop-color="${B}"/></linearGradient></defs>
      <path d="M 50 8 C 28 8 12 25 12 45 C 12 55 18 65 28 70 C 25 78 30 88 42 90 L 50 90 L 58 90 C 70 88 75 78 72 70 C 82 65 88 55 88 45 C 88 25 72 8 50 8 Z" fill="url(#gBrain)" opacity="0.9"/>
      <rect x="38" y="38" width="24" height="24" rx="4" fill="${K}" stroke="${W}" stroke-width="1.5"/>
      <text x="50" y="54" text-anchor="middle" font-size="8" font-weight="bold" fill="${W}" font-family="monospace">CPU</text>
      <line x1="50" y1="38" x2="50" y2="25" stroke="${W}" stroke-width="1" opacity="0.6"/>
      <line x1="38" y1="50" x2="25" y2="50" stroke="${W}" stroke-width="1" opacity="0.6"/>
      <line x1="62" y1="50" x2="75" y2="50" stroke="${W}" stroke-width="1" opacity="0.6"/>`),
  },
  {
    id: 'brain-nodes', name: 'Brain with Connected Nodes', category: 'brain-circuit', style: 'outline',
    tags: ['brain', 'nodes', 'connected', 'network', 'neural'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<path d="M 50 10 C 28 10 12 28 12 48 C 12 68 28 88 50 88 C 72 88 88 68 88 48 C 88 28 72 10 50 10 Z" fill="none" stroke="${P}" stroke-width="2.5"/>
      <circle cx="35" cy="35" r="4" fill="${P}"/><circle cx="65" cy="35" r="4" fill="${P}"/>
      <circle cx="25" cy="55" r="3" fill="${B}"/><circle cx="50" cy="50" r="5" fill="${P}"/>
      <circle cx="75" cy="55" r="3" fill="${B}"/><circle cx="38" cy="72" r="3" fill="${C}"/>
      <circle cx="62" cy="72" r="3" fill="${C}"/>
      <line x1="35" y1="35" x2="50" y2="50" stroke="${P}" stroke-width="1.5"/><line x1="65" y1="35" x2="50" y2="50" stroke="${P}" stroke-width="1.5"/>
      <line x1="25" y1="55" x2="50" y2="50" stroke="${B}" stroke-width="1.5"/><line x1="75" y1="55" x2="50" y2="50" stroke="${B}" stroke-width="1.5"/>
      <line x1="38" y1="72" x2="50" y2="50" stroke="${C}" stroke-width="1.5"/><line x1="62" y1="72" x2="50" y2="50" stroke="${C}" stroke-width="1.5"/>`),
  },
  {
    id: 'brain-digital', name: 'Digital Neural Brain', category: 'brain-circuit', style: 'neon',
    tags: ['brain', 'digital', 'neural', 'neon', 'futuristic'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><filter id="gBrain2"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="M 50 12 C 30 12 15 28 15 48 C 15 68 30 85 50 85 C 70 85 85 68 85 48 C 85 28 70 12 50 12 Z" fill="none" stroke="${C}" stroke-width="2" filter="url(#gBrain2)"/>
      <circle cx="30" cy="40" r="3" fill="${C}" filter="url(#gBrain2)"/><circle cx="50" cy="30" r="3" fill="${C}" filter="url(#gBrain2)"/>
      <circle cx="70" cy="40" r="3" fill="${C}" filter="url(#gBrain2)"/><circle cx="40" cy="60" r="3" fill="${C}" filter="url(#gBrain2)"/>
      <circle cx="60" cy="60" r="3" fill="${C}" filter="url(#gBrain2)"/><circle cx="50" cy="50" r="4" fill="${C}" filter="url(#gBrain2)"/>
      <line x1="30" y1="40" x2="50" y2="30" stroke="${C}" stroke-width="1" opacity="0.6"/><line x1="50" y1="30" x2="70" y2="40" stroke="${C}" stroke-width="1" opacity="0.6"/>
      <line x1="30" y1="40" x2="40" y2="60" stroke="${C}" stroke-width="1" opacity="0.6"/><line x1="70" y1="40" x2="60" y2="60" stroke="${C}" stroke-width="1" opacity="0.6"/>
      <line x1="40" y1="60" x2="60" y2="60" stroke="${C}" stroke-width="1" opacity="0.6"/>
      <line x1="50" y1="50" x2="30" y2="40" stroke="${C}" stroke-width="0.8" opacity="0.4"/>
      <line x1="50" y1="50" x2="70" y2="40" stroke="${C}" stroke-width="0.8" opacity="0.4"/>`),
  },
  {
    id: 'brain-gears', name: 'Brain with Gears', category: 'brain-circuit', style: 'filled',
    tags: ['brain', 'gears', 'automation', 'mechanical', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<path d="M 50 10 C 30 10 15 25 15 45 C 15 65 30 82 50 82 C 70 82 85 65 85 45 C 85 25 70 10 50 10 Z" fill="${P}" opacity="0.85"/>
      <circle cx="58" cy="55" r="12" fill="${K}" stroke="${W}" stroke-width="1.5"/>
      <circle cx="58" cy="55" r="5" fill="none" stroke="${W}" stroke-width="1.5"/>
      <circle cx="42" cy="65" r="8" fill="${K}" stroke="${W}" stroke-width="1.5"/>
      <circle cx="42" cy="65" r="3" fill="none" stroke="${W}" stroke-width="1.5"/>
      <line x1="50" y1="50" x2="50" y2="35" stroke="${W}" stroke-width="1" opacity="0.5"/>
      <circle cx="35" cy="35" r="2" fill="${W}" opacity="0.6"/><circle cx="65" cy="35" r="2" fill="${W}" opacity="0.6"/>`),
  },
  {
    id: 'brain-cloud', name: 'Brain with Cloud Network', category: 'brain-circuit', style: 'outline',
    tags: ['brain', 'cloud', 'network', 'distributed', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<path d="M 40 15 C 25 15 15 28 15 40 C 15 55 28 68 45 68 L 55 68 C 72 68 85 55 85 40 C 85 28 75 15 60 15 C 58 10 48 8 40 15 Z" fill="none" stroke="${B}" stroke-width="2"/>
      <circle cx="30" cy="38" r="3" fill="${B}"/><circle cx="50" cy="32" r="3" fill="${B}"/><circle cx="70" cy="38" r="3" fill="${B}"/>
      <circle cx="40" cy="50" r="3" fill="${B}"/><circle cx="60" cy="50" r="3" fill="${B}"/>
      <line x1="30" y1="38" x2="50" y2="32" stroke="${B}" stroke-width="1"/><line x1="50" y1="32" x2="70" y2="38" stroke="${B}" stroke-width="1"/>
      <line x1="30" y1="38" x2="40" y2="50" stroke="${B}" stroke-width="1"/><line x1="70" y1="38" x2="60" y2="50" stroke="${B}" stroke-width="1"/>
      <line x1="40" y1="50" x2="60" y2="50" stroke="${B}" stroke-width="1"/>
      <text x="50" y="88" text-anchor="middle" font-size="8" fill="${GRAY}" font-family="sans-serif">Cloud AI</text>`),
  },
  {
    id: 'brain-data', name: 'Brain with Data Lines', category: 'brain-circuit', style: 'gradient',
    tags: ['brain', 'data', 'lines', 'flow', 'analytics'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gBrainD" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${P}"/><stop offset="100%" stop-color="${B}"/></linearGradient></defs>
      <path d="M 50 10 C 30 10 15 25 15 45 C 15 65 30 82 50 82 C 70 82 85 65 85 45 C 85 25 70 10 50 10 Z" fill="url(#gBrainD)" opacity="0.85"/>
      <path d="M 25 50 L 35 40 L 45 55 L 55 35 L 65 48 L 75 38" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="25" cy="50" r="2" fill="${W}"/><circle cx="35" cy="40" r="2" fill="${W}"/><circle cx="45" cy="55" r="2" fill="${W}"/>
      <circle cx="55" cy="35" r="2" fill="${W}"/><circle cx="65" cy="48" r="2" fill="${W}"/><circle cx="75" cy="38" r="2" fill="${W}"/>`),
  },

  // ═══════════════════════ NEURAL NETWORKS ════════════════════════════════════

  {
    id: 'neural-mesh', name: 'Abstract Neural Mesh', category: 'neural-network', style: 'outline',
    tags: ['neural', 'mesh', 'network', 'abstract', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="20" cy="30" r="4" fill="${P}"/><circle cx="50" cy="15" r="4" fill="${B}"/><circle cx="80" cy="30" r="4" fill="${P}"/>
      <circle cx="15" cy="60" r="3" fill="${C}"/><circle cx="35" cy="50" r="4" fill="${B}"/><circle cx="50" cy="45" r="5" fill="${P}"/>
      <circle cx="65" cy="50" r="4" fill="${B}"/><circle cx="85" cy="60" r="3" fill="${C}"/>
      <circle cx="25" cy="80" r="3" fill="${P}"/><circle cx="50" cy="75" r="4" fill="${B}"/><circle cx="75" cy="80" r="3" fill="${P}"/>
      <line x1="20" y1="30" x2="50" y2="15" stroke="${P}" stroke-width="1" opacity="0.5"/><line x1="50" y1="15" x2="80" y2="30" stroke="${P}" stroke-width="1" opacity="0.5"/>
      <line x1="20" y1="30" x2="35" y2="50" stroke="${B}" stroke-width="1" opacity="0.5"/><line x1="80" y1="30" x2="65" y2="50" stroke="${B}" stroke-width="1" opacity="0.5"/>
      <line x1="35" y1="50" x2="50" y2="45" stroke="${P}" stroke-width="1.5"/><line x1="50" y1="45" x2="65" y2="50" stroke="${P}" stroke-width="1.5"/>
      <line x1="15" y1="60" x2="35" y2="50" stroke="${C}" stroke-width="1" opacity="0.4"/><line x1="85" y1="60" x2="65" y2="50" stroke="${C}" stroke-width="1" opacity="0.4"/>
      <line x1="25" y1="80" x2="50" y2="75" stroke="${P}" stroke-width="1" opacity="0.5"/><line x1="50" y1="75" x2="75" y2="80" stroke="${P}" stroke-width="1" opacity="0.5"/>
      <line x1="35" y1="50" x2="50" y2="75" stroke="${B}" stroke-width="1" opacity="0.4"/><line x1="65" y1="50" x2="50" y2="75" stroke="${B}" stroke-width="1" opacity="0.4"/>`),
  },
  {
    id: 'neural-layers', name: 'Deep Learning Layers', category: 'neural-network', style: 'filled',
    tags: ['neural', 'deep-learning', 'layers', 'ml', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="5" y="25" width="15" height="50" rx="3" fill="${P}" opacity="0.6"/>
      <circle cx="12" cy="35" r="3" fill="${W}"/><circle cx="12" cy="50" r="3" fill="${W}"/><circle cx="12" cy="65" r="3" fill="${W}"/>
      <rect x="30" y="20" width="15" height="60" rx="3" fill="${B}" opacity="0.6"/>
      <circle cx="37" cy="30" r="3" fill="${W}"/><circle cx="37" cy="45" r="3" fill="${W}"/><circle cx="37" cy="60" r="3" fill="${W}"/><circle cx="37" cy="75" r="3" fill="${W}"/>
      <rect x="55" y="20" width="15" height="60" rx="3" fill="${C}" opacity="0.6"/>
      <circle cx="62" cy="30" r="3" fill="${W}"/><circle cx="62" cy="45" r="3" fill="${W}"/><circle cx="62" cy="60" r="3" fill="${W}"/><circle cx="62" cy="75" r="3" fill="${W}"/>
      <rect x="80" y="30" width="15" height="40" rx="3" fill="${P}" opacity="0.6"/>
      <circle cx="87" cy="42" r="3" fill="${W}"/><circle cx="87" cy="58" r="3" fill="${W}"/>
      <text x="50" y="95" text-anchor="middle" font-size="7" fill="${GRAY}" font-family="sans-serif">Input → Hidden → Output</text>`),
  },
  {
    id: 'neural-cluster', name: 'AI Node Cluster', category: 'neural-network', style: 'gradient',
    tags: ['neural', 'cluster', 'nodes', 'graph', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><radialGradient id="gNode"><stop offset="0%" stop-color="${P}" stop-opacity="0.3"/><stop offset="100%" stop-color="${P}" stop-opacity="0"/></radialGradient></defs>
      <circle cx="50" cy="50" r="40" fill="url(#gNode)"/>
      <circle cx="50" cy="50" r="6" fill="${P}"/>
      <circle cx="30" cy="30" r="4" fill="${B}"/><circle cx="70" cy="30" r="4" fill="${B}"/>
      <circle cx="20" cy="55" r="3" fill="${C}"/><circle cx="80" cy="55" r="3" fill="${C}"/>
      <circle cx="35" cy="75" r="4" fill="${B}"/><circle cx="65" cy="75" r="4" fill="${B}"/>
      <circle cx="50" cy="20" r="3" fill="${P}"/><circle cx="50" cy="80" r="3" fill="${P}"/>
      <line x1="50" y1="50" x2="30" y2="30" stroke="${P}" stroke-width="1" opacity="0.4"/><line x1="50" y1="50" x2="70" y2="30" stroke="${P}" stroke-width="1" opacity="0.4"/>
      <line x1="50" y1="50" x2="20" y2="55" stroke="${B}" stroke-width="1" opacity="0.4"/><line x1="50" y1="50" x2="80" y2="55" stroke="${B}" stroke-width="1" opacity="0.4"/>
      <line x1="50" y1="50" x2="35" y2="75" stroke="${C}" stroke-width="1" opacity="0.4"/><line x1="50" y1="50" x2="65" y2="75" stroke="${C}" stroke-width="1" opacity="0.4"/>
      <line x1="50" y1="50" x2="50" y2="20" stroke="${P}" stroke-width="1" opacity="0.4"/><line x1="50" y1="50" x2="50" y2="80" stroke="${P}" stroke-width="1" opacity="0.4"/>`),
  },
  {
    id: 'neural-geometric', name: 'Geometric Brain Network', category: 'neural-network', style: 'outline',
    tags: ['neural', 'geometric', 'brain', 'network', 'hexagon'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<polygon points="50,10 80,27 80,63 50,80 20,63 20,27" fill="none" stroke="${P}" stroke-width="2"/>
      <polygon points="50,25 67,35 67,55 50,65 33,55 33,35" fill="none" stroke="${B}" stroke-width="1.5"/>
      <circle cx="50" cy="45" r="4" fill="${P}"/>
      <circle cx="50" cy="10" r="3" fill="${P}"/><circle cx="80" cy="27" r="3" fill="${B}"/>
      <circle cx="80" cy="63" r="3" fill="${C}"/><circle cx="50" cy="80" r="3" fill="${P}"/>
      <circle cx="20" cy="63" r="3" fill="${B}"/><circle cx="20" cy="27" r="3" fill="${C}"/>
      <line x1="50" y1="45" x2="50" y2="10" stroke="${P}" stroke-width="1" opacity="0.5"/>
      <line x1="50" y1="45" x2="80" y2="27" stroke="${B}" stroke-width="1" opacity="0.5"/>
      <line x1="50" y1="45" x2="80" y2="63" stroke="${C}" stroke-width="1" opacity="0.5"/>
      <line x1="50" y1="45" x2="50" y2="80" stroke="${P}" stroke-width="1" opacity="0.5"/>
      <line x1="50" y1="45" x2="20" y2="63" stroke="${B}" stroke-width="1" opacity="0.5"/>
      <line x1="50" y1="45" x2="20" y2="27" stroke="${C}" stroke-width="1" opacity="0.5"/>`),
  },
  {
    id: 'neural-synapse', name: 'Digital Synapse Pattern', category: 'neural-network', style: 'neon',
    tags: ['neural', 'synapse', 'digital', 'pattern', 'futuristic'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><filter id="gSyn"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="20" cy="50" r="5" fill="${C}" filter="url(#gSyn)"/><circle cx="50" cy="50" r="8" fill="${P}" filter="url(#gSyn)"/>
      <circle cx="80" cy="50" r="5" fill="${C}" filter="url(#gSyn)"/>
      <circle cx="35" cy="25" r="3" fill="${B}" filter="url(#gSyn)"/><circle cx="65" cy="25" r="3" fill="${B}" filter="url(#gSyn)"/>
      <circle cx="35" cy="75" r="3" fill="${B}" filter="url(#gSyn)"/><circle cx="65" cy="75" r="3" fill="${B}" filter="url(#gSyn)"/>
      <line x1="25" y1="50" x2="42" y2="50" stroke="${C}" stroke-width="2" filter="url(#gSyn)"/>
      <line x1="58" y1="50" x2="75" y2="50" stroke="${C}" stroke-width="2" filter="url(#gSyn)"/>
      <line x1="50" y1="42" x2="35" y2="25" stroke="${P}" stroke-width="1.5" filter="url(#gSyn)"/>
      <line x1="50" y1="42" x2="65" y2="25" stroke="${P}" stroke-width="1.5" filter="url(#gSyn)"/>
      <line x1="50" y1="58" x2="35" y2="75" stroke="${P}" stroke-width="1.5" filter="url(#gSyn)"/>
      <line x1="50" y1="58" x2="65" y2="75" stroke="${P}" stroke-width="1.5" filter="url(#gSyn)"/>`),
  },

  // ═══════════════════════ ROBOTS & ASSISTANTS ════════════════════════════════

  {
    id: 'robot-friendly', name: 'Friendly AI Robot', category: 'robot', style: 'filled',
    tags: ['robot', 'friendly', 'ai', 'assistant', 'cute'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="30" y="35" width="40" height="45" rx="10" fill="${P}"/>
      <rect x="35" y="25" width="30" height="15" rx="7" fill="${S}"/>
      <circle cx="42" cy="32" r="3" fill="${W}"/><circle cx="58" cy="32" r="3" fill="${W}"/>
      <circle cx="42" cy="32" r="1.5" fill="${K}"/><circle cx="58" cy="32" r="1.5" fill="${K}"/>
      <path d="M 43 40 Q 50 46 57 40" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round"/>
      <rect x="20" y="45" width="10" height="20" rx="5" fill="${S}"/><rect x="70" y="45" width="10" height="20" rx="5" fill="${S}"/>
      <rect x="38" y="80" width="10" height="15" rx="5" fill="${S}"/><rect x="52" y="80" width="10" height="15" rx="5" fill="${S}"/>
      <line x1="42" y1="18" x2="42" y2="10" stroke="${W}" stroke-width="2"/><circle cx="42" cy="8" r="3" fill="${C}"/>
      <line x1="58" y1="18" x2="58" y2="10" stroke="${W}" stroke-width="2"/><circle cx="58" cy="8" r="3" fill="${C}"/>`),
  },
  {
    id: 'robot-assistant', name: 'AI Assistant Robot', category: 'robot', style: 'gradient',
    tags: ['robot', 'assistant', 'ai', 'help', 'chat'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gRobo" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${B}"/><stop offset="100%" stop-color="${P}"/></linearGradient></defs>
      <rect x="25" y="30" width="50" height="50" rx="12" fill="url(#gRobo)"/>
      <circle cx="40" cy="48" r="4" fill="${W}"/><circle cx="60" cy="48" r="4" fill="${W}"/>
      <circle cx="40" cy="48" r="2" fill="${K}"/><circle cx="60" cy="48" r="2" fill="${K}"/>
      <rect x="40" y="58" width="20" height="4" rx="2" fill="${W}" opacity="0.6"/>
      <rect x="15" y="42" width="10" height="25" rx="5" fill="${B}"/><rect x="75" y="42" width="10" height="25" rx="5" fill="${B}"/>
      <rect x="35" y="80" width="12" height="12" rx="6" fill="${B}"/><rect x="53" y="80" width="12" height="12" rx="6" fill="${B}"/>
      <circle cx="50" cy="22" r="4" fill="${C}"/><line x1="50" y1="26" x2="50" y2="30" stroke="${C}" stroke-width="2"/>`),
  },
  {
    id: 'robot-humanoid', name: 'Humanoid Robot', category: 'robot', style: 'outline',
    tags: ['robot', 'humanoid', 'ai', 'android', 'tech'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="50" cy="25" r="15" fill="none" stroke="${P}" stroke-width="2"/>
      <circle cx="43" cy="22" r="2" fill="${P}"/><circle cx="57" cy="22" r="2" fill="${P}"/>
      <line x1="45" y1="30" x2="55" y2="30" stroke="${P}" stroke-width="1.5"/>
      <line x1="50" y1="40" x2="50" y2="65" stroke="${P}" stroke-width="2.5"/>
      <line x1="50" y1="48" x2="30" y2="58" stroke="${P}" stroke-width="2"/><line x1="50" y1="48" x2="70" y2="58" stroke="${P}" stroke-width="2"/>
      <line x1="50" y1="65" x2="35" y2="85" stroke="${P}" stroke-width="2"/><line x1="50" y1="65" x2="65" y2="85" stroke="${P}" stroke-width="2"/>
      <circle cx="30" cy="58" r="3" fill="none" stroke="${P}" stroke-width="1.5"/><circle cx="70" cy="58" r="3" fill="none" stroke="${P}" stroke-width="1.5"/>
      <circle cx="50" cy="48" r="3" fill="${P}"/>`),
  },
  {
    id: 'robot-tablet', name: 'Robot with Tablet', category: 'robot', style: 'filled',
    tags: ['robot', 'tablet', 'ai', 'digital', 'screen'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="32" y="25" width="36" height="40" rx="8" fill="${P}"/>
      <rect x="38" y="20" width="24" height="12" rx="6" fill="${S}"/>
      <circle cx="46" cy="26" r="2" fill="${W}"/><circle cx="54" cy="26" r="2" fill="${W}"/>
      <rect x="25" y="55" width="20" height="28" rx="4" fill="${B}"/>
      <rect x="28" y="58" width="14" height="18" rx="2" fill="${K}" stroke="${W}" stroke-width="1"/>
      <line x1="30" y1="63" x2="40" y2="63" stroke="${C}" stroke-width="1"/><line x1="30" y1="67" x2="38" y2="67" stroke="${C}" stroke-width="1"/>
      <rect x="55" y="55" width="20" height="28" rx="4" fill="${B}"/>
      <rect x="42" y="80" width="8" height="12" rx="4" fill="${S}"/><rect x="50" y="80" width="8" height="12" rx="4" fill="${S}"/>`),
  },
  {
    id: 'robot-medical', name: 'Medical Assistant Robot', category: 'robot', style: 'filled',
    tags: ['robot', 'medical', 'healthcare', 'ai', 'doctor'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="30" y="30" width="40" height="45" rx="10" fill="${W}" stroke="${B}" stroke-width="2"/>
      <circle cx="42" cy="42" r="3" fill="${B}"/><circle cx="58" cy="42" r="3" fill="${B}"/>
      <path d="M 43 50 Q 50 55 57 50" fill="none" stroke="${B}" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="43" y="58" width="14" height="10" rx="2" fill="${B}"/>
      <line x1="50" y1="60" x2="50" y2="66" stroke="${W}" stroke-width="2"/><line x1="46" y1="63" x2="54" y2="63" stroke="${W}" stroke-width="2"/>
      <rect x="20" y="40" width="10" height="22" rx="5" fill="${B}"/><rect x="70" y="40" width="10" height="22" rx="5" fill="${B}"/>
      <rect x="37" y="75" width="10" height="14" rx="5" fill="${B}"/><rect x="53" y="75" width="10" height="14" rx="5" fill="${B}"/>`),
  },
  {
    id: 'robot-waving', name: 'Waving Robot', category: 'robot', style: 'filled',
    tags: ['robot', 'waving', 'hello', 'friendly', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<rect x="32" y="30" width="36" height="42" rx="10" fill="${C}"/>
      <rect x="38" y="22" width="24" height="14" rx="7" fill="${B}"/>
      <circle cx="45" cy="29" r="2.5" fill="${W}"/><circle cx="55" cy="29" r="2.5" fill="${W}"/>
      <path d="M 44 36 Q 50 40 56 36" fill="none" stroke="${W}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="68" y1="35" x2="82" y2="20" stroke="${C}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="84" cy="18" r="4" fill="${C}"/>
      <rect x="22" y="42" width="10" height="20" rx="5" fill="${B}"/>
      <rect x="38" y="72" width="10" height="14" rx="5" fill="${B}"/><rect x="52" y="72" width="10" height="14" rx="5" fill="${B}"/>`),
  },

  // ═══════════════════════ DIGITAL HUMANS ═════════════════════════════════════

  {
    id: 'human-female', name: 'Female Digital Profile', category: 'digital-human', style: 'gradient',
    tags: ['human', 'female', 'profile', 'digital', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gHumF" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${P}"/><stop offset="100%" stop-color="${B}"/></linearGradient></defs>
      <circle cx="50" cy="35" r="20" fill="url(#gHumF)" opacity="0.9"/>
      <path d="M 30 55 Q 30 85 50 90 Q 70 85 70 55" fill="url(#gHumF)" opacity="0.7"/>
      <circle cx="43" cy="33" r="2" fill="${W}"/><circle cx="57" cy="33" r="2" fill="${W}"/>
      <path d="M 44 40 Q 50 44 56 40" fill="none" stroke="${W}" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="50" cy="15" r="2" fill="${C}" opacity="0.6"/>
      <line x1="30" y1="35" x2="18" y2="35" stroke="${C}" stroke-width="1" opacity="0.4"/>
      <line x1="70" y1="35" x2="82" y2="35" stroke="${C}" stroke-width="1" opacity="0.4"/>
      <circle cx="18" cy="35" r="2" fill="${C}" opacity="0.5"/><circle cx="82" cy="35" r="2" fill="${C}" opacity="0.5"/>`),
  },
  {
    id: 'human-male', name: 'Male Digital Profile', category: 'digital-human', style: 'outline',
    tags: ['human', 'male', 'profile', 'digital', 'tech'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="50" cy="35" r="20" fill="none" stroke="${P}" stroke-width="2.5"/>
      <path d="M 30 55 Q 30 85 50 90 Q 70 85 70 55" fill="none" stroke="${P}" stroke-width="2"/>
      <circle cx="43" cy="33" r="2" fill="${P}"/><circle cx="57" cy="33" r="2" fill="${P}"/>
      <line x1="45" y1="42" x2="55" y2="42" stroke="${P}" stroke-width="1.5"/>
      <circle cx="50" cy="15" r="3" fill="none" stroke="${C}" stroke-width="1.5"/>
      <line x1="30" y1="30" x2="15" y2="30" stroke="${C}" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="70" y1="30" x2="85" y2="30" stroke="${C}" stroke-width="1" stroke-dasharray="3 2"/>
      <line x1="50" y1="55" x2="50" y2="70" stroke="${C}" stroke-width="1" stroke-dasharray="3 2"/>
      <circle cx="15" cy="30" r="2" fill="${C}"/><circle cx="85" cy="30" r="2" fill="${C}"/><circle cx="50" cy="72" r="2" fill="${C}"/>`),
  },
  {
    id: 'human-silhouette', name: 'Futuristic Head Silhouette', category: 'digital-human', style: 'filled',
    tags: ['human', 'silhouette', 'futuristic', 'head', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<path d="M 50 8 C 32 8 18 22 18 40 C 18 52 24 62 32 68 L 32 88 L 68 88 L 68 68 C 76 62 82 52 82 40 C 82 22 68 8 50 8 Z" fill="${P}" opacity="0.85"/>
      <circle cx="40" cy="35" r="3" fill="${W}" opacity="0.8"/><circle cx="60" cy="35" r="3" fill="${W}" opacity="0.8"/>
      <path d="M 42 45 Q 50 50 58 45" fill="none" stroke="${W}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="50" y1="8" x2="50" y2="0" stroke="${C}" stroke-width="1.5"/>
      <line x1="18" y1="40" x2="8" y2="40" stroke="${C}" stroke-width="1.5"/>
      <line x1="82" y1="40" x2="92" y2="40" stroke="${C}" stroke-width="1.5"/>
      <circle cx="50" cy="0" r="2" fill="${C}"/><circle cx="8" cy="40" r="2" fill="${C}"/><circle cx="92" cy="40" r="2" fill="${C}"/>`),
  },
  {
    id: 'human-circuit', name: 'Human Head with Circuits', category: 'digital-human', style: 'neon',
    tags: ['human', 'circuit', 'head', 'cyber', 'futuristic'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><filter id="gHumC"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="50" cy="35" r="22" fill="none" stroke="${C}" stroke-width="2" filter="url(#gHumC)"/>
      <path d="M 30 58 Q 30 88 50 92 Q 70 88 70 58" fill="none" stroke="${C}" stroke-width="1.5" filter="url(#gHumC)"/>
      <circle cx="42" cy="32" r="2" fill="${C}" filter="url(#gHumC)"/><circle cx="58" cy="32" r="2" fill="${C}" filter="url(#gHumC)"/>
      <circle cx="50" cy="10" r="3" fill="${P}" filter="url(#gHumC)"/>
      <line x1="50" y1="13" x2="50" y2="25" stroke="${P}" stroke-width="1" filter="url(#gHumC)"/>
      <circle cx="20" cy="35" r="2" fill="${B}" filter="url(#gHumC)"/><circle cx="80" cy="35" r="2" fill="${B}" filter="url(#gHumC)"/>
      <line x1="28" y1="35" x2="20" y2="35" stroke="${B}" stroke-width="1" filter="url(#gHumC)"/>
      <line x1="72" y1="35" x2="80" y2="35" stroke="${B}" stroke-width="1" filter="url(#gHumC)"/>`),
  },

  // ═══════════════════════ CIRCUIT PATTERNS ═══════════════════════════════════

  {
    id: 'circuit-corner', name: 'Circuit Corner Decoration', category: 'circuit-pattern', style: 'outline',
    tags: ['circuit', 'corner', 'decoration', 'tech', 'border'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<polyline points="5,5 5,40 20,40 20,25 35,25 35,15 50,15" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="5" cy="5" r="3" fill="${C}"/><circle cx="50" cy="15" r="2" fill="${C}"/>
      <polyline points="5,5 40,5 40,20 25,20 25,35 15,35" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
      <circle cx="40" cy="5" r="2" fill="${P}" opacity="0.5"/><circle cx="15" cy="35" r="2" fill="${P}" opacity="0.5"/>`),
  },
  {
    id: 'circuit-tree', name: 'Circuit Tree', category: 'circuit-pattern', style: 'gradient',
    tags: ['circuit', 'tree', 'branch', 'technology', 'organic'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<line x1="50" y1="90" x2="50" y2="50" stroke="${P}" stroke-width="3"/>
      <line x1="50" y1="60" x2="30" y2="40" stroke="${B}" stroke-width="2"/><line x1="50" y1="60" x2="70" y2="40" stroke="${B}" stroke-width="2"/>
      <line x1="30" y1="40" x2="20" y2="25" stroke="${C}" stroke-width="1.5"/><line x1="30" y1="40" x2="35" y2="22" stroke="${C}" stroke-width="1.5"/>
      <line x1="70" y1="40" x2="65" y2="22" stroke="${C}" stroke-width="1.5"/><line x1="70" y1="40" x2="80" y2="25" stroke="${C}" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="4" fill="${P}"/>
      <circle cx="30" cy="40" r="3" fill="${B}"/><circle cx="70" cy="40" r="3" fill="${B}"/>
      <circle cx="20" cy="25" r="2" fill="${C}"/><circle cx="35" cy="22" r="2" fill="${C}"/>
      <circle cx="65" cy="22" r="2" fill="${C}"/><circle cx="80" cy="25" r="2" fill="${C}"/>`),
  },
  {
    id: 'circuit-hex', name: 'Hexagon Circuit Network', category: 'circuit-pattern', style: 'outline',
    tags: ['circuit', 'hexagon', 'network', 'honeycomb', 'tech'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<polygon points="50,15 72,28 72,52 50,65 28,52 28,28" fill="none" stroke="${P}" stroke-width="2"/>
      <polygon points="50,35 60,41 60,53 50,59 40,53 40,41" fill="none" stroke="${B}" stroke-width="1.5"/>
      <circle cx="50" cy="47" r="3" fill="${P}"/>
      <circle cx="50" cy="15" r="2.5" fill="${C}"/><circle cx="72" cy="28" r="2.5" fill="${C}"/>
      <circle cx="72" cy="52" r="2.5" fill="${C}"/><circle cx="50" cy="65" r="2.5" fill="${C}"/>
      <circle cx="28" cy="52" r="2.5" fill="${C}"/><circle cx="28" cy="28" r="2.5" fill="${C}"/>`),
  },
  {
    id: 'circuit-motherboard', name: 'Motherboard Pattern', category: 'circuit-pattern', style: 'minimal',
    tags: ['circuit', 'motherboard', 'pattern', 'tech', 'background'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<line x1="10" y1="50" x2="90" y2="50" stroke="${GRAY}" stroke-width="1" opacity="0.4"/>
      <line x1="50" y1="10" x2="50" y2="90" stroke="${GRAY}" stroke-width="1" opacity="0.4"/>
      <line x1="10" y1="25" x2="90" y2="25" stroke="${GRAY}" stroke-width="0.5" opacity="0.3"/>
      <line x1="10" y1="75" x2="90" y2="75" stroke="${GRAY}" stroke-width="0.5" opacity="0.3"/>
      <line x1="25" y1="10" x2="25" y2="90" stroke="${GRAY}" stroke-width="0.5" opacity="0.3"/>
      <line x1="75" y1="10" x2="75" y2="90" stroke="${GRAY}" stroke-width="0.5" opacity="0.3"/>
      <circle cx="50" cy="50" r="4" fill="${GRAY}" opacity="0.5"/>
      <circle cx="25" cy="25" r="2" fill="${GRAY}" opacity="0.4"/><circle cx="75" cy="25" r="2" fill="${GRAY}" opacity="0.4"/>
      <circle cx="25" cy="75" r="2" fill="${GRAY}" opacity="0.4"/><circle cx="75" cy="75" r="2" fill="${GRAY}" opacity="0.4"/>`),
  },

  // ═══════════════════════ AI BADGES & SYMBOLS ════════════════════════════════

  {
    id: 'badge-ai', name: 'AI Badge', category: 'ai-badge', style: 'filled',
    tags: ['badge', 'ai', 'artificial-intelligence', 'icon', 'label'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="50" cy="50" r="38" fill="${P}"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="${W}" stroke-width="1.5" opacity="0.3"/>
      <text x="50" y="46" text-anchor="middle" font-size="16" font-weight="bold" fill="${W}" font-family="sans-serif">AI</text>
      <text x="50" y="62" text-anchor="middle" font-size="7" fill="${W}" opacity="0.7" font-family="sans-serif">POWERED</text>
      <circle cx="50" cy="12" r="2" fill="${C}"/><circle cx="88" cy="50" r="2" fill="${C}"/>
      <circle cx="50" cy="88" r="2" fill="${C}"/><circle cx="12" cy="50" r="2" fill="${C}"/>`),
  },
  {
    id: 'badge-sparkle', name: 'AI Sparkle Badge', category: 'ai-badge', style: 'gradient',
    tags: ['badge', 'sparkle', 'ai', 'magic', 'star'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gBadge" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${B}"/><stop offset="100%" stop-color="${P}"/></linearGradient></defs>
      <circle cx="50" cy="50" r="38" fill="url(#gBadge)"/>
      <path d="M 50 20 L 54 38 L 72 38 L 58 48 L 62 66 L 50 56 L 38 66 L 42 48 L 28 38 L 46 38 Z" fill="${W}" opacity="0.9"/>
      <circle cx="50" cy="45" r="4" fill="${P}"/>`),
  },
  {
    id: 'badge-neural', name: 'Neural Symbol', category: 'ai-badge', style: 'outline',
    tags: ['badge', 'neural', 'symbol', 'network', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="50" cy="50" r="38" fill="none" stroke="${P}" stroke-width="2.5"/>
      <circle cx="50" cy="30" r="4" fill="${P}"/><circle cx="30" cy="50" r="4" fill="${B}"/>
      <circle cx="70" cy="50" r="4" fill="${B}"/><circle cx="50" cy="70" r="4" fill="${C}"/>
      <circle cx="50" cy="50" r="5" fill="${P}"/>
      <line x1="50" y1="30" x2="50" y2="50" stroke="${P}" stroke-width="1.5"/><line x1="30" y1="50" x2="50" y2="50" stroke="${B}" stroke-width="1.5"/>
      <line x1="70" y1="50" x2="50" y2="50" stroke="${B}" stroke-width="1.5"/><line x1="50" y1="70" x2="50" y2="50" stroke="${C}" stroke-width="1.5"/>`),
  },
  {
    id: 'badge-automation', name: 'Automation Badge', category: 'ai-badge', style: 'filled',
    tags: ['badge', 'automation', 'gear', 'process', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="50" cy="50" r="38" fill="${B}"/>
      <circle cx="50" cy="42" r="12" fill="none" stroke="${W}" stroke-width="2"/>
      <circle cx="50" cy="42" r="5" fill="${W}"/>
      <path d="M 38 62 L 32 80 L 42 78 L 45 70" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round"/>
      <path d="M 62 62 L 68 80 L 58 78 L 55 70" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="50" cy="42" r="18" fill="none" stroke="${W}" stroke-width="1" opacity="0.3"/>`),
  },
  {
    id: 'badge-ml', name: 'Machine Learning Badge', category: 'ai-badge', style: 'outline',
    tags: ['badge', 'machine-learning', 'ml', 'data', 'ai'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<circle cx="50" cy="50" r="38" fill="none" stroke="${P}" stroke-width="2"/>
      <path d="M 25 60 Q 35 30 50 45 Q 65 60 75 35" fill="none" stroke="${P}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="25" cy="60" r="3" fill="${P}"/><circle cx="50" cy="45" r="3" fill="${B}"/><circle cx="75" cy="35" r="3" fill="${C}"/>
      <text x="50" y="78" text-anchor="middle" font-size="8" font-weight="600" fill="${P}" font-family="sans-serif">ML</text>`),
  },
  {
    id: 'badge-ai-cloud', name: 'AI Cloud Symbol', category: 'ai-badge', style: 'gradient',
    tags: ['badge', 'cloud', 'ai', 'saas', 'computing'],
    defaultWidth: 100, defaultHeight: 100,
    svg: () => svg(`<defs><linearGradient id="gCloud" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${B}"/><stop offset="100%" stop-color="${P}"/></linearGradient></defs>
      <path d="M 25 55 Q 10 55 10 42 Q 10 30 22 28 Q 20 15 35 12 Q 48 8 55 15 Q 62 8 72 12 Q 85 15 85 28 Q 92 30 90 42 Q 90 55 75 55 Z" fill="url(#gCloud)" opacity="0.9"/>
      <text x="50" y="42" text-anchor="middle" font-size="14" font-weight="bold" fill="${W}" font-family="sans-serif">AI</text>
      <circle cx="35" cy="68" r="2" fill="${P}" opacity="0.5"/><circle cx="50" cy="72" r="2" fill="${B}" opacity="0.5"/><circle cx="65" cy="68" r="2" fill="${C}" opacity="0.5"/>
      <line x1="35" y1="68" x2="50" y2="55" stroke="${P}" stroke-width="1" opacity="0.3"/>
      <line x1="65" y1="68" x2="50" y2="55" stroke="${C}" stroke-width="1" opacity="0.3"/>`),
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const GRAPHICS_MAP = new Map(GRAPHICS_REGISTRY.map((g) => [g.id, g]));

export const GRAPHICS_BY_CATEGORY = GRAPHICS_REGISTRY.reduce<Record<GraphicCategory, GraphicDefinition[]>>((acc, g) => {
  (acc[g.category] ||= []).push(g);
  return acc;
}, {} as any);

export const GRAPHIC_CATEGORIES: Array<{ id: GraphicCategory; label: string }> = [
  { id: 'ai-chip', label: 'AI Chips & Processors' },
  { id: 'brain-circuit', label: 'Brains & Circuits' },
  { id: 'neural-network', label: 'Neural Networks' },
  { id: 'robot', label: 'Robots & Assistants' },
  { id: 'digital-human', label: 'Digital Humans' },
  { id: 'circuit-pattern', label: 'Circuit Patterns' },
  { id: 'ai-badge', label: 'AI Badges & Symbols' },
];

export function searchGraphics(query: string): GraphicDefinition[] {
  if (!query.trim()) return GRAPHICS_REGISTRY;
  const q = query.toLowerCase();
  return GRAPHICS_REGISTRY.filter((g) =>
    g.name.toLowerCase().includes(q) ||
    g.id.includes(q) ||
    g.tags.some((t) => t.includes(q)) ||
    g.category.includes(q) ||
    g.style.includes(q)
  );
}
