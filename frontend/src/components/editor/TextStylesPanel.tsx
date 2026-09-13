import React, { useState, useEffect } from 'react';
import { Type, Save, Trash2, Wand2 } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';

interface TextStylePreset {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  fill: string;
  textAlign: string;
  lineHeight: number;
  letterSpacing: number;
  underline: boolean;
}

const DEFAULT_PRESETS: TextStylePreset[] = [
  {
    id: 'heading-1', name: 'Heading 1', fontFamily: 'Outfit', fontSize: 48,
    fontWeight: 'bold', fontStyle: 'normal', fill: '#ffffff', textAlign: 'left',
    lineHeight: 1.2, letterSpacing: -1, underline: false,
  },
  {
    id: 'heading-2', name: 'Heading 2', fontFamily: 'Outfit', fontSize: 36,
    fontWeight: 'bold', fontStyle: 'normal', fill: '#ffffff', textAlign: 'left',
    lineHeight: 1.2, letterSpacing: -0.5, underline: false,
  },
  {
    id: 'subheading', name: 'Subheading', fontFamily: 'Outfit', fontSize: 24,
    fontWeight: '600', fontStyle: 'normal', fill: '#a1a1aa', textAlign: 'left',
    lineHeight: 1.4, letterSpacing: 0, underline: false,
  },
  {
    id: 'body', name: 'Body Text', fontFamily: 'Inter', fontSize: 16,
    fontWeight: 'normal', fontStyle: 'normal', fill: '#d4d4d8', textAlign: 'left',
    lineHeight: 1.6, letterSpacing: 0, underline: false,
  },
  {
    id: 'caption', name: 'Caption', fontFamily: 'Inter', fontSize: 12,
    fontWeight: 'normal', fontStyle: 'normal', fill: '#71717a', textAlign: 'left',
    lineHeight: 1.4, letterSpacing: 0.5, underline: false,
  },
  {
    id: 'cta-button', name: 'CTA Button', fontFamily: 'Outfit', fontSize: 14,
    fontWeight: 'bold', fontStyle: 'normal', fill: '#ffffff', textAlign: 'center',
    lineHeight: 1, letterSpacing: 1, underline: false,
  },
];

const STORAGE_KEY = 'teckstudio_text_style_presets';

function loadCustomPresets(): TextStylePreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: TextStylePreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function readTextStyle(obj: fabric.Object): Partial<TextStylePreset> {
  const textObject = obj as fabric.Textbox;
  return {
    fontFamily: textObject.fontFamily || 'Inter',
    fontSize: textObject.fontSize || 16,
    fontWeight: String(textObject.fontWeight || 'normal'),
    fontStyle: String(textObject.fontStyle || 'normal'),
    fill: typeof textObject.fill === 'string' ? textObject.fill : '#ffffff',
    textAlign: textObject.textAlign || 'left',
    lineHeight: textObject.lineHeight || 1.4,
    letterSpacing: textObject.charSpacing || 0,
    underline: Boolean(textObject.underline),
  };
}

function applyTextStyle(obj: fabric.Object, style: Partial<TextStylePreset>) {
  const textObject = obj as fabric.Textbox;
  textObject.set({
    ...(style.fontFamily ? { fontFamily: style.fontFamily } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style.fontStyle ? { fontStyle: style.fontStyle } : {}),
    ...(style.fill ? { fill: style.fill } : {}),
    ...(style.textAlign ? { textAlign: style.textAlign } : {}),
    ...(style.lineHeight !== undefined ? { lineHeight: style.lineHeight } : {}),
    ...(style.letterSpacing !== undefined ? { charSpacing: style.letterSpacing } : {}),
    ...(style.underline !== undefined ? { underline: style.underline } : {}),
  } as fabric.ITextboxOptions);
  textObject.initDimensions();
  textObject.setCoords();
}

