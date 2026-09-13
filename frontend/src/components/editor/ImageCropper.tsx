import React, { useState, useRef, useEffect } from 'react';
import { Crop, Check, X, RotateCcw } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';

type CropAspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

const calculateCropRegion = (
  sourceWidth: number,
  sourceHeight: number,
  aspectRatio: CropAspectRatio,
  zoom: number,
  positionX: number,
  positionY: number,
) => {
  const ratios: Record<CropAspectRatio, number | null> = {
    free: null,
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9,
    '3:4': 3 / 4,
    '9:16': 9 / 16,
  };
  const targetRatio = ratios[aspectRatio];
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (targetRatio) {
    if (sourceWidth / sourceHeight > targetRatio) cropWidth = sourceHeight * targetRatio;
    else cropHeight = sourceWidth / targetRatio;
  }
  const safeZoom = Math.max(1, Math.min(3, zoom));
  cropWidth /= safeZoom;
  cropHeight /= safeZoom;
  const cropX = Math.max(0, (sourceWidth - cropWidth) * ((positionX + 100) / 200));
  const cropY = Math.max(0, (sourceHeight - cropHeight) * ((positionY + 100) / 200));
  return { cropWidth, cropHeight, cropX, cropY };
};

export const ImageCropper: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();
  const [isCropping, setIsCropping] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>('free');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPositionX, setCropPositionX] = useState(0);
  const [cropPositionY, setCropPositionY] = useState(0);
  const [cornerRadius, setCornerRadius] = useState(0);
  const cropOverlayRef = useRef<fabric.Rect | null>(null);
  const cropHandlesRef = useRef<fabric.Rect[]>([]);

  const isImage = selectedObject?.type === 'image';

  useEffect(() => {
    setCornerRadius(Number(selectedObject?.get('imageCornerRadius' as keyof fabric.Object) || 0));
  }, [selectedObject]);

  useEffect(() => {
    const startCrop = () => {
      if (selectedObject?.type === 'image') setIsCropping(true);
    };
    window.addEventListener('teckstudio:start-image-crop', startCrop);
    return () => window.removeEventListener('teckstudio:start-image-crop', startCrop);
  }, [selectedObject]);

  useEffect(() => {
    if (!isCropping) return;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCropping(false);
    };
    window.addEventListener('keydown', cancelOnEscape);
    return () => window.removeEventListener('keydown', cancelOnEscape);
  }, [isCropping]);

  useEffect(() => {
    if (!canvas || !selectedObject || !isImage || !isCropping) return;

    const img = selectedObject as fabric.Image;
    const bounds = img.getBoundingRect();
    const sourceWidth = img.width || 1;
    const sourceHeight = img.height || 1;
    const region = calculateCropRegion(sourceWidth, sourceHeight, aspectRatio, cropZoom, cropPositionX, cropPositionY);
    const overlayLeft = bounds.left + bounds.width * (region.cropX / sourceWidth);
    const overlayTop = bounds.top + bounds.height * (region.cropY / sourceHeight);
    const overlayWidth = bounds.width * (region.cropWidth / sourceWidth);
    const overlayHeight = bounds.height * (region.cropHeight / sourceHeight);

    // Create crop overlay
    const overlay = new fabric.Rect({
      left: overlayLeft,
      top: overlayTop,
      width: overlayWidth,
      height: overlayHeight,
      fill: 'rgba(139, 92, 246, 0.08)',
      stroke: '#8b5cf6',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });
    canvas.add(overlay);
    cropOverlayRef.current = overlay;

    // Create crop handles
    const handleSize = 10;
    const handles = [
      { x: overlayLeft - handleSize/2, y: overlayTop - handleSize/2 },
      { x: overlayLeft + overlayWidth - handleSize/2, y: overlayTop - handleSize/2 },
      { x: overlayLeft - handleSize/2, y: overlayTop + overlayHeight - handleSize/2 },
      { x: overlayLeft + overlayWidth - handleSize/2, y: overlayTop + overlayHeight - handleSize/2 },
    ];

    const handleObjects = handles.map((h) => {
      const handle = new fabric.Rect({
        left: h.x,
        top: h.y,
        width: handleSize,
        height: handleSize,
        fill: '#ffffff',
        stroke: '#8b5cf6',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      canvas.add(handle);
      return handle;
    });
    cropHandlesRef.current = handleObjects;

    canvas.renderAll();

    return () => {
      if (cropOverlayRef.current) {
        canvas.remove(cropOverlayRef.current);
        cropOverlayRef.current = null;
      }
      cropHandlesRef.current.forEach(h => canvas.remove(h));
      cropHandlesRef.current = [];
      canvas.renderAll();
    };
  }, [aspectRatio, canvas, cropPositionX, cropPositionY, cropZoom, isCropping, isImage, selectedObject]);

  const startCropping = () => {
    if (!isImage) return;
    setIsCropping(true);
  };

  const cancelCropping = () => {
    setIsCropping(false);
  };

  const applyCrop = () => {
    if (!canvas || !selectedObject || !isImage) return;

    const img = selectedObject as fabric.Image;
    const sourceWidth = img.width || 1;
    const sourceHeight = img.height || 1;
    const originalState = img.get('originalCropState' as keyof fabric.Image) || {
      width: sourceWidth,
      height: sourceHeight,
      cropX: img.cropX || 0,
      cropY: img.cropY || 0,
      scaleX: img.scaleX || 1,
      scaleY: img.scaleY || 1,
    };
    const { cropWidth, cropHeight, cropX, cropY } = calculateCropRegion(
      sourceWidth,
      sourceHeight,
      aspectRatio,
      cropZoom,
      cropPositionX,
      cropPositionY,
    );
    const displayedWidth = img.getScaledWidth();
    const uniformScale = displayedWidth / cropWidth;
    const radius = Number(img.get('imageCornerRadius' as keyof fabric.Image) || 0);

    img.set({
      width: cropWidth,
      height: cropHeight,
      cropX,
      cropY,
      scaleX: uniformScale,
      scaleY: uniformScale,
      clipPath: radius > 0 ? new fabric.Rect({
        width: cropWidth,
        height: cropHeight,
        rx: radius,
        ry: radius,
        originX: 'center',
        originY: 'center',
      }) : undefined,
      originalCropState: originalState,
      cropConfig: {
        aspectRatio,
        cropX,
        cropY,
        width: cropWidth,
        height: cropHeight,
        zoom: cropZoom,
        positionX: cropPositionX,
        positionY: cropPositionY,
      },
    } as Record<string, unknown>);
    img.setCoords();
    canvas.renderAll();
    saveHistory();

    setIsCropping(false);
  };

  const resetCrop = () => {
    if (!canvas || !selectedObject || !isImage) return;

    const img = selectedObject as fabric.Image;
    const original = img.get('originalCropState' as keyof fabric.Image) as {
      width?: number;
      height?: number;
      cropX?: number;
      cropY?: number;
      scaleX?: number;
      scaleY?: number;
    } | undefined;
    const restoredWidth = Number(original?.width || img.get('originalWidth' as keyof fabric.Image) || img.width);
    const restoredHeight = Number(original?.height || img.get('originalHeight' as keyof fabric.Image) || img.height);
    const radius = Number(img.get('imageCornerRadius' as keyof fabric.Image) || 0);
    img.set({
      width: restoredWidth,
      height: restoredHeight,
      cropX: original?.cropX || 0,
      cropY: original?.cropY || 0,
      scaleX: original?.scaleX || img.scaleX,
      scaleY: original?.scaleY || img.scaleY,
      clipPath: radius > 0 ? new fabric.Rect({
        width: restoredWidth,
        height: restoredHeight,
        rx: radius,
        ry: radius,
        originX: 'center',
        originY: 'center',
      }) : undefined,
      cropConfig: null,
      originalCropState: undefined,
    } as Record<string, unknown>);
    img.setCoords();
    canvas.renderAll();
    saveHistory();
    setCropZoom(1);
    setCropPositionX(0);
    setCropPositionY(0);
  };

  const updateCornerRadius = (value: number, commit = false) => {
    if (!canvas || !selectedObject || !isImage) return;
    const image = selectedObject as fabric.Image;
    const radius = Math.max(0, Math.min(value, Math.min(image.width || 0, image.height || 0) / 2));
    setCornerRadius(radius);
    image.set({
      imageCornerRadius: radius,
      clipPath: radius > 0 ? new fabric.Rect({
        width: image.width,
        height: image.height,
        rx: radius,
        ry: radius,
        originX: 'center',
        originY: 'center',
      }) : undefined,
    } as Record<string, unknown>);
    image.setCoords();
    canvas.requestRenderAll();
    if (commit) saveHistory();
  };

  if (!isImage) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Crop className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold text-zinc-400">Image Crop</span>
      </div>

      <label className="flex flex-col gap-1.5 text-[10px] text-zinc-500">
        <span className="flex items-center justify-between">
          Corner radius
          <span className="font-mono text-zinc-400">{Math.round(cornerRadius)}px</span>
        </span>
        <input
          type="range"
          min="0"
          max={Math.max(1, Math.min((selectedObject as fabric.Image).width || 100, (selectedObject as fabric.Image).height || 100) / 2)}
          value={cornerRadius}
          onChange={(event) => updateCornerRadius(Number(event.target.value))}
          onPointerUp={() => saveHistory()}
          onKeyUp={() => saveHistory()}
          className="w-full accent-violet-500"
        />
      </label>

      {!isCropping ? (
        <button
          onClick={startCropping}
          className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Crop className="w-3.5 h-3.5" />
          Start Cropping
        </button>
      ) : (
        <>
          {/* Aspect Ratio Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-1">
              {(['free', '1:1', '4:3', '16:9', '3:4', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-1.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    aspectRatio === ratio
                      ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {ratio === 'free' ? 'Free' : ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
            {[
              { label: 'Crop zoom', value: cropZoom, min: 1, max: 3, step: 0.05, setValue: setCropZoom, suffix: '×' },
              { label: 'Horizontal position', value: cropPositionX, min: -100, max: 100, step: 1, setValue: setCropPositionX, suffix: '' },
              { label: 'Vertical position', value: cropPositionY, min: -100, max: 100, step: 1, setValue: setCropPositionY, suffix: '' },
            ].map((control) => (
              <label key={control.label} className="block text-[9px] text-zinc-500">
                <span className="mb-1 flex justify-between">
                  {control.label}
                  <span className="font-mono text-zinc-400">{control.value.toFixed(control.step < 1 ? 2 : 0)}{control.suffix}</span>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={control.value}
                  onChange={(event) => control.setValue(Number(event.target.value))}
                  className="w-full accent-violet-500"
                />
              </label>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={cancelCropping}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={applyCrop}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetCrop}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-zinc-500 hover:text-zinc-300 text-[10px] font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Crop
          </button>
        </>
      )}
    </div>
  );
};
