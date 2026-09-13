from PIL import Image, ImageDraw

from routes.images import _apply_person_effect, _local_edge_matte, _png_bytes


def _subject_image() -> Image.Image:
    image = Image.new("RGBA", (160, 160), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((50, 20, 110, 80), fill="#4f46e5")
    draw.rounded_rectangle((42, 68, 118, 148), radius=20, fill="#111827")
    return image


def test_local_edge_matte_returns_transparent_background_and_subject():
    cutout, mask, confidence = _local_edge_matte(_subject_image())

    assert cutout.size == (160, 160)
    assert mask.getpixel((0, 0)) < 20
    assert mask.getpixel((80, 80)) > 220
    assert 0 < confidence <= 1
    assert len(_png_bytes(cutout)) > 100


def test_person_outline_follows_cutout_alpha():
    cutout, _, _ = _local_edge_matte(_subject_image())
    outlined = _apply_person_effect(cutout, "outline", "#a855f7", 8, 18)

    assert outlined.size == cutout.size
    assert outlined.getchannel("A").getbbox() is not None
    assert len(_png_bytes(outlined)) > 100


def test_background_blur_composites_original_and_cutout():
    original = _subject_image()
    cutout, _, _ = _local_edge_matte(original)
    result = _apply_person_effect(cutout, "background-blur", "#8b5cf6", 8, 12, original=original)

    assert result.size == original.size
    assert result.getchannel("A").getextrema() == (255, 255)
