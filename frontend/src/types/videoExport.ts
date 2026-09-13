import type { TimelineFps, TimelineProject } from './timeline';

export type VideoExportFormat = 'mp4' | 'webm';
export type VideoExportQuality = 'draft' | 'standard' | 'high';

export interface VideoExportSettings {
  format: VideoExportFormat;
  width: number;
  height: number;
  fps: TimelineFps;
  quality: VideoExportQuality;
  includeAudio: boolean;
}

export interface VideoExportAudioFile {
  clipId: string;
  fileName: string;
  blob: Blob;
}

export interface VideoRenderCreateResponse {
  job_id: string;
  status: 'queued';
}

export interface VideoRenderStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  error?: string;
  file_name?: string;
  download_url?: string;
  duration_ms?: number;
  width?: number;
  height?: number;
  fps?: number;
  total_frames?: number;
  rendered_frames?: number;
}

export interface VideoRenderPayload {
  projectId: string;
  settings: VideoExportSettings;
  timeline: TimelineProject;
  totalFrames: number;
  audioFiles?: VideoExportAudioFile[];
}
