import React, { useState } from 'react';
import {
  History,
  Undo2,
  Redo2,
  Trash2,
  Clock,
  Camera,
  Bookmark,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

interface HistorySnapshot {
  id: string;
  index: number;
  timestamp: Date;
  label: string;
  thumbnail?: string;
}

export const HistoryPanel: React.FC = () => {
  const { canvas, history, historyIndex, undo, redo, clearHistory, saveHistory } = useEditorStore();
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);

  // Generate thumbnail for current state
  const generateThumbnail = (): string | undefined => {
    if (!canvas) return undefined;
    try {
      return canvas.toDataURL({
        format: 'png',
        multiplier: 0.1,
        quality: 0.5,
      });
    } catch {
      return undefined;
    }
  };

  // Save current state as a named snapshot
  const saveSnapshot = () => {
    if (!canvas) return;
    const thumbnail = generateThumbnail();
    const snapshot: HistorySnapshot = {
      id: Date.now().toString(),
      index: historyIndex,
      timestamp: new Date(),
      label: `Snapshot ${snapshots.length + 1}`,
      thumbnail,
    };
    setSnapshots((prev) => [...prev, snapshot]);
  };

  // Restore to a snapshot
  const restoreSnapshot = (snapshot: HistorySnapshot) => {
    if (!canvas || !history[snapshot.index]) return;

    const state = history[snapshot.index];
    // Just load the JSON directly - no need for undo/redo chain
    canvas.loadFromJSON(state, () => {
      canvas.renderAll();
      saveHistory();
    });
  };

  // Delete a snapshot
  const deleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimestamp = (index: number) => {
    const diff = historyIndex - index;
    if (diff === 0) return 'Current';
    if (diff === 1) return '1 step back';
    if (diff > 1) return `${diff} steps back`;
    if (diff === -1) return '1 step forward';
    return `${Math.abs(diff)} steps forward`;
  };

  const getActionName = (index: number) => {
    if (index === 0) return 'Initial state';
    return `Edit ${index}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Undo/Redo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-zinc-400">History</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:text-zinc-600 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:text-zinc-600 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Save Snapshot Button */}
      <button
        onClick={saveSnapshot}
        disabled={!canvas}
        className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
      >
        <Camera className="w-3.5 h-3.5" />
        Save Snapshot
      </button>

      {/* Snapshots Section */}
      {snapshots.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            {showSnapshots ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Bookmark className="w-3 h-3" />
            Saved Snapshots ({snapshots.length})
          </button>

          {showSnapshots && (
            <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                >
                  {snapshot.thumbnail ? (
                    <img
                      src={snapshot.thumbnail}
                      alt={snapshot.label}
                      className="w-10 h-10 rounded object-cover bg-zinc-800"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{snapshot.label}</p>
                    <p className="text-[10px] text-zinc-500">{formatTime(snapshot.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => restoreSnapshot(snapshot)}
                      className="px-2 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                      title="Restore snapshot"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteSnapshot(snapshot.id)}
                      className="p-1 hover:bg-zinc-850 hover:text-rose-400 rounded text-zinc-600 transition-colors cursor-pointer"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline Section */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          {showTimeline ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <Clock className="w-3 h-3" />
          Edit Timeline ({history.length} states)
        </button>

        {showTimeline && (
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-500">
                No history yet. Make some changes to see them here.
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-zinc-800" />

                {history.map((_, index) => {
                  const isCurrent = index === historyIndex;
                  const isPast = index < historyIndex;
                  const isFuture = index > historyIndex;

                  return (
                    <div
                      key={index}
                      className={`relative flex items-center gap-3 pl-1 pr-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-violet-600/10 border border-violet-500/30'
                          : isPast
                          ? 'hover:bg-zinc-800/30'
                          : 'opacity-50'
                      }`}
                      onClick={() => {
                        if (isPast) {
                          const stepsBack = historyIndex - index;
                          for (let i = 0; i < stepsBack; i++) {
                            setTimeout(() => undo(), i * 10);
                          }
                        } else if (isFuture) {
                          const stepsForward = index - historyIndex;
                          for (let i = 0; i < stepsForward; i++) {
                            setTimeout(() => redo(), i * 10);
                          }
                        }
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center ${
                          isCurrent
                            ? 'bg-violet-500'
                            : isPast
                            ? 'bg-zinc-700'
                            : 'bg-zinc-800'
                        }`}
                      >
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${
                            isCurrent
                              ? 'text-violet-300'
                              : isPast
                              ? 'text-zinc-400'
                              : 'text-zinc-600'
                          }`}
                        >
                          {getActionName(index)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {formatTimestamp(index)}
                        </div>
                      </div>

                      {/* Current indicator */}
                      {isCurrent && (
                        <div className="text-[9px] font-bold text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">
                          NOW
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear History */}
      {history.length > 0 && (
        <button
          onClick={clearHistory}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-zinc-500 hover:text-rose-400 text-[10px] font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          Clear History
        </button>
      )}
    </div>
  );
};
