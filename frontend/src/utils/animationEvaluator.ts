import type {
  AnimationPreset,
  FabricObjectAnimation,
  FabricObjectAnimationConfig,
  FabricObjectAnimationType,
  TimelineClip,
  TimelineKeyframe,
  TimelineProject,
  TimelineTransition,
} from '../types/timeline';

export type AnimationPhase = 'enter' | 'hold' | 'exit' | 'transition';

export interface SceneEvaluation {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  clipProgress: number;
  animationProgress: number;
  animationPhase: AnimationPhase;
}

export interface ActiveTransitionEvaluation {
  transition: TimelineTransition;
  fromClip: TimelineClip;
  toClip: TimelineClip;
  progress: number;
}

export interface ObjectAnimationEvaluation {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  visibleTextLength?: number;
  textValue?: string;
  strokeProgress?: number;
  strokeDashOffset?: number;
  widthFactor?: number;
  heightFactor?: number;
  progress: number;
  active: boolean;
}

const clamp = (value: number, minimum = 0, maximum = 1) => (
  Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum)
);

const readPoint = (point: unknown): { x: number; y: number } => {
  const record = point as { x?: unknown; y?: unknown };
  return {
    x: Number(record?.x) || 0,
    y: Number(record?.y) || 0,
  };
};

const readNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const interpolatePoints = (
  points: Array<{ x: number; y: number }>,
  progress: number,
) => {
  const segmentCount = Math.max(points.length - 1, 1);
  const scaled = clamp(progress) * segmentCount;
  const index = Math.min(Math.floor(scaled), segmentCount - 1);
  const local = scaled - index;
  const from = points[index];
  const to = points[index + 1] || from;
  return {
    x: from.x + ((to.x - from.x) * local),
    y: from.y + ((to.y - from.y) * local),
    angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
  };
};

const interpolateCubicBezier = (
  points: Array<{ x: number; y: number }>,
  progress: number,
) => {
  const [p0, p1, p2, p3] = points;
  const t = clamp(progress);
  const inverse = 1 - t;
  const x = (inverse ** 3 * p0.x)
    + (3 * inverse ** 2 * t * p1.x)
    + (3 * inverse * t ** 2 * p2.x)
    + (t ** 3 * p3.x);
  const y = (inverse ** 3 * p0.y)
    + (3 * inverse ** 2 * t * p1.y)
    + (3 * inverse * t ** 2 * p2.y)
    + (t ** 3 * p3.y);
  const dx = (3 * inverse ** 2 * (p1.x - p0.x))
    + (6 * inverse * t * (p2.x - p1.x))
    + (3 * t ** 2 * (p3.x - p2.x));
  const dy = (3 * inverse ** 2 * (p1.y - p0.y))
    + (6 * inverse * t * (p2.y - p1.y))
    + (3 * t ** 2 * (p3.y - p2.y));
  return {
    x,
    y,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
};

const interpolateMotionPath = (
  params: Record<string, unknown> | undefined,
  progress: number,
) => {
  const motionPath = (params?.motionPath || {}) as {
    points?: unknown[];
    shape?: string;
    radius?: unknown;
    reverse?: boolean;
    startAngle?: unknown;
    endAngle?: unknown;
    width?: unknown;
    height?: unknown;
    amplitude?: unknown;
    cycles?: unknown;
    bezier?: unknown[];
  };
  const pathProgress = motionPath.reverse ? 1 - progress : progress;
  if (Array.isArray(motionPath.bezier) && motionPath.bezier.length >= 4) {
    return interpolateCubicBezier(motionPath.bezier.slice(0, 4).map(readPoint), pathProgress);
  }
  if (motionPath.shape === 'circle') {
    const radius = Number(motionPath.radius) || 80;
    const startAngle = readNumber(motionPath.startAngle, 0);
    const endAngle = readNumber(motionPath.endAngle, 360);
    const angle = degreesToRadians(startAngle + ((endAngle - startAngle) * pathProgress));
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle: (angle * 180) / Math.PI,
    };
  }
  if (motionPath.shape === 'figure8') {
    const width = readNumber(motionPath.width, 220);
    const height = readNumber(motionPath.height, 120);
    const angle = pathProgress * Math.PI * 2;
    return {
      x: Math.sin(angle) * (width / 2),
      y: Math.sin(angle * 2) * (height / 2),
      angle: (Math.atan2(Math.cos(angle * 2) * height, Math.cos(angle) * width) * 180) / Math.PI,
    };
  }
  if (motionPath.shape === 'wave') {
    const distance = readNumber(motionPath.width, 220);
    const amplitude = readNumber(motionPath.amplitude, 45);
    const cycles = readNumber(motionPath.cycles, 2);
    return {
      x: distance * pathProgress,
      y: Math.sin(pathProgress * Math.PI * 2 * cycles) * amplitude,
      angle: (Math.atan2(Math.cos(pathProgress * Math.PI * 2 * cycles) * amplitude, distance) * 180) / Math.PI,
    };
  }
  const points = Array.isArray(motionPath.points) && motionPath.points.length > 1
    ? motionPath.points.map(readPoint)
    : [{ x: 0, y: 0 }, { x: 160, y: 0 }];
  return interpolatePoints(points, pathProgress);
};

const isMovingAnimationType = (type: string) => (
  type.startsWith('move-')
  || [
    'slide-across',
    'float-across',
    'moving-drift',
    'bounce-move',
    'zig-zag',
    'curve-path',
    'arc-move',
    'wave-move',
    'circle-move',
    'orbit',
    'figure-8',
    'path-follow',
    'arrow-travel',
    'continuous-scroll',
  ].includes(type)
);

