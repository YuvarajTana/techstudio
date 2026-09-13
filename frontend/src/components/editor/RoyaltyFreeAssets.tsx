import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Image,
  Download,
  Loader2,
  Grid3x3,
  LayoutGrid,
  Heart,
  Palette,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';
import { apiFetch, apiUrl } from '../../services/apiClient';
import {
  AI_ARCHITECTURE_PALETTE,
  type ArchitectureIconName,
} from '../../utils/architectureDiagramTypes';
import {
  createDiagramConnector,
  updateAllDiagramConnectors,
} from '../../utils/diagramConnectors';

interface BackendAsset {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string | null;
  file_data?: string | null;
  file_type: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  source_url?: string | null;
  original_url?: string | null;
  local_storage_path?: string | null;
  mime_type?: string | null;
  orientation?: string | null;
  source?: string | null;
  source_asset_id?: string | null;
  source_page_url?: string | null;
  author_name?: string | null;
  author_url?: string | null;
  license?: string | null;
  license_name?: string | null;
  license_url?: string | null;
  attribution_required?: boolean | null;
  attribution?: string | null;
  attribution_text?: string | null;
  commercial_use_allowed?: boolean | null;
  modification_allowed?: boolean | null;
  provider?: string | null;
  width?: number | null;
  height?: number | null;
}

interface BackendAssetList {
  assets: BackendAsset[];
  total: number;
}

interface AssetSearchItem {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  previewUrl?: string;
  sourceUrl?: string;
  originalUrl?: string;
  localStoragePath?: string | null;
  width: number;
  height: number;
  orientation: string;
  mimeType: string;
  tags: string[];
  source?: string | null;
  sourceAssetId?: string | null;
  sourcePageUrl?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  licenseName?: string | null;
  attributionRequired: boolean;
  attributionText?: string | null;
  commercialUseAllowed: boolean;
  modificationAllowed: boolean;
}

interface AssetSearchResponse {
  success: boolean;
  category?: string | null;
  items: AssetSearchItem[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

interface AssetCategorySummary {
  id: string;
  label: string;
  count: number;
}

interface AssetCategoriesResponse {
  success: boolean;
  categories: AssetCategorySummary[];
  total: number;
}

interface ImageResult {
  id: string;
  src: string;
  thumbnail: string;
  photographer: string;
  alt: string;
  source?: string | null;
  license?: string | null;
  attribution?: string | null;
  metadata: BackendAsset | AssetSearchItem;
}

const resolveAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (value.startsWith('/media/')) return apiUrl(value);
  return value;
};

const shouldInlineForCanvas = (value: string) => {
  if (!value || value.startsWith('data:')) return false;
  try {
    const url = new URL(value, window.location.origin);
    return url.pathname.startsWith('/media/');
  } catch {
    return false;
  }
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
      return;
    }
    reject(new Error('Unable to read image asset data.'));
  };
  reader.onerror = () => reject(new Error('Unable to read image asset data.'));
  reader.readAsDataURL(blob);
});

