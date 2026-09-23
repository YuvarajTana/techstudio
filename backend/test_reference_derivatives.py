import os
from pathlib import Path

import pytest
from PIL import Image

import curated_asset_seed as seed


@pytest.fixture
def media(tmp_path, monkeypatch):
    source = tmp_path / "media" / "asset-library"
    monkeypatch.setattr(seed, "REFERENCE_MEDIA_DIR", source)
    monkeypatch.setattr(seed, "REFERENCE_FULL_MEDIA_DIR", tmp_path / "media" / "asset-library-full")
    monkeypatch.setattr(seed, "REFERENCE_THUMBNAIL_MEDIA_DIR", tmp_path / "media" / "asset-library-thumbnails")
    (source / "nature").mkdir(parents=True)
    Image.new("RGB", (900, 488), "#336699").save(source / "nature" / "001-lake.jpg")
    return tmp_path / "media"


def test_generates_missing_derivatives(media):
    assert seed.ensure_all_reference_derivatives() == 1
    full = media / "asset-library-full" / "nature" / "001-lake.jpg"
    thumb = media / "asset-library-thumbnails" / "nature" / "001-lake.jpg"
    assert full.exists() and thumb.exists()
    with Image.open(full) as image:
        assert max(image.size) == 1800
    with Image.open(thumb) as image:
        assert max(image.size) == 420


def test_fresh_derivatives_are_reused(media):
    seed.ensure_all_reference_derivatives()
    full = media / "asset-library-full" / "nature" / "001-lake.jpg"
    marker = full.stat().st_mtime_ns
    seed.ensure_all_reference_derivatives()
    assert full.stat().st_mtime_ns == marker


def test_stale_derivative_is_rebuilt(media):
    seed.ensure_all_reference_derivatives()
    full = media / "asset-library-full" / "nature" / "001-lake.jpg"
    source = media / "asset-library" / "nature" / "001-lake.jpg"
    os.utime(full, (1, 1))
    seed.ensure_all_reference_derivatives()
    assert full.stat().st_mtime >= source.stat().st_mtime


def test_unreadable_source_falls_back_to_source_url(media):
    broken = media / "asset-library" / "nature" / "002-broken.jpg"
    broken.write_bytes(b"not an image")
    full, thumb, _, _ = seed._ensure_reference_derivatives("nature", broken)
    assert full == broken
    assert seed._reference_media_url(full) == "/media/asset-library/nature/002-broken.jpg"


def test_derived_media_urls(media):
    seed.ensure_all_reference_derivatives()
    full, thumb, _, _ = seed._ensure_reference_derivatives("nature", media / "asset-library" / "nature" / "001-lake.jpg")
    assert seed._reference_media_url(full) == "/media/asset-library-full/nature/001-lake.jpg"
    assert seed._reference_media_url(thumb) == "/media/asset-library-thumbnails/nature/001-lake.jpg"
