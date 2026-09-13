import { fabric } from 'fabric';
import {
  AI_ARCHITECTURE_PALETTE,
  AI_ARCHITECTURE_TEMPLATE_NAME,
  DISTRIBUTED_SYSTEM_TEMPLATE_NAME,
  getConnectorAnimationPreset,
} from './architectureDiagramTypes';
import type {
  ArchitectureCardConfig,
  ArchitectureChipConfig,
  ArchitectureIconName,
  DiagramConnectorAnimationConfig,
  DiagramConnectorAnimationPresetId,
  StageTrackerConfig,
  TechnicalGridConfig,
} from './architectureDiagramTypes';
import {
  createDiagramConnector,
  updateAllDiagramConnectors,
} from './diagramConnectors';
import { ensureFontLoaded } from './fontLoader';

const ARCHITECTURE_FONT_REFERENCES = {
  heading: [
    { id: 'manrope-500', family: 'Manrope', source: 'built-in' as const, weight: 500, style: 'normal' as const },
    { id: 'manrope-800', family: 'Manrope', source: 'built-in' as const, weight: 800, style: 'normal' as const },
  ],
  sans: [
    { id: 'ibm-plex-sans-400', family: 'IBM Plex Sans', source: 'built-in' as const, weight: 400, style: 'normal' as const },
    { id: 'ibm-plex-sans-700', family: 'IBM Plex Sans', source: 'built-in' as const, weight: 700, style: 'normal' as const },
  ],
  mono: [
    { id: 'ibm-plex-mono-600', family: 'IBM Plex Mono', source: 'built-in' as const, weight: 600, style: 'normal' as const },
    { id: 'ibm-plex-mono-700', family: 'IBM Plex Mono', source: 'built-in' as const, weight: 700, style: 'normal' as const },
  ],
};

export async function ensureArchitectureFontsLoaded() {
  const references = Object.values(ARCHITECTURE_FONT_REFERENCES).flat();
  await Promise.allSettled(references.map((reference) => ensureFontLoaded(reference)));
}

export function fitArchitectureCanvasToWorkspace(
  canvas: fabric.Canvas,
  padding = 80,
) {
  let workspaceContainer = canvas.getElement()?.parentElement || null;
  while (
    workspaceContainer?.parentElement &&
    workspaceContainer.clientHeight >= canvas.getHeight()
  ) {
    workspaceContainer = workspaceContainer.parentElement;
  }
  if (!workspaceContainer) return canvas.getZoom();
  const containerWidth = workspaceContainer.clientWidth;
  const containerHeight = workspaceContainer.clientHeight;
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const zoom = Math.min(
    (containerWidth - padding) / width,
    (containerHeight - padding) / height,
    1,
  );
  const offsetX = (containerWidth - width * zoom) / 2;
  const offsetY = (containerHeight - height * zoom) / 2;
  canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY]);
  canvas.requestRenderAll();
  return zoom;
}

const createId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const architectureMetadata = (role: string, name: string) => ({
  id: createId(`architecture-${role}`),
  name,
  objectType: role,
  teckstudioObjectType: role,
  architectureRole: role,
  elementCategory: 'Technology',
  elementSubcategory: 'System Design',
  elementTags: ['architecture', 'diagram', 'technology', role],
  elementEditable: true,
});

const commonIconStroke = (color: string, width: number) => ({
  fill: '',
  stroke: color,
  strokeWidth: width,
  strokeLineCap: 'round' as const,
  strokeLineJoin: 'round' as const,
  strokeUniform: true,
  selectable: false,
  evented: false,
});

const line = (
  points: [number, number, number, number],
  color: string,
  width: number,
) => new fabric.Line(points, commonIconStroke(color, width));

