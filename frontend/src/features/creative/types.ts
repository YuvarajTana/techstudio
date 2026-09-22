export type PosterFamily = 'product' | 'service' | 'offer-event' | 'appreciation' | 'festival' | 'educational';
export interface BrandProfile {tagline: string; phone: string; email: string; locations: string[]; social: Record<string, string>}
export interface Brand {id: string; name: string; company_name?: string; description?: string; industry?: string; website?: string; revision: number; profile_json: Partial<BrandProfile>; colors: {hex_value: string; role: string}[]; fonts: {family: string; role: string}[]; logos: {id: string; name: string; role: string; file_data: string}[]}
export interface MediaRef {source: 'uploaded' | 'generated'; asset_id: string; role: 'hero' | 'gallery' | 'logo' | 'reference'; sort_order: number}
export interface CatalogItem {id: string; brand_kit_id: string; kind: 'product' | 'service'; name: string; description: string | null; benefits: string[]; price_text: string | null; cta_text: string | null; cta_url: string | null; media: MediaRef[]; revision: number}
export interface CreativeMedia {id: string; source: 'uploaded' | 'generated'; kind: 'image' | 'audio'; filename: string; mime_type: string; content_url: string; width?: number; height?: number; duration_ms?: number; sha256?: string; metadata: Record<string, unknown>}
export interface PosterCopy {schema: 'creative-poster/v1'; family: PosterFamily; headline: string; subheadline: string; body: string; cta: string; contact: string; services: string[]; imagePrompt: string}
export interface CreativeContext {brand_kit_id?: string; catalog_item_ids?: string[]; [key: string]: unknown}
export const POSTER_FAMILIES: {id: PosterFamily; label: string; description: string}[] = [
  {id: 'product', label: 'Product showcase', description: 'A hero image, key benefits and a clear next step.'},
  {id: 'service', label: 'Service showcase', description: 'Expertise, service cards and contact details.'},
  {id: 'offer-event', label: 'Offer or event', description: 'A bold announcement with a prominent call to action.'},
  {id: 'appreciation', label: 'Appreciation', description: 'An editorial tribute with space for a meaningful message.'},
  {id: 'festival', label: 'Festival greeting', description: 'An ornamental greeting with your brand and artwork.'},
  {id: 'educational', label: 'Educational explainer', description: 'A clear concept, ordered ideas and a learning prompt.'},
];
export const POSTER_FORMATS = [
  {id: 'square', label: 'Square · 1080 × 1080', width: 1080, height: 1080},
  {id: 'portrait', label: 'Social portrait · 1080 × 1350', width: 1080, height: 1350},
  {id: 'tall', label: 'Tall poster · 1080 × 1620', width: 1080, height: 1620},
  {id: 'story', label: 'Story · 1080 × 1920', width: 1080, height: 1920},
  {id: 'a4', label: 'A4 portrait · 210 × 297 mm', width: 1240, height: 1754},
  {id: 'a3', label: 'A3 portrait · 297 × 420 mm', width: 1754, height: 2480},
] as const;