const evaluateMovingAnimation = (
  animation: FabricObjectAnimation,
  progress: number,
  width: number,
  height: number,
) => {
  const type = String(animation.type);
  const movement = ((animation.params?.movement || animation.params?.motionPath || {}) as Record<string, unknown>);
  const shouldReverse = Boolean(movement.reverse) || String(animation.direction || '').toLowerCase().includes('reverse');
  const pathProgress = shouldReverse ? 1 - progress : progress;
  const distance = readNumber(movement.distance, animation.distance || Math.max(width, height) * 0.18);
  const amplitude = readNumber(movement.amplitude, Math.max(distance * 0.25, 32));
  const cycles = Math.max(readNumber(movement.cycles, 3), 0.5);
  const startX = readNumber(movement.startX, 0);
  const startY = readNumber(movement.startY, 0);
  const configuredEndX = movement.endX;
  const configuredEndY = movement.endY;
  const endX = readNumber(configuredEndX, 0);
  const endY = readNumber(configuredEndY, 0);
  const lerp = (start: number, end: number) => start + ((end - start) * pathProgress);

  if (Array.isArray(movement.points) && movement.points.length > 1) {
    return interpolatePoints(movement.points.map(readPoint), pathProgress);
  }
  if (Array.isArray(movement.bezier) && movement.bezier.length >= 4) {
    return interpolateCubicBezier(movement.bezier.slice(0, 4).map(readPoint), pathProgress);
  }
  if (type === 'move-left-right') return { x: lerp(startX, readNumber(configuredEndX, distance)), y: lerp(startY, endY), angle: 0 };
  if (type === 'move-right-left') return { x: lerp(startX, readNumber(configuredEndX, -distance)), y: lerp(startY, endY), angle: 180 };
  if (type === 'move-top-bottom') return { x: lerp(startX, endX), y: lerp(startY, readNumber(configuredEndY, distance)), angle: 90 };
  if (type === 'move-bottom-top') return { x: lerp(startX, endX), y: lerp(startY, readNumber(configuredEndY, -distance)), angle: -90 };
  if (type === 'move-diagonal-down-right') return { x: lerp(startX, readNumber(configuredEndX, distance)), y: lerp(startY, readNumber(configuredEndY, distance * 0.7)), angle: 35 };
  if (type === 'move-diagonal-up-right') return { x: lerp(startX, readNumber(configuredEndX, distance)), y: lerp(startY, readNumber(configuredEndY, -distance * 0.7)), angle: -35 };
  if (type === 'move-diagonal-down-left') return { x: lerp(startX, readNumber(configuredEndX, -distance)), y: lerp(startY, readNumber(configuredEndY, distance * 0.7)), angle: 145 };
  if (type === 'move-diagonal-up-left') return { x: lerp(startX, readNumber(configuredEndX, -distance)), y: lerp(startY, readNumber(configuredEndY, -distance * 0.7)), angle: -145 };
  if (type === 'slide-across' || type === 'continuous-scroll') return { x: lerp(readNumber(movement.startX, -width * 0.5), readNumber(movement.endX, width * 0.5)), y: lerp(startY, endY), angle: 0 };
  if (type === 'float-across' || type === 'wave-move') {
    return {
      x: lerp(startX, readNumber(configuredEndX, distance)),
      y: lerp(startY, endY) + (Math.sin(pathProgress * Math.PI * 2 * cycles) * amplitude),
      angle: 0,
    };
  }
  if (type === 'moving-drift') {
    return {
      x: Math.sin(pathProgress * Math.PI * 2) * distance,
      y: Math.cos(pathProgress * Math.PI * 2) * amplitude,
      angle: 0,
    };
  }
  if (type === 'bounce-move') {
    return {
      x: lerp(startX, readNumber(configuredEndX, distance)),
      y: lerp(startY, endY) - (Math.abs(Math.sin(pathProgress * Math.PI * cycles)) * amplitude),
      angle: 0,
    };
  }
  if (type === 'zig-zag') {
    return {
      x: lerp(startX, readNumber(configuredEndX, distance)),
      y: lerp(startY, endY) + (Math.sin(pathProgress * Math.PI * cycles * 2) * amplitude),
      angle: 0,
    };
  }
  if (type === 'curve-path' || type === 'arc-move') {
    return {
      x: lerp(startX, readNumber(configuredEndX, distance)),
      y: lerp(startY, endY) - (Math.sin(pathProgress * Math.PI) * amplitude),
      angle: (Math.atan2(-Math.cos(pathProgress * Math.PI) * amplitude, distance) * 180) / Math.PI,
    };
  }
  if (type === 'circle-move' || type === 'orbit') {
    const radius = readNumber(movement.radius, 90);
    const startAngle = readNumber(movement.startAngle, 0);
    const endAngle = readNumber(movement.endAngle, 360);
    const clockwise = movement.clockwise !== false;
    const angle = degreesToRadians(startAngle + ((clockwise ? 1 : -1) * (endAngle - startAngle) * pathProgress));
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle: ((angle + Math.PI / 2) * 180) / Math.PI,
    };
  }
  if (type === 'figure-8') {
    const pathWidth = readNumber(movement.width, 220);
    const pathHeight = readNumber(movement.height, 120);
    const angle = pathProgress * Math.PI * 2;
    return {
      x: Math.sin(angle) * (pathWidth / 2),
      y: Math.sin(angle * 2) * (pathHeight / 2),
      angle: (Math.atan2(Math.cos(angle * 2) * pathHeight, Math.cos(angle) * pathWidth) * 180) / Math.PI,
    };
  }
  return { x: lerp(startX, readNumber(configuredEndX, distance)), y: lerp(startY, endY), angle: 0 };
};