export function createArchitectureIcon(
  icon: ArchitectureIconName,
  color: string,
  size = 34,
) {
  const strokeWidth = Math.max(1.5, size * 0.065);
  const center = size / 2;
  const objects: fabric.Object[] = [];

  if (icon === 'member' || icon === 'workers') {
    const memberAt = (x: number, y: number, scale = 1) => {
      objects.push(new fabric.Circle({
        left: x,
        top: y,
        radius: size * 0.12 * scale,
        originX: 'center',
        originY: 'center',
        ...commonIconStroke(color, strokeWidth),
      }));
      objects.push(new fabric.Path(
        `M ${x - size * 0.22 * scale} ${y + size * 0.31 * scale} Q ${x} ${y + size * 0.08 * scale} ${x + size * 0.22 * scale} ${y + size * 0.31 * scale}`,
        commonIconStroke(color, strokeWidth),
      ));
    };
    if (icon === 'workers') {
      memberAt(center, size * 0.35, 0.75);
      memberAt(size * 0.28, size * 0.56, 0.58);
      memberAt(size * 0.72, size * 0.56, 0.58);
    } else {
      memberAt(center, size * 0.34);
    }
  } else if (icon === 'globe') {
    objects.push(new fabric.Circle({
      left: center,
      top: center,
      radius: size * 0.36,
      originX: 'center',
      originY: 'center',
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(new fabric.Ellipse({
      left: center,
      top: center,
      rx: size * 0.16,
      ry: size * 0.36,
      originX: 'center',
      originY: 'center',
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(line([size * 0.16, center, size * 0.84, center], color, strokeWidth));
  } else if (icon === 'gateway') {
    objects.push(line([size * 0.26, size * 0.18, size * 0.26, size * 0.82], color, strokeWidth));
    objects.push(line([size * 0.58, size * 0.18, size * 0.58, size * 0.82], color, strokeWidth));
    objects.push(line([size * 0.12, size * 0.38, size * 0.74, size * 0.38], color, strokeWidth));
    objects.push(line([size * 0.12, size * 0.65, size * 0.74, size * 0.65], color, strokeWidth));
    objects.push(new fabric.Triangle({
      left: size * 0.83,
      top: center,
      width: size * 0.22,
      height: size * 0.22,
      angle: 90,
      originX: 'center',
      originY: 'center',
      fill: color,
      selectable: false,
      evented: false,
    }));
  } else if (icon === 'browser' || icon === 'desktop') {
    objects.push(new fabric.Rect({
      left: size * 0.12,
      top: size * 0.18,
      width: size * 0.76,
      height: size * 0.52,
      rx: size * 0.05,
      ry: size * 0.05,
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(line([size * 0.35, size * 0.84, size * 0.65, size * 0.84], color, strokeWidth));
    objects.push(line([center, size * 0.7, center, size * 0.84], color, strokeWidth));
  } else if (icon === 'mobile') {
    objects.push(new fabric.Rect({
      left: size * 0.28,
      top: size * 0.08,
      width: size * 0.44,
      height: size * 0.84,
      rx: size * 0.08,
      ry: size * 0.08,
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(new fabric.Circle({
      left: center,
      top: size * 0.82,
      radius: size * 0.025,
      originX: 'center',
      originY: 'center',
      fill: color,
      selectable: false,
      evented: false,
    }));
  } else if (icon === 'loadBalancer' || icon === 'reverseProxy') {
    objects.push(line([center, size * 0.14, center, size * 0.38], color, strokeWidth));
    objects.push(line([center, size * 0.38, size * 0.24, size * 0.66], color, strokeWidth));
    objects.push(line([center, size * 0.38, size * 0.76, size * 0.66], color, strokeWidth));
    [0.5, 0.24, 0.76].forEach((x, index) => {
      objects.push(new fabric.Rect({
        left: size * x - size * 0.1,
        top: size * (index === 0 ? 0.08 : 0.62),
        width: size * 0.2,
        height: size * 0.18,
        rx: size * 0.03,
        ry: size * 0.03,
        ...commonIconStroke(color, strokeWidth),
      }));
    });
  } else if (icon === 'database') {
    objects.push(new fabric.Path(
      `M ${size * 0.12} ${size * 0.28} C ${size * 0.12} ${size * 0.08}, ${size * 0.88} ${size * 0.08}, ${size * 0.88} ${size * 0.28}
       V ${size * 0.72} C ${size * 0.88} ${size * 0.92}, ${size * 0.12} ${size * 0.92}, ${size * 0.12} ${size * 0.72} Z
       M ${size * 0.12} ${size * 0.28} C ${size * 0.12} ${size * 0.48}, ${size * 0.88} ${size * 0.48}, ${size * 0.88} ${size * 0.28}
       M ${size * 0.12} ${size * 0.5} C ${size * 0.12} ${size * 0.7}, ${size * 0.88} ${size * 0.7}, ${size * 0.88} ${size * 0.5}`,
      commonIconStroke(color, strokeWidth),
    ));
  } else if (icon === 'chat' || icon === 'stream') {
    objects.push(new fabric.Rect({
      left: size * 0.1,
      top: size * 0.18,
      width: size * 0.8,
      height: size * 0.55,
      rx: size * 0.16,
      ry: size * 0.16,
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(new fabric.Path(
      `M ${size * 0.32} ${size * 0.72} L ${size * 0.25} ${size * 0.9} L ${size * 0.48} ${size * 0.73}`,
      commonIconStroke(color, strokeWidth),
    ));
    [0.36, 0.5, 0.64].forEach((x) => objects.push(new fabric.Circle({
      left: size * x,
      top: size * 0.46,
      radius: size * 0.035,
      originX: 'center',
      originY: 'center',
      fill: color,
      selectable: false,
      evented: false,
    })));
  } else if (icon === 'router') {
    const diamond = new fabric.Rect({
      left: center,
      top: center,
      width: size * 0.45,
      height: size * 0.45,
      angle: 45,
      originX: 'center',
      originY: 'center',
      ...commonIconStroke(color, strokeWidth),
    });
    objects.push(diamond);
    objects.push(line([size * 0.12, center, size * 0.88, center], color, strokeWidth));
    objects.push(line([center, size * 0.12, center, size * 0.88], color, strokeWidth));
  } else if (icon === 'event' || icon === 'queue' || icon === 'logging') {
    [0.25, 0.5, 0.75].forEach((y) => {
      objects.push(new fabric.Circle({
        left: size * 0.2,
        top: size * y,
        radius: size * 0.055,
        originX: 'center',
        originY: 'center',
        fill: color,
        selectable: false,
        evented: false,
      }));
      objects.push(line([size * 0.34, size * y, size * 0.88, size * y], color, strokeWidth));
    });
  } else if (icon === 'chip') {
    objects.push(new fabric.Rect({
      left: size * 0.2,
      top: size * 0.2,
      width: size * 0.6,
      height: size * 0.6,
      rx: size * 0.08,
      ry: size * 0.08,
      ...commonIconStroke(color, strokeWidth),
    }));
    [0.3, 0.5, 0.7].forEach((position) => {
      objects.push(line([size * position, size * 0.06, size * position, size * 0.2], color, strokeWidth));
      objects.push(line([size * position, size * 0.8, size * position, size * 0.94], color, strokeWidth));
      objects.push(line([size * 0.06, size * position, size * 0.2, size * position], color, strokeWidth));
      objects.push(line([size * 0.8, size * position, size * 0.94, size * position], color, strokeWidth));
    });
  } else if (icon === 'cache' || icon === 'storage') {
    objects.push(new fabric.Path(
      `M ${size * 0.12} ${size * 0.32} C ${size * 0.12} ${size * 0.14}, ${size * 0.88} ${size * 0.14}, ${size * 0.88} ${size * 0.32}
       V ${size * 0.72} C ${size * 0.88} ${size * 0.9}, ${size * 0.12} ${size * 0.9}, ${size * 0.12} ${size * 0.72} Z
       M ${size * 0.12} ${size * 0.32} C ${size * 0.12} ${size * 0.5}, ${size * 0.88} ${size * 0.5}, ${size * 0.88} ${size * 0.32}`,
      commonIconStroke(color, strokeWidth),
    ));
    if (icon === 'cache') {
      objects.push(line([size * 0.34, size * 0.62, size * 0.66, size * 0.62], color, strokeWidth));
      objects.push(line([size * 0.5, size * 0.5, size * 0.5, size * 0.74], color, strokeWidth));
    } else {
      objects.push(line([size * 0.3, size * 0.62, size * 0.7, size * 0.62], color, strokeWidth));
      objects.push(line([size * 0.3, size * 0.74, size * 0.7, size * 0.74], color, strokeWidth));
    }
  } else if (icon === 'cloud') {
    objects.push(new fabric.Path(
      `M ${size * 0.2} ${size * 0.72}
       C ${size * 0.02} ${size * 0.7}, ${size * 0.04} ${size * 0.4}, ${size * 0.28} ${size * 0.42}
       C ${size * 0.34} ${size * 0.12}, ${size * 0.74} ${size * 0.15}, ${size * 0.78} ${size * 0.45}
       C ${size * 1.02} ${size * 0.45}, ${size * 1.02} ${size * 0.73}, ${size * 0.82} ${size * 0.74} Z`,
      commonIconStroke(color, strokeWidth),
    ));
  } else if (icon === 'payment') {
    objects.push(new fabric.Rect({
      left: size * 0.12,
      top: size * 0.28,
      width: size * 0.76,
      height: size * 0.48,
      rx: size * 0.06,
      ry: size * 0.06,
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(line([size * 0.12, size * 0.42, size * 0.88, size * 0.42], color, strokeWidth));
    objects.push(line([size * 0.24, size * 0.62, size * 0.46, size * 0.62], color, strokeWidth));
  } else if (icon === 'email') {
    objects.push(new fabric.Rect({
      left: size * 0.12,
      top: size * 0.24,
      width: size * 0.76,
      height: size * 0.52,
      rx: size * 0.04,
      ry: size * 0.04,
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(line([size * 0.14, size * 0.28, center, size * 0.56], color, strokeWidth));
    objects.push(line([size * 0.86, size * 0.28, center, size * 0.56], color, strokeWidth));
  } else if (icon === 'auth' || icon === 'identity') {
    objects.push(new fabric.Path(
      `M ${center} ${size * 0.08} L ${size * 0.82} ${size * 0.22} V ${size * 0.48}
       C ${size * 0.82} ${size * 0.72}, ${size * 0.66} ${size * 0.88}, ${center} ${size * 0.95}
       C ${size * 0.34} ${size * 0.88}, ${size * 0.18} ${size * 0.72}, ${size * 0.18} ${size * 0.48}
       V ${size * 0.22} Z`,
      commonIconStroke(color, strokeWidth),
    ));
    objects.push(line([size * 0.34, size * 0.5, size * 0.46, size * 0.63], color, strokeWidth));
    objects.push(line([size * 0.46, size * 0.63, size * 0.7, size * 0.36], color, strokeWidth));
  } else if (icon === 'registry') {
    objects.push(new fabric.Rect({
      left: size * 0.15,
      top: size * 0.18,
      width: size * 0.7,
      height: size * 0.64,
      rx: size * 0.06,
      ry: size * 0.06,
      ...commonIconStroke(color, strokeWidth),
    }));
    [0.34, 0.5, 0.66].forEach((y) => {
      objects.push(line([size * 0.28, size * y, size * 0.72, size * y], color, strokeWidth));
    });
  } else if (icon === 'analytics' || icon === 'monitoring' || icon === 'metrics') {
    objects.push(line([size * 0.12, size * 0.86, size * 0.88, size * 0.86], color, strokeWidth));
    [
      [0.2, 0.55],
      [0.43, 0.34],
      [0.66, 0.64],
    ].forEach(([x, height]) => objects.push(new fabric.Rect({
      left: size * x,
      top: size * (0.86 - height),
      width: size * 0.14,
      height: size * height,
      fill: color,
      rx: size * 0.03,
      ry: size * 0.03,
      selectable: false,
      evented: false,
    })));
  } else {
    objects.push(new fabric.Rect({
      left: size * 0.13,
      top: size * 0.13,
      width: size * 0.74,
      height: size * 0.74,
      rx: size * 0.08,
      ry: size * 0.08,
      ...commonIconStroke(color, strokeWidth),
    }));
    objects.push(line([size * 0.27, size * 0.38, size * 0.73, size * 0.38], color, strokeWidth));
    objects.push(line([size * 0.27, size * 0.62, size * 0.73, size * 0.62], color, strokeWidth));
  }

  return new fabric.Group(objects, {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    selectable: false,
    evented: false,
    architectureRole: 'architecture-icon',
    architectureIcon: icon,
    architectureIconColor: color,
    architectureIconSize: size,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function createStandaloneArchitectureSymbol(
  icon: ArchitectureIconName,
  color: string = AI_ARCHITECTURE_PALETTE.green,
  size = 72,
  name = `${icon} symbol`,
) {
  const symbol = createArchitectureIcon(icon, color, size);
  const symbolId = createId('architecture-symbol');
  symbol.set({
    left: 120,
    top: 180,
    selectable: true,
    evented: true,
    hasControls: true,
    lockScalingFlip: false,
    id: symbolId,
    name,
    objectType: 'architectureSymbol',
    teckstudioObjectType: 'architectureSymbol',
    architectureRole: 'architecture-symbol',
    architectureIcon: icon,
    architectureIconColor: color,
    architectureIconSize: size,
    elementCategory: 'Technology',
    elementSubcategory: 'Diagram Symbols',
    elementTags: ['architecture', 'symbol', 'diagram', icon],
    elementEditable: true,
  } as fabric.IGroupOptions & Record<string, unknown>);
  symbol.setCoords();
  return symbol;
}

const walkFabricObject = (
  object: fabric.Object,
  visitor: (item: fabric.Object) => void,
) => {
  visitor(object);
  if (object.type === 'group') {
    (object as fabric.Group).getObjects().forEach((child) => walkFabricObject(child, visitor));
  }
};

export function recolorArchitectureSymbol(
  object: fabric.Object,
  color: string,
) {
  if (
    object.get('teckstudioObjectType' as keyof fabric.Object) !== 'architectureSymbol' &&
    object.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramArrow'
  ) return false;
  walkFabricObject(object, (item) => {
    if (item.get('diagramConnectorRole' as keyof fabric.Object) === 'diagramConnectorLabelBackground') return;
    const fill = item.get('fill');
    const stroke = item.get('stroke');
    if (typeof fill === 'string' && fill !== '' && fill !== 'transparent') item.set('fill', color);
    if (typeof stroke === 'string' && stroke !== '' && stroke !== 'transparent') item.set('stroke', color);
  });
  object.set({
    architectureIconColor: color,
    dirty: true,
  } as Record<string, unknown>);
  object.setCoords();
  return true;
}

export function setArchitectureSymbolStrokeWidth(
  object: fabric.Object,
  width: number,
) {
  if (
    object.get('teckstudioObjectType' as keyof fabric.Object) !== 'architectureSymbol' &&
    object.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramArrow'
  ) return false;
  walkFabricObject(object, (item) => {
    if (typeof item.get('stroke') === 'string' && item.get('stroke') !== '') {
      item.set('strokeWidth', Math.max(0.5, width));
    }
  });
  object.set({ dirty: true } as Record<string, unknown>);
  object.setCoords();
  return true;
}

const createArchitectureChip = (
  chip: ArchitectureChipConfig,
  nodeId: string,
  fontSize = 11,
) => {
  const text = new fabric.Text(chip.text.toUpperCase(), {
    left: 0,
    top: 0,
    fontFamily: 'IBM Plex Mono, Space Mono, Menlo, monospace',
    fontSize,
    fontWeight: 600,
    charSpacing: 80,
    fill: chip.color || AI_ARCHITECTURE_PALETTE.green,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-chip-text',
    fontReferences: ARCHITECTURE_FONT_REFERENCES.mono,
  } as fabric.ITextOptions & Record<string, unknown>);
  const width = Math.ceil((text.width || chip.text.length * fontSize * 0.62) + 18);
  const box = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height: Math.max(22, fontSize + 10),
    originX: 'center',
    originY: 'center',
    fill: chip.backgroundColor || 'rgba(67, 214, 138, 0.08)',
    stroke: chip.borderColor || 'rgba(67, 214, 138, 0.2)',
    strokeWidth: 1,
    rx: 4,
    ry: 4,
    selectable: false,
    evented: false,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-chip-background',
  } as fabric.IRectOptions & Record<string, unknown>);
  return new fabric.Group([box, text], {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    selectable: false,
    evented: false,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-chip',
    architectureChipId: chip.id || createId('architecture-chip'),
    architectureChipText: chip.text,
  } as fabric.IGroupOptions & Record<string, unknown>);
};

export function createStandaloneArchitectureChip(
  text = 'STATUS',
  color: string = AI_ARCHITECTURE_PALETTE.green,
) {
  const chipId = createId('architecture-chip');
  const chip = createArchitectureChip({
    id: chipId,
    text,
    color,
    backgroundColor: `${color}18`,
    borderColor: `${color}55`,
  }, chipId, 12);
  chip.set({
    left: 120,
    top: 180,
    selectable: true,
    evented: true,
    id: chipId,
    name: `${text} chip`,
    objectType: 'architectureChip',
    teckstudioObjectType: 'architectureChip',
    elementCategory: 'Technology',
    elementSubcategory: 'Diagram Labels',
    elementTags: ['chip', 'label', 'status', text.toLowerCase()],
    elementEditable: true,
  } as fabric.IGroupOptions & Record<string, unknown>);
  return chip;
}

export function createStandaloneStatusDot(
  color: string = AI_ARCHITECTURE_PALETTE.green,
  diameter = 18,
) {
  const id = createId('architecture-status-dot');
  return new fabric.Circle({
    left: 120,
    top: 180,
    radius: Math.max(3, diameter / 2),
    originX: 'center',
    originY: 'center',
    fill: color,
    stroke: `${color}88`,
    strokeWidth: 2,
    shadow: new fabric.Shadow({
      color,
      blur: 10,
      offsetX: 0,
      offsetY: 0,
    }),
    id,
    name: 'Status dot',
    objectType: 'architectureStatusDot',
    teckstudioObjectType: 'architectureStatusDot',
    elementCategory: 'Technology',
    elementSubcategory: 'Diagram Nodes',
    elementTags: ['status', 'dot', 'node', 'endpoint'],
    elementEditable: true,
  } as fabric.ICircleOptions & Record<string, unknown>);
}

export function createArchitectureCard(input: ArchitectureCardConfig = {}) {
  const nodeId = input.nodeId || createId('architecture-node');
  const title = input.title || 'SYSTEM NODE';
  const subtitle = input.subtitle || 'service / responsibility';
  const iconName = input.icon || 'server';
  const paddingX = Math.max(16, input.paddingX ?? 24);
  const paddingY = Math.max(14, input.paddingY ?? 20);
  const iconGap = Math.max(8, input.iconGap ?? 16);
  const textGap = Math.max(2, input.textGap ?? 7);
  const iconSize = Math.max(20, input.iconSize ?? 36);
  const titleFontSize = Math.max(12, input.titleFontSize ?? 21);
  const subtitleFontSize = Math.max(9, input.subtitleFontSize ?? 15);
  const accentColor = input.accentColor || AI_ARCHITECTURE_PALETTE.green;
  const accentWidth = Math.max(0, input.accentWidth ?? 7);
  const accentVisible = input.accentVisible !== false;
  const statusVisible = input.statusVisible !== false;
  const chips = input.chips || [];
  const contentWidth = Math.max(
    220,
    title.length * titleFontSize * 0.63 + iconSize + iconGap + paddingX * 2,
    subtitle.length * subtitleFontSize * 0.55 + iconSize + iconGap + paddingX * 2,
  );
  const width = Math.max(
    input.manualWidth || 0,
    input.width || 280,
    input.autoSize ? contentWidth : 0,
  );
  const chipHeight = chips.length > 0 ? 31 : 0;
  const height = Math.max(input.height || 142, paddingY * 2 + titleFontSize + subtitleFontSize + textGap + chipHeight);
  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    originX: 'left',
    originY: 'top',
    fill: input.backgroundColor || AI_ARCHITECTURE_PALETTE.cardBackground,
    stroke: input.borderColor || accentColor,
    strokeWidth: Math.max(1, input.borderWidth ?? 2),
    strokeUniform: true,
    opacity: input.opacity ?? 1,
    rx: Math.max(0, input.cornerRadius ?? 12),
    ry: Math.max(0, input.cornerRadius ?? 12),
    architectureNodeId: nodeId,
    architectureRole: 'architecture-card-background',
    selectable: false,
    evented: false,
  } as fabric.IRectOptions & Record<string, unknown>);
  if (input.glow) {
    background.set('shadow', new fabric.Shadow({
      color: accentColor,
      blur: input.glowBlur ?? 12,
      offsetX: 0,
      offsetY: 0,
    }));
  }

  const accent = new fabric.Rect({
    left: 0,
    top: 8,
    width: accentWidth,
    height: height - 16,
    originX: 'left',
    originY: 'top',
    fill: accentColor,
    visible: accentVisible,
    rx: 3,
    ry: 3,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-card-accent',
    selectable: false,
    evented: false,
  } as fabric.IRectOptions & Record<string, unknown>);

  const icon = createArchitectureIcon(iconName, accentColor, iconSize);
  icon.set({
    left: paddingX,
    top: paddingY + 3,
    architectureNodeId: nodeId,
  } as Record<string, unknown>);

  const textLeft = paddingX + iconSize + iconGap;
  const statusDot = new fabric.Circle({
    left: width - paddingX,
    top: paddingY + 5,
    radius: 5,
    originX: 'center',
    originY: 'center',
    fill: input.statusColor || accentColor,
    visible: statusVisible,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-card-status',
    selectable: false,
    evented: false,
  } as fabric.ICircleOptions & Record<string, unknown>);
  if (input.glow) {
    statusDot.set('shadow', new fabric.Shadow({
      color: input.statusColor || accentColor,
      blur: input.glowBlur ?? 12,
      offsetX: 0,
      offsetY: 0,
    }));
  }

  const titleObject = new fabric.IText(title.toUpperCase(), {
    left: textLeft,
    top: paddingY,
    width: Math.max(80, width - textLeft - paddingX - 14),
    fontFamily: 'IBM Plex Sans, Inter, Arial, sans-serif',
    fontSize: titleFontSize,
    fontWeight: 700,
    fill: AI_ARCHITECTURE_PALETTE.primaryText,
    charSpacing: 30,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-card-title',
    name: `${title} title`,
    fontReferences: ARCHITECTURE_FONT_REFERENCES.sans,
  } as fabric.ITextOptions & Record<string, unknown>);

  const subtitleObject = new fabric.IText(subtitle, {
    left: textLeft,
    top: paddingY + titleFontSize + textGap,
    width: Math.max(80, width - textLeft - paddingX),
    fontFamily: 'IBM Plex Sans, Inter, Arial, sans-serif',
    fontSize: subtitleFontSize,
    fontWeight: 400,
    fill: AI_ARCHITECTURE_PALETTE.secondaryText,
    architectureNodeId: nodeId,
    architectureRole: 'architecture-card-subtitle',
    name: `${title} subtitle`,
    fontReferences: ARCHITECTURE_FONT_REFERENCES.sans,
  } as fabric.ITextOptions & Record<string, unknown>);

  const chipObjects = chips.map((chip) => createArchitectureChip(chip, nodeId));
  const chipGap = 7;
  let chipCursor = textLeft;
  const chipTop = height - paddingY - 24;
  chipObjects.forEach((chip) => {
    chip.set({ left: chipCursor, top: chipTop });
    chipCursor += chip.getScaledWidth() + chipGap;
  });

  const config: ArchitectureCardConfig = {
    ...input,
    nodeId,
    title,
    subtitle,
    icon: iconName,
    width,
    height,
    paddingX,
    paddingY,
    iconGap,
    textGap,
    iconSize,
    titleFontSize,
    subtitleFontSize,
    accentColor,
    accentWidth,
    accentVisible,
    statusVisible,
    chips,
  };

  return new fabric.Group(
    [background, accent, icon, titleObject, subtitleObject, statusDot, ...chipObjects],
    {
      left: input.left ?? 120,
      top: input.top ?? 220,
      originX: 'left',
      originY: 'top',
      objectCaching: false,
      subTargetCheck: true,
      lockScalingX: true,
      lockScalingY: true,
      lockScalingFlip: true,
      ...architectureMetadata('architectureNode', title),
      id: nodeId,
      architectureNodeId: nodeId,
      architectureNodeConfig: config,
      architectureIcon: iconName,
      architectureAccentColor: accentColor,
      architectureAutoSize: Boolean(input.autoSize),
      architectureManualWidth: input.manualWidth || 0,
    } as fabric.IGroupOptions & Record<string, unknown>,
  );
}

export function getArchitectureNodes(canvas: fabric.Canvas) {
  return canvas.getObjects().filter((object) => (
    object.get('teckstudioObjectType' as keyof fabric.Object) === 'architectureNode'
  )) as fabric.Group[];
}

export function assignNewArchitectureNodeIdentity(object: fabric.Object) {
  if (object.get('teckstudioObjectType' as keyof fabric.Object) !== 'architectureNode') return null;
  const nodeId = createId('architecture-node');
  const config = object.get('architectureNodeConfig' as keyof fabric.Object) as ArchitectureCardConfig | undefined;
  object.set({
    id: nodeId,
    architectureNodeId: nodeId,
    architectureNodeConfig: { ...(config || {}), nodeId },
  } as Record<string, unknown>);
  if (object.type === 'group') {
    const updateChild = (child: fabric.Object) => {
      child.set({
        id: createId('architecture-child'),
        architectureNodeId: nodeId,
        architectureNodeConfig: { ...(config || {}), nodeId },
      } as Record<string, unknown>);
      if (child.type === 'group') {
        (child as fabric.Group).getObjects().forEach(updateChild);
      }
    };
    (object as fabric.Group).getObjects().forEach(updateChild);
  }
  return nodeId;
}

export function replaceArchitectureCard(
  canvas: fabric.Canvas,
  card: fabric.Object,
  patch: Partial<ArchitectureCardConfig>,
) {
  if (card.get('teckstudioObjectType' as keyof fabric.Object) !== 'architectureNode') return null;
  const config = card.get('architectureNodeConfig' as keyof fabric.Object) as ArchitectureCardConfig | undefined;
  const index = canvas.getObjects().indexOf(card);
  const next = createArchitectureCard({
    ...(config || {}),
    ...patch,
    nodeId: String(card.get('architectureNodeId' as keyof fabric.Object)),
    left: card.left || 0,
    top: card.top || 0,
  });
  canvas.remove(card);
  canvas.insertAt(next, Math.max(0, index), false);
  canvas.setActiveObject(next);
  updateAllDiagramConnectors(canvas);
  canvas.requestRenderAll();
  return next;
}

export function enterArchitectureCardEditing(
  canvas: fabric.Canvas,
  object: fabric.Object,
  subTargets: fabric.Object[] = [],
) {
  if (
    object.type !== 'group' ||
    object.get('teckstudioObjectType' as keyof fabric.Object) !== 'architectureNode'
  ) return false;
  const group = object as fabric.Group;
  const nodeId = String(group.get('architectureNodeId' as keyof fabric.Object));
  const config = group.get('architectureNodeConfig' as keyof fabric.Object);
  const selection = group.toActiveSelection();
  const preferred = subTargets.find((target) => {
    const role = target.get('architectureRole' as keyof fabric.Object);
    return role === 'architecture-card-title' || role === 'architecture-card-subtitle';
  });
  const textObject = preferred || selection.getObjects().find((child) => (
    child.get('architectureRole' as keyof fabric.Object) === 'architecture-card-title'
  ));
  if (!textObject || textObject.type !== 'i-text') return false;
  selection.getObjects().forEach((child) => child.set({
    architectureNodeId: nodeId,
    architectureNodeConfig: config,
  } as Record<string, unknown>));
  canvas.setActiveObject(textObject);
  const editableText = textObject as fabric.IText;
  editableText.enterEditing();
  editableText.selectAll();
  editableText.hiddenTextarea?.focus();
  canvas.requestRenderAll();
  return true;
}

export function regroupArchitectureNode(canvas: fabric.Canvas, nodeId: string) {
  const children = canvas.getObjects().filter((object) => (
    object.get('architectureNodeId' as keyof fabric.Object) === nodeId &&
    object.get('teckstudioObjectType' as keyof fabric.Object) !== 'architectureNode'
  ));
  if (children.length < 4) return null;
  const title = children.find((child) => child.get('architectureRole' as keyof fabric.Object) === 'architecture-card-title') as fabric.IText | undefined;
  const subtitle = children.find((child) => child.get('architectureRole' as keyof fabric.Object) === 'architecture-card-subtitle') as fabric.IText | undefined;
  const storedConfig = children[0].get('architectureNodeConfig' as keyof fabric.Object) as ArchitectureCardConfig | undefined;
  const selection = new fabric.ActiveSelection(children, { canvas });
  canvas.setActiveObject(selection);
  const group = selection.toGroup();
  const config = {
    ...(storedConfig || {}),
    nodeId,
    title: title?.text || storedConfig?.title,
    subtitle: subtitle?.text || storedConfig?.subtitle,
  };
  group.set({
    id: nodeId,
    name: config.title || 'Architecture node',
    objectType: 'architectureNode',
    teckstudioObjectType: 'architectureNode',
    architectureRole: 'architectureNode',
    architectureNodeId: nodeId,
    architectureNodeConfig: config,
    architectureIcon: config.icon,
    architectureAccentColor: config.accentColor,
    elementCategory: 'Technology',
    elementSubcategory: 'System Design',
    elementTags: ['architecture', 'diagram', 'node'],
    elementEditable: true,
    objectCaching: false,
    subTargetCheck: true,
    lockScalingX: true,
    lockScalingY: true,
  } as Record<string, unknown>);
  canvas.setActiveObject(group);
  updateAllDiagramConnectors(canvas);
  canvas.requestRenderAll();
  return group;
}

export function createTechnicalGrid(
  width: number,
  height: number,
  input: TechnicalGridConfig = {},
) {
  const horizontalSpacing = Math.max(20, input.horizontalSpacing ?? 90);
  const verticalSpacing = Math.max(20, input.verticalSpacing ?? 90);
  const color = input.color || AI_ARCHITECTURE_PALETTE.grid;
  const opacity = Math.min(1, Math.max(0.01, input.opacity ?? 0.1));
  const thickness = Math.max(0.25, input.thickness ?? 1);
  const majorEvery = Math.max(1, input.majorEvery ?? 4);
  const majorOpacity = Math.min(1, Math.max(opacity, input.majorOpacity ?? opacity * 1.8));
  const offsetX = input.offsetX || 0;
  const offsetY = input.offsetY || 0;
  const lines: fabric.Line[] = [];

  let column = 0;
  for (let x = offsetX; x <= width; x += verticalSpacing) {
    lines.push(new fabric.Line([x, 0, x, height], {
      stroke: color,
      strokeWidth: column % majorEvery === 0 ? thickness * 1.3 : thickness,
      opacity: column % majorEvery === 0 ? majorOpacity : opacity,
      selectable: false,
      evented: false,
      strokeUniform: true,
    }));
    column += 1;
  }
  let row = 0;
  for (let y = offsetY; y <= height; y += horizontalSpacing) {
    lines.push(new fabric.Line([0, y, width, y], {
      stroke: color,
      strokeWidth: row % majorEvery === 0 ? thickness * 1.3 : thickness,
      opacity: row % majorEvery === 0 ? majorOpacity : opacity,
      selectable: false,
      evented: false,
      strokeUniform: true,
    }));
    row += 1;
  }

  const config: TechnicalGridConfig = {
    ...input,
    horizontalSpacing,
    verticalSpacing,
    color,
    opacity,
    thickness,
    majorEvery,
    majorOpacity,
    offsetX,
    offsetY,
    visible: input.visible !== false,
  };
  return new fabric.Group(lines, {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    selectable: true,
    evented: false,
    visible: config.visible,
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    ...architectureMetadata('technicalGrid', 'Technical architecture grid'),
    technicalGridConfig: config,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function createSegmentedHeaderBars(
  width: number,
  top = 185,
  colors = [
    AI_ARCHITECTURE_PALETTE.green,
    AI_ARCHITECTURE_PALETTE.yellow,
    AI_ARCHITECTURE_PALETTE.orange,
    AI_ARCHITECTURE_PALETTE.green,
  ],
  gap = 10,
  height = 7,
) {
  const totalWidth = width * 0.83;
  const segmentWidth = (totalWidth - gap * (colors.length - 1)) / colors.length;
  const left = (width - totalWidth) / 2;
  const segments = colors.map((color, index) => new fabric.Rect({
    left: index * (segmentWidth + gap),
    top: 0,
    width: segmentWidth,
    height,
    fill: color,
    rx: height / 2,
    ry: height / 2,
    selectable: false,
    evented: false,
    architectureRole: 'architecture-header-segment',
    architectureSegmentColor: color,
  } as fabric.IRectOptions & Record<string, unknown>));
  return new fabric.Group(segments, {
    left,
    top,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    ...architectureMetadata('segmentedHeader', 'Architecture colored header bars'),
    architectureSegmentColors: colors,
    architectureSegmentGap: gap,
    architectureSegmentHeight: height,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function createStageTracker(input: StageTrackerConfig = {}) {
  const labels = input.labels || ['REQUEST', 'CONTEXT', 'INFER', 'STREAM'];
  const colors = input.colors || [
    AI_ARCHITECTURE_PALETTE.green,
    AI_ARCHITECTURE_PALETTE.yellow,
    AI_ARCHITECTURE_PALETTE.orange,
    AI_ARCHITECTURE_PALETTE.green,
  ];
  const orientation = input.orientation || 'horizontal';
  const width = Math.max(300, input.width || 900);
  const circleSize = Math.max(6, input.circleSize || 12);
  const lineWidth = Math.max(1, input.lineWidth || 2);
  const labelGap = Math.max(8, input.labelGap || 18);
  const objects: fabric.Object[] = [];
  const spacing = width / Math.max(1, labels.length - 1);
  const points = labels.map((_, index) => ({
    x: orientation === 'horizontal' ? index * spacing : 0,
    y: orientation === 'horizontal' ? 0 : index * spacing,
  }));

  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    objects.push(new fabric.Line([point.x, point.y, next.x, next.y], {
      stroke: colors[index] || AI_ARCHITECTURE_PALETTE.inactiveConnector,
      strokeWidth: lineWidth,
      opacity: 0.65,
      selectable: false,
      evented: false,
      strokeUniform: true,
      architectureRole: 'architecture-stage-line',
    } as fabric.ILineOptions & Record<string, unknown>));
    if (input.arrows) {
      const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
      objects.push(new fabric.Triangle({
        left: (point.x + next.x) / 2,
        top: (point.y + next.y) / 2,
        width: circleSize,
        height: circleSize,
        angle: angle + 90,
        originX: 'center',
        originY: 'center',
        fill: colors[index] || AI_ARCHITECTURE_PALETTE.inactiveConnector,
        selectable: false,
        evented: false,
        architectureRole: 'architecture-stage-arrow',
      } as fabric.ITriangleOptions & Record<string, unknown>));
    }
  });

  points.forEach((point, index) => {
    const color = colors[index] || colors[colors.length - 1] || AI_ARCHITECTURE_PALETTE.green;
    const circle = new fabric.Circle({
      left: point.x,
      top: point.y,
      radius: circleSize / 2,
      originX: 'center',
      originY: 'center',
      fill: color,
      stroke: color,
      strokeWidth: 2,
      selectable: false,
      evented: false,
      architectureRole: 'architecture-stage-node',
      architectureStageIndex: index,
    } as fabric.ICircleOptions & Record<string, unknown>);
    if (input.glow !== false) {
      circle.set('shadow', new fabric.Shadow({ color, blur: 12, offsetX: 0, offsetY: 0 }));
    }
    objects.push(circle);
    objects.push(new fabric.IText(labels[index], {
      left: orientation === 'horizontal' ? point.x : point.x + labelGap,
      top: orientation === 'horizontal' ? point.y + labelGap : point.y,
      originX: orientation === 'horizontal' ? 'center' : 'left',
      originY: orientation === 'horizontal' ? 'top' : 'center',
      fontFamily: 'IBM Plex Mono, Space Mono, Menlo, monospace',
      fontSize: 15,
      fontWeight: 700,
      fill: color,
      charSpacing: 55,
      architectureRole: 'architecture-stage-label',
      architectureStageIndex: index,
      name: `${labels[index]} stage`,
      fontReferences: ARCHITECTURE_FONT_REFERENCES.mono,
    } as fabric.ITextOptions & Record<string, unknown>));
  });

  const config: StageTrackerConfig = {
    ...input,
    labels,
    colors,
    orientation,
    width,
    circleSize,
    lineWidth,
    labelGap,
  };
  return new fabric.Group(objects, {
    left: input.left ?? 90,
    top: input.top ?? 240,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    subTargetCheck: true,
    ...architectureMetadata('stageTracker', 'Architecture stage tracker'),
    stageTrackerConfig: config,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

const heading = (
  text: string,
  top: number,
  fontSize: number,
  fill: string,
  role: string,
  charSpacing: number,
) => new fabric.IText(text, {
  left: 540,
  top,
  originX: 'center',
  originY: 'top',
  fontFamily: 'Manrope, Inter, Arial, sans-serif',
  fontSize,
  fontWeight: role === 'architecture-title' ? 800 : 500,
  fill,
  charSpacing,
  textAlign: 'center',
  fontReferences: ARCHITECTURE_FONT_REFERENCES.heading,
  ...architectureMetadata(role, text),
} as fabric.ITextOptions & Record<string, unknown>);

export async function applyAIChatArchitectureTemplate(canvas: fabric.Canvas) {
  await ensureArchitectureFontsLoaded();
  const width = 1080;
  const height = 1350;
  canvas.clear();
  canvas.setDimensions({ width, height });
  canvas.setBackgroundColor(AI_ARCHITECTURE_PALETTE.background, () => undefined);

  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    fill: AI_ARCHITECTURE_PALETTE.background,
    selectable: true,
    evented: false,
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    ...architectureMetadata('architectureBackground', 'AI architecture background'),
  } as fabric.IRectOptions & Record<string, unknown>);
  const grid = createTechnicalGrid(width, height);
  const title = heading('AI CHAT SYSTEM', 62, 62, AI_ARCHITECTURE_PALETTE.primaryText, 'architecture-title', 75);
  const subtitle = heading('HOW THE REPLY TRAVELS', 135, 27, AI_ARCHITECTURE_PALETTE.secondaryText, 'architecture-subtitle', 110);
  const bars = createSegmentedHeaderBars(width, 190);
  const stages = createStageTracker({ left: 92, top: 245, width: 896, glow: true });

  const nodeConfigs: ArchitectureCardConfig[] = [
    { nodeId: 'node-member', title: 'MEMBER', subtitle: 'web / mobile', icon: 'member', left: 38, top: 345, width: 265, accentColor: AI_ARCHITECTURE_PALETTE.green },
    { nodeId: 'node-edge', title: 'EDGE', subtitle: 'CDN / WAF', icon: 'globe', left: 408, top: 345, width: 265, accentColor: AI_ARCHITECTURE_PALETTE.blue },
    { nodeId: 'node-api-gateway', title: 'API GATEWAY', subtitle: 'auth / rate limits', icon: 'gateway', left: 777, top: 345, width: 265, accentColor: AI_ARCHITECTURE_PALETTE.purple },
    { nodeId: 'node-hot-cache', title: 'HOT CACHE', subtitle: 'session / prompt', icon: 'database', left: 38, top: 555, width: 280, accentColor: AI_ARCHITECTURE_PALETTE.yellow },
    {
      nodeId: 'node-orchestrator',
      title: 'CHAT ORCHESTRATOR',
      subtitle: 'state / tools / streaming',
      icon: 'chat',
      left: 325,
      top: 525,
      width: 430,
      height: 170,
      accentColor: AI_ARCHITECTURE_PALETTE.green,
      chips: [
        { text: 'SESSION', color: AI_ARCHITECTURE_PALETTE.green },
        { text: 'TOOLS', color: AI_ARCHITECTURE_PALETTE.yellow, backgroundColor: 'rgba(242, 201, 76, 0.08)', borderColor: 'rgba(242, 201, 76, 0.2)' },
        { text: 'STREAM', color: AI_ARCHITECTURE_PALETTE.green },
      ],
    },
    { nodeId: 'node-model-router', title: 'MODEL ROUTER', subtitle: 'batch / retries / policy', icon: 'router', left: 777, top: 555, width: 265, accentColor: AI_ARCHITECTURE_PALETTE.orange },
    { nodeId: 'node-conversation-db', title: 'CONVERSATION DB', subtitle: 'messages / metadata', icon: 'database', left: 38, top: 785, width: 300, accentColor: AI_ARCHITECTURE_PALETTE.yellow },
    { nodeId: 'node-event-bus', title: 'EVENT BUS', subtitle: 'non-blocking work', icon: 'event', left: 390, top: 825, width: 300, accentColor: AI_ARCHITECTURE_PALETTE.orange },
    { nodeId: 'node-gpu', title: 'GPU INFERENCE', subtitle: 'token generation', icon: 'chip', left: 777, top: 785, width: 265, accentColor: AI_ARCHITECTURE_PALETTE.blue },
    { nodeId: 'node-workers', title: 'ASYNC WORKERS', subtitle: 'logs / metrics / evals / billing', icon: 'workers', left: 285, top: 1080, width: 510, height: 155, accentColor: AI_ARCHITECTURE_PALETTE.green },
  ];
  const nodes = nodeConfigs.map(createArchitectureCard);
  const animationFor = (
    presetId: DiagramConnectorAnimationPresetId,
    overrides: DiagramConnectorAnimationConfig = {},
  ): DiagramConnectorAnimationConfig => ({
    ...(getConnectorAnimationPreset(presetId)?.connector.animation || {}),
    ...overrides,
  });

  canvas.add(background, grid, ...nodes);
  const connectors = [
    {
      connectorId: 'connector-member-edge',
      sourceNodeId: 'node-member',
      targetNodeId: 'node-edge',
      sourceAnchor: 'right' as const,
      targetAnchor: 'left' as const,
      style: 'dotted' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow' as const,
      label: 'REQUEST',
      animation: animationFor('request-flow', { sequenceOrder: 0 }),
    },
    {
      connectorId: 'connector-edge-api',
      sourceNodeId: 'node-edge',
      targetNodeId: 'node-api-gateway',
      sourceAnchor: 'right' as const,
      targetAnchor: 'left' as const,
      style: 'dotted' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.blue,
      endArrow: 'arrow' as const,
      animation: animationFor('inference-flow', {
        type: 'moving-dots',
        particleCount: 4,
        sequenceOrder: 1,
      }),
    },
    {
      connectorId: 'connector-api-orchestrator',
      sourceNodeId: 'node-api-gateway',
      targetNodeId: 'node-orchestrator',
      sourceAnchor: 'bottom-left' as const,
      targetAnchor: 'top-right' as const,
      style: 'dotted' as const,
      routing: 'curved' as const,
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow' as const,
      label: 'RESPONSE',
      labelPosition: 0.45,
      animation: animationFor('response-flow', { sequenceOrder: 2 }),
    },
    {
      connectorId: 'connector-cache-orchestrator',
      sourceNodeId: 'node-hot-cache',
      targetNodeId: 'node-orchestrator',
      sourceAnchor: 'right' as const,
      targetAnchor: 'left' as const,
      style: 'dotted' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.yellow,
      animation: animationFor('async-flow', {
        flowColor: AI_ARCHITECTURE_PALETTE.yellow,
        glowColor: AI_ARCHITECTURE_PALETTE.yellow,
        sequenceOrder: 3,
      }),
    },
    {
      connectorId: 'connector-db-orchestrator',
      sourceNodeId: 'node-conversation-db',
      targetNodeId: 'node-orchestrator',
      sourceAnchor: 'top-right' as const,
      targetAnchor: 'bottom-left' as const,
      style: 'dotted' as const,
      routing: 'curved' as const,
      color: AI_ARCHITECTURE_PALETTE.yellow,
      animation: animationFor('async-flow', {
        flowColor: AI_ARCHITECTURE_PALETTE.yellow,
        glowColor: AI_ARCHITECTURE_PALETTE.yellow,
        sequenceOrder: 4,
      }),
    },
    {
      connectorId: 'connector-orchestrator-router',
      sourceNodeId: 'node-orchestrator',
      targetNodeId: 'node-model-router',
      sourceAnchor: 'right' as const,
      targetAnchor: 'left' as const,
      style: 'dotted' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow' as const,
      label: 'STREAM',
      animation: animationFor('stream-flow', { sequenceOrder: 3 }),
    },
    {
      connectorId: 'connector-router-gpu',
      sourceNodeId: 'node-model-router',
      targetNodeId: 'node-gpu',
      sourceAnchor: 'bottom' as const,
      targetAnchor: 'top' as const,
      style: 'dotted' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.blue,
      endArrow: 'arrow' as const,
      label: 'INFERENCE',
      labelOffset: 22,
      animation: animationFor('inference-flow', { sequenceOrder: 4 }),
    },
    {
      connectorId: 'connector-orchestrator-event',
      sourceNodeId: 'node-orchestrator',
      targetNodeId: 'node-event-bus',
      sourceAnchor: 'bottom' as const,
      targetAnchor: 'top' as const,
      style: 'dotted' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.orange,
      animation: animationFor('event-flow', { sequenceOrder: 4 }),
    },
    {
      connectorId: 'connector-event-workers',
      sourceNodeId: 'node-event-bus',
      targetNodeId: 'node-workers',
      sourceAnchor: 'bottom' as const,
      targetAnchor: 'top' as const,
      style: 'dashed' as const,
      routing: 'straight' as const,
      color: AI_ARCHITECTURE_PALETTE.orange,
      endArrow: 'arrow' as const,
      animation: animationFor('event-flow', { sequenceOrder: 5 }),
    },
    {
      connectorId: 'connector-gpu-workers',
      sourceNodeId: 'node-gpu',
      targetNodeId: 'node-workers',
      sourceAnchor: 'bottom-left' as const,
      targetAnchor: 'top-right' as const,
      style: 'dotted' as const,
      routing: 'curved' as const,
      color: AI_ARCHITECTURE_PALETTE.inactiveConnector,
      animation: animationFor('async-flow', {
        flowColor: AI_ARCHITECTURE_PALETTE.blue,
        glowColor: AI_ARCHITECTURE_PALETTE.blue,
        sequenceOrder: 5,
      }),
    },
  ].flatMap((config) => createDiagramConnector(canvas, config));

  connectors.forEach((object, index) => canvas.moveTo(object, 2 + index));
  canvas.add(bars, stages, title, subtitle);
  canvas.discardActiveObject();
  updateAllDiagramConnectors(canvas);
  canvas.renderAll();
  return {
    name: AI_ARCHITECTURE_TEMPLATE_NAME,
    nodes,
    connectors,
  };
}

export async function applyDistributedSystemArchitectureTemplate(canvas: fabric.Canvas) {
  await ensureArchitectureFontsLoaded();
  const width = 1440;
  const height = 1000;
  const templateRunId = createId('distributed-system');
  const nodeId = (key: string) => `${templateRunId}-${key}`;
  canvas.setDimensions({ width, height });
  canvas.setBackgroundColor(AI_ARCHITECTURE_PALETTE.background, () => undefined);

  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    fill: AI_ARCHITECTURE_PALETTE.background,
    selectable: true,
    evented: false,
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    ...architectureMetadata('architectureBackground', 'Distributed system background'),
  } as fabric.IRectOptions & Record<string, unknown>);
  const grid = createTechnicalGrid(width, height, {
    majorEvery: 5,
    horizontalSpacing: 24,
    verticalSpacing: 24,
    opacity: 0.34,
    thickness: 1,
    color: AI_ARCHITECTURE_PALETTE.grid,
  });
  const title = new fabric.IText('DISTRIBUTED SYSTEM ARCHITECTURE', {
    left: width / 2,
    top: 46,
    originX: 'center',
    originY: 'top',
    fontFamily: 'Manrope, Inter, Arial, sans-serif',
    fontSize: 42,
    fontWeight: 800,
    fill: AI_ARCHITECTURE_PALETTE.primaryText,
    charSpacing: 65,
    textAlign: 'center',
    fontReferences: ARCHITECTURE_FONT_REFERENCES.heading,
    ...architectureMetadata('architecture-title', 'Distributed system architecture'),
  } as fabric.ITextOptions & Record<string, unknown>);
  const subtitle = new fabric.IText('CLIENTS → EDGE → SERVICES → DATA → OBSERVABILITY', {
    left: width / 2,
    top: 102,
    originX: 'center',
    originY: 'top',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 16,
    fontWeight: 700,
    fill: AI_ARCHITECTURE_PALETTE.secondaryText,
    charSpacing: 120,
    textAlign: 'center',
    fontReferences: ARCHITECTURE_FONT_REFERENCES.mono,
    ...architectureMetadata('architecture-subtitle', 'Distributed system subtitle'),
  } as fabric.ITextOptions & Record<string, unknown>);

  const section = (label: string, left: number, top: number, sectionWidth: number, sectionHeight: number, color: string) => new fabric.Group([
    new fabric.Rect({
      left: 0,
      top: 0,
      width: sectionWidth,
      height: sectionHeight,
      rx: 18,
      ry: 18,
      fill: 'rgba(17, 21, 29, 0.34)',
      stroke: `${color}66`,
      strokeWidth: 1.5,
      strokeDashArray: [10, 9],
      selectable: false,
      evented: false,
    }),
    new fabric.IText(label, {
      left: 18,
      top: 14,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 13,
      fontWeight: 700,
      fill: color,
      charSpacing: 80,
      selectable: false,
      evented: false,
      fontReferences: ARCHITECTURE_FONT_REFERENCES.mono,
    } as fabric.ITextOptions & Record<string, unknown>),
  ], {
    left,
    top,
    objectCaching: false,
    selectable: true,
    evented: true,
    ...architectureMetadata('architectureSection', label),
  } as fabric.IGroupOptions & Record<string, unknown>);

  const nodeConfigs: ArchitectureCardConfig[] = [
    { nodeId: nodeId('browser'), title: 'BROWSER', subtitle: 'web client', icon: 'browser', left: 70, top: 240, width: 235, accentColor: AI_ARCHITECTURE_PALETTE.blue },
    { nodeId: nodeId('mobile'), title: 'MOBILE APP', subtitle: 'iOS / Android', icon: 'mobile', left: 70, top: 405, width: 235, accentColor: AI_ARCHITECTURE_PALETTE.green },
    { nodeId: nodeId('cdn'), title: 'CDN / EDGE', subtitle: 'static cache / WAF', icon: 'globe', left: 380, top: 240, width: 245, accentColor: AI_ARCHITECTURE_PALETTE.blue },
    { nodeId: nodeId('load-balancer'), title: 'LOAD BALANCER', subtitle: 'traffic routing', icon: 'loadBalancer', left: 380, top: 405, width: 245, accentColor: AI_ARCHITECTURE_PALETTE.purple },
    { nodeId: nodeId('api'), title: 'API GATEWAY', subtitle: 'auth / throttling', icon: 'gateway', left: 705, top: 320, width: 275, accentColor: AI_ARCHITECTURE_PALETTE.purple },
    { nodeId: nodeId('service-a'), title: 'USER SERVICE', subtitle: 'profile / accounts', icon: 'server', left: 1060, top: 210, width: 270, accentColor: AI_ARCHITECTURE_PALETTE.green },
    { nodeId: nodeId('service-b'), title: 'ORDER SERVICE', subtitle: 'business workflow', icon: 'server', left: 1060, top: 375, width: 270, accentColor: AI_ARCHITECTURE_PALETTE.green },
    { nodeId: nodeId('worker'), title: 'ASYNC WORKERS', subtitle: 'jobs / retries', icon: 'workers', left: 1060, top: 540, width: 270, accentColor: AI_ARCHITECTURE_PALETTE.green },
    { nodeId: nodeId('redis'), title: 'REDIS CACHE', subtitle: 'hot reads / sessions', icon: 'cache', left: 705, top: 575, width: 275, accentColor: AI_ARCHITECTURE_PALETTE.yellow },
    { nodeId: nodeId('event-bus'), title: 'KAFKA / EVENT BUS', subtitle: 'topics / pub-sub', icon: 'event', left: 705, top: 740, width: 275, accentColor: AI_ARCHITECTURE_PALETTE.orange },
    { nodeId: nodeId('primary-db'), title: 'PRIMARY DB', subtitle: 'writes / transactions', icon: 'database', left: 1060, top: 740, width: 270, accentColor: AI_ARCHITECTURE_PALETTE.yellow },
    { nodeId: nodeId('replica-db'), title: 'READ REPLICA', subtitle: 'read scale / failover', icon: 'database', left: 380, top: 740, width: 245, accentColor: AI_ARCHITECTURE_PALETTE.yellow },
    { nodeId: nodeId('storage'), title: 'OBJECT STORAGE', subtitle: 'files / media', icon: 'storage', left: 70, top: 740, width: 235, accentColor: AI_ARCHITECTURE_PALETTE.blue },
  ];
  const nodes = nodeConfigs.map(createArchitectureCard);
  const sections = [
    section('CLIENTS', 38, 185, 300, 395, AI_ARCHITECTURE_PALETTE.blue),
    section('EDGE', 348, 185, 310, 395, AI_ARCHITECTURE_PALETTE.purple),
    section('APPLICATION SERVICES', 680, 185, 680, 525, AI_ARCHITECTURE_PALETTE.green),
    section('DATA PLATFORM', 38, 700, 1322, 245, AI_ARCHITECTURE_PALETTE.yellow),
  ];
  const animationFor = (
    presetId: DiagramConnectorAnimationPresetId,
    overrides: DiagramConnectorAnimationConfig = {},
  ): DiagramConnectorAnimationConfig => ({
    ...(getConnectorAnimationPreset(presetId)?.connector.animation || {}),
    ...overrides,
  });

  canvas.add(background, grid, ...sections, ...nodes);
  const connectors = [
    { connectorId: `${templateRunId}-browser-cdn`, sourceNodeId: nodeId('browser'), targetNodeId: nodeId('cdn'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'straight' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.blue, endArrow: 'arrow' as const, label: 'HTTPS', animation: animationFor('request-flow', { sequenceOrder: 0 }) },
    { connectorId: `${templateRunId}-mobile-lb`, sourceNodeId: nodeId('mobile'), targetNodeId: nodeId('load-balancer'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'straight' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.green, endArrow: 'arrow' as const, label: 'API', animation: animationFor('request-flow', { sequenceOrder: 1 }) },
    { connectorId: `${templateRunId}-cdn-api`, sourceNodeId: nodeId('cdn'), targetNodeId: nodeId('api'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'elbow' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.blue, endArrow: 'arrow' as const, label: 'REQUEST', animation: animationFor('request-flow', { sequenceOrder: 2 }) },
    { connectorId: `${templateRunId}-lb-api`, sourceNodeId: nodeId('load-balancer'), targetNodeId: nodeId('api'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'straight' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.purple, endArrow: 'arrow' as const, animation: animationFor('request-flow', { sequenceOrder: 2 }) },
    { connectorId: `${templateRunId}-api-service-a`, sourceNodeId: nodeId('api'), targetNodeId: nodeId('service-a'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'orthogonal' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.green, endArrow: 'arrow' as const, label: 'REST', animation: animationFor('stream-flow', { sequenceOrder: 3 }) },
    { connectorId: `${templateRunId}-api-service-b`, sourceNodeId: nodeId('api'), targetNodeId: nodeId('service-b'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'straight' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.green, endArrow: 'arrow' as const, label: 'RPC', animation: animationFor('stream-flow', { sequenceOrder: 4 }) },
    { connectorId: `${templateRunId}-api-redis`, sourceNodeId: nodeId('api'), targetNodeId: nodeId('redis'), sourceAnchor: 'bottom' as const, targetAnchor: 'top' as const, routing: 'straight' as const, style: 'dotted' as const, color: AI_ARCHITECTURE_PALETTE.yellow, startArrow: 'circle' as const, endArrow: 'arrow' as const, label: 'CACHE', animation: animationFor('async-flow', { flowColor: AI_ARCHITECTURE_PALETTE.yellow, glowColor: AI_ARCHITECTURE_PALETTE.yellow, sequenceOrder: 5 }) },
    { connectorId: `${templateRunId}-service-b-worker`, sourceNodeId: nodeId('service-b'), targetNodeId: nodeId('worker'), sourceAnchor: 'bottom' as const, targetAnchor: 'top' as const, routing: 'straight' as const, style: 'dashed' as const, color: AI_ARCHITECTURE_PALETTE.orange, endArrow: 'arrow' as const, label: 'JOB', animation: animationFor('event-flow', { sequenceOrder: 6 }) },
    { connectorId: `${templateRunId}-service-worker-bus`, sourceNodeId: nodeId('worker'), targetNodeId: nodeId('event-bus'), sourceAnchor: 'left' as const, targetAnchor: 'right' as const, routing: 'elbow' as const, style: 'dashed' as const, color: AI_ARCHITECTURE_PALETTE.orange, endArrow: 'arrow' as const, label: 'EVENT', animation: animationFor('event-flow', { sequenceOrder: 7 }) },
    { connectorId: `${templateRunId}-service-a-primary`, sourceNodeId: nodeId('service-a'), targetNodeId: nodeId('primary-db'), sourceAnchor: 'bottom' as const, targetAnchor: 'top' as const, routing: 'orthogonal' as const, style: 'solid' as const, color: AI_ARCHITECTURE_PALETTE.yellow, endArrow: 'arrow' as const, label: 'WRITE', animation: animationFor('async-flow', { flowColor: AI_ARCHITECTURE_PALETTE.yellow, glowColor: AI_ARCHITECTURE_PALETTE.yellow, sequenceOrder: 8 }) },
    { connectorId: `${templateRunId}-primary-replica`, sourceNodeId: nodeId('primary-db'), targetNodeId: nodeId('replica-db'), sourceAnchor: 'left' as const, targetAnchor: 'right' as const, routing: 'straight' as const, style: 'dotted' as const, color: AI_ARCHITECTURE_PALETTE.yellow, endArrow: 'arrow' as const, label: 'REPLICATION', animation: animationFor('async-flow', { flowColor: AI_ARCHITECTURE_PALETTE.yellow, glowColor: AI_ARCHITECTURE_PALETTE.yellow, sequenceOrder: 9 }) },
    { connectorId: `${templateRunId}-storage-primary`, sourceNodeId: nodeId('storage'), targetNodeId: nodeId('primary-db'), sourceAnchor: 'right' as const, targetAnchor: 'left' as const, routing: 'straight' as const, style: 'dashed' as const, color: AI_ARCHITECTURE_PALETTE.blue, startArrow: 'arrow' as const, endArrow: 'arrow' as const, label: 'FILES', animation: animationFor('inference-flow', { sequenceOrder: 10 }) },
  ].flatMap((config) => createDiagramConnector(canvas, config));

  canvas.add(title, subtitle);
  canvas.sendToBack(background);
  canvas.moveTo(grid, 1);
  sections.forEach((object, index) => canvas.moveTo(object, 2 + index));
  connectors.forEach((object, index) => canvas.moveTo(object, 2 + sections.length + index));
  nodes.forEach((object) => object.bringToFront());
  title.bringToFront();
  subtitle.bringToFront();
  canvas.discardActiveObject();
  updateAllDiagramConnectors(canvas);
  canvas.renderAll();
  return {
    name: DISTRIBUTED_SYSTEM_TEMPLATE_NAME,
    nodes,
    connectors,
  };
}
