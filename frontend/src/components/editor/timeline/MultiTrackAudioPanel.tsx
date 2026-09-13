import React, { useRef, useState } from 'react';
import {
  Mic,
  Music,
  Zap,
  Plus,
  Volume2,
  VolumeX,
  Trash2,
  Copy,
  Scissors,
  Radio,
} from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';
import type { AudioTrackType, TimelineAudioClip } from '../../../types/timeline';

interface MultiTrackAudioPanelProps {
  pixelsPerSecond: number;
  onOpenVoiceRecorder: () => void;
}

const TRACK_CONFIG: Record<
  AudioTrackType,
  { label: string; icon: React.ReactNode; color: string; border: string; bg: string; text: string }
> = {
  voiceover: {
    label: 'Voice-over',
    icon: <Mic className="h-3 w-3 text-violet-400" />,
    color: 'bg-violet-500/60',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
  },
  bgmusic: {
    label: 'Background Music',
    icon: <Music className="h-3 w-3 text-emerald-400" />,
    color: 'bg-emerald-500/60',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
  },
  sfx: {
    label: 'Sound Effects',
    icon: <Zap className="h-3 w-3 text-amber-400" />,
    color: 'bg-amber-500/60',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
  },
};

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('Audio file could not be read.'));
  reader.readAsDataURL(file);
});

const createAudioClipId = () => (
  window.crypto?.randomUUID
    ? `audio-${window.crypto.randomUUID()}`
    : `audio-${Math.random().toString(36).slice(2)}`
);

const getAudioDurationMs = (file: File) => new Promise<number>((resolve) => {
  const url = URL.createObjectURL(file);
  const tempAudio = new Audio(url);
  tempAudio.preload = 'metadata';
  tempAudio.onloadedmetadata = () => {
    URL.revokeObjectURL(url);
    resolve(Math.max((tempAudio.duration || 10) * 1000, 500));
  };
  tempAudio.onerror = () => {
    URL.revokeObjectURL(url);
    resolve(10_000);
  };
});

const MIN_AUDIO_CLIP_MS = 500;
const SNAP_THRESHOLD_MS = 120;

const clampMs = (valueMs: number, minMs: number, maxMs: number) => (
  Math.min(Math.max(Math.round(valueMs), minMs), maxMs)
);

const secondsFromMs = (valueMs: number) => Number((valueMs / 1000).toFixed(2));

const effectiveClipDurationMs = (clip: TimelineAudioClip) => (
  Math.max(clip.durationMs - clip.trimStartMs - clip.trimEndMs, MIN_AUDIO_CLIP_MS)
);

const playbackClipDurationMs = (clip: TimelineAudioClip, timelineDurationMs: number) => (
  clip.trackType === 'bgmusic' && clip.loop
    ? Math.max(timelineDurationMs - clip.startTimeMs, effectiveClipDurationMs(clip))
    : effectiveClipDurationMs(clip)
);

const clipTimelineEndMs = (clip: TimelineAudioClip, timelineDurationMs: number) => (
  Math.min(clip.startTimeMs + playbackClipDurationMs(clip, timelineDurationMs), timelineDurationMs)
);