export const easeAnimationProgress = (
  progress: number,
  easing: AnimationPreset['easing'] = 'linear',
) => {
  const value = clamp(progress);
  if (easing === 'ease-in') return value * value;
  if (easing === 'ease-out') return 1 - ((1 - value) * (1 - value));
  if (easing === 'ease-out-back') {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + (c3 * Math.pow(value - 1, 3)) + (c1 * Math.pow(value - 1, 2));
  }
  if (easing === 'ease-in-out') {
    return value < 0.5
      ? 2 * value * value
      : 1 - (Math.pow(-2 * value + 2, 2) / 2);
  }
  return value;
};

const applyPreset = (
  evaluation: SceneEvaluation,
  preset: AnimationPreset | undefined,
  progress: number,
  direction: 'enter' | 'hold' | 'exit',
  width: number,
  height: number,
) => {
  if (!preset || preset.type === 'none') return evaluation;
  const easedProgress = easeAnimationProgress(progress, preset.easing);
  const panDistanceX = width * 0.04;

  if (preset.type === 'fade') {
    evaluation.opacity *= direction === 'exit' ? 1 - easedProgress : easedProgress;
  }
  if (preset.type === 'slide-left') {
    evaluation.translateX += direction === 'exit'
      ? -width * easedProgress
      : width * (1 - easedProgress);
  }
  if (preset.type === 'slide-right') {
    evaluation.translateX += direction === 'exit'
      ? width * easedProgress
      : -width * (1 - easedProgress);
  }
  if (preset.type === 'slide-up') {
    evaluation.translateY += direction === 'exit'
      ? -height * easedProgress
      : height * (1 - easedProgress);
  }
  if (preset.type === 'slide-down') {
    evaluation.translateY += direction === 'exit'
      ? height * easedProgress
      : -height * (1 - easedProgress);
  }
  if (preset.type === 'zoom-in') {
    const scale = direction === 'exit'
      ? 1 + (0.25 * easedProgress)
      : 0.75 + (0.25 * easedProgress);
    evaluation.scaleX *= scale;
    evaluation.scaleY *= scale;
  }
  if (preset.type === 'zoom-out') {
    const scale = direction === 'exit'
      ? 1 - (0.25 * easedProgress)
      : 1.25 - (0.25 * easedProgress);
    evaluation.scaleX *= scale;
    evaluation.scaleY *= scale;
  }
  if (preset.type === 'pan-left') evaluation.translateX -= panDistanceX * easedProgress;
  if (preset.type === 'pan-right') evaluation.translateX += panDistanceX * easedProgress;
  if (preset.type === 'pop') {
    const overshoot = 1 + (2.70158 * Math.pow(easedProgress - 1, 3))
      + (1.70158 * Math.pow(easedProgress - 1, 2));
    const scale = direction === 'exit'
      ? 1 - (0.5 * easedProgress)
      : 0.5 + (0.5 * overshoot);
    evaluation.scaleX *= scale;
    evaluation.scaleY *= scale;
  }
  if (preset.type === 'rotate') {
    evaluation.rotation += 360 * easedProgress * (direction === 'exit' ? -1 : 1);
  }
  if (preset.type === 'pulse') {
    const pulseScale = 1 + (Math.sin(easedProgress * Math.PI) * 0.08);
    evaluation.scaleX *= pulseScale;
    evaluation.scaleY *= pulseScale;
  }
  evaluation.animationProgress = easedProgress;
  return evaluation;
};

