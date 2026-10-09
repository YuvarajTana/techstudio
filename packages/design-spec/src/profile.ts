import { getLayoutFamily } from './layout';
import type { AgentValue, DesignSpec } from './types';

/**
 * Business details a returning user saves once (shop, brokerage or family
 * name, phone, address) and has filled into every new template.
 */
export interface BusinessProfile {
  name?: string;
  phone?: string;
  address?: string;
}

const REAL_ESTATE = new Set(['listing-hero', 'open-house', 'just-sold']);
/** Layouts that show the business name as the corner brand mark. */
const BRANDED = new Set([...REAL_ESTATE, 'job-posting']);

const PROFILE_LAYOUTS = new Set([...BRANDED, 'festival-greeting', 'offer-promo', 'event-invite']);

/** True when `applyBusinessProfile` changes something in this design. */
export function usesBusinessProfile(spec: DesignSpec): boolean {
  return spec.pages.some((page) => PROFILE_LAYOUTS.has(page.layout));
}

/**
 * A copy of `spec` with the profile written into the slots each layout uses
 * for them. Empty profile fields leave the template's sample text in place.
 * Values are clipped to the slot's character limit.
 */
export function applyBusinessProfile(spec: DesignSpec, profile: BusinessProfile): DesignSpec {
  const name = profile.name?.trim();
  const phone = profile.phone?.trim();
  const address = profile.address?.trim();
  const next = JSON.parse(JSON.stringify(spec)) as DesignSpec;
  if (!name && !phone && !address) return next;
  for (const page of next.pages) {
    const family = getLayoutFamily(page.layout);
    if (!family) continue;
    const limit = (slot: string) => family.slots.find((def) => def.name === slot)?.maxChars;
    const set = (slot: string, value: string | undefined) => {
      if (!value || !family.slots.some((def) => def.name === slot)) return;
      const max = limit(slot);
      page.slots[slot] = max && value.length > max ? value.slice(0, max).trimEnd() : value;
    };
    switch (family.id) {
      case 'festival-greeting':
        set('sender', name);
        if (address || phone) set('contact', [address, phone].filter(Boolean).join(' · '));
        break;
      case 'offer-promo':
        set('title', name);
        set('address', address);
        set('phone', phone);
        break;
      case 'event-invite':
        if (phone) set('rsvp', `RSVP: ${phone}`);
        break;
      default:
        if (REAL_ESTATE.has(family.id)) {
          const agent = page.slots.agent as AgentValue | undefined;
          if (agent && phone) page.slots.agent = { ...agent, phone };
        }
    }
  }
  if (name && next.pages.some((page) => BRANDED.has(page.layout))) next.brand = { ...next.brand, name };
  return next;
}
