import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

export const useDistanceMeasurement = (canvas: fabric.Canvas | null) => {
  const isAltPressedRef = useRef(false);
  const hoveredObjectRef = useRef<fabric.Object | null>(null);
  const activeObjectRef = useRef<fabric.Object | null>(null);
  const guidelinesRef = useRef<fabric.Object[]>([]);

  useEffect(() => {
    if (!canvas) return;

    const clearGuidelines = () => {
      guidelinesRef.current.forEach((obj) => {
        try {
          canvas.remove(obj);
        } catch {
          // ignore
        }
      });
      guidelinesRef.current = [];
    };

    const drawBadge = (textVal: string, cx: number, cy: number) => {
      const fontSize = 10;
      
      const text = new fabric.Text(textVal, {
        fontSize,
        fontFamily: 'Outfit',
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      const textWidth = text.width || 20;
      const textHeight = text.height || 12;
      const paddingX = 6;
      const paddingY = 4;

      const rect = new fabric.Rect({
        width: textWidth + paddingX * 2,
        height: textHeight + paddingY * 2,
        fill: '#ef4444',
        rx: 4,
        ry: 4,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      const group = new fabric.Group([rect, text], {
        left: cx,
        top: cy,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });

      canvas.add(group);
      guidelinesRef.current.push(group);
    };

    const drawDashedLine = (coords: [number, number, number, number]) => {
      const line = new fabric.Line(coords, {
        stroke: '#ef4444',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        selectable: false,
        evented: false,
      });
      canvas.add(line);
      guidelinesRef.current.push(line);
    };

    const drawMeasurementLine = (x1: number, y1: number, x2: number, y2: number, value: number) => {
      drawDashedLine([x1, y1, x2, y2]);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      drawBadge(`${Math.round(value)}`, midX, midY);
    };

    const updateGuidelines = () => {
      clearGuidelines();

      const activeObject = canvas.getActiveObject();
      activeObjectRef.current = activeObject;

      if (!activeObject || !isAltPressedRef.current) return;

      const activeRect = activeObject.getBoundingRect(true, true);
      const activeMidX = activeRect.left + activeRect.width / 2;
      const activeMidY = activeRect.top + activeRect.height / 2;

      const hoveredObject = hoveredObjectRef.current;

      if (hoveredObject && hoveredObject !== activeObject) {
        // Measure distance to hovered object
        const targetRect = hoveredObject.getBoundingRect(true, true);

        // 1. Horizontal distances
        if (activeRect.left > targetRect.left + targetRect.width) {
          // Active is to the right of Target
          const gap = activeRect.left - (targetRect.left + targetRect.width);
          drawMeasurementLine(
            targetRect.left + targetRect.width,
            activeMidY,
            activeRect.left,
            activeMidY,
            gap
          );
        } else if (targetRect.left > activeRect.left + activeRect.width) {
          // Active is to the left of Target
          const gap = targetRect.left - (activeRect.left + activeRect.width);
          drawMeasurementLine(
            activeRect.left + activeRect.width,
            activeMidY,
            targetRect.left,
            activeMidY,
            gap
          );
        } else {
          // Overlap horizontally, draw boundary differences if helpful
          const leftGap = Math.abs(activeRect.left - targetRect.left);
          if (leftGap > 5) {
            drawDashedLine([activeRect.left, activeMidY, targetRect.left, activeMidY]);
          }
        }

        // 2. Vertical distances
        if (activeRect.top > targetRect.top + targetRect.height) {
          // Active is below Target
          const gap = activeRect.top - (targetRect.top + targetRect.height);
          drawMeasurementLine(
            activeMidX,
            targetRect.top + targetRect.height,
            activeMidX,
            activeRect.top,
            gap
          );
        } else if (targetRect.top > activeRect.top + activeRect.height) {
          // Active is above Target
          const gap = targetRect.top - (activeRect.top + activeRect.height);
          drawMeasurementLine(
            activeMidX,
            activeRect.top + activeRect.height,
            activeMidX,
            targetRect.top,
            gap
          );
        } else {
          // Overlap vertically
          const topGap = Math.abs(activeRect.top - targetRect.top);
          if (topGap > 5) {
            drawDashedLine([activeMidX, activeRect.top, activeMidX, targetRect.top]);
          }
        }
      } else {
        // Measure distance to canvas edges (assuming canvas size is 800x800 or standard dimensions)
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        // Top edge
        const distTop = activeRect.top;
        if (distTop > 0) {
          drawMeasurementLine(activeMidX, 0, activeMidX, activeRect.top, distTop);
        }

        // Bottom edge
        const distBottom = canvasHeight - (activeRect.top + activeRect.height);
        if (distBottom > 0) {
          drawMeasurementLine(
            activeMidX,
            activeRect.top + activeRect.height,
            activeMidX,
            canvasHeight,
            distBottom
          );
        }

        // Left edge
        const distLeft = activeRect.left;
        if (distLeft > 0) {
          drawMeasurementLine(0, activeMidY, activeRect.left, activeMidY, distLeft);
        }

        // Right edge
        const distRight = canvasWidth - (activeRect.left + activeRect.width);
        if (distRight > 0) {
          drawMeasurementLine(
            activeRect.left + activeRect.width,
            activeMidY,
            canvasWidth,
            activeMidY,
            distRight
          );
        }
      }

      canvas.renderAll();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 18 is Alt key
      if (e.key === 'Alt' || e.keyCode === 18) {
        e.preventDefault();
        if (!isAltPressedRef.current) {
          isAltPressedRef.current = true;
          // Change canvas cursor to pointer/inspect
          canvas.defaultCursor = 'crosshair';
          updateGuidelines();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.keyCode === 18) {
        e.preventDefault();
        isAltPressedRef.current = false;
        canvas.defaultCursor = 'default';
        clearGuidelines();
        canvas.renderAll();
      }
    };

    const handleMouseMove = (options: fabric.IEvent) => {
      if (!isAltPressedRef.current) return;
      const target = canvas.findTarget(options.e, false);
      
      const activeObject = canvas.getActiveObject();
      if (target && target !== activeObject && target.selectable) {
        hoveredObjectRef.current = target;
      } else {
        hoveredObjectRef.current = null;
      }
      
      updateGuidelines();
    };

    const handleSelectionCleared = () => {
      hoveredObjectRef.current = null;
      activeObjectRef.current = null;
      clearGuidelines();
    };

    // Attach event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:moving', updateGuidelines);
    canvas.on('object:scaling', updateGuidelines);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('object:moving', updateGuidelines);
      canvas.off('object:scaling', updateGuidelines);
      clearGuidelines();
    };
  }, [canvas]);
};
