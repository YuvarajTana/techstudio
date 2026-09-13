import { fabric } from 'fabric';
import type { UploadedImageAsset } from '../types/uploads';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/design';
import { DEFAULT_IMAGE_EFFECTS, applyImageEffectConfig } from './imageEffects';
import { calculateImageFit, createSmartFitImageLayers } from './mediaFittingUtils';
import { calculatePosterVideoSceneLayout } from './posterVideoComposition';

const createObjectId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
);

const loadImageElement = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const element = new Image();
  element.crossOrigin = 'anonymous';
  element.decoding = 'async';
  element.onload = () => resolve(element);
  element.onerror = () => reject(new Error('The uploaded image is missing or could not be loaded.'));
  element.src = source;
});

const getImageDimensions = (element: HTMLImageElement, asset?: UploadedImageAsset) => ({
  width: element.naturalWidth || element.width || asset?.width || 1,
  height: element.naturalHeight || element.height || asset?.height || 1,
});

const applyProfessionalImageControls = (image: fabric.Image) => {
  image.set({
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    lockUniScaling: true,
    imageLockedAspectRatio: true,
    centeredRotation: true,
    transparentCorners: false,
    cornerStyle: 'circle',
    cornerColor: '#8b5cf6',
    cornerStrokeColor: '#ffffff',
    borderColor: '#8b5cf6',
    cornerSize: 10,
    touchCornerSize: 28,
    padding: 6,
  } as Record<string, unknown>);
  image.setControlsVisibility({
    mt: false,
    mb: false,
    ml: false,
    mr: false,
    tl: true,
    tr: true,
    bl: true,
    br: true,
    mtr: true,
  });
};

const createImageMetadata = (
  asset: UploadedImageAsset,
  element: HTMLImageElement,
  fitMode = 'contain',
) => {
  const { width, height } = getImageDimensions(element, asset);
  const posterVideoScene = calculatePosterVideoSceneLayout(asset.url, width, height, {
    backgroundMode: fitMode === 'smart-fit' || fitMode === 'contain' ? 'blurred-duplicate' : 'solid-color',
  });
  return {
    id: createObjectId('uploaded-image'),
    name: asset.filename,
    displayName: asset.filename,
    objectType: 'uploaded-image',
    assetId: asset.id,
    assetUrl: asset.url,
    sourceUrl: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    originalWidth: width,
    originalHeight: height,
    naturalWidth: width,
    naturalHeight: height,
    mediaMimeType: asset.mimeType,
    uploadMetadata: asset.metadata,
    imageEffectConfig: { ...DEFAULT_IMAGE_EFFECTS },
    filtersConfig: { ...DEFAULT_IMAGE_EFFECTS },
    cropConfig: null,
    originalCropState: null,
    imageCornerRadius: 0,
    fitMode,
    posterFitData: {
      scene: posterVideoScene,
      designWidth: DESIGN_WIDTH,
      designHeight: DESIGN_HEIGHT,
      originalWidth: width,
      originalHeight: height,
      originalAspectRatio: width / height,
      fitMode,
      image: {
        src: asset.url,
        left: posterVideoScene.foreground.left,
        top: posterVideoScene.foreground.top,
        scaleX: posterVideoScene.foreground.scale,
        scaleY: posterVideoScene.foreground.scale,
        angle: 0,
      },
      background: fitMode === 'smart-fit' || fitMode === 'contain' ? {
        mode: 'blurred-duplicate',
        blur: posterVideoScene.background.blur,
        brightness: posterVideoScene.background.brightness,
      } : undefined,
    },
    staticExportSupported: true,
  };
};

export function addUploadedImageToCanvas(
  canvas: fabric.Canvas,
  asset: UploadedImageAsset,
  pointer?: { x: number; y: number },
  isPageImage = true,
) {
  return loadImageElement(asset.url).then(async (element) => {
    if (!element.naturalWidth || !element.naturalHeight) {
      throw new Error('The uploaded image could not be decoded.');
    }

    if (isPageImage) {
      const { foreground } = await createSmartFitImageLayers(canvas, element, {
        name: asset.filename,
        assetId: asset.id,
        assetUrl: asset.url,
        sourceUrl: asset.url,
        fitMode: 'contain',
        backgroundMode: 'blur',
        blurAmount: 40,
        overlayOpacity: 0.15,
      });

      foreground.set({
        ...createImageMetadata(asset, element, 'contain'),
        id: foreground.get('id' as keyof fabric.Image),
        thumbnailUrl: asset.thumbnailUrl,
        mediaMimeType: asset.mimeType,
        uploadMetadata: asset.metadata,
      } as Record<string, unknown>);
      foreground.set({
        posterFitData: {
          ...(foreground.get('posterFitData' as keyof fabric.Image) as Record<string, unknown> || {}),
          image: {
            src: asset.url,
            left: foreground.left || 0,
            top: foreground.top || 0,
            scaleX: foreground.scaleX || 1,
            scaleY: foreground.scaleY || 1,
            angle: foreground.angle || 0,
          },
        },
      } as Record<string, unknown>);
      applyProfessionalImageControls(foreground);

      return foreground;
    }

    // Floating Image fallback
    const image = new fabric.Image(element, { crossOrigin: 'anonymous' });
    const { width, height } = getImageDimensions(element, asset);
    const maxWidth = canvas.getWidth();
    const maxHeight = canvas.getHeight();
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    image.set({
      ...createImageMetadata(asset, element),
      left: pointer?.x ?? canvas.getWidth() / 2,
      top: pointer?.y ?? canvas.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
    } as Record<string, unknown>);
    applyProfessionalImageControls(image);

    canvas.add(image);
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
    return image;
  });
}

