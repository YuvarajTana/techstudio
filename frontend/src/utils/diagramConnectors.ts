import { fabric } from 'fabric';
import {
  AI_ARCHITECTURE_PALETTE,
  normalizeConnectorAnimation,
} from './architectureDiagramTypes';
import { normalizeDiagramLayerStack } from './layerOrdering';
import type {
  ConnectorAnchor,
  DiagramArrowStyle,
  DiagramConnectorConfig,
  DiagramConnectorRouting,
} from './architectureDiagramTypes';

type DiagramPath = fabric.Path & {
  _setPath?: (path: string | unknown[], options?: Record<string, unknown>) => void;
};

type RoutePoint = {
  x: number;
  y: number;
};

const cloneRoutePoint = (point?: RoutePoint | null): RoutePoint | undefined => (
  point
    ? { x: Number(point.x) || 0, y: Number(point.y) || 0 }
    : undefined
);

const CONNECTOR_ROUTINGS = new Set<DiagramConnectorRouting>([
  'straight',
  'horizontal',
  'vertical',
  'elbow',
  'orthogonal',
  'curved',
  'bezier',
  'loop',
]);

const isConnectorRouting = (value?: string): value is DiagramConnectorRouting => (
  Boolean(value) && CONNECTOR_ROUTINGS.has(value as DiagramConnectorRouting)
);

const createId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const connectorObjectMetadata = (
  connectorId: string,
  role: string,
  config: DiagramConnectorConfig,
) => ({
  id: createId(`${connectorId}-${role}`),
  objectId: connectorId,
  name: `${config.label || 'Diagram connector'} — ${role}`,
  objectType: role,
  teckstudioObjectType: role,
  diagramConnectorId: connectorId,
  diagramConnectorRole: role,
  diagramConnectorConfig: config,
  connectorSourceNodeId: config.sourceObjectId || config.sourceNodeId,
  connectorTargetNodeId: config.targetObjectId || config.targetNodeId,
  sourceObjectId: config.sourceObjectId || config.sourceNodeId,
  targetObjectId: config.targetObjectId || config.targetNodeId,
  sourceAnchor: config.sourceAnchor,
  targetAnchor: config.targetAnchor,
  manualConnector: config.manualConnector,
  manualStartPoint: config.manualStartPoint,
  manualEndPoint: config.manualEndPoint,
  connectorType: config.connectorType || config.routing,
  lineStyle: config.lineStyle || config.style,
  connectorSourceObjectId: config.sourceObjectId || config.sourceNodeId,
  connectorTargetObjectId: config.targetObjectId || config.targetNodeId,
  connectorSourceAnchor: config.sourceAnchor,
  connectorTargetAnchor: config.targetAnchor,
  connectorRouting: config.routing,
  connectorLineStyle: config.style,
  connectorBendOffset: config.bendOffset,
  connectorCurvature: config.curvature,
  connectorArrowheadColor: config.arrowheadColor || config.color,
  elementCategory: 'Technology',
  elementSubcategory: 'Diagram connectors',
  elementTags: ['architecture', 'diagram', 'connector', role],
  elementEditable: true,
});

const CONNECTOR_DECORATION_TYPES = new Set([
  'diagramConnectorPath',
  'diagramConnectorStart',
  'diagramConnectorEnd',
  'diagramConnectorLabel',
  'diagramConnectorLabelText',
  'diagramConnectorLabelBackground',
  'diagramConnectorPreview',
  'diagramAnchor',
  'diagramBendHandle',
  'diagramEndpointHandle',
  'diagramArrow',
  'diagramArrowPath',
  'diagramBoxText',
  'diagramBoxBackground',
  'editorGuide',
]);

const CONNECTABLE_FABRIC_TYPES = new Set([
  'rect',
  'circle',
  'ellipse',
  'triangle',
  'polygon',
  'image',
]);

const TEXT_FABRIC_TYPES = new Set([
  'text',
  'textbox',
  'i-text',
]);

const isLegacyConnectorDecorationName = (object: fabric.Object) => (
  String(object.get('name' as keyof fabric.Object) || '').startsWith('Diagram connector — diagramConnector')
);

export const getConnectableObjectId = (object?: fabric.Object | null) => {
  if (!object) return '';
  return String(
    object.get('architectureNodeId' as keyof fabric.Object)
    || object.get('id' as keyof fabric.Object)
    || object.get('objectId' as keyof fabric.Object)
    || '',
  );
};

export const ensureConnectableObjectId = (object: fabric.Object) => {
  const existing = getConnectableObjectId(object);
  if (existing) return existing;
  const id = createId('connectable');
  object.set({ id } as Record<string, unknown>);
  return id;
};

export const isConnectableDiagramObject = (object?: fabric.Object | null) => {
  if (!object) return false;
  if (object.get('editorOnly' as keyof fabric.Object) === true) return false;
  if (object.get('excludeFromExport' as keyof fabric.Object) === true) return false;
  if (object.selectable === false || object.evented === false) return false;

  const fabricType = String(object.type || '');
  const objectType = String(object.get('objectType' as keyof fabric.Object) || '');
  const teckstudioType = String(object.get('teckstudioObjectType' as keyof fabric.Object) || '');
  const role = String(object.get('diagramConnectorRole' as keyof fabric.Object) || '');
  const typeValues = [fabricType, objectType, teckstudioType, role];

  if (isLegacyConnectorDecorationName(object)) return false;
  if (typeValues.some((value) => CONNECTOR_DECORATION_TYPES.has(value))) return false;
  if (fabricType === 'activeSelection' || TEXT_FABRIC_TYPES.has(fabricType)) return false;
  if (fabricType === 'group') return teckstudioType === 'architectureNode' || teckstudioType === 'diagramBox';
  if (fabricType === 'line' || fabricType === 'path') return teckstudioType === 'architectureNode';

  return CONNECTABLE_FABRIC_TYPES.has(fabricType);
};

export const getConnectableObjects = (canvas: fabric.Canvas) => (
  canvas.getObjects().filter(isConnectableDiagramObject)
);

const findNode = (canvas: fabric.Canvas, nodeId: string) => canvas.getObjects().find((object) => (
  getConnectableObjectId(object) === nodeId
));

const resolveConnectorEndpoint = (
  canvas: fabric.Canvas,
  config: DiagramConnectorConfig,
  side: 'source' | 'target',
) => {
  const nodeId = side === 'source'
    ? config.sourceObjectId || config.sourceNodeId
    : config.targetObjectId || config.targetNodeId;
  const anchor = side === 'source' ? config.sourceAnchor : config.targetAnchor;
  const node = nodeId ? findNode(canvas, nodeId) : null;
  if (node) return getArchitectureAnchorPoint(node, anchor);
  const manualPoint = side === 'source' ? config.manualStartPoint : config.manualEndPoint;
  return cloneRoutePoint(manualPoint) || null;
};

