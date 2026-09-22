import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCreativeVideo } from "@teckstudio/lesson-video";
import { serveAssets } from "./asset-server.ts";

test("frozen asset bytes must match their declared checksum before any server opens", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "creative-asset-test-"),
  );
  try {
    const file = path.join(directory, "voice.wav");
    await fs.writeFile(file, "changed asset bytes");
    const spec = createCreativeVideo();
    spec.assets = [
      { id: "voice", kind: "audio", source: "uploaded", assetId: "owned" },
    ];
    await assert.rejects(serveAssets(spec, {}), /Missing frozen asset/);
    await assert.rejects(
      serveAssets(spec, {
        voice: { path: file, sha256: "a".repeat(64), mime_type: "image/png" },
      }),
      /Wrong media type/,
    );
    await assert.rejects(
      serveAssets(spec, {
        voice: { path: file, sha256: "a".repeat(64), mime_type: "audio/wav" },
      }),
      /checksum mismatch/,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
