import React from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { calculateMainPreviewFit } from '../../utils/canvasPreviewFit';

export const ZoomController: React.FC = () => {
  const { zoom, setZoom, canvas, canvasWidth, canvasHeight } = useEditorStore();

  const handleZoomIn = () => {
    setZoom(zoom + 0.1);
  };

  const handleZoomOut = () => {
    setZoom(zoom - 0.1);
  };

  const handleFit = () => {
    if (!canvas) return;

    const workspaceContainer = canvas.getElement()?.closest('[data-canvas-area]') as HTMLElement | null;
    if (!workspaceContainer) return;

    const containerWidth = workspaceContainer.clientWidth;
    const containerHeight = workspaceContainer.clientHeight;

    const cw = canvas.getWidth() || canvasWidth || 800;
    const ch = canvas.getHeight() || canvasHeight || 800;

    const previewFit = calculateMainPreviewFit(containerWidth, containerHeight, cw, ch);

    // Apply viewport transform
    canvas.setViewportTransform([previewFit.scale, 0, 0, previewFit.scale, previewFit.left, previewFit.top]);
    setZoom(previewFit.scale);
    canvas.renderAll();
  };

  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[#101018]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/[0.08] shadow-xl select-none z-10">
      <button
        onClick={handleZoomOut}
        className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      
      <span className="text-xs font-semibold text-zinc-300 w-12 text-center">
        {Math.round(zoom * 100)}%
      </span>
      
      <button
        onClick={handleZoomIn}
        className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      
      <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
      
      <button
        onClick={handleFit}
        className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
        title="Fit to Screen"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
};
