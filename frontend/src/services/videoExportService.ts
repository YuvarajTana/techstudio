import { apiFetch } from './apiClient';
import type {
  VideoRenderCreateResponse,
  VideoRenderPayload,
  VideoRenderStatus,
} from '../types/videoExport';

const responseError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.detail || payload?.error || fallback);
};

const sleep = (durationMs: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, durationMs);
});

const isAbortError = (error: unknown) => (
  error instanceof DOMException && error.name === 'AbortError'
);

const isNetworkFetchError = (error: unknown) => (
  error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message)
);

const readRenderStatus = async (jobId: string): Promise<VideoRenderStatus> => {
  const response = await apiFetch(`/api/video/render/${jobId}`, { timeoutMs: 30_000 });
  if (!response.ok) throw await responseError(response, 'Unable to read video render progress.');
  return response.json();
};

export const createVideoRenderJob = async ({
  projectId,
  settings,
  timeline,
  totalFrames,
  audioFiles = [],
}: VideoRenderPayload): Promise<VideoRenderCreateResponse> => {
  const formData = new FormData();
  formData.append('project_id', projectId);
  formData.append('format', settings.format);
  formData.append('width', String(settings.width));
  formData.append('height', String(settings.height));
  formData.append('fps', String(settings.fps));
  formData.append('quality', settings.quality);
  formData.append('include_audio', String(settings.includeAudio));
  formData.append(
    'timeline_file',
    new Blob([JSON.stringify(timeline)], { type: 'application/json' }),
    'timeline.json',
  );
  formData.append('total_frames', String(totalFrames));
  formData.append('audio_file_ids', JSON.stringify(audioFiles.map((file) => file.clipId)));
  console.info('[EXPORT FPS]', {
    fps: settings.fps,
    totalFrames,
    timelineFps: timeline.fps,
    durationMs: timeline.durationMs,
  });
  audioFiles.forEach((file) => {
    formData.append('audio_files', file.blob, file.fileName);
  });
  for (const [key, value] of formData.entries()) {
    console.info(
      '[EXPORT FORM]',
      key,
      value instanceof File
        ? { name: value.name, size: value.size, type: value.type }
        : value,
    );
  }
  const response = await apiFetch('/api/video/render/frames', {
    method: 'POST',
    body: formData,
    timeoutMs: 120_000,
  });
  if (!response.ok) {
    const error = await responseError(response, 'Unable to create the video render job.');
    if (error.message.includes('Part exceeded maximum size')) {
      throw new Error('Export payload exceeded the server multipart text-field limit. Large media must be uploaded as files, not embedded in timeline JSON.');
    }
    throw error;
  }
  return response.json();
};

export const uploadVideoRenderFrames = async (
  jobId: string,
  startIndex: number,
  frames: Blob[],
  signal?: AbortSignal,
): Promise<VideoRenderStatus> => {
  const expectedRenderedFrames = startIndex + frames.length;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Video export cancelled.', 'AbortError');
    const formData = new FormData();
    formData.append('start_index', String(startIndex));
    frames.forEach((frame, index) => {
      formData.append(
        'frames',
        frame,
        `frame-${String(startIndex + index).padStart(6, '0')}.png`,
      );
    });

    try {
      const response = await apiFetch(`/api/video/render/${jobId}/frames`, {
        method: 'POST',
        body: formData,
        signal,
        timeoutMs: 180_000,
      });
      if (response.ok) return response.json();

      const error = await responseError(response, 'Unable to upload rendered animation frames.');
      if (response.status === 409) {
        const status = await readRenderStatus(jobId);
        if ((status.rendered_frames || 0) >= expectedRenderedFrames) return status;
      }
      throw error;
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw error;
      const status = await readRenderStatus(jobId).catch(() => null);
      if ((status?.rendered_frames || 0) >= expectedRenderedFrames) return status as VideoRenderStatus;
      if (!isNetworkFetchError(error) || attempt === maxAttempts) {
        throw error instanceof Error
          ? new Error(`Frame upload failed at ${startIndex}/${expectedRenderedFrames}: ${error.message}`, { cause: error })
          : new Error(`Frame upload failed at ${startIndex}/${expectedRenderedFrames}.`);
      }
      console.warn('[EXPORT] retrying frame upload after network failure', {
        jobId,
        startIndex,
        frameCount: frames.length,
        attempt,
      });
      await sleep(500 * attempt);
    }
  }

  throw new Error(`Frame upload failed at ${startIndex}/${expectedRenderedFrames}.`);
};

export const finalizeVideoRenderJob = async (
  jobId: string,
): Promise<VideoRenderStatus> => {
  const response = await apiFetch(`/api/video/render/${jobId}/finalize`, {
    method: 'POST',
    timeoutMs: 30_000,
  });
  if (!response.ok) throw await responseError(response, 'Unable to start video encoding.');
  return response.json();
};

export const getVideoRenderStatus = async (jobId: string): Promise<VideoRenderStatus> => {
  return readRenderStatus(jobId);
};

export const cancelVideoRenderJob = async (jobId: string) => {
  const response = await apiFetch(`/api/video/render/${jobId}`, { method: 'DELETE' });
  if (!response.ok) throw await responseError(response, 'Unable to cancel the video render job.');
};

export const downloadRenderedVideo = async (downloadUrl: string, fileName: string) => {
  const response = await apiFetch(downloadUrl, { timeoutMs: 120_000 });
  if (!response.ok) throw await responseError(response, 'Rendered video download failed.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
