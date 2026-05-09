from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
import uuid, os

router = APIRouter(tags=["Applications"])

UPLOAD_DIR = "uploads/resumes"

@router.post("/jobs/{job_id}/apply", response_model=schemas.ApplicationResponse, status_code=201)
async def apply_to_job(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.candidate_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already applied")

    # Validate file
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = f"{UPLOAD_DIR}/{unique_filename}"
    with open(file_path, "wb") as f:
        f.write(contents)

    # Save to DB
    application = models.Application(
        job_id=job_id,
        candidate_id=current_user.id,
        resume_path=file_path
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application
