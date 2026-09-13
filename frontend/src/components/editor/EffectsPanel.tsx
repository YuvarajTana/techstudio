import React, { useEffect, useRef, useState } from 'react';
import { Eraser, FlipHorizontal, Image as ImageIcon, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import type { ImageEffectConfig, ProcessedImageMetadata } from '../../types/editorFeatures';
import {
  applyImageEffectConfig,
  DEFAULT_IMAGE_EFFECTS,
  IMAGE_FILTER_PRESETS,
  readImageEffectConfig,
} from '../../utils/imageEffects';
import { applyPersonImageEffect, removeImageBackground } from '../../services/imageProcessingApi';

const SLIDERS: Array<{ key: keyof ImageEffectConfig; label: string; min: number; max: number; step?: number }> = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
  { key: 'blur', label: 'Blur', min: 0, max: 100 },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100 },
];

const imageSource = (image: fabric.Image) => image.getSrc() || String(image.get('src' as keyof fabric.Image) || '');

const setImageSource = (image: fabric.Image, source: string) => new Promise<void>((resolve, reject) => {
  image.setSrc(source, () => {
    const element = image.getElement() as HTMLImageElement;
    if (!element || !element.width || !element.height) {
      reject(new Error('The processed image could not be decoded by the browser.'));
      return;
    }
    image.setCoords();
    resolve();
  }, { crossOrigin: 'anonymous' });
});

