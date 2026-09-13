import { fabric } from 'fabric';
import type { EditorPage, TechnicalReelSceneKey } from '../types/timeline';
import { TECHNICAL_REEL_SCENE_ORDER } from '../types/timeline';
import { CUSTOM_FABRIC_PROPERTIES } from './editorElementFactory';

export type TechnicalReelElementId =
  | 'technical-background'
  | 'dark-navy-background'
  | 'subtle-dot-grid'
  | 'technical-grid'
  | 'soft-noise-dot-texture'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'outlined-rectangle'
  | 'circle'
  | 'ellipse'
  | 'technical-card'
  | 'rounded-technical-card'
  | 'outlined-panel'
  | 'small-label-box'
  | 'module-card'
  | 'code-panel'
  | 'terminal-panel'
  | 'outlined-card'
  | 'progress-bar'
  | 'progress-track'
  | 'progress-fill'
  | 'chart-container'
  | 'chart-bar'
  | 'marker'
  | 'vertical-marker'
  | 'horizontal-marker'
  | 'badge'
  | 'small-badge'
  | 'pill'
  | 'token-chip'
  | 'chip'
  | 'label-chip'
  | 'divider'
  | 'horizontal-divider'
  | 'vertical-divider'
  | 'horizontal-line'
  | 'vertical-line'
  | 'bracket-line'
  | 'grid-block'
  | 'code-block'
  | 'code-window'
  | 'terminal-block'
  | 'terminal-window'
  | 'straight-line'
  | 'arrow-connector'
  | 'double-arrow'
  | 'elbow-connector'
  | 'orthogonal-connector'
  | 'curved-connector'
  | 'dashed-connector'
  | 'dotted-connector'
  | 'traveling-dot'
  | 'circle-node'
  | 'circular-node'
  | 'concentric-ai-circle'
  | 'concentric-circle'
  | 'input-node'
  | 'output-node'
  | 'process-node'
  | 'llm-node'
  | 'node-card'
  | 'architecture-node'
  | 'status-dot'
  | 'indicator-marker'
  | 'timeline-dot'
  | 'moving-timeline-dot'
  | 'timeline-indicator'
  | 'technical-progress-rail'
  | 'decision-node'
  | 'warning-box'
  | 'footer-box'
  | 'highlight-box'
  | 'technical-label'
  | 'roadmap-row'
  | 'progress-row'
  | 'prompt-llm-output-strip'
  | 'token-chip-row'
  | 'chart-bar-group'
  | 'backend-flow-group'
  | 'toolbelt-strip'
  | 'ai-ring-cluster'
  | 'ai-system-node'
  | 'footer-quote-block'
  | 'connector-starter-pack';

export type TechnicalReelIconId =
  | 'python'
  | 'fastapi'
  | 'sql'
  | 'database-icon'
  | 'terminal-icon'
  | 'bash'
  | 'git'
  | 'docker'
  | 'debug'
  | 'deploy'
  | 'server'
  | 'backend'
  | 'model'
  | 'inference'
  | 'event-bus'
  | 'worker'
  | 'gateway'
  | 'api'
  | 'code-icon'
  | 'ai'
  | 'llm'
  | 'token'
  | 'context'
  | 'prompt'
  | 'output'
  | 'chart-icon'
  | 'system'
  | 'tool'
  | 'check'
  | 'warning'
  | 'play'
  | 'arrow-icon'
  | 'settings';

export type TechnicalReelLibraryId = TechnicalReelElementId | `icon-${TechnicalReelIconId}` | 'horizontal-progress-chart' | 'vertical-bar-chart' | 'probability-chart' | 'simple-axis' | 'marker-line' | 'value-label';

type TechnicalReelLibraryItem = {
  id: TechnicalReelLibraryId;
  label: string;
  description: string;
  group: 'Backgrounds' | 'Cards' | 'Nodes' | 'Progress' | 'Charts' | 'Code' | 'Terminal' | 'Connectors' | 'Indicators' | 'AI Elements' | 'Technical Icons';
};

export const TECHNICAL_REEL_ELEMENT_ITEMS: TechnicalReelLibraryItem[] = [
  { id: 'technical-background', label: 'Technical Background', description: 'Dark navy + subtle reference dot grid', group: 'Backgrounds' },
  { id: 'dark-navy-background', label: 'Dark Navy Background', description: 'Editable full-frame navy base', group: 'Backgrounds' },
  { id: 'subtle-dot-grid', label: 'Subtle Dot Grid', description: 'Small cyan/blue dot pattern', group: 'Backgrounds' },
  { id: 'technical-grid', label: 'Technical Grid', description: 'Fine engineering grid overlay', group: 'Backgrounds' },
  { id: 'soft-noise-dot-texture', label: 'Soft Noise/Dot Texture', description: 'Very subtle technical texture', group: 'Backgrounds' },
  { id: 'rectangle', label: 'Rectangle', description: 'Editable sharp technical box', group: 'Nodes' },
  { id: 'rounded-rectangle', label: 'Rounded Rectangle', description: 'Editable rounded box', group: 'Nodes' },
  { id: 'outlined-rectangle', label: 'Outlined Rectangle', description: 'Thin cyan technical box', group: 'Nodes' },
  { id: 'circle', label: 'Circle', description: 'Editable technical circle', group: 'Nodes' },
  { id: 'ellipse', label: 'Ellipse', description: 'Editable oval/circle shape', group: 'Nodes' },
  { id: 'technical-card', label: 'Technical Card', description: 'Reusable dark technical card', group: 'Cards' },
  { id: 'rounded-technical-card', label: 'Rounded Technical Card', description: 'Dark rounded card', group: 'Cards' },
  { id: 'outlined-panel', label: 'Outlined Panel', description: 'Large dark technical panel', group: 'Cards' },
  { id: 'small-label-box', label: 'Small Label Box', description: 'Uppercase label capsule', group: 'Cards' },
  { id: 'module-card', label: 'Module Card', description: 'Roadmap/module card', group: 'Cards' },
  { id: 'outlined-card', label: 'Outlined Technical Card', description: 'Thin rounded dark card', group: 'Cards' },
  { id: 'badge', label: 'Badge', description: 'Small numbered badge', group: 'Indicators' },
  { id: 'small-badge', label: 'Small Badge', description: 'Compact scene/status badge', group: 'Indicators' },
  { id: 'pill', label: 'Pill', description: 'Rounded status pill', group: 'Indicators' },
  { id: 'chip', label: 'Chip', description: 'Technical chip', group: 'Indicators' },
  { id: 'label-chip', label: 'Label Chip', description: 'Small reusable label chip', group: 'Indicators' },
  { id: 'token-chip', label: 'Token Chip', description: 'LLM token label chip', group: 'Indicators' },
  { id: 'divider', label: 'Divider', description: 'Thin separator line', group: 'Indicators' },
  { id: 'horizontal-divider', label: 'Horizontal Divider', description: 'Thin horizontal divider', group: 'Indicators' },
  { id: 'vertical-divider', label: 'Vertical Divider', description: 'Thin vertical divider', group: 'Indicators' },
  { id: 'horizontal-line', label: 'Horizontal Line', description: 'Editable horizontal line', group: 'Indicators' },
  { id: 'vertical-line', label: 'Vertical Line', description: 'Editable vertical line', group: 'Indicators' },
  { id: 'bracket-line', label: 'Bracket Line', description: 'Editable grouping bracket', group: 'Indicators' },
  { id: 'grid-block', label: 'Grid Block', description: 'Subtle technical grid block', group: 'Indicators' },
  { id: 'status-dot', label: 'Status Dot', description: 'Pulsing status indicator', group: 'Indicators' },
  { id: 'indicator-marker', label: 'Indicator Marker', description: 'Small timeline/chart marker', group: 'Indicators' },
  { id: 'timeline-dot', label: 'Timeline Dot', description: 'Roadmap timeline dot', group: 'Indicators' },
  { id: 'moving-timeline-dot', label: 'Moving Timeline Dot', description: 'Animated traveling progress dot', group: 'Indicators' },
  { id: 'timeline-indicator', label: 'Timeline Indicator', description: 'Multi-step reel indicator', group: 'Indicators' },
  { id: 'technical-progress-rail', label: 'Technical Progress Rail', description: 'Left rail with active accent dot', group: 'Progress' },
  { id: 'circle-node', label: 'Circle Node', description: 'Scale/pulse node', group: 'Nodes' },
  { id: 'circular-node', label: 'Circular Node', description: 'Outlined circle node', group: 'Nodes' },
  { id: 'concentric-circle', label: 'Concentric Circle', description: 'Pulsing rings', group: 'AI Elements' },
  { id: 'concentric-ai-circle', label: 'Concentric AI Circle', description: 'Pulsing AI rings', group: 'AI Elements' },
  { id: 'input-node', label: 'Input Node', description: 'Prompt/input diagram node', group: 'Nodes' },
  { id: 'process-node', label: 'Process Node', description: 'Middle workflow/process node', group: 'Nodes' },
  { id: 'output-node', label: 'Output Node', description: 'Response/output diagram node', group: 'Nodes' },
  { id: 'llm-node', label: 'LLM / AI Node', description: 'Outlined AI model node', group: 'AI Elements' },
  { id: 'node-card', label: 'Node Card', description: 'Architecture node card', group: 'Nodes' },
  { id: 'architecture-node', label: 'Architecture Node', description: 'System diagram node', group: 'Nodes' },
  { id: 'roadmap-row', label: 'Roadmap Row', description: 'Scene roadmap row/card', group: 'Cards' },
  { id: 'progress-row', label: 'Progress Row', description: 'Label plus animated progress', group: 'Progress' },
  { id: 'prompt-llm-output-strip', label: 'Prompt → LLM → Output Strip', description: 'Editable AI flow strip', group: 'AI Elements' },
  { id: 'token-chip-row', label: 'Token Chip Row', description: 'Editable token sequence', group: 'AI Elements' },
  { id: 'backend-flow-group', label: 'Backend Flow Group', description: 'Python → FastAPI → SQL block', group: 'AI Elements' },
  { id: 'toolbelt-strip', label: 'Toolbelt Strip', description: 'Bash/Git/Docker/Debug/Deploy row', group: 'AI Elements' },
  { id: 'ai-ring-cluster', label: 'AI Circle / Ring Cluster', description: 'Concentric AI system rings', group: 'AI Elements' },
  { id: 'ai-system-node', label: 'AI System Node', description: 'Orange AI circle with contained rings', group: 'AI Elements' },
  { id: 'footer-quote-block', label: 'Footer Quote Block', description: 'Reference reel footer text', group: 'Cards' },
  { id: 'decision-node', label: 'Decision Node', description: 'Diamond decision shape', group: 'Nodes' },
  { id: 'warning-box', label: 'Warning Box', description: 'Coral warning/status callout', group: 'Cards' },
  { id: 'footer-box', label: 'Footer Box', description: 'Bottom statement container', group: 'Cards' },
  { id: 'highlight-box', label: 'Highlight Box', description: 'Accent emphasis box', group: 'Cards' },
  { id: 'progress-track', label: 'Progress Track', description: 'Subtle technical meter track', group: 'Progress' },
  { id: 'progress-fill', label: 'Progress Fill', description: 'Animated fill segment', group: 'Progress' },
  { id: 'progress-bar', label: 'Progress Bar', description: 'Track + animated fill', group: 'Progress' },
  { id: 'chart-container', label: 'Chart Container', description: 'Dark chart frame', group: 'Charts' },
  { id: 'chart-bar', label: 'Chart Bar', description: 'Bottom-growing metric bar', group: 'Charts' },
  { id: 'marker', label: 'Marker', description: 'Dashed chart marker', group: 'Charts' },
  { id: 'vertical-marker', label: 'Vertical Marker', description: 'Vertical red/orange chart marker', group: 'Charts' },
  { id: 'horizontal-marker', label: 'Horizontal Marker', description: 'Horizontal technical marker', group: 'Charts' },
  { id: 'horizontal-progress-chart', label: 'Horizontal Progress Chart', description: 'Multiple progress rows', group: 'Charts' },
  { id: 'vertical-bar-chart', label: 'Vertical Bar Chart', description: 'Animated vertical bars', group: 'Charts' },
  { id: 'probability-chart', label: 'Probability Chart', description: 'LLM next-token chart', group: 'Charts' },
  { id: 'simple-axis', label: 'Simple Axis', description: 'Editable chart axes', group: 'Charts' },
  { id: 'marker-line', label: 'Marker Line', description: 'Probability marker', group: 'Charts' },
  { id: 'value-label', label: 'Value Label', description: 'Small chart value', group: 'Charts' },
  { id: 'chart-bar-group', label: 'Chart Bar Group', description: 'Grouped technical bars', group: 'Charts' },
  { id: 'straight-line', label: 'Connector', description: 'Direct straight connector line', group: 'Connectors' },
  { id: 'arrow-connector', label: 'Arrow', description: 'Line with arrowhead', group: 'Connectors' },
  { id: 'double-arrow', label: 'Double Arrow', description: 'Two-way connector', group: 'Connectors' },
  { id: 'elbow-connector', label: 'Elbow', description: 'Right-angle connector', group: 'Connectors' },
  { id: 'orthogonal-connector', label: 'Orthogonal', description: 'Multi-segment connector', group: 'Connectors' },
  { id: 'curved-connector', label: 'Curved', description: 'Curved connector path', group: 'Connectors' },
  { id: 'dashed-connector', label: 'Dashed', description: 'Dashed draw-in path', group: 'Connectors' },
  { id: 'dotted-connector', label: 'Dotted', description: 'Dotted flow line', group: 'Connectors' },
  { id: 'traveling-dot', label: 'Traveling Dot', description: 'Flow particle dot', group: 'Connectors' },
  { id: 'connector-starter-pack', label: 'Connector Starter Pack', description: 'Straight, arrow, dashed examples', group: 'Connectors' },
  { id: 'code-panel', label: 'Code Panel', description: 'Editable code panel shell', group: 'Code' },
  { id: 'code-window', label: 'Code Window', description: 'Code window with header', group: 'Code' },
  { id: 'code-block', label: 'Code Block', description: 'Editable code lines', group: 'Code' },
  { id: 'terminal-panel', label: 'Terminal Panel', description: 'Terminal panel shell', group: 'Terminal' },
  { id: 'terminal-window', label: 'Terminal Window', description: 'Terminal window with controls', group: 'Terminal' },
  { id: 'terminal-block', label: 'Terminal Block', description: 'Command-line panel', group: 'Terminal' },
  { id: 'technical-label', label: 'Technical Label', description: 'Small mono caption', group: 'Code' },
  ...([
    ['python', 'Python'], ['fastapi', 'FastAPI'], ['sql', 'SQL / Database'], ['database-icon', 'Database'],
    ['terminal-icon', 'Terminal'], ['bash', 'Bash'], ['git', 'Git'], ['docker', 'Docker'],
    ['debug', 'Debug'], ['deploy', 'Deploy'], ['server', 'Server'], ['backend', 'Backend'],
    ['model', 'Model'], ['inference', 'Inference'], ['event-bus', 'Event Bus'], ['worker', 'Worker'],
    ['gateway', 'Gateway'],
    ['api', 'API'], ['code-icon', 'Code'], ['ai', 'AI'], ['llm', 'LLM'],
    ['token', 'Token'], ['context', 'Context'], ['prompt', 'Prompt'], ['output', 'Output'],
    ['chart-icon', 'Chart'], ['system', 'System'], ['tool', 'Tool'], ['check', 'Check'],
    ['warning', 'Warning'], ['play', 'Play'], ['arrow-icon', 'Arrow'], ['settings', 'Settings'],
  ] as Array<[TechnicalReelIconId, string]>).map(([id, label]) => ({
    id: `icon-${id}` as const,
    label,
    description: 'Editable vector icon chip',
    group: 'Technical Icons' as const,
  })),
];

