import Ajv from "ajv";
import schema from "../schema/creative-video-v2.json";
import {
  compileLesson,
  parseLesson,
  validateLesson,
  type LessonScene,
  type LessonVideoSpec,
  type ScenePlan,
} from "./index";

export interface CreativeMedia {
  id: string;
  kind: "image" | "audio";
  source: "uploaded" | "generated";
  assetId: string;
}
export interface CaptionCue {
  startFrame: number;
  endFrame: number;
  text: string;
}
export interface CreativeNarration {
  text: string;
  assetId?: string;
  durationFrames?: number;
  approvedTextHash?: string;
}
export type TransitionType = "fade" | "slide" | "wipe" | "clock-wipe" | "zoom";
export interface SceneTransition {
  type: TransitionType;
  direction?: "from-left" | "from-right" | "from-top" | "from-bottom";
  /** Overlap with the previous scene, 6–30 frames. Ignored on the first scene. */
  durationFrames: number;
  timing?: "linear" | "spring";
}
export interface CreativeSceneExtras {
  motion?: "none" | "fade" | "slide" | "zoom";
  /** Entrance easing. Absent = the original 15-frame linear entrance. */
  easing?: "linear" | "ease" | "spring";
  /** Reveal list items, cards and facts one after another. */
  stagger?: boolean;
  transitionIn?: SceneTransition;
  narration?: CreativeNarration;
  captions?: CaptionCue[];
}
type SceneBase = { id: string; durationFrames: number };
type ComparisonSide = { title: string; points: string[] };
export type CreativeScene = CreativeSceneExtras &
  (
    | LessonScene
    | (SceneBase & {
        type: "image";
        title: string;
        body: string;
        imageAssetId: string;
      })
    | (SceneBase & { type: "features"; title: string; items: string[] })
    | (SceneBase & {
        type: "comparison";
        title: string;
        left: ComparisonSide;
        right: ComparisonSide;
      })
    | (SceneBase & { type: "process"; title: string; steps: string[] })
    | (SceneBase & {
        type: "cta";
        title: string;
        body: string;
        action: string;
        contact: string;
      })
    | (SceneBase & {
        type: "slide";
        title: string;
        layout: "title-bullets" | "split-image" | "quote" | "big-statement";
        body?: string;
        bullets?: string[];
        imageAssetId?: string;
        icon?: string;
      })
    | (SceneBase & {
        type: "code";
        title: string;
        language: CodeLanguage;
        code: string;
        reveal: "typewriter" | "lines" | "none";
        highlights?: CodeHighlight[];
      })
    | (SceneBase & {
        type: "listing";
        title: string;
        address: string;
        price: string;
        photoAssetIds: string[];
        facts: ListingFacts;
        features: string[];
        pan: "kenburns" | "none";
      })
    | (SceneBase & { type: "stats"; title: string; items: StatItem[] })
    | (SceneBase & {
        type: "logo";
        variant: "intro" | "outro";
        title?: string;
        subtitle?: string;
        contact?: string;
      })
  );
