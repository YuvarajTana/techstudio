import React, { useState } from 'react';
import { Grid3x3, Magnet, Eye, EyeOff, Ruler } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';

export const GridOverlay: React.FC = () => {
  const { canvas, rulersEnabled, setRulersEnabled, canvasWidth, canvasHeight } = useEditorStore();
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(25);

  const toggleGrid = () => {
    if (!canvas) return;
    const newShow = !showGrid;
    setShowGrid(newShow);

    if (newShow) {
      drawGrid();
    } else {
      removeGrid();
    }
  };

  const drawGrid = () => {
    if (!canvas) return;
    removeGrid();

    const cw = canvas.getWidth() || canvasWidth || 800;
    const ch = canvas.getHeight() || canvasHeight || 800;

    for (let i = 0; i <= cw; i += gridSize) {
      const line = new fabric.Line([i, 0, i, ch], {
        stroke: '#3f3f46',
        strokeWidth: i % 100 === 0 ? 0.8 : 0.3,
        selectable: false,
        evented: false,
        opacity: 0.5,
        excludeFromExport: true,
        data: { isGridLine: true },
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }

    for (let j = 0; j <= ch; j += gridSize) {
      const line = new fabric.Line([0, j, cw, j], {
        stroke: '#3f3f46',
        strokeWidth: j % 100 === 0 ? 0.8 : 0.3,
        selectable: false,
        evented: false,
        opacity: 0.5,
        excludeFromExport: true,
        data: { isGridLine: true },
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }

    canvas.renderAll();
  };

  const removeGrid = () => {
    if (!canvas) return;
    const gridObjects = canvas.getObjects().filter(
      (obj: any) => obj.data && obj.data.isGridLine
    );
    gridObjects.forEach((obj: any) => canvas.remove(obj));
    canvas.renderAll();
  };

  const toggleSnap = () => {
    if (!canvas) return;
    const newSnap = !snapToGrid;
    setSnapToGrid(newSnap);

    if (newSnap) {
      canvas.on('object:moving', handleSnap);
    } else {
      canvas.off('object:moving', handleSnap);
    }
  };

  const handleSnap = (e: any) => {
    const obj = e.target;
    if (!obj) return;

    obj.set({
      left: Math.round((obj.left || 0) / gridSize) * gridSize,
      top: Math.round((obj.top || 0) / gridSize) * gridSize,
    });
  };

  const handleGridSizeChange = (newSize: number) => {
    setGridSize(newSize);
    if (showGrid) {
      // Redraw grid with new size
      setTimeout(() => {
        removeGrid();
        drawGridWithSize(newSize);
      }, 0);
    }
  };

  const drawGridWithSize = (size: number) => {
    if (!canvas) return;
    const canvasWidth = 800;
    const canvasHeight = 800;

    for (let i = 0; i <= canvasWidth; i += size) {
      const line = new fabric.Line([i, 0, i, canvasHeight], {
        stroke: '#3f3f46',
        strokeWidth: i % 100 === 0 ? 0.8 : 0.3,
        selectable: false,
        evented: false,
        opacity: 0.5,
        excludeFromExport: true,
        data: { isGridLine: true },
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }

    for (let j = 0; j <= canvasHeight; j += size) {
      const line = new fabric.Line([0, j, canvasWidth, j], {
        stroke: '#3f3f46',
        strokeWidth: j % 100 === 0 ? 0.8 : 0.3,
        selectable: false,
        evented: false,
        opacity: 0.5,
        excludeFromExport: true,
        data: { isGridLine: true },
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }

    canvas.renderAll();
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-semibold text-zinc-400">Grid & Snap</label>

      <div className="flex gap-2">
        <button
          onClick={toggleGrid}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            showGrid
              ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
          title="Toggle Grid"
        >
          {showGrid ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <Grid3x3 className="w-3.5 h-3.5" />
          Grid
        </button>

        <button
          onClick={toggleSnap}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            snapToGrid
              ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
          title="Toggle Snap to Grid"
        >
          <Magnet className="w-3.5 h-3.5" />
          Snap
        </button>
      </div>

      <button
        onClick={() => setRulersEnabled(!rulersEnabled)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
          rulersEnabled
            ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
        }`}
        title="Toggle Rulers"
      >
        <Ruler className="w-3.5 h-3.5" />
        Rulers
      </button>

      {/* Grid Size */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">Grid Size</span>
        <span className="text-[10px] text-zinc-400 font-mono">{gridSize}px</span>
      </div>
      <input
        type="range"
        min="10"
        max="100"
        step="5"
        value={gridSize}
        onChange={(e) => handleGridSizeChange(parseInt(e.target.value))}
        className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
      />
    </div>
  );
};
