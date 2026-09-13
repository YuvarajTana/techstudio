import React, { useRef, useState } from 'react';
import {
  Music,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';
import { masterTimelineManager } from '../../../utils/masterTimelineManager';
import type { TimelineAudioTrack } from '../../../types/timeline';

interface AudioTrackRowProps {
  pixelsPerSecond: number;
  trackWidth: number;
}

export const AudioTrackRow: React.FC<AudioTrackRowProps> = ({
  pixelsPerSecond,
}) => {
  const store = useEditorStore();
  const timeline = store.timelineProject;
  const audio = timeline.audio;
  const fileRef = useRef<HTMLInputElement>(null);
  const [volume, setVolume] = useState(audio?.volume ?? 1);
  const [muted, setMuted] = useState(audio?.muted ?? false);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const durationMs = timeline.durationMs || 5000;
    const audioTrack: TimelineAudioTrack = {
      id: `audio-${Date.now()}`,
      assetUrl: url,
      startTime: 0,
      endTime: durationMs / 1000,
      trimStart: 0,
      volume: 1,
      muted: false,
    };
    store.setTimelineProject?.({
      ...timeline,
      audio: audioTrack,
    });
    masterTimelineManager.bindAudioTrack?.(audioTrack);
  };

  const handleDelete = () => {
    store.setTimelineProject?.({ ...timeline, audio: undefined });
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audio) {
      store.setTimelineProject?.({
        ...timeline,
        audio: { ...audio, volume: newVolume },
      });
    }
  };

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    if (audio) {
      store.setTimelineProject?.({
        ...timeline,
        audio: { ...audio, muted: next },
      });
    }
  };

  if (!audio) {
    return (
      <div className="relative flex h-9 items-center border-t border-zinc-800/60 bg-zinc-950/30 px-3">
        <div className="flex items-center gap-2">
          <Music className="h-3 w-3 shrink-0 text-zinc-600" />
          <span className="text-[9px] text-zinc-600">Audio</span>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="ml-3 flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700/60 px-2.5 py-1 text-[9px] text-zinc-500 transition-colors hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-400"
        >
          <Plus className="h-3 w-3" />
          Add Audio
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/mpeg,audio/ogg"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    );
  }

  const durationSeconds = (audio.endTime - audio.startTime);
  const clipWidth = Math.max(durationSeconds * pixelsPerSecond, 60);
  const leftPx = audio.startTime * pixelsPerSecond;

  return (
    <div className="relative h-9 border-t border-zinc-800/60 bg-zinc-950/30">
      {/* Track label */}
      <div className="absolute left-0 top-0 flex h-full w-32 items-center gap-1.5 border-r border-zinc-800 px-2">
        <Music className="h-3 w-3 shrink-0 text-emerald-400" />
        <span className="truncate text-[9px] font-semibold text-zinc-300">Audio</span>
        <button
          type="button"
          onClick={handleMuteToggle}
          className="ml-auto rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded p-0.5 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400"
          title="Remove audio"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Audio clip block */}
      <div
        className="absolute top-1 flex h-7 items-center overflow-hidden rounded-md border border-emerald-500/30 bg-emerald-500/10"
        style={{ left: 132 + leftPx, width: clipWidth }}
      >
        {/* Waveform placeholder */}
        <div className="flex h-full flex-1 items-center px-1">
          <div className="flex h-4 w-full items-center gap-px overflow-hidden">
            {Array.from({ length: Math.max(Math.floor(clipWidth / 3), 1) }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-emerald-400/60"
                style={{
                  height: `${20 + Math.sin(i * 0.7) * 40 + Math.cos(i * 1.3) * 25}%`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="shrink-0 px-1 text-[7px] font-bold text-emerald-300">
          {durationSeconds.toFixed(1)}s
        </div>
      </div>

      {/* Volume control (bottom right) */}
      <div className="absolute bottom-0 right-2 top-0 hidden items-center gap-1.5 group-hover:flex">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="h-1 w-14 accent-emerald-400"
          title="Volume"
        />
      </div>
    </div>
  );
};
