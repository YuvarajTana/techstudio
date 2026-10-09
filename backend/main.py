import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from database import SessionLocal, init_db
from migrate import run_migrations
from routes import auth, projects, templates, categories, brand_kits, shared, favorites, assets, ai, ai_poster, stickers, fonts, images, poster_analysis, uploads, qrcode, charts, notifications, content_calendar, audit_logs, feature_flags, elements, video_render, provider_assets
from config import resolve_runtime_path, settings, validate_security_settings
from routes import lesson_video
from routes import creative_jobs, creative_catalog, creative_media

app = FastAPI(
    title="TECKSTUDIO API",
    description="AI-Powered Poster Generator Backend",
    version="1.0.0"
)

# CORS - Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def internal_routes_loopback_only(request: Request, call_next):
    # Workers run beside the API and call it over loopback. When the API is
    # published (container, cloud), outside callers never reach worker routes,
    # even with a leaked worker secret.
    if settings.INTERNAL_API_LOOPBACK_ONLY and request.url.path.startswith("/api/internal/"):
        host = request.client.host if request.client else ""
        if host not in {"127.0.0.1", "::1"}:
            return JSONResponse({"detail": "Not found"}, status_code=404)
    return await call_next(request)


MEDIA_DIR = resolve_runtime_path(settings.MEDIA_ROOT)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# Register all routes
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(templates.router)
app.include_router(categories.router)
app.include_router(brand_kits.router)
app.include_router(shared.router)
app.include_router(favorites.router)
app.include_router(assets.router)
app.include_router(ai.router)
app.include_router(ai_poster.router)
app.include_router(stickers.router)
app.include_router(fonts.router)
app.include_router(images.router)
app.include_router(poster_analysis.router)
app.include_router(uploads.router)
app.include_router(qrcode.router)
app.include_router(charts.router)
app.include_router(notifications.router)
app.include_router(content_calendar.router)
app.include_router(audit_logs.router)
app.include_router(feature_flags.router)
app.include_router(elements.router)
app.include_router(video_render.router)
app.include_router(provider_assets.router)
app.include_router(lesson_video.router)
app.include_router(lesson_video.internal)
app.include_router(creative_jobs.router)
app.include_router(creative_jobs.internal)
app.include_router(creative_catalog.router)
app.include_router(creative_media.router)



@app.on_event("startup")
def startup():
    """Initialize database on startup."""
    validate_security_settings()
    init_db()
    run_migrations()
    print(f"TECKSTUDIO API running on http://{settings.HOST}:{settings.PORT}")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "TECKSTUDIO API"}


@app.get("/api/health/local-generation")
def local_generation_health():
    from services.local_generation import worker_health
    return worker_health()


@app.get("/api/health/database")
def database_health_check():
    started = time.perf_counter()
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1")).scalar()
        latency_ms = round((time.perf_counter() - started) * 1000)
        return {
            "success": True,
            "database": "connected",
            "technology": "mysql",
            "latencyMs": latency_ms,
        }
    finally:
        db.close()


@app.get("/api/stats")
def get_stats():
    from database import (
        Asset,
        BrandKit,
        Category,
        ChatMessage,
        ChatSession,
        DeletedItem,
        DesignVersion,
        ExportMetadata,
        Favorite,
        GeneratedAsset,
        GenerationJob,
        Project,
        RecentHistory,
        SessionLocal,
        SharedDesign,
        Template,
        UploadedAsset,
        User,
    )
    db = SessionLocal()
    try:
        return {
            "users": db.query(User).count(),
            "projects": db.query(Project).count(),
            "templates": db.query(Template).count(),
            "categories": db.query(Category).count(),
            "brand_kits": db.query(BrandKit).count(),
            "shared_designs": db.query(SharedDesign).count(),
            "assets": db.query(Asset).count(),
            "generated_assets": db.query(GeneratedAsset).count(),
            "uploaded_assets": db.query(UploadedAsset).count(),
            "chat_sessions": db.query(ChatSession).count(),
            "chat_messages": db.query(ChatMessage).count(),
            "design_versions": db.query(DesignVersion).count(),
            "favorites": db.query(Favorite).count(),
            "deleted_items": db.query(DeletedItem).count(),
            "recent_history": db.query(RecentHistory).count(),
            "generation_jobs": db.query(GenerationJob).count(),
            "export_metadata": db.query(ExportMetadata).count(),
        }
    finally:
        db.close()


# Registered last so every API route above wins. Unknown /api paths stay 404.
if settings.FRONTEND_DIST:
    FRONTEND_DIR = resolve_runtime_path(settings.FRONTEND_DIST).resolve()
    if not (FRONTEND_DIR / "index.html").is_file():
        raise RuntimeError(f"FRONTEND_DIST={FRONTEND_DIR} has no index.html; build the frontend first.")
    API_PREFIXES = ("api/", "media/", "docs", "redoc", "openapi.json", "health")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path.startswith(API_PREFIXES):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (FRONTEND_DIR / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIR):
            # Hashed build assets never change; the HTML shell must always revalidate.
            cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
            return FileResponse(candidate, headers={"Cache-Control": cache})
        return FileResponse(FRONTEND_DIR / "index.html", headers={"Cache-Control": "no-cache"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
