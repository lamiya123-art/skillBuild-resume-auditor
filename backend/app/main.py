import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, profile, repos, skills, jd, match, resume, applications, interview_prep

def run_db_migrations():
    """Ensures SQLite schema includes all newly added auth columns."""
    from sqlalchemy import text
    with engine.connect() as conn:
        columns_to_add = [
            ("password_hash", "VARCHAR"),
            ("full_name", "VARCHAR"),
            ("avatar_url", "VARCHAR"),
            ("auth_provider", "VARCHAR DEFAULT 'email'"),
            ("provider_user_id", "VARCHAR"),
            ("updated_at", "DATETIME"),
            ("last_login_at", "DATETIME"),
        ]
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

# Ensure database tables and columns exist
run_db_migrations()
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="SkillProof — Skill Depth Auditor & Resume Anti-Fabrication Engine API"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Ensure generated_resumes directory exists and mount static files
os.makedirs("generated_resumes", exist_ok=True)
app.mount("/generated_resumes", StaticFiles(directory="generated_resumes"), name="generated_resumes")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(repos.router, prefix=settings.API_V1_STR)
app.include_router(skills.router, prefix=settings.API_V1_STR)
app.include_router(jd.router, prefix=settings.API_V1_STR)
app.include_router(match.router, prefix=settings.API_V1_STR)
app.include_router(resume.router, prefix=settings.API_V1_STR)
app.include_router(applications.router, prefix=settings.API_V1_STR)
app.include_router(interview_prep.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "llm_provider": settings.LLM_PROVIDER
    }
