from __future__ import annotations

from sqlalchemy import text

from asset_providers import AssetSearchInput, LocalDatabaseAssetProvider
from database import SessionLocal, engine
from routes.assets import get_asset, get_asset_data_url, list_asset_categories, search_assets


CORE_CATEGORIES = {
    "nature",
    "business",
    "food-drink",
    "technology",
    "fashion",
    "fitness",
    "travel",
    "abstract",
    "architecture",
    "animals",
    "people",
    "minimal",
    "technical-diagrams",
}
CANONICAL_CATEGORIES = [category["id"] for category in __import__("routes.assets", fromlist=["CANONICAL_IMAGE_CATEGORIES"]).CANONICAL_IMAGE_CATEGORIES]


def _is_supported_image_url(value: str) -> bool:
    return value.startswith("data:image/") or value.startswith("/media/")


def _count_category(slug: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(
            text(
                "SELECT COUNT(*) FROM assets "
                "WHERE user_id IS NULL AND category = 'images' AND tags LIKE :tag AND is_active = 1"
            ),
            {"tag": f"%category:{slug}%"},
        ).scalar() or 0)


def test_category_counts() -> None:
    counts = {slug: _count_category(slug) for slug in CANONICAL_CATEGORIES}
    missing = {
        slug: count
        for slug, count in counts.items()
        if count < (100 if slug in CORE_CATEGORIES else 30)
    }
    assert not missing, f"Expected enough public images per category, got {missing}"


def test_metadata_quality() -> None:
    with engine.begin() as conn:
        broken = conn.execute(text("""
            SELECT COUNT(*) FROM assets
            WHERE user_id IS NULL AND category = 'images'
              AND is_active = 1
              AND (
                image_url IS NULL OR image_url = ''
                OR thumbnail_url IS NULL OR thumbnail_url = ''
                OR local_storage_path IS NULL OR local_storage_path = ''
                OR mime_type NOT LIKE 'image/%'
                OR width IS NULL OR height IS NULL OR width <= 0 OR height <= 0
                OR source IS NULL OR source_asset_id IS NULL OR source_url IS NULL
                OR source_page_url IS NULL OR author_name IS NULL OR author_url IS NULL
                OR license_name IS NULL OR attribution_text IS NULL
                OR commercial_use_allowed IS NULL OR modification_allowed IS NULL
                OR attribution_required IS NULL OR is_active IS NULL
              )
        """)).scalar() or 0
        duplicates = conn.execute(text("""
            SELECT COALESCE(SUM(duplicate_count - 1), 0) FROM (
                SELECT image_url, COUNT(*) AS duplicate_count
                FROM assets
                WHERE user_id IS NULL AND category = 'images' AND is_active = 1
                GROUP BY image_url
                HAVING COUNT(*) > 1
            ) duplicate_assets
        """)).scalar() or 0

    assert int(broken) == 0
    assert int(duplicates) == 0


def test_technology_assets_are_curated_and_varied() -> None:
    with engine.begin() as conn:
        active_legacy = conn.execute(text("""
            SELECT COUNT(*) FROM assets
            WHERE user_id IS NULL AND category = 'images'
              AND tags LIKE '%category:technology%'
              AND id LIKE 'public_asset_image_%'
              AND is_active = 1
        """)).scalar() or 0
        subjects = conn.execute(text("""
            SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(tags, 'query:', -1), ',', 1) AS subject_query,
                   COUNT(*) AS asset_count
            FROM assets
            WHERE user_id IS NULL AND category = 'images'
              AND tags LIKE '%category:technology%'
              AND is_active = 1
            GROUP BY subject_query
        """)).fetchall()

    assert int(active_legacy) == 0
    assert len(subjects) >= 10
    assert max(int(row[1]) for row in subjects) <= 12


def test_provider_category_pagination() -> None:
    db = SessionLocal()
    try:
        provider = LocalDatabaseAssetProvider(db)
        first_page = provider.search(AssetSearchInput(category="images", theme="travel", limit=30, offset=0))
        second_page = provider.search(AssetSearchInput(category="images", theme="travel", limit=30, offset=30))
        assert first_page.total >= 100
        assert len(first_page.assets) == 30
        assert len(second_page.assets) == 30
        assert not {asset.id for asset in first_page.assets}.intersection(asset.id for asset in second_page.assets)
        assert all("category:travel" in (asset.tags or "") for asset in first_page.assets)
    finally:
        db.close()


def test_asset_api_contract() -> None:
    db = SessionLocal()
    try:
        categories = list_asset_categories(db=db)
        assert categories.success is True
        assert categories.total >= 1200 + (len(CANONICAL_CATEGORIES) - len(CORE_CATEGORIES)) * 30
        assert len(categories.categories) == len(CANONICAL_CATEGORIES)
        assert all(category.count >= 100 for category in categories.categories)

        search = search_assets(category="Food & Drink", q="coffee", page=1, per_page=24, db=db)
        assert search.success is True
        assert search.category == "food-drink"
        assert search.total >= 1
        assert 1 <= len(search.items) <= 24
        assert all(_is_supported_image_url(item.imageUrl) for item in search.items)
        assert all(_is_supported_image_url(item.thumbnailUrl) for item in search.items)
        assert all(item.licenseName for item in search.items)
        assert all(item.localStoragePath for item in search.items)

        detail = get_asset(search.items[0].id, db=db)
        assert detail.id == search.items[0].id
        assert detail.image_url
        assert detail.thumbnail_url
        assert detail.local_storage_path

        data_url = get_asset_data_url(search.items[0].id, db=db)
        assert data_url.success is True
        assert data_url.id == search.items[0].id
        assert data_url.mimeType.startswith("image/")
        assert data_url.dataUrl.startswith(f"data:{data_url.mimeType};base64,")
        assert data_url.width > 0
        assert data_url.height > 0

        technical = search_assets(q="distributed systems", page=1, per_page=24, db=db)
        assert technical.success is True
        assert technical.category == "technical-diagrams"
        assert technical.total >= 30
        assert 1 <= len(technical.items) <= 24
        assert all(item.category == "technical-diagrams" for item in technical.items)
        assert all("diagram" in " ".join(item.tags).lower() or "architecture" in " ".join(item.tags).lower() for item in technical.items)
    finally:
        db.close()


if __name__ == "__main__":
    test_category_counts()
    test_metadata_quality()
    test_technology_assets_are_curated_and_varied()
    test_provider_category_pagination()
    test_asset_api_contract()
    print("asset library tests passed")
