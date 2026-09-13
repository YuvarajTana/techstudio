import { fabric } from 'fabric';
import type {
  AnimationElementConfig,
  ChartElementConfig,
  EditorElement,
  ElementMetadata,
  ElementKind,
  FrameElementConfig,
  FormElementConfig,
  ShapeElementConfig,
  TableElementConfig,
  ThreeDElementConfig,
  VideoElementConfig,
} from '../types/elements';

export type LegacyElementKind = 'image' | 'graphic' | 'code' | 'music' | 'sound-effect' | 'voiceover' | 'grid';
export type EditorElementKind = ElementKind | LegacyElementKind;

export type EditorElementPayload = {
  kind: EditorElementKind;
  id: string;
  element?: EditorElement;
};

export type ElementFactoryStyles = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export const CUSTOM_FABRIC_PROPERTIES = [
  'id',
  'objectId',
  'layerIndex',
  'baseState',
  'baseAnimationState',
  'originalText',
  'targetWidth',
  'targetHeight',
  'posterTemplateId',
  'posterTemplateName',
  'name',
  'selectable',
  'hasControls',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
  'lockUniScaling',
  'locked',
  'objectType',
  'assetId',
  'assetUrl',
  'assetCategory',
  'sourceUrl',
  'thumbnailUrl',
  'fitMode',
  'backgroundMode',
  'blurAmount',
  'overlayOpacity',
  'backgroundColor',
  'smartFitPairId',
  'isSmartFitBackground',
  'isSmartFitForeground',
  'originalWidth',
  'originalHeight',
  'naturalWidth',
  'naturalHeight',
  'category',
  'subcategory',
  'displayName',
  'elementId',
  'elementKind',
  'elementCategory',
  'elementSubcategory',
  'elementTags',
  'elementMetadata',
  'elementEditable',
  'elementConfig',
  'elementProvider',
  'elementLicence',
  'previewUrl',
  'modelUrl',
  'assetMetadata',
  'layoutId',
  'gap',
  'gridId',
  'gridCellIndex',
  'gridRows',
  'gridColumns',
  'textRole',
  'stylePresetId',
  'highlightPresetConfig',
  'teckstudioObjectType',
  'teckstudioAssetType',
  'teckstudioImageSource',
  'teckstudioGeneratedAssetId',
  'teckstudioPrompt',
  'teckstudioRequestId',
  'teckstudioGenerationId',
  'teckstudioGeneration',
  'teckstudioProvider',
  'posterRole',
  'posterField',
  'posterCardIndex',
  'posterSpec',
  'posterSpecTheme',
  'posterSpecCanvasWidth',
  'posterSpecCanvasHeight',
  'editorialRole',
  'editorialTagId',
  'editorialTagRole',
  'tagPaddingX',
  'tagPaddingY',
  'tagManualWidth',
  'tagActive',
  'gridSize',
  'gridOpacity',
  'gridLineWidth',
  'gridColor',
  'borderInset',
  'borderOpacity',
  'architectureRole',
  'architectureNodeId',
  'architectureNodeConfig',
  'architectureIcon',
  'architectureIconColor',
  'architectureIconSize',
  'architectureAccentColor',
  'architectureAutoSize',
  'architectureManualWidth',
  'architectureSymbolCategory',
  'architectureSymbolName',
  'architectureChipId',
  'architectureChipText',
  'architectureStageIndex',
  'architectureSegmentColors',
  'architectureSegmentColor',
  'architectureSegmentGap',
  'architectureSegmentHeight',
  'technicalGridConfig',
  'stageTrackerConfig',
  'diagramConnectorId',
  'diagramConnectorRole',
  'diagramConnectorConfig',
  'diagramArrowStyle',
  'diagramArrowConfig',
  'diagramAnchorNodeId',
  'diagramAnchorPosition',
  'diagramBendHandleConnectorId',
  'connectorSourceNodeId',
  'connectorTargetNodeId',
  'connectorSourceObjectId',
  'connectorTargetObjectId',
  'connectorSourceAnchor',
  'connectorTargetAnchor',
  'connectorRouting',
  'connectorLineStyle',
  'connectorBendOffset',
  'connectorCurvature',
  'connectorArrowheadColor',
  'editorOnly',
  'excludeFromExport',
  'excludeFromSave',
  'isEditorHelper',
  'isConnectorHandle',
  'brandKitId',
  'brandKitName',
  'brandRole',
  'brandAppliedAt',
  'stickerId',
  'stickerName',
  'stickerCategory',
  'stickerFileType',
  'stickerTintColor',
  'isPremium',
  'fontId',
  'fontSource',
  'fontUrl',
  'fontLicence',
  'fontReferences',
  'textEffectConfig',
  'textEffectBaseStyle',
  'imageEffectConfig',
  'filtersConfig',
  'cropConfig',
  'originalCropState',
  'imageCornerRadius',
  'imageLockedAspectRatio',
  'posterFitData',
  'uploadMetadata',
  'ocrSourceAssetId',
  'ocrConfidence',
  'posterConversionId',
  'posterConversionRole',
  'posterConversionMode',
  'posterSourceAssetId',
  'posterCleanAssetId',
  'posterAnalysisJobId',
  'posterReferenceMode',
  'posterPalette',
  'posterWarnings',
  'posterTextBlockId',
  'posterTextBlock',
  'posterOriginalText',
  'posterOriginalOcrText',
  'posterCurrentText',
  'posterConverted',
  'posterNormalizedBoundingBox',
  'posterFontMatch',
  'posterOcrRegions',
  'posterConvertedRegionIds',
  'posterSourceDimensions',
  'posterDisplayTransform',
  'posterOriginalObjectState',
  'posterEditableAsset',
  'posterConversionSummary',
  'posterTextRole',
  'posterRegionId',
  'posterPatchAssetId',
  'posterCleanPatchId',
  'posterOwnerTextId',
  'posterPatchUrl',
  'posterSourceBoundingBox',
  'posterNormalizedPatchBox',
  'posterRegionConfig',
  'posterMaskAssetId',
  'posterMaskUrl',
  'excludeFromLayers',
  'teckstudioEffects',
  'effectGroupId',
  'effectGroupRole',
  'effectOffsetX',
  'effectOffsetY',
  'effectLayerIndex',
  'sourceObjectId',
  'generatedEffectLayer',
  'originalImageUrl',
  'processedImageUrl',
  'personMaskUrl',
  'processingMetadata',
  'data',
  'shapeConfig',
  'photoConfig',
  'mediaKind',
  'mediaDuration',
  'mediaMimeType',
  'threeDEffectVariant',
  'frameConfig',
  'chartConfig',
  'tableConfig',
  'formConfig',
  'animationConfig',
  'threeDConfig',
  'videoConfig',
  'videoSrc',
  'videoPosterFrame',
  'videoMimeType',
  'videoLoop',
  'videoMuted',
  'timelineStart',
  'timelineEnd',
  'timelineTrimStart',
  'timelineTrimEnd',
  'timelineKeyframes',
  'objectAnimations',
  'timelineBaseVisible',
  'chromaKeyConfig',
  'segmentationMaskUrl',
  'isAnimated',
  'frameId',
  'frameRole',
  'clipRole',
  'staticExportSupported',
  'animatedExportSupported',
];

const owned = <T extends Omit<EditorElement, 'provider' | 'licence'>>(item: T): EditorElement => ({
  provider: 'teckstudio',
  licence: 'Application-owned editable element',
  ...item,
});

const shapeElement = (
  id: string,
  name: string,
  category: string,
  tags: string[],
  shapeConfig: ShapeElementConfig = {},
): EditorElement => owned({
  id,
  name,
  kind: 'shape',
  category,
  tags: Array.from(new Set(['shape', category.toLowerCase(), ...tags])),
  shapeConfig: {
    shapeType: id,
    category,
    ...shapeConfig,
  },
});

export const SHAPE_ELEMENTS: EditorElement[] = [
  shapeElement('line-straight', 'Straight Line', 'Lines and Connectors', ['line', 'straight', 'divider'], { geometry: 'line', lineCap: 'round' }),
  shapeElement('line-dashed', 'Dashed Line', 'Lines and Connectors', ['line', 'dash', 'dashed', 'divider'], { geometry: 'line', strokeDashArray: [18, 12], lineCap: 'round' }),
  shapeElement('line-dotted', 'Dotted Line', 'Lines and Connectors', ['line', 'dot', 'dotted', 'divider'], { geometry: 'line', strokeDashArray: [2, 14], lineCap: 'round' }),
  shapeElement('line-curved', 'Curved Line', 'Lines and Connectors', ['curve', 'line', 'bezier'], { geometry: 'path', lineCap: 'round' }),
  shapeElement('line-wavy', 'Wavy Line', 'Lines and Connectors', ['line', 'wave', 'wavy', 'decorative'], { geometry: 'path', lineCap: 'round' }),
  shapeElement('line-zigzag', 'Zigzag Line', 'Lines and Connectors', ['line', 'zigzag', 'decorative'], { geometry: 'path', lineJoin: 'round' }),
  shapeElement('line-connector', 'Connector', 'Lines and Connectors', ['connector', 'flowchart', 'line'], { geometry: 'path', lineJoin: 'round' }),
  shapeElement('line-elbow-connector', 'Elbow Connector', 'Lines and Connectors', ['connector', 'elbow', 'flowchart', 'line'], { geometry: 'path', lineJoin: 'round' }),
  shapeElement('line-arrow', 'Arrow Line', 'Arrows', ['line', 'arrow', 'direction'], { geometry: 'group', arrowhead: 'end' }),
  shapeElement('line-double-arrow', 'Double Arrow Line', 'Arrows', ['line', 'arrow', 'double'], { geometry: 'group', arrowhead: 'both' }),
  shapeElement('arrow-left', 'Left Arrow', 'Arrows', ['arrow', 'left'], { geometry: 'path', arrowhead: 'end' }),
  shapeElement('arrow-right', 'Right Arrow', 'Arrows', ['arrow', 'right'], { geometry: 'path', arrowhead: 'end' }),
  shapeElement('arrow-up', 'Up Arrow', 'Arrows', ['arrow', 'up'], { geometry: 'path', arrowhead: 'end' }),
  shapeElement('arrow-down', 'Down Arrow', 'Arrows', ['arrow', 'down'], { geometry: 'path', arrowhead: 'end' }),
  shapeElement('arrow-double', 'Double Arrow', 'Arrows', ['arrow', 'double'], { geometry: 'path', arrowhead: 'both' }),
  shapeElement('arrow-chevron', 'Chevron', 'Arrows', ['chevron', 'arrow'], { geometry: 'path' }),
  shapeElement('arrow-curved', 'Curved Arrow', 'Arrows', ['arrow', 'curved', 'bend'], { geometry: 'path', arrowhead: 'end' }),
  shapeElement('arrow-circular', 'Circular Arrow', 'Arrows', ['arrow', 'circle', 'circular', 'round', 'refresh', 'loop'], { geometry: 'path', arrowhead: 'end' }),
  shapeElement('shape-square', 'Square', 'Basic Shapes', ['square', 'box'], { geometry: 'rect' }),
  shapeElement('shape-rectangle', 'Rectangle', 'Basic Shapes', ['rectangle', 'card'], { geometry: 'rect' }),
  shapeElement('shape-rounded-rectangle', 'Rounded Rectangle', 'Basic Shapes', ['rounded', 'rectangle', 'card'], { geometry: 'rect', cornerRadius: 24 }),
  shapeElement('shape-circle', 'Circle', 'Basic Shapes', ['circle', 'round'], { geometry: 'ellipse' }),
  shapeElement('shape-ellipse', 'Ellipse', 'Basic Shapes', ['ellipse', 'oval'], { geometry: 'ellipse' }),
  shapeElement('shape-triangle-up', 'Triangle', 'Basic Shapes', ['triangle', 'up'], { geometry: 'polygon', polygonSides: 3 }),
  shapeElement('shape-triangle-down', 'Inverted Triangle', 'Basic Shapes', ['triangle', 'down', 'inverted'], { geometry: 'polygon', polygonSides: 3 }),
  shapeElement('shape-diamond', 'Diamond', 'Basic Shapes', ['diamond', 'rhombus'], { geometry: 'polygon', polygonSides: 4 }),
  shapeElement('shape-pill', 'Pill', 'Basic Shapes', ['pill', 'capsule', 'button'], { geometry: 'rect', cornerRadius: 39 }),
  shapeElement('shape-arch', 'Arch', 'Basic Shapes', ['arch', 'window'], { geometry: 'path' }),
  shapeElement('shape-semicircle', 'Semicircle', 'Basic Shapes', ['semicircle', 'half circle'], { geometry: 'path' }),
  shapeElement('shape-cross', 'Cross', 'Basic Shapes', ['cross', 'plus', 'basic'], { geometry: 'path' }),
  shapeElement('polygon-pentagon', 'Pentagon', 'Polygons', ['polygon', 'pentagon', 'five sides'], { geometry: 'polygon', polygonSides: 5 }),
  shapeElement('polygon-hexagon', 'Hexagon', 'Polygons', ['polygon', 'hexagon', 'six sides'], { geometry: 'polygon', polygonSides: 6 }),
  shapeElement('polygon-heptagon', 'Heptagon', 'Polygons', ['polygon', 'heptagon', 'seven sides'], { geometry: 'polygon', polygonSides: 7 }),
  shapeElement('polygon-octagon', 'Octagon', 'Polygons', ['polygon', 'octagon', 'eight sides'], { geometry: 'polygon', polygonSides: 8 }),
  shapeElement('polygon-decagon', 'Decagon', 'Polygons', ['polygon', 'decagon', 'ten sides'], { geometry: 'polygon', polygonSides: 10 }),
  shapeElement('star-four', 'Four-point Star', 'Stars and Bursts', ['star', 'four point', 'sparkle'], { geometry: 'path', starInnerRadius: 34 }),
  shapeElement('star-five', 'Five-point Star', 'Stars and Bursts', ['star', 'five point'], { geometry: 'path', starInnerRadius: 34 }),
  shapeElement('star-six', 'Six-point Star', 'Stars and Bursts', ['star', 'six point'], { geometry: 'path', starInnerRadius: 34 }),
  shapeElement('star-eight', 'Eight-point Star', 'Stars and Bursts', ['star', 'eight point', 'badge'], { geometry: 'path', starInnerRadius: 34 }),
  shapeElement('decor-sparkle-small', 'Sparkle', 'Stars and Bursts', ['sparkle', 'star', 'thin'], { geometry: 'path', starInnerRadius: 18 }),
  shapeElement('decor-sparkle-large', 'Tall Sparkle', 'Stars and Bursts', ['sparkle', 'star', 'thin', 'tall'], { geometry: 'path', starInnerRadius: 18 }),
  shapeElement('star-burst', 'Burst', 'Stars and Bursts', ['burst', 'badge', 'spiky'], { geometry: 'path', starInnerRadius: 52 }),
  shapeElement('star-badge', 'Badge', 'Stars and Bursts', ['badge', 'star', 'label'], { geometry: 'path', starInnerRadius: 54 }),
  shapeElement('star-seal', 'Seal', 'Stars and Bursts', ['seal', 'badge', 'certified'], { geometry: 'path', starInnerRadius: 58 }),
  shapeElement('star-sunburst', 'Sunburst', 'Stars and Bursts', ['sunburst', 'burst', 'sun'], { geometry: 'path', starInnerRadius: 48 }),
  shapeElement('shape-blob-soft', 'Blob', 'Organic Shapes', ['blob', 'organic', 'soft'], { geometry: 'path', controlPoints: [{ x: 39, y: 17 }, { x: 207, y: 66 }, { x: 92, y: 210 }] }),
  shapeElement('shape-blob-liquid', 'Organic Shape', 'Organic Shapes', ['blob', 'organic', 'liquid'], { geometry: 'path', controlPoints: [{ x: 18, y: 62 }, { x: 196, y: 24 }, { x: 164, y: 172 }] }),
  shapeElement('shape-organic-abstract', 'Abstract Organic Shape', 'Organic Shapes', ['abstract', 'organic', 'blob'], { geometry: 'path', controlPoints: [{ x: 26, y: 34 }, { x: 210, y: 58 }, { x: 80, y: 196 }] }),
  shapeElement('shape-wave', 'Wave', 'Organic Shapes', ['wave', 'organic', 'fluid'], { geometry: 'path' }),
  shapeElement('shape-cloud', 'Cloud', 'Organic Shapes', ['cloud', 'bubble', 'organic'], { geometry: 'path' }),
  shapeElement('shape-leaf', 'Leaf', 'Organic Shapes', ['leaf', 'nature', 'organic'], { geometry: 'path' }),
  shapeElement('shape-droplet', 'Droplet', 'Organic Shapes', ['drop', 'droplet', 'water', 'organic'], { geometry: 'path' }),
  shapeElement('flow-process', 'Process Flowchart', 'Flowchart Shapes', ['flowchart', 'process', 'rectangle'], { geometry: 'rect' }),
  shapeElement('flow-decision', 'Decision Flowchart', 'Flowchart Shapes', ['flowchart', 'decision', 'diamond'], { geometry: 'polygon', polygonSides: 4 }),
  shapeElement('flow-terminator', 'Terminator Flowchart', 'Flowchart Shapes', ['flowchart', 'terminator', 'pill'], { geometry: 'rect', cornerRadius: 39 }),
  shapeElement('flow-document', 'Document Flowchart', 'Flowchart Shapes', ['flowchart', 'document', 'paper'], { geometry: 'path' }),
  shapeElement('flow-multi-document', 'Multi-document Flowchart', 'Flowchart Shapes', ['flowchart', 'document', 'multi document'], { geometry: 'group' }),
  shapeElement('flow-data', 'Data Flowchart', 'Flowchart Shapes', ['flowchart', 'data', 'input output'], { geometry: 'path' }),
  shapeElement('flow-database', 'Database Flowchart', 'Flowchart Shapes', ['flowchart', 'database', 'cylinder'], { geometry: 'group' }),
  shapeElement('flow-manual-input', 'Manual Input Flowchart', 'Flowchart Shapes', ['flowchart', 'manual input'], { geometry: 'path' }),
  shapeElement('flow-preparation', 'Preparation Flowchart', 'Flowchart Shapes', ['flowchart', 'preparation', 'hexagon'], { geometry: 'polygon', polygonSides: 6 }),
  shapeElement('flow-connector', 'Connector Flowchart', 'Flowchart Shapes', ['flowchart', 'connector', 'circle'], { geometry: 'ellipse' }),
  shapeElement('decor-ribbon-left', 'Ribbon', 'Decorative Shapes', ['ribbon', 'label', 'decorative'], { geometry: 'path' }),
  shapeElement('decor-ribbon-double', 'Banner', 'Decorative Shapes', ['ribbon', 'banner', 'decorative'], { geometry: 'path' }),
  shapeElement('speech-bubble-rounded', 'Speech Bubble', 'Decorative Shapes', ['speech', 'bubble', 'callout'], { geometry: 'path' }),
  shapeElement('speech-bubble-tail', 'Callout Bubble', 'Decorative Shapes', ['speech', 'bubble', 'tail', 'callout'], { geometry: 'path' }),
  shapeElement('speech-bubble-thought', 'Thought Bubble', 'Decorative Shapes', ['thought', 'bubble', 'callout'], { geometry: 'path' }),
  shapeElement('decor-callout', 'Callout', 'Decorative Shapes', ['callout', 'label', 'pointer'], { geometry: 'path' }),
  shapeElement('decor-label-rounded', 'Rounded Label', 'Decorative Shapes', ['rounded', 'label', 'badge'], { geometry: 'rect', cornerRadius: 28 }),
  shapeElement('decor-label-ticket', 'Ticket', 'Decorative Shapes', ['ticket', 'label', 'coupon'], { geometry: 'rect', strokeDashArray: [8, 8] }),
  shapeElement('decor-badge-sale', 'Sale Badge', 'Decorative Shapes', ['badge', 'sale', 'burst'], { geometry: 'path', starInnerRadius: 54 }),
  shapeElement('decor-badge-premium', 'Premium Badge', 'Decorative Shapes', ['badge', 'premium', 'seal'], { geometry: 'path', starInnerRadius: 54 }),
  shapeElement('decor-shield', 'Shield', 'Decorative Shapes', ['shield', 'badge', 'security'], { geometry: 'path' }),
  shapeElement('decor-crown', 'Crown', 'Decorative Shapes', ['crown', 'royal', 'premium'], { geometry: 'path' }),
  shapeElement('decor-heart-outline', 'Heart', 'Decorative Shapes', ['heart', 'love', 'outline'], { geometry: 'path' }),
  shapeElement('decor-leaf-pair', 'Leaf Pair', 'Decorative Shapes', ['leaf', 'botanical', 'decorative'], { geometry: 'path' }),
  shapeElement('decor-floral-sprig', 'Floral Sprig', 'Decorative Shapes', ['floral', 'flower', 'botanical'], { geometry: 'group' }),
  shapeElement('decor-doodle-sun', 'Doodle Sun', 'Decorative Shapes', ['sun', 'doodle', 'decorative'], { geometry: 'group' }),
  shapeElement('decor-doodle-moon', 'Doodle Moon', 'Decorative Shapes', ['moon', 'doodle', 'decorative'], { geometry: 'path' }),
  shapeElement('decor-doodle-cloud', 'Doodle Cloud', 'Decorative Shapes', ['cloud', 'doodle', 'decorative'], { geometry: 'path' }),
  shapeElement('decor-gradient-orb', 'Gradient Orb', 'Decorative Shapes', ['gradient', 'orb', 'circle'], { geometry: 'ellipse' }),
  shapeElement('decor-memphis-dots', 'Memphis Dots', 'Decorative Shapes', ['dots', 'memphis', 'pattern'], { geometry: 'group' }),
  shapeElement('decor-confetti-cluster', 'Confetti Cluster', 'Decorative Shapes', ['confetti', 'celebration', 'decorative'], { geometry: 'group' }),
  shapeElement('icon-social-like', 'Social Like Icon', 'Decorative Shapes', ['social', 'like', 'icon', 'heart'], { geometry: 'group' }),
  shapeElement('icon-social-share', 'Social Share Icon', 'Decorative Shapes', ['social', 'share', 'icon'], { geometry: 'group' }),
  shapeElement('icon-business-chart', 'Business Chart Icon', 'Decorative Shapes', ['business', 'chart', 'icon'], { geometry: 'group' }),
  shapeElement('icon-business-target', 'Business Target Icon', 'Decorative Shapes', ['business', 'target', 'icon'], { geometry: 'group' }),
  shapeElement('icon-tech-chip', 'Technology Chip Icon', 'Decorative Shapes', ['technology', 'chip', 'icon'], { geometry: 'group' }),
  shapeElement('icon-tech-code', 'Code Icon', 'Decorative Shapes', ['technology', 'code', 'icon'], { geometry: 'group' }),
  shapeElement('icon-education-book', 'Education Book Icon', 'Decorative Shapes', ['education', 'book', 'icon'], { geometry: 'group' }),
  shapeElement('icon-education-cap', 'Graduation Cap Icon', 'Decorative Shapes', ['education', 'cap', 'icon'], { geometry: 'group' }),
  shapeElement('icon-healthcare-cross', 'Healthcare Cross Icon', 'Decorative Shapes', ['healthcare', 'medical', 'icon'], { geometry: 'group' }),
  shapeElement('icon-food-cup', 'Food Cup Icon', 'Decorative Shapes', ['food', 'cup', 'icon'], { geometry: 'group' }),
  shapeElement('icon-travel-pin', 'Travel Pin Icon', 'Decorative Shapes', ['travel', 'pin', 'icon'], { geometry: 'group' }),
];

