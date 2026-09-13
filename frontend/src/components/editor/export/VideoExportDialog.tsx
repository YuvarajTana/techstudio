import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Minimize2,
  RotateCcw,
  X,
} from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';
import { getPosterTrack } from '../../../types/timeline';
import type { TimelineAudioClip, TimelineFps, TimelineProject } from '../../../types/timeline';
import type {
  VideoExportAudioFile,
  VideoExportFormat,
  VideoExportQuality,
} from '../../../types/videoExport';
import {
  cancelVideoRenderJob,
  createVideoRenderJob,
  downloadRenderedVideo,
  finalizeVideoRenderJob,
  getVideoRenderStatus,
  uploadVideoRenderFrames,
} from '../../../services/videoExportService';
import { API_BASE_URL, apiUrl, getAuthToken } from '../../../services/apiClient';
import type { VideoRenderStatus } from '../../../types/videoExport';
import {
  canvasToPngBlob,
  PosterSceneRenderer,
} from '../../../utils/sceneTimelineRenderer';
import { frameTimestampMs } from '../../../utils/animationEvaluator';
import { SUPPORTED_VIDEO_FPS, VIDEO_COMPOSITION } from '../../../config/design';

interface VideoExportDialogProps {
  isOpen: boolean;
  initialFormat: VideoExportFormat;
  onClose: () => void;
}

const qualityBitrate = {
  draft: 2,
  standard: 5,
  high: 10,
} satisfies Record<VideoExportQuality, number>;

const AUDIO_TRACK_LABELS = {
  bgmusic: 'Background Music',
  voiceover: 'Voice-over',
  sfx: 'Sound Effects',
} satisfies Record<TimelineAudioClip['trackType'], string>;

const REEL_VIDEO_COMPOSITION = {
  width: 1080,
  height: 1920,
} as const;

type ExportResolution = 'reel' | 'canvas';

const audioFileExtension = (clip: TimelineAudioClip, blob: Blob) => {
  const nameExtension = clip.name.match(/\.(aac|m4a|mp3|ogg|wav|webm)$/i)?.[0].toLowerCase();
  if (nameExtension) return nameExtension;
  if (blob.type.includes('mpeg')) return '.mp3';
  if (blob.type.includes('mp4')) return '.m4a';
  if (blob.type.includes('aac')) return '.aac';
  if (blob.type.includes('ogg')) return '.ogg';
  if (blob.type.includes('wav')) return '.wav';
  if (blob.type.includes('webm')) return '.webm';
  return '.audio';
};

const activeAudioClipsForExport = (timeline: TimelineProject) => (
  (timeline.audioClips || []).filter((clip) => !clip.muted && Boolean(clip.assetUrl))
);

const BACKEND_AUDIO_PATH_PREFIXES = ['/media/'];

const shouldResolveThroughBackend = (assetUrl: string) => {
  if (BACKEND_AUDIO_PATH_PREFIXES.some((prefix) => assetUrl.startsWith(prefix))) return true;
  try {
    const asset = new URL(assetUrl, window.location.href);
    const frontendOrigin = window.location.origin;
    const backendOrigin = new URL(API_BASE_URL).origin;
    return (
      BACKEND_AUDIO_PATH_PREFIXES.some((prefix) => asset.pathname.startsWith(prefix))
      && (asset.origin === frontendOrigin || asset.origin === backendOrigin)
    );
  } catch {
    return false;
  }
};

const resolveExportAudioUrl = (assetUrl: string) => {
  if (assetUrl.startsWith('data:') || assetUrl.startsWith('blob:')) return assetUrl;
  if (shouldResolveThroughBackend(assetUrl)) {
    const parsed = new URL(assetUrl, window.location.href);
    return apiUrl(`${parsed.pathname}${parsed.search}`);
  }
  if (assetUrl.startsWith('http://') || assetUrl.startsWith('https://')) return assetUrl;
  return apiUrl(assetUrl.startsWith('/') ? assetUrl : `/${assetUrl}`);
};

