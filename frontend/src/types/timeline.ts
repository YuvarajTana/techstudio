import { SUPPORTED_VIDEO_FPS, VIDEO_COMPOSITION } from '../config/design';

export type TimelinePlaybackState = 'playing' | 'paused' | 'seeking';
export type TimelineFps = 24 | 30 | 60;
export type TimelineTrackType = 'poster' | 'video' | 'audio';

export type SceneAnimationType =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pop'
  | 'rotate'
  | 'pulse';

export type TimelineTransitionType =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'wipe-left'
  | 'wipe-right';

export interface AnimationPreset {
  type: SceneAnimationType;
  durationMs: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'ease-out-back';
  delayMs?: number;
}

export type FabricObjectAnimationType =
  | 'none'
  | 'fade'
  | 'fade-in'
  | 'fade-out'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'slide-out'
  | 'slide-out-left'
  | 'slide-out-right'
  | 'slide-out-up'
  | 'slide-out-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'scale-out'
  | 'pan-left'
  | 'pan-right'
  | 'pop'
  | 'pop-in'
  | 'pulse'
  | 'glow-pulse'
  | 'rotate'
  | 'typewriter'
  | 'word-reveal'
  | 'line-reveal'
  | 'character-reveal'
  | 'bounce'
  | 'float'
  | 'wobble'
  | 'shake'
  | 'morph'
  | 'scale'
  | 'slide'
  | 'draw'
  | 'line-draw'
  | 'outline-draw'
  | 'arrow-draw-in'
  | 'connector-draw-in'
  | 'dash-flow'
  | 'progress-fill'
  | 'bar-grow'
  | 'chart-stagger'
  | 'traveling-dot'
  | 'dot-sequence'
  | 'indicator-travel'
  | 'stagger-reveal'
  | 'sequential-reveal'
  | 'marker-reveal'
  | 'value-reveal'
  | 'stagger'
  | 'terminal-type'
  | 'code-line-reveal'
  | 'sequential-card-reveal'
  | 'card-reveal'
  | 'card-stagger'
  | 'footer-reveal'
  | 'status-dot-pulse'
  | 'technical-pulse'
  | 'concentric-ring-pulse'
  | 'ring-draw'
  | 'ring-pulse'
  | 'orbit-dot'
  | 'blink'
  | 'cursor-blink'
  | 'ai-node-scale-in'
  | 'scale-in'
  | (string & {});

export interface FabricObjectAnimation {
  id?: string;
  objectId?: string;
  type: FabricObjectAnimationType;
  startMs?: number;
  durationMs: number;
  delayMs?: number;
  easing?: AnimationPreset['easing'];
  loop?: boolean;
  direction?: string;
  distance?: number;
  rotationAmount?: number;
  from?: Record<string, number>;
  to?: Record<string, number>;
  params?: Record<string, unknown>;
}

export interface FabricObjectAnimationConfig {
  format?: string;
  animationType?: FabricObjectAnimationType | string;
  durationMs?: number;
  duration?: number;
  delayMs?: number;
  delay?: number;
  startMs?: number;
  easing?: AnimationPreset['easing'];
  loop?: boolean;
  direction?: string;
  speed?: number;
  distance?: number;
  rotationAmount?: number;
  sourceAnimationId?: string;
  fullText?: string;
  params?: Record<string, unknown>;
}

export interface SceneAnimationConfig {
  enter?: AnimationPreset;
  hold?: AnimationPreset;
  exit?: AnimationPreset;
}

export interface EditorPage {
  id: string;
  name: string;
  data: string;
  thumbnail?: string;
  updatedAt?: string;
}

export interface TimelineClip {
  id: string;
  sceneId: string;
  pageId: string;
  projectId?: string;
  name: string;
  thumbnailUrl?: string;
  startMs: number;
  durationMs: number;
  animationPreset?: string;
  canvasSnapshot?: string;
  transition?: {
    type: TimelineTransitionType;
    durationMs: number;
  };
  trimStartMs?: number;
  trimEndMs?: number;
  animation?: SceneAnimationConfig;
  visible: boolean;
  locked: boolean;
}

export interface TimelineTrack {
  id: string;
  type: TimelineTrackType;
  clips: TimelineClip[];
}

export interface TimelineTransition {
  id: string;
  fromClipId: string;
  toClipId: string;
  type: TimelineTransitionType;
  durationMs: number;
}

export type AudioTrackType = 'voiceover' | 'bgmusic' | 'sfx';

export interface TimelineAudioTrack {
  id: string;
  assetUrl: string;
  startTime: number;
  endTime: number;
  trimStart: number;
  volume: number;
  muted: boolean;
}

export interface TimelineAudioClip {
  id: string;
  name: string;
  assetUrl: string;
  trackType: AudioTrackType;
  startTimeMs: number;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  volume: number; // 0.0 to 2.0 (0% to 200%)
  muted: boolean;
  solo?: boolean;
  locked?: boolean;
  fadeInMs?: number;
  fadeOutMs?: number;
  loop?: boolean;
  autoFitToVideo?: boolean;
}

