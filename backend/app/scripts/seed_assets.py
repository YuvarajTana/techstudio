from __future__ import annotations

import argparse
import re
from dataclasses import dataclass

from sqlalchemy import text

from database import _ensure_schema_columns, _seed_default_assets, engine


CANONICAL_CATEGORIES = [
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
]


@dataclass(frozen=True)
class AssetValidationSummary:
    total_category_images: int
    broken_assets: int
    duplicate_image_urls: int
    missing_license_metadata: int


def _category_tag(slug: str) -> str:
    return f"category:{slug}"


def _validate_assets() -> AssetValidationSummary:
    category_tag_pattern = "|".join(re.escape(_category_tag(slug)) for slug in CANONICAL_CATEGORIES)
    with engine.begin() as conn:
        total_category_images = conn.execute(
            text(
                "SELECT COUNT(*) FROM assets "
                "WHERE user_id IS NULL AND category = 'images' AND tags REGEXP :category_tag_pattern"
                " AND is_active = 1"
            ),
            {"category_tag_pattern": category_tag_pattern},
        ).scalar() or 0
        broken_assets = conn.execute(
            text(
                "SELECT COUNT(*) FROM assets "
                "WHERE user_id IS NULL AND category = 'images' AND tags REGEXP :category_tag_pattern "
                "AND is_active = 1 "
                "AND (image_url IS NULL OR image_url = '' OR thumbnail_url IS NULL OR thumbnail_url = '' "
                "OR mime_type NOT LIKE 'image/%' OR width IS NULL OR height IS NULL OR width <= 0 OR height <= 0)"
            ),
            {"category_tag_pattern": category_tag_pattern},
        ).scalar() or 0
        duplicate_image_urls = conn.execute(
            text(
                "SELECT COALESCE(SUM(duplicate_count - 1), 0) FROM ("
                "SELECT image_url, COUNT(*) AS duplicate_count FROM assets "
                "WHERE user_id IS NULL AND category = 'images' AND tags REGEXP :category_tag_pattern "
                "AND is_active = 1 "
                "GROUP BY image_url HAVING COUNT(*) > 1"
                ") duplicate_assets"
            ),
            {"category_tag_pattern": category_tag_pattern},
        ).scalar() or 0
        missing_license_metadata = conn.execute(
            text(
                "SELECT COUNT(*) FROM assets "
                "WHERE user_id IS NULL AND category = 'images' AND tags REGEXP :category_tag_pattern "
                "AND is_active = 1 "
                "AND (source IS NULL OR source_asset_id IS NULL OR source_url IS NULL "
                "OR source_page_url IS NULL OR local_storage_path IS NULL "
                "OR author_name IS NULL OR author_url IS NULL "
                "OR license_name IS NULL OR attribution_text IS NULL "
                "OR commercial_use_allowed IS NULL OR modification_allowed IS NULL "
                "OR attribution_required IS NULL)"
            ),
            {"category_tag_pattern": category_tag_pattern},
        ).scalar() or 0

    return AssetValidationSummary(
        total_category_images=int(total_category_images),
        broken_assets=int(broken_assets),
        duplicate_image_urls=int(duplicate_image_urls),
        missing_license_metadata=int(missing_license_metadata),
    )


def _print_category_counts() -> None:
    with engine.begin() as conn:
        for slug in CANONICAL_CATEGORIES:
            count = conn.execute(
                text(
                    "SELECT COUNT(*) FROM assets "
                    "WHERE user_id IS NULL AND category = 'images' AND tags LIKE :tag AND is_active = 1"
                ),
                {"tag": f"%{_category_tag(slug)}%"},
            ).scalar() or 0
            print(f"{slug}: {count}")
        inactive_legacy = conn.execute(
            text(
                "SELECT COUNT(*) FROM assets "
                "WHERE user_id IS NULL AND category = 'images' "
                "AND id LIKE 'public_asset_image_%' AND is_active = 0"
            )
        ).scalar() or 0
        print(f"inactive_legacy_public_image_assets={inactive_legacy}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the application-owned royalty-free asset library.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--all", action="store_true", help="Seed every image category.")
    mode.add_argument("--category", choices=CANONICAL_CATEGORIES, help="Seed one canonical image category.")
    parser.add_argument("--limit-per-category", type=int, default=100, help="Image count per category for --all.")
    parser.add_argument("--limit", type=int, default=100, help="Image count for --category.")
    args = parser.parse_args()

    _ensure_schema_columns()

    if args.all:
        _seed_default_assets(limit_per_category=args.limit_per_category)
    else:
        _seed_default_assets(category_slug=args.category, limit_per_category=args.limit)

    _print_category_counts()
    summary = _validate_assets()
    print("validation:")
    print(f"total_category_images={summary.total_category_images}")
    print(f"broken_assets={summary.broken_assets}")
    print(f"duplicate_image_urls={summary.duplicate_image_urls}")
    print(f"missing_license_metadata={summary.missing_license_metadata}")

    if summary.broken_assets or summary.duplicate_image_urls or summary.missing_license_metadata:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
