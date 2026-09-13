import React, { useState } from 'react';
import { Eraser, Loader2, Sparkles } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';

export const BackgroundRemover: React.FC = () => {
  const { canvas, saveHistory } = useEditorStore();
  const [processing, setProcessing] = useState(false);

  const removeBackground = async () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      return;
    }

    setProcessing(true);

    try {
      // Get image data URL
      const imgElement = (activeObject as fabric.Image).getElement() as HTMLImageElement;
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      tempCanvas.width = imgElement.naturalWidth || imgElement.width;
      tempCanvas.height = imgElement.naturalHeight || imgElement.height;
      ctx.drawImage(imgElement, 0, 0);

      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      // Simple background removal using color thresholding
      // Gets the corner color as background reference
      const bgColor = {
        r: data[0],
        g: data[1],
        b: data[2],
      };

      const threshold = 60;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          Math.pow(r - bgColor.r, 2) +
          Math.pow(g - bgColor.g, 2) +
          Math.pow(b - bgColor.b, 2)
        );

        if (diff < threshold) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Create new image from processed canvas
      const newDataUrl = tempCanvas.toDataURL('image/png');

      // Replace the image on canvas
      const imgObj = activeObject as fabric.Image;
      const left = imgObj.left;
      const top = imgObj.top;
      const scaleX = imgObj.scaleX;
      const scaleY = imgObj.scaleY;
      const angle = imgObj.angle;

      canvas.remove(activeObject);

      const newImg = await new Promise<fabric.Image>((resolve) => {
        fabric.Image.fromURL(newDataUrl, (img) => {
          img.set({
            left,
            top,
            scaleX,
            scaleY,
            angle,
          });
          resolve(img);
        }, { crossOrigin: 'anonymous' });
      });

      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();
      saveHistory();

    } catch (err) {
      console.error('Background removal failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const makeTransparent = () => {
    if (!canvas) return;
    canvas.setBackgroundColor('transparent', () => canvas.renderAll());
    saveHistory();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Eraser className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold text-zinc-400">Background Tools</span>
      </div>

      <button
        onClick={removeBackground}
        disabled={processing}
        className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
      >
        {processing ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> Remove Image Background</>
        )}
      </button>

      <p className="text-[9px] text-zinc-500 text-center">
        Select an image on canvas first
      </p>

      <div className="h-[1px] bg-zinc-800" />

      <button
        onClick={makeTransparent}
        className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
      >
        Make Canvas Background Transparent
      </button>
    </div>
  );
};
