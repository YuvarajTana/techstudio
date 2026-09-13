import { fabric } from 'fabric';
import { createStandaloneDiagramArrow } from './diagramConnectors';
import type { DiagramConnectorAnimationConfig } from './architectureDiagramTypes';

export const TECHNICAL_INFOGRAPHIC_TEMPLATE_NAME = 'Technical AI Workflow Infographic';
export const PROMPT_CONTEXT_HARNESS_TEMPLATE_NAME = 'Prompt Context Harness Infographic';
export const TECHNICAL_DARK_BACKGROUND = '#080D0B';
export const TECHNICAL_PANEL_FILL = '#0D1413';
export const TECHNICAL_PANEL_ALT_FILL = '#101619';
export const TECHNICAL_TEXT_FILL = '#F4F7F5';
export const TECHNICAL_MUTED_FILL = '#8D9A96';
export const TECHNICAL_MONO_FONT = 'Space Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export type TechnicalAccentId = 'green' | 'blue' | 'purple' | 'amber' | 'red' | 'cyan';
export type TechnicalElementId =
  | 'outlinePanel'
  | 'sectionContainer'
  | 'technicalCard'
  | 'titleDivider'
  | 'horizontalDivider'
  | 'verticalDivider'
  | 'numberBadge'
  | 'circleBadge'
  | 'squareBadge'
  | 'roundedNode'
  | 'flowchartNode'
  | 'decisionDiamond'
  | 'rightArrow'
  | 'leftArrow'
  | 'downArrow'
  | 'connectorLine'
  | 'dashedConnector'
  | 'elbowConnector'
  | 'statusDot'
  | 'accentDot'
  | 'indicator'
  | 'technicalChip'
  | 'tag'
  | 'labelPill'
  | 'contextWindow'
  | 'toolBox'
  | 'memoryBox'
  | 'promptBox'
  | 'answerBox'
  | 'successNode'
  | 'warningNode'
  | 'processNode'
  | 'cornerAccent'
  | 'borderAccent'
  | 'underlineAccent';
export type TechnicalComponentId = 'section' | 'inputStack' | 'outputStack' | 'processFlow';

export const TECHNICAL_ACCENTS: Array<{ id: TechnicalAccentId; label: string; color: string; soft: string }> = [
  { id: 'green', label: 'Green Technical', color: '#38F08C', soft: 'rgba(56, 240, 140, 0.12)' },
  { id: 'blue', label: 'Blue Technical', color: '#38BDF8', soft: 'rgba(56, 189, 248, 0.12)' },
  { id: 'purple', label: 'Purple Technical', color: '#A78BFA', soft: 'rgba(167, 139, 250, 0.12)' },
  { id: 'amber', label: 'Amber Technical', color: '#FBBF24', soft: 'rgba(251, 191, 36, 0.12)' },
  { id: 'red', label: 'Red Warning', color: '#FB7185', soft: 'rgba(251, 113, 133, 0.12)' },
  { id: 'cyan', label: 'Cyan Digital', color: '#22D3EE', soft: 'rgba(34, 211, 238, 0.12)' },
];

export const TECHNICAL_ELEMENT_ITEMS: Array<{ id: TechnicalElementId; label: string; group: string }> = [
  { id: 'sectionContainer', label: 'Section Panel', group: 'Required' },
  { id: 'technicalCard', label: 'Technical Card', group: 'Required' },
  { id: 'titleDivider', label: 'Title Divider', group: 'Panels' },
  { id: 'horizontalDivider', label: 'Horizontal Divider', group: 'Panels' },
  { id: 'verticalDivider', label: 'Vertical Divider', group: 'Panels' },
  { id: 'numberBadge', label: 'Number Badge', group: 'Badges' },
  { id: 'circleBadge', label: 'Circle Badge', group: 'Badges' },
  { id: 'squareBadge', label: 'Square Badge', group: 'Badges' },
  { id: 'roundedNode', label: 'Input Node', group: 'Required' },
  { id: 'flowchartNode', label: 'Process Node', group: 'Required' },
  { id: 'decisionDiamond', label: 'Decision Diamond', group: 'Required' },
  { id: 'rightArrow', label: 'Arrow', group: 'Required' },
  { id: 'leftArrow', label: 'Left Arrow', group: 'Connectors' },
  { id: 'downArrow', label: 'Down Arrow', group: 'Connectors' },
  { id: 'connectorLine', label: 'Connector', group: 'Required' },
  { id: 'dashedConnector', label: 'Dashed Connector', group: 'Required' },
  { id: 'elbowConnector', label: 'Elbow Connector', group: 'Connectors' },
  { id: 'statusDot', label: 'Status Dot', group: 'Required' },
  { id: 'accentDot', label: 'Accent Dot', group: 'Indicators' },
  { id: 'indicator', label: 'Small Indicator', group: 'Indicators' },
  { id: 'technicalChip', label: 'Technical Chip', group: 'Chips' },
  { id: 'tag', label: 'Tag', group: 'Chips' },
  { id: 'labelPill', label: 'Label Pill', group: 'Chips' },
  { id: 'contextWindow', label: 'Context Window Box', group: 'AI Boxes' },
  { id: 'toolBox', label: 'Tool Box', group: 'AI Boxes' },
  { id: 'memoryBox', label: 'Memory Box', group: 'AI Boxes' },
  { id: 'promptBox', label: 'Prompt Box', group: 'AI Boxes' },
  { id: 'answerBox', label: 'Output Node', group: 'Required' },
  { id: 'successNode', label: 'Success Node', group: 'States' },
  { id: 'warningNode', label: 'Warning Node', group: 'States' },
  { id: 'processNode', label: 'Process Node', group: 'States' },
  { id: 'cornerAccent', label: 'Corner Accent', group: 'Accents' },
  { id: 'borderAccent', label: 'Border Accent', group: 'Accents' },
  { id: 'underlineAccent', label: 'Underline Accent', group: 'Accents' },
];

export const TECHNICAL_COMPONENT_ITEMS: Array<{ id: TechnicalComponentId; label: string; description: string }> = [
  { id: 'section', label: 'Number + Heading Section', description: 'Badge, heading, body, divider' },
  { id: 'inputStack', label: 'Input Stack', description: 'Prompt, memory, tools, context' },
  { id: 'outputStack', label: 'Output Stack', description: 'Answer, tool call, result cards' },
  { id: 'processFlow', label: 'Process Flow', description: 'Input → process → decision → output' },
];

export function getTechnicalAccent(accentId: TechnicalAccentId) {
  return TECHNICAL_ACCENTS.find((accent) => accent.id === accentId) || TECHNICAL_ACCENTS[0];
}

const createId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const objectAnimation = (
  type: string,
  startMs: number,
  durationMs = 700,
  loop = false,
) => [{
  id: createId('object-animation'),
  type,
  startMs,
  durationMs,
  delayMs: 0,
  easing: 'ease-out',
  loop,
}];

const connectorAnimation = (
  type: DiagramConnectorAnimationConfig['type'],
  startMs: number,
  color: string,
  loop = false,
): DiagramConnectorAnimationConfig => ({
  enabled: true,
  type,
  direction: loop ? 'forward' : 'forward-once',
  duration: type === 'draw-in' ? 850 : 1600,
  delay: startMs,
  startDelay: 0,
  repeatDelay: 250,
  loop,
  flowColor: color,
  baseColor: color,
  opacity: 1,
  particleSize: 5,
  particleCount: 4,
  pulseSize: 7,
  glowEnabled: true,
  glowColor: color,
  glowStrength: 14,
  targetPulse: true,
  arrowheadStyle: 'arrow',
  arrowheadSize: 12,
});

