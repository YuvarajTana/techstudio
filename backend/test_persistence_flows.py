#!/usr/bin/env python3
"""Database-backed persistence proof for core TECKSTUDIO flows.

Run while the backend is running:
    python test_persistence_flows.py
"""

import os
import time

import requests
from sqlalchemy import text

from database import engine


BASE_URL = os.getenv("TECKSTUDIO_TEST_BASE_URL", "http://127.0.0.1:5001")
PASSWORD = os.getenv("TECKSTUDIO_PERSISTENCE_TEST_PASSWORD", "PersistenceTest123!")


def assert_true(name: str, condition: bool, detail: str = ""):
    if not condition:
        raise AssertionError(f"{name} failed: {detail}")
    print(f"PASS {name}: {detail}")


def main():
    stamp = int(time.time())
    email = f"persist_{stamp}@example.com"
    project_id = f"persist_proj_{stamp}"

    register = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"name": "Persistence Test", "email": email, "password": PASSWORD},
        timeout=30,
    )
    assert_true("register", register.status_code == 200, f"status={register.status_code}")
    token = register.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    initial_data = '{"version":"5.3.0","objects":[{"type":"textbox","text":"initial"}],"background":"#ffffff"}'
    created = requests.post(
        f"{BASE_URL}/api/projects",
        headers=headers,
        json={
            "id": project_id,
            "name": "Persistence Proof Project",
            "data": initial_data,
            "width": 800,
            "height": 600,
            "design_type": "proof",
            "prompt": "database persistence proof",
            "provider": "manual-test",
        },
        timeout=30,
    )
    assert_true("project_create", created.status_code == 200, f"status={created.status_code}")

    updated_data = '{"version":"5.3.0","objects":[{"type":"textbox","text":"updated after autosave"}],"background":"#111111"}'
    updated = requests.put(
        f"{BASE_URL}/api/projects/{project_id}",
        headers=headers,
        json={"name": "Persistence Proof Project Updated", "data": updated_data},
        timeout=30,
    )
    assert_true("project_update", updated.status_code == 200, f"status={updated.status_code}")

    loaded = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers, timeout=30)
    assert_true("project_reload", loaded.status_code == 200 and loaded.json()["data"] == updated_data, f"status={loaded.status_code}")

    brand_name = f"Proof Brand {stamp}"
    brand = requests.post(f"{BASE_URL}/api/brand-kits", headers=headers, json={"name": brand_name}, timeout=30)
    assert_true("brand_create", brand.status_code == 201, f"status={brand.status_code}")
    brand_id = brand.json()["id"]

    chat = requests.post(
        f"{BASE_URL}/api/ai/chat",
        headers=headers,
        json={
            "message": "Give me one concise poster color tip.",
            "conversation_id": f"project_{project_id}",
            "project_id": project_id,
            "history": [],
        },
        timeout=90,
    )
    assert_true("chat_create", chat.status_code == 200 and bool(chat.json().get("reply")), f"status={chat.status_code}")

    image = requests.post(
        f"{BASE_URL}/api/ai/generate-image",
        headers=headers,
        json={
            "prompt": "simple blue circle icon on white background",
            "width": 384,
            "height": 384,
            "project_id": project_id,
        },
        timeout=180,
    )
    image_payload = image.json()
    assert_true("image_asset_create", image.status_code == 200 and bool(image_payload.get("asset_id")), image_payload.get("source", ""))

    poster = requests.post(
        f"{BASE_URL}/api/ai/generate-poster-image",
        headers=headers,
        data={
            "prompt": "Minimal persistence proof poster, bold blue title, clean white background",
            "style": "minimal",
            "width": "384",
            "height": "512",
            "aspect_ratio": "3:4",
            "quality": "standard",
            "output_count": "1",
            "project_id": project_id,
        },
        timeout=180,
    )
    poster_payload = poster.json()
    assert_true("poster_asset_create", poster.status_code == 200 and bool(poster_payload.get("asset_id")), poster_payload.get("provider", ""))

    thumbnail = requests.post(
        f"{BASE_URL}/api/ai/generate-thumbnail",
        headers=headers,
        data={
            "prompt": "Persistence proof thumbnail, bright blue badge, large readable text",
            "title": "Proof",
            "platform": "youtube",
            "style": "bold",
            "width": "640",
            "height": "360",
            "project_id": project_id,
        },
        timeout=180,
    )
    thumbnail_payload = thumbnail.json()
    assert_true("thumbnail_asset_create", thumbnail.status_code == 200 and bool(thumbnail_payload.get("asset_id")), thumbnail_payload.get("provider", ""))

    asset_ids = (image_payload["asset_id"], poster_payload["asset_id"], thumbnail_payload["asset_id"])
    conn = engine.connect()
    try:
        checks = {
            "users": conn.execute(text("select count(*) from users where email=:email"), {"email": email}).scalar(),
            "auth_sessions": conn.execute(text("select count(*) from auth_sessions s join users u on u.id=s.user_id where u.email=:email"), {"email": email}).scalar(),
            "projects": conn.execute(text("select count(*) from projects where id=:id and data=:data"), {"id": project_id, "data": updated_data}).scalar(),
            "design_versions": conn.execute(text("select count(*) from design_versions where project_id=:id"), {"id": project_id}).scalar(),
            "brand_kits": conn.execute(text("select count(*) from brand_kits where id=:id"), {"id": brand_id}).scalar(),
            "chat_messages": conn.execute(text("select count(*) from chat_messages where session_id=:id"), {"id": f"project_{project_id}"}).scalar(),
            "generated_assets": conn.execute(text("select count(*) from generated_assets where id in :ids"), {"ids": asset_ids}).scalar(),
            "generation_jobs": conn.execute(text("select count(*) from generation_jobs where asset_id in :ids"), {"ids": asset_ids}).scalar(),
        }
        for name, rows in checks.items():
            assert_true(f"db_{name}", rows and rows > 0, f"rows={rows}")

        paths = conn.execute(text("select id, storage_path from generated_assets where id in :ids"), {"ids": asset_ids}).all()
        for asset_id, storage_path in paths:
            assert_true(f"file_{asset_id}", os.path.exists(storage_path) and os.path.getsize(storage_path) > 0, storage_path)
    finally:
        conn.close()

    engine.dispose()
    conn = engine.connect()
    try:
        persisted = conn.execute(text("select data from projects where id=:id"), {"id": project_id}).scalar()
        assert_true("db_reconnect_project", persisted == updated_data, "engine disposed/reconnected")
    finally:
        conn.close()

    print(f"SUMMARY project_id={project_id} brand_id={brand_id} asset_ids={','.join(asset_ids)}")


if __name__ == "__main__":
    main()
