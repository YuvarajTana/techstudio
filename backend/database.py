from sqlalchemy import create_engine, Column, String, Text, DateTime, ForeignKey, Integer, Boolean, JSON, UniqueConstraint, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from config import DATABASE_URL, settings
from curated_asset_seed import build_curated_image_assets
import base64
import pymysql

# Create engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ─── Models ───────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    brand_kits = relationship("BrandKit", back_populates="owner", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    template_favourites = relationship("TemplateFavourite", back_populates="user", cascade="all, delete-orphan")
    template_usages = relationship("TemplateUsage", back_populates="user", cascade="all, delete-orphan")
    shared_designs = relationship("SharedDesign", back_populates="shared_by_user", foreign_keys="SharedDesign.shared_by")
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="owner", cascade="all, delete-orphan")
    uploaded_assets = relationship("UploadedAsset", back_populates="owner", cascade="all, delete-orphan")
    poster_analysis_jobs = relationship("PosterAnalysisJob", back_populates="owner", cascade="all, delete-orphan")
    font_assets = relationship("FontAsset", back_populates="owner", cascade="all, delete-orphan")
    processed_images = relationship("ProcessedImage", back_populates="owner", cascade="all, delete-orphan")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), nullable=False)
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="auth_sessions")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    data = Column(Text, nullable=True)  # Fabric.js JSON
    thumbnail = Column(Text, nullable=True)  # Base64 thumbnail
    width = Column(Integer, default=800)
    height = Column(Integer, default=800)
    background_color = Column(String(20), default="#000000")
    design_type = Column(String(50), nullable=True)
    generated_asset_id = Column(String(50), nullable=True)
    prompt = Column(Text, nullable=True)
    provider = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    tags = Column(Text, nullable=True)  # JSON array of tags
    is_favorite = Column(Boolean, default=False)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    versions = relationship("DesignVersion", back_populates="project", cascade="all, delete-orphan")
    shares = relationship("SharedDesign", back_populates="project", cascade="all, delete-orphan")
    generated_assets = relationship("GeneratedAsset", back_populates="project")


class DesignVersion(Base):
    __tablename__ = "design_versions"

    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    name = Column(String(200), nullable=True)  # Named snapshot label
    data = Column(Text, nullable=False)  # Fabric.js JSON snapshot
    thumbnail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="versions")


class Template(Base):
    __tablename__ = "templates"

    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(160), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    category_id = Column(String(50), ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(String(50), ForeignKey("template_subcategories.id"), nullable=True)
    template_type = Column(String(80), nullable=True)
    data = Column(Text, nullable=True)  # Fabric.js JSON template
    thumbnail = Column(String(500), nullable=True)  # Backward-compatible preview image URL
    thumbnail_url = Column(Text, nullable=True)
    preview_url = Column(Text, nullable=True)
    width = Column(Integer, default=800)
    height = Column(Integer, default=800)
    tags = Column(Text, nullable=True)  # JSON array of tags
    is_premium = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    sort_weight = Column(Integer, default=0)
    status = Column(String(30), default="published")
    metadata_json = Column(JSON, nullable=True)
    created_by = Column(String(50), ForeignKey("users.id"), nullable=True)
    use_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="templates")
    subcategory = relationship("TemplateSubcategory", back_populates="templates")
    favourites = relationship("TemplateFavourite", back_populates="template", cascade="all, delete-orphan")
    usages = relationship("TemplateUsage", back_populates="template", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), nullable=True)  # Lucide icon name
    color = Column(String(50), nullable=True)  # Gradient CSS class
    group_name = Column(String(100), nullable=True)  # Social Media, Marketing, etc.
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    templates = relationship("Template", back_populates="category")
    subcategories = relationship("TemplateSubcategory", back_populates="category", cascade="all, delete-orphan")


class TemplateSubcategory(Base):
    __tablename__ = "template_subcategories"
    __table_args__ = (UniqueConstraint("category_id", "slug", name="uq_template_subcategories_category_slug"),)

    id = Column(String(50), primary_key=True)
    category_id = Column(String(50), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="subcategories")
    templates = relationship("Template", back_populates="subcategory")


class TemplateFavourite(Base):
    __tablename__ = "template_favourites"
    __table_args__ = (UniqueConstraint("user_id", "template_id", name="uq_template_favourites_user_template"),)

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(String(50), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="template_favourites")
    template = relationship("Template", back_populates="favourites")


class TemplateUsage(Base):
    __tablename__ = "template_usage"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(String(50), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), default="use")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="template_usages")
    template = relationship("Template", back_populates="usages")
    project = relationship("Project")


class BrandKit(Base):
    __tablename__ = "brand_kits"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    company_name = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="brand_kits")
    colors = relationship("BrandColor", back_populates="brand_kit", cascade="all, delete-orphan")
    fonts = relationship("BrandFont", back_populates="brand_kit", cascade="all, delete-orphan")
    logos = relationship("BrandLogo", back_populates="brand_kit", cascade="all, delete-orphan")


class BrandColor(Base):
    __tablename__ = "brand_colors"

    id = Column(String(50), primary_key=True)
    brand_kit_id = Column(String(50), ForeignKey("brand_kits.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    hex_value = Column(String(20), nullable=False)
    role = Column(String(50), default="custom")
    description = Column(Text, nullable=True)
    is_primary = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    brand_kit = relationship("BrandKit", back_populates="colors")


class BrandFont(Base):
    __tablename__ = "brand_fonts"

    id = Column(String(50), primary_key=True)
    brand_kit_id = Column(String(50), ForeignKey("brand_kits.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    family = Column(String(100), nullable=False)
    weight = Column(String(50), default="normal")
    role = Column(String(50), default="body")
    style = Column(String(50), nullable=True)
    fallback = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)

    brand_kit = relationship("BrandKit", back_populates="fonts")


class BrandLogo(Base):
    __tablename__ = "brand_logos"

    id = Column(String(50), primary_key=True)
    brand_kit_id = Column(String(50), ForeignKey("brand_kits.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    file_data = Column(Text, nullable=False)  # Base64 encoded image
    file_type = Column(String(50), default="image/png")
    role = Column(String(50), default="primary")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0)

    brand_kit = relationship("BrandKit", back_populates="logos")


class SharedDesign(Base):
    __tablename__ = "shared_designs"

    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    shared_by = Column(String(50), ForeignKey("users.id"), nullable=False)
    shared_with_email = Column(String(150), nullable=False)
    access_level = Column(String(20), default="view")  # view, edit
    share_token = Column(String(100), unique=True, nullable=True)  # For link sharing
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="shares")
    shared_by_user = relationship("User", back_populates="shared_designs", foreign_keys=[shared_by])


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)  # template, project, asset
    item_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="favorites")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(200), nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # shapes, icons, illustrations
    tags = Column(Text, nullable=True)  # JSON array of tags
    file_data = Column(Text, nullable=True)  # SVG content or URL
    file_type = Column(String(50), default="svg")
    image_url = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    local_storage_path = Column(String(500), nullable=True)
    mime_type = Column(String(100), nullable=True)
    orientation = Column(String(30), nullable=True)
    source = Column(String(100), nullable=True)
    source_asset_id = Column(String(200), nullable=True)
    source_url = Column(String(500), nullable=True)
    source_page_url = Column(String(500), nullable=True)
    author_name = Column(String(200), nullable=True)
    author_url = Column(String(500), nullable=True)
    license = Column(String(100), nullable=True)
    license_name = Column(String(100), nullable=True)
    license_url = Column(String(500), nullable=True)
    attribution_required = Column(Boolean, default=False)
    attribution = Column(String(500), nullable=True)
    attribution_text = Column(String(500), nullable=True)
    commercial_use_allowed = Column(Boolean, default=True)
    modification_allowed = Column(Boolean, default=True)
    provider = Column(String(100), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    use_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="assets")


class GeneratedAsset(Base):
    __tablename__ = "generated_assets"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    asset_type = Column(String(50), nullable=False)  # image, poster, thumbnail
    original_prompt = Column(Text, nullable=False)
    enhanced_prompt = Column(Text, nullable=True)
    provider = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    storage_path = Column(String(500), nullable=False)
    public_url = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    fallback_used = Column(Boolean, default=False)
    generation_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="generated_assets")


