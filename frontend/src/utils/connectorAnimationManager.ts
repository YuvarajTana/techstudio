import { fabric } from 'fabric';
import type {
  DiagramConnectorAnimationConfig,
  DiagramConnectorAnimationDirection,
  DiagramConnectorConfig,
} from './architectureDiagramTypes';
import { normalizeConnectorAnimation } from './architectureDiagramTypes';
import {
  getDiagramConnectorGeometry,
  getDiagramConnectorPaths,
} from './diagramConnectors';

type AnimatedPath = fabric.Path & {
  pathOffset?: fabric.Point;
  strokeDashOffset?: number;
};

type PathPoint = {
  x: number;
  y: number;
  angle: number;
};

type Geometry = {
  length: number;
  pointAt: (amount: number) => PathPoint;
};

type AnimationTarget = {
  id: string;
  root: fabric.Object;
  path: AnimatedPath;
  config: DiagramConnectorConfig;
  animation: Required<DiagramConnectorAnimationConfig>;
  geometry: Geometry;
};

type FabricPathUtilities = typeof fabric.util & {
  getPathSegmentsInfo: (path: unknown[]) => Array<{ length: number }>;
  getPointOnPath: (
    path: unknown[],
    distance: number,
    info: Array<{ length: number }>,
  ) => { x: number; y: number; angle: number };
};

const managerByCanvas = new WeakMap<fabric.Canvas, ConnectorAnimationManager>();
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const resolveProgress = (
  rawProgress: number,
  direction: DiagramConnectorAnimationDirection,
  cycleIndex: number,
) => {
  if (direction === 'reverse' || direction === 'reverse-once') return 1 - rawProgress;
  if (direction === 'alternating' && cycleIndex % 2 === 1) return 1 - rawProgress;
  return rawProgress;
};

const easeConnectorProgress = (
  progress: number,
  easing: Required<DiagramConnectorAnimationConfig>['easing'],
) => {
  const value = clamp01(progress);
  if (easing === 'ease-in') return value * value;
  if (easing === 'ease-out') return 1 - ((1 - value) * (1 - value));
  if (easing === 'ease-in-out') return value < 0.5
    ? 2 * value * value
    : 1 - (Math.pow(-2 * value + 2, 2) / 2);
  return value;
};

const getStandaloneGeometry = (path: AnimatedPath): Geometry | null => {
  const parsedPath = path.path as unknown[] | undefined;
  if (!parsedPath || parsedPath.length === 0) return null;
  const utilities = fabric.util as FabricPathUtilities;
  const segments = utilities.getPathSegmentsInfo(parsedPath);
  const length = segments[segments.length - 1]?.length || 0;
  if (!length) return null;
  const pointAt = (amount: number): PathPoint => {
    const point = utilities.getPointOnPath(parsedPath, clamp01(amount) * length, segments);
    const offset = path.pathOffset || new fabric.Point(0, 0);
    const localPoint = new fabric.Point(point.x - offset.x, point.y - offset.y);
    const worldPoint = fabric.util.transformPoint(localPoint, path.calcTransformMatrix());
    const nearby = utilities.getPointOnPath(
      parsedPath,
      clamp01(amount + 0.002) * length,
      segments,
    );
    const nearbyWorld = fabric.util.transformPoint(
      new fabric.Point(nearby.x - offset.x, nearby.y - offset.y),
      path.calcTransformMatrix(),
    );
    return {
      x: worldPoint.x,
      y: worldPoint.y,
      angle: Math.atan2(nearbyWorld.y - worldPoint.y, nearbyWorld.x - worldPoint.x),
    };
  };
  return { length, pointAt };
};

const getTargetId = (object: fabric.Object) => String(
  object.get('diagramConnectorId' as keyof fabric.Object)
  || object.get('id' as keyof fabric.Object)
  || '',
);

