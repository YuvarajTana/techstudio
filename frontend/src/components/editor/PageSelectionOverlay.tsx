import React, { useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

/**
 * PageSelectionOverlay — Draws a purple outline around the canvas page
 * when the page is selected (no element selected).
 *
 * Uses fabric.js viewport transform coordinates for accurate positioning.
 */
export const PageSelectionOverlay: React.FC = () => {
  const { selectedPage, canvas, canvasWidth, canvasHeight, zoom } = useEditorStore();
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!canvas || !overlayRef.current) return;

    const overlay = overlayRef.current;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Match the fabric.js upper canvas dimensions (retina-aware)
      const upperCanvas = (canvas as any).upperCanvasEl as HTMLCanvasElement | undefined;
      if (!upperCanvas) return;

      // Sync overlay size with upper canvas
      if (overlay.width !== upperCanvas.width || overlay.height !== upperCanvas.height) {
        overlay.width = upperCanvas.width;
        overlay.height = upperCanvas.height;
        overlay.style.width = upperCanvas.style.width;
        overlay.style.height = upperCanvas.style.height;
      }

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (!selectedPage) return;

      // Get viewport transform from fabric.js
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const cw = canvas.getWidth();
      const ch = canvas.getHeight();

      // Calculate the scale factor between overlay pixels and CSS pixels
      const cssWidth = parseFloat(overlay.style.width) || overlay.width;
      const pixelScale = overlay.width / cssWidth;

      // Calculate page bounds in overlay pixel coordinates
      // The viewport transform maps design coords to CSS coords
      // We need to convert to overlay pixel coords (multiply by pixelScale)
      const left = vpt[4] * pixelScale;
      const top = vpt[5] * pixelScale;
      const width = cw * vpt[0] * pixelScale;
      const height = ch * vpt[3] * pixelScale;

      // Draw purple border
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2 * pixelScale;
      ctx.setLineDash([]);
      ctx.strokeRect(left, top, width, height);

      // Draw corner handles
      const handleRadius = 4 * pixelScale;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1.5 * pixelScale;

      const corners = [
        { x: left, y: top },
        { x: left + width, y: top },
        { x: left, y: top + height },
        { x: left + width, y: top + height },
      ];

      corners.forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.arc(x, y, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Draw dimension label below the page
      const label = `${Math.round(cw)} × ${Math.round(ch)}`;
      ctx.font = `${10 * pixelScale}px monospace`;
      ctx.fillStyle = '#71717a';
      ctx.textAlign = 'center';
      ctx.fillText(label, left + width / 2, top + height + 14 * pixelScale);
    };

    // Draw on every animation frame to stay in sync with canvas
    const renderLoop = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvas, selectedPage, canvasWidth, canvasHeight, zoom]);

  return (
    <canvas
      ref={overlayRef}
      className="absolute top-0 left-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
