import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCreativeVideo,
  compileVideo,
  compileLesson,
  validateCreativeVideo,
  captionsToSrt,
  parseVideo,
} from "../src/index.ts";
import example from "../src/example.json";

test("creative orientation and legacy timelines compile independently", () => {
  assert.deepEqual(compileVideo(example), compileLesson(example));
  const landscape = createCreativeVideo("Caching");
  const portrait = createCreativeVideo("Plant growth", "portrait-1080p");
  assert.deepEqual(
    [compileVideo(landscape).width, compileVideo(landscape).height],
    [1920, 1080],
  );
  assert.deepEqual(
    [compileVideo(portrait).width, compileVideo(portrait).height],
    [1080, 1920],
  );
  assert.equal(compileVideo(portrait).durationInFrames, 450);
  assert.equal(parseVideo(portrait).schema, "creative-video/v2");
});
test("measured narration extends a scene, never accelerates or truncates it", () => {
  const spec = createCreativeVideo();
  spec.assets = [
    { id: "voice", kind: "audio", source: "uploaded", assetId: "owned-voice" },
  ];
  spec.scenes[0].narration = {
    text: "A full explanation",
    assetId: "voice",
    durationFrames: 600,
    approvedTextHash: "a".repeat(64),
  };
  assert.equal(compileVideo(spec).durationInFrames, 615);
  spec.scenes[0].narration.durationFrames = 2700;
  assert.ok(validateCreativeVideo(spec).some((e) => e.includes("15–90")));
});
test("media references, measured audio and caption bounds are required", () => {
  const spec = createCreativeVideo();
  spec.scenes[0].narration = { text: "Draft", assetId: "missing" };
  assert.ok(
    validateCreativeVideo(spec).some((e) => e.includes("existing audio")),
  );
  assert.ok(
    validateCreativeVideo(spec).some((e) => e.includes("measured duration")),
  );
  delete spec.scenes[0].narration;
  spec.scenes[0].captions = [
    { startFrame: 0, endFrame: 100, text: "First" },
    { startFrame: 90, endFrame: 120, text: "Overlap" },
  ];
  assert.ok(
    validateCreativeVideo(spec).some((e) => e.includes("non-overlapping")),
  );
  spec.scenes[0].captions = [
    { startFrame: 0, endFrame: 451, text: "Too long" },
  ];
  assert.ok(
    validateCreativeVideo(spec).some((e) => e.includes("inside the scene")),
  );
});
test("new scenes validate and captions export on the resolved global timeline", () => {
  const spec = createCreativeVideo();
  spec.scenes = [
    {
      id: "steps",
      type: "process",
      title: "A process",
      steps: ["Observe", "Explain"],
      durationFrames: 450,
      captions: [{ startFrame: 0, endFrame: 60, text: "Observe" }],
    },
    {
      id: "cta",
      type: "cta",
      title: "Try it",
      body: "Your turn",
      action: "Practice",
      contact: "",
      durationFrames: 150,
      captions: [{ startFrame: 30, endFrame: 90, text: "Your turn" }],
    },
  ];
  assert.deepEqual(validateCreativeVideo(spec), []);
  assert.match(captionsToSrt(spec), /00:00:16,000 --> 00:00:18,000\nYour turn/);
  assert.equal(captionsToSrt(parseVideo(example)), "");
});
