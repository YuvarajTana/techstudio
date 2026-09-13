/**
 * Centralized Design Preset Registry
 * Single source of truth for all supported design types and their dimensions.
 */

export type DesignPresetId =
  | "poster"
  | "youtube-thumbnail"
  | "instagram-post"
  | "instagram-story"
  | "facebook-post"
  | "facebook-cover"
  | "linkedin-post"
  | "twitter-post"
  | "pinterest-pin"
  | "presentation-16-9"
  | "presentation-4-3"
  | "flyer-a4"
  | "poster-a3"
  | "banner-web"
  | "billboard"
  | "brochure"
  | "newsletter"
  | "business-card"
  | "letterhead"
  | "envelope"
  | "certificate"
  | "menu"
  | "pitch-deck"
  | "logo-square"
  | "logo-wide"
  | "editorial-tech-square"
  | "architecture-poster-4-5"
  | "architecture-poster-3-4"
  | "architecture-story"
  | "custom";

export interface DesignPreset {
  id: DesignPresetId;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "portrait" | "landscape" | "square";
  unit: "px";
  category: string;
  subcategory: string;
  icon?: string;
  tags?: string[];
}

function orientation(w: number, h: number): "portrait" | "landscape" | "square" {
  if (w === h) return "square";
  return w > h ? "landscape" : "portrait";
}

