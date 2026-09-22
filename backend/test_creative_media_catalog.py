import hashlib
import io
import wave
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_current_user
from database import Base, GeneratedAsset, UploadedAsset, User, get_db
from routes import brand_kits, creative_catalog, creative_media
from services import creative_media_service as service


@pytest.fixture
def context(tmp_path, monkeypatch):
    monkeypatch.setattr(service, "PRIVATE_ROOT", tmp_path / "private")
    monkeypatch.setattr(service, "SNAPSHOT_ROOT", tmp_path / "snapshots")
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)
    with session() as db:
        db.add_all(
            [
                User(
                    id=identity,
                    name=identity,
                    email=f"{identity}@example.test",
                    password_hash="unused",
                )
                for identity in ["owner", "other"]
            ]
        )
        db.commit()
    identity = {"id": "owner"}
    app = FastAPI()
    for router in [brand_kits.router, creative_catalog.router, creative_media.router]:
        app.include_router(router)

    def get_session():
        with session() as db:
            yield db

    def get_user():
        with session() as db:
            return db.get(User, identity["id"])

    app.dependency_overrides[get_db] = get_session
    app.dependency_overrides[get_current_user] = get_user
    yield TestClient(app), session, identity
    engine.dispose()


def png():
    output = io.BytesIO()
    Image.new("RGB", (100, 100), "red").save(output, format="PNG")
    return output.getvalue()


def upload(client):
    response = client.post(
        "/api/creative/media",
        files={"file": ("hero.png", png(), "image/png")},
        data={"role": "hero"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_brand_revision_profile_legacy_compatibility(context):
    client, _, _ = context
    brand = client.post(
        "/api/brand-kits",
        json={
            "name": "Studio",
            "profile_json": {
                "tagline": "Better spaces",
                "phone": "+100000000",
                "locations": ["City"],
            },
        },
    ).json()
    assert brand["revision"] == 1
    assert brand["profile_json"]["phone"] == "+100000000"
    update = client.patch(
        f"/api/brand-kits/{brand['id']}",
        json={"name": "Studio 2", "expected_revision": 1},
    )
    assert update.status_code == 200
    assert update.json()["revision"] == 2
    assert (
        client.patch(
            f"/api/brand-kits/{brand['id']}",
            json={"name": "Old", "expected_revision": 1},
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/api/brand-kits/{brand['id']}", json={"description": "Legacy edit"}
        ).status_code
        == 200
    )
    duplicate = client.post(f"/api/brand-kits/{brand['id']}/duplicate").json()
    assert duplicate["profile_json"] == brand["profile_json"]


def test_private_content_catalog_cas_and_ownership(context):
    client, session, identity = context
    media = upload(client)
    assert media["kind"] == "image" and media["width"] == 100
    assert client.get(media["content_url"]).status_code == 200
    with session() as db:
        record = db.get(UploadedAsset, media["id"])
        assert Path(record.storage_path).is_relative_to(service.PRIVATE_ROOT)
    brand = client.post("/api/brand-kits", json={"name": "Studio"}).json()
    endpoint = f"/api/brand-kits/{brand['id']}/catalog"
    payload = {
        "kind": "service",
        "name": "Architecture",
        "benefits": ["Thoughtful spaces"],
        "media": [
            {
                "source": "uploaded",
                "asset_id": media["id"],
                "role": "hero",
                "sort_order": 0,
            }
        ],
    }
    item = client.post(endpoint, json=payload)
    assert item.status_code == 201, item.text
    item = item.json()
    payload.update(expected_revision=1, name="Residential architecture")
    assert client.put(f"{endpoint}/{item['id']}", json=payload).json()["revision"] == 2
    assert client.put(f"{endpoint}/{item['id']}", json=payload).status_code == 409
    identity["id"] = "other"
    assert client.get(endpoint).status_code == 404
    assert client.get(media["content_url"]).status_code == 404
    other_brand = client.post("/api/brand-kits", json={"name": "Other"}).json()
    assert (
        client.post(
            f"/api/brand-kits/{other_brand['id']}/catalog",
            json={
                key: value
                for key, value in payload.items()
                if key != "expected_revision"
            },
        ).status_code
        == 404
    )
    identity["id"] = "owner"
    assert (
        client.delete(f"{endpoint}/{item['id']}?expected_revision=1").status_code == 409
    )
    assert (
        client.delete(f"{endpoint}/{item['id']}?expected_revision=2").status_code == 200
    )
    assert client.get(endpoint).json()["items"] == []
    assert client.get(f"{endpoint}?include_archived=true").json()["items"][0][
        "archived_at"
    ]


def test_snapshot_freezes_asset_and_rejects_paths(context):
    client, session, _ = context
    media = upload(client)
    spec = {
        "assets": [
            {
                "id": "hero",
                "kind": "image",
                "source": "uploaded",
                "assetId": media["id"],
            }
        ]
    }
    with session() as db:
        manifest = service.freeze_asset_manifest(db, "owner", spec, "snapshot-1")
        record, source, _ = service.resolve_owned_asset(
            db, "owner", "uploaded", media["id"]
        )
        source.unlink()
        assert Path(manifest["hero"]["path"]).is_file()
        assert (
            hashlib.sha256(Path(manifest["hero"]["path"]).read_bytes()).hexdigest()
            == manifest["hero"]["sha256"]
        )
        with pytest.raises(ValueError):
            service.freeze_asset_manifest(db, "owner", spec, "../escape")
        record.storage_path = "/etc/passwd"
        db.commit()
        with pytest.raises(Exception) as exc:
            service.resolve_owned_asset(db, "owner", "uploaded", record.id)
        assert exc.value.status_code == 404


def test_audio_is_durable_measured_and_normalized(context, tmp_path):
    client, session, _ = context
    data = io.BytesIO()
    with wave.open(data, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\0\0" * 16000)
    response = client.post(
        "/api/creative/media",
        files={"file": ("voice.wav", data.getvalue(), "audio/wav")},
        data={"role": "narration"},
    )
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["mime_type"] == "audio/mp4"
    assert 990 <= result["duration_ms"] <= 1050
    assert client.get(result["content_url"]).content
    temporary = tmp_path / "speech.wav"
    temporary.write_bytes(data.getvalue())
    with session() as db:
        generated = service.persist_generated_local_asset(
            db,
            "owner",
            None,
            temporary,
            "audio",
            {"scriptHash": "a" * 64, "provider": "test"},
        )
        assert isinstance(generated, GeneratedAsset)
        _, _, metadata = service.resolve_owned_asset(
            db, "owner", "generated", generated.id
        )
        assert metadata["scriptHash"] == "a" * 64
        assert metadata["duration_ms"] >= 990
    assert (
        client.post(
            "/api/creative/media",
            files={"file": ("bad.wav", b"not audio", "audio/wav")},
        ).status_code
        == 422
    )


def test_rejects_corrupt_and_unowned_project(context):
    client, _, _ = context
    assert (
        client.post(
            "/api/creative/media", files={"file": ("bad.png", b"not png", "image/png")}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/creative/media",
            files={"file": ("safe.png", png(), "image/png")},
            data={"project_id": "missing"},
        ).status_code
        == 404
    )
