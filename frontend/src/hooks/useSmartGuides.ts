import { useEffect } from 'react';
import { fabric } from 'fabric';

export const useSmartGuides = (canvas: fabric.Canvas | null) => {
  useEffect(() => {
    if (!canvas) return;

    const aligningLineOffset = 5;
    const aligningLineWidth = 1;
    const aligningLineColor = '#8b5cf6'; // Brand purple

    let verticalLines: fabric.Line[] = [];
    let horizontalLines: fabric.Line[] = [];
    
    // Clean up old lines
    const clearGuidelines = () => {
      verticalLines.forEach((line) => canvas.remove(line));
      horizontalLines.forEach((line) => canvas.remove(line));
      verticalLines = [];
      horizontalLines = [];
    };

    const isGuideCandidate = (object: fabric.Object, activeObject: fabric.Object) => {
      const type = String(object.get('teckstudioObjectType' as keyof fabric.Object) || '');
      return (
        object !== activeObject
        && object.visible !== false
        && object.selectable !== false
        && object.get('editorOnly' as keyof fabric.Object) !== true
        && object.get('excludeFromExport' as keyof fabric.Object) !== true
        && !type.startsWith('diagramConnector')
        && type !== 'diagramAnchor'
        && type !== 'diagramBendHandle'
        && type !== 'diagramEndpointHandle'
        && type !== 'editorGuide'
      );
    };

    const moveBoundsBy = (object: fabric.Object, dx: number, dy: number) => {
      object.set({
        left: (object.left || 0) + dx,
        top: (object.top || 0) + dy,
      });
      object.setCoords();
    };

    const drawVerticalLine = (coords: [number, number, number, number]) => {
      const line = new fabric.Line(coords, {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
        opacity: 0.8,
        excludeFromExport: true,
        editorOnly: true,
        name: 'Smart vertical guide',
        teckstudioObjectType: 'editorGuide',
      } as fabric.ILineOptions & Record<string, unknown>);
      canvas.add(line);
      verticalLines.push(line);
    };

    const drawHorizontalLine = (coords: [number, number, number, number]) => {
      const line = new fabric.Line(coords, {
        stroke: aligningLineColor,
        strokeWidth: aligningLineWidth,
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
        opacity: 0.8,
        excludeFromExport: true,
        editorOnly: true,
        name: 'Smart horizontal guide',
        teckstudioObjectType: 'editorGuide',
      } as fabric.ILineOptions & Record<string, unknown>);
      canvas.add(line);
      horizontalLines.push(line);
    };

    const handleObjectMoving = (e: fabric.IEvent) => {
      clearGuidelines();

      const activeObject = e.target;
      if (!activeObject) return;

      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      // Check alignment with Canvas Center
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;

      let snapped = false;
      let activeBounds = activeObject.getBoundingRect(true, true);
      let activeCenter = {
        x: activeBounds.left + activeBounds.width / 2,
        y: activeBounds.top + activeBounds.height / 2,
      };

      // Snap to vertical center
      if (Math.abs(activeCenter.x - canvasCenterX) < aligningLineOffset) {
        moveBoundsBy(activeObject, canvasCenterX - activeCenter.x, 0);
        drawVerticalLine([canvasCenterX, 0, canvasCenterX, canvasHeight]);
        snapped = true;
        activeBounds = activeObject.getBoundingRect(true, true);
        activeCenter = { x: activeBounds.left + activeBounds.width / 2, y: activeBounds.top + activeBounds.height / 2 };
      }
      
      // Snap to horizontal center
      if (Math.abs(activeCenter.y - canvasCenterY) < aligningLineOffset) {
        moveBoundsBy(activeObject, 0, canvasCenterY - activeCenter.y);
        drawHorizontalLine([0, canvasCenterY, canvasWidth, canvasCenterY]);
        snapped = true;
        activeBounds = activeObject.getBoundingRect(true, true);
        activeCenter = { x: activeBounds.left + activeBounds.width / 2, y: activeBounds.top + activeBounds.height / 2 };
      }

      // Check alignment with other objects
      const objects = canvas.getObjects().filter((obj) => isGuideCandidate(obj, activeObject));
      
      for (let i = 0; i < objects.length; i++) {
        const target = objects[i];
        const targetBounds = target.getBoundingRect(true, true);
        const xTargets = [
          targetBounds.left,
          targetBounds.left + targetBounds.width / 2,
          targetBounds.left + targetBounds.width,
        ];
        const yTargets = [
          targetBounds.top,
          targetBounds.top + targetBounds.height / 2,
          targetBounds.top + targetBounds.height,
        ];
        const xCurrent = [
          activeBounds.left,
          activeCenter.x,
          activeBounds.left + activeBounds.width,
        ];
        const yCurrent = [
          activeBounds.top,
          activeCenter.y,
          activeBounds.top + activeBounds.height,
        ];

        for (const current of xCurrent) {
          const match = xTargets.find((targetX) => Math.abs(current - targetX) < aligningLineOffset);
          if (typeof match === 'number') {
            moveBoundsBy(activeObject, match - current, 0);
            drawVerticalLine([match, 0, match, canvasHeight]);
            snapped = true;
            activeBounds = activeObject.getBoundingRect(true, true);
            activeCenter = { x: activeBounds.left + activeBounds.width / 2, y: activeBounds.top + activeBounds.height / 2 };
            break;
          }
        }

        for (const current of yCurrent) {
          const match = yTargets.find((targetY) => Math.abs(current - targetY) < aligningLineOffset);
          if (typeof match === 'number') {
            moveBoundsBy(activeObject, 0, match - current);
            drawHorizontalLine([0, match, canvasWidth, match]);
            snapped = true;
            activeBounds = activeObject.getBoundingRect(true, true);
            activeCenter = { x: activeBounds.left + activeBounds.width / 2, y: activeBounds.top + activeBounds.height / 2 };
            break;
          }
        }
      }

      if (snapped) {
        canvas.renderAll();
      }
    };

    const handleMouseUp = () => {
      clearGuidelines();
      canvas.renderAll();
    };

    canvas.on('object:moving', handleObjectMoving);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      clearGuidelines();
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [canvas]);
};
