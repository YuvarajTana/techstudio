import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, ImagePlus, Loader2, RefreshCw, Search, UploadCloud, X } from 'lucide-react';
import type { fabric } from 'fabric';
import { useEditorStore } from '../../../store/useEditorStore';
import { deleteUploadedImage, listUploadedImages, renameUploadedImage, uploadImageAsset } from '../../../services/uploadsApi';
import type { PosterAnalysisResult, PosterReferenceMode, PosterTextBlock, UploadedImageAsset } from '../../../types/uploads';
import { addUploadedImageToCanvas } from '../../../utils/uploadedImageCanvas';
import { convertPosterToEditableDesign } from '../../../utils/posterConversionCanvas';
import { MAX_UPLOAD_IMAGE_BYTES, UPLOAD_IMAGE_RULES } from '../../../config/uploads';
import { PosterConversionDialog } from '../image/PosterConversionDialog';
import { UploadedAssetCard } from './UploadedAssetCard';

const ACCEPTED_TYPES = new Set<string>(UPLOAD_IMAGE_RULES.acceptedMimeTypes);

type PendingUpload = {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'error' | 'complete';
  error?: string;
};

function validateFile(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) return 'Only PNG, JPG, JPEG, and WebP images are supported.';
  if (!file.size) return 'The selected file is empty.';
  if (file.size > MAX_UPLOAD_IMAGE_BYTES) return `Images must be ${UPLOAD_IMAGE_RULES.maxFileSizeMb} MB or smaller.`;
  return '';
}

