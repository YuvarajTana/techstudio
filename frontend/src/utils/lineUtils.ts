import { fabric } from 'fabric';

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type ArrowHeadStyle = 'none' | 'arrow' | 'circle' | 'square' | 'diamond';

export interface LineOptions {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color?: string;
  width?: number;
  style?: LineStyle;
  startCap?: ArrowHeadStyle;
  endCap?: ArrowHeadStyle;
  curved?: boolean;
  name?: string;
}

/**
 * Creates interactive Fabric Line, Arrow, or Curved Connector objects.
 */
export const createLineElement = (options: LineOptions = {}): fabric.Object => {
  const x1 = options.x1 ?? 200;
  const y1 = options.y1 ?? 300;
  const x2 = options.x2 ?? 450;
  const y2 = options.y2 ?? 300;
  const color = options.color || '#8b5cf6';
  const width = options.width || 4;
  const style = options.style || 'solid';
  const endCap = options.endCap || 'none';

  let dashArray: number[] | undefined = undefined;
  if (style === 'dashed') {
    dashArray = [12, 6];
  } else if (style === 'dotted') {
    dashArray = [4, 4];
  }

  const baseLine = new fabric.Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth: width,
    strokeDashArray: dashArray,
    strokeLineCap: 'round',
    originX: 'center',
    originY: 'center',
  });

  if (endCap === 'none' && options.startCap === 'none') {
    baseLine.set({
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: options.name || 'Line',
      isLine: true,
      lineStyle: style,
    } as any);
    return baseLine;
  }

  // Create Arrow Head Group if caps are requested
  const objects: fabric.Object[] = [baseLine];

  if (endCap === 'arrow') {
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const arrowHead = new fabric.Triangle({
      width: width * 3.5,
      height: width * 3.5,
      fill: color,
      left: x2,
      top: y2,
      angle: angle + 90,
      originX: 'center',
      originY: 'center',
    });
    objects.push(arrowHead);
  }

  const lineGroup = new fabric.Group(objects, {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    id: `arrow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: options.name || 'Arrow Line',
    isLine: true,
    lineStyle: style,
    endCapStyle: endCap,
  } as any);

  return lineGroup;
};

/**
 * Creates custom geometric or decorative vector shapes (Star, Heart, Polygon, Speech Bubble, Badge).
 */
export const createCustomShape = (
  shapeType: string,
  options: { fill?: string; stroke?: string; strokeWidth?: number; left?: number; top?: number } = {}
): fabric.Object => {
  const left = options.left ?? 350;
  const top = options.top ?? 350;
  const fill = options.fill || '#8b5cf6';
  const stroke = options.stroke || '#7c3aed';
  const strokeWidth = options.strokeWidth || 2;

  let shapeObj: fabric.Object;

  switch (shapeType) {
    case 'star': {
      const points = [
        { x: 50, y: 0 },
        { x: 63, y: 35 },
        { x: 100, y: 35 },
        { x: 70, y: 57 },
        { x: 82, y: 91 },
        { x: 50, y: 70 },
        { x: 18, y: 91 },
        { x: 30, y: 57 },
        { x: 0, y: 35 },
        { x: 37, y: 35 },
      ];
      shapeObj = new fabric.Polygon(points, {
        left,
        top,
        fill,
        stroke,
        strokeWidth,
        scaleX: 1.5,
        scaleY: 1.5,
      });
      break;
    }
    case 'hexagon': {
      const points = [
        { x: 30, y: 0 },
        { x: 70, y: 0 },
        { x: 100, y: 50 },
        { x: 70, y: 100 },
        { x: 30, y: 100 },
        { x: 0, y: 50 },
      ];
      shapeObj = new fabric.Polygon(points, {
        left,
        top,
        fill,
        stroke,
        strokeWidth,
        scaleX: 1.5,
        scaleY: 1.5,
      });
      break;
    }
    case 'speech-bubble': {
      const d = 'M 20 0 L 140 0 C 150 0 160 10 160 20 L 160 80 C 160 90 150 100 140 100 L 60 100 L 20 130 L 30 100 L 20 100 C 10 100 0 90 0 80 L 0 20 C 0 10 10 0 20 0 Z';
      shapeObj = new fabric.Path(d, {
        left,
        top,
        fill,
        stroke,
        strokeWidth,
      });
      break;
    }
    case 'badge': {
      shapeObj = new fabric.Circle({
        left,
        top,
        radius: 60,
        fill,
        stroke,
        strokeWidth: 4,
        strokeDashArray: [10, 5],
      });
      break;
    }
    default: {
      shapeObj = new fabric.Rect({
        left,
        top,
        width: 140,
        height: 140,
        rx: 16,
        ry: 16,
        fill,
        stroke,
        strokeWidth,
      });
    }
  }

  shapeObj.set({
    id: `shape_${shapeType}_${Date.now()}`,
    name: `Shape (${shapeType.replace('-', ' ')})`,
  } as any);

  return shapeObj;
};
