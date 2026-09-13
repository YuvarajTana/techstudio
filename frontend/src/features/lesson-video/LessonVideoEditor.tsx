import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Player, type PlayerRef } from "@remotion/player";
import { LessonVideo } from "@teckstudio/video-scenes";
import {
  compileLesson,
  parseLesson,
  validateLesson,
  type LessonVideoSpec,
  type LessonScene,
} from "@teckstudio/lesson-video";
import { apiFetch, apiJson } from "../../services/apiClient";
import SceneFields, { TextField } from "./SceneFields";
import { newScene } from "./sceneFactory";
import "./lesson-video.css";

interface Document {
  project_id: string;
  revision: number;
  spec: LessonVideoSpec;
}
interface Job {
  job_id: string;
  status: string;
  stage: string;
  progress: number;
  revision: number;
  error?: string;
  download_url?: string;
  attempt: number;
}
interface History {
  jobs: Job[];
  has_more: boolean;
  worker: { online: boolean };
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export default function LessonVideoEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const player = useRef<PlayerRef>(null);
  const importer = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<LessonVideoSpec | null>(null),
    [saved, setSaved] = useState(""),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [history, setHistory] = useState<History>({
      jobs: [],
      has_more: false,
      worker: { online: false },
    }),
    [page, setPage] = useState(0);
  const [sceneType, setSceneType] = useState<LessonScene["type"]>("diagram");
  const submission = useRef<{ revision: number; key: string } | null>(null);
  const errors = useMemo(() => (draft ? validateLesson(draft) : []), [draft]);
  const plan = useMemo(
    () => (draft && errors.length === 0 ? compileLesson(draft) : null),
    [draft, errors],
  );
  const dirty = !!draft && JSON.stringify(draft) !== saved;
  const load = useCallback(async () => {
    try {
      const result = await apiJson<Document>(
        `/api/projects/${projectId}/lesson-video`,
      );
      const spec = parseLesson(result.spec);
      setDraft(spec);
      setSaved(JSON.stringify(spec));
      setRevision(result.revision);
      setSelected(0);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    setDraft,
    setSaved,
    setRevision,
    setSelected,
    setError,
    setLoading,
  ]);
  const refresh = useCallback(async () => {
    try {
      setHistory(
        await apiJson<History>(
          `/api/projects/${projectId}/video-renders?offset=${page * 20}&limit=20`,
        ),
      );
    } catch (e) {
      setError(message(e));
    }
  }, [projectId, page]);
  useEffect(() => {
    const controller = new AbortController();
    apiJson<Document>(`/api/projects/${projectId}/lesson-video`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        const spec = parseLesson(result.spec);
        setDraft(spec);
        setSaved(JSON.stringify(spec));
        setRevision(result.revision);
        setSelected(0);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [projectId]);
  useEffect(() => {
    const controller = new AbortController();
    apiJson<History>(
      `/api/projects/${projectId}/video-renders?offset=${page * 20}&limit=20`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setHistory(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [projectId, page]);
  const active = history.jobs.some(
    (j) => j.status === "queued" || j.status === "processing",
  );
  useEffect(() => {
    if (!active && !busy) return;
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [active, busy, refresh]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  async function saveDraft() {
    if (!draft) throw new Error("No lesson is loaded.");
    if (!dirty) return revision;
    const spec = parseLesson(draft);
    const result = await apiJson<Document>(
      `/api/projects/${projectId}/lesson-video`,
      {
        method: "PUT",
        body: JSON.stringify({ expected_revision: revision, spec }),
      },
    );
    setSaved(JSON.stringify(spec));
    setRevision(result.revision);
    return result.revision;
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const rev = await saveDraft();
      setNotice(`Saved revision ${rev}.`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function render() {
    setBusy(true);
    setError("");
    try {
      const rev = await saveDraft();
      if (submission.current?.revision !== rev)
        submission.current = { revision: rev, key: crypto.randomUUID() };
      await apiJson("/api/video/render/remotion", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          expected_revision: rev,
          idempotency_key: submission.current.key,
        }),
      });
      submission.current = null;
      setPage(0);
      await refresh();
      setNotice(
        "Render queued. You can keep editing; the saved revision is frozen for this video.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function download(job: Job, kind: "video" | "poster" | "manifest") {
    try {
      const response = await apiFetch(
        kind === "video"
          ? `/api/video/download/${job.job_id}`
          : `/api/video/render/${job.job_id}/artifacts/${kind}`,
      );
      if (!response.ok)
        throw new Error(
          "Artifact is unavailable or you no longer have access.",
        );
      downloadBlob(
        await response.blob(),
        `lesson-${job.job_id}.${kind === "video" ? "mp4" : kind === "poster" ? "png" : "json"}`,
      );
    } catch (e) {
      setError(message(e));
    }
  }
  async function cancel(job: Job) {
    try {
      await apiJson(`/api/video/render/${job.job_id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError(message(e));
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024)
        throw new Error("Choose a lesson JSON file smaller than 1 MiB.");
      const spec = parseLesson(JSON.parse(await file.text()));
      setDraft(spec);
      setSelected(0);
      setNotice("Imported into your draft. Save to keep these changes.");
      setError("");
    } catch (e) {
      setError(message(e));
    }
    if (importer.current) importer.current.value = "";
  }
  const exportDraft = () => {
    if (draft)
      downloadBlob(
        new Blob([JSON.stringify(draft, null, 2)], {
          type: "application/json",
        }),
        "lesson-draft.json",
      );
  };
  function select(index: number) {
    setSelected(index);
    if (plan) player.current?.seekTo(plan.scenes[index].startFrame);
  }
  function changeScene(scene: LessonScene) {
    setDraft((old) =>
      old
        ? {
            ...old,
            scenes: old.scenes.map((s) => (s.id === scene.id ? scene : s)),
          }
        : old,
    );
  }
  function move(direction: number) {
    if (!draft) return;
    const next = selected + direction;
    if (next < 0 || next >= draft.scenes.length) return;
    const scenes = [...draft.scenes];
    [scenes[selected], scenes[next]] = [scenes[next], scenes[selected]];
    setDraft({ ...draft, scenes });
    setSelected(next);
  }
  if (loading)
    return (
      <main className="lv">
        <div className="lv-loading">Loading your lesson…</div>
      </main>
    );
  if (!draft)
    return (
      <main className="lv">
        <div className="lv-loading">
          <h1>Unable to open lesson</h1>
          <p role="alert">{error}</p>
          <button onClick={() => navigate("/")}>Back to projects</button>
          <button onClick={() => void load()}>Retry</button>
        </div>
      </main>
    );
  const scene = draft.scenes[Math.min(selected, draft.scenes.length - 1)];
  return (
    <main className="lv">
      <header className="lv-header">
        <button
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Leave without saving your local changes?")
            )
              navigate("/");
          }}
        >
          ← Projects
        </button>
        <div>
          <div className="lv-eyebrow">TECKSTUDIO / LESSON VIDEO</div>
          <h1>{draft.title}</h1>
        </div>
        <div className="lv-actions">
          <span className={dirty ? "lv-unsaved" : "lv-saved"}>
            {dirty ? "Unsaved changes" : `Saved · v${revision}`}
          </span>
          <button
            disabled={busy || errors.length > 0}
            onClick={() => void save()}
          >
            Save
          </button>
          <button
            className="lv-primary"
            disabled={busy || errors.length > 0}
            onClick={() => void render()}
          >
            {busy ? "Working…" : "Render MP4"}
          </button>
        </div>
      </header>
      {error && (
        <div className="lv-error" role="alert">
          {error}
          <div className="lv-inline">
            <button onClick={exportDraft}>Export local draft</button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Replace your local draft with the saved version?",
                  )
                )
                  void load();
              }}
            >
              Reload saved version
            </button>
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        </div>
      )}
      {notice && (
        <div className="lv-notice" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <div className="lv-layout">
        <aside className="lv-scenes">
          <div className="lv-field-heading">
            <h2>Storyboard</h2>
            <span>{draft.scenes.length} scenes</span>
          </div>
          <ol>
            {draft.scenes.map((s, i) => (
              <li key={s.id}>
                <button
                  className={i === selected ? "selected" : ""}
                  onClick={() => select(i)}
                >
                  <span className="lv-scene-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <b>{"title" in s ? s.title : s.prompt}</b>
                    <small>
                      {s.type} · {(s.durationFrames / 30).toFixed(1)}s
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <fieldset disabled={busy}>
            <label className="lv-field">
              <span>Add a scene</span>
              <select
                value={sceneType}
                onChange={(e) =>
                  setSceneType(e.target.value as LessonScene["type"])
                }
              >
                <option value="title">Title / outcome</option>
                <option value="diagram">Diagram walkthrough</option>
                <option value="question">Question / reveal</option>
                <option value="recap">Recap</option>
              </select>
            </label>
            <button
              disabled={draft.scenes.length >= 30}
              onClick={() => {
                setDraft({
                  ...draft,
                  scenes: [...draft.scenes, newScene(sceneType)],
                });
                setSelected(draft.scenes.length);
              }}
            >
              + Add scene
            </button>
          </fieldset>
          <div className="lv-import">
            <input
              ref={importer}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
            <button disabled={busy} onClick={() => importer.current?.click()}>
              Import JSON
            </button>
            <button onClick={exportDraft}>Export JSON</button>
          </div>
          <p className="lv-small">
            Landscape · 1080p · 30 fps
            <br />
            Local rendering · Silent video
          </p>
        </aside>
        <section className="lv-main">
          <div className="lv-preview-header">
            <h2>Lesson preview</h2>
            <span>
              {plan
                ? `${(plan.durationInFrames / 30).toFixed(1)} seconds`
                : "Fix the draft to preview"}
            </span>
          </div>
          <div className="lv-preview">
            {plan ? (
              <Player
                ref={player}
                component={LessonVideo}
                inputProps={{ spec: draft }}
                durationInFrames={plan.durationInFrames}
                fps={plan.fps}
                compositionWidth={plan.width}
                compositionHeight={plan.height}
                style={{ width: "100%" }}
                controls
                clickToPlay={false}
              />
            ) : (
              <div className="lv-validation" role="alert">
                <h3>Review these fields</h3>
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <section className="lv-metadata">
            <details>
              <summary>Audience, objective and source notes</summary>
              <fieldset disabled={busy}>
                <TextField
                  label="Lesson title"
                  value={draft.title}
                  limit={160}
                  onChange={(title) => setDraft({ ...draft, title })}
                />
                <div className="lv-inline">
                  <label className="lv-field">
                    <span>Audience</span>
                    <select
                      value={draft.audience}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          audience: e.target
                            .value as LessonVideoSpec["audience"],
                        })
                      }
                    >
                      <option value="students">Students</option>
                      <option value="graduates">College graduates</option>
                      <option value="professionals">Professionals</option>
                    </select>
                  </label>
                  <TextField
                    label="Subject / domain"
                    value={draft.domain}
                    limit={80}
                    onChange={(domain) => setDraft({ ...draft, domain })}
                  />
                </div>
                <p className="lv-small">
                  Adapt your wording and practice to the audience. This label
                  does not rewrite the lesson.
                </p>
                <TextField
                  label="Learning objectives (one per line)"
                  value={draft.objectives.join("\n")}
                  area
                  limit={1445}
                  onChange={(text) =>
                    setDraft({ ...draft, objectives: text.split("\n") })
                  }
                />
                <TextField
                  label="Prerequisites (one per line)"
                  value={draft.prerequisites.join("\n")}
                  area
                  limit={1900}
                  onChange={(text) =>
                    setDraft({
                      ...draft,
                      prerequisites: text ? text.split("\n") : [],
                    })
                  }
                />
                <TextField
                  label="Sources and teaching notes (one per line)"
                  value={draft.sourceNotes.join("\n")}
                  area
                  limit={4800}
                  onChange={(text) =>
                    setDraft({
                      ...draft,
                      sourceNotes: text ? text.split("\n") : [],
                    })
                  }
                />
              </fieldset>
            </details>
          </section>
          <section className="lv-history">
            <div className="lv-field-heading">
              <h2>Render history</h2>
              <button onClick={() => void refresh()}>Refresh</button>
            </div>
            <p
              className={
                history.worker.online ? "lv-worker-online" : "lv-worker-offline"
              }
            >
              {history.worker.online
                ? "● Local renderer online"
                : "○ Local renderer offline — start the local stack to process queued videos."}
            </p>
            {history.jobs.length === 0 && (
              <div className="lv-empty">
                Your rendered videos will appear here. Save a lesson and choose
                Render MP4.
              </div>
            )}
            {history.jobs.map((job) => (
              <article className="lv-job" key={job.job_id}>
                <div className="lv-job-title">
                  <b>
                    Revision {job.revision} · {job.stage}
                  </b>
                  <span>{job.progress}%</span>
                </div>
                <progress
                  aria-label={`Render revision ${job.revision}`}
                  value={job.progress}
                  max={100}
                />
                {job.error && (
                  <p role="alert" className="lv-job-error">
                    {job.error}
                  </p>
                )}
                <div className="lv-inline">
                  <span className="lv-small">
                    {job.status} · attempt {job.attempt}
                  </span>
                  {["queued", "processing"].includes(job.status) && (
                    <button onClick={() => void cancel(job)}>Cancel</button>
                  )}
                  {job.status === "completed" && job.download_url && (
                    <>
                      <button
                        className="lv-primary"
                        onClick={() => void download(job, "video")}
                      >
                        Download MP4
                      </button>
                      <button onClick={() => void download(job, "poster")}>
                        Poster
                      </button>
                      <button onClick={() => void download(job, "manifest")}>
                        Manifest
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {(page > 0 || history.has_more) && (
              <div className="lv-inline">
                <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Newer
                </button>
                <span>Page {page + 1}</span>
                <button
                  disabled={!history.has_more}
                  onClick={() => setPage(page + 1)}
                >
                  Older
                </button>
              </div>
            )}
          </section>
        </section>
        <aside className="lv-properties">
          <div className="lv-field-heading">
            <h2>Scene {selected + 1}</h2>
            <span>{scene.type}</span>
          </div>
          <fieldset disabled={busy}>
            <div className="lv-inline lv-scene-tools">
              <button
                aria-label="Move scene earlier"
                disabled={selected === 0}
                onClick={() => move(-1)}
              >
                ↑
              </button>
              <button
                aria-label="Move scene later"
                disabled={selected === draft.scenes.length - 1}
                onClick={() => move(1)}
              >
                ↓
              </button>
              <button
                disabled={draft.scenes.length >= 30}
                onClick={() => {
                  const copy = {
                    ...structuredClone(scene),
                    id: `scene-${crypto.randomUUID()}`,
                  };
                  const scenes = [...draft.scenes];
                  scenes.splice(selected + 1, 0, copy);
                  setDraft({ ...draft, scenes });
                  setSelected(selected + 1);
                }}
              >
                Duplicate
              </button>
              <button
                disabled={draft.scenes.length <= 1}
                onClick={() => {
                  setDraft({
                    ...draft,
                    scenes: draft.scenes.filter((s) => s.id !== scene.id),
                  });
                  setSelected(Math.max(0, selected - 1));
                }}
              >
                Delete
              </button>
            </div>
            <SceneFields key={scene.id} scene={scene} onChange={changeScene} />
          </fieldset>
        </aside>
      </div>
    </main>
  );
}
