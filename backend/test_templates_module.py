from __future__ import annotations

import json

from fastapi import HTTPException

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import (
    Base,
    Category,
    DesignVersion,
    Project,
    Template,
    TemplateFavourite,
    TemplateSubcategory,
    TemplateUsage,
    User,
)
from routes.templates import (
    favourite_template,
    get_related_templates,
    get_template,
    list_template_categories,
    list_templates,
    quick_replace_template,
    remix_template,
    unfavourite_template,
    use_template,
)
from schemas.templates import TemplateQuickReplaceRequest, TemplateRemixRequest, TemplateUseRequest

CANVAS_JSON = '{"version":"5.3.0","objects":[{"type":"textbox","text":"Editable template"}],"background":"#ffffff"}'


def make_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    return session_factory()


def make_user(user_id: str = "user_1") -> User:
    return User(id=user_id, name="Template Owner", email=f"{user_id}@example.com", password_hash="test")


def seed_templates(db):
    business = Category(id="business", name="Business", slug="business", sort_order=1)
    marketing = Category(id="marketing", name="Marketing", slug="marketing", sort_order=2)
    startup = TemplateSubcategory(id="business-startup", category_id="business", name="Startup", slug="startup")
    campaign = TemplateSubcategory(id="marketing-campaign", category_id="marketing", name="Campaign", slug="campaign")
    db.add_all([business, marketing, startup, campaign])
    db.add_all([
        Template(
            id="tpl_business_growth",
            name="Business Growth Poster",
            slug="business-growth-poster",
            description="Growth marketing poster for business teams",
            category_id="business",
            subcategory_id="business-startup",
            template_type="posters",
            data=CANVAS_JSON,
            width=800,
            height=1132,
            tags=json.dumps(["business", "growth", "startup"]),
            is_featured=True,
            sort_weight=10,
            status="published",
            use_count=4,
        ),
        Template(
            id="tpl_business_plan",
            name="Business Plan LinkedIn Post",
            slug="business-plan-linkedin-post",
            description="LinkedIn business plan announcement",
            category_id="business",
            subcategory_id="business-startup",
            template_type="linkedin-posts",
            data=CANVAS_JSON,
            width=1200,
            height=627,
            tags=json.dumps(["business", "startup", "announcement"]),
            status="published",
            use_count=2,
        ),
        Template(
            id="tpl_marketing_sale",
            name="Marketing Sale Flyer",
            slug="marketing-sale-flyer",
            description="Seasonal sale campaign flyer",
            category_id="marketing",
            subcategory_id="marketing-campaign",
            template_type="flyers",
            data=CANVAS_JSON,
            width=800,
            height=1132,
            tags=json.dumps(["marketing", "sale"]),
            is_premium=True,
            status="published",
            use_count=9,
        ),
    ])
    db.commit()


def test_template_search_filter_sort_and_pagination() -> None:
    db = make_db()
    seed_templates(db)

    results = list_templates(q="growth", category="business", template_type="posters", sort="recommended", db=db)
    assert results.total == 1
    assert results.items[0].id == "tpl_business_growth"
    assert results.templates[0].id == "tpl_business_growth"
    assert results.templates[0].template_type == "poster"
    assert results.templates[0].category.slug == "business"
    assert results.templates[0].tags == ["business", "growth", "startup"]

    legacy_alias = list_templates(template_type="linkedin-posts", category="business", db=db)
    assert legacy_alias.total == 1
    assert legacy_alias.items[0].template_type == "linkedin-post"

    canonical_type = list_templates(type="linkedin-post", sort="az", db=db)
    assert canonical_type.total == 1
    assert canonical_type.items[0].id == "tpl_business_plan"

    page = list_templates(category="business", limit=1, offset=1, db=db)
    assert page.page == 2
    assert page.per_page == 1
    assert page.page_size == 1
    assert page.total == 2
    assert page.total_pages == 2
    assert page.has_more is False

    premium = list_templates(is_premium=True, sort="popular", db=db)
    assert premium.total == 1
    assert premium.templates[0].id == "tpl_marketing_sale"

    categories = list_template_categories(db=db)
    category_ids = {category.id for category in categories.categories}
    assert {"business", "marketing"}.issubset(category_ids)
    assert any(sub.slug == "startup" for category in categories.categories for sub in category.subcategories)
    db.close()


