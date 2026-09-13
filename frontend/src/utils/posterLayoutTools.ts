import { fabric } from 'fabric';
import type { ConnectorAnchor, DiagramConnectorConfig } from './architectureDiagramTypes';
import {
  createDiagramConnector,
  ensureConnectableObjectId,
  isConnectableDiagramObject,
  removeConnectorsForNode,
  updateAllDiagramConnectors,
} from './diagramConnectors';
import {
  isCanvasLayerObject,
  isDiagramConnectorObject,
  isPinnedBackgroundObject,
  syncCanvasLayerIndices,
} from './layerOrdering';

type LayoutNode = {
  object: fabric.Object;
  id: string;
  bounds: { left: number; top: number; width: number; height: number };
  text: string;
};

export type PosterTidyResult = {
  ok: boolean;
  message: string;
  connectors: number;
};

const textTypes = new Set(['text', 'textbox', 'i-text']);

const objectText = (object: fabric.Object): string => {
  if (textTypes.has(object.type || '')) return String((object as fabric.Textbox).text || '');
  if (object.type === 'group') {
    return (object as fabric.Group).getObjects().map(objectText).join(' ');
  }
  return String(object.get('name' as keyof fabric.Object) || '');
};

const objectCenter = (object: fabric.Object) => {
  const bounds = object.getBoundingRect(true, true);
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
};

const moveObjectCenterTo = (object: fabric.Object, x: number, y: number) => {
  const center = objectCenter(object);
  object.set({
    left: (object.left || 0) + (x - center.x),
    top: (object.top || 0) + (y - center.y),
  });
  object.setCoords();
};

const sortByCenterX = (nodes: LayoutNode[]) => (
  [...nodes].sort((left, right) => objectCenter(left.object).x - objectCenter(right.object).x)
);

const chooseCenterNode = (nodes: LayoutNode[], canvas: fabric.Canvas) => {
  const canvasCenterX = canvas.getWidth() / 2;
  const exact = nodes.find((node) => {
    const normalized = node.text.toLowerCase().replace(/\s+/g, ' ');
    return normalized.includes('ai chat') && normalized.includes('system');
  });
  if (exact) return exact;

  return [...nodes].sort((left, right) => {
    const leftCenter = objectCenter(left.object);
    const rightCenter = objectCenter(right.object);
    const leftScore = Math.abs(leftCenter.x - canvasCenterX) - leftCenter.y * 0.2;
    const rightScore = Math.abs(rightCenter.x - canvasCenterX) - rightCenter.y * 0.2;
    return leftScore - rightScore;
  })[0];
};

const getCandidateNodes = (canvas: fabric.Canvas, selectedObjects?: fabric.Object[]) => {
  const source = selectedObjects && selectedObjects.length > 0 ? selectedObjects : canvas.getObjects();
  return source
    .filter((object) => (
      isConnectableDiagramObject(object)
      && !isPinnedBackgroundObject(object)
      && !isDiagramConnectorObject(object)
    ))
    .map((object): LayoutNode => ({
      object,
      id: ensureConnectableObjectId(object),
      bounds: object.getBoundingRect(true, true),
      text: objectText(object),
    }));
};

const normalizePosterStack = (canvas: fabric.Canvas) => {
  const objects = canvas.getObjects();
  const backgrounds = objects.filter(isPinnedBackgroundObject);
  const connectors = objects.filter((object) => isCanvasLayerObject(object) && isDiagramConnectorObject(object));
  const regular = objects.filter((object) => (
    isCanvasLayerObject(object)
    && !isPinnedBackgroundObject(object)
    && !isDiagramConnectorObject(object)
  ));
  const shapes = regular.filter((object) => !textTypes.has(object.type || ''));
  const text = regular.filter((object) => textTypes.has(object.type || ''));
  const overlays = objects.filter((object) => !isCanvasLayerObject(object));

  [...backgrounds, ...connectors, ...shapes, ...text, ...overlays].forEach((object, index) => {
    canvas.moveTo(object, index);
  });
  syncCanvasLayerIndices(canvas);
};