export const FRAME_ELEMENTS: EditorElement[] = [
  owned({ id: 'frame-square', name: 'Square Frame', kind: 'frame', category: 'Basic Frames', tags: ['frame', 'square'], frameConfig: { frameType: 'square', borderWidth: 8, borderColor: '#8b5cf6' } }),
  owned({ id: 'frame-rounded', name: 'Rounded Rectangle', kind: 'frame', category: 'Basic Frames', tags: ['frame', 'rounded', 'rectangle'], frameConfig: { frameType: 'rounded', borderWidth: 8, borderColor: '#8b5cf6', cornerRadius: 28 } }),
  owned({ id: 'frame-circle', name: 'Circle Frame', kind: 'frame', category: 'Basic Frames', tags: ['frame', 'circle'], frameConfig: { frameType: 'circle', borderWidth: 8, borderColor: '#8b5cf6' } }),
  owned({ id: 'frame-triangle', name: 'Triangle Frame', kind: 'frame', category: 'Shapes Frames', tags: ['frame', 'triangle'], frameConfig: { frameType: 'triangle', borderWidth: 8, borderColor: '#8b5cf6' } }),
  owned({ id: 'frame-arch', name: 'Arch Frame', kind: 'frame', category: 'Shapes Frames', tags: ['frame', 'arch'], frameConfig: { frameType: 'arch', borderWidth: 8, borderColor: '#8b5cf6' } }),
  owned({ id: 'frame-organic', name: 'Organic Frame', kind: 'frame', category: 'Shapes Frames', tags: ['organic', 'frame'], frameConfig: { frameType: 'organic', borderWidth: 8, borderColor: '#8b5cf6' } }),
  owned({ id: 'frame-photo-single', name: 'Single Photo Frame', kind: 'frame', category: 'Photo Frames', tags: ['photo', 'frame'], frameConfig: { frameType: 'photo-single', borderWidth: 10, borderColor: '#ffffff' } }),
  owned({ id: 'frame-film-strip', name: 'Film Strip', kind: 'frame', category: 'Photo Frames', tags: ['film', 'strip'], frameConfig: { frameType: 'film-strip', borderWidth: 10, borderColor: '#111827' } }),
  owned({ id: 'frame-polaroid', name: 'Polaroid Frame', kind: 'frame', category: 'Photo Frames', tags: ['polaroid', 'photo'], frameConfig: { frameType: 'polaroid', borderWidth: 12, borderColor: '#ffffff' } }),
  owned({ id: 'frame-phone', name: 'Phone Frame', kind: 'frame', category: 'Device Frames', tags: ['phone', 'device'], frameConfig: { frameType: 'phone', borderWidth: 14, borderColor: '#18181b' } }),
  owned({ id: 'frame-laptop', name: 'Laptop Mockup', kind: 'frame', category: 'Device Frames', tags: ['laptop', 'device'], frameConfig: { frameType: 'laptop', borderWidth: 10, borderColor: '#334155' } }),
  owned({ id: 'frame-browser', name: 'Browser Window Frame', kind: 'frame', category: 'Device Frames', tags: ['browser', 'device'], frameConfig: { frameType: 'browser', borderWidth: 10, borderColor: '#52525b' } }),
  owned({ id: 'frame-torn-paper', name: 'Torn Paper Frame', kind: 'frame', category: 'Paper Frames', tags: ['paper', 'torn', 'vintage'], frameConfig: { frameType: 'torn-paper', borderWidth: 9, borderColor: '#f5f5f4' } }),
  owned({ id: 'frame-note-paper', name: 'Note Paper Frame', kind: 'frame', category: 'Paper Frames', tags: ['paper', 'note'], frameConfig: { frameType: 'note-paper', borderWidth: 8, borderColor: '#fef3c7' } }),
  owned({ id: 'frame-floral-border', name: 'Flower Frame', kind: 'frame', category: 'Decorative Frames', tags: ['floral', 'flowers'], frameConfig: { frameType: 'floral', borderWidth: 10, borderColor: '#fb7185' } }),
  owned({ id: 'frame-botanical', name: 'Botanical Frame', kind: 'frame', category: 'Decorative Frames', tags: ['botanical', 'leaf'], frameConfig: { frameType: 'botanical', borderWidth: 10, borderColor: '#22c55e' } }),
  owned({ id: 'frame-blob', name: 'Organic Blob', kind: 'frame', category: 'Shapes Frames', tags: ['blob', 'organic'], frameConfig: { frameType: 'blob', borderWidth: 9, borderColor: '#a78bfa' } }),
  owned({ id: 'frame-liquid', name: 'Abstract Liquid Frame', kind: 'frame', category: 'Shapes Frames', tags: ['liquid', 'abstract'], frameConfig: { frameType: 'liquid', borderWidth: 9, borderColor: '#06b6d4' } }),
  ...([
    ['frame-heart', 'Heart Frame', 'Shapes Frames', 'heart', '#fb7185', ['heart', 'love']],
    ['frame-star', 'Star Frame', 'Shapes Frames', 'star', '#f59e0b', ['star', 'badge']],
    ['frame-tablet', 'Tablet Frame', 'Device Frames', 'tablet', '#18181b', ['tablet', 'device']],
    ['frame-desktop', 'Desktop Monitor Frame', 'Device Frames', 'desktop', '#334155', ['desktop', 'monitor']],
    ['frame-social-post', 'Social Post Frame', 'Social Media Frames', 'social-post', '#8b5cf6', ['social', 'post']],
    ['frame-story', 'Story Frame', 'Social Media Frames', 'story', '#ec4899', ['story', 'vertical']],
    ['frame-collage-2', 'Two Photo Collage', 'Collage Frames', 'collage-2', '#8b5cf6', ['collage', 'two']],
    ['frame-collage-3', 'Three Photo Collage', 'Collage Frames', 'collage-3', '#06b6d4', ['collage', 'three']],
    ['frame-collage-4', 'Four Photo Grid', 'Collage Frames', 'collage-4', '#10b981', ['collage', 'grid']],
    ['frame-collage-mosaic', 'Mosaic Collage', 'Collage Frames', 'collage-mosaic', '#f97316', ['collage', 'mosaic']],
    ['frame-letter-a', 'Letter A Frame', 'Shapes Frames', 'letter-a', '#8b5cf6', ['letter', 'a']],
    ['frame-letter-b', 'Letter B Frame', 'Shapes Frames', 'letter-b', '#8b5cf6', ['letter', 'b']],
    ['frame-letter-c', 'Letter C Frame', 'Shapes Frames', 'letter-c', '#8b5cf6', ['letter', 'c']],
    ['frame-letter-d', 'Letter D Frame', 'Shapes Frames', 'letter-d', '#8b5cf6', ['letter', 'd']],
    ['frame-letter-e', 'Letter E Frame', 'Shapes Frames', 'letter-e', '#8b5cf6', ['letter', 'e']],
    ['frame-number-1', 'Number 1 Frame', 'Shapes Frames', 'number-1', '#22d3ee', ['number', 'one']],
    ['frame-number-2', 'Number 2 Frame', 'Shapes Frames', 'number-2', '#22d3ee', ['number', 'two']],
    ['frame-number-3', 'Number 3 Frame', 'Shapes Frames', 'number-3', '#22d3ee', ['number', 'three']],
    ['frame-number-4', 'Number 4 Frame', 'Shapes Frames', 'number-4', '#22d3ee', ['number', 'four']],
    ['frame-number-5', 'Number 5 Frame', 'Shapes Frames', 'number-5', '#22d3ee', ['number', 'five']],
    ['frame-torn-note', 'Torn Note Frame', 'Paper Frames', 'torn-note', '#fef3c7', ['paper', 'note']],
    ['frame-sticky-note', 'Sticky Note Frame', 'Paper Frames', 'sticky-note', '#fde68a', ['paper', 'sticky']],
    ['frame-postcard', 'Postcard Frame', 'Paper Frames', 'postcard', '#f5f5f4', ['paper', 'postcard']],
    ['frame-floral-corner', 'Floral Corner Frame', 'Decorative Frames', 'floral-corner', '#fb7185', ['floral', 'corner']],
    ['frame-leaf-wreath', 'Leaf Wreath Frame', 'Decorative Frames', 'leaf-wreath', '#22c55e', ['leaf', 'wreath']],
    ['frame-scallop', 'Scallop Frame', 'Shapes Frames', 'scallop', '#a78bfa', ['scallop', 'decorative']],
    ['frame-wave', 'Wave Frame', 'Shapes Frames', 'wave', '#06b6d4', ['wave', 'abstract']],
    ['frame-organic-ring', 'Organic Ring Frame', 'Shapes Frames', 'organic-ring', '#a78bfa', ['organic', 'ring']],
    ['frame-browser-dark', 'Dark Browser Frame', 'Device Frames', 'browser-dark', '#18181b', ['browser', 'dark']],
    ['frame-laptop-light', 'Light Laptop Frame', 'Device Frames', 'laptop-light', '#e5e7eb', ['laptop', 'light']],
    ['frame-circle-bold', 'Bold Circle Frame', 'Basic Frames', 'circle-bold', '#8b5cf6', ['circle', 'bold']],
    ['frame-rounded-soft', 'Soft Rounded Frame', 'Basic Frames', 'rounded-soft', '#c084fc', ['rounded', 'soft']],
  ] satisfies Array<[string, string, string, string, string, string[]]>).map(([id, name, category, frameType, borderColor, tags]) => owned({ id, name, kind: 'frame', category, tags, frameConfig: { frameType, borderWidth: 9, borderColor, cornerRadius: frameType.includes('soft') ? 36 : undefined } })),
];

const chartConfig = (chartType: string, title: string, colors: string[]): ChartElementConfig => ({
  chartType,
  title,
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  datasets: [{ label: 'Series A', values: [34, 58, 42, 76], color: colors[0] }, { label: 'Series B', values: [22, 44, 64, 50], color: colors[1] || '#22d3ee' }],
  showGrid: true,
  showLabels: true,
  showLegend: true,
});

export const CHART_ELEMENTS: EditorElement[] = [
  owned({ id: 'chart-data-start', name: 'Start With Data', kind: 'chart', category: 'Start with data', tags: ['data', 'chart'], chartConfig: chartConfig('bar', 'Editable Data Chart', ['#8b5cf6', '#22d3ee']) }),
  owned({ id: 'chart-bar-vertical', name: 'Vertical Bar Chart', kind: 'chart', category: 'Bar charts', tags: ['bar', 'vertical'], chartConfig: chartConfig('bar', 'Quarterly Results', ['#8b5cf6', '#22d3ee']) }),
  owned({ id: 'chart-bar-horizontal', name: 'Horizontal Bar Chart', kind: 'chart', category: 'Bar charts', tags: ['bar', 'horizontal'], chartConfig: chartConfig('horizontal-bar', 'Channel Mix', ['#f97316', '#facc15']) }),
  owned({ id: 'chart-line-single', name: 'Single Line Chart', kind: 'chart', category: 'Line charts', tags: ['line'], chartConfig: chartConfig('line', 'Growth Trend', ['#22d3ee', '#a78bfa']) }),
  owned({ id: 'chart-line-points', name: 'Line With Points', kind: 'chart', category: 'Line charts', tags: ['line', 'points'], chartConfig: chartConfig('line-points', 'Engagement', ['#ec4899', '#8b5cf6']) }),
  owned({ id: 'chart-pie', name: 'Pie Chart', kind: 'chart', category: 'Pie and donut charts', tags: ['pie'], chartConfig: chartConfig('pie', 'Audience Share', ['#8b5cf6', '#22d3ee', '#f97316', '#facc15']) }),
  owned({ id: 'chart-donut', name: 'Donut Chart', kind: 'chart', category: 'Pie and donut charts', tags: ['donut'], chartConfig: chartConfig('donut', 'Budget Split', ['#06b6d4', '#a855f7', '#f43f5e', '#84cc16']) }),
  owned({ id: 'chart-area', name: 'Stacked Area Chart', kind: 'chart', category: 'Area charts', tags: ['area', 'stacked'], chartConfig: chartConfig('area', 'Traffic Sources', ['#7c3aed', '#06b6d4']) }),
  owned({ id: 'chart-scatter', name: 'Scatter Plot', kind: 'chart', category: 'Scatter and dot charts', tags: ['scatter', 'dot'], chartConfig: chartConfig('scatter', 'Performance Map', ['#f97316', '#8b5cf6']) }),
  owned({ id: 'chart-bubble', name: 'Bubble Chart', kind: 'chart', category: 'Scatter and dot charts', tags: ['bubble'], chartConfig: chartConfig('bubble', 'Market Map', ['#22c55e', '#06b6d4']) }),
  owned({ id: 'chart-kpi-card', name: 'KPI Metric Card', kind: 'chart', category: 'Dashboard widgets', tags: ['kpi', 'metric', 'dashboard'], chartConfig: chartConfig('kpi-card', 'Monthly Revenue', ['#8b5cf6', '#22d3ee']) }),
  owned({ id: 'chart-progress-ring', name: 'Progress Ring', kind: 'chart', category: 'Dashboard widgets', tags: ['progress', 'ring', 'dashboard'], chartConfig: chartConfig('progress-ring', 'Goal Progress', ['#10b981', '#8b5cf6']) }),
  owned({ id: 'chart-funnel', name: 'Marketing Funnel', kind: 'chart', category: 'Marketing charts', tags: ['funnel', 'marketing'], chartConfig: chartConfig('funnel', 'Campaign Funnel', ['#f97316', '#ec4899']) }),
  owned({ id: 'chart-timeline', name: 'Timeline Milestones', kind: 'chart', category: 'Process charts', tags: ['timeline', 'process'], chartConfig: chartConfig('timeline', 'Project Timeline', ['#06b6d4', '#8b5cf6']) }),
  owned({ id: 'chart-gauge', name: 'Gauge Meter', kind: 'chart', category: 'Dashboard widgets', tags: ['gauge', 'score'], chartConfig: chartConfig('gauge', 'Performance Score', ['#f59e0b', '#10b981']) }),
  ...([
    ['chart-grouped-bar', 'Grouped Bar Chart', 'Bar charts', 'grouped-bar', 'Segment Comparison', ['#6366f1', '#22d3ee'], ['grouped', 'bar']],
    ['chart-stacked-bar', 'Stacked Bar Chart', 'Bar charts', 'stacked-bar', 'Stacked Revenue', ['#8b5cf6', '#f97316'], ['stacked', 'bar']],
    ['chart-rounded-bar', 'Rounded Bar Chart', 'Bar charts', 'bar', 'Quarterly Highlights', ['#06b6d4', '#a855f7'], ['rounded', 'bar']],
    ['chart-progress-bar', 'Progress Bar Chart', 'Bar charts', 'horizontal-bar', 'Goal Tracking', ['#10b981', '#6366f1'], ['progress', 'horizontal']],
    ['chart-comparison-bar', 'Comparison Bar Chart', 'Bar charts', 'grouped-bar', 'Year vs Year', ['#f97316', '#22d3ee'], ['comparison', 'grouped']],
    ['chart-multi-line', 'Multi-Line Chart', 'Line charts', 'multi-line', 'Channel Growth', ['#06b6d4', '#ec4899'], ['multi line', 'trend']],
    ['chart-curved-line', 'Curved Line Chart', 'Line charts', 'line', 'Smooth Trend', ['#8b5cf6', '#f97316'], ['curved', 'smooth']],
    ['chart-dashed-line', 'Dashed Line Chart', 'Line charts', 'line', 'Projected Revenue', ['#6366f1', '#22c55e'], ['dashed', 'projected']],
    ['chart-sparkline', 'Sparkline', 'Line charts', 'line', 'Quick Trend', ['#22d3ee'], ['sparkline', 'mini']],
    ['chart-stacked-area', 'Stacked Area Chart', 'Area charts', 'stacked-area', 'Audience Sources', ['#10b981', '#8b5cf6'], ['stacked', 'area']],
    ['chart-smooth-area', 'Smooth Area Chart', 'Area charts', 'area', 'Organic Growth', ['#7c3aed', '#06b6d4'], ['smooth', 'curved']],
    ['chart-gradient-area', 'Gradient Area Chart', 'Area charts', 'area', 'Revenue Stream', ['#f97316', '#facc15'], ['gradient', 'fill']],
    ['chart-radar', 'Radar Chart', 'Dashboard widgets', 'radar', 'Skill Radar', ['#22d3ee', '#8b5cf6'], ['radar', 'skills']],
    ['chart-heatmap', 'Heatmap Matrix', 'Dashboard widgets', 'heatmap', 'Weekly Activity', ['#f97316', '#facc15'], ['heatmap', 'matrix']],
    ['chart-waterfall', 'Waterfall Chart', 'Business charts', 'waterfall', 'Budget Waterfall', ['#10b981', '#ef4444'], ['waterfall', 'finance']],
    ['chart-scorecard', 'Scorecard Widget', 'Dashboard widgets', 'scorecard', 'Campaign Score', ['#8b5cf6', '#22c55e'], ['scorecard', 'dashboard']],
    ['chart-circular-progress', 'Circular Progress', 'Dashboard widgets', 'progress-ring', 'Task Completion', ['#10b981', '#e4e4e7'], ['circular', 'progress']],
    ['chart-gauge-meter', 'Gauge Meter', 'Dashboard widgets', 'gauge', 'Health Score', ['#f59e0b', '#10b981'], ['gauge', 'meter']],
    ['chart-converted-funnel', 'Conversion Funnel', 'Marketing charts', 'funnel', 'Sales Pipeline', ['#f97316', '#8b5cf6'], ['conversion', 'pipeline']],
    ['chart-project-timeline', 'Project Timeline', 'Process charts', 'timeline', 'Roadmap 2026', ['#06b6d4', '#8b5cf6'], ['project', 'roadmap']],
    ['chart-comparison-card', 'Comparison Card', 'Dashboard widgets', 'kpi-card', 'vs Last Quarter', ['#8b5cf6', '#22d3ee'], ['comparison', 'kpi']],
    ['chart-pyramid', 'Pyramid Chart', 'Marketing charts', 'funnel', 'Hierarchy View', ['#ec4899', '#f97316'], ['pyramid', 'hierarchy']],
    ['chart-semi-donut', 'Semi Donut Chart', 'Pie and donut charts', 'donut', 'Half Circle', ['#06b6d4', '#f97316', '#8b5cf6'], ['semi', 'half']],
    ['chart-exploded-pie', 'Exploded Pie Chart', 'Pie and donut charts', 'pie', 'Highlighted Segment', ['#8b5cf6', '#22d3ee', '#f97316'], ['exploded', 'highlight']],
  ] satisfies Array<[string, string, string, string, string, string[], string[]]>).map(([id, name, category, chartType, title, colors, tags]) => owned({ id, name, kind: 'chart', category, tags, chartConfig: chartConfig(chartType, title, colors) })),
];

