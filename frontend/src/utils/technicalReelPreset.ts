import { fabric } from 'fabric';
import type {
  FabricObjectAnimation,
  FabricObjectAnimationType,
  SceneAnimationConfig,
  TimelineTransitionType,
} from '../types/timeline';
import { TECHNICAL_REEL_SCENE_ORDER, technicalReelDurationForOrder } from '../types/timeline';

export const TECHNICAL_REEL_PRESET_NAME = 'Technical Reel';
export const TECHNICAL_REEL_DEFAULT_DURATIONS_MS = TECHNICAL_REEL_SCENE_ORDER.map((scene) => scene.durationMs);
export const TECHNICAL_REEL_TRANSITION_MS = 160;
export const TECHNICAL_REEL_TRANSITION_TYPE: TimelineTransitionType = 'fade';

export const TECHNICAL_REEL_SCENE_ANIMATION: SceneAnimationConfig = {
  enter: { type: 'none', durationMs: 0, easing: 'linear', delayMs: 0 },
  hold: { type: 'none', durationMs: 0, easing: 'linear', delayMs: 0 },
  exit: { type: 'none', durationMs: 0, easing: 'linear', delayMs: 0 },
};

type PlainCanvasObject = Record<string, unknown> & {
  type?: string;
  objects?: PlainCanvasObject[];
};

type ReelStats = {
  text: number;
  connectors: number;
  progress: number;
  charts: number;
  images: number;
  cards: number;
  dots: number;
};

const read = (object: PlainCanvasObject | fabric.Object, key: string) => (
  object instanceof fabric.Object
    ? object.get(key as keyof fabric.Object)
    : object[key]
);

const write = (object: PlainCanvasObject | fabric.Object, patch: Record<string, unknown>) => {
  if (object instanceof fabric.Object) object.set(patch);
  else Object.assign(object, patch);
};

const objectName = (object: PlainCanvasObject | fabric.Object) => String(
  read(object, 'name')
  || read(object, 'displayName')
  || read(object, 'elementId')
  || read(object, 'objectType')
  || read(object, 'teckstudioObjectType')
  || read(object, 'type')
  || '',
).toLowerCase();

const objectType = (object: PlainCanvasObject | fabric.Object) => String(
  read(object, 'type') || '',
).toLowerCase();

const tagsFor = (object: PlainCanvasObject | fabric.Object) => {
  const tags = read(object, 'elementTags');
  return Array.isArray(tags) ? tags.join(' ').toLowerCase() : '';
};

const isText = (object: PlainCanvasObject | fabric.Object) => (
  ['text', 'i-text', 'textbox'].includes(objectType(object))
);

const isConnector = (object: PlainCanvasObject | fabric.Object) => {
  const teckstudioType = String(read(object, 'teckstudioObjectType') || '');
  const role = String(read(object, 'posterRole') || '').toLowerCase();
  const name = objectName(object);
  return role === 'connector'
    || teckstudioType === 'diagramConnectorPath'
    || teckstudioType === 'diagramArrow'
    || name.includes('connector')
    || name.includes('arrow');
};

const isConnectorArrowhead = (object: PlainCanvasObject | fabric.Object) => {
  const teckstudioType = String(read(object, 'teckstudioObjectType') || '');
  const role = String(read(object, 'posterRole') || '').toLowerCase();
  return role === 'connector-arrowhead' || teckstudioType === 'diagramArrowHead';
};

const isChart = (object: PlainCanvasObject | fabric.Object) => (
  String(read(object, 'posterRole') || '').toLowerCase() === 'chart-bar'
  || Boolean(read(object, 'chartConfig'))
  || String(read(object, 'elementKind') || '') === 'chart'
  || objectName(object).includes('chart')
);

const isDot = (object: PlainCanvasObject | fabric.Object) => (
  ['status-dot', 'traveling-dot', 'circle-node', 'ring'].includes(String(read(object, 'posterRole') || '').toLowerCase())
  || (
    objectType(object) === 'circle'
    && Number(read(object, 'radius') || 0) <= 18
  )
);