export const removeStrayConnectorMarkers = (canvas: fabric.Canvas) => {
  const helperTypes = new Set([
    'diagramAnchor',
    'diagramBendHandle',
    'diagramEndpointHandle',
    'diagramConnectorPreview',
    'editorGuide',
  ]);
  const connectorDecorationRoles = new Set([
    'diagramConnectorStart',
    'diagramConnectorEnd',
    'diagramConnectorLabel',
  ]);
  const connectorPathIds = new Set(canvas.getObjects()
    .filter((object) => object.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramConnectorPath')
    .map((object) => String(object.get('diagramConnectorId' as keyof fabric.Object) || ''))
    .filter(Boolean));
  const stray = canvas.getObjects().filter((object) => {
    const name = String(object.get('name' as keyof fabric.Object) || '');
    const objectType = String(object.get('objectType' as keyof fabric.Object) || '');
    const teckstudioObjectType = String(object.get('teckstudioObjectType' as keyof fabric.Object) || '');
    const role = String(object.get('diagramConnectorRole' as keyof fabric.Object) || '');
    const connectorId = String(object.get('diagramConnectorId' as keyof fabric.Object) || '');
    const isEditorHelper = (
      object.get('editorOnly' as keyof fabric.Object) === true
      || object.get('excludeFromSave' as keyof fabric.Object) === true
      || object.get('isEditorHelper' as keyof fabric.Object) === true
      || helperTypes.has(objectType)
      || helperTypes.has(teckstudioObjectType)
    );
    const isOrphanConnectorDecoration = (
      connectorDecorationRoles.has(role)
      && (!connectorId || !connectorPathIds.has(connectorId))
    );
    return (
      isEditorHelper
      || isOrphanConnectorDecoration
      || (
        name.startsWith('Diagram connector — diagramConnector')
        && !role
        && !connectorId
      )
    );
  });
  stray.forEach((object) => canvas.remove(object));
  return stray.length;
};

const connectorConfig = (
  source: LayoutNode,
  target: LayoutNode,
  sourceAnchor: ConnectorAnchor,
  targetAnchor: ConnectorAnchor,
): DiagramConnectorConfig => ({
  connectorId: `tidy-${source.id}-to-${target.id}`,
  sourceNodeId: source.id,
  targetNodeId: target.id,
  sourceObjectId: source.id,
  targetObjectId: target.id,
  sourceAnchor,
  targetAnchor,
  routing: 'straight',
  connectorType: 'straight',
  style: 'solid',
  lineStyle: 'solid',
  color: '#43D68A',
  width: 3,
  opacity: 0.9,
  startArrow: 'none',
  endArrow: 'arrow',
  arrowSize: 15,
  label: '',
  labelVisible: false,
});

export const tidyPosterLayout = (
  canvas: fabric.Canvas,
  selectedObjects?: fabric.Object[],
): PosterTidyResult => {
  removeStrayConnectorMarkers(canvas);
  const nodes = getCandidateNodes(canvas, selectedObjects);
  if (nodes.length < 6) {
    return {
      ok: false,
      message: 'Select the five outer boxes and the AI CHAT SYSTEM node, or keep only those diagram nodes on the canvas.',
      connectors: 0,
    };
  }

  const centerNode = chooseCenterNode(nodes, canvas);
  const outerNodes = nodes.filter((node) => node !== centerNode);
  const centerPoint = objectCenter(centerNode.object);
  const topNodes = sortByCenterX(
    outerNodes
      .filter((node) => objectCenter(node.object).y < centerPoint.y)
      .sort((left, right) => objectCenter(left.object).y - objectCenter(right.object).y)
      .slice(0, 3),
  );
  const sideCandidates = outerNodes.filter((node) => !topNodes.includes(node));
  const leftNode = [...sideCandidates].sort((left, right) => objectCenter(left.object).x - objectCenter(right.object).x)[0];
  const rightNode = [...sideCandidates].sort((left, right) => objectCenter(right.object).x - objectCenter(left.object).x)[0];

  if (topNodes.length !== 3 || !leftNode || !rightNode || leftNode === rightNode) {
    return {
      ok: false,
      message: 'Could not identify exactly three top boxes plus balanced left/right boxes.',
      connectors: 0,
    };
  }

  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const topY = Math.max(150, Math.round(height * 0.2));
  const sideY = Math.round(height * 0.52);
  const centerY = Math.min(height - 180, Math.round(height * 0.76));
  const topXs = [Math.round(width * 0.22), Math.round(width * 0.5), Math.round(width * 0.78)];
  const sideOffset = Math.round(width * 0.28);

  topNodes.forEach((node, index) => moveObjectCenterTo(node.object, topXs[index], topY));
  moveObjectCenterTo(leftNode.object, width / 2 - sideOffset, sideY);
  moveObjectCenterTo(rightNode.object, width / 2 + sideOffset, sideY);
  moveObjectCenterTo(centerNode.object, width / 2, centerY);

  const nodeIds = [centerNode, ...topNodes, leftNode, rightNode].map((node) => node.id);
  nodeIds.forEach((nodeId) => removeConnectorsForNode(canvas, nodeId));

  const connectorPairs: Array<[LayoutNode, ConnectorAnchor, ConnectorAnchor]> = [
    [topNodes[0], 'bottom', 'top-left'],
    [topNodes[1], 'bottom', 'top'],
    [topNodes[2], 'bottom', 'top-right'],
    [leftNode, 'right', 'left'],
    [rightNode, 'left', 'right'],
  ];
  let connectorCount = 0;
  connectorPairs.forEach(([source, sourceAnchor, targetAnchor]) => {
    connectorCount += createDiagramConnector(canvas, connectorConfig(source, centerNode, sourceAnchor, targetAnchor)).length > 0 ? 1 : 0;
  });

  updateAllDiagramConnectors(canvas);
  normalizePosterStack(canvas);
  canvas.discardActiveObject();
  canvas.requestRenderAll();

  return {
    ok: true,
    message: `Aligned ${topNodes.length + 3} nodes and rebuilt ${connectorCount} anchored connectors.`,
    connectors: connectorCount,
  };
};
