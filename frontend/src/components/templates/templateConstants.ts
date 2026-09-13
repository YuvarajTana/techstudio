export const TEMPLATE_TYPE_OPTIONS = [
  { id: 'all', label: 'All Templates' },
  { id: 'poster', label: 'Posters' },
  { id: 'instagram-post', label: 'Instagram Posts' },
  { id: 'instagram-story', label: 'Instagram Stories' },
  { id: 'youtube-thumbnail', label: 'YouTube Thumbnails' },
  { id: 'linkedin-post', label: 'LinkedIn Posts' },
  { id: 'invitation', label: 'Invitations' },
  { id: 'flyer', label: 'Flyers' },
  { id: 'business-card', label: 'Business Cards' },
  { id: 'logo', label: 'Logos' },
  { id: 'education', label: 'Education' },
];

export const TEMPLATE_TYPE_ALIASES: Record<string, string> = {
  all: 'all',
  poster: 'poster',
  posters: 'poster',
  'instagram-post': 'instagram-post',
  'instagram-posts': 'instagram-post',
  instagram: 'instagram-post',
  'instagram-story': 'instagram-story',
  'instagram-stories': 'instagram-story',
  story: 'instagram-story',
  stories: 'instagram-story',
  'youtube-thumbnail': 'youtube-thumbnail',
  'youtube-thumbnails': 'youtube-thumbnail',
  youtube: 'youtube-thumbnail',
  'linkedin-post': 'linkedin-post',
  'linkedin-posts': 'linkedin-post',
  linkedin: 'linkedin-post',
  invitation: 'invitation',
  invitations: 'invitation',
  flyer: 'flyer',
  flyers: 'flyer',
  'business-card': 'business-card',
  'business-cards': 'business-card',
  logo: 'logo',
  logos: 'logo',
  education: 'education',
  'education-template': 'education',
  'education-templates': 'education',
};

export const PRIMARY_TEMPLATE_CATEGORY_SLUGS = [
  'business',
  'marketing',
  'holidays',
  'education',
  'technology',
  'food',
  'fashion',
  'fitness',
  'travel',
  'events',
];

export const TEMPLATE_SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'recent', label: 'Recently Added' },
  { id: 'az', label: 'A–Z' },
  { id: 'free', label: 'Free First' },
  { id: 'premium', label: 'Premium First' },
];

export const DEFAULT_TEMPLATE_FILTERS = {
  query: '',
  templateType: 'all',
  categorySlug: 'all',
  sort: 'recommended',
  page: 1,
  detailId: null as string | null,
};

export const TEMPLATE_PAGE_SIZE = 24;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const normalizeTemplateTypeId = (value?: string | null) => {
  if (!value) return DEFAULT_TEMPLATE_FILTERS.templateType;
  const normalized = slugify(value);
  return TEMPLATE_TYPE_ALIASES[normalized] || DEFAULT_TEMPLATE_FILTERS.templateType;
};

export const getTemplateTypeLabel = (id: string) => TEMPLATE_TYPE_OPTIONS.find((item) => item.id === normalizeTemplateTypeId(id))?.label || id;

export const getTemplateSortLabel = (id: string) => TEMPLATE_SORT_OPTIONS.find((item) => item.id === id)?.label || id;
