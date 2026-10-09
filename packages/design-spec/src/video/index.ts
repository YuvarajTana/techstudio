/**
 * DesignSpec → creative-video/v2. Each page becomes one or more semantic
 * scenes (not a screenshot), so the video keeps real motion: staggered
 * bullets, diagram steps, code highlights, listing photo pans, counters.
 */
import { validateCreativeVideo, type CreativeMedia, type CreativeScene, type CreativeVideoSpec, type CreativePreset, type SceneTransition } from '@teckstudio/lesson-video';
import { requireFormat } from '../formats';
import { requireLayoutFamily } from '../layout';
import { agentSlot, cardsSlot, codeSlot, factsSlot, flowSlot, imageSlot, imagesSlot, listSlot, sideSlot, statsSlot, textSlot } from '../layout/slots';
import { requireTheme, themeWithBrand } from '../themes';
import type { DesignPage, DesignSpec, ImageValue } from '../types';

export interface VideoMappingOptions {
  /** Override the format's default preset. */
  preset?: CreativePreset;
  /**
   * Resolve a design image to an uploaded/generated media asset. Images that
   * cannot be resolved are left out (listing scenes show a photo placeholder).
   */
  resolveImage?: (image: ImageValue) => { source: CreativeMedia['source']; assetId: string } | undefined;
}

