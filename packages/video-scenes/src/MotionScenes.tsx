/** Motion-graphics scene types added to creative-video/v2: slide, code, listing, stats, logo. */
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { factChips, getIcon } from "@teckstudio/design-spec";
import type { CreativeScene, CreativeVideoSpec } from "@teckstudio/lesson-video";
import { TOKEN_COLORS, tokenizeLine } from "./code";
import { entranceProgress, revealStyle, staggerDelay } from "./motion";
import type { SceneTheme } from "./theme";

type Scene<T extends CreativeScene["type"]> = Extract<CreativeScene, { type: T }>;
export interface MotionSceneProps<T extends CreativeScene["type"]> {
  scene: Scene<T>;
  spec: CreativeVideoSpec;
  theme: SceneTheme;
  assetSources: Record<string, string>;
  portrait: boolean;
  stage: { width: number; height: number };
  /** Scene length in frames (including narration extension). */
  duration: number;
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Vendored Tabler / Simple Icons glyph (unknown ids render nothing). */
export function Icon({ id, size, color }: { id?: string; size: number; color: string }) {
  const icon = getIcon(id);
  if (!icon) return null;
  const paint = icon.style === "stroke" ? { fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const } : { fill: color };
  return (
    <svg width={size} height={size} viewBox={icon.viewBox} style={{ flexShrink: 0 }} aria-hidden>
      <g {...paint}>{icon.paths.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  );
}

function useItemReveal(stagger: boolean | undefined, easing: CreativeScene["easing"]) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (index: number): React.CSSProperties => (stagger ? revealStyle(entranceProgress(frame, fps, easing ?? "ease", staggerDelay(index))) : {});
}

// ---------------------------------------------------------------------------

export function SlideScene({ scene, theme, assetSources, portrait }: MotionSceneProps<"slide">) {
  const reveal = useItemReveal(scene.stagger, scene.easing);
  const body: React.CSSProperties = { fontSize: portrait ? 36 : 38, lineHeight: 1.4, margin: 0, color: theme.text, fontFamily: theme.body };
  const bullets = (scene.bullets ?? []).map((bullet, i) => (
    <div key={i} style={{ display: "flex", gap: 22, alignItems: "flex-start", ...body, ...reveal(i) }}>
      <span style={{ width: 16, height: 16, borderRadius: 8, background: theme.accent, marginTop: 18, flexShrink: 0 }} />
      <span>{bullet}</span>
    </div>
  ));
  if (scene.layout === "big-statement" || scene.layout === "quote") {
    const quote = scene.layout === "quote";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 40, marginTop: portrait ? 120 : 40 }}>
        {quote && <div style={{ fontSize: 180, lineHeight: 0.6, color: theme.accent, fontFamily: theme.heading }}>“</div>}
        <p style={{ ...body, fontSize: quote ? (portrait ? 52 : 58) : portrait ? 66 : 78, fontStyle: quote ? "italic" : undefined, fontFamily: theme.heading, fontWeight: quote ? 400 : 800, lineHeight: 1.2, ...reveal(0) }}>
          {scene.body || scene.title}
        </p>
        {bullets.length > 0 && <div style={{ display: "grid", gap: 18 }}>{bullets}</div>}
      </div>
    );
  }
  const image = scene.imageAssetId ? assetSources[scene.imageAssetId] : undefined;
  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {scene.body && <p style={{ ...body, color: theme.muted, ...reveal(0) }}>{scene.body}</p>}
      {bullets}
    </div>
  );
  if (scene.layout === "split-image") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: portrait ? "1fr" : "1.05fr 1fr", gap: 48, alignItems: "center" }}>
        <div style={{ height: portrait ? 640 : 560, borderRadius: 28, overflow: "hidden", background: theme.surface, border: `1px solid ${theme.border}` }}>
          {image && <Img src={image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        {text}
      </div>
    );
  }
  return text;
}

// ---------------------------------------------------------------------------