const BACKGROUND = '#070B10';
const PANEL = '#0B1118';
const PANEL_ALT = '#0F1821';
const WHITE = '#F5F8FA';
const MUTED = '#8A98A3';
const CYAN = '#30D5E8';
const TEAL = '#37E7B1';
const AMBER = '#F6C24A';
const CORAL = '#FF6F61';
const BLUE = '#4AA3FF';
const GREEN = '#4ADE80';
const PURPLE = '#A78BFA';
const HAIRLINE = '#1D2A34';
const MONO = 'Space Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const SANS = 'Manrope, Inter, Arial, sans-serif';

export const TECHNICAL_REEL_PALETTE = [
  { name: 'Near Black', color: '#070B10' },
  { name: 'Dark Navy', color: BACKGROUND },
  { name: 'Panel Navy', color: PANEL },
  { name: 'White', color: WHITE },
  { name: 'Muted Gray', color: MUTED },
  { name: 'Cyan', color: CYAN },
  { name: 'Teal', color: TEAL },
  { name: 'Blue', color: BLUE },
  { name: 'Green', color: GREEN },
  { name: 'Orange', color: '#FF9F43' },
  { name: 'Yellow', color: AMBER },
  { name: 'Coral / Red', color: CORAL },
  { name: 'Muted Purple', color: PURPLE },
] as const;

export const TECHNICAL_REEL_REFERENCE_WIDTH = 1080;
export const TECHNICAL_REEL_REFERENCE_HEIGHT = 1920;
const SAFE = {
  left: 72,
  right: 72,
  top: 96,
  bottom: 112,
};
const CONTENT_WIDTH = TECHNICAL_REEL_REFERENCE_WIDTH - SAFE.left - SAFE.right;
const CENTER_X = TECHNICAL_REEL_REFERENCE_WIDTH / 2;
export const alignLeft = (offset = 0) => SAFE.left + offset;
export const alignCenter = (width = 0) => CENTER_X - width / 2;
export const alignMiddle = (height = 0) => (TECHNICAL_REEL_REFERENCE_HEIGHT / 2) - height / 2;
export const equalGap = (totalWidth: number, itemWidth: number, count: number) => (
  count <= 1 ? 0 : (totalWidth - itemWidth * count) / (count - 1)
);
export const distributeHorizontal = (left: number, totalWidth: number, itemWidth: number, count: number) => (
  Array.from({ length: count }, (_, index) => left + index * (itemWidth + equalGap(totalWidth, itemWidth, count)))
);
export const distributeVertical = (top: number, totalHeight: number, itemHeight: number, count: number) => (
  Array.from({ length: count }, (_, index) => top + index * (itemHeight + equalGap(totalHeight, itemHeight, count)))
);
const BACKEND_NODE_LEFTS = distributeHorizontal(72, CONTENT_WIDTH, 276, 3);
const TOOL_CHIP_LEFTS = distributeHorizontal(72, CONTENT_WIDTH, 164, 5);