const normalizeObjectAnimationType = (value: unknown): FabricObjectAnimationType => {
  const type = String(value || 'none').trim().toLowerCase();
  if (isMovingAnimationType(type)) return type as FabricObjectAnimationType;
  const exactTypes: FabricObjectAnimationType[] = [
    'none',
    'fade',
    'fade-in',
    'fade-out',
    'slide-left',
    'slide-right',
    'slide-up',
    'slide-down',
    'slide-out',
    'slide-out-left',
    'slide-out-right',
    'slide-out-up',
    'slide-out-down',
    'zoom-in',
    'zoom-out',
    'scale-out',
    'pan-left',
    'pan-right',
    'pop',
    'pop-in',
    'pulse',
    'glow-pulse',
    'rotate',
    'typewriter',
    'word-reveal',
    'line-reveal',
    'character-reveal',
    'bounce',
    'float',
    'wobble',
    'shake',
    'morph',
    'scale',
    'slide',
    'rise',
    'pan-up',
    'pan-down',
    'bounce-in',
    'drift-in',
    'tumble-in',
    'wipe-in',
    'blur-in',
    'reveal',
    'fade-characters',
    'pop-characters',
    'rise-characters',
    'pan-text',
    'tumble-text',
    'breathe-text',
    'flicker',
    'neon-flicker',
    'wipe-text',
    'slide-text',
    'bounce-text',
    'wave-text',
    'letter-stagger',
    'motion-path',
    'ken-burns',
    'drift',
    'breathe',
    'wiggle',
    'swing',
    'jitter',
    'heartbeat',
    'color-pulse',
    'rotate-small',
    'hover',
    'pop-out',
    'wipe-out',
    'blur-out',
    'drift-out',
    'confetti-burst',
    'confetti-fall',
    'count-up',
    'count-down',
    'percentage-count',
    'currency-count',
    'follower-count',
    'progress-count',
    'wipe-left',
    'wipe-right',
    'wipe-up',
    'wipe-down',
    'center-reveal',
    'circular-reveal',
    'draw',
    'line-draw',
    'outline-draw',
    'arrow-draw-in',
    'connector-draw-in',
    'dash-flow',
    'progress-fill',
    'bar-grow',
    'chart-stagger',
    'traveling-dot',
    'dot-sequence',
    'indicator-travel',
    'stagger-reveal',
    'sequential-reveal',
    'marker-reveal',
    'value-reveal',
    'stagger',
    'terminal-type',
    'code-line-reveal',
    'sequential-card-reveal',
    'card-reveal',
    'card-stagger',
    'footer-reveal',
    'status-dot-pulse',
    'technical-pulse',
    'concentric-ring-pulse',
    'ring-draw',
    'ring-pulse',
    'orbit-dot',
    'blink',
    'cursor-blink',
    'ai-node-scale-in',
    'scale-in',
  ];
  if (exactTypes.includes(type as FabricObjectAnimationType)) {
    return type as FabricObjectAnimationType;
  }
  if (type.includes('marker') && type.includes('reveal')) return 'marker-reveal';
  if (type.includes('motion') && type.includes('path')) return 'motion-path';
  if (type.includes('ken') && type.includes('burn')) return 'ken-burns';
  if (type.includes('confetti') || type.includes('burst')) return type.includes('fall') ? 'confetti-fall' : 'confetti-burst';
  if (type.includes('count')) return type.includes('down') ? 'count-down' : 'count-up';
  if (type.includes('value') && type.includes('reveal')) return 'value-reveal';
  if (type.includes('footer') && type.includes('reveal')) return 'footer-reveal';
  if (type.includes('card') && type.includes('stagger')) return 'card-stagger';
  if (type.includes('card') && type.includes('reveal')) return 'card-reveal';
  if (type.includes('sequential') && type.includes('reveal')) return 'sequential-reveal';
  if (type.includes('stagger') && type.includes('reveal')) return 'stagger-reveal';
  if (type.includes('line') && type.includes('draw')) return 'line-draw';
  if (type.includes('outline') && type.includes('draw')) return 'outline-draw';
  if (type.includes('line-reveal')) return 'line-reveal';
  if (type.includes('terminal')) return 'terminal-type';
  if (type.includes('code-line')) return 'code-line-reveal';
  if (type.includes('character')) return 'character-reveal';
  if (type.includes('word')) return 'word-reveal';
  if (type.includes('cursor') && type.includes('blink')) return 'cursor-blink';
  if (type.includes('typewriter') || type.startsWith('word-')) return 'typewriter';
  if (type.includes('progress') || type.includes('fill')) return 'progress-fill';
  if (type.includes('chart') && type.includes('stagger')) return 'chart-stagger';
  if (type.includes('bar') && type.includes('grow')) return 'bar-grow';
  if (type.includes('indicator') || type.includes('travel-down') || type.includes('progress-move')) return 'indicator-travel';
  if (type.includes('dot') && type.includes('sequence')) return 'dot-sequence';
  if (type.includes('orbit')) return 'orbit-dot';
  if (type.includes('travel') || type.includes('dot')) return 'traveling-dot';
  if (type.includes('sequential') || type.includes('stagger')) return 'stagger';
  if (type.includes('fade')) return type.includes('out') ? 'fade-out' : 'fade-in';
  if (type.includes('slide') && type.includes('out') && type.includes('left')) return 'slide-out-left';
  if (type.includes('slide') && type.includes('out') && type.includes('right')) return 'slide-out-right';
  if (type.includes('slide') && type.includes('out') && type.includes('up')) return 'slide-out-up';
  if (type.includes('slide') && type.includes('out') && type.includes('down')) return 'slide-out-down';
  if (type.includes('slide') && type.includes('out')) return 'slide-out';
  if (type.includes('slide') || type.includes('swipe')) return 'slide-left';
  if (type === 'morph' || type.includes('morph')) return 'morph';
  if (type === 'scale') return 'scale';
  if (type === 'slide') return 'slide';
  if (type.includes('scale') && type.includes('out')) return 'scale-out';
  if (type.includes('ai') && type.includes('node')) return 'ai-node-scale-in';
  if (type.includes('zoom') || type.includes('scale')) return 'zoom-in';
  if (type.includes('pop')) return 'pop-in';
  if (type.includes('glow')) return 'glow-pulse';
  if (type.includes('status') && type.includes('pulse')) return 'status-dot-pulse';
  if (type.includes('technical') && type.includes('pulse')) return 'technical-pulse';
  if (type.includes('ring') && type.includes('draw')) return 'ring-draw';
  if (type.includes('ring') && type.includes('pulse')) return 'concentric-ring-pulse';
  if (type.includes('pulse') || type.includes('heart')) return 'pulse';
  if (type.includes('breathe')) return 'breathe';
  if (type.includes('wiggle')) return 'wiggle';
  if (type.includes('swing')) return 'swing';
  if (type.includes('jitter')) return 'jitter';
  if (type.includes('rotate') || type.includes('spin') || type.includes('loop')) return 'rotate';
  if (type.includes('bounce')) return 'bounce';
  if (type.includes('float') || type.includes('steam')) return 'float';
  if (type.includes('wobble')) return 'wobble';
  if (type.includes('shake')) return 'shake';
  if (type.includes('dash')) return 'dash-flow';
  if (type.includes('arrow') && type.includes('draw')) return 'arrow-draw-in';
  if (type.includes('connector') && type.includes('draw')) return 'connector-draw-in';
  if (type.includes('draw')) return 'draw';
  if (type.includes('blink')) return 'blink';
  if (type.includes('scale')) return 'scale-in';
  return type as FabricObjectAnimationType;
};