const LIBRARY_SRC = /\/media\/asset-library(?:-full|-thumbnails)?\/([a-z0-9][a-z0-9-]{0,40})\/([A-Za-z0-9_-]{1,56})\.(?:jpe?g|png|webp)(?:[?#].*)?$/i;

/**
 * Default image → media mapping: owned editor uploads (`assetId`) and photos
 * from the shared library (`/media/asset-library…/<category>/<name>.jpg`, any
 * derived size) become video media. Anything else (remote URLs, data URLs,
 * placeholders) is left out.
 */
export function resolveDesignImage(image: ImageValue): { source: CreativeMedia['source']; assetId: string } | undefined {
  if (image.assetId) return { source: 'uploaded', assetId: image.assetId };
  const match = LIBRARY_SRC.exec(image.src ?? '');
  if (match) return { source: 'library', assetId: `${match[1].toLowerCase()}__${match[2]}` };
  return undefined;
}

const FPS = 30;
const MIN_TOTAL = 15 * FPS;
const MAX_TOTAL = 90 * FPS;
const MAX_SCENES = 30;

const clip = (text: string | undefined, max: number) => {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
};
const words = (...texts: (string | undefined)[]) => texts.join(' ').split(/\s+/).filter(Boolean).length;
/** Reading-time based duration: ~3.3 words per second plus a settle period. */
const readFrames = (count: number, min = 120, max = 360) => Math.max(min, Math.min(max, 75 + count * 9));
const safeId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 60) || 'scene';

interface Builder {
  scenes: CreativeScene[];
  assets: CreativeMedia[];
  photo(image: ImageValue | undefined): string | undefined;
}

function parseStat(value: string): { value: number; prefix?: string; suffix?: string; decimals?: number } | undefined {
  const match = /^([^\d-]{0,4})(-?[\d,]*\.?\d+)(.{0,8})$/.exec(value.trim());
  if (!match) return undefined;
  const number = Number(match[2].replace(/,/g, ''));
  if (!Number.isFinite(number)) return undefined;
  const decimals = match[2].includes('.') ? Math.min(2, match[2].split('.')[1].length) : 0;
  return { value: number, prefix: match[1] || undefined, suffix: match[3] || undefined, decimals: decimals || undefined };
}

function pageScenes(page: DesignPage, spec: DesignSpec, single: boolean, b: Builder): CreativeScene[] {
  const id = (suffix: string) => safeId(`${page.id}-${suffix}`);
  const title = textSlot(page, 'title');
  const out: CreativeScene[] = [];
  const bulletsSlide = (key: string, heading: string, bullets: string[]) => {
    const items = bullets.map((item) => clip(item, 120)).filter(Boolean).slice(0, 6);
    if (!items.length) return;
    out.push({ id: id(key), type: 'slide', layout: 'title-bullets', durationFrames: readFrames(words(heading, ...items)), title: clip(heading, 96) || spec.title, bullets: items, stagger: true, easing: 'spring' });
  };
  const statement = (key: string, heading: string, body: string | undefined) => {
    if (!body?.trim() && !heading.trim()) return;
    out.push({ id: id(key), type: 'slide', layout: 'big-statement', durationFrames: readFrames(words(heading, body), 105, 240), title: clip(heading || spec.title, 96), body: clip(body, 400) || undefined, easing: 'ease' });
  };

  switch (requireLayoutFamily(page.layout).id) {
    case 'concept-cards': {
      const cards = cardsSlot(page, 'cards');
      const subtitle = textSlot(page, 'subtitle') || textSlot(page, 'eyebrow');
      if (page.variant === 'hero' || single) {
        out.push({ id: id('title'), type: 'title', durationFrames: readFrames(words(title, subtitle), 105, 210), title: clip(title, 96) || spec.title, subtitle: clip(subtitle, 240) || clip(spec.title, 240), easing: 'spring' });
      }
      if (page.variant !== 'hero') {
        const lines = cards.map((card) => (card.body ? `${card.title}: ${card.body}` : card.title));
        bulletsSlide('cards', title, lines.slice(0, 6));
        if (lines.length > 6) bulletsSlide('cards-more', `${title} (continued)`, lines.slice(6));
      }
      if (single && textSlot(page, 'cta')) statement('cta', textSlot(page, 'tag') || title, textSlot(page, 'cta'));
      break;
    }
    case 'architecture-flow': {
      const flow = flowSlot(page, 'flow');
      if (page.variant === 'flow' && flow.nodes.length >= 2 && flow.nodes.length <= 6) {
        const nodes = flow.nodes.map((node) => ({ id: safeId(node.id), label: clip(node.label, 32) || node.id }));
        const known = new Set(nodes.map((node) => node.id));
        const edges = (flow.edges.length ? flow.edges : flow.nodes.slice(1).map((node, i) => ({ from: flow.nodes[i].id, to: node.id, label: undefined as string | undefined })))
          .map((edge, i) => ({ id: `e${i + 1}`, from: safeId(edge.from), to: safeId(edge.to), label: clip(edge.label, 32) || 'then' }))
          .filter((edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to)
          .slice(0, 10);
        const stepFrames = 45;
        const duration = Math.max(180, (nodes.length + 1) * stepFrames);
        const steps = nodes.slice(0, 12).map((node, i) => {
          const active = new Set(nodes.slice(0, i + 1).map((n) => n.id));
          return { atFrame: i * stepFrames, label: clip(node.label, 180), activeNodeIds: [...active], activeEdgeIds: edges.filter((e) => active.has(e.from) && active.has(e.to)).map((e) => e.id) };
        });
        out.push({ id: id('flow'), type: 'diagram', layout: 'left-to-right', durationFrames: duration, title: clip(title, 96) || spec.title, nodes, edges, steps });
      } else if (flow.nodes.length <= 5) {
        out.push({ id: id('steps'), type: 'process', durationFrames: readFrames(words(title, ...flow.nodes.map((n) => n.label)), 150), title: clip(title, 96) || spec.title, steps: flow.nodes.map((node) => clip(node.label, 120)), stagger: true, easing: 'spring' });
      } else {
        bulletsSlide('steps', title, flow.nodes.map((node, i) => `${i + 1}. ${node.label}`));
      }
      if (textSlot(page, 'takeaway')) statement('takeaway', 'Takeaway', textSlot(page, 'takeaway'));
      break;
    }
    case 'code-explainer': {
      const code = codeSlot(page, 'code');
      if (page.variant !== 'cheatsheet' && code) {
        const lines = code.source.split('\n');
        const callouts = listSlot(page, 'callouts');
        const meaningful = lines.map((line, i) => ({ line, n: i + 1 })).filter((l) => l.line.trim());
        const stepFrames = 75;
        const highlights = callouts.slice(0, 12).map((note, i) => {
          const target = meaningful[Math.min(meaningful.length - 1, Math.floor(((i + 0.5) * meaningful.length) / callouts.length))];
          return { atFrame: 60 + i * stepFrames, fromLine: target?.n ?? 1, toLine: target?.n ?? 1, note: clip(note, 120) };
        });
        out.push({ id: id('code'), type: 'code', language: code.language, reveal: 'lines', durationFrames: Math.max(180, 60 + highlights.length * stepFrames + 45), title: clip(title, 96) || spec.title, code: code.source.slice(0, 2000), highlights: highlights.length ? highlights : undefined, easing: 'ease' });
      } else {
        bulletsSlide('snippets', title, cardsSlot(page, 'snippets').map((s) => `${s.title}: ${s.body ?? ''}`));
      }
      if (single && textSlot(page, 'takeaway')) statement('takeaway', 'Takeaway', textSlot(page, 'takeaway'));
      break;
    }
    case 'comparison': {
      const side = (name: string) => {
        const value = sideSlot(page, name);
        const points = value.points.map((p) => clip(p, 120)).filter(Boolean).slice(0, 4);
        return { title: clip(value.title, 64) || name, points: points.length ? points : ['—'] };
      };
      const left = side('left');
      const right = side('right');
      out.push({ id: id('compare'), type: 'comparison', durationFrames: readFrames(words(title, ...left.points, ...right.points), 180, 390), title: clip(title, 96) || spec.title, left, right, easing: 'ease' });
      if (textSlot(page, 'verdict')) statement('verdict', 'Verdict', textSlot(page, 'verdict'));
      break;
    }
    case 'listing-hero':
    case 'open-house':
    case 'just-sold': {
      const family = page.layout;
      const photos = [imageSlot(page, 'hero'), ...imagesSlot(page, 'photos')].map((image) => b.photo(image)).filter((alias): alias is string => Boolean(alias));
      const facts = factsSlot(page, 'facts');
      const features = listSlot(page, family === 'open-house' ? 'highlights' : 'features');
      if (family === 'open-house') {
        statement('banner', textSlot(page, 'eyebrow') || 'Open House', [textSlot(page, 'date'), textSlot(page, 'time')].filter(Boolean).join(' · '));
      }
      if (family === 'just-sold') statement('banner', textSlot(page, 'banner') || 'Just Sold', textSlot(page, 'headline'));
      out.push({
        id: id('listing'),
        type: 'listing',
        durationFrames: Math.max(180, Math.min(360, photos.length * 90)),
        title: clip(textSlot(page, 'headline') || textSlot(page, 'eyebrow') || spec.title, 96),
        address: clip(textSlot(page, 'address'), 120) || spec.title,
        price: clip(textSlot(page, 'price'), 40),
        photoAssetIds: photos.slice(0, 8),
        // The video listing scene has no BHK or facing chip yet: BHK shows as beds, facing as the lot line.
        facts: { beds: facts.bhk ?? facts.beds, baths: facts.baths, sqft: facts.sqft === undefined ? undefined : Math.round(facts.sqft), lot: facts.lot || facts.facing ? clip(facts.lot || facts.facing, 32) : undefined, parking: facts.parking === undefined ? undefined : Math.round(facts.parking) },
        features: features.map((f) => clip(f, 60)).slice(0, 5),
        pan: 'kenburns',
        stagger: true,
        easing: 'spring',
      });
      const stats = statsSlot(page, 'stats').map((s) => ({ ...parseStat(s.value), label: clip(s.label, 40) })).filter((s): s is { value: number; label: string } => typeof (s as { value?: number }).value === 'number' && Boolean(s.label));
      if (stats.length) out.push({ id: id('stats'), type: 'stats', durationFrames: 150, title: 'The results', items: stats.slice(0, 4) });
      const agent = agentSlot(page, 'agent');
      if (agent) out.push({ id: id('agent'), type: 'logo', variant: 'outro', durationFrames: 120, title: clip(agent.name, 96), subtitle: clip(agent.title || spec.brand?.name, 160) || undefined, contact: clip([agent.phone, agent.email].filter(Boolean).join(' · '), 180) || undefined });
      break;
    }
    case 'property-feature-grid': {
      const photo = imagesSlot(page, 'photos').map((image) => b.photo(image)).find(Boolean);
      const bullets = cardsSlot(page, 'features').map((card) => (card.body ? `${card.title}: ${card.body}` : card.title)).map((item) => clip(item, 120)).filter(Boolean).slice(0, 6);
      if (photo || bullets.length) {
        out.push({ id: id('features'), type: 'slide', layout: photo ? 'split-image' : 'title-bullets', imageAssetId: photo, durationFrames: readFrames(words(title, ...bullets), 150), title: clip(title, 96) || spec.title, body: clip(textSlot(page, 'subtitle'), 400) || undefined, bullets: bullets.length ? bullets : undefined, stagger: true, easing: 'spring' });
      } else statement('title', title, textSlot(page, 'subtitle'));
      break;
    }
    case 'festival-greeting':
    case 'event-invite': {
      const invite = page.layout === 'event-invite';
      const lead = textSlot(page, 'eyebrow');
      const photo = b.photo(imageSlot(page, 'image'));
      const body = invite ? textSlot(page, 'subtitle') : textSlot(page, 'message');
      out.push({ id: id('title'), type: 'title', durationFrames: readFrames(words(lead, title), 105, 180), title: clip(title, 96) || spec.title, subtitle: clip(lead || body, 240) || clip(spec.title, 240), easing: 'spring' });
      if (photo) out.push({ id: id('photo'), type: 'slide', layout: 'split-image', imageAssetId: photo, durationFrames: readFrames(words(title, body), 120, 240), title: clip(title, 96) || spec.title, body: clip(body, 400) || undefined, easing: 'ease' });
      else if (body && lead) statement('message', title, body);
      if (invite) statement('when', textSlot(page, 'date'), [textSlot(page, 'time'), textSlot(page, 'venue')].filter(Boolean).join(' · '));
      const from = invite ? textSlot(page, 'hosts') : textSlot(page, 'sender');
      const contact = invite ? textSlot(page, 'rsvp') : textSlot(page, 'contact');
      if (from || contact) out.push({ id: id('from'), type: 'logo', variant: 'outro', durationFrames: 120, title: clip(from || spec.brand?.name || title, 96), contact: clip(contact, 180) || undefined });
      break;
    }
    case 'job-posting': {
      const kicker = textSlot(page, 'eyebrow');
      out.push({ id: id('title'), type: 'title', durationFrames: readFrames(words(kicker, title), 105, 180), title: clip(title, 96) || spec.title, subtitle: clip(textSlot(page, 'subtitle') || kicker, 240) || clip(spec.title, 240), easing: 'spring' });
      if (page.variant === 'openings') bulletsSlide('roles', kicker || title, cardsSlot(page, 'roles').map((role) => (role.body ? `${role.title} · ${role.body}` : role.title)));
      else {
        bulletsSlide('details', title, cardsSlot(page, 'details').map((item) => (item.body ? `${item.title}: ${item.body}` : item.title)));
        const skills = listSlot(page, 'skills');
        if (skills.length) statement('skills', 'Skills', skills.join(' · '));
      }
      if (textSlot(page, 'cta')) statement('apply', textSlot(page, 'tag') || 'Apply now', textSlot(page, 'cta'));
      break;
    }
    case 'offer-promo': {
      const photo = b.photo(imageSlot(page, 'image'));
      const offer = textSlot(page, 'offer');
      const heading = textSlot(page, 'eyebrow') || title;
      statement('offer', offer || heading, [offer ? title : '', textSlot(page, 'subtitle')].filter(Boolean).join(' · '));
      const items = cardsSlot(page, 'items').map((item) => (item.body ? `${item.title} · ${item.body}` : item.title));
      if (photo) out.push({ id: id('photo'), type: 'slide', layout: 'split-image', imageAssetId: photo, durationFrames: readFrames(words(title, ...items), 150), title: clip(title, 96) || spec.title, bullets: items.length ? items.map((item) => clip(item, 120)).slice(0, 6) : undefined, stagger: true, easing: 'spring' });
      else bulletsSlide('items', title, items);
      const contact = [textSlot(page, 'phone'), textSlot(page, 'address')].filter(Boolean).join(' · ');
      out.push({ id: id('visit'), type: 'logo', variant: 'outro', durationFrames: 120, title: clip(spec.brand?.name || title, 96), subtitle: clip(textSlot(page, 'validity'), 160) || undefined, contact: clip(contact, 180) || undefined });
      break;
    }
  }
  const notes = page.notes?.trim();
  if (notes && out.length) out[0] = { ...out[0], narration: { text: clip(notes, 3000) } };
  return out;
}

function transitionFor(scene: CreativeScene): SceneTransition {
  if (scene.type === 'listing') return { type: 'wipe', direction: 'from-left', durationFrames: 15, timing: 'spring' };
  if (scene.type === 'stats') return { type: 'zoom', durationFrames: 12, timing: 'spring' };
  if (scene.type === 'code' || scene.type === 'diagram') return { type: 'slide', direction: 'from-right', durationFrames: 15, timing: 'spring' };
  return { type: 'fade', durationFrames: 12, timing: 'spring' };
}

/** Scale durations so the video lands inside the 15–90 s window (after transition overlaps). */
function fitDurations(scenes: CreativeScene[]): void {
  const overlap = scenes.slice(1).reduce((sum, scene) => sum + (scene.transitionIn?.durationFrames ?? 0), 0);
  const raw = scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
  const total = raw - overlap;
  if (total >= MIN_TOTAL && total <= MAX_TOTAL) return;
  const target = total < MIN_TOTAL ? MIN_TOTAL + 15 : MAX_TOTAL - 15;
  const factor = (target + overlap) / raw;
  for (const scene of scenes) scene.durationFrames = Math.max(60, Math.ceil(scene.durationFrames * factor));
  // Highlights and diagram steps must stay inside a shortened scene.
  for (const scene of scenes) {
    if (scene.type === 'code' && scene.highlights) scene.highlights = scene.highlights.filter((h) => h.atFrame < scene.durationFrames - 1);
    if (scene.type === 'diagram') scene.steps = scene.steps.filter((s, i) => i === 0 || s.atFrame < scene.durationFrames - 1);
  }
}

/**
 * Name shown in the video header. Occasion designs carry it in their slots
 * (greeting sender, shop name, invitation occasion) rather than in `brand`.
 */
function headerName(spec: DesignSpec): string {
  if (spec.brand?.name?.trim()) return spec.brand.name;
  const page = spec.pages[0];
  if (page.layout === 'festival-greeting') return textSlot(page, 'sender');
  if (page.layout === 'offer-promo') return textSlot(page, 'title');
  // Invitations: the names or event, not the lead-in line ("Together with their families").
  if (page.layout === 'event-invite') return textSlot(page, 'title');
  if (page.layout === 'job-posting') return textSlot(page, 'eyebrow');
  return '';
}

/** Build a creative-video/v2 spec from a DesignSpec. Throws if the result is invalid. */
export function toCreativeVideo(spec: DesignSpec, options: VideoMappingOptions = {}): CreativeVideoSpec {
  const format = requireFormat(spec.format);
  const theme = themeWithBrand(requireTheme(spec.theme), spec.brand);
  const assets: CreativeMedia[] = [];
  const aliases = new Map<string, string>();
  const builder: Builder = {
    scenes: [],
    assets,
    photo(image) {
      if (!image?.src || !options.resolveImage) return undefined;
      const resolved = options.resolveImage(image);
      if (!resolved) return undefined;
      const key = `${resolved.source}:${resolved.assetId}`;
      if (!aliases.has(key)) {
        const alias = `img-${aliases.size + 1}`;
        aliases.set(key, alias);
        assets.push({ id: alias, kind: 'image', source: resolved.source, assetId: resolved.assetId });
      }
      return aliases.get(key);
    },
  };
  const single = spec.pages.length === 1;
  let scenes = spec.pages.flatMap((page) => pageScenes(page, spec, single, builder));
  const seen = new Set<string>();
  scenes = scenes.filter((scene) => (seen.has(scene.id) ? false : (seen.add(scene.id), true))).slice(0, MAX_SCENES);
  if (!scenes.length) throw new Error('This design has no content that can become a video scene.');
  scenes = scenes.map((scene, i) => (i === 0 ? scene : { ...scene, transitionIn: transitionFor(scene) }));
  fitDurations(scenes);
  const video: CreativeVideoSpec = {
    schema: 'creative-video/v2',
    id: safeId(spec.id).slice(0, 80),
    title: clip(spec.title, 160) || 'Untitled video',
    locale: 'en',
    // Marketing layouts (listings, offers, greetings, invites) promote; lessons explain.
    purpose: spec.pages.some((page) => requireLayoutFamily(page.layout).vertical !== 'tech') ? 'promotion' : 'explainer',
    output: { preset: options.preset ?? format.videoPreset, fps: 30 },
    style: { themeId: theme.id as NonNullable<CreativeVideoSpec['style']>['themeId'] },
    brand: {
      name: clip(headerName(spec), 120),
      tagline: '',
      primaryColor: theme.color.accent,
      accentColor: theme.color.primary,
    },
    assets,
    scenes,
  };
  const errors = validateCreativeVideo(video);
  if (errors.length) throw new Error(`Could not build a valid video: ${errors.slice(0, 3).join(' ')}`);
  return video;
}
