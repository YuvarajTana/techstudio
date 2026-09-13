"""Validation against the shared JSON Schema plus deterministic timeline rules."""

import hashlib
import json
from pathlib import Path
from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads(
    (ROOT / "packages/lesson-video/schema/lesson-video-v1.json").read_text()
)
VALIDATOR = Draft7Validator(SCHEMA)


def validate_spec(value):
    try:
        encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
    except (ValueError, TypeError):
        raise ValueError("Lesson must contain finite JSON data.")
    if len(encoded.encode()) > 1024 * 1024:
        raise ValueError("Lesson exceeds the 1 MiB input limit.")
    issues = list(VALIDATOR.iter_errors(value))
    if issues:
        raise ValueError(
            "; ".join(
                f"/{'/'.join(map(str,e.absolute_path))}: {e.message}"
                for e in issues[:6]
            )
        )

    def unique(ids, location):
        if len(ids) != len(set(ids)):
            raise ValueError(f"{location}: IDs must be unique.")

    unique([s["id"] for s in value["scenes"]], "/scenes")
    if sum(s["durationFrames"] for s in value["scenes"]) > 18000:
        raise ValueError("/scenes: total duration exceeds 10 minutes.")
    for i, scene in enumerate(value["scenes"]):
        if (
            scene["type"] == "question"
            and scene["revealAtFrame"] >= scene["durationFrames"]
        ):
            raise ValueError(
                f"/scenes/{i}/revealAtFrame: must be before the scene ends."
            )
        if scene["type"] != "diagram":
            continue
        nodes, edges = [n["id"] for n in scene["nodes"]], [
            e["id"] for e in scene["edges"]
        ]
        unique(nodes, f"/scenes/{i}/nodes")
        unique(edges, f"/scenes/{i}/edges")
        for edge in scene["edges"]:
            if (
                edge["from"] not in nodes
                or edge["to"] not in nodes
                or edge["from"] == edge["to"]
            ):
                raise ValueError(
                    f"/scenes/{i}/edges: use two different existing node IDs."
                )
        previous = -1
        for j, step in enumerate(scene["steps"]):
            f = step["atFrame"]
            if (j == 0 and f != 0) or f <= previous or f >= scene["durationFrames"]:
                raise ValueError(
                    f"/scenes/{i}/steps/{j}: times must start at 0, increase and stay inside the scene."
                )
            previous = f
            if any(
                n not in nodes
                for n in step["activeNodeIds"] + list(step.get("nodeStates", {}))
            ) or any(e not in edges for e in step["activeEdgeIds"]):
                raise ValueError(f"/scenes/{i}/steps/{j}: unknown reference.")
    return json.loads(encoded)


def compile_spec(spec):
    position, scenes = 0, []
    for scene in spec["scenes"]:
        start = position
        position += scene["durationFrames"]
        scenes.append({"id": scene["id"], "startFrame": start, "endFrame": position})
    return {
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "durationInFrames": position,
        "scenes": scenes,
        "templateVersion": "1.0.0",
    }


def spec_hash(spec):
    return hashlib.sha256(
        json.dumps(
            spec, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode()
    ).hexdigest()
