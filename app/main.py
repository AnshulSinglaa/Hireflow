from dotenv import load_dotenv
load_dotenv()  # This MUST be the first thing that runs

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.database import engine
from app import models

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.limiter import limiter
from app.routers import auth, jobs, applications, tasks

models.Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HireFlow API", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def read_root():
    return {"message": "HireFlow API is live"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/observability")
def get_observability():
    return {
        "message": "Check uvicorn terminal for LLM_CALL logs",
        "tip": "Each log shows latency, tokens, and cost per call"
    }