const tableConfig = (rows: number, columns: number, headerRow = true): TableElementConfig => ({
  rows,
  columns,
  headerRow,
  alternatingRows: true,
  borderColor: '#a1a1aa',
  borderWidth: 1,
  cells: Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => ({
    text: row === 0 && headerRow ? `Header ${column + 1}` : `Cell ${row + 1}.${column + 1}`,
    background: row === 0 && headerRow ? '#8b5cf6' : row % 2 === 0 ? '#f4f4f5' : '#ffffff',
    color: row === 0 && headerRow ? '#ffffff' : '#18181b',
  }))),
});

const tableFromRows = (cells: string[][], accent = '#8b5cf6'): TableElementConfig => ({
  rows: cells.length,
  columns: Math.max(...cells.map((row) => row.length)),
  headerRow: true,
  alternatingRows: true,
  borderColor: '#d4d4d8',
  borderWidth: 1,
  cells: cells.map((row, rowIndex) => Array.from({ length: Math.max(...cells.map((entry) => entry.length)) }, (_, columnIndex) => ({
    text: row[columnIndex] || '',
    background: rowIndex === 0 ? accent : rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff',
    color: rowIndex === 0 ? '#ffffff' : '#18181b',
  }))),
});

export const TABLE_ELEMENTS: EditorElement[] = [
  owned({ id: 'table-plain', name: 'Plain Outline Table', kind: 'table', category: 'Multiple table layouts', tags: ['table', 'plain'], tableConfig: tableConfig(3, 3, false) }),
  owned({ id: 'table-header', name: 'Header Row Table', kind: 'table', category: 'Multiple table layouts', tags: ['table', 'header'], tableConfig: tableConfig(4, 3, true) }),
  owned({ id: 'table-filled', name: 'Filled Cells Table', kind: 'table', category: 'Multiple colour styles', tags: ['table', 'filled'], tableConfig: tableConfig(4, 4, true) }),
  owned({ id: 'table-alternating', name: 'Alternating Rows Table', kind: 'table', category: 'Multiple colour styles', tags: ['table', 'alternating'], tableConfig: tableConfig(5, 3, true) }),
  owned({ id: 'table-dark', name: 'Dark Preset Table', kind: 'table', category: 'Multiple colour styles', tags: ['table', 'dark'], tableConfig: tableConfig(4, 3, true) }),
  owned({ id: 'table-minimal', name: 'Minimal Table', kind: 'table', category: 'Multiple table layouts', tags: ['table', 'minimal'], tableConfig: tableConfig(3, 2, true) }),
  owned({ id: 'table-bold', name: 'Bold Table', kind: 'table', category: 'Multiple colour styles', tags: ['table', 'bold'], tableConfig: tableConfig(4, 2, true) }),
  owned({ id: 'table-pricing', name: 'Pricing Comparison Table', kind: 'table', category: 'Multiple table layouts', tags: ['table', 'pricing'], tableConfig: tableConfig(5, 4, true) }),
  owned({ id: 'table-content-calendar', name: 'Content Calendar Table', kind: 'table', category: 'Planning tables', tags: ['content', 'calendar', 'social'], tableConfig: tableFromRows([['Channel', 'Topic', 'Date', 'Owner', 'Status'], ['Instagram', 'Summer sale', 'Jul 24', 'Asha', 'Draft'], ['LinkedIn', 'Case study', 'Jul 26', 'Ravi', 'Review'], ['Email', 'Launch note', 'Jul 29', 'Maya', 'Ready'], ['YouTube', 'Demo clip', 'Aug 02', 'Team', 'Plan']], '#8b5cf6') }),
  owned({ id: 'table-project-tracker', name: 'Project Tracker Table', kind: 'table', category: 'Planning tables', tags: ['project', 'tracker', 'status'], tableConfig: tableFromRows([['Task', 'Owner', 'Due', 'Status'], ['Wireframes', 'Design', 'Today', 'Done'], ['Assets', 'Content', 'Tomorrow', 'Review'], ['Prototype', 'Frontend', 'Friday', 'Active'], ['QA pass', 'QA', 'Monday', 'Open'], ['Launch', 'Team', 'Next week', 'Planned']], '#0ea5e9') }),
  owned({ id: 'table-invoice-summary', name: 'Invoice Summary Table', kind: 'table', category: 'Business tables', tags: ['invoice', 'finance'], tableConfig: tableFromRows([['Item', 'Qty', 'Amount'], ['Design sprint', '1', '$1,200'], ['Brand kit', '1', '$650'], ['Social set', '4', '$480'], ['Total', '', '$2,330']], '#10b981') }),
  owned({ id: 'table-checklist', name: 'Checklist Table', kind: 'table', category: 'Planning tables', tags: ['checklist', 'tasks'], tableConfig: tableFromRows([['Done', 'Task'], ['□', 'Confirm headline'], ['□', 'Replace image'], ['□', 'Apply brand colours'], ['□', 'Review spacing'], ['□', 'Export final PNG']], '#f97316') }),
  ...([
    ['table-schedule', 'Weekly Schedule Table', 'Planning tables', [['Day', 'Morning', 'Afternoon', 'Evening'], ['Mon', 'Plan', 'Design', 'Review'], ['Tue', 'Write', 'Build', 'QA'], ['Wed', 'Shoot', 'Edit', 'Publish']], '#6366f1', ['schedule', 'weekly']],
    ['table-comparison', 'Feature Comparison Table', 'Business tables', [['Feature', 'Basic', 'Pro', 'Team'], ['Templates', '✓', '✓', '✓'], ['Brand Kit', '—', '✓', '✓'], ['Sharing', '—', '—', '✓']], '#8b5cf6', ['comparison', 'features']],
    ['table-light', 'Light Editorial Table', 'Multiple colour styles', [['Section', 'Copy', 'Image'], ['Hero', 'Ready', 'Needed'], ['Offer', 'Draft', 'Ready'], ['Footer', 'Ready', 'Ready']], '#94a3b8', ['light', 'editorial']],
    ['table-business-roadmap', 'Business Roadmap Table', 'Business tables', [['Quarter', 'Goal', 'Metric'], ['Q1', 'Awareness', '50K reach'], ['Q2', 'Leads', '2K leads'], ['Q3', 'Sales', '$80K']], '#0f766e', ['business', 'roadmap']],
    ['table-event-plan', 'Event Plan Table', 'Planning tables', [['Time', 'Session', 'Owner'], ['09:00', 'Welcome', 'Host'], ['10:00', 'Workshop', 'Team'], ['13:00', 'Panel', 'Guests']], '#db2777', ['event', 'plan']],
    ['table-menu', 'Menu Price Table', 'Business tables', [['Item', 'Description', 'Price'], ['Latte', 'Oat milk', '$5'], ['Bowl', 'Seasonal', '$12'], ['Cake', 'Chocolate', '$7']], '#d97706', ['menu', 'food']],
    ['table-budget', 'Budget Tracker Table', 'Business tables', [['Category', 'Planned', 'Actual'], ['Design', '$500', '$460'], ['Ads', '$900', '$920'], ['Print', '$300', '$280']], '#16a34a', ['budget', 'finance']],
    ['table-class-roster', 'Class Roster Table', 'Education tables', [['Student', 'Project', 'Status'], ['Ari', 'Poster', 'Done'], ['Mina', 'Video', 'Draft'], ['Dev', 'Chart', 'Review']], '#2563eb', ['education', 'roster']],
  ] satisfies Array<[string, string, string, string[][], string, string[]]>).map(([id, name, category, rows, accent, tags]) => owned({ id, name, kind: 'table', category, tags, tableConfig: tableFromRows(rows, accent) })),
];

const formConfig = (title: string, fields: FormElementConfig['fields'], submitLabel = 'Submit'): FormElementConfig => ({
  title,
  fields,
  submitLabel,
  mode: 'design-preview',
});

export const FORM_ELEMENTS: EditorElement[] = [
  owned({ id: 'form-newsletter', name: 'Newsletter Subscription', kind: 'form', category: 'Business', tags: ['newsletter', 'email'], formConfig: formConfig('Join our newsletter', [{ id: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true }], 'Subscribe') }),
  owned({ id: 'form-contact', name: 'Contact Form', kind: 'form', category: 'Business', tags: ['contact', 'lead'], formConfig: formConfig('Contact us', [{ id: 'name', type: 'text', label: 'Name', placeholder: 'Your name' }, { id: 'email', type: 'email', label: 'Email', placeholder: 'Email address' }], 'Send') }),
  owned({ id: 'form-quiz', name: 'Multiple Choice Question', kind: 'form', category: 'Education', tags: ['quiz', 'education'], formConfig: formConfig('Quick quiz', [{ id: 'q1', type: 'radio', label: 'Choose an answer', options: ['A', 'B', 'C'], required: true }], 'Check Answer') }),
  owned({ id: 'form-rsvp', name: 'RSVP Form', kind: 'form', category: 'Events', tags: ['rsvp', 'event'], formConfig: formConfig('RSVP', [{ id: 'name', type: 'text', label: 'Guest name' }, { id: 'attend', type: 'radio', label: 'Will you attend?', options: ['Yes', 'No'] }], 'Confirm') }),
  owned({ id: 'form-rating', name: 'Star Rating', kind: 'form', category: 'Feedback', tags: ['rating', 'feedback'], formConfig: formConfig('Rate your experience', [{ id: 'rating', type: 'rating', label: 'Rating', required: true }], 'Send Feedback') }),
  owned({ id: 'form-survey', name: 'Survey Question', kind: 'form', category: 'Other', tags: ['survey', 'question'], formConfig: formConfig('Tell us more', [{ id: 'answer', type: 'text', label: 'Your answer', placeholder: 'Type response' }], 'Continue') }),
  owned({ id: 'form-booking', name: 'Booking Request Form', kind: 'form', category: 'Business', tags: ['booking', 'appointment'], formConfig: formConfig('Book a session', [{ id: 'name', type: 'text', label: 'Name', placeholder: 'Client name', required: true }, { id: 'date', type: 'text', label: 'Preferred date', placeholder: 'MM/DD/YYYY' }, { id: 'service', type: 'radio', label: 'Service', options: ['Design', 'Photo', 'Video'] }], 'Request Booking') }),
  owned({ id: 'form-event-registration', name: 'Event Registration Form', kind: 'form', category: 'Events', tags: ['event', 'registration'], formConfig: formConfig('Register now', [{ id: 'name', type: 'text', label: 'Full name', required: true }, { id: 'email', type: 'email', label: 'Email', required: true }, { id: 'ticket', type: 'radio', label: 'Ticket type', options: ['Free', 'VIP', 'Team'] }], 'Register') }),
  owned({ id: 'form-order', name: 'Product Order Form', kind: 'form', category: 'Business', tags: ['order', 'product'], formConfig: formConfig('Place order', [{ id: 'product', type: 'text', label: 'Product', placeholder: 'Product name' }, { id: 'quantity', type: 'number', label: 'Quantity', placeholder: '1' }, { id: 'delivery', type: 'radio', label: 'Delivery', options: ['Pickup', 'Ship'] }], 'Order Now') }),
  owned({ id: 'form-application', name: 'Application Form', kind: 'form', category: 'Other', tags: ['application', 'career'], formConfig: formConfig('Apply today', [{ id: 'name', type: 'text', label: 'Name', required: true }, { id: 'email', type: 'email', label: 'Email', required: true }, { id: 'role', type: 'text', label: 'Role', placeholder: 'Designer' }], 'Apply') }),
  ...([
    ['form-lead-capture', 'Lead Capture Form', 'Business', 'Get the guide', [['name', 'text', 'Name'], ['email', 'email', 'Work email'], ['company', 'text', 'Company']], 'Download'],
    ['form-poll', 'Poll Form', 'Feedback', 'Vote now', [['choice', 'radio', 'Choose one']], 'Vote'],
    ['form-feedback-scale', 'Feedback Scale Form', 'Feedback', 'How did we do?', [['rating', 'rating', 'Rating'], ['comment', 'text', 'Comment']], 'Send'],
    ['form-donation', 'Donation Form', 'Events', 'Support the cause', [['name', 'text', 'Name'], ['amount', 'number', 'Amount'], ['frequency', 'radio', 'Frequency']], 'Donate'],
    ['form-waitlist', 'Waitlist Form', 'Business', 'Join the waitlist', [['email', 'email', 'Email'], ['interest', 'text', 'Interest']], 'Join'],
    ['form-appointment', 'Appointment Form', 'Business', 'Schedule appointment', [['name', 'text', 'Name'], ['date', 'text', 'Date'], ['time', 'text', 'Time']], 'Schedule'],
    ['form-workshop', 'Workshop Signup Form', 'Education', 'Workshop signup', [['name', 'text', 'Name'], ['email', 'email', 'Email'], ['level', 'radio', 'Level']], 'Save seat'],
    ['form-lesson-quiz', 'Lesson Quiz Form', 'Education', 'Knowledge check', [['q1', 'radio', 'Best answer'], ['name', 'text', 'Student']], 'Submit'],
    ['form-health-intake', 'Health Intake Form', 'Other', 'Quick intake', [['name', 'text', 'Name'], ['goal', 'text', 'Goal'], ['consent', 'checkbox', 'Consent']], 'Continue'],
    ['form-travel-request', 'Travel Request Form', 'Other', 'Plan your trip', [['destination', 'text', 'Destination'], ['date', 'text', 'Date'], ['budget', 'number', 'Budget']], 'Request'],
    ['form-food-order', 'Cafe Order Form', 'Business', 'Order ahead', [['item', 'text', 'Item'], ['qty', 'number', 'Qty'], ['pickup', 'radio', 'Pickup time']], 'Order'],
    ['form-product-feedback', 'Product Feedback Form', 'Feedback', 'Product feedback', [['rating', 'rating', 'Rating'], ['feature', 'text', 'Feature request']], 'Send'],
    ['form-volunteer', 'Volunteer Form', 'Events', 'Volunteer signup', [['name', 'text', 'Name'], ['role', 'radio', 'Role'], ['phone', 'text', 'Phone']], 'Sign up'],
    ['form-simple-question', 'Simple Question Form', 'Other', 'Ask a question', [['question', 'text', 'Question']], 'Ask'],
    ['form-quote-request', 'Quote Request Form', 'Business', 'Request a quote', [['name', 'text', 'Name'], ['service', 'text', 'Service'], ['budget', 'number', 'Budget']], 'Request quote'],
  ] satisfies Array<[string, string, string, string, Array<[string, 'text' | 'email' | 'number' | 'radio' | 'checkbox' | 'rating', string]>, string]>).map(([id, name, category, title, fields, submitLabel]) => owned({
    id,
    name,
    kind: 'form',
    category,
    tags: [category.toLowerCase(), 'form', title.toLowerCase()],
    formConfig: formConfig(title, fields.map(([fieldId, type, label]) => ({ id: fieldId, type, label, placeholder: label, required: type === 'email', options: type === 'radio' ? ['Option A', 'Option B', 'Option C'] : type === 'checkbox' ? ['Yes'] : undefined })), submitLabel),
  })),
];

const animation = (id: string, name: string, category: string, type: string, tags: string[]): EditorElement => owned({
  id,
  name,
  kind: 'animation',
  category,
  tags,
  isAnimated: true,
  animationConfig: { format: 'fabric-keyframe', animationType: type, loop: true, speed: 1 },
});

