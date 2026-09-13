import { fabric } from 'fabric';
import type {
  EditorPage,
  FabricObjectAnimation,
  FabricObjectAnimationConfig,
  TimelineClip,
  TimelineKeyframe,
  TimelineProject,
  TimelineTransition,
} from '../types/timeline';
import { getPosterTrack, resolveSceneAtTime } from '../types/timeline';
import {
  evaluateKeyframeValue,
  evaluateObjectAnimationAtTime,
  evaluateSceneAtTime,
  evaluateTransitionAtTime,
  normalizeObjectAnimation,
} from './animationEvaluator';
import { preloadFontsFromCanvasJson } from './fontLoader';
import { DEFAULT_ASSET_FALLBACK_SVG, preloadImageAsset, resolveAssetUrl } from './assetUrlResolver';
import type { SceneTimelineRenderer } from './masterTimelineManager';
import { renderConnectorAnimationsAtTime } from './connectorAnimationManager';
import { removeStrayConnectorMarkers } from './posterLayoutTools';
import { VIDEO_COMPOSITION } from '../config/design';
import { calculatePosterVideoSceneLayout, validatePosterScene } from './posterVideoComposition';

const editorOnly = (object: fabric.Object) => (
  object.get('editorOnly' as keyof fabric.Object) === true
  || object.get('excludeFromExport' as keyof fabric.Object) === true
  || object.get('teckstudioObjectType' as keyof fabric.Object) === 'editorGuide'
);

export const isRenderableImageElement = (object: fabric.Object): boolean => {
  if (object.type !== 'image') return false;
  if (object.visible === false) return false;
  if (Number(object.opacity ?? 1) <= 0) return false;

  const role = String(object.get('role' as any) || object.get('objectType' as any) || '');
  if (role === 'ocr-hotspot' || role === 'thumbnail-helper' || role === 'editor-only' || role === 'debug') {
    return false;
  }

  if (
    object.get('editorOnly' as any) === true
    || object.get('excludeFromExport' as any) === true
    || object.get('teckstudioObjectType' as any) === 'editorGuide'
  ) {
    return false;
  }

  return true;
};

const parseDimensions = (data: string) => {
  try {
    const parsed = JSON.parse(data) as { width?: unknown; height?: unknown };
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    return {
      width: Number.isFinite(width) && width > 0 ? width : VIDEO_COMPOSITION.width,
      height: Number.isFinite(height) && height > 0 ? height : VIDEO_COMPOSITION.height,
    };
  } catch {
    return {
      width: VIDEO_COMPOSITION.width,
      height: VIDEO_COMPOSITION.height,
    };
  }
};

type BaseObjectState = {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  visible: boolean;
  text?: string;
  strokeDashArray?: number[];
  strokeDashOffset?: number;
};

const objectValue = (object: fabric.Object, key: string) => (
  object.get(key as keyof fabric.Object) as unknown
);

const readBaseAnimationState = (object: fabric.Object): Partial<BaseObjectState> | null => {
  const value = objectValue(object, 'baseAnimationState');
  return value && typeof value === 'object' ? value as Partial<BaseObjectState> : null;
};

const applyBackgroundFilters = (image: fabric.Image) => {
  const filters = [];
  if (fabric.Image.filters?.Blur) {
    filters.push(new fabric.Image.filters.Blur({ blur: 0.28 }));
  }
  if (fabric.Image.filters?.Brightness) {
    filters.push(new fabric.Image.filters.Brightness({ brightness: -0.15 }) as never);
  }
  image.filters = filters;
  if (filters.length) image.applyFilters();
};

