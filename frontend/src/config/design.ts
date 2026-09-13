export const VIDEO_COMPOSITION = {
  width: 1080,
  height: 1350,
  aspectRatio: 1080 / 1350,
  fps: 30,
} as const;

export const SUPPORTED_VIDEO_FPS = [24, 30, 60] as const;

export const DESIGN_WIDTH = VIDEO_COMPOSITION.width;
export const DESIGN_HEIGHT = VIDEO_COMPOSITION.height;
export const DESIGN_ASPECT_RATIO = VIDEO_COMPOSITION.aspectRatio;
