import { fabric } from 'fabric';

export type FrameShapeType = 'rectangle' | 'circle' | 'rounded' | 'polaroid' | 'phone' | 'laptop' | 'star' | 'heart';

export interface FrameOptions {
  shape: FrameShapeType;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  name?: string;
}

/**
 * Creates an interactive image Frame container using Fabric.js clipPath.
 */
export const createFrameContainer = (options: FrameOptions): fabric.Group => {
  const width = options.width || 200;
  const height = options.height || 200;
  const left = options.left || 300;
  const top = options.top || 300;

  // Placeholder background rect
  const bgRect = new fabric.Rect({
    width,
    height,
    fill: '#27272a',
    stroke: options.strokeColor || '#3f3f46',
    strokeWidth: options.strokeWidth || 2,
    rx: options.shape === 'rounded' ? 24 : 0,
    ry: options.shape === 'rounded' ? 24 : 0,
    originX: 'center',
    originY: 'center',
  });

  // Placeholder camera icon text or placeholder label
  const placeholderText = new fabric.Text('Drop Image Here', {
    fontSize: 14,
    fontFamily: 'sans-serif',
    fill: '#71717a',
    originX: 'center',
    originY: 'center',
  });

  // Create clip path object based on shape
  let clipMask: fabric.Object;

  if (options.shape === 'circle') {
    clipMask = new fabric.Circle({
      radius: width / 2,
      originX: 'center',
      originY: 'center',
    });
  } else if (options.shape === 'rounded') {
    clipMask = new fabric.Rect({
      width,
      height,
      rx: 24,
      ry: 24,
      originX: 'center',
      originY: 'center',
    });
  } else if (options.shape === 'heart') {
    // Heart path clip mask
    const d = 'M 0 -30 C -20 -60, -60 -30, -60 10 C -60 50, 0 80, 0 90 C 0 80, 60 50, 60 10 C 60 -30, 20 -60, 0 -30 Z';
    clipMask = new fabric.Path(d, {
      scaleX: width / 120,
      scaleY: height / 140,
      originX: 'center',
      originY: 'center',
    });
  } else {
    // Default rect
    clipMask = new fabric.Rect({
      width,
      height,
      originX: 'center',
      originY: 'center',
    });
  }

  const frameGroup = new fabric.Group([bgRect, placeholderText], {
    left,
    top,
    width,
    height,
    clipPath: clipMask,
    id: `frame_${options.shape}_${Date.now()}`,
    name: options.name || `Frame (${options.shape})`,
    isFrame: true,
    frameShape: options.shape,
  } as any);

  return frameGroup;
};

/**
 * Drop or set an image inside an existing Frame container.
 */
export const insertImageIntoFrame = (
  canvas: fabric.Canvas,
  frameGroup: fabric.Group,
  imageUrl: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(
      imageUrl,
      (img) => {
        if (!img) {
          reject(new Error('Failed to load image for frame'));
          return;
        }

        const frameWidth = frameGroup.width || 200;
        const frameHeight = frameGroup.height || 200;

        // Scale image to cover frame
        const scaleX = frameWidth / (img.width || 1);
        const scaleY = frameHeight / (img.height || 1);
        const maxScale = Math.max(scaleX, scaleY);

        img.set({
          originX: 'center',
          originY: 'center',
          scaleX: maxScale,
          scaleY: maxScale,
        });

        // Clear existing background inside frame and add image
        frameGroup.addWithUpdate(img);

        // Update frame attributes
        (frameGroup as any).set({
          hasImage: true,
          frameImageUrl: imageUrl,
        });

        canvas.renderAll();
        resolve();
      },
      { crossOrigin: 'anonymous' }
    );
  });
};

/**
 * Creates a Multi-Cell Grid Container (e.g. 2-column, 4-grid).
 */
export const createGridContainer = (
  layoutType: '2-col' | '3-col' | '2x2',
  left: number = 250,
  top: number = 250,
  gap: number = 8
): fabric.Group => {
  const containerW = 400;
  const containerH = 300;
  const cells: fabric.Rect[] = [];

  if (layoutType === '2-col') {
    const cellW = (containerW - gap) / 2;
    const c1 = new fabric.Rect({
      left: 0,
      top: 0,
      width: cellW,
      height: containerH,
      fill: '#27272a',
      stroke: '#3f3f46',
      strokeWidth: 1,
      rx: 6,
      ry: 6,
    });
    const c2 = new fabric.Rect({
      left: cellW + gap,
      top: 0,
      width: cellW,
      height: containerH,
      fill: '#27272a',
      stroke: '#3f3f46',
      strokeWidth: 1,
      rx: 6,
      ry: 6,
    });
    cells.push(c1, c2);
  } else if (layoutType === '2x2') {
    const cellW = (containerW - gap) / 2;
    const cellH = (containerH - gap) / 2;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        cells.push(
          new fabric.Rect({
            left: col * (cellW + gap),
            top: row * (cellH + gap),
            width: cellW,
            height: cellH,
            fill: '#27272a',
            stroke: '#3f3f46',
            strokeWidth: 1,
            rx: 6,
            ry: 6,
          })
        );
      }
    }
  } else {
    // 3-col
    const cellW = (containerW - gap * 2) / 3;
    for (let col = 0; col < 3; col++) {
      cells.push(
        new fabric.Rect({
          left: col * (cellW + gap),
          top: 0,
          width: cellW,
          height: containerH,
          fill: '#27272a',
          stroke: '#3f3f46',
          strokeWidth: 1,
          rx: 6,
          ry: 6,
        })
      );
    }
  }

  const gridGroup = new fabric.Group(cells, {
    left,
    top,
    width: containerW,
    height: containerH,
    id: `grid_${layoutType}_${Date.now()}`,
    name: `Grid (${layoutType})`,
    isGrid: true,
    gridLayout: layoutType,
  } as any);

  return gridGroup;
};
