export type ElementKind =
  | 'shape'
  | 'photo'
  | 'frame'
  | 'chart'
  | 'table'
  | 'animation'
  | 'form'
  | 'three-d'
  | 'video';

export type ElementPageId = ElementKind;

export type ElementMetadata = {
  id: string;
  elementId: string;
  elementKind: ElementKind;
  displayName: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  sourceUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  modelUrl?: string;
  isPremium?: boolean;
  editable: boolean;
  provider?: string;
  licence?: string;
  shapeConfig?: ShapeElementConfig;
  photoConfig?: PhotoElementConfig;
  frameConfig?: FrameElementConfig;
  chartConfig?: ChartElementConfig;
  tableConfig?: TableElementConfig;
  animationConfig?: AnimationElementConfig;
  formConfig?: FormElementConfig;
  threeDConfig?: ThreeDElementConfig;
  videoConfig?: VideoElementConfig;
  config?: Record<string, unknown>;
};

export type ShapeElementConfig = {
  shapeType?: string;
  category?: string;
  subcategory?: string;
  geometry?: 'line' | 'path' | 'rect' | 'ellipse' | 'polygon' | 'group';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  opacity?: number;
  shadow?: boolean;
  cornerRadius?: number;
  polygonSides?: number;
  starInnerRadius?: number;
  arrowhead?: 'none' | 'start' | 'end' | 'both';
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'bevel' | 'round' | 'miter';
  controlPoints?: Array<{ x: number; y: number }>;
};

export type PhotoElementConfig = {
  cropX?: number;
  cropY?: number;
  imageScale?: number;
  alt?: string;
  naturalWidth?: number;
  naturalHeight?: number;
};

export type ChartElementConfig = {
  chartType: string;
  labels: string[];
  datasets: Array<{
    label: string;
    values: number[];
    color?: string;
  }>;
  title?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
};

export type TableElementConfig = {
  rows: number;
  columns: number;
  cells: Array<Array<{
    text: string;
    background?: string;
    color?: string;
  }>>;
  headerRow?: boolean;
  borderColor?: string;
  borderWidth?: number;
  alternatingRows?: boolean;
};

export type FormElementConfig = {
  title?: string;
  fields: Array<{
    id: string;
    type: 'text' | 'email' | 'number' | 'radio' | 'checkbox' | 'rating';
    label: string;
    placeholder?: string;
    options?: string[];
    required?: boolean;
  }>;
  submitLabel?: string;
  mode?: 'design-preview' | 'interactive-preview';
};

export type AnimationElementConfig = {
  format: 'fabric-keyframe' | 'lottie' | 'gif' | 'webp' | 'video';
  sourceUrl?: string;
  animationType: string;
  loop: boolean;
  speed: number;
  currentTime?: number;
};

export type ThreeDElementConfig = {
  modelUrl?: string;
  previewUrl?: string;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  animationClip?: string;
  animationSpeed?: number;
  loop?: boolean;
  renderMode: 'fabric-3d-style' | 'three-snapshot';
};

export type VideoElementConfig = {
  sourceUrl?: string;
  posterUrl?: string;
  duration: number;
  startTime?: number;
  endTime?: number;
  loop?: boolean;
  muted?: boolean;
  format: 'mp4' | 'webm' | 'managed-preview';
};

export type FrameElementConfig = {
  frameType: string;
  imageSourceUrl?: string;
  cropX?: number;
  cropY?: number;
  imageScale?: number;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
};

export type EditorElement = {
  id: string;
  name: string;
  kind: ElementKind;
  category: string;
  subcategory?: string;
  tags: string[];
  thumbnailUrl?: string;
  previewUrl?: string;
  sourceUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  svgData?: string;
  editableColors?: string[];
  shapeConfig?: ShapeElementConfig;
  photoConfig?: PhotoElementConfig;
  chartConfig?: ChartElementConfig;
  tableConfig?: TableElementConfig;
  formConfig?: FormElementConfig;
  animationConfig?: AnimationElementConfig;
  threeDConfig?: ThreeDElementConfig;
  videoConfig?: VideoElementConfig;
  frameConfig?: FrameElementConfig;
  isPremium?: boolean;
  isFeatured?: boolean;
  isAnimated?: boolean;
  provider?: string;
  licence?: string;
};

export type ElementSection = {
  id: string;
  title: string;
  kind: ElementKind;
  query?: string;
  category?: string;
  description?: string;
};