def test_template_detail_related_favourite_and_use_template() -> None:
    db = make_db()
    owner = make_user()
    db.add(owner)
    seed_templates(db)

    detail = get_template("tpl_business_growth", db=db)
    assert detail.name == "Business Growth Poster"
    assert detail.data == CANVAS_JSON

    related = get_related_templates("tpl_business_growth", db=db)
    assert related.total >= 1
    assert related.templates[0].id == "tpl_business_plan"

    favourite = favourite_template("tpl_business_growth", current_user=owner, db=db)
    assert favourite.template_id == "tpl_business_growth"
    assert favourite.is_favourite is True
    assert db.query(TemplateFavourite).count() == 1

    detail_after_favourite = get_template("tpl_business_growth", current_user=owner, db=db)
    assert detail_after_favourite.is_favourite is True

    same_favourite = favourite_template("tpl_business_growth", current_user=owner, db=db)
    assert same_favourite.is_favourite is True
    assert db.query(TemplateFavourite).count() == 1

    removed = unfavourite_template("tpl_business_growth", current_user=owner, db=db)
    assert removed.is_favourite is False
    assert db.query(TemplateFavourite).count() == 0

    used = use_template(
        "tpl_business_growth",
        TemplateUseRequest(project_name="Client Growth Poster"),
        current_user=owner,
        db=db,
    )
    assert used.project.name == "Client Growth Poster"
    used_canvas = json.loads(used.project.data)
    assert used_canvas["objects"][0]["text"] == "Editable template"
    assert used_canvas["width"] == 800
    assert used_canvas["height"] == 1132
    assert used.project.width == 800
    assert used.template.use_count == 5

    project = db.query(Project).filter(Project.id == used.project.id).first()
    assert project is not None
    assert project.user_id == owner.id
    assert json.loads(project.data)["objects"][0]["text"] == "Editable template"
    assert db.query(DesignVersion).filter(DesignVersion.project_id == project.id).count() == 1
    assert db.query(TemplateUsage).filter(TemplateUsage.project_id == project.id).count() == 1
    db.close()


def test_use_template_rejects_missing_or_invalid_canvas_data() -> None:
    db = make_db()
    owner = make_user()
    db.add(owner)
    category = Category(id="business", name="Business", slug="business", sort_order=1)
    db.add(category)
    db.add_all([
        Template(
            id="tpl_empty",
            name="Empty Template",
            slug="empty-template",
            category_id="business",
            template_type="posters",
            data=None,
            width=800,
            height=1132,
            status="published",
        ),
        Template(
            id="tpl_invalid",
            name="Invalid Template",
            slug="invalid-template",
            category_id="business",
            template_type="posters",
            data="not-json",
            width=800,
            height=1132,
            status="published",
        ),
    ])
    db.commit()

    for template_id in ("tpl_empty", "tpl_invalid"):
        try:
            use_template(template_id, TemplateUseRequest(), current_user=owner, db=db)
            raise AssertionError("Expected template use to fail for invalid canvas data")
        except HTTPException as exc:
            assert exc.status_code == 422
    assert db.query(Project).count() == 0
    assert db.query(TemplateUsage).count() == 0
    db.close()


def test_template_remix_and_quick_replace_create_separate_projects() -> None:
    db = make_db()
    owner = make_user()
    db.add(owner)
    seed_templates(db)

    remix = remix_template(
        "tpl_business_growth",
        TemplateRemixRequest(prompt="Luxury AI launch campaign for enterprise teams"),
        current_user=owner,
        db=db,
    )
    remix_canvas = json.loads(remix.project.data)
    assert remix.project.id != "tpl_business_growth"
    assert remix.project.width == 800
    assert remix.project.height == 1132
    assert remix.transform.source == "local-remix"
    assert remix_canvas["objects"][0]["type"] == "textbox"
    assert "Luxury" in remix_canvas["objects"][0]["text"]
    assert db.query(TemplateUsage).filter(TemplateUsage.project_id == remix.project.id, TemplateUsage.action == "remix").count() == 1

    replaced = quick_replace_template(
        "tpl_business_growth",
        TemplateQuickReplaceRequest(
            palette=["#111111", "#ffffff", "#8b5cf6", "#f8fafc"],
            heading_font="Montserrat",
            body_font="Inter",
            text_replacements={"business_name": "Laksha AI", "offer": "50% Launch Offer", "website": "laksha.ai"},
            replace_images=True,
        ),
        current_user=owner,
        db=db,
    )
    replaced_canvas = json.loads(replaced.project.data)
    assert replaced.transform.source == "local-quick-replace"
    assert replaced.project.id != remix.project.id
    assert replaced_canvas["objects"][0]["fontFamily"] == "Montserrat"
    assert db.query(TemplateUsage).filter(TemplateUsage.project_id == replaced.project.id, TemplateUsage.action == "quick-replace").count() == 1
    assert db.query(Template).filter(Template.id == "tpl_business_growth").first().data == CANVAS_JSON
    db.close()


if __name__ == "__main__":
    test_template_search_filter_sort_and_pagination()
    test_template_detail_related_favourite_and_use_template()
    test_use_template_rejects_missing_or_invalid_canvas_data()
    test_template_remix_and_quick_replace_create_separate_projects()
    print("template module tests passed")