class ElementCategory(Base):
    __tablename__ = "element_categories"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    parent_id = Column(String(50), ForeignKey("element_categories.id", ondelete="SET NULL"), nullable=True)
    display_order = Column(Integer, default=0)
    icon = Column(String(100), nullable=True)
    status = Column(String(30), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)


class ElementFavorite(Base):
    __tablename__ = "element_favorites"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    element_id = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ElementRecentItem(Base):
    __tablename__ = "element_recent_items"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    element_id = Column(String(100), nullable=False, index=True)
    usage_count = Column(Integer, default=1)
    last_used_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ElementCollection(Base):
    __tablename__ = "element_collections"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ElementCollectionItem(Base):
    __tablename__ = "element_collection_items"

    id = Column(String(50), primary_key=True)
    collection_id = Column(String(50), ForeignKey("element_collections.id", ondelete="CASCADE"), nullable=False, index=True)
    element_id = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UploadedAsset(Base):
    __tablename__ = "uploaded_assets"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    public_url = Column(String(500), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    thumbnail_storage_path = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    asset_role = Column(String(50), nullable=False, default="upload", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="uploaded_assets")


class PosterAnalysisJob(Base):
    __tablename__ = "poster_analysis_jobs"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id = Column(String(50), ForeignKey("uploaded_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    mode = Column(String(20), nullable=False, default="quick")
    language = Column(String(40), nullable=False, default="auto")
    status = Column(String(30), nullable=False, default="queued", index=True)
    stage = Column(String(100), nullable=False, default="Preparing image")
    progress = Column(Integer, nullable=False, default=0)
    result_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    cancel_requested = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="poster_analysis_jobs")
    asset = relationship("UploadedAsset")
    project = relationship("Project")


class FontAsset(Base):
    __tablename__ = "font_assets"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    family = Column(String(150), nullable=False)
    display_name = Column(String(150), nullable=False)
    category = Column(String(80), nullable=False, default="uploaded")
    source = Column(String(30), nullable=False, default="uploaded")
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    public_url = Column(String(500), nullable=False)
    weights = Column(JSON, nullable=True)
    styles = Column(JSON, nullable=True)
    is_premium = Column(Boolean, default=False)
    is_variable = Column(Boolean, default=False)
    licence = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="font_assets")


class ProcessedImage(Base):
    __tablename__ = "processed_images"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    operation = Column(String(80), nullable=False)
    provider = Column(String(100), nullable=False)
    original_filename = Column(String(255), nullable=False)
    original_storage_path = Column(String(500), nullable=False)
    processed_storage_path = Column(String(500), nullable=False)
    mask_storage_path = Column(String(500), nullable=True)
    original_url = Column(String(500), nullable=False)
    processed_url = Column(String(500), nullable=False)
    mask_url = Column(String(500), nullable=True)
    mime_type = Column(String(100), nullable=False, default="image/png")
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="processed_images")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(80), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=True)
    provider = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(50), primary_key=True)
    session_id = Column(String(80), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    provider = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class DeletedItem(Base):
    __tablename__ = "deleted_items"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)
    item_id = Column(String(50), nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    action_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ContentCalendarEvent(Base):
    __tablename__ = "content_calendar_events"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    platform = Column(String(50), nullable=False)  # instagram, facebook, linkedin, twitter, etc.
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String(50), default="scheduled")  # scheduled, published, draft
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(50), nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    key = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True)
    rules_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)



class RecentHistory(Base):
    __tablename__ = "recent_history"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False)
    item_id = Column(String(50), nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    asset_id = Column(String(50), ForeignKey("generated_assets.id", ondelete="SET NULL"), nullable=True)
    job_type = Column(String(50), nullable=False)
    provider = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)
    error = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExportMetadata(Base):
    __tablename__ = "export_metadata"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    export_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    storage_path = Column(String(500), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LessonVideoDocument(Base):
    __tablename__ = "lesson_video_documents"
    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    schema_version = Column(String(40), nullable=False, default="lesson-video/v1")
    spec_json = Column(JSON, nullable=False)
    revision = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LessonVideoSnapshot(Base):
    __tablename__ = "lesson_video_snapshots"
    id = Column(String(50), primary_key=True)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    document_revision = Column(Integer, nullable=False)
    spec_json = Column(JSON, nullable=False)
    plan_json = Column(JSON, nullable=False)
    spec_hash = Column(String(64), nullable=False)
    bundle_id = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LessonVideoWorker(Base):
    __tablename__ = "lesson_video_workers"
    id = Column(String(80), primary_key=True)
    bundle_id = Column(String(64), nullable=False)
    heartbeat_at = Column(DateTime, nullable=False)


class VideoRenderJob(Base):
    __tablename__ = "video_render_jobs"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    format = Column(String(10), nullable=False)
    status = Column(String(30), nullable=False, default="queued")
    progress = Column(Integer, nullable=False, default=0)
    stage = Column(String(160), nullable=False, default="Preparing project")
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    fps = Column(Integer, nullable=False)
    quality = Column(String(20), nullable=False)
    render_mode = Column(String(30), nullable=False, default="frame_sequence")
    snapshot_id = Column(String(50), ForeignKey("lesson_video_snapshots.id", ondelete="CASCADE"), nullable=True)
    idempotency_key = Column(String(128), nullable=True)
    attempt = Column(Integer, nullable=False, default=0)
    lease_token = Column(String(64), nullable=True)
    lease_expires_at = Column(DateTime, nullable=True)
    heartbeat_at = Column(DateTime, nullable=True)
    __table_args__ = (UniqueConstraint("user_id", "project_id", "idempotency_key", name="uq_video_render_idempotency"),)
    total_frames = Column(Integer, nullable=False, default=0)
    rendered_frames = Column(Integer, nullable=False, default=0)
    timeline_json = Column(JSON, nullable=False)
    output_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    mime_type = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    cancel_requested = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


# ─── Create tables ────────────────────────────────
def _has_active_public_assets() -> bool:
    try:
        with engine.connect() as conn:
            count = conn.execute(text(
                "SELECT COUNT(*) FROM assets WHERE user_id IS NULL AND is_active = 1 LIMIT 1"
            )).scalar()
            return bool(count and int(count) > 0)
    except Exception:
        return False


def init_db():
    """Create database if not exists, then create tables."""
    # Connect without database to create it if needed
    conn = pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD
    )
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.close()
    conn.close()

    # Create tables
    Base.metadata.create_all(bind=engine)
    _ensure_schema_columns()
    print(f"Database '{settings.DB_NAME}' initialized with tables.")

    # Seed default categories. Public asset seeding is intentionally skipped when
    # active public assets already exist, because reseeding thousands of image
    # records on every dev restart can block startup and exhaust MySQL temp disk.
    _seed_default_categories()
    if _has_active_public_assets():
        print("Asset seed skipped: active public assets already exist.")
    else:
        _seed_default_assets()