const resolveConnectorEndpoints = (
  canvas: fabric.Canvas,
  config: DiagramConnectorConfig,
) => {
  const source = resolveConnectorEndpoint(canvas, config, 'source');
  const target = resolveConnectorEndpoint(canvas, config, 'target');
  return source && target ? { source, target } : null;
};

export function getArchitectureAnchorPoint(
  object: fabric.Object,
  anchor: ConnectorAnchor = 'right',
) {
  const bounds = object.getBoundingRect(true, true);
  const left = bounds.left;
  const right = bounds.left + bounds.width;
  const top = bounds.top;
  const bottom = bounds.top + bounds.height;
  const centerX = left + bounds.width / 2;
  const centerY = top + bounds.height / 2;
  const points: Record<ConnectorAnchor, RoutePoint> = {
    top: { x: centerX, y: top },
    'top-right': { x: right, y: top },
    right: { x: right, y: centerY },
    'bottom-right': { x: right, y: bottom },
    bottom: { x: centerX, y: bottom },
    'bottom-left': { x: left, y: bottom },
    left: { x: left, y: centerY },
    'top-left': { x: left, y: top },
  };
  return points[anchor];
}

const normalizeConfig = (input: DiagramConnectorConfig): DiagramConnectorConfig => {
  const sourceObjectId = input.sourceObjectId || input.sourceNodeId;
  const targetObjectId = input.targetObjectId || input.targetNodeId;
  const color = input.color || AI_ARCHITECTURE_PALETTE.inactiveConnector;
  return {
  ...input,
  sourceNodeId: sourceObjectId || '',
  targetNodeId: targetObjectId || '',
  sourceObjectId,
  targetObjectId,
  manualConnector: Boolean(input.manualConnector || input.manualStartPoint || input.manualEndPoint),
  manualStartPoint: cloneRoutePoint(input.manualStartPoint),
  manualEndPoint: cloneRoutePoint(input.manualEndPoint),
  connectorId: input.connectorId || createId('diagram-connector'),
  sourceAnchor: input.sourceAnchor || 'right',
  targetAnchor: input.targetAnchor || 'left',
  routing: input.routing || (isConnectorRouting(input.connectorType) ? input.connectorType : undefined) || 'elbow',
  connectorType: input.connectorType || input.routing || 'elbow',
  style: input.style || input.lineStyle || 'solid',
  lineStyle: input.lineStyle || input.style || 'solid',
  color,
  arrowheadColor: input.arrowheadColor || color,
  width: Math.max(1, input.width ?? 2),
  opacity: Math.min(1, Math.max(0.05, input.opacity ?? 0.85)),
  dashLength: Math.max(1, input.dashLength ?? 10),
  dashGap: Math.max(1, input.dashGap ?? 8),
  startArrow: input.startArrow || 'none',
  endArrow: input.endArrow || 'arrow',
  arrowSize: Math.max(6, input.arrowSize ?? 13),
  bendOffset: input.bendOffset || 0,
  curvature: Math.max(0.1, Math.min(1, input.curvature ?? 0.45)),
  label: input.label || '',
  labelColor: input.labelColor || color || AI_ARCHITECTURE_PALETTE.green,
  labelBackground: input.labelBackground || 'rgba(7, 10, 15, 0.88)',
  labelPosition: Math.max(0.05, Math.min(0.95, input.labelPosition ?? 0.5)),
  labelOffset: input.labelOffset ?? -16,
  labelFontSize: Math.max(8, input.labelFontSize ?? 11),
  labelVisible: input.labelVisible !== false,
  glow: Boolean(input.glow),
  glowBlur: Math.max(0, input.glowBlur ?? 8),
  animation: normalizeConnectorAnimation(input.animation, color || AI_ARCHITECTURE_PALETTE.green),
  };
};

const dashArrayForConfig = (config: DiagramConnectorConfig) => {
  if (config.style === 'dashed') return [config.dashLength || 10, config.dashGap || 8];
  if (config.style === 'dotted') return [Math.max(1, (config.width || 2) * 0.8), config.dashGap || 8];
  return undefined;
};

