import io
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from PIL import Image

from services import upload_service
from services.upload_service import MAX_UPLOAD_BYTES, delete_uploaded_image_files, prepare_uploaded_image, safe_filename


def _image_bytes(image_format: str = "PNG") -> bytes:
    image = Image.new("RGBA", (320, 180), (20, 40, 80, 255))
    output = io.BytesIO()
    if image_format == "JPEG":
        image.convert("RGB").save(output, format=image_format)
    else:
        image.save(output, format=image_format)
    return output.getvalue()


def test_prepare_uploaded_image_uses_actual_content_and_thumbnail():
    prepared = prepare_uploaded_image(_image_bytes("PNG"), "image/png")

    assert prepared.mime_type == "image/png"
    assert prepared.width == 320
    assert prepared.height == 180
    assert prepared.thumbnail
    assert prepared.metadata["thumbnailWidth"] <= 420


def test_prepare_uploaded_image_rejects_corrupt_content():
    with pytest.raises(HTTPException) as error:
        prepare_uploaded_image(b"not-an-image", "image/png")

    assert error.value.status_code == 422


def test_prepare_uploaded_image_rejects_unsupported_declared_type():
    with pytest.raises(HTTPException) as error:
        prepare_uploaded_image(_image_bytes("PNG"), "application/pdf")

    assert error.value.status_code == 415


def test_prepare_uploaded_image_rejects_disguised_extension():
    with pytest.raises(HTTPException) as error:
        prepare_uploaded_image(_image_bytes("PNG"), "image/png", "poster.exe")

    assert error.value.status_code == 415


def test_prepare_uploaded_image_rejects_oversized_payload():
    with pytest.raises(HTTPException) as error:
        prepare_uploaded_image(b"x" * (MAX_UPLOAD_BYTES + 1), "image/png")

    assert error.value.status_code == 413


def test_prepare_uploaded_jpeg_extracts_actual_metadata():
    prepared = prepare_uploaded_image(_image_bytes("JPEG"), "image/jpeg")

    assert prepared.mime_type == "image/jpeg"
    assert prepared.extension == ".jpg"
    assert (prepared.width, prepared.height) == (320, 180)


def test_safe_filename_removes_path_and_script_characters():
    assert safe_filename("../../my <script> photo.JPG", ".jpg") == "my_script_photo.jpg"


def test_delete_uploaded_image_files_removes_only_asset_directory(tmp_path, monkeypatch):
    media_root = tmp_path / "uploads"
    asset_directory = media_root / "user_1" / "asset_1"
    asset_directory.mkdir(parents=True)
    image_path = asset_directory / "image.png"
    image_path.write_bytes(_image_bytes())
    monkeypatch.setattr(upload_service, "MEDIA_ROOT", media_root)

    delete_uploaded_image_files(SimpleNamespace(storage_path=str(image_path)))

    assert not asset_directory.exists()
    assert media_root.exists()