export const ANIMATION_ELEMENTS: EditorElement[] = [
  animation('anim-arrow-draw', 'Drawing Arrow', 'Arrow animations', 'draw-arrow', ['arrow', 'draw']),
  animation('anim-arrow-pointer', 'Pointer Arrow', 'Arrow animations', 'pointer', ['arrow', 'pointer']),
  animation('anim-word-thank-you', 'Word Animation — Thank You', 'Word animations', 'word-pop', ['thank you', 'word']),
  animation('anim-word-announcement', 'Announcement Word Art', 'Word animations', 'word-slide', ['announcement', 'word']),
  animation('anim-food-popcorn', 'Popcorn Animation', 'Food animations', 'pop', ['food', 'popcorn']),
  animation('anim-food-pizza', 'Pizza Animation', 'Food animations', 'bounce', ['food', 'pizza']),
  animation('anim-shape-pulse', 'Pulsing Shape', 'Shape animations', 'pulse', ['shape', 'pulse']),
  animation('anim-shape-slide', 'Sliding Block', 'Shape animations', 'slide', ['shape', 'slide']),
  animation('anim-emoji-smile', 'Smile Reaction', 'Emoji animations', 'emoji-pop', ['emoji', 'smile']),
  animation('anim-emoji-love', 'Love Reaction', 'Emoji animations', 'emoji-heart', ['emoji', 'love']),
  animation('anim-festive-confetti', 'Confetti Celebration', 'Festive animations', 'confetti', ['confetti', 'celebration']),
  animation('anim-festive-fireworks', 'Fireworks Burst', 'Festive animations', 'fireworks', ['fireworks', 'celebration']),
  ...([
    ['anim-arrow-loop', 'Looping Arrow', 'Arrow animations', 'arrow-loop', ['arrow', 'loop']],
    ['anim-arrow-swipe', 'Swipe Arrow', 'Arrow animations', 'arrow-swipe', ['arrow', 'swipe']],
    ['anim-word-sale', 'Sale Word Pop', 'Word animations', 'word-sale', ['sale', 'word']],
    ['anim-word-new', 'New Word Reveal', 'Word animations', 'word-new', ['new', 'word']],
    ['anim-word-wow', 'Wow Word Bounce', 'Word animations', 'word-wow', ['wow', 'word']],
    ['anim-food-coffee', 'Coffee Steam', 'Food animations', 'coffee-steam', ['coffee', 'food']],
    ['anim-food-burger', 'Burger Bounce', 'Food animations', 'burger-bounce', ['burger', 'food']],
    ['anim-food-cupcake', 'Cupcake Pop', 'Food animations', 'cupcake-pop', ['cupcake', 'food']],
    ['anim-shape-spin', 'Spinning Shape', 'Shape animations', 'shape-spin', ['shape', 'spin']],
    ['anim-shape-morph', 'Morphing Shape', 'Shape animations', 'shape-morph', ['shape', 'morph']],
    ['anim-shape-glow', 'Glowing Shape', 'Shape animations', 'shape-glow', ['shape', 'glow']],
    ['anim-emoji-party', 'Party Emoji', 'Emoji animations', 'emoji-party', ['emoji', 'party']],
    ['anim-emoji-clap', 'Clap Reaction', 'Emoji animations', 'emoji-clap', ['emoji', 'clap']],
    ['anim-festive-streamers', 'Streamer Burst', 'Festive animations', 'streamers', ['streamers', 'celebration']],
    ['anim-festive-sparkles', 'Sparkle Burst', 'Festive animations', 'sparkle-burst', ['sparkle', 'celebration']],
    ['anim-tech-loader', 'Tech Loader', 'Technology animations', 'tech-loader', ['technology', 'loader']],
    ['anim-tech-scan', 'Scanning Grid', 'Technology animations', 'tech-scan', ['technology', 'scan']],
    ['anim-tech-upload', 'Upload Pulse', 'Technology animations', 'tech-upload', ['technology', 'upload']],
    ['anim-social-like', 'Like Pop', 'Social media animations', 'social-like', ['social', 'like']],
    ['anim-social-follow', 'Follow Button Pulse', 'Social media animations', 'social-follow', ['social', 'follow']],
    ['anim-social-share', 'Share Sweep', 'Social media animations', 'social-share', ['social', 'share']],
    ['anim-loading-dots', 'Loading Dots', 'Loading animations', 'loading-dots', ['loading', 'dots']],
    ['anim-loading-ring', 'Loading Ring', 'Loading animations', 'loading-ring', ['loading', 'ring']],
    ['anim-loading-bars', 'Loading Bars', 'Loading animations', 'loading-bars', ['loading', 'bars']],
    ['anim-decor-wave', 'Decorative Wave Motion', 'Decorative motion', 'decor-wave', ['decorative', 'wave']],
    ['anim-decor-orbit', 'Orbit Motion', 'Decorative motion', 'decor-orbit', ['decorative', 'orbit']],
    ['anim-decor-gradient', 'Gradient Pulse', 'Decorative motion', 'decor-gradient', ['decorative', 'gradient']],
    ['anim-business-growth', 'Growth Arrow Motion', 'Business animations', 'business-growth', ['business', 'growth']],
    ['anim-business-target', 'Target Pulse', 'Business animations', 'business-target', ['business', 'target']],
    ['anim-education-book', 'Book Flip', 'Education animations', 'education-book', ['education', 'book']],
    ['anim-health-heartbeat', 'Heartbeat Line', 'Healthcare animations', 'health-heartbeat', ['healthcare', 'heartbeat']],
    ['anim-travel-plane', 'Plane Path', 'Travel animations', 'travel-plane', ['travel', 'plane']],
    ['anim-fashion-flash', 'Fashion Flash', 'Fashion animations', 'fashion-flash', ['fashion', 'flash']],
    ['anim-fitness-energy', 'Fitness Energy', 'Fitness animations', 'fitness-energy', ['fitness', 'energy']],
    ['anim-event-spotlight', 'Event Spotlight', 'Events animations', 'event-spotlight', ['event', 'spotlight']],
    ['anim-background-bokeh', 'Bokeh Motion', 'Decorative motion', 'bokeh-motion', ['background', 'bokeh']],
    ['anim-background-noise', 'Texture Drift', 'Decorative motion', 'texture-drift', ['background', 'texture']],
    ['anim-abstract-lines', 'Abstract Line Motion', 'Decorative motion', 'abstract-lines', ['abstract', 'line']],
  ] satisfies Array<[string, string, string, string, string[]]>).map(([id, name, category, type, tags]) => animation(id, name, category, type, tags)),
];

const threeD = (id: string, name: string, category: string, tags: string[]): EditorElement => owned({
  id,
  name,
  kind: 'three-d',
  category,
  tags,
  threeDConfig: { modelUrl: `internal://3d/${id}`, rotationX: 0, rotationY: 0, rotationZ: 0, animationClip: 'turntable', animationSpeed: 1, loop: true, renderMode: 'fabric-3d-style' },
});

export const THREE_D_ELEMENTS: EditorElement[] = [
  threeD('3d-arrow', '3D Arrow Icon', 'Icons and stickers', ['arrow', 'icon']),
  threeD('3d-star', '3D Star Icon', 'Icons and stickers', ['star', 'icon']),
  threeD('3d-emoji-smile', '3D Smile Emoji', 'Characters and emojis', ['emoji', 'character']),
  threeD('3d-mascot', '3D Mascot Character', 'Characters and emojis', ['mascot', 'character']),
  threeD('3d-sports-ball', '3D Sports Ball', 'Food and lifestyle', ['sports', 'ball']),
  threeD('3d-rocket', '3D Rocket', 'Food and lifestyle', ['rocket', 'startup']),
  threeD('3d-gradient-sphere', '3D Gradient Sphere', 'Creative and abstract', ['sphere', 'gradient']),
  threeD('3d-isometric-cube', '3D Isometric Cube', 'Creative and abstract', ['cube', 'geometric']),
  threeD('3d-panda', '3D Panda', 'Animals and nature', ['animal', 'panda']),
  threeD('3d-leaf', '3D Leaf', 'Animals and nature', ['nature', 'leaf']),
  ...([
    ['3d-arrow-up', '3D Up Arrow', 'Icons and stickers', ['arrow', 'up']],
    ['3d-arrow-curved', '3D Curved Arrow', 'Icons and stickers', ['arrow', 'curved']],
    ['3d-star-badge', '3D Star Badge', 'Icons and stickers', ['star', 'badge']],
    ['3d-heart-icon', '3D Heart Icon', 'Icons and stickers', ['heart', 'icon']],
    ['3d-check-icon', '3D Check Icon', 'Icons and stickers', ['check', 'icon']],
    ['3d-emoji-love', '3D Love Emoji', 'Characters and emojis', ['emoji', 'love']],
    ['3d-emoji-party', '3D Party Emoji', 'Characters and emojis', ['emoji', 'party']],
    ['3d-avatar-waving', '3D Waving Character', 'Characters and emojis', ['character', 'avatar']],
    ['3d-burger', '3D Burger', 'Food and lifestyle', ['food', 'burger']],
    ['3d-coffee-cup', '3D Coffee Cup', 'Food and lifestyle', ['food', 'coffee']],
    ['3d-cupcake', '3D Cupcake', 'Food and lifestyle', ['food', 'cupcake']],
    ['3d-laptop', '3D Laptop', 'Technology objects', ['technology', 'laptop']],
    ['3d-phone', '3D Phone', 'Technology objects', ['technology', 'phone']],
    ['3d-chip', '3D AI Chip', 'Technology objects', ['technology', 'chip']],
    ['3d-server', '3D Server Block', 'Technology objects', ['technology', 'server']],
    ['3d-briefcase', '3D Briefcase', 'Business objects', ['business', 'briefcase']],
    ['3d-chart-bars', '3D Chart Bars', 'Business objects', ['business', 'chart']],
    ['3d-target', '3D Target', 'Business objects', ['business', 'target']],
    ['3d-tree', '3D Tree', 'Animals and nature', ['nature', 'tree']],
    ['3d-flower', '3D Flower', 'Animals and nature', ['nature', 'flower']],
    ['3d-lion', '3D Lion', 'Animals and nature', ['animal', 'lion']],
    ['3d-tiger', '3D Tiger', 'Animals and nature', ['animal', 'tiger']],
    ['3d-dog', '3D Dog', 'Animals and nature', ['animal', 'dog']],
    ['3d-cat', '3D Cat', 'Animals and nature', ['animal', 'cat']],
    ['3d-gem', '3D Gemstone', 'Creative and abstract', ['gem', 'abstract']],
    ['3d-torus', '3D Torus Ring', 'Creative and abstract', ['torus', 'ring']],
    ['3d-pyramid', '3D Pyramid', 'Creative and abstract', ['pyramid', 'geometric']],
    ['3d-cylinder', '3D Cylinder', 'Creative and abstract', ['cylinder', 'geometric']],
    ['3d-paper-plane', '3D Paper Plane', 'Travel objects', ['travel', 'plane']],
    ['3d-globe', '3D Globe', 'Travel objects', ['travel', 'globe']],
  ] satisfies Array<[string, string, string, string[]]>).map(([id, name, category, tags]) => threeD(id, name, category, tags)),
];

const video = (id: string, name: string, category: string, duration: number, tags: string[]): EditorElement => owned({
  id,
  name,
  kind: 'video',
  category,
  duration,
  tags,
  mimeType: 'video/mp4',
  videoConfig: { duration, format: 'managed-preview', loop: true, muted: true },
});

export const VIDEO_ELEMENTS: EditorElement[] = [
  video('video-recommendation', 'Recommended Motion Background', 'Magic recommendations', 12, ['recommended', 'motion']),
  video('video-trending-gradient', 'Trending Gradient Loop', 'Trending', 10, ['trending', 'gradient']),
  video('video-people-intro', 'People Intro Clip', 'People', 8, ['people', 'intro']),
  video('video-background-loop', 'Soft Background Loop', 'Backgrounds', 15, ['background', 'loop']),
  video('video-transition-swipe', 'Swipe Transition', 'Transitions and effects', 4, ['transition', 'swipe']),
  video('video-tech-grid', 'Technology Grid Motion', 'Tech', 9, ['technology', 'ai', 'grid']),
  video('video-product-demo', 'Product Demo Motion Card', 'People', 14, ['product', 'demo', 'promo']),
  video('video-social-reel', 'Social Reel Safe Area', 'Trending', 7, ['reel', 'shorts', 'social']),
  video('video-webinar-lower-third', 'Webinar Lower Third', 'Tech', 11, ['webinar', 'lower third']),
  video('video-quote-motion', 'Quote Motion Background', 'Backgrounds', 13, ['quote', 'background']),
  ...([
    ['video-nature-forest', 'Forest Light Loop', 'Nature', 12, ['nature', 'forest']],
    ['video-nature-ocean', 'Ocean Wave Loop', 'Nature', 14, ['nature', 'ocean']],
    ['video-business-meeting', 'Business Meeting Intro', 'Business', 9, ['business', 'meeting']],
    ['video-business-dashboard', 'Dashboard Motion Loop', 'Business', 10, ['business', 'dashboard']],
    ['video-tech-hologram', 'Hologram Interface', 'Technology', 11, ['technology', 'hologram']],
    ['video-tech-code-rain', 'Code Rain Motion', 'Technology', 13, ['technology', 'code']],
    ['video-background-bokeh', 'Bokeh Background', 'Backgrounds', 15, ['background', 'bokeh']],
    ['video-background-paper', 'Paper Texture Drift', 'Backgrounds', 12, ['background', 'paper']],
    ['video-transition-zoom', 'Zoom Transition', 'Transitions', 4, ['transition', 'zoom']],
    ['video-transition-glitch', 'Glitch Transition', 'Transitions', 5, ['transition', 'glitch']],
    ['video-effect-light-leak', 'Light Leak Effect', 'Effects', 8, ['effect', 'light leak']],
    ['video-effect-sparkles', 'Sparkle Overlay Effect', 'Effects', 8, ['effect', 'sparkles']],
    ['video-social-story', 'Social Story Motion', 'Social Media', 7, ['social', 'story']],
    ['video-social-countdown', 'Countdown Sticker Motion', 'Social Media', 6, ['social', 'countdown']],
    ['video-abstract-gradient', 'Abstract Gradient Flow', 'Abstract', 12, ['abstract', 'gradient']],
    ['video-abstract-lines', 'Abstract Line Sweep', 'Abstract', 10, ['abstract', 'lines']],
    ['video-events-stage', 'Event Stage Lights', 'Events', 10, ['events', 'stage']],
    ['video-events-confetti', 'Event Confetti Loop', 'Events', 8, ['events', 'confetti']],
    ['video-food-steam', 'Food Steam Overlay', 'Food', 9, ['food', 'steam']],
    ['video-food-cafe', 'Cafe Promo Motion', 'Food', 12, ['food', 'cafe']],
    ['video-fashion-runway', 'Runway Intro Motion', 'Fashion', 9, ['fashion', 'runway']],
    ['video-fashion-product', 'Product Reveal Motion', 'Fashion', 8, ['fashion', 'product']],
    ['video-fitness-energy', 'Fitness Energy Loop', 'Fitness', 10, ['fitness', 'energy']],
    ['video-fitness-countdown', 'Workout Countdown', 'Fitness', 6, ['fitness', 'countdown']],
    ['video-education-board', 'Education Board Motion', 'Education', 11, ['education', 'board']],
    ['video-education-title', 'Lesson Title Motion', 'Education', 8, ['education', 'title']],
    ['video-health-pulse', 'Healthcare Pulse Motion', 'Healthcare', 8, ['healthcare', 'pulse']],
    ['video-health-clean', 'Clean Medical Background', 'Healthcare', 12, ['healthcare', 'background']],
    ['video-finance-ticker', 'Finance Ticker Motion', 'Finance', 10, ['finance', 'ticker']],
    ['video-finance-growth', 'Finance Growth Motion', 'Finance', 11, ['finance', 'growth']],
    ['video-marketing-offer', 'Marketing Offer Reveal', 'Marketing', 8, ['marketing', 'offer']],
    ['video-marketing-cta', 'CTA Button Motion', 'Marketing', 7, ['marketing', 'cta']],
    ['video-travel-map', 'Travel Map Motion', 'Travel', 10, ['travel', 'map']],
    ['video-travel-plane', 'Plane Route Motion', 'Travel', 9, ['travel', 'plane']],
    ['video-minimal-lines', 'Minimal Line Motion', 'Minimal', 12, ['minimal', 'lines']],
    ['video-minimal-product', 'Minimal Product Reveal', 'Minimal', 8, ['minimal', 'product']],
    ['video-portrait-intro', 'Portrait Intro Motion', 'People', 9, ['people', 'portrait']],
    ['video-team-lower-third', 'Team Lower Third', 'People', 10, ['people', 'team']],
    ['video-podcast-waveform', 'Podcast Waveform Motion', 'Social Media', 11, ['podcast', 'waveform']],
    ['video-news-breaking', 'Breaking News Motion', 'Events', 7, ['news', 'breaking']],
  ] satisfies Array<[string, string, string, number, string[]]>).map(([id, name, category, duration, tags]) => video(id, name, category, duration, tags)),
];

export const ELEMENT_LIBRARY: EditorElement[] = [
  ...SHAPE_ELEMENTS,
  ...FRAME_ELEMENTS,
  ...CHART_ELEMENTS,
  ...TABLE_ELEMENTS,
  ...FORM_ELEMENTS,
  ...ANIMATION_ELEMENTS,
  ...THREE_D_ELEMENTS,
  ...VIDEO_ELEMENTS,
];

export const ELEMENT_SECTIONS: Record<ElementKind, string[]> = {
  shape: ['Lines and Connectors', 'Arrows', 'Basic Shapes', 'Polygons', 'Stars and Bursts', 'Organic Shapes', 'Flowchart Shapes', 'Decorative Shapes'],
  photo: ['Magic recommendations', 'Trending', 'People', 'Nature', 'Business', 'Technology', 'Food', 'Travel', 'Fashion', 'Fitness', 'Backgrounds', 'Textures'],
  frame: ['Basic Frames', 'Paper Frames', 'Device Frames', 'Decorative Frames', 'Collage Frames', 'Social Media Frames', 'Photo Frames', 'Shapes Frames'],
  chart: ['Start with data', 'Bar charts', 'Line charts', 'Pie and donut charts', 'Area charts', 'Scatter and dot charts', 'Dashboard widgets', 'Marketing charts', 'Process charts', 'Business charts'],
  table: ['Multiple table layouts', 'Multiple colour styles', 'Planning tables', 'Business tables', 'Education tables'],
  animation: ['Magic recommendations', 'Arrow animations', 'Word animations', 'Food animations', 'Shape animations', 'Emoji animations', 'Festive animations', 'Technology animations', 'Social media animations', 'Loading animations', 'Decorative motion', 'Business animations', 'Education animations', 'Healthcare animations', 'Travel animations', 'Fashion animations', 'Fitness animations', 'Events animations'],
  form: ['Business', 'Education', 'Events', 'Feedback', 'Other'],
  'three-d': ['Recently used', 'Icons and stickers', 'Characters and emojis', 'Food and lifestyle', 'Technology objects', 'Business objects', 'Creative and abstract', 'Animals and nature', 'Travel objects'],
  video: ['Magic recommendations', 'Trending', 'People', 'Nature', 'Business', 'Technology', 'Backgrounds', 'Transitions', 'Transitions and effects', 'Effects', 'Social Media', 'Abstract', 'Events', 'Food', 'Fashion', 'Fitness', 'Education', 'Healthcare', 'Finance', 'Marketing', 'Travel', 'Minimal', 'Tech'],
};

