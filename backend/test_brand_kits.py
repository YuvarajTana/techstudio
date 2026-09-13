from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, User
from routes.brand_kits import (
    BrandKitCreate,
    ColorCreate,
    FontCreate,
    LogoCreate,
    add_color,
    add_font,
    add_logo,
    create_brand_kit,
    duplicate_brand_kit,
    get_brand_kit,
    update_brand_kit,
    BrandKitUpdate,
)

PNG_1X1 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)


def make_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    return session_factory()


def make_user(user_id: str, email: str) -> User:
    return User(id=user_id, name=email.split("@")[0], email=email, password_hash="test")


def test_brand_kit_crud_duplicate_and_ownership() -> None:
    db = make_db()
    owner = make_user("user_1", "owner@example.com")
    stranger = make_user("user_2", "stranger@example.com")
    db.add_all([owner, stranger])
    db.commit()

    kit = create_brand_kit(
        BrandKitCreate(
            name="Acme Brand",
            company_name="Acme",
            description="Primary identity",
            industry="Technology",
            website="https://acme.example",
        ),
        current_user=owner,
        db=db,
    )
    assert kit.name == "Acme Brand"
    assert kit.company_name == "Acme"
    assert kit.colors == []

    color = add_color(
        kit.id,
        ColorCreate(name="Primary Purple", hex_value="#8b5cf6", role="primary", is_primary=True),
        current_user=owner,
        db=db,
    )
    assert color.hex_value == "#8B5CF6"
    assert color.role == "primary"
    assert color.is_primary is True

    font = add_font(
        kit.id,
        FontCreate(name="Heading", family="Outfit", weight="bold", role="heading"),
        current_user=owner,
        db=db,
    )
    assert font.family == "Outfit"
    assert font.role == "heading"

    logo = add_logo(
        kit.id,
        LogoCreate(name="Logo", file_data=PNG_1X1, file_type="image/png", role="primary"),
        current_user=owner,
        db=db,
    )
    assert logo.file_data.startswith("data:image/png;base64,")
    assert logo.file_size and logo.file_size > 0

    loaded = get_brand_kit(kit.id, current_user=owner, db=db)
    assert len(loaded.colors) == 1
    assert len(loaded.fonts) == 1
    assert len(loaded.logos) == 1

    renamed = update_brand_kit(kit.id, BrandKitUpdate(name="Acme Brand Updated"), current_user=owner, db=db)
    assert renamed.name == "Acme Brand Updated"

    copied = duplicate_brand_kit(kit.id, current_user=owner, db=db)
    assert copied.name.startswith("Acme Brand Updated Copy")
    assert len(copied.colors) == 1
    assert len(copied.fonts) == 1
    assert len(copied.logos) == 1

    try:
        get_brand_kit(kit.id, current_user=stranger, db=db)
    except HTTPException as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("stranger could access another user's brand kit")

    db.close()


def test_brand_kit_validation() -> None:
    db = make_db()
    owner = make_user("user_1", "owner@example.com")
    db.add(owner)
    db.commit()
    kit = create_brand_kit(BrandKitCreate(name="Validation Brand"), current_user=owner, db=db)

    try:
        ColorCreate(name="Broken", hex_value="not-a-color")
    except ValueError:
        pass
    else:
        raise AssertionError("invalid hex color accepted")

    try:
        add_logo(
            kit.id,
            LogoCreate(name="Broken", file_data="data:text/plain;base64,SGVsbG8=", file_type="text/plain"),
            current_user=owner,
            db=db,
        )
    except HTTPException as exc:
        assert exc.status_code == 422
    else:
        raise AssertionError("invalid logo data URL accepted")

    db.close()


if __name__ == "__main__":
    test_brand_kit_crud_duplicate_and_ownership()
    test_brand_kit_validation()
    print("brand kit tests passed")
