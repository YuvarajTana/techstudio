import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Wand2, ImagePlus, Loader2,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle,
  Plus, X, FileText,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { apiFetch } from '../../services/apiClient';
import { fabric } from 'fabric';
import { useNavigate } from 'react-router-dom';
import { GeneratedAssetActions } from './GeneratedAssetActions';
import {
  POSTER_SPEC_THEMES,
  normalizePosterSpec,
  renderPosterSpecToCanvas,
  type PosterSpec,
  type PosterSpecThemeId,
} from '../../utils/posterSpecRenderer';

/* ─── Helpers ─── */
const Section: React.FC<{
  title: string; icon: React.ReactNode; defaultOpen?: boolean;
  children: React.ReactNode; accentFrom?: string;
}> = ({ title, icon, defaultOpen = false, children, accentFrom = 'from-violet-500/20' }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-sm">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left cursor-pointer bg-gradient-to-r ${accentFrom} to-transparent transition-colors hover:bg-zinc-800/50`}>
        <span className="shrink-0 text-violet-300">{icon}</span>
        <span className="flex-1 text-xs font-semibold tracking-wide text-zinc-100">{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col gap-3 px-4 py-3">{children}</div>
      </div>
    </div>
  );
};

const inputCls = 'w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3.5 py-2.5 text-xs text-zinc-100 shadow-inner outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20';
const btnPrimary = 'w-full flex items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/10 transition-all cursor-pointer hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed';
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
const thumbnailPlatforms = [
  { id: 'youtube', label: 'YouTube', width: 1280, height: 720, aspect: '16:9' },
  { id: 'youtube_shorts', label: 'YouTube Shorts', width: 1080, height: 1920, aspect: '9:16' },
  { id: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080, aspect: '1:1' },
  { id: 'instagram_reel', label: 'Instagram Reel Cover', width: 1080, height: 1920, aspect: '9:16' },
  { id: 'facebook_cover', label: 'Facebook Cover', width: 1640, height: 924, aspect: '16:9' },
  { id: 'linkedin_video', label: 'LinkedIn Video Cover', width: 1200, height: 675, aspect: '16:9' },
  { id: 'custom', label: 'Custom', width: 1280, height: 720, aspect: '16:9' },
];
const thumbnailStyles = ['Cinematic', 'Bold and High Contrast', 'Minimal', 'Modern Tech', 'Gaming', 'Luxury', 'Educational', 'News', 'Cartoon', 'Retro', 'Futuristic', 'Professional', 'Vibrant', 'Dark Dramatic'];

const loadBrowserImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
  image.onload = () => {
    if (!image.naturalWidth || !image.naturalHeight) {
      reject(new Error('Generated poster image loaded with invalid dimensions'));
      return;
    }
    resolve(image);
  };
  image.onerror = () => reject(new Error('Generated poster image could not be loaded by the browser'));
  image.src = src;
});

type AiEntryPoint = 'chat' | 'poster' | 'image' | 'thumbnail';

type GeneratedAssetType = 'image' | 'poster' | 'thumbnail';

type PosterGenerationMode = 'single_image_poster' | 'editable_structured_poster' | 'carousel_or_card_set';

function classifyPosterGenerationMode(prompt: string): PosterGenerationMode {
  const normalized = prompt.toLowerCase();
  if (/\b(carousel|slides?|multi[- ]?card|multiple cards?)\b/.test(normalized)) return 'carousel_or_card_set';
  if (/\b(infographic|timeline|step[- ]?by[- ]?step|numbered (?:cards?|sections?|steps?)|comparison|editable (?:layout|poster|template)|\d+\s*(?:cards?|sections?|steps?))\b/.test(normalized)) {
    return 'editable_structured_poster';
  }
  return 'single_image_poster';
}

type PosterAttachmentFile = {
  id: string;
  name: string;
  file: File;
  size: number;
  kind: 'document';
  summary?: string;
};

type PosterAttachmentImage = {
  id: string;
  name: string;
  file: File;
  size: number;
  kind: 'image';
  previewUrl: string;
};

function createAttachmentId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitialAiEntryPoint(): AiEntryPoint | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('ai');
  return value === 'chat' || value === 'poster' || value === 'image' || value === 'thumbnail' ? value : null;
}

function getInitialPrompt() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('prompt') || '';
}

async function fileFromDataUrl(name: string, type: string, dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: type || blob.type || 'application/octet-stream' });
}

/* ─── Canvas getter — tries store then DOM ─── */
function getCanvas(): fabric.Canvas | null {
  // Try Zustand store first
  const storeCanvas = useEditorStore.getState().canvas;
  if (storeCanvas) return storeCanvas;
  // Try DOM fallback
  const canvasEl = document.querySelector('.canvas-container canvas') as any;
  if (canvasEl && canvasEl.__fabric) return canvasEl.__fabric;
  return null;
}

function getPersistedProjectId(): string | undefined {
  const projectId = useEditorStore.getState().projectId;
  return projectId && !projectId.startsWith('local_') ? projectId : undefined;
}

