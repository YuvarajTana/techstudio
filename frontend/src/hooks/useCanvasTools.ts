import { fabric } from 'fabric';
import { useEditorStore } from '../store/useEditorStore';

export const useCanvasTools = () => {
  const saveHistory = () => useEditorStore.getState().saveHistory();

  // Robust canvas getter - tries multiple methods
  const getCanvas = (): fabric.Canvas | null => {
    // Method 1: Get from Zustand store
    const storeCanvas = useEditorStore.getState().canvas;
    if (storeCanvas) return storeCanvas;

    // Method 2: Get from DOM (fallback)
    const allCanvases = document.querySelectorAll('.canvas-container canvas');
    if (allCanvases.length > 0) {
      const canvasEl = allCanvases[0] as HTMLCanvasElement;
      // Try to get the Fabric instance from the canvas element
      const fabricInstance = (canvasEl as any).__fabric;
      if (fabricInstance) return fabricInstance;
    }

    return null;
  };

  const addShapeToCenter = (shape: fabric.Object) => {
    const canvas = getCanvas();
    if (!canvas) {
      console.error('[TECKSTUDIO] Canvas not ready. Please wait for the editor to load.');
      return;
    }

    // Center the shape on canvas
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const shapeWidth = (shape.width || 100) * (shape.scaleX || 1);
    const shapeHeight = (shape.height || 100) * (shape.scaleY || 1);

    shape.set({
      left: centerX - shapeWidth / 2,
      top: centerY - shapeHeight / 2,
    });

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    saveHistory();
  };

  const addShape = (shape: fabric.Object) => {
    const canvas = getCanvas();
    if (!canvas) {
      console.error('[TECKSTUDIO] Canvas not ready. Please wait for the editor to load.');
      return;
    }

    // Center the shape on canvas
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const shapeWidth = (shape.width || 100) * (shape.scaleX || 1);
    const shapeHeight = (shape.height || 100) * (shape.scaleY || 1);

    shape.set({
      left: centerX - shapeWidth / 2,
      top: centerY - shapeHeight / 2,
    });

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    saveHistory();
  };

  const getStyles = () => {
    const state = useEditorStore.getState();
    return {
      fill: state.fillColor || '#8b5cf6',
      stroke: state.strokeWidth > 0 ? (state.strokeColor || '#000000') : undefined,
      strokeWidth: state.strokeWidth || 0,
      fontFamily: state.fontFamily || 'Outfit',
    };
  };

  const addRectangle = () => {
    const styles = getStyles();
    const rect = new fabric.Rect({
      width: 150,
      height: 100,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
      rx: 8,
      ry: 8,
    });
    addShape(rect);
  };

  const addCircle = () => {
    const styles = getStyles();
    const circle = new fabric.Circle({
      radius: 60,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShape(circle);
  };

  const addTriangle = () => {
    const styles = getStyles();
    const triangle = new fabric.Triangle({
      width: 130,
      height: 110,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShape(triangle);
  };

  const addLine = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const styles = getStyles();
    const line = new fabric.Line([centerX - 100, centerY, centerX + 100, centerY], {
      stroke: styles.stroke || styles.fill,
      strokeWidth: styles.strokeWidth > 0 ? styles.strokeWidth : 4,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
    saveHistory();
  };

  const addArrow = () => {
    const styles = getStyles();
    const arrow = new fabric.Path('M 0 10 L 80 10 L 80 0 L 110 15 L 80 30 L 80 20 L 0 20 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShape(arrow);
  };

  const addStar = () => {
    const styles = getStyles();
    const star = new fabric.Path('M 50 0 L 65 35 L 100 35 L 72 57 L 83 91 L 50 70 L 17 91 L 28 57 L 0 35 L 35 35 Z', {
      width: 100,
      height: 100,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShape(star);
  };

  const addPolygon = () => {
    const styles = getStyles();
    const hexagon = new fabric.Polygon([
      { x: 50, y: 0 },
      { x: 100, y: 25 },
      { x: 100, y: 75 },
      { x: 50, y: 100 },
      { x: 0, y: 75 },
      { x: 0, y: 25 }
    ], {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShape(hexagon);
  };

  const addHeart = () => {
    const styles = getStyles();
    const heart = new fabric.Path('M 50 25 C 50 0 100 0 100 25 C 100 65 50 90 50 100 C 50 90 0 65 0 25 C 0 0 50 0 50 25 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShape(heart);
  };

  const addSpeechBubble = () => {
    const styles = getStyles();
    const bubble = new fabric.Path('M 0 25 C 0 5 10 0 50 0 C 90 0 100 5 100 25 C 100 45 90 50 60 50 L 40 70 L 40 50 C 10 50 0 45 0 25 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(bubble);
  };

  // ─── NEW SHAPES ─────────────────────────────────────────

  const addDiamond = () => {
    const styles = getStyles();
    const diamond = new fabric.Polygon([
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 }
    ], {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(diamond);
  };

  const addPentagon = () => {
    const styles = getStyles();
    const pentagon = new fabric.Polygon([
      { x: 50, y: 0 },
      { x: 100, y: 38 },
      { x: 81, y: 100 },
      { x: 19, y: 100 },
      { x: 0, y: 38 }
    ], {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(pentagon);
  };

  const addOctagon = () => {
    const styles = getStyles();
    const octagon = new fabric.Polygon([
      { x: 29, y: 0 },
      { x: 71, y: 0 },
      { x: 100, y: 29 },
      { x: 100, y: 71 },
      { x: 71, y: 100 },
      { x: 29, y: 100 },
      { x: 0, y: 71 },
      { x: 0, y: 29 }
    ], {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(octagon);
  };

  const addCross = () => {
    const styles = getStyles();
    const cross = new fabric.Path('M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(cross);
  };

  const addArrowUp = () => {
    const styles = getStyles();
    const arrow = new fabric.Path('M 50 0 L 100 50 L 75 50 L 75 100 L 25 100 L 25 50 L 0 50 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(arrow);
  };

  const addArrowDown = () => {
    const styles = getStyles();
    const arrow = new fabric.Path('M 50 100 L 0 50 L 25 50 L 25 0 L 75 0 L 75 50 L 100 50 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(arrow);
  };

  const addBadge = () => {
    const styles = getStyles();
    const badge = new fabric.Path('M 50 0 L 93 25 L 93 75 L 50 100 L 7 75 L 7 25 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(badge);
  };

  const addShield = () => {
    const styles = getStyles();
    const shield = new fabric.Path('M 50 0 L 100 15 L 100 55 Q 100 85 50 100 Q 0 85 0 55 L 0 15 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(shield);
  };

  const addCloud = () => {
    const styles = getStyles();
    const cloud = new fabric.Path('M 25 65 Q 5 65 5 50 Q 5 35 20 30 Q 15 10 35 10 Q 50 5 60 15 Q 70 5 85 15 Q 100 20 100 40 Q 100 65 80 65 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(cloud);
  };

  const addLightning = () => {
    const styles = getStyles();
    const lightning = new fabric.Path('M 55 0 L 20 50 L 45 50 L 40 100 L 80 40 L 55 40 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(lightning);
  };

  const addQuote = () => {
    const styles = getStyles();
    const quote = new fabric.Path('M 10 60 Q 10 30 30 20 L 35 30 Q 25 35 25 50 L 40 50 L 40 80 L 10 80 Z M 55 60 Q 55 30 75 20 L 80 30 Q 70 35 70 50 L 85 50 L 85 80 L 55 80 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(quote);
  };

  const addBookmark = () => {
    const styles = getStyles();
    const bookmark = new fabric.Path('M 0 0 L 100 0 L 100 100 L 50 80 L 0 100 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(bookmark);
  };

  const addFlame = () => {
    const styles = getStyles();
    const flame = new fabric.Path('M 50 0 Q 70 25 80 40 Q 100 30 100 60 Q 100 90 50 100 Q 0 90 0 60 Q 0 30 20 40 Q 30 25 50 0 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(flame);
  };

  const addCheckmark = () => {
    const styles = getStyles();
    const check = new fabric.Path('M 10 50 L 40 80 L 90 20', {
      fill: 'transparent',
      stroke: styles.fill,
      strokeWidth: 10,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });
    addShapeToCenter(check);
  };

  const addXMark = () => {
    const styles = getStyles();
    const x = new fabric.Path('M 15 15 L 85 85 M 85 15 L 15 85', {
      fill: 'transparent',
      stroke: styles.fill,
      strokeWidth: 10,
      strokeLineCap: 'round',
    });
    addShapeToCenter(x);
  };

  const addPlusMark = () => {
    const styles = getStyles();
    const plus = new fabric.Path('M 50 10 L 50 90 M 10 50 L 90 50', {
      fill: 'transparent',
      stroke: styles.fill,
      strokeWidth: 10,
      strokeLineCap: 'round',
    });
    addShapeToCenter(plus);
  };

  const addMinusMark = () => {
    const styles = getStyles();
    const minus = new fabric.Path('M 10 50 L 90 50', {
      fill: 'transparent',
      stroke: styles.fill,
      strokeWidth: 10,
      strokeLineCap: 'round',
    });
    addShapeToCenter(minus);
  };

  const addEye = () => {
    const styles = getStyles();
    const eye = new fabric.Path('M 0 50 Q 50 0 100 50 Q 50 100 0 50 Z M 50 50 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(eye);
  };

  const addLock = () => {
    const styles = getStyles();
    const lock = new fabric.Path('M 25 45 L 25 35 Q 25 15 50 15 Q 75 15 75 35 L 75 45 L 85 45 Q 95 45 95 55 L 95 90 Q 95 100 85 100 L 15 100 Q 5 100 5 90 L 5 55 Q 5 45 15 45 Z', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(lock);
  };

  const addCamera = () => {
    const styles = getStyles();
    const camera = new fabric.Path('M 30 20 L 70 20 L 80 35 L 100 35 Q 100 100 0 100 Q 0 100 0 35 L 20 35 Z M 50 75 m -20 0 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(camera);
  };

  const addBell = () => {
    const styles = getStyles();
    const bell = new fabric.Path('M 50 0 Q 65 0 75 15 Q 85 30 85 50 L 85 65 L 95 80 L 5 80 L 15 65 L 15 50 Q 15 30 25 15 Q 35 0 50 0 Z M 40 85 Q 40 100 50 100 Q 60 100 60 85', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
    });
    addShapeToCenter(bell);
  };

  const addFlag = () => {
    const styles = getStyles();
    const flag = new fabric.Path('M 10 0 L 10 100 M 10 0 L 90 0 Q 100 0 95 25 Q 90 50 100 50 L 10 50', {
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
      strokeLineCap: 'round',
    });
    addShapeToCenter(flag);
  };

  const addRoundedRect = () => {
    const styles = getStyles();
    const rect = new fabric.Rect({
      width: 150,
      height: 100,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
      rx: 25,
      ry: 25,
    });
    addShapeToCenter(rect);
  };

  const addPillShape = () => {
    const styles = getStyles();
    const pill = new fabric.Rect({
      width: 180,
      height: 60,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: styles.strokeWidth,
      rx: 30,
      ry: 30,
    });
    addShapeToCenter(pill);
  };

  const addText = (preset: 'heading' | 'subheading' | 'body') => {
    const canvas = getCanvas();
    if (!canvas) return;

    const styles = getStyles();
    let textStr = 'Click to edit text';
    let size = 28;
    let weight = 'normal';

    if (preset === 'heading') {
      textStr = 'Add a Heading';
      size = 54;
      weight = 'bold';
    } else if (preset === 'subheading') {
      textStr = 'Add a Subheading';
      size = 36;
      weight = '600';
    }

    const textbox = new fabric.Textbox(textStr, {
      width: 450,
      fontSize: size,
      fontWeight: weight,
      fontFamily: styles.fontFamily,
      fill: styles.fill,
      textAlign: 'center',
    });

    // Center text on canvas
    textbox.set({
      left: canvas.getWidth() / 2 - 225,
      top: canvas.getHeight() / 2 - size / 2,
    });

    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
    saveHistory();
  };

  return {
    addRectangle,
    addRoundedRect,
    addPillShape,
    addCircle,
    addTriangle,
    addDiamond,
    addPentagon,
    addPolygon,
    addOctagon,
    addLine,
    addCross,
    addArrow,
    addArrowUp,
    addArrowDown,
    addStar,
    addHeart,
    addBadge,
    addShield,
    addSpeechBubble,
    addCloud,
    addLightning,
    addQuote,
    addBookmark,
    addFlame,
    addCheckmark,
    addXMark,
    addPlusMark,
    addMinusMark,
    addEye,
    addLock,
    addCamera,
    addBell,
    addFlag,
    addText,
  };
};
