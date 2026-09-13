from pathlib import Path
import hashlib
import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from sqlalchemy.engine import URL

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"
APP_ENV_VALUE = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development"))
ENV_OVERRIDE_ENABLED = APP_ENV_VALUE.lower() not in {"prod", "production"}
ENV_LOADED = ENV_PATH.exists()
if ENV_LOADED:
    load_dotenv(ENV_PATH, override=ENV_OVERRIDE_ENABLED)

class Settings(BaseSettings):
    APP_ENV: str = APP_ENV_VALUE

    # MySQL Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "teckstudio"

    # JWT
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_DAYS: int = 7

    # Google Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_IMAGE_MODEL: str = "gemini-2.5-flash-image"

    # OpenAI API
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_IMAGE_MODEL: str = "gpt-image-1"
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"

    # Optional image provider fallback
    STABILITY_API_KEY: str = ""
    AI_PROVIDER_PRIORITY: str = ""
    IMAGE_PROVIDER_ORDER: str = "openai,gemini,pollinations"
    AI_CHAT_PROVIDER_PRIORITY: str = "gemini,openai,pollinations"
    AI_IMAGE_TIMEOUT_SECONDS: int = 60
    AI_IMAGE_MAX_RETRIES: int = 2
    ENABLE_POLLINATIONS_FALLBACK: bool = True
    ENABLE_FAKE_AI_FALLBACK: bool = False

    # Runtime media storage
    MEDIA_ROOT: str = str(BACKEND_DIR / "media")
    TEMP_RENDER_ROOT: str = "/tmp/teckstudio/video-renders"

    # User image uploads
    MAX_UPLOAD_IMAGE_MB: int = 15
    MAX_UPLOAD_IMAGE_PIXELS: int = 24_000_000
    UPLOAD_THUMBNAIL_SIZE: int = 420
    OCR_PROVIDER: str = "apple-vision"
    OCR_FALLBACK_PROVIDER: str = "gemini,openai"
    OCR_MODEL: str = "gemini-2.0-flash"
    OCR_CONFIDENCE_THRESHOLD: float = 0.55
    POSTER_ANALYSIS_MAX_REGIONS: int = 10
    POSTER_TEXT_MASK_PADDING: int = 8
    POSTER_REGION_MIN_PERCENTAGE: float = 2.0

    # Third-party asset providers. Keys stay on the FastAPI server.
    ICONIFY_API_KEY: str = ""
    UNSPLASH_ACCESS_KEY: str = ""
    LOTTIEFILES_API_KEY: str = ""
    LOTTIEFILES_API_URL: str = "https://api.lottiefiles.com/v2/animations"

    # Background video rendering
    FFMPEG_BINARY: str = "ffmpeg"
    VIDEO_RENDER_RETENTION_HOURS: int = 24
    VIDEO_RENDER_TIMEOUT_SECONDS: int = 900
    MAX_VIDEO_RENDER_SCENES: int = 100
    LESSON_VIDEO_ROOT: str = str(BACKEND_DIR.parent / ".local/video-artifacts")
    LESSON_VIDEO_LEASE_SECONDS: int = 60
    LESSON_VIDEO_MAX_ATTEMPTS: int = 2
    LESSON_VIDEO_WORKER_SECRET: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 5001

    class Config:
        env_file = str(ENV_PATH)


def key_fingerprint(value: str) -> str | None:
    """Return a non-secret one-way key fingerprint for diagnostics."""
    cleaned = (value or "").strip()
    if not cleaned:
        return None
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:12]

settings = Settings()


def resolve_runtime_path(value: str | Path) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return BACKEND_DIR / path


INSECURE_JWT_SECRETS = {
    "",
    "super_secret_key_for_teckstudio_2026",
    "change-me",
    "changeme",
    "secret",
    "supersecret",
}


def validate_security_settings() -> None:
    """Fail fast when authentication is configured insecurely."""
    jwt_secret = settings.JWT_SECRET.strip()
    if jwt_secret in INSECURE_JWT_SECRETS:
        raise RuntimeError("JWT_SECRET must be set to a strong secret in the environment.")

    if settings.APP_ENV.lower() in {"prod", "production"} and len(jwt_secret) < 32:
        raise RuntimeError("Production JWT_SECRET must be at least 32 characters long.")

# Build MySQL URL
DATABASE_URL = URL.create(
    "mysql+pymysql",
    username=settings.DB_USER,
    password=settings.DB_PASSWORD,
    host=settings.DB_HOST,
    port=settings.DB_PORT,
    database=settings.DB_NAME,
)