function preset(
  id: DesignPresetId,
  name: string,
  width: number,
  height: number,
  category: string,
  subcategory: string,
  icon?: string,
  tags?: string[],
): DesignPreset {
  return {
    id,
    name,
    width,
    height,
    aspectRatio: width / height,
    orientation: orientation(width, height),
    unit: "px",
    category,
    subcategory,
    icon,
    tags,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALL DESIGN PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const DESIGN_PRESETS: DesignPreset[] = [
  preset("editorial-tech-square", "Editorial Tech Poster", 1080, 1080, "Technology", "Developer", "code", ["editorial", "technology", "developer", "square"]),
  preset("architecture-poster-4-5", "AI Architecture Poster", 1080, 1350, "Technology", "System Design", "network", ["architecture", "ai", "diagram", "4:5"]),
  preset("architecture-poster-3-4", "Architecture Diagram Tall", 1080, 1440, "Technology", "System Design", "network", ["architecture", "diagram", "3:4"]),
  preset("architecture-story", "Architecture Story", 1080, 1920, "Technology", "System Design", "network", ["architecture", "diagram", "story"]),

  // Poster
  preset("poster", "Poster", 800, 1132, "Marketing", "Posters", "image", ["poster", "portrait", "marketing"]),

  // Social Media
  preset("instagram-post", "Instagram Post", 1080, 1080, "Social Media", "Instagram", "camera", ["instagram", "square", "social"]),
  preset("instagram-story", "Instagram Story", 1080, 1920, "Social Media", "Instagram", "smartphone", ["instagram", "story", "vertical"]),
  preset("facebook-post", "Facebook Post", 1200, 630, "Social Media", "Facebook", "share2", ["facebook", "landscape"]),
  preset("facebook-cover", "Facebook Cover", 820, 312, "Social Media", "Facebook", "image", ["facebook", "cover", "banner"]),
  preset("twitter-post", "Twitter Post", 1200, 675, "Social Media", "Twitter/X", "twitter", ["twitter", "landscape"]),
  preset("linkedin-post", "LinkedIn Post", 1200, 627, "Social Media", "LinkedIn", "linkedin", ["linkedin", "landscape"]),
  preset("pinterest-pin", "Pinterest Pin", 1000, 1500, "Social Media", "Pinterest", "mapPin", ["pinterest", "portrait", "pin"]),

  // Video
  preset("youtube-thumbnail", "YouTube Thumbnail", 1280, 720, "Video", "YouTube", "play", ["youtube", "thumbnail", "landscape"]),

  // Marketing
  preset("flyer-a4", "Flyer (A4)", 2480, 3508, "Marketing", "Flyers", "fileText", ["flyer", "a4", "print"]),
  preset("poster-a3", "Poster (A3)", 3508, 4961, "Marketing", "Posters", "image", ["poster", "a3", "print"]),
  preset("banner-web", "Banner (Web)", 728, 90, "Marketing", "Banners", "monitor", ["banner", "web", "ad"]),
  preset("billboard", "Billboard", 1080, 1920, "Marketing", "Billboards", "monitor", ["billboard", "large"]),
  preset("brochure", "Brochure", 2550, 3300, "Marketing", "Brochures", "bookOpen", ["brochure", "print"]),
  preset("newsletter", "Newsletter", 600, 900, "Marketing", "Newsletters", "mail", ["newsletter", "email"]),

  // Print
  preset("business-card", "Business Card", 1050, 600, "Print", "Cards", "creditCard", ["business", "card"]),
  preset("letterhead", "Letterhead", 2550, 3300, "Print", "Documents", "fileText", ["letterhead", "document"]),
  preset("envelope", "Envelope", 2400, 1200, "Print", "Envelopes", "mail", ["envelope", "mail"]),
  preset("certificate", "Certificate", 2550, 1650, "Print", "Certificates", "award", ["certificate", "award"]),
  preset("menu", "Menu", 1200, 1800, "Print", "Menus", "utensils", ["menu", "restaurant"]),

  // Presentations
  preset("presentation-16-9", "16:9 Slide", 1920, 1080, "Presentations", "Slides", "monitor", ["presentation", "slide", "widescreen"]),
  preset("presentation-4-3", "4:3 Slide", 1440, 1080, "Presentations", "Slides", "monitor", ["presentation", "slide", "standard"]),
  preset("pitch-deck", "Pitch Deck", 1920, 1080, "Presentations", "Decks", "presentation", ["pitch", "deck", "startup"]),

  // Brand
  preset("logo-square", "Logo Square", 1080, 1080, "Brand", "Logos", "palette", ["logo", "square"]),
  preset("logo-wide", "Logo Wide", 2400, 800, "Brand", "Logos", "palette", ["logo", "wide", "horizontal"]),
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get a preset by ID */
export function getPreset(id: DesignPresetId): DesignPreset | undefined {
  return DESIGN_PRESETS.find((p) => p.id === id);
}

/** Get presets grouped by category */
export function getPresetsByCategory(): Record<string, DesignPreset[]> {
  const groups: Record<string, DesignPreset[]> = {};
  for (const preset of DESIGN_PRESETS) {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(preset);
  }
  return groups;
}

/** Get presets for a specific category */
export function getPresetsForCategory(category: string): DesignPreset[] {
  return DESIGN_PRESETS.filter((p) => p.category === category);
}

/** Get all unique categories */
export function getPresetCategories(): string[] {
  return [...new Set(DESIGN_PRESETS.map((p) => p.category))];
}

/** Search presets by query */
export function searchPresets(query: string): DesignPreset[] {
  const lower = query.toLowerCase();
  return DESIGN_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower) ||
      p.subcategory.toLowerCase().includes(lower) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(lower)),
  );
}

/** Get the closest matching preset for given dimensions */
export function findClosestPreset(width: number, height: number): DesignPreset | null {
  let best: DesignPreset | null = null;
  let bestScore = Infinity;
  for (const preset of DESIGN_PRESETS) {
    const widthDiff = Math.abs(preset.width - width);
    const heightDiff = Math.abs(preset.height - height);
    const score = widthDiff + heightDiff;
    if (score < bestScore) {
      bestScore = score;
      best = preset;
    }
  }
  return best;
}

/** Check if dimensions match a known preset */
export function matchesPreset(width: number, height: number): DesignPreset | null {
  for (const preset of DESIGN_PRESETS) {
    if (preset.width === width && preset.height === height) return preset;
  }
  return null;
}

/** Create a custom preset from dimensions */
export function createCustomPreset(width: number, height: number, name = "Custom"): DesignPreset {
  return {
    id: "custom",
    name,
    width,
    height,
    aspectRatio: width / height,
    orientation: orientation(width, height),
    unit: "px",
    category: "Custom",
    subcategory: "Custom",
  };
}