const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const isElementKind = (kind: ElementKind | LegacyElementKind): kind is ElementKind => (
  ['shape', 'photo', 'frame', 'chart', 'table', 'animation', 'form', 'three-d', 'video'].includes(kind)
);

const elementConfigFor = (item: EditorElement) => (
  item.shapeConfig ||
  item.photoConfig ||
  item.frameConfig ||
  item.chartConfig ||
  item.tableConfig ||
  item.formConfig ||
  item.animationConfig ||
  item.threeDConfig ||
  item.videoConfig ||
  {}
);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const typedExtraConfig = (extra: Record<string, unknown>, key: string) => (isPlainRecord(extra[key]) ? extra[key] : {});

const makeElementMetadata = (kind: ElementKind, item: EditorElement, extra: Record<string, unknown> = {}): ElementMetadata => {
  const shapeConfig = { ...(item.shapeConfig || {}), ...typedExtraConfig(extra, 'shapeConfig') };
  const photoConfig = { ...(item.photoConfig || {}), ...typedExtraConfig(extra, 'photoConfig') };
  const frameConfig = { ...(item.frameConfig || {}), ...typedExtraConfig(extra, 'frameConfig') };
  const chartConfig = { ...(item.chartConfig || {}), ...typedExtraConfig(extra, 'chartConfig') };
  const tableConfig = { ...(item.tableConfig || {}), ...typedExtraConfig(extra, 'tableConfig') };
  const formConfig = { ...(item.formConfig || {}), ...typedExtraConfig(extra, 'formConfig') };
  const animationConfig = { ...(item.animationConfig || {}), ...typedExtraConfig(extra, 'animationConfig') };
  const threeDConfig = { ...(item.threeDConfig || {}), ...typedExtraConfig(extra, 'threeDConfig') };
  const videoConfig = { ...(item.videoConfig || {}), ...typedExtraConfig(extra, 'videoConfig') };
  const config = kind === 'shape' ? shapeConfig
    : kind === 'photo' ? photoConfig
      : kind === 'frame' ? frameConfig
        : kind === 'chart' ? chartConfig
          : kind === 'table' ? tableConfig
            : kind === 'form' ? formConfig
              : kind === 'animation' ? animationConfig
                : kind === 'three-d' ? threeDConfig
                  : kind === 'video' ? videoConfig
                    : { ...elementConfigFor(item) };

  return {
    id: makeId(String(kind)),
    elementId: item.id,
    elementKind: kind,
    displayName: item.name,
    category: item.category,
    subcategory: item.subcategory,
    tags: item.tags || [],
    sourceUrl: item.sourceUrl,
    thumbnailUrl: item.thumbnailUrl,
    previewUrl: item.previewUrl,
    modelUrl: item.threeDConfig?.modelUrl,
    isPremium: item.isPremium,
    editable: true,
    provider: item.provider || 'teckstudio',
    licence: item.licence || 'Application-owned editable element',
    shapeConfig: kind === 'shape' ? shapeConfig : undefined,
    photoConfig: kind === 'photo' ? photoConfig : undefined,
    frameConfig: kind === 'frame' ? frameConfig as ElementMetadata['frameConfig'] : undefined,
    chartConfig: kind === 'chart' ? chartConfig as ElementMetadata['chartConfig'] : undefined,
    tableConfig: kind === 'table' ? tableConfig as ElementMetadata['tableConfig'] : undefined,
    formConfig: kind === 'form' ? formConfig as ElementMetadata['formConfig'] : undefined,
    animationConfig: kind === 'animation' ? animationConfig as ElementMetadata['animationConfig'] : undefined,
    threeDConfig: kind === 'three-d' ? threeDConfig as ElementMetadata['threeDConfig'] : undefined,
    videoConfig: kind === 'video' ? videoConfig as ElementMetadata['videoConfig'] : undefined,
    config,
  };
};

const makeMetadata = (kind: ElementKind | LegacyElementKind, item: EditorElement | { id: string; name: string; category: string; tags?: string[] }, extra: Record<string, unknown> = {}) => {
  const metadata = isElementKind(kind)
    ? makeElementMetadata(kind, item as EditorElement, extra)
    : null;

  return {
    id: metadata?.id || makeId(String(kind)),
    name: kind === 'shape' ? item.name : `${labelForKind(kind)} — ${item.name}`,
    displayName: item.name,
    objectType: kind,
    assetId: item.id,
    elementId: item.id,
    category: item.category,
    elementCategory: item.category,
    elementSubcategory: (item as EditorElement).subcategory,
    elementTags: (item as EditorElement).tags || [],
    elementKind: kind,
    elementEditable: true,
    elementProvider: metadata?.provider || 'teckstudio',
    elementLicence: metadata?.licence || 'Application-owned editable element',
    elementConfig: metadata?.config || extra,
    elementMetadata: metadata,
    assetMetadata: item,
    shapeConfig: metadata?.shapeConfig,
    photoConfig: metadata?.photoConfig,
    previewUrl: (item as EditorElement).previewUrl,
    sourceUrl: (item as EditorElement).sourceUrl,
    modelUrl: (item as EditorElement).threeDConfig?.modelUrl,
    staticExportSupported: true,
    animatedExportSupported: false,
    ...extra,
  };
};

const labelForKind = (kind: ElementKind | LegacyElementKind) => {
  if (kind === 'three-d') return '3D';
  if (kind === 'photo' || kind === 'image') return 'Photo';
  if (kind === 'sound-effect') return 'Sound';
  return String(kind).split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

export const applyElementMetadata = <T extends fabric.Object>(object: T, values: Record<string, unknown>) => {
  (object as fabric.Object & { set: (values: Record<string, unknown>) => fabric.Object }).set(values);
  return object;
};

const makeTextbox = (text: string, options: fabric.ITextboxOptions) => new fabric.Textbox(text, {
  fontFamily: 'Outfit',
  fill: '#18181b',
  fontSize: 18,
  editable: true,
  ...options,
});


const DIAGRAM_BOX_SHAPE_IDS = new Set([
  'shape-square',
  'shape-rectangle',
  'shape-rounded-rectangle',
  'flow-process',
]);

const diagramBoxSizeFor = (id: string) => {
  if (id === 'shape-square') return { width: 150, height: 150, rx: 0, ry: 0 };
  if (id === 'shape-rounded-rectangle') return { width: 190, height: 110, rx: 16, ry: 16 };
  return { width: 190, height: 110, rx: 0, ry: 0 };
};

export function createDiagramBoxElement(id = 'shape-rounded-rectangle', label = 'Text') {
  const item = SHAPE_ELEMENTS.find((entry) => entry.id === id) || SHAPE_ELEMENTS.find((entry) => entry.id === 'shape-rounded-rectangle') || SHAPE_ELEMENTS[0];
  const { width, height, rx, ry } = diagramBoxSizeFor(id);
  const diagramBoxId = makeId('diagram-box');
  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width,
    height,
    rx,
    ry,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    strokeUniform: true,
    objectCaching: false,
  });
  const textBox = new fabric.Textbox(label, {
    left: width / 2,
    top: height / 2,
    originX: 'center',
    originY: 'center',
    width: Math.max(40, width - 24),
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '600',
    fill: '#000000',
    textAlign: 'center',
    editable: true,
    objectCaching: false,
  });
  background.set({
    id: `${diagramBoxId}-background`,
    objectType: 'diagramBoxBackground',
    teckstudioObjectType: 'diagramBoxBackground',
    diagramBoxId,
    diagramBoxRole: 'background',
  } as Record<string, unknown>);
  textBox.set({
    id: `${diagramBoxId}-text`,
    name: 'Diagram box text',
    objectType: 'diagramBoxText',
    teckstudioObjectType: 'diagramBoxText',
    diagramBoxId,
    diagramBoxRole: 'text',
  } as Record<string, unknown>);

  const group = new fabric.Group([background, textBox], {
    subTargetCheck: true,
    objectCaching: false,
  });

  return applyElementMetadata(group, makeMetadata('shape', item, {
    id: diagramBoxId,
    name: item.name,
    objectType: 'diagramBox',
    teckstudioObjectType: 'diagramBox',
    diagramBoxId,
    diagramBoxRole: 'container',
    elementSubcategory: 'Diagram Boxes',
    elementTags: Array.from(new Set([...(item.tags || []), 'diagram', 'box', 'connector'])),
    shapeConfig: shapeConfigForObject(id, item, {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
    }),
  }));
}

const makeLinearGradient = (colors: string[], width = 160, height = 160, angle = 135) => {
  const angleRad = (angle * Math.PI) / 180;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.sqrt(width * width + height * height) / 2;
  return new fabric.Gradient({
    type: 'linear',
    coords: {
      x1: centerX - Math.cos(angleRad) * radius,
      y1: centerY - Math.sin(angleRad) * radius,
      x2: centerX + Math.cos(angleRad) * radius,
      y2: centerY + Math.sin(angleRad) * radius,
    },
    colorStops: colors.map((color, index) => ({ offset: colors.length === 1 ? 0 : index / (colors.length - 1), color })),
  });
};

const polygonPoints = (sides: number, radius = 70) => Array.from({ length: sides }, (_, index) => {
  const angle = (Math.PI * 2 * index) / sides - Math.PI / 2;
  return { x: radius + Math.cos(angle) * radius, y: radius + Math.sin(angle) * radius };
});

const starPath = (points: number, outer = 76, inner = 34) => {
  const center = 80;
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / points - Math.PI / 2;
    const prefix = index === 0 ? 'M' : 'L';
    return `${prefix}${center + Math.cos(angle) * radius} ${center + Math.sin(angle) * radius}`;
  }).join(' ') + ' Z';
};

const lineWithHeads = (headStart: boolean, headEnd: boolean, dash?: number[], color = '#8b5cf6') => {
  const parts: fabric.Object[] = [new fabric.Line([0, 35, 190, 35], { stroke: color, strokeWidth: 7, strokeLineCap: 'round', strokeDashArray: dash })];
  if (headEnd) parts.push(new fabric.Path('M0 0 L28 35 L0 70', { left: 164, top: 0, fill: '', stroke: color, strokeWidth: 7, strokeLineCap: 'round', strokeLineJoin: 'round' }));
  if (headStart) parts.push(new fabric.Path('M28 0 L0 35 L28 70', { left: -2, top: 0, fill: '', stroke: color, strokeWidth: 7, strokeLineCap: 'round', strokeLineJoin: 'round' }));
  return new fabric.Group(parts);
};

const shapeConfigForObject = (
  id: string,
  item: EditorElement,
  styles: Required<ElementFactoryStyles>,
): ShapeElementConfig => {
  const config = item.shapeConfig || {};
  const polygonSides = id === 'polygon-pentagon' ? 5
    : id === 'polygon-hexagon' ? 6
      : id === 'polygon-heptagon' ? 7
        : id === 'polygon-octagon' ? 8
          : id === 'polygon-decagon' ? 10
            : config.polygonSides;
  return {
    ...config,
    shapeType: config.shapeType || id,
    category: item.category,
    fill: styles.fill,
    stroke: styles.stroke,
    strokeWidth: styles.strokeWidth,
    polygonSides,
    lineCap: config.lineCap || (id.startsWith('line-') ? 'round' : undefined),
    lineJoin: config.lineJoin || (id.includes('line') || id.includes('arrow') ? 'round' : undefined),
    arrowhead: config.arrowhead || (id.includes('arrow') ? 'end' : undefined),
  };
};

export function createShapeElement(id: string, styles: ElementFactoryStyles = {}) {
  const item = SHAPE_ELEMENTS.find((entry) => entry.id === id) || SHAPE_ELEMENTS[0];
  if (DIAGRAM_BOX_SHAPE_IDS.has(id)) return createDiagramBoxElement(id);
  const fill = styles.fill || '#8b5cf6';
  const stroke = styles.stroke || '#18181b22';
  const strokeWidth = styles.strokeWidth ?? 1;
  let object: fabric.Object;

  if (id.startsWith('line-')) {
    if (id === 'line-dashed') object = new fabric.Line([0, 0, 200, 0], { stroke: fill, strokeWidth: 7, strokeDashArray: [18, 12], strokeLineCap: 'round' });
    else if (id === 'line-dotted') object = new fabric.Line([0, 0, 200, 0], { stroke: fill, strokeWidth: 7, strokeDashArray: [2, 14], strokeLineCap: 'round' });
    else if (id === 'line-arrow') object = lineWithHeads(false, true, undefined, fill);
    else if (id === 'line-double-arrow') object = lineWithHeads(true, true, undefined, fill);
    else if (id === 'line-zigzag') object = new fabric.Path('M0 56 L28 12 L56 56 L84 12 L112 56 L140 12 L168 56 L196 12', { fill: '', stroke: fill, strokeWidth: 8, strokeLineCap: 'round', strokeLineJoin: 'round' });
    else if (id === 'line-wavy') object = new fabric.Path('M0 42 C24 4 48 4 72 42 S120 80 144 42 S192 4 216 42', { fill: '', stroke: fill, strokeWidth: 8, strokeLineCap: 'round' });
    else if (id === 'line-curved') object = new fabric.Path('M5 90 C65 0 145 0 205 90', { fill: '', stroke: fill, strokeWidth: 8, strokeLineCap: 'round' });
    else if (id === 'line-elbow-connector') object = new fabric.Path('M5 15 H92 Q110 15 110 33 V92 Q110 110 128 110 H205', { fill: '', stroke: fill, strokeWidth: 8, strokeLineCap: 'round', strokeLineJoin: 'round' });
    else if (id === 'line-connector') object = new fabric.Path('M5 30 H95 V105 H195', { fill: '', stroke: fill, strokeWidth: 8, strokeLineCap: 'round', strokeLineJoin: 'round' });
    else object = new fabric.Line([0, 0, 200, 0], { stroke: fill, strokeWidth: 7, strokeLineCap: 'round' });
  } else if (id === 'shape-square') object = new fabric.Rect({ width: 130, height: 130, fill, stroke, strokeWidth });
  else if (id === 'shape-rectangle' || id === 'flow-process') object = new fabric.Rect({ width: 190, height: 110, fill, stroke, strokeWidth });
  else if (id === 'shape-rounded-rectangle') object = new fabric.Rect({ width: 190, height: 110, rx: 24, ry: 24, fill, stroke, strokeWidth });
  else if (id === 'shape-circle' || id === 'flow-connector') object = new fabric.Circle({ radius: 68, fill, stroke, strokeWidth });
  else if (id === 'shape-ellipse') object = new fabric.Ellipse({ rx: 90, ry: 56, fill, stroke, strokeWidth });
  else if (id === 'shape-triangle-up') object = new fabric.Triangle({ width: 150, height: 132, fill, stroke, strokeWidth });
  else if (id === 'shape-triangle-down') object = new fabric.Triangle({ width: 150, height: 132, angle: 180, fill, stroke, strokeWidth });
  else if (id === 'shape-pill' || id === 'flow-terminator') object = new fabric.Rect({ width: 200, height: 78, rx: 39, ry: 39, fill, stroke, strokeWidth });
  else if (id === 'shape-diamond' || id === 'flow-decision') object = new fabric.Polygon([{ x: 80, y: 0 }, { x: 160, y: 80 }, { x: 80, y: 160 }, { x: 0, y: 80 }], { fill, stroke, strokeWidth });
  else if (id === 'shape-cross') object = new fabric.Path('M58 0 H102 V58 H160 V102 H102 V160 H58 V102 H0 V58 H58 Z', { fill, stroke, strokeWidth });
  else if (id === 'shape-semicircle') object = new fabric.Path('M0 90 A90 90 0 0 1 180 90 Z', { fill, stroke, strokeWidth });
  else if (id === 'shape-arch') object = new fabric.Path('M0 180 V80 C0 30 38 0 90 0 C142 0 180 30 180 80 V180 Z', { fill, stroke, strokeWidth });
  else if (id === 'shape-wave') object = new fabric.Path('M0 92 C42 36 78 34 124 76 C166 114 196 112 232 58 V152 H0 Z', { fill, stroke, strokeWidth });
  else if (id === 'shape-droplet') object = new fabric.Path('M84 0 C124 56 168 100 168 150 C168 202 130 238 84 238 C38 238 0 202 0 150 C0 100 44 56 84 0 Z', { fill, stroke, strokeWidth });
  else if (id === 'shape-organic-abstract') object = new fabric.Path('M26 34 C70 -14 160 2 210 58 C262 118 206 212 126 198 C54 185 -28 116 26 34 Z', { fill, stroke, strokeWidth });
  else if (id.includes('blob')) object = new fabric.Path('M39 17 C91 -20 182 3 207 66 C239 145 173 223 92 210 C19 199 -23 129 13 63 C19 49 26 30 39 17 Z', { fill, stroke, strokeWidth });
  else if (id.includes('cloud')) object = new fabric.Path('M50 136 C20 136 0 116 0 91 C0 66 19 48 43 48 C54 20 79 4 111 4 C150 4 181 32 186 70 C211 73 230 93 230 119 C230 145 210 164 180 164 H50 Z', { fill, stroke, strokeWidth });
  else if (id === 'shape-leaf') object = new fabric.Path('M86 0 C146 26 160 100 88 176 C18 112 20 36 86 0 Z', { fill, stroke, strokeWidth });
  else if (id === 'flow-data') object = new fabric.Path('M25 0 H180 L155 110 H0 Z', { fill, stroke, strokeWidth });
  else if (id === 'flow-document') object = new fabric.Path('M0 0 H180 V95 C130 120 70 70 0 105 Z', { fill, stroke, strokeWidth });
  else if (id === 'flow-multi-document') object = new fabric.Group([
    new fabric.Path('M18 0 H178 V92 C132 114 76 68 18 102 Z', { left: 32, top: 24, fill: '#ffffff88', stroke: fill, strokeWidth }),
    new fabric.Path('M18 0 H178 V92 C132 114 76 68 18 102 Z', { left: 16, top: 12, fill: '#ffffffaa', stroke: fill, strokeWidth }),
    new fabric.Path('M18 0 H178 V92 C132 114 76 68 18 102 Z', { left: 0, top: 0, fill, stroke, strokeWidth }),
  ]);
  else if (id === 'flow-database') object = new fabric.Group([
    new fabric.Ellipse({ left: 0, top: 0, rx: 92, ry: 28, fill, stroke, strokeWidth }),
    new fabric.Rect({ left: 0, top: 28, width: 184, height: 116, fill, stroke: '', strokeWidth: 0 }),
    new fabric.Path('M0 144 C0 181 184 181 184 144', { fill: '', stroke, strokeWidth }),
    new fabric.Path('M0 86 C0 123 184 123 184 86', { fill: '', stroke: '#ffffff88', strokeWidth: 4 }),
  ]);
  else if (id === 'flow-preparation') object = new fabric.Polygon([{ x: 30, y: 0 }, { x: 170, y: 0 }, { x: 200, y: 55 }, { x: 170, y: 110 }, { x: 30, y: 110 }, { x: 0, y: 55 }], { fill, stroke, strokeWidth });
  else if (id === 'flow-manual-input') object = new fabric.Path('M0 22 L180 0 V105 H0 Z', { fill, stroke, strokeWidth });
  else if (id.startsWith('polygon-')) object = new fabric.Polygon(polygonPoints(id === 'polygon-pentagon' ? 5 : id === 'polygon-hexagon' ? 6 : id === 'polygon-heptagon' ? 7 : id === 'polygon-octagon' ? 8 : 10), { fill, stroke, strokeWidth });
  else if (id.startsWith('star-')) object = new fabric.Path(
    id === 'star-burst' ? starPath(16, 78, 52)
      : id === 'star-seal' ? starPath(12, 78, 58)
        : id === 'star-sunburst' ? starPath(20, 78, 48)
          : starPath(id === 'star-four' ? 4 : id === 'star-six' ? 6 : id === 'star-eight' ? 8 : 5),
    { fill, stroke, strokeWidth },
  );
  else if (id === 'arrow-left') object = new fabric.Path('M152 16 L16 80 L152 144 V102 H210 V58 H152 Z', { fill, stroke, strokeWidth });
  else if (id === 'arrow-up') object = new fabric.Path('M80 8 L144 144 H102 V210 H58 V144 H16 Z', { fill, stroke, strokeWidth });
  else if (id === 'arrow-down') object = new fabric.Path('M80 210 L16 74 H58 V8 H102 V74 H144 Z', { fill, stroke, strokeWidth });
  else if (id === 'arrow-double') object = new fabric.Path('M10 78 L70 18 V54 H150 V18 L210 78 L150 138 V102 H70 V138 Z', { fill, stroke, strokeWidth });
  else if (id === 'arrow-curved') object = new fabric.Path('M20 145 C34 35 132 15 174 72 L194 44 L207 124 L130 104 L160 90 C128 52 60 62 48 152 Z', { fill, stroke, strokeWidth });
  else if (id === 'arrow-circular') object = new fabric.Path('M156 54 L210 54 L210 0 L190 19 C151 -13 89 -4 55 37 C15 86 22 156 70 196 C115 234 180 226 216 182 L183 154 C162 181 123 188 94 164 C62 138 58 92 84 62 C104 38 137 34 156 54 Z', { fill, stroke, strokeWidth });
  else if (id === 'arrow-chevron') object = new fabric.Path('M18 20 L116 88 L18 156 L38 184 L176 88 L38 -8 Z', { fill, stroke, strokeWidth });
  else if (id.includes('sparkle')) object = new fabric.Path(starPath(id.includes('large') ? 8 : 4, id.includes('large') ? 82 : 64, 18), { fill, stroke, strokeWidth });
  else if (id.includes('ribbon')) object = new fabric.Path('M0 20 H210 V92 H0 L28 56 Z M210 20 L182 56 L210 92 Z', { fill, stroke, strokeWidth });
  else if (id.includes('callout')) object = new fabric.Path('M0 24 Q0 0 24 0 H204 Q228 0 228 24 V108 Q228 132 204 132 H92 L38 176 L50 132 H24 Q0 132 0 108 Z', { fill, stroke, strokeWidth });
  else if (id.includes('badge')) object = new fabric.Path(starPath(id.includes('sale') ? 16 : 8, 78, 54), { fill, stroke, strokeWidth });
  else if (id.includes('shield')) object = new fabric.Path('M86 0 L172 34 V100 C172 150 132 186 86 210 C40 186 0 150 0 100 V34 Z', { fill, stroke, strokeWidth });
  else if (id.includes('crown')) object = new fabric.Path('M0 150 L18 42 L70 100 L108 18 L146 100 L198 42 L216 150 Z M18 166 H198 V198 H18 Z', { fill, stroke, strokeWidth });
  else if (id.includes('label') || id.includes('ticket')) object = new fabric.Rect({ width: 220, height: 92, rx: id.includes('ticket') ? 4 : 28, ry: id.includes('ticket') ? 4 : 28, fill, stroke, strokeWidth, strokeDashArray: id.includes('ticket') ? [8, 8] : undefined });
  else if (id.includes('speech-bubble')) object = new fabric.Path(id.includes('thought') ? 'M42 46 C42 18 70 0 112 0 C154 0 188 22 188 56 C188 92 151 113 110 113 C96 113 83 111 72 106 L38 132 L48 93 C33 84 24 68 24 50 Z M8 152 A12 12 0 1 0 8 151 Z' : 'M0 22 Q0 0 22 0 H188 Q210 0 210 22 V104 Q210 126 188 126 H74 L32 166 L42 126 H22 Q0 126 0 104 Z', { fill, stroke, strokeWidth });
  else if (id.includes('heart')) object = new fabric.Path('M105 182 C40 124 0 88 0 43 C0 16 20 0 47 0 C71 0 91 14 105 36 C119 14 139 0 163 0 C190 0 210 16 210 43 C210 88 170 124 105 182 Z', { fill, stroke, strokeWidth });
  else if (id.includes('leaf')) object = new fabric.Path(id.includes('pair') ? 'M82 8 C130 25 142 88 78 145 C16 91 28 30 82 8 Z M134 70 C180 84 194 134 146 176 C98 138 100 92 134 70 Z' : 'M86 0 C146 26 160 100 88 176 C18 112 20 36 86 0 Z', { fill, stroke, strokeWidth });
  else if (id.includes('floral')) object = new fabric.Group([new fabric.Circle({ left: 42, top: 16, radius: 26, fill }), new fabric.Circle({ left: 80, top: 16, radius: 26, fill }), new fabric.Circle({ left: 60, top: 48, radius: 28, fill }), new fabric.Circle({ left: 70, top: 38, radius: 12, fill: '#fef3c7' })]);
  else if (id.includes('doodle-sun')) object = new fabric.Group([new fabric.Circle({ left: 36, top: 36, radius: 42, fill }), new fabric.Path(starPath(12, 82, 62), { left: -2, top: -2, fill: '', stroke: fill, strokeWidth: 7 })]);
  else if (id.includes('doodle-moon')) object = new fabric.Path('M124 0 C88 18 64 56 64 101 C64 146 90 183 128 201 C58 204 0 150 0 88 C0 30 54 -12 124 0 Z', { fill, stroke, strokeWidth });
  else if (id.includes('gradient-orb')) object = new fabric.Circle({ radius: 76, fill: makeLinearGradient([fill, '#22d3ee'], 152, 152), stroke, strokeWidth });
  else if (id.includes('memphis')) object = new fabric.Group(Array.from({ length: 18 }, (_, index) => new fabric.Circle({ left: (index % 6) * 28, top: Math.floor(index / 6) * 28, radius: 5, fill })));
  else if (id.includes('confetti')) object = new fabric.Group(Array.from({ length: 16 }, (_, index) => new fabric.Rect({ left: (index % 4) * 42, top: Math.floor(index / 4) * 30, width: 22, height: 8, angle: index * 17, fill: index % 2 ? '#22d3ee' : fill })));
  else if (id.startsWith('icon-')) object = new fabric.Group([
    new fabric.Circle({ left: 0, top: 0, radius: 64, fill, stroke, strokeWidth }),
    makeTextbox(id.includes('tech') ? '</>' : id.includes('business') ? '↗' : id.includes('education') ? 'A+' : id.includes('healthcare') ? '+' : id.includes('food') ? '☕' : id.includes('travel') ? '⌖' : '★', { left: 18, top: 36, width: 92, fontSize: 38, fontWeight: 'bold', fill: '#ffffff', textAlign: 'center' }),
  ]);
  else object = new fabric.Path('M8 58 H112 L112 28 L154 75 L112 122 V92 H8 Z', { fill, stroke, strokeWidth });

  object.set({ objectCaching: true });
  return applyElementMetadata(object, makeMetadata('shape', item, {
    assetMetadata: item,
    shapeConfig: shapeConfigForObject(id, item, { fill, stroke, strokeWidth }),
  }));
}