const prepareCanvasImageSource = async (
  value: string,
  metadata?: BackendAsset | AssetSearchItem | ImageResult
) => {
  const resolved = resolveAssetUrl(value);
  if (!shouldInlineForCanvas(resolved)) return resolved;

  if (metadata?.id) {
    const response = await apiFetch(`/api/assets/${encodeURIComponent(metadata.id)}/data-url`, { auth: false });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.dataUrl) {
      throw new Error(data?.detail || data?.error || `Unable to load asset image (${response.status}).`);
    }
    return String(data.dataUrl);
  }

  const response = await fetch(resolved, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Unable to load asset image (${response.status}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Asset URL returned ${contentType || 'unknown content type'}.`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Asset image is empty.');
  }
  return blobToDataUrl(blob);
};

const loadDecodedImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new window.Image();
  if (!source.startsWith('data:')) {
    image.crossOrigin = 'anonymous';
  }
  image.onload = async () => {
    try {
      if ('decode' in image) await image.decode();
      resolve(image);
    } catch {
      resolve(image);
    }
  };
  image.onerror = () => reject(new Error('Browser could not decode the selected asset image.'));
  image.src = source;
});

const loadStoredAssetList = (key: string): ImageResult[] => {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value) as ImageResult[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.src) : [];
  } catch {
    return [];
  }
};

const storeAssetList = (key: string, assets: ImageResult[]) => {
  window.localStorage.setItem(key, JSON.stringify(assets.slice(0, RECENT_ASSET_LIMIT)));
};

const IMAGE_PAGE_SIZE = 30;

type ImageCategory = {
  id: string;
  name: string;
  emoji: string;
  query: string;
  count?: number;
};

const IMAGE_CATEGORIES: ImageCategory[] = [
  { id: 'nature', name: 'Nature', emoji: '🌿', query: 'nature landscape mountains forest river flowers' },
  { id: 'business', name: 'Business', emoji: '💼', query: 'business office meeting professional laptop teamwork' },
  { id: 'food-drink', name: 'Food & Drink', emoji: '🍔', query: 'food drink restaurant coffee meals ingredients dessert' },
  { id: 'technology', name: 'Technology', emoji: '💻', query: 'technology AI coding laptop robotics digital devices' },
  { id: 'fashion', name: 'Fashion', emoji: '👗', query: 'fashion clothing model accessories runway style' },
  { id: 'fitness', name: 'Fitness', emoji: '💪', query: 'fitness gym workout running yoga sports' },
  { id: 'travel', name: 'Travel', emoji: '✈️', query: 'travel destination airplane beach landmark hotel' },
  { id: 'abstract', name: 'Abstract', emoji: '🎨', query: 'abstract gradient geometric pattern texture art' },
  { id: 'architecture', name: 'Architecture', emoji: '🏛️', query: 'architecture building interior bridge cityscape' },
  { id: 'animals', name: 'Animals', emoji: '🐾', query: 'animals wildlife pets birds nature' },
  { id: 'people', name: 'People', emoji: '👥', query: 'people portrait team lifestyle professional' },
  { id: 'minimal', name: 'Minimal', emoji: '⬜', query: 'minimal clean simple neutral isolated whitespace' },
  { id: 'education', name: 'Education', emoji: '🎓', query: 'education learning classroom students online course books' },
  { id: 'healthcare', name: 'Healthcare', emoji: '⚕️', query: 'healthcare medical doctor hospital wellness clinic' },
  { id: 'finance', name: 'Finance', emoji: '💹', query: 'finance banking investment charts money accounting' },
  { id: 'marketing', name: 'Marketing', emoji: '📣', query: 'marketing campaign branding social analytics content' },
  { id: 'social-media', name: 'Social Media', emoji: '📱', query: 'social media creator content phone engagement' },
  { id: 'events', name: 'Events', emoji: '🎟️', query: 'events conference party stage invitation celebration' },
  { id: 'sports', name: 'Sports', emoji: '🏆', query: 'sports athlete competition stadium equipment team' },
  { id: 'music', name: 'Music', emoji: '🎵', query: 'music concert instruments studio audio performance' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', query: 'entertainment cinema streaming stage performance media' },
  { id: 'real-estate', name: 'Real Estate', emoji: '🏘️', query: 'real estate home property interior architecture' },
  { id: 'e-commerce', name: 'E-commerce', emoji: '🛒', query: 'ecommerce product shopping retail packaging store' },
  { id: 'startup', name: 'Startup', emoji: '🚀', query: 'startup pitch innovation founder team growth' },
  { id: 'office', name: 'Office', emoji: '🗂️', query: 'office desk workspace productivity meeting laptop' },
  { id: 'lifestyle', name: 'Lifestyle', emoji: '🌇', query: 'lifestyle home wellness travel daily moments' },
  { id: 'beauty', name: 'Beauty', emoji: '💄', query: 'beauty cosmetics skincare makeup spa product' },
  { id: 'luxury', name: 'Luxury', emoji: '💎', query: 'luxury premium gold elegant fashion interior' },
  { id: 'automotive', name: 'Automotive', emoji: '🚗', query: 'automotive car vehicle road showroom transport' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮', query: 'gaming esports controller neon console streaming' },
  { id: 'science', name: 'Science', emoji: '🔬', query: 'science laboratory research chemistry microscope' },
  { id: 'space', name: 'Space', emoji: '🪐', query: 'space galaxy astronaut planet stars cosmic' },
  { id: 'environment', name: 'Environment', emoji: '♻️', query: 'environment sustainability renewable energy ecology green' },
  { id: 'agriculture', name: 'Agriculture', emoji: '🌾', query: 'agriculture farming crops field harvest organic' },
  { id: 'festivals', name: 'Festivals', emoji: '🎉', query: 'festivals celebration lights culture holiday party' },
  { id: 'backgrounds', name: 'Backgrounds', emoji: '🖼️', query: 'backgrounds gradient abstract texture clean wallpaper' },
  { id: 'textures', name: 'Textures', emoji: '🧱', query: 'textures paper fabric marble grain surface' },
  { id: 'patterns', name: 'Patterns', emoji: '▦', query: 'patterns geometric repeat seamless graphic design' },
  { id: 'gradients', name: 'Gradients', emoji: '🌈', query: 'gradients mesh color abstract background smooth' },
  { id: 'illustrations', name: 'Illustrations', emoji: '✏️', query: 'illustrations vector character editorial graphic' },
  { id: 'icons', name: 'Icons', emoji: '⭐', query: 'icons symbol interface pictogram outline set' },
  { id: 'stickers', name: 'Stickers', emoji: '🏷️', query: 'stickers badge emoji fun transparent graphic' },
  { id: 'frames', name: 'Frames', emoji: '🪟', query: 'frames border photo frame mockup decorative' },
  { id: 'mockups', name: 'Mockups', emoji: '📐', query: 'mockups device poster packaging product presentation' },
  { id: 'product-images', name: 'Product Images', emoji: '📦', query: 'product images isolated studio ecommerce object' },
  { id: 'ui-elements', name: 'UI Elements', emoji: '🧩', query: 'ui elements buttons cards dashboard interface' },
  { id: 'infographics', name: 'Infographics', emoji: '📊', query: 'infographics process timeline diagram data' },
  { id: 'charts', name: 'Charts', emoji: '📈', query: 'charts graph analytics dashboard finance data' },
  { id: 'maps', name: 'Maps', emoji: '🗺️', query: 'maps location route travel city geography' },
  { id: 'technical-diagrams', name: 'Technical Diagrams', emoji: '🧠', query: 'distributed systems microservices api gateway database sharding cloud architecture network diagram' },
];

const IMAGE_CATEGORY_BY_ID = new Map(IMAGE_CATEGORIES.map((category) => [category.id, category]));
const LOCAL_FAVORITES_KEY = 'teckstudio_favourite_assets';
const LOCAL_RECENT_KEY = 'teckstudio_recent_assets';
const RECENT_ASSET_LIMIT = 24;

const TECHNICAL_DIAGRAM_SUBCATEGORIES = [
  { id: 'distributed-systems', label: 'Distributed Systems', query: 'distributed systems' },
  { id: 'system-architecture', label: 'System Architecture', query: 'system architecture' },
  { id: 'client-server', label: 'Client Server', query: 'client server architecture' },
  { id: 'microservices', label: 'Microservices', query: 'microservices architecture' },
  { id: 'backend-architecture', label: 'Backend Architecture', query: 'backend architecture' },
  { id: 'database-architecture', label: 'Database Architecture', query: 'database architecture' },
  { id: 'cloud-architecture', label: 'Cloud Architecture', query: 'cloud architecture' },
  { id: 'network-diagrams', label: 'Network Diagrams', query: 'network architecture' },
  { id: 'api-architecture', label: 'API Architecture', query: 'API gateway' },
  { id: 'load-balancing', label: 'Load Balancing', query: 'load balancer' },
  { id: 'sharding', label: 'Sharding', query: 'database sharding' },
  { id: 'distributed-database', label: 'Distributed Database', query: 'distributed database' },
  { id: 'operating-systems', label: 'Operating Systems', query: 'operating systems process flow' },
  { id: 'process-flow', label: 'Process Flow', query: 'process flow' },
  { id: 'data-flow', label: 'Data Flow', query: 'data flow' },
  { id: 'software-architecture', label: 'Software Architecture', query: 'software architecture' },
  { id: 'ai-architecture', label: 'AI Architecture', query: 'AI architecture' },
  { id: 'machine-learning', label: 'Machine Learning Architecture', query: 'machine learning architecture' },
  { id: 'devops-architecture', label: 'DevOps Architecture', query: 'DevOps architecture' },
];

const TECHNICAL_SEARCH_HINTS = [
  'distributed systems',
  'client server architecture',
  'microservices architecture',
  'database sharding',
  'distributed database',
  'load balancer',
  'API gateway',
  'cloud architecture',
  'network architecture',
  'backend architecture',
];

const getAssetTags = (asset?: BackendAsset | AssetSearchItem | null) => {
  if (!asset) return [] as string[];
  const rawTags = 'tags' in asset ? asset.tags : undefined;
  if (Array.isArray(rawTags)) return rawTags.map(String);
  if (typeof rawTags === 'string') return rawTags.split(',').map((tag) => tag.trim()).filter(Boolean);
  return [];
};

const isTechnicalDiagramAsset = (asset: ImageResult) => {
  const metadata = asset.metadata;
  const tags = getAssetTags(metadata).join(' ').toLowerCase();
  return metadata?.category === 'technical-diagrams'
    || tags.includes('category:technical-diagrams')
    || tags.includes('architecture diagram')
    || tags.includes('distributed-systems')
    || tags.includes('api-gateway')
    || tags.includes('sharding');
};

const getTechnicalDiagramKind = (asset: ImageResult, searchQuery: string) => {
  const metadata = asset.metadata;
  const searchable = [
    asset.alt,
    metadata?.title,
    metadata?.description,
    searchQuery,
    ...getAssetTags(metadata),
  ].filter(Boolean).join(' ').toLowerCase();
  return TECHNICAL_DIAGRAM_SUBCATEGORIES.find((item) => (
    searchable.includes(item.id)
    || searchable.includes(item.label.toLowerCase())
    || searchable.includes(item.query.toLowerCase())
  ))?.id || 'system-architecture';
};

type EditableDiagramNode = {
  key: string;
  title: string;
  subtitle: string;
  icon: ArchitectureIconName;
  x: number;
  y: number;
  color: string;
};

type EditableDiagramLink = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
};

const editableDiagramSpecFor = (kind: string): { nodes: EditableDiagramNode[]; links: EditableDiagramLink[] } => {
  const palette = AI_ARCHITECTURE_PALETTE;
  if (kind === 'microservices' || kind === 'api-architecture') {
    return {
      nodes: [
        { key: 'client', title: 'Client', subtitle: 'web / mobile', icon: 'member', x: -420, y: -170, color: palette.green },
        { key: 'gateway', title: 'API Gateway', subtitle: 'auth / routing', icon: 'gateway', x: -105, y: -170, color: palette.purple },
        { key: 'service-a', title: 'Service A', subtitle: 'domain logic', icon: 'server', x: 210, y: -250, color: palette.blue },
        { key: 'service-b', title: 'Service B', subtitle: 'domain logic', icon: 'server', x: 210, y: -90, color: palette.orange },
        { key: 'database', title: 'Database', subtitle: 'owned data', icon: 'database', x: -105, y: 90, color: palette.yellow },
      ],
      links: [
        { from: 'client', to: 'gateway', label: 'request' },
        { from: 'gateway', to: 'service-a' },
        { from: 'gateway', to: 'service-b' },
        { from: 'service-a', to: 'database', dashed: true },
        { from: 'service-b', to: 'database', dashed: true },
      ],
    };
  }
  if (kind === 'sharding' || kind === 'distributed-database' || kind === 'database-architecture') {
    return {
      nodes: [
        { key: 'app', title: 'App Server', subtitle: 'query source', icon: 'server', x: -360, y: -120, color: palette.green },
        { key: 'router', title: 'Shard Router', subtitle: 'partition key', icon: 'router', x: -70, y: -120, color: palette.purple },
        { key: 'shard-a', title: 'Shard 1', subtitle: 'partition A', icon: 'database', x: 230, y: -240, color: palette.blue },
        { key: 'shard-b', title: 'Shard 2', subtitle: 'partition B', icon: 'database', x: 230, y: -80, color: palette.yellow },
        { key: 'shard-c', title: 'Shard 3', subtitle: 'partition C', icon: 'database', x: 230, y: 80, color: palette.orange },
      ],
      links: [
        { from: 'app', to: 'router', label: 'query' },
        { from: 'router', to: 'shard-a' },
        { from: 'router', to: 'shard-b' },
        { from: 'router', to: 'shard-c' },
      ],
    };
  }
  if (kind === 'load-balancing' || kind === 'distributed-systems' || kind === 'network-diagrams') {
    return {
      nodes: [
        { key: 'clients', title: 'Clients', subtitle: 'traffic', icon: 'member', x: -420, y: -110, color: palette.green },
        { key: 'lb', title: 'Load Balancer', subtitle: 'health checks', icon: 'router', x: -120, y: -110, color: palette.purple },
        { key: 'server-a', title: 'Server 1', subtitle: 'instance', icon: 'server', x: 200, y: -240, color: palette.blue },
        { key: 'server-b', title: 'Server 2', subtitle: 'instance', icon: 'server', x: 200, y: -80, color: palette.orange },
        { key: 'cluster-db', title: 'DB Cluster', subtitle: 'replication', icon: 'database', x: 200, y: 90, color: palette.yellow },
      ],
      links: [
        { from: 'clients', to: 'lb', label: 'requests' },
        { from: 'lb', to: 'server-a' },
        { from: 'lb', to: 'server-b' },
        { from: 'server-a', to: 'cluster-db', dashed: true },
        { from: 'server-b', to: 'cluster-db', dashed: true },
      ],
    };
  }
  if (kind === 'cloud-architecture' || kind === 'devops-architecture' || kind === 'ai-architecture' || kind === 'machine-learning') {
    return {
      nodes: [
        { key: 'input', title: 'Input', subtitle: 'events / data', icon: 'stream', x: -410, y: -115, color: palette.green },
        { key: 'compute', title: 'Compute', subtitle: 'cloud service', icon: 'cloud', x: -115, y: -115, color: palette.blue },
        { key: 'model', title: 'Processor', subtitle: 'logic / model', icon: 'chip', x: 180, y: -115, color: palette.purple },
        { key: 'store', title: 'Storage', subtitle: 'database / files', icon: 'database', x: -115, y: 90, color: palette.yellow },
      ],
      links: [
        { from: 'input', to: 'compute' },
        { from: 'compute', to: 'model' },
        { from: 'compute', to: 'store', dashed: true },
        { from: 'model', to: 'store', dashed: true },
      ],
    };
  }
  return {
    nodes: [
      { key: 'client', title: 'Client', subtitle: 'web / mobile', icon: 'member', x: -420, y: -100, color: palette.green },
      { key: 'api', title: 'API Gateway', subtitle: 'auth / routing', icon: 'gateway', x: -110, y: -100, color: palette.purple },
      { key: 'backend', title: 'Backend', subtitle: 'business logic', icon: 'server', x: 200, y: -100, color: palette.blue },
      { key: 'database', title: 'Database', subtitle: 'persistent data', icon: 'database', x: 200, y: 90, color: palette.yellow },
    ],
    links: [
      { from: 'client', to: 'api', label: 'request' },
      { from: 'api', to: 'backend' },
      { from: 'backend', to: 'database', dashed: true },
    ],
  };
};

const createEditableTechnicalNode = (
  node: EditableDiagramNode,
  options: {
    left: number;
    top: number;
    width: number;
    height: number;
    kind: string;
    sourceAssetId: string;
  },
) => {
  const nodeId = `technical-${options.kind}-${node.key}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const iconGlyph: Record<ArchitectureIconName, string> = {
    member: '◉',
    globe: '◎',
    gateway: '⌗',
    database: '◍',
    chat: '✦',
    router: '◇',
    event: '≡',
    chip: '▣',
    workers: '⌘',
    server: '▤',
    cloud: '☁',
    auth: '⌾',
    stream: '↝',
    queue: '☰',
    analytics: '▥',
    browser: '▣',
    mobile: '▯',
    desktop: '▤',
    loadBalancer: '⇄',
    reverseProxy: '⇆',
    cache: '◌',
    storage: '▱',
    payment: '▰',
    email: '✉',
    monitoring: '◷',
    logging: '≣',
    metrics: '▥',
    registry: '☷',
    identity: '◈',
  };
  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width: options.width,
    height: options.height,
    rx: 16,
    ry: 16,
    fill: '#111827',
    stroke: node.color,
    strokeWidth: 6,
    strokeUniform: true,
    shadow: new fabric.Shadow({
      color: node.color,
      blur: 10,
      offsetX: 0,
      offsetY: 0,
    }),
    selectable: false,
    evented: false,
  });
  const accent = new fabric.Rect({
    left: 0,
    top: 12,
    width: 7,
    height: options.height - 24,
    rx: 4,
    ry: 4,
    fill: node.color,
    selectable: false,
    evented: false,
  });
  const icon = new fabric.Text(iconGlyph[node.icon] || '▣', {
    left: 22,
    top: 22,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 40,
    fontWeight: '700',
    fill: node.color,
    selectable: false,
    evented: false,
  });
  const title = new fabric.Textbox(node.title.toUpperCase(), {
    left: 72,
    top: 24,
    width: options.width - 96,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 30,
    fontWeight: '800',
    fill: '#F8FAFC',
    charSpacing: 45,
    selectable: false,
    evented: false,
  });
  const subtitle = new fabric.Textbox(node.subtitle, {
    left: 72,
    top: 56,
    width: options.width - 96,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 20,
    fontWeight: '500',
    fill: '#A1A1AA',
    selectable: false,
    evented: false,
  });
  const status = new fabric.Circle({
    left: options.width - 22,
    top: 22,
    radius: 8,
    fill: node.color,
    selectable: false,
    evented: false,
  });
  return new fabric.Group([background, accent, icon, title, subtitle, status], {
    left: options.left,
    top: options.top,
    originX: 'left',
    originY: 'top',
    objectCaching: false,
    subTargetCheck: true,
    id: nodeId,
    objectId: nodeId,
    architectureNodeId: nodeId,
    name: node.title,
    objectType: 'architectureNode',
    teckstudioObjectType: 'architectureNode',
    architectureRole: 'architectureNode',
    assetCategory: 'technical-diagrams',
    sourceAssetId: options.sourceAssetId,
    sourceTechnicalDiagramKind: options.kind,
    elementCategory: 'Technology',
    elementSubcategory: 'Technical Diagrams',
    elementTags: ['technical-diagram', 'architecture', options.kind, node.key],
    elementEditable: true,
  } as fabric.IGroupOptions & Record<string, unknown>);
};

