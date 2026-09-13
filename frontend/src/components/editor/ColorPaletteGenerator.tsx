import React, { useState, useCallback, useEffect } from 'react';
import { Palette, Check, Droplets } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';

interface ColorPalette {
  name: string;
  colors: string[];
  type: 'extracted' | 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic';
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateComplementary(hex: string): string[] {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex(hsl.h + 180, hsl.s, hsl.l),
    hslToHex(hsl.h + 180, hsl.s * 0.7, hsl.l + 10),
    hslToHex(hsl.h, hsl.s * 0.5, hsl.l + 20),
    hslToHex(hsl.h + 180, hsl.s * 0.3, hsl.l - 10),
  ];
}

function generateAnalogous(hex: string): string[] {
  const hsl = hexToHsl(hex);
  return [
    hslToHex(hsl.h - 30, hsl.s, hsl.l),
    hslToHex(hsl.h - 15, hsl.s, hsl.l),
    hex,
    hslToHex(hsl.h + 15, hsl.s, hsl.l),
    hslToHex(hsl.h + 30, hsl.s, hsl.l),
  ];
}

function generateTriadic(hex: string): string[] {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex(hsl.h + 120, hsl.s, hsl.l),
    hslToHex(hsl.h + 240, hsl.s, hsl.l),
    hslToHex(hsl.h + 120, hsl.s * 0.6, hsl.l + 15),
    hslToHex(hsl.h + 240, hsl.s * 0.6, hsl.l + 15),
  ];
}

function generateSplitComplementary(hex: string): string[] {
  const hsl = hexToHsl(hex);
  return [
    hex,
    hslToHex(hsl.h + 150, hsl.s, hsl.l),
    hslToHex(hsl.h + 210, hsl.s, hsl.l),
    hslToHex(hsl.h + 150, hsl.s * 0.5, hsl.l + 20),
    hslToHex(hsl.h + 210, hsl.s * 0.5, hsl.l + 20),
  ];
}

function generateMonochromatic(hex: string): string[] {
  const hsl = hexToHsl(hex);
  return [
    hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 30)),
    hslToHex(hsl.h, hsl.s, Math.max(10, hsl.l - 15)),
    hex,
    hslToHex(hsl.h, hsl.s * 0.7, Math.min(90, hsl.l + 15)),
    hslToHex(hsl.h, hsl.s * 0.5, Math.min(95, hsl.l + 30)),
  ];
}

function extractColorsFromCanvas(canvas: fabric.Canvas): string[] {
  const colorMap = new Map<string, number>();
  canvas.getObjects().forEach((obj) => {
    const fill = obj.get('fill');
    if (typeof fill === 'string' && fill.startsWith('#')) {
      colorMap.set(fill, (colorMap.get(fill) || 0) + 1);
    }
    const stroke = obj.get('stroke');
    if (typeof stroke === 'string' && stroke.startsWith('#')) {
      colorMap.set(stroke, (colorMap.get(stroke) || 0) + 1);
    }
  });
  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([color]) => color);
}

export const ColorPaletteGenerator: React.FC = () => {
  const { canvas, selectedObject, fillColor, setFillColor } = useEditorStore();
  const [baseColor, setBaseColor] = useState(fillColor || '#8b5cf6');
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'extract'>('generate');

  const generatePalettes = useCallback((color: string) => {
    setPalettes([
      { name: 'Complementary', colors: generateComplementary(color), type: 'complementary' },
      { name: 'Analogous', colors: generateAnalogous(color), type: 'analogous' },
      { name: 'Triadic', colors: generateTriadic(color), type: 'triadic' },
      { name: 'Split Complementary', colors: generateSplitComplementary(color), type: 'split-complementary' },
      { name: 'Monochromatic', colors: generateMonochromatic(color), type: 'monochromatic' },
    ]);
  }, []);

  useEffect(() => {
    generatePalettes(baseColor);
  }, [baseColor, generatePalettes]);

  useEffect(() => {
    if (selectedObject) {
      const fill = selectedObject.get('fill');
      if (typeof fill === 'string' && fill.startsWith('#')) {
        setBaseColor(fill);
      }
    }
  }, [selectedObject]);

  const handleCopyColor = async (color: string) => {
    await navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const handleApplyColor = (color: string) => {
    setFillColor(color);
  };

  const extractedColors = canvas ? extractColorsFromCanvas(canvas) : [];

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-bold text-zinc-200">Color Palette</span>
      </div>

      {/* Base Color Picker */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Base Color</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            className="w-8 h-8 rounded-lg border border-zinc-700 cursor-pointer"
          />
          <input
            type="text"
            value={baseColor}
            onChange={(e) => {
              if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
                setBaseColor(e.target.value);
              }
            }}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 font-mono"
          />
          <button
            onClick={() => setBaseColor(fillColor || '#8b5cf6')}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Use selected object color"
          >
            <Droplets className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-0.5">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-1.5 text-[10px] font-semibold rounded-md transition-colors ${
            activeTab === 'generate' ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab('extract')}
          className={`flex-1 py-1.5 text-[10px] font-semibold rounded-md transition-colors ${
            activeTab === 'extract' ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Extract from Canvas
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
          {palettes.map((palette) => (
            <div key={palette.type} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5">
              <p className="text-[10px] font-semibold text-zinc-400 mb-2">{palette.name}</p>
              <div className="flex gap-1.5">
                {palette.colors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyColor(color)}
                    onContextMenu={(e) => { e.preventDefault(); handleCopyColor(color); }}
                    className="group relative flex-1 h-8 rounded-lg transition-transform hover:scale-110 hover:z-10 cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={`${color} — Click to apply, right-click to copy`}
                  >
                    {copiedColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 mt-1.5">
                {palette.colors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => handleCopyColor(color)}
                    className="flex-1 text-[8px] font-mono text-zinc-600 hover:text-zinc-300 transition-colors truncate"
                    title={`Copy ${color}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extract Tab */}
      {activeTab === 'extract' && (
        <div className="space-y-2">
          {extractedColors.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500">
              No colors found on canvas. Add elements with colors to extract.
            </div>
          ) : (
            <>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5">
                <p className="text-[10px] font-semibold text-zinc-400 mb-2">Canvas Colors</p>
                <div className="flex flex-wrap gap-1.5">
                  {extractedColors.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => handleApplyColor(color)}
                      onContextMenu={(e) => { e.preventDefault(); handleCopyColor(color); }}
                      className="group relative w-8 h-8 rounded-lg transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={`${color} — Click to apply`}
                    >
                      {copiedColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  if (extractedColors.length > 0) {
                    setBaseColor(extractedColors[0]);
                    setActiveTab('generate');
                  }
                }}
                className="w-full py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/30 rounded-lg text-[10px] font-semibold transition-colors"
              >
                Generate Palettes from Primary Color
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
