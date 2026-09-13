import React from 'react';
import { fabric } from 'fabric';
import {
  Eye,
  EyeOff,
  Frame,
  Grid3x3,
  Minus,
  Plus,
  Tags,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  EDITORIAL_TECH_PALETTE,
  applyEditorialTechPoster,
  createEditorialBorder,
  createEditorialDivider,
  createEditorialGrid,
  createEditorialTag,
  createEditorialTagRow,
} from '../../utils/editorialPoster';

const replaceEditorialObject = (
  canvas: fabric.Canvas,
  role: string,
  object: fabric.Object,
  index: number,
) => {
  canvas.getObjects()
    .filter((candidate) => candidate.get('editorialRole' as keyof fabric.Object) === role)
    .forEach((candidate) => canvas.remove(candidate));
  canvas.insertAt(object, Math.max(0, Math.min(index, canvas.getObjects().length)), false);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
};

export const EditorialPosterPanel: React.FC = () => {
  const { canvas, saveHistory, setCanvasDimensions } = useEditorStore();
  const [gridSize, setGridSize] = React.useState(84);
  const [gridOpacity, setGridOpacity] = React.useState(0.1);
  const [gridLineWidth, setGridLineWidth] = React.useState(1);
  const [gridColor, setGridColor] = React.useState<string>(EDITORIAL_TECH_PALETTE.grid);
  const [gridVisible, setGridVisible] = React.useState(true);
  const [borderInset, setBorderInset] = React.useState(6);
  const [borderThickness, setBorderThickness] = React.useState(2);
  const [borderOpacity, setBorderOpacity] = React.useState(0.85);
  const [borderColor, setBorderColor] = React.useState<string>(EDITORIAL_TECH_PALETTE.white);
  const [borderRadius, setBorderRadius] = React.useState(0);
  const [tagText, setTagText] = React.useState('routers');
  const [tagActive, setTagActive] = React.useState(true);
  const [tagPaddingX, setTagPaddingX] = React.useState(20);
  const [tagPaddingY, setTagPaddingY] = React.useState(12);
  const [tagFontSize, setTagFontSize] = React.useState(20);
  const [tagFontFamily, setTagFontFamily] = React.useState('Space Mono, Menlo, Monaco, Consolas, monospace');
  const [tagManualWidth, setTagManualWidth] = React.useState(0);
  const [tagGap, setTagGap] = React.useState(14);
  const [tagCornerRadius, setTagCornerRadius] = React.useState(0);
  const [tagBorderWidth, setTagBorderWidth] = React.useState(2);
  const [tagTextColor, setTagTextColor] = React.useState<string>(EDITORIAL_TECH_PALETTE.gold);
  const [tagBackgroundColor, setTagBackgroundColor] = React.useState('#080f0c');
  const [tagBorderColor, setTagBorderColor] = React.useState<string>(EDITORIAL_TECH_PALETTE.activeBorder);
  const [message, setMessage] = React.useState('');

  const commit = (nextMessage: string) => {
    if (!canvas) return;
    canvas.requestRenderAll();
    saveHistory();
    setMessage(nextMessage);
  };

  const applyTemplate = async () => {
    if (!canvas) return;
    setMessage('Loading editorial fonts…');
    await applyEditorialTechPoster(canvas);
    setCanvasDimensions(1080, 1080);
    setGridVisible(true);
    commit('Editorial Tech API Poster applied. Every element is editable.');
  };

  const applyGrid = () => {
    if (!canvas) return;
    const grid = createEditorialGrid(canvas.getWidth(), canvas.getHeight(), {
      size: gridSize,
      opacity: gridOpacity,
      lineWidth: gridLineWidth,
      color: gridColor,
    });
    const backgroundIndex = canvas.getObjects().some((object) => object.get('editorialRole' as keyof fabric.Object) === 'background') ? 1 : 0;
    replaceEditorialObject(canvas, 'grid', grid, backgroundIndex);
    setGridVisible(true);
    commit('Exportable editorial grid added.');
  };

  const toggleGrid = () => {
    if (!canvas) return;
    const grid = canvas.getObjects().find((object) => object.get('editorialRole' as keyof fabric.Object) === 'grid');
    if (!grid) {
      applyGrid();
      return;
    }
    const visible = grid.visible === false;
    grid.set('visible', visible);
    setGridVisible(visible);
    commit(visible ? 'Editorial grid shown.' : 'Editorial grid hidden.');
  };

  const removeEditorialObject = (role: 'grid' | 'border') => {
    if (!canvas) return;
    const matches = canvas.getObjects().filter((object) => object.get('editorialRole' as keyof fabric.Object) === role);
    if (!matches.length) return;
    canvas.remove(...matches);
    if (role === 'grid') setGridVisible(false);
    commit(`${role === 'grid' ? 'Grid' : 'Border'} removed without affecting other elements.`);
  };

  const applyBorder = () => {
    if (!canvas) return;
    const border = createEditorialBorder(canvas.getWidth(), canvas.getHeight(), {
      inset: borderInset,
      thickness: borderThickness,
      opacity: borderOpacity,
      color: borderColor,
      cornerRadius: borderRadius,
    });
    const lowLayerCount = canvas.getObjects().filter((object) => (
      ['background', 'grid'].includes(String(object.get('editorialRole' as keyof fabric.Object) || ''))
    )).length;
    replaceEditorialObject(canvas, 'border', border, lowLayerCount);
    commit('Editable poster border added.');
  };

  const addDivider = () => {
    if (!canvas) return;
    const divider = createEditorialDivider(canvas.getWidth(), canvas.getHeight() / 2);
    canvas.add(divider);
    canvas.setActiveObject(divider);
    commit('Gold divider added.');
  };

  const addTag = () => {
    if (!canvas || !tagText.trim()) return;
    const tag = createEditorialTag(tagText.trim(), {
      active: tagActive,
      paddingX: tagPaddingX,
      paddingY: tagPaddingY,
      fontSize: tagFontSize,
      fontFamily: tagFontFamily,
      manualWidth: tagManualWidth || undefined,
      textColor: tagTextColor,
      backgroundColor: tagBackgroundColor,
      borderColor: tagBorderColor,
      borderWidth: tagBorderWidth,
      cornerRadius: tagCornerRadius,
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
    });
    canvas.add(tag);
    canvas.setActiveObject(tag);
    commit('Editable auto-width tag added.');
  };

  const setActiveTagStyle = (active: boolean) => {
    setTagActive(active);
    setTagTextColor(active ? EDITORIAL_TECH_PALETTE.gold : EDITORIAL_TECH_PALETTE.gray);
    setTagBorderColor(active ? EDITORIAL_TECH_PALETTE.activeBorder : EDITORIAL_TECH_PALETTE.inactiveBorder);
  };

  const addTagRow = () => {
    if (!canvas) return;
    const tags = createEditorialTagRow(
      canvas.getWidth(),
      canvas.getHeight() * 0.72,
      ['routers', 'Depends()', 'auth', 'deploy'],
      tagGap,
      {
        paddingX: tagPaddingX,
        paddingY: tagPaddingY,
        fontSize: tagFontSize,
        fontFamily: tagFontFamily,
        manualWidth: tagManualWidth || undefined,
        backgroundColor: tagBackgroundColor,
        borderWidth: tagBorderWidth,
        cornerRadius: tagCornerRadius,
      },
    );
    canvas.add(...tags);
    canvas.setActiveObject(new fabric.ActiveSelection(tags, { canvas }));
    commit('Four evenly spaced editable tags added.');
  };

  const setPageColor = (color: string) => {
    if (!canvas) return;
    canvas.setBackgroundColor(color, () => canvas.requestRenderAll());
    commit(`Page background changed to ${color}.`);
  };

  return (
    <section className="space-y-4 border-b border-zinc-800 p-3 pb-5">
      <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#101914] to-[#080d0b] p-3">
        <div className="flex items-center gap-2 text-amber-300">
          <WandSparkles className="h-4 w-4" />
          <div>
            <h3 className="text-xs font-black">Editorial Tech Poster</h3>
            <p className="text-[9px] font-medium text-zinc-500">Technology · Developer · 1080 × 1080</p>
          </div>
        </div>
        <button
          type="button"
          onClick={applyTemplate}
          className="mt-3 w-full rounded-xl bg-amber-500 px-3 py-2 text-[11px] font-black text-[#07100D] transition hover:bg-amber-400"
        >
          Apply Editable Template
        </button>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Editorial Palette</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EDITORIAL_TECH_PALETTE).map(([name, color]) => (
            <button
              key={name}
              type="button"
              onClick={() => setPageColor(color)}
              className="h-7 w-7 rounded-md border border-white/15 shadow-sm transition hover:scale-110"
              style={{ background: color }}
              title={`${name}: ${color}`}
              aria-label={`Set page background to ${name}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <Grid3x3 className="h-3.5 w-3.5 text-emerald-400" /> Exportable Grid
        </div>
        <label className="grid grid-cols-[70px_1fr_48px] items-center gap-2 text-[9px] text-zinc-500">
          Size
          <input type="range" min="40" max="140" step="2" value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))} className="accent-emerald-500" />
          <input type="number" min="20" max="200" value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))} className="rounded border border-zinc-800 bg-zinc-950 px-1 py-1 text-center text-zinc-300" />
        </label>
        <label className="grid grid-cols-[70px_1fr_48px] items-center gap-2 text-[9px] text-zinc-500">
          Opacity
          <input type="range" min="0.02" max="0.4" step="0.01" value={gridOpacity} onChange={(event) => setGridOpacity(Number(event.target.value))} className="accent-emerald-500" />
          <input type="number" min="0.01" max="1" step="0.01" value={gridOpacity} onChange={(event) => setGridOpacity(Number(event.target.value))} className="rounded border border-zinc-800 bg-zinc-950 px-1 py-1 text-center text-zinc-300" />
        </label>
        <label className="grid grid-cols-[70px_1fr_48px] items-center gap-2 text-[9px] text-zinc-500">
          Thickness
          <input type="range" min="0.25" max="4" step="0.25" value={gridLineWidth} onChange={(event) => setGridLineWidth(Number(event.target.value))} className="accent-emerald-500" />
          <input type="number" min="0.25" max="8" step="0.25" value={gridLineWidth} onChange={(event) => setGridLineWidth(Number(event.target.value))} className="rounded border border-zinc-800 bg-zinc-950 px-1 py-1 text-center text-zinc-300" />
        </label>
        <div className="flex gap-2">
          <input type="color" value={gridColor} onChange={(event) => setGridColor(event.target.value)} className="h-8 w-10 rounded border border-zinc-700 bg-transparent" />
          <button type="button" onClick={applyGrid} className="flex-1 rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-emerald-500">Add / Update Grid</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={toggleGrid} className="flex items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2 py-2 text-[9px] font-bold text-zinc-300">
            {gridVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {gridVisible ? 'Hide Grid' : 'Show Grid'}
          </button>
          <button type="button" onClick={() => removeEditorialObject('grid')} className="flex items-center justify-center gap-1 rounded-lg border border-red-500/30 px-2 py-2 text-[9px] font-bold text-red-300">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <Frame className="h-3.5 w-3.5 text-amber-400" /> Poster Border
        </div>
        {[
          ['Inset', borderInset, setBorderInset, 0, 60, 1],
          ['Thickness', borderThickness, setBorderThickness, 0.5, 20, 0.5],
          ['Opacity', borderOpacity, setBorderOpacity, 0.05, 1, 0.05],
          ['Radius', borderRadius, setBorderRadius, 0, 100, 1],
        ].map(([label, value, setter, min, max, step]) => (
          <label key={String(label)} className="grid grid-cols-[70px_1fr_48px] items-center gap-2 text-[9px] text-zinc-500">
            {String(label)}
            <input type="range" min={Number(min)} max={Number(max)} step={Number(step)} value={Number(value)} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(event.target.value))} className="accent-amber-500" />
            <input type="number" min={Number(min)} max={Number(max)} step={Number(step)} value={Number(value)} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(event.target.value))} className="rounded border border-zinc-800 bg-zinc-950 px-1 py-1 text-center text-zinc-300" />
          </label>
        ))}
        <div className="flex gap-2">
          <input type="color" value={borderColor} onChange={(event) => setBorderColor(event.target.value)} className="h-8 w-10 rounded border border-zinc-700 bg-transparent" />
          <button type="button" onClick={applyBorder} className="flex-1 rounded-lg bg-amber-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-amber-500">Add / Update Border</button>
        </div>
        <button type="button" onClick={() => removeEditorialObject('border')} className="flex w-full items-center justify-center gap-1 rounded-lg border border-red-500/30 px-2 py-2 text-[9px] font-bold text-red-300">
          <Trash2 className="h-3 w-3" /> Remove Border
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <Tags className="h-3.5 w-3.5 text-violet-400" /> Editable Tags
        </div>
        <input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="Tag text" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px] text-zinc-200 outline-none focus:border-violet-500" />
        <label className="flex items-center justify-between text-[9px] text-zinc-500">
          Active gold style
          <input type="checkbox" checked={tagActive} onChange={(event) => setActiveTagStyle(event.target.checked)} className="accent-amber-500" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[9px] text-zinc-500">Horizontal padding<input type="number" min="6" max="80" value={tagPaddingX} onChange={(event) => setTagPaddingX(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
          <label className="text-[9px] text-zinc-500">Vertical padding<input type="number" min="4" max="50" value={tagPaddingY} onChange={(event) => setTagPaddingY(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
          <label className="text-[9px] text-zinc-500">Font size<input type="number" min="8" max="72" value={tagFontSize} onChange={(event) => setTagFontSize(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
          <label className="text-[9px] text-zinc-500">Manual width<input type="number" min="0" max="600" value={tagManualWidth} onChange={(event) => setTagManualWidth(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
          <label className="text-[9px] text-zinc-500">Border width<input type="number" min="0" max="12" step="0.5" value={tagBorderWidth} onChange={(event) => setTagBorderWidth(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
          <label className="text-[9px] text-zinc-500">Corner radius<input type="number" min="0" max="80" value={tagCornerRadius} onChange={(event) => setTagCornerRadius(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
          <label className="text-[9px] text-zinc-500">Row gap<input type="number" min="0" max="100" value={tagGap} onChange={(event) => setTagGap(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-300" /></label>
        </div>
        <label className="block text-[9px] text-zinc-500">
          Font
          <select value={tagFontFamily} onChange={(event) => setTagFontFamily(event.target.value)} className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-zinc-300">
            <option value="Space Mono, Menlo, Monaco, Consolas, monospace">Space Mono</option>
            <option value="IBM Plex Mono, Menlo, Monaco, Consolas, monospace">IBM Plex Mono</option>
            <option value="Inter, Arial, sans-serif">Inter</option>
            <option value="Playfair Display, Georgia, serif">Playfair Display</option>
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2 text-center text-[8px] text-zinc-600">
          <label>Text<input type="color" value={tagTextColor} onChange={(event) => setTagTextColor(event.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-700 bg-transparent" /></label>
          <label>Box<input type="color" value={tagBackgroundColor} onChange={(event) => setTagBackgroundColor(event.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-700 bg-transparent" /></label>
          <label>Border<input type="color" value={tagBorderColor} onChange={(event) => setTagBorderColor(event.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-700 bg-transparent" /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={addTag} className="flex items-center justify-center gap-1 rounded-lg bg-violet-600 px-2 py-2 text-[10px] font-bold text-white hover:bg-violet-500"><Plus className="h-3 w-3" /> Add Tag</button>
          <button type="button" onClick={addTagRow} className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-2 py-2 text-[10px] font-bold text-violet-200">Add Tag Row</button>
        </div>
        <p className="text-[9px] leading-4 text-zinc-600">Double-click a tag to edit its text. Width follows the text after ungrouping.</p>
      </div>

      <button type="button" onClick={addDivider} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-200 hover:bg-amber-500/15">
        <Minus className="h-3.5 w-3.5" /> Add Gold Divider
      </button>

      {message && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[9px] text-emerald-200">{message}</div>}
    </section>
  );
};
