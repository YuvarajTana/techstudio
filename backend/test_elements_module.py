import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, init_db, User, AuthSession, Asset
from auth import create_token, hash_password
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import uuid

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    init_db()
    db = SessionLocal()
    user_id = f"test_elem_user_{uuid.uuid4().hex[:8]}"
    email = f"elem_test_{uuid.uuid4().hex[:6]}@example.com"
    pwd_hash = hash_password("SecretPassword123!")

    user = User(id=user_id, email=email, name="Element Tester", password_hash=pwd_hash)
    db.add(user)
    db.commit()

    token = create_token(user_id, email)
    token_hash = sha256(token.encode("utf-8")).hexdigest()
    session = AuthSession(
        id=f"sess_{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(session)

    # Add or merge dummy asset for element testing
    asset = Asset(
        id="elem_test_asset_1",
        name="Circle Frame",
        category="frames",
        tags='["frame", "circle", "container"]',
        image_url="http://localhost:5001/media/frame1.svg",
        file_type="svg",
        is_active=True,
    )
    db.merge(asset)
    db.commit()
    db.close()

    return {"Authorization": f"Bearer {token}"}


def test_list_element_categories():
    res = client.get("/api/elements/categories")
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    assert len(data["categories"]) >= 5


def test_list_elements():
    res = client.get("/api/elements")
    assert res.status_code == 200
    data = res.json()
    assert "elements" in data
    assert "total" in data


def test_recent_elements(auth_headers):
    # Add recent item
    post_res = client.post("/api/elements/recent", json={"element_id": "elem_test_asset_1"}, headers=auth_headers)
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

    # Get recent items
    get_res = client.get("/api/elements/recent", headers=auth_headers)
    assert get_res.status_code == 200
    assert "recents" in get_res.json()


def test_favorites_toggle(auth_headers):
    # Toggle favorite on
    res1 = client.post("/api/elements/favorites/elem_test_asset_1", headers=auth_headers)
    assert res1.status_code == 200
    assert res1.json()["favorited"] is True

    # Get favorites
    fav_res = client.get("/api/elements/favorites", headers=auth_headers)
    assert fav_res.status_code == 200
    assert len(fav_res.json()["favorites"]) >= 1

    # Toggle favorite off
    res2 = client.post("/api/elements/favorites/elem_test_asset_1", headers=auth_headers)
    assert res2.status_code == 200
    assert res2.json()["favorited"] is False


def test_recommendations():
    res = client.get("/api/elements/recommendations?category=frames")
    assert res.status_code == 200
    assert "recommendations" in res.json()


def test_generate_ai_element(auth_headers):
    payload = {"prompt": "Golden neon star icon", "element_type": "icon", "style": "neon"}
    res = client.post("/api/elements/generate", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "element" in data
    assert data["element"]["id"].startswith("ai_elem_") or data["element"]["id"].startswith("ga_")
