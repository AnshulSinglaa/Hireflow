from dotenv import load_dotenv
load_dotenv()  # This MUST be the first thing that runs

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from app.database import engine
from app import models
from app.routers import auth, jobs, applications

models.Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="HireFlow API", version="0.1.0")

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

@app.get("/")
def read_root():
    return {"message": "HireFlow API is live"}

@app.get("/health")
def health_check():
    return {"status": "ok"}