export const TextStylesPanel: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();
  const [customPresets, setCustomPresets] = useState<TextStylePreset[]>(loadCustomPresets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTextSelected, setIsTextSelected] = useState(false);

  useEffect(() => {
    setIsTextSelected(
      selectedObject?.type === 'text' ||
      selectedObject?.type === 'i-text' ||
      selectedObject?.type === 'textbox'
    );
  }, [selectedObject]);

  const handleApplyPreset = (preset: TextStylePreset) => {
    if (!canvas || !selectedObject) return;
    if (
      selectedObject.type !== 'text' &&
      selectedObject.type !== 'i-text' &&
      selectedObject.type !== 'textbox'
    ) return;
    applyTextStyle(selectedObject, preset);
    canvas.renderAll();
    saveHistory();
  };

  const handleSaveCurrentAsPreset = () => {
    if (!selectedObject) return;
    const style = readTextStyle(selectedObject);
    const newPreset: TextStylePreset = {
      id: `custom-${Date.now()}`,
      name: `Custom ${customPresets.length + 1}`,
      ...style,
      fontFamily: style.fontFamily || 'Inter',
      fontSize: style.fontSize || 16,
      fontWeight: style.fontWeight || 'normal',
      fontStyle: style.fontStyle || 'normal',
      fill: style.fill || '#ffffff',
      textAlign: style.textAlign || 'left',
      lineHeight: style.lineHeight || 1.4,
      letterSpacing: style.letterSpacing || 0,
      underline: style.underline || false,
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  const handleDeletePreset = (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    saveCustomPresets(updated);
  };

  const handleRenamePreset = (id: string, name: string) => {
    const updated = customPresets.map((p) => (p.id === id ? { ...p, name } : p));
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setEditingId(null);
  };

  const presetButton = (preset: TextStylePreset, isCustom = false) => (
    <div
      key={preset.id}
      className="group relative bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 hover:border-zinc-700 transition-all"
    >
      <div
        className="cursor-pointer"
        onClick={() => handleApplyPreset(preset)}
        title={`Apply "${preset.name}" style`}
      >
        <div
          className="text-center py-2 mb-2 border-b border-zinc-800/50"
          style={{
            fontFamily: preset.fontFamily,
            fontSize: Math.min(preset.fontSize, 24),
            fontWeight: preset.fontWeight,
            fontStyle: preset.fontStyle,
            color: preset.fill,
            textAlign: preset.textAlign as any,
            lineHeight: preset.lineHeight,
          }}
        >
          Aa
        </div>
        <p className="text-[10px] font-semibold text-zinc-300 truncate">{preset.name}</p>
        <p className="text-[9px] text-zinc-600 truncate">{preset.fontFamily} {preset.fontSize}px</p>
      </div>

      {isCustom && (
        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {editingId === preset.id ? (
            <input
              autoFocus
              defaultValue={preset.name}
              onBlur={(e) => handleRenamePreset(preset.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenamePreset(preset.id, (e.target as HTMLInputElement).value);
              }}
              className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-[9px] text-zinc-200"
            />
          ) : (
            <button
              onClick={() => setEditingId(preset.id)}
              className="p-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white"
              title="Rename"
            >
              <Wand2 className="w-2.5 h-2.5" />
            </button>
          )}
          <button
            onClick={() => handleDeletePreset(preset.id)}
            className="p-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-rose-400"
            title="Delete"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-zinc-200">Text Styles</span>
        </div>
        {isTextSelected && (
          <button
            onClick={handleSaveCurrentAsPreset}
            className="flex items-center gap-1 px-2 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg text-[10px] font-semibold transition-colors"
            title="Save current text style as preset"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        )}
      </div>

      {!isTextSelected && (
        <p className="text-[10px] text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-2">
          Select a text element to apply or save styles.
        </p>
      )}

      {/* Built-in Presets */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Built-in Styles</p>
        <div className="grid grid-cols-3 gap-1.5">
          {DEFAULT_PRESETS.map((preset) => presetButton(preset))}
        </div>
      </div>

      {/* Custom Presets */}
      {customPresets.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Custom Styles ({customPresets.length})</p>
          <div className="grid grid-cols-3 gap-1.5">
            {customPresets.map((preset) => presetButton(preset, true))}
          </div>
        </div>
      )}

      {/* Quick Style Tips */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 mt-2">
        <p className="text-[10px] font-semibold text-zinc-400 mb-1">Quick Tips</p>
        <ul className="text-[9px] text-zinc-500 space-y-0.5">
          <li>• Click a preset to apply it to selected text</li>
          <li>• Save current text style with the Save button</li>
          <li>• Rename custom presets by clicking the wand icon</li>
          <li>• Delete custom presets with the trash icon</li>
        </ul>
      </div>
    </div>
  );
};