def _ensure_schema_columns():
    """Add lightweight compatibility columns before versioned migrations run."""
    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return

    project_columns = {column["name"] for column in inspector.get_columns("projects")}
    additions = {
        "design_type": "VARCHAR(50) NULL",
        "generated_asset_id": "VARCHAR(50) NULL",
        "prompt": "TEXT NULL",
        "provider": "VARCHAR(100) NULL",
    }

    with engine.begin() as conn:
        for column_name, ddl in additions.items():
            if column_name not in project_columns:
                conn.execute(text(f"ALTER TABLE projects ADD COLUMN {column_name} {ddl}"))

        if "assets" in inspector.get_table_names():
            asset_columns = {column["name"] for column in inspector.get_columns("assets")}
            asset_additions = {
                "user_id": "VARCHAR(50) NULL",
                "title": "VARCHAR(200) NULL",
                "description": "TEXT NULL",
                "image_url": "TEXT NULL",
                "thumbnail_url": "TEXT NULL",
                "local_storage_path": "VARCHAR(500) NULL",
                "mime_type": "VARCHAR(100) NULL",
                "orientation": "VARCHAR(30) NULL",
                "source": "VARCHAR(100) NULL",
                "source_asset_id": "VARCHAR(200) NULL",
                "source_url": "VARCHAR(500) NULL",
                "source_page_url": "VARCHAR(500) NULL",
                "author_name": "VARCHAR(200) NULL",
                "author_url": "VARCHAR(500) NULL",
                "license": "VARCHAR(100) NULL",
                "license_name": "VARCHAR(100) NULL",
                "license_url": "VARCHAR(500) NULL",
                "attribution_required": "BOOLEAN DEFAULT 0",
                "attribution": "VARCHAR(500) NULL",
                "attribution_text": "VARCHAR(500) NULL",
                "commercial_use_allowed": "BOOLEAN DEFAULT 1",
                "modification_allowed": "BOOLEAN DEFAULT 1",
                "provider": "VARCHAR(100) NULL",
                "width": "INT NULL",
                "height": "INT NULL",
                "is_active": "BOOLEAN DEFAULT 1",
                "updated_at": "DATETIME NULL",
            }
            for column_name, ddl in asset_additions.items():
                if column_name not in asset_columns:
                    conn.execute(text(f"ALTER TABLE assets ADD COLUMN {column_name} {ddl}"))

        if "brand_kits" in inspector.get_table_names():
            brand_kit_columns = {column["name"] for column in inspector.get_columns("brand_kits")}
            brand_kit_additions = {
                "company_name": "VARCHAR(150) NULL",
                "description": "TEXT NULL",
                "industry": "VARCHAR(100) NULL",
                "website": "VARCHAR(255) NULL",
            }
            for column_name, ddl in brand_kit_additions.items():
                if column_name not in brand_kit_columns:
                    conn.execute(text(f"ALTER TABLE brand_kits ADD COLUMN {column_name} {ddl}"))

        if "brand_colors" in inspector.get_table_names():
            brand_color_columns = {column["name"] for column in inspector.get_columns("brand_colors")}
            brand_color_additions = {
                "role": "VARCHAR(50) DEFAULT 'custom'",
                "description": "TEXT NULL",
                "is_primary": "BOOLEAN DEFAULT 0",
            }
            for column_name, ddl in brand_color_additions.items():
                if column_name not in brand_color_columns:
                    conn.execute(text(f"ALTER TABLE brand_colors ADD COLUMN {column_name} {ddl}"))

        if "brand_fonts" in inspector.get_table_names():
            brand_font_columns = {column["name"] for column in inspector.get_columns("brand_fonts")}
            brand_font_additions = {
                "role": "VARCHAR(50) DEFAULT 'body'",
                "style": "VARCHAR(50) NULL",
                "fallback": "VARCHAR(100) NULL",
            }
            for column_name, ddl in brand_font_additions.items():
                if column_name not in brand_font_columns:
                    conn.execute(text(f"ALTER TABLE brand_fonts ADD COLUMN {column_name} {ddl}"))

        if "brand_logos" in inspector.get_table_names():
            brand_logo_columns = {column["name"] for column in inspector.get_columns("brand_logos")}
            brand_logo_additions = {
                "role": "VARCHAR(50) DEFAULT 'primary'",
                "width": "INT NULL",
                "height": "INT NULL",
                "file_size": "INT NULL",
            }
            for column_name, ddl in brand_logo_additions.items():
                if column_name not in brand_logo_columns:
                    conn.execute(text(f"ALTER TABLE brand_logos ADD COLUMN {column_name} {ddl}"))