export interface AudioDuckingConfig {
  enabled: boolean;
  duckingAmount: number; // 0.0 to 1.0 (e.g. 0.3 reduces bg music to 30% volume when voiceover plays)
}

export interface TimelineProject {
  version: 2;
  durationMs: number;
  currentTimeMs: number;
  fps: TimelineFps;
  zoom: number;
  collapsed: boolean;
  height: number;
  loopPreview: boolean;
  tracks: TimelineTrack[];
  transitions: TimelineTransition[];
  audio?: TimelineAudioTrack; // legacy single track support
  audioClips?: TimelineAudioClip[]; // multi-track audio clips
  audioDucking?: AudioDuckingConfig;
}

export const TECHNICAL_REEL_SCENE_ORDER = [
  {
    order: 1,
    key: 'llm-fundamentals',
    title: 'LLM FUNDAMENTALS',
    clipName: '01 — LLM FUNDAMENTALS',
    durationMs: 5000,
  },
  {
    order: 2,
    key: 'foundations-ai-engineering',
    title: 'FOUNDATIONS → AI ENGINEERING',
    clipName: '02 — FOUNDATIONS → AI ENGINEERING',
    durationMs: 3000,
  },
  {
    order: 3,
    key: 'before-you-touch-ai',
    title: 'BEFORE YOU TOUCH AI',
    clipName: '03 — BEFORE YOU TOUCH AI',
    durationMs: 2000,
  },
  {
    order: 4,
    key: 'backend-core',
    title: 'BACKEND CORE',
    clipName: '04 — BACKEND CORE',
    durationMs: 4000,
  },
  {
    order: 5,
    key: 'engineering-toolbelt',
    title: 'ENGINEERING TOOLBELT',
    clipName: '05 — ENGINEERING TOOLBELT',
    durationMs: 4000,
  },
] as const;

export type TechnicalReelSceneKey = typeof TECHNICAL_REEL_SCENE_ORDER[number]['key'];

export interface ResolvedTimelineScene {
  activeScene: TimelineClip | null;
  sceneIndex: number;
  sceneLocalTimeMs: number;
  projectTimeMs: number;
}

export const DEFAULT_SCENE_ANIMATION: SceneAnimationConfig = {
  enter: { type: 'none', durationMs: 600, easing: 'ease-out', delayMs: 0 },
  hold: { type: 'none', durationMs: 0, easing: 'linear', delayMs: 0 },
  exit: { type: 'none', durationMs: 600, easing: 'ease-in', delayMs: 0 },
};

export const createDefaultTimelineProject = (): TimelineProject => ({
  version: 2,
  durationMs: 0,
  currentTimeMs: 0,
  fps: VIDEO_COMPOSITION.fps,
  zoom: 1,
  collapsed: false,
  height: 230,
  loopPreview: false,
  tracks: [{ id: 'poster-track', type: 'poster', clips: [] }],
  transitions: [],
  audioClips: [],
  audioDucking: { enabled: true, duckingAmount: 0.3 },
});


const clampDuration = (durationMs: number) => (
  Math.min(Math.max(Math.round(durationMs || 0), 500), 120_000)
);

const normalizeAudioClip = (clip: TimelineAudioClip): TimelineAudioClip => {
  const durationMs = clampDuration(clip.durationMs);
  const trimStartMs = Math.min(Math.max(Math.round(clip.trimStartMs || 0), 0), durationMs - 500);
  const trimEndMs = Math.min(
    Math.max(Math.round(clip.trimEndMs || 0), 0),
    durationMs - trimStartMs - 500,
  );
  return {
    ...clip,
    startTimeMs: Math.max(Math.round(clip.startTimeMs || 0), 0),
    durationMs,
    trimStartMs,
    trimEndMs,
    volume: Math.min(Math.max(Number(clip.volume) || 1, 0), 2),
    muted: clip.muted === true,
    loop: clip.loop === true,
    autoFitToVideo: clip.autoFitToVideo === true,
  };
};

export const getPosterTrack = (timeline: TimelineProject) => (
  timeline.tracks.find((track) => track.type === 'poster')
  || { id: 'poster-track', type: 'poster' as const, clips: [] }
);

export const technicalReelDurationForOrder = (index: number) => (
  TECHNICAL_REEL_SCENE_ORDER[index]?.durationMs
  ?? TECHNICAL_REEL_SCENE_ORDER[TECHNICAL_REEL_SCENE_ORDER.length - 1].durationMs
);

export const technicalReelSceneKeyFromName = (name: string): TechnicalReelSceneKey | null => {
  const normalized = name.toLowerCase().replace(/\s+/g, ' ');
  const scene = TECHNICAL_REEL_SCENE_ORDER.find((candidate) => (
    normalized.includes(candidate.title.toLowerCase())
    || normalized.includes(candidate.clipName.toLowerCase())
  ));
  return scene?.key || null;
};

