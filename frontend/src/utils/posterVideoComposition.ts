import { VIDEO_COMPOSITION } from '../config/design';

export type PosterVideoBackgroundMode = 'blurred-duplicate' | 'solid-color';

export type PosterVideoScene = {
  id: string;
  composition: {
    width: 1080;
    height: 1350;
    fps: 30;
  };
  foreground: {
    source: string;
    naturalWidth: number;
    naturalHeight: number;
    scale: number;
    left: number;
    top: number;
    renderedWidth: number;
    renderedHeight: number;
  };
  background: {
    source: string;
    mode: PosterVideoBackgroundMode;
    scale: number;
    left: number;
    top: number;
    blur: number;
    brightness: number;
  };
  duration: number;
};

export type PosterVideoCompositionOptions = {
  id?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  backgroundMode?: PosterVideoBackgroundMode;
};

const createSceneId = () => (
  window.crypto?.randomUUID
    ? `poster-scene-${window.crypto.randomUUID()}`
    : `poster-scene-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export async function loadOriginalImage(source: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = source;
  await image.decode();

  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('Invalid poster dimensions');
  }

  return image;
}

export function calculatePosterVideoSceneLayout(
  imageSource: string,
  naturalWidth: number,
  naturalHeight: number,
  options: PosterVideoCompositionOptions = {},
): PosterVideoScene {
  const frameWidth = VIDEO_COMPOSITION.width;
  const frameHeight = VIDEO_COMPOSITION.height;
  const sourceWidth = Math.max(Math.round(naturalWidth), 1);
  const sourceHeight = Math.max(Math.round(naturalHeight), 1);
  const foregroundScale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const backgroundScale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const renderedWidth = sourceWidth * foregroundScale;
  const renderedHeight = sourceHeight * foregroundScale;

  const scene: PosterVideoScene = {
    id: options.id || createSceneId(),
    composition: {
      width: VIDEO_COMPOSITION.width,
      height: VIDEO_COMPOSITION.height,
      fps: VIDEO_COMPOSITION.fps,
    },
    foreground: {
      source: imageSource,
      naturalWidth: sourceWidth,
      naturalHeight: sourceHeight,
      scale: foregroundScale,
      left: (frameWidth - renderedWidth) / 2,
      top: (frameHeight - renderedHeight) / 2,
      renderedWidth,
      renderedHeight,
    },
    background: {
      source: imageSource,
      mode: options.backgroundMode || 'blurred-duplicate',
      scale: backgroundScale,
      left: frameWidth / 2,
      top: frameHeight / 2,
      blur: 28,
      brightness: 0.85,
    },
    duration: Math.max(Number(options.duration) || 3000, 1),
  };

  validatePosterScene(scene);
  return scene;
}

export async function createPosterVideoComposition(
  imageSource: string,
  options: PosterVideoCompositionOptions = {},
): Promise<PosterVideoScene> {
  const image = await loadOriginalImage(imageSource);
  return calculatePosterVideoSceneLayout(
    imageSource,
    image.naturalWidth,
    image.naturalHeight,
    options,
  );
}

export function validatePosterScene(scene: PosterVideoScene): void {
  if (
    scene.composition.width !== VIDEO_COMPOSITION.width
    || scene.composition.height !== VIDEO_COMPOSITION.height
    || scene.composition.fps !== VIDEO_COMPOSITION.fps
  ) {
    throw new Error('Invalid video composition size');
  }

  if (scene.foreground.scale <= 0) {
    throw new Error('Invalid poster scale');
  }

  if (Math.abs(scene.foreground.renderedWidth - (scene.foreground.naturalWidth * scene.foreground.scale)) > 0.01) {
    throw new Error('Poster foreground scale is not uniform');
  }

  if (Math.abs(scene.foreground.renderedHeight - (scene.foreground.naturalHeight * scene.foreground.scale)) > 0.01) {
    throw new Error('Poster foreground scale is not uniform');
  }

  const right = scene.foreground.left + scene.foreground.renderedWidth;
  const bottom = scene.foreground.top + scene.foreground.renderedHeight;

  if (
    scene.foreground.left < -0.5
    || scene.foreground.top < -0.5
    || right > VIDEO_COMPOSITION.width + 0.5
    || bottom > VIDEO_COMPOSITION.height + 0.5
  ) {
    throw new Error('Poster is outside the video frame');
  }
}

export function renderPosterVideoScene(
  context: CanvasRenderingContext2D,
  scene: PosterVideoScene,
  foregroundImage: CanvasImageSource,
  backgroundImage: CanvasImageSource,
): void {
  validatePosterScene(scene);
  context.clearRect(0, 0, scene.composition.width, scene.composition.height);

  context.save();
  context.filter = `brightness(${Math.round(scene.background.brightness * 100)}%) blur(${scene.background.blur}px)`;
  context.translate(scene.background.left, scene.background.top);
  context.drawImage(
    backgroundImage,
    -(scene.background.scale * scene.foreground.naturalWidth) / 2,
    -(scene.background.scale * scene.foreground.naturalHeight) / 2,
    scene.background.scale * scene.foreground.naturalWidth,
    scene.background.scale * scene.foreground.naturalHeight,
  );
  context.restore();

  context.drawImage(
    foregroundImage,
    scene.foreground.left,
    scene.foreground.top,
    scene.foreground.renderedWidth,
    scene.foreground.renderedHeight,
  );
}
