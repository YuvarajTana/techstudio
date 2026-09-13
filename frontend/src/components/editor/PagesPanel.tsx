import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Copy,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { getPosterTrack } from '../../types/timeline';

export const PagesPanel: React.FC = () => {
  const {
    pages,
    activePageId,
    timelineProject,
    addPage,
    duplicatePage,
    deletePage,
    movePage,
    renamePage,
    switchPage,
    addPageToTimeline,
    removeTimelineClip,
  } = useEditorStore();
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDeletePageId, setPendingDeletePageId] = useState<string | null>(null);

  const clips = getPosterTrack(timelineProject).clips;
  const linkedClips = pendingDeletePageId
    ? clips.filter((clip) => clip.pageId === pendingDeletePageId)
    : [];

  const requestDelete = (pageId: string) => {
    if (clips.some((clip) => clip.pageId === pageId)) {
      setPendingDeletePageId(pageId);
      return;
    }
    deletePage(pageId);
  };

  return (
    <div className="relative flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Pages</h3>
          <p className="text-[9px] text-zinc-500">Each page can become a video scene.</p>
        </div>
        <button
          type="button"
          onClick={addPage}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          title="Add Page"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          const inTimeline = clips.some((clip) => clip.pageId === page.id);
          return (
            <div
              key={page.id}
              onClick={() => void switchPage(page.id)}
              className={`group relative rounded-xl border p-2.5 transition-all ${
                isActive
                  ? 'border-violet-500/50 bg-violet-600/10 text-violet-300'
                  : 'border-zinc-800 bg-zinc-900/30 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                  {page.thumbnail
                    ? <img src={page.thumbnail} alt="" className="h-full w-full object-cover" />
                    : <FileText className="h-4 w-4 text-zinc-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  {editingPageId === page.id ? (
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      onBlur={() => {
                        renamePage(page.id, editName);
                        setEditingPageId(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          renamePage(page.id, editName);
                          setEditingPageId(null);
                        }
                        if (event.key === 'Escape') setEditingPageId(null);
                      }}
                      onClick={(event) => event.stopPropagation()}
                      className="w-full rounded border border-violet-500 bg-zinc-950 px-2 py-1 text-xs outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        setEditingPageId(page.id);
                        setEditName(page.name);
                      }}
                      className="block w-full truncate text-left text-xs font-semibold"
                    >
                      {page.name}
                    </button>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] text-zinc-500">
                    <span>Page {index + 1}</span>
                    {inTimeline && <span className="rounded bg-cyan-500/10 px-1 text-cyan-400">Timeline</span>}
                  </div>
                </div>
                <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={(event) => { event.stopPropagation(); movePage(page.id, 'up'); }} disabled={index === 0} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 disabled:opacity-20" title="Move up">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); movePage(page.id, 'down'); }} disabled={index === pages.length - 1} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 disabled:opacity-20" title="Move down">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); duplicatePage(page.id); }} className="rounded p-1 text-zinc-500 hover:bg-zinc-800" title="Duplicate page">
                    <Copy className="h-3 w-3" />
                  </button>
                  {pages.length > 1 && (
                    <button type="button" onClick={(event) => { event.stopPropagation(); requestDelete(page.id); }} className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400" title="Delete page">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  addPageToTimeline(page.id);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 py-1.5 text-[9px] font-bold text-cyan-300 hover:bg-cyan-500/10"
              >
                <Clapperboard className="h-3 w-3" />
                Add Page to Timeline
              </button>
            </div>
          );
        })}
      </div>

      {pendingDeletePageId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/80 p-3 backdrop-blur-sm">
          <div className="w-full rounded-xl border border-rose-500/30 bg-[#111119] p-3 shadow-2xl">
            <p className="text-xs font-bold text-zinc-100">Page is used by {linkedClips.length} timeline clip(s)</p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-500">Choose whether to delete both, remove only the timeline clips, or cancel.</p>
            <div className="mt-3 grid gap-1.5">
              <button type="button" onClick={() => { deletePage(pendingDeletePageId, true); setPendingDeletePageId(null); }} className="rounded-lg bg-rose-600 px-2 py-2 text-[9px] font-bold text-white">
                Delete Page and Related Clips
              </button>
              <button type="button" onClick={() => { linkedClips.forEach((clip) => removeTimelineClip(clip.id)); setPendingDeletePageId(null); }} className="rounded-lg border border-zinc-700 px-2 py-2 text-[9px] font-bold text-zinc-300">
                Remove Timeline Clips Only
              </button>
              <button type="button" onClick={() => setPendingDeletePageId(null)} className="rounded-lg px-2 py-2 text-[9px] font-bold text-zinc-500">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
