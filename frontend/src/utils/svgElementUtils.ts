import { fabric } from 'fabric';

export interface SVGColorMap {
  [originalColor: string]: string;
}

/**
 * Load an SVG string or URL into Fabric.js as a recolorable Group or Path.
 */
export const loadSVGElement = (
  svgSource: string,
  options: {
    left?: number;
    top?: number;
    scale?: number;
    name?: string;
    id?: string;
  } = {}
): Promise<fabric.Object> => {
  return new Promise((resolve, reject) => {
    const isUrl = svgSource.startsWith('http://') || svgSource.startsWith('https://') || svgSource.startsWith('data:') || svgSource.endsWith('.svg');

    const handleParsedObjects = (objects: fabric.Object[], optionsParsed: any) => {
      if (!objects || objects.length === 0) {
        reject(new Error('Failed to parse SVG objects'));
        return;
      }

      let loadedObject: fabric.Object;
      if (objects.length === 1) {
        loadedObject = objects[0];
      } else {
        loadedObject = fabric.util.groupSVGElements(objects, optionsParsed);
      }

      const canvasWidth = 800;
      const canvasHeight = 800;

      // Scale appropriately if object is too large or small
      const width = loadedObject.width || 200;
      const height = loadedObject.height || 200;
      const targetSize = 180;
      const scaleVal = Math.min(targetSize / width, targetSize / height);

      loadedObject.set({
        left: options.left ?? canvasWidth / 2 - (width * scaleVal) / 2,
        top: options.top ?? canvasHeight / 2 - (height * scaleVal) / 2,
        scaleX: options.scale ?? scaleVal,
        scaleY: options.scale ?? scaleVal,
        id: options.id || `svg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: options.name || 'Vector Graphic',
        isVectorSVG: true,
      } as any);

      loadedObject.setCoords();
      resolve(loadedObject);
    };

    if (isUrl) {
      fabric.loadSVGFromURL(
        svgSource,
        (objects, optionsParsed) => {
          handleParsedObjects(objects, optionsParsed);
        },
        undefined,
        { crossOrigin: 'anonymous' }
      );
    } else {
      fabric.loadSVGFromString(svgSource, (objects, optionsParsed) => {
        handleParsedObjects(objects, optionsParsed);
      });
    }
  });
};

/**
 * Extract unique fill and stroke colors from a Fabric SVG group or path object.
 */
export const extractSVGColors = (obj: fabric.Object): string[] => {
  const colors = new Set<string>();

  const processObject = (o: fabric.Object) => {
    if (o.fill && typeof o.fill === 'string' && o.fill !== 'none' && o.fill !== 'transparent') {
      colors.add(o.fill.toLowerCase());
    }
    if (o.stroke && typeof o.stroke === 'string' && o.stroke !== 'none' && o.stroke !== 'transparent') {
      colors.add(o.stroke.toLowerCase());
    }
    if ((o as fabric.Group).getObjects) {
      (o as fabric.Group).getObjects().forEach(processObject);
    }
  };

  processObject(obj);
  return Array.from(colors);
};

/**
 * Replace specific colors across all nested paths in a Fabric SVG group.
 */
export const recolorSVGElement = (obj: fabric.Object, targetColor: string, newColor: string): void => {
  const targetLower = targetColor.toLowerCase();

  const recolor = (o: fabric.Object) => {
    if (o.fill && typeof o.fill === 'string' && o.fill.toLowerCase() === targetLower) {
      o.set({ fill: newColor });
    }
    if (o.stroke && typeof o.stroke === 'string' && o.stroke.toLowerCase() === targetLower) {
      o.set({ stroke: newColor });
    }
    if ((o as fabric.Group).getObjects) {
      (o as fabric.Group).getObjects().forEach(recolor);
    }
  };

  recolor(obj);
  if (obj.canvas) {
    obj.canvas.renderAll();
  }
};