export type CodeLanguage = "python" | "javascript" | "typescript" | "sql" | "bash" | "json" | "text";
export interface CodeHighlight {
  atFrame: number;
  fromLine: number;
  toLine: number;
  note?: string;
}
export interface ListingFacts {
  beds?: number;
  baths?: number;
  sqft?: number;
  lot?: string;
  parking?: number;
}
export interface StatItem {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: string;
}
export type CreativePreset = "landscape-1080p" | "portrait-1080p" | "square-1080" | "portrait-4x5";
/** Output sizes for every creative-video preset (mirrored in backend/services/lesson_spec.py). */
export const PRESET_SIZES: Record<CreativePreset, { width: number; height: number }> = {
  "landscape-1080p": { width: 1920, height: 1080 },
  "portrait-1080p": { width: 1080, height: 1920 },
  "square-1080": { width: 1080, height: 1080 },
  "portrait-4x5": { width: 1080, height: 1350 },
};
/** Theme ids accepted in `style.themeId` (tokens live in @teckstudio/design-spec). */
export const VIDEO_THEME_IDS = [
  "tech-blue", "purple-ai", "minimal-light", "corporate-navy", "black-gold", "green-growth",
  "orange-energy", "neon-future", "estate-classic", "estate-modern", "estate-luxe",
] as const;
export interface CreativeVideoSpec {
  schema: "creative-video/v2";
  id: string;
  title: string;
  locale: "en";
  purpose: "promotion" | "explainer";
  output: { preset: CreativePreset; fps: 30 };
  /** Optional visual theme; absent = the original paper look. */
  style?: { themeId: (typeof VIDEO_THEME_IDS)[number] };
  brand: {
    name: string;
    tagline: string;
    primaryColor: string;
    accentColor: string;
    logoAssetId?: string;
  };
  assets: CreativeMedia[];
  scenes: CreativeScene[];
  soundtrack?: { assetId: string; volume: number };
}
export type VideoSpec = LessonVideoSpec | CreativeVideoSpec;
export interface VideoPlan {
  width: number;
  height: number;
  fps: 30;
  durationInFrames: number;
  scenes: ScenePlan[];
  templateVersion: string;
}
const structure = new Ajv({ allErrors: true, strict: false }).compile(schema);
/** Frames a scene overlaps the one before it (0 for the first scene). */
export function transitionOverlap(scenes: CreativeScene[], index: number): number {
  return index > 0 ? (scenes[index].transitionIn?.durationFrames ?? 0) : 0;
}
/** Total length after transition overlaps: Σ durations − Σ overlaps. */
export function compiledTotal(scenes: CreativeScene[]): number {
  return scenes.reduce((sum, scene, i) => sum + creativeSceneDuration(scene) - transitionOverlap(scenes, i), 0);
}
export function creativeSceneDuration(scene: CreativeScene): number {
  return Math.max(
    scene.durationFrames,
    scene.narration?.assetId ? (scene.narration.durationFrames ?? 0) + 15 : 0,
  );
}
export function validateCreativeVideo(value: unknown): string[] {
  let encoded: string | undefined;
  try {
    encoded = JSON.stringify(value);
  } catch {
    return ["Video must contain JSON data."];
  }
  if (!encoded || new TextEncoder().encode(encoded).length > 1024 * 1024)
    return ["Video exceeds the 1 MiB input limit."];
  if (!structure(value))
    return [
      ...new Set(
        (structure.errors ?? []).map(
          (e) => `${e.instancePath || "/"} ${e.message}`,
        ),
      ),
    ].slice(0, 12);
  const spec = value as unknown as CreativeVideoSpec;
  const errors: string[] = [];
  const unique = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length)
      errors.push(`${label}: IDs must be unique.`);
  };
  unique(
    spec.scenes.map((s) => s.id),
    "/scenes",
  );
  unique(
    spec.assets.map((a) => a.id),
    "/assets",
  );
  const media = new Map(spec.assets.map((a) => [a.id, a.kind]));
  const ref = (id: string | undefined, kind: string, label: string) => {
    if (id && media.get(id) !== kind)
      errors.push(`${label}: select an existing ${kind} asset.`);
  };
  ref(spec.brand.logoAssetId, "image", "/brand/logoAssetId");
  ref(spec.soundtrack?.assetId, "audio", "/soundtrack");
  let total = 0;
  for (const [i, scene] of spec.scenes.entries()) {
    const p = `/scenes/${i}`,
      duration = creativeSceneDuration(scene);
    total += duration;
    if (scene.type === "image")
      ref(scene.imageAssetId, "image", `${p}/imageAssetId`);
    ref(scene.narration?.assetId, "audio", `${p}/narration`);
    if (
      scene.narration?.assetId &&
      (!scene.narration.durationFrames || !scene.narration.approvedTextHash)
    )
      errors.push(
        `${p}/narration: measured duration and approved text hash are required.`,
      );
    let end = 0;
    for (const cue of scene.captions ?? []) {
      if (
        cue.startFrame < end ||
        cue.endFrame <= cue.startFrame ||
        cue.endFrame > duration
      )
        errors.push(
          `${p}/captions: cues must be ordered, non-overlapping and inside the scene.`,
        );
      end = cue.endFrame;
    }
    if (scene.type === "question" && scene.revealAtFrame >= duration)
      errors.push(`${p}/revealAtFrame: must be before the scene ends.`);
    if (scene.type === "diagram") {
      unique(
        scene.nodes.map((n) => n.id),
        `${p}/nodes`,
      );
      unique(
        scene.edges.map((e) => e.id),
        `${p}/edges`,
      );
      const nodes = new Set(scene.nodes.map((n) => n.id)),
        edges = new Set(scene.edges.map((e) => e.id));
      if (
        scene.edges.some(
          (e) => e.from === e.to || !nodes.has(e.from) || !nodes.has(e.to),
        )
      )
        errors.push(`${p}/edges: use different existing endpoints.`);
      scene.steps.forEach((s, j) => {
        if (
          (j === 0 && s.atFrame !== 0) ||
          s.atFrame >= duration ||
          (j > 0 && s.atFrame <= scene.steps[j - 1].atFrame)
        )
          errors.push(
            `${p}/steps: begin at zero and increase inside the scene.`,
          );
        if (
          [...s.activeNodeIds, ...Object.keys(s.nodeStates ?? {})].some(
            (n) => !nodes.has(n),
          ) ||
          s.activeEdgeIds.some((e) => !edges.has(e))
        )
          errors.push(`${p}/steps: unknown node or edge.`);
      });
    }
  }
  total = compiledTotal(spec.scenes);
  for (const [i, scene] of spec.scenes.entries()) {
    const p = `/scenes/${i}`;
    const duration = creativeSceneDuration(scene);
    if (i > 0 && scene.transitionIn) {
      const previous = spec.scenes[i - 1];
      const t = scene.transitionIn.durationFrames;
      if (t > Math.floor(Math.min(creativeSceneDuration(previous), duration) / 2))
        errors.push(`${p}/transitionIn: must be at most half of this and the previous scene.`);
      if (previous.narration?.assetId && creativeSceneDuration(previous) - t < (previous.narration.durationFrames ?? 0))
        errors.push(`${p}/transitionIn: would cut off the previous scene's narration; lengthen that scene.`);
    }
    if (scene.type === "slide") ref(scene.imageAssetId, "image", `${p}/imageAssetId`);
    if (scene.type === "listing") {
      scene.photoAssetIds.forEach((id, j) => ref(id, "image", `${p}/photoAssetIds/${j}`));
      if (new Set(scene.photoAssetIds).size !== scene.photoAssetIds.length)
        errors.push(`${p}/photoAssetIds: photos must be different.`);
    }
    if (scene.type === "code") {
      const lines = scene.code.split("\n").length;
      if (lines > 24) errors.push(`${p}/code: keep code to 24 lines per scene.`);
      let previousFrame = -1;
      for (const h of scene.highlights ?? []) {
        if (h.atFrame <= previousFrame || h.atFrame >= duration)
          errors.push(`${p}/highlights: times must increase and stay inside the scene.`);
        if (h.fromLine > h.toLine || h.toLine > lines)
          errors.push(`${p}/highlights: lines must exist and be in order.`);
        previousFrame = h.atFrame;
      }
    }
  }
  if (total < 450 || total > 2700)
    errors.push(
      "/scenes: new videos must be 15–90 seconds, including measured narration.",
    );
  return [...new Set(errors)];
}
export function validateVideo(value: unknown): string[] {
  return (value as { schema?: string } | null)?.schema === "creative-video/v2"
    ? validateCreativeVideo(value)
    : validateLesson(value);
}
export function parseVideo(value: unknown): VideoSpec {
  if ((value as { schema?: string } | null)?.schema !== "creative-video/v2")
    return parseLesson(value);
  const errors = validateCreativeVideo(value);
  if (errors.length) throw new Error(errors.join("\n"));
  return structuredClone(value) as CreativeVideoSpec;
}
export function compileVideo(value: unknown): VideoPlan {
  const spec = parseVideo(value);
  if (spec.schema === "lesson-video/v1") return compileLesson(spec);
  // Scenes with transitionIn start `durationFrames` before the previous one ends.
  let position = 0;
  const scenes = spec.scenes.map((s, i) => {
    const startFrame = position - transitionOverlap(spec.scenes, i);
    const endFrame = startFrame + creativeSceneDuration(s);
    position = endFrame;
    return { id: s.id, startFrame, endFrame };
  });
  const size = PRESET_SIZES[spec.output.preset];
  return {
    width: size.width,
    height: size.height,
    fps: 30,
    durationInFrames: position,
    scenes,
    templateVersion: "2.0.0",
  };
}
export function createCreativeVideo(
  title = "Your new concept",
  preset: CreativeVideoSpec["output"]["preset"] = "landscape-1080p",
  purpose: CreativeVideoSpec["purpose"] = "explainer",
): CreativeVideoSpec {
  return {
    schema: "creative-video/v2",
    id: "creative-video",
    title,
    locale: "en",
    purpose,
    output: { preset, fps: 30 },
    brand: {
      name: "",
      tagline: "",
      primaryColor: "#172b3a",
      accentColor: "#b75f27",
    },
    assets: [],
    scenes: [
      {
        id: "opening",
        type: "title",
        durationFrames: 450,
        title,
        subtitle: "Describe what your audience should learn or discover.",
        motion: "fade",
      },
    ],
  };
}
export function captionsToSrt(spec: VideoSpec): string {
  if (spec.schema !== "creative-video/v2") return "";
  const plan = compileVideo(spec),
    cues = spec.scenes.flatMap((s, i) =>
      (s.captions ?? []).map((c) => ({
        ...c,
        startFrame: c.startFrame + plan.scenes[i].startFrame,
        endFrame: c.endFrame + plan.scenes[i].startFrame,
      })),
    );
  const time = (frame: number) => {
    const ms = Math.round((frame / 30) * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  return cues
    .map(
      (c, i) =>
        `${i + 1}\n${time(c.startFrame)} --> ${time(c.endFrame)}\n${c.text}\n`,
    )
    .join("\n");
}