const normalizePosterVideoObjects = (canvas: fabric.StaticCanvas) => {
  const objects = canvas.getObjects();
  objects
    .filter((object) => (
      object.type === 'image'
      && objectValue(object, 'isSmartFitForeground') === true
      && objectValue(object, 'isSmartFitBackground') !== true
    ))
    .forEach((object) => {
      const foreground = object as fabric.Image;
      const element = foreground.getElement() as HTMLImageElement | undefined;
      if (!element?.naturalWidth || !element.naturalHeight) return;
      const source = String(objectValue(foreground, 'sourceUrl') || objectValue(foreground, 'assetUrl') || '');
      const scene = calculatePosterVideoSceneLayout(source, element.naturalWidth, element.naturalHeight, {
        id: String(objectValue(foreground, 'smartFitPairId') || objectValue(foreground, 'id') || ''),
        backgroundMode: 'blurred-duplicate',
      });
      validatePosterScene(scene);
      foreground.set({
        width: scene.foreground.naturalWidth,
        height: scene.foreground.naturalHeight,
        originX: 'left',
        originY: 'top',
        left: scene.foreground.left,
        top: scene.foreground.top,
        scaleX: scene.foreground.scale,
        scaleY: scene.foreground.scale,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        cropX: 0,
        cropY: 0,
        posterFitData: {
          scene,
          designWidth: scene.composition.width,
          designHeight: scene.composition.height,
          originalWidth: scene.foreground.naturalWidth,
          originalHeight: scene.foreground.naturalHeight,
          originalAspectRatio: scene.foreground.naturalWidth / scene.foreground.naturalHeight,
          fitMode: 'contain',
          image: {
            src: source,
            left: scene.foreground.left,
            top: scene.foreground.top,
            scaleX: scene.foreground.scale,
            scaleY: scene.foreground.scale,
            angle: 0,
          },
          background: {
            mode: 'blurred-duplicate',
            blur: scene.background.blur,
            brightness: scene.background.brightness,
          },
        },
      } as Record<string, unknown>);

      const pairId = String(objectValue(foreground, 'smartFitPairId') || objectValue(foreground, 'id') || scene.id);
      let background = objects.find((candidate) => (
        objectValue(candidate, 'smartFitPairId') === pairId
        && objectValue(candidate, 'isSmartFitBackground') === true
        && candidate.type === 'image'
      )) as fabric.Image | undefined;

      if (!background) {
        background = new fabric.Image(element, {
          crossOrigin: 'anonymous',
          isSmartFitBackground: true,
          smartFitPairId: pairId,
          excludeFromLayers: true,
          excludeFromExport: false,
          locked: true,
          selectable: false,
          evented: false,
        } as Record<string, unknown>);
        canvas.add(background);
        canvas.sendToBack(background);
      }

      background.setElement(element);
      background.set({
        originX: 'center',
        originY: 'center',
        left: scene.background.left,
        top: scene.background.top,
        scaleX: scene.background.scale,
        scaleY: scene.background.scale,
        angle: 0,
        skewX: 0,
        skewY: 0,
        flipX: false,
        flipY: false,
        cropX: 0,
        cropY: 0,
        visible: true,
        selectable: false,
        evented: false,
        locked: true,
        excludeFromLayers: true,
        excludeFromExport: false,
      } as Record<string, unknown>);
      applyBackgroundFilters(background);
      canvas.sendToBack(background);
      foreground.setCoords();
      background.setCoords();
    });
};

class PreparedFabricScene {
  readonly canvas: fabric.StaticCanvas;
  readonly element: HTMLCanvasElement;
  private baseStates = new Map<fabric.Object, BaseObjectState>();

  constructor(canvas: fabric.StaticCanvas, element: HTMLCanvasElement) {
    this.canvas = canvas;
    this.element = element;
    canvas.getObjects().forEach((object) => {
      const animationConfig = objectValue(object, 'animationConfig') as FabricObjectAnimationConfig | undefined;
      const savedFullText = animationConfig?.fullText;
      const baseAnimationState = readBaseAnimationState(object);
      this.baseStates.set(object, {
        left: Number(baseAnimationState?.left ?? object.left ?? 0),
        top: Number(baseAnimationState?.top ?? object.top ?? 0),
        width: Number(baseAnimationState?.width ?? object.width ?? object.getScaledWidth?.() ?? 0),
        height: Number(baseAnimationState?.height ?? object.height ?? object.getScaledHeight?.() ?? 0),
        scaleX: Number(baseAnimationState?.scaleX ?? object.scaleX ?? 1),
        scaleY: Number(baseAnimationState?.scaleY ?? object.scaleY ?? 1),
        angle: Number(baseAnimationState?.angle ?? object.angle ?? 0),
        opacity: Number(baseAnimationState?.opacity ?? object.opacity ?? 1),
        visible: baseAnimationState?.visible ?? object.visible !== false,
        text: 'text' in object
          ? String(baseAnimationState?.text ?? objectValue(object, 'originalText') ?? savedFullText ?? (object as fabric.Text).text ?? '')
          : undefined,
        strokeDashArray: baseAnimationState?.strokeDashArray || (object.strokeDashArray ? [...object.strokeDashArray] : undefined),
        strokeDashOffset: Number(baseAnimationState?.strokeDashOffset ?? object.strokeDashOffset ?? 0),
      });
    });
  }