const isProgress = (object: PlainCanvasObject | fabric.Object) => {
  const role = String(read(object, 'posterRole') || '').toLowerCase();
  const name = objectName(object);
  const tags = tagsFor(object);
  const width = Number(read(object, 'width') || 0);
  const height = Number(read(object, 'height') || 0);
  return role === 'progress-bar'
    || name.includes('progress')
    || tags.includes('progress')
    || (objectType(object) === 'rect' && width > height * 3 && height <= 40);
};

const isCard = (object: PlainCanvasObject | fabric.Object) => {
  const teckstudioType = String(read(object, 'teckstudioObjectType') || '');
  const role = String(read(object, 'posterRole') || '').toLowerCase();
  const name = objectName(object);
  return role === 'card'
    || role === 'token-chip'
    || role === 'circle-node'
    || teckstudioType === 'architectureNode'
    || teckstudioType === 'diagramBox'
    || name.includes('card')
    || name.includes('node')
    || name.includes('box');
};

const isCodeText = (object: PlainCanvasObject | fabric.Object) => {
  const role = String(read(object, 'posterRole') || '').toLowerCase();
  const name = objectName(object);
  const fontFamily = String(read(object, 'fontFamily') || '').toLowerCase();
  return isText(object)
    && !['hero-title', 'subtitle', 'small-label', 'footer', 'technical-section-number'].includes(role)
    && (role === 'code-line' || fontFamily.includes('mono') || name.includes('code') || name.includes('terminal'));
};

const isHeadingText = (object: PlainCanvasObject | fabric.Object) => {
  if (!isText(object)) return false;
  const name = objectName(object);
  const role = String(read(object, 'posterRole') || read(object, 'architectureRole') || read(object, 'textRole') || '').toLowerCase();
  const fontSize = Number(read(object, 'fontSize') || 0);
  const top = Number(read(object, 'top') || 0);
  return role.includes('title') || role.includes('heading') || role.includes('hero') || name.includes('title') || name.includes('heading') || fontSize >= 34 || top < 220;
};

const animation = (
  type: FabricObjectAnimationType,
  startMs: number,
  durationMs: number,
  extra: Partial<FabricObjectAnimation> = {},
): FabricObjectAnimation => ({
  id: `technical-reel-${type}-${startMs}`,
  type,
  startMs,
  durationMs,
  delayMs: 0,
  easing: 'ease-out',
  loop: false,
  ...extra,
});

const setObjectAnimation = (
  object: PlainCanvasObject | fabric.Object,
  type: FabricObjectAnimationType,
  startMs: number,
  durationMs: number,
  extra: Partial<FabricObjectAnimation> = {},
) => {
  const fullText = isText(object) ? String(read(object, 'text') || '') : undefined;
  const persisted = animation(type, startMs, durationMs, extra);
  const width = Number(read(object, 'width') || 0);
  const height = Number(read(object, 'height') || 0);
  const scaleX = Number(read(object, 'scaleX') || 1);
  const scaleY = Number(read(object, 'scaleY') || 1);
  write(object, {
    objectAnimations: [persisted],
    animationConfig: {
      format: 'fabric-keyframe',
      animationType: type,
      startMs,
      durationMs,
      delayMs: 0,
      easing: persisted.easing,
      loop: false,
      fullText,
    },
    baseAnimationState: {
      left: Number(read(object, 'left') || 0),
      top: Number(read(object, 'top') || 0),
      width,
      height,
      scaleX,
      scaleY,
      angle: Number(read(object, 'angle') || 0),
      opacity: Number(read(object, 'opacity') ?? 1),
      visible: read(object, 'visible') !== false,
      text: fullText,
      strokeDashArray: read(object, 'strokeDashArray'),
      strokeDashOffset: Number(read(object, 'strokeDashOffset') || 0),
    },
    originalText: fullText,
    targetWidth: width * scaleX,
    targetHeight: height * scaleY,
  });
};

const setConnectorAnimation = (
  object: PlainCanvasObject | fabric.Object,
  startMs: number,
  durationMs: number,
) => {
  const configKey = String(read(object, 'teckstudioObjectType') || '') === 'diagramArrow'
    ? 'diagramArrowConfig'
    : 'diagramConnectorConfig';
  const current = (read(object, configKey) || {}) as Record<string, unknown>;
  const currentAnimation = (current.animation || {}) as Record<string, unknown>;
  write(object, {
    objectAnimations: [animation('draw', startMs, durationMs)],
    animationConfig: {
      format: 'fabric-keyframe',
      animationType: 'draw',
      startMs,
      durationMs,
      delayMs: 0,
      easing: 'ease-out',
      loop: false,
    },
    [configKey]: {
      ...current,
      animation: {
        ...currentAnimation,
        enabled: true,
        type: 'draw-in',
        direction: 'forward-once',
        duration: durationMs,
        delay: startMs,
        startDelay: 0,
        loop: false,
        easing: 'ease-out',
      },
    },
  });
};