const buildRoute = (
  source: RoutePoint,
  target: RoutePoint,
  config: DiagramConnectorConfig,
) => {
  if (config.routing === 'straight') {
    return {
      path: `M ${source.x} ${source.y} L ${target.x} ${target.y}`,
      points: [source, target],
      tangentStart: Math.atan2(target.y - source.y, target.x - source.x),
      tangentEnd: Math.atan2(target.y - source.y, target.x - source.x),
    };
  }

  if (config.routing === 'horizontal' || config.routing === 'vertical') {
    const bend = config.routing === 'horizontal'
      ? { x: target.x, y: source.y + (config.bendOffset || 0) }
      : { x: source.x + (config.bendOffset || 0), y: target.y };
    return {
      path: `M ${source.x} ${source.y} L ${bend.x} ${bend.y} L ${target.x} ${target.y}`,
      points: [source, bend, target],
      tangentStart: Math.atan2(bend.y - source.y, bend.x - source.x),
      tangentEnd: Math.atan2(target.y - bend.y, target.x - bend.x),
    };
  }

  if (config.routing === 'loop') {
    const horizontalDirection = target.x >= source.x ? 1 : -1;
    const verticalDirection = target.y >= source.y ? 1 : -1;
    const clearance = Math.max(64, Math.abs(config.bendOffset || 0) + 64);
    const exit = { x: source.x + horizontalDirection * clearance, y: source.y };
    const corner = { x: exit.x, y: target.y + verticalDirection * clearance };
    const entry = { x: target.x - horizontalDirection * clearance, y: corner.y };
    return {
      path: `M ${source.x} ${source.y} L ${exit.x} ${exit.y} L ${corner.x} ${corner.y} L ${entry.x} ${entry.y} L ${target.x} ${target.y}`,
      points: [source, exit, corner, entry, target],
      tangentStart: Math.atan2(exit.y - source.y, exit.x - source.x),
      tangentEnd: Math.atan2(target.y - entry.y, target.x - entry.x),
    };
  }

  if (config.routing === 'orthogonal') {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
    const clearance = 28 + Math.abs(config.bendOffset || 0);
    const first = horizontalFirst
      ? { x: source.x + Math.sign(dx || 1) * Math.max(clearance, Math.abs(dx) / 2), y: source.y }
      : { x: source.x, y: source.y + Math.sign(dy || 1) * Math.max(clearance, Math.abs(dy) / 2) };
    const second = horizontalFirst
      ? { x: first.x, y: target.y }
      : { x: target.x, y: first.y };
    return {
      path: `M ${source.x} ${source.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${target.x} ${target.y}`,
      points: [source, first, second, target],
      tangentStart: Math.atan2(first.y - source.y, first.x - source.x),
      tangentEnd: Math.atan2(target.y - second.y, target.x - second.x),
    };
  }

  if (config.routing === 'curved' || config.routing === 'bezier') {
    const direction = Math.abs(target.x - source.x) >= Math.abs(target.y - source.y) ? 'horizontal' : 'vertical';
    const curvature = config.curvature || 0.45;
    const deltaX = target.x - source.x;
    const deltaY = target.y - source.y;
    const control1 = direction === 'horizontal'
      ? { x: source.x + deltaX * curvature, y: source.y + (config.bendOffset || 0) }
      : { x: source.x + (config.bendOffset || 0), y: source.y + deltaY * curvature };
    const control2 = direction === 'horizontal'
      ? { x: target.x - deltaX * curvature, y: target.y + (config.bendOffset || 0) }
      : { x: target.x + (config.bendOffset || 0), y: target.y - deltaY * curvature };
    return {
      path: `M ${source.x} ${source.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${target.x} ${target.y}`,
      points: [source, control1, control2, target],
      bezier: { source, control1, control2, target },
      tangentStart: Math.atan2(control1.y - source.y, control1.x - source.x),
      tangentEnd: Math.atan2(target.y - control2.y, target.x - control2.x),
    };
  }

  const preferHorizontal = ['left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(config.sourceAnchor || 'right');
  const bendOffset = config.bendOffset || 0;
  const middle = preferHorizontal
    ? { x: (source.x + target.x) / 2 + bendOffset, y: source.y }
    : { x: source.x, y: (source.y + target.y) / 2 + bendOffset };
  const second = preferHorizontal
    ? { x: middle.x, y: target.y }
    : { x: target.x, y: middle.y };
  return {
    path: `M ${source.x} ${source.y} L ${middle.x} ${middle.y} L ${second.x} ${second.y} L ${target.x} ${target.y}`,
    points: [source, middle, second, target],
    tangentStart: Math.atan2(middle.y - source.y, middle.x - source.x),
    tangentEnd: Math.atan2(target.y - second.y, target.x - second.x),
  };
};

const shiftRoutePoint = (point: RoutePoint, angle: number, distance: number): RoutePoint => ({
  x: point.x + Math.cos(angle) * distance,
  y: point.y + Math.sin(angle) * distance,
});

const buildConnectorRoute = (
  source: RoutePoint,
  target: RoutePoint,
  config: DiagramConnectorConfig,
) => {
  const initialRoute = buildRoute(source, target, config);
  const startTrim = config.startArrow && config.startArrow !== 'none'
    ? Math.max(4, (config.arrowSize || 13) * 0.58)
    : Math.max(0, (config.width || 2) * 0.5);
  const endTrim = config.endArrow && config.endArrow !== 'none'
    ? Math.max(4, (config.arrowSize || 13) * 0.68)
    : Math.max(0, (config.width || 2) * 0.5);
  const trimmedSource = shiftRoutePoint(source, initialRoute.tangentStart, startTrim);
  const trimmedTarget = shiftRoutePoint(target, initialRoute.tangentEnd + Math.PI, endTrim);

  if (Math.hypot(trimmedTarget.x - trimmedSource.x, trimmedTarget.y - trimmedSource.y) < 8) {
    return initialRoute;
  }
  return buildRoute(trimmedSource, trimmedTarget, config);
};

const cubicPoint = (
  start: RoutePoint,
  control1: RoutePoint,
  control2: RoutePoint,
  end: RoutePoint,
  amount: number,
) => {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * control1.x + 3 * inverse * amount ** 2 * control2.x + amount ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * amount * control1.y + 3 * inverse * amount ** 2 * control2.y + amount ** 3 * end.y,
  };
};

const pointAlongPolyline = (points: RoutePoint[], amount: number) => {
  const segments = points.slice(0, -1).map((point, index) => ({
    start: point,
    end: points[index + 1],
    length: Math.hypot(points[index + 1].x - point.x, points[index + 1].y - point.y),
  }));
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let remaining = total * amount;
  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments[segments.length - 1]) {
      const local = segment.length > 0 ? remaining / segment.length : 0;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * local,
        y: segment.start.y + (segment.end.y - segment.start.y) * local,
      };
    }
    remaining -= segment.length;
  }
  return points[points.length - 1];
};

const pointAndTangentAlongPolyline = (points: RoutePoint[], amount: number) => {
  const segments = points.slice(0, -1).map((point, index) => ({
    start: point,
    end: points[index + 1],
    length: Math.hypot(points[index + 1].x - point.x, points[index + 1].y - point.y),
  }));
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let remaining = total * Math.max(0, Math.min(1, amount));
  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments[segments.length - 1]) {
      const local = segment.length > 0 ? remaining / segment.length : 0;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * local,
        y: segment.start.y + (segment.end.y - segment.start.y) * local,
        angle: Math.atan2(segment.end.y - segment.start.y, segment.end.x - segment.start.x),
      };
    }
    remaining -= segment.length;
  }
  const last = segments[segments.length - 1];
  return {
    x: points[points.length - 1].x,
    y: points[points.length - 1].y,
    angle: last ? Math.atan2(last.end.y - last.start.y, last.end.x - last.start.x) : 0,
  };
};

const cubicTangent = (
  start: RoutePoint,
  control1: RoutePoint,
  control2: RoutePoint,
  end: RoutePoint,
  amount: number,
) => {
  const inverse = 1 - amount;
  const x = 3 * inverse ** 2 * (control1.x - start.x)
    + 6 * inverse * amount * (control2.x - control1.x)
    + 3 * amount ** 2 * (end.x - control2.x);
  const y = 3 * inverse ** 2 * (control1.y - start.y)
    + 6 * inverse * amount * (control2.y - control1.y)
    + 3 * amount ** 2 * (end.y - control2.y);
  return Math.atan2(y, x);
};

export type DiagramConnectorGeometry = {
  length: number;
  pointAt: (amount: number) => { x: number; y: number; angle: number };
};

