export const AI_ARCHITECTURE_TEMPLATE_NAME = 'AI Chat System Architecture';
export const DISTRIBUTED_SYSTEM_TEMPLATE_NAME = 'Distributed System Architecture';

export const AI_ARCHITECTURE_PALETTE = {
  background: '#070A0F',
  cardBackground: '#11151D',
  cardOverlay: '#151A22',
  primaryText: '#F1F3F5',
  secondaryText: '#858C98',
  grid: '#15202A',
  green: '#43D68A',
  yellow: '#F2C94C',
  blue: '#55A6FF',
  purple: '#CF8CFF',
  orange: '#FF795B',
  red: '#FF665E',
  inactiveConnector: '#29343C',
  mutedBorder: '#303943',
} as const;

export type ArchitectureIconName =
  | 'member'
  | 'globe'
  | 'gateway'
  | 'database'
  | 'chat'
  | 'router'
  | 'event'
  | 'chip'
  | 'workers'
  | 'server'
  | 'cloud'
  | 'auth'
  | 'stream'
  | 'queue'
  | 'analytics'
  | 'browser'
  | 'mobile'
  | 'desktop'
  | 'loadBalancer'
  | 'reverseProxy'
  | 'cache'
  | 'storage'
  | 'payment'
  | 'email'
  | 'monitoring'
  | 'logging'
  | 'metrics'
  | 'registry'
  | 'identity';

export type ArchitectureChipConfig = {
  id?: string;
  text: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
};

export type ArchitectureCardConfig = {
  nodeId?: string;
  title?: string;
  subtitle?: string;
  icon?: ArchitectureIconName;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  accentWidth?: number;
  accentVisible?: boolean;
  borderWidth?: number;
  opacity?: number;
  cornerRadius?: number;
  paddingX?: number;
  paddingY?: number;
  iconGap?: number;
  textGap?: number;
  iconSize?: number;
  titleFontSize?: number;
  subtitleFontSize?: number;
  statusColor?: string;
  statusVisible?: boolean;
  chips?: ArchitectureChipConfig[];
  autoSize?: boolean;
  manualWidth?: number;
  glow?: boolean;
  glowBlur?: number;
};

export type ConnectorAnchor =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left';

export type DiagramConnectorStyle = 'solid' | 'dashed' | 'dotted';
export type DiagramConnectorRouting =
  | 'straight'
  | 'horizontal'
  | 'vertical'
  | 'elbow'
  | 'orthogonal'
  | 'curved'
  | 'bezier'
  | 'loop';
export type DiagramConnectorType =
  | DiagramConnectorRouting
  | 'arrow'
  | 'double-arrow'
  | 'dashed'
  | 'dotted'
  | 'dashed-arrow';
export type DiagramArrowStyle = 'none' | 'arrow' | 'open-arrow' | 'circle' | 'diamond';
export type DiagramConnectorAnimationType =
  | 'moving-dashes'
  | 'moving-dots'
  | 'travelling-pulse'
  | 'travelling-arrowhead'
  | 'flow-trail'
  | 'draw-in';
export type DiagramConnectorAnimationDirection =
  | 'forward'
  | 'reverse'
  | 'bidirectional'
  | 'alternating'
  | 'forward-once'
  | 'reverse-once';
export type DiagramConnectorAnimationPresetId =
  | 'request-flow'
  | 'response-flow'
  | 'stream-flow'
  | 'inference-flow'
  | 'event-flow'
  | 'async-flow';

export type DiagramConnectorAnimationConfig = {
  enabled?: boolean;
  type?: DiagramConnectorAnimationType;
  direction?: DiagramConnectorAnimationDirection;
  speed?: number;
  duration?: number;
  delay?: number;
  loop?: boolean;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'ease-out-back';
  repeatDelay?: number;
  flowColor?: string;
  baseColor?: string;
  opacity?: number;
  particleSize?: number;
  particleCount?: number;
  dotSpacing?: number;
  dashLength?: number;
  dashGap?: number;
  pulseSize?: number;
  trailLength?: number;
  glowEnabled?: boolean;
  glowColor?: string;
  glowStrength?: number;
  sourcePulse?: boolean;
  targetPulse?: boolean;
  pulseScale?: number;
  pulseDuration?: number;
  arrowheadStyle?: DiagramArrowStyle;
  arrowheadSize?: number;
  startDelay?: number;
  sequenceOrder?: number;
  labelPulse?: boolean;
};