type FrameBounds = { left: number; top: number; width: number; height: number };

const normalizedFrameType = (id: string, config?: Partial<FrameElementConfig>) => config?.frameType || id.replace(/^frame-/, '');

const frameSizeFor = (frameType: string) => {
  if (frameType.includes('phone') || frameType === 'story') return { width: 156, height: 280 };
  if (frameType.includes('tablet')) return { width: 188, height: 260 };
  if (frameType.includes('laptop') || frameType.includes('browser') || frameType.includes('desktop') || frameType.includes('film')) return { width: 286, height: 186 };
  if (frameType.includes('polaroid')) return { width: 205, height: 258 };
  if (frameType.includes('postcard')) return { width: 250, height: 176 };
  if (frameType.includes('social-post')) return { width: 220, height: 220 };
  if (frameType.includes('collage')) return { width: 260, height: 214 };
  return { width: 220, height: 220 };
};

const clipBoundsForFrameType = (frameType: string, bounds: FrameBounds): FrameBounds => {
  const inset = (x: number, y = x, bottom = y): FrameBounds => ({
    left: bounds.left + x,
    top: bounds.top + y,
    width: Math.max(10, bounds.width - x * 2),
    height: Math.max(10, bounds.height - y - bottom),
  });
  if (frameType.includes('phone')) return inset(bounds.width * 0.16, bounds.height * 0.11, bounds.height * 0.12);
  if (frameType.includes('tablet')) return inset(bounds.width * 0.13, bounds.height * 0.09, bounds.height * 0.1);
  if (frameType.includes('laptop')) return inset(bounds.width * 0.12, bounds.height * 0.12, bounds.height * 0.28);
  if (frameType.includes('desktop')) return inset(bounds.width * 0.1, bounds.height * 0.1, bounds.height * 0.36);
  if (frameType.includes('browser')) return inset(bounds.width * 0.08, bounds.height * 0.24, bounds.height * 0.1);
  if (frameType.includes('film')) return inset(bounds.width * 0.18, bounds.height * 0.25, bounds.height * 0.25);
  if (frameType.includes('polaroid')) return inset(bounds.width * 0.11, bounds.height * 0.09, bounds.height * 0.32);
  if (frameType.includes('postcard')) return inset(bounds.width * 0.08, bounds.height * 0.1, bounds.height * 0.12);
  if (frameType.includes('paper') || frameType.includes('note') || frameType.includes('torn') || frameType.includes('sticky')) return inset(bounds.width * 0.1, bounds.height * 0.12);
  return inset(Math.min(bounds.width, bounds.height) * 0.08);
};

const localFramePath = (frameType: string, width: number, height: number) => {
  if (frameType.includes('heart')) return 'M105 182 C40 124 0 88 0 43 C0 16 20 0 47 0 C71 0 91 14 105 36 C119 14 139 0 163 0 C190 0 210 16 210 43 C210 88 170 124 105 182 Z';
  if (frameType.includes('star')) return starPath(5, 86, 40);
  if (frameType.includes('arch')) return `M0 ${height} V${height * 0.42} C0 ${height * 0.12} ${width * 0.22} 0 ${width / 2} 0 C${width * 0.78} 0 ${width} ${height * 0.12} ${width} ${height * 0.42} V${height} Z`;
  if (frameType.includes('torn')) return `M0 ${height * 0.08} L${width * 0.1} 0 L${width * 0.23} ${height * 0.08} L${width * 0.36} 0 L${width * 0.51} ${height * 0.08} L${width * 0.66} 0 L${width * 0.8} ${height * 0.08} L${width} 0 V${height * 0.9} L${width * 0.88} ${height} L${width * 0.72} ${height * 0.92} L${width * 0.55} ${height} L${width * 0.38} ${height * 0.92} L${width * 0.18} ${height} L0 ${height * 0.9} Z`;
  if (frameType.includes('scallop')) return 'M24 20 C45 -6 77 -6 98 20 C119 -6 151 -6 172 20 C207 21 230 44 230 76 C256 97 256 130 230 151 C230 183 207 206 172 207 C151 232 119 232 98 207 C77 232 45 232 24 207 C-10 206 -33 183 -33 151 C-59 130 -59 97 -33 76 C-33 44 -10 21 24 20 Z';
  if (frameType.includes('wave') || frameType.includes('liquid')) return `M${width * 0.08} ${height * 0.35} C${width * 0.24} ${height * 0.04} ${width * 0.46} ${height * 0.26} ${width * 0.62} ${height * 0.12} C${width * 0.86} -${height * 0.06} ${width} ${height * 0.24} ${width * 0.94} ${height * 0.56} C${width * 0.87} ${height * 0.92} ${width * 0.55} ${height * 1.04} ${width * 0.25} ${height * 0.88} C0 ${height * 0.75} -${width * 0.04} ${height * 0.55} ${width * 0.08} ${height * 0.35} Z`;
  if (frameType.includes('organic') || frameType.includes('blob')) return 'M39 17 C91 -20 182 3 207 66 C239 145 173 223 92 210 C19 199 -23 129 13 63 C19 49 26 30 39 17 Z';
  return '';
};

const createFrameShape = (
  frameType: string,
  bounds: FrameBounds,
  options: fabric.IObjectOptions & { strokeDashArray?: number[] } = {},
) => {
  const fill = options.fill ?? 'rgba(139,92,246,0.08)';
  const stroke = options.stroke ?? '#8b5cf6';
  const strokeWidth = options.strokeWidth ?? 8;
  const baseOptions = { fill, stroke, strokeWidth, strokeDashArray: options.strokeDashArray, selectable: false, evented: false };
  let shape: fabric.Object;
  if (frameType.includes('circle')) {
    shape = new fabric.Ellipse({ left: bounds.left + bounds.width / 2, top: bounds.top + bounds.height / 2, originX: 'center', originY: 'center', rx: bounds.width / 2, ry: bounds.height / 2, ...baseOptions });
  } else if (frameType.includes('triangle')) {
    shape = new fabric.Triangle({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, ...baseOptions });
  } else {
    const path = localFramePath(frameType, bounds.width, bounds.height);
    if (path) {
      shape = new fabric.Path(path, { ...baseOptions });
      const shapeBounds = shape.getBoundingRect();
      shape.set({
        left: bounds.left,
        top: bounds.top,
        scaleX: bounds.width / Math.max(1, shapeBounds.width),
        scaleY: bounds.height / Math.max(1, shapeBounds.height),
      });
    } else {
      shape = new fabric.Rect({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, rx: frameType.includes('rounded') ? Math.min(42, bounds.width * 0.16) : 10, ry: frameType.includes('rounded') ? Math.min(42, bounds.width * 0.16) : 10, ...baseOptions });
    }
  }
  return shape;
};

const getFrameConfigFromObject = (object: fabric.Object): FrameElementConfig => {
  const direct = object.get('frameConfig' as keyof fabric.Object);
  const elementConfig = object.get('elementConfig' as keyof fabric.Object);
  const metadata = object.get('elementMetadata' as keyof fabric.Object) as ElementMetadata | undefined;
  if (direct && typeof direct === 'object') return direct as FrameElementConfig;
  if (elementConfig && typeof elementConfig === 'object') return elementConfig as FrameElementConfig;
  if (metadata?.frameConfig) return metadata.frameConfig;
  return { frameType: String(object.get('frameType' as keyof fabric.Object) || 'rounded') };
};

export const isFrameElementObject = (object: fabric.Object | null | undefined) => Boolean(
  object &&
  (object.get('elementKind' as keyof fabric.Object) === 'frame' ||
    object.get('objectType' as keyof fabric.Object) === 'frame' ||
    object.get('frameRole' as keyof fabric.Object) === 'container')
);

export const getFrameClipBoundsForObject = (frameObject: fabric.Object): FrameBounds => {
  const config = getFrameConfigFromObject(frameObject);
  const bounds = frameObject.getBoundingRect(true, true);
  return clipBoundsForFrameType(config.frameType || 'rounded', bounds);
};

export const createFrameClipPathForObject = (frameObject: fabric.Object): fabric.Object => {
  const config = getFrameConfigFromObject(frameObject);
  const frameType = config.frameType || 'rounded';
  const bounds = getFrameClipBoundsForObject(frameObject);
  let clipPath: fabric.Object;
  if (frameType.includes('collage')) {
    const slots = frameType.includes('2')
      ? [{ left: 0, top: 0, width: bounds.width * 0.48, height: bounds.height }, { left: bounds.width * 0.52, top: 0, width: bounds.width * 0.48, height: bounds.height }]
      : frameType.includes('3')
        ? [{ left: 0, top: 0, width: bounds.width * 0.58, height: bounds.height }, { left: bounds.width * 0.62, top: 0, width: bounds.width * 0.38, height: bounds.height * 0.47 }, { left: bounds.width * 0.62, top: bounds.height * 0.53, width: bounds.width * 0.38, height: bounds.height * 0.47 }]
        : [{ left: 0, top: 0, width: bounds.width * 0.47, height: bounds.height * 0.47 }, { left: bounds.width * 0.53, top: 0, width: bounds.width * 0.47, height: bounds.height * 0.47 }, { left: 0, top: bounds.height * 0.53, width: bounds.width * 0.47, height: bounds.height * 0.47 }, { left: bounds.width * 0.53, top: bounds.height * 0.53, width: bounds.width * 0.47, height: bounds.height * 0.47 }];
    clipPath = new fabric.Group(slots.map((slot) => new fabric.Rect({ ...slot, rx: 10, ry: 10, fill: '#000000' })), { left: bounds.left, top: bounds.top });
  } else {
    clipPath = createFrameShape(frameType, bounds, { fill: '#000000', strokeWidth: 0, stroke: undefined });
  }
  clipPath.set({ absolutePositioned: true, objectCaching: false } as Record<string, unknown>);
  return clipPath;
};