export function getDiagramConnectorGeometry(
  canvas: fabric.Canvas,
  path: fabric.Object,
): DiagramConnectorGeometry | null {
  if (path.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramConnectorPath') return null;
  const rawConfig = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
  if (!rawConfig) return null;
  const config = normalizeConfig(rawConfig);
  const endpoints = resolveConnectorEndpoints(canvas, config);
  if (!endpoints) return null;
  const { source, target } = endpoints;
  const route = buildConnectorRoute(source, target, config);
  if (route.bezier) {
    const samples = Array.from({ length: 65 }, (_, index) => (
      cubicPoint(
        route.bezier!.source,
        route.bezier!.control1,
        route.bezier!.control2,
        route.bezier!.target,
        index / 64,
      )
    ));
    const length = samples.slice(1).reduce((total, point, index) => (
      total + Math.hypot(point.x - samples[index].x, point.y - samples[index].y)
    ), 0);
    return {
      length,
      pointAt: (amount) => {
        const clamped = Math.max(0, Math.min(1, amount));
        const point = cubicPoint(
          route.bezier!.source,
          route.bezier!.control1,
          route.bezier!.control2,
          route.bezier!.target,
          clamped,
        );
        return {
          ...point,
          angle: cubicTangent(
            route.bezier!.source,
            route.bezier!.control1,
            route.bezier!.control2,
            route.bezier!.target,
            clamped,
          ),
        };
      },
    };
  }
  const length = route.points.slice(1).reduce((total, point, index) => (
    total + Math.hypot(point.x - route.points[index].x, point.y - route.points[index].y)
  ), 0);
  return {
    length,
    pointAt: (amount) => pointAndTangentAlongPolyline(route.points, amount),
  };
}

const createConnectorPath = (
  source: RoutePoint,
  target: RoutePoint,
  config: DiagramConnectorConfig,
) => {
  const route = buildConnectorRoute(source, target, config);
  const path = new fabric.Path(route.path, {
    fill: '',
    stroke: config.color,
    strokeWidth: config.width,
    strokeDashArray: dashArrayForConfig(config),
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    strokeUniform: true,
    opacity: config.opacity,
    selectable: true,
    evented: true,
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    objectCaching: false,
    ...connectorObjectMetadata(String(config.connectorId), 'diagramConnectorPath', config),
  } as fabric.IPathOptions & Record<string, unknown>);
  if (config.glow) {
    path.set('shadow', new fabric.Shadow({
      color: config.color || AI_ARCHITECTURE_PALETTE.green,
      blur: config.glowBlur || 8,
      offsetX: 0,
      offsetY: 0,
    }));
  }
  return path;
};

const createCapObject = (
  connectorId: string,
  role: 'diagramConnectorStart' | 'diagramConnectorEnd',
  style: DiagramArrowStyle,
  config: DiagramConnectorConfig,
) => {
  const size = config.arrowSize || 13;
  const arrowheadColor = config.arrowheadColor || config.color || AI_ARCHITECTURE_PALETTE.green;
  let object: fabric.Object;
  if (style === 'circle') {
    object = new fabric.Circle({
      radius: size * 0.34,
      originX: 'center',
      originY: 'center',
      fill: arrowheadColor,
    });
  } else if (style === 'diamond') {
    object = new fabric.Rect({
      width: size * 0.72,
      height: size * 0.72,
      angle: 45,
      originX: 'center',
      originY: 'center',
      fill: arrowheadColor,
    });
  } else if (style === 'open-arrow') {
    object = new fabric.Path(
      `M ${-size * 0.48} ${size * 0.45} L 0 ${-size * 0.48} L ${size * 0.48} ${size * 0.45}`,
      {
        originX: 'center',
        originY: 'center',
        fill: '',
        stroke: arrowheadColor,
        strokeWidth: Math.max(1.5, (config.width || 2) * 1.2),
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        strokeUniform: true,
      },
    );
  } else {
    object = new fabric.Triangle({
      width: size,
      height: size,
      originX: 'center',
      originY: 'center',
      fill: arrowheadColor,
    });
  }
  object.set({
    selectable: false,
    evented: false,
    opacity: config.opacity,
    ...connectorObjectMetadata(connectorId, role, config),
    diagramArrowStyle: style,
  } as Record<string, unknown>);
  return object;
};

const isNonEmptyPaint = (value: unknown) => (
  typeof value === 'string' && value !== '' && value !== 'transparent'
);

const connectorChildren = (object: fabric.Object) => (
  object.type === 'group' ? (object as fabric.Group).getObjects() : [object]
);

const getConnectorConfig = (object: fabric.Object): DiagramConnectorConfig | null => {
  const config = (
    object.get('diagramConnectorConfig' as keyof fabric.Object)
    || object.get('diagramArrowConfig' as keyof fabric.Object)
  ) as DiagramConnectorConfig | undefined;
  return config || null;
};

export const isDiagramArrowObject = (object?: fabric.Object | null) => {
  if (!object) return false;
  const type = String(object.get('teckstudioObjectType' as keyof fabric.Object) || '');
  const role = String(object.get('diagramConnectorRole' as keyof fabric.Object) || '');
  return (
    type === 'diagramConnectorPath'
    || type === 'diagramArrow'
    || type === 'diagramArrowPath'
    || role === 'diagramConnectorPath'
    || role === 'diagramConnectorStart'
    || role === 'diagramConnectorEnd'
  );
};

export const getDiagramArrowTargets = (object?: fabric.Object | null): fabric.Object[] => {
  if (!object) return [];
  if (object.type === 'activeSelection') {
    return (object as fabric.ActiveSelection).getObjects().filter(isDiagramArrowObject);
  }
  return isDiagramArrowObject(object) ? [object] : [];
};

const syncAnimationColors = (
  previous: DiagramConnectorConfig,
  nextColor: string,
) => {
  const animation = previous.animation;
  if (!animation) return animation;
  const previousColor = previous.color || AI_ARCHITECTURE_PALETTE.green;
  const shouldSync = (value?: string) => (
    !value
    || value.toLowerCase() === previousColor.toLowerCase()
    || value.toLowerCase() === AI_ARCHITECTURE_PALETTE.green.toLowerCase()
  );
  return {
    ...animation,
    flowColor: shouldSync(animation.flowColor) ? nextColor : animation.flowColor,
    baseColor: shouldSync(animation.baseColor) ? nextColor : animation.baseColor,
    glowColor: shouldSync(animation.glowColor) ? nextColor : animation.glowColor,
  };
};

const patchForArrowColor = (
  previous: DiagramConnectorConfig,
  color: string,
): Partial<DiagramConnectorConfig> => ({
  color,
  arrowheadColor: color,
  labelColor: color,
  animation: syncAnimationColors(previous, color),
});

const applyStandaloneArrowConfig = (
  object: fabric.Object,
  patch: Partial<DiagramConnectorConfig>,
  syncWholeArrowColor = false,
) => {
  const rawConfig = getConnectorConfig(object);
  const previous = normalizeConfig({
    ...(rawConfig || {}),
    sourceNodeId: rawConfig?.sourceNodeId || '',
    targetNodeId: rawConfig?.targetNodeId || '',
  });
  const normalizedPatch = syncWholeArrowColor && patch.color
    ? patchForArrowColor(previous, patch.color)
    : patch;
  const config = normalizeConfig({ ...previous, ...normalizedPatch });
  const arrowheadColor = config.arrowheadColor || config.color || AI_ARCHITECTURE_PALETTE.green;
  connectorChildren(object).forEach((child) => {
    const role = String(child.get('diagramConnectorRole' as keyof fabric.Object) || '');
    const type = String(child.get('teckstudioObjectType' as keyof fabric.Object) || '');
    if (role === 'diagramConnectorLabelBackground') return;
    if (role === 'diagramConnectorPath' || type === 'diagramArrowPath') {
      child.set({
        stroke: config.color,
        strokeWidth: config.width,
        strokeDashArray: dashArrayForConfig(config),
        opacity: config.opacity,
        diagramConnectorConfig: config,
      } as Record<string, unknown>);
      return;
    }
    if (role === 'diagramConnectorStart' || role === 'diagramConnectorEnd') {
      if (isNonEmptyPaint(child.get('fill'))) child.set('fill', arrowheadColor as never);
      if (isNonEmptyPaint(child.get('stroke')) || child.get('diagramArrowStyle' as keyof fabric.Object) === 'open-arrow') {
        child.set({
          stroke: arrowheadColor,
          strokeWidth: Math.max(1.5, (config.width || 2) * 1.2),
        } as Record<string, unknown>);
      }
      child.set({
        opacity: config.opacity,
        diagramConnectorConfig: config,
      } as Record<string, unknown>);
      return;
    }
    if (role === 'diagramConnectorLabelText') {
      child.set('fill', config.labelColor as never);
    }
    child.set({ diagramConnectorConfig: config } as Record<string, unknown>);
  });
  object.set({
    opacity: 1,
    diagramArrowConfig: config,
    architectureIconColor: config.color,
    dirty: true,
  } as Record<string, unknown>);
  object.setCoords();
  return true;
};

export const applyDiagramArrowStyle = (
  canvas: fabric.Canvas,
  object: fabric.Object,
  patch: Partial<DiagramConnectorConfig>,
  options: { syncWholeArrowColor?: boolean } = {},
) => {
  let applied = false;
  getDiagramArrowTargets(object).forEach((target) => {
    if (target.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramConnectorPath') {
      const rawConfig = getConnectorConfig(target);
      if (!rawConfig) return;
      const previous = normalizeConfig({
        ...rawConfig,
        sourceNodeId: rawConfig.sourceNodeId || '',
        targetNodeId: rawConfig.targetNodeId || '',
      });
      const normalizedPatch = options.syncWholeArrowColor && patch.color
        ? patchForArrowColor(previous, patch.color)
        : patch;
      const updated = updateDiagramConnectorConfig(canvas, target, normalizedPatch);
      applied = Boolean(updated) || applied;
      return;
    }
    applied = applyStandaloneArrowConfig(target, patch, Boolean(options.syncWholeArrowColor)) || applied;
  });
  if (applied) canvas.requestRenderAll();
  return applied;
};

export const getDiagramArrowAppearance = (object?: fabric.Object | null) => {
  const target = getDiagramArrowTargets(object)[0];
  if (!target) return null;
  const rawConfig = getConnectorConfig(target);
  const config = normalizeConfig({
    ...(rawConfig || {}),
    sourceNodeId: rawConfig?.sourceNodeId || '',
    targetNodeId: rawConfig?.targetNodeId || '',
  });
  return {
    arrowColor: config.color || AI_ARCHITECTURE_PALETTE.green,
    strokeColor: config.color || AI_ARCHITECTURE_PALETTE.green,
    arrowheadColor: config.arrowheadColor || config.color || AI_ARCHITECTURE_PALETTE.green,
    strokeWidth: config.width || 2,
    opacity: config.opacity ?? target.opacity ?? 1,
  };
};

const createConnectorLabel = (
  connectorId: string,
  config: DiagramConnectorConfig,
) => {
  const labelText = new fabric.IText((config.label || 'FLOW').toUpperCase(), {
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    fontFamily: 'IBM Plex Mono, Space Mono, Menlo, monospace',
    fontSize: config.labelFontSize,
    fontWeight: 700,
    charSpacing: 55,
    fill: config.labelColor,
    fontReferences: [
      {
        id: 'ibm-plex-mono-700',
        family: 'IBM Plex Mono',
        source: 'built-in',
        weight: 700,
        style: 'normal',
      },
    ],
    selectable: false,
    evented: false,
    diagramConnectorId: connectorId,
    diagramConnectorRole: 'diagramConnectorLabelText',
  } as fabric.ITextOptions & Record<string, unknown>);
  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width: Math.ceil((labelText.width || 40) + 18),
    height: Math.ceil((labelText.height || 12) + 10),
    originX: 'center',
    originY: 'center',
    fill: config.labelBackground,
    stroke: config.labelColor,
    strokeWidth: 0.7,
    opacity: 0.95,
    rx: 4,
    ry: 4,
    selectable: false,
    evented: false,
    diagramConnectorId: connectorId,
    diagramConnectorRole: 'diagramConnectorLabelBackground',
  } as fabric.IRectOptions & Record<string, unknown>);
  return new fabric.Group([background, labelText], {
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    objectCaching: false,
    visible: Boolean(config.label && config.labelVisible),
    subTargetCheck: true,
    ...connectorObjectMetadata(connectorId, 'diagramConnectorLabel', config),
  } as fabric.IGroupOptions & Record<string, unknown>);
};