const withAnimation = <T extends fabric.Object>(object: T, type: string, startMs: number, durationMs = 700, loop = false) => {
  object.set({ objectAnimations: objectAnimation(type, startMs, durationMs, loop) } as unknown as Partial<T>);
  return object;
};

const metadata = (name: string, role = 'technicalInfographic') => ({
  id: createId('technical-infographic'),
  name,
  objectType: role,
  teckstudioObjectType: role,
  elementCategory: 'Technical / Infographic',
  elementTags: ['technical', 'infographic', role],
  elementEditable: true,
  selectable: true,
  evented: true,
  hasControls: true,
});

const makeText = (text: string, options: fabric.ITextboxOptions & Record<string, unknown> = {}) => new fabric.Textbox(text, {
  width: 260,
  fontFamily: TECHNICAL_MONO_FONT,
  fontSize: 16,
  fontWeight: '600',
  fill: TECHNICAL_TEXT_FILL,
  lineHeight: 1.2,
  splitByGrapheme: true,
  ...options,
});

const makePanel = (accentId: TechnicalAccentId, options: fabric.IRectOptions & Record<string, unknown> = {}) => {
  const accent = getTechnicalAccent(accentId);
  return new fabric.Rect({
    width: 260,
    height: 120,
    rx: 14,
    ry: 14,
    fill: TECHNICAL_PANEL_FILL,
    stroke: accent.color,
    strokeWidth: 1.4,
    opacity: 0.96,
    shadow: '0 14px 26px rgba(0,0,0,0.26)',
    ...options,
  });
};

const offsetObject = (object: fabric.Object, leftOffset: number, topOffset: number) => {
  object.set({ left: (object.left || 0) + leftOffset, top: (object.top || 0) + topOffset } as Record<string, unknown>);
  return object;
};

const badge = (accentId: TechnicalAccentId, label: string, shape: 'rounded' | 'circle' | 'square' = 'rounded') => {
  const accent = getTechnicalAccent(accentId);
  const isCircle = shape === 'circle';
  const isSquare = shape === 'square';
  const base = isCircle
    ? new fabric.Circle({ left: 0, top: 0, radius: 34, fill: accent.soft, stroke: accent.color, strokeWidth: 1.5, ...metadata('Technical Circle Badge') })
    : new fabric.Rect({ left: 0, top: 0, width: isSquare ? 68 : 92, height: 58, rx: isSquare ? 12 : 29, ry: isSquare ? 12 : 29, fill: accent.soft, stroke: accent.color, strokeWidth: 1.5, ...metadata('Technical Badge') });
  const text = makeText(label, { left: 0, top: isCircle ? 21 : 18, width: isCircle ? 68 : isSquare ? 68 : 92, fontSize: 16, fontWeight: '800', charSpacing: 120, fill: accent.color, textAlign: 'center', ...metadata('Badge Label', 'technicalInfographicText') });
  return [base, text];
};

const node = (accentId: TechnicalAccentId, label: string, variant: 'rounded' | 'rect' | 'diamond' | 'success' | 'warning' | 'process' = 'rounded') => {
  const accent = getTechnicalAccent(accentId);
  if (variant === 'diamond') {
    const diamond = new fabric.Polygon([
      { x: 80, y: 0 }, { x: 160, y: 54 }, { x: 80, y: 108 }, { x: 0, y: 54 },
    ], { left: 0, top: 0, fill: TECHNICAL_PANEL_ALT_FILL, stroke: accent.color, strokeWidth: 1.4, ...metadata('Decision Diamond') });
    const text = makeText(label, { left: 22, top: 39, width: 116, fontSize: 13, fontWeight: '800', charSpacing: 80, fill: TECHNICAL_TEXT_FILL, textAlign: 'center', ...metadata('Decision Label', 'technicalInfographicText') });
    return [diamond, text];
  }
  const color = variant === 'success' ? '#38F08C' : variant === 'warning' ? '#FBBF24' : accent.color;
  const rect = makePanel(accentId, {
    left: 0,
    top: 0,
    width: variant === 'rect' ? 220 : 210,
    height: 82,
    rx: variant === 'rect' ? 8 : 16,
    ry: variant === 'rect' ? 8 : 16,
    stroke: color,
    fill: variant === 'success' ? 'rgba(56,240,140,0.10)' : variant === 'warning' ? 'rgba(251,191,36,0.10)' : TECHNICAL_PANEL_ALT_FILL,
    ...metadata(`${label} Node`),
  });
  const dot = new fabric.Circle({ left: 18, top: 29, radius: 8, fill: color, ...metadata('Node Status Dot') });
  const text = makeText(label, { left: 40, top: 25, width: 150, fontSize: 14, fontWeight: '800', charSpacing: 90, fill: TECHNICAL_TEXT_FILL, ...metadata('Node Label', 'technicalInfographicText') });
  return [rect, dot, text];
};

const arrow = (
  accentId: TechnicalAccentId,
  direction: 'right' | 'left' | 'down',
  animationType: DiagramConnectorAnimationConfig['type'] = 'draw-in',
  startMs = 0,
  loop = false,
) => {
  const accent = getTechnicalAccent(accentId);
  const angle = direction === 'left' ? 180 : direction === 'down' ? 90 : 0;
  const arrowGroup = createStandaloneDiagramArrow({
    name: `${direction} Technical Connector`,
    color: accent.color,
    width: 3,
    opacity: animationType === 'draw-in' ? 0.08 : 0.32,
    endArrow: 'arrow',
    angle,
    animation: connectorAnimation(animationType, startMs, accent.color, loop),
  });
  arrowGroup.set({ ...metadata(`${direction} Technical Connector`, 'diagramArrow') } as Record<string, unknown>);
  return [arrowGroup];
};

const box = (accentId: TechnicalAccentId, title: string, label: string, color?: string) => {
  const accent = getTechnicalAccent(accentId);
  const boxColor = color || accent.color;
  return [
    makePanel(accentId, { left: 0, top: 0, width: 250, height: 104, stroke: boxColor, fill: TECHNICAL_PANEL_ALT_FILL, ...metadata(`${title} Box`) }),
    makeText(label, { left: 20, top: 18, width: 170, fontSize: 11, fontWeight: '800', charSpacing: 180, fill: boxColor, ...metadata(`${title} Label`, 'technicalInfographicText') }),
    makeText(title, { left: 20, top: 48, width: 205, fontSize: 20, fontWeight: '800', charSpacing: 50, fill: TECHNICAL_TEXT_FILL, ...metadata(`${title} Title`, 'technicalInfographicText') }),
  ];
};

