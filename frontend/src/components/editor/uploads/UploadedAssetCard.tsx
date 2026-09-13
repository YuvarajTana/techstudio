import React from 'react';
import { CheckCircle2, ImagePlus, Pencil, ScanText, Trash2 } from 'lucide-react';
import type { UploadedImageAsset } from '../../../types/uploads';

type UploadedAssetCardProps = {
  asset: UploadedImageAsset;
  onAdd: (asset: UploadedImageAsset) => void;
  onMakeEditable: (asset: UploadedImageAsset) => void;
  onRename: (asset: UploadedImageAsset) => void;
  onDelete: (asset: UploadedImageAsset) => void;
};

const formatBytes = (value: number) => {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const UploadedAssetCard = React.memo<UploadedAssetCardProps>(({
  asset,
  onAdd,
  onMakeEditable,
  onRename,
  onDelete,
}) => (
  <article className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-950 hover:border-violet-500/60">
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-teckstudio-upload', JSON.stringify(asset));
        event.dataTransfer.effectAllowed = 'copy';
      }}
      className="relative cursor-grab"
      title={`Drag ${asset.filename} to the canvas`}
    >
      <img
        src={asset.thumbnailUrl}
        alt={`${asset.filename} upload preview`}
        loading="lazy"
        decoding="async"
        className="h-24 w-full bg-black/30 object-cover"
      />
      <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-emerald-300">
        <CheckCircle2 className="h-2.5 w-2.5" /> Uploaded
      </span>
    </div>

    <div className="p-2">
      <div className="truncate text-[10px] font-semibold text-zinc-300">{asset.filename}</div>
      <div className="mt-0.5 text-[8px] text-zinc-600">{asset.width}×{asset.height} · {formatBytes(asset.fileSize)}</div>
      <div className="mt-2 grid gap-1">
        <button type="button" onClick={() => onAdd(asset)} className="flex items-center justify-center gap-1 rounded-md border border-zinc-800 px-1.5 py-1.5 text-[8px] font-bold text-zinc-300 hover:bg-zinc-800">
          <ImagePlus className="h-3 w-3" /> Add as Image
        </button>
        <button type="button" onClick={() => onMakeEditable(asset)} className="flex items-center justify-center gap-1 rounded-md bg-violet-600 px-1.5 py-1.5 text-[8px] font-bold text-white hover:bg-violet-500">
          <ScanText className="h-3 w-3" /> Edit Text
        </button>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button type="button" onClick={() => onRename(asset)} className="flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[8px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200">
          <Pencil className="h-2.5 w-2.5" /> Rename
        </button>
        <button type="button" onClick={() => onDelete(asset)} className="flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[8px] text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300">
          <Trash2 className="h-2.5 w-2.5" /> Delete
        </button>
      </div>
    </div>
  </article>
));

UploadedAssetCard.displayName = 'UploadedAssetCard';
