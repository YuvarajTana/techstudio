"""Photo provenance: every committed library photo with a manifest must match it."""

import hashlib
import json

import pytest
from PIL import Image

import curated_asset_seed as seed

ALLOWED = {"CC0-1.0", "PDM-1.0"}


def test_committed_manifests_match_files():
    for manifest in seed.REFERENCE_MEDIA_DIR.glob(f"*/{seed.ATTRIBUTION_FILE}"):
        data = json.loads(manifest.read_text())
        listed = {entry["file"] for entry in data["photos"]}
        on_disk = {p.name for p in manifest.parent.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}}
        assert on_disk == listed, f"{manifest}: files without provenance or missing files"
        for entry in data["photos"]:
            path = manifest.parent / entry["file"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"], entry["file"]
            assert entry["license"] in ALLOWED
            assert entry["source_page_url"].startswith("https://")
            assert entry["author_name"]
            assert path.stat().st_size <= 300_000


@pytest.fixture
def library(tmp_path, monkeypatch):
    monkeypatch.setattr(seed, "REFERENCE_MEDIA_DIR", tmp_path / "media" / "asset-library")
    monkeypatch.setattr(seed, "REFERENCE_FULL_MEDIA_DIR", tmp_path / "media" / "asset-library-full")
    monkeypatch.setattr(seed, "REFERENCE_THUMBNAIL_MEDIA_DIR", tmp_path / "media" / "asset-library-thumbnails")
    folder = tmp_path / "media" / "asset-library" / "real-estate"
    folder.mkdir(parents=True)
    Image.new("RGB", (1200, 800), "#aabbcc").save(folder / "01-house.jpg")
    (folder / seed.ATTRIBUTION_FILE).write_text(json.dumps({"photos": [{
        "file": "01-house.jpg", "key": "house-exterior", "title": "Family House Exterior", "tags": ["house"],
        "source": "Wikimedia Commons", "source_page_url": "https://commons.wikimedia.org/wiki/File:Example.jpg",
        "source_url": "https://upload.wikimedia.org/example.jpg", "author_name": "Jane Photographer",
        "license": "CC0-1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/", "sha256": "x",
    }]}))
    return folder


def test_seeder_uses_manifest_provenance(library):
    assets = seed.build_curated_image_assets("real-estate", 3)
    photo = assets[0]
    assert photo[1] == "Family House Exterior"
    assert photo[6] == "Wikimedia Commons"
    assert photo[8] == "CC0-1.0"
    assert "Jane Photographer" in photo[10]
    assert photo[16]["author_name"] == "Jane Photographer"
    assert photo[16]["attribution_required"] is False
    assert photo[4] == "/media/asset-library-full/real-estate/01-house.jpg"
    # The rest of the category is still filled with generated scenes.
    assert len(assets) == 3 and assets[1][6] == "application-owned-curated"


def _fetch_script():
    import importlib.util

    spec = importlib.util.spec_from_file_location("fetch_cc0_photos", seed.Path(__file__).resolve().parents[1] / "scripts" / "fetch_cc0_photos.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "meta, expected",
    [
        ({"License": {"value": "cc0"}, "LicenseShortName": {"value": "CC0"}}, "CC0-1.0"),
        ({"License": {"value": "pd"}, "LicenseShortName": {"value": "Public domain"}}, "PDM-1.0"),
        ({"LicenseShortName": {"value": "Public domain"}}, "PDM-1.0"),
        ({"License": {"value": "cc-by-sa-4.0"}, "LicenseShortName": {"value": "CC BY-SA 4.0"}}, None),
        ({"License": {"value": "cc-by-2.0"}}, None),
        ({}, None),
    ],
)
def test_only_cc0_and_public_domain_are_accepted(meta, expected):
    assert _fetch_script().license_of(meta) == expected
