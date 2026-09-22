import fs from "node:fs/promises";
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import type { VideoSpec } from "@teckstudio/lesson-video";

export type AssetManifest = Record<
  string,
  { path: string; sha256: string; mime_type: string; duration_ms?: number }
>;

/** Load and checksum frozen bytes before Chromium receives any asset URL. */
export async function serveAssets(
  spec: VideoSpec,
  manifest: AssetManifest = {},
) {
  const assets = spec.schema === "creative-video/v2" ? spec.assets : [];
  const buffers = new Map<string, { bytes: Buffer; mime: string }>();
  let size = 0;
  for (const asset of assets) {
    const item = manifest[asset.id];
    if (!item || !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error(`Missing frozen asset: ${asset.id}`);
    if (!item.mime_type.startsWith(`${asset.kind}/`))
      throw new Error(`Wrong media type: ${asset.id}`);
    const stat = await fs.stat(item.path);
    size += stat.size;
    if (!stat.isFile() || size > 512 * 1024 * 1024)
      throw new Error("Snapshot media exceeds the 512 MiB render limit.");
    const bytes = await fs.readFile(item.path);
    if (createHash("sha256").update(bytes).digest("hex") !== item.sha256)
      throw new Error(`Snapshot checksum mismatch: ${asset.id}`);
    buffers.set(asset.id, { bytes, mime: item.mime_type });
  }
  if (!assets.length) return { sources: {}, hashes: {}, close: async () => {} };
  const token = randomBytes(24).toString("hex");
  const server = createServer((req, res) => {
    const match = req.url?.match(new RegExp(`^/${token}/([A-Za-z0-9_-]+)$`));
    const item = match && buffers.get(match[1]);
    if (!item || !["GET", "HEAD"].includes(req.method ?? "")) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", item.mime);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end =
      range && range[2]
        ? Math.min(Number(range[2]), item.bytes.length - 1)
        : item.bytes.length - 1;
    if (start > end || start >= item.bytes.length) {
      res.writeHead(416).end();
      return;
    }
    if (range) {
      res.statusCode = 206;
      res.setHeader(
        "Content-Range",
        `bytes ${start}-${end}/${item.bytes.length}`,
      );
    }
    res.setHeader("Content-Length", end - start + 1);
    res.end(
      req.method === "HEAD" ? undefined : item.bytes.subarray(start, end + 1),
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Cannot bind private asset server.");
  return {
    sources: Object.fromEntries(
      assets.map((a) => [
        a.id,
        `http://127.0.0.1:${address.port}/${token}/${a.id}`,
      ]),
    ),
    hashes: Object.fromEntries(
      assets.map((a) => [a.id, manifest[a.id].sha256]),
    ),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((e) => (e ? reject(e) : resolve()));
        server.closeAllConnections();
      }),
  };
}