const id = (prefix: string) => (
  globalThis.crypto?.randomUUID ? `${prefix}-${globalThis.crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const meta = (name: string, posterRole: string, extra: Record<string, unknown> = {}) => ({
  id: id('reel'),
  name,
  posterRole,
  objectType: 'technicalReel',
  elementCategory: 'Technical Reel',
  elementTags: ['technical reel', posterRole, name.toLowerCase()],
  ...extra,
});

const text = (
  value: string,
  left: number,
  top: number,
  width: number,
  fontSize: number,
  posterRole: string,
  options: fabric.ITextboxOptions & Record<string, unknown> = {},
) => new fabric.Textbox(value, {
  left,
  top,
  width,
  fontFamily: options.fontFamily || MONO,
  fontSize,
  fontWeight: options.fontWeight || 800,
  fill: options.fill || WHITE,
  charSpacing: options.charSpacing ?? 80,
  lineHeight: options.lineHeight || 1.08,
  textAlign: options.textAlign || 'left',
  editable: true,
  objectCaching: false,
  ...meta(String(options.name || value).slice(0, 34), posterRole),
  ...options,
} as fabric.ITextboxOptions & Record<string, unknown>);

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
  posterRole: string,
  options: fabric.IRectOptions & Record<string, unknown> = {},
) => new fabric.Rect({
  left,
  top,
  width,
  height,
  rx: options.rx ?? 18,
  ry: options.ry ?? 18,
  fill: options.fill || PANEL,
  stroke: options.stroke || CYAN,
  strokeWidth: options.strokeWidth ?? 1.6,
  shadow: options.shadow ?? (['card', 'token-chip'].includes(posterRole)
    ? new fabric.Shadow({ color: 'rgba(0,0,0,0.28)', blur: 18, offsetX: 0, offsetY: 10 })
    : undefined),
  strokeUniform: true,
  objectCaching: false,
  ...meta(String(options.name || posterRole), posterRole),
  ...options,
} as fabric.IRectOptions & Record<string, unknown>);

const linePath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color = CYAN,
  dashed = false,
) => new fabric.Path(`M ${startX} ${startY} L ${endX} ${endY}`, {
  fill: '',
  stroke: color,
  strokeWidth: 4,
  strokeLineCap: 'round',
  strokeLineJoin: 'round',
  strokeDashArray: dashed ? [14, 12] : undefined,
  objectCaching: false,
  ...meta(dashed ? 'Dashed Connector' : 'Arrow Connector', 'connector', {
    teckstudioObjectType: 'diagramConnectorPath',
    diagramConnectorConfig: {
      color,
      width: 5,
      lineStyle: dashed ? 'dashed' : 'solid',
      animation: { enabled: true, type: 'draw-in', direction: 'forward-once', duration: 700, delay: 0 },
    },
    objectAnimations: [{ id: id('draw'), type: 'draw', startMs: 0, durationMs: 700, easing: 'ease-out' }],
  }),
} as fabric.IPathOptions & Record<string, unknown>);

const dot = (left: number, top: number, radius: number, color: string, posterRole = 'status-dot') => new fabric.Circle({
  left,
  top,
  radius,
  fill: color,
  stroke: `${color}66`,
  strokeWidth: 8,
  objectCaching: false,
  ...meta('Status Dot', posterRole),
} as fabric.ICircleOptions & Record<string, unknown>);

const backgroundBase = (fill = BACKGROUND) => rect(0, 0, TECHNICAL_REEL_REFERENCE_WIDTH, TECHNICAL_REEL_REFERENCE_HEIGHT, 'background', {
  name: 'Dark Navy Background',
  fill,
  stroke: fill,
  strokeWidth: 0,
  rx: 0,
  ry: 0,
});

const subtleDotGrid = (
  width = TECHNICAL_REEL_REFERENCE_WIDTH,
  height = TECHNICAL_REEL_REFERENCE_HEIGHT,
  spacing = 48,
  color = '#30D5E8',
  opacity = 0.12,
) => {
  const objects: fabric.Object[] = [];
  for (let y = 80; y < height - 80; y += spacing) {
    for (let x = 56; x < width - 56; x += spacing) {
      objects.push(new fabric.Circle({
        left: x,
        top: y,
        radius: 1.8,
        originX: 'center',
        originY: 'center',
        fill: color,
        opacity,
        objectCaching: false,
        ...meta('Subtle Dot Grid', 'background'),
      } as fabric.ICircleOptions & Record<string, unknown>));
    }
  }
  return objects;
};

const technicalGrid = (
  width = TECHNICAL_REEL_REFERENCE_WIDTH,
  height = TECHNICAL_REEL_REFERENCE_HEIGHT,
  spacing = 120,
) => {
  const objects: fabric.Object[] = [];
  for (let x = 0; x <= width; x += spacing) {
    objects.push(linePath(x, 0, x, height, '#1B3B47').set({ opacity: 0.22, posterRole: 'background', name: 'Technical Grid Line' } as Record<string, unknown>));
  }
  for (let y = 0; y <= height; y += spacing) {
    objects.push(linePath(0, y, width, y, '#1B3B47').set({ opacity: 0.22, posterRole: 'background', name: 'Technical Grid Line' } as Record<string, unknown>));
  }
  return objects;
};

const softNoiseDots = () => subtleDotGrid(TECHNICAL_REEL_REFERENCE_WIDTH, TECHNICAL_REEL_REFERENCE_HEIGHT, 42, '#7BA7B4', 0.055);

const technicalBackground = () => [
  backgroundBase(),
  ...subtleDotGrid(),
  ...technicalGrid(TECHNICAL_REEL_REFERENCE_WIDTH, TECHNICAL_REEL_REFERENCE_HEIGHT, 144).map((object) => {
    object.set({ opacity: 0.12 } as Record<string, unknown>);
    return object;
  }),
];

const progressRail = (height = 980, color = AMBER) => [
  linePath(0, 0, 0, height, '#20313A').set({ strokeWidth: 3, posterRole: 'connector', name: 'Technical Progress Rail Line' } as Record<string, unknown>),
  dot(0, 0, 9, color, 'traveling-dot').set({
    name: 'Technical Progress Rail Active Dot',
    objectAnimations: [{ id: id('indicator-travel'), type: 'indicator-travel', startMs: 0, durationMs: 1800, easing: 'ease-in-out', distance: height }],
    animationConfig: { format: 'fabric-keyframe', animationType: 'indicator-travel', startMs: 0, durationMs: 1800, easing: 'ease-in-out', direction: 'down', distance: height },
  } as Record<string, unknown>),
];

const aiSystemNode = () => [
  ring(160, 160, 152, AMBER).set({ name: 'AI System Outer Ring', posterRole: 'ring', strokeDashArray: [10, 14] } as Record<string, unknown>),
  ring(160, 160, 106, CORAL).set({ name: 'AI System Middle Ring', posterRole: 'ring', opacity: 0.72 } as Record<string, unknown>),
  new fabric.Circle({
    left: 160,
    top: 160,
    radius: 64,
    originX: 'center',
    originY: 'center',
    fill: '#FF9F4322',
    stroke: AMBER,
    strokeWidth: 3,
    strokeUniform: true,
    objectCaching: false,
    ...meta('AI System Center Circle', 'circle-node'),
  } as fabric.ICircleOptions & Record<string, unknown>),
  text('AI\\nSYSTEM', 94, 128, 132, 25, 'hero-title', { fill: WHITE, textAlign: 'center', charSpacing: 30, name: 'AI System Node Label' }),
];

const progress = (left: number, top: number, width: number, color: string, value = 1) => [
  rect(left, top, width, 12, 'progress-track', { name: 'Progress Track', fill: '#17222A', stroke: '#24323A', rx: 6, ry: 6 }),
  rect(left + (width * value) / 2, top, width * value, 12, 'progress-bar', {
    name: 'Progress Bar',
    fill: color,
    stroke: color,
    originX: 'center',
    originY: 'top',
    rx: 6,
    ry: 6,
  }),
];

const chartBar = (centerX: number, baseline: number, width: number, height: number, color: string) => rect(centerX, baseline - height / 2, width, height, 'chart-bar', {
  name: 'Chart Bar',
  fill: color,
  stroke: `${color}99`,
  originX: 'center',
  originY: 'center',
  rx: 8,
  ry: 8,
});

const chip = (label: string, left: number, top: number, color = TEAL) => [
  rect(left, top, 132, 40, 'token-chip', { name: 'Token Chip', fill: `${color}14`, stroke: color, rx: 12, ry: 12 }),
  text(label, left + 16, top + 12, 100, 13, 'token-chip', { fill: color, charSpacing: 90, name: `${label} Token` }),
];

const connectorHead = (left: number, top: number, color = CYAN, angle = 90) => new fabric.Triangle({
  left,
  top,
  width: 18,
  height: 18,
  angle,
  originX: 'center',
  originY: 'center',
  fill: color,
  stroke: color,
  strokeWidth: 1,
  objectCaching: false,
  ...meta('Connector Arrowhead', 'connector-arrowhead', { teckstudioObjectType: 'diagramArrowHead' }),
} as fabric.ITriangleOptions & Record<string, unknown>);

const connectorObjects = (
  path: string,
  color = CYAN,
  options: { dashed?: boolean; dotted?: boolean; startHead?: boolean; endHead?: boolean; endX?: number; endY?: number; startX?: number; startY?: number; endAngle?: number; startAngle?: number } = {},
) => {
  const connector = new fabric.Path(path, {
    fill: '',
    stroke: color,
    strokeWidth: 5,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    strokeDashArray: options.dotted ? [1, 12] : options.dashed ? [14, 12] : undefined,
    objectCaching: false,
    ...meta(options.dashed ? 'Dashed Connector' : options.dotted ? 'Dotted Connector' : 'Connector', 'connector', {
      teckstudioObjectType: 'diagramConnectorPath',
      diagramConnectorConfig: {
        color,
        width: 5,
        lineStyle: options.dotted ? 'dotted' : options.dashed ? 'dashed' : 'solid',
        animation: { enabled: true, type: 'draw-in', direction: 'forward-once', duration: 700, delay: 0 },
      },
      objectAnimations: [{ id: id('draw'), type: 'draw', startMs: 0, durationMs: 700, easing: 'ease-out' }],
    }),
  } as fabric.IPathOptions & Record<string, unknown>);
  const objects: fabric.Object[] = [connector];
  if (options.startHead) objects.push(connectorHead(options.startX ?? 0, options.startY ?? 0, color, options.startAngle ?? -90));
  if (options.endHead) objects.push(connectorHead(options.endX ?? 260, options.endY ?? 18, color, options.endAngle ?? 90));
  return objects;
};

const diamond = (left: number, top: number, size: number, color = AMBER) => new fabric.Rect({
  left,
  top,
  width: size,
  height: size,
  angle: 45,
  originX: 'center',
  originY: 'center',
  fill: '#111B23',
  stroke: color,
  strokeWidth: 2,
  strokeUniform: true,
  objectCaching: false,
  ...meta('Decision Node', 'card'),
} as fabric.IRectOptions & Record<string, unknown>);

const iconChip = (label: string, glyph: string, color = CYAN) => [
  new fabric.Circle({
    left: 0,
    top: 0,
    radius: 34,
    fill: `${color}18`,
    stroke: color,
    strokeWidth: 2,
    strokeUniform: true,
    objectCaching: false,
    ...meta(`${label} Icon Ring`, 'icon', { teckstudioObjectType: 'technicalReelIcon' }),
  } as fabric.ICircleOptions & Record<string, unknown>),
  text(glyph, -22, 22, 44, 23, 'icon', { fill: color, textAlign: 'center', charSpacing: 0, name: `${label} Icon Glyph` }),
  text(label.toUpperCase(), -56, 82, 112, 13, 'small-label', { fill: WHITE, textAlign: 'center', charSpacing: 80, name: `${label} Icon Label` }),
];

const codeLines = (lines: string[], left: number, top: number, width: number, color = TEAL) => {
  const objects: fabric.Object[] = [
    rect(left, top, width, 176, 'card', { name: 'Code Block', fill: '#071018', stroke: '#22333D', rx: 20, ry: 20 }),
  ];
  lines.forEach((line, index) => objects.push(text(line, left + 24, top + 24 + index * 28, width - 48, 15, 'code-line', {
    fill: index === 0 ? color : '#B5C5CD',
    fontWeight: 600,
    charSpacing: 10,
    name: `Code Line ${index + 1}`,
  })));
  return objects;
};

const titleBlock = (number: string, heading: string, subtitle: string) => [
  text(number, alignLeft(), SAFE.top, 120, 39, 'technical-section-number', { fill: TEAL, charSpacing: 150, name: `Scene ${number}` }),
  text('TECHNICAL REEL', alignLeft(), 154, 420, 20, 'small-label', { fill: MUTED, fontWeight: 700, charSpacing: 180, name: `Scene ${number} Breadcrumb` }),
  text(heading, alignLeft(), 206, CONTENT_WIDTH, 104, 'hero-title', { fontFamily: SANS, fontWeight: 900, charSpacing: 28, lineHeight: 0.82, name: `${heading} Heading` }),
  text(subtitle, alignLeft(4), 430, CONTENT_WIDTH - 56, 31, 'subtitle', { fill: MUTED, fontWeight: 600, charSpacing: 20, name: `${heading} Subtitle` }),
];

const ring = (centerX: number, centerY: number, radius: number, color: string) => new fabric.Circle({
  left: centerX,
  top: centerY,
  radius,
  originX: 'center',
  originY: 'center',
  fill: 'rgba(0,0,0,0)',
  stroke: color,
  strokeWidth: 3,
  strokeUniform: true,
  objectCaching: false,
  ...meta('AI Systems Ring', 'circle-node'),
} as fabric.ICircleOptions & Record<string, unknown>);

const footer = (value: string) => text(value, 86, 1698, 908, 30, 'footer', {
  textAlign: 'center',
  fill: WHITE,
  charSpacing: 70,
  name: 'Scene Footer',
});

const progressRailMarkers = (pageName: string) => {
  const active = Math.max(Number(pageName.slice(0, 2)) || 1, 1);
  return [1, 2, 3, 4, 5].flatMap((step, index) => {
    const top = 426 + index * 214;
    const isActive = step === active;
    return [
      dot(44, top, isActive ? 8 : 5, isActive ? AMBER : '#39515E', 'background').set({
        strokeWidth: isActive ? 5 : 2,
        opacity: isActive ? 0.96 : 0.72,
        name: `Scene Rail Marker ${step}`,
      } as Record<string, unknown>),
      text(String(step).padStart(2, '0'), 56, top - 10, 42, 11, 'small-label', {
        fill: isActive ? AMBER : '#39515E',
        charSpacing: 70,
        name: `Scene Rail Label ${step}`,
      }).set({ posterRole: 'background' } as Record<string, unknown>),
    ];
  });
};

const premiumSceneChrome = (pageName: string) => [
  linePath(44, 112, 44, 1666, '#2D5261').set({ strokeWidth: 3, opacity: 0.72, posterRole: 'background', name: 'Premium Safe Area Rail' } as Record<string, unknown>),
  dot(44, 326, 8, AMBER, 'background').set({ strokeWidth: 5, opacity: 0.95, name: 'Premium Rail Active Dot' } as Record<string, unknown>),
  ...progressRailMarkers(pageName),
  linePath(alignLeft(), 126, alignLeft(CONTENT_WIDTH), 126, HAIRLINE).set({ strokeWidth: 2, opacity: 0.68, posterRole: 'background', name: 'Premium Header Rule' } as Record<string, unknown>),
  linePath(alignLeft(), 1668, alignLeft(CONTENT_WIDTH), 1668, HAIRLINE).set({ strokeWidth: 2, opacity: 0.58, posterRole: 'background', name: 'Premium Footer Rule' } as Record<string, unknown>),
  text('PROMPT  •  TOKENS  •  EMBEDDINGS  •  ATTENTION  •  OUTPUT', 300, 112, 708, 13, 'small-label', { fill: '#52616B', textAlign: 'right', charSpacing: 88, name: `${pageName} Top Metadata` }),
  text('@TECKSTUDIO  /  AI ENGINEERING', alignLeft(), 1750, 500, 13, 'small-label', { fill: '#52616B', charSpacing: 110, name: `${pageName} Footer Metadata` }),
];

const technicalNode = (
  label: string,
  sublabel: string,
  color: string,
  role: string,
  glyph = '',
) => [
  rect(0, 0, 300, 132, role, { name: `${label} Node`, stroke: color, fill: PANEL_ALT, rx: 24, ry: 24 }),
  dot(34, 52, 9, color, 'status-dot'),
  ...(glyph ? [text(glyph, 58, 35, 56, 24, 'icon', { fill: color, charSpacing: 0, name: `${label} Node Icon` })] : []),
  text(label, glyph ? 118 : 58, 36, 170, 24, role, { fill: WHITE, name: `${label} Node Label` }),
  text(sublabel, glyph ? 118 : 58, 75, 180, 15, 'subtitle', { fill: MUTED, charSpacing: 30, name: `${label} Node Subtitle` }),
];

const bracketLine = (left: number, top: number, width: number, height: number, color = CYAN) => new fabric.Path(
  `M ${left + width} ${top} L ${left} ${top} L ${left} ${top + height} L ${left + width} ${top + height}`,
  {
    fill: '',
    stroke: color,
    strokeWidth: 4,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    objectCaching: false,
    ...meta('Bracket Line', 'connector'),
  } as fabric.IPathOptions & Record<string, unknown>,
);

const gridBlock = (width = 360, height = 220, color = '#1D2B34') => {
  const objects: fabric.Object[] = [
    rect(0, 0, width, height, 'card', { name: 'Grid Block Frame', fill: '#071018', stroke: '#22333D', rx: 18, ry: 18 }),
  ];
  for (let x = 40; x < width; x += 40) objects.push(linePath(x, 0, x, height, color));
  for (let y = 40; y < height; y += 40) objects.push(linePath(0, y, width, y, color));
  objects.forEach((object) => {
    if (object.get('name' as keyof fabric.Object) !== 'Grid Block Frame') object.set({ opacity: 0.42 } as Record<string, unknown>);
  });
  return objects;
};

const roadmapRow = (label = '01 BACKEND CORE', color = TEAL) => [
  rect(0, 0, 520, 112, 'card', { name: `${label} Roadmap Row`, stroke: color, fill: PANEL_ALT, rx: 24, ry: 24 }),
  text(label.slice(0, 2), 28, 32, 62, 22, 'technical-section-number', { fill: color, name: `${label} Number` }),
  text(label.slice(3), 108, 30, 300, 23, 'card', { fill: WHITE, name: `${label} Label` }),
  ...progress(108, 78, 300, color, 0.74),
];

const progressRow = (label = 'SYSTEM READINESS', color = CYAN) => [
  text(label, 0, 0, 300, 15, 'small-label', { fill: MUTED, name: `${label} Progress Label` }),
  ...progress(0, 38, 360, color, 0.78),
  text('78%', 382, 31, 64, 15, 'small-label', { fill: color, name: `${label} Progress Value` }),
];

const promptLlmOutputStrip = () => [
  ...technicalNode('PROMPT', 'input', TEAL, 'card', 'PR'),
  ...connectorObjects('M 310 66 L 418 66', TEAL, { endHead: true, endX: 418, endY: 66 }),
  ring(508, 66, 58, CYAN),
  text('LLM', 466, 48, 84, 23, 'card', { textAlign: 'center', name: 'LLM Strip Label' }),
  ...connectorObjects('M 596 66 L 704 66', CYAN, { endHead: true, endX: 704, endY: 66 }),
  ...technicalNode('OUTPUT', 'response', CYAN, 'card', 'OUT').map((object) => {
    (object as fabric.Object).set({ left: Number(object.left || 0) + 714, top: Number(object.top || 0) });
    return object;
  }),
];

const chartBarGroup = () => [
  rect(0, 0, 420, 240, 'card', { name: 'Chart Bar Group Frame', fill: '#071018', stroke: '#22333D' }),
  linePath(58, 188, 360, 188, '#33434D'),
  linePath(58, 52, 58, 188, '#33434D'),
  chartBar(120, 188, 42, 84, TEAL),
  chartBar(190, 188, 42, 128, AMBER),
  chartBar(260, 188, 42, 64, CYAN),
  chartBar(330, 188, 42, 112, CORAL),
];

const createScene = (pageName: string, objects: fabric.Object[], width: number, height: number): EditorPage => {
  const element = document.createElement('canvas');
  const canvas = new fabric.StaticCanvas(element, { width, height, enableRetinaScaling: false, renderOnAddRemove: false });
  canvas.setBackgroundColor(BACKGROUND, () => undefined);
  [...technicalBackground(), ...premiumSceneChrome(pageName), ...objects].forEach((object) => canvas.add(object));
  canvas.renderAll();
  const serialized = canvas.toJSON(CUSTOM_FABRIC_PROPERTIES) as Record<string, unknown>;
  serialized.width = width;
  serialized.height = height;
  serialized.background = BACKGROUND;
  canvas.dispose();
  return {
    id: id('page'),
    name: pageName,
    data: JSON.stringify(serialized),
    updatedAt: new Date().toISOString(),
  };
};

const sceneBeforeAi = (width: number, height: number) => createScene('03 — BEFORE YOU TOUCH AI', [
  text('03', alignLeft(), SAFE.top, 120, 39, 'technical-section-number', { fill: AMBER, charSpacing: 150, name: 'Scene 03' }),
  text('ENGINEERING BEFORE AI', alignLeft(), 154, 520, 20, 'small-label', { fill: MUTED, fontWeight: 700, charSpacing: 150, name: 'Scene 03 Breadcrumb' }),
  text('BEFORE YOU', alignLeft(), 206, CONTENT_WIDTH, 104, 'hero-title', { fontFamily: SANS, fontWeight: 900, charSpacing: 28, lineHeight: 0.82, name: 'Before You Heading' }),
  text('TOUCH AI', alignLeft(), 306, CONTENT_WIDTH, 104, 'hero-title', { fontFamily: SANS, fontWeight: 900, charSpacing: 28, lineHeight: 0.82, fill: AMBER, name: 'Touch AI Accent Heading' }),
  text('MASTER THE ENGINEERING\nFOUNDATION FIRST.', alignLeft(4), 444, CONTENT_WIDTH - 56, 31, 'subtitle', { fill: MUTED, fontWeight: 700, charSpacing: 36, lineHeight: 1.08, name: 'Before AI Subtitle' }),
  ...[
    ['PYTHON + API + SQL', 'backend foundations', TEAL, 582, 0.94],
    ['BASH + GIT + DOCKER', 'developer workflow', AMBER, 762, 0.86],
    ['DEBUG + DEPLOY', 'production feedback loop', CORAL, 942, 0.78],
    ['LLM FUNDAMENTALS', 'model literacy layer', TEAL, 1122, 0.72],
  ].flatMap(([label, metadata, color, top, amount], index) => [
    rect(alignLeft(), Number(top), CONTENT_WIDTH, 150, 'card', { name: `${label} Roadmap Card`, stroke: String(color), fill: PANEL_ALT, rx: 28, ry: 28, strokeWidth: 2.6 }),
    text(`0${index + 1}`, alignLeft(34), Number(top) + 44, 82, 33, 'technical-section-number', { fill: String(color), name: `${label} Index` }),
    text(String(label), alignLeft(134), Number(top) + 36, 526, 33, 'card', { fill: WHITE, name: `${label} Row Text` }),
    text(String(metadata), alignLeft(134), Number(top) + 88, 440, 17, 'small-label', { fill: MUTED, charSpacing: 70, name: `${label} Metadata` }),
    ...progress(alignLeft(626), Number(top) + 70, 278, String(color), Number(amount)),
  ]),
  ...connectorObjects('M 100 540 L 100 1302', '#2B4650', { dashed: true }),
  dot(100, 582, 7, TEAL, 'timeline-dot'),
  dot(100, 762, 7, AMBER, 'timeline-dot'),
  dot(100, 942, 7, CORAL, 'timeline-dot'),
  dot(100, 1122, 7, TEAL, 'timeline-dot'),
  rect(alignCenter(842), 1354, 842, 138, 'card', { name: 'Before AI Warning Panel', stroke: CORAL, fill: '#160F13', rx: 34, ry: 34, strokeWidth: 2.4 }),
  text('BUILD AI SYSTEMS —\nNOT JUST AI DEMOS.', alignCenter(744), 1392, 744, 38, 'footer', { fill: WHITE, textAlign: 'center', lineHeight: 0.94, name: 'Before AI Main Statement' }),
  footer('DO NOT OUTSOURCE ENGINEERING DISCIPLINE TO A MODEL.'),
], width, height);

const sceneBackendCore = (width: number, height: number) => createScene('04 — BACKEND CORE', [
  ...titleBlock('04', 'BACKEND\nCORE', 'Python → FastAPI → SQL as the production spine'),
  ...[
    ['PYTHON', TEAL, BACKEND_NODE_LEFTS[0], 'runtime layer'],
    ['FASTAPI', CYAN, BACKEND_NODE_LEFTS[1], 'service layer'],
    ['SQL', AMBER, BACKEND_NODE_LEFTS[2], 'storage layer'],
  ].flatMap(([label, color, left, sublabel]) => [
    rect(Number(left), 536, 276, 142, 'card', { name: `${label} Node`, stroke: String(color), fill: PANEL_ALT, rx: 24, ry: 24, strokeWidth: 2.3 }),
    dot(Number(left) + 36, 592, 10, String(color), 'status-dot'),
    text(String(label), Number(left) + 64, 582, 184, 29, 'card', { fill: WHITE, name: `${label} Node Text` }),
    text(String(sublabel), Number(left) + 64, 630, 166, 17, 'subtitle', { fill: MUTED, charSpacing: 22, name: `${label} Subtext` }),
  ]),
  ...connectorObjects('M 348 606 L 402 606', TEAL, { endHead: true, endX: 402, endY: 606, endAngle: 90 }),
  ...connectorObjects('M 678 606 L 732 606', CYAN, { endHead: true, endX: 732, endY: 606, endAngle: 90 }),
  rect(alignLeft(), 742, CONTENT_WIDTH, 574, 'card', { name: 'Code Panel', fill: '#071018', stroke: '#22333D', rx: 32, ry: 32, strokeWidth: 2.4 }),
  dot(alignLeft(752), 802, 8, CORAL, 'status-dot'),
  dot(alignLeft(786), 802, 8, AMBER, 'status-dot'),
  dot(alignLeft(820), 802, 8, TEAL, 'status-dot'),
  text('app/main.py', alignLeft(38), 800, 240, 20, 'small-label', { fill: TEAL, name: 'Backend Code File' }),
  ...['from fastapi import FastAPI', 'app = FastAPI()', '@app.get("/health")', 'def health():', '    return {"ok": True}'].map((line, index) => (
    text(line, alignLeft(54), 884 + index * 70, 812, 30, 'code-line', {
      fill: index === 0 ? TEAL : index === 2 ? AMBER : '#B5C5CD',
      fontWeight: 600,
      charSpacing: 8,
      name: `Backend Code Line ${index + 1}`,
    })
  )),
  linePath(alignLeft(70), 1380, alignLeft(CONTENT_WIDTH - 70), 1380, '#D6DEE6').set({ strokeWidth: 4, name: 'Backend Indicator Track' } as Record<string, unknown>),
  dot(alignLeft(70), 1380, 8, AMBER, 'traveling-dot'),
  dot(alignLeft(360), 1380, 6, '#E5EDF4', 'timeline-dot'),
  dot(alignLeft(650), 1380, 6, '#E5EDF4', 'timeline-dot'),
  dot(alignLeft(840), 1380, 10, AMBER, 'timeline-dot'),
  text('You can build reliable services,\nnot just notebooks.', alignLeft(), 1468, CONTENT_WIDTH, 30, 'subtitle', { fill: WHITE, charSpacing: 16, lineHeight: 1.18, name: 'Backend Footer Copy' }),
  footer('BACKEND SKILL TURNS AI DEMOS INTO REAL SYSTEMS.'),
], width, height);

const sceneEngineeringToolbelt = (width: number, height: number) => createScene('05 — ENGINEERING TOOLBELT', [
  ...titleBlock('05', 'ENGINEERING\nTOOLBELT', 'Shell, versioning, containers, debugging and deploys'),
  rect(alignLeft(), 514, CONTENT_WIDTH, 532, 'card', { name: 'Terminal Panel', fill: '#070A0F', stroke: '#2B353D', rx: 32, ry: 32, strokeWidth: 2.4 }),
  dot(alignLeft(42), 574, 8, CORAL, 'status-dot'),
  dot(alignLeft(76), 574, 8, AMBER, 'status-dot'),
  dot(alignLeft(110), 574, 8, TEAL, 'status-dot'),
  text('terminal', alignLeft(40), 620, 220, 18, 'small-label', { fill: MUTED, charSpacing: 80, name: 'Terminal Window Label' }),
  ...['$ git checkout -b feature/reel', '$ docker compose up', '$ curl /api/health', '$ deploy --verify', '$ tail -f logs/production.log'].map((line, index) => (
    text(line, alignLeft(54), 688 + index * 68, 820, 29, 'terminal-line', {
      fill: index === 0 ? AMBER : index === 4 ? MUTED : '#B5F7D6',
      fontWeight: 600,
      charSpacing: 0,
      name: `Terminal Line ${index + 1}`,
    })
  )),
  ...['BASH', 'GIT', 'DOCKER', 'DEBUG', 'DEPLOY'].flatMap((label, index) => {
    const left = TOOL_CHIP_LEFTS[index];
    const color = [TEAL, AMBER, CORAL, CYAN, TEAL][index];
    return [
      rect(left, 1118, 164, 84, 'token-chip', { name: `${label} Tool Chip`, stroke: color, fill: '#0E1820', rx: 22, ry: 22, strokeWidth: 2.2 }),
      text(label, left + 18, 1149, 128, 19, 'token-chip', { fill: WHITE, textAlign: 'center', name: `${label} Tool Text` }),
      ...(index < 4 ? connectorObjects(`M ${left + 170} 1160 L ${TOOL_CHIP_LEFTS[index + 1] - 8} 1160`, color, { endHead: true, endX: TOOL_CHIP_LEFTS[index + 1] - 8, endY: 1160, endAngle: 90 }) : []),
    ];
  }),
  rect(alignCenter(854), 1302, 854, 236, 'card', { name: 'Production Mindset Card', stroke: CORAL, fill: '#160F13', rx: 36, ry: 36, strokeWidth: 2.4 }),
  dot(alignCenter(854) + 62, 1384, 16, CORAL, 'status-dot'),
  text('PRODUCTION MINDSET', alignCenter(854) + 120, 1354, 650, 40, 'hero-title', { fill: WHITE, name: 'Production Mindset Heading' }),
  text('logs • reproduce • isolate • fix • verify', alignCenter(854) + 120, 1418, 650, 24, 'subtitle', { fill: MUTED, name: 'Production Mindset Subtitle' }),
  footer('THE TOOLBELT IS WHAT MAKES AI WORK SHIPPABLE.'),
], width, height);

const sceneLlmFundamentals = (width: number, height: number) => createScene('01 — LLM FUNDAMENTALS', [
  ...titleBlock('01', 'LLM\nFUNDAMENTALS', 'Prompt • Tokens • Embeddings • Attention • Output'),
  rect(alignLeft(), 524, 302, 142, 'card', { name: 'Prompt Card', stroke: TEAL, rx: 24, ry: 24, strokeWidth: 2.4 }),
  text('PROMPT / INPUT', alignLeft(34), 552, 220, 14, 'small-label', { fill: TEAL, charSpacing: 90, name: 'Prompt Input Label' }),
  text('"explain AI"', alignLeft(34), 588, 226, 26, 'card', { fill: WHITE, name: 'Prompt Label' }),
  ...connectorObjects('M 376 596 L 456 596', TEAL, { endHead: true, endX: 456, endY: 596, endAngle: 90 }),
  dot(414, 596, 8, TEAL, 'traveling-dot'),
  rect(490, 532, 150, 128, 'card', { name: 'LLM Core Node', fill: '#FF9F43', stroke: AMBER, rx: 22, ry: 22, strokeWidth: 2.2 }),
  text('LLM', 520, 578, 92, 31, 'card', { fill: BACKGROUND, textAlign: 'center', name: 'LLM Node' }),
  ...connectorObjects('M 670 596 L 806 596', '#D6DEE6', { dotted: true }),
  dot(744, 596, 8, CYAN, 'traveling-dot'),
  ...[0, 1, 2, 3, 4, 5].map((index) => dot(828 + index * 27, 596, 5, '#D6DEE6', 'timeline-dot')),
  ...['system', 'prompt', 'context', 'token', 'output', 'ai'].flatMap((label, index) => chip(label, alignLeft() + index * 140, 734, [TEAL, CYAN, AMBER, CORAL, TEAL, CYAN][index])),
  text('CONTEXT WINDOW', alignLeft(), 868, 330, 18, 'small-label', { fill: MUTED, name: 'Context Window Label' }),
  ...[0.88, 0.72, 0.58, 0.46].flatMap((amount, index) => [
    ...progress(alignLeft(), 926 + index * 56, CONTENT_WIDTH - 168, [TEAL, AMBER, CYAN, AMBER][index], amount),
    text(`ctx-0${index + 1}`, alignLeft(16), 916 + index * 56, 92, 13, 'small-label', { fill: '#51616B', charSpacing: 50, name: `Context Label ${index + 1}` }),
    text(`${Math.round(amount * 100)}%`, alignLeft(CONTENT_WIDTH - 116), 916 + index * 56, 90, 15, 'small-label', { fill: MUTED, textAlign: 'right', name: `Context Value ${index + 1}` }),
  ]),
  text('NEXT TOKEN PROBABILITY', alignLeft(), 1210, 430, 17, 'small-label', { fill: MUTED, name: 'Probability Label' }),
  rect(alignLeft(), 1248, CONTENT_WIDTH, 316, 'card', { name: 'Probability Chart Container', fill: '#070A0F', stroke: '#1E3039', rx: 26, ry: 26, strokeWidth: 1.8 }),
  linePath(alignLeft(), 1516, alignLeft(CONTENT_WIDTH - 6), 1516, '#263841').set({ strokeWidth: 3, name: 'Probability Baseline' } as Record<string, unknown>),
  linePath(alignLeft(), 1282, alignLeft(), 1516, '#263841').set({ strokeWidth: 3, name: 'Probability Axis' } as Record<string, unknown>),
  ...[
    [132, 186, TEAL, '48%'], [226, 226, CYAN, '61%'], [320, 174, AMBER, '42%'], [414, 136, TEAL, '31%'], [508, 98, CYAN, '19%'],
    [612, 58, '#53606A', ''], [688, 44, '#53606A', ''], [764, 34, '#53606A', ''],
  ].flatMap(([x, barHeight, color, value]) => [
    chartBar(alignLeft(Number(x)), 1516, 52, Number(barHeight), String(color)),
    ...(value ? [text(String(value), alignLeft(Number(x) - 28), 1542, 64, 14, 'small-label', { fill: String(color), textAlign: 'center', name: `Probability ${value}` })] : []),
  ]),
  linePath(alignLeft(426), 1268, alignLeft(426), 1518, CORAL, true),
  text('top-k marker', alignLeft(442), 1272, 140, 15, 'small-label', { fill: CORAL, name: 'Top K Marker' }),
  text('Know what the model is doing\nbefore you build on top of it.', alignLeft(), 1588, CONTENT_WIDTH, 25, 'subtitle', { fill: WHITE, charSpacing: 12, lineHeight: 1.16, name: 'LLM Explanation Copy' }),
  footer('AN LLM IS A PROBABILITY ENGINE GUIDED BY CONTEXT.'),
], width, height);

const sceneFoundationsToAi = (width: number, height: number) => createScene('02 — FOUNDATIONS → AI ENGINEERING', [
  ...titleBlock('02', 'FOUNDATIONS\n→ AI ENGINEERING', 'Roadmap from fundamentals to reliable AI systems'),
  ...[
    ['01 BACKEND CORE', TEAL, 532, 0.88],
    ['02 TOOLBELT', AMBER, 720, 0.76],
    ['03 LLM FUNDAMENTALS', CORAL, 908, 0.68],
  ].flatMap(([label, color, top, amount]) => [
    rect(alignLeft(), Number(top), CONTENT_WIDTH, 152, 'card', { name: `${label} Roadmap Card`, stroke: String(color), fill: PANEL_ALT, rx: 30, ry: 30, strokeWidth: 2.6 }),
    text(String(label).slice(0, 2), alignLeft(38), Number(top) + 45, 70, 34, 'technical-section-number', { fill: String(color), name: `${label} Roadmap Number` }),
    text(String(label).slice(3), alignLeft(126), Number(top) + 44, 460, 34, 'card', { fill: WHITE, name: `${label} Roadmap Text` }),
    text('readiness', alignLeft(654), Number(top) + 38, 170, 13, 'small-label', { fill: MUTED, charSpacing: 90, name: `${label} Readiness Label` }),
    ...progress(alignLeft(654), Number(top) + 76, 250, String(color), Number(amount)),
  ]),
  ring(CENTER_X, 1280, 258, '#244555'),
  ring(CENTER_X, 1280, 196, '#315C6B'),
  ring(CENTER_X, 1280, 132, AMBER),
  new fabric.Circle({ left: CENTER_X, top: 1280, radius: 92, originX: 'center', originY: 'center', fill: '#FF9F43', stroke: AMBER, strokeWidth: 3.5, strokeUniform: true, objectCaching: false, ...meta('AI System Filled Center', 'circle-node') } as fabric.ICircleOptions & Record<string, unknown>),
  text('AI\nSYSTEMS', alignCenter(250), 1227, 250, 40, 'hero-title', { fill: BACKGROUND, textAlign: 'center', lineHeight: 0.9, name: 'AI Systems Circle' }),
  dot(292, 1168, 8, AMBER, 'traveling-dot'),
  dot(792, 1210, 8, AMBER, 'traveling-dot'),
  ...connectorObjects('M 258 1152 C 320 1262, 395 1330, 474 1360', AMBER, { dashed: true }),
  rect(alignCenter(850), 1500, 850, 106, 'card', { name: 'Roadmap Summary Card', stroke: TEAL, fill: '#0B171E', rx: 30, ry: 30, strokeWidth: 2.2 }),
  text('FOUNDATIONS BEFORE MAGIC', alignCenter(720), 1538, 720, 30, 'hero-title', { fill: WHITE, textAlign: 'center', name: 'Roadmap Summary Text' }),
  footer('ENGINEERING FOUNDATION FIRST, MODEL MAGIC SECOND.'),
], width, height);

export const buildReferenceTechnicalReelPages = (
  width: number = TECHNICAL_REEL_REFERENCE_WIDTH,
  height: number = TECHNICAL_REEL_REFERENCE_HEIGHT,
): EditorPage[] => {
  const sceneBuilders: Record<TechnicalReelSceneKey, (sceneWidth: number, sceneHeight: number) => EditorPage> = {
    'llm-fundamentals': sceneLlmFundamentals,
    'foundations-ai-engineering': sceneFoundationsToAi,
    'before-you-touch-ai': sceneBeforeAi,
    'backend-core': sceneBackendCore,
    'engineering-toolbelt': sceneEngineeringToolbelt,
  };

  return TECHNICAL_REEL_SCENE_ORDER.map((scene) => sceneBuilders[scene.key](width, height));
};

export const createTechnicalReelElement = (elementId: TechnicalReelLibraryId): fabric.Object[] => {
  if (elementId.startsWith('icon-')) {
    const iconId = elementId.replace(/^icon-/, '') as TechnicalReelIconId;
    const iconMap: Record<TechnicalReelIconId, [string, string, string]> = {
      python: ['Python', 'PY', TEAL],
      fastapi: ['FastAPI', 'FA', CYAN],
      sql: ['SQL', 'SQL', AMBER],
      'database-icon': ['Database', 'DB', AMBER],
      'terminal-icon': ['Terminal', '$', TEAL],
      bash: ['Bash', 'SH', TEAL],
      git: ['Git', 'GIT', CORAL],
      docker: ['Docker', 'DK', CYAN],
      debug: ['Debug', 'DBG', AMBER],
      deploy: ['Deploy', 'UP', TEAL],
      server: ['Server', 'SRV', CYAN],
      backend: ['Backend', 'BE', TEAL],
      model: ['Model', 'MDL', CYAN],
      inference: ['Inference', 'INF', CORAL],
      'event-bus': ['Event Bus', 'BUS', AMBER],
      worker: ['Worker', 'WRK', TEAL],
      gateway: ['Gateway', 'GW', CYAN],
      api: ['API', 'API', CYAN],
      'code-icon': ['Code', '</>', TEAL],
      ai: ['AI', 'AI', CYAN],
      llm: ['LLM', 'LLM', CYAN],
      token: ['Token', 'TK', AMBER],
      context: ['Context', 'CTX', TEAL],
      prompt: ['Prompt', 'PR', TEAL],
      output: ['Output', 'OUT', CYAN],
      'chart-icon': ['Chart', '▥', AMBER],
      system: ['System', 'SYS', CYAN],
      tool: ['Tool', 'TL', AMBER],
      check: ['Check', '✓', TEAL],
      warning: ['Warning', '!', CORAL],
      play: ['Play', '▶', TEAL],
      'arrow-icon': ['Arrow', '→', CYAN],
      settings: ['Settings', '⚙', MUTED],
    };
    const [label, glyph, color] = iconMap[iconId];
    return iconChip(label, glyph, color);
  }
  switch (elementId) {
    case 'technical-background': return technicalBackground();
    case 'dark-navy-background': return [backgroundBase()];
    case 'subtle-dot-grid': return subtleDotGrid();
    case 'technical-grid': return technicalGrid();
    case 'soft-noise-dot-texture': return softNoiseDots();
    case 'rectangle': return [rect(0, 0, 320, 120, 'card', { name: 'Rectangle', fill: PANEL_ALT, stroke: CYAN, rx: 0, ry: 0 })];
    case 'rounded-rectangle': return [rect(0, 0, 320, 120, 'card', { name: 'Rounded Rectangle', fill: PANEL_ALT, stroke: TEAL, rx: 24, ry: 24 })];
    case 'outlined-rectangle': return [rect(0, 0, 320, 120, 'card', { name: 'Outlined Rectangle', fill: 'rgba(7,13,18,0.35)', rx: 0, ry: 0 })];
    case 'circle': return [new fabric.Circle({ left: 0, top: 0, radius: 86, fill: PANEL_ALT, stroke: CYAN, strokeWidth: 2, strokeUniform: true, objectCaching: false, ...meta('Circle', 'circle-node') } as fabric.ICircleOptions & Record<string, unknown>)];
    case 'ellipse': return [new fabric.Ellipse({ left: 0, top: 0, rx: 120, ry: 64, fill: PANEL_ALT, stroke: CYAN, strokeWidth: 2, strokeUniform: true, objectCaching: false, ...meta('Ellipse', 'circle-node') } as fabric.IEllipseOptions & Record<string, unknown>)];
    case 'technical-card': return [rect(0, 0, 360, 140, 'card', { name: 'Technical Card', fill: PANEL_ALT, stroke: CYAN, rx: 22, ry: 22 }), text('TECHNICAL CARD', 28, 42, 280, 22, 'card', { fill: WHITE })];
    case 'rounded-technical-card': return [rect(0, 0, 340, 148, 'card', { name: 'Rounded Technical Card', fill: PANEL_ALT, stroke: TEAL })];
    case 'outlined-panel': return [rect(0, 0, 520, 260, 'card', { name: 'Outlined Panel', fill: '#071018', stroke: '#22333D', rx: 28, ry: 28 }), text('OUTLINED PANEL', 30, 30, 320, 18, 'small-label', { fill: MUTED })];
    case 'small-label-box': return [rect(0, 0, 190, 38, 'small-label', { name: 'Small Label Box', fill: '#0B171E', stroke: AMBER, rx: 10, ry: 10 }), text('LABEL', 18, 12, 150, 13, 'small-label', { fill: AMBER })];
    case 'module-card': return [rect(0, 0, 420, 112, 'card', { name: 'Module Card', fill: PANEL_ALT, stroke: CYAN }), text('01 MODULE CARD', 28, 28, 320, 22, 'card', { fill: WHITE }), ...progress(28, 78, 300, TEAL, 0.76)];
    case 'code-panel': return [rect(0, 0, 440, 220, 'card', { name: 'Code Panel', fill: '#071018', stroke: '#22333D' }), text('app/main.py', 24, 20, 180, 13, 'small-label', { fill: TEAL }), text('01\\n02\\n03', 24, 60, 34, 14, 'code-line', { fill: MUTED, charSpacing: 0 }), text('from fastapi import FastAPI\\napp = FastAPI()\\n@app.get("/health")', 68, 60, 330, 15, 'code-line', { fill: '#B5F7D6', charSpacing: 0 })];
    case 'terminal-panel': return [rect(0, 0, 440, 220, 'card', { name: 'Terminal Panel', fill: '#070A0F', stroke: '#2B353D' }), dot(22, 20, 6, CORAL, 'status-dot'), dot(44, 20, 6, AMBER, 'status-dot'), dot(66, 20, 6, TEAL, 'status-dot'), text('$ git checkout feature/reel\\n$ docker build .\\n$ deploy --verify', 28, 64, 370, 16, 'terminal-line', { fill: '#B5F7D6', charSpacing: 0, name: 'Terminal Lines' })];
    case 'outlined-card': return [rect(0, 0, 320, 128, 'card', { name: 'Outlined Technical Card' })];
    case 'progress-bar': return progress(0, 0, 280, TEAL, 0.72);
    case 'progress-track': return [rect(0, 0, 280, 12, 'progress-track', { name: 'Progress Track', fill: '#17222A', stroke: '#24323A', rx: 6, ry: 6 })];
    case 'progress-fill': return [rect(0, 0, 210, 12, 'progress-bar', { name: 'Progress Fill', fill: TEAL, stroke: TEAL, rx: 6, ry: 6 })];
    case 'chart-container': return [rect(0, 0, 420, 240, 'card', { name: 'Chart Container', fill: '#071018', stroke: '#22333D' })];
    case 'chart-bar': return [chartBar(24, 120, 48, 120, AMBER)];
    case 'marker': return [linePath(0, 0, 0, 180, AMBER, true), text('MARKER', 14, 2, 90, 13, 'small-label', { fill: AMBER })];
    case 'vertical-marker': return [linePath(0, 0, 0, 180, CORAL, true), text('0.74', 14, 2, 72, 13, 'small-label', { fill: CORAL })];
    case 'horizontal-marker': return [linePath(0, 0, 240, 0, AMBER, true), text('MARKER', 82, 14, 90, 13, 'small-label', { fill: AMBER, textAlign: 'center' })];
    case 'badge': return [dot(0, 0, 24, TEAL, 'technical-section-number'), text('01', -20, 16, 40, 15, 'technical-section-number', { textAlign: 'center', fill: BACKGROUND })];
    case 'small-badge': return [rect(0, 0, 88, 34, 'technical-section-number', { name: 'Small Badge', fill: `${AMBER}18`, stroke: AMBER, rx: 10, ry: 10 }), text('01', 24, 10, 40, 13, 'technical-section-number', { fill: AMBER, textAlign: 'center' })];
    case 'pill': return [rect(0, 0, 188, 42, 'token-chip', { name: 'Pill', fill: '#0E1820', stroke: AMBER, rx: 21, ry: 21 }), text('ACTIVE', 24, 13, 132, 13, 'small-label', { fill: AMBER })];
    case 'token-chip': return chip('TOKEN', 0, 0, TEAL);
    case 'chip': return chip('CHIP', 0, 0, CYAN);
    case 'label-chip': return [rect(0, 0, 210, 40, 'small-label', { name: 'Label Chip', fill: '#0E1820', stroke: CYAN, rx: 12, ry: 12 }), text('SECTION LABEL', 18, 12, 168, 13, 'small-label', { fill: CYAN })];
    case 'divider': return [linePath(0, 0, 320, 0, '#24323A')];
    case 'horizontal-divider': return [linePath(0, 0, 360, 0, '#24323A')];
    case 'vertical-divider': return [linePath(0, 0, 0, 220, '#24323A')];
    case 'horizontal-line': return [linePath(0, 0, 260, 0, TEAL)];
    case 'vertical-line': return [linePath(0, 0, 0, 220, TEAL)];
    case 'bracket-line': return [bracketLine(0, 0, 78, 220, CYAN)];
    case 'grid-block': return gridBlock();
    case 'code-block': return codeLines(['const prompt = buildContext();', 'const reply = await model(prompt);', 'stream(reply);'], 0, 0, 420, TEAL);
    case 'code-window': return [
      rect(0, 0, 460, 250, 'card', { name: 'Code Window', fill: '#071018', stroke: '#22333D' }),
      text('model_router.ts', 28, 22, 190, 13, 'small-label', { fill: TEAL }),
      text('01\\n02\\n03', 28, 68, 34, 14, 'code-line', { fill: MUTED, charSpacing: 0 }),
      text('const route = chooseModel(ctx);\\nconst tokens = await infer(route);\\nreturn stream(tokens);', 72, 68, 342, 15, 'code-line', { fill: '#B5F7D6', charSpacing: 0, name: 'Code Window Lines' }),
    ];
    case 'terminal-block': return codeLines(['$ docker compose up', '$ npm run build', '$ deploy --verify'], 0, 0, 420, AMBER);
    case 'terminal-window': return [
      rect(0, 0, 460, 250, 'card', { name: 'Terminal Window', fill: '#070A0F', stroke: '#2B353D' }),
      dot(28, 26, 6, CORAL, 'status-dot'),
      dot(52, 26, 6, AMBER, 'status-dot'),
      dot(76, 26, 6, TEAL, 'status-dot'),
      text('$ git status\\n$ docker compose up\\n$ ffmpeg -i frames.mp4', 30, 74, 400, 16, 'terminal-line', { fill: '#B5F7D6', charSpacing: 0, name: 'Terminal Window Lines' }),
    ];
    case 'straight-line': return connectorObjects('M 0 18 L 260 18', CYAN);
    case 'arrow-connector': return connectorObjects('M 0 18 L 260 18', CYAN, { endHead: true, endX: 260, endY: 18 });
    case 'double-arrow': return connectorObjects('M 0 18 L 260 18', CYAN, { startHead: true, startX: 0, startY: 18, endHead: true, endX: 260, endY: 18 });
    case 'elbow-connector': return connectorObjects('M 0 18 L 130 18 L 130 92 L 260 92', TEAL, { endHead: true, endX: 260, endY: 92 });
    case 'orthogonal-connector': return connectorObjects('M 0 18 L 86 18 L 86 92 L 174 92 L 174 18 L 260 18', CYAN, { endHead: true, endX: 260, endY: 18 });
    case 'curved-connector': return connectorObjects('M 0 72 C 80 0 180 0 260 72', CYAN, { endHead: true, endX: 260, endY: 72 });
    case 'dashed-connector': return [linePath(0, 18, 260, 18, CYAN, true)];
    case 'dotted-connector': return connectorObjects('M 0 18 L 260 18', CYAN, { dotted: true, endHead: true, endX: 260, endY: 18 });
    case 'traveling-dot': return [dot(0, 0, 10, TEAL, 'traveling-dot')];
    case 'connector-starter-pack': return [
      ...connectorObjects('M 0 18 L 260 18', CYAN),
      ...connectorObjects('M 0 82 L 260 82', TEAL, { endHead: true, endX: 260, endY: 82 }),
      ...connectorObjects('M 0 146 L 260 146', AMBER, { dashed: true, endHead: true, endX: 260, endY: 146 }),
    ];
    case 'circle-node': return [dot(0, 0, 58, CYAN, 'circle-node')];
    case 'circular-node': return [dot(0, 0, 58, CYAN, 'circle-node'), text('NODE', -44, 48, 88, 15, 'card', { textAlign: 'center' })];
    case 'concentric-ai-circle': return [ring(86, 86, 86, CYAN), ring(86, 86, 52, TEAL), ring(86, 86, 24, AMBER), text('AI', 34, 68, 104, 30, 'hero-title', { textAlign: 'center' })];
    case 'concentric-circle': return [ring(86, 86, 86, CYAN), ring(86, 86, 52, TEAL), ring(86, 86, 24, AMBER)];
    case 'input-node': return technicalNode('INPUT', 'prompt / user', TEAL, 'card', 'IN');
    case 'process-node': return technicalNode('PROCESS', 'transform / route', AMBER, 'card', 'PR');
    case 'output-node': return technicalNode('OUTPUT', 'response', CYAN, 'card', 'OUT');
    case 'llm-node': return [ring(86, 86, 86, CYAN), text('LLM', 30, 68, 112, 30, 'card', { fill: WHITE, textAlign: 'center', name: 'LLM Node Label' }), text('model node', 24, 112, 124, 14, 'subtitle', { fill: MUTED, textAlign: 'center', charSpacing: 20, name: 'LLM Node Subtitle' })];
    case 'node-card': return technicalNode('NODE', 'service / module', CYAN, 'card', 'ND');
    case 'architecture-node': return technicalNode('API GATEWAY', 'auth / rate limits', CYAN, 'card', 'GW');
    case 'status-dot': return [dot(0, 0, 12, CORAL, 'status-dot')];
    case 'indicator-marker': return [dot(0, 0, 9, AMBER, 'status-dot'), linePath(0, 24, 0, 126, AMBER, true), text('MARKER', 14, 24, 90, 13, 'small-label', { fill: AMBER })];
    case 'timeline-dot': return [dot(0, 0, 11, TEAL, 'status-dot')];
    case 'moving-timeline-dot': return [dot(0, 0, 11, AMBER, 'traveling-dot').set({
      name: 'Moving Timeline Dot',
      objectAnimations: [{ id: id('indicator-travel'), type: 'indicator-travel', startMs: 0, durationMs: 1400, easing: 'ease-in-out', distance: 220 }],
      animationConfig: { format: 'fabric-keyframe', animationType: 'indicator-travel', startMs: 0, durationMs: 1400, easing: 'ease-in-out', direction: 'right', distance: 220 },
    } as Record<string, unknown>)];
    case 'timeline-indicator': return [linePath(0, 20, 260, 20, TEAL), dot(0, 10, 10, TEAL, 'status-dot'), dot(125, 10, 10, AMBER, 'status-dot'), dot(250, 10, 10, CYAN, 'status-dot')];
    case 'technical-progress-rail': return progressRail();
    case 'roadmap-row': return roadmapRow();
    case 'progress-row': return progressRow();
    case 'prompt-llm-output-strip': return promptLlmOutputStrip();
    case 'token-chip-row': return ['system', 'prompt', 'context', 'output'].flatMap((label, index) => chip(label, index * 152, 0, [TEAL, CYAN, AMBER, CORAL][index]));
    case 'backend-flow-group': return [
      ...technicalNode('PYTHON', 'service', TEAL, 'card', 'PY'),
      ...connectorObjects('M 310 66 L 386 66', TEAL, { endHead: true, endX: 386, endY: 66 }),
      ...technicalNode('FASTAPI', 'gateway', CYAN, 'card', 'FA').map((object) => {
        (object as fabric.Object).set({ left: Number(object.left || 0) + 404 });
        return object;
      }),
      ...connectorObjects('M 714 66 L 790 66', CYAN, { endHead: true, endX: 790, endY: 66 }),
      ...technicalNode('SQL', 'database', AMBER, 'card', 'DB').map((object) => {
        (object as fabric.Object).set({ left: Number(object.left || 0) + 808 });
        return object;
      }),
    ];
    case 'toolbelt-strip': return ['BASH', 'GIT', 'DOCKER', 'DEBUG', 'DEPLOY'].flatMap((label, index) => [
      rect(index * 162, 0, 132, 58, 'token-chip', { name: `${label} Toolbelt Chip`, stroke: [TEAL, CORAL, CYAN, AMBER, TEAL][index], fill: '#0E1820', rx: 18, ry: 18 }),
      text(label, index * 162 + 18, 20, 96, 14, 'token-chip', { fill: WHITE, textAlign: 'center', name: `${label} Toolbelt Label` }),
      ...(index < 4 ? connectorObjects(`M ${index * 162 + 136} 29 L ${index * 162 + 158} 29`, [TEAL, CORAL, CYAN, AMBER][index]) : []),
    ]);
    case 'ai-ring-cluster': return [ring(140, 140, 140, CYAN), ring(140, 140, 92, TEAL), ring(140, 140, 42, AMBER), text('AI\\nSYSTEMS', 68, 100, 144, 28, 'hero-title', { textAlign: 'center', name: 'AI Ring Cluster Label' })];
    case 'ai-system-node': return aiSystemNode();
    case 'footer-quote-block': return [rect(0, 0, 720, 86, 'card', { name: 'Footer Quote Block', stroke: '#22333D', fill: '#071018', rx: 24, ry: 24 }), text('ENGINEERING FOUNDATION FIRST, MODEL MAGIC SECOND.', 34, 28, 650, 19, 'footer', { textAlign: 'center', fill: WHITE })];
    case 'decision-node': return [diamond(0, 0, 92, AMBER), text('?', -36, -10, 72, 26, 'card', { fill: AMBER, textAlign: 'center', charSpacing: 0 })];
    case 'warning-box': return [rect(0, 0, 460, 96, 'card', { name: 'Warning Box', fill: '#201014', stroke: CORAL, rx: 24, ry: 24 }), dot(36, 36, 10, CORAL, 'status-dot'), text('WARNING TEXT', 72, 34, 330, 20, 'card', { fill: WHITE })];
    case 'footer-box': return [rect(0, 0, 720, 96, 'footer', { name: 'Footer Box', fill: '#071018', stroke: '#22333D', rx: 24, ry: 24 }), text('BOTTOM TECHNICAL STATEMENT', 38, 34, 644, 20, 'footer', { fill: WHITE, textAlign: 'center' })];
    case 'highlight-box': return [rect(0, 0, 320, 82, 'card', { name: 'Highlight Box', fill: `${CORAL}18`, stroke: CORAL })];
    case 'technical-label': return [text('TECHNICAL LABEL', 0, 0, 260, 14, 'small-label', { fill: TEAL })];
    case 'horizontal-progress-chart': return [rect(0, 0, 420, 170, 'card', { name: 'Horizontal Progress Chart', fill: '#071018', stroke: '#22333D' }), text('SYSTEM READINESS', 24, 22, 260, 14, 'small-label', { fill: MUTED }), ...progress(28, 72, 320, TEAL, 0.82), ...progress(28, 112, 280, AMBER, 0.66)];
    case 'vertical-bar-chart': return [rect(0, 0, 420, 240, 'card', { name: 'Vertical Bar Chart', fill: '#071018', stroke: '#22333D' }), linePath(60, 188, 360, 188, '#33434D'), linePath(60, 52, 60, 188, '#33434D'), chartBar(120, 188, 42, 84, TEAL), chartBar(190, 188, 42, 128, AMBER), chartBar(260, 188, 42, 64, CYAN), chartBar(330, 188, 42, 112, CORAL)];
    case 'probability-chart': return [rect(0, 0, 460, 250, 'card', { name: 'Probability Chart', fill: '#071018', stroke: '#22333D' }), text('NEXT TOKEN PROBABILITY', 28, 24, 320, 14, 'small-label', { fill: MUTED }), chartBar(90, 204, 44, 88, TEAL), chartBar(160, 204, 44, 132, AMBER), chartBar(230, 204, 44, 68, CYAN), chartBar(300, 204, 44, 112, CORAL), linePath(150, 56, 150, 210, AMBER, true), text('0.74', 166, 60, 72, 13, 'small-label', { fill: AMBER })];
    case 'chart-bar-group': return chartBarGroup();
    case 'simple-axis': return [linePath(0, 160, 300, 160, '#33434D'), linePath(0, 0, 0, 160, '#33434D')];
    case 'marker-line': return [linePath(0, 0, 0, 180, AMBER, true)];
    case 'value-label': return [text('0.74', 0, 0, 90, 14, 'small-label', { fill: AMBER })];
    default: return [];
  }
};