const fetchAudioBlobForExport = async (clip: TimelineAudioClip) => {
  const resolvedUrl = resolveExportAudioUrl(clip.assetUrl);
  const headers = new Headers();
  const token = getAuthToken();
  let usesBackend: boolean;
  try {
    usesBackend = new URL(resolvedUrl, window.location.href).origin === new URL(API_BASE_URL).origin;
  } catch {
    usesBackend = false;
  }
  if (token && usesBackend) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(resolvedUrl, {
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    throw new Error(`${AUDIO_TRACK_LABELS[clip.trackType]} source is unavailable for export (${response.status}).`);
  }
  const blob = await response.blob();
  const contentType = response.headers.get('content-type') || blob.type || '';
  const hasAudioType = contentType.startsWith('audio/') || contentType === 'application/octet-stream';
  if (!blob.size) {
    throw new Error(`${AUDIO_TRACK_LABELS[clip.trackType]} source is empty.`);
  }
  if (!hasAudioType) {
    throw new Error(`${AUDIO_TRACK_LABELS[clip.trackType]} source is not an audio file (${contentType || 'unknown type'}).`);
  }
  return blob;
};

const audioSummaryForTimeline = (timeline: TimelineProject) => {
  const labels = Array.from(new Set(
    activeAudioClipsForExport(timeline).map((clip) => AUDIO_TRACK_LABELS[clip.trackType]),
  ));
  return labels.length ? labels.join(' + ') : 'None';
};

const prepareTimelineForExport = async (
  timeline: TimelineProject,
): Promise<{ timeline: TimelineProject; audioFiles: VideoExportAudioFile[] }> => {
  const exportTimeline = JSON.parse(JSON.stringify(timeline)) as TimelineProject;
  const audioFiles: VideoExportAudioFile[] = [];

  for (const clip of exportTimeline.audioClips || []) {
    if (clip.muted || !clip.assetUrl) continue;

    const blob = await fetchAudioBlobForExport(clip);
    const fileName = `audio-${clip.id}${audioFileExtension(clip, blob)}`;
    audioFiles.push({ clipId: clip.id, fileName, blob });
    clip.assetUrl = `uploaded-audio://${clip.id}`;
  }

  return { timeline: exportTimeline, audioFiles };
};

export const VideoExportDialog: React.FC<VideoExportDialogProps> = ({
  isOpen,
  initialFormat,
  onClose,
}) => {
  const store = useEditorStore();
  const setTimelineRecording = store.setTimelineRecording;
  const clips = getPosterTrack(store.timelineProject).clips.filter((clip) => clip.visible);
  const [format, setFormat] = useState<VideoExportFormat>(initialFormat);
  const [resolution, setResolution] = useState<ExportResolution>('reel');
  const width = resolution === 'reel' ? REEL_VIDEO_COMPOSITION.width : VIDEO_COMPOSITION.width;
  const height = resolution === 'reel' ? REEL_VIDEO_COMPOSITION.height : VIDEO_COMPOSITION.height;
  const fps = store.timelineProject.fps;
  const [quality, setQuality] = useState<VideoExportQuality>('high');
  const [status, setStatus] = useState<VideoRenderStatus | null>(null);
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const pollTimerRef = useRef<number | null>(null);
  const renderAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    renderAbortRef.current?.abort();
  }, []);

  const estimatedMb = useMemo(() => (
    Math.max((store.timelineProject.durationMs / 1000) * qualityBitrate[quality] / 8, 0)
  ), [quality, store.timelineProject.durationMs]);
  const estimatedFrames = useMemo(() => (
    Math.max(Math.ceil((store.timelineProject.durationMs / 1000) * fps), store.timelineProject.durationMs > 0 ? 1 : 0)
  ), [fps, store.timelineProject.durationMs]);
  const audioSummary = useMemo(
    () => audioSummaryForTimeline(store.timelineProject),
    [store.timelineProject],
  );

  const poll = async (jobId: string) => {
    try {
      const nextStatus = await getVideoRenderStatus(jobId);
      setStatus(nextStatus);
      if (nextStatus.status === 'queued' || nextStatus.status === 'processing') {
        pollTimerRef.current = window.setTimeout(() => void poll(jobId), 800);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to read render progress.');
    }
  };

  const exportVideo = async () => {
    if (!store.projectId || store.projectId.startsWith('local_')) {
      setError('Save this design to your TECKSTUDIO account before server video export.');
      return;
    }
    if (clips.length === 0) {
      setError('Add at least one visible poster page to the timeline.');
      return;
    }
    setError('');
    setStatus(null);
    setPreparing(true);
    store.setTimelineRecording(true);
    let renderer: PosterSceneRenderer | null = null;
    let renderJobId: string | null = null;
    try {
      // ─────────────────────────────────────────────────────────────────────
      // CRITICAL FIX: syncAllPages() serializes EVERY page's canvas data,
      // not just the currently active page. Without this, page.data is empty
      // for pages the user hasn't visited in this session, causing
      // prepareFabricScene() to throw and silently skip those clips.
      // ─────────────────────────────────────────────────────────────────────
      setStatus((current) => current ? current : {
        job_id: '',
        status: 'queued',
        progress: 1,
        stage: 'Preparing poster pages',
        total_frames: 0,
        rendered_frames: 0,
      });
      const pages = await store.syncAllPages();
      const timeline = store.timelineProject;
      const missingPages: string[] = [];
      for (const clip of clips) {
        const page = pages.find((candidate) => candidate.id === clip.pageId);
        if (!page) {
          missingPages.push(`"${clip.name}" references a missing page`);
        } else if (!page.data) {
          missingPages.push(`"${clip.name}" (${page.name}) has no canvas data — open this page in the editor and make a change to save it`);
        }
      }
      if (missingPages.length > 0) {
        throw new Error(`Cannot export: ${missingPages[0]}.`);
      }
      setStatus((current) => current ? {
        ...current,
        progress: 2,
        stage: 'Preparing audio tracks',
      } : current);
      const activeAudioClips = activeAudioClipsForExport(timeline);
      const {
        timeline: exportTimeline,
        audioFiles,
      } = await prepareTimelineForExport(timeline);
      const totalFrames = Math.max(
        Math.ceil((exportTimeline.durationMs / 1000) * fps),
        1,
      );
      console.info('[EXPORT FPS]', {
        fps,
        durationMs: exportTimeline.durationMs,
        totalFrames,
      });
      const response = await createVideoRenderJob({
        projectId: store.projectId,
        settings: {
          format,
          width,
          height,
          fps,
          quality,
          includeAudio: activeAudioClips.length > 0,
        },
        timeline: exportTimeline,
        totalFrames,
        audioFiles,
      });
      renderJobId = response.job_id;
      setStatus({
        job_id: response.job_id,
        status: response.status,
        progress: 1,
        stage: 'Preparing poster pages',
        total_frames: totalFrames,
        rendered_frames: 0,
      });
      const abortController = new AbortController();
      renderAbortRef.current = abortController;
      const outputCanvas = document.createElement('canvas');
      renderer = new PosterSceneRenderer(outputCanvas, () => ({
        pages,
        timeline: exportTimeline,
        width,
        height,
      }));
      setStatus((current) => current ? {
        ...current,
        progress: 3,
        stage: 'Rendering poster pages',
      } : current);
      await renderer.prepare();

      const batchSize = 3;
      let frameBatch: Blob[] = [];
      let batchStartIndex = 0;
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        if (abortController.signal.aborted) throw new DOMException('Video export cancelled.', 'AbortError');
        const timestampMs = Math.min(
          frameTimestampMs(frameIndex, fps),
          Math.max(exportTimeline.durationMs - 0.001, 0),
        );
        renderer.render(timestampMs);
        frameBatch.push(await canvasToPngBlob(outputCanvas));
        const isLastFrame = frameIndex === totalFrames - 1;
        if (frameBatch.length === batchSize || isLastFrame) {
          const uploadedStatus = await uploadVideoRenderFrames(
            response.job_id,
            batchStartIndex,
            frameBatch,
            abortController.signal,
          );
          setStatus(uploadedStatus);
          batchStartIndex = frameIndex + 1;
          frameBatch = [];
          await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        }
      }
      setStatus((current) => current ? {
        ...current,
        progress: Math.max(current.progress, 70),
        stage: activeAudioClips.length > 0 ? 'Preparing background music' : 'Finalizing MP4',
      } : current);
      const encodingStatus = await finalizeVideoRenderJob(response.job_id);
      setStatus(encodingStatus);
      void poll(response.job_id);
    } catch (caughtError) {
      const wasCancelled = renderAbortRef.current?.signal.aborted === true;
      if (wasCancelled) {
        setStatus((current) => current ? { ...current, status: 'cancelled', stage: 'Render cancelled' } : current);
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Video export failed.');
        if (renderJobId) void cancelVideoRenderJob(renderJobId).catch(() => undefined);
      }
      store.setTimelineRecording(false);
    } finally {
      renderer?.dispose();
      renderAbortRef.current = null;
      setPreparing(false);
    }
  };

  useEffect(() => {
    if (status && ['completed', 'failed', 'cancelled'].includes(status.status)) {
      setTimelineRecording(false);
    }
  }, [setTimelineRecording, status]);

  const cancel = async () => {
    if (!status?.job_id) return;
    renderAbortRef.current?.abort();
    try {
      await cancelVideoRenderJob(status.job_id);
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
      setStatus({ ...status, status: 'cancelled', stage: 'Render cancelled' });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to cancel render.');
    }
  };

  if (!isOpen) return null;
  if (minimized) {
    return (
      <button type="button" onClick={() => setMinimized(false)} className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-xl border border-violet-500/30 bg-[#111119] px-4 py-3 text-xs font-bold text-violet-200 shadow-2xl">
        {status?.status === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
        Video export {status?.progress || 0}%
      </button>
    );
  }

  const busy = preparing || status?.status === 'queued' || status?.status === 'processing';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-violet-500/30 bg-[#111119] shadow-2xl">
        <header className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="rounded-xl bg-violet-500/15 p-2 text-violet-300"><Film className="h-5 w-5" /></div>
          <div className="flex-1">
            <h2 className="text-sm font-bold">Export Timeline Video</h2>
            <p className="text-[10px] text-zinc-500">{clips.length} poster scenes · {(store.timelineProject.durationMs / 1000).toFixed(1)} seconds</p>
          </div>
          {busy && <button type="button" onClick={() => setMinimized(true)} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800" title="Minimize"><Minimize2 className="h-4 w-4" /></button>}
          {!busy && <button type="button" onClick={onClose} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800" title="Close"><X className="h-4 w-4" /></button>}
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="text-[10px] text-zinc-500">Format
            <select value={format} onChange={(event) => setFormat(event.target.value as VideoExportFormat)} disabled={busy} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
              <option value="mp4">MP4 · H.264</option>
              <option value="webm">WebM · VP9</option>
            </select>
          </label>
          <label className="text-[10px] text-zinc-500">Resolution
            <select
              value={resolution}
              onChange={(event) => setResolution(event.target.value as ExportResolution)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
            >
              <option value="reel">Vertical Reel · {REEL_VIDEO_COMPOSITION.width} × {REEL_VIDEO_COMPOSITION.height}</option>
              <option value="canvas">Canvas 4:5 · {VIDEO_COMPOSITION.width} × {VIDEO_COMPOSITION.height}</option>
            </select>
          </label>
          <label className="text-[10px] text-zinc-500">Frame rate
            <select
              value={fps}
              onChange={(event) => store.setTimelineFps(Number(event.target.value) as TimelineFps)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
            >
              {SUPPORTED_VIDEO_FPS.map((optionFps) => (
                <option key={optionFps} value={optionFps}>{optionFps} FPS</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-zinc-500">Quality
            <select value={quality} onChange={(event) => setQuality(event.target.value as VideoExportQuality)} disabled={busy} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
              <option value="draft">Draft</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="mx-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[10px] text-zinc-500">
          <div className="flex justify-between"><span>Estimated output</span><span className="text-zinc-300">≈ {estimatedMb.toFixed(1)} MB</span></div>
          <div className="mt-1 flex justify-between"><span>Timeline frames</span><span className="font-mono text-zinc-300">{estimatedFrames} @ {fps} FPS</span></div>
          <div className="mt-1 flex justify-between">
            <span>Audio</span>
            <span className={audioSummary === 'None' ? 'text-zinc-500' : 'text-emerald-300'}>{audioSummary}</span>
          </div>
        </div>

        {(busy || status) && (
          <div className="mx-5 mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-violet-200">{status?.stage || 'Preparing deterministic frames'}</span>
              <span className="font-mono text-zinc-400">{`${status?.progress || 0}%`}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width]" style={{ width: `${status?.progress || 0}%` }} />
            </div>
            {status?.total_frames ? <div className="mt-1 text-right font-mono text-[8px] text-zinc-600">{status.rendered_frames || 0} / {status.total_frames} frames</div> : null}
          </div>
        )}

        {error && <div className="mx-5 mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[10px] text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
        {!error && status?.error && <div className="mx-5 mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[10px] text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{status.error}</div>}
        {status?.status === 'completed' && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[10px] text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Video rendered successfully.
          </div>
        )}

        <footer className="mt-5 flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          {busy ? (
            <button type="button" onClick={() => void cancel()} disabled={!status?.job_id} className="rounded-lg border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-300 disabled:opacity-40">Cancel Render</button>
          ) : status?.status === 'completed' && status.download_url && status.file_name ? (
            <>
              <button type="button" onClick={() => { setStatus(null); setError(''); }} className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300"><RotateCcw className="h-3.5 w-3.5" />New Export</button>
              <button type="button" onClick={() => void downloadRenderedVideo(status.download_url as string, status.file_name as string)} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" />Download Video</button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300">Cancel</button>
              <button type="button" onClick={() => void exportVideo()} disabled={clips.length === 0} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"><Film className="h-3.5 w-3.5" />Export Video</button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};