export function createTechnicalElement(elementId: TechnicalElementId, accentId: TechnicalAccentId) {
  const accent = getTechnicalAccent(accentId);
  const lineBase = { stroke: accent.color, strokeWidth: 2, strokeLineCap: 'round' as const };
  const builders: Record<TechnicalElementId, () => fabric.Object[]> = {
    outlinePanel: () => [makePanel(accentId, { width: 360, height: 210, fill: 'transparent', ...metadata('Rounded Outline Panel') })],
    sectionContainer: () => [makePanel(accentId, { width: 420, height: 160, fill: TECHNICAL_PANEL_FILL, ...metadata('Section Panel') })],
    technicalCard: () => [makePanel(accentId, { width: 300, height: 124, fill: TECHNICAL_PANEL_ALT_FILL, ...metadata('Technical Card') }), makeText('TECHNICAL CARD', { left: 22, top: 26, width: 250, fontSize: 17, fontWeight: '800', charSpacing: 90, fill: TECHNICAL_TEXT_FILL, ...metadata('Technical Card Text', 'technicalInfographicText') }), makeText('Editable technical content block', { left: 22, top: 62, width: 244, fontSize: 12, fontWeight: '500', fill: TECHNICAL_MUTED_FILL, ...metadata('Technical Card Caption', 'technicalInfographicText') })],
    titleDivider: () => [new fabric.Line([0, 0, 260, 0], { ...lineBase, strokeWidth: 4, ...metadata('Title Divider') })],
    horizontalDivider: () => [new fabric.Line([0, 0, 300, 0], { ...lineBase, strokeWidth: 1.2, opacity: 0.75, ...metadata('Horizontal Divider') })],
    verticalDivider: () => [new fabric.Line([0, 0, 0, 180], { ...lineBase, strokeWidth: 1.2, opacity: 0.75, ...metadata('Vertical Divider') })],
    numberBadge: () => badge(accentId, '01', 'rounded'),
    circleBadge: () => badge(accentId, '02', 'circle'),
    squareBadge: () => badge(accentId, '03', 'square'),
    roundedNode: () => node(accentId, 'INPUT', 'rounded'),
    flowchartNode: () => node(accentId, 'PROCESS', 'rect'),
    decisionDiamond: () => node(accentId, 'DECIDE', 'diamond'),
    rightArrow: () => arrow(accentId, 'right'),
    leftArrow: () => arrow(accentId, 'left'),
    downArrow: () => arrow(accentId, 'down'),
    connectorLine: () => [new fabric.Line([0, 0, 210, 0], { ...lineBase, ...metadata('Connector Line') })],
    dashedConnector: () => [new fabric.Line([0, 0, 210, 0], { ...lineBase, strokeDashArray: [10, 8], ...metadata('Dashed Connector') })],
    elbowConnector: () => [new fabric.Path('M 0 0 L 120 0 L 120 84', { fill: 'transparent', ...lineBase, strokeDashArray: [8, 7], ...metadata('Elbow Connector') })],
    statusDot: () => [new fabric.Circle({ radius: 10, fill: accent.color, ...metadata('Status Dot') })],
    accentDot: () => [new fabric.Circle({ radius: 6, fill: accent.color, opacity: 0.75, ...metadata('Accent Dot') })],
    indicator: () => [new fabric.Rect({ width: 44, height: 10, rx: 5, ry: 5, fill: accent.color, opacity: 0.9, ...metadata('Small Indicator') })],
    technicalChip: () => [new fabric.Rect({ width: 150, height: 38, rx: 19, ry: 19, fill: accent.soft, stroke: accent.color, strokeWidth: 1, ...metadata('Technical Chip') }), makeText('TECH CHIP', { left: 16, top: 11, width: 118, fontSize: 11, fontWeight: '800', charSpacing: 120, fill: accent.color, textAlign: 'center', ...metadata('Technical Chip Text', 'technicalInfographicText') })],
    tag: () => [new fabric.Rect({ width: 112, height: 34, rx: 8, ry: 8, fill: TECHNICAL_PANEL_FILL, stroke: accent.color, strokeWidth: 1, ...metadata('Tag') }), makeText('TAG', { left: 14, top: 10, width: 84, fontSize: 11, fontWeight: '800', charSpacing: 180, fill: accent.color, textAlign: 'center', ...metadata('Tag Text', 'technicalInfographicText') })],
    labelPill: () => [new fabric.Rect({ width: 176, height: 34, rx: 17, ry: 17, fill: accent.soft, stroke: accent.color, strokeWidth: 1, ...metadata('Label Pill') }), makeText('STATUS READY', { left: 16, top: 10, width: 144, fontSize: 10, fontWeight: '800', charSpacing: 150, fill: accent.color, textAlign: 'center', ...metadata('Label Pill Text', 'technicalInfographicText') })],
    contextWindow: () => box(accentId, 'Context Window', 'CONTEXT'),
    toolBox: () => box(accentId, 'Tools', 'TOOLBOX', '#38BDF8'),
    memoryBox: () => box(accentId, 'Memory', 'STORE', '#A78BFA'),
    promptBox: () => box(accentId, 'Prompt', 'INPUT', '#38F08C'),
    answerBox: () => box(accentId, 'Answer', 'OUTPUT', '#FBBF24'),
    successNode: () => node(accentId, 'SUCCESS', 'success'),
    warningNode: () => node(accentId, 'WARNING', 'warning'),
    processNode: () => node(accentId, 'PROCESS', 'process'),
    cornerAccent: () => [new fabric.Path('M 0 44 L 0 0 L 44 0', { fill: 'transparent', ...lineBase, strokeWidth: 4, ...metadata('Corner Accent') })],
    borderAccent: () => [new fabric.Rect({ width: 240, height: 88, rx: 16, ry: 16, fill: 'transparent', stroke: accent.color, strokeWidth: 2, strokeDashArray: [14, 8], ...metadata('Border Accent') })],
    underlineAccent: () => [new fabric.Rect({ width: 180, height: 6, rx: 3, ry: 3, fill: accent.color, ...metadata('Underline Accent') })],
  };
  return builders[elementId]();
}

export function createTechnicalComponent(componentId: TechnicalComponentId, accentId: TechnicalAccentId) {
  const accent = getTechnicalAccent(accentId);
  if (componentId === 'section') {
    return [
      makePanel(accentId, { left: 0, top: 0, width: 520, height: 170, stroke: accent.color, ...metadata('Number Heading Section Panel') }),
      ...badge(accentId, '01', 'rounded').map((object) => offsetObject(object, 28, 28)),
      makeText('SECTION HEADING', { left: 142, top: 34, width: 320, fontSize: 26, fontWeight: '800', charSpacing: 150, fill: TECHNICAL_TEXT_FILL, ...metadata('Section Heading', 'technicalInfographicText') }),
      makeText('Editable technical description for this infographic section.', { left: 142, top: 78, width: 315, fontSize: 16, fontWeight: '500', lineHeight: 1.35, fill: TECHNICAL_MUTED_FILL, ...metadata('Section Description', 'technicalInfographicText') }),
      new fabric.Line([142, 128, 456, 128], { stroke: accent.color, strokeWidth: 1.5, ...metadata('Section Accent Divider') }),
    ];
  }
  if (componentId === 'inputStack') {
    const labels = ['System Prompt', 'Document', 'Memory', 'Tools', 'User Message'];
    const colors = [accent.color, '#38BDF8', '#A78BFA', '#FBBF24', '#22D3EE'];
    return labels.flatMap((label, index) => box(accentId, label, `INPUT ${String(index + 1).padStart(2, '0')}`, colors[index]).map((object) => offsetObject(object, 0, index * 118)));
  }
  if (componentId === 'outputStack') {
    const labels = ['Answer', 'Tool Call', 'Result'];
    const colors = [accent.color, '#38BDF8', '#38F08C'];
    return labels.flatMap((label, index) => box(accentId, label, `OUTPUT ${String(index + 1).padStart(2, '0')}`, colors[index]).map((object) => offsetObject(object, 0, index * 118)));
  }
  return [
    ...node(accentId, 'INPUT', 'rounded').map((object) => offsetObject(object, 0, 0)),
    ...arrow(accentId, 'right').map((object) => offsetObject(object, 230, 32)),
    ...node(accentId, 'PROCESS', 'rect').map((object) => offsetObject(object, 390, 0)),
    ...arrow(accentId, 'right').map((object) => offsetObject(object, 630, 32)),
    ...node(accentId, 'DECIDE', 'diamond').map((object) => offsetObject(object, 770, -14)),
    ...arrow(accentId, 'down').map((object) => offsetObject(object, 838, 116)),
    ...node(accentId, 'OUTPUT', 'success').map((object) => offsetObject(object, 746, 230)),
  ];
}