def _seed_default_categories():
    """Insert default template categories if not present."""
    from sqlalchemy import inspect
    conn = engine.connect()
    try:
        result = conn.execute(
            __import__('sqlalchemy').text("SELECT COUNT(*) FROM categories")
        )
        count = result.scalar()
        if count > 0:
            return

        categories = [
            # Social Media
            ("instagram", "Instagram Posts", "instagram", "from-pink-500 to-purple-500", "Social Media", 1),
            ("stories", "Stories & Reels", "camera", "from-fuchsia-500 to-pink-500", "Social Media", 2),
            ("facebook", "Facebook Posts", "share-2", "from-blue-600 to-blue-500", "Social Media", 3),
            ("twitter", "Twitter/X Posts", "globe", "from-sky-500 to-cyan-500", "Social Media", 4),
            ("linkedin", "LinkedIn Posts", "briefcase", "from-blue-700 to-blue-600", "Social Media", 5),
            ("youtube", "YouTube Thumbnails", "monitor-play", "from-red-500 to-orange-500", "Social Media", 6),
            # Marketing
            ("poster", "Posters", "image", "from-amber-500 to-yellow-500", "Marketing", 7),
            ("flyer", "Flyers", "newspaper", "from-green-500 to-emerald-500", "Marketing", 8),
            ("banner", "Web Banners", "monitor-play", "from-indigo-500 to-violet-500", "Marketing", 9),
            ("brochure", "Brochures", "book-open", "from-lime-500 to-green-500", "Marketing", 10),
            ("digital-ad", "Digital Ads", "megaphone", "from-orange-500 to-red-500", "Marketing", 11),
            # Events
            ("invitation", "Invitations", "book-open", "from-rose-400 to-pink-600", "Events", 12),
            ("event-poster", "Event Posters", "image", "from-violet-500 to-purple-600", "Events", 13),
            ("ticket", "Tickets & Passes", "ticket", "from-emerald-500 to-teal-500", "Events", 14),
            # Business
            ("presentation", "Presentations", "presentation", "from-blue-500 to-indigo-500", "Business", 15),
            ("business-card", "Business Cards", "credit-card", "from-zinc-400 to-zinc-600", "Business", 16),
            ("resume", "Resumes", "file-text", "from-teal-400 to-cyan-600", "Business", 17),
            ("invoice", "Invoices", "file-text", "from-gray-500 to-gray-600", "Business", 18),
            # Industry
            ("restaurant", "Restaurant & Cafe", "utensils", "from-amber-700 to-amber-900", "Industry", 19),
            ("fashion", "Fashion & Beauty", "heart", "from-pink-500 to-rose-500", "Industry", 20),
            ("real-estate", "Real Estate", "home", "from-green-600 to-green-800", "Industry", 21),
            ("fitness", "Health & Fitness", "dumbbell", "from-red-600 to-red-800", "Industry", 22),
            ("tech", "Technology & Startup", "cpu", "from-cyan-600 to-blue-700", "Industry", 23),
            ("education", "Education", "graduation-cap", "from-blue-500 to-indigo-600", "Industry", 24),
            # Other
            ("certificate", "Certificates", "award", "from-yellow-400 to-amber-600", "Other", 25),
            ("infographic", "Infographics", "grid-3x3", "from-sky-400 to-blue-600", "Other", 26),
            ("logo", "Logos", "palette", "from-violet-400 to-fuchsia-600", "Other", 27),
        ]

        for cat_id, name, icon, color, group, order in categories:
            conn.execute(
                __import__('sqlalchemy').text(
                    "INSERT INTO categories (id, name, slug, icon, color, group_name, sort_order) "
                    "VALUES (:id, :name, :slug, :icon, :color, :group, :order)"
                ),
                {"id": cat_id, "name": name, "slug": cat_id, "icon": icon, "color": color, "group": group, "order": order}
            )
        conn.commit()
        print(f"Seeded {len(categories)} default categories.")
    except Exception as e:
        print(f"Category seed skipped: {e}")
    finally:
        conn.close()


