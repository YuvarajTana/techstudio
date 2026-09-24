import type { DesignSpec } from '../types';

export type DesignOutput = 'poster' | 'deck' | 'video';

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  vertical: 'tech' | 'real-estate' | 'generic';
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
