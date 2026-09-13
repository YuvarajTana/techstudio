import React, { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import { applyImageEffectConfig, readImageEffectConfig } from '../../utils/imageEffects';
import type { ImageEffectConfig } from '../../types/editorFeatures';
import { moveLayerObject } from '../../utils/layerOrdering';

const isSticker = (object: fabric.Object | null): object is fabric.Object => object?.get('objectType' as keyof fabric.Object) === 'sticker';

const tintSvgObject = (object: fabric.Object, color: string) => {
  if (object.type === 'group') {
    (object as fabric.Group).getObjects().forEach((child) => tintSvgObject(child, color));
    return;
  }
  const fill = object.get('fill');
  if (typeof fill === 'string' && fill !== 'none' && fill !== 'transparent') object.set('fill', color);
  const stroke = object.get('stroke');
  if (typeof stroke === 'string' && stroke !== 'none' && stroke !== 'transparent') object.set('stroke', color);
};

export const StickerEditingControls: React.FC = () => {
  const { canvas, selectedObject, saveHistory, duplicateSelected, deleteSelected } = useEditorStore();
  const [opacity, setOpacity] = useState(100);
  const [tint, setTint] = useState('#8b5cf6');
  const [rasterEffects, setRasterEffects] = useState<Required<ImageEffectConfig> | null>(null);

  useEffect(() => {
    if (!isSticker(selectedObject)) return;
    setOpacity(Math.round(Number(selectedObject.opacity ?? 1) * 100));
    setTint(String(selectedObject.get('stickerTintColor' as keyof fabric.Object) || '#8b5cf6'));
    setRasterEffects(selectedObject.type === 'image' ? readImageEffectConfig(selectedObject as fabric.Image) : null);
  }, [selectedObject]);

  if (!canvas || !isSticker(selectedObject)) return null;

  const render = (commit = false) => {
    selectedObject.setCoords();
    canvas.requestRenderAll();
    if (commit) saveHistory();
  };

  const flip = (axis: 'X' | 'Y') => {
    selectedObject.set(axis === 'X' ? 'flipX' : 'flipY', axis === 'X' ? !selectedObject.flipX : !selectedObject.flipY);
    render(true);
  };

  const applyTint = (color: string) => {
    setTint(color);
    selectedObject.set({ stickerTintColor: color } as Record<string, unknown>);
    if (selectedObject.type === 'image') {
      const image = selectedObject as fabric.Image;
      const base = readImageEffectConfig(image);
      applyImageEffectConfig(image, base);
      const BlendColor = (fabric.Image.filters as typeof fabric.Image.filters).BlendColor;
      image.filters = [...(image.filters || []), new BlendColor({ color, mode: 'tint', alpha: 0.45 })];
      image.applyFilters();
    } else {
      tintSvgObject(selectedObject, color);
    }
    render();
  };

  const updateRasterEffect = (key: keyof ImageEffectConfig, value: number) => {
    if (selectedObject.type !== 'image') return;
    const next = { ...(rasterEffects || readImageEffectConfig(selectedObject as fabric.Image)), [key]: value, preset: 'Custom' };
    setRasterEffects(next);
    applyImageEffectConfig(selectedObject as fabric.Image, next);
    render();
  };

  const setShadow = (mode: 'shadow' | 'glow' | 'none') => {
    if (mode === 'none') selectedObject.set('shadow', undefined);
    else if (mode === 'glow') selectedObject.set('shadow', new fabric.Shadow({ color: tint, blur: 28, offsetX: 0, offsetY: 0 }));
    else selectedObject.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: 16, offsetX: 8, offsetY: 10 }));
    render(true);
  };

  const alignCenter = () => {
    selectedObject.set({ left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center' });
    render(true);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3" aria-label="Selected sticker controls">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">Selected Sticker</div>
          <div className="mt-0.5 max-w-[170px] truncate text-[9px] text-zinc-500">{String(selectedObject.get('stickerName' as keyof fabric.Object) || 'Sticker')}</div>
        </div>
        <button type="button" onClick={() => { selectedObject.set('lockMovementX', !selectedObject.lockMovementX); selectedObject.set('lockMovementY', !selectedObject.lockMovementY); render(true); }} className="rounded-lg border border-zinc-800 px-2 py-1 text-[9px] font-bold text-zinc-300">
          {selectedObject.lockMovementX ? 'Unlock' : 'Lock'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => flip('X')} className="min-h-10 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Flip H</button>
        <button type="button" onClick={() => flip('Y')} className="min-h-10 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Flip V</button>
        <button type="button" onClick={() => { selectedObject.rotate(((selectedObject.angle || 0) + 45) % 360); render(true); }} className="min-h-10 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Rotate</button>
      </div>

      <label className="grid grid-cols-[54px_1fr_30px] items-center gap-2 text-[9px] text-zinc-500">
        <span>Opacity</span>
        <input type="range" aria-label="Sticker opacity" min="0" max="100" value={opacity} onChange={(event) => { const value = Number(event.target.value); setOpacity(value); selectedObject.set('opacity', value / 100); render(); }} onPointerUp={() => saveHistory()} className="accent-violet-500" />
        <span className="text-right text-zinc-300">{opacity}</span>
      </label>

      <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 text-[9px] text-zinc-400">
        Tint / SVG colour
        <input type="color" aria-label="Sticker tint colour" value={tint} onChange={(event) => applyTint(event.target.value)} onBlur={() => saveHistory()} className="h-7 w-10 rounded bg-transparent" />
      </label>

      {rasterEffects && (
        <div className="space-y-2">
          {([
            ['brightness', 'Brightness', -100, 100],
            ['contrast', 'Contrast', -100, 100],
            ['saturation', 'Saturation', -100, 100],
            ['blur', 'Blur', 0, 100],
          ] as Array<[keyof ImageEffectConfig, string, number, number]>).map(([key, label, min, max]) => (
            <label key={key} className="grid grid-cols-[54px_1fr_28px] items-center gap-2 text-[9px] text-zinc-500">
              <span>{label}</span>
              <input type="range" aria-label={`Sticker ${label.toLowerCase()}`} min={min} max={max} value={Number(rasterEffects[key])} onChange={(event) => updateRasterEffect(key, Number(event.target.value))} onPointerUp={() => saveHistory()} className="accent-violet-500" />
              <span className="text-right text-zinc-300">{Number(rasterEffects[key])}</span>
            </label>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setShadow('shadow')} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Shadow</button>
        <button type="button" onClick={() => setShadow('glow')} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Glow</button>
        <button type="button" onClick={() => setShadow('none')} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">No FX</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => { if (moveLayerObject(canvas, selectedObject, 'forward')) render(true); }} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Forward</button>
        <button type="button" onClick={() => { if (moveLayerObject(canvas, selectedObject, 'backward')) render(true); }} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Backward</button>
        <button type="button" onClick={alignCenter} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Center</button>
        <button type="button" onClick={duplicateSelected} className="min-h-9 rounded-lg border border-zinc-800 text-[9px] font-bold text-zinc-300">Duplicate</button>
        <button type="button" onClick={deleteSelected} className="col-span-2 min-h-9 rounded-lg border border-rose-500/30 text-[9px] font-bold text-rose-300">Delete Sticker</button>
      </div>
    </section>
  );
};
