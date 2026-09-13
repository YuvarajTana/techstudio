export interface TemplateSubcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  group_name?: string | null;
  sort_order: number;
  subcategories?: TemplateSubcategory[];
}

export interface TemplateAsset {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category_id?: string | null;
  category?: TemplateCategory | null;
  subcategory_id?: string | null;
  subcategory?: TemplateSubcategory | null;
  template_type?: string | null;
  data?: unknown;
  thumbnail?: string | null;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  width: number;
  height: number;
  tags: string[];
  is_premium: boolean;
  is_featured: boolean;
  is_favourite: boolean;
  sort_weight: number;
  status: string;
  use_count: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateListResponse {
  items: TemplateAsset[];
  templates: TemplateAsset[];
  total: number;
  page: number;
  page_size: number;
  per_page: number;
  total_pages: number;
  has_more: boolean;
}

export interface TemplateCategoriesResponse {
  categories: TemplateCategory[];
}

export interface TemplateFavouriteToggleResponse {
  template_id: string;
  is_favourite: boolean;
  message: string;
}

export interface TemplateProject {
  id: string;
  name: string;
  data?: string | null;
  width?: number | null;
  height?: number | null;
  background_color?: string | null;
  design_type?: string | null;
  category?: string | null;
  tags?: string[] | null;
  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateUseRequest {
  project_name?: string;
  width?: number;
  height?: number;
}

export interface TemplateTransformSummary {
  source: string;
  changes: string[];
  warnings: string[];
}

export interface TemplateUseResponse {
  template: TemplateAsset;
  project: TemplateProject;
  usage_id: string;
  transform?: TemplateTransformSummary | null;
}

export interface TemplateRemixRequest {
  prompt: string;
  project_name?: string;
  width?: number;
  height?: number;
}

export interface TemplateQuickReplaceRequest {
  project_name?: string;
  image_prompt?: string;
  palette?: string[];
  heading_font?: string;
  body_font?: string;
  text_replacements?: Record<string, string>;
  replace_images?: boolean;
  apply_palette?: boolean;
  apply_fonts?: boolean;
  replace_text?: boolean;
  width?: number;
  height?: number;
}

export interface TemplateBrandColor {
  id: string;
  name: string;
  hex_value: string;
  role?: string | null;
  description?: string | null;
  is_primary?: boolean;
}

export interface TemplateBrandFont {
  id: string;
  name: string;
  family: string;
  weight: string;
  role?: string | null;
  style?: string | null;
  fallback?: string | null;
}

export interface TemplateBrandLogo {
  id: string;
  name: string;
  file_data: string;
  file_type: string;
  role?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface TemplateBrandKit {
  id: string;
  name: string;
  company_name?: string | null;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  colors: TemplateBrandColor[];
  fonts: TemplateBrandFont[];
  logos: TemplateBrandLogo[];
  created_at: string;
  updated_at: string;
}

export interface TemplateBrandKitListResponse {
  brand_kits: TemplateBrandKit[];
}

export interface TemplateListParams {
  query?: string;
  templateType?: string;
  categorySlug?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export interface TemplateFiltersState {
  query: string;
  templateType: string;
  categorySlug: string;
  sort: string;
  page: number;
  detailId: string | null;
}
