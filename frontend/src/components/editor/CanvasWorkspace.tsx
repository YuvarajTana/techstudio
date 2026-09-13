import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/design';
import { useSmartGuides } from '../../hooks/useSmartGuides';
import { useDistanceMeasurement } from '../../hooks/useDistanceMeasurement';
import { usePenTool } from '../../hooks/usePenTool';
import { useLassoSelection } from '../../hooks/useLassoSelection';
import {
  addObjectToCanvas,
  createElementObjectFromPayload,
  createDiagramBoxElement,
  createFrameClipPathForObject,
  getFrameClipBoundsForObject,
  isFrameElementObject,
} from '../../utils/editorElementFactory';
import { enterInlineTextEditing, isEditableTextObject } from '../../utils/textSelectionStyles';
import { addStickerToCanvas } from '../../utils/stickerCanvas';
import type { StickerItem } from '../../types/editorFeatures';
import { installTextEffectSynchronization } from '../../utils/textEffects';
import type { EditorElement, ElementMetadata } from '../../types/elements';
import { PageSelectionOverlay } from './PageSelectionOverlay';
import {
  enterEditorialTagEditing,
  regroupEditorialTag,
  resizeEditorialTagText,
} from '../../utils/editorialPoster';
import {
  enterArchitectureCardEditing,
  regroupArchitectureNode,
} from '../../utils/architectureDiagram';
import {
  createManualDiagramConnector,
  getArchitectureAnchorPoint,
  getConnectableObjectId,
  getConnectableObjects,
  isConnectableDiagramObject,
  getDiagramAnchorSelection,
  removeDiagramBendHandles,
  removeDiagramAnchors,
  showDiagramBendHandle,
  showDiagramAnchors,
  PRIMARY_CONNECTOR_ANCHORS,
  updateConnectorBendFromHandle,
  updateDiagramConnector,
  updateAllDiagramConnectors,
  updateAttachedConnectors,
} from '../../utils/diagramConnectors';
import type {
  DiagramAnchorSelection,
} from '../../utils/diagramConnectors';
import type { ConnectorAnchor, DiagramConnectorConfig } from '../../utils/architectureDiagramTypes';
import { installConnectorAnimationManager } from '../../utils/connectorAnimationManager';
import type { UploadedImageAsset } from '../../types/uploads';
import { uploadImageAsset } from '../../services/uploadsApi';
import { addUploadedImageToCanvas } from '../../utils/uploadedImageCanvas';
import { isRoundedHighlightText, synchronizeRoundedHighlightText } from '../../utils/roundedHighlightText';
import { insertDynamicMediaAsset } from '../../utils/canvasVideo';
import { masterTimelineManager } from '../../utils/masterTimelineManager';
import { getPosterTrack } from '../../types/timeline';
import type { DynamicMediaAssetPayload } from '../../types/timeline';
import { PosterSceneRenderer } from '../../utils/sceneTimelineRenderer';
import { calculateMainPreviewFit } from '../../utils/canvasPreviewFit';
import {
  convertPosterRegionToText,
  enterPosterTextEditing,
  isPosterEditableText,
  normalizePosterEditableTextTransform,
  syncPosterEditableTextMetadata,
} from '../../utils/posterConversionCanvas';

type ManualConnectorPoint = { x: number; y: number };
type ManualConnectorStart = {
  point: ManualConnectorPoint;
  snap: DiagramAnchorSelection | null;
};

const sceneNumber = (index: number) => String(index + 1).padStart(2, '0');

const readSceneDimensions = (data: string | undefined, fallbackWidth: number, fallbackHeight: number) => {
  if (!data) return { width: fallbackWidth, height: fallbackHeight };
  try {
    const parsed = JSON.parse(data) as { width?: unknown; height?: unknown };
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    return {
      width: Number.isFinite(width) && width > 0 ? width : fallbackWidth,
      height: Number.isFinite(height) && height > 0 ? height : fallbackHeight,
    };
  } catch {
    return { width: fallbackWidth, height: fallbackHeight };
  }
};

const formatSceneDuration = (durationMs?: number) => {
  if (!durationMs) return '';
  return `${(durationMs / 1000).toFixed(1)}s`;
};

