import React, { useState } from 'react';
import { Grid3x3, Waves, Sun, Snowflake, Braces, Sparkles, Circle } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import { EditorialPosterPanel } from './EditorialPosterPanel';

interface PatternOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  generate: (width: number, height: number, color: string) => string;
}

function generateDotPattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1.5" fill="${color}" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateLinePattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="lines" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 20 L20 0" stroke="${color}" stroke-width="0.5" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lines)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateGridPattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="${color}" stroke-width="0.3" opacity="0.25"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateWavePattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="waves" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 10 Q10 0 20 10 Q30 20 40 10" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#waves)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateHexPattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="hex" x="0" y="0" width="28" height="49" patternUnits="userSpaceOnUse" patternTransform="scale(0.5)">
          <path d="M14 0 L28 8.5 L28 25.5 L14 34 L0 25.5 L0 8.5 Z" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateCirclePattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="15" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circles)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateDiamondPattern(w: number, h: number, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <pattern id="diamonds" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M12 0 L24 12 L12 24 L0 12 Z" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diamonds)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const PATTERN_OPTIONS: PatternOption[] = [
  { id: 'dots', name: 'Dots', icon: <Circle className="w-4 h-4" />, generate: generateDotPattern },
  { id: 'lines', name: 'Diagonal Lines', icon: <Braces className="w-4 h-4" />, generate: generateLinePattern },
  { id: 'grid', name: 'Grid', icon: <Grid3x3 className="w-4 h-4" />, generate: generateGridPattern },
  { id: 'waves', name: 'Waves', icon: <Waves className="w-4 h-4" />, generate: generateWavePattern },
  { id: 'hexagons', name: 'Hexagons', icon: <Snowflake className="w-4 h-4" />, generate: generateHexPattern },
  { id: 'circles', name: 'Circles', icon: <Sun className="w-4 h-4" />, generate: generateCirclePattern },
  { id: 'diamonds', name: 'Diamonds', icon: <Sparkles className="w-4 h-4" />, generate: generateDiamondPattern },
];

export const BackgroundPatterns: React.FC = () => {
  const { canvas, canvasWidth, canvasHeight, saveHistory } = useEditorStore();
  const [patternColor, setPatternColor] = useState('#8b5cf6');
  const [activePattern, setActivePattern] = useState<string | null>(null);

  const applyPattern = (pattern: PatternOption) => {
    if (!canvas) return;

    // Remove existing pattern overlay
    const existing = canvas.getObjects().find(
      (obj) => (obj as any).teckstudioObjectType === 'bgPattern'
    );
    if (existing) canvas.remove(existing);

    const patternUrl = pattern.generate(canvasWidth, canvasHeight, patternColor);

    fabric.Image.fromURL(patternUrl, (img) => {
      if (!img) return;
      img.set({
        left: 0,
        top: 0,
        scaleX: canvasWidth / (img.width || canvasWidth),
        scaleY: canvasHeight / (img.height || canvasHeight),
        selectable: false,
        evented: false,
        excludeFromExport: false,
        teckstudioObjectType: 'bgPattern',
      } as any);

      // Add as first object (background layer)
      canvas.insertAt(img, 0, false);
      canvas.renderAll();
      saveHistory();
      setActivePattern(pattern.id);
    });
  };

  const removePattern = () => {
    if (!canvas) return;
    const existing = canvas.getObjects().find(
      (obj) => (obj as any).teckstudioObjectType === 'bgPattern'
    );
    if (existing) {
      canvas.remove(existing);
      canvas.renderAll();
      saveHistory();
      setActivePattern(null);
    }
  };

  return (
    <div>
      <EditorialPosterPanel />
      <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Grid3x3 className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-bold text-zinc-200">Background Patterns</span>
      </div>

      {/* Pattern Color */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Pattern Color</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={patternColor}
            onChange={(e) => setPatternColor(e.target.value)}
            className="w-7 h-7 rounded border border-zinc-700 cursor-pointer"
          />
          <input
            type="text"
            value={patternColor}
            onChange={(e) => {
              if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setPatternColor(e.target.value);
            }}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-200 font-mono"
          />
        </div>
      </div>

      {/* Pattern Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {PATTERN_OPTIONS.map((pattern) => (
          <button
            key={pattern.id}
            onClick={() => applyPattern(pattern)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
              activePattern === pattern.id
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
            }`}
            title={`Apply ${pattern.name} pattern`}
          >
            {pattern.icon}
            <span className="text-[8px] font-semibold">{pattern.name}</span>
          </button>
        ))}
      </div>

      {/* Remove Pattern */}
      {activePattern && (
        <button
          onClick={removePattern}
          className="w-full py-1.5 text-[10px] font-semibold text-zinc-500 hover:text-rose-400 transition-colors"
        >
          Remove Pattern
        </button>
      )}

      {/* Tips */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2">
        <p className="text-[9px] text-zinc-500">
          Patterns are added as a background layer. They can be selected and deleted from the Layers panel.
        </p>
      </div>
      </div>
    </div>
  );
};
