#!/usr/bin/env python3
"""
Photos Catalog Migration Script
- Disables SVG data URI assets (illustrations, not photos)
- Keeps real JPEG/photo assets
- Adds AI/Tech themed categories
- Deduplicates records
- Safe to run multiple times (idempotent)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, Asset, ElementCategory
from sqlalchemy import func
from datetime import datetime

def migrate():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("PHOTOS CATALOG MIGRATION")
        print("=" * 60)

        # Step 1: Disable SVG data URI assets (they're illustrations, not photos)
        svg_assets = db.query(Asset).filter(
            Asset.is_active == True,
            Asset.image_url.like('data:image/svg+xml%')
        ).count()
        print(f"\n1. Found {svg_assets} SVG data URI assets to disable...")

        if svg_assets > 0:
            db.query(Asset).filter(
                Asset.is_active == True,
                Asset.image_url.like('data:image/svg+xml%')
            ).update({
                Asset.is_active: False,
                Asset.updated_at: datetime.utcnow()
            }, synchronize_session=False)
            db.commit()
            print(f"   ✓ Disabled {svg_assets} SVG data URI assets")

        # Step 2: Disable duplicate "AI Icon: Golden neon star icon" entries (keep 1)
        dupes = db.query(Asset).filter(
            Asset.is_active == True,
            Asset.name == 'AI Icon: Golden neon star icon'
        ).order_by(Asset.created_at.asc()).all()

        if len(dupes) > 1:
            print(f"\n2. Found {len(dupes)} duplicate 'AI Icon' entries, keeping first...")
            for asset in dupes[1:]:
                asset.is_active = False
                asset.updated_at = datetime.utcnow()
            db.commit()
            print(f"   ✓ Disabled {len(dupes) - 1} duplicate entries")

        # Step 3: Disable inactive "Spotlight" duplicates
        spotlight_dupes = db.query(Asset).filter(
            Asset.is_active == True,
            Asset.name.like('Spotlight%')
        ).all()
        seen_names = {}
        disabled_count = 0
        for asset in spotlight_dupes:
            if asset.name in seen_names:
                asset.is_active = False
                asset.updated_at = datetime.utcnow()
                disabled_count += 1
            else:
                seen_names[asset.name] = asset.id
        if disabled_count > 0:
            db.commit()
            print(f"\n3. Disabled {disabled_count} duplicate Spotlight entries")

        # Step 4: Verify remaining active photos
        active_images = db.query(Asset).filter(
            Asset.is_active == True,
            Asset.category == 'images'
        ).count()
        active_photos = db.query(Asset).filter(
            Asset.is_active == True,
            Asset.category == 'images',
            Asset.image_url.notlike('data:image/svg+xml%')
        ).count()
        print(f"\n4. Active image assets: {active_images}")
        print(f"   Real photos (non-SVG): {active_photos}")

        # Step 5: Add AI/Tech themed categories to element_categories
        new_categories = [
            {"id": "cat_ai_tech", "name": "AI & Technology", "slug": "ai-technology", "icon": "cpu", "display_order": 1},
            {"id": "cat_robots", "name": "Robots & Automation", "slug": "robots", "icon": "bot", "display_order": 2},
            {"id": "cat_human_robot", "name": "Human-Robot Collaboration", "slug": "human-robot", "icon": "users", "display_order": 3},
            {"id": "cat_vr_ar", "name": "Virtual & Augmented Reality", "slug": "vr-ar", "icon": "glasses", "display_order": 4},
            {"id": "cat_cybersecurity", "name": "Cybersecurity", "slug": "cybersecurity", "icon": "shield", "display_order": 5},
            {"id": "cat_biz_tech", "name": "Business Technology", "slug": "business-tech", "icon": "briefcase", "display_order": 6},
            {"id": "cat_digital_human", "name": "Digital Humans", "slug": "digital-humans", "icon": "user", "display_order": 7},
            {"id": "cat_health_tech", "name": "Healthcare Technology", "slug": "healthcare-tech", "icon": "heart-pulse", "display_order": 8},
            {"id": "cat_tech_bg", "name": "Technology Backgrounds", "slug": "tech-backgrounds", "icon": "monitor", "display_order": 9},
        ]

        print(f"\n5. Adding {len(new_categories)} AI/Tech categories...")
        added = 0
        for cat in new_categories:
            existing = db.query(ElementCategory).filter(ElementCategory.id == cat["id"]).first()
            if not existing:
                db.add(ElementCategory(**cat))
                added += 1
        db.commit()
        print(f"   ✓ Added {added} new categories")

        # Step 6: Add subcategory tags to existing real photo assets
        print("\n6. Tagging real photos with AI/Tech themes...")
        real_photos = db.query(Asset).filter(
            Asset.is_active == True,
            Asset.category == 'images',
            Asset.image_url.notlike('data:image/svg+xml%')
        ).all()

        # Map existing categories to AI/Tech themes
        theme_tags = {
            'technology': ['ai-technology', 'cybersecurity', 'business-tech', 'tech-backgrounds'],
            'business': ['business-tech', 'ai-technology'],
            'nature': ['tech-backgrounds'],
            'abstract': ['ai-technology', 'tech-backgrounds', 'vr-ar'],
            'architecture': ['business-tech', 'tech-backgrounds'],
            'people': ['digital-humans', 'human-robot', 'business-tech'],
            'minimal': ['tech-backgrounds', 'ai-technology'],
        }

        tagged = 0
        for photo in real_photos:
            existing_tags = photo.tags or ''
            photo_theme = theme_tags.get(photo.subcategory or photo.category, ['ai-technology'])
            for theme in photo_theme:
                if theme not in existing_tags:
                    photo.tags = f"{existing_tags},{theme}" if existing_tags else theme
                    tagged += 1
        if tagged > 0:
            db.commit()
            print(f"   ✓ Tagged {tagged} photo-theme associations")

        # Final summary
        total_active = db.query(Asset).filter(Asset.is_active == True).count()
        total_inactive = db.query(Asset).filter(Asset.is_active == False).count()
        total_categories = db.query(ElementCategory).count()

        print(f"\n{'=' * 60}")
        print(f"MIGRATION COMPLETE")
        print(f"{'=' * 60}")
        print(f"  Active assets: {total_active}")
        print(f"  Inactive assets: {total_inactive}")
        print(f"  Real photos: {active_photos}")
        print(f"  Categories: {total_categories}")
        print(f"{'=' * 60}")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    migrate()
