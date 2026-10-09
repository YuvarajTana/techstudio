"""Shared photo-library media ("library" source) for creative videos."""

import pytest
from fastapi import HTTPException
from PIL import Image

import services.creative_media_service as media


@pytest.fixture
def library(tmp_path, monkeypatch):
    root = tmp_path / "asset-library"
    (root / "real-estate").mkdir(parents=True)
    Image.new("RGB", (640, 400), "#998877").save(root / "real-estate" / "01-house-exterior.jpg")
    (tmp_path / "secret.jpg").write_bytes(b"not for you")
    monkeypatch.setattr(media, "library_media_root", lambda: root.resolve())
    return root


def test_library_photo_resolves_for_any_user(library):
    record, path, meta = media.resolve_owned_asset(None, "someone", "library", "real-estate__01-house-exterior")
    assert path.name == "01-house-exterior.jpg"
    assert meta["kind"] == "image" and meta["mime_type"] == "image/jpeg"
    assert (record.width, record.height) == (640, 400)
    assert len(meta["sha256"]) == 64


@pytest.mark.parametrize(
    "asset_id",
    [
        "real-estate__missing",
        "real-estate/01-house-exterior",
        "..__secret",
        "real-estate__..",
        "Real-Estate__01-house-exterior",
        "nocategory",
        "",
    ],
)
def test_unknown_or_unsafe_ids_are_rejected(library, asset_id):
    with pytest.raises(HTTPException) as error:
        media.resolve_owned_asset(None, "someone", "library", asset_id)
    assert error.value.status_code == 404


def test_other_sources_still_require_ownership(library):
    with pytest.raises(HTTPException):
        media.resolve_owned_asset(_NoRows(), "someone", "uploaded", "upl_not_mine")


class _NoRows:
    def query(self, _model):
        return self

    def filter(self, *_args):
        return self

    def first(self):
        return None


def test_video_spec_with_library_media_validates():
    from services.lesson_spec import validate_spec
    import copy, json
    from services.lesson_spec import ROOT

    spec = copy.deepcopy(json.loads((ROOT / "packages/lesson-video/tests/fixtures/creative-motion.json").read_text())["spec"])
    spec["assets"][0] = {"id": "photo-a", "kind": "image", "source": "library", "assetId": "real-estate__01-house-exterior"}
    validate_spec(spec)


def test_library_photo_is_frozen_into_the_render_snapshot(library, tmp_path, monkeypatch):
    monkeypatch.setattr(media, "SNAPSHOT_ROOT", tmp_path / "snapshots")
    spec = {"assets": [{"id": "photo-a", "kind": "image", "source": "library", "assetId": "real-estate__01-house-exterior"}]}
    manifest = media.freeze_asset_manifest(None, "someone", spec, "snap_1")
    entry = manifest["photo-a"]
    assert entry["kind"] == "image" and entry["mime_type"] == "image/jpeg"
    assert entry["path"].endswith("photo-a.jpg")