  renderAtTime(localTimeMs: number) {
    const localTimeSeconds = Math.max(localTimeMs, 0) / 1000;
    this.baseStates.forEach((base, object) => {
      object.set(base);
      const startSeconds = Number(objectValue(object, 'timelineStart') || 0);
      const endValue = objectValue(object, 'timelineEnd');
      const endSeconds = endValue === undefined ? Number.POSITIVE_INFINITY : Number(endValue);
      object.set('visible', base.visible && localTimeSeconds >= startSeconds && localTimeSeconds <= endSeconds);
      const keyframes = objectValue(object, 'timelineKeyframes') as TimelineKeyframe[] | undefined;
      this.applyDeterministicElementAnimations(
        object,
        base,
        localTimeMs - (startSeconds * 1000),
      );
      if (keyframes?.length) {
        const objectTimeSeconds = localTimeSeconds - startSeconds;
        const properties = Array.from(new Set(keyframes.map((keyframe) => keyframe.property)));
        properties.forEach((property) => {
          const value = evaluateKeyframeValue(
            keyframes.filter((keyframe) => keyframe.property === property),
            objectTimeSeconds,
          );
          if (value !== undefined) object.set(property as keyof fabric.Object, value as never);
        });
      }
      object.setCoords();
    });
    this.canvas.renderAll();
    const context = this.element.getContext('2d');
    if (context) {
      renderConnectorAnimationsAtTime(context, this.canvas, localTimeMs);
    }
    return this.element;
  }

  restore() {
    this.baseStates.forEach((base, object) => {
      object.set(base);
      object.setCoords();
    });
  }

  dispose() {
    this.baseStates.clear();
    this.canvas.dispose();
  }

  private applyDeterministicElementAnimations(
    object: fabric.Object,
    base: BaseObjectState,
    localTimeMs: number,
  ) {
    const objectId = String(objectValue(object, 'id') || '');
    const configuredAnimations = objectValue(object, 'objectAnimations') as FabricObjectAnimation[] | undefined;
    const legacyConfig = objectValue(object, 'animationConfig') as FabricObjectAnimationConfig | undefined;
    const animations = (
      configuredAnimations?.length ? configuredAnimations : [legacyConfig]
    ).flatMap((config) => {
      const normalized = normalizeObjectAnimation(config, objectId);
      return normalized ? [normalized] : [];
    });
    if (animations.length === 0) return;

    let opacity = base.opacity;
    let left = base.left;
    let top = base.top;
    let scaleX = base.scaleX;
    let scaleY = base.scaleY;
    let angle = base.angle;
    let visibleTextLength: number | undefined;
    let textValue: string | undefined;
    let strokeProgress: number | undefined;
    let strokeDashOffset: number | undefined;
    let widthFactor: number | undefined;
    let heightFactor: number | undefined;

    animations.forEach((animation) => {
      const evaluation = evaluateObjectAnimationAtTime({
        animation,
        localTimeMs,
        width: this.canvas.getWidth(),
        height: this.canvas.getHeight(),
        textLength: base.text?.length || 0,
        objectWidth: base.width * base.scaleX,
        objectHeight: base.height * base.scaleY,
      });
      opacity *= evaluation.opacity;
      left += evaluation.translateX;
      top += evaluation.translateY;
      scaleX *= evaluation.scaleX;
      scaleY *= evaluation.scaleY;
      angle += evaluation.rotation;
      if (evaluation.visibleTextLength !== undefined) {
        const nextVisibleTextLength = (() => {
          if (!base.text) return evaluation.visibleTextLength;
          if (animation.type === 'line-reveal' || animation.type === 'code-line-reveal') {
            return base.text
              .split('\n')
              .slice(0, Math.ceil(base.text.split('\n').length * evaluation.progress))
              .join('\n')
              .length;
          }
          if (animation.type === 'word-reveal') {
            return base.text
              .split(/(\s+)/)
              .slice(0, Math.ceil(base.text.split(/(\s+)/).length * evaluation.progress))
              .join('')
              .length;
          }
          return evaluation.visibleTextLength;
        })();
        visibleTextLength = visibleTextLength === undefined
          ? nextVisibleTextLength
          : Math.min(visibleTextLength, nextVisibleTextLength);
      }
      if (evaluation.strokeProgress !== undefined) strokeProgress = evaluation.strokeProgress;
      if (evaluation.strokeDashOffset !== undefined) strokeDashOffset = evaluation.strokeDashOffset;
      if (evaluation.widthFactor !== undefined) widthFactor = evaluation.widthFactor;
      if (evaluation.heightFactor !== undefined) heightFactor = evaluation.heightFactor;
      if (evaluation.textValue !== undefined) textValue = evaluation.textValue;
    });

    const dimensionPatch: Record<string, unknown> = {};
    if (widthFactor !== undefined && object.width !== undefined) {
      dimensionPatch.width = Math.max(base.width * widthFactor, 0.001);
      dimensionPatch.scaleX = base.scaleX;
    }
    if (heightFactor !== undefined && object.height !== undefined) {
      dimensionPatch.height = Math.max(base.height * heightFactor, 0.001);
      dimensionPatch.scaleY = base.scaleY;
    }
    object.set({ opacity, left, top, scaleX, scaleY, angle, ...dimensionPatch });
    if (base.text !== undefined && textValue !== undefined) {
      (object as fabric.Text).set('text', textValue);
    } else if (base.text !== undefined && visibleTextLength !== undefined) {
      (object as fabric.Text).set('text', base.text.slice(0, visibleTextLength));
    }
    if (strokeProgress !== undefined) {
      const applyStrokeProgress = (target: fabric.Object) => {
        if (target.type === 'line' || target.type === 'path' || target.type === 'circle' || target.type === 'rect') {
          target.set('strokeDashArray', [Math.max(strokeProgress! * 1000, 0.001), 1000] as never);
        }
      };
      if (object.type === 'group') (object as fabric.Group).forEachObject(applyStrokeProgress);
      else applyStrokeProgress(object);
    }
    if (strokeDashOffset !== undefined) {
      const applyDashFlow = (target: fabric.Object) => {
        if (target.type === 'line' || target.type === 'path') {
          target.set({
            strokeDashArray: target.strokeDashArray?.length ? target.strokeDashArray : [16, 12],
            strokeDashOffset,
          } as Record<string, unknown>);
        }
      };
      if (object.type === 'group') (object as fabric.Group).forEachObject(applyDashFlow);
      else applyDashFlow(object);
    }
  }
}

