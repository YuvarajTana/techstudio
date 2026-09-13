import React, { useState } from 'react';
import { Paintbrush } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';

const PRESET_GRADIENTS = [
  { name: 'Sunset', colors: ['#f97316', '#ec4899'], angle: 135 },
  { name: 'Ocean', colors: ['#06b6d4', '#3b82f6'], angle: 180 },
  { name: 'Aurora', colors: ['#8b5cf6', '#06b6d4'], angle: 135 },
  { name: 'Neon', colors: ['#d946ef', '#f97316'], angle: 90 },
  { name: 'Forest', colors: ['#10b981', '#059669'], angle: 180 },
  { name: 'Midnight', colors: ['#1e1b4b', '#4c1d95'], angle: 135 },
  { name: 'Rose Gold', colors: ['#f43f5e', '#fb923c'], angle: 90 },
  { name: 'Ice', colors: ['#e0f2fe', '#7dd3fc'], angle: 180 },
  { name: 'Fire', colors: ['#ef4444', '#f59e0b'], angle: 135 },
  { name: 'Lavender', colors: ['#c4b5fd', '#f0abfc'], angle: 90 },
  { name: 'Deep Sea', colors: ['#0c4a6e', '#155e75'], angle: 180 },
  { name: 'Cosmic', colors: ['#581c87', '#be185d'], angle: 135 },
];

export const GradientPicker: React.FC = () => {
  const { canvas, saveHistory } = useEditorStore();
  const [color1, setColor1] = useState('#8b5cf6');
  const [color2, setColor2] = useState('#d946ef');
  const [angle, setAngle] = useState(135);

  const applyGradient = (c1: string, c2: string, deg: number) => {
    if (!canvas) return;

    // Convert angle to Fabric gradient coords
    const angleRad = (deg * Math.PI) / 180;
    const x1 = 0.5 + 0.5 * Math.cos(angleRad + Math.PI);
    const y1 = 0.5 + 0.5 * Math.sin(angleRad + Math.PI);
    const x2 = 0.5 + 0.5 * Math.cos(angleRad);
    const y2 = 0.5 + 0.5 * Math.sin(angleRad);

    // Create a rect the size of the canvas and set as background
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: {
        x1: x1 * 800,
        y1: y1 * 800,
        x2: x2 * 800,
        y2: y2 * 800,
      },
      colorStops: [
        { offset: 0, color: c1 },
        { offset: 1, color: c2 },
      ],
    });

    // Fabric canvas doesn't support gradient backgrounds directly,
    // so we create a background rect
    const existingBgRect = canvas.getObjects().find(
      (obj: any) => obj.data && obj.data.isGradientBg
    );

    if (existingBgRect) {
      canvas.remove(existingBgRect);
    }

    const bgRect = new fabric.Rect({
      left: 0,
      top: 0,
      width: 800,
      height: 800,
      fill: gradient,
      selectable: false,
      evented: false,
      data: { isGradientBg: true },
    });

    canvas.add(bgRect);
    canvas.sendToBack(bgRect);
    canvas.setBackgroundColor('', () => {});
    canvas.renderAll();
    saveHistory();
  };

  const applyCustomGradient = () => {
    applyGradient(color1, color2, angle);
  };

  const removeGradient = () => {
    if (!canvas) return;
    const bgRect = canvas.getObjects().find(
      (obj: any) => obj.data && obj.data.isGradientBg
    );
    if (bgRect) {
      canvas.remove(bgRect);
    }
    canvas.setBackgroundColor('#000000', () => canvas.renderAll());
    saveHistory();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Paintbrush className="w-4 h-4 text-violet-400" />
        <label className="text-xs font-semibold text-zinc-400">Gradient Background</label>
      </div>

      {/* Preset Gradients */}
      <div className="grid grid-cols-4 gap-2">
        {PRESET_GRADIENTS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              setColor1(preset.colors[0]);
              setColor2(preset.colors[1]);
              setAngle(preset.angle);
              applyGradient(preset.colors[0], preset.colors[1], preset.angle);
            }}
            className="group flex flex-col items-center gap-1 cursor-pointer"
            title={preset.name}
          >
            <div
              className="w-10 h-10 rounded-lg border border-zinc-800 group-hover:border-violet-500/50 group-hover:scale-110 transition-all shadow-sm"
              style={{
                background: `linear-gradient(${preset.angle}deg, ${preset.colors[0]}, ${preset.colors[1]})`,
              }}
            />
            <span className="text-[8px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
              {preset.name}
            </span>
          </button>
        ))}
      </div>

      <div className="h-[1px] bg-zinc-800" />

      {/* Custom Gradient */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Custom Gradient</span>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500">Color 1</label>
            <input
              type="color"
              value={color1}
              onChange={(e) => setColor1(e.target.value)}
              className="w-full h-8 rounded-md border border-zinc-800 bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500">Color 2</label>
            <input
              type="color"
              value={color2}
              onChange={(e) => setColor2(e.target.value)}
              className="w-full h-8 rounded-md border border-zinc-800 bg-transparent cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">Angle</span>
          <span className="text-[10px] text-zinc-400 font-mono">{angle}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="15"
          value={angle}
          onChange={(e) => setAngle(parseInt(e.target.value))}
          className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
        />

        {/* Preview */}
        <div
          className="h-10 rounded-lg border border-zinc-800"
          style={{
            background: `linear-gradient(${angle}deg, ${color1}, ${color2})`,
          }}
        />

        <div className="flex gap-2">
          <button
            onClick={applyCustomGradient}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
          >
            Apply
          </button>
          <button
            onClick={removeGradient}
            className="px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 text-xs font-semibold py-2 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
