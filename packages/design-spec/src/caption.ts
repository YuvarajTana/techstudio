import { cardsSlot, listSlot, textSlot } from './layout/slots';
import type { DesignSpec } from './types';

/**
 * Post text to paste next to the image on LinkedIn (also fine for Instagram
 * and WhatsApp). Job posts follow the structure recruiters already use:
 * headline, key facts with emoji, skills as a checklist, what to send, how
 * to apply, hashtags. The poster carries the headline facts; the caption
 * carries the detail that does not fit on it.
 */

const FACT_EMOJI: Record<string, string> = {
  'map-pin': '📍', briefcase: '💼', 'price-inr': '💰', cash: '💰', hourglass: '⏳', calendar: '📅', clock: '🕒',
  laptop: '💻', school: '🎓', gift: '🎁', 'user-plus': '🤝', home: '🏠', users: '👥', 'users-group': '👥', award: '🏅', certificate: '🏅',
};

/** What candidates are asked to send with their resume. */
export const DEFAULT_APPLICANT_DETAILS = [
  'Updated resume',
  'LinkedIn profile URL',
  'Current location',
  'Total and relevant experience',
  'Notice period / availability',
  'Current and expected CTC (or rate)',
];

const hashtag = (text: string) => {
  const words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return words.length ? `#${words.map((w) => w[0].toUpperCase() + w.slice(1)).join('')}` : '';
};

function hashtags(spec: DesignSpec, extra: string[]): string {
  const tags = [...extra, spec.brand?.name ? hashtag(spec.brand.name) : ''];
  const seen = new Set<string>();
  return tags
    .flatMap((tag) => tag.split(/\s+/))
    .filter((tag) => /^#[\p{L}\p{N}_]+$/u.test(tag) && !seen.has(tag.toLowerCase()) && seen.add(tag.toLowerCase()))
    .join(' ');
}

export interface CaptionOptions {
  /** Ask applicants for these details (job posts). Empty to leave the list out. */
  applicantDetails?: string[];
}

/** Caption for the first page of a design. */
export function linkedInCaption(spec: DesignSpec, options: CaptionOptions = {}): string {
  const page = spec.pages[0];
  const lines: string[] = [];
  const title = textSlot(page, 'title');

  if (page.layout === 'job-posting') {
    const kicker = textSlot(page, 'eyebrow');
    const urgent = /immediate|urgent/i.test(kicker);
    lines.push(`${urgent ? '🚨' : '🚀'} ${kicker ? `${urgent ? kicker.toUpperCase() : kicker}: ` : ''}${title}`);
    if (textSlot(page, 'subtitle')) lines.push('', textSlot(page, 'subtitle'));
    const details = cardsSlot(page, 'details');
    if (details.length) lines.push('', ...details.map((item) => `${FACT_EMOJI[item.icon ?? ''] ?? '🔹'} ${item.title}${item.body ? `: ${item.body}` : ''}`));
    const roles = cardsSlot(page, 'roles');
    if (roles.length) lines.push('', 'Open roles', ...roles.map((role, i) => `🔹 ${i + 1}. ${role.title}${role.body ? ` (${role.body})` : ''}`));
    const skills = listSlot(page, 'skills');
    if (skills.length) lines.push('', 'Skills', ...skills.map((skill) => `✅ ${skill}`));
    const ask = options.applicantDetails ?? DEFAULT_APPLICANT_DETAILS;
    if (ask.length) lines.push('', '📩 Please share these details with your resume:', ...ask.map((item) => `• ${item}`));
    if (textSlot(page, 'cta')) lines.push('', `👉 ${textSlot(page, 'cta')}`);
    lines.push('', hashtags(spec, [textSlot(page, 'tag'), '#Hiring', '#Jobs', ...skills.slice(0, 3).map(hashtag)]));
  } else if (page.layout === 'festival-greeting') {
    const sender = textSlot(page, 'sender') || spec.brand?.name || '';
    const greeting = [textSlot(page, 'eyebrow').toLowerCase() === 'happy' ? 'Happy' : '', title].filter(Boolean).join(' ');
    if (textSlot(page, 'message')) lines.push(`✨ ${textSlot(page, 'message')}`, '');
    lines.push(sender ? `🌸 ${sender} wishes everyone a very ${greeting}!` : `🌸 ${greeting}!`);
    lines.push('', hashtags(spec, [hashtag(greeting), sender ? hashtag(sender) : '']));
  } else {
    lines.push(title || spec.title);
    for (const slot of ['subtitle', 'message', 'cta']) if (textSlot(page, slot)) lines.push('', textSlot(page, slot));
    lines.push('', hashtags(spec, [textSlot(page, 'tag')]));
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