export function groupTechnicalObjects(objects: fabric.Object[], name: string) {
  return new fabric.Group(objects, {
    left: 120,
    top: 160,
    objectCaching: false,
    subTargetCheck: true,
    ...metadata(name, 'technicalInfographicGroup'),
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function centerObjectOnCanvas(canvas: fabric.Canvas, object: fabric.Object) {
  object.set({
    left: canvas.getWidth() / 2 - object.getScaledWidth() / 2,
    top: canvas.getHeight() / 2 - object.getScaledHeight() / 2,
  });
  object.setCoords();
}

export function addTechnicalBackground(canvas: fabric.Canvas, accentId: TechnicalAccentId) {
  const accent = getTechnicalAccent(accentId);
  canvas.setBackgroundColor(TECHNICAL_DARK_BACKGROUND, () => undefined);
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const gridObjects: fabric.Object[] = [];
  for (let x = 0; x <= width; x += 80) {
    gridObjects.push(new fabric.Line([x, 0, x, height], { stroke: accent.soft.replace('0.12', '0.06'), strokeWidth: 1, selectable: false, evented: false, name: 'Technical Background Grid', excludeFromLayers: true } as fabric.ILineOptions & Record<string, unknown>));
  }
  for (let y = 0; y <= height; y += 80) {
    gridObjects.push(new fabric.Line([0, y, width, y], { stroke: accent.soft.replace('0.12', '0.06'), strokeWidth: 1, selectable: false, evented: false, name: 'Technical Background Grid', excludeFromLayers: true } as fabric.ILineOptions & Record<string, unknown>));
  }
  canvas.add(...gridObjects);
  gridObjects.forEach((object) => canvas.sendToBack(object));
}

export function applyTechnicalAccent(object: fabric.Object, accentId: TechnicalAccentId) {
  const accent = getTechnicalAccent(accentId);
  const applyOne = (target: fabric.Object) => {
    const name = String(target.get('name' as keyof fabric.Object) || '').toLowerCase();
    if (target.type === 'textbox' || target.type === 'text' || target.type === 'i-text') {
      if (name.includes('accent') || name.includes('badge') || name.includes('label') || name.includes('status') || name.includes('number')) {
        target.set('fill', accent.color);
      }
      return;
    }
    if (target.type === 'line' || target.type === 'path') {
      target.set('stroke', accent.color);
      return;
    }
    if (target.type === 'circle' || target.type === 'triangle') target.set('fill', accent.color);
    target.set('stroke', accent.color);
  };
  if (object.type === 'group') (object as fabric.Group).forEachObject(applyOne);
  else applyOne(object);
}

export function fitTechnicalInfographicCanvasToWorkspace(canvas: fabric.Canvas, padding = 80) {
  let container = canvas.getElement()?.parentElement || null;
  while (container?.parentElement && container.clientHeight >= canvas.getHeight()) container = container.parentElement;
  if (!container) return canvas.getZoom();
  const zoom = Math.min((container.clientWidth - padding) / canvas.getWidth(), (container.clientHeight - padding) / canvas.getHeight(), 1);
  const offsetX = (container.clientWidth - canvas.getWidth() * zoom) / 2;
  const offsetY = (container.clientHeight - canvas.getHeight() * zoom) / 2;
  canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);
  canvas.requestRenderAll();
  return zoom;
}

export function applyTechnicalAIWorkflowTemplate(canvas: fabric.Canvas, accentId: TechnicalAccentId = 'green') {
  const accent = getTechnicalAccent(accentId);
  const width = 1080;
  const height = 1350;
  const objects: fabric.Object[] = [];
  canvas.clear();
  canvas.setWidth(width);
  canvas.setHeight(height);
  canvas.setBackgroundColor(TECHNICAL_DARK_BACKGROUND, () => undefined);

  for (let x = 0; x <= width; x += 90) objects.push(new fabric.Line([x, 0, x, height], { stroke: 'rgba(56,240,140,0.045)', strokeWidth: 1, selectable: false, evented: false, name: 'Template Grid Line', excludeFromLayers: true } as fabric.ILineOptions & Record<string, unknown>));
  for (let y = 0; y <= height; y += 90) objects.push(new fabric.Line([0, y, width, y], { stroke: 'rgba(56,240,140,0.045)', strokeWidth: 1, selectable: false, evented: false, name: 'Template Grid Line', excludeFromLayers: true } as fabric.ILineOptions & Record<string, unknown>));

  objects.push(
    withAnimation(makePanel(accentId, { left: 60, top: 58, width: 960, height: 1234, fill: 'rgba(13,20,19,0.82)', stroke: 'rgba(141,154,150,0.32)', strokeWidth: 1.2, rx: 28, ry: 28, ...metadata('Technical Infographic Outer Frame') }), 'fade-in', 0, 500),
    withAnimation(makeText('AI WORKFLOW\nINFOGRAPHIC', { left: 102, top: 105, width: 620, fontSize: 68, fontWeight: '800', charSpacing: 150, lineHeight: 0.95, fill: TECHNICAL_TEXT_FILL, ...metadata('Technical Hero Title', 'technicalInfographicText') }), 'slide-up', 120, 700),
    withAnimation(makeText('SYSTEM MAP  /  INPUT → REASONING → OUTPUT', { left: 108, top: 260, width: 620, fontSize: 15, fontWeight: '800', charSpacing: 190, fill: accent.color, ...metadata('Technical Hero Subtitle', 'technicalInfographicText') }), 'fade-in', 420, 500),
    withAnimation(new fabric.Line([108, 314, 728, 314], { stroke: accent.color, strokeWidth: 4, ...metadata('Hero Accent Divider') }), 'draw', 620, 550),
    withAnimation(new fabric.Rect({ left: 788, top: 112, width: 166, height: 42, rx: 21, ry: 21, fill: accent.soft, stroke: accent.color, strokeWidth: 1.2, ...metadata('System Status Badge') }), 'scale-in', 760, 450),
    withAnimation(new fabric.Circle({ left: 810, top: 127, radius: 6, fill: accent.color, ...metadata('System Status Dot') }), 'pulse', 900, 1000, true),
    withAnimation(makeText('LIVE TRACE', { left: 830, top: 124, width: 98, fontSize: 12, fontWeight: '800', charSpacing: 140, fill: accent.color, textAlign: 'center', ...metadata('System Status Label', 'technicalInfographicText') }), 'fade-in', 840, 450),
  );

  [
    { number: '01', heading: 'INPUT LAYER', body: 'Prompts, files, tools, memory, and context windows are normalized before entering the reasoning pipeline.', top: 382, color: accent.color },
    { number: '02', heading: 'PROCESS LAYER', body: 'The model plans actions, selects tools, evaluates intermediate results, and routes decisions through guarded steps.', top: 652, color: '#38BDF8' },
    { number: '03', heading: 'OUTPUT LAYER', body: 'Final answers, generated assets, saved project JSON, and export operations remain editable and traceable.', top: 922, color: '#FBBF24' },
  ].forEach((section) => {
    objects.push(
      withAnimation(makePanel(accentId, { left: 102, top: section.top, width: 876, height: 208, stroke: section.color, fill: TECHNICAL_PANEL_FILL, ...metadata(`${section.heading} Section Container`) }), 'fade-in', 1000 + (section.top - 382) * 2, 600),
      withAnimation(new fabric.Rect({ left: 132, top: section.top + 32, width: 82, height: 54, rx: 27, ry: 27, fill: 'rgba(255,255,255,0.02)', stroke: section.color, strokeWidth: 1.4, ...metadata(`${section.heading} Number Badge`) }), 'scale-in', 1120 + (section.top - 382) * 2, 450),
      withAnimation(makeText(section.number, { left: 132, top: section.top + 44, width: 82, fontSize: 21, fontWeight: '800', charSpacing: 120, fill: section.color, textAlign: 'center', ...metadata(`${section.heading} Section Number`, 'technicalInfographicText') }), 'fade-in', 1180 + (section.top - 382) * 2, 400),
      withAnimation(makeText(section.heading, { left: 246, top: section.top + 34, width: 430, fontSize: 25, fontWeight: '800', charSpacing: 150, fill: TECHNICAL_TEXT_FILL, ...metadata(`${section.heading} Title`, 'technicalInfographicText') }), 'slide-right', 1220 + (section.top - 382) * 2, 550),
      withAnimation(makeText(section.body, { left: 246, top: section.top + 82, width: 570, fontSize: 17, fontWeight: '500', lineHeight: 1.35, fill: '#C9D4CF', ...metadata(`${section.heading} Body`, 'technicalInfographicText') }), 'fade-in', 1400 + (section.top - 382) * 2, 500),
      withAnimation(new fabric.Line([246, section.top + 154, 876, section.top + 154], { stroke: section.color, strokeWidth: 1.4, opacity: 0.72, ...metadata(`${section.heading} Divider`) }), 'draw', 1500 + (section.top - 382) * 2, 500),
      withAnimation(new fabric.Circle({ left: 862, top: section.top + 42, radius: 8, fill: section.color, opacity: 0.95, ...metadata(`${section.heading} Indicator Dot`) }), 'pulse', 1600 + (section.top - 382) * 2, 1000, true),
    );
  });

  [
    ...box(accentId, 'System Prompt', 'INPUT 01', '#38F08C').map((object) => offsetObject(object, 145, 508)),
    ...box(accentId, 'Memory Store', 'INPUT 02', '#A78BFA').map((object) => offsetObject(object, 415, 508)),
    ...box(accentId, 'Tool Context', 'INPUT 03', '#22D3EE').map((object) => offsetObject(object, 685, 508)),
    ...node(accentId, 'PLAN', 'rounded').map((object) => offsetObject(object, 140, 770)),
    ...arrow(accentId, 'right', 'draw-in', 2500, false).map((object) => offsetObject(object, 374, 803)),
    ...node(accentId, 'DECIDE', 'diamond').map((object) => offsetObject(object, 512, 756)),
    ...arrow(accentId, 'right', 'travelling-pulse', 3350, true).map((object) => offsetObject(object, 704, 803)),
    ...node(accentId, 'ACT', 'success').map((object) => offsetObject(object, 828, 770)),
    ...box(accentId, 'Final Answer', 'OUTPUT 01', '#FBBF24').map((object) => offsetObject(object, 145, 1048)),
    ...box(accentId, 'Project JSON', 'OUTPUT 02', '#38BDF8').map((object) => offsetObject(object, 415, 1048)),
    ...box(accentId, 'Export Asset', 'OUTPUT 03', '#38F08C').map((object) => offsetObject(object, 685, 1048)),
  ].forEach((object) => objects.push(object));

  objects.push(
    new fabric.Path('M 230 1195 L 230 1234 L 270 1234', { fill: 'transparent', stroke: accent.color, strokeWidth: 4, ...metadata('Bottom Left Corner Accent') }),
    new fabric.Path('M 850 1195 L 850 1234 L 810 1234', { fill: 'transparent', stroke: accent.color, strokeWidth: 4, ...metadata('Bottom Right Corner Accent') }),
    makeText('Editable Fabric.js objects · grouped components can be ungrouped and restyled', { left: 144, top: 1238, width: 790, fontSize: 13, fontWeight: '600', charSpacing: 60, fill: TECHNICAL_MUTED_FILL, textAlign: 'center', ...metadata('Template Footer Caption', 'technicalInfographicText') }),
  );

  canvas.add(...objects);
  objects.filter((object) => object.get('name' as keyof fabric.Object) === 'Template Grid Line').forEach((object) => canvas.sendToBack(object));
  canvas.renderAll();
}


type PromptHarnessSectionConfig = {
  number: string;
  title: string;
  subtitle: string;
  top: number;
  color: string;
  startMs: number;
};

const promptHarnessText = (text: string, options: fabric.ITextboxOptions & Record<string, unknown> = {}) => makeText(text, {
  fontFamily: TECHNICAL_MONO_FONT,
  ...options,
});

const PROMPT_CONTEXT_HARNESS_TEMPLATE_ID = 'prompt-context-harness-animated-infographic';

const stableSlug = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 64) || 'object';

const getObjectName = (object: fabric.Object) => String(object.get('name' as keyof fabric.Object) || object.type || 'object');

const setCanonicalAnimationMetadata = (object: fabric.Object, objectId: string) => {
  const objectAnimations = object.get('objectAnimations' as keyof fabric.Object) as Array<Record<string, unknown>> | undefined;
  if (objectAnimations?.length) {
    object.set({
      objectAnimations: objectAnimations.map((animation, index) => ({
        ...animation,
        id: `${objectId}-animation-${index + 1}`,
        objectId,
        delayMs: Number(animation.delayMs || 0),
        easing: animation.easing || 'ease-out',
      })),
    } as Record<string, unknown>);
  }
  const diagramConfig = object.get('diagramArrowConfig' as keyof fabric.Object) as Record<string, unknown> | undefined;
  if (diagramConfig) {
    const connectorId = `${objectId}-connector`;
    object.set({
      diagramArrowConfig: {
        ...diagramConfig,
        connectorId,
        animation: diagramConfig.animation ? {
          ...(diagramConfig.animation as Record<string, unknown>),
          id: `${connectorId}-animation`,
        } : diagramConfig.animation,
      },
      diagramConnectorId: connectorId,
    } as Record<string, unknown>);
  }
  if ('text' in object && objectAnimations?.some((animation) => String(animation.type).includes('typewriter'))) {
    object.set({
      animationConfig: {
        ...(object.get('animationConfig' as keyof fabric.Object) as Record<string, unknown> | undefined),
        fullText: String((object as fabric.Text).text || ''),
      },
    } as Record<string, unknown>);
  }
};

const setCanonicalBaseState = (object: fabric.Object) => {
  object.set({
    baseState: {
      left: object.left ?? 0,
      top: object.top ?? 0,
      scaleX: object.scaleX ?? 1,
      scaleY: object.scaleY ?? 1,
      opacity: object.opacity ?? 1,
      angle: object.angle ?? 0,
      visible: object.visible !== false,
      text: 'text' in object ? String((object as fabric.Text).text || '') : undefined,
    },
  } as Record<string, unknown>);
};

const finalizePromptContextHarnessObjects = (canvas: fabric.Canvas, objects: fabric.Object[]) => {
  const nameCounts = new Map<string, number>();
  const assign = (object: fabric.Object, layerPath: string, index: number) => {
    const slug = stableSlug(getObjectName(object));
    const occurrence = (nameCounts.get(slug) || 0) + 1;
    nameCounts.set(slug, occurrence);
    const objectId = `${PROMPT_CONTEXT_HARNESS_TEMPLATE_ID}-${slug}-${String(occurrence).padStart(2, '0')}`;
    object.set({
      id: objectId,
      objectId,
      layerIndex: index,
      posterTemplateId: PROMPT_CONTEXT_HARNESS_TEMPLATE_ID,
      posterTemplateName: PROMPT_CONTEXT_HARNESS_TEMPLATE_NAME,
      posterRole: layerPath,
      selectable: object.selectable !== false,
      evented: object.evented !== false,
    } as Record<string, unknown>);
    setCanonicalAnimationMetadata(object, objectId);
    if (object.type === 'group') {
      (object as fabric.Group).getObjects().forEach((child, childIndex) => {
        const childId = `${objectId}-child-${String(childIndex + 1).padStart(2, '0')}-${stableSlug(getObjectName(child))}`;
        child.set({
          id: childId,
          objectId: childId,
          layerIndex: (index * 1000) + childIndex,
          posterTemplateId: PROMPT_CONTEXT_HARNESS_TEMPLATE_ID,
          posterTemplateName: PROMPT_CONTEXT_HARNESS_TEMPLATE_NAME,
          posterRole: `${layerPath}:child:${childIndex + 1}`,
          diagramConnectorId: object.get('diagramConnectorId' as keyof fabric.Object),
        } as Record<string, unknown>);
        setCanonicalAnimationMetadata(child, childId);
        setCanonicalBaseState(child);
        child.setCoords();
      });
    }
    setCanonicalBaseState(object);
    object.setCoords();
  };
  objects.forEach((object, index) => assign(object, `layer-${String(index).padStart(3, '0')}`, index));
  canvas.getObjects()
    .sort((left, right) => Number(left.get('layerIndex' as keyof fabric.Object) || 0) - Number(right.get('layerIndex' as keyof fabric.Object) || 0))
    .forEach((object) => canvas.bringToFront(object));
  canvas.renderAll();
};

const promptHarnessPanel = (
  label: string,
  left: number,
  top: number,
  width: number,
  height: number,
  color: string,
  options: fabric.IRectOptions & Record<string, unknown> = {},
) => new fabric.Rect({
  left,
  top,
  width,
  height,
  rx: 14,
  ry: 14,
  fill: options.fill || TECHNICAL_PANEL_ALT_FILL,
  stroke: color,
  strokeWidth: options.strokeWidth || 1.25,
  opacity: options.opacity || 0.98,
  objectCaching: false,
  ...metadata(label),
  ...options,
});

const promptHarnessBadge = (number: string, left: number, top: number, color: string, startMs: number) => [
  withAnimation(new fabric.Circle({ left, top, radius: 28, fill: 'rgba(255,255,255,0.018)', stroke: color, strokeWidth: 1.4, ...metadata(`Section ${number} Badge`) }), 'scale-in', startMs, 420),
  withAnimation(promptHarnessText(number, { left: left - 2, top: top + 17, width: 58, fontSize: 18, fontWeight: '800', charSpacing: 90, fill: color, textAlign: 'center', ...metadata(`Section ${number} Number`, 'technicalInfographicText') }), 'fade-in', startMs + 80, 360),
];

const promptHarnessCard = (
  title: string,
  caption: string,
  left: number,
  top: number,
  width: number,
  height: number,
  color: string,
  startMs: number,
  animationType: string = 'fade-in',
) => [
  withAnimation(promptHarnessPanel(`${title} Card`, left, top, width, height, color), animationType, startMs, 520),
  withAnimation(new fabric.Circle({ left: left + 18, top: top + 18, radius: 6, fill: color, opacity: 0.95, ...metadata(`${title} Status Dot`) }), 'pulse', startMs + 180, 1200, true),
  withAnimation(promptHarnessText(title.toUpperCase(), { left: left + 34, top: top + 16, width: width - 54, fontSize: 15, fontWeight: '800', charSpacing: 110, fill: TECHNICAL_TEXT_FILL, ...metadata(`${title} Title`, 'technicalInfographicText') }), 'typewriter', startMs + 80, 520),
  withAnimation(promptHarnessText(caption, { left: left + 34, top: top + 46, width: width - 56, fontSize: 11, fontWeight: '500', charSpacing: 20, lineHeight: 1.25, fill: TECHNICAL_MUTED_FILL, ...metadata(`${title} Caption`, 'technicalInfographicText') }), 'fade-in', startMs + 260, 420),
];

const promptHarnessNode = (
  title: string,
  label: string,
  left: number,
  top: number,
  width: number,
  height: number,
  color: string,
  startMs: number,
) => [
  withAnimation(promptHarnessPanel(`${title} Node`, left, top, width, height, color, { rx: 10, ry: 10, fill: '#0B1014' }), 'scale-in', startMs, 520),
  withAnimation(promptHarnessText(label, { left: left + 14, top: top + 12, width: width - 28, fontSize: 10, fontWeight: '800', charSpacing: 150, fill: color, textAlign: 'center', ...metadata(`${title} Label`, 'technicalInfographicText') }), 'fade-in', startMs + 120, 360),
  withAnimation(promptHarnessText(title.toUpperCase(), { left: left + 16, top: top + 38, width: width - 32, fontSize: 18, fontWeight: '800', charSpacing: 70, fill: TECHNICAL_TEXT_FILL, textAlign: 'center', ...metadata(`${title} Node Text`, 'technicalInfographicText') }), 'typewriter', startMs + 220, 520),
];

const promptHarnessDiamond = (
  label: string,
  left: number,
  top: number,
  color: string,
  startMs: number,
) => [
  withAnimation(new fabric.Polygon([
    { x: 68, y: 0 }, { x: 136, y: 52 }, { x: 68, y: 104 }, { x: 0, y: 52 },
  ], { left, top, fill: '#0B1014', stroke: color, strokeWidth: 1.35, objectCaching: false, ...metadata(`${label} Decision Diamond`) }), 'scale-in', startMs, 520),
  withAnimation(promptHarnessText(label, { left: left + 24, top: top + 36, width: 88, fontSize: 12, fontWeight: '800', charSpacing: 90, fill: TECHNICAL_TEXT_FILL, textAlign: 'center', ...metadata(`${label} Decision Text`, 'technicalInfographicText') }), 'fade-in', startMs + 170, 420),
];

const promptHarnessArrow = (
  left: number,
  top: number,
  color: string,
  startMs: number,
  options: {
    direction?: 'right' | 'left' | 'down';
    type?: DiagramConnectorAnimationConfig['type'];
    style?: 'solid' | 'dashed' | 'dotted';
    scaleX?: number;
    scaleY?: number;
    loop?: boolean;
    label?: string;
  } = {},
) => {
  const direction = options.direction || 'right';
  const connector = createStandaloneDiagramArrow({
    name: options.label || 'Prompt Context Harness Connector',
    color,
    width: 2.25,
    opacity: options.type === 'draw-in' || !options.type ? 0.12 : 0.55,
    endArrow: 'arrow',
    angle: direction === 'left' ? 180 : direction === 'down' ? 90 : 0,
    style: options.style || 'solid',
    dashLength: 9,
    dashGap: 8,
    label: options.label || '',
    labelVisible: Boolean(options.label),
    labelColor: color,
    animation: connectorAnimation(options.type || 'draw-in', startMs, color, options.loop || false),
  });
  connector.set({
    left,
    top,
    scaleX: options.scaleX || 1,
    scaleY: options.scaleY || 1,
    ...metadata(options.label || 'Prompt Context Harness Connector', 'diagramArrow'),
  } as Record<string, unknown>);
  return connector;
};

const promptHarnessDashedPath = (
  pathData: string,
  color: string,
  name: string,
  startMs: number,
) => {
  const values = Array.from(pathData.matchAll(/-?\d+(?:\.\d+)?/g)).map((match) => Number(match[0]));
  const xValues = values.filter((_, index) => index % 2 === 0);
  const yValues = values.filter((_, index) => index % 2 === 1);
  const minX = Math.min(...xValues);
  const minY = Math.min(...yValues);
  let coordinateIndex = 0;
  const localPathData = pathData.replace(/-?\d+(?:\.\d+)?/g, (match) => {
    const value = Number(match);
    const normalized = coordinateIndex % 2 === 0 ? value - minX : value - minY;
    coordinateIndex += 1;
    return Number(normalized.toFixed(2)).toString();
  });
  const config = {
    sourceNodeId: '',
    targetNodeId: '',
    routing: 'straight',
    style: 'dashed',
    color,
    width: 1.8,
    opacity: 0.65,
    dashLength: 8,
    dashGap: 8,
    endArrow: 'none',
    arrowSize: 10,
    label: '',
    labelVisible: false,
    animation: connectorAnimation('moving-dashes', startMs, color, true),
  };
  const path = new fabric.Path(localPathData, {
    left: 0,
    top: 0,
    fill: 'transparent',
    stroke: color,
    strokeWidth: 1.8,
    strokeDashArray: [8, 8],
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    opacity: 0.5,
    selectable: false,
    evented: false,
    objectCaching: false,
  } as fabric.IPathOptions & Record<string, unknown>);
  return new fabric.Group([path], {
    left: minX,
    top: minY,
    objectCaching: false,
    subTargetCheck: true,
    diagramArrowConfig: config,
    ...metadata(name, 'diagramArrow'),
  } as fabric.IGroupOptions & Record<string, unknown>);
};

const promptHarnessSectionHeader = ({ number, title, subtitle, top, color, startMs }: PromptHarnessSectionConfig) => [
  ...promptHarnessBadge(number, 92, top, color, startMs),
  withAnimation(promptHarnessText(`SECTION ${number}`, { left: 165, top: top - 2, width: 160, fontSize: 12, fontWeight: '800', charSpacing: 160, fill: color, ...metadata(`Section ${number} Label`, 'technicalInfographicText') }), 'fade-in', startMs + 120, 380),
  withAnimation(promptHarnessText(title, { left: 165, top: top + 25, width: 425, fontSize: 26, fontWeight: '800', charSpacing: 120, fill: TECHNICAL_TEXT_FILL, ...metadata(`${title} Heading`, 'technicalInfographicText') }), 'slide-right', startMs + 220, 520),
  withAnimation(promptHarnessText(subtitle, { left: 598, top: top + 30, width: 340, fontSize: 12, fontWeight: '500', lineHeight: 1.25, fill: TECHNICAL_MUTED_FILL, ...metadata(`${title} Subtitle`, 'technicalInfographicText') }), 'fade-in', startMs + 360, 420),
  withAnimation(new fabric.Line([165, top + 72, 930, top + 72], { stroke: color, strokeWidth: 1.2, opacity: 0.72, ...metadata(`${title} Section Rule`) }), 'draw', startMs + 450, 520),
];

export function applyPromptContextHarnessInfographicTemplate(canvas: fabric.Canvas) {
  const width = 1080;
  const height = 1350;
  const green = '#38F08C';
  const blue = '#38BDF8';
  const purple = '#A78BFA';
  const amber = '#FBBF24';
  const frame = 'rgba(185, 195, 190, 0.24)';
  const panelFill = 'rgba(12, 18, 20, 0.88)';
  const objects: fabric.Object[] = [];

  canvas.clear();
  canvas.setWidth(width);
  canvas.setHeight(height);
  canvas.setBackgroundColor('#070B0D', () => undefined);

  for (let x = 0; x <= width; x += 72) {
    objects.push(new fabric.Line([x, 0, x, height], {
      stroke: 'rgba(120,160,145,0.045)', strokeWidth: 1, selectable: false, evented: false,
      name: 'Prompt Harness Grid Line', excludeFromLayers: true,
    } as fabric.ILineOptions & Record<string, unknown>));
  }
  for (let y = 0; y <= height; y += 72) {
    objects.push(new fabric.Line([0, y, width, y], {
      stroke: 'rgba(120,160,145,0.045)', strokeWidth: 1, selectable: false, evented: false,
      name: 'Prompt Harness Grid Line', excludeFromLayers: true,
    } as fabric.ILineOptions & Record<string, unknown>));
  }

  const sectionPanel = (name: string, top: number, sectionHeight: number, color: string, startMs: number) => {
    objects.push(
      withAnimation(promptHarnessPanel(name, 80, top, 920, sectionHeight, color, {
        fill: panelFill,
        rx: 18,
        ry: 18,
        strokeWidth: 1.25,
      }), 'fade-in', startMs, 520),
      withAnimation(new fabric.Line([110, top + 74, 970, top + 74], {
        stroke: color,
        strokeWidth: 1.15,
        opacity: 0.7,
        ...metadata(`${name} Header Divider`),
      }), 'draw', startMs + 420, 520),
    );
  };

  objects.push(
    withAnimation(promptHarnessPanel('Prompt Context Harness Outer Frame', 56, 54, 968, 1244, frame, {
      fill: 'rgba(8, 13, 15, 0.88)',
      rx: 28,
      ry: 28,
      strokeWidth: 1,
    }), 'fade-in', 0, 500),
    withAnimation(promptHarnessText('PROMPT / CONTEXT / HARNESS', {
      left: 92,
      top: 118,
      width: 896,
      fontSize: 43,
      fontWeight: '800',
      charSpacing: 78,
      fill: '#F4F7F5',
      textAlign: 'center',
      ...metadata('Prompt Context Harness Main Heading', 'technicalInfographicText'),
    }), 'fade-in', 0, 700),
    withAnimation(promptHarnessText('THE THREE ERAS OF GETTING AN LLM TO DO REAL WORK.', {
      left: 140,
      top: 190,
      width: 800,
      fontSize: 16,
      fontWeight: '700',
      charSpacing: 160,
      fill: '#8D969C',
      textAlign: 'center',
      ...metadata('Prompt Context Harness Subtitle', 'technicalInfographicText'),
    }), 'typewriter', 520, 1100),
    withAnimation(new fabric.Line([190, 246, 392, 246], { stroke: green, strokeWidth: 5, strokeLineCap: 'round', ...metadata('Prompt Top Accent') }), 'draw', 820, 500),
    withAnimation(new fabric.Line([414, 246, 632, 246], { stroke: blue, strokeWidth: 5, strokeLineCap: 'round', ...metadata('Context Top Accent') }), 'draw', 980, 500),
    withAnimation(new fabric.Line([654, 246, 890, 246], { stroke: purple, strokeWidth: 5, strokeLineCap: 'round', ...metadata('Harness Top Accent') }), 'draw', 1140, 500),
  );

  sectionPanel('Section 01 Prompt Engineering Panel', 286, 264, green, 1000);
  objects.push(
    ...promptHarnessSectionHeader({
      number: '01',
      title: 'PROMPT ENGINEERING',
      subtitle: 'A single instruction steers the model toward one response.',
      top: 314,
      color: green,
      startMs: 1000,
    }),
    ...promptHarnessCard('User Prompt', 'instruction + examples', 125, 406, 222, 96, green, 1300, 'slide-right'),
    promptHarnessArrow(362, 424, green, 1800, { type: 'draw-in', scaleX: 0.52, label: 'PROMPT' }),
    ...promptHarnessNode('LLM', 'MODEL', 490, 404, 154, 100, green, 2300),
    promptHarnessArrow(660, 424, green, 2700, { type: 'travelling-pulse', scaleX: 0.52, loop: true, label: 'ANSWER' }),
    ...promptHarnessCard('Answer', 'plain generated result', 785, 406, 186, 96, green, 3100, 'slide-left'),
    withAnimation(promptHarnessText('fast to start · hard to scale · prompt text carries the workflow', {
      left: 150,
      top: 514,
      width: 780,
      fontSize: 12,
      fontWeight: '700',
      charSpacing: 80,
      fill: '#6F827A',
      textAlign: 'center',
      ...metadata('Prompt Engineering Footer Note', 'technicalInfographicText'),
    }), 'fade-in', 3420, 500),
  );

  sectionPanel('Section 02 Context Engineering Panel', 584, 330, blue, 4000);
  objects.push(
    ...promptHarnessSectionHeader({
      number: '02',
      title: 'CONTEXT ENGINEERING',
      subtitle: 'Inputs become structured context: retrieval, memory, policies and tools.',
      top: 612,
      color: blue,
      startMs: 4000,
    }),
    ...promptHarnessCard('System', 'role / policy', 118, 710, 184, 68, blue, 4500, 'slide-right'),
    ...promptHarnessCard('Docs', 'retrieved facts', 118, 788, 184, 68, blue, 4700, 'slide-right'),
    ...promptHarnessCard('Memory', 'session state', 118, 866, 184, 68, blue, 4900, 'slide-right'),
    promptHarnessArrow(318, 782, blue, 5400, { type: 'moving-dots', scaleX: 0.36, loop: true, label: 'PACK' }),
    ...promptHarnessCard('Context Window', 'ranked prompt + files + history + tool schemas', 420, 750, 272, 130, blue, 5250, 'scale-in'),
    promptHarnessArrow(706, 782, blue, 6100, { type: 'draw-in', scaleX: 0.36, label: 'INFER' }),
    ...promptHarnessNode('Answer', 'OUTPUT', 815, 708, 166, 78, blue, 6500),
    ...promptHarnessNode('Tool Call', 'ACTION', 815, 820, 166, 78, amber, 6800),
    promptHarnessDashedPath('M 902 902 L 902 950 L 556 950 L 556 884', amber, 'Context Feedback Loop Connector', 7500),
    withAnimation(new fabric.Circle({ left: 548, top: 944, radius: 5, fill: amber, opacity: 0.9, ...metadata('Context Loop Dot') }), 'pulse', 7600, 1200, true),
    withAnimation(promptHarnessText('context turns prompting into an input pipeline', {
      left: 412,
      top: 890,
      width: 288,
      fontSize: 11,
      fontWeight: '700',
      charSpacing: 70,
      fill: blue,
      textAlign: 'center',
      ...metadata('Context Engineering Note', 'technicalInfographicText'),
    }), 'fade-in', 7200, 500),
  );

  sectionPanel('Section 03 Harness Engineering Panel', 950, 276, purple, 8500);
  objects.push(
    ...promptHarnessSectionHeader({
      number: '03',
      title: 'HARNESS ENGINEERING',
      subtitle: 'A software loop plans, calls tools, validates results and retries.',
      top: 978,
      color: purple,
      startMs: 8500,
    }),
    ...promptHarnessCard('Task + State', 'goal / files / constraints', 120, 1068, 200, 70, purple, 9000, 'slide-right'),
    ...promptHarnessCard('Tools', 'browser / code / db', 120, 1150, 200, 70, purple, 9300, 'slide-right'),
    promptHarnessArrow(336, 1085, purple, 10000, { type: 'moving-dots', scaleX: 0.28, loop: true, label: 'STATE' }),
    ...promptHarnessCard('Agent Harness', 'state machine + policy + timeline', 430, 1064, 248, 112, purple, 10100, 'scale-in'),
    promptHarnessArrow(690, 1086, purple, 10800, { type: 'draw-in', scaleX: 0.26, label: 'CHECK' }),
    ...promptHarnessDiamond('DONE?', 785, 1068, purple, 10800),
    ...promptHarnessNode('Final Answer', 'YES', 838, 992, 154, 66, green, 12000),
    promptHarnessArrow(858, 1038, green, 11500, { direction: 'down', type: 'draw-in', scaleX: 0.32, scaleY: 0.62, label: 'YES' }),
    ...promptHarnessNode('Tool Result', 'NO', 838, 1172, 154, 66, amber, 13000),
    promptHarnessArrow(858, 1137, amber, 12500, { direction: 'down', type: 'draw-in', scaleX: 0.32, scaleY: 0.48, label: 'NO' }),
    promptHarnessDashedPath('M 838 1206 L 704 1206 L 704 1120 L 678 1120', amber, 'Harness Tool Result Loop Connector', 13500),
  );

  objects.push(
    withAnimation(promptHarnessText('SOFTWARE HARNESS  >  ONE PERFECT PROMPT', {
      left: 112,
      top: 1250,
      width: 856,
      fontSize: 24,
      fontWeight: '800',
      charSpacing: 140,
      fill: '#F4F7F5',
      textAlign: 'center',
      ...metadata('Prompt Context Harness Footer Heading', 'technicalInfographicText'),
    }), 'fade-in', 14500, 900),
    withAnimation(promptHarnessText('editable objects · timeline driven arrows · export-ready animation metadata', {
      left: 150,
      top: 1286,
      width: 780,
      fontSize: 11,
      fontWeight: '600',
      charSpacing: 70,
      fill: '#687770',
      textAlign: 'center',
      ...metadata('Prompt Context Harness Footer Caption', 'technicalInfographicText'),
    }), 'fade-in', 14900, 700),
  );

  [
    { left: 111, top: 326, color: green },
    { left: 111, top: 624, color: blue },
    { left: 111, top: 990, color: purple },
    { left: 965, top: 326, color: green },
    { left: 965, top: 624, color: blue },
    { left: 965, top: 990, color: purple },
  ].forEach((dot, index) => {
    objects.push(withAnimation(new fabric.Circle({
      left: dot.left,
      top: dot.top,
      radius: 5,
      fill: dot.color,
      opacity: 0.9,
      ...metadata(`Reference Poster Accent Dot ${index + 1}`),
    }), 'pulse', 1600 + index * 180, 1300, true));
  });

  canvas.add(...objects);
  objects
    .filter((object) => object.get('name' as keyof fabric.Object) === 'Prompt Harness Grid Line')
    .forEach((object) => canvas.sendToBack(object));
  finalizePromptContextHarnessObjects(canvas, objects);
}