const positionConnectorDecorations = (
  canvas: fabric.Canvas,
  connectorId: string,
  source: RoutePoint,
  target: RoutePoint,
  config: DiagramConnectorConfig,
) => {
  const route = buildConnectorRoute(source, target, config);
  const objects = canvas.getObjects().filter((object) => (
    object.get('diagramConnectorId' as keyof fabric.Object) === connectorId
  ));
  const start = objects.find((object) => object.get('diagramConnectorRole' as keyof fabric.Object) === 'diagramConnectorStart');
  const end = objects.find((object) => object.get('diagramConnectorRole' as keyof fabric.Object) === 'diagramConnectorEnd');
  const label = objects.find((object) => object.get('diagramConnectorRole' as keyof fabric.Object) === 'diagramConnectorLabel');
  if (start) {
    const startStyle = start.get('diagramArrowStyle' as keyof fabric.Object);
    start.set({
      left: source.x,
      top: source.y,
      angle: route.tangentStart * 180 / Math.PI - 90,
      fill: startStyle === 'open-arrow' ? '' : config.color,
      stroke: startStyle === 'open-arrow' ? config.color : start.stroke,
      opacity: config.opacity,
    });
    start.setCoords();
  }
  if (end) {
    const endStyle = end.get('diagramArrowStyle' as keyof fabric.Object);
    end.set({
      left: target.x,
      top: target.y,
      angle: route.tangentEnd * 180 / Math.PI + 90,
      fill: endStyle === 'open-arrow' ? '' : config.color,
      stroke: endStyle === 'open-arrow' ? config.color : end.stroke,
      opacity: config.opacity,
    });
    end.setCoords();
  }
  if (label) {
    const position = config.labelPosition || 0.5;
    const point = route.bezier
      ? cubicPoint(route.bezier.source, route.bezier.control1, route.bezier.control2, route.bezier.target, position)
      : pointAlongPolyline(route.points, position);
    const tangent = Math.atan2(target.y - source.y, target.x - source.x);
    const offset = config.labelOffset || 0;
    label.set({
      left: point.x - Math.sin(tangent) * offset,
      top: point.y + Math.cos(tangent) * offset,
      visible: Boolean(config.label && config.labelVisible),
    });
    label.setCoords();
  }
};