export const normalizeObjectAnimation = (
  config: FabricObjectAnimation | FabricObjectAnimationConfig | undefined,
  objectId?: string,
): FabricObjectAnimation | null => {
  if (!config) return null;
  const legacy = config as FabricObjectAnimationConfig;
  const speed = Math.max(Number(legacy.speed) || 1, 0.01);
  const durationMs = Math.max(
    Number((config as FabricObjectAnimation).durationMs)
      || Number(legacy.duration)
      || (2000 / speed),
    1,
  );
  const type = normalizeObjectAnimationType(
    (config as FabricObjectAnimation).type || legacy.animationType,
  );
  if (type === 'none') return null;
  return {
    id: (config as FabricObjectAnimation).id,
    objectId: (config as FabricObjectAnimation).objectId || objectId,
    type,
    startMs: Math.max(Number((config as FabricObjectAnimation).startMs ?? legacy.startMs) || 0, 0),
    durationMs,
    delayMs: Math.max(Number((config as FabricObjectAnimation).delayMs ?? legacy.delayMs ?? legacy.delay) || 0, 0),
    easing: (config as FabricObjectAnimation).easing || legacy.easing || 'ease-in-out',
    loop: (config as FabricObjectAnimation).loop ?? legacy.loop ?? false,
    direction: (config as FabricObjectAnimation).direction || legacy.direction,
    distance: Number((config as FabricObjectAnimation).distance ?? legacy.distance) || undefined,
    rotationAmount: Number(
      (config as FabricObjectAnimation).rotationAmount ?? legacy.rotationAmount,
    ) || undefined,
    from: (config as FabricObjectAnimation).from,
    to: (config as FabricObjectAnimation).to,
    params: (config as FabricObjectAnimation).params || legacy.params,
  };
};

