import React, { useState, useEffect, useCallback } from 'react';
import { fabric } from 'fabric';
import { SunMedium, Contrast, Droplets, Image, Sparkles, RotateCcw } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import type { ImageEffectConfig } from '../../types/editorFeatures';
import { DEFAULT_IMAGE_EFFECTS, applyImageEffectConfig, readImageEffectConfig } from '../../utils/imageEffects';

type QuickFilter = 'grayscale' | 'sepia' | 'invert' | 'vintage' | 'blur';

const QUICK_FILTERS: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'grayscale', label: 'Grayscale', icon: <Image className="w-4 h-4" /> },
  { key: 'sepia', label: 'Sepia', icon: <Droplets className="w-4 h-4" /> },
  { key: 'invert', label: 'Invert', icon: <Contrast className="w-4 h-4" /> },
  { key: 'vintage', label: 'Vintage', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'blur', label: 'Blur', icon: <SunMedium className="w-4 h-4" /> },
];

const QUICK_FILTER_CONFIG: Record<QuickFilter, ImageEffectConfig> = {
  grayscale: { grayscale: true },
  sepia: { sepia: true },
  invert: { invert: true },
  vintage: { sepia: true, contrast: -8, saturation: -20, exposure: 8, preset: 'Vintage' },
  blur: { blur: 20 },
};

const readQuickFilters = (config: Required<ImageEffectConfig>) => {
  const next = new Set<QuickFilter>();
  if (config.grayscale) next.add('grayscale');
  if (config.sepia && config.preset !== 'Vintage') next.add('sepia');
  if (config.invert) next.add('invert');
  if (config.preset === 'Vintage') next.add('vintage');
  if (config.blur > 0) next.add('blur');
  return next;
};

export const ImageFilters: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilter>>(new Set());

  useEffect(() => {
    const image = selectedObject?.type === 'image' ? selectedObject as fabric.Image : null;
    const config = readImageEffectConfig(image);
    setBrightness(config.brightness);
    setContrast(config.contrast);
    setSaturation(config.saturation);
    setActiveQuickFilters(readQuickFilters(config));
  }, [selectedObject]);

  const buildConfig = (
    b: number,
    c: number,
    s: number,
    quickFilters: Set<QuickFilter>,
  ): ImageEffectConfig => {
    const quickConfig = Array.from(quickFilters).reduce<ImageEffectConfig>((acc, key) => ({
      ...acc,
      ...QUICK_FILTER_CONFIG[key],
    }), {});
    return {
      ...DEFAULT_IMAGE_EFFECTS,
      ...quickConfig,
      brightness: b,
      contrast: c,
      saturation: s,
      preset: quickFilters.has('vintage') ? 'Vintage' : 'Custom',
    };
  };

  const applyFilters = useCallback(
    (
      b: number,
      c: number,
      s: number,
      quickFilters: Set<QuickFilter>,
    ) => {
      if (!canvas || !selectedObject || selectedObject.type !== 'image') return;

      const img = selectedObject as fabric.Image;
      applyImageEffectConfig(img, buildConfig(b, c, s, quickFilters));
      canvas.renderAll();
    },
    [canvas, selectedObject],
  );

  if (!selectedObject || selectedObject.type !== 'image') return null;

  const handleSliderChange = (
    type: 'brightness' | 'contrast' | 'saturation',
    value: number,
  ) => {
    let newB = brightness;
    let newC = contrast;
    let newS = saturation;

    switch (type) {
      case 'brightness':
        newB = value;
        setBrightness(value);
        break;
      case 'contrast':
        newC = value;
        setContrast(value);
        break;
      case 'saturation':
        newS = value;
        setSaturation(value);
        break;
    }

    applyFilters(newB, newC, newS, activeQuickFilters);
    window.clearTimeout((window as any).__teckstudioFilterHistoryTimer);
    (window as any).__teckstudioFilterHistoryTimer = window.setTimeout(() => saveHistory(), 250);
  };

  const toggleQuickFilter = (key: QuickFilter) => {
    const next = new Set(activeQuickFilters);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setActiveQuickFilters(next);
    applyFilters(brightness, contrast, saturation, next);
    saveHistory();
  };

  const resetAll = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setActiveQuickFilters(new Set());
    applyFilters(0, 0, 0, new Set());
    saveHistory();
  };

  const sliders: {
    label: string;
    icon: React.ReactNode;
    value: number;
    key: 'brightness' | 'contrast' | 'saturation';
  }[] = [
    { label: 'Brightness', icon: <SunMedium className="w-3.5 h-3.5" />, value: brightness, key: 'brightness' },
    { label: 'Contrast', icon: <Contrast className="w-3.5 h-3.5" />, value: contrast, key: 'contrast' },
    { label: 'Saturation', icon: <Droplets className="w-3.5 h-3.5" />, value: saturation, key: 'saturation' },
  ];

  const hasAnyFilter = brightness !== 0 || contrast !== 0 || saturation !== 0 || activeQuickFilters.size > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            }}
          >
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-zinc-100">Image Adjustments</span>
        </div>
        {hasAnyFilter && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        )}
      </div>

      {/* Adjustment sliders */}
      <div className="flex flex-col gap-4">
        {sliders.map((s) => (
          <div key={s.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                {s.icon}
                {s.label}
              </label>
              <span className="text-[11px] text-zinc-500 font-mono font-bold tabular-nums">
                {s.value > 0 ? '+' : ''}{s.value.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={s.value}
              onChange={(e) => handleSliderChange(s.key, parseFloat(e.target.value))}
              className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
            />
          </div>
        ))}
      </div>

      {/* Quick filters */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-zinc-400">Quick Filters</label>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_FILTERS.map((qf) => {
            const isActive = activeQuickFilters.has(qf.key);
            return (
              <button
                key={qf.key}
                onClick={() => toggleQuickFilter(qf.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {qf.icon}
                {qf.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
