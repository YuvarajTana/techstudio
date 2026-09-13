import { useEffect } from 'react';
import { fabric } from 'fabric';

interface SnapToGridOptions {
  gridSize?: number;
  enabled?: boolean;
}

export const useSnapToGrid = (
  canvas: fabric.Canvas | null,
  options: SnapToGridOptions = {}
) => {
  const { gridSize = 20, enabled = true } = options;
  useEffect(() => {
    if (!canvas || !enabled) return;

    const snapToGrid = (value: number): number => {
      return Math.round(value / gridSize) * gridSize;
    };

    const handleObjectMoving = (e: fabric.IEvent) => {
      const activeObject = e.target;
      if (!activeObject) return;

      // Get the object's position
      const left = activeObject.left || 0;
      const top = activeObject.top || 0;

      // Snap to grid
      const snappedLeft = snapToGrid(left);
      const snappedTop = snapToGrid(top);

      // Only snap if within threshold (half grid size)
      const threshold = gridSize / 2;
      const newLeft = Math.abs(left - snappedLeft) < threshold ? snappedLeft : left;
      const newTop = Math.abs(top - snappedTop) < threshold ? snappedTop : top;

      if (newLeft !== left || newTop !== top) {
        activeObject.set({
          left: newLeft,
          top: newTop,
        });
        activeObject.setCoords();
        canvas.renderAll();
      }
    };

    // Attach event listener
    canvas.on('object:moving', handleObjectMoving);

    return () => {
      canvas.off('object:moving', handleObjectMoving);
    };
  }, [canvas, gridSize, enabled]);
};
