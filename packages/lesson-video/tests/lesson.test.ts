import assert from "node:assert/strict";
import { test } from "node:test";
import example from "../src/example.json";
import {
  compileLesson,
  parseLesson,
  validateLesson,
  sceneAtFrame,
  diagramStepAtFrame,
} from "../src/index.ts";
test("sample boundaries and arbitrary seeking", () => {
  const plan = compileLesson(example);
  assert.equal(plan.durationInFrames, 1620);
  assert.deepEqual(
    plan.scenes.map((s) => s.startFrame),
    [0, 180, 600, 1050, 1350],
  );
  assert.deepEqual(
    [1619, 0, 180, 599, 600, 1620].map((f) => sceneAtFrame(plan, f)),
    [4, 0, 1, 1, 2, -1],
  );
  const scene = parseLesson(example).scenes[1];
  assert.equal(scene.type, "diagram");
  if (scene.type === "diagram")
    assert.deepEqual(
      [300, 0, 180, 90].map((f) => diagramStepAtFrame(scene, f).atFrame),
      [270, 0, 180, 90],
    );
});
test("reject broken references, duplicate IDs, bad timings and unsupported content", () => {
  for (const mutate of [
    (s: any) => {
      s.scenes[1].edges[0].to = "missing";
    },
    (s: any) => {
      s.scenes[1].steps[0].atFrame = 1;
    },
    (s: any) => {
      s.scenes[3].revealAtFrame = 300;
    },
    (s: any) => {
      s.scenes[1].id = s.scenes[0].id;
    },
    (s: any) => {
      s.scenes[0].durationFrames = -1;
    },
    (s: any) => {
      s.narration.mode = "tts";
    },
    (s: any) => {
      s.output.preset = "4k";
    },
    (s: any) => {
      s.scenes[0].code = "alert(1)";
    },
  ]) {
    const input = structuredClone(example);
    mutate(input);
    assert.ok(validateLesson(input).length);
  }
});