const prepareFabricScene = async (page: EditorPage) => {
  if (!page.data) throw new Error(`${page.name} has no saved canvas data.`);
  await preloadFontsFromCanvasJson(page.data);
  if ('fonts' in document) await document.fonts.ready;
  const dimensions = parseDimensions(page.data);
  const element = document.createElement('canvas');
  const staticCanvas = new fabric.StaticCanvas(element, {
    width: dimensions.width,
    height: dimensions.height,
    enableRetinaScaling: false,
    renderOnAddRemove: false,
  });
  await new Promise<void>((resolve, reject) => {
    try {
      staticCanvas.loadFromJSON(page.data, () => resolve());
    } catch (error) {
      reject(error);
    }
  });

  staticCanvas.getObjects().filter(editorOnly).forEach((object) => staticCanvas.remove(object));
  removeStrayConnectorMarkers(staticCanvas as unknown as fabric.Canvas);
  staticCanvas.getObjects().forEach((object, index) => {
    if (!objectValue(object, 'id')) {
      object.set('id' as keyof fabric.Object, `${page.id}-object-${index + 1}` as never);
    }
  });

  // Asynchronously preload and decode all renderable image objects on this page
  const imageObjects = staticCanvas.getObjects().filter(isRenderableImageElement) as fabric.Image[];
  await Promise.all(
    imageObjects.map(async (imgObj) => {
      const primaryUrl = (imgObj.get('sourceUrl' as any) || imgObj.get('assetUrl' as any) || (imgObj as any).src || '') as string;
      const resolvedUrl = resolveAssetUrl(primaryUrl);
      if (resolvedUrl) {
        try {
          const loadedImg = await preloadImageAsset(resolvedUrl);
          imgObj.setElement(loadedImg);
          if (imgObj.filters?.length) {
            imgObj.applyFilters();
          }
        } catch (err) {
          console.warn(`[TECKSTUDIO Preloader] Failed loading image for page ${page.name}, object ${imgObj.get('id' as any)} (${resolvedUrl}). Using fallback SVG.`, err);
          try {
            const fallbackImg = await preloadImageAsset(DEFAULT_ASSET_FALLBACK_SVG);
            imgObj.setElement(fallbackImg);
          } catch {
            // Non-fatal
          }
        }
      }
    })
  );

  normalizePosterVideoObjects(staticCanvas);

  staticCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  staticCanvas.renderAll();

  const missingImage = staticCanvas.getObjects().filter(isRenderableImageElement).find((object) => {
    const imageElement = (object as fabric.Image).getElement() as HTMLImageElement;
    return !imageElement || !imageElement.complete || imageElement.naturalWidth === 0;
  });

  if (missingImage) {
    const failedId = (missingImage.get('id' as any) || 'unknown') as string;
    const failedUrl = (missingImage.get('sourceUrl' as any) || missingImage.get('assetUrl' as any) || (missingImage as any).src || '') as string;
    console.warn(`[TECKSTUDIO Preloader] Non-fatal un-decoded image on ${page.name} (Element: ${failedId}, URL: ${failedUrl}).`);
  }

  return new PreparedFabricScene(staticCanvas, element);
};

