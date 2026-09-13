import type {
  LessonScene,
  DiagramScene,
  DiagramStep,
} from "@teckstudio/lesson-video";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function TextField({
  label,
  value,
  onChange,
  limit = 240,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  limit?: number;
  area?: boolean;
}) {
  return (
    <label className="lv-field">
      <span>{label}</span>
      {area ? (
        <textarea
          value={value}
          maxLength={limit}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          value={value}
          maxLength={limit}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
const toggle = (items: string[], value: string) =>
  items.includes(value) ? items.filter((i) => i !== value) : [...items, value];
function DiagramFields({
  scene,
  onChange,
}: {
  scene: DiagramScene;
  onChange: (s: DiagramScene) => void;
}) {
  const stepChange = (i: number, patch: Partial<DiagramStep>) =>
    onChange({
      ...scene,
      steps: scene.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    });
  const removeNode = (nodeId: string) => {
    const edges = scene.edges.filter(
        (e) => e.from !== nodeId && e.to !== nodeId,
      ),
      edgeIds = new Set(edges.map((e) => e.id));
    onChange({
      ...scene,
      nodes: scene.nodes.filter((n) => n.id !== nodeId),
      edges,
      steps: scene.steps.map((s) => ({
        ...s,
        activeNodeIds: s.activeNodeIds.filter((n) => n !== nodeId),
        activeEdgeIds: s.activeEdgeIds.filter((e) => edgeIds.has(e)),
        nodeStates: Object.fromEntries(
          Object.entries(s.nodeStates ?? {}).filter(([n]) => n !== nodeId),
        ),
      })),
    });
  };
  return (
    <>
      <div className="lv-field-heading">
        <h3>Diagram nodes</h3>
        <button
          type="button"
          disabled={scene.nodes.length >= 6}
          onClick={() =>
            onChange({
              ...scene,
              nodes: [...scene.nodes, { id: id("node"), label: "New node" }],
            })
          }
        >
          + Node
        </button>
      </div>
      {scene.nodes.map((node) => (
        <div className="lv-inline" key={node.id}>
          <input
            aria-label="Node label"
            maxLength={32}
            value={node.label}
            onChange={(e) =>
              onChange({
                ...scene,
                nodes: scene.nodes.map((n) =>
                  n.id === node.id ? { ...n, label: e.target.value } : n,
                ),
              })
            }
          />
          <button
            type="button"
            disabled={scene.nodes.length <= 1}
            onClick={() => removeNode(node.id)}
            aria-label={`Remove ${node.label}`}
          >
            ×
          </button>
        </div>
      ))}
      <div className="lv-field-heading">
        <h3>Connections</h3>
        <button
          type="button"
          disabled={scene.nodes.length < 2 || scene.edges.length >= 10}
          onClick={() =>
            onChange({
              ...scene,
              edges: [
                ...scene.edges,
                {
                  id: id("edge"),
                  from: scene.nodes[0].id,
                  to: scene.nodes[1].id,
                  label: "Connection",
                },
              ],
            })
          }
        >
          + Connection
        </button>
      </div>
      {scene.edges.map((edge) => (
        <div className="lv-group" key={edge.id}>
          <TextField
            label="Connection label"
            value={edge.label}
            limit={32}
            onChange={(label) =>
              onChange({
                ...scene,
                edges: scene.edges.map((e) =>
                  e.id === edge.id ? { ...e, label } : e,
                ),
              })
            }
          />
          <div className="lv-inline">
            {(["from", "to"] as const).map((key) => (
              <label key={key}>
                {key === "from" ? "From" : "To"}
                <select
                  value={edge[key]}
                  onChange={(e) =>
                    onChange({
                      ...scene,
                      edges: scene.edges.map((item) =>
                        item.id === edge.id
                          ? { ...item, [key]: e.target.value }
                          : item,
                      ),
                    })
                  }
                >
                  {scene.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="lv-link"
            onClick={() =>
              onChange({
                ...scene,
                edges: scene.edges.filter((e) => e.id !== edge.id),
                steps: scene.steps.map((s) => ({
                  ...s,
                  activeEdgeIds: s.activeEdgeIds.filter((e) => e !== edge.id),
                })),
              })
            }
          >
            Remove connection
          </button>
        </div>
      ))}
      <div className="lv-field-heading">
        <h3>Reveal steps</h3>
        <button
          type="button"
          disabled={scene.steps.length >= 12}
          onClick={() => {
            const atFrame = scene.steps.at(-1)!.atFrame + 60;
            onChange({
              ...scene,
              durationFrames: Math.max(scene.durationFrames, atFrame + 60),
              steps: [
                ...scene.steps,
                {
                  atFrame,
                  label: "Explain the next step.",
                  activeNodeIds: [],
                  activeEdgeIds: [],
                },
              ],
            });
          }}
        >
          + Step
        </button>
      </div>
      {scene.steps.map((step, i) => (
        <details key={i} className="lv-group" open={i === 0}>
          <summary>
            Step {i + 1} · {(step.atFrame / 30).toFixed(1)}s
          </summary>
          <label className="lv-field">
            <span>Starts at (seconds)</span>
            <input
              type="number"
              min={0}
              step={1 / 30}
              value={step.atFrame / 30}
              disabled={i === 0}
              onChange={(e) =>
                stepChange(i, {
                  atFrame: Math.round(Number(e.target.value) * 30),
                })
              }
            />
          </label>
          <TextField
            label="Explanation"
            area
            value={step.label}
            limit={180}
            onChange={(label) => stepChange(i, { label })}
          />
          <p className="lv-small">Highlight nodes</p>
          <div className="lv-checks">
            {scene.nodes.map((n) => (
              <label key={n.id}>
                <input
                  type="checkbox"
                  checked={step.activeNodeIds.includes(n.id)}
                  onChange={() =>
                    stepChange(i, {
                      activeNodeIds: toggle(step.activeNodeIds, n.id),
                    })
                  }
                />
                {n.label}
              </label>
            ))}
          </div>
          <p className="lv-small">Highlight connections</p>
          <div className="lv-checks">
            {scene.edges.map((e) => (
              <label key={e.id}>
                <input
                  type="checkbox"
                  checked={step.activeEdgeIds.includes(e.id)}
                  onChange={() =>
                    stepChange(i, {
                      activeEdgeIds: toggle(step.activeEdgeIds, e.id),
                    })
                  }
                />
                {e.label}
              </label>
            ))}
          </div>
          <p className="lv-small">Unavailable nodes</p>
          <div className="lv-checks">
            {scene.nodes.map((n) => (
              <label key={n.id}>
                <input
                  type="checkbox"
                  checked={step.nodeStates?.[n.id] === "unavailable"}
                  onChange={(e) =>
                    stepChange(i, {
                      nodeStates: {
                        ...step.nodeStates,
                        [n.id]: e.target.checked ? "unavailable" : "normal",
                      },
                    })
                  }
                />
                {n.label}
              </label>
            ))}
          </div>
          {i > 0 && (
            <button
              type="button"
              className="lv-link"
              onClick={() =>
                onChange({
                  ...scene,
                  steps: scene.steps.filter((_, j) => i !== j),
                })
              }
            >
              Remove step
            </button>
          )}
        </details>
      ))}
    </>
  );
}
export default function SceneFields({
  scene,
  onChange,
}: {
  scene: LessonScene;
  onChange: (s: LessonScene) => void;
}) {
  return (
    <>
      <label className="lv-field">
        <span>Duration (seconds)</span>
        <input
          type="number"
          min={0.5}
          max={120}
          step={0.5}
          value={scene.durationFrames / 30}
          onChange={(e) =>
            onChange({
              ...scene,
              durationFrames: Math.round(Number(e.target.value) * 30),
            })
          }
        />
      </label>
      {"title" in scene && (
        <TextField
          label="Scene title"
          limit={96}
          value={scene.title}
          onChange={(title) => onChange({ ...scene, title })}
        />
      )}
      {scene.type === "title" && (
        <TextField
          label="Explanation"
          area
          value={scene.subtitle}
          onChange={(subtitle) => onChange({ ...scene, subtitle })}
        />
      )}
      {scene.type === "diagram" && (
        <DiagramFields scene={scene} onChange={onChange} />
      )}
      {scene.type === "question" && (
        <>
          <TextField
            label="Question"
            area
            limit={200}
            value={scene.prompt}
            onChange={(prompt) => onChange({ ...scene, prompt })}
          />
          <TextField
            label="Answer"
            limit={140}
            value={scene.answer}
            onChange={(answer) => onChange({ ...scene, answer })}
          />
          <TextField
            label="Why?"
            area
            value={scene.explanation}
            onChange={(explanation) => onChange({ ...scene, explanation })}
          />
          <label className="lv-field">
            <span>Reveal answer at (seconds)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={scene.revealAtFrame / 30}
              onChange={(e) =>
                onChange({
                  ...scene,
                  revealAtFrame: Math.round(Number(e.target.value) * 30),
                })
              }
            />
          </label>
        </>
      )}
      {scene.type === "recap" && (
        <>
          <TextField
            label="Key points (one per line, up to five)"
            area
            limit={604}
            value={scene.points.join("\n")}
            onChange={(text) =>
              onChange({ ...scene, points: text.split("\n") })
            }
          />
          <TextField
            label="Next task"
            area
            value={scene.nextTask}
            onChange={(nextTask) => onChange({ ...scene, nextTask })}
          />
        </>
      )}
    </>
  );
}
