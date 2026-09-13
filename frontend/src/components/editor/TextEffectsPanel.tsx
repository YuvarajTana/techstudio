import React, { useEffect, useMemo, useState } from 'react';
import type { TextEffectConfig, TextEffectType } from '../../types/editorFeatures';
import { applyTextEffect, defaultTextEffectConfig, isTextEffectSource } from '../../utils/textEffects';
import { useEditorStore } from '../../store/useEditorStore';

const EFFECTS: Array<{ type: TextEffectType; label: string }> = [
  { type: 'shadow', label: 'Shadow' },
  { type: 'outline', label: 'Outline' },
  { type: 'hollow', label: 'Hollow' },
  { type: 'glow', label: 'Glow' },
  { type: 'neon', label: 'Neon' },
  { type: 'gradient', label: 'Gradient' },
  { type: 'lift', label: 'Lift' },
  { type: 'splice', label: 'Splice' },
  { type: 'echo', label: 'Echo' },
  { type: 'glitch', label: 'Glitch' },
  { type: 'background', label: 'Background' },
  { type: 'curve', label: 'Curved' },
  { type: 'threeD', label: '3D' },
];

const sliderDefinitions: Partial<Record<TextEffectType, Array<{ key: string; label: string; min: number; max: number; step?: number }>>> = {
  shadow: [
    { key: 'blur', label: 'Blur', min: 0, max: 60 },
    { key: 'offsetX', label: 'Offset X', min: -40, max: 40 },
    { key: 'offsetY', label: 'Offset Y', min: -40, max: 40 },
    { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
  ],
  lift: [
    { key: 'blur', label: 'Blur', min: 0, max: 60 },
    { key: 'offsetY', label: 'Lift', min: -30, max: 30 },
    { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
  ],
  outline: [{ key: 'strokeWidth', label: 'Width', min: 1, max: 12, step: 0.5 }],
  hollow: [{ key: 'strokeWidth', label: 'Width', min: 1, max: 12, step: 0.5 }],
  glow: [
    { key: 'glowBlur', label: 'Glow', min: 0, max: 60 },
    { key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 },
  ],
  neon: [
    { key: 'glowBlur', label: 'Glow', min: 0, max: 60 },
    { key: 'strokeWidth', label: 'Stroke', min: 0, max: 5, step: 0.25 },
  ],
  gradient: [{ key: 'angle', label: 'Angle', min: -180, max: 180 }],
  background: [{ key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.05 }],
  splice: [
    { key: 'distance', label: 'Distance', min: 1, max: 24 },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
  ],
  echo: [
    { key: 'count', label: 'Copies', min: 1, max: 5 },
    { key: 'distance', label: 'Distance', min: 1, max: 24 },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
  ],
  glitch: [{ key: 'strength', label: 'Strength', min: 1, max: 14 }],
  curve: [{ key: 'curve', label: 'Curve', min: 20, max: 220 }],
  threeD: [
    { key: 'depth', label: 'Depth', min: 1, max: 12 },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
  ],
};

const colorDefinitions: Partial<Record<TextEffectType, Array<{ key: string; label: string }>>> = {
  shadow: [{ key: 'color', label: 'Shadow' }],
  lift: [{ key: 'color', label: 'Shadow' }],
  outline: [{ key: 'color', label: 'Outline' }],
  hollow: [{ key: 'color', label: 'Outline' }],
  glow: [{ key: 'glowColor', label: 'Glow' }],
  neon: [{ key: 'color', label: 'Text' }, { key: 'glowColor', label: 'Glow' }],
  background: [{ key: 'color', label: 'Label' }],
  splice: [{ key: 'secondaryColor', label: 'Splice' }],
  echo: [{ key: 'secondaryColor', label: 'Echo' }],
  glitch: [{ key: 'redColor', label: 'Red' }, { key: 'cyanColor', label: 'Cyan' }],
  threeD: [{ key: 'frontColor', label: 'Front' }, { key: 'extrusionColor', label: 'Depth' }],
};

export const TextEffectsPanel: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();
  const activeConfig = selectedObject?.get('textEffectConfig' as keyof typeof selectedObject) as TextEffectConfig | undefined;
  const [config, setConfig] = useState<TextEffectConfig>(activeConfig || defaultTextEffectConfig('none'));
  const [status, setStatus] = useState('');

  useEffect(() => {
    const next = selectedObject?.get('textEffectConfig' as keyof typeof selectedObject) as TextEffectConfig | undefined;
    setConfig(next || defaultTextEffectConfig('none'));
    setStatus('');
  }, [selectedObject]);

  const sliders = useMemo(() => sliderDefinitions[config.type] || [], [config.type]);
  const colors = useMemo(() => colorDefinitions[config.type] || [], [config.type]);

  const apply = async (next: TextEffectConfig, commit = true) => {
    if (!canvas || !isTextEffectSource(selectedObject)) {
      setStatus('Select an editable text layer first.');
      return;
    }
    setConfig(next);
    try {
      await applyTextEffect(canvas, selectedObject, next);
      if (commit) saveHistory();
      setStatus(next.type === 'none' ? 'Text effect removed.' : `${EFFECTS.find((effect) => effect.type === next.type)?.label || 'Text'} effect applied.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The text effect could not be applied.');
    }
  };

  const updateSetting = (key: string, value: unknown, commit = false) => {
    void apply({ ...config, settings: { ...config.settings, [key]: value } }, commit);
  };

  return (
    <section className="space-y-3" aria-label="Text Effects">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Text Effects</div>
        <button
          type="button"
          onClick={() => void apply(defaultTextEffectConfig('none'))}
          disabled={!isTextEffectSource(selectedObject)}
          className="rounded-lg border border-zinc-800 px-2 py-1 text-[9px] font-bold text-zinc-400 hover:border-violet-500/50 hover:text-white disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {!isTextEffectSource(selectedObject) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-[10px] leading-4 text-zinc-500">
          Select a text layer to apply editable, export-safe effects.
        </div>
      )}

      <div className={`grid grid-cols-3 gap-2 ${!isTextEffectSource(selectedObject) ? 'pointer-events-none opacity-40' : ''}`}>
        {EFFECTS.map((effect) => (
          <button
            key={effect.type}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void apply(defaultTextEffectConfig(effect.type))}
            aria-pressed={config.type === effect.type}
            className={`min-h-11 rounded-xl border px-2 py-2 text-[10px] font-bold transition ${
              config.type === effect.type
                ? 'border-violet-400/60 bg-violet-500/15 text-violet-100'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-violet-500/40 hover:text-white'
            }`}
          >
            {effect.label}
          </button>
        ))}
      </div>

      {config.type !== 'none' && isTextEffectSource(selectedObject) && (sliders.length > 0 || colors.length > 0) && (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          {colors.map((field) => (
            <label key={field.key} className="flex items-center justify-between gap-3 text-[10px] text-zinc-400">
              <span>{field.label}</span>
              <input
                type="color"
                aria-label={`${field.label} colour`}
                value={String(config.settings[field.key] || '#8b5cf6')}
                onChange={(event) => updateSetting(field.key, event.target.value)}
                onBlur={() => saveHistory()}
                className="h-8 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
              />
            </label>
          ))}
          {config.type === 'curve' && (
            <label className="flex items-center justify-between gap-3 text-[10px] text-zinc-400">
              <span>Direction</span>
              <select
                value={String(config.settings.direction || 'up')}
                onChange={(event) => updateSetting('direction', event.target.value, true)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200"
              >
                <option value="up">Arc Up</option>
                <option value="down">Arc Down</option>
              </select>
            </label>
          )}
          {sliders.map((slider) => {
            const value = Number(config.settings[slider.key] ?? defaultTextEffectConfig(config.type).settings[slider.key] ?? slider.min);
            return (
              <label key={slider.key} className="grid grid-cols-[58px_1fr_34px] items-center gap-2 text-[9px] text-zinc-500">
                <span>{slider.label}</span>
                <input
                  type="range"
                  aria-label={slider.label}
                  min={slider.min}
                  max={slider.max}
                  step={slider.step || 1}
                  value={value}
                  onChange={(event) => updateSetting(slider.key, Number(event.target.value))}
                  onPointerUp={() => saveHistory()}
                  onKeyUp={() => saveHistory()}
                  className="accent-violet-500"
                />
                <span className="text-right font-mono text-zinc-300">{value}</span>
              </label>
            );
          })}
        </div>
      )}

      {status && <div role="status" className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-2 text-[10px] text-violet-100">{status}</div>}
    </section>
  );
};