export const evaluateObjectAnimationAtTime = ({
  animation,
  localTimeMs,
  width,
  height,
  textLength = 0,
  objectWidth = 0,
  objectHeight = 0,
}: {
  animation: FabricObjectAnimation;
  localTimeMs: number;
  width: number;
  height: number;
  textLength?: number;
  objectWidth?: number;
  objectHeight?: number;
}): ObjectAnimationEvaluation => {
  const startMs = Math.max(animation.startMs || 0, 0) + Math.max(animation.delayMs || 0, 0);
  const elapsedMs = localTimeMs - startMs;
  const durationMs = Math.max(animation.durationMs, 1);
  const hasStarted = elapsedMs >= 0;
  const rawProgress = animation.loop && hasStarted
    ? ((elapsedMs % durationMs) + durationMs) % durationMs / durationMs
    : clamp(elapsedMs / durationMs);
  const progress = easeAnimationProgress(rawProgress, animation.easing || 'linear');
  const distanceX = animation.distance || width * 0.12;
  const distanceY = animation.distance || height * 0.12;
  const result: ObjectAnimationEvaluation = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    progress,
    active: hasStarted,
  };

  if (animation.type === 'fade' || animation.type === 'fade-in') {
    result.opacity = progress;
  } else if (animation.type === 'fade-out') {
    result.opacity = 1 - progress;
  } else if (animation.type === 'rise') {
    result.translateY = distanceY * 0.45 * (1 - progress);
    result.opacity = progress;
  } else if (animation.type === 'slide-left') {
    result.translateX = distanceX * (1 - progress);
  } else if (animation.type === 'slide-right') {
    result.translateX = -distanceX * (1 - progress);
  } else if (animation.type === 'slide-up') {
    result.translateY = distanceY * (1 - progress);
  } else if (animation.type === 'slide-down') {
    result.translateY = -distanceY * (1 - progress);
  } else if (animation.type === 'slide-out') {
    result.translateX = distanceX * progress;
    result.opacity = 1 - progress;
  } else if (animation.type === 'slide-out-left') {
    result.translateX = -distanceX * progress;
    result.opacity = 1 - progress;
  } else if (animation.type === 'slide-out-right') {
    result.translateX = distanceX * progress;
    result.opacity = 1 - progress;
  } else if (animation.type === 'slide-out-up') {
    result.translateY = -distanceY * progress;
    result.opacity = 1 - progress;
  } else if (animation.type === 'slide-out-down') {
    result.translateY = distanceY * progress;
    result.opacity = 1 - progress;
  } else if (animation.type === 'zoom-in') {
    result.scaleX = 0.75 + (0.25 * progress);
    result.scaleY = result.scaleX;
  } else if (animation.type === 'zoom-out') {
    result.scaleX = 1.25 - (0.25 * progress);
    result.scaleY = result.scaleX;
  } else if (animation.type === 'scale-out') {
    result.scaleX = Math.max(1 - progress, 0.001);
    result.scaleY = result.scaleX;
    result.opacity = 1 - progress;
  } else if (animation.type === 'pan-left') {
    result.translateX = -distanceX * progress;
  } else if (animation.type === 'pan-right') {
    result.translateX = distanceX * progress;
  } else if (animation.type === 'pan-up') {
    result.translateY = -distanceY * progress;
  } else if (animation.type === 'pan-down') {
    result.translateY = distanceY * progress;
  } else if (animation.type === 'pop' || animation.type === 'pop-in') {
    const overshoot = 1 + (2.70158 * Math.pow(progress - 1, 3))
      + (1.70158 * Math.pow(progress - 1, 2));
    result.scaleX = 0.5 + (0.5 * overshoot);
    result.scaleY = result.scaleX;
    result.opacity = progress;
  } else if (animation.type === 'bounce-in') {
    result.scaleX = 0.6 + (0.4 * progress);
    result.scaleY = result.scaleX;
    result.translateY = Math.sin((1 - progress) * Math.PI * 2) * 12 * (1 - progress);
    result.opacity = progress;
  } else if (animation.type === 'drift-in') {
    result.translateX = distanceX * 0.4 * (1 - progress);
    result.translateY = distanceY * 0.24 * (1 - progress);
    result.opacity = progress;
  } else if (animation.type === 'tumble-in') {
    result.rotation = -35 * (1 - progress);
    result.scaleX = 0.72 + (0.28 * progress);
    result.scaleY = result.scaleX;
    result.opacity = progress;
  } else if (animation.type === 'wipe-in' || animation.type === 'reveal' || animation.type === 'wipe-text' || animation.type === 'wipe-left' || animation.type === 'wipe-right') {
    result.widthFactor = Math.max(progress, 0.001);
    if (animation.type === 'wipe-left') result.translateX = (objectWidth || width * 0.2) * (1 - progress);
  } else if (animation.type === 'wipe-up' || animation.type === 'wipe-down' || animation.type === 'center-reveal' || animation.type === 'circular-reveal') {
    result.heightFactor = Math.max(progress, 0.001);
    if (animation.type === 'wipe-up') result.translateY = (objectHeight || height * 0.15) * (1 - progress);
  } else if (animation.type === 'blur-in') {
    result.opacity = progress;
    result.scaleX = 0.97 + (0.03 * progress);
    result.scaleY = result.scaleX;
  } else if (animation.type === 'pulse' || animation.type === 'glow-pulse' || animation.type === 'status-dot-pulse' || animation.type === 'technical-pulse' || animation.type === 'concentric-ring-pulse' || animation.type === 'ring-pulse' || animation.type === 'breathe' || animation.type === 'breathe-text' || animation.type === 'heartbeat') {
    const amplitude = Number(animation.params?.amplitude) || (animation.type.includes('ring') ? 0.14 : 0.08);
    const pulseWave = animation.type === 'heartbeat'
      ? Math.pow(Math.sin(progress * Math.PI * 2), 8)
      : Math.sin(progress * Math.PI);
    result.scaleX = 1 + (pulseWave * amplitude);
    result.scaleY = result.scaleX;
    if (animation.type !== 'pulse') {
      result.opacity = 0.72 + (Math.sin(progress * Math.PI) * 0.28);
    }
  } else if (animation.type === 'rotate') {
    result.rotation = (animation.rotationAmount || 360) * progress;
  } else if (animation.type === 'rotate-small') {
    result.rotation = Math.sin(progress * Math.PI * 2) * (animation.rotationAmount || 8);
  } else if (animation.type === 'typewriter' || animation.type === 'word-reveal' || animation.type === 'character-reveal' || animation.type === 'line-reveal' || animation.type === 'terminal-type' || animation.type === 'code-line-reveal' || animation.type === 'fade-characters' || animation.type === 'letter-stagger') {
    result.visibleTextLength = Math.floor(textLength * progress);
    if (animation.type !== 'typewriter' && animation.type !== 'terminal-type') result.opacity = progress;
  } else if (animation.type === 'pop-characters' || animation.type === 'rise-characters' || animation.type === 'pan-text' || animation.type === 'tumble-text' || animation.type === 'slide-text' || animation.type === 'bounce-text' || animation.type === 'wave-text') {
    result.visibleTextLength = Math.floor(textLength * progress);
    result.opacity = progress;
    if (animation.type.includes('rise') || animation.type.includes('bounce') || animation.type.includes('wave')) {
      result.translateY = Math.sin((1 - progress) * Math.PI) * 18;
    }
    if (animation.type.includes('pan') || animation.type.includes('slide')) {
      result.translateX = distanceX * 0.4 * (1 - progress);
    }
    if (animation.type.includes('tumble')) {
      result.rotation = -18 * (1 - progress);
    }
    if (animation.type.includes('pop')) {
      result.scaleX = 0.72 + (0.28 * progress);
      result.scaleY = result.scaleX;
    }
  } else if (animation.type === 'flicker' || animation.type === 'neon-flicker') {
    const flicker = Math.sin(progress * Math.PI * 18) > -0.25 ? 1 : 0.3;
    result.opacity = animation.type === 'neon-flicker' ? Math.max(0.45, flicker) : flicker;
  } else if (animation.type === 'bounce') {
    result.translateY = -Math.abs(Math.sin(progress * Math.PI)) * (animation.distance || 18);
  } else if (animation.type === 'float') {
    result.translateY = Math.sin(progress * Math.PI * 2) * (animation.distance || 12);
  } else if (animation.type === 'wobble') {
    result.rotation = Math.sin(progress * Math.PI * 2) * (animation.rotationAmount || 8);
  } else if (animation.type === 'wiggle' || animation.type === 'swing') {
    result.rotation = Math.sin(progress * Math.PI * 2) * (animation.rotationAmount || (animation.type === 'swing' ? 12 : 6));
  } else if (animation.type === 'shake') {
    result.translateX = Math.sin(progress * Math.PI * 4) * (animation.distance || 12);
  } else if (animation.type === 'jitter') {
    result.translateX = Math.sin(progress * Math.PI * 18) * (animation.distance || 4);
    result.translateY = Math.cos(progress * Math.PI * 14) * (animation.distance || 3);
  } else if (animation.type === 'morph') {
    result.scaleX = 1 + (Math.sin(progress * Math.PI * 2) * 0.12);
    result.scaleY = 1 - (Math.sin(progress * Math.PI * 2) * 0.08);
    result.rotation = Math.sin(progress * Math.PI * 2) * 3;
  } else if (animation.type === 'scale') {
    result.scaleX = 0.65 + (0.35 * progress);
    result.scaleY = result.scaleX;
    result.opacity = progress;
  } else if (animation.type === 'slide') {
    result.translateX = distanceX * progress;
  } else if (animation.type === 'draw' || animation.type === 'line-draw' || animation.type === 'outline-draw' || animation.type === 'ring-draw' || animation.type === 'arrow-draw-in' || animation.type === 'connector-draw-in') {
    result.strokeProgress = progress;
  } else if (animation.type === 'dash-flow') {
    result.strokeProgress = 1;
    result.strokeDashOffset = -((animation.distance || 48) * progress);
  } else if (animation.type === 'progress-fill') {
    const targetRatio = clamp(Number(animation.params?.targetPercent ?? 100) / 100, 0.001, 1);
    const fillProgress = Math.max(progress * targetRatio, 0.001);
    const direction = String(animation.direction || 'right').toLowerCase();
    if (direction.includes('up') || direction.includes('bottom')) {
      result.heightFactor = fillProgress;
      result.translateY = (objectHeight || height * 0.15) * (1 - fillProgress);
    } else if (direction.includes('down') || direction.includes('top')) {
      result.heightFactor = fillProgress;
    } else {
      result.widthFactor = fillProgress;
      if (direction.includes('left')) {
        result.translateX = (objectWidth || width * 0.2) * (1 - fillProgress);
      }
    }
  } else if (animation.type === 'bar-grow' || animation.type === 'chart-stagger') {
    const targetRatio = clamp(Number(animation.params?.targetPercent ?? 100) / 100, 0.001, 1);
    const fillProgress = Math.max(progress * targetRatio, 0.001);
    result.heightFactor = fillProgress;
    result.translateY = (objectHeight || height * 0.15) * (1 - fillProgress);
  } else if (isMovingAnimationType(String(animation.type))) {
    const point = evaluateMovingAnimation(animation, progress, width, height);
    result.translateX = point.x;
    result.translateY = point.y;
    if ((animation.params?.movement as { orientToPath?: boolean } | undefined)?.orientToPath) {
      result.rotation = point.angle;
    }
  } else if (animation.type === 'traveling-dot') {
    const movement = animation.params?.movement as Record<string, unknown> | undefined;
    if (movement) {
      const point = evaluateMovingAnimation({ ...animation, type: 'move-left-right' }, progress, width, height);
      result.translateX = point.x;
      result.translateY = point.y;
    } else {
      result.translateX = distanceX * progress;
    }
    result.opacity = progress < 0.08 ? progress / 0.08 : progress > 0.92 ? (1 - progress) / 0.08 : 1;
  } else if (animation.type === 'dot-sequence') {
    const pulse = Math.sin(progress * Math.PI * 2);
    result.opacity = 0.35 + ((pulse + 1) * 0.325);
    result.scaleX = 0.86 + ((pulse + 1) * 0.12);
    result.scaleY = result.scaleX;
  } else if (animation.type === 'orbit-dot') {
    result.rotation = 360 * progress;
  } else if (animation.type === 'motion-path') {
    const point = interpolateMotionPath({
      motionPath: animation.params?.motionPath || animation.params?.movement,
    }, progress);
    result.translateX = point.x;
    result.translateY = point.y;
    if (
      (animation.params?.motionPath as { orientToPath?: boolean } | undefined)?.orientToPath
      || (animation.params?.movement as { orientToPath?: boolean } | undefined)?.orientToPath
    ) {
      result.rotation = point.angle;
    }
  } else if (animation.type === 'ken-burns') {
    result.scaleX = 1 + (0.12 * progress);
    result.scaleY = result.scaleX;
    result.translateX = -distanceX * 0.25 * progress;
    result.translateY = -distanceY * 0.16 * progress;
  } else if (animation.type === 'drift') {
    result.translateX = Math.sin(progress * Math.PI * 2) * (animation.distance || 18);
    result.translateY = Math.cos(progress * Math.PI * 2) * (animation.distance || 10);
  } else if (animation.type === 'indicator-travel') {
    const direction = String(animation.direction || 'down').toLowerCase();
    if (direction.includes('left')) {
      result.translateX = -distanceX * progress;
    } else if (direction.includes('right')) {
      result.translateX = distanceX * progress;
    } else if (direction.includes('up')) {
      result.translateY = -distanceY * progress;
    } else {
      result.translateY = distanceY * progress;
    }
    result.opacity = progress < 0.08 ? progress / 0.08 : progress > 0.92 ? (1 - progress) / 0.08 : 1;
  } else if (animation.type === 'marker-reveal') {
    result.strokeProgress = progress;
    result.opacity = progress;
  } else if (animation.type === 'value-reveal') {
    result.opacity = progress;
    result.translateY = distanceY * 0.18 * (1 - progress);
  } else if (animation.type === 'count-up' || animation.type === 'count-down' || animation.type === 'percentage-count' || animation.type === 'currency-count' || animation.type === 'follower-count' || animation.type === 'progress-count') {
    const startValue = Number(animation.params?.startValue ?? (animation.type === 'count-down' ? 100 : 0));
    const endValue = Number(animation.params?.endValue ?? (animation.type === 'count-down' ? 0 : 100));
    const decimals = Math.max(0, Number(animation.params?.decimals ?? 0));
    const value = startValue + ((endValue - startValue) * progress);
    const prefix = String(animation.params?.prefix ?? (animation.type === 'currency-count' ? '$' : ''));
    const suffix = String(animation.params?.suffix ?? (animation.type.includes('percentage') || animation.type.includes('progress') ? '%' : ''));
    result.textValue = `${prefix}${value.toFixed(decimals)}${suffix}`;
    result.opacity = progress;
  } else if (animation.type === 'confetti-burst' || animation.type === 'confetti-fall') {
    result.opacity = progress > 0.82 ? (1 - progress) / 0.18 : 1;
    result.translateY = animation.type === 'confetti-fall'
      ? distanceY * progress
      : -distanceY * 0.35 * progress;
    result.translateX = Math.sin(progress * Math.PI * 2) * (animation.distance || 28);
    result.rotation = 180 * progress;
  } else if (animation.type === 'stagger' || animation.type === 'stagger-reveal' || animation.type === 'sequential-reveal' || animation.type === 'sequential-card-reveal' || animation.type === 'card-reveal' || animation.type === 'card-stagger' || animation.type === 'footer-reveal') {
    result.opacity = progress;
    result.translateY = distanceY * 0.35 * (1 - progress);
    result.scaleX = 0.94 + (0.06 * progress);
    result.scaleY = result.scaleX;
  } else if (animation.type === 'blink' || animation.type === 'cursor-blink') {
    result.opacity = progress < 0.5 ? 0.15 : 1;
  } else if (animation.type === 'scale-in' || animation.type === 'ai-node-scale-in') {
    result.scaleX = 0.6 + (0.4 * progress);
    result.scaleY = result.scaleX;
    result.opacity = progress;
  } else if (animation.type === 'pop-out' || animation.type === 'blur-out' || animation.type === 'drift-out' || animation.type === 'wipe-out') {
    result.opacity = 1 - progress;
    if (animation.type === 'pop-out') {
      result.scaleX = 1 + (0.18 * progress);
      result.scaleY = result.scaleX;
    }
    if (animation.type === 'drift-out') {
      result.translateX = distanceX * 0.6 * progress;
      result.translateY = distanceY * 0.24 * progress;
    }
    if (animation.type === 'wipe-out') {
      result.widthFactor = Math.max(1 - progress, 0.001);
    }
  }
  return result;
};

