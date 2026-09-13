import assert from "node:assert/strict";
import { test } from "node:test";
import { loadRuntime } from "./render-lesson.ts";
test("runtime lookup rejects paths outside the bundle cache", async () => {
  await assert.rejects(loadRuntime("../../etc"), /Invalid bundle identity/);
});
