import React from 'react';
import { fabric } from 'fabric';
import type { ElementKind, ElementMetadata } from '../../types/elements';

type ElementPropertiesControlsProps = {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.Object;
  saveHistory: () => void;
  ungroupSelected: () => void;
};

const ELEMENT_KINDS: ElementKind[] = ['shape', 'photo', 'frame', 'chart', 'table', 'animation', 'form', 'three-d', 'video'];
const ELEMENT_CONFIG_KEYS: Partial<Record<ElementKind, string>> = {
  shape: 'shapeConfig',
  photo: 'photoConfig',
  frame: 'frameConfig',
  chart: 'chartConfig',
  table: 'tableConfig',
  form: 'formConfig',
  animation: 'animationConfig',
  'three-d': 'threeDConfig',
  video: 'videoConfig',
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const readString = (object: fabric.Object, key: string) => {
  const value = object.get(key as keyof fabric.Object);
  return typeof value === 'string' ? value : '';
};

const readStringArray = (object: fabric.Object, key: string) => {
  const value = object.get(key as keyof fabric.Object);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const titleCase = (value: string) => value
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const readElementMetadata = (object: fabric.Object): ElementMetadata | null => {
  const raw = object.get('elementMetadata' as keyof fabric.Object);
  if (isRecord(raw) && ELEMENT_KINDS.includes(raw.elementKind as ElementKind)) {
    const kind = raw.elementKind as ElementKind;
    const configKey = ELEMENT_CONFIG_KEYS[kind];
    const rawConfig = isRecord(raw.config) ? raw.config : configKey && isRecord(raw[configKey]) ? raw[configKey] as Record<string, unknown> : {};
    return {
      ...(raw as ElementMetadata),
      editable: raw.editable !== false,
      tags: Array.isArray(raw.tags) ? raw.tags.filter((item): item is string => typeof item === 'string') : readStringArray(object, 'elementTags'),
      thumbnailUrl: typeof raw.thumbnailUrl === 'string' ? raw.thumbnailUrl : readString(object, 'thumbnailUrl') || undefined,
      isPremium: Boolean(raw.isPremium || object.get('isPremium' as keyof fabric.Object)),
      config: rawConfig,
      ...(configKey ? { [configKey]: rawConfig } : {}),
    } as ElementMetadata;
  }

  const elementKind = readString(object, 'elementKind') as ElementKind;
  const objectType = readString(object, 'objectType') as ElementKind;
  const kind = ELEMENT_KINDS.includes(elementKind) ? elementKind : ELEMENT_KINDS.includes(objectType) ? objectType : null;
  if (!kind) return null;
  const elementConfig = object.get('elementConfig' as keyof fabric.Object);
  const kindConfigKey = ELEMENT_CONFIG_KEYS[kind];
  const kindConfig = kindConfigKey ? object.get(kindConfigKey as keyof fabric.Object) : null;
  const config = isRecord(elementConfig) ? elementConfig : isRecord(kindConfig) ? kindConfig : {};

  return {
    id: readString(object, 'id') || `element-${Date.now()}`,
    elementId: readString(object, 'elementId') || readString(object, 'assetId') || kind,
    elementKind: kind,
    displayName: readString(object, 'displayName') || readString(object, 'name') || titleCase(kind),
    category: readString(object, 'elementCategory') || readString(object, 'category') || titleCase(kind),
    subcategory: readString(object, 'elementSubcategory') || undefined,
    tags: readStringArray(object, 'elementTags'),
    sourceUrl: readString(object, 'sourceUrl') || undefined,
    thumbnailUrl: readString(object, 'thumbnailUrl') || undefined,
    previewUrl: readString(object, 'previewUrl') || undefined,
    modelUrl: readString(object, 'modelUrl') || undefined,
    isPremium: Boolean(object.get('isPremium' as keyof fabric.Object)),
    editable: object.get('elementEditable' as keyof fabric.Object) !== false,
    provider: readString(object, 'elementProvider') || 'teckstudio',
    licence: readString(object, 'elementLicence') || 'Application-owned editable element',
    ...(kindConfigKey ? { [kindConfigKey]: config } : {}),
    config,
  };
};

const setObjectMetadata = (object: fabric.Object, metadata: ElementMetadata) => {
  const nextValues: Record<string, unknown> = {
    name: `${titleCase(metadata.elementKind)} — ${metadata.displayName}`,
    displayName: metadata.displayName,
    elementId: metadata.elementId,
    elementKind: metadata.elementKind,
    elementCategory: metadata.category,
    elementSubcategory: metadata.subcategory,
    elementTags: metadata.tags || [],
    elementProvider: metadata.provider,
    elementLicence: metadata.licence,
    elementEditable: metadata.editable,
    elementConfig: metadata.config,
    elementMetadata: metadata,
    sourceUrl: metadata.sourceUrl,
    thumbnailUrl: metadata.thumbnailUrl,
    previewUrl: metadata.previewUrl,
    modelUrl: metadata.modelUrl,
    isPremium: metadata.isPremium,
  };
  const configKey = ELEMENT_CONFIG_KEYS[metadata.elementKind];
  if (configKey) nextValues[configKey] = metadata.config;
  if (metadata.elementKind === 'video' && typeof metadata.config?.duration === 'number') {
    nextValues.mediaDuration = metadata.config.duration;
  }
  object.set(nextValues);
};

const getChildObjects = (object: fabric.Object): fabric.Object[] => {
  if (object.type !== 'group') return [object];
  return (object as fabric.Group).getObjects();
};

const forEachEditableObject = (object: fabric.Object, visitor: (child: fabric.Object, index: number) => void) => {
  const children = getChildObjects(object);
  children.forEach((child, index) => {
    visitor(child, index);
    if (child.type === 'group') {
      (child as fabric.Group).getObjects().forEach((nested, nestedIndex) => visitor(nested, index + nestedIndex));
    }
  });
};

const isTextObject = (object: fabric.Object) => ['text', 'textbox', 'i-text'].includes(object.type || '');

const setTextValue = (object: fabric.Object, value: string) => {
  if (!isTextObject(object)) return false;
  (object as fabric.Textbox).set('text', value);
  (object as fabric.Textbox).initDimensions?.();
  return true;
};

const parseValues = (value: string) => value
  .split(',')
  .map((item) => Number(item.trim()))
  .filter((item) => Number.isFinite(item) && item >= 0)
  .slice(0, 8);

const palettePresets = [
  ['#8b5cf6', '#22d3ee'],
  ['#f97316', '#facc15'],
  ['#ec4899', '#a855f7'],
  ['#10b981', '#06b6d4'],
  ['#18181b', '#f4f4f5'],
];

export const ElementPropertiesControls: React.FC<ElementPropertiesControlsProps> = ({
  canvas,
  selectedObject,
  saveHistory,
  ungroupSelected,
}) => {
  const metadata = React.useMemo(() => readElementMetadata(selectedObject), [selectedObject]);
  const [displayName, setDisplayName] = React.useState(metadata?.displayName || '');
  const [accentColor, setAccentColor] = React.useState('#8b5cf6');
  const [secondaryColor, setSecondaryColor] = React.useState('#22d3ee');
  const [shapeStrokeWidth, setShapeStrokeWidth] = React.useState(2);
  const [shapeCornerRadius, setShapeCornerRadius] = React.useState(24);
  const [shapeDashedStroke, setShapeDashedStroke] = React.useState(false);
  const [photoScale, setPhotoScale] = React.useState(1);
  const [photoOpacity, setPhotoOpacity] = React.useState(1);
  const [photoCropX, setPhotoCropX] = React.useState(0);
  const [photoCropY, setPhotoCropY] = React.useState(0);
  const [chartValues, setChartValues] = React.useState('34, 58, 42, 76');
  const [chartTitle, setChartTitle] = React.useState(metadata?.displayName || '');
  const [frameLabel, setFrameLabel] = React.useState('Drop image here');
  const [frameBorderWidth, setFrameBorderWidth] = React.useState(8);
  const [rotationX, setRotationX] = React.useState(0);
  const [rotationY, setRotationY] = React.useState(0);
  const [rotationZ, setRotationZ] = React.useState(0);
  const [mediaDuration, setMediaDuration] = React.useState(12);
  const [mediaLoop, setMediaLoop] = React.useState(true);
  const [animationSpeed, setAnimationSpeed] = React.useState(1);
  const [formTitle, setFormTitle] = React.useState('');
  const [formSubmitLabel, setFormSubmitLabel] = React.useState('Submit');

  React.useEffect(() => {
    const nextMetadata = readElementMetadata(selectedObject);
    setDisplayName(nextMetadata?.displayName || '');
    setChartTitle(nextMetadata?.displayName || '');
    const config = nextMetadata?.config || {};
    const datasetValues = Array.isArray((config as { datasets?: unknown[] }).datasets)
      ? ((config as { datasets?: Array<{ values?: number[] }> }).datasets?.[0]?.values || [])
      : [];
    if (datasetValues.length) setChartValues(datasetValues.join(', '));
    if (typeof (config as { borderWidth?: unknown }).borderWidth === 'number') setFrameBorderWidth((config as { borderWidth: number }).borderWidth);
    if (nextMetadata?.elementKind === 'shape') {
      setAccentColor(typeof (config as { fill?: unknown }).fill === 'string' ? (config as { fill: string }).fill : '#8b5cf6');
      setSecondaryColor(typeof (config as { stroke?: unknown }).stroke === 'string' ? (config as { stroke: string }).stroke : '#18181b22');
      setShapeStrokeWidth(typeof (config as { strokeWidth?: unknown }).strokeWidth === 'number' ? (config as { strokeWidth: number }).strokeWidth : Number(selectedObject.get('strokeWidth' as keyof fabric.Object) || 2));
      setShapeCornerRadius(typeof (config as { cornerRadius?: unknown }).cornerRadius === 'number' ? (config as { cornerRadius: number }).cornerRadius : Number(selectedObject.get('rx' as keyof fabric.Object) || 24));
      const dashArray = (config as { strokeDashArray?: unknown }).strokeDashArray || selectedObject.get('strokeDashArray' as keyof fabric.Object);
      setShapeDashedStroke(Array.isArray(dashArray) && dashArray.length > 0);
    }
    if (nextMetadata?.elementKind === 'photo') {
      setPhotoScale(typeof selectedObject.scaleX === 'number' && selectedObject.scaleX > 0 ? selectedObject.scaleX : 1);
      setPhotoOpacity(typeof selectedObject.opacity === 'number' ? selectedObject.opacity : 1);
      setPhotoCropX(Number(selectedObject.get('cropX' as keyof fabric.Object) || (config as { cropX?: number }).cropX || 0));
      setPhotoCropY(Number(selectedObject.get('cropY' as keyof fabric.Object) || (config as { cropY?: number }).cropY || 0));
    }
    if (typeof (config as { rotationX?: unknown }).rotationX === 'number') setRotationX((config as { rotationX: number }).rotationX);
    if (typeof (config as { rotationY?: unknown }).rotationY === 'number') setRotationY((config as { rotationY: number }).rotationY);
    if (typeof (config as { rotationZ?: unknown }).rotationZ === 'number') setRotationZ((config as { rotationZ: number }).rotationZ);
    if (typeof (config as { duration?: unknown }).duration === 'number') setMediaDuration((config as { duration: number }).duration);
    if (typeof (config as { loop?: unknown }).loop === 'boolean') setMediaLoop((config as { loop: boolean }).loop);
    if (typeof (config as { speed?: unknown }).speed === 'number') setAnimationSpeed((config as { speed: number }).speed);
    setFormTitle(typeof (config as { title?: unknown }).title === 'string' ? (config as { title: string }).title : nextMetadata?.displayName || '');
    setFormSubmitLabel(typeof (config as { submitLabel?: unknown }).submitLabel === 'string' ? (config as { submitLabel: string }).submitLabel : 'Submit');
  }, [selectedObject]);

  if (!metadata) return null;

  const commitMetadata = (patch: Partial<ElementMetadata>, configPatch: Record<string, unknown> = {}) => {
    if (!canvas) return;
    const nextMetadata: ElementMetadata = {
      ...metadata,
      ...patch,
      config: {
        ...(metadata.config || {}),
        ...configPatch,
      },
    };
    setObjectMetadata(selectedObject, nextMetadata);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    saveHistory();
  };

  const commitDisplayName = () => {
    const nextName = displayName.trim() || metadata.displayName;
    setDisplayName(nextName);
    commitMetadata({ displayName: nextName });
  };

  const applyPalette = (primary: string, secondary: string) => {
    if (!canvas) return;
    setAccentColor(primary);
    setSecondaryColor(secondary);
    forEachEditableObject(selectedObject, (child, index) => {
      if (child.type === 'image') return;
      if (isTextObject(child)) {
        child.set('fill', index < 2 ? '#18181b' : primary);
        return;
      }
      const currentFill = child.get('fill' as keyof fabric.Object);
      const currentStroke = child.get('stroke' as keyof fabric.Object);
      if (currentFill && currentFill !== 'transparent') child.set('fill', index % 2 ? secondary : primary);
      if (currentStroke) child.set('stroke', primary);
    });
    commitMetadata({}, { accentColor: primary, secondaryColor: secondary });
  };

  const applyFrameStyle = () => {
    if (!canvas) return;
    forEachEditableObject(selectedObject, (child) => {
      if (child.get('stroke' as keyof fabric.Object)) {
        child.set({ stroke: accentColor, strokeWidth: frameBorderWidth } as Record<string, unknown>);
      }
    });
    commitMetadata({}, { borderColor: accentColor, borderWidth: frameBorderWidth });
  };

  const applyFrameLabel = () => {
    if (!canvas) return;
    const label = frameLabel.trim() || 'Drop image here';
    getChildObjects(selectedObject).some((child) => setTextValue(child, label));
    commitMetadata({}, { placeholder: label });
  };

  const applyShapeStyle = () => {
    if (!canvas) return;
    const dashArray = shapeDashedStroke ? [12, 8] : undefined;
    forEachEditableObject(selectedObject, (child) => {
      if (child.type !== 'line') child.set('fill' as keyof fabric.Object, accentColor);
      child.set({
        stroke: secondaryColor,
        strokeWidth: shapeStrokeWidth,
        strokeDashArray: dashArray,
      } as Record<string, unknown>);
      if (child.type === 'rect') {
        child.set({ rx: shapeCornerRadius, ry: shapeCornerRadius } as Record<string, unknown>);
      }
    });
    commitMetadata({}, {
      fill: accentColor,
      stroke: secondaryColor,
      strokeWidth: shapeStrokeWidth,
      strokeDashArray: dashArray,
      cornerRadius: shapeCornerRadius,
    });
  };

  const applyPhotoAdjustments = () => {
    if (!canvas) return;
    selectedObject.set({
      opacity: photoOpacity,
      scaleX: photoScale,
      scaleY: photoScale,
    } as Record<string, unknown>);
    if (selectedObject.type === 'image') {
      selectedObject.set({
        cropX: Math.max(0, photoCropX),
        cropY: Math.max(0, photoCropY),
      } as Record<string, unknown>);
    }
    selectedObject.setCoords();
    commitMetadata({}, {
      cropX: Math.max(0, photoCropX),
      cropY: Math.max(0, photoCropY),
      imageScale: photoScale,
      opacity: photoOpacity,
    });
  };

  const fitPhotoToCanvas = () => {
    if (!canvas) return;
    const imageWidth = Number(selectedObject.get('naturalWidth' as keyof fabric.Object) || selectedObject.width || 1);
    const imageHeight = Number(selectedObject.get('naturalHeight' as keyof fabric.Object) || selectedObject.height || 1);
    const nextScale = Math.min((canvas.getWidth() * 0.72) / imageWidth, (canvas.getHeight() * 0.72) / imageHeight, 1);
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
    setPhotoScale(safeScale);
    setPhotoOpacity(1);
    selectedObject.set({
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: 'center',
      originY: 'center',
      scaleX: safeScale,
      scaleY: safeScale,
      opacity: 1,
    } as Record<string, unknown>);
    selectedObject.setCoords();
    commitMetadata({}, { imageScale: safeScale, opacity: 1 });
  };

  const resetPhotoCrop = () => {
    if (!canvas) return;
    setPhotoCropX(0);
    setPhotoCropY(0);
    if (selectedObject.type === 'image') {
      selectedObject.set({ cropX: 0, cropY: 0 } as Record<string, unknown>);
    }
    selectedObject.setCoords();
    commitMetadata({}, { cropX: 0, cropY: 0 });
  };

  const applyChartTitle = () => {
    if (!canvas) return;
    const title = chartTitle.trim() || metadata.displayName;
    getChildObjects(selectedObject).some((child) => setTextValue(child, title));
    commitMetadata({ displayName: title }, { title });
  };

  const applyChartValues = () => {
    if (!canvas) return;
    const values = parseValues(chartValues);
    if (!values.length) return;
    const maxValue = Math.max(...values, 1);
    const bars = getChildObjects(selectedObject).filter((child) => child.type === 'rect' && Number(child.width) <= 60 && Number(child.height) > 8);
    bars.slice(0, values.length).forEach((bar, index) => {
      const height = Math.max(12, (values[index] / maxValue) * 132);
      bar.set({
        top: 206 - height,
        height,
        fill: index % 2 ? secondaryColor : accentColor,
      } as Record<string, unknown>);
    });
    commitMetadata({}, { values, accentColor, secondaryColor });
  };

  const apply3DRotation = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!canvas) return;
    const nextX = axis === 'x' ? value : rotationX;
    const nextY = axis === 'y' ? value : rotationY;
    const nextZ = axis === 'z' ? value : rotationZ;
    setRotationX(nextX);
    setRotationY(nextY);
    setRotationZ(nextZ);
    selectedObject.set({
      skewY: nextX / 8,
      skewX: nextY / 8,
      angle: nextZ,
    } as Record<string, unknown>);
    commitMetadata({}, { rotationX: nextX, rotationY: nextY, rotationZ: nextZ });
  };

  const applyMediaConfig = () => {
    if (!canvas) return;
    const label = `${Math.max(1, mediaDuration)}s • managed-preview`;
    const durationText = getChildObjects(selectedObject).filter(isTextObject).slice(-1)[0];
    if (durationText) setTextValue(durationText, label);
    commitMetadata({}, { duration: Math.max(1, mediaDuration), loop: mediaLoop });
  };

  const previewMotion = () => {
    if (!canvas) return;
    const startScaleX = selectedObject.scaleX || 1;
    const startScaleY = selectedObject.scaleY || 1;
    fabric.util.animate({
      startValue: 0,
      endValue: 1,
      duration: Math.max(220, 720 / Math.max(0.25, animationSpeed)),
      easing: fabric.util.ease.easeOutCubic,
      onChange: (value) => {
        const pulse = value < 0.5 ? 1 + value * 0.12 : 1.12 - (value - 0.5) * 0.24;
        selectedObject.set({ scaleX: startScaleX * pulse, scaleY: startScaleY * pulse });
        selectedObject.setCoords();
        canvas.requestRenderAll();
      },
      onComplete: () => {
        selectedObject.set({ scaleX: startScaleX, scaleY: startScaleY });
        selectedObject.setCoords();
        canvas.requestRenderAll();
      },
    });
  };

  const applyAnimationConfig = () => {
    if (!canvas) return;
    commitMetadata({}, { speed: animationSpeed, loop: mediaLoop, currentTime: 0 });
  };

  const applyFormLabels = () => {
    if (!canvas) return;
    const texts = getChildObjects(selectedObject).filter(isTextObject);
    const title = formTitle.trim() || metadata.displayName;
    const submitLabel = formSubmitLabel.trim() || 'Submit';
    if (texts[0]) setTextValue(texts[0], title);
    if (texts[texts.length - 1]) setTextValue(texts[texts.length - 1], submitLabel);
    commitMetadata({ displayName: title }, { title, submitLabel });
  };

  const appendTableRow = () => {
    if (!canvas || selectedObject.type !== 'group') return;
    const config = metadata.config || {};
    const rows = typeof config.rows === 'number' ? config.rows : 1;
    const columns = typeof config.columns === 'number' ? config.columns : 1;
    const cells = Array.isArray(config.cells) ? config.cells as Array<Array<{ text?: string; background?: string; color?: string }>> : [];
    const cellWidth = 92;
    const cellHeight = 44;
    const rowIndex = rows;
    const group = selectedObject as fabric.Group & { addWithUpdate?: (object: fabric.Object) => fabric.Group };
    const nextRow = Array.from({ length: columns }, (_, columnIndex) => ({
      text: `Cell ${rowIndex + 1}.${columnIndex + 1}`,
      background: rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
      color: '#18181b',
    }));
    nextRow.forEach((cell, columnIndex) => {
      const rect = new fabric.Rect({ left: columnIndex * cellWidth, top: rowIndex * cellHeight, width: cellWidth, height: cellHeight, fill: cell.background, stroke: String(config.borderColor || '#d4d4d8'), strokeWidth: Number(config.borderWidth || 1) });
      const text = new fabric.Textbox(cell.text, { left: columnIndex * cellWidth + 8, top: rowIndex * cellHeight + 12, width: cellWidth - 16, fontSize: 13, fill: cell.color, fontFamily: 'Outfit' });
      group.addWithUpdate?.(rect);
      group.addWithUpdate?.(text);
    });
    commitMetadata({}, { ...config, rows: rows + 1, columns, cells: [...cells, nextRow] });
  };

  const appendTableColumn = () => {
    if (!canvas || selectedObject.type !== 'group') return;
    const config = metadata.config || {};
    const rows = typeof config.rows === 'number' ? config.rows : 1;
    const columns = typeof config.columns === 'number' ? config.columns : 1;
    const cells = Array.isArray(config.cells) ? config.cells as Array<Array<{ text?: string; background?: string; color?: string }>> : [];
    const cellWidth = 92;
    const cellHeight = 44;
    const columnIndex = columns;
    const group = selectedObject as fabric.Group & { addWithUpdate?: (object: fabric.Object) => fabric.Group };
    const nextCells = Array.from({ length: rows }, (_, rowIndex) => {
      const cell = {
        text: rowIndex === 0 ? `Header ${columnIndex + 1}` : `Cell ${rowIndex + 1}.${columnIndex + 1}`,
        background: rowIndex === 0 ? String(config.borderColor || '#8b5cf6') : rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
        color: rowIndex === 0 ? '#ffffff' : '#18181b',
      };
      const rect = new fabric.Rect({ left: columnIndex * cellWidth, top: rowIndex * cellHeight, width: cellWidth, height: cellHeight, fill: cell.background, stroke: String(config.borderColor || '#d4d4d8'), strokeWidth: Number(config.borderWidth || 1) });
      const text = new fabric.Textbox(cell.text, { left: columnIndex * cellWidth + 8, top: rowIndex * cellHeight + 12, width: cellWidth - 16, fontSize: 13, fill: cell.color, fontFamily: 'Outfit', fontWeight: rowIndex === 0 ? 'bold' : 'normal' });
      group.addWithUpdate?.(rect);
      group.addWithUpdate?.(text);
      return cell;
    });
    const mergedCells = Array.from({ length: rows }, (_, rowIndex) => [...(cells[rowIndex] || []), nextCells[rowIndex]]);
    commitMetadata({}, { ...config, rows, columns: columns + 1, cells: mergedCells });
  };

  const canUngroup = selectedObject.type === 'group';

  return (
    <>
      <div className="h-[1px] bg-zinc-800" />
      <div className="flex flex-col gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Element</div>
          <div className="mt-1 text-xs font-bold text-zinc-100">{titleCase(metadata.elementKind)} · {metadata.category}</div>
          <div className="mt-1 text-[10px] leading-4 text-zinc-500">{metadata.provider || 'teckstudio'} · {metadata.licence || 'Application-owned editable element'}</div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-zinc-500">Display name</label>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            onBlur={commitDisplayName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-zinc-500">
              Accent
              <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-9 w-full rounded-lg border border-zinc-700 bg-transparent" />
            </label>
            <label className="flex flex-col gap-1 text-[10px] text-zinc-500">
              Secondary
              <input type="color" value={secondaryColor} onChange={(event) => setSecondaryColor(event.target.value)} className="h-9 w-full rounded-lg border border-zinc-700 bg-transparent" />
            </label>
          </div>
          <button type="button" onClick={() => applyPalette(accentColor, secondaryColor)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:border-violet-500/50">
            Apply colours
          </button>
          <div className="grid grid-cols-5 gap-1">
            {palettePresets.map(([primary, secondary]) => (
              <button
                key={`${primary}-${secondary}`}
                type="button"
                onClick={() => applyPalette(primary, secondary)}
                className="h-7 overflow-hidden rounded-md border border-zinc-800"
                title={`${primary} / ${secondary}`}
              >
                <span className="block h-full w-1/2 float-left" style={{ backgroundColor: primary }} />
                <span className="block h-full w-1/2 float-left" style={{ backgroundColor: secondary }} />
              </button>
            ))}
          </div>
        </div>

        {metadata.elementKind === 'photo' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Photo adjustments</div>
            <label className="text-[10px] text-zinc-500">Zoom: {Math.round(photoScale * 100)}%</label>
            <input type="range" min="0.05" max="3" step="0.01" value={photoScale} onChange={(event) => setPhotoScale(Number(event.target.value))} className="accent-violet-500" />
            <label className="text-[10px] text-zinc-500">Opacity: {Math.round(photoOpacity * 100)}%</label>
            <input type="range" min="0.05" max="1" step="0.01" value={photoOpacity} onChange={(event) => setPhotoOpacity(Number(event.target.value))} className="accent-violet-500" />
            {selectedObject.type === 'image' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[10px] text-zinc-500">
                  Crop X
                  <input type="number" min="0" value={photoCropX} onChange={(event) => setPhotoCropX(Number(event.target.value) || 0)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500" />
                </label>
                <label className="flex flex-col gap-1 text-[10px] text-zinc-500">
                  Crop Y
                  <input type="number" min="0" value={photoCropY} onChange={(event) => setPhotoCropY(Number(event.target.value) || 0)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500" />
                </label>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={applyPhotoAdjustments} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply photo</button>
              <button type="button" onClick={fitPhotoToCanvas} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Fit canvas</button>
            </div>
            {selectedObject.type === 'image' && (
              <button type="button" onClick={resetPhotoCrop} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:border-violet-500/50">Reset crop</button>
            )}
            <div className="text-[10px] leading-4 text-zinc-500">Drag the photo to reposition it. If it was dropped into a frame, the saved clip path remains export-safe.</div>
          </div>
        )}

        {metadata.elementKind === 'frame' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <label className="text-[10px] text-zinc-500">Frame border width: {frameBorderWidth}px</label>
            <input type="range" min="0" max="28" value={frameBorderWidth} onChange={(event) => setFrameBorderWidth(Number(event.target.value))} className="accent-violet-500" />
            <button type="button" onClick={applyFrameStyle} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply frame style</button>
            <input value={frameLabel} onChange={(event) => setFrameLabel(event.target.value)} onBlur={applyFrameLabel} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" />
          </div>
        )}

        {metadata.elementKind === 'shape' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Shape style</div>
            <label className="text-[10px] text-zinc-500">Stroke width: {shapeStrokeWidth}px</label>
            <input type="range" min="0" max="28" value={shapeStrokeWidth} onChange={(event) => setShapeStrokeWidth(Number(event.target.value))} className="accent-violet-500" />
            <label className="text-[10px] text-zinc-500">Corner radius: {shapeCornerRadius}px</label>
            <input type="range" min="0" max="80" value={shapeCornerRadius} onChange={(event) => setShapeCornerRadius(Number(event.target.value))} className="accent-violet-500" />
            <label className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
              <input type="checkbox" checked={shapeDashedStroke} onChange={(event) => setShapeDashedStroke(event.target.checked)} className="accent-violet-500" />
              Dashed stroke
            </label>
            <button type="button" onClick={applyShapeStyle} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply shape style</button>
            <div className="text-[10px] leading-4 text-zinc-500">Use the main editor handles for resize, rotate, flip, opacity, shadow and export-safe transforms.</div>
          </div>
        )}

        {metadata.elementKind === 'chart' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <label className="text-[10px] text-zinc-500">Chart title</label>
            <input value={chartTitle} onChange={(event) => setChartTitle(event.target.value)} onBlur={applyChartTitle} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" />
            <label className="text-[10px] text-zinc-500">Values</label>
            <input value={chartValues} onChange={(event) => setChartValues(event.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" />
            <button type="button" onClick={applyChartValues} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply chart data</button>
          </div>
        )}

        {metadata.elementKind === 'table' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Table structure</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={appendTableRow} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Add row</button>
              <button type="button" onClick={appendTableColumn} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Add column</button>
            </div>
            <div className="text-[10px] leading-4 text-zinc-500">Use Convert to editable parts for direct cell text editing.</div>
          </div>
        )}

        {metadata.elementKind === 'form' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <label className="text-[10px] text-zinc-500">Form title</label>
            <input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} onBlur={applyFormLabels} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" />
            <label className="text-[10px] text-zinc-500">Submit button</label>
            <input value={formSubmitLabel} onChange={(event) => setFormSubmitLabel(event.target.value)} onBlur={applyFormLabels} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" />
            <button type="button" onClick={applyFormLabels} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply form labels</button>
          </div>
        )}

        {metadata.elementKind === 'animation' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <label className="text-[10px] text-zinc-500">Speed: {animationSpeed.toFixed(2)}x</label>
            <input type="range" min="0.25" max="3" step="0.25" value={animationSpeed} onChange={(event) => setAnimationSpeed(Number(event.target.value))} className="accent-violet-500" />
            <label className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
              <input type="checkbox" checked={mediaLoop} onChange={(event) => setMediaLoop(event.target.checked)} className="accent-violet-500" />
              Loop animation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={previewMotion} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Preview</button>
              <button type="button" onClick={applyAnimationConfig} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply</button>
            </div>
          </div>
        )}

        {metadata.elementKind === 'three-d' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            {(['x', 'y', 'z'] as const).map((axis) => {
              const value = axis === 'x' ? rotationX : axis === 'y' ? rotationY : rotationZ;
              return (
                <label key={axis} className="flex flex-col gap-1 text-[10px] text-zinc-500">
                  Rotate {axis.toUpperCase()}: {Math.round(value)}°
                  <input type="range" min="-60" max="60" value={value} onChange={(event) => apply3DRotation(axis, Number(event.target.value))} className="accent-violet-500" />
                </label>
              );
            })}
          </div>
        )}

        {metadata.elementKind === 'video' && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <label className="text-[10px] text-zinc-500">Duration: {mediaDuration}s</label>
            <input type="range" min="1" max="120" value={mediaDuration} onChange={(event) => setMediaDuration(Number(event.target.value))} className="accent-violet-500" />
            <label className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
              <input type="checkbox" checked={mediaLoop} onChange={(event) => setMediaLoop(event.target.checked)} className="accent-violet-500" />
              Loop preview
            </label>
            <button type="button" onClick={applyMediaConfig} className="rounded-lg bg-zinc-900 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800">Apply video config</button>
            <button type="button" onClick={previewMotion} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:border-violet-500/50">Preview motion</button>
          </div>
        )}

        {(metadata.elementKind === 'table' || metadata.elementKind === 'form' || metadata.elementKind === 'animation') && canUngroup && (
          <button type="button" onClick={ungroupSelected} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] font-bold text-zinc-200 hover:border-violet-500/50">
            Convert to editable parts
          </button>
        )}
      </div>
    </>
  );
};