export const UploadsPanel: React.FC = () => {
  const { canvas, projectId, saveHistory, setSelectedObject } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<UploadedImageAsset[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [editableAsset, setEditableAsset] = useState<UploadedImageAsset | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadAssets = useCallback(async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const result = await listUploadedImages(query);
      setAssets(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load uploaded images.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAssets(search), 250);
    return () => window.clearTimeout(timer);
  }, [loadAssets, search]);

  useEffect(() => {
    const refresh = () => void loadAssets(search);
    window.addEventListener('teckstudio:uploads-changed', refresh);
    return () => window.removeEventListener('teckstudio:uploads-changed', refresh);
  }, [loadAssets, search]);

  const insertAsset = useCallback(async (asset: UploadedImageAsset) => {
    if (!canvas) return;
    try {
      const image = await addUploadedImageToCanvas(canvas, asset);
      setSelectedObject(image);
      saveHistory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add the image to the canvas.');
    }
  }, [canvas, saveHistory, setSelectedObject]);

  const uploadFile = useCallback(async (file: File, existingId?: string) => {
    const validationError = validateFile(file);
    const pendingId = existingId || `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
    if (validationError) {
      setPending((items) => [
        { id: pendingId, file, progress: 0, status: 'error', error: validationError },
        ...items.filter((item) => item.id !== pendingId),
      ]);
      return;
    }
    setPending((items) => [
      { id: pendingId, file, progress: 0, status: 'uploading' },
      ...items.filter((item) => item.id !== pendingId),
    ]);
    try {
      const asset = await uploadImageAsset(
        file,
        projectId,
        (progress) => setPending((items) => items.map((item) => item.id === pendingId ? { ...item, progress } : item)),
      );
      setAssets((items) => [asset, ...items.filter((item) => item.id !== asset.id)]);
      setPending((items) => items.map((item) => item.id === pendingId ? { ...item, progress: 100, status: 'complete' } : item));
      await insertAsset(asset);
      window.setTimeout(() => setPending((items) => items.filter((item) => item.id !== pendingId)), 900);
    } catch (reason) {
      setPending((items) => items.map((item) => item.id === pendingId ? {
        ...item,
        status: 'error',
        error: reason instanceof Error ? reason.message : 'Upload failed.',
      } : item));
    }
  }, [insertAsset, projectId]);

  const uploadFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => void uploadFile(file));
  };

  const removeAsset = useCallback(async (asset: UploadedImageAsset) => {
    const inUse = canvas?.getObjects().filter((object) => object.get('assetId' as keyof fabric.Object) === asset.id) || [];
    const message = inUse.length
      ? `This image is used by ${inUse.length} canvas layer(s). Delete the asset and those layers?`
      : `Delete ${asset.filename} from uploads?`;
    if (!window.confirm(message)) return;
    try {
      await deleteUploadedImage(asset.id);
      inUse.forEach((object) => canvas?.remove(object));
      if (inUse.length) {
        canvas?.discardActiveObject();
        canvas?.requestRenderAll();
        setSelectedObject(null);
        saveHistory();
      }
      setAssets((items) => items.filter((item) => item.id !== asset.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete the uploaded image.');
    }
  }, [canvas, saveHistory, setSelectedObject]);

  const renameAsset = useCallback(async (asset: UploadedImageAsset) => {
    const nextName = window.prompt('Rename uploaded image', asset.filename)?.trim();
    if (!nextName || nextName === asset.filename) return;
    try {
      const renamed = await renameUploadedImage(asset.id, nextName);
      setAssets((items) => items.map((item) => item.id === asset.id ? renamed : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to rename the uploaded image.');
    }
  }, []);

  const createEditableDesign = useCallback(async (
    result: PosterAnalysisResult,
    blocks: PosterTextBlock[],
    referenceMode: PosterReferenceMode,
  ) => {
    if (!canvas || !editableAsset) throw new Error('The editor canvas is not ready.');
    const alreadyImported = canvas.getObjects().some((object) => (
      object.get('posterSourceAssetId' as keyof fabric.Object) === editableAsset.id
      && Boolean(object.get('posterConversionId' as keyof fabric.Object))
    ));
    if (alreadyImported) throw new Error('This uploaded image already has an editable import on the canvas.');

    let source = canvas.getObjects().find((object) => (
      object.type === 'image'
      && object.get('assetId' as keyof fabric.Object) === editableAsset.id
      && !object.get('posterConversionId' as keyof fabric.Object)
    )) as fabric.Image | undefined;
    if (!source) source = await addUploadedImageToCanvas(canvas, editableAsset);

    const conversion = await convertPosterToEditableDesign(canvas, source, result, blocks, referenceMode);
    const selected = conversion.source;
    canvas.setActiveObject(selected);
    setSelectedObject(selected);
    saveHistory();
    setSuccessMessage(`Edit Text ready. ${conversion.hotspots.length} text region(s) detected${conversion.reviewRequired.length ? ` · ${conversion.reviewRequired.length} need review` : ''}. Double-click text to edit without changing the original poster.`);
    window.setTimeout(() => setSuccessMessage(''), 4500);
  }, [canvas, editableAsset, saveHistory, setSelectedObject]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_IMAGE_RULES.acceptAttribute}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) uploadFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          uploadFiles(event.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition ${dragging ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-zinc-950/60 hover:border-violet-500/60'}`}
      >
        <UploadCloud className="mx-auto h-7 w-7 text-violet-400" />
        <div className="mt-2 text-xs font-bold text-zinc-200">Drop images or click to upload</div>
        <div className="mt-1 text-[9px] text-zinc-500">PNG, JPG, JPEG, WebP · max {UPLOAD_IMAGE_RULES.maxFileSizeMb} MB</div>
      </button>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search uploads"
          className="w-full rounded-lg border border-white/10 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-violet-500"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-[10px] text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void loadAssets()} aria-label="Retry loading uploads"><RefreshCw className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {pending.map((item) => (
        <div key={item.id} className="rounded-lg border border-white/10 bg-zinc-950 p-2">
          <div className="flex items-center gap-2">
            {item.status === 'uploading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />}
            {item.status === 'complete' && <Check className="h-3.5 w-3.5 text-emerald-400" />}
            {item.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />}
            <span className="min-w-0 flex-1 truncate text-[10px] text-zinc-300">{item.file.name}</span>
            {item.status === 'error' && (
              <button type="button" onClick={() => void uploadFile(item.file, item.id)} className="text-[9px] font-bold text-violet-300">Retry</button>
            )}
            <button type="button" onClick={() => setPending((items) => items.filter((pendingItem) => pendingItem.id !== item.id))} aria-label="Dismiss upload"><X className="h-3 w-3 text-zinc-600" /></button>
          </div>
          {item.status !== 'error' && (
            <div className="mt-2 h-1 overflow-hidden rounded bg-zinc-800">
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${item.progress}%` }} />
            </div>
          )}
          {item.error && <p className="mt-1 text-[9px] leading-4 text-rose-300">{item.error}</p>}
        </div>
      ))}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[10px] text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading uploads…</div>
      ) : assets.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 py-8 text-center">
          <ImagePlus className="mx-auto h-7 w-7 text-zinc-700" />
          <p className="mt-2 text-xs font-semibold text-zinc-400">{search ? 'No matching images' : 'No uploads yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 overflow-y-auto overscroll-contain pb-3">
          {assets.map((asset) => (
            <UploadedAssetCard
              key={asset.id}
              asset={asset}
              onAdd={insertAsset}
              onMakeEditable={setEditableAsset}
              onRename={renameAsset}
              onDelete={removeAsset}
            />
          ))}
        </div>
      )}

      <PosterConversionDialog
        open={Boolean(editableAsset)}
        assetId={editableAsset?.id || ''}
        sourceUrl={editableAsset?.url || ''}
        onClose={() => setEditableAsset(null)}
        onCreate={createEditableDesign}
      />

      {successMessage && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[320] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-emerald-950/95 px-4 py-3 text-[11px] font-semibold text-emerald-100 shadow-2xl">
          {successMessage}
        </div>
      )}
    </div>
  );
};
