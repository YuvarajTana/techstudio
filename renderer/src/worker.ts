import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { claimResource } from "./resource-lease.ts";
import {
  prepareRuntime,
  ROOT,
  RUNTIME,
  type RenderProgress,
} from "./render-lesson.ts";

const apiBase = process.env.TECKSTUDIO_API_URL ?? "http://127.0.0.1:5001";
const parsed = new URL(apiBase);
if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname))
  throw new Error("The local renderer requires a loopback API address.");
const runtime = await prepareRuntime();
const credential =
  process.env.LESSON_VIDEO_WORKER_SECRET ??
  (await fs.readFile(path.join(RUNTIME, "video-worker.key"), "utf8")).trim();
const workerId = `worker-${randomUUID()}`;
let stopping = false,
  child: ChildProcess | undefined;
function terminate(signal: NodeJS.Signals = "SIGTERM") {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}
process.on("SIGINT", () => {
  stopping = true;
  terminate();
});
process.on("SIGTERM", () => {
  stopping = true;
  terminate();
});
class WorkerApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request(route: string, payload: unknown = {}) {
  const response = await fetch(`${apiBase}/api/internal/lesson-video${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Teckstudio-Worker": credential,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new WorkerApiError(
      response.status,
      `Worker API ${route}: ${response.status} ${(await response.text()).slice(0, 350)}`,
    );
  return response.json();
}
const heartbeat = () =>
  request("/heartbeat", { worker_id: workerId, bundle_id: runtime.bundleId });
interface Job {
  job_id: string;
  attempt: number;
  lease_token: string;
  spec: unknown;
  plan: unknown;
  bundle_id: string;
  output_directory: string;
  timeout_seconds: number;
}
async function runJob(
  job: Job,
  resource: Awaited<ReturnType<typeof claimResource>>,
) {
  const input = path.join(
    RUNTIME,
    `video-input-${job.job_id}-${job.attempt}.json`,
  );
  await fs.writeFile(input, JSON.stringify(job), { mode: 0o600 });
  let current: RenderProgress = {
      progress: 0,
      renderedFrames: 0,
      stage: "Preparing lesson",
    },
    buffer = "",
    errorText = "",
    lostLease = false,
    timedOut = false;
  const payload = () => ({
    lease_token: job.lease_token,
    attempt: job.attempt,
    progress: current.progress,
    rendered_frames: current.renderedFrames,
    stage: current.stage,
  });
  // Credentials remain in the worker. The render child only needs local runtime paths.
  const childEnv = Object.fromEntries(
    ["PATH", "HOME", "TMPDIR", "SystemRoot"]
      .filter((k) => process.env[k])
      .map((k) => [k, process.env[k]]),
  );
  child = spawn(
    process.execPath,
    ["--import", "tsx", path.join(ROOT, "renderer/src/render-child.ts"), input],
    {
      cwd: ROOT,
      env: childEnv,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  child.stdout!.on("data", (chunk) => {
    buffer += String(chunk);
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const value = JSON.parse(line);
        if (typeof value.progress === "number") current = value;
      } catch {
        /* Library logs are not progress events. */
      }
    }
  });
  child.stderr!.on("data", (chunk) => {
    errorText = (errorText + String(chunk)).slice(-1800);
  });
  let pulseRunning: Promise<void> | undefined;
  const pulse = () => {
    if (pulseRunning) return;
    pulseRunning = (async () => {
      try {
        await heartbeat();
        await resource.renew();
        await request(`/jobs/${job.job_id}/progress`, payload());
      } catch {
        lostLease = true;
        terminate();
      }
    })().finally(() => {
      pulseRunning = undefined;
    });
  };
  const interval = setInterval(pulse, 5000);
  let force: NodeJS.Timeout | undefined;
  const timeout = setTimeout(() => {
    timedOut = true;
    terminate();
    force = setTimeout(() => terminate("SIGKILL"), 5000);
  }, job.timeout_seconds * 1000);
  const shutdownGuard = setInterval(() => {
    if (stopping || lostLease) {
      terminate();
      if (!force) force = setTimeout(() => terminate("SIGKILL"), 5000);
    }
  }, 1000);
  console.log(`Rendering job ${job.job_id}, attempt ${job.attempt}`);
  try {
    const exit = await new Promise<number | null>((resolve, reject) => {
      child!.once("error", reject);
      child!.once("close", resolve);
    });
    clearInterval(interval);
    if (pulseRunning) await pulseRunning;
    if (stopping || lostLease) return;
    if (exit !== 0 || timedOut)
      throw new Error(
        timedOut
          ? "Render exceeded its time limit."
          : errorText || `Render process exited with code ${exit}.`,
      );
    await request(`/jobs/${job.job_id}/complete`, payload());
    console.log(`Completed job ${job.job_id}`);
  } catch (error) {
    if (!stopping && !lostLease) {
      const message =
        error instanceof Error ? error.message : "Renderer failed";
      try {
        await request(`/jobs/${job.job_id}/fail`, {
          ...payload(),
          error: message.slice(0, 1900),
        });
      } catch {
        /* Expired or cancelled leases cannot report completion/failure. */
      }
      console.error(message);
    }
  } finally {
    clearInterval(interval);
    clearInterval(shutdownGuard);
    clearTimeout(timeout);
    if (force) clearTimeout(force);
    child = undefined;
    await fs.rm(input, { force: true });
  }
}
await fs.writeFile(
  path.join(RUNTIME, "video-worker.pid"),
  String(process.pid),
  { mode: 0o600 },
);
console.log(`Local lesson renderer started (${workerId}).`);
try {
  while (!stopping) {
    try {
      await heartbeat();
      const resource = await claimResource();
      try {
        const { job } = await request("/claim");
        if (job) await runJob(job, resource);
      } finally {
        await resource.release().catch(() => {});
      }
      if (!stopping) await sleep(2000);
    } catch (error) {
      if (!stopping) {
        console.error(
          error instanceof Error ? error.message : "Worker connection failed",
        );
        await sleep(3000);
      }
    }
  }
} finally {
  await fs.rm(path.join(RUNTIME, "video-worker.pid"), { force: true });
  console.log("Lesson renderer stopped. Unfinished leases recover on restart.");
}
