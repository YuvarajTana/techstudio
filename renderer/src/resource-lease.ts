import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { RUNTIME } from "./render-lesson.ts";

export async function claimResource(allowStandalone = false) {
  const base = process.env.TECKSTUDIO_API_URL ?? "http://127.0.0.1:5001";
  const url = new URL(base);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error("Local resource API must use loopback HTTP.");
  const owner = `renderer-${randomUUID()}`;
  let credential = process.env.LESSON_VIDEO_WORKER_SECRET;
  if (!credential) {
    try {
      credential = (
        await fs.readFile(path.join(RUNTIME, "video-worker.key"), "utf8")
      ).trim();
    } catch {
      /* Claim still probes a running managed stack. */
    }
  }
  let token: string | undefined;
  const request = async (action: string, method = "POST") => {
    const response = await fetch(
      `${base}/api/internal/local-resource/${action}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Teckstudio-Worker": credential ?? "",
        },
        body: JSON.stringify({
          owner,
          lease_key: "heavy-compute",
          ...(token ? { token } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw new Error(
        `Cannot ${action} local compute lease (${response.status}): ${(await response.text()).slice(0, 300)}`,
      );
    return response.status === 204 ? {} : response.json();
  };
  try {
    token = (await request("claim")).token;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause?.code;
    if (allowStandalone && cause === "ECONNREFUSED")
      return { renew: async () => {}, release: async () => {}, managed: false };
    throw error;
  }
  return {
    renew: async () => {
      await request("renew");
    },
    release: async () => {
      await request("release", "DELETE");
    },
    managed: true,
  };
}
