import React from "react";
import { Composition } from "remotion";
import { LessonVideo } from "@teckstudio/video-scenes";
import { compileLesson, parseLesson } from "@teckstudio/lesson-video";
import example from "@teckstudio/lesson-video/example";
export function Root() {
  return (
    <Composition
      id="LessonVideo"
      component={LessonVideo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={1620}
      defaultProps={{ spec: parseLesson(example) }}
      calculateMetadata={({ props }) => {
        const plan = compileLesson(props.spec);
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
