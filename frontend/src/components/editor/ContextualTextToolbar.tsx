import React from 'react';
import { fabric } from 'fabric';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Blend,
  Bold,
  CaseSensitive,
  Film,
  Italic,
  Layers,
  List,
  ListOrdered,
  Minus,
  PaintRoller,
  Plus,
  Sparkles,
  Strikethrough,
  Type,
  Underline,
  WandSparkles,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import type { FabricObjectAnimationType } from '../../types/timeline';
import type { TextEffectType } from '../../types/editorFeatures';
import { ensureFontLoaded } from '../../utils/fontLoader';
import { applyTextEffect, defaultTextEffectConfig } from '../../utils/textEffects';
import {
  alignObjectToPage,
  clampFontSize,
  isEditableTextObject,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  transformTextCase,
} from '../../utils/textSelectionStyles';
import { moveLayerObject, type LayerOrderAction } from '../../utils/layerOrdering';
import { applyAnimationToSelectedObject } from '../../utils/editorAnimationLibrary';

type TextToolbarPosition = {
  left: number;
  top: number;
};

type CopiedTextStyle = {
  fontFamily?: unknown;
  fontSize?: unknown;
  fontWeight?: unknown;
  fontStyle?: unknown;
  underline?: unknown;
  linethrough?: unknown;
  fill?: unknown;
  textAlign?: unknown;
  charSpacing?: unknown;
  lineHeight?: unknown;
  opacity?: unknown;
  stroke?: unknown;
  strokeWidth?: unknown;
  shadow?: unknown;
  textBackgroundColor?: unknown;
  backgroundColor?: unknown;
  paintFirst?: unknown;
};

type ContextualTextToolbarProps = {
  position: TextToolbarPosition;
  textTargets: fabric.Object[];
};

const FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
  'League Spartan',
  'Space Mono',
  'Roboto Mono',
  'IBM Plex Mono',
  'Outfit',
  'Fredoka',
  'Nunito',
  'Arial',
  'Helvetica',
];

const ANIMATION_OPTIONS: Array<{ label: string; value: FabricObjectAnimationType }> = [
  { label: 'Fade', value: 'fade-in' },
  { label: 'Slide Up', value: 'slide-up' },
  { label: 'Slide Left', value: 'slide-left' },
  { label: 'Slide Right', value: 'slide-right' },
  { label: 'Scale', value: 'scale-in' },
  { label: 'Typewriter', value: 'typewriter' },
  { label: 'Character Reveal', value: 'character-reveal' },
  { label: 'Pop', value: 'pop-in' },
  { label: 'Rise', value: 'rise' },
];

const EFFECT_OPTIONS: Array<{ label: string; value: TextEffectType }> = [
  { label: 'None', value: 'none' },
  { label: 'Shadow', value: 'shadow' },
  { label: 'Lift', value: 'lift' },
  { label: 'Outline', value: 'outline' },
  { label: 'Glow', value: 'glow' },
  { label: 'Background', value: 'background' },
  { label: 'Neon', value: 'neon' },
  { label: 'Hollow', value: 'hollow' },
  { label: 'Offset', value: 'lift' },
];

const toolbarButtonClass = 'flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-[10px] font-bold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white';
const activeButtonClass = 'bg-violet-600/25 text-violet-200 ring-1 ring-violet-500/30';
const fieldClass = 'h-8 shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-[10px] font-semibold text-zinc-100 outline-none focus:border-violet-500';

const valueOf = (object: fabric.Object, property: string) => object.get(property as keyof fabric.Object);

const getTextObjects = (targets: fabric.Object[]) => targets.filter(isEditableTextObject);

const commonValue = <T,>(targets: fabric.Object[], reader: (object: fabric.Object) => T, fallback: T): T | 'Mixed' => {
  if (targets.length === 0) return fallback;
  const values = targets.map(reader);
  const first = values[0] ?? fallback;
  return values.every((value) => value === first) ? first : 'Mixed';
};

const colorValue = (value: unknown, fallback = '#ffffff') => (
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
);

