import { fabric } from 'fabric';
import { useEditorStore } from '../store/useEditorStore';
import type {
  TeckStudioTimelineSchema,
  TimelineKeyframe,
  TimelineObjectTrack,
} from '../types/timeline';
import { CUSTOM_FABRIC_PROPERTIES } from './editorElementFactory';
import { masterTimelineManager } from './masterTimelineManager';
import { removeStrayConnectorMarkers } from './posterLayoutTools';

const objectValue = (object: fabric.Object, key: string) => (
  object.get(key as keyof fabric.Object) as unknown
);

const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getObjectId = (object: fabric.Object, index: number) => String(
  objectValue(object, 'id') || `object-${index + 1}`,
);

export const createTeckStudioTimelineSchema = (
  canvas: fabric.Canvas,
): TeckStudioTimelineSchema => {
  removeStrayConnectorMarkers(canvas);
  const state = useEditorStore.getState();
  const videoObjectIds = new Set(masterTimelineManager.getVideoTracks().map((track) => track.objectId));
  const objectTracks: TimelineObjectTrack[] = canvas.getObjects()
    .map((object, index) => {
      const objectId = getObjectId(object, index);
      return {
        objectId,
        name: String(objectValue(object, 'name') || `Layer ${index + 1}`),
        objectType: String(objectValue(object, 'objectType') || object.type || 'object'),
        startTime: numberValue(objectValue(object, 'timelineStart'), 0),
        endTime: numberValue(
          objectValue(object, 'timelineEnd'),
          state.timelineProject.durationMs / 1000,
        ),
        keyframes: (objectValue(object, 'timelineKeyframes') as TimelineKeyframe[] | undefined) || [],
      };
    })
    .filter((track) => !videoObjectIds.has(track.objectId));
  return {
    schema: 'TeckStudioTimelineSchema',
    version: 2,
    generatedAt: new Date().toISOString(),
    timeline: state.timelineProject,
    canvas: {
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      background: typeof canvas.backgroundColor === 'string'
        ? canvas.backgroundColor
        : '#000000',
    },
    pages: state.pages,
    fabricState: canvas.toJSON(CUSTOM_FABRIC_PROPERTIES) as Record<string, unknown>,
    objectTracks,
    videoTracks: masterTimelineManager.getVideoTracks(),
    audioTracks: masterTimelineManager.getAudioTracks(),
  };
};
