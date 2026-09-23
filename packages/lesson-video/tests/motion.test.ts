import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import schema from "../schema/creative-video-v2.json";
import example from "../src/example.json";
import {
  PRESET_SIZES,
  VIDEO_THEME_IDS,
  compileVideo,
  createCreativeVideo,
  validateCreativeVideo,
  type CreativeVideoSpec,
} from "../src/index.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/creative-motion.json", import.meta.url), "utf8"));

function patched(patch: { scene?: number; set?: Record<string, unknown>; top?: Record<string, unknown> }): CreativeVideoSpec {
  const spec = structuredClone(fixture.spec);
  if (patch.top) Object.assign(spec, patch.top);
  if (patch.scene !== undefined) Object.assign(spec.scenes[patch.scene], patch.set);
  return spec;
}

test("motion fixture validates and compiles to the shared expected plan", () => {
  assert.deepEqual(validateCreativeVideo(fixture.spec), []);
  assert.deepEqual(compileVideo(fixture.spec), fixture.expectedPlan);
});

test("each invalid motion case is rejected", () => {
  for (const item of fixture.invalid) {
    assert.ok(validateCreativeVideo(patched(item.patch)).length > 0, item.why);
  }
});

test("specs without transitions keep the original back-to-back timing", () => {
  const spec = createCreativeVideo("Legacy");
  spec.scenes.push({ id: "b", type: "features", durationFrames: 300, title: "More", items: ["One", "Two"] });
  const plan = compileVideo(spec);
  assert.deepEqual(plan.scenes.map((s) => [s.startFrame, s.endFrame]), [[0, 450], [450, 750]]);
  assert.equal(plan.durationInFrames, 750);
  assert.equal(compileVideo(example).durationInFrames, 1620);
});

test("every preset has a size and the schema lists the same presets and themes", () => {
  const presetEnum = (schema as any).properties.output.properties.preset.enum;
  assert.deepEqual([...presetEnum].sort(), Object.keys(PRESET_SIZES).sort());
  assert.deepEqual((schema as any).properties.style.properties.themeId.enum, [...VIDEO_THEME_IDS]);
  for (const preset of presetEnum) {
    const spec = { ...createCreativeVideo("Sizes"), output: { preset, fps: 30 } } as CreativeVideoSpec;
    const plan = compileVideo(spec);
    assert.deepEqual({ width: plan.width, height: plan.height }, PRESET_SIZES[preset as keyof typeof PRESET_SIZES]);
  }
});

test("every scene branch accepts the shared motion properties", () => {
  const common = ["motion", "narration", "captions", "easing", "stagger", "transitionIn"];
  for (const branch of (schema as any).properties.scenes.items.oneOf) {
    for (const key of common) assert.ok(branch.properties[key], `${branch.properties.type.const} lacks ${key}`);
  }
});

test("transitions shorten the total and are part of the 15–90 s rule", () => {
  const spec = createCreativeVideo("Short");
  spec.scenes = [
    { id: "a", type: "title", durationFrames: 240, title: "A", subtitle: "a" },
    { id: "b", type: "title", durationFrames: 240, title: "B", subtitle: "b", transitionIn: { type: "fade", durationFrames: 30 } },
  ];
  assert.equal(compileVideo(spec).durationInFrames, 450);
  spec.scenes[1].transitionIn = { type: "fade", durationFrames: 31 };
  assert.ok(validateCreativeVideo(spec).length > 0, "31 frames exceeds the schema maximum");
});
