import type { DesignSpec, Vertical } from '../types';

export type DesignOutput = 'poster' | 'deck' | 'video';

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  vertical: Vertical;
  /** Templates written for Indian audiences (₹ prices, BHK, festivals, invites). */
  region?: 'india';
  /**
   * When the template is most useful, e.g. Diwali in October–November.
   * Months are 1–12. Lunar festivals move each year, so ranges are generous.
   */
  season?: { months: number[]; label: string };
  category: string;
  tags: string[];
  /** What the chooser offers for this template. */
  outputs: DesignOutput[];
  /** Other formats the same content lays out well in. */
  altFormats: string[];
  featured?: boolean;
  popularity: number;
  source: 'starter' | 'legacy';
  spec: DesignSpec;
}
