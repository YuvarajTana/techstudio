import React from "react";
import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { linearTiming, springTiming, type TransitionPresentation, type TransitionPresentationComponentProps } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import type { CreativeSceneExtras, SceneTransition } from "@teckstudio/lesson-video";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Entrance progress 0→1. Without `easing` this is exactly the original
 * 15-frame linear entrance, so existing videos render unchanged.
 */
export function entranceProgress(frame: number, fps: number, easing: CreativeSceneExtras["easing"], delay = 0): number {
  const f = frame - delay;
  if (easing === "spring") return spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 22 });
  if (easing === "ease") return interpolate(f, [0, 18], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return interpolate(f, [0, 15], [0, 1], clamp);
}

/** Style for one staggered item (lists, cards, fact chips). */
export function revealStyle(progress: number, distance = 24): React.CSSProperties {
  return { opacity: progress, transform: `translateY(${(1 - progress) * distance}px)` };
}

/** Delay for the i-th staggered item. */
export const staggerDelay = (index: number) => 8 + index * 6;

type ZoomProps = Record<string, never>;
function ZoomPresentation({ children, presentationDirection, presentationProgress }: TransitionPresentationComponentProps<ZoomProps>) {
  const entering = presentationDirection === "entering";
  const scale = entering ? interpolate(presentationProgress, [0, 1], [1.12, 1]) : interpolate(presentationProgress, [0, 1], [1, 0.92]);
  const opacity = entering ? presentationProgress : 1 - presentationProgress * 0.6;
  return <AbsoluteFill style={{ transform: `scale(${scale})`, opacity }}>{children}</AbsoluteFill>;
}
const zoom = (): TransitionPresentation<ZoomProps> => ({ component: ZoomPresentation, props: {} });

/* eslint-disable @typescript-eslint/no-explicit-any */
export function transitionPresentation(transition: SceneTransition, width: number, height: number): TransitionPresentation<any> {
  const direction = transition.direction ?? "from-right";
  switch (transition.type) {
    case "slide":
      return slide({ direction });
    case "wipe":
      return wipe({ direction });
    case "clock-wipe":
      return clockWipe({ width, height });
    case "zoom":
      return zoom();
    default:
      return fade();
  }
}

export function transitionTiming(transition: SceneTransition) {
  return transition.timing === "spring"
    ? springTiming({ config: { damping: 200 }, durationInFrames: transition.durationFrames })
    : linearTiming({ durationInFrames: transition.durationFrames });
}
