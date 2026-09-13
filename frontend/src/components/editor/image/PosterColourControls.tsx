import React, { useMemo, useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../../store/useEditorStore';
import type { PosterPaletteColour } from '../../../types/uploads';
import { setPosterRegionColour } from '../../../utils/posterConversionCanvas';

const readString = (object: fabric.Object | null, key: string) => {
  const value = object?.get(key as keyof fabric.Object);
  return typeof value === 'string' ? value : '';
};

const readConfig = (object: fabric.Object | null) => {
  const value = object?.get('posterRegionConfig' as keyof fabric.Object);
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
};

export const PosterColourControls: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();
  const conversionId = readString(selectedObject, 'posterConversionId');
  const selectedConfig = readConfig(selectedObject);
  const [replacement, setReplacement] = useState(
    typeof selectedConfig?.currentColor === 'string'
      ? selectedConfig.currentColor
      : typeof selectedConfig?.color === 'string'
        ? selectedConfig.color
        : '#8B5CF6',
  );

  const conversionObjects = useMemo(() => (
    canvas?.getObjects().filter((object) => readString(object, 'posterConversionId') === conversionId) || []
  ), [canvas, conversionId]);
  const regionObjects = conversionObjects.filter((object) => readString(object, 'posterConversionRole') === 'region');
  const cleanBackground = conversionObjects.find((object) => readString(object, 'posterConversionRole') === 'clean-background');
  const palette = (
    cleanBackground?.get('posterPalette' as keyof fabric.Object) || []
  ) as PosterPaletteColour[];

  if (!canvas || !conversionId) return null;

  const applyTo = (objects: fabric.Object[]) => {
    let changed = false;
    objects.forEach((object) => {
      changed = setPosterRegionColour(object, replacement) || changed;
    });
    if (!changed) return;
    canvas.requestRenderAll();
    saveHistory();
  };

  const selectedOriginal = typeof selectedConfig?.originalColor === 'string'
    ? selectedConfig.originalColor
    : typeof selectedConfig?.color === 'string'
      ? selectedConfig.color
      : '';

  const resetSelected = () => {
    if (!selectedObject || !selectedOriginal) return;
    setPosterRegionColour(selectedObject, selectedOriginal);
    setReplacement(selectedOriginal);
    canvas.requestRenderAll();
    saveHistory();
  };

  return (
    <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-violet-300" />
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Poster Colours</h3>
      </div>
      {palette.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {palette.map((item) => (
            <button
              key={item.color}
              type="button"
              title={`${item.color} · ${item.percentage}% · ${item.region_count} regions`}
              onClick={() => setReplacement(item.color)}
              className="h-7 w-7 rounded-md border border-white/10"
              style={{ backgroundColor: item.color }}
              aria-label={`Choose poster colour ${item.color}`}
            />
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <input type="color" value={replacement} onChange={(event) => setReplacement(event.target.value)} aria-label="Replacement region colour" className="h-9 w-10 rounded border border-zinc-700 bg-transparent" />
        <input type="text" value={replacement.toUpperCase()} onChange={(event) => setReplacement(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 font-mono text-[9px] text-zinc-300" aria-label="Replacement colour hexadecimal value" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={!selectedConfig} onClick={() => selectedObject && applyTo([selectedObject])} className="rounded-lg bg-violet-600 px-2 py-2 text-[9px] font-bold text-white disabled:opacity-30">Replace selected region</button>
        <button type="button" disabled={!selectedOriginal} onClick={() => applyTo(regionObjects.filter((object) => readConfig(object)?.originalColor === selectedOriginal))} className="rounded-lg border border-zinc-700 px-2 py-2 text-[9px] font-bold text-zinc-300 disabled:opacity-30">Replace similar regions</button>
        <button type="button" disabled={!regionObjects.length} onClick={() => applyTo(regionObjects)} className="rounded-lg border border-zinc-700 px-2 py-2 text-[9px] font-bold text-zinc-300 disabled:opacity-30">Replace globally</button>
        <button type="button" disabled={!selectedConfig} onClick={resetSelected} className="flex items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2 py-2 text-[9px] font-bold text-zinc-300 disabled:opacity-30"><RotateCcw className="h-3 w-3" /> Reset region</button>
      </div>
      <p className="mt-2 text-[8px] leading-4 text-zinc-600">
        Select a detected region layer to recolour only that mask. “Replace globally” changes all reconstructed colour regions.
      </p>
    </section>
  );
};
