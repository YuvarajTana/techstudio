import { prepareRuntime } from "./render-lesson.ts";
const runtime = await prepareRuntime();
console.log(
  `Renderer ready: Remotion ${runtime.remotionVersion}, ${runtime.browserVersion}, bundle ${runtime.bundleId.slice(0, 12)}`,
);
