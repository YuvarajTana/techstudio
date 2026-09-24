"""The Python validator/compiler must agree with packages/lesson-video (TS) on shared fixtures."""

import copy
import json

import pytest

from services.lesson_spec import PRESET_SIZES, ROOT, compile_spec, validate_spec, CREATIVE_SCHEMA

FIXTURE = json.loads(
    (ROOT / "packages/lesson-video/tests/fixtures/creative-motion.json").read_text()
)


def patched(patch):
    spec = copy.deepcopy(FIXTURE["spec"])
    if "top" in patch:
        spec.update(patch["top"])
    if "scene" in patch:
        spec["scenes"][patch["scene"]].update(patch["set"])
    return spec


def test_fixture_compiles_to_shared_plan():
    spec = validate_spec(FIXTURE["spec"])
    assert compile_spec(spec) == FIXTURE["expectedPlan"]


@pytest.mark.parametrize("case", FIXTURE["invalid"], ids=lambda c: c["why"])
def test_invalid_cases_rejected(case):
    with pytest.raises(ValueError):
        validate_spec(patched(case["patch"]))


def test_presets_match_schema():
    assert set(CREATIVE_SCHEMA["properties"]["output"]["properties"]["preset"]["enum"]) == set(PRESET_SIZES)
    for preset, (width, height) in PRESET_SIZES.items():
        spec = copy.deepcopy(FIXTURE["spec"])
        spec["output"]["preset"] = preset
        plan = compile_spec(validate_spec(spec))
        assert (plan["width"], plan["height"]) == (width, height)


def test_without_transitions_scenes_are_back_to_back():
    spec = copy.deepcopy(FIXTURE["spec"])
    for scene in spec["scenes"]:
        scene.pop("transitionIn", None)
    plan = compile_spec(validate_spec(spec))
    starts = [s["startFrame"] for s in plan["scenes"]]
    assert starts == [0, 60, 180, 330, 480, 570]
    assert plan["durationInFrames"] == 630
