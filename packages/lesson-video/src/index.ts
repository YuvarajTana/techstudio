import Ajv from "ajv";
import schema from "../schema/lesson-video-v1.json";

export const TEMPLATE_VERSION = "1.0.0";
export const MAX_SPEC_BYTES = 1024 * 1024;
export interface BaseScene {
  id: string;
  durationFrames: number;
}
export interface TitleScene extends BaseScene {
  type: "title";
  title: string;
  subtitle: string;
}
export interface DiagramNode {
  id: string;
  label: string;
}
export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}
export interface DiagramStep {
  atFrame: number;
  label: string;
  activeNodeIds: string[];
  activeEdgeIds: string[];
  nodeStates?: Record<string, "normal" | "unavailable">;
}
export interface DiagramScene extends BaseScene {
  type: "diagram";
  title: string;
  layout: "left-to-right";
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: DiagramStep[];
}
export interface QuestionScene extends BaseScene {
  type: "question";
  prompt: string;
  answer: string;
  explanation: string;
  revealAtFrame: number;
}
export interface RecapScene extends BaseScene {
  type: "recap";
  title: string;
  points: string[];
  nextTask: string;
}
export type LessonScene =
  | TitleScene
  | DiagramScene
  | QuestionScene
  | RecapScene;
export interface LessonVideoSpec {
  schema: "lesson-video/v1";
  id: string;
  title: string;
  domain: string;
  audience: "students" | "graduates" | "professionals";
  locale: "en";
  objectives: string[];
  prerequisites: string[];
  sourceNotes: string[];
  template: { id: "concept-walkthrough"; version: "1.0.0" };
  theme: "teckstudio-light";
  output: { preset: "landscape-1080p"; fps: 30 };
  narration: { mode: "none" };
  assets: never[];
  scenes: LessonScene[];
}
export interface ScenePlan {
  id: string;
  startFrame: number;
  endFrame: number;
}
export interface LessonPlan {
  width: 1920;
  height: 1080;
  fps: 30;
  durationInFrames: number;
  scenes: ScenePlan[];
  templateVersion: string;
}
const structural = new Ajv({ allErrors: true, strict: false }).compile(schema);
export function validateLesson(value: unknown): string[] {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    return ["Lesson must contain JSON data."];
  }
  if (!encoded || new TextEncoder().encode(encoded).length > MAX_SPEC_BYTES)
    return ["Lesson exceeds the 1 MiB input limit."];
  if (!structural(value)) {
    return [
      ...new Set(
        (structural.errors ?? []).map(
          (e) => `${e.instancePath || "/"} ${e.message}`,
        ),
      ),
    ].slice(0, 12);
  }
  const spec = value as unknown as LessonVideoSpec;
  const errors: string[] = [];
  const unique = (ids: string[], path: string) => {
    if (new Set(ids).size !== ids.length)
      errors.push(`${path}: IDs must be unique.`);
  };
  unique(
    spec.scenes.map((s) => s.id),
    "/scenes",
  );
  if (spec.scenes.reduce((sum, s) => sum + s.durationFrames, 0) > 18000)
    errors.push("/scenes: total duration exceeds 10 minutes.");
  spec.scenes.forEach((s, i) => {
    const path = `/scenes/${i}`;
    if (s.type === "question" && s.revealAtFrame >= s.durationFrames)
      errors.push(`${path}/revealAtFrame: must be before the scene ends.`);
    if (s.type !== "diagram") return;
    unique(
      s.nodes.map((n) => n.id),
      `${path}/nodes`,
    );
    unique(
      s.edges.map((e) => e.id),
      `${path}/edges`,
    );
    const nodes = new Set(s.nodes.map((n) => n.id));
    const edges = new Set(s.edges.map((e) => e.id));
    s.edges.forEach((e, j) => {
      if (!nodes.has(e.from) || !nodes.has(e.to) || e.from === e.to)
        errors.push(`${path}/edges/${j}: use two different existing node IDs.`);
    });
    s.steps.forEach((step, j) => {
      if (
        (j === 0 && step.atFrame !== 0) ||
        step.atFrame >= s.durationFrames ||
        (j > 0 && step.atFrame <= s.steps[j - 1].atFrame)
      )
        errors.push(
          `${path}/steps/${j}/atFrame: begin at 0, increase strictly and stay inside the scene.`,
        );
      if (
        [...step.activeNodeIds, ...Object.keys(step.nodeStates ?? {})].some(
          (id) => !nodes.has(id),
        ) ||
        step.activeEdgeIds.some((id) => !edges.has(id))
      )
        errors.push(`${path}/steps/${j}: unknown node or edge reference.`);
    });
  });
  return errors;
}
export function parseLesson(value: unknown): LessonVideoSpec {
  const errors = validateLesson(value);
  if (errors.length) throw new Error(errors.join("\n"));
  return structuredClone(value) as LessonVideoSpec;
}
export function compileLesson(value: unknown): LessonPlan {
  const spec = parseLesson(value);
  let position = 0;
  const scenes = spec.scenes.map((s) => {
    const startFrame = position;
    position += s.durationFrames;
    return { id: s.id, startFrame, endFrame: position };
  });
  return {
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: position,
    scenes,
    templateVersion: TEMPLATE_VERSION,
  };
}
export function sceneAtFrame(plan: LessonPlan, frame: number): number {
  return plan.scenes.findIndex(
    (s) => frame >= s.startFrame && frame < s.endFrame,
  );
}
export function diagramStepAtFrame(
  scene: DiagramScene,
  frame: number,
): DiagramStep {
  return scene.steps.findLast((s) => s.atFrame <= frame) ?? scene.steps[0];
}
export function diagramLayout(scene: DiagramScene) {
  const nodes = scene.nodes.map((n, i) => ({
    ...n,
    x:
      scene.nodes.length === 1
        ? 960
        : 240 + (i * 1440) / (scene.nodes.length - 1),
    y: 470,
  }));
  const positions = new Map(nodes.map((n) => [n.id, n]));
  let top = 0;
  let bottom = 0;
  const edges = scene.edges.map((e) => {
    const from = positions.get(e.from)!;
    const to = positions.get(e.to)!;
    const forward = from.x < to.x;
    const y = forward ? 397 : 543;
    const laneY = forward ? 280 - top++ * 24 : 653 + bottom++ * 24;
    return {
      ...e,
      path: `M ${from.x} ${y} C ${from.x} ${laneY}, ${to.x} ${laneY}, ${to.x} ${y}`,
      labelX: (from.x + to.x) / 2,
      labelWidth: Math.min(380, Math.max(220, Math.abs(from.x - to.x) - 80)),
      labelY: (y + 3 * laneY) / 4,
    };
  });
  return { nodes, edges };
}