export function createStandaloneDiagramArrow(
  input: Partial<DiagramConnectorConfig> & { name?: string; angle?: number } = {},
) {
  const config = normalizeConfig({
    sourceNodeId: '',
    targetNodeId: '',
    routing: 'straight',
    color: AI_ARCHITECTURE_PALETTE.green,
    width: 3,
    endArrow: 'arrow',
    ...input,
  });
  const source = { x: 12, y: 62 };
  const target = { x: 228, y: 62 };
  const route = buildConnectorRoute(source, target, config);
  const connectorId = String(config.connectorId);
  const path = new fabric.Path(route.path, {
    fill: '',
    stroke: config.color,
    strokeWidth: config.width,
    strokeDashArray: dashArrayForConfig(config),
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    strokeUniform: true,
    opacity: config.opacity,
    selectable: false,
    evented: false,
    objectCaching: false,
    objectType: 'diagramArrowPath',
    teckstudioObjectType: 'diagramArrowPath',
  } as fabric.IPathOptions & Record<string, unknown>);
  const objects: fabric.Object[] = [path];
  if (config.startArrow && config.startArrow !== 'none') {
    const start = createCapObject(connectorId, 'diagramConnectorStart', config.startArrow, config);
    start.set({
      left: source.x,
      top: source.y,
      angle: route.tangentStart * 180 / Math.PI - 90,
    });
    objects.push(start);
  }
  if (config.endArrow && config.endArrow !== 'none') {
    const end = createCapObject(connectorId, 'diagramConnectorEnd', config.endArrow, config);
    end.set({
      left: target.x,
      top: target.y,
      angle: route.tangentEnd * 180 / Math.PI + 90,
    });
    objects.push(end);
  }
  if (config.label) {
    const label = createConnectorLabel(connectorId, config);
    const point = route.bezier
      ? cubicPoint(route.bezier.source, route.bezier.control1, route.bezier.control2, route.bezier.target, config.labelPosition || 0.5)
      : pointAlongPolyline(route.points, config.labelPosition || 0.5);
    label.set({ left: point.x, top: point.y + (config.labelOffset || -16) });
    objects.push(label);
  }
  const arrowId = createId('diagram-arrow');
  return new fabric.Group(objects, {
    left: 120,
    top: 180,
    angle: input.angle || 0,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    subTargetCheck: true,
    id: arrowId,
    name: input.name || (config.animation?.enabled ? 'Animated flow connector' : 'Diagram arrow'),
    objectType: 'diagramArrow',
    teckstudioObjectType: 'diagramArrow',
    diagramArrowConfig: config,
    architectureIconColor: config.color,
    elementCategory: 'Technology',
    elementSubcategory: 'Arrows and Connectors',
    elementTags: [
      'arrow',
      'connector',
      'diagram',
      config.routing,
      config.style,
      ...(config.animation?.enabled ? ['animated', 'flow'] : []),
    ],
    elementEditable: true,
  } as fabric.IGroupOptions & Record<string, unknown>);
}

export function createDiagramConnector(
  canvas: fabric.Canvas,
  input: DiagramConnectorConfig,
) {
  const config = normalizeConfig(input);
  const endpoints = resolveConnectorEndpoints(canvas, config);
  if (!endpoints) return [];
  const { source, target } = endpoints;
  const connectorId = String(config.connectorId);
  const objects: fabric.Object[] = [createConnectorPath(source, target, config)];
  if (config.startArrow && config.startArrow !== 'none') {
    objects.push(createCapObject(connectorId, 'diagramConnectorStart', config.startArrow, config));
  }
  if (config.endArrow && config.endArrow !== 'none') {
    objects.push(createCapObject(connectorId, 'diagramConnectorEnd', config.endArrow, config));
  }
  objects.push(createConnectorLabel(connectorId, config));
  canvas.add(...objects);
  positionConnectorDecorations(canvas, connectorId, source, target, config);
  objects.forEach((object) => object.set({
    diagramConnectorConfig: config,
  } as Record<string, unknown>));
  normalizeDiagramLayerStack(canvas);
  canvas.requestRenderAll();
  return objects;
}

export function createManualDiagramConnector(
  canvas: fabric.Canvas,
  input: Partial<DiagramConnectorConfig> & {
    manualStartPoint: RoutePoint;
    manualEndPoint: RoutePoint;
  },
) {
  return createDiagramConnector(canvas, {
    sourceNodeId: input.sourceObjectId || input.sourceNodeId || '',
    targetNodeId: input.targetObjectId || input.targetNodeId || '',
    sourceObjectId: input.sourceObjectId || input.sourceNodeId,
    targetObjectId: input.targetObjectId || input.targetNodeId,
    manualConnector: true,
    manualStartPoint: cloneRoutePoint(input.manualStartPoint),
    manualEndPoint: cloneRoutePoint(input.manualEndPoint),
    connectorType: input.connectorType,
    lineStyle: input.lineStyle,
    sourceAnchor: input.sourceAnchor,
    targetAnchor: input.targetAnchor,
    routing: input.routing,
    style: input.style,
    color: input.color,
    width: input.width,
    opacity: input.opacity,
    dashLength: input.dashLength,
    dashGap: input.dashGap,
    startArrow: input.startArrow,
    endArrow: input.endArrow,
    arrowSize: input.arrowSize,
    bendOffset: input.bendOffset,
    curvature: input.curvature,
    label: input.label,
    labelColor: input.labelColor,
    labelBackground: input.labelBackground,
    labelPosition: input.labelPosition,
    labelOffset: input.labelOffset,
    labelFontSize: input.labelFontSize,
    labelVisible: input.labelVisible,
    glow: input.glow,
    glowBlur: input.glowBlur,
    animation: input.animation,
  });
}

export function getDiagramConnectorPaths(canvas: fabric.Canvas) {
  return canvas.getObjects().filter((object) => (
    object.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramConnectorPath'
  )) as DiagramPath[];
}

