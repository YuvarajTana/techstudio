import { fabric } from 'fabric';

type BoxStylePatch = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

type BoxAppearance = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  objectType: string;
};

const TEXT_TYPES = new Set(['text', 'textbox', 'i-text']);
const SHAPE_TYPES = new Set(['rect', 'polygon', 'path', 'circle', 'ellipse', 'triangle']);
const CONNECTOR_TYPES = new Set([
  'diagramConnectorPath',
  'diagramConnectorStart',
  'diagramConnectorEnd',
  'diagramConnectorLabel',
  'diagramConnectorLabelText',
  'diagramConnectorLabelBackground',
  'diagramArrow',
  'diagramArrowPath',
  'diagramAnchor',
  'diagramBendHandle',
  'diagramEndpointHandle',
]);

const BACKGROUND_ROLES = new Set([
  'background',
  'diagramBoxBackground',
  'diagramBoxBackground',
  'architecture-card-background',
  'architecture-chip-background',
  'editorial-tag-background',
]);

const value = (object: fabric.Object, key: string) => object.get(key as keyof fabric.Object) as unknown;

const stringValue = (object: fabric.Object, key: string) => String(value(object, key) || '');

const area = (object: fabric.Object) => (
  Math.abs(Number(object.width || 0) * Number(object.height || 0) * Number(object.scaleX || 1) * Number(object.scaleY || 1))
);

const isTextObject = (object: fabric.Object) => TEXT_TYPES.has(object.type || '');

const isConnectorObject = (object: fabric.Object) => {
  const type = stringValue(object, 'teckstudioObjectType');
  const objectType = stringValue(object, 'objectType');
  const role = stringValue(object, 'diagramConnectorRole');
  return CONNECTOR_TYPES.has(type) || CONNECTOR_TYPES.has(objectType) || CONNECTOR_TYPES.has(role);
};

const isUnsupportedPaintTarget = (object: fabric.Object) => (
  isTextObject(object)
  || object.type === 'image'
  || object.get('editorOnly' as keyof fabric.Object) === true
  || object.get('excludeFromExport' as keyof fabric.Object) === true
  || isConnectorObject(object)
);

const isShapeObject = (object: fabric.Object) => (
  SHAPE_TYPES.has(object.type || '') && !isUnsupportedPaintTarget(object)
);

const isKnownBackgroundObject = (object: fabric.Object) => {
  const values = [
    stringValue(object, 'diagramBoxRole'),
    stringValue(object, 'architectureRole'),
    stringValue(object, 'editorialTagRole'),
    stringValue(object, 'objectType'),
    stringValue(object, 'teckstudioObjectType'),
  ];
  return values.some((item) => BACKGROUND_ROLES.has(item) || /background$/i.test(item));
};

const groupChildren = (object: fabric.Object) => (
  object.type === 'group' ? (object as fabric.Group).getObjects() : []
);

const backgroundChildrenForGroup = (group: fabric.Object): fabric.Object[] => {
  const children = groupChildren(group);
  const explicit = children.filter((child) => isShapeObject(child) && isKnownBackgroundObject(child));
  if (explicit.length > 0) return explicit;

  const shapeChildren = children.filter(isShapeObject);
  if (shapeChildren.length === 0) return [];
  const largestArea = Math.max(...shapeChildren.map(area));
  const largeBackgrounds = shapeChildren.filter((child) => area(child) >= largestArea * 0.65);
  return largeBackgrounds.length > 0 ? largeBackgrounds : [shapeChildren[0]];
};

const directBoxTarget = (object: fabric.Object) => (
  isShapeObject(object) ? [object] : []
);

export const getBoxStyleTargets = (object?: fabric.Object | null): fabric.Object[] => {
  if (!object) return [];
  if (object.type === 'activeSelection') {
    return (object as fabric.ActiveSelection)
      .getObjects()
      .flatMap((child) => getBoxStyleTargets(child));
  }
  if (object.type === 'group') return backgroundChildrenForGroup(object);
  return directBoxTarget(object);
};

const setNestedConfig = (
  object: fabric.Object,
  configKey: string,
  patch: Record<string, unknown>,
) => {
  const current = value(object, configKey);
  if (!current || typeof current !== 'object' || Array.isArray(current)) return;
  object.set({ [configKey]: { ...current as Record<string, unknown>, ...patch } } as Record<string, unknown>);
};

const syncParentConfig = (target: fabric.Object, patch: BoxStylePatch) => {
  const parent = target.group;
  if (!parent) return;
  const configPatch: Record<string, unknown> = {};
  if (patch.fill !== undefined) {
    configPatch.backgroundColor = patch.fill;
    configPatch.fill = patch.fill;
  }
  if (patch.stroke !== undefined) {
    configPatch.borderColor = patch.stroke;
    configPatch.stroke = patch.stroke;
  }
  if (patch.strokeWidth !== undefined) {
    configPatch.borderWidth = patch.strokeWidth;
    configPatch.strokeWidth = patch.strokeWidth;
  }
  if (patch.opacity !== undefined) {
    configPatch.opacity = patch.opacity;
  }
  setNestedConfig(parent, 'architectureNodeConfig', configPatch);
  setNestedConfig(parent, 'shapeConfig', configPatch);
  setNestedConfig(parent, 'editorialTagConfig', configPatch);
  parent.set({ dirty: true } as Record<string, unknown>);
};

export const applyBoxStyle = (
  canvas: fabric.Canvas,
  object: fabric.Object,
  patch: BoxStylePatch,
) => {
  const targets = getBoxStyleTargets(object);
  if (targets.length === 0) return false;
  targets.forEach((target) => {
    target.set(patch as Record<string, unknown>);
    target.setCoords();
    syncParentConfig(target, patch);
  });
  object.setCoords();
  canvas.requestRenderAll();
  return true;
};

export const getBoxAppearance = (object?: fabric.Object | null): BoxAppearance | null => {
  const target = getBoxStyleTargets(object)[0];
  if (!target) return null;
  const fill = target.get('fill');
  const stroke = target.get('stroke');
  return {
    fill: typeof fill === 'string' ? fill : '#8b5cf6',
    stroke: typeof stroke === 'string' ? stroke : '#000000',
    strokeWidth: Number(target.get('strokeWidth' as keyof fabric.Object) || 0),
    opacity: Number(target.get('opacity' as keyof fabric.Object) ?? 1),
    objectType: target.type || 'object',
  };
};
