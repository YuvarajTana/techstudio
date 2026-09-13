import { fabric } from 'fabric';

const textTypes = new Set(['text', 'textbox', 'i-text']);
const shapeTypes = new Set(['rect', 'circle', 'triangle', 'polygon', 'line', 'ellipse']);

const readString = (layer: fabric.Object, key: string) => {
  const value = layer.get(key as keyof fabric.Object);
  return typeof value === 'string' ? value.trim() : '';
};

const titleCase = (value: string) => value
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const scaledDimension = (dimension: number | undefined, scale: number | undefined) => {
  if (!dimension) return 0;
  return Math.max(1, Math.round(dimension * (scale || 1)));
};

export const getLayerDisplayName = (layer: fabric.Object, index: number) => {
  const customName = readString(layer, 'name');
  if (customName) return customName;
  if (textTypes.has(layer.type || '')) {
    const text = String((layer as fabric.Textbox).text || '').trim();
    return text ? text.replace(/\s+/g, ' ') : `Text ${index + 1}`;
  }
  if (layer.type === 'image') return `Image ${index + 1}`;
  if (layer.type === 'group') return `Group ${index + 1}`;
  if (layer.type === 'path') return `Path ${index + 1}`;
  return `${titleCase(layer.type || 'layer')} ${index + 1}`;
};

export const getLayerMetadata = (layer: fabric.Object) => {
  const type = layer.type || 'layer';
  const objectType = readString(layer, 'objectType');
  if (textTypes.has(type)) return `Text · ${readString(layer, 'textRole') ? titleCase(readString(layer, 'textRole')) : 'Editable text'}`;
  if (type === 'image') {
    const width = Number(layer.get('naturalWidth' as keyof fabric.Object)) || scaledDimension(layer.width, layer.scaleX);
    const height = Number(layer.get('naturalHeight' as keyof fabric.Object)) || scaledDimension(layer.height, layer.scaleY);
    const label = objectType === 'photo' ? 'Photo' : 'Image';
    return width && height ? `${label} · ${width} × ${height}` : `${label} · Editable asset`;
  }
  if (objectType === 'sticker') return `Sticker · ${titleCase(readString(layer, 'stickerCategory') || 'Graphic')}`;
  if (objectType === 'frame') return `Frame · ${titleCase(readString(layer, 'elementCategory') || 'Editable frame')}`;
  if (objectType === 'chart') return `Chart · ${titleCase(readString(layer, 'elementCategory') || 'Editable chart')}`;
  if (objectType === 'table') return `Table · ${titleCase(readString(layer, 'elementCategory') || 'Editable table')}`;
  if (objectType === 'form') return `Form · ${titleCase(readString(layer, 'elementCategory') || 'Editable form')}`;
  if (objectType === 'animation') return `Animation · ${titleCase(readString(layer, 'elementCategory') || 'Fabric keyframe')}`;
  if (objectType === 'three-d') return `3D · ${titleCase(readString(layer, 'elementCategory') || 'Editable object')}`;
  if (objectType === 'video') return `Video · ${titleCase(readString(layer, 'elementCategory') || 'Managed preview')}`;
  if (type === 'group') {
    const count = (layer as fabric.Group).getObjects().length;
    return `Group · ${count} ${count === 1 ? 'object' : 'objects'}`;
  }
  if (objectType === 'graphic') return `SVG · ${titleCase(readString(layer, 'category') || 'Graphic')}`;
  if (shapeTypes.has(type)) return `Shape · ${titleCase(type)}`;
  if (type === 'path') return `Drawing · ${titleCase(readString(layer, 'category') || 'Path')}`;
  return titleCase(objectType || type);
};