def _seed_default_assets(category_slug: str | None = None, limit_per_category: int = 100):
    """Insert or refresh public royalty-free starter assets."""
    normalized_category_slug = category_slug.strip().lower() if category_slug else None
    per_category_limit = max(1, int(limit_per_category or 100))
    conn = engine.connect()
    try:
        def svg_data_url(category_slug: str, color_a: str, color_b: str, accent: str, variant: int) -> str:
            variant_offset = (variant * 37) % 270
            accent_x = 640 - variant_offset
            accent_y = 96 + ((variant * 29) % 154)
            pattern = "\n".join(
                f'<circle cx="{120 + ((variant * 53 + i * 117) % 560)}" '
                f'cy="{95 + ((variant * 31 + i * 73) % 410)}" '
                f'r="{8 + ((variant + i) % 16)}" fill="#ffffff" opacity="{0.06 + (i * 0.018):.3f}"/>'
                for i in range(6)
            )
            foreground = {
                "nature": f"""
                  <circle cx="{accent_x}" cy="{accent_y}" r="74" fill="{accent}" opacity="0.9"/>
                  <path d="M0 520 L160 330 L275 480 L420 250 L620 520 Z" fill="#123524" opacity="0.94"/>
                  <path d="M0 560 C170 500 245 555 410 505 C555 460 660 520 800 470 L800 600 L0 600 Z" fill="#1f6f43" opacity="0.86"/>
                  <path d="M90 585 C210 515 330 548 470 506 C595 468 675 456 790 390" fill="none" stroke="#b7f7d2" stroke-width="30" stroke-linecap="round" opacity="0.44"/>
                  <circle cx="155" cy="175" r="42" fill="#ffffff" opacity="0.18"/>
                  <circle cx="235" cy="158" r="28" fill="#ffffff" opacity="0.12"/>
                """,
                "business": f"""
                  <rect x="86" y="124" width="628" height="352" rx="34" fill="#111827" opacity="0.82"/>
                  <rect x="134" y="356" width="532" height="54" rx="18" fill="#334155"/>
                  <rect x="154" y="184" width="210" height="132" rx="18" fill="{accent}" opacity="0.9"/>
                  <rect x="402" y="178" width="226" height="34" rx="12" fill="#f8fafc" opacity="0.34"/>
                  <rect x="402" y="238" width="186" height="28" rx="10" fill="#f8fafc" opacity="0.24"/>
                  <circle cx="{accent_x - 45}" cy="312" r="42" fill="#e0e7ff"/>
                  <circle cx="{accent_x + 34}" cy="312" r="42" fill="#c4b5fd"/>
                """,
                "food-drink": f"""
                  <circle cx="400" cy="330" r="158" fill="#fff7ed" opacity="0.94"/>
                  <circle cx="400" cy="330" r="112" fill="{accent}" opacity="0.82"/>
                  <circle cx="312" cy="260" r="36" fill="#ef4444"/>
                  <circle cx="470" cy="286" r="30" fill="#22c55e"/>
                  <rect x="96" y="392" width="608" height="62" rx="31" fill="#7c2d12" opacity="0.56"/>
                  <rect x="{accent_x - 100}" y="152" width="86" height="128" rx="20" fill="#fef3c7"/>
                  <rect x="{accent_x - 84}" y="132" width="54" height="38" rx="14" fill="#fed7aa"/>
                """,
                "technology": f"""
                  <rect x="126" y="138" width="548" height="326" rx="30" fill="#020617" opacity="0.88"/>
                  <path d="M170 332 H306 V245 H420 V178 H622" fill="none" stroke="{accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M186 394 H390 V328 H506 V258 H636" fill="none" stroke="#a5f3fc" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
                  <circle cx="306" cy="245" r="22" fill="#67e8f9"/>
                  <circle cx="420" cy="178" r="18" fill="#818cf8"/>
                  <circle cx="506" cy="328" r="24" fill="#22d3ee"/>
                  <rect x="{accent_x - 120}" y="398" width="124" height="30" rx="15" fill="#38bdf8" opacity="0.5"/>
                """,
                "fashion": f"""
                  <path d="M390 118 C332 170 308 286 292 452 H508 C492 286 468 170 410 118 Z" fill="{accent}" opacity="0.86"/>
                  <path d="M333 180 C270 214 230 280 210 376" fill="none" stroke="#fdf2f8" stroke-width="30" stroke-linecap="round" opacity="0.36"/>
                  <path d="M467 180 C530 214 570 280 590 376" fill="none" stroke="#fdf2f8" stroke-width="30" stroke-linecap="round" opacity="0.36"/>
                  <circle cx="400" cy="108" r="44" fill="#fce7f3"/>
                  <rect x="138" y="438" width="524" height="48" rx="24" fill="#831843" opacity="0.54"/>
                  <circle cx="{accent_x - 140}" cy="206" r="36" fill="#ffffff" opacity="0.16"/>
                """,
                "fitness": f"""
                  <rect x="104" y="352" width="592" height="58" rx="29" fill="#052e16" opacity="0.7"/>
                  <rect x="190" y="244" width="420" height="34" rx="17" fill="{accent}"/>
                  <circle cx="170" cy="260" r="62" fill="#dcfce7"/>
                  <circle cx="630" cy="260" r="62" fill="#dcfce7"/>
                  <path d="M274 382 C326 256 394 228 474 160" fill="none" stroke="#f0fdf4" stroke-width="28" stroke-linecap="round" opacity="0.48"/>
                  <circle cx="{accent_x - 80}" cy="144" r="42" fill="#bbf7d0" opacity="0.7"/>
                """,
                "travel": f"""
                  <circle cx="{accent_x}" cy="{accent_y}" r="70" fill="{accent}" opacity="0.88"/>
                  <path d="M0 430 C120 358 248 382 388 342 C520 304 664 314 800 250 L800 600 L0 600 Z" fill="#0369a1" opacity="0.76"/>
                  <path d="M90 468 C205 430 292 455 410 428 C546 397 654 386 760 330" fill="none" stroke="#bae6fd" stroke-width="18" opacity="0.62"/>
                  <path d="M164 194 L628 292 L474 334 L382 434 L344 308 Z" fill="#f8fafc" opacity="0.86"/>
                  <path d="M164 194 L382 434 L404 318 Z" fill="#c7d2fe" opacity="0.52"/>
                """,
                "abstract": f"""
                  <circle cx="240" cy="210" r="128" fill="{accent}" opacity="0.62"/>
                  <circle cx="520" cy="346" r="168" fill="#ffffff" opacity="0.2"/>
                  <rect x="304" y="154" width="278" height="278" rx="52" fill="#ffffff" opacity="0.14" transform="rotate(18 443 293)"/>
                  <path d="M74 430 C176 250 276 540 400 360 S596 218 736 382" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" opacity="0.38"/>
                  <path d="M128 142 H672" stroke="#ffffff" stroke-width="8" opacity="0.18"/>
                  <path d="M128 492 H672" stroke="#ffffff" stroke-width="8" opacity="0.18"/>
                """,
                "architecture": f"""
                  <rect x="128" y="178" width="126" height="304" fill="#e5e7eb" opacity="0.86"/>
                  <rect x="286" y="112" width="148" height="370" fill="#f8fafc" opacity="0.72"/>
                  <rect x="470" y="228" width="202" height="254" fill="#cbd5e1" opacity="0.84"/>
                  <path d="M98 494 H704" stroke="#f8fafc" stroke-width="22" stroke-linecap="round"/>
                  <path d="M320 154 H402 M320 214 H402 M320 274 H402 M320 334 H402" stroke="#334155" stroke-width="12" opacity="0.42"/>
                  <path d="M152 224 H230 M152 284 H230 M152 344 H230" stroke="#334155" stroke-width="10" opacity="0.34"/>
                """,
                "animals": f"""
                  <circle cx="394" cy="304" r="136" fill="{accent}" opacity="0.88"/>
                  <circle cx="318" cy="226" r="54" fill="#fef3c7"/>
                  <circle cx="470" cy="226" r="54" fill="#fef3c7"/>
                  <circle cx="346" cy="292" r="20" fill="#1f2937"/>
                  <circle cx="442" cy="292" r="20" fill="#1f2937"/>
                  <path d="M365 354 Q394 386 423 354" fill="none" stroke="#1f2937" stroke-width="14" stroke-linecap="round"/>
                  <path d="M96 456 C238 388 424 506 710 388" fill="none" stroke="#ffffff" stroke-width="24" opacity="0.25"/>
                """,
                "people": f"""
                  <circle cx="260" cy="226" r="58" fill="#fde68a"/>
                  <circle cx="400" cy="188" r="66" fill="#c7d2fe"/>
                  <circle cx="540" cy="226" r="58" fill="#fecdd3"/>
                  <path d="M166 444 C180 354 222 310 260 310 C304 310 340 362 350 444 Z" fill="#fbbf24" opacity="0.88"/>
                  <path d="M298 456 C318 338 356 288 400 288 C448 288 486 348 502 456 Z" fill="{accent}" opacity="0.88"/>
                  <path d="M452 444 C466 354 502 310 540 310 C584 310 620 362 634 444 Z" fill="#fb7185" opacity="0.88"/>
                """,
                "minimal": f"""
                  <rect x="116" y="118" width="568" height="364" rx="44" fill="#ffffff" opacity="0.7"/>
                  <circle cx="{accent_x - 220}" cy="300" r="92" fill="{accent}" opacity="0.88"/>
                  <rect x="394" y="242" width="184" height="116" rx="32" fill="#d4d4d8"/>
                  <path d="M148 452 H654" stroke="#a1a1aa" stroke-width="12" stroke-linecap="round" opacity="0.42"/>
                  <circle cx="602" cy="178" r="34" fill="#18181b" opacity="0.12"/>
                """,
            }
            svg = f"""
            <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
              <desc>TECKSTUDIO application-owned generated {category_slug} asset variant {variant}</desc>
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                  <stop stop-color="{color_a}"/>
                  <stop offset="1" stop-color="{color_b}"/>
                </linearGradient>
                <radialGradient id="glow" cx="50%" cy="35%" r="60%">
                  <stop stop-color="#ffffff" stop-opacity="0.24"/>
                  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <rect width="800" height="600" rx="36" fill="url(#bg)"/>
              <rect width="800" height="600" rx="36" fill="url(#glow)"/>
              <circle cx="96" cy="104" r="118" fill="#ffffff" opacity="0.1"/>
              <circle cx="716" cy="514" r="142" fill="#000000" opacity="0.1"/>
              {pattern}
              {foreground.get(category_slug, foreground["abstract"])}
            </svg>
            """.strip()
            return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")

        image_asset_specs = [
            ("nature", [
                ("public_asset_image_mountains", "Mountain Lake Sunrise", "nature,landscape,mountains,lake,sunrise", "#164e63", "#86efac", "#fde68a"),
                ("public_asset_image_nature_forest", "Forest Trail Canopy", "nature,forest,trees,trail,green", "#064e3b", "#22c55e", "#bbf7d0"),
                ("public_asset_image_nature_river", "River Valley Landscape", "nature,river,valley,water,landscape", "#075985", "#34d399", "#bae6fd"),
                ("public_asset_image_nature_flowers", "Wildflower Meadow", "nature,flowers,meadow,botanical,landscape", "#166534", "#f0abfc", "#fde68a"),
                ("public_asset_image_nature_sunset", "Warm Desert Sunset", "nature,sunset,desert,sky,landscape", "#7c2d12", "#fb923c", "#fef3c7"),
            ]),
            ("business", [
                ("public_asset_image_workspace", "Creative Office Workspace", "business,office,workspace,laptop,professional", "#111827", "#4f46e5", "#a5b4fc"),
                ("public_asset_image_business_meeting", "Team Strategy Meeting", "business,meeting,teamwork,professionals,presentation", "#1e293b", "#0ea5e9", "#bae6fd"),
                ("public_asset_image_business_charts", "Analytics Dashboard Desk", "business,charts,analytics,laptop,growth", "#0f172a", "#10b981", "#bbf7d0"),
                ("public_asset_image_business_presentation", "Presentation Room", "business,presentation,conference,office,team", "#312e81", "#6366f1", "#ddd6fe"),
                ("public_asset_image_business_laptop", "Professional Laptop Setup", "business,laptop,desk,remote,workspace", "#171717", "#64748b", "#e5e7eb"),
            ]),
            ("food-drink", [
                ("public_asset_image_food", "Cafe Table Spread", "food-drink,food,restaurant,cafe,meal", "#7c2d12", "#f97316", "#fed7aa"),
                ("public_asset_image_food_coffee", "Coffee and Pastry", "food-drink,coffee,beverage,cafe,dessert", "#451a03", "#d97706", "#fef3c7"),
                ("public_asset_image_food_fruit", "Fresh Fruit Ingredients", "food-drink,fruit,ingredients,fresh,healthy", "#166534", "#f97316", "#fde68a"),
                ("public_asset_image_food_dessert", "Dessert Plate", "food-drink,dessert,bakery,sweet,restaurant", "#831843", "#fb7185", "#fbcfe8"),
                ("public_asset_image_food_beverage", "Refreshing Beverage", "food-drink,drink,beverage,glass,citrus", "#0f766e", "#2dd4bf", "#ccfbf1"),
            ]),
            ("technology", [
                ("public_asset_image_technology", "Digital Circuit Glow", "technology,digital,code,software,interface", "#0f172a", "#2563eb", "#67e8f9"),
                ("public_asset_image_technology_ai", "AI Neural Interface", "technology,ai,neural,futuristic,interface", "#111827", "#7c3aed", "#c4b5fd"),
                ("public_asset_image_technology_coding", "Coding Workstation", "technology,coding,laptop,developer,software", "#020617", "#0891b2", "#a5f3fc"),
                ("public_asset_image_technology_robotics", "Robotics Lab", "technology,robotics,automation,devices,engineering", "#172554", "#38bdf8", "#dbeafe"),
                ("public_asset_image_technology_servers", "Server Room Grid", "technology,servers,data,cloud,network", "#0f172a", "#14b8a6", "#99f6e4"),
            ]),
            ("fashion", [
                ("public_asset_image_fashion", "Fashion Lookbook", "fashion,style,lookbook,clothing,model", "#831843", "#db2777", "#f9a8d4"),
                ("public_asset_image_fashion_runway", "Runway Silhouette", "fashion,runway,model,clothing,style", "#3b0764", "#a855f7", "#e9d5ff"),
                ("public_asset_image_fashion_accessories", "Accessories Flatlay", "fashion,accessories,jewelry,style,beauty", "#701a75", "#f472b6", "#fce7f3"),
                ("public_asset_image_fashion_shoes", "Street Style Shoes", "fashion,shoes,street,style,clothing", "#581c87", "#8b5cf6", "#ddd6fe"),
                ("public_asset_image_fashion_fabric", "Textile Fabric Detail", "fashion,fabric,textile,pattern,clothing", "#881337", "#fb7185", "#ffe4e6"),
            ]),
            ("fitness", [
                ("public_asset_image_fitness", "Fitness Studio Energy", "fitness,gym,workout,health,training", "#14532d", "#22c55e", "#bbf7d0"),
                ("public_asset_image_fitness_running", "Running Track Motion", "fitness,running,sports,cardio,exercise", "#7c2d12", "#f97316", "#fed7aa"),
                ("public_asset_image_fitness_yoga", "Calm Yoga Practice", "fitness,yoga,wellness,health,stretch", "#134e4a", "#14b8a6", "#ccfbf1"),
                ("public_asset_image_fitness_equipment", "Gym Equipment Set", "fitness,equipment,gym,weights,training", "#1f2937", "#84cc16", "#ecfccb"),
                ("public_asset_image_fitness_sports", "Sports Training Field", "fitness,sports,field,team,exercise", "#064e3b", "#16a34a", "#dcfce7"),
            ]),
            ("travel", [
                ("public_asset_image_travel", "Coastal Travel Postcard", "travel,beach,destination,ocean,journey", "#075985", "#0ea5e9", "#fde68a"),
                ("public_asset_image_travel_airplane", "Airplane Window View", "travel,airplane,flight,sky,destination", "#1d4ed8", "#93c5fd", "#eff6ff"),
                ("public_asset_image_travel_landmark", "City Landmark Trip", "travel,landmark,city,tourism,photography", "#713f12", "#f59e0b", "#fef3c7"),
                ("public_asset_image_travel_hotel", "Boutique Hotel Escape", "travel,hotel,resort,vacation,destination", "#164e63", "#06b6d4", "#cffafe"),
                ("public_asset_image_travel_roadtrip", "Open Road Journey", "travel,roadtrip,mountains,adventure,landscape", "#431407", "#fb923c", "#ffedd5"),
            ]),
            ("abstract", [
                ("public_asset_image_abstract", "Abstract Gradient Shapes", "abstract,gradient,geometric,shapes,art", "#4c1d95", "#a855f7", "#f0abfc"),
                ("public_asset_image_abstract_texture", "Soft Texture Field", "abstract,texture,color,field,background", "#0f766e", "#5eead4", "#ccfbf1"),
                ("public_asset_image_abstract_pattern", "Geometric Pattern Grid", "abstract,pattern,geometric,grid,texture", "#1e1b4b", "#6366f1", "#c7d2fe"),
                ("public_asset_image_abstract_color", "Vivid Color Flow", "abstract,color,gradient,flow,conceptual", "#881337", "#f43f5e", "#fecdd3"),
                ("public_asset_image_abstract_neon", "Neon Concept Art", "abstract,neon,conceptual,art,shapes", "#020617", "#06b6d4", "#a5f3fc"),
            ]),
            ("architecture", [
                ("public_asset_image_architecture", "Modern Architecture Lines", "architecture,building,modern,city,lines", "#1f2937", "#64748b", "#e5e7eb"),
                ("public_asset_image_architecture_interior", "Minimal Interior Space", "architecture,interior,house,design,room", "#44403c", "#d6d3d1", "#fafaf9"),
                ("public_asset_image_architecture_bridge", "Bridge Structure", "architecture,bridge,city,structure,engineering", "#0f172a", "#475569", "#cbd5e1"),
                ("public_asset_image_architecture_city", "Cityscape Towers", "architecture,cityscape,building,urban,skyline", "#172554", "#60a5fa", "#dbeafe"),
                ("public_asset_image_architecture_house", "Modern House Exterior", "architecture,house,modern,exterior,home", "#14532d", "#65a30d", "#ecfccb"),
            ]),
            ("animals", [
                ("public_asset_image_animals", "Safari Wildlife Closeup", "animals,wildlife,safari,mammal,portrait", "#3f2a12", "#a16207", "#fef3c7"),
                ("public_asset_image_animals_pets", "Pet Portrait Pair", "animals,pets,dog,cat,portrait", "#422006", "#d97706", "#fed7aa"),
                ("public_asset_image_animals_birds", "Birds in Flight", "animals,birds,wildlife,sky,nature", "#164e63", "#38bdf8", "#cffafe"),
                ("public_asset_image_animals_marine", "Marine Life Scene", "animals,marine,ocean,fish,wildlife", "#075985", "#0ea5e9", "#bae6fd"),
                ("public_asset_image_animals_farm", "Farm Animal Field", "animals,farm,field,countryside,pets", "#365314", "#84cc16", "#ecfccb"),
            ]),
            ("people", [
                ("public_asset_image_people", "Community Portraits", "people,portrait,community,diverse,lifestyle", "#312e81", "#6366f1", "#c7d2fe"),
                ("public_asset_image_people_family", "Family Lifestyle Moment", "people,family,lifestyle,candid,home", "#7c2d12", "#fb923c", "#fed7aa"),
                ("public_asset_image_people_team", "Team Collaboration", "people,team,professionals,business,meeting", "#1e293b", "#0ea5e9", "#bae6fd"),
                ("public_asset_image_people_portrait", "Studio Portrait Set", "people,portrait,studio,diverse,faces", "#831843", "#ec4899", "#fbcfe8"),
                ("public_asset_image_people_candid", "Candid Street Moment", "people,candid,lifestyle,street,community", "#3f3f46", "#a1a1aa", "#f4f4f5"),
            ]),
            ("minimal", [
                ("public_asset_image_minimal", "Minimal Product Scene", "minimal,clean,product,neutral,whitespace", "#e5e7eb", "#f8fafc", "#8b5cf6"),
                ("public_asset_image_minimal_background", "Clean Neutral Background", "minimal,background,clean,neutral,whitespace", "#f5f5f4", "#e7e5e4", "#a8a29e"),
                ("public_asset_image_minimal_object", "Simple Object Composition", "minimal,simple,object,isolated,design", "#f8fafc", "#cbd5e1", "#64748b"),
                ("public_asset_image_minimal_whitespace", "Whitespace Layout", "minimal,whitespace,clean,simple,layout", "#fafafa", "#e4e4e7", "#18181b"),
                ("public_asset_image_minimal_product", "Isolated Product Plinth", "minimal,product,isolated,neutral,studio", "#f4f4f5", "#d4d4d8", "#71717a"),
            ]),
        ]

        legacy_deactivation_sql = (
            "UPDATE assets SET is_active = 0, updated_at = NOW() "
            "WHERE user_id IS NULL AND category = 'images' "
            "AND (id LIKE 'public_asset_image_%' OR id LIKE 'cur_img_%')"
        )
        legacy_deactivation_params = {}
        if normalized_category_slug:
            legacy_deactivation_sql += " AND tags LIKE :category_tag"
            legacy_deactivation_params["category_tag"] = f"%category:{normalized_category_slug}%"
        conn.execute(text(legacy_deactivation_sql), legacy_deactivation_params)

        image_assets = build_curated_image_assets(
            category_slug=normalized_category_slug,
            limit_per_category=per_category_limit,
        )

        support_assets = [
            (
                "public_asset_element_starburst",
                "Star Burst",
                "elements",
                "shape,star,burst",
                "<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"><polygon points=\"50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35\" fill=\"currentColor\"/></svg>",
                "svg",
            ),
            (
                "public_asset_element_arrow",
                "Bold Arrow",
                "elements",
                "arrow,direction,icon",
                "<svg viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10,50 H76 M56,28 L84,50 L56,72\" stroke=\"currentColor\" stroke-width=\"10\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>",
                "svg",
            ),
            (
                "public_asset_gradient_sunset",
                "Sunset Gradient",
                "gradients",
                "sunset,warm,orange",
                "{\"colors\":[\"#ff6b35\",\"#f7931e\",\"#ffd700\"],\"css\":\"linear-gradient(135deg,#ff6b35 0%,#f7931e 50%,#ffd700 100%)\"}",
                "gradient",
            ),
            (
                "public_asset_gradient_ocean",
                "Ocean Gradient",
                "gradients",
                "ocean,blue,calm",
                "{\"colors\":[\"#0077b6\",\"#00b4d8\",\"#90e0ef\"],\"css\":\"linear-gradient(135deg,#0077b6 0%,#00b4d8 50%,#90e0ef 100%)\"}",
                "gradient",
            ),
        ]
        assets = image_assets if normalized_category_slug else image_assets + support_assets

        for asset in assets:
            if len(asset) == 6:
                asset_id, name, category, tags, file_data, file_type = asset
                source = "application-seed"
                source_url = None
                asset_license = "Application-owned generated asset"
                license_url = None
                attribution = "TECKSTUDIO generated asset library"
                provider = "local-seed"
                width = 100 if category == "elements" else None
                height = 100 if category == "elements" else None
                local_storage_path = None
            else:
                thumbnail_override = None
                if len(asset) == 16:
                    (
                        asset_id, name, category, tags, file_data, file_type,
                        source, source_url, asset_license, license_url,
                        attribution, provider, width, height, local_storage_path, thumbnail_override,
                    ) = asset
                else:
                    (
                        asset_id, name, category, tags, file_data, file_type,
                        source, source_url, asset_license, license_url,
                        attribution, provider, width, height, local_storage_path,
                    ) = asset

            title = name
            description = f"{name} asset for {category} designs."
            image_url = file_data
            thumbnail_url = thumbnail_override or file_data
            mime_type = file_type
            orientation = (
                "landscape" if width and height and width > height
                else "portrait" if width and height and height > width
                else "square" if width and height
                else None
            )
            source_asset_id = asset_id
            source_url = source_url or f"local://teckstudio/assets/{asset_id}"
            source_page_url = source_url
            author_name = "TECKSTUDIO"
            author_url = "local://teckstudio"
            license_name = asset_license
            attribution_required = False
            attribution_text = attribution
            commercial_use_allowed = True
            modification_allowed = True
            is_active = True

            conn.execute(
                text(
                    "INSERT INTO assets ("
                    "id, user_id, name, title, description, category, tags, file_data, file_type, "
                    "image_url, thumbnail_url, local_storage_path, mime_type, orientation, "
                    "source, source_asset_id, source_url, source_page_url, author_name, author_url, "
                    "license, license_name, license_url, attribution_required, attribution, attribution_text, "
                    "commercial_use_allowed, modification_allowed, provider, width, height, "
                    "is_active, is_premium, use_count, created_at, updated_at"
                    ") VALUES ("
                    ":id, NULL, :name, :title, :description, :category, :tags, :file_data, :file_type, "
                    ":image_url, :thumbnail_url, :local_storage_path, :mime_type, :orientation, "
                    ":source, :source_asset_id, :source_url, :source_page_url, :author_name, :author_url, "
                    ":license, :license_name, :license_url, :attribution_required, :attribution, :attribution_text, "
                    ":commercial_use_allowed, :modification_allowed, :provider, :width, :height, "
                    ":is_active, 0, 0, NOW(), NOW()) "
                    "ON DUPLICATE KEY UPDATE "
                    "name = VALUES(name), "
                    "title = VALUES(title), "
                    "description = VALUES(description), "
                    "category = VALUES(category), "
                    "tags = VALUES(tags), "
                    "file_data = VALUES(file_data), "
                    "file_type = VALUES(file_type), "
                    "image_url = VALUES(image_url), "
                    "thumbnail_url = VALUES(thumbnail_url), "
                    "local_storage_path = VALUES(local_storage_path), "
                    "mime_type = VALUES(mime_type), "
                    "orientation = VALUES(orientation), "
                    "source = VALUES(source), "
                    "source_asset_id = VALUES(source_asset_id), "
                    "source_url = VALUES(source_url), "
                    "source_page_url = VALUES(source_page_url), "
                    "author_name = VALUES(author_name), "
                    "author_url = VALUES(author_url), "
                    "license = VALUES(license), "
                    "license_name = VALUES(license_name), "
                    "license_url = VALUES(license_url), "
                    "attribution_required = VALUES(attribution_required), "
                    "attribution = VALUES(attribution), "
                    "attribution_text = VALUES(attribution_text), "
                    "commercial_use_allowed = VALUES(commercial_use_allowed), "
                    "modification_allowed = VALUES(modification_allowed), "
                    "provider = VALUES(provider), "
                    "width = VALUES(width), "
                    "height = VALUES(height), "
                    "is_active = VALUES(is_active), "
                    "is_premium = VALUES(is_premium), "
                    "updated_at = NOW()"
                ),
                {
                    "id": asset_id,
                    "name": name,
                    "title": title,
                    "description": description,
                    "category": category,
                    "tags": tags,
                    "file_data": file_data,
                    "file_type": file_type,
                    "image_url": image_url,
                    "thumbnail_url": thumbnail_url,
                    "local_storage_path": local_storage_path,
                    "mime_type": mime_type,
                    "orientation": orientation,
                    "source": source,
                    "source_asset_id": source_asset_id,
                    "source_url": source_url,
                    "source_page_url": source_page_url,
                    "author_name": author_name,
                    "author_url": author_url,
                    "license": asset_license,
                    "license_name": license_name,
                    "license_url": license_url,
                    "attribution_required": attribution_required,
                    "attribution": attribution,
                    "attribution_text": attribution_text,
                    "commercial_use_allowed": commercial_use_allowed,
                    "modification_allowed": modification_allowed,
                    "provider": provider,
                    "width": width,
                    "height": height,
                    "is_active": is_active,
                },
            )
        conn.execute(text("""
            UPDATE assets
            SET
                title = COALESCE(title, name),
                description = COALESCE(description, CONCAT(name, ' asset.')),
                image_url = COALESCE(image_url, file_data),
                thumbnail_url = COALESCE(thumbnail_url, image_url, file_data),
                local_storage_path = COALESCE(local_storage_path, CASE WHEN user_id IS NULL THEN CONCAT('local://teckstudio/assets/', id) ELSE NULL END),
                mime_type = COALESCE(mime_type, file_type),
                orientation = COALESCE(
                    orientation,
                    CASE
                        WHEN width IS NOT NULL AND height IS NOT NULL AND width > height THEN 'landscape'
                        WHEN width IS NOT NULL AND height IS NOT NULL AND height > width THEN 'portrait'
                        WHEN width IS NOT NULL AND height IS NOT NULL THEN 'square'
                        ELSE NULL
                    END
                ),
                source = COALESCE(source, CASE WHEN user_id IS NULL THEN 'application-seed' ELSE 'user-upload' END),
                source_asset_id = COALESCE(source_asset_id, id),
                source_url = COALESCE(source_url, CASE WHEN user_id IS NULL THEN CONCAT('local://teckstudio/assets/', id) ELSE NULL END),
                source_page_url = COALESCE(source_page_url, source_url, CASE WHEN user_id IS NULL THEN CONCAT('local://teckstudio/assets/', id) ELSE NULL END),
                author_name = COALESCE(author_name, CASE WHEN user_id IS NULL THEN 'TECKSTUDIO' ELSE NULL END),
                author_url = COALESCE(author_url, CASE WHEN user_id IS NULL THEN 'local://teckstudio' ELSE NULL END),
                license = COALESCE(license, CASE WHEN user_id IS NULL THEN 'Application-owned generated asset' ELSE 'User provided' END),
                license_name = COALESCE(license_name, license),
                attribution_required = COALESCE(attribution_required, 0),
                attribution = COALESCE(attribution, CASE WHEN user_id IS NULL THEN 'TECKSTUDIO generated asset library' ELSE NULL END),
                attribution_text = COALESCE(attribution_text, attribution),
                commercial_use_allowed = COALESCE(commercial_use_allowed, 1),
                modification_allowed = COALESCE(modification_allowed, 1),
                provider = COALESCE(provider, CASE WHEN user_id IS NULL THEN 'local-seed' ELSE 'user-library' END),
                is_active = COALESCE(is_active, 1),
                updated_at = COALESCE(updated_at, NOW())
            WHERE
                title IS NULL OR description IS NULL OR image_url IS NULL OR thumbnail_url IS NULL
                OR local_storage_path IS NULL OR mime_type IS NULL OR source IS NULL OR source_asset_id IS NULL OR source_url IS NULL
                OR source_page_url IS NULL OR author_name IS NULL OR author_url IS NULL OR license IS NULL
                OR license_name IS NULL OR attribution_required IS NULL OR commercial_use_allowed IS NULL
                OR modification_allowed IS NULL OR provider IS NULL OR is_active IS NULL OR updated_at IS NULL
        """))
        conn.commit()
        print(f"Seeded or refreshed {len(assets)} default royalty-free assets.")
    except Exception as e:
        print(f"Asset seed skipped: {e}")
    finally:
        conn.close()


# ─── Dependency ───────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