const childObjects = (object: PlainCanvasObject | fabric.Object): Array<PlainCanvasObject | fabric.Object> => {
  if ('getObjects' in object && typeof object.getObjects === 'function') return object.getObjects();
  return Array.isArray((object as PlainCanvasObject).objects) ? (object as PlainCanvasObject).objects || [] : [];
};

const visitObjects = (
  objects: Array<PlainCanvasObject | fabric.Object>,
  visitor: (object: PlainCanvasObject | fabric.Object) => void,
) => {
  objects.forEach((object) => {
    visitor(object);
    visitObjects(childObjects(object), visitor);
  });
};

const clearExistingReelAnimations = (object: PlainCanvasObject | fabric.Object) => {
  const current = read(object, 'objectAnimations');
  if (Array.isArray(current)) {
    write(object, {
      objectAnimations: current.filter((item) => !String((item as { id?: string }).id || '').startsWith('technical-reel-')),
    });
  }
};

const assignAnimations = (
  objects: Array<PlainCanvasObject | fabric.Object>,
  sceneDurationMs: number,
) => {
  const stats: ReelStats = {
    text: 0,
    connectors: 0,
    progress: 0,
    charts: 0,
    images: 0,
    cards: 0,
    dots: 0,
  };
  const flattened: Array<PlainCanvasObject | fabric.Object> = [];
  visitObjects(objects, (object) => {
    clearExistingReelAnimations(object);
    flattened.push(object);
  });

  const topLevelRenderable = objects.filter((object) => (
    String(read(object, 'editorOnly') || '') !== 'true'
    && String(read(object, 'excludeFromExport') || '') !== 'true'
  ));
  const imageOnlyPoster = topLevelRenderable.length <= 2 && topLevelRenderable.some((object) => objectType(object) === 'image');

  if (imageOnlyPoster) {
    topLevelRenderable.forEach((object) => {
      if (objectType(object) === 'image') {
        setObjectAnimation(object, 'zoom-in', 0, Math.min(sceneDurationMs, 1800), { distance: 24 });
        stats.images += 1;
      }
    });
    return stats;
  }

  const latestStartMs = Math.max(sceneDurationMs - 900, 0);
  const boundedStart = (startMs: number) => Math.min(Math.max(Math.round(startMs), 0), latestStartMs);
  const roleCounts = new Map<string, number>();
  const nextRoleIndex = (role: string) => {
    const next = roleCounts.get(role) || 0;
    roleCounts.set(role, next + 1);
    return next;
  };
  const roleStart = (object: PlainCanvasObject | fabric.Object) => {
    const role = String(read(object, 'posterRole') || '').toLowerCase();
    const top = Number(read(object, 'top') || 0);
    if (role === 'technical-section-number' || (role === 'small-label' && top < 190)) return 0;
    if (role === 'hero-title' || isHeadingText(object)) return top < 300 ? 0 : boundedStart(220);
    if (role === 'subtitle') return boundedStart(top < 500 ? 120 : 360);
    if (role === 'footer') return boundedStart(sceneDurationMs - 850);
    if (role === 'connector' && objectName(object).includes('marker')) return boundedStart(960 + nextRoleIndex('marker') * 120);
    if (role === 'connector') return boundedStart(360 + nextRoleIndex('connector') * 170);
    if (role === 'connector-arrowhead') return boundedStart(520 + nextRoleIndex('connector-arrowhead') * 170);
    if (role === 'progress-bar') return boundedStart(680 + nextRoleIndex('progress') * 130);
    if (role === 'chart-bar') return boundedStart(920 + nextRoleIndex('chart') * 110);
    if (role === 'traveling-dot') return boundedStart(520 + nextRoleIndex('traveling-dot') * 140);
    if (role === 'status-dot' || role === 'circle-node') return boundedStart(520 + nextRoleIndex('dot') * 110);
    if (role === 'code-line' || role === 'terminal-line') return boundedStart(660 + nextRoleIndex('code') * 170);
    if (role === 'card' || role === 'token-chip') return boundedStart(180 + nextRoleIndex('card') * 140);
    if (isText(object)) return boundedStart(180 + nextRoleIndex('text') * 90);
    return boundedStart(240 + nextRoleIndex('object') * 120);
  };

  flattened.forEach((object) => {
    const role = String(read(object, 'posterRole') || '').toLowerCase();
    const startMs = roleStart(object);
    if (role === 'background') {
      return;
    }
    const name = objectName(object);
    if (isConnectorArrowhead(object)) {
      setObjectAnimation(object, 'fade-in', startMs, 120);
      stats.connectors += 1;
    } else if (isConnector(object)) {
      if (name.includes('marker')) {
        setObjectAnimation(object, 'marker-reveal', startMs, 520);
      } else {
        setConnectorAnimation(object, startMs, 520);
      }
      stats.connectors += 1;
    } else if (role === 'progress-track') {
      return;
    } else if (isProgress(object)) {
      setObjectAnimation(object, 'progress-fill', startMs, 620);
      stats.progress += 1;
    } else if (isChart(object)) {
      setObjectAnimation(object, 'bar-grow', startMs, 700);
      stats.charts += 1;
    } else if (role === 'ring') {
      setObjectAnimation(object, 'concentric-ring-pulse', startMs, 900);
      stats.dots += 1;
    } else if (role === 'traveling-dot') {
      const name = objectName(object);
      if (name.includes('progress rail') || name.includes('timeline') || name.includes('moving')) {
        setObjectAnimation(object, 'indicator-travel', startMs, 900, { direction: 'right', distance: 90 });
      } else {
        setObjectAnimation(object, 'traveling-dot', startMs, 780, { distance: 70 });
      }
      stats.dots += 1;
    } else if (isDot(object)) {
      setObjectAnimation(object, role === 'circle-node' ? 'scale-in' : 'pulse', startMs, 720);
      stats.dots += 1;
    } else if (isCodeText(object)) {
      setObjectAnimation(object, role === 'terminal-line' ? 'terminal-type' : 'code-line-reveal', startMs, 760);
      stats.text += 1;
    } else if (isHeadingText(object)) {
      setObjectAnimation(object, 'slide-up', startMs, 420, { distance: 34 });
      stats.text += 1;
    } else if (role === 'footer') {
      setObjectAnimation(object, 'fade-in', startMs, 420);
      stats.text += 1;
    } else if (isText(object)) {
      setObjectAnimation(object, name.includes('value') ? 'value-reveal' : 'fade-in', startMs, 420);
      stats.text += 1;
    } else if (isCard(object)) {
      setObjectAnimation(object, 'stagger', startMs, 520, { distance: 36 });
      stats.cards += 1;
    }
  });

  const firstCard = flattened.find(isCard);
  if (firstCard) {
    const current = read(firstCard, 'objectAnimations');
    const animations = Array.isArray(current) ? current : [];
    write(firstCard, {
      objectAnimations: [
        ...animations,
        animation('pulse', boundedStart(sceneDurationMs - 900), 700),
      ],
    });
  }
  return stats;
};

export const applyTechnicalReelPresetToCanvas = (
  canvas: fabric.Canvas,
  sceneDurationMs: number,
) => {
  const stats = assignAnimations(canvas.getObjects(), sceneDurationMs);
  canvas.getObjects().forEach((object) => object.setCoords());
  canvas.requestRenderAll();
  return stats;
};

export const applyTechnicalReelPresetToCanvasData = (
  canvasData: string,
  sceneDurationMs: number,
) => {
  if (!canvasData) return { data: canvasData, stats: null as ReelStats | null };
  try {
    const parsed = JSON.parse(canvasData) as { objects?: PlainCanvasObject[] };
    if (!Array.isArray(parsed.objects)) return { data: canvasData, stats: null };
    const stats = assignAnimations(parsed.objects, sceneDurationMs);
    return { data: JSON.stringify(parsed), stats };
  } catch {
    return { data: canvasData, stats: null };
  }
};

export const durationForTechnicalReelScene = (index: number) => (
  technicalReelDurationForOrder(index)
);