export const EffectsPanel: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();
  const selectedImage = selectedObject?.type === 'image' ? selectedObject as fabric.Image : null;
  const [effects, setEffects] = useState<Required<ImageEffectConfig>>(DEFAULT_IMAGE_EFFECTS);
  const [processing, setProcessing] = useState('');
  const [message, setMessage] = useState('');
  const [personColor, setPersonColor] = useState('#8b5cf6');
  const [outlineWidth, setOutlineWidth] = useState(8);
  const [effectBlur, setEffectBlur] = useState(18);
  const abortControllerRef = useRef<AbortController | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEffects(readImageEffectConfig(selectedImage));
    setMessage('');
  }, [selectedImage]);

  const applyEffects = (next: ImageEffectConfig, commit = false) => {
    if (!canvas || !selectedImage) return;
    const normalized = { ...DEFAULT_IMAGE_EFFECTS, ...next };
    setEffects(normalized);
    applyImageEffectConfig(selectedImage, normalized);
    canvas.requestRenderAll();
    if (commit) saveHistory();
  };

  const applyPreset = (name: string, config: ImageEffectConfig) => {
    applyEffects({ ...DEFAULT_IMAGE_EFFECTS, ...config, preset: name }, true);
    setMessage(`${name} filter applied.`);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    if (!canvas || !selectedObject) return;
    selectedObject.set(direction === 'horizontal' ? 'flipX' : 'flipY', direction === 'horizontal' ? !selectedObject.flipX : !selectedObject.flipY);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    saveHistory();
  };

  const handleRotate = () => {
    if (!canvas || !selectedObject) return;
    selectedObject.rotate(((selectedObject.angle || 0) + 45) % 360);
    selectedObject.setCoords();
    canvas.requestRenderAll();
    saveHistory();
  };

  const processImage = async (operation: string, backgroundFile?: File) => {
    if (!canvas || !selectedImage) {
      setMessage('Select an image layer first.');
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setProcessing(operation);
    setMessage('');
    try {
      const currentSource = imageSource(selectedImage);
      if (!currentSource) throw new Error('The selected image has no usable source.');
      const storedOriginal = String(selectedImage.get('originalImageUrl' as keyof fabric.Image) || '');
      const result = operation === 'remove-background'
        ? await removeImageBackground(storedOriginal || currentSource, controller.signal)
        : await applyPersonImageEffect({
            source: currentSource,
            originalSource: operation === 'background-blur' ? storedOriginal : undefined,
            backgroundFile,
            operation,
            color: personColor,
            width: outlineWidth,
            blur: effectBlur,
            signal: controller.signal,
          });
      await setImageSource(selectedImage, result.imageUrl);
      const metadata: ProcessedImageMetadata = {
        originalImageUrl: storedOriginal || result.originalUrl || currentSource,
        processedImageUrl: result.imageUrl,
        personMaskUrl: result.maskUrl || String(selectedImage.get('personMaskUrl' as keyof fabric.Image) || ''),
        operation: result.operation,
        provider: result.provider,
        processedAt: new Date().toISOString(),
      };
      selectedImage.set({
        originalImageUrl: metadata.originalImageUrl,
        processedImageUrl: metadata.processedImageUrl,
        personMaskUrl: metadata.personMaskUrl,
        processingMetadata: metadata,
      } as Record<string, unknown>);
      applyImageEffectConfig(selectedImage, effects);
      canvas.setActiveObject(selectedImage);
      canvas.requestRenderAll();
      saveHistory();
      setMessage(`${operation.replaceAll('-', ' ')} applied with ${result.provider}.`);
    } catch (error) {
      if ((error as Error).name === 'AbortError') setMessage('Image processing cancelled.');
      else setMessage(error instanceof Error ? error.message : 'The effect could not be applied. Please try again.');
    } finally {
      setProcessing('');
      abortControllerRef.current = null;
    }
  };

  const restoreOriginal = async () => {
    if (!canvas || !selectedImage) return;
    const originalSource = String(selectedImage.get('originalImageUrl' as keyof fabric.Image) || '');
    if (!originalSource) {
      setMessage('No original image is stored for this layer.');
      return;
    }
    try {
      await setImageSource(selectedImage, originalSource);
      selectedImage.set({
        processedImageUrl: undefined,
        personMaskUrl: undefined,
        processingMetadata: undefined,
        shadow: undefined,
      } as Record<string, unknown>);
      applyImageEffectConfig(selectedImage, effects);
      canvas.setActiveObject(selectedImage);
      canvas.requestRenderAll();
      saveHistory();
      setMessage('Original image restored.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to restore the original image.');
    }
  };

  const isCutout = Boolean(selectedImage?.get('personMaskUrl' as keyof fabric.Image));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-fuchsia-400" />
        <span className="text-xs font-semibold text-zinc-300">Image Effects</span>
      </div>

      {!selectedImage && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-center">
          <ImageIcon className="mx-auto mb-2 h-7 w-7 text-zinc-600" />
          <p className="text-xs font-semibold text-zinc-300">Select an image first</p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">Adjustments and person effects only appear for image layers.</p>
        </div>
      )}

      <div className={!selectedImage ? 'pointer-events-none opacity-40' : 'flex flex-col gap-4'}>
        <section className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Filters</div>
          <div className="grid grid-cols-3 gap-1.5">
            {IMAGE_FILTER_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.name, preset.config)}
                aria-pressed={effects.preset === preset.name}
                className={`min-h-9 rounded-lg border px-2 py-1.5 text-[9px] font-semibold transition ${
                  effects.preset === preset.name
                    ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-fuchsia-500/40 hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Adjust</div>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className="grid grid-cols-[66px_1fr_36px] items-center gap-2 text-[9px] text-zinc-500">
              <span>{slider.label}</span>
              <input
                type="range"
                aria-label={slider.label}
                min={slider.min}
                max={slider.max}
                step={slider.step || 1}
                value={Number(effects[slider.key])}
                onChange={(event) => applyEffects({ ...effects, [slider.key]: Number(event.target.value), preset: 'Custom' })}
                onPointerUp={() => saveHistory()}
                onKeyUp={() => saveHistory()}
                className="accent-fuchsia-500"
              />
              <span className="text-right font-mono text-zinc-300">{Number(effects[slider.key])}</span>
            </label>
          ))}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['grayscale', 'sepia', 'invert'] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={effects[key]}
                onClick={() => applyEffects({ ...effects, [key]: !effects[key], preset: 'Custom' }, true)}
                className={`min-h-10 rounded-lg border text-[9px] font-bold capitalize ${effects[key] ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}`}
              >
                {key}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => applyPreset('Original', {})} className="w-full rounded-lg border border-zinc-800 py-2 text-[10px] font-bold text-zinc-400 hover:text-white">
            Reset Adjustments
          </button>
        </section>

        <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
              <Eraser className="h-3.5 w-3.5 text-emerald-400" /> Person Effects
            </div>
            {processing && (
              <button type="button" onClick={() => abortControllerRef.current?.abort()} className="text-[9px] font-bold text-rose-300 hover:text-white">Cancel</button>
            )}
          </div>

          <button
            type="button"
            disabled={Boolean(processing)}
            onClick={() => void processImage('remove-background')}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {processing === 'remove-background' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Remove Background
          </button>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[9px] text-zinc-400">
              Colour
              <input type="color" aria-label="Person effect colour" value={personColor} onChange={(event) => setPersonColor(event.target.value)} className="h-7 w-9 rounded bg-transparent" />
            </label>
            <label className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[9px] text-zinc-400">
              Outline {outlineWidth}px
              <input type="range" aria-label="Person outline width" min="1" max="24" value={outlineWidth} onChange={(event) => setOutlineWidth(Number(event.target.value))} className="mt-1 w-full accent-fuchsia-500" />
            </label>
            <label className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[9px] text-zinc-400">
              Blur {effectBlur}px
              <input type="range" aria-label="Person effect blur" min="2" max="50" value={effectBlur} onChange={(event) => setEffectBlur(Number(event.target.value))} className="mt-1 w-full accent-fuchsia-500" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['outline', 'Person Outline'],
              ['glow', 'Person Glow'],
              ['shadow', 'Person Shadow'],
              ['silhouette', 'Silhouette'],
              ['posterize', 'Posterize'],
              ['duotone', 'Duotone'],
              ['background-blur', 'Background Blur'],
              ['background-color', 'Colour Background'],
              ['background-gradient', 'Gradient Background'],
            ].map(([operation, label]) => (
              <button
                key={operation}
                type="button"
                disabled={Boolean(processing) || (!isCutout && !['posterize', 'duotone'].includes(operation))}
                onClick={() => void processImage(operation)}
                className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[9px] font-bold text-zinc-400 hover:border-fuchsia-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {processing === operation ? 'Processing…' : label}
              </button>
            ))}
            <button type="button" disabled={Boolean(processing) || !isCutout} onClick={() => backgroundInputRef.current?.click()} className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[9px] font-bold text-zinc-400 hover:text-white disabled:opacity-35">
              Replace Background
            </button>
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void processImage('background-image', file);
                event.target.value = '';
              }}
            />
          </div>

          <button type="button" disabled={!selectedImage?.get('originalImageUrl' as keyof fabric.Image) || Boolean(processing)} onClick={() => void restoreOriginal()} className="w-full rounded-lg border border-zinc-800 py-2 text-[10px] font-bold text-zinc-400 hover:text-white disabled:opacity-35">
            Restore Original
          </button>
          <p className="text-[9px] leading-4 text-zinc-600">Automatic cutout uses remove.bg when configured, otherwise a visible local foreground-segmentation fallback.</p>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => handleFlip('horizontal')} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-zinc-800 text-[9px] text-zinc-400"><FlipHorizontal className="h-3 w-3" /> Flip H</button>
          <button type="button" onClick={() => handleFlip('vertical')} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-zinc-800 text-[9px] text-zinc-400"><FlipHorizontal className="h-3 w-3 rotate-90" /> Flip V</button>
          <button type="button" onClick={handleRotate} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-zinc-800 text-[9px] text-zinc-400"><RotateCw className="h-3 w-3" /> Rotate</button>
        </div>
      </div>

      {message && <div role="status" className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 p-2 text-[10px] leading-4 text-fuchsia-100">{message}</div>}
    </div>
  );
};
