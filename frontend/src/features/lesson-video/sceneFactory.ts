import type { LessonScene } from "@teckstudio/lesson-video";
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function newScene(type: LessonScene["type"]): LessonScene {
  const base = { id: id("scene"), durationFrames: 180 };
  if (type === "title")
    return {
      ...base,
      type,
      title: "A new concept",
      subtitle: "Explain what the learner will understand.",
    };
  if (type === "question")
    return {
      ...base,
      type,
      prompt: "What do you predict happens next?",
      answer: "Explain the answer.",
      explanation: "Connect it to the learning objective.",
      revealAtFrame: 120,
    };
  if (type === "recap")
    return {
      ...base,
      type,
      title: "What did we learn?",
      points: ["Write one key idea."],
      nextTask: "Give the learner a small task to try.",
    };
  return {
    ...base,
    type,
    title: "Follow the process",
    layout: "left-to-right",
    nodes: [
      { id: "input", label: "Input" },
      { id: "output", label: "Output" },
    ],
    edges: [
      { id: "flow", from: "input", to: "output", label: "Transforms into" },
    ],
    steps: [
      {
        atFrame: 0,
        label: "Follow the connection.",
        activeNodeIds: ["input"],
        activeEdgeIds: ["flow"],
      },
    ],
  };
}
