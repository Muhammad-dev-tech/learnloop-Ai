from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import check_database_connection, init_db, get_db
from app.routers.auth import router as auth_router
import os
from pathlib import Path

# Ensure upload directory exists
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on application startup
    await init_db()
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

# Narrow CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/api/docs"
    }

@app.get("/api/health", tags=["System"])
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