export const MultiTrackAudioPanel: React.FC<MultiTrackAudioPanelProps> = ({
  pixelsPerSecond,
  onOpenVoiceRecorder,
}) => {
  const store = useEditorStore();
  const timeline = store.timelineProject;
  const audioClips = timeline.audioClips || [];
  const ducking = timeline.audioDucking || { enabled: true, duckingAmount: 0.3 };

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showDuckingSettings, setShowDuckingSettings] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTrackTypeRef = useRef<AudioTrackType>('bgmusic');

  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    initialX: number;
    initialStartMs: number;
    initialTimelineEndMs: number;
    initialTrimStartMs: number;
    initialTrimEndMs: number;
    type: 'move' | 'trim-left' | 'trim-right';
  } | null>(null);

  const selectedClip = audioClips.find((c) => c.id === selectedClipId);

  const commitAudioEdit = () => {
    window.setTimeout(() => store.saveHistory(), 0);
  };

  const getSnapPointsMs = () => {
    const posterTrack = timeline.tracks.find((track) => track.type === 'poster');
    const scenePointsMs = (posterTrack?.clips || []).flatMap((clip) => [
      clip.startMs,
      clip.startMs + clip.durationMs,
    ]);
    return [0, timeline.currentTimeMs, timeline.durationMs, ...scenePointsMs]
      .filter((pointMs) => Number.isFinite(pointMs) && pointMs >= 0 && pointMs <= timeline.durationMs)
      .filter((pointMs, index, points) => points.indexOf(pointMs) === index);
  };

  const snapTimelineMs = (valueMs: number) => {
    const closestPointMs = getSnapPointsMs().reduce<number | null>((closest, pointMs) => {
      if (Math.abs(pointMs - valueMs) > SNAP_THRESHOLD_MS) return closest;
      if (closest === null) return pointMs;
      return Math.abs(pointMs - valueMs) < Math.abs(closest - valueMs) ? pointMs : closest;
    }, null);
    return closestPointMs ?? valueMs;
  };

  const getFitToVideoUpdates = (
    clip: TimelineAudioClip,
    autoFitToVideo = clip.autoFitToVideo === true,
  ): Partial<TimelineAudioClip> | null => {
    if (timeline.durationMs <= 0) return null;

    const startTimeMs = clampMs(
      clip.startTimeMs,
      0,
      Math.max(timeline.durationMs - MIN_AUDIO_CLIP_MS, 0),
    );
    const availableTimelineMs = Math.max(timeline.durationMs - startTimeMs, MIN_AUDIO_CLIP_MS);
    const sourceAvailableMs = Math.max(clip.durationMs - clip.trimStartMs, MIN_AUDIO_CLIP_MS);
    const shouldLoop = clip.loop || (clip.trackType === 'bgmusic' && sourceAvailableMs < availableTimelineMs);
    const fittedDurationMs = Math.min(availableTimelineMs, sourceAvailableMs);
    const trimEndMs = clampMs(
      clip.durationMs - clip.trimStartMs - fittedDurationMs,
      0,
      clip.durationMs - clip.trimStartMs - MIN_AUDIO_CLIP_MS,
    );

    return {
      startTimeMs,
      trimEndMs,
      loop: shouldLoop,
      autoFitToVideo,
    };
  };

  const fitClipToVideo = (clip: TimelineAudioClip, autoFitToVideo = clip.autoFitToVideo === true) => {
    const updates = getFitToVideoUpdates(clip, autoFitToVideo);
    if (!updates) return;
    store.updateAudioClip(clip.id, updates);
    commitAudioEdit();
  };

  React.useEffect(() => {
    audioClips.forEach((clip) => {
      if (clip.trackType !== 'bgmusic' || !clip.autoFitToVideo) return;
      const updates = getFitToVideoUpdates(clip, true);
      if (!updates) return;
      if (
        updates.startTimeMs !== clip.startTimeMs
        || updates.trimEndMs !== clip.trimEndMs
        || updates.loop !== clip.loop
      ) {
        store.updateAudioClip(clip.id, updates);
      }
    });
  }, [audioClips, timeline.durationMs]);

  const handleUploadClick = (trackType: AudioTrackType) => {
    uploadTrackTypeRef.current = trackType;
    uploadInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const trackType = uploadTrackTypeRef.current;
    const name = file.name.replace(/\.[^/.]+$/, '');

    try {
      const [durationMs, assetUrl] = await Promise.all([
        getAudioDurationMs(file),
        fileToDataUrl(file),
      ]);
      const playheadMs = trackType === 'bgmusic' ? 0 : timeline.currentTimeMs || 0;
      const newClip: TimelineAudioClip = {
        id: createAudioClipId(),
        name,
        assetUrl,
        trackType,
        startTimeMs: playheadMs,
        durationMs,
        trimStartMs: 0,
        trimEndMs: 0,
        volume: 1.0,
        muted: false,
        loop: false,
        autoFitToVideo: trackType === 'bgmusic',
      };
      const fitUpdates = trackType === 'bgmusic' ? getFitToVideoUpdates(newClip, true) : null;
      const fittedClip: TimelineAudioClip = { ...newClip, ...(fitUpdates || {}) };

      store.addAudioClip(fittedClip);
      setSelectedClipId(fittedClip.id);
    } catch (error) {
      console.error('[TECKSTUDIO] Audio upload failed:', error);
    }
  };

  // Dragging & Trimming Logic
  const handleMouseDown = (
    e: React.MouseEvent,
    clip: TimelineAudioClip,
    type: 'move' | 'trim-left' | 'trim-right',
  ) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    setDraggingClip({
      id: clip.id,
      initialX: e.clientX,
      initialStartMs: clip.startTimeMs,
      initialTimelineEndMs: clipTimelineEndMs(clip, timeline.durationMs),
      initialTrimStartMs: clip.trimStartMs,
      initialTrimEndMs: clip.trimEndMs,
      type,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingClip) return;
    const clip = audioClips.find((c) => c.id === draggingClip.id);
    if (!clip) return;

    const deltaPx = e.clientX - draggingClip.initialX;
    const deltaMs = (deltaPx / pixelsPerSecond) * 1000;

    if (draggingClip.type === 'move') {
      const maxStartMs = Math.max(timeline.durationMs - playbackClipDurationMs(clip, timeline.durationMs), 0);
      const nextStartMs = clampMs(snapTimelineMs(draggingClip.initialStartMs + deltaMs), 0, maxStartMs);
      store.updateAudioClip(clip.id, { startTimeMs: nextStartMs, autoFitToVideo: false });
    } else if (draggingClip.type === 'trim-left') {
      const nextTimelineStartMs = clampMs(
        snapTimelineMs(draggingClip.initialStartMs + deltaMs),
        0,
        Math.max(draggingClip.initialTimelineEndMs - MIN_AUDIO_CLIP_MS, 0),
      );
      const maxTrimStartMs = clip.durationMs - draggingClip.initialTrimEndMs - MIN_AUDIO_CLIP_MS;
      const nextTrimStartMs = clampMs(
        draggingClip.initialTrimStartMs + (nextTimelineStartMs - draggingClip.initialStartMs),
        0,
        maxTrimStartMs,
      );
      const nextVisibleDurationMs = clip.durationMs - nextTrimStartMs - draggingClip.initialTrimEndMs;
      const nextStartMs = clampMs(
        draggingClip.initialTimelineEndMs - nextVisibleDurationMs,
        0,
        Math.max(draggingClip.initialTimelineEndMs - MIN_AUDIO_CLIP_MS, 0),
      );
      store.updateAudioClip(clip.id, {
        startTimeMs: nextStartMs,
        trimStartMs: nextTrimStartMs,
        autoFitToVideo: false,
      });
    } else if (draggingClip.type === 'trim-right') {
      const nextTimelineEndMs = clampMs(
        snapTimelineMs(draggingClip.initialTimelineEndMs + deltaMs),
        clip.startTimeMs + MIN_AUDIO_CLIP_MS,
        timeline.durationMs,
      );
      const nextVisibleDurationMs = nextTimelineEndMs - clip.startTimeMs;
      const maxTrimEndMs = clip.durationMs - clip.trimStartMs - MIN_AUDIO_CLIP_MS;
      const nextTrimEndMs = clampMs(
        clip.durationMs - clip.trimStartMs - nextVisibleDurationMs,
        0,
        maxTrimEndMs,
      );
      store.updateAudioClip(clip.id, {
        trimEndMs: nextTrimEndMs,
        loop: false,
        autoFitToVideo: false,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingClip) commitAudioEdit();
    setDraggingClip(null);
  };

  const updateClipStartSeconds = (clip: TimelineAudioClip, seconds: number) => {
    store.updateAudioClip(clip.id, {
      startTimeMs: clampMs(seconds * 1000, 0, Math.max(timeline.durationMs - effectiveClipDurationMs(clip), 0)),
      autoFitToVideo: false,
    });
  };

  const updateTrimInSeconds = (clip: TimelineAudioClip, seconds: number) => {
    store.updateAudioClip(clip.id, {
      trimStartMs: clampMs(seconds * 1000, 0, clip.durationMs - clip.trimEndMs - MIN_AUDIO_CLIP_MS),
      autoFitToVideo: false,
    });
  };

  const updateTrimOutSeconds = (clip: TimelineAudioClip, seconds: number) => {
    const sourceEndMs = clampMs(seconds * 1000, clip.trimStartMs + MIN_AUDIO_CLIP_MS, clip.durationMs);
    store.updateAudioClip(clip.id, {
      trimEndMs: clip.durationMs - sourceEndMs,
      loop: false,
      autoFitToVideo: false,
    });
  };

  const updateFadeInSeconds = (clip: TimelineAudioClip, seconds: number) => {
    const maxFadeMs = Math.floor(effectiveClipDurationMs(clip) / 2);
    store.updateAudioClip(clip.id, {
      fadeInMs: clampMs(seconds * 1000, 0, maxFadeMs),
    });
  };

  const updateFadeOutSeconds = (clip: TimelineAudioClip, seconds: number) => {
    const maxFadeMs = Math.floor(effectiveClipDurationMs(clip) / 2);
    store.updateAudioClip(clip.id, {
      fadeOutMs: clampMs(seconds * 1000, 0, maxFadeMs),
    });
  };

  const resetTrim = (clip: TimelineAudioClip) => {
    store.updateAudioClip(clip.id, {
      trimStartMs: 0,
      trimEndMs: 0,
      loop: false,
      autoFitToVideo: false,
    });
    commitAudioEdit();
  };

  const renderTrackRow = (trackType: AudioTrackType) => {
    const config = TRACK_CONFIG[trackType];
    const clips = audioClips.filter((c) => c.trackType === trackType);

    return (
      <div
        key={trackType}
        className="relative flex h-10 border-t border-zinc-800/80 bg-zinc-950/40"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Track Header */}
        <div className="absolute left-0 top-0 z-10 flex h-full w-40 items-center gap-1.5 border-r border-zinc-800 bg-zinc-950 px-2.5">
          {config.icon}
          <span className="truncate text-[10px] font-semibold text-zinc-300">{config.label}</span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (trackType === 'voiceover') onOpenVoiceRecorder();
                else handleUploadClick(trackType);
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title={`Add ${config.label}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Clip Track Line */}
        <div className="relative ml-40 h-full flex-1 overflow-hidden">
          {clips.length === 0 ? (
            <div className="flex h-full items-center px-4 text-[9px] font-medium text-zinc-600">
              No {config.label.toLowerCase()} clips added
            </div>
          ) : (
            clips.map((clip) => {
              const effectiveDurationSec = effectiveClipDurationMs(clip) / 1000;
              const playbackDurationSec = playbackClipDurationMs(clip, timeline.durationMs) / 1000;
              const clipWidth = Math.max(playbackDurationSec * pixelsPerSecond, 40);
              const leftPx = (clip.startTimeMs / 1000) * pixelsPerSecond;
              const isSelected = clip.id === selectedClipId;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClipId(clip.id);
                  }}
                  onMouseDown={(e) => handleMouseDown(e, clip, 'move')}
                  className={`absolute top-1 flex h-8 cursor-grab select-none items-center overflow-hidden rounded-md border ${config.border} ${config.bg} ${
                    isSelected ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-black' : ''
                  }`}
                  style={{ left: leftPx, width: clipWidth }}
                >
                  {/* Left Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, clip, 'trim-left')}
                    className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-white/20 hover:bg-white/50"
                  />

                  {/* Waveform Visualization */}
                  <div className="flex h-full flex-1 items-center px-2">
                    <div className="flex h-5 w-full items-center gap-0.5 overflow-hidden">
                      {Array.from({ length: Math.max(Math.floor(clipWidth / 4), 1) }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full ${config.color}`}
                          style={{
                            height: `${25 + Math.sin(i * 0.8) * 35 + Math.cos(i * 1.5) * 25}%`,
                            opacity: clip.muted ? 0.3 : 1.0,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <span className={`mr-2 shrink-0 truncate text-[8px] font-bold ${config.text}`}>
                    {clip.name} ({effectiveDurationSec.toFixed(1)}s)
                  </span>

                  {/* Right Trim Handle */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, clip, 'trim-right')}
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-white/20 hover:bg-white/50"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      {/* Hidden File Input for Audio Upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/mpeg,audio/aac,audio/m4a,audio/ogg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Audio Quick Bar Actions */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Audio Tracks</span>
          <button
            type="button"
            onClick={onOpenVoiceRecorder}
            className="flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[9px] font-semibold text-violet-300 hover:bg-violet-500/20"
          >
            <Mic className="h-3 w-3 text-violet-400" />
            Record Voice
          </button>
          <button
            type="button"
            onClick={() => handleUploadClick('bgmusic')}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
          >
            <Music className="h-3 w-3 text-emerald-400" />
            Add Music
          </button>
          <button
            type="button"
            onClick={() => handleUploadClick('sfx')}
            className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[9px] font-semibold text-amber-300 hover:bg-amber-500/20"
          >
            <Zap className="h-3 w-3 text-amber-400" />
            Add Sound FX
          </button>
        </div>

        {/* Audio Ducking Control */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDuckingSettings(!showDuckingSettings)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-semibold transition-colors ${
              ducking.enabled
                ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500'
            }`}
          >
            <Radio className="h-3 w-3" />
            <span>Audio Ducking {ducking.enabled ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* Audio Ducking Drawer */}
      {showDuckingSettings && (
        <div className="flex items-center gap-4 border-b border-zinc-800/80 bg-indigo-950/20 px-4 py-2 text-xs text-zinc-300">
          <span className="text-[10px] font-semibold text-indigo-300">Background Music Auto-Ducking:</span>
          <label className="flex items-center gap-1.5 text-[10px]">
            <input
              type="checkbox"
              checked={ducking.enabled}
              onChange={(e) => store.setAudioDucking({ ...ducking, enabled: e.target.checked })}
              className="accent-indigo-500"
            />
            <span>Enable Ducking</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400">Reduce bg music to:</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={ducking.duckingAmount}
              onChange={(e) =>
                store.setAudioDucking({ ...ducking, duckingAmount: parseFloat(e.target.value) })
              }
              className="h-1 w-24 accent-indigo-500"
            />
            <span className="font-mono text-[10px] text-indigo-300">
              {Math.round(ducking.duckingAmount * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Render Audio Tracks */}
      {renderTrackRow('voiceover')}
      {renderTrackRow('bgmusic')}
      {renderTrackRow('sfx')}

      {/* Selected Clip Control Inspector */}
      {selectedClip && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-violet-300">{selectedClip.name}</span>
            <span className="text-[10px] text-zinc-400">
              Starts: {(selectedClip.startTimeMs / 1000).toFixed(2)}s | Timeline:{' '}
              {((clipTimelineEndMs(selectedClip, timeline.durationMs) - selectedClip.startTimeMs) / 1000).toFixed(2)}s
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Volume slider (0-200%) */}
            <div className="flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={selectedClip.volume}
                onChange={(e) => store.updateAudioClip(selectedClip.id, { volume: parseFloat(e.target.value) })}
                onMouseUp={commitAudioEdit}
                className="h-1 w-20 accent-violet-500"
              />
              <span className="w-8 font-mono text-[10px] text-zinc-400">
                {Math.round(selectedClip.volume * 100)}%
              </span>
            </div>

            {/* Mute */}
            <button
              type="button"
              onClick={() => {
                store.updateAudioClip(selectedClip.id, { muted: !selectedClip.muted });
                commitAudioEdit();
              }}
              className={`rounded p-1 ${selectedClip.muted ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-400 hover:text-white'}`}
              title={selectedClip.muted ? 'Unmute' : 'Mute'}
            >
              {selectedClip.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            {/* Split */}
            <button
              type="button"
              onClick={() => store.splitAudioClipAtPlayhead(selectedClip.id)}
              className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[9px] text-zinc-300 hover:text-white"
              title="Split clip at current playhead position"
            >
              <Scissors className="h-3 w-3" />
              Split
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => store.duplicateAudioClip(selectedClip.id)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Duplicate clip"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                store.deleteAudioClip(selectedClip.id);
                setSelectedClipId(null);
              }}
              className="rounded p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400"
              title="Delete clip"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="basis-full rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scissors className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  {selectedClip.trackType === 'bgmusic' ? 'Background Music Trim' : 'Audio Trim'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => resetTrim(selectedClip)}
                className="rounded border border-zinc-700 px-2 py-1 text-[9px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Reset Trim
              </button>
            </div>

            {selectedClip.trackType === 'bgmusic' && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => fitClipToVideo(selectedClip, false)}
                  className="rounded bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white hover:bg-emerald-400"
                >
                  Fit to Video
                </button>
                <label className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedClip.autoFitToVideo === true}
                    onChange={(event) => {
                      if (event.target.checked) {
                        fitClipToVideo(selectedClip, true);
                      } else {
                        store.updateAudioClip(selectedClip.id, { autoFitToVideo: false });
                        commitAudioEdit();
                      }
                    }}
                    className="accent-emerald-500"
                  />
                  <span>Auto Fit to Video</span>
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedClip.loop === true}
                    onChange={(event) => {
                      store.updateAudioClip(selectedClip.id, {
                        loop: event.target.checked,
                        autoFitToVideo: false,
                      });
                      commitAudioEdit();
                    }}
                    className="accent-emerald-500"
                  />
                  <span>Loop Music</span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-6 gap-3">
              <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                <span>Timeline Start</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={secondsFromMs(selectedClip.startTimeMs)}
                  onChange={(event) => updateClipStartSeconds(selectedClip, Number(event.target.value))}
                  onBlur={commitAudioEdit}
                  className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 font-mono text-[11px] text-zinc-100 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                <span>Trim In</span>
                <input
                  type="number"
                  min={0}
                  max={secondsFromMs(selectedClip.durationMs - selectedClip.trimEndMs - MIN_AUDIO_CLIP_MS)}
                  step={0.1}
                  value={secondsFromMs(selectedClip.trimStartMs)}
                  onChange={(event) => updateTrimInSeconds(selectedClip, Number(event.target.value))}
                  onBlur={commitAudioEdit}
                  className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 font-mono text-[11px] text-zinc-100 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                <span>Trim Out</span>
                <input
                  type="number"
                  min={secondsFromMs(selectedClip.trimStartMs + MIN_AUDIO_CLIP_MS)}
                  max={secondsFromMs(selectedClip.durationMs)}
                  step={0.1}
                  value={secondsFromMs(selectedClip.durationMs - selectedClip.trimEndMs)}
                  onChange={(event) => updateTrimOutSeconds(selectedClip, Number(event.target.value))}
                  onBlur={commitAudioEdit}
                  className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 font-mono text-[11px] text-zinc-100 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                <span>Fade In</span>
                <input
                  type="number"
                  min={0}
                  max={secondsFromMs(Math.floor(effectiveClipDurationMs(selectedClip) / 2))}
                  step={0.1}
                  value={secondsFromMs(selectedClip.fadeInMs || 0)}
                  onChange={(event) => updateFadeInSeconds(selectedClip, Number(event.target.value))}
                  onBlur={commitAudioEdit}
                  className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 font-mono text-[11px] text-zinc-100 outline-none focus:border-emerald-500"
                />
              </label>

              <label className="flex flex-col gap-1 text-[10px] text-zinc-400">
                <span>Fade Out</span>
                <input
                  type="number"
                  min={0}
                  max={secondsFromMs(Math.floor(effectiveClipDurationMs(selectedClip) / 2))}
                  step={0.1}
                  value={secondsFromMs(selectedClip.fadeOutMs || 0)}
                  onChange={(event) => updateFadeOutSeconds(selectedClip, Number(event.target.value))}
                  onBlur={commitAudioEdit}
                  className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 font-mono text-[11px] text-zinc-100 outline-none focus:border-emerald-500"
                />
              </label>

              <div className="flex flex-col gap-1 text-[10px] text-zinc-400">
                <span>Final Length</span>
                <div className="flex h-7 items-center rounded border border-zinc-800 bg-zinc-950 px-2 font-mono text-[11px] text-emerald-300">
                  {((clipTimelineEndMs(selectedClip, timeline.durationMs) - selectedClip.startTimeMs) / 1000).toFixed(2)}s
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