export type DiagramConnectorConfig = {
  connectorId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceObjectId?: string;
  targetObjectId?: string;
  manualConnector?: boolean;
  manualStartPoint?: { x: number; y: number };
  manualEndPoint?: { x: number; y: number };
  connectorType?: DiagramConnectorType;
  lineStyle?: DiagramConnectorStyle;
  sourceAnchor?: ConnectorAnchor;
  targetAnchor?: ConnectorAnchor;
  routing?: DiagramConnectorRouting;
  style?: DiagramConnectorStyle;
  color?: string;
  arrowheadColor?: string;
  width?: number;
  opacity?: number;
  dashLength?: number;
  dashGap?: number;
  startArrow?: DiagramArrowStyle;
  endArrow?: DiagramArrowStyle;
  arrowSize?: number;
  bendOffset?: number;
  curvature?: number;
  label?: string;
  labelColor?: string;
  labelBackground?: string;
  labelPosition?: number;
  labelOffset?: number;
  labelFontSize?: number;
  labelVisible?: boolean;
  glow?: boolean;
  glowBlur?: number;
  animation?: DiagramConnectorAnimationConfig;
};

export const DEFAULT_CONNECTOR_ANIMATION: Required<DiagramConnectorAnimationConfig> = {
  enabled: false,
  type: 'moving-dashes',
  direction: 'forward',
  speed: 1,
  duration: 1800,
  delay: 0,
  loop: true,
  repeatDelay: 250,
  easing: 'linear',
  flowColor: AI_ARCHITECTURE_PALETTE.green,
  baseColor: AI_ARCHITECTURE_PALETTE.inactiveConnector,
  opacity: 1,
  particleSize: 5,
  particleCount: 4,
  dotSpacing: 26,
  dashLength: 8,
  dashGap: 10,
  pulseSize: 7,
  trailLength: 0.2,
  glowEnabled: true,
  glowColor: AI_ARCHITECTURE_PALETTE.green,
  glowStrength: 10,
  sourcePulse: false,
  targetPulse: true,
  pulseScale: 1.8,
  pulseDuration: 650,
  arrowheadStyle: 'arrow',
  arrowheadSize: 12,
  startDelay: 0,
  sequenceOrder: 0,
  labelPulse: false,
};

export function normalizeConnectorAnimation(
  input?: DiagramConnectorAnimationConfig,
  connectorColor: string = AI_ARCHITECTURE_PALETTE.green,
): Required<DiagramConnectorAnimationConfig> {
  const value = input || {};
  return {
    ...DEFAULT_CONNECTOR_ANIMATION,
    ...value,
    enabled: value.enabled === true,
    speed: Math.max(0.1, Math.min(8, Number(value.speed ?? 1))),
    duration: Math.max(200, Number(value.duration ?? 1800)),
    delay: Math.max(0, Number(value.delay ?? 0)),
    repeatDelay: Math.max(0, Number(value.repeatDelay ?? 250)),
    easing: value.easing || 'linear',
    flowColor: value.flowColor || connectorColor,
    baseColor: value.baseColor || connectorColor,
    opacity: Math.max(0.05, Math.min(1, Number(value.opacity ?? 1))),
    particleSize: Math.max(1, Math.min(30, Number(value.particleSize ?? 5))),
    particleCount: Math.max(1, Math.min(24, Math.round(Number(value.particleCount ?? 4)))),
    dotSpacing: Math.max(4, Number(value.dotSpacing ?? 26)),
    dashLength: Math.max(1, Number(value.dashLength ?? 8)),
    dashGap: Math.max(1, Number(value.dashGap ?? 10)),
    pulseSize: Math.max(1, Math.min(40, Number(value.pulseSize ?? 7))),
    trailLength: Math.max(0.03, Math.min(0.75, Number(value.trailLength ?? 0.2))),
    glowColor: value.glowColor || value.flowColor || connectorColor,
    glowStrength: Math.max(0, Math.min(40, Number(value.glowStrength ?? 10))),
    pulseScale: Math.max(1, Math.min(4, Number(value.pulseScale ?? 1.8))),
    pulseDuration: Math.max(150, Number(value.pulseDuration ?? 650)),
    arrowheadSize: Math.max(4, Math.min(40, Number(value.arrowheadSize ?? 12))),
    startDelay: Math.max(0, Number(value.startDelay ?? 0)),
    sequenceOrder: Math.max(0, Math.round(Number(value.sequenceOrder ?? 0))),
  };
}

