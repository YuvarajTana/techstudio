import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

interface RulersProps {
  visible?: boolean;
}

export const Rulers: React.FC<RulersProps> = ({ visible = true }) => {
  const { canvas, zoom } = useEditorStore();
  const horizontalRulerRef = useRef<HTMLCanvasElement>(null);
  const verticalRulerRef = useRef<HTMLCanvasElement>(null);
  const [rulerSize] = useState(20);

  useEffect(() => {
    if (!canvas || !visible) return;

    const drawRulers = () => {
      const hCanvas = horizontalRulerRef.current;
      const vCanvas = verticalRulerRef.current;
      if (!hCanvas || !vCanvas) return;

      const hCtx = hCanvas.getContext('2d');
      const vCtx = vCanvas.getContext('2d');
      if (!hCtx || !vCtx) return;

      // Get canvas dimensions
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      // Set ruler canvas sizes
      hCanvas.width = canvasWidth * zoom;
      hCanvas.height = rulerSize;
      vCanvas.width = rulerSize;
      vCanvas.height = canvasHeight * zoom;

      // Draw horizontal ruler
      hCtx.fillStyle = '#121214';
      hCtx.fillRect(0, 0, hCanvas.width, hCanvas.height);

      // Draw markings
      hCtx.strokeStyle = '#3f3f46';
      hCtx.fillStyle = '#71717a';
      hCtx.font = '9px system-ui';
      hCtx.textAlign = 'center';

      const majorStep = 100;
      const minorStep = 20;

      for (let i = 0; i <= canvasWidth; i += minorStep) {
        const x = i * zoom;
        const isMajor = i % majorStep === 0;

        hCtx.beginPath();
        hCtx.moveTo(x, isMajor ? 0 : rulerSize - 6);
        hCtx.lineTo(x, rulerSize);
        hCtx.stroke();

        if (isMajor) {
          hCtx.fillText(String(i), x, 12);
        }
      }

      // Draw vertical ruler
      vCtx.fillStyle = '#121214';
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);

      vCtx.strokeStyle = '#3f3f46';
      vCtx.fillStyle = '#71717a';
      vCtx.font = '9px system-ui';
      vCtx.textAlign = 'right';

      for (let i = 0; i <= canvasHeight; i += minorStep) {
        const y = i * zoom;
        const isMajor = i % majorStep === 0;

        vCtx.beginPath();
        vCtx.moveTo(isMajor ? 0 : vCanvas.width - 6, y);
        vCtx.lineTo(vCanvas.width, y);
        vCtx.stroke();

        if (isMajor) {
          vCtx.save();
          vCtx.translate(12, y + 3);
          vCtx.rotate(-Math.PI / 2);
          vCtx.fillText(String(i), 0, 0);
          vCtx.restore();
        }
      }
    };

    drawRulers();

    // Redraw on zoom changes
    const handleZoom = () => drawRulers();
    canvas.on('mouse:wheel', handleZoom);

    return () => {
      canvas.off('mouse:wheel', handleZoom);
    };
  }, [canvas, zoom, visible, rulerSize]);

  if (!visible) return null;

  return (
    <>
      {/* Horizontal Ruler */}
      <div className="absolute top-0 left-[20px] right-0 h-[20px] bg-[#101018] border-b border-zinc-800 z-20 overflow-hidden">
        <canvas ref={horizontalRulerRef} className="h-full" />
      </div>

      {/* Vertical Ruler */}
      <div className="absolute top-[20px] left-0 bottom-0 w-[20px] bg-[#101018] border-r border-zinc-800 z-20 overflow-hidden">
        <canvas ref={verticalRulerRef} className="w-full" />
      </div>

      {/* Ruler corner */}
      <div className="absolute top-0 left-0 w-[20px] h-[20px] bg-[#101018] border-b border-r border-zinc-800 z-30" />
    </>
  );
};
