import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "@teckstudio/video-scenes";
import { compileVideo, parseVideo } from "@teckstudio/lesson-video";
import example from "@teckstudio/lesson-video/example";
export function Root() {
  return (
    <Composition
      id="LessonVideo"
      component={VideoComposition}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={1620}
      defaultProps={{ spec: parseVideo(example), assetSources: {} }}
      calculateMetadata={({ props }) => {
        const plan = compileVideo(props.spec);
        return {
          durationInFrames: plan.durationInFrames,
          width: plan.width,
          height: plan.height,
          fps: plan.fps,
        };
      }}
    />
  );
}
