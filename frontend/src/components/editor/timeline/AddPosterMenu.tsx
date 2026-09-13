import React, { useRef, useState, useEffect } from 'react';
import { Copy, FilePlus, ImagePlus, LayoutGrid, Plus } from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';

interface AddPosterMenuProps {
  /** Insert the new clip after this clip ID. null = append at end */
  afterClipId: string | null;
  style?: React.CSSProperties;
  className?: string;
}

export const AddPosterMenu: React.FC<AddPosterMenuProps> = ({ afterClipId, style, className }) => {
  const store = useEditorStore();
  const [open, setOpen] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setShowPagePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const close = () => {
    setOpen(false);
    setShowPagePicker(false);
  };

  const handleAddCurrentPage = () => {
    store.insertPageAfterClip(store.activePageId, afterClipId);
    close();
  };

  const handleCreateBlank = () => {
    store.createAndAddPage(afterClipId);
    close();
  };

  const handleDuplicateCurrent = () => {
    store.duplicatePageAndAddToTimeline(store.activePageId, afterClipId);
    close();
  };

  const handleChoosePage = (pageId: string) => {
    store.insertPageAfterClip(pageId, afterClipId);
    close();
  };

  return (
    <div
      ref={ref}
      className={`relative flex items-center ${className || ''}`}
      style={style}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-violet-500/50 bg-violet-500/5 text-violet-400 transition-all hover:border-violet-400 hover:bg-violet-500/15 hover:text-violet-300 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
        title="Add poster scene"
        aria-label="Add poster to timeline"
      >
        <Plus className="h-5 w-5 transition-transform group-hover:scale-110" />
      </button>

      {open && (
        <div className="absolute left-12 top-1/2 z-50 w-56 -translate-y-1/2 rounded-xl border border-zinc-700/80 bg-[#141420] shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Add Scene
          </div>
          <div className="flex flex-col gap-0.5 px-1.5 pb-2">
            <button
              type="button"
              onClick={handleAddCurrentPage}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] text-zinc-200 transition-colors hover:bg-violet-500/15 hover:text-violet-200"
            >
              <ImagePlus className="h-3.5 w-3.5 shrink-0 text-violet-400" />
              Add Current Page
            </button>
            <button
              type="button"
              onClick={handleCreateBlank}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] text-zinc-200 transition-colors hover:bg-violet-500/15 hover:text-violet-200"
            >
              <FilePlus className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              Create New Blank Poster
            </button>
            <button
              type="button"
              onClick={handleDuplicateCurrent}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] text-zinc-200 transition-colors hover:bg-violet-500/15 hover:text-violet-200"
            >
              <Copy className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              Duplicate Current Poster
            </button>
            <button
              type="button"
              onClick={() => setShowPagePicker((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] text-zinc-200 transition-colors hover:bg-violet-500/15 hover:text-violet-200"
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              Choose Existing Page
              <span className="ml-auto text-[9px] text-zinc-600">{showPagePicker ? '▲' : '▼'}</span>
            </button>

            {showPagePicker && (
              <div className="ml-6 mt-0.5 flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-1">
                {store.pages.length === 0 && (
                  <p className="px-2 py-1 text-[10px] text-zinc-600">No pages</p>
                )}
                {store.pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => handleChoosePage(page.id)}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    {page.thumbnail ? (
                      <img
                        src={page.thumbnail}
                        alt=""
                        className="h-6 w-5 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-6 w-5 shrink-0 rounded bg-zinc-800" />
                    )}
                    <span className="truncate">{page.name}</span>
                    {page.id === store.activePageId && (
                      <span className="ml-auto shrink-0 rounded bg-violet-500/20 px-1 text-[8px] text-violet-300">
                        current
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
