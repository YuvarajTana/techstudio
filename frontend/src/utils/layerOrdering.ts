import { fabric } from 'fabric';

export type LayerOrderAction = 'forward' | 'backward' | 'front' | 'back';

const read = (object: fabric.Object, key: string) => object.get(key as keyof fabric.Object);

export const isPinnedBackgroundObject = (object: fabric.Object) => {
  const data = read(object, 'data') as { isGradientBg?: boolean } | undefined;
  const teckstudioObjectType = String(read(object, 'teckstudioObjectType') || '');
  const architectureRole = String(read(object, 'architectureRole') || '');
  const editorialRole = String(read(object, 'editorialRole') || '');
  const objectType = String(read(object, 'objectType') || '');

  return (
    data?.isGradientBg === true
    || read(object, 'isSmartFitBackground') === true
    || teckstudioObjectType === 'bgPattern'
    || teckstudioObjectType === 'architectureBackground'
    || architectureRole === 'architectureBackground'
    || editorialRole === 'background'
    || objectType === 'background'
  );
};

export const isCanvasLayerObject = (object: fabric.Object) => (
  read(object, 'editorOnly') !== true
  && read(object, 'excludeFromLayers') !== true
  && read(object, 'generatedEffectLayer') !== true
  && read(object, 'teckstudioObjectType') !== 'diagramAnchor'
  && read(object, 'teckstudioObjectType') !== 'editorGuide'
);

export const isDiagramConnectorObject = (object: fabric.Object) => {
  const teckstudioObjectType = String(read(object, 'teckstudioObjectType') || '');
  const role = String(read(object, 'diagramConnectorRole') || '');
  return (
    teckstudioObjectType === 'diagramConnectorPath'
    || teckstudioObjectType === 'diagramConnectorStart'
    || teckstudioObjectType === 'diagramConnectorEnd'
    || teckstudioObjectType === 'diagramConnectorLabel'
    || teckstudioObjectType === 'diagramArrow'
    || teckstudioObjectType === 'diagramArrowPath'
    || role.startsWith('diagramConnector')
  );
};

export const isReorderableLayerObject = (object: fabric.Object) => (
  isCanvasLayerObject(object) && !isPinnedBackgroundObject(object)
);

export const getCanvasLayerObjects = (canvas: fabric.Canvas) => (
  canvas.getObjects().filter(isCanvasLayerObject)
);

export const getReorderableLayerObjects = (canvas: fabric.Canvas) => (
  canvas.getObjects().filter(isReorderableLayerObject)
);

export const syncCanvasLayerIndices = (canvas: fabric.Canvas) => {
  canvas.getObjects().forEach((object, index) => {
    object.set({ layerIndex: index } as Record<string, unknown>);
  });
};

const getLayerBlock = (canvas: fabric.Canvas, object: fabric.Object) => {
  if (object.type !== 'activeSelection') return [object].filter(isReorderableLayerObject);
  const reorderable = getReorderableLayerObjects(canvas);
  return (object as fabric.ActiveSelection)
    .getObjects()
    .filter(isReorderableLayerObject)
    .sort((left, right) => reorderable.indexOf(left) - reorderable.indexOf(right));
};

const applyReorderableOrder = (canvas: fabric.Canvas, reorderableOrder: fabric.Object[]) => {
  const pinnedBackgrounds = canvas.getObjects().filter(isPinnedBackgroundObject);
  pinnedBackgrounds.forEach((object, index) => canvas.moveTo(object, index));
  reorderableOrder.forEach((object, index) => canvas.moveTo(object, pinnedBackgrounds.length + index));
  syncCanvasLayerIndices(canvas);
};

export const normalizeDiagramLayerStack = (canvas: fabric.Canvas) => {
  const objects = canvas.getObjects();
  const pinnedBackgrounds = objects.filter(isPinnedBackgroundObject);
  const connectors = objects.filter((object) => isCanvasLayerObject(object) && !isPinnedBackgroundObject(object) && isDiagramConnectorObject(object));
  const regularLayers = objects.filter((object) => isCanvasLayerObject(object) && !isPinnedBackgroundObject(object) && !isDiagramConnectorObject(object));
  const editorOverlays = objects.filter((object) => !isCanvasLayerObject(object));

  [...pinnedBackgrounds, ...connectors, ...regularLayers, ...editorOverlays].forEach((object, index) => {
    canvas.moveTo(object, index);
  });
  syncCanvasLayerIndices(canvas);
  canvas.requestRenderAll();
};

export const moveLayerObject = (
  canvas: fabric.Canvas,
  object: fabric.Object,
  action: LayerOrderAction,
) => {
  const order = getReorderableLayerObjects(canvas);
  const block = getLayerBlock(canvas, object);
  if (block.length === 0) return false;

  const blockIds = new Set(block);
  const firstIndex = order.indexOf(block[0]);
  const withoutBlock = order.filter((candidate) => !blockIds.has(candidate));
  let insertIndex = firstIndex;

  if (action === 'forward') insertIndex = Math.min(withoutBlock.length, firstIndex + 1);
  if (action === 'backward') insertIndex = Math.max(0, firstIndex - 1);
  if (action === 'front') insertIndex = withoutBlock.length;
  if (action === 'back') insertIndex = 0;

  const nextOrder = [
    ...withoutBlock.slice(0, insertIndex),
    ...block,
    ...withoutBlock.slice(insertIndex),
  ];

  applyReorderableOrder(canvas, nextOrder);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: object });
  return true;
};

export const moveLayerObjectToDisplayIndex = (
  canvas: fabric.Canvas,
  object: fabric.Object,
  displayIndex: number,
) => {
  const displayLayers = getCanvasLayerObjects(canvas).slice().reverse();
  const displayReorderable = getReorderableLayerObjects(canvas).slice().reverse();
  const block = getLayerBlock(canvas, object);
  if (block.length === 0) return false;

  const blockIds = new Set(block);
  const remainingDisplay = displayReorderable.filter((candidate) => !blockIds.has(candidate));
  const beforeTargetCount = displayLayers
    .slice(0, Math.max(0, displayIndex))
    .filter((candidate) => isReorderableLayerObject(candidate) && !blockIds.has(candidate))
    .length;
  const insertIndex = Math.max(0, Math.min(remainingDisplay.length, beforeTargetCount));
  const blockTopToBottom = [...block].reverse();
  const nextDisplay = [
    ...remainingDisplay.slice(0, insertIndex),
    ...blockTopToBottom,
    ...remainingDisplay.slice(insertIndex),
  ];

  applyReorderableOrder(canvas, nextDisplay.reverse());
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  canvas.fire('object:modified', { target: object });
  return true;
};