export const resolveSceneAtTime = (
  timeline: TimelineProject,
  timeMs: number,
): ResolvedTimelineScene => {
  const clips = getPosterTrack(timeline).clips.filter((clip) => clip.visible);
  if (clips.length === 0) {
    return {
      activeScene: null,
      sceneIndex: -1,
      sceneLocalTimeMs: 0,
      projectTimeMs: 0,
    };
  }

  const durationMs = Math.max(timeline.durationMs, clips[clips.length - 1].startMs + clips[clips.length - 1].durationMs);
  const projectTimeMs = Math.min(Math.max(Number(timeMs) || 0, 0), durationMs);
  const effectiveTimeMs = projectTimeMs >= durationMs
    ? Math.max(durationMs - 0.001, 0)
    : projectTimeMs;
  const sceneIndex = clips.findIndex((clip) => (
    effectiveTimeMs >= clip.startMs
    && effectiveTimeMs < clip.startMs + clip.durationMs
  ));
  const resolvedIndex = sceneIndex >= 0 ? sceneIndex : clips.length - 1;
  const activeScene = clips[resolvedIndex] || null;

  return {
    activeScene,
    sceneIndex: activeScene ? resolvedIndex : -1,
    sceneLocalTimeMs: activeScene
      ? Math.min(Math.max(effectiveTimeMs - activeScene.startMs, 0), activeScene.durationMs)
      : 0,
    projectTimeMs,
  };
};

export const normalizeTimelineFps = (fps?: number | null): TimelineFps => (
  SUPPORTED_VIDEO_FPS.includes(fps as TimelineFps)
    ? fps as TimelineFps
    : VIDEO_COMPOSITION.fps
);

export const normalizeTimelineProject = (timeline?: Partial<TimelineProject> | null): TimelineProject => {
  const fallback = createDefaultTimelineProject();
  const tracks = Array.isArray(timeline?.tracks) ? timeline.tracks : fallback.tracks;
  const posterTrack = tracks.find((track) => track.type === 'poster') || fallback.tracks[0];
  const transitions = Array.isArray(timeline?.transitions) ? timeline.transitions : [];
  const audioClips = Array.isArray(timeline?.audioClips)
    ? timeline.audioClips.map(normalizeAudioClip)
    : (fallback.audioClips || []);
  let cursorMs = 0;
  const clips = posterTrack.clips.map((clip) => {
    const durationMs = clampDuration(clip.durationMs);
    const normalizedClip: TimelineClip = {
      ...clip,
      startMs: cursorMs,
      durationMs,
      visible: clip.visible !== false,
      locked: clip.locked === true,
      animation: clip.animation || DEFAULT_SCENE_ANIMATION,
    };
    cursorMs += durationMs;
    return normalizedClip;
  });
  const normalizedTracks = [
    { ...posterTrack, clips },
    ...tracks.filter((track) => track.type !== 'poster'),
  ];
  const durationMs = cursorMs;
  return {
    ...fallback,
    ...timeline,
    version: 2,
    fps: normalizeTimelineFps(timeline?.fps),
    zoom: Math.min(Math.max(Number(timeline?.zoom) || 1, 0.25), 4),
    height: Math.min(Math.max(Number(timeline?.height) || 210, 120), 480),
    durationMs,
    currentTimeMs: Math.min(Math.max(Number(timeline?.currentTimeMs) || 0, 0), durationMs),
    tracks: normalizedTracks,
    transitions,
    audioClips,
    audioDucking: timeline?.audioDucking || fallback.audioDucking,
  };
};

export type TimelineAnimatableProperty =
  | 'left'
  | 'top'
  | 'scaleX'
  | 'scaleY'
  | 'angle'
  | 'opacity'
  | 'visible';

export interface TimelineKeyframe {
  id?: string;
  time: number;
  property: TimelineAnimatableProperty;
  value: number | boolean;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'hold';
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string;
  threshold: number;
  smoothing: number;
}

export interface TimelineObjectTrack {
  objectId: string;
  name: string;
  objectType: string;
  startTime: number;
  endTime: number;
  keyframes: TimelineKeyframe[];
}

export interface TimelineVideoTrack extends TimelineObjectTrack {
  assetUrl: string;
  posterUrl?: string;
  mimeType?: string;
  trimStart: number;
  trimEnd: number;
  loop: boolean;
  muted: boolean;
  chromaKey?: ChromaKeyConfig;
  segmentationMaskUrl?: string;
}

export interface TeckStudioTimelineSchema {
  schema: 'TeckStudioTimelineSchema';
  version: 2;
  generatedAt: string;
  timeline: TimelineProject;
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  pages: EditorPage[];
  fabricState: Record<string, unknown>;
  objectTracks: TimelineObjectTrack[];
  videoTracks: TimelineVideoTrack[];
  audioTracks: TimelineAudioTrack[];
}

export interface DynamicMediaAssetPayload {
  id?: string;
  type: 'video' | 'image' | 'text';
  sourceUrl?: string;
  posterUrl?: string;
  mimeType?: string;
  name?: string;
  text?: string;
  duration?: number;
  startTime?: number;
  endTime?: number;
  trimStart?: number;
  trimEnd?: number;
  loop?: boolean;
  muted?: boolean;
  width?: number;
  height?: number;
  keyframes?: TimelineKeyframe[];
  chromaKey?: ChromaKeyConfig;
  segmentationMaskUrl?: string;
}
