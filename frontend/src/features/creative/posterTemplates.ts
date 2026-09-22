import {fabric} from 'fabric';
import {CUSTOM_FABRIC_PROPERTIES} from '../../utils/editorElementFactory';
import type {Brand, PosterCopy} from './types';

export interface PosterOptions {width: number; height: number; copy: PosterCopy; brand?: Brand; hero?: string; blank?: boolean}
const uid = () => `creative-${crypto.randomUUID()}`;

/** The compiler only creates a new draft. Saved Fabric JSON remains authoritative. */
export async function createPosterData(options: PosterOptions): Promise<string> {
  await document.fonts?.ready;
  const {width, height, copy, brand, hero, blank} = options;
  const canvas = new fabric.StaticCanvas(document.createElement('canvas'), {width, height, renderOnAddRemove: false});
  const scale = width / 1080, H = height / scale;
  const primary = brand?.colors.find(c => c.role === 'primary')?.hex_value || '#173d37';
  const accent = brand?.colors.find(c => c.role === 'accent')?.hex_value || '#b7802d';
  const paper = copy.family === 'offer-event' ? '#f7efe6' : copy.family === 'festival' ? '#fff9e8' : '#f6f4ef';
  const loadedFonts = new Set(['arial','georgia','times new roman','courier new','verdana','helvetica']);
  document.fonts?.forEach(font => {if(font.status==='loaded') loadedFonts.add(font.family.replaceAll('"','').toLowerCase());});
  const fontFor = (role:string) => {const chosen=brand?.fonts.find(font=>font.role===role)?.family;return chosen&&loadedFonts.has(chosen.toLowerCase())?chosen:'Arial';};
  canvas.backgroundColor = paper;
  function meta(role: string, field = role) {return {id: uid(), name: role.replaceAll('-', ' '), posterRole: role, posterField: field, posterTemplateId: `creative-${copy.family}-v1`, selectable: true};}
  function rect(x: number, y: number, w: number, h: number, fill: string, role: string, radius = 0) {
    canvas.add(new fabric.Rect({left: x * scale, top: y * scale, width: w * scale, height: h * scale, rx: radius * scale, ry: radius * scale, fill, ...meta(role)}));
  }
  function text(value: string, x: number, y: number, w: number, size: number, role: string, color = primary, weight: string | number = 400, maxHeight = 180, align = 'left') {
    if (!value.trim()) return;
    const box = new fabric.Textbox(value, {left: x * scale, top: y * scale, width: w * scale, fontSize: size * scale, fontFamily: fontFor(role==='headline'||role==='brand-name'?'heading':'body'), fontWeight: weight, fill: color, lineHeight: 1.13, textAlign: align, ...meta(role)});
    while ((box.height || 0) > maxHeight * scale && Number(box.fontSize) > 14 * scale) {box.set('fontSize', Number(box.fontSize) - scale); box.initDimensions();}
    if((box.height || 0)>maxHeight*scale+1)throw new Error(`Shorten ${role.replaceAll('-', ' ')} or choose a taller format so the text remains readable.`);
    canvas.add(box);
  }
  async function image(source: string | undefined, x: number, y: number, w: number, h: number, role: string, fit: 'contain' | 'cover' = 'contain') {
    if (!source) return;
    await new Promise<void>((resolve, reject) => fabric.Image.fromURL(source, img => {
      if (!img.width || !img.height) {reject(new Error(`Unable to load ${role}.`)); return;}
      const ratio = fit === 'contain' ? Math.min(w * scale / img.width, h * scale / img.height) : Math.max(w * scale / img.width, h * scale / img.height);
      img.set({...meta(role), left: (x + w / 2) * scale, top: (y + h / 2) * scale, originX: 'center', originY: 'center', scaleX: ratio, scaleY: ratio});
      if (fit === 'cover') img.clipPath = new fabric.Rect({left: x * scale, top: y * scale, width: w * scale, height: h * scale, absolutePositioned: true});
      canvas.add(img); resolve();
    }));
  }
  try {
    if (!blank) {
      const logo = brand?.logos.find(l => l.role === 'primary') || brand?.logos[0];
      await image(logo?.file_data, 64, 48, 125, 92, 'brand-logo');
      text(brand?.company_name || brand?.name || '', logo ? 213 : 64, 62, logo ? 780 : 950, 28, 'brand-name', primary, 700, 70);
      text(brand?.profile_json.tagline || '', logo ? 213 : 64, 108, 780, 17, 'brand-tagline', primary, 400, 44);
      const footerY = H - 152;
      const contentBottom = footerY - 35;
      const available = contentBottom - 185;
      if (copy.family === 'product') {
        rect(554, 190, 460, available - 100, '#e4e9e0', 'hero-frame', 26);
        await image(hero, 574, 210, 420, available - 140, 'hero-image');
        text(copy.subheadline.toUpperCase(), 64, 205, 450, 20, 'subheadline', accent, 700, 70);
        text(copy.headline, 64, 285, 470, 62, 'headline', primary, 700, available * .42);
        text(copy.body, 64, 300 + available * .42, 440, 25, 'body', primary, 400, available * .27);
        copy.services.slice(0, 3).forEach((item, i) => {rect(64 + i * 324, contentBottom - 64, 298, 54, '#e5e8df', `benefit-card-${i}`, 8); text(item, 77 + i * 324, contentBottom - 52, 272, 20, `benefit-${i}`, primary, 600, 42);});
      } else if (copy.family === 'service') {
        text(copy.headline, 64, 188, 952, 60, 'headline', primary, 700, 145);
        text(copy.subheadline, 64, 340, 945, 26, 'subheadline', accent, 600, 65);
        const heroHeight = available * .37;
        await image(hero, 64, 425, 950, heroHeight, 'hero-image', 'cover');
        const cardsY = contentBottom - 125;
        text(copy.body, 64, 438 + heroHeight, 950, 24, 'body', primary, 400, cardsY - (438 + heroHeight) - 12);
        copy.services.slice(0, 4).forEach((item, i) => {rect(64 + i * 241, cardsY, 222, 112, primary, `service-card-${i}`, 9); text(String(i + 1).padStart(2, '0'), 78 + i * 241, cardsY + 10, 70, 22, `service-number-${i}`, '#ffffff', 700, 30); text(item, 78 + i * 241, cardsY + 45, 194, 20, `service-${i}`, '#ffffff', 400, 57);});
      } else if (copy.family === 'offer-event') {
        rect(0, 180, 1080, available * .48, primary, 'announcement-banner');
        text(copy.subheadline.toUpperCase(), 64, 215, 950, 24, 'subheadline', '#ffffff', 700, 62);
        text(copy.headline, 64, 300, 945, 86, 'headline', '#ffffff', 700, available * .29);
        await image(hero, 580, 205 + available * .48, 435, available * .43, 'hero-image');
        text(copy.body, 64, 220 + available * .48, 460, 28, 'body', primary, 400, available * .30);
        text(copy.services.join('  ·  '), 64, contentBottom - 64, 950, 22, 'details', accent, 700, 50);
      } else if (copy.family === 'appreciation') {
        text(copy.subheadline.toUpperCase(), 64, 205, 950, 22, 'subheadline', accent, 700, 65);
        text(copy.headline, 64, 290, 640, 73, 'headline', primary, 700, available * .30);
        text(copy.body, 64, 300 + available * .30, 550, 29, 'body', primary, 400, available * .28);
        await image(hero, 0, 210 + available * .57, 1080, available * .43, 'hero-image', 'cover');
        rect(680, 250, 12, available * .25, accent, 'quote-rule');
        text(copy.services.join('\n\n'), 724, 254, 280, 25, 'appreciation-notes', primary, 400, available * .42);
      } else if (copy.family === 'festival') {
        rect(26, 26, 1028, 8, accent, 'top-ornament');
        rect(26, 26, 8, H - 52, accent, 'left-ornament');
        rect(1046, 26, 8, H - 52, accent, 'right-ornament');
        rect(26, H - 34, 1028, 8, accent, 'bottom-ornament');
        text(copy.subheadline.toUpperCase(), 64, 225, 495, 21, 'subheadline', accent, 600, 65);
        text(copy.headline, 64, 300, 520, 66, 'headline', primary, 700, available * .30);
        text(copy.body, 64, 320 + available * .30, 455, 27, 'body', primary, 400, available * .32);
        await image(hero, 530, 208, 480, available - 44, 'hero-image');
        text(copy.services.join('  ·  '), 64, contentBottom - 62, 940, 19, 'services', accent, 600, 50);
      } else {
        text(copy.subheadline.toUpperCase(), 64, 195, 950, 21, 'subheadline', accent, 700, 45);
        text(copy.headline, 64, 258, 950, 63, 'headline', primary, 700, 145);
        text(copy.body, 64, 418, 950, 26, 'body', primary, 400, 110);
        const items = copy.services.slice(0, 5), start = 555, rowHeight = Math.min(146, (contentBottom - start) / Math.max(1, items.length));
        items.forEach((item, i) => {rect(64, start + i * rowHeight, 950, rowHeight - 10, '#e6e9e2', `step-card-${i}`, 8); text(String(i + 1).padStart(2, '0'), 85, start + i * rowHeight + 16, 68, 30, `step-number-${i}`, accent, 700, rowHeight - 26); text(item, 178, start + i * rowHeight + 18, 809, 25, `step-${i}`, primary, 500, rowHeight - 30);});
      }
      rect(48, footerY, 984, 110, primary, 'contact-band', 16);
      text(copy.cta, 72, footerY + 17, 932, 28, 'cta', '#ffffff', 700, 39);
      text(copy.contact, 72, footerY + 66, 932, 18, 'contact', '#ffffff', 400, 30);
    }
    const data = canvas.toJSON(CUSTOM_FABRIC_PROPERTIES) as Record<string, unknown>;
    return JSON.stringify({...data, width, height});
  } finally {canvas.dispose();}
}