export function replaceFabricImageAsset(image: fabric.Image, asset: UploadedImageAsset) {
  return loadImageElement(asset.url).then((element) => {
    const canvas = image.canvas;
    const previousBounds = image.getBoundingRect(true, true);
    const previousScaleX = image.scaleX || 1;
    const previousScaleY = image.scaleY || 1;
    const preserveUniformScale = Boolean(image.get('lockUniScaling' as keyof fabric.Image));
    const previousState = {
      left: image.left,
      top: image.top,
      angle: image.angle || 0,
      flipX: image.flipX || false,
      flipY: image.flipY || false,
      opacity: image.opacity ?? 1,
      shadow: image.shadow,
      stroke: image.stroke,
      strokeWidth: image.strokeWidth,
      imageCornerRadius: image.get('imageCornerRadius' as keyof fabric.Image),
      imageEffectConfig: image.get('imageEffectConfig' as keyof fabric.Image),
      filtersConfig: image.get('filtersConfig' as keyof fabric.Image),
    };
    image.setElement(element);
    const srcW = element.naturalWidth || element.width || DESIGN_WIDTH;
    const srcH = element.naturalHeight || element.height || DESIGN_HEIGHT;
    const fitMode = (image.get('fitMode' as any) as any) || 'smart-fit';
    const nextScale = preserveUniformScale
      ? Math.min(previousBounds.width / srcW, previousBounds.height / srcH)
      : 1;

    const { background } = calculateImageFit({
      sourceWidth: srcW,
      sourceHeight: srcH,
      frameWidth: canvas ? canvas.getWidth() : DESIGN_WIDTH,
      frameHeight: canvas ? canvas.getHeight() : DESIGN_HEIGHT,
      fitMode,
    });

    image.set({
      ...previousState,
      naturalWidth: srcW,
      naturalHeight: srcH,
      originalWidth: srcW,
      originalHeight: srcH,
      originX: 'center',
      originY: 'center',
      width: srcW,
      height: srcH,
      scaleX: preserveUniformScale ? nextScale : previousScaleX,
      scaleY: preserveUniformScale ? nextScale : previousScaleY,
      assetId: asset.id,
      assetUrl: asset.url,
      sourceUrl: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      mediaMimeType: asset.mimeType,
      uploadMetadata: asset.metadata,
      cropX: 0,
      cropY: 0,
      cropConfig: null,
      originalCropState: null,
      name: asset.filename,
      displayName: asset.filename,
    } as Record<string, unknown>);
    const radius = Number(previousState.imageCornerRadius || 0);
    image.set({
      clipPath: radius > 0 ? new fabric.Rect({
        width: srcW,
        height: srcH,
        rx: radius,
        ry: radius,
        originX: 'center',
        originY: 'center',
      }) : undefined,
    } as Record<string, unknown>);
    applyProfessionalImageControls(image);
    const savedEffects = (previousState.imageEffectConfig || previousState.filtersConfig) as Record<string, unknown> | undefined;
    if (savedEffects) applyImageEffectConfig(image, savedEffects);

    // Update linked background layer if present
    const pairId = image.get('smartFitPairId' as any) || image.get('id' as any);
    if (canvas && pairId) {
      const bgObj = canvas.getObjects().find(
        (o) => o.get('smartFitPairId' as any) === pairId && o.get('isSmartFitBackground' as any) === true,
      );
      if (bgObj && bgObj.type === 'image') {
        (bgObj as fabric.Image).setElement(element);
        bgObj.set({
          originX: 'center',
          originY: 'center',
          left: background.left,
          top: background.top,
          scaleX: background.scaleX,
          scaleY: background.scaleY,
        });
        bgObj.setCoords();
      }
    }

    image.setCoords();
    if (canvas) canvas.requestRenderAll();
  });
}

export function resetUploadedImageObject(image: fabric.Image, canvas?: fabric.Canvas | null) {
  const targetCanvas = canvas || image.canvas;
  const sourceWidth = Number(image.get('naturalWidth' as keyof fabric.Image) || image.get('originalWidth' as keyof fabric.Image) || image.width || 1);
  const sourceHeight = Number(image.get('naturalHeight' as keyof fabric.Image) || image.get('originalHeight' as keyof fabric.Image) || image.height || 1);
  const canvasWidth = targetCanvas?.getWidth() || sourceWidth;
  const canvasHeight = targetCanvas?.getHeight() || sourceHeight;
  const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight, 1);

  image.filters = [];
  image.set({
    width: sourceWidth,
    height: sourceHeight,
    cropX: 0,
    cropY: 0,
    cropConfig: null,
    originalCropState: null,
    imageCornerRadius: 0,
    imageEffectConfig: { ...DEFAULT_IMAGE_EFFECTS },
    filtersConfig: { ...DEFAULT_IMAGE_EFFECTS },
    opacity: 1,
    flipX: false,
    flipY: false,
    angle: 0,
    shadow: undefined,
    stroke: undefined,
    strokeWidth: 0,
    scaleX: scale,
    scaleY: scale,
    originX: 'center',
    originY: 'center',
    left: canvasWidth / 2,
    top: canvasHeight / 2,
  } as Record<string, unknown>);
  applyProfessionalImageControls(image);
  image.applyFilters();
  image.setCoords();
  targetCanvas?.setActiveObject(image);
  targetCanvas?.requestRenderAll();
}
