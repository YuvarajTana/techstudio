import { fabric } from 'fabric';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/design';
import { calculatePosterVideoSceneLayout, validatePosterScene } from './posterVideoComposition';

export type MediaFitMode = 'smart-fit' | 'contain' | 'cover' | 'stretch' | 'original';
export type BackgroundFillMode = 'blur' | 'solid' | 'dominant' | 'gradient' | 'mirror';

export interface ImageFitInput {
  sourceWidth: number;
  sourceHeight: number;
  frameWidth?: number;
  frameHeight?: number;
  fitMode?: MediaFitMode;
}

export interface ImageFitResult {
  foreground: {
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
    scaleX: number;
    scaleY: number;
  };
  background: {
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
    scaleX: number;
    scaleY: number;
  };
}

export const calculateImageFit = ({
  sourceWidth,
  sourceHeight,
  frameWidth = DESIGN_WIDTH,
  frameHeight = DESIGN_HEIGHT,
  fitMode = 'contain',
}: ImageFitInput): ImageFitResult => {
  const srcW = Math.max(sourceWidth, 1);
  const srcH = Math.max(sourceHeight, 1);

  // Contain scale for foreground (preserves full image, no crop, no distortion)
  const containScale = Math.min(frameWidth / srcW, frameHeight / srcH);

  // Cover scale for background duplicate (fills entire 1080x1350 frame)
  const coverScale = Math.max(frameWidth / srcW, frameHeight / srcH);

  if (fitMode === 'stretch') {
    return {
      foreground: {
        width: srcW,
        height: srcH,
        left: frameWidth / 2,
        top: frameHeight / 2,
        scale: 1,
        scaleX: frameWidth / srcW,
        scaleY: frameHeight / srcH,
      },
      background: {
        width: srcW,
        height: srcH,
        left: frameWidth / 2,
        top: frameHeight / 2,
        scale: coverScale,
        scaleX: coverScale,
        scaleY: coverScale,
      },
    };
  }

  if (fitMode === 'cover') {
    return {
      foreground: {
        width: srcW,
        height: srcH,
        left: frameWidth / 2,
        top: frameHeight / 2,
        scale: coverScale,
        scaleX: coverScale,
        scaleY: coverScale,
      },
      background: {
        width: srcW,
        height: srcH,
        left: frameWidth / 2,
        top: frameHeight / 2,
        scale: coverScale,
        scaleX: coverScale,
        scaleY: coverScale,
      },
    };
  }

  if (fitMode === 'original') {
    return {
      foreground: {
        width: srcW,
        height: srcH,
        left: frameWidth / 2,
        top: frameHeight / 2,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
      },
      background: {
        width: srcW,
        height: srcH,
        left: frameWidth / 2,
        top: frameHeight / 2,
        scale: coverScale,
        scaleX: coverScale,
        scaleY: coverScale,
      },
    };
  }

  // Default: 'smart-fit' or 'contain'
  return {
    foreground: {
      width: srcW,
      height: srcH,
      left: frameWidth / 2,
      top: frameHeight / 2,
      scale: containScale,
      scaleX: containScale,
      scaleY: containScale,
    },
    background: {
      width: srcW,
      height: srcH,
      left: frameWidth / 2,
      top: frameHeight / 2,
      scale: coverScale,
      scaleX: coverScale,
      scaleY: coverScale,
    },
  };
};

export const getNaturalMediaDimensions = (object: fabric.Object): { width: number; height: number } => {
  if (object.type === 'image') {
    const img = object as fabric.Image;
    const element = img.getElement() as HTMLImageElement | HTMLVideoElement | undefined;
    if (element) {
      const width = (element as HTMLVideoElement).videoWidth || (element as HTMLImageElement).naturalWidth || img.width || DESIGN_WIDTH;
      const height = (element as HTMLVideoElement).videoHeight || (element as HTMLImageElement).naturalHeight || img.height || DESIGN_HEIGHT;
      return { width, height };
    }
  }
  return {
    width: object.width || DESIGN_WIDTH,
    height: object.height || DESIGN_HEIGHT,
  };
};