export function createFrameElement(id: string) {
  const item = FRAME_ELEMENTS.find((entry) => entry.id === id) || FRAME_ELEMENTS[0];
  const config = item.frameConfig as FrameElementConfig;
  const stroke = config.borderColor || '#8b5cf6';
  const strokeWidth = config.borderWidth || 8;
  const frameType = normalizedFrameType(id, config);
  const { width, height } = frameSizeFor(frameType);
  let outline: fabric.Object;

  if (frameType.includes('phone')) outline = new fabric.Group([
    new fabric.Rect({ left: 0, top: 0, width, height, rx: 32, ry: 32, fill: '#09090b', stroke, strokeWidth }),
    new fabric.Rect({ left: 18, top: 28, width: width - 36, height: height - 58, rx: 18, ry: 18, fill: 'rgba(139,92,246,0.12)', stroke: '#27272a', strokeWidth: 2 }),
    new fabric.Circle({ left: width / 2 - 5, top: height - 20, radius: 5, fill: '#71717a' }),
  ]);
  else if (frameType.includes('laptop')) outline = new fabric.Group([
    new fabric.Rect({ left: 16, top: 0, width: width - 32, height: height - 52, rx: 16, ry: 16, fill: '#09090b', stroke, strokeWidth }),
    new fabric.Rect({ left: 34, top: 22, width: width - 68, height: height - 90, rx: 8, ry: 8, fill: 'rgba(139,92,246,0.12)' }),
    new fabric.Path(`M0 ${height - 34} H${width} L${width - 22} ${height} H22 Z`, { fill: frameType.includes('light') ? '#e5e7eb' : '#334155', stroke, strokeWidth: 4 }),
  ]);
  else if (frameType.includes('browser')) outline = new fabric.Group([
    new fabric.Rect({ left: 0, top: 0, width, height, rx: 16, ry: 16, fill: frameType.includes('dark') ? '#09090b' : '#27272a', stroke, strokeWidth }),
    new fabric.Line([0, 38, width, 38], { stroke, strokeWidth: 5 }),
    new fabric.Circle({ left: 18, top: 16, radius: 5, fill: '#fb7185' }),
    new fabric.Circle({ left: 34, top: 16, radius: 5, fill: '#facc15' }),
    new fabric.Circle({ left: 50, top: 16, radius: 5, fill: '#22c55e' }),
    new fabric.Rect({ left: 20, top: 54, width: width - 40, height: height - 74, rx: 8, ry: 8, fill: 'rgba(139,92,246,0.12)' }),
  ]);
  else if (frameType.includes('film-strip')) outline = new fabric.Group([
    new fabric.Rect({ left: 0, top: 22, width, height: height - 44, rx: 14, ry: 14, fill: '#09090b', stroke, strokeWidth }),
    ...Array.from({ length: 8 }, (_, index) => new fabric.Rect({ left: 16 + index * 31, top: 34, width: 12, height: 12, rx: 2, ry: 2, fill: '#f8fafc' })),
    ...Array.from({ length: 8 }, (_, index) => new fabric.Rect({ left: 16 + index * 31, top: height - 46, width: 12, height: 12, rx: 2, ry: 2, fill: '#f8fafc' })),
    new fabric.Rect({ left: 46, top: 58, width: width - 92, height: height - 116, rx: 6, ry: 6, fill: 'rgba(139,92,246,0.12)' }),
  ]);
  else if (frameType.includes('polaroid')) outline = new fabric.Group([
    new fabric.Rect({ left: 0, top: 0, width, height, rx: 8, ry: 8, fill: '#fafafa', stroke: '#ffffff', strokeWidth }),
    new fabric.Rect({ left: 22, top: 22, width: width - 44, height: height - 92, rx: 6, ry: 6, fill: 'rgba(139,92,246,0.12)' }),
    new fabric.Line([48, height - 42, width - 48, height - 42], { stroke: '#d4d4d8', strokeWidth: 5, strokeLineCap: 'round' }),
  ]);
  else if (frameType.includes('collage')) {
    const slotBounds = frameType.includes('2')
      ? [{ left: 0, top: 0, width: width * 0.48, height }, { left: width * 0.52, top: 0, width: width * 0.48, height }]
      : frameType.includes('3')
        ? [{ left: 0, top: 0, width: width * 0.58, height }, { left: width * 0.62, top: 0, width: width * 0.38, height: height * 0.47 }, { left: width * 0.62, top: height * 0.53, width: width * 0.38, height: height * 0.47 }]
        : [{ left: 0, top: 0, width: width * 0.47, height: height * 0.47 }, { left: width * 0.53, top: 0, width: width * 0.47, height: height * 0.47 }, { left: 0, top: height * 0.53, width: width * 0.47, height: height * 0.47 }, { left: width * 0.53, top: height * 0.53, width: width * 0.47, height: height * 0.47 }];
    outline = new fabric.Group(slotBounds.map((slot) => new fabric.Rect({ ...slot, rx: 12, ry: 12, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth })));
  }
  else if (frameType.includes('floral') || frameType.includes('botanical') || frameType.includes('leaf')) outline = new fabric.Group([
    new fabric.Rect({ left: 18, top: 18, width: width - 36, height: height - 36, rx: 30, ry: 30, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth }),
    new fabric.Path('M16 32 C42 -6 72 20 40 52 C24 52 8 44 16 32 Z', { fill: frameType.includes('leaf') ? '#22c55e' : '#fb7185' }),
    new fabric.Path(`M${width - 16} ${height - 32} C${width - 42} ${height + 6} ${width - 72} ${height - 20} ${width - 40} ${height - 52} C${width - 24} ${height - 52} ${width - 8} ${height - 44} ${width - 16} ${height - 32} Z`, { fill: frameType.includes('leaf') ? '#16a34a' : '#f9a8d4' }),
  ]);
  else if (frameType.includes('desktop')) outline = new fabric.Group([new fabric.Rect({ left: 0, top: 0, width: 260, height: 150, rx: 12, ry: 12, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth }), new fabric.Rect({ left: 102, top: 158, width: 56, height: 28, fill: stroke }), new fabric.Rect({ left: 68, top: 190, width: 124, height: 12, rx: 6, ry: 6, fill: stroke })]);
  else if (frameType.includes('tablet')) outline = new fabric.Rect({ left: 0, top: 0, width: 180, height: 250, rx: 24, ry: 24, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth, strokeDashArray: [12, 8] });
  else if (frameType.includes('letter') || frameType.includes('number')) {
    const token = (id.match(/(?:letter|number)-([a-z0-9])/i)?.[1] || 'A').toUpperCase();
    outline = makeTextbox(token, { left: 0, top: -8, width: 210, height: 210, fontSize: 180, fontWeight: 'bold', textAlign: 'center', fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth });
  }
  else if (id.includes('collage-2')) outline = new fabric.Group([new fabric.Rect({ left: 0, top: 0, width: 102, height: 210, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth }), new fabric.Rect({ left: 116, top: 0, width: 102, height: 210, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth })]);
  else if (id.includes('collage-3')) outline = new fabric.Group([new fabric.Rect({ left: 0, top: 0, width: 140, height: 210, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth }), new fabric.Rect({ left: 154, top: 0, width: 96, height: 98, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth }), new fabric.Rect({ left: 154, top: 112, width: 96, height: 98, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth })]);
  else if (id.includes('collage')) outline = new fabric.Group([0, 1, 2, 3].map((index) => new fabric.Rect({ left: (index % 2) * 112, top: Math.floor(index / 2) * 112, width: 100, height: 100, fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth })));
  else outline = createFrameShape(frameType, { left: 0, top: 0, width, height }, { fill: 'rgba(139,92,246,0.08)', stroke, strokeWidth, strokeDashArray: [12, 8] });

  const label = makeTextbox('Drop image here', { left: 20, top: Math.max(74, height / 2 - 14), width: Math.max(160, width - 40), fontSize: 18, textAlign: 'center', fill: '#71717a' });
  const group = new fabric.Group([outline, label], { subTargetCheck: true });
  return applyElementMetadata(group, makeMetadata('frame', item, { frameConfig: config, frameType, frameRole: 'container' }));
}

export function createChartElement(id: string) {
  const item = CHART_ELEMENTS.find((entry) => entry.id === id) || CHART_ELEMENTS[0];
  const config = item.chartConfig as ChartElementConfig;
  const objects: fabric.Object[] = [new fabric.Rect({ width: 360, height: 250, rx: 22, ry: 22, fill: '#ffffff', stroke: '#e4e4e7', strokeWidth: 2 })];
  objects.push(makeTextbox(config.title || item.name, { left: 24, top: 18, width: 300, fontSize: 22, fontWeight: 'bold', fill: '#18181b' }));

  if (config.chartType === 'kpi-card') {
    objects.push(makeTextbox('$42.8K', { left: 24, top: 76, width: 180, fontSize: 42, fontWeight: 'bold', fill: '#18181b' }));
    objects.push(new fabric.Rect({ left: 210, top: 78, width: 112, height: 34, rx: 17, ry: 17, fill: '#dcfce7' }));
    objects.push(makeTextbox('+18.4%', { left: 224, top: 87, width: 82, fontSize: 14, fontWeight: 'bold', fill: '#15803d', textAlign: 'center' }));
    [42, 66, 50, 92, 118, 82].forEach((value, index) => {
      objects.push(new fabric.Rect({ left: 32 + index * 48, top: 220 - value, width: 28, height: value, rx: 8, ry: 8, fill: index % 2 ? '#22d3ee' : '#8b5cf6', opacity: 0.9 }));
    });
    objects.push(makeTextbox('Revenue vs last month', { left: 24, top: 128, width: 220, fontSize: 15, fill: '#71717a' }));
  } else if (config.chartType === 'progress-ring') {
    objects.push(new fabric.Circle({ left: 96, top: 72, radius: 68, fill: '', stroke: '#e4e4e7', strokeWidth: 18 }));
    objects.push(new fabric.Circle({ left: 96, top: 72, radius: 68, fill: '', stroke: '#10b981', strokeWidth: 18, strokeDashArray: [290, 140], strokeLineCap: 'round', angle: -92 }));
    objects.push(makeTextbox('74%', { left: 104, top: 122, width: 120, fontSize: 34, fontWeight: 'bold', fill: '#18181b', textAlign: 'center' }));
    objects.push(makeTextbox('Goal complete', { left: 72, top: 178, width: 184, fontSize: 16, fill: '#52525b', textAlign: 'center' }));
  } else if (config.chartType === 'funnel') {
    const layers = [
      { label: 'Visitors', value: '12K', color: '#f97316', path: 'M18 0 H262 L236 42 H44 Z' },
      { label: 'Leads', value: '4.8K', color: '#fb7185', path: 'M44 52 H236 L210 94 H70 Z' },
      { label: 'Trials', value: '1.9K', color: '#a855f7', path: 'M70 104 H210 L184 146 H96 Z' },
      { label: 'Sales', value: '860', color: '#22d3ee', path: 'M96 156 H184 L162 198 H118 Z' },
    ];
    layers.forEach((layer, index) => {
      objects.push(new fabric.Path(layer.path, { left: 42, top: 46, fill: layer.color, opacity: 0.92 }));
      objects.push(makeTextbox(layer.label, { left: 90, top: 54 + index * 52, width: 102, fontSize: 15, fontWeight: 'bold', fill: '#ffffff', textAlign: 'center' }));
      objects.push(makeTextbox(layer.value, { left: 198, top: 54 + index * 52, width: 54, fontSize: 14, fill: '#ffffff', textAlign: 'center' }));
    });
  } else if (config.chartType === 'timeline') {
    objects.push(new fabric.Line([42, 134, 318, 134], { stroke: '#d4d4d8', strokeWidth: 5, strokeLineCap: 'round' }));
    ['Plan', 'Design', 'Build', 'Launch'].forEach((label, index) => {
      const left = 52 + index * 82;
      objects.push(new fabric.Circle({ left, top: 116, radius: 18, fill: index % 2 ? '#22d3ee' : '#8b5cf6', stroke: '#ffffff', strokeWidth: 4 }));
      objects.push(makeTextbox(label, { left: left - 24, top: 154, width: 78, fontSize: 14, fontWeight: 'bold', fill: '#18181b', textAlign: 'center' }));
      objects.push(makeTextbox(`W${index + 1}`, { left: left - 15, top: 88, width: 48, fontSize: 12, fill: '#71717a', textAlign: 'center' }));
    });
  } else if (config.chartType === 'gauge') {
    objects.push(new fabric.Path('M70 184 A110 110 0 0 1 290 184', { fill: '', stroke: '#e4e4e7', strokeWidth: 24, strokeLineCap: 'round' }));
    objects.push(new fabric.Path('M70 184 A110 110 0 0 1 248 94', { fill: '', stroke: '#f59e0b', strokeWidth: 24, strokeLineCap: 'round' }));
    objects.push(new fabric.Line([180, 184, 238, 120], { stroke: '#18181b', strokeWidth: 7, strokeLineCap: 'round' }));
    objects.push(new fabric.Circle({ left: 168, top: 172, radius: 12, fill: '#18181b' }));
    objects.push(makeTextbox('82', { left: 130, top: 142, width: 100, fontSize: 34, fontWeight: 'bold', fill: '#18181b', textAlign: 'center' }));
    objects.push(makeTextbox('Healthy', { left: 124, top: 184, width: 112, fontSize: 15, fill: '#71717a', textAlign: 'center' }));
  } else if (config.chartType.includes('pie') || config.chartType.includes('donut')) {
    const colors = ['#8b5cf6', '#22d3ee', '#f97316', '#facc15'];
    objects.push(new fabric.Circle({ left: 92, top: 78, radius: 62, fill: colors[0], opacity: 0.95 }));
    objects.push(new fabric.Path('M154 140 L154 78 A62 62 0 0 1 210 114 Z', { fill: colors[1] }));
    objects.push(new fabric.Path('M154 140 L210 114 A62 62 0 0 1 122 194 Z', { fill: colors[2] }));
    if (config.chartType === 'donut') objects.push(new fabric.Circle({ left: 122, top: 108, radius: 32, fill: '#ffffff' }));
  } else if (config.chartType.includes('line') || config.chartType === 'area') {
    objects.push(new fabric.Line([42, 206, 322, 206], { stroke: '#d4d4d8', strokeWidth: 2 }));
    objects.push(new fabric.Line([42, 72, 42, 206], { stroke: '#d4d4d8', strokeWidth: 2 }));
    if (config.chartType === 'area') objects.push(new fabric.Path('M48 184 L112 132 L176 156 L240 92 L310 118 L310 206 L48 206 Z', { fill: '#8b5cf633', stroke: '' }));
    objects.push(new fabric.Path('M48 184 L112 132 L176 156 L240 92 L310 118', { fill: '', stroke: '#8b5cf6', strokeWidth: 6, strokeLineCap: 'round', strokeLineJoin: 'round' }));
  } else if (config.chartType.includes('scatter') || config.chartType.includes('bubble')) {
    objects.push(new fabric.Line([42, 206, 322, 206], { stroke: '#d4d4d8', strokeWidth: 2 }));
    objects.push(new fabric.Line([42, 72, 42, 206], { stroke: '#d4d4d8', strokeWidth: 2 }));
    [[80, 160, 12], [120, 116, 18], [172, 150, 10], [230, 96, 24], [288, 134, 15]].forEach(([left, top, radius]) => objects.push(new fabric.Circle({ left, top, radius, fill: '#8b5cf6', opacity: 0.78 })));
  } else {
    const values = config.datasets[0]?.values || [34, 58, 42, 76];
    values.forEach((value, index) => objects.push(new fabric.Rect({ left: 56 + index * 62, top: 206 - value * 1.5, width: 38, height: value * 1.5, rx: 8, ry: 8, fill: index % 2 ? '#22d3ee' : '#8b5cf6' })));
    objects.push(new fabric.Line([42, 206, 322, 206], { stroke: '#d4d4d8', strokeWidth: 2 }));
  }

  const group = new fabric.Group(objects, { subTargetCheck: true });
  return applyElementMetadata(group, makeMetadata('chart', item, { chartConfig: config }));
}

export function createTableElement(id: string) {
  const item = TABLE_ELEMENTS.find((entry) => entry.id === id) || TABLE_ELEMENTS[0];
  const config = item.tableConfig as TableElementConfig;
  const cellWidth = 92;
  const cellHeight = 44;
  const objects: fabric.Object[] = [];
  config.cells.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    objects.push(new fabric.Rect({ left: columnIndex * cellWidth, top: rowIndex * cellHeight, width: cellWidth, height: cellHeight, fill: cell.background || '#ffffff', stroke: config.borderColor || '#d4d4d8', strokeWidth: config.borderWidth || 1 }));
    objects.push(makeTextbox(cell.text, { left: columnIndex * cellWidth + 8, top: rowIndex * cellHeight + 12, width: cellWidth - 16, fontSize: 13, fill: cell.color || '#18181b', fontWeight: rowIndex === 0 && config.headerRow ? 'bold' : 'normal' }));
  }));
  const group = new fabric.Group(objects, { subTargetCheck: true });
  return applyElementMetadata(group, makeMetadata('table', item, { tableConfig: config }));
}

export function createFormElement(id: string) {
  const item = FORM_ELEMENTS.find((entry) => entry.id === id) || FORM_ELEMENTS[0];
  const config = item.formConfig as FormElementConfig;
  const objects: fabric.Object[] = [new fabric.Rect({ width: 330, height: 118 + config.fields.length * 70, rx: 28, ry: 28, fill: '#ffffff', stroke: '#e4e4e7', strokeWidth: 2 })];
  objects.push(makeTextbox(config.title || item.name, { left: 28, top: 26, width: 270, fontSize: 26, fontWeight: 'bold', fill: '#18181b' }));
  config.fields.forEach((field, index) => {
    const top = 76 + index * 70;
    objects.push(makeTextbox(`${field.label}${field.required ? ' *' : ''}`, { left: 28, top, width: 260, fontSize: 14, fontWeight: 'bold', fill: '#52525b' }));
    if (field.type === 'rating') {
      for (let i = 0; i < 5; i += 1) objects.push(new fabric.Path(starPath(5, 13, 6), { left: 28 + i * 32, top: top + 24, fill: '#facc15' }));
    } else if (field.type === 'radio' || field.type === 'checkbox') {
      (field.options || ['Option']).slice(0, 3).forEach((option, optionIndex) => {
        objects.push(new fabric.Circle({ left: 30 + optionIndex * 82, top: top + 31, radius: 8, fill: '#ffffff', stroke: '#8b5cf6', strokeWidth: 2 }));
        objects.push(makeTextbox(option, { left: 48 + optionIndex * 82, top: top + 24, width: 65, fontSize: 13, fill: '#18181b' }));
      });
    } else {
      objects.push(new fabric.Rect({ left: 28, top: top + 24, width: 274, height: 42, rx: 12, ry: 12, fill: '#f4f4f5', stroke: '#d4d4d8', strokeWidth: 1 }));
      objects.push(makeTextbox(field.placeholder || field.label, { left: 44, top: top + 36, width: 230, fontSize: 14, fill: '#71717a' }));
    }
  });
  const buttonTop = 84 + config.fields.length * 70;
  objects.push(new fabric.Rect({ left: 28, top: buttonTop, width: 274, height: 48, rx: 16, ry: 16, fill: '#8b5cf6' }));
  objects.push(makeTextbox(config.submitLabel || 'Submit', { left: 28, top: buttonTop + 13, width: 274, fontSize: 16, fontWeight: 'bold', fill: '#ffffff', textAlign: 'center' }));
  const group = new fabric.Group(objects, { subTargetCheck: true });
  return applyElementMetadata(group, makeMetadata('form', item, { formConfig: config }));
}

export function createAnimationElement(id: string) {
  const item = ANIMATION_ELEMENTS.find((entry) => entry.id === id) || ANIMATION_ELEMENTS[0];
  const config = item.animationConfig as AnimationElementConfig;
  const accent = id.includes('food') ? '#f97316' : id.includes('emoji') ? '#facc15' : id.includes('festive') ? '#ec4899' : '#8b5cf6';
  const objects: fabric.Object[] = [new fabric.Rect({ width: 260, height: 155, rx: 24, ry: 24, fill: makeLinearGradient(['#18181b', '#312e81'], 260, 155), stroke: accent, strokeWidth: 2 })];
  objects.push(new fabric.Circle({ left: 22, top: 26, radius: 34, fill: accent, opacity: 0.9 }));
  objects.push(new fabric.Path(id.includes('arrow') ? 'M0 24 H78 M54 0 L82 24 L54 48' : starPath(5, 34, 14), { left: 88, top: 22, fill: id.includes('arrow') ? '' : '#ffffff', stroke: '#ffffff', strokeWidth: id.includes('arrow') ? 7 : 0, strokeLineCap: 'round', strokeLineJoin: 'round' }));
  objects.push(makeTextbox(item.name, { left: 22, top: 100, width: 216, fontSize: 19, fontWeight: 'bold', fill: '#ffffff' }));
  objects.push(makeTextbox(`${config.animationType} • loop`, { left: 22, top: 127, width: 210, fontSize: 13, fill: '#d4d4d8' }));
  const group = new fabric.Group(objects);
  return applyElementMetadata(group, makeMetadata('animation', item, { animationConfig: config, isAnimated: true }));
}

