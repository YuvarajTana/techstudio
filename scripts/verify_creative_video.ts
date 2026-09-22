import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createCreativeVideo,
  type CreativeScene,
} from "@teckstudio/lesson-video";
import {
  prepareRuntime,
  renderLesson,
  RUNTIME,
} from "../renderer/src/render-lesson.ts";
import type { AssetManifest } from "../renderer/src/asset-server.ts";

// Bounded artifact check; does not start any application server or download a model.
const directory = await fs.mkdtemp(path.join(RUNTIME, "creative-proof-"));
const audio = path.join(directory, "test-tone.wav");
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=330:sample_rate=24000:duration=2",
  "-c:a",
  "pcm_s16le",
  audio,
]);
const bytes = await fs.readFile(audio),
  sha = createHash("sha256").update(bytes).digest("hex");
const assets: AssetManifest = {
  voice: {
    path: audio,
    sha256: sha,
    mime_type: "audio/wav",
    duration_ms: 2000,
  },
};
const runtime = await prepareRuntime();
const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
const wrapper = path.join(directory, "chrome-local-only.sh");
await fs.writeFile(
  wrapper,
  `#!/bin/sh\nexec ${quote(runtime.browserExecutable)} --proxy-server=http://127.0.0.1:9 '--proxy-bypass-list=localhost;127.0.0.1' '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost' "$@"\n`,
  { mode: 0o700 },
);
const proofs = [];
for (const preset of ["landscape-1080p", "portrait-1080p"] as const) {
  const technical = preset === "landscape-1080p";
  const spec = createCreativeVideo(
    technical ? "How a cache saves time" : "Why plants need sunlight",
    preset,
  );
  spec.brand = {
    name: "TECKSTUDIO LEARNING",
    tagline: "Make one idea clear.",
    primaryColor: "#173d32",
    accentColor: "#ad6c2c",
  };
  spec.assets = [
    { id: "voice", kind: "audio", source: "uploaded", assetId: "test-tone" },
  ];
  const text =
    "This artifact uses a two-second test tone to verify audio transport.";
  const first: CreativeScene = {
    id: "opening",
    type: "title",
    title: spec.title,
    subtitle: technical
      ? "Keep frequently used answers close to the place they are needed."
      : "A plant uses light, water and carbon dioxide to make sugars.",
    durationFrames: 150,
    motion: "fade",
    narration: {
      text,
      assetId: "voice",
      durationFrames: 60,
      approvedTextHash: createHash("sha256").update(text).digest("hex"),
    },
    captions: [
      { startFrame: 0, endFrame: 60, text: "Audio transport test · 2 seconds" },
    ],
  };
  spec.scenes = [
    first,
    {
      id: "process",
      type: "process",
      title: technical ? "Follow a cache lookup" : "Follow the energy",
      steps: technical
        ? [
            "Ask for an item",
            "Check the cache",
            "Fetch and save a missing answer",
          ]
        : [
            "Leaves absorb light",
            "Roots take in water",
            "Sugars support growth",
          ],
      durationFrames: 150,
      motion: "slide",
    },
    {
      id: "recap",
      type: "recap",
      title: "Explain it in your own words",
      points: technical
        ? [
            "Nearby data can be faster to retrieve.",
            "Cached answers need a freshness policy.",
          ]
        : ["Sunlight supplies energy.", "Water and air provide materials."],
      nextTask: technical
        ? "Choose one result you would cache."
        : "Compare two plants with different access to light.",
      durationFrames: 150,
      motion: "none",
    },
  ];
  const output = path.join(directory, preset);
  await renderLesson(
    spec,
    output,
    { ...runtime, browserExecutable: wrapper },
    () => {},
    undefined,
    assets,
  );
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        path.join(output, "video.mp4"),
      ],
      { encoding: "utf8" },
    ),
  );
  const video = probe.streams.find((s: any) => s.codec_type === "video"),
    sound = probe.streams.find((s: any) => s.codec_type === "audio");
  if (
    video.width !== (technical ? 1920 : 1080) ||
    video.height !== (technical ? 1080 : 1920) ||
    video.r_frame_rate !== "30/1" ||
    sound?.codec_name !== "aac" ||
    Math.abs(Number(probe.format.duration) - 15) > 0.1
  )
    throw new Error("Creative render stream verification failed.");
  const srt = await fs.readFile(path.join(output, "captions.srt"), "utf8");
  if (!srt.includes("00:00:00,000 --> 00:00:02,000"))
    throw new Error("Caption timing mismatch.");
  await fs.writeFile(
    path.join(output, "spec.json"),
    JSON.stringify(spec, null, 2),
  );
  proofs.push({
    preset,
    output,
    width: video.width,
    height: video.height,
    duration: probe.format.duration,
    audio: sound.codec_name,
    restriction:
      "External browser networking blocked; loopback frozen media permitted",
    audioProof: "Synthetic tone; does not prove Kokoro voice quality",
  });
  console.log(`PASS ${preset}: 15 seconds, 30 fps, AAC and aligned SRT`);
}
await fs.writeFile(
  path.join(RUNTIME, "creative-video-results.json"),
  JSON.stringify(proofs, null, 2),
);
console.log(directory);
