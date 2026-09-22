import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  compileVideo,
  creativeSceneDuration,
  diagramStepAtFrame,
  type CreativeScene,
  type CreativeVideoSpec,
  type DiagramScene,
} from "@teckstudio/lesson-video";
import { useFonts } from "./index";

export interface CreativeVideoProps {
  spec: CreativeVideoSpec;
  assetSources?: Record<string, string>;
}
const paper = "#f7f5ef";
function DiagramVisual({
  scene,
  color,
  portrait,
}: {
  scene: DiagramScene;
  color: string;
  portrait: boolean;
}) {
  const frame = useCurrentFrame(),
    step = diagramStepAtFrame(scene, frame);
  const width = portrait ? 924 : 1700,
    height = portrait ? 1100 : 650;
  const nodes = scene.nodes.map((node, i) => ({
    ...node,
    x: portrait
      ? 260
      : 145 + (i * (width - 290)) / Math.max(1, scene.nodes.length - 1),
    y: portrait
      ? 100 + (i * (height - 200)) / Math.max(1, scene.nodes.length - 1)
      : height / 2,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <marker
          id={`creative-arrow-${scene.id}`}
          markerWidth="9"
          markerHeight="9"
          refX="8"
          refY="4.5"
          orient="auto"
        >
          <path d="M0 0L9 4.5L0 9Z" fill={color} />
        </marker>
      </defs>
      {scene.edges.map((edge, i) => {
        const a = byId.get(edge.from)!,
          b = byId.get(edge.to)!,
          active = step.activeEdgeIds.includes(edge.id),
          forward = portrait ? a.y < b.y : a.x < b.x;
        const bend = portrait
          ? 540 + (i % 4) * 78
          : forward
            ? 100 - (i % 3) * 24
            : height - 100 + (i % 3) * 24;
        const d = portrait
          ? `M ${a.x + 120} ${a.y} C ${bend} ${a.y}, ${bend} ${b.y}, ${b.x + 120} ${b.y}`
          : `M ${a.x} ${a.y + (forward ? -55 : 55)} C ${a.x} ${bend}, ${b.x} ${bend}, ${b.x} ${b.y + (forward ? -55 : 55)}`;
        const x = portrait ? bend - 10 : (a.x + b.x) / 2,
          y = portrait ? (a.y + b.y) / 2 : (height / 2 + 3 * bend) / 4;
        return (
          <g key={edge.id} opacity={active ? 1 : 0.22}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={active ? 5 : 3}
              markerEnd={`url(#creative-arrow-${scene.id})`}
            />
            <foreignObject x={x - 135} y={y - 36} width={270} height={72}>
              <div
                style={{
                  background: paper,
                  textAlign: "center",
                  fontSize: 22,
                  lineHeight: 1.25,
                  padding: 6,
                  color,
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
        const active = step.activeNodeIds.includes(node.id),
          unavailable = step.nodeStates?.[node.id] === "unavailable";
        return (
          <g key={node.id}>
            <rect
              x={node.x - 124}
              y={node.y - 55}
              width={248}
              height={110}
              rx={22}
              fill={unavailable ? "#fff0e8" : active ? "#e8edf2" : "white"}
              stroke={unavailable ? "#b45309" : color}
              strokeWidth={active ? 4 : 1}
            />
            <foreignObject
              x={node.x - 112}
              y={node.y - 44}
              width={224}
              height={88}
            >
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 25,
                  lineHeight: 1.2,
                  textAlign: "center",
                  fontWeight: 700,
                  color,
                  overflowWrap: "anywhere",
                }}
              >
                {node.label}
                {unavailable && (
                  <small style={{ fontSize: 16, color: "#a74919" }}>
                    Unavailable
                  </small>
                )}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
function CreativeSceneView({
  scene,
  spec,
  assetSources,
  index,
}: {
  scene: CreativeScene;
  spec: CreativeVideoSpec;
  assetSources: Record<string, string>;
  index: number;
}) {
  const frame = useCurrentFrame(),
    { width, height } = useVideoConfig(),
    portrait = height > width;
  const { primaryColor: ink, accentColor: accent } = spec.brand;
  const margin = portrait ? 78 : 110;
  const entrance = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const duration = creativeSceneDuration(scene),
    motion = scene.motion ?? "fade";
  const title = "title" in scene ? scene.title : scene.prompt;
  const heading: React.CSSProperties = {
    fontSize: title.length > 64 ? (portrait ? 52 : 56) : portrait ? 66 : 70,
    lineHeight: 1.12,
    letterSpacing: -2.5,
    margin: "0 0 34px",
    overflowWrap: "anywhere",
  };
  const body: React.CSSProperties = {
    fontSize: portrait ? 34 : 34,
    lineHeight: 1.4,
    margin: 0,
    overflowWrap: "anywhere",
  };
  const card: React.CSSProperties = {
    padding: portrait ? 32 : 35,
    background: "white",
    border: "1px solid #dadbd8",
    borderRadius: 24,
  };
  const list = (items: string[], numbered = false) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: portrait ? "1fr" : "1fr 1fr",
        gap: 20,
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            ...card,
            display: "flex",
            gap: 26,
            alignItems: "center",
            ...body,
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 30,
              fontWeight: 700,
              minWidth: 32,
            }}
          >
            {numbered ? `${i + 1}` : "—"}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
  const caption = (scene.captions ?? []).find(
    (c) => frame >= c.startFrame && frame < c.endFrame,
  );
  return (
    <AbsoluteFill
      style={{
        background: paper,
        color: ink,
        padding: `${portrait ? 110 : 70}px ${margin}px`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          minHeight: 58,
          marginBottom: portrait ? 70 : 34,
        }}
      >
        {spec.brand.logoAssetId && assetSources[spec.brand.logoAssetId] && (
          <Img
            src={assetSources[spec.brand.logoAssetId]}
            style={{ width: 70, height: 70, objectFit: "contain" }}
          />
        )}
        <div
          style={{
            fontSize: 22,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 700,
            color: accent,
          }}
        >
          {spec.brand.name ||
            (spec.purpose === "promotion"
              ? "Discover something new"
              : "Explore the concept")}
        </div>
      </header>
      <section
        style={{
          opacity: motion === "none" ? 1 : entrance,
          transform:
            motion === "slide"
              ? `translateY(${(1 - entrance) * 35}px)`
              : undefined,
        }}
      >
        <h1 style={heading}>{title}</h1>
        {scene.type === "title" && (
          <div style={{ marginTop: portrait ? 140 : 75, maxWidth: 1420 }}>
            <div
              style={{
                width: 140,
                height: 7,
                background: accent,
                marginBottom: 48,
              }}
            />
            <p style={{ ...body, fontSize: portrait ? 44 : 48 }}>
              {scene.subtitle}
            </p>
          </div>
        )}
        {scene.type === "image" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: portrait ? "1fr" : "1.1fr 1fr",
              gap: 44,
              alignItems: "center",
            }}
          >
            <div
              style={{
                height: portrait ? 670 : 460,
                overflow: "hidden",
                borderRadius: 28,
                background: "#e6e7e4",
              }}
            >
              {assetSources[scene.imageAssetId] ? (
                <Img
                  src={assetSources[scene.imageAssetId]}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform:
                      motion === "zoom"
                        ? `scale(${interpolate(frame, [0, duration], [1, 1.06])})`
                        : undefined,
                  }}
                />
              ) : (
                <div style={{ ...body, padding: 40 }}>
                  Choose an image to preview this scene.
                </div>
              )}
            </div>
            <p style={body}>{scene.body}</p>
          </div>
        )}
        {scene.type === "features" && list(scene.items)}
        {scene.type === "process" && list(scene.steps, true)}
        {scene.type === "comparison" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: portrait ? "1fr" : "1fr 1fr",
              gap: 28,
            }}
          >
            {[scene.left, scene.right].map((side, i) => (
              <div
                key={i}
                style={{ ...card, borderTop: `6px solid ${accent}` }}
              >
                <h2
                  style={{ fontSize: portrait ? 39 : 44, margin: "0 0 24px" }}
                >
                  {side.title}
                </h2>
                <ul
                  style={{
                    ...body,
                    fontSize: portrait ? 30 : 31,
                    margin: 0,
                    paddingLeft: 35,
                  }}
                >
                  {side.points.map((p, j) => (
                    <li key={j} style={{ marginBottom: 18 }}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {scene.type === "question" && (
          <div style={{ marginTop: 40 }}>
            {frame >= scene.revealAtFrame ? (
              <div style={{ ...card, borderLeft: `7px solid ${accent}` }}>
                <h2 style={{ fontSize: 44, marginTop: 0 }}>{scene.answer}</h2>
                <p style={body}>{scene.explanation}</p>
              </div>
            ) : (
              <p style={body}>Pause and consider your answer.</p>
            )}
          </div>
        )}
        {scene.type === "recap" && (
          <>
            {list(scene.points)}
            <p style={{ ...body, marginTop: 35, color: accent }}>
              {scene.nextTask}
            </p>
          </>
        )}
        {scene.type === "cta" && (
          <div style={{ marginTop: portrait ? 160 : 65 }}>
            <p style={body}>{scene.body}</p>
            <div
              style={{
                display: "inline-block",
                background: accent,
                color: "white",
                padding: "28px 40px",
                borderRadius: 18,
                fontSize: 42,
                fontWeight: 700,
                marginTop: 50,
              }}
            >
              {scene.action}
            </div>
            <p style={{ ...body, marginTop: 40 }}>{scene.contact}</p>
          </div>
        )}
        {scene.type === "diagram" && (
          <>
            <div style={{ height: portrait ? 1000 : 435 }}>
              <DiagramVisual scene={scene} color={accent} portrait={portrait} />
            </div>
            <p
              style={{
                ...body,
                fontSize: portrait ? 32 : 30,
                padding: 24,
                background: "white",
                borderLeft: `5px solid ${accent}`,
              }}
            >
              {diagramStepAtFrame(scene, frame).label}
            </p>
          </>
        )}
      </section>
      {scene.narration?.assetId && assetSources[scene.narration.assetId] && (
        <Audio src={assetSources[scene.narration.assetId]} />
      )}
      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 112,
            left: margin,
            right: margin,
            background: "rgba(14,25,36,.94)",
            color: "white",
            padding: "20px 28px",
            borderRadius: 18,
            fontSize: portrait ? 32 : 34,
            textAlign: "center",
            lineHeight: 1.35,
          }}
        >
          {caption.text}
        </div>
      )}
      <footer
        style={{
          position: "absolute",
          left: margin,
          right: margin,
          bottom: 55,
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          fontSize: 20,
          color: ink,
        }}
      >
        <span>{spec.brand.tagline || "TECKSTUDIO"}</span>
        <span>
          {index + 1} / {spec.scenes.length}
        </span>
      </footer>
    </AbsoluteFill>
  );
}
export function CreativeVideo({ spec, assetSources = {} }: CreativeVideoProps) {
  useFonts();
  const plan = useMemo(() => compileVideo(spec), [spec]);
  return (
    <AbsoluteFill
      style={{ fontFamily: "Inter, sans-serif", background: paper }}
    >
      {spec.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={plan.scenes[index].startFrame}
          durationInFrames={creativeSceneDuration(scene)}
        >
          <CreativeSceneView
            scene={scene}
            spec={spec}
            assetSources={assetSources}
            index={index}
          />
        </Sequence>
      ))}
      {spec.soundtrack && assetSources[spec.soundtrack.assetId] && (
        <Audio
          loop
          src={assetSources[spec.soundtrack.assetId]}
          volume={spec.soundtrack.volume}
        />
      )}
    </AbsoluteFill>
  );
}