function getStableChatConversationId(): string {
  const projectId = getPersistedProjectId() || window.location.pathname.match(/\/editor\/([^/?#]+)/)?.[1];
  if (projectId && !projectId.startsWith('local_')) return `project_${projectId}`;
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getFabricImageSource(object: fabric.Object | null | undefined) {
  if (!object || object.type !== 'image') return '';
  const imageObject = object as fabric.Image & { src?: string };
  let storedSource = String((imageObject as any).teckstudioImageSource || '');
  try {
    storedSource = String((imageObject as any).get?.('teckstudioImageSource') || storedSource);
  } catch {
    storedSource = String((imageObject as any).teckstudioImageSource || '');
  }
  const serializedSource = String(imageObject.src || '');
  const elementSource = String((imageObject as any)._originalElement?.src || (imageObject as any)._element?.src || '');
  if (storedSource || serializedSource || elementSource) {
    return storedSource || serializedSource || elementSource;
  }

  try {
    const getSrc = imageObject.getSrc as unknown as (() => string) | undefined;
    return getSrc?.() || '';
  } catch {
    return '';
  }
}

function triggerBrowserDownload(downloadUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

type AiStatus = { ok: boolean; msg: string; requestId?: string };

type ProviderFailure = {
  provider?: unknown;
  category?: unknown;
  status?: unknown;
  model?: unknown;
};

const TEMPORARY_AI_UNAVAILABLE_MESSAGE = 'AI service is temporarily unavailable. Please try again later.';

function getProviderFailures(payload: any): ProviderFailure[] {
  const detail = payload?.detail;
  if (Array.isArray(detail?.providerFailures)) return detail.providerFailures;
  if (Array.isArray(detail?.provider_attempts)) return detail.provider_attempts;
  if (Array.isArray(payload?.providerFailures)) return payload.providerFailures;
  if (Array.isArray(payload?.provider_attempts)) return payload.provider_attempts;
  return [];
}

function isProviderAvailabilityError(payload: any) {
  const detail = payload?.detail;
  const code = String(detail?.code || payload?.code || '');
  return getProviderFailures(payload).length > 0 || code.includes('PROVIDERS_UNAVAILABLE');
}

function formatAiApiError(payload: any, fallbackMessage: string) {
  if (isProviderAvailabilityError(payload)) return TEMPORARY_AI_UNAVAILABLE_MESSAGE;

  const detail = payload?.detail;
  const message = typeof detail === 'string'
    ? detail
    : detail?.message || payload?.message || payload?.error || fallbackMessage;
  return message;
}

/* ─── Theme Database ─── */
const THEMES: Record<string, { bg: string; primary: string; secondary: string; accent: string; heading: string; subtitle: string; gradient: string[]; decor: string }> = {
  movie:   { bg: '#0a0a0a', primary: '#ffd700', secondary: '#fff', accent: '#b8860b', heading: 'THE BLOCKBUSTER', subtitle: 'Coming Soon', gradient: ['#0a0a0a','#1a0a0a','#2a0a0a'], decor: 'circles' },
  hero:    { bg: '#0a0a0a', primary: '#ffd700', secondary: '#fff', accent: '#b8860b', heading: 'THE LEGEND', subtitle: 'A Story Of Triumph', gradient: ['#0a0a0a','#1a0a0a','#2a0a0a'], decor: 'rays' },
  fashion: { bg: '#1a0015', primary: '#ec4899', secondary: '#fff', accent: '#f472b6', heading: 'STYLE EDIT', subtitle: 'New Collection', gradient: ['#1a0015','#2d0025','#3d0035'], decor: 'circles' },
  beauty:  { bg: '#fff0f5', primary: '#ff69b4', secondary: '#1a1a1a', accent: '#db2777', heading: 'BEAUTY GLOW', subtitle: 'Enhance Your Beauty', gradient: ['#fff0f5','#ffe4ee','#ffd6e8'], decor: 'dots' },
  fitness: { bg: '#0a0a0a', primary: '#ef4444', secondary: '#fff', accent: '#f97316', heading: 'PUSH HARDER', subtitle: '30 Day Challenge', gradient: ['#0a0a0a','#1a0000','#2a0000'], decor: 'diagonal' },
  gym:     { bg: '#0a0a0a', primary: '#ef4444', secondary: '#fff', accent: '#f97316', heading: 'NO PAIN NO GAIN', subtitle: 'Join The Gym', gradient: ['#0a0a0a','#1a0000','#2a0000'], decor: 'stripes' },
  music:   { bg: '#1a002a', primary: '#a855f7', secondary: '#fff', accent: '#e879f9', heading: 'LIVE IN CONCERT', subtitle: 'World Tour 2026', gradient: ['#1a002a','#2d004a','#3d005a'], decor: 'waves' },
  concert: { bg: '#1a002a', primary: '#a855f7', secondary: '#fff', accent: '#e879f9', heading: 'LIVE IN CONCERT', subtitle: 'Get Your Tickets', gradient: ['#1a002a','#2d004a','#3d005a'], decor: 'circles' },
  food:    { bg: '#2c1810', primary: '#d4a574', secondary: '#fff8f0', accent: '#8b5c3a', heading: 'TASTE THE BEST', subtitle: "Chef's Special", gradient: ['#2c1810','#3d2314','#4a2c1a'], decor: 'circles' },
  restaurant: { bg: '#1a1a1a', primary: '#ffd700', secondary: '#fff', accent: '#c9a227', heading: 'FINE DINING', subtitle: 'Reserve Your Table', gradient: ['#1a1a1a','#2a2a2a','#3a3a3a'], decor: 'lines' },
  cafe:    { bg: '#2c1810', primary: '#d4a574', secondary: '#f5e6d3', accent: '#8b5c3a', heading: 'FRESH BREWS', subtitle: 'Open Daily', gradient: ['#2c1810','#3d2314','#4a2c1a'], decor: 'circles' },
  tech:    { bg: '#0a192f', primary: '#00c8ff', secondary: '#fff', accent: '#64ffda', heading: 'INNOVATE', subtitle: 'The Future Starts Here', gradient: ['#0a192f','#112240','#1a3355'], decor: 'grid' },
  startup: { bg: '#0f172a', primary: '#6366f1', secondary: '#fff', accent: '#a5b4fc', heading: 'LAUNCH DAY', subtitle: 'From Idea To Impact', gradient: ['#0f172a','#1e293b','#334155'], decor: 'circles' },
  nature:  { bg: '#0f2419', primary: '#22c55e', secondary: '#fff', accent: '#86efac', heading: 'WILD & FREE', subtitle: 'Explore Nature', gradient: ['#0f2419','#1a3a25','#224530'], decor: 'dots' },
  wedding: { bg: '#fff8f0', primary: '#d4a574', secondary: '#1a1a1a', accent: '#f5e6d3', heading: 'WE DO', subtitle: 'Save The Date', gradient: ['#fff8f0','#fff0e0','#ffe8d0'], decor: 'lines' },
  luxury:  { bg: '#1a1a1a', primary: '#ffd700', secondary: '#fff', accent: '#b8860b', heading: 'OPULENCE', subtitle: 'Exclusive Collection', gradient: ['#1a1a1a','#2a2a2a','#0a0a0a'], decor: 'lines' },
  sale:    { bg: '#1a0000', primary: '#ef4444', secondary: '#fff', accent: '#f97316', heading: 'MEGA SALE', subtitle: 'UP TO 70% OFF', gradient: ['#1a0000','#2a0000','#3a0000'], decor: 'diagonal' },
  party:   { bg: '#1a002a', primary: '#ff00ff', secondary: '#fff', accent: '#00ffff', heading: 'PARTY TIME', subtitle: 'Tonight We Celebrate', gradient: ['#1a002a','#2d004a','#0a0a2a'], decor: 'dots' },
  sports:  { bg: '#0a0a0a', primary: '#f97316', secondary: '#fff', accent: '#eab308', heading: 'GAME ON', subtitle: 'Championship Series', gradient: ['#0a0a0a','#1a1a0a','#2a2a0a'], decor: 'diagonal' },
  yoga:    { bg: '#0a192f', primary: '#38bdf8', secondary: '#fff', accent: '#bae6fd', heading: 'INNER PEACE', subtitle: 'Find Your Balance', gradient: ['#0a192f','#0c4a6e','#0e7490'], decor: 'circles' },
  course:  { bg: '#0d1117', primary: '#00b4d8', secondary: '#fff', accent: '#90e0ef', heading: 'LEARN & GROW', subtitle: 'Online Course', gradient: ['#0d1117','#161b22','#21262d'], decor: 'grid' },
  education: { bg: '#1e3a5f', primary: '#f59e0b', secondary: '#fff', accent: '#fbbf24', heading: 'EXCELLENCE', subtitle: 'Enroll Now', gradient: ['#1e3a5f','#2d5a8f','#3d7abf'], decor: 'lines' },
  property: { bg: '#0f1f0f', primary: '#22c55e', secondary: '#fff', accent: '#86efac', heading: 'DREAM HOME', subtitle: 'For Sale', gradient: ['#0f1f0f','#1a3a1a','#224530'], decor: 'lines' },
  minimal: { bg: '#ffffff', primary: '#1a1a1a', secondary: '#1a1a1a', accent: '#666', heading: 'LESS IS MORE', subtitle: 'Simplicity Speaks', gradient: ['#ffffff','#f8fafc','#f1f5f9'], decor: 'lines' },
  clean:   { bg: '#ffffff', primary: '#0f172a', secondary: '#0f172a', accent: '#64748b', heading: 'CLARITY', subtitle: 'Clear Design', gradient: ['#ffffff','#f8fafc','#f1f5f9'], decor: 'lines' },
};

/* ─── Smart AI Prompt Analyzer ─── */
function analyzePrompt(raw: string) {
  const p = raw.toLowerCase().trim();
  let theme = { ...THEMES.movie };
  let matchedKey = 'movie';

  // 1. DETECT INDUSTRY/SECTOR
  const industryMap: Array<[string, string]> = [
    ['movie', 'movie'], ['film', 'movie'], ['cinema', 'movie'], ['hollywood', 'movie'], ['blockbuster', 'movie'],
    ['fashion', 'fashion'], ['clothing', 'fashion'], ['apparel', 'fashion'], ['wardrobe', 'fashion'], ['boutique', 'fashion'],
    ['beauty', 'beauty'], ['cosmetics', 'beauty'], ['skincare', 'beauty'], ['makeup', 'beauty'], ['salon', 'beauty'],
    ['fitness', 'fitness'], ['gym', 'fitness'], ['workout', 'fitness'], ['exercise', 'fitness'], ['health', 'fitness'],
    ['music', 'music'], ['concert', 'music'], ['band', 'music'], ['singer', 'music'], ['dj', 'music'], ['album', 'music'],
    ['food', 'food'], ['restaurant', 'food'], ['cafe', 'food'], ['coffee', 'food'], ['bakery', 'food'], ['dining', 'food'],
    ['tech', 'tech'], ['technology', 'tech'], ['software', 'tech'], ['ai', 'tech'], ['robot', 'tech'], ['digital', 'tech'],
    ['startup', 'startup'], ['business', 'startup'], ['entrepreneur', 'startup'], ['launch', 'startup'],
    ['nature', 'nature'], ['outdoor', 'nature'], ['adventure', 'nature'], ['travel', 'nature'], ['hiking', 'nature'],
    ['wedding', 'wedding'], ['bridal', 'wedding'], ['engagement', 'wedding'], ['ceremony', 'wedding'],
    ['luxury', 'luxury'], ['premium', 'luxury'], ['exclusive', 'luxury'], ['vip', 'luxury'], ['highend', 'luxury'],
    ['sale', 'sale'], ['discount', 'sale'], ['offer', 'sale'], ['deal', 'sale'], ['bargain', 'sale'], ['promotion', 'sale'],
    ['party', 'party'], ['event', 'party'], ['celebration', 'party'], ['festival', 'party'], ['nightlife', 'party'],
    ['sports', 'sports'], ['football', 'sports'], ['basketball', 'sports'], ['cricket', 'sports'], ['soccer', 'sports'],
    ['yoga', 'yoga'], ['meditation', 'yoga'], ['wellness', 'yoga'], ['mindfulness', 'yoga'],
    ['education', 'education'], ['school', 'education'], ['university', 'education'], ['course', 'education'], ['learning', 'education'],
    ['property', 'property'], ['realtor', 'property'], ['house', 'property'], ['home', 'property'], ['apartment', 'property'],
    ['cafe', 'cafe'], ['coffee', 'cafe'], ['tea', 'cafe'], ['brew', 'cafe'],
  ];

  for (const [word, key] of industryMap) {
    if (p.includes(word)) { theme = { ...THEMES[key] }; matchedKey = key; break; }
  }

  // 2. DETECT COLORS
  const COLOR_MAP: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
    purple: '#8b5cf6', pink: '#ec4899', orange: '#f97316', black: '#1a1a1a',
    white: '#ffffff', gold: '#ffd700', cyan: '#06b6d4', teal: '#14b8a6',
    navy: '#1e3a5f', coral: '#ff6b6b', lime: '#84cc16', silver: '#c0c0c0',
    bronze: '#cd7f32', maroon: '#800000', magenta: '#ff00ff', indigo: '#4f46e5',
  };

  for (const [color, hex] of Object.entries(COLOR_MAP)) {
    if (p.includes(color)) {
      theme = { ...theme, primary: hex, accent: hex };
      if (['white', 'yellow', 'gold', 'lime', 'cyan', 'silver'].includes(color)) {
        theme = { ...theme, secondary: '#1a1a1a' };
      }
      if (['black', 'navy', 'maroon', 'indigo'].includes(color)) {
        theme = { ...theme, secondary: '#ffffff' };
      }
      break;
    }
  }

  // 3. EXTRACT CUSTOM TEXT (in quotes)
  const quoteMatch = p.match(/["'](.*?)["']/);
  if (quoteMatch) theme = { ...theme, heading: quoteMatch[1].toUpperCase() };

  // 4. EXTRACT SUBTITLE
  const subPatterns = [
    /subtitle[:\s]+["']?(.*?)["']?\s*$/i,
    /tagline[:\s]+["']?(.*?)["']?\s*$/i,
    /tag[:\s]+["']?(.*?)["']?\s*$/i,
  ];
  for (const pattern of subPatterns) {
    const match = p.match(pattern);
    if (match) { theme = { ...theme, subtitle: match[1] }; break; }
  }

  // 5. DETECT STYLE/MOOD
  const styleMap: Record<string, Partial<typeof theme>> = {
    elegant: { bg: '#0a0a0a', gradient: ['#0a0a0a', '#1a1a2e', '#0a0a0a'] },
    modern: { bg: '#0f172a', gradient: ['#0f172a', '#1e293b', '#334155'] },
    vintage: { bg: '#2c1810', gradient: ['#2c1810', '#3d2314', '#4a2c1a'] },
    minimal: { bg: '#ffffff', secondary: '#1a1a1a', gradient: ['#ffffff', '#f8fafc', '#f1f5f9'] },
    bold: { bg: '#0a0a0a', gradient: ['#0a0a0a', '#1a0000', '#0a0a0a'] },
    playful: { bg: '#1a002a', gradient: ['#1a002a', '#2d004a', '#0a0a2a'] },
    professional: { bg: '#0f172a', gradient: ['#0f172a', '#1e293b', '#334155'] },
    luxury: { bg: '#1a1a1a', gradient: ['#1a1a1a', '#2a2a2a', '#0a0a0a'] },
    dark: { bg: '#0a0a0a', gradient: ['#0a0a0a', '#111111', '#1a1a1a'] },
    bright: { bg: '#ffffff', secondary: '#1a1a1a', gradient: ['#ffffff', '#f0f0f0', '#e0e0e0'] },
    warm: { bg: '#2c1810', gradient: ['#2c1810', '#3d2314', '#4a2c1a'] },
    cool: { bg: '#0a192f', gradient: ['#0a192f', '#112240', '#1a3355'] },
  };

  for (const [style, overrides] of Object.entries(styleMap)) {
    if (p.includes(style)) {
      theme = { ...theme, ...overrides };
      break;
    }
  }

  // 6. DETECT EVENT TYPE
  const eventMap: Record<string, { heading: string; subtitle: string }> = {
    launch: { heading: 'LAUNCHING SOON', subtitle: 'Be The First To Know' },
    opening: { heading: 'GRAND OPENING', subtitle: 'Join Us For The Celebration' },
    closing: { heading: 'LAST CHANCE', subtitle: 'Ending Soon' },
    announcement: { heading: 'BIG ANNOUNCEMENT', subtitle: 'Stay Tuned' },
    invitation: { heading: 'YOU\'RE INVITED', subtitle: 'Join Us' },
    deadline: { heading: 'DEADLINE SOON', subtitle: 'Act Now' },
    workshop: { heading: 'WORKSHOP', subtitle: 'Learn Something New' },
    seminar: { heading: 'SEMINAR', subtitle: 'Expert Insights' },
    gala: { heading: 'ANNUAL GALA', subtitle: 'An Evening Of Elegance' },
    expo: { heading: 'EXPO 2026', subtitle: 'Innovation Showcase' },
    summit: { heading: 'SUMMIT', subtitle: 'Industry Leaders Unite' },
    marathon: { heading: 'MARATHON', subtitle: 'Run For A Cause' },
    tournament: { heading: 'TOURNAMENT', subtitle: 'Compete For Glory' },
    premiere: { heading: 'PREMIERE', subtitle: 'First Look' },
    release: { heading: 'NEW RELEASE', subtitle: 'Out Now' },
  };

  for (const [event, texts] of Object.entries(eventMap)) {
    if (p.includes(event)) {
      if (!quoteMatch) theme = { ...theme, heading: texts.heading };
      if (!subPatterns.some(pat => p.match(pat))) theme = { ...theme, subtitle: texts.subtitle };
      break;
    }
  }

  // 7. DETECT DATE/TIME
  const dateMatch = p.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    theme = { ...theme, subtitle: `${month}/${day}/${year}` };
  }

  const timeMatch = p.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?)/i);
  if (timeMatch) {
    theme = { ...theme, subtitle: `${theme.subtitle} • ${timeMatch[1]}` };
  }

  // 8. DETECT LOCATION
  const locationMatch = p.match(/(?:at|in|@)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:on|for|during)|\s*$)/);
  if (locationMatch) {
    theme = { ...theme, subtitle: `${theme.subtitle} • ${locationMatch[1].trim()}` };
  }

  // 9. DETECT PRICE/DISCOUNT
  const priceMatch = p.match(/(\d+)%\s*(?:off|discount)/);
  if (priceMatch) {
    theme = { ...theme, heading: `UP TO ${priceMatch[1]}% OFF`, subtitle: 'Limited Time Offer' };
  }

  const dollarMatch = p.match(/\$(\d+)/);
  if (dollarMatch && matchedKey === 'sale') {
    theme = { ...theme, subtitle: `Starting At $${dollarMatch[1]}` };
  }

  // 10. IF NO THEME MATCHED, USE PROMPT AS HEADING
  const hasTheme = Object.keys(THEMES).some(k => p.includes(k));
  if (!hasTheme && !quoteMatch && p.length > 2 && p.length < 60) {
    theme = { ...theme, heading: p.toUpperCase() };
  }

  // 11. CUSTOM HEADING OVERRIDE (if user typed something specific)
  if (quoteMatch) {
    theme = { ...theme, heading: quoteMatch[1].toUpperCase() };
  } else if (p.length > 3 && p.length < 50 && !hasTheme) {
    // Use the whole prompt as heading if short enough
    theme = { ...theme, heading: p.toUpperCase() };
  }

  return theme;
}

/* ─── Build beautiful poster on canvas ─── */
function buildPoster(c: fabric.Canvas, t: any) {
  c.clear();
  const W = c.getWidth();
  const H = c.getHeight();
  const bg = t.bg || t.bg_color || '#0a0a0a';
  const primary = t.primary || t.primary_color || '#8b5cf6';
  const secondary = t.secondary || t.secondary_color || '#ffffff';
  const accent = t.accent || t.accent_color || primary;
  const heading = t.heading || 'YOUR TITLE';
  const subtitle = t.subtitle || 'Subtitle here';

  // Background
  c.setBackgroundColor(bg, () => {});

  // Gradient overlay bands
  const gradient = t.gradient || [bg, bg, bg];
  c.add(new fabric.Rect({ left: 0, top: 0, width: W, height: H * 0.35, fill: gradient[0] || bg, selectable: false }));
  c.add(new fabric.Rect({ left: 0, top: H * 0.35, width: W, height: H * 0.35, fill: gradient[1] || bg, selectable: false }));
  c.add(new fabric.Rect({ left: 0, top: H * 0.7, width: W, height: H * 0.3, fill: gradient[2] || gradient[1] || bg, selectable: false }));

  // Large decorative circles (top-right)
  c.add(new fabric.Circle({ left: W * 0.6, top: -H * 0.15, radius: W * 0.35, fill: primary + '08', selectable: false }));
  c.add(new fabric.Circle({ left: W * 0.7, top: -H * 0.05, radius: W * 0.25, fill: primary + '06', selectable: false }));

  // Small decorative dots
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 2 + Math.random() * 4;
    c.add(new fabric.Circle({ left: x, top: y, radius: r, fill: primary + '20', selectable: false }));
  }

  // Decorative lines (top)
  c.add(new fabric.Line([W * 0.08, H * 0.08, W * 0.35, H * 0.08], { stroke: primary + '40', strokeWidth: 2, selectable: false }));
  c.add(new fabric.Line([W * 0.08, H * 0.12, W * 0.25, H * 0.12], { stroke: primary + '25', strokeWidth: 1, selectable: false }));

  // Right decorative block
  c.add(new fabric.Rect({ left: W * 0.72, top: H * 0.1, width: W * 0.22, height: H * 0.8, fill: primary + '06', rx: 16, ry: 16, selectable: false }));

  // Small accent shapes
  c.add(new fabric.Circle({ left: W * 0.85, top: H * 0.15, radius: 8, fill: primary + '30', selectable: false }));
  c.add(new fabric.Circle({ left: W * 0.9, top: H * 0.3, radius: 5, fill: accent + '25', selectable: false }));
  c.add(new fabric.Circle({ left: W * 0.88, top: H * 0.85, radius: 12, fill: primary + '15', selectable: false }));

  // Main heading
  c.add(new fabric.Textbox(heading, {
    left: W * 0.08, top: H * 0.22, width: W * 0.62,
    fontSize: Math.min(W * 0.12, 96), fontWeight: 'bold',
    fill: secondary, fontFamily: 'Outfit', textAlign: 'left', lineHeight: 1.05, selectable: true,
  }));

  // Accent bar under heading
  c.add(new fabric.Rect({ left: W * 0.08, top: H * 0.52, width: W * 0.15, height: 6, fill: primary, rx: 3, ry: 3, selectable: false }));

  // Subtitle
  c.add(new fabric.Textbox(subtitle, {
    left: W * 0.08, top: H * 0.57, width: W * 0.55,
    fontSize: Math.min(W * 0.035, 28), fill: primary, fontFamily: 'Outfit', textAlign: 'left', selectable: true,
  }));

  // Description text
  c.add(new fabric.Textbox('Professional design crafted with AI intelligence', {
    left: W * 0.08, top: H * 0.65, width: W * 0.5,
    fontSize: Math.min(W * 0.02, 16), fill: secondary + '60', fontFamily: 'Outfit', textAlign: 'left', selectable: true,
  }));

  // CTA button
  const ctaW = W * 0.24, ctaH = 52, ctaY = H * 0.75;
  c.add(new fabric.Rect({ left: W * 0.08, top: ctaY, width: ctaW, height: ctaH, fill: primary, rx: ctaH / 2, ry: ctaH / 2, selectable: false }));
  c.add(new fabric.Textbox('LEARN MORE', { left: W * 0.08, top: ctaY + 14, width: ctaW, fontSize: 15, fontWeight: 'bold', fill: bg, fontFamily: 'Outfit', textAlign: 'center', selectable: false }));

  // Secondary button
  c.add(new fabric.Rect({ left: W * 0.35, top: ctaY, width: ctaW * 0.8, height: ctaH, fill: 'transparent', stroke: primary + '60', strokeWidth: 2, rx: ctaH / 2, ry: ctaH / 2, selectable: false }));
  c.add(new fabric.Textbox('EXPLORE', { left: W * 0.35, top: ctaY + 14, width: ctaW * 0.8, fontSize: 14, fontWeight: '600', fill: primary, fontFamily: 'Outfit', textAlign: 'center', selectable: false }));

  // Bottom decorative line
  c.add(new fabric.Line([W * 0.08, H * 0.9, W * 0.92, H * 0.9], { stroke: primary + '20', strokeWidth: 1, selectable: false }));

  // Footer branding
  c.add(new fabric.Textbox('TECKSTUDIO', { left: W * 0.08, top: H * 0.92, width: W * 0.3, fontSize: 10, fill: secondary + '30', fontFamily: 'Outfit', selectable: false }));
  c.add(new fabric.Textbox('AI-Powered Design', { left: W * 0.08, top: H * 0.95, width: W * 0.3, fontSize: 8, fill: secondary + '20', fontFamily: 'Outfit', selectable: false }));

  c.renderAll();
  useEditorStore.getState().saveHistory();
}

void analyzePrompt;
void buildPoster;

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export const AIAssistant: React.FC = () => {
  const navigate = useNavigate();
  const initialAiEntryPoint = getInitialAiEntryPoint();
  const initialPrompt = getInitialPrompt();
  const [activeAiTool, setActiveAiTool] = useState<AiEntryPoint>(initialAiEntryPoint || 'poster');
  const [posterPrompt, setPosterPrompt] = useState(initialAiEntryPoint === 'poster' ? initialPrompt : '');
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterStatus, setPosterStatus] = useState<AiStatus | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');
  const [posterResult, setPosterResult] = useState<any>(null);
  const [posterCanvasObjectId, setPosterCanvasObjectId] = useState('');
  const activePosterRequestRef = useRef('');
  const posterAbortRef = useRef<AbortController | null>(null);
  const [editablePosterSpec, setEditablePosterSpec] = useState<PosterSpec | null>(null);
  const [posterSpecTheme, setPosterSpecTheme] = useState<PosterSpecThemeId>('tech-blue');
  const [posterSpecCardCount, setPosterSpecCardCount] = useState(7);
  const [posterSpecLoading, setPosterSpecLoading] = useState(false);
  const [posterSpecSource, setPosterSpecSource] = useState('');
  const [posterAttachmentMenuOpen, setPosterAttachmentMenuOpen] = useState(false);
  const [posterDocuments, setPosterDocuments] = useState<PosterAttachmentFile[]>([]);
  const [posterImages, setPosterImages] = useState<PosterAttachmentImage[]>([]);
  const [replaceImageId, setReplaceImageId] = useState<string | null>(null);

  const [imgPrompt, setImgPrompt] = useState(initialAiEntryPoint === 'image' ? initialPrompt : '');
  const [imgLoading, setImgLoading] = useState(false);
  const [imgStatus, setImgStatus] = useState<AiStatus | null>(null);
  const [imgPreview, setImgPreview] = useState('');
  const [imgResult, setImgResult] = useState<any>(null);
  const [imgCanvasObjectId, setImgCanvasObjectId] = useState('');
  const activeImageRequestRef = useRef('');
  const imageAbortRef = useRef<AbortController | null>(null);

  const [thumbPrompt, setThumbPrompt] = useState(initialAiEntryPoint === 'thumbnail' ? initialPrompt : '');
  const [thumbTitle, setThumbTitle] = useState('');
  const [thumbSubtitle, setThumbSubtitle] = useState('');
  const [thumbPlatform, setThumbPlatform] = useState('youtube');
  const [thumbStyle, setThumbStyle] = useState('Bold and High Contrast');
  const [thumbAspect, setThumbAspect] = useState('16:9');
  const [thumbWidth, setThumbWidth] = useState(1280);
  const [thumbHeight, setThumbHeight] = useState(720);
  const [thumbVariations, setThumbVariations] = useState(1);
  const [thumbReference, setThumbReference] = useState<File | null>(null);
  const [thumbFace, setThumbFace] = useState<File | null>(null);
  const [thumbLogo, setThumbLogo] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [thumbResult, setThumbResult] = useState<any>(null);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbStatus, setThumbStatus] = useState<AiStatus | null>(null);
  const [thumbCanvasObjectId, setThumbCanvasObjectId] = useState('');
  const activeThumbnailRequestRef = useRef('');
  const thumbnailAbortRef = useRef<AbortController | null>(null);

  // AI Chat state
  const [chatMessage, setChatMessage] = useState(initialAiEntryPoint === 'chat' ? initialPrompt : '');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [chatConversationId] = useState(getStableChatConversationId);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState<AiStatus | null>(null);
  const [lastChatPrompt, setLastChatPrompt] = useState('');

  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const thumbReferenceRef = useRef<HTMLInputElement | null>(null);
  const thumbFaceRef = useRef<HTMLInputElement | null>(null);
  const thumbLogoRef = useRef<HTMLInputElement | null>(null);

  const getPosterImageSource = () => {
    const result = posterResult?.result || {};
    return result.imageData || result.imageUrl || posterResult?.poster_url || posterResult?.image_url || posterPreviewUrl || '';
  };

  const debugPosterAction = (action: string, extra: Record<string, unknown> = {}) => {
    const canvas = getCanvas();
    const posterSource = getPosterImageSource();
    console.debug('[Poster Action]', {
      action,
      hasResult: Boolean(posterResult),
      hasImageSource: Boolean(posterSource),
      hasCanvas: Boolean(canvas),
      canvasObjectId: posterCanvasObjectId || null,
      promptLength: posterPrompt.trim().length,
      posterAssetId: posterResult?.asset_id || posterResult?.result?.assetId || null,
      ...extra,
    });
  };

  const findPosterCanvasImage = (canvas: fabric.Canvas, imageSource: string) => {
    const isPosterImage = (object: fabric.Object | null | undefined) => {
      if (!object || object.type !== 'image') return false;
      const objectId = String((object as any).get?.('id') || (object as any).id || '');
      const assetType = String((object as any).get?.('teckstudioAssetType') || (object as any).teckstudioAssetType || '');
      const generatedAssetId = String((object as any).get?.('teckstudioGeneratedAssetId') || (object as any).teckstudioGeneratedAssetId || '');
      const objectSource = getFabricImageSource(object);
      const resultAssetId = String(posterResult?.asset_id || posterResult?.result?.assetId || '');
      return (
        Boolean(posterCanvasObjectId && objectId === posterCanvasObjectId) ||
        Boolean(resultAssetId && generatedAssetId === resultAssetId) ||
        Boolean(imageSource && objectSource === imageSource) ||
        assetType === 'poster'
      );
    };

    const activeObject = canvas.getActiveObject();
    if (isPosterImage(activeObject)) return activeObject as fabric.Image;

    return canvas.getObjects().slice().reverse().find((object) => isPosterImage(object)) as fabric.Image | undefined;
  };

  const findGeneratedCanvasImage = (
    canvas: fabric.Canvas,
    assetType: GeneratedAssetType | 'ai-image' | 'ai-thumbnail',
    imageSource: string,
    objectId: string,
    assetId?: string,
  ) => {
    const acceptedTypes = assetType === 'image'
      ? ['ai-image', 'image']
      : assetType === 'thumbnail'
        ? ['ai-thumbnail', 'thumbnail']
        : [assetType];
    const isGeneratedImage = (object: fabric.Object | null | undefined) => {
      if (!object || object.type !== 'image') return false;
      const candidateObjectId = String((object as any).get?.('id') || (object as any).id || '');
      const candidateAssetType = String((object as any).get?.('teckstudioAssetType') || (object as any).teckstudioAssetType || '');
      const candidateGeneratedAssetId = String((object as any).get?.('teckstudioGeneratedAssetId') || (object as any).teckstudioGeneratedAssetId || '');
      const candidateSource = getFabricImageSource(object) || String((object as any).get?.('teckstudioImageSource') || '');
      return (
        Boolean(objectId && candidateObjectId === objectId) ||
        Boolean(assetId && candidateGeneratedAssetId === assetId) ||
        Boolean(imageSource && candidateSource === imageSource) ||
        acceptedTypes.includes(candidateAssetType)
      );
    };

    const activeObject = canvas.getActiveObject();
    if (isGeneratedImage(activeObject)) return activeObject as fabric.Image;
    return canvas.getObjects().slice().reverse().find((object) => isGeneratedImage(object)) as fabric.Image | undefined;
  };

  const selectGeneratedLayerForEditing = (
    assetType: GeneratedAssetType | 'ai-image' | 'ai-thumbnail',
    imageSource: string,
    objectId: string,
    assetId: string | undefined,
    setStatus: (status: AiStatus) => void,
    successMessage: string,
  ) => {
    const canvas = getCanvas();
    if (!canvas) {
      setStatus({ ok: false, msg: 'Canvas not ready. Open a design first.' });
      return;
    }
    if (!imageSource) {
      setStatus({ ok: false, msg: 'No generated image is available to edit.' });
      return;
    }
    const generatedLayer = findGeneratedCanvasImage(canvas, assetType, imageSource, objectId, assetId);
    if (!generatedLayer) {
      setStatus({ ok: false, msg: 'Generated image layer was not found on the canvas. Generate it again before editing.' });
      return;
    }
    generatedLayer.set({ selectable: true, evented: true });
    canvas.discardActiveObject();
    canvas.setActiveObject(generatedLayer);
    useEditorStore.getState().setSelectedObject(generatedLayer);
    canvas.requestRenderAll();
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'effects' } }));
    setStatus({ ok: true, msg: successMessage });
  };

  const createGeneratedAssetProject = async ({
    assetType,
    imageSource,
    width,
    height,
    title,
    subtitle,
    prompt,
    assetId,
    provider,
  }: {
    assetType: GeneratedAssetType;
    imageSource: string;
    width?: number;
    height?: number;
    title?: string;
    subtitle?: string;
    prompt?: string;
    assetId?: string;
    provider?: string;
  }) => {
    if (!imageSource) throw new Error('No generated image is available to edit.');
    const loadedImage = await loadBrowserImage(imageSource);
    const canvasWidth = Math.max(320, Math.round(width || loadedImage.naturalWidth || 1024));
    const canvasHeight = Math.max(320, Math.round(height || loadedImage.naturalHeight || 1024));
    const imageScale = Math.min(canvasWidth / loadedImage.naturalWidth, canvasHeight / loadedImage.naturalHeight);
    const objectId = () => (window.crypto?.randomUUID?.() ?? `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const objects: any[] = [
      {
        type: 'image',
        version: '5.3.0',
        originX: 'center',
        originY: 'center',
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        width: loadedImage.naturalWidth,
        height: loadedImage.naturalHeight,
        scaleX: imageScale,
        scaleY: imageScale,
        angle: 0,
        opacity: 1,
        visible: true,
        selectable: true,
        evented: true,
        name: `AI ${assetType} image layer`,
        id: objectId(),
        src: imageSource,
        crossOrigin: imageSource.startsWith('data:') ? null : 'anonymous',
      },
    ];

    if (assetType !== 'image' && title?.trim()) {
      objects.push({
        type: 'textbox',
        version: '5.3.0',
        originX: 'left',
        originY: 'top',
        left: canvasWidth * 0.07,
        top: canvasHeight * 0.07,
        width: canvasWidth * 0.86,
        text: title.trim(),
        fontSize: Math.max(32, Math.round(canvasWidth * 0.07)),
        fontFamily: 'Outfit',
        fontWeight: '700',
        fill: '#ffffff',
        textAlign: 'center',
        stroke: 'rgba(0,0,0,0.45)',
        strokeWidth: 2,
        name: `Editable ${assetType} title`,
        id: objectId(),
      });
    }

    if (assetType !== 'image' && subtitle?.trim()) {
      objects.push({
        type: 'textbox',
        version: '5.3.0',
        originX: 'left',
        originY: 'top',
        left: canvasWidth * 0.11,
        top: canvasHeight * 0.82,
        width: canvasWidth * 0.78,
        text: subtitle.trim(),
        fontSize: Math.max(20, Math.round(canvasWidth * 0.035)),
        fontFamily: 'Outfit',
        fontWeight: '600',
        fill: '#ffffff',
        textAlign: 'center',
        stroke: 'rgba(0,0,0,0.35)',
        strokeWidth: 1,
        name: `Editable ${assetType} subtitle`,
        id: objectId(),
      });
    }

    const now = new Date().toISOString();
    const projectId = window.crypto?.randomUUID?.() ?? `proj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const projectName = title?.trim() || `AI ${assetType[0].toUpperCase()}${assetType.slice(1)} Design`;
    const data = JSON.stringify({
      version: '5.3.0',
      objects,
      background: '#000000',
      generationMetadata: {
        assetType,
        prompt,
        createdAt: now,
        editingMode: assetType === 'image' ? 'flattened-image' : 'hybrid-image-plus-editable-text',
      },
    });

    const projectPayload = {
      id: projectId,
      name: projectName,
      data,
      width: canvasWidth,
      height: canvasHeight,
      background_color: '#000000',
      design_type: `ai_${assetType}`,
      generated_asset_id: assetId,
      prompt,
      provider,
    };

    const response = await apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectPayload),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.detail || payload?.error || `Failed to create editable project (${response.status})`);
    }
    const createdProject = payload?.project || payload;
    return { id: createdProject.id || projectId, width: canvasWidth, height: canvasHeight };
  };

  const openGeneratedAssetInEditor = async (asset: {
    assetType: GeneratedAssetType;
    imageSource: string;
    width?: number;
    height?: number;
    title?: string;
    subtitle?: string;
    prompt?: string;
    assetId?: string;
    provider?: string;
  }) => {
    const project = await createGeneratedAssetProject(asset);
    navigate(`/editor/${project.id}`);
  };

  useEffect(() => {
    return () => {
      posterImages.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    };
  }, [posterImages]);

  useEffect(() => {
    let cancelled = false;
    const loadChatHistory = async () => {
      try {
        const response = await apiFetch(`/api/ai/chat/${encodeURIComponent(chatConversationId)}`);
        const data = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(data?.messages) || cancelled) return;
        setChatHistory(data.messages.map((message: any) => ({
          role: message.role === 'assistant' ? 'ai' : 'user',
          text: String(message.content || ''),
        })).filter((message: { text: string }) => message.text.trim()));
      } catch {
        // History loading is non-blocking; send still persists through /api/ai/chat.
      }
    };
    loadChatHistory();
    return () => {
      cancelled = true;
    };
  }, [chatConversationId]);

  useEffect(() => {
    const raw = sessionStorage.getItem('teckstudio_pending_ai_uploads');
    if (!raw) return;
    sessionStorage.removeItem('teckstudio_pending_ai_uploads');

    (async () => {
      try {
        const pendingUploads = JSON.parse(raw) as Array<{ name: string; type: string; size: number; dataUrl: string }>;
        const documents: PosterAttachmentFile[] = [];
        const images: PosterAttachmentImage[] = [];

        for (const upload of pendingUploads) {
          const file = await fileFromDataUrl(upload.name, upload.type, upload.dataUrl);
          const extension = `.${upload.name.split('.').pop()?.toLowerCase() || ''}`;
          if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
            images.push({
              id: createAttachmentId(),
              name: upload.name,
              file,
              size: upload.size,
              kind: 'image',
              previewUrl: URL.createObjectURL(file),
            });
          } else if (['.pdf', '.docx', '.txt'].includes(extension)) {
            documents.push({
              id: createAttachmentId(),
              name: upload.name,
              file,
              size: upload.size,
              kind: 'document',
            });
          }
        }

        if (documents.length > 0) setPosterDocuments((current) => [...current, ...documents]);
        if (images.length > 0) setPosterImages((current) => [...current, ...images]);
      } catch {
        setPosterStatus({ ok: false, msg: 'Unable to restore uploaded files. Please upload them again.' });
      }
    })();
  }, []);

  const acceptDocumentExtensions = '.pdf,.docx,.txt';
  const acceptImageExtensions = 'image/png,image/jpeg,image/jpg,image/webp';

  const addPosterDocuments = (files: FileList | null) => {
    if (!files) return;
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const nextDocuments: PosterAttachmentFile[] = [];
    for (const file of Array.from(files)) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
      if (!allowedExtensions.includes(extension)) {
        setPosterStatus({ ok: false, msg: `Unsupported file type: ${file.name}. Use PDF, DOCX, or TXT.` });
        continue;
      }
      if (file.size > MAX_DOCUMENT_SIZE) {
        setPosterStatus({ ok: false, msg: `${file.name} is too large. Max document size is 10 MB.` });
        continue;
      }
      nextDocuments.push({
        id: createAttachmentId(),
        name: file.name,
        file,
        size: file.size,
        kind: 'document',
      });
    }
    if (nextDocuments.length > 0) {
      setPosterDocuments((current) => [...current, ...nextDocuments]);
      setPosterStatus(null);
    }
  };

  const addPosterImages = (files: FileList | null) => {
    if (!files) return;
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const nextImages: PosterAttachmentImage[] = [];
    const incoming = Array.from(files);
    for (const file of incoming) {
      const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
      if (!allowedExtensions.includes(extension)) {
        setPosterStatus({ ok: false, msg: `Unsupported image type: ${file.name}. Use PNG, JPG, JPEG, or WEBP.` });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setPosterStatus({ ok: false, msg: `${file.name} is too large. Max image size is 12 MB.` });
        continue;
      }
      nextImages.push({
        id: replaceImageId || createAttachmentId(),
        name: file.name,
        file,
        size: file.size,
        kind: 'image',
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (nextImages.length === 0) return;

    setPosterImages((current) => {
      if (replaceImageId) {
        const updated = [...current];
        const replacement = nextImages[0];
        const index = updated.findIndex((attachment) => attachment.id === replaceImageId);
        if (index >= 0) {
          URL.revokeObjectURL(updated[index].previewUrl);
          updated[index] = replacement;
        } else {
          updated.push(replacement);
        }
        return updated;
      }
      return [...current, ...nextImages];
    });

    setReplaceImageId(null);
    setPosterStatus(null);
  };

  const removePosterDocument = (id: string) => {
    setPosterDocuments((current) => current.filter((attachment) => attachment.id !== id));
  };

  const removePosterImage = (id: string) => {
    setPosterImages((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  const applyEditablePosterSpec = (spec: PosterSpec, theme: PosterSpecThemeId = posterSpecTheme) => {
    const canvas = getCanvas();
    if (!canvas) {
      throw new Error('Canvas not ready. Open a design first.');
    }

    const normalized = normalizePosterSpec(spec, theme);
    const result = renderPosterSpecToCanvas(canvas, normalized, theme);
    useEditorStore.getState().setProjectName(normalized.title || 'Editable AI Poster');
    useEditorStore.getState().saveHistory();
    return result;
  };

  const handleGenerateEditablePoster = async () => {
    if (!posterPrompt.trim()) return;
    if (classifyPosterGenerationMode(posterPrompt) === 'single_image_poster') {
      setPosterStatus({
        ok: false,
        msg: 'This is a single visual poster request. Use “Generate AI Poster Image” for a real generated poster image.',
      });
      return;
    }
    setPosterSpecLoading(true);
    setPosterStatus(null);

    try {
      const response = await apiFetch('/api/ai/generate-poster-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: posterPrompt.trim(),
          posterType: 'numbered-cards',
          theme: posterSpecTheme,
          style: 'professional technical poster',
          cardCount: posterSpecCardCount,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.posterSpec) {
        throw new Error(payload?.detail || payload?.error || `PosterSpec generation failed (${response.status})`);
      }

      const normalized = normalizePosterSpec(payload.posterSpec as PosterSpec, posterSpecTheme);
      const renderResult = applyEditablePosterSpec(normalized, posterSpecTheme);
      setEditablePosterSpec(renderResult.spec);
      setPosterSpecSource(String(payload.source || 'poster-spec'));
      setPosterPreviewUrl('');
      setPosterResult(null);
      setPosterCanvasObjectId('');
      const usedLocalPosterSpecFallback = Boolean(payload.validation?.fallbackUsed);
      setPosterStatus({
        ok: !usedLocalPosterSpecFallback,
        msg: usedLocalPosterSpecFallback
          ? `AI service is temporarily unavailable. Rendered an editable draft instead (${renderResult.objectCount} editable objects).`
          : `Editable poster rendered with ${payload.source || 'PosterSpec'} (${renderResult.objectCount} editable objects).`,
      });
    } catch (error) {
      setPosterStatus({
        ok: false,
        msg: error instanceof Error ? error.message : 'Editable poster generation failed.',
      });
    } finally {
      setPosterSpecLoading(false);
    }
  };

  const updateEditablePosterSpec = (updater: (current: PosterSpec) => PosterSpec) => {
    if (!editablePosterSpec) return;
    try {
      const nextSpec = normalizePosterSpec(updater(editablePosterSpec), posterSpecTheme);
      const renderResult = applyEditablePosterSpec(nextSpec, posterSpecTheme);
      setEditablePosterSpec(renderResult.spec);
      setPosterStatus({ ok: true, msg: 'Editable poster updated on canvas.' });
    } catch (error) {
      setPosterStatus({
        ok: false,
        msg: error instanceof Error ? error.message : 'Unable to update editable poster.',
      });
    }
  };

  const handlePosterSpecThemeChange = (theme: PosterSpecThemeId) => {
    setPosterSpecTheme(theme);
    if (!editablePosterSpec) return;
    try {
      const nextSpec = normalizePosterSpec({ ...editablePosterSpec, theme }, theme);
      const renderResult = applyEditablePosterSpec(nextSpec, theme);
      setEditablePosterSpec(renderResult.spec);
      setPosterStatus({ ok: true, msg: `${POSTER_SPEC_THEMES.find((item) => item.id === theme)?.label || 'Theme'} applied.` });
    } catch (error) {
      setPosterStatus({
        ok: false,
        msg: error instanceof Error ? error.message : 'Unable to apply poster theme.',
      });
    }
  };

  const handleRerenderEditablePosterSpec = () => {
    if (!editablePosterSpec) return;
    try {
      applyEditablePosterSpec(editablePosterSpec, posterSpecTheme);
      setPosterStatus({ ok: true, msg: 'Editable poster re-rendered on canvas.' });
    } catch (error) {
      setPosterStatus({
        ok: false,
        msg: error instanceof Error ? error.message : 'Unable to re-render editable poster.',
      });
    }
  };

  /* ━━━ POSTER GENERATOR (AI Image-Based) ━━━ */
  const handleGeneratePoster = async () => {
    const submittedPrompt = posterPrompt.trim();
    if (!submittedPrompt || posterLoading) return;

    const requestId = createAttachmentId();
    const controller = new AbortController();
    const previousController = posterAbortRef.current;
    activePosterRequestRef.current = requestId;
    posterAbortRef.current = controller;
    previousController?.abort();

    setPosterLoading(true);
    setPosterStatus(null);
    setPosterResult(null);
    setPosterPreviewUrl('');
    setPosterCanvasObjectId('');

    const canvas = getCanvas();
    const isRegeneration = Boolean(getPosterImageSource());
    debugPosterAction(isRegeneration ? 'regenerate-start' : 'generate-start', {
      requestId,
      hasPrompt: Boolean(submittedPrompt),
      canvasWidth: canvas?.getWidth() || null,
      canvasHeight: canvas?.getHeight() || null,
    });
    if (!canvas) {
      setPosterLoading(false);
      setPosterStatus({ ok: false, msg: 'Canvas not ready. Open a design first.' });
      debugPosterAction(isRegeneration ? 'regenerate-error' : 'generate-error', { reason: 'canvas-not-ready' });
      return;
    }

    try {
      setPosterStatus({ ok: false, msg: 'Analyzing your prompt & generating AI image...' });

      const formData = new FormData();
      formData.append('request_id', requestId);
      formData.append('prompt', submittedPrompt);
      formData.append('style', 'auto');
      formData.append('negative_prompt', 'generic template, hard-coded poster title, unrelated placeholder text, UI mockup, random buttons, platform branding');
      formData.append('quality', 'high');
      formData.append('output_count', '1');
      formData.append('width', String(canvas.getWidth()));
      formData.append('height', String(canvas.getHeight()));
      formData.append('aspect_ratio', canvas.getWidth() >= canvas.getHeight() ? '16:9' : '4:5');
      const persistedProjectId = getPersistedProjectId();
      if (persistedProjectId) formData.append('project_id', persistedProjectId);
      posterDocuments.forEach((attachment) => {
        formData.append('documents', attachment.file, attachment.name);
        formData.append('uploaded_files', attachment.file, attachment.name);
      });
      posterImages.forEach((attachment) => {
        formData.append('images', attachment.file, attachment.name);
        formData.append('reference_images', attachment.file, attachment.name);
      });

      const response = await apiFetch('/api/ai/posters/generate', {
        method: 'POST',
        body: formData,
        timeoutMs: 120000,
        signal: controller.signal,
      });
      if (activePosterRequestRef.current !== requestId) return;

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const error = new Error(formatAiApiError(errorPayload, `Poster generation failed (${response.status})`));
        throw error;
      }

      const result = await response.json();
      if (activePosterRequestRef.current !== requestId) return;
      if (result.request_id && result.request_id !== requestId) return;
      if (!result.success) throw new Error('Generation failed');

      const { design, image_url, poster_url, provider } = result;
      const fallbackUsed = Boolean(result.fallbackUsed ?? result.fallback_used);
      const productionQuality = Boolean(result.productionQuality);
      if (fallbackUsed || !productionQuality) {
        throw new Error('The AI image providers did not return a production-quality poster. Your existing canvas was not changed.');
      }
      const source = result.source || provider || 'unknown';
      const previewUrl = result.result?.imageData || result.result?.imageUrl || poster_url || image_url || '';
      if (!previewUrl) throw new Error('Poster image missing from backend response');

      const W = canvas.getWidth();
      const H = canvas.getHeight();
      const layerName = design?.title || 'AI generated poster';
      const objectId = `poster_${createAttachmentId()}`;
      const generatedAssetId = result.asset_id || result.result?.assetId || '';

      setPosterStatus({ ok: false, msg: 'Validating generated poster image...' });
      await loadBrowserImage(previewUrl);
      if (activePosterRequestRef.current !== requestId) return;
      setPosterStatus({ ok: false, msg: 'Loading generated poster into canvas...' });

      await new Promise<void>((resolve, reject) => {
        fabric.Image.fromURL(previewUrl, (img) => {
          if (!img || !img.width || !img.height) {
            reject(new Error('Generated poster image could not be loaded'));
            return;
          }

          const scale = Math.max(W / (img.width || W), H / (img.height || H));
          canvas.clear();
          canvas.setBackgroundColor('#000000', () => {});
          img.set({
            left: W / 2,
            top: H / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            evented: true,
            name: layerName,
            id: objectId,
            teckstudioAssetType: 'poster',
            teckstudioImageSource: previewUrl,
            teckstudioGeneratedAssetId: generatedAssetId,
            teckstudioPrompt: submittedPrompt,
            teckstudioRequestId: requestId,
            teckstudioGenerationId: result.generation_id || result.result?.generationId || generatedAssetId,
          } as any);
          canvas.add(img);
          canvas.setActiveObject(img);
          useEditorStore.getState().setSelectedObject(img);
          canvas.renderAll();
          useEditorStore.getState().saveHistory();
          resolve();
        }, { crossOrigin: 'anonymous' });
      });

      if (activePosterRequestRef.current !== requestId) return;
      setPosterResult(result);
      setPosterPreviewUrl(previewUrl);
      setPosterCanvasObjectId(objectId);
      setPosterStatus({
        ok: true,
        msg: `Poster generated with ${source} and added as an image layer.`
      });
      debugPosterAction(isRegeneration ? 'regenerate-success' : 'generate-success', {
        source,
        fallbackUsed,
        productionQuality,
        objectId,
        imageSourceLength: previewUrl.length,
      });

      // Auto-save after the generated poster image has been rendered
      (async () => {
        try {
          const token = localStorage.getItem('teckstudio_auth_token');
          if (token && !token.startsWith('offline_')) {
            await apiFetch('/api/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: layerName, description: submittedPrompt, data: JSON.stringify(canvas.toJSON(['id', 'name'])), width: W, height: H, tags: submittedPrompt })
            });
          }
        } catch { /* non-critical */ }
      })();

    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || activePosterRequestRef.current !== requestId) return;
      console.error('Poster error:', err);
      setPosterResult(null);
      setPosterPreviewUrl('');
      setPosterCanvasObjectId('');
      setPosterStatus({
        ok: false,
        msg: err instanceof Error ? err.message : 'Poster generation failed. No template fallback was used.',
      });
      debugPosterAction(isRegeneration ? 'regenerate-error' : 'generate-error', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (activePosterRequestRef.current === requestId) {
        setPosterLoading(false);
        posterAbortRef.current = null;
      }
    }
  };

  /* ━━━ AI CHAT ━━━ */
  const handleChat = async (retryMessage?: string) => {
    const userMsg = (retryMessage || chatMessage).trim();
    if (!userMsg || chatLoading) return;
    const requestId = createAttachmentId();
    const messageId = createAttachmentId();
    const nextHistory: Array<{ role: 'user' | 'ai'; text: string }> = [...chatHistory, { role: 'user', text: userMsg }];
    setChatMessage('');
    setChatSuggestions([]);
    setChatStatus(null);
    setChatHistory(nextHistory);
    setLastChatPrompt(userMsg);
    setChatLoading(true);

    try {
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 60000,
        body: JSON.stringify({
          message: userMsg,
          request_id: requestId,
          message_id: messageId,
          provider: 'auto',
          stream: false,
          context: 'poster_design',
          conversation_id: chatConversationId,
          project_id: getPersistedProjectId(),
          history: chatHistory.slice(-10).map((item) => ({
            role: item.role === 'ai' ? 'assistant' : 'user',
            content: item.text,
          })),
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantReply = typeof data.message === 'string' ? data.message : data.reply;
        if (!assistantReply || typeof assistantReply !== 'string') {
          throw new Error('Backend returned an empty chat response');
        }
        setChatHistory(prev => [...prev, { role: 'ai', text: assistantReply }]);
        setChatStatus({
          ok: true,
          msg: `AI Chat responded using ${data.provider || data.source || 'configured provider'}.`,
          requestId: data.request_id || requestId,
        });
        if (Array.isArray(data.suggestions)) {
          setChatSuggestions(data.suggestions.filter((suggestion: unknown) => typeof suggestion === 'string' && suggestion.trim()).slice(0, 4));
        }
      } else {
        const payload = await response.json().catch(() => null);
        const error = new Error(formatAiApiError(payload, `Chat request failed with status ${response.status}`)) as Error & { requestId?: string };
        (error as Error & { requestId?: string }).requestId = payload?.detail?.request_id || requestId;
        throw error;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI Chat is unavailable. Please try again.';
      setChatStatus({
        ok: false,
        msg: message,
        requestId: (e as { requestId?: string })?.requestId || requestId,
      });
      setChatSuggestions([
        'Try again',
        'Ask for a layout critique',
        'Ask for prompt improvements',
        'Ask for color suggestions',
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ━━━ IMAGE GENERATOR ━━━ */
  const handleGenerateImage = async () => {
    const submittedPrompt = imgPrompt.trim();
    if (!submittedPrompt || imgLoading) return;
    const canvas = getCanvas();
    if (!canvas) { setImgStatus({ ok: false, msg: 'Canvas not ready.' }); return; }

    const requestId = createAttachmentId();
    const controller = new AbortController();
    const previousController = imageAbortRef.current;
    activeImageRequestRef.current = requestId;
    imageAbortRef.current = controller;
    previousController?.abort();

    setImgLoading(true);
    setImgStatus({ ok: false, msg: 'Generating AI image...' });
    setImgResult(null);
    setImgPreview('');
    setImgCanvasObjectId('');

    try {
      const response = await apiFetch('/api/ai/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 140000,
        signal: controller.signal,
        body: JSON.stringify({
          request_id: requestId,
          prompt: submittedPrompt,
          width: 1024,
          height: 1024,
          aspect_ratio: '1:1',
          style: 'auto',
          variations: 1,
          enhance_prompt: true,
          project_id: getPersistedProjectId(),
        })
      });
      if (activeImageRequestRef.current !== requestId) return;

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(formatAiApiError(data, `Image request failed with status ${response.status}`));
      }
      if (data.request_id && data.request_id !== requestId) return;
      if (data.fallbackUsed || !data.productionQuality) {
        throw new Error('No real AI image provider returned a production-quality image. Your canvas was not changed.');
      }

      const url = data.result?.imageData || data.result?.imageUrl || data.image_url || data.url || '';
      if (!url) throw new Error('Backend did not return a persisted image URL');
      const source = data.source || data.provider || 'AI provider';

      setImgStatus({ ok: false, msg: 'Validating generated image...' });
      await loadBrowserImage(url);
      if (activeImageRequestRef.current !== requestId) return;

      setImgStatus({ ok: false, msg: 'Adding generated image to canvas...' });
      const objectId = `ai_image_${createAttachmentId()}`;
      await new Promise<void>((resolve, reject) => {
        fabric.Image.fromURL(url, (img) => {
          if (!img || !img.width || !img.height) {
            reject(new Error('Generated image could not be loaded into the canvas.'));
            return;
          }
          const maxDim = Math.min(canvas.getWidth() * 0.6, 400);
          const scale = Math.min(maxDim / (img.width || 512), maxDim / (img.height || 512), 1);
          img.set({
            left: canvas.getWidth() / 2 - ((img.width || 512) * scale) / 2,
            top: canvas.getHeight() / 2 - ((img.height || 512) * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            name: 'AI generated image',
            id: objectId,
            teckstudioAssetType: 'ai-image',
            teckstudioImageSource: url,
            teckstudioGeneratedAssetId: data.generation_id || data.result?.generationId || data.asset_id,
            teckstudioPrompt: submittedPrompt,
            teckstudioRequestId: requestId,
            teckstudioGenerationId: data.generation_id || data.result?.generationId || data.asset_id,
            teckstudioProvider: source,
          } as any);
          canvas.add(img);
          canvas.setActiveObject(img);
          useEditorStore.getState().setSelectedObject(img);
          canvas.renderAll();
          useEditorStore.getState().saveHistory();
          resolve();
        }, { crossOrigin: url.startsWith('data:') ? undefined : 'anonymous' });
      });
      if (activeImageRequestRef.current !== requestId) return;

      setImgResult(data);
      setImgPreview(url);
      setImgCanvasObjectId(objectId);
      setImgStatus({ ok: true, msg: `AI image generated (${source}) and added to the canvas.` });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError' || activeImageRequestRef.current !== requestId) return;
      setImgResult(null);
      setImgPreview('');
      setImgCanvasObjectId('');
      setImgStatus({ ok: false, msg: e instanceof Error ? e.message : 'AI image generation failed.' });
    } finally {
      if (activeImageRequestRef.current === requestId) {
        setImgLoading(false);
        imageAbortRef.current = null;
      }
    }
  };

  const applyThumbnailPlatform = (platformId: string) => {
    const preset = thumbnailPlatforms.find((item) => item.id === platformId) || thumbnailPlatforms[0];
    setThumbPlatform(preset.id);
    setThumbAspect(preset.aspect);
    if (preset.id !== 'custom') {
      setThumbWidth(preset.width);
      setThumbHeight(preset.height);
    }
  };

  const insertThumbnailIntoCanvas = async (
    imageUrl: string,
    layerName: string,
    targetWidth: number,
    targetHeight: number,
    metadata: Record<string, unknown> = {},
  ) => {
    const canvas = getCanvas();
    if (!canvas) {
      throw new Error('Canvas not ready. Open a design first.');
    }
    const loadedImage = await loadBrowserImage(imageUrl);
    if (targetWidth <= 0 || targetHeight <= 0) {
      throw new Error('Thumbnail dimensions are invalid.');
    }
    const objectId = `ai_thumbnail_${createAttachmentId()}`;
    await new Promise<void>((resolve, reject) => {
      fabric.Image.fromURL(imageUrl, (img) => {
        if (!img || !img.width || !img.height) {
          reject(new Error('Thumbnail image could not be loaded into canvas'));
          return;
        }
        canvas.getObjects().forEach((object) => {
          if ((object as any).teckstudioAssetType === 'ai-thumbnail') {
            canvas.remove(object);
          }
        });
        canvas.setDimensions({ width: targetWidth, height: targetHeight });
        const scale = Math.min(targetWidth / loadedImage.naturalWidth, targetHeight / loadedImage.naturalHeight);
        img.set({
          left: targetWidth / 2,
          top: targetHeight / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          evented: true,
          name: layerName,
          id: objectId,
          teckstudioAssetType: 'ai-thumbnail',
          teckstudioImageSource: imageUrl,
          teckstudioGeneratedAssetId: String(metadata.generationId || metadata.assetId || ''),
          teckstudioPrompt: String(metadata.prompt || ''),
          teckstudioRequestId: String(metadata.requestId || ''),
          teckstudioGenerationId: String(metadata.generationId || metadata.assetId || ''),
          teckstudioProvider: String(metadata.provider || ''),
          teckstudioGeneration: metadata,
        } as any);
        canvas.add(img);
        canvas.setActiveObject(img);
        useEditorStore.getState().setSelectedObject(img);
        canvas.renderAll();
        useEditorStore.getState().saveHistory();
        resolve();
      }, { crossOrigin: imageUrl.startsWith('data:') ? undefined : 'anonymous' });
    });
    return objectId;
  };

  const handleGenerateThumbnail = async () => {
    const submittedPrompt = thumbPrompt.trim();
    if (!submittedPrompt || thumbLoading) return;

    const requestId = createAttachmentId();
    const controller = new AbortController();
    const previousController = thumbnailAbortRef.current;
    activeThumbnailRequestRef.current = requestId;
    thumbnailAbortRef.current = controller;
    previousController?.abort();

    const requestedWidth = Number(thumbWidth) || 1280;
    const requestedHeight = Number(thumbHeight) || 720;
    setThumbLoading(true);
    setThumbResult(null);
    setThumbPreview('');
    setThumbCanvasObjectId('');
    setThumbStatus({ ok: false, msg: 'Generating AI thumbnail...' });

    try {
      const formData = new FormData();
      formData.append('request_id', requestId);
      formData.append('prompt', submittedPrompt);
      formData.append('title', thumbTitle.trim());
      formData.append('subtitle', thumbSubtitle.trim());
      formData.append('platform', thumbPlatform);
      formData.append('style', thumbStyle);
      formData.append('aspect_ratio', thumbAspect);
      formData.append('width', String(requestedWidth));
      formData.append('height', String(requestedHeight));
      formData.append('quality', 'high');
      formData.append('output_count', String(thumbVariations));
      formData.append('enhance_prompt', 'true');
      const persistedProjectId = getPersistedProjectId();
      if (persistedProjectId) formData.append('project_id', persistedProjectId);
      if (thumbReference) formData.append('reference_images', thumbReference, thumbReference.name);
      if (thumbFace) formData.append('face_image', thumbFace, thumbFace.name);
      if (thumbLogo) formData.append('logo', thumbLogo, thumbLogo.name);

      const response = await apiFetch('/api/ai/thumbnails/generate', {
        method: 'POST',
        body: formData,
        timeoutMs: 140000,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (activeThumbnailRequestRef.current !== requestId) return;
      if (!response.ok || !data?.success) {
        throw new Error(formatAiApiError(data, `Thumbnail request failed with status ${response.status}`));
      }
      if (data.request_id && data.request_id !== requestId) return;

      if (data.fallbackUsed || !data.productionQuality) {
        throw new Error('No real AI image provider returned a production-quality thumbnail. Your canvas was not changed.');
      }

      const imageUrl = data.thumbnail_url || data.image_url || data.result?.imageData || data.result?.imageUrl;
      if (!imageUrl) throw new Error('Thumbnail image missing from backend response');
      const resultWidth = Number(data.width || data.result?.width || data.design?.width || requestedWidth);
      const resultHeight = Number(data.height || data.result?.height || data.design?.height || requestedHeight);
      if (resultWidth !== requestedWidth || resultHeight !== requestedHeight) {
        throw new Error(`Thumbnail dimensions mismatch. Expected ${requestedWidth}×${requestedHeight}, received ${resultWidth}×${resultHeight}.`);
      }

      setThumbStatus({ ok: false, msg: 'Validating thumbnail image...' });
      const loadedImage = await loadBrowserImage(imageUrl);
      if (activeThumbnailRequestRef.current !== requestId) return;
      if (loadedImage.naturalWidth !== requestedWidth || loadedImage.naturalHeight !== requestedHeight) {
        throw new Error(`Browser loaded ${loadedImage.naturalWidth}×${loadedImage.naturalHeight}, expected ${requestedWidth}×${requestedHeight}.`);
      }

      setThumbStatus({ ok: false, msg: 'Adding thumbnail to editor canvas...' });
      const objectId = await insertThumbnailIntoCanvas(
        imageUrl,
        thumbTitle || data.design?.title || 'AI generated thumbnail',
        requestedWidth,
        requestedHeight,
        {
          requestId,
          generationId: data.generation_id || data.result?.generationId || data.asset_id,
          assetId: data.asset_id || data.result?.assetId,
          prompt: submittedPrompt,
          provider: data.source || data.provider || 'unknown',
        },
      );
      if (activeThumbnailRequestRef.current !== requestId) return;
      setThumbResult(data);
      setThumbPreview(imageUrl);
      setThumbCanvasObjectId(objectId);
      setThumbStatus({
        ok: true,
        msg: `Thumbnail generated with ${data.source || data.provider || 'AI provider'} and added to the editor.`,
      });
    } catch (error) {
      if (activeThumbnailRequestRef.current !== requestId) return;
      setThumbResult(null);
      setThumbPreview('');
      setThumbCanvasObjectId('');
      setThumbStatus({ ok: false, msg: error instanceof Error ? error.message : 'Thumbnail generation failed.' });
    } finally {
      if (activeThumbnailRequestRef.current === requestId) {
        setThumbLoading(false);
        thumbnailAbortRef.current = null;
      }
    }
  };

  const downloadGeneratedAsset = async (imageSource: string, fileName: string) => {
    if (!imageSource) throw new Error('No generated image is available to download.');
    if (imageSource.startsWith('data:')) {
      triggerBrowserDownload(imageSource, fileName);
      return;
    }

    const response = await fetch(imageSource, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Generated image download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error('Generated image download returned empty data.');
    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerBrowserDownload(objectUrl, fileName);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  };

  const handleDownloadPoster = async () => {
    const posterSource = getPosterImageSource();
    debugPosterAction('download-start', { imageSourceLength: posterSource.length });
    try {
      await downloadGeneratedAsset(posterSource, `teckstudio-poster-${Date.now()}.png`);
      setPosterStatus({ ok: true, msg: 'Poster download started.' });
      debugPosterAction('download-success', { imageSourceLength: posterSource.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Poster download failed.';
      setPosterStatus({ ok: false, msg: message });
      debugPosterAction('download-error', { error: message });
    }
  };

  const handleDownloadImage = async () => {
    try {
      await downloadGeneratedAsset(imgPreview, `teckstudio-image-${Date.now()}.png`);
    } catch (error) {
      setImgStatus({ ok: false, msg: error instanceof Error ? error.message : 'Image download failed.' });
    }
  };

  const handleDownloadThumbnail = async () => {
    try {
      await downloadGeneratedAsset(thumbPreview, `teckstudio-thumbnail-${Date.now()}.jpg`);
    } catch (error) {
      setThumbStatus({ ok: false, msg: error instanceof Error ? error.message : 'Thumbnail download failed.' });
    }
  };

  const handleEditImage = () => {
    const src = imgResult?.result?.imageData || imgResult?.result?.imageUrl || imgResult?.url || imgPreview;
    selectGeneratedLayerForEditing(
      'ai-image',
      src,
      imgCanvasObjectId,
      imgResult?.asset_id || imgResult?.result?.assetId,
      setImgStatus,
      'Generated image layer selected. Image editing controls are open in Effects.',
    );
  };

  const handleOpenImageInEditor = async () => {
    try {
      const src = imgResult?.result?.imageData || imgResult?.result?.imageUrl || imgResult?.url || imgPreview;
      await openGeneratedAssetInEditor({
        assetType: 'image',
        imageSource: src,
        width: imgResult?.result?.width || imgResult?.width || 1024,
        height: imgResult?.result?.height || imgResult?.height || 1024,
        title: 'AI Image Design',
        prompt: imgPrompt,
        assetId: imgResult?.asset_id || imgResult?.result?.assetId,
        provider: imgResult?.source,
      });
    } catch (error) {
      setImgStatus({ ok: false, msg: error instanceof Error ? error.message : 'Failed to open generated image in editor.' });
    }
  };

  const handleOpenPosterInEditor = async () => {
    try {
      const result = posterResult?.result || {};
      const src = getPosterImageSource();
      debugPosterAction('open-in-editor-start', {
        targetWidth: result.width || posterResult?.design?.width || 1024,
        targetHeight: result.height || posterResult?.design?.height || 1024,
      });
      await openGeneratedAssetInEditor({
        assetType: 'poster',
        imageSource: src,
        width: result.width || posterResult?.design?.width || 1024,
        height: result.height || posterResult?.design?.height || 1024,
        title: posterResult?.design?.title || 'AI Poster',
        subtitle: posterResult?.design?.style ? `${posterResult.design.style} poster` : '',
        prompt: posterPrompt,
        assetId: posterResult?.asset_id || posterResult?.result?.assetId,
        provider: posterResult?.provider || posterResult?.source,
      });
      debugPosterAction('open-in-editor-success', { imageSourceLength: src.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open poster in editor.';
      setPosterStatus({ ok: false, msg: message });
      debugPosterAction('open-in-editor-error', { error: message });
    }
  };

  const handleEditPoster = () => {
    const canvas = getCanvas();
    const posterSource = getPosterImageSource();
    debugPosterAction('edit-start', {
      activeObjectType: canvas?.getActiveObject()?.type || null,
      imageSourceLength: posterSource.length,
    });

    if (!canvas) {
      setPosterStatus({ ok: false, msg: 'Canvas not ready. Open a design first.' });
      debugPosterAction('edit-error', { reason: 'canvas-not-ready' });
      return;
    }

    if (!posterSource) {
      setPosterStatus({ ok: false, msg: 'No generated poster image is available to edit.' });
      debugPosterAction('edit-error', { reason: 'missing-image-source' });
      return;
    }

    const posterLayer = findPosterCanvasImage(canvas, posterSource);
    if (!posterLayer) {
      setPosterStatus({ ok: false, msg: 'Generated poster layer was not found on the canvas. Generate the poster again before editing.' });
      debugPosterAction('edit-error', { reason: 'poster-layer-not-found' });
      return;
    }

    posterLayer.set({ selectable: true, evented: true });
    canvas.discardActiveObject();
    canvas.setActiveObject(posterLayer);
    useEditorStore.getState().setSelectedObject(posterLayer);
    canvas.requestRenderAll();
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'effects' } }));
    setPosterStatus({ ok: true, msg: 'Poster layer selected. Image editing controls are open in Effects.' });
    debugPosterAction('edit-success', {
      selectedObjectId: (posterLayer as any).get?.('id') || (posterLayer as any).id || null,
      selectedObjectType: posterLayer.type,
    });
  };

  const handleRegeneratePoster = () => {
    debugPosterAction('regenerate-click', { hasPrompt: Boolean(posterPrompt.trim()) });
    void handleGeneratePoster();
  };

  const handleEditThumbnail = () => {
    const result = thumbResult?.result || {};
    const src = result.imageData || result.imageUrl || thumbResult?.thumbnail_url || thumbResult?.image_url || thumbPreview;
    selectGeneratedLayerForEditing(
      'ai-thumbnail',
      src,
      thumbCanvasObjectId,
      thumbResult?.asset_id || thumbResult?.result?.assetId,
      setThumbStatus,
      'Generated thumbnail layer selected. Image editing controls are open in Effects.',
    );
  };

  const handleOpenThumbnailInEditor = async () => {
    try {
      const result = thumbResult?.result || {};
      const src = result.imageData || result.imageUrl || thumbResult?.thumbnail_url || thumbResult?.image_url || thumbPreview;
      await openGeneratedAssetInEditor({
        assetType: 'thumbnail',
        imageSource: src,
        width: result.width || thumbResult?.design?.width || thumbWidth,
        height: result.height || thumbResult?.design?.height || thumbHeight,
        title: thumbTitle || thumbResult?.design?.title || 'AI Thumbnail',
        subtitle: thumbSubtitle || thumbResult?.design?.subtitle || '',
        prompt: thumbPrompt,
        assetId: thumbResult?.asset_id || thumbResult?.result?.assetId,
        provider: thumbResult?.provider || thumbResult?.source,
      });
    } catch (error) {
      setThumbStatus({ ok: false, msg: error instanceof Error ? error.message : 'Failed to open thumbnail in editor.' });
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pr-1 pb-10">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-cyan-500/10 p-4 shadow-lg shadow-violet-500/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
              <Sparkles className="w-3 h-3" />
              AI Studio
            </div>
            <h2 className="mt-3 text-lg font-bold text-white">Four core AI tools, one workspace</h2>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-zinc-300">
              Use chat for direction, generate posters, thumbnails, or standalone images without leaving the editor.
            </p>
          </div>
          <div className="hidden sm:flex flex-col gap-1.5 text-[10px] text-zinc-400">
            {[
              { id: 'chat' as const, label: 'AI Chat', icon: Sparkles },
              { id: 'poster' as const, label: 'Poster', icon: Wand2 },
              { id: 'thumbnail' as const, label: 'Thumbnail', icon: ImagePlus },
              { id: 'image' as const, label: 'Image', icon: ImagePlus },
            ].map((tool) => {
              const Icon = tool.icon;
              const active = activeAiTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveAiTool(tool.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-left transition-colors ${
                    active
                      ? 'border-violet-400/30 bg-violet-500/15 text-violet-100'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1 sm:hidden">
        {[
          { id: 'chat' as const, label: 'Chat', icon: Sparkles },
          { id: 'poster' as const, label: 'Poster', icon: Wand2 },
          { id: 'thumbnail' as const, label: 'Thumb', icon: ImagePlus },
          { id: 'image' as const, label: 'Image', icon: ImagePlus },
        ].map((tool) => {
          const Icon = tool.icon;
          const active = activeAiTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveAiTool(tool.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors ${
                active ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tool.label}
            </button>
          );
        })}
      </div>

      {activeAiTool === 'chat' && (
      <Section title="AI Chat" icon={<Sparkles className="w-4 h-4" />} defaultOpen={true} accentFrom="from-violet-500/15">
        <p className="text-[10px] text-zinc-400">Ask for layout ideas, poster concepts, image prompts, or design feedback.</p>

        {chatStatus && (
          <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
            chatStatus.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}>
            {chatStatus.ok ? <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span className="min-w-0 flex-1">
              {chatStatus.msg}
              {chatStatus.requestId && (
                <span className={`mt-1 block text-[9px] ${chatStatus.ok ? 'text-emerald-100/70' : 'text-rose-100/70'}`}>Request ID: {chatStatus.requestId}</span>
              )}
              {!chatStatus.ok && lastChatPrompt && (
                <button
                  type="button"
                  onClick={() => handleChat(lastChatPrompt)}
                  disabled={chatLoading}
                  className="mt-2 rounded-lg border border-rose-300/30 bg-black/20 px-2 py-1 text-[9px] font-semibold text-rose-100 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retry
                </button>
              )}
            </span>
          </div>
        )}

        {chatHistory.length > 0 && (
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-sm bg-violet-600/25 text-violet-100 border border-violet-500/20'
                    : 'rounded-bl-sm bg-zinc-900 text-zinc-200 border border-zinc-800'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-zinc-800 bg-zinc-950/80 px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask about design, copy, or layout..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !chatLoading) {
                e.preventDefault();
                handleChat();
              }
            }}
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={() => handleChat()}
            disabled={!chatMessage.trim() || chatLoading}
            className="rounded-xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-[10px] font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>

        {chatSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {chatSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setChatMessage(suggestion)}
                className="rounded-md border border-zinc-800 bg-zinc-800/80 px-2 py-1 text-[9px] text-zinc-400 transition-colors hover:border-violet-500/30 hover:text-violet-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {chatHistory.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Create a movie poster', 'Write ad copy', 'Suggest image ideas', 'Make text stand out'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setChatMessage(suggestion)}
                className="rounded-md border border-zinc-800 bg-zinc-800/80 px-2 py-1 text-[9px] text-zinc-400 transition-colors hover:border-violet-500/30 hover:text-violet-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </Section>
      )}

      {activeAiTool === 'poster' && (
      <Section title="AI Poster Generator" icon={<Wand2 className="w-4 h-4" />} defaultOpen={true} accentFrom="from-amber-500/15">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          Generate editable numbered-card posters or a complete AI poster image from the same prompt.
        </p>

        <div className="space-y-2">
          <div className="relative">
            <textarea
              placeholder={'Describe your poster:\n• "Luxury fashion brand with gold accents"\n• "Tech startup launch with futuristic city"\n• "Fitness gym motivational poster"\n• "Restaurant grand opening"'}
              value={posterPrompt}
              onChange={(e) => setPosterPrompt(e.target.value)}
              className={`${inputCls} min-h-[118px] resize-none pr-12`}
            />
            <button
              type="button"
              onClick={() => setPosterAttachmentMenuOpen((current) => !current)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-950/90 text-zinc-200 transition-colors hover:border-violet-400/40 hover:text-violet-200"
              aria-label="Add attachment"
            >
              <Plus className="h-4 w-4" />
            </button>

            {posterAttachmentMenuOpen && (
              <div className="absolute right-2 top-12 z-10 w-40 rounded-xl border border-zinc-800/80 bg-zinc-950/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => {
                    documentInputRef.current?.click();
                    setPosterAttachmentMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800/80 hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5 text-violet-300" />
                  Add Files
                </button>
                <button
                  type="button"
                  onClick={() => {
                    imageInputRef.current?.click();
                    setPosterAttachmentMenuOpen(false);
                    setReplaceImageId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800/80 hover:text-white"
                >
                  <ImagePlus className="h-3.5 w-3.5 text-fuchsia-300" />
                  Add Photos
                </button>
              </div>
            )}
          </div>

          <input
            ref={documentInputRef}
            type="file"
            accept={acceptDocumentExtensions}
            multiple
            className="hidden"
            onChange={(event) => {
              addPosterDocuments(event.target.files);
              event.currentTarget.value = '';
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept={acceptImageExtensions}
            multiple
            className="hidden"
            onChange={(event) => {
              addPosterImages(event.target.files);
              event.currentTarget.value = '';
            }}
          />

          {posterDocuments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {posterDocuments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/70 px-3 py-1.5 text-[10px] text-zinc-300">
                  <FileText className="h-3.5 w-3.5 text-violet-300" />
                  <span className="max-w-[160px] truncate">{attachment.name}</span>
                  <span className="text-zinc-500">{formatFileSize(attachment.size)}</span>
                  <button type="button" onClick={() => removePosterDocument(attachment.id)} className="text-zinc-500 transition-colors hover:text-rose-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {posterImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {posterImages.map((attachment) => (
                <div key={attachment.id} className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/70">
                  <div className="relative aspect-square">
                    <img src={attachment.previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setReplaceImageId(attachment.id);
                        imageInputRef.current?.click();
                      }}
                      className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => removePosterImage(attachment.id)}
                      className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/50 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-3 py-2 text-[10px] text-zinc-400">
                    <div className="truncate text-zinc-200">{attachment.name}</div>
                    <div>{formatFileSize(attachment.size)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {classifyPosterGenerationMode(posterPrompt) !== 'single_image_poster' && <>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Theme</span>
            <select
              value={posterSpecTheme}
              onChange={(event) => handlePosterSpecThemeChange(event.target.value as PosterSpecThemeId)}
              className={inputCls}
            >
              {POSTER_SPEC_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Cards</span>
            <select
              value={posterSpecCardCount}
              onChange={(event) => setPosterSpecCardCount(Number(event.target.value))}
              className={inputCls}
            >
              {[3, 4, 5, 6, 7, 8, 9].map((count) => (
                <option key={count} value={count}>{count} cards</option>
              ))}
            </select>
          </label>
        </div>

        <button onClick={handleGenerateEditablePoster} disabled={posterSpecLoading || !posterPrompt.trim()} className={btnPrimary}>
          {posterSpecLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Editable Poster...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate Editable Poster</>}
        </button>
        </>}

        {posterPrompt.trim() && classifyPosterGenerationMode(posterPrompt) === 'single_image_poster' && (
          <p className="rounded-lg border border-violet-400/20 bg-violet-500/5 px-3 py-2 text-[10px] text-violet-200">
            Single visual poster detected. It will be generated as one validated AI image layer.
          </p>
        )}

        <button
          type="button"
          onClick={handleGeneratePoster}
          disabled={posterLoading || !posterPrompt.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-400/40 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {posterLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Image Poster...</> : <><ImagePlus className="w-3.5 h-3.5" /> Generate AI Poster Image</>}
        </button>

        {posterStatus && (
          <div className={`flex items-start gap-2 rounded-lg border p-2.5 text-[10px] ${
            posterStatus.ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}>
            {posterStatus.ok ? <CheckCircle className="mt-0.5 w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 w-3.5 h-3.5 shrink-0" />}
            <span className="min-w-0 flex-1">
              {posterStatus.msg}
            </span>
          </div>
        )}

        {editablePosterSpec && (
          <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-100">Editable PosterSpec</div>
                <div className="text-[9px] text-zinc-500">{posterSpecSource || 'validated-poster-spec'} · text layers are editable on canvas</div>
              </div>
              <button
                type="button"
                onClick={handleRerenderEditablePosterSpec}
                className="rounded-lg border border-amber-400/30 px-2 py-1 text-[9px] font-semibold text-amber-200 hover:bg-amber-400/10"
              >
                Re-render
              </button>
            </div>

            <input
              value={editablePosterSpec.title}
              onChange={(event) => updateEditablePosterSpec((current) => ({ ...current, title: event.target.value }))}
              className={inputCls}
              aria-label="Editable poster title"
            />
            <input
              value={editablePosterSpec.subtitle}
              onChange={(event) => updateEditablePosterSpec((current) => ({ ...current, subtitle: event.target.value }))}
              className={inputCls}
              aria-label="Editable poster subtitle"
            />
            <textarea
              value={editablePosterSpec.description}
              onChange={(event) => updateEditablePosterSpec((current) => ({ ...current, description: event.target.value }))}
              className={`${inputCls} min-h-[64px] resize-none`}
              aria-label="Editable poster description"
            />

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {editablePosterSpec.cards.map((card, index) => (
                <div key={`${card.number}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Card {index + 1}</div>
                  <input
                    value={card.title}
                    onChange={(event) => updateEditablePosterSpec((current) => ({
                      ...current,
                      cards: current.cards.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item),
                    }))}
                    className={inputCls}
                    aria-label={`Card ${index + 1} title`}
                  />
                  <textarea
                    value={card.description}
                    onChange={(event) => updateEditablePosterSpec((current) => ({
                      ...current,
                      cards: current.cards.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item),
                    }))}
                    className={`${inputCls} mt-2 min-h-[58px] resize-none`}
                    aria-label={`Card ${index + 1} description`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={editablePosterSpec.cta.text}
                onChange={(event) => updateEditablePosterSpec((current) => ({ ...current, cta: { ...current.cta, text: event.target.value } }))}
                className={inputCls}
                aria-label="Editable poster call to action"
              />
              <input
                value={editablePosterSpec.cta.tag || ''}
                onChange={(event) => updateEditablePosterSpec((current) => ({ ...current, cta: { ...current.cta, tag: event.target.value } }))}
                className={inputCls}
                aria-label="Editable poster footer tag"
              />
            </div>
          </div>
        )}

        {posterPreviewUrl && (
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/80">
            <div className="flex max-h-44 items-center justify-center bg-black/20">
              <img src={posterPreviewUrl} alt="Generated poster preview" className="max-h-44 w-full object-contain" crossOrigin="anonymous" />
            </div>
            <GeneratedAssetActions
              assetType="poster"
              imageSource={posterPreviewUrl}
              width={posterResult?.result?.width || posterResult?.design?.width}
              height={posterResult?.result?.height || posterResult?.design?.height}
              prompt={posterPrompt}
              onDownload={handleDownloadPoster}
              onRegenerate={handleRegeneratePoster}
              onEdit={handleEditPoster}
              onOpenInEditor={handleOpenPosterInEditor}
              downloadDisabled={posterLoading || !posterResult}
              editDisabled={posterLoading || !posterResult}
              openDisabled={posterLoading || !posterResult}
              regenerateDisabled={posterLoading || !posterPrompt.trim()}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { label: 'Luxury Brand', prompt: 'Luxury brand poster with gold accents and elegant typography' },
            { label: 'Tech Startup', prompt: 'Tech startup launch poster with futuristic cityscape' },
            { label: 'Fashion', prompt: 'Fashion collection poster with model and bold colors' },
            { label: 'Restaurant', prompt: 'Restaurant grand opening with gourmet food imagery' },
            { label: 'Fitness', prompt: 'Fitness gym motivational poster with athlete' },
            { label: 'Movie', prompt: 'Cinematic movie poster with dramatic lighting' },
          ].map((quickPrompt) => (
            <button
              key={quickPrompt.label}
              onClick={() => setPosterPrompt(quickPrompt.prompt)}
              className="rounded-md border border-zinc-800 bg-zinc-800/80 px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:border-amber-500/30 hover:text-amber-200"
            >
              {quickPrompt.label}
            </button>
          ))}
        </div>
      </Section>
      )}

      {activeAiTool === 'thumbnail' && (
      <Section title="AI Thumbnail Generator" icon={<ImagePlus className="w-4 h-4" />} defaultOpen={true} accentFrom="from-emerald-500/15">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          Generate platform-ready thumbnails with title text, references, face photos, brand logos, and style presets.
        </p>

        <textarea
          placeholder={'Describe your thumbnail:\n• "Gaming thumbnail for final boss battle"\n• "Tech review thumbnail for new laptop"\n• "Educational thumbnail for Python tutorial"'}
          value={thumbPrompt}
          onChange={(e) => setThumbPrompt(e.target.value)}
          className={`${inputCls} min-h-[105px] resize-none`}
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={thumbTitle}
            onChange={(e) => setThumbTitle(e.target.value)}
            placeholder="Optional title text"
            className={inputCls}
          />
          <input
            value={thumbSubtitle}
            onChange={(e) => setThumbSubtitle(e.target.value)}
            placeholder="Optional subtitle text"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={thumbPlatform} onChange={(e) => applyThumbnailPlatform(e.target.value)} className={inputCls}>
            {thumbnailPlatforms.map((platform) => (
              <option key={platform.id} value={platform.id}>{platform.label}</option>
            ))}
          </select>
          <select value={thumbStyle} onChange={(e) => setThumbStyle(e.target.value)} className={inputCls}>
            {thumbnailStyles.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select value={thumbAspect} onChange={(e) => setThumbAspect(e.target.value)} className={inputCls}>
            {['16:9', '9:16', '1:1', '4:5', '5:4'].map((aspect) => <option key={aspect} value={aspect}>{aspect}</option>)}
          </select>
          <input
            type="number"
            min={320}
            max={1920}
            value={thumbWidth}
            onChange={(e) => setThumbWidth(Number(e.target.value) || 1280)}
            className={inputCls}
            disabled={thumbPlatform !== 'custom'}
          />
          <input
            type="number"
            min={320}
            max={1920}
            value={thumbHeight}
            onChange={(e) => setThumbHeight(Number(e.target.value) || 720)}
            className={inputCls}
            disabled={thumbPlatform !== 'custom'}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => thumbReferenceRef.current?.click()} className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-[10px] font-semibold text-zinc-200 hover:border-violet-500/30">
            Reference
          </button>
          <button type="button" onClick={() => thumbFaceRef.current?.click()} className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-[10px] font-semibold text-zinc-200 hover:border-violet-500/30">
            Face/Photo
          </button>
          <button type="button" onClick={() => thumbLogoRef.current?.click()} className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-[10px] font-semibold text-zinc-200 hover:border-violet-500/30">
            Logo
          </button>
        </div>

        <input ref={thumbReferenceRef} type="file" accept={acceptImageExtensions} className="hidden" onChange={(e) => { setThumbReference(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
        <input ref={thumbFaceRef} type="file" accept={acceptImageExtensions} className="hidden" onChange={(e) => { setThumbFace(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
        <input ref={thumbLogoRef} type="file" accept={acceptImageExtensions} className="hidden" onChange={(e) => { setThumbLogo(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />

        {(thumbReference || thumbFace || thumbLogo) && (
          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-300">
            {[
              ['Reference', thumbReference, () => setThumbReference(null)] as const,
              ['Face', thumbFace, () => setThumbFace(null)] as const,
              ['Logo', thumbLogo, () => setThumbLogo(null)] as const,
            ].filter(([, file]) => Boolean(file)).map(([label, file, clear]) => (
              <button key={label} type="button" onClick={clear} className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 hover:border-rose-400/30">
                {label}: {file?.name} ×
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setThumbPrompt((current) => `${current.trim()} ${thumbTitle ? `Title: ${thumbTitle}.` : ''} ${thumbStyle} thumbnail, ${thumbPlatform.replace(/_/g, ' ')} format, high contrast, clear focal point, readable text area.`.trim())}
            disabled={!thumbPrompt.trim()}
            className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-[10px] font-semibold text-zinc-200 hover:border-violet-500/30 disabled:opacity-40"
          >
            Enhance Prompt
          </button>
          <select value={thumbVariations} onChange={(e) => setThumbVariations(Number(e.target.value))} className={inputCls}>
            {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} variation{count > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <button onClick={handleGenerateThumbnail} disabled={thumbLoading || !thumbPrompt.trim()} className={btnPrimary}>
          {thumbLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Thumbnail...</> : <><ImagePlus className="w-3.5 h-3.5" /> Generate Thumbnail</>}
        </button>

        {thumbStatus && (
          <div className={`flex items-start gap-2 rounded-lg border p-2.5 text-[10px] ${
            thumbStatus.ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}>
            {thumbStatus.ok ? <CheckCircle className="mt-0.5 w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 w-3.5 h-3.5 shrink-0" />}
            <span>{thumbStatus.msg}</span>
          </div>
        )}

        {thumbPreview && (
          <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/80">
            <img src={thumbPreview} alt="Generated thumbnail preview" className="h-auto w-full" />
            <GeneratedAssetActions
              assetType="thumbnail"
              imageSource={thumbPreview}
              width={thumbResult?.result?.width || thumbResult?.design?.width || thumbWidth}
              height={thumbResult?.result?.height || thumbResult?.design?.height || thumbHeight}
              prompt={thumbPrompt}
              onDownload={handleDownloadThumbnail}
              onRegenerate={handleGenerateThumbnail}
              onEdit={handleEditThumbnail}
              onOpenInEditor={handleOpenThumbnailInEditor}
              downloadDisabled={thumbLoading || !thumbResult}
              editDisabled={thumbLoading || !thumbResult}
              openDisabled={thumbLoading || !thumbResult}
              regenerateDisabled={thumbLoading || !thumbPrompt.trim()}
            />
          </div>
        )}
      </Section>
      )}

      {activeAiTool === 'image' && (
      <Section title="AI Image Generator" icon={<ImagePlus className="w-4 h-4" />} defaultOpen={true} accentFrom="from-fuchsia-500/15">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          Generate a standalone image and place it directly onto the canvas.
        </p>
        <input
          type="text"
          placeholder='e.g. "futuristic city at sunset"'
          value={imgPrompt}
          onChange={(e) => setImgPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerateImage()}
          className={inputCls}
        />
        <button onClick={handleGenerateImage} disabled={imgLoading || !imgPrompt.trim()} className={btnPrimary}>
          {imgLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Image...</> : <><ImagePlus className="w-3.5 h-3.5" /> Generate Image</>}
        </button>
        {imgStatus && (
          <div className={`flex items-start gap-2 rounded-lg border p-2.5 text-[10px] ${
            imgStatus.ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}>
            {imgStatus.ok ? <CheckCircle className="mt-0.5 w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 w-3.5 h-3.5 shrink-0" />}
            <span>{imgStatus.msg}</span>
          </div>
        )}
        {imgPreview && (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <img src={imgPreview} alt="Generated" className="h-auto w-full" crossOrigin="anonymous" />
            <GeneratedAssetActions
              assetType="image"
              imageSource={imgPreview}
              width={imgResult?.result?.width || imgResult?.width}
              height={imgResult?.result?.height || imgResult?.height}
              prompt={imgPrompt}
              onDownload={handleDownloadImage}
              onRegenerate={handleGenerateImage}
              onEdit={handleEditImage}
              onOpenInEditor={handleOpenImageInEditor}
              downloadDisabled={imgLoading || !imgResult}
              editDisabled={imgLoading || !imgResult}
              openDisabled={imgLoading || !imgResult}
              regenerateDisabled={imgLoading || !imgPrompt.trim()}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['futuristic city', 'neon portrait', 'product mockup', 'minimal landscape'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setImgPrompt(suggestion)}
              className="rounded-md border border-zinc-800 bg-zinc-800/80 px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:border-fuchsia-500/30 hover:text-fuchsia-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </Section>
      )}
    </div>
  );
};