export class ConnectorAnimationManager {
  private canvas: fabric.Canvas;
  private frame: number | null = null;
  private lastTimestamp = 0;
  private elapsed = 0;
  private timelineTimeMs = 0;
  private playing = true;
  private exporting = false;
  private destroyed = false;
  private stopped = new Set<string>();
  private reducedMotionOverride: boolean | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private afterRenderHandler: () => void;
  private motionChangeHandler: () => void;
  private canvasMutationHandler: () => void;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.afterRenderHandler = () => {
      this.drawOverlay();
      this.ensureFrame();
    };
    this.motionChangeHandler = () => this.canvas.requestRenderAll();
    this.canvasMutationHandler = () => this.ensureFrame();
    this.canvas.on('after:render', this.afterRenderHandler);
    this.canvas.on('object:added', this.canvasMutationHandler);
    this.canvas.on('object:removed', this.canvasMutationHandler);
    this.canvas.on('object:modified', this.canvasMutationHandler);
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mediaQuery.addEventListener?.('change', this.motionChangeHandler);
    }
    this.ensureFrame();
  }

  private isReducedMotion() {
    return this.reducedMotionOverride ?? Boolean(this.mediaQuery?.matches);
  }

  private getTargets(): AnimationTarget[] {
    const attached = getDiagramConnectorPaths(this.canvas).flatMap((path) => {
      const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      if (!config?.animation) return [];
      const geometry = getDiagramConnectorGeometry(this.canvas, path);
      if (!geometry) return [];
      return [{
        id: getTargetId(path),
        root: path,
        path: path as AnimatedPath,
        config,
        animation: normalizeConnectorAnimation(config.animation, config.color),
        geometry,
      }];
    });

    const standalone = this.canvas.getObjects().flatMap((object) => {
      if (object.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramArrow' || object.type !== 'group') return [];
      const config = object.get('diagramArrowConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      if (!config?.animation) return [];
      const path = (object as fabric.Group).getObjects().find((child) => child.type === 'path') as AnimatedPath | undefined;
      if (!path) return [];
      const geometry = getStandaloneGeometry(path);
      if (!geometry) return [];
      return [{
        id: getTargetId(object),
        root: object,
        path,
        config,
        animation: normalizeConnectorAnimation(config.animation, config.color),
        geometry,
      }];
    });
    return [...attached, ...standalone];
  }

  private targetIsVisible(target: AnimationTarget) {
    if (
      target.root.visible === false
      || target.root.opacity === 0
      || !target.animation.enabled
      || this.stopped.has(target.id)
    ) return false;
    return true;
  }

  private getTiming(animation: Required<DiagramConnectorAnimationConfig>, timeMs = this.elapsed) {
    const duration = animation.duration / animation.speed;
    const start = animation.delay + animation.startDelay + animation.sequenceOrder * 250;
    const local = timeMs - start;
    if (local < 0) return { active: false, progress: 0, cycleIndex: 0 };
    const oneShot = !animation.loop
      || animation.direction === 'forward-once'
      || animation.direction === 'reverse-once';
    if (oneShot && local > duration) {
      return { active: false, progress: animation.direction === 'reverse-once' ? 0 : 1, cycleIndex: 0 };
    }
    const cycleLength = duration + animation.repeatDelay;
    const cycleIndex = Math.floor(local / cycleLength);
    const cycleTime = modulo(local, cycleLength);
    if (cycleTime > duration) return { active: false, progress: 1, cycleIndex };
    return {
      active: true,
      progress: easeConnectorProgress(resolveProgress(clamp01(cycleTime / duration), animation.direction, cycleIndex), animation.easing),
      cycleIndex,
    };
  }

  private updateFrame(timestamp: number) {
    if (this.destroyed || !this.playing || this.exporting || this.isReducedMotion()) {
      this.frame = null;
      return;
    }
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    this.elapsed += Math.min(64, Math.max(0, timestamp - this.lastTimestamp));
    this.timelineTimeMs = this.elapsed;
    this.lastTimestamp = timestamp;
    let hasActiveTarget = false;
    this.getTargets().forEach((target) => {
      if (!this.targetIsVisible(target)) {
        target.path.set('strokeDashOffset', 0);
        return;
      }
      hasActiveTarget = true;
      if (target.animation.type === 'moving-dashes') {
        target.path.set({
          strokeDashArray: [target.animation.dashLength, target.animation.dashGap],
          stroke: target.animation.flowColor,
          strokeDashOffset: (
            target.animation.direction === 'reverse'
            || target.animation.direction === 'reverse-once'
              ? 1
              : -1
          ) * this.timelineTimeMs * 0.045 * target.animation.speed,
          dirty: true,
        });
      } else {
        target.path.set({
          stroke: target.animation.baseColor,
          dirty: true,
        });
      }
    });
    if (hasActiveTarget) this.canvas.requestRenderAll();
    if (!hasActiveTarget) {
      this.frame = null;
      return;
    }
    this.frame = window.requestAnimationFrame((nextTimestamp) => this.updateFrame(nextTimestamp));
  }

  private ensureFrame() {
    if (
      this.frame !== null
      || !this.playing
      || this.exporting
      || this.destroyed
      || this.isReducedMotion()
    ) return;
    this.lastTimestamp = 0;
    this.frame = window.requestAnimationFrame((timestamp) => this.updateFrame(timestamp));
  }

  private configureContext(context: CanvasRenderingContext2D, animation: Required<DiagramConnectorAnimationConfig>) {
    context.globalAlpha = animation.opacity;
    context.fillStyle = animation.flowColor;
    context.strokeStyle = animation.flowColor;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (animation.glowEnabled) {
      context.shadowColor = animation.glowColor;
      context.shadowBlur = animation.glowStrength;
    }
  }

  private drawDot(context: CanvasRenderingContext2D, point: PathPoint, radius: number) {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }

  private drawArrowhead(
    context: CanvasRenderingContext2D,
    point: PathPoint,
    size: number,
    open: boolean,
  ) {
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    context.beginPath();
    context.moveTo(size * 0.58, 0);
    context.lineTo(-size * 0.48, -size * 0.42);
    context.lineTo(-size * 0.48, size * 0.42);
    if (open) {
      context.lineWidth = Math.max(1.5, size * 0.16);
      context.stroke();
    } else {
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  private drawFlowTrail(
    context: CanvasRenderingContext2D,
    target: AnimationTarget,
    progress: number,
  ) {
    const samples = 18;
    context.lineWidth = Math.max(2, target.config.width || 2) * 1.7;
    context.beginPath();
    let previousAmount = -1;
    for (let index = 0; index <= samples; index += 1) {
      const amount = modulo(progress - target.animation.trailLength + (index / samples) * target.animation.trailLength, 1);
      const point = target.geometry.pointAt(amount);
      if (index === 0 || amount < previousAmount) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
      previousAmount = amount;
    }
    context.stroke();
  }

  private drawConnectorSegment(
    context: CanvasRenderingContext2D,
    target: AnimationTarget,
    startAmount: number,
    endAmount: number,
    samples = 28,
  ) {
    const start = clamp01(Math.min(startAmount, endAmount));
    const end = clamp01(Math.max(startAmount, endAmount));
    if (end <= start) return;
    context.lineWidth = Math.max(2, target.config.width || 2);
    context.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const amount = start + ((end - start) * (index / samples));
      const point = target.geometry.pointAt(amount);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.stroke();
  }

  private drawMovingDashes(
    context: CanvasRenderingContext2D,
    target: AnimationTarget,
    timeMs: number,
  ) {
    context.save();
    context.setLineDash([target.animation.dashLength, target.animation.dashGap]);
    context.lineDashOffset = (
      target.animation.direction === 'reverse' || target.animation.direction === 'reverse-once'
        ? 1
        : -1
    ) * timeMs * 0.045 * target.animation.speed;
    this.drawConnectorSegment(context, target, 0, 1, 48);
    context.restore();
  }

  private drawEndpointPulse(
    context: CanvasRenderingContext2D,
    target: AnimationTarget,
    progress: number,
    timeMs: number,
  ) {
    const animation = target.animation;
    const phase = modulo(timeMs, animation.pulseDuration) / animation.pulseDuration;
    const radius = animation.particleSize * (1 + phase * (animation.pulseScale - 1));
    const originalAlpha = context.globalAlpha;
    context.globalAlpha = originalAlpha * (1 - phase);
    if (animation.sourcePulse && progress < 0.35) this.drawDot(context, target.geometry.pointAt(0), radius);
    if (animation.targetPulse && progress > 0.65) this.drawDot(context, target.geometry.pointAt(1), radius);
    context.globalAlpha = originalAlpha;
  }

  private drawTarget(context: CanvasRenderingContext2D, target: AnimationTarget, timeMs = this.elapsed) {
    if (!this.targetIsVisible(target)) return;
    const timing = this.getTiming(target.animation, timeMs);
    const animation = target.animation;
    if (!timing.active && !(animation.type === 'draw-in' && timing.progress === 1)) return;
    this.configureContext(context, animation);

    if (animation.type === 'draw-in') {
      this.drawConnectorSegment(context, target, 0, timing.progress);
      if (timing.progress >= 0.98) this.drawArrowhead(context, target.geometry.pointAt(1), animation.arrowheadSize, animation.arrowheadStyle === 'open-arrow');
    } else if (animation.type === 'moving-dashes') {
      this.drawMovingDashes(context, target, timeMs);
    } else if (animation.type === 'moving-dots') {
      for (let index = 0; index < animation.particleCount; index += 1) {
        const offset = Math.min(0.95, animation.dotSpacing / Math.max(1, target.geometry.length)) * index;
        const forwardAmount = modulo(timing.progress - offset, 1);
        const amount = animation.direction === 'bidirectional' && index % 2 === 1
          ? 1 - forwardAmount
          : forwardAmount;
        this.drawDot(context, target.geometry.pointAt(amount), animation.particleSize);
      }
    } else if (animation.type === 'travelling-pulse') {
      this.drawDot(context, target.geometry.pointAt(timing.progress), animation.pulseSize);
    } else if (animation.type === 'travelling-arrowhead') {
      const pointsBackward = (
        animation.direction === 'reverse'
        || animation.direction === 'reverse-once'
        || (animation.direction === 'alternating' && timing.cycleIndex % 2 === 1)
      );
      const point = target.geometry.pointAt(timing.progress);
      this.drawArrowhead(
        context,
        { ...point, angle: point.angle + (pointsBackward ? Math.PI : 0) },
        animation.arrowheadSize,
        animation.arrowheadStyle === 'open-arrow',
      );
    } else if (animation.type === 'flow-trail') {
      this.drawFlowTrail(context, target, timing.progress);
    }

    if (animation.direction === 'bidirectional' && animation.type !== 'moving-dots' && animation.type !== 'moving-dashes') {
      if (animation.type === 'travelling-arrowhead') {
        const point = target.geometry.pointAt(1 - timing.progress);
        this.drawArrowhead(
          context,
          { ...point, angle: point.angle + Math.PI },
          animation.arrowheadSize,
          animation.arrowheadStyle === 'open-arrow',
        );
      } else {
        this.drawDot(context, target.geometry.pointAt(1 - timing.progress), animation.pulseSize);
      }
    }
    this.drawEndpointPulse(context, target, timing.progress, timeMs);
  }

  private drawOverlay(timeMs = this.timelineTimeMs) {
    if (this.exporting || this.isReducedMotion()) return;
    const context = (this.canvas as fabric.Canvas & {
      contextContainer?: CanvasRenderingContext2D;
    }).contextContainer;
    if (!context) return;
    context.save();
    const viewport = this.canvas.viewportTransform || fabric.iMatrix;
    context.transform(
      viewport[0],
      viewport[1],
      viewport[2],
      viewport[3],
      viewport[4],
      viewport[5],
    );
    this.getTargets().forEach((target) => {
      context.save();
      this.drawTarget(context, target, timeMs);
      context.restore();
    });
    context.restore();
  }

  renderAtTimestamp(context: CanvasRenderingContext2D, timestampMs: number) {
    this.timelineTimeMs = Math.max(timestampMs, 0);
    this.elapsed = this.timelineTimeMs;
    this.playing = false;
    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    context.save();
    const viewport = (this.canvas as fabric.Canvas).viewportTransform || fabric.iMatrix;
    context.transform(
      viewport[0],
      viewport[1],
      viewport[2],
      viewport[3],
      viewport[4],
      viewport[5],
    );
    this.getTargets().forEach((target) => {
      context.save();
      this.drawTarget(context, target, this.timelineTimeMs);
      context.restore();
    });
    context.restore();
  }

  playAll() {
    this.playing = true;
    this.stopped.clear();
    this.ensureFrame();
    this.canvas.requestRenderAll();
  }

  pauseAll() {
    this.playing = false;
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTimestamp = 0;
    this.canvas.requestRenderAll();
  }

  restartAll() {
    this.elapsed = 0;
    this.timelineTimeMs = 0;
    this.stopped.clear();
    this.getTargets().forEach((target) => target.path.set('strokeDashOffset', 0));
    this.playAll();
  }

  previewSelected(object?: fabric.Object | null) {
    const id = object ? getTargetId(object) : '';
    if (id) this.stopped.delete(id);
    this.playing = true;
    this.ensureFrame();
    this.canvas.requestRenderAll();
  }

  stopSelected(object?: fabric.Object | null) {
    const id = object ? getTargetId(object) : '';
    if (!id) return;
    this.stopped.add(id);
    this.getTargets()
      .filter((target) => target.id === id)
      .forEach((target) => target.path.set('strokeDashOffset', 0));
    this.canvas.requestRenderAll();
  }

  setReducedMotion(value: boolean | null) {
    this.reducedMotionOverride = value;
    if (this.isReducedMotion() && this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
      this.getTargets().forEach((target) => target.path.set('strokeDashOffset', 0));
    } else {
      this.ensureFrame();
    }
    this.canvas.requestRenderAll();
  }

  isPlaying() {
    return this.playing;
  }

  isReduced() {
    return this.isReducedMotion();
  }

  beginStaticExport() {
    this.exporting = true;
    const offsets = this.getTargets().map((target) => ({
      path: target.path,
      offset: Number(target.path.strokeDashOffset || 0),
    }));
    offsets.forEach(({ path }) => path.set('strokeDashOffset', 0));
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.canvas.requestRenderAll();
    return () => {
      offsets.forEach(({ path, offset }) => path.set('strokeDashOffset', offset));
      this.exporting = false;
      this.ensureFrame();
      this.canvas.requestRenderAll();
    };
  }

  destroy() {
    this.destroyed = true;
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.canvas.off('after:render', this.afterRenderHandler);
    this.canvas.off('object:added', this.canvasMutationHandler);
    this.canvas.off('object:removed', this.canvasMutationHandler);
    this.canvas.off('object:modified', this.canvasMutationHandler);
    this.mediaQuery?.removeEventListener?.('change', this.motionChangeHandler);
    this.getTargets().forEach((target) => target.path.set('strokeDashOffset', 0));
  }
}

export function installConnectorAnimationManager(canvas: fabric.Canvas) {
  managerByCanvas.get(canvas)?.destroy();
  const manager = new ConnectorAnimationManager(canvas);
  managerByCanvas.set(canvas, manager);
  return () => {
    manager.destroy();
    managerByCanvas.delete(canvas);
  };
}

export function getConnectorAnimationManager(canvas: fabric.Canvas | null | undefined) {
  return canvas ? managerByCanvas.get(canvas) || null : null;
}

export function beginStaticConnectorExport(canvas: fabric.Canvas) {
  return managerByCanvas.get(canvas)?.beginStaticExport() || (() => undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure-function connector renderer — used during deterministic frame export.
// Does NOT rely on the WeakMap or create a ConnectorAnimationManager instance.
// Works on both fabric.Canvas and fabric.StaticCanvas.
// Every call is stateless and produces the same result for the same timestampMs.
// ─────────────────────────────────────────────────────────────────────────────

function getStaticTargets(canvas: fabric.StaticCanvas): AnimationTarget[] {
  const targets: AnimationTarget[] = [];

  // Attached connector paths (drawn with diagramConnectorConfig)
  try {
    const paths = getDiagramConnectorPaths(canvas as fabric.Canvas);
    for (const path of paths) {
      const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      if (!config?.animation) continue;
      const geometry = getDiagramConnectorGeometry(canvas as fabric.Canvas, path);
      if (!geometry) continue;
      targets.push({
        id: String(path.get('diagramConnectorId' as keyof fabric.Object) || path.get('id' as keyof fabric.Object) || ''),
        root: path,
        path: path as AnimatedPath,
        config,
        animation: normalizeConnectorAnimation(config.animation, config.color),
        geometry,
      });
    }
  } catch {
    // getDiagramConnectorPaths may throw on StaticCanvas
  }

  // Standalone arrow groups
  for (const object of canvas.getObjects()) {
    if (
      object.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramArrow' ||
      object.type !== 'group'
    ) continue;
    const config = object.get('diagramArrowConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
    if (!config?.animation) continue;
    const path = (object as fabric.Group).getObjects().find((child) => child.type === 'path') as AnimatedPath | undefined;
    if (!path) continue;
    const parsedPath = path.path as unknown[] | undefined;
    if (!parsedPath || parsedPath.length === 0) continue;
    const utils = fabric.util as FabricPathUtilities;
    let segments: Array<{ length: number }>;
    try {
      segments = utils.getPathSegmentsInfo(parsedPath);
    } catch {
      continue;
    }
    const totalLength = segments[segments.length - 1]?.length || 0;
    if (!totalLength) continue;
    const geometry: Geometry = {
      length: totalLength,
      pointAt: (amount: number): PathPoint => {
        const point = utils.getPointOnPath(parsedPath, clamp01(amount) * totalLength, segments);
        const offset = path.pathOffset || new fabric.Point(0, 0);
        const localPoint = new fabric.Point(point.x - offset.x, point.y - offset.y);
        const worldPoint = fabric.util.transformPoint(localPoint, path.calcTransformMatrix());
        const nearby = utils.getPointOnPath(parsedPath, clamp01(amount + 0.002) * totalLength, segments);
        const nearbyWorld = fabric.util.transformPoint(
          new fabric.Point(nearby.x - offset.x, nearby.y - offset.y),
          path.calcTransformMatrix(),
        );
        return {
          x: worldPoint.x,
          y: worldPoint.y,
          angle: Math.atan2(nearbyWorld.y - worldPoint.y, nearbyWorld.x - worldPoint.x),
        };
      },
    };
    targets.push({
      id: String(object.get('diagramConnectorId' as keyof fabric.Object) || object.get('id' as keyof fabric.Object) || ''),
      root: object,
      path,
      config,
      animation: normalizeConnectorAnimation(config.animation, config.color),
      geometry,
    });
  }

  return targets;
}

function evalConnectorTiming(
  animation: Required<DiagramConnectorAnimationConfig>,
  timestampMs: number,
): { active: boolean; progress: number; cycleIndex: number } {
  const duration = animation.duration / animation.speed;
  const start = animation.delay + animation.startDelay + animation.sequenceOrder * 250;
  const local = timestampMs - start;
  if (local < 0) return { active: false, progress: 0, cycleIndex: 0 };
  const oneShot = !animation.loop ||
    animation.direction === 'forward-once' ||
    animation.direction === 'reverse-once';
  if (oneShot && local > duration) {
    return { active: false, progress: animation.direction === 'reverse-once' ? 0 : 1, cycleIndex: 0 };
  }
  const cycleLength = duration + animation.repeatDelay;
  const cycleIndex = Math.floor(local / cycleLength);
  const cycleTime = modulo(local, cycleLength);
  if (cycleTime > duration) return { active: false, progress: 1, cycleIndex };
  const rawProgress = clamp01(cycleTime / duration);
  const progress = easeConnectorProgress(resolveProgress(rawProgress, animation.direction, cycleIndex), animation.easing);
  return { active: true, progress, cycleIndex };
}

function drawConnectorDot(ctx: CanvasRenderingContext2D, point: PathPoint, radius: number) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawConnectorArrowhead(ctx: CanvasRenderingContext2D, point: PathPoint, size: number, open: boolean) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(point.angle);
  ctx.beginPath();
  ctx.moveTo(size * 0.58, 0);
  ctx.lineTo(-size * 0.48, -size * 0.42);
  ctx.lineTo(-size * 0.48, size * 0.42);
  if (open) {
    ctx.lineWidth = Math.max(1.5, size * 0.16);
    ctx.stroke();
  } else {
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawConnectorFlowTrail(
  ctx: CanvasRenderingContext2D,
  target: AnimationTarget,
  progress: number,
) {
  const samples = 18;
  ctx.lineWidth = Math.max(2, target.config.width || 2) * 1.7;
  ctx.beginPath();
  let prevAmount = -1;
  for (let i = 0; i <= samples; i++) {
    const amount = modulo(
      progress - target.animation.trailLength + (i / samples) * target.animation.trailLength,
      1,
    );
    const point = target.geometry.pointAt(amount);
    if (i === 0 || amount < prevAmount) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
    prevAmount = amount;
  }
  ctx.stroke();
}

function drawConnectorSegment(
  ctx: CanvasRenderingContext2D,
  target: AnimationTarget,
  startAmount: number,
  endAmount: number,
  samples = 28,
) {
  const start = clamp01(Math.min(startAmount, endAmount));
  const end = clamp01(Math.max(startAmount, endAmount));
  if (end <= start) return;
  ctx.lineWidth = Math.max(2, target.config.width || 2);
  ctx.beginPath();
  for (let index = 0; index <= samples; index += 1) {
    const amount = start + ((end - start) * (index / samples));
    const point = target.geometry.pointAt(amount);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function drawConnectorMovingDashes(
  ctx: CanvasRenderingContext2D,
  target: AnimationTarget,
  timeMs: number,
) {
  ctx.save();
  ctx.setLineDash([target.animation.dashLength, target.animation.dashGap]);
  ctx.lineDashOffset = (
    target.animation.direction === 'reverse' || target.animation.direction === 'reverse-once'
      ? 1
      : -1
  ) * timeMs * 0.045 * target.animation.speed;
  drawConnectorSegment(ctx, target, 0, 1, 48);
  ctx.restore();
}

/**
 * Pure deterministic connector animation renderer.
 * Safe for both fabric.Canvas (live editor) and fabric.StaticCanvas (export offscreen canvas).
 * Does NOT create a ConnectorAnimationManager instance.
 * Produces identical output for the same (canvas, timestampMs) pair.
 */
export function renderConnectorAnimationsAtTime(
  context: CanvasRenderingContext2D,
  canvas: fabric.Canvas | fabric.StaticCanvas,
  timeMs: number,
): void {
  // For the live editor canvas, prefer the managed instance to avoid double-rendering
  const liveManager = managerByCanvas.get(canvas as fabric.Canvas);
  if (liveManager) {
    liveManager.renderAtTimestamp(context, timeMs);
    return;
  }

  // Export path: pure function over StaticCanvas objects
  const targets = getStaticTargets(canvas);
  if (targets.length === 0) return;

  const viewport = (canvas as fabric.Canvas).viewportTransform || fabric.iMatrix;
  context.save();
  context.transform(viewport[0], viewport[1], viewport[2], viewport[3], viewport[4], viewport[5]);

  for (const target of targets) {
    if (
      target.root.visible === false ||
      target.root.opacity === 0 ||
      !target.animation.enabled
    ) continue;

    const timing = evalConnectorTiming(target.animation, timeMs);
    const animation = target.animation;
    if (!timing.active && !(animation.type === 'draw-in' && timing.progress === 1)) continue;
    context.save();
    context.globalAlpha = animation.opacity;
    context.fillStyle = animation.flowColor;
    context.strokeStyle = animation.flowColor;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (animation.glowEnabled) {
      context.shadowColor = animation.glowColor;
      context.shadowBlur = animation.glowStrength;
    }

    if (animation.type === 'draw-in') {
      drawConnectorSegment(context, target, 0, timing.progress);
      if (timing.progress >= 0.98) drawConnectorArrowhead(context, target.geometry.pointAt(1), animation.arrowheadSize, animation.arrowheadStyle === 'open-arrow');
    } else if (animation.type === 'moving-dashes') {
      drawConnectorMovingDashes(context, target, timeMs);
    } else if (animation.type === 'moving-dots') {
      for (let i = 0; i < animation.particleCount; i++) {
        const offset = Math.min(0.95, animation.dotSpacing / Math.max(1, target.geometry.length)) * i;
        const forwardAmount = modulo(timing.progress - offset, 1);
        const amount = animation.direction === 'bidirectional' && i % 2 === 1
          ? 1 - forwardAmount
          : forwardAmount;
        drawConnectorDot(context, target.geometry.pointAt(amount), animation.particleSize);
      }
    } else if (animation.type === 'travelling-pulse') {
      drawConnectorDot(context, target.geometry.pointAt(timing.progress), animation.pulseSize);
    } else if (animation.type === 'travelling-arrowhead') {
      const pointsBackward = (
        animation.direction === 'reverse' ||
        animation.direction === 'reverse-once' ||
        (animation.direction === 'alternating' && timing.cycleIndex % 2 === 1)
      );
      const point = target.geometry.pointAt(timing.progress);
      drawConnectorArrowhead(
        context,
        { ...point, angle: point.angle + (pointsBackward ? Math.PI : 0) },
        animation.arrowheadSize,
        animation.arrowheadStyle === 'open-arrow',
      );
    } else if (animation.type === 'flow-trail') {
      drawConnectorFlowTrail(context, target, timing.progress);
    }

    if (animation.direction === 'bidirectional' &&
        animation.type !== 'moving-dots' &&
        animation.type !== 'moving-dashes') {
      if (animation.type === 'travelling-arrowhead') {
        const point = target.geometry.pointAt(1 - timing.progress);
        drawConnectorArrowhead(
          context,
          { ...point, angle: point.angle + Math.PI },
          animation.arrowheadSize,
          animation.arrowheadStyle === 'open-arrow',
        );
      } else {
        drawConnectorDot(context, target.geometry.pointAt(1 - timing.progress), animation.pulseSize);
      }
    }

    // Endpoint pulse — deterministic: use timeMs, not this.elapsed
    const pulseDuration = animation.pulseDuration || 1000;
    const pulsePhase = modulo(timeMs, pulseDuration) / pulseDuration;
    const pulseRadius = animation.particleSize * (1 + pulsePhase * ((animation.pulseScale || 2) - 1));
    const originalAlpha = context.globalAlpha;
    context.globalAlpha = originalAlpha * (1 - pulsePhase);
    if (animation.sourcePulse && timing.progress < 0.35) {
      drawConnectorDot(context, target.geometry.pointAt(0), pulseRadius);
    }
    if (animation.targetPulse && timing.progress > 0.65) {
      drawConnectorDot(context, target.geometry.pointAt(1), pulseRadius);
    }
    context.globalAlpha = originalAlpha;

    context.restore();
  }

  context.restore();
}