const normalizeLines = (text: string) => text
  .split(/\r?\n/)
  .map((line) => line.replace(/^\s*(?:[•\-*]\s+|\d+\.\s+)/, '').trim())
  .filter(Boolean);

const toTitleCase = (text: string) => text.toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());

const toSentenceCase = (text: string) => text
  .toLowerCase()
  .replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (value) => value.toUpperCase());

const copyStyleFrom = (object: fabric.Object): CopiedTextStyle => ({
  fontFamily: valueOf(object, 'fontFamily'),
  fontSize: valueOf(object, 'fontSize'),
  fontWeight: valueOf(object, 'fontWeight'),
  fontStyle: valueOf(object, 'fontStyle'),
  underline: valueOf(object, 'underline'),
  linethrough: valueOf(object, 'linethrough'),
  fill: valueOf(object, 'fill'),
  textAlign: valueOf(object, 'textAlign'),
  charSpacing: valueOf(object, 'charSpacing'),
  lineHeight: valueOf(object, 'lineHeight'),
  opacity: valueOf(object, 'opacity'),
  stroke: valueOf(object, 'stroke'),
  strokeWidth: valueOf(object, 'strokeWidth'),
  shadow: object.shadow && typeof object.shadow === 'object' && 'toObject' in object.shadow
    ? (object.shadow as fabric.Shadow).toObject()
    : object.shadow,
  textBackgroundColor: valueOf(object, 'textBackgroundColor'),
  backgroundColor: valueOf(object, 'backgroundColor'),
  paintFirst: valueOf(object, 'paintFirst'),
});

