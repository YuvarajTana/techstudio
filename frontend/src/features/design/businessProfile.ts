import type {BusinessProfile} from '@teckstudio/design-spec';

/**
 * Business details remembered on this device so a shop owner does not retype
 * them for every festival poster. Browser storage can be unavailable (private
 * windows, blocked site data); the Studio then simply starts empty.
 */
const KEY = 'teckstudio.design.businessProfile.v1';

export interface StoredProfile extends BusinessProfile {
  /** Fill these details into new designs automatically. */
  autoApply: boolean;
}

const EMPTY: StoredProfile = {name: '', phone: '', address: '', autoApply: true};

export function loadBusinessProfile(): StoredProfile {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const value = JSON.parse(raw) as Partial<StoredProfile>;
    return {
      name: typeof value.name === 'string' ? value.name : '',
      phone: typeof value.phone === 'string' ? value.phone : '',
      address: typeof value.address === 'string' ? value.address : '',
      autoApply: value.autoApply !== false,
    };
  } catch {
    return EMPTY;
  }
}

export function saveBusinessProfile(profile: StoredProfile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable: the details still apply for this session.
  }
}

export function hasProfile(profile: BusinessProfile): boolean {
  return Boolean(profile.name?.trim() || profile.phone?.trim() || profile.address?.trim());
}
