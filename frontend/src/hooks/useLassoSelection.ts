import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

export const useLassoSelection = (canvas: fabric.Canvas | null) => {
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lassoRectRef = useRef<fabric.Rect | null>(null);

  useEffect(() => {
    if (!canvas) return;

    const clearLasso = () => {
      if (lassoRectRef.current) {
        canvas.remove(lassoRectRef.current);
        lassoRectRef.current = null;
      }
      isDrawingRef.current = false;
      startPointRef.current = null;
    };

    const handleMouseDown = (options: fabric.IEvent) => {
      // Only activate lasso when holding Shift key and clicking on empty canvas
      if (!(options.e as MouseEvent).shiftKey) return;
      
      const activeObject = canvas.getActiveObject();
      // Don't start lasso if clicking on an object
      if (activeObject) return;

      const pointer = canvas.getPointer(options.e);
      isDrawingRef.current = true;
      startPointRef.current = { x: pointer.x, y: pointer.y };

      // Create temporary lasso rectangle
      lassoRectRef.current = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: 'rgba(139, 92, 246, 0.1)',
        stroke: '#8b5cf6',
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      canvas.add(lassoRectRef.current);
      canvas.renderAll();
    };

    const handleMouseMove = (options: fabric.IEvent) => {
      if (!isDrawingRef.current || !startPointRef.current || !lassoRectRef.current) return;

      const pointer = canvas.getPointer(options.e);
      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;

      const left = Math.min(startX, pointer.x);
      const top = Math.min(startY, pointer.y);
      const width = Math.abs(pointer.x - startX);
      const height = Math.abs(pointer.y - startY);

      lassoRectRef.current.set({
        left,
        top,
        width,
        height,
      });
      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !startPointRef.current || !lassoRectRef.current) {
        clearLasso();
        return;
      }

      const rect = lassoRectRef.current;
      const rectLeft = rect.left || 0;
      const rectTop = rect.top || 0;
      const rectWidth = rect.width || 0;
      const rectHeight = rect.height || 0;

      // Only select if the lasso has meaningful size
      if (rectWidth > 5 && rectHeight > 5) {
        // Find all objects that intersect with the lasso rectangle
        const objects = canvas.getObjects().filter(obj => obj.selectable);
        const selectedObjects: fabric.Object[] = [];

        objects.forEach(obj => {
          const objBounds = obj.getBoundingRect();
          
          // Check if object intersects with lasso rectangle
          const intersects = !(
            objBounds.left + objBounds.width < rectLeft ||
            objBounds.left > rectLeft + rectWidth ||
            objBounds.top + objBounds.height < rectTop ||
            objBounds.top > rectTop + rectHeight
          );

          if (intersects) {
            selectedObjects.push(obj);
          }
        });

        // Create multi-selection if we found objects
        if (selectedObjects.length > 0) {
          canvas.discardActiveObject();
          
          if (selectedObjects.length === 1) {
            canvas.setActiveObject(selectedObjects[0]);
          } else {
            const selection = new fabric.ActiveSelection(selectedObjects, {
              canvas: canvas,
            });
            canvas.setActiveObject(selection);
          }
          canvas.renderAll();
        }
      }

      clearLasso();
      canvas.renderAll();
    };

    // Attach event listeners
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      clearLasso();
    };
  }, [canvas]);
};
