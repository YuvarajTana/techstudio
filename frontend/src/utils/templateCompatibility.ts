/**
 * Template Compatibility Utilities
 * Matches templates to canvas dimensions based on aspect ratio and orientation.
 */

export interface TemplateCompatibility {
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  isCompatible: boolean;
  similarityScore: number; // 0-1, 1 = exact match
}

export function getTemplateOrientation(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

export function getAspectRatio(width: number, height: number): number {
  if (height === 0) return 1;
  return width / height;
}

/**
 * Check if a template is compatible with canvas dimensions.
 * Uses aspect ratio tolerance to allow slight variations.
 */
export function isTemplateCompatible(
  templateWidth: number,
  templateHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  tolerance = 0.20,
): boolean {
  if (templateWidth === 0 || templateHeight === 0 || canvasWidth === 0 || canvasHeight === 0) {
    return false;
  }
  const templateRatio = getAspectRatio(templateWidth, templateHeight);
  const canvasRatio = getAspectRatio(canvasWidth, canvasHeight);
  const diff = Math.abs(templateRatio - canvasRatio) / Math.max(canvasRatio, 0.001);
  return diff <= tolerance;
}

/**
 * Calculate compatibility score between a template and canvas dimensions.
 * Returns 0-1 where 1 is a perfect match.
 */
export function getCompatibilityScore(
  templateWidth: number,
  templateHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): number {
  if (templateWidth === 0 || templateHeight === 0 || canvasWidth === 0 || canvasHeight === 0) {
    return 0;
  }
  const templateRatio = getAspectRatio(templateWidth, templateHeight);
  const canvasRatio = getAspectRatio(canvasWidth, canvasHeight);
  const diff = Math.abs(templateRatio - canvasRatio) / Math.max(canvasRatio, 0.001);
  return Math.max(0, 1 - diff);
}

/**
 * Get full compatibility info for a template against canvas dimensions.
 */
export function getTemplateCompatibility(
  templateWidth: number,
  templateHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): TemplateCompatibility {
  return {
    aspectRatio: getAspectRatio(templateWidth, templateHeight),
    orientation: getTemplateOrientation(templateWidth, templateHeight),
    isCompatible: isTemplateCompatible(templateWidth, templateHeight, canvasWidth, canvasHeight),
    similarityScore: getCompatibilityScore(templateWidth, templateHeight, canvasWidth, canvasHeight),
  };
}

/**
 * Filter and sort templates by compatibility with canvas dimensions.
 * Compatible templates first, sorted by similarity score.
 */
export function sortByCompatibility<T extends { width: number; height: number }>(
  templates: T[],
  canvasWidth: number,
  canvasHeight: number,
): T[] {
  return [...templates].sort((a, b) => {
    const scoreA = getCompatibilityScore(a.width, a.height, canvasWidth, canvasHeight);
    const scoreB = getCompatibilityScore(b.width, b.height, canvasWidth, canvasHeight);
    return scoreB - scoreA;
  });
}

/**
 * Get the closest matching template type for given canvas dimensions.
 */
export function getClosestTemplateType(
  canvasWidth: number,
  canvasHeight: number,
): string {
  const ratio = getAspectRatio(canvasWidth, canvasHeight);
  const orientation = getTemplateOrientation(canvasWidth, canvasHeight);

  if (orientation === 'square') return 'instagram-post';
  if (orientation === 'portrait') {
    if (ratio < 0.6) return 'instagram-story';
    if (ratio < 0.8) return 'poster';
    return 'poster';
  }
  // landscape
  if (ratio > 1.7) return 'youtube-thumbnail';
  if (ratio > 1.4) return 'linkedin-post';
  return 'flyer';
}
