import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  openBrowser,
  selectComposition,
  renderMedia,
  renderStill,
  makeCancelSignal,
} from "@remotion/renderer";
import { VERSION } from "remotion";
import {
  parseVideo,
  compileVideo,
  captionsToSrt,
} from "@teckstudio/lesson-video";
import { serveAssets, type AssetManifest } from "./asset-server.ts";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const RUNTIME = path.join(ROOT, ".local");
export interface RuntimeInfo {
  bundleId: string;
  serveUrl: string;
  browserExecutable: string;
  browserVersion: string;
  remotionVersion: string;
  fontHashes?: Record<string, string>;
}
export const hash = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");
/** Packaged font families whose latin files are bundled into the renderer. */
export const BUNDLED_FONT_PACKAGES = [
  "inter",
  "outfit",
  "jetbrains-mono",
  "playfair-display",
] as const;
async function fontHashes() {
  const require = createRequire(import.meta.url);
  const hashes: Record<string, string> = {};
  for (const name of BUNDLED_FONT_PACKAGES) {
    const fontRoot = path.dirname(
      require.resolve(`@fontsource/${name}/latin-400.css`),
    );
    const files = (await fs.readdir(path.join(fontRoot, "files")))
      .filter((file) => file.includes("-latin-") && /\.(woff2?|ttf)$/.test(file))
      .sort();
    for (const file of files) {
      hashes[file] = hash(await fs.readFile(path.join(fontRoot, "files", file)));
    }
  }
  return hashes;
}
async function sourceHash(fonts: Record<string, string>) {
  const parts: Buffer[] = [];
  async function walk(dir: string) {
    for (const item of (await fs.readdir(dir, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (["node_modules", "dist", "tests"].includes(item.name)) continue;
      const p = path.join(dir, item.name);
      if (item.isDirectory()) await walk(p);
      else if (!item.name.endsWith(".test.ts")) {
        parts.push(Buffer.from(path.relative(ROOT, p)), await fs.readFile(p));
      }
    }
  }
  await walk(path.join(ROOT, "packages"));
  await walk(path.join(ROOT, "renderer/src"));
  await walk(path.join(ROOT, "renderer/public"));
  parts.push(Buffer.from(JSON.stringify(fonts)));
  parts.push(await fs.readFile(path.join(ROOT, "package-lock.json")));
  return hash(Buffer.concat(parts));
}
export async function prepareRuntime(): Promise<RuntimeInfo> {
  await fs.mkdir(RUNTIME, { recursive: true });
  try {
    await fs.writeFile(
      path.join(RUNTIME, "video-worker.key"),
      randomBytes(32).toString("hex"),
      { mode: 0o600, flag: "wx" },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  // REMOTION_BROWSER_EXECUTABLE: use an installed Chrome/Chromium headless shell
  // instead of downloading one (offline machines, locked-down networks).
  const browser = await ensureBrowser({
    logLevel: "info",
    browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || null,
  });
  if (!("path" in browser))
    throw new Error(
      "Remotion browser is unavailable. Run npm run video:prepare with network access.",
    );
  const fonts = await fontHashes();
  await fs.mkdir(path.join(ROOT, "renderer/public"), { recursive: true });
  const bundleId = await sourceHash(fonts);
  const serveUrl = path.join(RUNTIME, "video-bundles", bundleId);
  try {
    await fs.access(path.join(serveUrl, "index.html"));
  } catch {
    await fs.mkdir(path.join(ROOT, "renderer/public"), { recursive: true });
    await bundle({
      entryPoint: path.join(ROOT, "renderer/src/index.ts"),
      outDir: serveUrl,
      rootDir: path.join(ROOT, "renderer"),
      publicDir: path.join(ROOT, "renderer/public"),
    });
  }
  const info = {
    bundleId,
    serveUrl,
    browserExecutable: browser.path,
    browserVersion: execFileSync(browser.path, ["--version"], {
      encoding: "utf8",
    }).trim(),
    remotionVersion: VERSION,
    fontHashes: fonts,
  };
  await fs.writeFile(path.join(serveUrl, "runtime.json"), JSON.stringify(info));
  const temp = path.join(RUNTIME, `video-runtime-${process.pid}.json`);
  await fs.writeFile(temp, JSON.stringify(info), { mode: 0o600 });
  await fs.rename(temp, path.join(RUNTIME, "video-runtime.json"));
  return info;
}
export async function loadRuntime(bundleId: string): Promise<RuntimeInfo> {
  if (!/^[a-f0-9]{64}$/.test(bundleId))
    throw new Error("Invalid bundle identity.");
  const serveUrl = path.join(RUNTIME, "video-bundles", bundleId);
  const info = JSON.parse(
    await fs.readFile(path.join(serveUrl, "runtime.json"), "utf8"),
  ) as RuntimeInfo;
  if (info.bundleId !== bundleId || info.remotionVersion !== VERSION)
    throw new Error(
      "This job requires a different renderer version. Restore its pinned runtime.",
    );
  return { ...info, serveUrl };
}
export interface RenderProgress {
  progress: number;
  renderedFrames: number;
  stage: string;
}
export async function renderLesson(
  value: unknown,
  directory: string,
  runtime: RuntimeInfo,
  progress: (p: RenderProgress) => void = () => {},
  signal?: AbortSignal,
  assetManifest: AssetManifest = {},
) {
  const spec = parseVideo(value),
    plan = compileVideo(spec);
  if (spec.schema === "creative-video/v2") {
    for (const scene of spec.scenes) {
      const narration = scene.narration;
      if (narration?.text.trim() && !narration.assetId)
        throw new Error("Attach narration audio or clear the draft script before rendering.");
      if (narration?.assetId) {
        if (narration.approvedTextHash !== hash(narration.text))
          throw new Error("Narration script changed. Regenerate or re-approve the audio before rendering.");
        const media = assetManifest[narration.assetId];
        if (!media) throw new Error("Narration snapshot is missing.");
        const measured = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", media.path], {encoding:"utf8",timeout:30000}));
        if (!Number.isFinite(measured) || measured <= 0 || Math.abs(Math.ceil(measured * 30) - narration.durationFrames!) > 1)
          throw new Error("Narration duration differs from its measured audio. Resolve the scene timing again.");
      }
    }
  }
  await fs.mkdir(directory, { recursive: true });
  const { cancelSignal, cancel } = makeCancelSignal();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) throw new Error("Render cancelled.");
  const assets = await serveAssets(spec, assetManifest);
  const inputProps = { spec, assetSources: assets.sources };
  let browser;
  try {
    browser = await openBrowser("chrome", {
      browserExecutable: runtime.browserExecutable,
      logLevel: "error",
    });
    const common = {
      serveUrl: runtime.serveUrl,
      inputProps,
      puppeteerInstance: browser,
      browserExecutable: runtime.browserExecutable,
      logLevel: "error" as const,
    };
    const composition = await selectComposition({
      ...common,
      id: "LessonVideo",
    });
    if (composition.durationInFrames !== plan.durationInFrames)
      throw new Error("Bundle metadata differs from the saved lesson.");
    await renderMedia({
      ...common,
      composition,
      codec: "h264",
      pixelFormat: "yuv420p",
      crf: 21,
      x264Preset: "veryfast",
      outputLocation: path.join(directory, "video.mp4"),
      concurrency: 2,
      cancelSignal,
      overwrite: false,
      onProgress: (p) =>
        progress({
          progress: Math.min(97, Math.round(p.progress * 95) + 2),
          renderedFrames: p.renderedFrames,
          stage:
            p.renderedFrames < plan.durationInFrames
              ? "Rendering frames"
              : "Encoding MP4",
        }),
    });
    if (signal?.aborted) throw new Error("Render cancelled.");
    progress({
      progress: 98,
      renderedFrames: plan.durationInFrames,
      stage: "Creating poster",
    });
    await renderStill({
      ...common,
      composition,
      frame: Math.min(60, plan.durationInFrames - 1),
      output: path.join(directory, "poster.png"),
      imageFormat: "png",
      overwrite: false,
      cancelSignal,
    });
    const manifest = {
      schema:
        spec.schema === "creative-video/v2"
          ? "creative-video-render/v2"
          : "lesson-video-render/v1",
      spec,
      plan,
      ...(spec.schema === "lesson-video/v1"
        ? { template: spec.template }
        : {
            assetHashes: assets.hashes,
            hasAudio: !!(
              spec.soundtrack || spec.scenes.some((s) => s.narration?.assetId)
            ),
          }),
      specHash: hash(JSON.stringify(spec)),
      bundleId: runtime.bundleId,
      remotionVersion: VERSION,
      browserVersion: runtime.browserVersion,
      fontHashes: runtime.fontHashes,
      videoSha256: hash(await fs.readFile(path.join(directory, "video.mp4"))),
      posterSha256: hash(await fs.readFile(path.join(directory, "poster.png"))),
    };
    if (spec.schema === "creative-video/v2") {
      await fs.writeFile(
        path.join(directory, "captions.srt"),
        captionsToSrt(spec),
      );
      await fs.writeFile(
        path.join(directory, "transcript.txt"),
        spec.scenes
          .map((s) => s.narration?.text ?? "")
          .filter(Boolean)
          .join("\n\n"),
      );
    }
    await fs.writeFile(
      path.join(directory, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    return manifest;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await browser?.close({ silent: true });
    await assets.close();
  }
}