export const renderPageToCanvas = async (page: EditorPage) => {
  const scene = await prepareFabricScene(page);
  const dimensions = parseDimensions(page.data);
  const output = document.createElement('canvas');
  output.width = dimensions.width;
  output.height = dimensions.height;
  const context = output.getContext('2d');
  if (!context) {
    scene.dispose();
    throw new Error('Canvas rendering is unavailable.');
  }
  context.drawImage(scene.renderAtTime(0), 0, 0, output.width, output.height);
  scene.restore();
  scene.dispose();
  return output;
};

type SceneTransform = ReturnType<typeof evaluateSceneAtTime>;

const sceneSourceSize = (scene: CanvasImageSource, fallbackWidth: number, fallbackHeight: number) => {
  const maybeSizedScene = scene as { width?: number; height?: number; videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number };
  const width = Number(maybeSizedScene.videoWidth || maybeSizedScene.naturalWidth || maybeSizedScene.width || fallbackWidth);
  const height = Number(maybeSizedScene.videoHeight || maybeSizedScene.naturalHeight || maybeSizedScene.height || fallbackHeight);
  return {
    width: Number.isFinite(width) && width > 0 ? width : fallbackWidth,
    height: Number.isFinite(height) && height > 0 ? height : fallbackHeight,
  };
};

