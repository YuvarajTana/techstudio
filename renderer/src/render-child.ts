import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { loadRuntime, renderLesson } from "./render-lesson.ts";
const controller = new AbortController();
process.on("SIGTERM", () => controller.abort());
process.on("SIGINT", () => controller.abort());
// A crashed worker closes IPC: do not leave an orphan renderer consuming resources.
process.on("disconnect", () => controller.abort());
try {
  const job = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  const runtime = await loadRuntime(job.bundle_id);
  const manifest = await renderLesson(
    job.spec,
    job.output_directory,
    runtime,
    (p) => process.stdout.write(JSON.stringify(p) + "\n"),
    controller.signal,
  );
  if (!isDeepStrictEqual(manifest.plan, job.plan))
    throw new Error("Saved timeline differs from the renderer timeline.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Render failed");
  process.exitCode = 1;
} finally {
  if (process.connected) process.disconnect();
}
