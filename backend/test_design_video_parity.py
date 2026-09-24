"""Videos generated from DesignSpec templates must pass the backend validator too."""

import json
import shutil
import subprocess

import pytest

from services.lesson_spec import ROOT, compile_spec, validate_spec

NODE = shutil.which("node")
TSX = ROOT / "node_modules" / "tsx"


def mapped_videos():
    if not NODE or not TSX.exists():
        pytest.skip("node and root node_modules are needed to build the TS-mapped specs")
    output = subprocess.run(
        [NODE, "--import", "tsx", "scripts/dump_design_videos.ts"],
        cwd=ROOT, check=True, capture_output=True, text=True, timeout=120,
    ).stdout
    return json.loads(output)


def test_mapped_design_videos_validate_in_python():
    items = mapped_videos()
    assert len(items) >= 44
    for item in items:
        spec = validate_spec(item["video"])
        plan = compile_spec(spec)
        assert 450 <= plan["durationInFrames"] <= 2700, item["template"]
