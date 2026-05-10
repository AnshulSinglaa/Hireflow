from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
import uuid, os
from app.ai.parser import parse_resume
import json

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

    # Parse resume with AI
    print(f"Parsing resume from: {file_path}")
    try:
        parsed = parse_resume(file_path)
        print(f"Parsed result: {parsed}")
    except Exception as e:
        print(f"PARSER ERROR: {e}")
        parsed = {"error": str(e)}
    application.parsed_resume = json.dumps(parsed)
    db.commit()

    return application

@router.get("/applications/{application_id}/parsed")
def get_parsed_resume(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if not application.parsed_resume:
        raise HTTPException(status_code=404, detail="Resume not parsed yet")
    return json.loads(application.parsed_resume)