export const ContextualTextToolbar: React.FC<ContextualTextToolbarProps> = ({ position, textTargets }) => {
  const {
    canvas,
    selectedObject,
    selectedObjectId,
    saveHistory,
    setSelectedObject,
    bumpSelectionAnimation,
    textSelectionRange,
  } = useEditorStore();
  const [openPanel, setOpenPanel] = React.useState<string | null>(null);
  const [fontSizeDraft, setFontSizeDraft] = React.useState('');
  const [copiedStyle, setCopiedStyle] = React.useState<CopiedTextStyle | null>(null);
  const [message, setMessage] = React.useState('');
  const [, forceToolbarSync] = React.useReducer((value: number) => value + 1, 0);
  const targets = React.useMemo(() => getTextObjects(textTargets), [textTargets]);

  const fontFamily = commonValue(targets, (object) => String(valueOf(object, 'fontFamily') || 'Inter'), 'Inter');
  const fontSize = commonValue(targets, (object) => Number(valueOf(object, 'fontSize') || 40), 40);
  const fill = commonValue(targets, (object) => valueOf(object, 'fill'), '#ffffff');
  const fontWeight = commonValue(targets, (object) => String(valueOf(object, 'fontWeight') || 'normal'), 'normal');
  const fontStyle = commonValue(targets, (object) => String(valueOf(object, 'fontStyle') || 'normal'), 'normal');
  const underline = commonValue(targets, (object) => Boolean(valueOf(object, 'underline')), false);
  const linethrough = commonValue(targets, (object) => Boolean(valueOf(object, 'linethrough')), false);
  const textAlign = commonValue(targets, (object) => String(valueOf(object, 'textAlign') || 'left'), 'left');
  const charSpacing = commonValue(targets, (object) => Number(valueOf(object, 'charSpacing') || 0), 0);
  const lineHeight = commonValue(targets, (object) => Number(valueOf(object, 'lineHeight') || 1.16), 1.16);
  const opacity = commonValue(targets, (object) => Number(object.opacity ?? 1), 1);
  const activeEffect = commonValue(targets, (object) => String((valueOf(object, 'textEffectConfig') as { type?: string } | undefined)?.type || 'none'), 'none');
  const activeAnimation = commonValue(targets, (object) => {
    const animations = valueOf(object, 'objectAnimations') as Array<{ type?: string }> | undefined;
    const legacy = valueOf(object, 'animationConfig') as { animationType?: string } | undefined;
    return String(animations?.[0]?.type || legacy?.animationType || 'none');
  }, 'none');

  React.useEffect(() => {
    setFontSizeDraft(fontSize === 'Mixed' ? '' : String(fontSize));
  }, [fontSize]);

  React.useEffect(() => {
    if (!canvas) return;
    const syncFromFabricSelection = () => forceToolbarSync();
    canvas.on('selection:created', syncFromFabricSelection);
    canvas.on('selection:updated', syncFromFabricSelection);
    canvas.on('selection:cleared', syncFromFabricSelection);
    canvas.on('object:modified', syncFromFabricSelection);
    canvas.on('text:changed', syncFromFabricSelection);
    return () => {
      canvas.off('selection:created', syncFromFabricSelection);
      canvas.off('selection:updated', syncFromFabricSelection);
      canvas.off('selection:cleared', syncFromFabricSelection);
      canvas.off('object:modified', syncFromFabricSelection);
      canvas.off('text:changed', syncFromFabricSelection);
    };
  }, [canvas]);

  if (!canvas || targets.length === 0 || !selectedObject) return null;

  const commitTargets = (commitHistory = true) => {
    targets.forEach((object) => {
      if (isEditableTextObject(object)) object.initDimensions?.();
      object.setCoords();
    });
    if (selectedObject.type === 'activeSelection') selectedObject.setCoords();
    canvas.requestRenderAll();
    setSelectedObject(selectedObject);
    forceToolbarSync();
    if (commitHistory) saveHistory();
  };

  const applyStyles = (styles: Record<string, unknown>, commitHistory = true) => {
    targets.forEach((object) => {
      object.set(styles as fabric.ITextboxOptions & Record<string, unknown>);
    });
    commitTargets(commitHistory);
  };

  const applyFontFamily = async (family: string) => {
    await ensureFontLoaded({ id: family, family, source: 'built-in', weight: 400, style: 'normal' });
    applyStyles({ fontFamily: family });
  };

  const commitFontSize = (value = fontSizeDraft) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setFontSizeDraft(fontSize === 'Mixed' ? '' : String(fontSize));
      return;
    }
    const next = clampFontSize(parsed);
    setFontSizeDraft(String(next));
    applyStyles({ fontSize: next });
  };

  const stepFontSize = (delta: number) => {
    const base = typeof fontSize === 'number' ? fontSize : 40;
    const next = clampFontSize(base + delta);
    setFontSizeDraft(String(next));
    applyStyles({ fontSize: next });
  };

  const applyCase = (mode: 'upper' | 'lower' | 'capitalize' | 'sentence') => {
    if (targets.length === 1 && selectedObject === targets[0]) {
      const mapped = mode === 'capitalize' ? 'capitalize' : mode;
      const result = transformTextCase(canvas, selectedObject, mapped, textSelectionRange);
      if (result.applied) {
        setSelectedObject(result.textObject || selectedObject);
        forceToolbarSync();
        saveHistory();
      }
      setOpenPanel(null);
      return;
    }
    targets.forEach((object) => {
      if (!isEditableTextObject(object)) return;
      const current = object.text || '';
      const next = mode === 'upper'
        ? current.toUpperCase()
        : mode === 'lower'
          ? current.toLowerCase()
          : mode === 'sentence'
            ? toSentenceCase(current)
            : toTitleCase(current);
      object.set('text', next);
    });
    commitTargets();
    setOpenPanel(null);
  };

  const applyList = (mode: 'none' | 'bulleted' | 'numbered') => {
    targets.forEach((object) => {
      if (!isEditableTextObject(object)) return;
      const lines = normalizeLines(object.text || '');
      const next = mode === 'none'
        ? lines.join('\n')
        : mode === 'bulleted'
          ? lines.map((line) => `• ${line}`).join('\n')
          : lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
      object.set({ text: next, textIndent: 0 } as Record<string, unknown>);
    });
    commitTargets();
    setOpenPanel(null);
  };

  const applyEffect = async (type: TextEffectType) => {
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'text-styles' } }));
    for (const target of targets) {
      await applyTextEffect(canvas, target, defaultTextEffectConfig(type));
    }
    commitTargets();
    setOpenPanel(null);
  };

  const applyAnimation = (type: string) => {
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'properties' } }));
    console.log('[ANIMATION CLICK] toolbar popover:', type);
    applyAnimationToSelectedObject({
      canvas,
      selectedObject,
      selectedObjectId,
      animationId: type,
      saveHistory,
      setSelectedObject,
    });
    forceToolbarSync();
    bumpSelectionAnimation();
    setOpenPanel(null);
  };

  const applyPosition = (action: string) => {
    if (!selectedObject) return;
    if (['front', 'forward', 'backward', 'back'].includes(action)) {
      if (moveLayerObject(canvas, selectedObject, action as LayerOrderAction)) saveHistory();
      setOpenPanel(null);
      return;
    }
    if (action === 'left') alignObjectToPage(canvas, selectedObject, 'left', 0);
    if (action === 'center-horizontal') alignObjectToPage(canvas, selectedObject, 'center-horizontal', 0);
    if (action === 'right') alignObjectToPage(canvas, selectedObject, 'right', 0);
    if (action === 'top') alignObjectToPage(canvas, selectedObject, 'top', 0);
    if (action === 'center-vertical') alignObjectToPage(canvas, selectedObject, 'center-vertical', 0);
    if (action === 'bottom') alignObjectToPage(canvas, selectedObject, 'bottom', 0);
    if (action === 'center') alignObjectToPage(canvas, selectedObject, 'center', 0);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    saveHistory();
    setOpenPanel(null);
  };

  const handlePaintRoller = () => {
    if (copiedStyle) {
      targets.forEach((object) => {
        object.set({
          ...copiedStyle,
          shadow: copiedStyle.shadow ? new fabric.Shadow(copiedStyle.shadow as fabric.IShadowOptions) : undefined,
        } as Record<string, unknown>);
      });
      commitTargets();
      setMessage('Text style applied');
      return;
    }
    setCopiedStyle(copyStyleFrom(targets[0]));
    setMessage('Text style copied');
  };

  const popoverLeft = Math.max(8, Math.min(position.left + 420, window.innerWidth - 280));
  const popoverTop = position.top + 44;
  const effectiveFill = colorValue(fill);
  const effectiveOpacity = typeof opacity === 'number' ? opacity : 1;
  const isBold = fontWeight !== 'Mixed' && (fontWeight === 'bold' || Number(fontWeight) >= 600);

  return (
    <>
      <div
        style={{ left: position.left, top: position.top, maxWidth: 'calc(100vw - 16px)' }}
        className="fixed z-50 flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/[0.10] bg-zinc-950/95 px-2 py-1.5 text-xs text-zinc-200 shadow-2xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="contextual-text-toolbar"
      >
        <select
          value={fontFamily === 'Mixed' ? '' : fontFamily}
          onChange={(event) => void applyFontFamily(event.target.value)}
          className={`${fieldClass} w-[142px]`}
          title="Font Family"
          aria-label="Font Family"
        >
          {fontFamily === 'Mixed' && <option value="">Mixed</option>}
          {FONT_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
        </select>

        <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
          <button type="button" onClick={() => stepFontSize(-1)} className="flex h-8 w-8 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white" title="Decrease font size">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            value={fontSizeDraft}
            placeholder={fontSize === 'Mixed' ? 'Mixed' : undefined}
            onChange={(event) => setFontSizeDraft(event.target.value)}
            onBlur={() => commitFontSize()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitFontSize();
                event.currentTarget.blur();
              }
            }}
            className="h-8 w-12 border-x border-zinc-800 bg-transparent text-center font-mono text-[11px] text-white outline-none placeholder:text-amber-300"
            title="Font Size"
            aria-label="Font Size"
          />
          <button type="button" onClick={() => stepFontSize(1)} className="flex h-8 w-8 items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white" title="Increase font size">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <label className={toolbarButtonClass} title="Text Color" aria-label="Text Color">
          <Baseline className="mr-1 h-3.5 w-3.5" />
          <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: effectiveFill }} />
          <input
            type="color"
            value={effectiveFill}
            onClick={() => window.dispatchEvent(new CustomEvent('teckstudio:open-text-color'))}
            onChange={(event) => applyStyles({ fill: event.target.value })}
            className="sr-only"
          />
        </label>

        <button type="button" onClick={() => applyStyles({ fontWeight: isBold ? 'normal' : 'bold' })} className={`${toolbarButtonClass} ${isBold ? activeButtonClass : ''}`} title="Bold" aria-label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyStyles({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' })} className={`${toolbarButtonClass} ${fontStyle === 'italic' ? activeButtonClass : ''}`} title="Italic" aria-label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyStyles({ underline: underline !== true })} className={`${toolbarButtonClass} ${underline === true ? activeButtonClass : ''}`} title="Underline" aria-label="Underline">
          <Underline className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyStyles({ linethrough: linethrough !== true })} className={`${toolbarButtonClass} ${linethrough === true ? activeButtonClass : ''}`} title="Strikethrough" aria-label="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <button type="button" onClick={() => setOpenPanel(openPanel === 'case' ? null : 'case')} className={toolbarButtonClass} title="Text Case" aria-label="Text Case">
          <CaseSensitive className="h-3.5 w-3.5" />
        </button>

        <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-zinc-800">
          {[
            { value: 'left', label: 'Left', icon: <AlignLeft className="h-3.5 w-3.5" /> },
            { value: 'center', label: 'Center', icon: <AlignCenter className="h-3.5 w-3.5" /> },
            { value: 'right', label: 'Right', icon: <AlignRight className="h-3.5 w-3.5" /> },
            { value: 'justify', label: 'Justify', icon: <AlignJustify className="h-3.5 w-3.5" /> },
          ].map((item) => (
            <button key={item.value} type="button" onClick={() => applyStyles({ textAlign: item.value })} className={`${toolbarButtonClass} rounded-none ${textAlign === item.value ? activeButtonClass : ''}`} title={`Align ${item.label}`} aria-label={`Align ${item.label}`}>
              {item.icon}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => setOpenPanel(openPanel === 'lists' ? null : 'lists')} className={toolbarButtonClass} title="Bullets / Lists" aria-label="Bullets / Lists">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setOpenPanel(openPanel === 'spacing' ? null : 'spacing')} className={toolbarButtonClass} title="Text Spacing" aria-label="Text Spacing">
          <Type className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => setOpenPanel(openPanel === 'opacity' ? null : 'opacity')} className={toolbarButtonClass} title="Transparency" aria-label="Transparency">
          <Blend className="h-3.5 w-3.5" />
          <span className="ml-1 w-8 font-mono text-[9px] text-zinc-500">{Math.round(effectiveOpacity * 100)}%</span>
        </button>
        <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'text-styles' } })); setOpenPanel(openPanel === 'effects' ? null : 'effects'); }} className={toolbarButtonClass} title="Effects" aria-label="Effects">
          <WandSparkles className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Effects</span>
        </button>
        <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'properties' } })); setOpenPanel(openPanel === 'animate' ? null : 'animate'); }} className={toolbarButtonClass} title="Animate" aria-label="Animate">
          <Film className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Animate</span>
        </button>
        <button type="button" onClick={() => setOpenPanel(openPanel === 'position' ? null : 'position')} className={toolbarButtonClass} title="Position" aria-label="Position">
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Position</span>
        </button>
        <button type="button" onClick={handlePaintRoller} className={`${toolbarButtonClass} ${copiedStyle ? activeButtonClass : ''}`} title={copiedStyle ? 'Apply copied text style' : 'Copy Text Style'} aria-label="Copy Text Style">
          <PaintRoller className="h-3.5 w-3.5" />
        </button>
        {message && <span className="shrink-0 px-1 text-[9px] text-emerald-300">{message}</span>}
      </div>

      {openPanel && (
        <div
          style={{ left: popoverLeft, top: popoverTop }}
          className="fixed z-[60] w-64 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            <span>{openPanel}</span>
            <button type="button" onClick={() => setOpenPanel(null)} className="rounded px-1 text-zinc-500 hover:bg-zinc-800">×</button>
          </div>

          {openPanel === 'case' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => applyCase('upper')} className={toolbarButtonClass}>UPPERCASE</button>
              <button type="button" onClick={() => applyCase('lower')} className={toolbarButtonClass}>lowercase</button>
              <button type="button" onClick={() => applyCase('capitalize')} className={toolbarButtonClass}>Title Case</button>
              <button type="button" onClick={() => applyCase('sentence')} className={toolbarButtonClass}>Sentence</button>
            </div>
          )}

          {openPanel === 'lists' && (
            <div className="grid gap-2">
              <button type="button" onClick={() => applyList('bulleted')} className={`${toolbarButtonClass} justify-start`}><List className="mr-2 h-3.5 w-3.5" /> Bulleted List</button>
              <button type="button" onClick={() => applyList('numbered')} className={`${toolbarButtonClass} justify-start`}><ListOrdered className="mr-2 h-3.5 w-3.5" /> Numbered List</button>
              <button type="button" onClick={() => applyList('none')} className={`${toolbarButtonClass} justify-start`}>None</button>
            </div>
          )}

          {openPanel === 'spacing' && (
            <div className="grid gap-3">
              <label className="grid gap-1 text-[10px] text-zinc-500">
                Letter Spacing <span className="font-mono text-zinc-300">{charSpacing === 'Mixed' ? 'Mixed' : charSpacing}</span>
                <input type="range" min={-100} max={600} step={10} value={charSpacing === 'Mixed' ? 0 : charSpacing} onChange={(event) => applyStyles({ charSpacing: Number(event.target.value) }, false)} onPointerUp={() => saveHistory()} onKeyUp={() => saveHistory()} className="accent-violet-500" />
              </label>
              <label className="grid gap-1 text-[10px] text-zinc-500">
                Line Height <span className="font-mono text-zinc-300">{lineHeight === 'Mixed' ? 'Mixed' : lineHeight.toFixed(2)}</span>
                <input type="range" min={0.7} max={3} step={0.05} value={lineHeight === 'Mixed' ? 1.16 : lineHeight} onChange={(event) => applyStyles({ lineHeight: Number(event.target.value) }, false)} onPointerUp={() => saveHistory()} onKeyUp={() => saveHistory()} className="accent-violet-500" />
              </label>
            </div>
          )}

          {openPanel === 'opacity' && (
            <label className="grid gap-2 text-[10px] text-zinc-500">
              Transparency <span className="font-mono text-zinc-300">{Math.round(effectiveOpacity * 100)}%</span>
              <input type="range" min={0} max={1} step={0.01} value={effectiveOpacity} onChange={(event) => applyStyles({ opacity: Number(event.target.value) }, false)} onPointerUp={() => saveHistory()} onKeyUp={() => saveHistory()} className="accent-violet-500" />
            </label>
          )}

          {openPanel === 'effects' && (
            <div className="grid grid-cols-2 gap-2">
              {EFFECT_OPTIONS.map((item) => (
                <button key={`${item.label}-${item.value}`} type="button" onClick={() => void applyEffect(item.value)} className={`${toolbarButtonClass} ${activeEffect === item.value ? activeButtonClass : ''}`}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </div>
          )}

          {openPanel === 'animate' && (
            <div className="grid gap-2">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyAnimation('none')}
                className={`${toolbarButtonClass} justify-start ${activeAnimation === 'none' ? activeButtonClass : ''}`}
              >
                None
              </button>
              {ANIMATION_OPTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyAnimation(item.value)}
                  className={`${toolbarButtonClass} justify-start ${activeAnimation === item.value ? activeButtonClass : ''}`}
                >
                  <Film className="mr-2 h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </div>
          )}

          {openPanel === 'position' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                ['forward', 'Forward'],
                ['backward', 'Backward'],
                ['front', 'Bring Front'],
                ['back', 'Send Back'],
                ['left', 'Align Left'],
                ['center-horizontal', 'Center Horizontally'],
                ['right', 'Align Right'],
                ['top', 'Align Top'],
                ['center-vertical', 'Center Vertically'],
                ['bottom', 'Align Bottom'],
                ['center', 'Center on Canvas'],
              ].map(([action, label]) => (
                <button key={action} type="button" onClick={() => applyPosition(action)} className={toolbarButtonClass}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
