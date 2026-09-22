import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseVideo } from "@teckstudio/lesson-video";
import { claimResource } from "./resource-lease.ts";
import { prepareRuntime, renderLesson } from "./render-lesson.ts";
const { values } = parseArgs({
  options: {
    spec: { type: "string" },
    out: { type: "string" },
    assets: { type: "string" },
    overwrite: { type: "boolean", default: false },
  },
});
if (!values.spec || !values.out || path.extname(values.out) !== ".mp4")
  throw new Error(
    "Usage: npm run video:render -- --spec video.json --out video.mp4 [--assets frozen-assets.json] [--overwrite]",
  );
const spec = parseVideo(JSON.parse(await fs.readFile(values.spec, "utf8")));
const assetManifest = values.assets
  ? JSON.parse(await fs.readFile(values.assets, "utf8"))
  : {};
const output = path.resolve(values.out),
  stem = output.slice(0, -4);
const outputs = [output, `${stem}.poster.png`, `${stem}.manifest.json`];
const names = ["video.mp4", "poster.png", "manifest.json"];
if (spec.schema === "creative-video/v2") {
  outputs.push(`${stem}.captions.srt`, `${stem}.transcript.txt`);
  names.push("captions.srt", "transcript.txt");
}
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
let resource: Awaited<ReturnType<typeof claimResource>> | undefined;
let renewing = false;
const renewal = setInterval(async () => {
  if (renewing) return;
  renewing = true;
  try {
    await resource?.renew();
  } catch {
    controller.abort();
  } finally {
    renewing = false;
  }
}, 5000);
try {
  resource = await claimResource(true);
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
    assetManifest,
  );
  for (const [i, name] of names.entries()) {
    if (values.overwrite) await fs.rename(path.join(staging, name), outputs[i]);
    else await fs.link(path.join(staging, name), outputs[i]);
  }
  console.log(`Rendered ${output}`);
} finally {
  clearInterval(renewal);
  await resource?.release().catch(() => {});
  await fs.rm(staging, { recursive: true, force: true });
  process.off("SIGINT", abort);
  process.off("SIGTERM", abort);
}