export function createThreeDElement(id: string) {
  const item = THREE_D_ELEMENTS.find((entry) => entry.id === id) || THREE_D_ELEMENTS[0];
  const config = item.threeDConfig as ThreeDElementConfig;
  let object: fabric.Object;
  if (id.includes('arrow')) {
    object = new fabric.Group([
      new fabric.Path('M0 28 H92', { left: 0, top: 0, stroke: '#c084fc', strokeWidth: 18, strokeLineCap: 'round' }),
      new fabric.Path('M68 0 L128 37 L68 74 Z', { left: 58, top: -9, fill: makeLinearGradient(['#f0abfc', '#7c3aed'], 72, 92), stroke: '#581c87', strokeWidth: 2 }),
      new fabric.Path('M8 18 H88', { left: 0, top: -2, stroke: '#ffffff99', strokeWidth: 5, strokeLineCap: 'round' }),
    ]);
  } else if (id.includes('star')) {
    object = new fabric.Group([
      new fabric.Path(starPath(5, 68, 30), { fill: makeLinearGradient(['#fde68a', '#f59e0b', '#7c2d12'], 138, 138), stroke: '#78350f', strokeWidth: 2 }),
      new fabric.Path(starPath(5, 38, 16), { left: 18, top: 15, fill: '#ffffff66' }),
    ]);
  } else if (id.includes('emoji')) {
    object = new fabric.Group([
      new fabric.Circle({ left: 0, top: 0, radius: 64, fill: makeLinearGradient(['#fef3c7', '#f59e0b'], 128, 128), stroke: '#92400e', strokeWidth: 2 }),
      new fabric.Circle({ left: 34, top: 40, radius: 8, fill: '#451a03' }),
      new fabric.Circle({ left: 78, top: 40, radius: 8, fill: '#451a03' }),
      new fabric.Path('M38 76 Q64 102 92 76', { fill: '', stroke: '#451a03', strokeWidth: 6, strokeLineCap: 'round' }),
    ]);
  } else if (id.includes('mascot')) {
    object = new fabric.Group([
      new fabric.Rect({ left: 18, top: 28, width: 92, height: 100, rx: 38, ry: 38, fill: makeLinearGradient(['#bae6fd', '#8b5cf6'], 128, 140), stroke: '#4c1d95', strokeWidth: 2 }),
      new fabric.Circle({ left: 32, top: 48, radius: 8, fill: '#0f172a' }),
      new fabric.Circle({ left: 78, top: 48, radius: 8, fill: '#0f172a' }),
      new fabric.Path(starPath(5, 16, 7), { left: 50, top: 72, fill: '#fef3c7' }),
    ]);
  } else if (id.includes('sports')) {
    object = new fabric.Group([
      new fabric.Circle({ left: 0, top: 0, radius: 64, fill: makeLinearGradient(['#fed7aa', '#f97316'], 128, 128), stroke: '#7c2d12', strokeWidth: 4 }),
      new fabric.Path('M64 0 C44 28 44 98 64 128', { fill: '', stroke: '#7c2d12', strokeWidth: 5 }),
      new fabric.Path('M0 64 C28 44 98 44 128 64', { fill: '', stroke: '#7c2d12', strokeWidth: 5 }),
      new fabric.Path('M18 20 C52 44 78 44 110 20', { fill: '', stroke: '#7c2d12', strokeWidth: 4 }),
      new fabric.Path('M18 108 C52 84 78 84 110 108', { fill: '', stroke: '#7c2d12', strokeWidth: 4 }),
    ]);
  } else if (id.includes('leaf')) {
    object = new fabric.Group([
      new fabric.Path('M72 0 C118 22 130 82 72 140 C10 86 20 28 72 0 Z', { fill: makeLinearGradient(['#bbf7d0', '#16a34a', '#14532d'], 140, 150), stroke: '#14532d', strokeWidth: 2 }),
      new fabric.Path('M70 16 C76 54 72 94 48 130', { fill: '', stroke: '#dcfce7', strokeWidth: 4, strokeLineCap: 'round' }),
    ]);
  } else if (id.includes('tree') || id.includes('flower')) {
    object = new fabric.Group([
      new fabric.Rect({ left: 54, top: 82, width: 20, height: 62, rx: 10, ry: 10, fill: '#92400e' }),
      new fabric.Circle({ left: 18, top: 18, radius: 44, fill: makeLinearGradient(['#bbf7d0', '#22c55e'], 96, 96), stroke: '#14532d', strokeWidth: 2 }),
      new fabric.Circle({ left: 66, top: 36, radius: 36, fill: makeLinearGradient(['#dcfce7', '#16a34a'], 80, 80), stroke: '#14532d', strokeWidth: 2 }),
    ]);
  } else if (id.includes('cube')) {
    object = new fabric.Group([
      new fabric.Polygon([{ x: 45, y: 0 }, { x: 105, y: 25 }, { x: 60, y: 50 }, { x: 0, y: 25 }], { fill: '#c084fc', stroke: '#581c87', strokeWidth: 1 }),
      new fabric.Polygon([{ x: 0, y: 25 }, { x: 60, y: 50 }, { x: 60, y: 115 }, { x: 0, y: 86 }], { fill: '#7c3aed', stroke: '#581c87', strokeWidth: 1 }),
      new fabric.Polygon([{ x: 60, y: 50 }, { x: 105, y: 25 }, { x: 105, y: 88 }, { x: 60, y: 115 }], { fill: '#4f46e5', stroke: '#312e81', strokeWidth: 1 }),
    ]);
  } else if (id.includes('laptop') || id.includes('phone') || id.includes('chip') || id.includes('server')) {
    object = new fabric.Group([
      new fabric.Rect({ left: 0, top: 24, width: 138, height: 88, rx: 14, ry: 14, fill: makeLinearGradient(['#e0f2fe', '#2563eb'], 150, 100), stroke: '#1e3a8a', strokeWidth: 2 }),
      new fabric.Rect({ left: 20, top: 44, width: 98, height: 44, rx: 8, ry: 8, fill: '#0f172a99' }),
      new fabric.Rect({ left: 24, top: 124, width: 92, height: 14, rx: 7, ry: 7, fill: '#94a3b8' }),
      ...Array.from({ length: 4 }, (_, index) => new fabric.Circle({ left: 34 + index * 22, top: 58, radius: 4, fill: index % 2 ? '#22d3ee' : '#8b5cf6' })),
    ]);
  } else if (id.includes('briefcase') || id.includes('chart') || id.includes('target')) {
    object = new fabric.Group([
      new fabric.Rect({ left: 8, top: 38, width: 132, height: 92, rx: 18, ry: 18, fill: makeLinearGradient(['#fde68a', '#f97316'], 150, 130), stroke: '#7c2d12', strokeWidth: 2 }),
      new fabric.Rect({ left: 48, top: 18, width: 52, height: 28, rx: 12, ry: 12, fill: '#fed7aa', stroke: '#7c2d12', strokeWidth: 2 }),
      new fabric.Rect({ left: 30, top: 82, width: 22, height: 34, rx: 7, ry: 7, fill: '#ffffff99' }),
      new fabric.Rect({ left: 64, top: 64, width: 22, height: 52, rx: 7, ry: 7, fill: '#ffffffaa' }),
      new fabric.Rect({ left: 98, top: 50, width: 22, height: 66, rx: 7, ry: 7, fill: '#ffffffcc' }),
    ]);
  } else if (id.includes('burger') || id.includes('coffee') || id.includes('cupcake')) {
    object = new fabric.Group([
      new fabric.Rect({ left: 22, top: 54, width: 108, height: 58, rx: 28, ry: 28, fill: makeLinearGradient(['#fed7aa', '#f97316'], 120, 80), stroke: '#7c2d12', strokeWidth: 2 }),
      new fabric.Rect({ left: 30, top: 94, width: 92, height: 20, rx: 10, ry: 10, fill: '#fef3c7' }),
      new fabric.Circle({ left: 44, top: 24, radius: 8, fill: '#ffffff99' }),
      new fabric.Circle({ left: 72, top: 16, radius: 7, fill: '#ffffff88' }),
      new fabric.Circle({ left: 96, top: 26, radius: 6, fill: '#ffffff77' }),
    ]);
  } else if (id.includes('rocket')) {
    object = new fabric.Group([new fabric.Path('M65 0 C110 40 108 105 70 150 L45 126 C15 118 0 96 0 96 C30 96 36 72 40 52 Z', { fill: makeLinearGradient(['#f8fafc', '#8b5cf6'], 130, 160), stroke: '#4c1d95', strokeWidth: 2 }), new fabric.Circle({ left: 50, top: 48, radius: 16, fill: '#22d3ee' })]);
  } else if (id.includes('panda')) {
    object = new fabric.Group([new fabric.Circle({ left: 0, top: 0, radius: 58, fill: '#ffffff', stroke: '#18181b', strokeWidth: 3 }), new fabric.Circle({ left: -2, top: 8, radius: 18, fill: '#18181b' }), new fabric.Circle({ left: 74, top: 8, radius: 18, fill: '#18181b' }), new fabric.Circle({ left: 38, top: 50, radius: 10, fill: '#18181b' })]);
  } else if (id.includes('lion') || id.includes('tiger') || id.includes('dog') || id.includes('cat')) {
    object = new fabric.Group([
      new fabric.Circle({ left: 0, top: 0, radius: 60, fill: makeLinearGradient(['#fed7aa', id.includes('tiger') ? '#f97316' : '#f59e0b'], 128, 128), stroke: '#7c2d12', strokeWidth: 3 }),
      new fabric.Circle({ left: 28, top: 42, radius: 8, fill: '#451a03' }),
      new fabric.Circle({ left: 78, top: 42, radius: 8, fill: '#451a03' }),
      new fabric.Path('M50 72 Q62 84 76 72', { fill: '', stroke: '#451a03', strokeWidth: 5, strokeLineCap: 'round' }),
      new fabric.Path('M12 8 L34 34 L0 36 Z', { fill: '#f97316', stroke: '#7c2d12', strokeWidth: 2 }),
      new fabric.Path('M112 8 L92 34 L126 36 Z', { fill: '#f97316', stroke: '#7c2d12', strokeWidth: 2 }),
    ]);
  } else if (id.includes('gem') || id.includes('torus') || id.includes('pyramid') || id.includes('cylinder')) {
    object = new fabric.Group([
      new fabric.Polygon([{ x: 72, y: 0 }, { x: 138, y: 42 }, { x: 112, y: 130 }, { x: 32, y: 130 }, { x: 6, y: 42 }], { fill: makeLinearGradient(['#f0abfc', '#06b6d4', '#4f46e5'], 150, 150), stroke: '#312e81', strokeWidth: 2 }),
      new fabric.Polygon([{ x: 72, y: 0 }, { x: 96, y: 42 }, { x: 72, y: 130 }, { x: 48, y: 42 }], { fill: '#ffffff55' }),
    ]);
  } else if (id.includes('paper-plane') || id.includes('globe')) {
    object = new fabric.Group([
      new fabric.Circle({ left: 10, top: 10, radius: 58, fill: makeLinearGradient(['#bfdbfe', '#2563eb'], 128, 128), stroke: '#1e3a8a', strokeWidth: 2 }),
      new fabric.Path('M10 64 C44 42 82 42 116 64 M64 10 C48 42 48 86 64 126 M64 10 C82 42 82 86 64 126', { fill: '', stroke: '#dbeafe', strokeWidth: 4, strokeLineCap: 'round' }),
      new fabric.Path('M16 8 L138 54 L82 72 L62 128 L45 82 Z', { fill: '#ffffffcc', stroke: '#1e3a8a', strokeWidth: 2, angle: -8 }),
    ]);
  } else {
    object = new fabric.Group([new fabric.Circle({ left: 0, top: 0, radius: 64, fill: makeLinearGradient(['#ffffff', '#a78bfa', '#4f46e5'], 128, 128), stroke: '#ffffff66', strokeWidth: 2 }), new fabric.Circle({ left: 24, top: 20, radius: 16, fill: '#ffffff99' })]);
  }
  object.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.28)', blur: 18, offsetX: 0, offsetY: 12 }));
  object.scaleToWidth(150);
  return applyElementMetadata(object, makeMetadata('three-d', item, { threeDConfig: config, threeDEffectVariant: 0 }));
}

export function createVideoElement(id: string) {
  const item = VIDEO_ELEMENTS.find((entry) => entry.id === id) || VIDEO_ELEMENTS[0];
  const config = item.videoConfig as VideoElementConfig;
  const palette = id.includes('tech') ? ['#0f172a', '#0e7490', '#8b5cf6']
    : id.includes('product') ? ['#111827', '#be123c', '#f97316']
      : id.includes('reel') ? ['#18181b', '#7c3aed', '#ec4899']
        : id.includes('quote') ? ['#020617', '#334155', '#f8fafc']
          : ['#111827', '#4c1d95', '#a78bfa'];
  const objects: fabric.Object[] = [
    new fabric.Rect({ width: 330, height: 190, rx: 24, ry: 24, fill: makeLinearGradient(palette, 330, 190), stroke: palette[2], strokeWidth: 2 }),
    new fabric.Rect({ left: 18, top: 18, width: 294, height: 118, rx: 16, ry: 16, fill: '#020617aa' }),
  ];

  if (id.includes('transition')) {
    objects.push(new fabric.Polygon([{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 82, y: 118 }, { x: 0, y: 118 }], { left: 34, top: 18, fill: '#ffffff2e' }));
    objects.push(new fabric.Polygon([{ x: 0, y: 0 }, { x: 150, y: 0 }, { x: 112, y: 118 }, { x: 0, y: 118 }], { left: 140, top: 18, fill: '#ffffff45' }));
  } else if (id.includes('lower-third')) {
    objects.push(new fabric.Rect({ left: 42, top: 82, width: 246, height: 36, rx: 18, ry: 18, fill: '#ffffff' }));
    objects.push(new fabric.Rect({ left: 56, top: 94, width: 108, height: 10, rx: 5, ry: 5, fill: '#8b5cf6' }));
    objects.push(new fabric.Rect({ left: 176, top: 94, width: 76, height: 10, rx: 5, ry: 5, fill: '#22d3ee' }));
  } else if (id.includes('quote')) {
    objects.push(makeTextbox('“', { left: 48, top: 38, width: 46, fontSize: 58, fontWeight: 'bold', fill: '#ffffff' }));
    objects.push(new fabric.Line([96, 76, 270, 76], { stroke: '#ffffff80', strokeWidth: 5, strokeLineCap: 'round' }));
    objects.push(new fabric.Line([96, 98, 236, 98], { stroke: '#ffffff55', strokeWidth: 5, strokeLineCap: 'round' }));
  } else if (id.includes('tech')) {
    [0, 1, 2, 3].forEach((row) => {
      objects.push(new fabric.Line([42, 38 + row * 22, 286, 38 + row * 22], { stroke: row % 2 ? '#22d3ee66' : '#8b5cf666', strokeWidth: 2 }));
    });
    objects.push(new fabric.Circle({ left: 140, top: 52, radius: 22, fill: '#22d3ee55', stroke: '#67e8f9', strokeWidth: 2 }));
  } else {
    objects.push(new fabric.Path('M0 0 L0 52 L45 26 Z', { left: 144, top: 52, fill: '#ffffff' }));
  }

  objects.push(makeTextbox(item.name, { left: 24, top: 145, width: 230, fontSize: 20, fontWeight: 'bold', fill: '#ffffff' }));
  objects.push(makeTextbox(`${config.duration}s • ${config.format}`, { left: 248, top: 150, width: 70, fontSize: 13, fill: '#d4d4d8', textAlign: 'right' }));
  const group = new fabric.Group(objects);
  return applyElementMetadata(group, makeMetadata('video', item, { mediaKind: 'video', mediaDuration: config.duration, mediaMimeType: item.mimeType, videoConfig: config }));
}

export function createGridElement() {
  const legacyTable = TABLE_ELEMENTS.find((item) => item.id === 'table-plain') || TABLE_ELEMENTS[0];
  return createTableElement(legacyTable.id);
}

export function createGraphicElement(id: string, styles: ElementFactoryStyles = {}) {
  if (id.includes('arrow')) return createShapeElement('arrow-curved', styles);
  if (id.includes('burst')) return createShapeElement('star-burst', styles);
  return createShapeElement('star-five', styles);
}

export function createCodeElement(id: string) {
  const item = owned({ id, name: id.includes('api') ? 'API Code Card' : id.includes('terminal') ? 'Terminal Card' : 'Code Snippet Card', kind: 'form' as const, category: 'Code', tags: ['code'] });
  const lines = id.includes('api') ? ['{', '  "status": "ok",', '  "editable": true', '}'] : id.includes('terminal') ? ['npm run build', '✓ compiled', 'deploy --prod'] : ['function create() {', '  return poster;', '}'];
  const rows = lines.map((line, index) => makeTextbox(line, { left: 24, top: 62 + index * 28, width: 300, fontSize: 17, fontFamily: 'Menlo, Monaco, Consolas, monospace', fill: index === 0 ? '#c4b5fd' : '#d4d4d8' }));
  const group = new fabric.Group([new fabric.Rect({ width: 360, height: 195, rx: 22, ry: 22, fill: '#09090b', stroke: '#8b5cf6', strokeWidth: 2 }), ...rows]);
  return applyElementMetadata(group, makeMetadata('form', item));
}

export function createMediaElement(kind: Extract<LegacyElementKind, 'music' | 'sound-effect' | 'voiceover'>, id: string) {
  const item = owned({ id, name: labelForKind(kind), kind: 'animation' as const, category: 'Audio', tags: [kind], animationConfig: { format: 'fabric-keyframe' as const, animationType: kind, loop: true, speed: 1 } });
  return createAnimationElement(item.id);
}

export function createElementObjectFromPayload(payload: EditorElementPayload, styles: ElementFactoryStyles = {}) {
  if (payload.kind === 'shape') return createShapeElement(payload.id, styles);
  if (payload.kind === 'frame') return createFrameElement(payload.id);
  if (payload.kind === 'chart') return createChartElement(payload.id);
  if (payload.kind === 'table' || payload.kind === 'grid') return payload.kind === 'grid' ? createGridElement() : createTableElement(payload.id);
  if (payload.kind === 'form') return createFormElement(payload.id);
  if (payload.kind === 'animation') return createAnimationElement(payload.id);
  if (payload.kind === 'three-d') return createThreeDElement(payload.id);
  if (payload.kind === 'video') return createVideoElement(payload.id);
  if (payload.kind === 'graphic') return createGraphicElement(payload.id, styles);
  if (payload.kind === 'code') return createCodeElement(payload.id);
  if (payload.kind === 'music' || payload.kind === 'sound-effect' || payload.kind === 'voiceover') return createMediaElement(payload.kind, payload.id);
  return null;
}

export function addObjectToCanvas(canvas: fabric.Canvas, object: fabric.Object, point?: { x: number; y: number }) {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  const targetX = point?.x ?? canvasWidth / 2;
  const targetY = point?.y ?? canvasHeight / 2;
  const width = (object.width || 120) * (object.scaleX || 1);
  const height = (object.height || 120) * (object.scaleY || 1);
  const left = Math.max(0, Math.min(canvasWidth - Math.min(width, canvasWidth), targetX - width / 2));
  const top = Math.max(0, Math.min(canvasHeight - Math.min(height, canvasHeight), targetY - height / 2));
  object.set({ left, top });
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
}