export const evaluateSceneAtTime = ({
  clip,
  globalTimeMs,
  width,
  height,
}: {
  clip: TimelineClip;
  globalTimeMs: number;
  width: number;
  height: number;
}): SceneEvaluation => {
  const localTimeMs = globalTimeMs - clip.startMs;
  const durationMs = Math.max(clip.durationMs, 1);
  const evaluation: SceneEvaluation = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    clipProgress: clamp(localTimeMs / durationMs),
    animationProgress: 0,
    animationPhase: 'hold',
  };

  const enter = clip.animation?.enter;
  const enterDelayMs = Math.max(enter?.delayMs || 0, 0);
  const enterDurationMs = Math.max(enter?.durationMs || 0, 1);
  const enterEndMs = enterDelayMs + enterDurationMs;
  if (enter && enter.type !== 'none' && localTimeMs < enterEndMs) {
    evaluation.animationPhase = 'enter';
    return applyPreset(
      evaluation,
      enter,
      clamp((localTimeMs - enterDelayMs) / enterDurationMs),
      'enter',
      width,
      height,
    );
  }

  const exit = clip.animation?.exit;
  const exitDurationMs = Math.max(exit?.durationMs || 0, 1);
  const exitStartMs = durationMs - exitDurationMs - Math.max(exit?.delayMs || 0, 0);
  if (exit && exit.type !== 'none' && localTimeMs >= exitStartMs) {
    evaluation.animationPhase = 'exit';
    return applyPreset(
      evaluation,
      exit,
      clamp((localTimeMs - exitStartMs) / exitDurationMs),
      'exit',
      width,
      height,
    );
  }

  const hold = clip.animation?.hold;
  if (hold && hold.type !== 'none') {
    const holdDurationMs = Math.max(hold.durationMs || durationMs, 1);
    const holdDelayMs = Math.max(hold.delayMs || 0, 0);
    const holdTimeMs = Math.max(localTimeMs - holdDelayMs, 0);
    evaluation.animationPhase = 'hold';
    return applyPreset(
      evaluation,
      hold,
      (holdTimeMs % holdDurationMs) / holdDurationMs,
      'hold',
      width,
      height,
    );
  }
  return evaluation;
};

