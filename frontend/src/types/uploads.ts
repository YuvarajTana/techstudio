export type UploadedImageAsset = {
  id: string;
  projectId?: string | null;
  filename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  url: string;
  thumbnailUrl: string;
  metadata: Record<string, unknown>;
  assetRole?: string;
  createdAt: string;
  updatedAt: string;
};

export type UploadedImageList = {
  items: UploadedImageAsset[];
  total: number;
  limit: number;
  offset: number;
};

export type PosterAnalysisMode = 'quick' | 'full';
export type PosterReferenceMode = 'keep' | 'lock' | 'dim' | 'hide';
export type PosterAnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type PosterTextStyle = {
  font_family_guess: string;
  font_size: number;
  font_weight: string;
  font_style: string;
  fill: string;
  stroke?: string | null;
  stroke_width: number;
  background_color?: string | null;
  text_align: string;
  letter_spacing: number;
  line_height: number;
  rotation: number;
};

export type PosterTextBlock = {
  id: string;
  text: string;
  confidence: number;
  reading_order: number;
  role?: 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'footer';
  bounding_box: { x: number; y: number; width: number; height: number };
  normalized_bounding_box: { x: number; y: number; width: number; height: number };
  polygon: number[][];
  style: PosterTextStyle;
  accepted?: boolean;
};

export type PosterPaletteColour = {
  color: string;
  percentage: number;
  region_count: number;
};

export type PosterColourRegion = {
  id: string;
  name: string;
  color: string;
  percentage: number;
  confidence: number;
  bounding_box: { x: number; y: number; width: number; height: number };
  editable: boolean;
  region_type: 'background' | 'design-region';
  simple_shape?: 'rectangle' | null;
  mask_asset_id: string;
  mask_url: string;
};

export type PosterAnalysisResult = {
  job_id: string;
  status: 'completed';
  mode: PosterAnalysisMode;
  source: { asset_id: string; url: string; width: number; height: number };
  clean_background: { asset_id: string; url: string; width: number; height: number };
  text_blocks: PosterTextBlock[];
  palette: PosterPaletteColour[];
  colour_regions: PosterColourRegion[];
  warnings: string[];
};

export type PosterTextPatchResult = {
  job_id: string;
  block_id: string;
  asset: { asset_id: string; url: string; width: number; height: number };
  source_box: { x: number; y: number; width: number; height: number };
  normalized_box: { x: number; y: number; width: number; height: number };
  text_box: { x: number; y: number; width: number; height: number };
  normalized_text_box: { x: number; y: number; width: number; height: number };
};

export type PosterAnalysisJob = {
  job_id: string;
  status: PosterAnalysisStatus;
  stage: string;
  progress: number;
  error?: string | null;
  result?: PosterAnalysisResult;
};
