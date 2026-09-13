import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseLesson } from "@teckstudio/lesson-video";
import { prepareRuntime, renderLesson } from "./render-lesson.ts";
const { values } = parseArgs({
  options: {
    spec: { type: "string" },
    out: { type: "string" },
    overwrite: { type: "boolean", default: false },
  },
});
if (!values.spec || !values.out || path.extname(values.out) !== ".mp4")
  throw new Error(
    "Usage: npm run video:render -- --spec lesson.json --out video.mp4 [--overwrite]",
  );
const spec = parseLesson(JSON.parse(await fs.readFile(values.spec, "utf8")));
const output = path.resolve(values.out),
  stem = output.slice(0, -4);
const outputs = [output, `${stem}.poster.png`, `${stem}.manifest.json`];
if (!values.overwrite)
  for (const file of outputs) {
    try {
      await fs.access(file);
    } catch {
      continue;
    }
    throw new Error(
      `Output exists: ${file}. Choose another name or pass --overwrite.`,
    );
  }
await fs.mkdir(path.dirname(output), { recursive: true });
const staging = await fs.mkdtemp(path.join(path.dirname(output), ".render-"));
const controller = new AbortController();
const abort = () => controller.abort();
process.on("SIGINT", abort);
process.on("SIGTERM", abort);
try {
  const runtime = await prepareRuntime();
  let last = -1;
  await renderLesson(
    spec,
    staging,
    runtime,
    (p) => {
      const bucket = Math.floor(p.progress / 10);
      if (bucket !== last) {
        last = bucket;
        console.log(`${p.progress}% ${p.stage}`);
      }
    },
    controller.signal,
  );
  for (const [i, name] of [
    "video.mp4",
    "poster.png",
    "manifest.json",
  ].entries()) {
    if (values.overwrite) await fs.rename(path.join(staging, name), outputs[i]);
    else await fs.link(path.join(staging, name), outputs[i]);
  }
  console.log(`Rendered ${output}`);
} finally {
  await fs.rm(staging, { recursive: true, force: true });
  process.off("SIGINT", abort);
  process.off("SIGTERM", abort);
}
