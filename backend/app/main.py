from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import check_database_connection, init_db, get_db, AsyncSessionLocal
from app.core.seed import seed_curriculum_if_empty
from app.routers.auth import router as auth_router
from app.routers.academic import router as academic_router
from app.routers.sessions import router as sessions_router
from app.routers.documents import router as documents_router
from app.routers.assessment import router as assessment_router
from app.routers.progress import router as progress_router
import os
from pathlib import Path

# Ensure upload directory exists
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on application startup
    await init_db()
    # Seed curriculum subjects, topics, and objectives if empty
    async with AsyncSessionLocal() as session:
        await seed_curriculum_if_empty(session)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Adaptive Learning Assistant for Students — Backend API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Flexible CORS configuration supporting local development and Vercel cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:.*|http://127\.0\.0\.1:.*|http://192\.168\..*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(academic_router)
app.include_router(sessions_router)
app.include_router(documents_router)
app.include_router(assessment_router)
app.include_router(progress_router)


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/api/docs"
    }

@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["System"])
async def health_check():
    """System health check endpoint verifying database connectivity and configuration."""
    db_status = await check_database_connection()
    
    return {
        "status": "ok" if db_status["verified"] else "degraded",
        "environment": settings.ENVIRONMENT,
        "database": {
            "dialect": "sqlite" if settings.DATABASE_URL.startswith("sqlite") else "postgresql",
            "connected": db_status["verified"],
            "details": db_status["status"],
            "error": db_status["error"]
        },
        "ai_provider": {
            "configured": settings.is_gemini_configured,
            "model": settings.GEMINI_MODEL,
            "status": "ready" if settings.is_gemini_configured else "api_key_missing_in_env"
        },
        "storage": {
            "upload_dir_exists": upload_path.exists(),
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
        }
    }
