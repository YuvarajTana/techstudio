import React from 'react';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  RotateCcw,
  AlignCenterHorizontal,
  AlignCenterVertical,
  Scaling,
  Layers,
} from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import {
  applyMediaFitMode,
  centerObjectHorizontally,
  centerObjectVertically,
  resetObjectSize,
  toggleLockAspectRatio,
  createSmartFitImageLayers,
} from '../../utils/mediaFittingUtils';
import type { MediaFitMode, BackgroundFillMode } from '../../utils/mediaFittingUtils';

interface MediaFittingControlsProps {
  object: fabric.Object;
  compact?: boolean;
}

export const MediaFittingControls: React.FC<MediaFittingControlsProps> = ({
  object,
  compact = false,
}) => {
  const { canvas, saveHistory } = useEditorStore();
  const [fitMode, setFitMode] = React.useState<MediaFitMode>(
    (object.get('fitMode' as any) as MediaFitMode) || 'smart-fit',
  );
  const [bgMode, setBgMode] = React.useState<BackgroundFillMode>(
    (object.get('backgroundMode' as any) as BackgroundFillMode) || 'blur',
  );
  const [blurAmount, setBlurAmount] = React.useState<number>(
    (object.get('blurAmount' as any) as number) ?? 40,
  );
  const [overlayOpacity, setOverlayOpacity] = React.useState<number>(
    (object.get('overlayOpacity' as any) as number) ?? 0.15,
  );
  const [bgColor, setBgColor] = React.useState<string>(
    (object.get('backgroundColor' as any) as string) || '#1e1b4b',
  );
  const [isLocked, setIsLocked] = React.useState(Boolean(object.get('lockUniScaling' as any)));

  React.useEffect(() => {
    setFitMode((object.get('fitMode' as any) as MediaFitMode) || 'smart-fit');
    setBgMode((object.get('backgroundMode' as any) as BackgroundFillMode) || 'blur');
    setBlurAmount((object.get('blurAmount' as any) as number) ?? 40);
    setOverlayOpacity((object.get('overlayOpacity' as any) as number) ?? 0.15);
    setBgColor((object.get('backgroundColor' as any) as string) || '#1e1b4b');
    setIsLocked(Boolean(object.get('lockUniScaling' as any)));
  }, [object]);

  if (!canvas) return null;

  const handleFitMode = async (mode: MediaFitMode) => {
    if (mode === 'stretch') {
      const confirmStretch = window.confirm('Stretching may distort logos, text, or faces. Proceed with stretch?');
      if (!confirmStretch) return;
    }

    if (mode === 'smart-fit' && object.type === 'image') {
      const imgElement = (object as fabric.Image).getElement() as HTMLImageElement;
      if (imgElement) {
        await createSmartFitImageLayers(canvas, imgElement, {
          id: object.get('id' as any),
          name: object.get('name' as any),
          assetId: object.get('assetId' as any),
          assetUrl: object.get('assetUrl' as any),
          sourceUrl: object.get('sourceUrl' as any),
          fitMode: 'smart-fit',
          backgroundMode: bgMode,
          blurAmount,
          overlayOpacity,
          backgroundColor: bgColor,
        });
      }
    } else {
      applyMediaFitMode(object, canvas, mode);
    }
    setFitMode(mode);
    saveHistory();
  };

  const handleBgMode = async (newBgMode: BackgroundFillMode) => {
    setBgMode(newBgMode);
    object.set('backgroundMode' as any, newBgMode);

    if (object.type === 'image') {
      const imgElement = (object as fabric.Image).getElement() as HTMLImageElement;
      if (imgElement) {
        await createSmartFitImageLayers(canvas, imgElement, {
          id: object.get('id' as any),
          name: object.get('name' as any),
          assetId: object.get('assetId' as any),
          assetUrl: object.get('assetUrl' as any),
          sourceUrl: object.get('sourceUrl' as any),
          fitMode: 'smart-fit',
          backgroundMode: newBgMode,
          blurAmount,
          overlayOpacity,
          backgroundColor: bgColor,
        });
      }
    }
    saveHistory();
  };

  const handleCenterH = () => {
    centerObjectHorizontally(object, canvas);
    saveHistory();
  };

  const handleCenterV = () => {
    centerObjectVertically(object, canvas);
    saveHistory();
  };

  const handleReset = async () => {
    if (object.type === 'image') {
      const imgElement = (object as fabric.Image).getElement() as HTMLImageElement;
      if (imgElement) {
        await createSmartFitImageLayers(canvas, imgElement, {
          id: object.get('id' as any),
          name: object.get('name' as any),
          assetId: object.get('assetId' as any),
          assetUrl: object.get('assetUrl' as any),
          sourceUrl: object.get('sourceUrl' as any),
          fitMode: 'smart-fit',
          backgroundMode: 'blur',
          blurAmount: 40,
          overlayOpacity: 0.15,
        });
      }
    } else {
      resetObjectSize(object, canvas);
    }
    setFitMode('smart-fit');
    setBgMode('blur');
    setBlurAmount(40);
    setOverlayOpacity(0.15);
    saveHistory();
  };

  const handleToggleLock = () => {
    const locked = toggleLockAspectRatio(object, canvas);
    setIsLocked(locked);
    saveHistory();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleFitMode('smart-fit')}
          className={`flex items-center gap-1 rounded px-2 py-1 text-[9px] font-bold transition-all ${
            fitMode === 'smart-fit'
              ? 'bg-violet-600 text-white shadow'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
          title="Smart Fit: Full image + Blurred background"
        >
          <Sparkles className="h-3 w-3 text-amber-300" />
          Smart Fit
        </button>
        <button
          type="button"
          onClick={() => handleFitMode('cover')}
          className={`rounded px-1.5 py-1 text-[9px] font-semibold transition-colors ${
            fitMode === 'cover'
              ? 'bg-violet-600 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
          title="Fill Frame (Cover)"
        >
          Fill Frame
        </button>
        <button
          type="button"
          onClick={handleToggleLock}
          className={`rounded p-1 transition-colors ${
            isLocked ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:bg-zinc-800'
          }`}
          title={isLocked ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
        >
          {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-semibold text-zinc-200">Image Fit Mode</span>
        </div>
        <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-violet-400 border border-violet-500/20">
          1080 × 1350 4:5
        </span>
      </div>

      {/* Fitting Modes */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => handleFitMode('smart-fit')}
          className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-bold transition-all ${
            fitMode === 'smart-fit'
              ? 'border-violet-500 bg-violet-600/20 text-white shadow-md'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Smart Fit: Full image visible + Blurred background extension (Recommended)"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Smart Fit (Default)
        </button>
        <button
          type="button"
          onClick={() => handleFitMode('contain')}
          className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-semibold transition-all ${
            fitMode === 'contain'
              ? 'border-violet-500 bg-violet-600/20 text-white shadow-md'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Fit Entire Image: Full image visible without background extension"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          Fit Entire Image
        </button>
        <button
          type="button"
          onClick={() => handleFitMode('cover')}
          className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[9px] font-semibold transition-all ${
            fitMode === 'cover'
              ? 'border-violet-500 bg-violet-600/20 text-white shadow-md'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Fill Frame: Crop image to fill the 1080 × 1350 portrait frame"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fill Frame
        </button>
        <button
          type="button"
          onClick={() => handleFitMode('stretch')}
          className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[9px] font-semibold transition-all ${
            fitMode === 'stretch'
              ? 'border-amber-500 bg-amber-500/20 text-amber-200 shadow-md'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Stretch: Stretch to 1080 × 1350 (warning: distorts aspect ratio)"
        >
          <Scaling className="h-3.5 w-3.5" />
          Stretch
        </button>
      </div>

      {/* Smart Fit Background Controls */}
      {fitMode === 'smart-fit' && (
        <div className="space-y-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-violet-300">
            <span>Background Extension Fill</span>
            <span className="capitalize">{bgMode}</span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {(['blur', 'solid', 'dominant', 'gradient', 'mirror'] as BackgroundFillMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleBgMode(mode)}
                className={`rounded py-1 text-[8px] font-bold capitalize transition-all ${
                  bgMode === mode
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {bgMode === 'blur' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] text-zinc-400">
                <span>Blur Strength</span>
                <span className="font-mono">{blurAmount}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={blurAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBlurAmount(val);
                  object.set('blurAmount' as any, val);
                }}
                onMouseUp={() => handleBgMode('blur')}
                className="h-1 w-full accent-violet-500"
              />
            </div>
          )}

          {(bgMode === 'solid' || bgMode === 'dominant') && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-400">Background Color</span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setBgColor(val);
                  object.set('backgroundColor' as any, val);
                  handleBgMode(bgMode);
                }}
                className="h-5 w-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Alignment & Lock */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          type="button"
          onClick={handleCenterH}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 py-1.5 text-[10px] font-medium text-zinc-300 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
        >
          <AlignCenterHorizontal className="h-3 w-3 text-amber-400" />
          Center Horizontally
        </button>
        <button
          type="button"
          onClick={handleCenterV}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 py-1.5 text-[10px] font-medium text-zinc-300 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
        >
          <AlignCenterVertical className="h-3 w-3 text-emerald-400" />
          Center Vertically
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[10px]">
        <button
          type="button"
          onClick={handleToggleLock}
          className={`flex items-center gap-1.5 rounded px-2 py-1 transition-colors ${
            isLocked ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          <span>{isLocked ? 'Aspect Ratio Locked' : 'Lock Aspect Ratio'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Smart Fit</span>
        </button>
      </div>
    </div>
  );
};