export function updateDiagramConnector(
  canvas: fabric.Canvas,
  path: fabric.Object,
) {
  if (path.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramConnectorPath') return false;
  const rawConfig = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
  if (!rawConfig) return false;
  const config = normalizeConfig(rawConfig);
  const endpoints = resolveConnectorEndpoints(canvas, config);
  if (!endpoints) return false;
  const { source, target } = endpoints;
  const route = buildConnectorRoute(source, target, config);
  const diagramPath = path as DiagramPath;
  if (diagramPath._setPath) {
    diagramPath._setPath(route.path);
  } else {
    diagramPath.set('path', route.path as unknown as fabric.Point[]);
  }
  diagramPath.set({
    scaleX: 1,
    scaleY: 1,
    stroke: config.color,
    strokeWidth: config.width,
    strokeDashArray: dashArrayForConfig(config),
    opacity: config.opacity,
    objectId: config.connectorId,
    sourceObjectId: config.sourceObjectId || config.sourceNodeId,
    targetObjectId: config.targetObjectId || config.targetNodeId,
    sourceAnchor: config.sourceAnchor,
    targetAnchor: config.targetAnchor,
    manualConnector: config.manualConnector,
    manualStartPoint: config.manualStartPoint,
    manualEndPoint: config.manualEndPoint,
    connectorType: config.connectorType || config.routing,
    lineStyle: config.lineStyle || config.style,
    connectorSourceNodeId: config.sourceObjectId || config.sourceNodeId,
    connectorTargetNodeId: config.targetObjectId || config.targetNodeId,
    connectorSourceObjectId: config.sourceObjectId || config.sourceNodeId,
    connectorTargetObjectId: config.targetObjectId || config.targetNodeId,
    connectorSourceAnchor: config.sourceAnchor,
    connectorTargetAnchor: config.targetAnchor,
    connectorRouting: config.routing,
    connectorLineStyle: config.style,
    diagramConnectorConfig: config,
    connectorBendOffset: config.bendOffset,
    connectorCurvature: config.curvature,
    dirty: true,
  } as Record<string, unknown>);
  if (config.glow) {
    diagramPath.set('shadow', new fabric.Shadow({
      color: config.color || AI_ARCHITECTURE_PALETTE.green,
      blur: config.glowBlur || 8,
      offsetX: 0,
      offsetY: 0,
    }));
  } else {
    diagramPath.set('shadow', undefined);
  }
  diagramPath.setCoords();
  positionConnectorDecorations(canvas, String(config.connectorId), source, target, config);
  return true;
}

export function updateAttachedConnectors(
  canvas: fabric.Canvas,
  node: fabric.Object,
) {
  const nodeId = getConnectableObjectId(node);
  if (!nodeId) return 0;
  let updated = 0;
  getDiagramConnectorPaths(canvas).forEach((path) => {
    const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
    if (config && (config.sourceNodeId === nodeId || config.targetNodeId === nodeId || config.sourceObjectId === nodeId || config.targetObjectId === nodeId)) {
      if (updateDiagramConnector(canvas, path)) updated += 1;
    }
  });
  if (updated > 0) canvas.requestRenderAll();
  return updated;
}

export function updateAllDiagramConnectors(canvas: fabric.Canvas) {
  let updated = 0;
  getDiagramConnectorPaths(canvas).forEach((path) => {
    if (updateDiagramConnector(canvas, path)) updated += 1;
  });
  if (updated > 0) canvas.requestRenderAll();
  return updated;
}

export function removeDiagramConnector(canvas: fabric.Canvas, connectorId: unknown) {
  const id = String(connectorId || '');
  if (!id) return 0;
  const related = canvas.getObjects().filter((object) => (
    object.get('diagramConnectorId' as keyof fabric.Object) === id
  ));
  related.forEach((object) => canvas.remove(object));
  if (related.length > 0) canvas.requestRenderAll();
  return related.length;
}

export function updateDiagramConnectorConfig(
  canvas: fabric.Canvas,
  path: fabric.Object,
  patch: Partial<DiagramConnectorConfig>,
) {
  if (path.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramConnectorPath') return null;
  const previous = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig;
  const config = normalizeConfig({ ...previous, ...patch });
  const connectorId = String(config.connectorId);
  const pathIndex = canvas.getObjects().indexOf(path);
  const related = canvas.getObjects().filter((object) => (
    object !== path &&
    object.get('diagramConnectorId' as keyof fabric.Object) === connectorId
  ));
  related.forEach((object) => canvas.remove(object));
  path.set({
    diagramConnectorConfig: config,
    connectorSourceAnchor: config.sourceAnchor,
    connectorTargetAnchor: config.targetAnchor,
    connectorRouting: config.routing,
    connectorLineStyle: config.style,
    connectorBendOffset: config.bendOffset,
    connectorCurvature: config.curvature,
  } as Record<string, unknown>);

  const additions: fabric.Object[] = [];
  if (config.startArrow && config.startArrow !== 'none') {
    additions.push(createCapObject(connectorId, 'diagramConnectorStart', config.startArrow, config));
  }
  if (config.endArrow && config.endArrow !== 'none') {
    additions.push(createCapObject(connectorId, 'diagramConnectorEnd', config.endArrow, config));
  }
  additions.push(createConnectorLabel(connectorId, config));
  additions.forEach((object, index) => canvas.insertAt(object, pathIndex + index + 1, false));
  updateDiagramConnector(canvas, path);
  normalizeDiagramLayerStack(canvas);
  canvas.setActiveObject(path);
  canvas.requestRenderAll();
  return path;
}

export function removeConnectorsForNode(
  canvas: fabric.Canvas,
  nodeId: string,
) {
  const connectorIds = new Set<string>();
  getDiagramConnectorPaths(canvas).forEach((path) => {
    const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
    if (config && (config.sourceNodeId === nodeId || config.targetNodeId === nodeId || config.sourceObjectId === nodeId || config.targetObjectId === nodeId)) {
      connectorIds.add(String(config.connectorId));
    }
  });
  const related = canvas.getObjects().filter((object) => (
    connectorIds.has(String(object.get('diagramConnectorId' as keyof fabric.Object)))
  ));
  related.forEach((object) => canvas.remove(object));
  return related.length;
}

export function removeDiagramBendHandles(canvas: fabric.Canvas) {
  const handles = canvas.getObjects().filter((object) => (
    object.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramBendHandle'
  ));
  handles.forEach((handle) => canvas.remove(handle));
  if (handles.length > 0) canvas.requestRenderAll();
  return handles.length;
}

export function showDiagramBendHandle(
  canvas: fabric.Canvas,
  path: fabric.Object,
) {
  removeDiagramBendHandles(canvas);
  if (path.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramConnectorPath') return null;
  const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
  if (!config || config.routing === 'straight') return null;
  const normalized = normalizeConfig(config);
  const endpoints = resolveConnectorEndpoints(canvas, normalized);
  if (!endpoints) return null;
  const { source, target } = endpoints;
  const route = buildConnectorRoute(source, target, normalized);
  const point = route.bezier
    ? cubicPoint(route.bezier.source, route.bezier.control1, route.bezier.control2, route.bezier.target, 0.5)
    : route.points.length === 4
      ? {
          x: (route.points[1].x + route.points[2].x) / 2,
          y: (route.points[1].y + route.points[2].y) / 2,
        }
      : route.points[1];
  if (!point) return null;
  const zoom = Math.max(0.1, canvas.getZoom() || 1);
  const handle = new fabric.Circle({
    left: point.x,
    top: point.y,
    radius: 8 / zoom,
    originX: 'center',
    originY: 'center',
    fill: AI_ARCHITECTURE_PALETTE.background,
    stroke: AI_ARCHITECTURE_PALETTE.purple,
    strokeWidth: 2 / zoom,
    strokeUniform: true,
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: false,
    hoverCursor: 'move',
    excludeFromExport: true,
    excludeFromSave: true,
    editorOnly: true,
    isEditorHelper: true,
    isConnectorHandle: true,
    objectType: 'diagramBendHandle',
    teckstudioObjectType: 'diagramBendHandle',
    diagramBendHandleConnectorId: String(config.connectorId),
    name: 'Connector bend handle',
  } as fabric.ICircleOptions & Record<string, unknown>);
  canvas.add(handle);
  handle.bringToFront();
  canvas.requestRenderAll();
  return handle;
}

export function updateConnectorBendFromHandle(
  canvas: fabric.Canvas,
  handle: fabric.Object,
) {
  if (handle.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramBendHandle') return null;
  const connectorId = handle.get('diagramBendHandleConnectorId' as keyof fabric.Object);
  const path = getDiagramConnectorPaths(canvas).find((item) => (
    item.get('diagramConnectorId' as keyof fabric.Object) === connectorId
  ));
  if (!path) return null;
  const previous = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
  if (!previous) return null;
  const config = normalizeConfig(previous);
  const endpoints = resolveConnectorEndpoints(canvas, config);
  if (!endpoints) return null;
  const { source, target } = endpoints;
  const handleX = Number(handle.left || 0);
  const handleY = Number(handle.top || 0);
  let bendOffset: number;

  if (config.routing === 'horizontal') {
    bendOffset = handleY - source.y;
  } else if (config.routing === 'vertical') {
    bendOffset = handleX - source.x;
  } else if (config.routing === 'curved' || config.routing === 'bezier') {
    const horizontal = Math.abs(target.x - source.x) >= Math.abs(target.y - source.y);
    bendOffset = horizontal
      ? (handleY - (source.y + target.y) / 2) / 0.75
      : (handleX - (source.x + target.x) / 2) / 0.75;
  } else {
    const preferHorizontal = ['left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(config.sourceAnchor || 'right');
    bendOffset = preferHorizontal
      ? handleX - (source.x + target.x) / 2
      : handleY - (source.y + target.y) / 2;
  }

  const next = normalizeConfig({ ...config, bendOffset });
  path.set({
    diagramConnectorConfig: next,
    connectorBendOffset: bendOffset,
  } as Record<string, unknown>);
  updateDiagramConnector(canvas, path);
  canvas.requestRenderAll();
  return path;
}

export const PRIMARY_CONNECTOR_ANCHORS: ConnectorAnchor[] = [
  'top',
  'right',
  'bottom',
  'left',
];

export type DiagramAnchorSelection = {
  nodeId: string;
  anchor: ConnectorAnchor;
};

export function getDiagramAnchorSelection(
  object?: fabric.Object | null,
): DiagramAnchorSelection | null {
  if (object?.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramAnchor') return null;
  const nodeId = object.get('diagramAnchorNodeId' as keyof fabric.Object);
  const anchor = object.get('diagramAnchorPosition' as keyof fabric.Object);
  if (!nodeId || !PRIMARY_CONNECTOR_ANCHORS.includes(anchor as ConnectorAnchor)) return null;
  return { nodeId: String(nodeId), anchor: anchor as ConnectorAnchor };
}

export function removeDiagramAnchors(canvas: fabric.Canvas) {
  const anchors = canvas.getObjects().filter((object) => (
    object.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramAnchor'
  ));
  anchors.forEach((anchor) => canvas.remove(anchor));
  if (anchors.length > 0) canvas.requestRenderAll();
  return anchors.length;
}

export function showDiagramAnchors(
  canvas: fabric.Canvas,
  nodes: fabric.Object[],
  selected?: DiagramAnchorSelection | null,
) {
  removeDiagramAnchors(canvas);
  const zoom = Math.max(0.1, canvas.getZoom() || 1);
  const radius = 7 / zoom;
  const strokeWidth = 2 / zoom;
  const anchors: fabric.Circle[] = [];
  nodes.filter(isConnectableDiagramObject).forEach((node) => {
    const nodeId = ensureConnectableObjectId(node);
    const nodeConfig = node.get('architectureNodeConfig' as keyof fabric.Object) as { accentColor?: string } | undefined;
    PRIMARY_CONNECTOR_ANCHORS.forEach((anchorPosition) => {
      const point = getArchitectureAnchorPoint(node, anchorPosition);
      const isSelected = selected?.nodeId === String(nodeId) && selected.anchor === anchorPosition;
      const anchor = new fabric.Circle({
        left: point.x,
        top: point.y,
        radius,
        originX: 'center',
        originY: 'center',
        fill: isSelected ? AI_ARCHITECTURE_PALETTE.yellow : AI_ARCHITECTURE_PALETTE.background,
        stroke: isSelected
          ? AI_ARCHITECTURE_PALETTE.yellow
          : nodeConfig?.accentColor || AI_ARCHITECTURE_PALETTE.green,
        strokeWidth,
        strokeUniform: true,
        selectable: false,
        evented: true,
        hoverCursor: 'crosshair',
        excludeFromExport: true,
        excludeFromSave: true,
        editorOnly: true,
        isEditorHelper: true,
        isConnectorHandle: true,
        objectType: 'diagramAnchor',
        teckstudioObjectType: 'diagramAnchor',
        diagramAnchorNodeId: String(nodeId),
        diagramAnchorPosition: anchorPosition,
        name: `${anchorPosition} connector anchor`,
      } as fabric.ICircleOptions & Record<string, unknown>);
      anchors.push(anchor);
      canvas.add(anchor);
      anchor.bringToFront();
    });
  });
  canvas.requestRenderAll();
  return anchors;
}
