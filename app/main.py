from dotenv import load_dotenv
load_dotenv()

import os
import sys

# Fix 7: hard fail at startup if SECRET_KEY is missing — no fallback
if not os.getenv("SECRET_KEY"):
    print("FATAL: SECRET_KEY environment variable is not set. Refusing to start.")
    sys.exit(1)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from app import models

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.limiter import limiter, DISABLE_RATE_LIMIT
from app.routers import auth, jobs, applications, tasks, companies, reports, notifications, candidates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HireFlow API", version="0.1.0")

if not DISABLE_RATE_LIMIT:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
else:
    logging.getLogger(__name__).warning("[TEST MODE] Rate limiting is DISABLED (DISABLE_RATE_LIMIT=1)")

from datetime import datetime, timedelta

@app.on_event("startup")
async def cleanup_old_memory():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=30)
        db.query(models.AgentMemory).filter(
            models.AgentMemory.created_at < cutoff
        ).delete()
        db.commit()
        print("✅ Old agent memory cleaned up")
    except Exception as e:
        print(f"Memory cleanup failed: {e}")
    finally:
        db.close()

import uuid

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Fix 6: enumerate exact methods and headers — no wildcards with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    # Matches any Vercel preview/production URL for this project
    # (e.g. https://hireflow-xyz.vercel.app, https://hireflow-git-main-user.vercel.app)
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."}
    )

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(tasks.router)
app.include_router(companies.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(candidates.router)

@app.get("/")
def read_root():
    return {"message": "HireFlow API is live"}

@app.get("/health")
def health_check():
    from app.database import check_db_connection
    db_ok = check_db_connection()
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "groq": "configured" if groq_ok else "missing key",
        "version": "0.1.0"
    }

@app.get("/observability")
def get_observability():
    return {
        "message": "Check uvicorn terminal for LLM_CALL logs",
        "tip": "Each log shows latency, tokens, and cost per call"
    }