// Free SVG elements/illustrations (inline SVGs for instant use)
const SVG_ELEMENTS = [
  // Shapes
  {
    id: 'star-burst',
    name: 'Star Burst',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor"/></svg>`,
  },
  {
    id: 'speech-bubble',
    name: 'Speech Bubble',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10,10 H90 Q90,10 90,10 V60 Q90,70 80,70 H40 L20,90 V70 H10 Q10,70 10,60 V10 Q10,10 10,10 Z" fill="currentColor" rx="10"/></svg>`,
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,88 C25,65 5,50 5,30 C5,15 15,5 30,5 C38,5 45,10 50,18 C55,10 62,5 70,5 C85,5 95,15 95,30 C95,50 75,65 50,88 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 95,50 50,95 5,50" fill="currentColor"/></svg>`,
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="currentColor"/></svg>`,
  },
  {
    id: 'octagon',
    name: 'Octagon',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="29,0 71,0 100,29 100,71 71,100 29,100 0,71 0,29" fill="currentColor"/></svg>`,
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,0 100,38 81,100 19,100 0,38" fill="currentColor"/></svg>`,
  },
  {
    id: 'cross',
    name: 'Cross',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M35,0 L65,0 L65,35 L100,35 L100,65 L65,65 L65,100 L35,100 L35,65 L0,65 L0,35 L35,35 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M25,70 A20,20 0 0,1 25,30 A25,25 0 0,1 75,30 A20,20 0 0,1 75,70 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'shield',
    name: 'Shield',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,0 L100,15 L100,55 Q100,85 50,100 Q0,85 0,55 L0,15 Z" fill="currentColor"/></svg>`,
  },
  // Arrows
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'arrows',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10,50 H80 M60,30 L85,50 L60,70" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'arrow-left',
    name: 'Arrow Left',
    category: 'arrows',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M90,50 H20 M40,30 L15,50 L40,70" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'arrow-up',
    name: 'Arrow Up',
    category: 'arrows',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,90 V10 M30,30 L50,10 L70,30" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'arrow-down',
    name: 'Arrow Down',
    category: 'arrows',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,10 V90 M30,70 L50,90 L70,70" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'double-arrow',
    name: 'Double Arrow',
    category: 'arrows',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M5,50 L25,50 M20,35 L35,50 L20,65 M95,50 L75,50 M80,35 L65,50 L80,65" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  // Icons
  {
    id: 'check-circle',
    name: 'Check Circle',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/><circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="4" fill="none"/><path d="M30,50 L45,65 L70,35" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'x-circle',
    name: 'X Circle',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/><circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="4" fill="none"/><path d="M35,35 L65,65 M65,35 L35,65" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'info-circle',
    name: 'Info Circle',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/><circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="4" fill="none"/><circle cx="50" cy="30" r="4" fill="currentColor"/><rect x="46" y="42" width="8" height="28" rx="4" fill="currentColor"/></svg>`,
  },
  {
    id: 'lightning',
    name: 'Lightning',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="55,5 20,55 45,55 40,95 80,40 55,40" fill="currentColor"/></svg>`,
  },
  {
    id: 'crown',
    name: 'Crown',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="10,70 20,30 35,50 50,15 65,50 80,30 90,70" fill="currentColor"/><rect x="10" y="70" width="80" height="15" rx="5" fill="currentColor"/></svg>`,
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,0 Q65,0 75,15 Q85,30 85,50 L85,65 L95,80 L5,80 L15,65 L15,50 Q15,30 25,15 Q35,0 50,0 Z M40,85 Q40,100 50,100 Q60,100 60,85" fill="currentColor"/></svg>`,
  },
  {
    id: 'camera',
    name: 'Camera',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M30,20 L70,20 L80,35 L100,35 Q100,100 0,100 Q0,100 0,35 L20,35 Z M50,75 m-20,0 a20,20 0,1,0 40,0 a20,20 0,1,0 -40,0" fill="currentColor"/></svg>`,
  },
  {
    id: 'lock',
    name: 'Lock',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M25,45 L25,35 Q25,15 50,15 Q75,15 75,35 L75,45 L85,45 Q95,45 95,55 L95,90 Q95,100 85,100 L15,100 Q5,100 5,90 L5,55 Q5,45 15,45 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'eye',
    name: 'Eye',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,50 Q50,0 100,50 Q50,100 0,50 Z M50,50 m-15,0 a15,15 0,1,0 30,0 a15,15 0,1,0 -30,0" fill="currentColor"/></svg>`,
  },
  {
    id: 'flame',
    name: 'Flame',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50,0 Q70,25 80,40 Q100,30 100,60 Q100,90 50,100 Q0,90 0,60 Q0,30 20,40 Q30,25 50,0 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'bookmark',
    name: 'Bookmark',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L100,0 L100,100 L50,80 L0,100 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'flag',
    name: 'Flag',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10,0 L10,100 M10,0 L90,0 Q100,0 95,25 Q90,50 100,50 L10,50" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'globe',
    name: 'Globe',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="50" cy="50" rx="20" ry="45" fill="none" stroke="currentColor" stroke-width="4"/><path d="M5,50 H95 M10,30 H90 M10,70 H90" stroke="currentColor" stroke-width="3"/></svg>`,
  },
  {
    id: 'sun',
    name: 'Sun',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" fill="currentColor"/><g stroke="currentColor" stroke-width="6" stroke-linecap="round"><line x1="50" y1="5" x2="50" y2="20"/><line x1="50" y1="80" x2="50" y2="95"/><line x1="5" y1="50" x2="20" y2="50"/><line x1="80" y1="50" x2="95" y2="50"/><line x1="18" y1="18" x2="29" y2="29"/><line x1="71" y1="71" x2="82" y2="82"/><line x1="82" y1="18" x2="71" y2="29"/><line x1="29" y1="71" x2="18" y2="82"/></g></svg>`,
  },
  {
    id: 'moon',
    name: 'Moon',
    category: 'icons',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M60,10 Q20,20 20,50 Q20,80 60,90 Q30,70 30,50 Q30,30 60,10 Z" fill="currentColor"/></svg>`,
  },
  // Decorative
  {
    id: 'ribbon',
    name: 'Ribbon',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M5,25 H95 L85,50 L95,75 H5 L15,50 Z" fill="currentColor"/></svg>`,
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="42" r="35" fill="currentColor"/><path d="M35,72 L50,95 L65,72" fill="currentColor"/></svg>`,
  },
  {
    id: 'laurel',
    name: 'Laurel',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20,80 Q10,60 20,40 Q30,30 40,35 Q30,40 25,55 Q25,65 30,75 Z" fill="currentColor"/><path d="M80,80 Q90,60 80,40 Q70,30 60,35 Q70,40 75,55 Q75,65 70,75 Z" fill="currentColor"/><circle cx="50" cy="50" r="8" fill="currentColor"/></svg>`,
  },
  {
    id: 'wave',
    name: 'Wave',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,50 Q25,20 50,50 Q75,80 100,50" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'dots-pattern',
    name: 'Dots Pattern',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" fill="currentColor"/><circle cx="50" cy="20" r="8" fill="currentColor"/><circle cx="80" cy="20" r="8" fill="currentColor"/><circle cx="20" cy="50" r="8" fill="currentColor"/><circle cx="50" cy="50" r="8" fill="currentColor"/><circle cx="80" cy="50" r="8" fill="currentColor"/><circle cx="20" cy="80" r="8" fill="currentColor"/><circle cx="50" cy="80" r="8" fill="currentColor"/><circle cx="80" cy="80" r="8" fill="currentColor"/></svg>`,
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,50 L20,20 L40,50 L60,20 L80,50 L100,20" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
];

// Gradient overlays
const GRADIENT_OVERLAYS = [
  { id: 'sunset', name: 'Sunset', colors: ['#ff6b35', '#f7931e', '#ffd700'], css: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffd700 100%)' },
  { id: 'ocean', name: 'Ocean', colors: ['#0077b6', '#00b4d8', '#90e0ef'], css: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 50%, #90e0ef 100%)' },
  { id: 'forest', name: 'Forest', colors: ['#2d5016', '#4a7c28', '#8fbc8f'], css: 'linear-gradient(135deg, #2d5016 0%, #4a7c28 50%, #8fbc8f 100%)' },
  { id: 'berry', name: 'Berry', colors: ['#6b2fa0', '#9b59b6', '#e74c3c'], css: 'linear-gradient(135deg, #6b2fa0 0%, #9b59b6 50%, #e74c3c 100%)' },
  { id: 'midnight', name: 'Midnight', colors: ['#0f0c29', '#302b63', '#24243e'], css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { id: 'peach', name: 'Peach', colors: ['#ff9a9e', '#fecfef', '#fdfcfb'], css: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fdfcfb 100%)' },
  { id: 'emerald', name: 'Emerald', colors: ['#11998e', '#38ef7d'], css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'royal', name: 'Royal', colors: ['#141e30', '#243b55'], css: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  { id: 'coral', name: 'Coral', colors: ['#ff6b6b', '#ee5a24'], css: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' },
  { id: 'lavender', name: 'Lavender', colors: ['#a18cd1', '#fbc2eb'], css: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
];

type AssetTab = 'images' | 'elements' | 'gradients';

type GradientAssetPayload = {
  id?: string;
  name?: string;
  colors: string[];
  css: string;
};

export const RoyaltyFreeAssets: React.FC = () => {
  const { canvas, saveHistory, setSelectedObject } = useEditorStore();
  const [activeTab, setActiveTab] = useState<AssetTab>('images');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [images, setImages] = useState<ImageResult[]>([]);
  const [imagePage, setImagePage] = useState(1);
  const [imageTotal, setImageTotal] = useState(0);
  const [loading, loadingSet] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteAssets, setFavoriteAssets] = useState<ImageResult[]>([]);
  const [recentAssets, setRecentAssets] = useState<ImageResult[]>([]);
  const [imageCategories, setImageCategories] = useState<ImageCategory[]>([]);
  const [categoryStatsLoading, setCategoryStatsLoading] = useState(false);
  const [assetCollection, setAssetCollection] = useState<'browse' | 'all' | 'featured' | 'popular' | 'new' | 'favorites' | 'recent'>('browse');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [elementAssets, setElementAssets] = useState<BackendAsset[]>([]);
  const [gradientAssets, setGradientAssets] = useState<BackendAsset[]>([]);
  const [assetError, setAssetError] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchImageCategories = useCallback(async () => {
    setCategoryStatsLoading(true);
    try {
      const response = await apiFetch('/api/assets/categories', { auth: false });
      const data = (await response.json().catch(() => null)) as AssetCategoriesResponse | null;
      if (!response.ok || !data?.success) {
        throw new Error(`Failed to load asset categories (${response.status})`);
      }
      const available = data.categories
        .filter((category) => Number(category.count) > 0)
        .map((category) => {
          const definition = IMAGE_CATEGORY_BY_ID.get(category.id);
          return {
            id: category.id,
            name: definition?.name || category.label,
            emoji: definition?.emoji || '🖼️',
            query: definition?.query || category.label,
            count: Number(category.count),
          } satisfies ImageCategory;
        });
      setImageCategories(available);
    } catch (err) {
      setImageCategories([]);
      setAssetError(err instanceof Error ? err.message : 'Error loading asset categories.');
    } finally {
      setCategoryStatsLoading(false);
    }
  }, []);

  const fetchBackendAssets = useCallback(async (
    category: AssetTab,
    search?: string,
    theme?: string | null,
    limit = 120,
    offset = 0
  ): Promise<BackendAssetList> => {
    const params = new URLSearchParams({ category, limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set('search', search.trim());
    if (theme?.trim()) params.set('theme', theme.trim());
    const response = await apiFetch(`/api/assets?${params.toString()}`, { auth: false });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.error || `Failed to load assets (${response.status})`);
    }
    return {
      assets: (data?.assets || []) as BackendAsset[],
      total: Number(data?.total || 0),
    };
  }, []);

  const fetchBackendImageAssets = useCallback(async (
    category?: string | null,
    query?: string,
    page = 1,
    perPage = IMAGE_PAGE_SIZE
  ): Promise<AssetSearchResponse> => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (category?.trim()) params.set('category', category.trim());
    if (query?.trim()) params.set('q', query.trim());
    const response = await apiFetch(`/api/assets/search?${params.toString()}`, { auth: false });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.detail || data?.error || `Failed to load image assets (${response.status})`);
    }
    return data as AssetSearchResponse;
  }, []);

  const fetchImages = useCallback(async (query: string, page = 1, theme?: string | null) => {
    if (page === 1) {
      loadingSet(true);
    } else {
      setLoadingMore(true);
    }
    setAssetError('');
    try {
      const data = await fetchBackendImageAssets(theme, query, page, IMAGE_PAGE_SIZE);
      const results = data.items.map((asset) => ({
        id: asset.id,
        src: resolveAssetUrl(asset.originalUrl || asset.sourceUrl || asset.imageUrl),
        thumbnail: resolveAssetUrl(asset.thumbnailUrl || asset.imageUrl),
        photographer: 'TECKSTUDIO Assets',
        alt: asset.title,
        source: asset.source,
        license: asset.licenseName,
        attribution: asset.attributionText,
        metadata: asset,
      })).filter((asset) => Boolean(asset.src));
      setImageTotal(data.total);
      setImagePage(page);
      setImages((current) => {
        if (page === 1) return results;
        const seen = new Set(current.map((asset) => asset.id));
        return [...current, ...results.filter((asset) => !seen.has(asset.id))];
      });
    } catch (err) {
      if (page === 1) {
        setImages([]);
        setImageTotal(0);
      }
      setAssetError(err instanceof Error ? err.message : 'Error fetching images.');
    } finally {
      loadingSet(false);
      setLoadingMore(false);
    }
  }, [fetchBackendImageAssets]);

  const fetchLibraryAssets = useCallback(async () => {
    loadingSet(true);
    setAssetError('');
    try {
      const [elements, gradients] = await Promise.all([
        fetchBackendAssets('elements', undefined, null, 120),
        fetchBackendAssets('gradients', undefined, null, 120),
      ]);
      setElementAssets(elements.assets);
      setGradientAssets(gradients.assets);
    } catch (err) {
      setElementAssets([]);
      setGradientAssets([]);
      setAssetError(err instanceof Error ? err.message : 'Error fetching assets.');
    } finally {
      loadingSet(false);
    }
  }, [fetchBackendAssets]);

  useEffect(() => {
    fetchLibraryAssets();
  }, [fetchLibraryAssets]);


  useEffect(() => {
    fetchImageCategories();
    const storedFavorites = loadStoredAssetList(LOCAL_FAVORITES_KEY);
    const storedRecent = loadStoredAssetList(LOCAL_RECENT_KEY);
    setFavoriteAssets(storedFavorites);
    setRecentAssets(storedRecent);
    setFavorites(new Set(storedFavorites.map((asset) => asset.id)));
  }, [fetchImageCategories]);

  // Handle search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (assetCollection === 'favorites') {
      setImages(favoriteAssets);
      setImageTotal(favoriteAssets.length);
      setAssetError('');
      loadingSet(false);
      return undefined;
    }

    if (assetCollection === 'recent') {
      setImages(recentAssets);
      setImageTotal(recentAssets.length);
      setAssetError('');
      loadingSet(false);
      return undefined;
    }

    if (!selectedCategory && !searchQuery.trim() && assetCollection === 'browse') {
      setImages([]);
      setAssetError('');
      loadingSet(false);
      return undefined;
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchImages(searchQuery, 1, selectedCategory);
    }, 350);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory, assetCollection, favoriteAssets, recentAssets, fetchImages]);

  // Handle category click
  const handleCategoryClick = (category: ImageCategory) => {
    setSelectedCategory(category.id);
    setAssetCollection('browse');
    setSearchQuery('');
    setImagePage(1);
    setImageTotal(0);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setAssetCollection('browse');
    setSearchQuery('');
    setImages([]);
    setImagePage(1);
    setImageTotal(0);
    setAssetError('');
  };

  const handleCollectionSelect = (collection: typeof assetCollection) => {
    setSelectedCategory(null);
    setAssetCollection(collection);
    setSearchQuery('');
    setImages([]);
    setImagePage(1);
    setImageTotal(0);
    setAssetError('');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setImagePage(1);
    setImageTotal(0);
    setAssetError('');
    if (value.trim()) {
      setSelectedCategory(null);
      setAssetCollection('all');
    }
  };

  const rememberRecentAsset = (asset: ImageResult) => {
    setRecentAssets((current) => {
      const next = [asset, ...current.filter((item) => item.id !== asset.id)].slice(0, RECENT_ASSET_LIMIT);
      storeAssetList(LOCAL_RECENT_KEY, next);
      return next;
    });
  };

  const addBackendAssetToCanvas = (asset: BackendAsset) => {
    if (!asset.file_data) return;
    if (asset.file_type === 'gradient') {
      try {
        const gradient = JSON.parse(asset.file_data) as typeof GRADIENT_OVERLAYS[0];
        addGradientOverlay({
          id: asset.id,
          name: asset.name,
          colors: gradient.colors,
          css: gradient.css,
        });
      } catch {
        setAssetError('Invalid gradient asset payload.');
      }
      return;
    }

    if (asset.file_type === 'svg') {
      addSvgElement(asset.file_data);
      return;
    }

    addImageToCanvas(asset.file_data, asset);
  };

  const getVisibleCanvasCenter = (targetCanvas: fabric.Canvas) => {
    const fabricCanvas = targetCanvas as fabric.Canvas & {
      upperCanvasEl?: HTMLCanvasElement;
      lowerCanvasEl?: HTMLCanvasElement;
    };
    const canvasElement = fabricCanvas.upperCanvasEl || fabricCanvas.lowerCanvasEl;
    if (!canvasElement) {
      return { x: targetCanvas.getWidth() / 2, y: targetCanvas.getHeight() / 2 };
    }

    const canvasRect = canvasElement.getBoundingClientRect();
    const scrollViewport = canvasElement.closest('.canvas-container')?.parentElement;
    const viewportRect = scrollViewport?.getBoundingClientRect();
    const visibleLeft = Math.max(canvasRect.left, viewportRect?.left ?? 0, 0);
    const visibleTop = Math.max(canvasRect.top, viewportRect?.top ?? 0, 0);
    const visibleRight = Math.min(canvasRect.right, viewportRect?.right ?? window.innerWidth, window.innerWidth);
    const visibleBottom = Math.min(canvasRect.bottom, viewportRect?.bottom ?? window.innerHeight, window.innerHeight);

    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop || canvasRect.width <= 0 || canvasRect.height <= 0) {
      return { x: targetCanvas.getWidth() / 2, y: targetCanvas.getHeight() / 2 };
    }

    return {
      x: ((visibleLeft + visibleRight) / 2 - canvasRect.left) * (targetCanvas.getWidth() / canvasRect.width),
      y: ((visibleTop + visibleBottom) / 2 - canvasRect.top) * (targetCanvas.getHeight() / canvasRect.height),
    };
  };

  const getEditorCanvas = () => {
    if (canvas) return canvas;
    const canvasElement = document.querySelector('[data-fabric-canvas="lower"], [data-fabric-canvas="upper"]') as
      | (HTMLCanvasElement & { __fabric?: fabric.Canvas })
      | null;
    if (canvasElement?.__fabric) {
      useEditorStore.setState({ canvas: canvasElement.__fabric });
      return canvasElement.__fabric;
    }
    return null;
  };

  // Add image to canvas
  const addImageToCanvas = async (src: string, metadata?: BackendAsset | AssetSearchItem | ImageResult) => {
    const targetCanvas = getEditorCanvas();
    if (!targetCanvas) {
      setAssetError('Canvas is not ready. Please wait a moment and try again.');
      return;
    }
    if (!src) {
      setAssetError('Asset image source is missing.');
      return;
    }

    setAssetError('');

    try {
      const imageSource = await prepareCanvasImageSource(src, metadata);

      const imageElement = await loadDecodedImage(imageSource);
      const naturalWidth = imageElement.naturalWidth || imageElement.width;
      const naturalHeight = imageElement.naturalHeight || imageElement.height;
      if (!naturalWidth || !naturalHeight) {
        throw new Error('Unable to load a valid image asset.');
      }

      const img = new fabric.Image(imageElement, {
        objectCaching: true,
        noScaleCache: false,
      });

      const canvasWidth = targetCanvas.getWidth();
      const canvasHeight = targetCanvas.getHeight();
      const maxWidth = canvasWidth * 0.6;
      const maxHeight = canvasHeight * 0.6;
      const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
      const visibleCenter = getVisibleCanvasCenter(targetCanvas);
      const asset = (metadata && 'metadata' in metadata ? metadata.metadata : metadata) as BackendAsset | AssetSearchItem | undefined;
      const sourceUrl = asset && 'imageUrl' in asset
        ? resolveAssetUrl(asset.originalUrl || asset.sourceUrl || asset.imageUrl)
        : resolveAssetUrl((asset as BackendAsset | undefined)?.image_url || src);
      const thumbnailUrl = asset && 'thumbnailUrl' in asset
        ? resolveAssetUrl(asset.thumbnailUrl)
        : resolveAssetUrl((asset as BackendAsset | undefined)?.thumbnail_url || sourceUrl);
      const categorySlug = asset?.category || selectedCategory;

      img.set({
        left: visibleCenter.x,
        top: visibleCenter.y,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        opacity: 1,
        visible: true,
        objectType: 'asset-image',
        teckstudioObjectType: 'asset-image',
        teckstudioAssetType: 'image',
        assetId: asset?.id,
        assetCategory: categorySlug,
        sourceUrl,
        thumbnailUrl,
        originalWidth: naturalWidth,
        originalHeight: naturalHeight,
        naturalWidth,
        naturalHeight,
        assetMetadata: asset,
      } as fabric.IObjectOptions & Record<string, unknown>);

      targetCanvas.add(img);
      img.setCoords();
      targetCanvas.bringToFront(img);
      targetCanvas.setActiveObject(img);
      setSelectedObject(img);
      targetCanvas.renderAll();
      targetCanvas.requestRenderAll();
      if (metadata && 'src' in metadata && 'thumbnail' in metadata) {
        rememberRecentAsset(metadata as ImageResult);
      }
      saveHistory();
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : 'Unable to add image asset to canvas.');
    }
  };

  const addEditableDiagramToCanvas = (asset: ImageResult) => {
    const targetCanvas = getEditorCanvas();
    if (!targetCanvas) {
      setAssetError('Canvas is not ready. Please wait a moment and try again.');
      return;
    }

    setAssetError('');
    const kind = getTechnicalDiagramKind(asset, searchQuery);
    const { nodes, links } = editableDiagramSpecFor(kind);
    const minNodeX = Math.min(...nodes.map((node) => node.x));
    const minNodeY = Math.min(...nodes.map((node) => node.y));
    const safeOrigin = {
      x: Math.max(80, targetCanvas.getWidth() * 0.08),
      y: 20,
    };
    const nodeObjects = new Map<string, fabric.Object>();
    const connectorObjects: fabric.Object[] = [];

    nodes.forEach((node) => {
      const fabricNode = createEditableTechnicalNode(node, {
        left: safeOrigin.x + (node.x - minNodeX),
        top: safeOrigin.y + (node.y - minNodeY),
        width: 360,
        height: 150,
        kind,
        sourceAssetId: asset.id,
      });
      targetCanvas.add(fabricNode);
      fabricNode.setCoords();
      nodeObjects.set(node.key, fabricNode);
    });

    links.forEach((link) => {
      const source = nodeObjects.get(link.from);
      const target = nodeObjects.get(link.to);
      if (!source || !target) return;
      const sourceCenter = source.getCenterPoint();
      const targetCenter = target.getCenterPoint();
      const horizontal = Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);
      const sourceAnchor = horizontal
        ? (targetCenter.x >= sourceCenter.x ? 'right' : 'left')
        : (targetCenter.y >= sourceCenter.y ? 'bottom' : 'top');
      const targetAnchor = horizontal
        ? (targetCenter.x >= sourceCenter.x ? 'left' : 'right')
        : (targetCenter.y >= sourceCenter.y ? 'top' : 'bottom');
      const sourceId = String(source.get('architectureNodeId' as keyof fabric.Object) || source.get('id' as keyof fabric.Object));
      const targetId = String(target.get('architectureNodeId' as keyof fabric.Object) || target.get('id' as keyof fabric.Object));
      connectorObjects.push(...createDiagramConnector(targetCanvas, {
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        sourceObjectId: sourceId,
        targetObjectId: targetId,
        sourceAnchor,
        targetAnchor,
        connectorType: link.dashed ? 'elbow' : 'straight',
        routing: horizontal ? 'elbow' : 'vertical',
        lineStyle: link.dashed ? 'dashed' : 'solid',
        style: link.dashed ? 'dashed' : 'solid',
        color: AI_ARCHITECTURE_PALETTE.green,
        width: 3,
        endArrow: 'arrow',
        label: link.label || '',
        labelVisible: Boolean(link.label),
      }));
    });

    updateAllDiagramConnectors(targetCanvas);
    connectorObjects.forEach((object) => targetCanvas.bringToFront(object));
    nodeObjects.forEach((object) => targetCanvas.bringToFront(object));
    targetCanvas.discardActiveObject();
    setSelectedObject(null);
    targetCanvas.requestRenderAll();
    rememberRecentAsset(asset);
    saveHistory();
  };

  // Add SVG element to canvas
  const addSvgElement = (svgData: string, color: string = '#8b5cf6') => {
    if (!canvas) return;

    const svgString = svgData.replace('currentColor', color);
    fabric.loadSVGFromString(svgString, (objects, options) => {
      const group = fabric.util.groupSVGElements(objects, options);

      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      // Scale to reasonable size
      const maxSize = 150;
      const scale = Math.min(maxSize / (group.width || 1), maxSize / (group.height || 1));

      group.set({
        left: canvasWidth / 2 - ((group.width || 0) * scale) / 2,
        top: canvasHeight / 2 - ((group.height || 0) * scale) / 2,
        scaleX: scale,
        scaleY: scale,
      });

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
      saveHistory();
    });
  };

  // Add gradient overlay to canvas
  const addGradientOverlay = (gradient: typeof GRADIENT_OVERLAYS[0]) => {
    if (!canvas) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    // Create gradient rect with actual Fabric.js linear gradient
    const rect = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: canvasHeight,
      selectable: true,
      opacity: 0.7,
    });

    // Apply actual gradient fill
    const colorStops = gradient.colors.map((color, i) => ({
      offset: i / (gradient.colors.length - 1),
      color: color,
    }));

    (rect as any).set('fill', new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: canvasWidth, y2: canvasHeight },
      colorStops,
    }));

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveHistory();
  };

  // Toggle favorite
  const toggleFavorite = (assetOrId: ImageResult | string) => {
    const asset = typeof assetOrId === 'string'
      ? images.find((item) => item.id === assetOrId) || favoriteAssets.find((item) => item.id === assetOrId)
      : assetOrId;
    const id = typeof assetOrId === 'string' ? assetOrId : assetOrId.id;
    setFavorites((previous) => {
      const next = new Set(previous);
      let nextAssets = favoriteAssets;
      if (next.has(id)) {
        next.delete(id);
        nextAssets = favoriteAssets.filter((item) => item.id !== id);
      } else {
        next.add(id);
        if (asset) {
          nextAssets = [asset, ...favoriteAssets.filter((item) => item.id !== id)].slice(0, RECENT_ASSET_LIMIT);
        }
      }
      setFavoriteAssets(nextAssets);
      storeAssetList(LOCAL_FAVORITES_KEY, nextAssets);
      return next;
    });
  };


  const backendGradientAssets = gradientAssets
    .map((asset) => {
      if (!asset.file_data) return null;
      try {
        const parsed = JSON.parse(asset.file_data) as GradientAssetPayload;
        if (!Array.isArray(parsed.colors) || !parsed.css) return null;
        return {
          id: asset.id,
          name: asset.name,
          colors: parsed.colors,
          css: parsed.css,
        };
      } catch {
        return null;
      }
    })
    .filter((asset): asset is typeof GRADIENT_OVERLAYS[0] => Boolean(asset));
  const selectedImageCategory = imageCategories.find((category) => category.id === selectedCategory) || IMAGE_CATEGORY_BY_ID.get(selectedCategory || '');
  const showImageResults = Boolean(selectedCategory || searchQuery.trim() || assetCollection !== 'browse');
  const visibleImages = useMemo(() => {
    if (assetCollection === 'featured') return images.filter((image, index) => index < 18 || image.metadata?.source === 'local-reference-media');
    if (assetCollection === 'popular') return [...images].sort((left, right) => String(left.alt).localeCompare(String(right.alt)));
    if (assetCollection === 'new') return [...images].reverse();
    return images;
  }, [assetCollection, images]);
  const hasMoreImages = showImageResults && !['favorites', 'recent'].includes(assetCollection) && images.length < imageTotal;

  return (
    <div className="flex flex-col h-full">
      {/* Tab Selector */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {[
          { id: 'images' as AssetTab, label: 'Images', icon: Image },
          { id: 'gradients' as AssetTab, label: 'Gradients', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {assetError && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {assetError}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder={selectedImageCategory ? `Search ${selectedImageCategory.name} assets...` : 'Search assets, photos, graphics, backgrounds, or topics'}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {[
                ['browse', 'Categories'],
                ['all', 'All assets'],
                ['featured', 'Featured'],
                ['popular', 'Popular'],
                ['new', 'New'],
                ['favorites', 'Favourites'],
                ['recent', 'Recent'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleCollectionSelect(id as typeof assetCollection)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    assetCollection === id && !selectedCategory
                      ? 'border-violet-500 bg-violet-500/15 text-violet-200'
                      : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-violet-500/40 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {showImageResults && imageCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {imageCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryClick(category)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      selectedCategory === category.id
                        ? 'border-violet-500 bg-violet-500/15 text-violet-200'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-violet-500/40 hover:text-zinc-200'
                    }`}
                  >
                    {category.emoji} {category.name}
                  </button>
                ))}
              </div>
            )}

            {selectedCategory === 'technical-diagrams' && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-violet-200">Technical Diagrams</p>
                  <p className="text-[10px] text-zinc-500">Use as Image or Create Editable Diagram</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TECHNICAL_DIAGRAM_SUBCATEGORIES.map((subcategory) => (
                    <button
                      key={subcategory.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(subcategory.query);
                        setImagePage(1);
                        setImageTotal(0);
                      }}
                      className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 transition-colors hover:border-violet-500/60 hover:text-white"
                    >
                      {subcategory.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!selectedCategory && searchQuery.trim() === '' && assetCollection === 'browse' && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Technical Search Examples</p>
                <div className="flex flex-wrap gap-1.5">
                  {TECHNICAL_SEARCH_HINTS.map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => handleSearchChange(hint)}
                      className="rounded-full border border-zinc-800 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-zinc-400 transition-colors hover:border-violet-500/50 hover:text-zinc-100"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {!showImageResults && (
              <div>
                <h4 className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Browse Categories</h4>
                <div className="grid grid-cols-3 gap-2">
                  {imageCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat)}
                      className="flex flex-col items-center gap-1.5 p-3 bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-[10px] font-semibold text-zinc-300">{cat.name}</span>
                      <span className="text-[9px] text-zinc-500">{cat.count || 0}</span>
                    </button>
                  ))}
                </div>
                {!categoryStatsLoading && imageCategories.length === 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center text-xs text-zinc-500">
                    No asset categories are available.
                  </div>
                )}
              </div>
            )}

            {/* View Mode Toggle */}
            {showImageResults && (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleBackToCategories}
                  className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer"
                >
                  ← Back to categories
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-xs font-bold text-zinc-200">
                    {selectedImageCategory?.name || 'Image Search'}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {loading ? 'Loading assets...' : `${images.length}/${imageTotal} assets`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 bg-zinc-900 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                  >
                    <Grid3x3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && showImageResults && (
              <div className="columns-2 gap-2 space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className={`mb-2 break-inside-avoid animate-pulse rounded-xl bg-zinc-900 ${
                      index % 3 === 0 ? 'h-28' : index % 3 === 1 ? 'h-20' : 'h-24'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Image Grid */}
            {!loading && showImageResults && visibleImages.length > 0 && (
              <div className={viewMode === 'grid' ? 'columns-2 gap-2 space-y-2' : 'flex flex-col gap-2'}>
                {visibleImages.map((img) => (
                  <div
                    key={img.id}
                    className={`group relative rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500/50 transition-all cursor-pointer ${
                      viewMode === 'list' ? 'flex gap-3 p-2' : 'mb-2 break-inside-avoid'
                    }`}
                    onClick={() => addImageToCanvas(img.src, img.metadata)}
                  >
	                    <img
	                      src={img.thumbnail}
	                      alt={img.alt}
	                      title={`${img.alt}${img.license ? ` • ${img.license}` : ''}`}
	                      className={viewMode === 'list' ? 'h-16 w-16 rounded-lg object-cover object-center [image-rendering:auto]' : 'h-auto w-full object-cover object-center [image-rendering:auto]'}
                          srcSet={img.src !== img.thumbnail ? `${img.thumbnail} 480w, ${img.src} 1600w` : undefined}
                          sizes={viewMode === 'list' ? '64px' : '(max-width: 360px) 160px, 220px'}
	                      loading="lazy"
	                      onClick={(event) => {
	                        event.stopPropagation();
	                        addImageToCanvas(img.src, img.metadata);
	                      }}
	                    />
                    {/* Overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
	                      <button
	                        type="button"
	                        title="Add image to canvas"
	                        onClick={(e) => {
	                          e.stopPropagation();
                          addImageToCanvas(img.src, img.metadata);
                        }}
	                        className="pointer-events-auto p-2 bg-white/20 rounded-full hover:bg-white/30"
                      >
                        <Image className="w-4 h-4 text-white" />
	                      </button>
	                      <button
	                        type="button"
	                        title="Download asset"
	                        onClick={(e) => e.stopPropagation()}
	                        className="pointer-events-auto p-2 bg-white/20 rounded-full hover:bg-white/30"
	                      >
	                        <Download className="w-4 h-4 text-white" />
	                      </button>
	                      <button
	                        type="button"
	                        title="Favorite asset"
	                        onClick={(e) => {
	                          e.stopPropagation();
	                          toggleFavorite(img);
	                        }}
	                        className="pointer-events-auto p-2 bg-white/20 rounded-full hover:bg-white/30"
	                      >
                        <Heart
                          className={`w-4 h-4 ${favorites.has(img.id) ? 'fill-red-400 text-red-400' : 'text-white'}`}
                        />
                      </button>
                    </div>
                    {isTechnicalDiagramAsset(img) && (
                      <div className="absolute inset-x-1 bottom-1 z-10 grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addImageToCanvas(img.src, img.metadata);
                          }}
                          className="rounded-md bg-black/75 px-1.5 py-1 text-[9px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-violet-600"
                        >
                          Use as Image
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addEditableDiagramToCanvas(img);
                          }}
                          className="rounded-md bg-violet-600 px-1.5 py-1 text-[9px] font-bold text-white shadow-lg shadow-violet-950/30 transition-colors hover:bg-violet-500"
                        >
                          Create Editable Diagram
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && hasMoreImages && (
              <button
                onClick={() => fetchImages(searchQuery, imagePage + 1, selectedCategory)}
                disabled={loadingMore}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-violet-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  `Load more (${images.length}/${imageTotal})`
                )}
              </button>
            )}

            {/* Empty State */}
            {!loading && showImageResults && visibleImages.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-semibold">No assets found</p>
                <p className="text-xs mt-1">
                  Try another keyword or select a different category.
                </p>
                <button
                  onClick={() => fetchImages(searchQuery, 1, selectedCategory)}
                  className="mt-4 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-violet-500/50 hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Elements Tab */}
        {activeTab === 'elements' && (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {elementAssets.length > 0 ? 'Backend SVG Elements' : 'SVG Elements'}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {elementAssets.length > 0
                ? elementAssets.filter((asset) => Boolean(asset.file_data)).map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => addBackendAssetToCanvas(asset)}
                      className="flex flex-col items-center gap-2 p-4 bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer group"
                    >
                      <div
                        className="w-10 h-10 text-zinc-400 group-hover:text-violet-400 transition-colors"
                        dangerouslySetInnerHTML={{ __html: asset.file_data || '' }}
                      />
                      <span className="text-[9px] font-semibold text-zinc-500">{asset.name}</span>
                    </button>
                  ))
                : SVG_ELEMENTS.map((element) => (
                    <button
                      key={element.id}
                      onClick={() => addSvgElement(element.svg)}
                      className="flex flex-col items-center gap-2 p-4 bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer group"
                    >
                      <div
                        className="w-10 h-10 text-zinc-400 group-hover:text-violet-400 transition-colors"
                        dangerouslySetInnerHTML={{ __html: element.svg }}
                      />
                      <span className="text-[9px] font-semibold text-zinc-500">{element.name}</span>
                    </button>
                  ))}
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Quick Shapes</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { shape: 'circle', label: 'Circle', color: '#8b5cf6' },
                  { shape: 'rect', label: 'Square', color: '#ec4899' },
                  { shape: 'triangle', label: 'Triangle', color: '#f97316' },
                  { shape: 'star', label: 'Star', color: '#eab308' },
                  { shape: 'pentagon', label: 'Pentagon', color: '#22c55e' },
                  { shape: 'hexagon', label: 'Hexagon', color: '#06b6d4' },
                  { shape: 'octagon', label: 'Octagon', color: '#3b82f6' },
                  { shape: 'diamond', label: 'Diamond', color: '#a855f7' },
                ].map((item) => (
                  <button
                    key={item.shape}
                    onClick={() => {
                      if (!canvas) return;
                      let shape: fabric.Object;
                      const center = { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 };

                      switch (item.shape) {
                        case 'circle':
                          shape = new fabric.Circle({ left: center.x - 50, top: center.y - 50, radius: 50, fill: item.color });
                          break;
                        case 'rect':
                          shape = new fabric.Rect({ left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        case 'triangle':
                          shape = new fabric.Triangle({ left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        case 'star':
                          shape = new fabric.Path('M 50 0 L 65 35 L 100 35 L 72 57 L 83 91 L 50 70 L 17 91 L 28 57 L 0 35 L 35 35 Z', { left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        case 'pentagon':
                          shape = new fabric.Polygon([
                            { x: 50, y: 0 }, { x: 100, y: 38 }, { x: 81, y: 100 }, { x: 19, y: 100 }, { x: 0, y: 38 }
                          ], { left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        case 'hexagon':
                          shape = new fabric.Polygon([
                            { x: 50, y: 0 }, { x: 100, y: 25 }, { x: 100, y: 75 }, { x: 50, y: 100 }, { x: 0, y: 75 }, { x: 0, y: 25 }
                          ], { left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        case 'octagon':
                          shape = new fabric.Polygon([
                            { x: 29, y: 0 }, { x: 71, y: 0 }, { x: 100, y: 29 }, { x: 100, y: 71 },
                            { x: 71, y: 100 }, { x: 29, y: 100 }, { x: 0, y: 71 }, { x: 0, y: 29 }
                          ], { left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        case 'diamond':
                          shape = new fabric.Polygon([
                            { x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }
                          ], { left: center.x - 50, top: center.y - 50, width: 100, height: 100, fill: item.color });
                          break;
                        default:
                          shape = new fabric.Circle({ left: center.x - 50, top: center.y - 50, radius: 50, fill: item.color });
                      }

                      canvas.add(shape);
                      canvas.setActiveObject(shape);
                      canvas.renderAll();
                      saveHistory();
                    }}
                    className="flex flex-col items-center gap-1 p-3 bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-[8px] font-semibold text-zinc-500">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gradients Tab */}
        {activeTab === 'gradients' && (
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {backendGradientAssets.length > 0 ? 'Backend Gradient Overlays' : 'Gradient Overlays'}
            </h4>
            <p className="text-[10px] text-zinc-500 -mt-2">Click to add as a background overlay</p>
            <div className="grid grid-cols-2 gap-3">
              {(backendGradientAssets.length > 0 ? backendGradientAssets : GRADIENT_OVERLAYS).map((gradient) => (
                <button
                  key={gradient.id}
                  onClick={() => addGradientOverlay(gradient)}
                  className="group relative rounded-xl overflow-hidden border border-zinc-800 hover:border-violet-500/50 transition-all cursor-pointer"
                >
                  <div
                    className="w-full aspect-square"
                    style={{ background: gradient.css }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60">
                    <span className="text-[10px] font-semibold text-white">{gradient.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Solid Colors</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  '#000000',
                  '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e',
                  '#06b6d4', '#3b82f6', '#a855f7', '#ef4444', '#10b981',
                  '#f59e0b', '#6366f1', '#14b8a6', '#e11d48', '#7c3aed',
                  '#0891b2', '#059669', '#d97706', '#2563eb', '#9333ea',
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (!canvas) return;
                      const rect = new fabric.Rect({
                        left: 0,
                        top: 0,
                        width: canvas.getWidth(),
                        height: canvas.getHeight(),
                        fill: color,
                        selectable: true,
                        opacity: 0.8,
                      });
                      canvas.add(rect);
                      canvas.setActiveObject(rect);
                      canvas.renderAll();
                      saveHistory();
                    }}
                    aria-label={`${color} solid color`}
                    className={`w-8 h-8 rounded-lg border-2 hover:border-white/60 transition-all cursor-pointer shadow-md hover:scale-110 ${
                      color === '#000000' ? 'border-zinc-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
