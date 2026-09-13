import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, RotateCcw, ScanText, Undo2 } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../../store/useEditorStore';
import type { PosterTextBlock } from '../../../types/uploads';
import {
  convertPosterRegionToText,
  enterPosterTextEditing,
  restoreOriginalPoster,
  revertAllPosterRegions,
  revertPosterRegion,
} from '../../../utils/posterConversionCanvas';

const readString = (object: fabric.Object | null, key: string) => {
  const value = object?.get(key as keyof fabric.Object);
  return typeof value === 'string' ? value : '';
};

const readBlock = (object: fabric.Object | null) => {
  const value = object?.get('posterTextBlock' as keyof fabric.Object);
  return value && typeof value === 'object' ? value as PosterTextBlock : null;
};

export const EditableImportControls: React.FC = () => {
  const { canvas, selectedObject, saveHistory, setSelectedObject } = useEditorStore();
  const conversionId = readString(selectedObject, 'posterConversionId');
  const role = readString(selectedObject, 'posterConversionRole');
  const block = readBlock(selectedObject);
  const [text, setText] = useState(block?.text || '');
  const [fontFamily, setFontFamily] = useState(block?.style.font_family_guess || 'Inter');
  const [fill, setFill] = useState(block?.style.fill || '#FFFFFF');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setText(block?.text || '');
    setFontFamily(block?.style.font_family_guess || 'Inter');
    setFill(block?.style.fill || '#FFFFFF');
    setError('');
  }, [block?.id, selectedObject]);

  const source = useMemo(() => (
    canvas?.getObjects().find((object) => (
      readString(object, 'posterConversionId') === conversionId
      && readString(object, 'posterConversionRole') === 'source'
    )) || null
  ), [canvas, conversionId, selectedObject]);

  if (!canvas || !conversionId) return null;

  const convert = async (editImmediately: boolean) => {
    if (!selectedObject || role !== 'ocr-hotspot') return;
    setBusy(true);
    setError('');
    try {
      const result = await convertPosterRegionToText(canvas, selectedObject, {
        text: text.trim() || block?.text,
        fontFamily,
        fill,
      });
      canvas.setActiveObject(result.text);
      setSelectedObject(result.text);
      saveHistory();
      if (editImmediately) {
        enterPosterTextEditing(canvas, result.text, { selectAll: true });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to convert this text region.');
    } finally {
      setBusy(false);
    }
  };

  const revertSelected = () => {
    if (!selectedObject) return;
    const hotspot = revertPosterRegion(canvas, selectedObject);
    setSelectedObject(hotspot);
    saveHistory();
  };

  const revertAll = () => {
    const nextSource = revertAllPosterRegions(canvas, conversionId);
    setSelectedObject(nextSource);
    saveHistory();
  };

  const restore = () => {
    const original = restoreOriginalPoster(canvas, conversionId);
    setSelectedObject(original || null);
    saveHistory();
  };

  const warnings = (
    source?.get('posterWarnings' as keyof fabric.Object) || []
  ) as string[];
  const convertedCount = (
    source?.get('posterConvertedRegionIds' as keyof fabric.Object) || []
  ) as string[];

  return (
    <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Pixel-Perfect Editable Import</h3>
        <span className="text-[8px] text-emerald-300/70">{convertedCount.length} converted</span>
      </div>

      {role === 'ocr-hotspot' && block && (
        <div className="mt-3 space-y-2">
          <label className="block text-[9px] font-semibold text-zinc-400">
            Detected text
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={Math.min(4, Math.max(2, text.split('\n').length))}
              className="mt-1 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px] text-zinc-100 outline-none focus:border-violet-500"
            />
          </label>
          <label className="block text-[9px] font-semibold text-zinc-400">
            Font
            <input
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px] text-zinc-100 outline-none focus:border-violet-500"
            />
          </label>
          <label className="flex items-center gap-2 text-[9px] font-semibold text-zinc-400">
            Color
            <input type="color" value={fill} onChange={(event) => setFill(event.target.value)} className="h-8 w-10 rounded border border-zinc-700 bg-transparent" />
            <span className="font-mono text-zinc-500">{fill.toUpperCase()}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => void convert(true)} className="flex items-center justify-center gap-1 rounded-lg bg-violet-600 px-2 py-2 text-[9px] font-bold text-white hover:bg-violet-500 disabled:opacity-40">
              <Pencil className="h-3 w-3" /> Edit Text
            </button>
            <button type="button" disabled={busy} onClick={() => void convert(false)} className="flex items-center justify-center gap-1 rounded-lg border border-violet-500/40 px-2 py-2 text-[9px] font-bold text-violet-200 hover:bg-violet-500/10 disabled:opacity-40">
              <ScanText className="h-3 w-3" /> Convert Layer
            </button>
          </div>
          <p className="text-[8px] leading-4 text-zinc-500">Only this selected text region is cleaned. Every surrounding source pixel stays untouched.</p>
        </div>
      )}

      {['text', 'clean-patch'].includes(role) && (
        <button type="button" onClick={revertSelected} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-amber-500/30 px-2 py-2 text-[9px] font-bold text-amber-200 hover:bg-amber-500/10">
          <Undo2 className="h-3 w-3" /> Revert Selected Text Region
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={!convertedCount.length} onClick={revertAll} className="flex items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2 py-2 text-[9px] font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30">
          <RotateCcw className="h-3 w-3" /> Revert All
        </button>
        <button type="button" onClick={restore} className="flex items-center justify-center gap-1 rounded-lg border border-rose-500/30 px-2 py-2 text-[9px] font-bold text-rose-200 hover:bg-rose-500/10">
          <RotateCcw className="h-3 w-3" /> Restore Original
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[8px] leading-4 text-rose-300">{error}</p>}
      {warnings.length > 0 && <p className="mt-2 text-[8px] leading-4 text-amber-200/70">{warnings[0]}</p>}
    </section>
  );
};
