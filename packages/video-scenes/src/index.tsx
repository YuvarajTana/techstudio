import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  delayRender,
  continueRender,
  cancelRender,
} from "remotion";
import {
  compileLesson,
  diagramLayout,
  diagramStepAtFrame,
  type DiagramScene,
  type LessonScene,
  type LessonVideoSpec,
} from "@teckstudio/lesson-video";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/outfit/latin-800.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/playfair-display/latin-400.css";
import "@fontsource/playfair-display/latin-400-italic.css";
import "@fontsource/playfair-display/latin-700.css";
import {CreativeVideo} from "./CreativeVideo";
import type {VideoSpec} from "@teckstudio/lesson-video";
export {CreativeVideo};
export type VideoProps = {spec:VideoSpec;assetSources?:Record<string,string>};
export function VideoComposition({spec,assetSources}:VideoProps) {
  return spec.schema === "creative-video/v2" ? <CreativeVideo spec={spec} assetSources={assetSources}/> : <LessonVideo spec={spec}/>;
}

export type LessonProps = { spec: LessonVideoSpec };
const ink = "#1a2638",
  purple = "#6843bb",
  muted = "#5b6878";
const INTER = [400, 600, 700].map((weight) => ({ family: "Inter", weight }));
/** Block rendering until the packaged fonts (default: Inter) are loaded. */
export function useFonts(fonts: { family: string; weight: number }[] = INTER) {
  const [handle] = useState(() => delayRender("Loading packaged fonts"));
  const key = fonts.map((f) => `${f.weight} ${f.family}`).join("|");
  useEffect(() => {
    Promise.all(
      key.split("|").map((entry) => {
        const [weight, ...family] = entry.split(" ");
        return document.fonts.load(`${weight} 40px "${family.join(" ")}"`);
      }),
    )
      .then(() => continueRender(handle))
      .catch(cancelRender);
  }, [handle, key]);
}
const labelStyle: React.CSSProperties = {
  fontSize: 24,
  letterSpacing: 4,
  textTransform: "uppercase",
  fontWeight: 700,
  color: purple,
};
function Diagram({ scene }: { scene: DiagramScene }) {
  const frame = useCurrentFrame();
  const { nodes, edges } = useMemo(() => diagramLayout(scene), [scene]);
  const step = diagramStepAtFrame(scene, frame);
  return (
    <>
      <svg
        width="1920"
        height="850"
        viewBox="0 0 1920 850"
        style={{ position: "absolute", top: 80, left: 0 }}
      >
        <defs>
          <marker
            id={`arrow-${scene.id}`}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={purple} />
          </marker>
        </defs>
        {edges.map((edge) => {
          const active = step.activeEdgeIds.includes(edge.id);
          return (
            <g key={edge.id} opacity={active ? 1 : 0.24}>
              <path
                d={edge.path}
                stroke={purple}
                strokeWidth={active ? 5 : 3}
                fill="none"
                markerEnd={`url(#arrow-${scene.id})`}
              />
              <foreignObject
                x={edge.labelX - edge.labelWidth / 2}
                y={edge.labelY - 36}
                width={edge.labelWidth}
                height={72}
              >
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    background: "#f7f6f1",
                    borderRadius: 12,
                    padding: "2px 8px",
                    fontSize: edge.label.length > 24 ? 20 : 25,
                    lineHeight: 1.2,
                    fontWeight: 600,
                    color: ink,
                    overflowWrap: "anywhere",
                  }}
                >
                  {edge.label}
                </div>
              </foreignObject>
            </g>
          );
        })}
        {nodes.map((node) => {
          const active = step.activeNodeIds.includes(node.id);
          const unavailable = step.nodeStates?.[node.id] === "unavailable";
          return (
            <g key={node.id}>
              <rect
                x={node.x - 124}
                y={node.y - 73}
                width={248}
                height={146}
                rx={24}
                fill={unavailable ? "#fff0ea" : active ? "#eee7fa" : "white"}
                stroke={unavailable ? "#b84d28" : active ? purple : "#d9dce1"}
                strokeWidth={active ? 4 : 2}
              />
              <foreignObject
                x={node.x - 108}
                y={node.y - 53}
                width={216}
                height={106}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    height: "100%",
                    fontSize: node.label.length > 24 ? 20 : 30,
                    lineHeight: 1.18,
                    fontWeight: 700,
                    color: ink,
                    overflowWrap: "anywhere",
                  }}
                >
                  {node.label}
                  {unavailable && (
                    <span
                      style={{
                        fontSize: node.label.length > 24 ? 14 : 19,
                        marginTop: 8,
                        color: "#a74324",
                      }}
                    >
                      Unavailable
                    </span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 110,
          right: 110,
          padding: "28px 34px",
          borderLeft: `6px solid ${purple}`,
          borderRadius: 12,
          background: "#ece6f5",
          fontSize: 34,
          lineHeight: 1.4,
        }}
      >
        {step.label}
      </div>
    </>
  );
}
function Scene({
  scene,
  index,
  count,
}: {
  scene: LessonScene;
  index: number;
  count: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill style={{ padding: "86px 110px", color: ink, opacity }}>
      <div style={labelStyle}>
        {scene.type === "question"
          ? "Pause & predict"
          : scene.type === "recap"
            ? "Make it stick"
            : "Concept walkthrough"}
      </div>
      {scene.type === "title" && (
        <div style={{ marginTop: 140, maxWidth: 1580 }}>
          <h1
            style={{
              fontSize: 104,
              lineHeight: 1.12,
              letterSpacing: -5,
              margin: "0 0 50px",
            }}
          >
            {scene.title}
          </h1>
          <p
            style={{
              fontSize: 44,
              lineHeight: 1.55,
              color: muted,
              maxWidth: 1430,
            }}
          >
            {scene.subtitle}
          </p>
          <div
            style={{ width: 150, height: 8, background: purple, marginTop: 66 }}
          />
        </div>
      )}
      {scene.type === "diagram" && (
        <>
          <h1
            style={{
              fontSize: 62,
              lineHeight: 1.2,
              marginTop: 26,
              letterSpacing: -2,
            }}
          >
            {scene.title}
          </h1>
          <Diagram scene={scene} />
        </>
      )}
      {scene.type === "question" && (
        <div style={{ marginTop: 90 }}>
          <h1
            style={{
              fontSize: 70,
              lineHeight: 1.25,
              letterSpacing: -2,
              maxWidth: 1580,
            }}
          >
            {scene.prompt}
          </h1>
          {frame >= scene.revealAtFrame ? (
            <div
              style={{
                marginTop: 65,
                padding: "38px 46px",
                background: "#e5f0e8",
                borderRadius: 24,
                border: "2px solid #aecfba",
              }}
            >
              <strong style={{ fontSize: 48, color: "#255d40" }}>
                {scene.answer}
              </strong>
              <p style={{ fontSize: 36, lineHeight: 1.5, marginBottom: 0 }}>
                {scene.explanation}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 34, color: muted, marginTop: 80 }}>
              Think it through. Pause here if you need more time.
            </p>
          )}
        </div>
      )}
      {scene.type === "recap" && (
        <>
          <h1
            style={{ fontSize: 76, margin: "40px 0 44px", letterSpacing: -3 }}
          >
            {scene.title}
          </h1>
          <div style={{ display: "grid", gap: 24 }}>
            {scene.points.map((point, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  fontSize: 37,
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    width: 52,
                    height: 52,
                    borderRadius: 15,
                    background: "#e9e0f7",
                    color: purple,
                    fontSize: 25,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                {point}
              </div>
            ))}
          </div>
          <p
            style={{
              marginTop: 60,
              padding: 32,
              background: "white",
              border: "1px solid #d9dce1",
              borderRadius: 20,
              fontSize: 34,
              lineHeight: 1.45,
            }}
          >
            <b style={{ color: purple }}>Try this: </b>
            {scene.nextTask}
          </p>
        </>
      )}
      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          bottom: 48,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
          color: muted,
        }}
      >
        <span>TECKSTUDIO / LEARN VISUALLY</span>
        <span>
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(count).padStart(2, "0")}
        </span>
      </div>
    </AbsoluteFill>
  );
}
export function LessonVideo({ spec }: LessonProps) {
  useFonts();
  const plan = useMemo(() => compileLesson(spec), [spec]);
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ background: "#f7f6f1", fontFamily: "Inter, sans-serif" }}
    >
      {spec.scenes.map((scene, i) => (
        <Sequence
          key={scene.id}
          from={plan.scenes[i].startFrame}
          durationInFrames={scene.durationFrames}
        >
          <Scene scene={scene} index={i} count={spec.scenes.length} />
        </Sequence>
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 7,
          background: purple,
          width: `${(100 * (frame + 1)) / plan.durationInFrames}%`,
        }}
      />
    </AbsoluteFill>
  );
}
