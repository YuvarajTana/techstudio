import React, { useState } from 'react';
import { fabric } from 'fabric';
import { Palette, Sparkles, Type } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  ROUNDED_BOLD_HIGHLIGHT_PRESET_ID,
  TEXT_PRESETS,
  type TextPreset,
} from '../../config/textPresets';
import {
  applyRoundedHighlightPresetToText,
  createRoundedHighlightText,
} from '../../utils/roundedHighlightText';
import {
  enterInlineTextEditing,
  hasPartialTextSelection,
  transformTextCase,
} from '../../utils/textSelectionStyles';
import { applyTextEffect } from '../../utils/textEffects';
import { FontBrowserPanel } from './FontBrowserPanel';
import { TextEffectsPanel } from './TextEffectsPanel';

const GRADIENTS = [
  { id: 'purple-blue', name: 'Purple → Blue', colors: ['#8b5cf6', '#3b82f6'] },
  { id: 'pink-orange', name: 'Pink → Orange', colors: ['#ec4899', '#f97316'] },
  { id: 'cyan-blue', name: 'Cyan → Blue', colors: ['#06b6d4', '#2563eb'] },
  { id: 'green-teal', name: 'Green → Teal', colors: ['#22c55e', '#14b8a6'] },
  { id: 'gold-orange', name: 'Gold → Orange', colors: ['#fbbf24', '#f97316'] },
  { id: 'rainbow', name: 'Rainbow', colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'] },
];

const SOLID_COLORS = ['#ffffff', '#18181b', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const TECHNICAL_REEL_TEXT_PRESET_IDS = [
  'technical-reel-hero-heading',
  'technical-reel-two-line-heading',
  'technical-reel-large-two-line-heading',
  'technical-reel-accent-highlight-heading',
  'technical-reel-scene-number',
  'technical-reel-section-number',
  'technical-reel-section-number-short',
  'technical-reel-breadcrumb',
  'technical-reel-mono-subtitle',
  'technical-reel-section-label',
  'technical-reel-card-label',
  'technical-reel-small-uppercase-label',
  'technical-reel-small-label',
  'technical-reel-body',
  'technical-reel-code-text',
  'technical-reel-terminal-text',
  'technical-reel-accent-heading',
  'technical-reel-footer-text',
  'technical-reel-footer-statement',
  'technical-reel-tiny-metadata-text',
  'technical-reel-tag-chip-text',
  'technical-reel-caption',
  'technical-reel-footer-caption',
];

const TECHNICAL_REEL_TEXT_ROLES: Record<string, string> = {
  'technical-reel-hero-heading': 'hero-title',
  'technical-reel-two-line-heading': 'hero-title',
  'technical-reel-large-two-line-heading': 'hero-title',
  'technical-reel-accent-highlight-heading': 'heading',
  'technical-reel-scene-number': 'technical-section-number',
  'technical-reel-section-number': 'technical-section-number',
  'technical-reel-section-number-short': 'technical-section-number',
  'technical-reel-breadcrumb': 'small-label',
  'technical-reel-mono-subtitle': 'subtitle',
  'technical-reel-section-label': 'small-label',
  'technical-reel-card-label': 'card',
  'technical-reel-small-uppercase-label': 'small-label',
  'technical-reel-small-label': 'small-label',
  'technical-reel-body': 'body',
  'technical-reel-code-text': 'code-line',
  'technical-reel-terminal-text': 'terminal-line',
  'technical-reel-accent-heading': 'hero-title',
  'technical-reel-footer-text': 'footer',
  'technical-reel-footer-statement': 'footer',
  'technical-reel-tiny-metadata-text': 'caption',
  'technical-reel-tag-chip-text': 'token-chip',
  'technical-reel-caption': 'caption',
  'technical-reel-footer-caption': 'footer',
};

const isTextObject = (object: fabric.Object | null): object is fabric.Textbox => Boolean(object && ['text', 'i-text', 'textbox'].includes(object.type || ''));

const createTextGradient = (object: fabric.Textbox, colors: string[]) => new fabric.Gradient({
  type: 'linear',
  coords: {
    x1: 0,
    y1: 0,
    x2: object.width || 450,
    y2: 0,
  },
  colorStops: colors.map((color, index) => ({
    offset: colors.length === 1 ? 0 : index / (colors.length - 1),
    color,
  })),
});

export const TextToolsPanel: React.FC = () => {
  const {
    canvas,
    selectedObject,
    saveHistory,
    setFillColor,
    captureTextSelection,
    applyTextSelectionStyles,
    textSelectionRange,
  } = useEditorStore();
  const [message, setMessage] = useState('');
  const [addingPresetId, setAddingPresetId] = useState('');

  const hasRange = isTextObject(selectedObject) && hasPartialTextSelection(selectedObject, textSelectionRange);

  const preserveSelection = (event?: React.MouseEvent<HTMLElement>) => {
    if (event && isTextObject(selectedObject)) event.preventDefault();
    captureTextSelection();
  };

  const applyPresetToSelectedText = (preset: TextPreset) => {
    if (!isTextObject(selectedObject)) return false;
    const partial = hasPartialTextSelection(selectedObject, textSelectionRange);
    const styles: Record<string, unknown> = {
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      fontStyle: preset.fontStyle || 'normal',
      fill: preset.gradient ? preset.gradient[0] : preset.fill,
      charSpacing: preset.charSpacing || 0,
      lineHeight: preset.lineHeight || 1.1,
      stroke: preset.stroke || '',
      strokeWidth: preset.strokeWidth || 0,
      opacity: preset.opacity ?? 1,
    };
    if (!partial) styles.textAlign = preset.textAlign;
    return applyTextSelectionStyles(styles);
  };

  const addTextPreset = async (preset: TextPreset) => {
    if (!canvas || addingPresetId) return;
    if (preset.id === ROUNDED_BOLD_HIGHLIGHT_PRESET_ID) {
      setAddingPresetId(preset.id);
      setMessage('');
      try {
        const selectedText = isTextObject(selectedObject) ? selectedObject : null;
        const textObject = selectedText
          ? await applyRoundedHighlightPresetToText(canvas, selectedText, preset)
          : await createRoundedHighlightText(canvas, preset);
        if (!textObject) throw new Error('Select an editable text layer and try again.');
        if (!selectedText) {
          canvas.add(textObject);
          canvas.setActiveObject(textObject);
          enterInlineTextEditing(canvas, textObject, { selectAll: true });
        }
        useEditorStore.getState().setSelectedObject(textObject);
        saveHistory();
        window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'text-styles' } }));
        setMessage(selectedText
          ? 'Rounded Bold Highlight applied without changing your text.'
          : 'Rounded Title added. Start typing to replace it.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to load the rounded heading font.');
      } finally {
        setAddingPresetId('');
      }
      return;
    }
    if (applyPresetToSelectedText(preset)) {
      setMessage(hasRange ? 'Preset applied to selected text.' : 'Preset applied to text box.');
      return;
    }

    const textbox = new fabric.Textbox(preset.text, {
      width: 560,
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      fontStyle: preset.fontStyle || 'normal',
      fill: preset.fill,
      textAlign: preset.textAlign,
      charSpacing: preset.charSpacing || 0,
      lineHeight: preset.lineHeight || 1.1,
      stroke: preset.stroke,
      strokeWidth: preset.strokeWidth || 0,
      opacity: preset.opacity ?? 1,
      shadow: preset.shadow ? new fabric.Shadow(preset.shadow) : undefined,
      left: canvas.getWidth() / 2 - 280,
      top: canvas.getHeight() / 2 - preset.fontSize / 2,
      name: `Text — ${preset.name}`,
      id: crypto.randomUUID(),
      objectType: 'text',
      textRole: 'heading',
      posterRole: TECHNICAL_REEL_TEXT_ROLES[preset.id],
      stylePresetId: preset.id,
    } as fabric.ITextboxOptions & Record<string, unknown>);

    if (preset.gradient) textbox.set('fill', createTextGradient(textbox, preset.gradient));
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
    saveHistory();
    setMessage('Text preset added.');
  };

  const applyGradient = (colors: string[]) => {
    if (isTextObject(selectedObject) && hasPartialTextSelection(selectedObject, textSelectionRange)) {
      applyTextSelectionStyles({ fill: colors[0] });
      setMessage('Applied the first gradient colour to the selected text range.');
      return;
    }
    if (!canvas || !isTextObject(selectedObject)) {
      setMessage('Select a text layer first.');
      return;
    }
    void applyTextEffect(canvas, selectedObject, { type: 'gradient', settings: { colors, angle: 0 } })
      .then(() => {
        saveHistory();
        setMessage('Gradient text effect applied.');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to apply gradient.'));
  };

  const applyCase = (mode: 'upper' | 'lower' | 'capitalize') => {
    const result = transformTextCase(canvas, selectedObject, mode, textSelectionRange);
    if (result.applied) {
      saveHistory();
      setMessage('Text case updated.');
    } else {
      setMessage('Select a text layer first.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          <Type className="h-3.5 w-3.5" /> Heading Styles
        </div>
        {TEXT_PRESETS.filter((preset) => preset.category === 'heading').map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-label={`Add ${preset.name}`}
            disabled={Boolean(addingPresetId)}
            onMouseDown={preserveSelection}
            onClick={() => void addTextPreset(preset)}
            className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left transition hover:border-amber-300/50 disabled:cursor-wait disabled:opacity-60"
          >
            <span
              className="block whitespace-nowrap text-[22px] font-bold leading-none tracking-[-0.03em]"
              style={{ fontFamily: '"Fredoka", "Nunito", "Arial Rounded MT Bold", sans-serif' }}
            >
              <span className="text-[#F5F2E8]">Round</span>
              <span className="text-[#E3A83B]">ed</span>
            </span>
            <span className="mt-2 block text-[10px] font-bold text-zinc-200">{preset.name}</span>
            <span className="mt-0.5 block text-[9px] text-zinc-500">Bold rounded heading · optional accent</span>
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {TEXT_PRESETS.filter((preset) => preset.category !== 'heading').slice(0, 3).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onMouseDown={preserveSelection}
            onClick={() => void addTextPreset(preset)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left transition hover:border-violet-500/50 hover:bg-zinc-800/40"
          >
            <span className="block text-xl font-black leading-none text-white">{preset.preview}</span>
            <span className="mt-1 block text-[10px] text-zinc-500">{preset.name}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
          <Type className="h-3.5 w-3.5" /> Technical Reel Styles
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {TEXT_PRESETS.filter((preset) => TECHNICAL_REEL_TEXT_PRESET_IDS.includes(preset.id)).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onMouseDown={preserveSelection}
              onClick={() => void addTextPreset(preset)}
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-left transition hover:border-cyan-400/60"
            >
              <span className="block truncate text-sm font-black text-zinc-100">{preset.preview}</span>
              <span className="mt-1 block truncate text-[9px] text-zinc-500">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
          <Type className="h-3.5 w-3.5" /> Technical Styles
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_PRESETS.filter((preset) => [
            'technical-hero-title',
            'prompt-harness-wide-tracking',
            'technical-section-heading',
            'technical-mono-subtitle',
            'technical-small-label',
            'technical-diagram-node',
            'technical-accent-text',
            'prompt-harness-footer-heading',
          ].includes(preset.id)).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onMouseDown={preserveSelection}
              onClick={() => void addTextPreset(preset)}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-left transition hover:border-emerald-400/60"
            >
              <span className="block truncate text-sm font-black text-zinc-100">{preset.preview}</span>
              <span className="mt-1 block truncate text-[9px] text-zinc-500">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          <Type className="h-3.5 w-3.5" /> Other Text Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_PRESETS.filter((preset) => preset.category !== 'heading' && ![
            ...TECHNICAL_REEL_TEXT_PRESET_IDS,
            'technical-hero-title',
            'prompt-harness-wide-tracking',
            'technical-section-heading',
            'technical-mono-subtitle',
            'technical-small-label',
            'technical-diagram-node',
            'technical-accent-text',
            'prompt-harness-footer-heading',
          ].includes(preset.id)).slice(3).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onMouseDown={preserveSelection}
              onClick={() => void addTextPreset(preset)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-left transition hover:border-violet-500/50"
            >
              <span className="block truncate text-sm font-black text-zinc-100">{preset.preview}</span>
              <span className="mt-1 block truncate text-[9px] text-zinc-500">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {message && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">{message}</div>}
      <FontBrowserPanel />
      {isTextObject(selectedObject) && (
        <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${hasRange ? 'border-violet-400/30 bg-violet-500/10 text-violet-100' : 'border-zinc-800 bg-zinc-900/60 text-zinc-400'}`}>
          {hasRange ? 'Styling selected text' : 'Styling entire text box'}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          <Palette className="h-3.5 w-3.5" /> Solid Colour
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {SOLID_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onMouseDown={preserveSelection}
              onClick={() => setFillColor(color)}
              className="h-6 rounded-md border border-zinc-800 transition hover:scale-110"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          <Sparkles className="h-3.5 w-3.5" /> Gradient Text
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GRADIENTS.map((gradient) => (
            <button
              key={gradient.id}
              type="button"
              onMouseDown={preserveSelection}
              onClick={() => applyGradient(gradient.colors)}
              className="rounded-xl border border-zinc-800 p-3 text-left text-[10px] font-bold text-white transition hover:border-violet-500/50"
              style={{ background: `linear-gradient(135deg, ${gradient.colors.join(', ')})` }}
            >
              {gradient.name}
            </button>
          ))}
        </div>
      </div>

      <TextEffectsPanel />

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Text Case</div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onMouseDown={preserveSelection} onClick={() => applyCase('upper')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300">UPPER</button>
          <button type="button" onMouseDown={preserveSelection} onClick={() => applyCase('lower')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300">lower</button>
          <button type="button" onMouseDown={preserveSelection} onClick={() => applyCase('capitalize')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300">Title</button>
        </div>
      </div>
    </div>
  );
};