export function CodeScene({ scene, theme, portrait, duration }: MotionSceneProps<"code">) {
  const frame = useCurrentFrame();
  const lines = scene.code.split("\n");
  const highlight = [...(scene.highlights ?? [])].reverse().find((h) => frame >= h.atFrame);
  const totalChars = scene.code.length;
  const typed = scene.reveal === "typewriter" ? Math.floor(interpolate(frame, [10, Math.max(20, duration * 0.6)], [0, totalChars], clamp)) : totalChars;
  let consumed = 0;
  const fontSize = lines.length > 16 ? 26 : lines.length > 10 ? 30 : 34;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ background: "#0b1020", borderRadius: 26, border: `1px solid ${theme.border}`, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 26px", background: "#111831" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />)}
          <span style={{ marginLeft: "auto", color: "#94a3b8", fontFamily: theme.mono, fontSize: 22 }}>{scene.language}</span>
        </div>
        <div style={{ padding: portrait ? "26px 26px" : "30px 36px", fontFamily: theme.mono, fontSize, lineHeight: 1.5 }}>
          {lines.map((line, i) => {
            const start = consumed;
            consumed += line.length + 1;
            const visibleChars = Math.max(0, Math.min(line.length, typed - start));
            const lineReveal = scene.reveal === "lines" ? interpolate(frame, [8 + i * 5, 16 + i * 5], [0, 1], clamp) : 1;
            const lit = highlight && i + 1 >= highlight.fromLine && i + 1 <= highlight.toLine;
            let remaining = visibleChars;
            return (
              <div key={i} style={{ display: "flex", gap: 24, opacity: lineReveal, background: lit ? `${theme.accent}33` : undefined, borderLeft: `5px solid ${lit ? theme.accent : "transparent"}`, paddingLeft: 12, whiteSpace: "pre" }}>
                <span style={{ color: "#475569", minWidth: 36, textAlign: "right" }}>{i + 1}</span>
                <span>
                  {tokenizeLine(line, scene.language).map((token, j) => {
                    if (remaining <= 0) return null;
                    const text = token.text.slice(0, remaining);
                    remaining -= token.text.length;
                    return <span key={j} style={{ color: TOKEN_COLORS[token.kind] }}>{text}</span>;
                  })}
                  {scene.reveal === "typewriter" && typed >= start && typed < start + line.length + 1 && typed < totalChars && (
                    <span style={{ background: "#e2e8f0", opacity: Math.floor(frame / 8) % 2 ? 0 : 1 }}>&nbsp;</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {highlight?.note && (
        <div style={{ ...revealStyle(interpolate(frame - highlight.atFrame, [0, 12], [0, 1], clamp)), alignSelf: "flex-start", background: theme.accent, color: theme.onAccent, padding: "18px 28px", borderRadius: 18, fontSize: 32, fontWeight: 700, fontFamily: theme.body }}>
          {highlight.note}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ListingScene({ scene, theme, assetSources, portrait, stage, duration }: MotionSceneProps<"listing">) {
  const frame = useCurrentFrame();
  const reveal = useItemReveal(scene.stagger ?? true, scene.easing);
  const photos = scene.photoAssetIds.map((id) => assetSources[id]).filter(Boolean);
  const segment = duration / Math.max(1, photos.length);
  const fadeFrames = Math.min(15, segment / 3);
  const photoHeight = portrait ? stage.height * 0.4 : stage.height - 420;
  const chips = factChips(scene.facts);
  return (
    <div style={{ display: "grid", gridTemplateColumns: portrait ? "1fr" : "1.25fr 1fr", gap: portrait ? 36 : 56 }}>
      <div style={{ position: "relative", height: photoHeight, borderRadius: 28, overflow: "hidden", background: theme.surface }}>
        {photos.map((src, i) => {
          const local = frame - i * segment;
          const opacity = i === 0 ? 1 : interpolate(local, [-fadeFrames, 0], [0, 1], clamp);
          const progress = interpolate(local, [-fadeFrames, segment], [0, 1], clamp);
          const scale = scene.pan === "kenburns" ? 1.04 + progress * 0.1 : 1;
          const shift = scene.pan === "kenburns" ? (i % 2 ? -1 : 1) * (progress - 0.5) * 40 : 0;
          return <Img key={i} src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity, transform: `scale(${scale}) translateX(${shift}px)` }} />;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: theme.body, color: theme.text }}>
        {scene.price && <div style={{ fontSize: portrait ? 76 : 84, fontWeight: 800, color: theme.accent, fontFamily: theme.heading, lineHeight: 1, ...reveal(0) }}>{scene.price}</div>}
        <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 32, ...reveal(1) }}>
          <Icon id="map-pin" size={36} color={theme.accent} />
          <span>{scene.address}</span>
        </div>
        {chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
            {chips.map((chip, i) => (
              <div key={chip.key} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 20px", borderRadius: 16, background: theme.surface, border: `1px solid ${theme.border}`, fontSize: 28, fontWeight: 600, ...reveal(2 + i) }}>
                <Icon id={chip.icon} size={32} color={theme.accent} />
                {chip.text}
              </div>
            ))}
          </div>
        )}
        {scene.features.map((feature, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 28, color: theme.muted, ...reveal(2 + chips.length + i) }}>
            <Icon id="check" size={30} color={theme.accent} />
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function StatsScene({ scene, theme, portrait }: MotionSceneProps<"stats">) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = portrait ? (scene.items.length > 2 ? 2 : 1) : scene.items.length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28, marginTop: portrait ? 60 : 30 }}>
      {scene.items.map((item, i) => {
        const delay = scene.stagger === false ? 0 : staggerDelay(i);
        const progress = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 45 });
        const value = (item.value * progress).toFixed(item.decimals ?? 0);
        const formatted = Number(value).toLocaleString("en-US", { minimumFractionDigits: item.decimals ?? 0, maximumFractionDigits: item.decimals ?? 0 });
        return (
          <div key={i} style={{ padding: "44px 36px", borderRadius: 28, background: theme.surface, border: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, ...revealStyle(Math.min(1, progress * 1.6)) }}>
            {item.icon && <Icon id={item.icon} size={64} color={theme.accent} />}
            <div style={{ fontSize: portrait ? 104 : 116, fontWeight: 800, lineHeight: 1, color: theme.accent, fontFamily: theme.heading, fontVariantNumeric: "tabular-nums" }}>
              {item.prefix}{formatted}{item.suffix}
            </div>
            <div style={{ fontSize: 30, color: theme.muted, textAlign: "center", fontFamily: theme.body }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function LogoScene({ scene, spec, theme, assetSources }: MotionSceneProps<"logo">) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 30 });
  const reveal = entranceProgress(frame, fps, "ease", 10);
  const line = interpolate(frame, [6, 30], [0, 1], clamp);
  const logo = spec.brand.logoAssetId ? assetSources[spec.brand.logoAssetId] : undefined;
  const title = scene.title || spec.brand.name;
  return (
    <AbsoluteFill style={{ background: theme.background, color: theme.text, alignItems: "center", justifyContent: "center", gap: 36, fontFamily: theme.body, textAlign: "center", padding: 80 }}>
      {logo ? (
        <Img src={logo} style={{ width: 260, height: 260, objectFit: "contain", transform: `scale(${0.6 + pop * 0.4})`, opacity: pop }} />
      ) : (
        <div style={{ fontSize: 110, fontWeight: 800, fontFamily: theme.heading, color: theme.text, transform: `scale(${0.85 + pop * 0.15})`, opacity: pop, clipPath: `inset(0 ${(1 - pop) * 50}% 0 ${(1 - pop) * 50}%)`, lineHeight: 1.05 }}>
          {title}
        </div>
      )}
      <div style={{ width: 220 * line, height: 8, borderRadius: 4, background: theme.accent }} />
      {logo && title && <div style={{ fontSize: 64, fontWeight: 800, fontFamily: theme.heading, ...revealStyle(reveal) }}>{title}</div>}
      {scene.subtitle && <div style={{ fontSize: 38, color: theme.muted, maxWidth: 1400, ...revealStyle(reveal) }}>{scene.subtitle}</div>}
      {scene.variant === "outro" && scene.contact && (
        <div style={{ marginTop: 20, fontSize: 36, fontWeight: 700, color: theme.onAccent, background: theme.accent, padding: "20px 36px", borderRadius: 18, ...revealStyle(entranceProgress(frame, fps, "ease", 20)) }}>{scene.contact}</div>
      )}
    </AbsoluteFill>
  );
}