export const evaluateTransitionAtTime = (
  timeline: TimelineProject,
  clips: TimelineClip[],
  globalTimeMs: number,
): ActiveTransitionEvaluation | null => {
  for (const transition of timeline.transitions) {
    const fromClip = clips.find((clip) => clip.id === transition.fromClipId);
    const toClip = clips.find((clip) => clip.id === transition.toClipId);
    if (!fromClip || !toClip || transition.durationMs <= 0) continue;
    const transitionStartMs = toClip.startMs;
    const transitionEndMs = transitionStartMs + transition.durationMs;
    if (globalTimeMs >= transitionStartMs && globalTimeMs <= transitionEndMs) {
      return {
        transition,
        fromClip,
        toClip,
        progress: clamp((globalTimeMs - transitionStartMs) / transition.durationMs),
      };
    }
  }
  return null;
};

export const evaluateKeyframeValue = (
  keyframes: TimelineKeyframe[],
  timeSeconds: number,
): number | boolean | undefined => {
  if (keyframes.length === 0) return undefined;
  const sorted = [...keyframes].sort((first, second) => first.time - second.time);
  if (timeSeconds <= sorted[0].time) return sorted[0].value;
  if (timeSeconds >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
  const nextIndex = sorted.findIndex((keyframe) => keyframe.time >= timeSeconds);
  const previous = sorted[nextIndex - 1];
  const next = sorted[nextIndex];
  if (typeof previous.value !== 'number' || typeof next.value !== 'number') return previous.value;
  if (next.easing === 'hold') return previous.value;
  const range = Math.max(next.time - previous.time, 0.0001);
  const progress = easeAnimationProgress(
    (timeSeconds - previous.time) / range,
    next.easing || 'linear',
  );
  return previous.value + ((next.value - previous.value) * progress);
};

export const frameTimestampMs = (frameIndex: number, fps: number) => (
  Math.max(frameIndex, 0) * 1000 / Math.max(fps, 1)
);
