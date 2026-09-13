import { fabric } from 'fabric';
import type { TextEffectConfig, TextEffectType } from '../types/editorFeatures';

type EffectText = fabric.Textbox & {
  path?: fabric.Path | null;
  pathSide?: 'left' | 'right';
  pathStartOffset?: number;
  initDimensions?: () => void;
};

type TextBaseStyle = {
  fill: unknown;
  stroke: unknown;
  strokeWidth: number;
  shadow: unknown;
  backgroundColor: string;
  textBackgroundColor: string;
  paintFirst: string;
};

const TEXT_TYPES = new Set(['text', 'i-text', 'textbox']);
const COMPLEX_EFFECTS = new Set<TextEffectType>(['splice', 'echo', 'glitch', 'threeD']);

const createId = (prefix: string) => (
  window.crypto?.randomUUID ? window.crypto.randomUUID() : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
);

const numberSetting = (settings: Record<string, unknown>, key: string, fallback: number, min: number, max: number) => {
  const value = Number(settings[key]);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

const stringSetting = (settings: Record<string, unknown>, key: string, fallback: string) => (
  typeof settings[key] === 'string' && settings[key] ? String(settings[key]) : fallback
);

const colorWithOpacity = (color: string, opacity: number) => {
  const safeOpacity = Math.min(1, Math.max(0, opacity));
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return color;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${safeOpacity})`;
};

export const isTextEffectSource = (object: fabric.Object | null): object is EffectText => Boolean(
  object && TEXT_TYPES.has(object.type || '') && !object.get('generatedEffectLayer' as keyof fabric.Object),
);

export const defaultTextEffectConfig = (type: TextEffectType): TextEffectConfig => {
  const defaults: Record<TextEffectType, Record<string, unknown>> = {
    none: {},
    shadow: { color: '#111827', opacity: 0.55, blur: 14, offsetX: 8, offsetY: 8 },
    lift: { color: '#000000', opacity: 0.32, blur: 20, offsetX: 0, offsetY: 10 },
    hollow: { color: '#ffffff', strokeWidth: 3 },
    outline: { color: '#111827', strokeWidth: 3 },
    splice: { secondaryColor: '#f59e0b', distance: 7, direction: 45 },
    echo: { secondaryColor: '#8b5cf6', count: 3, distance: 7, direction: 45, opacity: 0.7 },
    glitch: { redColor: '#ef4444', cyanColor: '#22d3ee', strength: 5 },
    neon: { color: '#67e8f9', glowColor: '#22d3ee', glowBlur: 28, strokeWidth: 1 },
    glow: { glowColor: '#a855f7', opacity: 0.8, glowBlur: 28 },
    gradient: { colors: ['#8b5cf6', '#ec4899'], angle: 0 },
    background: { color: '#7c3aed', opacity: 0.35 },
    curve: { curve: 80, direction: 'up' },
    threeD: { frontColor: '#ffffff', extrusionColor: '#4c1d95', depth: 6, direction: 45 },
  };
  return { type, settings: { ...defaults[type] } };
};

const ensureSourceId = (source: fabric.Object) => {
  const current = source.get('id' as keyof fabric.Object);
  if (typeof current === 'string' && current) return current;
  const id = createId('text');
  source.set({ id } as Record<string, unknown>);
  return id;
};

const readBaseStyle = (source: EffectText): TextBaseStyle => ({
  fill: source.get('fill'),
  stroke: source.get('stroke'),
  strokeWidth: Number(source.get('strokeWidth') || 0),
  shadow: source.shadow && typeof source.shadow === 'object' && 'toObject' in source.shadow
    ? (source.shadow as fabric.Shadow).toObject()
    : source.shadow || null,
  backgroundColor: String(source.get('backgroundColor') || ''),
  textBackgroundColor: String(source.get('textBackgroundColor' as keyof fabric.Object) || ''),
  paintFirst: String(source.get('paintFirst' as keyof fabric.Object) || 'fill'),
});

const restoreBaseStyle = (source: EffectText, base: TextBaseStyle) => {
  source.set({
    fill: base.fill as fabric.Gradient | fabric.Pattern | string,
    stroke: base.stroke as string,
    strokeWidth: base.strokeWidth,
    shadow: base.shadow ? new fabric.Shadow(base.shadow as fabric.IShadowOptions) : undefined,
    backgroundColor: base.backgroundColor,
    textBackgroundColor: base.textBackgroundColor,
    paintFirst: base.paintFirst,
    path: undefined,
    pathSide: 'left',
    pathStartOffset: 0,
  } as Record<string, unknown>);
};

const sourceIdOf = (object: fabric.Object) => String(object.get('id' as keyof fabric.Object) || '');

export const removeGeneratedTextEffectLayers = (canvas: fabric.Canvas, sourceId: string) => {
  const generated = canvas.getObjects().filter((object) => (
    object.get('generatedEffectLayer' as keyof fabric.Object) === true
    && object.get('sourceObjectId' as keyof fabric.Object) === sourceId
  ));
  generated.forEach((object) => canvas.remove(object));
};

const rotatedOffset = (source: fabric.Object, offsetX: number, offsetY: number) => {
  const radians = fabric.util.degreesToRadians(source.angle || 0);
  return {
    left: (source.left || 0) + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    top: (source.top || 0) + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
  };
};

const copyTextGeometry = (source: EffectText, target: EffectText, offsetX: number, offsetY: number) => {
  const position = rotatedOffset(source, offsetX, offsetY);
  target.set({
    text: source.text,
    left: position.left,
    top: position.top,
    originX: source.originX,
    originY: source.originY,
    width: source.width,
    scaleX: source.scaleX,
    scaleY: source.scaleY,
    skewX: source.skewX,
    skewY: source.skewY,
    flipX: source.flipX,
    flipY: source.flipY,
    angle: source.angle,
    fontFamily: source.fontFamily,
    fontSize: source.fontSize,
    fontWeight: source.fontWeight,
    fontStyle: source.fontStyle,
    underline: source.underline,
    linethrough: source.linethrough,
    overline: source.overline,
    textAlign: source.textAlign,
    charSpacing: source.charSpacing,
    lineHeight: source.lineHeight,
    visible: source.visible,
  });
  target.initDimensions?.();
  target.setCoords();
};

const generatedLayerStyle = (source: EffectText, layer: EffectText, config: TextEffectConfig, index: number) => {
  const settings = config.settings;
  const sourceOpacity = Number(source.opacity ?? 1);
  if (config.type === 'splice') {
    layer.set({
      fill: stringSetting(settings, 'secondaryColor', '#f59e0b'),
      stroke: undefined,
      strokeWidth: 0,
      shadow: undefined,
      opacity: sourceOpacity,
    });
  } else if (config.type === 'echo') {
    const count = numberSetting(settings, 'count', 3, 1, 5);
    const opacity = numberSetting(settings, 'opacity', 0.7, 0.1, 1);
    layer.set({
      fill: stringSetting(settings, 'secondaryColor', '#8b5cf6'),
      stroke: undefined,
      strokeWidth: 0,
      shadow: undefined,
      opacity: sourceOpacity * opacity * ((count - index + 1) / count),
    });
  } else if (config.type === 'glitch') {
    layer.set({
      fill: index === 1
        ? stringSetting(settings, 'redColor', '#ef4444')
        : stringSetting(settings, 'cyanColor', '#22d3ee'),
      stroke: undefined,
      strokeWidth: 0,
      shadow: undefined,
      opacity: sourceOpacity * 0.78,
    });
  } else if (config.type === 'threeD') {
    layer.set({
      fill: stringSetting(settings, 'extrusionColor', '#4c1d95'),
      stroke: undefined,
      strokeWidth: 0,
      shadow: undefined,
      opacity: sourceOpacity,
    });
  }
};

const layerOffsets = (config: TextEffectConfig) => {
  const settings = config.settings;
  if (config.type === 'glitch') {
    const strength = numberSetting(settings, 'strength', 5, 1, 14);
    return [{ x: -strength, y: 0 }, { x: strength, y: 0 }];
  }
  const direction = fabric.util.degreesToRadians(numberSetting(settings, 'direction', 45, -180, 180));
  if (config.type === 'splice') {
    const distance = numberSetting(settings, 'distance', 7, 1, 24);
    return [{ x: Math.cos(direction) * distance, y: Math.sin(direction) * distance }];
  }
  if (config.type === 'echo') {
    const count = numberSetting(settings, 'count', 3, 1, 5);
    const distance = numberSetting(settings, 'distance', 7, 1, 24);
    return Array.from({ length: count }, (_, index) => ({
      x: Math.cos(direction) * distance * (index + 1),
      y: Math.sin(direction) * distance * (index + 1),
    }));
  }
  if (config.type === 'threeD') {
    const depth = numberSetting(settings, 'depth', 6, 1, 12);
    return Array.from({ length: depth }, (_, index) => ({
      x: Math.cos(direction) * (index + 1),
      y: Math.sin(direction) * (index + 1),
    }));
  }
  return [];
};

const cloneText = (source: EffectText) => new Promise<EffectText>((resolve) => {
  source.clone((cloned: fabric.Object) => resolve(cloned as EffectText));
});

const buildGeneratedLayers = async (canvas: fabric.Canvas, source: EffectText, config: TextEffectConfig) => {
  const sourceId = ensureSourceId(source);
  const groupId = createId('text_effect');
  source.set({ effectGroupId: groupId, effectGroupRole: 'source' } as Record<string, unknown>);
  const sourceIndex = Math.max(0, canvas.getObjects().indexOf(source));
  const offsets = layerOffsets(config);

  for (let index = offsets.length - 1; index >= 0; index -= 1) {
    const offset = offsets[index];
    const layer = await cloneText(source);
    layer.set({
      id: createId('effect_layer'),
      name: `Effect: ${config.type}`,
      textEffectConfig: undefined,
      textEffectBaseStyle: undefined,
      generatedEffectLayer: true,
      sourceObjectId: sourceId,
      effectGroupId: groupId,
      effectGroupRole: config.type,
      effectLayerIndex: index + 1,
      effectOffsetX: offset.x,
      effectOffsetY: offset.y,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hoverCursor: 'default',
    } as Record<string, unknown>);
    copyTextGeometry(source, layer, offset.x, offset.y);
    generatedLayerStyle(source, layer, config, index + 1);
    canvas.insertAt(layer, sourceIndex, false);
  }
};

const applyPrimaryEffect = (source: EffectText, config: TextEffectConfig) => {
  const settings = config.settings;
  if (config.type === 'shadow' || config.type === 'lift') {
    const fallback = config.type === 'lift' ? defaultTextEffectConfig('lift').settings : defaultTextEffectConfig('shadow').settings;
    const color = stringSetting(settings, 'color', String(fallback.color));
    const opacity = numberSetting(settings, 'opacity', Number(fallback.opacity), 0, 1);
    source.set('shadow', new fabric.Shadow({
      color: colorWithOpacity(color, opacity),
      blur: numberSetting(settings, 'blur', Number(fallback.blur), 0, 60),
      offsetX: numberSetting(settings, 'offsetX', Number(fallback.offsetX), -40, 40),
      offsetY: numberSetting(settings, 'offsetY', Number(fallback.offsetY), -40, 40),
    }));
  } else if (config.type === 'outline') {
    source.set({
      stroke: stringSetting(settings, 'color', '#111827'),
      strokeWidth: numberSetting(settings, 'strokeWidth', 3, 1, 12),
      paintFirst: 'stroke',
    } as Record<string, unknown>);
  } else if (config.type === 'hollow') {
    source.set({
      fill: 'rgba(0,0,0,0)',
      stroke: stringSetting(settings, 'color', '#ffffff'),
      strokeWidth: numberSetting(settings, 'strokeWidth', 3, 1, 12),
      paintFirst: 'stroke',
    } as Record<string, unknown>);
  } else if (config.type === 'glow') {
    const opacity = numberSetting(settings, 'opacity', 0.8, 0, 1);
    const glowColor = stringSetting(settings, 'glowColor', '#a855f7');
    source.set('shadow', new fabric.Shadow({
      color: colorWithOpacity(glowColor, opacity),
      blur: numberSetting(settings, 'glowBlur', 28, 0, 60),
      offsetX: 0,
      offsetY: 0,
    }));
  } else if (config.type === 'neon') {
    const color = stringSetting(settings, 'color', '#67e8f9');
    const glowColor = stringSetting(settings, 'glowColor', '#22d3ee');
    source.set({
      fill: color,
      stroke: glowColor,
      strokeWidth: numberSetting(settings, 'strokeWidth', 1, 0, 5),
      shadow: new fabric.Shadow({ color: glowColor, blur: numberSetting(settings, 'glowBlur', 28, 0, 60), offsetX: 0, offsetY: 0 }),
    });
  } else if (config.type === 'gradient') {
    const colors = Array.isArray(settings.colors)
      ? settings.colors.filter((color): color is string => typeof color === 'string').slice(0, 8)
      : ['#8b5cf6', '#ec4899'];
    const safeColors = colors.length >= 2 ? colors : ['#8b5cf6', '#ec4899'];
    const angle = fabric.util.degreesToRadians(numberSetting(settings, 'angle', 0, -180, 180));
    const width = Math.max(1, source.width || 400);
    const height = Math.max(1, source.height || Number(source.fontSize || 40));
    const centerX = width / 2;
    const centerY = height / 2;
    source.set('fill', new fabric.Gradient({
      type: 'linear',
      coords: {
        x1: centerX - Math.cos(angle) * width / 2,
        y1: centerY - Math.sin(angle) * height / 2,
        x2: centerX + Math.cos(angle) * width / 2,
        y2: centerY + Math.sin(angle) * height / 2,
      },
      colorStops: safeColors.map((color, index) => ({ offset: index / (safeColors.length - 1), color })),
    }));
  } else if (config.type === 'background') {
    const color = stringSetting(settings, 'color', '#7c3aed');
    const opacity = numberSetting(settings, 'opacity', 0.35, 0, 1);
    source.set('textBackgroundColor', colorWithOpacity(color, opacity));
  } else if (config.type === 'curve') {
    const width = Math.max(160, source.width || 400);
    const curve = numberSetting(settings, 'curve', 80, 20, 220);
    const direction = stringSetting(settings, 'direction', 'up');
    const controlY = direction === 'down' ? curve : -curve;
    source.set({
      path: new fabric.Path(`M 0 0 Q ${width / 2} ${controlY} ${width} 0`, { visible: false }),
      pathSide: direction === 'down' ? 'right' : 'left',
      pathStartOffset: 0,
    } as Record<string, unknown>);
  } else if (config.type === 'threeD') {
    source.set('fill', stringSetting(settings, 'frontColor', '#ffffff'));
  }
};

export const syncGeneratedTextEffectLayers = (canvas: fabric.Canvas, source: fabric.Object) => {
  if (!isTextEffectSource(source)) return;
  const config = source.get('textEffectConfig' as keyof fabric.Object) as TextEffectConfig | undefined;
  if (!config || !COMPLEX_EFFECTS.has(config.type)) return;
  const sourceId = sourceIdOf(source);
  canvas.getObjects().forEach((candidate) => {
    if (candidate.get('sourceObjectId' as keyof fabric.Object) !== sourceId) return;
    const layer = candidate as EffectText;
    const offsetX = Number(layer.get('effectOffsetX' as keyof fabric.Object) || 0);
    const offsetY = Number(layer.get('effectOffsetY' as keyof fabric.Object) || 0);
    const index = Number(layer.get('effectLayerIndex' as keyof fabric.Object) || 1);
    copyTextGeometry(source, layer, offsetX, offsetY);
    generatedLayerStyle(source, layer, config, index);
  });
};

export const applyTextEffect = async (canvas: fabric.Canvas, source: fabric.Object, config: TextEffectConfig) => {
  if (!isTextEffectSource(source)) throw new Error('Select an editable text layer first.');
  const sourceId = ensureSourceId(source);
  const existingBase = source.get('textEffectBaseStyle' as keyof fabric.Object) as TextBaseStyle | undefined;
  const base = existingBase || readBaseStyle(source);
  removeGeneratedTextEffectLayers(canvas, sourceId);
  restoreBaseStyle(source, base);

  if (config.type === 'none') {
    source.set({
      textEffectConfig: undefined,
      textEffectBaseStyle: undefined,
      effectGroupId: undefined,
      effectGroupRole: undefined,
    } as Record<string, unknown>);
  } else {
    source.set({
      textEffectConfig: config,
      textEffectBaseStyle: base,
      effectGroupRole: 'source',
    } as Record<string, unknown>);
    applyPrimaryEffect(source, config);
    source.initDimensions?.();
    source.setCoords();
    if (COMPLEX_EFFECTS.has(config.type)) await buildGeneratedLayers(canvas, source, config);
  }
  canvas.setActiveObject(source);
  canvas.requestRenderAll();
};

export const rehydrateTextEffects = async (canvas: fabric.Canvas) => {
  const sources = canvas.getObjects().filter(isTextEffectSource);
  for (const source of sources) {
    const config = source.get('textEffectConfig' as keyof fabric.Object) as TextEffectConfig | undefined;
    if (!config || !COMPLEX_EFFECTS.has(config.type)) continue;
    const sourceId = sourceIdOf(source);
    const layers = canvas.getObjects().filter((candidate) => candidate.get('sourceObjectId' as keyof fabric.Object) === sourceId);
    if (layers.length === 0) await buildGeneratedLayers(canvas, source, config);
    else syncGeneratedTextEffectLayers(canvas, source);
  }
};

export const installTextEffectSynchronization = (canvas: fabric.Canvas) => {
  const sync = (event: fabric.IEvent) => {
    const target = event.target as fabric.Object | undefined;
    if (!target || target.get('generatedEffectLayer' as keyof fabric.Object)) return;
    syncGeneratedTextEffectLayers(canvas, target);
    canvas.requestRenderAll();
  };
  const removeLinked = (event: fabric.IEvent) => {
    const target = event.target as fabric.Object | undefined;
    if (!target || target.get('generatedEffectLayer' as keyof fabric.Object)) return;
    const sourceId = sourceIdOf(target);
    if (sourceId) removeGeneratedTextEffectLayers(canvas, sourceId);
  };
  canvas.on('object:moving', sync);
  canvas.on('object:scaling', sync);
  canvas.on('object:rotating', sync);
  canvas.on('object:modified', sync);
  canvas.on('text:changed', sync);
  canvas.on('object:removed', removeLinked);
  return () => {
    canvas.off('object:moving', sync);
    canvas.off('object:scaling', sync);
    canvas.off('object:rotating', sync);
    canvas.off('object:modified', sync);
    canvas.off('text:changed', sync);
    canvas.off('object:removed', removeLinked);
  };
};
