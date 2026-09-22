"""Validate selection ownership and copy catalog facts into a creative brief."""

import json
from fastapi import HTTPException
from database import BrandKit, BrandCatalogItem


def prepare_context(db, user_id, value, previous=None):
    if value is None:
        return None
    if not isinstance(value, dict):
        raise HTTPException(422, "Creative context must be an object.")
    try:
        encoded = json.dumps(value, allow_nan=False)
        if len(encoded.encode()) > 1024 * 1024:
            raise ValueError()
    except (TypeError, ValueError):
        raise HTTPException(
            422, "Creative context must be finite JSON smaller than 1 MiB."
        )
    result = json.loads(encoded)
    brand_id = result.get("brand_kit_id")
    item_ids = result.get("catalog_item_ids", [])
    if (
        not isinstance(item_ids, list)
        or len(item_ids) > 30
        or any(not isinstance(i, str) for i in item_ids)
        or len(set(item_ids)) != len(item_ids)
    ):
        raise HTTPException(422, "Choose at most 30 distinct catalog items.")
    if brand_id is not None and not isinstance(brand_id, str):
        raise HTTPException(422, "Invalid brand selection.")
    if item_ids and not brand_id:
        raise HTTPException(422, "Select the brand that owns these catalog items.")
    if (
        previous
        and brand_id == previous.get("brand_kit_id")
        and item_ids == previous.get("catalog_item_ids", [])
    ):
        result["brand_snapshot"] = previous.get("brand_snapshot")
        result["catalog_snapshots"] = previous.get("catalog_snapshots", [])
        return result
    result["brand_snapshot"], result["catalog_snapshots"] = None, []
    if not brand_id:
        return result
    brand = db.query(BrandKit).filter_by(id=brand_id, user_id=user_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found.")
    result["brand_snapshot"] = {
        "id": brand.id,
        "revision": brand.revision,
        "name": brand.name,
        "company_name": brand.company_name,
        "description": brand.description,
        "website": brand.website,
        "profile": brand.profile_json or {},
        "colors": [
            {"name": color.name, "hex_value": color.hex_value, "role": color.role}
            for color in brand.colors
        ],
        "fonts": [
            {"family": font.family, "weight": font.weight, "role": font.role}
            for font in brand.fonts
        ],
    }
    for item_id in item_ids:
        item = (
            db.query(BrandCatalogItem)
            .filter_by(
                id=item_id, user_id=user_id, brand_kit_id=brand_id, archived_at=None
            )
            .first()
        )
        if not item:
            raise HTTPException(404, "Catalog item not found or archived.")
        result["catalog_snapshots"].append(
            {
                "id": item.id,
                "revision": item.revision,
                "kind": item.kind,
                "name": item.name,
                "description": item.description,
                "benefits": item.benefits or [],
                "price_text": item.price_text,
                "cta_text": item.cta_text,
                "cta_url": item.cta_url,
                "media": [
                    {
                        "source": "uploaded" if m.uploaded_asset_id else "generated",
                        "assetId": m.uploaded_asset_id or m.generated_asset_id,
                        "role": m.role,
                    }
                    for m in item.media
                ],
            }
        )
    return result
