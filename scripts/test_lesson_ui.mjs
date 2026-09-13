// Component interaction checks. Remotion rendering is verified separately with real MP4s.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const actualPlayer = process.argv.includes("--actual-player");
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const output = path.join(rootDir, ".local/tests/lesson-editor.mjs");
await fs.mkdir(path.dirname(output), { recursive: true });
await build({
  entryPoints: [
    path.join(
      rootDir,
      "frontend/src/features/lesson-video/LessonVideoEditor.tsx",
    ),
  ],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  loader: { ".css": "empty" },
  external: ["react", "react-dom", "react-dom/*", "react-router-dom"],
  define: { "import.meta.env.VITE_API_BASE_URL": '"http://127.0.0.1:5001"' },
  plugins: actualPlayer
    ? []
    : [
        {
          name: "preview-boundary",
          setup(builder) {
            builder.onResolve(
              { filter: /^(@remotion\/player|@teckstudio\/video-scenes)$/ },
              (args) => ({ path: args.path, namespace: "preview-test" }),
            );
            builder.onLoad(
              { filter: /.*/, namespace: "preview-test" },
              (args) => ({
                loader: "js",
                resolveDir: rootDir,
                contents:
                  args.path === "@remotion/player"
                    ? `import React from 'react'; export const Player=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({seekTo(){}}));return React.createElement('div',{'data-preview':true},String(props.durationInFrames));});`
                    : `export function LessonVideo(){return null;}`,
              }),
            );
          },
        },
      ],
});
const dom = new JSDOM(
  '<!doctype html><html><body><div id="app"></div></body></html>',
  { url: "http://127.0.0.1:5173", pretendToBeVisual: true },
);
for (const name of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "Event",
  "MouseEvent",
  "localStorage",
])
  globalThis[name] = dom.window[name];
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
  dom.window,
);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
  dom.window,
);
Object.defineProperty(document, "fonts", {
  value: { load: async () => [], ready: Promise.resolve() },
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
dom.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const { default: Editor } = await import(output);
const example = JSON.parse(
  await fs.readFile(
    path.join(rootDir, "packages/lesson-video/src/example.json"),
    "utf8",
  ),
);
let saved = structuredClone(example),
  revision = 1,
  conflict = false;
const calls = [];
let jobs = [];
globalThis.fetch = async (url, options = {}) => {
  const pathname = new URL(url).pathname;
  const body = options.body ? JSON.parse(options.body) : null;
  calls.push({ path: pathname, method: options.method ?? "GET", body });
  let data,
    status = 200;
  if (pathname.endsWith("/lesson-video")) {
    if (options.method === "PUT") {
      if (conflict) {
        data = { detail: "Save conflict: keep your local draft." };
        status = 409;
      } else {
        saved = body.spec;
        revision++;
      }
    }
    if (!data) data = { project_id: "test", revision, spec: saved };
  } else if (pathname.endsWith("/video-renders"))
    data = { jobs, has_more: false, worker: { online: true } };
  else if (pathname.endsWith("/render/remotion")) {
    jobs = [
      {
        job_id: "render-1",
        status: "completed",
        progress: 100,
        stage: "Ready",
        revision,
        attempt: 1,
        download_url: "/api/video/download/render-1",
      },
    ];
    data = jobs[0];
  } else throw new Error(`Unexpected request ${pathname}`);
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};
localStorage.setItem("teckstudio_auth_token", "test-token");
const root = createRoot(document.getElementById("app"));
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
const click = async (label) => {
  const button = [...document.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  );
  assert.ok(button, `Missing button ${label}`);
  await React.act(async () => {
    button.click();
    await settle();
  });
};
const field = (label) => {
  const item = [...document.querySelectorAll("label")].find(
    (l) => l.querySelector("span")?.textContent === label,
  );
  assert.ok(item, `Missing field ${label}`);
  return item.querySelector("input,textarea");
};
const input = async (label, value) => {
  const element = field(label);
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
  });
};
try {
  await React.act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/lesson-video/test"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/lesson-video/:projectId",
            element: React.createElement(Editor),
          }),
        ),
      ),
    );
    await settle();
  });
  if (actualPlayer)
    assert.ok(document.body.textContent.includes("Follow one API request"));
  else
    assert.equal(document.querySelector("[data-preview]").textContent, "1620");
  await input("Scene title", "Edited outcome");
  assert.ok(document.body.textContent.includes("Unsaved changes"));
  await click("Render MP4");
  const writes = calls.filter((c) => ["PUT", "POST"].includes(c.method));
  assert.equal(writes[0].method, "PUT");
  assert.equal(writes[1].path, "/api/video/render/remotion");
  assert.equal(writes[1].body.expected_revision, 2);
  assert.equal(saved.scenes[0].title, "Edited outcome");
  console.log("PASS editing and save-before-render with the saved revision");
  await input("Duration (seconds)", "0");
  assert.ok(document.body.textContent.includes("Review these fields"));
  assert.equal(
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Render MP4",
    ).disabled,
    true,
  );
  console.log("PASS invalid timing blocks preview and render");
  await input("Duration (seconds)", "6");
  await input("Scene title", "Keep this local edit");
  conflict = true;
  const before = calls.filter((c) =>
    c.path.endsWith("/render/remotion"),
  ).length;
  await click("Render MP4");
  assert.equal(field("Scene title").value, "Keep this local edit");
  assert.ok(document.body.textContent.includes("Save conflict"));
  assert.equal(
    calls.filter((c) => c.path.endsWith("/render/remotion")).length,
    before,
  );
  console.log("PASS save conflict preserves the draft and blocks submission");
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
}
