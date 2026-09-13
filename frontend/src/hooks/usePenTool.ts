import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../store/useEditorStore';

export const usePenTool = (canvas: fabric.Canvas | null) => {
  const { isPenMode, setPenMode, fillColor, strokeColor, strokeWidth, saveHistory } = useEditorStore();
  
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const tempAnchorsRef = useRef<fabric.Circle[]>([]);
  const tempLinesRef = useRef<fabric.Line[]>([]);
  const previewLineRef = useRef<fabric.Line | null>(null);

  useEffect(() => {
    if (!canvas) return;

    // Exit drawing mode if pen tool starts
    if (isPenMode) {
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'pen';
      canvas.discardActiveObject();
      canvas.renderAll();
    } else {
      cleanupPenTool();
      canvas.defaultCursor = 'default';
      return;
    }

    function cleanupPenTool() {
      // Clear preview lines
      if (previewLineRef.current) {
        canvas?.remove(previewLineRef.current);
        previewLineRef.current = null;
      }
      tempLinesRef.current.forEach((line) => canvas?.remove(line));
      tempLinesRef.current = [];
      
      // Clear anchor dots
      tempAnchorsRef.current.forEach((circle) => canvas?.remove(circle));
      tempAnchorsRef.current = [];
      
      pointsRef.current = [];
    }

    const finishPath = (closed: boolean = false) => {
      const points = pointsRef.current;
      if (points.length < 2) {
        cleanupPenTool();
        setPenMode(false);
        return;
      }

      // Generate SVG path string
      let pathString = points
        .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
        .join(' ');
      
      if (closed) {
        pathString += ' Z';
      }

      const newPath = new fabric.Path(pathString, {
        fill: closed ? fillColor || 'transparent' : 'transparent',
        stroke: strokeColor || '#8b5cf6',
        strokeWidth: strokeWidth > 0 ? strokeWidth : 3,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      });

      canvas.add(newPath);
      canvas.setActiveObject(newPath);
      canvas.renderAll();
      
      cleanupPenTool();
      setPenMode(false);
      saveHistory();
    };

    const handleMouseDown = (options: fabric.IEvent) => {
      if (!isPenMode) return;
      
      const pointer = canvas.getPointer(options.e);
      const x = Math.round(pointer.x);
      const y = Math.round(pointer.y);

      const points = pointsRef.current;

      // Check if clicking near the first point to close the path
      if (points.length > 2) {
        const firstPt = points[0];
        const distance = Math.hypot(x - firstPt.x, y - firstPt.y);
        
        // 12px threshold for closing shapes
        if (distance < 12) {
          finishPath(true);
          return;
        }
      }

      // Add point
      points.push({ x, y });

      // Add visual anchor dot
      const circle = new fabric.Circle({
        left: x,
        top: y,
        radius: 4.5,
        fill: '#ffffff',
        stroke: '#8b5cf6',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      canvas.add(circle);
      tempAnchorsRef.current.push(circle);

      // Add connected line segment
      if (points.length > 1) {
        const prevPt = points[points.length - 2];
        const line = new fabric.Line([prevPt.x, prevPt.y, x, y], {
          stroke: '#8b5cf6',
          strokeWidth: 1.5,
          selectable: false,
          evented: false,
        });
        canvas.add(line);
        tempLinesRef.current.push(line);
      }

      // Add/reset preview line
      if (previewLineRef.current) {
        canvas.remove(previewLineRef.current);
      }
      previewLineRef.current = new fabric.Line([x, y, x, y], {
        stroke: '#8b5cf6',
        strokeWidth: 1.5,
        strokeDashArray: [3, 3],
        selectable: false,
        evented: false,
      });
      canvas.add(previewLineRef.current);

      canvas.renderAll();
    };

    const handleMouseMove = (options: fabric.IEvent) => {
      if (!isPenMode || pointsRef.current.length === 0 || !previewLineRef.current) return;
      
      const pointer = canvas.getPointer(options.e);
      previewLineRef.current.set({
        x2: pointer.x,
        y2: pointer.y,
      });
      canvas.renderAll();
    };

    const handleDoubleTap = () => {
      if (!isPenMode) return;
      finishPath(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPenMode) return;
      if (e.key === 'Escape') {
        finishPath(false);
      } else if (e.key === 'Enter') {
        finishPath(true);
      }
    };

    // Attach listeners
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:dblclick', handleDoubleTap);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:dblclick', handleDoubleTap);
      window.removeEventListener('keydown', handleKeyDown);
      cleanupPenTool();
    };
  }, [canvas, isPenMode, setPenMode, fillColor, strokeColor, strokeWidth, saveHistory]);
};
