import { Download, ExternalLink, Pencil, RefreshCw } from 'lucide-react';

type GeneratedAssetType = 'image' | 'poster' | 'thumbnail';

type GeneratedAssetActionsProps = {
  assetType: GeneratedAssetType;
  imageSource: string;
  width?: number;
  height?: number;
  prompt?: string;
  onDownload: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  onOpenInEditor: () => void;
  downloadDisabled?: boolean;
  regenerateDisabled?: boolean;
  editDisabled?: boolean;
  openDisabled?: boolean;
};

const assetLabels: Record<GeneratedAssetType, string> = {
  image: 'Edit',
  poster: 'Edit Poster',
  thumbnail: 'Edit Thumbnail',
};

const secondaryButton =
  'flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950/70 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-200 transition-colors hover:border-violet-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export function GeneratedAssetActions({
  assetType,
  imageSource,
  width,
  height,
  prompt,
  onDownload,
  onRegenerate,
  onEdit,
  onOpenInEditor,
  downloadDisabled = false,
  regenerateDisabled = false,
  editDisabled = false,
  openDisabled = false,
}: GeneratedAssetActionsProps) {
  const editLabel = assetLabels[assetType];
  const metadataLabel = [width && height ? `${width}×${height}` : '', prompt ? 'Prompt ready' : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="relative z-10 border-t border-zinc-800/80 bg-zinc-950/95 p-2"
      data-asset-type={assetType}
      data-has-source={Boolean(imageSource)}
      aria-label={`${editLabel} generated ${assetType}`}
      title={metadataLabel || undefined}
    >
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onDownload} disabled={!imageSource || downloadDisabled} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-fuchsia-400/20 bg-fuchsia-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40">
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
        <button type="button" onClick={onRegenerate} disabled={regenerateDisabled} className={secondaryButton}>
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
        <button type="button" onClick={onEdit} disabled={!imageSource || editDisabled} className="flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
          <Pencil className="h-3.5 w-3.5" />
          {editLabel}
        </button>
        <button type="button" onClick={onOpenInEditor} disabled={!imageSource || openDisabled} className={secondaryButton}>
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Editor
        </button>
      </div>
    </div>
  );
}