/** Extract average dominant color from an image element for background fill */
export const extractDominantColor = (imgElement: HTMLImageElement): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#1e1b4b';
    ctx.drawImage(imgElement, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return '#1e1b4b';
  }
};

/** Create or update Smart Fit layers on a Fabric Canvas */
export const createSmartFitImageLayers = async (
  canvas: fabric.Canvas,
  imgElement: HTMLImageElement,
  options: {
    id?: string;
    name?: string;
    assetId?: string;
    assetUrl?: string;
    sourceUrl?: string;
    fitMode?: MediaFitMode;
    backgroundMode?: BackgroundFillMode;
    blurAmount?: number;
    overlayOpacity?: number;
    backgroundColor?: string;
  } = {},
): Promise<{ foreground: fabric.Image; background: fabric.Object | null }> => {
  const frameW = canvas.getWidth() || DESIGN_WIDTH;
  const frameH = canvas.getHeight() || DESIGN_HEIGHT;
  const srcW = imgElement.naturalWidth || imgElement.width || DESIGN_WIDTH;
  const srcH = imgElement.naturalHeight || imgElement.height || DESIGN_HEIGHT;

  const pairId = options.id || `smartfit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const fitMode = options.fitMode || 'contain';
  const bgMode = options.backgroundMode || 'blur';
  const blurAmount = options.blurAmount ?? 40;
  const overlayOpacity = options.overlayOpacity ?? 0.15;
  const customBgColor = options.backgroundColor || extractDominantColor(imgElement);
  const posterVideoScene = calculatePosterVideoSceneLayout(
    options.sourceUrl || options.assetUrl || '',
    srcW,
    srcH,
    { id: pairId, backgroundMode: bgMode === 'solid' ? 'solid-color' : 'blurred-duplicate' },
  );

  const { foreground } = calculateImageFit({
    sourceWidth: srcW,
    sourceHeight: srcH,
    frameWidth: frameW,
    frameHeight: frameH,
    fitMode,
  });

  // Check if a background duplicate for this pairId already exists
  let bgObject: fabric.Object | null = null;
  const existingBg = canvas.getObjects().find(
    (obj) => (obj.get('smartFitPairId' as any) === pairId && obj.get('isSmartFitBackground' as any) === true),
  );
  if (existingBg) {
    canvas.remove(existingBg);
  }

  // Create background layer if using Smart Fit or if bgMode is active
  if (fitMode === 'smart-fit' || fitMode === 'contain' || bgMode !== 'solid') {
    if (bgMode === 'blur' || bgMode === 'mirror') {
      const bgImg = new fabric.Image(imgElement, {
        crossOrigin: 'anonymous',
        originX: 'center',
        originY: 'center',
        left: posterVideoScene.background.left,
        top: posterVideoScene.background.top,
        scaleX: posterVideoScene.background.scale * (bgMode === 'mirror' ? -1 : 1),
        scaleY: posterVideoScene.background.scale,
        selectable: false,
        evented: false,
        locked: true,
        isSmartFitBackground: true,
        smartFitPairId: pairId,
        excludeFromLayers: true,
        excludeFromExport: false,
      } as any);

      // Apply blur filter if supported
      if (bgMode === 'blur' && fabric.Image.filters?.Blur) {
        const filters = [new fabric.Image.filters.Blur({ blur: blurAmount / 100 })];
        if (fabric.Image.filters?.Brightness) {
          filters.push(new fabric.Image.filters.Brightness({ brightness: -0.15 }) as never);
        }
        bgImg.filters = filters;
        bgImg.applyFilters();
      }

      bgObject = bgImg;
    } else if (bgMode === 'dominant' || bgMode === 'solid') {
      bgObject = new fabric.Rect({
        originX: 'center',
        originY: 'center',
        left: frameW / 2,
        top: frameH / 2,
        width: frameW,
        height: frameH,
        fill: customBgColor,
        selectable: false,
        evented: false,
        locked: true,
        isSmartFitBackground: true,
        smartFitPairId: pairId,
        excludeFromLayers: true,
      } as any);
    } else if (bgMode === 'gradient') {
      const domColor = extractDominantColor(imgElement);
      bgObject = new fabric.Rect({
        originX: 'center',
        originY: 'center',
        left: frameW / 2,
        top: frameH / 2,
        width: frameW,
        height: frameH,
        fill: new fabric.Gradient({
          type: 'linear',
          gradientUnits: 'pixels',
          coords: { x1: 0, y1: 0, x2: frameW, y2: frameH },
          colorStops: [
            { offset: 0, color: domColor },
            { offset: 1, color: '#09090b' },
          ],
        }),
        selectable: false,
        evented: false,
        locked: true,
        isSmartFitBackground: true,
        smartFitPairId: pairId,
        excludeFromLayers: true,
      } as any);
    }

    if (bgObject) {
      canvas.add(bgObject);
      canvas.sendToBack(bgObject);
    }
  }

  // Create Foreground Image
  const fgImg = new fabric.Image(imgElement, {
    crossOrigin: 'anonymous',
    id: pairId,
    name: options.name || 'Page Image',
    displayName: options.name || 'Page Image',
    objectType: 'uploaded-image',
    assetId: options.assetId,
    assetUrl: options.assetUrl || options.sourceUrl,
    sourceUrl: options.sourceUrl || options.assetUrl,
    naturalWidth: srcW,
    naturalHeight: srcH,
    originX: fitMode === 'cover' || fitMode === 'original' ? 'center' : 'left',
    originY: fitMode === 'cover' || fitMode === 'original' ? 'center' : 'top',
    left: fitMode === 'cover' || fitMode === 'original' ? foreground.left : posterVideoScene.foreground.left,
    top: fitMode === 'cover' || fitMode === 'original' ? foreground.top : posterVideoScene.foreground.top,
    scaleX: fitMode === 'cover' || fitMode === 'original' ? foreground.scaleX : posterVideoScene.foreground.scale,
    scaleY: fitMode === 'cover' || fitMode === 'original' ? foreground.scaleY : posterVideoScene.foreground.scale,
    fitMode,
    backgroundMode: bgMode,
    blurAmount,
    overlayOpacity,
    backgroundColor: customBgColor,
    isSmartFitForeground: true,
    smartFitPairId: pairId,
    posterFitData: {
      scene: posterVideoScene,
      designWidth: frameW,
      designHeight: frameH,
      originalWidth: srcW,
      originalHeight: srcH,
      originalAspectRatio: srcW / srcH,
      fitMode,
      image: {
        src: options.sourceUrl || options.assetUrl || '',
        left: fitMode === 'cover' || fitMode === 'original' ? foreground.left : posterVideoScene.foreground.left,
        top: fitMode === 'cover' || fitMode === 'original' ? foreground.top : posterVideoScene.foreground.top,
        scaleX: fitMode === 'cover' || fitMode === 'original' ? foreground.scaleX : posterVideoScene.foreground.scale,
        scaleY: fitMode === 'cover' || fitMode === 'original' ? foreground.scaleY : posterVideoScene.foreground.scale,
        angle: 0,
      },
      background: bgObject ? {
        mode: bgMode === 'solid' || bgMode === 'dominant' || bgMode === 'gradient' ? 'solid' : 'blurred-duplicate',
        color: customBgColor,
        blur: bgMode === 'blur' ? blurAmount : undefined,
        brightness: 0.85,
      } : undefined,
    },
    staticExportSupported: true,
  } as Record<string, unknown>);

  canvas.add(fgImg);
  validatePosterScene(posterVideoScene);
  canvas.setActiveObject(fgImg);
  canvas.requestRenderAll();

  return { foreground: fgImg, background: bgObject };
};

/** Apply Media Fit Mode to a selected object on canvas */
export const applyMediaFitMode = (
  object: fabric.Object,
  canvas: fabric.Canvas,
  mode: MediaFitMode,
): void => {
  const canvasW = canvas.getWidth() || DESIGN_WIDTH;
  const canvasH = canvas.getHeight() || DESIGN_HEIGHT;
  const { width: srcW, height: srcH } = getNaturalMediaDimensions(object);

  const { foreground, background } = calculateImageFit({
    sourceWidth: srcW,
    sourceHeight: srcH,
    frameWidth: canvasW,
    frameHeight: canvasH,
    fitMode: mode,
  });

  object.set({
    originX: 'center',
    originY: 'center',
    left: foreground.left,
    top: foreground.top,
    scaleX: foreground.scaleX,
    scaleY: foreground.scaleY,
    angle: 0,
  });
  object.set('fitMode' as any, mode);

  // Sync background layer if exists
  const pairId = object.get('smartFitPairId' as any) || object.get('id' as any);
  const bgObj = canvas.getObjects().find(
    (o) => o.get('smartFitPairId' as any) === pairId && o.get('isSmartFitBackground' as any) === true,
  );

  if (bgObj) {
    if (mode === 'smart-fit' || mode === 'contain') {
      bgObj.set({
        originX: 'center',
        originY: 'center',
        left: background.left,
        top: background.top,
        scaleX: background.scaleX,
        scaleY: background.scaleY,
        visible: true,
      });
    } else {
      bgObj.set('visible', false);
    }
  }

  if ((mode === 'smart-fit' || mode === 'contain') && object.type === 'image') {
    const source = String(object.get('sourceUrl' as keyof fabric.Object) || object.get('assetUrl' as keyof fabric.Object) || '');
    const posterVideoScene = calculatePosterVideoSceneLayout(source, srcW, srcH, { backgroundMode: 'blurred-duplicate' });
    object.set({
      originX: 'left',
      originY: 'top',
      left: posterVideoScene.foreground.left,
      top: posterVideoScene.foreground.top,
      scaleX: posterVideoScene.foreground.scale,
      scaleY: posterVideoScene.foreground.scale,
      posterFitData: {
        scene: posterVideoScene,
        designWidth: canvasW,
        designHeight: canvasH,
        originalWidth: srcW,
        originalHeight: srcH,
        originalAspectRatio: srcW / srcH,
        fitMode: mode,
        image: {
          src: source,
          left: posterVideoScene.foreground.left,
          top: posterVideoScene.foreground.top,
          scaleX: posterVideoScene.foreground.scale,
          scaleY: posterVideoScene.foreground.scale,
          angle: 0,
        },
        background: {
          mode: 'blurred-duplicate',
          blur: posterVideoScene.background.blur,
          brightness: posterVideoScene.background.brightness,
        },
      },
    } as Record<string, unknown>);
  }

  object.setCoords();
  canvas.requestRenderAll();
};

export const centerObjectHorizontally = (object: fabric.Object, canvas: fabric.Canvas): void => {
  canvas.centerObjectH(object);
  object.setCoords();
  canvas.requestRenderAll();
};

export const centerObjectVertically = (object: fabric.Object, canvas: fabric.Canvas): void => {
  canvas.centerObjectV(object);
  object.setCoords();
  canvas.requestRenderAll();
};

export const resetObjectSize = (object: fabric.Object, canvas: fabric.Canvas): void => {
  const { width: srcW, height: srcH } = getNaturalMediaDimensions(object);
  const canvasW = canvas.getWidth() || DESIGN_WIDTH;
  const canvasH = canvas.getHeight() || DESIGN_HEIGHT;
  const scale = Math.min(canvasW / srcW, canvasH / srcH);
  object.set({
    originX: 'center',
    originY: 'center',
    left: canvasW / 2,
    top: canvasH / 2,
    scaleX: scale,
    scaleY: scale,
  });
  object.setCoords();
  canvas.requestRenderAll();
};

export const toggleLockAspectRatio = (object: fabric.Object, canvas: fabric.Canvas): boolean => {
  const current = Boolean(object.get('lockUniScaling' as any));
  const next = !current;
  object.set({
    lockUniScaling: next,
    imageLockedAspectRatio: next,
  } as Record<string, unknown>);
  object.setControlsVisibility?.({
    mt: !next,
    mb: !next,
    ml: !next,
    mr: !next,
    tl: true,
    tr: true,
    bl: true,
    br: true,
    mtr: true,
  });
  object.setCoords();
  canvas.requestRenderAll();
  return next;
};