export const CanvasWorkspace: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const previewInteractionRef = useRef(new Map<fabric.Object, {
    selectable: boolean;
    evented: boolean;
    hasControls: boolean;
  }>());
  const connectorModeRef = useRef(false);
  const connectorStartRef = useRef<DiagramAnchorSelection | null>(null);
  const connectorConfigRef = useRef<Partial<DiagramConnectorConfig>>({});
  const connectorPreviewRef = useRef<fabric.Line | null>(null);
  const connectorPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const connectorDidDragRef = useRef(false);
  const manualConnectorStartRef = useRef<ManualConnectorStart | null>(null);
  const textHistoryTimerRef = useRef<number | null>(null);
  const [sceneOverviewOpen, setSceneOverviewOpen] = useState(false);
  const [isPreparingSceneOverview, setIsPreparingSceneOverview] = useState(false);
  const { canvas, setCanvas, setSelectedObject, saveHistory, editorMode, projectId, isProjectLoading, projectLoadError, loadProject, clearProjectLoadError, canvasWidth, canvasHeight, timelinePreviewActive, zoom, showSafeArea, safeAreaMargin, showGrid, pages, activePageId, timelineProject, selectedTimelineClipId, syncActivePage, syncAllPages, switchPage, setSelectedTimelineClipId } = useEditorStore();

  const sceneCards = useMemo(() => {
    const posterClips = getPosterTrack(timelineProject).clips;
    if (posterClips.length > 0) {
      return posterClips.map((clip, index) => {
        const page = pages.find((candidate) => candidate.id === clip.pageId);
        const dimensions = readSceneDimensions(page?.data || clip.canvasSnapshot, canvasWidth, canvasHeight);
        return {
          id: clip.id,
          pageId: clip.pageId,
          name: page?.name || clip.name || `Scene ${index + 1}`,
          thumbnail: page?.thumbnail || clip.thumbnailUrl,
          duration: formatSceneDuration(clip.durationMs),
          dimensions,
          index,
          isTimelineClip: true,
        };
      });
    }
    return pages.map((page, index) => {
      const dimensions = readSceneDimensions(page.data, canvasWidth, canvasHeight);
      return {
        id: page.id,
        pageId: page.id,
        name: page.name || `Scene ${index + 1}`,
        thumbnail: page.thumbnail,
        duration: '',
        dimensions,
        index,
        isTimelineClip: false,
      };
    });
  }, [canvasHeight, canvasWidth, pages, timelineProject]);

  const activeSceneId = selectedTimelineClipId || sceneCards.find((scene) => scene.pageId === activePageId)?.id || activePageId;
  const hasSceneOverview = sceneCards.length > 1;

  useEffect(() => {
    if (!sceneOverviewOpen || !canvas || sceneCards.length < 2) return;
    let cancelled = false;
    setIsPreparingSceneOverview(true);
    void syncAllPages().finally(() => {
      if (!cancelled) setIsPreparingSceneOverview(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canvas, sceneCards.length, sceneOverviewOpen, syncAllPages]);

  const openSceneOverview = () => {
    syncActivePage();
    setSceneOverviewOpen(true);
  };

  const openSceneForEditing = async (scene: typeof sceneCards[number]) => {
    syncActivePage();
    if (scene.isTimelineClip) setSelectedTimelineClipId(scene.id);
    else setSelectedTimelineClipId(null);
    await switchPage(scene.pageId);
    setSceneOverviewOpen(false);
  };

  useSmartGuides(fabricRef.current);
  useDistanceMeasurement(fabricRef.current);
  usePenTool(fabricRef.current);
  useLassoSelection(fabricRef.current);

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    fabric.Object.prototype.borderColor = '#a78bfa';
    fabric.Object.prototype.cornerColor = '#f8fafc';
    fabric.Object.prototype.cornerStrokeColor = '#7c3aed';
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.cornerSize = 8;
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.borderScaleFactor = 1;
    fabric.Object.prototype.padding = 4;

    const assignObjectId = (obj: fabric.Object) => {
      if (obj.get('id' as any)) return;
      const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      obj.set({ id } as any);
    };

    const fc = new fabric.Canvas(canvasRef.current, {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      backgroundColor: '#000000',
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      imageSmoothingEnabled: true,
    });

    console.log('[TECKSTUDIO] Canvas created:', { width: fc.getWidth(), height: fc.getHeight(), backgroundColor: fc.backgroundColor });

    fabricRef.current = fc;
    (canvasRef.current as any).__fabric = fc;
    ((fc as any).lowerCanvasEl as HTMLCanvasElement | undefined)?.setAttribute('data-fabric-canvas', 'lower');
    ((fc as any).upperCanvasEl as HTMLCanvasElement | undefined)?.setAttribute('data-fabric-canvas', 'upper');
    if ((fc as any).lowerCanvasEl) ((fc as any).lowerCanvasEl as any).__fabric = fc;
    if ((fc as any).upperCanvasEl) ((fc as any).upperCanvasEl as any).__fabric = fc;
    const removeTextEffectSynchronization = installTextEffectSynchronization(fc);
    const removeConnectorAnimationManager = installConnectorAnimationManager(fc);
    masterTimelineManager.attachCanvas(fc);
    if (previewCanvasRef.current) {
      masterTimelineManager.attachSceneRenderer(new PosterSceneRenderer(
        previewCanvasRef.current,
        () => {
          const state = useEditorStore.getState();
          return {
            pages: state.pages,
            timeline: state.timelineProject,
            width: fc.getWidth(),
            height: fc.getHeight(),
          };
        },
      ));
    }
    setCanvas(fc);

    // Sync canvas dimensions with store
    useEditorStore.getState().setCanvasDimensions(fc.getWidth(), fc.getHeight());

    // Fit-to-view helper: applies viewport transform to center and scale the canvas
    const fitCanvasToView = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      const store = useEditorStore.getState();
      const canvasW = store.canvasWidth || fc.getWidth() || 800;
      const canvasH = store.canvasHeight || fc.getHeight() || 800;

      const previewFit = calculateMainPreviewFit(containerWidth, containerHeight, canvasW, canvasH);

      // Apply viewport transform
      fc.setViewportTransform([previewFit.scale, 0, 0, previewFit.scale, previewFit.left, previewFit.top]);
      store.setZoom(previewFit.scale);
      fc.renderAll();
      console.log('[TECKSTUDIO] fitCanvasToView:', { containerWidth, containerHeight, canvasW, canvasH, ...previewFit });
    };

    // Initial fit-to-view after a short delay for layout to settle
    const initialFitTimer = window.setTimeout(fitCanvasToView, 500);

    const getArchitectureNodes = () => getConnectableObjects(fc);

    const enterDiagramBoxEditing = (object: fabric.Object, subTargets: fabric.Object[] = []) => {
      if (object.type !== 'group' || object.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramBox') return false;
      const group = object as fabric.Group;
      const diagramBoxId = String(group.get('diagramBoxId' as keyof fabric.Object) || group.get('id' as keyof fabric.Object) || '');
      if (!diagramBoxId) return false;
      const selection = group.toActiveSelection();
      const preferred = subTargets.find((target) => target.get('diagramBoxRole' as keyof fabric.Object) === 'text');
      const textObject = preferred || selection.getObjects().find((child) => child.get('diagramBoxRole' as keyof fabric.Object) === 'text');
      if (!textObject || !isEditableTextObject(textObject)) return false;
      selection.getObjects().forEach((child) => child.set({ diagramBoxId } as Record<string, unknown>));
      fc.setActiveObject(textObject);
      enterInlineTextEditing(fc, textObject, { selectAll: true });
      return true;
    };

    const regroupDiagramBox = (diagramBoxId: string) => {
      const children = fc.getObjects().filter((object) => (
        object.get('diagramBoxId' as keyof fabric.Object) === diagramBoxId
        && object.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramBox'
      ));
      if (children.length < 2) return null;
      const textObject = children.find((child) => child.get('diagramBoxRole' as keyof fabric.Object) === 'text') as fabric.Textbox | undefined;
      const selection = new fabric.ActiveSelection(children, { canvas: fc });
      fc.setActiveObject(selection);
      const group = selection.toGroup();
      group.set({
        id: diagramBoxId,
        name: textObject?.text || 'Diagram box',
        objectType: 'diagramBox',
        teckstudioObjectType: 'diagramBox',
        diagramBoxId,
        diagramBoxRole: 'container',
        elementKind: 'shape',
        elementCategory: 'Basic Shapes',
        elementSubcategory: 'Diagram Boxes',
        elementTags: ['shape', 'diagram', 'box', 'connector'],
        elementEditable: true,
        objectCaching: false,
        subTargetCheck: true,
      } as Record<string, unknown>);
      fc.setActiveObject(group);
      updateAllDiagramConnectors(fc);
      fc.requestRenderAll();
      return group;
    };

    const getConnectableObjectById = (nodeId?: string | null) => (
      nodeId ? getArchitectureNodes().find((object) => getConnectableObjectId(object) === nodeId) || null : null
    );

    const showConnectorAnchorsFor = (
      objects: Array<fabric.Object | null | undefined>,
      selected?: DiagramAnchorSelection | null,
    ) => {
      const uniqueObjects = objects.filter((object, index, list): object is fabric.Object => (
        Boolean(object)
        && isConnectableDiagramObject(object)
        && list.findIndex((candidate) => candidate === object) === index
      ));
      if (uniqueObjects.length > 0) {
        removeDiagramBendHandles(fc);
        showDiagramAnchors(fc, uniqueObjects, selected);
      } else {
        removeDiagramAnchors(fc);
        removeDiagramBendHandles(fc);
      }
    };

    const showSelectedNodeAnchors = (object?: fabric.Object | null) => {
      const objectType = object?.get('teckstudioObjectType' as keyof fabric.Object);
      if (connectorModeRef.current) {
        const sourceObject = getConnectableObjectById(connectorStartRef.current?.nodeId || null);
        showConnectorAnchorsFor([sourceObject || object], connectorStartRef.current);
        return;
      }
      if (object && isConnectableDiagramObject(object)) {
        removeManualConnectorEndpointHandles();
        showConnectorAnchorsFor([object]);
      } else if (object && objectType === 'diagramConnectorPath') {
        removeDiagramAnchors(fc);
        showDiagramBendHandle(fc, object);
        showManualConnectorEndpointHandles(object);
      } else if (objectType === 'diagramBendHandle') {
        removeDiagramAnchors(fc);
      } else if (objectType === 'diagramEndpointHandle') {
        removeDiagramAnchors(fc);
      } else {
        removeDiagramAnchors(fc);
        removeDiagramBendHandles(fc);
        removeManualConnectorEndpointHandles();
      }
    };

    const openTextPropertiesPanel = (object: fabric.Object | null | undefined) => {
      if (!object) return;
      const objectType = object?.get('objectType' as keyof fabric.Object);
      const teckstudioObjectType = object?.get('teckstudioObjectType' as keyof fabric.Object);
      const category = object?.get('elementCategory' as keyof fabric.Object);
      if (
        teckstudioObjectType === 'diagramArrow'
        || teckstudioObjectType === 'diagramConnectorPath'
        || category === 'Technical / Infographic'
      ) {
        window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'properties' } }));
        return;
      }
      if (
        objectType !== 'editable-import-text'
        && !isRoundedHighlightText(object)
      ) {
        window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'properties' } }));
        return;
      }
      window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'text-styles' } }));
    };

    const isPosterHotspot = (object: fabric.Object | null | undefined) => (
      object?.get('posterConversionRole' as keyof fabric.Object) === 'ocr-hotspot'
    );

    const setPosterHotspotOutline = (object: fabric.Object | null | undefined, visible: boolean) => {
      if (!isPosterHotspot(object)) return;
      object?.set({
        stroke: visible ? 'rgba(139,92,246,0.9)' : 'rgba(139,92,246,0)',
      });
    };

    const clearPosterHotspotOutlines = (except?: fabric.Object | null) => {
      fc.getObjects().forEach((object) => {
        if (object !== except) setPosterHotspotOutline(object, false);
      });
    };

    const syncSelection = (e: fabric.IEvent) => {
      const selected = e.selected && e.selected.length > 0 ? e.selected[0] : null;
      clearPosterHotspotOutlines(selected);
      setPosterHotspotOutline(selected, true);
      setSelectedObject(selected);
      showSelectedNodeAnchors(selected);
      openTextPropertiesPanel(selected);
      fc.requestRenderAll();
      if (import.meta.env.DEV && selected) {
        console.debug('[TECKSTUDIO] Selected object', {
          type: selected.type,
          id: selected.get('id' as keyof fabric.Object),
          name: selected.get('name' as keyof fabric.Object),
          selectable: selected.selectable,
          evented: selected.evented,
          editable: selected.get('editable' as keyof fabric.Object),
          lockMovementX: selected.lockMovementX,
          lockMovementY: selected.lockMovementY,
          lockScalingX: selected.lockScalingX,
          lockScalingY: selected.lockScalingY,
          lockRotation: selected.lockRotation,
          hasControls: selected.hasControls,
          isEditing: isEditableTextObject(selected) ? selected.isEditing : false,
          parent: selected.group?.type || null,
          visible: selected.visible,
          opacity: selected.opacity,
          excludeFromExport: selected.get('excludeFromExport' as keyof fabric.Object),
        });
      }
    };

    const handleSelectionCleared = () => {
      clearPosterHotspotOutlines();
      setSelectedObject(null);
      if (!connectorPreviewRef.current && !connectorModeRef.current) {
        connectorStartRef.current = null;
        connectorConfigRef.current = {};
      }
      removeDiagramAnchors(fc);
      removeDiagramBendHandles(fc);
      removeManualConnectorEndpointHandles();
      fc.discardActiveObject();
      fc.requestRenderAll();
    };

    const handlePosterHotspotOver = (event: fabric.IEvent) => {
      setPosterHotspotOutline(event.target, true);
      fc.requestRenderAll();
    };

    const handlePosterHotspotOut = (event: fabric.IEvent) => {
      if (event.target !== fc.getActiveObject()) setPosterHotspotOutline(event.target, false);
      fc.requestRenderAll();
    };

    const removeConnectorPreview = () => {
      if (connectorPreviewRef.current) {
        fc.remove(connectorPreviewRef.current);
        connectorPreviewRef.current = null;
      }
      connectorPointerStartRef.current = null;
      connectorDidDragRef.current = false;
    };

    const removeManualConnectorEndpointHandles = () => {
      const handles = fc.getObjects().filter((object) => (
        object.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramEndpointHandle'
      ));
      handles.forEach((handle) => fc.remove(handle));
      return handles.length;
    };

    const getAnchorPoint = (selection: DiagramAnchorSelection | null) => {
      if (!selection) return null;
      const node = getArchitectureNodes().find((object) => getConnectableObjectId(object) === selection.nodeId);
      return node ? getArchitectureAnchorPoint(node, selection.anchor) : null;
    };

    const getManualPointFromConfig = (
      path: fabric.Object,
      side: 'source' | 'target',
    ): ManualConnectorPoint | null => {
      const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      if (!config) return null;
      const snap = side === 'source'
        ? config.sourceObjectId || config.sourceNodeId
          ? { nodeId: String(config.sourceObjectId || config.sourceNodeId), anchor: config.sourceAnchor || 'right' as ConnectorAnchor }
          : null
        : config.targetObjectId || config.targetNodeId
          ? { nodeId: String(config.targetObjectId || config.targetNodeId), anchor: config.targetAnchor || 'left' as ConnectorAnchor }
          : null;
      const snappedPoint = getAnchorPoint(snap);
      if (snappedPoint) return snappedPoint;
      const manualPoint = side === 'source' ? config.manualStartPoint : config.manualEndPoint;
      return manualPoint ? { x: Number(manualPoint.x) || 0, y: Number(manualPoint.y) || 0 } : null;
    };

    const findConnectorPathById = (connectorId?: unknown) => (
      fc.getObjects().find((object) => (
        object.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramConnectorPath'
        && object.get('diagramConnectorId' as keyof fabric.Object) === connectorId
      )) || null
    );

    const createEndpointHandle = (
      path: fabric.Object,
      side: 'source' | 'target',
      point: ManualConnectorPoint,
    ) => {
      const config = path.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      const zoom = Math.max(0.1, fc.getZoom() || 1);
      return new fabric.Circle({
        left: point.x,
        top: point.y,
        radius: 7 / zoom,
        originX: 'center',
        originY: 'center',
        fill: side === 'source' ? '#070A0F' : '#8B5CF6',
        stroke: side === 'source' ? '#43D68A' : '#F2C94C',
        strokeWidth: 2 / zoom,
        strokeUniform: true,
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'crosshair',
        excludeFromExport: true,
        excludeFromSave: true,
        editorOnly: true,
        isEditorHelper: true,
        isConnectorHandle: true,
        objectType: 'diagramEndpointHandle',
        teckstudioObjectType: 'diagramEndpointHandle',
        diagramEndpointHandleConnectorId: String(config?.connectorId || path.get('diagramConnectorId' as keyof fabric.Object)),
        diagramEndpointHandleSide: side,
        name: `${side} connector endpoint handle`,
      } as fabric.ICircleOptions & Record<string, unknown>);
    };

    const showManualConnectorEndpointHandles = (path: fabric.Object) => {
      removeManualConnectorEndpointHandles();
      if (path.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramConnectorPath') return;
      const source = getManualPointFromConfig(path, 'source');
      const target = getManualPointFromConfig(path, 'target');
      if (!source || !target) return;
      const handles = [
        createEndpointHandle(path, 'source', source),
        createEndpointHandle(path, 'target', target),
      ];
      handles.forEach((handle) => {
        fc.add(handle);
        handle.bringToFront();
      });
      fc.requestRenderAll();
    };

    const paintAnchorHighlights = (target?: DiagramAnchorSelection | null) => {
      fc.getObjects().forEach((object) => {
        const anchor = getDiagramAnchorSelection(object);
        if (!anchor) return;
        const isSource = connectorStartRef.current?.nodeId === anchor.nodeId && connectorStartRef.current.anchor === anchor.anchor;
        const isTarget = target?.nodeId === anchor.nodeId && target.anchor === anchor.anchor;
        object.set({
          fill: isTarget ? '#F2C94C' : isSource ? '#8B5CF6' : '#070A0F',
          stroke: isTarget ? '#F2C94C' : isSource ? '#8B5CF6' : '#43D68A',
        } as Record<string, unknown>);
      });
    };

    const findNearestAnchor = (
      pointer: { x: number; y: number },
      source?: DiagramAnchorSelection | null,
    ): DiagramAnchorSelection | null => {
      const zoom = Math.max(0.1, fc.getZoom() || 1);
      const snapDistance = 28 / zoom;
      let bestSelection: DiagramAnchorSelection | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      getArchitectureNodes().forEach((object) => {
        const nodeId = getConnectableObjectId(object);
        if (!nodeId) return;
        const isSelf = source?.nodeId === nodeId;
        if (isSelf && connectorConfigRef.current.routing !== 'loop') return;

        PRIMARY_CONNECTOR_ANCHORS.forEach((anchor) => {
          const point = getArchitectureAnchorPoint(object, anchor as ConnectorAnchor);
          const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
          if (distance <= snapDistance && distance < bestDistance) {
            bestSelection = { nodeId, anchor: anchor as ConnectorAnchor };
            bestDistance = distance;
          }
        });
      });

      return bestSelection;
    };

    const updateConnectorEndpointFromHandle = (
      handle: fabric.Object,
      persist = false,
    ) => {
      if (handle.get('teckstudioObjectType' as keyof fabric.Object) !== 'diagramEndpointHandle') return null;
      const connectorId = handle.get('diagramEndpointHandleConnectorId' as keyof fabric.Object);
      const rawSide = handle.get('diagramEndpointHandleSide' as keyof fabric.Object);
      const path = findConnectorPathById(connectorId);
      const previous = path?.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      if (!path || !previous || (rawSide !== 'source' && rawSide !== 'target')) return null;
      const side = rawSide as 'source' | 'target';
      const pointer = { x: Number(handle.left || 0), y: Number(handle.top || 0) };
      const otherNodeId = side === 'source'
        ? previous.targetObjectId || previous.targetNodeId
        : previous.sourceObjectId || previous.sourceNodeId;
      const otherSnap: DiagramAnchorSelection | null = otherNodeId
        ? {
            nodeId: String(otherNodeId),
            anchor: side === 'source'
              ? previous.targetAnchor || 'left'
              : previous.sourceAnchor || 'right',
          }
        : null;
      const snappedAnchor: DiagramAnchorSelection | null = findNearestAnchor(pointer, otherSnap);
      const point = getAnchorPoint(snappedAnchor) || pointer;
      const next: DiagramConnectorConfig = {
        ...previous,
        manualConnector: true,
        manualStartPoint: side === 'source' ? point : previous.manualStartPoint,
        manualEndPoint: side === 'target' ? point : previous.manualEndPoint,
        sourceNodeId: side === 'source' ? snappedAnchor?.nodeId || '' : previous.sourceNodeId,
        sourceObjectId: side === 'source' ? snappedAnchor?.nodeId : previous.sourceObjectId,
        sourceAnchor: side === 'source' ? snappedAnchor?.anchor || previous.sourceAnchor || 'right' : previous.sourceAnchor,
        targetNodeId: side === 'target' ? snappedAnchor?.nodeId || '' : previous.targetNodeId,
        targetObjectId: side === 'target' ? snappedAnchor?.nodeId : previous.targetObjectId,
        targetAnchor: side === 'target' ? snappedAnchor?.anchor || previous.targetAnchor || 'left' : previous.targetAnchor,
      };
      path.set({ diagramConnectorConfig: next } as Record<string, unknown>);
      handle.set({ left: point.x, top: point.y } as Record<string, unknown>);
      updateDiagramConnector(fc, path);
      if (persist) {
        fc.setActiveObject(path);
        setSelectedObject(path);
        showSelectedNodeAnchors(path);
      }
      return path;
    };

    const getNearestAnchorForObject = (
      object: fabric.Object | null | undefined,
      pointer: { x: number; y: number },
    ): DiagramAnchorSelection | null => {
      if (!object || !isConnectableDiagramObject(object)) return null;
      const nodeId = getConnectableObjectId(object);
      if (!nodeId) return null;
      let bestAnchor: ConnectorAnchor = 'right';
      let bestDistance = Number.POSITIVE_INFINITY;
      PRIMARY_CONNECTOR_ANCHORS.forEach((anchor) => {
        const point = getArchitectureAnchorPoint(object, anchor as ConnectorAnchor);
        const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
        if (distance < bestDistance) {
          bestAnchor = anchor as ConnectorAnchor;
          bestDistance = distance;
        }
      });
      return { nodeId, anchor: bestAnchor };
    };

    const getConnectorSelectionFromEvent = (
      event: fabric.IEvent,
      source?: DiagramAnchorSelection | null,
    ): DiagramAnchorSelection | null => {
      const anchor = getDiagramAnchorSelection(event.target);
      if (anchor) return anchor;

      const pointer = fc.getPointer(event.e);
      const objectSelection = getNearestAnchorForObject(event.target, pointer);
      if (objectSelection && (objectSelection.nodeId !== source?.nodeId || connectorConfigRef.current.routing === 'loop')) {
        return objectSelection;
      }

      return findNearestAnchor(pointer, source);
    };

    const showDragConnectorAnchors = (target?: DiagramAnchorSelection | null) => {
      const sourceObject = getConnectableObjectById(connectorStartRef.current?.nodeId || null);
      const targetObject = getConnectableObjectById(target?.nodeId || null);
      showConnectorAnchorsFor([sourceObject, targetObject], connectorStartRef.current);
      paintAnchorHighlights(target);
    };

    const startConnectorPreview = (point: ManualConnectorPoint) => {
      removeConnectorPreview();
      const preview = new fabric.Line([point.x, point.y, point.x, point.y], {
        stroke: String(connectorConfigRef.current.color || '#43D68A'),
        strokeWidth: Number(connectorConfigRef.current.width || 2),
        strokeDashArray: connectorConfigRef.current.style === 'dotted' || connectorConfigRef.current.lineStyle === 'dotted'
          ? [2, 8]
          : connectorConfigRef.current.style === 'dashed' || connectorConfigRef.current.lineStyle === 'dashed'
            ? [10, 8]
            : [8, 6],
        opacity: 0.72,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        excludeFromSave: true,
        editorOnly: true,
        isEditorHelper: true,
        objectType: 'diagramConnectorPreview',
        teckstudioObjectType: 'diagramConnectorPreview',
      } as fabric.ILineOptions & Record<string, unknown>);
      connectorPreviewRef.current = preview;
      connectorPointerStartRef.current = point;
      fc.add(preview);
      preview.bringToFront();
    };

    const finishConnector = (
      start: ManualConnectorStart,
      endPoint: ManualConnectorPoint,
      target: DiagramAnchorSelection | null,
    ) => {
      if (start.snap && target && start.snap.nodeId === target.nodeId && connectorConfigRef.current.routing !== 'loop') return false;
      const config = connectorConfigRef.current;
      removeDiagramAnchors(fc);
      removeConnectorPreview();
      const objects = createManualDiagramConnector(fc, {
        sourceNodeId: start.snap?.nodeId || '',
        targetNodeId: target?.nodeId || '',
        sourceObjectId: start.snap?.nodeId,
        targetObjectId: target?.nodeId,
        sourceAnchor: start.snap?.anchor || 'right',
        targetAnchor: target?.anchor || 'left',
        manualStartPoint: start.point,
        manualEndPoint: endPoint,
        routing: config.routing || 'elbow',
        connectorType: config.connectorType || config.routing || 'elbow',
        style: config.style || config.lineStyle || 'solid',
        lineStyle: config.lineStyle || config.style || 'solid',
        color: config.color || '#43D68A',
        width: config.width || 2,
        opacity: config.opacity ?? 0.9,
        dashLength: config.dashLength || 10,
        dashGap: config.dashGap || 8,
        startArrow: config.startArrow || 'none',
        endArrow: config.endArrow || 'arrow',
        arrowSize: config.arrowSize || 13,
        bendOffset: config.bendOffset || 0,
        curvature: config.curvature || 0.45,
        label: config.label || '',
        labelColor: config.labelColor || String(config.color || '#43D68A'),
        labelBackground: config.labelBackground || 'rgba(7, 10, 15, 0.88)',
        labelPosition: config.labelPosition || 0.5,
        labelOffset: config.labelOffset ?? -16,
        labelFontSize: config.labelFontSize || 11,
        labelVisible: config.labelVisible !== false,
        glow: Boolean(config.glow),
        glowBlur: config.glowBlur || 8,
        animation: config.animation,
      });
      const firstNodeIndex = fc.getObjects().findIndex((object) => getConnectableObjects(fc).includes(object));
      objects.forEach((object, index) => fc.moveTo(object, Math.max(0, firstNodeIndex) + index));
      connectorModeRef.current = false;
      connectorStartRef.current = null;
      connectorConfigRef.current = {};
      manualConnectorStartRef.current = null;
      useEditorStore.getState().setConnectorToolState({ active: false });
      if (objects[0]) {
        fc.setActiveObject(objects[0]);
        setSelectedObject(objects[0]);
        showManualConnectorEndpointHandles(objects[0]);
      }
      fc.requestRenderAll();
      saveHistory();
      window.dispatchEvent(new CustomEvent('teckstudio:connector-created'));
      if (import.meta.env.DEV) {
        if (target) console.debug('[CONNECTOR] target =', `${target.nodeId}:${target.anchor}`);
        if (!start.snap) console.debug('[CONNECTOR] source =', `free:${Math.round(start.point.x)},${Math.round(start.point.y)}`);
        if (!target) console.debug('[CONNECTOR] target =', `free:${Math.round(endPoint.x)},${Math.round(endPoint.y)}`);
        console.debug('[CONNECTOR] created =', objects[0]?.get('objectId' as keyof fabric.Object) || objects[0]?.get('id' as keyof fabric.Object));
      }
      return true;
    };

    const stopConnectorMode = () => {
      connectorModeRef.current = false;
      connectorStartRef.current = null;
      connectorConfigRef.current = {};
      manualConnectorStartRef.current = null;
      useEditorStore.getState().setConnectorToolState({ active: false });
      fc.defaultCursor = 'default';
      fc.hoverCursor = 'move';
      removeConnectorPreview();
      removeDiagramAnchors(fc);
      removeDiagramBendHandles(fc);
      showSelectedNodeAnchors(fc.getActiveObject());
    };

    const startConnectorMode = (event: Event) => {
      const detail = (event as CustomEvent<{ config?: Partial<DiagramConnectorConfig> }>).detail;
      connectorModeRef.current = true;
      connectorStartRef.current = null;
      manualConnectorStartRef.current = null;
      connectorConfigRef.current = detail?.config || {};
      useEditorStore.getState().setConnectorToolState({
        active: true,
        connectorType: connectorConfigRef.current.connectorType || connectorConfigRef.current.routing || 'elbow',
      });
      fc.defaultCursor = 'crosshair';
      fc.hoverCursor = 'crosshair';
      if (import.meta.env.DEV) {
        console.debug('[CONNECTOR] mode active:', connectorModeRef.current);
        console.debug('[CONNECTOR] canvas instance:', fc ? 'ready' : 'missing');
        console.debug('[CONNECTOR] selected type =', connectorConfigRef.current.connectorType || connectorConfigRef.current.routing || 'elbow');
      }
      removeConnectorPreview();
      removeDiagramBendHandles(fc);
      removeManualConnectorEndpointHandles();
      removeDiagramAnchors(fc);
    };

    const handleConnectorAnchorClick = (event: fabric.IEvent) => {
      if (import.meta.env.DEV && connectorModeRef.current) {
        console.debug('[CONNECTOR] mouse down');
      }
      if (!connectorModeRef.current) {
        const anchor = getDiagramAnchorSelection(event.target);
        if (!anchor) return;
        connectorModeRef.current = true;
        connectorConfigRef.current = {};
        useEditorStore.getState().setConnectorToolState({ active: true, connectorType: null });
        const point = getAnchorPoint(anchor);
        if (!point) return;
        connectorStartRef.current = anchor;
        manualConnectorStartRef.current = { point, snap: anchor };
        connectorDidDragRef.current = false;
        showConnectorAnchorsFor([getConnectableObjectById(anchor.nodeId)], anchor);
        paintAnchorHighlights(null);
        startConnectorPreview(point);
        if (import.meta.env.DEV) {
          console.debug('[CONNECTOR] source =', `${anchor.nodeId}:${anchor.anchor}`);
        }
        return;
      }

      event.e?.preventDefault?.();
      const pointer = fc.getPointer(event.e);
      const snap = getConnectorSelectionFromEvent(event, null);
      const point = getAnchorPoint(snap) || pointer;
      connectorStartRef.current = snap;
      manualConnectorStartRef.current = { point, snap };
      connectorDidDragRef.current = false;
      if (snap) {
        showConnectorAnchorsFor([getConnectableObjectById(snap.nodeId)], snap);
      } else {
        removeDiagramAnchors(fc);
      }
      paintAnchorHighlights(null);
      startConnectorPreview(point);
      if (import.meta.env.DEV) {
        console.debug('[CONNECTOR] source =', snap ? `${snap.nodeId}:${snap.anchor}` : `free:${Math.round(point.x)},${Math.round(point.y)}`);
      }
    };

    const handleConnectorMouseMove = (event: fabric.IEvent) => {
      if (!connectorModeRef.current || !manualConnectorStartRef.current || !connectorPreviewRef.current) return;
      const pointer = fc.getPointer(event.e);
      const startPoint = connectorPointerStartRef.current;
      if (startPoint && Math.hypot(pointer.x - startPoint.x, pointer.y - startPoint.y) > 4) {
        if (!connectorDidDragRef.current && import.meta.env.DEV) {
          console.debug('[CONNECTOR] dragging');
        }
        connectorDidDragRef.current = true;
      }
      const nearest = findNearestAnchor(pointer, manualConnectorStartRef.current.snap);
      const targetPoint = getAnchorPoint(nearest) || pointer;
      connectorPreviewRef.current.set({ x2: targetPoint.x, y2: targetPoint.y } as Record<string, unknown>);
      showDragConnectorAnchors(nearest);
      connectorPreviewRef.current.bringToFront();
      fc.requestRenderAll();
    };

    const handleConnectorMouseUp = (event: fabric.IEvent) => {
      if (!connectorModeRef.current || !manualConnectorStartRef.current || !connectorPreviewRef.current) return;
      const pointer = fc.getPointer(event.e);
      const target = getConnectorSelectionFromEvent(event, manualConnectorStartRef.current.snap);
      const endPoint = getAnchorPoint(target) || pointer;
      if (target && import.meta.env.DEV) {
        console.debug('[CONNECTOR] target detected:', `${target.nodeId}:${target.anchor}`);
      }
      const startPoint = connectorPointerStartRef.current;
      const movedEnough = startPoint && Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) > 4;
      if (connectorDidDragRef.current && movedEnough && finishConnector(manualConnectorStartRef.current, endPoint, target)) return;
      removeConnectorPreview();
      if (connectorDidDragRef.current || movedEnough) {
        stopConnectorMode();
      } else {
        showDragConnectorAnchors(null);
      }
    };

    const syncActiveTextObject = () => {
      const activeObject = fc.getActiveObject();
      setSelectedObject(activeObject || null);
      if (activeObject && isEditableTextObject(activeObject)) {
        useEditorStore.getState().captureTextSelection();
        openTextPropertiesPanel(activeObject);
      }
    };

    const handleTextChanged = (event: fabric.IEvent) => {
      const architectureRole = event.target?.get('architectureRole' as keyof fabric.Object);
      if (architectureRole === 'architecture-card-title' || architectureRole === 'architecture-card-subtitle') {
        return;
      }
      if (event.target && resizeEditorialTagText(fc, event.target)) return;
      if (event.target) synchronizeRoundedHighlightText(event.target);
      if (syncPosterEditableTextMetadata(event.target)) {
        setSelectedObject(event.target || null);
      }
      if (textHistoryTimerRef.current) window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = window.setTimeout(() => {
        textHistoryTimerRef.current = null;
        saveHistory();
      }, 450);
    };

    const handleDoubleClick = (event: fabric.IEvent) => {
      if (!event.target) return;
      if (isPosterHotspot(event.target)) {
        if (event.target.get('posterConversionPending' as keyof fabric.Object) === true) return;
        const hotspot = event.target;
        hotspot.set({ posterConversionPending: true, evented: false } as Record<string, unknown>);
        fc.requestRenderAll();
        void convertPosterRegionToText(fc, hotspot)
          .then((result) => {
            saveHistory();
            enterPosterTextEditing(fc, result.text, { selectAll: true });
            setSelectedObject(result.text);
          })
          .catch((error) => {
            hotspot.set({ posterConversionPending: false, evented: true } as Record<string, unknown>);
            fc.setActiveObject(hotspot);
            setSelectedObject(hotspot);
            fc.requestRenderAll();
            console.error('[TECKSTUDIO] Unable to convert OCR text region:', error);
          });
        return;
      }
      if (isEditableTextObject(event.target)) {
        const entered = isPosterEditableText(event.target)
          ? enterPosterTextEditing(fc, event.target, { pointerEvent: event.e })
          : enterInlineTextEditing(fc, event.target, { pointerEvent: event.e });
        if (entered) {
          setSelectedObject(event.target);
          openTextPropertiesPanel(event.target);
          return;
        }
      }
      const subTargets = (event as fabric.IEvent & { subTargets?: fabric.Object[] }).subTargets || [];
      const diagramBoxEditing = enterDiagramBoxEditing(event.target, subTargets);
      const architectureEditing = !diagramBoxEditing && enterArchitectureCardEditing(fc, event.target, subTargets);
      const tagEditing = !diagramBoxEditing && !architectureEditing && enterEditorialTagEditing(fc, event.target);
      if (!diagramBoxEditing && !architectureEditing && !tagEditing) return;
      setSelectedObject(fc.getActiveObject() || null);
      if (diagramBoxEditing || architectureEditing) saveHistory();
    };

    const handleTextEditingExited = (event: fabric.IEvent) => {
      if (textHistoryTimerRef.current) {
        window.clearTimeout(textHistoryTimerRef.current);
        textHistoryTimerRef.current = null;
        saveHistory();
      }
      useEditorStore.setState({ textSelectionRange: null });
      syncActiveTextObject();
      const target = event.target;
      const editorialTagId = target?.get('editorialTagId' as keyof fabric.Object);
      if (editorialTagId && target?.get('editorialTagRole' as keyof fabric.Object) === 'text') {
        resizeEditorialTagText(fc, target);
        window.setTimeout(() => {
          const group = regroupEditorialTag(fc, String(editorialTagId));
          if (group) {
            setSelectedObject(group);
            saveHistory();
          }
        }, 0);
        return;
      }
      const diagramBoxId = target?.get('diagramBoxId' as keyof fabric.Object);
      if (diagramBoxId && target?.get('diagramBoxRole' as keyof fabric.Object) === 'text') {
        window.setTimeout(() => {
          const group = regroupDiagramBox(String(diagramBoxId));
          if (group) {
            setSelectedObject(group);
            saveHistory();
          }
        }, 0);
        return;
      }
      const role = target?.get('architectureRole' as keyof fabric.Object);
      const nodeId = target?.get('architectureNodeId' as keyof fabric.Object);
      if (
        !nodeId ||
        (role !== 'architecture-card-title' && role !== 'architecture-card-subtitle')
      ) return;
      window.setTimeout(() => {
        const group = regroupArchitectureNode(fc, String(nodeId));
        if (group) {
          setSelectedObject(group);
          saveHistory();
        }
      }, 0);
    };

    const handleDiagramNodeTransform = (event: fabric.IEvent) => {
      if (!event.target) return;
      if (event.target.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramEndpointHandle') {
        updateConnectorEndpointFromHandle(event.target);
        return;
      }
      if (event.target.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramBendHandle') {
        updateConnectorBendFromHandle(fc, event.target);
        return;
      }
      updateAttachedConnectors(fc, event.target);
    };

    const handleObjectModified = (event: fabric.IEvent) => {
      if (event.target?.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramEndpointHandle') {
        const path = updateConnectorEndpointFromHandle(event.target, true);
        if (path) {
          fc.setActiveObject(path);
          setSelectedObject(path);
          showSelectedNodeAnchors(path);
        }
        saveHistory();
        return;
      }
      if (event.target?.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramBendHandle') {
        const path = updateConnectorBendFromHandle(fc, event.target);
        if (path) {
          fc.setActiveObject(path);
          setSelectedObject(path);
          showSelectedNodeAnchors(path);
        }
        saveHistory();
        return;
      }
      if (event.target && normalizePosterEditableTextTransform(event.target)) {
        setSelectedObject(event.target);
      }
      if (event.target) updateAttachedConnectors(fc, event.target);
      showSelectedNodeAnchors(event.target);
      saveHistory();
    };

    const handleObjectAdded = (event: fabric.IEvent) => {
      if (event.target) assignObjectId(event.target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && connectorModeRef.current) {
        event.preventDefault();
        stopConnectorMode();
        return;
      }
      const activeObject = fc.getActiveObject();
      if (!isEditableTextObject(activeObject)) return;

      const isMod = event.metaKey || event.ctrlKey;
      if (event.key === 'Escape' && activeObject.isEditing) {
        event.preventDefault();
        activeObject.exitEditing?.();
        fc.requestRenderAll();
        return;
      }

      if (!isMod) return;
      const store = useEditorStore.getState();
      store.captureTextSelection();

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        store.setFontWeight(store.fontWeight === 'bold' || store.fontWeight === '700' ? 'normal' : 'bold');
      } else if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        store.setFontStyle(store.fontStyle === 'italic' ? 'normal' : 'italic');
      } else if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        store.setUnderline(!store.underline);
      } else if (event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('teckstudio:open-text-color'));
      }
    };

    fc.on('selection:created', syncSelection);
    fc.on('selection:updated', syncSelection);
    fc.on('selection:cleared', handleSelectionCleared);
    fc.on('object:moving', handleDiagramNodeTransform);
    fc.on('object:scaling', handleDiagramNodeTransform);
    fc.on('object:rotating', handleDiagramNodeTransform);
    fc.on('object:modified', handleObjectModified);
    fc.on('object:added', handleObjectAdded);
    fc.on('text:selection:changed', syncActiveTextObject);
    fc.on('text:editing:entered', syncActiveTextObject);
    fc.on('text:editing:exited', handleTextEditingExited);
    fc.on('text:changed', handleTextChanged);
    fc.on('mouse:dblclick', handleDoubleClick);
    fc.on('mouse:down', handleConnectorAnchorClick);
    fc.on('mouse:move', handleConnectorMouseMove);
    fc.on('mouse:up', handleConnectorMouseUp);
    fc.on('mouse:over', handlePosterHotspotOver);
    fc.on('mouse:out', handlePosterHotspotOut);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('teckstudio:start-connector-mode', startConnectorMode);
    const handleDynamicMediaAsset = (event: Event) => {
      const payload = (event as CustomEvent<DynamicMediaAssetPayload>).detail;
      if (!payload?.type) return;
      void insertDynamicMediaAsset(fc, payload).then((object) => {
        setSelectedObject(object);
        return useEditorStore.getState().saveHistory();
      }).catch((error) => {
        console.error('[TECKSTUDIO] Unable to insert dynamic media payload:', error);
      });
    };
    window.addEventListener('teckstudio:insert-dynamic-asset', handleDynamicMediaAsset);

    // Re-fit canvas on window resize
    const handleResize = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      const store = useEditorStore.getState();
      const canvasW = store.canvasWidth || fc.getWidth() || 800;
      const canvasH = store.canvasHeight || fc.getHeight() || 800;

      const previewFit = calculateMainPreviewFit(containerWidth, containerHeight, canvasW, canvasH);

      fc.setViewportTransform([previewFit.scale, 0, 0, previewFit.scale, previewFit.left, previewFit.top]);
      store.setZoom(previewFit.scale);
      fc.renderAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.clearTimeout(initialFitTimer);
      if (textHistoryTimerRef.current) window.clearTimeout(textHistoryTimerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('teckstudio:start-connector-mode', startConnectorMode);
      window.removeEventListener('teckstudio:insert-dynamic-asset', handleDynamicMediaAsset);
      fc.off('selection:created', syncSelection);
      fc.off('selection:updated', syncSelection);
      fc.off('selection:cleared', handleSelectionCleared);
      fc.off('object:moving', handleDiagramNodeTransform);
      fc.off('object:scaling', handleDiagramNodeTransform);
      fc.off('object:rotating', handleDiagramNodeTransform);
      fc.off('object:modified', handleObjectModified);
      fc.off('object:added', handleObjectAdded);
      fc.off('text:selection:changed', syncActiveTextObject);
      fc.off('text:editing:entered', syncActiveTextObject);
      fc.off('text:editing:exited', handleTextEditingExited);
      fc.off('text:changed', handleTextChanged);
      fc.off('mouse:dblclick', handleDoubleClick);
      fc.off('mouse:down', handleConnectorAnchorClick);
      fc.off('mouse:move', handleConnectorMouseMove);
      fc.off('mouse:up', handleConnectorMouseUp);
      fc.off('mouse:over', handlePosterHotspotOver);
      fc.off('mouse:out', handlePosterHotspotOut);
      removeConnectorPreview();
      removeDiagramAnchors(fc);
      removeDiagramBendHandles(fc);
      removeManualConnectorEndpointHandles();
      removeConnectorAnimationManager();
      removeTextEffectSynchronization();
      masterTimelineManager.detachCanvas();
      fc.dispose();
      fabricRef.current = null;
      setCanvas(null);
      setSelectedObject(null);
    };
  }, []);

  // Re-fit canvas when project load completes or dimensions change
  useEffect(() => {
    if (!fabricRef.current || isProjectLoading) return;

    console.log('[TECKSTUDIO] Re-fit triggered:', { isProjectLoading, canvasWidth, canvasHeight });

    // Small delay to ensure layout is settled after project load
    const timer = setTimeout(() => {
      const containerEl = containerRef.current;
      if (!containerEl || !fabricRef.current) return;

      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      const store = useEditorStore.getState();
      const canvasW = store.canvasWidth || fabricRef.current.getWidth() || 800;
      const canvasH = store.canvasHeight || fabricRef.current.getHeight() || 800;

      console.log('[TECKSTUDIO] Re-fit executing:', { containerWidth, containerHeight, canvasW, canvasH });

      const previewFit = calculateMainPreviewFit(containerWidth, containerHeight, canvasW, canvasH);

      console.log('[TECKSTUDIO] Re-fit applying:', previewFit);

      fabricRef.current.setViewportTransform([previewFit.scale, 0, 0, previewFit.scale, previewFit.left, previewFit.top]);
      store.setZoom(previewFit.scale);
      updateAllDiagramConnectors(fabricRef.current);
      fabricRef.current.renderAll();
    }, 500);

    return () => clearTimeout(timer);
  }, [isProjectLoading, canvasWidth, canvasHeight]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (timelinePreviewActive) {
      previewInteractionRef.current.clear();
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.skipTargetFind = true;
      canvas.getObjects().forEach((object) => {
        previewInteractionRef.current.set(object, {
          selectable: object.selectable !== false,
          evented: object.evented !== false,
          hasControls: object.hasControls !== false,
        });
        object.set({ selectable: false, evented: false, hasControls: false });
      });
    } else {
      canvas.selection = true;
      canvas.skipTargetFind = false;
      previewInteractionRef.current.forEach((values, object) => {
        if (canvas.contains(object)) object.set(values);
      });
      previewInteractionRef.current.clear();
    }
    canvas.requestRenderAll();
  }, [timelinePreviewActive]);

  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.getObjects().forEach((obj) => {
      obj.set({
        lockMovementX: editorMode === 'dev',
        lockMovementY: editorMode === 'dev',
        lockScalingX: editorMode === 'dev',
        lockScalingY: editorMode === 'dev',
        lockRotation: editorMode === 'dev',
        hasControls: editorMode !== 'dev',
      });
    });
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
  }, [editorMode]);

  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'copy'; };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const fc = fabricRef.current;
      if (!fc) return;
      const ptr = fc.getPointer(e as any);
      const dynamicAssetPayloadRaw = e.dataTransfer?.getData('application/x-teckstudio-dynamic-asset');
      if (dynamicAssetPayloadRaw) {
        try {
          const payload = JSON.parse(dynamicAssetPayloadRaw) as DynamicMediaAssetPayload;
          void insertDynamicMediaAsset(fc, payload, ptr).then((object) => {
            useEditorStore.getState().setSelectedObject(object);
            return useEditorStore.getState().saveHistory();
          }).catch((error) => {
            console.error('[TECKSTUDIO] Unable to add dragged dynamic media:', error);
          });
        } catch (error) {
          console.error('[TECKSTUDIO] Invalid dynamic media payload:', error);
        }
        return;
      }
      const stickerPayloadRaw = e.dataTransfer?.getData('application/x-teckstudio-sticker');
      if (stickerPayloadRaw) {
        try {
          const sticker = JSON.parse(stickerPayloadRaw) as StickerItem;
          void addStickerToCanvas(fc, sticker, ptr).then((object) => {
            useEditorStore.getState().setSelectedObject(object);
            useEditorStore.getState().saveHistory();
          }).catch((error) => {
            console.error('[TECKSTUDIO] Unable to add dragged sticker:', error);
          });
        } catch (error) {
          console.error('[TECKSTUDIO] Invalid dragged sticker payload:', error);
        }
        return;
      }
      const elementPayloadRaw = e.dataTransfer?.getData('application/x-teckstudio-element');
      if (elementPayloadRaw) {
        try {
          const payload = JSON.parse(elementPayloadRaw) as EditorElement;
          if (payload.kind === 'video' && payload.sourceUrl) {
            void insertDynamicMediaAsset(fc, {
              id: payload.id,
              type: 'video',
              sourceUrl: payload.sourceUrl,
              posterUrl: payload.previewUrl || payload.thumbnailUrl,
              mimeType: payload.mimeType,
              name: payload.name,
              duration: payload.videoConfig?.duration,
              startTime: payload.videoConfig?.startTime,
              endTime: payload.videoConfig?.endTime,
              loop: payload.videoConfig?.loop,
              muted: payload.videoConfig?.muted,
            }, ptr).then((object) => {
              useEditorStore.getState().setSelectedObject(object);
              return useEditorStore.getState().saveHistory();
            }).catch((error) => {
              console.error('[TECKSTUDIO] Unable to add dragged video:', error);
            });
            return;
          }
          const object = createElementObjectFromPayload(payload, {
            fill: useEditorStore.getState().fillColor,
            stroke: useEditorStore.getState().strokeColor,
            strokeWidth: useEditorStore.getState().strokeWidth,
          });
          if (object) {
            addObjectToCanvas(fc, object, ptr);
            useEditorStore.getState().saveHistory();
          }
        } catch (error) {
          console.error('[TECKSTUDIO] Unable to add dragged element:', error);
        }
        return;
      }

      const uploadPayloadRaw = e.dataTransfer?.getData('application/x-teckstudio-upload');
      if (uploadPayloadRaw) {
        try {
          const asset = JSON.parse(uploadPayloadRaw) as UploadedImageAsset;
          void addUploadedImageToCanvas(fc, asset, ptr).then((object) => {
            useEditorStore.getState().setSelectedObject(object);
            useEditorStore.getState().saveHistory();
          }).catch((error) => {
            console.error('[TECKSTUDIO] Unable to add uploaded image:', error);
          });
        } catch (error) {
          console.error('[TECKSTUDIO] Invalid uploaded image payload:', error);
        }
        return;
      }

      const photoPayloadRaw = e.dataTransfer?.getData('application/x-teckstudio-photo');
      let photoPayload: EditorElement | null = null;
      if (photoPayloadRaw) {
        try {
          const parsed = JSON.parse(photoPayloadRaw) as EditorElement;
          if (parsed.kind === 'photo' && parsed.sourceUrl) photoPayload = parsed;
        } catch (error) {
          console.error('[TECKSTUDIO] Invalid dragged photo payload:', error);
        }
      }
      const imageSrc = photoPayload?.sourceUrl || e.dataTransfer?.getData('imageSrc');
      const imageName = photoPayload ? `Photo — ${photoPayload.name}` : e.dataTransfer?.getData('imageName') || 'Uploaded image';

      const findFrameAtPointer = () => {
        const point = new fabric.Point(ptr.x, ptr.y);
        return fc.getObjects().slice().reverse().find((object) => (
          isFrameElementObject(object) &&
          object.visible !== false &&
          object.containsPoint(point)
        ));
      };

      const addImageAtPointer = (src: string, name: string, metadata?: Partial<EditorElement>) => {
        fabric.Image.fromURL(src, (img) => {
          const maxWidth = Math.min(420, fc.getWidth() * 0.6);
          const maxHeight = Math.min(420, fc.getHeight() * 0.6);
          const scale = img.width && img.height ? Math.min(maxWidth / img.width, maxHeight / img.height, 1) : 1;
          const elementMetadata: ElementMetadata | undefined = metadata?.kind === 'photo' ? {
            id: window.crypto?.randomUUID ? `photo-${window.crypto.randomUUID()}` : `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            elementId: metadata.id || 'photo',
            elementKind: 'photo',
            displayName: metadata.name || name.replace(/^Photo\s+—\s+/, ''),
            category: metadata.category || 'Photos',
            subcategory: metadata.subcategory,
            sourceUrl: src,
            thumbnailUrl: metadata.thumbnailUrl,
            previewUrl: metadata.previewUrl,
            isPremium: metadata.isPremium,
            editable: true,
            provider: metadata.provider || 'asset-library',
            licence: metadata.licence || 'Project asset licence',
            photoConfig: {
              ...(metadata.photoConfig || {}),
              alt: metadata.name || name.replace(/^Photo\s+—\s+/, ''),
              naturalWidth: metadata.width,
              naturalHeight: metadata.height,
            },
            config: {
              ...(metadata.photoConfig || {}),
              alt: metadata.name || name.replace(/^Photo\s+—\s+/, ''),
              naturalWidth: metadata.width,
              naturalHeight: metadata.height,
            },
          } : undefined;
          img.set({
            left: ptr.x,
            top: ptr.y,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            name,
            id: elementMetadata?.id || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `img_${Date.now()}_${Math.random().toString(36).slice(2)}`),
            displayName: elementMetadata?.displayName || name,
            objectType: metadata?.kind === 'photo' ? 'photo' : 'image',
            elementId: metadata?.id,
            elementKind: metadata?.kind,
            elementCategory: metadata?.category,
            elementTags: metadata?.tags,
            elementEditable: true,
            elementProvider: metadata?.provider,
            elementLicence: metadata?.licence,
            elementConfig: elementMetadata?.config,
            photoConfig: elementMetadata?.photoConfig,
            elementMetadata,
            sourceUrl: src,
            thumbnailUrl: metadata?.thumbnailUrl,
            provider: metadata?.provider,
            licence: metadata?.licence,
            naturalWidth: img.width || metadata?.width,
            naturalHeight: img.height || metadata?.height,
            mediaMimeType: metadata?.mimeType,
            staticExportSupported: true,
          } as any);
          fc.add(img);
          fc.setActiveObject(img);
          fc.renderAll();
          useEditorStore.getState().saveHistory();
        }, { crossOrigin: 'anonymous' });
      };

      const addImageToFrame = (frameObject: fabric.Object, src: string, name: string, metadata?: Partial<EditorElement>) => {
        fabric.Image.fromURL(src, (img) => {
          if (!img.width || !img.height) {
            console.error('[TECKSTUDIO] Unable to fill frame because image has no dimensions.');
            return;
          }
          const frameId = String(frameObject.get('id' as keyof fabric.Object) || frameObject.get('elementId' as keyof fabric.Object) || `frame_${Date.now()}`);
          const clipBounds = getFrameClipBoundsForObject(frameObject);
          const scale = Math.max(clipBounds.width / img.width, clipBounds.height / img.height);
          const oldFrameImages = fc.getObjects().filter((object) => (
            object.get('frameRole' as keyof fabric.Object) === 'content' &&
            object.get('frameId' as keyof fabric.Object) === frameId
          ));
          oldFrameImages.forEach((object) => fc.remove(object));
          img.set({
            left: clipBounds.left + clipBounds.width / 2,
            top: clipBounds.top + clipBounds.height / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            clipPath: createFrameClipPathForObject(frameObject),
            name: `Framed Photo — ${metadata?.name || name.replace(/^Photo\s+—\s+/, '')}`,
            id: window.crypto?.randomUUID ? `frame-photo-${window.crypto.randomUUID()}` : `frame_photo_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            displayName: metadata?.name || name,
            objectType: 'photo',
            elementKind: 'photo',
            elementEditable: true,
            elementId: metadata?.id || 'framed-photo',
            elementCategory: metadata?.category || 'Photos',
            elementTags: metadata?.tags || [],
            elementProvider: metadata?.provider || 'asset-library',
            elementLicence: metadata?.licence || 'Project asset licence',
            sourceUrl: src,
            thumbnailUrl: metadata?.thumbnailUrl,
            originalWidth: img.width || metadata?.width,
            originalHeight: img.height || metadata?.height,
            naturalWidth: img.width || metadata?.width,
            naturalHeight: img.height || metadata?.height,
            mediaMimeType: metadata?.mimeType,
            frameId,
            frameRole: 'content',
            clipRole: 'image',
            frameConfig: frameObject.get('frameConfig' as keyof fabric.Object),
            photoConfig: {
              ...(metadata?.photoConfig || {}),
              alt: metadata?.name || name,
              naturalWidth: img.width || metadata?.width,
              naturalHeight: img.height || metadata?.height,
              imageScale: scale,
            },
            staticExportSupported: true,
          } as Record<string, unknown>);
          fc.add(img);
          frameObject.bringToFront();
          fc.setActiveObject(img);
          fc.requestRenderAll();
          useEditorStore.getState().setSelectedObject(img);
          useEditorStore.getState().saveHistory();
        }, { crossOrigin: 'anonymous' });
      };

      if (imageSrc) {
        const targetFrame = findFrameAtPointer();
        if (targetFrame) addImageToFrame(targetFrame, imageSrc, imageName, photoPayload || undefined);
        else addImageAtPointer(imageSrc, imageName, photoPayload || undefined);
        return;
      }

      const droppedFile = Array.from(e.dataTransfer?.files || []).find((file) => file.type.startsWith('image/'));
      const droppedVideo = Array.from(e.dataTransfer?.files || []).find((file) => file.type.startsWith('video/'));
      if (droppedVideo) {
        const sourceUrl = URL.createObjectURL(droppedVideo);
        void insertDynamicMediaAsset(fc, {
          type: 'video',
          sourceUrl,
          name: droppedVideo.name,
          mimeType: droppedVideo.type,
          loop: true,
          muted: false,
        }, ptr).then((object) => {
          useEditorStore.getState().setSelectedObject(object);
          return useEditorStore.getState().saveHistory();
        }).catch((error) => {
          URL.revokeObjectURL(sourceUrl);
          console.error('[TECKSTUDIO] Unable to add dropped video:', error);
        });
        return;
      }
      if (droppedFile) {
        void uploadImageAsset(droppedFile, projectId).then((asset) => (
          addUploadedImageToCanvas(fc, asset, ptr)
        )).then((object) => {
          useEditorStore.getState().setSelectedObject(object);
          useEditorStore.getState().saveHistory();
          window.dispatchEvent(new Event('teckstudio:uploads-changed'));
        }).catch((error) => {
          console.error('[TECKSTUDIO] Unable to upload dropped image:', error);
          window.alert(error instanceof Error ? error.message : 'Unable to upload the dropped image.');
        });
        return;
      }

      const shapeType = e.dataTransfer?.getData('shapeType');
      if (!fc || !shapeType) return;
      const { fillColor: fill, strokeColor: stroke, strokeWidth: sw } = useEditorStore.getState();
      let s: fabric.Object | null = null;
      const sOpts = { fill, stroke: sw > 0 ? stroke : undefined, strokeWidth: sw };

      switch (shapeType) {
        case 'rectangle': s = createDiagramBoxElement('shape-rounded-rectangle'); break;
        case 'circle': s = new fabric.Circle({ left: ptr.x - 60, top: ptr.y - 60, radius: 60, ...sOpts }); break;
        case 'triangle': s = new fabric.Triangle({ left: ptr.x - 65, top: ptr.y - 55, width: 130, height: 110, ...sOpts }); break;
        case 'line': s = new fabric.Line([ptr.x - 100, ptr.y, ptr.x + 100, ptr.y], { stroke: stroke || '#000000', strokeWidth: sw > 0 ? sw : 4 }); break;
        case 'arrow': s = new fabric.Path('M 0 10 L 80 10 L 80 0 L 110 15 L 80 30 L 80 20 L 0 20 Z', { left: ptr.x - 55, top: ptr.y - 15, ...sOpts }); break;
        case 'star': s = new fabric.Path('M 50 0 L 65 35 L 100 35 L 72 57 L 83 91 L 50 70 L 17 91 L 28 57 L 0 35 L 35 35 Z', { left: ptr.x - 50, top: ptr.y - 45, ...sOpts }); break;
      }
      if (s) {
        if (s.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramBox') {
          addObjectToCanvas(fc, s, ptr);
        } else {
          fc.add(s);
          fc.setActiveObject(s);
          fc.renderAll();
        }
        useEditorStore.getState().saveHistory();
      }
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', handleDrop);
    return () => { el.removeEventListener('dragover', handleDragOver); el.removeEventListener('drop', handleDrop); };
  }, [projectId]);

  const previewViewportTransform = canvas?.viewportTransform
    || [zoom, 0, 0, zoom, 0, 0];
  const previewScaleX = Number(previewViewportTransform[0]) || zoom || 1;
  const previewScaleY = Number(previewViewportTransform[3]) || previewScaleX;
  const previewLeft = Number(previewViewportTransform[4]) || 0;
  const previewTop = Number(previewViewportTransform[5]) || 0;
  const previewFrameStyle = {
    left: previewLeft,
    top: previewTop,
    width: canvasWidth * previewScaleX,
    height: canvasHeight * previewScaleY,
  };
  const transformedCanvasLayerStyle = {
    width: canvasWidth,
    height: canvasHeight,
    transformOrigin: '0 0',
    transform: `matrix(${previewViewportTransform.join(',')})`,
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full overflow-hidden relative select-none bg-[#09090f]"
      data-canvas-area
      style={{
        backgroundImage: 'radial-gradient(circle at center, rgba(139,92,246,0.08), transparent 32%), radial-gradient(rgba(148,163,184,0.13) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 28px 28px',
      }}
    >
      {isProjectLoading && (
        <div className="absolute top-5 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-violet-400/30 bg-zinc-950/95 px-4 py-2 text-xs font-semibold text-violet-100 shadow-xl shadow-black/30">
          Loading design canvas…
        </div>
      )}

      {projectLoadError && (
        <div className="absolute top-5 left-1/2 z-30 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-rose-500/30 bg-rose-950/95 p-4 text-sm text-rose-50 shadow-xl shadow-black/40">
          <div className="font-bold">Canvas could not load</div>
          <div className="mt-1 text-xs leading-5 text-rose-100/80">{projectLoadError}</div>
          <div className="mt-3 flex gap-2">
            {projectId && (
              <button type="button" onClick={() => loadProject(projectId)} className="rounded-xl bg-rose-200 px-3 py-1.5 text-xs font-bold text-rose-950 hover:bg-white">
                Retry
              </button>
            )}
            <button type="button" onClick={clearProjectLoadError} className="rounded-xl border border-rose-200/30 px-3 py-1.5 text-xs font-bold text-rose-100 hover:bg-rose-500/10">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {hasSceneOverview && !sceneOverviewOpen && (
        <button
          type="button"
          onClick={openSceneOverview}
          className="absolute left-5 top-5 z-20 rounded-xl border border-violet-400/40 bg-zinc-950/85 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-100 shadow-xl shadow-black/30 backdrop-blur hover:border-cyan-300/60 hover:text-cyan-100"
        >
          Scenes
        </button>
      )}

      {hasSceneOverview && sceneOverviewOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-auto bg-[#111118]/95 px-6 py-8 backdrop-blur-sm">
          <div className="w-full max-w-7xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300">TECKSTUDIO</div>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.18em] text-zinc-50">
                  My {sceneCards.length} Poster Scenes
                </h2>
                <p className="mt-2 text-xs text-zinc-500">
                  Select one scene to open it in the existing Fabric editor.
                </p>
              </div>
              <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                {isPreparingSceneOverview ? 'Updating previews…' : `${sceneCards.length} scenes ready`}
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-5 lg:gap-6">
              {sceneCards.map((scene) => {
                const isSelected = scene.id === activeSceneId;
                const aspectRatio = `${scene.dimensions.width} / ${scene.dimensions.height}`;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => void openSceneForEditing(scene)}
                    className={`group flex w-[176px] flex-col rounded-2xl border bg-zinc-950/85 p-2.5 text-left shadow-xl shadow-black/25 transition-all duration-150 hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-[0_18px_42px_rgba(8,47,73,0.28)] ${
                      isSelected
                        ? 'border-violet-400 ring-2 ring-violet-400/35 shadow-[0_0_20px_rgba(139,92,246,0.22)]'
                        : 'border-zinc-700/80'
                    }`}
                    aria-label={`Open scene ${sceneNumber(scene.index)}`}
                  >
                    <div
                      className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-[radial-gradient(circle_at_center,rgba(63,63,70,0.32),rgba(9,9,11,0.95))] p-2"
                      style={{ aspectRatio }}
                    >
                      <div className={`absolute left-2 top-2 z-10 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-black ${
                        isSelected
                          ? 'border-violet-300/70 bg-violet-500/25 text-violet-50'
                          : 'border-zinc-600/80 bg-black/45 text-zinc-200'
                      }`}>
                        {sceneNumber(scene.index)}
                      </div>
                      {scene.duration && (
                        <div className="absolute right-2 top-2 z-10 rounded-md border border-zinc-600/80 bg-black/45 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-200">
                          {scene.duration}
                        </div>
                      )}
                      {scene.thumbnail ? (
                        <img
                          src={scene.thumbnail}
                          alt={`Scene ${sceneNumber(scene.index)} preview`}
                          className="h-full w-full rounded-lg object-contain shadow-[0_0_0_1px_rgba(255,255,255,0.10)] transition-transform duration-150 group-hover:scale-[1.015]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-zinc-700 px-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                          Poster Preview
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex w-full items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-bold text-zinc-100">{scene.name}</div>
                        <div className="mt-0.5 text-[9px] text-zinc-500">
                          {Math.round(scene.dimensions.width)} × {Math.round(scene.dimensions.height)}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-100">
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="teckstudio-main-preview absolute inset-0 z-0 overflow-hidden">
        <div
          className="pointer-events-none absolute z-[1] rounded-[10px] border border-white/70 bg-white/[0.018] shadow-[0_26px_80px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.10)]"
          style={previewFrameStyle}
          aria-hidden="true"
        />
        <canvas ref={canvasRef} />
        <canvas
          ref={previewCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`pointer-events-none absolute left-0 top-0 z-[8] ${timelinePreviewActive ? 'block' : 'hidden'}`}
          style={transformedCanvasLayerStyle}
          aria-hidden="true"
        />
        <PageSelectionOverlay />

        {showSafeArea && (
          <div className="pointer-events-none absolute left-0 top-0 z-[9]" style={transformedCanvasLayerStyle}>
            <div
              className="absolute border-2 border-dashed border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              style={{
                left: safeAreaMargin,
                top: safeAreaMargin,
                width: canvasWidth - safeAreaMargin * 2,
                height: canvasHeight - safeAreaMargin * 2,
              }}
            >
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-950/90 text-[9px] font-bold text-cyan-300 rounded border border-cyan-500/50 shadow">
                Poster Safe Area ({Math.round(canvasWidth)} × {Math.round(canvasHeight)})
              </div>
            </div>
          </div>
        )}

        {showGrid && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-[9]"
            style={{
              ...transformedCanvasLayerStyle,
              backgroundImage: `linear-gradient(to right, rgba(139, 92, 246, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 92, 246, 0.2) 1px, transparent 1px)`,
              backgroundSize: '108px 108px',
            }}
          />
        )}
      </div>
    </div>
  );
};