export const CONNECTOR_ANIMATION_PRESETS: Array<{
  id: DiagramConnectorAnimationPresetId;
  name: string;
  description: string;
  connector: Partial<DiagramConnectorConfig>;
}> = [
  {
    id: 'request-flow',
    name: 'Request Flow',
    description: 'Green data packets travel from source to target.',
    connector: {
      style: 'dotted',
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow',
      label: 'REQUEST',
      animation: {
        enabled: true,
        type: 'moving-dots',
        direction: 'forward',
        speed: 1.15,
        particleCount: 4,
        flowColor: AI_ARCHITECTURE_PALETTE.green,
        glowEnabled: true,
        targetPulse: true,
      },
    },
  },
  {
    id: 'response-flow',
    name: 'Response Flow',
    description: 'A glowing response pulse returns through the connector.',
    connector: {
      style: 'solid',
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow',
      label: 'RESPONSE',
      animation: {
        enabled: true,
        type: 'travelling-pulse',
        direction: 'forward',
        speed: 1,
        flowColor: AI_ARCHITECTURE_PALETTE.green,
        glowEnabled: true,
        targetPulse: true,
      },
    },
  },
  {
    id: 'stream-flow',
    name: 'Stream Flow',
    description: 'Fast continuous green streaming dots.',
    connector: {
      style: 'dotted',
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow',
      label: 'STREAM',
      animation: {
        enabled: true,
        type: 'moving-dots',
        direction: 'forward',
        speed: 1.8,
        particleCount: 7,
        flowColor: AI_ARCHITECTURE_PALETTE.green,
        glowEnabled: true,
      },
    },
  },
  {
    id: 'inference-flow',
    name: 'Inference Flow',
    description: 'A blue arrowhead travels toward inference.',
    connector: {
      style: 'dotted',
      color: AI_ARCHITECTURE_PALETTE.blue,
      endArrow: 'arrow',
      label: 'INFERENCE',
      animation: {
        enabled: true,
        type: 'travelling-arrowhead',
        direction: 'forward',
        speed: 1,
        flowColor: AI_ARCHITECTURE_PALETTE.blue,
        glowEnabled: true,
      },
    },
  },
  {
    id: 'event-flow',
    name: 'Event Flow',
    description: 'Orange marching dashes show event delivery.',
    connector: {
      style: 'dashed',
      color: AI_ARCHITECTURE_PALETTE.orange,
      endArrow: 'arrow',
      label: 'EVENT',
      animation: {
        enabled: true,
        type: 'moving-dashes',
        direction: 'forward',
        speed: 1,
        flowColor: AI_ARCHITECTURE_PALETTE.orange,
        glowEnabled: false,
      },
    },
  },
  {
    id: 'async-flow',
    name: 'Async Flow',
    description: 'Delayed slow dots represent background work.',
    connector: {
      style: 'dotted',
      color: AI_ARCHITECTURE_PALETTE.green,
      endArrow: 'arrow',
      label: 'ASYNC',
      animation: {
        enabled: true,
        type: 'moving-dots',
        direction: 'forward',
        speed: 0.55,
        delay: 500,
        particleCount: 3,
        flowColor: AI_ARCHITECTURE_PALETTE.green,
        glowEnabled: true,
      },
    },
  },
];

export function getConnectorAnimationPreset(id: DiagramConnectorAnimationPresetId) {
  return CONNECTOR_ANIMATION_PRESETS.find((preset) => preset.id === id);
}

export type StageTrackerConfig = {
  labels?: string[];
  colors?: string[];
  left?: number;
  top?: number;
  width?: number;
  orientation?: 'horizontal' | 'vertical';
  circleSize?: number;
  lineWidth?: number;
  labelGap?: number;
  glow?: boolean;
  arrows?: boolean;
};

export type TechnicalGridConfig = {
  horizontalSpacing?: number;
  verticalSpacing?: number;
  color?: string;
  opacity?: number;
  thickness?: number;
  majorEvery?: number;
  majorOpacity?: number;
  offsetX?: number;
  offsetY?: number;
  visible?: boolean;
};
