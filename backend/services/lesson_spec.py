"""Validation against the shared JSON Schema plus deterministic timeline rules."""

import hashlib
import json
import math
from pathlib import Path
from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads(
    (ROOT / "packages/lesson-video/schema/lesson-video-v1.json").read_text()
)
VALIDATOR = Draft7Validator(SCHEMA)
CREATIVE_SCHEMA = json.loads(
    (ROOT / "packages/lesson-video/schema/creative-video-v2.json").read_text()
)
CREATIVE_VALIDATOR = Draft7Validator(CREATIVE_SCHEMA)


def scene_duration(scene):
    narration = scene.get("narration") or {}
    return max(
        scene["durationFrames"],
        narration.get("durationFrames", 0) + 15 if narration.get("assetId") else 0,
    )


def validate_spec(value):
    try:
        encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
    except (ValueError, TypeError):
        raise ValueError("Lesson must contain finite JSON data.")
    if len(encoded.encode()) > 1024 * 1024:
        raise ValueError("Lesson exceeds the 1 MiB input limit.")
    creative = isinstance(value, dict) and value.get("schema") == "creative-video/v2"
    issues = list((CREATIVE_VALIDATOR if creative else VALIDATOR).iter_errors(value))
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
    if creative:
        unique([a["id"] for a in value["assets"]], "/assets")
        assets = {a["id"]: a for a in value["assets"]}

        def asset_ref(alias, kind):
            if alias not in assets or assets[alias]["kind"] != kind:
                raise ValueError(f"Unknown {kind} asset reference: {alias}.")

        if value["brand"].get("logoAssetId"):
            asset_ref(value["brand"]["logoAssetId"], "image")
        if value.get("soundtrack"):
            asset_ref(value["soundtrack"]["assetId"], "audio")
        duration = sum(scene_duration(s) for s in value["scenes"])
        if not 450 <= duration <= 2700:
            raise ValueError("Creative videos must be between 15 and 90 seconds.")
        for scene in value["scenes"]:
            if scene.get("imageAssetId"):
                asset_ref(scene["imageAssetId"], "image")
            narration = scene.get("narration") or {}
            if narration.get("assetId"):
                asset_ref(narration["assetId"], "audio")
                if (
                    not narration.get("durationFrames")
                    or narration.get("approvedTextHash")
                    != hashlib.sha256(narration["text"].encode()).hexdigest()
                ):
                    raise ValueError(
                        "Review narration text and timing before attaching its audio."
                    )
            previous_end = 0
            for cue in scene.get("captions", []):
                if (
                    cue["startFrame"] < previous_end
                    or cue["endFrame"] <= cue["startFrame"]
                    or cue["endFrame"] > scene_duration(scene)
                ):
                    raise ValueError(
                        "Captions must be ordered, non-overlapping and within their scene."
                    )
                previous_end = cue["endFrame"]
    if sum(s["durationFrames"] for s in value["scenes"]) > 18000:
        raise ValueError("/scenes: total duration exceeds 10 minutes.")
    for i, scene in enumerate(value["scenes"]):
        if scene["type"] == "question" and scene["revealAtFrame"] >= scene_duration(
            scene
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
            if (j == 0 and f != 0) or f <= previous or f >= scene_duration(scene):
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
    creative = spec.get("schema") == "creative-video/v2"
    position, scenes = 0, []
    for scene in spec["scenes"]:
        start = position
        position += scene_duration(scene)
        scenes.append({"id": scene["id"], "startFrame": start, "endFrame": position})
    return {
        "width": (
            1080 if creative and spec["output"]["preset"] == "portrait-1080p" else 1920
        ),
        "height": (
            1920 if creative and spec["output"]["preset"] == "portrait-1080p" else 1080
        ),
        "fps": 30,
        "durationInFrames": position,
        "scenes": scenes,
        "templateVersion": "2.0.0" if creative else "1.0.0",
    }


def spec_hash(spec):
    return hashlib.sha256(
        json.dumps(
            spec, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode()
    ).hexdigest()


def captions_srt(spec):
    if spec.get("schema") != "creative-video/v2":
        return ""
    plan = compile_spec(spec)

    def timestamp(frame):
        milliseconds = math.floor(frame / 30 * 1000 + 0.5)
        return f"{milliseconds // 3600000:02d}:{milliseconds // 60000 % 60:02d}:{milliseconds // 1000 % 60:02d},{milliseconds % 1000:03d}"

    rows = []
    for scene, timing in zip(spec["scenes"], plan["scenes"]):
        for cue in scene.get("captions", []):
            rows.append(
                f"{len(rows) + 1}\n{timestamp(cue['startFrame'] + timing['startFrame'])} --> {timestamp(cue['endFrame'] + timing['startFrame'])}\n{cue['text']}\n"
            )
    return "\n".join(rows)