const drawScene = (
  context: CanvasRenderingContext2D,
  scene: CanvasImageSource,
  transform: SceneTransform,
  width: number,
  height: number,
  clip?: { x: number; y: number; width: number; height: number },
) => {
  context.save();
  if (clip) {
    context.beginPath();
    context.rect(clip.x, clip.y, clip.width, clip.height);
    context.clip();
  }
  context.globalAlpha = transform.opacity;
  context.translate((width / 2) + transform.translateX, (height / 2) + transform.translateY);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.scale(transform.scaleX, transform.scaleY);
  const source = sceneSourceSize(scene, width, height);
  const containScale = Math.min(width / source.width, height / source.height);
  const drawWidth = source.width * containScale;
  const drawHeight = source.height * containScale;
  context.drawImage(scene, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
};

export class PosterSceneRenderer implements SceneTimelineRenderer {
  private cache = new Map<string, PreparedFabricScene>();
  private output: HTMLCanvasElement;
  private getState: () => {
    pages: EditorPage[];
    timeline: TimelineProject;
    width: number;
    height: number;
  };

  constructor(
    output: HTMLCanvasElement,
    getState: () => {
      pages: EditorPage[];
      timeline: TimelineProject;
      width: number;
      height: number;
    },
  ) {
    this.output = output;
    this.getState = getState;
  }

  async prepare() {
    const { pages, timeline } = this.getState();
    const pageIds = new Set(getPosterTrack(timeline).clips.map((clip) => clip.pageId));
    await Promise.all(pages.filter((page) => pageIds.has(page.id)).map(async (page) => {
      const cacheKey = `${page.id}:${page.updatedAt || page.data.length}`;
      if (this.cache.has(cacheKey)) return;
      const scene = await prepareFabricScene(page);
      Array.from(this.cache.entries())
        .filter(([key]) => key.startsWith(`${page.id}:`))
        .forEach(([key, staleScene]) => {
          staleScene.dispose();
          this.cache.delete(key);
        });
      this.cache.set(cacheKey, scene);
    }));
  }

  render(timeMs: number) {
    const { pages, timeline, width, height } = this.getState();
    if (this.output.width !== width) this.output.width = width;
    if (this.output.height !== height) this.output.height = height;
    const context = this.output.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#000000';
    context.fillRect(0, 0, width, height);
    const clips = getPosterTrack(timeline).clips.filter((clip) => clip.visible);
    const getScene = (clip: TimelineClip) => {
      const page = pages.find((candidate) => candidate.id === clip.pageId);
      if (!page) return null;
      return this.cache.get(`${page.id}:${page.updatedAt || page.data.length}`) || null;
    };
    const activeTransition = evaluateTransitionAtTime(timeline, clips, timeMs);
    if (activeTransition) {
      this.drawTransition(
        context,
        activeTransition.transition,
        activeTransition.fromClip,
        activeTransition.toClip,
        activeTransition.progress,
        getScene,
        width,
        height,
        timeMs,
      );
      return;
    }
    const resolvedScene = resolveSceneAtTime(timeline, timeMs);
    const clip = resolvedScene.activeScene;
    if (!clip) return;
    const scene = getScene(clip);
    if (!scene) return;
    const sceneCanvas = scene.renderAtTime(resolvedScene.sceneLocalTimeMs);
    drawScene(
      context,
      sceneCanvas,
      evaluateSceneAtTime({ clip, globalTimeMs: timeMs, width, height }),
      width,
      height,
    );
    scene.restore();
  }

  clear() {
    const context = this.output.getContext('2d');
    context?.clearRect(0, 0, this.output.width, this.output.height);
  }

  dispose() {
    this.cache.forEach((scene) => scene.dispose());
    this.cache.clear();
    this.clear();
  }

  private drawTransition(
    context: CanvasRenderingContext2D,
    transition: TimelineTransition,
    fromClip: TimelineClip,
    toClip: TimelineClip,
    progress: number,
    getScene: (clip: TimelineClip) => PreparedFabricScene | null,
    width: number,
    height: number,
    timeMs: number,
  ) {
    const fromScene = getScene(fromClip);
    const toScene = getScene(toClip);
    if (!fromScene || !toScene) return;
    const fromCanvas = fromScene.renderAtTime(timeMs - fromClip.startMs);
    const toCanvas = toScene.renderAtTime(timeMs - toClip.startMs);
    const fromTransform = evaluateSceneAtTime({ clip: fromClip, globalTimeMs: timeMs, width, height });
    const toTransform = evaluateSceneAtTime({ clip: toClip, globalTimeMs: timeMs, width, height });
    const opaqueFrom = { ...fromTransform, opacity: 1 };
    const opaqueTo = { ...toTransform, opacity: 1 };

    if (transition.type === 'fade' || transition.type === 'crossfade') {
      drawScene(context, fromCanvas, { ...opaqueFrom, opacity: 1 - progress }, width, height);
      drawScene(context, toCanvas, { ...opaqueTo, opacity: progress }, width, height);
    } else if (transition.type === 'slide-left' || transition.type === 'slide-right') {
      const direction = transition.type === 'slide-left' ? -1 : 1;
      drawScene(context, fromCanvas, { ...opaqueFrom, translateX: direction * width * progress }, width, height);
      drawScene(context, toCanvas, { ...opaqueTo, translateX: -direction * width * (1 - progress) }, width, height);
    } else if (transition.type === 'slide-up' || transition.type === 'slide-down') {
      const direction = transition.type === 'slide-up' ? -1 : 1;
      drawScene(context, fromCanvas, { ...opaqueFrom, translateY: direction * height * progress }, width, height);
      drawScene(context, toCanvas, { ...opaqueTo, translateY: -direction * height * (1 - progress) }, width, height);
    } else if (transition.type === 'zoom') {
      drawScene(context, fromCanvas, { ...opaqueFrom, opacity: 1 - progress, scaleX: 1 + (0.12 * progress), scaleY: 1 + (0.12 * progress) }, width, height);
      drawScene(context, toCanvas, { ...opaqueTo, opacity: progress, scaleX: 0.88 + (0.12 * progress), scaleY: 0.88 + (0.12 * progress) }, width, height);
    } else if (transition.type === 'wipe-left' || transition.type === 'wipe-right') {
      drawScene(context, fromCanvas, opaqueFrom, width, height);
      const wipeWidth = width * progress;
      const clip = transition.type === 'wipe-left'
        ? { x: width - wipeWidth, y: 0, width: wipeWidth, height }
        : { x: 0, y: 0, width: wipeWidth, height };
      drawScene(context, toCanvas, opaqueTo, width, height, clip);
    } else {
      drawScene(context, progress < 1 ? fromCanvas : toCanvas, progress < 1 ? opaqueFrom : opaqueTo, width, height);
    }
    fromScene.restore();
    toScene.restore();
  }
}

export const canvasToPngBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  try {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The poster frame could not be converted to PNG.'));
    }, 'image/png');
  } catch {
    reject(new Error('A cross-origin image prevents video export. Re-upload that asset through TECKSTUDIO.'));
  }
});
